document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const statusHint = document.getElementById('status-hint');
  const helpLink = document.getElementById('help-link');

  async function checkStatus() {
    statusBadge.textContent = '检测中...';
    statusBadge.className = 'status-badge checking';

    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_STATUS' });
      if (response.success) {
        if (response.mode === 'native') {
          statusBadge.textContent = '本地服务已连接';
          statusBadge.className = 'status-badge native';
          statusHint.textContent = response.rootDir ? `工作目录: ${response.rootDir}` : '请在文件面板中设置工作目录';
        } else {
          statusBadge.textContent = '浏览器模式';
          statusBadge.className = 'status-badge filesystem';
          statusHint.textContent = '在网页文件面板中选择文件夹即可使用';
        }
      }
    } catch {
      statusBadge.textContent = '未连接';
      statusBadge.className = 'status-badge disconnected';
      statusHint.textContent = '请安装本地服务，或在网页文件面板中选择文件夹';
    }
  }

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

  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  });

  checkStatus();
});
