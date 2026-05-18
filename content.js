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
  let bridgeBusy = false; // True while Claude Code is running this round
  let bridgeLastDoneKey = '';

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

    // If the native bridge is already running, reflect that in this page.
    syncBridgeStatus();

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

  function activateBridgeMonitoring(options = {}) {
    const { showToast = false, busy = false } = options;

    bridgeActive = true;
    bridgeBusy = Boolean(busy);
    bridgeRound = 0;

    if (bridgeCheckInterval) {
      clearInterval(bridgeCheckInterval);
      bridgeCheckInterval = null;
    }
    if (bridgeKeepalive) {
      clearInterval(bridgeKeepalive);
      bridgeKeepalive = null;
    }

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
      if (bridgeBusy) return; // Don't poll while Claude Code is running

      let generating = false;
      try {
        generating = currentAdapter.isGenerating();
      } catch (err) {
        console.warn('[WebToAgent] Failed to read generation state:', err);
        return;
      }

      if (generating) {
        wasGenerating = true;
        stableCount = 0;
        return;
      }

      if (!wasGenerating) return;

      let reply = '';
      try {
        reply = currentAdapter.getLastAssistantMessage();
      } catch (err) {
        console.warn('[WebToAgent] Failed to read assistant reply:', err);
        return;
      }
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

      // Auto-forward Qwen's reply to Claude Code
      if (fileTree && fileTree.isBridgeAutoSendEnabled && !fileTree.isBridgeAutoSendEnabled()) {
        return;
      }
      sendToClaude(reply, 'web_ai');
    }, 2000);

    bridgeKeepalive = setInterval(() => {
      if (bridgeActive) chrome.runtime.sendMessage({ type: 'KEEPALIVE' }).catch(() => {});
    }, 20000);

    if (fileTree) {
      fileTree.updateBridge(bridgeBusy ? 'sending' : 'waiting', bridgeRound);
      if (showToast) fileTree.showToast('Bridge 已启动，等待新回复...');
    }

    return true;
  }

  async function syncBridgeStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'BRIDGE_STATUS' });
      if (status && status.success && status.running) {
        activateBridgeMonitoring({ busy: Boolean(status.busy) });
        if (!status.busy && status.lastDone) {
          handleBridgeDone(status.lastDone);
        }
        return true;
      }
      if (status && status.success && !status.running && bridgeActive) {
        bridgeActive = false;
        bridgeBusy = false;
        if (bridgeCheckInterval) {
          clearInterval(bridgeCheckInterval);
          bridgeCheckInterval = null;
        }
        if (bridgeKeepalive) {
          clearInterval(bridgeKeepalive);
          bridgeKeepalive = null;
        }
        if (fileTree) fileTree.updateBridge('stopped', 0);
      }
    } catch (err) {
      console.warn('[WebToAgent] Bridge status sync failed:', err);
    }
    return false;
  }

  async function startBridge() {
    if (bridgeActive) return true;

    // Validate before starting
    let resp = null;
    try {
      resp = await chrome.runtime.sendMessage({
        type: 'BRIDGE_START'
      });
      if (!resp.success) {
        if (await syncBridgeStatus()) return true;
        if (fileTree) fileTree.showToast(resp.error || '启动失败', 'error');
        return false;
      }
    } catch (err) {
      console.error('[WebToAgent] Bridge start failed:', err);
      if (await syncBridgeStatus()) return true;
      if (fileTree) fileTree.showToast(`无法连接本地服务: ${err.message || err}`, 'error', 5000);
      return false;
    }

    const activated = activateBridgeMonitoring({ showToast: true, busy: Boolean(resp && resp.busy) });
    if (activated && fileTree && fileTree.setBridgeConsoleVisible) {
      fileTree.setBridgeConsoleVisible(true);
    }
    return activated;
  }

  function stopBridge() {
    bridgeActive = false;
    bridgeBusy = false;
    if (bridgeCheckInterval) {
      clearInterval(bridgeCheckInterval);
      bridgeCheckInterval = null;
    }
    if (bridgeKeepalive) {
      clearInterval(bridgeKeepalive);
      bridgeKeepalive = null;
    }
    chrome.runtime.sendMessage({ type: 'BRIDGE_STOP' }).catch(() => {});
    if (fileTree) {
      fileTree.updateBridge('stopped', 0);
      fileTree.showToast('Bridge 已停止');
    }
  }

  async function newBridgeSession() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'BRIDGE_NEW_SESSION' });
      if (!response.success) {
        if (fileTree) fileTree.showToast(`新会话失败: ${response.error}`, 'error');
        return false;
      }
      bridgeRound = 0;
      bridgeLastDoneKey = '';
      if (fileTree) {
        fileTree.clearBridgeLog();
        fileTree.updateBridge(bridgeActive ? 'waiting' : 'stopped', 0);
        fileTree.showToast('已新建 Claude 会话');
      }
      return true;
    } catch (err) {
      if (fileTree) fileTree.showToast(`新会话失败: ${err.message}`, 'error');
      return false;
    }
  }

  async function sendToClaude(text, source = 'web_ai') {
    bridgeBusy = true;
    if (fileTree) {
      fileTree.updateBridge('sending', bridgeRound);
      if (fileTree.setBridgeConsoleVisible) fileTree.setBridgeConsoleVisible(true);
      const label = source === 'direct' ? '用户直发' : '网页 AI';
      fileTree.appendBridgeLog(`\n▶ 第 ${bridgeRound || 1} 轮\n${label} -> Claude Code\n${text}`, 'prompt');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'BRIDGE_SEND',
        text: text,
        source
      });

      if (!response.success) {
        bridgeBusy = false;
        if (fileTree) {
          fileTree.showToast(`发送失败: ${response.error}`, 'error');
          fileTree.updateBridge('waiting', bridgeRound);
        }
        return false;
      }
      return true;
    } catch (err) {
      bridgeBusy = false;
      if (fileTree) {
        fileTree.showToast(`Bridge 连接错误: ${err.message}`, 'error');
        fileTree.updateBridge('waiting', bridgeRound);
      }
      return false;
    }
  }

  // Send a user-typed message directly to Claude Code, bypassing the network AI.
  // Available any time — works whether Bridge is running or stopped.
  async function sendDirectToClaude(text) {
    if (!text || !text.trim()) return false;

    if (!bridgeActive) {
      // Auto-start the bridge if user wants to talk to Claude directly
      const ok = await startBridge(false);
      if (!ok) return false;
    }

    if (bridgeBusy) {
      if (fileTree) fileTree.showToast('Claude Code 正在执行上一轮，请稍候', 'error');
      return false;
    }

    bridgeRound++;
    // Mark this round's hash so the auto-watcher won't re-trigger on the
    // current Qwen reply after the user manually intervened.
    try {
      const currentReply = currentAdapter.getLastAssistantMessage();
      if (currentReply) bridgeLastHash = simpleHash(currentReply);
    } catch {}

    return await sendToClaude(text, 'direct');
  }

  function waitForSendEnabled(callback, attempts = 0) {
    const btn = currentAdapter._getSendButton();
    const isDisabled = currentAdapter._isDisabled
      ? currentAdapter._isDisabled(btn)
      : Boolean(btn && btn.disabled);
    if (btn && !isDisabled) {
      callback();
    } else if (attempts > 25) {
      const submitted = currentAdapter.clickSend();
      if (!submitted && fileTree) fileTree.showToast('发送按钮未就绪，请手动发送', 'error');
    } else {
      setTimeout(() => waitForSendEnabled(callback, attempts + 1), 200);
    }
  }

  function bridgeDoneKey(msg) {
    return [
      msg.source || '',
      msg.round || '',
      msg.sessionId || '',
      msg.success ? (msg.text || '') : (msg.error || '')
    ].join('|');
  }

  function handleBridgeDone(msg) {
    if (!msg || msg.type !== 'BRIDGE_DONE') return;

    const key = bridgeDoneKey(msg);
    if (key && key === bridgeLastDoneKey) return;
    bridgeLastDoneKey = key;

    bridgeBusy = false;
    if (msg.success) {
      const resultText = msg.text || '';
      const source = msg.source || 'web_ai';
      if (fileTree) {
        fileTree.appendBridgeLog('Claude Code -> 网页\n' + resultText.substring(0, 4000), 'assistant');
        fileTree.showBridgeResult(resultText, () => {
          currentAdapter.insertText(resultText, true);
          waitForSendEnabled(() => {
            currentAdapter.clickSend();
          });
        }, source);
      }
    } else {
      if (fileTree) {
        fileTree.appendBridgeLog('Claude Code 错误\n' + (msg.error || ''), 'error');
        fileTree.showToast(`Claude Code error: ${msg.error}`, 'error');
        fileTree.updateBridge('waiting', bridgeRound);
      }
      // Don't stop bridge on error - user controls stop manually
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
      if (!bridgeBusy) {
        bridgeBusy = true;
        fileTree.updateBridge('sending', bridgeRound);
      }
      const event = msg.event;
      if (!event) return;

      // Show thinking/text content
      if (event.type === 'assistant' && event.message && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            fileTree.appendBridgeLog('Claude 思考\n' + block.text.substring(0, 3000), 'assistant');
          }
          if (block.type === 'tool_use') {
            const input = block.input ? `\n${JSON.stringify(block.input, null, 2).substring(0, 1200)}` : '';
            fileTree.appendBridgeLog(`工具调用: ${block._summary || block.name}${input}`, 'tool');
          }
        }
      }

      // Show tool results
      if (event.type === 'user' && event.message && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_result' && block.content) {
            const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            fileTree.appendBridgeLog('工具返回\n' + text.substring(0, 1600), block.is_error ? 'error' : 'tool');
          }
        }
      }

      if (event.type === 'result' && event.result) {
        fileTree.appendBridgeLog('Claude 最终结果\n' + event.result.substring(0, 4000), 'assistant');
      }
    }

    if (msg.type === 'BRIDGE_DONE' && bridgeActive) {
      handleBridgeDone(msg);
    }
  });

  // Expose bridge controls for file-tree UI
  window.__aifrBridge = {
    start: startBridge,
    stop: stopBridge,
    isActive: () => bridgeActive,
    isBusy: () => bridgeBusy,
    sendDirect: sendDirectToClaude,
    syncStatus: syncBridgeStatus,
    newSession: newBridgeSession
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();
