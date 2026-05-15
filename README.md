# AI File Reader

[中文](./README_CN.md) | English

A Chrome extension that lets web-based AI chatbots read your local files and orchestrate local coding agents — turning the best frontier models into project managers for your local tools.

## Why This Extension?

**Use the strongest models to guide cheaper ones.**

Web-based AI (ChatGPT, Claude, Gemini) always runs the latest, most capable models — with internet access, tool use, and massive context windows. But API-based coding agents (like Claude Code with Qwen-27B, DeepSeek, or local models) are much cheaper to run.

With the **Bridge** feature, you can:
- Let a frontier web model (GPT-4o, Claude Opus, Gemini) act as the **architect**
- Let your local/cheap API model act as the **executor** (editing files, running tests)
- The web model gives high-level instructions, the local model does the grunt work
- Result: better output than the cheap model alone, at a fraction of the cost

**Even without Bridge**, this extension saves you tons of copy-paste:
- Click a file → instantly inserted into chat as a code block
- Click an image → uploaded as an attachment automatically
- Click a folder → all files loaded at once
- No more dragging, uploading, or manual copy-paste

## Features

**File Access**
- File tree sidebar — browse and click to insert
- @ commands — `@filename` fuzzy search, `@foldername` batch-load
- Image/binary upload — click to auto-upload via drag simulation
- Auto file watching — edit in IDE, index updates automatically
- .gitignore support — respects your project's ignore rules

**Bridge (AI ↔ Claude Code)**
- Web AI replies → automatically sent to local Claude Code
- Claude Code executes (edit files, run commands) → result sent back to web AI
- Real-time progress log in sidebar (see every tool call as it happens)
- Full auto or manual confirmation mode
- Runs for as long as needed — no timeout, you control when to stop

**UX**
- Keyboard shortcut `Ctrl+Shift+F`
- Draggable 📁 button with status indicator
- Insert history with undo
- Quick prompt templates
- Cross-tab file index sync

## Two Modes

| | Native Service | Browser Mode |
|---|---|---|
| Experience | Fully automatic, works on page load | Requires re-authorization after browser restart |
| Setup | Node.js + double-click install script | Zero install |
| How it works | Extension reads files via a local Node.js process | Browser's built-in File System Access API |
| Best for | Daily use, Bridge feature, switching projects | Quick one-off use |

Falls back to browser mode automatically when native service is unavailable.

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

### File Operations

| Action | Effect |
|--------|--------|
| Click 📁 (or `Ctrl+Shift+F`) | Open/close file tree sidebar |
| Click a file | Insert content as markdown code block |
| Click an image/PDF | Auto-upload as attachment |
| Type `@filename` | Fuzzy search → select → insert |
| Type `@foldername` | Batch-load entire directory |
| Drag the 📁 button | Reposition anywhere on page |

### Bridge (Web AI ↔ Local Claude Code)

1. Open sidebar → click **Bridge: 启动**
2. Chat with the web AI normally (give it a coding task)
3. When the AI replies, Bridge automatically sends the reply to your local Claude Code
4. Claude Code executes the task (you see real-time progress in sidebar)
5. Result appears in sidebar → click "发送到网页" to send back (or enable auto-send)
6. Web AI sees the result and gives next instructions → loop continues
7. Click **停止** whenever you want to end

**Tips:**
- Check "全自动发送" for fully autonomous operation
- Check "显示 CMD 调试窗口" to see Claude Code's terminal
- The sidebar log shows every tool call in real-time (💭 thinking, 🔧 tool use, ✓ result)

## Supported Sites

- chat.qwen.ai (Qwen)
- chatgpt.com (ChatGPT)
- gemini.google.com (Gemini)
- claude.ai (Claude)

## Uninstall

- Extension: Remove from `chrome://extensions`
- Native service: Double-click `卸载本地服务.bat`

> Normal code updates do NOT require reinstalling — just click refresh on `chrome://extensions`.

## FAQ

**Q: Do I need Claude Code installed for the Bridge feature?**

Yes. Install it globally: `npm install -g @anthropic-ai/claude-code`, then run `claude login` once.

**Q: Can I use a cheap model as the local executor?**

Yes — configure Claude Code to use any model (Qwen-27B, DeepSeek, etc.) via its settings. The web AI provides the intelligence, the local model just follows instructions.

**Q: I updated the code, do I need to reinstall?**

No. Just click the refresh icon (↻) on your extension card in `chrome://extensions`, then refresh the AI website.

**Q: The Bridge seems stuck / not responding?**

Check the sidebar log. If it shows no activity for a long time, Claude Code might be waiting for permission. Open a terminal and check if there's a `claude` process running.

## License

MIT
