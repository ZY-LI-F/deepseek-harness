import { useEffect, useState, type CSSProperties } from 'react'
import type { BuddyDirection, BuddyPlaybackAction } from './motion.ts'
import {
  LONG_GROOMING_DURATION_MS,
  LONG_GROOMING_FRAME_DURATIONS_MS,
  LONG_GROOMING_FRAME_INDICES,
  LIE_DOWN_DURATION_MS,
  LIE_DOWN_FRAME_DURATIONS_MS,
  LIE_DOWN_FRAME_INDICES,
  POUNCE_ANIMATION_DURATION_MS,
  POUNCE_FRAME_DURATIONS_MS,
  SEATED_DOUBLE_WASH_DURATION_MS,
  SEATED_DOUBLE_WASH_FRAME_DURATIONS_MS,
  SEATED_DOUBLE_WASH_FRAME_INDICES,
  SEATED_HOLD_DURATION_MS,
  SEATED_HOLD_FRAME_DURATIONS_MS,
  SEATED_HOLD_FRAME_INDICES,
  SEATED_LICK_DURATION_MS,
  SEATED_LICK_FRAME_DURATIONS_MS,
  SEATED_LICK_FRAME_INDICES,
  SEATED_REST_DURATION_MS,
  SEATED_REST_FRAME_DURATIONS_MS,
  SEATED_REST_FRAME_INDICES,
  SEATED_SETTLE_DURATION_MS,
  SEATED_SETTLE_FRAME_DURATIONS_MS,
  SIT_DOWN_DURATION_MS,
  SIT_DOWN_FRAME_DURATIONS_MS,
  SIT_DOWN_FRAME_INDICES,
  SLEEP_SCENE_DURATION_MS,
  SLEEP_SCENE_FRAME_DURATIONS_MS,
  SLEEP_SCENE_FRAME_INDICES,
  SLEEPING_REST_DURATION_MS,
  SLEEPING_REST_FRAME_DURATIONS_MS,
  SLEEPING_REST_FRAME_INDICES,
  STAND_UP_DURATION_MS,
  STAND_UP_FRAME_DURATIONS_MS,
  STAND_UP_FRAME_INDICES,
  WAKE_UP_DURATION_MS,
  WAKE_UP_FRAME_DURATIONS_MS,
  WAKE_UP_FRAME_INDICES,
} from './animationTiming.ts'
import {
  PEACH_CEL_WALK_AWAY,
  PEACH_CEL_WALK_SIDE,
  PEACH_CEL_WALK_TOWARD,
} from './peach-cat-cels-v5.generated.ts'
import {
  PEACH_CEL_GROOMING,
  PEACH_CEL_IDLE_ALIVE,
  PEACH_MOOD_POSE,
} from './peach-cat-cels-v6.generated.ts'
import {
  PEACH_CEL_CLICK_RESPONSE,
  PEACH_CEL_LIE_SLEEP,
  PEACH_CEL_LOOK_LEFT,
  PEACH_CEL_POUNCE,
  PEACH_CEL_STRETCH,
  PEACH_CEL_TURN_LEFT_RIGHT,
} from './peach-cat-cels-v7.generated.ts'
import {
  CAT_REFERENCE_DISPLAY_SCALE,
  CAT_RENDER_BOX_EDGE_PX,
  CAT_TARGET_VISUAL_EDGE_PX,
  normalizeCatFrameScale,
} from './catSizing.ts'
import css from './PocketBuddy.module.css'

type CelPlayback = 'gait' | 'timed' | 'pose'

interface CelSelection {
  animationDuration?: number
  frameScales: readonly number[]
  frames: readonly string[]
  frameDuration: number
  frameDurations?: readonly number[]
  id: string
  loopFrom?: number
  ownsFacing?: boolean
  playback: CelPlayback
}

// Each value is the longest edge of the cat's connected alpha component. The
// fixed target edge prevents source-sheet framing from becoming a runtime zoom.
const WALK_SIDE_FRAME_SCALES = [322, 322, 322, 323, 322, 321, 322, 323].map(edge => normalizeCatFrameScale(edge))
const WALK_TOWARD_FRAME_SCALES = [347, 347, 347, 347, 350, 350, 350, 350].map(edge => normalizeCatFrameScale(edge))
const WALK_AWAY_FRAME_SCALES = [350, 346, 350, 350, 348, 347, 346, 348].map(edge => normalizeCatFrameScale(edge))
const IDLE_ALIVE_FRAME_SCALES = [350, 349, 343, 335, 350, 348, 348, 350].map(edge => normalizeCatFrameScale(edge))
const GROOMING_FRAME_SCALES = [325, 348, 294, 306, 299, 292, 295, 297, 299, 297, 321, 327].map(edge => normalizeCatFrameScale(edge))
const MOOD_POSE_FRAME_SCALES = [315, 311, 316, 308, 313, 324].map(edge => normalizeCatFrameScale(edge))
const STRETCH_FRAME_SCALES = [330, 309, 320, 338, 315, 315, 329, 318].map(edge => normalizeCatFrameScale(edge))
const LIE_SLEEP_FRAME_SCALES = [302, 349, 350, 327, 312, 305, 303, 300, 308, 311, 310, 310].map(edge => normalizeCatFrameScale(edge))
const POUNCE_FRAME_SCALES = [199, 220, 274, 212, 208, 254, 346, 296, 258, 247, 228, 211].map(edge => normalizeCatFrameScale(edge))
const LOOK_LEFT_FRAME_SCALES = [349, 338, 352, 352, 338, 344].map(edge => normalizeCatFrameScale(edge))
const CLICK_RESPONSE_FRAME_SCALES = [336, 307, 306, 337, 292, 307].map(edge => normalizeCatFrameScale(edge))
const TURN_LEFT_RIGHT_FRAME_SCALES = [357, 355, 319, 360, 355, 353].map(edge => normalizeCatFrameScale(edge))

function requiredItem<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Missing authored cat frame ${index}.`)
  return item
}

const LONG_GROOMING_FRAMES = LONG_GROOMING_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const LONG_GROOMING_FRAME_SCALES = LONG_GROOMING_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SEATED_DOUBLE_WASH_FRAMES = SEATED_DOUBLE_WASH_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const SEATED_DOUBLE_WASH_FRAME_SCALES = SEATED_DOUBLE_WASH_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SEATED_HOLD_FRAMES = SEATED_HOLD_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const SEATED_HOLD_FRAME_SCALES = SEATED_HOLD_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SEATED_LICK_FRAMES = SEATED_LICK_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const SEATED_LICK_FRAME_SCALES = SEATED_LICK_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SEATED_REST_FRAMES = SEATED_REST_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const SEATED_REST_FRAME_SCALES = SEATED_REST_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SIT_DOWN_FRAMES = SIT_DOWN_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const SIT_DOWN_FRAME_SCALES = SIT_DOWN_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const SLEEP_SCENE_FRAMES = SLEEP_SCENE_FRAME_INDICES.map(index => PEACH_CEL_LIE_SLEEP[index])
const SLEEP_SCENE_FRAME_SCALES = SLEEP_SCENE_FRAME_INDICES.map(index => requiredItem(LIE_SLEEP_FRAME_SCALES, index))
const LIE_DOWN_FRAMES = LIE_DOWN_FRAME_INDICES.map(index => PEACH_CEL_LIE_SLEEP[index])
const LIE_DOWN_FRAME_SCALES = LIE_DOWN_FRAME_INDICES.map(index => requiredItem(LIE_SLEEP_FRAME_SCALES, index))
const SLEEPING_REST_FRAMES = SLEEPING_REST_FRAME_INDICES.map(index => PEACH_CEL_LIE_SLEEP[index])
const SLEEPING_REST_FRAME_SCALES = SLEEPING_REST_FRAME_INDICES.map(index => requiredItem(LIE_SLEEP_FRAME_SCALES, index))
const STAND_UP_FRAMES = STAND_UP_FRAME_INDICES.map(index => PEACH_CEL_GROOMING[index])
const STAND_UP_FRAME_SCALES = STAND_UP_FRAME_INDICES.map(index => requiredItem(GROOMING_FRAME_SCALES, index))
const WAKE_UP_FRAMES = WAKE_UP_FRAME_INDICES.map(index => PEACH_CEL_LIE_SLEEP[index])
const WAKE_UP_FRAME_SCALES = WAKE_UP_FRAME_INDICES.map(index => requiredItem(LIE_SLEEP_FRAME_SCALES, index))

const gaitFrames = (direction: BuddyDirection): readonly string[] => {
  if (direction === 'toward') return PEACH_CEL_WALK_TOWARD
  if (direction === 'away') return PEACH_CEL_WALK_AWAY
  return PEACH_CEL_WALK_SIDE
}

const gaitFrameScales = (direction: BuddyDirection): readonly number[] => {
  if (direction === 'toward') return WALK_TOWARD_FRAME_SCALES
  if (direction === 'away') return WALK_AWAY_FRAME_SCALES
  return WALK_SIDE_FRAME_SCALES
}

const selectCels = (action: BuddyPlaybackAction, direction: BuddyDirection): CelSelection => {
  if (action === 'lie-down') {
    return {
      frameScales: LIE_DOWN_FRAME_SCALES,
      frames: LIE_DOWN_FRAMES,
      frameDuration: 0,
      frameDurations: LIE_DOWN_FRAME_DURATIONS_MS,
      animationDuration: LIE_DOWN_DURATION_MS,
      id: 'transition-lie-down',
      playback: 'timed',
    }
  }
  if (action === 'wake-up') {
    return {
      frameScales: WAKE_UP_FRAME_SCALES,
      frames: WAKE_UP_FRAMES,
      frameDuration: 0,
      frameDurations: WAKE_UP_FRAME_DURATIONS_MS,
      animationDuration: WAKE_UP_DURATION_MS,
      id: 'transition-wake-up',
      playback: 'timed',
    }
  }
  if (action === 'sleeping-rest') {
    return {
      frameScales: SLEEPING_REST_FRAME_SCALES,
      frames: SLEEPING_REST_FRAMES,
      frameDuration: 0,
      frameDurations: SLEEPING_REST_FRAME_DURATIONS_MS,
      animationDuration: SLEEPING_REST_DURATION_MS,
      id: 'sleeping-rest',
      loopFrom: 0,
      playback: 'timed',
    }
  }
  if (action === 'sit-down') {
    return {
      frameScales: SIT_DOWN_FRAME_SCALES,
      frames: SIT_DOWN_FRAMES,
      frameDuration: 0,
      frameDurations: SIT_DOWN_FRAME_DURATIONS_MS,
      animationDuration: SIT_DOWN_DURATION_MS,
      id: 'transition-sit-down',
      playback: 'timed',
    }
  }
  if (action === 'stand-up') {
    return {
      frameScales: STAND_UP_FRAME_SCALES,
      frames: STAND_UP_FRAMES,
      frameDuration: 0,
      frameDurations: STAND_UP_FRAME_DURATIONS_MS,
      animationDuration: STAND_UP_DURATION_MS,
      id: 'transition-stand-up',
      playback: 'timed',
    }
  }
  if (action === 'seated-wash-face') {
    return {
      frameScales: SEATED_DOUBLE_WASH_FRAME_SCALES,
      frames: SEATED_DOUBLE_WASH_FRAMES,
      frameDuration: 0,
      frameDurations: SEATED_DOUBLE_WASH_FRAME_DURATIONS_MS,
      animationDuration: SEATED_DOUBLE_WASH_DURATION_MS,
      id: 'seated-double-wash',
      playback: 'timed',
    }
  }
  if (action === 'seated-lick-paw') {
    return {
      frameScales: SEATED_LICK_FRAME_SCALES,
      frames: SEATED_LICK_FRAMES,
      frameDuration: 0,
      frameDurations: SEATED_LICK_FRAME_DURATIONS_MS,
      animationDuration: SEATED_LICK_DURATION_MS,
      id: 'seated-lick-paw',
      playback: 'timed',
    }
  }
  if (action === 'seated-rest') {
    return {
      frameScales: SEATED_HOLD_FRAME_SCALES,
      frames: SEATED_HOLD_FRAMES,
      frameDuration: 0,
      frameDurations: SEATED_HOLD_FRAME_DURATIONS_MS,
      animationDuration: SEATED_HOLD_DURATION_MS,
      id: 'seated-rest',
      playback: 'timed',
    }
  }
  if (action === 'seated-settle') {
    return {
      frameScales: SEATED_HOLD_FRAME_SCALES,
      frames: SEATED_HOLD_FRAMES,
      frameDuration: 0,
      frameDurations: SEATED_SETTLE_FRAME_DURATIONS_MS,
      animationDuration: SEATED_SETTLE_DURATION_MS,
      id: 'transition-seated-settle',
      playback: 'timed',
    }
  }
  if (action === 'wander') {
    return { frameScales: gaitFrameScales(direction), frames: gaitFrames(direction), frameDuration: 0, id: `walk-${direction}`, playback: 'gait' }
  }
  if (action === 'turn') {
    if (direction === 'right') {
      return {
        frameScales: TURN_LEFT_RIGHT_FRAME_SCALES,
        frames: PEACH_CEL_TURN_LEFT_RIGHT,
        frameDuration: 70,
        id: 'turn-left-right',
        ownsFacing: true,
        playback: 'timed',
      }
    }
    if (direction === 'left') {
      return {
        frameScales: [...TURN_LEFT_RIGHT_FRAME_SCALES].reverse(),
        frames: [...PEACH_CEL_TURN_LEFT_RIGHT].reverse(),
        frameDuration: 70,
        id: 'turn-right-left',
        ownsFacing: true,
        playback: 'timed',
      }
    }
    return {
      frameScales: [requiredItem(gaitFrameScales(direction), 0)],
      frames: [requiredItem(gaitFrames(direction), 0)],
      frameDuration: 0,
      id: `turn-${direction}`,
      playback: 'pose',
    }
  }
  if (action === 'chase-ball') {
    return {
      frameScales: POUNCE_FRAME_SCALES,
      frames: PEACH_CEL_POUNCE,
      frameDuration: 0,
      frameDurations: POUNCE_FRAME_DURATIONS_MS,
      animationDuration: POUNCE_ANIMATION_DURATION_MS,
      id: 'pounce',
      playback: 'timed',
    }
  }
  if (action === 'stretch') {
    return { frameScales: STRETCH_FRAME_SCALES, frames: PEACH_CEL_STRETCH, frameDuration: 142, id: 'stretch', playback: 'timed' }
  }
  if (action === 'look-left') {
    return { frameScales: LOOK_LEFT_FRAME_SCALES, frames: PEACH_CEL_LOOK_LEFT, frameDuration: 125, id: 'look-left', playback: 'timed' }
  }
  if (action === 'respond') {
    return { frameScales: CLICK_RESPONSE_FRAME_SCALES, frames: PEACH_CEL_CLICK_RESPONSE, frameDuration: 120, id: 'click-response', playback: 'timed' }
  }
  if (action === 'wash-face') {
    return {
      frameScales: LONG_GROOMING_FRAME_SCALES,
      frames: LONG_GROOMING_FRAMES,
      frameDuration: 0,
      frameDurations: LONG_GROOMING_FRAME_DURATIONS_MS,
      animationDuration: LONG_GROOMING_DURATION_MS,
      id: 'sit-lick-wash',
      playback: 'timed',
    }
  }
  if (action === 'lick-paw') {
    return {
      frameScales: GROOMING_FRAME_SCALES,
      frames: PEACH_CEL_GROOMING,
      frameDuration: 200,
      id: 'grooming',
      playback: 'timed',
    }
  }
  if (action === 'breathe' || action === 'blink') {
    return {
      frameScales: IDLE_ALIVE_FRAME_SCALES,
      frames: PEACH_CEL_IDLE_ALIVE,
      frameDuration: action === 'blink' ? 110 : 400,
      id: 'idle-alive',
      playback: 'timed',
    }
  }
  if (action === 'sleep') {
    return {
      frameScales: SLEEP_SCENE_FRAME_SCALES,
      frames: SLEEP_SCENE_FRAMES,
      frameDuration: 0,
      frameDurations: SLEEP_SCENE_FRAME_DURATIONS_MS,
      animationDuration: SLEEP_SCENE_DURATION_MS,
      id: 'lie-sleep-wake',
      playback: 'timed',
    }
  }
  if (action === 'work') {
    return { frameScales: [requiredItem(MOOD_POSE_FRAME_SCALES, 4)], frames: [PEACH_MOOD_POSE.focused], frameDuration: 0, id: 'mood-focused', playback: 'pose' }
  }
  if (action === 'hop' || action === 'celebrate') {
    return { frameScales: [requiredItem(MOOD_POSE_FRAME_SCALES, 5)], frames: [PEACH_MOOD_POSE.celebrate], frameDuration: 0, id: 'mood-celebrate', playback: 'pose' }
  }
  return {
    frameScales: SEATED_REST_FRAME_SCALES,
    frames: SEATED_REST_FRAMES,
    frameDuration: 0,
    frameDurations: SEATED_REST_FRAME_DURATIONS_MS,
    animationDuration: SEATED_REST_DURATION_MS,
    id: 'sit-rest-rise',
    playback: 'timed',
  }
}

/** Render reviewed whole-character cels; no body part is ever cut or reattached. */
export function PeachCelCat({
  action, direction,
}: {
  action: BuddyPlaybackAction
  direction: BuddyDirection
}) {
  const selection = selectCels(action, direction)
  const [timedFrame, setTimedFrame] = useState(0)

  useEffect(() => {
    setTimedFrame(0)
    if (selection.playback !== 'timed') return
    let frame = 0
    let timer = 0
    const scheduleNextFrame = () => {
      const duration = selection.frameDurations?.[frame] ?? selection.frameDuration
      timer = window.setTimeout(() => {
        const next = frame + 1
        if (next < selection.frames.length) {
          frame = next
          setTimedFrame(frame)
          scheduleNextFrame()
          return
        }
        if (selection.loopFrom !== undefined) {
          frame = selection.loopFrom
          setTimedFrame(frame)
          scheduleNextFrame()
        }
      }, duration)
    }
    scheduleNextFrame()
    return () => { window.clearTimeout(timer) }
  }, [action, selection.frameDuration, selection.frames.length, selection.id, selection.loopFrom, selection.playback])

  const renderedDirection = selection.ownsFacing
    ? 'neutral'
    : selection.playback === 'gait'
      ? direction
      : direction === 'right'
        ? 'right'
        : 'left'

  return (
    <div
      className={css.sourceCatStage}
      data-cat-material="peach-cat"
      data-cat-style="complete-character-cel-animation"
      data-display-scale={CAT_REFERENCE_DISPLAY_SCALE.toFixed(4)}
      data-renderer="dom-raster-cels"
      data-source-image="peach-cat-cels-v5+v6+v7"
      data-target-visual-edge-px={CAT_TARGET_VISUAL_EDGE_PX}
      style={{
        '--cat-display-scale': CAT_REFERENCE_DISPLAY_SCALE,
        '--cat-render-box-edge': `${CAT_RENDER_BOX_EDGE_PX}px`,
        '--cat-render-box-half-edge': `${-CAT_RENDER_BOX_EDGE_PX / 2}px`,
      } as CSSProperties}
    >
      <div className={css.sourceCatFacing} data-direction={renderedDirection}>
        <div
          className={css.peachCelSequence}
          data-action={action}
          data-animation-duration-ms={selection.animationDuration}
          data-cel-direction={renderedDirection}
          data-cel-set={selection.id}
          data-character-scale="frame-normalized-100px-max-edge"
          data-frame-hold-model={selection.frameDurations === undefined ? 'uniform' : 'authored'}
          data-playback={selection.playback}
          style={action === 'chase-ball'
            ? { '--pounce-duration': `${POUNCE_ANIMATION_DURATION_MS}ms` } as CSSProperties
            : undefined}
        >
          {selection.frames.map((source, index) => {
            const frameScale = requiredItem(selection.frameScales, index)
            return (
              <img
                key={`${selection.id}-${index}`}
                className={css.peachCelFrame}
                data-active={selection.playback !== 'gait' && timedFrame === index}
                data-cel-frame={index}
                data-frame-scale={frameScale.toFixed(4)}
                src={source}
                alt=""
                draggable={false}
                style={{ '--cat-frame-scale': frameScale } as CSSProperties}
              />
            )
          })}
        </div>
      </div>
      {(action === 'sleep' || action === 'sleeping-rest') && (
        <div className={css.sleepDream} data-sleep-dream="soft-z" aria-hidden="true">
          <span>Z</span>
          <span>z</span>
          <span>z</span>
        </div>
      )}
    </div>
  )
}
