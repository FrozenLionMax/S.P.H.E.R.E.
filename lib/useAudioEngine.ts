import { useEffect, useRef, useState, useCallback } from 'react'
import { useTelemetryStore } from '@/lib/useTelemetryStore'

export function useAudioEngine() {
  const [isMuted, setIsMuted] = useState(true)
  const ctxRef = useRef<AudioContext | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBpmRef = useRef(72)
  const lastCrisisRef = useRef(false)
  const lastOrganRef = useRef('none')
  const mountedRef = useRef(true)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playTone = useCallback((freq: number, duration: number, gain: number, type: OscillatorType = 'sine', delay = 0) => {
    if (isMuted) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration / 1000)
      osc.connect(g).connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + duration / 1000 + 0.01)
    } catch {}
  }, [isMuted, getCtx])

  const playHeartbeat = useCallback(() => {
    if (isMuted) return
    // Lub
    playTone(60, 80, 0.25, 'sine')
    // Dub (150ms later)
    playTone(40, 60, 0.15, 'sine', 0.15)
  }, [isMuted, playTone])

  const playCrisisAlert = useCallback(() => {
    if (isMuted) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3)
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35)
      osc.connect(g).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }, [isMuted, getCtx])

  const playOrganClick = useCallback(() => {
    if (isMuted) return
    playTone(1200, 30, 0.08, 'triangle')
  }, [isMuted, playTone])

  // Heartbeat loop
  useEffect(() => {
    if (isMuted) {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      return
    }

    const scheduleHeartbeat = () => {
      const bpm = useTelemetryStore.getState().liveTelemetryFrame.bpm || 72
      lastBpmRef.current = bpm
      const interval = (60 / bpm) * 1000

      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return
        playHeartbeat()
        // Check if BPM changed significantly
        const currentBpm = useTelemetryStore.getState().liveTelemetryFrame.bpm || 72
        if (Math.abs(currentBpm - lastBpmRef.current) > 5) {
          scheduleHeartbeat() // Reschedule with new BPM
        }
      }, interval)
    }

    scheduleHeartbeat()
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    }
  }, [isMuted, playHeartbeat])

  // Crisis alert listener
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const crisis = state.liveTelemetryFrame.isCrisisActive
      if (crisis && !lastCrisisRef.current) {
        playCrisisAlert()
      }
      lastCrisisRef.current = crisis
    })
    return unsub
  }, [playCrisisAlert])

  // Organ click listener
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state) => {
      const organ = state.selectedOrgan
      if (organ !== lastOrganRef.current && organ !== 'none') {
        playOrganClick()
      }
      lastOrganRef.current = organ
    })
    return unsub
  }, [playOrganClick])

  // Cleanup
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    }
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m)
  }, [])

  return { isMuted, toggleMute, playOrganClick }
}
