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
    const selectors = [
      '[data-testid="send-button"]',
      'button[aria-label="发送"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="send" i]',
      'button[type="submit"]',
      'button[class*="send" i]',
      '[role="button"][aria-label*="发送"]',
      '[role="button"][aria-label*="send" i]'
    ];
    const input = this.getInputElement();
    const roots = [
      input && input.closest('form'),
      input && input.closest('[class*="composer" i]'),
      input && input.closest('[class*="input" i]'),
      input && input.parentElement,
      input && input.parentElement && input.parentElement.parentElement,
      document
    ].filter(Boolean);

    for (const root of roots) {
      for (const selector of selectors) {
        const buttons = Array.from(root.querySelectorAll(selector));
        const button = buttons.find(el => this._isVisible(el) && !this._looksLikeStopButton(el));
        if (button) return button;
      }
    }

    return null;
  }

  _isVisible(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  _looksLikeStopButton(el) {
    const text = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''} ${el.className || ''}`;
    return /停止|stop|pause|中止/i.test(text);
  }
}
