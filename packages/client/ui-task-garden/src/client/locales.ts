/** Simplified Chinese strings for the task garden. */
export const zh = {
  'label.title': '鲸鱼女孩的任务花园',
  'label.turns': '已完成 {turns} 轮',
  'stage.seed': '一颗种子正在等待',
  'stage.sprout': '冒出了第一片嫩芽',
  'stage.leafy': '正在认真长叶子',
  'stage.budding': '花苞快要打开了',
  'stage.bloom': '今天的花开好了',
} as const

/** Stable translation keys shared by both task-garden dictionaries. */
export type TaskGardenKey = keyof typeof zh

/** English strings for the task garden. */
export const en: Record<TaskGardenKey, string> = {
  'label.title': 'Whale Girl’s Task Garden',
  'label.turns': '{turns} turns completed',
  'stage.seed': 'A seed is waiting',
  'stage.sprout': 'The first sprout appeared',
  'stage.leafy': 'Growing a healthy crown of leaves',
  'stage.budding': 'The bud is nearly open',
  'stage.bloom': 'Today’s flower is in bloom',
}
