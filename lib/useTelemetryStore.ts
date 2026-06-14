'use client'

import { create } from 'zustand'
import { getSessionId, getCommandUrl, sendCommand } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces & Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetryDataFrame {
  bpm: number
  oxygenSaturation: number // SpO2 in %
  brainwaveFrequency: number // EEG speed index in Hz
  glucose: number // Blood glucose in mg/dL
  deviceStatus: 'nominal' | 'warning' | 'critical' | 'offline'
  respiratoryRate: number
  stressIndex: number
  isCrisisActive: boolean
  isDemoActive: boolean
  demoTime: number
}

export type ConditionType = 'general' | 'arrhythmia' | 'asthma' | 'epilepsy' | 'cardiac' | 'respiratory' | 'neurological' | 'diabetes'

export interface TelemetryStoreState {
  // --- Global States ---
  activeUserProfile: string
  currentCondition: ConditionType
  liveTelemetryFrame: TelemetryDataFrame
  websocketStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  reconnectAttempts: number
  selectedOrgan: 'none' | 'heart' | 'lungs' | 'brain' | 'liver' | 'custom'

  // --- UI Toggles ---
  isRotating: boolean
  wireframeMode: 'wireframe' | 'dots' | 'solid'

  // --- Actions ---
  connectToTelemetry: (streamUrl: string) => void
  disconnectFromTelemetry: () => void
  setActiveUserProfile: (profile: string) => void
  setCurrentCondition: (condition: ConditionType) => void
  setSelectedOrgan: (organ: 'none' | 'heart' | 'lungs' | 'brain' | 'liver' | 'custom') => void
  setIsRotating: (rotating: boolean | ((prev: boolean) => boolean)) => void
  setWireframeMode: (mode: 'wireframe' | 'dots' | 'solid') => void
  updateTelemetryFrame: (frame: Partial<TelemetryDataFrame>) => void
  customZoomTarget: { pos: number[], target: number[] } | null
  setCustomZoomTarget: (target: { pos: number[], target: number[] } | null) => void
  triggerCrisis: () => void
  resolveCrisis: () => void
  startDemo: () => void
  stopDemo: () => void
}

// API utilities (getSessionId, getCommandUrl, sendCommand) imported from @/lib/api

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Global Telemetry Zustand Store (SSE-based)
// ─────────────────────────────────────────────────────────────────────────────

let eventSourceInstance: EventSource | null = null

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => ({
  // --- Initial States ---
  activeUserProfile: 'PILOT',
  currentCondition: 'diabetes',
  liveTelemetryFrame: {
    bpm: 72,
    oxygenSaturation: 98,
    brainwaveFrequency: 12.5,
    glucose: 95,
    deviceStatus: 'nominal',
    respiratoryRate: 16,
    stressIndex: 45,
    isCrisisActive: false,
    isDemoActive: false,
    demoTime: 0
  },
  websocketStatus: 'idle',
  reconnectAttempts: 0,
  selectedOrgan: 'none',
  isRotating: true,
  wireframeMode: 'wireframe',
  customZoomTarget: null,

  // --- Setters ---
  setActiveUserProfile: (profile) => {
    const trackToConditionMap: Record<string, ConditionType> = {
      PILOT: 'arrhythmia',
      ASTRONAUT: 'asthma',
      SURGEON: 'epilepsy',
      TRAIN_PILOT: 'diabetes',
      TRUCKER: 'diabetes'
    };
    const condition = trackToConditionMap[profile] || 'diabetes';
    set({ activeUserProfile: profile, currentCondition: condition });
  },
  setCurrentCondition: (condition) => {
    set({ currentCondition: condition });
  },
  setSelectedOrgan: (organ) => set({ selectedOrgan: organ }),
  setIsRotating: (val) => set((s) => ({ isRotating: typeof val === 'function' ? val(s.isRotating) : val })),
  setWireframeMode: (mode) => set({ wireframeMode: mode }),
  setCustomZoomTarget: (target) => set({ customZoomTarget: target }),
  updateTelemetryFrame: (frame) => 
    set((state) => ({
      liveTelemetryFrame: {
        ...state.liveTelemetryFrame,
        ...frame
      }
    })),

  // --- Command Actions (HTTP POST instead of WebSocket send) ---
  triggerCrisis: () => {
    sendCommand({ type: 'INITIATE_CRISIS' })
  },
  resolveCrisis: () => {
    sendCommand({ type: 'RESOLVE_CRISIS' })
  },
  startDemo: () => {
    sendCommand({ type: 'START_DEMO' })
  },
  stopDemo: () => {
    sendCommand({ type: 'STOP_DEMO' })
  },

  // --- Connection Actions (SSE EventSource) ---
  connectToTelemetry: (streamUrl) => {
    // 1. Avoid duplicate connections
    if (eventSourceInstance && eventSourceInstance.readyState !== EventSource.CLOSED) {
      // SSE stream already active — skip
      return
    }

    // Clean up any existing instance
    if (eventSourceInstance) {
      // Clean up previous EventSource
      eventSourceInstance.close()
      eventSourceInstance = null
    }

    set({ websocketStatus: 'connecting' })
    // Append session ID so simulation streams share the same session as dashboard
    const separator = streamUrl.includes('?') ? '&' : '?'
    const fullUrl = `${streamUrl}${separator}session=${getSessionId()}`
    // Spawning SSE connection

    try {
      const es = new EventSource(fullUrl)
      eventSourceInstance = es

      es.onopen = () => {
        // Enforce active instance check to block race conditions
        if (eventSourceInstance !== es) {
          console.warn('[TelemetryStore] onopen event ignored from orphaned EventSource.')
          return
        }
        // Neural SSE stream established
        set({ 
          websocketStatus: 'connected', 
          reconnectAttempts: 0 
        })
      }

      es.onmessage = (event) => {
        // Enforce active instance check
        if (eventSourceInstance !== es) return

        try {
          const payload = JSON.parse(event.data)

          // Defensive parsing block: mapping streamed keys safely with default fallbacks
          const rawBpm = payload.heartRate ?? payload.bpm ?? 72
          const rawSpo2 = payload.spO2 ?? payload.oxygenSaturation ?? 98
          const rawEeg = payload.eegFreq ?? payload.brainwaveFrequency ?? 12
          const rawGlucose = payload.glucose ?? 120
          const rawStatus = payload.deviceStatus ?? (payload.crisis ? 'critical' : 'nominal')

          const rawResp = payload.respiratoryRate ?? (rawSpo2 < 90 ? 24 : rawBpm > 100 ? 20 : 16)
          const rawStress = payload.stressIndex ?? payload.stress ?? (rawBpm > 120 ? 85 : rawBpm > 100 ? 70 : rawSpo2 < 90 ? 75 : 45)
          const isCrisisActive = payload.isCrisisActive === true || payload.isCrisisActive === 'true' || payload.crisis === true || payload.crisis === 'true';

          // Boundaries clamp: prevent division by zero or NaN values from breaking WebGL coordinates
          const bpm = Math.max(20, Math.min(250, Number(rawBpm) || 72))
          const oxygenSaturation = Math.max(0, Math.min(100, Number(rawSpo2) || 98))
          const brainwaveFrequency = Math.max(0.1, Math.min(150, Number(rawEeg) || 12))
          const glucose = Math.max(10, Math.min(1000, Number(rawGlucose) || 120))
          const deviceStatus = ['nominal', 'warning', 'critical', 'offline'].includes(rawStatus)
            ? rawStatus as TelemetryDataFrame['deviceStatus']
            : 'nominal'
          const respiratoryRate = Math.max(4, Math.min(60, Number(rawResp) || 16))
          const stressIndex = Math.max(0, Math.min(100, Number(rawStress) || 45))

          // Clean, atomic update trigger
          set({
            liveTelemetryFrame: {
              bpm,
              oxygenSaturation,
              brainwaveFrequency,
              glucose,
              deviceStatus,
              respiratoryRate,
              stressIndex,
              isCrisisActive,
              isDemoActive: payload.isDemoActive === true,
              demoTime: Number(payload.demoTime) || 0
            }
          })
        } catch (parseErr) {
          console.error('[TelemetryStore] Failed to ingest SSE message packet:', parseErr)
        }
      }

      es.onerror = () => {
        // Enforce active instance check
        if (eventSourceInstance !== es) return

        // EventSource has native auto-reconnect built in.
        // The browser will automatically retry after a brief delay.
        // We just update the UI status to reflect the transient disconnect.
        console.warn('[TelemetryStore] SSE stream error — browser will auto-reconnect')
        const attempts = get().reconnectAttempts
        set({ 
          websocketStatus: 'reconnecting', 
          reconnectAttempts: attempts + 1 
        })
      }

    } catch (err) {
      console.error('[TelemetryStore] Failed to instantiate EventSource:', err)
      set({ websocketStatus: 'disconnected' })
    }
  },

  disconnectFromTelemetry: () => {
    // Terminating SSE stream gracefully
    
    // Set status to disconnected BEFORE closing to prevent trigger of reconnect loop
    set({ websocketStatus: 'disconnected', reconnectAttempts: 0 })

    if (eventSourceInstance) {
      eventSourceInstance.close()
      eventSourceInstance = null
    }
  }
}))

// ─────────────────────────────────────────────────────────────────────────────
// Atomic Slice Selectors (Enforces selective render cycles at 60fps)
// ─────────────────────────────────────────────────────────────────────────────

export const useBpm = () => useTelemetryStore((s) => s.liveTelemetryFrame.bpm)
export const useOxygenSaturation = () => useTelemetryStore((s) => s.liveTelemetryFrame.oxygenSaturation)
export const useBrainwaveFrequency = () => useTelemetryStore((s) => s.liveTelemetryFrame.brainwaveFrequency)
export const useDeviceStatus = () => useTelemetryStore((s) => s.liveTelemetryFrame.deviceStatus)
export const useGlucose = () => useTelemetryStore((s) => s.liveTelemetryFrame.glucose)
export const useCurrentCondition = () => useTelemetryStore((s) => s.currentCondition)
export const useActiveUserProfile = () => useTelemetryStore((s) => s.activeUserProfile)
export const useWebsocketStatus = () => useTelemetryStore((s) => s.websocketStatus)
export const useSelectedOrgan = () => useTelemetryStore((s) => s.selectedOrgan)
export const useIsCrisisActive = () => useTelemetryStore((s) => s.liveTelemetryFrame.isCrisisActive)
