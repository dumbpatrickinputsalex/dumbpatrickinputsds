// options/controllers/special-insertions-controller.js
export class SpecialInsertionsController {
  constructor() {
    this.insertions = [];
    this.container = document.getElementById('specialInsertionsContainer');
  }

  init(state) {
    this.insertions = state.specialInsertions || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.insertions.forEach((insertion, index) => {
      const card = this._createCard(insertion, index);
      this.container.appendChild(card);
    });
  }

  _createCard(insertion, index) {
    const card = document.createElement('div');
    card.className = 'insertion-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(insertion.name || 'Без имени');
    const stepsCount = (insertion.steps || []).length;
    let stepsList = '';
    (insertion.steps || []).forEach(step => {
      stepsList += '<li>' + this._escapeHtml(step.selector || '') + '</li>';
    });
    card.innerHTML = \
      <div class="insertion-header">
        <span class="insertion-name">\</span>
        <span class="insertion-count">(\ шагов)</span>
        <button class="insertion-delete" data-index="\">×</button>
      </div>
      <div class="insertion-body">
        <div class="insertion-steps"><ul>\</ul></div>
      </div>
    \;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('insertion-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.insertions.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addInsertionBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.insertions.push({ name: 'Новая вставка', steps: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.specialInsertions = this.insertions;
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
