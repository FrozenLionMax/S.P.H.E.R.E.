'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useTelemetryStore } from '@/lib/useTelemetryStore'
import { AlertTriangle, Heart, Activity, Brain, Shield } from 'lucide-react'

interface DigitalTwinSceneProps {
  transparent?: boolean
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
  const glassColor = '#ffffff'
  const { camera } = useThree()

  return (
    <group 
      onClick={(e) => { 
        e.stopPropagation()
        
        // Don't override if an organ was clicked (organ clicks are handled in their own groups)
        const p = e.point
        
        // The safest way to zoom is to move the camera closer along the horizontal plane to the clicked point
        const dir = camera.position.clone().sub(p)
        dir.y = 0 // Flatten the Y axis so the camera stays perfectly level with the clicked point
        dir.normalize()
        if (dir.lengthSq() === 0) dir.set(0, 0, 1)
        
        // Place the camera 0.8 units away from the clicked point
        const camPos = p.clone().add(dir.multiplyScalar(0.8))
        
        useTelemetryStore.getState().setCustomZoomTarget({ 
          pos: [camPos.x, camPos.y, camPos.z], 
          target: [p.x, p.y, p.z] 
        })
        useTelemetryStore.getState().setSelectedOrgan('custom')
      }}
    >
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
// Pulsing Vascular Arterial Line Component
// ─────────────────────────────────────────────────────────────────────────────
function PulsingVascularLine({ points, color, baseWidth = 0.8, baseOpacity = 0.6 }: { points: [number, number, number][]; color: string; baseWidth?: number; baseOpacity?: number }) {
  const lineRef = useRef<any>(null)
  useFrame((state) => {
    if (lineRef.current && lineRef.current.material) {
      const elapsed = state.clock.getElapsedTime()
      lineRef.current.material.linewidth = baseWidth * (1.2 + Math.sin(elapsed * 5.0) * 0.4)
      lineRef.current.material.opacity = baseOpacity * (0.7 + Math.sin(elapsed * 5.0) * 0.3)
    }
  })
  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={baseWidth}
      transparent
      opacity={baseOpacity}
      blending={THREE.AdditiveBlending}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hyperrealistic Procedural Heart & Aorta Components
// ─────────────────────────────────────────────────────────────────────────────
const ProceduralHeart = React.forwardRef<THREE.Mesh, { color: THREE.Color, emissiveIntensity: number }>((props, ref) => {
  const { color, emissiveIntensity } = props
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uContraction: { value: 0 }
  }), [])

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime
    // The parent controls the basic scale to match BPM, but we add high-frequency contraction
    const phase = (state.clock.elapsedTime % (60 / useTelemetryStore.getState().liveTelemetryFrame.bpm)) / (60 / useTelemetryStore.getState().liveTelemetryFrame.bpm)
    uniforms.uContraction.value = phase < 0.15 ? Math.sin((phase / 0.15) * Math.PI) : 0.0
    
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = emissiveIntensity
      materialRef.current.color.copy(color)
      materialRef.current.emissive.copy(color)
    }
  })

  // Shader to morph a sphere into a heart shape with beating ventricles
  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uContraction = uniforms.uContraction
    
    shader.vertexShader = `
      uniform float uTime;
      uniform float uContraction;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      vec3 p = position;
      // Morph sphere into heart shape roughly
      float x = p.x;
      float y = p.y;
      float z = p.z;
      
      // Basic cardioid-like distortion on Y axis
      y -= abs(x) * 0.4;
      
      // Aorta bulge at top
      if (y > 0.5) {
        x += sin(y * 10.0) * 0.1;
      }
      
      // Ventricle contraction (pinch inward based on beat phase)
      // Lower half pinches more than upper half
      float pinch = uContraction * smoothstep(0.5, -1.0, y) * 0.3;
      p.x = x * (1.0 - pinch);
      p.y = y;
      p.z = z * (1.0 - pinch * 0.5); // Less pinch on Z
      
      // Organic surface noise
      float noise = sin(p.x * 20.0 + uTime) * sin(p.y * 20.0) * sin(p.z * 20.0) * 0.015;
      p += normal * noise;
      
      vec3 transformed = p;
      `
    )
  }

  return (
    <mesh ref={ref} rotation={[0.15, 0, 0.2]}>
      <sphereGeometry args={[0.13, 64, 64]} />
      <meshStandardMaterial
        ref={materialRef}
        transparent
        opacity={0.8}
        roughness={0.4}
        metalness={0.3}
        blending={THREE.AdditiveBlending}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
})

function AortaTube() {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0.02, 0.18, 0.05),
      new THREE.Vector3(-0.04, 0.25, -0.02),
      new THREE.Vector3(-0.1, 0.22, -0.05),
      new THREE.Vector3(-0.1, 0.15, -0.05)
    ])
  }, [])

  const uniforms = useMemo(() => ({
    uPulsePhase: { value: 0 }
  }), [])

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    const bpm = useTelemetryStore.getState().liveTelemetryFrame.bpm
    const beatDuration = 60 / bpm
    // Phase 0 to 1 over the beat duration
    uniforms.uPulsePhase.value = (elapsed % beatDuration) / beatDuration
  })

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uPulsePhase = uniforms.uPulsePhase
    shader.vertexShader = `
      uniform float uPulsePhase;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      vec3 transformed = position;
      // uv.x goes from 0 to 1 along the tube
      // Create a localized bulge that travels from 0 to 1 based on phase
      // Delay the pulse slightly so it starts right after the heart contracts (phase ~0.15)
      float wavePos = (uPulsePhase - 0.1) * 1.5; 
      float dist = abs(uv.x - wavePos);
      float bulge = exp(-dist * dist * 30.0) * 0.4; // Localized bump
      
      // Expand along normal
      transformed += normal * bulge * smoothstep(0.0, 0.1, uv.x); // Don't bulge at the very base
      `
    )
  }

  return (
    <mesh position={[-0.08, 0.46, 0.09]}>
      <tubeGeometry args={[curve, 64, 0.008, 16, false]} />
      <meshStandardMaterial
        color="#ff2b56"
        emissive="#ff2b56"
        emissiveIntensity={1.5}
        transparent
        opacity={0.8}
        roughness={0.3}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Visible Bloodflow Direction (Instanced Glowing Orbs)
// ─────────────────────────────────────────────────────────────────────────────
function VascularBloodflow({ points, count = 15, color = '#ff9900' }: { points: [number, number, number][], count?: number, color?: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  const curve = useMemo(() => {
    const vectors = points.map(p => new THREE.Vector3(...p))
    return new THREE.CatmullRomCurve3(vectors)
  }, [points])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const phases = useMemo(() => new Float32Array(count).map(() => Math.random()), [count])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const bpm = useTelemetryStore.getState().liveTelemetryFrame.bpm
    const speed = (bpm / 60) * 0.4 // Base speed based on BPM

    for (let i = 0; i < count; i++) {
      phases[i] = (phases[i] + delta * speed) % 1.0
      
      const pos = curve.getPointAt(phases[i])
      dummy.position.copy(pos)
      
      // Optional: Add tangent-based rotation if we used non-spheres, but spheres are fine.
      // Pulse scale based on heartbeat
      const beatPhase = (state.clock.elapsedTime % (60 / bpm)) / (60 / bpm)
      const isPulse = beatPhase < 0.2
      const scale = isPulse ? 1.5 : 1.0
      dummy.scale.setScalar(scale)
      
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <PulsingVascularLine points={points} color={color} baseWidth={0.8} baseOpacity={0.4} />
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Physiological Lung Morphing Component
// ─────────────────────────────────────────────────────────────────────────────
function PhysiologicalLung({ position, isLeft, color, emissiveIntensity }: { position: [number, number, number], isLeft: boolean, color: THREE.Color, emissiveIntensity: number }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  
  const uniforms = useMemo(() => ({
    uBreathExpansion: { value: 0 }
  }), [])

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    const liveOxygen = useTelemetryStore.getState().liveTelemetryFrame.oxygenSaturation
    
    const respRate = 9 // Pulmonary distress compensation rate
    const breathDuration = 60 / respRate
    const respPhase = ((elapsed / breathDuration) * Math.PI * 2)
    const breathingFactor = Math.sin(respPhase)

    // Calculate amplitude based on oxygen distress
    const amplitudeFactor = (liveOxygen / 100) * 0.15
    uniforms.uBreathExpansion.value = Math.max(0, breathingFactor) * amplitudeFactor

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = emissiveIntensity
      materialRef.current.color.copy(color)
      materialRef.current.emissive.copy(color)
    }
  })

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uBreathExpansion = uniforms.uBreathExpansion
    shader.vertexShader = `
      uniform float uBreathExpansion;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      vec3 transformed = position;
      
      // The cylinder height is 0.5 (from -0.25 to +0.25 locally)
      // Map local y to a gradient: 0.0 at the top, 1.0 at the bottom
      float bottomFactor = smoothstep(0.25, -0.25, position.y);
      
      // Expand outward along X/Z mostly at the bottom
      transformed.x += sign(position.x) * bottomFactor * uBreathExpansion * 0.8;
      transformed.z += sign(position.z) * bottomFactor * uBreathExpansion * 0.8;
      
      // Pull downward at the bottom (diaphragm pulling)
      transformed.y -= bottomFactor * uBreathExpansion * 1.2;
      `
    )
  }

  // Use a softer geometry (sphere stretched) rather than a rigid cylinder for organic feel
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        wireframe
        transparent
        opacity={0.7}
        roughness={0.8}
        metalness={0.1}
        blending={THREE.AdditiveBlending}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary Internal WebGL Hologram Scene Component
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Interactive Camera Controller
// ─────────────────────────────────────────────────────────────────────────────
function CameraController({ controlsRef }: { controlsRef: any }) {
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan)
  const customZoomTarget = useTelemetryStore((s) => s.customZoomTarget)
  const { camera } = useThree()
  
  const lastOrgan = useRef(selectedOrgan)
  const isTransitioning = useRef(false)
  const customTargetId = useRef(0)
  
  const targets = useMemo(() => ({
    none: { pos: new THREE.Vector3(0, 0, 3.8), target: new THREE.Vector3(0, 0, 0) },
    heart: { pos: new THREE.Vector3(-0.08, 0.46, 0.9), target: new THREE.Vector3(-0.08, 0.46, 0.09) },
    lungs: { pos: new THREE.Vector3(0, 0.5, 1.2), target: new THREE.Vector3(0, 0.5, 0.02) },
    brain: { pos: new THREE.Vector3(0, 1.35, 0.9), target: new THREE.Vector3(0, 1.35, 0.05) }
  }), [])

  useFrame((state, delta) => {
    if (!controlsRef.current) return
    
    if (lastOrgan.current !== selectedOrgan) {
      isTransitioning.current = true
      lastOrgan.current = selectedOrgan
    } else if (selectedOrgan === 'custom' && customZoomTarget) {
      // Re-trigger transition if user clicks a new spot while already in custom mode
      const currentId = customZoomTarget.pos[0] + customZoomTarget.target[0]
      if (customTargetId.current !== currentId) {
        isTransitioning.current = true
        customTargetId.current = currentId
      }
    }
    
    let t = targets[selectedOrgan as keyof typeof targets] || targets.none
    if (selectedOrgan === 'custom' && customZoomTarget) {
      t = {
        pos: new THREE.Vector3(...customZoomTarget.pos),
        target: new THREE.Vector3(...customZoomTarget.target)
      }
    }
    
    // Smoothly animate the focal target
    controlsRef.current.target.lerp(t.target, delta * 3.5)
    
    if (isTransitioning.current) {
      if (selectedOrgan !== 'none') {
        // Fly to specific inspection angle
        camera.position.lerp(t.pos, delta * 3.5)
        
        if (camera.position.distanceTo(t.pos) < 0.05) {
          isTransitioning.current = false
        }
      } else {
        // Return to full-body view while preserving current azimuthal rotation
        const dir = camera.position.clone().sub(controlsRef.current.target).normalize()
        if (dir.lengthSq() === 0) dir.set(0, 0, 1)
        
        const desiredPos = controlsRef.current.target.clone().add(dir.multiplyScalar(3.8))
        // Gently pull the vertical angle back towards the equator (y=0) for a clean spin
        desiredPos.y = THREE.MathUtils.lerp(desiredPos.y, 0, delta * 2.0)
        
        camera.position.lerp(desiredPos, delta * 3.5)
        
        // Stop forcing the camera once we reach the baseline distance so OrbitControls can zoom freely
        if (camera.position.distanceTo(desiredPos) < 0.05) {
          isTransitioning.current = false
        }
      }
    }
    
    controlsRef.current.update()
  })
  return null
}

function HologramScene() {
  // Mesh References
  const brainMeshRef = useRef<THREE.Mesh>(null)
  const leftLungMeshRef = useRef<THREE.Mesh>(null)
  const rightLungMeshRef = useRef<THREE.Mesh>(null)
  const heartMeshRef = useRef<THREE.Mesh>(null)
  const liverMeshRef = useRef<THREE.Mesh>(null)
  const brainRing1Ref = useRef<THREE.Mesh>(null)
  const brainRing2Ref = useRef<THREE.Mesh>(null)
  const brainRing3Ref = useRef<THREE.Mesh>(null)
  const heartWaveMeshRef = useRef<THREE.Mesh>(null)

  // Particle References
  const brainPointsRef = useRef<THREE.Points>(null)
  const lungPointsRef = useRef<THREE.Points>(null)

  // Material References
  const brainMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lungMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const heartMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const liverMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const heartWaveMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Pre-allocate Color objects outside useFrame to avoid per-frame GC allocations
  const brainColor = useRef(new THREE.Color('#c040ff'))
  const lungColor  = useRef(new THREE.Color('#00ccff'))
  const heartColor = useRef(new THREE.Color('#ff2b56'))
  const liverColor = useRef(new THREE.Color('#ff9900'))

  // Smooth noise accumulator for brain jitter (avoids jarring Math.random spikes)
  const brainJitter = useRef(1.0)

  // Subscribe to Zustand reactive updates to populate HUD overlay cards dynamically
  // Subscribe to Zustand reactive updates to populate HUD overlay cards dynamically

  const wireframeMode = useTelemetryStore((s) => s.wireframeMode)
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

  // Brain synaptic particle simulation data
  const brainParticlesCount = 80
  const brainParticlesData = useMemo(() => {
    const temp = new Float32Array(brainParticlesCount * 3)
    const speeds = new Float32Array(brainParticlesCount * 3)
    for (let i = 0; i < brainParticlesCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const dist = 0.05 + Math.random() * 0.15
      temp[i * 3]     = Math.sin(phi) * Math.cos(theta) * dist
      temp[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * dist
      temp[i * 3 + 2] = Math.cos(phi) * dist
      speeds[i * 3]     = temp[i * 3]     * 0.35
      speeds[i * 3 + 1] = temp[i * 3 + 1] * 0.35
      speeds[i * 3 + 2] = temp[i * 3 + 2] * 0.35
    }
    return { positions: temp, speeds }
  }, [])

  // Lung air path particle data — store per-particle x/z offsets to stop jitter
  const lungParticlesCount = 60
  const lungParticlesData = useMemo(() => {
    const positions = new Float32Array(lungParticlesCount * 3)
    const progress  = new Float32Array(lungParticlesCount)
    const side      = new Float32Array(lungParticlesCount)
    const offX      = new Float32Array(lungParticlesCount) // stable x offset per particle
    const offZ      = new Float32Array(lungParticlesCount) // stable z offset per particle
    for (let i = 0; i < lungParticlesCount; i++) {
      progress[i] = Math.random()
      side[i]     = Math.random() > 0.5 ? 1 : -1
      offX[i]     = (Math.random() - 0.5) * 0.012
      offZ[i]     = (Math.random() - 0.5) * 0.012
    }
    return { positions, progress, side, offX, offZ }
  }, [])

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime

    // Read state directly inside loop to optimize WebGL transforms at 60fps
    const telemetry = useTelemetryStore.getState()
    const liveBpm = telemetry.liveTelemetryFrame.bpm
    const liveOxygen = telemetry.liveTelemetryFrame.oxygenSaturation
    const liveBrainFreq = telemetry.liveTelemetryFrame.brainwaveFrequency

    // Hardcode all organ highlights and simulations to run concurrently under systemic stress
    const isCardiac = true
    const isRespiratory = true
    const isNeurological = true
    const isDiabetes = true

    // Target values for opacity and emissive glowing animation
    const selectedOrgan = telemetry.selectedOrgan
    
    // Apply Wireframe Mode
    const wireframeMode = telemetry.wireframeMode
    const isWireframe = wireframeMode === 'wireframe'
    const isGhost = wireframeMode === 'dots'
    
    if (brainMatRef.current) brainMatRef.current.wireframe = isWireframe
    if (lungMatRef.current) lungMatRef.current.wireframe = isWireframe
    if (heartMatRef.current) heartMatRef.current.wireframe = isWireframe
    if (liverMatRef.current) liverMatRef.current.wireframe = isWireframe
    
    // If in ghost ('dots') mode, we drastically lower the opacity so only particles/points are clearly visible
    const activeOpacity = isGhost ? 0.08 : 0.95
    const inactiveOpacity = 0.05
    
    let targetBrainOpacity = selectedOrgan === 'none' || selectedOrgan === 'brain' ? activeOpacity : inactiveOpacity
    let targetLungOpacity = selectedOrgan === 'none' || selectedOrgan === 'lungs' ? activeOpacity : inactiveOpacity
    let targetHeartOpacity = selectedOrgan === 'none' || selectedOrgan === 'heart' ? activeOpacity : inactiveOpacity
    let targetLiverOpacity = selectedOrgan === 'none' ? activeOpacity : inactiveOpacity

    let brainEmissive = 1.2
    let lungEmissive = 1.2
    let heartEmissive = 1.2
    let liverEmissive = 1.2

    // Use pre-allocated colors (no per-frame allocation)

    // 1. Heart Pulse Animation
    let heartScale = 1.0
    const beatDuration = 60 / liveBpm
    const timeInBeat = elapsed % beatDuration
    const phase = timeInBeat / beatDuration

    // Rapid irregular heartbeat animation
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
    // Subtle deterministic jitter tied to elapsed time — smooth, not random
    heartScale += Math.sin(elapsed * 47.3) * 0.008

    if (heartMeshRef.current) {
      heartMeshRef.current.scale.set(heartScale, heartScale, heartScale)
    }

    if (heartWaveMeshRef.current) {
      // The wave mesh is now removed, we handle aorta pulse in AortaTube
    }

    // 2. Lungs Material Updates (Scale and Expansion now handled inside PhysiologicalLung shader)
    const respRate = 9 // Pulmonary distress compensation rate
    const breathDuration = 60 / respRate
    const respPhase = ((elapsed / breathDuration) * Math.PI * 2)
    const breathingFactor = Math.sin(respPhase)

    lungEmissive = 0.25 + (breathingFactor > 0 ? breathingFactor * 1.6 : 0)

    // 3. Brain Synaptic Spin — smooth noise via lerp accumulator, delta-time rotations
    let brainScale = 1.0
    if (brainMeshRef.current) {
      brainMeshRef.current.rotation.y += delta * liveBrainFreq * 0.22  // delta-based
      // Smooth jitter: lerp toward a slowly wandering target instead of raw Math.random
      const jitterTarget = 1.0 + Math.sin(elapsed * 3.7) * 0.02 * (liveBrainFreq / 15)
      brainJitter.current = THREE.MathUtils.lerp(brainJitter.current, jitterTarget, 0.12)
      brainScale = brainJitter.current
      // Smooth emissive flicker
      const flickerTarget = 0.4 + Math.abs(Math.sin(elapsed * 4.1)) * 1.6
      brainEmissive = THREE.MathUtils.lerp(brainEmissive, flickerTarget, 0.15)
      brainMeshRef.current.scale.set(brainScale, brainScale, brainScale)
    }
    if (brainRing1Ref.current) {
      brainRing1Ref.current.rotation.z -= delta * 0.9
      brainRing1Ref.current.rotation.x  = Math.sin(elapsed * 0.5) * 0.15
    }
    if (brainRing2Ref.current) {
      brainRing2Ref.current.rotation.z += delta * 1.5
      brainRing2Ref.current.rotation.y  = Math.cos(elapsed * 0.4) * 0.12
    }
    if (brainRing3Ref.current) {
      brainRing3Ref.current.rotation.x += delta * 0.6
      brainRing3Ref.current.rotation.y -= delta * 0.9
    }

    // 4. Liver Metabolic Glow
    let liverScale = 1.0
    liverScale = 1.0 + Math.sin(elapsed * 3.5) * 0.03
    liverEmissive = 0.8 + Math.sin(elapsed * 6) * 0.5
    if (liverMeshRef.current) {
      liverMeshRef.current.scale.set(liverScale, liverScale, liverScale)
    }

    // 5. Synaptic Particle Emitter — delta-scaled, smooth burst modulation
    if (brainPointsRef.current) {
      const positions = brainPointsRef.current.geometry.attributes.position.array as Float32Array
      const speeds    = brainParticlesData.speeds
      const burst     = 1.0 + Math.sin(elapsed * 5) * 0.4  // smooth wave, no random
      for (let i = 0; i < brainParticlesCount; i++) {
        positions[i * 3]     += speeds[i * 3]     * delta * burst
        positions[i * 3 + 1] += speeds[i * 3 + 1] * delta * burst
        positions[i * 3 + 2] += speeds[i * 3 + 2] * delta * burst
        const d2 = positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2 + positions[i * 3 + 2] ** 2
        if (d2 > 0.2025) {  // 0.45² — avoid sqrt per particle
          // Reset to small random seed near center
          const a = (i * 2.399) % (Math.PI * 2)  // golden-angle spread — deterministic
          positions[i * 3]     = Math.cos(a) * 0.025
          positions[i * 3 + 1] = Math.sin(a) * 0.025
          positions[i * 3 + 2] = 0.01
        }
      }
      brainPointsRef.current.geometry.attributes.position.needsUpdate = true
    }

    // 6. Bronchial Airflow Particles — stable per-particle offsets prevent jitter
    if (lungPointsRef.current) {
      const positions = lungPointsRef.current.geometry.attributes.position.array as Float32Array
      const progress  = lungParticlesData.progress
      const side      = lungParticlesData.side
      const offX      = lungParticlesData.offX
      const offZ      = lungParticlesData.offZ
      for (let i = 0; i < lungParticlesCount; i++) {
        progress[i] += delta * 0.55  // delta-based, hardware-independent speed
        if (progress[i] > 1.0) {
          progress[i] = 0
          side[i] = i % 2 === 0 ? 1 : -1  // alternating sides — no random
        }
        const p = progress[i]
        if (p < 0.4) {
          const t = p / 0.4
          positions[i * 3]     = offX[i]
          positions[i * 3 + 1] = 1.05 - t * 0.3
          positions[i * 3 + 2] = offZ[i]
        } else {
          const t   = (p - 0.4) / 0.6
          const endX = side[i] * 0.24
          const endY = 0.5 - t * 0.18
          positions[i * 3]     = t * endX + offX[i]
          positions[i * 3 + 1] = 0.75 + t * (endY - 0.75)
          positions[i * 3 + 2] = offZ[i] + t * 0.02
        }
      }
      lungPointsRef.current.geometry.attributes.position.needsUpdate = true
    }

    // 7. Lerp material properties — delta-scaled alpha for frame-rate independent feel
    const lerpA = 1 - Math.pow(0.04, delta)  // exponential decay — same feel at any FPS
    if (brainMatRef.current) {
      brainMatRef.current.opacity          = THREE.MathUtils.lerp(brainMatRef.current.opacity, targetBrainOpacity, lerpA)
      brainMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(brainMatRef.current.emissiveIntensity, brainEmissive, lerpA)
      brainMatRef.current.color.lerp(brainColor.current, lerpA)
      brainMatRef.current.emissive.lerp(brainColor.current, lerpA)
    }
    if (lungMatRef.current) {
      lungMatRef.current.opacity          = THREE.MathUtils.lerp(lungMatRef.current.opacity, targetLungOpacity, lerpA)
      lungMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(lungMatRef.current.emissiveIntensity, lungEmissive, lerpA)
      lungMatRef.current.color.lerp(lungColor.current, lerpA)
      lungMatRef.current.emissive.lerp(lungColor.current, lerpA)
    }
    if (heartMatRef.current) {
      heartMatRef.current.opacity          = THREE.MathUtils.lerp(heartMatRef.current.opacity, targetHeartOpacity, lerpA)
      heartMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(heartMatRef.current.emissiveIntensity, heartEmissive, lerpA)
      heartMatRef.current.color.lerp(heartColor.current, lerpA)
      heartMatRef.current.emissive.lerp(heartColor.current, lerpA)
    }
    if (liverMatRef.current) {
      liverMatRef.current.opacity          = THREE.MathUtils.lerp(liverMatRef.current.opacity, targetLiverOpacity, lerpA)
      liverMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(liverMatRef.current.emissiveIntensity, liverEmissive, lerpA)
      liverMatRef.current.color.lerp(liverColor.current, lerpA)
      liverMatRef.current.emissive.lerp(liverColor.current, lerpA)
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
      <VascularBloodflow points={[[-0.08, 0.46, 0.09], [-0.43, 1.03, 0.02], [-0.62, 0.55, 0.01], [-0.78, 0.04, 0.0]]} color="#ff9900" />
      <VascularBloodflow points={[[-0.08, 0.46, 0.09], [0.43, 1.03, 0.02], [0.62, 0.55, 0.01], [0.78, 0.04, 0.0]]} color="#ff9900" />
      
      {/* Lower Vascular */}
      <VascularBloodflow points={[[-0.08, 0.46, 0.09], [-0.1, -0.23, 0.0], [-0.22, -0.98, 0.0], [-0.24, -1.68, 0.0]]} color="#ff9900" />
      <VascularBloodflow points={[[-0.08, 0.46, 0.09], [0.1, -0.23, 0.0], [0.22, -0.98, 0.0], [0.24, -1.68, 0.0]]} color="#ff9900" />

      {/* Cranial Vascular */}
      <VascularBloodflow points={[[-0.08, 0.46, 0.09], [-0.05, 1.0, 0.02], [0.0, 1.35, 0.05]]} color="#ff9900" />

      {/* 4. Nervous System Branches (Purple) */}
      <Line points={[[0, 0.95, -0.05], [-0.45, 1.05, 0], [-0.62, 0.55, 0], [-0.8, 0.05, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, 0.95, -0.05], [0.45, 1.05, 0], [0.62, 0.55, 0], [0.8, 0.05, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, -0.1, -0.05], [-0.2, -0.25, 0], [-0.24, -1.0, 0], [-0.25, -1.7, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />
      <Line points={[[0, -0.1, -0.05], [0.2, -0.25, 0], [0.24, -1.0, 0], [0.25, -1.7, 0]]} color="#c040ff" lineWidth={0.6} transparent opacity={0.4} />

      {/* 5. BRAIN Mesh - Dedicated */}
      <group position={[0, 1.4, 0]} onClick={(e) => { e.stopPropagation(); useTelemetryStore.getState().setSelectedOrgan('brain') }}>
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
        {/* Halo of 3 revolving neural orbits around head */}
        <mesh ref={brainRing1Ref} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.38, 0.01, 8, 32]} />
          <meshBasicMaterial color="#c040ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={brainRing2Ref} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[0.42, 0.007, 6, 24]} />
          <meshBasicMaterial color="#c040ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={brainRing3Ref} rotation={[0, Math.PI / 6, Math.PI / 3]}>
          <torusGeometry args={[0.46, 0.004, 6, 20]} />
          <meshBasicMaterial color="#c040ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
        
        {/* Synaptic particles emitter around brain */}
        <points ref={brainPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[brainParticlesData.positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.018}
            color="#c040ff"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>

      {/* 6. LUNGS Meshes & Inner Branching Bronchial Airway Trees - Dedicated */}
      <group onClick={(e) => { e.stopPropagation(); useTelemetryStore.getState().setSelectedOrgan('lungs') }}>
        {/* Left Lung Lobe */}
        <PhysiologicalLung position={[-0.24, 0.5, 0.02]} isLeft={true} color={lungColor.current} emissiveIntensity={1.0} />
        {/* Right Lung Lobe */}
        <PhysiologicalLung position={[0.24, 0.5, 0.02]} isLeft={false} color={lungColor.current} emissiveIntensity={1.0} />

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

        {/* Lung air particles */}
        <points ref={lungPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[lungParticlesData.positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.022}
            color="#00ffff"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>

      {/* 7. HEART Mesh with pulsing Aorta pipe - Dedicated */}
      <group position={[-0.08, 0.46, 0.09]} onClick={(e) => { e.stopPropagation(); useTelemetryStore.getState().setSelectedOrgan('heart') }}>
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
        {/* Heart ECG Wave Overlay Mesh */}
        <mesh ref={heartWaveMeshRef} rotation={[0.15, 0, 0.2]}>
          <torusKnotGeometry args={[0.17, 0.02, 64, 8, 3, 4]} />
          <meshBasicMaterial
            ref={heartWaveMatRef}
            wireframe
            transparent
            opacity={0.6}
            color="#ff2b56"
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Pulsing Aorta Arc tube */}
        <mesh position={[0, 0.09, 0.01]} rotation={[0, 0, -Math.PI / 4]}>
          <torusGeometry args={[0.045, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#ff2b56" roughness={0.5} />
        </mesh>
      </group>

      {/* 8. LIVER Mesh (Abdomen Right Lobe) - Dedicated */}
      <mesh
        ref={liverMeshRef}
        position={[0.13, 0.12, 0.07]}
        rotation={[0.2, -0.3, -0.1]}
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
      <HudPointerLine start={[0, 1.4, 0]} mid={[1.3, 1.4, 0]} end={[1.7, 1.4, 0]} color="#c040ff" active={true} />
      {/* Lungs Pointer */}
      <HudPointerLine start={[0.24, 0.5, 0.02]} mid={[1.3, 0.5, 0]} end={[1.7, 0.5, 0]} color="#00ccff" active={true} />
      {/* Heart Pointer */}
      <HudPointerLine start={[-0.08, 0.46, 0.09]} mid={[-1.3, 0.46, 0]} end={[-1.7, 0.46, 0]} color="#ff2b56" active={true} />
      {/* Liver Pointer */}
      <HudPointerLine start={[0.13, 0.12, 0.07]} mid={[1.3, -0.4, 0]} end={[1.7, -0.4, 0]} color="#ff9900" active={true} />

      {/* 10. Floating Holographic HUD HTML Cards in 3D Space */}

      {/* A. NEURAL STRESS RESPONSE (Brain - Top Right) */}
      <Html position={[1.7, 1.4, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          className="p-3 rounded border font-mono select-none pointer-events-auto cursor-default w-52 flex flex-col gap-1.5 bg-[#080d0a]/92 border-[#c040ff] text-slate-100 shadow-[0_0_15px_rgba(192,64,255,0.25)] opacity-100"
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#c040ff] tracking-widest flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" />
              NEURAL STRESS RESPONSE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c040ff] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>PATHOLOGY:</span>
              <span className="font-bold text-slate-200">CEREBRAL METABOLIC LOAD</span>
            </div>
            <div className="flex justify-between">
              <span>METRIC (EEG):</span>
              <span className="font-bold text-[#c040ff]">{brainwaveFreq.toFixed(1)} Hz</span>
            </div>
          </div>
          <MiniSvgWave color="#c040ff" speed={1.5} amplitude={8} type="noise" />
          <div className="text-[7px] font-bold text-[#c040ff] animate-pulse tracking-wide uppercase mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2 h-2" />
            STATUS: ELEVATED CEREBRAL IRRITABILITY
          </div>
        </div>
      </Html>

      {/* B. PULMONARY COMPENSATION (Lungs - Center Right) */}
      <Html position={[1.7, 0.5, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          className="p-3 rounded border font-mono select-none pointer-events-auto cursor-default w-52 flex flex-col gap-1.5 bg-[#080d0a]/92 border-[#00ccff] text-slate-100 shadow-[0_0_15px_rgba(0,204,255,0.25)] opacity-100"
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#00ccff] tracking-widest flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              PULMONARY COMPENSATION
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ccff] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>STATE:</span>
              <span className="font-bold text-slate-200">COMPENSATORY VENTR</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>BPM: <strong className="text-slate-100">{bpm}</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>GLUCOSE: <strong className="text-slate-100">{glucose}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#00ccff" speed={1.2} amplitude={6} type="sine" />
          <div className="text-[7px] font-bold text-[#00ccff] animate-pulse tracking-wide uppercase mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2 h-2" />
            STATUS: KUSSMAUL HYPERVENTILATION
          </div>
        </div>
      </Html>

      {/* C. MYOCARDIAL STRESS (Heart - Center Left) */}
      <Html position={[-1.7, 0.46, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          className="p-3 rounded border font-mono select-none pointer-events-auto cursor-default w-52 flex flex-col gap-1.5 bg-[#080d0a]/92 border-[#ff2b56] text-slate-100 shadow-[0_0_15px_rgba(255,43,86,0.25)] opacity-100"
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#ff2b56] tracking-widest flex items-center gap-1">
              <Heart className="w-2.5 h-2.5" />
              MYOCARDIAL STRESS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b56] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>PATHOLOGY:</span>
              <span className="font-bold text-slate-200">CARDIOCYTE ACCELERATION</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>BPM: <strong className="text-[#ff2b56] font-bold">{bpm}</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>GLUC: <strong className="text-slate-100">{glucose}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#ff2b56" speed={1.8} amplitude={9} type="ecg" />
          <div className="text-[7px] font-bold text-[#ff2b56] animate-pulse tracking-wide uppercase mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2 h-2" />
            STATUS: SINUS TACHYCARDIA
          </div>
        </div>
      </Html>

      {/* D. METABOLIC GLUCOSE CRISIS (Liver - Bottom Right) */}
      <Html position={[1.7, -0.4, 0]} center distanceFactor={4.8} style={{ pointerEvents: 'none' }}>
        <div 
          className="p-3 rounded border font-mono select-none pointer-events-auto cursor-default w-52 flex flex-col gap-1.5 bg-[#080d0a]/92 border-[#ff9900] text-slate-100 shadow-[0_0_15px_rgba(255,153,0,0.25)] opacity-100"
        >
          <div className="flex items-center justify-between text-[7px] border-b border-white/5 pb-1">
            <span className="font-semibold text-[#ff9900] tracking-widest flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              METABOLIC GLUCOSE CRISIS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9900] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-0.5 text-[8px] text-slate-400">
            <div className="flex justify-between">
              <span>METABOLIC STATE:</span>
              <span className="font-bold text-slate-200">HEPATIC GLUCOSE SPIKE</span>
            </div>
            <div className="flex justify-between text-[7px] gap-2 mt-0.5">
              <span>GLUCOSE: <strong className="text-[#ff9900] font-bold">{glucose} mg/dL</strong></span>
              <span>SpO2: <strong className="text-slate-100">{oxygen}%</strong></span>
              <span>BPM: <strong className="text-slate-100">{bpm}</strong></span>
            </div>
          </div>
          <MiniSvgWave color="#ff9900" speed={0.8} amplitude={4} type="flat" />
          <div className="text-[7px] font-bold text-red-500/80 animate-pulse tracking-wide uppercase mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2 h-2" />
            STATUS: INSULIN SATURATION LIMITS
          </div>
        </div>
      </Html>
    </group>
  )
}

export default function DigitalTwinScene({ transparent = false }: DigitalTwinSceneProps) {
  const orbitRef = useRef<any>(null)

  useEffect(() => {
    if (!transparent) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const wsUrl = `ws://${host}:8080/diabetes`
      useTelemetryStore.getState().disconnectFromTelemetry()
      useTelemetryStore.getState().connectToTelemetry(wsUrl)
      return () => {
        useTelemetryStore.getState().disconnectFromTelemetry()
      }
    }
  }, [transparent])
  const isRotating = useTelemetryStore((s) => s.isRotating)
  const selectedOrgan = useTelemetryStore((s) => s.selectedOrgan)

  return (
    <div className={`w-full h-full relative ${transparent ? 'bg-transparent' : 'bg-[#040806]'}`}>
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 50 }}
        gl={{ antialias: true, alpha: transparent }}
        style={{ background: transparent ? 'transparent' : '#040806' }}
      >
        <ambientLight intensity={0.25} />
        
        {/* Subdued spot lighting to project highlights on transmission clearcoat glass material without over-exposure */}
        <spotLight position={[5, 5, 5]} angle={0.4} penumbra={1} intensity={2.2} color="#00f6ff" />
        <spotLight position={[-5, 5, 5]} angle={0.4} penumbra={1} intensity={1.5} color="#c040ff" />
        <pointLight position={[0, -2, 3]} intensity={0.8} color="#00ffaa" />
        
        <HologramScene />
        
        <CameraController controlsRef={orbitRef} />
        
        <OrbitControls
          ref={orbitRef}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 + 0.15}
          minDistance={0.2}
          maxDistance={8.0}
          enablePan={false}
          enableZoom={!transparent}
          zoomSpeed={0.6}
          autoRotate={transparent}
          autoRotateSpeed={0.8}
        />
      </Canvas>
    </div>
  )
}
