class ChatGPTAdapter extends BaseAdapter {
  getHostname() {
    return 'chatgpt.com';
  }

  getInputElement() {
    // ChatGPT uses a contenteditable div (ProseMirror)
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('div[contenteditable="true"][data-placeholder]') ||
           document.querySelector('div.ProseMirror[contenteditable="true"]') ||
           document.querySelector('textarea');
  }

  _insertIntoContentEditable(el, text, replace) {
    el.focus();

    if (replace) {
      // Clear existing content
      el.innerHTML = '';
    }

    // ChatGPT's ProseMirror needs special handling
    // Create a paragraph element for each line
    const lines = text.split('\n');
    const fragment = document.createDocumentFragment();

    lines.forEach((line, i) => {
      const p = document.createElement('p');
      p.textContent = line || '​'; // zero-width space for empty lines
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
