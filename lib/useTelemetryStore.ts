'use client'

import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces & Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetryDataFrame {
  bpm: number
  oxygenSaturation: number // SpO2 in %
  brainwaveFrequency: number // EEG speed index in Hz
  deviceStatus: 'nominal' | 'warning' | 'critical' | 'offline'
}

export type ConditionType = 'cardiac' | 'respiratory' | 'neurological'

export interface TelemetryStoreState {
  // --- Global States ---
  activeUserProfile: string
  currentCondition: ConditionType
  liveTelemetryFrame: TelemetryDataFrame
  websocketStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  reconnectAttempts: number

  // --- Actions ---
  connectToTelemetry: (websocketUrl: string) => void
  disconnectFromTelemetry: () => void
  setActiveUserProfile: (profile: string) => void
  setCurrentCondition: (condition: ConditionType) => void
  updateTelemetryFrame: (frame: Partial<TelemetryDataFrame>) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Global Telemetry Zustand Store
// ─────────────────────────────────────────────────────────────────────────────

let socketInstance: WebSocket | null = null
let reconnectTimeoutId: NodeJS.Timeout | null = null

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => ({
  // --- Initial States ---
  activeUserProfile: 'SUBJECT: TWIN-908',
  currentCondition: 'cardiac',
  liveTelemetryFrame: {
    bpm: 72,
    oxygenSaturation: 98,
    brainwaveFrequency: 12,
    deviceStatus: 'nominal'
  },
  websocketStatus: 'idle',
  reconnectAttempts: 0,

  // --- Setters ---
  setActiveUserProfile: (profile) => set({ activeUserProfile: profile }),
  setCurrentCondition: (condition) => set({ currentCondition: condition }),
  updateTelemetryFrame: (frame) => 
    set((state) => ({
      liveTelemetryFrame: {
        ...state.liveTelemetryFrame,
        ...frame
      }
    })),

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
          const rawStatus = payload.deviceStatus ?? (payload.crisis ? 'critical' : 'nominal')

          // Boundaries clamp: prevent division by zero or NaN values from breaking WebGL coordinates
          const bpm = Math.max(20, Math.min(250, Number(rawBpm) || 72))
          const oxygenSaturation = Math.max(0, Math.min(100, Number(rawSpo2) || 98))
          const brainwaveFrequency = Math.max(0.1, Math.min(150, Number(rawEeg) || 12))
          const deviceStatus = ['nominal', 'warning', 'critical', 'offline'].includes(rawStatus)
            ? rawStatus as TelemetryDataFrame['deviceStatus']
            : 'nominal'

          // Clean, atomic update trigger
          set({
            liveTelemetryFrame: {
              bpm,
              oxygenSaturation,
              brainwaveFrequency,
              deviceStatus
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
        console.error('[TelemetryStore] WebSocket encountered network layer error:', error)
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
export const useCurrentCondition = () => useTelemetryStore((s) => s.currentCondition)
export const useActiveUserProfile = () => useTelemetryStore((s) => s.activeUserProfile)
export const useWebsocketStatus = () => useTelemetryStore((s) => s.websocketStatus)
