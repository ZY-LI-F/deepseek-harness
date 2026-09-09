/** Native DSH tools: execution, model calls, human interaction and persistence remain owned by the harness. */
import { z } from 'zod'
import { boundedParse, documentSchema, nativeQuestions, normalizeAnswers, roundSchema, toolSchema } from './schema.mjs'

export const name = 'generative-ui'
export const inject = ['tools', 'userQuestions', 'systemPrompt']
const configSchema = z.object({ maxDocumentBytes: z.number().int().min(4096).max(524288), promptOrder: z.number().finite() }).strict()

/** Mount reversible native tools and task guidance without a separate model or HTTP chat loop. */
export function apply(ctx, raw) {
  const config = configSchema.parse(raw)
  ctx.effect(() => ctx.systemPrompt.section({
    name, order: config.promptOrder,
    text: 'For structured task results, use present_ui with data from the current task. It supports reports, dashboards, metrics, charts, tables, progress, timelines, facts, findings, artifacts, weather, stocks and products. Use dataMode sample only for invented demonstrations; provided for user/file input; live only after observing real tool results. Reuse a document id to publish a complete updated checkpoint. For questions and grilling, use ask_ui: ask one round of independent questions whose prerequisites are settled, include recommendations with tradeoffs, wait for the human answers, then determine the next round. Do not invent answers or execute a plan until the user has actually approved it. A boolean answer is a task decision, not a replacement for execution permission. Human answers become normal tool results. Use ordinary DSH tools to perform authorized work and present_ui to show the resulting evidence.',
  }), 'generative-ui: task guidance')
  ctx.effect(() => ctx.tools.register({
    name: 'present_ui',
    description: 'Present task results inside the conversation as a report or dashboard. A document section has a safe .md filename and content blocks with heading, paragraphs, and optional bullets; it provides a document preview and Markdown download. Supply sections and content as JSON arrays, never JSON-encoded strings. Each section has a unique ASCII id. Charts require unique series names and equal-length labels and values. Reuse document id for an updated checkpoint. State whether data is sample, provided, or live. Prefer plain text inside cells and paragraphs. This presents evidence; it does not run business actions.',
    parameters: toolSchema(documentSchema),
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => ({ generativeUi: value }),
    },
    async execute(args, exec) {
      exec.signal?.throwIfAborted()
      const document = boundedParse(documentSchema, args, config.maxDocumentBytes)
      const value = { version: 1, kind: 'document', document }
      if (new TextEncoder().encode(JSON.stringify(value)).length > config.maxDocumentBytes) throw new Error('Document and metadata exceed the configured size; split the result.')
      return value
    },
    isConcurrencySafe: () => true,
    presentCall: args => ({ card: 'generic', kind: 'read', title: typeof args?.title === 'string' ? args.title : 'Task results' }),
  }), 'generative-ui: result tool')
  ctx.effect(() => ctx.tools.register({
    name: 'ask_ui',
    description: 'Ask a round of task questions and wait for human answers. Pass questions and options as JSON arrays, never JSON-encoded strings. Types: single, multi, text, boolean, number. Choice questions require options. Optional recommended names an offered label. Use grilling rounds: ask only currently answerable decisions, then branch after the answers. Never prefill or invent the user response.',
    parameters: toolSchema(roundSchema),
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => ({ generativeUi: value }),
    },
    async execute(args, exec) {
      const round = boundedParse(roundSchema, args, config.maxDocumentBytes)
      const result = await ctx.userQuestions.ask({ questions: nativeQuestions(round), agent: exec.agent, signal: exec.signal })
      const value = { version: 1, kind: 'answers', title: round.title, round: round.round, answers: normalizeAnswers(round, result) }
      if (new TextEncoder().encode(JSON.stringify(value)).length > config.maxDocumentBytes) throw new Error('Answers exceed the configured document size.')
      return value
    },
    presentCall: args => ({ card: 'generic', kind: 'read', title: typeof args?.title === 'string' ? args.title : 'Task questions' }),
  }), 'generative-ui: question tool')
}
