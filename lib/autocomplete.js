class Autocomplete {
  constructor(fileAccess, adapter) {
    this.fileAccess = fileAccess;
    this.adapter = adapter;
    this.popup = null;
    this.active = false;
    this.query = '';
    this.selectedIndex = 0;
    this.results = [];
    this._attachedElements = new WeakSet();
    this._atStartIndex = 0;
    this._searchGeneration = 0;
    this._createPopup();
  }

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _createPopup() {
    this.popup = document.createElement('div');
    this.popup.id = 'aifr-autocomplete';
    this.popup.style.cssText = `
      position: fixed;
      display: none;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      max-height: 240px;
      overflow-y: auto;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      min-width: 280px;
    `;
    document.body.appendChild(this.popup);
  }

  attachToInput(inputElement) {
    if (!inputElement) return;
    if (this._attachedElements.has(inputElement)) return;
    this._attachedElements.add(inputElement);

    inputElement.addEventListener('keydown', (e) => {
      if (!this.active) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this._renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this._renderResults();
      } else if ((e.key === 'Enter' || e.key === 'Tab') && this.active && this.results.length > 0) {
        e.preventDefault();
        this._selectCurrent();
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    const observer = new MutationObserver(() => this._checkInput(inputElement));
    if (inputElement.tagName === 'TEXTAREA') {
      inputElement.addEventListener('input', () => this._checkInput(inputElement));
    } else {
      observer.observe(inputElement, { childList: true, subtree: true, characterData: true });
      inputElement.addEventListener('input', () => this._checkInput(inputElement));
    }
  }

  _checkInput(inputElement) {
    const textBeforeCursor = this._getTextBeforeCursor(inputElement);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      this.query = atMatch[1];
      this._atStartIndex = textBeforeCursor.length - atMatch[0].length;
      this.active = true;
      this._search(this.query);
      this._positionPopup(inputElement);
    } else {
      this.hide();
    }
  }

  _getTextBeforeCursor(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value.substring(0, el.selectionStart);
    }
    // For contenteditable, get text from start to caret
    const sel = window.getSelection();
    if (!sel.rangeCount) return el.textContent || '';
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return range.toString();
  }

  _getInputText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value;
    }
    return el.textContent || el.innerText || '';
  }

  async _search(query) {
    const gen = ++this._searchGeneration;
    let files = this.fileAccess.fileIndex;
    if (files.length === 0) {
      this.results = [];
      this.popup.innerHTML = `
        <div style="padding: 12px; color: #a6adc8; text-align: center;">
          正在建立索引...
        </div>
      `;
      this.popup.style.display = 'block';

      const result = await this.fileAccess.listAllFiles(8);
      if (gen !== this._searchGeneration) return; // stale
      if (result.success) {
        files = result.files;
      }
    }

    // Search both files and directories
    const dirs = this.fileAccess.getDirIndex();
    const fileResults = fuzzyMatch(query, files, 6);
    const dirResults = fuzzyMatch(query, dirs, 4);

    // Mark type on results
    this.results = [
      ...dirResults.map(r => ({ ...r, type: 'directory' })),
      ...fileResults.map(r => ({ ...r, type: 'file' }))
    ];

    this.selectedIndex = 0;
    this._renderResults();
  }

  _renderResults() {
    if (this.results.length === 0) {
      this.popup.innerHTML = `
        <div style="padding: 12px; color: #6c7086; text-align: center;">
          ${this.query ? '未找到匹配文件' : '输入文件名搜索...'}
        </div>
      `;
      this.popup.style.display = 'block';
      return;
    }

    this.popup.innerHTML = this.results.map((r, i) => {
      const isDir = r.type === 'directory';
      const rawName = r.item.split('/').pop();
      const rawParent = r.item.substring(0, r.item.length - rawName.length);
      const name = this._escapeHtml(rawName);
      const parentDir = this._escapeHtml(rawParent);
      const isSelected = i === this.selectedIndex;
      const icon = isDir ? '📁' : '📄';
      const label = isDir ? `${name}/ (整个文件夹)` : name;
      return `
        <div class="aifr-ac-item" data-index="${i}" style="
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          background: ${isSelected ? '#313244' : 'transparent'};
          border-left: 2px solid ${isSelected ? '#89b4fa' : 'transparent'};
        ">
          <span style="color: ${isDir ? '#f9e2af' : '#89b4fa'}; margin-right: 8px;">${icon}</span>
          <div style="overflow: hidden;">
            <div style="color: #cdd6f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</div>
            <div style="color: #6c7086; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${parentDir}</div>
          </div>
        </div>
      `;
    }).join('');

    this.popup.style.display = 'block';

    this.popup.querySelectorAll('.aifr-ac-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this._selectCurrent();
      });
      item.addEventListener('mouseenter', () => {
        const newIdx = parseInt(item.dataset.index);
        if (newIdx === this.selectedIndex) return;
        // Update styles without rebuilding DOM
        const prev = this.popup.querySelector(`[data-index="${this.selectedIndex}"]`);
        if (prev) {
          prev.style.background = 'transparent';
          prev.style.borderLeft = '2px solid transparent';
        }
        item.style.background = '#313244';
        item.style.borderLeft = '2px solid #89b4fa';
        this.selectedIndex = newIdx;
      });
    });
  }

  async _selectCurrent() {
    if (this.results.length === 0) return;

    const selected = this.results[this.selectedIndex];
    const itemPath = selected.item;
    const isDir = selected.type === 'directory';

    this.hide();

    if (isDir) {
      await this._insertDirectory(itemPath);
    } else {
      await this._insertFile(itemPath);
    }
  }

  _replaceAtQuery(formatted) {
    const inputEl = this.adapter.getInputElement();
    if (!inputEl) return;

    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      const before = inputEl.value.substring(0, this._atStartIndex);
      const after = inputEl.value.substring(inputEl.selectionStart);
      const newText = before + formatted + after;
      this.adapter.insertText(newText, true);
    } else {
      // For contenteditable, replace full text (best effort)
      const fullText = inputEl.textContent || '';
      const before = fullText.substring(0, this._atStartIndex);
      const afterCursor = fullText.substring(this._atStartIndex).replace(/@[^\s@]*/, '');
      const newText = before + formatted + afterCursor;
      this.adapter.insertText(newText, true);
    }
  }

  async _insertFile(filePath) {
    const result = await this.fileAccess.readFile(filePath);
    if (result.success) {
      const formatted = formatFileContent(filePath, result.content);
      this._replaceAtQuery(formatted);
    }
  }

  async _insertDirectory(dirPath) {
    const filesInDir = this.fileAccess.getFilesInDir(dirPath);
    const fileCount = filesInDir.length;

    if (fileCount === 0) return;

    const maxFiles = 50;
    const maxSize = 5 * 1024 * 1024;

    const result = await this.fileAccess.readDirectory(dirPath, maxFiles, maxSize);
    if (!result.success) return;

    const formatted = result.files
      .map(f => formatFileContent(f.path, f.content))
      .join('\n\n');

    const summary = result.loadedFiles < result.totalFiles
      ? `\n\n> 已加载 ${result.loadedFiles}/${result.totalFiles} 个文件，总计 ${(result.totalSize / 1024).toFixed(1)}KB\n`
      : '';

    this._replaceAtQuery(formatted + summary);
  }

  _positionPopup(inputElement) {
    const rect = inputElement.getBoundingClientRect();
    this.popup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    this.popup.style.left = rect.left + 'px';
    this.popup.style.maxWidth = Math.min(400, rect.width) + 'px';
  }

  hide() {
    this.active = false;
    this.query = '';
    this.results = [];
    this.popup.style.display = 'none';
  }

  destroy() {
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
  }
}
