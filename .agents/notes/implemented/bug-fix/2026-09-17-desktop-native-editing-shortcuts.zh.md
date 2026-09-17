# Agent Note: 恢复桌面端应用菜单中的原生编辑快捷键

Status: implemented

[English](2026-09-17-desktop-native-editing-shortcuts.md) | 中文

## Problem

桌面端 shell 用一个只包含应用子菜单（桌面插件、检查更新、退出）的模板替换了 Electron 的默认应用菜单。macOS 会把标准编辑手势（Cmd+C、Cmd+V、Cmd+X、Cmd+A、Cmd+Z）作为菜单键等价项投递给窗口，因此缺少对应菜单项的模板会让这些按键在渲染进程收到之前就无人处理。Web 客户端收不到任何 `copy`、`cut`、`paste` 事件，输入框因而失效：Lexical 纯文本的 `COPY_COMMAND`/`PASTE_COMMAND` 处理函数以及窗口内其他所有文本表面都依赖这些 DOM 事件。Windows 和 Linux 不受影响，因为 Chromium 的渲染进程无需菜单项即可处理 Ctrl+C/Ctrl+V。

## Decision

`apps/desktop/src/main.ts` 的应用菜单模板新增第二个由语言环境提供标签的“编辑”子菜单，其菜单项使用 Electron 角色 `undo`、`redo`、`cut`、`copy`、`paste` 和 `selectAll`。这些角色提供平台加速键，并把每个菜单项绑定到焦点窗口的编辑操作；标签取自既有的桌面字典（`editMenu`、`undoMenu`、`redoMenu`、`cutMenu`、`copyMenu`、`pasteMenu`、`selectAllMenu`），使菜单继续处于[桌面打包决策](../architecture/2026-08-25-electron-desktop-packaging-and-updates.zh.md)所记录的语言环境约定之内。应用子菜单保持不变，插件管理器因而在启动和恢复期间仍可从菜单访问。

## Alternatives considered

**使用单个 `role: 'editMenu'` 菜单项。** Electron 会把它展开为完整的标准“编辑”菜单，但该菜单使用 Electron 自带的标签而非桌面字典，且菜单项集合固定。显式列出的菜单项让 shell 文案仍由语言环境拥有。

**恢复 Electron 默认菜单并把桌面插件入口移到别处。** 默认菜单能恢复编辑角色，但会去掉插件管理器和更新检查；这两者必须在渲染进程仍停留在启动页或恢复页时可用。把它们移入渲染进程，恰恰会在客户端无法启动时不可用。

**在渲染进程的 keydown 监听器中合成复制和粘贴。** keydown 处理器无法为粘贴产生剪贴板内容——`execCommand('paste')` 不被允许——而重新实现复制会与 Chromium 对窗口内每个输入控件的编辑行为重复。

**注册 `globalShortcut` 加速键。** 全局快捷键作用于整个系统，无法读取焦点窗口的选区，并会在桌面端运行期间把 Cmd+C/Cmd+V 从其他应用手中夺走。

**在 `before-input-event` 中调用 `webContents.copy()`/`paste()`。** 这会在 shell 内部重新实现菜单加速键，无法获知 Electron 为角色维护的逐项启用状态，并且必须为每个窗口（包括插件窗口）重复一遍。

## Consequences

macOS 上的 Cmd+C/Cmd+V/Cmd+X/Cmd+A/Cmd+Z 恢复可用，Windows 和 Linux 也获得了带标签、使用相同加速键的“编辑”菜单（此前由 Chromium 隐式处理）。编辑手势现在只有一个声明位置，因此后续重写菜单若丢弃这些角色就会重新引入该缺陷。菜单在启动时构建一次，语言环境变化时不会重建，与应用子菜单的既有行为一致。

## Testing

`apps/desktop/tests/main-startup.spec.ts` 捕获传给 `Menu.setApplicationMenu` 的模板并断言“编辑”子菜单的角色，因此删除或重排这些编辑菜单项会让测试失败。
