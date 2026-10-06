import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { integration, useMutations, usePresenceRoom, useQuery } from 'deepspace'
import { SCOPE_ID } from '../../constants'
import { readAnthropicText } from '../../table/letter-text'
import { readCurrentWeather } from '../../table/weather'
import { DEFAULT_CITY } from '../../table/days'
import { nextSlot, topBlock, type BlockKind } from '../../yard/place'
import { skyColor, skyLabel } from '../../yard/sky'
import { loadWho, makeWho, saveWho, type Who } from '../../yard/who'
import { YardScene, type Person, type YardBlock } from './Scene'
import './yard.css'

type BlockData = { x: number; z: number; slot: number; kind: string; color: string }
type YardData = { sky: string; temp: number; title: string; skyAt: string; titleAt: string }

const KINDS: { id: BlockKind; label: string }[] = [
  { id: 'cube', label: 'Cube' },
  { id: 'slab', label: 'Slab' },
  { id: 'light', label: 'Light' },
]

const SKY_MS = 20 * 60 * 1000
const TITLE_MS = 45 * 1000

export default function Yard() {
  const [who, setWho] = useState<Who>(() => loadWho())
  const [kind, setKind] = useState<BlockKind>('cube')
  const [spot, setSpot] = useState({ x: 0.5, z: 0.5 })
  const [note, setNote] = useState('')
  const [naming, setNaming] = useState(false)
  const spotRef = useRef(spot)
  spotRef.current = spot

  const blocksQuery = useQuery<BlockData>('blocks')
  const yardQuery = useQuery<YardData>('yard')
  const blockWrites = useMutations<BlockData>('blocks')
  const yardWrites = useMutations<YardData>('yard')
  const presence = usePresenceRoom(SCOPE_ID)
  const presenceRef = useRef(presence)
  presenceRef.current = presence
  const saving = useRef(false)

  const blocks: YardBlock[] = useMemo(
    () =>
      blocksQuery.records
        .filter((record) => record.data.kind === 'cube' || record.data.kind === 'slab' || record.data.kind === 'light')
        .map((record) => ({
          id: record.recordId,
          x: Number(record.data.x),
          z: Number(record.data.z),
          slot: Number(record.data.slot),
          kind: record.data.kind as BlockKind,
          color: record.data.color || '#e9c46a',
        })),
    [blocksQuery.records],
  )

  const yard = yardQuery.records[0]
  const skyText = yard?.data.sky || ''
  const title = yard?.data.title || ''

  useEffect(() => {
    presenceRef.current.updateState({
      name: who.name,
      color: who.color,
      quirk: who.quirk,
      x: spot.x,
      z: spot.z,
    })
  }, [who, spot])

  useEffect(() => {
    if (!blockWrites.ready || !yardWrites.ready) return
    const skyAt = yard?.data.skyAt
    if (skyAt && Date.now() - Date.parse(skyAt) < SKY_MS) return
    let cancel = false
    void (async () => {
      const result = await integration.post('openweathermap/current', {
        q: DEFAULT_CITY,
        location: DEFAULT_CITY,
        units: 'imperial',
      })
      if (cancel || !result.success) return
      const current = readCurrentWeather(result.data)
      if (!current) return
      const data = {
        sky: current.description,
        temp: current.temp,
        title: yard?.data.title || '',
        skyAt: new Date().toISOString(),
        titleAt: yard?.data.titleAt || '',
      }
      if (yard) await yardWrites.putConfirmed(yard.recordId, data)
      else await yardWrites.createConfirmed(data)
    })()
    return () => {
      cancel = true
    }
  }, [blockWrites.ready, yard?.recordId])

  const me: Person = { id: who.id, name: who.name, color: who.color, quirk: who.quirk, x: spot.x, z: spot.z }
  const others: Person[] = presence.peers.map((peer) => {
    const state = peer.state as { name?: string; color?: string; quirk?: string; x?: number; z?: number }
    return {
      id: peer.userId,
      name: state.name || peer.userName || 'Friend',
      color: state.color || '#e9c46a',
      quirk: state.quirk || 'waves',
      x: typeof state.x === 'number' ? state.x : 0.5,
      z: typeof state.z === 'number' ? state.z : 0.5,
    }
  })

  async function place(x: number, z: number) {
    if (!blockWrites.ready || saving.current) return
    const slot = nextSlot(blocks, x, z)
    if (slot === null) {
      setNote('That stack is full.')
      return
    }
    saving.current = true
    setNote('')
    try {
      await blockWrites.createConfirmed({ x, z, slot, kind, color: who.color })
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The block did not land.')
    } finally {
      saving.current = false
    }
  }

  async function take(x: number, z: number) {
    if (!blockWrites.ready || saving.current) return
    const top = topBlock(blocks, x, z)
    if (!top) return
    const record = blocks.find((block) => block.x === x && block.z === z && block.slot === top.slot)
    if (!record) return
    saving.current = true
    setNote('')
    try {
      await blockWrites.removeConfirmed(record.id)
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The block stayed.')
    } finally {
      saving.current = false
    }
  }

  async function namePile() {
    if (!yardWrites.ready || naming || blocks.length === 0) return
    const titleAt = yard?.data.titleAt
    if (titleAt && Date.now() - Date.parse(titleAt) < TITLE_MS) {
      setNote('The pile just got a name. Wait a moment.')
      return
    }
    setNaming(true)
    setNote('')
    const summary = KINDS.map((item) => `${blocks.filter((block) => block.kind === item.id).length} ${item.label.toLowerCase()}s`).join(', ')
    const result = await integration.post('anthropic/chat-completion', {
      model: 'claude-haiku-4-5',
      max_tokens: 40,
      system: 'Name a friend-built block pile in three words or fewer. No punctuation.',
      messages: [{ role: 'user', content: summary }],
    })
    if (!result.success) {
      setNaming(false)
      setNote(result.error || 'The name did not come back.')
      return
    }
    const nextTitle = readAnthropicText(result.data).replace(/[.!?]/g, '').trim()
    if (!nextTitle) {
      setNaming(false)
      setNote('The name came back empty.')
      return
    }
    const data = {
      sky: yard?.data.sky || '',
      temp: yard?.data.temp || 0,
      title: nextTitle,
      skyAt: yard?.data.skyAt || '',
      titleAt: new Date().toISOString(),
    }
    try {
      if (yard) await yardWrites.putConfirmed(yard.recordId, data)
      else await yardWrites.createConfirmed(data)
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The name did not stick.')
    } finally {
      setNaming(false)
    }
  }

  function reshuffle() {
    const next = { ...makeWho(), id: who.id }
    saveWho(next)
    setWho(next)
  }

  return (
    <div className="yard">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [14, 12, 14], fov: 42 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
      >
        <YardScene
          blocks={blocks}
          me={me}
          others={others}
          sky={skyColor(skyText)}
          onPlace={(x, z) => void place(x, z)}
          onTake={(x, z) => void take(x, z)}
          onMove={(x, z) => setSpot({ x, z })}
        />
      </Canvas>

      <header className="yard-title">
        <strong>{title || 'The pile'}</strong>
        <span>{skyText ? `${skyLabel(skyText)}${yard?.data.temp ? `, ${Math.round(yard.data.temp)}°` : ''}` : 'Looking up the sky…'}</span>
      </header>

      <aside className="yard-rules">
        <p>Walk with W A S D.</p>
        <p>Click the grass to add a block.</p>
        <p>Click a block to take the top one off.</p>
      </aside>

      <aside className="yard-who">
        <span className="swatch" style={{ background: who.color }} />
        <div>
          <strong>{who.name}</strong>
          <em>{who.quirk}</em>
        </div>
        <button type="button" onClick={reshuffle}>
          New me
        </button>
      </aside>

      <div className="yard-tools">
        {KINDS.map((item) => (
          <button key={item.id} type="button" data-on={kind === item.id} onClick={() => setKind(item.id)}>
            {item.label}
          </button>
        ))}
        <button type="button" onClick={() => void namePile()} disabled={naming || blocks.length === 0}>
          {naming ? 'Naming…' : 'Name the pile'}
        </button>
      </div>

      {note && <p className="yard-note">{note}</p>}
    </div>
  )
}
