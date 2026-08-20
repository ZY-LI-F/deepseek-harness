/** Package-owned invariant companion for the Platform Worlds client plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-platform-worlds'
export const name = 'client-ui-platform-worlds-invariant'
export const inject = ['invariants']

/** No runtime invariant: the two read-only visual entries share one fiber-owned runtime. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
