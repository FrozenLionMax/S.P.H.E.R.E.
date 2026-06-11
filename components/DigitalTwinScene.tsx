'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useTelemetryStore } from '@/lib/useTelemetryStore'

interface DigitalTwinSceneProps {
  currentCondition: 'diabetes' | 'arrhythmia' | 'asthma' | 'epilepsy'
}

// ─────────────────────────────────────────────────────────────────────────────
// 60FPS Dynamic SVG Biological Waveform Component
// ─────────────────────────────────────────────────────────────────────────────
function MiniSvgWave({ color, speed = 1.0, amplitude = 8, type = 'sine' }: { color: string; speed?: number; amplitude?: number; type: 'sine' | 'ecg' | 'noise' | 'flat' }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    let frameId: number
    const tick = () => {
      setPhase((p) => (p + 0.08 * speed) % (Math.PI * 2))
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [speed])

  const pathData = useMemo(() => {
    const points: string[] = []
    const width = 140
    const height = 24
    const midY = height / 2

    for (let x = 0; x <= width; x += 4) {
      let y = midY
      if (type === 'sine') {
        // Smooth respiratory sine wave
        y = midY + Math.sin((x / 14) + phase) * amplitude
      } else if (type === 'noise') {
        // Chaotic EEG brain wave
        const alpha = Math.sin((x / 6) + phase * 3.5) * 0.4
        const beta = Math.cos((x / 2) + phase * 6.0) * 0.35
        const gamma = Math.sin((x / 1) + phase * 9.0) * 0.15
        const noise = (Math.random() - 0.5) * 0.35
        y = midY + (alpha + beta + gamma + noise) * amplitude * 1.5
      } else if (type === 'ecg') {
        // ECG wave complex (P-QRS-T)
        const p = ((x / width) * 2.5 + phase / 2) % 1.0
        let ecg = 0
        if (p < 0.08) {
          ecg = Math.sin((p / 0.08) * Math.PI) * 0.1
        } else if (p >= 0.10 && p < 0.13) {
          ecg = -0.15
        } else if (p >= 0.13 && p < 0.18) {
          const t = (p - 0.13) / 0.05
          ecg = t < 0.4 ? -0.18 + (t / 0.4) * 1.68 : 1.5 - ((t - 0.4) / 0.6) * 1.85
        } else if (p >= 0.18 && p < 0.22) {
          ecg = -0.3
        } else if (p >= 0.28 && p < 0.42) {
          ecg = Math.sin(((p - 0.28) / 0.14) * Math.PI) * 0.25
        }
        y = midY - ecg * amplitude
      } else if (type === 'flat') {
        // Flat/gentle glucose variations
        y = midY + Math.sin((x / 20) + phase * 0.3) * (amplitude * 0.25) + (Math.random() - 0.5) * 0.4
      }
      points.push(`${x},${y.toFixed(1)}`)
    }
    return `M ${points.join(' L ')}`
  }, [phase, type, amplitude])

  return (
    <svg className="w-28 h-6 opacity-90 border-b border-white/[0.03] pb-0.5" viewBox="0 0 140 24">
      <path d={pathData} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D Bent HUD Pointer Line Component
// ─────────────────────────────────────────────────────────────────────────────
function HudPointerLine({ start, mid, end, color, active }: { start: [number, number, number]; mid: [number, number, number]; end: [number, number, number]; color: string; active: boolean }) {
  return (
    <Line
      points={[start, mid, end]}
      color={color}
      lineWidth={1.0}
      transparent
      opacity={active ? 0.75 : 0.12}
      blending={THREE.AdditiveBlending}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hyperrealistic Mannequin Physical Glass Skin Contours
// ─────────────────────────────────────────────────────────────────────────────
function HumanGlassSkin() {
  const glassColor = '#00a3ff'

  return (
    <group>
      {/* Outer Skin Head Hull */}
      <mesh position={[0, 1.4, 0]} scale={[1.02, 1.14, 1.02]}>
        <sphereGeometry args={[0.33, 24, 24]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.16}
          roughness={0.1}
          metalness={0.05}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transmission={0.65}
          thickness={0.6}
          ior={1.42}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Torso/Chest Hull */}
      <mesh position={[0, 0.45, 0]} scale={[1.25, 1.05, 0.95]}>
        <cylinderGeometry args={[0.26, 0.22, 1.0, 20, 4]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.18}
          roughness={0.15}
          metalness={0.08}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={0.6}
          thickness={0.8}
          ior={1.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Upper Arm Skin */}
      <mesh position={[-0.55, 0.75, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.045, 0.038, 0.55, 12]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.12}
          roughness={0.15}
          clearcoat={1.0}
          transmission={0.7}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right Upper Arm Skin */}
      <mesh position={[0.55, 0.75, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.045, 0.038, 0.55, 12]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.12}
          roughness={0.15}
          clearcoat={1.0}
          transmission={0.7}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Thigh Skin */}
      <mesh position={[-0.22, -0.65, 0]} rotation={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.07, 0.055, 0.75, 12]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.12}
          roughness={0.15}
          clearcoat={1.0}
          transmission={0.7}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right Thigh Skin */}
      <mesh position={[0.22, -0.65, 0]} rotation={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.07, 0.055, 0.75, 12]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.12}
          roughness={0.15}
          clearcoat={1.0}
          transmission={0.7}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hyperrealistic Mannequin Detailed Skeleton Structure
// ─────────────────────────────────────────────────────────────────────────────
function DetailedSkeleton() {
  const boneColor = '#e3e4e6'
  const jointColor = '#a8b0c0'

  return (
    <group>
      {/* 1. Spine vertebrae column: 12 segmented bones */}
      {Array.from({ length: 12 }, (_, i) => {
        const y = -0.2 + i * 0.1
        return (
          <group key={i} position={[0, y, -0.06]}>
            {/* Vertebra body */}
            <mesh>
              <boxGeometry args={[0.07, 0.035, 0.055]} />
              <meshStandardMaterial color={boneColor} roughness={0.7} metalness={0.1} />
            </mesh>
            {/* Transverse spine processes */}
            <mesh position={[0, 0, -0.03]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.11, 0.015, 0.015]} />
              <meshStandardMaterial color={jointColor} roughness={0.65} />
            </mesh>
          </group>
        )
      })}

      {/* 2. Ribcage structure: 6 wrapping ribs */}
      {Array.from({ length: 6 }, (_, i) => {
        const y = 0.35 + i * 0.1
        const scale = 0.26 - i * 0.015
        return (
          <group key={i} position={[0, y, 0]}>
            {/* Left Rib Curve */}
            <mesh position={[-0.13, 0, 0]} rotation={[0, 0, -0.25]}>
              <torusGeometry args={[scale, 0.009, 8, 16, Math.PI]} />
              <meshStandardMaterial color={boneColor} roughness={0.8} />
            </mesh>
            {/* Right Rib Curve */}
            <mesh position={[0.13, 0, 0]} rotation={[0, Math.PI, 0.25]}>
              <torusGeometry args={[scale, 0.009, 8, 16, Math.PI]} />
              <meshStandardMaterial color={boneColor} roughness={0.8} />
            </mesh>
          </group>
        )
      })}

      {/* 3. Collarbone and shoulders */}
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.9, 8]} />
        <meshStandardMaterial color={boneColor} roughness={0.8} />
      </mesh>

      {/* 4. Joint Spheres */}
      {[
        [-0.45, 1.05, 0], [0.45, 1.05, 0],  // Shoulders
        [-0.62, 0.55, 0], [0.62, 0.55, 0],  // Elbows
        [-0.2, -0.25, 0], [0.2, -0.25, 0],  // Hips
        [-0.24, -1.0, 0], [0.24, -1.0, 0]   // Knees
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.038, 8, 8]} />
          <meshStandardMaterial color={jointColor} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary Internal WebGL Hologram Scene Component
// ─────────────────────────────────────────────────────────────────────────────
function HologramScene() {
  // Mesh References
  const brainMeshRef = useRef<THREE.Mesh>(null)
  const leftLungMeshRef = useRef<THREE.Mesh>(null)
  const rightLungMeshRef = useRef<THREE.Mesh>(null)
  const heartMeshRef = useRef<THREE.Mesh>(null)
  const liverMeshRef = useRef<THREE.Mesh>(null)
  const brainRingRef = useRef<THREE.Mesh>(null)

  // Material References
  const brainMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lungMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const heartMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const liverMatRef = useRef<THREE.MeshStandardMaterial>(null)

  // Subscribe to Zustand reactive updates to populate HUD overlay cards dynamically
  const currentCondition = useTelemetryStore((s) => s.currentCondition)
  const bpm = useTelemetryStore((s) => s.liveTelemetryFrame.bpm)
  const oxygen = useTelemetryStore((s) => s.liveTelemetryFrame.oxygenSaturation)
  const glucose = useTelemetryStore((s) => s.liveTelemetryFrame.glucose)
  const brainwaveFreq = useTelemetryStore((s) => s.liveTelemetryFrame.brainwaveFrequency)

  // Cursor pointer handler
  const setCursor = (type: string) => {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = type
    }
  }

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime

    // Read state directly inside loop to optimize WebGL transforms at 60fps
    const telemetry = useTelemetryStore.getState()
    const activeCond = telemetry.currentCondition
    const liveBpm = telemetry.liveTelemetryFrame.bpm
    const liveOxygen = telemetry.liveTelemetryFrame.oxygenSaturation
    const liveBrainFreq = telemetry.liveTelemetryFrame.brainwaveFrequency

    const isCardiac = activeCond === 'arrhythmia' || activeCond === 'cardiac'
    const isRespiratory = activeCond === 'asthma' || activeCond === 'respiratory'
    const isNeurological = activeCond === 'epilepsy' || activeCond === 'neurological'
    const isDiabetes = activeCond === 'diabetes'

    // Target values for opacity and emissive glowing animation
    let targetBrainOpacity = 0.15
    let targetLungOpacity = 0.15
    let targetHeartOpacity = 0.15
    let targetLiverOpacity = 0.15

    let brainEmissive = 0.3
    let lungEmissive = 0.3
    let heartEmissive = 0.3
    let liverEmissive = 0.3

    const brainColor = new THREE.Color('#c040ff')
    const lungColor = new THREE.Color('#00ccff')
    const heartColor = new THREE.Color('#ff2b56')
    const liverColor = new THREE.Color('#ff9900')

    // Highlight active selected organ
    if (isNeurological) {
      targetBrainOpacity = 0.95
      brainEmissive = 1.2
    } else if (isRespiratory) {
      targetLungOpacity = 0.95
      lungEmissive = 1.2
    } else if (isCardiac) {
      targetHeartOpacity = 0.95
      heartEmissive = 1.2
    } else if (isDiabetes) {
      targetLiverOpacity = 0.95
      liverEmissive = 1.2
    }

    // 1. Heart Pulse Animation
    let heartScale = 1.0
    const beatDuration = 60 / liveBpm
    const timeInBeat = elapsed % beatDuration
    const phase = timeInBeat / beatDuration

    if (isCardiac) {
      // Rapid irregular heartbeat
      if (phase < 0.12) {
        heartScale = 1.0 + Math.sin((phase / 0.12) * Math.PI) * 0.22
        heartEmissive = 2.8
      } else if (phase >= 0.12 && phase < 0.4) {
        const t = (phase - 0.12) / 0.28
        heartScale = 1.0 + Math.cos((t * Math.PI) / 2) * 0.22
        heartEmissive = 0.5 + Math.cos((t * Math.PI) / 2) * 2.0
      } else {
        heartScale = 1.0
        heartEmissive = 0.3
      }
      heartScale += (Math.random() - 0.5) * 0.015
    } else {
      // Normal sinus beat
      if (phase < 0.15) {
        heartScale = 1.0 + Math.sin((phase / 0.15) * Math.PI) * 0.14
        heartEmissive = 1.6
      } else if (phase >= 0.15 && phase < 0.45) {
        const t = (phase - 0.15) / 0.3
        heartScale = 1.0 + Math.cos((t * Math.PI) / 2) * 0.14
        heartEmissive = 0.4 + Math.cos((t * Math.PI) / 2) * 1.0
      } else {
        heartScale = 1.0
        heartEmissive = 0.5
      }
    }
    if (heartMeshRef.current) {
      heartMeshRef.current.scale.set(heartScale, heartScale, heartScale)
    }

    // 2. Lungs Expansion Animation
    let lungScaleY = 1.0
    let lungScaleXZ = 1.0
    const respRate = isRespiratory ? 9 : 14
    const breathDuration = 60 / respRate
    const respPhase = ((elapsed / breathDuration) * Math.PI * 2)
    const breathingFactor = Math.sin(respPhase)

    if (isRespiratory) {
      // Shallow, compromised breathing
      const amplitudeFactor = (liveOxygen / 100) * 0.05
      lungScaleY = 1.0 + breathingFactor * amplitudeFactor
      lungScaleXZ = 1.0 + breathingFactor * (amplitudeFactor * 0.5)
      lungEmissive = 0.25 + (breathingFactor > 0 ? breathingFactor * 1.6 : 0)
    } else {
      // Deep nominal breaths
      lungScaleY = 1.0 + breathingFactor * 0.08
      lungScaleXZ = 1.0 + breathingFactor * 0.035
      lungEmissive = 0.4 + (breathingFactor > 0 ? breathingFactor * 0.8 : 0)
    }
    if (leftLungMeshRef.current && rightLungMeshRef.current) {
      leftLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
      rightLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
    }

    // 3. Brain Synaptic Spin & Seizure Jitter
    let brainScale = 1.0
    if (brainMeshRef.current) {
      if (isNeurological) {
        brainMeshRef.current.rotation.y += liveBrainFreq * 0.0035
        brainScale = 1.0 + (Math.random() - 0.5) * 0.04 * (liveBrainFreq / 15)
        brainEmissive = Math.random() > 0.85 ? 3.2 : 0.4 + Math.random() * 0.8
      } else {
        brainMeshRef.current.rotation.y += liveBrainFreq * 0.001
        brainScale = 1.0
        brainEmissive = 0.5 + Math.sin(elapsed * 1.5) * 0.25
      }
      brainMeshRef.current.scale.set(brainScale, brainScale, brainScale)
    }
    if (brainRingRef.current) {
      brainRingRef.current.rotation.z -= 0.015
      brainRingRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.15
    }

    // 4. Liver Metabolic Glow
    let liverScale = 1.0
    if (isDiabetes) {
      liverScale = 1.0 + Math.sin(elapsed * 3.5) * 0.03
      liverEmissive = 0.8 + Math.sin(elapsed * 6) * 0.5
    } else {
      liverScale = 1.0
      liverEmissive = 0.4 + Math.sin(elapsed * 0.8) * 0.15
    }
    if (liverMeshRef.current) {
      liverMeshRef.current.scale.set(liverScale, liverScale, liverScale)
    }

    // 5. Smoothly lerp material properties to prevent flashing
    if (brainMatRef.current) {
      brainMatRef.current.opacity = THREE.MathUtils.lerp(brainMatRef.current.opacity, targetBrainOpacity, 0.08)
      brainMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(brainMatRef.current.emissiveIntensity, brainEmissive, 0.1)
      brainMatRef.current.color.lerp(brainColor, 0.08)
      brainMatRef.current.emissive.lerp(brainColor, 0.08)
    }
    if (lungMatRef.current) {
      lungMatRef.current.opacity = THREE.MathUtils.lerp(lungMatRef.current.opacity, targetLungOpacity, 0.08)
      lungMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(lungMatRef.current.emissiveIntensity, lungEmissive, 0.08)
      lungMatRef.current.color.lerp(lungColor, 0.08)
      lungMatRef.current.emissive.lerp(lungColor, 0.08)
    }
    if (heartMatRef.current) {
      heartMatRef.current.opacity = THREE.MathUtils.lerp(heartMatRef.current.opacity, targetHeartOpacity, 0.08)
      heartMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(heartMatRef.current.emissiveIntensity, heartEmissive, 0.1)
      heartMatRef.current.color.lerp(heartColor, 0.08)
      heartMatRef.current.emissive.lerp(heartColor, 0.08)
    }
    if (liverMatRef.current) {
      liverMatRef.current.opacity = THREE.MathUtils.lerp(liverMatRef.current.opacity, targetLiverOpacity, 0.08)
      liverMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(liverMatRef.current.emissiveIntensity, liverEmissive, 0.08)
      liverMatRef.current.color.lerp(liverColor, 0.08)
      liverMatRef.current.emissive.lerp(liverColor, 0.08)
    }
  })

  // Organ Select Trigger Handlers
  const handleSelectCondition = (condition: 'epilepsy' | 'asthma' | 'arrhythmia' | 'diabetes') => {
    useTelemetryStore.getState().setCurrentCondition(condition)
  }

  return (
    <group position={[0, -0.1, 0]}>
      {/* 1. Human Physical Glass Skin Contours (Refractive clearcoat shell) */}
      <HumanGlassSkin />

      {/* 2. Detailed Skeletal Bones Column & Ribcage */}
      <DetailedSkeleton />

      {/* 3. Cardiovascular Vascular System (Arteries & Veins) */}
      {/* Left Arm Vascular Feed */}
      <Line points={[[-0.08, 0.46, 0.09], [-0.43, 1.03, 0.02], [-0.62, 0.55, 0.01], [-0.78, 0.04, 0.0]]} color="#ff1133" lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[[-0.08, 0.44, 0.07], [-0.47, 1.07, -0.02], [-0.65, 0.57, -0.01], [-0.82, 0.06, 0.0]]} color="#0055ff" lineWidth={0.8} transparent opacity={0.6} />
      
      {/* Right Arm Vascular Feed */}
      <Line points={[[-0.08, 0.46, 0.09], [0.43, 1.03, 0.02], [0.62, 0.55, 0.01], [0.78, 0.04, 0.0]]} color="#ff1133" lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[[-0.08, 0.44, 0.07], [0.47, 1.07, -0.02], [0.65, 0.57, -0.01], [0.82, 0.06, 0.0]]} color="#0055ff" lineWidth={0.8} transparent opacity={0.6} />

      {/* Lower Body/Legs Vascular Feed */}
      <Line points={[[-0.08, 0.46, 0.09], [-0.1, -0.23, 0.0], [-0.22, -0.98, 0.0], [-0.24, -1.68, 0.0]]} color="#ff1133" lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[[-0.08, 0.44, 0.07], [-0.14, -0.27, -0.02], [-0.26, -1.02, -0.02], [-0.28, -1.72, 0.0]]} color="#0055ff" lineWidth={0.8} transparent opacity={0.6} />

      <Line points={[[-0.08, 0.46, 0.09], [0.1, -0.23, 0.0], [0.22, -0.98, 0.0], [0.24, -1.68, 0.0]]} color="#ff1133" lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[[-0.08, 0.44, 0.07], [0.14, -0.27, -0.02], [0.26, -1.02, -0.02], [0.28, -1.72, 0.0]]} color="#0055ff" lineWidth={0.8} transparent opacity={0.6} />

      {/* Carotid Vascular Feed (Neck to Brain) */}
      <Line points={[[-0.08, 0.46, 0.09], [-0.05, 1.0, 0.02], [0.0, 1.35, 0.05]]} color="#ff1133" lineWidth={1.0} transparent opacity={0.6} />
      <Line points={[[-0.08, 0.44, 0.07], [-0.09, 1.0, -0.02], [-0.04, 1.35, -0.01]]} color="#0055ff" lineWidth={1.0} transparent opacity={0.6} />

      {/* 4. Nervous System Branches (Purple) */}
      <Line points={[[0, 0.95, -0.05], [-0.45, 1.05, 0], [-0.62, 0.55, 0], [-0.8, 0.05, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, 0.95, -0.05], [0.45, 1.05, 0], [0.62, 0.55, 0], [0.8, 0.05, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, -0.1, -0.05], [-0.2, -0.25, 0], [-0.24, -1.0, 0], [-0.25, -1.7, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, -0.1, -0.05], [0.2, -0.25, 0], [0.24, -1.0, 0], [0.25, -1.7, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />

      {/* 5. BRAIN Mesh - Interactive */}
      <group
        position={[0, 1.4, 0]}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('auto')}
        onClick={() => handleSelectCondition('epilepsy')}
      >
        <mesh ref={brainMeshRef}>
          <icosahedronGeometry args={[0.22, 2]} />
          <meshStandardMaterial
            ref={brainMatRef}
            wireframe
            transparent
            opacity={0.7}
            color="#c040ff"
            emissive="#c040ff"
            emissiveIntensity={1.0}
            blending={THREE.AdditiveBlending}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Halo of revolving neural orbits around head */}
        <mesh ref={brainRingRef} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.38, 0.01, 8, 32]} />
          <meshBasicMaterial color="#c040ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[0.42, 0.006, 6, 24]} />
          <meshBasicMaterial color="#c040ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* 6. LUNGS Meshes & Inner Branching Bronchial Airway Trees - Interactive */}
      <group
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('auto')}
        onClick={() => handleSelectCondition('asthma')}
      >
        {/* Left Lung Lobe */}
        <mesh ref={leftLungMeshRef} position={[-0.24, 0.5, 0.02]}>
          <cylinderGeometry args={[0.12, 0.08, 0.5, 12, 4]} />
          <meshStandardMaterial
            ref={lungMatRef}
            wireframe
            transparent
            opacity={0.7}
            color="#00ccff"
            emissive="#00ccff"
            emissiveIntensity={1.0}
            blending={THREE.AdditiveBlending}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Right Lung Lobe */}
        <mesh ref={rightLungMeshRef} position={[0.24, 0.5, 0.02]}>
          <cylinderGeometry args={[0.12, 0.08, 0.5, 12, 4]} />
          <meshStandardMaterial
            ref={lungMatRef} // share material parameters
            wireframe
            transparent
            opacity={0.7}
            color="#00ccff"
            emissive="#00ccff"
            emissiveIntensity={1.0}
            blending={THREE.AdditiveBlending}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Bronchial Airways Lobe Left */}
        <group position={[-0.24, 0.5, 0.02]} scale={[0.85, 0.85, 0.85]}>
          <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.015, 0.01, 0.15, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[-0.04, -0.05, 0.03]} rotation={[0.2, 0, 0.8]}>
            <cylinderGeometry args={[0.01, 0.006, 0.12, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.04, -0.08, -0.02]} rotation={[-0.2, 0, 0.2]}>
            <cylinderGeometry args={[0.01, 0.006, 0.12, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
        </group>
        {/* Bronchial Airways Lobe Right */}
        <group position={[0.24, 0.5, 0.02]} scale={[0.85, 0.85, 0.85]}>
          <mesh position={[0, 0.1, 0]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.015, 0.01, 0.15, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.04, -0.05, 0.03]} rotation={[0.2, 0, -0.8]}>
            <cylinderGeometry args={[0.01, 0.006, 0.12, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[-0.04, -0.08, -0.02]} rotation={[-0.2, 0, -0.2]}>
            <cylinderGeometry args={[0.01, 0.006, 0.12, 6]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
          </mesh>
        </group>
      </group>

      {/* 7. HEART Mesh with pulsing Aorta pipe - Interactive */}
      <group
        position={[-0.08, 0.46, 0.09]}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('auto')}
        onClick={() => handleSelectCondition('arrhythmia')}
      >
        <mesh ref={heartMeshRef} rotation={[0.15, 0, 0.2]}>
          <octahedronGeometry args={[0.13, 2]} />
          <meshStandardMaterial
            ref={heartMatRef}
            wireframe
            transparent
            opacity={0.7}
            color="#ff2b56"
            emissive="#ff2b56"
            emissiveIntensity={1.0}
            blending={THREE.AdditiveBlending}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Pulsing Aorta Arc tube */}
        <mesh position={[0, 0.09, 0.01]} rotation={[0, 0, -Math.PI / 4]}>
          <torusGeometry args={[0.045, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#ff2b56" roughness={0.5} />
        </mesh>
      </group>

      {/* 8. LIVER Mesh (Abdomen Right Lobe) - Interactive */}
      <mesh
        ref={liverMeshRef}
        position={[0.13, 0.12, 0.07]}
        rotation={[0.2, -0.3, -0.1]}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('auto')}
        onClick={() => handleSelectCondition('diabetes')}
      >
        <coneGeometry args={[0.15, 0.18, 4]} />
        <meshStandardMaterial
          ref={liverMatRef}
          wireframe
          transparent
          opacity={0.7}
          color="#ff9900"
          emissive="#ff9900"
          emissiveIntensity={1.0}
          blending={THREE.AdditiveBlending}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 9. Glowing Bent 3D HUD Pointers / Leader Lines */}
      {/* Brain Pointer */}
      <HudPointerLine start={[0, 1.4, 0]} mid={[1.3, 1.4, 0]} end={[1.7, 1.4, 0]} color="#c040ff" active={currentCondition === 'epilepsy'} />
      {/* Lungs Pointer */}
      <HudPointerLine start={[0.24, 0.5, 0.02]} mid={[1.3, 0.5, 0]} end={[1.7, 0.5, 0]} color="#00ccff" active={currentCondition === 'asthma'} />
      {/* Heart Pointer */}
      <HudPointerLine start={[-0.08, 0.46, 0.09]} mid={[-1.3, 0.46, 0]} end={[-1.7, 0.46, 0]} color="#ff2b56" active={currentCondition === 'arrhythmia'} />
      {/* Liver Pointer */}
      <HudPointerLine start={[0.13, 0.12, 0.07]} mid={[1.3, -0.4, 0]} end={[1.7, -0.4, 0]} color="#ff9900" active={currentCondition === 'diabetes'} />

      {/* 10. Floating Holographic HUD HTML Cards in 3D Space */}

      {/* A. NEUROLOGICAL DISTURBANCE (Brain - Top Right) */}
      <Html position={[1.7, 1.4, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          onClick={() => handleSelectCondition('epilepsy')}
          className={`p-3 rounded border font-mono select-none pointer-events-auto cursor-pointer transition-all duration-300 w-52 flex flex-col gap-1.5 ${
            currentCondition === 'epilepsy'
              ? 'bg-[#080d0a]/92 border-[#c040ff] text-slate-100 shadow-[0_0_15px_rgba(192,64,255,0.25)] opacity-100 scale-100'
              : 'bg-[#080d0a]/70 border-[#c040ff]/20 text-slate-400 opacity-45 saturate-[0.3] scale-95 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#c040ff] tracking-widest">NEUROLOGICAL DISTURBANCE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c040ff] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>PATHOLOGY:</span>
              <span className="font-bold text-slate-200">SEIZURE PATTERN</span>
            </div>
            <div className="flex justify-between">
              <span>METRIC (EEG):</span>
              <span className="font-bold text-[#c040ff]">{brainwaveFreq.toFixed(1)} Hz</span>
            </div>
          </div>
          <MiniSvgWave color="#c040ff" speed={currentCondition === 'epilepsy' ? 3.0 : 0.8} amplitude={8} type="noise" />
          <div className="text-[7px] font-bold text-red-500/80 animate-pulse tracking-wide uppercase mt-0.5">
            STATUS: CRITICAL SEIZURE ALERT
          </div>
        </div>
      </Html>

      {/* B. RESPIRATORY FUNCTION (Lungs - Center Right) */}
      <Html position={[1.7, 0.5, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          onClick={() => handleSelectCondition('asthma')}
          className={`p-3 rounded border font-mono select-none pointer-events-auto cursor-pointer transition-all duration-300 w-52 flex flex-col gap-1.5 ${
            currentCondition === 'asthma'
              ? 'bg-[#080d0a]/92 border-[#00ccff] text-slate-100 shadow-[0_0_15px_rgba(0,204,255,0.25)] opacity-100 scale-100'
              : 'bg-[#080d0a]/70 border-[#00ccff]/20 text-slate-400 opacity-45 saturate-[0.3] scale-95 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#00ccff] tracking-widest">RESPIRATORY FUNCTION</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ccff] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>TARGET STATE:</span>
              <span className="font-bold text-slate-200">ASTHMA FLARE</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>BPM: <strong className="text-slate-100">{bpm}</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>GLUCOSE: <strong className="text-slate-100">{glucose}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#00ccff" speed={currentCondition === 'asthma' ? 0.6 : 1.2} amplitude={6} type="sine" />
          <div className="text-[7px] font-bold text-amber-500/80 animate-pulse tracking-wide uppercase mt-0.5">
            STATUS: BRONCHIAL COMPRESSION
          </div>
        </div>
      </Html>

      {/* C. CARDIAC ARRHYTHMIA (Heart - Center Left) */}
      <Html position={[-1.7, 0.46, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          onClick={() => handleSelectCondition('arrhythmia')}
          className={`p-3 rounded border font-mono select-none pointer-events-auto cursor-pointer transition-all duration-300 w-52 flex flex-col gap-1.5 ${
            currentCondition === 'arrhythmia'
              ? 'bg-[#080d0a]/92 border-[#ff2b56] text-slate-100 shadow-[0_0_15px_rgba(255,43,86,0.25)] opacity-100 scale-100'
              : 'bg-[#080d0a]/70 border-[#ff2b56]/20 text-slate-400 opacity-45 saturate-[0.3] scale-95 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#ff2b56] tracking-widest">CARDIAC ARRHYTHMIA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b56] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>PATHOLOGY:</span>
              <span className="font-bold text-slate-200">IRREGULAR BEAT</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>BPM: <strong className="text-[#ff2b56] font-bold">{bpm}</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>GLUC: <strong className="text-slate-100">{glucose}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#ff2b56" speed={currentCondition === 'arrhythmia' ? 2.5 : 1.0} amplitude={9} type="ecg" />
          <div className="text-[7px] font-bold text-red-500/80 animate-pulse tracking-wide uppercase mt-0.5">
            STATUS: CRITICAL VENTRICULAR LOAD
          </div>
        </div>
      </Html>

      {/* D. DIABETIC GLUCOSE SPIKE (Liver - Bottom Right) */}
      <Html position={[1.7, -0.4, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          onClick={() => handleSelectCondition('diabetes')}
          className={`p-3 rounded border font-mono select-none pointer-events-auto cursor-pointer transition-all duration-300 w-52 flex flex-col gap-1.5 ${
            currentCondition === 'diabetes'
              ? 'bg-[#080d0a]/92 border-[#ff9900] text-slate-100 shadow-[0_0_15px_rgba(255,153,0,0.25)] opacity-100 scale-100'
              : 'bg-[#080d0a]/70 border-[#ff9900]/20 text-slate-400 opacity-45 saturate-[0.3] scale-95 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#ff9900] tracking-widest">DIABETIC GLUCOSE SPIKE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9900] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>METABOLIC STATE:</span>
              <span className="font-bold text-slate-200">GLUCOSE CRISIS</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>GLUCOSE: <strong className="text-[#ff9900] font-bold">{glucose} mg/dL</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>BPM: <strong className="text-slate-100">{bpm}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#ff9900" speed={0.8} amplitude={4} type="flat" />
          <div className="text-[7px] font-bold text-red-500/80 animate-pulse tracking-wide uppercase mt-0.5">
            STATUS: INSULIN SATURATION LIMITS
          </div>
        </div>
      </Html>
    </group>
  )
}

export default function DigitalTwinScene({ currentCondition }: DigitalTwinSceneProps) {
  useEffect(() => {
    // Connect to the WebSocket telemetry server on mount
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const wsUrl = `ws://${host}:8080`
    useTelemetryStore.getState().connectToTelemetry(wsUrl)
    return () => {
      // Clean up connection on unmount
      useTelemetryStore.getState().disconnectFromTelemetry()
    }
  }, [])

  useEffect(() => {
    // Sync the currentCondition prop to the Zustand store
    useTelemetryStore.getState().setCurrentCondition(currentCondition)
  }, [currentCondition])

  return (
    <div className="w-full h-full relative bg-[#040806]/85">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        
        {/* Focused spot lighting to project highlights on transmission clearcoat glass material */}
        <spotLight position={[5, 5, 5]} angle={0.4} penumbra={1} intensity={6.0} color="#00f6ff" />
        <spotLight position={[-5, 5, 5]} angle={0.4} penumbra={1} intensity={3.5} color="#c040ff" />
        <pointLight position={[0, -2, 3]} intensity={1.5} color="#00ffaa" />
        
        <HologramScene />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 + 0.15}
          minDistance={1.8}
          maxDistance={5.0}
          enablePan={false}
        />
      </Canvas>
    </div>
  )
}
