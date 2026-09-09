/** Serializable task results and question rounds; shared by execution and replay. */
import { z } from 'zod'

const text = z.string().min(1).max(4000)
const short = z.string().min(1).max(160)
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).describe('Stable ASCII identifier: 1–64 letters, digits, underscores or hyphens.')
const scalar = z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()])
const tone = z.enum(['neutral', 'success', 'warning', 'danger', 'info'])
const section = { id, title: short, span: z.enum(['half', 'full']).optional(), source: z.string().max(1000).optional() }

/** Closed rendering vocabulary. The model supplies content, never executable markup. */
export const sectionSchema = z.discriminatedUnion('type', [
  z.object({ ...section, type: z.literal('document'), filename: z.string().regex(/^[a-zA-Z0-9_-]{1,80}\.md$/).describe('Safe Markdown filename, for example team-brief.md.'), summary: text.optional(), content: z.array(z.object({ heading: short, paragraphs: z.array(text).min(1).max(8), bullets: z.array(text).max(12).optional() }).strict()).min(1).max(12) }).strict(),
  z.object({ ...section, type: z.literal('metrics'), items: z.array(z.object({ label: short, value: scalar, unit: z.string().max(160).optional(), change: z.string().max(160).optional(), tone: tone.optional() }).strict()).min(1).max(12) }).strict(),
  z.object({ ...section, type: z.literal('chart'), chart: z.enum(['bar', 'line', 'area']), labels: z.array(short).min(1).max(60), series: z.array(z.object({ name: short, values: z.array(z.number().finite()).min(1).max(60) }).strict()).min(1).max(6), unit: short.optional() }).strict(),
  z.object({ ...section, type: z.literal('table'), columns: z.array(z.object({ key: id, label: short }).strict()).min(1).max(12), rows: z.array(z.record(id, scalar)).max(200) }).strict(),
  z.object({ ...section, type: z.literal('progress'), items: z.array(z.object({ label: short, value: z.number().min(0), total: z.number().positive(), status: short.optional(), tone: tone.optional() }).strict()).min(1).max(24) }).strict(),
  z.object({ ...section, type: z.literal('timeline'), items: z.array(z.object({ title: short, detail: text.optional(), time: short.optional(), status: z.enum(['done', 'active', 'pending', 'blocked']) }).strict()).min(1).max(30) }).strict(),
  z.object({ ...section, type: z.literal('callout'), body: text, tone: tone.optional() }).strict(),
  z.object({ ...section, type: z.literal('facts'), items: z.array(z.object({ label: short, value: scalar }).strict()).min(1).max(30) }).strict(),
  z.object({ ...section, type: z.literal('list'), items: z.array(z.object({ title: short, detail: text.optional(), status: short.optional(), tone: tone.optional() }).strict()).min(1).max(40) }).strict(),
  z.object({ ...section, type: z.literal('artifacts'), items: z.array(z.object({ label: short, url: z.string().url().max(2000), description: text.optional() }).strict()).min(1).max(20) }).strict(),
  z.object({ ...section, type: z.literal('weather'), location: short, celsius: z.number().finite(), condition: short, humidity: z.number().min(0).max(100), windKph: z.number().min(0), forecast: z.array(z.object({ label: short, celsius: z.number().finite() }).strict()).max(10) }).strict(),
  z.object({ ...section, type: z.literal('stock'), symbol: short, price: z.number().min(0), currency: short, changePercent: z.number().finite(), history: z.array(z.number().finite()).min(2).max(60) }).strict(),
  z.object({ ...section, type: z.literal('products'), items: z.array(z.object({ id, name: short, description: text.optional(), price: z.number().min(0), currency: short, available: z.boolean(), rating: z.number().min(0).max(5).optional() }).strict()).min(1).max(24) }).strict(),
])

/** Complete result checkpoints allow reload, export and comparison across calls. */
export const documentSchema = z.object({
  id, title: short, description: text.optional(), layout: z.enum(['report', 'dashboard']),
  dataMode: z.enum(['sample', 'provided', 'live']).describe('sample = invented demonstration; provided = user/file data; live = observed tool data. Never invent live values.'),
  sections: z.array(sectionSchema).min(1).max(24),
}).strict().superRefine((doc, ctx) => {
  if (new Set(doc.sections.map(s => s.id)).size !== doc.sections.length) ctx.addIssue({ code: 'custom', message: 'Section ids must be unique.' })
  for (const [index, s] of doc.sections.entries()) {
    if (s.type === 'chart' && (s.series.some(series => series.values.length !== s.labels.length) || new Set(s.series.map(series => series.name)).size !== s.series.length)) ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Series names must be unique and every series must match the labels length.' })
    if (s.type === 'table' && (new Set(s.columns.map(c => c.key)).size !== s.columns.length || s.rows.some(row => Object.keys(row).some(key => !s.columns.some(c => c.key === key))))) ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Table columns must be unique and cover every row key.' })
    if (s.type === 'products' && new Set(s.items.map(item => item.id)).size !== s.items.length) ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Product ids must be unique.' })
    if (s.type === 'progress' && s.items.some(item => item.value > item.total)) ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Progress cannot exceed total.' })
    if (s.type === 'artifacts' && s.items.some(item => !['https:', 'http:'].includes(new URL(item.url).protocol))) ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Artifact links must use HTTP or HTTPS.' })
  }
})

/** A grilling round contains only questions whose prerequisites are already settled. */
export const roundSchema = z.object({
  title: short, round: z.number().int().min(1).max(100), context: text.optional(),
  questions: z.array(z.object({
    id, type: z.enum(['single', 'multi', 'text', 'boolean', 'number']),
    question: text, detail: text.optional(),
    options: z.array(z.object({ label: short, description: text.optional() }).strict()).min(2).max(12).optional(),
    recommended: short.optional(),
  }).strict()).min(1).max(12),
}).strict().superRefine((round, ctx) => {
  if (new Set(round.questions.map(q => q.id)).size !== round.questions.length) ctx.addIssue({ code: 'custom', message: 'Question ids must be unique.' })
  round.questions.forEach((q, index) => {
    if (['single', 'multi'].includes(q.type) && !q.options) ctx.addIssue({ code: 'custom', path: ['questions', index], message: 'Choice questions require options.' })
    if (q.options && !['single', 'multi'].includes(q.type)) ctx.addIssue({ code: 'custom', path: ['questions', index], message: 'Only single/multi questions accept options.' })
    if (q.options && new Set(q.options.map(o => o.label)).size !== q.options.length) ctx.addIssue({ code: 'custom', path: ['questions', index], message: 'Option labels must be unique.' })
    if (q.recommended && q.options && !q.options.some(o => o.label === q.recommended)) ctx.addIssue({ code: 'custom', path: ['questions', index], message: 'The recommendation must be one of the options.' })
  })
})

/** Project the validated vocabulary onto DSH's enforced JSON Schema subset. Bounds remain enforced at execution. */
export function toolSchema(schema) {
  const raw = z.toJSONSchema(schema, { unrepresentable: 'any' })
  const visit = node => {
    const out = {}
    for (const key of ['type', 'const', 'enum', 'description', 'title', 'required']) if (node[key] !== undefined) out[key] = node[key]
    if (typeof node.additionalProperties === 'boolean') out.additionalProperties = node.additionalProperties
    if (node.properties) out.properties = Object.fromEntries(Object.entries(node.properties).map(([key, value]) => [key, visit(value)]))
    if (node.items) out.items = visit(node.items)
    if (node.anyOf || node.oneOf) out.oneOf = (node.oneOf ?? node.anyOf).map(visit)
    return out
  }
  return visit(raw)
}

/** Parse and enforce the whole UTF-8 payload bound before it can enter a tool result. */
export function boundedParse(schema, value, maxBytes) {
  const parsed = schema.parse(value)
  if (new TextEncoder().encode(JSON.stringify(parsed)).length > maxBytes) throw new Error(`Result exceeds ${maxBytes} UTF-8 bytes; split it into smaller documents.`)
  return parsed
}

/** Convert question types into the existing DSH human-question protocol. */
export function nativeQuestions(round) {
  return round.questions.map(q => ({
    id: `genui:${q.type}:${q.id}`, header: `${round.title} · ${round.round}`,
    question: q.question,
    detail: [round.context, q.detail, q.recommended && !q.options ? `推荐 / Recommended: ${q.recommended}` : undefined].filter(Boolean).join('\n\n'),
    ...(q.type === 'boolean' ? { options: [{ label: '是 / Yes' }, { label: '否 / No' }] } : q.options ? { options: q.options.map(o => ({ ...o, label: o.label === q.recommended ? `${o.label} (Recommended)` : o.label })) } : {}),
    multiSelect: q.type === 'multi',
  }))
}

/** Validate the human reply again before returning it to the model. */
export function normalizeAnswers(round, result) {
  const answers = z.object({ answers: z.array(z.object({ id: z.string(), selected: z.array(z.string()), custom: z.string().max(8000).optional() }).strict()) }).strict().parse(result).answers
  if (answers.length !== round.questions.length || new Set(answers.map(a => a.id)).size !== answers.length) throw new Error('Answer every question exactly once.')
  const native = nativeQuestions(round)
  return round.questions.map((q, index) => {
    const answer = answers.find(a => a.id === native[index].id)
    if (!answer || (q.type !== 'multi' && answer.selected.length > 1) || new Set(answer.selected).size !== answer.selected.length) throw new Error('Invalid question answer.')
    if (answer.selected.some(value => !native[index].options?.some(o => o.label === value))) throw new Error('Answer contains an unknown option.')
    const custom = answer.custom?.trim() ?? ''
    if (answer.selected.length === 0 && !custom) throw new Error('Every question requires an answer.')
    if (q.type === 'number' && !Number.isFinite(Number(custom))) throw new Error('Enter a finite number.')
    return { id: q.id, type: q.type, question: q.question, selected: answer.selected, ...(native[index].options ? { options: native[index].options } : {}), ...(custom ? { custom } : {}) }
  })
}
