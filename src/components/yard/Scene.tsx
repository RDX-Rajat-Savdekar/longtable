import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { GRID_MAX, GRID_MIN, baseY, inYard, kindHeight, type BlockKind, type StackBlock } from '../../yard/place'

export type YardBlock = StackBlock & { id: string; color: string }
export type Person = { id: string; name: string; color: string; quirk: string; x: number; z: number }

const WIDTH = GRID_MAX - GRID_MIN + 1

export function YardScene({
  blocks,
  me,
  others,
  sky,
  onPlace,
  onTake,
  onMove,
}: {
  blocks: YardBlock[]
  me: Person
  others: Person[]
  sky: string
  onPlace: (x: number, z: number) => void
  onTake: (x: number, z: number) => void
  onMove: (x: number, z: number) => void
}) {
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 18, 42]} />
      <hemisphereLight args={['#f6f1e6', '#3d6b45', 1.1]} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} />
      <Grass onPlace={onPlace} />
      {blocks.map((block) => (
        <BlockMesh key={block.id} block={block} blocks={blocks} onTake={onTake} />
      ))}
      <Walker me={me} onMove={onMove} />
      {others.map((person) => (
        <PersonMesh key={person.id} person={person} />
      ))}
    </>
  )
}

function Grass({ onPlace }: { onPlace: (x: number, z: number) => void }) {
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[(GRID_MIN + GRID_MAX) / 2 + 0.5, 0, (GRID_MIN + GRID_MAX) / 2 + 0.5]}
      onClick={(event) => {
        event.stopPropagation()
        const x = Math.floor(event.point.x)
        const z = Math.floor(event.point.z)
        if (inYard(x, z)) onPlace(x, z)
      }}
    >
      <planeGeometry args={[WIDTH, WIDTH]} />
      <meshStandardMaterial color="#4f8a5b" />
    </mesh>
  )
}

function BlockMesh({
  block,
  blocks,
  onTake,
}: {
  block: YardBlock
  blocks: StackBlock[]
  onTake: (x: number, z: number) => void
}) {
  const height = kindHeight(block.kind)
  const y = baseY(blocks, block.x, block.z, block.slot) + height / 2
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onTake(block.x, block.z)
  }
  return (
    <mesh position={[block.x + 0.5, y, block.z + 0.5]} onClick={click}>
      <boxGeometry args={[0.92, height, 0.92]} />
      <meshStandardMaterial
        color={block.color}
        emissive={block.kind === 'light' ? block.color : '#000000'}
        emissiveIntensity={block.kind === 'light' ? 0.55 : 0}
      />
    </mesh>
  )
}

function Walker({ me, onMove }: { me: Person; onMove: (x: number, z: number) => void }) {
  const group = useRef<import('three').Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  const spot = useRef({ x: me.x, z: me.z })
  const sent = useRef(0)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true
    }
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = 4.2 * Math.min(delta, 0.05)
    let { x, z } = spot.current
    if (keys.current['w'] || keys.current['arrowup']) z -= speed
    if (keys.current['s'] || keys.current['arrowdown']) z += speed
    if (keys.current['a'] || keys.current['arrowleft']) x -= speed
    if (keys.current['d'] || keys.current['arrowright']) x += speed
    x = Math.min(GRID_MAX + 0.85, Math.max(GRID_MIN + 0.15, x))
    z = Math.min(GRID_MAX + 0.85, Math.max(GRID_MIN + 0.15, z))
    spot.current = { x, z }
    if (group.current) group.current.position.set(x, 0, z)
    const now = performance.now()
    if (now - sent.current > 120) {
      sent.current = now
      onMove(x, z)
    }
  })

  return (
    <group ref={group} position={[me.x, 0, me.z]}>
      <PersonMesh person={{ ...me, x: 0, z: 0 }} local />
    </group>
  )
}

function PersonMesh({ person, local = false }: { person: Person; local?: boolean }) {
  return (
    <group position={local ? [0, 0, 0] : [person.x, 0, person.z]}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.42, 4, 8]} />
        <meshStandardMaterial color={person.color} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f6f1e6" />
      </mesh>
      <Billboard position={[0, 1.48, 0]}>
        <Text fontSize={0.2} color="#1c1915" anchorX="center" outlineWidth={0.012} outlineColor="#f6f1e6">
          {person.name}
        </Text>
        <Text position={[0, -0.24, 0]} fontSize={0.13} color="#3c2a1e" anchorX="center" outlineWidth={0.01} outlineColor="#f6f1e6">
          {person.quirk}
        </Text>
      </Billboard>
    </group>
  )
}
