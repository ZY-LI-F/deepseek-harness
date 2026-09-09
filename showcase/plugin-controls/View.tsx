/** Settings surface over an injected, authenticated control channel. */
import { useEffect, useState } from 'react'
import type { z } from 'zod'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { snapshotSchema } from './contract.mjs'
import type { Key } from './locales.ts'

export type Snapshot = z.infer<typeof snapshotSchema>
export type Controls = { list: (signal: AbortSignal) => Promise<Snapshot>; change: (id: string, enabled: boolean, revision: string) => Promise<Snapshot>; reload: () => void }
type Props = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'plugin-controls'> & Controls
const phaseKeys = { pending: 'pending', loading: 'loadingPhase', active: 'active', failed: 'failed', disposed: 'disposed', unloading: 'unloading', disabled: 'disabled', missing: 'missing' } satisfies Record<Snapshot['entries'][number]['phase'], Key>

/** Reflect observed state only: a failed or stale mutation cannot optimistically flip a switch. */
export function PluginControls({ list, change, reload, t }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<'saved' | 'restart' | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void list(controller.signal).then(value => { if (!controller.signal.aborted) setSnapshot(value) }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error)) })
    return () => controller.abort()
  }, [list, refresh])
  const toggle = async (id: string, enabled: boolean) => {
    if (busy || !snapshot) return
    setBusy(id); setError(''); setNotice(null)
    try { const result = await change(id, enabled, snapshot.revision); setSnapshot(result); setNotice(result.applied ? 'saved' : 'restart') }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); setRefresh(value => value + 1) }
    finally { setBusy('') }
  }
  const entries = snapshot?.entries.filter(row => `${row.id} ${row.packageName} ${row.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ?? []
  return <section className="pc"><header><span className="pc-eyebrow">{t('tab')}</span><h2>{t('title')}</h2><p>{t('description')}</p></header>
    <div className="pc-toolbar"><input aria-label={t('filter')} placeholder={t('filter')} value={query} onChange={event => setQuery(event.target.value)} /><button disabled={!!busy} onClick={() => { setError(''); setRefresh(value => value + 1) }}>{t('refresh')}</button></div>
    {snapshot ? <p className="pc-meta">{t('profile')}: {snapshot.profile} <span>{snapshot.entries.length} {t('count')}</span></p> : <p role="status">{t('loading')}</p>}
    {error ? <div className="pc-error" role="alert"><strong>{t('error')}</strong><p>{error}</p></div> : null}{notice ? <div className="pc-notice" role="status"><p>{t(notice)}</p>{notice === 'saved' ? <button onClick={reload}>{t('reload')}</button> : null}</div> : null}
    <div className="pc-list">{entries.map(row => <article key={row.id} data-plugin-id={row.id}><div className="pc-icon" aria-hidden="true">{row.id === 'oh-story' ? '文' : row.id === 'generative-ui' ? '◫' : '◈'}</div><div className="pc-copy"><h3>{row.id}<span data-phase={row.phase}>{t(row.enabled ? phaseKeys[row.phase] : 'disabled')}</span></h3><code>{row.packageName}</code>{row.description ? <p>{row.description}</p> : null}{row.protected ? <small>{t('protected')}</small> : null}</div><label className="pc-control"><button type="button" role="switch" aria-label={`${row.enabled ? t('disable') : t('enable')} ${row.id}`} aria-checked={row.enabled} disabled={!!busy || row.protected} onClick={() => { void toggle(row.id, !row.enabled) }}><i /></button><small>{busy === row.id ? t('changing') : t(row.enabled ? 'enabled' : 'disabled')}</small></label></article>)}</div>
    {snapshot && entries.length === 0 ? <p>{t('noRows')}</p> : null}<footer>{t('note')}</footer>
  </section>
}
