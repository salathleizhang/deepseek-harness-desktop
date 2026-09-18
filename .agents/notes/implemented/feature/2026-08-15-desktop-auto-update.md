# Agent Note: Desktop auto-update with electron-updater

Status: implemented

English | [中文](2026-08-15-desktop-auto-update.zh.md)

## Problem

The desktop shell ships signed/notarized macOS and NSIS installers, but there is no in-app upgrade path: a user must notice a release and re-download. The app bundles a Node runtime and a harness closure, so an update must replace the whole app payload atomically, never just the shell or just the harness.

## Decision

Auto-update runs in the Electron main process over `electron-updater`, fed from the GitHub Releases feed `salathleizhang/deepseek-harness-desktop`. electron-builder's `publish` config writes the update metadata — `latest-mac.yml` on macOS, `latest.yml` on Windows — even under `--publish never`, and the release workflow uploads that metadata alongside the installers.

The flow:

- On boot, only when packaged, an `UpdateController` folds electron-updater events into a pure status reducer (`update-status.ts`) with `autoDownload: true` and `autoInstallOnAppQuit: false`, then re-checks on a configurable interval (`DSH_DESKTOP_UPDATE_INTERVAL_MS`, default four hours).
- The download runs in the background. Installation is explicit: the shell's quit path calls `autoUpdater.quitAndInstall()` after Host disposal when a download has completed, so an update never interrupts a running session. The renderer's "install now" routes through the same graceful quit.
- A narrow preload bridge exposes status read/subscribe plus check/install. The browser surface is a new `@deepseek-ai/dsh-client-ui-update` package that registers one `sidebar.footer.action` entry — the footer list directly above Settings — rendering a badge for `available`/`downloading`/`downloaded` and nothing otherwise, including when the bridge is absent.

macOS adds a `zip` target for the updater; the `dmg` stays the one-click manual installer. Payload filenames carry no version, so the `releases/latest/download/…` links stay stable while each release's channel metadata self-references its own payloads: `desktopArtifactBaseName` owns the stem, `artifactName` expands to the same name, and the release workflow and the upload plan derive their expected filenames from it. The packaged application carries its `app-update.yml`, which `desktop-app-update-config.mjs` writes from an `afterPack` hook because the macOS release packs with `--dir` — an empty target list makes electron-builder's own writer skip the file — and then packs both artifacts from `--prepackaged` copies.

## Alternatives considered

**Electron's built-in `autoUpdater`.** Rejected: it only speaks Squirrel.Mac/Squirrel.Windows against a dedicated update server and cannot read electron-builder's `latest.yml`/`latest-mac.yml` from GitHub Releases. `electron-updater` is the electron-builder-native client and needs no separate server.

**A dedicated update server (S3 or `generic` provider).** Rejected as the default: GitHub Releases is already the distribution source, and a second host adds credentials and a failure mode without user-visible benefit. The feed config stays swappable, but the generic provider is not the shipped value.

**Silent auto-restart on download.** Rejected: the harness child may hold a running session or unsaved work, which a silent restart would interrupt. Downloading in the background and installing on quit keeps the update invisible until the user is already leaving.

## Consequences

- The app payload — shell plus Node runtime plus harness closure — updates atomically, satisfying the one-atomic-payload rule from the desktop-client design.
- The status reducer and store are unit-tested without Electron; the desktop shell suites and the `test:gui` client suites cover the wiring and the badge.
- Windows installers remain unsigned, so a Windows update may surface a SmartScreen prompt until an Authenticode certificate is added; this is documented, not blocked.
- Development runs have no feed: the updater exists only when `app.isPackaged`, and the bridge reports `unsupported`, so the badge renders nothing outside a packaged desktop build.
- The preload gains a second narrow surface (the update bridge); it stays read-status plus check/install verbs and re-exposes no privileged Host method.

## Related

- [Electron desktop client design](../../proposed/feature/2026-08-13-electron-desktop-client.md) — the parent proposal; this note implements its auto-update portion, which said "自动更新使用 electron-updater 对接发布源".
