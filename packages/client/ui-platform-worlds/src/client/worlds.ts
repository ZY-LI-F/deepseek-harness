/** Pure world definitions and the tiny persisted style runtime shared by both plugin seats. */

export const PLATFORM_WORLD_STYLES = ['cloud-harbor', 'candy-gears', 'moon-coral'] as const
/** Selectable generated-world identifiers. */
export type PlatformWorldStyle = typeof PLATFORM_WORLD_STYLES[number]

/** Visual depth and collectible metadata for one generated world. */
export interface WorldDefinition {
  style: PlatformWorldStyle
  depth: '2.5D' | '3D'
  collectible: 'wind-bell' | 'sugar-spark' | 'moon-pearl'
}

/** Ordered metadata used by the selector and backdrop renderer. */
export const WORLD_DEFINITIONS: readonly WorldDefinition[] = Object.freeze([
  { style: 'cloud-harbor', depth: '2.5D', collectible: 'wind-bell' },
  { style: 'candy-gears', depth: '3D', collectible: 'sugar-spark' },
  { style: 'moon-coral', depth: '2.5D', collectible: 'moon-pearl' },
])

/** Stable observable selection exposed by the browser runtime. */
export interface PlatformWorldSnapshot {
  style: PlatformWorldStyle
}

type StorageFace = Pick<Storage, 'getItem' | 'setItem'>
type Listener = () => void

const STORAGE_KEY = 'dsh.ui-platform-worlds.style'
const DEFAULT_STYLE: PlatformWorldStyle = 'cloud-harbor'

function isPlatformWorldStyle(value: string | null): value is PlatformWorldStyle {
  return value !== null && (PLATFORM_WORLD_STYLES as readonly string[]).includes(value)
}

function browserStorage(): StorageFace | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage
  } catch {
    return undefined
  }
}

/** One stable observable snapshot; invalid or inaccessible browser storage safely falls back. */
export class PlatformWorldRuntime {
  private snapshot: PlatformWorldSnapshot
  private readonly listeners = new Set<Listener>()

  constructor(private readonly storage: StorageFace | undefined = browserStorage()) {
    let persisted: string | null = null
    try {
      persisted = storage?.getItem(STORAGE_KEY) ?? null
    } catch {
      // Private modes may deny localStorage even after the object was resolved.
    }
    this.snapshot = { style: isPlatformWorldStyle(persisted) ? persisted : DEFAULT_STYLE }
  }

  /** Return the current stable world selection snapshot. */
  getSnapshot = (): PlatformWorldSnapshot => this.snapshot

  /** Subscribe to selection changes and return an unsubscribe callback. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Persist and publish a different world style.
   * @param style - Valid style selected by the user.
   */
  setStyle(style: PlatformWorldStyle): void {
    if (style === this.snapshot.style) return
    this.snapshot = { style }
    try {
      this.storage?.setItem(STORAGE_KEY, style)
    } catch {
      // The live selection still works when persistence is unavailable.
    }
    for (const listener of this.listeners) listener()
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    platformWorlds: PlatformWorldRuntime
  }
}
