/** Atomic, revision-checked edits to one configured profile patch. */
import { createHash, randomUUID } from 'node:crypto'
import { readFile, open, rename, unlink, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isMap, isSeq, parseDocument } from 'yaml'

/** Content revision used to reject changes based on a stale settings page. */
export const revisionOf = text => createHash('sha256').update(text).digest('hex')

/** Preserve YAML comments, ordering and unevaluated Cordis expression tags. */
export function parsePatch(text) {
  const document = parseDocument(text, { logLevel: 'silent' })
  if (document.errors.length || !isSeq(document.contents)) throw new Error('The profile patch must be a valid YAML list.')
  return document
}

/** Change only one entry's disabled property, leaving its config and all other rows intact. */
export function setDisabled(text, id, disabled) {
  const document = parsePatch(text)
  const matches = document.contents.items.filter(node => isMap(node) && node.get('id') === id && !node.has('insert'))
  const node = matches.at(-1)
  if (node) node.set('disabled', disabled)
  else document.contents.add(document.createNode({ id, disabled }))
  return String(document)
}

/** Serialize in-process edits, reject stale revisions and keep a recoverable pre-edit backup. */
export function createPatchStore(file) {
  let tail = Promise.resolve()
  const read = async () => {
    const text = await readFile(file, 'utf8')
    parsePatch(text)
    return { text, revision: revisionOf(text) }
  }
  return {
    read,
    update(id, disabled, revision) {
      const operation = tail.then(async () => {
        const lockPath = `${file}.plugin-controls.lock`
        let lock
        try { lock = await open(lockPath, 'wx', 0o600) } catch (error) {
          if (error.code === 'EEXIST') throw new Error('Another configuration change is in progress; refresh and retry.')
          throw error
        }
        const temporary = join(dirname(file), `.plugin-controls-${randomUUID()}.tmp`)
        try {
          const before = await read()
          if (before.revision !== revision) throw new Error('The configuration changed; refresh before trying again.')
          const next = setDisabled(before.text, id, disabled)
          const backupDir = join(dirname(file), 'plugin-control-backups')
          await mkdir(backupDir, { recursive: true, mode: 0o700 })
          const backup = join(backupDir, `${Date.now()}-${randomUUID()}.yml`)
          const backupHandle = await open(backup, 'wx', 0o600)
          try { await backupHandle.writeFile(before.text); await backupHandle.sync() } finally { await backupHandle.close() }
          const handle = await open(temporary, 'wx', 0o600)
          try { await handle.writeFile(next); await handle.sync() } finally { await handle.close() }
          if ((await read()).revision !== before.revision) throw new Error('The configuration changed during the update; refresh and retry.')
          await rename(temporary, file)
          return { revision: revisionOf(next), backup }
        } finally {
          try { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error }) }
          finally { await lock.close(); await unlink(lockPath) }
        }
      })
      tail = operation.catch(() => undefined)
      return operation
    },
    drain: () => tail,
  }
}
