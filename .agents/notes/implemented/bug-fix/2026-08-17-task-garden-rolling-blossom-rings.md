# Agent Note: Task Garden event blossoms use rolling rings

Status: implemented

English | [中文](2026-08-17-task-garden-rolling-blossom-rings.zh.md)

## Problem

Task Garden assigned each landed event blossom to a bounded perimeter index. Once the first ring reached its final bottom-right slot, every later Tool call or Step reused that slot. The fixed tail cap limited memory, but it did not provide another visible ring and could discard a partial, unrelated portion of the decoration.

## Decision

Every event blossom carries an absolute sequence number. The responsive slot count divides that sequence into a zero-based ring ordinal and a slot within the ring. Ring ordinals rotate through three visual layers; each layer moves inward by 1.22 times the current responsive flower size, slightly more than the displayed blossom diameter.

The current ring and its two predecessors remain in state. When the fourth ring starts, it reuses the first layer and the first ring is removed. The same rolling rule continues for later rings, so layer reuse never leaves two generations at identical coordinates. Flights and settled blossoms derive their targets from the same sequence mapping, and a resize recomputes both placement and retention from the new responsive slot count.

## Alternatives considered

**Keep clamping to the final slot.** Rejected because it makes continuing progress look stuck and repeatedly covers the same bottom-right flower.

**Retain every completed ring.** Rejected because long tasks would accumulate unbounded image nodes and increasingly obscure the page.

**Keep only the latest fixed number of individual blossoms.** Rejected because a count cap can cut through a ring and does not express which visual layer may be safely reused.

## Consequences

Event blossoms now fill the first, second, and third rings in order. Starting the fourth removes the first ring before reusing its coordinates, while the second and third remain visible. At the largest responsive density, the overlay retains at most 108 settled event blossoms. Focused component coverage drives four complete rings and verifies layer separation, first-ring retirement, and the bounded three-ring result.
