class GeminiAdapter extends BaseAdapter {
  getHostname() {
    return 'gemini.google.com';
  }

  getInputElement() {
    return document.querySelector('.ql-editor[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][aria-label]') ||
           document.querySelector('.text-input-field_textarea') ||
           document.querySelector('rich-textarea div[contenteditable="true"]') ||
           document.querySelector('textarea[aria-label]') ||
           document.querySelector('textarea') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('.conversation-container') ||
           document.querySelector('main') ||
           document.body;
  }

  getLastAssistantMessage() {
    return this._lastTextFromSelectors([
      'model-response',
      '[id^="model-response-message-content"]',
      '.model-response-text',
      '[class*="model-response"]',
      '[class*="response-container"]',
      '[class*="conversation-turn"] [class*="response"]'
    ]);
  }

  isGenerating() {
    return !!document.querySelector('[class*="loading"], [class*="streaming"], button[aria-label="Stop"], button[aria-label*="停止"]');
  }

  _getSendButton() {
    return this._findSendButton([
      'button[aria-label="Send message"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="发送"]',
      'button.send-button',
      'button[class*="send" i]',
      '[role="button"][aria-label*="Send" i]',
      '[role="button"][aria-label*="发送"]'
    ]);
  }
}
