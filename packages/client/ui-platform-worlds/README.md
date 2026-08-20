# @deepseek-ai/dsh-client-ui-platform-worlds

English | [中文](README.zh.md)

Platform Worlds adds three original side-scrolling tableaux to active Harness Sessions. A compact selector in `conversation.session.header.actions` controls a quiet, non-interactive backdrop in `conversation.viewport.background`. One fiber-owned `PlatformWorldRuntime` keeps the selector and backdrop synchronized and stores the selected style in browser-local preferences.

## Worlds

- **Cloud Harbor / 云港跳岛** uses floating docks, sails, and wind bells in a 2.5D sky route.
- **Candy Gearworks / 糖果齿轮城** uses an isometric candy workshop with slowly turning gears.
- **Moonlit Coral Bay / 月光珊瑚湾** uses a 2.5D reef with pearls and drifting jellyfish.

The original starling scout hops only while the current Session is running. Every backdrop is click-through, uses Harness theme tokens, preserves transcript contrast, and respects reduced-motion preferences. Godot can reproduce the authoring composition, but the browser package ships only its lightweight Web rendition and has no Godot runtime dependency.

## Model Experience

### Browser-only read model

#### What the model sees

Nothing. Platform Worlds reads only the current Session's `running` flag and a browser-local style preference; it registers no prompt, context, Tool schema, or Tool result.

#### Token effect

None. The package does not add, remove, or reorder model request tokens.

#### KV Cache effect

None. The package never participates in prompt assembly.

## Known Limitations and Deferred Work

- The tableaux are ambient backgrounds rather than playable platform games.
- Style persistence is browser-local and does not synchronize between devices.
- Background motion stays intentionally subtle so conversation readability takes priority.
- Godot is an authoring option, not a dependency or embedded player in the Web package.
