import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { integration, useMutations, usePresenceRoom, useQuery } from 'deepspace'
import { SCOPE_ID } from '../../constants'
import { readCurrentWeather } from '../../table/weather'
import { DEFAULT_CITY } from '../../table/days'
import { CHEATS, cheatPaints, levelById, likeness, type LevelId } from '../../yard/levels'
import { skyColor, skyLabel } from '../../yard/sky'
import { loadWho, makeWho, saveWho, type Who } from '../../yard/who'
import { YardScene, type Person, type YardPixel } from './Scene'
import './yard.css'

type BlockData = { x: number; z: number; slot: number; kind: string; color: string; level?: string }
type YardData = { sky: string; temp: number; title: string; skyAt: string; titleAt: string; level?: string }

const SKY_MS = 20 * 60 * 1000
const CELL = 7

export default function Yard() {
  const [who, setWho] = useState<Who>(() => loadWho())
  const [paint, setPaint] = useState<string>(levelById('logo').paints[1].color)
  const [spot, setSpot] = useState({ x: 8, z: 8 })
  const [note, setNote] = useState('')
  const [filling, setFilling] = useState(false)
  const live = useRef({ x: 8, z: 8 })

  const blocksQuery = useQuery<BlockData>('blocks')
  const yardQuery = useQuery<YardData>('yard')
  const blockWrites = useMutations<BlockData>('blocks')
  const yardWrites = useMutations<YardData>('yard')
  const presence = usePresenceRoom(SCOPE_ID)
  const presenceRef = useRef(presence)
  presenceRef.current = presence
  const saving = useRef(false)
  const level = levelById(yardQuery.records[0]?.data.level || 'logo')

  const pixels: YardPixel[] = useMemo(() => {
    const byCell = new Map<string, YardPixel>()
    for (const record of blocksQuery.records) {
      if (record.data.kind !== 'pixel') continue
      if ((record.data.level || '') !== level.id) continue
      const x = Number(record.data.x)
      const z = Number(record.data.z)
      byCell.set(`${x},${z}`, {
        id: record.recordId,
        x,
        z,
        color: record.data.color || level.paints[0].color,
      })
    }
    return [...byCell.values()]
  }, [blocksQuery.records, level])

  const painted = useMemo(() => {
    const cells = Array.from({ length: level.rows * level.cols }, () => '')
    for (const pixel of pixels) {
      if (pixel.x >= 0 && pixel.x < level.cols && pixel.z >= 0 && pixel.z < level.rows) {
        cells[pixel.z * level.cols + pixel.x] = pixel.color
      }
    }
    return cells
  }, [pixels, level])

  const match = likeness(level, pixels)
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
        title: level.name,
        skyAt: new Date().toISOString(),
        titleAt: yard?.data.titleAt || '',
        level: level.id,
      }
      if (yard) await yardWrites.putConfirmed(yard.recordId, data)
      else await yardWrites.createConfirmed(data)
    })()
    return () => {
      cancel = true
    }
  }, [yardWrites.ready, yard?.recordId, level.id, level.name])

  useEffect(() => {
    const next = levelById(level.id)
    const x = next.cols / 2
    const z = next.rows / 2
    live.current.x = x
    live.current.z = z
    setSpot({ x, z })
    setPaint((current) => (next.paints.some((item) => item.color === current) ? current : next.paints[1]?.color || next.paints[0].color))
  }, [level.id])

  const me: Person = { id: who.id, name: who.name, color: who.color, quirk: who.quirk, x: spot.x, z: spot.z }
  const others: Person[] = presence.peers.map((peer) => {
    const state = peer.state as { name?: string; color?: string; quirk?: string; x?: number; z?: number }
    return {
      id: peer.userId,
      name: state.name || peer.userName || 'Friend',
      color: state.color || '#e9c46a',
      quirk: state.quirk || 'waves',
      x: typeof state.x === 'number' ? state.x : level.cols / 2,
      z: typeof state.z === 'number' ? state.z : level.rows / 2,
    }
  })

  async function paintCell(x: number, z: number) {
    if (!blockWrites.ready || saving.current) return
    const existing = pixels.find((pixel) => pixel.x === x && pixel.z === z)
    saving.current = true
    setNote('')
    try {
      if (existing) await blockWrites.removeConfirmed(existing.id)
      else await blockWrites.createConfirmed({ x, z, slot: 0, kind: 'pixel', color: paint, level: level.id })
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

  async function chooseLevel(id: LevelId) {
    if (!yardWrites.ready || saving.current || id === level.id) return
    const next = levelById(id)
    const data: YardData = {
      sky: yard?.data.sky || '',
      temp: yard?.data.temp || 0,
      title: next.name,
      skyAt: yard?.data.skyAt || '',
      titleAt: yard?.data.titleAt || '',
      level: id,
    }
    saving.current = true
    try {
      if (yard) await yardWrites.putConfirmed(yard.recordId, data)
      else await yardWrites.createConfirmed(data)
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The picture did not change.')
    } finally {
      saving.current = false
    }
  }

  async function fillTo(percent: number) {
    if (!blockWrites.ready || saving.current) return
    saving.current = true
    setFilling(true)
    setNote('Filling the picture…')
    try {
      const existing = blocksQuery.records.filter((record) => record.data.kind === 'pixel' && (record.data.level || '') === level.id)
      await pool(existing, (record) => blockWrites.removeConfirmed(record.recordId))
      const want = cheatPaints(level, percent)
      await pool(want, (cell) =>
        blockWrites.createConfirmed({ x: cell.x, z: cell.z, slot: 0, kind: 'pixel', color: cell.color, level: level.id }),
      )
      setNote('')
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : 'The fill did not finish.')
    } finally {
      saving.current = false
      setFilling(false)
    }
  }

  const spawn = { x: level.cols / 2 + 5.2, y: 7.4, z: level.rows / 2 + 5.2 }

  return (
    <div className="yard">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [spawn.x, spawn.y, spawn.z], fov: 46 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(level.cols / 2, 0, level.rows / 2)}
      >
        <YardScene
          pixels={pixels}
          me={me}
          others={others}
          sky={skyColor(skyText)}
          cols={level.cols}
          rows={level.rows}
          live={live.current}
          onPaint={(x, z) => void paintCell(x, z)}
          onMove={(x, z) => setSpot({ x, z })}
        />
      </Canvas>

      <header className="yard-title">
        <strong>{level.name}</strong>
        <span>{skyText ? `${skyLabel(skyText)}${yard?.data.temp ? `, ${Math.round(yard.data.temp)}°` : ''}` : 'Looking up the sky…'}</span>
      </header>

      <aside className="yard-rules">
        <p>Walk with W A S D.</p>
        <p>Pick a color. Click a square to paint it.</p>
        <p>Click a painted square to clear it.</p>
      </aside>

      <aside className="yard-corner">
        <div className="yard-card" aria-label="Where everyone is">
          <div className="map-board" style={{ gridTemplateColumns: `repeat(${level.cols}, ${CELL}px)` }}>
            {painted.map((color, index) => (
              <i key={index} style={{ background: color || '#4f8a5b' }} />
            ))}
            <MapDot live={live.current} color={who.color} cols={level.cols} rows={level.rows} />
            {others.map((person) => (
              <span
                key={person.id}
                className="map-dot"
                title={person.name}
                style={{
                  left: `${(person.x / level.cols) * 100}%`,
                  top: `${(person.z / level.rows) * 100}%`,
                  background: person.color,
                }}
              />
            ))}
          </div>
        </div>

        <div className="yard-card" aria-label={level.name}>
          <div className="pixel-art" style={{ gridTemplateColumns: `repeat(${level.cols}, ${CELL}px)` }}>
            {level.cells.flat().map((color, index) => (
              <i key={index} style={{ background: color }} />
            ))}
          </div>
          <div className="likeness" role="meter" aria-valuenow={match} aria-valuemin={0} aria-valuemax={100} aria-label={`${match}% like ${level.picture}`}>
            <span style={{ width: `${match}%` }} />
          </div>
          <p>{match}% like {level.picture}</p>
        </div>
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

      <div className="yard-stack">
        <div className="yard-cheat">
          <span>Cheat</span>
          {CHEATS.map((percent) => (
            <button key={percent} type="button" disabled={filling} onClick={() => void fillTo(percent)}>
              {percent}%
            </button>
          ))}
        </div>
        <div className="yard-levels">
          {(['logo', 'horse', 'dog'] as LevelId[]).map((id) => {
            const item = levelById(id)
            return (
              <button key={id} type="button" data-on={level.id === id} disabled={filling} onClick={() => void chooseLevel(id)}>
                {item.name}
              </button>
            )
          })}
        </div>
        <div className="yard-tools">
          {level.paints.map((item) => (
            <button
              key={item.id}
              type="button"
              data-on={paint === item.color}
              style={{ background: item.color, color: inkOn(item.color) }}
              onClick={() => setPaint(item.color)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {note && <p className="yard-note">{note}</p>}
    </div>
  )
}

function MapDot({ live, color, cols, rows }: { live: { x: number; z: number }; color: string; cols: number; rows: number }) {
  const dot = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = dot.current
      if (el) {
        el.style.left = `${(live.x / cols) * 100}%`
        el.style.top = `${(live.z / rows) * 100}%`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [live, cols, rows])

  return <span ref={dot} className="map-dot map-dot-me" style={{ background: color }} />
}

function inkOn(color: string): string {
  const value = Number.parseInt(color.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return red * 0.3 + green * 0.59 + blue * 0.11 > 150 ? '#1c1915' : '#f6f1e6'
}

async function pool<T>(items: T[], worker: (item: T) => Promise<unknown>) {
  let index = 0
  async function next(): Promise<void> {
    while (index < items.length) {
      const current = items[index]
      index += 1
      await worker(current)
    }
  }
  const workers = Math.min(6, items.length)
  if (workers === 0) return
  await Promise.all(Array.from({ length: workers }, () => next()))
}
