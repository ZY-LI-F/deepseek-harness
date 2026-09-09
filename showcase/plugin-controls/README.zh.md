---
description: "在 Web 设置页启用和停用已安装的 DSH 扩展，并保留其配置。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-plugin-controls

[English](README.md) | 中文

## 概述

打开“设置 → 插件 → 插件开关”，即可启用或停用已安装扩展。开关保留插件配置、模型 Key 和会话。主机变更遵循 profile 的补丁重载策略；刷新浏览器页面后更新插件界面。管理入口保持启用，因此停用功能后仍可重新打开。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

现有 Web profile 已通过 `dsh plugin --profile web add` 安装本 bundle，参数为此本地目录。[补丁](cordis.patch.yml)插入 `plugin-controls`，选择 `web` profile，并设置 8000 毫秒运行状态等待时间。列表包含依赖安装的 bundle 条目和显式本地插入条目，包括 `oh-story` 和 `generative-ui`；不开放核心应用条目。

切换前先完成或停止运行中的任务。等待保存提示后，点击“刷新页面，更新插件界面”。普通 Web profile 会实时应用主机补丁；仅启动时加载补丁的部署需要重启服务。失败时保留观测到的开关状态，并显示原因。其他设置页更改过补丁时，请刷新列表。停用不会卸载包，也不会删除其数据。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[`host.mjs`](host.mjs) 通过 DSH Connection 提供 `/plugin-controls` 通道，由 Connection 负责 HTTP 认证、来源检查和请求关联。`list` 与 `set-enabled` 端点读取 Loader 条目，只修改已发现扩展的 `disabled` 覆盖项。管理器自身与未知条目 id 会被拒绝。存在运行中 Agent 时禁止切换。

[`patch-store.mjs`](patch-store.mjs) 编辑 YAML 文档树，保留注释、其他字段和未求值的 `!!js` 表达式。SHA-256 版本拒绝过期提交，文件锁串行化管理器自身的写入，替换使用同目录临时文件和原子重命名。每次成功尝试都把原文本保留在 profile 下的 `plugin-control-backups`。发现外部编辑冲突时，在替换前拒绝操作。不读取或返回 Key。[`entry.tsx`](entry.tsx) 注册独立设置标签，因此停用 Generative UI bundle 不会移除重新启用它的入口。

</details>

-----

<a id="model-experience"></a>
## 模型体验

本设置 bundle 不贡献模型工具或提示词。开关通过 Cordis 生命周期的释放和激活，改变所选扩展的原生工具与提示词贡献。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

开关控制 bundle 配置中指定的 profile。浏览器初始插件图在刷新页面时更新，不会仅凭主机补丁更新自动变化。界面不安装、升级或删除包，不改变依赖关系，也不编辑核心服务。未协同的外部文件写入者不受管理器文件锁约束。备份保留供手动恢复，不自动清理或回滚。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

在本目录执行 `../../node_modules/.bin/tsdown` 构建，执行 `node --test patch-store.test.mjs` 测试。[原生 Generative UI 指南](../generative-ui/native/README.zh.md)说明配套 bundle。真实 Web 测试覆盖停用和重新启用、刷新持久化、管理入口保护，以及等待提问时拒绝切换。

</details>
