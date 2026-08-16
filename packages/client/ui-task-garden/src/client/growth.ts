/** Pure, bounded growth model derived from durable full-session figures. */
export type GardenStage = 'seed' | 'sprout' | 'leafy' | 'budding' | 'bloom'

/** Durable garden progress projected from completed turns and steps. */
export interface GardenGrowth {
  stage: GardenStage
  leaves: number
  flowers: number
  nextFlower: number | null
}

const STAGES = [
  { at: 0, stage: 'seed' },
  { at: 1, stage: 'sprout' },
  { at: 3, stage: 'leafy' },
  { at: 7, stage: 'budding' },
  { at: 12, stage: 'bloom' },
] as const satisfies readonly { at: number; stage: GardenStage }[]

const FLOWER_CAP = 12
const STEPS_PER_FLOWER = 2

/**
 * Convert whole-log counts into a stable twelve-flower garden. The first Step
 * provides immediate feedback, then every second completed Step opens the next
 * flower so longer tasks grow visibly without blooming all at once. Turn count
 * adds bounded foliage without controlling the milestone sequence.
 *
 * @param turns - Number of completed conversation turns.
 * @param steps - Number of completed execution steps.
 * @returns Bounded foliage, flower count, and the current growth stage.
 */
export function deriveGardenGrowth(turns: number, steps: number): GardenGrowth {
  const safeTurns = Math.max(0, Math.floor(turns))
  const safeSteps = Math.max(0, Math.floor(steps))
  const flowers = Math.min(FLOWER_CAP, Math.ceil(safeSteps / STEPS_PER_FLOWER))
  const reached = [...STAGES].reverse().find(item => flowers >= item.at) ?? STAGES[0]
  return {
    stage: reached.stage,
    leaves: Math.min(FLOWER_CAP, safeTurns + Math.floor(safeSteps / 2)),
    flowers,
    nextFlower: flowers < FLOWER_CAP ? flowers + 1 : null,
  }
}
