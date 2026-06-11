'use client'

import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useTelemetryStore } from '@/lib/useTelemetryStore'

interface DigitalTwinSceneProps {
  currentCondition: 'general' | 'arrhythmia' | 'asthma' | 'epilepsy'
}

// Internal scene component that runs within the Canvas provider
function HologramScene() {
  // Mesh Refs
  const brainMeshRef = useRef<THREE.Mesh>(null)
  const leftLungMeshRef = useRef<THREE.Mesh>(null)
  const rightLungMeshRef = useRef<THREE.Mesh>(null)
  const heartMeshRef = useRef<THREE.Mesh>(null)
  const spineMeshRef = useRef<THREE.LineSegments>(null)

  // Material Refs
  const brainMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lungMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const heartMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const spineMatRef = useRef<THREE.LineBasicMaterial>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime

    // ─────────────────────────────────────────────────────────────────────────
    // WEBGL PERFORMANCE OPTIMIZATION BOUNDARY:
    // Read Zustand state DIRECTLY from the store inside the useFrame tick hook.
    // This bypasses React component re-renders completely, letting the WebGL Canvas
    // animate at 60fps responding to real-time streams with zero React overhead.
    // ─────────────────────────────────────────────────────────────────────────
    const telemetry = useTelemetryStore.getState()
    const currentCondition = telemetry.currentCondition
    const bpm = telemetry.liveTelemetryFrame.bpm
    const oxygen = telemetry.liveTelemetryFrame.oxygenSaturation
    const brainwaveFreq = telemetry.liveTelemetryFrame.brainwaveFrequency

    // Map UI selector conditions to raw semantic biological keys
    const isCardiac = currentCondition === 'arrhythmia' || currentCondition === 'cardiac'
    const isRespiratory = currentCondition === 'asthma' || currentCondition === 'respiratory'
    const isNeurological = currentCondition === 'epilepsy' || currentCondition === 'neurological'
    const isGeneral = currentCondition === 'general'

    // 1. Determine target opacities, emissive intensities, and colors based on active condition
    let targetBrainOpacity = 0.15
    let targetLungOpacity = 0.15
    let targetHeartOpacity = 0.15
    let targetSpineOpacity = 0.15

    let targetBrainEmissive = 0.3
    let targetLungEmissive = 0.3
    let targetHeartEmissive = 0.3

    let brainColor = new THREE.Color('#c040ff') // Purple for epilepsy
    let lungColor = new THREE.Color('#00ccff')  // Cyan for asthma
    let heartColor = new THREE.Color('#ff2b56') // Red for arrhythmia
    const defaultSpineColor = new THREE.Color('#00ffaa') // Green for general

    if (isGeneral) {
      // General mode - all organs visible and nominal (green accents)
      targetBrainOpacity = 0.75
      targetLungOpacity = 0.75
      targetHeartOpacity = 0.75
      targetSpineOpacity = 0.75

      targetBrainEmissive = 0.8
      targetLungEmissive = 0.8
      targetHeartEmissive = 0.8

      brainColor = new THREE.Color('#00ffaa')
      lungColor = new THREE.Color('#00ffaa')
      heartColor = new THREE.Color('#00ffaa')
    } else if (isNeurological) {
      targetBrainOpacity = 0.95
      targetSpineOpacity = 0.4
    } else if (isRespiratory) {
      targetLungOpacity = 0.95
      targetSpineOpacity = 0.4
    } else if (isCardiac) {
      targetHeartOpacity = 0.95
      targetSpineOpacity = 0.4
    }

    // 2. Physical transformations & pulsing loops driven by live data streams
    // A. Heart Beat Pulse (Scale & Emissive intensity tied to cardiac phase)
    let heartScale = 1.0
    let heartEmissivePulse = targetHeartEmissive

    if (isCardiac) {
      // Tachycardia tachycardia - fast erratic contraction scale spike
      const beatDuration = 60 / bpm
      const timeInBeat = (elapsed) % beatDuration
      const phase = timeInBeat / beatDuration

      if (phase < 0.12) {
        // Rapid contraction spike
        const t = phase / 0.12
        heartScale = 1.0 + Math.sin(t * Math.PI) * 0.22
        heartEmissivePulse = 2.4 // flash red on peak
      } else if (phase >= 0.12 && phase < 0.4) {
        // Erratic relaxation
        const t = (phase - 0.12) / 0.28
        heartScale = 1.0 + Math.cos(t * Math.PI / 2) * 0.22
        heartEmissivePulse = 0.6 + Math.cos(t * Math.PI / 2) * 1.8
      } else {
        // Rest state
        heartScale = 1.0
        heartEmissivePulse = 0.3
      }
      
      // Add irregular ventricular vibration noise
      heartScale += (Math.random() - 0.5) * 0.018
    } else {
      // Nominal sinus cycle heartbeat curve
      const beatDuration = 60 / bpm
      const timeInBeat = elapsed % beatDuration
      const phase = timeInBeat / beatDuration

      if (phase < 0.15) {
        // Systole: rapid contraction
        const t = phase / 0.15
        heartScale = 1.0 + Math.sin(t * Math.PI) * 0.15
        heartEmissivePulse = 1.8 // pulse bright
      } else if (phase >= 0.15 && phase < 0.45) {
        // Diastole: smooth expansion
        const t = (phase - 0.15) / 0.30
        heartScale = 1.0 + Math.cos(t * Math.PI / 2) * 0.15
        heartEmissivePulse = 0.6 + Math.cos(t * Math.PI / 2) * 1.2
      } else {
        // Isoelectric rest phase
        heartScale = 1.0
        heartEmissivePulse = 0.6
      }
    }

    if (heartMeshRef.current) {
      heartMeshRef.current.scale.set(heartScale, heartScale, heartScale)
    }

    // B. Lungs Respiration (Breathing cycle tied to respiratory frequency and oxygen saturation)
    let lungScaleY = 1.0
    let lungScaleXZ = 1.0
    let lungEmissivePulse = targetLungEmissive

    // Calculate breath period in seconds (nominal: 14 breaths/min -> 4.28s)
    const respRate = isRespiratory ? 9 : 14
    const breathDuration = 60 / respRate
    const respPhase = (elapsed / breathDuration) * Math.PI * 2
    const breathingFactor = Math.sin(respPhase)

    if (isRespiratory) {
      // Restricted shallow breathing expansion (oxygen saturation depresses amplitude)
      const amplitudeFactor = (oxygen / 100) * 0.05
      lungScaleY = 1.0 + breathingFactor * amplitudeFactor
      lungScaleXZ = 1.0 + breathingFactor * (amplitudeFactor * 0.5)
      
      // Pulse cyan glow on inhalation
      lungEmissivePulse = 0.3 + (breathingFactor > 0 ? breathingFactor * 1.8 : 0)
    } else {
      // Nominal full-depth deep breath cycle
      lungScaleY = 1.0 + breathingFactor * 0.09
      lungScaleXZ = 1.0 + breathingFactor * 0.04
      lungEmissivePulse = 0.6 + (breathingFactor > 0 ? breathingFactor * 1.0 : 0)
    }

    if (leftLungMeshRef.current && rightLungMeshRef.current) {
      leftLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
      rightLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
    }

    // C. Brain Synaptic Flares (Rotation & electrical bursts based on brainwave frequency)
    let brainScale = 1.0
    let brainEmissivePulse = targetBrainEmissive

    if (brainMeshRef.current) {
      if (isNeurological) {
        // High frequency erratic rotation
        brainMeshRef.current.rotation.y += brainwaveFreq * 0.003
        
        // Chaotic vibration amplitude scale
        const jitter = (Math.random() - 0.5) * 0.04 * (brainwaveFreq / 12)
        brainScale = 1.0 + jitter

        // Erratic neurological burst flashes (burst voltage spikes)
        if (Math.random() > 0.88) {
          brainEmissivePulse = 3.0 // massive electrical burst flash
        } else {
          brainEmissivePulse = 0.3 + Math.random() * 0.7
        }
      } else {
        // Nominal steady rotation
        brainMeshRef.current.rotation.y += brainwaveFreq * 0.001
        brainScale = 1.0
        brainEmissivePulse = 0.6 + Math.sin(elapsed * 2.0) * 0.2 // soft breathing pulse
      }
      
      brainMeshRef.current.scale.set(brainScale, brainScale, brainScale)
    }

    // 3. Smoothly apply computed properties to materials
    if (brainMatRef.current) {
      brainMatRef.current.opacity = THREE.MathUtils.lerp(brainMatRef.current.opacity, targetBrainOpacity, 0.08)
      brainMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(brainMatRef.current.emissiveIntensity, brainEmissivePulse, 0.1)
      brainMatRef.current.color.lerp(brainColor, 0.08)
      brainMatRef.current.emissive.lerp(brainColor, 0.08)
    }

    if (lungMatRef.current) {
      lungMatRef.current.opacity = THREE.MathUtils.lerp(lungMatRef.current.opacity, targetLungOpacity, 0.08)
      lungMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(lungMatRef.current.emissiveIntensity, lungEmissivePulse, 0.08)
      lungMatRef.current.color.lerp(lungColor, 0.08)
      lungMatRef.current.emissive.lerp(lungColor, 0.08)
    }

    if (heartMatRef.current) {
      heartMatRef.current.opacity = THREE.MathUtils.lerp(heartMatRef.current.opacity, targetHeartOpacity, 0.08)
      heartMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(heartMatRef.current.emissiveIntensity, heartEmissivePulse, 0.12)
      heartMatRef.current.color.lerp(heartColor, 0.08)
      heartMatRef.current.emissive.lerp(heartColor, 0.08)
    }

    if (spineMatRef.current) {
      spineMatRef.current.opacity = THREE.MathUtils.lerp(spineMatRef.current.opacity, targetSpineOpacity, 0.08)
      const spineColor = isGeneral ? defaultSpineColor : (isNeurological ? brainColor : (isRespiratory ? lungColor : heartColor))
      spineMatRef.current.color.lerp(spineColor, 0.08)
    }
  })

  // Create spinal cord line points
  const points = []
  for (let i = -1.5; i <= 1.4; i += 0.1) {
    points.push(new THREE.Vector3(0, i, 0))
    points.push(new THREE.Vector3(0.08 * Math.sin(i * 10), i, 0))
  }
  const spineGeometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <group position={[0, -0.2, 0]}>
      {/* 1. BRAIN Wireframe Model */}
      <mesh ref={brainMeshRef} position={[0, 1.4, 0]}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial
          ref={brainMatRef}
          wireframe
          transparent
          opacity={0.7}
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={1.0}
          blending={THREE.AdditiveBlending}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 2. LUNGS (Symmetrical Left & Right Lobe meshes) */}
      <mesh ref={leftLungMeshRef} position={[-0.48, 0.2, 0]}>
        <cylinderGeometry args={[0.22, 0.15, 0.9, 12, 4]} />
        <meshStandardMaterial
          ref={lungMatRef}
          wireframe
          transparent
          opacity={0.7}
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={1.0}
          blending={THREE.AdditiveBlending}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      <mesh ref={rightLungMeshRef} position={[0.48, 0.2, 0]}>
        <cylinderGeometry args={[0.22, 0.15, 0.9, 12, 4]} />
        <meshStandardMaterial
          ref={lungMatRef} // share material parameters
          wireframe
          transparent
          opacity={0.7}
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={1.0}
          blending={THREE.AdditiveBlending}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 3. HEART Wireframe Model (Centered and slightly tilted) */}
      <mesh ref={heartMeshRef} position={[-0.14, 0.15, 0.12]} rotation={[0.2, 0, 0.25]}>
        <octahedronGeometry args={[0.26, 2]} />
        <meshStandardMaterial
          ref={heartMatRef}
          wireframe
          transparent
          opacity={0.7}
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={1.0}
          blending={THREE.AdditiveBlending}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 4. SPINE (Neural Connection Cable) */}
      <lineSegments ref={spineMeshRef} geometry={spineGeometry}>
        <lineBasicMaterial
          ref={spineMatRef}
          transparent
          opacity={0.7}
          color="#00ffaa"
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 5. BASE GRID AND TECH RINGS */}
      <gridHelper args={[6, 16, '#00ffaa', '#11221d']} position={[0, -1.6, 0]} />
      
      {/* Revolving ring indicator */}
      <mesh position={[0, -1.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.84, 32]} />
        <meshBasicMaterial color="rgba(0, 255, 170, 0.18)" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function DigitalTwinScene({ currentCondition }: DigitalTwinSceneProps) {
  useEffect(() => {
    // Connect to the WebSocket telemetry server on mount
    useTelemetryStore.getState().connectToTelemetry('ws://localhost:8080')
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
        <ambientLight intensity={0.3} />
        
        {/* Soft, low-intensity spot-lights to avoid wireframe color blowout/overexposure */}
        <pointLight position={[2, 3, 4]} intensity={0.25} color="#00ffaa" />
        <pointLight position={[-3, -2, -3]} intensity={0.15} color="#00ccff" />
        
        <HologramScene />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minDistance={2.0}
          maxDistance={6.0}
          enablePan={false}
        />
      </Canvas>
    </div>
  )
}
