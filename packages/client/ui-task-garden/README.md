# @deepseek-ai/dsh-client-ui-task-garden

English | [中文](README.zh.md)

Task Garden keeps its Session hooks in `conversation.viewport.overlay`, but its click-through artwork uses the fixed coordinate space of the whole page. The flowering-vine garland therefore surrounds the sidebar, conversation, and details columns instead of only the center transcript. It has no card background, blur, border, or shadow, and `pointer-events: none` keeps every underlying control operable. A `ResizeObserver` measures the live page-wide frame rather than imposing a fixed size; pure rounded-frame geometry then derives the radius, vine density, attachment points, bottom-garden capacity, and watering origin for the current width and height. The reviewed Z-Image blue-haired whale-girl stays in the lower-left page dock, independent from the responsive vine geometry.

While a Session runs, each newly observed Tool call or authoritative Step increment launches one locally generated Z-Image blossom head from the lower-left watering origin. A short straight vine connects the caretaker to the nearest point on the left page edge, and the flower drifts toward the current growth front with a slight magnetic overshoot. At landing it becomes a persistent blossom centered directly on the vine, with no stem, leaf, or attachment gap; an idempotent 2.85-second fallback performs the same settlement when a browser omits the CSS animation-end event. These event flowers provide immediate feedback, while the surrounding vine is deliberately much slower: its clock reconciles durable `llmMs + toolMs` with a live one-second timer and advances only while the task is running. Stopping or completing work freezes the exact visible state.

A new responsive vine ring begins every ten active minutes and takes those ten minutes to travel upward, clockwise around the full page, and close at its start. Each ring exists for thirty active minutes from germination, fading gently during its final minute. This rolling lifetime keeps at most three rings visible on an arbitrarily long task. Successive rings rotate through four different Z-Image vine styles, use stable Session-seeded mirroring, and occupy 0, 7, and 14-pixel inward offsets, so they read as layered circles instead of one tangled strip. Each visible ring contributes at most one large blue V21 blossom head, and task events choose deterministically from four blue and four pink V21 species; every one is a transparent flower-only raster without a stem or leaf. One shared set of corner flowers and two seeded butterflies prevents the corners from multiplying with every ring. Top vines hang inward, side vines turn with the frame, and compact bottom vines stay within a narrow edge band; the twelve-piece low bottom garden remains driven by task steps. When the projection is absent during a run, stage growth falls back to the loaded Turn index and the live ring clock starts from the current run.

The caretaker uses reviewed complete-character Z-Image cels and an event-driven motion state machine. One approved watering portrait is the sole V22 identity master: its broad round face, two large sapphire-to-cyan eyes, upper lashes, tiny cat mouth, fringe, costume, and body proportions remain fixed across all task actions. The packaging pass normalizes every V22 alpha subject to one 450-pixel source height and the responsive browser dock caps the resulting character canvas at 80 CSS pixels, so action changes never change her apparent scale. Running work loops a six-frame articulated walk-watering cycle while the character, can water, and landing patch travel together across the small grass bed. The water layer is nested inside the moving character node and uses one authored spout anchor for each of the six cels, so both walking and frame-to-frame can motion carry the droplets with them. Every 5.5–10 seconds, and when a flower lands, the task deterministically chooses one of four four-frame interludes—admire, cheer, dance, or wave—before returning to watering; completion still bows, blows a kiss, and toasts. The kiss plays eight independently generated complete-character cels with one scale and foot baseline, and three independent heart rasters travel diagonally after the elbow-led release. The browser never rotates or reconnects a hand or arm. The matching Godot 4.7.1 source scene previews authored holds and effects; Godot remains an authoring and preview tool rather than a browser dependency.

The Module is read-only. It appends no events, stores no duplicate business state, and never inspects message content. Caretaking motion, sequential growth, and the opt-in `garden-grow` cue are presentation over existing Session facts; audio remains muted unless the user enables it through Pocket Buddy. The `ui-agent-theater` source package remains available for reuse, but the Web bundle does not mount a separate office strip and its workshop media is not a runtime dependency.

## Model Experience

### Browser-only read model

#### What the model sees

Nothing. Task Garden reads existing `sessionStats` and `running` Client projection values only after the Host has folded them; it registers no system prompt, injected context, Tool schema, or Tool result.

#### Token effect

None. The overlay does not add to, remove from, or reorder any model request tokens.

#### KV Cache effect

None. The package never participates in prompt assembly, so it cannot change the reusable prefix or append-only request suffix.

## Known Limitations and Deferred Work

- Growth belongs to one Session rather than a cross-session daily garden.
- An assembly without `sessionStats` sees window-scoped progress, so loading older history can advance the fallback plant.
- The bottom garden keeps its twelve-vine cap, each ring remains bounded to 12–36 slots, and the thirty-minute lifetime caps the rolling border at three rings; long tasks do not add unbounded DOM nodes.
