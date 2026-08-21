<p align="center">
  <img src="./icons/icon128.png" width="96" height="96" alt="WebToAgent 图标">
</p>

<h1 align="center">WebToAgent</h1>

<p align="center"><strong>前沿智能，本地执行。</strong></p>

<p align="center">
  让网页端 AI 在你的本地项目中指导 Claude Code 工作。
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="./README.md">English</a>
</p>

<p align="center">
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Claude Code Bridge" src="https://img.shields.io/badge/Bridge-Claude_Code-D97757">
  <img alt="Windows 与 macOS" src="https://img.shields.io/badge/Native_Host-Windows_%7C_macOS-0078D4">
  <img alt="MIT 许可证" src="https://img.shields.io/badge/License-MIT-2ea44f">
</p>

WebToAgent 把网页端 AI 对话、本地项目文件和 Claude Code 连接起来：让能力更强的网页模型负责研究、架构判断、规划和审查，让本地编程 Agent 负责修改文件、运行命令、测试和调试，再把执行结果交回网页模型决定下一步。

> **最聪明的模型不需要亲自写完每一行代码。它可以负责思考、监督和审查，把高频迭代交给本地 Agent。**

## 为什么做这个项目

今天的 AI 编程分布在两个各有优势、但彼此割裂的环境里。

### 网页 AI 擅长研究与判断

ChatGPT、Claude、Gemini、Qwen 等网页产品不仅有较强的推理能力，还可能具备联网搜索、长上下文、最新文档和 GitHub 浏览能力。具体能力取决于所用产品和授权；在条件允许时，网页模型可以研究仓库、比较方案、查看 Issue 和 PR，并给出详细的实现计划。

它很适合扮演高级工程师、架构师或审查者。

### 本地编程 Agent 可以持续执行

Claude Code 能进入真实的本地工作区，读取文件、修改代码、调用工具、检查失败并继续迭代。一个开发任务可能要涉及大量文件、命令、测试和修正。

如果已经获得清晰的方案和足够的上下文，本地 Agent 不必重新独立完成所有架构判断。它只需要准确执行、汇报结果，再接受下一轮修正。

它很适合成为实现引擎。

### 真正缺少的是协作闭环

没有桥接工具时，你需要在浏览器和终端之间反复复制计划、文件、命令输出和执行结果。上下文容易过期，长任务难以持续监督，网页模型也很难在代码开始修改后继续参与。

WebToAgent 补上的就是这个闭环。

## 核心思路

```text
前沿网页 AI
  -> 搜索、理解、规划、审查
  -> WebToAgent
  -> 选定本地项目中的 Claude Code
  -> 读取、修改、运行、测试、调试
  -> WebToAgent
  -> 网页 AI 审查结果并决定下一步
```

一句话概括：

```text
远程思考，本地执行，持续审查。
```

网页模型负责高价值判断，本地 Agent 负责高频实现工作。

## 一个真实工作流

1. 你正在本地开发项目，并已把稳定的仓库状态推送到 GitHub。
2. 在 ChatGPT、Claude、Gemini、Qwen 或 AI Studio 中，让网页模型检查仓库、搜索相关文档、定位问题，并输出可以直接执行的修改方案。
3. 对于尚未提交的代码和临时文件，通过 WebToAgent 文件树、`@file`、`@folder` 或目录快照补充实时本地上下文。
4. 开启“网页 AI -> Claude Code 自动发送”后，WebToAgent 会把网页模型的指令转发给选定工作目录中的 Claude Code；你也可以通过直接消息输入框发送自己的指令。
5. Claude Code 修改项目、运行命令、测试和调试；工具调用与最终结果会显示在 WebToAgent 过程面板中。
6. 你可以先检查结果再发回网页模型；在环境和任务可信时，也可以开启自动回传。
7. 网页模型继续审查结果、纠正方向或生成下一项任务，整个循环不再需要反复手动复制粘贴。

## 为什么 GitHub 很重要

网页模型通常不能直接查看你电脑上的任意目录，因此 WebToAgent 使用两种互补的上下文来源：

| 上下文 | 最合适的来源 |
|---|---|
| 已提交的仓库历史、README、Issue、PR 和公开项目背景 | GitHub，前提是所用网页 AI 支持浏览 |
| 未提交修改、临时文件、本地资源和当前目录结构 | WebToAgent 本地文件访问 |

> **GitHub 提供仓库级上下文，WebToAgent 提供实时本地上下文。**

WebToAgent 本身不包含 GitHub API 客户端。GitHub 研究由网页 AI 在其产品支持搜索或浏览时完成。

## 为什么现在适合本地执行

本地模型和低成本模型越来越能按照详细工程指令使用工具、处理代码，并根据失败结果继续迭代。它们不必在开放式研究和架构判断上达到监督模型的水平，也可以发挥很大价值。

> **只要有更强的模型负责规划和审查，执行模型就不必在每一步都拥有前沿级判断力。**

当前版本的 WebToAgent 集成对象是 **Claude Code**。WebToAgent 调用系统中已有的 `claude` CLI，并沿用该 CLI 已配置的模型、服务商、身份验证和权限策略。WebToAgent 不会自行安装模型，也不会配置本地推理服务。

## 为什么成本可能更低

传统的前沿编程 Agent 可能在每次读取、编辑、命令、报错、重试和测试中持续消耗高价模型 Token。WebToAgent 支持另一种分工方式：

```text
能力更强的网页模型：少量、高价值的规划与审查
本地编程 Agent：大量实现与调试迭代
```

如果你的 Claude Code 环境使用本地或更低成本的后端，高频执行循环就不会持续增加前沿 API 的 Token 费用。即使 Claude Code 使用付费服务，把规划、执行和审查拆开后，也可以为不同角色选择更合适的模型与成本配置。

**低成本不等于零成本。** 网页订阅、API 或服务商费用、硬件、电费和工程时间仍然存在。目标不是宣传免费，而是避免让最昂贵的智能承担每一次机械迭代。

## WebToAgent 能做什么

### 网页 AI 与 Claude Code

- 在选定的本地工作目录中启动 Claude Code。
- 检测网页 AI 已完成的回复，并在开启“网页 AI -> Claude Code 自动发送”后转发给 Claude Code。
- 在过程面板中流式展示 Claude Code 的推理事件、工具调用、工具结果和最终输出。
- 经人工确认后把结果发回网页对话，也可选择自动回传。
- 支持绕过网页模型，直接向 Claude Code 发送指令。
- 按工作目录保存 Claude Code 会话，并提供明确的 **新会话** 操作。
- 可以停止 Bridge 并终止当前正在执行的本地任务。
- 过程面板与文件侧边栏可独立显示，宽度可调整并保存。

### 网页 AI 与本地文件

- 通过右侧文件树浏览选定项目。
- 按语言类型把文本文件作为 Markdown 代码块插入。
- 在当前网站支持时，通过其上传交互添加图片、PDF 和其他二进制资源。
- 使用 `@filename` 搜索文件，使用 `@folder` 批量载入文件夹。
- 插入当前目录的 Markdown 结构快照。
- 本地服务模式应用内置过滤和项目 `.gitignore` 规则。
- 本地服务模式监听文件变化并自动刷新索引。
- 在多个已打开标签页之间共享最新文件索引。
- 提供最近目录、快捷提示词、插入历史和一键撤销。

## 支持的集成

### 网页 AI

| 服务 | 地址 |
|---|---|
| 通义千问 | `https://chat.qwen.ai/*` |
| ChatGPT | `https://chatgpt.com/*` |
| Google AI Studio | `https://aistudio.google.com/*` |
| Gemini | `https://gemini.google.com/*` |
| Claude | `https://claude.ai/*` |

网站适配器依赖页面 DOM 结构。受支持网站改版后，回复识别、消息插入或文件上传可能暂时失效，需要更新对应适配器。

### 本地编程 Agent

| Agent | 状态 |
|---|---|
| Claude Code | 已支持 |
| Codex CLI、OpenCode 等其他 Agent | 规划中，当前版本尚不支持 |

## 环境要求

只使用本地文件读取：

- Chrome 或支持 File System Access API 的 Chromium 桌面浏览器。

使用 Claude Code Bridge 和持久本地文件访问：

- Node.js 18 或更高版本。
- 已安装、完成身份验证并能在终端正常运行的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/getting-started)。
- Windows 或 macOS；仓库已包含这两个系统的本地服务安装脚本。

按照当前官方 npm 方式安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
claude
```

请先在 Claude Code 中完成身份验证，再启动 Bridge。

## 安装

### 1. 获取源码

```bash
git clone https://github.com/mypengpengli/webtoagent.git
cd webtoagent
```

也可以从 GitHub 下载 ZIP 压缩包并解压。

### 2. 加载 Chrome 扩展

1. 打开 `chrome://extensions`。
2. 开启 **开发者模式**。
3. 点击 **加载已解压的扩展程序**。
4. 选择包含 `manifest.json` 的仓库根目录。
5. 复制 Chrome 显示的扩展 ID，本地服务安装程序会要求输入它。

### 3. 安装本地服务

只使用浏览器文件访问时，本地服务是可选项；使用 Claude Code Bridge 时必须安装。

#### Windows

双击：

```text
安装本地服务.bat
```

按提示粘贴扩展 ID。

#### macOS

在仓库根目录运行：

```bash
chmod +x install-native-host.sh uninstall-native-host.sh native-host/host.sh
./install-native-host.sh
```

按提示粘贴扩展 ID。

安装完成后重启 Chrome，再打开受支持的 AI 网站。

## 使用方法

### 启动 Bridge 会话

1. 打开受支持的网页 AI。
2. 点击 WebToAgent 悬浮按钮，或按 `Ctrl+Shift+F`。
3. 选择本地工作目录。
4. 在 **Bridge** 区域点击 **启动**。
5. 让网页 AI 搜索资料、制定方案、审查代码，或生成详细实现指令。
6. 把回复转给 Claude Code；开启“网页 AI -> Claude Code 自动发送”后，新回复会自动转发。
7. 在左侧过程面板查看 Claude Code 的命令和工具结果。
8. 检查执行结果后发回网页 AI；对于受控任务，也可以开启“Claude Code -> 网页 AI 自动发送”。
9. 点击 **停止** 可停止 Bridge 监听并终止当前本地任务。

停止 Bridge 不会清除已保存的 Claude Code 会话。同一工作目录再次启动时会尝试恢复会话；需要干净上下文时，请使用 **新会话**。

### 直接发送本地任务

使用 **直接消息** 可绕过网页 AI，直接向 Claude Code 下达指令。如果 Bridge 尚未启动，WebToAgent 会尝试自动启动。

### 添加实时本地上下文

- 点击文本文件，把内容插入当前聊天草稿。
- 点击图片、PDF 或二进制资源，在网站支持时进行上传。
- 输入 `@` 和部分文件名或文件夹名进行模糊搜索。
- 使用 **当前目录结构** 插入 Markdown 项目树。

### Bridge 控件

| 控件 | 作用 |
|---|---|
| 启动 / 停止 | 启动 Bridge 监听，或停止当前 Bridge 任务 |
| 网页 AI -> Claude Code 自动发送 | 自动把新的网页 AI 回复转给 Claude Code |
| Claude Code -> 网页 AI 自动发送 | 自动把本地 Agent 结果插入并发送到网页对话 |
| 显示 / 隐藏过程 | 展开或收起 Claude Code 执行面板 |
| 隐藏 / 显示目录 | 只切换右侧文件面板 |
| 新会话 | 清除当前工作目录保存的 Claude Code 会话 |
| 直接消息 | 直接向 Claude Code 发送指令 |

### 键盘操作

- `Ctrl+Shift+F`：打开或关闭 WebToAgent。
- `Enter`：在直接消息输入框中发送。
- `Shift+Enter`：在直接消息输入框中换行。
- `@`：在网页聊天输入框中开始搜索文件或文件夹。

## 本地服务与浏览器模式

| | 本地服务模式 | 浏览器模式 |
|---|---|---|
| Claude Code Bridge | 支持 | 不支持 |
| 持久目录访问 | 支持 | 浏览器重启后可能需要重新授权 |
| 文件监听 | 支持 | 没有本地自动监听 |
| 最近路径与系统目录选择器 | 支持 | 使用浏览器文件夹选择器 |
| 适合场景 | 完整 WebToAgent 工作流 | 快速插入本地上下文 |

本地服务不可用时，文件读取可以降级到浏览器模式；Bridge 仍然必须依赖本地服务。

## 安全模型

WebToAgent 把网页对话与本地编程 Agent 连接起来，因此必须把 Bridge 视为具有较高权限的自动化工具。

### 文件访问

- 工作根目录由用户选择。
- 本地文件读取请求会检查目标路径，防止越过根目录。
- 文件浏览和索引会过滤常见生成目录、隐藏路径和 `.gitignore` 匹配项。
- 文本文件最大 5 MB，二进制读取最大 10 MB，批量上下文插入也设有上限。

### Agent 执行

- Bridge 以选定项目为工作目录启动 Claude Code。
- Claude Code 可以根据自身配置和权限策略读取或修改文件、运行命令并访问其他资源。
- 文件浏览器的根目录限制**不会沙箱化 Claude Code**。请根据项目风险配置 Claude Code 权限和操作系统隔离。
- 人工检查结果比全自动模式更安全。只有在任务、仓库、网页内容和模型输出都可信时，才应同时开启两个方向的自动发送。
- 网页和浏览内容可能包含提示词注入。在把来自不可信网页、Issue、仓库或文档的指令转给本地 Agent 前，应把它们视为不可信输入。
- 除非任务明确需要且执行环境已有适当隔离，否则不要暴露凭据、私钥、生产数据或敏感配置。

## 系统架构

```text
受支持的网页 AI
  |  网站适配器：读取回复、插入消息、上传选定文件
  v
content.js + lib/file-tree.js
  |  Chrome runtime 消息
  v
background.js（Manifest V3 Service Worker）
  |  Chrome Native Messaging
  v
native-host/host.js
  |  在选定工作目录中启动 `claude`
  v
Claude Code -> 已配置的模型/服务商 -> 本地工具与项目文件
```

文件访问由 `lib/file-access.js` 统一抽象：连接本地服务时使用 Native Host，否则以浏览器 File System Access API 作为只读降级方案。

Bridge 使用 Claude Code 的流式 JSON 输出，把进度事件转发给扩展，并按工作目录保存 Claude Code 会话 ID 以便恢复。

## 常见问题

### Bridge 提示未启动

在 `chrome://extensions` 重新加载扩展，刷新 AI 页面，选择工作目录后再次启动 Bridge。Chrome Manifest V3 Service Worker 在空闲时可能重启，扩展会在页面重新连接时同步 Bridge 状态。

### 找不到 `claude` 或 Bridge 无法启动

先在终端中直接运行 `claude`，完成安装和身份验证，再重启 Chrome，使本地服务获得正确的环境变量。

### 提示 `No conversation found with session ID`

已保存的 Claude Code 会话失效。WebToAgent 会清理失效会话并自动重试一次，也可以手动选择 **新会话**。

### Claude Code 看起来卡住了

打开过程面板检查最后一个事件。Claude Code 可能正在等待身份验证、权限批准、工具返回或长时间运行的命令；需要终止时可停止 Bridge。

### 找不到某个文件或文件夹

检查它是否为隐藏路径、被 `.gitignore` 忽略、属于内置过滤目录、位于所选根目录之外，或超过文件与索引限制。

### 更新后需要重新安装本地服务吗

通常不需要。拉取最新代码后，在 `chrome://extensions` 刷新扩展，再刷新 AI 页面。只有扩展 ID、仓库位置或本地服务注册发生变化时才需要重新安装。

## 路线图

- **更多本地 Agent：**支持 Codex CLI、OpenCode 和其他编程 Agent。
- **Agent 配置：**明确选择执行器、模型、服务商和权限策略。
- **更安全的自动化：**审查门、命令策略、范围化能力和更清晰的指令来源。
- **更完善的任务循环：**结构化任务、完成条件、重试策略和审查检查点。
- **上下文同步：**更清晰地协调 GitHub 状态、实时本地修改、网页 AI 上下文和 Agent 会话。
- **更多网页 AI 适配器：**支持更多网页模型，不让 Bridge 绑定单一服务商。

长期目标是建立一个不绑定具体模型的桥：使用当下最合适的网页模型做判断，使用最合适的本地 Agent 做执行。

## 参与贡献

欢迎提交 Issue 和 Pull Request。报告网站适配问题时，请说明网站、浏览器版本、失败操作、控制台错误，以及当时使用的是本地服务还是浏览器模式。请勿提交私有项目文件、凭据或对话内容。

添加新的网页 AI 时，请在 `adapters/` 中实现网站适配器，在 `manifest.json` 注册 URL 与脚本，并分别测试回复识别、消息插入、文本上下文和二进制上传。

## 卸载

- 在 `chrome://extensions` 中移除 WebToAgent。
- Windows：双击 `卸载本地服务.bat`。
- macOS：运行 `./uninstall-native-host.sh`。

## 许可证

MIT
