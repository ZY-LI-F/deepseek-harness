/** Completed-turn outcomes use the public tail slot, independently of folded tool details. */
import { readMetadata } from './projection.mjs'

/** @typedef {{ seq: number, data: NonNullable<ReturnType<typeof readMetadata>> }} TurnResult */
/** @typedef {{ turn: number, results: readonly TurnResult[] }} TurnResults */

/** Accumulate successful native outcomes only within the engine-owned turn.
 * @type {import('@deepseek-ai/dsh-client-ui-conversation/client').ConversationNodeDefinition<TurnResults>}
 */
export const turnResultsDefinition = {
  kind: 'generative-ui',
  match(event) {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    return event.type === 'tool/result' && event.data.meta?.generativeUi?.version === 1
      ? { id: String(event.data.turn), role: 'update' } : null
  },
  start(_context, match) { return { turn: match.event.data.turn, results: [] } },
  update(context, match) {
    const event = match.event
    if (event.type !== 'tool/result' || event.data.message?.content?.[0]?.isError) return context.state
    const data = readMetadata(event.data.meta)
    return data ? { ...context.state, results: [...context.state.results, { seq: event.seq, data }] } : context.state
  },
  buildLocationData(context, scope, previous) {
    if (scope !== 'turn' || !context.state || !context.state.results.length) return null
    if (previous?.kind === 'turn' && previous.key === 'generative-ui' && previous.value === context.state) return previous
    return { kind: 'turn', turn: context.state.turn, key: 'generative-ui', value: context.state }
  },
}

/** Decline unrelated turns and retain the latest checkpoint per document at this closing boundary.
 * @param {import('@deepseek-ai/dsh-client-ui-chat/client').TurnTailOwnerProps} owner
 * @returns {readonly TurnResult[] | null}
 */
export function selectTurnResults(owner) {
  if (owner.turn.status !== 'closed') return null
  const results = owner.turn.data.get('generative-ui')?.results ?? []
  const seen = new Set()
  const selected = results.filter(result => result.seq <= owner.seq).toReversed().filter(result => {
    if (result.data.kind !== 'document') return true
    if (seen.has(result.data.document.id)) return false
    seen.add(result.data.document.id)
    return true
  }).reverse()
  return selected.length ? selected : null
}
