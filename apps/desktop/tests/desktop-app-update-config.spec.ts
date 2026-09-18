/** Exercise the macOS feed file the release writes before electron-builder signs the bundle. */

import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { load } from 'js-yaml'
import {
  desktopAppUpdateConfig,
  writeDesktopAppUpdateConfig,
} from '../scripts/desktop-app-update-config.mjs'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

async function fixture(channel: string | null) {
  const root = await mkdtemp(join(tmpdir(), 'desktop-app-update-config-'))
  temporaryDirectories.push(root)
  const appOutDir = join(root, 'mac-arm64', 'DeepSeek Harness.app')
  await mkdir(join(appOutDir, 'Contents', 'Resources'), { recursive: true })
  return {
    appOutDir,
    context: {
      appOutDir,
      packager: {
        appInfo: { channel, updaterCacheDirName: '@deepseek-aidsh-desktop-updater' },
        getResourcesDir: (directory: string) => join(directory, 'Contents', 'Resources'),
      },
    },
  }
}

describe('desktop app update configuration', () => {
  it('names the generic provider and the version channel', () => {
    expect(desktopAppUpdateConfig({
      publicUrl: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
      channel: 'rc',
      updaterCacheDirName: 'desktop-updater',
    })).toEqual({
      provider: 'generic',
      url: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
      channel: 'rc',
      updaterCacheDirName: 'desktop-updater',
    })
  })

  it('omits the channel for a stable version', () => {
    expect(desktopAppUpdateConfig({
      publicUrl: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
      channel: null,
      updaterCacheDirName: 'desktop-updater',
    })).toEqual({
      provider: 'generic',
      url: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
      updaterCacheDirName: 'desktop-updater',
    })
  })

  it('writes the feed file into the packed application resources', async () => {
    const { appOutDir, context } = await fixture('rc')
    await writeDesktopAppUpdateConfig(context, {
      publicUrl: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
    })
    const written = await readFile(join(appOutDir, 'Contents', 'Resources', 'app-update.yml'), 'utf8')
    expect(load(written)).toEqual({
      provider: 'generic',
      url: 'https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/',
      channel: 'rc',
      updaterCacheDirName: '@deepseek-aidsh-desktop-updater',
    })
  })
})
