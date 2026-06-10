# 🌐 S.P.H.E.R.E.
### Sentinel Physiological Hazard Evaluation & Response Engine

[![Hackathon](https://img.shields.io/badge/FAR_AWAY_2026-Hackathon_Submission-ff3b5c?style=flat-square)](#)
[![Tech Stack](https://img.shields.io/badge/Tech_Stack-Next.js_|_WebSockets_|_Node.js-00d4ff?style=flat-square)](#)

---

## 🎯 Project Tagline
*Autonomous, multi-sector biometric guardian and hazard intervention cockpit.*

## 🚨 Problem Statement
Fatigue and physiological degradation cost lives in high-risk operational environments. S.P.H.E.R.E. addresses this by collecting domain-specific biometric telemetry in real-time, executing mathematical risk scoring, and triggering autonomous failsafes when critical thresholds are breached.

---

## 📋 The 5 Operational Profiles

### 1. 🚄 Train Pilot (Railways Fatigue Prevention)
- **Sensor Hardware:** High-frequency Infrared Eye-Tracking Console & Capacitive Touch Throttle
- **Telemetry Biomarkers:** PERCLOS (Percentage of Eye Closure) & Micro-correction frequency
- **Autonomous Override:** Evaluates `Fatigue Index = (PERCLOS × 0.7) + (CogLat × 0.3)`. Triggers stage 1 emergency pneumatic brake clamp.

### 2. 🛩️ Commercial Aviator / Fighter Pilot (Hypoxia & G-LOC Prevention)
- **Sensor Hardware:** Helmet-mounted SpO₂ Sensor & 3-Axis Accel. Array
- **Telemetry Biomarkers:** Blood Oxygen Saturation (SpO₂), G-Force load, & Pulse Wave Transit Time (PWTT)
- **Autonomous Override:** Autopilot locking & immediate wings-level automated pull-up (Auto-GCAS).

### 3. 👩‍🚀 Astronaut (EVA Space Environment Overwatch)
- **Sensor Hardware:** Transthoracic Impedance Garment & Helmet CO₂ Gas Sensor
- **Telemetry Biomarkers:** Respiration volume, pCO₂ accumulation rate, Suit Pressure, & Scrubber O₂ flow
- **Autonomous Override:** Deploys auxiliary life support loop and calculates return-to-airlock thruster trajectory.

### 4. 🥼 Microsurgeon (Fine Tremor Suppression)
- **Sensor Hardware:** Surgical Tool IMU Gyros & Wrist Electrodermal Conductance Sensor
- **Telemetry Biomarkers:** 8Hz tremor amplitude, Tremor Frequency peak, EDA stress, & Grip force feedback
- **Autonomous Override:** Scalpel digital locking & multi-axis robotic actuator stabilizer filtering.

### 5. 🚚 Long-Haul Logistics Trucker (Monotony Protection)
- **Sensor Hardware:** Smart Seat Fabric ECG Grid & V2V Platoon Transceiver
- **Telemetry Biomarkers:** HRV LF/HF sympathetic ratio, Grip asymmetry, V2V link margin, & Alertness score
- **Autonomous Override:** Swarm platoon gap spacing expansion & automated highway shoulder pull-over.

---

## 🛠️ Tech Stack
- **Frontend Framework:** Next.js (React), Tailwind CSS, Framer Motion (Fluid Micro-animations)
- **Data Visualization:** Recharts (Dynamic Polar Radar & SVG Trend charts)
- **Real-Time Data Engine:** WebSocket Server (Node.js) & telemetry simulation engine
- **Style Archetype:** Sleek glassmorphism dark mode with high-contrast indicator highlights

---

## 🚀 Running S.P.H.E.R.E. Locally

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch the Telemetry Simulation Server
```bash
node server.js
```
The server will bind to port `8080` and start generating raw simulated biomarker packets.

### 3. Run the Next.js Dev Client
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the neural link diagnostic panel.

---

*Developed for the FAR AWAY 2026 Hackathon. Deadlines: June 14, 2026, 11:59 PM IST.*
