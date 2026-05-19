// IndexedDB helpers for persisting FileSystemDirectoryHandle
const IDB_NAME = 'aifr-storage';
const IDB_STORE = 'handles';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

class FileAccess {
  constructor() {
    this.mode = 'disconnected';
    this.rootDir = '';
    this.fileIndex = [];
    this.dirHandle = null;
    this._indexChannel = null;
    this._setupBroadcast();
  }

  _setupBroadcast() {
    try {
      this._indexChannel = new BroadcastChannel('aifr-index');
      this._indexChannel.onmessage = (e) => {
        if (e.data.type === 'INDEX_UPDATE' && e.data.files) {
          this.fileIndex = e.data.files;
        }
      };
    } catch {}
  }

  _broadcastIndex() {
    if (this._indexChannel && this.fileIndex.length > 0) {
      try {
        this._indexChannel.postMessage({ type: 'INDEX_UPDATE', files: this.fileIndex });
      } catch {}
    }
  }

  async initialize() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_STATUS' });
      if (response.success) {
        if (response.mode === 'native') {
          this.mode = 'native';
          this.rootDir = response.rootDir || '';
          return this.mode;
        }
      }
    } catch {}

    // Native not available, try to restore FSA handle from IndexedDB
    try {
      const savedHandle = await idbGet('dirHandle');
      if (savedHandle) {
        const perm = await savedHandle.queryPermission({ mode: 'read' });
        if (perm === 'granted') {
          this.dirHandle = savedHandle;
          this.mode = 'filesystem-api';
          this.rootDir = savedHandle.name;
          return this.mode;
        }
        // Permission is 'prompt' — store handle but wait for user gesture to activate
        this.dirHandle = savedHandle;
      }
    } catch {}

    this.mode = 'disconnected';
    return this.mode;
  }

  async listDirectory(path) {
    if (this.mode === 'native') {
      return await chrome.runtime.sendMessage({ type: 'FS_LIST', path });
    }
    if (this.mode === 'filesystem-api' && this.dirHandle) {
      return await this._listViaFSAPI(path);
    }
    return { success: false, error: 'Not connected' };
  }

  async readFile(path) {
    if (this.mode === 'native') {
      return await chrome.runtime.sendMessage({ type: 'FS_READ', path });
    }
    if (this.mode === 'filesystem-api' && this.dirHandle) {
      return await this._readViaFSAPI(path);
    }
    return { success: false, error: 'Not connected' };
  }

  async readBinary(path) {
    if (this.mode === 'native') {
      return await chrome.runtime.sendMessage({ type: 'FS_READ_BINARY', path });
    }
    if (this.mode === 'filesystem-api' && this.dirHandle) {
      return await this._readBinaryViaFSAPI(path);
    }
    return { success: false, error: 'Not connected' };
  }

  async listAllFiles(maxDepth) {
    if (this.mode === 'native') {
      const response = await chrome.runtime.sendMessage({ type: 'FS_LIST_ALL', maxDepth });
      if (response.success) {
        this.fileIndex = response.files;
        this._broadcastIndex();
      }
      return response;
    }
    if (this.mode === 'filesystem-api' && this.dirHandle) {
      const files = await this._listAllViaFSAPI(this.dirHandle, '', 0, maxDepth || 8);
      this.fileIndex = files;
      this._broadcastIndex();
      return { success: true, files };
    }
    return { success: false, error: 'Not connected' };
  }

  async setRoot(path) {
    const response = await chrome.runtime.sendMessage({ type: 'FS_SET_ROOT', path });
    if (response.success) {
      this.rootDir = response.rootDir || path;
      this.fileIndex = [];
    }
    return response;
  }

  async pickRoot() {
    const response = await chrome.runtime.sendMessage({ type: 'FS_PICK_ROOT' });
    if (response.success) {
      this.mode = 'native';
      this.rootDir = response.rootDir;
      this.fileIndex = [];
    }
    return response;
  }

  async getRoot() {
    const response = await chrome.runtime.sendMessage({ type: 'FS_GET_ROOT' });
    if (response.success) {
      this.rootDir = response.rootDir;
    }
    return response;
  }

  getMode() {
    return this.mode;
  }

  getDirIndex() {
    const dirs = new Set();
    for (const file of this.fileIndex) {
      const parts = file.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    return Array.from(dirs);
  }

  getFilesInDir(dirPath) {
    const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    return this.fileIndex.filter(f => f.startsWith(prefix));
  }

  async readDirectory(dirPath, maxFiles = 50, maxTotalSize = 5 * 1024 * 1024) {
    const files = this.getFilesInDir(dirPath);
    if (files.length === 0) {
      return { success: false, error: '文件夹为空或不存在' };
    }

    // Use batch read for native mode
    if (this.mode === 'native') {
      const batch = files.slice(0, maxFiles);
      const response = await chrome.runtime.sendMessage({ type: 'FS_READ_BATCH', paths: batch });
      if (response.success) {
        return {
          success: true,
          files: response.files,
          totalFiles: files.length,
          loadedFiles: response.files.length,
          totalSize: response.totalSize
        };
      }
    }

    // Fallback: sequential reads
    const results = [];
    let totalSize = 0;

    for (const filePath of files) {
      if (results.length >= maxFiles) break;
      if (totalSize >= maxTotalSize) break;

      const result = await this.readFile(filePath);
      if (result.success) {
        totalSize += result.size;
        results.push({ path: filePath, content: result.content, size: result.size });
      }
    }

    return {
      success: true,
      files: results,
      totalFiles: files.length,
      loadedFiles: results.length,
      totalSize
    };
  }

  // File System Access API fallback methods
  async requestDirectoryAccess() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      this.dirHandle = handle;
      this.mode = 'filesystem-api';
      this.rootDir = handle.name;
      this.fileIndex = [];
      await idbSet('dirHandle', handle);
      return { success: true, rootDir: handle.name };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _listViaFSAPI(relativePath) {
    try {
      let handle = this.dirHandle;
      if (relativePath) {
        const parts = relativePath.split('/').filter(Boolean);
        for (const part of parts) {
          handle = await handle.getDirectoryHandle(part);
        }
      }

      const entries = [];
      for await (const [name, entry] of handle.entries()) {
        if (name.startsWith('.') || ['node_modules', '.git'].includes(name)) continue;
        entries.push({
          name,
          type: entry.kind === 'directory' ? 'directory' : 'file',
          path: relativePath ? `${relativePath}/${name}` : name
        });
      }

      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, entries };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _readViaFSAPI(relativePath) {
    try {
      const parts = relativePath.split('/').filter(Boolean);
      let handle = this.dirHandle;

      for (let i = 0; i < parts.length - 1; i++) {
        handle = await handle.getDirectoryHandle(parts[i]);
      }

      const fileHandle = await handle.getFileHandle(parts[parts.length - 1]);
      const file = await fileHandle.getFile();

      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: `File too large: ${(file.size / 1024).toFixed(1)}KB`, size: file.size };
      }

      const content = await file.text();
      return { success: true, content, size: file.size };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _readBinaryViaFSAPI(relativePath) {
    try {
      const parts = relativePath.split('/').filter(Boolean);
      let handle = this.dirHandle;

      for (let i = 0; i < parts.length - 1; i++) {
        handle = await handle.getDirectoryHandle(parts[i]);
      }

      const fileHandle = await handle.getFileHandle(parts[parts.length - 1]);
      const file = await fileHandle.getFile();

      if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'File too large (max 10MB)', size: file.size };
      }

      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return { success: true, data: base64, size: file.size, mimeType: file.type || 'application/octet-stream' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _listAllViaFSAPI(dirHandle, prefix, depth, maxDepth) {
    if (depth >= maxDepth) return [];
    const files = [];
    const ignored = new Set(['.git', 'node_modules', '.svn', '__pycache__', 'dist', 'build']);
    const maxFiles = 5000;

    try {
      for await (const [name, entry] of dirHandle.entries()) {
        if (files.length >= maxFiles) break;
        if (name.startsWith('.') || ignored.has(name)) continue;
        const path = prefix ? `${prefix}/${name}` : name;

        if (entry.kind === 'directory') {
          const subFiles = await this._listAllViaFSAPI(entry, path, depth + 1, maxDepth);
          files.push(...subFiles);
        } else {
          files.push(path);
        }
      }
    } catch {}

    return files;
  }
}
