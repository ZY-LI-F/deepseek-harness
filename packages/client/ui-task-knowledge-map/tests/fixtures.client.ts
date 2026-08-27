/** Client-face Session fixtures shared by the Task Knowledge Map tests. */
import type {
  ChatConversationViewNode, ChatSnapshot, ConversationLocation, ConversationNode,
  ConversationSnapshot, ConversationTimelineSnapshot, SessionId, SessionListState,
  StepLocation, TurnLocation,
} from '@deepseek-ai/dsh-client-runtime/client'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-runtime/client'
import { conversationSnapshot } from '@deepseek-ai/dsh-client-test-runtime'

export const SID = 'task-map-root' as SessionId
export const CHILD_ID = 'task-map-child' as SessionId

const locationData = { get: () => undefined }

export function stepLocation(
  turn: number,
  step: number,
  status: StepLocation['status'],
  startSeq: number,
  endSeq?: number,
): StepLocation {
  return {
    turn,
    step,
    status,
    start: { seq: startSeq, time: startSeq * 100, type: 'step/start', data: { turn, step } },
    ...endSeq === undefined
      ? { end: undefined }
      : { end: { seq: endSeq, time: endSeq * 100, type: 'step/end', data: { turn, step } } },
    data: locationData,
  }
}

export function turnLocation(
  turn: number,
  status: TurnLocation['status'],
  steps: readonly StepLocation[],
  startSeq: number,
  endSeq?: number,
): TurnLocation {
  return {
    turn,
    status,
    steps,
    start: { seq: startSeq, time: startSeq * 100, type: 'turn/start', data: { turn } },
    ...endSeq === undefined
      ? { end: undefined }
      : {
        end: {
          seq: endSeq,
          time: endSeq * 100,
          type: 'turn/end',
          data: { turn, reason: { kind: 'completed' } },
        },
      },
    data: locationData,
  }
}

export function location(turn: TurnLocation, step?: StepLocation): ConversationLocation {
  return step === undefined
    ? { kind: 'turn', turn }
    : { kind: 'step', turn, step }
}

export function chatNode(
  key: string,
  kind: string,
  anchorSeq: number,
  nodeLocation: ConversationLocation,
  data: unknown,
): ChatConversationViewNode {
  return {
    key,
    kind,
    id: key,
    target: 'chat',
    anchorSeq,
    location: nodeLocation,
    visibility: 'visible',
    data,
  }
}

export function chatSnapshot(
  nodes: readonly ChatConversationViewNode[],
  turns: readonly TurnLocation[],
): ChatSnapshot {
  const byKey = new Map(nodes.map(node => [node.key, node]))
  const timeline: ConversationTimelineSnapshot = {
    turnOrder: turns.map(turn => turn.turn),
    turns: new Map(turns.map(turn => [turn.turn, turn])),
  }
  return {
    ...EMPTY_CHAT_SNAPSHOT,
    order: nodes.map(node => node.key),
    nodes: {
      get: key => byKey.get(key),
      values: () => nodes,
    },
    timeline,
  }
}

export function sessionSnapshot(options: {
  nodes?: readonly ConversationNode[]
  chatNodes?: readonly ChatConversationViewNode[]
  turns?: readonly TurnLocation[]
  running?: boolean
  runningCalls?: ConversationSnapshot['runningCalls']
  queue?: ConversationSnapshot['queue']
  removed?: boolean
  lastAgentError?: string | null
} = {}): ConversationSnapshot {
  const nodes = options.nodes ?? []
  return {
    ...conversationSnapshot(SID),
    nodes,
    chat: chatSnapshot(options.chatNodes ?? [], options.turns ?? []),
    running: options.running ?? false,
    runningCalls: options.runningCalls ?? [],
    queue: options.queue ?? [],
    removed: options.removed ?? false,
    lastAgentError: options.lastAgentError ?? null,
  }
}

export function sessionList(options: {
  child?: boolean
  childRunning?: boolean
  childWaiting?: boolean
} = {}): SessionListState {
  const child = options.child === true
    ? {
      [CHILD_ID]: {
        id: CHILD_ID,
        displayTitle: '检索文档',
        title: '检查知识来源',
        parentId: SID,
        origin: 'subagent' as const,
        running: options.childRunning === true,
        ...options.childWaiting === true ? { pendingInteraction: 'question' as const } : {},
        blank: false,
        updatedAt: 90,
      },
    }
    : {}
  return {
    ids: [SID, ...options.child === true ? [CHILD_ID] : []],
    byId: {
      [SID]: {
        id: SID,
        displayTitle: '实现任务地图',
        agentPreset: 'web',
        running: true,
        blank: false,
        updatedAt: 100,
      },
      ...child,
    },
    current: SID,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}
