/** Static product copy; task-authored labels travel in the native tool payload. */
export const zh = {
  tab: 'Generative UI', title: '任务的另一种表达', subtitle: '提问、决策、结果与驾驶舱，跟随当前会话。',
  all: '全部记录', latest: '最新结果', empty: '让任务生成适合它的界面', emptyDetail: '选择一个示例开始，或直接在下方对话中描述你的任务。模型会根据内容生成提问卡、结果报告或驾驶舱。',
  run: '运行示例', examples: '任务示例', dashboard: '项目驾驶舱', interview: 'Grilling 决策访谈', report: '任务结果报告', business: '天气、行情与商品',
  sample: '示例数据', provided: '提供的数据', live: '工具观测数据', source: '来源', raw: '查看原始记录',
  loading: '正在生成界面…', failed: '工具未完成', waiting: '请在提问区作答，提交后任务会继续。',
  submitted: '已提交', answers: '你的回答', round: '轮次', submit: '提交本轮回答', cancel: '取消本轮', recommendation: '推荐',
  single: '单选', multi: '多选', text: '问答', boolean: '判断', number: '数值', detail: '补充说明或其他答案',
  required: '请完成全部问题后提交。', answered: '已回答', working: '提交中…', filter: '筛选表格', noRows: '没有匹配记录',
  bar: '柱状图', line: '折线图', area: '面积图', metric: '图表指标', chartType: '图表样式',
  expand: '展开查看', close: '收起预览', available: '仅看有货', compare: '加入对比', compared: '已选择',
  yes: '是', no: '否', document: '文档', download: '下载文档',
  humidity: '湿度', wind: '风速', forecast: '天气趋势', done: '完成', active: '进行中', pending: '待开始', blocked: '受阻',
  history: '会话中的界面记录', older: '加载更早记录', submitting: '任务已提交', plain: '请在主对话区继续输入；所有回答与结果保存在这条 DSH 会话。',
} as const
export const en: Record<keyof typeof zh, string> = {
  tab: 'Generative UI', title: 'A view for every task', subtitle: 'Questions, decisions, results and dashboards in this conversation.',
  all: 'All records', latest: 'Latest results', empty: 'Let the task choose its interface', emptyDetail: 'Run an example or describe your task below. The model can ask questions, present results and compose a dashboard.',
  run: 'Run example', examples: 'Task examples', dashboard: 'Project dashboard', interview: 'Grilling interview', report: 'Task result report', business: 'Weather, stocks and products',
  sample: 'Sample data', provided: 'Provided data', live: 'Observed tool data', source: 'Source', raw: 'Inspect original record',
  loading: 'Generating the interface…', failed: 'Tool did not complete', waiting: 'Answer in the question panel. The task continues after submission.',
  submitted: 'Submitted', answers: 'Your answers', round: 'Round', submit: 'Submit this round', cancel: 'Cancel round', recommendation: 'Recommended',
  single: 'Single choice', multi: 'Multiple choice', text: 'Written answer', boolean: 'Yes / No', number: 'Number', detail: 'Additional context or another answer',
  required: 'Complete every question before submitting.', answered: 'Answered', working: 'Submitting…', filter: 'Filter table', noRows: 'No matching records',
  bar: 'Bars', line: 'Lines', area: 'Area', metric: 'Chart metric', chartType: 'Chart style',
  expand: 'Expand view', close: 'Close preview', available: 'In stock only', compare: 'Compare', compared: 'Selected',
  yes: 'Yes', no: 'No', document: 'Document', download: 'Download',
  humidity: 'Humidity', wind: 'Wind', forecast: 'Weather trend', done: 'Done', active: 'Active', pending: 'Pending', blocked: 'Blocked',
  history: 'Interface records in this conversation', older: 'Load earlier records', submitting: 'Task submitted', plain: 'Continue in the main composer. Answers and results are saved in this DSH conversation.',
}
export type UiKey = keyof typeof zh
export type Translate = (key: UiKey) => string
