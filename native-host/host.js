const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LIST_ALL_FILES = 5000;
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg', '__pycache__', '.idea', '.vscode', 'dist', 'build', '.next', '.cache', 'vendor', 'target', '.venv', 'venv']);

let rootDir = '';
let recentRoots = [];
let watcher = null;
let watchDebounce = null;
let gitignoreRules = [];
let claudeSessions = {};

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    rootDir = config.rootDir || '';
    recentRoots = config.recentRoots || [];
    claudeSessions = config.claudeSessions || {};
  } catch {
    rootDir = '';
    recentRoots = [];
    claudeSessions = {};
  }
}

function saveConfig() {
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ rootDir, recentRoots, claudeSessions }, null, 2));
}

function addToRecent(dir) {
  recentRoots = recentRoots.filter(r => r !== dir);
  recentRoots.unshift(dir);
  if (recentRoots.length > 10) recentRoots.length = 10;
}

// .gitignore support
function loadGitignore() {
  gitignoreRules = [];
  if (!rootDir) return;
  const gitignorePath = path.join(rootDir, '.gitignore');
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    gitignoreRules = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(pattern => {
        const isNegation = pattern.startsWith('!');
        if (isNegation) pattern = pattern.slice(1);
        const isDir = pattern.endsWith('/');
        if (isDir) pattern = pattern.slice(0, -1);
        const regex = patternToRegex(pattern);
        return { regex, isNegation, isDir };
      });
  } catch {}
}

function patternToRegex(pattern) {
  let re = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`(^|/)${re}($|/)`);
}

function isGitignored(relativePath, isDirectory) {
  let ignored = false;
  for (const rule of gitignoreRules) {
    if (rule.isDir && !isDirectory) continue;
    if (rule.regex.test(relativePath)) {
      ignored = !rule.isNegation;
    }
  }
  return ignored;
}

function shouldIgnore(name, relativePath, isDirectory) {
  if (IGNORED_DIRS.has(name) && isDirectory) return true;
  if (name.startsWith('.') && name !== '.gitignore') return true;
  if (gitignoreRules.length > 0 && isGitignored(relativePath || name, isDirectory)) return true;
  return false;
}

function isPathSafe(requestedPath) {
  if (!rootDir) return false;
  const resolved = path.resolve(rootDir, requestedPath);
  const root = path.resolve(rootDir);
  const relative = path.relative(root, resolved);
  if (!relative) return true;
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  return true;
}

function getAbsolutePath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function listDirectory(dirPath) {
  if (!rootDir) {
    return { success: false, error: 'Root directory not configured. Please set a working directory in the extension popup.' };
  }
  const absPath = dirPath ? getAbsolutePath(dirPath) : rootDir;
  if (dirPath && !isPathSafe(dirPath)) {
    return { success: false, error: 'Path outside root directory' };
  }

  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      const relPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
      if (shouldIgnore(entry.name, relPath, entry.isDirectory())) continue;

      result.push({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: relPath.replace(/\\/g, '/')
      });
    }

    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, entries: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function readFile(filePath) {
  if (!rootDir) {
    return { success: false, error: 'Root directory not configured' };
  }
  if (!isPathSafe(filePath)) {
    return { success: false, error: 'Path outside root directory' };
  }

  const absPath = getAbsolutePath(filePath);

  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE) {
      return { success: false, error: `File too large: ${(stat.size / 1024).toFixed(1)}KB (max 5MB)`, size: stat.size };
    }

    // Binary file detection
    const sampleSize = Math.min(8192, stat.size);
    if (sampleSize > 0) {
      const sample = Buffer.alloc(sampleSize);
      const fd = fs.openSync(absPath, 'r');
      fs.readSync(fd, sample, 0, sampleSize, 0);
      fs.closeSync(fd);

      let nullCount = 0;
      for (let i = 0; i < sampleSize; i++) {
        if (sample[i] === 0) nullCount++;
      }
      if (nullCount > sampleSize * 0.01) {
        return { success: false, error: 'Binary file', size: stat.size };
      }
    }

    const content = fs.readFileSync(absPath, 'utf8');
    return { success: true, content, size: stat.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function readBinary(filePath) {
  if (!rootDir) {
    return { success: false, error: 'Root directory not configured' };
  }
  if (!isPathSafe(filePath)) {
    return { success: false, error: 'Path outside root directory' };
  }

  const absPath = getAbsolutePath(filePath);

  try {
    const stat = fs.statSync(absPath);
    if (stat.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 10MB for binary)', size: stat.size };
    }

    const content = fs.readFileSync(absPath);
    return { success: true, data: content.toString('base64'), size: stat.size, mimeType: getMimeType(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.webm': 'video/webm'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function readBatch(paths) {
  const results = [];
  let totalSize = 0;

  for (const filePath of paths) {
    if (totalSize > MAX_FILE_SIZE) break;
    const result = readFile(filePath);
    if (result.success) {
      totalSize += result.size;
      results.push({ path: filePath, content: result.content, size: result.size });
    }
  }

  return { success: true, files: results, totalSize };
}

function statFile(filePath) {
  if (!rootDir) {
    return { success: false, error: 'Root directory not configured' };
  }
  if (!isPathSafe(filePath)) {
    return { success: false, error: 'Path outside root directory' };
  }

  const absPath = getAbsolutePath(filePath);

  try {
    const stat = fs.statSync(absPath);
    return {
      success: true,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      isDirectory: stat.isDirectory()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

let _listAllCount = 0;

function listAllFiles(dirPath, depth, maxDepth) {
  if (depth >= maxDepth) return [];
  if (_listAllCount >= MAX_LIST_ALL_FILES) return [];
  const absPath = dirPath ? getAbsolutePath(dirPath) : rootDir;
  const files = [];

  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    for (const entry of entries) {
      if (_listAllCount >= MAX_LIST_ALL_FILES) break;
      const relPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
      if (shouldIgnore(entry.name, relPath, entry.isDirectory())) continue;

      if (entry.isDirectory()) {
        files.push(...listAllFiles(relPath, depth + 1, maxDepth));
      } else {
        files.push(relPath);
        _listAllCount++;
      }
    }
  } catch {}

  return files;
}

// File watcher
function startWatcher() {
  stopWatcher();
  if (!rootDir) return;

  try {
    watcher = fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const name = path.basename(filename);
      if (IGNORED_DIRS.has(name) || name.startsWith('.')) return;

      // Debounce: batch changes within 500ms
      clearTimeout(watchDebounce);
      watchDebounce = setTimeout(() => {
        sendMessage({ type: 'FS_CHANGED', event: eventType, path: filename.replace(/\\/g, '/') });
      }, 500);
    });
  } catch {}
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

// Claude Code Bridge
let claudeSessionId = null;
let claudeRunning = false;
let claudeProc = null;
let claudeTimeout = null;
let isFirstSend = true;
let claudeDebugLogPath = '';
let claudeDebugCmdPath = '';
let _bridgeRoundCount = 0;
let _bridgeRoundStartMs = 0;

// ANSI color codes (work on Windows 10+ cmd / PowerShell with VT processing)
const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

const SEP_LINE = '═'.repeat(64);
const SUB_LINE = '─'.repeat(64);

function resetClaudeSession() {
  claudeSessionId = null;
  isFirstSend = true;
}

function loadClaudeSessionForRoot() {
  claudeSessionId = rootDir ? (claudeSessions[rootDir] || null) : null;
  isFirstSend = !claudeSessionId;
}

function saveClaudeSessionForRoot() {
  if (!rootDir || !claudeSessionId) return;
  claudeSessions[rootDir] = claudeSessionId;
  saveConfig();
}

function clearClaudeSessionForRoot() {
  if (rootDir && claudeSessions[rootDir]) {
    delete claudeSessions[rootDir];
    saveConfig();
  }
  resetClaudeSession();
}

function claudeStart(options = {}) {
  if (!rootDir) {
    return { success: false, error: 'Please set a working directory first' };
  }

  if (claudeRunning) {
    let debugWindowOpened = Boolean(claudeDebugLogPath);
    if (options.debugWindow && !debugWindowOpened) {
      debugWindowOpened = startClaudeDebugWindow();
    }
    return { ...claudeStatus(), debugWindow: debugWindowOpened };
  }

  claudeRunning = true;
  loadClaudeSessionForRoot();
  _bridgeRoundCount = 0;
  _bridgeRoundStartMs = 0;
  claudeDebugLogPath = '';
  claudeDebugCmdPath = '';

  let debugWindowOpened = false;
  if (options.debugWindow) {
    debugWindowOpened = startClaudeDebugWindow();
  }

  return { success: true, rootDir, debugWindow: debugWindowOpened };
}

function claudeStop() {
  claudeRunning = false;
  if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
  if (claudeProc) {
    killProcessTree(claudeProc.pid);
    claudeProc = null;
  }
  writeBridgeStopped();
  return { success: true };
}

function claudeNewSession() {
  if (claudeProc) {
    return { success: false, error: 'Previous task still running' };
  }
  clearClaudeSessionForRoot();
  _bridgeRoundCount = 0;
  _bridgeRoundStartMs = 0;
  writeClaudeDebugLog('[bridge] Claude session cleared; next message will start a new conversation');
  return { success: true };
}

function claudeStatus() {
  return {
    success: true,
    running: claudeRunning,
    busy: Boolean(claudeProc),
    rootDir,
    debugWindow: Boolean(claudeDebugLogPath),
    sessionId: claudeSessionId || null
  };
}

function startClaudeDebugWindow() {
  if (process.platform !== 'win32') return false;

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    claudeDebugLogPath = path.join(os.tmpdir(), `aifr-claude-bridge-${stamp}.log`);
    claudeDebugCmdPath = path.join(os.tmpdir(), `aifr-claude-bridge-${stamp}.cmd`);
    const psPath = path.join(os.tmpdir(), `aifr-claude-bridge-${stamp}.ps1`);

    const headerLines = [
      `${ANSI.brightCyan}${SEP_LINE}${ANSI.reset}`,
      `${ANSI.bold}${ANSI.brightCyan}  Claude Code Bridge — 实时对话回放${ANSI.reset}`,
      `${ANSI.brightCyan}${SEP_LINE}${ANSI.reset}`,
      `${ANSI.gray}工作目录:${ANSI.reset} ${rootDir}`,
      `${ANSI.gray}启动时间:${ANSI.reset} ${new Date().toLocaleString()}`,
      `${ANSI.gray}日志文件:${ANSI.reset} ${claudeDebugLogPath}`,
      '',
      `${ANSI.dim}等待网页 AI 产生新回复...${ANSI.reset}`,
      `${ANSI.dim}${SUB_LINE}${ANSI.reset}`,
      ''
    ];
    fs.writeFileSync(claudeDebugLogPath, headerLines.join(os.EOL), 'utf8');

    // PowerShell helper: enables VT (ANSI color) on the console, then tails the log
    const psContent = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      'try {',
      '  $signature = @"',
      '[System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError=true)]',
      'public static extern bool GetConsoleMode(System.IntPtr hConsoleHandle, out uint lpMode);',
      '[System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError=true)]',
      'public static extern bool SetConsoleMode(System.IntPtr hConsoleHandle, uint dwMode);',
      '[System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError=true)]',
      'public static extern System.IntPtr GetStdHandle(int nStdHandle);',
      '"@',
      '  $type = Add-Type -MemberDefinition $signature -Name "AifrConsole" -Namespace "Aifr" -PassThru -ErrorAction SilentlyContinue',
      '  if ($type) {',
      '    $h = $type::GetStdHandle(-11)',
      '    $m = 0',
      '    [void]$type::GetConsoleMode($h, [ref]$m)',
      '    [void]$type::SetConsoleMode($h, $m -bor 0x0004)',
      '  }',
      '} catch {}',
      `Get-Content -LiteralPath '${claudeDebugLogPath.replace(/'/g, "''")}' -Wait -Encoding UTF8`
    ].join('\r\n');
    fs.writeFileSync(psPath, psContent, 'utf8');

    const cmdContent = [
      '@echo off',
      'chcp 65001 >nul',
      'title Claude Code Bridge - 实时对话回放',
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`,
      ''
    ].join('\r\n');
    fs.writeFileSync(claudeDebugCmdPath, cmdContent, 'utf8');

    const opener = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'start', '', claudeDebugCmdPath], {
      cwd: path.dirname(claudeDebugCmdPath),
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    opener.unref();

    return true;
  } catch {
    claudeDebugLogPath = '';
    claudeDebugCmdPath = '';
    return false;
  }
}

function writeClaudeDebugLog(text) {
  if (!claudeDebugLogPath) return;
  try {
    fs.appendFileSync(claudeDebugLogPath, String(text) + os.EOL, 'utf8');
  } catch {}
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = (s - m * 60).toFixed(0);
  return `${m}m${rs}s`;
}

function indentBlock(text, prefix) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  return lines.map(line => prefix + line).join(os.EOL);
}

function truncateDebugText(text, max = 2000) {
  if (!text) return '';
  const normalized = String(text).replace(/\r\n/g, '\n').trim();
  return normalized.length > max ? normalized.slice(0, max) + '\n...(已截断)' : normalized;
}

// === Section banners for the live log ===

function bridgeSourceLabel(source) {
  return source === 'direct' ? '用户直发' : '网页 AI';
}

function writeRoundHeader(roundNo, prompt, source = 'web_ai') {
  if (!claudeDebugLogPath) return;
  _bridgeRoundStartMs = Date.now();
  const sourceLabel = bridgeSourceLabel(source);
  const lines = [
    '',
    `${ANSI.brightCyan}${SEP_LINE}${ANSI.reset}`,
    `${ANSI.bold}${ANSI.brightCyan}  ▶ 第 ${roundNo} 轮  ${ANSI.dim}${nowStamp()}${ANSI.reset}`,
    `${ANSI.brightCyan}${SEP_LINE}${ANSI.reset}`,
    '',
    `${ANSI.bold}${ANSI.brightYellow}🌐 ${sourceLabel} → Claude Code${ANSI.reset}`,
    `${ANSI.gray}${SUB_LINE}${ANSI.reset}`,
    indentBlock(truncateDebugText(prompt, 4000), `${ANSI.yellow}│${ANSI.reset} `),
    `${ANSI.gray}${SUB_LINE}${ANSI.reset}`,
    ''
  ];
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeAssistantText(text) {
  if (!claudeDebugLogPath || !text) return;
  const trimmed = truncateDebugText(text, 3000);
  const lines = [
    `${ANSI.bold}${ANSI.brightGreen}💭 Claude 思考${ANSI.reset} ${ANSI.dim}${nowStamp()}${ANSI.reset}`,
    indentBlock(trimmed, `${ANSI.green}│${ANSI.reset} `),
    ''
  ];
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeToolUse(name, input, summary) {
  if (!claudeDebugLogPath) return;
  const head = `${ANSI.bold}${ANSI.brightCyan}🔧 工具调用${ANSI.reset} ${ANSI.cyan}${name}${ANSI.reset} ${ANSI.dim}${nowStamp()}${ANSI.reset}`;
  const lines = [head, `${ANSI.cyan}│${ANSI.reset} ${summary}`];

  // Show full bash commands and edit/write content for transparency
  if (input) {
    if (name === 'Bash' && input.command) {
      lines.push(`${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}cmd:${ANSI.reset} ${truncateDebugText(input.command, 500)}`);
    } else if ((name === 'Write' || name === 'Edit') && (input.content || input.new_string)) {
      const body = input.content || input.new_string;
      lines.push(indentBlock(truncateDebugText(body, 800), `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}`) + ANSI.reset);
    }
  }
  lines.push('');
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeToolResult(content, isError) {
  if (!claudeDebugLogPath) return;
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  const color = isError ? ANSI.red : ANSI.gray;
  const icon = isError ? '✗' : '✓';
  const lines = [
    `${color}${icon} 工具返回${ANSI.reset} ${ANSI.dim}${nowStamp()}${ANSI.reset}`,
    indentBlock(truncateDebugText(text, 1200), `${color}│${ANSI.reset} ${ANSI.dim}`) + ANSI.reset,
    ''
  ];
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeRoundFooter(success, resultText, errorText) {
  if (!claudeDebugLogPath) return;
  const elapsed = _bridgeRoundStartMs ? Date.now() - _bridgeRoundStartMs : 0;
  const lines = [];

  if (success) {
    lines.push(
      '',
      `${ANSI.bold}${ANSI.brightYellow}🌐 Claude Code → 网页 AI${ANSI.reset}  ${ANSI.dim}耗时 ${formatDuration(elapsed)}${ANSI.reset}`,
      `${ANSI.gray}${SUB_LINE}${ANSI.reset}`,
      indentBlock(truncateDebugText(resultText || '(无内容)', 4000), `${ANSI.yellow}│${ANSI.reset} `),
      `${ANSI.gray}${SUB_LINE}${ANSI.reset}`,
      `${ANSI.brightGreen}✓ 第 ${_bridgeRoundCount} 轮完成${ANSI.reset}`,
      ''
    );
  } else {
    lines.push(
      '',
      `${ANSI.brightRed}✗ 第 ${_bridgeRoundCount} 轮失败${ANSI.reset}  ${ANSI.dim}耗时 ${formatDuration(elapsed)}${ANSI.reset}`,
      `${ANSI.red}${SUB_LINE}${ANSI.reset}`,
      indentBlock(errorText || '未知错误', `${ANSI.red}│${ANSI.reset} `),
      `${ANSI.red}${SUB_LINE}${ANSI.reset}`,
      ''
    );
  }
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeBridgeStopped() {
  if (!claudeDebugLogPath) return;
  const lines = [
    '',
    `${ANSI.dim}${SEP_LINE}${ANSI.reset}`,
    `${ANSI.dim}Bridge 已停止 — ${nowStamp()}${ANSI.reset}`,
    `${ANSI.dim}${SEP_LINE}${ANSI.reset}`,
    ''
  ];
  fs.appendFileSync(claudeDebugLogPath, lines.join(os.EOL) + os.EOL, 'utf8');
}

function writeClaudeDebugEvent(event) {
  if (!claudeDebugLogPath || !event) return;

  if (event.type === 'assistant' && event.message && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type === 'text' && block.text) {
        writeAssistantText(block.text);
      } else if (block.type === 'tool_use') {
        writeToolUse(block.name, block.input, block._summary || getToolSummary(block.name, block.input));
      }
    }
    return;
  }

  if (event.type === 'user' && event.message && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type === 'tool_result' && block.content) {
        writeToolResult(block.content, Boolean(block.is_error));
      }
    }
    return;
  }

  if (event.type === 'result') {
    // Final result is rendered by writeRoundFooter on close
    return;
  }

  if (event.type === 'system') {
    // Don't spam the log with system init events
    return;
  }
}

function killProcessTree(pid) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/T', '/F', '/PID', pid.toString()], { shell: true });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {}
}

function claudeSend(message, source = 'web_ai', options = {}) {
  if (!claudeRunning) {
    return { success: false, error: 'Bridge not started' };
  }
  if (!rootDir) {
    return { success: false, error: 'Working directory not set' };
  }
  if (claudeProc) {
    return { success: false, error: 'Previous task still running' };
  }

  let prompt = options.preparedPrompt || message;
  if (!options.preparedPrompt && isFirstSend) {
    isFirstSend = false;
    prompt = `[System] You are an automated code executor. Follow instructions precisely. When the task is fully complete, end your response with <<<DONE>>>. Do not add pleasantries.\n\n${message}`;
  }

  if (!options.sameRound) _bridgeRoundCount++;
  writeRoundHeader(_bridgeRoundCount, prompt, source);

  const args = ['-p', '--output-format', 'stream-json', '--max-turns', '10', '--verbose'];
  if (claudeSessionId && !options.ignoreSession) {
    args.push('--resume', claudeSessionId);
  }

  let resultText = '';
  let stderr = '';
  let lineBuffer = '';
  let doneSent = false;

  const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';

  const proc = spawn(claudeCmd, args, {
    cwd: rootDir,
    shell: true,
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'native-host' }
  });
  claudeProc = proc;

  proc.stdin.write(prompt);
  proc.stdin.end();

  function resetTimeout() {
    if (claudeTimeout) clearTimeout(claudeTimeout);
    claudeTimeout = setTimeout(() => {
      if (claudeProc) {
        killProcessTree(claudeProc.pid);
        claudeProc = null;
        writeRoundFooter(false, '', 'Claude Code 超时 (10 分钟无活动)');
        if (!doneSent) {
          doneSent = true;
          sendMessage({ type: 'BRIDGE_DONE', success: false, error: 'Claude Code 超时 (10分钟无活动)', source, round: _bridgeRoundCount });
        }
      }
    }, 10 * 60 * 1000);
  }
  resetTimeout();

  proc.stdout.on('data', (chunk) => {
    resetTimeout();
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === 'assistant' && event.message && event.message.content) {
          for (const block of event.message.content) {
            if (block.type === 'tool_use') {
              block._summary = getToolSummary(block.name, block.input);
            }
          }
        }
        writeClaudeDebugEvent(event);
        sendMessage({ type: 'BRIDGE_PROGRESS', event });
        if (event.session_id && event.session_id !== claudeSessionId) {
          claudeSessionId = event.session_id;
          saveClaudeSessionForRoot();
        }
        if (event.type === 'result') resultText = event.result || '';
      } catch {
        // ignore non-JSON lines (banners, warnings) — they go nowhere
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    resetTimeout();
    const text = chunk.toString();
    stderr += text;
  });

  proc.on('close', (code) => {
    claudeProc = null;
    if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
    if (doneSent) return;
    doneSent = true;
    if (code !== 0 && !resultText) {
      if (isMissingConversationError(stderr) && !options.retriedMissingSession) {
        const staleSessionId = claudeSessionId;
        clearClaudeSessionForRoot();
        doneSent = false;
        writeClaudeDebugLog(`[bridge] stale Claude session cleared${staleSessionId ? `: ${staleSessionId}` : ''}; retrying without --resume`);
        claudeSend(message, source, {
          preparedPrompt: prompt,
          retriedMissingSession: true,
          ignoreSession: true,
          sameRound: true
        });
        return;
      }
      const errMsg = translateError(stderr, code);
      writeRoundFooter(false, '', errMsg);
      sendMessage({ type: 'BRIDGE_DONE', success: false, error: errMsg, source, round: _bridgeRoundCount });
    } else {
      writeRoundFooter(true, resultText || '(无内容)', '');
      sendMessage({ type: 'BRIDGE_DONE', success: true, text: resultText || '(no output)', sessionId: claudeSessionId, source, round: _bridgeRoundCount });
    }
  });

  proc.on('error', (err) => {
    claudeProc = null;
    if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
    if (doneSent) return;
    doneSent = true;
    const errMsg = translateError(err.message, null);
    writeRoundFooter(false, '', errMsg);
    sendMessage({ type: 'BRIDGE_DONE', success: false, error: errMsg, source, round: _bridgeRoundCount });
  });

  return { success: true, status: 'running' };
}

function getToolSummary(name, input) {
  if (!input) return name;
  switch (name) {
    case 'Read': return `Read(${input.file_path || input.path || ''})`;
    case 'Edit': return `Edit(${input.file_path || input.path || ''})`;
    case 'Write': return `Write(${input.file_path || input.path || ''})`;
    case 'Bash': return `Bash(${(input.command || '').substring(0, 50)})`;
    case 'Grep': return `Grep(${input.pattern || ''})`;
    case 'Glob': return `Glob(${input.pattern || ''})`;
    default: return name;
  }
}

function isMissingConversationError(errText) {
  return /No conversation found with session ID/i.test(String(errText || ''));
}

function translateError(errText, code) {
  if (!errText) return `Exit code ${code}`;
  if (isMissingConversationError(errText))
    return 'Claude Code 会话已失效，请重新发送一次';
  if (errText.includes('ENOENT') || errText.includes('not recognized'))
    return '未检测到 Claude Code，请先安装 (npm install -g @anthropic-ai/claude-code)';
  if (errText.includes('Authentication') || errText.includes('auth'))
    return 'Claude Code 未登录，请在终端运行 claude login';
  if (errText.includes('rate') || errText.includes('429'))
    return '请求过快，请稍后重试';
  return errText.substring(0, 200);
}

function handleMessage(msg) {
  switch (msg.action) {
    case 'list':
      return listDirectory(msg.path || '');

    case 'read':
      if (!msg.path) return { success: false, error: 'Path required' };
      return readFile(msg.path);

    case 'read_binary':
      if (!msg.path) return { success: false, error: 'Path required' };
      return readBinary(msg.path);

    case 'read_batch':
      if (!msg.paths || !Array.isArray(msg.paths)) return { success: false, error: 'Paths array required' };
      return readBatch(msg.paths);

    case 'stat':
      if (!msg.path) return { success: false, error: 'Path required' };
      return statFile(msg.path);

    case 'list_all':
      if (!rootDir) return { success: false, error: 'Root directory not configured' };
      _listAllCount = 0;
      const files = listAllFiles('', 0, msg.maxDepth || 8);
      return { success: true, files, truncated: _listAllCount >= MAX_LIST_ALL_FILES };

    case 'set_root':
      if (!msg.path) return { success: false, error: 'Path required' };
      const newRoot = path.resolve(msg.path);
      if (!fs.existsSync(newRoot) || !fs.statSync(newRoot).isDirectory()) {
        return { success: false, error: 'Directory does not exist' };
      }
      rootDir = newRoot;
      loadClaudeSessionForRoot();
      addToRecent(newRoot);
      saveConfig();
      loadGitignore();
      startWatcher();
      return { success: true, rootDir };

    case 'get_root':
      return { success: true, rootDir };

    case 'get_recent_roots':
      return { success: true, roots: recentRoots };

    case 'watch_start':
      startWatcher();
      return { success: true };

    case 'watch_stop':
      stopWatcher();
      return { success: true };

    case 'claude_start':
      return claudeStart({ debugWindow: Boolean(msg.debugWindow) });

    case 'claude_stop':
      return claudeStop();

    case 'claude_new_session':
      return claudeNewSession();

    case 'claude_status':
      return claudeStatus();

    case 'claude_send':
      if (!msg.message) return { success: false, error: 'Message required' };
      return claudeSend(msg.message, msg.source || 'web_ai');

    case 'ping':
      return { success: true, version: '1.1.0' };

    default:
      return { success: false, error: `Unknown action: ${msg.action}` };
  }
}

// Native Messaging protocol: 4-byte LE length prefix + JSON
function readMessage() {
  return new Promise((resolve, reject) => {
    let headerBuf = Buffer.alloc(0);

    function onReadable() {
      if (headerBuf.length < 4) {
        const chunk = process.stdin.read(4 - headerBuf.length);
        if (!chunk) return;
        headerBuf = Buffer.concat([headerBuf, chunk]);
      }

      if (headerBuf.length >= 4) {
        const msgLen = headerBuf.readUInt32LE(0);
        const body = process.stdin.read(msgLen);
        if (!body) return;

        process.stdin.removeListener('readable', onReadable);
        try {
          resolve(JSON.parse(body.toString()));
        } catch (err) {
          reject(err);
        }
      }
    }

    process.stdin.on('readable', onReadable);
  });
}

function sendMessage(msg) {
  const jsonBuf = Buffer.from(JSON.stringify(msg), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length, 0);
  process.stdout.write(header);
  process.stdout.write(jsonBuf);
}

async function main() {
  process.stdin.resume();
  process.stdin.on('end', () => process.exit(0));

  while (true) {
    let msgId;
    try {
      const msg = await readMessage();
      msgId = msg._id;
      const response = handleMessage(msg);
      if (msgId !== undefined) response._id = msgId;
      sendMessage(response);
    } catch (err) {
      sendMessage({ success: false, error: err.message, _id: msgId });
    }
  }
}

loadConfig();
loadGitignore();
if (rootDir) startWatcher();
main();
