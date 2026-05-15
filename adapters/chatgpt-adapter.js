class ChatGPTAdapter extends BaseAdapter {
  getHostname() {
    return 'chatgpt.com';
  }

  getInputElement() {
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('div[contenteditable="true"][data-placeholder]') ||
           document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('textarea');
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('.flex-1') ||
           document.body;
  }

  getLastAssistantMessage() {
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    return last.textContent || '';
  }

  isGenerating() {
    return !!document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop generating"]');
  }

  _getSendButton() {
    return document.querySelector('button[data-testid="send-button"]');
  }
}
