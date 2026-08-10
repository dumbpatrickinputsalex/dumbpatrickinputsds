// popup/investor-panel.js
export class InvestorPanel {
  constructor() {
    this.cache = {};
    this.elements = {
      investorSection: document.getElementById('investorSection'),
      investorList: document.getElementById('investorList')
    };
  }

  init() {
    this._bindEvents();
    this._loadData();
  }

  _bindEvents() {}

  async _loadData() {
    const result = await this._sendMessage('COPYFX_GET_INVESTORS');
    if (result && result.investors) {
      this.cache.investors = result.investors;
      this._renderInvestors(result.investors);
    }
  }

  _renderInvestors(investors) {
    if (!this.elements.investorList) return;
    this.elements.investorList.textContent = Инвесторов: ;
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
