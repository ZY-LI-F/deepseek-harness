/** Dictionary namespace owned by the task and knowledge map. */
export const NS = 'task-knowledge-map'

/** Stable dictionary keys shared by both locales. */
export type TaskKnowledgeMapKey =
  | 'view.label'
  | 'view.title'
  | 'view.subtitle'
  | 'view.observableNotice'
  | 'toolbar.zoomIn'
  | 'toolbar.zoomOut'
  | 'toolbar.resetZoom'
  | 'toolbar.followCurrent'
  | 'toolbar.search'
  | 'toolbar.searchPlaceholder'
  | 'summary.currentPosition'
  | 'summary.turns'
  | 'summary.steps'
  | 'summary.tools'
  | 'summary.agents'
  | 'summary.knowledge'
  | 'node.agent'
  | 'node.turn'
  | 'node.step'
  | 'node.workflow'
  | 'node.phase'
  | 'node.subagent'
  | 'node.tool'
  | 'node.ungrouped'
  | 'node.turnTitle'
  | 'node.stepTitle'
  | 'status.active'
  | 'status.completed'
  | 'status.failed'
  | 'status.waiting'
  | 'status.unknown'
  | 'path.idle'
  | 'path.multiple'
  | 'knowledge.title'
  | 'knowledge.forNode'
  | 'knowledge.empty'
  | 'knowledge.noText'
  | 'knowledge.delegationOnly'
  | 'knowledge.truncated'
  | 'knowledge.kind.requirement'
  | 'knowledge.kind.context'
  | 'knowledge.kind.memory'
  | 'knowledge.kind.tool'
  | 'knowledge.kind.conclusion'
  | 'knowledge.kind.compaction'
  | 'knowledge.kind.issue'
  | 'knowledge.kind.pending'
  | 'knowledge.kind.delegation'
  | 'knowledge.state.available'
  | 'knowledge.state.observed'
  | 'knowledge.state.compacted'
  | 'knowledge.state.pending'
  | 'knowledge.state.error'
  | 'graph.truncatedTools'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Task graph, current position, and observable information provenance. */
    'task-knowledge-map': TaskKnowledgeMapKey
  }
}

/** Simplified Chinese dictionary. */
export const zh: Record<TaskKnowledgeMapKey, string> = {
  'view.label': '任务地图',
  'view.title': '任务路径与知情位置',
  'view.subtitle': '沿着执行分支查看当前节点、信息来源和上下文压缩状态',
  'view.observableNotice': '只展示可观测上下文与来源，不读取或推断模型的隐藏思维。',
  'toolbar.zoomIn': '放大任务图',
  'toolbar.zoomOut': '缩小任务图',
  'toolbar.resetZoom': '重置缩放',
  'toolbar.followCurrent': '跟随当前',
  'toolbar.search': '搜索知情项目',
  'toolbar.searchPlaceholder': '搜索来源或内容',
  'summary.currentPosition': '当前位置',
  'summary.turns': '{count} 轮',
  'summary.steps': '{count} 步',
  'summary.tools': '{count} 个工具',
  'summary.agents': '{count} 个代理',
  'summary.knowledge': '{count} 条信息',
  'node.agent': 'Agent',
  'node.turn': '轮次',
  'node.step': '步骤',
  'node.workflow': '工作流',
  'node.phase': '阶段',
  'node.subagent': '子代理',
  'node.tool': '工具',
  'node.ungrouped': '未分组',
  'node.turnTitle': '第 {turn} 轮',
  'node.stepTitle': '第 {step} 步',
  'status.active': '执行中',
  'status.completed': '已完成',
  'status.failed': '失败',
  'status.waiting': '等待中',
  'status.unknown': '状态未知',
  'path.idle': '尚无已记录的执行位置',
  'path.multiple': '{count} 条分支同时活跃',
  'knowledge.title': '可观测知情状态',
  'knowledge.forNode': '截至 {node}',
  'knowledge.empty': '这个位置还没有可展示的信息来源。',
  'knowledge.noText': '已记录来源，但没有可预览的文本。',
  'knowledge.delegationOnly': '子代理内部上下文未在当前会话中展开；这里只展示可观测的委派任务和继承来源。',
  'knowledge.truncated': '为保持界面流畅，省略了 {count} 条较早信息。',
  'knowledge.kind.requirement': '用户要求',
  'knowledge.kind.context': '注入上下文',
  'knowledge.kind.memory': '记忆召回',
  'knowledge.kind.tool': '工具证据',
  'knowledge.kind.conclusion': '模型结论',
  'knowledge.kind.compaction': '上下文压缩',
  'knowledge.kind.issue': '异常与重试',
  'knowledge.kind.pending': '等待进入上下文',
  'knowledge.kind.delegation': '委派任务',
  'knowledge.state.available': '当前可用',
  'knowledge.state.observed': '已观察',
  'knowledge.state.compacted': '已压缩',
  'knowledge.state.pending': '待进入',
  'knowledge.state.error': '异常',
  'graph.truncatedTools': '已折叠 {count} 个较早工具节点',
}

/** English dictionary. */
export const en: Record<TaskKnowledgeMapKey, string> = {
  'view.label': 'Task Map',
  'view.title': 'Task Path & Knowledge Position',
  'view.subtitle': 'Inspect the current node, information sources, and compaction state along each execution branch',
  'view.observableNotice': 'Shows observable context and provenance only; hidden model reasoning is neither read nor inferred.',
  'toolbar.zoomIn': 'Zoom task map in',
  'toolbar.zoomOut': 'Zoom task map out',
  'toolbar.resetZoom': 'Reset zoom',
  'toolbar.followCurrent': 'Follow current',
  'toolbar.search': 'Search knowledge items',
  'toolbar.searchPlaceholder': 'Search source or content',
  'summary.currentPosition': 'Current position',
  'summary.turns': '{count} turns',
  'summary.steps': '{count} steps',
  'summary.tools': '{count} tools',
  'summary.agents': '{count} agents',
  'summary.knowledge': '{count} items',
  'node.agent': 'Agent',
  'node.turn': 'Turn',
  'node.step': 'Step',
  'node.workflow': 'Workflow',
  'node.phase': 'Phase',
  'node.subagent': 'Subagent',
  'node.tool': 'Tool',
  'node.ungrouped': 'Ungrouped',
  'node.turnTitle': 'Turn {turn}',
  'node.stepTitle': 'Step {step}',
  'status.active': 'Active',
  'status.completed': 'Completed',
  'status.failed': 'Failed',
  'status.waiting': 'Waiting',
  'status.unknown': 'Unknown',
  'path.idle': 'No recorded execution position yet',
  'path.multiple': '{count} branches active',
  'knowledge.title': 'Observable knowledge state',
  'knowledge.forNode': 'As of {node}',
  'knowledge.empty': 'This position has no observable information sources yet.',
  'knowledge.noText': 'The source is recorded without previewable text.',
  'knowledge.delegationOnly': 'The child context is not expanded in this session; only its observable delegated task and inheritance source are shown.',
  'knowledge.truncated': '{count} older items are omitted to keep the view responsive.',
  'knowledge.kind.requirement': 'User requirement',
  'knowledge.kind.context': 'Injected context',
  'knowledge.kind.memory': 'Memory recall',
  'knowledge.kind.tool': 'Tool evidence',
  'knowledge.kind.conclusion': 'Model conclusion',
  'knowledge.kind.compaction': 'Context compaction',
  'knowledge.kind.issue': 'Failure or retry',
  'knowledge.kind.pending': 'Pending context',
  'knowledge.kind.delegation': 'Delegated task',
  'knowledge.state.available': 'Available',
  'knowledge.state.observed': 'Observed',
  'knowledge.state.compacted': 'Compacted',
  'knowledge.state.pending': 'Pending',
  'knowledge.state.error': 'Error',
  'graph.truncatedTools': '{count} older tool nodes collapsed',
}
