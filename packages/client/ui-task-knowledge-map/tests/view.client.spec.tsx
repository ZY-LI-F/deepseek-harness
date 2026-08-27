// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  createSnapshotStore, type ConversationNode, type ConversationSnapshot,
  type SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import {
  TaskKnowledgeMapView,
  type TaskKnowledgeMapViewProps,
} from '../src/client/TaskKnowledgeMapView.tsx'
import { zh } from '../src/client/locales.ts'
import {
  CHILD_ID, SID, chatNode, location, sessionList, sessionSnapshot, stepLocation, turnLocation,
} from './fixtures.client.ts'

afterEach(cleanup)

const firstStep = stepLocation(1, 1, 'closed', 2, 5)
const currentStep = stepLocation(1, 2, 'open', 6)
const currentTurn = turnLocation(1, 'open', [firstStep, currentStep], 1)

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

function viewSnapshot(): ConversationSnapshot {
  const nodes = [
    { kind: 'user', seq: 2, time: 200, content: text('实现任务路径'), source: { kind: 'user' } },
    {
      kind: 'assistant', seq: 4, time: 400, turn: 1, step: 1,
      blocks: [{ kind: 'reasoning', text: '隐藏分析不得展示' }, { kind: 'text', text: '准备读取文件' }],
    },
    {
      kind: 'tool-result', seq: 7, time: 700, callId: 'read-1',
      call: { name: 'read', argsRaw: '{}' }, callTime: 600, content: text('README 内容'),
      isError: false, callView: null, resultView: null, subCalls: [],
    },
    {
      kind: 'compaction', seq: 8, time: 800, summary: '保留用户目标与测试结果',
      summaryEventSeq: 7, shadowedItemCount: 3, shadowedTokenCount: 100,
    },
  ] as unknown as ConversationNode[]
  const workflow = chatNode('wf-1', 'workflow-run', 6, location(currentTurn, currentStep), {
    name: '并行实现',
    status: 'running',
    phases: [{
      key: 'build',
      phase: '构建',
      members: [{ seq: 6, label: '研究员', childId: CHILD_ID, status: 'running' }],
    }],
  })
  const tool = chatNode('tool-read', 'tool-call', 6, location(currentTurn, currentStep), {
    root: { callId: 'read-1', name: 'read', subCalls: [] },
  })
  return sessionSnapshot({
    nodes,
    chatNodes: [workflow, tool],
    turns: [currentTurn],
    running: true,
    queue: [{
      id: 'queued-1', messageId: 'queued-1', placement: 'context',
      content: text('稍后检查构建'), preview: '稍后检查构建', text: '稍后检查构建',
    }] as never,
  })
}

function mountView(
  snapshot = viewSnapshot(),
  sessions: SessionListState = sessionList({ child: true, childRunning: true }),
) {
  const sessionStore = createSnapshotStore(snapshot)
  const sessionsStore = createSnapshotStore<SessionListState>(
    sessions,
  )
  const props = {
    sessionId: SID,
    useSession: bindSnapshotSelector(sessionStore),
    useSessions: bindSnapshotSelector(sessionsStore),
    t: makeTranslate(zh, commonZh),
  } as unknown as TaskKnowledgeMapViewProps
  const view = render(<TaskKnowledgeMapView {...props} />)
  return { ...view, sessionStore, sessionsStore }
}

describe('TaskKnowledgeMapView', () => {
  it('renders the live path, observable knowledge, provenance, and zoom controls', () => {
    const view = mountView()
    expect(screen.getByRole('heading', { name: '任务路径与知情位置' })).toBeTruthy()
    expect(screen.getByText(/只展示可观测上下文与来源/)).toBeTruthy()
    expect(screen.getByText('1 轮')).toBeTruthy()
    expect(screen.getByText('2 步')).toBeTruthy()
    expect(screen.getByText('实现任务路径')).toBeTruthy()
    expect(screen.getByText('README 内容')).toBeTruthy()
    expect(screen.queryByText('隐藏分析不得展示')).toBeNull()

    const output = screen.getByRole('status')
    expect(output.textContent).toBe('100%')
    fireEvent.click(screen.getByRole('button', { name: '放大任务图' }))
    expect(output.textContent).toBe('115%')
    fireEvent.click(screen.getByRole('button', { name: '缩小任务图' }))
    expect(output.textContent).toBe('100%')
    fireEvent.click(screen.getByRole('button', { name: '重置缩放' }))
    expect(output.textContent).toBe('100%')

    const viewport = view.container.querySelector('[data-task-map-viewport]')
    expect(viewport?.querySelectorAll('path').length).toBeGreaterThan(0)
    expect(view.container.querySelector('[data-node-id="tool:read-1"]')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('changes the knowledge cutoff by selected execution position and can resume following current', () => {
    const view = mountView()
    const historicStep = view.container.querySelector<HTMLButtonElement>('[data-node-id="step:1:1"]')!
    fireEvent.click(historicStep)
    expect(screen.getByText('准备读取文件')).toBeTruthy()
    expect(screen.queryByText('README 内容')).toBeNull()
    expect(screen.queryByText('稍后检查构建')).toBeNull()

    const follow = screen.getByRole('button', { name: /跟随当前/ })
    expect(follow.getAttribute('data-following')).toBe('false')
    fireEvent.click(follow)
    expect(follow.getAttribute('data-following')).toBe('true')
    expect(screen.getByText('README 内容')).toBeTruthy()
  })

  it('states the delegated-context boundary and filters information without inventing child knowledge', () => {
    const view = mountView()
    fireEvent.click(view.container.querySelector<HTMLButtonElement>(`[data-node-id="subagent:${CHILD_ID}"]`)!)
    expect(screen.getByText(/子代理内部上下文未在当前会话中展开/)).toBeTruthy()
    const knowledgeList = view.container.querySelector<HTMLElement>('[data-knowledge-list]')!
    expect(within(knowledgeList).getByText('检查知识来源')).toBeTruthy()
    expect(screen.queryByText('README 内容')).toBeNull()

    const search = screen.getByRole('searchbox', { name: '搜索知情项目' })
    fireEvent.change(search, { target: { value: '不存在的来源' } })
    expect(screen.getByText('这个位置还没有可展示的信息来源。')).toBeTruthy()
    fireEvent.change(search, { target: { value: '检查' } })
    expect(within(knowledgeList).getByText('检查知识来源')).toBeTruthy()
  })

  it('falls back from a stale selected branch after the live Session catalog changes', () => {
    const view = mountView()
    fireEvent.click(view.container.querySelector<HTMLButtonElement>(`[data-node-id="subagent:${CHILD_ID}"]`)!)
    act(() => {
      view.sessionsStore.set(sessionList())
      view.sessionStore.set(sessionSnapshot({ running: false }))
    })
    const root = view.container.querySelector<HTMLButtonElement>(`[data-node-id="agent:${SID}"]`)!
    expect(root.getAttribute('aria-pressed')).toBe('true')
    expect(within(view.container).getByText('已完成')).toBeTruthy()
  })

  it('renders bounded-history notices, empty evidence, and ungrouped workflow phases', () => {
    const turn = turnLocation(9, 'closed', [], 20, 999)
    const tools = Array.from({ length: 70 }, (_, index) => chatNode(
      `tool-${index}`,
      'tool-call',
      20 + index,
      location(turn),
      { root: { callId: `bounded-${index}`, name: `bounded-${index}`, subCalls: [] } },
    ))
    const workflow = chatNode('ungrouped', 'workflow-run', 19, { kind: 'session' }, {
      name: 'No phase label', status: 'completed',
      phases: [{ key: 'none', phase: null, members: [{ childId: 'finished', status: 'completed' }] }],
    })
    const nodes = [
      ...Array.from({ length: 180 }, (_, index) => ({
        kind: 'user', seq: index + 1, time: index,
        content: text(`requirement ${index}`), source: { kind: 'user' },
      })),
      { kind: 'turn-max-tokens', seq: 181, time: 181, turn: 9, step: 1 },
    ] as unknown as ConversationNode[]
    mountView(
      sessionSnapshot({ nodes, chatNodes: [workflow, ...tools], turns: [turn] }),
      sessionList(),
    )

    expect(screen.getByText('未分组')).toBeTruthy()
    expect(screen.getByText('已折叠 14 个较早工具节点')).toBeTruthy()
    expect(screen.getByText('为保持界面流畅，省略了 21 条较早信息。')).toBeTruthy()
    expect(screen.getByText('已记录来源，但没有可预览的文本。')).toBeTruthy()
  })
})
