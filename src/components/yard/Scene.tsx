import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { COLS, ROWS, inYard } from '../../yard/place'

export type YardPixel = { id: string; x: number; z: number; color: string }
export type Person = { id: string; name: string; color: string; quirk: string; x: number; z: number }

const desired = new Vector3()
const look = new Vector3()

export function YardScene({
  pixels,
  me,
  others,
  sky,
  live,
  onPaint,
  onMove,
}: {
  pixels: YardPixel[]
  me: Person
  others: Person[]
  sky: string
  live: { x: number; z: number }
  onPaint: (x: number, z: number) => void
  onMove: (x: number, z: number) => void
}) {
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 16, 36]} />
      <hemisphereLight args={['#f6f1e6', '#3d6b45', 1.15]} />
      <directionalLight position={[8, 14, 6]} intensity={1.15} />
      <Grass onPaint={onPaint} />
      <CellLines />
      {pixels.map((pixel) => (
        <PixelMesh key={pixel.id} pixel={pixel} onPaint={onPaint} />
      ))}
      <Walker me={me} live={live} onMove={onMove} />
      {others.map((person) => (
        <PersonMesh key={person.id} person={person} />
      ))}
      <FollowCamera live={live} />
    </>
  )
}

function FollowCamera({ live }: { live: { x: number; z: number } }) {
  const { camera } = useThree()
  useFrame(() => {
    const { x, z } = live
    desired.set(x + 5.2, 7.4, z + 5.2)
    camera.position.copy(desired)
    look.set(x, 0, z)
    camera.lookAt(look)
  })
  return null
}

function Grass({ onPaint }: { onPaint: (x: number, z: number) => void }) {
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[COLS / 2, 0, ROWS / 2]}
      onClick={(event) => {
        event.stopPropagation()
        const x = Math.floor(event.point.x)
        const z = Math.floor(event.point.z)
        if (inYard(x, z)) onPaint(x, z)
      }}
    >
      <planeGeometry args={[COLS, ROWS]} />
      <meshStandardMaterial color="#4f8a5b" />
    </mesh>
  )
}

function CellLines() {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const y = 0.02
    for (let x = 0; x <= COLS; x++) positions.push(x, y, 0, x, y, ROWS)
    for (let z = 0; z <= ROWS; z++) positions.push(0, y, z, COLS, y, z)
    const geom = new BufferGeometry()
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return geom
  }, [])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#2c5a38" />
    </lineSegments>
  )
}

function PixelMesh({ pixel, onPaint }: { pixel: YardPixel; onPaint: (x: number, z: number) => void }) {
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onPaint(pixel.x, pixel.z)
  }
  return (
    <mesh position={[pixel.x + 0.5, 0.08, pixel.z + 0.5]} onClick={click}>
      <boxGeometry args={[0.9, 0.16, 0.9]} />
      <meshStandardMaterial color={pixel.color} />
    </mesh>
  )
}

function Walker({ me, live, onMove }: { me: Person; live: { x: number; z: number }; onMove: (x: number, z: number) => void }) {
  const group = useRef<import('three').Group>(null)
  const keys = useRef<Record<string, boolean>>({})
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

  useEffect(() => {
    group.current?.position.set(live.x, 0, live.z)
  }, [live])

  useFrame((_, delta) => {
    const speed = 3.4 * Math.min(delta, 0.05)
    let { x, z } = live
    if (keys.current['w'] || keys.current['arrowup']) z -= speed
    if (keys.current['s'] || keys.current['arrowdown']) z += speed
    if (keys.current['a'] || keys.current['arrowleft']) x -= speed
    if (keys.current['d'] || keys.current['arrowright']) x += speed
    x = Math.min(COLS - 0.3, Math.max(0.3, x))
    z = Math.min(ROWS - 0.3, Math.max(0.3, z))
    live.x = x
    live.z = z
    if (group.current) group.current.position.set(x, 0, z)
    const now = performance.now()
    if (now - sent.current > 120) {
      sent.current = now
      onMove(x, z)
    }
  })

  return (
    <group ref={group}>
      <PersonMesh person={{ ...me, x: 0, z: 0 }} local />
    </group>
  )
}

function PersonMesh({ person, local = false }: { person: Person; local?: boolean }) {
  return (
    <group position={local ? [0, 0, 0] : [person.x, 0, person.z]}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.18, 0.36, 4, 8]} />
        <meshStandardMaterial color={person.color} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#f6f1e6" />
      </mesh>
      <Billboard position={[0, 1.32, 0]}>
        <Text fontSize={0.16} color="#1c1915" anchorX="center" outlineWidth={0.01} outlineColor="#f6f1e6">
          {person.name}
        </Text>
        <Text position={[0, -0.2, 0]} fontSize={0.11} color="#3c2a1e" anchorX="center" outlineWidth={0.008} outlineColor="#f6f1e6">
          {person.quirk}
        </Text>
      </Billboard>
    </group>
  )
}
