class ClaudeAdapter extends BaseAdapter {
  getHostname() {
    return 'claude.ai';
  }

  getInputElement() {
    return document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][translate="no"]') ||
           document.querySelector('fieldset div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('.flex-1') ||
           document.body;
  }
}
