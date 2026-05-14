class QwenAdapter extends BaseAdapter {
  getHostname() {
    return 'chat.qwen.ai';
  }

  getInputElement() {
    // Qwen uses a textarea or contenteditable div
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
}
