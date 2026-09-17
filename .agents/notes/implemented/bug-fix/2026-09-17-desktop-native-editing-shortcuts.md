# Agent Note: Restore native editing shortcuts in the Desktop application menu

Status: implemented

English | [中文](2026-09-17-desktop-native-editing-shortcuts.zh.md)

## Problem

The Desktop shell replaces Electron's default application menu with a template that holds only the application submenu — Desktop Plugins, Check for Updates, and Quit. macOS delivers the standard editing gestures (Cmd+C, Cmd+V, Cmd+X, Cmd+A, Cmd+Z) to a window as menu key equivalents, so a template without matching items leaves those keys unhandled before the renderer receives them. No `copy`, `cut`, or `paste` event reached the web client, which made the composer inert: the Lexical plain-text `COPY_COMMAND`/`PASTE_COMMAND` handlers and every other text surface in the window depend on those DOM events. Windows and Linux were unaffected because Chromium's renderer handles Ctrl+C/Ctrl+V without a menu item.

## Decision

The application menu template in `apps/desktop/src/main.ts` carries a second, locale-labeled Edit submenu whose items use the Electron roles `undo`, `redo`, `cut`, `copy`, `paste`, and `selectAll`. The roles supply the platform accelerators and bind each item to the focused window's editing action; the labels come from the existing Desktop dictionaries (`editMenu`, `undoMenu`, `redoMenu`, `cutMenu`, `copyMenu`, `pasteMenu`, `selectAllMenu`) so the menu remains under the locale contract the [Desktop packaging decision](../architecture/2026-08-25-electron-desktop-packaging-and-updates.md) records. The application submenu is unchanged, and the plugin manager therefore stays reachable from the menu during startup and recovery.

## Alternatives considered

**One `role: 'editMenu'` item.** Electron expands it into the complete standard Edit menu, but that menu carries Electron's own labels instead of the Desktop dictionary, and its item set is fixed. The explicit items keep shell copy locale-owned.

**Reinstall Electron's default menu and move Desktop Plugins elsewhere.** The default menu restores the editing roles, but it drops the plugin manager and the update check, which must remain reachable while the renderer is still on the startup or recovery page. Moving them into the renderer makes them unavailable exactly when the client cannot boot.

**Synthesize copy and paste from a renderer keydown listener.** A keydown handler cannot produce a clipboard payload for paste — `execCommand('paste')` is not permitted — and reimplementing copy would duplicate Chromium's editing behavior for every input in the window.

**Register `globalShortcut` accelerators.** Global shortcuts are system-wide, cannot read the focused window's selection, and would take Cmd+C/Cmd+V away from other applications while the Desktop is running.

**Call `webContents.copy()`/`paste()` from `before-input-event`.** This reimplements menu accelerators inside the shell, has no access to the per-action enabled state Electron maintains for roles, and must be repeated for every window, including the plugin window.

## Consequences

Cmd+C/Cmd+V/Cmd+X/Cmd+A/Cmd+Z work on macOS again, and Windows and Linux gain a labeled Edit menu with the same accelerators that Chromium previously handled invisibly. The editing gestures now have one declaration site, so a later menu rewrite that drops these roles reintroduces the defect. The menu is built once at startup and is not rebuilt when the locale changes, matching the existing behavior of the application submenu.

## Testing

`apps/desktop/tests/main-startup.spec.ts` captures the template passed to `Menu.setApplicationMenu` and asserts the Edit submenu's roles, so removing or reordering the editing items fails the suite.
