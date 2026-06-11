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
const wss = new WebSocketServer({ server });

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
  cognitiveLatency: 210,
  environmentMetric: TRACKS.PILOT.envBase,
  isCrisisActive: false,
  activeTrack: 'PILOT',

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
  v2vLink: 0
};

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
  state.cognitiveLatency = 210;
  state.environmentMetric = TRACKS[trackName] ? TRACKS[trackName].envBase : 0;

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
  } else {
    // Safe Mode: Homeostasis Jitter
    state.heartRate = applyJitter(state.heartRate, 72, 78, 1.5);
    state.spO2 = applyJitter(state.spO2, 97.8, 98.8, 0.2);
    state.cognitiveLatency = applyJitter(state.cognitiveLatency, 190, 230, 5);
    
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

  // Build Payload
  const payload = {
    timestamp: Date.now(),
    heartRate: state.heartRate,
    spO2: state.spO2,
    cognitiveLatency: state.cognitiveLatency,
    environmentMetric: state.environmentMetric,
    isCrisisActive: state.isCrisisActive,
    activeTrack: state.activeTrack,

    // Specialized metrics
    perclos: state.perclos,
    microCorrections: state.microCorrections,
    fatigueIndex: state.fatigueIndex,

    gForce: state.gForce,
    pwtt: state.pwtt,
    spO2Desat: state.spO2Desat,

    transthoracicImpedance: state.transthoracicImpedance,
    pCO2: state.pCO2,
    suitPressure: state.suitPressure,
    scrubberFlow: state.scrubberFlow,

    tremorAmplitude: state.tremorAmplitude,
    eda: state.eda,
    gripForce: state.gripForce,
    tremorFreq: state.tremorFreq,

    hrvRatio: state.hrvRatio,
    gripAsymmetry: state.gripAsymmetry,
    v2vLink: state.v2vLink,
    alertness: state.alertness
  };

  const payloadStr = JSON.stringify(payload);

  // Broadcast to all dashboard clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.isDashboard) { // WebSocket.OPEN and is dashboard
      client.send(payloadStr);
    }
  });
}, 1000);

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
        // Average 75 BPM with organic heart-rate fluctuations
        const bpm = 75 + Math.sin(now / 5000) * 2 + (Math.random() - 0.5) * 1.2;
        const beatInterval = 60000 / bpm;
        phase = (phase + dt / beatInterval) % 1.0;

        const amplitude = getECGValue(phase) + (Math.random() - 0.5) * 0.03;
        // Check if current phase is within the R-peak spike window
        const rPeakDetected = phase >= 0.145 && phase < 0.165;
        const glucose = 110 + Math.sin(now / 15000) * 5 + (Math.random() - 0.5) * 2;

        payload = {
          type: 'cardiac',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          amplitude: parseFloat(amplitude.toFixed(4)),
          oxygenSaturation: 98.4,
          glucose: parseFloat(glucose.toFixed(1)),
          rPeakDetected
        };
      } else if (simulationMode === 'respiratory') {
        // Respiratory rate fluctuating around 14
        const respRate = 14 + Math.sin(now / 8000) * 0.8;
        const period = 60000 / respRate;
        phase = (phase + dt / period) % 1.0;

        // Oscillating lung capacity (sinusoidal)
        const lungCapacity = 2.5 + Math.sin(phase * Math.PI * 2) * 1.2 + (Math.random() - 0.5) * 0.04;
        const oxygenSaturation = 92.5 + Math.sin(now / 12000) * 0.6 + (Math.random() - 0.5) * 0.1;
        const glucose = 280 + Math.sin(now / 10000) * 6 + (Math.random() - 0.5) * 3;

        payload = {
          type: 'respiratory',
          timestamp: now,
          bpm: 82.0,
          respiratoryRate: parseFloat(respRate.toFixed(1)),
          lungCapacity: parseFloat(lungCapacity.toFixed(4)),
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1))
        };
      } else if (simulationMode === 'neurological') {
        const seizureActive = true;
        // Fast alpha/beta variations or seizure frequency (58Hz+)
        const brainwaveFrequency = seizureActive 
          ? 58 + Math.sin(now / 3000) * 10 + (Math.random() - 0.5) * 6
          : 12 + Math.sin(now / 4000) * 2 + (Math.random() - 0.5) * 1.5;

        // Array of high-frequency brain noise samples
        const eegArray = Array.from({ length: 8 }, () => {
          const base = Math.sin(now * 0.08) * 0.4 + Math.cos(now * 0.22) * 0.3;
          const noise = (Math.random() - 0.5) * (seizureActive ? 1.5 : 0.2);
          return parseFloat((base + noise).toFixed(4));
        });
        const glucose = 115 + Math.sin(now / 12000) * 5 + (Math.random() - 0.5) * 2;

        payload = {
          type: 'neurological',
          timestamp: now,
          bpm: 110.0,
          brainwaveFrequency: parseFloat(brainwaveFrequency.toFixed(1)),
          eegArray,
          oxygenSaturation: 92.2,
          glucose: parseFloat(glucose.toFixed(1)),
          seizureActive
        };
      } else if (simulationMode === 'diabetes') {
        // Fluctuating high glucose value matching a diabetic spike
        const glucose = 260 + Math.sin(now / 5000) * 15 + (Math.random() - 0.5) * 4;
        const oxygenSaturation = 92.5 + Math.sin(now / 10000) * 0.5 + (Math.random() - 0.5) * 0.1;
        const bpm = 88 + Math.sin(now / 6000) * 3 + (Math.random() - 0.5) * 1.0;

        payload = {
          type: 'diabetes',
          timestamp: now,
          bpm: parseFloat(bpm.toFixed(1)),
          oxygenSaturation: parseFloat(oxygenSaturation.toFixed(2)),
          glucose: parseFloat(glucose.toFixed(1))
        };
      }

      if (payload) {
        ws.send(JSON.stringify(payload));
      }
    }, 16);

    ws.on('close', () => {
      console.log(`[WS] Client disconnected from high-fidelity simulation: ${simulationMode}`);
      clearInterval(timer);
    });

  } else {
    // Default dashboard client
    console.log('[WS] Client connected (Dashboard Mode)');
    ws.isDashboard = true;

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        
        if (parsed.type === 'INITIATE_CRISIS') {
          console.log(`[WS] Crisis initiated for track: ${state.activeTrack}`);
          state.isCrisisActive = true;
        }
        
        if (parsed.type === 'SET_TRACK') {
          console.log(`[WS] Track changed to: ${parsed.track}`);
          if (TRACKS[parsed.track]) {
            resetStateToTrack(parsed.track);
          }
        }

        if (parsed.type === 'RESOLVE_CRISIS') {
          console.log(`[WS] Stabilization Protocol Engaged for track: ${state.activeTrack}`);
          state.isCrisisActive = false;
          // Apply massive recovery buffers to naturally pull them back to homeostasis over 10 seconds
          recoveryBuffers.heartRate = (75 - state.heartRate) * 1.5;
          recoveryBuffers.spO2 = (98.2 - state.spO2) * 1.5;
          recoveryBuffers.cognitiveLatency = (210 - state.cognitiveLatency) * 1.5;
          recoveryBuffers.pCO2 = (2.5 - state.pCO2) * 1.5;
          recoveryBuffers.suitPressure = (4.3 - state.suitPressure) * 1.5;
          recoveryBuffers.tremorAmplitude = (0.02 - state.tremorAmplitude) * 1.5;
          recoveryBuffers.eda = (1.8 - state.eda) * 1.5;
          recoveryBuffers.alertness = (96.0 - state.alertness) * 1.5;
          recoveryBuffers.perclos = (3.5 - state.perclos) * 1.5;
          recoveryBuffers.gForce = (1.0 - state.gForce) * 1.5;
        }

        if (parsed.type === 'EXECUTE_SUBSYSTEM') {
          console.log(`[WS] Subsystem Command Executed: ${parsed.cmd}`);
          // Add to recovery buffers for gradual realistic effect
          // Universal stress relief: Every action slightly improves heart rate
          recoveryBuffers.heartRate -= 5;
          
          switch (parsed.cmd) {
            // ASTRONAUT (Env: Suit Pressure)
            case 'Aero Payload': recoveryBuffers.suitPressure += 0.5; break;
            case 'Orbit Calc': recoveryBuffers.cognitiveLatency -= 25; break;
            case 'Nav Systems': recoveryBuffers.heartRate -= 15; break; // Extra HR drop
            case 'Thruster Align': recoveryBuffers.pCO2 -= 2.0; recoveryBuffers.suitPressure += 0.2; break;
            
            // PILOT (Env: Altitude/environmentMetric)
            case 'Flaps Config': recoveryBuffers.gForce -= 1.5; recoveryBuffers.environmentMetric -= 100; break;
            case 'Landing Gear': recoveryBuffers.heartRate -= 20; recoveryBuffers.environmentMetric -= 200; break;
            case 'Avionics': recoveryBuffers.cognitiveLatency -= 30; recoveryBuffers.environmentMetric -= 50; break;
            case 'Radio Comms': recoveryBuffers.spO2 += 4.0; break;
            
            // SURGEON (Env: Hand Tremor Index / tremorAmplitude)
            case 'Scalpel Sync': recoveryBuffers.tremorAmplitude -= 0.1; break;
            case 'Scope Zoom': recoveryBuffers.eda -= 2.0; recoveryBuffers.tremorAmplitude -= 0.05; break;
            case 'Hemostat': recoveryBuffers.heartRate -= 15; recoveryBuffers.tremorAmplitude -= 0.03; break;
            case 'Suture Bot': recoveryBuffers.gripForce += 5.0; recoveryBuffers.tremorAmplitude -= 0.08; break;
            
            // TRAIN_PILOT (Env: Cognitive Latency)
            case 'Brake Override': recoveryBuffers.perclos -= 10.0; recoveryBuffers.cognitiveLatency -= 15; break;
            case 'Track Switch': recoveryBuffers.heartRate -= 12; recoveryBuffers.cognitiveLatency -= 10; break;
            case 'Horn Signal': recoveryBuffers.cognitiveLatency -= 30; break;
            case 'Door Control': recoveryBuffers.microCorrections += 10; recoveryBuffers.cognitiveLatency -= 15; break;
            
            // TRUCKER (Env: Alertness)
            case 'Engine Brake': recoveryBuffers.gripAsymmetry -= 20.0; recoveryBuffers.alertness += 5; break;
            case 'Trailer Hitch': recoveryBuffers.heartRate -= 10; recoveryBuffers.alertness += 10; break;
            case 'CB Radio': recoveryBuffers.alertness += 30; break;
            case 'Wiper Fluid': recoveryBuffers.v2vLink += 15; recoveryBuffers.alertness += 15; break;
          }
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected (Dashboard Mode)');
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', track: state.activeTrack, crisis: state.isCrisisActive });
});

const PORT = process.env.NEXT_PUBLIC_WS_PORT || process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[S.P.H.E.R.E. Engine] WebSocket server running on port ${PORT}`);
});
