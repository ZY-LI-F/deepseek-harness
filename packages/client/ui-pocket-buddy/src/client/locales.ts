/** Pocket Buddy copy. Chinese is the product source; English mirrors its keys. */
export const zh = {
  'buddy.open': '打开口袋搭子衣橱',
  'buddy.close': '关闭口袋搭子衣橱',
  'panel.title': '口袋搭子',
  'panel.motion': '动态效果',
  'panel.sound': '声音（默认静音）',
  'panel.play': '陪它玩',
  'action.lick': '舔爪爪',
  'action.wash': '洗洗脸',
  'action.stretch': '伸个懒腰',
  'action.sleep': '趴下睡觉',
  'action.ball': '丢毛球',
  'action.lookLeft': '看看左边',
  'action.hop': '跳一跳',
  'skin.peachCat': '桃桃猫',
  'skin.seaBun': '云朵猫',
  'skin.nightJelly': '星夜猫',
  'mood.idle': '在等你安排任务',
  'mood.working': '正在认真上班',
  'mood.needsYou': '有件事需要你决定',
  'mood.celebrate': '任务完成啦',
} as const

/** Stable translation key set shared by the Pocket Buddy dictionaries. */
export type PocketBuddyKey = keyof typeof zh

/** English Pocket Buddy copy mirroring every Chinese source key. */
export const en: Record<PocketBuddyKey, string> = {
  'buddy.open': 'Open Pocket Buddy wardrobe',
  'buddy.close': 'Close Pocket Buddy wardrobe',
  'panel.title': 'Pocket Buddy',
  'panel.motion': 'Motion',
  'panel.sound': 'Sound (muted by default)',
  'panel.play': 'Play together',
  'action.lick': 'Lick paws',
  'action.wash': 'Wash face',
  'action.stretch': 'Have a stretch',
  'action.sleep': 'Curl up to sleep',
  'action.ball': 'Toss a ball',
  'action.lookLeft': 'Look left',
  'action.hop': 'Hop around',
  'skin.peachCat': 'Peach Cat',
  'skin.seaBun': 'Cloud Cat',
  'skin.nightJelly': 'Starlight Cat',
  'mood.idle': 'Waiting for your next task',
  'mood.working': 'Working very seriously',
  'mood.needsYou': 'Needs your decision',
  'mood.celebrate': 'Task complete',
}
