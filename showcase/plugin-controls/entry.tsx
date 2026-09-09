/** A separately owned settings tab remains available when the Generative UI bundle is off. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { snapshotSchema } from './contract.mjs'
import { PluginControls, type Controls } from './View.tsx'
import { en, zh, type Key } from './locales.ts'
import css from './style.css?inline'

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'plugin-controls': Key } }
export const inject = ['slots', 'locale', 'connection']

/** Register controls through the existing settings slot and Connection transport. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('plugin-controls', { zh, en }), 'plugin-controls: dictionaries')
  ctx.effect(() => { const tag = document.createElement('style'); tag.textContent = css; document.head.append(tag); return () => tag.remove() }, 'plugin-controls: styles')
  const t = ctx.locale.bind('plugin-controls')
  // Connection's Host and Client faces share a service name; its public client API uses this face-specific lookup.
  const connection = ctx.get('connection') as ConnectionHandle
  const call = async (endpoint: string, payload: object, signal?: AbortSignal) => {
    const result = await connection.rpc.call('/plugin-controls', endpoint, payload, signal)
    if (!result.ok) throw new Error(result.error.message)
    return snapshotSchema.parse(result.value)
  }
  const controls: Controls = {
    list: signal => call('list', {}, signal),
    change: (id, enabled, revision) => call('set-enabled', { id, enabled, revision }),
    reload: () => location.reload(),
  }
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab', id: 'manage', order: 0, label: () => t('tab'), locale: 'plugin-controls', inject: () => controls,
  }, PluginControls))
}
