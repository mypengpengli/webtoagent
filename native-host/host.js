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

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    rootDir = config.rootDir || '';
    recentRoots = config.recentRoots || [];
  } catch {
    rootDir = '';
    recentRoots = [];
  }
}

function saveConfig() {
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ rootDir, recentRoots }, null, 2));
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

function claudeStart(options = {}) {
  if (!rootDir) {
    return { success: false, error: 'Please set a working directory first' };
  }
  claudeRunning = true;
  isFirstSend = true;
  claudeDebugLogPath = '';
  claudeDebugCmdPath = '';

  if (options.debugWindow) {
    startClaudeDebugWindow();
  }

  return { success: true, rootDir, debugWindow: Boolean(claudeDebugLogPath) };
}

function claudeStop() {
  claudeRunning = false;
  if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
  if (claudeProc) {
    killProcessTree(claudeProc.pid);
    claudeProc = null;
  }
  writeClaudeDebugLog('');
  writeClaudeDebugLog('[bridge] stopped');
  return { success: true };
}

function startClaudeDebugWindow() {
  if (process.platform !== 'win32') return;

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    claudeDebugLogPath = path.join(os.tmpdir(), `aifr-claude-bridge-${stamp}.log`);
    claudeDebugCmdPath = path.join(os.tmpdir(), `aifr-claude-bridge-${stamp}.cmd`);

    fs.writeFileSync(claudeDebugLogPath, [
      'Claude Code Bridge Debug',
      `Working directory: ${rootDir}`,
      `Started: ${new Date().toLocaleString()}`,
      '',
      'Waiting for Claude Code activity...',
      ''
    ].join(os.EOL), 'utf8');

    const escapedLogPath = claudeDebugLogPath.replace(/'/g, "''");
    const cmdContent = [
      '@echo off',
      'chcp 65001 >nul',
      'title Claude Code Bridge Debug',
      'echo Claude Code Bridge Debug',
      `echo Log: ${claudeDebugLogPath}`,
      'echo.',
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath '${escapedLogPath}' -Wait -Encoding UTF8"`,
      ''
    ].join('\r\n');
    fs.writeFileSync(claudeDebugCmdPath, cmdContent, 'utf8');

    const escapedCmdPath = claudeDebugCmdPath.replace(/'/g, "''");
    const psCommand = `Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', '"${escapedCmdPath}"') -WindowStyle Normal`;
    const opener = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      psCommand
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    opener.unref();
  } catch {
    claudeDebugLogPath = '';
    claudeDebugCmdPath = '';
  }
}

function writeClaudeDebugLog(text) {
  if (!claudeDebugLogPath) return;
  try {
    fs.appendFileSync(claudeDebugLogPath, String(text) + os.EOL, 'utf8');
  } catch {}
}

function truncateDebugText(text, max = 2000) {
  if (!text) return '';
  const normalized = String(text).replace(/\r\n/g, '\n').trim();
  return normalized.length > max ? normalized.slice(0, max) + '...' : normalized;
}

function writeClaudeDebugEvent(event) {
  if (!claudeDebugLogPath || !event) return;

  if (event.type === 'assistant' && event.message && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type === 'text' && block.text) {
        writeClaudeDebugLog(`[assistant] ${truncateDebugText(block.text)}`);
      } else if (block.type === 'tool_use') {
        writeClaudeDebugLog(`[tool] ${block._summary || getToolSummary(block.name, block.input)}`);
      }
    }
    return;
  }

  if (event.type === 'user' && event.message && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type === 'tool_result' && block.content) {
        const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
        writeClaudeDebugLog(`[tool result] ${truncateDebugText(content)}`);
      }
    }
    return;
  }

  if (event.type === 'result') {
    writeClaudeDebugLog(`[result] ${truncateDebugText(event.result || '')}`);
    return;
  }

  writeClaudeDebugLog(`[event] ${event.type || 'unknown'}`);
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

function claudeSend(message) {
  if (!claudeRunning) {
    return { success: false, error: 'Bridge not started' };
  }
  if (!rootDir) {
    return { success: false, error: 'Working directory not set' };
  }
  if (claudeProc) {
    return { success: false, error: 'Previous task still running' };
  }

  let prompt = message;
  if (isFirstSend) {
    isFirstSend = false;
    prompt = `[System] You are an automated code executor. Follow instructions precisely. When the task is fully complete, end your response with <<<DONE>>>. Do not add pleasantries.\n\n${message}`;
  }

  writeClaudeDebugLog('');
  writeClaudeDebugLog('===== Claude Code task started =====');
  writeClaudeDebugLog(`[time] ${new Date().toLocaleString()}`);
  writeClaudeDebugLog(`[cwd] ${rootDir}`);
  writeClaudeDebugLog(`[prompt] ${truncateDebugText(prompt)}`);
  writeClaudeDebugLog('');

  const args = ['-p', prompt, '--output-format', 'stream-json', '--max-turns', '10', '--verbose'];
  if (claudeSessionId) {
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
    env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'native-host' }
  });
  claudeProc = proc;

  function resetTimeout() {
    if (claudeTimeout) clearTimeout(claudeTimeout);
    claudeTimeout = setTimeout(() => {
      if (claudeProc) {
        killProcessTree(claudeProc.pid);
        claudeProc = null;
        writeClaudeDebugLog('[error] Claude Code timeout (10 minutes without activity)');
        if (!doneSent) {
          doneSent = true;
          sendMessage({ type: 'BRIDGE_DONE', success: false, error: 'Claude Code 超时 (10分钟无活动)' });
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
        if (event.session_id) claudeSessionId = event.session_id;
        if (event.type === 'result') resultText = event.result || '';
      } catch {
        writeClaudeDebugLog(`[raw] ${truncateDebugText(line)}`);
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    resetTimeout();
    const text = chunk.toString();
    stderr += text;
    writeClaudeDebugLog(`[stderr] ${truncateDebugText(text)}`);
  });

  proc.on('close', (code) => {
    claudeProc = null;
    if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
    if (doneSent) return;
    doneSent = true;
    if (code !== 0 && !resultText) {
      writeClaudeDebugLog(`[done] failed: ${translateError(stderr, code)}`);
      sendMessage({ type: 'BRIDGE_DONE', success: false, error: translateError(stderr, code) });
    } else {
      writeClaudeDebugLog(`[done] success`);
      sendMessage({ type: 'BRIDGE_DONE', success: true, text: resultText || '(no output)', sessionId: claudeSessionId });
    }
  });

  proc.on('error', (err) => {
    claudeProc = null;
    if (claudeTimeout) { clearTimeout(claudeTimeout); claudeTimeout = null; }
    writeClaudeDebugLog(`[error] ${translateError(err.message, null)}`);
    sendMessage({ type: 'BRIDGE_DONE', success: false, error: translateError(err.message, null) });
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

function translateError(errText, code) {
  if (!errText) return `Exit code ${code}`;
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

    case 'claude_send':
      if (!msg.message) return { success: false, error: 'Message required' };
      return claudeSend(msg.message);

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
