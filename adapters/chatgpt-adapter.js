class ChatGPTAdapter extends BaseAdapter {
  getHostname() {
    return 'chatgpt.com';
  }

  getInputElement() {
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('textarea[data-testid="prompt-textarea"]') ||
           document.querySelector('div[contenteditable="true"][data-placeholder]') ||
           document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('[contenteditable="true"][role="textbox"]') ||
           document.querySelector('textarea');
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('.flex-1') ||
           document.body;
  }

  getLastAssistantMessage() {
    return this._lastTextFromSelectors([
      '[data-message-author-role="assistant"]',
      'article [data-message-author-role="assistant"]',
      '[data-testid^="conversation-turn"] [data-message-author-role="assistant"]',
      '[class*="markdown"]'
    ]);
  }

  isGenerating() {
    return !!document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label*="Stop" i]');
  }

  _getSendButton() {
    return this._findSendButton([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label*="send" i]',
      'button[type="submit"]'
    ]);
  }
}
