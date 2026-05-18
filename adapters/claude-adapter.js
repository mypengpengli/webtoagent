class ClaudeAdapter extends BaseAdapter {
  getHostname() {
    return 'claude.ai';
  }

  getInputElement() {
    return document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][translate="no"]') ||
           document.querySelector('fieldset div[contenteditable="true"]') ||
           document.querySelector('[contenteditable="true"][role="textbox"]') ||
           document.querySelector('textarea') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('.flex-1') ||
           document.body;
  }

  getLastAssistantMessage() {
    const text = this._lastTextFromSelectors([
      '.font-claude-message',
      '[data-is-streaming]',
      '[data-testid="message-content"]',
      '[class*="assistant"]'
    ]);
    if (!text) {
      const allMsgs = document.querySelectorAll('.grid-cols-1 > div');
      if (allMsgs.length >= 2) return allMsgs[allMsgs.length - 1].textContent || '';
      return null;
    }
    return text;
  }

  isGenerating() {
    return !!document.querySelector('button[aria-label="Stop Response"], button[aria-label*="Stop" i], [data-is-streaming="true"]');
  }

  _getSendButton() {
    return this._findSendButton([
      'button[aria-label="Send Message"]',
      'button[aria-label="发送消息"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="发送"]',
      'button[type="submit"]'
    ]);
  }
}
