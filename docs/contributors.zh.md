# 贡献者

[English](contributors.md) | 中文

本仓库是 DeepSeek Harness 的桌面壳，fork 自 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。历史中的大部分提交是继承来的上游运行时与 Web GUI；下列贡献者构建了属于桌面端的部分。

## 桌面壳

| 贡献者 | GitHub | 在本仓库中的桌面工作 |
| --- | --- | --- |
| Junwei Zhang | [@salathleizhang](https://github.com/salathleizhang) | 创建并维护 Electron 壳：主进程对 harness 子进程的监督、可移植运行时暂存、tag 触发的发布 workflow、应用内自动更新、系统托盘、窗口外观与应用菜单。 |
| Chen Moushun | [@cms19859230182-lang](https://github.com/cms19859230182-lang) | 无边框窗口的标题栏按钮与拖动行为、最小化/最大化/关闭的渲染层桥接、开机自启与系统通知。 |

## 其他桌面贡献

- [nk34player](https://github.com/nk34player)：关闭窗口时隐藏到托盘还是退出的偏好，以及对应的通用设置行。
- 以 `minimax-agent` 提交身份工作的一台自动化 Agent：从托盘打开 harness 日志的入口，以及连接中页面卡住的修复。

## 上游 DeepSeek Harness

Agent 运行时、各个包与 Web GUI 来自 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)；因为 fork 原样保留了上游提交，这些作者同样出现在本仓库的历史中。相关署名归上游仓库。

## GitHub 上的提交统计

GitHub 目前没有为本 fork 生成贡献者统计，因此 Insights → Contributors 显示 “We don't have enough data to generate this graph”，仓库侧栏也不列出贡献者。提交记录本身是完整的；列出在本仓库创作、而非从上游继承的提交：

```sh
git shortlog -sne upstream/master..origin/master
```
