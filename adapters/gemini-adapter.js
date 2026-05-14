class GeminiAdapter extends BaseAdapter {
  getHostname() {
    return 'gemini.google.com';
  }

  getInputElement() {
    // Gemini uses a rich text editor
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
}
