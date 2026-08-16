# Soulful UI Plugins for DeepSeek Harness

English | [中文](README.zh.md)

The Web profile mounts three independent presentation plugins that make long-running work easier to read without changing the agent, its prompts, or its tools. They use existing browser-side Session projections and remain removable through the normal Cordis plugin configuration.

## What is included

| Plugin | User experience | Mount point |
|---|---|---|
| Pocket Buddy | A complete-character 2D Peach Cat roams the page, leaves fading paw prints, reacts to clicks, grooms, stretches, chases a ball, and sleeps by the Whale Girl when work pauses or completes. Cloud Cat and Starlight Cat are alternate coats. | `shell.overlay` |
| Task Garden | A blue-haired Whale Girl walks across a small grass patch and waters while page-edge vines grow with active task time. Tool and step progress launches flower heads that drift to and attach directly to the vine. | `conversation.viewport.overlay` |
| Platform Worlds | A header control switches among Cloud Harbor, Candy Gearworks, and Moonlit Coral Bay. The selected 2.5D or 3D-style tableau stays behind the conversation. | `conversation.viewport.background` and `conversation.session.header.actions` |

The `ui-agent-theater` package is retained as an unmounted experiment. Its office strip does not appear in the Web profile; Task Garden owns the active-work caretaker experience.

## Interaction and progress

Pocket Buddy uses complete full-body cels rather than a cutout skeleton. Side, toward-camera, and away-camera gait sets follow continuous random destinations inside the current viewport, and animation frames advance from distance travelled so the feet do not cycle while the cat is stationary. The cat sleeps by default after docking beside the Whale Girl, wakes for an interaction, and lies down again afterward. Motion and sound can be disabled; sound starts muted.

Task Garden measures the complete page instead of assuming a fixed conversation size. A vine ring takes ten minutes of active task time to close around the responsive page edge and remains visible for thirty active minutes, which limits the display to three overlapping rings. Blue and pink flower heads attach without stems or gaps, bottom growth stays below the composer, and the center remains transparent and click-through.

Platform Worlds stores only the selected style in browser-local preferences. Its animation is intentionally quiet and respects reduced-motion preferences.

## Privacy

The plugins do not read message prose, Tool arguments, attachments, credentials, environment variables, or filesystem content. They do not append Session events, alter prompt assembly, call a model, emit telemetry, upload media, or make runtime network requests.

The only persisted plugin values are local viewing preferences such as cat coat, motion, sound, and platform-world style. Task progress is derived from already available Session summary and projection fields.

The public changeset contains application code and the generated runtime image or audio data required by the browser. It intentionally excludes raw model outputs, generation prompts and logs, user-supplied references, research footage, captured Sessions, local source paths, and discarded 3D experiments.

## Run from source

Prerequisites are Node.js `^22.19.0 || >=24.0.0` and pnpm `11.7.0`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

Open `http://127.0.0.1:3080`. The three active plugins are already present in the Web bundle configuration on this branch.

## Package references

- [Pocket Buddy package](../../../packages/client/ui-pocket-buddy/README.md)
- [Task Garden package](../../../packages/client/ui-task-garden/README.md)
- [Platform Worlds package](../../../packages/client/ui-platform-worlds/README.md)

## Asset and license notes

Repository code is licensed under [MIT](../../../LICENSE). The runtime character, flower, vine, and sound data in these packages was generated for this project and is distributed only as part of the implementation. Confirm the applicable model and deployment terms before republishing generated media as a separate asset pack.

No third-party reference image or source-video file is part of the public changeset.
