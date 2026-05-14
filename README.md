# AI File Reader

[中文](./README_CN.md) | English

Let web-based AI chatbots (Qwen, ChatGPT, Gemini, Claude) read your local files — just like an IDE agent.

## Features

- **File Tree Sidebar** — Browse your project, click to insert files into chat
- **@ Commands** — Type `@filename` for fuzzy search, `@foldername` to batch-load an entire directory
- **Auto File Watching** — Edit files in your IDE, the index updates automatically
- **.gitignore Support** — Respects your project's ignore rules out of the box
- **Quick Templates** — Save frequently used prompts, insert with one click
- **Keyboard Shortcut** — `Ctrl+Shift+F` to toggle the file panel
- **Draggable Button** — Move the 📁 button anywhere, position is remembered
- **Status Indicator** — Green/yellow/red dot shows connection state at a glance
- **Cross-tab Sync** — File index is shared between tabs, no redundant scanning
- **Insert History** — See what you've added this session, undo with one click

## Two Modes

| | Native Service | Browser Mode |
|---|---|---|
| Experience | Fully automatic, works on page load | Requires re-authorization after browser restart |
| Setup | Node.js + double-click install script | Zero install |
| How it works | Extension reads files via a local Node.js process | Browser's built-in File System Access API |
| Best for | Daily use, switching between projects | Quick one-off use |

Both modes have identical features. Falls back to browser mode automatically when native service is unavailable.

## Install

### Step 1: Load the Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select this project folder

### Step 2 (optional): Install Native Service

Requires [Node.js](https://nodejs.org) v14+

**Double-click `安装本地服务.bat` in the project root**

Paste your extension ID when prompted → done. Restart Chrome.

> Without native service, browser mode still works — click 📁 on any supported site and select a folder.

## Usage

| Action | Effect |
|--------|--------|
| Click 📁 (or `Ctrl+Shift+F`) | Open/close file tree sidebar |
| Click a file in the tree | Insert file content into chat input |
| Type `@filename` | Fuzzy search → select → insert |
| Type `@foldername` | Batch-load entire directory (up to 50 files / 5MB) |
| Drag the 📁 button | Reposition it anywhere on the page |
| Quick Templates (sidebar bottom) | One-click insert saved prompts |

File content is inserted as markdown code blocks with automatic language detection.

### Status Dot

The small dot on the 📁 button tells you the connection state:
- 🟢 Green — Native service connected
- 🟡 Yellow — Browser mode active
- 🔴 Red — Not configured (click to set up)

### Insert History

The sidebar shows "已添加 (N)" at the top — a list of files you've inserted this session. Click "撤销" next to any file to undo.

## Supported Sites

- chat.qwen.ai (Qwen)
- chatgpt.com (ChatGPT)
- gemini.google.com (Gemini)
- claude.ai (Claude)

## Uninstall

- Extension: Remove from `chrome://extensions`
- Native service: Double-click `卸载本地服务.bat`

> You only need to uninstall the native service if you want to completely remove the extension from your system, or if you need to re-register with a different extension ID. Normal code updates do NOT require reinstalling — just click the refresh button on `chrome://extensions`.

## FAQ

**Q: I updated the code, do I need to reinstall?**

No. Just click the refresh icon (↻) on your extension card in `chrome://extensions`, then refresh the AI website page.

**Q: When do I need to run the install script again?**

Only if:
- You changed the extension ID (e.g., deleted and re-loaded the extension)
- You moved the project folder to a different location

**Q: When do I need to run the uninstall script?**

Only if:
- You want to completely remove the extension and clean up the system registry
- You're switching to a different copy/version of the extension with a new ID

## License

MIT
