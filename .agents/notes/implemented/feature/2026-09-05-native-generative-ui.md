# Agent Note: Native Generative UI and extension controls

Status: implemented

English | [中文](2026-09-05-native-generative-ui.zh.md)

## Problem

Tasks need typed human questions and composable result interfaces inside the same model context and durable session. A separate SDK demonstration cannot provide native tool execution, human-answer continuity or session-log replay. Users also need a recoverable way to disable presentation plugins without uninstalling them.

## Decision

The [Generative UI bundle](../../../../showcase/generative-ui/native/README.md) registers `ask_ui` and `present_ui` on DSH's tool service. Human questions use the existing `userQuestions` service and pending-question composer carrier. Reports and answer batches carry self-contained `generativeUi` result metadata. A target-owned conversation projection renders this metadata through keyed tool slots and the `Generative UI` view. Model requests, tool execution, cancellation, permission checks and persistence stay owned by DSH.

The question composer groups the currently answerable decisions into one grilling round. Recommendations remain unselected. Answers return as a native tool result before the model chooses dependent questions. Task judgments do not grant execution permissions. Result schemas restrict the model to data for prewritten components, with byte limits, unique identities, coherent chart/table dimensions and HTTP(S)-only artifact links.

The ordinary conversation is the primary surface. Tool cards subscribe to durable result checkpoints by call id, so an unchanged in-flight tool row can settle without a reload. Submitted choices retain their original options and checked answers. A turn-owned projection supplies the public completed-turn tail with successful answer rounds and the latest document checkpoints, independently of Compact mode's process fold. This lower-priority tail yields to the native produced-files panel; incomplete loaded turns and occupied tails retain the tool-card and optional result-view paths. Structured document sections share one plain-text source for preview and Markdown download. The bundle-scoped theme adapts PharmaID's pale-blue backgrounds, white cards and blue interactions without modifying the DSH shell or task records.

The independent [plugin-controls bundle](../../../../showcase/plugin-controls/README.md) exposes authenticated settings RPC and writes only discovered extension overrides into the configured profile patch. It preserves configurations and comments, rejects stale revisions and busy agents, and retains pre-edit backups. Its own entry and core application rows are protected. Host lifecycle changes apply through Cordis; the browser reloads its initial module graph when the user presses the explicit reload action.

## Alternatives considered

**Independent SDK chat.** It demonstrates AI SDK APIs but creates another tool catalogue, message history and continuation owner. This decision keeps task integration in the main harness through its native tools and interaction services.

**Patching the agent loop or installed core artifacts.** Public tool, question, projection, slot and profile-patch APIs provide the required behavior. These two bundles do not require changes to those core implementations or another service instance.

**Editing plugin configuration without revision checks.** Concurrent settings pages can overwrite a newer operator decision. Revision fencing and atomic replacement retain unrelated configuration; the file lock coordinates manager writers but does not claim control over arbitrary filesystem writers.

## Consequences

The existing provider can generate task-specific cards rather than fixed sample UI. Submitted answers and result checkpoints survive session replay; unsubmitted drafts remain browser-local. Generic business connectors and arbitrary generated JSX are outside the renderer. A custom actionable card still needs an authorized native tool. The standard browser boot graph requires a page reload after changing plugin membership.

Keyless tests cover schema rejection, question mapping, native settlement, result-only history replay, turn-local outcomes, read-only choice replay, safe document export, lifecycle disposal, YAML preservation, stale/concurrent edits and built-renderer snapshots. Real Fosun sessions cover dashboard composition, reports, business cards, two dependent grilling rounds and refresh-restored drafts. The slate-blue weekly-brief conversation covers sequential single/multiple/yes-no questions, a document derived from submitted answers, refresh-visible Compact outcomes and an actual Markdown download. Live settings checks cover off/on, restart persistence, unknown/protected targets and busy-agent rejection. The existing job-card artifact work is independent of these new installable bundles.
