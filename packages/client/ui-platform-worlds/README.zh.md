# @deepseek-ai/dsh-client-ui-platform-worlds

[English](README.md) | 中文

Platform Worlds 为运行中的 Harness 会话提供三套原创横向平台场景。`conversation.session.header.actions` 中的紧凑选择器控制 `conversation.viewport.background` 里的安静、不可交互背景；一个由插件 fiber 持有的 `PlatformWorldRuntime` 让选择器与背景保持同步，并把选中的风格保存在浏览器本地偏好中。

## 世界

- **Cloud Harbor / 云港跳岛** 以漂浮码头、船帆和风铃组成 2.5D 空中路线。
- **Candy Gearworks / 糖果齿轮城** 是带有缓慢旋转齿轮的等距糖果工坊。
- **Moonlit Coral Bay / 月光珊瑚湾** 是带珍珠和漂浮水母的 2.5D 月夜礁湾。

原创椋鸟侦察员只在当前会话运行时跳跃。所有背景都允许点击穿透，使用 Harness 主题 token，保持正文对比度，并遵循减少动态效果偏好。Godot 可以复现创作构图，但浏览器包只发布轻量 Web 版本，不依赖 Godot 运行时。

## 模型体验

### 仅浏览器端的只读模型

#### 模型看到的内容

无。Platform Worlds 只读取当前会话的 `running` 标志和浏览器本地风格偏好；它不会注册提示词、上下文、工具 schema 或工具结果。

#### Token 影响

无。该包不会增加、删除或重排模型请求 token。

#### KV Cache 影响

无。该包从不参与提示词组装。

## 已知限制与后续工作

- 这些场景是环境背景，不是可以操作的平台游戏。
- 风格偏好只保存在本地浏览器，不会在设备间同步。
- 背景动态刻意保持轻微，以对话可读性为先。
- Godot 是可选创作工具，不是 Web 包的依赖或内嵌播放器。
