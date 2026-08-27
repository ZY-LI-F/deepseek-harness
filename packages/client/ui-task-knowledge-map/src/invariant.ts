/** Package-owned invariant companion for the Task Knowledge Map client plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-task-knowledge-map'
export const name = 'client-ui-task-knowledge-map-invariant'
export const inject = ['invariants']

/** No runtime invariant: the plugin is a read-only projection over client snapshots. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
