---
description: "在现有服务内使用原生 DSH 提问卡、结果报告、驾驶舱和扩展开关。"
---

# Generative UI 示例会话

[English](README.md) | 中文

## 概述

现有 DSH 服务在 3080 端口运行原生 Generative UI 和插件开关 bundle。真实复星模型调用在普通 DSH 会话内生成提问卡、报告和驾驶舱。业务演示数值明确标注为示例。模型凭据、权限、工具和历史仍在现有 harness 中。

## 目录

- [原生任务界面](#native-interface)
- [体验示例](#try-the-examples)
- [启用与停用插件](#plugin-controls)
- [接入模式与回归素材](#sdk-conversation)
- [开发备注](#dev-note)

<a id="native-interface"></a>
## 原生任务界面

打开[现有 DSH 服务](http://127.0.0.1:3080/)，选择会话，保持在普通“对话”标签。提问出现在输入框上方；提交后的提问卡和结果留在消息流中，紧凑模式下也在已完成回合尾部展示。可选的 `Generative UI` 标签是结果汇总，不是另一段对话。其中的“运行示例”使用本会话选择的 DSH 模型提交普通提示词。

[原生 bundle](native/README.zh.md) 提供 `ask_ui` 与 `present_ui`。提问包含单选、多选、问答、判断和数值题。Grilling 把当前可回答的问题放在同一轮，等待提交后再由模型追问依赖问题。结果可以组合指标、图表、表格、进度、时间线、风险、事实、结论、链接、业务卡片，以及支持 Markdown 下载的文档预览。“展开查看”打开更大的视图；筛选和排序不会调用模型。卡片使用原生 bundle 的 PharmaID 参考主题。

<a id="try-the-examples"></a>
## 体验示例

以下会话使用已有复星 `DeepSeek-V4-Flash-0731` 模型选择，不改变原先的默认模型。继续会话即可把同样的界面用于其他任务。

| 会话 | 可以体验什么 |
|---|---|
| Generative UI 对话演示 · 灰蓝决策与文档 | 三轮依次回答：单选 → 多选 → 是非 → 周报文档。记录的演示选择为项目团队；进展、风险与下周计划；必须人工审核。文档预览和下载入口保留在对话里。 |
| Generative UI 原生 01 · 项目驾驶舱 | 四项 KPI、双序列图表、进度、可排序任务表、里程碑、风险、负责人与交付清单。 |
| Generative UI 原生 02 · 结果与交付报告 | 对比表、摘要、指标、后续行动、交付物链接与时间线。 |
| Generative UI 原生 03 · 天气行情商品卡 | 天气单位切换、股票图表、商品筛选；所有数值均为示例。 |
| Generative UI 原生 04 · Grilling 五类提问 | 两轮已完成的提问，含明确标注的演示答案和决策报告。运行 Grilling 示例即可亲自回答新一轮问题。 |

已提交答案和完整结果进入原生日志，可以随会话回放。选择卡保留原选项和勾选答案，作为只读记录。未提交草稿保留在浏览器本地。工具拒绝非法模型输出，不把它当作可执行代码；报告和访谈示例中保留了原生纠错尝试。业务数据标签不等于实时连接器，也不是独立证据核验。这些示例不会发送业务消息。

<a id="plugin-controls"></a>
## 启用与停用插件

进入“设置 → 插件 → 插件开关”。先完成或停止运行中的任务，切换 `oh-story` 或 `generative-ui`，等待保存提示，再点击“刷新页面，更新插件界面”。停用保留配置与会话。当前原生演示已停用 Oh Story，可以在这里重新启用。独立管理入口受到保护，开关保存后重启服务仍生效。冲突、备份和部署限制见[插件开关说明](../plugin-controls/README.zh.md)。

<a id="sdk-conversation"></a>
## 接入模式与回归素材

原生 bundle 通过 DSH 管理的执行与人工交互承接[工具映射组件的 Generative UI 模式](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)，不建立另一套 SDK Agent 循环。它不使用 `useChat`、`streamText` 或独立的浏览器本地消息历史。

<a id="generate-another-set"></a>
[原生渲染素材](native/fixtures.mjs)及相邻测试覆盖卡片，不启动服务，也不调用模型。上表中的实机会话属于演示环境；此源码包不包含其凭据或会话日志。

<a id="dev-note"></a>
## 开发备注

两个 bundle 是演示环境 Web profile 的本地目录依赖，声明了标准 `dsh.bundle.patch`，不修改已安装核心产物。演示机器上已有的 `com.deepseek.harness.web` 启动服务负责 3080 端口；端口监听时不要再启动 DSH 进程。没有新增演示服务或凭据存储。
