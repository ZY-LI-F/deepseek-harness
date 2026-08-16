/** Session-aware adapter rendered in a page-fixed, responsive decorative layer. */
import {
  useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject,
} from 'react'
import type {
  RunningToolCall, ToolCallBlock,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SoulAudioCue } from '@deepseek-ai/dsh-client-ui-pocket-buddy/client'
import { deriveGardenGrowth, type GardenGrowth, type GardenStage } from './growth.ts'
import { deriveResponsiveGardenLayout, type ResponsiveGardenLayout } from './layout.ts'
import {
  BUTTERFLY, CARETAKER_BOW, CARETAKER_TOAST, CARETAKER_WINK, KISS_HEART,
} from './material-assets.generated.ts'
import { WHALE_GIRL_CEL_KISS } from './whale-girl-cels-v13.generated.ts'
import {
  WHALE_GIRL_GARDEN_CELS, type WhaleGirlGardenAction,
} from './whale-girl-garden-cels-v22.generated.ts'
import {
  GARDEN_BORDER_VINES, GARDEN_BOTTOM_VINES, GARDEN_VINE_ACCENTS,
} from './garden-vines-v17.generated.ts'
import {
  GARDEN_BLOSSOM_HEADS, GARDEN_BLUE_BLOSSOM_HEADS, type GardenBlossomHead,
} from './blossom-heads-v21.generated.ts'
import { CARETAKER_FOOT_GRASS_V20 } from './caretaker-grass-v20.generated.ts'
import css from './TaskGarden.module.css'

const STAGE_LABELS: Record<GardenStage, `stage.${GardenStage}`> = {
  seed: 'stage.seed',
  sprout: 'stage.sprout',
  leafy: 'stage.leafy',
  budding: 'stage.budding',
  bloom: 'stage.bloom',
}

const MAX_ACTIVE_FLIGHTS = 4
const MAX_ATTACHED_BLOSSOMS = 48
export const VINE_RING_GROWTH_MS = 10 * 60 * 1_000
export const VINE_RING_INTERVAL_MS = VINE_RING_GROWTH_MS
export const VINE_RING_LIFETIME_MS = 30 * 60 * 1_000
export const VINE_RING_FADE_MS = 60 * 1_000
const VINE_RING_LAYER_COUNT = VINE_RING_LIFETIME_MS / VINE_RING_INTERVAL_MS
const VINE_RING_INSET_PX = 7

export interface VineRingState {
  ordinal: number
  ageMs: number
  progress: number
  opacity: number
  phase: 'growing' | 'mature' | 'fading'
  inset: number
  styleVariant: number
}

function finiteDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

/** A ten-minute cadence with a thirty-minute lifetime keeps at most three rings visible. */
export function deriveVineRingStates(elapsedMs: number, taskSeed = 0): readonly VineRingState[] {
  const elapsed = finiteDuration(elapsedMs)
  const currentOrdinal = Math.floor(elapsed / VINE_RING_INTERVAL_MS)
  const firstOrdinal = Math.max(0, currentOrdinal - VINE_RING_LAYER_COUNT + 1)
  const styleCount = Math.max(1, GARDEN_BORDER_VINES.length)
  const styleBase = Math.abs(taskSeed) % styleCount
  const rings: VineRingState[] = []
  for (let ordinal = firstOrdinal; ordinal <= currentOrdinal; ordinal++) {
    const ageMs = elapsed - ordinal * VINE_RING_INTERVAL_MS
    if (ageMs < 0 || ageMs >= VINE_RING_LIFETIME_MS) continue
    const progress = Math.min(1, ageMs / VINE_RING_GROWTH_MS)
    const fadeStart = VINE_RING_LIFETIME_MS - VINE_RING_FADE_MS
    const opacity = ageMs <= fadeStart
      ? 1
      : Math.max(0, 1 - (ageMs - fadeStart) / VINE_RING_FADE_MS)
    rings.push({
      ordinal,
      ageMs,
      progress,
      opacity,
      phase: progress < 1 ? 'growing' : ageMs > fadeStart ? 'fading' : 'mature',
      inset: ordinal % VINE_RING_LAYER_COUNT * VINE_RING_INSET_PX,
      styleVariant: (styleBase + ordinal) % styleCount,
    })
  }
  return rings
}

type CaretakerAction = WhaleGirlGardenAction | 'wink' | 'bow' | 'kiss' | 'toast'

const CARETAKER_ART: Partial<Record<CaretakerAction, string>> = {
  wink: CARETAKER_WINK,
  bow: CARETAKER_BOW,
  kiss: WHALE_GIRL_CEL_KISS[0],
  toast: CARETAKER_TOAST,
}

const IDLE_ACTIONS = ['kiss', 'wave', 'dance', 'admire'] as const satisfies readonly CaretakerAction[]
const KISS_FRAME_MS = [300, 420, 180, 180, 180, 220, 600, 500] as const
const TASK_REACTION_ACTIONS = ['admire', 'cheer', 'dance', 'wave'] as const satisfies readonly WhaleGirlGardenAction[]
const TASK_CEL_ACTIONS = new Set<WhaleGirlGardenAction>(['watering-walk', ...TASK_REACTION_ACTIONS])

function isTaskCelAction(action: CaretakerAction): action is WhaleGirlGardenAction {
  return TASK_CEL_ACTIONS.has(action as WhaleGirlGardenAction)
}

export interface CaretakerTaskInterlude {
  action: Exclude<WhaleGirlGardenAction, 'watering-walk'>
  delayMs: number
}

/** Seeded variety keeps playback lively while making a task replay deterministic. */
export function deriveCaretakerTaskInterlude(taskSeed: number, ordinal: number): CaretakerTaskInterlude {
  const seed = hashText(`${taskSeed}:caretaker-task:${ordinal}`)
  return {
    action: TASK_REACTION_ACTIONS[seed % TASK_REACTION_ACTIONS.length] ?? 'wave',
    delayMs: 5_500 + seed % 4_500,
  }
}

interface FrameSize {
  width: number
  height: number
}

interface GardenFlight {
  id: string
  art: string
  name: string
  targetIndex: number
  driftX: number
  driftY: number
  spin: number
}

interface GardenBloom {
  id: string
  art: string
  name: string
  targetIndex: number
  tilt: number
}

interface GardenAnimationState {
  runUnits: number
  flights: readonly GardenFlight[]
  blooms: readonly GardenBloom[]
}

interface WateringGeometry {
  sourceX: number
  sourceY: number
  landingX: number
  landingY: number
  fallPath: string
  starterPath: string
  starterLength: number
}

interface CaretakerWateringGeometry {
  frame: number
  sourceX: number
  sourceY: number
  landingX: number
  landingY: number
  fallPath: string
}

const CARETAKER_CEL_WIDTH = 480
const CARETAKER_CEL_HEIGHT = 570

/**
 * Authored against the six normalized V22 watering cels. Keeping the spout
 * position per frame prevents the water from appearing to float while the
 * watering can and the girl's arms articulate.
 */
const CARETAKER_WATERING_SPOUTS = [
  { x: 397, y: 407 },
  { x: 397, y: 404 },
  { x: 398, y: 403 },
  { x: 397, y: 405 },
  { x: 397, y: 406 },
  { x: 397, y: 404 },
] as const

export function deriveCaretakerWateringGeometry(frame: number): CaretakerWateringGeometry {
  const normalizedFrame = Number.isFinite(frame)
    ? Math.max(0, Math.trunc(frame)) % CARETAKER_WATERING_SPOUTS.length
    : 0
  const source = CARETAKER_WATERING_SPOUTS[normalizedFrame] ?? CARETAKER_WATERING_SPOUTS[0]
  const landingX = source.x + 142
  const landingY = 550
  return {
    frame: normalizedFrame,
    sourceX: source.x,
    sourceY: source.y,
    landingX,
    landingY,
    fallPath: [
      `M ${source.x} ${source.y}`,
      `C ${source.x + 42} ${source.y + 18}, ${landingX - 38} ${landingY - 34}, ${landingX} ${landingY}`,
    ].join(' '),
  }
}

/** Keep the can, grass landing point and edge junction aligned at every viewport size. */
export function deriveWateringGeometry(layout: ResponsiveGardenLayout): WateringGeometry {
  const sourceX = layout.emitter.x + 32
  const sourceY = layout.start.y - 18
  const landingX = Math.min(layout.width - 28, sourceX + Math.min(46, Math.max(32, layout.width * .03)))
  const landingY = Math.min(layout.height - 34, sourceY + Math.min(68, Math.max(52, layout.height * .1)))
  const fallPath = `M ${sourceX} ${sourceY} Q ${sourceX + 24} ${sourceY + 13} ${landingX} ${landingY}`
  const starterPath = [
    `M ${landingX} ${landingY}`,
    `C ${landingX - 18} ${landingY - 18}, ${Math.max(24, layout.emitter.x * .38)} ${layout.start.y + 20}, 0 ${layout.start.y}`,
  ].join(' ')
  return {
    sourceX,
    sourceY,
    landingX,
    landingY,
    fallPath,
    starterPath,
    starterLength: Math.hypot(landingX, landingY - layout.start.y) * 1.28,
  }
}

function useMeasuredFrame(): { frameRef: RefObject<HTMLDivElement>; size: FrameSize } {
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<FrameSize>({ width: 0, height: 0 })
  useEffect(() => {
    const frame = frameRef.current
    if (frame === null) return
    const commit = (width: number, height: number) => {
      setSize(current => Math.abs(current.width - width) < .5 && Math.abs(current.height - height) < .5
        ? current
        : { width, height })
    }
    const measure = () => {
      const rect = frame.getBoundingClientRect()
      commit(rect.width, rect.height)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => { window.removeEventListener('resize', measure) }
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) commit(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(frame)
    return () => { observer.disconnect() }
  }, [])
  return { frameRef, size }
}

/** Advance only while the task is running, while reconciling durable host timings monotonically. */
function useActiveTaskElapsed(sessionKey: string, running: boolean, durableMs: number): number {
  const normalizedDurable = finiteDuration(durableMs)
  const durableRef = useRef(normalizedDurable)
  const elapsedSessionRef = useRef(sessionKey)
  durableRef.current = normalizedDurable
  const [elapsedMs, setElapsedMs] = useState(normalizedDurable)

  useEffect(() => {
    elapsedSessionRef.current = sessionKey
    setElapsedMs(normalizedDurable)
  }, [sessionKey])

  useEffect(() => {
    setElapsedMs(current => Math.max(current, normalizedDurable))
  }, [normalizedDurable])

  useEffect(() => {
    if (!running) return
    let previous = Date.now()
    const interval = window.setInterval(() => {
      const now = Date.now()
      const delta = Math.max(0, now - previous)
      previous = now
      setElapsedMs(current => Math.max(durableRef.current, current + delta))
    }, 1_000)
    return () => { window.clearInterval(interval) }
  }, [running, sessionKey])

  return elapsedSessionRef.current === sessionKey ? elapsedMs : normalizedDurable
}

/** Choose companion gestures from task events, with calm pauses between them. */
function useCaretakerAction(
  running: boolean, progressUnits: number, active: boolean, taskSeed: number,
): CaretakerAction {
  const [action, setAction] = useState<CaretakerAction>(running ? 'watering-walk' : 'wave')
  const previousRunning = useRef(running)
  const previousProgressUnits = useRef(progressUnits)

  useEffect(() => {
    const timeouts: number[] = []
    const justCompleted = previousRunning.current && !running
    const justBloomed = running && progressUnits > previousProgressUnits.current
    previousRunning.current = running
    previousProgressUnits.current = progressUnits

    if (!active) return

    if (justCompleted) {
      setAction('bow')
      timeouts.push(window.setTimeout(() => { setAction('kiss') }, 2_350))
      timeouts.push(window.setTimeout(() => { setAction('toast') }, 5_150))
      timeouts.push(window.setTimeout(() => { setAction('wave') }, 8_050))
    } else if (running && justBloomed) {
      const bloomAction = TASK_REACTION_ACTIONS[
        hashText(`${taskSeed}:landed:${progressUnits}`) % TASK_REACTION_ACTIONS.length
      ] ?? 'admire'
      setAction(bloomAction)
      const duration = WHALE_GIRL_GARDEN_CELS[bloomAction].holdsMs.reduce((sum, hold) => sum + hold, 0)
      timeouts.push(window.setTimeout(() => { setAction('watering-walk') }, duration + 240))
    } else if (running) {
      setAction('watering-walk')
    } else {
      setAction('wave')
    }

    return () => {
      for (const timeout of timeouts) window.clearTimeout(timeout)
    }
  }, [active, progressUnits, running])

  useEffect(() => {
    if (!running || !active) return
    let ordinal = 0
    let nextTimer = 0
    let settleTimer = 0
    let cancelled = false
    const schedule = () => {
      const interlude = deriveCaretakerTaskInterlude(taskSeed, ordinal)
      nextTimer = window.setTimeout(() => {
        if (cancelled) return
        const next = interlude.action
        setAction(next)
        const duration = WHALE_GIRL_GARDEN_CELS[next].holdsMs.reduce((sum, hold) => sum + hold, 0)
        settleTimer = window.setTimeout(() => {
          if (cancelled) return
          setAction('watering-walk')
          ordinal++
          schedule()
        }, duration + 240)
      }, interlude.delayMs)
    }
    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(nextTimer)
      window.clearTimeout(settleTimer)
    }
  }, [active, running, taskSeed])

  useEffect(() => {
    if (running || !active) return
    let ordinal = 0
    const settleTimeouts = new Set<number>()
    const interval = window.setInterval(() => {
      const next = IDLE_ACTIONS[ordinal % IDLE_ACTIONS.length] ?? 'wave'
      ordinal++
      setAction(next)
      const settle = window.setTimeout(() => {
        settleTimeouts.delete(settle)
        setAction('wave')
      }, next === 'dance' ? 3_000 : next === 'kiss' ? 2_800 : 2_100)
      settleTimeouts.add(settle)
    }, 12_000)
    return () => {
      window.clearInterval(interval)
      for (const timeout of settleTimeouts) window.clearTimeout(timeout)
    }
  }, [active, running])

  return action
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function flowerArtAt(index: number): GardenBlossomHead {
  const flower = GARDEN_BLOSSOM_HEADS[index % GARDEN_BLOSSOM_HEADS.length]
  if (flower === undefined) throw new Error('Task Garden blossom catalog is empty')
  return flower
}

function flattenToolCallIds(calls: readonly RunningToolCall[]): readonly string[] {
  const pending: ToolCallBlock[] = [...calls]
  const ids: string[] = []
  for (const call of pending) {
    ids.push(call.callId)
    pending.push(...call.subCalls)
  }
  return ids
}

const VINE_EDGE_ANGLES: Record<ResponsiveGardenLayout['slots'][number]['edge'], number> = {
  top: 0,
  'top-right': 45,
  right: 90,
  'bottom-right': 135,
  bottom: 180,
  'bottom-left': 225,
  left: 270,
  'top-left': 315,
}

const VINE_INWARD_OFFSETS: Record<ResponsiveGardenLayout['slots'][number]['edge'], readonly [number, number]> = {
  top: [0, 1],
  'top-right': [-.707, .707],
  right: [-1, 0],
  'bottom-right': [-.707, -.707],
  bottom: [0, -1],
  'bottom-left': [.707, -.707],
  left: [1, 0],
  'top-left': [.707, .707],
}

function BorderVine({
  index, layout, ring, taskSeed, segmentProgress = 1, waiting = false,
}: {
  index: number
  layout: ResponsiveGardenLayout
  ring: VineRingState
  taskSeed: number
  segmentProgress?: number
  waiting?: boolean
}) {
  const slot = layout.slots[index]
  if (slot === undefined) return null
  const seed = hashText(`${taskSeed}:border-vine:${ring.ordinal}:${index}`)
  const compact = slot.edge === 'bottom'
    || slot.edge === 'bottom-left'
    || slot.edge === 'bottom-right'
  const materials = compact ? GARDEN_BOTTOM_VINES : GARDEN_BORDER_VINES
  const variant = ring.styleVariant % materials.length
  const art = materials[variant] ?? materials[0]
  const accentVariant = (seed >>> 8) % GARDEN_VINE_ACCENTS.length
  const accent = GARDEN_VINE_ACCENTS[accentVariant] ?? GARDEN_VINE_ACCENTS[0]
  const layered = !waiting && segmentProgress > .72 && index % 5 === ring.ordinal % 5
  const layerScale = 1 - ring.inset / VINE_RING_INSET_PX * .075
  const width = Math.max(compact ? 92 : 112, layout.flowerSize * (compact ? 3.5 : 4.5)) * layerScale
  const height = Math.max(compact ? 23 : 35, layout.flowerSize * (compact ? .76 : 1.08)) * layerScale
  const inward = VINE_INWARD_OFFSETS[slot.edge]
  const x = slot.x + inward[0] * ring.inset
  const y = slot.y + inward[1] * ring.inset
  const reveal = Math.min(1, Math.max(0, segmentProgress))
  const frontier = waiting || reveal < 1
  const style = {
    '--slot-x': `${x}px`,
    '--slot-y': `${y}px`,
    '--vine-angle': `${VINE_EDGE_ANGLES[slot.edge]}deg`,
    '--vine-width': `${width}px`,
    '--vine-height': `${height}px`,
    '--vine-hidden': `${(1 - reveal) * 100}%`,
    '--vine-flip': seed % 2 === 0 ? 1 : -1,
    '--vine-accent-flip': seed % 4 < 2 ? 1 : -1,
    '--vine-accent-x': `${(seed % 19) - 9}px`,
    '--vine-accent-y': `${-4 - seed % 9}px`,
  } as CSSProperties
  return (
    <span
      className={css.vineSlot}
      data-border-edge={slot.edge}
      data-border-progress={slot.progress.toFixed(4)}
      data-vine-compact={compact ? 'true' : 'false'}
      data-vine-ring={ring.ordinal}
      data-vine-state={waiting ? 'frontier' : reveal < 1 ? 'growing' : 'grown'}
      data-vine-segment-progress={reveal.toFixed(3)}
      style={style}
    >
      <span
        className={waiting ? css.waitingBorderVine : css.timedBorderVine}
        data-border-vine={waiting ? 'frontier' : 'attached'}
        data-vine-layer="base"
        data-vine-variant={variant}
      >
        <img className={css.vineArt} src={art} alt="" draggable={false} />
      </span>
      {layered && (
        <span
          className={css.vineAccent}
          data-vine-layer="accent"
          data-vine-variant={`accent-${accentVariant}`}
        >
          <img className={css.vineAccentArt} src={accent} alt="" draggable={false} />
        </span>
      )}
      {frontier && <span className={css.growthTip} data-vine-growth-tip="" />}
    </span>
  )
}

interface RingGeometry {
  left: number
  top: number
  right: number
  bottom: number
  radius: number
  startY: number
  perimeter: number
  path: string
}

function ringGeometry(layout: ResponsiveGardenLayout, inset: number): RingGeometry {
  const safeInset = Math.max(0, Math.min(inset, Math.min(layout.width, layout.height) / 3))
  const left = safeInset
  const top = safeInset
  const right = Math.max(left + 1, layout.width - safeInset)
  const bottom = Math.max(top + 1, layout.height - safeInset)
  const width = right - left
  const height = bottom - top
  const radius = Math.max(1, Math.min(layout.radius - safeInset * .45, width / 2, height / 2))
  const startY = Math.min(bottom - radius, Math.max(top + radius, layout.start.y))
  const perimeter = Math.max(1, 2 * (width - 2 * radius) + 2 * (height - 2 * radius) + 2 * Math.PI * radius)
  const path = [
    `M ${left} ${startY}`,
    `L ${left} ${top + radius}`,
    `A ${radius} ${radius} 0 0 1 ${left + radius} ${top}`,
    `L ${right - radius} ${top}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${top + radius}`,
    `L ${right} ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `L ${left + radius} ${bottom}`,
    `A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius}`,
    `L ${left} ${startY}`,
  ].join(' ')
  return { left, top, right, bottom, radius, startY, perimeter, path }
}

const VINE_STEM_PALETTES = [
  ['#57977f', '#b5dcc5'],
  ['#4f8b86', '#b8dfd7'],
  ['#648e72', '#c9e2bf'],
  ['#567fa0', '#c0d9e6'],
] as const

function VineLauncher({ layout }: { layout: ResponsiveGardenLayout }) {
  if (layout.slots.length === 0) return null
  const watering = deriveWateringGeometry(layout)
  return (
    <svg
      className={css.vineTrack}
      data-vine-launcher="grass-to-edge"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="none"
      style={{ '--vine-launcher-length': `${watering.starterLength}px` } as CSSProperties}
      aria-hidden
    >
      <path className={`${css.vineLauncher} ${css.vineStemShadow}`} d={watering.starterPath} vectorEffect="non-scaling-stroke" />
      <path className={`${css.vineLauncher} ${css.vineStemHighlight}`} d={watering.starterPath} vectorEffect="non-scaling-stroke" />
      {[.28, .52, .74].map((position, index) => {
        const x = watering.landingX * (1 - position)
        const y = watering.landingY + (layout.start.y - watering.landingY) * position - 5
        return (
          <ellipse
            key={position}
            className={css.starterLeaf}
            data-starter-vine-leaf={index}
            cx={x}
            cy={y}
            rx="5.2"
            ry="2.8"
            style={{ '--starter-leaf-index': index } as CSSProperties}
            transform={`rotate(${index % 2 === 0 ? -28 : 34} ${x} ${y})`}
          />
        )
      })}
      <circle className={css.vineJunction} cx={0} cy={layout.start.y} r={4.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** A time-derived dash reveals one adaptive rounded ring without a fixed viewport size. */
function VineProgressTrack({ layout, ring }: { layout: ResponsiveGardenLayout; ring: VineRingState }) {
  if (layout.slots.length === 0) return null
  const geometry = ringGeometry(layout, ring.inset)
  const palette = VINE_STEM_PALETTES[ring.styleVariant % VINE_STEM_PALETTES.length]
    ?? VINE_STEM_PALETTES[0]
  const style = {
    '--vine-track-length': `${geometry.perimeter}px`,
    '--vine-track-gap': `${geometry.perimeter * 4}px`,
    '--vine-track-visible': `${geometry.perimeter * ring.progress}px`,
    '--vine-stem-shadow': palette[0],
    '--vine-stem-highlight': palette[1],
  } as CSSProperties
  const connector = ring.inset > 0
    ? `M 0 ${geometry.startY} L ${geometry.left} ${geometry.startY}`
    : null
  return (
    <svg
      className={css.vineTrack}
      data-vine-progress-track="ring"
      data-vine-ring={ring.ordinal}
      data-vine-ring-progress={ring.progress.toFixed(3)}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="none"
      style={style}
      aria-hidden
    >
      {connector !== null && ring.progress > 0 && (
        <>
          <path className={`${css.vineConnector} ${css.vineStemShadow}`} d={connector} vectorEffect="non-scaling-stroke" />
          <path className={`${css.vineConnector} ${css.vineStemHighlight}`} d={connector} vectorEffect="non-scaling-stroke" />
        </>
      )}
      <path className={`${css.vineStem} ${css.vineStemShadow}`} data-vine-stem="base" d={geometry.path} vectorEffect="non-scaling-stroke" />
      <path className={`${css.vineStem} ${css.vineStemHighlight}`} data-vine-stem="highlight" d={geometry.path} vectorEffect="non-scaling-stroke" />
      {ring.progress > 0 && (
        <circle className={css.vineJunction} cx={geometry.left} cy={geometry.startY} r={3.8} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}

const CORNER_EDGE_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const

function CornerOrnaments({
  layout, progress, taskSeed,
}: {
  layout: ResponsiveGardenLayout
  progress: number
  taskSeed: number
}) {
  if (layout.slots.length === 0) return null
  const { width, height, radius, perimeter, start } = layout
  const horizontal = Math.max(0, width - radius * 2)
  const vertical = Math.max(0, height - radius * 2)
  const corner = Math.PI * radius / 2
  const firstStraight = Math.max(0, start.y - radius)
  const thresholds = [
    firstStraight + corner * .5,
    firstStraight + corner + horizontal + corner * .5,
    firstStraight + corner * 2 + horizontal + vertical + corner * .5,
    firstStraight + corner * 3 + horizontal * 2 + vertical + corner * .5,
  ].map(distance => distance / perimeter)
  const positions = [
    { x: radius * .38, y: radius * .38, angle: -34 },
    { x: width - radius * .38, y: radius * .38, angle: 34 },
    { x: width - radius * .38, y: height - radius * .38, angle: -34 },
    { x: radius * .38, y: height - radius * .38, angle: 34 },
  ]
  return (
    <>
      {CORNER_EDGE_NAMES.map((edge, index) => {
        const threshold = thresholds[index] ?? 1
        if (progress < threshold) return null
        const seed = hashText(`${taskSeed}:corner:${edge}`)
        const position = positions[index]
        if (position === undefined) return null
        const accentVariant = seed % GARDEN_VINE_ACCENTS.length
        const showButterfly = (index + taskSeed) % 2 === 0
        return (
          <span
            key={edge}
            className={css.cornerOrnament}
            data-vine-corner={edge}
            style={{
              '--corner-x': `${position.x}px`,
              '--corner-y': `${position.y}px`,
              '--corner-angle': `${position.angle}deg`,
              '--corner-delay': '0ms',
              '--corner-size': `${Math.max(62, layout.flowerSize * 2.3)}px`,
              '--corner-flip': seed % 2 === 0 ? 1 : -1,
            } as CSSProperties}
          >
            <img
              className={css.cornerFlowers}
              src={GARDEN_VINE_ACCENTS[accentVariant]}
              alt=""
              draggable={false}
            />
            {showButterfly && (
              <img
                className={css.cornerButterfly}
                data-corner-butterfly="approved-material"
                src={BUTTERFLY}
                alt=""
                draggable={false}
              />
            )}
          </span>
        )
      })}
    </>
  )
}

const BLUE_FLOWER_THRESHOLDS = [.23, .43, .86, .34] as const

/** One large species marker per ring keeps the blue accents sparse even on long tasks. */
function BlueFlowerAccent({
  layout, ring,
}: {
  layout: ResponsiveGardenLayout
  ring: VineRingState
}) {
  if (layout.slots.length === 0) return null
  const flower = GARDEN_BLUE_BLOSSOM_HEADS[ring.styleVariant % GARDEN_BLUE_BLOSSOM_HEADS.length]
  if (flower === undefined) return null
  const threshold = BLUE_FLOWER_THRESHOLDS[ring.ordinal % BLUE_FLOWER_THRESHOLDS.length] ?? .3
  if (ring.progress < threshold) return null
  const slotIndex = Math.min(layout.slots.length - 1, Math.floor(threshold * layout.slots.length))
  const slot = layout.slots[slotIndex]
  if (slot === undefined) return null
  const inward = VINE_INWARD_OFFSETS[slot.edge]
  const compact = slot.edge === 'bottom' || slot.edge === 'bottom-left' || slot.edge === 'bottom-right'
  const size = Math.min(compact ? 50 : 70, Math.max(compact ? 42 : 50, layout.flowerSize * 2.15))
  const style = {
    '--blue-flower-x': `${slot.x + inward[0] * ring.inset}px`,
    '--blue-flower-y': `${slot.y + inward[1] * ring.inset}px`,
    '--blue-flower-size': `${size}px`,
    '--blue-flower-tilt': `${(ring.ordinal % 3 - 1) * 7}deg`,
  } as CSSProperties
  return (
    <img
      className={css.blueAccentFlower}
      data-attachment-gap="0"
      data-blue-accent-flower={flower.name}
      data-blossom-form="head-only"
      data-vine-ring={ring.ordinal}
      src={flower.art}
      alt=""
      draggable={false}
      style={style}
    />
  )
}

function VineRing({
  layout, ring, taskSeed,
}: {
  layout: ResponsiveGardenLayout
  ring: VineRingState
  taskSeed: number
}) {
  const segmentPosition = ring.progress * layout.slots.length
  const visibleSegments = Math.min(layout.slots.length, Math.ceil(segmentPosition))
  return (
    <div
      className={css.vineRing}
      data-vine-ring-layer={ring.ordinal}
      data-vine-ring-phase={ring.phase}
      data-vine-ring-style={ring.styleVariant}
      style={{
        '--vine-ring-opacity': ring.opacity,
        '--vine-ring-order': ring.ordinal,
      } as CSSProperties}
    >
      <VineProgressTrack layout={layout} ring={ring} />
      {layout.slots.slice(0, visibleSegments).map((_, index) => (
        <BorderVine
          key={index}
          index={index}
          layout={layout}
          ring={ring}
          taskSeed={taskSeed}
          segmentProgress={Math.min(1, Math.max(0, segmentPosition - index))}
        />
      ))}
      {ring.progress === 0 && (
        <BorderVine index={0} layout={layout} ring={ring} taskSeed={taskSeed} segmentProgress={0} waiting />
      )}
      <BlueFlowerAccent layout={layout} ring={ring} />
    </div>
  )
}

function FlightFlower({
  flight, layout, onLand,
}: {
  flight: GardenFlight
  layout: ResponsiveGardenLayout
  onLand: (id: string) => void
}) {
  const landed = useRef(false)
  const settle = useCallback(() => {
    if (landed.current) return
    landed.current = true
    onLand(flight.id)
  }, [flight.id, onLand])
  useEffect(() => {
    const fallback = window.setTimeout(settle, 2_850)
    return () => { window.clearTimeout(fallback) }
  }, [settle])
  const slot = layout.slots[Math.min(flight.targetIndex, layout.slots.length - 1)]
  if (slot === undefined) return null
  const targetX = slot.x - layout.emitter.x
  const targetY = slot.y - layout.emitter.y
  const style = {
    '--flight-origin-x': `${layout.emitter.x}px`,
    '--flight-origin-y': `${layout.emitter.y}px`,
    '--flight-drift-x': `${flight.driftX}px`,
    '--flight-drift-y': `${flight.driftY}px`,
    '--flight-mid-x': `${targetX * .42 + flight.driftX}px`,
    '--flight-mid-y': `${targetY * .42 + flight.driftY}px`,
    '--flight-near-x': `${targetX * .88 + flight.driftX * .12}px`,
    '--flight-near-y': `${targetY * .88 + flight.driftY * .12}px`,
    '--flight-target-x': `${targetX}px`,
    '--flight-target-y': `${targetY}px`,
    '--flight-angle': `${slot.angle}deg`,
    '--flight-spin': `${flight.spin}deg`,
    '--flight-width': `${layout.flowerSize * 1.18}px`,
    '--flight-height': `${layout.flowerSize * 1.18}px`,
  } as CSSProperties
  return (
    <img
      className={css.flightFlower}
      data-blossom-form="head-only"
      data-flight-flower=""
      data-flower-name={flight.name}
      src={flight.art}
      alt=""
      draggable={false}
      style={style}
      onAnimationEnd={settle}
    />
  )
}

function AttachedBlossom({ bloom, layout }: { bloom: GardenBloom; layout: ResponsiveGardenLayout }) {
  const slot = layout.slots[Math.min(bloom.targetIndex, layout.slots.length - 1)]
  if (slot === undefined) return null
  return (
    <img
      className={css.attachedBlossom}
      data-attached-blossom={bloom.id}
      data-attachment-gap="0"
      data-blossom-form="head-only"
      data-flower-name={bloom.name}
      src={bloom.art}
      alt=""
      draggable={false}
      style={{
        '--attached-flower-x': `${slot.x}px`,
        '--attached-flower-y': `${slot.y}px`,
        '--attached-flower-size': `${layout.flowerSize * 1.18}px`,
        '--attached-flower-tilt': `${bloom.tilt}deg`,
      } as CSSProperties}
    />
  )
}

function BorderGarland({
  blooms, flights, layout, rings, taskSeed, onLand,
}: {
  blooms: readonly GardenBloom[]
  flights: readonly GardenFlight[]
  layout: ResponsiveGardenLayout
  rings: readonly VineRingState[]
  taskSeed: number
  onLand: (id: string) => void
}) {
  const cornerProgress = rings.reduce((maximum, ring) => Math.max(maximum, ring.progress), 0)
  return (
    <div className={css.garland} aria-hidden data-border-garland="">
      <VineLauncher layout={layout} />
      {rings.map(ring => (
        <VineRing key={ring.ordinal} layout={layout} ring={ring} taskSeed={taskSeed} />
      ))}
      {blooms.map(bloom => (
        <AttachedBlossom key={bloom.id} bloom={bloom} layout={layout} />
      ))}
      {flights.map(flight => (
        <FlightFlower key={flight.id} flight={flight} layout={layout} onLand={onLand} />
      ))}
      <CornerOrnaments
        layout={layout}
        progress={cornerProgress}
        taskSeed={taskSeed}
      />
    </div>
  )
}

function BottomGarden({
  growth, layout, running, taskSeed,
}: {
  growth: GardenGrowth
  layout: ResponsiveGardenLayout
  running: boolean
  taskSeed: number
}) {
  const plantCount = Math.min(growth.flowers, layout.gardenCapacity)
  const plantWidth = Math.min(214, Math.max(112, layout.width / Math.max(4, layout.gardenCapacity) * 1.72))
  const plantHeight = Math.min(30, Math.max(23, layout.flowerSize * .78))
  const positions = Array.from({ length: plantCount }, (_, index) => ({
    x: (index + .62) / Math.max(1, layout.gardenCapacity + .18) * 100,
    seed: hashText(`${taskSeed}:bottom-vine:${index}`),
  }))
  const waiting = running && growth.nextFlower !== null && plantCount < layout.gardenCapacity
  const waitingX = (plantCount + .62) / Math.max(1, layout.gardenCapacity + .18) * 100
  return (
    <div className={css.bottomGarden} data-material-garden="" aria-hidden>
      {positions.map((position, index) => (
        <span
          key={index}
          className={css.bottomVine}
          data-bottom-vine=""
          data-vine-art="zimage-v17"
          data-vine-variant={position.seed % GARDEN_BOTTOM_VINES.length}
          style={{
            '--plant-x': `${position.x}%`,
            '--plant-delay': `${running ? index * 58 : 6_000 + index * 105}ms`,
            '--plant-width': `${plantWidth}px`,
            '--plant-height': `${plantHeight}px`,
            '--plant-flip': position.seed % 2 === 0 ? 1 : -1,
          } as CSSProperties}
        >
          <img
            className={css.bottomVineArt}
            src={GARDEN_BOTTOM_VINES[position.seed % GARDEN_BOTTOM_VINES.length]}
            alt=""
            draggable={false}
          />
        </span>
      ))}
      {waiting && (
        <span
          className={css.waitingBottomVine}
          style={{
            '--plant-x': `${waitingX}%`,
            '--plant-width': `${plantWidth}px`,
            '--plant-height': `${plantHeight}px`,
            '--plant-flip': 1,
          } as CSSProperties}
        >
          <img
            className={css.bottomVineArt}
            src={GARDEN_BOTTOM_VINES[hashText(`${taskSeed}:bottom-waiting:${plantCount}`) % GARDEN_BOTTOM_VINES.length]}
            alt=""
            draggable={false}
          />
        </span>
      )}
    </div>
  )
}

/** Reviewed complete-character cels: no runtime body-part reattachment or whole-image bob. */
function CompleteCharacterKiss() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    let current = 0
    let timeout = 0
    const advance = () => {
      current = Math.min(current + 1, WHALE_GIRL_CEL_KISS.length - 1)
      setFrame(current)
      if (current < WHALE_GIRL_CEL_KISS.length - 1) {
        timeout = window.setTimeout(advance, KISS_FRAME_MS[current] ?? 180)
      }
    }
    timeout = window.setTimeout(advance, KISS_FRAME_MS[0])
    return () => { window.clearTimeout(timeout) }
  }, [])

  return (
    <div
      className={css.kissFigure}
      data-frame-hold-model="authored"
      data-kiss-cel-frame={frame}
      data-kiss-cel-sequence="complete-character"
    >
      {WHALE_GIRL_CEL_KISS.map((src, index) => (
        <img
          key={index}
          className={css.kissCel}
          data-active={index === frame ? 'true' : 'false'}
          data-kiss-cel={index}
          src={src}
          alt=""
          draggable={false}
        />
      ))}
      <span className={css.kissHearts}>
        {[0, 1, 2].map(index => (
          <img
            key={index}
            className={css.kissHeart}
            data-kiss-heart={index}
            src={KISS_HEART}
            alt=""
            draggable={false}
            style={{ '--kiss-heart-index': index } as CSSProperties}
          />
        ))}
      </span>
    </div>
  )
}

/** Cat-style playback: authored complete-character frames on one stable baseline. */
function CompleteTaskCel({ action }: { action: WhaleGirlGardenAction }) {
  const celSet = WHALE_GIRL_GARDEN_CELS[action]
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    let current = 0
    let timeout = 0
    let cancelled = false
    setFrame(0)
    const advance = () => {
      if (cancelled) return
      let next = current + 1
      if (next >= celSet.frames.length) {
        if (!celSet.loop) return
        next = 0
      }
      current = next
      setFrame(current)
      timeout = window.setTimeout(advance, celSet.holdsMs[current] ?? 240)
    }
    timeout = window.setTimeout(advance, celSet.holdsMs[0] ?? 240)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [action, celSet])

  return (
    <>
      <div
        className={css.taskCelFigure}
        data-task-cel-action={action}
        data-task-cel-frame={frame}
        data-task-cel-sequence="complete-character"
        data-zimage-set="v22-face-locked"
        data-frame-hold-model="authored"
      >
        {celSet.frames.map((src, index) => (
          <img
            key={index}
            className={css.taskCel}
            data-active={index === frame ? 'true' : 'false'}
            data-task-cel={index}
            src={src}
            alt=""
            draggable={false}
          />
        ))}
      </div>
      {action === 'watering-walk' ? <WateringFlow frame={frame} /> : null}
    </>
  )
}

/** Water shares the character's transform and begins at each cel's authored can spout. */
function WateringFlow({ frame }: { frame: number }) {
  const watering = deriveCaretakerWateringGeometry(frame)
  return (
    <svg
      className={css.wateringFlow}
      data-coordinate-space="caretaker-cel"
      data-growth-origin="tracked-can-to-grass"
      data-spout-anchor={`${watering.sourceX},${watering.sourceY}`}
      data-watering-frame={watering.frame}
      data-watering-mode="grass-walk"
      data-watering-flow="active"
      viewBox={`0 0 ${CARETAKER_CEL_WIDTH} ${CARETAKER_CEL_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <path className={css.waterStreamGlow} d={watering.fallPath} vectorEffect="non-scaling-stroke" />
      <path className={css.waterStream} d={watering.fallPath} vectorEffect="non-scaling-stroke" />
      {[0, 1, 2, 3, 4].map(index => (
        <circle
          key={index}
          className={css.waterDrop}
          cx={watering.sourceX}
          cy={watering.sourceY}
          r="2.4"
          style={{
            '--water-drop-index': index,
            '--water-drop-x': `${watering.landingX - watering.sourceX}px`,
            '--water-drop-y': `${watering.landingY - watering.sourceY}px`,
          } as CSSProperties}
        />
      ))}
      <ellipse
        className={css.waterSplash}
        cx={watering.landingX}
        cy={watering.landingY}
        rx="11"
        ry="3.6"
      />
      {[-1, 0, 1].map((direction, index) => (
        <circle
          key={direction}
          className={css.splashDrop}
          cx={watering.landingX + direction * 4}
          cy={watering.landingY - 2}
          r="1.8"
          style={{
            '--splash-index': index,
            '--splash-x': `${direction * 10}px`,
          } as CSSProperties}
        />
      ))}
    </svg>
  )
}

function CaretakerGrass({ growing }: { growing: boolean }) {
  return (
    <div
      className={css.caretakerGrass}
      data-caretaker-grass="zimage-v20"
      data-growing={growing ? 'true' : 'false'}
    >
      <img className={css.caretakerGrassArt} src={CARETAKER_FOOT_GRASS_V20} alt="" draggable={false} />
      <span className={css.grassDew} data-grass-dew="watering" />
    </div>
  )
}

/** One responsive scene made only from reviewed raster material. */
function GardenArtwork({
  action, blooms, flights, growth, layout, onLand, rings, running, taskSeed,
}: {
  action: CaretakerAction
  blooms: readonly GardenBloom[]
  flights: readonly GardenFlight[]
  growth: GardenGrowth
  layout: ResponsiveGardenLayout
  onLand: (id: string) => void
  rings: readonly VineRingState[]
  running: boolean
  taskSeed: number
}) {
  return (
    <div className={css.art} aria-hidden>
      <CaretakerGrass growing={running} />
      <BorderGarland
        blooms={blooms}
        flights={flights}
        layout={layout}
        rings={rings}
        taskSeed={taskSeed}
        onLand={onLand}
      />
      <BottomGarden growth={growth} layout={layout} running={running} taskSeed={taskSeed} />
      <div
        className={css.caretaker}
        data-caretaker-action={action}
        data-caretaker-max-height="80px"
        data-garden-caretaker="zimage-reviewed"
      >
        <div className={css.caretakerMotion}>
          {action === 'kiss' ? (
            <CompleteCharacterKiss />
          ) : isTaskCelAction(action) ? (
            <CompleteTaskCel action={action} />
          ) : (
            <img
              className={css.caretakerFigure}
              src={CARETAKER_ART[action] ?? CARETAKER_WINK}
              alt=""
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export interface TaskGardenInjected {
  playSound: (cue: SoulAudioCue) => void
}

export type TaskGardenProps = PropsRuntime<'conversation.viewport.overlay'>
  & PropsLocale<'task-garden'> & TaskGardenInjected

/** Render a page-wide responsive flower garland over durable session growth. */
export function TaskGarden({ sessionId, useSession, useProjection, t, playSound }: TaskGardenProps) {
  const projected = useProjection('sessionStats')
  const windowTurns = useSession(snapshot => snapshot.turnEnds.size)
  const running = useSession(snapshot => snapshot.running)
  const runningCalls = useSession(snapshot => snapshot.runningCalls)
  const turns = projected?.turns ?? windowTurns
  const steps = projected?.steps ?? turns
  const hasProgress = turns > 0 || steps > 0
  const growth = deriveGardenGrowth(turns, steps)
  const callIds = useMemo(() => flattenToolCallIds(runningCalls), [runningCalls])
  const taskSeed = useMemo(() => hashText(String(sessionId)), [sessionId])
  const durableActiveMs = finiteDuration((projected?.llmMs ?? 0) + (projected?.toolMs ?? 0))
  const activeTaskMs = useActiveTaskElapsed(String(sessionId), running, durableActiveMs)
  const rings = useMemo(
    () => deriveVineRingStates(activeTaskMs, taskSeed),
    [activeTaskMs, taskSeed],
  )
  const { frameRef, size } = useMeasuredFrame()
  const layout = useMemo(
    () => deriveResponsiveGardenLayout(size.width, size.height),
    [size.height, size.width],
  )
  const [animation, setAnimation] = useState<GardenAnimationState>({ runUnits: 0, flights: [], blooms: [] })
  const { runUnits, flights, blooms } = animation
  const previousRunning = useRef(false)
  const previousSteps = useRef(steps)
  const seenCallIds = useRef(new Set<string>())
  const flightOrdinal = useRef(0)
  const enqueueFlight = useCallback((eventId: string) => {
    if (layout.slots.length === 0) return
    const seed = hashText(eventId)
    const flower = flowerArtAt(seed)
    const ordinal = flightOrdinal.current++
    setAnimation((current) => {
      if (current.flights.length >= MAX_ACTIVE_FLIGHTS) return current
      const targetIndex = Math.min(
        layout.slots.length - 1,
        current.runUnits + current.flights.length,
      )
      return {
        ...current,
        flights: [...current.flights, {
          id: `${eventId}:${ordinal}`,
          art: flower.art,
          name: flower.name,
          targetIndex,
          driftX: seed % 2 === 0 ? 18 + seed % 17 : -18 - seed % 13,
          driftY: -28 - seed % 24,
          spin: seed % 2 === 0 ? 14 + seed % 18 : -14 - seed % 18,
        }],
      }
    })
  }, [layout.slots.length])

  useEffect(() => {
    const began = running && !previousRunning.current
    if (began) {
      setAnimation({ runUnits: 0, flights: [], blooms: [] })
      seenCallIds.current.clear()
      previousSteps.current = steps
    }
    previousRunning.current = running
  }, [running, steps])

  useEffect(() => {
    if (!running || layout.slots.length === 0) return
    const unseen = callIds.filter(callId => !seenCallIds.current.has(callId))
    for (const callId of unseen) {
      seenCallIds.current.add(callId)
      enqueueFlight(`tool:${callId}`)
    }
    if (unseen.length > 0) playSound('garden-grow')
  }, [callIds, enqueueFlight, layout.slots.length, playSound, running])

  useEffect(() => {
    const delta = steps - previousSteps.current
    if (!running) {
      previousSteps.current = steps
      return
    }
    if (delta <= 0 || layout.slots.length === 0) return
    previousSteps.current = steps
    const animated = Math.min(delta, MAX_ACTIVE_FLIGHTS)
    for (let index = 0; index < animated; index++) enqueueFlight(`step:${steps - delta + index + 1}`)
    if (delta > animated) {
      setAnimation(current => ({ ...current, runUnits: current.runUnits + delta - animated }))
    }
    playSound('garden-grow')
  }, [enqueueFlight, layout.slots.length, playSound, running, steps])

  const onLand = useCallback((id: string) => {
    setAnimation((current) => {
      const landed = current.flights.find(flight => flight.id === id)
      if (landed === undefined) return current
      const blooms = [...current.blooms, {
        id: `attached:${landed.id}`,
        art: landed.art,
        name: landed.name,
        targetIndex: landed.targetIndex,
        tilt: Math.round(landed.spin * .35),
      }].slice(-MAX_ATTACHED_BLOSSOMS)
      return {
        runUnits: current.runUnits + 1,
        flights: current.flights.filter(flight => flight.id !== id),
        blooms,
      }
    })
  }, [])

  const borderVines = rings.reduce(
    (total, ring) => total + Math.min(layout.slots.length, Math.ceil(ring.progress * layout.slots.length)),
    0,
  )
  const currentRing = rings[rings.length - 1]
  const currentRingProgress = currentRing?.progress ?? 0
  const caretakerAction = useCaretakerAction(running, runUnits, running || hasProgress, taskSeed)
  if (!running && !hasProgress) return null

  return (
    <div
      ref={frameRef}
      className={css.root}
      data-task-garden
      data-coordinate-space="page"
      data-stage={growth.stage}
      data-growing={running ? 'true' : 'false'}
      data-complete={!running && hasProgress ? 'true' : 'false'}
      data-flowers={growth.flowers}
      data-attached-blossoms={blooms.length}
      data-run-units={runUnits}
      data-border-flowers={borderVines}
      data-border-vines={borderVines}
      data-vine-progress={currentRingProgress.toFixed(3)}
      data-vine-visible-rings={rings.length}
      data-vine-current-ring={currentRing?.ordinal ?? 0}
      data-vine-active-ms={Math.round(activeTaskMs)}
      data-vine-ring-growth-ms={VINE_RING_GROWTH_MS}
      data-vine-ring-lifetime-ms={VINE_RING_LIFETIME_MS}
      data-vine-ring-fade-ms={VINE_RING_FADE_MS}
      data-border-slots={layout.slots.length}
      data-frame-width={Math.round(layout.width)}
      data-frame-height={Math.round(layout.height)}
      data-watering-active={running && caretakerAction === 'watering-walk' ? 'true' : 'false'}
      style={{ '--garden-radius': `${layout.radius}px` } as CSSProperties}
    >
      <GardenArtwork
        action={caretakerAction}
        blooms={blooms}
        flights={flights}
        growth={growth}
        layout={layout}
        rings={rings}
        running={running}
        taskSeed={taskSeed}
        onLand={onLand}
      />
      <div className={css.copy}>
        <span className={css.title}>{t('label.title')}</span>
        <span className={css.stage} role="status">{t(STAGE_LABELS[growth.stage])}</span>
        <span className={css.turns}>{t('label.turns', { turns })}</span>
      </div>
    </div>
  )
}
