// ─────────────────────────────────────────────────────────────────────────────
// Color Theme & Palettes
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  cyan:     '#00d4ff',
  green:    '#00e599',
  amber:    '#f59e0b',
  red:      '#ff3b5c',
  violet:   '#8b5cf6',
  rose:     '#f43f5e',
  slate:    'rgba(255,255,255,0.06)',
  muted:    '#64748b',
  subtle:   '#334155',
  fg:       '#e2e8f0',
} as const;

export type StatusType = 'ok' | 'warn' | 'critical';

export const STATUS: Record<StatusType, string> = {
  ok: C.green,
  warn: C.amber,
  critical: C.red,
};

// ─────────────────────────────────────────────────────────────────────────────
// Operator Tracks Configurations
// ─────────────────────────────────────────────────────────────────────────────

export const TRACK_CONFIGS = {
  ASTRONAUT: {
    title: "EXTRAVEHICULAR ACTIVITY (EVA) LIFE-SUPPORT PROTOCOL",
    themeColor: C.violet,
    chart2Label: "Suit Pressure (PSI)",
    metricUnit: "PSI",
    baseEnvVal: 4.3,
    crisisDelta: -0.15,
    terminalLogs: ["[SYSTEM] EVA telemetry locked.", "[LIFE-SUPPORT] Suit pressure balancing."],
    overrideMsg: "AUTOMATED OVERRIDE: INITIATING EMERGENCY SUIT RE-PRESSURIZATION"
  },
  PILOT: {
    title: "FLIGHT DECK BIOMETRIC TELEMETRY CONSOLE",
    themeColor: C.cyan,
    chart2Label: "Cabin Altitude (FT)",
    metricUnit: "FT",
    baseEnvVal: 8000,
    crisisDelta: 450,
    terminalLogs: ["[AVIONICS] Autopilot standby.", "[CABIN] Monitoring cabin pressure matrix."],
    overrideMsg: "AUTOMATED PILOT OVERRIDE: INITIATING EMERGENCY FLIGHT DESCENT RADIAN"
  },
  SURGEON: {
    title: "TELE-ROBOTIC SURGERY CONTROL MATRIX",
    themeColor: C.green,
    chart2Label: "Hand Tremor Index (mm)",
    metricUnit: "mm",
    baseEnvVal: 0.02,
    crisisDelta: 0.04,
    terminalLogs: ["[ROBOTIC] Multi-axis actuators calibrated.", "[SENSE] Micro-force feedback active."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING ROBOTIC STABILIZATION DAMPERS"
  },
  TRAIN_PILOT: {
    title: "LOCOMOTIVE TRAFFIC OVERWATCH NETWORK",
    themeColor: C.amber,
    chart2Label: "Cognitive Latency (ms)",
    metricUnit: "ms",
    baseEnvVal: 210,
    crisisDelta: 85,
    terminalLogs: ["[SIGNAL] ATS-Inductor channel linked.", "[BRAKES] Pneumatic line pressure nominal."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING EMERGENCY PNEUMATIC BRAKES"
  },
  TRUCKER: {
    title: "LONG-HAUL LOGISTICS SWARM RADAR",
    themeColor: C.rose,
    chart2Label: "Driver Focus Index (%)",
    metricUnit: "%",
    baseEnvVal: 95,
    crisisDelta: -4.0,
    terminalLogs: ["[SWARM] V2V Mesh network established.", "[FLEET] Proximity safety margins active."],
    overrideMsg: "FLEET PLATOON WARNING: EXECUTING DISTRIBUTED V2V SHOULDER PULL-OVER"
  }
} as const;

export type TrackKey = keyof typeof TRACK_CONFIGS;

// ─────────────────────────────────────────────────────────────────────────────
// Profile Biomarkers Schema
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileMetricConfig {
  label: string;
  sublabel: string;
  key: string;
  unit: string;
  precision: number;
  min: number;
  max: number;
  warnAt: string;
  critAt: string;
  dir?: 'lo' | 'hi'; // Explicit optional direction override if needed (default in classify matches logic)
}

export const PROFILE_METRICS: Record<TrackKey, ProfileMetricConfig[]> = {
  TRAIN_PILOT: [
    { label: 'PERCLOS', sublabel: 'Infrared Pupil Tracking', key: 'perclos', unit: '%', precision: 1, min: 0, max: 35, warnAt: '10%', critAt: '15%' },
    { label: 'Heart Rate', sublabel: 'Capacitive Throttle', key: 'heartRate', unit: 'bpm', precision: 0, min: 40, max: 150, warnAt: '110', critAt: '120' },
    { label: 'Micro-Corrections', sublabel: 'Steering Activity', key: 'microCorrections', unit: '/min', precision: 0, min: 0, max: 60, warnAt: '25', critAt: '15' },
    { label: 'Fatigue Index', sublabel: 'Risk Calculation', key: 'fatigueIndex', unit: '', precision: 2, min: 0, max: 30, warnAt: '10.0', critAt: '15.0' }
  ],
  PILOT: [
    { label: 'Blood Oxygen', sublabel: 'Helmet Sensor', key: 'spO2', unit: '% SpO₂', precision: 1, min: 50, max: 100, warnAt: '90%', critAt: '83%' },
    { label: 'G-Force', sublabel: 'Helmet Accel.', key: 'gForce', unit: 'G', precision: 1, min: 0, max: 10, warnAt: '6.0', critAt: '7.5' },
    { label: 'Pulse Wave TT', sublabel: 'Earlobe PWTT', key: 'pwtt', unit: 'ms', precision: 0, min: 180, max: 450, warnAt: '300', critAt: '350' },
    { label: 'Desat Velocity', sublabel: 'spO₂ Decay Rate', key: 'spO2Desat', unit: '%/min', precision: 1, min: 0, max: 25, warnAt: '5.0', critAt: '10.0' }
  ],
  ASTRONAUT: [
    { label: 'Respir. Volume', sublabel: 'Transthoracic Imp.', key: 'transthoracicImpedance', unit: '% vol', precision: 1, min: 20, max: 100, warnAt: '60%', critAt: '45%' },
    { label: 'Carbon Dioxide', sublabel: 'Helmet pCO₂', key: 'pCO2', unit: 'mmHg', precision: 1, min: 0, max: 15, warnAt: '6.0', critAt: '8.0' },
    { label: 'Suit Pressure', sublabel: 'EVA Life Support', key: 'suitPressure', unit: 'PSI', precision: 2, min: 2.5, max: 5.0, warnAt: '4.0', critAt: '3.8' },
    { label: 'Scrubber Flow', sublabel: 'O₂ Scrubber Loop', key: 'scrubberFlow', unit: 'L/min', precision: 1, min: 0, max: 10, warnAt: '3.5', critAt: '2.0' }
  ],
  SURGEON: [
    { label: 'Tremor Amp.', sublabel: '8Hz Frequency FFT', key: 'tremorAmplitude', unit: 'mm', precision: 3, min: 0.0, max: 0.3, warnAt: '0.08', critAt: '0.12' },
    { label: 'Electrodermal Act.', sublabel: 'EDA conductance', key: 'eda', unit: 'µS', precision: 2, min: 0, max: 12, warnAt: '4.0', critAt: '5.0' },
    { label: 'Robotic Grip', sublabel: 'Actuator Force', key: 'gripForce', unit: 'N', precision: 1, min: 0, max: 20, warnAt: '5.0', critAt: '3.0' },
    { label: 'Tremor Freq', sublabel: 'FFT Peak Freq', key: 'tremorFreq', unit: 'Hz', precision: 1, min: 0, max: 12, warnAt: '5.5', critAt: '7.5' }
  ],
  TRUCKER: [
    { label: 'HRV LF/HF Ratio', sublabel: 'Sympathetic Stress', key: 'hrvRatio', unit: '', precision: 2, min: 0.2, max: 5.0, warnAt: '1.5', critAt: '1.0' },
    { label: 'Grip Asymmetry', sublabel: 'Smart Seat/Wheel', key: 'gripAsymmetry', unit: '%', precision: 1, min: 0, max: 100, warnAt: '20%', critAt: '35%' },
    { label: 'V2V Link Quality', sublabel: 'Platoon Mesh', key: 'v2vLink', unit: 'dBm', precision: 0, min: -100, max: -40, warnAt: '-80', critAt: '-88' },
    { label: 'Alertness Index', sublabel: 'Swarm Analysis', key: 'alertness', unit: '%', precision: 1, min: 0, max: 100, warnAt: '75%', critAt: '65%' }
  ]
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Profile Hardware Attachment Schema
// ─────────────────────────────────────────────────────────────────────────────

// Each sensor has: label, telemetry key to read, unit, thresholds for status
export interface SensorDef {
  label: string
  key: string           // telemetry key or trackData key to read
  unit: string
  nominal: [number, number]  // [min, max] for NOMINAL range
  format?: (v: number) => string
}

export const PROFILE_SENSORS: Record<TrackKey, SensorDef[]> = {
  ASTRONAUT: [
    { label: 'Suit Pressure', key: 'suitPressure', unit: 'psi', nominal: [3.8, 4.6], format: v => v.toFixed(2) },
    { label: 'Helmet CO₂', key: 'co2Level', unit: 'mmHg', nominal: [0, 5.0], format: v => v.toFixed(1) },
    { label: 'Suit Temp', key: 'temperature', unit: '°F', nominal: [97.0, 100.0], format: v => v.toFixed(1) },
  ],
  PILOT: [
    { label: 'Headset SpO₂', key: 'spO2', unit: '%', nominal: [93, 100] },
    { label: 'Helmet Accel.', key: 'gForce', unit: 'G', nominal: [0, 5.0], format: v => v.toFixed(1) },
    { label: 'Cabin Altitude', key: 'cabinAlt', unit: 'ft', nominal: [0, 10000], format: v => Math.round(v).toLocaleString() },
  ],
  SURGEON: [
    { label: 'Scalpel IMU', key: 'tremorAmplitude', unit: 'mm', nominal: [0, 0.04], format: v => v.toFixed(3) },
    { label: 'Wrist EDA', key: 'edaLevel', unit: 'µS', nominal: [0.5, 5.0], format: v => v.toFixed(1) },
    { label: 'Hand Temp', key: 'temperature', unit: '°F', nominal: [96.0, 99.5], format: v => v.toFixed(1) },
  ],
  TRAIN_PILOT: [
    { label: 'IR Eye Tracker', key: 'perclos', unit: '%', nominal: [0, 12], format: v => v.toFixed(1) },
    { label: 'Throttle Grip', key: 'gripForce', unit: 'N', nominal: [8, 40], format: v => v.toFixed(0) },
    { label: 'Vibration Sens.', key: 'vibration', unit: 'mm/s', nominal: [0, 8.0], format: v => v.toFixed(1) },
  ],
  TRUCKER: [
    { label: 'Seat Biometrics', key: 'alertness', unit: '%', nominal: [80, 100], format: v => v.toFixed(0) },
    { label: 'V2V Mesh Ant.', key: 'meshSignal', unit: 'dBm', nominal: [-65, 0], format: v => v.toFixed(0) },
    { label: 'Cab Temp', key: 'temperature', unit: '°F', nominal: [65, 80], format: v => v.toFixed(1) },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Health Index Calculation Bounds
// ─────────────────────────────────────────────────────────────────────────────
export const HEALTH_INDEX_BOUNDS = {
  RESPIRATORY: { min: 88, max: 100 },
  CARDIAC: { min: 52, max: 140 },
  COGNITIVE: { min: 0, max: 620 },
  TEMPERATURE: { nominal: 98.6, maxOffset: 4.0 },
  PRESSURE: {
    ASTRONAUT: 4.3,
    DEFAULT: 14.7
  }
} as const;

export const HEALTH_SCORE_WEIGHTS = {
  RESPIRATORY: 0.35,
  CARDIAC: 0.30,
  ENVIRONMENT: 0.20,
  COGNITIVE: 0.15
} as const;
