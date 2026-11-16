# Contributors

English | [中文](contributors.zh.md)

This repository is the desktop shell for DeepSeek Harness, forked from [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness). Most commits in its history are the inherited upstream runtime and Web GUI; the people below built the desktop-specific parts.

## Desktop shell

| Contributor | GitHub | Desktop work in this repository |
| --- | --- | --- |
| Junwei Zhang | [@salathleizhang](https://github.com/salathleizhang) | Created and maintains the Electron shell: main-process supervision of the harness child, portable runtime staging, the tag-triggered release workflow, in-app auto-update, the tray, window chrome, and the application menu. |
| Chen Moushun | [@cms19859230182-lang](https://github.com/cms19859230182-lang) | Frameless window caption controls and drag behavior, the renderer bridge for minimize, maximize, and close, launch at login, and system notifications. |

## Additional desktop contributions

- [nk34player](https://github.com/nk34player): the close-behavior preference that hides the window to the tray or quits, and its General-settings row.
- An automated agent under the `minimax-agent` commit identity: the tray entry that opens the harness log, and the connecting-page stall fix.

## Upstream DeepSeek Harness

The agent runtime, packages, and Web GUI come from [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness); their authors appear in this repository's history because the fork carries the upstream commits unchanged. Credit for those parts belongs upstream.

## Commit counts on GitHub

GitHub does not currently generate contributor statistics for this fork, so Insights → Contributors reports "We don't have enough data to generate this graph" and the repository sidebar lists no contributors. The commit record itself is complete; list the commits authored in this repository rather than inherited from upstream:

```sh
git shortlog -sne upstream/master..origin/master
```
