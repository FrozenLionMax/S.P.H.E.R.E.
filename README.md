# 🌐 S.P.H.E.R.E.
### Sentinel Physiological Hazard Evaluation & Response Engine

[![Tech Stack](https://img.shields.io/badge/Tech_Stack-Next.js_|_WebSockets_|_Node.js-00d4ff?style=flat-square)](#)

---

## 🎯 Overview
**S.P.H.E.R.E.** is an autonomous, multi-sector biometric guardian and hazard intervention cockpit designed for high-risk, safety-critical environments. By analyzing real-time physiological telemetry, the system calculates multi-dimensional fatigue and risk indices, detects predictive anomalies before threshold breaches occur, and executes automated failsafe protocols when operators enter high-stress or compromised states.

---

## 🚀 Key Features

### 1. 5 Specialized Operational Profiles
S.P.H.E.R.E. supports five distinct high-stress operator roles, each configured with specific bio-telemetry sensors, real-time algorithms, and custom automated override actions:
*   **🚄 Train Pilot:** Monitor fatigue using **PERCLOS** (Percentage of Eye Closure) and throttle micro-correction frequency. Uses a fatigue index calculation to trigger pneumatic braking.
*   **🛩️ Commercial Aviator / Fighter Pilot:** Target Hypoxia & G-LOC prevention with SpO₂ levels, G-force loads, and Pulse Wave Transit Time (PWTT). Automatically triggers Auto-GCAS (wings-level pull-up).
*   **👩‍🚀 Astronaut:** EVA Space Environment Overwatch tracking chest impedance, respiration volume, carbon dioxide accumulation, and suit pressure. Deploys auxiliary oxygen and calculates emergency return-to-airlock vectors.
*   **🥼 Microsurgeon:** Monitor hand tremor amplitude and electrodermal conductance (stress) during ultra-fine surgical tasks. Employs robotic scalpel stabilizer filtering and tool locking.
*   **🚚 Long-Haul Logistics Trucker:** Protect against highway monotony by measuring Heart Rate Variability (HRV LF/HF) and steering grip balance. Initiates platoon spacing adjustments and shoulder parking maneuvers.

### 2. Predictive Anomaly Detection (Rolling Z-Score)
Rather than relying purely on reactive threshold breaches, S.P.H.E.R.E. monitors telemetry deviations using a dynamic **Rolling Z-Score** calculation (computed over a 30-sample sliding window). When a metric's value drifts beyond 2.0 standard deviations from its moving average:
*   A pulsing amber border glows around the target metric card.
*   A glowing `⚠ ANOMALY PREDICTED` badge warns the operator of impending drift before warning/critical limits are crossed.

### 3. Interactive ECG Waveform Canvas
An animated vector-based Electrocardiogram (ECG) live scanner renders real-time cardiac waveforms directly inside the cockpit. The wave's frequency, amplitude, and noise level respond dynamically to operator stress levels, heart rate, and current status.

### 4. Interactive Command Controls & Audio Feedback
*   **Active Controls Panel:** Directly trigger emergency overrides or resolve systems back to nominal status.
*   **Acoustic Feedback:** Custom audio alerts and victory chimes played through HTML5 Web Audio Synthesis, fully responsive to the operator's current physiological safety zones.
*   **Keyboard Shortcuts & Cheat Sheet:**
    *   `1` to `5` - Switch instantly between operator profiles.
    *   `C` - Trigger crisis/override state.
    *   `R` - Resolve crisis and return to nominal.
    *   `A` - Toggle audio alarms/alerts.
    *   `Space` - Pause or resume the real-time telemetry stream.
    *   `?` - Show/hide the interactive keyboard shortcuts cheat sheet.

### 5. 60-Second Guided Demo Mode
An integrated diagnostic simulation that steps through a full lifecycle of operational scenarios:
*   **0–10s: Nominal Baseline** – All metrics green and stable under the `PILOT` profile.
*   **10–20s: Anomaly Drift** – Heart rate and PERCLOS begin to drift; Z-score prediction badges trigger and glow amber.
*   **20–30s: Crisis Override** – System automatically transitions to Crisis/Override status, activating visual warning overlays, sound alerts, and critical flags.
*   **30–40s: Autopilot Descent** – Automated override sequence executes failsafe operations (e.g., automated aircraft descent).
*   **40–50s: Gradual Recovery** – Operator metrics slowly return to nominal safety limits.
*   **50–60s: Post-Crisis Resolution** – Victory chime plays, a centered `ALL SYSTEMS NOMINAL` banner overlays the HUD, and telemetry returns to baseline.

### 6. HUD Screen Capture (High-Fidelity PNG Export)
Download a vector-sharp screenshot of the cockpit using `html2canvas-pro`. The export automatically isolates the telemetry dashboard state (removing browser scrollbars and CRT scanning grid overlays to ensure clinical legibility) and saves it as `SPHERE_HUD_EXPORT_<timestamp>.png`.

---

## 🛠️ Architecture & Tech Stack
*   **Frontend Dashboard:** Next.js (React), Tailwind CSS, Framer Motion
*   **Visual Analytics:** Recharts (Polar Radar & SVG Trend lines) & Canvas API (ECG rendering)
*   **Telemetry Engine:** WebSocket server (Node.js) transmitting real-time simulation packets
*   **Synthesis Engine:** Web Audio API (Synthesizes raw alarm frequencies and audio chimes programmatically without external media assets)

---

## ⚙️ Installation & Running Locally

### Prerequisites
*   **Node.js** (v18.0.0 or higher)
*   **npm** (v9.0.0 or higher)

### 1. Clone & Extract
Ensure you are in the project root directory.

### 2. Install Dependencies
Install client and server packages:
```bash
npm install
```

### 3. Start the WebSockets Telemetry Server
Launch the background telemetry simulation server:
```bash
node server.js
```
The server will start listening on port `8080` and emit periodic mock biosensors data.

### 4. Start the Frontend Dashboard
Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to access the S.P.H.E.R.E. interface.
