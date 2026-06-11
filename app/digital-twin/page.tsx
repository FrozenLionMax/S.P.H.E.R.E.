'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Activity,
  Heart,
  User,
  ArrowLeft,
  Settings,
  Cpu,
  RefreshCw,
  Sliders,
  Zap,
  Volume2,
  VolumeX,
  FileText,
  Shield,
  Eye,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'

const DigitalTwinScene = dynamic(() => import('@/components/DigitalTwinScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-emerald-500/80">
      CALIBRATING HOLOGRAPHIC WIREFRAME...
    </div>
  )
})

import { useTelemetryStore } from '@/lib/useTelemetryStore'

// Define medical conditions
type ConditionKey = 'diabetes' | 'arrhythmia' | 'asthma' | 'epilepsy'

interface ConditionInfo {
  name: string
  status: 'NOMINAL' | 'WARNING' | 'CRISIS'
  color: string // Tailwind text/border color
  hexColor: string // Actual CSS hex color
  bpm: number
  spo2: number
  resp: number
  glucose: number
  stress: number
  desc: string
  logs: string[]
}

const CONDITIONS: Record<ConditionKey, ConditionInfo> = {
  diabetes: {
    name: 'Diabetic Glucose Spike',
    status: 'CRISIS',
    color: 'text-amber-500 border-amber-500/30',
    hexColor: '#ff9900',
    bpm: 88,
    spo2: 92,
    resp: 16,
    glucose: 260,
    stress: 68,
    desc: 'Systemic metabolic crisis detected. Elevated plasma glucose levels exceeding 260 mg/dL. Osmotic shift modeling active.',
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Diabetic Glucose Spike parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Osmotic shift modeling active',
      'Status: Systemic metabolic crisis detected'
    ]
  },
  arrhythmia: {
    name: 'Cardiovascular Arrhythmia',
    status: 'CRISIS',
    color: 'text-red-500 border-red-500/30',
    hexColor: '#ff2b56',
    bpm: 138,
    spo2: 95,
    resp: 18,
    glucose: 280,
    stress: 76,
    desc: 'Critical cardiac instability detected. Ectopic pacemaking in ventricles observed. Visualizing erratic PQRST complex.',
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Cardiovascular Arrhythmia parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: High ventricular load observed',
      'Status: Critical cardiac instability detected'
    ]
  },
  asthma: {
    name: 'Chronic Asthma',
    status: 'WARNING',
    color: 'text-cyan-400 border-cyan-500/30',
    hexColor: '#00ccff',
    bpm: 84,
    spo2: 89,
    resp: 9,
    glucose: 280,
    stress: 54,
    desc: 'Compromised pulmonary ventilation. SpO2 critical threshold breached (<90%). Rhythmic respiration amplitude restriction.',
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Chronic Asthma parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Bronchial resistance modeling active',
      'Status: Compromised pulmonary ventilation'
    ]
  },
  epilepsy: {
    name: 'Neurological Epilepsy',
    status: 'CRISIS',
    color: 'text-fuchsia-500 border-fuchsia-500/30',
    hexColor: '#c040ff',
    bpm: 112,
    spo2: 92,
    resp: 24,
    glucose: 115,
    stress: 91,
    desc: 'Severe paroxysmal electrical discharge in cerebral cortex. Chaotic high-amplitude spike-and-wave EEG activity.',
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Neurological Epilepsy parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Cerebral cortex electrical discharges active',
      'Status: Critical neurological seizure alert'
    ]
  }
}

// 3D Point Interface
interface Point3D {
  x: number
  y: number
  z: number
  color?: string
}

export default function DigitalTwin() {
  const storeCondition = useTelemetryStore((s) => s.currentCondition)
  const activeCondition = (['diabetes', 'arrhythmia', 'asthma', 'epilepsy'].includes(storeCondition) ? storeCondition : 'diabetes') as ConditionKey
  // UI Render Throttling: Poll telemetry store at 2fps instead of reacting at 60fps
  // This drastically improves DOM performance and prevents UI thread blocking
  const [telemetry, setTelemetry] = useState({
    liveBpm: 72,
    liveSpo2: 98,
    liveGlucose: 120
  })

  const [anomalies, setAnomalies] = useState({
    bpm: false,
    spo2: false,
    glucose: false
  })

  // Rolling buffers for Z-score anomaly prediction
  const historyRef = useRef({
    bpm: [] as number[],
    spo2: [] as number[],
    glucose: [] as number[]
  })

  useEffect(() => {
    // Read the query parameter to link the Operator Track to a specific Medical Condition
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const condition = params.get('condition')
      if (condition && ['diabetes', 'arrhythmia', 'asthma', 'epilepsy'].includes(condition)) {
        useTelemetryStore.getState().setCurrentCondition(condition as any)
      }
    }

    const updateUiInterval = setInterval(() => {
      const state = useTelemetryStore.getState().liveTelemetryFrame
      const bpm = Math.round(state.bpm)
      const spo2 = Math.round(state.oxygenSaturation)
      const glucose = Math.round(state.glucose)
      
      setTelemetry({ liveBpm: bpm, liveSpo2: spo2, liveGlucose: glucose })

      // AI-adjacent Anomaly Detection (Rolling Z-Score)
      const hist = historyRef.current
      hist.bpm.push(bpm)
      hist.spo2.push(spo2)
      hist.glucose.push(glucose)

      // Keep last 30 samples (~15 seconds rolling window)
      if (hist.bpm.length > 30) hist.bpm.shift()
      if (hist.spo2.length > 30) hist.spo2.shift()
      if (hist.glucose.length > 30) hist.glucose.shift()

      const checkAnomaly = (arr: number[], current: number) => {
        if (arr.length < 10) return false // Wait for baseline to stabilize
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length
        const std = Math.sqrt(variance) || 1
        const zScore = Math.abs((current - mean) / std)
        return zScore > 2.0 // Trigger prediction if drift is > 2.0 std deviations
      }

      setAnomalies({
        bpm: checkAnomaly(hist.bpm, bpm),
        spo2: checkAnomaly(hist.spo2, spo2),
        glucose: checkAnomaly(hist.glucose, glucose)
      })
    }, 500)
    return () => clearInterval(updateUiInterval)
  }, [])

  const { liveBpm, liveSpo2, liveGlucose } = telemetry

  const [audioEnabled, setAudioEnabled] = useState(false)
  const wireframeMode = useTelemetryStore((s) => s.wireframeMode)
  const setWireframeMode = useTelemetryStore((s) => s.setWireframeMode)

  const [sysTime, setSysTime] = useState('')
  const [tickerLogs, setTickerLogs] = useState<string[]>([])
  
  const audioCtxRef = useRef<AudioContext | null>(null)
  
  // Canvas Refs
  const hologramCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Stream data offsets for graphs
  const graphOffsetRef = useRef(0)

  // Set local clock time
  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      setSysTime(d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0'))
    }
    const timer = setInterval(updateTime, 45)
    return () => clearInterval(timer)
  }, [])

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (!audioEnabled) {
      initAudio()
      // Play a quick calibration sound
      const ctx = audioCtxRef.current
      if (ctx) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      }
      setAudioEnabled(true)
    } else {
      setAudioEnabled(false)
    }
  }, [audioEnabled, initAudio])

  // Trigger heart beep sound on pulse
  const playPulseSound = useCallback((frequency = 600, duration = 0.08, volume = 0.05) => {
    if (!audioEnabled || !audioCtxRef.current) return
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') return

    try {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration)
      
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (err) {
      console.warn('Web Audio playback failed:', err)
    }
  }, [audioEnabled])

  // Sync state logs to current medical profile
  useEffect(() => {
    setTickerLogs(CONDITIONS[activeCondition].logs)
    // Play profile switch tone
    if (audioEnabled) {
      playPulseSound(440, 0.2, 0.08)
    }
  }, [activeCondition, playPulseSound, audioEnabled])

  // Periodic log scanner additions
  useEffect(() => {
    const logInterval = setInterval(() => {
      const newLogs = [
        `Scanner: Re-evaluating ${CONDITIONS[activeCondition].name} parameters...`,
        `Link Node: Matrix latency is ${(Math.random() * 5 + 2).toFixed(1)}ms`,
        `Sensors: Telemetry stream integrity ${(98 + Math.random() * 2).toFixed(2)}%`,
        `Physical: Temperature grid calibrated at 98.6°F`
      ]
      const randomLog = newLogs[Math.floor(Math.random() * newLogs.length)]
      setTickerLogs(prev => [randomLog, ...prev.slice(0, 9)])
    }, 6000)
    return () => clearInterval(logInterval)
  }, [activeCondition])

  // 1. HOLOGRAM 3D CANVAS RENDERING
  useEffect(() => {
    const canvas = hologramCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let angleY = 0
    let angleX = 0.25
    let beatTimer = 0

    // Geometry generators
    const generateDNA = (): Point3D[] => {
      const points: Point3D[] = []
      const numPoints = 80
      const radius = 25
      const pitch = 2.0
      
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 8
        const y = (i - numPoints / 2) * pitch
        
        // Strand 1
        points.push({
          x: Math.cos(t) * radius,
          y: y,
          z: Math.sin(t) * radius,
          color: '#00ffaa'
        })
        
        // Strand 2
        points.push({
          x: Math.cos(t + Math.PI) * radius,
          y: y,
          z: Math.sin(t + Math.PI) * radius,
          color: '#00ccff'
        })
      }
      return points
    }

    const generateHeart = (): Point3D[] => {
      const points: Point3D[] = []
      const numRings = 15
      const pointsPerRing = 20
      
      for (let i = 0; i < numRings; i++) {
        const v = (i / numRings) * Math.PI
        const radiusFactor = Math.sin(v)
        
        for (let j = 0; j < pointsPerRing; j++) {
          const u = (j / pointsPerRing) * Math.PI * 2
          
          // Parametric heart formula in 3D
          const r = 16 * Math.pow(Math.sin(u), 3)
          const hX = r * radiusFactor * 1.5
          const hY = -(13 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u)) * radiusFactor * 1.5
          const hZ = Math.sin(u) * Math.cos(v) * 20 * radiusFactor
          
          points.push({
            x: hX,
            y: hY - 5,
            z: hZ,
            color: '#ff2b56'
          })
        }
      }
      return points
    }

    const generateLungs = (): Point3D[] => {
      const points: Point3D[] = []
      const particles = 120
      
      // Generate left and right lung lobes
      for (let i = 0; i < particles; i++) {
        const isLeft = i < particles / 2
        const phi = Math.random() * Math.PI * 2
        const theta = Math.random() * Math.PI
        
        const rX = (isLeft ? -15 : 15) + Math.sin(theta) * Math.cos(phi) * 12
        const rY = Math.cos(theta) * 24 + (Math.sin(phi) * 5)
        const rZ = Math.sin(theta) * Math.sin(phi) * 12
        
        points.push({
          x: rX,
          y: rY - 2,
          z: rZ,
          color: '#00b4ff'
        })
      }
      return points
    }

    const generateBrain = (): Point3D[] => {
      const points: Point3D[] = []
      const layers = 18
      const pointsPerLayer = 16
      
      // Generate spheroid head/brain model
      for (let i = 0; i < layers; i++) {
        const lat = (i / layers) * Math.PI - Math.PI / 2
        const r = Math.cos(lat) * 28
        const y = Math.sin(lat) * 22
        
        for (let j = 0; j < pointsPerLayer; j++) {
          const lon = (j / pointsPerLayer) * Math.PI * 2
          
          // Add cortical ripples
          const noise = 1 + Math.sin(lon * 5) * Math.cos(lat * 5) * 0.12
          
          points.push({
            x: Math.cos(lon) * r * noise,
            y: y,
            z: Math.sin(lon) * r * noise,
            color: '#c040ff'
          })
        }
      }
      return points
    }

    // Load active geometry points
    let points: Point3D[] = []
    
    const updateGeometry = () => {
      switch (activeCondition) {
        case 'diabetes':
          points = generateDNA()
          break
        case 'arrhythmia':
          points = generateHeart()
          break
        case 'asthma':
          points = generateLungs()
          break
        case 'epilepsy':
          points = generateBrain()
          break
      }
    }

    updateGeometry()

    const fov = 400
    const cameraDistance = 140

    const render = () => {
      if (!ctx || !canvas) return
      
      // Set responsive resolution
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      ctx.clearRect(0, 0, width, height)
      
      // Draw grid backdrop
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.03)'
      ctx.lineWidth = 1
      const gridSize = 30
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw center radar ring lines
      const cx = width / 2
      const cy = height / 2
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.06)'
      ctx.beginPath()
      ctx.arc(cx, cy, 60, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, 110, 0, Math.PI * 2)
      ctx.stroke()

      // Handle custom rotation and pulsing animations based on profile
      const condition = CONDITIONS[activeCondition]
      const themeColor = condition.hexColor
      
      // Beat scale factor (pulsing organ simulation)
      let scalePulse = 1.0
      beatTimer += 0.03
      
      if (activeCondition === 'arrhythmia') {
        // Double pulse peak (erratic ventricular beat)
        const hz = (condition.bpm / 60) * 2 * Math.PI
        const pulse = Math.sin(Date.now() * 0.012)
        scalePulse = 1.0 + (pulse > 0.6 ? 0.15 : 0) + (Math.random() * 0.02)
      } else if (activeCondition === 'asthma') {
        // Slow lung expansion and retraction
        scalePulse = 1.0 + Math.sin(Date.now() * 0.001) * 0.15
      } else if (activeCondition === 'diabetes') {
        // Baseline calm heartbeat pulse
        scalePulse = 1.0 + (Math.sin(Date.now() * 0.004) > 0.85 ? 0.07 : 0)
      } else if (activeCondition === 'epilepsy') {
        // Erratic vibration scaling
        scalePulse = 0.95 + Math.random() * 0.1
      }

      // Project 3D points to 2D screen
      const projected: { sx: number; sy: number; depth: number; color: string }[] = []

      const cosY = Math.cos(angleY)
      const sinY = Math.sin(angleY)
      const cosX = Math.cos(angleX)
      const sinX = Math.sin(angleX)

      points.forEach(pt => {
        // Scale locally
        let px = pt.x * scalePulse
        let py = pt.y * scalePulse
        let pz = pt.z * scalePulse

        // Rotate Y-axis
        let x1 = px * cosY - pz * sinY
        let z1 = px * sinY + pz * cosY

        // Rotate X-axis
        let y2 = py * cosX - z1 * sinX
        let z2 = py * sinX + z1 * cosX

        // Perspective Projection
        const dist = cameraDistance + z2
        const factor = fov / Math.max(1, dist)
        const sx = cx + x1 * factor
        const sy = cy + y2 * factor

        projected.push({
          sx,
          sy,
          depth: z2,
          color: pt.color || themeColor
        })
      })

      // Render wireframe mesh or dots
      if (wireframeMode === 'dots') {
        projected.forEach(pt => {
          // Adjust size by depth
          const depthAlpha = Math.max(0.15, Math.min(1.0, 1.0 - pt.depth / 80))
          ctx.fillStyle = pt.color
          ctx.shadowBlur = activeCondition === 'epilepsy' ? 4 : 0
          ctx.shadowColor = pt.color
          ctx.globalAlpha = depthAlpha
          ctx.beginPath()
          ctx.arc(pt.sx, pt.sy, 2, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1.0
        ctx.shadowBlur = 0
      } else if (wireframeMode === 'wireframe') {
        // Draw connected mesh lines
        ctx.lineWidth = 0.75
        
        if (activeCondition === 'diabetes') {
          // Connect DNA strands and draw horizontal base rungs
          const numPts = points.length
          ctx.globalAlpha = 0.4
          
          for (let i = 0; i < numPts; i += 2) {
            if (i + 2 < numPts) {
              // Connect Strand 1 lines
              ctx.strokeStyle = '#00ffaa'
              ctx.beginPath()
              ctx.moveTo(projected[i].sx, projected[i].sy)
              ctx.lineTo(projected[i + 2].sx, projected[i + 2].sy)
              ctx.stroke()

              // Connect Strand 2 lines
              ctx.strokeStyle = '#00ccff'
              ctx.beginPath()
              ctx.moveTo(projected[i + 1].sx, projected[i + 1].sy)
              ctx.lineTo(projected[i + 3].sx, projected[i + 3].sy)
              ctx.stroke()
            }

            // Draw rungs connecting Strand 1 and 2
            if (i % 6 === 0) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
              ctx.beginPath()
              ctx.moveTo(projected[i].sx, projected[i].sy)
              ctx.lineTo(projected[i + 1].sx, projected[i + 1].sy)
              ctx.stroke()
            }
          }
          ctx.globalAlpha = 1.0
        } else if (activeCondition === 'arrhythmia') {
          // Draw heart rings
          const pointsPerRing = 20
          ctx.strokeStyle = themeColor
          
          for (let i = 0; i < projected.length; i++) {
            const nextIdxInRing = i + 1 === projected.length ? 0 : (i % pointsPerRing === pointsPerRing - 1 ? i - pointsPerRing + 1 : i + 1)
            const downIdx = i + pointsPerRing
            
            // Grid alpha by depth
            const alpha = Math.max(0.1, Math.min(0.8, 0.8 - projected[i].depth / 80))
            ctx.globalAlpha = alpha

            // Connect ring horizontal lines
            ctx.beginPath()
            ctx.moveTo(projected[i].sx, projected[i].sy)
            ctx.lineTo(projected[nextIdxInRing].sx, projected[nextIdxInRing].sy)
            ctx.stroke()

            // Connect vertical column lines
            if (downIdx < projected.length) {
              ctx.beginPath()
              ctx.moveTo(projected[i].sx, projected[i].sy)
              ctx.lineTo(projected[downIdx].sx, projected[downIdx].sy)
              ctx.stroke()
            }
          }
          ctx.globalAlpha = 1.0
        } else if (activeCondition === 'asthma') {
          // Connect lungs particles with proximity lines (organic branch mesh)
          ctx.strokeStyle = 'rgba(0, 180, 255, 0.2)'
          const len = projected.length
          for (let i = 0; i < len; i += 2) {
            // Find nearby points and connect
            for (let j = i + 1; j < Math.min(len, i + 10); j++) {
              const dx = projected[i].sx - projected[j].sx
              const dy = projected[i].sy - projected[j].sy
              const d = Math.sqrt(dx*dx + dy*dy)
              if (d < 35) {
                ctx.beginPath()
                ctx.moveTo(projected[i].sx, projected[i].sy)
                ctx.lineTo(projected[j].sx, projected[j].sy)
                ctx.stroke()
              }
            }
          }
        } else if (activeCondition === 'epilepsy') {
          // Brain network lattice with sudden sparks
          const len = projected.length
          const isSeizing = activeCondition === 'epilepsy'
          ctx.strokeStyle = 'rgba(192, 64, 255, 0.18)'

          for (let i = 0; i < len; i += 4) {
            for (let j = i + 1; j < Math.min(len, i + 8); j++) {
              const dx = projected[i].sx - projected[j].sx
              const dy = projected[i].sy - projected[j].sy
              const d = Math.sqrt(dx*dx + dy*dy)
              if (d < 45) {
                ctx.beginPath()
                ctx.moveTo(projected[i].sx, projected[i].sy)
                ctx.lineTo(projected[j].sx, projected[j].sy)
                ctx.stroke()
              }
            }
          }

          // Render sudden bright seizure synaptic flashes
          if (isSeizing && Math.random() > 0.4) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
            ctx.lineWidth = 1.5
            for (let k = 0; k < 6; k++) {
              const from = Math.floor(Math.random() * len)
              const to = Math.floor(Math.random() * len)
              const dist = Math.hypot(projected[from].sx - projected[to].sx, projected[from].sy - projected[to].sy)
              if (dist < 80) {
                ctx.beginPath()
                ctx.moveTo(projected[from].sx, projected[from].sy)
                ctx.lineTo(projected[to].sx, projected[to].sy)
                ctx.stroke()
              }
            }
          }
        }
      } else {
        // SOLID-LIKE METALLIC WIREFRAME (Overlay dots and lines)
        projected.forEach((pt, idx) => {
          const depthAlpha = Math.max(0.1, Math.min(0.9, 0.9 - pt.depth / 80))
          ctx.fillStyle = pt.color
          ctx.globalAlpha = depthAlpha
          ctx.beginPath()
          ctx.arc(pt.sx, pt.sy, 3, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 0.5
        for (let i = 0; i < projected.length - 1; i++) {
          if (Math.random() > 0.7) {
            ctx.beginPath()
            ctx.moveTo(projected[i].sx, projected[i].sy)
            ctx.lineTo(projected[i+1].sx, projected[i+1].sy)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1.0
      }

      // Scanning sweep line overlay
      const scanY = (Date.now() * 0.18) % height
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.09)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, scanY)
      ctx.lineTo(width, scanY)
      ctx.stroke()

      ctx.fillStyle = 'rgba(0, 255, 170, 0.03)'
      ctx.fillRect(0, scanY - 10, width, 10)

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [activeCondition, wireframeMode])

  // 2. BOTTOM GRAPHS: REAL-TIME MULTI-CHANNEL SCROLLING CANVAS
  useEffect(() => {
    const canvas = graphCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const bufferSize = 800
    const ecgBuffer = new Array(bufferSize).fill(0)
    const eegBuffer = new Array(bufferSize).fill(0)
    const respBuffer = new Array(bufferSize).fill(0)

    let writeIndex = 0
    let lastBeatTime = Date.now()
    const updateBuffer = () => {
      // Stream speed adjustments
      const condition = CONDITIONS[activeCondition]
      const now = Date.now()
      
      // Calculate active cardiac duration (R-spike interval)
      const beatInterval = 60000 / condition.bpm
      const elapsed = now - lastBeatTime
      
      let ecgVal = 0
      
      // Generate cardiac ECG waveform structure - Arrhythmic irregular beats under crisis
      const localPhase = (elapsed / beatInterval) % 1.0
      
      if (localPhase < 0.08) {
        // P Wave
        ecgVal = Math.sin(localPhase * Math.PI / 0.08) * 0.15
      } else if (localPhase >= 0.1 && localPhase < 0.14) {
        // Q Wave drop
        ecgVal = -0.2
      } else if (localPhase >= 0.14 && localPhase < 0.2) {
        // Massive R Spike
        const progress = (localPhase - 0.14) / 0.06
        ecgVal = Math.sin(progress * Math.PI) * 1.8
      } else if (localPhase >= 0.2 && localPhase < 0.24) {
        // S Drop
        ecgVal = -0.4
      } else if (localPhase >= 0.28 && localPhase < 0.44) {
        // Elevated erratic T Wave
        const progress = (localPhase - 0.28) / 0.16
        ecgVal = Math.sin(progress * Math.PI) * 0.45
      }
      
      // Add irregular muscle jitter
      ecgVal += (Math.random() - 0.5) * 0.18
      
      if (elapsed >= beatInterval) {
        lastBeatTime = now - (Math.random() * 80) // Jerky random interval offset
        playPulseSound(580, 0.09, 0.04)
      }

      // Brain wave EEG activity - High frequency chaotic neural discharges
      let eegVal = Math.sin(now * 0.08) * 0.8 + Math.cos(now * 0.22) * 0.6
      if (Math.random() > 0.7) {
        eegVal += (Math.random() > 0.5 ? 1.4 : -1.4) // massive spike amplitude
      }

      // Respiration pulmonary waves (RESP) - Shallow hyperventilation compensation
      const respHz = 18 / 60
      const respPeriod = 1000 / respHz
      const respPhase = (now % respPeriod) / respPeriod
      let respVal = Math.sin(respPhase * Math.PI * 2) * 0.3
      if (respPhase > 0.4 && respPhase < 0.6) {
        respVal -= 0.15 // gasping dip
      }

      ecgBuffer[writeIndex] = ecgVal
      eegBuffer[writeIndex] = eegVal
      respBuffer[writeIndex] = respVal

      writeIndex = (writeIndex + 1) % bufferSize
      graphOffsetRef.current = writeIndex
    }

    const drawWaves = () => {
      if (!ctx || !canvas) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      ctx.clearRect(0, 0, width, height)
      
      const numChannels = 3
      const channelHeight = height / numChannels

      // Update values
      for (let step = 0; step < 2; step++) {
        updateBuffer()
      }

      const offset = graphOffsetRef.current
      const stepX = width / bufferSize

      const channelParams = [
        { name: 'CH-1 ECG (Myocardial Stress)', buffer: ecgBuffer, color: '#ff2b56', scale: 0.28 },
        { name: 'CH-2 EEG (Neural Cortex)', buffer: eegBuffer, color: '#c040ff', scale: 0.35 },
        { name: 'CH-3 RESP (Pulmonary Rate)', buffer: respBuffer, color: '#00ccff', scale: 0.35 }
      ]

      channelParams.forEach((ch, chIdx) => {
        const midY = chIdx * channelHeight + channelHeight / 2
        
        // Channel backdrop grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)'
        ctx.lineWidth = 0.5
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath()
          ctx.moveTo(x, chIdx * channelHeight)
          ctx.lineTo(x, (chIdx + 1) * channelHeight)
          ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.moveTo(0, midY)
        ctx.lineTo(width, midY)
        ctx.stroke()

        // Draw Channel boundary labels
        ctx.font = '9px var(--font-mono)'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.fillText(ch.name, 10, chIdx * channelHeight + 15)

        // Draw waveform path
        ctx.beginPath()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = ch.color
        
        let pathStarted = false
        for (let i = 0; i < bufferSize; i++) {
          const index = (offset + i) % bufferSize
          const val = ch.buffer[index]
          const x = i * stepX
          const y = midY - (val * channelHeight * ch.scale)

          if (!pathStarted) {
            ctx.moveTo(x, y)
            pathStarted = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()

        // Add a sweeping playhead marker dot at the right end
        ctx.fillStyle = ch.color
        ctx.shadowBlur = 4
        ctx.shadowColor = ctx.fillStyle
        ctx.beginPath()
        const lastVal = ch.buffer[(offset - 1 + bufferSize) % bufferSize]
        ctx.arc(width - 4, midY - (lastVal * channelHeight * ch.scale), 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      animationFrameId = requestAnimationFrame(drawWaves)
    }

    drawWaves()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [activeCondition, playPulseSound])

  return (
    <div className="min-h-screen bg-[#050807] text-slate-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Top Banner Header */}
      <header className="h-16 border-b border-white/5 bg-[#050807]/90 backdrop-blur-md px-6 flex items-center justify-between relative z-50">
        
        {/* Left Side: Back Navigation */}
        <a href="/?onboarded=true" className="inline-flex shrink-0" style={{ pointerEvents: 'auto' }}>
          <span 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-[9px] font-mono font-bold tracking-widest text-emerald-400 hover:text-emerald-300 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            SPHERE TELEMETRY
          </span>
        </a>

        {/* Center/Right: Title and Global States */}
        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center animate-pulse">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <h1 className="text-sm font-semibold tracking-wider font-mono text-emerald-400 uppercase">
              DIGITAL TWIN SYNAPSE LINK v4.0.1
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-6 font-mono text-[10px]">
            <div className="flex items-center gap-2 border-r border-white/5 pr-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-400">LINK NODE:</span>
              <span className="text-emerald-400 font-semibold">ONLINE</span>
            </div>
            
            <div className="flex items-center gap-2 border-r border-white/5 pr-6">
              <span className="text-slate-400">SYS TIME:</span>
              <span className="text-emerald-400 font-semibold">{sysTime || '00:00:00.000'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">CONDITION:</span>
              <span className={`font-semibold uppercase ${
                CONDITIONS[activeCondition].status === 'NOMINAL' ? 'text-emerald-400' :
                CONDITIONS[activeCondition].status === 'WARNING' ? 'text-amber-400' : 'text-red-500'
              }`}>
                {CONDITIONS[activeCondition].name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden min-h-0">
        
        {/* Left Sidebar - Patient Demographics & Vitals Monitor */}
        <section className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
          
          {/* Patient Profile Card */}
          <div className="glass-panel p-4 rounded relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 right-0 p-3 opacity-15">
              <User className="w-16 h-16 text-emerald-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                <span className="text-xs font-semibold font-mono text-slate-400">TWIN</span>
                {/* scanning laser line */}
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400/60 shadow-[0_0_8px_#00ffaa] animate-bounce top-1/2"></div>
              </div>
              <div>
                <h2 className="text-sm font-semibold font-mono tracking-wider text-slate-200">PATIENT ID: TWIN-988</h2>
                <span className="text-[10px] text-emerald-500/80 font-mono tracking-widest uppercase">CLASSIFIED SUBJECT</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">AGE / SEX:</span>
                <span className="text-slate-300">32 / MALE</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">BLOOD TYPE:</span>
                <span className="text-slate-300">0-NEGATIVE</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">HEIGHT / WT:</span>
                <span className="text-slate-300">182cm / 76kg</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">CORE TEMP:</span>
                <span className="text-slate-300">98.6°F / 37°C</span>
              </div>
            </div>
          </div>

          {/* System Status (Static Title Card) */}
          <div className="p-3 rounded border border-amber-500/25 bg-amber-500/5 text-amber-400 font-mono flex flex-col gap-1 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)]">
            <span className="text-[9px] text-slate-500 tracking-wider uppercase font-semibold">SYSTEM STATUS</span>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              METABOLIC MONITORING // DIABETIC GLUCOSE SPIKE
            </div>
          </div>

          {/* Condition Description */}
          <div className="p-3 rounded border border-white/5 bg-[#080d0a]/60 text-[11px] leading-relaxed text-slate-400 font-mono">
            <span className="block text-[9px] text-slate-500 tracking-wider mb-1 font-bold">PHYSIO SUMMARY:</span>
            {CONDITIONS[activeCondition].desc}
          </div>

          {/* Core Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-3 flex-1 lg:flex-initial">
            {/* BPM */}
            <div className={`glass-panel p-3 rounded flex flex-col justify-between min-h-[75px] relative transition-all duration-300 ${
              anomalies.bpm ? '!border-amber-500 !shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]' : ''
            }`}>
              {anomalies.bpm && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest animate-pulse whitespace-nowrap">
                  ANOMALY PREDICTED
                </div>
              )}
              <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                <span>HEART RATE</span>
                <Heart className={`w-3.5 h-3.5 ${activeCondition === 'arrhythmia' ? 'text-red-500 animate-ping' : anomalies.bpm ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {liveBpm}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">BPM</span>
              </div>
              <div className="text-[8px] font-mono mt-1 text-slate-500">
                LIMITS: 60 - 100
              </div>
            </div>

            {/* SpO2 */}
            <div className={`glass-panel p-3 rounded flex flex-col justify-between min-h-[75px] relative transition-all duration-300 ${
              anomalies.spo2 ? '!border-amber-500 !shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]' : ''
            }`}>
              {anomalies.spo2 && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest animate-pulse whitespace-nowrap">
                  ANOMALY PREDICTED
                </div>
              )}
              <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                <span>BLOOD OXYGEN</span>
                <Activity className={`w-3.5 h-3.5 ${anomalies.spo2 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl font-bold font-mono ${
                  liveSpo2 < 95 ? 'text-red-500 animate-pulse' : 'text-slate-100'
                }`}>
                  {liveSpo2}%
                </span>
                <span className="text-[9px] text-slate-500 font-mono">%</span>
              </div>
              <div className="text-[8px] font-mono mt-1 text-slate-500">
                LIMITS: 95% - 100%
              </div>
            </div>

            {/* Respiration */}
            <div className="glass-panel p-3 rounded flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                <span>RESPIRATION</span>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {CONDITIONS[activeCondition].resp}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">/MIN</span>
              </div>
              <div className="text-[8px] font-mono mt-1 text-slate-500">
                LIMITS: 12 - 20
              </div>
            </div>

            {/* Blood Glucose */}
            <div className={`glass-panel p-3 rounded flex flex-col justify-between min-h-[75px] relative transition-all duration-300 ${
              anomalies.glucose ? '!border-amber-500 !shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]' : ''
            }`}>
              {anomalies.glucose && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest animate-pulse whitespace-nowrap">
                  ANOMALY PREDICTED
                </div>
              )}
              <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                <span>BLOOD GLUCOSE</span>
                <Shield className={`w-3.5 h-3.5 ${liveGlucose > 200 ? 'text-amber-500 animate-pulse' : anomalies.glucose ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl font-bold font-mono ${
                  liveGlucose > 200 ? 'text-amber-500 animate-pulse' : 'text-slate-100'
                }`}>
                  {liveGlucose}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">mg/dL</span>
              </div>
              <div className="text-[8px] font-mono mt-1 text-slate-500">
                LIMITS: 70 - 140 mg/dL
              </div>
            </div>
          </div>

        </section>

        {/* Center Panel - Holographic 3D Viewport */}
        <section className="lg:col-span-2 flex flex-col gap-3 relative min-h-[400px]">
          
          {/* Neon glassmorphic frame */}
          <div className="flex-1 rounded border border-emerald-500/25 bg-[#040806]/75 relative overflow-hidden flex flex-col shadow-[inset_0_0_20px_rgba(0,255,170,0.08)]">
            
            {/* Viewport Info Overlay (Top Left) */}
            <div className="absolute top-4 left-4 font-mono text-[9px] text-emerald-500/80 bg-black/60 border border-emerald-500/10 px-2.5 py-1.5 rounded flex flex-col gap-0.5 z-10">
              <span className="font-semibold text-emerald-400">NODE_09X_LINKED</span>
              <span>RENDER: WIREFRAME_GL_SIM</span>
              <span>GEOMETRY: {
                activeCondition === 'diabetes' ? '3D_HEPATIC_MESH' :
                activeCondition === 'arrhythmia' ? '3D_CARDIO_MESH' :
                activeCondition === 'asthma' ? '3D_PULMONARY_GRID' : '3D_CEREBRAL_LATTICE'
              }</span>
              <span>ROT_SPEED: {activeCondition === 'epilepsy' ? '0.045 rad/f' : '0.008 rad/f'}</span>
            </div>

            {/* Viewport Action Controls (Top Right) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20" style={{ pointerEvents: 'auto' }}>

              {/* Wireframe switch */}
              <div className="bg-black/60 border border-white/10 rounded p-0.5 flex gap-0.5">
                {(['wireframe', 'dots', 'solid'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setWireframeMode(mode)}
                    className={`px-1.5 py-0.5 text-[8px] font-mono rounded cursor-pointer uppercase transition-all ${
                      wireframeMode === mode
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D WebGL/Canvas */}
            <div className="flex-1 min-h-0 w-full relative">
              <DigitalTwinScene currentCondition={activeCondition} />
            </div>

            {/* Viewport Info Overlay (Bottom Left) */}
            <div className="absolute bottom-4 left-4 font-mono text-[9px] text-slate-500 flex items-center gap-4 bg-black/40 px-2 py-1 rounded">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                SYSTEM_INTEGRITY: 99.8%
              </span>
              <span>CAMERA: PERSPECTIVE (FOV 400)</span>
            </div>

            {/* Viewport Info Overlay (Bottom Right) */}
            <div className="absolute bottom-4 right-4 font-mono text-[9px] text-slate-500 bg-black/40 px-2 py-1 rounded flex items-center gap-2">
              <span>SCAN_LINE: ACTIVE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          </div>

        </section>

        {/* Right Sidebar - System Activity Log & Controls */}
        <section className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">

          {/* Neural Network Stress Meter (Right, Center) */}
          <div className="glass-panel p-4 rounded flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>NEURAL NODE STRESS INDEX</span>
              <span className={`font-semibold ${
                CONDITIONS[activeCondition].stress > 70 ? 'text-red-500' :
                CONDITIONS[activeCondition].stress > 40 ? 'text-amber-500' : 'text-emerald-400'
              }`}>
                {CONDITIONS[activeCondition].stress}%
              </span>
            </div>
            {/* styled bar */}
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  CONDITIONS[activeCondition].stress > 70 ? 'bg-red-500 shadow-[0_0_8px_#ff2b56]' :
                  CONDITIONS[activeCondition].stress > 40 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-400 shadow-[0_0_8px_#00ffaa]'
                }`}
                style={{ width: `${CONDITIONS[activeCondition].stress}%` }}
              ></div>
            </div>
            <span className="text-[8px] font-mono text-slate-500 mt-1">
              Warning threshold activates at 70%. Currently evaluated as {
                CONDITIONS[activeCondition].stress > 70 ? 'STRESS OVERLOAD' :
                CONDITIONS[activeCondition].stress > 40 ? 'ELEVATED LOAD' : 'SAFE / CALM'
              }.
            </span>
          </div>

          {/* System Ticker Activity Logs (Right, Lower) */}
          <div className="glass-panel flex-1 min-h-[150px] p-4 rounded flex flex-col gap-2 overflow-hidden">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              SYNAPSE LOGGER
            </h3>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 font-mono text-[9px] text-slate-500 scrollbar-none">
              {tickerLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2 leading-tight border-b border-white/[0.02] pb-1 animate-fade-in">
                  <span className="text-emerald-500/60 font-semibold select-none">&gt;</span>
                  <span className={
                    log.includes('CRITICAL') || log.includes('WARNING') || log.includes('Alert') || log.includes('Crisis') || log.includes('instability')
                      ? 'text-red-400' 
                      : log.includes('SUCCESS') || log.includes('integrity') || log.includes('calibrated')
                      ? 'text-emerald-400/80' 
                      : 'text-slate-400'
                  }>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Controls (Right, Bottom) */}
          <div className="glass-panel p-4 rounded flex flex-col gap-2.5">
            <button
              onClick={() => {
                if (audioEnabled) {
                  playPulseSound(1200, 0.25, 0.05)
                }
                const oldLog = tickerLogs
                setTickerLogs(['Calibration initiated...', 'Node pinging... SUCCESS', ...oldLog])
              }}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-semibold tracking-widest uppercase rounded cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3 h-3" />
              RECALIBRATE NODES
            </button>

            <button
              onClick={() => {
                useTelemetryStore.getState().setCurrentCondition('diabetes')
                if (audioEnabled) {
                  playPulseSound(440, 0.4, 0.08)
                }
              }}
              className="w-full py-2 bg-white/2 hover:bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 font-mono text-[10px] font-semibold tracking-widest uppercase rounded cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              RESET BASELINE
            </button>

            <button
              onClick={() => {
                useTelemetryStore.getState().setCustomZoomTarget(null)
                useTelemetryStore.getState().setSelectedOrgan('none')
                if (audioEnabled) {
                  playPulseSound(600, 0.3, 0.05)
                }
              }}
              className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-mono text-[10px] font-semibold tracking-widest uppercase rounded cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3 h-3" />
              RECALIBRATE VIEW
            </button>
          </div>

        </section>

      </main>

      {/* Bottom Panel - Wide Scrolling Waveform Streams */}
      <section className="h-52 border-t border-white/5 bg-[#050807]/95 p-4 flex flex-col gap-2 z-10">
        <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-500 tracking-wider">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              PHYSIOLOGICAL DATA STREAM (REAL-TIME)
            </span>
            <span>CHANNELS: 3-INPUTS</span>
            <span>BUFFER: 800 samples</span>
            <span>FREQ: 60Hz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-emerald-400 font-semibold uppercase">LINK_STABLE</span>
          </div>
        </div>

        {/* Waveform streaming canvas viewport */}
        <div className="flex-1 rounded border border-white/5 bg-[#030605] overflow-hidden relative shadow-[inset_0_0_15px_rgba(0,0,0,0.7)]">
          <canvas ref={graphCanvasRef} className="w-full h-full block bg-transparent" />
        </div>
      </section>

    </div>
  )
}
