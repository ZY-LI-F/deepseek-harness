---
description: "在现有 DSH Web 会话内生成任务提问、结果卡片和驾驶舱。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-generative-ui

[English](README.md) | 中文

## 概述

使用当前 DSH 模型提出结构化问题，并把任务结果展示为卡片或驾驶舱。单选、多选、问答、判断和数值问题会等待人工回答，再继续任务。结果与已提交答案保留在原生会话日志中，可以回放。本 bundle 使用 DSH 工具与交互服务，不启动另一套模型客户端，也不需要另一份 API Key。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

现有 Web profile 已通过 `dsh plugin --profile web add` 安装本 bundle，参数为本地包目录。[补丁](cordis.patch.yml)插入 `generative-ui` 条目。保持在普通“对话”中：提问卡在输入框上方等待回答，已提交答案和结果出现在消息流里。可选的 `Generative UI` 标签汇总记录的结果，并提供四类示例提示词。不会创建独立聊天历史或模型配置。

例如可以提问：“用 ask_ui 把当前可决定的问题放在同一轮 grilling 中，包括单选、多选、问答、判断和数值题。我回答后再追问依赖这些答案的问题，最后用 present_ui 展示结果驾驶舱。”推荐项不会预选。当前轮次的所有问题都需回答；选择题也接受文字形式的其他答案或补充说明。同一浏览器、同一会话中的草稿可在刷新后恢复。提交后的卡片保留原始选项与勾选答案，作为只读记录。单选和多选在待回答卡片与已提交记录中均采用紧凑单列列表。选项标题和说明在空间足够时保持同一行，否则自动换行，不截断内容。提问卡片与选项行均使用 8px 圆角。

`present_ui` 接受任务提供的 13 类区块：指标、柱状/折线/面积图、可排序筛选表格、进度、时间线、提示、事实、结论、交付物链接、天气、股票、商品和文档。文档包含小标题、段落和可选项目列表，下载的 Markdown 与预览使用相同内容。报告与驾驶舱最多组合 24 个区块。图表和表格控件只改变本地展示，不执行业务动作。“展开查看”使用原生对话框。界面参考 PharmaID，采用浅蓝背景、白色圆角卡片和蓝色渐变主按钮。样式仅作用于本 bundle，不替换 DSH 外层界面。[会话指南](../README.zh.md)列出实机示例，[插件开关](../../plugin-controls/README.zh.md)说明启用与停用方法。

补丁设置 `maxDocumentBytes: 131072` 和 `promptOrder: 850`。前者限制完整结果 JSON 的 UTF-8 字节数，后者确定模型指引的位置。每轮最多 12 个问题。非法数据返回原生工具错误，模型可以修正；原始记录仍可查看。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`host.mjs`](host.mjs) 通过 Cordis effect 注册 `present_ui`、`ask_ui` 和系统提示词区段。`ask_ui` 携带所属 Agent 和取消信号调用 `ctx.userQuestions.ask`。浏览器通过现有待回答载体提交整轮答案，原生工具结果将其返回同一个 Agent。执行权限仍由 DSH 管理；判断题的“是/否”不是执行授权。

[`schema.mjs`](schema.mjs) 校验模型 JSON 和人工答案。[`projection.mjs`](projection.mjs) 读取自包含的 `tool/result` 元数据并构建 `generative-ui` 会话视图，即使原始调用已不在加载的历史窗口内也能展示。工具卡订阅此视图，按调用 id 匹配结果。[`turn-results.mjs`](turn-results.mjs) 在引擎管理的回合内汇总成功结果。[`entry.tsx`](entry.tsx) 通过 DSH slot 注册工具卡、已完成回合尾部、可选结果视图和提问输入区。即使紧凑模式折叠工具详情，回合尾部仍展示结果。模型只提供数据，不提供可执行的 React 或 HTML。此实现使用 DSH 原生协议承接工具映射组件的 Generative UI 模式，不使用 `useChat` 或独立的 `streamText` 循环。

</details>

-----

<a id="model-experience"></a>
## 模型体验

模型接收两个工具 schema，以及选择合适展示、区分 `sample`、`provided`、`live` 数据和按可回答问题开展 grilling 的指引。包含人工答案在内的工具结果成为正常、可记录的模型输入。复用文档 id 会发布新的完整快照。已完成回合尾部展示本回合每份文档的最新快照，可选结果视图提供“最新结果”筛选。两者均不删除日志证据。

#### KV Cache 影响

工具定义和提示词区段进入正常 DSH 请求。本 bundle 不实现独立上下文缓存或模型历史。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

渲染器是有界组件目录，不是任意生成的应用代码。天气、股票和商品不内置实时数据连接器；其他已授权的 DSH 工具需先获取真实数据，再由 `present_ui` 展示。`live` 标签描述提交的数据，不是对来源的独立核验。自定义业务动作需要自己的原生工具和权限处理。浏览器草稿不导出，已提交答案与结果会导出。表格筛选和图表样式只作用于各自渲染视图。卡片直接派生自持久化工具元数据，不维护另一套执行状态，因此不需要独立 invariant 插件。

已完成回合尾部要求加载的历史包含回合起点。它的优先级为 10，会让位于更早匹配的条目，包括原生文件交付面板。若文件面板占用回合尾部，请展开工具过程查看卡片。若较早回合的历史未加载完整，可加载更早消息或使用可选结果视图。Markdown 下载不会向 DSH 工作区写文件，也不会向任何人发送内容。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

在本目录执行 `../../../node_modules/.bin/tsdown` 构建。在仓库根目录执行 `node showcase/check-clients.mjs` 检查已构建的 DSH 公共声明，需要这些声明产物存在。`node --test showcase/generative-ui/native/native.test.mjs showcase/generative-ui/native/render.test.mjs showcase/plugin-controls/patch-store.test.mjs` 运行无需密钥的行为测试和构建后渲染快照。真实复星会话作为补充。[决策记录](../../../.agents/notes/implemented/feature/2026-09-05-native-generative-ui.zh.md)说明接入理由。

主题参考 [PharmaID 工作台](https://pharmaid.fosunpharma.com/ui-ai-web/index)和[聊天页](https://pharmaid.fosunpharma.com/ui-ai-web/chatIndex)。样式表适配其配色、字体与圆角，不复制品牌标识、对话内容或远程素材。

</details>
