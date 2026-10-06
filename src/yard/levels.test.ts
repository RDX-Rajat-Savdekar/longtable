import { describe, expect, it } from 'vitest'
import { CHEATS, LEVELS, cheatPaints, levelById, likeness } from './levels'

describe('levels', () => {
  it('has the logo, the horse, and the dog', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(['logo', 'horse', 'dog'])
    for (const level of LEVELS) {
      expect(level.cells).toHaveLength(level.rows)
      for (const row of level.cells) expect(row).toHaveLength(level.cols)
    }
  })

  it('scores an empty yard at 0 and a finished picture at 100', () => {
    const level = levelById('logo')
    expect(likeness(level, [])).toBe(0)
    const done = cheatPaints(level, 100)
    expect(likeness(level, done)).toBe(100)
  })

  it('lands on the cheat amounts', () => {
    const level = levelById('horse')
    for (const percent of CHEATS) {
      const paints = cheatPaints(level, percent)
      const score = likeness(level, paints)
      expect(Math.abs(score - percent)).toBeLessThanOrEqual(1)
    }
  })
})
