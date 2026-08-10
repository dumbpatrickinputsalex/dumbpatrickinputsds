import { escapeHtml } from '../../shared/html-utils.js';
import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/folders-controller.js
export class FoldersController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.folders = [];
    this.container = document.getElementById('foldersContainer');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.folders = state.folders || [];
    this.render();
    this._bindEvents();
  }

  /**
 * Отрисовывает интерфейс.
 * @returns {void}
 */
render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.folders.forEach((folder, index) => {
      const card = this._createCard(folder, index);
      this.container.appendChild(card);
    });
  }

  /**
 * (приватный) Выполняет операцию "_createCard".
 * @param {*} folder - Описание параметра.
 * @param {*} index - Описание параметра.
 * @returns {void}
 */
_createCard(folder, index) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.index = index;
    const escapedName = this.escapeHtml(folder.name || 'Без имени');
    const rulesCount = (folder.rules || []).length;
    let rulesList = '';
    (folder.rules || []).forEach(ruleId => {
      rulesList += '<li>' + this.escapeHtml(ruleId) + '</li>';
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

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
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

  /**
 * Сохраняет данные.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
save(state) {
    state.folders = this.folders;
    return state;
  }

  /**
 * (приватный) Выполняет операцию "_escapeHtml".
 * @param {*} text - Описание параметра.
 * @returns {void}
 */
escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
 * (приватный) Выполняет операцию "_save".
 * @returns {void}
 */
_save() {
    document.dispatchEvent(new Event('options-save'));
  }
}

