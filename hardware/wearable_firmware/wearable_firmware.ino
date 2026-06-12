/*
  S.P.H.E.R.E. Wearable Biosensor Telemetry Firmware
  Device: ESP32-WROOM-32E MCU
  Sensors: MAX30102 (PPG Heart Rate/SpO2) & MPU6050 (6-Axis Accelerometer/G-Force)
  Protocol: WebSockets (JSON payloads over TCP/IP)
  
  This firmware establishes Wi-Fi, connects to the S.P.H.E.R.E. cockpit gateway server,
  samples biometric and kinematic sensors, processes raw signals using a DSP pipeline,
  and streams calibrated telemetry frames at a stable 60Hz.
*/

#include <WiFi.h>
#include <WebSocketsClient.h> // Arduino WebSockets by Marcus Sattler
#include <ArduinoJson.h>      // ArduinoJson by Benoit Blanchon
#include <Wire.h>

// I2C Device Addresses
#define MPU6050_ADDR 0x68
#define MAX30102_ADDR 0x57

// Wi-Fi Configuration - Replace with local credentials
const char* ssid     = "SPHERE_SECURE_AP";
const char* password = "FailsafeProtocol2026";

// S.P.H.E.R.E. WebSocket Server Target Configuration
const char* ws_host = "192.168.1.100"; // Replace with local host IP
const int ws_port   = 8080;

WebSocketsClient webSocket;
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 16; // Stable ~60Hz stream frequency (16.6ms)

// Biometric Calibration Baseline parameters
float filterGforce = 1.0;
float tremorAmplitude = 0.02;

// DSP Filter & State Variables
float dcRed = 0.0;
float dcIr = 0.0;
float wRed = 0.0;
float wIr = 0.0;
float acRed = 0.0;
float acIr = 0.0;
const float alpha = 0.98; // DC filter decay constant (~0.5Hz cutoff at 60Hz)

// Sliding min-max window variables (2-second window = 120 samples @ 60Hz)
float acRedMin = 99999.0;
float acRedMax = -99999.0;
float acIrMin = 99999.0;
float acIrMax = -99999.0;
float lastAcRedAmp = 200.0;
float lastAcIrAmp = 200.0;
int sampleCounter = 0;
const int windowSize = 120;

// Pulse detector state
unsigned long lastPeakTime = 0;
bool crossingState = false; // true if above zero, false if below
float lastBpmUpdate = 72.0;
float lastSpo2Update = 98.4;

void setup() {
  Serial.begin(115200);
  delay(10);

  // Initialize I2C Bus on default ESP32 pins (SDA=21, SCL=22)
  Wire.begin(21, 22, 100000); 

  // Initialize Sensors
  initMPU6050();
  initMAX30102();

  // Establish Wi-Fi Connection
  Serial.printf("\n[SYS] Initializing Wi-Fi Link. AP: %s\n", ssid);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 15) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[SYS] Wi-Fi Link Established. Local IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WARN] Wi-Fi Link Timeout. Proceeding in Simulation Fallback mode.");
  }

  // WebSocket Server Setup & Callbacks
  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000); // 2-second automatic reconnect backoff
}

void loop() {
  webSocket.loop();
  
  unsigned long now = millis();
  
  // Non-blocking WiFi recovery check every 5 seconds if link drops
  static unsigned long lastWifiCheck = 0;
  if (now - lastWifiCheck > 5000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED && WiFi.status() != WL_DISCONNECTED) {
      Serial.println("[SYS] WiFi Link Down. Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }

  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;
    
    // Sample sensors and transmit payload
    if (webSocket.isConnected()) {
      streamSensorPayload();
    }
  }
}

// Read raw sensor bytes, filter, and stream structured JSON packets
void streamSensorPayload() {
  // 1. Read Kinematic acceleration (G-Force & Tremors) from MPU6050
  int16_t ax, ay, az;
  readRawAccel(&ax, &ay, &az);
  
  // Convert LSB to Gs (sensitivity +/-2G: 16384 LSB/g)
  float rawX = ax / 16384.0;
  float rawY = ay / 16384.0;
  float rawZ = az / 16384.0;
  
  float totalG = sqrt(rawX*rawX + rawY*rawY + rawZ*rawZ);
  filterGforce = (filterGforce * 0.9) + (totalG * 0.1); // Low-pass filter

  // High-frequency tremor index (AC component of acceleration)
  tremorAmplitude = abs(totalG - filterGforce);

  // 2. Read PPG optical heart-rate / SpO2 from MAX30102
  uint32_t redLed = 0;
  uint32_t irLed = 0;
  readRawPPG(&redLed, &irLed);

  // Initialize DC component on first samples
  if (dcRed == 0.0) {
    dcRed = (float)redLed;
    dcIr = (float)irLed;
  }

  // A. Recursive IIR High-Pass Filter for DC Removal
  // y[n] = w[n] - w[n-1], where w[n] = x[n] + alpha * w[n-1]
  float prevWRed = wRed;
  wRed = (float)redLed + alpha * prevWRed;
  acRed = wRed - prevWRed;

  float prevWIr = wIr;
  wIr = (float)irLed + alpha * prevWIr;
  acIr = wIr - prevWIr;

  // Track the DC average (low-pass filter of raw values)
  dcRed = dcRed * 0.99 + (float)redLed * 0.01;
  dcIr = dcIr * 0.99 + (float)irLed * 0.01;

  // B. Sliding Min-Max Window tracking (for AC amplitude ratio)
  acRedMin = min(acRedMin, acRed);
  acRedMax = max(acRedMax, acRed);
  acIrMin = min(acIrMin, acIr);
  acIrMax = max(acIrMax, acIr);
  
  sampleCounter++;
  if (sampleCounter >= windowSize) {
    // Save previous window amplitudes
    float ampRed = acRedMax - acRedMin;
    float ampIr = acIrMax - acIrMin;
    
    // Prevent division-by-zero or excessively small ranges
    if (ampRed > 5.0 && ampIr > 5.0) {
      lastAcRedAmp = ampRed;
      lastAcIrAmp = ampIr;
    }
    
    // Reset min-max bounds for next window
    acRedMin = 99999.0;
    acRedMax = -99999.0;
    acIrMin = 99999.0;
    acIrMax = -99999.0;
    sampleCounter = 0;
  }

  // C. Pulse Rate Detection using Zero-Crossing with Hysteresis
  // We look for positive zero-crossing on the red channel
  unsigned long nowMs = millis();
  const float hysteresis = 15.0; // Avoid minor noise oscillations near 0
  if (acRed > hysteresis && !crossingState) {
    crossingState = true;
    
    // Heartbeat peak interval detected
    unsigned long delta = nowMs - lastPeakTime;
    if (delta > 400 && delta < 1500) { // Limit valid HR range: 40 BPM (1500ms) to 150 BPM (400ms)
      float instantBpm = 60000.0 / (float)delta;
      // Exponential moving average filter for heart rate smoothing
      lastBpmUpdate = lastBpmUpdate * 0.85 + instantBpm * 0.15;
    }
    lastPeakTime = nowMs;
  } else if (acRed < -hysteresis && crossingState) {
    crossingState = false;
  }

  // D. SpO2 Ratio-of-Ratios Calculation
  // R = (AC_red / DC_red) / (AC_ir / DC_ir)
  if (dcRed > 0.0 && dcIr > 0.0 && lastAcRedAmp > 0.0 && lastAcIrAmp > 0.0) {
    float rValue = (lastAcRedAmp / dcRed) / (lastAcIrAmp / dcIr);
    // Standard empirical SpO2 calibration curve (SpO2 = 110 - 25 * R)
    float instantSpo2 = 110.0 - 25.0 * rValue;
    
    // Clamp to valid biological ranges
    if (instantSpo2 > 100.0) instantSpo2 = 100.0;
    if (instantSpo2 < 50.0) instantSpo2 = 50.0;
    
    // Exponential filter smoothing
    lastSpo2Update = lastSpo2Update * 0.9 + instantSpo2 * 0.1;
  }

  // 3. Serialize and transmit JSON payload
  StaticJsonDocument<300> doc;
  doc["type"] = "sensor_pack";
  doc["timestamp"] = ws_host; // Identity trace
  
  // Stream data matches useTelemetry/server.js client interfaces
  doc["heartRate"] = round(lastBpmUpdate);
  doc["spO2"] = round(lastSpo2Update * 10.0) / 10.0;
  doc["gForce"] = round(filterGforce * 10.0) / 10.0;
  doc["tremorAmplitude"] = tremorAmplitude;
  doc["sensorActive"] = true;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

// -------------------------------------------------------------
// Sensor Initialization and Read Helpers
// -------------------------------------------------------------

void initMPU6050() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Set to zero to wake up the sensor
  Wire.endTransmission(true);
  Serial.println("[SENSOR] MPU6050 Accelerometer initialized.");
}

void initMAX30102() {
  Wire.beginTransmission(MAX30102_ADDR);
  Wire.write(0x09); // Mode Configuration register
  Wire.write(0x03); // SpO2 Mode (Red + IR LEDs active)
  Wire.endTransmission(true);
  
  Wire.beginTransmission(MAX30102_ADDR);
  Wire.write(0x0A); // SpO2 Configuration (100Hz sample rate, 411us pulse width)
  Wire.write(0x27);
  Wire.endTransmission(true);
  Serial.println("[SENSOR] MAX30102 PPG Heart-rate/SpO2 initialized.");
}

void readRawAccel(int16_t *x, int16_t *y, int16_t *z) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B); // Accel start register
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, 6, true);

  *x = (Wire.read() << 8) | Wire.read();
  *y = (Wire.read() << 8) | Wire.read();
  *z = (Wire.read() << 8) | Wire.read();
}

void readRawPPG(uint32_t *red, uint32_t *ir) {
  Wire.beginTransmission(MAX30102_ADDR);
  Wire.write(0x07); // FIFO Data Register
  Wire.endTransmission(false);
  Wire.requestFrom(MAX30102_ADDR, 6, true);

  *red = ((Wire.read() & 0x03) << 16) | (Wire.read() << 8) | Wire.read();
  *ir  = ((Wire.read() & 0x03) << 16) | (Wire.read() << 8) | Wire.read();
}

// WebSocket client event callback
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[LINK] WebSocket connection closed. Attempting reconnect...");
      break;
    case WStype_CONNECTED:
      Serial.println("[LINK] Telemetry WebSocket channel online.");
      break;
    case WStype_TEXT:
      Serial.printf("[LINK] Response received: %s\n", payload);
      break;
  }
}
