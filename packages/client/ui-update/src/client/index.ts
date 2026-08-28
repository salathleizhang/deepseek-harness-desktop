/**
 * Desktop auto-update footer action, browser half: registers an update badge
 * beside the settings trigger when the Electron preload bridge is present, and
 * nothing in a plain browser. The badge surfaces `available` / `downloading` /
 * `downloaded`; the `downloaded` click routes a graceful quit that installs on
 * the way out. Export discipline: packages/client/AGENTS.md.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the sidebar's SlotMap merge (the `sidebar.footer.action` entry).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { readUpdateBridge } from './desktop-bridge.ts'
import { createUpdateStatusSource } from './status-source.ts'
import { UpdateFooterAction } from './UpdateFooterAction.tsx'
import type { UpdateFooterActionFace } from './slots.ts'
import { en, zh, type UpdateKey } from './locales.ts'

export type { UpdateFooterActionFace } from './slots.ts'
export type { UpdateFooterActionProps } from './UpdateFooterAction.tsx'
export type { UpdateKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The update footer badge copy. */
    update: UpdateKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'update'

/** Required services: the slot registry and the badge's copy. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the `update` dictionaries, follow the desktop
 * bridge, and mount the footer badge once `sidebar.footer.action` is declared.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const bridge = readUpdateBridge()
  if (bridge === null) return

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-update: dictionaries')

  const source = createUpdateStatusSource(bridge)
  ctx.effect(() => {
    source.start()
    return () => { source.dispose() }
  }, 'ui-update: status source')

  const face = (): UpdateFooterActionFace => ({
    hooks: { status: source },
    onInstall: () => { void bridge.install() },
  })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'update',
    // Above the Cordis plugin panel, closest to the Settings trigger below.
    order: 0,
    locale: NS,
    inject: face,
  }, UpdateFooterAction))
}
