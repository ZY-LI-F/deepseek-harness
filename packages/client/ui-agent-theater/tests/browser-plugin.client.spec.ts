import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import * as TheaterInvariant from '../src/invariant.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'conversation.input.dock': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  ctx.provide('sessions', {})
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  ctx.provide('soulAudio', { play: () => false } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, locale, fiber }
}

describe('ui-agent-theater browser half', () => {
  it('registers an additive input dock entry with localized copy and HMR-safe teardown', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'sessions', 'locale', 'soulAudio'])
    const entry = b.ctx.slots.entries('conversation.input.dock')[0]
    expect(entry?.options).toMatchObject({ id: 'agent-theater', order: 30 })
    expect(b.locale.bind('agent-theater')('label.office')).toBe('鲸鱼女孩装配间')
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('conversation.input.dock')).toHaveLength(0)
  })
})

describe('ui-agent-theater package seats', () => {
  it('keeps the Host half inert', () => {
    expect(nodeApply).not.toThrow()
  })

  it('reserves invariant ownership', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(TheaterInvariant)
    await fiber.await()
    expect(TheaterInvariant.name).toBe('client-ui-agent-theater-invariant')
    await fiber.dispose()
  })
})
