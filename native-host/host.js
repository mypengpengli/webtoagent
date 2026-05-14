const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg', '__pycache__', '.idea', '.vscode', 'dist', 'build', '.next']);

let rootDir = '';

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    rootDir = config.rootDir || '';
  } catch {
    rootDir = '';
  }
}

function saveConfig() {
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ rootDir }, null, 2));
}

function isPathSafe(requestedPath) {
  if (!rootDir) return false;
  const resolved = path.resolve(rootDir, requestedPath);
  return resolved.startsWith(path.resolve(rootDir));
}

function getAbsolutePath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function listDirectory(dirPath) {
  const absPath = dirPath ? getAbsolutePath(dirPath) : rootDir;
  if (!isPathSafe(dirPath || '.')) {
    return { success: false, error: 'Path outside root directory' };
  }

  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;

      result.push({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: dirPath ? path.join(dirPath, entry.name).replace(/\\/g, '/') : entry.name
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
  if (!isPathSafe(filePath)) {
    return { success: false, error: 'Path outside root directory' };
  }

  const absPath = getAbsolutePath(filePath);

  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE) {
      return { success: false, error: `File too large: ${(stat.size / 1024).toFixed(1)}KB (max 1MB)`, size: stat.size };
    }

    const content = fs.readFileSync(absPath, 'utf8');
    return { success: true, content, size: stat.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function statFile(filePath) {
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

function listAllFiles(dirPath, depth, maxDepth) {
  if (depth > maxDepth) return [];
  const absPath = dirPath ? getAbsolutePath(dirPath) : rootDir;
  const files = [];

  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const relativePath = dirPath ? path.join(dirPath, entry.name).replace(/\\/g, '/') : entry.name;

      if (entry.isDirectory()) {
        files.push(...listAllFiles(relativePath, depth + 1, maxDepth));
      } else {
        files.push(relativePath);
      }
    }
  } catch {}

  return files;
}

function handleMessage(msg) {
  loadConfig();

  switch (msg.action) {
    case 'list':
      return listDirectory(msg.path || '');

    case 'read':
      if (!msg.path) return { success: false, error: 'Path required' };
      return readFile(msg.path);

    case 'stat':
      if (!msg.path) return { success: false, error: 'Path required' };
      return statFile(msg.path);

    case 'list_all':
      if (!rootDir) return { success: false, error: 'Root directory not configured' };
      const files = listAllFiles('', 0, msg.maxDepth || 5);
      return { success: true, files };

    case 'set_root':
      if (!msg.path) return { success: false, error: 'Path required' };
      const newRoot = path.resolve(msg.path);
      if (!fs.existsSync(newRoot) || !fs.statSync(newRoot).isDirectory()) {
        return { success: false, error: 'Directory does not exist' };
      }
      rootDir = newRoot;
      saveConfig();
      return { success: true, rootDir };

    case 'get_root':
      return { success: true, rootDir };

    case 'ping':
      return { success: true, version: '1.0.0' };

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
    process.stdin.on('end', () => reject(new Error('stdin closed')));
  });
}

function sendMessage(msg) {
  const json = JSON.stringify(msg);
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(json.length, 0);
  process.stdout.write(buf);
  process.stdout.write(json);
}

async function main() {
  process.stdin.resume();

  while (true) {
    try {
      const msg = await readMessage();
      const response = handleMessage(msg);
      sendMessage(response);
    } catch (err) {
      if (err.message === 'stdin closed') break;
      sendMessage({ success: false, error: err.message });
    }
  }
}

main();
