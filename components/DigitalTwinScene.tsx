'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface DigitalTwinSceneProps {
  currentCondition: 'general' | 'arrhythmia' | 'asthma' | 'epilepsy'
}

// Internal scene component that runs within the Canvas provider
function HologramScene({ currentCondition }: DigitalTwinSceneProps) {
  // Mesh and Material Refs
  const brainMeshRef = useRef<THREE.Mesh>(null)
  const leftLungMeshRef = useRef<THREE.Mesh>(null)
  const rightLungMeshRef = useRef<THREE.Mesh>(null)
  const heartMeshRef = useRef<THREE.Mesh>(null)
  const spineMeshRef = useRef<THREE.LineSegments>(null)

  const brainMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lungMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const heartMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const spineMatRef = useRef<THREE.LineBasicMaterial>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime

    // 1. Determine target opacities, emissive intensities, and colors based on active condition
    let targetBrainOpacity = 0.15
    let targetLungOpacity = 0.15
    let targetHeartOpacity = 0.15
    let targetSpineOpacity = 0.15

    let targetBrainEmissive = 0.3
    let targetLungEmissive = 0.3
    let targetHeartEmissive = 0.3
    let targetSpineEmissive = 0.3

    let brainColor = new THREE.Color('#c040ff') // Purple for epilepsy
    let lungColor = new THREE.Color('#00ccff')  // Cyan for asthma
    let heartColor = new THREE.Color('#ff2b56') // Red for arrhythmia
    const defaultSpineColor = new THREE.Color('#00ffaa') // Green for general

    if (currentCondition === 'general') {
      // General mode - all organs visible and nominal
      targetBrainOpacity = 0.7
      targetLungOpacity = 0.7
      targetHeartOpacity = 0.7
      targetSpineOpacity = 0.7

      targetBrainEmissive = 1.0
      targetLungEmissive = 1.0
      targetHeartEmissive = 1.0
      targetSpineEmissive = 1.0

      brainColor = new THREE.Color('#00ffaa')
      lungColor = new THREE.Color('#00ffaa')
      heartColor = new THREE.Color('#00ffaa')
    } else if (currentCondition === 'epilepsy') {
      targetBrainOpacity = 0.95
      targetBrainEmissive = 2.0
      targetSpineOpacity = 0.5
      targetSpineEmissive = 0.8
    } else if (currentCondition === 'asthma') {
      targetLungOpacity = 0.95
      targetLungEmissive = 2.0
      targetSpineOpacity = 0.5
      targetSpineEmissive = 0.8
    } else if (currentCondition === 'arrhythmia') {
      targetHeartOpacity = 0.95
      targetHeartEmissive = 2.0
      targetSpineOpacity = 0.5
      targetSpineEmissive = 0.8
    }

    // 2. Smoothly Lerp materials (transparency, intensity, colors)
    if (brainMatRef.current) {
      brainMatRef.current.opacity = THREE.MathUtils.lerp(brainMatRef.current.opacity, targetBrainOpacity, 0.08)
      brainMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(brainMatRef.current.emissiveIntensity, targetBrainEmissive, 0.08)
      brainMatRef.current.color.lerp(brainColor, 0.08)
      brainMatRef.current.emissive.lerp(brainColor, 0.08)
    }

    if (lungMatRef.current) {
      lungMatRef.current.opacity = THREE.MathUtils.lerp(lungMatRef.current.opacity, targetLungOpacity, 0.08)
      lungMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(lungMatRef.current.emissiveIntensity, targetLungEmissive, 0.08)
      lungMatRef.current.color.lerp(lungColor, 0.08)
      lungMatRef.current.emissive.lerp(lungColor, 0.08)
    }

    if (heartMatRef.current) {
      heartMatRef.current.opacity = THREE.MathUtils.lerp(heartMatRef.current.opacity, targetHeartOpacity, 0.08)
      heartMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(heartMatRef.current.emissiveIntensity, targetHeartEmissive, 0.08)
      heartMatRef.current.color.lerp(heartColor, 0.08)
      heartMatRef.current.emissive.lerp(heartColor, 0.08)
    }

    if (spineMatRef.current) {
      spineMatRef.current.opacity = THREE.MathUtils.lerp(spineMatRef.current.opacity, targetSpineOpacity, 0.08)
      const spineColor = currentCondition === 'general' ? defaultSpineColor : (currentCondition === 'epilepsy' ? brainColor : (currentCondition === 'asthma' ? lungColor : heartColor))
      spineMatRef.current.color.lerp(spineColor, 0.08)
    }

    // 3. Dynamic Mechanical Pulses based on condition
    // Lungs Ventilation (Scale)
    if (leftLungMeshRef.current && rightLungMeshRef.current) {
      let lungScaleY = 1.0
      let lungScaleXZ = 1.0
      
      if (currentCondition === 'asthma') {
        // Slow, shallow respiration
        const breathing = Math.sin(elapsed * 1.0)
        lungScaleY = 1.0 + breathing * 0.04
        lungScaleXZ = 1.0 + breathing * 0.02
      } else {
        // Regular nominal breathing
        const breathing = Math.sin(elapsed * 2.0)
        lungScaleY = 1.0 + breathing * 0.08
        lungScaleXZ = 1.0 + breathing * 0.04
      }

      leftLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
      rightLungMeshRef.current.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ)
    }

    // Heart Beat Pulse (Scale)
    if (heartMeshRef.current) {
      let heartScale = 1.0
      
      if (currentCondition === 'arrhythmia') {
        // Rapid, erratic tachycardia beats
        const beatPhase = (elapsed * 9) % (Math.PI * 2)
        const pulse = Math.sin(beatPhase) * Math.cos(beatPhase * 2)
        heartScale = 1.0 + (pulse > 0.3 ? 0.18 : 0) + (Math.random() - 0.5) * 0.02
      } else {
        // Normal rhythmic sinus pulse
        const beatPhase = (elapsed * 4.5) % (Math.PI * 2)
        const pulse = Math.sin(beatPhase) > 0.85 ? 0.12 : 0.0
        heartScale = 1.0 + pulse
      }

      heartMeshRef.current.scale.set(heartScale, heartScale, heartScale)
    }

    // Brain Rotation / Jitter (Scale & Rotation)
    if (brainMeshRef.current) {
      if (currentCondition === 'epilepsy') {
        // Rapid epileptic vibration and high rotation
        brainMeshRef.current.rotation.y += 0.065
        const jitter = (Math.random() - 0.5) * 0.04
        brainMeshRef.current.scale.set(1.0 + jitter, 1.0 + jitter, 1.0 + jitter)
      } else {
        // Normal rotating motion
        brainMeshRef.current.rotation.y += 0.005
        brainMeshRef.current.scale.set(1.0, 1.0, 1.0)
      }
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
  return (
    <div className="w-full h-full relative bg-[#040806]/85">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.25} />
        
        {/* Neon spotlights reflecting off wireframes */}
        <pointLight position={[2, 3, 4]} intensity={2.0} color="#00ffaa" />
        <pointLight position={[-3, -2, -3]} intensity={1.5} color="#00ccff" />
        
        <HologramScene currentCondition={currentCondition} />
        
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
