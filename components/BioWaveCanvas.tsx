'use client'

import React, { useEffect, useRef } from 'react'

interface BioWaveCanvasProps {
  activeWave: 'cardiac' | 'respiratory' | 'neurological'
  className?: string
  width?: number
  height?: number
  bpm?: number // Beats per minute for cardiac speed calibration
}

export default function BioWaveCanvas({
  activeWave,
  className = '',
  width = 600,
  height = 150,
  bpm = 72
}: BioWaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Keep track of animation coordinates and phases to prevent resets on prop updates
  const stateRef = useRef({
    x: 0,
    lastX: 0,
    lastY: 0,
    cardiacPhase: 0,
    respPhase: 0,
    eegPhase: 0,
  })

  // Set reference to activeWave to avoid restarting the requestAnimationFrame loop
  const activeWaveRef = useRef(activeWave)
  useEffect(() => {
    activeWaveRef.current = activeWave
  }, [activeWave])

  // Set reference to bpm
  const bpmRef = useRef(bpm)
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let animationFrameId: number
    
    // Set backing store dimensions once
    canvas.width = width
    canvas.height = height

    // Initialize background solid fill once
    ctx.fillStyle = '#050807'
    ctx.fillRect(0, 0, width, height)

    // Mathematical Wave Functions
    const getECGValue = (phase: number): number => {
      const p = phase % 1.0
      if (p < 0.08) {
        // P Wave
        return Math.sin((p / 0.08) * Math.PI) * 0.12
      } else if (p >= 0.10 && p < 0.13) {
        // Q Wave
        const t = (p - 0.10) / 0.03
        return -t * 0.18
      } else if (p >= 0.13 && p < 0.18) {
        // R Spike
        const t = (p - 0.13) / 0.05
        if (t < 0.4) {
          return -0.18 + (t / 0.4) * 1.68
        } else {
          return 1.5 - ((t - 0.4) / 0.6) * 1.85
        }
      } else if (p >= 0.18 && p < 0.22) {
        // S Dip
        const t = (p - 0.18) / 0.04
        return -0.35 + (t * 0.35)
      } else if (p >= 0.28 && p < 0.42) {
        // T Wave
        const t = (p - 0.28) / 0.14
        return Math.sin(t * Math.PI) * 0.28
      }
      return 0
    }

    const getRespValue = (phase: number): number => {
      return Math.sin(phase * Math.PI * 2) * 0.72
    }

    const getEEGValue = (phase: number): number => {
      // Alpha (10Hz) + Beta (22Hz) + Gamma (45Hz) wave sum
      const alpha = Math.sin(phase * Math.PI * 2 * 9.5) * 0.22
      const beta = Math.sin(phase * Math.PI * 2 * 21.0) * 0.14
      const gamma = Math.sin(phase * Math.PI * 2 * 42.0) * 0.08
      const baseline = Math.sin(phase * Math.PI * 2 * 1.8) * 0.1
      const noise = (Math.random() - 0.5) * 0.18
      return alpha + beta + gamma + baseline + noise
    }

    const render = () => {
      const state = stateRef.current
      const wave = activeWaveRef.current
      const currentBpm = bpmRef.current

      // Increment horizontal drawing coordinate
      // Cardiac and EEG sweep slightly faster, Respiratory is slower/elegant
      const speed = wave === 'respiratory' ? 1.5 : 2.5
      state.x = (state.x + speed) % width

      // Determine wave parameters
      let color = '#00ffaa' // default cardiac green
      let waveVal = 0

      if (wave === 'cardiac') {
        color = '#00ffaa'
        // Increment phase based on BPM
        const hz = currentBpm / 60
        state.cardiacPhase = (state.cardiacPhase + (hz / 60) * (speed / 2.5)) % 1.0
        waveVal = getECGValue(state.cardiacPhase)
      } else if (wave === 'respiratory') {
        color = '#00ccff' // cyan
        // Slow respiratory breathing phase
        state.respPhase = (state.respPhase + 0.0035) % 1.0
        waveVal = getRespValue(state.respPhase)
      } else if (wave === 'neurological') {
        color = '#c040ff' // purple
        state.eegPhase = (state.eegPhase + 0.005) % 1.0
        waveVal = getEEGValue(state.eegPhase)
      }

      // Compute Y screen coordinate
      const centerY = height / 2
      const y = centerY - (waveVal * (height * 0.35))

      // 1. Organic Phosphor Decay Overlay (Exponential fade over time)
      ctx.fillStyle = 'rgba(5, 8, 7, 0.048)' // #050807 background at ~5% opacity
      ctx.fillRect(0, 0, width, height)

      // 2. Oscilloscope Trailing Gap (solid block clearing space ahead of leading playhead)
      ctx.fillStyle = '#050807'
      ctx.fillRect(state.x, 0, 24, height)

      // 3. Draw Neon Wave Segment
      if (state.x > speed) {
        ctx.beginPath()
        ctx.lineWidth = 1.8
        ctx.strokeStyle = color
        
        // Neon Glow shadow parameters
        ctx.shadowColor = color
        ctx.shadowBlur = 10
        
        ctx.moveTo(state.lastX, state.lastY)
        ctx.lineTo(state.x, y)
        ctx.stroke()
      }

      // 4. Draw Ultra-bright White Leading Playhead Dot
      ctx.beginPath()
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 14
      ctx.arc(state.x, y, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Reset shadows to keep draw call performance optimal
      ctx.shadowBlur = 0

      // Keep record of coordinates
      state.lastX = state.x
      state.lastY = y

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [width, height])

  return (
    <div className={`relative rounded border border-white/5 bg-[#050807] overflow-hidden ${className}`}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }} 
      />
    </div>
  )
}
