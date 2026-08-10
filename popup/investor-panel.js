import { POPUP } from '../labels/popup-labels.js';
﻿// popup/investor-panel.js
export class InvestorPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.cache = {};
    this.elements = {
      investorSection: document.getElementById('investorSection'),
      investorList: document.getElementById('investorList')
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
_bindEvents() {}

  /**
 * (приватный) Выполняет операцию "_loadData".
 * @returns {void}
 */
async _loadData() {
    const result = await this._sendMessage('COPYFX_GET_INVESTORS');
    if (result && result.investors) {
      this.cache.investors = result.investors;
      this._renderInvestors(result.investors);
    }
  }

  /**
 * (приватный) Выполняет операцию "_renderInvestors".
 * @param {*} investors - Описание параметра.
 * @returns {void}
 */
_renderInvestors(investors) {
    if (!this.elements.investorList) return;
    this.elements.investorList.textContent = Инвесторов: ;
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
