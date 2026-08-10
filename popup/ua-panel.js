import { POPUP } from '../labels/popup-labels.js';
﻿// popup/ua-panel.js
export class UaPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.elements = {
      uaBox: document.getElementById('uaBox'),
      uaToggle: document.getElementById('uaToggle'),
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
    this._loadStatus();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.uaToggle) {
      this.elements.uaToggle.addEventListener('change', () => this._handleToggle());
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleToggle".
 * @returns {void}
 */
async _handleToggle() {
    const enabled = this.elements.uaToggle.checked;
    await this._sendMessage('UA_TOGGLE', { enabled });
  }

  /**
 * (приватный) Выполняет операцию "_loadStatus".
 * @returns {void}
 */
async _loadStatus() {
    const state = await this._getState();
    if (state && state.uaRules && state.uaRules.length > 0 && this.elements.uaBox) {
      this.elements.uaBox.style.display = 'block';
      if (this.elements.uaToggle) {
        this.elements.uaToggle.checked = state.uaRules[0].enabled !== false;
      }
    }
  }

  /**
 * (приватный) Выполняет операцию "_getState".
 * @returns {void}
 */
_getState() {
    return new Promise(resolve => {
      chrome.storage.local.get('state', result => {
        resolve(result.state || null);
      });
    });
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
