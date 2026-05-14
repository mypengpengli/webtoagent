class FileTree {
  constructor(fileAccess, onFileSelect) {
    this.fileAccess = fileAccess;
    this.onFileSelect = onFileSelect;
    this.container = null;
    this.shadowRoot = null;
    this.treeData = [];
    this.visible = false;
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
        <div class="aifr-search">
          <input type="text" id="search-input" placeholder="搜索文件..." />
        </div>
        <div class="aifr-status" id="status"></div>
        <div class="aifr-tree" id="tree"></div>
      </div>
    `;

    const sidebar = this.shadowRoot.getElementById('sidebar');
    const closeBtn = this.shadowRoot.getElementById('close-btn');
    const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
    const searchInput = this.shadowRoot.getElementById('search-input');

    closeBtn.addEventListener('click', () => this.hide());
    refreshBtn.addEventListener('click', () => this.refresh());
    searchInput.addEventListener('input', (e) => this._onSearch(e.target.value));

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
    `;
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
      status.textContent = '未连接 - 请在扩展设置中配置';
      status.className = 'aifr-status error';
      tree.innerHTML = '<div class="aifr-empty">请先配置文件目录</div>';
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
          if (result.size > 100 * 1024) {
            if (!confirm(`文件较大 (${(result.size / 1024).toFixed(1)}KB)，确定要插入吗？`)) {
              return;
            }
          }
          const formatted = formatFileContent(entry.path, result.content);
          this.onFileSelect(formatted);
        } else {
          alert(`读取失败: ${result.error}`);
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
      this.fileAccess.listAllFiles(5).then(() => {
        this._onSearch(query);
      });
      return;
    }

    const matches = fuzzyMatch(query, allFiles, 20);
    const entries = matches.map(m => ({
      name: m.item.split('/').pop(),
      path: m.item,
      type: 'file'
    }));
    this._renderTree(tree, entries);
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
