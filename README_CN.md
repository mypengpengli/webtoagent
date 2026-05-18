# WebToAgent

[English](./README.md) | 中文

WebToAgent 是一个 Chrome 扩展，用来把网页端 AI 聊天页面、本地项目文件、Claude Code 连接起来。它可以让 Qwen、ChatGPT、Gemini、Claude 这类网页 AI 更方便地读取你的项目上下文，也可以让网页 AI 指挥本地 Claude Code 执行改代码、跑命令、看结果。

一句话：网页 AI 负责思考和决策，Claude Code 负责在本地项目里执行。

## 它能解决什么问题

平时在网页 AI 里问代码问题，经常要一个文件一个文件上传、复制、粘贴。WebToAgent 可以把本地项目变成网页 AI 旁边的文件面板：

- 点一下文件，内容自动插入聊天框。
- 点图片或 PDF，自动作为附件上传。
- 输入 `@文件名`，快速模糊搜索并插入。
- 一键插入当前目录结构。
- 网页 AI 的回复可以自动转给 Claude Code。
- Claude Code 的执行过程会显示在内置过程抽屉里。
- Claude Code 的结果可以自动或手动发回网页 AI。

不用 Bridge 的时候，它就是一个方便的网页 AI 文件读取助手。启用 Bridge 后，它就变成“网页 AI + 本地智能体”的协作工具。

## 核心功能

### 本地文件读取

- 侧边栏文件树，浏览当前项目。
- 点击文本文件，按 Markdown 代码块插入。
- 点击图片、PDF、二进制文件，自动模拟拖拽上传。
- 支持 `@filename` 自动补全和模糊搜索。
- 支持“当前目录结构”快捷命令。
- 支持插入历史和撤销。
- 支持 `.gitignore` 过滤。
- 支持文件监听，IDE 里改了文件后索引会更新。
- 支持切换最近工作目录。

### Bridge：让网页 AI 指挥 Claude Code

- 点击启动后，网页 AI 的回复可以自动发送给 Claude Code。
- Claude Code 在本地项目里改文件、读文件、跑命令。
- 执行过程显示在左侧“Claude Code 过程”抽屉里。
- 可以手动确认 Claude Code 结果后再发回网页 AI。
- 也可以开启全自动，让网页 AI 和 Claude Code 循环协作。
- 随时可以直接给 Claude Code 发消息，绕过网页 AI。
- 默认按工作目录保存 Claude Code 会话。
- 停止 Bridge 不会丢失 Claude 上下文。
- 需要清空上下文时，点“新会话”。
- 如果旧 session 失效，会自动新建会话并重试。

### 交互体验

- `Ctrl+Shift+F` 打开或关闭侧边栏。
- 悬浮按钮可拖动。
- 右侧侧边栏保持清爽，主要放文件、搜索、开关。
- 左侧过程抽屉显示详细执行日志。
- 过程抽屉底部可以直接给 Claude Code 发送消息。

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

### 在网页 AI 里读取文件

1. 打开 Qwen、ChatGPT、Gemini 或 Claude。
2. 点击 WebToAgent 悬浮按钮，或按 `Ctrl+Shift+F`。
3. 设置或切换工作目录。
4. 点击文件，内容会自动插入聊天框。
5. 也可以在聊天框里输入 `@文件名` 快速搜索。

### 插入当前目录结构

点击快捷命令：

```text
当前目录结构
```

它会插入一个 Markdown 风格的项目目录树，让 AI 先理解项目结构，再继续读取具体文件。

## Bridge 用法

1. 打开 WebToAgent 侧边栏。
2. 在 Bridge 区域点击 **启动**。
3. 左侧会弹出 **Claude Code 过程** 抽屉。
4. 正常向网页 AI 提问，比如让它分析代码、制定修改方案。
5. 如果开启“全自动发送（网页 AI 回复后自动转给 Claude）”，网页 AI 的最新回复会自动转给 Claude Code。
6. 在过程抽屉里查看 Claude Code 的工具调用、命令输出和最终结果。
7. 结果可以手动发回网页 AI；开启“全自动发送（Claude 回复后自动给网页）”后也可以自动发回。
8. 点击 **停止** 可以暂停 Bridge。

停止 Bridge 不会清空 Claude Code 的上下文。同一个工作目录再次启动时，会优先继续上次 Claude Code 会话。

如果你想让 Claude Code 忘掉之前的上下文，点击过程抽屉里的 **新会话**。

## Bridge 控件说明

| 控件 | 作用 |
|---|---|
| 启动 / 停止 | 启动或停止 Bridge 监听 |
| 全自动发送（网页 AI 回复后自动转给 Claude） | 网页 AI 回复后自动转给 Claude Code |
| 全自动发送（Claude 回复后自动给网页） | Claude Code 返回结果后自动发回网页 AI |
| 显示过程 / 隐藏过程 | 展开或收起左侧 Claude Code 过程抽屉 |
| 新会话 | 清空当前工作目录保存的 Claude Code 会话 |
| 直接对 Claude 说 | 不经过网页 AI，直接给 Claude Code 下指令 |

## 两种文件访问模式

| 模式 | 适合场景 | 说明 |
|---|---|---|
| 本地服务模式 | 日常使用、Bridge、稳定读取项目目录 | 需要安装 Node.js 和本地服务 |
| 浏览器文件系统 API | 临时读取文件、不想安装服务 | 浏览器重启后可能要重新授权 |

本地服务不可用时，WebToAgent 会尽量降级到浏览器文件系统 API。

## 常见问题

### Bridge 显示未启动，但 CMD 窗口还在

到 `chrome://extensions` 刷新扩展，再刷新 AI 网站页面。Chrome MV3 的后台 Service Worker 会休眠重启，WebToAgent 会在侧边栏打开时重新同步状态。

### 直接发给 Claude 时提示 No conversation found with session ID

这是旧 Claude session 失效了。现在 WebToAgent 会自动清掉旧 session，并用同一条消息重试。你也可以手动点 **新会话**。

### Claude Code 好像卡住了

先看左侧过程抽屉。如果长时间没有新工具调用，可能是 Claude Code 在等权限或登录。可以在终端里运行：

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
