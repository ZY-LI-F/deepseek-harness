import type { BuddyMood } from './PocketBuddy.tsx'
import {
  LONG_GROOMING_DURATION_MS,
  LIE_DOWN_DURATION_MS,
  POUNCE_ANIMATION_DURATION_MS,
  SEATED_REST_DURATION_MS,
  SEATED_DOUBLE_WASH_DURATION_MS,
  SEATED_HOLD_DURATION_MS,
  SEATED_LICK_DURATION_MS,
  SEATED_SETTLE_DURATION_MS,
  SIT_DOWN_DURATION_MS,
  SLEEP_SCENE_DURATION_MS,
  SLEEPING_REST_DURATION_MS,
  STAND_UP_DURATION_MS,
  WAKE_UP_DURATION_MS,
} from './animationTiming.ts'

/** Visible action states supported by the full-frame companion. */
export type BuddyAction =
  | 'breathe'
  | 'blink'
  | 'turn'
  | 'wander'
  | 'rest'
  | 'sleep'
  | 'lick-paw'
  | 'wash-face'
  | 'stretch'
  | 'hop'
  | 'chase-ball'
  | 'look-left'
  | 'respond'
  | 'work'
  | 'celebrate'

/** Internal whole-body cels used only by the posture-aware routine compiler. */
export type BuddyChoreographyAction =
  | 'lie-down'
  | 'wake-up'
  | 'sleeping-rest'
  | 'sit-down'
  | 'stand-up'
  | 'seated-rest'
  | 'seated-lick-paw'
  | 'seated-wash-face'
  | 'seated-settle'

/** Union accepted by the complete-character cel player. */
export type BuddyPlaybackAction = BuddyAction | BuddyChoreographyAction

/** Four authored bearings used by the complete-character cel sets. */
export type BuddyDirection = 'left' | 'right' | 'toward' | 'away'

/** One autonomous or user-triggered companion action. */
export interface BuddyBeat {
  action: BuddyAction
}

/** One position in viewport pixels. */
export interface BuddyPoint {
  x: number
  y: number
}

/** The continuous screen area available to the roaming actor. */
export interface BuddyBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** One footprint emitted from an actual gait contact point. */
export interface PawTrailPrint extends BuddyPoint {
  id: number
  rotation: number
  side: 'left' | 'right'
}

/** Constant ground speed used to bind screen travel to the walk cycle. */
export const BUDDY_WALK_SPEED = 64

/** Travel distance for one complete full-body gait cycle. */
export const BUDDY_STRIDE_LENGTH = 72

/** Number of reviewed intact-cat frames in each Peach Tabby gait cycle. */
export const BUDDY_GAIT_FRAME_COUNT = 8

/** Visible duration of each self-contained action, including its authored entry and exit. */
export const BUDDY_ACTION_DURATION_MS: Readonly<Partial<Record<BuddyPlaybackAction, number>>> = Object.freeze({
  breathe: 800,
  blink: 900,
  turn: 520,
  rest: SEATED_REST_DURATION_MS,
  sleep: SLEEP_SCENE_DURATION_MS,
  'lick-paw': 2500,
  'wash-face': LONG_GROOMING_DURATION_MS,
  stretch: 1500,
  hop: 1400,
  'chase-ball': POUNCE_ANIMATION_DURATION_MS,
  'look-left': 950,
  respond: 900,
  'lie-down': LIE_DOWN_DURATION_MS,
  'wake-up': WAKE_UP_DURATION_MS,
  'sleeping-rest': SLEEPING_REST_DURATION_MS,
  'sit-down': SIT_DOWN_DURATION_MS,
  'stand-up': STAND_UP_DURATION_MS,
  'seated-rest': SEATED_HOLD_DURATION_MS,
  'seated-lick-paw': SEATED_LICK_DURATION_MS,
  'seated-wash-face': SEATED_DOUBLE_WASH_DURATION_MS,
  'seated-settle': SEATED_SETTLE_DURATION_MS,
})

/** Camera pitch retained by the preserved optional 3D renderer source. */
export const BUDDY_CAMERA_PITCH_RADIANS = 32 * Math.PI / 180

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

/**
 * Resolve the screen-safe roaming rectangle from the live actor and viewport.
 *
 * @param viewportWidth - Current viewport width in pixels.
 * @param viewportHeight - Current viewport height in pixels.
 * @param actorWidth - Rendered actor width in pixels.
 * @param actorHeight - Rendered actor height in pixels.
 * @returns Bounds that retain the whole cat and avoid the fixed header and composer edge.
 */
export function deriveBuddyBounds(
  viewportWidth: number,
  viewportHeight: number,
  actorWidth: number,
  actorHeight: number,
): BuddyBounds {
  const horizontalInset = viewportWidth <= 720 ? 12 : 24
  const topInset = viewportHeight <= 560 ? 58 : 76
  const bottomInset = viewportHeight <= 560 ? 62 : 112
  const maxX = Math.max(horizontalInset, viewportWidth - actorWidth - horizontalInset)
  const maxY = Math.max(topInset, viewportHeight - actorHeight - bottomInset)
  return { minX: horizontalInset, maxX, minY: topInset, maxY }
}

/**
 * Place the cat immediately to the right of Task Garden's lower-left caretaker.
 *
 * These measurements intentionally mirror TaskGarden.module.css. The actor is
 * wider than the normalized 100 px cat artwork, so the visible-cat inset is
 * removed before the gap is applied. The result stays valid even when Task
 * Garden is not mounted; it is simply the shared lower-left companion dock.
 *
 * @param viewportWidth - Current viewport width in pixels.
 * @param viewportHeight - Current viewport height in pixels.
 * @param actorWidth - Rendered cat actor width in pixels.
 * @param actorHeight - Rendered cat actor height in pixels.
 * @returns A clamped top-left actor coordinate beside the caretaker.
 */
export function deriveBuddyCaretakerDock(
  viewportWidth: number,
  viewportHeight: number,
  actorWidth: number,
  actorHeight: number,
): BuddyPoint {
  const safeViewportWidth = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : 1
  const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 1
  const safeActorWidth = Number.isFinite(actorWidth) ? Math.max(1, actorWidth) : 1
  const safeActorHeight = Number.isFinite(actorHeight) ? Math.max(1, actorHeight) : 1
  const compact = safeViewportWidth <= 620
  const caretakerHeight = Math.min(80, safeViewportHeight * .12)
  const caretakerWidth = compact
    ? clamp(safeViewportWidth * .28, 104, 132)
    : caretakerHeight * .842_105
  const caretakerLeft = compact ? 8 : clamp(safeViewportWidth * .018, 14, 26)
  const caretakerBottom = compact ? 70 : clamp(safeViewportHeight * .08, 64, 92)
  const visibleCatWidth = Math.min(100, safeActorWidth)
  const catInset = (safeActorWidth - visibleCatWidth) / 2
  const edgeInset = 8
  const desired = {
    x: caretakerLeft + caretakerWidth + 10 - catInset,
    y: safeViewportHeight - caretakerBottom - safeActorHeight,
  }
  return {
    x: clamp(desired.x, edgeInset, Math.max(edgeInset, safeViewportWidth - safeActorWidth - edgeInset)),
    y: clamp(desired.y, edgeInset, Math.max(edgeInset, safeViewportHeight - safeActorHeight - edgeInset)),
  }
}

/**
 * Clamp a point after a viewport resize without choosing a new route.
 *
 * @param point - Current or target position.
 * @param bounds - Current screen-safe bounds.
 * @returns A point inside the bounds.
 */
export function clampBuddyPoint(point: BuddyPoint, bounds: BuddyBounds): BuddyPoint {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  }
}

/**
 * Choose an arbitrary point from the continuous roaming rectangle.
 *
 * Short or near-vertical samples are redirected to the opposite half of the
 * same rectangle. The result remains a free coordinate rather than a named
 * anchor, while the side-view source artwork keeps a believable bearing.
 *
 * @param current - Current top-left actor position.
 * @param bounds - Current continuous screen-safe bounds.
 * @param sampleX - Normalized horizontal random sample.
 * @param sampleY - Normalized vertical random sample.
 * @param sampleBias - Normalized sample used only when a route needs redirecting.
 * @returns A non-trivial continuous target inside the bounds.
 */
export function chooseRandomBuddyTarget(
  current: BuddyPoint,
  bounds: BuddyBounds,
  sampleX: number,
  sampleY: number,
  sampleBias: number,
): BuddyPoint {
  const normalizedX = Number.isFinite(sampleX) ? clamp(sampleX, 0, .999_999) : .5
  const normalizedY = Number.isFinite(sampleY) ? clamp(sampleY, 0, .999_999) : .5
  const normalizedBias = Number.isFinite(sampleBias) ? clamp(sampleBias, 0, .999_999) : .5
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const candidate = {
    x: bounds.minX + width * normalizedX,
    y: bounds.minY + height * normalizedY,
  }
  const deltaX = candidate.x - current.x
  const deltaY = candidate.y - current.y
  const minimumDistance = Math.min(240, Math.hypot(width, height) * .24)
  if (Math.hypot(deltaX, deltaY) >= minimumDistance && Math.abs(deltaX) >= Math.abs(deltaY) * .24) {
    return candidate
  }

  const middleX = (bounds.minX + bounds.maxX) / 2
  const goRight = current.x < middleX || (current.x === middleX && normalizedBias >= .5)
  const farBand = width * (.08 + normalizedBias * .16)
  const redirectedX = goRight ? bounds.maxX - farBand : bounds.minX + farBand
  const maximumVerticalDelta = Math.abs(redirectedX - current.x) / .24
  return {
    x: redirectedX,
    y: clamp(candidate.y, current.y - maximumVerticalDelta, current.y + maximumVerticalDelta),
  }
}

/**
 * Pick the closest authored full-cat bearing from the actual route vector.
 *
 * @param from - Current actor position.
 * @param to - Current random target.
 * @param current - Orientation retained for a nearly vertical sample.
 * @returns Left, right, toward, or away without rotating a side-view cat.
 */
export function deriveBuddyDirection(from: BuddyPoint, to: BuddyPoint, current: BuddyDirection): BuddyDirection {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  if (Math.hypot(deltaX, deltaY) < 10) return current
  if (Math.abs(deltaX) >= Math.abs(deltaY) * 1.15) return deltaX > 0 ? 'right' : 'left'
  return deltaY > 0 ? 'toward' : 'away'
}

/**
 * Resolve the screen-space bearing of an actual route.
 *
 * @param from - Current actor position.
 * @param to - Current random target.
 * @returns Route bearing in radians.
 */
export function deriveBuddyHeading(from: BuddyPoint, to: BuddyPoint): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

/**
 * Derive constant-speed travel time for diagnostics and tests.
 *
 * @param from - Current actor position.
 * @param to - Current random target.
 * @param speed - Ground speed in pixels per second.
 * @returns Linear travel duration in milliseconds.
 */
export function deriveTravelDuration(from: BuddyPoint, to: BuddyPoint, speed = BUDDY_WALK_SPEED): number {
  if (speed <= 0) return 0
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) / speed * 1000)
}

/**
 * Select an intact-cat frame from actual ground distance rather than wall time.
 *
 * @param distance - Total distance travelled in pixels.
 * @returns A stable zero-based frame index in the reviewed gait cycle.
 */
export function deriveBuddyGaitFrame(distance: number): number {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0
  const cycleProgress = (safeDistance % BUDDY_STRIDE_LENGTH) / BUDDY_STRIDE_LENGTH
  return Math.min(BUDDY_GAIT_FRAME_COUNT - 1, Math.floor(cycleProgress * BUDDY_GAIT_FRAME_COUNT))
}

/**
 * Place one alternating print at the cat's real contact point.
 *
 * @param actorPosition - Current top-left actor position.
 * @param actorWidth - Rendered actor width in pixels.
 * @param actorHeight - Rendered actor height in pixels.
 * @param heading - Current screen-space bearing in radians.
 * @param id - Monotonic footprint id.
 * @returns A footprint behind the moving full-frame cat.
 */
export function derivePawTrailPrint(
  actorPosition: BuddyPoint,
  actorWidth: number,
  actorHeight: number,
  heading: number,
  id: number,
): PawTrailPrint {
  const side: PawTrailPrint['side'] = id % 2 === 0 ? 'left' : 'right'
  const sideOffset = side === 'left' ? -7 : 7
  return {
    id,
    x: actorPosition.x + actorWidth * .5 - Math.sin(heading) * sideOffset,
    y: actorPosition.y + actorHeight * .89 + Math.cos(heading) * sideOffset,
    rotation: heading * 180 / Math.PI + 90,
    side,
  }
}

/** Human-readable behavior family used for routine pacing and diagnostics. */
export type BuddyRoutineCategory = 'grooming' | 'observing' | 'resting' | 'playing' | 'roaming'

/** Whole-body posture at an action boundary. */
export type BuddyPose = 'standing' | 'seated' | 'lying' | 'moving'

/** Semantic actions eligible for multi-action autonomous routines. */
export type BuddyComposableAction = Extract<
  BuddyAction,
  'wash-face' | 'lick-paw' | 'stretch' | 'look-left' | 'rest' | 'sleep' | 'chase-ball'
>

/** Choreography metadata for one semantic cat action. */
export interface BuddyActionDefinition {
  action: BuddyComposableAction
  category: Exclude<BuddyRoutineCategory, 'roaming'>
  durationMs: number
  energy: 'quiet' | 'active'
  entryPose: BuddyPose
  exitPose: BuddyPose
  performancePose: BuddyPose
  terminal?: boolean
  weight: number
}

/** Fully compiled multi-action scene ready for cel playback. */
export interface BuddyRoutineScene {
  actions: readonly BuddyAction[]
  category: BuddyRoutineCategory
  combinationNotation: string
  id: string
  permutationSize: number
  poseFlow: string
  steps: readonly BuddyRoutineStep[]
  theoreticalPermutationCount: number
  totalDurationMs: number
  transitionCount: number
}

/** One posture transition or visible performance inside a routine scene. */
export interface BuddyRoutineStep {
  action: BuddyPlaybackAction
  durationMs: number
  role: 'performance' | 'transition'
  semanticAction?: BuddyComposableAction
}

/** Shared duration for standing blinks and seated settle bridges. */
export const BUDDY_COMBINATION_BRIDGE_DURATION_MS = 760

/** Keep autonomous performances readable without monopolizing the screen. */
export const BUDDY_COMBINATION_MAX_DURATION_MS = 18_000

/**
 * Autonomous action vocabulary. Every action contains its own authored entry
 * and exit, so combinations always return to the exact standing anchor.
 */
export const BUDDY_ACTION_CATALOG = [
  {
    action: 'wash-face', category: 'grooming', durationMs: SEATED_DOUBLE_WASH_DURATION_MS,
    energy: 'quiet', entryPose: 'seated', performancePose: 'seated', exitPose: 'seated', weight: 1.35,
  },
  {
    action: 'lick-paw', category: 'grooming', durationMs: SEATED_LICK_DURATION_MS,
    energy: 'quiet', entryPose: 'seated', performancePose: 'seated', exitPose: 'seated', weight: 1.1,
  },
  {
    action: 'stretch', category: 'observing', durationMs: 1500,
    energy: 'quiet', entryPose: 'standing', performancePose: 'standing', exitPose: 'standing', weight: 1.1,
  },
  {
    action: 'look-left', category: 'observing', durationMs: 950,
    energy: 'quiet', entryPose: 'standing', performancePose: 'standing', exitPose: 'standing', weight: 1.25,
  },
  {
    action: 'rest', category: 'resting', durationMs: SEATED_HOLD_DURATION_MS,
    energy: 'quiet', entryPose: 'seated', performancePose: 'seated', exitPose: 'seated', weight: 1.3,
  },
  {
    action: 'sleep', category: 'resting', durationMs: SLEEP_SCENE_DURATION_MS,
    energy: 'quiet', entryPose: 'standing', performancePose: 'lying', exitPose: 'standing', terminal: true, weight: .72,
  },
  {
    action: 'chase-ball', category: 'playing', durationMs: POUNCE_ANIMATION_DURATION_MS,
    energy: 'active', entryPose: 'standing', performancePose: 'moving', exitPose: 'standing', weight: .62,
  },
] as const satisfies readonly BuddyActionDefinition[]

const BUDDY_ACTION_COUNT = BUDDY_ACTION_CATALOG.length

/**
 * Calculate the mathematical size of P(n,m) before choreography constraints.
 * @param n - Available distinct action count.
 * @param m - Ordered selection size.
 * @returns The bounded permutation count, or zero when the selection is impossible.
 */
export function derivePermutationCount(n: number, m: number): number {
  const safeN = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  const safeM = Number.isFinite(m) ? Math.max(0, Math.floor(m)) : 0
  if (safeM > safeN) return 0
  let result = 1
  for (let index = 0; index < safeM; index += 1) result *= safeN - index
  return result
}

function seededUnit(seed: number, salt: number): number {
  const safeSeed = Number.isFinite(seed) ? Math.floor(seed) : 0
  let value = (safeSeed + Math.imul(salt + 1, 0x9e37_79b9)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb_352d)
  value ^= value >>> 15
  value = Math.imul(value, 0x846c_a68b)
  value ^= value >>> 16
  return value / 0x1_0000_0000
}

function performanceStep(definition: BuddyActionDefinition): BuddyRoutineStep {
  const action: BuddyPlaybackAction = definition.action === 'wash-face'
    ? 'seated-wash-face'
    : definition.action === 'lick-paw'
      ? 'seated-lick-paw'
      : definition.action === 'rest'
        ? 'seated-rest'
        : definition.action
  return {
    action,
    durationMs: BUDDY_ACTION_DURATION_MS[action] ?? definition.durationMs,
    role: 'performance',
    semanticAction: definition.action,
  }
}

function postureTransition(from: BuddyPose, to: BuddyPose): BuddyRoutineStep | undefined {
  if (from === 'standing' && to === 'seated') {
    return { action: 'sit-down', durationMs: SIT_DOWN_DURATION_MS, role: 'transition' }
  }
  if (from === 'seated' && to === 'standing') {
    return { action: 'stand-up', durationMs: STAND_UP_DURATION_MS, role: 'transition' }
  }
  return undefined
}

function postureBridge(pose: BuddyPose): BuddyRoutineStep {
  return pose === 'seated'
    ? { action: 'seated-settle', durationMs: SEATED_SETTLE_DURATION_MS, role: 'transition' }
    : { action: 'blink', durationMs: BUDDY_COMBINATION_BRIDGE_DURATION_MS, role: 'transition' }
}

/**
 * Compile semantic actions into complete-cel performance and posture transition steps.
 * @param selected - Ordered semantic actions chosen for this routine.
 * @returns Complete-character playback steps with every required posture bridge.
 */
export function compileBuddyRoutineSteps(
  selected: readonly BuddyActionDefinition[],
): readonly BuddyRoutineStep[] {
  const steps: BuddyRoutineStep[] = []
  let pose: BuddyPose = 'standing'

  for (const [index, definition] of selected.entries()) {
    if (pose !== definition.entryPose) {
      const transition = postureTransition(pose, definition.entryPose)
      if (transition !== undefined) steps.push(transition)
    } else if (index > 0) {
      steps.push(postureBridge(pose))
    }
    steps.push(performanceStep(definition))
    pose = definition.exitPose
  }

  if (pose !== 'standing') {
    const transition = postureTransition(pose, 'standing')
    if (transition !== undefined) steps.push(transition)
  }
  return steps
}

function derivePoseFlow(selected: readonly BuddyActionDefinition[]): string {
  const poses: BuddyPose[] = ['standing']
  for (const definition of selected) {
    for (const pose of [definition.entryPose, definition.performancePose, definition.exitPose]) {
      if (poses.at(-1) !== pose) poses.push(pose)
    }
  }
  if (poses.at(-1) !== 'standing') poses.push('standing')
  return poses.join('>')
}

function canAppendBuddyAction(
  selected: readonly BuddyActionDefinition[],
  candidate: BuddyActionDefinition,
  slot: number,
  targetSize: number,
): boolean {
  if (selected.some(item => item.action === candidate.action)) return false
  if (candidate.terminal === true && slot !== targetSize - 1) return false
  const previous = selected.at(-1)
  if (previous?.category === 'resting' && candidate.category === 'resting') return false
  if (previous?.terminal === true) return false
  if (candidate.energy === 'active' && selected.some(item => item.energy === 'active')) return false
  const steps = compileBuddyRoutineSteps([...selected, candidate])
  return steps.reduce((total, step) => total + step.durationMs, 0) <= BUDDY_COMBINATION_MAX_DURATION_MS
}

/** Optional recent-history and size constraints for routine planning. */
export interface BuddyCombinationOptions {
  recentActions?: readonly BuddyAction[]
  size?: 2 | 3
}

/**
 * Choose a weighted permutation without replacement, then apply choreography
 * constraints. The hash seed makes a run inspectable while recent actions keep
 * adjacent runs from feeling cyclic.
 *
 * @param seed - Deterministic routine seed.
 * @param options - Desired size and actions to de-prioritize.
 * @returns A posture-safe compiled routine scene.
 */
export function planBuddyActionCombination(
  seed: number,
  options: BuddyCombinationOptions = {},
): BuddyRoutineScene {
  const targetSize = options.size ?? (Math.abs(Math.floor(seed)) % 4 === 2 ? 3 : 2)
  const recent = new Set(options.recentActions ?? [])
  const selected: BuddyActionDefinition[] = []

  for (let slot = 0; slot < targetSize; slot += 1) {
    const compatible = BUDDY_ACTION_CATALOG.filter(candidate => (
      canAppendBuddyAction(selected, candidate, slot, targetSize)
    ))
    const notRecent = compatible.filter(candidate => !recent.has(candidate.action))
    const pool = notRecent.length > 0 ? notRecent : compatible
    const ranked = pool.map((candidate, index) => ({
      candidate,
      key: Math.pow(Math.max(.000_001, seededUnit(seed, slot * 31 + index)), 1 / candidate.weight),
    })).sort((left, right) => right.key - left.key)
    const next = ranked[0]?.candidate
    if (next === undefined) break
    selected.push(next)
  }

  const actions = selected.map(item => item.action)
  const steps = compileBuddyRoutineSteps(selected)
  const transitionCount = steps.filter(step => step.role === 'transition').length
  const totalDurationMs = steps.reduce((total, step) => total + step.durationMs, 0)
  const notation = `P(${BUDDY_ACTION_COUNT},${actions.length})`
  return {
    id: `combo-${actions.length}-${actions.join('-')}`,
    category: selected[0]?.category ?? 'observing',
    actions,
    combinationNotation: notation,
    permutationSize: actions.length,
    poseFlow: derivePoseFlow(selected),
    steps,
    theoreticalPermutationCount: derivePermutationCount(BUDDY_ACTION_COUNT, actions.length),
    totalDurationMs,
    transitionCount,
  }
}

const BUDDY_ROAMING_SCENE: BuddyRoutineScene = {
  id: 'relocate',
  category: 'roaming',
  actions: ['wander'],
  combinationNotation: 'P(1,1)',
  permutationSize: 1,
  poseFlow: 'standing>moving>standing',
  steps: [{ action: 'wander', durationMs: 0, role: 'performance' }],
  theoreticalPermutationCount: 1,
  totalDurationMs: 0,
  transitionCount: 0,
}

/** Preview cycle for inspection; live scenes continue hashing beyond this list. */
export const BUDDY_ROUTINE_SCENES: readonly BuddyRoutineScene[] = [
  planBuddyActionCombination(0, { size: 2 }),
  planBuddyActionCombination(1, { size: 2 }),
  planBuddyActionCombination(2, { size: 3 }),
  planBuddyActionCombination(3, { size: 2 }),
  planBuddyActionCombination(4, { size: 2 }),
  planBuddyActionCombination(5, { size: 2 }),
  planBuddyActionCombination(6, { size: 3 }),
  BUDDY_ROAMING_SCENE,
]

/** Compatibility view used by diagnostics that inspect individual beats. */
export const BUDDY_ROUTINE: readonly BuddyBeat[] = [
  ...BUDDY_ACTION_CATALOG.map(({ action }) => ({ action })),
  { action: 'wander' },
]

/** Stationary scenes are checked at this cadence; busy scenes simply skip a tick. */
export const BUDDY_ROUTINE_INTERVAL_MS = 8000

/**
 * The caretaker-side routine is deliberately rest-heavy. Moving actions are
 * excluded so a settled cat never drifts away from the girl after arriving.
 */
export const BUDDY_CARETAKER_ROUTINE: readonly BuddyAction[] = [
  'rest', 'lick-paw',
  'rest', 'wash-face',
  'rest', 'sleep',
  'rest', 'stretch',
  'rest', 'look-left',
  'rest', 'respond',
  'rest', 'hop',
]

const buddyStep = (
  action: BuddyPlaybackAction,
  role: BuddyRoutineStep['role'],
  semanticAction?: BuddyComposableAction,
): BuddyRoutineStep => ({
  action,
  durationMs: BUDDY_ACTION_DURATION_MS[action] ?? 1800,
  role,
  ...(semanticAction === undefined ? {} : { semanticAction }),
})

/**
 * Compile one caretaker-side action while returning to the sleeping pose.
 * The cat wakes before a gesture and lies back down afterwards; grooming uses
 * the reviewed sitting bridges between those two complete-body transitions.
 *
 * @param tick - Stable caretaker routine index.
 * @returns A rest-heavy scene that begins and ends beside the caretaker.
 */
export function deriveBuddyCaretakerRoutineScene(tick: number): BuddyRoutineScene {
  const safeTick = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0
  const semantic = BUDDY_CARETAKER_ROUTINE[safeTick % BUDDY_CARETAKER_ROUTINE.length] ?? 'rest'
  let category: BuddyRoutineCategory = 'resting'
  let steps: readonly BuddyRoutineStep[]

  if (semantic === 'rest' || semantic === 'sleep') {
    steps = [buddyStep('sleeping-rest', 'performance', semantic)]
  } else if (semantic === 'lick-paw') {
    category = 'grooming'
    steps = [
      buddyStep('wake-up', 'transition'),
      buddyStep('sit-down', 'transition'),
      buddyStep('seated-lick-paw', 'performance', 'lick-paw'),
      buddyStep('stand-up', 'transition'),
      buddyStep('lie-down', 'transition'),
    ]
  } else if (semantic === 'wash-face') {
    category = 'grooming'
    steps = [
      buddyStep('wake-up', 'transition'),
      buddyStep('sit-down', 'transition'),
      buddyStep('seated-wash-face', 'performance', 'wash-face'),
      buddyStep('stand-up', 'transition'),
      buddyStep('lie-down', 'transition'),
    ]
  } else {
    category = 'observing'
    steps = [
      buddyStep('wake-up', 'transition'),
      buddyStep(semantic, 'performance', semantic === 'stretch' || semantic === 'look-left'
        ? semantic
        : undefined),
      buddyStep('lie-down', 'transition'),
    ]
  }

  const transitionCount = steps.filter(step => step.role === 'transition').length
  return {
    id: `caretaker-${semantic}`,
    category,
    actions: [semantic],
    combinationNotation: 'caretaker(1)',
    permutationSize: 1,
    poseFlow: transitionCount === 0 ? 'lying>lying' : 'lying>standing>lying',
    steps,
    theoreticalPermutationCount: BUDDY_CARETAKER_ROUTINE.length,
    totalDurationMs: steps.reduce((total, step) => total + step.durationMs, 0),
    transitionCount,
  }
}

const DEFAULT_BUDDY_BEAT: BuddyBeat = { action: 'blink' }

/**
 * Plan the next idle routine while spacing recently played semantic actions.
 * @param tick - Stable autonomous routine index.
 * @param recentActions - Recently completed actions to de-prioritize.
 * @returns The next compiled autonomous routine scene.
 */
export function deriveBuddyRoutineScene(
  tick: number,
  recentActions: readonly BuddyAction[] = [],
): BuddyRoutineScene {
  const safeTick = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0
  if ((safeTick + 1) % BUDDY_ROUTINE_SCENES.length === 0) return BUDDY_ROAMING_SCENE
  return planBuddyActionCombination(safeTick, { recentActions })
}

/**
 * Map Session mood plus an ephemeral tick to one visible animation beat.
 *
 * @param mood - Folded state of the visible Session list.
 * @param tick - Ephemeral routine index used only while idle.
 * @returns The next companion action without prescribing a screen coordinate.
 */
export function deriveBuddyBeat(mood: BuddyMood, tick: number): BuddyBeat {
  if (mood === 'working') return { action: 'work' }
  if (mood === 'needs-you') return { action: 'hop' }
  if (mood === 'celebrate') return { action: 'celebrate' }
  const safeTick = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0
  return BUDDY_ROUTINE[safeTick % BUDDY_ROUTINE.length] ?? DEFAULT_BUDDY_BEAT
}
