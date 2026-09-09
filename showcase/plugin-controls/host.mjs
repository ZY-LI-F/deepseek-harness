/** Settings-only control of installed extension rows through Cordis profile patches. */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { parseDocument } from 'yaml'
import { z } from 'zod'
import { createPatchStore, parsePatch } from './patch-store.mjs'

export const name = 'plugin-controls'
export const inject = ['connection', 'webServer', 'loader', 'agents']
const configuration = z.object({ profile: z.string().regex(/^[a-zA-Z0-9_-]+$/).refine(value => value !== 'node_modules'), settleTimeoutMs: z.number().int().min(1000).max(30000) }).strict()
const change = z.object({ id: z.string().min(1).max(160), enabled: z.boolean(), revision: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const phases = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

/** Discover top-level extension rows from installed bundles and explicit local inserts. Core application rows remain outside this control. */
export async function discoverRows(profileDir, text) {
  const manifestFile = join(profileDir, 'package.json')
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
  const require = createRequire(manifestFile)
  const rows = new Map()
  const add = (patch, packageName, description) => {
    if (!Array.isArray(patch)) return
    for (const operation of patch) for (const entry of operation?.insert ?? []) {
      if (!operation.id && entry?.id && typeof entry.name === 'string') rows.set(entry.id, { id: entry.id, packageName: packageName ?? entry.name, description: description ?? '', protected: entry.id === 'plugin-controls' })
    }
  }
  for (const packageName of manifest.dsh?.profile?.bundles ?? []) {
    if (!Object.hasOwn(manifest.dependencies ?? {}, packageName)) continue
    const packagePath = require.resolve(`${packageName}/package.json`)
    const info = JSON.parse(await readFile(packagePath, 'utf8'))
    if (info.dsh?.bundle?.patch) {
      const parsed = parseDocument(await readFile(join(dirname(packagePath), info.dsh.bundle.patch), 'utf8'), { logLevel: 'silent' })
      if (parsed.errors.length) throw new Error(`Cannot read the installed bundle ${packageName}.`)
      add(parsed.toJS(), packageName, info.description)
    }
  }
  add(parsePatch(text).toJS())
  return [...rows.values()]
}

/** Mount a Connection-owned RPC channel; it supplies authentication, origin checks and request correlation. */
export function apply(ctx, raw) {
  const config = configuration.parse(raw)
  const profileDir = dshHomePath('profiles', config.profile)
  const store = createPatchStore(join(profileDir, 'cordis.patch.yml'))
  let closed = false
  const snapshot = async () => {
    const file = await store.read()
    const rows = await discoverRows(profileDir, file.text)
    const current = [...ctx.loader.entries()]
    return {
      profile: config.profile, revision: file.revision,
      entries: rows.map(row => {
        const entry = current.find(e => e.id === `include:${row.id}` || e.id === row.id)
        return { ...row, enabled: entry ? !entry.disabled : false, phase: entry?.fiber ? phases[entry.fiber.state] : entry ? 'disabled' : 'missing' }
      }),
    }
  }
  ctx.effect(() => async () => { closed = true; await store.drain() }, 'plugin-controls: drain edits')
  ctx.connection.rpc.handle('/plugin-controls', async (endpoint, payload, signal) => {
    try {
      if (closed) throw new Error('Plugin controls are unloading.')
      if (endpoint === 'list') return { ok: true, value: await snapshot() }
      if (endpoint !== 'set-enabled') throw new Error('Unknown plugin operation.')
      const input = change.parse(payload)
      const before = await snapshot()
      const target = before.entries.find(row => row.id === input.id)
      if (!target || target.protected) throw new Error('This entry is not an independently switchable extension.')
      if ([...ctx.agents.roots()].some(agent => agent.status === 'running')) throw new Error('Wait for running tasks to finish before changing plugins.')
      signal.throwIfAborted()
      const write = await store.update(input.id, !input.enabled, input.revision)
      const deadline = Date.now() + config.settleTimeoutMs
      let after
      do {
        after = await snapshot()
        const live = after.entries.find(row => row.id === input.id)
        if (live?.enabled === input.enabled && (input.enabled ? live.phase === 'active' : ['disabled', 'disposed', 'missing'].includes(live.phase))) return { ok: true, value: { ...after, applied: true } }
        await delay(100)
      } while (!closed && Date.now() < deadline)
      return { ok: true, value: { ...after, applied: false, savedRevision: write.revision } }
    } catch (error) {
      return { ok: false, error: { code: 'plugin-controls/rejected', message: error instanceof z.ZodError ? 'Invalid plugin change request.' : error.message, details: {} } }
    }
  })
}
