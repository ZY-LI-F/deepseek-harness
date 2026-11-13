/** Persisted viewing preferences for the root-scoped Pocket Buddy entry. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** Supported palette variants for the shared 3D cat mesh. */
export const BUDDY_SKINS = ['peach-cat', 'sea-bun', 'night-jelly'] as const
/** Palette identifier persisted for the overlay actor. */
export type BuddySkin = typeof BUDDY_SKINS[number]

/** Persisted, user-controlled Pocket Buddy presentation preferences. */
export interface PocketBuddyState {
  skin: BuddySkin
  motion: boolean
  sound: boolean
}

type PocketBuddyActions = {
  selectSkin: (draft: PocketBuddyState, skin: BuddySkin) => void
  setMotion: (draft: PocketBuddyState, enabled: boolean) => void
  setSound: (draft: PocketBuddyState, enabled: boolean) => void
}

/**
 * Declare the single persistent preference store used by the overlay entry.
 *
 * @returns A slot-compatible store handle for skin, motion, and sound preferences.
 */
export function createPocketBuddyStore(): EngineStoreHandle<PocketBuddyState, PocketBuddyActions> {
  return defineStore({
    init: (): PocketBuddyState => ({ skin: 'peach-cat', motion: true, sound: false }),
    persist: 'dsh.ui-pocket-buddy',
    actions: {
      selectSkin: (draft, skin: BuddySkin) => { draft.skin = skin },
      setMotion: (draft, enabled: boolean) => { draft.motion = enabled },
      setSound: (draft, enabled: boolean) => { draft.sound = enabled },
    },
  })
}
