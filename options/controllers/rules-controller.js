// options/controllers/rules-controller.js
export class RulesController {
  constructor() {
    this.rules = [];
    this.container = document.getElementById('rulesContainer');
  }

  init(state) {
    this.rules = state.rules || [];
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
    card.className = 'rule-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(rule.name || 'Без имени');
    const escapedTemplate = this._escapeHtml(rule.template || '');
    const conditionsStr = JSON.stringify(rule.conditions || {}, null, 2);
    const escapedConditions = this._escapeHtml(conditionsStr);
    card.innerHTML = \
      <div class="rule-header">
        <span class="rule-name">\</span>
        <button class="rule-delete" data-index="\">×</button>
      </div>
      <div class="rule-body">
        <div class="rule-template">
          <label>Шаблон:</label>
          <input type="text" class="rule-template-input" value="\" data-index="\">
        </div>
        <div class="rule-conditions">
          <label>Условия:</label>
          <textarea class="rule-conditions-input" data-index="\">\</textarea>
        </div>
      </div>
    \;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('rule-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.rules.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addRuleBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.rules.push({ name: 'Новое правило', template: '{{text}}', conditions: { items: [] } });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    const inputs = this.container?.querySelectorAll('.rule-template-input');
    inputs?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].template = input.value;
    });
    state.rules = this.rules;
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
