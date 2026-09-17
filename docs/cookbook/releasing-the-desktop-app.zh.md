# 发布 Desktop 应用

[English](releasing-the-desktop-app.md) | 中文

Desktop 应用属于 `dsh` 发布家族：它使用工作区根目录的版本，并从 `dsh-v*` tag 发布。[Electron 桌面打包与更新](../../.agents/notes/implemented/architecture/2026-08-25-electron-desktop-packaging-and-updates.zh.md)负责设计取舍，[Desktop README](../../apps/desktop/README.zh.md)负责打包、上传与凭据配置。

## 更新源命名约定

打包后的 Desktop 构建只嵌入一个 generic-provider URL —— `https://download.deepseek.com/_/harness/desktop/stable/<target>/`，其中 `<target>` 为 `mac-arm64`、`mac-x64` 或 `win-x64` —— electron-updater 请求的元数据文件名由打包版本推导得出。该名称由版本决定，无法自行选择：

| 打包版本 | macOS | Windows |
|---|---|---|
| `0.1.0` | `latest-mac.yml` | `latest.yml` |
| `0.1.0-rc.21` | `rc-mac.yml` | `rc.yml` |

频道取语义化版本的第一个预发布标识符（`rc`、`alpha`、`beta`）；macOS 追加 `-mac`，Windows 不追加。[`desktopUpdateMetadataFilename`](../../apps/desktop/scripts/desktop-auto-update-environment.mjs) 计算该名称，`apps/desktop/tests/desktop-auto-update-environment.spec.ts` 将其固定。

元数据必须与它引用的载荷放在一起，并使用 electron-builder 生成的文件名：macOS 更新载荷为 `deepseek-harness-<version>-mac-<arch>.zip` 及其 `.blockmap`，Windows 为 `deepseek-harness-<version>-win-x64.exe`（NSIS 的 blockmap 内嵌其中）。元数据携带每个载荷的大小与 SHA-512，上传计划在读取凭据之前就会拒绝不一致的输入。

元数据文件被改名、改变大小写或放错位置都会静默失败：客户端的检查收到 404，自动检查不报告任何内容，只有应用菜单里的“检查更新”会显示错误。GitHub Releases 是手动下载镜像，不是更新源，因此上传到那里的资产不会让更新可见。未签名的 Windows 构建把 `publish` 设为 `null`，因此没有更新源，也没有元数据文件。

## 步骤

1. 把改动落到 `master`。
2. 用 `pnpm run release:dsh <version>` 升家族版本，然后推送 `master`。
3. 打并推送发布 tag：`git tag dsh-v<version>` 与 `git push origin dsh-v<version>`。
4. 从该 tag 以 `publish: true` 派发 Release (Desktop) 工作流；它会构建已签名的 macOS 安装包与 Windows 安装包，并创建 GitHub Release。
5. 以 `DSH_DESKTOP_AUTO_UPDATE_ENV=production` 打包目标，然后在生产 COS bucket 与凭据对下用 `pnpm run upload:mac:arm64`、`upload:mac:x64` 或 `upload:win:x64` 上传。
6. 在宣布发布前校验更新源。

发布工作流只发布自己的产物，从不写入更新源。上传命令要求目标的完成记录（`mac-arm64-release.json`）以及该记录描述的产物，因此发布要从打包它的机器上传，或在记录随产物一同进入 CI 之后从 CI 上传。

## 校验更新源

按发布版本对应的频道，请求客户端请求的那个确切文件：

```sh
curl -fsS "https://download.deepseek.com/_/harness/desktop/stable/mac-arm64/rc-mac.yml"
```

只有当 `version` 等于已发布版本、且每个 `files[].url` 都指向与之并排上传的载荷时，上传才算成功。返回 404 意味着第 5 步没有执行：任何客户端都不会显示更新徽标，“检查更新”会报告错误。
