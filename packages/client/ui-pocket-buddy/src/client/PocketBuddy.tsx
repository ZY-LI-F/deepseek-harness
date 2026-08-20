/** Frame-overlay companion: Session mood mapping plus continuous source-rig roaming. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import {
  BUDDY_ACTION_DURATION_MS,
  BUDDY_ROUTINE_INTERVAL_MS,
  deriveBuddyBeat,
  deriveBuddyCaretakerDock,
  deriveBuddyCaretakerRoutineScene,
  deriveBuddyRoutineScene,
  type BuddyAction,
  type BuddyComposableAction,
  type BuddyDirection,
  type BuddyPlaybackAction,
  type PawTrailPrint,
  type BuddyRoutineScene,
} from './motion.ts'
import { PeachCelCat } from './PeachCelCat.tsx'
import {
  CAT_REFERENCE_DISPLAY_SCALE,
  CAT_RENDER_BOX_EDGE_PX,
  CAT_TARGET_VISUAL_EDGE_PX,
  normalizeCatFrameScale,
} from './catSizing.ts'
import {
  POUNCE_TRAVEL_RATIO,
} from './animationTiming.ts'
import { PEACH_CEL_WALK_SIDE } from './peach-cat-cels-v5.generated.ts'
import { useRandomBuddyWalk } from './useRandomBuddyWalk.ts'
import {
  shouldPlayCatMeow,
  type CatMeowAction,
  type CatMeowContext,
  type SoulAudioCue,
} from './audio.ts'
import { BUDDY_SKINS, type BuddySkin, type createPocketBuddyStore } from './store.ts'
import {
  CLOUD_IDLE, CLOUD_WALK_0, CLOUD_WALK_1, CLOUD_WALK_2, PAW_PRINT,
  STAR_IDLE, STAR_WALK_0, STAR_WALK_1, STAR_WALK_2,
} from './material-assets.generated.ts'
import css from './PocketBuddy.module.css'

export type BuddyMood = 'idle' | 'working' | 'needs-you' | 'celebrate'

/** Collapse the global session list into the four stable moods the artwork knows. */
export function deriveBuddyMood(state: SessionListState): BuddyMood {
  const summaries = state.ids.map(id => state.byId[id]).filter(summary => summary !== undefined)
  const current = state.current === undefined ? undefined : state.byId[state.current]
  if (current?.pendingInteraction !== undefined || summaries.some(summary => summary.pendingInteraction !== undefined)) {
    return 'needs-you'
  }
  if (current?.running === true || summaries.some(summary => summary.running)) return 'working'
  if (current?.completed === true || summaries.some(summary => summary.completed === true)) return 'celebrate'
  return 'idle'
}

/** Whether any listed Session is still doing work; used only for the short finish transition. */
export function hasRunningSession(state: SessionListState): boolean {
  return state.ids.some(id => state.byId[id]?.running === true)
}

/** A paused or completed current task should reunite both page companions. */
export function shouldBuddySettleWithCaretaker(state: SessionListState): boolean {
  const summaries = state.ids.map(id => state.byId[id]).filter(summary => summary !== undefined)
  if (summaries.some(summary => summary.running || summary.pendingInteraction !== undefined)) return false
  const current = state.current === undefined ? undefined : state.byId[state.current]
  if (current !== undefined) return current.completed || !current.blank
  return summaries.some(summary => summary.completed || !summary.blank)
}

const SKIN_LABELS: Record<BuddySkin, 'skin.peachCat' | 'skin.seaBun' | 'skin.nightJelly'> = {
  'peach-cat': 'skin.peachCat',
  'sea-bun': 'skin.seaBun',
  'night-jelly': 'skin.nightJelly',
}

const MOOD_LABELS: Record<BuddyMood, 'mood.idle' | 'mood.working' | 'mood.needsYou' | 'mood.celebrate'> = {
  idle: 'mood.idle',
  working: 'mood.working',
  'needs-you': 'mood.needsYou',
  celebrate: 'mood.celebrate',
}

interface RasterCatFrame {
  scale: number
  source: string
}

interface RasterCatMaterial {
  idle: RasterCatFrame
  walk: readonly [RasterCatFrame, RasterCatFrame, RasterCatFrame]
}

const rasterFrame = (
  source: string,
  visualEdgePx: number,
  sourceCanvasLongestEdgePx: number,
): RasterCatFrame => ({
  scale: normalizeCatFrameScale(visualEdgePx, sourceCanvasLongestEdgePx),
  source,
})

const CAT_MATERIALS: Record<BuddySkin, RasterCatMaterial> = {
  'peach-cat': {
    idle: rasterFrame(PEACH_CEL_WALK_SIDE[0], 322, 384),
    walk: [
      rasterFrame(PEACH_CEL_WALK_SIDE[0], 322, 384),
      rasterFrame(PEACH_CEL_WALK_SIDE[1], 322, 384),
      rasterFrame(PEACH_CEL_WALK_SIDE[2], 322, 384),
    ],
  },
  'sea-bun': {
    idle: rasterFrame(CLOUD_IDLE, 343, 348),
    walk: [
      rasterFrame(CLOUD_WALK_0, 131, 131),
      rasterFrame(CLOUD_WALK_1, 142, 142),
      rasterFrame(CLOUD_WALK_2, 110, 133),
    ],
  },
  'night-jelly': {
    idle: rasterFrame(STAR_IDLE, 352, 360),
    walk: [
      rasterFrame(STAR_WALK_0, 120, 138),
      rasterFrame(STAR_WALK_1, 123, 132),
      rasterFrame(STAR_WALK_2, 117, 133),
    ],
  },
}

function RasterSkinCat({
  skin, action, direction,
}: {
  skin: Exclude<BuddySkin, 'peach-cat'>
  action: BuddyPlaybackAction
  direction: BuddyDirection
}) {
  const material = CAT_MATERIALS[skin]
  return (
    <div
      className={css.sourceCatStage}
      data-cat-material={skin}
      data-cat-style="reviewed-raster-sequence"
      data-display-scale={CAT_REFERENCE_DISPLAY_SCALE.toFixed(4)}
      data-renderer="dom-raster-sequence"
      data-target-visual-edge-px={CAT_TARGET_VISUAL_EDGE_PX}
      style={{
        '--cat-display-scale': CAT_REFERENCE_DISPLAY_SCALE,
        '--cat-render-box-edge': `${CAT_RENDER_BOX_EDGE_PX}px`,
        '--cat-render-box-half-edge': `${-CAT_RENDER_BOX_EDGE_PX / 2}px`,
      } as CSSProperties}
    >
      <div className={css.sourceCatFacing} data-direction={direction}>
        <div
          className={css.rasterCatSequence}
          data-action={action}
          data-character-scale="frame-normalized-100px-max-edge"
        >
          <img
            className={css.rasterIdle}
            data-frame-scale={material.idle.scale.toFixed(4)}
            src={material.idle.source}
            alt=""
            draggable={false}
            style={{ '--cat-frame-scale': material.idle.scale } as CSSProperties}
          />
          {material.walk.map((frame, index) => (
            <img
              key={frame.source}
              className={css.rasterWalkFrame}
              data-frame={index}
              data-frame-scale={frame.scale.toFixed(4)}
              src={frame.source}
              alt=""
              draggable={false}
              style={{ '--cat-frame-scale': frame.scale } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function BuddyArtwork({
  skin, action, direction,
}: {
  skin: BuddySkin
  action: BuddyPlaybackAction
  direction: BuddyDirection
}) {
  if (skin === 'peach-cat') return <PeachCelCat action={action} direction={direction} />
  return <RasterSkinCat skin={skin} action={action} direction={direction} />
}

function CatChoicePreview({ skin }: { skin: BuddySkin }) {
  return <img className={css.catChoicePreview} data-cat-choice-preview={skin} src={CAT_MATERIALS[skin].idle.source} alt="" draggable={false} />
}

function PawPrintTrail({
  prints, remove,
}: {
  prints: readonly PawTrailPrint[]
  remove: (id: number) => void
}) {
  if (prints.length === 0) return null
  return (
    <div className={css.pawTrail} data-paw-trail="actual-gait" aria-hidden>
      {prints.map(print => (
        <img
          key={print.id}
          className={css.pawPrint}
          data-paw-print=""
          data-paw-side={print.side}
          data-paw-id={print.id}
          src={PAW_PRINT}
          alt=""
          draggable={false}
          onAnimationEnd={() => { remove(print.id) }}
          style={{
            '--paw-x': `${print.x}px`,
            '--paw-y': `${print.y}px`,
            '--paw-rotation': `${print.rotation}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

export type PocketBuddyProps = PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createPocketBuddyStore>>
  & PropsLocale<'pocket-buddy'>
  & PocketBuddyInjected

export interface PocketBuddyInjected {
  setAudioEnabled: (enabled: boolean) => void
  playSound: (cue: SoulAudioCue) => void
}

type HorizontalBuddyDirection = Extract<BuddyDirection, 'left' | 'right'>
type BuddyCompanionMode = 'roaming' | 'docking' | 'settling' | 'resting' | 'waking'

interface ChasePathPlan {
  direction: HorizontalBuddyDirection
  deltaX: number
  endX: number
  launchX: number
  midX: number
  overshootX: number
  rasterEndX: number
  rasterMidX: number
  startX: number
}

interface ActionOptions {
  durationMs?: number
  fromUser?: boolean
  onComplete?: () => void
  routine?: boolean
  semanticAction?: BuddyComposableAction
  soundContext?: CatMeowContext
}

const CAT_MEOW_ACTIONS: readonly CatMeowAction[] = [
  'lick-paw', 'wash-face', 'chase-ball', 'respond',
]

function isCatMeowAction(action: BuddyPlaybackAction): action is CatMeowAction {
  return CAT_MEOW_ACTIONS.includes(action as CatMeowAction)
}

const DEFAULT_CHASE_PATH: ChasePathPlan = {
  direction: 'left',
  deltaX: -90,
  startX: -63,
  midX: -76,
  launchX: -88,
  overshootX: -105,
  rasterEndX: -90,
  rasterMidX: -58,
  endX: -98,
}

/** Keep the first pounce cel aligned, then end at a real screen-safe displacement. */
function deriveChasePath(
  rectangle: Pick<DOMRect, 'left' | 'right' | 'width'>,
  viewportWidth: number,
  currentDirection: BuddyDirection,
): ChasePathPlan {
  const width = rectangle.width || (viewportWidth <= 720 ? 176 : 214)
  const inset = viewportWidth <= 720 ? 12 : 24
  const desiredTravel = width * POUNCE_TRAVEL_RATIO
  const available = {
    left: Math.max(0, rectangle.left - inset),
    right: Math.max(0, viewportWidth - inset - rectangle.right),
  }
  const preferred = currentDirection === 'left' || currentDirection === 'right'
    ? currentDirection
    : undefined
  const direction: HorizontalBuddyDirection = preferred !== undefined && available[preferred] >= desiredTravel
    ? preferred
    : available.right >= available.left ? 'right' : 'left'
  const travel = Math.min(desiredTravel, available[direction])
  const startX = -width * .295
  const endX = -(travel + width * .039)
  const interpolate = (progress: number) => startX + (endX - startX) * progress
  return {
    direction,
    deltaX: direction === 'right' ? travel : -travel,
    startX,
    midX: interpolate(.46),
    launchX: interpolate(.82),
    overshootX: endX - width * .035,
    rasterEndX: -travel,
    rasterMidX: -travel * .64,
    endX,
  }
}

/** Render a screen-roaming companion and fixed, accessible wardrobe controls. */
export function PocketBuddy({
  useSessions, useStore, actions, t, setAudioEnabled, playSound,
}: PocketBuddyProps) {
  const [open, setOpen] = useState(false)
  const [finished, setFinished] = useState(false)
  const [manualAction, setManualAction] = useState<BuddyPlaybackAction>()
  const [pawTrail, setPawTrail] = useState<readonly PawTrailPrint[]>([])
  const [chasePath, setChasePath] = useState<ChasePathPlan>(DEFAULT_CHASE_PATH)
  const [routineScene, setRoutineScene] = useState<BuddyRoutineScene>()
  const [companionMode, setCompanionMode] = useState<BuddyCompanionMode>('roaming')
  const actorRef = useRef<HTMLDivElement>(null)
  const pendingChaseShift = useRef<{ x: number; y: number }>()
  const finishTimer = useRef<ReturnType<typeof setTimeout>>()
  const actionTimer = useRef<ReturnType<typeof setTimeout>>()
  const routineTimer = useRef<ReturnType<typeof setInterval>>()
  const previousRunning = useRef(false)
  const routineTick = useRef(0)
  const recentRoutineActions = useRef<readonly BuddyAction[]>([])
  const lastCatMeowAt = useRef(Number.NEGATIVE_INFINITY)
  const derivedMood = useSessions(deriveBuddyMood)
  const running = useSessions(hasRunningSession)
  const settleWithCaretaker = useSessions(shouldBuddySettleWithCaretaker)
  const skin = useStore(state => state.skin)
  const motion = useStore(state => state.motion)
  const sound = useStore(state => state.sound)
  const mood = derivedMood === 'idle' && finished ? 'celebrate' : derivedMood

  const appendPawPrint = useCallback((print: PawTrailPrint) => {
    setPawTrail(current => [...current.slice(-13), print])
  }, [])
  const removePawPrint = useCallback((id: number) => {
    setPawTrail(current => current.filter(print => print.id !== id))
  }, [])

  const handleCaretakerArrival = useCallback(() => {
    setCompanionMode(current => current === 'docking' ? 'settling' : current)
  }, [])

  const stationaryAction = manualAction !== undefined
  const walk = useRandomBuddyWalk({
    actorRef,
    enabled: motion,
    // A running task is not a reason to freeze the companion. Keep the same
    // distance-bound gait and random navigation used while idle.
    paused: open
      || stationaryAction
      || companionMode === 'settling'
      || companionMode === 'resting'
      || companionMode === 'waking'
      || (companionMode === 'roaming' && mood !== 'idle' && mood !== 'working'),
    onArrive: handleCaretakerArrival,
    onPawPrint: appendPawPrint,
  })
  const locomotionAction: BuddyAction = companionMode === 'docking' && motion && walk.mode === 'idle'
    ? 'wander'
    : walk.mode === 'walking'
      ? 'wander'
      : walk.mode === 'turning'
        ? 'turn'
        : 'breathe'
  // Working is expressed through attentive roaming and gaze, not the former
  // one-frame focused cutout. Needs-you and celebrate remain explicit poses.
  const moodAction = companionMode === 'roaming' && mood !== 'idle' && mood !== 'working'
    ? deriveBuddyBeat(mood, 0).action
    : undefined
  const companionAction: BuddyPlaybackAction = companionMode === 'settling'
    ? 'lie-down'
    : companionMode === 'waking'
      ? 'wake-up'
      : companionMode === 'resting'
        ? 'sleeping-rest'
        : moodAction ?? locomotionAction
  const action = manualAction ?? companionAction
  const artworkDirection = action === 'chase-ball'
    ? chasePath.direction
    : companionMode === 'settling' || companionMode === 'resting' || companionMode === 'waking'
      ? 'left'
      : walk.direction
  const routineContext = useRef({ companionMode, open, mood, manualAction, travelMode: walk.mode })
  routineContext.current = { companionMode, open, mood, manualAction, travelMode: walk.mode }

  const gaze = action === 'chase-ball'
    ? 'ball'
    : action === 'sleep' || action === 'sleeping-rest'
      ? 'asleep'
      : mood === 'working'
        ? 'task'
        : mood === 'needs-you'
          ? 'up'
          : 'curious'

  const startAction = useCallback((nextAction: BuddyPlaybackAction, options: ActionOptions = {}) => {
    if (actionTimer.current !== undefined) clearTimeout(actionTimer.current)
    if (options.routine !== true) setRoutineScene(undefined)
    let chaseDeltaX = 0
    if (nextAction === 'chase-ball') {
      const actor = actorRef.current
      if (actor !== null && typeof window !== 'undefined') {
        const plan = deriveChasePath(actor.getBoundingClientRect(), window.innerWidth, walk.direction)
        setChasePath(plan)
        chaseDeltaX = plan.deltaX
      }
    }
    setManualAction(nextAction)
    if (nextAction === 'wander') walk.requestWalk()
    const duration = options.durationMs ?? BUDDY_ACTION_DURATION_MS[nextAction] ?? 1800
    actionTimer.current = setTimeout(() => {
      if (nextAction === 'chase-ball') pendingChaseShift.current = { x: chaseDeltaX, y: 0 }
      if (options.onComplete !== undefined) options.onComplete()
      else setManualAction(undefined)
    }, duration)
    const soundContext = options.soundContext ?? (options.routine === true ? 'routine' : options.fromUser === true ? 'user' : undefined)
    const soundAction = options.semanticAction ?? nextAction
    const now = Date.now()
    if (
      sound
      && soundContext !== undefined
      && isCatMeowAction(soundAction)
      && shouldPlayCatMeow(soundAction, soundContext, now - lastCatMeowAt.current, Math.random())
    ) {
      playSound('cat-meow')
      lastCatMeowAt.current = now
    }
    if (nextAction === 'celebrate') playSound('cat-purr')
    if (options.fromUser === true) setOpen(false)
  }, [playSound, sound, walk.direction, walk.requestWalk])

  const startRoutineScene = useCallback((scene: BuddyRoutineScene) => {
    setRoutineScene(scene)
    const finishScene = () => {
      setRoutineScene(undefined)
      setManualAction(undefined)
    }
    const playStep = (index: number) => {
      const step = scene.steps[index]
      if (step === undefined) {
        finishScene()
        return
      }
      if (step.action === 'wander') {
        setRoutineScene(undefined)
        setManualAction(undefined)
        walk.requestWalk()
        return
      }
      startAction(step.action, {
        durationMs: step.durationMs,
        routine: true,
        ...(step.semanticAction === undefined ? {} : { semanticAction: step.semanticAction }),
        onComplete: () => { playStep(index + 1) },
      })
    }
    playStep(0)
  }, [startAction, walk.requestWalk])

  useLayoutEffect(() => {
    if (manualAction !== undefined || pendingChaseShift.current === undefined) return
    const delta = pendingChaseShift.current
    pendingChaseShift.current = undefined
    walk.shiftBy(delta)
  }, [manualAction, walk.shiftBy])

  useEffect(() => {
    setAudioEnabled(sound)
  }, [setAudioEnabled, sound])

  useEffect(() => {
    if (companionMode !== 'roaming' || mood === 'idle' || manualAction === undefined) return
    if (actionTimer.current !== undefined) clearTimeout(actionTimer.current)
    setRoutineScene(undefined)
    setManualAction(undefined)
  }, [companionMode, manualAction, mood])

  useEffect(() => {
    if (!settleWithCaretaker) {
      if (actionTimer.current !== undefined) clearTimeout(actionTimer.current)
      setRoutineScene(undefined)
      setManualAction(undefined)
      setCompanionMode(current => motion && (current === 'resting' || current === 'settling')
        ? 'waking'
        : 'roaming')
      return
    }

    const dockBesideCaretaker = () => {
      if (actionTimer.current !== undefined) clearTimeout(actionTimer.current)
      setRoutineScene(undefined)
      setManualAction(undefined)
      const actor = actorRef.current
      if (actor === null || typeof window === 'undefined') return
      const rectangle = actor.getBoundingClientRect()
      const width = rectangle.width || (window.innerWidth <= 720 ? 176 : 214)
      const height = rectangle.height || (window.innerWidth <= 720 ? 163 : 198)
      const target = deriveBuddyCaretakerDock(window.innerWidth, window.innerHeight, width, height)
      if (motion) {
        setCompanionMode('docking')
        walk.walkTo(target)
      } else {
        walk.placeAt(target)
        setCompanionMode('resting')
      }
    }

    dockBesideCaretaker()
    window.addEventListener('resize', dockBesideCaretaker)
    return () => { window.removeEventListener('resize', dockBesideCaretaker) }
  }, [motion, settleWithCaretaker, walk.placeAt, walk.walkTo])

  useEffect(() => {
    if (companionMode !== 'settling' && companionMode !== 'waking') return
    const duration = companionMode === 'settling'
      ? BUDDY_ACTION_DURATION_MS['lie-down'] ?? 3440
      : BUDDY_ACTION_DURATION_MS['wake-up'] ?? 2360
    const timer = window.setTimeout(() => {
      setCompanionMode(current => current === 'settling'
        ? 'resting'
        : current === 'waking' ? 'roaming' : current)
    }, duration)
    return () => { window.clearTimeout(timer) }
  }, [companionMode])

  useEffect(() => {
    if (settleWithCaretaker || companionMode !== 'roaming' || !running || !motion) return
    walk.requestWalk()
  }, [companionMode, motion, running, settleWithCaretaker, walk.requestWalk])

  useEffect(() => {
    const wasRunning = previousRunning.current
    if (!wasRunning && running) setFinished(false)
    if (wasRunning && !running) {
      setFinished(true)
      if (finishTimer.current !== undefined) clearTimeout(finishTimer.current)
      finishTimer.current = setTimeout(() => { setFinished(false) }, 2400)
    }
    previousRunning.current = running
  }, [running])

  useEffect(() => {
    if (routineTimer.current !== undefined) clearInterval(routineTimer.current)
    if (!motion) return
    routineTimer.current = setInterval(() => {
      const current = routineContext.current
      if (document.hidden || current.open || current.manualAction !== undefined || current.travelMode !== 'idle') return
      if (current.companionMode === 'resting') {
        const scene = deriveBuddyCaretakerRoutineScene(routineTick.current)
        routineTick.current += 1
        startRoutineScene(scene)
        return
      }
      if (current.companionMode !== 'roaming') return
      if (current.mood === 'working') {
        // After a route ends, pick another unconstrained screen destination.
        walk.requestWalk()
        return
      }
      if (current.mood !== 'idle') return
      const scene = deriveBuddyRoutineScene(routineTick.current, recentRoutineActions.current)
      routineTick.current += 1
      recentRoutineActions.current = [
        ...recentRoutineActions.current,
        ...scene.actions.filter(action => action !== 'wander'),
      ].slice(-4)
      startRoutineScene(scene)
    }, BUDDY_ROUTINE_INTERVAL_MS)
    return () => {
      if (routineTimer.current !== undefined) clearInterval(routineTimer.current)
    }
  }, [motion, startRoutineScene, walk.requestWalk])

  useEffect(() => () => {
    if (finishTimer.current !== undefined) clearTimeout(finishTimer.current)
    if (actionTimer.current !== undefined) clearTimeout(actionTimer.current)
    if (routineTimer.current !== undefined) clearInterval(routineTimer.current)
  }, [])

  const wardrobeLabel = open ? t('buddy.close') : t('buddy.open')
  return (
    <div
      className={css.root}
      data-pocket-buddy
      data-skin={skin}
      data-mood={mood}
      data-motion={motion ? 'on' : 'off'}
      data-sound={sound ? 'on' : 'muted'}
      data-action={action}
      data-companion-mode={companionMode}
      data-companion-anchor={companionMode === 'roaming' ? undefined : 'whale-girl'}
      data-action-path={action === 'chase-ball' ? 'screen-safe-pursuit' : undefined}
      data-chase-distance={action === 'chase-ball' ? Math.abs(chasePath.deltaX).toFixed(1) : undefined}
      data-routine-category={routineScene?.category}
      data-routine-combination={routineScene?.combinationNotation}
      data-routine-combination-size={routineScene?.permutationSize}
      data-routine-pose-flow={routineScene?.poseFlow}
      data-routine-playback={routineScene?.steps.map(step => step.action).join('>')}
      data-routine-scene={routineScene?.id}
      data-routine-transition-count={routineScene?.transitionCount}
      data-gaze={gaze}
      data-path-model="continuous-random"
      data-return-path-model={companionMode === 'docking' ? 'direct-to-caretaker' : undefined}
      data-task-motion={companionMode === 'docking'
        ? 'caretaker-docking'
        : companionMode === 'settling'
          ? 'caretaker-settling'
          : companionMode === 'resting'
            ? 'caretaker-rest'
            : companionMode === 'waking'
              ? 'caretaker-waking'
              : mood === 'working' ? 'continuous-roaming' : undefined}
      data-travel-mode={walk.mode}
      data-direction={artworkDirection}
      data-heading-radians={walk.heading.toFixed(4)}
      data-target-x={walk.target?.x.toFixed(1)}
      data-target-y={walk.target?.y.toFixed(1)}
      style={{
        '--chase-x-start': `${chasePath.startX.toFixed(2)}px`,
        '--chase-x-mid': `${chasePath.midX.toFixed(2)}px`,
        '--chase-x-launch': `${chasePath.launchX.toFixed(2)}px`,
        '--chase-x-overshoot': `${chasePath.overshootX.toFixed(2)}px`,
        '--chase-x-end': `${chasePath.endX.toFixed(2)}px`,
        '--chase-raster-x-end': `${chasePath.rasterEndX.toFixed(2)}px`,
        '--chase-raster-x-mid': `${chasePath.rasterMidX.toFixed(2)}px`,
      } as CSSProperties}
    >
      <PawPrintTrail prints={pawTrail} remove={removePawPrint} />
      <div ref={actorRef} className={css.actor} data-buddy-actor="" data-motion-model="linear-distance-bound-complete-cels">
        <div aria-live="polite" className={css.speech} data-speech-anchor="cat-head">{t(MOOD_LABELS[mood])}</div>
        <button
          type="button"
          className={css.trigger}
          data-cat-actor=""
          aria-label={wardrobeLabel}
          onClick={() => {
            startAction('respond', { soundContext: 'user' })
            setOpen(value => !value)
          }}
        >
          <BuddyArtwork skin={skin} action={action} direction={artworkDirection} />
        </button>
      </div>
      {open && (
        <div className={css.panel} role="dialog" aria-label={t('panel.title')}>
          <div className={css.panelTitle}>{t('panel.title')}</div>
          <div className={css.skinGrid}>
            {BUDDY_SKINS.map(id => (
              <button
                key={id}
                type="button"
                className={css.skinButton}
                aria-pressed={skin === id}
                onClick={() => { actions.selectSkin(id) }}
              >
                <CatChoicePreview skin={id} />
                {t(SKIN_LABELS[id])}
              </button>
            ))}
          </div>
          <div className={css.panelSubtitle}>{t('panel.play')}</div>
          <div className={css.playGrid}>
            <button type="button" className={css.playButton} onClick={() => { startAction('lick-paw', { fromUser: true }) }}>{t('action.lick')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('wash-face', { fromUser: true }) }}>{t('action.wash')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('stretch', { fromUser: true }) }}>{t('action.stretch')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('sleep', { fromUser: true }) }}>{t('action.sleep')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('chase-ball', { fromUser: true }) }}>{t('action.ball')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('look-left', { fromUser: true }) }}>{t('action.lookLeft')}</button>
            <button type="button" className={css.playButton} onClick={() => { startAction('hop', { fromUser: true }) }}>{t('action.hop')}</button>
          </div>
          <button
            type="button"
            className={css.preferenceButton}
            aria-pressed={motion}
            onClick={() => { actions.setMotion(!motion) }}
          >
            {t('panel.motion')}
          </button>
          <button
            type="button"
            className={css.preferenceButton}
            aria-pressed={sound}
            onClick={() => {
              const enabled = !sound
              actions.setSound(enabled)
              setAudioEnabled(enabled)
            }}
          >
            {t('panel.sound')}
          </button>
        </div>
      )}
    </div>
  )
}
