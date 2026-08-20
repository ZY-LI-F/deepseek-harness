// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSnapshotStore, type SessionId, type SessionListState, type SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { makeTranslate, workspaceListState } from '@deepseek-ai/dsh-client-test-runtime'
import {
  deriveBuddyMood, hasRunningSession, PocketBuddy, shouldBuddySettleWithCaretaker, type PocketBuddyProps,
} from '../src/client/PocketBuddy.tsx'
import {
  BUDDY_ACTION_CATALOG,
  BUDDY_ACTION_DURATION_MS,
  BUDDY_CARETAKER_ROUTINE,
  BUDDY_COMBINATION_MAX_DURATION_MS,
  BUDDY_ROUTINE,
  BUDDY_ROUTINE_INTERVAL_MS,
  BUDDY_ROUTINE_SCENES,
  BUDDY_WALK_SPEED,
  chooseRandomBuddyTarget,
  compileBuddyRoutineSteps,
  deriveBuddyBeat,
  deriveBuddyBounds,
  deriveBuddyCaretakerDock,
  deriveBuddyCaretakerRoutineScene,
  deriveBuddyDirection,
  deriveBuddyGaitFrame,
  deriveBuddyHeading,
  derivePawTrailPrint,
  derivePermutationCount,
  deriveBuddyRoutineScene,
  deriveTravelDuration,
  planBuddyActionCombination,
} from '../src/client/motion.ts'
import { zh } from '../src/client/locales.ts'
import { createPocketBuddyStore } from '../src/client/store.ts'
import {
  LONG_GROOMING_DURATION_MS,
  POUNCE_ANIMATION_DURATION_MS,
  SLEEP_SCENE_DURATION_MS,
  SLEEP_SCENE_FRAME_INDICES,
} from '../src/client/animationTiming.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const sid = (value: string): SessionId => value as SessionId

function summary(id: string, overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: sid(id), displayTitle: id, running: false, blank: false, updatedAt: 0, ...overrides,
  }
}

function list(...summaries: SessionSummary[]): SessionListState {
  return {
    ids: summaries.map(item => item.id),
    byId: Object.fromEntries(summaries.map(item => [item.id, item])),
    current: summaries[0]?.id,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function mount(initial = list(summary('s1', { blank: true }))) {
  const sessions = createSnapshotStore(initial)
  const workspaces = createSnapshotStore(workspaceListState())
  const buddy = createPocketBuddyStore().create()
  const props: PocketBuddyProps = {
    useSessions: bindSnapshotSelector(sessions),
    useWorkspaces: bindSnapshotSelector(workspaces),
    useStore: bindSnapshotSelector(buddy),
    actions: buddy.actions,
    t: makeTranslate(zh),
    setAudioEnabled: vi.fn(),
    playSound: vi.fn(),
  }
  const view = render(<PocketBuddy {...props} />)
  return { sessions, buddy, view }
}

describe('Pocket Buddy mood model', () => {
  it('keeps the mood vocabulary small and gives human waits priority over running work', () => {
    expect(deriveBuddyMood(list(summary('idle')))).toBe('idle')
    expect(deriveBuddyMood(list(summary('working', { running: true })))).toBe('working')
    expect(deriveBuddyMood(list(summary('done', { completed: true })))).toBe('celebrate')
    expect(deriveBuddyMood(list(summary('wait', { running: true, pendingInteraction: 'approval' })))).toBe('needs-you')
  })

  it('sees background work even when the current Session is idle', () => {
    const state = list(summary('current'), summary('background', { running: true }))
    expect(hasRunningSession(state)).toBe(true)
    expect(deriveBuddyMood(state)).toBe('working')
  })

  it('reunites the cat with the caretaker only for a paused or completed current task', () => {
    expect(shouldBuddySettleWithCaretaker(list(summary('blank', { blank: true })))).toBe(false)
    expect(shouldBuddySettleWithCaretaker(list(summary('paused')))).toBe(true)
    expect(shouldBuddySettleWithCaretaker(list(summary('done', { completed: true })))).toBe(true)
    expect(shouldBuddySettleWithCaretaker(list(summary('working', { running: true })))).toBe(false)
    expect(shouldBuddySettleWithCaretaker(list(summary('approval', {
      pendingInteraction: 'approval',
    })))).toBe(false)
  })
})

describe('Pocket Buddy continuous motion model', () => {
  it('keeps expressive actions without prescribing screen waypoints', () => {
    expect(BUDDY_ROUTINE.map(beat => beat.action)).toEqual(expect.arrayContaining([
      'wander', 'rest', 'sleep', 'lick-paw', 'wash-face', 'stretch',
      'chase-ball', 'look-left',
    ]))
    expect(BUDDY_ROUTINE.filter(beat => beat.action === 'wander')).toHaveLength(1)
    expect(BUDDY_ACTION_CATALOG).toHaveLength(7)
    expect(derivePermutationCount(7, 2)).toBe(42)
    expect(derivePermutationCount(7, 3)).toBe(210)
    expect(BUDDY_ROUTINE_SCENES.some(scene => scene.permutationSize === 2)).toBe(true)
    expect(BUDDY_ROUTINE_SCENES.some(scene => scene.permutationSize === 3)).toBe(true)
    expect(BUDDY_ROUTINE_SCENES.filter(scene => scene.category === 'roaming')).toHaveLength(1)
    expect(BUDDY_ROUTINE.every(beat => !('waypoint' in beat))).toBe(true)
    expect(deriveBuddyRoutineScene(BUDDY_ROUTINE_SCENES.length - 1).actions).toEqual(['wander'])
    expect(deriveBuddyBeat('working', 3)).toEqual({ action: 'work' })
    expect(deriveBuddyBeat('needs-you', 3)).toEqual({ action: 'hop' })
    expect(deriveBuddyBeat('celebrate', 3)).toEqual({ action: 'celebrate' })
    expect(deriveBuddyBeat('idle', BUDDY_ROUTINE.length + 1)).toEqual(BUDDY_ROUTINE[1])
  })

  it('builds constrained pairs and P(n,m) triples without posture-breaking cuts', () => {
    for (let seed = 0; seed < 24; seed += 1) {
      const size = seed % 2 === 0 ? 2 : 3
      const scene = planBuddyActionCombination(seed, { size })
      expect(scene.actions).toHaveLength(size)
      expect(new Set(scene.actions).size).toBe(size)
      expect(scene.combinationNotation).toBe(`P(7,${size})`)
      expect(scene.theoreticalPermutationCount).toBe(size === 2 ? 42 : 210)
      expect(scene.transitionCount).toBe(scene.steps.filter(step => step.role === 'transition').length)
      expect(scene.transitionCount).toBeGreaterThan(0)
      expect(scene.totalDurationMs).toBeLessThanOrEqual(BUDDY_COMBINATION_MAX_DURATION_MS)
      expect(scene.poseFlow.split('>')[0]).toBe('standing')
      expect(scene.poseFlow.split('>').at(-1)).toBe('standing')
      const sleepIndex = scene.actions.indexOf('sleep')
      if (sleepIndex >= 0) expect(sleepIndex).toBe(scene.actions.length - 1)
    }
  })

  it('keeps adjacent seated actions seated until the whole group is finished', () => {
    const rest = BUDDY_ACTION_CATALOG.find(item => item.action === 'rest')
    const lick = BUDDY_ACTION_CATALOG.find(item => item.action === 'lick-paw')
    expect(rest).toBeDefined()
    expect(lick).toBeDefined()
    const steps = compileBuddyRoutineSteps([rest!, lick!])
    expect(steps.map(step => step.action)).toEqual([
      'sit-down', 'seated-rest', 'seated-settle', 'seated-lick-paw', 'stand-up',
    ])
  })

  it('samples arbitrary coordinates inside one continuous screen-safe rectangle', () => {
    const bounds = deriveBuddyBounds(1280, 720, 214, 198)
    expect(bounds).toEqual({ minX: 24, maxX: 1042, minY: 76, maxY: 410 })
    const target = chooseRandomBuddyTarget({ x: 1000, y: 400 }, bounds, .23, .61, .4)
    expect(target.x).toBeCloseTo(258.14, 2)
    expect(target.y).toBeCloseTo(279.74, 2)
    expect(target.x).toBeGreaterThan(bounds.minX)
    expect(target.x).toBeLessThan(bounds.maxX)
  })

  it('derives a responsive lower-left dock immediately beside the whale girl', () => {
    const desktop = deriveBuddyCaretakerDock(1280, 720, 214, 198)
    expect(desktop.x).toBeCloseTo(43.41, 2)
    expect(desktop.y).toBe(458)
    const compact = deriveBuddyCaretakerDock(390, 700, 176, 163)
    expect(compact.x).toBeCloseTo(89.2, 2)
    expect(compact.y).toBe(467)
  })

  it('keeps caretaker-side routines stationary and makes rest the dominant action', () => {
    expect(BUDDY_CARETAKER_ROUTINE.filter(action => action === 'rest').length)
      .toBeGreaterThanOrEqual(BUDDY_CARETAKER_ROUTINE.length / 2)
    expect(BUDDY_CARETAKER_ROUTINE).not.toContain('wander')
    expect(BUDDY_CARETAKER_ROUTINE).not.toContain('chase-ball')
    const scenes = BUDDY_CARETAKER_ROUTINE.map((_, tick) => deriveBuddyCaretakerRoutineScene(tick))
    expect(scenes.find(scene => scene.actions[0] === 'rest')?.steps.map(step => step.action))
      .toEqual(['sleeping-rest'])
    expect(scenes.find(scene => scene.actions[0] === 'lick-paw')?.steps.map(step => step.action))
      .toEqual(['wake-up', 'sit-down', 'seated-lick-paw', 'stand-up', 'lie-down'])
    expect(scenes.find(scene => scene.actions[0] === 'stretch')?.steps.map(step => step.action))
      .toEqual(['wake-up', 'stretch', 'lie-down'])
  })

  it('redirects a short sample without snapping to a named anchor', () => {
    const bounds = { minX: 24, maxX: 1042, minY: 76, maxY: 410 }
    const target = chooseRandomBuddyTarget({ x: 520, y: 240 }, bounds, .49, .49, .37)
    expect(Math.hypot(target.x - 520, target.y - 240)).toBeGreaterThan(240)
    expect(target.x).not.toBe(24)
    expect(target.x).not.toBe(1042)
  })

  it('derives orientation and constant travel time from the actual vector', () => {
    const origin = { x: 100, y: 100 }
    expect(deriveBuddyDirection(origin, { x: 300, y: 260 }, 'left')).toBe('right')
    expect(deriveBuddyDirection(origin, { x: 20, y: 60 }, 'right')).toBe('left')
    expect(deriveBuddyDirection(origin, { x: 120, y: 280 }, 'left')).toBe('toward')
    expect(deriveBuddyDirection(origin, { x: 80, y: 0 }, 'right')).toBe('away')
    expect(deriveBuddyHeading(origin, { x: 300, y: 260 })).toBeCloseTo(Math.atan2(160, 200), 8)
    const one = deriveTravelDuration(origin, { x: 164, y: 100 })
    const two = deriveTravelDuration(origin, { x: 228, y: 100 })
    expect(one).toBe(1000)
    expect(two).toBe(2000)
    expect(BUDDY_WALK_SPEED).toBe(64)
  })

  it('binds the eight intact-cat gait frames to travelled distance', () => {
    expect(deriveBuddyGaitFrame(0)).toBe(0)
    expect(deriveBuddyGaitFrame(9)).toBe(1)
    expect(deriveBuddyGaitFrame(18)).toBe(2)
    expect(deriveBuddyGaitFrame(63)).toBe(7)
    expect(deriveBuddyGaitFrame(72)).toBe(0)
    expect(deriveBuddyGaitFrame(Number.NaN)).toBe(0)
  })

  it('emits alternating prints at actual gait contact positions', () => {
    const left = derivePawTrailPrint({ x: 100, y: 80 }, 214, 198, 0, 0)
    const right = derivePawTrailPrint({ x: 132, y: 80 }, 214, 198, 0, 1)
    expect(left).toMatchObject({ id: 0, side: 'left', x: 207, rotation: 90 })
    expect(right).toMatchObject({ id: 1, side: 'right', x: 239, rotation: 90 })
    expect(left.y).toBeCloseTo(249.22, 8)
    expect(right.y).toBeCloseTo(263.22, 8)
  })
})

describe('PocketBuddy presentation', () => {
  it('renders the reviewed idle-alive cels with no articulated cutout pieces', () => {
    const b = mount()
    expect(b.view.container.querySelector('[data-cat-actor]')).toBeTruthy()
    const sequence = b.view.container.querySelector('[data-cat-style="complete-character-cel-animation"]')
    expect(sequence?.getAttribute('data-renderer')).toBe('dom-raster-cels')
    expect(sequence?.getAttribute('data-source-image')).toBe('peach-cat-cels-v5+v6+v7')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('idle-alive')
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(8)
    expect(b.view.container.querySelector('[data-cel-frame="0"]')?.getAttribute('data-frame-scale')).toBe('0.5541')
    expect(b.view.container.querySelectorAll('[data-rig-layer]')).toHaveLength(0)
    expect(b.view.container.querySelectorAll('[data-rig-joint]')).toHaveLength(0)
    expect(b.view.container.querySelector('canvas')).toBeNull()
    expect(b.view.container.querySelector('svg')).toBeNull()
  })

  it('declares free random roaming and distance-bound gait instead of a route graph', () => {
    const b = mount()
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    const actor = b.view.container.querySelector('[data-buddy-actor]')
    expect(root?.getAttribute('data-path-model')).toBe('continuous-random')
    expect(root?.hasAttribute('data-waypoint')).toBe(false)
    expect(actor?.getAttribute('data-motion-model')).toBe('linear-distance-bound-complete-cels')
  })

  it('opens the wardrobe, switches skin, and toggles persistent motion through store actions', () => {
    const b = mount()
    expect(screen.getByRole('status').textContent).toBe('在等你安排任务')
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    expect(screen.getByRole('dialog', { name: '口袋搭子' })).toBeTruthy()

    const coatPreviews = b.view.container.querySelectorAll('[data-cat-choice-preview]')
    expect(coatPreviews).toHaveLength(3)
    expect(Array.from(coatPreviews, preview => preview.getAttribute('data-cat-choice-preview'))).toEqual([
      'peach-cat', 'sea-bun', 'night-jelly',
    ])

    fireEvent.click(screen.getByRole('button', { name: '云朵猫' }))
    expect(b.view.container.querySelector('[data-pocket-buddy]')?.getAttribute('data-skin')).toBe('sea-bun')
    expect(screen.getByRole('button', { name: '云朵猫' }).getAttribute('aria-pressed')).toBe('true')
    expect(b.view.container.querySelector('[data-cat-material="sea-bun"]')?.getAttribute('data-target-visual-edge-px')).toBe('100')
    expect(b.view.container.querySelector('[data-cat-material="sea-bun"] [data-character-scale]')?.getAttribute('data-character-scale')).toBe('frame-normalized-100px-max-edge')
    const cloudIdleScale = Number(b.view.container.querySelector<HTMLElement>('[data-cat-material="sea-bun"] [data-frame-scale]')?.dataset.frameScale)
    expect(cloudIdleScale * 343 / 348 * 198).toBeCloseTo(100, 1)

    fireEvent.click(screen.getByRole('button', { name: '动态效果' }))
    expect(b.view.container.querySelector('[data-pocket-buddy]')?.getAttribute('data-motion')).toBe('off')
    expect(screen.getByRole('button', { name: '动态效果' }).getAttribute('aria-pressed')).toBe('false')

    expect(b.view.container.querySelector('[data-pocket-buddy]')?.getAttribute('data-sound')).toBe('muted')
    fireEvent.click(screen.getByRole('button', { name: '声音（默认静音）' }))
    expect(b.view.container.querySelector('[data-pocket-buddy]')?.getAttribute('data-sound')).toBe('on')

    fireEvent.click(screen.getByRole('button', { name: '关闭口袋搭子衣橱' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('answers a click with a dedicated six-frame whole-cat reaction', () => {
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    expect(root?.getAttribute('data-action')).toBe('respond')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('click-response')
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(6)
  })

  it('keeps the left-attention action side-on without a reverse-body cel', () => {
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '看看左边' }))
    expect(b.view.container.querySelector('[data-pocket-buddy]')?.getAttribute('data-action')).toBe('look-left')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('look-left')
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(6)
  })

  it('switches between reviewed whole-body grooming and gait cel sets', () => {
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '舔爪爪' }))
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    expect(root?.getAttribute('data-action')).toBe('lick-paw')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('grooming')
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(12)
    expect(b.view.container.querySelectorAll('[data-rig-layer]')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '丢毛球' }))
    expect(root?.getAttribute('data-action')).toBe('chase-ball')
    expect(root?.getAttribute('data-path-model')).toBe('continuous-random')
    expect(root?.getAttribute('data-action-path')).toBe('screen-safe-pursuit')
    expect(Number(root?.getAttribute('data-chase-distance'))).toBeGreaterThan(0)
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('pounce')
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(12)
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-character-scale')).toBe('frame-normalized-100px-max-edge')
    const pounceScales = [...b.view.container.querySelectorAll<HTMLElement>('[data-cel-frame]')]
      .map(frame => Number(frame.dataset.frameScale))
    expect(new Set(pounceScales).size).toBeGreaterThan(6)
    expect((pounceScales[0] ?? 0) * 199 / 384 * 198).toBeCloseTo(100, 1)
    expect((pounceScales[6] ?? 0) * 346 / 384 * 198).toBeCloseTo(100, 1)
    expect(b.view.container.querySelector('[data-cat-material="peach-cat"]')?.getAttribute('data-display-scale')).toBe('0.5541')
    expect(b.view.container.querySelector('[data-cat-material="peach-cat"]')?.getAttribute('data-target-visual-edge-px')).toBe('100')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-frame-hold-model')).toBe('authored')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-animation-duration-ms')).toBe(String(POUNCE_ANIMATION_DURATION_MS))
  })

  it('combines sitting, paw licking, and face washing into one long grooming scene', () => {
    vi.useFakeTimers()
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '洗洗脸' }))
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    const sequence = b.view.container.querySelector('[data-cel-set]')

    expect(root?.getAttribute('data-action')).toBe('wash-face')
    expect(sequence?.getAttribute('data-cel-set')).toBe('sit-lick-wash')
    expect(sequence?.getAttribute('data-frame-hold-model')).toBe('authored')
    expect(sequence?.getAttribute('data-animation-duration-ms')).toBe(String(LONG_GROOMING_DURATION_MS))
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(26)

    act(() => { vi.advanceTimersByTime(2700) })
    expect(root?.getAttribute('data-action')).toBe('wash-face')
    act(() => { vi.advanceTimersByTime(LONG_GROOMING_DURATION_MS - 2700) })
    expect(root?.getAttribute('data-action')).not.toBe('wash-face')
  })

  it('runs every compiled posture step in a generated pair without an unrequested walk', () => {
    vi.useFakeTimers()
    const b = mount()
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    const scene = deriveBuddyRoutineScene(0)
    const first = scene.steps[0]
    expect(first).toBeDefined()

    act(() => { vi.advanceTimersByTime(BUDDY_ROUTINE_INTERVAL_MS) })
    expect(root?.getAttribute('data-routine-scene')).toBe(scene.id)
    expect(root?.getAttribute('data-routine-combination')).toBe('P(7,2)')
    expect(root?.getAttribute('data-routine-combination-size')).toBe('2')
    expect(root?.getAttribute('data-routine-transition-count')).toBe(String(scene.transitionCount))
    expect(root?.getAttribute('data-routine-playback')).toBe(scene.steps.map(step => step.action).join('>'))
    expect(root?.getAttribute('data-action')).toBe(first?.action)

    scene.steps.forEach((step, index) => {
      expect(root?.getAttribute('data-action')).toBe(step.action)
      act(() => { vi.advanceTimersByTime(step.durationMs) })
      const next = scene.steps[index + 1]
      if (next !== undefined) expect(root?.getAttribute('data-action')).toBe(next.action)
    })
    expect(root?.hasAttribute('data-routine-scene')).toBe(false)
    expect(root?.getAttribute('data-travel-mode')).toBe('idle')
  })

  it('lies down, shows restrained Z motion, and returns through wake-up cels', () => {
    vi.useFakeTimers()
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '趴下睡觉' }))
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    const sequence = b.view.container.querySelector('[data-cel-set]')

    expect(root?.getAttribute('data-action')).toBe('sleep')
    expect(sequence?.getAttribute('data-cel-set')).toBe('lie-sleep-wake')
    expect(sequence?.getAttribute('data-animation-duration-ms')).toBe(String(SLEEP_SCENE_DURATION_MS))
    expect(b.view.container.querySelectorAll('[data-cel-frame]')).toHaveLength(SLEEP_SCENE_FRAME_INDICES.length)
    expect(b.view.container.querySelector('[data-sleep-dream="soft-z"]')?.textContent).toBe('Zzz')

    act(() => { vi.advanceTimersByTime(SLEEP_SCENE_DURATION_MS) })
    expect(root?.getAttribute('data-action')).not.toBe('sleep')
    expect(b.view.container.querySelector('[data-sleep-dream]')).toBeNull()
  })

  it('keeps the longer chase active through anticipation, launch, and catch', () => {
    vi.useFakeTimers()
    const b = mount()
    fireEvent.click(screen.getByRole('button', { name: '打开口袋搭子衣橱' }))
    fireEvent.click(screen.getByRole('button', { name: '丢毛球' }))
    const root = b.view.container.querySelector('[data-pocket-buddy]')

    act(() => { vi.advanceTimersByTime(1800) })
    expect(root?.getAttribute('data-action')).toBe('chase-ball')
    expect(b.view.container.querySelector('[data-cel-frame][data-active="true"]')?.getAttribute('data-cel-frame')).toBe('6')

    act(() => { vi.advanceTimersByTime(POUNCE_ANIMATION_DURATION_MS - 1800) })
    expect(root?.getAttribute('data-action')).not.toBe('chase-ball')
  })

  it('keeps complete-cel locomotion active while a task is running', () => {
    const b = mount(list(summary('working', { running: true })))
    const buddy = b.view.container.querySelector('[data-pocket-buddy]')
    expect(buddy?.getAttribute('data-task-motion')).toBe('continuous-roaming')
    expect(buddy?.getAttribute('data-path-model')).toBe('continuous-random')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).not.toBe('mood-focused')
    expect(b.view.container.querySelectorAll('[data-cel-frame]').length).toBeGreaterThan(1)
    expect(b.view.container.querySelectorAll('[data-rig-layer]')).toHaveLength(0)
  })

  it('walks to the whale girl after pause, then keeps a sleep-first stationary routine', () => {
    vi.useFakeTimers()
    const b = mount(list(summary('s1', { running: true })))
    expect(screen.getByRole('status').getAttribute('data-speech-anchor')).toBe('cat-head')
    expect(screen.getByRole('status').textContent).toBe('正在认真上班')
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    act(() => {
      b.sessions.set(list(summary('s1')))
    })
    expect(screen.getByRole('status').textContent).toBe('任务完成啦')
    expect(root?.getAttribute('data-companion-mode')).toBe('docking')
    expect(root?.getAttribute('data-companion-anchor')).toBe('whale-girl')
    expect(root?.getAttribute('data-return-path-model')).toBe('direct-to-caretaker')
    expect(root?.getAttribute('data-task-motion')).toBe('caretaker-docking')
    expect(root?.getAttribute('data-action')).toBe('wander')

    act(() => { b.buddy.actions.setMotion(false) })
    expect(root?.getAttribute('data-companion-mode')).toBe('resting')
    expect(root?.getAttribute('data-task-motion')).toBe('caretaker-rest')
    expect(root?.getAttribute('data-action')).toBe('sleeping-rest')
    expect(root?.getAttribute('data-gaze')).toBe('asleep')
    expect(b.view.container.querySelector('[data-cel-set]')?.getAttribute('data-cel-set')).toBe('sleeping-rest')
    const expectedDock = deriveBuddyCaretakerDock(window.innerWidth, window.innerHeight, 214, 198)
    expect(Number(b.view.container.querySelector('[data-buddy-actor]')?.getAttribute('data-position-x')))
      .toBeCloseTo(expectedDock.x, 1)

    act(() => { vi.advanceTimersByTime(2400) })
    expect(screen.getByRole('status').textContent).toBe('在等你安排任务')

    act(() => { b.sessions.set(list(summary('s1', { running: true }))) })
    expect(root?.getAttribute('data-companion-mode')).toBe('roaming')
    expect(root?.getAttribute('data-companion-anchor')).toBeNull()
  })

  it('finishes the direct return route before sitting beside the caretaker', () => {
    vi.useFakeTimers()
    const b = mount(list(summary('s1', { running: true })))
    const root = b.view.container.querySelector('[data-pocket-buddy]')
    const actor = b.view.container.querySelector('[data-buddy-actor]')
    act(() => { b.sessions.set(list(summary('s1'))) })
    expect(root?.getAttribute('data-companion-mode')).toBe('docking')

    act(() => { vi.advanceTimersByTime(15_000) })
    expect(root?.getAttribute('data-companion-mode')).toBe('settling')
    expect(root?.getAttribute('data-action')).toBe('lie-down')
    act(() => { vi.advanceTimersByTime(BUDDY_ACTION_DURATION_MS['lie-down'] ?? 3440) })

    const expectedDock = deriveBuddyCaretakerDock(window.innerWidth, window.innerHeight, 214, 198)
    expect(root?.getAttribute('data-companion-mode')).toBe('resting')
    expect(root?.getAttribute('data-travel-mode')).toBe('idle')
    expect(root?.getAttribute('data-action')).toBe('sleeping-rest')
    expect(root?.getAttribute('data-direction')).toBe('left')
    expect(Number(actor?.getAttribute('data-position-x'))).toBeCloseTo(expectedDock.x, 1)
    expect(Number(actor?.getAttribute('data-position-y'))).toBeCloseTo(expectedDock.y, 1)

    act(() => { b.sessions.set(list(summary('s1', { running: true }))) })
    expect(root?.getAttribute('data-companion-mode')).toBe('waking')
    expect(root?.getAttribute('data-action')).toBe('wake-up')
    expect(root?.getAttribute('data-task-motion')).toBe('caretaker-waking')
    act(() => { vi.advanceTimersByTime(BUDDY_ACTION_DURATION_MS['wake-up'] ?? 2360) })
    expect(root?.getAttribute('data-companion-mode')).toBe('roaming')
    expect(root?.getAttribute('data-companion-anchor')).toBeNull()
  })
})
