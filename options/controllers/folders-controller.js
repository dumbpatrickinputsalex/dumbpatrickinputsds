import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/folders-controller.js
export class FoldersController {
  constructor() {
    this.folders = [];
    this.container = document.getElementById('foldersContainer');
  }

  init(state) {
    this.folders = state.folders || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.folders.forEach((folder, index) => {
      const card = this._createCard(folder, index);
      this.container.appendChild(card);
    });
  }

  _createCard(folder, index) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(folder.name || 'Без имени');
    const rulesCount = (folder.rules || []).length;
    let rulesList = '';
    (folder.rules || []).forEach(ruleId => {
      rulesList += '<li>' + this._escapeHtml(ruleId) + '</li>';
    });
    card.innerHTML = \
      <div class="folder-header">
        <span class="folder-name">\</span>
        <span class="folder-count">(\ правил)</span>
        <button class="folder-delete" data-index="\">×</button>
      </div>
      <div class="folder-body">
        <div class="folder-rules"><ul>\</ul></div>
      </div>
    \;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('folder-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.folders.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addFolderBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.folders.push({ name: 'Новая папка', rules: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.folders = this.folders;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
