import type { CollectionSchema } from 'deepspace/schema'

/**
 * A plan on one day of the shared week.
 * Members can lay down and edit their own cards.
 * Weather fields are filled by the host's stamp action, which bypasses
 * this writable-field list on purpose.
 */
export const plansSchema: CollectionSchema = {
  name: 'plans',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'day', storage: 'number', interpretation: 'plain', required: true },
    { name: 'place', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'outdoor', storage: 'number', interpretation: { kind: 'boolean' }, default: 0 },
    { name: 'weatherSummary', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'weatherTemp', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'stampedAt', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'calledOff', storage: 'number', interpretation: { kind: 'boolean' }, default: 0 },
  ],
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: {
      read: true,
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['title', 'day', 'place', 'outdoor'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
