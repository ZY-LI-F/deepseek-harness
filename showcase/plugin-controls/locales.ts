/** Static settings copy, separate from package-authored names and descriptions. */
export const zh = {
  tab: '插件开关', title: '按需启用你的插件', description: '开关同时控制插件的工具、提示词和界面。配置会保存，重启后仍然生效。',
  refresh: '刷新状态', loading: '正在读取插件…', filter: '搜索插件', enable: '启用', disable: '停用', enabled: '已启用', disabled: '已停用',
  active: '运行中', pending: '等待依赖', loadingPhase: '加载中', failed: '加载失败', disposed: '已释放', unloading: '卸载中', missing: '未加载',
  protected: '管理入口 · 保持启用', changing: '正在应用…', saved: '开关已保存，主机工具和提示词已更新。请刷新页面，让界面同步启用或停用。', restart: '开关已保存，运行状态尚未同步。请刷新状态；必要时重启当前 DSH 服务。', reload: '刷新页面，更新插件界面',
  note: '仅管理已安装的扩展插件，核心服务不在此列。停用不会卸载插件，也不会删除会话或模型配置。请先结束运行中的任务。',
  profile: '配置档', count: '个扩展', noRows: '没有匹配的插件。', error: '操作未完成', retry: '重新读取',
} as const
export const en: Record<keyof typeof zh, string> = {
  tab: 'Plugin controls', title: 'Enable plugins when you need them', description: 'A switch controls the plugin’s tools, prompt and interface. Changes persist across restarts.',
  refresh: 'Refresh status', loading: 'Reading plugins…', filter: 'Search plugins', enable: 'Enable', disable: 'Disable', enabled: 'Enabled', disabled: 'Disabled',
  active: 'Active', pending: 'Waiting for dependencies', loadingPhase: 'Loading', failed: 'Failed', disposed: 'Disposed', unloading: 'Unloading', missing: 'Not loaded',
  protected: 'Management entry · always enabled', changing: 'Applying…', saved: 'Saved; Host tools and prompt are updated. Reload this page to enable or remove the corresponding interface.', restart: 'Saved; runtime status has not settled. Refresh status, or restart the current DSH service if needed.', reload: 'Reload page to update plugin interfaces',
  note: 'Only installed extensions are shown. Core services are protected. Disabling does not uninstall the plugin or delete sessions or model settings. Finish running tasks before changing plugins.',
  profile: 'Profile', count: 'extensions', noRows: 'No matching plugins.', error: 'Operation did not complete', retry: 'Read again',
}
export type Key = keyof typeof zh
