// @vitest-environment jsdom
import {
  act, cleanup, render, screen, waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSnapshotStore, type ConversationSnapshot, type RunningToolCall, type SessionId,
} from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { conversationSnapshot, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'
import {
  deriveCaretakerTaskInterlude, deriveCaretakerWateringGeometry, deriveVineRingStates,
  deriveWateringGeometry, TaskGarden, VINE_RING_FADE_MS, VINE_RING_GROWTH_MS,
  VINE_RING_LIFETIME_MS, type TaskGardenProps,
} from '../src/client/TaskGarden.tsx'
import { deriveGardenGrowth } from '../src/client/growth.ts'
import {
  deriveResponsiveGardenLayout, pointOnRoundedGardenFrame,
} from '../src/client/layout.ts'
import { zh } from '../src/client/locales.ts'

const sid = 'garden-session' as SessionId
let measured = { width: 900, height: 360 }
let resize: ResizeObserverCallback | undefined

function rect(width: number, height: number): DOMRect {
  return {
    x: 0, y: 0, width, height, top: 0, right: width, bottom: height, left: 0,
    toJSON: () => ({}),
  }
}

beforeEach(() => {
  measured = { width: 900, height: 360 }
  resize = undefined
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback }
    observe(): void {}
    disconnect(): void {}
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function gardenBounds(this: HTMLElement) {
      return this.hasAttribute('data-task-garden') ? rect(measured.width, measured.height) : rect(0, 0)
    })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function notifyResize(width: number, height: number): void {
  measured = { width, height }
  act(() => {
    resize?.(
      [{ contentRect: rect(width, height) } as ResizeObserverEntry],
      {} as ResizeObserver,
    )
  })
}

function runningTool(callId: string, subCalls: readonly RunningToolCall[] = []): RunningToolCall {
  return {
    callId, name: 'exec_command', argsRaw: '{}', turn: 1, step: 1,
    time: 1_000, callView: null, subCalls,
  }
}

function mount(
  initialStats: SessionStatsProjection | undefined,
  turnCount = 0,
  overrides: Partial<ConversationSnapshot> = {},
) {
  const turnEnds = new Map(Array.from({ length: turnCount }, (_, index) => [index + 1, index + 100]))
  const snapshot = createSnapshotStore({
    ...conversationSnapshot(sid), turnEnds, ...overrides,
  })
  const statsRef = { current: initialStats }
  const playSound = vi.fn()
  const props = {
    sessionId: sid,
    useSession: bindSnapshotSelector(snapshot),
    useProjection: () => statsRef.current,
    t: makeTranslate(zh),
    playSound,
  } as unknown as TaskGardenProps
  const element = () => <TaskGarden {...props} />
  const view = render(element())
  const setStats = (next: SessionStatsProjection | undefined) => {
    statsRef.current = next
    act(() => { view.rerender(element()) })
  }
  return { snapshot, view, playSound, setStats }
}

const stats = (turns: number, steps = turns, activeMs = 0): SessionStatsProjection => ({
  turns, steps, llmMs: activeMs, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
})

describe('Task Garden growth model', () => {
  it('opens the first flower immediately, then one per two completed Steps', () => {
    expect(deriveGardenGrowth(0, 0)).toMatchObject({ stage: 'seed', flowers: 0, nextFlower: 1 })
    expect(deriveGardenGrowth(1, 1)).toMatchObject({ stage: 'sprout', flowers: 1, nextFlower: 2 })
    expect(deriveGardenGrowth(3, 4)).toMatchObject({ stage: 'sprout', flowers: 2, nextFlower: 3 })
    expect(deriveGardenGrowth(6, 8)).toMatchObject({ stage: 'leafy', flowers: 4, nextFlower: 5 })
    expect(deriveGardenGrowth(10, 14)).toMatchObject({ stage: 'budding', flowers: 7, nextFlower: 8 })
    expect(deriveGardenGrowth(10, 23)).toMatchObject({ stage: 'bloom', flowers: 12, nextFlower: null })
  })

  it('sanitizes inputs and bounds decorative density', () => {
    expect(deriveGardenGrowth(-4, -9)).toEqual({ stage: 'seed', leaves: 0, flowers: 0, nextFlower: 1 })
    expect(deriveGardenGrowth(999.8, 999.2)).toEqual({ stage: 'bloom', leaves: 12, flowers: 12, nextFlower: null })
  })
})

describe('responsive garden geometry', () => {
  it('keeps the base sampler clockwise and offsets the responsive path to the caretaker edge', () => {
    expect(pointOnRoundedGardenFrame(400, 200, 20, 0)).toEqual({
      x: 20, y: 0, angle: 180, edge: 'top',
    })
    const layout = deriveResponsiveGardenLayout(900, 360)
    expect(layout.slots.length).toBeGreaterThanOrEqual(12)
    expect(layout.slots.length).toBeLessThanOrEqual(36)
    expect(layout.slots[0]?.edge).toBe('left')
    expect(layout.slots[0]?.angle).toBe(90)
    expect(layout.start.x).toBe(0)
    expect(layout.start.y).toBeGreaterThan(layout.height / 2)
    expect(layout.slots.find(slot => slot.edge === 'bottom')?.angle).toBe(0)
    expect(layout.slots.every(slot => (
      slot.x >= 0 && slot.x <= layout.width && slot.y >= 0 && slot.y <= layout.height
    ))).toBe(true)
  })

  it('recomputes density and anchors without a fixed frame size', () => {
    const wide = deriveResponsiveGardenLayout(900, 360)
    const compact = deriveResponsiveGardenLayout(420, 230)
    expect(wide.slots.length).not.toBe(compact.slots.length)
    expect(wide.emitter.x).toBeGreaterThan(0)
    expect(wide.emitter.x).toBeLessThanOrEqual(112)
    expect(compact.emitter.x).toBeGreaterThan(0)
    expect(wide.emitter.y).toBe(wide.start.y)
    expect(compact.emitter.y).toBe(compact.start.y)
    expect(deriveResponsiveGardenLayout(Number.NaN, -1).slots).toEqual([])
  })

  it('lands water below the can and grows a curved starter vine into the nearest edge', () => {
    const layout = deriveResponsiveGardenLayout(900, 360)
    const water = deriveWateringGeometry(layout)
    expect(water.landingX).toBeGreaterThan(water.sourceX)
    expect(water.landingY).toBeGreaterThan(water.sourceY)
    expect(water.landingY).toBeLessThan(layout.height)
    expect(water.starterPath).toContain(`M ${water.landingX} ${water.landingY}`)
    expect(water.starterPath).toContain(`0 ${layout.start.y}`)
    expect(water.starterLength).toBeGreaterThan(water.landingX)
  })

  it('tracks the watering-can spout independently for every authored cel', () => {
    const anchors = Array.from({ length: 6 }, (_, frame) => deriveCaretakerWateringGeometry(frame))
    expect(new Set(anchors.map(anchor => `${anchor.sourceX},${anchor.sourceY}`)).size).toBeGreaterThan(1)
    expect(anchors.every(anchor => anchor.landingX > anchor.sourceX)).toBe(true)
    expect(anchors.every(anchor => anchor.landingY > anchor.sourceY)).toBe(true)
    expect(deriveCaretakerWateringGeometry(Number.NaN)).toEqual(anchors[0])
    expect(deriveCaretakerWateringGeometry(6)).toEqual(anchors[0])
  })
})

describe('rolling vine ring lifecycle', () => {
  it('grows a new style every ten minutes and retains no more than three rings', () => {
    expect(deriveVineRingStates(0, 3)).toMatchObject([
      { ordinal: 0, progress: 0, phase: 'growing', opacity: 1 },
    ])
    const tenMinutes = deriveVineRingStates(VINE_RING_GROWTH_MS, 3)
    expect(tenMinutes.map(ring => ring.ordinal)).toEqual([0, 1])
    expect(tenMinutes[0]).toMatchObject({ progress: 1, phase: 'mature' })
    expect(tenMinutes[1]).toMatchObject({ progress: 0, phase: 'growing' })
    expect(tenMinutes[0]?.styleVariant).not.toBe(tenMinutes[1]?.styleVariant)

    const thirtyMinutes = deriveVineRingStates(VINE_RING_LIFETIME_MS, 3)
    expect(thirtyMinutes.map(ring => ring.ordinal)).toEqual([1, 2, 3])
    expect(thirtyMinutes).toHaveLength(3)
  })

  it('softly removes a ring during its final minute', () => {
    const halfwayThroughFade = VINE_RING_LIFETIME_MS - VINE_RING_FADE_MS / 2
    const ring = deriveVineRingStates(halfwayThroughFade, 1)[0]
    expect(ring).toMatchObject({ ordinal: 0, progress: 1, phase: 'fading' })
    expect(ring?.opacity).toBeCloseTo(.5)
  })
})

describe('Whale Girl task choreography', () => {
  it('uses deterministic pseudo-random pauses to vary complete-character reactions', () => {
    const sequence = Array.from({ length: 18 }, (_, ordinal) => deriveCaretakerTaskInterlude(8162042, ordinal))
    expect(sequence.every(item => item.delayMs >= 5_500 && item.delayMs < 10_000)).toBe(true)
    expect(new Set(sequence.map(item => item.action))).toEqual(new Set(['admire', 'cheer', 'dance', 'wave']))
    expect(deriveCaretakerTaskInterlude(8162042, 3)).toEqual(deriveCaretakerTaskInterlude(8162042, 3))
  })
})

describe('TaskGarden presentation', () => {
  it('renders the reviewed Z-Image caretaker above an independently growing garden', () => {
    const b = mount(stats(6, 9, VINE_RING_GROWTH_MS * .6), 1, { running: true })
    expect(screen.getByRole('status').textContent).toBe('正在认真长叶子')
    expect(screen.getByText('已完成 6 轮')).toBeTruthy()
    const root = b.view.container.querySelector('[data-task-garden]')
    expect(root?.getAttribute('data-coordinate-space')).toBe('page')
    expect(root?.getAttribute('data-stage')).toBe('leafy')
    expect(root?.getAttribute('data-growing')).toBe('true')
    expect(root?.getAttribute('data-flowers')).toBe('5')
    expect(root?.getAttribute('data-frame-width')).toBe('900')
    expect(b.view.container.querySelectorAll('[data-bottom-vine]')).toHaveLength(5)
    const caretaker = b.view.container.querySelector('[data-garden-caretaker="zimage-reviewed"] img') as HTMLImageElement | null
    expect(caretaker?.src).toContain('data:image/webp;base64,')
    expect(b.view.container.querySelector('[data-task-cel-action="watering-walk"]')
      ?.getAttribute('data-task-cel-sequence')).toBe('complete-character')
    expect(b.view.container.querySelector('[data-task-cel-action="watering-walk"]')
      ?.getAttribute('data-zimage-set')).toBe('v22-face-locked')
    expect(b.view.container.querySelectorAll('[data-task-cel]')).toHaveLength(6)
    expect(b.view.container.querySelectorAll('[data-task-cel][data-active="true"]')).toHaveLength(1)
    expect(b.view.container.querySelector('[data-garden-caretaker]')
      ?.getAttribute('data-caretaker-max-height')).toBe('80px')
    expect(b.view.container.querySelector('[data-watering-flow="active"]')
      ?.getAttribute('data-growth-origin')).toBe('tracked-can-to-grass')
    expect(b.view.container.querySelector('[data-watering-flow="active"]')
      ?.getAttribute('data-watering-mode')).toBe('grass-walk')
    const wateringFlow = b.view.container.querySelector('[data-watering-flow="active"]')
    expect(wateringFlow?.getAttribute('data-coordinate-space')).toBe('caretaker-cel')
    expect(wateringFlow?.getAttribute('data-watering-frame')).toBe('0')
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.contains(wateringFlow)).toBe(true)
    expect(b.view.container.querySelector('[data-caretaker-grass="zimage-v20"]')).toBeTruthy()
    expect(b.view.container.querySelector('[data-vine-launcher="grass-to-edge"]')).toBeTruthy()
    expect(b.view.container.querySelectorAll('[data-starter-vine-leaf]')).toHaveLength(3)
    const firstVine = b.view.container.querySelector('[data-bottom-vine]') as HTMLImageElement | null
    expect(firstVine?.getAttribute('data-vine-art')).toBe('zimage-v17')
    expect(firstVine?.style.getPropertyValue('--plant-x')).toBeTruthy()
    const variants = [...b.view.container.querySelectorAll('[data-vine-variant]')]
      .map(element => element.getAttribute('data-vine-variant'))
    expect(new Set(variants).size).toBeGreaterThan(1)
    expect(b.view.container.querySelectorAll('[data-vine-layer="accent"]')).not.toHaveLength(0)
    expect(b.view.container.querySelector('[data-vine-progress-track="ring"]')).toBeTruthy()
    expect(b.view.container.querySelectorAll('[data-vine-stem]')).toHaveLength(2)
  })

  it('moves the water anchor on the same timer as the watering character cel', () => {
    vi.useFakeTimers()
    const b = mount(stats(2, 3), 2, { running: true })
    const figure = b.view.container.querySelector('[data-task-cel-action="watering-walk"]')
    const water = b.view.container.querySelector('[data-watering-flow="active"]')
    expect(figure?.getAttribute('data-task-cel-frame')).toBe('0')
    expect(water?.getAttribute('data-watering-frame')).toBe('0')
    const firstAnchor = water?.getAttribute('data-spout-anchor')
    act(() => { vi.advanceTimersByTime(190) })
    expect(figure?.getAttribute('data-task-cel-frame')).toBe('1')
    expect(water?.getAttribute('data-watering-frame')).toBe('1')
    expect(water?.getAttribute('data-spout-anchor')).not.toBe(firstAnchor)
  })

  it('restores a completed task at its durable growth milestone', () => {
    const b = mount(stats(4, 4, VINE_RING_GROWTH_MS - 1), 4)
    const root = b.view.container.querySelector('[data-task-garden]')
    const slots = Number(root?.getAttribute('data-border-slots'))
    expect(slots).toBeGreaterThan(0)
    expect(root?.getAttribute('data-complete')).toBe('true')
    expect(root?.getAttribute('data-stage')).toBe('sprout')
    expect(root?.getAttribute('data-flowers')).toBe('2')
    expect(root?.getAttribute('data-border-flowers')).toBe(String(slots))
    expect(root?.getAttribute('data-border-vines')).toBe(String(slots))
    expect(root?.getAttribute('data-vine-progress')).toBe('1.000')
    expect(root?.getAttribute('data-vine-visible-rings')).toBe('1')
    expect(root?.getAttribute('data-vine-ring-lifetime-ms')).toBe(String(VINE_RING_LIFETIME_MS))
    expect(b.view.container.querySelectorAll('[data-border-vine="attached"]')).toHaveLength(slots)
    expect(b.view.container.querySelectorAll('[data-bottom-vine]')).toHaveLength(2)
  })

  it('keeps three distinct ring styles and only three sparse large blue flowers', () => {
    const almostThirtyMinutes = VINE_RING_LIFETIME_MS - VINE_RING_FADE_MS - 1
    const b = mount(stats(8, 12, almostThirtyMinutes), 8)
    const root = b.view.container.querySelector('[data-task-garden]')
    expect(root?.getAttribute('data-vine-visible-rings')).toBe('3')
    const styles = [...b.view.container.querySelectorAll('[data-vine-ring-style]')]
      .map(element => element.getAttribute('data-vine-ring-style'))
    expect(new Set(styles).size).toBe(3)
    const flowers = [...b.view.container.querySelectorAll('[data-blue-accent-flower]')]
    expect(flowers).toHaveLength(3)
    expect(new Set(flowers.map(element => element.getAttribute('data-blue-accent-flower'))).size).toBe(3)
    expect(flowers.every(element => element.getAttribute('data-blossom-form') === 'head-only')).toBe(true)
    expect(flowers.every(element => element.getAttribute('data-attachment-gap') === '0')).toBe(true)
  })

  it('advances on active task time and freezes the ring clock when work stops', () => {
    vi.useFakeTimers()
    const b = mount(stats(2, 3, VINE_RING_GROWTH_MS - 1_000), 2, { running: true })
    const root = b.view.container.querySelector('[data-task-garden]')
    expect(root?.getAttribute('data-vine-current-ring')).toBe('0')
    act(() => { vi.advanceTimersByTime(1_000) })
    expect(root?.getAttribute('data-vine-current-ring')).toBe('1')
    expect(root?.getAttribute('data-vine-visible-rings')).toBe('2')
    act(() => {
      b.snapshot.set({ ...b.snapshot.getSnapshot(), running: false })
    })
    const frozen = root?.getAttribute('data-vine-active-ms')
    act(() => { vi.advanceTimersByTime(5 * 60 * 1_000) })
    expect(root?.getAttribute('data-vine-active-ms')).toBe(frozen)
  })

  it('turns each new tool and nested call into a flower flight that magnetically lands', () => {
    vi.useFakeTimers()
    const b = mount(stats(0, 0), 0, { running: true })
    const child = runningTool('child')
    act(() => {
      b.snapshot.set({
        ...b.snapshot.getSnapshot(), runningCalls: [runningTool('parent', [child])],
      })
    })
    expect(b.view.container.querySelectorAll('[data-flight-flower]')).toHaveLength(2)
    expect([...b.view.container.querySelectorAll('[data-flight-flower]')]
      .every(element => element.getAttribute('data-blossom-form') === 'head-only')).toBe(true)
    expect(b.view.container.querySelectorAll('[data-border-vine="frontier"]')).toHaveLength(1)
    expect(b.view.container.querySelectorAll('[data-vine-growth-tip]')).toHaveLength(1)
    expect(b.playSound).toHaveBeenCalledWith('garden-grow')
    act(() => { vi.advanceTimersByTime(2_850) })
    expect(b.view.container.querySelectorAll('[data-flight-flower]')).toHaveLength(0)
    const attached = [...b.view.container.querySelectorAll('[data-attached-blossom]')]
    expect(attached).toHaveLength(2)
    expect(attached.every(element => element.getAttribute('data-blossom-form') === 'head-only')).toBe(true)
    expect(attached.every(element => element.getAttribute('data-attachment-gap') === '0')).toBe(true)
    expect(b.view.container.querySelector('[data-task-garden]')?.getAttribute('data-attached-blossoms')).toBe('2')
    expect(Number(b.view.container.querySelector('[data-task-garden]')?.getAttribute('data-border-flowers')))
      .toBeGreaterThan(0)
    const reaction = b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action')
    expect(['admire', 'cheer', 'dance', 'wave']).toContain(reaction)
    expect(b.view.container.querySelector(`[data-task-cel-action="${reaction}"]`)).toBeTruthy()
    expect(b.view.container.querySelector('[data-watering-flow="active"]')).toBeNull()
    act(() => { vi.advanceTimersByTime(2_000) })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('watering-walk')
    expect(b.view.container.querySelector('[data-watering-flow="active"]')).toBeTruthy()
  })

  it('bows, plays complete-character kiss cels, toasts, and settles into a wave on completion', () => {
    vi.useFakeTimers()
    const b = mount(stats(2, 3), 2, { running: true })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('watering-walk')
    act(() => {
      b.snapshot.set({ ...b.snapshot.getSnapshot(), running: false })
    })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('bow')
    act(() => { vi.advanceTimersByTime(2_350) })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('kiss')
    const sequence = b.view.container.querySelector('[data-kiss-cel-sequence="complete-character"]')
    expect(sequence?.getAttribute('data-frame-hold-model')).toBe('authored')
    expect(b.view.container.querySelectorAll('[data-kiss-cel]')).toHaveLength(8)
    expect(b.view.container.querySelectorAll('[data-kiss-cel][data-active="true"]')).toHaveLength(1)
    expect(b.view.container.querySelector('[data-kiss-figure="layered-hair"]')).toBeNull()
    expect(b.view.container.querySelectorAll('[data-kiss-heart]')).toHaveLength(3)
    act(() => { vi.advanceTimersByTime(2_800) })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('toast')
    act(() => { vi.advanceTimersByTime(2_900) })
    expect(b.view.container.querySelector('[data-garden-caretaker]')?.getAttribute('data-caretaker-action'))
      .toBe('wave')
  })

  it('emits a new flight and growth cue when the authoritative Step count advances', async () => {
    const b = mount(stats(0, 0), 0, { running: true })
    b.setStats(stats(1, 1))
    await waitFor(() => {
      expect(b.view.container.querySelector('[data-flight-flower]')).toBeTruthy()
    })
    expect(b.playSound).toHaveBeenCalledWith('garden-grow')
  })

  it('reflows the garland when ResizeObserver reports a compact viewport', () => {
    const b = mount(stats(4, 4, VINE_RING_GROWTH_MS - 1), 4)
    const root = b.view.container.querySelector('[data-task-garden]')
    const wideSlots = Number(root?.getAttribute('data-border-slots'))
    notifyResize(420, 230)
    const compactSlots = Number(root?.getAttribute('data-border-slots'))
    expect(root?.getAttribute('data-frame-width')).toBe('420')
    expect(root?.getAttribute('data-frame-height')).toBe('230')
    expect(compactSlots).not.toBe(wideSlots)
    expect(b.view.container.querySelectorAll('[data-border-vine="attached"]')).toHaveLength(compactSlots)
  })

  it('uses the approved butterfly raster when the full garden blooms', () => {
    const b = mount(stats(10, 23, VINE_RING_GROWTH_MS - 1), 10, { running: true })
    const butterfly = b.view.container.querySelector('[data-corner-butterfly="approved-material"]') as HTMLImageElement | null
    expect(butterfly?.src).toContain('data:image/webp;base64,')
  })

  it('falls back to the loaded Turn index when sessionStats is unavailable', () => {
    const b = mount(undefined, 3, { running: true })
    expect(screen.getByRole('status').textContent).toBe('冒出了第一片嫩芽')
    expect(b.view.container.querySelector('[data-task-garden]')?.getAttribute('data-stage')).toBe('sprout')
  })
})
