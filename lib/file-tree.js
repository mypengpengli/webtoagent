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
    this.bridgeConsoleVisible = false;
    this._create();
  }

  _create() {
    this.container = document.createElement('div');
    this.container.id = 'aifr-sidebar-host';
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="aifr-bridge-console" id="bridge-console">
        <div class="aifr-console-header">
          <span>Claude Code 过程</span>
          <div class="aifr-console-actions">
            <button class="aifr-btn" id="bridge-new-session" title="新建 Claude 会话">新会话</button>
            <button class="aifr-btn" id="bridge-console-clear" title="清空日志">清空</button>
            <button class="aifr-btn" id="bridge-console-hide" title="隐藏过程">隐藏</button>
          </div>
        </div>
        <div class="aifr-console-log" id="bridge-console-log"></div>
        <div class="aifr-console-direct">
          <textarea id="bridge-console-direct-input" placeholder="直接对 Claude Code 说..." rows="3"></textarea>
          <button id="bridge-console-direct-send">发给 Claude</button>
        </div>
      </div>
      <div class="aifr-sidebar" id="sidebar">
        <div class="aifr-header">
          <span class="aifr-title">WebToAgent</span>
          <div class="aifr-header-actions">
            <button class="aifr-btn" id="refresh-btn" title="刷新">↻</button>
            <button class="aifr-btn" id="close-btn" title="关闭">✕</button>
          </div>
        </div>
        <div class="aifr-bridge" id="bridge-panel">
          <div class="aifr-bridge-row">
            <span class="aifr-bridge-label">Bridge</span>
            <span class="aifr-bridge-status" id="bridge-status">未启动</span>
            <button class="aifr-bridge-toggle" id="bridge-toggle">启动</button>
          </div>
          <div class="aifr-bridge-row" style="margin-top:6px;">
            <button class="aifr-bridge-toggle" id="bridge-console-toggle">显示过程</button>
          </div>
          <div class="aifr-bridge-row" style="margin-top:6px;">
            <label style="font-size:11px;color:#a6adc8;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="bridge-auto" style="accent-color:#a6e3a1;" />
              全自动发送（网页 AI 回复后自动转给 Claude）
            </label>
          </div>
          <div class="aifr-bridge-row" style="margin-top:6px;">
            <label style="font-size:11px;color:#a6adc8;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="bridge-auto-web" style="accent-color:#89b4fa;" />
              全自动发送（Claude 回复后自动给网页）
            </label>
          </div>
          <div class="aifr-bridge-direct" style="margin-top:8px;">
            <div style="font-size:11px;color:#cba6f7;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>💬 直接对 Claude 说</span>
              <span style="color:#6c7086;font-size:10px;">Ctrl+Enter 发送</span>
            </div>
            <textarea id="bridge-direct-input" placeholder="任何时候在这里打字，绕过网页 AI 直接让 Claude Code 执行..." rows="2" style="
              width:100%;padding:6px 8px;border:1px solid #45475a;border-radius:4px;
              background:#11111b;color:#cdd6f4;font-size:11px;outline:none;
              box-sizing:border-box;resize:vertical;font-family:inherit;
            "></textarea>
            <button id="bridge-direct-send" style="
              margin-top:4px;padding:5px 10px;width:100%;background:#cba6f7;color:#1e1e2e;
              border:none;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
            ">发给 Claude</button>
          </div>
          <div class="aifr-bridge-detail" id="bridge-detail" style="display:none;">
            <div class="aifr-bridge-tools" id="bridge-tools"></div>
            <div class="aifr-bridge-result" id="bridge-result" style="display:none;">
              <div class="aifr-bridge-result-text" id="bridge-result-text"></div>
              <div class="aifr-bridge-actions">
                <button class="aifr-bridge-confirm" id="bridge-confirm">发送到网页</button>
                <button class="aifr-bridge-skip" id="bridge-skip">跳过</button>
              </div>
            </div>
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
        <div class="aifr-status-bar">
          <span class="aifr-status" id="status"></span>
          <button class="aifr-btn" id="switch-root-btn" title="切换目录">📂</button>
        </div>
        <div class="aifr-tree" id="tree"></div>
        <div class="aifr-templates" id="templates-panel">
          <div class="aifr-templates-header" id="templates-toggle">快捷指令</div>
          <div class="aifr-builtins">
            <button class="aifr-action-btn" id="insert-structure-btn">当前目录结构</button>
          </div>
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

    // Bridge toggle
    const bridgeToggle = this.shadowRoot.getElementById('bridge-toggle');
    const bridgeSkip = this.shadowRoot.getElementById('bridge-skip');
    const bridgeDetail = this.shadowRoot.getElementById('bridge-detail');
    const bridgeConsoleToggle = this.shadowRoot.getElementById('bridge-console-toggle');
    const bridgeConsoleHide = this.shadowRoot.getElementById('bridge-console-hide');
    const bridgeConsoleClear = this.shadowRoot.getElementById('bridge-console-clear');
    const bridgeNewSession = this.shadowRoot.getElementById('bridge-new-session');
    bridgeToggle.addEventListener('click', async () => {
      const bridge = window.__aifrBridge;
      if (!bridge) return;
      if (bridge.isActive()) {
        bridge.stop();
        bridgeToggle.textContent = '启动';
        bridgeToggle.classList.remove('active');
        bridgeDetail.style.display = 'none';
        this.updateBridge('stopped', 0);
        this.setBridgeConsoleVisible(false);
      } else {
        bridgeToggle.disabled = true;
        bridgeToggle.textContent = '连接中...';
        try {
          const ok = await bridge.start();
          if (ok) {
            bridgeToggle.textContent = '停止';
            bridgeToggle.classList.add('active');
            bridgeDetail.style.display = 'block';
            this.updateBridge('waiting', 0);
            this.setBridgeConsoleVisible(true);
          } else {
            bridgeToggle.textContent = '启动';
            bridgeToggle.classList.remove('active');
            this.updateBridge('stopped', 0);
          }
        } catch (err) {
          console.error('[WebToAgent] Bridge UI start failed:', err);
          this.showToast(`Bridge 启动异常: ${err.message || err}`, 'error', 5000);
          bridgeToggle.textContent = '启动';
          bridgeToggle.classList.remove('active');
          this.updateBridge('stopped', 0);
        } finally {
          bridgeToggle.disabled = false;
        }
      }
    });
    bridgeSkip.addEventListener('click', () => {
      this.shadowRoot.getElementById('bridge-result').style.display = 'none';
      this.updateBridge('waiting', 0);
    });
    bridgeConsoleToggle.addEventListener('click', () => this.toggleBridgeConsole());
    bridgeConsoleHide.addEventListener('click', () => this.setBridgeConsoleVisible(false));
    bridgeConsoleClear.addEventListener('click', () => this.clearBridgeLog());
    bridgeNewSession.addEventListener('click', async () => {
      if (!window.__aifrBridge || !window.__aifrBridge.newSession) return;
      bridgeNewSession.disabled = true;
      try {
        await window.__aifrBridge.newSession();
      } finally {
        bridgeNewSession.disabled = false;
      }
    });

    // Persist auto-send checkboxes
    const bridgeAuto = this.shadowRoot.getElementById('bridge-auto');
    const bridgeAutoWeb = this.shadowRoot.getElementById('bridge-auto-web');
    chrome.storage.local.get(['bridgeAutoSend', 'bridgeAutoSendToWeb'], (data) => {
      if (data.bridgeAutoSend) bridgeAuto.checked = true;
      bridgeAutoWeb.checked = Boolean(data.bridgeAutoSendToWeb);
    });
    bridgeAuto.addEventListener('change', () => {
      chrome.storage.local.set({ bridgeAutoSend: bridgeAuto.checked });
    });
    bridgeAutoWeb.addEventListener('change', () => {
      chrome.storage.local.set({ bridgeAutoSendToWeb: bridgeAutoWeb.checked });
    });

    // Direct send: user types a message and sends straight to Claude Code.
    // Always available — works whether Bridge is running, paused, or stopped.
    const directInput = this.shadowRoot.getElementById('bridge-direct-input');
    const directSendBtn = this.shadowRoot.getElementById('bridge-direct-send');
    const sendDirectMessage = async () => {
      const text = directInput.value.trim();
      if (!text) {
        this.showToast('请先输入内容', 'error');
        return;
      }
      if (!window.__aifrBridge || !window.__aifrBridge.sendDirect) return;
      directSendBtn.disabled = true;
      directSendBtn.textContent = '发送中...';
      try {
        const ok = await window.__aifrBridge.sendDirect(text);
        if (ok) {
          directInput.value = '';
          this.showToast('已发给 Claude Code');
        }
      } catch (err) {
        this.showToast(`发送失败: ${err.message || err}`, 'error');
      } finally {
        directSendBtn.disabled = false;
        directSendBtn.textContent = '发给 Claude';
      }
    };
    directSendBtn.addEventListener('click', sendDirectMessage);
    directInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendDirectMessage();
      }
    });

    const consoleDirectInput = this.shadowRoot.getElementById('bridge-console-direct-input');
    const consoleDirectSendBtn = this.shadowRoot.getElementById('bridge-console-direct-send');
    const sendConsoleDirectMessage = async () => {
      const text = consoleDirectInput.value.trim();
      if (!text) {
        this.showToast('请先输入内容', 'error');
        return;
      }
      if (!window.__aifrBridge || !window.__aifrBridge.sendDirect) return;
      consoleDirectSendBtn.disabled = true;
      consoleDirectSendBtn.textContent = '发送中...';
      try {
        const ok = await window.__aifrBridge.sendDirect(text);
        if (ok) {
          consoleDirectInput.value = '';
          this.showToast('已发给 Claude Code');
        }
      } catch (err) {
        this.showToast(`发送失败: ${err.message || err}`, 'error');
      } finally {
        consoleDirectSendBtn.disabled = false;
        consoleDirectSendBtn.textContent = '发给 Claude';
      }
    };
    consoleDirectSendBtn.addEventListener('click', sendConsoleDirectMessage);
    consoleDirectInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendConsoleDirectMessage();
      }
    });

    const switchRootBtn = this.shadowRoot.getElementById('switch-root-btn');
    switchRootBtn.addEventListener('click', () => this._showSwitchRoot());

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
    const insertStructureBtn = this.shadowRoot.getElementById('insert-structure-btn');
    insertStructureBtn.addEventListener('click', () => this._insertDirectoryStructure(insertStructureBtn));
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
      .aifr-bridge-console {
        position: fixed;
        top: 0;
        right: 300px;
        width: min(560px, calc(100vw - 320px));
        min-width: 360px;
        height: 100vh;
        background: #11111b;
        color: #cdd6f4;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        box-shadow: -2px 0 10px rgba(0,0,0,0.35);
        transform: translateX(calc(100% + 300px));
        transition: transform 0.2s ease;
        border-left: 1px solid #313244;
        border-right: 1px solid #313244;
      }
      .aifr-bridge-console.visible {
        transform: translateX(0);
      }
      .aifr-console-header {
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: #181825;
        border-bottom: 1px solid #313244;
        color: #89b4fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        font-weight: 600;
      }
      .aifr-console-actions {
        display: flex;
        gap: 4px;
      }
      .aifr-console-log {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
      }
      .aifr-console-direct {
        padding: 10px 12px;
        border-top: 1px solid #313244;
        background: #181825;
        flex-shrink: 0;
      }
      .aifr-console-direct textarea {
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        min-height: 68px;
        max-height: 180px;
        padding: 8px 10px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #11111b;
        color: #cdd6f4;
        outline: none;
        font: 12px 'Consolas', 'Monaco', monospace;
      }
      .aifr-console-direct textarea:focus {
        border-color: #89b4fa;
      }
      .aifr-console-direct button {
        margin-top: 8px;
        width: 100%;
        padding: 7px 10px;
        border: none;
        border-radius: 4px;
        background: #cba6f7;
        color: #1e1e2e;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }
      .aifr-console-log div {
        padding: 6px 0;
        border-bottom: 1px solid #1e1e2e;
      }
      .aifr-console-log .prompt {
        color: #f9e2af;
      }
      .aifr-console-log .assistant {
        color: #a6e3a1;
      }
      .aifr-console-log .tool {
        color: #89b4fa;
      }
      .aifr-console-log .error {
        color: #f38ba8;
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
      .aifr-bridge {
        padding: 8px 12px;
        border-bottom: 1px solid #313244;
      }
      .aifr-bridge-direct {
        display: none;
      }
      .aifr-bridge-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .aifr-bridge-label {
        font-size: 12px;
        font-weight: 600;
        color: #cba6f7;
      }
      .aifr-bridge-status {
        font-size: 11px;
        color: #6c7086;
        flex: 1;
      }
      .aifr-bridge-toggle {
        padding: 3px 10px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 11px;
        cursor: pointer;
      }
      .aifr-bridge-toggle:hover {
        background: #45475a;
      }
      .aifr-bridge-toggle.active {
        background: #f38ba8;
        border-color: #f38ba8;
        color: #1e1e2e;
      }
      .aifr-bridge-result {
        margin-top: 8px;
        padding: 8px;
        background: #11111b;
        border-radius: 6px;
        max-height: 150px;
        overflow-y: auto;
      }
      .aifr-bridge-result-text {
        font-size: 11px;
        color: #cdd6f4;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 100px;
        overflow-y: auto;
      }
      .aifr-bridge-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .aifr-bridge-confirm {
        flex: 1;
        padding: 5px 10px;
        background: #a6e3a1;
        color: #1e1e2e;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 500;
      }
      .aifr-bridge-skip {
        padding: 5px 10px;
        background: #45475a;
        color: #cdd6f4;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
      }
      .aifr-bridge-tools {
        display: none;
        margin-top: 6px;
        font-size: 11px;
        color: #a6adc8;
        max-height: 200px;
        overflow-y: auto;
        background: #11111b;
        border-radius: 4px;
        padding: 6px 8px;
        font-family: 'Consolas', 'Monaco', monospace;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.4;
      }
      .aifr-bridge-tools div {
        padding: 2px 0;
        border-bottom: 1px solid #1e1e2e;
      }
      .aifr-bridge-tools:empty {
        display: none;
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
        font-size: 11px;
        color: #a6adc8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .aifr-status.error {
        color: #f38ba8;
      }
      .aifr-status-bar {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        border-bottom: 1px solid #313244;
        gap: 6px;
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
      .aifr-builtins {
        padding: 0 12px 6px;
      }
      .aifr-action-btn {
        width: 100%;
        padding: 7px 10px;
        border: 1px solid #45475a;
        border-radius: 6px;
        background: #11111b;
        color: #cdd6f4;
        cursor: pointer;
        font-size: 12px;
        text-align: left;
        box-sizing: border-box;
      }
      .aifr-action-btn:hover:not(:disabled) {
        border-color: #89b4fa;
        background: #313244;
      }
      .aifr-action-btn:disabled {
        opacity: 0.6;
        cursor: default;
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

  setBridgeConsoleVisible(visible) {
    this.bridgeConsoleVisible = Boolean(visible);
    const consoleEl = this.shadowRoot.getElementById('bridge-console');
    const toggle = this.shadowRoot.getElementById('bridge-console-toggle');
    if (consoleEl) consoleEl.classList.toggle('visible', this.bridgeConsoleVisible);
    if (toggle) toggle.textContent = this.bridgeConsoleVisible ? '隐藏过程' : '显示过程';
  }

  toggleBridgeConsole() {
    this.setBridgeConsoleVisible(!this.bridgeConsoleVisible);
  }

  clearBridgeLog() {
    const logEl = this.shadowRoot.getElementById('bridge-console-log');
    const toolsEl = this.shadowRoot.getElementById('bridge-tools');
    if (logEl) logEl.innerHTML = '';
    if (toolsEl) toolsEl.innerHTML = '';
  }

  appendBridgeLog(text, type = '') {
    const logEl = this.shadowRoot.getElementById('bridge-console-log');
    const toolsEl = this.shadowRoot.getElementById('bridge-tools');
    if (!logEl && !toolsEl) return;
    const line = document.createElement('div');
    line.textContent = text;
    if (type) line.className = type;
    if (logEl) {
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
      while (logEl.children.length > 500) {
        logEl.removeChild(logEl.firstChild);
      }
    }
    if (toolsEl) {
      const compact = document.createElement('div');
      compact.textContent = text.length > 180 ? text.slice(0, 180) + '...' : text;
      if (type) compact.className = type;
      toolsEl.appendChild(compact);
      toolsEl.scrollTop = toolsEl.scrollHeight;
      while (toolsEl.children.length > 100) {
        toolsEl.removeChild(toolsEl.firstChild);
      }
    }
  }

  isBridgeAutoSendEnabled() {
    const checkbox = this.shadowRoot.getElementById('bridge-auto');
    return Boolean(checkbox && checkbox.checked);
  }

  isBridgeAutoSendToWebEnabled() {
    const checkbox = this.shadowRoot.getElementById('bridge-auto-web');
    return Boolean(checkbox && checkbox.checked);
  }

  updateBridge(state, round, tools) {
    const status = this.shadowRoot.getElementById('bridge-status');
    const resultPanel = this.shadowRoot.getElementById('bridge-result');
    const toggle = this.shadowRoot.getElementById('bridge-toggle');
    const consoleToggle = this.shadowRoot.getElementById('bridge-console-toggle');
    const detail = this.shadowRoot.getElementById('bridge-detail');
    const toolsEl = this.shadowRoot.getElementById('bridge-tools');

    switch (state) {
      case 'waiting':
        status.textContent = round > 0 ? `等待回复... (轮次 ${round})` : '等待新回复...';
        status.style.color = '#a6adc8';
        if (toggle) {
          toggle.textContent = '停止';
          toggle.classList.add('active');
          toggle.disabled = false;
          if (consoleToggle) consoleToggle.textContent = this.bridgeConsoleVisible ? '隐藏过程' : '显示过程';
        }
        if (detail) detail.style.display = 'block';
        break;
      case 'sending':
        status.textContent = `Claude Code 执行中 (轮次 ${round})`;
        status.style.color = '#f9e2af';
        if (toggle) {
          toggle.textContent = '停止';
          toggle.classList.add('active');
          toggle.disabled = false;
          if (consoleToggle) consoleToggle.textContent = this.bridgeConsoleVisible ? '隐藏过程' : '显示过程';
        }
        if (detail) detail.style.display = 'block';
        this.appendBridgeLog('--- 开始执行 ---');
        break;
      case 'tool':
        if (toolsEl && tools) {
          const html = tools.map(t => `<div>⏳ ${t}</div>`).join('');
          toolsEl.innerHTML += html;
          toolsEl.scrollTop = toolsEl.scrollHeight;
        }
        break;
      case 'stopped':
        status.textContent = '未启动';
        status.style.color = '#6c7086';
        resultPanel.style.display = 'none';
        detail.style.display = 'none';
        toggle.textContent = '启动';
        toggle.classList.remove('active');
        if (consoleToggle) consoleToggle.textContent = '显示过程';
        if (toolsEl) toolsEl.innerHTML = '';
        this.setBridgeConsoleVisible(false);
        break;
    }
  }

  showBridgeResult(text, onConfirm, source = 'web_ai') {
    if (this.isBridgeAutoSendToWebEnabled()) {
      this.updateBridge('waiting', 0);
      onConfirm();
      this.showToast('已自动发送');
      return;
    }

    const resultPanel = this.shadowRoot.getElementById('bridge-result');
    const resultText = this.shadowRoot.getElementById('bridge-result-text');
    const confirmBtn = this.shadowRoot.getElementById('bridge-confirm');
    const status = this.shadowRoot.getElementById('bridge-status');

    status.textContent = 'Claude Code 已返回结果';
    status.style.color = '#a6e3a1';

    resultText.textContent = text;
    resultPanel.style.display = 'block';

    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    newConfirm.addEventListener('click', () => {
      resultPanel.style.display = 'none';
      this.updateBridge('waiting', 0);
      onConfirm();
    });
  }

  recordInsert(filePath, content) {
    this.insertedFiles.push({ path: filePath, content, time: Date.now() });
    if (this.insertedFiles.length > 30) {
      this.insertedFiles.shift();
    }
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

    // Sync bridge status when sidebar opens — handles the case where the
    // native host is still running (CMD window open) but the page reloaded
    // and content.js lost its bridgeActive state.
    if (window.__aifrBridge && window.__aifrBridge.syncStatus) {
      try { await window.__aifrBridge.syncStatus(); } catch {}
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
    } else if (result.error && result.error.includes('not configured')) {
      this._renderSetRootPanel('本地服务已连接');
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
      let loading = false;
      node.addEventListener('click', async () => {
        if (loading) return;
        loading = true;
        node.style.opacity = '0.5';

        const isBinary = this._isBinaryFile(entry.name);

        if (isBinary) {
          // Binary file (image etc.) → upload via drag simulation
          const result = await this.fileAccess.readBinary(entry.path);
          node.style.opacity = '1';
          loading = false;
          if (result.success) {
            const byteArray = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
            const blob = new Blob([byteArray], { type: result.mimeType });
            const file = new File([blob], entry.name, { type: result.mimeType });
            this._uploadFile(file);
            const sizeStr = result.size > 1024 ? `${(result.size / 1024).toFixed(1)}KB` : `${result.size}B`;
            this.showToast(`已上传 ${entry.name} (${sizeStr})`);
          } else {
            this.showToast(`上传失败: ${result.error}`, 'error');
          }
        } else {
          // Text file → insert as code block
          const result = await this.fileAccess.readFile(entry.path);
          node.style.opacity = '1';
          loading = false;
          if (result.success) {
            const formatted = formatFileContent(entry.path, result.content);
            this.onFileSelect(formatted);
            this.recordInsert(entry.path, formatted);
            const sizeStr = result.size > 1024 ? `${(result.size / 1024).toFixed(1)}KB` : `${result.size}B`;
            this.showToast(`已插入 ${entry.name} (${sizeStr})`);
          } else {
            this.showToast(`读取失败: ${result.error}`, 'error');
          }
        }
      });
    }

    return wrapper;
  }

  async _showSwitchRoot() {
    const tree = this.shadowRoot.getElementById('tree');
    const mode = this.fileAccess.getMode();

    if (mode === 'filesystem-api' || mode === 'disconnected') {
      const result = await this.fileAccess.requestDirectoryAccess();
      if (result.success) await this.refresh();
      return;
    }

    let recentHtml = '';
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'FS_GET_RECENT_ROOTS' });
      if (resp.success && resp.roots && resp.roots.length > 0) {
        recentHtml = `<div style="margin-top:10px;font-size:11px;color:#6c7086;">最近使用：</div>` +
          resp.roots.map(r => `<div class="aifr-recent-root" data-path="${r.replace(/"/g, '&quot;')}" style="
            padding:5px 8px;margin-top:4px;border-radius:4px;cursor:pointer;font-size:12px;color:#cdd6f4;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          ">${r}</div>`).join('');
      }
    } catch {}

    tree.innerHTML = `
      <div class="aifr-empty">
        <p>切换工作目录</p>
        <input type="text" id="aifr-switch-input" value="${(this.fileAccess.rootDir || '').replace(/"/g, '&quot;')}" style="
          width:100%;margin-top:12px;padding:8px 10px;border:1px solid #45475a;border-radius:6px;
          background:#11111b;color:#cdd6f4;font-size:12px;outline:none;box-sizing:border-box;
        " />
        <button id="aifr-switch-confirm" style="
          margin-top:8px;padding:8px 16px;background:#89b4fa;color:#1e1e2e;border:none;
          border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;width:100%;
        ">切换</button>
        ${recentHtml}
      </div>
    `;

    const input = this.shadowRoot.getElementById('aifr-switch-input');
    const confirmBtn = this.shadowRoot.getElementById('aifr-switch-confirm');

    const doSwitch = async (dir) => {
      if (!dir) return;
      const resp = await this.fileAccess.setRoot(dir);
      if (resp.success) {
        this.showToast(`已切换到 ${resp.rootDir}`);
        this.fileAccess.fileIndex = [];
        await this.refresh();
        this.fileAccess.listAllFiles(8);
      } else {
        this.showToast(resp.error || '切换失败', 'error');
      }
    };

    confirmBtn.addEventListener('click', () => doSwitch(input.value.trim()));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSwitch(input.value.trim()); });
    input.select();

    this.shadowRoot.querySelectorAll('.aifr-recent-root').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.background = '#313244'; });
      el.addEventListener('mouseleave', () => { el.style.background = 'transparent'; });
      el.addEventListener('click', () => doSwitch(el.dataset.path));
    });
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
      const escaped = text[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (qi < lowerQuery.length && lowerText[i] === lowerQuery[qi]) {
        result += `<mark style="background:#89b4fa33;color:#89b4fa;border-radius:2px;padding:0 1px;">${escaped}</mark>`;
        qi++;
      } else {
        result += escaped;
      }
    }
    return result;
  }

  _renderSetRootPanel(statusText) {
    const status = this.shadowRoot.getElementById('status');
    const tree = this.shadowRoot.getElementById('tree');

    status.textContent = statusText;
    status.className = 'aifr-status';
    tree.innerHTML = `
      <div class="aifr-empty">
        <p>请设置工作目录</p>
        <input type="text" id="aifr-root-input" placeholder="例如: D:\\projects\\my-app" style="
          width: 100%;
          margin-top: 12px;
          padding: 8px 10px;
          border: 1px solid #45475a;
          border-radius: 6px;
          background: #11111b;
          color: #cdd6f4;
          font-size: 12px;
          outline: none;
          box-sizing: border-box;
        " />
        <button id="aifr-set-root" style="
          margin-top: 8px;
          padding: 8px 16px;
          background: #89b4fa;
          color: #1e1e2e;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          width: 100%;
        ">确定</button>
      </div>
    `;

    const rootInput = this.shadowRoot.getElementById('aifr-root-input');
    const setRootBtn = this.shadowRoot.getElementById('aifr-set-root');
    rootInput.value = this.fileAccess.rootDir || '';

    setRootBtn.addEventListener('click', async () => {
      const dir = rootInput.value.trim();
      if (!dir) return;

      setRootBtn.disabled = true;
      setRootBtn.textContent = '设置中...';
      const resp = await this.fileAccess.setRoot(dir);
      if (resp.success) {
        this.treeData = [];
        this.fileAccess.fileIndex = [];
        await this.refresh();
      } else {
        setRootBtn.disabled = false;
        setRootBtn.textContent = '确定';
        this.showToast(resp.error || '设置失败', 'error');
      }
    });

    rootInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setRootBtn.click();
    });
    rootInput.focus();
  }

  async _insertDirectoryStructure(button) {
    if (this.fileAccess.getMode() === 'native' && !this.fileAccess.rootDir) {
      this.showToast('请先设置工作目录', 'error');
      await this.refresh();
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '生成中...';

    try {
      let files = [];
      let truncated = false;

      const result = await this.fileAccess.listAllFiles(8);
      if (!result.success) {
        this.showToast(`生成失败: ${result.error}`, 'error', 5000);
        return;
      }
      files = result.files || [];
      truncated = Boolean(result.truncated);

      if (files.length === 0) {
        this.showToast('当前目录没有可插入的文件', 'error');
        return;
      }

      const content = this._formatDirectoryStructure(files, truncated);
      this.onFileSelect(content);
      this.recordInsert('当前目录结构', content);
      this.showToast(`已插入目录结构 (${files.length} 个文件)`);
    } catch (err) {
      this.showToast(`生成失败: ${err.message}`, 'error', 5000);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  _formatDirectoryStructure(files, truncated) {
    const rootName = this._getRootDisplayName();
    const root = this._buildPathTree(files);
    const lines = [`${rootName}/`];
    const children = this._sortTreeNodes(Array.from(root.children.values()));

    children.forEach((child, index) => {
      this._appendTreeNode(lines, child, '', index === children.length - 1);
    });

    let content = `当前目录结构是：\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\``;
    if (truncated) {
      content += '\n\n注：目录过大，以上结构已按文件数量上限截断。';
    }
    return content;
  }

  _buildPathTree(files) {
    const root = { name: '', type: 'directory', children: new Map() };

    for (const filePath of files) {
      const parts = filePath.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            type: isFile ? 'file' : 'directory',
            children: new Map()
          });
        }

        const child = current.children.get(part);
        if (!isFile) {
          child.type = 'directory';
          current = child;
        }
      });
    }

    return root;
  }

  _appendTreeNode(lines, node, prefix, isLast) {
    const connector = isLast ? '└── ' : '├── ';
    const isDirectory = node.type === 'directory';
    lines.push(`${prefix}${connector}${node.name}${isDirectory ? '/' : ''}`);

    if (!isDirectory) return;

    const children = this._sortTreeNodes(Array.from(node.children.values()));
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    children.forEach((child, index) => {
      this._appendTreeNode(lines, child, nextPrefix, index === children.length - 1);
    });
  }

  _sortTreeNodes(nodes) {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  _getRootDisplayName() {
    const rootDir = this.fileAccess.rootDir || '当前目录';
    const normalized = rootDir.replace(/[\\/]+$/, '');
    return normalized.split(/[\\/]/).pop() || normalized || '当前目录';
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
    list.innerHTML = this._templates.map((t, i) => {
      const display = t.length > 30 ? t.slice(0, 30) + '...' : t;
      const escaped = display.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `
        <div class="aifr-template-item" data-index="${i}">
          <span class="text">${escaped}</span>
          <span class="del" data-index="${i}">✕</span>
        </div>
      `;
    }).join('');

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

  _isBinaryFile(filename) {
    const ext = ('.' + filename.split('.').pop()).toLowerCase();
    const binaryExts = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
      '.mp3', '.wav', '.ogg', '.flac',
      '.mp4', '.webm', '.avi', '.mov',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.exe', '.dll', '.so', '.dylib',
      '.pyc', '.class', '.o', '.obj',
      '.sqlite', '.db'
    ]);
    return binaryExts.has(ext);
  }

  _uploadFile(file) {
    // Simulate drag-and-drop upload into the chat input
    const inputEl = document.querySelector('div[contenteditable="true"]') ||
                    document.querySelector('textarea') ||
                    document.querySelector('[role="textbox"]');
    if (!inputEl) return;

    const dt = new DataTransfer();
    dt.items.add(file);

    inputEl.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
    inputEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    inputEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }
}
