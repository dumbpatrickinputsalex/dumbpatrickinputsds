// popup/fill-panel.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class FillPanel {
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

  async init() {
    this._bindEvents();
    await this._updateStatus();
  }

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

  async _handleFillAll() {
    const result = await this._sendMessage('FILL_ALL');
    this._showResult(result);
  }

  async _handleFillSpecial() {
    const result = await this._sendMessage('FILL_SPECIAL');
    this._showResult(result);
  }

  async _updateStatus() {
    const state = await this.storage.getState();
    if (!state) return;
    
    const url = window.location.href;
    const activeRules = state.rules?.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    }) || [];
    
    if (this.elements.statusLabel) {
      this.elements.statusLabel.textContent = Активных правил: ;
    }
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  _showResult(result) {
    if (!result || !this.elements.resultDetails) return;
    
    this.elements.resultDetails.style.display = 'block';
    const table = this.elements.resultTable;
    if (table) {
      const errorsHtml = result.errors ? <tr><td>Ошибки:</td><td></td></tr> : '';
      table.innerHTML = 
        <tr><td>Заполнено:</td><td></td></tr>
        <tr><td>Найдено:</td><td></td></tr>
        
      ;
    }
  }
}
