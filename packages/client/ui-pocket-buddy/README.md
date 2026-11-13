# @deepseek-ai/dsh-client-ui-pocket-buddy

English | [中文](README.zh.md)

Pocket Buddy is a browser-only, root-scoped page pet in `shell.overlay`. It folds the existing Session list into four visual moods (`idle`, `working`, `needs-you`, `celebrate`) and lets the user choose between three original, visually previewed coats: Peach Tabby, Cloud Cat, and Starlight Cat. Peach Tabby uses transparent complete-character animation cels authored from the approved identity anchor: eight side, toward-camera, and away-camera frames. Every cel redraws the intact cat; no limb is cut out or independently rotated, so walking cannot reveal missing hidden pixels, open seams, or duplicated paws.

Autonomous movement samples arbitrary coordinates from one continuous screen-safe rectangle; it has no waypoint list or route graph. A requestAnimationFrame controller advances the actor at a constant 64 pixels per second and selects eight gait cels from actual distance travelled, with one complete cycle per 72 pixels. The feet therefore advance only when the cat advances and stop on the first cel from the same character set. The travel vector selects the closest authored left, right, toward-camera, or away-camera bearing instead of letting a side-view cat drift diagonally. A direction change pauses for a whole-character settle before travel resumes. Alternating paw prints are emitted at real gait contacts and fade behind the cat.

When the current task pauses or completes, the controller interrupts random roaming, derives a dock immediately to the right of the lower-left Whale Girl from the live viewport, and walks the cat there along one direct route. Compact layouts use the same responsive caretaker measurements as Task Garden. On arrival the cat faces the girl, plays a complete lie-down transition, and leaves locomotion. Its docked schedule defaults to and is dominated by a continuous breathing sleep hold, with occasional paw licking, face washing, stretching, observation, click response, and an in-place hop. Each interaction begins with a complete wake-up and ends by lying back down. Autonomous roaming and ball chasing are excluded because they would move the cat away again. When work resumes, the cat wakes and walks out of the dock into continuous random roaming. Disabling motion places it quietly at the dock without pretending to walk.

Seven semantic idle actions—wash face, lick paw, stretch, look, sit, sleep, and chase ball—are selected as weighted permutations without replacement. Pairs are favored, with occasional triples (`P(7,2)=42`, `P(7,3)=210` before constraints). A posture compiler inserts only reviewed whole-body transitions: sit once for adjacent seated actions, use a seated settle between them, then stand once at the end. Face washing contains two complete cycles; sleeping includes lie-down, breathing, animated Z text, and wake-up. The last four semantic actions are cooled down, sleep can only end a sequence, and one autonomous scene may not exceed 18 seconds.

Every reviewed cel and alternate-coat raster is normalized independently from the cat silhouette's transparent-pixel bounds. Its longest visible edge is exactly 100 CSS pixels in a viewport-independent render box; Peach Cat cels also share one paw line. This keeps the cat's apparent size stable across coats, standing, grooming, sleeping, and all twelve chase-ball frames without shrinking screen travel or moving the feet off their contact line.

The mood bubble uses that same 100-pixel visible silhouette as its anchor instead of the much taller actor box. It stays horizontally centered over the cat's head with a 4-pixel gap on both wide and compact layouts, so “Working hard” remains close to the character while its action cels change.

Skin, motion, and sound preferences use the slot store's local persistence; the wardrobe's open state remains component-local. Sound starts muted. When explicitly enabled, `SoulAudioRuntime` prefers two embedded 0.56/0.80-second Qwen3-TTS character cues, falls back to bounded Web Audio, and enforces a 30-second global meow cooldown. No runtime network request is made.

The plugin reads only Session summary flags. It does not inspect conversation content, append events, call the model, or make network requests. Unloading its fiber removes the overlay, dictionaries, store seat, and lazily-created audio context; persisted viewing preferences remain available for a later reinstall.

## Model Experience

None, as this browser-side overlay reads existing Client projections and registers nothing model-facing.

#### KV Cache effect

None; it neither assembles nor sends model requests.

## Known Limitations and Deferred Work

- The three coats change only the page pet, not the application's global palette or Platform World. All three use reviewed full-body raster sequences; Peach Tabby's first walk frame is also its stationary identity.
- Peach Tabby currently has separate eight-frame side, toward-camera, and away-camera gait sets; the complete side cels are mirrored for rightward travel. These four bearings cover the main screen-space directions used by free roaming.
- The public package contains only the complete-character 2D runtime path. Raw references, the former Three.js renderer, and discarded cutout or 3D experiments remain local and are not part of the published branch or browser build.
- Walking, grooming, stretching, sleeping, pouncing, looking, click response, and turning all use reviewed whole-character cels. Adding another expression still requires a reviewed full-frame sequence; the runtime will not synthesize missing anatomy from flattened art.
- Eyes and ears are baked into each approved full-body frame. Independent expression requires a new reviewed full-frame sequence rather than another cutout of the flattened source.
- Completion copy still appears briefly, while the cat prioritizes the walk-to-caretaker, lie-down, and continuous-sleep handoff instead of allowing a fixed celebration pose to block the return route.
- The two runtime meows are synthetic Qwen3-TTS character cues, not recordings or cloned voices. They remain opt-in, quiet, probabilistic, and globally cooled down; sleep never meows.
