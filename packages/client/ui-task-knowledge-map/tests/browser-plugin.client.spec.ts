import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import * as TaskMapInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  ctx.provide('sessions', {})
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, locale, fiber }
}

describe('ui-task-knowledge-map browser half', () => {
  it('registers the Session view and dictionaries, then removes them with its fiber', async () => {
    const b = await bench()
    expect(inject).toEqual(['slots', 'sessions', 'locale'])
    const entry = b.ctx.slots.entries('conversation.view')[0]
    expect(entry?.options).toMatchObject({ id: 'task-knowledge-map', order: 30 })
    expect((entry?.options.label as () => string)()).toBe(zh['view.label'])
    expect(b.locale.bind(NS)('view.label')).toBe(zh['view.label'])
    b.locale.setLocale('en')
    expect(b.locale.bind(NS)('view.label')).toBe(en['view.label'])
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('conversation.view')).toHaveLength(0)
    expect(b.locale.bind(NS)('view.label')).not.toBe(en['view.label'])
  })
})

describe('ui-task-knowledge-map package seats', () => {
  it('keeps the Host half inert', () => {
    expect(nodeApply).not.toThrow()
  })

  it('reserves invariant ownership without installing an audit', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(TaskMapInvariant)
    await fiber.await()
    expect(TaskMapInvariant.name).toBe('client-ui-task-knowledge-map-invariant')
    expect(TaskMapInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
