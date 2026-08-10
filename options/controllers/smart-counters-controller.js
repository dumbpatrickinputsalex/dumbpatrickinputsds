import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/smart-counters-controller.js
export class SmartCountersController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.counters = [];
    this.container = document.getElementById('smartCountersContainer');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.counters = state.smartCounters || [];
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
    this.counters.forEach((counter, index) => {
      const card = this._createCard(counter, index);
      this.container.appendChild(card);
    });
  }

  /**
 * (приватный) Выполняет операцию "_createCard".
 * @param {*} counter - Описание параметра.
 * @param {*} index - Описание параметра.
 * @returns {void}
 */
_createCard(counter, index) {
    const card = document.createElement('div');
    card.className = 'counter-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(counter.name || 'Без имени');
    const currentValue = counter.current || 0;
    card.innerHTML = \
      <div class="counter-header">
        <span class="counter-name">\</span>
        <span class="counter-value">\</span>
        <button class="counter-delete" data-index="\">×</button>
      </div>
      <div class="counter-body">
        <div class="counter-history">OPTIONS.COUNTERS_HISTORY: \ записей</div>
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
      if (e.target.classList.contains('counter-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.counters.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addCounterBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.counters.push({ name: 'Новый счётчик', current: 0, history: [] });
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
    state.smartCounters = this.counters;
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
