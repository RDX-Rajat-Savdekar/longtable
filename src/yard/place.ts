export type BlockKind = 'cube' | 'slab' | 'light'

export const GRID_MIN = -6
export const GRID_MAX = 5
export const MAX_SLOTS = 6

export type StackBlock = {
  x: number
  z: number
  slot: number
  kind: BlockKind
}

export function inYard(x: number, z: number): boolean {
  return x >= GRID_MIN && x <= GRID_MAX && z >= GRID_MIN && z <= GRID_MAX
}

export function kindHeight(kind: BlockKind): number {
  if (kind === 'slab') return 0.35
  if (kind === 'light') return 0.55
  return 1
}

export function column(blocks: StackBlock[], x: number, z: number): StackBlock[] {
  return blocks
    .filter((block) => block.x === x && block.z === z)
    .sort((a, b) => a.slot - b.slot)
}

export function topBlock(blocks: StackBlock[], x: number, z: number): StackBlock | null {
  const stack = column(blocks, x, z)
  return stack.length ? stack[stack.length - 1] : null
}

export function nextSlot(blocks: StackBlock[], x: number, z: number): number | null {
  const top = topBlock(blocks, x, z)
  const slot = top ? top.slot + 1 : 0
  return slot < MAX_SLOTS ? slot : null
}

/** Height of the base of this slot, from the blocks under it. */
export function baseY(blocks: StackBlock[], x: number, z: number, slot: number): number {
  return column(blocks, x, z)
    .filter((block) => block.slot < slot)
    .reduce((sum, block) => sum + kindHeight(block.kind), 0)
}
