class AIStudioAdapter extends BaseAdapter {
  getHostname() {
    return 'aistudio.google.com';
  }

  getInputElement() {
    return document.querySelector('ms-prompt-input-wrapper textarea') ||
           document.querySelector('textarea[aria-label*="prompt" i]') ||
           document.querySelector('textarea[aria-label*="message" i]') ||
           document.querySelector('textarea[aria-label*="输入"]') ||
           document.querySelector('textarea[aria-label*="提示"]') ||
           document.querySelector('.ql-editor[contenteditable="true"]') ||
           document.querySelector('rich-textarea div[contenteditable="true"]') ||
           document.querySelector('[contenteditable="true"][role="textbox"]') ||
           document.querySelector('textarea') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('[class*="chat" i]') ||
           document.body;
  }

  getLastAssistantMessage() {
    return this._lastTextFromSelectors([
      'ms-chat-turn [class*="model" i]',
      'ms-chat-turn [class*="response" i]',
      '[data-test-id*="model" i]',
      '[data-testid*="model" i]',
      '[class*="model-response" i]',
      '[class*="response-container" i]',
      '[class*="markdown" i]'
    ]);
  }

  isGenerating() {
    return !!document.querySelector([
      'button[aria-label*="Stop" i]',
      'button[aria-label*="停止"]',
      'button[aria-label*="Cancel" i]',
      '[class*="loading" i]',
      '[class*="streaming" i]',
      '[class*="running" i]'
    ].join(','));
  }

  _getSendButton() {
    return this._findSendButton([
      'button[aria-label*="Run" i]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="发送"]',
      'button[aria-label*="运行"]',
      'button[title*="Run" i]',
      'button[title*="Send" i]',
      'button[title*="发送"]',
      'button[title*="运行"]',
      'button[type="submit"]',
      'button[class*="run" i]',
      'button[class*="send" i]'
    ]);
  }
}
