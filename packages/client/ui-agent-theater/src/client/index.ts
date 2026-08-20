/** Agent Theater browser Module: one additive, session-scoped input dock entry. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-pocket-buddy/client'
import { AgentTheater, type AgentTheaterInjected } from './AgentTheater.tsx'
import { en, zh, type AgentTheaterKey } from './locales.ts'

export type { AgentScene, AgentTheaterSignal } from './scene.ts'
export type { AgentTheaterKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'agent-theater': AgentTheaterKey
  }
}

const NS = 'agent-theater'
export const inject = ['slots', 'sessions', 'locale', 'soulAudio']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-agent-theater: dictionaries')
  const injected = (): AgentTheaterInjected => ({
    playSound: (cue) => { ctx.soulAudio.play(cue) },
  })
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'agent-theater',
    order: 30,
    locale: NS,
    inject: injected,
  }, AgentTheater))
}
