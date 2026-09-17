# Releasing the Desktop application

English | [中文](releasing-the-desktop-app.zh.md)

The Desktop application is a member of the `dsh` release family: it carries the workspace root's version and publishes from the `dsh-v*` tag. [Electron desktop packaging and updates](../../.agents/notes/implemented/architecture/2026-08-25-electron-desktop-packaging-and-updates.md) owns the design rationale, and the [Desktop README](../../apps/desktop/README.md) owns the packaging, upload, and credential configuration.

## The update-feed naming contract

A packaged Desktop build embeds one generic-provider URL — `https://download.deepseek.com/_/harness/desktop/stable/<target>/`, where `<target>` is `mac-arm64`, `mac-x64`, or `win-x64` — and electron-updater requests the metadata file whose name it derives from the packaged version. That name is fixed by the version and cannot be chosen:

| Packaged version | macOS | Windows |
|---|---|---|
| `0.1.0` | `latest-mac.yml` | `latest.yml` |
| `0.1.0-rc.21` | `rc-mac.yml` | `rc.yml` |

The channel is the first semantic-version prerelease identifier (`rc`, `alpha`, `beta`); macOS appends `-mac` and Windows appends nothing. [`desktopUpdateMetadataFilename`](../../apps/desktop/scripts/desktop-auto-update-environment.mjs) computes the name, and `apps/desktop/tests/desktop-auto-update-environment.spec.ts` pins it.

The metadata must sit beside the payloads it names, under the filenames electron-builder emitted: `deepseek-harness-<version>-mac-<arch>.zip` plus its `.blockmap` for the macOS updater payload, and `deepseek-harness-<version>-win-x64.exe` for Windows, whose NSIS blockmap is embedded. The metadata carries each payload's size and SHA-512, and the upload plan rejects a mismatch before it reads credentials.

A renamed, re-cased, or misplaced metadata file fails silently: the client's check receives 404, the automatic check reports nothing, and only the application menu's Check for Updates surfaces an error. GitHub Releases is the manual-download mirror, not the update source, so assets uploaded there never make an update visible. Unsigned Windows builds set `publish: null` and therefore have no feed and no metadata file.

## Steps

1. Land the change on `master`.
2. Bump the family version with `pnpm run release:dsh <version>`, then push `master`.
3. Tag and push the release: `git tag dsh-v<version>` and `git push origin dsh-v<version>`.
4. Dispatch the Release (Desktop) workflow from that tag with `publish: true`; it builds the signed macOS installer and the Windows installer and creates the GitHub Release.
5. Package the target with `DSH_DESKTOP_AUTO_UPDATE_ENV=production`, then upload it with `pnpm run upload:mac:arm64`, `upload:mac:x64`, or `upload:win:x64` under the production COS bucket and credential pair.
6. Verify the feed before announcing the release.

The release workflow publishes only its own artifacts; it never writes to the update origin. The upload command requires the target's completion record (`mac-arm64-release.json`) and the artifacts that record describes, so a release is uploaded from the machine that packaged it, or from CI once the record travels with the artifacts.

## Verify the feed

Request the exact file the client requests, for the released version's channel:

```sh
curl -fsS "https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/rc-mac.yml"
```

The upload succeeded only when `version` equals the released version and every `files[].url` names a payload uploaded beside it. A 404 means step 5 did not run: no client shows an update badge, and Check for Updates reports an error.
