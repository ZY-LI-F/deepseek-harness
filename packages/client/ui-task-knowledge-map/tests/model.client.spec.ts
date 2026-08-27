import { describe, expect, it } from 'vitest'
import type { ConversationNode } from '@deepseek-ai/dsh-client-runtime/client'
import {
  buildTaskKnowledgeMap,
  layoutTaskKnowledgeMap,
  TASK_MAP_NODE_HEIGHT,
  TASK_MAP_NODE_WIDTH,
} from '../src/client/model.ts'
import {
  CHILD_ID, SID, chatNode, location, sessionList, sessionSnapshot, stepLocation, turnLocation,
} from './fixtures.client.ts'

const stepOne = stepLocation(1, 1, 'closed', 2, 5)
const stepTwo = stepLocation(1, 2, 'open', 6)
const turnOne = turnLocation(1, 'open', [stepOne, stepTwo], 1)

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

const knowledgeNodes = [
  { kind: 'user', seq: 2, time: 200, content: text('实现任务路径'), source: { kind: 'user' } },
  {
    kind: 'context', seq: 3, time: 300, content: text('过去成功使用 pnpm test'),
    source: { kind: 'session-reference' }, provenance: { role: 'recall', label: 'MemOS' }, form: 'recall',
  },
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
    summaryEventSeq: 7, shadowedItemCount: 4, shadowedTokenCount: 120,
  },
] as unknown as ConversationNode[]

function taskMap() {
  const workflow = chatNode('wf-1', 'workflow-run', 6, location(turnOne, stepTwo), {
    name: '并行实现',
    status: 'running',
    phases: [{
      key: 'build',
      phase: '构建',
      members: [{ seq: 6, label: '研究员', childId: CHILD_ID, status: 'running' }],
    }],
  })
  const tool = chatNode('tool-read', 'tool-call', 6, location(turnOne, stepTwo), {
    root: {
      callId: 'read-1', name: 'read', subCalls: [{
        kind: 'tool-result', seq: 7, callId: 'grep-1',
        call: { name: 'grep', argsRaw: '{}' }, isError: false, subCalls: [],
      }],
    },
  })
  return buildTaskKnowledgeMap({
    sessionId: SID,
    session: sessionSnapshot({
      nodes: knowledgeNodes,
      chatNodes: [workflow, tool],
      turns: [turnOne],
      running: true,
      queue: [{
        id: 'queued-1', messageId: 'queued-1', placement: 'context',
        content: text('稍后检查构建'), preview: '稍后检查构建', text: '稍后检查构建',
      }] as never,
    }),
    sessions: sessionList({ child: true, childRunning: true }),
  })
}

describe('task knowledge projection', () => {
  it('projects the current Turn/Step, workflow branch, subagent, and nested tools', () => {
    const map = taskMap()
    expect(map.nodes.map(node => node.id)).toEqual(expect.arrayContaining([
      `agent:${SID}`, 'turn:1', 'step:1:1', 'step:1:2', 'workflow:wf-1',
      'phase:wf-1:build', `subagent:${CHILD_ID}`, 'tool:read-1', 'tool:grep-1',
    ]))
    expect(map.currentNodeId).toBe('tool:read-1')
    expect(map.currentPathNodeIds).toEqual([
      `agent:${SID}`, 'turn:1', 'step:1:2', 'tool:read-1',
    ])
    expect(map.activePathEdgeIds).toContain('edge:step:1:2:tool:read-1')
    expect(map.stats).toMatchObject({ turns: 1, steps: 2, tools: 2, agents: 2, workflows: 1 })
  })

  it('marks pre-checkpoint knowledge compacted without exposing reasoning blocks', () => {
    const map = taskMap()
    const requirement = map.knowledge.find(item => item.kind === 'requirement')
    const memory = map.knowledge.find(item => item.kind === 'memory')
    const conclusion = map.knowledge.find(item => item.kind === 'conclusion')
    const pending = map.knowledge.find(item => item.kind === 'pending')
    expect(requirement?.state).toBe('compacted')
    expect(memory).toMatchObject({ state: 'compacted', label: 'MemOS' })
    expect(conclusion?.text).toBe('准备读取文件')
    expect(map.knowledge.some(item => item.text.includes('隐藏分析'))).toBe(false)
    expect(pending).toMatchObject({ state: 'pending', text: '稍后检查构建' })
    expect(map.knowledge.find(item => item.ownerNodeId === `subagent:${CHILD_ID}`))
      .toMatchObject({ kind: 'delegation', text: '检查知识来源' })
  })

  it('lays out every node in a stable left-to-right tree', () => {
    const map = taskMap()
    const first = layoutTaskKnowledgeMap(map)
    const second = layoutTaskKnowledgeMap(map)
    expect(second).toEqual(first)
    expect(Object.keys(first.positions)).toHaveLength(map.nodes.length)
    expect(first.positions['turn:1']!.x).toBeGreaterThan(first.positions[`agent:${SID}`]!.x)
    expect(first.positions['step:1:2']!.x).toBeGreaterThan(first.positions['turn:1']!.x)
    expect(first.width).toBeGreaterThan(TASK_MAP_NODE_WIDTH)
    expect(first.height).toBeGreaterThan(TASK_MAP_NODE_HEIGHT)
  })

  it('falls back to running-call and root positions when assembled Chat nodes are absent', () => {
    const running = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({
        running: true,
        runningCalls: [{
          callId: 'live', name: 'bash', argsRaw: '{}', turn: 9, step: 3,
          time: 1, callView: null, subCalls: [],
        }],
      }),
      sessions: sessionList(),
    })
    expect(running.currentNodeId).toBe('tool:live')
    expect(running.edges).toContainEqual(expect.objectContaining({ from: `agent:${SID}`, to: 'tool:live' }))

    const idle = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({ removed: true }),
      sessions: { ...sessionList(), byId: {} },
    })
    expect(idle.currentNodeId).toBe(`agent:${SID}`)
    expect(idle.nodes[0]).toMatchObject({ label: SID, status: 'waiting' })
  })

  it('projects failures and malformed extension rows without guessing missing data', () => {
    const closedStep = stepLocation(2, 1, 'closed', 11, 12)
    const closedTurn = turnLocation(2, 'closed', [closedStep], 10, 15)
    const nodes = [
      { kind: 'turn-error', seq: 13, time: 1, turn: 2, step: 1, message: 'provider failed', code: 'FAIL' },
      { kind: 'turn-max-tokens', seq: 14, time: 1, turn: 2, step: 1 },
      { kind: 'unknown', seq: 15, time: 1, type: 'plugin/foreign', data: {} },
    ] as unknown as ConversationNode[]
    const malformedTool = chatNode('bad-tool', 'tool-call', 11, { kind: 'unresolved' }, { root: null })
    const malformedWorkflow = chatNode('bad-workflow', 'workflow-run', 11, { kind: 'session' }, { phases: 'nope' })
    const map = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({
        nodes,
        chatNodes: [malformedTool, malformedWorkflow],
        turns: [closedTurn],
        lastAgentError: 'root failed',
      }),
      sessions: sessionList({ child: true, childWaiting: true }),
    })
    expect(map.nodes.find(node => node.id === `agent:${SID}`)?.status).toBe('failed')
    expect(map.nodes.find(node => node.id === 'turn:2')?.status).toBe('failed')
    expect(map.nodes.find(node => node.id === 'step:2:1')?.status).toBe('failed')
    expect(map.nodes.some(node => node.id === 'tool:bad-tool')).toBe(false)
    expect(map.knowledge.filter(item => item.kind === 'issue')).toHaveLength(3)
    expect(map.nodes.find(node => node.id === `subagent:${CHILD_ID}`)?.status).toBe('waiting')
  })

  it('bounds older tool and knowledge rows while retaining initial requirements', () => {
    const turn = turnLocation(3, 'closed', [], 20, 999)
    const chatNodes = Array.from({ length: 70 }, (_, index) => chatNode(
      `tool-${index}`,
      'tool-call',
      20 + index,
      location(turn),
      { root: { callId: `c-${index}`, name: `tool-${index}`, subCalls: [] } },
    ))
    const nodes = Array.from({ length: 180 }, (_, index) => ({
      kind: 'user', seq: index + 1, time: index, content: text(`requirement ${index}`), source: { kind: 'user' },
    })) as unknown as ConversationNode[]
    const map = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({
        nodes,
        chatNodes,
        turns: [turn],
        runningCalls: [{
          callId: 'over-cap', name: 'late-running', argsRaw: '{}', turn: 3, step: 1,
          time: 1, callView: null, subCalls: [],
        }],
        queue: [{
          id: 'bounded-pending', messageId: 'bounded-pending', placement: 'context',
          content: text('bounded pending'), preview: 'bounded pending', text: 'bounded pending',
        }] as never,
      }),
      sessions: sessionList({ child: true }),
    })
    expect(map.stats.tools).toBe(56)
    expect(map.stats.truncatedTools).toBe(14)
    expect(map.nodes.some(node => node.id === 'tool:c-0')).toBe(false)
    expect(map.nodes.some(node => node.id === 'tool:c-69')).toBe(true)
    expect(map.stats.knowledge).toBe(160)
    expect(map.stats.truncatedKnowledge).toBe(22)
    expect(map.knowledge.some(item => item.text === 'requirement 0')).toBe(true)
    expect(map.knowledge.some(item => item.text === 'requirement 179')).toBe(true)
  })

  it('normalizes every observable event class and keeps malformed content blocks inert', () => {
    const longText = `  ${'evidence '.repeat(40)}  `
    const nodes = [
      {
        kind: 'steering', seq: 1, time: 1,
        content: [null, { type: 'text' }, { type: 'text', text: longText }, { kind: 'image', text: 'ignored' }],
        source: { kind: 'user' },
      },
      {
        kind: 'context', seq: 2, time: 2, content: text('plain injected context'),
        source: { kind: 'system' }, provenance: { role: 'system' },
      },
      {
        kind: 'assistant', seq: 3, time: 3, turn: 1, step: 1,
        blocks: [null, { kind: 'reasoning', text: 'private' }],
      },
      {
        kind: 'tool-result', seq: 4, time: 4, callId: 'memos-recall', call: null,
        callTime: 3, content: text('recalled fact'), isError: true,
        error: { code: 'MEMORY_ERROR', message: 'failed' }, callView: null, resultView: null, subCalls: [],
      },
      {
        kind: 'command', seq: 5, time: 5, commandId: 9, name: undefined,
        outcome: { kind: 'error', text: longText },
      },
      { kind: 'command', seq: 6, time: 6, commandId: 10, outcome: null },
      {
        kind: 'compaction', seq: 7, time: 7, summary: undefined,
        summaryEventSeq: undefined, shadowedItemCount: 2, shadowedTokenCount: 4,
      },
      {
        kind: 'model-retry', seq: 8, time: 8, provider: 'deepseek',
        failure: { code: 'RATE_LIMIT', message: 'retry later' },
      },
      { kind: 'turn-error', seq: 9, time: 9, turn: 4, step: 1, message: 'failed without code' },
      { kind: 'turn-max-tokens', seq: 10, time: 10, turn: 5, step: 1 },
      { kind: 'unknown', seq: 11, time: 11, type: 'foreign/event', data: {} },
    ] as unknown as ConversationNode[]
    const map = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({
        nodes,
        queue: [{
          id: 'q-fallback', messageId: 'q-fallback', placement: 'follow-up', preview: '',
          content: [null, { type: 'text', text: 'queue block fallback' }], text: '',
        }] as never,
      }),
      sessions: sessionList(),
    })

    expect(map.knowledge.find(item => item.id === 'knowledge:steering:1')?.text)
      .toMatch(/^evidence .+…$/)
    expect(map.knowledge.find(item => item.id === 'knowledge:context:2')).toMatchObject({
      kind: 'context', label: 'system', source: 'system', state: 'compacted',
    })
    expect(map.knowledge.some(item => item.id === 'knowledge:assistant:3')).toBe(false)
    expect(map.knowledge.find(item => item.id === 'knowledge:tool-result:4')).toMatchObject({
      kind: 'memory', state: 'compacted', label: 'memos-recall', source: 'MEMORY_ERROR',
    })
    expect(map.knowledge.find(item => item.id === 'knowledge:command:5')).toMatchObject({
      state: 'compacted', label: '/command', source: '9',
    })
    expect(map.knowledge.find(item => item.id === 'knowledge:command:6')).toMatchObject({
      state: 'compacted', text: '',
    })
    expect(map.knowledge.find(item => item.id === 'knowledge:compaction:7')).toMatchObject({
      text: '', source: '#7', state: 'available',
    })
    expect(map.knowledge.find(item => item.id === 'knowledge:model-retry:8')).toMatchObject({
      label: 'deepseek', source: 'RATE_LIMIT', state: 'error',
    })
    expect(map.knowledge.find(item => item.id === 'knowledge:turn-error:9')?.source).toBe('turn-error')
    expect(map.knowledge.find(item => item.id === 'knowledge:pending:q-fallback')?.text)
      .toBe('queue block fallback')
  })

  it('accepts forward-compatible workflow rows while preserving status and delegation boundaries', () => {
    const workflowRows = [
      chatNode('not-record', 'workflow-run', 1, { kind: 'session' }, null),
      chatNode('bad-phases', 'workflow-run', 2, { kind: 'session' }, { phases: 'bad' }),
      chatNode('defaults', 'workflow-run', 4, { kind: 'session' }, {
        status: 'failed',
        phases: [
          null,
          { members: 'bad' },
          { members: [] },
          {
            members: [
              null,
              {},
              { childId: 'done', status: 'completed' },
              { childId: 'failed', status: 'failed' },
              { childId: 'cancelled', status: 'cancelled' },
              { childId: 'interrupted', status: 'interrupted' },
              { childId: 'mystery', status: 'future-status', seq: Number.NaN, label: '' },
            ],
          },
        ],
      }),
      chatNode('completed', 'workflow-run', 5, { kind: 'unresolved' }, {
        name: 'Completed workflow', status: 'completed',
        phases: [{ key: 'complete', phase: 'Done', members: [{ childId: 'done', status: 'completed', seq: 5 }] }],
      }),
      chatNode('cancelled', 'workflow-run', 6, { kind: 'session' }, { status: 'cancelled', phases: [] }),
      chatNode('interrupted', 'workflow-run', 7, { kind: 'session' }, { status: 'interrupted', phases: [] }),
      chatNode('unknown-status', 'workflow-run', 8, { kind: 'session' }, { status: 'future', phases: [] }),
    ]
    const base = sessionList()
    const sessions = {
      ...base,
      byId: {
        ...base.byId,
        done: {
          id: 'done', displayTitle: 'done', title: 'done', parentId: SID,
          origin: 'subagent', running: false, blank: false, updatedAt: 5,
        },
        failed: {
          id: 'failed', displayTitle: 'failed child', parentId: SID,
          origin: 'subagent', running: false, blank: false, updatedAt: 6,
        },
        standalone: {
          id: 'standalone', displayTitle: 'standalone', parentId: SID,
          origin: 'subagent', running: false, blank: false, updatedAt: 9,
        },
        outsider: {
          id: 'outsider', displayTitle: 'outsider', parentId: 'elsewhere',
          origin: 'subagent', running: false, blank: false, updatedAt: 1,
        },
        manual: {
          id: 'manual', displayTitle: 'manual', parentId: SID,
          origin: 'user', running: false, blank: false, updatedAt: 1,
        },
      },
      subagentsByParent: {
        [SID]: {
          entries: [
            { kind: 'group', id: 'ignored-group' },
            { kind: 'child', id: 'standalone' },
          ],
        },
      },
    } as unknown as typeof base
    const map = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({ chatNodes: workflowRows }),
      sessions,
    })

    expect(map.nodes.some(node => node.id === 'workflow:not-record')).toBe(false)
    expect(map.nodes.find(node => node.id === 'workflow:defaults')).toMatchObject({
      label: 'Workflow', status: 'failed',
    })
    expect(map.nodes.find(node => node.id === 'phase:defaults:phase-1')).toMatchObject({
      label: '', status: 'failed',
    })
    expect(map.nodes.find(node => node.id === 'subagent:done')).toMatchObject({
      label: 'done', status: 'completed', detail: 'done',
    })
    expect(map.nodes.find(node => node.id === 'subagent:cancelled')?.status).toBe('waiting')
    expect(map.nodes.find(node => node.id === 'subagent:interrupted')?.status).toBe('waiting')
    expect(map.nodes.find(node => node.id === 'subagent:mystery')).toMatchObject({
      label: 'mystery', status: 'unknown', seq: 0,
    })
    expect(map.nodes.find(node => node.id === 'workflow:cancelled')?.status).toBe('waiting')
    expect(map.nodes.find(node => node.id === 'workflow:interrupted')?.status).toBe('waiting')
    expect(map.nodes.find(node => node.id === 'workflow:unknown-status')?.status).toBe('unknown')
    expect(map.edges).toContainEqual(expect.objectContaining({
      from: `agent:${SID}`, to: 'subagent:standalone',
    }))
    expect(map.knowledge.find(item => item.ownerNodeId === 'subagent:standalone')).toMatchObject({
      label: 'standalone', text: 'standalone',
    })
    expect(map.nodes.some(node => node.id === 'subagent:outsider')).toBe(false)
    expect(map.nodes.some(node => node.id === 'subagent:manual')).toBe(false)
  })

  it('normalizes partial Tool trees, de-duplicates calls, and attaches live calls to known Steps', () => {
    const activeStep = stepLocation(6, 2, 'open', 20)
    const activeTurn = turnLocation(6, 'open', [activeStep], 19)
    const rows = [
      chatNode('null-data', 'tool-call', 1, { kind: 'session' }, null),
      chatNode('null-root', 'tool-call', 2, { kind: 'session' }, { root: null }),
      chatNode('missing-id', 'tool-call', 3, { kind: 'session' }, { root: {} }),
      chatNode('result', 'tool-call', 21, location(activeTurn, activeStep), {
        root: {
          kind: 'tool-result', callId: 'settled', call: null, isError: true,
          seq: Number.NaN, subCalls: 'not-an-array',
        },
      }),
      chatNode('nested', 'tool-call', 22, location(activeTurn, activeStep), {
        root: {
          callId: 'parent', name: '', subCalls: [
            null,
            {},
            {
              kind: 'tool-result', callId: 'child', call: { name: '' },
              isError: false, seq: 23, subCalls: [{ callId: 'child' }],
            },
          ],
        },
      }),
      chatNode('duplicate', 'tool-call', 24, { kind: 'unresolved' }, {
        root: { callId: 'parent', name: 'later duplicate' },
      }),
    ]
    const map = buildTaskKnowledgeMap({
      sessionId: SID,
      session: sessionSnapshot({
        chatNodes: rows,
        turns: [activeTurn],
        running: true,
        runningCalls: [
          {
            callId: 'parent', name: 'duplicate live', argsRaw: '{}', turn: 6, step: 2,
            time: 1, callView: null, subCalls: [],
          },
          {
            callId: 'attached-live', name: 'live', argsRaw: '{}', turn: 6, step: 2,
            time: 1, callView: null, subCalls: [],
          },
        ],
      }),
      sessions: sessionList(),
    })

    expect(map.nodes.find(node => node.id === 'tool:settled')).toMatchObject({
      label: 'settled', status: 'failed', seq: 21,
    })
    expect(map.nodes.find(node => node.id === 'tool:parent')).toMatchObject({
      label: 'later duplicate', status: 'active',
    })
    expect(map.nodes.find(node => node.id === 'tool:child')).toMatchObject({
      label: 'child', status: 'completed', cutoffSeq: 23,
    })
    expect(map.nodes.filter(node => node.id === 'tool:parent')).toHaveLength(1)
    expect(map.edges).toContainEqual(expect.objectContaining({
      from: 'step:6:2', to: 'tool:attached-live',
    }))
  })

  it('tolerates sparse timelines and lays out disconnected, duplicate, and cyclic input defensively', () => {
    const sparseStep = {
      turn: 8, step: 3, status: 'closed', start: undefined, end: undefined,
      data: { get: () => undefined },
    } as never
    const sparseTurn = {
      turn: 8, status: 'closed', steps: [sparseStep], start: undefined, end: undefined,
      data: { get: () => undefined },
    } as never
    const snapshot = sessionSnapshot({ turns: [sparseTurn] })
    const sparse = buildTaskKnowledgeMap({
      sessionId: SID,
      session: {
        ...snapshot,
        chat: {
          ...snapshot.chat,
          timeline: {
            ...snapshot.chat.timeline,
            turnOrder: [404, 8],
          },
        },
      },
      sessions: sessionList(),
    })
    expect(sparse.nodes.find(node => node.id === 'turn:8')?.seq).toBe(8)
    expect(sparse.nodes.find(node => node.id === 'step:8:3')?.seq).toBe(3)

    const root = {
      id: 'agent:r', kind: 'agent', label: 'r', status: 'completed', seq: 0,
      knowledgeScope: 'session',
    } as const
    const child = {
      id: 'turn:1', kind: 'turn', label: '1', status: 'completed', seq: 1,
      turn: 1, knowledgeScope: 'session',
    } as const
    const orphan = {
      id: 'tool:o', kind: 'tool', label: 'o', status: 'active', seq: 2,
      knowledgeScope: 'session',
    } as const
    const layout = layoutTaskKnowledgeMap({
      rootId: root.id,
      nodes: [root, child, orphan],
      edges: [
        { id: 'root-child', from: root.id, to: child.id, kind: 'execution' },
        { id: 'duplicate-child', from: root.id, to: child.id, kind: 'execution' },
        { id: 'missing', from: root.id, to: 'missing', kind: 'activity' },
        { id: 'cycle', from: child.id, to: root.id, kind: 'execution' },
      ],
    })
    expect(Object.keys(layout.positions)).toEqual(expect.arrayContaining([root.id, child.id, orphan.id]))

    const rootless = layoutTaskKnowledgeMap({ rootId: 'missing-root', nodes: [orphan], edges: [] })
    expect(rootless.positions[orphan.id]).toBeDefined()
  })
})
