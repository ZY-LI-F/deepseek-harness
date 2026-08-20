# Agent Note: Soulful browser presentation plugins and platform worlds

Status: implemented

English | [中文](2026-08-14-soulful-client-plugins.zh.md)

## Problem

The Web Client exposes precise Session and Tool state, but ordinary users still experience long-running work as abstract status changes. The presentation needs to be playful, removable, understandable without technical knowledge, and independent of the durable log. It also needs three switchable 2.5D/3D platform-world styles without making Godot or media-generation runtimes browser dependencies, while production media and private references remain separate from distributable runtime code.

## Decision

Three active Client Modules attach through additive slots, and one source package remains available but unmounted:

- `ui-pocket-buddy` registers a root-scoped entry in `shell.overlay`. It folds Session summaries into four moods, owns persisted coat, motion, and sound preferences, and renders reviewed complete-character 2D cels. Side, toward-camera, and away-camera travel each use eight transparent full-body frames; the rightward bearing mirrors the intact side set. Continuous random endpoints replace a fixed route graph, gait frames advance from actual distance, and alternating paw prints use the same accumulated travel. Weighted whole-character action sequences cover grooming, stretching, looking, sleeping, waking, turning, clicking, hopping, and chasing a ball without separating anatomy. Paused or completed work sends the cat along one route to the Whale Girl, where continuous sleep becomes the default until an interaction or resumed work wakes it. The [complete-character cel decision](../bug-fix/2026-08-15-source-pixel-cat-free-roaming.md) owns the rendering rationale. Three wardrobe portraits preview Peach Tabby, Cloud Cat, and Starlight Cat.
- `ui-task-garden` registers a session-scoped entry in `conversation.viewport.overlay`. Its overlay is visually transparent—no card background, blur, border, or shadow—while `ResizeObserver` and pure rounded-frame geometry derive a 12–48-slot clockwise perimeter from the current space. A reviewed local Z-Image blue-haired whale-girl lives in a fixed lower-left viewport dock. Each newly observed Tool-call identity and each authoritative Step increment launches one V21 blue-or-pink flower-only raster through a slower drift, curve, magnetic overshoot, and idempotent landing; it then persists with its center directly on the vine, without a stem, leaf, or attachment gap, and a 2.85-second fallback covers omitted CSS animation-end events. Flowers point inward so the top hangs down and the clipped bottom garden grows upward; durable bottom growth opens the first flower immediately and then one per two completed Steps. V22 adds 22 complete-character cels tied to one approved watering portrait: a six-frame walk-watering loop plus four-frame admire, cheer, dance, and wave interludes. The broad round face, two large sapphire-to-cyan eyes, upper lashes, tiny cat mouth, fringe, costume, and full-body proportions remain locked; rejected single-eye and identity-drift studies remain archived but never load at runtime. Each V22 alpha subject is individually normalized to 450 source pixels and the responsive browser canvas is capped at 80 CSS pixels. While work runs, the caretaker and water stream travel together across the grass; the stream is a child of the moving caretaker and follows six authored per-cel spout anchors. Deterministic interludes occur every 5.5–10 seconds or on a landing, and watering resumes afterward. Completion retains bow–kiss–toast; the kiss uses eight complete-character cels on one fixed canvas and foot baseline, with three small coral-heart rasters appearing after the elbow-led release.
- `ui-agent-theater` retains its source and tests for reuse but does not mount its `conversation.input.dock` entry in Web. Task Garden owns the caretaker identity and active-work feedback.
- `ui-platform-worlds` registers `platform-world` in `conversation.viewport.background` and `platform-world-switcher` in `conversation.session.header.actions`. Both consume one fiber-owned `PlatformWorldRuntime`, which persists one of `cloud-harbor`, `candy-gears`, and `moon-coral` and updates both seats synchronously.

The conversation skeleton owns the two spatial slots. `conversation.viewport.background` sits behind the transcript, while `conversation.viewport.overlay` sits above it but remains pointer-through. Both render only for the active Session and clear the current composer height. Spatial policy therefore stays with the owner instead of being duplicated across feature packages.

Pocket Buddy provides one `SoulAudioRuntime` service. It starts muted, creates an AudioContext only after explicit user enablement, catches unavailable-audio failures, and exposes five short semantic cues. Garden and Theater import its types only, so their browser bundles do not include another plugin's values. The longer Qwen3-TTS masters remain video-production assets rather than runtime payload.

Godot and media-generation tools remain authoring inputs rather than browser dependencies. The distributable packages embed normalized runtime cels, audio data, and lightweight timing only. Raw model outputs, prompts, user references, research footage, captured Sessions, local paths, discarded experiments, copied franchise assets, and generated video remain outside the public changeset.

## State and privacy contract

Pocket Buddy reads Session summary identity and status fields. Task Garden reads turn and step counts, `running`, and the stable identities and nesting of currently running Tool calls; it never reads their names or arguments for display. Platform Worlds reads only the current Session's `running` flag and its browser-local style preference. The unmounted Agent Theater reads nothing at runtime.

None of these packages reads message prose, Tool arguments, attachments, credentials, or filesystem content. None appends Session events, changes prompt assembly, calls a provider, emits telemetry, or affects replay. Durable user state is limited to local viewing preferences: `skin`, `motion`, `sound`, and platform-world `style`. Completion celebrations and motion cadences remain component-local presentation state.

## Verification

Pure-model, presentation, persistence, accessibility, and real `SlotRegistry` composition tests cover the active packages; Agent Theater retains its standalone tests. Pocket Buddy verifies complete-character cel selection, continuous random endpoints, distance-bound gait timing, dock handoff, sleeping as the resting default, whole-character action composition, and alternating paw prints. Task Garden tests cover active-time growth bounds, inward rounded-frame sampling, measured-density reflow, the six-frame V22 watering loop, deterministic task interludes, nested Tool-call and Step flights, flower-only V21 assets, zero-gap persistent landing, the bow–kiss–toast completion sequence, heart particles, bottom flowers, and capability fallback. Real-browser validation covers the transparent center, lower-left actor dock, hanging top flowers, clipped bottom growth, partial perimeter progress, approved-face V22 playback, moving walk-watering, attached blossoms, elbow-led kiss playback, cat docking and sleep, zero horizontal overflow, complete image loading, and absence of new runtime errors.

## Alternatives considered

**One combined cute-mode package.** Rejected because deleting or replacing one presentation would remove unrelated behavior, and the package would need to understand several independent slot interfaces.

**Presentation fields in Session events.** Rejected because drawing intent does not belong in the durable log; replay and model history remain presentation-independent.

**Godot or rendered video inside the browser plugin.** Rejected because the ambient scenes and page pet need lightweight interactive motion. Godot remains reproducible authoring source, while the browser renders only the runtime geometry and tableaux it needs.

**A fixed decorative garden card.** Rejected because the conversation viewport changes with the sidebar, details panel, composer, and window size. Measured normalized perimeter progress preserves the upper-left-to-right growth order without hard-coding a border box.

**A cutout rig or procedural 3D cat.** Rejected because a flattened illustration does not contain the pixels hidden behind its limbs, while the available 3D mesh did not preserve the approved character identity. Reviewed complete-character cels keep anatomy and appearance consistent across travel and expressive actions.

**A recognizable platform-game style.** Rejected. The scenes use side-scrolling traversal as a genre convention but define original characters, names, silhouettes, palettes, props, collectibles, geometry, and sounds.

**Recording or share controls in the plugins.** Rejected because the distribution artifact is a separate explanatory video. Capture planning and private or copyrighted production inputs remain outside the product packages and public changeset.

## Consequences

Each active presentation can be composed, removed, tested, or replaced without changing the agent loop. The merged caretaker scene avoids competing progress panels, while the four-legged page cat supplies a playful cross-screen signal. Users can switch among three original platformer-like scenes from one header control. Logs, prompts, model requests, and cache behavior remain unchanged.

The tradeoffs are deliberate. Unfamiliar tools use the generic workshop scene; deployments without `sessionStats` see window-scoped garden progress; sound effects are short opt-in cues; and the background worlds are animated tableaux rather than playable games. Pocket Buddy embeds reviewed complete-character cel and audio data, increasing its browser bundle in exchange for stable anatomy, expressive actions, and an approved illustrated identity. Task Garden embeds its task, kiss, flower, vine, grass, and heart runtime data and owns bounded transient flights, attached blossoms, and gesture state without adding durable presentation data. The public changeset excludes raw generation sources and production research, so reproducing a new asset set requires a separately authorized authoring workspace.
