import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import * as GardenInvariant from '../src/invariant.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'conversation.viewport.overlay': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  ctx.provide('sessions', {})
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  ctx.provide('soulAudio', { play: () => false } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, locale, fiber }
}

describe('ui-task-garden browser half', () => {
  it('registers an additive viewport overlay entry and disposes it with its fiber', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'sessions', 'locale', 'soulAudio'])
    const entry = b.ctx.slots.entries('conversation.viewport.overlay')[0]
    expect(entry?.options).toMatchObject({ id: 'task-garden', order: 20 })
    expect(b.locale.bind('task-garden')('label.title')).toBe('鲸鱼女孩的任务花园')
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('conversation.viewport.overlay')).toHaveLength(0)
  })
})

describe('ui-task-garden package seats', () => {
  it('keeps the Host half inert', () => {
    expect(nodeApply).not.toThrow()
  })

  it('reserves invariant ownership', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(GardenInvariant)
    await fiber.await()
    expect(GardenInvariant.name).toBe('client-ui-task-garden-invariant')
    await fiber.dispose()
  })
})
