/** Task Garden browser Module: session-scoped state with page-fixed artwork. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-pocket-buddy/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import { TaskGarden, type TaskGardenInjected } from './TaskGarden.tsx'
import { en, zh, type TaskGardenKey } from './locales.ts'

export type { GardenGrowth, GardenStage } from './growth.ts'
export type { TaskGardenKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'task-garden': TaskGardenKey
  }
}

const NS = 'task-garden'
export const inject = ['slots', 'sessions', 'locale', 'soulAudio']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-task-garden: dictionaries')
  const injected = (): TaskGardenInjected => ({
    playSound: (cue) => { ctx.soulAudio.play(cue) },
  })
  ctx.slots.inject('conversation.viewport.overlay', () => ctx.slots.register({
    name: 'conversation.viewport.overlay',
    id: 'task-garden',
    order: 20,
    locale: NS,
    inject: injected,
  }, TaskGarden))
}
