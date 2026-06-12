try {
  const { loadEnvFile } = require('process');
  if (typeof loadEnvFile === 'function') {
    loadEnvFile();
  }
} catch (e) {
  // Safe fallback when .env is absent or older node version
}

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const dev = process.env.NODE_ENV !== 'production';
const startNext = process.env.NODE_ENV === 'production' || process.env.UNIFIED_SERVER === 'true';
let nextApp = null;
let handle = null;

if (startNext) {
  const next = require('next');
  nextApp = next({ dev });
  handle = nextApp.getRequestHandler();
}

function nowTime() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

let localLogs = [
  { id: Date.now(), time: nowTime(), level: 'SYS', msg: 'Kernel v4.2.1 initialized.' }
];

function addLog(level, msg) {
  localLogs.push({
    id: Date.now() + Math.random(),
    time: nowTime(),
    level,
    msg
  });
  if (localLogs.length > 50) {
    localLogs.shift();
  }
}

// Track configurations for deterministic degradation
const TRACKS = {
  ASTRONAUT:   { envBase: 4.3,  envCrisisDelta: -0.15, spO2Delta: -1.2, hrDelta: 3 },
  PILOT:       { envBase: 8000, envCrisisDelta: 450,   spO2Delta: -1.5, hrDelta: 4 },
  SURGEON:     { envBase: 0.02, envCrisisDelta: 0.04,  spO2Delta: -0.5, hrDelta: 5 },
  TRAIN_PILOT: { envBase: 210,  envCrisisDelta: 85,    spO2Delta: -0.8, hrDelta: 2 },
  TRUCKER:     { envBase: 95,   envCrisisDelta: -4.0,  spO2Delta: -1.0, hrDelta: 3 },
};

// Global state
let state = {
  heartRate: 75,
  spO2: 98.2,
  glucose: 100,
  respiratoryRate: 16,
  cognitiveLatency: 210,
  environmentMetric: TRACKS.PILOT.envBase,
  isCrisisActive: false,
  activeTrack: 'PILOT',
  isDemoActive: false,
  demoTime: 0,

  // Dynamic simulated metrics
  temperature: 98.6,
  pressure: 14.7,

  // Subsystem statuses
  subsystems: {
    neuralInterface: 'ONLINE',
    biometricSensors: 'ONLINE',
    telemetryRelay: 'ONLINE',
    cognitiveProc: 'ONLINE',
    atmosMonitor: 'ONLINE'
  },

  // Train Pilot metrics
  perclos: 3.5,
  microCorrections: 45,
  fatigueIndex: 4.8,

  // Aviator / Fighter Pilot metrics
  gForce: 1.0,
  pwtt: 220,
  spO2Desat: 0.1,

  // Astronaut metrics
  transthoracicImpedance: 98.0,
  pCO2: 2.5,
  suitPressure: 4.3,
  scrubberFlow: 6.0,

  // Surgeon metrics
  tremorAmplitude: 0.02,
  eda: 1.8,
  gripForce: 12.0,
  tremorFreq: 2.1,

  // Trucker metrics
  hrvRatio: 3.2,
  gripAsymmetry: 2.0,
  v2vLink: -62,
  alertness: 96.0
};

// Recovery buffers for gradual pharmacokinetic/system interventions
let recoveryBuffers = {
  heartRate: 0,
  spO2: 0,
  cognitiveLatency: 0,
  perclos: 0,
  microCorrections: 0,
  gForce: 0,
  pCO2: 0,
  suitPressure: 0,
  tremorAmplitude: 0,
  eda: 0,
  gripForce: 0,
  gripAsymmetry: 0,
  alertness: 0,
  v2vLink: 0,
  respiratoryRate: 0
};

let demoInterval = null;

// Helper: Calculate ECG wave amplitude based on normalized phase
function getECGValue(p) {
  if (p < 0.08) {
    // P Wave
    return Math.sin((p / 0.08) * Math.PI) * 0.12;
  } else if (p >= 0.10 && p < 0.13) {
    // Q Wave
    const t = (p - 0.10) / 0.03;
    return -t * 0.18;
  } else if (p >= 0.13 && p < 0.18) {
    // R Spike
    const t = (p - 0.13) / 0.05;
    return t < 0.4 ? -0.18 + (t / 0.4) * 1.68 : 1.5 - ((t - 0.4) / 0.6) * 1.85;
  } else if (p >= 0.18 && p < 0.22) {
    // S Dip
    const t = (p - 0.18) / 0.04;
    return -0.35 + (t * 0.35);
  } else if (p >= 0.28 && p < 0.42) {
    // T Wave
    const t = (p - 0.28) / 0.14;
    return Math.sin(t * Math.PI) * 0.28;
  }
  return 0;
}

// Helper: Introduce biological noise with elastic bounds
function applyJitter(val, min, max, maxDelta) {
  const delta = (Math.random() * maxDelta * 2) - maxDelta;
  let newVal = val + delta;
  
  // Organic elastic bounds: if pushed out of bounds by subsystem drugs/buffers, 
  // slowly drift back to homeostasis instead of hard-snapping.
  if (newVal < min) {
    return newVal + (min - newVal) * 0.05; // 5% recovery pull
  }
  if (newVal > max) {
    return newVal - (newVal - max) * 0.05;
  }
  return newVal;
}

// Ensure base metrics are roughly correct when changing tracks or resetting
function resetStateToTrack(trackName) {
  state.activeTrack = trackName;
  state.isCrisisActive = false;
  state.heartRate = 75;
  state.spO2 = 98.2;
  state.glucose = (trackName === 'TRAIN_PILOT' || trackName === 'TRUCKER') ? 210 : 100;
  state.cognitiveLatency = 210;
  state.environmentMetric = TRACKS[trackName] ? TRACKS[trackName].envBase : 0;

  state.temperature = 98.6;
  state.pressure = trackName === 'ASTRONAUT' ? 4.3 : 14.7;
  state.subsystems = {
    neuralInterface: 'ONLINE',
    biometricSensors: 'ONLINE',
    telemetryRelay: 'ONLINE',
    cognitiveProc: 'ONLINE',
    atmosMonitor: 'ONLINE'
  };

  state.isDemoActive = false;
  state.demoTime = 0;
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  // Resets for all specific fields
  state.perclos = 3.5;
  state.microCorrections = 45;
  state.fatigueIndex = 4.8;

  state.gForce = 1.0;
  state.pwtt = 220;
  state.spO2Desat = 0.1;

  state.transthoracicImpedance = 98.0;
  state.pCO2 = 2.5;
  state.suitPressure = 4.3;
  state.scrubberFlow = 6.0;

  state.tremorAmplitude = 0.02;
  state.eda = 1.8;
  state.gripForce = 12.0;
  state.tremorFreq = 2.1;

  state.hrvRatio = 3.2;
  state.gripAsymmetry = 2.0;
  state.v2vLink = -62;
  state.alertness = 96.0;
}

// Simulation Loop
let syncCounter = 0;

setInterval(() => {
  const trackConf = TRACKS[state.activeTrack] || TRACKS.PILOT;

  // Apply gradual Pharmacokinetic / System Recovery buffers
  const bleedRate = 0.15; // Bleed 15% of the remaining buffer every second
  for (const key of Object.keys(recoveryBuffers)) {
    if (Math.abs(recoveryBuffers[key]) > 0.01) {
      const bleedAmount = recoveryBuffers[key] * bleedRate;
      if (state[key] !== undefined) {
        state[key] += bleedAmount;
      }
      recoveryBuffers[key] -= bleedAmount;
    } else {
      recoveryBuffers[key] = 0;
    }
  }


  if (state.isCrisisActive) {
    // Deterministic Crisis Degradation for core values
    state.spO2 += trackConf.spO2Delta;
    state.heartRate += trackConf.hrDelta;
    state.environmentMetric += trackConf.envCrisisDelta;
    state.cognitiveLatency += Math.abs(trackConf.envCrisisDelta * 0.5) + 3.0;
    
    // Clamp core values
    if (state.spO2 < 50) state.spO2 = 50;
    if (state.heartRate > 220) state.heartRate = 220;

    // Simulate Glucose drift under crisis
    if (state.activeTrack === 'TRAIN_PILOT' || state.activeTrack === 'TRUCKER') {
      state.glucose = applyJitter(state.glucose + 7.5, 70, 310, 2.5);
    } else {
      state.glucose = applyJitter(state.glucose + 1.2, 70, 200, 1.0);
    }

    // Simulate Respiration drift under crisis
    if (state.activeTrack === 'ASTRONAUT') {
      state.respiratoryRate = applyJitter(state.respiratoryRate + 0.6, 12, 30, 0.3);
    } else {
      state.respiratoryRate = applyJitter(state.respiratoryRate + 0.4, 12, 24, 0.2);
    }

    // Simulate Temperature Drift during crisis
    if (state.activeTrack === 'PILOT') {
      state.temperature = applyJitter(state.temperature + 0.08, 98.6, 102.5, 0.04);
    } else if (state.activeTrack === 'ASTRONAUT') {
      state.temperature = applyJitter(state.temperature - 0.06, 95.0, 98.6, 0.03);
    } else {
      state.temperature = applyJitter(state.temperature + 0.04, 98.6, 100.5, 0.02);
    }

    // Simulate Pressure Drift during crisis
    if (state.activeTrack === 'PILOT') {
      const altitude = state.environmentMetric;
      state.pressure = 14.696 * Math.pow(1 - 0.00000687558 * altitude, 5.25588);
    } else if (state.activeTrack === 'ASTRONAUT') {
      state.suitPressure = applyJitter(state.suitPressure - 0.06, 2.8, 4.3, 0.01);
      state.pressure = state.suitPressure;
    } else {
      state.pressure = applyJitter(state.pressure - 0.03, 12.0, 14.7, 0.01);
    }

    // Simulate Subsystem Degradation during crisis
    if (state.activeTrack === 'PILOT') {
      if (Math.random() < 0.25) state.subsystems.atmosMonitor = 'CRITICAL';
      if (Math.random() < 0.20) state.subsystems.cognitiveProc = 'CRITICAL';
      if (Math.random() < 0.15) state.subsystems.telemetryRelay = 'LATENT';
    } else if (state.activeTrack === 'ASTRONAUT') {
      if (Math.random() < 0.25) state.subsystems.atmosMonitor = 'CRITICAL';
      if (Math.random() < 0.20) state.subsystems.biometricSensors = 'DEGRADED';
      if (Math.random() < 0.15) state.subsystems.telemetryRelay = 'LATENT';
    } else if (state.activeTrack === 'TRAIN_PILOT') {
      if (Math.random() < 0.25) state.subsystems.neuralInterface = 'DEGRADED';
      if (Math.random() < 0.20) state.subsystems.telemetryRelay = 'OFFLINE';
      if (Math.random() < 0.15) state.subsystems.cognitiveProc = 'CRITICAL';
    } else if (state.activeTrack === 'SURGEON') {
      if (Math.random() < 0.25) state.subsystems.biometricSensors = 'DEGRADED';
      if (Math.random() < 0.20) state.subsystems.neuralInterface = 'CRITICAL';
      if (Math.random() < 0.15) state.subsystems.telemetryRelay = 'LATENT';
    } else if (state.activeTrack === 'TRUCKER') {
      if (Math.random() < 0.25) state.subsystems.telemetryRelay = 'LATENT';
      if (Math.random() < 0.20) state.subsystems.cognitiveProc = 'CRITICAL';
      if (Math.random() < 0.15) state.subsystems.biometricSensors = 'DEGRADED';
    }

    // Dynamic warning logs added to streamed records
    if (state.spO2 < 83 && Math.random() < 0.35) {
      addLog('ALERT', `[HYPOXIA] SpO2 below 83% threshold: ${state.spO2.toFixed(2)}%`);
    }
    if (state.heartRate > 120 && Math.random() < 0.35) {
      addLog('ALERT', `[CARDIAC] Tachycardia event: ${Math.round(state.heartRate)} bpm`);
    }
  } else {
    // Safe Mode: Homeostasis Jitter & System Recovery
    state.heartRate = applyJitter(state.heartRate, 72, 78, 1.5);
    state.spO2 = applyJitter(state.spO2, 97.8, 98.8, 0.2);
    state.glucose = applyJitter(state.glucose, 95, 114, 1.5);
    state.respiratoryRate = applyJitter(state.respiratoryRate, 14, 16, 0.4);
    state.cognitiveLatency = applyJitter(state.cognitiveLatency, 190, 230, 5);
    state.temperature = applyJitter(state.temperature, 98.5, 98.7, 0.02);

    if (state.activeTrack === 'ASTRONAUT') {
      state.suitPressure = applyJitter(state.suitPressure, 4.28, 4.32, 0.005);
      state.pressure = state.suitPressure;
    } else if (state.activeTrack === 'PILOT') {
      const altitude = state.environmentMetric;
      state.pressure = 14.696 * Math.pow(1 - 0.00000687558 * altitude, 5.25588);
    } else {
      state.pressure = applyJitter(state.pressure, 14.65, 14.75, 0.01);
    }

    // Recover systems to ONLINE
    for (const key of Object.keys(state.subsystems)) {
      if (state.subsystems[key] !== 'ONLINE') {
        state.subsystems[key] = 'ONLINE';
      }
    }
    
    // Jitter environment metric slightly based on track
    if (state.activeTrack === 'ASTRONAUT') state.environmentMetric = applyJitter(state.environmentMetric, 4.25, 4.35, 0.02);
    if (state.activeTrack === 'PILOT') state.environmentMetric = applyJitter(state.environmentMetric, 7900, 8100, 20);
    if (state.activeTrack === 'SURGEON') state.environmentMetric = applyJitter(state.environmentMetric, 0.018, 0.022, 0.001);
    if (state.activeTrack === 'TRAIN_PILOT') state.environmentMetric = applyJitter(state.environmentMetric, 205, 215, 2);
    if (state.activeTrack === 'TRUCKER') state.environmentMetric = applyJitter(state.environmentMetric, 94, 96, 0.5);
  }

  // 1. Train Pilot Profile Simulation
  if (state.activeTrack === 'TRAIN_PILOT') {
    if (state.isCrisisActive) {
      state.perclos = applyJitter(state.perclos + 1.8, 0, 35.0, 0.3);
      state.microCorrections = applyJitter(state.microCorrections - 3.5, 5, 50, 1.0);
    } else {
      state.perclos = applyJitter(state.perclos, 2.0, 6.0, 0.4);
      state.microCorrections = applyJitter(state.microCorrections, 38, 48, 1.5);
    }
    state.fatigueIndex = (state.perclos * 0.7) + ((state.cognitiveLatency / 20) * 0.3);
  }

  // 2. Commercial Aviator / Fighter Pilot Simulation
  if (state.activeTrack === 'PILOT') {
    if (state.isCrisisActive) {
      state.gForce = applyJitter(state.gForce + 0.9, 1.0, 9.0, 0.2);
      state.pwtt = applyJitter(state.pwtt + 15.0, 220, 420, 2.0);
      state.spO2Desat = applyJitter(state.spO2Desat + 1.2, 0.1, 20.0, 0.5);
    } else {
      state.gForce = applyJitter(state.gForce, 0.95, 1.4, 0.05);
      state.pwtt = applyJitter(state.pwtt, 215, 235, 3.0);
      state.spO2Desat = applyJitter(state.spO2Desat, 0.05, 0.2, 0.02);
    }
  }

  // 3. Astronaut Simulation
  if (state.activeTrack === 'ASTRONAUT') {
    if (state.isCrisisActive) {
      state.transthoracicImpedance = applyJitter(state.transthoracicImpedance - 4.5, 30.0, 100.0, 1.0);
      state.pCO2 = applyJitter(state.pCO2 + 0.8, 2.0, 12.0, 0.15);
      state.suitPressure = applyJitter(state.suitPressure - 0.12, 2.8, 4.5, 0.02);
      state.scrubberFlow = applyJitter(state.scrubberFlow - 0.4, 1.0, 6.5, 0.1);
      state.environmentMetric = state.suitPressure;
    } else {
      state.transthoracicImpedance = applyJitter(state.transthoracicImpedance, 95.0, 99.5, 0.5);
      state.pCO2 = applyJitter(state.pCO2, 2.2, 2.8, 0.08);
      state.suitPressure = applyJitter(state.suitPressure, 4.25, 4.35, 0.01);
      state.scrubberFlow = applyJitter(state.scrubberFlow, 5.8, 6.2, 0.05);
      state.environmentMetric = state.suitPressure;
    }
  }

  // 4. Surgeon Simulation
  if (state.activeTrack === 'SURGEON') {
    if (state.isCrisisActive) {
      state.tremorAmplitude = applyJitter(state.tremorAmplitude + 0.018, 0.01, 0.25, 0.005);
      state.eda = applyJitter(state.eda + 0.6, 1.0, 10.0, 0.1);
      state.gripForce = applyJitter(state.gripForce - 0.9, 1.0, 15.0, 0.3);
      state.tremorFreq = applyJitter(state.tremorFreq + 0.6, 2.0, 9.5, 0.25);
      state.environmentMetric = state.tremorAmplitude;
    } else {
      state.tremorAmplitude = applyJitter(state.tremorAmplitude, 0.015, 0.025, 0.001);
      state.eda = applyJitter(state.eda, 1.5, 2.1, 0.05);
      state.gripForce = applyJitter(state.gripForce, 11.0, 13.0, 0.2);
      state.tremorFreq = applyJitter(state.tremorFreq, 1.8, 2.4, 0.1);
      state.environmentMetric = state.tremorAmplitude;
    }
  }

  // 5. Trucker Simulation
  if (state.activeTrack === 'TRUCKER') {
    if (state.isCrisisActive) {
      state.hrvRatio = applyJitter(state.hrvRatio - 0.28, 0.4, 4.0, 0.05);
      state.gripAsymmetry = applyJitter(state.gripAsymmetry + 4.2, 1.0, 60.0, 0.5);
      state.v2vLink = applyJitter(state.v2vLink - 2.0, -90, -50, 1.0);
      state.alertness = applyJitter(state.alertness - 6.0, 20.0, 100.0, 1.0);
      state.environmentMetric = state.alertness;
    } else {
      state.hrvRatio = applyJitter(state.hrvRatio, 2.9, 3.5, 0.08);
      state.gripAsymmetry = applyJitter(state.gripAsymmetry, 1.5, 3.5, 0.2);
      state.v2vLink = applyJitter(state.v2vLink, -64, -60, 0.5);
      state.alertness = applyJitter(state.alertness, 94.0, 98.0, 0.5);
      state.environmentMetric = state.alertness;
    }
  }

  const baseEnvVal = state.activeTrack === 'ASTRONAUT' ? 4.3 :
                     state.activeTrack === 'PILOT' ? 8000 :
                     state.activeTrack === 'SURGEON' ? 0.02 :
                     state.activeTrack === 'TRAIN_PILOT' ? 210 : 95;
                     
  const pct = (val, min, max) => {
    if (max === min) return 0;
    return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  };
  
  const healthScore = Math.round(
    (pct(state.spO2, 88, 100) * 0.35) +
    (100 - pct(state.heartRate, 52, 140)) * 0.30 +
    (100 - pct(state.environmentMetric, 0, baseEnvVal * 2)) * 0.20 +
    (100 - pct(state.cognitiveLatency, 0, 620)) * 0.15
  );

  const warningTriggers = [];
  if (state.spO2 < 93) {
    warningTriggers.push({
      type: 'RESPIRATORY',
      status: state.spO2 < 83 ? 'CRITICAL' : 'WARNING',
      message: `Blood oxygen desaturated: ${state.spO2.toFixed(1)}%`
    });
  }
  if (state.heartRate > 110 || state.heartRate < 52) {
    warningTriggers.push({
      type: 'CARDIAC',
      status: (state.heartRate > 120 || state.heartRate < 50) ? 'CRITICAL' : 'WARNING',
      message: `Heart rate abnormal: ${Math.round(state.heartRate)} bpm`
    });
  }
  if (state.temperature > 99.5) {
    warningTriggers.push({
      type: 'TEMPERATURE',
      status: state.temperature > 101.0 ? 'CRITICAL' : 'WARNING',
      message: `Body temp elevated: ${state.temperature.toFixed(1)}°F`
    });
  }
  const isPressureCritical = state.activeTrack === 'ASTRONAUT' ? (state.pressure < 3.8) : (state.pressure < 11.0);
  const isPressureWarning = state.activeTrack === 'ASTRONAUT' ? (state.pressure < 4.0) : (state.pressure < 12.0);
  if (isPressureCritical || isPressureWarning) {
    warningTriggers.push({
      type: 'PRESSURE',
      status: isPressureCritical ? 'CRITICAL' : 'WARNING',
      message: `${state.activeTrack === 'ASTRONAUT' ? 'Suit' : 'Cabin'} pressure anomaly: ${state.pressure.toFixed(2)} psi`
    });
  }

  // Build Payload with true trackData nesting and simulated properties
  const payload = {
    timestamp: Date.now(),
    heartRate: state.heartRate,
    spO2: state.spO2,
    glucose: state.glucose,
    respiratoryRate: state.respiratoryRate,
    cognitiveLatency: state.cognitiveLatency,
    environmentMetric: state.environmentMetric,
    isCrisisActive: state.isCrisisActive,
    activeTrack: state.activeTrack,
    healthScore,
    warningTriggers,

    // Dynamic simulated metrics
    temperature: state.temperature,
    pressure: state.pressure,

    // Subsystem status
    subsystems: state.subsystems,
    logs: localLogs,

    // True track-specific nested payload structure
    trackData: {
      ASTRONAUT: state.activeTrack === 'ASTRONAUT' ? {
        transthoracicImpedance: state.transthoracicImpedance,
        pCO2: state.pCO2,
        suitPressure: state.suitPressure,
        scrubberFlow: state.scrubberFlow,
      } : undefined,
      PILOT: state.activeTrack === 'PILOT' ? {
        spO2: state.spO2,
        gForce: state.gForce,
        pwtt: state.pwtt,
        spO2Desat: state.spO2Desat,
      } : undefined,
      SURGEON: state.activeTrack === 'SURGEON' ? {
        tremorAmplitude: state.tremorAmplitude,
        eda: state.eda,
        gripForce: state.gripForce,
        tremorFreq: state.tremorFreq,
      } : undefined,
      TRAIN_PILOT: state.activeTrack === 'TRAIN_PILOT' ? {
        perclos: state.perclos,
        microCorrections: state.microCorrections,
        fatigueIndex: state.fatigueIndex,
      } : undefined,
      TRUCKER: state.activeTrack === 'TRUCKER' ? {
        hrvRatio: state.hrvRatio,
        gripAsymmetry: state.gripAsymmetry,
        v2vLink: state.v2vLink,
        alertness: state.alertness,
      } : undefined,
    },

    // Demo state
    isDemoActive: state.isDemoActive,
    demoTime: state.demoTime,
  };

  const payloadStr = JSON.stringify(payload);

  // Broadcast to all dashboard clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.isDashboard) { // WebSocket.OPEN and is dashboard
      client.send(payloadStr);
    }
  });
}, 1000);

function initiateCrisis() {
  console.log(`[WS] Crisis initiated for track: ${state.activeTrack}`);
  state.isCrisisActive = true;
  addLog('ALERT', `AUTOMATED OVERRIDE TRIGGERED: CRISIS STATE DETECTED.`);
  
  const overrideMsg = state.activeTrack === 'ASTRONAUT' ? "AUTOMATED OVERRIDE: INITIATING EMERGENCY SUIT RE-PRESSURIZATION" :
                      state.activeTrack === 'PILOT' ? "AUTOMATED PILOT OVERRIDE: INITIATING EMERGENCY FLIGHT DESCENT RADIAN" :
                      state.activeTrack === 'SURGEON' ? "AUTOMATED OVERRIDE: ENGAGING ROBOTIC STABILIZATION DAMPERS" :
                      state.activeTrack === 'TRAIN_PILOT' ? "AUTOMATED OVERRIDE: ENGAGING EMERGENCY PNEUMATIC BRAKES" :
                      "FLEET PLATOON WARNING: EXECUTING DISTRIBUTED V2V SHOULDER PULL-OVER";
  addLog('ALERT', overrideMsg);

  const crisisSequences = {
    TRAIN_PILOT: [
      "[PERCLOS] Micro-sleep state detected.",
      "[BRAKES] Stage 1 pneumatic clamp engaged.",
      "[OVERRIDE] Manual controls bypassed."
    ],
    PILOT: [
      "[HYPOXIA] SpO2 below 83% threshold.",
      "[AUTO-GCAS] Control stick locked.",
      "[CLIMB] Wings-level pull-up initiated."
    ],
    ASTRONAUT: [
      "[SCRUBBER] pCO2 spike detected.",
      "[O2] Auxiliary valve fired.",
      "[THRUSTER] Return-to-airlock trajectory calculated."
    ],
    SURGEON: [
      "[TREMOR] 8Hz FFT amplitude critical.",
      "[STABILIZER] Micro-filter engaged.",
      "[HOLD] Digital scalpel locked in 3D space."
    ],
    TRUCKER: [
      "[HRV] Parasympathetic override detected.",
      "[V2V] Platoon gap expansion broadcast.",
      "[NAV] Shoulder pull-over sequence initiated."
    ]
  };

  const seq = crisisSequences[state.activeTrack] || [];
  seq.forEach((msg, i) => {
    setTimeout(() => {
      addLog('ALERT', msg);
    }, (i + 1) * 500);
  });
}

function resolveCrisis() {
  console.log(`[WS] Stabilization Protocol Engaged for track: ${state.activeTrack}`);
  state.isCrisisActive = false;
  // Apply massive recovery buffers to naturally pull them back to homeostasis over 10 seconds
  recoveryBuffers.heartRate = (75 - state.heartRate) * 1.5;
  recoveryBuffers.spO2 = (98.2 - state.spO2) * 1.5;
  recoveryBuffers.glucose = (100 - state.glucose) * 1.5;
  recoveryBuffers.respiratoryRate = (16 - state.respiratoryRate) * 1.5;
  recoveryBuffers.cognitiveLatency = (210 - state.cognitiveLatency) * 1.5;
  recoveryBuffers.pCO2 = (2.5 - state.pCO2) * 1.5;
  recoveryBuffers.suitPressure = (4.3 - state.suitPressure) * 1.5;
  recoveryBuffers.tremorAmplitude = (0.02 - state.tremorAmplitude) * 1.5;
  recoveryBuffers.eda = (1.8 - state.eda) * 1.5;
  recoveryBuffers.alertness = (96.0 - state.alertness) * 1.5;
  recoveryBuffers.perclos = (3.5 - state.perclos) * 1.5;
  recoveryBuffers.gForce = (1.0 - state.gForce) * 1.5;
  addLog('OK', `STABILIZATION PROTOCOL ENGAGED. Normalizing vitals.`);
}

// Keepalive ping to prevent Cloud Run from closing idle WebSocket connections
const keepAliveInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.ping();
    }
  });
}, 25000); // Every 25 seconds

wss.on('connection', (ws, req) => {
  const reqUrl = req.url || '/';
  const urlObj = new URL(reqUrl, 'http://localhost');
  const pathname = urlObj.pathname.replace(/\/$/, '').toLowerCase();
  const queryMode = urlObj.searchParams.get('mode') || urlObj.searchParams.get('simulation');
  
  // Detect simulation mode (cardiac, respiratory, neurological, or diabetes) from route token or query param
  const simulationMode = (pathname === '/cardiac' || pathname === '/respiratory' || pathname === '/neurological' || pathname === '/diabetes') 
    ? pathname.slice(1) 
    : (['cardiac', 'respiratory', 'neurological', 'diabetes'].includes(queryMode) ? queryMode : null);

  if (simulationMode) {
    console.log(`[WS] Client connected for high-fidelity simulation: ${simulationMode}`);
    ws.isDashboard = false;
    ws.simulationMode = simulationMode;

    // Auto-sync active track on server to match simulation mode
    const simulationToTrackMap = {
      cardiac: 'PILOT',
      respiratory: 'ASTRONAUT',
      neurological: 'SURGEON',
      diabetes: 'TRAIN_PILOT'
    };
    const targetTrack = simulationToTrackMap[simulationMode];
    if (targetTrack && state.activeTrack !== targetTrack) {
      console.log(`[WS] Auto-switching server activeTrack to ${targetTrack} for simulation: ${simulationMode}`);
      resetStateToTrack(targetTrack);
    }

    let phase = 0;
    let lastTime = Date.now();

    // High-fidelity simulation loop at 16ms (~60 updates/sec)
    const timer = setInterval(() => {
      if (ws.readyState !== 1) { // WebSocket.OPEN
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      let payload = null;

      if (simulationMode === 'cardiac') {
        const bpm = state.heartRate;
        const beatInterval = 60000 / bpm;
        phase = (phase + dt / beatInterval) % 1.0;

        const amplitude = getECGValue(phase) + (Math.random() - 0.5) * (state.isCrisisActive ? 0.1 : 0.03);
        const rPeakDetected = phase >= 0.145 && phase < 0.165;
        const glucose = state.glucose;
        const oxygenSaturation = state.spO2;
        const respiratoryRate = state.respiratoryRate;

        payload = {
          type: 'cardiac',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          amplitude: parseFloat(amplitude.toFixed(4)),
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1)),
          respiratoryRate: parseFloat(respiratoryRate.toFixed(1)),
          rPeakDetected,
          isCrisisActive: state.isCrisisActive
        };
      } else if (simulationMode === 'respiratory') {
        const respRate = state.respiratoryRate;
        const period = 60000 / respRate;
        phase = (phase + dt / period) % 1.0;

        const lungCapacity = 2.5 + Math.sin(phase * Math.PI * 2) * (state.isCrisisActive ? 0.8 : 1.2) + (Math.random() - 0.5) * 0.04;
        const oxygenSaturation = state.spO2;
        const glucose = state.glucose;
        const bpm = state.heartRate;

        payload = {
          type: 'respiratory',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          respiratoryRate: parseFloat(respRate.toFixed(1)),
          lungCapacity: parseFloat(lungCapacity.toFixed(4)),
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1)),
          isCrisisActive: state.isCrisisActive
        };
      } else if (simulationMode === 'neurological') {
        const seizureActive = state.isCrisisActive;
        const brainwaveFrequency = seizureActive 
          ? 58 + Math.sin(now / 3000) * 10 + (Math.random() - 0.5) * 6
          : 12 + Math.sin(now / 4000) * 2 + (Math.random() - 0.5) * 1.5;

        const eegArray = Array.from({ length: 8 }, () => {
          const base = Math.sin(now * 0.08) * 0.4 + Math.cos(now * 0.22) * 0.3;
          const noise = (Math.random() - 0.5) * (seizureActive ? 1.5 : 0.2);
          return parseFloat((base + noise).toFixed(4));
        });
        const glucose = state.glucose;
        const bpm = state.heartRate;
        const oxygenSaturation = state.spO2;
        const respiratoryRate = state.respiratoryRate;

        payload = {
          type: 'neurological',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          brainwaveFrequency: parseFloat(brainwaveFrequency.toFixed(1)),
          eegArray,
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1)),
          respiratoryRate: parseFloat(respiratoryRate.toFixed(1)),
          seizureActive,
          isCrisisActive: state.isCrisisActive
        };
      } else if (simulationMode === 'diabetes') {
        const glucose = state.glucose;
        const oxygenSaturation = state.spO2;
        const bpm = state.heartRate;
        const respiratoryRate = state.respiratoryRate;

        payload = {
          type: 'diabetes',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1)),
          respiratoryRate: parseFloat(respiratoryRate.toFixed(1)),
          isCrisisActive: state.isCrisisActive
        };
      }

      if (payload) {
        ws.send(JSON.stringify(payload));
      }
    }, 16);

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'INITIATE_CRISIS') {
          initiateCrisis();
        } else if (parsed.type === 'RESOLVE_CRISIS') {
          resolveCrisis();
        }
      } catch (err) {
        console.error('[WS] Failed to parse message on simulation socket:', err);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Client disconnected from high-fidelity simulation: ${simulationMode} - Code: ${code}, Reason: ${reason ? reason.toString() : 'None'}`);
      clearInterval(timer);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client error from high-fidelity simulation: ${simulationMode}:`, err);
    });

  } else {
    // Default dashboard client
    console.log('[WS] Client connected (Dashboard Mode)');
    ws.isDashboard = true;

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);

        if (parsed.type === 'sensor_pack') {
          ws.isDashboard = false;
          ws.isHardware = true;
          
          if (typeof parsed.heartRate === 'number' && parsed.heartRate > 0) {
            state.heartRate = parsed.heartRate;
          }
          if (typeof parsed.spO2 === 'number' && parsed.spO2 > 0) {
            state.spO2 = parsed.spO2;
          }
          if (state.activeTrack === 'PILOT') {
            if (typeof parsed.gForce === 'number') {
              state.gForce = parsed.gForce;
              state.environmentMetric = parsed.gForce;
            }
          }
          if (state.activeTrack === 'SURGEON') {
            if (typeof parsed.tremorAmplitude === 'number') {
              state.tremorAmplitude = parsed.tremorAmplitude;
              state.environmentMetric = parsed.tremorAmplitude;
            }
          }

          const now = Date.now();
          if (!state.lastHardwareLogTime || now - state.lastHardwareLogTime > 5000) {
            state.lastHardwareLogTime = now;
            addLog('SYS', `[HW] Biosensor Pack Online. Stream stabilized: HR=${Math.round(state.heartRate)} bpm, SpO2=${state.spO2}%`);
          }
          return;
        }
        
        if (parsed.type === 'INITIATE_CRISIS') {
          initiateCrisis();
        }
        
        if (parsed.type === 'SET_TRACK') {
          console.log(`[WS] Track changed to: ${parsed.track}`);
          if (TRACKS[parsed.track]) {
            resetStateToTrack(parsed.track);
            addLog('SYS', `[TRACK] Switched to ${parsed.track}. Recalibrating sensors.`);
          }
        }

        if (parsed.type === 'RESOLVE_CRISIS') {
          resolveCrisis();
        }

        if (parsed.type === 'START_DEMO') {
          console.log('[WS] Starting S.P.H.E.R.E. scenario demo on server...');
          state.isDemoActive = true;
          state.demoTime = 0;
          
          if (demoInterval) clearInterval(demoInterval);
          addLog('SYS', '--- STARTING S.P.H.E.R.E. SCENARIO DEMO (60s) ---');

          demoInterval = setInterval(() => {
            if (!state.isDemoActive) {
              clearInterval(demoInterval);
              demoInterval = null;
              return;
            }
            state.demoTime++;
            
            if (state.demoTime === 1) {
              addLog('INFO', '[DEMO] 0-10s: Nominal baseline established on track PILOT. All systems nominal.');
            } else if (state.demoTime === 10) {
              addLog('WARN', '[DEMO] 10-20s: Subtle anomaly drift detected. Rolling Z-Score alarms active.');
            } else if (state.demoTime === 20) {
              state.isCrisisActive = true;
              addLog('ALERT', '[DEMO] 20-30s: Emergency override thresholds breached. Alarm audio active.');
              
              const overrideMsg = "AUTOMATED PILOT OVERRIDE: INITIATING EMERGENCY FLIGHT DESCENT RADIAN";
              addLog('ALERT', overrideMsg);

              const seq = [
                "[HYPOXIA] SpO2 below 83% threshold.",
                "[AUTO-GCAS] Control stick locked.",
                "[CLIMB] Wings-level pull-up initiated."
              ];
              seq.forEach((msg, i) => {
                setTimeout(() => {
                  addLog('ALERT', msg);
                }, (i + 1) * 500);
              });
            } else if (state.demoTime === 30) {
              addLog('ALERT', '[DEMO] 30-40s: Autopilot auto-override active. Executing emergency descent.');
            } else if (state.demoTime === 40) {
              state.isCrisisActive = false;
              recoveryBuffers.heartRate = (75 - state.heartRate) * 1.5;
              recoveryBuffers.spO2 = (98.2 - state.spO2) * 1.5;
              recoveryBuffers.cognitiveLatency = (210 - state.cognitiveLatency) * 1.5;
              recoveryBuffers.temperature = (98.6 - state.temperature) * 1.5;
              recoveryBuffers.pressure = (14.7 - state.pressure) * 1.5;
              addLog('OK', '[DEMO] 40-50s: Override successful. Gradual recovery active, vitals normalizing.');
            } else if (state.demoTime === 50) {
              addLog('OK', '[DEMO] 50-60s: All systems nominal. Biometric safety margins restored.');
            } else if (state.demoTime >= 60) {
              state.isDemoActive = false;
              clearInterval(demoInterval);
              demoInterval = null;
              addLog('SYS', '--- S.P.H.E.R.E. SCENARIO DEMO COMPLETED ---');
            }
          }, 1000);
        }

        if (parsed.type === 'STOP_DEMO') {
          console.log('[WS] Stopping scenario demo.');
          state.isDemoActive = false;
          if (demoInterval) {
            clearInterval(demoInterval);
            demoInterval = null;
          }
          addLog('SYS', '[DEMO] Scenario script terminated.');
        }

        if (parsed.type === 'CLEAR_LOGS') {
          localLogs = [{ id: Date.now(), time: nowTime(), level: 'SYS', msg: 'Logs cleared.' }];
        }

        if (parsed.type === 'EXECUTE_SUBSYSTEM') {
          console.log(`[WS] Subsystem Command Executed: ${parsed.cmd}`);
          // Add to recovery buffers for gradual realistic effect
          recoveryBuffers.heartRate -= 5;
          
          let resolvedSys = '';
          switch (parsed.cmd) {
            // ASTRONAUT (Env: Suit Pressure)
            case 'Aero Payload': 
              recoveryBuffers.suitPressure += 0.5; 
              state.subsystems.atmosMonitor = 'ONLINE';
              resolvedSys = 'Atmos Monitor';
              break;
            case 'Orbit Calc': 
              recoveryBuffers.cognitiveLatency -= 25; 
              state.subsystems.cognitiveProc = 'ONLINE';
              resolvedSys = 'Cognitive Proc.';
              break;
            case 'Nav Systems': 
              recoveryBuffers.heartRate -= 15; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            case 'Thruster Align': 
              recoveryBuffers.pCO2 -= 2.0; 
              recoveryBuffers.suitPressure += 0.2; 
              state.subsystems.atmosMonitor = 'ONLINE';
              resolvedSys = 'Atmos Monitor';
              break;
            
            // PILOT (Env: Altitude/environmentMetric)
            case 'Flaps Config': 
              recoveryBuffers.gForce -= 1.5; 
              recoveryBuffers.environmentMetric -= 100; 
              state.subsystems.atmosMonitor = 'ONLINE';
              resolvedSys = 'Atmos Monitor';
              break;
            case 'Landing Gear': 
              recoveryBuffers.heartRate -= 20; 
              recoveryBuffers.environmentMetric -= 200; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            case 'Avionics': 
              recoveryBuffers.cognitiveLatency -= 30; 
              recoveryBuffers.environmentMetric -= 50; 
              state.subsystems.cognitiveProc = 'ONLINE';
              resolvedSys = 'Cognitive Proc.';
              break;
            case 'Radio Comms': 
              recoveryBuffers.spO2 += 4.0; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            
            // SURGEON (Env: Hand Tremor Index / tremorAmplitude)
            case 'Scalpel Sync': 
              recoveryBuffers.tremorAmplitude -= 0.1; 
              state.subsystems.neuralInterface = 'ONLINE';
              resolvedSys = 'Neural Interface';
              break;
            case 'Scope Zoom': 
              recoveryBuffers.eda -= 2.0; 
              recoveryBuffers.tremorAmplitude -= 0.05; 
              state.subsystems.biometricSensors = 'ONLINE';
              resolvedSys = 'Biometric Sensors';
              break;
            case 'Hemostat': 
              recoveryBuffers.heartRate -= 15; 
              recoveryBuffers.tremorAmplitude -= 0.03; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            case 'Suture Bot': 
              recoveryBuffers.gripForce += 5.0; 
              recoveryBuffers.tremorAmplitude -= 0.08; 
              state.subsystems.neuralInterface = 'ONLINE';
              resolvedSys = 'Neural Interface';
              break;
            
            // TRAIN_PILOT (Env: Cognitive Latency)
            case 'Brake Override': 
              recoveryBuffers.perclos -= 10.0; 
              recoveryBuffers.cognitiveLatency -= 15; 
              state.subsystems.neuralInterface = 'ONLINE';
              resolvedSys = 'Neural Interface';
              break;
            case 'Track Switch': 
              recoveryBuffers.heartRate -= 12; 
              recoveryBuffers.cognitiveLatency -= 10; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            case 'Horn Signal': 
              recoveryBuffers.cognitiveLatency -= 30; 
              state.subsystems.cognitiveProc = 'ONLINE';
              resolvedSys = 'Cognitive Proc.';
              break;
            case 'Door Control': 
              recoveryBuffers.microCorrections += 10; 
              recoveryBuffers.cognitiveLatency -= 15; 
              state.subsystems.biometricSensors = 'ONLINE';
              resolvedSys = 'Biometric Sensors';
              break;
            
            // TRUCKER (Env: Alertness)
            case 'Engine Brake': 
              recoveryBuffers.gripAsymmetry -= 20.0; 
              recoveryBuffers.alertness += 5; 
              state.subsystems.atmosMonitor = 'ONLINE';
              resolvedSys = 'Atmos Monitor';
              break;
            case 'Trailer Hitch': 
              recoveryBuffers.heartRate -= 10; 
              recoveryBuffers.alertness += 10; 
              state.subsystems.telemetryRelay = 'ONLINE';
              resolvedSys = 'Telemetry Relay';
              break;
            case 'CB Radio': 
              recoveryBuffers.alertness += 30; 
              state.subsystems.cognitiveProc = 'ONLINE';
              resolvedSys = 'Cognitive Proc.';
              break;
            case 'Wiper Fluid': 
              recoveryBuffers.v2vLink += 15; 
              recoveryBuffers.alertness += 15; 
              state.subsystems.biometricSensors = 'ONLINE';
              resolvedSys = 'Biometric Sensors';
              break;
          }

          if (resolvedSys) {
            addLog('OK', `[CMD] Resolved ${resolvedSys} instability. Bypassing interlocks.`);
          }
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Client disconnected (Dashboard Mode) - Code: ${code}, Reason: ${reason ? reason.toString() : 'None'}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error (Dashboard Mode):', err);
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', track: state.activeTrack, crisis: state.isCrisisActive });
});

// Manual WebSocket upgrade handler — ensures WS connections work
// alongside Next.js request handling on the same HTTP server
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

const PORT = process.env.NEXT_PUBLIC_WS_PORT || process.env.PORT || 8080;

if (nextApp && handle) {
  // Production / unified mode: prepare Next.js then start
  nextApp.prepare().then(() => {
    app.use((req, res) => handle(req, res));
    server.listen(PORT, () => {
      console.log(`[S.P.H.E.R.E. Engine] Unified server (Next.js + WebSocket) running on port ${PORT}`);
    });
  });
} else {
  // Development: standalone WebSocket server only
  server.listen(PORT, () => {
    console.log(`[S.P.H.E.R.E. Engine] WebSocket server running on port ${PORT}`);
  });
}
