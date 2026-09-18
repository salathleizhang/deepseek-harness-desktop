# Agent Note: Desktop auto-update with electron-updater

Status: implemented

[English](2026-08-15-desktop-auto-update.md) | 中文

## Problem

桌面壳发布的是已签名/已公证的 macOS 与 NSIS 安装包，但没有应用内升级路径：用户必须自己留意新版本并重新下载。应用捆绑了 Node 运行时与 harness 闭包，因此更新必须原子地替换整个应用载荷，绝不能只替换壳或只替换 harness。

## Decision

自动更新在 Electron 主进程内基于 `electron-updater` 运行，更新源为 GitHub Releases 仓库 `salathleizhang/deepseek-harness-desktop`。electron-builder 的 `publish` 配置即便在 `--publish never` 下也会写出更新元数据——macOS 为 `latest-mac.yml`、Windows 为 `latest.yml`——release workflow 把这些元数据随安装包一并上传。

流程：

- 启动时（仅打包后）一个 `UpdateController` 把 electron-updater 事件折入一个纯状态 reducer（`update-status.ts`），设 `autoDownload: true` 与 `autoInstallOnAppQuit: false`，然后按可配置间隔（`DSH_DESKTOP_UPDATE_INTERVAL_MS`，默认四小时）复查。
- 下载在后台进行。安装是显式的：壳的退出路径在 Host 处置完成、且已有下载完成时调用 `autoUpdater.quitAndInstall()`，因此更新绝不会打断正在运行的会话。渲染层的「立即安装」也走同一条优雅退出路径。
- 一个窄 preload 桥暴露状态读取/订阅外加检查/安装。浏览器表面是新的 `@deepseek-ai/dsh-client-ui-update` 包，注册一项 `sidebar.footer.action`——设置正上方的页脚列表——为 `available`/`downloading`/`downloaded` 渲染徽标，其余情况（包括桥缺失）一律渲染为空。

macOS 为更新器增加了 `zip` 目标；`dmg` 仍作为一键手动安装包。载荷文件名不带版本号，因此 `releases/latest/download/…` 链接保持稳定，而每次发布的频道元数据自引用本次发布的载荷：`desktopArtifactBaseName` 负责名称主干，`artifactName` 展开为同一个名字，release workflow 与上传计划都由此推导各自期望的文件名。打包后的应用自带 `app-update.yml`：macOS 发布先用 `--dir` 打包，此时目标列表为空，electron-builder 自带的写入逻辑会跳过该文件，因此由 `desktop-app-update-config.mjs` 的 `afterPack` 钩子写入，随后两条产物通道再从 `--prepackaged` 副本打包。

## Alternatives considered

**Electron 内置的 `autoUpdater`。** 否决：它只针对专用更新服务器讲 Squirrel.Mac/Squirrel.Windows，无法从 GitHub Releases 读取 electron-builder 的 `latest.yml`/`latest-mac.yml`。`electron-updater` 是 electron-builder 原生客户端，无需单独服务器。

**专用更新服务器（S3 或 `generic` provider）。** 作为默认被否决：GitHub Releases 已经是分发源，第二个宿主只会增加凭据与一种失败模式，而没有用户可见收益。feed 配置保持可替换，但 `generic` 不是交付值。

**下载后静默自动重启。** 否决：harness 子进程可能正持有运行中的会话或未保存的工作，静默重启会打断它。后台下载、退出时安装让更新在用户本就离开前始终不可见。

## Consequences

- 应用载荷——壳加 Node 运行时加 harness 闭包——原子更新，满足桌面客户端设计中「一个原子载荷」的规则。
- 状态 reducer 与 store 在不依赖 Electron 的情况下单元测试；桌面壳测试套件与 `test:gui` 客户端套件覆盖接线与徽标。
- Windows 安装包仍未签名，因此 Windows 更新在加入 Authenticode 证书前可能触发 SmartScreen 提示；已记录、不阻塞。
- 开发运行没有 feed：更新器仅在 `app.isPackaged` 时存在，桥上报 `unsupported`，因此徽标在打包桌面构建之外一律不渲染。
- preload 多了第二个窄表面（更新桥）；它只保留读状态 + 检查/安装动词，不重新暴露任何特权宿主方法。

## Related

- [Electron 桌面客户端设计](../../proposed/feature/2026-08-13-electron-desktop-client.zh.md)——父提案；本 note 实现其中的自动更新部分，原文为「自动更新使用 electron-updater 对接发布源」。
