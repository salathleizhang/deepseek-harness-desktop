/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-session-turn-outline`.
 * @module @deepseek-ai/dsh-session-turn-outline/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-session-turn-outline'

/** Cordis companion plugin name. */
export const name = 'session-turn-outline-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns a single pure projection fold whose
 * wire payload is schema-validated by the projection registry at every
 * snapshot and change-feed emission (including the strictly-increasing turn
 * order the fold maintains), and the event relations the fold relies on
 * (host-assigned monotonic turn numbers on `turn/start`, the turn's prompt
 * `user/message` logged after its boundary) are owned and runtime-checked by
 * dsh-agent-loop and the session surface, not here.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
