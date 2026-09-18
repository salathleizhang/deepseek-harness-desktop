/** Resolved feed values electron-builder records for the packaged application. */
export interface DesktopAppUpdateConfigValues {
  readonly publicUrl: string
  readonly channel: string | null
  readonly updaterCacheDirName: string
}

/** electron-builder `afterPack` context locating the packed application's resources. */
export interface DesktopAfterPackContext {
  readonly appOutDir: string
  readonly packager: {
    readonly appInfo: {
      readonly channel: string | null
      readonly updaterCacheDirName: string
    }
    getResourcesDir(appOutDir: string): string
  }
}

/**
 * Build the fields electron-builder writes into `app-update.yml`.
 * @param values - Resolved feed values.
 * @returns Update configuration for the packaged application.
 */
export function desktopAppUpdateConfig(values: DesktopAppUpdateConfigValues): Record<string, string>

/**
 * Write `app-update.yml` into one packed macOS application bundle.
 * @param context - electron-builder `afterPack` context.
 * @param update - Resolved updater configuration.
 * @returns Resolves after the file is written.
 */
export function writeDesktopAppUpdateConfig(
  context: DesktopAfterPackContext,
  update: { readonly publicUrl: string },
): Promise<void>
