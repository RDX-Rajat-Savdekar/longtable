import type { CollectionSchema } from 'deepspace/schema'

/**
 * The host's letter about the week. Only the server action writes these
 * rows. Everyone at the table can read the latest one.
 */
export const lettersSchema: CollectionSchema = {
  name: 'letters',
  columns: [
    { name: 'body', storage: 'text', interpretation: 'plain', required: true },
    { name: 'writtenAt', storage: 'text', interpretation: 'plain', required: true },
    { name: 'mailedAt', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
