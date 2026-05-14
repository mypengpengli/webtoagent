class Autocomplete {
  constructor(fileAccess, adapter) {
    this.fileAccess = fileAccess;
    this.adapter = adapter;
    this.popup = null;
    this.active = false;
    this.query = '';
    this.selectedIndex = 0;
    this.results = [];
    this._createPopup();
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
      } else if (e.key === 'Enter' && this.active) {
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
    const text = this._getInputText(inputElement);
    const atMatch = text.match(/@([^\s@]*)$/);

    if (atMatch) {
      this.query = atMatch[1];
      this.active = true;
      this._search(this.query);
      this._positionPopup(inputElement);
    } else {
      this.hide();
    }
  }

  _getInputText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value;
    }
    return el.textContent || el.innerText || '';
  }

  async _search(query) {
    let files = this.fileAccess.fileIndex;
    if (files.length === 0) {
      const result = await this.fileAccess.listAllFiles(5);
      if (result.success) {
        files = result.files;
      }
    }

    this.results = fuzzyMatch(query, files, 8);
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
      const filename = r.item.split('/').pop();
      const dir = r.item.substring(0, r.item.length - filename.length);
      const isSelected = i === this.selectedIndex;
      return `
        <div class="aifr-ac-item" data-index="${i}" style="
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          background: ${isSelected ? '#313244' : 'transparent'};
          border-left: 2px solid ${isSelected ? '#89b4fa' : 'transparent'};
        ">
          <span style="color: #89b4fa; margin-right: 8px;">📄</span>
          <div style="overflow: hidden;">
            <div style="color: #cdd6f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${filename}</div>
            <div style="color: #6c7086; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dir}</div>
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
        this.selectedIndex = parseInt(item.dataset.index);
        this._renderResults();
      });
    });
  }

  async _selectCurrent() {
    if (this.results.length === 0) return;

    const selected = this.results[this.selectedIndex];
    const filePath = selected.item;

    this.hide();

    const result = await this.fileAccess.readFile(filePath);
    if (result.success) {
      if (result.size > 100 * 1024) {
        if (!confirm(`文件较大 (${(result.size / 1024).toFixed(1)}KB)，确定要插入吗？`)) {
          return;
        }
      }
      const formatted = formatFileContent(filePath, result.content);
      // Replace the @query with the file content
      const inputEl = this.adapter.getInputElement();
      const currentText = this._getInputText(inputEl);
      const newText = currentText.replace(/@[^\s@]*$/, '') + formatted;
      this.adapter.insertText(newText, true);
    } else {
      alert(`读取失败: ${result.error}`);
    }
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
