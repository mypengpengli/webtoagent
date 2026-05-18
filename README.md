# WebToAgent

English | [中文](./README_CN.md)

WebToAgent is a Chrome extension that connects web AI chat pages with your local project files and Claude Code. It gives ChatGPT, Qwen, Gemini, or Claude a practical way to read project context, then lets a local coding agent execute the work.

Use the web model as the planner. Use Claude Code as the local worker.

## What It Does

- Browse local project files inside supported AI websites.
- Click files to insert them as Markdown code blocks.
- Upload images and binary assets from the sidebar.
- Use `@filename` fuzzy search inside the chat input.
- Send web AI replies to Claude Code automatically.
- Watch Claude Code work in a built-in process drawer, with tool calls and results shown in real time.
- Send Claude Code's result back to the web AI manually or automatically.
- Keep Claude Code conversation context per working directory.

## Why Use It

Web AI products often have strong reasoning, search, and large context windows, but they cannot directly inspect or edit your local project. Local coding agents can read files, edit code, and run commands, but you may still want a stronger web model to review, plan, or coordinate the work.

WebToAgent bridges that gap:

1. The web AI reviews the problem and gives instructions.
2. WebToAgent forwards those instructions to Claude Code.
3. Claude Code edits files and runs commands locally.
4. WebToAgent shows the full process and returns the result to the web AI.
5. The loop can continue until you stop it.

It also works as a simple file reader even when you do not use Bridge.

## Core Features

### File Reader

- File tree sidebar for the current project.
- One-click text file insertion.
- Image/PDF/binary upload by simulated drag-and-drop.
- Directory structure quick insert.
- Insert history with undo.
- `.gitignore` support.
- File watcher for automatic index refresh.
- Recent working directory switching.

### Bridge: Web AI to Claude Code

- Start/stop Bridge from the sidebar.
- Separate auto-send options for web AI -> Claude Code and Claude Code -> web AI.
- Manual mode: review Claude Code output before sending it back.
- Direct message box for talking to Claude Code at any time.
- Built-in process drawer for detailed execution logs.
- Per-directory Claude Code session memory.
- "New session" button when you want to reset Claude context.
- Automatic recovery when an old Claude session ID is no longer valid.

### User Experience

- `Ctrl+Shift+F` toggles the sidebar.
- Draggable floating button.
- Search, quick prompts, and directory-structure insertion.
- Clean sidebar for files and controls.
- Separate process drawer for the detailed Claude Code timeline.

## Supported Sites

- `https://chat.qwen.ai/*`
- `https://chatgpt.com/*`
- `https://gemini.google.com/*`
- `https://claude.ai/*`

## Requirements

For file browsing only:

- Chrome or a Chromium-based browser.

For the full native service and Bridge:

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

### Read Files in Web AI

1. Open Qwen, ChatGPT, Gemini, or Claude.
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

## Bridge Workflow

1. Open the sidebar.
2. Click **Start** in the Bridge section.
3. The Claude Code process drawer opens on the left.
4. Ask the web AI for a coding plan or review.
5. If "web AI -> Claude Code" auto-send is enabled, the web AI's latest reply is forwarded to Claude Code.
6. Watch Claude Code's tool calls, command output, and final result in the process drawer.
7. Send the result back to the web AI manually, or enable "Claude Code -> web AI" auto-send.
8. Click **Stop** when you want to pause the loop.

Stopping Bridge does not erase Claude Code's conversation context. When you start again in the same working directory, WebToAgent tries to resume the previous Claude Code session.

Use **New session** in the process drawer when you want Claude Code to forget the previous conversation and start fresh.

## Bridge Controls

| Control | Meaning |
|---|---|
| Start / Stop | Start or stop Bridge monitoring |
| Auto send: web AI -> Claude Code | Automatically forward web AI replies to Claude Code |
| Auto send: Claude Code -> web AI | Automatically send Claude Code results back to the web AI |
| Show process | Show or hide the built-in Claude Code process drawer |
| New session | Clear the saved Claude Code session for this working directory |
| Direct message | Send your own instruction directly to Claude Code |

## Native vs Browser Mode

| Mode | Best For | Notes |
|---|---|---|
| Native service | Daily use, Bridge, stable directory access | Requires Node.js and native host install |
| Browser File System API | Quick file reading without install | May require re-authorization after restart |

If the native host is unavailable, WebToAgent can still fall back to browser-based folder access.

## Troubleshooting

### Bridge says it is not started, but a CMD window is open

Reload the extension at `chrome://extensions`, refresh the AI website, then start Bridge again. Chrome MV3 service workers can restart, so WebToAgent syncs state when the sidebar opens.

### Direct send fails with "No conversation found with session ID"

The saved Claude Code session is stale. WebToAgent now clears that stale session and retries automatically. You can also click **New session** manually.

### Claude Code seems stuck

Open the process drawer. If no new tool calls appear for a long time, Claude Code may be waiting for permission or authentication. Run `claude login` in a terminal if needed.

### I changed code. Do I need to reinstall the native service?

Usually no. Click refresh on the extension card in `chrome://extensions`, then refresh the AI website.

Reinstall the native service only if the extension ID, native host name, or install location changed.

## Uninstall

- Remove the extension in `chrome://extensions`.
- Double-click `卸载本地服务.bat` to unregister the native host.

## License

MIT
