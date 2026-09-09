/** Session-bound result gallery and native tool cards. */
import { useId, useMemo, useState, useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ResultDocument } from './Cards.tsx'
import { readMetadata, readResult } from './projection.mjs'
import { examples } from './examples.ts'
import type { Translate } from './locales.ts'
import { questionLabel } from './question-label.ts'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'

export type RecordNode = { key: string; anchorSeq: number; callId?: string; data: NonNullable<ReturnType<typeof readResult>> }
export type ViewProps = PropsRuntime<'conversation.view'> & PropsLocale<'generative-ui'> & {
  run: (prompt: string) => Promise<void>; loadOlder: () => void
}

function Answers({ value, t }: { value: Extract<NonNullable<ReturnType<typeof readResult>>, { kind: 'answers' }>; t: Translate }) {
  const uid = useId()
  return <article className="gu-answers"><header><span className="gu-badge">✓ {t('submitted')}</span><h3>{value.title} <small>{t('round')} {String(value.round).padStart(2, '0')}</small></h3></header>{value.answers.map(answer => <fieldset key={answer.id} disabled><legend>{answer.question}<small>{t(answer.type)}</small></legend>{answer.options ? <div className="gu-options">{answer.options.map(option => <label key={option.label} data-selected={answer.selected.includes(option.label)}><input type={answer.type === 'multi' ? 'checkbox' : 'radio'} name={`${uid}-${answer.id}`} checked={answer.selected.includes(option.label)} readOnly /><span><strong>{questionLabel(option.label, t)}</strong>{option.description ? <small>{' '}{option.description}</small> : null}</span></label>)}</div> : answer.selected.length ? <p>{answer.selected.map(label => questionLabel(label, t)).join(' · ')}</p> : null}{answer.custom ? <p className="gu-answer-note">{answer.custom}</p> : null}</fieldset>)}</article>
}

/** Render either a report checkpoint or a settled human-answer batch. */
export function Result({ value, t }: { value: NonNullable<ReturnType<typeof readResult>>; t: Translate }) {
  return value.kind === 'document' ? <ResultDocument document={value.document} t={t} /> : <Answers value={value} t={t} />
}

/** Finalized outcomes stay in the transcript even when Compact mode folds the tool process. */
export function TurnResults({ matched, t }: { matched: readonly import('./turn-results.mjs').TurnResult[] } & PropsLocale<'generative-ui'>) {
  return <div className="gu gu-turn-results" data-generative-ui-turn-results="">{matched.map(result => <div key={result.seq} className="gu-record" data-native-result={result.seq}><Result value={result.data} t={t} /></div>)}</div>
}

/** The registered target is derived from the DSH event window, not browser-owned message history. */
export function NativeView({ useConversation, useSession, t, run, loadOlder }: ViewProps) {
  const records = useConversation(snapshot => snapshot.views.get('generative-ui')) ?? []
  const running = useSession(snapshot => snapshot.running)
  const [latest, setLatest] = useState(true)
  const [example, setExample] = useState<keyof typeof examples>('dashboard')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const selected = useMemo(() => {
    if (!latest) return records
    const seen = new Set<string>()
    return [...records].reverse().filter(node => { const id = node.data.kind === 'document' ? node.data.document.id : node.key; if (seen.has(id)) return false; seen.add(id); return true }).reverse()
  }, [records, latest])
  return <main className="gu gu-page" data-conversation-composer-overlay=""><header className="gu-masthead"><div><span className="gu-eyebrow">GENERATIVE UI</span><h1>{t('title')}</h1><p>{t('subtitle')}</p></div><span className="gu-count">{records.length.toString().padStart(2, '0')}</span></header>
    <div className="gu-example-bar"><label><span>{t('examples')}</span><select value={example} onChange={e => setExample(e.target.value as keyof typeof examples)}>{Object.keys(examples).map(key => <option key={key} value={key}>{t(key as keyof typeof examples)}</option>)}</select></label><button className="gu-primary" disabled={sending || running} onClick={() => { setSending(true); setError(''); void run(examples[example]).catch(error => setError(String(error))).finally(() => setSending(false)) }}>{t('run')} ↗</button></div>
    {error ? <p className="gu-error" role="alert">{error}</p> : null}<div className="gu-view-toolbar"><h2>{t('history')}</h2><label className="gu-check"><input type="checkbox" checked={latest} onChange={e => setLatest(e.target.checked)} />{t('latest')}</label></div>
    {selected.length ? selected.map(node => <div key={node.key} className="gu-record" data-native-result={node.anchorSeq}><Result value={node.data} t={t} /></div>) : <div className="gu-empty"><span>✳</span><h2>{t('empty')}</h2><p>{t('emptyDetail')}</p></div>}
    <footer className="gu-page-footer"><button onClick={loadOlder}>{t('older')}</button><p>{t('plain')}</p></footer>
  </main>
}

type ToolProps = PropsRuntime<'tool.call.toolview'> & PropsLocale<'generative-ui'> & { nativeResults: ObservableSnapshot<readonly RecordNode[] | undefined> }
const raw = (block: ToolCallBlock) => 'kind' in block ? block.content.map(part => part.type === 'text' ? part.text : JSON.stringify(part)).join('\n') : block.argsRaw

/** Native chat cards read only call/result data supplied by DSH's tool slot. */
export function NativeToolCard({ block, t, nativeResults }: ToolProps) {
  const records = useSyncExternalStore(nativeResults.subscribe, nativeResults.getSnapshot, nativeResults.getSnapshot)
  const settled = 'kind' in block
  const value = records?.find(record => record.callId === block.callId)?.data ?? (settled && !block.isError ? readMetadata(block.meta) : null)
  let args: { title?: string; questions?: unknown[] } | undefined
  try { args = JSON.parse(settled ? block.call?.argsRaw ?? '{}' : block.argsRaw) } catch { /* Partial streamed JSON remains the loading state. */ }
  return <div className="gu gu-tool-card">{value ? <Result value={value} t={t} /> : <div className={settled ? 'gu-error' : 'gu-call-pending'} role={settled ? 'alert' : 'status'}><strong>{args?.title ?? t(settled ? 'failed' : 'loading')}</strong><p>{settled ? raw(block) : t(args?.questions ? 'waiting' : 'loading')}</p></div>}<details className="gu-raw"><summary>{t('raw')}</summary><pre>{raw(block)}</pre></details></div>
}
