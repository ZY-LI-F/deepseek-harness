/** Built-browser consumer snapshots over recorded tool data; no model or browser service is started. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { document, round } from './fixtures.mjs'
import { nativeQuestions, normalizeAnswers } from './schema.mjs'
import { documentText } from './document-text.mjs'

const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url))
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const code = await readFile(new URL('./lib/client.js', import.meta.url), 'utf8')
const registrations = [], dictionaries = new Map(), styles = []
// Registration ports are test doubles; the live DSH browser verifies store persistence and human settlement.
const defineStore = spec => ({ spec })
let plugin
runInNewContext(code, { URL, TextEncoder, document: { createElement: () => ({ textContent: '', remove() {} }), head: { append: tag => styles.push(tag.textContent) } }, window: { __ModuleLoader__: { load(registration) { plugin = registration.factory(id => id === '@deepseek-ai/dsh-client-store' ? { defineStore } : require(id)) } } } })
plugin.apply({
  effect: fn => fn(), locale: { register: (ns, value) => { dictionaries.set(ns, value); return () => {} }, bind: ns => key => dictionaries.get(ns).zh[key] },
  uiConversation: { events: { register() {} }, views: { register() {} } },
  slots: { inject: (_name, register) => register(), register: (options, Component) => registrations.push({ options, Component }) },
})
const t = key => dictionaries.get('generative-ui').zh[key]
const result = { version: 1, kind: 'document', document }
const nativeResults = { getSnapshot: () => undefined, subscribe: () => () => {} }

test('built browser registers native tool, history and composer contributions without a model client', () => {
  assert.deepEqual(Object.keys(plugin).sort(), ['apply', 'inject'])
  assert.equal(registrations.length, 5)
  assert.equal(styles.length, 1)
  assert.ok(!code.includes('streamText('))
})
test('PharmaID theme stays scoped to native cards and preserves visible read-only selections', async () => {
  assert.ok(styles[0].includes('--gu-accent: #468efd'))
  assert.ok(styles[0].includes('--gu-ground: #e2f0ff'))
  assert.ok(styles[0].includes('.gu-options input[type=checkbox]:checked:before'))
  assert.ok(styles[0].includes('.gu-options input[type=radio]:checked:before'))
  const optionLayouts = [...styles[0].matchAll(/\.gu-options\s*\{([^}]*)\}/g)]
  assert.equal(optionLayouts.length, 1)
  assert.match(optionLayouts[0][1], /grid-template-columns:\s*minmax\(0, 1fr\)/)
  assert.ok(!/(?:^|\n)\s*(?:body|html|:root)\s*\{/.test(styles[0]))
  assert.ok(!styles[0].includes('url('))
  const file = new URL('./snapshots/pharmaid-theme.css', import.meta.url)
  if (process.env.GENUI_UPDATE_SNAPSHOTS === '1') await writeFile(file, styles[0])
  assert.equal(await readFile(file, 'utf8'), styles[0])
})
test('completed-turn outcomes render through the native transcript tail without claiming unrelated turns', () => {
  const tail = registrations.find(row => row.options.name === 'conversation.chat.turnTail')
  assert.equal(tail.options.priority, 10)
  const owner = { turn: { status: 'closed', data: { get: () => undefined } }, seq: 99 }
  assert.equal(tail.options.select(owner), null)
  const values = { results: [{ seq: 10, data: result }, { seq: 20, data: result }, { seq: 100, data: result }] }
  owner.turn.data.get = () => values
  const matched = tail.options.select(owner)
  assert.equal(matched.length, 1)
  assert.equal(matched[0].seq, 20)
  const html = renderToStaticMarkup(React.createElement(tail.Component, { t, matched }))
  assert.ok(html.includes('data-generative-ui-turn-results=""'))
  assert.ok(html.includes('download="team-brief.md"'))
  owner.turn.status = 'open'
  assert.equal(tail.options.select(owner), null)
})
test('choice cards use compact rows, inline descriptions and eight-pixel corners', () => {
  assert.match(styles[0], /\.gu-options>label\s*\{[^}]*border-radius: 8px;[^}]*padding: 7px 10px;[^}]*line-height: 20px;/)
  assert.match(styles[0], /\.gu-options small\s*\{\s*display: inline;/)
  assert.match(styles[0], /\.gu-options>label>span\s*\{[^}]*white-space: normal;/)
  assert.match(styles[0], /\.gu-answers\s*\{[^}]*border-radius: 8px;/)
  assert.match(styles[0], /\.gu-round\s*\{[^}]*border-radius: 8px;/)
})
test('the full-width result view opts into the native composer overlay without transcript drag handles', () => {
  const view = registrations.find(row => row.options.name === 'conversation.view')
  const html = renderToStaticMarkup(React.createElement(view.Component, {
    t,
    useConversation: select => select({ views: new Map([['generative-ui', [{ key: 'result-1', anchorSeq: 1, data: result }]]]) }),
    useSession: select => select({ running: false }),
    run: async () => {},
    loadOlder: () => {},
  }))
  assert.ok(html.includes('data-conversation-composer-overlay=""'))
  assert.ok(html.includes('data-native-result="1"'))
  assert.ok(styles[0].includes('--dsh-composer-height'))
})
test('a native result event renders all thirteen result types in the built browser factory', async () => {
  const card = registrations.find(row => row.options.key === 'present_ui')
  const html = renderToStaticMarkup(React.createElement(card.Component, { t, nativeResults, block: { kind: 'tool-result', call: { name: 'present_ui', argsRaw: '{}' }, isError: false, meta: { generativeUi: result }, content: [{ type: 'text', text: JSON.stringify(result) }] } }))
  for (const section of document.sections) assert.ok(html.includes(`gu-type-${section.type}`), section.type)
  assert.ok(html.includes('<svg')); assert.ok(html.includes('<table>')); assert.ok(html.includes('<progress'))
  assert.ok(html.includes('download="team-brief.md"'))
  assert.ok(html.includes(encodeURIComponent(documentText(document.sections[12]))))
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'))
  const file = new URL('./snapshots/result-card.html', import.meta.url)
  if (process.env.GENUI_UPDATE_SNAPSHOTS === '1') { await mkdir(new URL('./snapshots/', import.meta.url), { recursive: true }); await writeFile(file, html + '\n') }
  assert.equal(await readFile(file, 'utf8'), html + '\n')
})
test('settled answers replay the original choices as read-only cards', async () => {
  const questions = nativeQuestions(round)
  const value = { version: 1, kind: 'answers', title: round.title, round: 1, answers: normalizeAnswers(round, { answers: questions.map(q => ({ id: q.id, selected: q.options ? q.options.slice(0, q.multiSelect ? 2 : 1).map(o => o.label) : [], ...(!q.options ? { custom: q.id.includes(':number:') ? '25' : '演示答案' } : {}) })) }) }
  const card = registrations.find(row => row.options.key === 'ask_ui')
  const html = renderToStaticMarkup(React.createElement(card.Component, { t, nativeResults, block: { kind: 'tool-result', call: null, isError: false, meta: { generativeUi: value }, content: [] } }))
  assert.equal((html.match(/<fieldset disabled=""/g) ?? []).length, 5)
  assert.equal((html.match(/checked=""/g) ?? []).length, 4)
  assert.ok(html.includes('外部客户')); assert.ok(html.includes('审批'))
  const file = new URL('./snapshots/settled-choices.html', import.meta.url)
  if (process.env.GENUI_UPDATE_SNAPSHOTS === '1') await writeFile(file, html + '\n')
  assert.equal(await readFile(file, 'utf8'), html + '\n')
})
test('the native question composer renders an unanswered five-type round without preselection', async () => {
  const card = registrations.find(row => row.options.name === 'conversation.composer')
  const html = renderToStaticMarkup(React.createElement(card.Component, { t, matched: { questions: nativeQuestions(round) }, useStore: select => select({ request: '', answers: {} }), actions: {} }))
  assert.equal((html.match(/<fieldset/g) ?? []).length, 5)
  assert.equal((html.match(/type="radio"/g) ?? []).length, 4)
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3)
  assert.ok(html.includes('type="number"')); assert.ok(html.includes('<textarea')); assert.ok(!html.includes(' checked='))
  assert.equal((html.match(/<textarea rows="1"/g) ?? []).length, 3)
  const file = new URL('./snapshots/question-round.html', import.meta.url)
  if (process.env.GENUI_UPDATE_SNAPSHOTS === '1') { await mkdir(new URL('./snapshots/', import.meta.url), { recursive: true }); await writeFile(file, html + '\n') }
  assert.equal(await readFile(file, 'utf8'), html + '\n')
})
test('malformed and failed tool results remain readable instead of becoming interactive cards', () => {
  const card = registrations.find(row => row.options.key === 'present_ui')
  const html = renderToStaticMarkup(React.createElement(card.Component, { t, nativeResults, block: { kind: 'tool-result', call: null, isError: true, meta: {}, content: [{ type: 'text', text: 'Validation rejected the document.' }] } }))
  assert.ok(html.includes('role="alert"')); assert.ok(html.includes('Validation rejected the document.')); assert.ok(!html.includes('gu-document '))
})
test('durable result subscription settles an unchanged in-flight tool row without reloading the conversation', () => {
  const card = registrations.find(row => row.options.key === 'present_ui')
  const block = { name: 'present_ui', callId: 'call-1', argsRaw: '{}', subCalls: [] }
  const values = [{ key: '27', anchorSeq: 27, callId: 'call-1', data: result }]
  const source = { getSnapshot: () => values, subscribe: () => () => {} }
  const html = renderToStaticMarkup(React.createElement(card.Component, { t, block, nativeResults: source }))
  assert.ok(html.includes('gu-manuscript'))
  assert.ok(!html.includes('gu-call-pending'))
  const unrelated = renderToStaticMarkup(React.createElement(card.Component, { t, block: { ...block, callId: 'call-2' }, nativeResults: source }))
  assert.ok(unrelated.includes('gu-call-pending'))
  assert.ok(!unrelated.includes('gu-manuscript'))
})
