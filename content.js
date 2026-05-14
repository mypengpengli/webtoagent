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
    toggleBtn.innerHTML = '📁';
    toggleBtn.title = 'AI File Reader - 打开文件面板';
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

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.transform = 'scale(1.1)';
      toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.transform = 'scale(1)';
      toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });

    toggleBtn.addEventListener('click', () => {
      if (fileTree) {
        fileTree.toggle();
      }
    });

    document.body.appendChild(toggleBtn);
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
      fileAccess.listAllFiles(5);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();
