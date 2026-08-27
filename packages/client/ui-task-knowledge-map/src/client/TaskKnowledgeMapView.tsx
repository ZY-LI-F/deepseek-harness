/** Task execution graph with a cumulative observable-knowledge inspector. */
import clsx from 'clsx'
import { useMemo, useState, type CSSProperties } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { shallowEqual } from '@deepseek-ai/dsh-client-runtime/client'
import {
  buildTaskKnowledgeMap,
  layoutTaskKnowledgeMap,
  TASK_MAP_NODE_HEIGHT,
  TASK_MAP_NODE_WIDTH,
  type KnowledgeItem,
  type KnowledgeKind,
  type KnowledgeState,
  type TaskMapNode,
  type TaskMapNodeKind,
  type TaskMapStatus,
} from './model.ts'
import css from './TaskKnowledgeMapView.module.css'

const MIN_ZOOM = 0.55
const MAX_ZOOM = 1.65
const ZOOM_STEP = 0.15

/** Complete props supplied by the session-scoped conversation view slot. */
export type TaskKnowledgeMapViewProps =
  ConvViewProps & PropsLocale<'task-knowledge-map'>

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))))
}

function statusKey(status: TaskMapStatus): `status.${TaskMapStatus}` {
  return `status.${status}`
}

function nodeKindKey(kind: TaskMapNodeKind): `node.${TaskMapNodeKind}` {
  return `node.${kind}`
}

function knowledgeKindKey(kind: KnowledgeKind): `knowledge.kind.${KnowledgeKind}` {
  return `knowledge.kind.${kind}`
}

function knowledgeStateKey(state: KnowledgeState): `knowledge.state.${KnowledgeState}` {
  return `knowledge.state.${state}`
}

function nodeTitle(node: TaskMapNode, t: TaskKnowledgeMapViewProps['t']): string {
  if (node.kind === 'turn') return t('node.turnTitle', { turn: node.turn as number })
  if (node.kind === 'step') return t('node.stepTitle', { step: node.step as number })
  if (node.kind === 'phase' && node.label === '') return t('node.ungrouped')
  return node.label
}

function currentPathEdges(path: readonly string[]): ReadonlySet<string> {
  const ids = new Set<string>()
  for (let index = 1; index < path.length; index++) {
    ids.add(`edge:${path[index - 1]}:${path[index]}`)
  }
  return ids
}

function scopedKnowledge(
  items: readonly KnowledgeItem[],
  node: TaskMapNode,
): readonly KnowledgeItem[] {
  if (node.knowledgeScope === 'delegation') {
    return items.filter(item => item.ownerNodeId === node.id)
  }
  if (node.cutoffSeq === undefined) {
    return items
  }
  const cutoffSeq = node.cutoffSeq
  return items.filter(item => item.seq !== null && item.seq <= cutoffSeq)
}

function matchesKnowledge(item: KnowledgeItem, query: string): boolean {
  if (query === '') return true
  const haystack = `${item.label}\n${item.text}\n${item.source}`.toLocaleLowerCase()
  return haystack.includes(query.toLocaleLowerCase())
}

function graphPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const startX = from.x + TASK_MAP_NODE_WIDTH
  const startY = from.y + TASK_MAP_NODE_HEIGHT / 2
  const endX = to.x
  const endY = to.y + TASK_MAP_NODE_HEIGHT / 2
  const middleX = startX + (endX - startX) / 2
  return `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`
}

function resolveSelectedNode(
  byId: ReadonlyMap<string, TaskMapNode>,
  preferredId: string,
  currentId: string,
): TaskMapNode {
  const node = byId.get(preferredId) ?? byId.get(currentId)
  /* v8 ignore next -- the projection always contains its declared current node. */
  if (node === undefined) throw new Error('task map current node missing')
  return node
}

/** Render the live graph and the selected node's observable information history. */
export function TaskKnowledgeMapView({
  sessionId,
  useSession,
  useSessions,
  t,
}: TaskKnowledgeMapViewProps) {
  const session = useSession(snapshot => snapshot)
  const sessions = useSessions(snapshot => snapshot, shallowEqual)
  const map = useMemo(
    () => buildTaskKnowledgeMap({ sessionId, session, sessions }),
    [sessionId, session, sessions],
  )
  const layout = useMemo(() => layoutTaskKnowledgeMap(map), [map])
  const nodeById = useMemo(() => new Map(map.nodes.map(node => [node.id, node])), [map.nodes])
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [query, setQuery] = useState('')
  const selected = resolveSelectedNode(
    nodeById,
    selectedOverride ?? map.currentNodeId,
    map.currentNodeId,
  )
  const currentNodePath = new Set(map.currentPathNodeIds)
  const currentEdgePath = currentPathEdges(map.currentPathNodeIds)
  const selectedItems = useMemo(
    () => scopedKnowledge(map.knowledge, selected)
      .filter(item => matchesKnowledge(item, query.trim()))
      .sort((left, right) => (right.seq ?? Infinity) - (left.seq ?? Infinity)),
    [map.knowledge, query, selected],
  )
  const currentPathLabel = map.currentPathNodeIds
    .map(id => nodeById.get(id))
    .filter((node): node is TaskMapNode => node !== undefined)
    .map(node => nodeTitle(node, t))
    .join(' / ')
  const activeLeafCount = map.nodes.filter(node => node.status === 'active'
    && !map.edges.some(edge => edge.from === node.id && map.activeNodeIds.has(edge.to))).length
  const worldStyle = {
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    transform: `scale(${zoom})`,
  } satisfies CSSProperties
  const spacerStyle = {
    width: `${layout.width * zoom}px`,
    height: `${layout.height * zoom}px`,
  } satisfies CSSProperties

  return (
    <section className={css.root} aria-labelledby="task-knowledge-map-title">
      <header className={css.header}>
        <div className={css.heading}>
          <div>
            <h2 id="task-knowledge-map-title" className={css.title}>{t('view.title')}</h2>
            <p className={css.subtitle}>{t('view.subtitle')}</p>
          </div>
          <p className={css.notice}>{t('view.observableNotice')}</p>
        </div>
        <div className={css.summaryRow}>
          <div className={css.positionCard}>
            <span>{t('summary.currentPosition')}</span>
            <strong>{currentPathLabel}</strong>
            {activeLeafCount > 1 && <small>{t('path.multiple', { count: activeLeafCount })}</small>}
          </div>
          <div className={css.metricGroup} aria-label={t('summary.currentPosition')}>
            <span>{t('summary.turns', { count: map.stats.turns })}</span>
            <span>{t('summary.steps', { count: map.stats.steps })}</span>
            <span>{t('summary.tools', { count: map.stats.tools })}</span>
            <span>{t('summary.agents', { count: map.stats.agents })}</span>
            <span>{t('summary.knowledge', { count: map.stats.knowledge })}</span>
          </div>
        </div>
      </header>

      <div className={css.body}>
        <section className={css.graphPanel} aria-label={t('view.title')}>
          <div className={css.graphToolbar}>
            <div className={css.zoomControls}>
              <button
                type="button"
                aria-label={t('toolbar.zoomOut')}
                title={t('toolbar.zoomOut')}
                disabled={zoom <= MIN_ZOOM}
                onClick={() => { setZoom(value => clampZoom(value - ZOOM_STEP)) }}
              >−</button>
              <output aria-live="polite">{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                aria-label={t('toolbar.zoomIn')}
                title={t('toolbar.zoomIn')}
                disabled={zoom >= MAX_ZOOM}
                onClick={() => { setZoom(value => clampZoom(value + ZOOM_STEP)) }}
              >+</button>
              <button type="button" onClick={() => { setZoom(1) }}>{t('toolbar.resetZoom')}</button>
            </div>
            <button
              type="button"
              className={css.followButton}
              data-following={selectedOverride === null}
              onClick={() => { setSelectedOverride(null) }}
            >
              <span aria-hidden="true">◎</span>
              {t('toolbar.followCurrent')}
            </button>
          </div>
          <div className={css.graphViewport} data-task-map-viewport>
            <div className={css.worldSpacer} style={spacerStyle}>
              <div className={css.world} style={worldStyle}>
                <svg
                  className={css.edges}
                  viewBox={`0 0 ${layout.width} ${layout.height}`}
                  aria-hidden="true"
                >
                  {map.edges.map((edge) => {
                    const from = layout.positions[edge.from]
                    const to = layout.positions[edge.to]
                    /* v8 ignore next -- layout is derived from this exact edge/node map and positions every endpoint. */
                    if (from === undefined || to === undefined) return null
                    return (
                      <path
                        key={edge.id}
                        d={graphPath(from, to)}
                        className={clsx(
                          css.edge,
                          map.activePathEdgeIds.has(edge.id) && css.activeEdge,
                          currentEdgePath.has(edge.id) && css.currentEdge,
                        )}
                        data-kind={edge.kind}
                      />
                    )
                  })}
                </svg>
                {map.nodes.map((node) => {
                  const point = layout.positions[node.id]
                  /* v8 ignore next -- layout is derived from this exact node list and positions every node. */
                  if (point === undefined) return null
                  const style = {
                    '--task-node-x': `${point.x}px`,
                    '--task-node-y': `${point.y}px`,
                  } as CSSProperties
                  const isSelected = selected.id === node.id
                  const onCurrentPath = currentNodePath.has(node.id)
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={clsx(
                        css.node,
                        isSelected && css.selectedNode,
                        node.id === map.currentNodeId && css.currentNode,
                        onCurrentPath && css.pathNode,
                      )}
                      style={style}
                      data-node-id={node.id}
                      data-kind={node.kind}
                      data-status={node.status}
                      aria-pressed={isSelected}
                      onClick={() => { setSelectedOverride(node.id) }}
                    >
                      <span className={css.nodeMeta}>
                        <span>{t(nodeKindKey(node.kind))}</span>
                        <span className={css.statusDot} aria-hidden="true" />
                      </span>
                      <strong>{nodeTitle(node, t)}</strong>
                      <small>{node.detail ?? t(statusKey(node.status))}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          {map.stats.truncatedTools > 0 && (
            <p className={css.truncationNote}>
              {t('graph.truncatedTools', { count: map.stats.truncatedTools })}
            </p>
          )}
        </section>

        <aside className={css.knowledgePanel} aria-labelledby="task-knowledge-title">
          <div className={css.knowledgeHeader}>
            <div>
              <h3 id="task-knowledge-title">{t('knowledge.title')}</h3>
              <p>{t('knowledge.forNode', { node: nodeTitle(selected, t) })}</p>
            </div>
            <span className={css.selectedStatus} data-status={selected.status}>
              {t(statusKey(selected.status))}
            </span>
          </div>
          {selected.knowledgeScope === 'delegation' && (
            <p className={css.scopeNotice}>{t('knowledge.delegationOnly')}</p>
          )}
          <label className={css.search}>
            <span className={css.srOnly}>{t('toolbar.search')}</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              placeholder={t('toolbar.searchPlaceholder')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
          <div className={css.knowledgeList} data-knowledge-list>
            {selectedItems.length === 0
              ? <p className={css.emptyKnowledge}>{t('knowledge.empty')}</p>
              : selectedItems.map(item => (
                <article
                  key={item.id}
                  className={css.knowledgeItem}
                  data-kind={item.kind}
                  data-state={item.state}
                >
                  <div className={css.knowledgeItemHeader}>
                    <span className={css.knowledgeKind}>{t(knowledgeKindKey(item.kind))}</span>
                    <span className={css.knowledgeState}>{t(knowledgeStateKey(item.state))}</span>
                  </div>
                  <strong>{item.label}</strong>
                  <p>{item.text || t('knowledge.noText')}</p>
                  <footer>
                    <span>{item.source}</span>
                    {item.seq !== null && <span>#{item.seq}</span>}
                  </footer>
                </article>
              ))}
          </div>
          {map.stats.truncatedKnowledge > 0 && (
            <p className={css.truncationNote}>
              {t('knowledge.truncated', { count: map.stats.truncatedKnowledge })}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
