/** Pure projection from DSH Session snapshots to a bounded task and knowledge graph. */
import type {
  ChatConversationViewNode, ConversationLocation, ConversationNode, ConversationSnapshot,
  SessionId, SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'

const MAX_PREVIEW_LENGTH = 220
const MAX_TOOL_NODES = 56
const MAX_KNOWLEDGE_ITEMS = 160
const NODE_WIDTH = 184
const NODE_HEIGHT = 72
const COLUMN_GAP = 94
const ROW_GAP = 24
const LAYOUT_PADDING = 48

/** Execution state rendered on one graph node. */
export type TaskMapStatus = 'active' | 'completed' | 'failed' | 'waiting' | 'unknown'

/** Stable role of one graph node. */
export type TaskMapNodeKind = 'agent' | 'turn' | 'step' | 'workflow' | 'phase' | 'subagent' | 'tool'

/** Information class projected from observable Session data. */
export type KnowledgeKind =
  | 'requirement'
  | 'context'
  | 'memory'
  | 'tool'
  | 'conclusion'
  | 'compaction'
  | 'issue'
  | 'pending'
  | 'delegation'

/** Whether an information source is active, historical, queued, or erroneous. */
export type KnowledgeState = 'available' | 'observed' | 'compacted' | 'pending' | 'error'

/** One selectable node in the task execution graph. */
export interface TaskMapNode {
  readonly id: string
  readonly kind: TaskMapNodeKind
  readonly label: string
  readonly detail?: string
  readonly status: TaskMapStatus
  readonly seq: number
  readonly turn?: number
  readonly step?: number
  /** Last Session seq whose information is visible at this position; absent means the live tail. */
  readonly cutoffSeq?: number
  /** A delegated child exposes only the task observable from its parent Session. */
  readonly knowledgeScope: 'session' | 'delegation'
}

/** One parent-child relationship in the task graph. */
export interface TaskMapEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: 'execution' | 'branch' | 'activity'
}

/** One observable information source shown in the knowledge inspector. */
export interface KnowledgeItem {
  readonly id: string
  readonly kind: KnowledgeKind
  readonly state: KnowledgeState
  readonly label: string
  readonly text: string
  readonly source: string
  readonly seq: number | null
  readonly ownerNodeId?: string
}

/** Counts and truncation facts for one projected map. */
export interface TaskMapStats {
  readonly turns: number
  readonly steps: number
  readonly tools: number
  readonly agents: number
  readonly workflows: number
  readonly knowledge: number
  readonly truncatedTools: number
  readonly truncatedKnowledge: number
}

/** Complete immutable projection consumed by the browser view. */
export interface TaskKnowledgeMap {
  readonly rootId: string
  readonly nodes: readonly TaskMapNode[]
  readonly edges: readonly TaskMapEdge[]
  readonly knowledge: readonly KnowledgeItem[]
  readonly activeNodeIds: ReadonlySet<string>
  readonly activePathNodeIds: ReadonlySet<string>
  readonly activePathEdgeIds: ReadonlySet<string>
  readonly currentPathNodeIds: readonly string[]
  readonly currentNodeId: string
  readonly stats: TaskMapStats
}

/** Inputs accepted by the pure task-map projection module. */
export interface TaskKnowledgeMapInput {
  readonly sessionId: SessionId
  readonly session: ConversationSnapshot
  readonly sessions: SessionListState
}

/** Pixel position of one graph node. */
export interface TaskMapPoint {
  readonly x: number
  readonly y: number
}

/** Deterministic left-to-right layout for the projected tree. */
export interface TaskMapLayout {
  readonly width: number
  readonly height: number
  readonly positions: Readonly<Record<string, TaskMapPoint>>
}

interface MutableGraph {
  readonly nodes: Map<string, TaskMapNode>
  readonly edges: TaskMapEdge[]
  readonly parentByNode: Map<string, string>
}

interface ParsedToolBlock {
  readonly callId: string
  readonly name: string
  readonly status: TaskMapStatus
  readonly seq: number | undefined
  readonly children: readonly ParsedToolBlock[]
}

interface WorkflowMemberLike {
  readonly seq: number
  readonly label: string
  readonly childId: string
  readonly status: TaskMapStatus
}

interface WorkflowPhaseLike {
  readonly key: string
  readonly phase: string | null
  readonly members: readonly WorkflowMemberLike[]
}

interface WorkflowRunLike {
  readonly name: string
  readonly status: TaskMapStatus
  readonly phases: readonly WorkflowPhaseLike[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function preview(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > MAX_PREVIEW_LENGTH
    ? `${compact.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
    : compact
}

function textFromBlocks(blocks: readonly unknown[]): string {
  return preview(blocks.flatMap((block) => {
    const record = asRecord(block)
    if (record === null) return []
    const type = readString(record, 'type') ?? readString(record, 'kind')
    return type === 'text' ? [readString(record, 'text') ?? ''] : []
  }).join(' '))
}

function graphNodeId(kind: TaskMapNodeKind, identity: string | number): string {
  return `${kind}:${String(identity)}`
}

function turnNodeId(turn: number): string {
  return graphNodeId('turn', turn)
}

function stepNodeId(turn: number, step: number): string {
  return graphNodeId('step', `${turn}:${step}`)
}

function toolNodeId(callId: string): string {
  return graphNodeId('tool', callId)
}

function addNode(graph: MutableGraph, node: TaskMapNode): void {
  if (!graph.nodes.has(node.id)) graph.nodes.set(node.id, node)
}

function addEdge(graph: MutableGraph, from: string, to: string, kind: TaskMapEdge['kind']): void {
  if (from === to || graph.parentByNode.has(to)) return
  const edge = { id: `edge:${from}:${to}`, from, to, kind } as const
  graph.edges.push(edge)
  graph.parentByNode.set(to, from)
}

function locationParent(location: ConversationLocation, rootId: string): string {
  if (location.kind === 'step') return stepNodeId(location.turn.turn, location.step.step)
  if (location.kind === 'turn') return turnNodeId(location.turn.turn)
  return rootId
}

function mapExternalStatus(value: unknown): TaskMapStatus {
  switch (value) {
    case 'running': return 'active'
    case 'completed': return 'completed'
    case 'failed': return 'failed'
    case 'cancelled':
    case 'interrupted': return 'waiting'
    default: return 'unknown'
  }
}

function parseToolBlock(value: unknown): ParsedToolBlock | null {
  const record = asRecord(value)
  if (record === null) return null
  const callId = readString(record, 'callId')
  if (callId === undefined) return null
  const children = Array.isArray(record.subCalls)
    ? record.subCalls.flatMap(child => parseToolBlock(child) ?? [])
    : []
  if (record.kind === 'tool-result') {
    const call = asRecord(record.call)
    return {
      callId,
      name: call === null ? callId : readString(call, 'name') ?? callId,
      status: record.isError === true ? 'failed' : 'completed',
      seq: readNumber(record, 'seq'),
      children,
    }
  }
  return {
    callId,
    name: readString(record, 'name') ?? callId,
    status: 'active',
    seq: undefined,
    children,
  }
}

function countToolBlocks(block: ParsedToolBlock): number {
  return 1 + block.children.reduce((sum, child) => sum + countToolBlocks(child), 0)
}

function parseWorkflow(value: unknown): WorkflowRunLike | null {
  const record = asRecord(value)
  if (record === null || !Array.isArray(record.phases)) return null
  const phases: WorkflowPhaseLike[] = []
  for (const candidate of record.phases) {
    const phase = asRecord(candidate)
    if (phase === null || !Array.isArray(phase.members)) continue
    const members: WorkflowMemberLike[] = []
    for (const entry of phase.members) {
      const member = asRecord(entry)
      if (member === null) continue
      const childId = readString(member, 'childId')
      if (childId === undefined) continue
      members.push({
        seq: readNumber(member, 'seq') ?? 0,
        label: readString(member, 'label') ?? childId,
        childId,
        status: mapExternalStatus(member.status),
      })
    }
    phases.push({
      key: readString(phase, 'key') ?? `phase-${phases.length}`,
      phase: typeof phase.phase === 'string' ? phase.phase : null,
      members,
    })
  }
  return {
    name: readString(record, 'name') ?? 'Workflow',
    status: mapExternalStatus(record.status),
    phases,
  }
}

function workflowNodes(session: ConversationSnapshot): readonly ChatConversationViewNode[] {
  return session.chat.nodes.values()
    .filter(node => node.kind === 'workflow-run')
    .sort((left, right) => left.anchorSeq - right.anchorSeq)
}

function toolNodes(session: ConversationSnapshot): readonly ChatConversationViewNode[] {
  return session.chat.nodes.values()
    .filter(node => node.kind === 'tool-call')
    .sort((left, right) => left.anchorSeq - right.anchorSeq)
}

function addToolTree(
  graph: MutableGraph,
  block: ParsedToolBlock,
  parentId: string,
  fallbackSeq: number,
  counter: { included: number },
): void {
  if (counter.included >= MAX_TOOL_NODES) return
  counter.included++
  const id = toolNodeId(block.callId)
  addNode(graph, {
    id,
    kind: 'tool',
    label: block.name,
    status: block.status,
    seq: block.seq ?? fallbackSeq,
    ...block.seq === undefined ? {} : { cutoffSeq: block.seq },
    knowledgeScope: 'session',
  })
  addEdge(graph, parentId, id, 'activity')
  for (const child of block.children) addToolTree(graph, child, id, fallbackSeq, counter)
}

function issueTurns(nodes: readonly ConversationNode[]): ReadonlySet<number> {
  return new Set(nodes.flatMap((node) => {
    if (node.kind === 'turn-error' || node.kind === 'turn-max-tokens') return [node.turn]
    return []
  }))
}

function knowledgeFromNode(node: ConversationNode): KnowledgeItem | null {
  const id = `knowledge:${node.kind}:${node.seq}`
  switch (node.kind) {
    case 'user':
    case 'steering':
      return {
        id, kind: 'requirement', state: 'available', label: node.kind,
        text: textFromBlocks(node.content), source: 'user', seq: node.seq,
      }
    case 'context': {
      const memory = node.provenance.role === 'recall'
        || /memo|memory|recall/i.test(node.provenance.label ?? '')
      return {
        id,
        kind: memory ? 'memory' : 'context',
        state: 'available',
        label: node.provenance.label ?? node.provenance.role,
        text: textFromBlocks(node.content),
        source: node.form ?? node.provenance.role,
        seq: node.seq,
      }
    }
    case 'assistant': {
      const text = textFromBlocks(node.blocks)
      return text === '' ? null : {
        id, kind: 'conclusion', state: 'available', label: `step ${node.turn}.${node.step}`,
        text, source: 'assistant', seq: node.seq,
      }
    }
    case 'tool-result': {
      const name = node.call?.name ?? node.callId
      const memory = /memo|memory|recall/i.test(name)
      return {
        id,
        kind: memory ? 'memory' : 'tool',
        state: node.isError ? 'error' : 'observed',
        label: name,
        text: textFromBlocks(node.content),
        source: node.error?.code ?? node.callId,
        seq: node.seq,
        ownerNodeId: toolNodeId(node.callId),
      }
    }
    case 'command':
      return {
        id, kind: 'tool', state: node.outcome?.kind === 'error' ? 'error' : 'observed',
        label: `/${node.name ?? 'command'}`, text: preview(node.outcome?.text ?? ''),
        source: String(node.commandId), seq: node.seq,
      }
    case 'compaction':
      return {
        id, kind: 'compaction', state: 'available', label: 'compaction',
        text: preview(node.summary ?? ''), source: `#${node.summaryEventSeq ?? node.seq}`, seq: node.seq,
      }
    case 'model-retry':
      return {
        id, kind: 'issue', state: 'error', label: node.provider,
        text: preview(node.failure.message), source: node.failure.code, seq: node.seq,
      }
    case 'turn-error':
      return {
        id, kind: 'issue', state: 'error', label: `turn ${node.turn}`,
        text: preview(node.message), source: node.code ?? 'turn-error', seq: node.seq,
      }
    case 'turn-max-tokens':
      return {
        id, kind: 'issue', state: 'error', label: `turn ${node.turn}`,
        text: '', source: 'max-tokens', seq: node.seq,
      }
    case 'unknown':
      return {
        id, kind: 'issue', state: 'observed', label: node.type,
        text: '', source: node.type, seq: node.seq,
      }
    /* v8 ignore next 4 -- ConversationNode is a closed discriminated union; this is its compile-time exhaustiveness guard. */
    default: {
      const exhaustive: never = node
      return exhaustive
    }
  }
}

function boundedKnowledge(items: readonly KnowledgeItem[]): {
  readonly items: readonly KnowledgeItem[]
  readonly truncated: number
} {
  if (items.length <= MAX_KNOWLEDGE_ITEMS) return { items, truncated: 0 }
  const required = items.filter(item => item.kind === 'requirement').slice(0, 8)
  const recent = items.slice(-(MAX_KNOWLEDGE_ITEMS - required.length))
  const retained = new Map([...required, ...recent].map(item => [item.id, item]))
  const bounded = [...retained.values()].sort((left, right) => (left.seq ?? Infinity) - (right.seq ?? Infinity))
  return { items: bounded, truncated: items.length - bounded.length }
}

function buildKnowledge(
  session: ConversationSnapshot,
  delegated: readonly KnowledgeItem[],
): { readonly items: readonly KnowledgeItem[]; readonly truncated: number } {
  const landed = session.nodes.flatMap(node => knowledgeFromNode(node) ?? [])
  const lastCompactionSeq = session.nodes.reduce(
    (latest, node) => node.kind === 'compaction' ? Math.max(latest, node.seq) : latest,
    -1,
  )
  const marked = landed.map(item => item.seq !== null
    && item.seq < lastCompactionSeq
    && item.kind !== 'compaction'
    ? { ...item, state: 'compacted' as const }
    : item)
  const pending = session.queue.map((message, index): KnowledgeItem => ({
    id: `knowledge:pending:${String(message.id)}`,
    kind: 'pending',
    state: 'pending',
    label: message.placement,
    text: preview(message.preview || textFromBlocks(message.content)),
    source: `queue:${index + 1}`,
    seq: null,
  }))
  return boundedKnowledge([...marked, ...delegated, ...pending])
}

const NODE_PRIORITY: Readonly<Record<TaskMapNodeKind, number>> = {
  agent: 1,
  turn: 2,
  step: 3,
  phase: 4,
  workflow: 5,
  subagent: 6,
  tool: 7,
}

function nodePriority(node: TaskMapNode): number {
  return NODE_PRIORITY[node.kind]
}

function pathToRoot(nodeId: string, rootId: string, parentByNode: ReadonlyMap<string, string>): string[] {
  const reversed = [nodeId]
  const seen = new Set(reversed)
  let cursor = nodeId
  while (cursor !== rootId) {
    const parent = parentByNode.get(cursor)
    /* v8 ignore next -- graph construction gives every non-root node one acyclic parent; this only guards forged internal maps. */
    if (parent === undefined || seen.has(parent)) break
    reversed.push(parent)
    seen.add(parent)
    cursor = parent
  }
  return reversed.reverse()
}

/**
 * Fold one live Session plus its child catalog into a bounded task graph and
 * cumulative observable knowledge ledger.
 * @param input - current Session snapshot and root Session-list snapshot.
 * @returns deterministic graph, active paths, and information provenance.
 */
export function buildTaskKnowledgeMap(input: TaskKnowledgeMapInput): TaskKnowledgeMap {
  const { sessionId, session, sessions } = input
  const rootId = graphNodeId('agent', sessionId)
  const graph: MutableGraph = { nodes: new Map(), edges: [], parentByNode: new Map() }
  const rootSummary = sessions.byId[sessionId]
  const rootStatus: TaskMapStatus = session.lastAgentError !== null
    ? 'failed'
    : session.running ? 'active' : session.removed ? 'waiting' : 'completed'
  addNode(graph, {
    id: rootId,
    kind: 'agent',
    label: rootSummary?.displayTitle ?? String(sessionId),
    ...rootSummary?.agentPreset === undefined ? {} : { detail: rootSummary.agentPreset },
    status: rootStatus,
    seq: 0,
    knowledgeScope: 'session',
  })

  const failedTurns = issueTurns(session.nodes)
  let stepCount = 0
  for (const turnNumber of session.chat.timeline.turnOrder) {
    const turn = session.chat.timeline.turns.get(turnNumber)
    if (turn === undefined) continue
    const turnId = turnNodeId(turnNumber)
    addNode(graph, {
      id: turnId,
      kind: 'turn',
      label: String(turnNumber),
      status: failedTurns.has(turnNumber) ? 'failed' : turn.status === 'open' ? 'active' : 'completed',
      seq: turn.start?.seq ?? turn.end?.seq ?? turnNumber,
      turn: turnNumber,
      ...turn.end === undefined ? {} : { cutoffSeq: turn.end.seq },
      knowledgeScope: 'session',
    })
    addEdge(graph, rootId, turnId, 'execution')
    for (const step of turn.steps) {
      stepCount++
      const id = stepNodeId(turnNumber, step.step)
      addNode(graph, {
        id,
        kind: 'step',
        label: String(step.step),
        status: failedTurns.has(turnNumber) && step === turn.steps.at(-1)
          ? 'failed'
          : step.status === 'open' ? 'active' : 'completed',
        seq: step.start?.seq ?? step.end?.seq ?? step.step,
        turn: turnNumber,
        step: step.step,
        ...step.end === undefined ? {} : { cutoffSeq: step.end.seq },
        knowledgeScope: 'session',
      })
      addEdge(graph, turnId, id, 'execution')
    }
  }

  const workflowMemberIds = new Set<string>()
  for (const node of workflowNodes(session)) {
    const data = parseWorkflow(node.data)
    if (data === null) continue
    const workflowId = graphNodeId('workflow', node.id)
    addNode(graph, {
      id: workflowId,
      kind: 'workflow',
      label: data.name,
      status: data.status,
      seq: node.anchorSeq,
      knowledgeScope: 'session',
    })
    addEdge(graph, locationParent(node.location, rootId), workflowId, 'branch')
    for (const phase of data.phases) {
      if (phase.members.length === 0) continue
      const phaseId = graphNodeId('phase', `${node.id}:${phase.key}`)
      const phaseStatus = phase.members.some(member => member.status === 'active')
        ? 'active'
        : phase.members.some(member => member.status === 'failed') ? 'failed' : 'completed'
      addNode(graph, {
        id: phaseId,
        kind: 'phase',
        label: phase.phase ?? '',
        status: phaseStatus,
        seq: node.anchorSeq,
        knowledgeScope: 'session',
      })
      addEdge(graph, workflowId, phaseId, 'branch')
      for (const member of phase.members) {
        workflowMemberIds.add(member.childId)
        const memberId = graphNodeId('subagent', member.childId)
        const summary = sessions.byId[member.childId as SessionId]
        addNode(graph, {
          id: memberId,
          kind: 'subagent',
          label: member.label,
          ...summary === undefined
            ? {}
            : { detail: summary.title ?? summary.displayTitle },
          status: member.status,
          seq: member.seq,
          cutoffSeq: member.seq,
          knowledgeScope: 'delegation',
        })
        addEdge(graph, phaseId, memberId, 'branch')
      }
    }
  }

  const catalogLabels = new Map<string, string>()
  for (const entry of sessions.subagentsByParent[sessionId]?.entries ?? []) {
    if (entry.kind === 'child') catalogLabels.set(entry.id, entry.label ?? entry.id)
  }
  const delegated: KnowledgeItem[] = []
  for (const summary of Object.values(sessions.byId)) {
    if (summary.parentId !== sessionId || summary.origin !== 'subagent') continue
    const nodeId = graphNodeId('subagent', summary.id)
    const label = catalogLabels.get(summary.id) ?? summary.displayTitle
    addNode(graph, {
      id: nodeId,
      kind: 'subagent',
      label,
      ...summary.title === undefined || summary.title === label ? {} : { detail: summary.title },
      status: summary.pendingInteraction !== undefined ? 'waiting' : summary.running ? 'active' : 'completed',
      seq: summary.updatedAt,
      knowledgeScope: 'delegation',
    })
    if (!workflowMemberIds.has(summary.id)) addEdge(graph, rootId, nodeId, 'branch')
    delegated.push({
      id: `knowledge:delegation:${summary.id}`,
      kind: 'delegation',
      state: 'available',
      label,
      text: preview(summary.title ?? summary.displayTitle),
      source: String(sessionId),
      seq: null,
      ownerNodeId: nodeId,
    })
  }

  const parsedTools = toolNodes(session).flatMap((node) => {
    const data = asRecord(node.data)
    const root = data === null ? null : parseToolBlock(data.root)
    return root === null ? [] : [{ node, root }]
  })
  const totalToolCount = parsedTools.reduce((sum, entry) => sum + countToolBlocks(entry.root), 0)
  const counter = { included: 0 }
  // Prefer the live tail when the graph is bounded; layout still sorts retained
  // nodes by their authoritative sequence numbers.
  for (const entry of [...parsedTools].reverse()) {
    addToolTree(
      graph,
      entry.root,
      locationParent(entry.node.location, rootId),
      entry.node.anchorSeq,
      counter,
    )
  }
  for (const running of session.runningCalls) {
    const id = toolNodeId(running.callId)
    if (graph.nodes.has(id) || counter.included >= MAX_TOOL_NODES) continue
    counter.included++
    addNode(graph, {
      id,
      kind: 'tool',
      label: running.name,
      status: 'active',
      seq: Number.MAX_SAFE_INTEGER - counter.included,
      turn: running.turn,
      step: running.step,
      knowledgeScope: 'session',
    })
    const parent = graph.nodes.has(stepNodeId(running.turn, running.step))
      ? stepNodeId(running.turn, running.step)
      : rootId
    addEdge(graph, parent, id, 'activity')
  }

  const knowledge = buildKnowledge(session, delegated)
  const nodes = [...graph.nodes.values()]
  const rootNode = graph.nodes.get(rootId)
  /* v8 ignore next -- addNode installs this root unconditionally before any projection work. */
  if (rootNode === undefined) throw new Error('task map root missing')
  const activeNodeIds = new Set(nodes.filter(node => node.status === 'active').map(node => node.id))
  const activeLeaves = nodes.filter(node => node.status === 'active'
    && !graph.edges.some(edge => edge.from === node.id && activeNodeIds.has(edge.to)))
  const current = activeLeaves.sort((left, right) =>
    nodePriority(right) - nodePriority(left) || right.seq - left.seq)[0]
    ?? [...nodes].filter(node => node.kind === 'step').sort((left, right) => right.seq - left.seq)[0]
    ?? [...nodes].filter(node => node.kind === 'turn').sort((left, right) => right.seq - left.seq)[0]
    ?? rootNode
  const activePathNodeIds = new Set<string>()
  const activePathEdgeIds = new Set<string>()
  for (const leaf of activeLeaves) {
    const path = pathToRoot(leaf.id, rootId, graph.parentByNode)
    for (const id of path) activePathNodeIds.add(id)
    for (let index = 1; index < path.length; index++) {
      activePathEdgeIds.add(`edge:${path[index - 1]}:${path[index]}`)
    }
  }
  const currentPathNodeIds = pathToRoot(current.id, rootId, graph.parentByNode)
  const agentCount = nodes.filter(node => node.kind === 'agent' || node.kind === 'subagent').length
  return {
    rootId,
    nodes,
    edges: graph.edges,
    knowledge: knowledge.items,
    activeNodeIds,
    activePathNodeIds,
    activePathEdgeIds,
    currentPathNodeIds,
    currentNodeId: current.id,
    stats: {
      turns: session.chat.timeline.turnOrder.length,
      steps: stepCount,
      tools: counter.included,
      agents: agentCount,
      workflows: nodes.filter(node => node.kind === 'workflow').length,
      knowledge: knowledge.items.length,
      truncatedTools: Math.max(0, totalToolCount - counter.included),
      truncatedKnowledge: knowledge.truncated,
    },
  }
}

function compareNodes(left: TaskMapNode, right: TaskMapNode): number {
  return left.seq - right.seq || left.id.localeCompare(right.id)
}

/**
 * Lay out the one-parent graph as a stable left-to-right tree.
 * @param map - projected graph whose edges establish parentage.
 * @returns pixel positions and complete scrollable dimensions.
 */
export function layoutTaskKnowledgeMap(map: Pick<TaskKnowledgeMap, 'rootId' | 'nodes' | 'edges'>): TaskMapLayout {
  const byId = new Map(map.nodes.map(node => [node.id, node]))
  const children = new Map<string, TaskMapNode[]>()
  const childIds = new Set<string>()
  for (const edge of map.edges) {
    const child = byId.get(edge.to)
    if (child === undefined || childIds.has(child.id)) continue
    childIds.add(child.id)
    const list = children.get(edge.from) ?? []
    list.push(child)
    children.set(edge.from, list)
  }
  for (const list of children.values()) list.sort(compareNodes)

  const positions: Record<string, TaskMapPoint> = {}
  let nextLeafY = LAYOUT_PADDING
  let maxDepth = 0
  const visited = new Set<string>()
  const place = (node: TaskMapNode, depth: number): number => {
    if (visited.has(node.id)) return positions[node.id]?.y ?? nextLeafY
    visited.add(node.id)
    maxDepth = Math.max(maxDepth, depth)
    const descendants = children.get(node.id) ?? []
    const y = descendants.length === 0
      ? nextLeafY
      : (() => {
        const ys = descendants.map(child => place(child, depth + 1))
        return ((ys[0] as number) + (ys.at(-1) as number)) / 2
      })()
    if (descendants.length === 0) nextLeafY += NODE_HEIGHT + ROW_GAP
    positions[node.id] = {
      x: LAYOUT_PADDING + depth * (NODE_WIDTH + COLUMN_GAP),
      y,
    }
    return y
  }
  const root = byId.get(map.rootId)
  if (root !== undefined) place(root, 0)
  for (const node of [...map.nodes].sort(compareNodes)) {
    if (!visited.has(node.id)) place(node, 0)
  }
  const maxY = Object.values(positions).reduce((value, point) => Math.max(value, point.y), LAYOUT_PADDING)
  return {
    width: Math.max(640, LAYOUT_PADDING * 2 + (maxDepth + 1) * NODE_WIDTH + maxDepth * COLUMN_GAP),
    height: Math.max(320, maxY + NODE_HEIGHT + LAYOUT_PADDING),
    positions,
  }
}

/** Fixed graph-node width shared by the layout and presentation modules. */
export const TASK_MAP_NODE_WIDTH = NODE_WIDTH

/** Fixed graph-node height shared by the layout and presentation modules. */
export const TASK_MAP_NODE_HEIGHT = NODE_HEIGHT
