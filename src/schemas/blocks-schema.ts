import type { CollectionSchema } from 'deepspace/schema'

const open = { read: true, create: true, update: false, delete: true } as const

/** Shared blocks. Anyone in the yard can add one or take a top block off. */
export const blocksSchema: CollectionSchema = {
  name: 'blocks',
  columns: [
    { name: 'x', storage: 'number', interpretation: 'plain', required: true },
    { name: 'z', storage: 'number', interpretation: 'plain', required: true },
    { name: 'slot', storage: 'number', interpretation: 'plain', required: true },
    { name: 'kind', storage: 'text', interpretation: 'plain', required: true },
    { name: 'color', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    '*': open,
    viewer: open,
    member: open,
    admin: { read: true, create: true, update: true, delete: true },
  },
}
