import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  BUDDY_STRIDE_LENGTH,
  BUDDY_WALK_SPEED,
  chooseRandomBuddyTarget,
  clampBuddyPoint,
  deriveBuddyBounds,
  deriveBuddyDirection,
  deriveBuddyGaitFrame,
  deriveBuddyHeading,
  derivePawTrailPrint,
  type BuddyDirection,
  type BuddyPoint,
  type PawTrailPrint,
} from './motion.ts'

/** Observable phase of one free-roaming route. */
export type BuddyTravelMode = 'idle' | 'turning' | 'walking'

/** Reactive direction, heading, phase, and target for the roaming actor. */
export interface RandomBuddyWalkState {
  direction: BuddyDirection
  heading: number
  mode: BuddyTravelMode
  target: BuddyPoint | undefined
}

/** Live actor and callbacks required by the roaming controller. */
export interface RandomBuddyWalkOptions {
  actorRef: RefObject<HTMLDivElement>
  enabled: boolean
  onArrive?: (target: BuddyPoint) => void
  paused: boolean
  onPawPrint: (print: PawTrailPrint) => void
}

/** Reactive travel state plus commands used by companion interactions. */
export interface RandomBuddyWalkController extends RandomBuddyWalkState {
  placeAt: (target: BuddyPoint) => void
  requestWalk: () => void
  shiftBy: (delta: BuddyPoint) => BuddyPoint
  walkTo: (target: BuddyPoint) => void
}

const writeGaitFrame = (actor: HTMLDivElement, distance?: number) => {
  actor.dataset.gaitFrame = String(distance === undefined ? 0 : deriveBuddyGaitFrame(distance))
}

const writePosition = (actor: HTMLDivElement, point: BuddyPoint) => {
  actor.style.transform = `translate3d(${point.x.toFixed(3)}px, ${point.y.toFixed(3)}px, 0)`
  actor.dataset.positionX = point.x.toFixed(1)
  actor.dataset.positionY = point.y.toFixed(1)
}

/**
 * Drive free viewport roaming with linear displacement and distance-bound gait.
 *
 * @param options - Live actor, preference state, pause state, and footprint sink.
 * @returns Reactive travel state plus an imperative request for immediate roaming.
 */
export function useRandomBuddyWalk(options: RandomBuddyWalkOptions): RandomBuddyWalkController {
  const { actorRef, enabled, paused, onArrive, onPawPrint } = options
  const [state, setState] = useState<RandomBuddyWalkState>({
    direction: 'left',
    heading: Math.PI,
    mode: 'idle',
    target: undefined,
  })
  const stateRef = useRef(state)
  const positionRef = useRef<BuddyPoint>()
  const targetRef = useRef<BuddyPoint>()
  const turnUntilRef = useRef(0)
  const travelledRef = useRef(0)
  const nextFootprintRef = useRef(BUDDY_STRIDE_LENGTH * .48)
  const footprintIdRef = useRef(0)
  const walkRequestedRef = useRef(false)
  const requestedTargetRef = useRef<BuddyPoint>()
  const activeDirectTargetRef = useRef<BuddyPoint>()
  const onArriveRef = useRef(onArrive)
  const onPawPrintRef = useRef(onPawPrint)
  onArriveRef.current = onArrive
  onPawPrintRef.current = onPawPrint

  const publish = useCallback((next: RandomBuddyWalkState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const requestWalk = useCallback(() => {
    requestedTargetRef.current = undefined
    activeDirectTargetRef.current = undefined
    targetRef.current = undefined
    walkRequestedRef.current = true
    if (stateRef.current.mode !== 'idle') {
      publish({ ...stateRef.current, mode: 'idle', target: undefined })
    }
  }, [publish])

  /** Interrupt the current route and walk directly to one responsive screen point. */
  const walkTo = useCallback((target: BuddyPoint) => {
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return
    requestedTargetRef.current = target
    activeDirectTargetRef.current = undefined
    targetRef.current = undefined
    walkRequestedRef.current = true
    if (stateRef.current.mode !== 'idle') {
      publish({ ...stateRef.current, mode: 'idle', target: undefined })
    }
  }, [publish])

  /** Place without travel when the user has explicitly disabled motion. */
  const placeAt = useCallback((target: BuddyPoint) => {
    const actor = actorRef.current
    if (actor === null || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return
    requestedTargetRef.current = undefined
    activeDirectTargetRef.current = undefined
    targetRef.current = undefined
    walkRequestedRef.current = false
    positionRef.current = target
    writePosition(actor, target)
    writeGaitFrame(actor)
    publish({ ...stateRef.current, mode: 'idle', target: undefined })
  }, [actorRef, publish])

  /** Commit a completed visual action path to the roaming controller before paint. */
  const shiftBy = useCallback((delta: BuddyPoint): BuddyPoint => {
    const actor = actorRef.current
    const current = positionRef.current
    if (actor === null || current === undefined || typeof window === 'undefined') return { x: 0, y: 0 }
    const rectangle = actor.getBoundingClientRect()
    const width = rectangle.width || (window.innerWidth <= 720 ? 176 : 214)
    const height = rectangle.height || (window.innerWidth <= 720 ? 163 : 198)
    const bounds = deriveBuddyBounds(window.innerWidth, window.innerHeight, width, height)
    const next = clampBuddyPoint({ x: current.x + delta.x, y: current.y + delta.y }, bounds)
    const committed = { x: next.x - current.x, y: next.y - current.y }
    positionRef.current = next
    targetRef.current = undefined
    requestedTargetRef.current = undefined
    activeDirectTargetRef.current = undefined
    walkRequestedRef.current = false
    writePosition(actor, next)
    writeGaitFrame(actor)
    publish({
      direction: deriveBuddyDirection(current, next, stateRef.current.direction),
      heading: deriveBuddyHeading(current, next),
      mode: 'idle',
      target: undefined,
    })
    return committed
  }, [actorRef, publish])

  useEffect(() => {
    const actor = actorRef.current
    if (actor === null || typeof window === 'undefined') return

    const frame = window.requestAnimationFrame.bind(window)
    const cancelFrame = window.cancelAnimationFrame.bind(window)
    const optionalWindow = window as unknown as { matchMedia?: (query: string) => MediaQueryList }
    const reducedMotion = optionalWindow.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reduced = reducedMotion?.matches ?? false
    let frameId = 0
    let lastTime = performance.now()

    const actorSize = () => {
      const rectangle = actor.getBoundingClientRect()
      return {
        width: rectangle.width || (window.innerWidth <= 720 ? 176 : 214),
        height: rectangle.height || (window.innerWidth <= 720 ? 163 : 198),
      }
    }
    const currentBounds = () => {
      const size = actorSize()
      return deriveBuddyBounds(window.innerWidth, window.innerHeight, size.width, size.height)
    }
    const placeInitial = () => {
      const bounds = currentBounds()
      if (positionRef.current === undefined) {
        positionRef.current = {
          x: bounds.maxX,
          y: Math.max(bounds.minY, bounds.maxY - 12),
        }
      }
      writePosition(actor, positionRef.current)
      writeGaitFrame(actor)
    }
    const startRoute = (time: number) => {
      const current = positionRef.current
      if (current === undefined) return
      const bounds = currentBounds()
      const directTarget = requestedTargetRef.current
      requestedTargetRef.current = undefined
      const target = directTarget
        ?? chooseRandomBuddyTarget(current, bounds, Math.random(), Math.random(), Math.random())
      const direction = deriveBuddyDirection(current, target, stateRef.current.direction)
      const heading = deriveBuddyHeading(current, target)
      activeDirectTargetRef.current = directTarget
      targetRef.current = target
      actor.dataset.targetX = target.x.toFixed(1)
      actor.dataset.targetY = target.y.toFixed(1)
      if (Math.hypot(target.x - current.x, target.y - current.y) < .01) {
        positionRef.current = target
        targetRef.current = undefined
        activeDirectTargetRef.current = undefined
        writePosition(actor, target)
        writeGaitFrame(actor)
        publish({ direction, heading, mode: 'idle', target: undefined })
        if (directTarget !== undefined) onArriveRef.current?.(directTarget)
        return
      }
      if (direction !== stateRef.current.direction) {
        turnUntilRef.current = time + 420
        publish({ direction, heading, mode: 'turning', target })
      } else {
        publish({ direction, heading, mode: 'walking', target })
      }
    }
    const finishRoute = () => {
      const directTarget = activeDirectTargetRef.current
      activeDirectTargetRef.current = undefined
      targetRef.current = undefined
      publish({ ...stateRef.current, mode: 'idle', target: undefined })
      writeGaitFrame(actor)
      if (directTarget !== undefined) onArriveRef.current?.(directTarget)
    }
    const handleResize = () => {
      const current = positionRef.current
      if (current === undefined) return
      positionRef.current = clampBuddyPoint(current, currentBounds())
      writePosition(actor, positionRef.current)
    }
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reduced = event.matches
    }

    placeInitial()
    reducedMotion?.addEventListener('change', handleMotionPreference)
    window.addEventListener('resize', handleResize)

    const tick = (time: number) => {
      const deltaSeconds = Math.min(.04, Math.max(0, time - lastTime) / 1000)
      lastTime = time
      const inactive = !enabled || paused || reduced || document.hidden
      if (inactive) {
        const interruptedDirectTarget = activeDirectTargetRef.current
        if (interruptedDirectTarget !== undefined) {
          requestedTargetRef.current = interruptedDirectTarget
          walkRequestedRef.current = true
          activeDirectTargetRef.current = undefined
        }
        if (reduced && requestedTargetRef.current !== undefined) {
          const reducedTarget = requestedTargetRef.current
          requestedTargetRef.current = undefined
          walkRequestedRef.current = false
          positionRef.current = reducedTarget
          writePosition(actor, reducedTarget)
          writeGaitFrame(actor)
          if (stateRef.current.mode !== 'idle') publish({ ...stateRef.current, mode: 'idle', target: undefined })
          onArriveRef.current?.(reducedTarget)
          frameId = frame(tick)
          return
        }
        if (stateRef.current.mode !== 'idle') publish({ ...stateRef.current, mode: 'idle', target: undefined })
        targetRef.current = undefined
        writeGaitFrame(actor)
        frameId = frame(tick)
        return
      }

      if (stateRef.current.mode === 'idle') {
        if (walkRequestedRef.current) {
          walkRequestedRef.current = false
          startRoute(time)
        }
      } else if (stateRef.current.mode === 'turning') {
        if (time >= turnUntilRef.current) publish({ ...stateRef.current, mode: 'walking' })
      } else {
        const current = positionRef.current
        const target = targetRef.current
        if (current !== undefined && target !== undefined) {
          const deltaX = target.x - current.x
          const deltaY = target.y - current.y
          const remaining = Math.hypot(deltaX, deltaY)
          const distance = BUDDY_WALK_SPEED * deltaSeconds
          if (remaining <= distance || remaining < .01) {
            positionRef.current = target
            travelledRef.current += remaining
            writePosition(actor, target)
            finishRoute()
          } else {
            const unitX = deltaX / remaining
            const unitY = deltaY / remaining
            const next = { x: current.x + unitX * distance, y: current.y + unitY * distance }
            positionRef.current = next
            travelledRef.current += distance
            writePosition(actor, next)
            writeGaitFrame(actor, travelledRef.current)
            if (travelledRef.current >= nextFootprintRef.current) {
              const size = actorSize()
              const print = derivePawTrailPrint(
                next,
                size.width,
                size.height,
                stateRef.current.heading,
                footprintIdRef.current,
              )
              footprintIdRef.current += 1
              nextFootprintRef.current += BUDDY_STRIDE_LENGTH * .5
              onPawPrintRef.current(print)
            }
          }
        }
      }
      frameId = frame(tick)
    }
    frameId = frame(tick)

    return () => {
      cancelFrame(frameId)
      reducedMotion?.removeEventListener('change', handleMotionPreference)
      window.removeEventListener('resize', handleResize)
      writeGaitFrame(actor)
    }
  }, [actorRef, enabled, paused, publish])

  return { ...state, placeAt, requestWalk, shiftBy, walkTo }
}
