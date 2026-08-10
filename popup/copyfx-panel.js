// popup/copyfx-panel.js
export class CopyfxPanel {
  constructor() {
    this.cache = {};
    this.elements = {
      copyfxBox: document.getElementById('copyfxBox'),
      copyfxTraders: document.getElementById('copyfxTraders'),
      copyfxRefresh: document.getElementById('copyfxRefresh')
    };
  }

  init() {
    this._bindEvents();
    this._loadData();
  }

  _bindEvents() {
    if (this.elements.copyfxRefresh) {
      this.elements.copyfxRefresh.addEventListener('click', () => this._loadData(true));
    }
  }

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

  _renderTraders(traders) {
    if (!this.elements.copyfxTraders) return;
    this.elements.copyfxTraders.textContent = Трейдеров: ;
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
