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

  getLastAssistantMessage() {
    const messages = document.querySelectorAll('[data-is-streaming], .font-claude-message, [class*="assistant"]');
    if (messages.length === 0) {
      const allMsgs = document.querySelectorAll('.grid-cols-1 > div');
      if (allMsgs.length >= 2) return allMsgs[allMsgs.length - 1].textContent || '';
      return null;
    }
    return messages[messages.length - 1].textContent || '';
  }

  isGenerating() {
    return !!document.querySelector('button[aria-label="Stop Response"], [data-is-streaming="true"]');
  }

  _getSendButton() {
    return document.querySelector('button[aria-label="Send Message"], button[aria-label="发送消息"]');
  }
}
