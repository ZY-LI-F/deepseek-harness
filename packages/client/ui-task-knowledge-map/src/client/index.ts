/** Browser plugin contributing one task-and-knowledge map conversation view. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { TaskKnowledgeMapView } from './TaskKnowledgeMapView.tsx'
import { en, NS, zh } from './locales.ts'

/** Required client registries: the conversation slot, standard Session hooks, and locale dictionaries. */
export const inject = ['slots', 'sessions', 'locale']

/** Register the read-only task map after Chat, Trajectory, and third-party canvases. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-task-knowledge-map: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'task-knowledge-map',
    order: 30,
    locale: NS,
    label: () => t('view.label'),
  }, TaskKnowledgeMapView))
}
