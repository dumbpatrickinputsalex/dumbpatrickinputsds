// popup/ua-panel.js
export class UaPanel {
  constructor() {
    this.elements = {
      uaBox: document.getElementById('uaBox'),
      uaToggle: document.getElementById('uaToggle'),
    };
  }

  init() {
    this._bindEvents();
    this._loadStatus();
  }

  _bindEvents() {
    if (this.elements.uaToggle) {
      this.elements.uaToggle.addEventListener('change', () => this._handleToggle());
    }
  }

  async _handleToggle() {
    const enabled = this.elements.uaToggle.checked;
    await this._sendMessage('UA_TOGGLE', { enabled });
  }

  async _loadStatus() {
    const state = await this._getState();
    if (state && state.uaRules && state.uaRules.length > 0 && this.elements.uaBox) {
      this.elements.uaBox.style.display = 'block';
      if (this.elements.uaToggle) {
        this.elements.uaToggle.checked = state.uaRules[0].enabled !== false;
      }
    }
  }

  _getState() {
    return new Promise(resolve => {
      chrome.storage.local.get('state', result => {
        resolve(result.state || null);
      });
    });
  }

  _sendMessage(type, payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
