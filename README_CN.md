# WebToAgent

中文 | [English](./README.md)

WebToAgent 是一个 Chrome 扩展，用来把 **网页端大模型、本地项目文件、GitHub/网页搜索、Claude Code** 串起来。

一句话：让网页端大模型做“项目大脑”，让本地 Claude Code 做“执行工人”。

你可以在 Qwen、ChatGPT、Gemini、Claude 这类网页 AI 里直接读取本地项目文件，也可以让网页 AI 先结合搜索结果、GitHub 仓库、官方文档、Issue/PR 讨论来判断方向，再把具体修改任务交给本地 Claude Code 执行。

## 为什么需要它

网页端大模型通常有几个优势：

- 模型更新快，推理能力强。
- 很多网页 AI 支持联网搜索、读取网页、查看 GitHub 页面。
- 适合做架构判断、方案比较、代码审查、查新文档。

本地编程智能体也有几个优势：

- 能真正读取本机项目文件。
- 能修改代码、运行命令、查看结果。
- 可以用更便宜或更适合执行的模型长期跑任务。

但它们之间以前是断开的：网页 AI 看不到你的本地项目，本地智能体又不一定有最强的搜索和规划能力。WebToAgent 要解决的就是这个断点。

## 典型工作流

1. 你在网页 AI 里提出需求，比如“帮我看看这个功能怎么设计”。
2. 网页 AI 可以结合它自己的搜索能力、GitHub 仓库页面、官方文档和你插入的本地文件来分析。
3. WebToAgent 把网页 AI 的结论转给本地 Claude Code。
4. Claude Code 在你的本地项目里改文件、跑命令、看报错。
5. 执行过程会显示在 WebToAgent 的过程面板里。
6. Claude Code 的结果再发回网页 AI，由网页 AI 继续判断下一步。

这样就变成了一个协作链路：

```text
网页端大模型：搜索、理解、规划、审查
        ↓
WebToAgent：转发上下文、展示过程、管理文件
        ↓
Claude Code：读取项目、修改代码、运行命令
```

## 它适合什么场景

- 让网页 AI 先读 GitHub README、Issue、PR，再指导本地智能体改你的本地代码。
- 让网页 AI 搜索最新 API 文档，然后让 Claude Code 按最新写法修改项目。
- 让强模型做代码审查，低成本/本地模型按审查意见执行。
- 在网页 AI 里一键插入本地文件、目录结构，不再反复复制粘贴。
- 让网页 AI 和 Claude Code 自动来回协作，适合长任务、重构、排错。
- 一边看 Claude Code 的执行过程，一边随时手动插话补充要求。

## 核心功能

### 本地文件读取

- 右侧文件树直接浏览当前项目。
- 点击文本文件，自动按 Markdown 代码块插入聊天框。
- 点击图片、PDF、二进制文件，自动模拟上传。
- 输入 `@文件名` 快速搜索并插入文件。
- 一键插入“当前目录结构”，让 AI 先理解项目骨架。
- 支持 `.gitignore` 过滤，减少无关文件干扰。
- 支持文件监听，IDE 里改了文件后索引会刷新。
- 支持最近工作目录和系统文件夹选择器，不用手动复制路径。

### Bridge：网页 AI 指挥 Claude Code

- 点击启动后，网页 AI 的回复可以自动转给 Claude Code。
- Claude Code 在本地项目里读文件、改文件、跑命令。
- Claude Code 的执行过程显示在左侧“Claude Code 过程”面板里。
- 可以手动确认结果后再发回网页 AI。
- 也可以开启全自动，让网页 AI 和 Claude Code 循环协作。
- 可以随时直接给 Claude Code 发消息，不需要经过网页 AI。
- 默认按工作目录保存 Claude Code 会话，停止后再启动还能继续上下文。
- 需要重新开始时，可以点“新会话”清空当前目录的 Claude 上下文。

### 交互体验

- `Ctrl+Shift+F` 打开或关闭 WebToAgent 侧边栏。
- 右侧目录面板用于文件、搜索、开关和快捷指令。
- 左侧过程面板用于看 Claude Code 的完整执行过程。
- 过程面板可以单独显示，右侧目录面板可以隐藏。
- 过程面板宽度可以拖动调整，并会记住上次宽度。
- 过程面板底部支持直接输入给 Claude Code，`Enter` 发送，`Shift+Enter` 换行。

## 支持的网站

- `https://chat.qwen.ai/*`
- `https://chatgpt.com/*`
- `https://aistudio.google.com/*`
- `https://gemini.google.com/*`
- `https://claude.ai/*`

## 使用前准备

只读取文件：

- Chrome 或 Chromium 内核浏览器即可。

使用本地服务和 Bridge：

- Node.js 14+
- 已安装并登录 Claude Code
- 当前仓库提供 Windows 安装脚本

安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

## 安装

### 1. 加载扩展

1. 打开 `chrome://extensions`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目文件夹。
5. 复制 Chrome 显示的扩展 ID。

### 2. 安装本地服务

双击：

```text
安装本地服务.bat
```

按提示粘贴扩展 ID。

安装脚本会写入 Native Messaging manifest，并注册：

```text
com.webtoagent.host
```

安装完成后重启 Chrome，然后打开支持的 AI 网站。

## 基础用法

### 读取本地文件

1. 打开 Qwen、ChatGPT、AI Studio、Gemini 或 Claude。
2. 点击 WebToAgent 悬浮按钮，或按 `Ctrl+Shift+F`。
3. 选择或切换工作目录。
4. 点击文件，内容会自动插入聊天框。
5. 也可以在聊天框里输入 `@文件名` 快速搜索。

### 插入目录结构

点击快捷命令：

```text
当前目录结构
```

它会插入一个 Markdown 风格的项目目录树，让 AI 先理解项目结构，再继续读取具体文件。

### 使用网页搜索和 GitHub

如果你使用的网页 AI 支持搜索或网页访问，可以直接把 GitHub 仓库、Issue、PR、官方文档链接发给它，让它先理解外部背景。

然后用 WebToAgent 插入本地关键文件，或者让网页 AI 的结论通过 Bridge 发给 Claude Code。这样网页 AI 负责“查资料和做判断”，Claude Code 负责“在本地执行修改”。

## Bridge 用法

1. 打开 WebToAgent 侧边栏。
2. 在 Bridge 区域点击 **启动**。
3. 左侧会弹出 **Claude Code 过程** 面板。
4. 正常向网页 AI 提问，比如让它分析代码、制定修改方案。
5. 如果开启“全自动发送（网页 AI 回复后自动转给 Claude）”，网页 AI 的最新回复会自动转给 Claude Code。
6. 在过程面板里查看 Claude Code 的工具调用、命令输出和最终结果。
7. 结果可以手动发回网页 AI；开启“全自动发送（Claude 回复后自动给网页）”后也可以自动发回。
8. 点击 **停止** 可以暂停 Bridge。

停止 Bridge 不会清空 Claude Code 的上下文。同一个工作目录再次启动时，会优先继续上次 Claude Code 会话。

如果你想让 Claude Code 忘掉之前的上下文，点击过程面板里的 **新会话**。

## Bridge 控件说明

| 控件 | 作用 |
|---|---|
| 启动 / 停止 | 启动或停止 Bridge 监听 |
| 全自动发送（网页 AI 回复后自动转给 Claude） | 网页 AI 回复后自动转给 Claude Code |
| 全自动发送（Claude 回复后自动给网页） | Claude Code 返回结果后自动发回网页 AI |
| 显示过程 / 隐藏过程 | 展开或收起 Claude Code 过程面板 |
| 隐藏目录 / 显示目录 | 只隐藏右侧文件目录，保留过程面板 |
| 新会话 | 清空当前工作目录保存的 Claude Code 会话 |
| 直接对 Claude 说 | 不经过网页 AI，直接给 Claude Code 下指令 |

## 两种文件访问模式

| 模式 | 适合场景 | 说明 |
|---|---|---|
| 本地服务模式 | 日常使用、Bridge、稳定读取项目目录 | 需要安装 Node.js 和本地服务 |
| 浏览器文件系统 API | 临时读取文件、不想安装服务 | 浏览器重启后可能要重新授权 |

本地服务不可用时，WebToAgent 会尽量降级到浏览器文件系统 API。

## 常见问题

### 我一定要用 Bridge 吗

不需要。只把它当成本地文件读取助手也很好用：点文件、插目录结构、上传图片、搜索文件，都可以单独使用。

### Bridge 显示未启动，但 CMD 窗口还在

到 `chrome://extensions` 刷新扩展，再刷新 AI 网站页面。Chrome MV3 的后台 Service Worker 会休眠重启，WebToAgent 会在侧边栏打开时重新同步状态。

### 直接发给 Claude 时提示 No conversation found with session ID

这是旧 Claude session 失效了。WebToAgent 会自动清掉旧 session，并用同一条消息重试。你也可以手动点 **新会话**。

### Claude Code 好像卡住了

先看左侧过程面板。如果长时间没有新工具调用，可能是 Claude Code 在等权限或登录。可以在终端里运行：

```bash
claude login
```

### 更新代码后需要重新安装本地服务吗

通常不需要。到 `chrome://extensions` 点击扩展卡片上的刷新按钮，然后刷新 AI 网站即可。

只有扩展 ID、本地服务名称、安装路径变了，才需要重新运行安装脚本。

## 卸载

- 在 `chrome://extensions` 删除扩展。
- 双击 `卸载本地服务.bat` 注销本地服务。

## License

MIT
