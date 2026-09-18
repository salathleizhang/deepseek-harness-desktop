# Agent Note: tag-triggered desktop release workflow for the Electron installers

Status: implemented

English | [中文](2026-08-13-desktop-release-workflow.zh.md)

## Problem

The [Electron desktop shell](../../proposed/feature/2026-08-13-electron-desktop-client.md) shipped with `electron-builder` packaging (`dist:mac` → a `.dmg`, `dist:win` → an NSIS installer) but no CI: its README listed "a dedicated packaging/CI job is a follow-up". A desktop release therefore had to be built on a developer machine and uploaded by hand, and no tag could reproduce a release's installers.

Two platform facts shaped the workflow. First, the desktop app is a member of the `dsh` release family ([npm release sequences](2026-08-10-npm-release-sequences.md)): it shares that family's single version and the `dsh-v*` tag, so a desktop release reuses the same tag rather than minting a second version line. Second, `prepare-runtime` extracted the Windows Node zip with `unzip`, a binary that does not exist on Windows runners, so a Windows CI build could not stage the self-contained runtime it was packaging.

## Decision

`.github/workflows/desktop-release.yml` builds the installers on two hosted runners and publishes them as a GitHub Release:

- **macOS** (`macos-14`): `dist:mac` stages the self-contained runtime and builds the arm64 `.dmg`.
- **Windows** (`windows-2025`): `dist:win` builds the x64 NSIS installer under native `pwsh`.
- **Release** (`ubuntu-latest`): a `dsh-v*` tag push, or a manual dispatch with `publish: true` from such a tag, attaches both installers to a GitHub Release titled `DeepSeek Harness Desktop <version>` via `gh release create`.

`electron-builder.config.mjs` sets a version-free, arch-suffixed `artifactName`, so the macOS and Windows installers are unambiguous on the release page and the `releases/latest/download/…` links stay stable ([Desktop auto-update](../feature/2026-08-15-desktop-auto-update.md)). It also pins the macOS `identity` (without the cert-type prefix) and `notarize: true`, and sets `npmRebuild: false` because the shell has no in-process native dependencies; the workflow imports the `.p12` into a scratch keychain and notarizes with `notarytool` using an App Store Connect API key from repository secrets.

`prepare-runtime` extracts every archive with `tar -xf` (bsdtar reads both tarballs and zip archives, so no `unzip` dependency), names the Windows download `win` rather than `win32`, stages only the host arch's single Node runtime and [prunes the closure](2026-08-14-prune-desktop-runtime-bundle.md), and spawns `pnpm` under a shell on Windows so `pnpm.cmd` runs.

The macOS installer is signed and notarized; the Windows installer stays unsigned until an Authenticode certificate is added, and the auto-update feed stays deferred.

## Alternatives considered

**`softprops/action-gh-release` for the release step.** Rejected in favor of `gh release create`: the CLI is already on hosted Ubuntu runners and needs no new third-party action, and release creation is a single command rather than a maintained dependency.

**Cross-build the Windows installer on the macOS runner.** Rejected: electron-builder runs the generated NSIS installer under wine on non-Windows hosts to extract the uninstaller, so a macOS build would still require wine; a native Windows runner avoids it.

**Install `unzip` on the Windows runner via Chocolatey instead of changing `prepare-runtime`.** Rejected: it papers over a latent cross-platform bug in the script and adds a slow, flaky install step; using `tar -xf` fixes the script for every machine that packages the app.

**A shared build job whose artifacts feed both platform jobs.** Rejected for the first version: packaging needs the repo built (`pnpm run build`) before `prepare-runtime` can deploy the harness closure, and sharing the whole built workspace as an artifact is more moving parts than two parallel native builds.

## Consequences

- **A desktop release is reproducible from a tag.** Pushing `dsh-v0.1.0-rc.5` yields the macOS arm64 `.dmg` and the Windows installer attached to a GitHub Release, with no developer machine in the loop.
- **A macOS x64 installer is deferred.** Cross-building it on the arm64 runner would deploy the harness closure's native dependencies (koffi, node-pty) as arm64 binaries; shipping a correct x64 build needs a native x64 host or cross-compiled natives.
- **Each platform job runs a full repo build.** This is slower than one shared build, but it keeps packaging native per platform and matches how `prepare-runtime` deploys the harness closure from a built workspace.
- **Only macOS is signed and notarized.** Windows users still see the SmartScreen warning until an Authenticode certificate is added, and signing on both platforms is a prerequisite for shipping the auto-update feed.
