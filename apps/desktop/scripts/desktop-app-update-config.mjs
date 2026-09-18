/**
 * Write the update configuration electron-updater reads from a packaged macOS application.
 *
 * electron-builder registers its own `afterPack` hook that writes
 * `app-update.yml` into the packed application, but that hook returns early
 * unless the pack targets include `dmg` or `zip`. The macOS release builds the
 * application with `--dir`, whose target list is empty, and then packs both
 * artifacts from `--prepackaged` copies, where `doPack` returns before any
 * `afterPack` hook runs. Without this writer the shipped application carries no
 * feed at all: `autoUpdater.checkForUpdates()` rejects while reading the
 * missing file and never issues a request.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dump } from 'js-yaml'

/**
 * Build the fields electron-builder writes into `app-update.yml`.
 * @param {{ publicUrl: string, channel: string | null, updaterCacheDirName: string }} values - Resolved feed values.
 * @returns {Record<string, string>} Update configuration for the packaged application.
 */
export function desktopAppUpdateConfig({ publicUrl, channel, updaterCacheDirName }) {
  return {
    provider: 'generic',
    url: publicUrl,
    ...(channel === null ? {} : { channel }),
    updaterCacheDirName,
  }
}

/**
 * Write `app-update.yml` into one packed macOS application bundle.
 *
 * electron-builder signs the bundle after every `afterPack` hook returns, so
 * the file is covered by the signature the notarization lanes copy and staple.
 * @param {object} context - electron-builder `afterPack` context.
 * @param {object} context.packager - Packager owning the build.
 * @param {string} context.appOutDir - Unpacked application directory.
 * @param {{ publicUrl: string }} update - Resolved updater configuration.
 * @returns {Promise<void>}
 */
export async function writeDesktopAppUpdateConfig(context, update) {
  const appInfo = context.packager.appInfo
  const config = desktopAppUpdateConfig({
    publicUrl: update.publicUrl,
    channel: appInfo.channel,
    updaterCacheDirName: appInfo.updaterCacheDirName,
  })
  await writeFile(join(context.packager.getResourcesDir(context.appOutDir), 'app-update.yml'), dump(config))
}
