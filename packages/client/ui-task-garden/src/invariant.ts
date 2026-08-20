/** Package-owned invariant companion for the Task Garden client plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-task-garden'
export const name = 'client-ui-task-garden-invariant'
export const inject = ['invariants']

/** No runtime invariant: one read-only projection entry is disposed with its fiber. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
