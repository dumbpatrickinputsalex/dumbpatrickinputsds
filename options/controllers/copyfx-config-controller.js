import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/copyfx-config-controller.js
export class CopyfxConfigController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.config = {};
    this.container = document.getElementById('copyfxConfigContainer');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.config = state.copyfxConfig || { enabled: false };
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
      <div class="copyfx-config">
        <label>
          <input type="checkbox" class="copyfx-enabled" \>
          OPTIONS.COPYFX_ENABLED
        </label>
        <div class="copyfx-settings">
          <label>OPTIONS.COPYFX_ADMIN_DOMAIN:</label>
          <input type="text" class="copyfx-domain" value="\">
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
      if (e.target.classList.contains('copyfx-enabled')) {
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
      const enabled = this.container.querySelector('.copyfx-enabled');
      const domain = this.container.querySelector('.copyfx-domain');
      if (enabled) this.config.enabled = enabled.checked;
      if (domain) this.config.adminDomain = domain.value;
    }
    state.copyfxConfig = this.config;
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
