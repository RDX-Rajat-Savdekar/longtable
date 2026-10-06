import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { integration, useMutations, usePresenceRoom, useQuery } from 'deepspace'
import { SCOPE_ID } from '../../constants'
import { readCurrentWeather } from '../../table/weather'
import { DEFAULT_CITY } from '../../table/days'
import { COLS, HORSE, PAINTS, ROWS, likeness } from '../../yard/horse'
import { skyColor, skyLabel } from '../../yard/sky'
import { loadWho, makeWho, saveWho, type Who } from '../../yard/who'
import { YardScene, type Person, type YardPixel } from './Scene'
import './yard.css'

type BlockData = { x: number; z: number; slot: number; kind: string; color: string }
type YardData = { sky: string; temp: number; title: string; skyAt: string; titleAt: string }

const SKY_MS = 20 * 60 * 1000

export default function Yard() {
  const [who, setWho] = useState<Who>(() => loadWho())
  const [paint, setPaint] = useState<string>(PAINTS[1].color)
  const [spot, setSpot] = useState({ x: COLS / 2, z: ROWS / 2 })
  const [note, setNote] = useState('')
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

  const pixels: YardPixel[] = useMemo(() => {
    const byCell = new Map<string, YardPixel>()
    for (const record of blocksQuery.records) {
      if (record.data.kind !== 'pixel') continue
      const x = Number(record.data.x)
      const z = Number(record.data.z)
      byCell.set(`${x},${z}`, {
        id: record.recordId,
        x,
        z,
        color: record.data.color || PAINTS[1].color,
      })
    }
    return [...byCell.values()]
  }, [blocksQuery.records])

  const match = likeness(pixels)
  const yard = yardQuery.records[0]
  const skyText = yard?.data.sky || ''

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
    if (!yardWrites.ready) return
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
        title: 'Horse',
        skyAt: new Date().toISOString(),
        titleAt: yard?.data.titleAt || '',
      }
      if (yard) await yardWrites.putConfirmed(yard.recordId, data)
      else await yardWrites.createConfirmed(data)
    })()
    return () => {
      cancel = true
    }
  }, [yardWrites.ready, yard?.recordId])

  const me: Person = { id: who.id, name: who.name, color: who.color, quirk: who.quirk, x: spot.x, z: spot.z }
  const others: Person[] = presence.peers.map((peer) => {
    const state = peer.state as { name?: string; color?: string; quirk?: string; x?: number; z?: number }
    return {
      id: peer.userId,
      name: state.name || peer.userName || 'Friend',
      color: state.color || '#e9c46a',
      quirk: state.quirk || 'waves',
      x: typeof state.x === 'number' ? state.x : COLS / 2,
      z: typeof state.z === 'number' ? state.z : ROWS / 2,
    }
  })

  async function paintCell(x: number, z: number) {
    if (!blockWrites.ready || saving.current) return
    const existing = pixels.find((pixel) => pixel.x === x && pixel.z === z)
    saving.current = true
    setNote('')
    try {
      if (existing) await blockWrites.removeConfirmed(existing.id)
      else await blockWrites.createConfirmed({ x, z, slot: 0, kind: 'pixel', color: paint })
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The paint did not land.')
    } finally {
      saving.current = false
    }
  }

  function reshuffle() {
    const next = { ...makeWho(), id: who.id }
    saveWho(next)
    setWho(next)
  }

  const spawn = { x: COLS / 2 + 5.2, y: 7.4, z: ROWS / 2 + 5.2 }

  return (
    <div className="yard">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [spawn.x, spawn.y, spawn.z], fov: 46 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(COLS / 2, 0, ROWS / 2)}
      >
        <YardScene
          pixels={pixels}
          me={me}
          others={others}
          sky={skyColor(skyText)}
          onPaint={(x, z) => void paintCell(x, z)}
          onMove={(x, z) => setSpot({ x, z })}
        />
      </Canvas>

      <header className="yard-title">
        <strong>Paint the horse</strong>
        <span>{skyText ? `${skyLabel(skyText)}${yard?.data.temp ? `, ${Math.round(yard.data.temp)}°` : ''}` : 'Looking up the sky…'}</span>
      </header>

      <aside className="yard-rules">
        <p>Walk with W A S D.</p>
        <p>Pick a color. Click a square to paint it.</p>
        <p>Click a painted square to clear it.</p>
      </aside>

      <aside className="yard-card" aria-label="The horse to copy">
        <div className="pixel-art" style={{ gridTemplateColumns: `repeat(${COLS}, 8px)` }}>
          {HORSE.flat().map((color, index) => (
            <i key={index} style={{ background: color || '#4f8a5b' }} />
          ))}
        </div>
        <div className="likeness" role="meter" aria-valuenow={match} aria-valuemin={0} aria-valuemax={100} aria-label={`${match}% like the horse`}>
          <span style={{ width: `${match}%` }} />
        </div>
        <p>{match}% like the horse</p>
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
        {PAINTS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-on={paint === item.color}
            style={{ background: item.color, color: item.id === 'hoof' || item.id === 'shade' ? '#f6f1e6' : '#1c1915' }}
            onClick={() => setPaint(item.color)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {note && <p className="yard-note">{note}</p>}
    </div>
  )
}
