# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI File Reader 是一个 Chrome 扩展 (Manifest V3)，让网页端 AI 聊天界面能像 IDE 一样读取本地文件。支持通义千问、ChatGPT、Gemini、Claude 四个网站。

## Development

无构建步骤。纯 vanilla JavaScript，无打包工具、无框架、无依赖（扩展部分）。

**加载扩展进行测试：**
1. `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择项目根目录
2. 修改代码后在扩展页面点击刷新图标，然后刷新目标网页

**测试 Native Host：**
```bash
cd native-host
echo '{"action":"ping"}' | node -e "process.stdin.resume(); setTimeout(()=>{const b=Buffer.alloc(4);b.writeUInt32LE(15);process.stdout.write(b);process.stdout.write('{\"action\":\"ping\"}')},100)" | node host.js
```

## Architecture

三层通信架构：

```
content.js (注入到AI网站) 
  ↕ chrome.runtime.sendMessage
background.js (Service Worker, 消息路由)
  ↕ Native Messaging (4-byte LE length + JSON)
native-host/host.js (Node.js, 读取本地文件系统)
```

降级路径：Native Messaging 不可用时，通过 File System Access API 在浏览器内直接读取（需用户授权文件夹）。

### 关键模块职责

- **background.js** — 唯一与 native host 通信的入口，所有文件操作请求经此中转
- **lib/file-access.js** — 统一抽象层，content script 通过它访问文件，不关心底层是 native 还是 FSAPI
- **lib/file-tree.js** — Shadow DOM 封装的文件树侧边栏，懒加载目录
- **lib/autocomplete.js** — 监听输入框中的 `@` 字符触发文件搜索下拉
- **adapters/** — 每个支持的网站一个适配器，处理各站点不同的输入框 DOM 结构和事件派发

### 适配器模式

所有适配器继承 `BaseAdapter`，必须实现：
- `getHostname()` — 返回匹配的域名
- `getInputElement()` — 返回当前页面的聊天输入元素（textarea 或 contenteditable div）

`BaseAdapter` 提供通用的文本插入逻辑（处理 textarea vs contenteditable，React/Vue 状态同步）。

### 消息协议

content script → background.js 的消息类型：`FS_STATUS`, `FS_LIST`, `FS_READ`, `FS_STAT`, `FS_LIST_ALL`, `FS_SET_ROOT`, `FS_GET_ROOT`

background.js → native host 的 action：`ping`, `list`, `read`, `stat`, `list_all`, `set_root`, `get_root`

### Native Host 安全约束

- 所有路径操作限制在配置的 rootDir 内（path traversal 防护）
- 只读，无写入/执行能力
- 文件大小硬限制 1MB
- 默认忽略 `.git`, `node_modules` 等目录

## Adding a New Site Adapter

1. 在 `adapters/` 下创建新文件，继承 `BaseAdapter`
2. 实现 `getHostname()` 和 `getInputElement()`（用浏览器 DevTools 找到输入框选择器）
3. 如果站点使用特殊编辑器（ProseMirror 等），覆写 `_insertIntoContentEditable`
4. 在 `manifest.json` 的 `content_scripts.matches` 和 `host_permissions` 中添加 URL 模式
5. 在 `manifest.json` 的 `content_scripts.js` 数组中添加新适配器文件（在 `content.js` 之前）
6. 在 `content.js` 的 `ADAPTERS` 数组中实例化新适配器

## CSS Conventions

- 所有注入到宿主页面的元素使用 `aifr-` 前缀
- 文件树面板使用 Shadow DOM 隔离样式
- 配色基于 Catppuccin Mocha 主题
