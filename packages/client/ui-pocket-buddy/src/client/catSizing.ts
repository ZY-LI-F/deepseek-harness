/** Natural square canvas used by every authored Peach Cat cel. */
export const CAT_SOURCE_CANVAS_EDGE_PX = 384

/** Stable CSS box keeps absolute character sizing independent of the actor viewport. */
export const CAT_RENDER_BOX_EDGE_PX = 198

/** The cat silhouette, not its transparent canvas, must fit this longest CSS edge. */
export const CAT_TARGET_VISUAL_EDGE_PX = 100

const CAT_REFERENCE_VISUAL_EDGE_PX = 350
const CAT_TARGET_SOURCE_EDGE_PX = (
  CAT_TARGET_VISUAL_EDGE_PX * CAT_SOURCE_CANVAS_EDGE_PX / CAT_RENDER_BOX_EDGE_PX
)

/** Fallback scale for raster skins whose reviewed silhouette uses the reference edge. */
export const CAT_REFERENCE_DISPLAY_SCALE = CAT_TARGET_SOURCE_EDGE_PX / CAT_REFERENCE_VISUAL_EDGE_PX

/**
 * Normalize one measured alpha silhouette to exactly the shared visual target.
 * @param frameVisualEdgePx - Longest non-transparent edge in source pixels.
 * @param sourceCanvasLongestEdgePx - Longest edge of the source canvas in pixels.
 * @returns CSS scale that preserves the shared one-hundred-pixel visual target.
 */
export function normalizeCatFrameScale(
  frameVisualEdgePx: number,
  sourceCanvasLongestEdgePx = CAT_SOURCE_CANVAS_EDGE_PX,
): number {
  if (!Number.isFinite(frameVisualEdgePx) || frameVisualEdgePx <= 0) {
    throw new Error(`Invalid cat visual edge: ${frameVisualEdgePx}`)
  }
  if (!Number.isFinite(sourceCanvasLongestEdgePx) || sourceCanvasLongestEdgePx <= 0) {
    throw new Error(`Invalid cat source canvas edge: ${sourceCanvasLongestEdgePx}`)
  }
  return (
    CAT_TARGET_VISUAL_EDGE_PX * sourceCanvasLongestEdgePx
    / CAT_RENDER_BOX_EDGE_PX / frameVisualEdgePx
  )
}
