import type { CollectionSchema } from 'deepspace/schema'

const open = { read: true, create: true, update: false, delete: true } as const

/** Shared pixels. Anyone in the yard can paint a square or clear it. */
export const blocksSchema: CollectionSchema = {
  name: 'blocks',
  columns: [
    { name: 'x', storage: 'number', interpretation: 'plain', required: true },
    { name: 'z', storage: 'number', interpretation: 'plain', required: true },
    { name: 'slot', storage: 'number', interpretation: 'plain', required: true },
    { name: 'kind', storage: 'text', interpretation: 'plain', required: true },
    { name: 'color', storage: 'text', interpretation: 'plain', required: true },
    { name: 'level', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    '*': open,
    viewer: open,
    member: open,
    admin: { read: true, create: true, update: true, delete: true },
  },
}
