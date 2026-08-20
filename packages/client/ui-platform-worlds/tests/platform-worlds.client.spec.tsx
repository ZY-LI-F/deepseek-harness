// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createSnapshotStore, type SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { conversationSnapshot, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import {
  PlatformWorldBackdrop, type PlatformWorldBackdropProps,
} from '../src/client/PlatformWorldBackdrop.tsx'
import {
  PlatformWorldSwitcher, type PlatformWorldSwitcherProps,
} from '../src/client/PlatformWorldSwitcher.tsx'
import { zh } from '../src/client/locales.ts'
import {
  PLATFORM_WORLD_STYLES, WORLD_DEFINITIONS, PlatformWorldRuntime,
} from '../src/client/worlds.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const sid = 'platform-world' as SessionId

function mount(running = false) {
  const session = createSnapshotStore({ ...conversationSnapshot(sid), running })
  const worlds = new PlatformWorldRuntime(localStorage)
  const shared = {
    sessionId: sid,
    useSession: bindSnapshotSelector(session),
    useProjection: () => undefined,
    worlds,
    t: makeTranslate(zh),
  }
  const backdrop = shared as unknown as PlatformWorldBackdropProps
  const switcher = shared as unknown as PlatformWorldSwitcherProps
  const view = render(
    <>
      <PlatformWorldBackdrop {...backdrop} />
      <PlatformWorldSwitcher {...switcher} />
    </>,
  )
  return { session, worlds, view }
}

describe('platform world model', () => {
  it('ships exactly three original 2.5D/3D side-scrolling scene families', () => {
    expect(PLATFORM_WORLD_STYLES).toEqual(['cloud-harbor', 'candy-gears', 'moon-coral'])
    expect(WORLD_DEFINITIONS.map(world => world.depth)).toEqual(['2.5D', '3D', '2.5D'])
    expect(new Set(WORLD_DEFINITIONS.map(world => world.collectible)).size).toBe(3)
  })

  it('persists a valid style and rejects unknown persisted values', () => {
    const worlds = new PlatformWorldRuntime(localStorage)
    expect(worlds.getSnapshot().style).toBe('cloud-harbor')
    worlds.setStyle('moon-coral')
    expect(localStorage.getItem('dsh.ui-platform-worlds.style')).toBe('moon-coral')

    localStorage.setItem('dsh.ui-platform-worlds.style', 'copied-franchise-world')
    expect(new PlatformWorldRuntime(localStorage).getSnapshot().style).toBe('cloud-harbor')
  })
})

describe('Platform Worlds presentation', () => {
  it('switches the real backdrop from one accessible plugin control', () => {
    const b = mount()
    const root = b.view.container.querySelector('[data-platform-world]')
    expect(root?.getAttribute('data-style')).toBe('cloud-harbor')
    expect(root?.querySelector('[data-world-art="cloud-harbor"]')).toBeTruthy()

    fireEvent.change(screen.getByRole('combobox', { name: '场景风格' }), {
      target: { value: 'candy-gears' },
    })
    expect(root?.getAttribute('data-style')).toBe('candy-gears')
    expect(root?.querySelector('[data-world-art="candy-gears"]')).toBeTruthy()

    fireEvent.change(screen.getByRole('combobox', { name: '场景风格' }), {
      target: { value: 'moon-coral' },
    })
    expect(root?.getAttribute('data-style')).toBe('moon-coral')
    expect(root?.textContent).toContain('月光珊瑚湾')
  })

  it('turns on runner motion only while a Session is working', () => {
    const b = mount(true)
    expect(b.view.container.querySelector('[data-platform-world]')?.getAttribute('data-running')).toBe('true')
    expect(b.view.container.querySelector('[data-world-runner]')).toBeTruthy()
  })
})
