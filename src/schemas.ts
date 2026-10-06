/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import { CHANNELS_SCHEMA, MESSAGES_SCHEMA, type CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { plansSchema } from './schemas/plans-schema'
import { lettersSchema } from './schemas/letters-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  plansSchema,
  lettersSchema,
  CHANNELS_SCHEMA,
  MESSAGES_SCHEMA,
]
