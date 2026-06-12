'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface TelemetryPayload {
  timestamp: number;
  heartRate: number;
  spO2: number;
  cognitiveLatency: number;
  environmentMetric: number;
  isCrisisActive: boolean;
  activeTrack: string;
  
  // Server-simulated physical metrics
  temperature?: number;
  pressure?: number;
  glucose?: number;
  respiratoryRate?: number;

  // Server-simulated subsystem statuses
  subsystems?: {
    neuralInterface: 'ONLINE' | 'DEGRADED' | 'CRITICAL';
    biometricSensors: 'ONLINE' | 'DEGRADED' | 'CRITICAL';
    telemetryRelay: 'ONLINE' | 'OFFLINE' | 'LATENT';
    cognitiveProc: 'ONLINE' | 'CRITICAL';
    atmosMonitor: 'ONLINE' | 'CRITICAL';
  };

  // Server-provided logs
  logs?: Array<{
    id: number;
    time: string;
    level: 'INFO' | 'WARN' | 'ALERT' | 'OK' | 'SYS';
    msg: string;
  }>;

  // True nested track-specific payload structure
  trackData?: {
    ASTRONAUT?: {
      transthoracicImpedance: number;
      pCO2: number;
      suitPressure: number;
      scrubberFlow: number;
    };
    PILOT?: {
      spO2: number;
      gForce: number;
      pwtt: number;
      spO2Desat: number;
    };
    SURGEON?: {
      tremorAmplitude: number;
      eda: number;
      gripForce: number;
      tremorFreq: number;
    };
    TRAIN_PILOT?: {
      perclos: number;
      microCorrections: number;
      fatigueIndex: number;
    };
    TRUCKER?: {
      hrvRatio: number;
      gripAsymmetry: number;
      v2vLink: number;
      alertness: number;
    };
  };

  // Train Pilot metrics (flat parameters kept for backwards compatibility)
  perclos?: number;
  microCorrections?: number;
  fatigueIndex?: number;

  // Aviator / Fighter Pilot metrics
  gForce?: number;
  pwtt?: number;
  spO2Desat?: number;

  // Astronaut metrics
  transthoracicImpedance?: number;
  pCO2?: number;
  suitPressure?: number;
  scrubberFlow?: number;

  // Surgeon metrics
  tremorAmplitude?: number;
  eda?: number;
  gripForce?: number;
  tremorFreq?: number;

  // Trucker metrics
  hrvRatio?: number;
  gripAsymmetry?: number;
  v2vLink?: number;
  alertness?: number;

  // Demo simulation fields
  isDemoActive?: boolean;
  demoTime?: number;
  healthScore?: number;
  warningTriggers?: Array<{ type: string; status: string; message: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve the base API URL for SSE stream and command endpoints
// ─────────────────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    const port = process.env.NEXT_PUBLIC_WS_PORT || '8080';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session ID: unique per browser tab so each device runs independently
// ─────────────────────────────────────────────────────────────────────────────

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window !== 'undefined') {
    // Persist per-tab: survives refresh but not new tabs
    let id = sessionStorage.getItem('sphere_session_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('sphere_session_id', id);
    }
    _sessionId = id;
    return id;
  }
  return 'server';
}

function getStreamUrl(): string {
  return `${getBaseUrl()}/api/stream/dashboard?session=${getSessionId()}`;
}

function getCommandUrl(): string {
  return `${getBaseUrl()}/api/command`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send command to server via HTTP POST (replaces WebSocket send)
// ─────────────────────────────────────────────────────────────────────────────

async function sendCommand(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(getCommandUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, sessionId: getSessionId() }),
    });
  } catch (err) {
    console.error('[Telemetry] Failed to send command:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Hook: SSE-based Dashboard Telemetry (replaces WebSocket)
// ─────────────────────────────────────────────────────────────────────────────

export function useTelemetry() {
  const [samples, setSamples] = useState<TelemetryPayload[]>([]);
  const [isCrisis, setIsCrisis] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const isPausedRef = useRef(false);

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      const newVal = !p;
      isPausedRef.current = newVal;
      return newVal;
    });
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const url = getStreamUrl();
      console.log(`[Telemetry] Connecting to SSE stream: ${url}`);
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('[Telemetry] SSE stream connected');
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        if (isPausedRef.current) return;
        try {
          const payload: TelemetryPayload = JSON.parse(event.data);
          setIsCrisis(payload.isCrisisActive);
          setSamples((prev) => {
            const newSamples = [...prev, payload];
            if (newSamples.length > 30) {
              return newSamples.slice(newSamples.length - 30);
            }
            return newSamples;
          });
        } catch (err) {
          console.error('[Telemetry] Error parsing SSE message', err);
        }
      };

      eventSource.onerror = () => {
        // EventSource has native auto-reconnect built in.
        // It will automatically retry the connection after a brief delay.
        // We just update the UI status here.
        console.warn('[Telemetry] SSE connection error — browser will auto-reconnect');
        setConnected(false);
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  // ── Command Actions (HTTP POST instead of WebSocket send) ──

  const triggerCrisisMode = useCallback(() => {
    sendCommand({ type: 'INITIATE_CRISIS' });
  }, []);

  const resolveCrisisMode = useCallback(() => {
    sendCommand({ type: 'RESOLVE_CRISIS' });
  }, []);

  const setTrack = useCallback((track: string) => {
    sendCommand({ type: 'SET_TRACK', track });
    // Optimistically clear samples on track change to prevent visual glitches
    setSamples([]);
  }, []);

  const executeSubsystem = useCallback((cmd: string) => {
    sendCommand({ type: 'EXECUTE_SUBSYSTEM', cmd });
  }, []);

  const clearLogs = useCallback(() => {
    sendCommand({ type: 'CLEAR_LOGS' });
  }, []);

  const startDemo = useCallback(() => {
    sendCommand({ type: 'START_DEMO' });
  }, []);

  const stopDemo = useCallback(() => {
    sendCommand({ type: 'STOP_DEMO' });
  }, []);

  return {
    samples,
    isCrisis,
    connected,
    isPaused,
    togglePause,
    triggerCrisisMode,
    resolveCrisisMode,
    setTrack,
    executeSubsystem,
    clearLogs,
    startDemo,
    stopDemo
  };
}
