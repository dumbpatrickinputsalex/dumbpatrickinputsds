// options/controllers/ua-rules-controller.js
export class UaRulesController {
  constructor() {
    this.rules = [];
    this.container = document.getElementById('uaRulesContainer');
  }

  init(state) {
    this.rules = state.uaRules || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.rules.forEach((rule, index) => {
      const card = this._createCard(rule, index);
      this.container.appendChild(card);
    });
  }

  _createCard(rule, index) {
    const card = document.createElement('div');
    card.className = 'ua-rule-card';
    card.dataset.index = index;
    const escapedUserAgent = this._escapeHtml(rule.userAgent || '');
    const escapedUrlPattern = this._escapeHtml(rule.urlPattern || '*');
    card.innerHTML = \
      <div class="ua-rule-header">
        <span class="ua-rule-index">#\</span>
        <span class="ua-rule-enabled">\</span>
        <button class="ua-rule-delete" data-index="\">×</button>
      </div>
      <div class="ua-rule-body">
        <div class="ua-rule-field">
          <label>User-Agent:</label>
          <input type="text" class="ua-rule-agent" value="\" data-index="\">
        </div>
        <div class="ua-rule-field">
          <label>URL паттерн:</label>
          <input type="text" class="ua-rule-url" value="\" data-index="\">
        </div>
        <div class="ua-rule-field">
          <label>
            <input type="checkbox" class="ua-rule-enabled-checkbox" \ data-index="\">
            Включено
          </label>
        </div>
      </div>
    \;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('ua-rule-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.rules.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addUaRuleBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.rules.push({ userAgent: 'Mozilla/5.0 ...', urlPattern: '*', enabled: true });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    const agents = this.container?.querySelectorAll('.ua-rule-agent');
    const urls = this.container?.querySelectorAll('.ua-rule-url');
    const checkboxes = this.container?.querySelectorAll('.ua-rule-enabled-checkbox');
    agents?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].userAgent = input.value;
    });
    urls?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].urlPattern = input.value;
    });
    checkboxes?.forEach((checkbox, index) => {
      if (this.rules[index]) this.rules[index].enabled = checkbox.checked;
    });
    state.uaRules = this.rules;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
