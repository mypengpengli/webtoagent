const NATIVE_HOST_NAME = 'com.aifilereader.host';

let nativePort = null;
let nativeConnected = false;
let pendingRequests = new Map();
let requestId = 0;

function connectNativeHost() {
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((msg) => {
      // Handle unsolicited push messages (file watcher)
      if (msg.type === 'FS_CHANGED') {
        broadcastToTabs(msg);
        return;
      }

      const id = msg._id;
      if (id !== undefined && pendingRequests.has(id)) {
        pendingRequests.get(id).resolve(msg);
        pendingRequests.delete(id);
      }
    });

    nativePort.onDisconnect.addListener(() => {
      nativeConnected = false;
      nativePort = null;
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error('Native host disconnected'));
      }
      pendingRequests.clear();
    });

    return true;
  } catch {
    nativeConnected = false;
    return false;
  }
}

function broadcastToTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try { chrome.tabs.sendMessage(tab.id, msg); } catch {}
    }
  });
}

function sendNativeMessage(msg) {
  return new Promise((resolve, reject) => {
    if (!nativePort) {
      if (!connectNativeHost()) {
        reject(new Error('Cannot connect to native host'));
        return;
      }
    }

    const id = ++requestId;
    msg._id = id;
    pendingRequests.set(id, { resolve, reject });

    try {
      nativePort.postMessage(msg);
    } catch (err) {
      pendingRequests.delete(id);
      reject(err);
    }

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

async function checkNativeHost() {
  try {
    const response = await sendNativeMessage({ action: 'ping' });
    if (response.success) {
      nativeConnected = true;
      return true;
    }
    return false;
  } catch {
    nativeConnected = false;
    return false;
  }
}

async function ensureConnected() {
  if (nativeConnected) return true;
  return await checkNativeHost();
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    sendResponse({ success: false, error: err.message });
  });
  return true; // async response
});

async function handleMessage(message) {
  switch (message.type) {
    case 'FS_STATUS': {
      const native = await ensureConnected();
      if (native) {
        const rootResp = await sendNativeMessage({ action: 'get_root' });
        return { success: true, mode: 'native', rootDir: rootResp.rootDir || '' };
      }
      return { success: true, mode: 'filesystem-api' };
    }

    case 'FS_LIST': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'list', path: message.path || '' });
      }
      return { success: false, error: 'Native host not connected', fallback: true };
    }

    case 'FS_READ': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'read', path: message.path });
      }
      return { success: false, error: 'Native host not connected', fallback: true };
    }

    case 'FS_READ_BATCH': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'read_batch', paths: message.paths });
      }
      return { success: false, error: 'Native host not connected', fallback: true };
    }

    case 'FS_STAT': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'stat', path: message.path });
      }
      return { success: false, error: 'Native host not connected', fallback: true };
    }

    case 'FS_LIST_ALL': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'list_all', maxDepth: message.maxDepth || 8 });
      }
      return { success: false, error: 'Native host not connected', fallback: true };
    }

    case 'FS_SET_ROOT': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'set_root', path: message.path });
      }
      await chrome.storage.local.set({ rootDir: message.path });
      return { success: true, rootDir: message.path };
    }

    case 'FS_GET_ROOT': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'get_root' });
      }
      const data = await chrome.storage.local.get('rootDir');
      return { success: true, rootDir: data.rootDir || '' };
    }

    case 'FS_GET_RECENT_ROOTS': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'get_recent_roots' });
      }
      return { success: true, roots: [] };
    }

    case 'FS_WATCH_START': {
      if (await ensureConnected()) {
        return await sendNativeMessage({ action: 'watch_start' });
      }
      return { success: false, error: 'Native host not connected' };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
      }
    });
  }
});

// Lazy connect: first FS_STATUS call will trigger connection and handshake
