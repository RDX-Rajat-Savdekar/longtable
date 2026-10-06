/** The picture everyone is painting. One color per square. Empty is grass. */

export const COLS = 18
export const ROWS = 12

export const PAINTS = [
  { id: 'mane', label: 'Mane', color: '#efd08a' },
  { id: 'coat', label: 'Coat', color: '#c47a3a' },
  { id: 'blaze', label: 'Blaze', color: '#f4efe4' },
  { id: 'shade', label: 'Shade', color: '#6e3b24' },
  { id: 'hoof', label: 'Hoof', color: '#241c16' },
] as const

const INK: Record<string, string> = {
  M: '#efd08a',
  B: '#c47a3a',
  W: '#f4efe4',
  D: '#6e3b24',
  K: '#241c16',
}

/** Side-on horse. Tail on the left, head on the right. */
const ROWS_INK = [
  '..................',
  '.............MM...',
  '............MBBM..',
  '...........MBWBM..',
  '..........MBBBBM..',
  '.....MMMMMBBBB....',
  '..MMBBBBBBBBBB....',
  '.MBBBBBBBBBBB.....',
  '.MBBBBBBBBBB......',
  '..BBBBBBBBBB......',
  '..BB..BB..BB......',
  '..KK..KK..KK......',
]

export const HORSE: string[][] = ROWS_INK.map((row) => row.split('').map((cell) => INK[cell] || ''))

export function inCanvas(x: number, z: number): boolean {
  return x >= 0 && x < COLS && z >= 0 && z < ROWS
}

export type Paint = { x: number; z: number; color: string }

/**
 * Share of the horse that is painted the right color.
 * A square of the wrong color, or paint on the grass, counts against it.
 */
export function likeness(paints: Paint[]): number {
  const placed = new Map<string, string>()
  for (const paint of paints) {
    if (!inCanvas(paint.x, paint.z)) continue
    placed.set(`${paint.x},${paint.z}`, paint.color.toLowerCase())
  }

  let figure = 0
  let hits = 0
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const want = HORSE[z][x]
      if (!want) continue
      figure += 1
      const got = placed.get(`${x},${z}`)
      if (got === want) hits += 1
      placed.delete(`${x},${z}`)
    }
  }

  const extras = placed.size
  const total = figure + extras
  if (total === 0) return 0
  return Math.round((hits / total) * 100)
}
