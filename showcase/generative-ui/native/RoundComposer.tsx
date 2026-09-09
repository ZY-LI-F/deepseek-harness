/** One complete question frontier over DSH's pending human-interaction carrier. */
import { useState } from 'react'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/client'
import type { UiKey } from './locales.ts'
import { questionLabel, recommendationSuffix as suffix } from './question-label.ts'

type Draft = { selected: string[]; custom: string }
type State = { request: string; answers: Record<string, Draft> }

/** Persist only human drafts; submitted answers are owned by native tool results. */
export function createRoundStore() {
  return defineStore({
    persist: 'dsh.generative-ui.drafts',
    init: (): State => ({ request: '', answers: {} }),
    actions: {
      answer(state: State, request: string, id: string, draft: Draft) {
        if (state.request !== request) { state.request = request; state.answers = {} }
        state.answers[id] = draft
      },
      clear(state: State) { state.request = ''; state.answers = {} },
    },
  })
}

type Props = PropsRuntime<'conversation.composer'> & PropsLocale<'generative-ui'> & PropsStore<ReturnType<typeof createRoundStore>> & { matched: PendingQuestion }

/** Present all currently answerable questions together and settle one native response. */
export function RoundComposer({ matched: pending, useStore, actions, t }: Props) {
  const request = JSON.stringify(pending.questions)
  const saved = useStore(state => state.request === request ? state.answers : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [minimized, setMinimized] = useState(false)
  const draftOf = (id: string): Draft => saved?.[id] ?? { selected: [], custom: '' }
  const typeOf = (q: PendingQuestion['questions'][number]): UiKey => {
    const type = q.id.startsWith('genui:') ? q.id.split(':')[1] : undefined
    return type === 'single' || type === 'multi' || type === 'text' || type === 'boolean' || type === 'number' ? type : q.multiSelect ? 'multi' : q.options?.length ? 'single' : 'text'
  }
  const answered = (q: PendingQuestion['questions'][number]) => {
    const draft = draftOf(q.id)
    return typeOf(q) === 'number' ? draft.custom.trim() !== '' && Number.isFinite(Number(draft.custom)) : draft.selected.length > 0 || draft.custom.trim() !== ''
  }
  const count = pending.questions.filter(answered).length
  const submit = async () => {
    if (busy) return
    if (count !== pending.questions.length) { setError(t('required')); return }
    setBusy(true); setError('')
    try {
      await pending.answer({ answers: pending.questions.map(q => { const draft = draftOf(q.id); return { id: q.id, selected: draft.selected, ...(draft.custom.trim() ? { custom: draft.custom.trim() } : {}) } }) })
      actions.clear()
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); setBusy(false) }
  }
  return <section className="gu gu-round" aria-label={pending.questions[0]?.header ?? t('answers')}>
    <header><div><span className="gu-eyebrow">{t('round')}</span><h3>{pending.questions[0]?.header ?? t('answers')}</h3></div><span>{t('answered')} {count} / {pending.questions.length}</span><button aria-expanded={!minimized} onClick={() => setMinimized(!minimized)}>{minimized ? '⌄' : '⌃'}</button></header>
    {!minimized ? <form onSubmit={e => { e.preventDefault(); void submit() }}>
      <div className="gu-round-body">{pending.questions.map((q, index) => {
        const draft = draftOf(q.id), type = typeOf(q)
        const update = (value: Draft) => { actions.answer(request, q.id, value); setError('') }
        return <fieldset key={q.id} disabled={busy}><legend><span>{String(index + 1).padStart(2, '0')}</span>{q.question}<small>{t(type)}</small></legend>{q.detail ? <p className="gu-question-detail">{q.detail}</p> : null}
          {q.options?.length ? <div className="gu-options">{q.options.map(option => <label key={option.label} data-selected={draft.selected.includes(option.label)}><input type={q.multiSelect ? 'checkbox' : 'radio'} name={q.id} value={option.label} checked={draft.selected.includes(option.label)} onChange={() => update({ ...draft, selected: q.multiSelect ? draft.selected.includes(option.label) ? draft.selected.filter(v => v !== option.label) : [...draft.selected, option.label] : [option.label] })} /><span><strong>{questionLabel(option.label, t)}</strong>{suffix.test(option.label) ? <em>{t('recommendation')}</em> : null}{option.description ? <small>{' '}{option.description}</small> : null}</span></label>)}</div> : null}
          <label className="gu-answer-input"><span>{t(type === 'number' ? 'number' : 'detail')}</span>{type === 'number' ? <input type="number" step="any" value={draft.custom} onChange={e => update({ ...draft, custom: e.target.value })} /> : <textarea rows={q.options?.length ? 1 : 3} maxLength={8000} value={draft.custom} onChange={e => update({ ...draft, custom: e.target.value })} />}</label>
        </fieldset>
      })}</div>
      {error ? <p className="gu-error" role="alert">{error}</p> : null}<footer><button type="button" disabled={busy} onClick={() => { setBusy(true); void pending.cancel().then(() => actions.clear()).catch(error => { setError(String(error)); setBusy(false) }) }}>{t('cancel')}</button><button className="gu-primary" type="submit" disabled={busy}>{t(busy ? 'working' : 'submit')} →</button></footer>
    </form> : null}
  </section>
}
