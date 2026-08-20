/** Platform Worlds browser Module: one background, one switcher, and one shared style runtime. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { PlatformWorldBackdrop, type PlatformWorldBackdropInjected } from './PlatformWorldBackdrop.tsx'
import { PlatformWorldSwitcher, type PlatformWorldSwitcherInjected } from './PlatformWorldSwitcher.tsx'
import { PlatformWorldRuntime } from './worlds.ts'
import { en, zh, type PlatformWorldKey } from './locales.ts'

export { PlatformWorldRuntime, PLATFORM_WORLD_STYLES, WORLD_DEFINITIONS } from './worlds.ts'
export type { PlatformWorldSnapshot, PlatformWorldStyle, WorldDefinition } from './worlds.ts'
export type { PlatformWorldKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'platform-worlds': PlatformWorldKey
  }
}

const NS = 'platform-worlds'
export const inject = ['slots', 'sessions', 'locale']

/** Publish one persisted selector model and bind both presentation seats to it. */
export function apply(ctx: ClientContext): void {
  const worlds = new PlatformWorldRuntime()
  ctx.provide('platformWorlds', worlds)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-platform-worlds: dictionaries')

  const injected = (): PlatformWorldBackdropInjected & PlatformWorldSwitcherInjected => ({ worlds })
  ctx.slots.inject('conversation.viewport.background', () => ctx.slots.register({
    name: 'conversation.viewport.background',
    id: 'platform-world',
    order: 10,
    locale: NS,
    inject: injected,
  }, PlatformWorldBackdrop))
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'platform-world-switcher',
    order: 40,
    locale: NS,
    inject: injected,
  }, PlatformWorldSwitcher))
}
