import { describe, expect, it } from 'vitest'
import { COLS, HORSE, ROWS, likeness } from './horse'

describe('the horse', () => {
  it('is a full grid with a figure on it', () => {
    expect(HORSE).toHaveLength(ROWS)
    for (const row of HORSE) expect(row).toHaveLength(COLS)
    const figure = HORSE.flat().filter(Boolean)
    expect(figure.length).toBeGreaterThan(40)
  })

  it('starts at nothing and reaches the whole horse', () => {
    expect(likeness([])).toBe(0)
    const paints = []
    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        const color = HORSE[z][x]
        if (color) paints.push({ x, z, color })
      }
    }
    expect(likeness(paints)).toBe(100)
  })

  it('counts a wrong square and paint on the grass against the picture', () => {
    const paints = figurePaints()
    expect(likeness(paints)).toBe(100)
    const [x, z] = firstFigure()
    const wrong = paints.map((paint) => (paint.x === x && paint.z === z ? { ...paint, color: '#000000' } : paint))
    expect(likeness(wrong)).toBeLessThan(100)
    expect(likeness([...paints, { x: 0, z: 0, color: '#c47a3a' }])).toBeLessThan(100)
  })
})

function figurePaints() {
  const paints = []
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const color = HORSE[z][x]
      if (color) paints.push({ x, z, color })
    }
  }
  return paints
}

function firstFigure(): [number, number] {
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (HORSE[z][x]) return [x, z]
    }
  }
  throw new Error('horse has no pixels')
}
