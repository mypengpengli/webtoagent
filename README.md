<p align="center">
  <img src="./icons/icon128.png" width="96" height="96" alt="WebToAgent icon">
</p>

<h1 align="center">WebToAgent</h1>

<p align="center"><strong>Frontier intelligence. Local execution.</strong></p>

<p align="center">
  Let web AI supervise Claude Code inside your local project.
</p>

<p align="center">
  <a href="./README_CN.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Claude Code bridge" src="https://img.shields.io/badge/Bridge-Claude_Code-D97757">
  <img alt="Windows and macOS" src="https://img.shields.io/badge/Native_Host-Windows_%7C_macOS-0078D4">
  <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-2ea44f">
</p>

WebToAgent connects a web AI conversation to your local files and Claude Code. Use a capable web model for research, architecture, planning, and review; let the local coding agent edit files, run commands, test, and debug; then return the result to the web model for the next decision.

> **The strongest model does not need to write every line of code. It can think, supervise, and review while a local agent does the iterative work.**

## Why I Built This

Modern AI-assisted development is split across two useful but disconnected environments.

### Web AI is a strong researcher and reviewer

ChatGPT, Claude, Gemini, Qwen, and similar web products can combine strong reasoning with capabilities such as web search, long context, current documentation, and GitHub browsing. Depending on the product and permissions available, a web model can study a repository, compare implementation options, read issues and pull requests, and produce a detailed plan.

This makes the web model useful as a senior engineer, architect, or reviewer.

### A local coding agent can keep executing

Claude Code can work in the real local checkout: read files, edit code, run tools, inspect failures, and repeat. That execution loop may involve many files, commands, test runs, and corrections.

The local agent does not need to independently rediscover every architectural decision if it receives a precise plan and useful context. It needs to execute well, report what happened, and accept the next correction.

This makes the local agent useful as the implementation engine.

### The missing piece is the loop

Without a bridge, you repeatedly copy plans, files, command output, and results between a browser and a terminal. Context goes stale, long tasks become tedious to supervise, and it is difficult to keep the web model involved after implementation starts.

WebToAgent closes that loop.

## The Idea

```text
Frontier web AI
  -> search, understand, plan, review
  -> WebToAgent
  -> Claude Code in the selected local project
  -> read, edit, run, test, debug
  -> WebToAgent
  -> web AI reviews the result and decides what comes next
```

In short:

```text
Think remotely. Execute locally. Review continuously.
```

The web model focuses on high-leverage judgment. The local agent handles high-volume implementation work.

## Example Workflow

1. You are developing a project locally and have pushed the stable repository state to GitHub.
2. In ChatGPT, Claude, Gemini, Qwen, or AI Studio, you ask the web model to inspect the repository, research the relevant documentation, diagnose a problem, and write a concrete implementation plan.
3. For uncommitted code or temporary files, you insert live local context with the WebToAgent file tree, `@file`, `@folder`, or a directory snapshot.
4. With web-to-Claude auto-send enabled, WebToAgent forwards the web model's instructions to Claude Code in the selected working directory. You can also send your own instruction through the direct-message input.
5. Claude Code edits the project, runs commands, tests, and debugs. Its tool activity and final response appear in the WebToAgent process panel.
6. You review the result before returning it to the web model, or enable automatic return when the environment and task are trusted.
7. The web model reviews the outcome, corrects the approach, or produces the next task. The cycle can continue without manual copy and paste.

## Why GitHub Matters

A web model cannot normally inspect an arbitrary folder on your computer. WebToAgent uses two complementary sources of context:

| Context | Best source |
|---|---|
| Committed repository history, README, issues, pull requests, and public project context | GitHub, when the selected web AI can browse it |
| Uncommitted changes, temporary files, local assets, and the current directory structure | WebToAgent local file access |

> **GitHub provides repository-level context. WebToAgent provides live local context.**

WebToAgent does not include a GitHub API client. GitHub research is performed by the web AI itself when that product supports browsing or search.

## Why Local Execution Matters Now

Local and lower-cost models are increasingly capable of following detailed engineering instructions, using tools, and iterating on failures. They do not have to equal the supervising web model at open-ended research or architectural judgment to be useful.

> **An execution model does not need frontier-level judgment for every step when a stronger model is planning and reviewing the work.**

The current WebToAgent release integrates with **Claude Code**. WebToAgent invokes the existing `claude` CLI and uses whatever model, provider, authentication, and permission configuration that CLI already has. WebToAgent does not install a model or configure a local inference server by itself.

## Why This Can Cost Less

A conventional frontier-agent loop may spend premium model tokens on every read, edit, command, error, retry, and test. WebToAgent makes a different division of labor possible:

```text
Capable web model:  fewer, high-value planning and review turns
Local coding agent: many implementation and debugging iterations
```

If your Claude Code environment uses a local or lower-cost backend, the high-volume execution loop does not continuously add frontier API token charges. Even when Claude Code uses a paid provider, separating planning, execution, and review lets you choose the appropriate model and cost profile for each role.

**Lower cost does not mean zero cost.** Web subscriptions, API/provider usage, hardware, electricity, and engineering time may still cost money. The goal is to avoid using the most expensive intelligence for every mechanical iteration.

## What WebToAgent Does

### Web AI to Claude Code

- Starts Claude Code in the selected local working directory.
- Detects completed web AI replies and forwards them to Claude Code when web-to-Claude auto-send is enabled.
- Streams Claude Code reasoning events, tool calls, tool results, and final output into a process panel.
- Returns the final result to the web chat after manual confirmation or through an optional automatic path.
- Supports direct instructions to Claude Code without routing the message through the web model.
- Preserves a Claude Code session per working directory and provides an explicit **New session** action.
- Lets you stop the Bridge and terminate the active local task.
- Keeps the process panel visible independently from the file sidebar, with a resizable saved width.

### Web AI to Local Files

- Browses the selected project through a right-side file tree.
- Inserts text files as Markdown code blocks with language detection.
- Uploads images, PDFs, and other binary assets through the current site's upload interaction when supported.
- Searches files with `@filename` and batch-loads folders with `@folder`.
- Inserts a Markdown snapshot of the current directory structure.
- Applies built-in exclusions and project `.gitignore` rules in native mode.
- Watches file changes and refreshes the index automatically in native mode.
- Shares the latest file index across open tabs.
- Provides recent directories, reusable quick prompts, insertion history, and one-click undo.

## Supported Integrations

### Web AI Sites

| Service | URL |
|---|---|
| Qwen | `https://chat.qwen.ai/*` |
| ChatGPT | `https://chatgpt.com/*` |
| Google AI Studio | `https://aistudio.google.com/*` |
| Gemini | `https://gemini.google.com/*` |
| Claude | `https://claude.ai/*` |

Site adapters depend on page DOM structure. A redesign by a supported site may temporarily break reply detection, message insertion, or uploads until its adapter is updated.

### Local Coding Agents

| Agent | Status |
|---|---|
| Claude Code | Supported |
| Codex CLI, OpenCode, and other agents | Planned; not supported by the current release |

## Requirements

For local file browsing only:

- Chrome or a Chromium-based desktop browser with File System Access API support.

For Claude Code Bridge and persistent native file access:

- Node.js 18 or newer.
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/getting-started) installed, authenticated, and working from a terminal.
- Windows or macOS. Native host installation scripts are included for both.

Install Claude Code with the currently documented npm method:

```bash
npm install -g @anthropic-ai/claude-code
claude
```

Complete authentication in Claude Code before starting the Bridge.

## Installation

### 1. Get the Source

```bash
git clone https://github.com/mypengpengli/webtoagent.git
cd webtoagent
```

You can also download the repository as a ZIP and extract it.

### 2. Load the Chrome Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository root, which contains `manifest.json`.
5. Copy the extension ID shown by Chrome. The native host installer will ask for it.

### 3. Install the Native Host

The native host is optional for browser-only file access, but required for Claude Code Bridge.

#### Windows

Double-click:

```text
安装本地服务.bat
```

Paste the extension ID when prompted.

#### macOS

Run from the repository root:

```bash
chmod +x install-native-host.sh uninstall-native-host.sh native-host/host.sh
./install-native-host.sh
```

Paste the extension ID when prompted.

Restart Chrome after installation, then open a supported AI site.

## Usage

### Start a Bridge Session

1. Open a supported web AI site.
2. Click the WebToAgent floating button or press `Ctrl+Shift+F`.
3. Select the local working directory.
4. In the **Bridge** section, click **Start**.
5. Ask the web AI to research, plan, review, or produce a detailed implementation instruction.
6. Forward the reply to Claude Code. With web-to-Claude auto-send enabled, new web AI replies are forwarded automatically.
7. Follow Claude Code's commands and tool results in the left process panel.
8. Review the result and send it back to the web AI, or enable Claude-to-web auto-send for a controlled task.
9. Click **Stop** to stop Bridge monitoring and terminate an active local task.

Stopping the Bridge does not erase the saved Claude Code session. Starting again in the same working directory attempts to resume it. Use **New session** when you want a clean Claude Code conversation.

### Send a Direct Local Task

Use **Direct message** to instruct Claude Code without first asking the web AI. WebToAgent starts the Bridge automatically if needed.

### Add Live Local Context

- Click a text file to insert it into the current chat draft.
- Click an image, PDF, or binary asset to upload it when supported by the site.
- Type `@` followed by part of a file or folder name for fuzzy search.
- Use **Current directory structure** to insert a Markdown project tree.

### Bridge Controls

| Control | Effect |
|---|---|
| Start / Stop | Start Bridge monitoring or stop the active Bridge task |
| Web AI -> Claude Code auto-send | Forward a new web AI reply to Claude Code automatically |
| Claude Code -> web AI auto-send | Insert and send the local agent result to the web chat automatically |
| Show / Hide process | Toggle the Claude Code execution panel |
| Hide / Show directory | Toggle only the right-side file panel |
| New session | Clear the saved Claude Code session for the current working directory |
| Direct message | Send an instruction straight to Claude Code |

### Keyboard Behavior

- `Ctrl+Shift+F`: open or close WebToAgent.
- `Enter`: send from the direct-message input.
- `Shift+Enter`: add a new line in the direct-message input.
- `@`: start file or folder search in the web chat input.

## Native and Browser Modes

| | Native service | Browser mode |
|---|---|---|
| Claude Code Bridge | Yes | No |
| Persistent directory access | Yes | May require reauthorization after restart |
| File watching | Yes | No automatic native watcher |
| Recent local paths and system folder picker | Yes | Browser folder picker |
| Best for | Full WebToAgent workflow | Quick local context insertion |

If the native host is unavailable, file reading can fall back to browser mode. Bridge operations still require the native host.

## Security Model

WebToAgent joins a web conversation to a local coding agent, so the Bridge must be treated as privileged automation.

### File Access

- You select the working root.
- Native file-read requests are checked against that root to prevent path traversal.
- Common generated directories, hidden paths, and `.gitignore` matches are filtered from file browsing and indexing.
- Text files are limited to 5 MB; binary reads are limited to 10 MB; batch context insertion is bounded.

### Agent Execution

- Bridge launches Claude Code with the selected project as its working directory.
- Claude Code may read and modify files, run commands, and access other resources according to its own configuration and permission policy.
- The file browser's root-path restriction does **not** sandbox Claude Code. Use Claude Code permissions and operating-system isolation appropriate to the project.
- Manual result review is safer than full auto mode. Enable both auto-send directions only for trusted tasks, repositories, web content, and model outputs.
- Web pages and browsed content can contain prompt injection. Treat instructions derived from untrusted pages, issues, repositories, and documents as untrusted input before forwarding them to a local agent.
- Do not expose credentials, private keys, production data, or sensitive configuration unless the task explicitly requires them and the execution environment is appropriately isolated.

## Architecture

```text
Supported web AI page
  |  site adapter: read replies, insert messages, upload selected files
  v
content.js + lib/file-tree.js
  |  Chrome runtime messages
  v
background.js (Manifest V3 service worker)
  |  Chrome Native Messaging
  v
native-host/host.js
  |  spawns `claude` in the selected working directory
  v
Claude Code -> configured model/provider -> local tools and project files
```

The file-access path is abstracted by `lib/file-access.js`: it uses the native host when connected and the browser File System Access API as a read-only fallback.

The Bridge invokes Claude Code with streaming JSON output, relays progress events to the extension, and saves a Claude Code session ID per working directory for resumption.

## Troubleshooting

### Bridge reports that it is not started

Reload the extension at `chrome://extensions`, refresh the AI page, select a working directory, and start Bridge again. Chrome Manifest V3 service workers can restart while idle, so the extension resynchronizes Bridge status when the page reconnects.

### `claude` cannot be found or Bridge does not launch

Run `claude` directly in a terminal first. Complete installation and authentication, then restart Chrome so the native host inherits the correct environment.

### `No conversation found with session ID`

The saved Claude Code session is stale. WebToAgent clears a stale session and retries once automatically. You can also select **New session** manually.

### Claude Code appears stuck

Open the process panel and check the most recent event. Claude Code may be waiting for authentication, permission approval, tool output, or a long-running command. Stop the Bridge if you need to terminate the active process.

### A file or folder is missing

Check whether it is hidden, ignored by `.gitignore`, part of a built-in ignored directory, outside the selected root, or above a file/index limit.

### Do updates require reinstalling the native host?

Usually no. Pull the latest code, refresh the extension at `chrome://extensions`, and reload the AI page. Reinstall only when the extension ID, repository location, or native host registration changes.

## Roadmap

- **More local agents:** adapters for Codex CLI, OpenCode, and other coding agents.
- **Agent configuration:** explicit selection of executors, models, providers, and permission profiles.
- **Safer automation:** review gates, command policies, scoped capabilities, and clearer provenance for forwarded instructions.
- **Better task loops:** structured tasks, completion criteria, retry policies, and review checkpoints.
- **Context synchronization:** clearer coordination between GitHub state, live local changes, web AI context, and agent sessions.
- **More web AI adapters:** support additional web models without coupling the Bridge to one provider.

The long-term goal is a model-independent bridge: use the best available web model for judgment and the most suitable local agent for execution.

## Contributing

Issues and pull requests are welcome. When reporting a site integration problem, include the site, browser version, failing action, console error, and whether native or browser mode was active. Do not include private project files, credentials, or conversation content.

For a new web AI integration, add a site adapter under `adapters/`, register its URL and script in `manifest.json`, and test reply detection, message insertion, text context, and binary upload separately.

## Uninstall

- Remove WebToAgent from `chrome://extensions`.
- Windows: double-click `卸载本地服务.bat`.
- macOS: run `./uninstall-native-host.sh`.

## License

MIT
