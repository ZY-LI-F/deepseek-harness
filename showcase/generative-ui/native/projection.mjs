/** Target-owned projection of self-contained native tool settlements. */
import { z } from 'zod'
import { documentSchema } from './schema.mjs'

const answerResult = z.object({ version: z.literal(1), kind: z.literal('answers'), title: z.string(), round: z.number(), answers: z.array(z.object({ id: z.string(), type: z.enum(['single', 'multi', 'text', 'boolean', 'number']), question: z.string(), selected: z.array(z.string()), options: z.array(z.object({ label: z.string(), description: z.string().optional() })).optional(), custom: z.string().optional() })) })
const resultSchema = z.discriminatedUnion('kind', [z.object({ version: z.literal(1), kind: z.literal('document'), document: documentSchema }), answerResult])
const metadataSchema = z.object({ generativeUi: resultSchema })

/** Parse durable tool metadata without assuming a metadata producer. */
export function readMetadata(value) {
  const parsed = metadataSchema.safeParse(value)
  return parsed.success ? parsed.data.generativeUi : null
}

/** Reject unrelated or malformed metadata, preserving the generic tool fallback. */
export function readResult(value) {
  const parsed = resultSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** Each result is a complete checkpoint, including when the original call is outside the history window.
 * @type {import('@deepseek-ai/dsh-client-ui-conversation/client').ConversationNodeDefinition<ReturnType<typeof readResult>>}
 */
export const resultDefinition = {
  kind: 'generative-ui-result', target: 'generative-ui',
  match(event) {
    return event.type === 'tool/result' && event.data.meta?.generativeUi?.version === 1
      ? { id: String(event.seq), role: 'start' } : null
  },
  start(_context, match) {
    const result = match.event.data.message?.content?.[0]
    return result?.isError ? null : readResult(match.event.data.meta?.generativeUi)
  },
  update(context) { return context.state },
  buildViewNode(context) {
    if (!context.state || !context.start) return null
    return { key: context.key, kind: 'generative-ui-result', id: context.id, target: 'generative-ui', anchorSeq: context.start.event.seq, callId: context.start.event.data.message?.content?.[0]?.toolCallId, location: context.start.location, visibility: 'visible', data: context.state }
  },
}

/** Keep native record identity and order; the view may select a document's latest checkpoint.
 * @type {import('@deepseek-ai/dsh-client-ui-conversation/client').ConversationViewDefinition<import('@deepseek-ai/dsh-client-ui-conversation/client').ConversationViewNode, readonly import('./View.tsx').RecordNode[]>}
 */
export const resultView = {
  target: 'generative-ui',
  create() {
    const nodes = new Map()
    const snapshot = () => [...nodes.values()].sort((a, b) => a.anchorSeq - b.anchorSeq)
    return {
      empty: [],
      replace({ nodes: input }) { nodes.clear(); for (const node of input) nodes.set(node.key, node); return snapshot() },
      apply({ upserts }) { for (const node of upserts) nodes.set(node.key, node); return snapshot() },
    }
  },
  isActive: nodes => nodes.length > 0,
}
