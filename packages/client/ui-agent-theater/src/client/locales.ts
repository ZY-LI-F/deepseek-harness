/** Simplified Chinese strings for the assembly theater. */
export const zh = {
  'scene.idle': '工位空闲，随时可以开工',
  'scene.thinking': '正在白板前整理思路',
  'scene.library': '正在资料室翻找线索',
  'scene.terminal': '正在操作工具台',
  'scene.workbench': '正在工作台修改内容',
  'scene.web': '正在外出搜索资料',
  'scene.tools': '正在调用专业工具',
  'scene.approval': '抱着文件等你决定',
  'scene.error': '拼成 DEEPDEEK 了，先干杯再返工',
  'scene.done': 'DEEPSEEK 完工，举杯收工',
  'label.office': '鲸鱼女孩装配间',
  'board.cheers': '干杯！',
} as const

/** Stable translation keys shared by both theater dictionaries. */
export type AgentTheaterKey = keyof typeof zh

/** English strings for the assembly theater. */
export const en: Record<AgentTheaterKey, string> = {
  'scene.idle': 'Desk ready for the next task',
  'scene.thinking': 'Planning at the whiteboard',
  'scene.library': 'Looking for clues in the library',
  'scene.terminal': 'Operating the tool bench',
  'scene.workbench': 'Editing at the workbench',
  'scene.web': 'Searching outside for references',
  'scene.tools': 'Using a specialist tool',
  'scene.approval': 'Waiting for your decision',
  'scene.error': 'Built DEEPDEEK — toast first, then repair',
  'scene.done': 'DEEPSEEK complete — cheers',
  'label.office': 'Whale Girl Assembly Lane',
  'board.cheers': 'Cheers!',
}
