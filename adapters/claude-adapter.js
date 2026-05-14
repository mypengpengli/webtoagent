class ClaudeAdapter extends BaseAdapter {
  getHostname() {
    return 'claude.ai';
  }

  getInputElement() {
    // Claude uses a ProseMirror contenteditable div
    return document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][translate="no"]') ||
           document.querySelector('fieldset div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"]');
  }

  _insertIntoContentEditable(el, text, replace) {
    el.focus();

    if (replace) {
      el.innerHTML = '';
    }

    // Claude's ProseMirror editor
    const lines = text.split('\n');
    const fragment = document.createDocumentFragment();

    lines.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line || '';
      fragment.appendChild(p);
    });

    if (replace) {
      el.appendChild(fragment);
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(fragment);
        range.collapse(false);
      } else {
        el.appendChild(fragment);
      }
    }

    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));

    return true;
  }

  getSidebarAnchor() {
    return document.querySelector('main') ||
           document.querySelector('.flex-1') ||
           document.body;
  }
}
