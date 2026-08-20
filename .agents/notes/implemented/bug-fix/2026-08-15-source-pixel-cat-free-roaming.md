# Agent Note: Complete-character cel cat with free roaming

Status: implemented

English | [中文](2026-08-15-source-pixel-cat-free-roaming.zh.md)

## Problem

The procedural 3D shell could not retain the approved Peach Tabby identity. Cutting limbs from one flattened 2D illustration also exposed missing occluded pixels as open seams, duplicated paws, and detached legs. Moving a side-view character along arbitrary diagonal routes made its bearing disagree with travel and look like floating.

## Decision

Peach Tabby uses complete-character animation cels. Side, toward-camera, and away-camera travel each have eight transparent full-body frames; the intact side frames are mirrored for rightward travel. Grooming, stretching, lying down, sleeping, waking, looking, click response, pouncing, and turning also use reviewed complete-character sequences. No runtime joint assembly exists in the active renderer.

Travel samples continuous pixel coordinates inside viewport-safe bounds and uses no waypoint graph. The actor advances linearly at 64 pixels per second, completing one eight-frame gait every 72 pixels. The route vector selects the closest authored left, right, toward-camera, or away-camera bearing, while paw prints use the same accumulated distance.

A direction change uses a whole-character transition and never deforms or separates the anatomy. A weighted action compiler combines compatible complete-character sequences without repeating recent actions, reuses seated transitions across adjacent grooming actions, and bounds one autonomous scene to eighteen seconds.

When work pauses or completes, free roaming yields to one direct route toward the Whale Girl. The cat lies down beside her and remains in a continuous sleeping hold by default. Interactions wake the cat, play in place, and return it to sleep; resumed work wakes it before random roaming restarts.

## Alternatives considered

**Keep refining the 2D cutout rig.** Rejected because pixels hidden behind the torso and legs do not exist; mask tuning cannot reconstruct reliable anatomy.

**Restore a three-frame whole-body loop.** Rejected because three contact frames cannot express lift, swing, and plant phases or cover front and rear travel.

**Use a fixed route graph.** Rejected because a finite connection set exposes repetition. Continuous random endpoints and per-frame linear integration remain the single source of motion truth.

**Keep a procedural 3D cat.** Rejected because the available mesh and materials could not preserve the approved illustrated identity. A 3D renderer also increased payload and tuning cost without improving the page-pet actions ordinary users notice.

## Consequences

Walking and expressive actions retain one character identity without detached anatomy or extra paws. Four authored bearings cover the main screen routes while gait remains distance-bound, and the docked sleep state gives paused or completed work a stable visual endpoint. New expressions require another reviewed complete-character sequence; the runtime will not imitate them with a cutout or procedural rig.
