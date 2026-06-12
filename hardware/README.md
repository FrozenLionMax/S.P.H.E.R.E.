# 🔌 S.P.H.E.R.E. Wearable Biosensor Casing, PCB & Firmware Manual

This directory contains the complete design-to-manufacture blueprint for the **S.P.H.E.R.E. Wearable Telemetry Node**. This node processes physiological and kinematic telemetry at the edge and streams JSON data packets over WebSockets to the cockpit gateway server.

---

## 🧬 System Architecture & Data Flow

```
+-----------------------------------+
|     PPG & IMU Sensors (I2C)       |
|    - MAX30102 (Vitals/SpO2/HR)    |
|    - MPU6050 (G-Force/Tremors)    |
+-----------------┬-----------------+
                  │
                  ▼ (Raw ADC readings)
+-----------------------------------+
|    ESP32 Edge Signal Processing   |
|    - IIR High-Pass DC Filter      |
|    - Hysteresis Zero-Crossing HR  |
|    - SpO2 Ratio-of-Ratios (R)     |
+-----------------┬-----------------+
                  │
                  ▼ (WiFi Socket connection)
+-----------------------------------+
|      Node.js Telemetry server     |
|    - Ingestion & Mode Override    |
|    - Dashboard Broadcast          |
+-----------------------------------+
```

---

## 🛠️ Edge Digital Signal Processing (DSP)

To minimize network bandwidth and prevent server-side processing bottlenecks, the edge microcontroller executes the raw signal calculations:

1. **DC Attenuation (IIR Filter)**:
   PPG optical signals consist of a massive static DC offset (tissue light absorption) and a tiny pulsating AC component (arterial blood pulse). We isolate the AC component using a recursive high-pass filter:
   $$w[n] = x[n] + \alpha \cdot w[n-1]$$
   $$y[n] = w[n] - w[n-1]$$
   where $\alpha = 0.98$ acts as the decay feedback parameter, effectively filtering out slow breathing drifts and baseline movements below $0.5\text{Hz}$.

2. **Heart Rate Zero-Crossing Detector**:
   We search for positive zero-crossings in the filtered AC red channel. An adaptive hysteresis threshold of $\pm15.0$ filters out minor noise ripples. When a crossing is validated, the time difference $\Delta t$ between consecutive peaks is converted to Heart Rate (BPM):
   $$\text{BPM} = \frac{60000}{\Delta t \text{ (ms)}}$$
   A rolling exponential moving average smooths the value to eliminate premature beats or sudden artifact noise.

3. **SpO₂ Calibration**:
   The average DC voltage and peak-to-peak AC amplitude are tracked for both Red and Infrared LEDs. The ratio of ratios $R$ is computed as:
   $$R = \frac{AC_{\text{Red}} / DC_{\text{Red}}}{AC_{\text{IR}} / DC_{\text{IR}}}$$
   The peripheral blood oxygenation is then calculated using the empirical calibration curve:
   $$\text{SpO}_2 = 110.0 - 25.0 \times R$$
   The value is bounded between $50\%$ and $100\%$ to preserve signal sanity.

---

## 🔌 Circuit Pin-to-Pin Connections

```
    USB Type-C                  TP4056 Battery Charger           RT9013-33 LDO Regulator
   +----------+                +-----------------------+        +-----------------------+
   |   V_BUS  |------[ D1 ]--->| VCC               BAT |---+--->| VIN              VOUT |---+---> VCC_3V3
   |          |    (Schottky)  |                       |   |    |                       |   |
   |  D+/D-   |                | PROG              GND |   |    |          EN       GND |   |
   |          |                +-----------------------+   |    +-----------------------+   |
   |   GND    |---|                        |               |        |                |      |
   +----------+   |                    [ R_prog ]          |      [ R_en ]           |      |
                  |                     (1.2k)             |       (10k)             |      |
                  |                        |               |        |                |      |
                  +------------------------+---------------+--------+----------------+      |
                                           |               |                         |      |
                                          GND            LiPo                        |      |
                                                         (3.7V)                      |      |
                                                                                     |      |
                                             +---------------------------------------+      |
                                             |                                              |
                                            GND                                             |
                                                                                            |
   +----------------------------------------------------------------------------------------+
   |
   +-----+-----------------------+------------------------+
         |                       |                        |
         |                       |                        |
       [ C1 ]                  [ C2 ]                   [ C3 ]
      (10uF)                  (0.1uF)                  (0.1uF)
         |                       |                        |
        GND                     GND                      GND
         |                       |                        |
   +-----+-----------------------+------------------------+-------------------+
   |     |                       |                        |                   |
   |  +-----+                 +-----+                  +-----+             +-----+
   |  | VDD |                 | VDD |                  | VCC |             | VDD |
   |  |     |                 |     |                  |     |             |     |
   |  |     |                 |     |                  |     |             |     |
   |  +-----+                 +-----+                  +-----+             +-----+
   | MAX30102                 MPU6050                ESP32-WROOM         Pull-ups
   | PPG Sensor               IMU Sensor             Microcontroller     I2C SDA/SCL
   +--------------------------------------------------------------------------+
                                                                              |
                                     VCC_3V3                                  |
                                        |                                     |
                                   +----+----+                                |
                                   |         |                                |
                                [ R_sda ] [ R_scl ]                           |
                                 (4.7k)    (4.7k)                             |
                                   |         |                                |
                                   +----+----+                                |
                                        |                                     |
   MAX30102 SDA ------------------------+------------------ GPIO21 (SDA)      |
   MAX30102 SCL ------------------------+------------------ GPIO22 (SCL)      |
   MPU6050 SDA  ------------------------+                                     |
   MPU6050 SCL  ------------------------+                                     |
                                                                              |
   MAX30102 INT ------------------------------------------- GPIO19 (INT)      |
                                                                              |
   ESP32 EN (Reset) ------------+------------[ R_pu (10k) ]-- VCC_3V3          |
                                |                                             |
                              [ C_db (0.1uF) ]                                |
                                |                                             |
                               GND                                            |
                                                                              |
   ESP32 GPIO0 (Boot) ----------+----[ SW_BOOT (Tactile Switch) ]---> GND     |
                                |                                             |
                                VCC_3V3                                       |
```

---

## 📊 Bill of Materials (BOM)

| Designator | Qty | Value/Part | Package | Manufacturer Part # | Description |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **U1** | 1 | ESP32-WROOM-32E-N4 | SMD-38 | ESP32-WROOM-32E | Dual-core Wi-Fi/BT MCU (4MB Flash) |
| **U2** | 1 | MAX30102 | OLGA-14 | MAX30102EFD+T | Optical PPG Pulse-Oximeter & HR Sensor |
| **U3** | 1 | MPU6050 | QFN-24 | MPU-6050 | 6-Axis Gyroscope/Accelerometer IMU |
| **U4** | 1 | TP4056 | SOP-8 | TP4056-ES | Constant-Current Lithium Battery Charger |
| **U5** | 1 | RT9013-33GB | SOT-23-5 | RT9013-33GB | 500mA Low-Dropout (LDO) Linear Regulator |
| **C1** | 1 | 10uF | 0805 | GRM21BR71A106KE51L | Ceramic Decoupling Capacitor (LDO Input filter) |
| **C2** | 1 | 10uF | 0805 | GRM21BR71A106KE51L | Ceramic Decoupling Capacitor (LDO Output filter) |
| **C3, C4, C5**| 3 | 0.1uF | 0603 | GRM188R71H104KA93D | Ceramic Decoupling Capacitors (Sensor VDD pins) |
| **C6** | 1 | 0.1uF | 0603 | GRM188R71H104KA93D | Debounce Capacitor (ESP32 EN pin) |
| **R_sda, R_scl**| 2 | 4.7k Ohm | 0603 | RC0603FR-074K7L | I2C SDA/SCL pull-up resistors |
| **R_prog** | 1 | 1.2k Ohm | 0603 | RC0603FR-071K2L | TP4056 charge current program resistor (1A) |
| **R_en, R_pu**| 2 | 10k Ohm | 0603 | RC0603FR-0710KL | Pull-up resistors (RT9013 EN, ESP32 EN) |
| **D1** | 1 | MBRA140T3G | SMA (DO-214AC) | MBRA140T3G | Schottky Diode (V_BUS reverse flow guard) |
| **SW1, SW2** | 2 | Tactile Switch | SMD-4 | PTS645VL392LFS | Push Buttons (ESP32 EN/RESET & BOOT/GPIO0) |
| **J1** | 1 | USB Type-C | SMD-16 | USB4105-GF-A | USB Type-C Receptacle (Power input only) |
| **BAT1** | 1 | LiPo Battery | 2-pin JST-PH | LiPo-3.7V-1000mAh | 3.7V 1000mAh Lithium Polymer Battery Pack |

---

## 🖨️ PCB Routing & Star Grounding Guidelines

- **Star Grounding**: High-frequency transients from the ESP32 Wi-Fi antenna can induce significant switching noise onto the low-noise analog return paths of the MAX30102 PPG optical sensor. Ensure that all analog sensor grounds are routed on a separate ground plane segment, merging with the high-current digital ground plane at a single point (near the battery connector).
- **I2C Signal Integrity**: Route the `SDA` and `SCL` lines parallel to each other with equivalent track lengths. Ensure that the pull-up resistors ($4.7\text{k}\Omega$) are located as close to the microcontroller as possible to minimize trace capacitance and maintain sharp signal rise times under $100\text{kHz}$ Clock speeds.
- **Bypass Placement**: Decoupling capacitors ($0.1\mu\text{F}$) must be placed within 2mm of the `VDD` pin of the MAX30102 and the `VCC` pin of the MPU6050 to filter RF ripple.

---

## 📦 3D Assembly & Snap-Fit Enclosure

The hardware casing is divided into two parts, modeled as 3D printable meshes under `hardware/cad/`:

1. **Bottom Case (`wearable_casing_bottom.stl`)**:
   - Houses the rechargeable battery and PCB assembly.
   - Features curved watch-strap slot loops on the outer left and right walls.
   - Includes a circular bottom cutout for the MAX30102 optical sensor to rest directly against the wearer's skin.
   - Features a side port opening to expose the USB-C charging receptacle.
2. **Top Cover (`wearable_casing_top.stl`)**:
   - A protective flat cover lid with a snap-fit alignment rim that slides inside the bottom case, enclosing the electronic assemblies securely.

---

## 📁 Directory Index

- 📄 **[wearable_pcb_spec.md](wearable_pcb_spec.md)**: Full component specification sheet and layout rules.
- 📁 **[wearable_firmware/](wearable_firmware/)**: Contains `wearable_firmware.ino` (ESP32 source code).
- 📁 **[pcb/](pcb/)**: Contains the KiCad project files (`.kicad_pro`, `.kicad_sch`, `.kicad_pcb`).
- 📁 **[cad/](cad/)**: Contains the snap-fit 3D print enclosure models (`.stl`).
