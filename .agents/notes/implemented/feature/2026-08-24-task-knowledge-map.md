# Agent Note: Observable task and knowledge map

Status: implemented

English | [中文](2026-08-24-task-knowledge-map.zh.md)

## Problem

DSH exposes a linear trajectory, nested Tool presentation, workflow disclosures, and subagent navigation, but no single Session surface answers two related operational questions: which execution branch is current, and which observable information sources exist at a selected position. Treating these sources as the model's internal knowledge would also expose a misleading and unsafe contract because hidden reasoning and child contexts are not authoritative Client data.

## Decision

`@deepseek-ai/dsh-client-ui-task-knowledge-map` registers a browser-only, read-only `conversation.view` tab. Its pure `buildTaskKnowledgeMap(...)` projection combines the Session Chat timeline, assembled workflow and Tool rows, running calls, conversation nodes, queue, and Session catalog into a bounded graph plus information ledger. The React view renders all active branches, one deterministic current leaf, position-scoped information, search, zoom, and explicit truncation notices.

The package reuses existing snapshot contracts instead of creating a Host service, event type, durable projection, or Remote method. Reload and replay derive the view again, and plugin disposal removes every registered browser resource.

## Observable knowledge contract

“Knowledge” in this view means information observable in the parent Session: user and steering requirements, injected context and recall provenance, Tool results, visible assistant text, compaction summaries, failures and retries, queued input, and delegation metadata. Hidden reasoning blocks are neither displayed nor inferred. Information earlier than the latest compaction remains historical and is marked compacted. A selected node with a completed sequence shows items available no later than that sequence; the live tail may also show queued context.

A subagent node deliberately exposes only the task and status visible to its parent. The plugin does not merge a child's transcript or claim visibility into the child's internal context. The UI labels this boundary instead of presenting delegation metadata as child knowledge.

The graph retains at most 56 Tool nodes and the ledger at most 160 items. It preserves the earliest user requirements plus recent items and reports omitted counts, so a long Session cannot create unbounded browser work.

## Alternatives considered

**Extend Trajectory.** Trajectory owns chronological event inspection. Adding topology, branch selection, and cumulative information semantics there would mix two interaction models and make the existing linear view harder to scan.

**Depend on an external agent canvas.** A generic canvas can visualize agent topology, but it does not own DSH's Turn, Step, Tool, queue, and compaction contracts. Making this core view depend on a third-party schema would weaken replay fidelity and installation defaults.

**Infer hidden reasoning or a definitive model belief state.** Observable prompts and outputs cannot establish what a model internally retained or believed. Such inference would overstate certainty and conflict with the product boundary around private reasoning.

**Persist a new task-map event stream.** The required facts already exist in authoritative Session snapshots. Duplicating them would add ordering, migration, and recovery obligations without improving the current read-only experience.

## Verification

Pure projection tests cover active and completed Turn/Step paths, workflows, subagents, nested and running Tools, compaction, hidden-reasoning exclusion, failures, malformed extension rows, deterministic layout, and bounds. Browser tests cover position selection, delegation scope, search, zoom, follow-current behavior, reactive Session changes, locale registration, slot teardown, inert Host behavior, and invariant ownership. Package type checking and bundling pin the public browser artifact.

## Consequences

DSH gains a native operational map without changing model requests or durable Session semantics. The view remains honest about observability and bounded on long tasks, at the cost of not showing unloaded history, child-internal paths, inferred beliefs, arbitrary graph editing, or persisted manual layout.
