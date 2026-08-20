import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import * as BuddyInvariant from '../src/invariant.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  ctx.provide('sessions', {})
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, locale, fiber }
}

describe('ui-pocket-buddy browser half', () => {
  it('registers one additive overlay entry and releases it with its fiber', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'sessions', 'locale'])
    expect(b.ctx.slots.entries('shell.overlay').map(entry => entry.options.id)).toContain('pocket-buddy')
    expect(b.locale.bind('pocket-buddy')('panel.title')).toBe('口袋搭子')
    expect(b.ctx.soulAudio.isEnabled()).toBe(false)
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('shell.overlay')).toHaveLength(0)
    expect(b.locale.bind('pocket-buddy')('panel.title')).toBe('panel.title')
  })

  it('waits quietly for a declaration that arrives after the plugin', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    ctx.provide('sessions', {})
    ctx.provide('locale', new LocaleRuntime(ctx))
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(ctx.slots.entries('shell.overlay')).toHaveLength(0)
    ctx.slots.register({
      name: 'root', children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    await Promise.resolve()
    expect(ctx.slots.entries('shell.overlay')).toHaveLength(1)
    await fiber.dispose()
  })
})

describe('ui-pocket-buddy package seats', () => {
  it('keeps the Host half inert', () => {
    expect(nodeApply).not.toThrow()
  })

  it('reserves invariant ownership without installing an audit', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(BuddyInvariant)
    await fiber.await()
    expect(BuddyInvariant.name).toBe('client-ui-pocket-buddy-invariant')
    expect(BuddyInvariant.inject).toEqual(['invariants'])
    await fiber.dispose()
  })
})
