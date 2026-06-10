'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { useTelemetry } from '@/lib/useTelemetry'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number
  time: string
  level: 'INFO' | 'WARN' | 'ALERT' | 'OK' | 'SYS'
  msg: string
}

type Status = 'ok' | 'warn' | 'critical'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  cyan:     '#00d4ff',
  green:    '#00e599',
  amber:    '#f59e0b',
  red:      '#ff3b5c',
  violet:   '#8b5cf6',
  rose:     '#f43f5e',
  slate:    'rgba(255,255,255,0.06)',
  muted:    '#64748b',
  subtle:   '#334155',
  fg:       '#e2e8f0',
} as const

const STATUS: Record<Status, string> = {
  ok: C.green, warn: C.amber, critical: C.red,
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Configs
// ─────────────────────────────────────────────────────────────────────────────

const TRACK_CONFIGS = {
  ASTRONAUT: {
    title: "EXTRAVEHICULAR ACTIVITY (EVA) LIFE-SUPPORT PROTOCOL",
    themeColor: C.violet,
    chart2Label: "Suit Pressure (PSI)",
    metricUnit: "PSI",
    baseEnvVal: 4.3,
    crisisDelta: -0.15,
    terminalLogs: ["[SYSTEM] EVA telemetry locked.", "[LIFE-SUPPORT] Suit pressure balancing."],
    overrideMsg: "AUTOMATED OVERRIDE: INITIATING EMERGENCY SUIT RE-PRESSURIZATION"
  },
  PILOT: {
    title: "FLIGHT DECK BIOMETRIC TELEMETRY CONSOLE",
    themeColor: C.cyan,
    chart2Label: "Cabin Altitude (FT)",
    metricUnit: "FT",
    baseEnvVal: 8000,
    crisisDelta: 450,
    terminalLogs: ["[AVIONICS] Autopilot standby.", "[CABIN] Monitoring cabin pressure matrix."],
    overrideMsg: "AUTOMATED PILOT OVERRIDE: INITIATING EMERGENCY FLIGHT DESCENT RADIAN"
  },
  SURGEON: {
    title: "TELE-ROBOTIC SURGERY CONTROL MATRIX",
    themeColor: C.green,
    chart2Label: "Hand Tremor Index (mm)",
    metricUnit: "mm",
    baseEnvVal: 0.02,
    crisisDelta: 0.04,
    terminalLogs: ["[ROBOTIC] Multi-axis actuators calibrated.", "[SENSE] Micro-force feedback active."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING ROBOTIC STABILIZATION DAMPERS"
  },
  TRAIN_PILOT: {
    title: "LOCOMOTIVE TRAFFIC OVERWATCH NETWORK",
    themeColor: C.amber,
    chart2Label: "Cognitive Latency (ms)",
    metricUnit: "ms",
    baseEnvVal: 210,
    crisisDelta: 85,
    terminalLogs: ["[SIGNAL] ATS-Inductor channel linked.", "[BRAKES] Pneumatic line pressure nominal."],
    overrideMsg: "AUTOMATED OVERRIDE: ENGAGING EMERGENCY PNEUMATIC BRAKES"
  },
  TRUCKER: {
    title: "LONG-HAUL LOGISTICS SWARM RADAR",
    themeColor: C.rose,
    chart2Label: "Driver Focus Index (%)",
    metricUnit: "%",
    baseEnvVal: 95,
    crisisDelta: -4.0,
    terminalLogs: ["[SWARM] V2V Mesh network established.", "[FLEET] Proximity safety margins active."],
    overrideMsg: "FLEET PLATOON WARNING: EXECUTING DISTRIBUTED V2V SHOULDER PULL-OVER"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Metrics (Biomarkers & Sensors schema)
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_METRICS = {
  TRAIN_PILOT: [
    { label: 'PERCLOS', sublabel: 'Infrared Pupil Tracking', key: 'perclos', unit: '%', precision: 1, min: 0, max: 35, warnAt: '10%', critAt: '15%' },
    { label: 'Heart Rate', sublabel: 'Capacitive Throttle', key: 'heartRate', unit: 'bpm', precision: 0, min: 40, max: 150, warnAt: '110', critAt: '120' },
    { label: 'Micro-Corrections', sublabel: 'Steering Activity', key: 'microCorrections', unit: '/min', precision: 0, min: 0, max: 60, warnAt: '25', critAt: '15' },
    { label: 'Fatigue Index', sublabel: 'Risk Calculation', key: 'fatigueIndex', unit: '', precision: 2, min: 0, max: 30, warnAt: '10.0', critAt: '15.0' }
  ],
  PILOT: [
    { label: 'Blood Oxygen', sublabel: 'Helmet Sensor', key: 'spO2', unit: '% SpO₂', precision: 1, min: 50, max: 100, warnAt: '90%', critAt: '83%' },
    { label: 'G-Force', sublabel: 'Helmet Accel.', key: 'gForce', unit: 'G', precision: 1, min: 0, max: 10, warnAt: '6.0', critAt: '7.5' },
    { label: 'Pulse Wave TT', sublabel: 'Earlobe PWTT', key: 'pwtt', unit: 'ms', precision: 0, min: 180, max: 450, warnAt: '300', critAt: '350' },
    { label: 'Desat Velocity', sublabel: 'spO₂ Decay Rate', key: 'spO2Desat', unit: '%/min', precision: 1, min: 0, max: 25, warnAt: '5.0', critAt: '10.0' }
  ],
  ASTRONAUT: [
    { label: 'Respir. Volume', sublabel: 'Transthoracic Imp.', key: 'transthoracicImpedance', unit: '% vol', precision: 1, min: 20, max: 100, warnAt: '60%', critAt: '45%' },
    { label: 'Carbon Dioxide', sublabel: 'Helmet pCO₂', key: 'pCO2', unit: 'mmHg', precision: 1, min: 0, max: 15, warnAt: '6.0', critAt: '8.0' },
    { label: 'Suit Pressure', sublabel: 'EVA Life Support', key: 'suitPressure', unit: 'PSI', precision: 2, min: 2.5, max: 5.0, warnAt: '4.0', critAt: '3.8' },
    { label: 'Scrubber Flow', sublabel: 'O₂ Scrubber Loop', key: 'scrubberFlow', unit: 'L/min', precision: 1, min: 0, max: 10, warnAt: '3.5', critAt: '2.0' }
  ],
  SURGEON: [
    { label: 'Tremor Amp.', sublabel: '8Hz Frequency FFT', key: 'tremorAmplitude', unit: 'mm', precision: 3, min: 0.0, max: 0.3, warnAt: '0.08', critAt: '0.12' },
    { label: 'Electrodermal Act.', sublabel: 'EDA conductance', key: 'eda', unit: 'µS', precision: 2, min: 0, max: 12, warnAt: '4.0', critAt: '5.0' },
    { label: 'Robotic Grip', sublabel: 'Actuator Force', key: 'gripForce', unit: 'N', precision: 1, min: 0, max: 20, warnAt: '5.0', critAt: '3.0' },
    { label: 'Tremor Freq', sublabel: 'FFT Peak Freq', key: 'tremorFreq', unit: 'Hz', precision: 1, min: 0, max: 12, warnAt: '5.5', critAt: '7.5' }
  ],
  TRUCKER: [
    { label: 'HRV LF/HF Ratio', sublabel: 'Sympathetic Stress', key: 'hrvRatio', unit: '', precision: 2, min: 0.2, max: 5.0, warnAt: '1.5', critAt: '1.0' },
    { label: 'Grip Asymmetry', sublabel: 'Smart Seat/Wheel', key: 'gripAsymmetry', unit: '%', precision: 1, min: 0, max: 100, warnAt: '20%', critAt: '35%' },
    { label: 'V2V Link Quality', sublabel: 'Platoon Mesh', key: 'v2vLink', unit: 'dBm', precision: 0, min: -100, max: -40, warnAt: '-80', critAt: '-88' },
    { label: 'Alertness Index', sublabel: 'Swarm Analysis', key: 'alertness', unit: '%', precision: 1, min: 0, max: 100, warnAt: '75%', critAt: '65%' }
  ]
} as const;

const PROFILE_HARDWARE = {
  TRAIN_PILOT: [
    { label: 'IR Eye-Tracking Camera', value: 'SCANNING' },
    { label: 'Capacitive Throttle', value: 'ENGAGED' }
  ],
  PILOT: [
    { label: 'Headset Oximeter', value: 'COUPLED' },
    { label: 'Helmet Accel.', value: 'ACTIVE' }
  ],
  ASTRONAUT: [
    { label: 'Garment Impedance Sensor', value: 'CALIBRATED' },
    { label: 'Helmet CO₂ Gas Sensor', value: 'NOMINAL' }
  ],
  SURGEON: [
    { label: 'Robotic Tool IMU Sensor', value: 'ENGAGED' },
    { label: 'Wrist EDA Panic Sensor', value: 'CONNECTED' }
  ],
  TRUCKER: [
    { label: 'Smart Seat Fabric Wrap', value: 'ACTIVE' },
    { label: 'V2V Platoon Mesh Antenna', value: 'MESHED' }
  ]
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number, p = 1) { return n.toFixed(p) }

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

function classify(v: number, warn: number, crit: number, dir: 'lo' | 'hi'): Status {
  if (dir === 'lo') return v <= crit ? 'critical' : v <= warn ? 'warn' : 'ok'
  return v >= crit ? 'critical' : v >= warn ? 'warn' : 'ok'
}

function pct(v: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedValue
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedValue({ value, precision = 1 }: { value: number; precision?: number }) {
  const sp = useSpring(value, { stiffness: 50, damping: 16 })
  const tx = useTransform(sp, (v) => v.toFixed(precision))
  const [str, setStr] = useState(value.toFixed(precision))
  useEffect(() => { sp.set(value) }, [value, sp])
  useEffect(() => tx.on('change', setStr), [tx])
  return <>{str}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-Interactions: ScrambleText & Magnetic
// ─────────────────────────────────────────────────────────────────────────────

function ScrambleText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text)
  const chars = '!<>-_\\\\/[]{}—=+*^?#________'
  
  useEffect(() => {
    let frame = 0
    const len = text.length
    let timer: number

    const update = () => {
      let output = ''
      let complete = 0
      for (let i = 0; i < len; i++) {
        if (frame >= i * 2) {
          output += text[i]
          complete++
        } else {
          output += chars[Math.floor(Math.random() * chars.length)]
        }
      }
      setDisplay(output)
      if (complete === len) return
      frame += 1.5
      timer = requestAnimationFrame(update)
    }

    timer = requestAnimationFrame(update)
    return () => cancelAnimationFrame(timer)
  }, [text])

  return <>{display}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Glassmorphism Panel
// ─────────────────────────────────────────────────────────────────────────────

function GlassPanel({ children, className = '', style = {}, tilt = false }: any) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 400, damping: 30 })
  const y = useSpring(0, { stiffness: 400, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    if (!tilt) return
    x.set(0)
    y.set(0)
  }

  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6])

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-panel ${tilt ? 'glass-panel-tilt' : ''} ${className}`}
      style={{
        ...style,
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
      }}
    >
      {children}
    </motion.div>
  )
}

function Magnetic({ children }: { children: React.ReactElement }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 200, damping: 15, mass: 0.1 })
  const y = useSpring(0, { stiffness: 200, damping: 15, mass: 0.1 })

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    x.set(middleX * 0.15)
    y.set(middleY * 0.15)
  }

  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={reset} style={{ x, y, display: 'inline-block' }}>
      {children}
    </motion.div>
  )
}

function TypewriterText({ text, delay = 0, speed = 20 }: { text: string; delay?: number; speed?: number }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let index = 0;
    setDisplay('');

    const start = () => {
      timeout = setInterval(() => {
        if (index < text.length) {
          setDisplay((prev) => prev + text.charAt(index));
          index++;
        } else {
          clearInterval(timeout);
        }
      }, speed);
    };

    const initialDelay = setTimeout(start, delay);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(timeout);
    };
  }, [text, delay, speed]);

  return <>{display}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing Background — DPR-aware particle mesh with theme-colored connections
// ─────────────────────────────────────────────────────────────────────────────

function LandingBackground({ themeColor = '#00d4ff' }: { themeColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', resize)
    resize()

    const particles: {x: number, y: number, vx: number, vy: number, size: number, phase: number}[] = []
    const particleCount = Math.min(100, Math.floor((width * height) / 9000))
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2
      })
    }

    let t = 0
    let raf: number

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `${r},${g},${b}`
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      t += 0.003

      const rgb = hexToRgb(themeColor)

      // Draw connections first (behind particles)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.12
            ctx.strokeStyle = `rgba(${rgb},${alpha})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.phase)
        const alpha = 0.15 + pulse * 0.2

        ctx.fillStyle = `rgba(${rgb},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + pulse * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [themeColor])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, background: '#000000' }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ECG
// ─────────────────────────────────────────────────────────────────────────────

function ECG({ 
  crisis, 
  hr, 
  width = 420, 
  height = 120, 
  glow = true,
  audioEnabled = false,
  sound = false,
  audioCtx = null,
  volume = 0.5,
  onBeat
}: { 
  crisis: boolean; 
  hr: number; 
  width?: number; 
  height?: number; 
  glow?: boolean;
  audioEnabled?: boolean;
  sound?: boolean;
  audioCtx?: any;
  volume?: number;
  onBeat?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const xRef = useRef(0)
  const yHistory = useRef<Float32Array | null>(null)
  const phaseRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2
    const W = width
    const H = height
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(dpr, dpr)

    if (!yHistory.current || yHistory.current.length !== W) {
      yHistory.current = new Float32Array(W).fill(H / 2)
    }

    const midY = H / 2
    const ampScale = H / 120
    const color = crisis ? '#ff3b5c' : '#00ffaa'
    const glowRgba = crisis ? 'rgba(255,59,92,' : 'rgba(0,255,170,'

    // Clear to pure black on init
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    const gauss = (amp: number, center: number, width: number, t: number) => {
      return amp * Math.exp(-Math.pow((t - center) / width, 2))
    }

    let lastTime = performance.now()

    const tick = (time: number) => {
      const dt = time - lastTime
      lastTime = time
      const safeDt = Math.max(0, Math.min(dt, 50))

      const bpm = hr || 75
      const beatDurationMs = 60000 / bpm
      const T_active = Math.min(600, beatDurationMs * 0.8)
      const phaseAdvance = safeDt / beatDurationMs
      
      const oldPhase = phaseRef.current
      phaseRef.current += phaseAdvance
      const newPhase = phaseRef.current

      // Sweep speed: cross the screen in 3.5 seconds
      const sweepSpeed = W / 3500
      const dx = sweepSpeed * safeDt
      
      const oldX = xRef.current >= W ? 0 : xRef.current
      let scanX = oldX + dx
      if (scanX >= W) scanX %= W

      // Physiological model evaluator
      const evaluateEcg = (p: number) => {
        const tInBeat = (p % 1) * beatDurationMs
        let offset = 0
        if (tInBeat <= T_active) {
          const theta = tInBeat / T_active
          offset += gauss(-4.5, 0.20, 0.04, theta) // P
          offset += gauss(4.0, 0.38, 0.015, theta) // Q
          offset += gauss(-48.0, 0.42, 0.012, theta) // R
          offset += gauss(12.0, 0.46, 0.018, theta) // S
          offset += gauss(-9.0, 0.72, 0.07, theta) // T
          offset += gauss(-0.8, 0.88, 0.04, theta) // U
        }
        offset *= ampScale
        
        // Use the absolute time corresponding to the phase p for continuous wander and tremor
        const absTime = p * beatDurationMs
        const wander = Math.sin(absTime / 2200) * 2.0 * ampScale
        
        const noiseAmp = crisis ? 1.5 * ampScale : 0.25 * ampScale
        const noise = (
          Math.sin(absTime * 0.15) * 0.5 + 
          Math.sin(absTime * 0.28) * 0.3 + 
          Math.sin(absTime * 0.45) * 0.2
        ) * noiseAmp
        
        return midY + offset + wander + noise
      }

      // Fill oscilloscope memory buffer with sub-pixel precision
      const hist = yHistory.current
      if (!hist) return

      const startIdx = Math.floor(oldX)
      const endIdx = Math.floor(scanX)

      if (endIdx >= startIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          const f = (endIdx === startIdx) ? 1.0 : (i - oldX) / (scanX - oldX)
          const p = oldPhase + f * (newPhase - oldPhase)
          hist[i] = evaluateEcg(p)
        }
      } else {
        const totalDist = W - oldX + scanX
        for (let i = startIdx; i < W; i++) {
          const f = (totalDist === 0) ? 1.0 : (i - oldX) / totalDist
          const p = oldPhase + f * (newPhase - oldPhase)
          hist[i] = evaluateEcg(p)
        }
        for (let i = 0; i <= endIdx; i++) {
          const f = (totalDist === 0) ? 1.0 : (W + i - oldX) / totalDist
          const p = oldPhase + f * (newPhase - oldPhase)
          hist[i] = evaluateEcg(p)
        }
      }

      ctx.clearRect(0, 0, W, H)

      // Draw high-tech background grid
      if (height >= 40) {
        ctx.save()
        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.012)' : 'rgba(0, 255, 170, 0.012)'
        ctx.lineWidth = 0.3
        for (let gx = 0; gx < W; gx += 4) {
          if (gx % 16 === 0) continue
          ctx.beginPath()
          ctx.moveTo(gx, 0)
          ctx.lineTo(gx, H)
          ctx.stroke()
        }
        for (let gy = 0; gy < H; gy += 4) {
          if (gy % 16 === 0) continue
          ctx.beginPath()
          ctx.moveTo(0, gy)
          ctx.lineTo(W, gy)
          ctx.stroke()
        }

        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.04)' : 'rgba(0, 255, 170, 0.04)'
        ctx.lineWidth = 0.5
        for (let gx = 0; gx < W; gx += 16) {
          ctx.beginPath()
          ctx.moveTo(gx, 0)
          ctx.lineTo(gx, H)
          ctx.stroke()
        }
        for (let gy = 0; gy < H; gy += 16) {
          ctx.beginPath()
          ctx.moveTo(0, gy)
          ctx.lineTo(W, gy)
          ctx.stroke()
        }

        ctx.strokeStyle = crisis ? 'rgba(255, 59, 92, 0.08)' : 'rgba(0, 255, 170, 0.08)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(0, midY)
        ctx.lineTo(W, midY)
        ctx.stroke()
        ctx.restore()
      }

      // Draw razor-sharp sweeping vector trail
      const gapWidth = Math.max(12, W * 0.06)
      const head = Math.floor(scanX)
      const tail = Math.floor((scanX + gapWidth) % W)

      const drawInterval = (start: number, end: number) => {
        if (start >= end) return

        // Create linear gradient for this interval
        const grad = ctx.createLinearGradient(start, 0, end, 0)
        
        // Calculate opacities at start and end with tail-fade to 0
        const getOpacity = (x: number) => {
          let age = scanX - x
          if (age < 0) age += W
          const maxAge = W - gapWidth
          if (age >= maxAge) return 0
          
          const expDecay = Math.exp(-age / (W * 0.35))
          const fadeDist = 40
          const tailFade = Math.min(1, (maxAge - age) / fadeDist)
          return expDecay * tailFade
        }

        const opacityStart = getOpacity(start)
        const opacityEnd = getOpacity(end)

        const colorStart = crisis ? `rgba(255, 59, 92, ${opacityStart})` : `rgba(0, 255, 170, ${opacityStart})`
        const colorEnd = crisis ? `rgba(255, 59, 92, ${opacityEnd})` : `rgba(0, 255, 170, ${opacityEnd})`

        grad.addColorStop(0, colorStart)
        grad.addColorStop(1, colorEnd)

        // Draw path
        ctx.beginPath()
        ctx.moveTo(start, hist[start])
        for (let i = start + 1; i <= end; i++) {
          ctx.lineTo(i, hist[i])
        }
        
        // Glow pass
        if (glow) {
          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth = Math.max(2.5, 4.5 * ampScale)
          ctx.shadowBlur = 10 * ampScale
          ctx.shadowColor = color
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
          ctx.restore()
        }

        // Core sharp pass
        ctx.save()
        ctx.strokeStyle = grad
        ctx.lineWidth = Math.max(1.2, 1.8 * ampScale)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.restore()
      }

      if (tail <= head) {
        drawInterval(tail, head)
      } else {
        drawInterval(tail, W - 1)
        drawInterval(0, head)
      }

      // Draw PQRST labels exactly at visible beat peaks
      if (height >= 60) {
        const minPhase = phaseRef.current - (W / sweepSpeed) / beatDurationMs
        const maxPhase = phaseRef.current
        const minBeat = Math.ceil(minPhase)
        const maxBeat = Math.floor(maxPhase)

        const labels = [
          { name: 'P', relPhase: 0.20, yOffset: -9 * ampScale },
          { name: 'Q', relPhase: 0.38, yOffset: 6 * ampScale },
          { name: 'R', relPhase: 0.42, yOffset: -14 * ampScale },
          { name: 'S', relPhase: 0.46, yOffset: 9 * ampScale },
          { name: 'T', relPhase: 0.72, yOffset: -9 * ampScale }
        ]

        for (let b = minBeat - 1; b <= maxBeat + 1; b++) {
          for (const l of labels) {
            const p = b + (l.relPhase * T_active / beatDurationMs)
            if (p >= minPhase && p <= maxPhase) {
              const agePhase = phaseRef.current - p
              const ageMs = agePhase * beatDurationMs
              const ageX = ageMs * sweepSpeed
              let x = scanX - ageX
              while (x < 0) x += W
              while (x >= W) x -= W

              let agePixels = scanX - x
              if (agePixels < 0) agePixels += W

              if (agePixels <= W - gapWidth) {
                const opacity = Math.exp(-agePixels / (W * 0.45))
                if (opacity > 0.15) {
                  const idx = Math.round(x)
                  const labelY = hist[idx] !== undefined ? hist[idx] : midY
                  
                  ctx.save()
                  ctx.font = 'bold 7.5px var(--font-mono), Courier, monospace'
                  ctx.fillStyle = crisis ? `rgba(255, 59, 92, ${opacity * 0.85})` : `rgba(0, 255, 170, ${opacity * 0.85})`
                  ctx.textAlign = 'center'
                  ctx.shadowBlur = 4 * opacity
                  ctx.shadowColor = color
                  ctx.fillText(l.name, x, labelY + l.yOffset)
                  ctx.restore()
                }
              }
            }
          }
        }
      }

      // Check audio trigger (crossed R wave at rWaveTime ms in the beat)
      const rWaveTime = 0.42 * T_active
      const oldBeats = Math.floor(oldPhase)
      const newBeats = Math.floor(newPhase)
      const oldT = (oldPhase % 1) * beatDurationMs
      const newT = (newPhase % 1) * beatDurationMs
      
      let crossedR = false
      if (oldBeats === newBeats) {
        if (oldT < rWaveTime && newT >= rWaveTime) crossedR = true
      } else {
        if (oldT < rWaveTime || newT >= rWaveTime) crossedR = true
      }

      if (crossedR) {
        if (sound && onBeat) onBeat()
        if (sound && audioEnabled && audioCtx) {
          try {
            if (audioCtx.state === 'suspended') audioCtx.resume()
            const gainNode = audioCtx.createGain()
            
            if (crisis) {
              const duration = 0.09
              gainNode.gain.setValueAtTime(0.12 * volume, audioCtx.currentTime)
              gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration)
              gainNode.connect(audioCtx.destination)

              const osc1 = audioCtx.createOscillator()
              osc1.type = 'sine'
              osc1.frequency.setValueAtTime(960, audioCtx.currentTime)
              osc1.frequency.exponentialRampToValueAtTime(840, audioCtx.currentTime + 0.02)
              osc1.connect(gainNode)
              osc1.start()
              osc1.stop(audioCtx.currentTime + duration)

              const osc2 = audioCtx.createOscillator()
              osc2.type = 'sine'
              osc2.frequency.setValueAtTime(1005, audioCtx.currentTime)
              osc2.frequency.exponentialRampToValueAtTime(885, audioCtx.currentTime + 0.02)
              osc2.connect(gainNode)
              osc2.start()
              osc2.stop(audioCtx.currentTime + duration)
            } else {
              const duration = 0.06
              gainNode.gain.setValueAtTime(0.08 * volume, audioCtx.currentTime)
              gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration)
              gainNode.connect(audioCtx.destination)

              const osc = audioCtx.createOscillator()
              osc.type = 'sine'
              osc.frequency.setValueAtTime(640, audioCtx.currentTime)
              osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.015)
              osc.connect(gainNode)
              osc.start()
              osc.stop(audioCtx.currentTime + duration)
            }
          } catch (e) {}
        }
      }

      // Draw Leading Dot / Core
      const dotY = hist[Math.floor(scanX)] || midY
      if (glow) {
        ctx.save()
        const bloomRadius = 10 * ampScale
        const grad = ctx.createRadialGradient(scanX, dotY, 0, scanX, dotY, bloomRadius)
        grad.addColorStop(0, glowRgba + '0.55)')
        grad.addColorStop(1, glowRgba + '0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(scanX, dotY, bloomRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.beginPath()
      ctx.arc(scanX, dotY, Math.max(1.5, 3 * ampScale), 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      if (glow) {
        ctx.shadowBlur = 24 * ampScale
        ctx.shadowColor = color
      }
      ctx.fill()
      ctx.restore()

      xRef.current = scanX
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animRef.current)
  }, [crisis, hr, width, height, glow, audioEnabled, sound, audioCtx, volume, onBeat])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-sm animate-pulse-slow"
      style={{
        width,
        height,
        display: 'block',
        background: '#000000',
        borderRadius: 4,
        boxShadow: glow 
          ? (crisis
            ? '0 0 20px rgba(255,59,92,0.15), inset 0 0 30px rgba(255,59,92,0.04)'
            : '0 0 20px rgba(0,255,170,0.08), inset 0 0 30px rgba(0,255,170,0.02)')
          : 'none',
        border: '1px solid rgba(255,255,255,0.04)'
      }}
    />
  )
}

function Gyroscope({ isAstronaut }: { isAstronaut: boolean }) {
  if (!isAstronaut) return null;
  return (
    <div className="absolute top-4 right-[34%] z-10 opacity-70 pointer-events-none">
      <motion.svg width="80" height="80" viewBox="0 0 60 60"
        animate={{ rotate: [0, 15, -10, 5, 0], x: [0, 5, -3, 0], y: [0, -4, 2, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="30" cy="30" r="28" fill="none" stroke={C.violet} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="30" y1="5" x2="30" y2="55" stroke={C.violet} strokeWidth="0.5" />
        <line x1="5" y1="30" x2="55" y2="30" stroke={C.violet} strokeWidth="0.5" />
        <circle cx="30" cy="30" r="10" fill="none" stroke={C.violet} strokeWidth="1" />
      </motion.svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Track-Specific Visualizers
// ─────────────────────────────────────────────────────────────────────────────

function TrainPilotEyeTracker({ crisis, perclos }: { crisis: boolean; perclos: number }) {
  // Pupil scale decreases and Y offset increases as PERCLOS (eye closure ratio) rises
  const baseScale = Math.max(0.3, 1.0 - (perclos / 35) * 0.65)
  const baseY = (perclos / 35) * 8.0
  
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>IR Pupil Console</span>
        <span style={{ color: crisis ? C.red : perclos > 10 ? C.amber : C.green }}>
          {crisis ? 'MICRO-SLEEP DETECTED' : perclos > 10 ? 'DROWSINESS WARNING' : 'PERCLOS NOMINAL'}
        </span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        <svg width="90" height="34" viewBox="0 0 80 40" className="opacity-30">
          <path d="M 10,20 Q 40,2 70,20 Q 40,38 10,20 Z" fill="none" stroke={crisis ? C.red : perclos > 10 ? C.amber : C.green} strokeWidth="1" />
          <circle cx="40" cy="20" r="12" fill="none" stroke={crisis ? C.red : perclos > 10 ? C.amber : C.green} strokeWidth="0.8" strokeDasharray="3 3" />
        </svg>

        <motion.div 
          className="absolute w-4.5 h-4.5 rounded-full flex items-center justify-center"
          style={{ 
            background: crisis ? 'rgba(255,59,92,0.18)' : perclos > 10 ? 'rgba(245,158,11,0.15)' : 'rgba(0,255,170,0.12)',
            border: `1.2px solid ${crisis ? C.red : perclos > 10 ? C.amber : C.green}` 
          }}
          animate={crisis ? { 
            y: 10,
            scale: 0.3,
            boxShadow: '0 0 10px #ff3b5c'
          } : {
            y: [baseY, baseY + 1.5, baseY - 1.5, baseY],
            x: [0, 2.5, -2.5, 0],
            scale: baseScale,
            boxShadow: perclos > 10 ? '0 0 6px rgba(245,158,11,0.2)' : '0 0 5px rgba(0,255,170,0.25)'
          }}
          transition={crisis ? { duration: 0.3 } : {
            y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
            x: { repeat: Infinity, duration: 4.5, ease: 'easeInOut' }
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </motion.div>

        {crisis && (
          <motion.div 
            className="absolute inset-0 bg-red-950/20 flex items-center justify-center text-[7.5px] font-mono font-bold text-red-500"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            ALERT: PUPIL LOCK LOSS
          </motion.div>
        )}
      </div>
    </div>
  )
}

function PilotGForceReticle({ crisis, gForce }: { crisis: boolean; gForce: number }) {
  const yOffset = crisis ? 14 : (gForce - 1) * 4.5
  
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>Attitude vector</span>
        <span style={{ color: crisis ? C.red : gForce > 5 ? C.amber : C.green }}>
          {crisis ? 'AUTO-GCAS ACTIVE' : gForce > 5 ? 'HIGH G WARNING' : 'NOMINAL SECTOR'}
        </span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        {/* Crosshair grids */}
        <div className="absolute w-px h-[50px] bg-slate-800/25" />
        <div className="absolute w-[120px] h-px bg-slate-800/25" />
        <div className="absolute w-10 h-10 border border-slate-800/15 rounded-full" />
        
        <motion.div 
          className="absolute w-2 h-2 rounded-full"
          style={{ background: crisis ? C.red : gForce > 5 ? C.amber : C.cyan }}
          animate={crisis ? {
            x: [0, -4, 4, -2, 2, 0], // Shaking under extreme G-force lockout
            y: yOffset,
            boxShadow: '0 0 10px #ff3b5c'
          } : {
            x: [0, 2, -2, 1, -1, 0], // Subtle turbulence drift
            y: yOffset,
            boxShadow: gForce > 5 ? '0 0 8px #f59e0b' : '0 0 6px #00d4ff'
          }}
          transition={crisis ? {
            x: { repeat: Infinity, duration: 0.12, ease: 'linear' },
            y: { duration: 0.3 }
          } : {
            x: { repeat: Infinity, duration: 3.0, ease: 'easeInOut' },
            y: { duration: 0.3 }
          }}
        />

        {crisis && (
          <motion.div 
            className="absolute flex flex-col items-center"
            style={{ bottom: 4 }}
            animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <span className="text-[7px] font-mono font-bold text-red-500">PULL UP</span>
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none" stroke={C.red} strokeWidth="1.5">
              <path d="M 4,7 L 4,1 M 1,4 L 4,1 L 7,4" />
            </svg>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function AstronautPressureVent({ crisis, pressure }: { crisis: boolean; pressure: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mb-1">
        <span>Suit pressure</span>
        <span style={{ color: crisis ? C.red : C.green }}>{crisis ? 'EMERGENCY VENTING' : 'SEALS INTEGRAL'}</span>
      </div>
      <div className="relative w-full h-[62px] flex items-center justify-center bg-slate-950/40 border border-slate-900/60 rounded-sm overflow-hidden">
        {crisis && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-cyan-400"
                style={{ left: '58%', top: '50%' }}
                animate={{ 
                  x: [0, 16 + Math.random() * 12], 
                  y: [0, (i - 2) * 5 + (Math.random() * 2 - 1)],
                  opacity: [1, 0],
                  scale: [1.2, 0.4]
                }}
                transition={{ 
                  duration: 0.5 + Math.random() * 0.3, 
                  repeat: Infinity,
                  delay: i * 0.08
                }}
              />
            ))}
          </div>
        )}

        <svg width="50" height="50" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
          <motion.circle 
            cx="30" cy="30" r="22" 
            fill="none" 
            stroke={crisis ? C.red : C.cyan} 
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 22}
            animate={{ strokeDashoffset: (2 * Math.PI * 22) * (1 - Math.min(1, pressure / 4.3)) }}
            transition={{ duration: 0.4 }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center font-mono">
          <span className="text-[10px] font-bold text-slate-200">{pressure.toFixed(2)}</span>
          <span className="text-[6px] text-slate-500">PSI</span>
        </div>
      </div>
    </div>
  )
}

function SurgeonFFTSpectrum({ crisis, tremorAmp, tremorFreq }: { crisis: boolean; tremorAmp: number; tremorFreq: number }) {
  const freqs = [1, 2, 4, 6, 8, 10, 12, 14]
  
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
        <span>FFT Spectrum</span>
        <span style={{ color: crisis ? C.red : C.green }}>{crisis ? 'SCALPEL LOCKED' : 'STABILIZED'}</span>
      </div>
      
      <div className="relative h-[62px] w-full flex items-end justify-between gap-0.5 border-b border-slate-900/60 px-1 pt-3 bg-slate-950/20 rounded-sm">
        {crisis && (
          <motion.div 
            className="absolute left-0 right-0 h-px bg-red-500/40 z-10" 
            style={{ bottom: '70%' }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <span className="absolute right-1 -top-1.5 text-[5px] text-red-400 font-bold">STABILIZER LIMIT</span>
          </motion.div>
        )}

        {freqs.map((f, i) => {
          // High-fidelity keyframe height array that repeats infinitely
          const heightKeyframes = crisis 
            ? (f === 8 ? [80, 96, 85, 92, 80] : f === 6 || f === 10 ? [30, 48, 35, 42, 30] : [8, 18, 11, 16, 8])
            : (f === 8 ? [15, 26, 18, 22, 15] : [6, 12, 8, 11, 6])

          const scale = crisis ? 1.0 : (tremorAmp || 0.02) / 0.025
          const scaledKeyframes = heightKeyframes.map(h => Math.min(100, Math.max(5, h * scale)))

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full bg-slate-900/40 rounded-t-xs relative overflow-hidden h-9">
                <motion.div 
                  className="absolute bottom-0 inset-x-0 rounded-t-xs"
                  style={{ background: crisis && f === 8 ? C.red : crisis ? C.amber : C.green }}
                  animate={{ height: scaledKeyframes.map(v => `${v}%`) }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.7 + (i * 0.08) % 0.5, // Desynchronize bars so they bounce independently
                    ease: 'easeInOut' 
                  }}
                />
              </div>
              <span className="text-[6px] text-slate-600 font-mono">{f}Hz</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TruckerPlatoonGap({ crisis, alertness }: { crisis: boolean; alertness: number }) {
  const isDrowsy = alertness < 80
  
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-black/45 border border-white/5 rounded-sm w-full mb-2">
      <div className="w-full flex items-center justify-between text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
        <span>V2V Platoon convoy</span>
        <span style={{ color: crisis ? C.red : isDrowsy ? C.amber : C.green }}>
          {crisis ? 'GAP EXPANDED (45m)' : isDrowsy ? 'DRIVER ALERTNESS WARNING' : 'DENSE CONVOY (15m)'}
        </span>
      </div>
      
      <div className="relative h-[62px] w-full bg-slate-950/40 border border-slate-900/60 rounded-sm flex items-center px-4 overflow-hidden">
        {/* Lane separator */}
        <div className="absolute inset-x-0 h-px border-t border-dashed border-slate-800/30" style={{ top: '48%' }} />
        
        {/* Lead Vehicle */}
        <div className="absolute left-2 flex flex-col items-center">
          <div className="w-6 h-3 bg-slate-700 rounded-xs flex items-center justify-center border border-slate-600 text-[5.5px] text-slate-300 font-bold">
            LEAD
          </div>
        </div>

        {/* Dynamic Distance Label */}
        <div className="absolute" style={{ left: '34%' }}>
          <motion.span 
            className="text-[6.5px] font-bold px-1 py-0.5 rounded-xs"
            style={{ 
              background: crisis ? 'rgba(255,59,92,0.1)' : isDrowsy ? 'rgba(245,158,11,0.08)' : 'rgba(0,255,170,0.05)',
              border: crisis ? '1px solid rgba(255,59,92,0.3)' : isDrowsy ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(0,255,170,0.2)',
              color: crisis ? C.red : isDrowsy ? C.amber : C.green
            }}
            animate={{ x: crisis ? 10 : 0 }}
          >
            {crisis ? '45m' : '15m'}
          </motion.span>
        </div>

        {/* Follower Vehicle */}
        <motion.div 
          className="absolute flex flex-col items-center"
          animate={crisis ? {
            left: '64%',
            y: [0, -1, 1, -1, 0] // Shake under emergency GCAS braking
          } : isDrowsy ? {
            left: ['47%', '53%', '47%'], // Weaving in lane due to micro-sleeps/drowsiness
            y: 0
          } : {
            left: '50%',
            y: 0
          }}
          transition={crisis ? {
            left: { type: 'spring', stiffness: 90, damping: 14 },
            y: { repeat: Infinity, duration: 0.2, ease: 'easeInOut' }
          } : isDrowsy ? {
            left: { repeat: Infinity, duration: 4.5, ease: 'easeInOut' }
          } : {
            left: { type: 'spring', stiffness: 90, damping: 14 }
          }}
        >
          <div className="w-6 h-3 bg-slate-800 rounded-xs flex items-center justify-center border text-[5.5px] text-slate-300 font-bold"
            style={{ borderColor: crisis ? C.red : isDrowsy ? C.amber : C.cyan }}
          >
            V2V-01
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function TrackVisualizer({ 
  trackKey, 
  crisis, 
  lastSample 
}: { 
  trackKey: keyof typeof TRACK_CONFIGS; 
  crisis: boolean; 
  lastSample: any 
}) {
  if (!lastSample) return null
  
  switch (trackKey) {
    case 'TRAIN_PILOT':
      return <TrainPilotEyeTracker crisis={crisis} perclos={lastSample.perclos || 0} />
    case 'PILOT':
      return <PilotGForceReticle crisis={crisis} gForce={lastSample.gForce || 1.0} />
    case 'ASTRONAUT':
      return <AstronautPressureVent crisis={crisis} pressure={lastSample.suitPressure || 4.3} />
    case 'SURGEON':
      return <SurgeonFFTSpectrum crisis={crisis} tremorAmp={lastSample.tremorAmplitude || 0.02} tremorFreq={lastSample.tremorFreq || 2.1} />
    case 'TRUCKER':
      return <TruckerPlatoonGap crisis={crisis} alertness={lastSample.alertness || 96.0} />
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Score Ring
// ─────────────────────────────────────────────────────────────────────────────

function HealthRing({ score, crisis }: { score: number; crisis: boolean }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = crisis ? C.red : score > 80 ? C.green : score > 60 ? C.amber : C.red

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke={C.slate} strokeWidth={5} />
          <motion.circle
            cx="38" cy="38" r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 0, 0, 1] }}
            style={{ transformOrigin: '38px 38px', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-semibold leading-none" style={{ color }}>
            <AnimatedValue value={score} precision={0} />
          </span>
        </div>
      </div>
      <span className="text-[9px] font-mono tracking-[0.18em] uppercase" style={{ color: C.muted }}>Health</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HBar — horizontal bar gauge
// ─────────────────────────────────────────────────────────────────────────────

function HBar({ label, value, unit, pct: p, color }: {
  label: string; value: string; unit?: string; pct: number; color: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
          {label}
        </span>
        <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
          {value}<span className="text-[9px] ml-0.5" style={{ color: C.subtle }}>{unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.8, ease: [0.22, 0, 0, 1] }}
        />
      </div>
    </div>
  )
}

interface CardProps {
  label: string
  sublabel: string
  value: number
  unit: string
  history: number[]
  status: Status
  precision?: number
  min: number
  max: number
  warnAt?: string
  critAt?: string
  crisis?: boolean
}

function MetricCard({ label, sublabel, value, unit, history, status, precision = 1, min, max, warnAt, critAt, crisis }: CardProps) {
  const color = STATUS[status]
  const prev  = useRef(value)
  const [flash, setFlash] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isAnomaly = useMemo(() => {
    if (!history || history.length < 10) return false
    const samples = history.slice(-30)
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    const stdDev = Math.sqrt(samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length)
    const zScore = Math.abs((value - mean) / (stdDev || 1))
    return zScore > 2.0 && status === 'ok' && !crisis
  }, [value, history, status, crisis])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (Math.abs(prev.current - value) > 0.05) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 350)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  const pts = history.map((v, i) => ({ t: i, v }))
  const gid = 'g' + label.replace(/\s/g, '')

  return (
    <GlassPanel tilt={true} className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isAnomaly ? 'anomaly-glow' : ''}`}
      style={{
        borderColor: status === 'ok' ? 'var(--border)' : flash ? color : color + '40',
        boxShadow: status === 'ok' ? '' : `inset 0 0 20px ${color}10`,
      }}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ 
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: status === 'ok' ? 0.55 : 1,
      }} />

      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>
            {label}
          </p>
          <p className="text-[10px]" style={{ color: C.subtle }}>{sublabel}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <motion.div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-widest uppercase mt-0.5"
            style={{
              background: color + '15',
              border: `1px solid ${color}30`,
              color,
            }}
            animate={status !== 'ok' ? { opacity: [1, 0.55, 1] } : {}}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: color }} />
            {status}
          </motion.div>
          {isAnomaly && (
            <motion.div 
              className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold"
              style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.35)' }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⚠ ANOMALY PREDICTED
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-4 pb-1 flex items-baseline gap-2">
        <span className="text-[38px] leading-none font-mono font-semibold tracking-tight tabular-nums" style={{ color }}>
          <AnimatedValue value={value} precision={precision} />
        </span>
        <span className="text-[12px] font-mono mb-1" style={{ color: C.subtle }}>{unit}</span>
      </div>

      {(warnAt || critAt) && (
        <div className="flex items-center gap-3 px-4 pb-2">
          {warnAt && (
            <span className="text-[9px] font-mono" style={{ color: C.amber }}>
              warn {warnAt}
            </span>
          )}
          {critAt && (
            <span className="text-[9px] font-mono" style={{ color: C.red }}>
              crit {critAt}
            </span>
          )}
        </div>
      )}

      <div className="px-0 pb-0" style={{ height: 56 }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pts} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gid})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', width: '100%' }} />
        )}
      </div>

      <div className="h-[3px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="h-full"
          style={{ background: color + '80' }}
          animate={{ width: `${pct(value, min, max)}%` }}
          transition={{ duration: 0.8, ease: [0.22, 0, 0, 1] }}
        />
      </div>
    </GlassPanel>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-sm font-mono text-[10px]"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)', boxShadow: '0 4px 16px #0008' }}>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span style={{ color: C.muted }}>{p.name}</span>
          <span className="ml-auto pl-4 tabular-nums" style={{ color: p.color }}>{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

function VitalsChart({ samples }: { samples: any[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return <div style={{ height: '100%', width: '100%' }} />

  const data = samples.map((s, i) => ({ t: i, spo2: s.spO2, hr: s.heartRate / 1.4 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35}/>
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity={0.35}/>
            <stop offset="100%" stopColor={C.green} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: C.subtle, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1.5 }} />
        <Area type="monotone" dataKey="spo2" stroke={C.cyan} strokeWidth={2} fill="url(#gradCyan)" filter="url(#neonGlow)" name="SpO₂ %" isAnimationActive={true} animationDuration={600} activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }} />
        <Area type="monotone" dataKey="hr" stroke={C.green} strokeWidth={2} fill="url(#gradGreen)" filter="url(#neonGlow)" name="HR/1.4" isAnimationActive={true} animationDuration={600} activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const LOG_C: Record<LogEntry['level'], string> = {
  INFO:  C.muted,
  SYS:   C.subtle,
  WARN:  C.amber,
  ALERT: C.red,
  OK:    C.green,
}

const LOG_BG: Record<LogEntry['level'], string> = {
  INFO:  'transparent',
  SYS:   'transparent',
  WARN:  'rgba(245,158,11,0.04)',
  ALERT: 'rgba(255,59,92,0.06)',
  OK:    'rgba(0,229,153,0.04)',
}

function TypewriterLog({ text, speed = 8 }: { text: string; speed?: number }) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    let index = 0; let timer: NodeJS.Timeout
    const type = () => {
      if (index <= text.length) { setDisplay(text.slice(0, index)); index++; timer = setTimeout(type, speed + Math.random() * 10) }
    }
    type()
    return () => clearTimeout(timer)
  }, [text, speed])
  return <>{display}{display.length < text.length ? <span className="opacity-50">_</span> : ''}</>
}

function LogRow({ entry, fresh }: { entry: LogEntry; fresh: boolean }) {
  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: 4, filter: 'blur(4px)' } : false}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-2.5 px-4 py-[4.5px] font-mono text-[10px] leading-relaxed"
      style={{ background: LOG_BG[entry.level], borderLeft: `2px solid ${LOG_C[entry.level]}18` }}
    >
      <span className="shrink-0 tabular-nums w-[52px]" style={{ color: C.subtle }}>{entry.time}</span>
      <span className="shrink-0 w-8 font-semibold" style={{ color: LOG_C[entry.level] }}>{entry.level}</span>
      <span className="break-all" style={{ color: entry.level === 'ALERT' ? '#ffb3bf' : entry.level === 'WARN' ? '#fcd680' : C.muted }}>
        {fresh ? <TypewriterLog text={entry.msg} /> : entry.msg}
      </span>
    </motion.div>
  )
}

function Btn({
  children, variant = 'ghost', onClick, full = false, disabled = false,
}: {
  children: React.ReactNode
  variant?: 'ghost' | 'accent' | 'danger' | 'ok'
  onClick?: () => void
  full?: boolean
  disabled?: boolean
}) {
  const S = {
    ghost:  { bg: 'rgba(255,255,255,0.04)',   border: 'rgba(255,255,255,0.09)', color: C.muted  },
    accent: { bg: 'rgba(0,212,255,0.09)',     border: 'rgba(0,212,255,0.22)',   color: C.cyan   },
    ok:     { bg: 'rgba(0,229,153,0.08)',     border: 'rgba(0,229,153,0.2)',    color: C.green  },
    danger: { bg: 'rgba(255,59,92,0.08)',     border: 'rgba(255,59,92,0.25)',   color: C.red    },
  }
  const s = S[variant]
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      className={`${full ? 'w-full' : ''} px-3 py-1.5 text-[9px] font-mono font-semibold tracking-[0.16em] uppercase rounded-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} select-none`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
      whileHover={disabled ? {} : { scale: 1.02, filter: 'brightness(1.18)' }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      {children}
    </motion.button>
  )
}

function SignalBars({ strength }: { strength: number }) {
  const bars = 5
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 4 + i * 3,
            borderRadius: 1,
            background: i < strength ? C.cyan : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s',
          }}
        />
      ))}
    </div>
  )
}

interface Event { time: string; label: string; color: string }

function EventTimeline({ events }: { events: Event[] }) {
  return (
    <div className="relative pl-4">
      <div className="absolute left-[6px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
      {events.map((e, i) => (
        <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
          <div className="absolute -left-[10px] top-1 w-2 h-2 rounded-full border"
            style={{ background: e.color + '22', borderColor: e.color + '88' }} />
          <div className="min-w-0">
            <span className="text-[9px] font-mono tabular-nums" style={{ color: C.subtle }}>{e.time}</span>
            <p className="text-[10px] font-mono leading-snug mt-0.5" style={{ color: C.muted }}>{e.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.subtle }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function Divider() {
  return <div className="h-px mx-0" style={{ background: 'var(--border)' }} />
}

export default function Page() {
  const { samples, isCrisis, connected, isPaused, togglePause, triggerCrisisMode, resolveCrisisMode, setTrack } = useTelemetry()
  const crisis = isCrisis;
  
  const [activeTrackKey, setActiveTrackKey] = useState<keyof typeof TRACK_CONFIGS>('PILOT');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioCtx, setAudioCtx] = useState<any>(null);
  const [volume, setVolume] = useState(0.5);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [pulseAudio, setPulseAudio] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const triggerAudioPulse = useCallback(() => {
    setPulseAudio(true);
    const t = setTimeout(() => setPulseAudio(false), 100);
    return () => clearTimeout(t);
  }, []);

  const trackConf = TRACK_CONFIGS[activeTrackKey];

  const playSuccessChime = useCallback((ctx = audioCtx) => {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08 * volume, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      gainNode.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc1.connect(gainNode);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.05);
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.05);
      osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Failed to play success chime:", e);
    }
  }, [audioCtx, volume]);

  const handleToggleAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioEnabled) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        
        const ctx = audioCtx || new AudioCtxClass();
        setAudioCtx(ctx);
        setAudioEnabled(true);
        playSuccessChime(ctx);
      } else {
        setAudioEnabled(false);
      }
    } catch (e) {
      console.warn("Failed to initialize AudioContext:", e);
    }
  }, [audioEnabled, audioCtx, playSuccessChime]);

  const [localLogs, setLocalLogs] = useState<LogEntry[]>([
    { id: 0, time: nowTime(), level: 'SYS',  msg: 'Kernel v4.2.1 initialized.' },
  ]);

  const logEnd  = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(nowTime())
  const [signalStr] = useState(4)
  const prevCrisis = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setClock(nowTime()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localLogs.length])

  useEffect(() => {
    if (!audioEnabled || !audioCtx) return
    const resumeAudio = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {})
      }
    }
    window.addEventListener('click', resumeAudio)
    return () => window.removeEventListener('click', resumeAudio)
  }, [audioEnabled, audioCtx])

  // Sync local track state if server streams a different track (external switch)
  useEffect(() => {
    if (samples.length > 0) {
      const serverTrack = samples[samples.length - 1].activeTrack;
      if (serverTrack && serverTrack !== activeTrackKey && serverTrack in TRACK_CONFIGS) {
        setActiveTrackKey(serverTrack as keyof typeof TRACK_CONFIGS);
      }
    }
  }, [samples, activeTrackKey]);

  // Track change handler
  const handleTrackChange = useCallback((key: keyof typeof TRACK_CONFIGS) => {
    setActiveTrackKey(key);
    setTrack(key);
    setLocalLogs([{ id: Date.now(), time: nowTime(), level: 'SYS', msg: `[TRACK] Switched to ${TRACK_CONFIGS[key].title}` }]);
    TRACK_CONFIGS[key].terminalLogs.forEach((msg, i) => {
      setTimeout(() => {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + i, time: nowTime(), level: 'INFO', msg }]);
      }, i * 300);
    });
  }, [setTrack]);

  const stopDemo = useCallback(() => {
    setDemoActive(false);
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: '[DEMO] Scenario script terminated.' }]);
  }, []);

  const startDemo = useCallback(() => {
    if (demoActive) {
      stopDemo();
      return;
    }
    
    // Reset states
    setDemoActive(true);
    setDemoTime(0);
    setTrack('PILOT');
    setActiveTrackKey('PILOT');
    resolveCrisisMode();
    
    // Enable audio context on click if audio is enabled
    if (audioEnabled && typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = audioCtx || new AudioCtxClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          setAudioCtx(ctx);
        }
      } catch (e) {
        console.warn("Failed to initialize audio on demo start:", e);
      }
    }

    setLocalLogs([{ id: Date.now(), time: nowTime(), level: 'SYS', msg: '--- STARTING S.P.H.E.R.E. SCENARIO DEMO (60s) ---' }]);
    
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }
    
    let time = 0;
    demoIntervalRef.current = setInterval(() => {
      time += 1;
      setDemoTime(time);
      
      if (time === 1) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 1, time: nowTime(), level: 'INFO', msg: '[DEMO] 0-10s: Nominal baseline established on track PILOT. All systems nominal.' }]);
      } else if (time === 10) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 10, time: nowTime(), level: 'WARN', msg: '[DEMO] 10-20s: Subtle anomaly drift detected. Rolling Z-Score alarms active.' }]);
      } else if (time === 20) {
        triggerCrisisMode();
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 20, time: nowTime(), level: 'ALERT', msg: '[DEMO] 20-30s: Emergency override thresholds breached. Alarm audio active.' }]);
      } else if (time === 30) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 30, time: nowTime(), level: 'ALERT', msg: '[DEMO] 30-40s: Autopilot auto-override active. Executing emergency descent.' }]);
      } else if (time === 40) {
        resolveCrisisMode();
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 40, time: nowTime(), level: 'OK', msg: '[DEMO] 40-50s: Override successful. Gradual recovery active, vitals normalizing.' }]);
      } else if (time === 50) {
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 50, time: nowTime(), level: 'OK', msg: '[DEMO] 50-60s: All systems nominal. Biometric safety margins restored.' }]);
        if (audioEnabled) {
          playSuccessChime();
        }
      } else if (time >= 60) {
        setDemoActive(false);
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 60, time: nowTime(), level: 'SYS', msg: '--- S.P.H.E.R.E. SCENARIO DEMO COMPLETED ---' }]);
      }
    }, 1000);
  }, [demoActive, audioEnabled, audioCtx, resolveCrisisMode, triggerCrisisMode, setTrack, stopDemo, playSuccessChime]);

  // Clean up demo interval on unmount
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, []);

  const handleCaptureScreenshot = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: '[SCREENSHOT] Capturing dashboard layout...' }]);
      
      const html2canvas = (await import('html2canvas-pro')).default;
      
      const element = document.querySelector('.crt-container') || document.body;
      
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#080c10', // Rich dark base background
        scale: 2, // Double resolution for crystal-sharp elements
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Remove CRT screen distortions, scanline patterns, and vignette
          const rootElement = clonedDoc.querySelector('.crt-container') || clonedDoc.body;
          rootElement.classList.remove('crt-container', 'crt-flicker');
          
          // Hide any browser scrollbar handles
          const scrollables = clonedDoc.querySelectorAll('*');
          scrollables.forEach((el: any) => {
            if (el.style) {
              el.style.scrollbarWidth = 'none';
              el.style.msOverflowStyle = 'none';
            }
          });
          
          // Boost card and panel contrast so text pops against the dark canvas
          const panels = clonedDoc.querySelectorAll('.glass-panel');
          panels.forEach((panel: any) => {
            panel.style.background = 'rgba(17, 24, 32, 0.9)'; // Darker semi-solid background
            panel.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6)';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `SPHERE_${activeTrackKey}_${year}-${month}-${day}_${hours}-${minutes}.png`;
      
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setLocalLogs(p => [...p.slice(-50), { id: Date.now() + 1, time: nowTime(), level: 'OK', msg: `[SCREENSHOT] Downloaded: ${filename}` }]);
      
      if (audioEnabled) {
        playSuccessChime();
      }
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'ALERT', msg: '[SCREENSHOT] Capture failed.' }]);
    }
  }, [activeTrackKey, audioEnabled, playSuccessChime]);

  // Keyboard shortcuts event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the user is typing in form controls
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === '1') {
        handleTrackChange('ASTRONAUT');
      } else if (key === '2') {
        handleTrackChange('PILOT');
      } else if (key === '3') {
        handleTrackChange('SURGEON');
      } else if (key === '4') {
        handleTrackChange('TRAIN_PILOT');
      } else if (key === '5') {
        handleTrackChange('TRUCKER');
      } else if (key === 'c') {
        triggerCrisisMode();
      } else if (key === 'r') {
        resolveCrisisMode();
      } else if (key === 'a') {
        handleToggleAudio();
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '?' || e.key === '/') {
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          setShowShortcuts((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTrackChange, triggerCrisisMode, resolveCrisisMode, handleToggleAudio, togglePause]);

  useEffect(() => {
    if (crisis && !prevCrisis.current) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'ALERT', msg: trackConf.overrideMsg }]);
      
      const crisisSequences = {
        TRAIN_PILOT: [
          "[PERCLOS] Micro-sleep state detected.",
          "[BRAKES] Stage 1 pneumatic clamp engaged.",
          "[OVERRIDE] Manual controls bypassed."
        ],
        PILOT: [
          "[HYPOXIA] SpO2 below 83% threshold.",
          "[AUTO-GCAS] Control stick locked.",
          "[CLIMB] Wings-level pull-up initiated."
        ],
        ASTRONAUT: [
          "[SCRUBBER] pCO2 spike detected.",
          "[O2] Auxiliary valve fired.",
          "[THRUSTER] Return-to-airlock trajectory calculated."
        ],
        SURGEON: [
          "[TREMOR] 8Hz FFT amplitude critical.",
          "[STABILIZER] Micro-filter engaged.",
          "[HOLD] Digital scalpel locked in 3D space."
        ],
        TRUCKER: [
          "[HRV] Parasympathetic override detected.",
          "[V2V] Platoon gap expansion broadcast.",
          "[NAV] Shoulder pull-over sequence initiated."
        ]
      };

      const sequence = crisisSequences[activeTrackKey] || [];
      sequence.forEach((msg, i) => {
        setTimeout(() => {
          setLocalLogs(p => [...p.slice(-50), { id: Date.now() + i + 1, time: nowTime(), level: 'ALERT', msg }]);
        }, (i + 1) * 500);
      });
    }
    prevCrisis.current = crisis;
  }, [crisis, trackConf, activeTrackKey]);

  useEffect(() => {
    if (samples.length > 0 && samples.length % 10 === 0 && !crisis) {
      setLocalLogs(p => [...p.slice(-50), { id: Date.now(), time: nowTime(), level: 'SYS', msg: `[SYNC] Telemetry packet ${Math.floor(Math.random()*9000+1000)} logged.` }]);
    }
  }, [samples.length, crisis]);

  const last = samples[samples.length - 1] || {
    spO2: 98, heartRate: 75, environmentMetric: trackConf.baseEnvVal, cognitiveLatency: 210,
    activeTrack: activeTrackKey,
    perclos: 3.5, microCorrections: 45, fatigueIndex: 4.8,
    gForce: 1.0, pwtt: 220, spO2Desat: 0.1,
    transthoracicImpedance: 98.0, pCO2: 2.5, suitPressure: 4.3, scrubberFlow: 6.0,
    tremorAmplitude: 0.02, eda: 1.8, gripForce: 12.0, tremorFreq: 2.1,
    hrvRatio: 3.2, gripAsymmetry: 2.0, v2vLink: -62, alertness: 96.0
  };

  const spo2     = last.spO2;
  const hr       = last.heartRate;
  const envMetric = last.environmentMetric;
  const lat      = last.cognitiveLatency;
  
  // Dynamic physical simulation for demo fidelity
  const temp = crisis 
    ? 98.6 + (hr - 75) * 0.04 
    : 98.6 + (Math.sin(samples.length * 0.2) * 0.15);
  
  const pressure = activeTrackKey === 'ASTRONAUT'
    ? (last.suitPressure ?? 4.3)
    : activeTrackKey === 'PILOT'
      ? (() => {
          const altitude = last.environmentMetric ?? 8000;
          return 14.696 * Math.pow(1 - 0.00000687558 * altitude, 5.25588);
        })()
      : (14.7 + (Math.sin(samples.length * 0.1) * 0.05) + (crisis ? -0.15 * Math.min(10, samples.length) : 0));

  const h = (k: string) => samples.map((s: any) => s[k] as number)

  const spo2St = classify(spo2, 95, 93, 'lo')
  const hrSt   = classify(hr,  110, 120, 'hi')
  const envSt  = classify(envMetric, trackConf.baseEnvVal * 1.5, trackConf.baseEnvVal * 2, 'hi')
  const latSt  = classify(lat, 380, 430, 'hi')
  const tempSt = classify(temp, 99.5, 101.0, 'hi')
  const pressureSt = activeTrackKey === 'ASTRONAUT'
    ? classify(pressure, 4.0, 3.8, 'lo')
    : activeTrackKey === 'PILOT'
      ? classify(pressure, 10.1, 8.6, 'lo')
      : classify(pressure, 12.0, 11.0, 'lo')

  const healthScore = Math.round(
    (pct(spo2, 88, 100) * 0.35) +
    (100 - pct(hr, 52, 140)) * 0.3 +
    (100 - pct(envMetric, 0, trackConf.baseEnvVal * 2)) * 0.2 +
    (100 - pct(lat, 0, 620)) * 0.15
  )

  const radarData = PROFILE_METRICS[activeTrackKey].map((m) => {
    const rawVal = (last as any)[m.key] ?? 0;
    return {
      axis: m.label.slice(0, 6),
      v: pct(rawVal, m.min, m.max)
    };
  });

  const events = [{ time: clock, label: trackConf.title, color: trackConf.themeColor }]

  const animContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15
      }
    }
  } as const

  const animItem = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 110,
        damping: 15
      }
    }
  } as const

  if (!isOnboarded) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden px-6 py-12">
        <LandingBackground themeColor={trackConf.themeColor} />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl z-10 flex flex-col items-center"
        >
          {/* Logo and title */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-10 flex flex-col items-center"
          >
            <div className="mb-4 relative flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="overflow-visible">
                {/* Tech target ticks */}
                <path d="M 20,2 L 20,6 M 20,34 L 20,38 M 2,20 L 6,20 M 34,20 L 38,20" stroke={trackConf.themeColor} strokeWidth="1" opacity="0.5" />
                
                {/* Outer segmented ring (Shield) */}
                <motion.circle 
                  cx="20" 
                  cy="20" 
                  r="16" 
                  stroke={trackConf.themeColor} 
                  strokeWidth="0.8" 
                  strokeDasharray="12 6 4 6"
                  style={{ transformOrigin: 'center' }}
                />

                {/* Middle concentric ring (Telemetry grid) */}
                <motion.circle 
                  cx="20" 
                  cy="20" 
                  r="12" 
                  stroke={trackConf.themeColor} 
                  strokeWidth="0.5" 
                  strokeDasharray="6 3"
                  opacity="0.6"
                  style={{ transformOrigin: 'center' }}
                />

                {/* Biometric signal node (Heartbeat impulse) in the center */}
                <motion.path 
                  d="M 13,20 H 17 L 18.5,15 L 20,25 L 21.5,18 L 23,20 H 27" 
                  stroke={trackConf.themeColor} 
                  strokeWidth="1.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  initial={{ strokeDashoffset: 40, opacity: 0.6 }}
                  animate={{ 
                    strokeDashoffset: [40, 0, -40],
                    opacity: [0.6, 1, 0.6]
                  }}
                  strokeDasharray="20 20"
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Pulsing core glow */}
                <motion.circle 
                  cx="20" 
                  cy="20" 
                  r="3.5" 
                  fill={trackConf.themeColor} 
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: 'center' }}
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.3em] font-mono uppercase text-white mb-2">
              S.P.H.E.R.E.
            </h1>
            <p className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase max-w-xl">
              Sentinel Physiological Hazard Evaluation & Response Engine
            </p>
            <div className="w-12 h-0.5 mt-4 transition-colors duration-500" style={{ background: trackConf.themeColor }} />
          </motion.div>

          {/* Track selector title */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full mb-6 flex items-center gap-4"
          >
             <div className="flex-1 h-px bg-slate-800/60" />
             <span className="text-[10px] font-mono tracking-[0.25em] text-slate-500 uppercase shrink-0">
               Select Operations Interface Track
             </span>
             <div className="flex-1 h-px bg-slate-800/60" />
          </motion.div>

          {/* Cards Grid */}
          <motion.div 
            variants={animContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full mb-8"
          >
            {(Object.keys(TRACK_CONFIGS) as Array<keyof typeof TRACK_CONFIGS>).map((k) => {
              const config = TRACK_CONFIGS[k];
              const isSelected = activeTrackKey === k;
              return (
                <motion.div
                  key={k}
                  variants={animItem}
                  onClick={() => handleTrackChange(k)}
                  whileHover={{ y: -4, borderColor: config.themeColor, boxShadow: '0 4px 20px ' + config.themeColor + '18' }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer p-4 rounded-sm border flex flex-col justify-between h-48 transition-all relative overflow-hidden"
                  style={{
                    background: isSelected ? 'var(--panel)' : 'rgba(255,255,255,0.01)',
                    borderColor: isSelected ? config.themeColor : 'var(--border)',
                    boxShadow: isSelected ? '0 0 20px ' + config.themeColor + '15' : 'none'
                  }}
                >
                  {/* Subtle top indicator bar */}
                  <div className="absolute top-0 inset-x-0 h-[2px] transition-all" style={{ background: isSelected ? config.themeColor : 'transparent' }} />
                  
                  {/* Track details */}
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-sm"
                          style={{ 
                            background: config.themeColor + '15', 
                            color: config.themeColor, 
                            border: '1px solid ' + config.themeColor + '30' 
                          }}>
                          {k}
                        </span>
                        {isSelected && (
                          <motion.div 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: config.themeColor }}
                            layoutId="activeDot"
                          />
                        )}
                      </div>
                      <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200 mt-2 uppercase text-left">
                        <ScrambleText text={k.replace('_', ' ')} />
                      </h3>
                      <p className="text-[9px] text-slate-500 font-mono mt-2 leading-relaxed text-left">
                        {config.title.toLowerCase()}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {PROFILE_HARDWARE[k].map((hw, idx) => (
                          <span 
                            key={idx} 
                            className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-slate-800/60 text-slate-400 bg-slate-900/10"
                          >
                            {hw.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between mt-auto">
                      <span className="text-[8px] font-mono text-slate-600">UNIT AX-7</span>
                      <span className="text-[9px] font-mono font-semibold" style={{ color: config.themeColor }}>
                        {config.metricUnit}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          <Magnetic>
            <motion.button
              onClick={() => setIsOnboarded(true)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="px-8 py-3 text-xs font-mono font-bold tracking-[0.2em] uppercase rounded-sm cursor-pointer border relative overflow-hidden group"
            style={{ 
              background: 'linear-gradient(90deg, ' + trackConf.themeColor + '10, ' + trackConf.themeColor + '20)',
              borderColor: trackConf.themeColor,
              color: '#fff'
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 25px ' + trackConf.themeColor + '30' }}
            whileTap={{ scale: 0.98 }}
          >
            Initialize Neural Link
            </motion.button>
          </Magnetic>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative ${crtEnabled ? 'crt-container crt-flicker' : ''}`} style={{ backgroundColor: '#000000' }}>
      <LandingBackground themeColor={trackConf.themeColor} />
      <Gyroscope isAstronaut={activeTrackKey === "ASTRONAUT"} />
      <AnimatePresence>
        {crisis && (
          <motion.div
            key="vig"
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,59,92,0.09) 0%, transparent 65%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity, repeatType: 'mirror' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {crisis && (
          <motion.div
            key="crisis-banner"
            initial={{ y: -20, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              backgroundColor: ['rgba(255,59,92,0.12)', 'rgba(255,59,92,0.24)', 'rgba(255,59,92,0.12)']
            }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              y: { type: 'spring', stiffness: 260, damping: 26 },
              opacity: { duration: 0.2 },
              backgroundColor: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
            }}
            className="fixed left-0 right-0 z-50 flex items-center justify-center py-2 px-6 border-b border-red-500/30 text-center font-mono"
            style={{
              top: 54,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 15px rgba(255, 59, 92, 0.08)'
            }}
          >
            <div className="flex items-center gap-2">
              <motion.span 
                className="w-1.5 h-1.5 rounded-full bg-[#ff3b5c]"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.12em] uppercase text-red-400">
                {TRACK_CONFIGS[activeTrackKey].overrideMsg}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between px-4 shrink-0 glass-panel w-full relative z-50"
        style={{ height: 56, borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4 flex-1 h-full min-w-0">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2.2" fill={crisis ? C.red : C.cyan} />
                <circle cx="6" cy="6" r="5" stroke={crisis ? C.red : C.cyan} strokeWidth="0.8" fill="none" opacity="0.35" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[13px] font-semibold tracking-[0.2em] uppercase font-mono" style={{ color: C.fg }}>
                S.P.H.E.R.E.
              </span>
              <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: trackConf.themeColor }}>
                {trackConf.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Top Bar ECG Graph */}
          <div className="hidden lg:flex items-center gap-3 h-full py-2 shrink-0 mr-2">
            <div className="flex flex-col items-end justify-center">
              <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>Cardiac</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: crisis ? C.red : C.cyan }}>
                {hr || 75} BPM
              </span>
            </div>
            <div className="h-9 w-32 rounded-sm overflow-hidden flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <ECG crisis={crisis} hr={hr} width={128} height={36} glow={false} audioEnabled={audioEnabled} sound={false} audioCtx={audioCtx} volume={volume} onBeat={() => {}} />
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border)' }} className="hidden lg:block shrink-0 mr-1" />

          {/* Audio Controls */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-sm border" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
            <span className="text-[8px] font-mono uppercase" style={{ color: audioEnabled ? C.green : C.muted }}>SYS.AUDIO</span>
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="w-6 h-3 rounded-sm border flex items-center px-0.5 transition-colors shrink-0"
              style={{ 
                borderColor: audioEnabled ? C.green : C.subtle,
                background: audioEnabled ? 'rgba(0, 255, 170, 0.1)' : 'transparent'
              }}
            >
              <motion.div 
                className="w-2 h-2 rounded-[1px]"
                style={{ background: audioEnabled ? C.green : C.subtle }}
                animate={{ x: audioEnabled ? 10 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            {audioEnabled && (
              <input
                type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="ml-1 shrink-0 cursor-pointer"
                style={{
                  width: '36px', height: '3px', accentColor: C.green,
                  background: 'rgba(255,255,255,0.08)', outline: 'none', borderRadius: '2px', WebkitAppearance: 'none'
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border hidden md:flex" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
            <SignalBars strength={connected ? 5 : 0} />
            <span className="text-[8px] font-mono uppercase" style={{ color: C.muted }}>WS-LINK</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: healthScore > 75 ? C.green : healthScore > 50 ? C.amber : C.red }} />
            <span className="text-[8px] font-mono tabular-nums whitespace-nowrap" style={{ color: C.muted }}>
              HLT <span className="font-semibold" style={{ color: healthScore > 75 ? C.green : C.amber }}>{healthScore}%</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isPaused ? (
              <motion.div key="p" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-widest uppercase shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: C.amber }}
              >
                <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.amber }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
                Paused
              </motion.div>
            ) : crisis ? (
              <motion.div key="c" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-widest uppercase shrink-0"
                style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.4)', color: C.red }}
              >
                <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.red }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.38, repeat: Infinity }} />
                Crisis
              </motion.div>
            ) : (
              <motion.div key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[8px] font-mono tracking-widest uppercase shrink-0"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: C.muted }}
              >
                <motion.div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.green }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                Nominal
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center justify-center w-7 h-7 rounded-sm border hover:border-white/20 transition-all cursor-pointer shrink-0"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: C.muted }}
            title="Keyboard Shortcuts (Key: ?)"
          >
            <span className="text-xs font-mono font-bold">?</span>
          </button>

          <button
            onClick={handleCaptureScreenshot}
            className="flex items-center justify-center w-7 h-7 rounded-sm border hover:border-white/20 transition-all cursor-pointer shrink-0"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: C.muted }}
            title="Capture Dashboard PNG"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" strokeWidth={2} />
            </svg>
          </button>

          <div className="px-2 py-1 rounded-sm text-[9px] font-mono tabular-nums tracking-widest border shrink-0" style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: C.muted }}>
            {clock}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-20">
        <motion.main
          className="flex flex-col w-full lg:w-[68%] shrink-0 lg:overflow-y-auto"
          style={{ borderRight: '1px solid var(--border)' }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.22, 0, 0, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: C.muted }}>
                Biometric Telemetry
              </span>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm tabular-nums"
                style={{ background: 'rgba(0,212,255,0.07)', color: C.cyan, border: '1px solid rgba(0,212,255,0.16)' }}>
                {samples.length}/30 samples
              </div>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                style={{ background: 'rgba(255,255,255,0.03)', color: C.subtle, border: '1px solid var(--border)' }}>
                1 Hz
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PROFILE_METRICS[activeTrackKey].map((m) => {
                let val = (last as any)[m.key] !== undefined ? (last as any)[m.key] : 0;
                
                // Inject subtle anomaly drift during Phase 2 of Guided Demo Mode (10s to 20s)
                if (demoActive && demoTime >= 10 && demoTime < 20 && activeTrackKey === 'PILOT') {
                  if (m.key === 'spO2') {
                    val = 98 - (demoTime - 10) * 0.75;
                  } else if (m.key === 'gForce') {
                    val = 1.0 + (demoTime - 10) * 0.35;
                  }
                }

                let status: Status = 'ok';
                if (m.key === 'perclos' || m.key === 'fatigueIndex' || m.key === 'gForce' || m.key === 'pwtt' || m.key === 'spO2Desat' || m.key === 'pCO2' || m.key === 'tremorAmplitude' || m.key === 'eda' || m.key === 'tremorFreq' || m.key === 'gripAsymmetry') {
                  const critVal = parseFloat(m.critAt.replace(/[^\d.]/g, ''));
                  const warnVal = parseFloat(m.warnAt.replace(/[^\d.]/g, ''));
                  status = classify(val, warnVal, critVal, 'hi');
                } else {
                  const critVal = parseFloat(m.critAt.replace(/[^\d.-]/g, ''));
                  const warnVal = parseFloat(m.warnAt.replace(/[^\d.-]/g, ''));
                  status = classify(val, warnVal, critVal, 'lo');
                }
                
                return (
                  <MetricCard 
                    key={m.label}
                    label={m.label} 
                    sublabel={m.sublabel}
                    value={val} 
                    unit={m.unit} 
                    history={h(m.key)} 
                    status={status} 
                    crisis={crisis}
                    precision={m.precision} 
                    min={m.min} 
                    max={m.max} 
                    warnAt={'warn ' + m.warnAt} 
                    critAt={'crit ' + m.critAt} 
                  />
                );
              })}
            </div>

            {/* Real-time Math Equation Engine */}
            <div className="rounded-sm px-4 py-2.5 flex items-center justify-between border font-mono"
              style={{ 
                background: 'rgba(255,255,255,0.01)', 
                borderColor: crisis ? 'rgba(255,59,92,0.2)' : 'var(--border)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: C.muted }}>Autonomous Risk Evaluation Equation</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-200">
                    {activeTrackKey === 'TRAIN_PILOT' && <>FATIGUE INDEX = (PERCLOS × 0.7) + ((CogLat / 20) × 0.3)</>}
                    {activeTrackKey === 'PILOT' && <>HYPOXIA RISK = ((100 - SpO₂) × 1.5) + (DesatVel × 2.0)</>}
                    {activeTrackKey === 'ASTRONAUT' && <>EVA SYSTEM RISK = ((4.3 - SuitPress) × 25) + (pCO₂ × 4.0)</>}
                    {activeTrackKey === 'SURGEON' && <>SCALPEL TREMOR INDEX = (TremorAmp × 80) + (EDA × 0.2)</>}
                    {activeTrackKey === 'TRUCKER' && <>ALERTNESS DEFICIT = ((100 - Alertness) × 0.75) + (GripAsym × 0.25)</>}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right flex flex-col justify-center">
                  <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: C.muted }}>Real-time Computation</span>
                  <span className="text-xs font-bold mt-0.5" style={{ color: crisis ? C.red : trackConf.themeColor }}>
                    {activeTrackKey === 'TRAIN_PILOT' && (
                      <>{((last.perclos || 0) * 0.7).toFixed(2)} + {(((last.cognitiveLatency || 0) / 20) * 0.3).toFixed(2)} = {((last.perclos || 0) * 0.7 + ((last.cognitiveLatency || 0) / 20) * 0.3).toFixed(2)}</>
                    )}
                    {activeTrackKey === 'PILOT' && (
                      <>{((100 - spo2) * 1.5).toFixed(2)} + {((last.spO2Desat || 0) * 2.0).toFixed(2)} = {((100 - spo2) * 1.5 + (last.spO2Desat || 0) * 2.0).toFixed(2)}</>
                    )}
                    {activeTrackKey === 'ASTRONAUT' && (
                      <>{((4.3 - pressure) * 25).toFixed(2)} + {((last.pCO2 || 0) * 4.0).toFixed(2)} = {((4.3 - pressure) * 25 + (last.pCO2 || 0) * 4.0).toFixed(2)}</>
                    )}
                    {activeTrackKey === 'SURGEON' && (
                      <>{((last.tremorAmplitude || 0) * 80).toFixed(2)} + {((last.eda || 0) * 0.2).toFixed(2)} = {(((last.tremorAmplitude || 0) * 80) + (last.eda || 0) * 0.2).toFixed(2)}</>
                    )}
                    {activeTrackKey === 'TRUCKER' && (
                      <>{((100 - (last.alertness || 0)) * 0.75).toFixed(2)} + {((last.gripAsymmetry || 0) * 0.25).toFixed(2)} = {(((100 - (last.alertness || 0)) * 0.75) + (last.gripAsymmetry || 0) * 0.25).toFixed(2)}</>
                    )}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm border"
                  style={{
                    background: crisis ? 'rgba(255,59,92,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: crisis ? C.red : 'var(--border)',
                    color: crisis ? C.red : trackConf.themeColor
                  }}
                >
                  {crisis ? 'CRISIS OVERLAY ACTIVE' : 'NOMINAL EVAL'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 lg:grid-cols-[1fr_420px_200px]">
              <GlassPanel className="rounded-xl overflow-hidden" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Vitals Trend</span>
                  </div>
                </div>
                <div style={{ height: 120, padding: '8px 0 0', position: 'relative', width: '100%', minWidth: 0 }}>
                  <VitalsChart samples={samples} />
                </div>
              </GlassPanel>

              <GlassPanel className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Cardiac Waveform (ECG)</span>
                  <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: crisis ? C.red : C.green }}>LIVE SCANNER</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3 bg-black">
                  <ECG crisis={crisis} hr={hr} width={396} height={96} glow={true} audioEnabled={audioEnabled} sound={true} audioCtx={audioCtx} volume={volume} onBeat={triggerAudioPulse} />
                </div>
              </GlassPanel>

              <GlassPanel className="rounded-xl flex flex-col" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>System Radar</span>
                </div>
                <div className="flex-1 flex items-center justify-center" style={{ padding: '4px 0', minWidth: 0, minHeight: 0 }}>
                  {mounted ? (
                    <ResponsiveContainer width="100%" height={100}>
                      <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                        <defs>
                          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 8, fill: C.subtle, fontFamily: 'var(--font-mono)' }} />
                        <Radar dataKey="v" stroke={crisis ? C.red : trackConf.themeColor}
                          fill={crisis ? C.red : trackConf.themeColor} fillOpacity={0.3} strokeWidth={2} filter="url(#radarGlow)" isAnimationActive={true} animationDuration={600} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 100, width: '100%' }} />
                  )}
                </div>
              </GlassPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <GlassPanel className="rounded-xl p-4 flex flex-col gap-3" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <SectionLabel>Environmental</SectionLabel>
                <HBar label="Body Temp" value={fmt(temp, 1)} unit="°F" pct={pct(temp, 96, 102)} color={C.green} />
                <HBar
                  label={activeTrackKey === 'ASTRONAUT' ? 'Suit Pressure' : 'Cabin Pressure'}
                  value={fmt(pressure, 2)}
                  unit="psi"
                  pct={
                    activeTrackKey === 'ASTRONAUT'
                      ? pct(pressure, 2.5, 5.0)
                      : activeTrackKey === 'PILOT'
                        ? pct(pressure, 8.0, 16.0)
                        : pct(pressure, 12.0, 16.0)
                  }
                  color={C.cyan}
                />
              </GlassPanel>
              <GlassPanel className="rounded-xl p-4 flex flex-col gap-3" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <SectionLabel>Sensor Hardware</SectionLabel>
                <TrackVisualizer trackKey={activeTrackKey} crisis={crisis} lastSample={last} />
                {PROFILE_HARDWARE[activeTrackKey].map((h, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: C.muted }}>
                        {h.label}
                      </span>
                      <span className="text-[11px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>
                        {crisis && i === 1 ? 'INTERVENING' : h.value}
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: crisis ? C.amber : C.green }}
                        animate={{ width: crisis ? '100%' : '85%' }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </GlassPanel>
              <GlassPanel className="rounded-xl overflow-hidden" style={{ border: `1px solid ${crisis ? '#ff3b5c80' : 'var(--border)'}` }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}><span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: C.muted }}>Subsystems</span></div>
                <div className="flex items-center justify-between px-4 py-[7px] border-b border-[var(--border)]">
                  <span className="text-[10px]" style={{ color: C.fg }}>Neural Interface</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>{crisis ? 'DEGRADED' : 'ONLINE'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-[7px] border-b border-[var(--border)]">
                  <span className="text-[10px]" style={{ color: C.fg }}>Biometric Sensors</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.amber : C.green }}>{crisis ? 'DEGRADED' : 'ONLINE'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-[7px] border-b border-[var(--border)]">
                  <span className="text-[10px]" style={{ color: C.fg }}>Telemetry Relay</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: !connected ? C.red : crisis ? C.amber : C.green }}>{!connected ? 'OFFLINE' : crisis ? 'LATENT' : 'ONLINE'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-[7px] border-b border-[var(--border)]">
                  <span className="text-[10px]" style={{ color: C.fg }}>Cognitive Proc.</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'CRITICAL' : 'ONLINE'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-[7px]">
                  <span className="text-[10px]" style={{ color: C.fg }}>Atmos Monitor</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: crisis ? C.red : C.green }}>{crisis ? 'CRITICAL' : 'ONLINE'}</span>
                </div>
              </GlassPanel>
            </div>
          </div>
        </motion.main>

        <motion.aside
          className="flex flex-col w-full lg:w-[32%] shrink-0 lg:overflow-hidden border-t lg:border-t-0 glass-panel"
          style={{ borderColor: 'var(--border)' }}
          initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0, 0, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: C.muted }}>Autonomous Console</span>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(0,229,153,0.07)', color: C.green, border: '1px solid rgba(0,229,153,0.15)' }}>LIVE</div>
            </div>
          </div>

          <div className="px-5 py-3 shrink-0 grid grid-cols-3 gap-x-3 gap-y-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>SPO2</span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[spo2St] }}>{fmt(spo2)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>HR</span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[hrSt] }}>{fmt(hr, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">bpm</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>
                {activeTrackKey === 'ASTRONAUT' ? 'SUIT' : activeTrackKey === 'PILOT' ? 'ALT' : activeTrackKey === 'SURGEON' ? 'TRMR' : activeTrackKey === 'TRAIN_PILOT' ? 'COGL' : 'ALRT'}
              </span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[envSt] }}>{fmt(envMetric, activeTrackKey === 'SURGEON' ? 3 : 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">{trackConf.metricUnit}</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>LAT</span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[latSt] }}>{fmt(lat, 0)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">ms</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>TEMP</span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[tempSt] }}>{fmt(temp, 1)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">°F</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-wider" style={{ color: C.subtle }}>PRES</span>
              <span className="text-[11px] font-mono font-semibold tabular-nums mt-0.5" style={{ color: STATUS[pressureSt] }}>{fmt(pressure, 2)}<span className="text-[8px] font-normal text-slate-500 ml-0.5">psi</span></span>
            </div>
          </div>

          <div className="px-5 py-3 shrink-0 flex items-center gap-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <HealthRing score={healthScore} crisis={crisis} />
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-slate-500 mb-0.5">Index Breakdown</span>
              
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[8px] font-mono">
                  <span className="text-slate-400">RESPIRATORY</span>
                  <span style={{ color: STATUS[spo2St] }}>{Math.round(pct(spo2, 88, 100))}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-slate-800">
                  <motion.div className="h-full" style={{ background: STATUS[spo2St] }} animate={{ width: pct(spo2, 88, 100) + '%' }} transition={{ duration: 0.8 }} />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[8px] font-mono">
                  <span className="text-slate-400">CARDIAC</span>
                  <span style={{ color: STATUS[hrSt] }}>{Math.round(100 - pct(hr, 52, 140))}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-slate-800">
                  <motion.div className="h-full" style={{ background: STATUS[hrSt] }} animate={{ width: (100 - pct(hr, 52, 140)) + '%' }} transition={{ duration: 0.8 }} />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[8px] font-mono">
                  <span className="text-slate-400">ENVIRONMENT</span>
                  <span style={{ color: STATUS[envSt] }}>{Math.round(100 - pct(envMetric, 0, trackConf.baseEnvVal * 2))}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-slate-800">
                  <motion.div className="h-full" style={{ background: STATUS[envSt] }} animate={{ width: (100 - pct(envMetric, 0, trackConf.baseEnvVal * 2)) + '%' }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: 0 }}>
            {localLogs.map((e, i) => (
              <LogRow key={e.id} entry={e} fresh={i === localLogs.length - 1} />
            ))}
            <div ref={logEnd} />
          </div>

          <Divider />

          <div className="px-5 pt-3 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Event Timeline</SectionLabel>
            <EventTimeline events={events} />
          </div>

          <div className="px-5 pt-3 pb-4 shrink-0">
            <SectionLabel>Controls</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <Btn variant="accent" onClick={triggerCrisisMode} disabled={demoActive}>Trigger Override</Btn>
              <Btn variant="ok" onClick={resolveCrisisMode} disabled={demoActive}>Resolve Crisis</Btn>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Btn variant={demoActive ? 'danger' : 'accent'} onClick={startDemo}>
                {demoActive ? 'Stop' : 'Demo'}
              </Btn>
              <Btn variant="ghost" onClick={handleCaptureScreenshot}>Capture</Btn>
              <Btn variant="ghost" onClick={() => setLocalLogs([])}>Clear</Btn>
            </div>
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md p-6 rounded-xl border border-white/10 glass-panel shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                onClick={() => setShowShortcuts(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                  S.P.H.E.R.E. Keybindings
                </h3>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Switch Profiles</span>
                  <div className="flex gap-1">
                    {['1', '2', '3', '4', '5'].map((k) => (
                      <kbd key={k} className="px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white shadow-sm">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 -mt-2 leading-relaxed font-mono">
                  (1: Astronaut | 2: Pilot | 3: Surgeon | 4: Train Pilot | 5: Trucker)
                </p>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Trigger Crisis</span>
                  <kbd className="px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-[9px] font-mono font-bold text-red-400 uppercase shadow-sm">
                    C
                  </kbd>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Resolve Crisis</span>
                  <kbd className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-400 uppercase shadow-sm">
                    R
                  </kbd>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Toggle System Audio</span>
                  <kbd className="px-2 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                    A
                  </kbd>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300">Pause / Resume Telemetry</span>
                  <kbd className="px-3 py-0.5 rounded border border-white/15 bg-white/5 text-[9px] font-mono font-bold text-white uppercase shadow-sm">
                    Space
                  </kbd>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-mono text-slate-300">Toggle Help Overlay</span>
                  <kbd className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[9px] font-mono font-bold text-amber-400 uppercase shadow-sm">
                    ?
                  </kbd>
                </div>
              </div>

              <div className="mt-5 text-center">
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  Press <kbd className="px-1 py-0.2 rounded border border-white/10 bg-white/5 font-bold">ESC</kbd> or click outside to dismiss
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {demoActive && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] p-3 rounded-lg border border-cyan-500/30 glass-panel shadow-2xl flex items-center justify-between"
            style={{
              background: 'rgba(8, 12, 16, 0.85)',
              backdropFilter: 'blur(16px) saturate(1.2)'
            }}
          >
            <div className="flex items-center gap-3 font-mono">
              <motion.div 
                className="w-2 h-2 rounded-full bg-cyan-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.0, repeat: Infinity }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  S.P.H.E.R.E. DEMO RUNNING
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5">
                  {demoTime < 10 && '0-10s: Nominal Baseline (PILOT)'}
                  {demoTime >= 10 && demoTime < 20 && '10-20s: Subtle Anomaly Drift (Z-Score Active)'}
                  {demoTime >= 20 && demoTime < 30 && '20-30s: Crisis Override (Alarm Audio & Vignette)'}
                  {demoTime >= 30 && demoTime < 40 && '30-40s: Emergency Descent Auto-Override'}
                  {demoTime >= 40 && demoTime < 50 && '40-50s: Gradual Recovery & Normalization'}
                  {demoTime >= 50 && '50-60s: Resolution (All Systems Nominal Banner)'}
                </span>
              </div>
            </div>

            {/* Time progress bar */}
            <div className="flex-1 max-w-md mx-6 hidden md:block">
              <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 mb-1">
                <span>PROGRESS</span>
                <span className="tabular-nums">{demoTime}s / 60s</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-slate-800 relative">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${(demoTime / 60) * 100}%`,
                    background: demoTime >= 20 && demoTime < 40 ? C.red : C.cyan
                  }}
                />
              </div>
            </div>

            <button
              onClick={stopDemo}
              className="px-3 py-1 text-[9px] font-mono font-bold tracking-widest uppercase border border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-sm cursor-pointer select-none"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {demoActive && demoTime >= 50 && demoTime < 60 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
          >
            <div 
              className="p-8 rounded-xl border border-emerald-500/40 glass-panel shadow-2xl flex flex-col items-center gap-3"
              style={{
                background: 'rgba(8, 20, 16, 0.9)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(0, 229, 153, 0.15)'
              }}
            >
              <motion.div 
                className="w-12 h-12 rounded-full border-2 border-emerald-400 flex items-center justify-center mb-1"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold tracking-[0.25em] font-mono text-emerald-400 uppercase">
                ALL SYSTEMS NOMINAL
              </h2>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest text-center max-w-xs leading-relaxed">
                Biometric homeostasis restored. Auto-override offline. Flight deck control returned to manual.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
