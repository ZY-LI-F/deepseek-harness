---
description: "Use native DSH question cards, result reports, dashboards and extension switches in the existing service."
---

# Generative UI example sessions

English | [中文](README.zh.md)

## Summary

The existing DSH service runs the native Generative UI and plugin-controls bundles on port 3080. Real Fosun model calls generate question cards, reports and dashboards inside ordinary DSH sessions. Business demonstration values are labeled samples. Model credentials, permissions, tools and history stay in the existing harness.

## Table of Contents

- [Native task interface](#native-interface)
- [Try the examples](#try-the-examples)
- [Enable and disable plugins](#plugin-controls)
- [Integration pattern and regression fixtures](#sdk-conversation)
- [Dev Note](#dev-note)

<a id="native-interface"></a>
## Native task interface

Open [the existing DSH service](http://127.0.0.1:3080/), choose a session and stay in its ordinary conversation. Questions appear above the composer; completed question cards and results remain in the transcript, including its completed-turn tail in Compact mode. The optional `Generative UI` tab is a result collection, not a separate conversation. Its “Run example” action submits an ordinary prompt using that session's selected DSH model.

The [native bundle](native/README.md) supplies `ask_ui` and `present_ui`. Questions include single choice, multiple choice, written answers, yes/no judgments and numbers. A grilling round collects currently answerable questions together, waits for submission, then lets the model ask dependent questions. Results combine metrics, charts, tables, progress, timelines, risks, facts, findings, links, business cards and document previews with Markdown downloads. “Expand view” opens a larger view; filters and sorting do not call the model. Cards use the native bundle's PharmaID-inspired theme.

<a id="try-the-examples"></a>
## Try the examples

The following sessions use the existing Fosun `DeepSeek-V4-Flash-0731` selection; they do not change the pre-existing default model. Continue a session to apply the same interfaces to another task.

| Session | What to try |
|---|---|
| Generative UI 对话演示 · 灰蓝决策与文档 | Three sequential rounds: single choice → multiple choice → yes/no → a weekly-brief document. Recorded demonstration choices are the project team; progress, risks and next-week plans; and required human review. The document preview and download remain in the conversation. |
| Generative UI 原生 01 · 项目驾驶舱 | Four KPIs, two-series chart, progress, sortable task table, milestones, risks, owners and delivery checklist. |
| Generative UI 原生 02 · 结果与交付报告 | Comparison table, summary, metrics, next actions, artifact links and timeline. |
| Generative UI 原生 03 · 天气行情商品卡 | Weather-unit switching, stock chart and product filtering. All values are samples. |
| Generative UI 原生 04 · Grilling 五类提问 | Two completed rounds with labeled demonstration answers and a decision report. Run the Grilling example to answer a new round yourself. |

Submitted answers and complete results appear in the native log and session replay. Choice cards preserve original options and checked answers as read-only records. Unsubmitted drafts remain browser-local. Tools reject malformed model output instead of treating it as executable code; the report and interview examples include native correction attempts. A business-data label is not a live connector or independent evidence verification. These examples do not send business messages.

<a id="plugin-controls"></a>
## Enable and disable plugins

Go to Settings → Plugins → Plugin controls. Finish or stop running tasks, switch `oh-story` or `generative-ui`, wait for the saved status, then press “Reload page to update plugin interfaces.” Disabling preserves configuration and sessions. Oh Story is disabled for the current native demonstration and can be re-enabled here. The independent management entry is protected, and the saved switches survive service restarts. See [plugin controls](../plugin-controls/README.md) for conflicts, backups and deployment limits.

<a id="sdk-conversation"></a>
## Integration pattern and regression fixtures

The native bundle adopts the [tool-to-component Generative UI pattern](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) with DSH-owned execution and human interaction, not another SDK agent loop. It does not use `useChat`, `streamText` or a separate browser-local message history.

<a id="generate-another-set"></a>
The [native renderer fixtures](native/fixtures.mjs) and adjacent tests cover the cards without starting a service or contacting a model. The live sessions listed above belong to the demonstration installation; this source package does not include its credentials or session logs.

<a id="dev-note"></a>
## Dev Note

The two bundles are local directory dependencies in the demonstration Web profile and have standard `dsh.bundle.patch` declarations. They do not patch installed core artifacts. The existing `com.deepseek.harness.web` launch service owns port 3080 on the demonstration machine; do not start another DSH process while it is listening. There is no additional demonstration service or credential store.
