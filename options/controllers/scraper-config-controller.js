import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/scraper-config-controller.js
export class ScraperConfigController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.config = {};
    this.container = document.getElementById('scraperConfigContainer');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.config = state.scraperConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  /**
 * Отрисовывает интерфейс.
 * @returns {void}
 */
render() {
    if (!this.container) return;
    this.container.innerHTML = \
      <div class="scraper-config">
        <label>
          <input type="checkbox" class="scraper-enabled" \>
          Включить Scraper
        </label>
        <div class="scraper-settings">
          <label>URL паттерны:</label>
          <textarea class="scraper-urls">\</textarea>
        </div>
      </div>
    \;
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('scraper-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  /**
 * Сохраняет данные.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.scraper-enabled');
      const urls = this.container.querySelector('.scraper-urls');
      if (enabled) this.config.enabled = enabled.checked;
      if (urls) this.config.urlPatterns = urls.value.split('\n').filter(Boolean);
    }
    state.scraperConfig = this.config;
    return state;
  }

  /**
 * (приватный) Выполняет операцию "_save".
 * @returns {void}
 */
_save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
