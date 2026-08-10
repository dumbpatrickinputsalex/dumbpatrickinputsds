import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/word-lists-controller.js
export class WordListsController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.lists = [];
    this.container = document.getElementById('wordListsContainer');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.lists = state.customWordLists || [];
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
    this.lists.forEach((list, index) => {
      const card = this._createCard(list, index);
      this.container.appendChild(card);
    });
  }

  /**
 * (приватный) Выполняет операцию "_createCard".
 * @param {*} list - Описание параметра.
 * @param {*} index - Описание параметра.
 * @returns {void}
 */
_createCard(list, index) {
    const card = document.createElement('div');
    card.className = 'wordlist-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(list.name || 'Без имени');
    const wordsCount = (list.words || []).length;
    let wordsHtml = '';
    (list.words || []).forEach(w => {
      wordsHtml += '<span class="word-tag">' + this._escapeHtml(w) + '</span>';
    });
    card.innerHTML = \
      <div class="wordlist-header">
        <span class="wordlist-name">\</span>
        <span class="wordlist-count">(\ слов)</span>
        <button class="wordlist-delete" data-index="\">×</button>
      </div>
      <div class="wordlist-body">
        <div class="wordlist-words">\</div>
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
      if (e.target.classList.contains('wordlist-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.lists.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addWordListBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.lists.push({ name: 'Новый список', words: [] });
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
    state.customWordLists = this.lists;
    return state;
  }

  /**
 * (приватный) Выполняет операцию "_escapeHtml".
 * @param {*} text - Описание параметра.
 * @returns {void}
 */
_escapeHtml(text) {
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
