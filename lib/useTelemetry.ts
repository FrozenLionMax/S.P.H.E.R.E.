'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getStreamUrl, sendCommand } from '@/lib/api';

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

// API utilities (getBaseUrl, getSessionId, getStreamUrl, getCommandUrl, sendCommand)
// are imported from @/lib/api

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
      // Connecting to SSE stream
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        // SSE stream connected
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
