(function() {
  'use strict';

  const ADAPTERS = [
    new QwenAdapter(),
    new ChatGPTAdapter(),
    new GeminiAdapter(),
    new ClaudeAdapter()
  ];

  let currentAdapter = null;
  let fileAccess = null;
  let fileTree = null;
  let autocomplete = null;
  let toggleBtn = null;
  let initialized = false;

  // Bridge state
  let bridgeActive = false;
  let bridgeRound = 0;
  let bridgeMaxRounds = 20;
  let bridgeLastHash = '';
  let bridgeCheckInterval = null;
  let bridgeKeepalive = null;

  function detectSite() {
    const hostname = window.location.hostname;
    for (const adapter of ADAPTERS) {
      if (hostname.includes(adapter.getHostname())) {
        return adapter;
      }
    }
    return null;
  }

  function createToggleButton() {
    if (document.getElementById('aifr-toggle')) return;

    toggleBtn = document.createElement('div');
    toggleBtn.id = 'aifr-toggle';
    toggleBtn.title = 'WebToAgent (Ctrl+Shift+F)';
    toggleBtn.style.cssText = `
      position: fixed;
      right: 12px;
      bottom: 80px;
      width: 44px;
      height: 44px;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483645;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
    `;
    toggleBtn.innerHTML = '📁';

    // Status dot
    const dot = document.createElement('div');
    dot.id = 'aifr-status-dot';
    const mode = fileAccess ? fileAccess.getMode() : 'disconnected';
    const dotColor = mode === 'native' ? '#a6e3a1' : mode === 'filesystem-api' ? '#f9e2af' : '#f38ba8';
    dot.style.cssText = `
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${dotColor};
      border: 2px solid #1e1e2e;
    `;
    toggleBtn.appendChild(dot);

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.transform = 'scale(1.1)';
      toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.transform = 'scale(1)';
      toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });

    // Draggable
    let isDragging = false;
    let dragStartX, dragStartY, startRight, startBottom;

    toggleBtn.addEventListener('mousedown', (e) => {
      isDragging = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startRight = parseInt(toggleBtn.style.right);
      startBottom = parseInt(toggleBtn.style.bottom);

      const onMove = (e) => {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
        if (isDragging) {
          toggleBtn.style.right = Math.max(0, startRight - dx) + 'px';
          toggleBtn.style.bottom = Math.max(0, startBottom - dy) + 'px';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (isDragging) {
          // Save position
          chrome.storage.local.set({
            togglePos: { right: toggleBtn.style.right, bottom: toggleBtn.style.bottom }
          });
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    toggleBtn.addEventListener('click', (e) => {
      if (isDragging) { e.stopPropagation(); return; }
      if (fileTree) fileTree.toggle();
    });

    document.body.appendChild(toggleBtn);

    // Restore saved position
    chrome.storage.local.get('togglePos', (data) => {
      if (data.togglePos) {
        toggleBtn.style.right = data.togglePos.right;
        toggleBtn.style.bottom = data.togglePos.bottom;
      }
    });
  }

  function updateStatusDot() {
    const dot = document.getElementById('aifr-status-dot');
    if (!dot || !fileAccess) return;
    const mode = fileAccess.getMode();
    const color = mode === 'native' ? '#a6e3a1' : mode === 'filesystem-api' ? '#f9e2af' : '#f38ba8';
    dot.style.background = color;
  }

  function setupAutocomplete() {
    const inputEl = currentAdapter.getInputElement();
    if (inputEl && autocomplete) {
      autocomplete.attachToInput(inputEl);
    }
  }

  function observeInputChanges() {
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        setupAutocomplete();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async function init() {
    if (initialized) return;

    currentAdapter = detectSite();
    if (!currentAdapter) return;

    // Check if site is enabled
    try {
      const data = await chrome.storage.sync.get('enabledSites');
      const enabledSites = data.enabledSites || ['chat.qwen.ai', 'chatgpt.com', 'gemini.google.com', 'claude.ai'];
      if (!enabledSites.includes(currentAdapter.getHostname())) return;
    } catch {}

    // Wait for the chat input to be ready
    const ready = await currentAdapter.waitForReady();
    if (!ready) {
      setTimeout(init, 2000);
      return;
    }

    initialized = true;

    // Initialize file access
    fileAccess = new FileAccess();
    await fileAccess.initialize();

    // Create UI components
    fileTree = new FileTree(fileAccess, (content) => {
      currentAdapter.insertText(content, false);
    }, (content) => {
      // onUndo: remove the inserted content from the input
      const el = currentAdapter.getInputElement();
      if (!el) return;
      const currentText = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
        ? el.value
        : (el.textContent || el.innerText || '');
      const idx = currentText.indexOf(content);
      if (idx !== -1) {
        const newText = currentText.substring(0, idx) + currentText.substring(idx + content.length);
        currentAdapter.insertText(newText, true);
      }
    });

    autocomplete = new Autocomplete(fileAccess, currentAdapter);

    // Create toggle button
    createToggleButton();

    // Setup autocomplete on current input
    setupAutocomplete();

    // Watch for DOM changes (SPA navigation)
    observeInputChanges();

    // Pre-load file index for autocomplete
    if (fileAccess.getMode() !== 'disconnected') {
      fileAccess.listAllFiles(8);
    }

    // Listen for keyboard shortcut and file change events from background
    updateStatusDot();
  }

  // Bridge functions
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString() + '_' + str.length;
  }

  async function startBridge() {
    if (bridgeActive) return true;

    // Validate before starting
    try {
      const wantsDebugWindow = Boolean(fileTree && fileTree.isBridgeDebugWindowEnabled && fileTree.isBridgeDebugWindowEnabled());
      const resp = await chrome.runtime.sendMessage({
        type: 'BRIDGE_START',
        debugWindow: wantsDebugWindow
      });
      if (!resp.success) {
        if (fileTree) fileTree.showToast(resp.error || '启动失败', 'error');
        return false;
      }
      if (wantsDebugWindow && fileTree) {
        if (resp.debugWindow) fileTree.appendBridgeLog('CMD 调试窗口已打开');
        else fileTree.showToast('CMD 调试窗口打开失败，已继续后台运行', 'error');
      }
    } catch (err) {
      console.error('[WebToAgent] Bridge start failed:', err);
      if (fileTree) fileTree.showToast(`无法连接本地服务: ${err.message || err}`, 'error', 5000);
      return false;
    }

    bridgeActive = true;
    bridgeRound = 0;

    // Set baseline: current last reply should NOT trigger
    let currentReply = '';
    try {
      currentReply = currentAdapter.getLastAssistantMessage();
    } catch (err) {
      console.warn('[WebToAgent] Failed to read current assistant message:', err);
    }
    bridgeLastHash = currentReply ? simpleHash(currentReply) : '';

    let wasGenerating = false;
    let stableCount = 0;
    let lastText = '';
    let cooldownUntil = 0;

    bridgeCheckInterval = setInterval(() => {
      if (!bridgeActive) { clearInterval(bridgeCheckInterval); return; }
      if (Date.now() < cooldownUntil) return;

      const generating = currentAdapter.isGenerating();

      if (generating) {
        wasGenerating = true;
        stableCount = 0;
        return;
      }

      if (!wasGenerating) return;

      const reply = currentAdapter.getLastAssistantMessage();
      if (!reply) return;

      if (reply === lastText) {
        stableCount++;
      } else {
        lastText = reply;
        stableCount = 0;
        return;
      }

      if (stableCount < 2) return;

      const hash = simpleHash(reply);
      if (hash === bridgeLastHash) return;

      bridgeLastHash = hash;
      bridgeRound++;
      wasGenerating = false;
      stableCount = 0;
      cooldownUntil = Date.now() + 5000;

      if (bridgeRound > bridgeMaxRounds) {
        if (fileTree) fileTree.showToast(`已达 ${bridgeMaxRounds} 轮，仍在继续...`);
      }

      sendToClaude(reply);
    }, 2000);

    if (fileTree) fileTree.showToast('Bridge 已启动，等待新回复...');

    // Keepalive: prevent SW from sleeping during long CC tasks
    bridgeKeepalive = setInterval(() => {
      if (bridgeActive) chrome.runtime.sendMessage({ type: 'KEEPALIVE' }).catch(() => {});
    }, 20000);

    return true;
  }

  function stopBridge() {
    bridgeActive = false;
    if (bridgeCheckInterval) {
      clearInterval(bridgeCheckInterval);
      bridgeCheckInterval = null;
    }
    if (bridgeKeepalive) {
      clearInterval(bridgeKeepalive);
      bridgeKeepalive = null;
    }
    chrome.runtime.sendMessage({ type: 'BRIDGE_STOP' });
    if (fileTree) {
      fileTree.updateBridge('stopped', 0);
      fileTree.showToast('Bridge 已停止');
    }
  }

  async function sendToClaude(text) {
    if (fileTree) fileTree.updateBridge('sending', bridgeRound);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'BRIDGE_SEND',
        text: text
      });

      if (!response.success) {
        if (fileTree) {
          fileTree.showToast(`发送失败: ${response.error}`, 'error');
          fileTree.updateBridge('waiting', bridgeRound);
        }
      }
    } catch (err) {
      if (fileTree) {
        fileTree.showToast(`Bridge 连接错误: ${err.message}`, 'error');
        fileTree.updateBridge('waiting', bridgeRound);
      }
    }
  }

  function waitForSendEnabled(callback, attempts = 0) {
    if (attempts > 20) {
      if (fileTree) fileTree.showToast('发送按钮未就绪，请手动发送', 'error');
      return;
    }
    const btn = currentAdapter._getSendButton();
    if (btn && !btn.disabled) {
      callback();
    } else {
      setTimeout(() => waitForSendEnabled(callback, attempts + 1), 200);
    }
  }

  // Unified message listener
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_SIDEBAR' && fileTree) {
      fileTree.toggle();
    }

    if (msg.type === 'FS_CHANGED' && fileAccess) {
      fileAccess.listAllFiles(8);
      updateStatusDot();
      if (fileTree && fileTree.visible) {
        fileTree.showToast('文件已变更，索引已更新');
      }
    }

    if (msg.type === 'BRIDGE_PROGRESS' && fileTree && bridgeActive) {
      const event = msg.event;
      if (!event) return;

      // Show thinking/text content
      if (event.type === 'assistant' && event.message && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            fileTree.appendBridgeLog('💭 ' + block.text.substring(0, 200));
          }
          if (block.type === 'tool_use') {
            fileTree.appendBridgeLog('🔧 ' + (block._summary || block.name));
          }
        }
      }

      // Show tool results
      if (event.type === 'user' && event.message && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_result' && block.content) {
            const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            fileTree.appendBridgeLog('✓ ' + text.substring(0, 100));
          }
        }
      }
    }

    if (msg.type === 'BRIDGE_DONE' && bridgeActive) {
      if (msg.success) {
        const resultText = msg.text || '';
        if (fileTree) {
          fileTree.showBridgeResult(resultText, () => {
            currentAdapter.insertText(resultText, true);
            waitForSendEnabled(() => {
              currentAdapter.clickSend();
            });
          });
        }
      } else {
        if (fileTree) fileTree.showToast(`Claude Code 错误: ${msg.error}`, 'error');
        // Don't stop bridge on error - user controls stop manually
      }
    }
  });

  // Expose bridge controls for file-tree UI
  window.__aifrBridge = { start: startBridge, stop: stopBridge, isActive: () => bridgeActive };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();
