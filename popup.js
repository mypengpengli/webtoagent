document.addEventListener('DOMContentLoaded', async () => {
  WebToAgentI18n.localizeDocument();
  const t = WebToAgentI18n.t;
  const statusBadge = document.getElementById('status-badge');
  const statusHint = document.getElementById('status-hint');
  const helpLink = document.getElementById('help-link');

  async function checkStatus() {
    statusBadge.textContent = t('checking');
    statusBadge.className = 'status-badge checking';

    try {
      const response = await chrome.runtime.sendMessage({ type: 'FS_STATUS' });
      if (response.success) {
        if (response.mode === 'native') {
          statusBadge.textContent = t('nativeConnected');
          statusBadge.className = 'status-badge native';
          statusHint.textContent = response.rootDir
            ? t('workingDirectory', { path: response.rootDir })
            : t('setWorkingDirectoryHint');
        } else {
          statusBadge.textContent = t('browserMode');
          statusBadge.className = 'status-badge filesystem';
          statusHint.textContent = t('browserModeHint');
        }
      }
    } catch {
      statusBadge.textContent = t('disconnected');
      statusBadge.className = 'status-badge disconnected';
      statusHint.textContent = t('disconnectedHint');
    }
  }

  const siteCheckboxes = document.querySelectorAll('[data-site]');
  const DEFAULT_ENABLED_SITES = [
    'chat.qwen.ai',
    'chatgpt.com',
    'aistudio.google.com',
    'gemini.google.com',
    'claude.ai'
  ];
  const ENABLED_SITES_VERSION = 2;
  const savedSites = await chrome.storage.sync.get(['enabledSites', 'enabledSitesVersion']);
  let enabledSites = savedSites.enabledSites || DEFAULT_ENABLED_SITES;
  if (savedSites.enabledSites && !savedSites.enabledSitesVersion) {
    enabledSites = Array.from(new Set([...savedSites.enabledSites, 'aistudio.google.com']));
    await chrome.storage.sync.set({ enabledSites, enabledSitesVersion: ENABLED_SITES_VERSION });
  }

  siteCheckboxes.forEach(cb => {
    cb.checked = enabledSites.includes(cb.dataset.site);
    cb.addEventListener('change', async () => {
      const sites = Array.from(siteCheckboxes)
        .filter(c => c.checked)
        .map(c => c.dataset.site);
      await chrome.storage.sync.set({ enabledSites: sites, enabledSitesVersion: ENABLED_SITES_VERSION });
    });
  });

  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  });

  checkStatus();
});
