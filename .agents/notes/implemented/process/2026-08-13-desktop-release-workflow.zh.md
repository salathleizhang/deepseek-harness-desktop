# Agent Note: 以 tag 触发的桌面发布工作流构建 Electron 安装包

Status: implemented

[English](2026-08-13-desktop-release-workflow.md) | 中文

## Problem

[Electron 桌面壳](../../proposed/feature/2026-08-13-electron-desktop-client.zh.md)交付时带上了 `electron-builder` 打包（`dist:mac` → `.dmg`、`dist:win` → NSIS 安装包），但没有 CI：它的 README 写着「专用的打包/CI 任务是后续事项」。因此桌面发布只能在开发机上构建并手工上传，任何 tag 都无法复现一次发布的安装包。

有两个平台事实塑造了工作流。其一，桌面应用是 `dsh` 发布族（[npm 发布序列](2026-08-10-npm-release-sequences.zh.md)）的成员：它共享该族的单一版本与 `dsh-v*` tag，所以桌面发布复用同一个 tag，而不是再造一条版本线。其二，`prepare-runtime` 用 `unzip` 解压 Windows 的 Node zip，而 Windows runner 上不存在这个二进制，因此 Windows CI 构建无法暂存它正在打包的自包含运行时。

## Decision

`.github/workflows/desktop-release.yml` 在两个托管 runner 上构建安装包，并把它们发布为 GitHub Release：

- **macOS**（`macos-14`）：`dist:mac` 暂存自包含运行时并构建 arm64 的 `.dmg`。
- **Windows**（`windows-2025`）：`dist:win` 在原生 `pwsh` 下构建 x64 NSIS 安装包。
- **Release**（`ubuntu-latest`）：由 `dsh-v*` tag 推送触发，或在该 tag 上以 `publish: true` 手动触发，通过 `gh release create` 把两个安装包挂到标题为 `DeepSeek Harness Desktop <version>` 的 GitHub Release。

`electron-builder.config.mjs` 设置了不带版本号、带架构后缀的 `artifactName`，让发布页上的 macOS 与 Windows 安装包一目了然，同时让 `releases/latest/download/…` 链接保持稳定（[Desktop 自动更新](../feature/2026-08-15-desktop-auto-update.zh.md)）。它还钉死了 macOS 的 `identity`（不带证书类型前缀）并启用 `notarize: true`，同时设 `npmRebuild: false`（壳进程内没有原生依赖）；工作流把 `.p12` 导入临时钥匙串，并借助仓库 secret 里的 App Store Connect API key 通过 `notarytool` 公证。

`prepare-runtime` 统一用 `tar -xf` 解压每个归档（bsdtar 既能读 tarball 也能读 zip，无需 `unzip`），把 Windows 下载名改为 `win` 而非 `win32`，只暂存宿主架构的单一 Node 运行时并[裁剪闭包](2026-08-14-prune-desktop-runtime-bundle.zh.md)，并在 Windows 上用 shell 启动 `pnpm` 使 `pnpm.cmd` 得以运行。

macOS 安装包已签名并公证；Windows 安装包在加入 Authenticode 证书之前仍为未签名，自动更新源亦被延后。

## Alternatives considered

**用 `softprops/action-gh-release` 做发布步骤。** 不采用，改用 `gh release create`：托管 Ubuntu runner 上本就装了该 CLI，无需引入新的第三方 action，而且创建发布只是一条命令，不是一份需要维护的依赖。

**在 macOS runner 上交叉构建 Windows 安装包。** 不采用：在非 Windows 主机上，electron-builder 需要借助 wine 运行生成的 NSIS 安装包以抽取卸载器，所以 macOS 构建仍需 wine；原生 Windows runner 则完全绕开它。

**在 Windows runner 上用 Chocolatey 安装 `unzip`，而不是改 `prepare-runtime`。** 不采用：那只是掩盖脚本里潜伏的跨平台 bug，还多一个又慢又易失败的安装步骤；改用 `tar -xf` 能让任何打包该应用的机器都正确工作。

**用一个共享构建作业把产物喂给两个平台作业。** 首个版本不采用：打包需要先构建仓库（`pnpm run build`），`prepare-runtime` 才能部署 harness 闭包，而把整个已构建工作区作为 artifact 共享，比两个并行原生构建有更多活动部件。

## Consequences

- **桌面发布可由 tag 复现。** 推送 `dsh-v0.1.0-rc.5` 即可得到 macOS arm64 的 `.dmg` 与 Windows 安装包，并挂到 GitHub Release，全程不需要开发机。
- **macOS x64 安装包被延后。** 在 arm64 runner 上交叉构建会把 harness 闭包的原生依赖（koffi、node-pty）部署成 arm64 二进制；要交付正确的 x64 构建，需要原生 x64 主机或交叉编译原生模块。
- **每个平台作业都要跑一次完整仓库构建。** 这比一次共享构建慢，但能让打包按平台原生进行，也与 `prepare-runtime` 从已构建工作区部署 harness 闭包的方式一致。
- **只有 macOS 已签名并公证。** 在加入 Authenticode 证书之前，Windows 用户仍会看到 SmartScreen 警告；两个平台都完成签名也是上线自动更新源的前置条件。
