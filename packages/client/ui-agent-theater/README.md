# @deepseek-ai/dsh-client-ui-agent-theater

English | [中文](README.zh.md)

Agent Theater is an unmounted browser presentation experiment. When a deployment explicitly adds it to the Web bundle, it contributes a miniature assembly office to `conversation.input.dock`: an original blue whale-girl crosses a rail with a hammer and reveals `DEEPSEEK` one letter at a time. An error deliberately shows `DEEPDEEK` with a `干杯！` toast.

Its pure scene model translates existing Session facts into a small set of visual states for idle, thinking, terminal work, Web work, generic tools, approval, error, and completion. Tool classification uses stable name families and unknown names fall back to the generic scene. The component reads standard Session hooks, never scans the log, and keeps its hammer cadence and completion timing locally. Sound cues use Pocket Buddy's opt-in audio service and remain muted by default.

The standard Web profile does not mount this package. Task Garden owns the active caretaker experience, so ordinary users do not see two competing progress scenes.

## Model Experience

### Browser-only read model

#### What the model sees

Nothing. Agent Theater reads existing browser projections only when explicitly mounted at `conversation.input.dock` and registers no prompt, context, Tool schema, or Tool result.

#### Token effect

None. The package does not add, remove, or reorder model request tokens.

#### KV Cache effect

None. The package never participates in prompt assembly.

## Known Limitations and Deferred Work

- The standard Web profile leaves this package unmounted.
- Tool classification is name-based; deployment-specific names outside the known families use the generic tool scene.
- The stage shows only the current root running call; nested Code Mode calls do not create separate actors.
- `DEEPDEEK` is an intentional error-state joke and never appears in a successful state.
