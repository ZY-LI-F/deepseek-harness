// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSnapshotStore, type RunningToolCall, type SessionId,
} from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { conversationSnapshot, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { AgentTheater, type AgentTheaterProps } from '../src/client/AgentTheater.tsx'
import { zh } from '../src/client/locales.ts'
import { deriveAssemblyBoard } from '../src/client/assembly.ts'
import { deriveAgentScene, sceneForTool } from '../src/client/scene.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const sid = 's1' as SessionId

function runningTool(name: string): RunningToolCall {
  return { callId: 'c1', name, argsRaw: '{}', turn: 1, step: 1, time: 0, callView: null, subCalls: [] }
}

function mount(overrides: Partial<ReturnType<typeof conversationSnapshot>> = {}) {
  const snapshot = createSnapshotStore({ ...conversationSnapshot(sid), ...overrides })
  const playSound = vi.fn()
  const props = {
    sessionId: sid,
    useSession: bindSnapshotSelector(snapshot),
    useProjection: () => undefined,
    t: makeTranslate(zh),
    playSound,
  } as unknown as AgentTheaterProps
  const view = render(<AgentTheater {...props} />)
  return { snapshot, view, playSound }
}

describe('Agent Theater scene model', () => {
  it('classifies tool registry names into friendly workplaces', () => {
    expect(sceneForTool('fs_read')).toBe('library')
    expect(sceneForTool('exec_command')).toBe('terminal')
    expect(sceneForTool('apply-patch')).toBe('workbench')
    expect(sceneForTool('web.search_query')).toBe('web')
    expect(sceneForTool('custom_magic')).toBe('tools')
  })

  it('prioritizes human waits, then terminal errors, then live work', () => {
    expect(deriveAgentScene({ running: true, pendingCount: 1, runningToolName: 'bash', hasPartial: false, hasError: false })).toBe('approval')
    expect(deriveAgentScene({ running: false, pendingCount: 0, hasPartial: false, hasError: true })).toBe('error')
    expect(deriveAgentScene({ running: true, pendingCount: 0, runningToolName: 'fs_read', hasPartial: false, hasError: false })).toBe('library')
    expect(deriveAgentScene({ running: true, pendingCount: 0, hasPartial: false, hasError: false })).toBe('thinking')
    expect(deriveAgentScene({ running: false, pendingCount: 0, hasPartial: true, hasError: false })).toBe('thinking')
    expect(deriveAgentScene({ running: false, pendingCount: 0, hasPartial: false, hasError: false })).toBe('idle')
  })
})

describe('DeepSeek assembly board', () => {
  it('reveals the exact DEEPSEEK word one strike at a time', () => {
    expect(deriveAssemblyBoard('terminal', 3)).toEqual({ word: 'DEEPSEEK', revealed: 3, cheers: false })
    expect(deriveAssemblyBoard('done', 2)).toEqual({ word: 'DEEPSEEK', revealed: 8, cheers: false })
  })

  it('uses the intentional DEEPDEEK toast gag only for the error scene', () => {
    expect(deriveAssemblyBoard('error', 1)).toEqual({ word: 'DEEPDEEK', revealed: 8, cheers: true })
    expect(deriveAssemblyBoard('idle', 8)).toEqual({ word: 'DEEPSEEK', revealed: 0, cheers: false })
  })
})

describe('AgentTheater presentation', () => {
  it('renders the current tool scene without exposing tool arguments', () => {
    const call = { ...runningTool('exec_command'), argsRaw: '{"secret":"never render me"}' }
    const b = mount({ running: true, runningCalls: [call] })
    expect(screen.getByRole('status').textContent).toBe('正在操作工具台')
    expect(b.view.container.querySelector('[data-agent-theater]')?.getAttribute('data-scene')).toBe('terminal')
    expect(b.view.container.textContent).not.toContain('secret')
  })

  it('animates one exact letter per hammer beat while work is running', () => {
    vi.useFakeTimers()
    const b = mount({ running: true, runningCalls: [runningTool('exec_command')] })
    act(() => { vi.advanceTimersByTime(1260) })
    const root = b.view.container.querySelector('[data-agent-theater]')
    expect(root?.getAttribute('data-word')).toBe('DEEPSEEK')
    expect(root?.getAttribute('data-built-letters')).toBe('3')
    expect(b.view.container.querySelectorAll('[data-letter-state="visible"]')).toHaveLength(3)
    expect(b.playSound).toHaveBeenCalledTimes(3)
    expect(b.playSound).toHaveBeenLastCalledWith('hammer')
  })

  it('shows the intentional DEEPDEEK toast when the Session ends in error', () => {
    const b = mount({ lastAgentError: { message: 'boom' } as never })
    const root = b.view.container.querySelector('[data-agent-theater]')
    expect(root?.getAttribute('data-word')).toBe('DEEPDEEK')
    expect(root?.getAttribute('data-built-letters')).toBe('8')
    expect(screen.getByText('干杯！')).toBeTruthy()
    expect(b.playSound).toHaveBeenCalledWith('cheers')
  })

  it('shows the completion stamp briefly when a running Session settles', () => {
    vi.useFakeTimers()
    const b = mount({ running: true })
    expect(screen.getByRole('status').textContent).toBe('正在白板前整理思路')
    act(() => { b.snapshot.set({ ...conversationSnapshot(sid), running: false }) })
    expect(screen.getByRole('status').textContent).toBe('DEEPSEEK 完工，举杯收工')
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.getByRole('status').textContent).toBe('工位空闲，随时可以开工')
  })
})
