# AI File Reader

[中文](./README_CN.md) | English

Let web-based AI chatbots (Qwen, ChatGPT, Gemini, Claude) read your local files — just like an IDE agent.

## Two Modes

| | Native Service | Browser Mode |
|---|---|---|
| Experience | Fully automatic, works on page load | Requires re-authorization after browser restart |
| Setup | Needs Node.js + run install script | Zero install |
| How it works | Extension reads files via a local Node.js process | Uses the browser's built-in File System Access API |
| Best for | Daily use, switching between projects | Quick one-off use |

Both modes have identical features. The extension automatically falls back to browser mode when the native service is unavailable.

## Install

### Step 1: Load the Extension (required for both modes)

1. Open Chrome, go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this project folder

### Step 2 (optional): Install Native Service

Requires [Node.js](https://nodejs.org) v14+, then:

**Double-click `安装本地服务.bat` in the project root**

The script will ask you to paste your extension ID (copy it from chrome://extensions), then automatically complete the registration. Restart Chrome when done.

> If you skip the native service, browser mode still works — open any supported site, click the 📁 button, and select a folder in the sidebar.

## Usage

After opening a supported site, a 📁 button appears at the bottom-right:

| Action | Effect |
|--------|--------|
| Click 📁 button | Open file tree sidebar, browse and click files to insert |
| Type `@filename` | Fuzzy search, select to insert file content into chat |
| Type `@foldername` | Batch-load all files in a directory (up to 50 files / 5MB) |

File content is inserted as markdown code blocks with automatic language detection.

## Supported Sites

- chat.qwen.ai (Qwen)
- chatgpt.com (ChatGPT)
- gemini.google.com (Gemini)
- claude.ai (Claude)

## Uninstall

- Extension: Remove from `chrome://extensions`
- Native service: Double-click `卸载本地服务.bat`

## License

MIT
