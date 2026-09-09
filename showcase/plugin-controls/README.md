---
description: "Enable and disable installed DSH extensions from the Web settings page while preserving their configuration."
kind: "package-bundle"
---

# @deepseek-ai/dsh-plugin-controls

English | [中文](README.zh.md)

## Summary

Open Settings → Plugins → Plugin controls to switch installed extensions on or off. A switch preserves the plugin's configuration, model keys and sessions. Host changes follow the profile's patch reload policy; reload the browser page to update its plugin interfaces. The management entry stays enabled so a disabled feature can be enabled again.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

The existing Web profile has this bundle installed through `dsh plugin --profile web add`, with this local directory as the argument. Its [patch](cordis.patch.yml) inserts `plugin-controls`, selects the `web` profile, and sets an 8000 ms runtime-settlement timeout. It lists dependency-installed bundle entries and explicit local insert entries, including `oh-story` and `generative-ui`; it does not expose core application entries.

Finish or stop running tasks before changing a switch. Wait for the saved status, then press “Reload page to update plugin interfaces.” The normal Web profile applies its Host patch live; a startup-only deployment needs a service restart. A failure keeps the observed switch state and displays the reason. Refresh the list if another settings page changed the patch. Disabling does not uninstall a package or delete its data.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

[`host.mjs`](host.mjs) exposes the `/plugin-controls` channel through DSH Connection, which owns HTTP authentication, origin checks and request correlation. The `list` and `set-enabled` endpoints read Loader entries and modify only a discovered extension's `disabled` override. The manager and unknown entry ids are rejected. Running agents prevent a change.

[`patch-store.mjs`](patch-store.mjs) edits the YAML document tree, preserving comments, other fields and unevaluated `!!js` expressions. A SHA-256 revision rejects stale submissions; a lock serializes this manager's writers, and replacement uses a same-directory temporary file and atomic rename. Each successful attempt keeps the previous text under `plugin-control-backups` in the profile directory. A conflicting external edit is rejected before replacement. No keys are read or returned. [`entry.tsx`](entry.tsx) registers an independent settings tab, so disabling the Generative UI bundle cannot remove the re-enable control.

</details>

-----

<a id="model-experience"></a>
## Model Experience

This settings bundle contributes no model tool or prompt. A toggle changes the native tools and prompt contributions of the selected extension through Cordis lifecycle disposal and activation.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

Controls target the profile named in the bundle configuration. The browser's initial plugin graph changes on page reload, not on a Host patch update alone. The interface does not install, upgrade or remove packages, change dependency topology, or edit core services. An uncoordinated external filesystem writer is not covered by the manager's lock. Backups are retained for manual recovery; no automatic retention cleanup or rollback is performed.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

From this directory, build with `../../node_modules/.bin/tsdown` and test with `node --test patch-store.test.mjs`. The [native Generative UI guide](../generative-ui/native/README.md) describes the companion bundle. Real Web tests cover disabling/re-enabling, refresh persistence, the protected manager and rejection while a question is waiting.

</details>
