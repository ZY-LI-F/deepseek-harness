---
description: "Generate task questions, result cards and dashboards inside an existing DSH Web session."
kind: "package-bundle"
---

# @deepseek-ai/dsh-generative-ui

English | [中文](README.zh.md)

## Summary

Use the current DSH model to ask structured questions and present task results as cards or dashboards. Single-choice, multiple-choice, written, yes/no and numeric questions wait for human answers before the task continues. Results and submitted answers remain in the native session log and can be replayed. This bundle uses DSH tools and interaction services; it does not start another model client or require another API key.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

The existing Web profile has this bundle installed through `dsh plugin --profile web add`, with the local package directory as its argument. Its [patch](cordis.patch.yml) inserts the `generative-ui` row. Stay in the ordinary conversation: question cards wait above its composer, and completed answers and results appear in the transcript. The optional `Generative UI` tab collects recorded results and four example prompts. No separate chat history or provider configuration is created.

Ask, for example: “Use ask_ui to clarify the current decisions in one grilling round, including single/multiple choice, written, yes/no and numeric questions. After I answer, ask dependent questions, then use present_ui for a result dashboard.” Recommendations do not preselect answers. All questions in the current round must be answered; every choice question also accepts a written alternative or explanation. Drafts survive a browser refresh in the same browser and session. Submitted cards retain the original options and checked answers as read-only evidence. Single- and multiple-choice options form a compact single-column list in both pending questions and submitted cards. Each label and description share a line where space permits and wrap without truncation otherwise. Question cards and option rows use 8px corner radii.

`present_ui` accepts 13 task-authored section types: metrics, bar/line/area charts, sortable/filterable tables, progress, timelines, callouts, facts, findings, artifact links, weather, stocks, products and documents. A document contains headings, paragraphs and optional bullet lists; its Markdown download uses the same content as its preview. Reports and dashboards can combine up to 24 sections. Chart and table controls are local presentation choices; they do not execute business actions. “Expand view” opens a native dialog. The PharmaID-inspired interface uses pale-blue backgrounds, white rounded cards and blue gradient primary buttons. Styling is scoped to this bundle; it does not replace the DSH shell. The [session guide](../README.md) lists the live examples, and [plugin controls](../../plugin-controls/README.md) provides enable/disable instructions.

The patch sets `maxDocumentBytes: 131072` and `promptOrder: 850`. The first limits complete result JSON in UTF-8 bytes; the second positions the model guidance. Every question round allows at most 12 questions. Invalid payloads return native tool errors that the model can correct; raw records remain inspectable.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

[`host.mjs`](host.mjs) registers `present_ui`, `ask_ui` and a system-prompt section as Cordis effects. `ask_ui` calls `ctx.userQuestions.ask` with the owning agent and cancellation signal. The browser uses the existing pending-question carrier to submit one answer batch; the native tool result returns it to the same agent. Execution permissions stay with DSH; a yes/no task answer is not an execution permission.

[`schema.mjs`](schema.mjs) validates model JSON and human replies. [`projection.mjs`](projection.mjs) reads self-contained `tool/result` metadata and builds the `generative-ui` conversation target, including when the original call is outside the loaded history window. Tool cards subscribe to this target and match results by call id. [`turn-results.mjs`](turn-results.mjs) collects successful outcomes within an engine-owned turn. [`entry.tsx`](entry.tsx) registers keyed tool cards, a completed-turn tail, the optional result view and a question-composer entry through DSH slots. The tail keeps outcomes visible when Compact mode folds tool details. The model supplies data, never executable React or HTML. This implements the tool-to-component Generative UI pattern using DSH's native protocol, not `useChat` or an independent `streamText` loop.

</details>

-----

<a id="model-experience"></a>
## Model Experience

The model receives the two tool schemas and instructions to choose the relevant presentation, distinguish `sample`, `provided` and `live` data, and ask only currently answerable grilling questions. Tool results, including human answers, become normal logged model inputs. Reusing a document id publishes another complete checkpoint. The completed-turn tail shows the latest checkpoint per document in that turn; the optional result view provides a “Latest results” filter. Neither removes logged evidence.

#### KV Cache effect

The tool definitions and prompt section join the normal DSH request. This bundle does not implement a separate context cache or model history.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

The renderer is a bounded component catalogue, not arbitrary generated application code. Weather, stocks and products have no built-in live data connector; another authorized DSH tool must obtain real data before `present_ui` displays it. A `live` label describes the supplied data and is not independent verification of its source. Custom business actions need their own native tools and permission handling. Browser drafts are not exported; submitted answers and results are. Table filters and chart styles are local to each rendered view. No separate invariant plugin is needed because the cards derive directly from durable tool metadata rather than maintaining another execution state.

The completed-turn tail requires the turn start in the loaded history. Its priority of 10 yields to earlier entries, including the native produced-files panel. If that panel occupies the tail, expand the tool process to inspect the cards. If an older turn is incomplete in the loaded history, load older messages or use the optional result view. Markdown download does not save a file into the DSH workspace or send it to anyone.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Build from this directory with `../../../node_modules/.bin/tsdown`. From the repository root, `node showcase/check-clients.mjs` checks the built public DSH declarations; the declaration artifacts must exist. `node --test showcase/generative-ui/native/native.test.mjs showcase/generative-ui/native/render.test.mjs showcase/plugin-controls/patch-store.test.mjs` runs the keyless behavior and built-renderer snapshots. Real Fosun sessions supplement these tests. The [decision record](../../../.agents/notes/implemented/feature/2026-09-05-native-generative-ui.md) owns the integration rationale.

The theme references the [PharmaID workbench](https://pharmaid.fosunpharma.com/ui-ai-web/index) and [chat page](https://pharmaid.fosunpharma.com/ui-ai-web/chatIndex). The stylesheet adapts their colors, typography and corner radii without copying branding, conversation content or remote assets.

</details>
