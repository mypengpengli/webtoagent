const fs = require('fs');
const path = require('path');

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
