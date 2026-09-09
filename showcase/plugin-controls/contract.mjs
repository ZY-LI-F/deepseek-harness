/** Validated public snapshots for the settings-only control channel. */
import { z } from 'zod'

export const phaseSchema = z.enum(['pending', 'loading', 'active', 'failed', 'disposed', 'unloading', 'disabled', 'missing'])
export const snapshotSchema = z.object({
  profile: z.string(), revision: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.array(z.object({ id: z.string(), packageName: z.string(), description: z.string(), protected: z.boolean(), enabled: z.boolean(), phase: phaseSchema })),
  applied: z.boolean().optional(), savedRevision: z.string().optional(),
})
