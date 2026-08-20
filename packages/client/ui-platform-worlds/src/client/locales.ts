/** Simplified Chinese strings for the platform-world selector. */
export const zh = {
  'label.selector': '场景风格',
  'label.depth': '{depth} 世界',
  'style.cloudHarbor': '云港跳岛',
  'style.candyGears': '糖果齿轮城',
  'style.moonCoral': '月光珊瑚湾',
  'status.idle': '准备出发',
  'status.running': '任务冒险中',
} as const

/** Stable translation keys shared by both platform-world dictionaries. */
export type PlatformWorldKey = keyof typeof zh

/** English strings for the platform-world selector. */
export const en: Record<PlatformWorldKey, string> = {
  'label.selector': 'Scene style',
  'label.depth': '{depth} world',
  'style.cloudHarbor': 'Cloud Harbor',
  'style.candyGears': 'Candy Gearworks',
  'style.moonCoral': 'Moonlit Coral Bay',
  'status.idle': 'Ready to explore',
  'status.running': 'Quest in progress',
}
