import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPatchStore, parsePatch, setDisabled, revisionOf } from './patch-store.mjs'

const original = '# keep deployment comments\n- id: existing\n  config:\n    value: !!js process.env.MY_SETTING\n- insert:\n    - id: example\n      name: example\n      config: { amount: 5 }\n'
test('a toggle preserves configurations, comments, tags and unrelated entries', () => {
  const disabled = setDisabled(original, 'example', true)
  assert.match(disabled, /# keep deployment comments/)
  assert.match(disabled, /!!js process.env.MY_SETTING/)
  assert.match(disabled, /amount: 5/)
  const enabled = setDisabled(disabled, 'example', false)
  const values = parsePatch(enabled).toJS()
  assert.equal(values.length, 3); assert.equal(values.at(-1).disabled, false)
  assert.throws(() => parsePatch('key: value'), /YAML list/)
  assert.throws(() => parsePatch('- [broken'), /YAML list/)
})
test('revision fencing rejects stale edits and every successful edit keeps an original backup', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'dsh-plugin-control-test-'))
  try {
    const file = join(folder, 'cordis.patch.yml'); await writeFile(file, original)
    const store = createPatchStore(file), initial = await store.read()
    const written = await store.update('example', true, initial.revision)
    assert.equal(await readFile(written.backup, 'utf8'), original)
    assert.equal((await store.read()).revision, written.revision)
    await assert.rejects(store.update('example', false, initial.revision), /changed/)
    assert.equal((await store.read()).revision, written.revision)
    await store.update('example', false, written.revision)
    assert.equal((await readdir(join(folder, 'plugin-control-backups'))).length, 2)
    await store.drain()
    assert.equal((await readdir(folder)).some(name => name.endsWith('.lock') || name.endsWith('.tmp')), false)
  } finally { await rm(folder, { recursive: true, force: true }) }
})
test('concurrent submissions serialize and cannot silently overwrite each other', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'dsh-plugin-control-test-'))
  try {
    const file = join(folder, 'cordis.patch.yml'); await writeFile(file, '[]\n')
    const store = createPatchStore(file), revision = revisionOf('[]\n')
    const outcomes = await Promise.allSettled([store.update('a', true, revision), store.update('b', true, revision)])
    assert.deepEqual(outcomes.map(result => result.status), ['fulfilled', 'rejected'])
  } finally { await rm(folder, { recursive: true, force: true }) }
})
