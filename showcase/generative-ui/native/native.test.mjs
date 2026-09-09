import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from './host.mjs'
import { boundedParse, documentSchema, nativeQuestions, normalizeAnswers, roundSchema, toolSchema } from './schema.mjs'
import { readMetadata, readResult, resultDefinition, resultView } from './projection.mjs'
import { document, round } from './fixtures.mjs'
import { documentText } from './document-text.mjs'
import { turnResultsDefinition, selectTurnResults } from './turn-results.mjs'

test('completed-turn projection retains answer order and excludes failures and other turns', () => {
  const start = { event: { type: 'turn/start', data: { turn: 3 } } }
  let state = turnResultsDefinition.start({}, start)
  const answer = { version: 1, kind: 'answers', title: 'Readers', round: 1, answers: [] }
  for (const [seq, data, isError] of [[10, answer, false], [20, { version: 1, kind: 'document', document }, false], [25, answer, true]]) {
    const event = { type: 'tool/result', seq, data: { turn: 3, meta: { generativeUi: data }, message: { content: [{ isError }] } } }
    assert.deepEqual(turnResultsDefinition.match(event), { id: '3', role: 'update' })
    state = turnResultsDefinition.update({ state }, { event })
  }
  const value = turnResultsDefinition.buildLocationData({ state }, 'turn', null)
  assert.equal(value.key, turnResultsDefinition.kind)
  assert.equal(value.turn, 3)
  assert.equal(turnResultsDefinition.buildLocationData({ state }, 'turn', value), value)
  assert.equal(turnResultsDefinition.buildLocationData({ state }, 'step', null), null)
  assert.equal(turnResultsDefinition.buildLocationData({}, 'turn', null), null)
  const owner = { seq: 21, turn: { status: 'closed', data: { get: key => key === 'generative-ui' ? value.value : undefined } } }
  assert.deepEqual(selectTurnResults(owner).map(result => result.seq), [10, 20])
  assert.equal(selectTurnResults({ ...owner, turn: { ...owner.turn, data: { get: () => undefined } } }), null)
})

test('all thirteen result renderers share one bounded serializable document', () => {
  assert.equal(documentSchema.parse(document).sections.length, 13)
  assert.deepEqual(readMetadata({ generativeUi: { version: 1, kind: 'document', document } }).document, document)
  assert.equal(readResult({ version: 2, kind: 'document', document }), null)
  assert.equal(readMetadata(null), null)
  assert.throws(() => boundedParse(documentSchema, document, 20), /UTF-8/)
})
test('malformed charts, duplicate ids, unknown table keys and unsafe links are rejected', () => {
  for (const mutate of [
    d => d.sections.push(d.sections[0]),
    d => d.sections[1].series[0].values.pop(),
    d => d.sections[2].rows[0].unknown = 3,
    d => d.sections[3].items[0].value = 99,
    d => d.sections[8].items[0].url = 'javascript:alert(1)',
  ]) { const value = structuredClone(document); mutate(value); assert.equal(documentSchema.safeParse(value).success, false) }
})
test('five question types map onto the existing native request protocol', () => {
  assert.deepEqual(roundSchema.parse(round), round)
  const questions = nativeQuestions(round)
  assert.equal(questions[0].options[0].label, '内部团队 (Recommended)')
  assert.equal(questions[1].multiSelect, true)
  assert.equal(questions[2].options, undefined)
  assert.deepEqual(questions[3].options.map(o => o.label), ['是 / Yes', '否 / No'])
  const answer = { answers: questions.map(q => ({ id: q.id, selected: q.options ? [q.options[0].label] : [], ...(!q.options ? { custom: q.id.includes(':number:') ? '25' : '准确率达到 90%' } : {}) })) }
  assert.equal(normalizeAnswers(round, answer)[4].custom, '25')
  assert.deepEqual(normalizeAnswers(round, answer)[0].options, questions[0].options)
  assert.throws(() => normalizeAnswers(round, { answers: answer.answers.slice(1) }), /exactly once/)
  answer.answers[0].selected = ['unknown']
  assert.throws(() => normalizeAnswers(round, answer), /unknown option/)
})
test('document exports use the preview content and reject unsafe filenames or executable fields', () => {
  const section = document.sections[12]
  assert.ok(documentText(section).startsWith('# 团队知识库试点说明\n\n'))
  assert.ok(documentText(section).includes('- 保留来源引用'))
  for (const mutate of [d => d.sections[12].filename = '../secret.md', d => d.sections[12].html = '<script>bad()</script>', d => d.sections[12].content = []]) {
    const invalid = structuredClone(document); mutate(invalid)
    assert.equal(documentSchema.safeParse(invalid).success, false)
  }
})
test('choice schemas reject unavailable recommendations and non-choice options', () => {
  for (const mutate of [r => r.questions[0].recommended = 'missing', r => delete r.questions[0].options, r => r.questions[2].options = [{ label: 'a' }, { label: 'b' }]]) {
    const value = structuredClone(round); mutate(value); assert.equal(roundSchema.safeParse(value).success, false)
  }
})
test('provider schemas use only the enforced DSH JSON Schema vocabulary', () => {
  const keys = new Set(['type', 'const', 'enum', 'description', 'title', 'required', 'additionalProperties', 'properties', 'items', 'oneOf'])
  const visit = schema => {
    for (const key of Object.keys(schema)) assert.ok(keys.has(key), key)
    for (const child of Object.values(schema.properties ?? {})) visit(child)
    for (const child of schema.oneOf ?? []) visit(child)
    if (schema.items) visit(schema.items)
  }
  visit(toolSchema(documentSchema)); visit(toolSchema(roundSchema))
})
test('native result history replays without the original call and replaces a loaded window', () => {
  const event = { type: 'tool/result', seq: 20, data: { meta: { generativeUi: { version: 1, kind: 'document', document } }, message: { content: [{ toolCallId: 'call-20', content: [], isError: false }] } } }
  assert.equal(resultDefinition.match(event).role, 'start')
  const match = { event, location: {} }
  const state = resultDefinition.start({}, match)
  const node = resultDefinition.buildViewNode({ key: '20', id: '20', start: match, state })
  assert.equal(node.callId, 'call-20')
  const builder = resultView.create()
  assert.equal(builder.apply({ upserts: [node] })[0].data.document.title, document.title)
  assert.equal(builder.replace({ nodes: [] }).length, 0)
  assert.equal(resultView.create().empty.length, 0)
  event.data.message.content[0].isError = true
  assert.equal(resultDefinition.start({}, match), null)
})
test('native tools return durable metadata and wait for actual human answers', async () => {
  const registered = new Map(), cleanups = []
  let asked, answer
  const waiting = new Promise(resolve => { answer = resolve })
  const ctx = { effect(fn) { cleanups.push(fn()) }, systemPrompt: { section: () => () => {} }, tools: { register(tool) { registered.set(tool.name, tool); return () => registered.delete(tool.name) } }, userQuestions: { ask(request) { asked = request; return waiting } } }
  apply(ctx, { maxDocumentBytes: 131072, promptOrder: 850 })
  const tool = registered.get('present_ui'), signal = new AbortController().signal
  const result = await tool.execute(document, { signal })
  assert.deepEqual(tool.output.presentationMeta({}, result), { generativeUi: result })
  assert.deepEqual(JSON.parse(tool.output.render({}, result)[0].text), result)
  const pending = registered.get('ask_ui').execute(round, { signal, agent: 'native-agent' })
  assert.equal(asked.agent, 'native-agent'); assert.equal(asked.signal, signal)
  answer({ answers: asked.questions.map(q => ({ id: q.id, selected: q.options ? [q.options[0].label] : [], ...(!q.options ? { custom: q.id.includes(':number:') ? '25' : '演示回答' } : {}) })) })
  assert.equal((await pending).answers.length, 5)
  for (const cleanup of cleanups.reverse()) cleanup()
  assert.equal(registered.size, 0)
})
