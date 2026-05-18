class BaseAdapter {
  getHostname() {
    throw new Error('Not implemented');
  }

  isReady() {
    return !!this.getInputElement();
  }

  getInputElement() {
    throw new Error('Not implemented');
  }

  insertText(text, replace = false) {
    const el = this.getInputElement();
    if (!el) return false;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return this._insertIntoTextarea(el, text, replace);
    }
    return this._insertIntoContentEditable(el, text, replace);
  }

  _insertIntoTextarea(el, text, replace) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;

    if (replace) {
      nativeSetter.call(el, text);
    } else {
      const start = el.selectionStart;
      const before = el.value.substring(0, start);
      const after = el.value.substring(el.selectionEnd);
      nativeSetter.call(el, before + text + after);
      el.selectionStart = el.selectionEnd = start + text.length;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
    return true;
  }

  _insertIntoContentEditable(el, text, replace) {
    el.focus();

    if (replace) {
      el.textContent = '';
    }

    // Try execCommand first (works with most frameworks)
    const success = document.execCommand('insertText', false, text);
    if (success) return true;

    // Fallback: direct manipulation
    const selection = window.getSelection();
    if (replace) {
      el.textContent = text;
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }

    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));

    return true;
  }

  getSidebarAnchor() {
    return document.body;
  }

  waitForReady(timeout = 10000) {
    return new Promise((resolve) => {
      if (this.isReady()) {
        resolve(true);
        return;
      }

      const observer = new MutationObserver(() => {
        if (this.isReady()) {
          observer.disconnect();
          resolve(true);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(this.isReady());
      }, timeout);
    });
  }

  insertAsFile(filename, content) {
    const el = this.getInputElement();
    if (!el) return false;

    try {
      const file = new File([content], filename, { type: 'text/plain' });
      const dt = new DataTransfer();
      dt.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      });

      el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      el.dispatchEvent(dropEvent);

      return !dropEvent.defaultPrevented;
    } catch {
      return false;
    }
  }

  // Bridge methods - override in site-specific adapters for better accuracy

  getLastAssistantMessage() {
    const messages = document.querySelectorAll('[data-message-author-role="assistant"], .assistant-message, .ai-message');
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    return last.textContent || last.innerText || '';
  }

  isGenerating() {
    // Generic: check if send button is disabled or stop button exists
    const stopBtn = document.querySelector('[aria-label="Stop"], button[data-testid="stop-button"], .stop-button');
    if (stopBtn) return true;
    const sendBtn = this._getSendButton();
    if (sendBtn && this._isDisabled(sendBtn)) return true;
    return false;
  }

  clickSend() {
    const sendBtn = this._getSendButton();
    if (sendBtn && !this._isDisabled(sendBtn)) {
      sendBtn.click();
      return true;
    }
    // Fallback: simulate Enter key
    const el = this.getInputElement();
    if (el) {
      el.focus();
      const form = el.closest && el.closest('form');
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return true;
      }
      const eventInit = {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true
      };
      el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
      el.dispatchEvent(new KeyboardEvent('keypress', eventInit));
      el.dispatchEvent(new KeyboardEvent('keyup', eventInit));
      return true;
    }
    return false;
  }

  _isDisabled(el) {
    if (!el) return true;
    return Boolean(
      el.disabled ||
      el.getAttribute('disabled') !== null ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.dataset.disabled === 'true' ||
      /\bdisabled\b/i.test(String(el.className || ''))
    );
  }

  _getSendButton() {
    return document.querySelector([
      '[data-testid="send-button"]',
      'button[aria-label="Send"]',
      'button[aria-label="发送"]',
      'button[aria-label*="send" i]',
      'button[aria-label*="发送"]',
      'button[type="submit"]'
    ].join(','));
  }
}
