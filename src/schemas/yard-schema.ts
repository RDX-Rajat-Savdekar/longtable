import type { CollectionSchema } from 'deepspace/schema'

const open = { read: true, create: true, update: true, delete: false } as const

/** One shared note for the sky and the pile's name. */
export const yardSchema: CollectionSchema = {
  name: 'yard',
  columns: [
    { name: 'sky', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'temp', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'title', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'skyAt', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'titleAt', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'level', storage: 'text', interpretation: 'plain', default: 'logo' },
  ],
  permissions: {
    '*': open,
    viewer: open,
    member: open,
    admin: { read: true, create: true, update: true, delete: true },
  },
}
