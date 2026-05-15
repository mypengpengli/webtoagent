class GeminiAdapter extends BaseAdapter {
  getHostname() {
    return 'gemini.google.com';
  }

  getInputElement() {
    return document.querySelector('.ql-editor[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][aria-label]') ||
           document.querySelector('.text-input-field_textarea') ||
           document.querySelector('rich-textarea div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"]');
  }

  getSidebarAnchor() {
    return document.querySelector('.conversation-container') ||
           document.querySelector('main') ||
           document.body;
  }

  getLastAssistantMessage() {
    const messages = document.querySelectorAll('model-response, .model-response-text, [class*="response-container"]');
    if (messages.length === 0) return null;
    return messages[messages.length - 1].textContent || '';
  }

  isGenerating() {
    return !!document.querySelector('[class*="loading"], [class*="streaming"], button[aria-label="Stop"]');
  }

  _getSendButton() {
    return document.querySelector('button[aria-label="Send message"], button.send-button, [class*="send"]');
  }
}
