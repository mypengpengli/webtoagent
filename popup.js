document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const rootDirInput = document.getElementById('root-dir');
  const setRootBtn = document.getElementById('set-root-btn');
  const selectFolderBtn = document.getElementById('select-folder-btn');
  const rootHint = document.getElementById('root-hint');
  const refreshBtn = document.getElementById('refresh-btn');
  const helpLink = document.getElementById('help-link');

  // Check connection status
  async function checkStatus() {
    statusBadge.textContent = '检测中...';
    statusBadge.className = 'status-badge checking';

    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_STATUS' });
      if (response.success) {
        if (response.mode === 'native') {
          statusBadge.textContent = '本地服务已连接';
          statusBadge.className = 'status-badge native';
          rootDirInput.value = response.rootDir || '';
          selectFolderBtn.style.display = 'none';
          rootHint.textContent = '通过本地服务读取文件（推荐）';
        } else {
          statusBadge.textContent = '浏览器模式';
          statusBadge.className = 'status-badge filesystem';
          selectFolderBtn.style.display = 'block';
          rootHint.textContent = '本地服务未安装，使用浏览器文件访问API';
        }
      }
    } catch {
      statusBadge.textContent = '未连接';
      statusBadge.className = 'status-badge disconnected';
      selectFolderBtn.style.display = 'block';
      rootHint.textContent = '请安装本地服务或使用浏览器模式';
    }
  }

  // Set root directory
  setRootBtn.addEventListener('click', async () => {
    const path = rootDirInput.value.trim();
    if (!path) {
      rootHint.textContent = '请输入目录路径';
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_SET_ROOT', path });
      if (response.success) {
        rootHint.textContent = `已设置: ${response.rootDir}`;
        rootHint.style.color = '#a6e3a1';
      } else {
        rootHint.textContent = `错误: ${response.error}`;
        rootHint.style.color = '#f38ba8';
      }
    } catch (err) {
      rootHint.textContent = `错误: ${err.message}`;
      rootHint.style.color = '#f38ba8';
    }
  });

  // Select folder (File System Access API fallback)
  selectFolderBtn.addEventListener('click', async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      rootDirInput.value = handle.name;
      rootHint.textContent = `已选择文件夹: ${handle.name}`;
      rootHint.style.color = '#a6e3a1';

      // Store handle reference (limited to this popup session)
      await chrome.storage.local.set({ rootDir: handle.name, mode: 'filesystem-api' });
    } catch (err) {
      if (err.name !== 'AbortError') {
        rootHint.textContent = `选择失败: ${err.message}`;
        rootHint.style.color = '#f38ba8';
      }
    }
  });

  // Refresh file index
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.textContent = '刷新中...';
    refreshBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_LIST_ALL', maxDepth: 5 });
      if (response.success) {
        refreshBtn.textContent = `已索引 ${response.files.length} 个文件`;
      } else {
        refreshBtn.textContent = `刷新失败: ${response.error}`;
      }
    } catch (err) {
      refreshBtn.textContent = `错误: ${err.message}`;
    }

    setTimeout(() => {
      refreshBtn.textContent = '刷新文件索引';
      refreshBtn.disabled = false;
    }, 2000);
  });

  // Site toggles
  const siteCheckboxes = document.querySelectorAll('[data-site]');
  const savedSites = await chrome.storage.sync.get('enabledSites');
  const enabledSites = savedSites.enabledSites || ['chat.qwen.ai', 'chatgpt.com', 'gemini.google.com', 'claude.ai'];

  siteCheckboxes.forEach(cb => {
    cb.checked = enabledSites.includes(cb.dataset.site);
    cb.addEventListener('change', async () => {
      const sites = Array.from(siteCheckboxes)
        .filter(c => c.checked)
        .map(c => c.dataset.site);
      await chrome.storage.sync.set({ enabledSites: sites });
    });
  });

  // Help link
  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  });

  // Load current root dir
  try {
    const response = await chrome.runtime.sendMessage({ type: 'FS_GET_ROOT' });
    if (response.success && response.rootDir) {
      rootDirInput.value = response.rootDir;
    }
  } catch {}

  checkStatus();
});
