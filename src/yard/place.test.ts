import { describe, expect, it } from 'vitest'
import { baseY, inYard, nextSlot, topBlock } from './place'

const pile = [
  { x: 0, z: 0, slot: 0, kind: 'cube' as const },
  { x: 0, z: 0, slot: 1, kind: 'slab' as const },
]

describe('yard rules', () => {
  it('keeps clicks inside the grass', () => {
    expect(inYard(0, 0)).toBe(true)
    expect(inYard(-6, 5)).toBe(true)
    expect(inYard(6, 0)).toBe(false)
    expect(inYard(0, -7)).toBe(false)
  })

  it('stacks the next block on top and stops at six', () => {
    expect(nextSlot([], 1, 1)).toBe(0)
    expect(nextSlot(pile, 0, 0)).toBe(2)
    expect(topBlock(pile, 0, 0)?.kind).toBe('slab')
    const full = Array.from({ length: 6 }, (_, slot) => ({ x: 1, z: 1, slot, kind: 'cube' as const }))
    expect(nextSlot(full, 1, 1)).toBeNull()
  })

  it('lifts a slab onto the cube under it', () => {
    expect(baseY(pile, 0, 0, 1)).toBe(1)
    expect(baseY(pile, 0, 0, 0)).toBe(0)
  })
})
