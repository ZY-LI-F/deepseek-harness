/** Package-owned invariant companion for the Pocket Buddy client plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-pocket-buddy'

/** Cordis companion plugin name. */
export const name = 'client-ui-pocket-buddy-invariant'
/** Service required before package ownership can be reserved. */
export const inject = ['invariants']

/**
 * No runtime invariant: the Module reads an existing global snapshot, owns one
 * persisted viewing store, and contributes one disposable overlay entry.
 */
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
