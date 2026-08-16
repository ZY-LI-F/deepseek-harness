/** Pure activity-to-scene model: the deep Interface shared by rendering and tests. */
export type AgentScene =
  | 'idle' | 'thinking' | 'library' | 'terminal' | 'workbench'
  | 'web' | 'tools' | 'approval' | 'error' | 'done'

/** Minimal browser-session facts consumed by the pure scene selector. */
export interface AgentTheaterSignal {
  running: boolean
  pendingCount: number
  runningToolName?: string
  hasPartial: boolean
  hasError: boolean
}

const LIBRARY_WORDS = ['read', 'open', 'view', 'file', 'search', 'find', 'grep', 'glob', 'list']
const TERMINAL_WORDS = ['bash', 'shell', 'terminal', 'exec', 'command', 'powershell', 'pwsh']
const WORKBENCH_WORDS = ['write', 'edit', 'patch', 'replace', 'create', 'apply']
const WEB_WORDS = ['web', 'browser', 'fetch', 'http', 'search_query', 'image_query']

/**
 * Map an arbitrary tool registry name into one of four understandable workplaces.
 * @param name - Tool registry name supplied by the session projection.
 * @returns The matching work scene, or the generic tools scene for unknown names.
 */
export function sceneForTool(name: string): Exclude<AgentScene, 'idle' | 'thinking' | 'approval' | 'error' | 'done'> {
  const normalized = name.toLowerCase().replaceAll('-', '_')
  if (WEB_WORDS.some(word => normalized.includes(word))) return 'web'
  if (TERMINAL_WORDS.some(word => normalized.includes(word))) return 'terminal'
  if (WORKBENCH_WORDS.some(word => normalized.includes(word))) return 'workbench'
  if (LIBRARY_WORDS.some(word => normalized.includes(word))) return 'library'
  return 'tools'
}

/**
 * Select exactly one scene; human waits and errors outrank background activity.
 * @param signal - Folded session activity facts.
 * @returns The single semantic scene the theater should display.
 */
export function deriveAgentScene(signal: AgentTheaterSignal): AgentScene {
  if (signal.pendingCount > 0) return 'approval'
  if (signal.hasError && !signal.running) return 'error'
  if (signal.runningToolName !== undefined) return sceneForTool(signal.runningToolName)
  if (signal.running || signal.hasPartial) return 'thinking'
  return 'idle'
}
