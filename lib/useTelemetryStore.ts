'use client'

import { create } from 'zustand'

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
}

export type ConditionType = 'general' | 'arrhythmia' | 'asthma' | 'epilepsy' | 'cardiac' | 'respiratory' | 'neurological' | 'diabetes'

export interface TelemetryStoreState {
  // --- Global States ---
  activeUserProfile: string
  currentCondition: ConditionType
  liveTelemetryFrame: TelemetryDataFrame
  websocketStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  reconnectAttempts: number
  selectedOrgan: 'none' | 'heart' | 'lungs' | 'brain' | 'custom'

  // --- UI Toggles ---
  isRotating: boolean
  wireframeMode: 'wireframe' | 'dots' | 'solid'

  // --- Actions ---
  connectToTelemetry: (websocketUrl: string) => void
  disconnectFromTelemetry: () => void
  setActiveUserProfile: (profile: string) => void
  setCurrentCondition: (condition: ConditionType) => void
  setSelectedOrgan: (organ: 'none' | 'heart' | 'lungs' | 'brain' | 'custom') => void
  setIsRotating: (rotating: boolean | ((prev: boolean) => boolean)) => void
  setWireframeMode: (mode: 'wireframe' | 'dots' | 'solid') => void
  updateTelemetryFrame: (frame: Partial<TelemetryDataFrame>) => void
  customZoomTarget: { pos: number[], target: number[] } | null
  setCustomZoomTarget: (target: { pos: number[], target: number[] } | null) => void
  triggerCrisis: () => void
  resolveCrisis: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Global Telemetry Zustand Store
// ─────────────────────────────────────────────────────────────────────────────

let socketInstance: WebSocket | null = null
let reconnectTimeoutId: NodeJS.Timeout | null = null

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
    isCrisisActive: false
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
    const conditionToTrackMap: Record<string, string> = {
      arrhythmia: 'PILOT',
      asthma: 'ASTRONAUT',
      epilepsy: 'SURGEON',
      diabetes: 'TRAIN_PILOT',
      general: 'PILOT'
    };
    const profile = conditionToTrackMap[condition] || 'PILOT';
    set({ currentCondition: condition, activeUserProfile: profile });
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
  triggerCrisis: () => {
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      socketInstance.send(JSON.stringify({ type: 'INITIATE_CRISIS' }))
    }
  },
  resolveCrisis: () => {
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      socketInstance.send(JSON.stringify({ type: 'RESOLVE_CRISIS' }))
    }
  },

  // --- Connection Actions ---
  connectToTelemetry: (websocketUrl) => {
    // 1. Avoid duplicate socket connections
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      console.log('[TelemetryStore] WebSocket already active. Skipping connection attempt.')
      return
    }

    // Clear any pending reconnect timers
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    set({ websocketStatus: 'connecting' })
    console.log(`[TelemetryStore] Spawning connection to: ${websocketUrl}`)

    try {
      const ws = new WebSocket(websocketUrl)
      socketInstance = ws

      ws.onopen = () => {
        console.log('[TelemetryStore] Neural socket handshake established.')
        set({ 
          websocketStatus: 'connected', 
          reconnectAttempts: 0 
        })
      }

      ws.onmessage = (event) => {
        try {
          // Ingestion boundaries protection: ensure the payload is safely formatted JSON
          if (typeof event.data !== 'string') {
            console.warn('[TelemetryStore] Invalid binary payload discarded.')
            return
          }

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
              isCrisisActive
            }
          })
        } catch (parseErr) {
          console.error('[TelemetryStore] Failed to ingest message packet:', parseErr)
        }
      }

      ws.onclose = (event) => {
        socketInstance = null
        if (get().websocketStatus === 'disconnected') {
          // Graceful voluntary disconnect
          console.log('[TelemetryStore] WebSocket connection closed by user.')
          return
        }

        console.warn(`[TelemetryStore] WebSocket disconnected. Code: ${event.code}. Reconnecting...`)
        set({ websocketStatus: 'disconnected' })
        
        // Auto-reconnect trigger: exponential backoff logic (max out backoff interval at 30 seconds)
        const attempts = get().reconnectAttempts
        const nextDelay = Math.min(1000 * Math.pow(2, attempts), 30000)
        
        set({ 
          websocketStatus: 'reconnecting', 
          reconnectAttempts: attempts + 1 
        })

        reconnectTimeoutId = setTimeout(() => {
          get().connectToTelemetry(websocketUrl)
        }, nextDelay)
      }

      ws.onerror = (error) => {
        console.warn('[TelemetryStore] WebSocket connection handshake or network layer event:', error)
      }

    } catch (err) {
      console.error('[TelemetryStore] Failed to instantiate WebSocket constructor:', err)
      set({ websocketStatus: 'disconnected' })
    }
  },

  disconnectFromTelemetry: () => {
    console.log('[TelemetryStore] Terminating socket connection gracefully.')
    
    // Set status to disconnected BEFORE closing to prevent trigger of reconnect loop
    set({ websocketStatus: 'disconnected', reconnectAttempts: 0 })

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    if (socketInstance) {
      socketInstance.close()
      socketInstance = null
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
