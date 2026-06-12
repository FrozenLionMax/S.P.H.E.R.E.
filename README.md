<p align="center">
  <img src="https://img.shields.io/badge/S.P.H.E.R.E.-Autonomous_Telemetry-00d4ff?style=for-the-badge&labelColor=080c10" alt="S.P.H.E.R.E." />
</p>

<h1 align="center">🛡️ S.P.H.E.R.E.</h1>
<h3 align="center">Sentinel Physiological Hazard Evaluation & Response Engine</h3>

<p align="center">
  <em>An autonomous, real-time biometric telemetry cockpit for monitoring and protecting high-risk operators across five safety-critical domains.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Three.js-WebGL-000000?style=flat-square&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/WebSockets-Real--Time-010101?style=flat-square&logo=socket.io" alt="WebSockets" />
  <img src="https://img.shields.io/badge/Zustand-State-443b30?style=flat-square" alt="Zustand" />
  <img src="https://img.shields.io/badge/Framer_Motion-Animations-0055FF?style=flat-square&logo=framer" alt="Framer Motion" />
</p>

---

## 📖 Overview

**S.P.H.E.R.E.** is an autonomous, multi-sector biometric guardian and hazard-intervention cockpit. It monitors real-time physiological telemetry from high-risk operators, computes multi-dimensional fatigue and risk indices, predicts anomalies before threshold breaches occur, and executes automated failsafe protocols when operators enter compromised states.

In safety-critical environments—such as commercial aviation, deep-space exploration, high-speed rail transit, remote microsurgery, and long-haul transport—operator incapacitation leads to catastrophic failure. Standard biometric platforms are purely reactive, triggering alerts only after a critical threshold is breached. S.P.H.E.R.E. redefines this paradigm by running rolling statistical predictions and executing **active interlock overrides** that bypass manual operator control during acute crises (e.g., G-LOC, hypoxia, micro-sleep, or neurological anomalies).

The system features a **3D Digital Twin** — a fully interactive WebGL hologram of the human body with beating heart, breathing lungs, and synaptic brain particles — all driven by live telemetry data.

---

## 🚀 Key Features

### 🎯 Five Specialized Operator Profiles

Each profile is configured with domain-specific bio-sensors, real-time risk equations, and automated crisis interventions:

| Profile | Domain | Key Sensors | Crisis Protocol |
|---------|--------|-------------|-----------------|
| 🚄 **Train Pilot** | Railway Operations | PERCLOS eye-tracking, throttle capacitance, micro-correction frequency | Emergency pneumatic braking |
| ✈️ **Aviator** | Flight Deck | SpO₂ oximetry, G-force, Pulse Wave Transit Time (PWTT) | Auto-GCAS emergency descent |
| 👩‍🚀 **Astronaut** | EVA Space Ops | Transthoracic impedance, pCO₂, suit pressure | Emergency suit re-pressurization |
| 🔬 **Microsurgeon** | Tele-Robotic Surgery | Hand tremor FFT, electrodermal activity (EDA) | Robotic stabilizer & tool lock |
| 🚚 **Trucker** | Long-Haul Logistics | HRV LF/HF ratio, grip asymmetry, V2V mesh quality | Platoon shoulder pull-over |

---

### 🧬 3D Digital Twin (WebGL Hologram)

A fully interactive Three.js anatomical model embedded directly into the dashboard:

- **Beating Heart** — Procedurally generated cardioid mesh with ventricle contraction shaders synchronized to live BPM.
- **Breathing Lungs** — Vertex shader-driven diaphragm expansion responding to SpO₂ levels.
- **Synaptic Brain** — 80-particle neural firing simulation with frequency-driven jitter.
- **Vascular System** — Instanced blood-flow orbs traveling along CatmullRom spline arteries at BPM-scaled velocity.
- **Glass Skin & Skeleton** — Clearcoat physical material mannequin with 12-segment vertebral column and ribcage.

The miniature 3D hologram auto-rotates on the main dashboard. Click **"Proceed to 3D Digital Twin"** for a full-screen interactive experience with organ zoom, wireframe modes, and floating HUD telemetry cards.

---

### 📊 Predictive Anomaly Detection

Rather than relying on static limits, S.P.H.E.R.E. utilizes a **Rolling Z-Score** algorithm computed over a 30-sample sliding window:

$$Z = \frac{X - \mu}{\sigma}$$

where $X$ is the current biometric value, $\mu$ is the rolling mean, and $\sigma$ is the rolling standard deviation.
* When a metric drifts beyond **2.0 standard deviations** ($|Z| > 2.0$) from its moving average, a pulsing amber warning glow wraps around the target card.
* A `⚠ ANOMALY PREDICTED` badge warns the supervisor **before** critical safety limits are crossed, enabling early preemptive intervention.

---

### 💓 Real-Time ECG Waveform

A vector-based Electrocardiogram live scanner renders full **P-QRS-T** cardiac complexes at 60fps. The waveform's frequency, amplitude, and noise respond dynamically to operator stress, heart rate, and crisis state.
- **Ventricular Fibrillation (V-Fib)**: In crisis mode, the waveform transitions to chaotic multi-sine waves to simulate cardiac arrest.
- **Skipped Beats**: Under nominal conditions, the ECG simulates occasional sinus blocks by dropping every 6th beat, muting the audio chime and resetting phase calculations.

---

### 🎮 Interactive Controls & Audio

| Shortcut | Action |
|----------|--------|
| `1` – `5` | Switch between operator profiles instantly |
| `C` | Trigger crisis / override state |
| `R` | Resolve crisis, return to nominal |
| `A` | Toggle audio alarms & alerts |
| `Space` | Pause / resume telemetry stream |
| `?` | Show keyboard shortcuts overlay |

Audio feedback is synthesized programmatically through the **Web Audio API** — no external media files. Alarm frequencies and victory chimes are generated in real-time.

---

### 🎬 60-Second Guided Demo Mode

A fully automated diagnostic simulation that steps through a complete operational lifecycle:

| Time | Phase | Description |
|------|-------|-------------|
| 0–10s | **Nominal Baseline** | All metrics green and stable under PILOT profile. |
| 10–20s | **Anomaly Drift** | Vitals begin drifting; Z-score warning indicators trigger. |
| 20–30s | **Crisis Override** | Telemetry breaches override thresholds; audio alarms activate. |
| 30–40s | **Automated Failsafe** | Failsafe interlocks engage (e.g., flight deck auto-GCAS lock). |
| 40–50s | **Gradual Recovery** | Stabilization protocols engage; vitals begin recovery. |
| 50–60s | **Resolution** | All systems return to nominal safety baselines. |

---

### 📸 HUD Screen Capture

Export a high-fidelity PNG screenshot of the cockpit state using `html2canvas-pro`. The export automatically isolates the WebGL canvas, preserving the 3D digital-twin buffer, and saves it as `SPHERE_HUD_EXPORT_<timestamp>.png`.

---

## 🏗️ Architecture

```
S.P.H.E.R.E./
├── app/
│   ├── page.tsx                  # Main telemetry dashboard
│   ├── digital-twin/page.tsx     # Full-screen 3D Digital Twin experience
│   ├── globals.css               # Design system (glassmorphism, CRT, animations)
│   └── layout.tsx                # Root layout with Google Fonts
├── components/
│   └── DigitalTwinScene.tsx      # Three.js WebGL hologram (organs, skeleton, particles)
├── lib/
│   ├── useTelemetry.ts            # WebSocket hook for real-time data consumption
│   └── useTelemetryStore.ts       # Zustand store with auto-reconnect & atomic selectors
├── server.js                      # Node.js WebSocket telemetry simulation engine
└── public/                        # Static assets
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React 19 | App framework & rendering |
| **Styling** | Tailwind CSS 4, Framer Motion | Design system & animations |
| **3D Engine** | Three.js, React Three Fiber, Drei | WebGL Digital Twin hologram |
| **Charts** | Recharts | Polar radar, area charts, trend lines |
| **Waveforms** | Canvas API | 60fps ECG rendering |
| **State** | Zustand | Global telemetry store with atomic selectors |
| **Real-Time** | WebSockets (ws) | Bidirectional telemetry streaming |
| **Audio** | Web Audio API | Programmatic alarm synthesis |
| **Server** | Node.js, Express | Telemetry simulation & WebSocket engine |
| **Export** | html2canvas-pro | High-fidelity screenshot capture |

---

## 🧬 Theory of Operation & Systems Engineering Standards

S.P.H.E.R.E. is designed to operate as a high-integrity cyberphysical systems platform. The sections below outline the core algorithms, dual-mode telemetry configurations, and signal processing pipelines.

```
                      +-----------------------------+
                      |  ESP32 MCU (Wearable Node)  |
                      |  - MAX30102 PPG Vitals      |
                      |  - MPU6050 Accelerometer    |
                      +--------------┬--------------+
                                     │
                                     ▼ (Raw JSON over WebSocket)
                      +-----------------------------+
                      |      Node.js server.js      |
                      |  - Ingestion Engine         |
                      |  - Fallback Homeostasis Sim |
                      +--------------┬--------------+
                                     │
                                     ▼ (State Serialization Broadcast)
                      +-----------------------------+
                      |      Next.js Dashboard      |
                      |  - WebGL Digital Twin       |
                      |  - Rolling Z-Score Alerts   |
                      +-----------------------------+
```

### 1. Edge Signal Processing (DSP)
To convert raw optical measurements from the bio-sensor pack into stable, calibrated biological telemetry, the ESP32 firmware executes a local digital signal processing pipeline:
- **DC Offset Attenuation**: Raw photodetector inputs contain a massive static DC component representing tissue light absorption. The firmware filters this using a first-order recursive high-pass IIR filter:
  $$w[n] = x[n] + \alpha \cdot w[n-1]$$
  $$y[n] = w[n] - w[n-1]$$
  where $\alpha = 0.98$ acts as the feedback coefficient to filter out slow drifts below $0.5\text{Hz}$.
- **Zero-Crossing Pulse Tracker**: The AC output is processed through a threshold-crossing detector with a $15.0$ hysteresis band and a $400\text{ms}$ lockout period. This isolates valid cardiac cycles, counting peak intervals to compute a running Heart Rate (BPM).
- **SpO₂ Calibration (Ratio-of-Ratios)**: The firmware tracks peak-to-peak AC amplitudes and average DC values for both the Red and Infrared LED channels. It computes the calibration ratio ($R$):
  $$R = \frac{AC_{\text{Red}} / DC_{\text{Red}}}{AC_{\text{IR}} / DC_{\text{IR}}}$$
  The peripheral blood oxygenation is then calculated using the empirical calibration curve:
  $$\text{SpO}_2 = 110.0 - 25.0 \times R$$
  clamped between $50.0\%$ and $100.0\%$ to ensure signal sanity.

### 2. Dual-Mode Telemetry Ingestion
S.P.H.E.R.E. manages data flows through a dual-mode communication broker inside the backend gateway:
- **Mathematical Simulation Mode**: When no physical hardware is connected, the server maintains an active simulation state. It applies homeostasis models coupled with an elastic random jitter generator (`applyJitter`) to feed all metric cards and charts.
- **Hardware Telemetry Overrides**: When the ESP32 registers with the WebSocket gateway, it transmits a `sensor_pack` header. The server intercepts this connection, flags it as a hardware node (blocking dashboard broadcast loops to save ESP32 power), and directly overwrites the active simulation values with raw physical sensor telemetry. The cockpit frontend instantly reflects the wearer's real-time vitals.

---

## 🔧 Cyberphysical Hardware Connection Guide

To connect a physical ESP32 module to the running dashboard, follow these steps:

### 1. Schematic Connections

Wire the MAX30102 PPG sensor and MPU6050 accelerometer to the ESP32 according to this layout:

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

### 2. Firmware Setup & Upload
1. Open the [Arduino IDE](https://www.arduino.cc/en/software).
2. Install the `WebSockets` (by Marcus Sattler) and `ArduinoJson` (by Benoit Blanchon) libraries.
3. Open `hardware/wearable_firmware/wearable_firmware.ino`.
4. Configure your local network parameters:
   - Set `ssid` and `password` to your Wi-Fi credentials.
   - Run `ipconfig` (Windows) or `ifconfig` (macOS/Linux) on the host computer running S.P.H.E.R.E. to find its local IP.
   - Set `ws_host` to this local IP address (e.g. `192.168.1.15`).
5. Select **ESP32 Dev Module** as the target board, and flash the code.
6. Once powered up, the ESP32 will connect automatically. The dashboard logs console will print:
   `[HW] Biosensor Pack Online. Stream stabilized: HR=74 bpm, SpO2=98.4%`.

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/FrozenLionMax/S.P.H.E.R.E..git
cd S.P.H.E.R.E.

# 2. Install dependencies
npm install

# 3. Start the WebSocket telemetry server (runs on port 8080)
node server.js

# 4. In a new terminal, start the Next.js dashboard
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** to access S.P.H.E.R.E.

### Quick Start

1. **Select an operator** from the onboarding screen (Train Pilot, Aviator, Astronaut, Surgeon, or Trucker).
2. **Watch live telemetry** flow across metric cards, charts, and the 3D hologram.
3. **Press `C`** to trigger a crisis and see the automated override system engage.
4. **Press `R`** to resolve and watch graceful recovery.
5. **Click "Proceed to 3D Digital Twin"** to explore the full-screen interactive hologram.

---

## 🎨 Design System

S.P.H.E.R.E. uses a custom dark-only glassmorphism design system:

- **Typography**: Space Grotesk (UI) + JetBrains Mono (data/code).
- **Glass Panels**: `backdrop-filter: blur(16px)` with subtle border highlights.
- **Color Palette**: Electric cyan (`#00d4ff`), emerald (`#00e599`), amber (`#f59e0b`), crimson (`#ff3b5c`).
- **CRT Overlay**: Subtle scanline texture with micro-flicker animation.
- **Animations**: Spring-based value interpolation via Framer Motion.

---

## 📄 License

This project is open source. See the repository for license details.

---

<p align="center">
  <sub>Built with ❤️ for high-stakes operational safety</sub>
</p>
