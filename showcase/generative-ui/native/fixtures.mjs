/** Explicit sample data used by keyless behavior and renderer tests, never injected into live sessions. */
export const document = {
  id: 'project', title: '任务交付驾驶舱', description: '可复现的示例数据，不代表真实业务状态。', layout: 'dashboard', dataMode: 'sample',
  sections: [
    { id: 'kpi', type: 'metrics', title: '交付概览', items: [{ label: '任务总数', value: 48 }, { label: '已完成', value: 31, tone: 'success' }, { label: '受阻', value: 5, tone: 'warning' }, { label: '预算使用', value: 65, unit: '%' }] },
    { id: 'trend', type: 'chart', title: '六周交付趋势', chart: 'area', labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], series: [{ name: '计划', values: [4, 8, 12, 18, 25, 36] }, { name: '实际', values: [3, 7, 11, 17, 24, 31] }] },
    { id: 'rows', type: 'table', title: '工作流清单', columns: [{ key: 'name', label: '工作流' }, { key: 'tasks', label: '任务数' }], rows: [{ name: '检索', tasks: 12 }, { name: '权限', tasks: 8 }] },
    { id: 'progress', type: 'progress', title: '模块进度', items: [{ label: '检索问答', value: 8, total: 12 }, { label: '评测', value: 4, total: 8, tone: 'warning' }] },
    { id: 'timeline', type: 'timeline', title: '交付里程碑', items: [{ title: '试点', status: 'done', time: '09-01' }, { title: '验收', status: 'active', time: '09-05' }] },
    { id: 'risk', type: 'callout', title: '风险提示', body: '权限接口尚需确认。', tone: 'warning' },
    { id: 'facts', type: 'facts', title: '项目事实', items: [{ label: '负责人', value: '示例团队' }, { label: '试点人数', value: 25 }] },
    { id: 'findings', type: 'list', title: '结论与行动', items: [{ title: '先验证检索准确率', detail: '使用固定评测集。', status: '待评审' }] },
    { id: 'artifacts', type: 'artifacts', title: '交付材料', items: [{ label: 'Generative UI 文档', url: 'https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces' }] },
    { id: 'weather', type: 'weather', title: '外勤天气', location: '上海（示例）', celsius: 28, condition: '晴间多云', humidity: 62, windKph: 12, forecast: [{ label: '明天', celsius: 29 }] },
    { id: 'stock', type: 'stock', title: '行情卡示例', symbol: 'DEMO', price: 128, currency: 'CNY', changePercent: 1.2, history: [100, 120, 115, 128] },
    { id: 'products', type: 'products', title: '设备对比', items: [{ id: 'a', name: '轻便工作站', price: 5000, currency: 'CNY', available: true }, { id: 'b', name: '性能工作站', price: 8000, currency: 'CNY', available: false, rating: 4.7 }] },
    { id: 'brief', type: 'document', title: '团队知识库试点说明', filename: 'team-brief.md', summary: '依据本轮演示选择生成，未经审批，不会自动发送。', content: [{ heading: '目标与范围', paragraphs: ['先面向内部团队验证检索和问答。'], bullets: ['保留来源引用', '检索结果遵守权限隔离'] }, { heading: '验收方式', paragraphs: ['试点用户 25 人，准确率目标 90%。', '<script>alert("text only")</script>'] }] },
  ],
}
export const round = {
  title: '需求访谈', round: 1, context: '只收集当前可以回答的问题。',
  questions: [
    { id: 'audience', type: 'single', question: '首批用户是谁？', options: [{ label: '内部团队', description: '便于小范围验证。' }, { label: '外部客户', description: '更早检验市场需求。' }], recommended: '内部团队' },
    { id: 'scope', type: 'multi', question: '本期需要哪些能力？', options: [{ label: '检索' }, { label: '问答' }, { label: '审批' }] },
    { id: 'success', type: 'text', question: '成功标准是什么？' },
    { id: 'privacy', type: 'boolean', question: '是否需要权限隔离？' },
    { id: 'budget', type: 'number', question: '试点用户数是多少？' },
  ],
}
