# WebToAgent

[中文](./README_CN.md) | English

WebToAgent is a Chrome extension that connects **web AI chat pages, local project files, GitHub/web search, and Claude Code**.

In plain language: use the web model as the project brain, and use Claude Code as the local executor.

Inside Qwen, ChatGPT, Gemini, or Claude, you can read local project files, insert directory structure, upload assets, and forward the web AI's answer to Claude Code. The web AI can use its own search, browsing, GitHub reading, and reasoning abilities to decide what should be done. Claude Code then performs the work in your local project.

## Why This Exists

Web AI products are good at:

- Strong reasoning and planning.
- Searching the web and reading documentation.
- Looking at GitHub repositories, issues, PRs, and discussions when the site supports browsing.
- Reviewing tradeoffs before code is changed.

Local coding agents are good at:

- Reading your actual working tree.
- Editing files.
- Running commands and checking results.
- Executing long coding tasks with a local or lower-cost model.

The problem is that these two sides are usually disconnected. Web AI cannot directly use your local files, and local executors do not always have the best planning or search ability. WebToAgent bridges that gap.

## Typical Workflow

1. Ask the web AI to analyze a feature, bug, or refactor.
2. The web AI can use search, GitHub pages, documentation, and files inserted by WebToAgent.
3. WebToAgent forwards the web AI's instructions to Claude Code.
4. Claude Code edits files, runs commands, and reports results locally.
5. WebToAgent shows the full process in a built-in process panel.
6. The result can be sent back to the web AI for the next round of review.

The loop looks like this:

```text
Web AI: search, understand, plan, review
        ↓
WebToAgent: pass context, show process, manage files
        ↓
Claude Code: read files, edit code, run commands
```

## Good Use Cases

- Let a web model read GitHub README/issues/PRs first, then guide Claude Code to modify your local project.
- Let the web model search current API docs, then have Claude Code update your code with the latest usage.
- Let a stronger model review architecture and code, while a local or lower-cost model executes the edits.
- Insert local files and directory structure into a web AI without copy-paste.
- Run a web AI -> Claude Code -> web AI loop for debugging, refactoring, and implementation tasks.
- Watch the execution timeline and interrupt with your own direct message whenever needed.

## Core Features

### Local File Reader

- Browse your project in a right-side file tree.
- Click text files to insert them as Markdown code blocks.
- Click images, PDFs, or binary assets to upload them.
- Type `@filename` to quickly search and insert files.
- Insert the current directory structure as a Markdown tree.
- Respect `.gitignore` to reduce noise.
- Watch file changes and refresh the index automatically.
- Switch working directories from recent paths or the native folder picker.

### Bridge: Web AI to Claude Code

- Start Bridge from the sidebar.
- Forward web AI replies to Claude Code automatically.
- Let Claude Code read files, edit files, and run commands locally.
- View the detailed execution timeline in the Claude Code process panel.
- Review Claude Code output manually before sending it back to the web AI.
- Enable full auto mode when you want the loop to continue by itself.
- Send a direct message to Claude Code at any time, without going through the web AI.
- Preserve Claude Code sessions per working directory.
- Start a new session when you want Claude Code to forget previous context.

### User Experience

- `Ctrl+Shift+F` toggles the WebToAgent sidebar.
- The right panel keeps files, search, switches, and quick commands.
- The left process panel shows the detailed Claude Code timeline.
- The process panel can stay visible while the directory panel is hidden.
- The process panel width is resizable and remembered.
- The process panel input uses `Enter` to send and `Shift+Enter` for a new line.

## Supported Sites

- `https://chat.qwen.ai/*`
- `https://chatgpt.com/*`
- `https://aistudio.google.com/*`
- `https://gemini.google.com/*`
- `https://claude.ai/*`

## Requirements

For file browsing only:

- Chrome or a Chromium-based browser.

For the native service and Bridge:

- Node.js 14+
- Claude Code installed and logged in
- Windows install script is included

Install Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

## Installation

### 1. Load the Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this project folder.
5. Copy the extension ID shown by Chrome.

### 2. Install the Native Host

Double-click:

```text
安装本地服务.bat
```

Paste the extension ID when prompted.

The installer writes the Native Messaging manifest and registers:

```text
com.webtoagent.host
```

Then restart Chrome and open a supported AI website.

## Basic Usage

### Read Local Files in Web AI

1. Open Qwen, ChatGPT, AI Studio, Gemini, or Claude.
2. Click the WebToAgent floating button or press `Ctrl+Shift+F`.
3. Select or switch your working directory.
4. Click a file to insert it into the chat.
5. Use the search box or type `@filename` in the chat input for faster access.

### Insert Current Directory Structure

Use the quick command:

```text
Current directory structure
```

It inserts a Markdown-style project tree so the AI understands the repository layout before reading individual files.

### Use Web Search and GitHub

If your web AI supports search or browsing, give it GitHub repositories, issues, PRs, or documentation links. Let it understand the outside context first.

Then use WebToAgent to insert local files, or let Bridge forward the web AI's conclusion to Claude Code. The web model handles research and judgment. Claude Code handles local execution.

## Bridge Workflow

1. Open the WebToAgent sidebar.
2. Click **Start** in the Bridge section.
3. The **Claude Code process** panel opens on the left.
4. Ask the web AI for a coding plan, review, or fix.
5. If "web AI -> Claude Code" auto-send is enabled, the web AI's latest reply is forwarded to Claude Code.
6. Watch Claude Code's tool calls, command output, and final result in the process panel.
7. Send the result back to the web AI manually, or enable "Claude Code -> web AI" auto-send.
8. Click **Stop** when you want to pause Bridge.

Stopping Bridge does not erase Claude Code's conversation context. When you start again in the same working directory, WebToAgent tries to resume the previous Claude Code session.

Use **New session** in the process panel when you want Claude Code to forget the previous conversation and start fresh.

## Bridge Controls

| Control | Meaning |
|---|---|
| Start / Stop | Start or stop Bridge monitoring |
| Auto send: web AI -> Claude Code | Automatically forward web AI replies to Claude Code |
| Auto send: Claude Code -> web AI | Automatically send Claude Code results back to the web AI |
| Show process / Hide process | Show or hide the Claude Code process panel |
| Hide directory / Show directory | Hide only the right-side directory panel while keeping the process panel |
| New session | Clear the saved Claude Code session for this working directory |
| Direct message | Send your own instruction directly to Claude Code |

## Native vs Browser Mode

| Mode | Best For | Notes |
|---|---|---|
| Native service | Daily use, Bridge, stable directory access | Requires Node.js and native host install |
| Browser File System API | Quick file reading without install | May require re-authorization after restart |

If the native host is unavailable, WebToAgent can still fall back to browser-based folder access.

## Troubleshooting

### Do I have to use Bridge?

No. WebToAgent is useful as a file reader by itself: click files, insert directory structure, upload images, and search project files from the web AI page.

### Why does Bridge say "not started" when a CMD window is open?

Reload the extension at `chrome://extensions`, refresh the AI website, then start Bridge again. Chrome MV3 service workers can restart, so WebToAgent syncs state when the sidebar opens.

### Why does direct send fail with "No conversation found with session ID"?

The saved Claude Code session is stale. WebToAgent clears that stale session and retries automatically. You can also click **New session** manually.

### Why does Claude Code seem stuck?

Open the process panel. If no new tool calls appear for a long time, Claude Code may be waiting for permission or authentication. Run `claude login` in a terminal if needed.

### Do I need to reinstall the native service after updating code?

Usually no. Click refresh on the extension card in `chrome://extensions`, then refresh the AI website.

Reinstall the native service only if the extension ID, native host name, or install location changed.

## Uninstall

- Remove the extension in `chrome://extensions`.
- Double-click `卸载本地服务.bat` to unregister the native host.

## License

MIT
