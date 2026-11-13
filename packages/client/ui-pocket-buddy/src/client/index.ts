/** Pocket Buddy browser Module: one root overlay entry and its dictionaries. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { PocketBuddy, type PocketBuddyInjected } from './PocketBuddy.tsx'
import { SoulAudioRuntime } from './audio.ts'
import { createPocketBuddyStore } from './store.ts'
import { en, zh, type PocketBuddyKey } from './locales.ts'

export type { BuddyMood } from './PocketBuddy.tsx'
export type { PocketBuddyInjected } from './PocketBuddy.tsx'
export { SOUL_AUDIO_RECIPES, SoulAudioRuntime } from './audio.ts'
export type { SoulAudioCue, SoulAudioRecipe } from './audio.ts'
export type { BuddySkin, PocketBuddyState } from './store.ts'
export type { PocketBuddyKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'pocket-buddy': PocketBuddyKey
  }
}

const NS = 'pocket-buddy'

/** Required services for the global standard hooks, locale seat, and overlay contribution. */
export const inject = ['slots', 'sessions', 'locale']

/** Register the persistent companion into the frame-wide additive overlay. */
export function apply(ctx: Context): void {
  const audio = new SoulAudioRuntime()
  ctx.provide('soulAudio', audio)
  ctx.effect(() => () => { void audio.dispose() }, 'ui-pocket-buddy: audio context')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-pocket-buddy: dictionaries')
  const store = createPocketBuddyStore()
  const injected = (): PocketBuddyInjected => ({
    setAudioEnabled: (enabled) => { audio.setEnabled(enabled) },
    playSound: (cue) => { audio.play(cue) },
  })
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'pocket-buddy',
    order: 10,
    store,
    locale: NS,
    inject: injected,
  }, PocketBuddy))
}
