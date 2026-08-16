/** Responsive geometry for the task-garden frame and its floral perimeter. */

export type GardenBorderEdge =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left'

/** One normalized attachment point on the responsive rounded frame. */
export interface GardenBorderSlot {
  /** Stable clockwise progress from the caretaker-side start, in the half-open range [0, 1). */
  progress: number
  x: number
  y: number
  /** Rotation that points an upright flower into the usable frame. */
  angle: number
  edge: GardenBorderEdge
}

/** Measured presentation values derived from the current frame box. */
export interface ResponsiveGardenLayout {
  width: number
  height: number
  radius: number
  perimeter: number
  flowerSize: number
  gardenCapacity: number
  /** Left-edge junction reached by the short vine emerging from the caretaker. */
  start: { x: number; y: number }
  emitter: { x: number; y: number }
  slots: readonly GardenBorderSlot[]
}

const EMPTY_LAYOUT: ResponsiveGardenLayout = {
  width: 0,
  height: 0,
  radius: 0,
  perimeter: 0,
  flowerSize: 0,
  gardenCapacity: 0,
  start: { x: 0, y: 0 },
  emitter: { x: 0, y: 0 },
  slots: [],
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function safeDimension(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function inwardAngle(normalX: number, normalY: number): number {
  const angle = Math.atan2(normalX, -normalY) * 180 / Math.PI + 180
  return ((angle + 180) % 360 + 360) % 360 - 180
}

/**
 * Sample one clockwise point on a rounded rectangle.
 * @param width - Current frame width in CSS pixels.
 * @param height - Current frame height in CSS pixels.
 * @param radius - Effective circular corner radius in CSS pixels.
 * @param distance - Clockwise distance from the top-left straight segment.
 * @returns The sampled attachment point and inward flower rotation.
 */
export function pointOnRoundedGardenFrame(
  width: number,
  height: number,
  radius: number,
  distance: number,
): Omit<GardenBorderSlot, 'progress'> {
  const horizontal = Math.max(0, width - radius * 2)
  const vertical = Math.max(0, height - radius * 2)
  const corner = Math.PI * radius / 2
  const perimeter = horizontal * 2 + vertical * 2 + corner * 4
  let cursor = perimeter === 0 ? 0 : ((distance % perimeter) + perimeter) % perimeter

  if (cursor < horizontal) {
    return { x: radius + cursor, y: 0, angle: 180, edge: 'top' }
  }
  cursor -= horizontal
  if (cursor < corner) {
    const theta = -Math.PI / 2 + cursor / corner * Math.PI / 2
    const normalX = Math.cos(theta)
    const normalY = Math.sin(theta)
    return {
      x: width - radius + radius * normalX,
      y: radius + radius * normalY,
      angle: inwardAngle(normalX, normalY),
      edge: 'top-right',
    }
  }
  cursor -= corner
  if (cursor < vertical) {
    return { x: width, y: radius + cursor, angle: -90, edge: 'right' }
  }
  cursor -= vertical
  if (cursor < corner) {
    const theta = cursor / corner * Math.PI / 2
    const normalX = Math.cos(theta)
    const normalY = Math.sin(theta)
    return {
      x: width - radius + radius * normalX,
      y: height - radius + radius * normalY,
      angle: inwardAngle(normalX, normalY),
      edge: 'bottom-right',
    }
  }
  cursor -= corner
  if (cursor < horizontal) {
    return { x: width - radius - cursor, y: height, angle: 0, edge: 'bottom' }
  }
  cursor -= horizontal
  if (cursor < corner) {
    const theta = Math.PI / 2 + cursor / corner * Math.PI / 2
    const normalX = Math.cos(theta)
    const normalY = Math.sin(theta)
    return {
      x: radius + radius * normalX,
      y: height - radius + radius * normalY,
      angle: inwardAngle(normalX, normalY),
      edge: 'bottom-left',
    }
  }
  cursor -= corner
  if (cursor < vertical) {
    return { x: 0, y: height - radius - cursor, angle: 90, edge: 'left' }
  }
  cursor -= vertical
  const theta = Math.PI + cursor / corner * Math.PI / 2
  const normalX = Math.cos(theta)
  const normalY = Math.sin(theta)
  return {
    x: radius + radius * normalX,
    y: radius + radius * normalY,
    angle: inwardAngle(normalX, normalY),
    edge: 'top-left',
  }
}

/**
 * Derive flower density, perimeter slots, and scene anchors from a live frame box.
 * @param measuredWidth - Width reported by the garden frame's ResizeObserver.
 * @param measuredHeight - Height reported by the garden frame's ResizeObserver.
 * @returns A bounded responsive layout; invalid or empty boxes return no slots.
 */
export function deriveResponsiveGardenLayout(
  measuredWidth: number,
  measuredHeight: number,
): ResponsiveGardenLayout {
  const width = safeDimension(measuredWidth)
  const height = safeDimension(measuredHeight)
  if (width < 2 || height < 2) return EMPTY_LAYOUT

  const radius = Math.min(
    width / 2,
    height / 2,
    clamp(Math.min(width, height) * .11, 18, 46),
  )
  const perimeter = Math.max(0, (width - radius * 2) * 2 + (height - radius * 2) * 2 + Math.PI * radius * 2)
  // A vine segment is substantially wider than the former single-flower
  // marker, so fewer anchors create an intentional woven overlap instead of
  // a dense picket fence of repeated sprites.
  const targetSpacing = clamp(width * .11, 78, 128)
  const slotCount = clamp(Math.round(perimeter / targetSpacing), 12, 36)
  const flowerSize = clamp(Math.min(width * .044, height * .11), 20, 38)
  const gardenCapacity = clamp(Math.floor(width / Math.max(58, flowerSize * 1.7)), 5, 12)
  const startY = clamp(height - clamp(height * .16, 72, 116), radius, height - radius)
  const horizontal = Math.max(0, width - radius * 2)
  const vertical = Math.max(0, height - radius * 2)
  const corner = Math.PI * radius / 2
  const startDistance = horizontal + corner + vertical + corner + horizontal + corner
    + Math.max(0, height - radius - startY)
  const slots = Array.from({ length: slotCount }, (_, index) => {
    const progress = index / slotCount
    return {
      progress,
      ...pointOnRoundedGardenFrame(width, height, radius, startDistance + perimeter * progress),
    }
  })

  return {
    width,
    height,
    radius,
    perimeter,
    flowerSize,
    gardenCapacity,
    start: { x: 0, y: startY },
    emitter: {
      // Match the fixed lower-left caretaker's watering-can spout.  This is
      // also the inner endpoint of the short launcher vine, so water, flower
      // flights and perimeter growth share one visible origin at every size.
      x: clamp(width * .075, 66, 112),
      y: startY,
    },
    slots,
  }
}
