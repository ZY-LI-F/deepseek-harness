# @deepseek-ai/dsh-client-ui-task-knowledge-map

English | [中文](README.zh.md)

Task Knowledge Map adds a read-only `conversation.view` tab to DSH Web. It projects the active Session into a left-to-right graph of the root agent, Turns, Steps, workflow phases, delegated subagents, and nested Tool calls. Completed, active, waiting, failed, current-path, and concurrently active-path states remain visually distinct. Selecting a node changes the information inspector to that execution position, while **Follow current** returns selection to the live leaf.

The graph uses existing Client snapshots only: the Chat timeline establishes Turn and Step order, assembled `workflow-run` and `tool-call` rows establish branches and Tool trees, `runningCalls` supplies live calls that do not yet have an assembled row, and the Session catalog supplies parent-visible subagent summaries. The deepest active kind wins the single current-position marker; all simultaneous active leaves retain their highlighted paths. Graph and information rows are bounded at 56 Tool nodes and 160 knowledge items, with explicit truncation counts.

“Knowledge position” means observable information available in the Session at a selected sequence boundary. It does not mean the model's private epistemic state. The inspector classifies user requirements, injected context, memory-style recall such as MemOS results, Tool evidence, visible assistant conclusions, context compaction, failures and retries, queued context, and delegated tasks. Reasoning blocks are excluded. Items before the latest compaction checkpoint remain visible but are marked compacted; queued items appear only at the live tail. A delegated subagent exposes only the task and metadata visible to its parent Session because this view does not open or merge the child transcript.

The package owns no durable state, Remote method, Host behavior, event, prompt, or Tool. Refresh and replay rebuild the same projection from authoritative snapshots, and disposing the plugin removes its tab and locale dictionaries.

## Model Experience

### Browser-only observable projection

#### What the model sees

Nothing. Task Knowledge Map reads rendered `ConversationSnapshot` and `SessionListState` values after request execution. It does not add a system prompt, context item, Tool schema, Tool result, or model message.

#### Token effect

None. The view does not add, remove, or reorder request tokens.

#### KV Cache effect

None. The package never participates in prompt assembly, so it cannot change the reusable prefix or append-only suffix.

## Known Limitations and Deferred Work

- The map covers the currently loaded Session window; unloaded older history is not guessed.
- Parent-visible delegation metadata cannot reveal a subagent's internal path or knowledge. Opening child snapshots and cross-Session navigation remain separate capabilities.
- Observable provenance can show what entered the Session and where it was recorded, but cannot prove what the model understood, retained, believed, or used.
- Automatic graph layout is a bounded tree view rather than a general graph editor; pan gestures, minimaps, export, and persisted manual positioning are not included.
