/** User-visible task prompts run through the current DSH session. */
export const examples = {
  interview: '请用 ask_ui 对「把团队知识库做成 AI 助手」进行一轮 grilling。只问目前可以决定的问题，分别展示单选（使用场景）、多选（数据来源）、问答（失败案例）、判断（是否允许自动对外发送）、数值（试点人数），给出适当推荐与取舍。不要代我作答，收到本轮回答后再确定下一轮。',
  dashboard: '请调用 present_ui 一次，生成中文「产品交付驾驶舱」演示。id 为 delivery-demo，layout 为 dashboard，dataMode 为 sample。包含 4 项 KPI（总任务 48、已完成 31、受阻 5、完成率 65%）、六周完成与新增任务双序列图表、前端/后端/测试进度、至少 6 行可排序任务表、里程碑时间线、风险提示、负责人事实卡、交付清单。sections 需要不同的稳定 id，给图表/表格 full 宽度。请明确这是示例数据，并只生成一次结果。',
  report: '请调用 present_ui 一次生成「方案评审结果」报告演示。id 为 review-demo，layout 为 report，dataMode 为 sample。内容包括结论提示、三个方案的比较表、关键指标、行动清单、交付文档链接（只使用 https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces）、后续步骤时间线。所有示例事实明确标记。',
  business: '请调用 present_ui 一次生成「城市与桌面灵感」演示，id 为 business-demo，layout 为 dashboard，dataMode 为 sample。用 weather 卡显示上海模拟天气，用 stock 卡显示模拟 AAPL 价格与走势，用 products 卡展示三种虚构桌面用品（含一个缺货）。明确都是模拟数据，不要联网或购买。',
} as const
