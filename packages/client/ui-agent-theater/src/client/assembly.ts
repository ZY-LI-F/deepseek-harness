import type { AgentScene } from './scene.ts'

/** Text and reveal state rendered on the miniature assembly rail. */
export interface AssemblyBoard {
  word: 'DEEPSEEK' | 'DEEPDEEK'
  revealed: number
  cheers: boolean
}

/**
 * Derive the exact assembly-rail copy and bounded reveal count for one scene.
 * @param scene - Current semantic theater scene.
 * @param strikes - Number of completed hammer strikes.
 * @returns The word, reveal count, and optional celebration state to render.
 */
export function deriveAssemblyBoard(scene: AgentScene, strikes: number): AssemblyBoard {
  if (scene === 'error') return { word: 'DEEPDEEK', revealed: 8, cheers: true }
  if (scene === 'done') return { word: 'DEEPSEEK', revealed: 8, cheers: false }
  if (scene === 'idle') return { word: 'DEEPSEEK', revealed: 0, cheers: false }
  return {
    word: 'DEEPSEEK',
    revealed: Math.min(8, Math.max(0, Math.floor(strikes))),
    cheers: false,
  }
}
