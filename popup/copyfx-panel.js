import { POPUP } from '../labels/popup-labels.js';
﻿// popup/copyfx-panel.js
export class CopyfxPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.cache = {};
    this.elements = {
      copyfxBox: document.getElementById('copyfxBox'),
      copyfxTraders: document.getElementById('copyfxTraders'),
      copyfxRefresh: document.getElementById('copyfxRefresh')
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
    this._loadData();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.copyfxRefresh) {
      this.elements.copyfxRefresh.addEventListener('click', () => this._loadData(true));
    }
  }

  /**
 * (приватный) Выполняет операцию "_loadData".
 * @param {*} force - Описание параметра.
 * @returns {void}
 */
async _loadData(force = false) {
    if (!force && this.cache.traders) {
      this._renderTraders(this.cache.traders);
      return;
    }
    
    const result = await this._sendMessage('COPYFX_GET_TRADERS');
    if (result && result.traders) {
      this.cache.traders = result.traders;
      this._renderTraders(result.traders);
    }
  }

  /**
 * (приватный) Выполняет операцию "_renderTraders".
 * @param {*} traders - Описание параметра.
 * @returns {void}
 */
_renderTraders(traders) {
    if (!this.elements.copyfxTraders) return;
    this.elements.copyfxTraders.textContent = POPUP.COPYFX_TRADERS ;
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
