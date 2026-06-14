'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTelemetryStore } from '@/lib/useTelemetryStore'

// ─────────────────────────────────────────────────────────────────────────────
// Holographic Scan Line — sweeps vertically through the body
// ─────────────────────────────────────────────────────────────────────────────
export function HolographicScanLine({ color = '#00ffaa' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return
    const t = state.clock.elapsedTime
    // Sweep from y=-1.8 to y=1.8 over ~4 seconds
    const y = Math.sin(t * 0.8) * 1.8
    meshRef.current.position.y = y
    // Fade opacity based on position (brighter in center)
    matRef.current.opacity = 0.08 + Math.abs(Math.cos(t * 0.8)) * 0.12
  })

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.5, 0.005]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hexagonal Grid Floor — pulses subtly with telemetry
// ─────────────────────────────────────────────────────────────────────────────
export function HexGridFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#00ffaa') },
    uPulse: { value: 0 },
  }), [])

  useFrame((state) => {
    if (!matRef.current) return
    uniforms.uTime.value = state.clock.elapsedTime
    
    const bpm = useTelemetryStore.getState().liveTelemetryFrame.bpm
    const beatDuration = 60 / bpm
    const phase = (state.clock.elapsedTime % beatDuration) / beatDuration
    uniforms.uPulse.value = phase < 0.15 ? Math.sin((phase / 0.15) * Math.PI) : 0
    
    const crisis = useTelemetryStore.getState().liveTelemetryFrame.isCrisisActive
    uniforms.uColor.value.set(crisis ? '#ff3b5c' : '#00ffaa')
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, 0]}>
      <planeGeometry args={[6, 6, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uPulse;
          varying vec2 vUv;

          float hexGrid(vec2 p, float scale) {
            p *= scale;
            vec2 h = vec2(1.0, 1.732);
            vec2 a = mod(p, h) - h * 0.5;
            vec2 b = mod(p - h * 0.5, h) - h * 0.5;
            vec2 gv = dot(a, a) < dot(b, b) ? a : b;
            float d = max(abs(gv.x), abs(gv.y * 0.577 + abs(gv.x) * 0.5));
            float edge = smoothstep(0.42, 0.48, d);
            return edge;
          }

          void main() {
            vec2 centered = vUv - 0.5;
            float dist = length(centered);
            
            // Circular falloff
            float falloff = 1.0 - smoothstep(0.15, 0.5, dist);
            
            // Hex grid pattern
            float hex = hexGrid(centered, 12.0);
            
            // Pulse ring expanding outward
            float ring = smoothstep(0.02, 0.0, abs(dist - uPulse * 0.4));
            
            // Combine
            float alpha = hex * falloff * (0.06 + uPulse * 0.12 + ring * 0.3);
            
            // Subtle rotation shimmer
            float shimmer = sin(centered.x * 30.0 + uTime * 2.0) * 0.02;
            
            gl_FragColor = vec4(uColor, alpha + shimmer);
          }
        `}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ambient Holographic Dust Particles — floating around the scene
// ─────────────────────────────────────────────────────────────────────────────
export function AmbientDust({ count = 200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 5
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3
      vel[i * 3]     = (Math.random() - 0.5) * 0.003
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002 + 0.001 // slight upward drift
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
    }
    return { positions: pos, velocities: vel }
  }, [count])

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      pos[i * 3 + 2] += velocities[i * 3 + 2]
      // Wrap around bounds
      if (Math.abs(pos[i * 3]) > 2.5) pos[i * 3] *= -0.95
      if (pos[i * 3 + 1] > 2.5) pos[i * 3 + 1] = -2.5
      if (pos[i * 3 + 1] < -2.5) pos[i * 3 + 1] = 2.5
      if (Math.abs(pos[i * 3 + 2]) > 1.5) pos[i * 3 + 2] *= -0.95
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color="#00ffaa"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Heart Pulse Wave Ring — expands outward on each heartbeat
// ─────────────────────────────────────────────────────────────────────────────
export function HeartPulseRing() {
  const ringRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!ringRef.current || !matRef.current) return
    const bpm = useTelemetryStore.getState().liveTelemetryFrame.bpm
    const beatDuration = 60 / bpm
    const phase = (state.clock.elapsedTime % beatDuration) / beatDuration

    if (phase < 0.5) {
      const t = phase / 0.5
      const scale = 1.0 + t * 2.5
      ringRef.current.scale.set(scale, scale, scale)
      matRef.current.opacity = 0.4 * (1 - t)
    } else {
      ringRef.current.scale.set(0.01, 0.01, 0.01)
      matRef.current.opacity = 0
    }
  })

  return (
    <mesh ref={ringRef} position={[-0.08, 0.36, 0.09]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.06, 0.003, 8, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ff2b56"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DNA Helix — decorative double helix rotating beside the mannequin
// ─────────────────────────────────────────────────────────────────────────────
export function DNAHelix({ position = [2.2, 0, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<THREE.InstancedMesh>(null)

  const helixCount = 40
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const rungs = useMemo(() => {
    // Pre-compute rung positions
    const arr: { y: number; angle: number }[] = []
    for (let i = 0; i < helixCount; i++) {
      arr.push({
        y: -1.5 + (i / helixCount) * 3,
        angle: (i / helixCount) * Math.PI * 4
      })
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !meshesRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3

    for (let i = 0; i < helixCount; i++) {
      const { y, angle } = rungs[i]
      const t = state.clock.elapsedTime * 0.5
      
      // Strand A
      const ax = Math.cos(angle + t) * 0.12
      const az = Math.sin(angle + t) * 0.12
      
      dummy.position.set(ax, y, az)
      dummy.scale.setScalar(0.6)
      dummy.updateMatrix()
      meshesRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshesRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Helix backbone strands */}
      <HelixStrand offset={0} color="#00ffaa" />
      <HelixStrand offset={Math.PI} color="#00ccff" />
      
      {/* Rung spheres */}
      <instancedMesh ref={meshesRef} args={[undefined, undefined, helixCount]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#00ffaa" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </group>
  )
}

function HelixStrand({ offset = 0, color = '#00ffaa' }: { offset?: number; color?: string }) {
  const lineObjRef = useRef<THREE.Line>(null)
  
  const { geometry, material } = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      const y = -1.5 + t * 3
      const angle = t * Math.PI * 4 + offset
      points.push(new THREE.Vector3(
        Math.cos(angle) * 0.12,
        y,
        Math.sin(angle) * 0.12
      ))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    return { geometry: geo, material: mat }
  }, [offset, color])

  const lineObj = useMemo(() => new THREE.Line(geometry, material), [geometry, material])

  useFrame((state) => {
    if (!lineObjRef.current) return
    const positions = lineObjRef.current.geometry.attributes.position.array as Float32Array
    const t = state.clock.elapsedTime * 0.5
    for (let i = 0; i <= 80; i++) {
      const frac = i / 80
      const angle = frac * Math.PI * 4 + offset + t
      positions[i * 3] = Math.cos(angle) * 0.12
      positions[i * 3 + 2] = Math.sin(angle) * 0.12
    }
    lineObjRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <primitive ref={lineObjRef} object={lineObj} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Brain Electric Arcs — flashing connections between brain surface points
// ─────────────────────────────────────────────────────────────────────────────
export function BrainElectricArcs({ brainwaveFreq = 12 }: { brainwaveFreq?: number }) {
  const linesRef = useRef<THREE.Group>(null)
  
  const arcCount = 6
  const arcData = useMemo(() => {
    const arcs: { start: THREE.Vector3; end: THREE.Vector3; phase: number }[] = []
    for (let i = 0; i < arcCount; i++) {
      const theta1 = Math.random() * Math.PI * 2
      const phi1 = Math.acos(Math.random() * 2 - 1)
      const theta2 = Math.random() * Math.PI * 2
      const phi2 = Math.acos(Math.random() * 2 - 1)
      const r = 0.24
      arcs.push({
        start: new THREE.Vector3(
          Math.sin(phi1) * Math.cos(theta1) * r,
          Math.sin(phi1) * Math.sin(theta1) * r,
          Math.cos(phi1) * r
        ),
        end: new THREE.Vector3(
          Math.sin(phi2) * Math.cos(theta2) * r,
          Math.sin(phi2) * Math.sin(theta2) * r,
          Math.cos(phi2) * r
        ),
        phase: Math.random() * Math.PI * 2
      })
    }
    return arcs
  }, [])

  const lineObjects = useMemo(() => {
    return arcData.map((arc) => {
      const mid = arc.start.clone().add(arc.end).multiplyScalar(0.5)
      mid.multiplyScalar(1.3)
      const curve = new THREE.QuadraticBezierCurve3(arc.start, mid, arc.end)
      const points = curve.getPoints(12)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: '#c040ff',
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending
      })
      return new THREE.Line(geometry, material)
    })
  }, [arcData])

  useFrame((state) => {
    if (!linesRef.current) return
    const t = state.clock.elapsedTime
    const freq = brainwaveFreq / 10
    
    lineObjects.forEach((lineObj, i) => {
      const arc = arcData[i]
      if (!arc) return
      const flash = Math.sin(t * freq * 8 + arc.phase) > 0.6 ? 0.8 : 0.05
      ;(lineObj.material as THREE.LineBasicMaterial).opacity = flash
    })
  })

  return (
    <group ref={linesRef} position={[0, 1.4, 0]}>
      {lineObjects.map((lineObj, i) => (
        <primitive key={i} object={lineObj} />
      ))}
    </group>
  )
}
