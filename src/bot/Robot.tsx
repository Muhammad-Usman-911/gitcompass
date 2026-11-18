import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface BotSignals {
  pointer: { x: number; y: number }
  talking: boolean
  hop: number
  reduced: boolean
}

/** A small friendly robot built from primitives (no external models). */
export function Robot({ signals }: { signals: MutableRefObject<BotSignals> }) {
  const root = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const eyeL = useRef<THREE.Mesh>(null!)
  const eyeR = useRef<THREE.Mesh>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const bulb = useRef<THREE.MeshStandardMaterial>(null!)
  const blink = useRef(0)

  useFrame((state, dt) => {
    const s = signals.current
    const t = state.clock.elapsedTime
    const calm = s.reduced ? 0 : 1
    // float + hop
    s.hop = Math.max(0, s.hop - dt * 1.6)
    const hopY = Math.sin(s.hop * Math.PI) * 0.35
    root.current.position.y = Math.sin(t * 1.6) * 0.06 * calm + hopY
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, s.pointer.x * 0.35 + (s.hop > 0 ? s.hop * Math.PI * 2 : 0), 0.08)
    // head follows pointer
    head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, s.pointer.x * 0.5, 0.1)
    head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -s.pointer.y * 0.35, 0.1)
    // blink
    blink.current -= dt
    if (blink.current < 0) blink.current = 2.5 + Math.random() * 3
    const eyeScale = blink.current < 0.12 ? 0.1 : 1
    eyeL.current.scale.y = THREE.MathUtils.lerp(eyeL.current.scale.y, eyeScale, 0.5)
    eyeR.current.scale.y = eyeL.current.scale.y
    // arms: wave while talking
    const wave = s.talking ? Math.sin(t * 9) * 0.5 - 1.6 : Math.sin(t * 1.6) * 0.08 * calm - 0.15
    armR.current.rotation.z = THREE.MathUtils.lerp(armR.current.rotation.z, wave, 0.15)
    armL.current.rotation.z = THREE.MathUtils.lerp(armL.current.rotation.z, 0.15 - Math.sin(t * 1.6) * 0.08 * calm, 0.15)
    // antenna glow
    bulb.current.emissiveIntensity = 1.6 + Math.sin(t * (s.talking ? 10 : 3)) * 0.8
  })

  const shell = <meshStandardMaterial color="#e8eef9" metalness={0.35} roughness={0.28} />
  const dark = <meshStandardMaterial color="#0b1222" metalness={0.6} roughness={0.2} />

  return (
    <group ref={root}>
      {/* body */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.35, 8, 24]} />
        {shell}
      </mesh>
      {/* chest light: the compass */}
      <mesh position={[0, -0.5, 0.42]}>
        <circleGeometry args={[0.14, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, -0.5, 0.425]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.05, 0.2]} />
        <meshStandardMaterial color="#0b1222" />
      </mesh>
      {/* arms */}
      <group ref={armL} position={[-0.47, -0.38, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.085, 0.28, 6, 12]} />
          {shell}
        </mesh>
      </group>
      <group ref={armR} position={[0.47, -0.38, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.085, 0.28, 6, 12]} />
          {shell}
        </mesh>
      </group>
      {/* head */}
      <group ref={head} position={[0, 0.32, 0]}>
        <mesh>
          <sphereGeometry args={[0.5, 48, 48]} />
          {shell}
        </mesh>
        {/* visor */}
        <mesh position={[0, 0.02, 0.2]} scale={[1, 0.72, 0.7]}>
          <sphereGeometry args={[0.4, 48, 48]} />
          {dark}
        </mesh>
        <mesh ref={eyeL} position={[-0.14, 0.04, 0.48]}>
          <sphereGeometry args={[0.065, 24, 24]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={2.4} />
        </mesh>
        <mesh ref={eyeR} position={[0.14, 0.04, 0.48]}>
          <sphereGeometry args={[0.065, 24, 24]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={2.4} />
        </mesh>
        {/* ears */}
        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
          <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
          <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.5} />
        </mesh>
        {/* antenna */}
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
          {dark}
        </mesh>
        <mesh position={[0, 0.71, 0]}>
          <sphereGeometry args={[0.065, 20, 20]} />
          <meshStandardMaterial ref={bulb} color="#f472b6" emissive="#f472b6" emissiveIntensity={2} />
        </mesh>
      </group>
      {/* hover shadow */}
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}
