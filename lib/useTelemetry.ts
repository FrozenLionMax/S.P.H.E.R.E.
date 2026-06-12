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
}

export function useTelemetry() {
  const [samples, setSamples] = useState<TelemetryPayload[]>([]);
  const [isCrisis, setIsCrisis] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const isPausedRef = useRef(false);

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      const newVal = !p;
      isPausedRef.current = newVal;
      return newVal;
    });
  }, []);

  useEffect(() => {
    // Instantiate persistent WebSocket connection
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const port = process.env.NEXT_PUBLIC_WS_PORT || '8080';
    const ws = new WebSocket(`ws://${host}:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Telemetry] WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (isPausedRef.current) return;
      try {
        const payload: TelemetryPayload = JSON.parse(event.data);
        
        setIsCrisis(payload.isCrisisActive);

        setSamples((prev) => {
          // Keep a rolling window of the last 30 data points
          const newSamples = [...prev, payload];
          if (newSamples.length > 30) {
            return newSamples.slice(newSamples.length - 30);
          }
          return newSamples;
        });
      } catch (err) {
        console.error('[Telemetry] Error parsing message', err);
      }
    };

    ws.onclose = () => {
      console.log('[Telemetry] WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const triggerCrisisMode = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'INITIATE_CRISIS' }));
    }
  }, []);

  const resolveCrisisMode = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESOLVE_CRISIS' }));
    }
  }, []);

  const setTrack = useCallback((track: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_TRACK', track }));
    }
    // Optimistically clear samples on track change to prevent visual glitches
    setSamples([]);
  }, []);

  const executeSubsystem = useCallback((cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'EXECUTE_SUBSYSTEM', cmd }));
    }
  }, []);

  const clearLogs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CLEAR_LOGS' }));
    }
  }, []);

  const startDemo = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'START_DEMO' }));
    }
  }, []);

  const stopDemo = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'STOP_DEMO' }));
    }
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
