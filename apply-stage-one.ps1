function CreateStage9_3 {
    Write-Host "📦 Stage 9.3: Special Insertions & Smart Counters..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
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
    card.innerHTML = \`
      <div class="insertion-header">
        <span class="insertion-name">\${escapedName}</span>
        <span class="insertion-count">(\${stepsCount} шагов)</span>
        <button class="insertion-delete" data-index="\${index}">×</button>
      </div>
      <div class="insertion-body">
        <div class="insertion-steps"><ul>\${stepsList}</ul></div>
      </div>
    \`;
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
"@ | Out-File -FilePath "options/controllers/special-insertions-controller.js" -Encoding utf8

    @"
// options/controllers/smart-counters-controller.js
export class SmartCountersController {
  constructor() {
    this.counters = [];
    this.container = document.getElementById('smartCountersContainer');
  }

  init(state) {
    this.counters = state.smartCounters || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.counters.forEach((counter, index) => {
      const card = this._createCard(counter, index);
      this.container.appendChild(card);
    });
  }

  _createCard(counter, index) {
    const card = document.createElement('div');
    card.className = 'counter-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(counter.name || 'Без имени');
    const currentValue = counter.current || 0;
    card.innerHTML = \`
      <div class="counter-header">
        <span class="counter-name">\${escapedName}</span>
        <span class="counter-value">\${currentValue}</span>
        <button class="counter-delete" data-index="\${index}">×</button>
      </div>
      <div class="counter-body">
        <div class="counter-history">История: \${(counter.history || []).length} записей</div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('counter-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.counters.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addCounterBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.counters.push({ name: 'Новый счётчик', current: 0, history: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.smartCounters = this.counters;
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
"@ | Out-File -FilePath "options/controllers/smart-counters-controller.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add special insertions and smart counters controllers"
    git push origin master

    Write-Host "✅ Stage 9.3 complete!" -ForegroundColor Green
}

function CreateStage9_4 {
    Write-Host "📦 Stage 9.4: Import/Export, Snapshots & Word Lists..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/import-export-controller.js
export class ImportExportController {
  constructor() {
    this.exportBtn = document.getElementById('exportBtn');
    this.importInput = document.getElementById('importInput');
    this.importBtn = document.getElementById('importBtn');
  }

  init(state) {
    this.state = state;
    this._bindEvents();
  }

  _bindEvents() {
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => this._handleExport());
    }
    if (this.importBtn) {
      this.importBtn.addEventListener('click', () => this._handleImport());
    }
  }

  async _handleExport() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formfiller-state-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async _handleImport() {
    const file = this.importInput?.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      document.dispatchEvent(new CustomEvent('options-import', { detail: imported }));
    } catch (error) {
      console.error('Failed to import:', error);
    }
  }

  save(state) {
    return state;
  }
}
"@ | Out-File -FilePath "options/controllers/import-export-controller.js" -Encoding utf8

    @"
// options/controllers/snapshots-controller.js
export class SnapshotsController {
  constructor() {
    this.snapshots = [];
    this.container = document.getElementById('snapshotsContainer');
  }

  init(state) {
    this.snapshots = state.snapshots || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.snapshots.forEach((snapshot, index) => {
      const card = this._createCard(snapshot, index);
      this.container.appendChild(card);
    });
  }

  _createCard(snapshot, index) {
    const card = document.createElement('div');
    card.className = 'snapshot-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(snapshot.name || 'Снапшот ' + (index + 1));
    const date = snapshot.date ? new Date(snapshot.date).toLocaleDateString() : 'Дата неизвестна';
    card.innerHTML = \`
      <div class="snapshot-header">
        <span class="snapshot-name">\${escapedName}</span>
        <span class="snapshot-date">\${date}</span>
        <button class="snapshot-delete" data-index="\${index}">×</button>
      </div>
      <div class="snapshot-body">
        <button class="snapshot-restore" data-index="\${index}">Восстановить</button>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('snapshot-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.snapshots.splice(index, 1);
        this.render();
        this._save();
      }
      if (e.target.classList.contains('snapshot-restore')) {
        const index = parseInt(e.target.dataset.index);
        const snapshot = this.snapshots[index];
        if (snapshot) {
          document.dispatchEvent(new CustomEvent('options-restore', { detail: snapshot }));
        }
      }
    });
    const addBtn = document.getElementById('addSnapshotBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.snapshots.push({
          name: 'Снапшот ' + (this.snapshots.length + 1),
          date: new Date().toISOString(),
          data: {}
        });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.snapshots = this.snapshots;
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
"@ | Out-File -FilePath "options/controllers/snapshots-controller.js" -Encoding utf8

    @"
// options/controllers/word-lists-controller.js
export class WordListsController {
  constructor() {
    this.lists = [];
    this.container = document.getElementById('wordListsContainer');
  }

  init(state) {
    this.lists = state.customWordLists || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.lists.forEach((list, index) => {
      const card = this._createCard(list, index);
      this.container.appendChild(card);
    });
  }

  _createCard(list, index) {
    const card = document.createElement('div');
    card.className = 'wordlist-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(list.name || 'Без имени');
    const wordsCount = (list.words || []).length;
    let wordsHtml = '';
    (list.words || []).forEach(w => {
      wordsHtml += '<span class="word-tag">' + this._escapeHtml(w) + '</span>';
    });
    card.innerHTML = \`
      <div class="wordlist-header">
        <span class="wordlist-name">\${escapedName}</span>
        <span class="wordlist-count">(\${wordsCount} слов)</span>
        <button class="wordlist-delete" data-index="\${index}">×</button>
      </div>
      <div class="wordlist-body">
        <div class="wordlist-words">\${wordsHtml}</div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('wordlist-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.lists.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addWordListBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.lists.push({ name: 'Новый список', words: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.customWordLists = this.lists;
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
"@ | Out-File -FilePath "options/controllers/word-lists-controller.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add import-export, snapshots and word lists controllers"
    git push origin master

    Write-Host "✅ Stage 9.4 complete!" -ForegroundColor Green
}

function CreateStage9_5 {
    Write-Host "📦 Stage 9.5: Scraper Config, CopyFX Config & UA Rules..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/scraper-config-controller.js
export class ScraperConfigController {
  constructor() {
    this.config = {};
    this.container = document.getElementById('scraperConfigContainer');
  }

  init(state) {
    this.config = state.scraperConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = \`
      <div class="scraper-config">
        <label>
          <input type="checkbox" class="scraper-enabled" \${this.config.enabled ? 'checked' : ''}>
          Включить Scraper
        </label>
        <div class="scraper-settings">
          <label>URL паттерны:</label>
          <textarea class="scraper-urls">\${(this.config.urlPatterns || []).join('\n')}</textarea>
        </div>
      </div>
    \`;
  }

  _bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('scraper-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.scraper-enabled');
      const urls = this.container.querySelector('.scraper-urls');
      if (enabled) this.config.enabled = enabled.checked;
      if (urls) this.config.urlPatterns = urls.value.split('\n').filter(Boolean);
    }
    state.scraperConfig = this.config;
    return state;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/scraper-config-controller.js" -Encoding utf8

    @"
// options/controllers/copyfx-config-controller.js
export class CopyfxConfigController {
  constructor() {
    this.config = {};
    this.container = document.getElementById('copyfxConfigContainer');
  }

  init(state) {
    this.config = state.copyfxConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = \`
      <div class="copyfx-config">
        <label>
          <input type="checkbox" class="copyfx-enabled" \${this.config.enabled ? 'checked' : ''}>
          Включить CopyFX
        </label>
        <div class="copyfx-settings">
          <label>Административный домен:</label>
          <input type="text" class="copyfx-domain" value="\${this.config.adminDomain || ''}">
        </div>
      </div>
    \`;
  }

  _bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('copyfx-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.copyfx-enabled');
      const domain = this.container.querySelector('.copyfx-domain');
      if (enabled) this.config.enabled = enabled.checked;
      if (domain) this.config.adminDomain = domain.value;
    }
    state.copyfxConfig = this.config;
    return state;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/copyfx-config-controller.js" -Encoding utf8

    @"
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
    card.innerHTML = \`
      <div class="ua-rule-header">
        <span class="ua-rule-index">#\${index + 1}</span>
        <span class="ua-rule-enabled">\${rule.enabled !== false ? '✅' : '❌'}</span>
        <button class="ua-rule-delete" data-index="\${index}">×</button>
      </div>
      <div class="ua-rule-body">
        <div class="ua-rule-field">
          <label>User-Agent:</label>
          <input type="text" class="ua-rule-agent" value="\${escapedUserAgent}" data-index="\${index}">
        </div>
        <div class="ua-rule-field">
          <label>URL паттерн:</label>
          <input type="text" class="ua-rule-url" value="\${escapedUrlPattern}" data-index="\${index}">
        </div>
        <div class="ua-rule-field">
          <label>
            <input type="checkbox" class="ua-rule-enabled-checkbox" \${rule.enabled !== false ? 'checked' : ''} data-index="\${index}">
            Включено
          </label>
        </div>
      </div>
    \`;
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
"@ | Out-File -FilePath "options/controllers/ua-rules-controller.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add scraper config, copyfx config and ua rules controllers"
    git push origin master

    Write-Host "✅ Stage 9.5 complete!" -ForegroundColor Green
}
# Основная логика
switch ($Stage) {
    "0" { CreateStage0 }
    "1" { CreateStage1 }
    "2" { CreateStage2 }
    "3" { CreateStage3 }
    "4" { CreateStage4 }
    "5" { CreateStage5 }
    "6" { CreateStage6 }
    "6b" { CreateStage6b }
    "6c" { CreateStage6c }
    "7" { CreateStage7 }
    "8" { CreateStage8 }
    "9" { CreateStage9 }
    "91" { CreateStage9_1 }
    "92" { CreateStage9_2 }
    "93" { CreateStage9_3 }
    "94" { CreateStage9_4 }
    "95" { CreateStage9_5 }
    default {
        Write-Host "❌ Unknown stage: $Stage" -ForegroundColor Red
        Write-Host "Available: 0, 1, 2, 3, 4, 5, 6, 6b, 6c, 7, 8, 9, 91, 92, 93, 94, 95" -ForegroundColor Yellow
    }
}