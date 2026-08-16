import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import * as WorldsInvariant from '../src/invariant.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.viewport.background': { kind: 'list', scope: 'session' },
      'conversation.session.header.actions': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('sessions', {})
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, locale, fiber }
}

describe('ui-platform-worlds browser half', () => {
  it('registers one backdrop and one switcher over a shared runtime', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'sessions', 'locale'])
    expect(b.ctx.slots.entries('conversation.viewport.background')[0]?.options).toMatchObject({
      id: 'platform-world', order: 10,
    })
    expect(b.ctx.slots.entries('conversation.session.header.actions')[0]?.options).toMatchObject({
      id: 'platform-world-switcher', order: 40,
    })
    expect(b.ctx.platformWorlds.getSnapshot().style).toBe('cloud-harbor')
    expect(b.locale.bind('platform-worlds')('style.cloudHarbor')).toBe('云港跳岛')
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('conversation.viewport.background')).toHaveLength(0)
    expect(b.ctx.slots.entries('conversation.session.header.actions')).toHaveLength(0)
  })
})

describe('ui-platform-worlds package seats', () => {
  it('keeps the Host half inert', () => {
    expect(nodeApply).not.toThrow()
  })

  it('reserves invariant ownership', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(WorldsInvariant)
    await fiber.await()
    expect(WorldsInvariant.name).toBe('client-ui-platform-worlds-invariant')
    await fiber.dispose()
  })
})
