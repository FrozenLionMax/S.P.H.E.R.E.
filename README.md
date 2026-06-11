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

### 🧬 3D Digital Twin (WebGL Hologram)

A fully interactive Three.js anatomical model embedded directly into the dashboard:

- **Beating Heart** — Procedurally generated cardioid mesh with ventricle contraction shaders synchronized to live BPM
- **Breathing Lungs** — Vertex shader-driven diaphragm expansion responding to SpO₂ levels
- **Synaptic Brain** — 80-particle neural firing simulation with frequency-driven jitter
- **Vascular System** — Instanced blood-flow orbs traveling along CatmullRom spline arteries at BPM-scaled velocity
- **Glass Skin & Skeleton** — Clearcoat physical material mannequin with 12-segment vertebral column and ribcage

The miniature 3D hologram auto-rotates on the main dashboard. Click **"Proceed to 3D Digital Twin"** for a full-screen interactive experience with organ zoom, wireframe modes, and floating HUD telemetry cards.

### 📊 Predictive Anomaly Detection

Rather than purely reactive threshold alerts, S.P.H.E.R.E. uses a **Rolling Z-Score** algorithm computed over a 30-sample sliding window. When a metric drifts beyond **2.0 standard deviations** from its moving average:

- A pulsing amber glow wraps around the target metric card
- A `⚠ ANOMALY PREDICTED` badge warns the operator **before** warning/critical limits are crossed

### 💓 Real-Time ECG Waveform

A vector-based Electrocardiogram live scanner renders full **P-QRS-T** cardiac complexes at 60fps. The waveform's frequency, amplitude, and noise respond dynamically to operator stress, heart rate, and crisis state.

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

### 🎬 60-Second Guided Demo Mode

A fully automated diagnostic simulation that steps through a complete operational lifecycle:

| Time | Phase | What Happens |
|------|-------|-------------|
| 0–10s | **Nominal Baseline** | All metrics green and stable under PILOT profile |
| 10–20s | **Anomaly Drift** | Heart rate and PERCLOS begin drifting; Z-score badges trigger amber |
| 20–30s | **Crisis Override** | System transitions to crisis state with alarms and visual overlays |
| 30–40s | **Automated Failsafe** | Override sequence executes (e.g., automated aircraft descent) |
| 40–50s | **Gradual Recovery** | Metrics slowly return to nominal safety limits |
| 50–60s | **Resolution** | Victory chime, `ALL SYSTEMS NOMINAL` banner, telemetry returns to baseline |

### 📸 HUD Screen Capture

Export a high-fidelity PNG screenshot of the cockpit state using `html2canvas-pro`. The export automatically isolates the telemetry dashboard and saves it as `SPHERE_HUD_EXPORT_<timestamp>.png`.

---

## 🏗️ Architecture

```
S.P.H.E.R.E./
├── app/
│   ├── page.tsx                  # Main telemetry dashboard (3,000+ lines)
│   ├── digital-twin/page.tsx     # Full-screen 3D Digital Twin experience
│   ├── globals.css               # Design system (glassmorphism, CRT, animations)
│   └── layout.tsx                # Root layout with Google Fonts
├── components/
│   ├── DigitalTwinScene.tsx       # Three.js WebGL hologram (organs, skeleton, particles)
│   └── BioWaveCanvas.tsx          # Canvas-based biological waveform renderer
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

1. **Select an operator** from the onboarding screen (Train Pilot, Aviator, Astronaut, Surgeon, or Trucker)
2. **Watch live telemetry** flow across metric cards, charts, and the 3D hologram
3. **Press `C`** to trigger a crisis and see the automated override system engage
4. **Press `R`** to resolve and watch graceful recovery
5. **Click "Proceed to 3D Digital Twin"** to explore the full-screen interactive hologram

---

## 🎨 Design System

S.P.H.E.R.E. uses a custom dark-only glassmorphism design system:

- **Typography**: Space Grotesk (UI) + JetBrains Mono (data/code)
- **Glass Panels**: `backdrop-filter: blur(16px)` with subtle border highlights
- **Color Palette**: Electric cyan (`#00d4ff`), emerald (`#00e599`), amber (`#f59e0b`), crimson (`#ff3b5c`)
- **CRT Overlay**: Subtle scanline texture with micro-flicker animation
- **Animations**: Spring-based value interpolation via Framer Motion

---

## 📄 License

This project is open source. See the repository for license details.

---

<p align="center">
  <sub>Built with ❤️ for high-stakes operational safety</sub>
</p>
