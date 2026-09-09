/** Cordis registrations own every native view, question override, stylesheet and locale. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/client'
import type { ComposerChainProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { NativeToolCard, NativeView, TurnResults, type RecordNode } from './View.tsx'
import { createRoundStore, RoundComposer } from './RoundComposer.tsx'
import { resultDefinition, resultView } from './projection.mjs'
import { selectTurnResults, turnResultsDefinition } from './turn-results.mjs'
import { en, zh, type UiKey } from './locales.ts'
import css from './style.css?inline'

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'generative-ui': UiKey } }
declare module '@deepseek-ai/dsh-client-ui-conversation/client' { interface ConversationViewSnapshotMap { 'generative-ui': readonly RecordNode[] } }
declare module '@deepseek-ai/dsh-client-ui-conversation/client' { interface ConversationTurnDataMap { 'generative-ui': import('./turn-results.mjs').TurnResults } }

export const inject = ['slots', 'locale', 'sessions', 'uiConversation']

/** Contribute the result target and reuse the native pending-question response path. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('generative-ui', { zh, en }), 'generative-ui: dictionaries')
  ctx.effect(() => { const tag = document.createElement('style'); tag.textContent = css; document.head.append(tag); return () => tag.remove() }, 'generative-ui: styles')
  ctx.uiConversation.events.register(resultDefinition)
  ctx.uiConversation.events.register(turnResultsDefinition)
  ctx.uiConversation.views.register(resultView)
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail', priority: 10, locale: 'generative-ui', select: selectTurnResults,
  }, TurnResults))
  for (const key of ['present_ui', 'ask_ui']) ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview', key, locale: 'generative-ui',
    inject: (sessionId: SessionId) => {
      const binding = ctx.sessions.binding(sessionId)
      if (!binding) throw new Error('Session is unavailable.')
      return { nativeResults: ctx.uiConversation.binding(binding).target('generative-ui') }
    },
  }, NativeToolCard))
  const t = ctx.locale.bind('generative-ui')
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'generative-ui', order: 5, label: () => t('tab'), locale: 'generative-ui',
    inject: (sessionId: SessionId) => ({
      run: async (prompt: string) => {
        const binding = ctx.sessions.binding(sessionId)
        if (!binding) throw new Error('Session is unavailable.')
        const result = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
        if (!result.ok) throw new Error(result.error.message)
      },
      loadOlder: () => { void ctx.sessions.binding(sessionId)?.session.loadOlder() },
    }),
  }, NativeView))
  const roundStore = createRoundStore()
  ctx.slots.inject('conversation.composer', () => ctx.slots.register({
    name: 'conversation.composer', priority: -10, locale: 'generative-ui', store: roundStore,
    select: ({ pendingInteraction }: ComposerChainProps): PendingQuestion | null =>
      pendingInteraction?.kind === 'question' ? pendingInteraction as PendingQuestion : null,
  }, RoundComposer))
}
