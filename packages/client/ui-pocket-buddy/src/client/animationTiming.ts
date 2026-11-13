/** Authored holds for observe, stalk, launch, catch, and recovery. */
export const POUNCE_FRAME_DURATIONS_MS = [
  460, 300, 260, 240, 300, 170, 170, 230, 260, 300, 430, 360,
] as const

/** One complete chase, including anticipation and a readable final pose. */
export const POUNCE_ANIMATION_DURATION_MS = POUNCE_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** The final screen displacement relative to the rendered actor width. */
export const POUNCE_TRAVEL_RATIO = .42

/** Reuse the reviewed grooming cels as one sit, two complete washes, pause, and rise scene. */
export const LONG_GROOMING_FRAME_INDICES = [
  0, 1, 2,
  3, 4, 5, 4, 5, 6, 7, 8, 7, 8,
  3, 4, 5, 4, 5, 6, 7, 8, 7, 8,
  9, 10, 11,
] as const

/** Per-frame holds for the extended seated grooming sequence. */
export const LONG_GROOMING_FRAME_DURATIONS_MS = [
  420, 320, 520,
  300, 260, 300, 240, 300, 280, 260, 340, 260, 380,
  300, 260, 300, 240, 300, 280, 260, 340, 260, 380,
  520, 320, 460,
] as const

/** Total duration of the extended seated grooming sequence. */
export const LONG_GROOMING_DURATION_MS = LONG_GROOMING_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** Posture-safe sub-sequences used when several seated actions are composed. */
export const SIT_DOWN_FRAME_INDICES = [0, 1, 2] as const
/** Per-frame holds for entering the seated pose. */
export const SIT_DOWN_FRAME_DURATIONS_MS = [420, 320, 520] as const
/** Total duration of the sit-down transition. */
export const SIT_DOWN_DURATION_MS = 1260

/** Reviewed frame order for two face-washing passes while seated. */
export const SEATED_DOUBLE_WASH_FRAME_INDICES = [
  3, 4, 5, 4, 5, 6, 7, 8, 7, 8,
  3, 4, 5, 4, 5, 6, 7, 8, 7, 8,
] as const
/** Per-frame holds for two face-washing passes while seated. */
export const SEATED_DOUBLE_WASH_FRAME_DURATIONS_MS = [
  300, 260, 300, 240, 300, 280, 260, 340, 260, 380,
  300, 260, 300, 240, 300, 280, 260, 340, 260, 380,
] as const
/** Total duration of the double face-washing performance. */
export const SEATED_DOUBLE_WASH_DURATION_MS = 5840

/** Reviewed frame order for one seated paw-lick performance. */
export const SEATED_LICK_FRAME_INDICES = [3, 4, 5, 4, 5, 3] as const
/** Per-frame holds for one seated paw-lick performance. */
export const SEATED_LICK_FRAME_DURATIONS_MS = [280, 260, 320, 260, 320, 360] as const
/** Total duration of one seated paw-lick performance. */
export const SEATED_LICK_DURATION_MS = 1800

/** Reviewed frame order for a quiet seated hold. */
export const SEATED_HOLD_FRAME_INDICES = [2, 9, 2] as const
/** Per-frame holds for a quiet seated rest. */
export const SEATED_HOLD_FRAME_DURATIONS_MS = [900, 700, 900] as const
/** Total duration of a quiet seated rest. */
export const SEATED_HOLD_DURATION_MS = 2500

/** Per-frame holds for the short seated posture bridge. */
export const SEATED_SETTLE_FRAME_DURATIONS_MS = [220, 240, 300] as const
/** Total duration of the short seated posture bridge. */
export const SEATED_SETTLE_DURATION_MS = 760

/** Reviewed frame order for returning from seated to standing. */
export const STAND_UP_FRAME_INDICES = [9, 10, 11] as const
/** Per-frame holds for returning from seated to standing. */
export const STAND_UP_FRAME_DURATIONS_MS = [520, 320, 460] as const
/** Total duration of the stand-up transition. */
export const STAND_UP_DURATION_MS = 1300

/** A complete lie-down, quiet breathing loop, and authored reverse wake-up. */
export const SLEEP_SCENE_FRAME_INDICES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  10, 9, 8, 9, 10, 11,
  10, 9, 8, 7, 5, 4, 3, 2, 1, 0,
] as const

/** Per-frame holds for the complete lie-down, breathing, and wake scene. */
export const SLEEP_SCENE_FRAME_DURATIONS_MS = [
  360, 300, 280, 340, 380, 380, 520, 360, 520, 520, 520, 520,
  420, 420, 420, 420, 420, 520,
  360, 340, 320, 280, 300, 300, 280, 260, 260, 360,
] as const

/** Total duration of the complete sleep scene. */
export const SLEEP_SCENE_DURATION_MS = SLEEP_SCENE_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** Docked sleep separates entry, an endless breathing hold, and wake-up. */
export const LIE_DOWN_FRAME_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
/** Per-frame holds for entering the docked sleeping pose. */
export const LIE_DOWN_FRAME_DURATIONS_MS = [360, 300, 280, 340, 380, 380, 520, 360, 520] as const
/** Total duration of the docked lie-down transition. */
export const LIE_DOWN_DURATION_MS = LIE_DOWN_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** Reviewed breathing-loop frame order for a docked sleeping cat. */
export const SLEEPING_REST_FRAME_INDICES = [8, 9, 10, 11, 10, 9] as const
/** Per-frame holds for the docked sleeping breathing loop. */
export const SLEEPING_REST_FRAME_DURATIONS_MS = [520, 520, 520, 520, 420, 420] as const
/** Total duration of one docked sleeping breathing loop. */
export const SLEEPING_REST_DURATION_MS = SLEEPING_REST_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** Reviewed reverse frame order for waking from the docked sleeping pose. */
export const WAKE_UP_FRAME_INDICES = [8, 7, 5, 4, 3, 2, 1, 0] as const
/** Per-frame holds for waking from the docked sleeping pose. */
export const WAKE_UP_FRAME_DURATIONS_MS = [320, 280, 300, 300, 280, 260, 260, 360] as const
/** Total duration of the docked wake-up transition. */
export const WAKE_UP_DURATION_MS = WAKE_UP_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)

/** Sit down, remain settled, and stand again using one continuous source sheet. */
export const SEATED_REST_FRAME_INDICES = [0, 1, 2, 2, 2, 2, 1, 0] as const

/** Per-frame holds for sit, quiet rest, and stand. */
export const SEATED_REST_FRAME_DURATIONS_MS = [
  360, 300, 420, 800, 800, 720, 300, 360,
] as const

/** Total duration of the complete seated-rest scene. */
export const SEATED_REST_DURATION_MS = SEATED_REST_FRAME_DURATIONS_MS.reduce(
  (total, duration) => total + duration,
  0,
)
