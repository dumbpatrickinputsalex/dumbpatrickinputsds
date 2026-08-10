// popup/fill-panel.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';
import { POPUP } from '../labels/popup-labels.js';
import { COMMON } from '../labels/common-labels.js';

export class FillPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();
    
    this.elements = {
      fillAll: document.getElementById('fillAll'),
      fillSpecial: document.getElementById('fillSpecial'),
      openOptions: document.getElementById('openOptions'),
      statusLabel: document.getElementById('statusLabel'),
      resultDetails: document.getElementById('resultDetails'),
      resultTable: document.getElementById('resultTable')
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
async init() {
    this._bindEvents();
    await this._updateStatus();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.fillAll) {
      this.elements.fillAll.addEventListener('click', () => this._handleFillAll());
    }
    if (this.elements.fillSpecial) {
      this.elements.fillSpecial.addEventListener('click', () => this._handleFillSpecial());
    }
    if (this.elements.openOptions) {
      this.elements.openOptions.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleFillAll".
 * @returns {void}
 */
async _handleFillAll() {
    const result = await this._sendMessage('FILL_ALL');
    this._showResult(result);
  }

  /**
 * (приватный) Выполняет операцию "_handleFillSpecial".
 * @returns {void}
 */
async _handleFillSpecial() {
    const result = await this._sendMessage('FILL_SPECIAL');
    this._showResult(result);
  }

  /**
 * (приватный) Выполняет операцию "_updateStatus".
 * @returns {void}
 */
async _updateStatus() {
    const state = await this.storage.getState();
    if (!state) return;
    
    const url = window.location.href;
    const activeRules = state.rules?.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    }) || [];
    
    if (this.elements.statusLabel) {
      this.elements.statusLabel.textContent = POPUP.STATUS_ACTIVE_RULES ;
    }
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

  /**
 * (приватный) Выполняет операцию "_showResult".
 * @param {*} result - Описание параметра.
 * @returns {void}
 */
_showResult(result) {
    if (!result || !this.elements.resultDetails) return;
    
    this.elements.resultDetails.style.display = 'block';
    const table = this.elements.resultTable;
    if (table) {
      const errorsHtml = result.errors ? <tr><td>POPUP.RESULT_ERRORS</td><td></td></tr> : '';
      table.innerHTML = 
        <tr><td>POPUP.RESULT_FILLED</td><td></td></tr>
        <tr><td>POPUP.RESULT_MATCHED</td><td></td></tr>
        
      ;
    }
  }
}
