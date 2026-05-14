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
}
