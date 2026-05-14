class FileAccess {
  constructor() {
    this.mode = 'disconnected';
    this.rootDir = '';
    this.fileIndex = [];
    this.dirHandle = null;
  }

  async initialize() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_STATUS' });
      if (response.success) {
        this.mode = response.mode;
        this.rootDir = response.rootDir || '';
      }
    } catch {
      this.mode = 'disconnected';
    }
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

  async listAllFiles(maxDepth) {
    if (this.mode === 'native') {
      const response = await chrome.runtime.sendMessage({ type: 'FS_LIST_ALL', maxDepth });
      if (response.success) {
        this.fileIndex = response.files;
      }
      return response;
    }
    if (this.mode === 'filesystem-api' && this.dirHandle) {
      const files = await this._listAllViaFSAPI(this.dirHandle, '', 0, maxDepth || 5);
      this.fileIndex = files;
      return { success: true, files };
    }
    return { success: false, error: 'Not connected' };
  }

  async setRoot(path) {
    const response = await chrome.runtime.sendMessage({ type: 'FS_SET_ROOT', path });
    if (response.success) {
      this.rootDir = response.rootDir || path;
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

  // File System Access API fallback methods
  async requestDirectoryAccess() {
    try {
      this.dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      this.mode = 'filesystem-api';
      this.rootDir = this.dirHandle.name;
      return { success: true, rootDir: this.dirHandle.name };
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

      if (file.size > 1024 * 1024) {
        return { success: false, error: `File too large: ${(file.size / 1024).toFixed(1)}KB`, size: file.size };
      }

      const content = await file.text();
      return { success: true, content, size: file.size };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _listAllViaFSAPI(dirHandle, prefix, depth, maxDepth) {
    if (depth > maxDepth) return [];
    const files = [];
    const ignored = new Set(['.git', 'node_modules', '.svn', '__pycache__', 'dist', 'build']);

    try {
      for await (const [name, entry] of dirHandle.entries()) {
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
