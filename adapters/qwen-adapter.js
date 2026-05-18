class QwenAdapter extends BaseAdapter {
  getHostname() {
    return 'chat.qwen.ai';
  }

  getInputElement() {
    return document.querySelector('textarea[data-testid="chat-input"]') ||
           document.querySelector('textarea.chat-input') ||
           document.querySelector('#chat-input') ||
           document.querySelector('textarea[placeholder]') ||
           document.querySelector('div[contenteditable="true"][role="textbox"]') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('.chat-container') ||
           document.querySelector('main') ||
           document.body;
  }

  getLastAssistantMessage() {
    const messages = document.querySelectorAll('.message-content--assistant, [class*="assistant"], [class*="answer"]');
    if (messages.length === 0) return null;
    return messages[messages.length - 1].textContent || '';
  }

  isGenerating() {
    return !!document.querySelector('[class*="stop"], button[aria-label="停止"]');
  }

  _getSendButton() {
    return this._findSendButton([
      '[data-testid="send-button"]',
      'button[aria-label="发送"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="send" i]',
      'button[type="submit"]',
      'button[class*="send" i]',
      '[role="button"][aria-label*="发送"]',
      '[role="button"][aria-label*="send" i]'
    ]);
  }
}
