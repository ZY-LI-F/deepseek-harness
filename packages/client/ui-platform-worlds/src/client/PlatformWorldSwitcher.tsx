/** Compact session-header control for selecting the active generated world. */
import { useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  PLATFORM_WORLD_STYLES, WORLD_DEFINITIONS, type PlatformWorldRuntime, type PlatformWorldStyle,
} from './worlds.ts'
import css from './PlatformWorlds.module.css'

const STYLE_LABELS: Record<PlatformWorldStyle,
  'style.cloudHarbor' | 'style.candyGears' | 'style.moonCoral'> = {
  'cloud-harbor': 'style.cloudHarbor',
  'candy-gears': 'style.candyGears',
  'moon-coral': 'style.moonCoral',
}

export interface PlatformWorldSwitcherInjected {
  worlds: PlatformWorldRuntime
}

export type PlatformWorldSwitcherProps = PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'platform-worlds'> & PlatformWorldSwitcherInjected

/** Native select keeps the playful style control discoverable and keyboard friendly. */
export function PlatformWorldSwitcher({ worlds, t }: PlatformWorldSwitcherProps) {
  const snapshot = useSyncExternalStore(worlds.subscribe, worlds.getSnapshot, worlds.getSnapshot)
  const definition = WORLD_DEFINITIONS.find(world => world.style === snapshot.style)
  if (definition === undefined) return null
  return (
    <label className={css.switcher} data-platform-world-switcher="">
      <span className={css.switcherGlyph} aria-hidden>✦</span>
      <select
        className={css.select}
        aria-label={t('label.selector')}
        value={snapshot.style}
        onChange={(event) => { worlds.setStyle(event.currentTarget.value as PlatformWorldStyle) }}
      >
        {PLATFORM_WORLD_STYLES.map(style => (
          <option key={style} value={style}>{t(STYLE_LABELS[style])}</option>
        ))}
      </select>
      <span className={css.depth}>{definition.depth}</span>
    </label>
  )
}
