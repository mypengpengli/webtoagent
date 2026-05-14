class FileTree {
  constructor(fileAccess, onFileSelect, onUndo) {
    this.fileAccess = fileAccess;
    this.onFileSelect = onFileSelect;
    this.onUndo = onUndo;
    this.container = null;
    this.shadowRoot = null;
    this.treeData = [];
    this.visible = false;
    this.insertedFiles = [];
    this._create();
  }

  _create() {
    this.container = document.createElement('div');
    this.container.id = 'aifr-sidebar-host';
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="aifr-sidebar" id="sidebar">
        <div class="aifr-header">
          <span class="aifr-title">AI File Reader</span>
          <div class="aifr-header-actions">
            <button class="aifr-btn" id="refresh-btn" title="刷新">↻</button>
            <button class="aifr-btn" id="close-btn" title="关闭">✕</button>
          </div>
        </div>
        <div class="aifr-inserted" id="inserted-panel" style="display:none;">
          <div class="aifr-inserted-header" id="inserted-toggle">
            <span>已添加 (<span id="inserted-count">0</span>)</span>
            <button class="aifr-btn" id="inserted-clear" title="清空">✕</button>
          </div>
          <div class="aifr-inserted-list" id="inserted-list"></div>
        </div>
        <div class="aifr-search">
          <input type="text" id="search-input" placeholder="搜索文件..." />
        </div>
        <div class="aifr-status" id="status"></div>
        <div class="aifr-tree" id="tree"></div>
        <div class="aifr-templates" id="templates-panel">
          <div class="aifr-templates-header" id="templates-toggle">快捷指令</div>
          <div class="aifr-templates-list" id="templates-list"></div>
          <div class="aifr-templates-add">
            <input type="text" id="template-input" placeholder="添加常用指令..." />
            <button class="aifr-btn" id="template-add-btn">+</button>
          </div>
        </div>
        <div class="aifr-toast" id="toast"></div>
      </div>
    `;

    const sidebar = this.shadowRoot.getElementById('sidebar');
    const closeBtn = this.shadowRoot.getElementById('close-btn');
    const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
    const searchInput = this.shadowRoot.getElementById('search-input');

    closeBtn.addEventListener('click', () => this.hide());
    refreshBtn.addEventListener('click', () => this.refresh());

    const insertedClear = this.shadowRoot.getElementById('inserted-clear');
    insertedClear.addEventListener('click', (e) => {
      e.stopPropagation();
      this.insertedFiles = [];
      this._renderInserted();
    });

    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this._onSearch(e.target.value), 120);
    });

    // Templates
    const templateInput = this.shadowRoot.getElementById('template-input');
    const templateAddBtn = this.shadowRoot.getElementById('template-add-btn');
    templateAddBtn.addEventListener('click', () => this._addTemplate(templateInput));
    templateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addTemplate(templateInput);
    });
    this._loadTemplates();

    document.body.appendChild(this.container);
  }

  _getStyles() {
    return `
      .aifr-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        box-shadow: -2px 0 10px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.2s ease;
      }
      .aifr-sidebar.visible {
        transform: translateX(0);
      }
      .aifr-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #313244;
        background: #181825;
      }
      .aifr-title {
        font-weight: 600;
        font-size: 14px;
        color: #89b4fa;
      }
      .aifr-header-actions {
        display: flex;
        gap: 4px;
      }
      .aifr-btn {
        background: none;
        border: none;
        color: #a6adc8;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
      }
      .aifr-btn:hover {
        background: #313244;
        color: #cdd6f4;
      }
      .aifr-search {
        padding: 8px 12px;
        border-bottom: 1px solid #313244;
      }
      .aifr-search input {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #11111b;
        color: #cdd6f4;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      }
      .aifr-search input:focus {
        border-color: #89b4fa;
      }
      .aifr-status {
        padding: 8px 12px;
        font-size: 11px;
        color: #a6adc8;
        border-bottom: 1px solid #313244;
      }
      .aifr-status.error {
        color: #f38ba8;
      }
      .aifr-tree {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }
      .aifr-tree::-webkit-scrollbar {
        width: 6px;
      }
      .aifr-tree::-webkit-scrollbar-thumb {
        background: #45475a;
        border-radius: 3px;
      }
      .aifr-node {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
      }
      .aifr-node:hover {
        background: #313244;
      }
      .aifr-node-icon {
        margin-right: 6px;
        font-size: 12px;
        width: 16px;
        text-align: center;
        flex-shrink: 0;
      }
      .aifr-node-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .aifr-node.directory .aifr-node-icon {
        color: #f9e2af;
      }
      .aifr-node.file .aifr-node-icon {
        color: #89b4fa;
      }
      .aifr-children {
        margin-left: 16px;
      }
      .aifr-loading {
        padding: 4px 12px;
        color: #a6adc8;
        font-style: italic;
        margin-left: 16px;
      }
      .aifr-empty {
        padding: 20px;
        text-align: center;
        color: #6c7086;
      }
      .aifr-toast {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        padding: 10px 14px;
        background: #313244;
        border: 1px solid #45475a;
        border-radius: 8px;
        font-size: 12px;
        color: #cdd6f4;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
        z-index: 10;
      }
      .aifr-toast.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .aifr-toast.success {
        border-color: #a6e3a1;
      }
      .aifr-toast.error {
        border-color: #f38ba8;
      }
      .aifr-inserted {
        border-bottom: 1px solid #313244;
      }
      .aifr-inserted-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        font-size: 12px;
        color: #a6adc8;
        cursor: pointer;
      }
      .aifr-inserted-header:hover {
        background: #313244;
      }
      .aifr-inserted-list {
        max-height: 120px;
        overflow-y: auto;
      }
      .aifr-inserted-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 12px;
        font-size: 12px;
      }
      .aifr-inserted-item:hover {
        background: #313244;
      }
      .aifr-inserted-item .name {
        color: #a6e3a1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .aifr-inserted-item .undo {
        color: #f38ba8;
        cursor: pointer;
        margin-left: 8px;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .aifr-inserted-item .undo:hover {
        background: #45475a;
      }
      .aifr-templates {
        border-top: 1px solid #313244;
        padding: 8px 0;
        flex-shrink: 0;
      }
      .aifr-templates-header {
        padding: 6px 12px;
        font-size: 11px;
        color: #6c7086;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .aifr-templates-list {
        max-height: 100px;
        overflow-y: auto;
      }
      .aifr-template-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 12px;
        font-size: 12px;
        cursor: pointer;
        color: #cdd6f4;
      }
      .aifr-template-item:hover {
        background: #313244;
      }
      .aifr-template-item .del {
        color: #6c7086;
        cursor: pointer;
        padding: 0 4px;
        font-size: 10px;
      }
      .aifr-template-item .del:hover {
        color: #f38ba8;
      }
      .aifr-templates-add {
        display: flex;
        gap: 4px;
        padding: 6px 12px;
      }
      .aifr-templates-add input {
        flex: 1;
        padding: 4px 8px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #11111b;
        color: #cdd6f4;
        font-size: 11px;
        outline: none;
        box-sizing: border-box;
      }
      .aifr-templates-add input:focus {
        border-color: #89b4fa;
      }
    `;
  }

  showToast(message, type = 'success', duration = 3000) {
    const toast = this.shadowRoot.getElementById('toast');
    toast.textContent = message;
    toast.className = `aifr-toast visible ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = 'aifr-toast';
    }, duration);
  }

  recordInsert(filePath, content) {
    this.insertedFiles.push({ path: filePath, content, time: Date.now() });
    this._renderInserted();
  }

  _renderInserted() {
    const panel = this.shadowRoot.getElementById('inserted-panel');
    const list = this.shadowRoot.getElementById('inserted-list');
    const count = this.shadowRoot.getElementById('inserted-count');

    if (this.insertedFiles.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    count.textContent = this.insertedFiles.length;

    list.innerHTML = this.insertedFiles.map((f, i) => {
      const name = f.path.split('/').pop();
      return `
        <div class="aifr-inserted-item">
          <span class="name" title="${f.path}">${name}</span>
          <span class="undo" data-index="${i}">撤销</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.undo').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const removed = this.insertedFiles[idx];
        this.insertedFiles.splice(idx, 1);
        this._renderInserted();
        if (this.onUndo && removed) {
          this.onUndo(removed.content);
        }
        this.showToast('已从聊天框撤销');
      });
    });
  }

  async show() {
    this.visible = true;
    const sidebar = this.shadowRoot.getElementById('sidebar');
    sidebar.classList.add('visible');

    if (this.treeData.length === 0) {
      await this.refresh();
    }
  }

  hide() {
    this.visible = false;
    const sidebar = this.shadowRoot.getElementById('sidebar');
    sidebar.classList.remove('visible');
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  async refresh() {
    const status = this.shadowRoot.getElementById('status');
    const tree = this.shadowRoot.getElementById('tree');

    status.textContent = '加载中...';
    status.className = 'aifr-status';

    const mode = this.fileAccess.getMode();
    if (mode === 'disconnected') {
      status.textContent = '未连接';
      status.className = 'aifr-status error';

      // Check if we have a saved handle that needs re-authorization
      const hasSavedHandle = this.fileAccess.dirHandle != null;
      const btnText = hasSavedHandle ? `重新授权 ${this.fileAccess.dirHandle.name}` : '选择文件夹';

      tree.innerHTML = `
        <div class="aifr-empty">
          <p>${hasSavedHandle ? '需要重新授权文件夹访问' : '本地服务未连接'}</p>
          <button id="aifr-select-folder" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: #89b4fa;
            color: #1e1e2e;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">${btnText}</button>
          <p style="margin-top: 8px; font-size: 11px; color: #6c7086;">
            ${hasSavedHandle ? '点击上方按钮恢复访问' : '或安装本地服务获得更好体验'}
          </p>
        </div>
      `;
      const selectBtn = this.shadowRoot.getElementById('aifr-select-folder');
      if (selectBtn) {
        selectBtn.addEventListener('click', async () => {
          if (hasSavedHandle) {
            // Try to re-authorize the saved handle
            try {
              const perm = await this.fileAccess.dirHandle.requestPermission({ mode: 'read' });
              if (perm === 'granted') {
                this.fileAccess.mode = 'filesystem-api';
                this.fileAccess.rootDir = this.fileAccess.dirHandle.name;
                await this.refresh();
                return;
              }
            } catch {}
          }
          // Fallback: pick a new directory
          const result = await this.fileAccess.requestDirectoryAccess();
          if (result.success) {
            await this.refresh();
          }
        });
      }
      return;
    }

    const result = await this.fileAccess.listDirectory('');
    if (result.success) {
      this.treeData = result.entries;
      status.textContent = `${mode === 'native' ? '本地服务' : '浏览器API'} | ${this.fileAccess.rootDir || '根目录'}`;
      this._renderTree(tree, this.treeData);
    } else {
      status.textContent = `错误: ${result.error}`;
      status.className = 'aifr-status error';
      tree.innerHTML = '<div class="aifr-empty">加载失败</div>';
    }
  }

  _renderTree(container, entries) {
    container.innerHTML = '';
    if (!entries || entries.length === 0) {
      container.innerHTML = '<div class="aifr-empty">空目录</div>';
      return;
    }

    for (const entry of entries) {
      const node = this._createNode(entry);
      container.appendChild(node);
    }
  }

  _createNode(entry) {
    const wrapper = document.createElement('div');

    const node = document.createElement('div');
    node.className = `aifr-node ${entry.type}`;
    node.style.paddingLeft = '12px';

    const icon = document.createElement('span');
    icon.className = 'aifr-node-icon';
    icon.textContent = entry.type === 'directory' ? '▶' : '📄';

    const name = document.createElement('span');
    name.className = 'aifr-node-name';
    name.textContent = entry.name;

    node.appendChild(icon);
    node.appendChild(name);
    wrapper.appendChild(node);

    if (entry.type === 'directory') {
      const children = document.createElement('div');
      children.className = 'aifr-children';
      children.style.display = 'none';
      wrapper.appendChild(children);

      let expanded = false;
      let loaded = false;

      node.addEventListener('click', async () => {
        expanded = !expanded;
        icon.textContent = expanded ? '▼' : '▶';
        children.style.display = expanded ? 'block' : 'none';

        if (!loaded && expanded) {
          loaded = true;
          children.innerHTML = '<div class="aifr-loading">加载中...</div>';
          const result = await this.fileAccess.listDirectory(entry.path);
          if (result.success) {
            this._renderTree(children, result.entries);
          } else {
            children.innerHTML = `<div class="aifr-loading">加载失败</div>`;
          }
        }
      });
    } else {
      node.addEventListener('click', async () => {
        const result = await this.fileAccess.readFile(entry.path);
        if (result.success) {
          const formatted = formatFileContent(entry.path, result.content);
          this.onFileSelect(formatted);
          this.recordInsert(entry.path, formatted);
          const sizeStr = result.size > 1024 ? `${(result.size / 1024).toFixed(1)}KB` : `${result.size}B`;
          this.showToast(`已插入 ${entry.name} (${sizeStr})`);
        } else {
          this.showToast(`读取失败: ${result.error}`, 'error');
        }
      });
    }

    return wrapper;
  }

  _onSearch(query) {
    const tree = this.shadowRoot.getElementById('tree');
    if (!query) {
      this._renderTree(tree, this.treeData);
      return;
    }

    const allFiles = this.fileAccess.fileIndex;
    if (allFiles.length === 0) {
      tree.innerHTML = '<div class="aifr-loading">正在建立索引...</div>';
      this.fileAccess.listAllFiles(8).then(() => {
        this._onSearch(query);
      });
      return;
    }

    const matches = fuzzyMatch(query, allFiles, 30);
    if (matches.length === 0) {
      tree.innerHTML = '<div class="aifr-empty">无匹配结果</div>';
      return;
    }

    tree.innerHTML = '';
    for (const m of matches) {
      const entry = { name: m.item.split('/').pop(), path: m.item, type: 'file' };
      const node = this._createNode(entry);
      // Highlight matched filename
      const nameEl = node.querySelector('.aifr-node-name');
      if (nameEl) {
        nameEl.innerHTML = this._highlightMatch(entry.name, query);
      }
      tree.appendChild(node);
    }
  }

  _highlightMatch(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let result = '';
    let qi = 0;

    for (let i = 0; i < text.length; i++) {
      if (qi < lowerQuery.length && lowerText[i] === lowerQuery[qi]) {
        result += `<mark style="background:#89b4fa33;color:#89b4fa;border-radius:2px;padding:0 1px;">${text[i]}</mark>`;
        qi++;
      } else {
        result += text[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }
    return result;
  }

  // Template system
  async _loadTemplates() {
    try {
      const data = await chrome.storage.local.get('templates');
      this._templates = data.templates || ['分析这些文件并指出潜在问题', '解释这段代码的逻辑', '帮我重构这段代码'];
      this._renderTemplates();
    } catch {
      this._templates = [];
    }
  }

  async _saveTemplates() {
    await chrome.storage.local.set({ templates: this._templates });
  }

  _addTemplate(input) {
    const text = input.value.trim();
    if (!text) return;
    this._templates.push(text);
    this._saveTemplates();
    this._renderTemplates();
    input.value = '';
  }

  _renderTemplates() {
    const list = this.shadowRoot.getElementById('templates-list');
    list.innerHTML = this._templates.map((t, i) => `
      <div class="aifr-template-item" data-index="${i}">
        <span class="text">${t.length > 30 ? t.slice(0, 30) + '...' : t}</span>
        <span class="del" data-index="${i}">✕</span>
      </div>
    `).join('');

    list.querySelectorAll('.aifr-template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('del')) {
          const idx = parseInt(e.target.dataset.index);
          this._templates.splice(idx, 1);
          this._saveTemplates();
          this._renderTemplates();
          return;
        }
        const idx = parseInt(item.dataset.index);
        this.onFileSelect(this._templates[idx]);
        this.showToast('已插入指令');
      });
    });
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
