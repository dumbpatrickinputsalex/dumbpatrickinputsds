// Options UI. Модель: state.folders[] + state.rules[] (плоский). Профили удалены.

const $  = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);

const SNAP_LIMIT      = 20;
const AUTO_SNAP_LIMIT = 10;
const HISTORY_LIMIT   = 5;

// Палитра для папок — 20 цветов Atlassian-подобных (legacy, used as fallback border)
const COLORS = [
  '#0052CC', '#0747A6', '#4C9AFF',
  '#00875A', '#006644', '#36B37E',
  '#DE350B', '#BF2600', '#EB5A46',
  '#FF8B00', '#FFAB00', '#FFC400',
  '#6554C0', '#5243AA', '#403294',
  '#00B8D9', '#008DA6', '#79E2F2',
  '#6B778C', '#42526E'
];

let state       = null;
let previewUrl  = '';

/* ================ Storage ================ */
function load() {
  return new Promise(resolve => {
    chrome.storage.local.get(['state'], (r) => {
      state = migrateShape(r.state || null);
      resolve();
    });
  });
}
let _needNormalize = false;
function markStructureDirty() { _needNormalize = true; }
let _selfSaving = false;
function save() {
  if (_needNormalize) { normalizeRuleOrder(); _needNormalize = false; }
  _selfSaving = true;
  return new Promise(resolve => chrome.storage.local.set({ state }, () => {
    _selfSaving = false;
    resolve();
  }));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.state || _selfSaving) return;
  state = migrateShape(changes.state.newValue);
  renderAll();
});

function cleanupUnsaved() {
  if (!state) return;
  function revertList(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]._isNew) { arr.splice(i, 1); continue; }
      if (arr[i]._snapshot) { Object.assign(arr[i], arr[i]._snapshot); delete arr[i]._snapshot; }
      arr[i].collapsed = true;
    }
  }
  revertList(state.rules);
  revertList(state.specialInsertions || []);
  revertList(state.smartCounters || []);
  revertList(state.customWordLists || []);
  for (const f of (state.folders || [])) f.collapsed = true;
  if (state.scraperConfig) state.scraperConfig.collapsed = true;
  if (state.copyfxConfig) state.copyfxConfig.collapsed = true;
}

// Гарантируем: state.rules следует визуальному порядку
function normalizeRuleOrder() {
  if (!state || !Array.isArray(state.rules)) return;
  const groups = new Map();
  groups.set(null, []);
  for (const f of (state.folders || [])) groups.set(f.id, []);
  const orphan = [];
  for (const r of state.rules) {
    const key = r.folderId || null;
    if (groups.has(key)) groups.get(key).push(r);
    else { r.folderId = null; orphan.push(r); }
  }
  const flat = [];
  flat.push(...groups.get(null), ...orphan);
  for (const f of (state.folders || [])) flat.push(...(groups.get(f.id) || []));
  state.rules = flat;
}
let saveTimer = null;
function saveDebounced() { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(), 300); }

function migrateShape(s) {
  if (!s) return {
    version: 2, folders: [], rules: [], specialInsertions: [],
    smartCounters: [], customWordLists: [], snapshots: [], counters: {}
  };
  // Старая схема с profiles → мигрируем
  if (s.profiles && !s.rules) {
    const now = new Date().toISOString();
    const folders = [];
    const rules = [];
    for (const profile of s.profiles) {
      let folderId = null;
      if (!profile.isDefault && profile.name) {
        const fid = 'f_' + Math.random().toString(36).slice(2, 10);
        folders.push({ id: fid, name: profile.name, icon: '', collapsed: false });
        folderId = fid;
      }
      for (const oldRule of (profile.rules || [])) {
        const conds = ((oldRule.match && oldRule.match.conditions) || []).map(c => ({ ...c, connector: 'AND' }));
        const wasOR = oldRule.match && oldRule.match.mode === 'OR';
        if (wasOR && conds.length > 1) for (let i = 1; i < conds.length; i++) conds[i].connector = 'OR';
        rules.push({
          id: oldRule.id || uid(), folderId, name: oldRule.label || oldRule.name || 'Правило',
          enabled: oldRule.enabled !== false, collapsed: true,
          targets: oldRule.targets || ['input', 'textarea'],
          urlPatterns: (profile.urlPatterns || []).slice(),
          template: oldRule.template || '',
          match: { customLogic: !!wasOR, conditions: conds },
          createdAt: now, updatedAt: now, history: []
        });
      }
    }
    s = { version: 2, folders, rules, specialInsertions: s.specialInsertions || [],
          smartCounters: s.smartCounters || [], snapshots: s.snapshots || [], counters: s.counters || {} };
  }
  // Гарантируем поля
  s.version = 2;
  if (!Array.isArray(s.folders))          s.folders = [];
  if (!Array.isArray(s.rules))            s.rules = [];
  if (!Array.isArray(s.specialInsertions))s.specialInsertions = [];
  if (!Array.isArray(s.smartCounters))    s.smartCounters = [];
  if (!Array.isArray(s.customWordLists)) s.customWordLists = [];
  if (!Array.isArray(s.snapshots))        s.snapshots = [];
  if (!Array.isArray(s.pageShortcuts))    s.pageShortcuts = [];
  if (typeof s.debugMode !== 'boolean')   s.debugMode = false;
  if (typeof s.authorName !== 'string')  s.authorName = '';
  if (!Array.isArray(s.activityLog))     s.activityLog = [];
  if (!Array.isArray(s.uaRules))         s.uaRules = [];
  if (!s.scraperConfig) s.scraperConfig = { enabled: false, urls: [''], parentSelector: 'div.debug_plugin_client', fields: [], collapsed: true };
  if (!Array.isArray(s.scraperConfig.urls)) s.scraperConfig.urls = s.scraperConfig.url ? [s.scraperConfig.url] : [''];
  delete s.scraperConfig.url;
  if (!Array.isArray(s.scraperConfig.fields)) s.scraperConfig.fields = [];
  if (typeof s.scraperConfig.collapsed !== 'boolean') s.scraperConfig.collapsed = true;
  if (!s.copyfxConfig) s.copyfxConfig = { enabled: false, collapsed: true, pageUrl: '/copyfx/my/strategies/', apiUrl: '/copyfx2-api/copyfx/strategies', extraFields: [] };
  if (!Array.isArray(s.copyfxConfig.extraFields)) s.copyfxConfig.extraFields = [];
  if (typeof s.copyfxConfig.collapsed !== 'boolean') s.copyfxConfig.collapsed = true;
  if (!s.counters) s.counters = {};
  for (const ua of s.uaRules) {
    if (!ua.id) ua.id = 'ua_' + Math.random().toString(36).slice(2, 10);
    if (typeof ua.enabled !== 'boolean') ua.enabled = true;
    if (typeof ua.collapsed !== 'boolean') ua.collapsed = true;
    if (!Array.isArray(ua.urls)) ua.urls = ua.url ? [ua.url] : [];
    delete ua.url;
    if (!ua.createdAt) ua.createdAt = new Date().toISOString();
    if (!ua.updatedAt) ua.updatedAt = ua.createdAt;
  }
  for (const ins of s.specialInsertions) {
    if (typeof ins.collapsed !== 'boolean') ins.collapsed = !!ins.valueTemplate; // старые записи → свёрнуты
    if (!ins.valueMeta) {
      ins.valueMeta = { type: 'advanced', params: { template: ins.valueTemplate || '' } };
    }
    if (!ins.actionType) ins.actionType = 'fill';
    if (!ins.createdAt) ins.createdAt = new Date().toISOString();
    if (!ins.updatedAt) ins.updatedAt = ins.createdAt;
  }
  if (!s._historyV2) {
    for (const r of s.rules) { r.history = []; }
    s._historyV2 = true;
  }
  for (const r of s.rules) {
    if (!r.match) r.match = { customLogic: false, conditions: [] };
    if (!Array.isArray(r.match.conditions)) r.match.conditions = [];
    if (typeof r.match.customLogic !== 'boolean') r.match.customLogic = !!(r.match.mode === 'OR');
    delete r.match.mode;
    for (const c of r.match.conditions) if (!c.connector) c.connector = 'AND';
    if (!Array.isArray(r.urlPatterns)) r.urlPatterns = [];
    // Миграция urlPatterns → urlConditions (contains + connector)
    if (!Array.isArray(r.urlConditions)) {
      r.urlConditions = (r.urlPatterns || []).map((p, i) => ({
        value: p, connector: i === 0 ? 'AND' : 'OR'
      }));
    }
    for (const c of r.urlConditions) if (!c.connector) c.connector = 'AND';
    delete r.urlPatterns;
    if (!Array.isArray(r.targets)) r.targets = ['input'];
    if (r.targets.length > 1) r.targets = [r.targets[0]];
    if (!Array.isArray(r.history))     r.history = [];
    if (typeof r.collapsed !== 'boolean') r.collapsed = true;
    if (!r.actionType) r.actionType = 'fill';
    if (!r.createdAt) r.createdAt = new Date().toISOString();
    if (!r.updatedAt) r.updatedAt = r.createdAt;
    if (!r.name && r.label) r.name = r.label;
    if (r.folderId === undefined) r.folderId = null;
  }
  delete s.profiles;
  return s;
}

/* ================ Tabs ================ */
$$('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
function switchTab(name) {
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}

/* ================ Utils ================ */
function escapeAttr(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function escapeText(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function tsForFilename() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }
function safeName(s) { return String(s).replace(/[^\w\-]+/g, '_').slice(0, 50); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
/* ================ Toasts ================ */
function toast(text, kind = 'ok') {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + kind;
  t.textContent = text;
  host.appendChild(t);
  setTimeout(() => { t.classList.add('leaving'); }, 3500);
  setTimeout(() => { t.remove(); }, 4000);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ================ Preview context ================ */
function previewCtx() {
  return { counters: {}, smartCounters: state.smartCounters, customWordLists: state.customWordLists || [], url: previewUrl || '', dryRun: true };
}
function updatePreview(card, template) {
  const box = card.querySelector('.preview');
  if (!box) return;
  if (!template) { box.textContent = '—'; return; }
  try { box.textContent = window.FF.render(template, previewCtx()) || '—'; }
  catch (e) { box.textContent = 'Ошибка: ' + e.message; }
}

/* ================ Attribute placeholders ================ */
function attrPlaceholder(attr) {
  const a = String(attr || '').toLowerCase();
  if (a === 'id')                      return 'login-form';
  if (a === 'name')                    return 'userEmail';
  if (a === 'class')                   return 'form-input';
  if (a === 'placeholder')             return 'Введите email';
  if (a === 'label')                   return 'Ваш email';
  if (a === 'type')                    return 'email';
  if (a === 'value')                   return 'submit';
  if (a === 'title')                   return 'Тултип поля';
  if (a === 'role')                    return 'textbox';
  if (a === 'alt')                     return 'user avatar';
  if (a === 'href')                    return '/login';
  if (a === 'src')                     return 'https://…';
  if (a === 'for')                     return 'email-input';
  if (a === 'autocomplete')            return 'email';
  if (a === 'pattern')                 return '[a-z]+';
  if (a === 'min' || a === 'max')      return '0';
  if (a === 'step')                    return '1';
  if (a === 'maxlength' || a === 'minlength') return '10';
  if (a === 'required')                return 'true';
  if (a === 'readonly' || a === 'disabled') return 'true';
  if (a === 'aria-label')              return 'Email address';
  if (a === 'aria-labelledby')         return 'email-label';
  if (a === 'aria-describedby')        return 'email-help';
  if (a === 'aria-required')           return 'true';
  if (a === 'aria-invalid')            return 'false';
  if (a.startsWith('data-'))           return 'значение атрибута';
  return 'подстрока для поиска';
}

/* ================ URL condition row ================ */
function renderUrlCondRow(rule, cond, ci) {
  const row = document.createElement('div');
  row.className = 'cond-row';
  const showConn = ci > 0;
  row.innerHTML = `
    ${showConn ? `
      <div class="cond-connector">
        <select class="urlConn" title="Как соединить с предыдущим условием">
          <option value="AND" ${cond.connector === 'AND' ? 'selected' : ''}>AND</option>
          <option value="OR"  ${cond.connector === 'OR'  ? 'selected' : ''}>OR</option>
        </select>
      </div>` : ''}
    <div class="row" style="margin:0">
      <input type="text" class="urlVal grow" value="${escapeAttr(cond.value || '')}" placeholder="*example.com*login" title="URL должен содержать эту строку. * — wildcard.">
      <button class="btn-x small delUrlCond" title="Удалить URL-условие">×</button>
    </div>
  `;
  row.querySelector('.urlVal').addEventListener('input', e => {
    cond.value = e.target.value; touchRule(rule); saveDebounced();
    const card = row.closest('.rule-card');
    if (card && card._updateSectionSummary) card._updateSectionSummary();
  });
  row.querySelector('.delUrlCond').addEventListener('click', () => {
    rule.urlConditions = rule.urlConditions.filter((_, i) => i !== ci);
    touchRule(rule);
    saveDebounced();
    const card = row.closest('.rule-card');
    if (card && card._rerenderUrlConditions) card._rerenderUrlConditions();
  });
  if (showConn) {
    row.querySelector('.urlConn').addEventListener('change', e => { cond.connector = e.target.value; touchRule(rule); saveDebounced(); });
  }
  return row;
}

/* ================ Smart field type detection ================ */
function detectFieldTargets(html) {
  try {
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const el = doc.querySelector('input, textarea, select, [contenteditable]');
    if (!el) return null;
    const tag = el.tagName.toLowerCase();
    const targets = [];
    let summary = '<' + tag;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'textarea') { targets.push('textarea'); summary += '>'; }
    else if (tag === 'select') { targets.push('select'); summary += '>'; }
    else if (tag === 'input') {
      if (type === 'checkbox') { targets.push('checkbox'); summary += ' type="checkbox">'; }
      else if (type === 'radio') { targets.push('radio'); summary += ' type="radio">'; }
      else { targets.push('input'); summary += type ? ' type="' + type + '">' : '>'; }
    } else if (el.isContentEditable) { targets.push('input'); summary += ' contenteditable>'; }

    // Suggested condition based on stable attribute
    let suggestion = null;
    const name = el.getAttribute('name');
    const id   = el.getAttribute('id');
    const ph   = el.getAttribute('placeholder');
    if (name) suggestion = { attr: 'name', pattern: name };
    else if (id && !/^:|^__|-\d+-/.test(id)) suggestion = { attr: 'id', pattern: id };
    else if (ph) suggestion = { attr: 'placeholder', pattern: ph };

    if (suggestion) summary += ' + условие: ' + suggestion.attr + '~' + suggestion.pattern;
    return { targets, suggestion, summary };
  } catch (e) { return null; }
}

/* ================ Template help ================ */
function templateHelpHtml() {
  return `
    <table class="cheat-table">
      <tr><td><code>{{name.first}}</code></td><td>James</td></tr>
      <tr><td><code>{{email:gmail.com}}</code></td><td>james.smith42@gmail.com</td></tr>
      <tr><td><code>{{phone}}</code></td><td>312-456-7890</td></tr>
      <tr><td><code>{{number:1:100}}</code></td><td>42</td></tr>
      <tr><td><code>{{decimal:0:100:2}}</code></td><td>42.37</td></tr>
      <tr><td><code>{{now:yyyy-MM-dd}}</code></td><td>${fmtDate(new Date().toISOString()).slice(0,10)}</td></tr>
      <tr><td><code>{{uuid}}</code></td><td>7b3e-…</td></tr>
      <tr><td><code>{{lorem.words:5}}</code></td><td>lorem ipsum dolor…</td></tr>
      <tr><td><code>{{pick:cat|dog|fish}}</code></td><td>dog</td></tr>
      <tr><td><code>{{counter:orderId}}</code></td><td>1, 2, 3…</td></tr>
      <tr><td><code>{{seq:customerId}}</code></td><td>Szv00356B (smart)</td></tr>
      <tr><td><code>{{regex:[A-Z]{3}-\\d{4}}}</code></td><td>ABC-1234</td></tr>
    </table>
    <div class="cheat-tip">Токены комбинируются как обычный текст: <code>test_{{name.first}}_{{now:yyyyMMdd}}@ex.com</code></div>`;
}

/* ================ Regex cheatsheet ================ */
function regexCheatsheetHtml() {
  return `
    <div class="cheat-title">📖 Помощь по regex</div>
    <table class="cheat-table">
      <tr><td><code>\\d</code></td><td>одна цифра (0-9)</td></tr>
      <tr><td><code>\\d{4}</code></td><td>ровно 4 цифры</td></tr>
      <tr><td><code>\\d{2,5}</code></td><td>от 2 до 5 цифр</td></tr>
      <tr><td><code>[a-z]</code></td><td>строчная латинская буква</td></tr>
      <tr><td><code>[A-Z]{3}</code></td><td>3 заглавных буквы</td></tr>
      <tr><td><code>[a-zA-Z0-9]{8}</code></td><td>8 букв или цифр</td></tr>
      <tr><td><code>.</code></td><td>любой символ</td></tr>
      <tr><td><code>\\w</code></td><td>буква/цифра/подчёркивание</td></tr>
      <tr><td><code>\\s</code></td><td>пробел</td></tr>
      <tr><td><code>(cat|dog|fox)</code></td><td>один из вариантов</td></tr>
      <tr><td><code>[A-Z]{2}-\\d{4}</code></td><td>пример: <code>AB-1234</code></td></tr>
      <tr><td><code>\\d{3}-\\d{2}-\\d{4}</code></td><td>пример: <code>555-12-3456</code></td></tr>
    </table>
    <div class="cheat-tip">
      В матчинге атрибута сравнивает значение с паттерном (кейс-неспецифично).
      В токене <code>{{regex:...}}</code> — <b>генерирует</b> случайную строку по паттерну.
    </div>`;
}

/* ================ Token inserter ================ */
const TOKEN_MENU = [
  { group: 'Персональные данные (en)', items: [
    { token: 'name.first',       label: 'Имя (James)' },
    { token: 'name.last',        label: 'Фамилия (Smith)' },
    { token: 'name.full',        label: 'Полное имя' },
    { token: 'email',            label: 'Email' },
    { token: 'phone',            label: 'Телефон (###-###-####)' },
    { token: 'company',          label: 'Компания' },
    { token: 'city',             label: 'Город (UK)' },
    { token: 'street',           label: 'Улица + номер' },
    { token: 'address',          label: 'Полный адрес (UK)' }
  ]},
  { group: 'Числа и даты', items: [
    { token: 'number:1:100',     label: 'Целое число (1–100)' },
    { token: 'decimal:0:100:2',  label: 'Дробное число (0–100, 2 знака)' },
    { token: 'uuid',             label: 'UUID' },
    { token: 'now:yyyy-MM-dd',   label: 'Текущая дата' },
    { token: 'now:HH:mm:ss',     label: 'Текущее время' },
    { token: 'date:2020-01-01:2025-12-31:yyyy-MM-dd', label: 'Дата в диапазоне' }
  ]},
  { group: 'Текст (Lorem)', items: [
    { token: 'lorem.words:5',     label: '5 слов' },
    { token: 'lorem.sentence:8',  label: 'Предложение' },
    { token: 'lorem.paragraph:3', label: 'Абзац' }
  ]},
  { group: 'Тематические списки (en)', items: [
    { token: 'word',              label: '⭐ Случайное слово (~690: фрукты, столицы, реки, острова, животные…)' },
    { token: 'tools',             label: 'Рабочие инструменты (⚠ есть с пробелами)' }
  ]},
  { group: 'Счётчики', items: [
    { token: 'counter',            label: 'Инкремент (глобальный)' },
    { token: 'counter:orderId',    label: 'Инкремент по имени' },
    { token: 'increment:reg:1000:5', label: 'Инкремент со стартом и шагом' }
  ]},
  { group: 'Regex', items: [
    { token: 'regex:[A-Z]{3}-\\d{4}', label: 'Строка по regex' }
  ]}
];

let tokenMenuOpen = null;
function openTokenMenu(anchor, textarea) {
  if (tokenMenuOpen) { tokenMenuOpen.remove(); tokenMenuOpen = null; }
  const menu = document.createElement('div');
  menu.className = 'token-menu';
  // умные инкременторы динамически
  const groups = TOKEN_MENU.slice();
  const smart = (state.smartCounters || []).map(sc => ({ token: 'seq:' + sc.name, label: 'seq: ' + sc.name }));
  if (smart.length) groups.push({ group: 'Умные инкременторы {{seq}}', items: smart });
  const wlItems = (state.customWordLists || []).filter(wl => wl.name).map(wl => ({ token: 'list:' + wl.name, label: 'список: ' + wl.name }));
  if (wlItems.length) groups.push({ group: 'Пользовательские списки {{list}}', items: wlItems });

  menu.innerHTML = groups.map(g => `
    <div class="token-group">
      <div class="token-group-title">${escapeText(g.group)}</div>
      ${g.items.map(it => `
        <button class="token-item" data-token="${escapeAttr(it.token)}">
          <span class="token-name">{{${escapeText(it.token)}}}</span>
          <span class="token-desc">${escapeText(it.label)}</span>
        </button>`).join('')}
    </div>`).join('');
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top  = (r.bottom + window.scrollY + 4) + 'px';
  menu.style.left = (r.left + window.scrollX) + 'px';
  tokenMenuOpen = menu;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.token-item');
    if (!btn) return;
    const tok = '{{' + btn.dataset.token + '}}';
    insertAtCursor(textarea, tok);
    menu.remove(); tokenMenuOpen = null;
  });
  setTimeout(() => {
    const off = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchor) {
        menu.remove(); tokenMenuOpen = null; document.removeEventListener('click', off);
      }
    };
    document.addEventListener('click', off);
  }, 0);
}
function insertAtCursor(el, text) {
  el.focus();
  const start = el.selectionStart || 0;
  const end   = el.selectionEnd   || 0;
  const before = el.value.slice(0, start);
  const after  = el.value.slice(end);
  el.value = before + text + after;
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function pickFromActiveTab() {
  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'PROXY_TO_TAB', payload: { type: 'PICK_ELEMENT' } }, (r) => {
      if (chrome.runtime.lastError || !r) resolve({ ok: false, error: chrome.runtime.lastError?.message || 'no-tab' });
      else resolve(r);
    });
  });
  if (!res.ok) {
    toast('Не удалось связаться с активной вкладкой. Откройте нужную страницу и попробуйте снова.', 'error');
  }
  return res;
}

/* ================================================================
   ================ RULES + FOLDERS ================================
   ================================================================ */

$('addRule').addEventListener('click', () => {
  for (const r of state.rules) { if (!r.collapsed) r.collapsed = true; }
  const now = new Date().toISOString();
  const newRule = {
    id: 'r_' + uid(), folderId: null, name: 'Новое правило',
    enabled: true, collapsed: false, _isNew: true,
    targets: ['input'],
    urlConditions: [],
    template: '',
    match: { customLogic: false, conditions: [{ type: 'attribute', attr: 'name', pattern: '', regex: false, connector: 'AND' }] },
    createdAt: now, updatedAt: now,
    history: [{ at: now, author: state.authorName || '', summary: 'правило создано' }]
  };
  state.rules.unshift(newRule);
  addLog('создано', 'правило', newRule.name);
  markStructureDirty();
  console.info('[DPI/options] rule created:', newRule.id);
  save().then(() => openFolderPickerForRule(newRule));
});

$('addFolder').addEventListener('click', () => {
  const name = prompt('Название папки:', 'Новая папка');
  if (name === null) return;
  state.folders.push({ id: 'f_' + uid(), name: name.trim() || 'Новая папка', icon: '', collapsed: false });
  markStructureDirty();
  save().then(renderFolders);
});

function renderFolders() {
  const root = $('foldersRoot');
  root.innerHTML = '';
  // "Без папки" — виртуальная секция; показываем только если внутри что-то есть.
  const rulesInVirtual = state.rules.filter(r => !r.folderId);
  if (rulesInVirtual.length > 0) {
    root.appendChild(renderFolderSection(null));
  }
  for (const folder of state.folders) {
    root.appendChild(renderFolderSection(folder));
  }
  if (state.folders.length === 0 && rulesInVirtual.length === 0) {
    root.innerHTML = '<div class="empty">Правил пока нет. Нажмите «+ Правило» чтобы создать первое.</div>';
  }
}

function folderIconSmall(opt) {
  if (opt.icon) return '<img class="folder-icon-sm" src="' + escapeText(opt.icon) + '">';
  if (opt.emoji) return '<span class="folder-icon-sm-emoji">' + escapeText(opt.emoji) + '</span>';
  return '<span class="folder-icon-sm-placeholder">' + escapeText((opt.name || 'П')[0].toUpperCase()) + '</span>';
}

function renderFolderSection(folder) {
  const isVirtual = folder === null;
  const section = document.createElement('section');
  section.className = 'folder-section';
  section.dataset.folderId = isVirtual ? '' : folder.id;

  const rulesInFolder = state.rules.filter(r => (r.folderId || null) === (isVirtual ? null : folder.id));
  const isCollapsed = isVirtual ? false : !!folder.collapsed;
  const folderIcon = !isVirtual && folder.icon;
  const folderEmoji = !isVirtual && folder.emoji;
  let iconHtml;
  if (isVirtual) {
    iconHtml = '<span class="folder-icon-placeholder" data-static="1">📁</span>';
  } else if (folderIcon) {
    iconHtml = '<img class="folder-icon" src="' + escapeText(folder.icon) + '" title="Изменить иконку">';
  } else if (folderEmoji) {
    iconHtml = '<span class="folder-icon-emoji" title="Изменить иконку">' + escapeText(folder.emoji) + '</span>';
  } else {
    iconHtml = '<span class="folder-icon-placeholder" title="Добавить иконку">' + escapeText((folder.name || 'П')[0].toUpperCase()) + '</span>';
  }

  const canDelete = !isVirtual && rulesInFolder.length === 0;
  section.innerHTML = `
    <div class="folder-head">
      ${isVirtual ? '' : '<div class="folder-move-btns"><button class="icon small fMoveUp" title="Вверх">▲</button><button class="icon small fMoveDown" title="Вниз">▼</button></div>'}
      ${iconHtml}
      ${isVirtual ? '<span class="folder-name-static" title="Правила без назначенной папки">Без папки</span>' :
                    '<span class="folder-name">' + escapeText(folder.name) + '</span>'}
      <span class="folder-count" title="Правил в папке">${rulesInFolder.length} всего · ${rulesInFolder.filter(r => r.enabled !== false).length} активных</span>
      ${canDelete ? '<button class="btn-x small folder-del" title="Удалить пустую папку">×</button>' : ''}
      ${isVirtual ? '' : '<span class="folder-chevron">' + (isCollapsed ? '▾' : '▴') + '</span>'}
    </div>
    <div class="folder-body" ${isCollapsed ? 'style="display:none"' : ''}></div>
  `;

  const body = section.querySelector('.folder-body');
  const head = section.querySelector('.folder-head');
  const chevron = section.querySelector('.folder-chevron');
  if (!isVirtual) {
    head.addEventListener('click', (e) => {
      if (e.target.closest('button, .folder-icon, .folder-icon-placeholder, .folder-icon-emoji')) return;
      const opening = folder.collapsed;
      if (opening) {
        for (const f of state.folders) {
          if (f !== folder && !f.collapsed) f.collapsed = true;
        }
        $$('.folder-section').forEach(sec => {
          const fid = sec.dataset.folderId;
          if (!fid || fid === folder.id) return;
          const b = sec.querySelector('.folder-body');
          const c = sec.querySelector('.folder-chevron');
          if (b) b.style.display = 'none';
          if (c) c.textContent = '▾';
        });
      }
      folder.collapsed = !folder.collapsed;
      saveDebounced();
      body.style.display = folder.collapsed ? 'none' : '';
      if (chevron) chevron.textContent = folder.collapsed ? '▾' : '▴';
    });
  }

  if (!isVirtual) {
    const iconEl = section.querySelector('.folder-icon') || section.querySelector('.folder-icon-emoji') || section.querySelector('.folder-icon-placeholder');
    if (iconEl && !iconEl.dataset.static) iconEl.addEventListener('click', (e) => openIconMenu(e.target, folder));
    const delBtn = section.querySelector('.folder-del');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (!confirm('Удалить пустую папку «' + folder.name + '»?')) return;
        state.folders = state.folders.filter(f => f.id !== folder.id);
        markStructureDirty();
        save().then(renderFolders);
      });
    }
    section.querySelector('.fMoveUp').addEventListener('click', () => {
      const fi = state.folders.indexOf(folder);
      if (fi <= 0) return;
      state.folders.splice(fi, 1);
      state.folders.splice(fi - 1, 0, folder);
      markStructureDirty(); save().then(renderFolders);
    });
    section.querySelector('.fMoveDown').addEventListener('click', () => {
      const fi = state.folders.indexOf(folder);
      if (fi >= state.folders.length - 1) return;
      state.folders.splice(fi, 1);
      state.folders.splice(fi + 1, 0, folder);
      markStructureDirty(); save().then(renderFolders);
    });
  }

  // рендер правил
  for (const rule of rulesInFolder) {
    body.appendChild(renderRuleCard(rule));
  }
  if (!rulesInFolder.length) {
    const empty = document.createElement('div');
    empty.className = 'folder-empty';
    empty.textContent = isVirtual ? 'Пусто — правила без папки появятся здесь' : 'Папка пуста — назначьте правило через его настройки';
    body.appendChild(empty);
  }
  return section;
}

/* ---------- Rule card ---------- */
function renderRuleCard(rule) {
  return rule.collapsed ? renderRuleCollapsed(rule) : renderRuleExpanded(rule);
}

function ruleSummary(rule) {
  const parts = [];
  const tgt = (rule.targets || [])[0];
  if (tgt) parts.push('<span class="badge">' + escapeText(tgt) + '</span>');
  const conds = (rule.match && rule.match.conditions) || [];
  if (conds.length) {
    const brief = conds.slice(0, 2).map(c => {
      if (c.type === 'selector') return 'sel: <code>' + escapeText(c.value || '—') + '</code>';
      if (c.type === 'attribute') return c.attr + '~<code>' + escapeText(c.pattern || '(any)') + '</code>';
      if (c.type === 'order')    return '#' + c.index;
      return '?';
    }).join(' <span class="conn">AND</span> ');
    parts.push(brief);
  }
  if (rule.urlConditions && rule.urlConditions.length) {
    const first = rule.urlConditions[0].value || '';
    if (first) parts.push('URL: <code>' + escapeText(first) + '</code>');
  }
  return parts.join(' <span class="conn">·</span> ');
}

function ruleMatchLine(rule) {
  const conds = (rule.match && rule.match.conditions) || [];
  if (!conds.length) return '';
  const brief = conds.slice(0, 3).map(c => {
    if (c.type === 'selector') return 'sel: <code>' + escapeText(c.value || '—') + '</code>';
    if (c.type === 'attribute') return c.attr + '~<code>' + escapeText(c.pattern || '(any)') + '</code>';
    if (c.type === 'order')    return '#' + c.index;
    return '?';
  }).join(rule.match?.customLogic ? ' <span class="conn">•</span> ' : ' <span class="conn">AND</span> ');
  return brief + (conds.length > 3 ? ' <span class="extra-count">+' + (conds.length - 3) + '</span>' : '');
}

function renderRuleCollapsed(rule) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed' + (rule.enabled === false ? ' rule-disabled' : '');
  card.draggable = false;
  card.dataset.ruleId = rule.id;
  const isClick = rule.actionType === 'click';
  const previewText = isClick
    ? '→ click: ' + escapeText(rule.clickSelector || '—')
    : escapeText(safePreview(rule.template));
  const actionLabel = isClick ? 'Кликнуть (Выбрать)' : 'Заполнить поле';
  const tgt = (rule.targets || [])[0];
  const matchHtml = isClick ? '' : ruleMatchLine(rule);
  const datesParts = [];
  if (rule.createdAt) datesParts.push('создано ' + fmtDate(rule.createdAt));
  if (rule.updatedAt) datesParts.push('обновлено ' + fmtDate(rule.updatedAt));
  if (rule.modifiedBy) datesParts.push('автор: ' + escapeText(rule.modifiedBy));

  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-arrows">
        <button class="icon small rMoveUp" title="Вверх">▲</button>
        <button class="icon small rMoveDown" title="Вниз">▼</button>
      </div>
      <div class="rc-col-type">${tgt ? '<span class="badge rc-badge">' + escapeText(tgt) + '</span>' : ''}</div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">${escapeText(rule.name || '(без имени)')}${rule.enabled === false ? ' <span class="rc-off">ВЫКЛ</span>' : ''} <span class="rc-action-label">${actionLabel}</span></div>
          <div class="rule-collapsed-actions">
            <label class="rule-status-toggle" title="Вкл/Выкл"><input type="checkbox" class="rEnabled" ${rule.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${rule.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
            <button class="small rCopy" title="Копировать правило">Копия</button>
            <button class="small rEdit" title="Редактировать правило">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">${rule.urlConditions && rule.urlConditions.length ? 'URL: <code>' + escapeText(rule.urlConditions[0].value || '') + '</code>' + (rule.urlConditions.length > 1 ? ' <span class="extra-count">+' + (rule.urlConditions.length - 1) + '</span>' : '') : ''}</span>
          <span class="rc-col-match">${matchHtml || ''}</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${previewText}</span>
          <span class="rc-dates">${datesParts.join(' · ')}</span>
        </div>
      </div>
    </div>
  `;
  card.querySelector('.rEnabled').addEventListener('change', e => {
    rule.enabled = e.target.checked;
    card.classList.toggle('rule-disabled', !rule.enabled);
    card.querySelector('.toggle-label').textContent = rule.enabled ? 'ВКЛ' : 'ВЫКЛ';
    const section = card.closest('.folder-section');
    if (section) {
      const fid = section.dataset.folderId || null;
      const inFolder = state.rules.filter(r => (r.folderId || null) === fid);
      const countEl = section.querySelector('.folder-count');
      if (countEl) countEl.textContent = inFolder.length + ' всего · ' + inFolder.filter(r => r.enabled !== false).length + ' активных';
    }
    saveDebounced();
  });
  card.querySelector('.rMoveUp').addEventListener('click', () => {
    const siblings = state.rules.filter(r => (r.folderId || null) === (rule.folderId || null));
    const si = siblings.indexOf(rule);
    if (si <= 0) return;
    const gi = state.rules.indexOf(rule);
    const prevGi = state.rules.indexOf(siblings[si - 1]);
    state.rules.splice(gi, 1);
    state.rules.splice(prevGi, 0, rule);
    markStructureDirty(); save().then(renderFolders);
  });
  card.querySelector('.rMoveDown').addEventListener('click', () => {
    const siblings = state.rules.filter(r => (r.folderId || null) === (rule.folderId || null));
    const si = siblings.indexOf(rule);
    if (si >= siblings.length - 1) return;
    const gi = state.rules.indexOf(rule);
    const nextGi = state.rules.indexOf(siblings[si + 1]);
    state.rules.splice(gi, 1);
    state.rules.splice(nextGi, 0, rule);
    markStructureDirty(); save().then(renderFolders);
  });
  card.querySelector('.rEdit').addEventListener('click', () => {
    for (const r of state.rules) { if (r !== rule && !r.collapsed) r.collapsed = true; }
    rule.collapsed = false;
    save().then(renderFolders);
  });
  card.querySelector('.rCopy').addEventListener('click', () => {
    for (const r of state.rules) { if (!r.collapsed) r.collapsed = true; }
    const now = new Date().toISOString();
    const clone = deepClone(rule);
    clone.id = 'r_' + uid();
    clone.name = (rule.name || 'Правило') + ' (копия)';
    clone.collapsed = false;
    clone._isNew = true;
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.history = [{ at: now, author: state.authorName || '', summary: 'копия правила «' + (rule.name || '') + '»' }];
    const idx = state.rules.indexOf(rule);
    state.rules.splice(idx + 1, 0, clone);
    addLog('копия', 'правило', clone.name);
    markStructureDirty();
    save().then(renderFolders);
  });
  return card;
}

function safePreview(template) {
  if (!template) return '—';
  try { return window.FF.render(template, previewCtx()) || '—'; }
  catch (e) { return template; }
}

function renderRuleExpanded(rule) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  card.draggable = false;
  card.dataset.ruleId = rule.id;

  const folderOptions = ['<option value="">— Без папки —</option>']
    .concat(state.folders.map(f => `<option value="${f.id}" ${rule.folderId === f.id ? 'selected' : ''}>${escapeText(f.name)}</option>`))
    .join('');

  card.innerHTML = `
    <div class="rule-head">
      <input type="text" class="rLabel" value="${escapeAttr(rule.name || '')}" placeholder="Название правила" title="Краткое имя правила для навигации">
      <label class="rule-status-toggle shrink" title="Вкл/Выкл"><input type="checkbox" class="rEnabled" ${rule.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${rule.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
      ${rule._isNew ? '' : '<button class="small ghost rDiscard" title="Отменить изменения и свернуть">Отменить</button>'}
      ${rule._isNew ? '<button class="small rClose" title="Отменить создание правила">Закрыть</button>' : ''}
      <button class="primary small rCollapse" title="Сохранить изменения и свернуть карточку">Сохранить</button>
    </div>

    ${rule._restoredFrom ? '<div class="restore-notice">Версия восстановлена от ' + escapeText(rule._restoredFrom) + '<button class="restore-notice-close rRestoreNoticeDismiss" title="Скрыть">&times;</button></div>' : ''}

    <div class="row">
      <div class="shrink" style="flex:0 0 240px">
        <label title="Логическая группировка правил, не влияет на приоритет">Папка</label>
        <select class="rFolder" title="Переместить правило в другую папку">${folderOptions}</select>
      </div>
      <div class="grow" style="text-align:right">
        <label style="text-align:right">Даты</label>
        <div class="dates-strip" style="text-align:right">создано <b>${fmtDate(rule.createdAt)}</b> · обновлено <b>${fmtDate(rule.updatedAt)}</b></div>
      </div>
    </div>

    <!-- === 0. ОСНОВНЫЕ УСЛОВИЯ === -->
    <div class="section-block section-collapsible">
      <div class="section-collapse-header rSectionToggle">
        <span class="section-collapse-arrow">▸</span>
        <label>Основные условия</label>
      </div>
      <div class="section-collapse-summary rSectionSummary"></div>
      <div class="section-collapse-body rSectionBody">
        <label>Действие</label>
        <p class="hint" style="margin:0 0 6px">Задержка полезна для чекбоксов на React/Vue-формах, которые сбрасываются при заполнении соседних полей.</p>
        <div class="action-row-split">
          <div class="action-half">
            <label class="inline-lbl"><input type="radio" name="actionType_${rule.id}" class="rActionType" value="fill" ${(rule.actionType || 'fill') === 'fill' ? 'checked' : ''}> Заполнить значение</label>
            <label class="inline-lbl"><input type="radio" name="actionType_${rule.id}" class="rActionType" value="click" ${rule.actionType === 'click' ? 'checked' : ''}> Кликнуть</label>
          </div>
          <div class="action-half">
            <span class="action-delay-inline">
              Задержка <span class="badge">ОПЦИОНАЛЬНО</span>
              <input type="number" class="rFillDelay" min="0" max="10000" step="100" value="${rule.fillDelay || 0}" style="width:80px;margin-left:4px">
              <span style="color:var(--text-subtle);font-size:12px">мс</span>
            </span>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">

        <div class="row" style="align-items:baseline">
          <label style="margin:0" class="shrink" title="Где применяется правило. Пусто = на всех страницах.">URL страницы <span class="badge">ОПЦИОНАЛЬНО</span></label>
          <span></span>
          <button class="small addUrlCond shrink" type="button" title="Добавить URL-условие">+ URL-условие</button>
        </div>
        <p class="hint" style="margin:2px 0 6px">Если не задано — правило работает на всех страницах. Поддерживается wildcard <code>*</code>.</p>
        <div class="urlCondList"></div>

        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">

        <div class="row" style="align-items:baseline">
          <label style="margin:0" class="shrink" title="Какие типы HTML-элементов будут заполняться">Тип поля</label>
          <span></span>
          <button class="small ghost shrink rDetectType" type="button" title="Вставить HTML целевого поля — определим тип автоматически">Определить по HTML</button>
        </div>
        <div class="row rTargetsRow">
          ${[
            { v: 'input', tip: 'Текстовые поля: text, email, password, number, tel, url, search и другие <input> без специального типа' },
            { v: 'textarea', tip: 'Многострочные текстовые поля <textarea>' },
            { v: 'select', tip: 'Выпадающие списки <select>. Шаблон ищет <option> по value или тексту' },
            { v: 'checkbox', tip: 'Чекбоксы <input type="checkbox">. Шаблон true/false — отметить или снять' },
            { v: 'radio', tip: 'Радио-кнопки <input type="radio">. Шаблон true/false — выбрать или сбросить' }
          ].map(t => `
            <label class="shrink inline-lbl" title="${escapeAttr(t.tip)}"><input type="radio" name="target_${rule.id}" class="rTarget" value="${t.v}" ${(rule.targets||[])[0]===t.v?'checked':''}> ${t.v}</label>
          `).join('')}
        </div>
        <div class="detect-html-box" style="display:none;margin-top:8px">
          <label>Вставьте outerHTML целевого элемента</label>
          <textarea class="rDetectHtml" rows="3" placeholder='<input type="email" name="userEmail">'></textarea>
          <div class="row" style="margin-top:6px">
            <button class="small rDetectRun shrink primary" type="button">Определить</button>
            <button class="small rDetectCancel shrink ghost" type="button">Отмена</button>
            <span></span>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">

        <div class="row" style="align-items:baseline">
          <label style="margin:0" class="shrink" title="Как отличить нужное поле среди других на странице">Условия матчинга полей</label>
          <label class="shrink inline-lbl" title="По умолчанию все условия соединяются AND. Включи для смешанной AND/OR-логики.">
            <input type="checkbox" class="rCustomLogic" ${rule.match?.customLogic ? 'checked' : ''}>
            Смешанная AND/OR-логика
          </label>
          <span></span>
          <button class="small addCond shrink" type="button" title="Добавить условие">+ условие</button>
        </div>
        <p class="hint" style="margin:2px 0 6px">Правило сработает на поле, если все условия (или комбинация AND/OR) выполнены.</p>
        <div class="condList"></div>
      </div>
    </div>

    <!-- === CLICK-РЕЖИМ === -->
    <div class="rClickSection" ${rule.actionType === 'click' ? '' : 'style="display:none"'}>
      <div class="section-block">
        <label>CSS-селектор элемента для клика</label>
        <div class="row">
          <input type="text" class="rClickSelector grow" value="${escapeAttr(rule.clickSelector || '')}" placeholder='[data-value="MD"], .dropdown-item:nth-child(3)'>
          <button class="small rClickPick shrink">выбрать</button>
        </div>
        <p class="hint" style="margin:6px 0">Элемент будет найден через <code>document.querySelector</code>. Подходит для кастомных дропдаунов, кнопок, дивов с data-атрибутами.</p>

        <label style="margin-top:10px">Проверка состояния (для чекбоксов)</label>
        <select class="rClickGuard">
          <option value="none" ${(rule.clickGuard || 'none') === 'none' ? 'selected' : ''}>Без проверки — кликнуть всегда</option>
          <option value="on" ${rule.clickGuard === 'on' ? 'selected' : ''}>Только если сейчас OFF → включить</option>
          <option value="off" ${rule.clickGuard === 'off' ? 'selected' : ''}>Только если сейчас ON → выключить</option>
        </select>
        <p class="hint">Определяет состояние по <code>checked</code>, <code>aria-checked</code>, <code>data-state</code> или классу <code>.checked</code> / <code>.active</code>.</p>
      </div>
      <div class="section-block">
        <details ${rule.clickTriggerSelector ? 'open' : ''}>
          <summary style="cursor:pointer;color:var(--text-subtle);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0">
            Триггер перед кликом ${rule.clickTriggerSelector ? '• задан' : '(опционально)'}
          </summary>
          <p class="hint" style="margin:8px 0 6px">Если целевой элемент появляется только после клика по кнопке (раскрытие дропдауна) — задайте селектор кнопки-триггера.</p>
          <div class="row">
            <input type="text" class="rClickTrigger grow" value="${escapeAttr(rule.clickTriggerSelector || '')}" placeholder="#select2-country_id-container">
            <button class="small rClickTrigPick shrink">выбрать</button>
          </div>
          <label style="margin-top:8px">Задержка после клика по триггеру (мс)</label>
          <input type="number" class="rClickTrigWait" min="0" max="5000" step="50" value="${rule.clickTriggerWait || 500}" style="max-width:140px">
        </details>
      </div>
    </div>

    <!-- === FILL-РЕЖИМ === -->
    <div class="rFillSection" ${rule.actionType === 'click' ? 'style="display:none"' : ''}>
    <div class="section-block rTemplateBlock">
      <div class="rTemplateFull">
        <div class="row" style="align-items:baseline;margin:0 0 6px">
          <label style="margin:0" class="shrink" title="Что будет вставлено в поле. Токены {{...}} — динамические.">Шаблон значения</label>
          <span></span>
          <button class="small ghost shrink rInsertToken" type="button" title="Открыть список токенов для вставки">+ Токен</button>
        </div>
        <textarea class="rTemplate" placeholder="Например: Иван {{name.last}} — токены не обязательны" title="Обычный текст с вставками {{token}}. Можно писать чисто литеральное значение.">${escapeText(rule.template || '')}</textarea>
        <div class="rFieldHint hint" style="margin:6px 0;display:none"></div>
        <div class="preview" title="Пример сгенерированного значения">—</div>
        <div class="row" style="margin-top:6px">
          <button class="small rTest shrink" type="button" title="Пересчитать пример значения">🔄 Тест</button>
          <span></span>
        </div>
        <details class="template-help">
          <summary style="cursor:pointer;user-select:none">Справка и быстрая вставка токенов</summary>
          <div class="help-content token-grid"></div>
        </details>
      </div>
      <div class="rTemplateToggle" style="display:none">
        <label style="margin:0">Состояние</label>
        <div class="row" style="align-items:center;gap:6px;margin-top:6px">
          <label class="inline-lbl shrink"><input type="radio" name="toggleVal_${rule.id}" class="rToggleVal" value="true" ${['true','1','yes','on','checked'].includes((rule.template||'').toLowerCase().trim()) ? 'checked' : ''}> Включить</label>
          <label class="inline-lbl shrink"><input type="radio" name="toggleVal_${rule.id}" class="rToggleVal" value="false" ${!['true','1','yes','on','checked'].includes((rule.template||'').toLowerCase().trim()) ? 'checked' : ''}> Выключить</label>
        </div>
      </div>
    </div>

    </div>

    <details class="history-box">
      <summary>История изменений (${(rule.history || []).length})</summary>
      <div class="history-list"></div>
    </details>

    <div class="rule-footer-actions">
      <button class="small danger rDelete" title="Удалить правило">Удалить правило</button>
    </div>
  `;
  // helpers для инкрементального рендера — без пересборки всего дерева
  const rerenderConditions = () => {
    const box = card.querySelector('.condList');
    box.innerHTML = '';
    (rule.match.conditions || []).forEach((cond, ci) => box.appendChild(renderCondRow(rule, cond, ci)));
    updateSectionSummary();
  };
  const rerenderUrlConditions = () => {
    const box = card.querySelector('.urlCondList');
    box.innerHTML = '';
    (rule.urlConditions || []).forEach((cond, ci) => box.appendChild(renderUrlCondRow(rule, cond, ci)));
    updateSectionSummary();
  };
  card._rerenderConditions = rerenderConditions;
  card._rerenderUrlConditions = rerenderUrlConditions;
  card._updateSectionSummary = () => { if (typeof updateSectionSummary === 'function') updateSectionSummary(); };

  // Preview
  updatePreview(card, rule.template);

  // Populate inline token grid (two-column clickable list)
  const tokenGrid = card.querySelector('.token-grid');
  const allGroups = TOKEN_MENU.slice();
  const smartItems = (state.smartCounters || []).map(sc => ({ token: 'seq:' + sc.name, label: 'seq: ' + sc.name }));
  if (smartItems.length) allGroups.push({ group: 'Умные инкременторы', items: smartItems });
  const wlItems = (state.customWordLists || []).filter(wl => wl.name).map(wl => ({ token: 'list:' + wl.name, label: wl.name }));
  if (wlItems.length) allGroups.push({ group: 'Пользовательские списки', items: wlItems });
  tokenGrid.innerHTML = allGroups.map(g => `
    <div class="tg-group">
      <div class="tg-title">${escapeText(g.group)}</div>
      <div class="tg-items">${g.items.map(it => `<button type="button" class="tg-item" data-token="${escapeAttr(it.token)}" title="${escapeAttr(it.label)}"><code>{{${escapeText(it.token)}}}</code><span>${escapeText(it.label)}</span></button>`).join('')}</div>
    </div>`).join('');

  // Handlers
  const templateEl = card.querySelector('.rTemplate');
  const helpDetails = card.querySelector('.template-help');

  tokenGrid.addEventListener('click', e => {
    const btn = e.target.closest('.tg-item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const tok = '{{' + btn.dataset.token + '}}';
    insertAtCursor(templateEl, tok);
    rule.template = templateEl.value;
    updatePreview(card, rule.template);
    touchRule(rule); saveDebounced();
  });
  // Action type toggle (radio buttons)
  card.querySelectorAll('.rActionType').forEach(radio => {
    radio.addEventListener('change', e => {
      rule.actionType = e.target.value;
      const isClick = rule.actionType === 'click';
      card.querySelector('.rClickSection').style.display = isClick ? '' : 'none';
      card.querySelector('.rFillSection').style.display = isClick ? 'none' : '';
      updateSectionSummary(); touchRule(rule); saveDebounced();
    });
  });

  card.querySelector('.rFillDelay').addEventListener('input', e => { rule.fillDelay = parseInt(e.target.value, 10) || 0; updateSectionSummary(); touchRule(rule); saveDebounced(); });

  function buildSectionSummaryHtml() {
    const parts = [];
    parts.push('<span class="badge">' + ((rule.actionType || 'fill') === 'click' ? 'Кликнуть' : 'Заполнить значение') + '</span>');
    if (rule.fillDelay) parts.push('<span class="summary-item">' + escapeText(rule.fillDelay + ' мс') + '</span>');
    const tgt = (rule.targets || [])[0];
    if (tgt) parts.push('<span class="badge">' + escapeText(tgt) + '</span>');
    const urls = (rule.urlConditions || []).filter(c => c.value);
    if (urls.length) {
      let s = '<span class="summary-item">URL: <code>' + escapeText(urls[0].value) + '</code>';
      if (urls.length > 1) s += ' <span class="extra-count">+' + (urls.length - 1) + '</span>';
      parts.push(s + '</span>');
    }
    const conds = (rule.match?.conditions || []);
    if (conds.length) {
      const brief = conds.slice(0, 2).map(c => {
        if (c.type === 'selector') return 'sel: <code>' + escapeText(c.value || '—') + '</code>';
        if (c.type === 'attribute') return escapeText(c.attr) + '~<code>' + escapeText(c.pattern || '(any)') + '</code>';
        if (c.type === 'order') return '#' + c.index;
        return '?';
      }).join(' <span class="conn">AND</span> ');
      parts.push('<span class="summary-item">' + brief + (conds.length > 2 ? ' <span class="extra-count">+' + (conds.length - 2) + '</span>' : '') + '</span>');
    }
    return parts.join('<span class="conn">·</span>');
  }
  const sectionBlock = card.querySelector('.section-collapsible');
  const sectionSummary = card.querySelector('.rSectionSummary');
  const sectionBody = card.querySelector('.rSectionBody');
  const sectionArrow = card.querySelector('.section-collapse-arrow');
  function updateSectionSummary() { sectionSummary.innerHTML = buildSectionSummaryHtml(); }
  updateSectionSummary();
  function toggleSection() {
    const collapsed = sectionBlock.classList.toggle('collapsed');
    sectionArrow.textContent = collapsed ? '▸' : '▾';
    sectionBody.style.display = collapsed ? 'none' : '';
    if (collapsed) updateSectionSummary();
  }
  card.querySelector('.rSectionToggle').addEventListener('click', e => {
    if (e.target.closest('input, button, select')) return;
    toggleSection();
  });
  sectionSummary.addEventListener('click', toggleSection);
  sectionArrow.textContent = '▾';

  // Click-mode handlers
  card.querySelector('.rClickSelector').addEventListener('input', e => { rule.clickSelector = e.target.value; touchRule(rule); saveDebounced(); });
  card.querySelector('.rClickGuard').addEventListener('change', e => { rule.clickGuard = e.target.value; touchRule(rule); saveDebounced(); });
  card.querySelector('.rClickPick').addEventListener('click', async () => {
    const res = await pickFromActiveTab();
    if (res && res.ok) { rule.clickSelector = res.selector; card.querySelector('.rClickSelector').value = res.selector; touchRule(rule); saveDebounced(); }
  });
  card.querySelector('.rClickTrigger').addEventListener('input', e => { rule.clickTriggerSelector = e.target.value; touchRule(rule); saveDebounced(); });
  card.querySelector('.rClickTrigWait').addEventListener('input', e => { rule.clickTriggerWait = parseInt(e.target.value, 10) || 0; touchRule(rule); saveDebounced(); });
  card.querySelector('.rClickTrigPick').addEventListener('click', async () => {
    const res = await pickFromActiveTab();
    if (res && res.ok) { rule.clickTriggerSelector = res.selector; card.querySelector('.rClickTrigger').value = res.selector; touchRule(rule); saveDebounced(); }
  });

  card.querySelector('.rLabel').addEventListener('input', e => { rule.name = e.target.value; touchRule(rule); saveDebounced(); });
  card.querySelector('.rEnabled').addEventListener('change', e => {
    rule.enabled = e.target.checked; touchRule(rule);
    card.querySelector('.toggle-label').textContent = rule.enabled ? 'ВКЛ' : 'ВЫКЛ';
    const section = card.closest('.folder-section');
    if (section) {
      const fid = section.dataset.folderId || null;
      const inFolder = state.rules.filter(r => (r.folderId || null) === fid);
      const countEl = section.querySelector('.folder-count');
      if (countEl) countEl.textContent = inFolder.length + ' всего · ' + inFolder.filter(r => r.enabled !== false).length + ' активных';
    }
    saveDebounced();
  });
  templateEl.addEventListener('input', e => { rule.template = e.target.value; updatePreview(card, rule.template); touchRule(rule); saveDebounced(); });
  card.querySelector('.rTest').addEventListener('click', () => updatePreview(card, rule.template));
  card.querySelector('.rInsertToken').addEventListener('click', (e) => openTokenMenu(e.currentTarget, templateEl));
  card.querySelector('.rFolder').addEventListener('change', e => { rule.folderId = e.target.value || null; markStructureDirty(); save().then(renderFolders); });
  function isToggleOnly() {
    const t = rule.targets || [];
    return t.length > 0 && t.every(x => x === 'checkbox' || x === 'radio');
  }
  function updateFieldHint() {
    const hintEl = card.querySelector('.rFieldHint');
    const t = rule.targets || [];
    const hints = [];
    if (t.includes('select'))
      hints.push('Для &lt;select&gt;: шаблон должен давать value или видимый текст нужного option (регистр не важен). Если совпадений нет — будет выбран случайный вариант.');
    hintEl.innerHTML = hints.join('<br>');
    hintEl.style.display = hints.length ? '' : 'none';

    const noTargets = t.length === 0;
    const toggle = isToggleOnly();
    card.querySelector('.rTemplateBlock').style.display = noTargets ? 'none' : '';
    card.querySelector('.rTemplateFull').style.display = toggle || noTargets ? 'none' : '';
    card.querySelector('.rTemplateToggle').style.display = toggle && !noTargets ? '' : 'none';
  }
  updateFieldHint();
  card.querySelectorAll('.rToggleVal').forEach(radio => {
    radio.addEventListener('change', e => {
      rule.template = e.target.value;
      templateEl.value = rule.template;
      updatePreview(card, rule.template);
      touchRule(rule); saveDebounced();
    });
  });
  let _savedTemplate = null;
  card.querySelectorAll('.rTarget').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = card.querySelector('.rTarget:checked');
      rule.targets = checked ? [checked.value] : [];
      updateFieldHint();
      updateSectionSummary();
      if (isToggleOnly()) {
        if (!['true','false'].includes(rule.template)) {
          _savedTemplate = rule.template;
          rule.template = 'true';
          templateEl.value = 'true';
          card.querySelector('.rToggleVal[value="true"]').checked = true;
          updatePreview(card, rule.template);
        }
      } else if (_savedTemplate !== null) {
        rule.template = _savedTemplate;
        templateEl.value = _savedTemplate;
        _savedTemplate = null;
        updatePreview(card, rule.template);
      }
      touchRule(rule); saveDebounced();
    });
  });
  card.querySelector('.rCustomLogic').addEventListener('change', e => {
    rule.match.customLogic = e.target.checked;
    touchRule(rule);
    saveDebounced();
    rerenderConditions(); // только пересобираем список условий, чтобы показать/скрыть connectors
  });
  card.querySelector('.addCond').addEventListener('click', () => {
    rule.match.conditions.push({ type: 'attribute', attr: 'name', pattern: '', regex: false, connector: 'AND' });
    touchRule(rule);
    saveDebounced();
    rerenderConditions();
  });
  card.querySelector('.addUrlCond').addEventListener('click', () => {
    rule.urlConditions = rule.urlConditions || [];
    rule.urlConditions.push({ value: '', connector: 'AND' });
    touchRule(rule);
    saveDebounced();
    rerenderUrlConditions();
  });
  if (!rule._isNew && !rule._snapshot) {
    rule._snapshot = deepClone(rule);
  }
  card.querySelector('.rCollapse').addEventListener('click', () => {
    saveHistoryEntry(rule);
    addLog(rule._isNew ? 'создано' : 'изменено', 'правило', rule.name);
    autoSnapshot('правило: ' + (rule.name || rule.id));
    if (state.authorName) {
      if (!rule.createdBy) rule.createdBy = state.authorName;
      rule.modifiedBy = state.authorName;
    }
    delete rule._isNew;
    delete rule._snapshot;
    delete rule._restoredFrom;
    rule.collapsed = true;
    save().then(renderFolders);
  });
  if (!rule._isNew) {
    card.querySelector('.rDiscard').addEventListener('click', () => {
      const snap = rule._snapshot;
      if (snap) { Object.assign(rule, snap); delete rule._snapshot; }
      rule.collapsed = true;
      save().then(renderFolders);
    });
  }
  if (rule._isNew) {
    card.querySelector('.rClose').addEventListener('click', () => {
      state.rules = state.rules.filter(r => r.id !== rule.id);
      markStructureDirty();
      save().then(renderFolders);
    });
  }

  const dismissBtn = card.querySelector('.rRestoreNoticeDismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      delete rule._restoredFrom;
      dismissBtn.closest('.restore-notice').remove();
    });
  }

  card.querySelector('.rDelete').addEventListener('click', () => {
    const word = prompt('Для удаления правила «' + (rule.name || 'без имени') + '» введите слово "удалить":');
    if (word == null) return;
    if (word.trim().toLowerCase() !== 'удалить') { toast('Неверное слово — удаление отменено', 'error'); return; }
    addLog('удалено', 'правило', rule.name);
    state.rules = state.rules.filter(r => r.id !== rule.id);
    markStructureDirty();
    save().then(() => { renderFolders(); toast('Правило удалено', 'ok'); });
  });

  // Smart type detection
  const detectBox = card.querySelector('.detect-html-box');
  card.querySelector('.rDetectType').addEventListener('click', () => {
    detectBox.style.display = detectBox.style.display === 'none' ? 'block' : 'none';
  });
  card.querySelector('.rDetectCancel').addEventListener('click', () => {
    detectBox.style.display = 'none';
    card.querySelector('.rDetectHtml').value = '';
  });
  card.querySelector('.rDetectRun').addEventListener('click', () => {
    const html = card.querySelector('.rDetectHtml').value.trim();
    if (!html) { toast('Вставьте HTML', 'error'); return; }
    const detected = detectFieldTargets(html);
    if (!detected) { toast('Не удалось определить элемент', 'error'); return; }
    rule.targets = detected.targets.slice(0, 1);
    card.querySelectorAll('.rTarget').forEach(cb => { cb.checked = rule.targets.includes(cb.value); });
    // Автопредложение первого условия (name > id > placeholder)
    if (detected.suggestion) {
      const found = rule.match.conditions.find(c =>
        c.type === 'attribute' && c.attr === detected.suggestion.attr && c.pattern === detected.suggestion.pattern);
      if (!found) {
        rule.match.conditions.push({
          type: 'attribute', attr: detected.suggestion.attr, pattern: detected.suggestion.pattern,
          regex: false, connector: 'AND'
        });
      }
    }
    touchRule(rule);
    save().then(() => { renderFolders(); toast('Обнаружено: ' + detected.summary, 'ok'); });
  });

  // URL conditions render
  const urlCondList = card.querySelector('.urlCondList');
  (rule.urlConditions || []).forEach((cond, ci) => urlCondList.appendChild(renderUrlCondRow(rule, cond, ci)));

  // conditions
  const condList = card.querySelector('.condList');
  (rule.match.conditions || []).forEach((cond, ci) => condList.appendChild(renderCondRow(rule, cond, ci)));

  // history list
  const histBox = card.querySelector('.history-list');
  if (histBox) {
    (rule.history || []).forEach((h, i) => {
      const row = document.createElement('div');
      row.className = 'history-row';
      let diffHtml = '';
      if (h.changes && h.changes.length) {
        diffHtml = h.changes.map(c =>
          '<div class="history-field">' +
            '<span class="history-field-name">' + escapeText(c.field) + '</span>' +
            '<span class="history-was">было: ' + escapeText(c.was) + '</span>' +
            '<span class="history-now">стало: ' + escapeText(c.now) + '</span>' +
          '</div>'
        ).join('');
      } else if (h.summary) {
        diffHtml = '<div class="history-field"><span class="history-now">' + escapeText(h.summary) + '</span></div>';
      }
      row.innerHTML = `
        <div class="history-head">
          <span class="history-when mono">${fmtDate(h.at)}${h.author ? ' · ' + escapeText(h.author) : ''}</span>
          <button class="small history-restore">↺ Восстановить</button>
        </div>
        <div class="history-changes">${diffHtml}</div>
      `;
      row.querySelector('.history-restore').addEventListener('click', () => {
        if (!confirm('Восстановить состояние правила от ' + fmtDate(h.at) + '?')) return;
        try {
          if (!h.snapshot || typeof h.snapshot !== 'object') {
            toast('У этой версии нет сохранённого снимка — восстановление невозможно', 'error');
            return;
          }
          const restored = deepClone(h.snapshot);
          saveHistoryEntry(rule, 'откат к версии ' + fmtDate(h.at));
          rule.name = restored.name != null ? restored.name : rule.name;
          rule.enabled = restored.enabled != null ? restored.enabled : rule.enabled;
          rule.targets = Array.isArray(restored.targets) ? restored.targets : rule.targets;
          rule.urlConditions = Array.isArray(restored.urlConditions) ? restored.urlConditions : rule.urlConditions;
          rule.template = restored.template != null ? restored.template : rule.template;
          rule.actionType = restored.actionType || rule.actionType;
          rule.fillDelay = restored.fillDelay != null ? restored.fillDelay : rule.fillDelay;
          rule.clickSelector = restored.clickSelector != null ? restored.clickSelector : rule.clickSelector;
          rule.match = restored.match || rule.match;
          rule.folderId = restored.folderId !== undefined ? restored.folderId : rule.folderId;
          rule.collapsed = false;
          rule._restoredFrom = fmtDate(h.at);
          delete rule._snapshot;
          rule.updatedAt = new Date().toISOString();
          save().then(() => {
            renderFolders();
            toast('Правило восстановлено до версии от ' + fmtDate(h.at), 'ok');
          });
        } catch (e) {
          console.error('[DPI] restore error:', e);
          toast('Ошибка при восстановлении: ' + e.message, 'error');
        }
      });
      histBox.appendChild(row);
    });
  }

  return card;
}

function touchRule(rule) {
  rule.updatedAt = new Date().toISOString();
}

function makeSnap(src) {
  return {
    name: src.name,
    enabled: src.enabled,
    targets: (src.targets || []).slice(),
    urlConditions: deepClone(src.urlConditions || []),
    template: src.template,
    actionType: src.actionType || 'fill',
    fillDelay: src.fillDelay || 0,
    clickSelector: src.clickSelector || '',
    match: deepClone(src.match),
    folderId: src.folderId
  };
}

function saveHistoryEntry(rule, forcedSummary) {
  const author = state.authorName || '';
  if (forcedSummary) {
    rule.history = rule.history || [];
    rule.history.unshift({ at: new Date().toISOString(), author, summary: forcedSummary, snapshot: makeSnap(rule) });
  } else {
    const ch = diffChanges(rule._snapshot, rule);
    if (!ch) return;
    rule.history = rule.history || [];
    rule.history.unshift({ at: new Date().toISOString(), author, changes: ch, snapshot: makeSnap(rule._snapshot) });
  }
  if (rule.history.length > HISTORY_LIMIT) rule.history.length = HISTORY_LIMIT;
}

function fmtUrlConds(arr) {
  return (arr || []).map(c => c.value || '').filter(Boolean).join(', ') || '—';
}
function fmtMatch(m) {
  return (m?.conditions || []).map(c => {
    if (c.type === 'selector') return 'sel: ' + (c.value || '');
    if (c.type === 'attribute') return c.attr + '~' + (c.pattern || '');
    if (c.type === 'order') return '#' + c.index;
    return '?';
  }).join('; ') || '—';
}
function truncVal(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

function diffChanges(prev, cur) {
  if (!prev) return null;
  const ch = [];
  if (prev.name !== cur.name)
    ch.push({ field: 'название', was: prev.name, now: cur.name });
  if (prev.enabled !== cur.enabled)
    ch.push({ field: 'статус', was: prev.enabled ? 'вкл' : 'выкл', now: cur.enabled ? 'вкл' : 'выкл' });
  if (prev.template !== cur.template)
    ch.push({ field: 'шаблон', was: truncVal(prev.template || '', 40), now: truncVal(cur.template || '', 40) });
  if ((prev.actionType || 'fill') !== (cur.actionType || 'fill'))
    ch.push({ field: 'действие', was: prev.actionType || 'fill', now: cur.actionType || 'fill' });
  if ((prev.fillDelay || 0) !== (cur.fillDelay || 0))
    ch.push({ field: 'задержка', was: (prev.fillDelay || 0) + ' мс', now: (cur.fillDelay || 0) + ' мс' });
  if (JSON.stringify(prev.targets || []) !== JSON.stringify(cur.targets || []))
    ch.push({ field: 'типы полей', was: (prev.targets || []).join(', ') || '—', now: (cur.targets || []).join(', ') || '—' });
  if (JSON.stringify(prev.urlConditions || []) !== JSON.stringify(cur.urlConditions || []))
    ch.push({ field: 'URL', was: fmtUrlConds(prev.urlConditions), now: fmtUrlConds(cur.urlConditions) });
  if (JSON.stringify(prev.match) !== JSON.stringify(cur.match))
    ch.push({ field: 'матчинг', was: fmtMatch(prev.match), now: fmtMatch(cur.match) });
  if (prev.folderId !== cur.folderId) {
    const pf = state.folders.find(f => f.id === prev.folderId);
    const cf = state.folders.find(f => f.id === cur.folderId);
    ch.push({ field: 'папка', was: pf ? pf.name : 'без папки', now: cf ? cf.name : 'без папки' });
  }
  if ((prev.clickSelector || '') !== (cur.clickSelector || ''))
    ch.push({ field: 'click-селектор', was: prev.clickSelector || '—', now: cur.clickSelector || '—' });
  return ch.length ? ch : null;
}

/* ---------- Condition row ---------- */
function renderCondRow(rule, cond, ci) {
  const row = document.createElement('div');
  row.className = 'cond-row';
  const showConnector = rule.match.customLogic && ci > 0;

  const typeTips = {
    selector: 'CSS-селектор элемента. Кнопка «выбрать» позволяет кликнуть по полю на странице и получить селектор автоматически.',
    attribute: 'Сравнение HTML-атрибута (id, name, placeholder, type, class, data-* и др.) с паттерном. Поддерживается regex.',
    order: 'Порядковый номер подходящего поля на странице (1 = первое). Полезно когда у полей нет уникальных атрибутов.'
  };
  const typeOpt = (v, l) => `<option value="${v}" title="${escapeAttr(typeTips[v])}" ${cond.type===v?'selected':''}>${l}</option>`;
  const attrOpt = (v) => `<option value="${v}" ${cond.attr===v?'selected':''}>${v}</option>`;
  const connOpt = (v) => `<option value="${v}" ${(cond.connector||'AND')===v?'selected':''}>${v}</option>`;

  row.innerHTML = `
    ${showConnector ? `
      <div class="cond-connector">
        <select class="cConnector">${['AND','OR'].map(connOpt).join('')}</select>
      </div>` : ''}
    <div class="row" style="margin:0">
      <select class="cType shrink" style="flex:0 0 150px" title="${escapeAttr(typeTips[cond.type] || '')}">
        ${typeOpt('selector','Селектор')}
        ${typeOpt('attribute','Атрибут')}
        ${typeOpt('order','Порядковый №')}
      </select>
      <div class="body grow"></div>
      <button class="btn-x small delCond" title="Удалить условие">×</button>
    </div>
  `;
  const body = row.querySelector('.body');
  function renderBody() {
    if (cond.type === 'selector') {
      body.innerHTML = `
        <div class="row" style="margin:0">
          <input type="text" class="cSelector grow" value="${escapeAttr(cond.value || '')}" placeholder="#email, .form input[name=login]">
          <button class="small pickBtn shrink">выбрать</button>
        </div>`;
      body.querySelector('.cSelector').addEventListener('input', e => { cond.value = e.target.value; touchRule(rule); saveDebounced(); });
      body.querySelector('.pickBtn').addEventListener('click', async () => {
        const res = await pickFromActiveTab();
        if (res && res.ok) { cond.value = res.selector; body.querySelector('.cSelector').value = res.selector; touchRule(rule); saveDebounced(); }
      });
    } else if (cond.type === 'attribute') {
      const attrHint = attrPlaceholder(cond.attr || 'name');
      body.innerHTML = `
        <div class="row" style="margin:0">
          <input list="dlAttrs" type="text" class="cAttr shrink" style="flex:0 0 160px" value="${escapeAttr(cond.attr || 'name')}" placeholder="имя атрибута" title="HTML-атрибут, значение которого сравнивается с паттерном ниже">
          <input type="text" class="cPattern grow" value="${escapeAttr(cond.pattern || '')}" placeholder="${escapeAttr(attrHint)}" title="Паттерн для сравнения. Пусто = атрибут должен существовать. С флагом regex — трактуется как регулярное выражение.">
          <label class="shrink inline-lbl" title="Трактовать паттерн как регулярное выражение (напр. ^email.*)"><input type="checkbox" class="cRegex" ${cond.regex?'checked':''}> regex</label>
        </div>
        <div class="regex-help" style="${cond.regex ? '' : 'display:none'}">
          ${regexCheatsheetHtml()}
        </div>`;
      const patternInput = body.querySelector('.cPattern');
      const attrInput = body.querySelector('.cAttr');
      attrInput.addEventListener('focus', () => {
        attrInput.dataset.prev = attrInput.value;
        attrInput.value = '';
      });
      attrInput.addEventListener('blur', () => {
        if (!attrInput.value && attrInput.dataset.prev) attrInput.value = attrInput.dataset.prev;
        delete attrInput.dataset.prev;
      });
      attrInput.addEventListener('input', e => {
        delete attrInput.dataset.prev;
        cond.attr = e.target.value;
        patternInput.placeholder = attrPlaceholder(cond.attr);
        touchRule(rule); saveDebounced();
      });
      patternInput.addEventListener('input', e => { cond.pattern = e.target.value; touchRule(rule); saveDebounced(); });
      body.querySelector('.cRegex').addEventListener('change', e => {
        cond.regex = e.target.checked; touchRule(rule); saveDebounced();
        body.querySelector('.regex-help').style.display = cond.regex ? '' : 'none';
      });
    } else if (cond.type === 'order') {
      body.innerHTML = `
        <div class="row" style="margin:0">
          <input type="number" min="1" class="cIndex" value="${escapeAttr(cond.index || 1)}" style="flex:0 0 120px">
          <span class="grow" style="color:var(--text-subtle);font-size:12px">n-ное поле в форме</span>
        </div>`;
      body.querySelector('.cIndex').addEventListener('input', e => { cond.index = parseInt(e.target.value, 10) || 1; touchRule(rule); saveDebounced(); });
    }
  }
  renderBody();
  row.querySelector('.cType').addEventListener('change', e => {
    cond.type = e.target.value;
    if (cond.type === 'attribute' && !cond.attr) cond.attr = 'name';
    if (cond.type === 'order' && !cond.index) cond.index = 1;
    e.target.title = typeTips[cond.type] || '';
    touchRule(rule);
    saveDebounced();
    renderBody();
  });
  row.querySelector('.delCond').addEventListener('click', () => {
    rule.match.conditions = rule.match.conditions.filter((_, i) => i !== ci);
    touchRule(rule);
    saveDebounced();
    const card = row.closest('.rule-card');
    if (card && card._rerenderConditions) card._rerenderConditions();
  });
  if (showConnector) {
    row.querySelector('.cConnector').addEventListener('change', e => {
      cond.connector = e.target.value; touchRule(rule); saveDebounced();
    });
  }
  return row;
}

/* ---------- Folder picker on rule create ---------- */
function openFolderPickerForRule(rule) {
  const modal = $('folderPickerModal');
  const list = $('fpFolders');
  list.innerHTML = '';
  const options = [{ id: '', name: '— Без папки —', icon: '' }].concat(state.folders);
  options.forEach((opt, i) => {
    const row = document.createElement('label');
    row.className = 'fp-row';
    const iconPart = folderIconSmall(opt);
    row.innerHTML = `
      <input type="radio" name="fpChoice" value="${opt.id}" ${i === 0 ? 'checked' : ''}>
      ${iconPart}
      <span>${escapeText(opt.name)}</span>`;
    list.appendChild(row);
  });
  modal.classList.add('open');
  function openRuleAfterPick() {
    const targetFolderId = rule.folderId || null;
    for (const f of state.folders) {
      f.collapsed = f.id !== targetFolderId;
    }
    rule.collapsed = false;
    markStructureDirty();
    save().then(renderFolders);
  }
  const skipHandler = () => { modal.classList.remove('open'); cleanup(); openRuleAfterPick(); };
  const applyHandler = () => {
    const chosen = list.querySelector('input[name=fpChoice]:checked');
    if (chosen) rule.folderId = chosen.value || null;
    modal.classList.remove('open');
    cleanup();
    openRuleAfterPick();
  };
  function cleanup() {
    $('fpSkip').removeEventListener('click', skipHandler);
    $('fpApply').removeEventListener('click', applyHandler);
    $('fpClose').removeEventListener('click', skipHandler);
  }
  $('fpSkip').addEventListener('click', skipHandler);
  $('fpApply').addEventListener('click', applyHandler);
  $('fpClose').addEventListener('click', skipHandler);
}

/* ---------- Rules management modal ---------- */
function openManageRules() {
  const modal = $('manageModal');
  const list = $('mmList');
  list.innerHTML = '';
  if (!state.rules.length) {
    list.innerHTML = '<div class="empty">Правил нет.</div>';
    modal.classList.add('open');
    return;
  }
  const groups = [];
  const ungrouped = state.rules.filter(r => !r.folderId);
  for (const folder of state.folders) {
    const rules = state.rules.filter(r => r.folderId === folder.id);
    if (rules.length) groups.push({ folder, rules });
  }
  if (ungrouped.length) groups.push({ folder: null, rules: ungrouped });

  for (const g of groups) {
    const section = document.createElement('div');
    section.className = 'mm-folder-section';
    const name = g.folder ? escapeText(g.folder.name) : 'Без папки';
    const mmIcon = folderIconSmall(g.folder || { name: 'Без папки' });
    section.innerHTML = `
      <div class="mm-folder-head">
        <button class="mm-folder-toggle ghost small">▴</button>
        ${mmIcon}
        <span class="mm-folder-name">${name}</span>
        ${g.folder ? '<button class="ghost small mm-rename" title="Переименовать папку">✏</button>' : ''}
        <span class="mm-folder-count">${g.rules.length} всего · ${g.rules.filter(r => r.enabled !== false).length} активных</span>
      </div>
      <div class="mm-folder-body"></div>`;
    const body = section.querySelector('.mm-folder-body');
    const toggle = section.querySelector('.mm-folder-toggle');
    toggle.addEventListener('click', () => {
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      toggle.textContent = hidden ? '▴' : '▾';
    });
    if (g.folder) {
      section.querySelector('.mm-rename').addEventListener('click', () => {
        const newName = prompt('Новое название папки:', g.folder.name);
        if (newName !== null && newName.trim()) {
          g.folder.name = newName.trim();
          section.querySelector('.mm-folder-name').textContent = newName.trim();
          save().then(renderFolders);
        }
      });
    }
    for (const rule of g.rules) {
      const row = document.createElement('label');
      row.className = 'mm-row' + (rule.enabled === false ? ' mm-disabled' : '');
      row.innerHTML = `
        <input type="checkbox" class="mm-cb" data-id="${rule.id}">
        <div class="mm-info">
          <div class="mm-name">${escapeText(rule.name || '(без имени)')}${rule.enabled === false ? ' <span class="mm-off">ВЫКЛ</span>' : ''}</div>
          <div class="mm-meta">${ruleSummary(rule)}</div>
        </div>`;
      body.appendChild(row);
    }
    list.appendChild(section);
  }
  modal.classList.add('open');
}
$('manageRules').addEventListener('click', openManageRules);
$('mmClose').addEventListener('click', () => $('manageModal').classList.remove('open'));
$('mmDone').addEventListener('click', () => $('manageModal').classList.remove('open'));
$('mmSelectAll').addEventListener('click', () => $$('.mm-cb', $('mmList')).forEach(cb => cb.checked = true));
$('mmDeselectAll').addEventListener('click', () => $$('.mm-cb', $('mmList')).forEach(cb => cb.checked = false));
$('mmDeleteSelected').addEventListener('click', () => {
  const ids = $$('.mm-cb:checked', $('mmList')).map(cb => cb.dataset.id);
  if (!ids.length) { toast('Ничего не выбрано', 'error'); return; }
  if (!confirm('Удалить ' + ids.length + ' правил? Действие необратимо.')) return;
  const idSet = new Set(ids);
  addLog('удалено (' + ids.length + ')', 'правила', 'массовое');
  state.rules = state.rules.filter(r => !idSet.has(r.id));
  markStructureDirty();
  save().then(() => { openManageRules(); renderFolders(); toast('Удалено правил: ' + ids.length, 'ok'); });
});

/* ---------- Special insertions management modal ---------- */
function openManageSpecial() {
  const modal = $('manageSpecialModal');
  const list = $('msList');
  list.innerHTML = '';
  const items = state.specialInsertions || [];
  if (!items.length) {
    list.innerHTML = '<div class="empty">Вставок нет.</div>';
  } else {
    items.forEach(ins => {
      const row = document.createElement('label');
      row.className = 'mm-row';
      row.innerHTML = `
        <input type="checkbox" class="mm-cb" data-id="${ins.id}">
        <div class="mm-info">
          <div class="mm-name">${escapeText(ins.name || '(без имени)')}</div>
          <div class="mm-meta">${escapeText(ins.urlPattern || '—')} · обновлено ${fmtDate(ins.updatedAt)}</div>
        </div>`;
      list.appendChild(row);
    });
  }
  modal.classList.add('open');
}
if ($('manageSpecial')) $('manageSpecial').addEventListener('click', openManageSpecial);
$('msClose').addEventListener('click', () => $('manageSpecialModal').classList.remove('open'));
$('msDone').addEventListener('click', () => $('manageSpecialModal').classList.remove('open'));
$('msSelectAll').addEventListener('click', () => $$('.mm-cb', $('msList')).forEach(cb => cb.checked = true));
$('msDeselectAll').addEventListener('click', () => $$('.mm-cb', $('msList')).forEach(cb => cb.checked = false));
$('msDeleteSelected').addEventListener('click', () => {
  const ids = $$('.mm-cb:checked', $('msList')).map(cb => cb.dataset.id);
  if (!ids.length) { toast('Ничего не выбрано', 'error'); return; }
  if (!confirm('Удалить ' + ids.length + ' вставок? Действие необратимо.')) return;
  const idSet = new Set(ids);
  addLog('удалено (' + ids.length + ')', 'вставки', 'массовое');
  state.specialInsertions = (state.specialInsertions || []).filter(x => !idSet.has(x.id));
  save().then(() => { openManageSpecial(); renderSpecial(); toast('Удалено вставок: ' + ids.length, 'ok'); });
});

/* ---------- Counters management modal ---------- */
function openManageCounters() {
  const modal = $('manageCountersModal');
  const list = $('mcList');
  list.innerHTML = '';
  const items = state.smartCounters || [];
  if (!items.length) {
    list.innerHTML = '<div class="empty">Инкременторов нет.</div>';
  } else {
    items.forEach(sc => {
      const row = document.createElement('label');
      row.className = 'mm-row';
      const next = nextValueOf(sc, '');
      row.innerHTML = `
        <input type="checkbox" class="mm-cb" data-name="${escapeAttr(sc.name || '')}">
        <div class="mm-info">
          <div class="mm-name">${escapeText(sc.name || '(без имени)')}</div>
          <div class="mm-meta">{{seq:${escapeText(sc.name || '')}}} · следующий: ${escapeText(next.base)} · ${(sc.branches || []).length} домен(ов)</div>
        </div>`;
      list.appendChild(row);
    });
  }
  modal.classList.add('open');
}
$('manageCounters').addEventListener('click', openManageCounters);
$('mcClose').addEventListener('click', () => $('manageCountersModal').classList.remove('open'));
$('mcDone').addEventListener('click', () => $('manageCountersModal').classList.remove('open'));
$('mcSelectAll').addEventListener('click', () => $$('.mm-cb', $('mcList')).forEach(cb => cb.checked = true));
$('mcDeselectAll').addEventListener('click', () => $$('.mm-cb', $('mcList')).forEach(cb => cb.checked = false));
$('mcDeleteSelected').addEventListener('click', () => {
  const names = $$('.mm-cb:checked', $('mcList')).map(cb => cb.dataset.name);
  if (!names.length) { toast('Ничего не выбрано', 'error'); return; }
  if (!confirm('Удалить ' + names.length + ' инкременторов? Действие необратимо.')) return;
  const nameSet = new Set(names);
  addLog('удалено (' + names.length + ')', 'инкременторы', 'массовое');
  state.smartCounters = (state.smartCounters || []).filter(x => !nameSet.has(x.name));
  save().then(() => { openManageCounters(); renderCounters(); toast('Удалено инкременторов: ' + names.length, 'ok'); });
});

/* ---------- Icon / emoji picker for folders ---------- */
let iconMenuOpen = null;
function openIconMenu(anchor, folder) {
  if (iconMenuOpen) { iconMenuOpen.remove(); iconMenuOpen = null; }
  const pop = document.createElement('div');
  pop.className = 'icon-menu-popup';

  const hasIcon = folder.icon || folder.emoji;
  pop.innerHTML = `
    <button class="icon-menu-btn" data-action="emoji">😀 Emoji</button>
    <button class="icon-menu-btn" data-action="image">🖼 Картинка</button>
    ${hasIcon ? '<button class="icon-menu-btn icon-menu-remove" data-action="remove">✕ Убрать</button>' : ''}`;

  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top  = (r.bottom + window.scrollY + 4) + 'px';
  pop.style.left = (r.left   + window.scrollX)     + 'px';
  iconMenuOpen = pop;

  pop.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    pop.remove(); iconMenuOpen = null;
    const action = btn.dataset.action;
    if (action === 'emoji') openEmojiPicker(anchor, folder);
    else if (action === 'image') openImagePicker(folder);
    else if (action === 'remove') { delete folder.icon; delete folder.emoji; save().then(renderFolders); }
  });

  setTimeout(() => {
    const off = (ev) => {
      if (!pop.contains(ev.target) && ev.target !== anchor) { pop.remove(); iconMenuOpen = null; document.removeEventListener('click', off); }
    };
    document.addEventListener('click', off);
  }, 0);
}

const EMOJI_SET = [
  '🔧','🔩','🪛','🪚','⚙','🛠','🔨','⛏','🪓','🗜',
  '🔬','🔭','🧪','🧫','🧬','💉','🩺','🩻','⚗','🧲',
  '💻','🖥','⌨','🖨','🖱','💾','💿','📀','🧮','📟',
  '📱','📡','🔌','🔋','💡','🔦','📷','📹','🎙','🎚',
  '📁','📂','📦','📋','📌','📎','🔖','🏷','🗂','💼',
  '📄','📑','📝','📒','📓','📔','📕','📗','📘','📙',
  '🅰','🅱','🆎','🅾','🅿','Ⓜ','🆔','🆚','🔤','🔡',
  '🔠','🔣','🔢','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣',
  '🌐','🔒','🔓','🔑','🛡','🔐','🗝','🪪','📛','🏴',
  '🎯','🎨','🧩','🎲','🎮','🕹','🎰','🃏','♟','🧿',
  '⚡','🔥','❄','💧','🌊','🌪','☀','🌙','⭐','🌈',
  '💎','🏆','🥇','🥈','🥉','🏅','🎖','🏵','👑','💰',
  '🚀','✈','🚗','🚢','🛸','🚁','🚂','🏠','🏢','🏭',
  '🎵','🎬','🎭','🎪','🎤','🎧','📺','📻','🔔','📣',
  '💬','💭','🗨','🗯','✉','📧','📮','🗃','🗄','🗑',
  '✅','❌','⚠','❓','❗','💯','♻','⛔','🚫','🔕',
  '🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🩷',
  '❤','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔',
  '🐛','🐞','🐝','🦋','🐍','🐢','🦊','🐱','🐶','🦄',
  '🍎','🍊','🍋','🍏','🫐','🍇','🍒','🥑','🌶','🍕'
];

function openEmojiPicker(anchor, folder) {
  if (iconMenuOpen) { iconMenuOpen.remove(); iconMenuOpen = null; }
  const pop = document.createElement('div');
  pop.className = 'emoji-picker-popup';
  pop.innerHTML = EMOJI_SET.map(e =>
    `<button class="emoji-cell${folder.emoji === e ? ' selected' : ''}">${e}</button>`
  ).join('');
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top  = (r.bottom + window.scrollY + 4) + 'px';
  pop.style.left = (r.left   + window.scrollX)     + 'px';
  iconMenuOpen = pop;

  pop.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-cell');
    if (!btn) return;
    folder.emoji = btn.textContent;
    delete folder.icon;
    save().then(renderFolders);
    pop.remove(); iconMenuOpen = null;
  });

  setTimeout(() => {
    const off = (ev) => {
      if (!pop.contains(ev.target)) { pop.remove(); iconMenuOpen = null; document.removeEventListener('click', off); }
    };
    document.addEventListener('click', off);
  }, 0);
}

function openImagePicker(folder) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 256 * 1024) { toast('Максимум 256 КБ', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        folder.icon = canvas.toDataURL('image/png');
        delete folder.emoji;
        save().then(renderFolders);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

/* ================================================================
   ================ SPECIAL INSERTIONS ==============================
   ================================================================ */

const VALUE_TYPES = [
  { key: 'text',         label: 'Простой текст (без токенов)' },
  { key: 'integer',      label: 'Целое число' },
  { key: 'decimal',      label: 'Дробное число' },
  { key: 'email',        label: 'Email' },
  { key: 'phone',        label: 'Телефон' },
  { key: 'date_now',     label: 'Текущая дата/время' },
  { key: 'date_range',   label: 'Случайная дата в диапазоне' },
  { key: 'uuid',         label: 'UUID' },
  { key: 'checkbox',     label: 'Чекбокс ON / OFF' },
  { key: 'select_value', label: 'Значение для <select>' },
  { key: 'pick_custom',  label: 'Случайное из своего списка' },
  { key: 'pick_preset',  label: 'Случайное из готового списка (en)' },
  { key: 'regex',        label: 'Строка по regex' },
  { key: 'advanced',     label: 'Продвинутый шаблон с токенами' }
];

const PRESET_LISTS = [
  { key: 'word',           label: 'Тематический словарь (~690 слов, безопасно для email)' }
];

function buildTemplate(meta) {
  if (!meta || !meta.type) return '';
  const p = meta.params || {};
  switch (meta.type) {
    case 'text':        return p.value || '';
    case 'integer':     return '{{number:' + (p.min ?? 1) + ':' + (p.max ?? 100) + '}}';
    case 'decimal':     return '{{decimal:' + (p.min ?? 0) + ':' + (p.max ?? 100) + ':' + (p.precision ?? 2) + '}}';
    case 'email':       return p.domain ? '{{email:' + p.domain + '}}' : '{{email}}';
    case 'phone':       return p.format ? '{{phone:' + p.format + '}}' : '{{phone}}';
    case 'date_now':    return '{{now:' + (p.format || 'yyyy-MM-dd') + '}}';
    case 'date_range':  return '{{date:' + (p.from || '2020-01-01') + ':' + (p.to || '2025-12-31') + ':' + (p.format || 'yyyy-MM-dd') + '}}';
    case 'uuid':        return '{{uuid}}';
    case 'checkbox':    return p.checked === 'on' ? 'true' : 'false';
    case 'select_value': return p.value || '';
    case 'pick_custom': {
      const items = String(p.values || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      return items.length ? '{{pick:' + items.join('|') + '}}' : '';
    }
    case 'pick_preset': return '{{' + (p.preset || 'word') + '}}';
    case 'regex':       return p.pattern ? '{{regex:' + p.pattern + '}}' : '';
    case 'advanced':    return p.template || '';
  }
  return '';
}

function collapseAllExtras(except) {
  if (state.scraperConfig && state.scraperConfig !== except) state.scraperConfig.collapsed = true;
  if (state.copyfxConfig && state.copyfxConfig !== except) state.copyfxConfig.collapsed = true;
  for (const ua of (state.uaRules || [])) { if (ua !== except) ua.collapsed = true; }
  for (const ins of (state.specialInsertions || [])) { if (ins !== except) ins.collapsed = true; }
  for (const sc of (state.smartCounters || [])) { if (sc !== except) sc.collapsed = true; }
  for (const wl of (state.customWordLists || [])) { if (wl !== except) wl.collapsed = true; }
}

function renderAllExtras() {
  renderScraperConfig();
  renderCopyfxConfig();
  renderUaRules();
  renderSpecial();
  renderCounters();
  renderWordLists();
}

function renderSpecial() {
  const box = $('specialList');
  if (!box) return;
  box.innerHTML = '';
  (state.specialInsertions || []).forEach((ins) => {
    box.appendChild(ins.collapsed ? renderInsertionCollapsed(ins) : renderInsertionExpanded(ins));
  });
  if (!(state.specialInsertions || []).length) {
    box.innerHTML = '<div class="empty">Пока нет вставок. Добавьте первую кнопкой выше.</div>';
  }
}

function insertionSummary(ins) {
  const parts = [];
  if (ins.actionType === 'click') {
    parts.push('<span class="badge" style="background:#F5CD47;color:#594300">click</span>');
  } else {
    parts.push('<span class="badge">' + (ins.valueMeta?.type || 'template') + '</span>');
  }
  if (ins.urlPattern) parts.push('URL: <code>' + escapeText(ins.urlPattern) + '</code>');
  if (ins.targetSelector) parts.push('target: <code>' + escapeText(ins.targetSelector) + '</code>');
  if (ins.triggerSelector) parts.push('<span class="conn">trigger</span>');
  return parts.join(' <span class="conn">·</span> ');
}

function renderInsertionCollapsed(ins) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed';
  const isClick = ins.actionType === 'click';
  const actionLabel = isClick ? 'Кликнуть (Выбрать)' : 'Заполнить поле';
  const typeBadge = isClick ? 'click' : (ins.valueMeta?.type || 'template');
  const previewText = isClick
    ? '→ click: ' + escapeText(ins.targetSelector || '—')
    : escapeText(safePreview(ins.valueTemplate));
  const datesParts = [];
  if (ins.createdAt) datesParts.push('создано ' + fmtDate(ins.createdAt));
  if (ins.updatedAt) datesParts.push('обновлено ' + fmtDate(ins.updatedAt));
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">${escapeText(typeBadge)}</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">${escapeText(ins.name || '(без имени)')}${ins.enabled === false ? ' <span class="rc-off">ВЫКЛ</span>' : ''} <span class="rc-action-label">${actionLabel}</span></div>
          <div class="rule-collapsed-actions">
            <label class="rule-status-toggle" title="Вкл/Выкл"><input type="checkbox" class="sEnabled" ${ins.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${ins.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
            <button class="small sEdit" title="Редактировать">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">${ins.urlPattern ? 'URL: <code>' + escapeText(ins.urlPattern) + '</code>' : ''}</span>
          <span class="rc-col-match">${ins.targetSelector ? 'target: <code>' + escapeText(ins.targetSelector) + '</code>' : ''}${ins.triggerSelector ? ' <span class="conn">· trigger</span>' : ''}</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${previewText}</span>
          <span class="rc-dates">${datesParts.join(' · ')}</span>
        </div>
      </div>
    </div>`;
  card.querySelector('.sEnabled').addEventListener('change', e => {
    ins.enabled = e.target.checked;
    card.querySelector('.toggle-label').textContent = ins.enabled ? 'ВКЛ' : 'ВЫКЛ';
    saveDebounced();
  });
  card.querySelector('.sEdit').addEventListener('click', () => { collapseAllExtras(ins); ins.collapsed = false; save().then(renderAllExtras); });
  return card;
}

function renderInsertionExpanded(ins) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  card.innerHTML = `
    <div class="rule-head">
      <input type="text" class="sName" value="${escapeAttr(ins.name || '')}" placeholder="Название вставки">
      <label class="rule-status-toggle shrink"><input type="checkbox" class="sEnabled" ${ins.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${ins.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
      <button class="ghost small sTest" title="Обновить превью">Тест</button>
      <button class="primary small sCollapse" title="Сохранить и свернуть">✔ Готово</button>
      ${ins._isNew ? '<button class="small sClose" title="Отменить создание вставки">Закрыть</button>' : '<button class="small sCancel" title="Свернуть без сохранения">Отменить</button>'}
    </div>

    <label>URL-паттерн (regex или подстрока)</label>
    <input type="text" class="sUrl" value="${escapeAttr(ins.urlPattern || '')}" placeholder="example\\.com/edit">

    <label>Селектор целевого input</label>
    <div class="row">
      <input type="text" class="sSel grow" value="${escapeAttr(ins.targetSelector || '')}" placeholder="#login">
      <button class="small sPick shrink">выбрать</button>
    </div>

    <details ${ins.triggerSelector ? 'open' : ''} style="margin-top:8px">
      <summary style="cursor:pointer;color:var(--text-subtle);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0">
        Кнопка-триггер ${ins.triggerSelector ? '• задан' : '(опционально)'}
      </summary>
      <p class="hint" style="margin-top:8px">
        Если целевой input появляется только после клика по кнопке — задайте селектор кнопки.
        Расширение кликнет по ней, дождётся указанное время, потом заполнит input.
        Если input уже виден — клика не будет.
      </p>
      <div class="row">
        <input type="text" class="sTrig grow" value="${escapeAttr(ins.triggerSelector || '')}" placeholder="button.add-value">
        <button class="small sTrigPick shrink">выбрать</button>
      </div>
      <label>Задержка после клика (мс)</label>
      <input type="number" class="sTrigWait" min="0" max="5000" step="50" value="${escapeAttr(ins.triggerWait || 300)}" style="max-width:140px">
    </details>

    <label style="margin-top:12px">Действие</label>
    <select class="sActionType">
      <option value="fill" ${(ins.actionType || 'fill') === 'fill' ? 'selected' : ''}>Заполнить значение (fill)</option>
      <option value="click" ${ins.actionType === 'click' ? 'selected' : ''}>Кликнуть по элементу (click)</option>
    </select>
    <p class="hint sActionHint" ${ins.actionType === 'click' ? '' : 'style="display:none"'}>Клик по элементу — для кастомных дропдаунов (div-based). Используйте CSS-селектор с data-атрибутом, например: <code>[data-value="373"]</code></p>
    <div class="sClickGuardSection" ${ins.actionType === 'click' ? '' : 'style="display:none"'}>
      <label style="margin-top:6px">Проверка состояния (для чекбоксов)</label>
      <select class="sClickGuard">
        <option value="none" ${(ins.clickGuard || 'none') === 'none' ? 'selected' : ''}>Без проверки — кликнуть всегда</option>
        <option value="on" ${ins.clickGuard === 'on' ? 'selected' : ''}>Только если сейчас OFF → включить</option>
        <option value="off" ${ins.clickGuard === 'off' ? 'selected' : ''}>Только если сейчас ON → выключить</option>
      </select>
      <p class="hint">Определяет состояние по <code>checked</code>, <code>aria-checked</code>, <code>data-state</code> или классу.</p>
    </div>

    <div class="value-builder" ${ins.actionType === 'click' ? 'style="display:none"' : ''}></div>
    <div class="sTemplateSection" ${ins.actionType === 'click' ? 'style="display:none"' : ''}>
      <label>Итоговый шаблон (только чтение)</label>
      <div class="preview sTplPreview mono">—</div>
      <label>Пример значения</label>
      <div class="preview sValPreview">—</div>
    </div>
  `;
  const vb = card.querySelector('.value-builder');
  renderValueBuilder(vb, ins, () => {
    ins.valueTemplate = buildTemplate(ins.valueMeta);
    card.querySelector('.sTplPreview').textContent = ins.valueTemplate || '—';
    updatePreviewInBox(card.querySelector('.sValPreview'), ins.valueTemplate);
    touchIns(ins);
    saveDebounced();
  });

  card.querySelector('.sActionType').addEventListener('change', e => {
    ins.actionType = e.target.value;
    const isClick = ins.actionType === 'click';
    card.querySelector('.value-builder').style.display = isClick ? 'none' : '';
    card.querySelector('.sTemplateSection').style.display = isClick ? 'none' : '';
    card.querySelector('.sActionHint').style.display = isClick ? '' : 'none';
    card.querySelector('.sClickGuardSection').style.display = isClick ? '' : 'none';
    touchIns(ins); saveDebounced();
  });

  card.querySelector('.sClickGuard').addEventListener('change', e => { ins.clickGuard = e.target.value; touchIns(ins); saveDebounced(); });

  card.querySelector('.sName').addEventListener('input', e => { ins.name = e.target.value; touchIns(ins); saveDebounced(); });
  card.querySelector('.sEnabled').addEventListener('change', e => { ins.enabled = e.target.checked; e.target.closest('.rule-status-toggle').querySelector('.toggle-label').textContent = ins.enabled ? 'ВКЛ' : 'ВЫКЛ'; touchIns(ins); saveDebounced(); });
  card.querySelector('.sUrl').addEventListener('input', e => { ins.urlPattern = e.target.value; touchIns(ins); saveDebounced(); });
  card.querySelector('.sSel').addEventListener('input', e => { ins.targetSelector = e.target.value; touchIns(ins); saveDebounced(); });
  card.querySelector('.sTest').addEventListener('click', () => {
    ins.valueTemplate = buildTemplate(ins.valueMeta);
    card.querySelector('.sTplPreview').textContent = ins.valueTemplate || '—';
    updatePreviewInBox(card.querySelector('.sValPreview'), ins.valueTemplate);
  });
  card.querySelector('.sPick').addEventListener('click', async () => {
    const res = await pickFromActiveTab();
    if (res && res.ok) { ins.targetSelector = res.selector; card.querySelector('.sSel').value = res.selector; touchIns(ins); saveDebounced(); }
  });
  card.querySelector('.sTrig').addEventListener('input', e => { ins.triggerSelector = e.target.value; touchIns(ins); saveDebounced(); });
  card.querySelector('.sTrigWait').addEventListener('input', e => { ins.triggerWait = parseInt(e.target.value, 10) || 0; touchIns(ins); saveDebounced(); });
  card.querySelector('.sTrigPick').addEventListener('click', async () => {
    const res = await pickFromActiveTab();
    if (res && res.ok) { ins.triggerSelector = res.selector; card.querySelector('.sTrig').value = res.selector; touchIns(ins); saveDebounced(); }
  });
  if (!ins._isNew && !ins._snapshot) {
    ins._snapshot = deepClone(ins);
  }
  card.querySelector('.sCollapse').addEventListener('click', () => {
    ins.valueTemplate = buildTemplate(ins.valueMeta);
    addLog(ins._isNew ? 'создано' : 'изменено', 'вставка', ins.name);
    autoSnapshot('вставка: ' + (ins.targetSelector || ins.id));
    delete ins._isNew;
    delete ins._snapshot;
    ins.collapsed = true;
    save().then(renderSpecial);
  });
  if (ins._isNew) {
    card.querySelector('.sClose').addEventListener('click', () => {
      state.specialInsertions = state.specialInsertions.filter(x => x.id !== ins.id);
      save().then(renderSpecial);
    });
  } else {
    card.querySelector('.sCancel').addEventListener('click', () => {
      if (ins._snapshot) Object.assign(ins, ins._snapshot);
      delete ins._snapshot;
      ins.collapsed = true;
      save().then(renderSpecial);
    });
  }

  // первичное превью
  ins.valueTemplate = buildTemplate(ins.valueMeta);
  card.querySelector('.sTplPreview').textContent = ins.valueTemplate || '—';
  updatePreviewInBox(card.querySelector('.sValPreview'), ins.valueTemplate);
  return card;
}

function updatePreviewInBox(box, template) {
  if (!template) { box.textContent = '—'; return; }
  try { box.textContent = window.FF.render(template, previewCtx()) || '—'; }
  catch (e) { box.textContent = 'Ошибка: ' + e.message; }
}
function touchIns(ins) { ins.updatedAt = new Date().toISOString(); }

// Рендер редактора для конкретного типа значения. onChange — вызывается на любое изменение.
function renderValueBuilder(box, ins, onChange) {
  const meta = ins.valueMeta || (ins.valueMeta = { type: 'advanced', params: { template: ins.valueTemplate || '' } });
  const p = meta.params = meta.params || {};

  const opts = VALUE_TYPES.map(t => `<option value="${t.key}" ${meta.type === t.key ? 'selected' : ''}>${escapeText(t.label)}</option>`).join('');

  box.innerHTML = `
    <label>Тип значения</label>
    <select class="vbType">${opts}</select>
    <div class="vb-params"></div>`;
  const paramsBox = box.querySelector('.vb-params');

  function draw() {
    paramsBox.innerHTML = '';
    switch (meta.type) {
      case 'text':
        paramsBox.innerHTML = `
          <label>Значение</label>
          <input type="text" class="vbValue" value="${escapeAttr(p.value || '')}" placeholder="Здесь будет ровно то, что ты введёшь">`;
        paramsBox.querySelector('.vbValue').addEventListener('input', e => { p.value = e.target.value; onChange(); });
        break;
      case 'integer':
        paramsBox.innerHTML = `
          <div class="row">
            <div class="grow"><label>Минимум</label><input type="number" class="vbMin" value="${escapeAttr(p.min ?? 1)}"></div>
            <div class="grow"><label>Максимум</label><input type="number" class="vbMax" value="${escapeAttr(p.max ?? 100)}"></div>
          </div>`;
        paramsBox.querySelector('.vbMin').addEventListener('input', e => { p.min = parseInt(e.target.value, 10) || 0; onChange(); });
        paramsBox.querySelector('.vbMax').addEventListener('input', e => { p.max = parseInt(e.target.value, 10) || 0; onChange(); });
        break;
      case 'decimal':
        paramsBox.innerHTML = `
          <div class="row">
            <div class="grow"><label>Минимум</label><input type="number" step="any" class="vbMin" value="${escapeAttr(p.min ?? 0)}"></div>
            <div class="grow"><label>Максимум</label><input type="number" step="any" class="vbMax" value="${escapeAttr(p.max ?? 100)}"></div>
            <div class="shrink" style="flex:0 0 160px"><label>Знаков после точки</label><input type="number" min="0" max="10" class="vbPrec" value="${escapeAttr(p.precision ?? 2)}"></div>
          </div>`;
        paramsBox.querySelector('.vbMin').addEventListener('input', e => { p.min = parseFloat(e.target.value) || 0; onChange(); });
        paramsBox.querySelector('.vbMax').addEventListener('input', e => { p.max = parseFloat(e.target.value) || 0; onChange(); });
        paramsBox.querySelector('.vbPrec').addEventListener('input', e => { p.precision = parseInt(e.target.value, 10) || 0; onChange(); });
        break;
      case 'email':
        paramsBox.innerHTML = `
          <label>Домен (опционально)</label>
          <input type="text" class="vbDomain" value="${escapeAttr(p.domain || '')}" placeholder="example.com">`;
        paramsBox.querySelector('.vbDomain').addEventListener('input', e => { p.domain = e.target.value; onChange(); });
        break;
      case 'phone':
        paramsBox.innerHTML = `
          <label>Формат (# — любая цифра)</label>
          <input type="text" class="vbFormat" value="${escapeAttr(p.format || '')}" placeholder="+7 (9##) ###-##-##">`;
        paramsBox.querySelector('.vbFormat').addEventListener('input', e => { p.format = e.target.value; onChange(); });
        break;
      case 'date_now':
        paramsBox.innerHTML = `
          <label>Формат</label>
          <input type="text" class="vbFormat" value="${escapeAttr(p.format || 'yyyy-MM-dd')}" placeholder="yyyy-MM-dd HH:mm:ss">
          <p class="hint">Плейсхолдеры: yyyy, MM, dd, HH, mm, ss</p>`;
        paramsBox.querySelector('.vbFormat').addEventListener('input', e => { p.format = e.target.value; onChange(); });
        break;
      case 'date_range':
        paramsBox.innerHTML = `
          <div class="row">
            <div class="grow"><label>С</label><input type="date" class="vbFrom" value="${escapeAttr(p.from || '2020-01-01')}"></div>
            <div class="grow"><label>По</label><input type="date" class="vbTo" value="${escapeAttr(p.to || '2025-12-31')}"></div>
            <div class="grow"><label>Формат</label><input type="text" class="vbFormat" value="${escapeAttr(p.format || 'yyyy-MM-dd')}"></div>
          </div>`;
        paramsBox.querySelector('.vbFrom').addEventListener('input', e => { p.from = e.target.value; onChange(); });
        paramsBox.querySelector('.vbTo').addEventListener('input', e => { p.to = e.target.value; onChange(); });
        paramsBox.querySelector('.vbFormat').addEventListener('input', e => { p.format = e.target.value; onChange(); });
        break;
      case 'uuid':
        paramsBox.innerHTML = `<p class="hint">UUID v4 будет сгенерирован автоматически.</p>`;
        break;
      case 'checkbox':
        if (!p.checked) p.checked = 'on';
        paramsBox.innerHTML = `
          <label>Состояние чекбокса</label>
          <div class="row" style="gap:16px">
            <label class="inline-lbl"><input type="radio" name="vbCbState_${ins.id}" value="on" ${p.checked === 'on' ? 'checked' : ''}> ON (включить)</label>
            <label class="inline-lbl"><input type="radio" name="vbCbState_${ins.id}" value="off" ${p.checked === 'off' ? 'checked' : ''}> OFF (выключить)</label>
          </div>
          <p class="hint">Устанавливает чекбокс в нужное состояние. Работает с нативными &lt;input type="checkbox"&gt;.</p>`;
        paramsBox.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', e => { p.checked = e.target.value; onChange(); }));
        break;
      case 'select_value':
        paramsBox.innerHTML = `
          <label>Значение для выбора</label>
          <input type="text" class="vbValue" value="${escapeAttr(p.value || '')}" placeholder="Значение option (value или текст)">
          <p class="hint">Введите value или видимый текст нужного пункта &lt;select&gt;. Регистр не важен. Если совпадений нет — будет выбран случайный вариант.</p>`;
        paramsBox.querySelector('.vbValue').addEventListener('input', e => { p.value = e.target.value; onChange(); });
        break;
      case 'pick_custom':
        paramsBox.innerHTML = `
          <label>Значения (по одному в строке или через запятую)</label>
          <textarea class="vbValues" placeholder="кот&#10;пёс&#10;хомяк">${escapeText(p.values || '')}</textarea>`;
        paramsBox.querySelector('.vbValues').addEventListener('input', e => { p.values = e.target.value; onChange(); });
        break;
      case 'pick_preset':
        const allPresets = PRESET_LISTS.concat(
          (state.customWordLists || []).filter(wl => wl.name).map(wl => ({ key: 'list:' + wl.name, label: wl.name + ' (пользовательский, ' + wordListWordCount(wl) + ' слов)' }))
        );
        paramsBox.innerHTML = `
          <label>Готовый список</label>
          <select class="vbPreset">
            ${allPresets.map(l => `<option value="${l.key}" ${p.preset === l.key ? 'selected' : ''}>${escapeText(l.label)}</option>`).join('')}
          </select>`;
        paramsBox.querySelector('.vbPreset').addEventListener('change', e => { p.preset = e.target.value; onChange(); });
        break;
      case 'regex':
        paramsBox.innerHTML = `
          <label>Regex-паттерн</label>
          <input type="text" class="vbPattern" value="${escapeAttr(p.pattern || '')}" placeholder="[A-Z]{3}-\\d{4}">
          <div class="regex-help">${regexCheatsheetHtml()}</div>`;
        paramsBox.querySelector('.vbPattern').addEventListener('input', e => { p.pattern = e.target.value; onChange(); });
        break;
      case 'advanced':
        paramsBox.innerHTML = `
          <div class="row" style="align-items:baseline;margin:14px 0 4px">
            <label style="margin:0" class="shrink">Свой шаблон</label>
            <span></span>
            <button class="small ghost shrink vbInsertToken" type="button">+ Токен</button>
          </div>
          <textarea class="vbTemplate" placeholder="test_{{counter:special}}_{{name.first}}">${escapeText(p.template || '')}</textarea>
          <p class="hint">Обычный текст со вставками <code>{{token}}</code>. Кнопка «+ Токен» подставляет готовые токены.</p>`;
        const ta = paramsBox.querySelector('.vbTemplate');
        ta.addEventListener('input', e => { p.template = e.target.value; onChange(); });
        paramsBox.querySelector('.vbInsertToken').addEventListener('click', (e) => openTokenMenu(e.currentTarget, ta));
        break;
    }
  }
  draw();
  box.querySelector('.vbType').addEventListener('change', e => {
    meta.type = e.target.value;
    // на смену типа — сбрасываем params (кроме advanced который держит template)
    meta.params = {};
    onChange();
    draw();
  });
}

if ($('addSpecial')) $('addSpecial').addEventListener('click', () => {
  state.specialInsertions = state.specialInsertions || [];
  const now = new Date().toISOString();
  const ins = {
    id: uid(), name: 'Новая вставка', enabled: true, collapsed: false, _isNew: true,
    urlPattern: '', targetSelector: '', triggerSelector: '', triggerWait: 300,
    actionType: 'fill',
    valueTemplate: '',
    valueMeta: { type: 'text', params: { value: '' } },
    createdAt: now, updatedAt: now
  };
  collapseAllExtras(ins);
  state.specialInsertions.push(ins);
  addLog('создано', 'вставка', 'Новая вставка');
  save().then(renderAllExtras);
});
if ($('addSpecialFromHtml')) $('addSpecialFromHtml').addEventListener('click', () => openAddModal(''));

/* ================ Модалка Из HTML ================ */
function openAddModal(prefilledUrl) {
  $('mUrl').value = prefilledUrl || '';
  $('mHtml').value = '';
  $('mTriggerHtml').value = '';
  $('mResult').style.display = 'none';
  $('mTriggerBlock').style.display = 'none';
  $('mSave').disabled = true;
  $('mSpin').style.display = 'none';
  $('mAnalyze').disabled = false;
  $('mHtml').classList.remove('field-locked');
  $('mTriggerHtml').classList.remove('field-locked');
  $('addModal').classList.add('open');
}
function closeAddModal() { $('addModal').classList.remove('open'); }
$('modalClose').addEventListener('click', closeAddModal);
$('mCancel').addEventListener('click', closeAddModal);

$('mAnalyze').addEventListener('click', async () => {
  const html = $('mHtml').value.trim();
  const triggerHtml = $('mTriggerHtml').value.trim();
  const url = $('mUrl').value.trim();
  if (!html) { alert('Вставьте HTML целевого элемента'); return; }
  $('mSpin').style.display = 'inline-block';
  $('mAnalyze').disabled = true;
  $('mHtml').classList.add('field-locked');
  $('mTriggerHtml').classList.add('field-locked');
  await new Promise(r => setTimeout(r, 300));
  const res  = window.FFAnalyzer.analyze(html, url);
  const trig = triggerHtml ? window.FFAnalyzer.analyzeTrigger(triggerHtml) : null;
  $('mSpin').style.display = 'none';
  if (!res.ok) { alert('Не удалось разобрать целевой элемент: ' + res.error); $('mAnalyze').disabled = false; $('mHtml').classList.remove('field-locked'); $('mTriggerHtml').classList.remove('field-locked'); return; }
  if (trig && !trig.ok) { alert('Не удалось разобрать HTML триггера: ' + trig.error); $('mAnalyze').disabled = false; $('mHtml').classList.remove('field-locked'); $('mTriggerHtml').classList.remove('field-locked'); return; }

  $('mName').value = 'Заполнение ' + (res.category || 'field') + ' на ' + (url.split('/')[2] || 'странице');
  $('mUrlPattern').value = res.urlPattern;
  $('mSelector').value = res.selector;
  $('mElementInfo').textContent = res.element + '   • категория: ' + res.category;

  if (trig && trig.ok) {
    $('mTriggerBlock').style.display = 'block';
    $('mTriggerSel').value = trig.selector; $('mTrigWait').value = 300;
  } else {
    $('mTriggerBlock').style.display = 'none';
    $('mTriggerSel').value = '';
  }

  const list = $('mSuggestions');
  list.innerHTML = '';
  let currentTemplate = res.suggestions[0] ? res.suggestions[0].template : '';
  res.suggestions.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'suggestion' + (i === 0 ? ' selected' : '');
    row.innerHTML = `
      <div><div>${escapeText(s.template || '(свой шаблон)')}</div>${s.desc ? '<div class="desc">' + escapeText(s.desc) + '</div>' : ''}</div>
      <div class="desc">${escapeText(s.label)}</div>`;
    row.addEventListener('click', () => {
      $$('.suggestion', list).forEach(el => el.classList.remove('selected'));
      row.classList.add('selected');
      $('mTemplate').value = s.template; currentTemplate = s.template; updateModalPreview();
    });
    list.appendChild(row);
  });
  $('mTemplate').value = currentTemplate;
  $('mTemplate').oninput = updateModalPreview;
  updateModalPreview();
  $('mResult').style.display = 'block';
  $('mSave').disabled = false;
});

function updateModalPreview() {
  const t = $('mTemplate').value;
  const box = $('mPreview');
  if (!t) { box.textContent = '—'; return; }
  try { box.textContent = window.FF.render(t, previewCtx()) || '—'; }
  catch (e) { box.textContent = 'Ошибка: ' + e.message; }
}
$('mTestBtn').addEventListener('click', updateModalPreview);

$('mSave').addEventListener('click', async () => {
  const triggerSel = $('mTriggerSel').value.trim();
  const template = $('mTemplate').value;
  const now = new Date().toISOString();
  state.specialInsertions = state.specialInsertions || [];
  state.specialInsertions.push({
    id: uid(),
    name: $('mName').value.trim() || 'Без имени',
    enabled: true,
    collapsed: true,   // сразу свёрнута
    urlPattern: $('mUrlPattern').value.trim(),
    targetSelector: $('mSelector').value.trim(),
    triggerSelector: triggerSel || '',
    triggerWait: triggerSel ? (parseInt($('mTrigWait').value, 10) || 300) : 0,
    actionType: 'fill',
    valueTemplate: template,
    valueMeta: { type: 'advanced', params: { template } },
    createdAt: now, updatedAt: now
  });
  await save();
  closeAddModal();
  switchTab('extras');
  renderSpecial();
});

/* ================================================================
   ================ USER-AGENT RULES ================================
   ================================================================ */

const UA_PRESETS = [
  { label: 'Chrome Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
  { label: 'Chrome Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
  { label: 'Firefox Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0' },
  { label: 'Safari Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' },
  { label: 'Safari iPhone', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
  { label: 'Chrome Android', value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' },
  { label: 'Edge Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0' },
  { label: 'Googlebot', value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
];

/* ================================================================
   ================ PAGE DATA SCRAPER ================================
   ================================================================ */
function renderScraperConfig() {
  const box = $('scraperConfigBox');
  if (!box) return;
  const cfg = state.scraperConfig;
  box.innerHTML = '';
  box.appendChild(cfg.collapsed ? renderScraperCollapsed(cfg) : renderScraperExpanded(cfg));
}

function renderScraperCollapsed(cfg) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed' + (cfg.enabled === false ? ' rule-disabled' : '');
  const urls = (cfg.urls || []).filter(Boolean);
  const urlHtml = urls.length
    ? 'URL: <code>' + escapeText(urls[0]) + '</code>' + (urls.length > 1 ? ' <span class="extra-count">+' + (urls.length - 1) + '</span>' : '')
    : '<span class="rc-off">нет URL</span>';
  const enabledCount = (cfg.fields || []).filter(f => f.enabled).length;
  const totalCount = (cfg.fields || []).length;
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">📋</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">Клиент${cfg.enabled === false ? ' <span class="rc-off">ВЫКЛ</span>' : ''} <span class="rc-action-label">Parser</span></div>
          <div class="rule-collapsed-actions">
            <label class="rule-status-toggle" title="Вкл/Выкл"><input type="checkbox" class="scEnabled" ${cfg.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${cfg.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
            <button class="small scEdit" title="Редактировать">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">${urlHtml}</span>
          <span class="rc-col-match">${enabledCount} из ${totalCount} полей</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${escapeText(cfg.parentSelector || 'div.debug_plugin_client')}</span>
          <span class="rc-dates"></span>
        </div>
      </div>
    </div>`;
  card.querySelector('.scEnabled').addEventListener('change', e => {
    cfg.enabled = e.target.checked;
    card.classList.toggle('rule-disabled', !cfg.enabled);
    card.querySelector('.toggle-label').textContent = cfg.enabled ? 'ВКЛ' : 'ВЫКЛ';
    saveDebounced();
  });
  card.querySelector('.scEdit').addEventListener('click', () => { collapseAllExtras(cfg); cfg.collapsed = false; save().then(renderAllExtras); });
  return card;
}

function renderScraperExpanded(cfg) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  if (!cfg.urls.length) cfg.urls = [''];
  card.innerHTML = `
    <div class="rule-head">
      <span style="font-weight:600">Получение данных о клиенте из debug</span>
      <label class="rule-status-toggle shrink"><input type="checkbox" class="scEnabledExp" ${cfg.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${cfg.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
      <button class="primary small scCollapse" title="Сохранить и свернуть">✔ Готово</button>
      <button class="small scCancel" title="Свернуть без сохранения">Отменить</button>
    </div>
    <label>Сайты (подстрока URL или паттерн с <code>*</code>)</label>
    <div class="sc-urls-list"></div>
    <button class="small scAddUrl" type="button" style="margin:4px 0 8px">+ Добавить сайт</button>
    <p class="hint" style="margin-top:0">Подстрока URL или паттерн с вайлдкардами. Примеры: <code>example.com</code>, <code>*.example.com/admin*</code>. Кнопка «Сканировать» в попапе будет доступна только на совпавших страницах.</p>
    <label>Родительский CSS-селектор</label>
    <input type="text" class="scParentSel" value="${escapeAttr(cfg.parentSelector || 'div.debug_plugin_client')}" placeholder="div.debug_plugin_client" style="margin-bottom:8px">
    <label>Поля для отображения</label>
    <p class="hint" style="margin-top:0">Выберите поля и настройте порядок. Список обновляется кнопкой «Сканировать» в попапе.</p>
    <div class="sc-fields-list"></div>
  `;

  // --- URL list ---
  const urlsBox = card.querySelector('.sc-urls-list');
  function drawUrls() {
    urlsBox.innerHTML = '';
    cfg.urls.forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cssText = 'gap:6px;margin-bottom:4px';
      row.innerHTML = '<input type="text" class="scraperUrlItem grow" value="' + escapeAttr(u) + '" placeholder="example.com">' +
        (cfg.urls.length > 1 ? '<button class="btn-x small scraperRemoveUrl" type="button" title="Убрать сайт">×</button>' : '');
      row.querySelector('.scraperUrlItem').addEventListener('input', e => { cfg.urls[i] = e.target.value; });
      const rm = row.querySelector('.scraperRemoveUrl');
      if (rm) rm.addEventListener('click', () => { cfg.urls.splice(i, 1); drawUrls(); });
      urlsBox.appendChild(row);
    });
  }
  drawUrls();
  card.querySelector('.scAddUrl').addEventListener('click', () => { cfg.urls.push(''); drawUrls(); });

  // --- Fields list ---
  const fieldsBox = card.querySelector('.sc-fields-list');
  function drawFields() {
    const fields = cfg.fields || [];
    if (!fields.length) {
      fieldsBox.innerHTML = '<div class="hint">Нет полей. Нажмите «Сканировать» в попапе расширения.</div>';
      return;
    }
    fieldsBox.innerHTML = '';
    fields.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'scraper-field-row';
      row.innerHTML =
        '<label class="inline-lbl" style="margin:0;flex:1"><input type="checkbox" class="sfEnabled" ' + (f.enabled ? 'checked' : '') + '> <span class="mono" style="font-size:12px">' + escapeText(f.key) + '</span></label>' +
        '<button class="small sfUp" title="Вверх" ' + (i === 0 ? 'disabled' : '') + '>▲</button>' +
        '<button class="small sfDown" title="Вниз" ' + (i === fields.length - 1 ? 'disabled' : '') + '>▼</button>';
      row.querySelector('.sfEnabled').addEventListener('change', e => { f.enabled = e.target.checked; });
      row.querySelector('.sfUp').addEventListener('click', () => {
        if (i === 0) return;
        fields.splice(i, 1); fields.splice(i - 1, 0, f); drawFields();
      });
      row.querySelector('.sfDown').addEventListener('click', () => {
        if (i === fields.length - 1) return;
        fields.splice(i, 1); fields.splice(i + 1, 0, f); drawFields();
      });
      fieldsBox.appendChild(row);
    });
  }
  drawFields();

  card.querySelector('.scEnabledExp').addEventListener('change', e => {
    e.target.closest('.rule-status-toggle').querySelector('.toggle-label').textContent = e.target.checked ? 'ВКЛ' : 'ВЫКЛ';
  });

  if (!cfg._snapshot) cfg._snapshot = deepClone(cfg);

  card.querySelector('.scCancel').addEventListener('click', () => {
    if (cfg._snapshot) Object.assign(cfg, cfg._snapshot);
    delete cfg._snapshot;
    cfg.collapsed = true;
    renderScraperConfig();
  });

  // --- Collapse (save) ---
  card.querySelector('.scCollapse').addEventListener('click', () => {
    cfg.enabled = card.querySelector('.scEnabledExp').checked;
    cfg.urls = cfg.urls.map(u => u.trim()).filter(Boolean);
    if (!cfg.urls.length) cfg.urls = [''];
    cfg.parentSelector = card.querySelector('.scParentSel').value.trim() || 'div.debug_plugin_client';
    delete cfg._snapshot;
    cfg.collapsed = true;
    addLog('изменено', 'скрапер', '');
    save().then(renderScraperConfig);
  });

  return card;
}

/* ================================================================
   ================ COPYFX CONFIG ===================================
   ================================================================ */
function renderCopyfxConfig() {
  const box = $('copyfxConfigBox');
  if (!box) return;
  const cfg = state.copyfxConfig;
  box.innerHTML = '';
  box.appendChild(cfg.collapsed ? renderCopyfxCollapsed(cfg) : renderCopyfxExpanded(cfg));
}

function renderCopyfxCollapsed(cfg) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed' + (cfg.enabled === false ? ' rule-disabled' : '');
  const extraCount = (cfg.extraFields || []).filter(f => f.enabled).length;
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">📈</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">Copy Trading${cfg.enabled === false ? ' <span class="rc-off">ВЫКЛ</span>' : ''} <span class="rc-action-label">Получение стратегий</span></div>
          <div class="rule-collapsed-actions">
            <label class="rule-status-toggle" title="Вкл/Выкл"><input type="checkbox" class="cfxEnabled" ${cfg.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${cfg.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
            <button class="small cfxEdit" title="Редактировать">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">Страница: <code>${escapeText(cfg.pageUrl || '')}</code></span>
          <span class="rc-col-match">${extraCount ? extraCount + ' доп. полей' : ''}</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${escapeText(cfg.apiUrl || '')}</span>
          <span class="rc-dates"></span>
        </div>
      </div>
    </div>`;
  card.querySelector('.cfxEnabled').addEventListener('change', e => {
    cfg.enabled = e.target.checked;
    card.classList.toggle('rule-disabled', !cfg.enabled);
    card.querySelector('.toggle-label').textContent = cfg.enabled ? 'ВКЛ' : 'ВЫКЛ';
    saveDebounced();
  });
  card.querySelector('.cfxEdit').addEventListener('click', () => { collapseAllExtras(cfg); cfg.collapsed = false; save().then(renderAllExtras); });
  return card;
}

function renderCopyfxExpanded(cfg) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  card.innerHTML = `
    <div class="rule-head">
      <span style="font-weight:600">Copy Trading — Работа с API</span>
      <label class="rule-status-toggle shrink"><input type="checkbox" class="cfxEnabledExp" ${cfg.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${cfg.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
      <button class="primary small cfxCollapse" title="Сохранить и свернуть">✔ Готово</button>
      <button class="small cfxCancel" title="Свернуть без сохранения">Отменить</button>
    </div>
    <label>URL-подстрока страницы</label>
    <input type="text" class="cfxPageUrl" value="${escapeAttr(cfg.pageUrl || '')}" placeholder="/copyfx/my/strategies/" style="margin-bottom:8px">
    <p class="hint" style="margin-top:0">Кнопка «Получить трейдеров» в попапе будет доступна только на страницах, URL которых содержит эту подстроку.</p>
    <label>URL-подстрока API запроса</label>
    <input type="text" class="cfxApiUrl" value="${escapeAttr(cfg.apiUrl || '')}" placeholder="/copyfx2-api/copyfx/strategies" style="margin-bottom:8px">
    <p class="hint" style="margin-top:0">Подстрока URL запроса, ответ которого нужно считать. Расширение ищет его в Network-истории браузера.</p>
    <label>Дополнительные поля из API</label>
    <p class="hint" style="margin-top:0">Введите ключ поля из JSON-ответа. Значение будет добавлено в строку данных каждого трейдера.</p>
    <div class="cfx-extra-fields"></div>
    <div class="row" style="gap:6px;margin-top:4px">
      <input type="text" class="cfxNewField grow" placeholder="например: equity">
      <button class="small cfxAddField">+ Добавить</button>
    </div>
  `;

  const fieldsBox = card.querySelector('.cfx-extra-fields');
  function drawFields() {
    fieldsBox.innerHTML = '';
    (cfg.extraFields || []).forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'scraper-field-row';
      row.innerHTML =
        '<label class="inline-lbl" style="margin:0;flex:1"><input type="checkbox" class="cfxFEnabled" ' + (f.enabled ? 'checked' : '') + '> <span class="mono" style="font-size:12px">' + escapeText(f.key) + '</span></label>' +
        '<button class="btn-x small cfxFRemove" type="button" title="Убрать поле">×</button>';
      row.querySelector('.cfxFEnabled').addEventListener('change', e => { f.enabled = e.target.checked; });
      row.querySelector('.cfxFRemove').addEventListener('click', () => { cfg.extraFields.splice(i, 1); drawFields(); });
      fieldsBox.appendChild(row);
    });
  }
  drawFields();

  card.querySelector('.cfxAddField').addEventListener('click', () => {
    const inp = card.querySelector('.cfxNewField');
    const key = inp.value.trim();
    if (!key) return;
    if (cfg.extraFields.some(f => f.key === key)) { inp.value = ''; return; }
    cfg.extraFields.push({ key, enabled: true });
    inp.value = '';
    drawFields();
  });

  card.querySelector('.cfxEnabledExp').addEventListener('change', e => {
    e.target.closest('.rule-status-toggle').querySelector('.toggle-label').textContent = e.target.checked ? 'ВКЛ' : 'ВЫКЛ';
  });

  if (!cfg._snapshot) cfg._snapshot = deepClone(cfg);

  card.querySelector('.cfxCancel').addEventListener('click', () => {
    if (cfg._snapshot) Object.assign(cfg, cfg._snapshot);
    delete cfg._snapshot;
    cfg.collapsed = true;
    renderCopyfxConfig();
  });

  card.querySelector('.cfxCollapse').addEventListener('click', () => {
    cfg.enabled = card.querySelector('.cfxEnabledExp').checked;
    cfg.pageUrl = card.querySelector('.cfxPageUrl').value.trim();
    cfg.apiUrl = card.querySelector('.cfxApiUrl').value.trim();
    delete cfg._snapshot;
    cfg.collapsed = true;
    addLog('изменено', 'CopyFX', '');
    save().then(renderCopyfxConfig);
  });

  return card;
}

function renderUaRules() {
  const box = $('uaRulesList');
  if (!box) return;
  box.innerHTML = '';
  for (const ua of (state.uaRules || [])) {
    box.appendChild(ua.collapsed ? renderUaCollapsed(ua) : renderUaExpanded(ua));
  }
}

function renderUaCollapsed(ua) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed' + (ua.enabled === false ? ' rule-disabled' : '');
  const urls = ua.urls || [];
  const urlHtml = urls.length
    ? 'URL: <code>' + escapeText(urls[0]) + '</code>' + (urls.length > 1 ? ' <span class="extra-count">+' + (urls.length - 1) + '</span>' : '')
    : '';
  const datesParts = [];
  if (ua.createdAt) datesParts.push('создано ' + fmtDate(ua.createdAt));
  if (ua.updatedAt) datesParts.push('обновлено ' + fmtDate(ua.updatedAt));
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">UA</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">${escapeText(ua.name || '(без имени)')}${ua.enabled === false ? ' <span class="rc-off">ВЫКЛ</span>' : ''} <span class="rc-action-label">User-Agent</span></div>
          <div class="rule-collapsed-actions">
            <label class="rule-status-toggle" title="Вкл/Выкл"><input type="checkbox" class="uaEnabled" ${ua.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${ua.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
            <button class="small uaCopy" title="Копировать правило">Копия</button>
            <button class="small uaEdit" title="Редактировать">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">${urlHtml}</span>
          <span class="rc-col-match">${urls.length} сайт(ов)</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${escapeText(ua.userAgent ? (ua.userAgent.length > 80 ? ua.userAgent.slice(0, 80) + '…' : ua.userAgent) : '—')}</span>
          <span class="rc-dates">${datesParts.join(' · ')}</span>
        </div>
      </div>
    </div>`;
  card.querySelector('.uaEnabled').addEventListener('change', e => {
    ua.enabled = e.target.checked;
    card.classList.toggle('rule-disabled', !ua.enabled);
    card.querySelector('.toggle-label').textContent = ua.enabled ? 'ВКЛ' : 'ВЫКЛ';
    saveDebounced();
  });
  card.querySelector('.uaCopy').addEventListener('click', () => {
    const now = new Date().toISOString();
    const clone = deepClone(ua);
    clone.id = 'ua_' + Math.random().toString(36).slice(2, 10);
    clone.name = (ua.name || '') + ' (копия)';
    clone.collapsed = false;
    clone._isNew = true;
    clone.createdAt = now;
    clone.updatedAt = now;
    collapseAllExtras(clone);
    const idx = state.uaRules.indexOf(ua);
    state.uaRules.splice(idx + 1, 0, clone);
    addLog('копия', 'UA правило', clone.name);
    save().then(renderAllExtras);
  });
  card.querySelector('.uaEdit').addEventListener('click', () => { collapseAllExtras(ua); ua.collapsed = false; save().then(renderAllExtras); });
  return card;
}

function renderUaExpanded(ua) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  if (!Array.isArray(ua.urls)) ua.urls = ua.url ? [ua.url] : [''];
  if (!ua.urls.length) ua.urls = [''];
  const presetOptions = UA_PRESETS.map(p => '<option value="' + escapeAttr(p.value) + '">' + escapeText(p.label) + '</option>').join('');
  card.innerHTML = `
    <div class="rule-head">
      <input type="text" class="uaName grow" value="${escapeAttr(ua.name || '')}" placeholder="Название правила">
      <label class="rule-status-toggle shrink"><input type="checkbox" class="uaEnabledExp" ${ua.enabled !== false ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-label">${ua.enabled !== false ? 'ВКЛ' : 'ВЫКЛ'}</span></label>
      <button class="primary small uaCollapse" title="Сохранить и свернуть">✔ Готово</button>
      ${ua._isNew ? '<button class="small uaClose" title="Отменить создание">Закрыть</button>' : '<button class="small uaCancel" title="Свернуть без сохранения">Отменить</button>'}
      ${!ua._isNew ? '<button class="small danger uaDelete" title="Удалить правило">Удалить</button>' : ''}
    </div>
    <label>Сайты (подстрока URL — по одному на строку)</label>
    <div class="ua-urls-list"></div>
    <button class="small uaAddUrl" type="button" style="margin-top:4px">+ Добавить сайт</button>
    <p class="hint">Подстрока URL или паттерн с <code>*</code>. Примеры: <code>example.com</code> — весь домен, <code>shop.example.com/catalog</code> — только раздел, <code>*.example.com</code> — все поддомены.</p>
    <label>User-Agent строка</label>
    <div class="row" style="gap:8px">
      <select class="uaPreset shrink" style="max-width:200px"><option value="">— пресет —</option>${presetOptions}</select>
      <input type="text" class="uaValue grow" value="${escapeAttr(ua.userAgent || '')}" placeholder="Mozilla/5.0 ...">
    </div>
  `;

  const urlsBox = card.querySelector('.ua-urls-list');
  function drawUrls() {
    urlsBox.innerHTML = '';
    ua.urls.forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cssText = 'gap:6px;margin-bottom:4px';
      row.innerHTML = '<input type="text" class="uaUrlItem grow" value="' + escapeAttr(u) + '" placeholder="example.com">' +
        (ua.urls.length > 1 ? '<button class="btn-x small uaRemoveUrl" type="button" title="Убрать сайт">×</button>' : '');
      row.querySelector('.uaUrlItem').addEventListener('input', e => { ua.urls[i] = e.target.value; });
      const rm = row.querySelector('.uaRemoveUrl');
      if (rm) rm.addEventListener('click', () => { ua.urls.splice(i, 1); drawUrls(); });
      urlsBox.appendChild(row);
    });
  }
  drawUrls();
  card.querySelector('.uaAddUrl').addEventListener('click', () => { ua.urls.push(''); drawUrls(); });

  const nameInput = card.querySelector('.uaName');
  const valueInput = card.querySelector('.uaValue');
  const enabledCb = card.querySelector('.uaEnabledExp');
  const presetSel = card.querySelector('.uaPreset');

  presetSel.addEventListener('change', () => {
    if (presetSel.value) { valueInput.value = presetSel.value; presetSel.value = ''; }
  });
  enabledCb.addEventListener('change', () => {
    enabledCb.closest('.rule-status-toggle').querySelector('.toggle-label').textContent = enabledCb.checked ? 'ВКЛ' : 'ВЫКЛ';
  });

  if (!ua._isNew && !ua._snapshot) ua._snapshot = deepClone(ua);

  card.querySelector('.uaCollapse').addEventListener('click', () => {
    ua.name = nameInput.value.trim();
    ua.urls = ua.urls.map(u => u.trim()).filter(Boolean);
    delete ua.url;
    ua.userAgent = valueInput.value.trim();
    ua.enabled = enabledCb.checked;
    ua.updatedAt = new Date().toISOString();
    addLog(ua._isNew ? 'создано' : 'изменено', 'UA правило', ua.name);
    delete ua._isNew;
    delete ua._snapshot;
    ua.collapsed = true;
    save().then(renderUaRules);
  });

  if (ua._isNew) {
    card.querySelector('.uaClose').addEventListener('click', () => {
      state.uaRules = state.uaRules.filter(r => r !== ua);
      save().then(renderUaRules);
    });
  }

  if (!ua._isNew) {
    card.querySelector('.uaCancel').addEventListener('click', () => {
      if (ua._snapshot) Object.assign(ua, ua._snapshot);
      delete ua._snapshot;
      ua.collapsed = true;
      save().then(renderUaRules);
    });
    card.querySelector('.uaDelete').addEventListener('click', () => {
      const word = prompt('Для удаления правила «' + (ua.name || 'без имени') + '» введите слово "удалить":');
      if (word == null) return;
      if (word.trim().toLowerCase() !== 'удалить') { toast('Неверное слово — удаление отменено', 'error'); return; }
      addLog('удалено', 'UA правило', ua.name);
      state.uaRules = state.uaRules.filter(r => r !== ua);
      save().then(renderUaRules);
    });
  }

  return card;
}

$('addUaRule').addEventListener('click', () => {
  const now = new Date().toISOString();
  state.uaRules = state.uaRules || [];
  const ua = {
    id: 'ua_' + Math.random().toString(36).slice(2, 10),
    name: '', urls: [''], userAgent: '',
    enabled: true, collapsed: false, _isNew: true,
    createdAt: now, updatedAt: now
  };
  collapseAllExtras(ua);
  state.uaRules.push(ua);
  addLog('создано', 'UA правило', '');
  save().then(renderAllExtras);
});

/* ================================================================
   ================ SMART COUNTERS =================================
   ================================================================ */
$('addCounter').addEventListener('click', () => {
  const suggested = uniqueCounterName('customerId');
  state.smartCounters = state.smartCounters || [];
  const sc = {
    name: suggested, prefix: '', width: 5, current: 0,
    branches: [{ label: 'B', regex: 'www-\\d+', suffix: 'B' }],
    testUrl: '', history: [],
    collapsed: false, _isNew: true
  };
  collapseAllExtras(sc);
  state.smartCounters.push(sc);
  addLog('создано', 'инкрементор', suggested);
  save().then(renderAllExtras);
});
function uniqueCounterName(base) {
  const taken = new Set((state.smartCounters || []).map(x => x.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(base + i)) i++;
  return base + i;
}
function nextValueOf(sc, url) {
  const nextNum = (Number(sc.current) || 0) + 1;
  const width = Number(sc.width) || 0;
  const numStr = width > 0 ? String(nextNum).padStart(width, '0') : String(nextNum);
  const branches = Array.isArray(sc.branches) && sc.branches.length
    ? sc.branches
    : (sc.branchRegex ? [{ label: 'B', regex: sc.branchRegex, suffix: sc.branchSuffix || '' }] : []);
  let firedLabel = '';
  let suffix = '';
  if (url) {
    for (const b of branches) {
      if (!b.regex) continue;
      try {
        if (new RegExp(b.regex, 'i').test(url)) { suffix = b.suffix || ''; firedLabel = b.label || ''; break; }
      } catch (e) {}
    }
  }
  return {
    base:   (sc.prefix || '') + numStr,
    forUrl: (sc.prefix || '') + numStr + suffix,
    firedLabel,
    branches: branches.map(b => ({ label: b.label, suffix: b.suffix || '', preview: (sc.prefix || '') + numStr + (b.suffix || '') }))
  };
}
function renderCounters() {
  const box = $('counterList');
  box.innerHTML = '';
  const list = state.smartCounters || [];
  if (!list.length) { box.innerHTML = '<div class="empty">Пока нет инкременторов. Создайте первый.</div>'; return; }
  list.forEach((sc, idx) => box.appendChild(renderCounterCard(sc, idx)));
}
function renderCounterCard(sc, idx) {
  if (!Array.isArray(sc.branches)) {
    sc.branches = sc.branchRegex
      ? [{ label: sc.branchSuffix || 'B', regex: sc.branchRegex, suffix: sc.branchSuffix || '' }]
      : [];
    delete sc.branchRegex;
    delete sc.branchSuffix;
  }
  return sc.collapsed ? renderCounterCollapsed(sc, idx) : renderCounterExpanded(sc, idx);
}

function counterSummary(sc) {
  const next = nextValueOf(sc, '');
  const parts = [];
  parts.push('<span class="badge mono">{{seq:' + escapeText(sc.name || '') + '}}</span>');
  parts.push('следующий: <code>' + escapeText(next.base) + '</code>');
  if ((sc.branches || []).length) parts.push(sc.branches.length + ' домен(ов)');
  if ((sc.history || []).length) parts.push('<span class="mono">' + sc.history.length + ' в истории</span>');
  return parts.join(' <span class="conn">·</span> ');
}

function renderCounterCollapsed(sc, idx) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed';
  const nextVal = nextValueOf(sc, '').base;
  const branchCount = (sc.branches || []).length;
  const histCount = (sc.history || []).length;
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">seq</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">${escapeText(sc.name || '(без имени)')} <span class="rc-action-label">Инкрементор</span></div>
          <div class="rule-collapsed-actions">
            <button class="small scEdit" title="Редактировать инкрементор">✏ Изменить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url">${sc.prefix ? 'префикс: <code>' + escapeText(sc.prefix) + '</code>' : ''}</span>
          <span class="rc-col-match">${branchCount ? branchCount + ' домен(ов)' : ''}${histCount ? (branchCount ? ' <span class="conn">·</span> ' : '') + '<span class="mono">' + histCount + ' в истории</span>' : ''}</span>
        </div>
        <div class="rc-row3">
          <span class="rc-value mono">${escapeText(nextVal)}</span>
          <span class="rc-dates">текущее: ${sc.current || 0} · ширина: ${sc.width || 0}</span>
        </div>
      </div>
    </div>`;
  card.querySelector('.scEdit').addEventListener('click', () => { collapseAllExtras(sc); sc.collapsed = false; save().then(renderAllExtras); });
  return card;
}

function renderCounterExpanded(sc, idx) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  card.innerHTML = `
    <div class="rule-head">
      <input type="text" class="scName" value="${escapeAttr(sc.name || '')}" placeholder="имя (для {{seq:имя}})">
      <span class="chip mono">{{seq:<span class="scChipName">${escapeText(sc.name || '')}</span>}}</span>
      <button class="primary small scCollapse" title="Сохранить и свернуть">✔ Готово</button>
      ${sc._isNew ? '<button class="small scClose" title="Отменить создание инкрементора">Закрыть</button>' : '<button class="small scCancel" title="Свернуть без сохранения">Отменить</button>'}
    </div>
    <div class="row">
      <div class="shrink" style="flex:0 0 140px"><label>Префикс</label><input type="text" class="scPrefix" value="${escapeAttr(sc.prefix || '')}" placeholder="Szv"></div>
      <div class="shrink" style="flex:0 0 110px"><label>Ширина числа</label><input type="number" min="0" max="12" class="scWidth" value="${escapeAttr(sc.width || 0)}"></div>
      <div class="shrink" style="flex:0 0 140px"><label>Текущее значение</label><input type="number" class="scCurrent" value="${escapeAttr(sc.current || 0)}"></div>
      <div class="grow"><label>Что вставится следующим</label><div class="preview scPreviewBoth">—</div></div>
    </div>
    <label>Домены — до 3 regex-правил по URL, первое совпадение выигрывает</label>
    <div class="branches-list"></div>
    <button class="small scAddBranch" style="margin-top:6px" type="button" title="Добавить домен (regex URL + суффикс)">+ Домен</button>
    <label>Тестовый URL для превью</label>
    <div class="row">
      <input type="text" class="scTestUrl grow" value="${escapeAttr(sc.testUrl || previewUrl || '')}" placeholder="https://app.example.com/www-1234/customer">
      <span class="chip shrink scTestBadge">—</span>
    </div>
    <div class="preview scTestOut">—</div>
    <div class="row" style="margin-top:8px">
      <button class="small scInc shrink">▶ Инкрементировать сейчас</button>
      <button class="small scResetHist shrink ghost">очистить историю</button>
      <button class="ghost small scToggleHist shrink">История (${(sc.history || []).length})</button>
      <span></span>
    </div>
    <div class="scHistoryBox" style="display:none;margin-top:8px">
      <table class="tokens" style="margin:0">
        <thead><tr><th>Значение</th><th>Домен</th><th>URL</th><th>Когда</th></tr></thead>
        <tbody class="scHistBody"></tbody>
      </table>
    </div>`;

  const refresh = () => {
    const url = card.querySelector('.scTestUrl').value;
    const next = nextValueOf(sc, url);
    const branchesHtml = next.branches.length
      ? next.branches.map(b => `<b>${escapeText(b.label || '—')}</b>: <span style="color:var(--primary)">${escapeText(b.preview)}</span>`).join(' · ')
      : '<span style="color:var(--text-mute)">доменов нет</span>';
    card.querySelector('.scPreviewBoth').innerHTML = '<b>основной:</b> <span style="color:var(--text)">' + escapeText(next.base) + '</span> · ' + branchesHtml;
    card.querySelector('.scTestOut').innerHTML = 'Для этого URL → <b>' + escapeText(next.forUrl) + '</b>' + (next.firedLabel ? ' (домен: ' + escapeText(next.firedLabel) + ')' : ' (основной)');
    card.querySelector('.scTestBadge').textContent = next.firedLabel || 'main';
    card.querySelector('.scChipName').textContent = sc.name || '';
    const addBtn = card.querySelector('.scAddBranch');
    if (addBtn) addBtn.disabled = (sc.branches || []).length >= 3;
  };

  function renderBranches() {
    const box = card.querySelector('.branches-list');
    box.innerHTML = '';
    (sc.branches || []).forEach((b, idx) => {
      const row = document.createElement('div');
      row.className = 'cond-row';
      row.innerHTML = `
        <div class="row" style="margin:0">
          <input type="text" class="scBrLabel shrink" value="${escapeAttr(b.label || '')}" style="flex:0 0 90px" placeholder="метка" title="Метка домена (M, B, X…)">
          <input type="text" class="scBrRegex grow" value="${escapeAttr(b.regex || '')}" placeholder="regex URL (напр. www-\\d+)" title="Regex — если URL совпадает (без учёта регистра), применяем суффикс">
          <input type="text" class="scBrSuffix shrink" value="${escapeAttr(b.suffix || '')}" style="flex:0 0 90px" placeholder="суффикс" title="Что дописать после числа">
          <button class="btn-x small scBrDel" title="Удалить домен">×</button>
        </div>`;
      row.querySelector('.scBrLabel').addEventListener('input', e => { b.label = e.target.value; refresh(); saveDebounced(); });
      row.querySelector('.scBrRegex').addEventListener('input', e => { b.regex = e.target.value; refresh(); saveDebounced(); });
      row.querySelector('.scBrSuffix').addEventListener('input', e => { b.suffix = e.target.value; refresh(); saveDebounced(); });
      row.querySelector('.scBrDel').addEventListener('click', () => {
        sc.branches.splice(idx, 1);
        renderBranches();
        refresh();
        save();
      });
      box.appendChild(row);
    });
  }

  if (!sc._isNew && !sc._snapshot) {
    sc._snapshot = deepClone(sc);
  }
  card.querySelector('.scCollapse').addEventListener('click', () => {
    addLog(sc._isNew ? 'создано' : 'изменено', 'инкрементор', sc.name);
    autoSnapshot('инкрементор: ' + (sc.name || sc.id));
    if (state.authorName) {
      if (!sc.createdBy) sc.createdBy = state.authorName;
      sc.modifiedBy = state.authorName;
    }
    delete sc._isNew;
    delete sc._snapshot;
    sc.collapsed = true;
    save().then(renderCounters);
  });
  if (sc._isNew) {
    card.querySelector('.scClose').addEventListener('click', () => {
      state.smartCounters = state.smartCounters.filter(x => x !== sc);
      save().then(renderCounters);
    });
  } else {
    card.querySelector('.scCancel').addEventListener('click', () => {
      if (sc._snapshot) Object.assign(sc, sc._snapshot);
      delete sc._snapshot;
      sc.collapsed = true;
      save().then(renderCounters);
    });
  }
  card.querySelector('.scAddBranch').addEventListener('click', () => {
    if ((sc.branches || []).length >= 3) { toast('Максимум 3 домена', 'error'); return; }
    sc.branches = sc.branches || [];
    sc.branches.push({ label: '', regex: '', suffix: '' });
    renderBranches();
    refresh();
    save();
  });
  const nameEl = card.querySelector('.scName');
  nameEl.addEventListener('input', (e) => {
    const clean = e.target.value.replace(/[\s:{}|]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
    sc.name = clean; refresh(); saveDebounced();
  });
  const inputs = {
    scPrefix:    (v) => sc.prefix = v,
    scWidth:     (v) => sc.width = parseInt(v, 10) || 0,
    scCurrent:   (v) => sc.current = parseInt(v, 10) || 0,
    scTestUrl:   (v) => sc.testUrl = v
  };
  for (const cls of Object.keys(inputs)) {
    card.querySelector('.' + cls).addEventListener('input', (e) => { inputs[cls](e.target.value); refresh(); saveDebounced(); });
  }
  card.querySelector('.scInc').addEventListener('click', () => {
    const url = card.querySelector('.scTestUrl').value || '';
    const ctx = { smartCounters: state.smartCounters, customWordLists: state.customWordLists || [], url, dryRun: false, counters: {} };
    window.FF.render('{{seq:' + sc.name + '}}', ctx);
    card.querySelector('.scCurrent').value = sc.current;
    save().then(() => { renderCounterHistory(card, sc); refresh(); });
  });
  card.querySelector('.scResetHist').addEventListener('click', () => {
    if (!confirm('Очистить историю инкрементора?')) return;
    sc.history = []; save().then(() => renderCounterHistory(card, sc));
  });
  card.querySelector('.scToggleHist').addEventListener('click', () => {
    const box = card.querySelector('.scHistoryBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  });
  renderBranches();
  renderCounterHistory(card, sc);
  refresh();
  return card;
}
function renderCounterHistory(card, sc) {
  const body = card.querySelector('.scHistBody');
  body.innerHTML = '';
  const hist = sc.history || [];
  if (!hist.length) {
    body.innerHTML = '<tr><td colspan="4" style="color:var(--text-mute);text-align:center">— пусто —</td></tr>';
  } else {
    for (const h of hist) {
      const tr = document.createElement('tr');
      const when = h.at ? new Date(h.at).toISOString().slice(0, 19).replace('T', ' ') : '';
      tr.innerHTML = '<td><code>' + escapeText(h.value) + '</code></td>' +
        '<td class="mono" style="color:var(--primary);text-align:center">' + escapeText(h.branch || '—') + '</td>' +
        '<td style="max-width:340px;word-break:break-all"><span class="mono" style="color:var(--text-subtle)">' + escapeText(h.url || '') + '</span></td>' +
        '<td class="mono" style="color:var(--text-subtle)">' + escapeText(when) + '</td>';
      body.appendChild(tr);
    }
  }
  card.querySelector('.scToggleHist').textContent = 'История (' + hist.length + ')';
}

/* ================================================================
   ================ PAGE SHORTCUTS =================================
   ================================================================ */
const SHORTCUT_ACTIONS = [
  { key: '',                      label: '— выбрать действие —' },
  { key: 'FILL_ALL',              label: 'Заполнить все поля (fill-all)' },
  { key: 'FILL_SPECIAL',          label: 'Спец. вставка по текущему URL' },
  { key: 'FILL_INSERTION_BY_ID',  label: 'Конкретная спец. вставка →' }
];

function formatCombo(sc) {
  const parts = [];
  if (sc.ctrl)  parts.push('Ctrl');
  if (sc.alt)   parts.push('Alt');
  if (sc.shift) parts.push('Shift');
  if (sc.meta)  parts.push('Meta');
  if (sc.key)   parts.push(sc.key);
  return parts.length ? parts.join(' + ') : '(не задано)';
}

function renderPageShortcuts() {
  const box = $('pageShortcutsList');
  if (!box) return;
  box.innerHTML = '';
  const insertions = state.specialInsertions || [];
  const list = state.pageShortcuts || [];
  if (!list.length) {
    box.innerHTML = '<div class="hint">Пока пусто.</div>';
    return;
  }
  list.forEach((sc) => {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    const insOptions = insertions.map(i =>
      `<option value="${i.id}" ${sc.targetId === i.id ? 'selected' : ''}>${escapeText(i.name || '(без имени)')}</option>`
    ).join('');
    row.innerHTML = `
      <button class="small shortcut-capture">${escapeText(formatCombo(sc))}</button>
      <select class="shortcut-action">
        ${SHORTCUT_ACTIONS.map(a => `<option value="${a.key}" ${sc.action === a.key ? 'selected' : ''}>${escapeText(a.label)}</option>`).join('')}
      </select>
      <select class="shortcut-target" ${sc.action === 'FILL_INSERTION_BY_ID' ? '' : 'disabled'}>
        <option value="">— вставка не выбрана —</option>
        ${insOptions}
      </select>
      <button class="btn-x small shortcut-del" title="Удалить шорткей">×</button>
    `;
    row.querySelector('.shortcut-capture').addEventListener('click', (e) => captureShortcut(e.currentTarget, sc));
    row.querySelector('.shortcut-action').addEventListener('change', (e) => {
      sc.action = e.target.value;
      row.querySelector('.shortcut-target').disabled = (sc.action !== 'FILL_INSERTION_BY_ID');
      if (sc.action !== 'FILL_INSERTION_BY_ID') sc.targetId = '';
      saveDebounced();
    });
    row.querySelector('.shortcut-target').addEventListener('change', (e) => { sc.targetId = e.target.value; saveDebounced(); });
    row.querySelector('.shortcut-del').addEventListener('click', () => {
      state.pageShortcuts = state.pageShortcuts.filter(x => x !== sc);
      save().then(renderPageShortcuts);
    });
    box.appendChild(row);
  });
}

function captureShortcut(btn, sc) {
  const oldText = btn.textContent;
  btn.textContent = 'Нажмите клавиши… (Esc — отмена)';
  btn.classList.add('capturing');
  const handler = (e) => {
    if (e.key === 'Escape') {
      btn.textContent = oldText;
      btn.classList.remove('capturing');
      window.removeEventListener('keydown', handler, true);
      return;
    }
    // игнорируем чистые модификаторы
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    sc.ctrl  = e.ctrlKey;
    sc.alt   = e.altKey;
    sc.shift = e.shiftKey;
    sc.meta  = e.metaKey;
    sc.key   = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    btn.textContent = formatCombo(sc);
    btn.classList.remove('capturing');
    window.removeEventListener('keydown', handler, true);
    saveDebounced();
  };
  window.addEventListener('keydown', handler, true);
}

$('addPageShortcut').addEventListener('click', () => {
  state.pageShortcuts = state.pageShortcuts || [];
  state.pageShortcuts.push({ id: uid(), ctrl: true, alt: false, shift: false, meta: false, key: '', action: '', targetId: '' });
  save().then(renderPageShortcuts);
});

/* ================================================================
   ================ CUSTOM WORD LISTS ==============================
   ================================================================ */
function renderWordLists() {
  const box = $('wordListsBox');
  if (!box) return;
  box.innerHTML = '';
  const lists = state.customWordLists || [];
  if (!lists.length) {
    box.innerHTML = '<div class="empty">Пока нет списков. Создайте первый.</div>';
    return;
  }
  lists.forEach(wl => box.appendChild(wl.collapsed ? renderWordListCollapsed(wl) : renderWordListExpanded(wl)));
}

function wordListWordCount(wl) {
  if (!wl.words) return 0;
  return wl.words.split(/[\n,]+/).map(w => w.trim()).filter(Boolean).length;
}

function renderWordListCollapsed(wl) {
  const card = document.createElement('div');
  card.className = 'rule-card collapsed';
  const count = wordListWordCount(wl);
  card.innerHTML = `
    <div class="rule-collapsed">
      <div class="rc-col-type"><span class="badge rc-badge">list</span></div>
      <div class="rc-body">
        <div class="rc-row1">
          <div class="rc-name-text">${escapeText(wl.name || '(без имени)')} <span class="rc-action-label">Список слов</span></div>
          <div class="rule-collapsed-actions">
            <button class="small wlEdit" title="Редактировать список">✏ Изменить</button>
            <button class="small danger wlDel" title="Удалить список">Удалить</button>
          </div>
        </div>
        <div class="rc-row2">
          <span class="rc-col-url"><span class="badge mono">{{list:${escapeText(wl.name || '')}}}</span></span>
          <span class="rc-col-match">${count} слов</span>
        </div>
      </div>
    </div>`;
  card.querySelector('.wlEdit').addEventListener('click', () => { collapseAllExtras(wl); wl.collapsed = false; save().then(renderAllExtras); });
  card.querySelector('.wlDel').addEventListener('click', () => {
    const word = prompt('Для удаления списка «' + (wl.name || 'без имени') + '» введите слово "удалить":');
    if (word == null) return;
    if (word.trim().toLowerCase() !== 'удалить') { toast('Неверное слово — удаление отменено', 'error'); return; }
    state.customWordLists = (state.customWordLists || []).filter(x => x.id !== wl.id);
    save().then(() => { renderWordLists(); toast('Список удалён', 'ok'); });
  });
  return card;
}

function renderWordListExpanded(wl) {
  const card = document.createElement('div');
  card.className = 'rule-card expanded';
  card.innerHTML = `
    <div class="rule-head">
      <input type="text" class="wlName" value="${escapeAttr(wl.name || '')}" placeholder="имя списка (для {{list:имя}})">
      <span class="chip mono">{{list:<span class="wlChipName">${escapeText(wl.name || '')}</span>}}</span>
      <button class="primary small wlCollapse" title="Сохранить и свернуть">✔ Готово</button>
      ${wl._isNew ? '<button class="small wlClose" title="Отменить создание списка">Закрыть</button>' : '<button class="small wlCancel" title="Свернуть без сохранения">Отменить</button>'}
      <button class="small danger wlDelete" title="Удалить список">Удалить</button>
    </div>
    <label>Слова (по одному в строке или через запятую)</label>
    <textarea class="wlWords" rows="8" placeholder="apple&#10;banana&#10;cherry">${escapeText(wl.words || '')}</textarea>
    <div class="hint wlCount">${wordListWordCount(wl)} слов</div>
  `;
  const nameEl = card.querySelector('.wlName');
  nameEl.addEventListener('input', e => {
    const clean = e.target.value.replace(/[\s:{}|]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
    wl.name = clean;
    card.querySelector('.wlChipName').textContent = wl.name || '';
    saveDebounced();
  });
  card.querySelector('.wlWords').addEventListener('input', e => {
    wl.words = e.target.value;
    card.querySelector('.wlCount').textContent = wordListWordCount(wl) + ' слов';
    saveDebounced();
  });
  if (!wl._isNew && !wl._snapshot) {
    wl._snapshot = deepClone(wl);
  }
  card.querySelector('.wlCollapse').addEventListener('click', () => {
    addLog(wl._isNew ? 'создано' : 'изменено', 'список слов', wl.name);
    autoSnapshot('список: ' + (wl.name || wl.id));
    delete wl._isNew;
    delete wl._snapshot;
    wl.collapsed = true;
    save().then(renderWordLists);
  });
  if (wl._isNew) {
    card.querySelector('.wlClose').addEventListener('click', () => {
      state.customWordLists = (state.customWordLists || []).filter(x => x.id !== wl.id);
      save().then(renderWordLists);
    });
  } else {
    card.querySelector('.wlCancel').addEventListener('click', () => {
      if (wl._snapshot) Object.assign(wl, wl._snapshot);
      delete wl._snapshot;
      wl.collapsed = true;
      save().then(renderWordLists);
    });
  }
  card.querySelector('.wlDelete').addEventListener('click', () => {
    const word = prompt('Для удаления списка «' + (wl.name || 'без имени') + '» введите слово "удалить":');
    if (word == null) return;
    if (word.trim().toLowerCase() !== 'удалить') { toast('Неверное слово — удаление отменено', 'error'); return; }
    addLog('удалено', 'список слов', wl.name);
    state.customWordLists = (state.customWordLists || []).filter(x => x.id !== wl.id);
    save().then(() => { renderWordLists(); toast('Список удалён', 'ok'); });
  });
  return card;
}

$('addWordList').addEventListener('click', () => {
  state.customWordLists = state.customWordLists || [];
  const wl = { id: uid(), name: '', words: '', collapsed: false, _isNew: true };
  collapseAllExtras(wl);
  state.customWordLists.push(wl);
  addLog('создано', 'список слов', '');
  save().then(renderAllExtras);
});

function ensurePresetWordLists() {
  const presets = window.FF && window.FF.presetLists;
  if (!presets) return false;
  state.customWordLists = state.customWordLists || [];
  const existingNames = new Set(state.customWordLists.map(w => w.name));
  const entries = [
    { name: 'english_words',  data: presets.english_words }
  ];
  let added = 0;
  for (const e of entries) {
    if (!e.data || existingNames.has(e.name)) continue;
    state.customWordLists.push({
      id: uid(), name: e.name, words: e.data.join('\n'), collapsed: true
    });
    added++;
  }
  return added > 0;
}

function openManageWordLists() {
  const modal = $('manageWordListsModal');
  const list = $('mwList');
  list.innerHTML = '';
  const items = state.customWordLists || [];
  if (!items.length) {
    list.innerHTML = '<div class="empty">Списков нет.</div>';
  } else {
    items.forEach(wl => {
      const row = document.createElement('label');
      row.className = 'mm-row';
      row.innerHTML = `
        <input type="checkbox" class="mm-cb" data-id="${wl.id}">
        <div class="mm-info">
          <div class="mm-name">${escapeText(wl.name || '(без имени)')}</div>
          <div class="mm-meta">{{list:${escapeText(wl.name || '')}}} · ${wordListWordCount(wl)} слов</div>
        </div>`;
      list.appendChild(row);
    });
  }
  modal.classList.add('open');
}
$('manageWordLists').addEventListener('click', openManageWordLists);
$('mwClose').addEventListener('click', () => $('manageWordListsModal').classList.remove('open'));
$('mwDone').addEventListener('click', () => $('manageWordListsModal').classList.remove('open'));
$('mwSelectAll').addEventListener('click', () => $$('.mm-cb', $('mwList')).forEach(cb => cb.checked = true));
$('mwDeselectAll').addEventListener('click', () => $$('.mm-cb', $('mwList')).forEach(cb => cb.checked = false));
$('mwDeleteSelected').addEventListener('click', () => {
  const ids = $$('.mm-cb:checked', $('mwList')).map(cb => cb.dataset.id);
  if (!ids.length) { toast('Ничего не выбрано', 'error'); return; }
  if (!confirm('Удалить ' + ids.length + ' списков? Действие необратимо.')) return;
  const idSet = new Set(ids);
  addLog('удалено (' + ids.length + ')', 'списки слов', 'массовое');
  state.customWordLists = (state.customWordLists || []).filter(x => !idSet.has(x.id));
  save().then(() => { openManageWordLists(); renderWordLists(); toast('Удалено списков: ' + ids.length, 'ok'); });
});

/* ================================================================
   ================ GLOBAL COUNTERS =================================
   ================================================================ */
function renderGlobalCounters() {
  const box = $('globalCountersBox');
  if (!box) return;
  box.innerHTML = '';
  const c = state.counters || {};
  const keys = Object.keys(c);
  if (!keys.length) { box.innerHTML = '<div class="hint">Пока пусто. Появятся, когда шаблон с <code>{{counter}}</code> будет использован.</div>'; return; }
  const table = document.createElement('table');
  table.className = 'tokens';
  table.innerHTML = '<thead><tr><th>Имя</th><th>Значение</th><th></th></tr></thead><tbody></tbody>';
  const tb = table.querySelector('tbody');
  for (const k of keys) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><code>' + escapeText(k) + '</code></td>' +
      '<td><input type="number" class="cvInput" style="width:120px" value="' + escapeAttr(c[k]) + '"></td>' +
      '<td><button class="btn-x small cvDel" title="Удалить счётчик">×</button></td>';
    tr.querySelector('.cvInput').addEventListener('input', (e) => { state.counters[k] = parseInt(e.target.value, 10) || 0; saveDebounced(); });
    tr.querySelector('.cvDel').addEventListener('click', () => { delete state.counters[k]; save().then(renderGlobalCounters); });
    tb.appendChild(tr);
  }
  box.appendChild(table);
}

/* ================================================================
   ================ SNAPSHOTS ======================================
   ================================================================ */
function renderSnapshots() {
  const box = $('snapList');
  const autoBox = $('snapAutoList');
  const autoHeading = $('snapAutoHeading');
  box.innerHTML = '';
  autoBox.innerHTML = '';
  const snaps = state.snapshots || [];
  const manualSnaps = snaps.filter(s => !s.auto);
  const autoSnaps = snaps.filter(s => s.auto);

  if (!manualSnaps.length) { box.innerHTML = '<div class="empty">Пока нет сохранённых версий.</div>'; }
  manualSnaps.slice().reverse().forEach(snap => box.appendChild(buildSnapRow(snap)));

  autoHeading.style.display = autoSnaps.length ? '' : 'none';
  autoSnaps.slice().reverse().forEach(snap => autoBox.appendChild(buildSnapRow(snap)));
}

function buildSnapRow(snap) {
  const row = document.createElement('div');
  row.className = 'snap-row' + (snap.auto ? ' snap-auto' : '');
  const iso = fmtDate(snap.createdAt);
  const snapSize = new Blob([JSON.stringify(snap.data)]).size;
  const sizeLabel = snapSize < 1024 ? snapSize + ' B' : snapSize < 1048576 ? (snapSize / 1024).toFixed(1) + ' KB' : (snapSize / 1048576).toFixed(1) + ' MB';
  row.innerHTML = `
    <button class="snap-star ${snap.starred ? 'on' : ''}" title="Пометить как важную">${snap.starred ? '★' : '☆'}</button>
    <div class="snap-name">
      <input type="text" class="snapName" value="${escapeAttr(snap.name || '')}">
      <div class="snap-meta">${iso} • правил: ${(snap.data?.rules || []).length} • папок: ${(snap.data?.folders || []).length} • вставок: ${(snap.data?.specialInsertions || []).length} • списков: ${(snap.data?.customWordLists || []).length} • ${sizeLabel}</div>
    </div>
    <div class="snap-meta">${iso}</div>
    <div class="snap-actions">
      <button class="small snapDl">⬇ JSON</button>
      <button class="small snapRestore">↺ Восстановить</button>
      <button class="small snapDel">×</button>
    </div>`;
  row.querySelector('.snap-star').addEventListener('click', () => { snap.starred = !snap.starred; save().then(renderSnapshots); });
  row.querySelector('.snapName').addEventListener('input', (e) => { snap.name = e.target.value; saveDebounced(); });
  row.querySelector('.snapDl').addEventListener('click', () => { downloadJSON(snap.data, 'dpi-' + safeName(snap.name || 'version') + '.json'); });
  row.querySelector('.snapRestore').addEventListener('click', () => {
    if (!confirm('Заменить текущее состояние на «' + snap.name + '»? Текущие настройки будут перезаписаны.')) return;
    const preservedSnaps = state.snapshots;
    const preservedShortcuts = state.pageShortcuts;
    state = migrateShape(deepClone(snap.data));
    state.snapshots = preservedSnaps;
    if (preservedShortcuts && preservedShortcuts.length) state.pageShortcuts = preservedShortcuts;
    markStructureDirty();
    save().then(renderAll);
  });
  row.querySelector('.snapDel').addEventListener('click', () => {
    if (snap.starred) {
      toast('Версия «' + (snap.name || '') + '» помечена звёздочкой — снимите ★, чтобы удалить.', 'error');
      return;
    }
    if (!confirm('Удалить версию «' + (snap.name || '') + '»?\nДействие необратимо.')) return;
    if (!confirm('Подтвердите ещё раз: удалить версию?')) return;
    state.snapshots = state.snapshots.filter(s => s.id !== snap.id);
    save().then(() => { renderSnapshots(); toast('Версия удалена.', 'ok'); });
  });
  return row;
}

function stripTransientSnap(obj) {
  const copy = deepClone(obj);
  delete copy.snapshots;
  for (const arr of [copy.rules, copy.specialInsertions, copy.smartCounters, copy.customWordLists]) {
    if (!Array.isArray(arr)) continue;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]._isNew) { arr.splice(i, 1); continue; }
      delete arr[i]._snapshot; delete arr[i]._isNew;
    }
  }
  return copy;
}

function autoSnapshot(reason) {
  state.snapshots = state.snapshots || [];
  const dataCopy = stripTransientSnap(state);
  const autoSnaps = state.snapshots.filter(s => s.auto);
  while (autoSnaps.length >= AUTO_SNAP_LIMIT) {
    const oldest = autoSnaps.shift();
    state.snapshots = state.snapshots.filter(s => s.id !== oldest.id);
  }
  state.snapshots.push({
    id: uid(),
    name: '⏱ ' + (reason || 'авто'),
    createdAt: new Date().toISOString(),
    starred: false,
    auto: true,
    data: dataCopy
  });
}

$('saveSnapshot').addEventListener('click', () => {
  const name = prompt('Название версии:', 'Снапшот ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
  if (name === null) return;
  const dataCopy = stripTransientSnap(state);
  state.snapshots = state.snapshots || [];
  state.snapshots.push({ id: uid(), name: name.trim() || 'Без имени', createdAt: new Date().toISOString(), starred: false, auto: false, data: dataCopy });
  const manualSnaps = state.snapshots.filter(s => !s.auto);
  while (manualSnaps.length > SNAP_LIMIT) {
    const oldest = manualSnaps.find(s => !s.starred);
    if (!oldest) { alert('Все ' + SNAP_LIMIT + ' версий помечены звёздочкой. Удалите одну вручную.'); state.snapshots.pop(); renderSnapshots(); return; }
    state.snapshots = state.snapshots.filter(s => s.id !== oldest.id);
    manualSnaps.splice(manualSnaps.indexOf(oldest), 1);
  }
  save().then(renderSnapshots);
});

/* ================================================================
   ================ BACKUP =========================================
   ================================================================ */
$('exportBtn').addEventListener('click', () => {
  const exportData = deepClone(state);
  function stripTransient(arr) {
    if (!Array.isArray(arr)) return;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]._isNew) { arr.splice(i, 1); continue; }
      delete arr[i]._snapshot;
      delete arr[i]._isNew;
    }
  }
  stripTransient(exportData.rules);
  stripTransient(exportData.specialInsertions);
  stripTransient(exportData.smartCounters);
  stripTransient(exportData.customWordLists);
  downloadJSON(exportData, 'dpi-backup-' + tsForFilename() + '.json');
  $('backupStatus').textContent = 'Файл скачан.';
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = migrateShape(JSON.parse(await file.text()));
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    if (mode === 'replace') {
      state = data;
      markStructureDirty();
    } else {
      markStructureDirty();
      // merge folders (по имени)
      state.folders = state.folders || [];
      const nameToId = new Map(state.folders.map(f => [f.name, f.id]));
      const folderRemap = new Map();
      for (const f of (data.folders || [])) {
        if (nameToId.has(f.name)) { folderRemap.set(f.id, nameToId.get(f.name)); continue; }
        const nf = { ...f, id: 'f_' + uid() };
        folderRemap.set(f.id, nf.id);
        state.folders.push(nf);
      }
      // merge rules
      const existingIds = new Set(state.rules.map(r => r.id));
      for (const r of (data.rules || [])) {
        if (existingIds.has(r.id)) r.id = 'r_' + uid();
        if (r.folderId && folderRemap.has(r.folderId)) r.folderId = folderRemap.get(r.folderId);
        state.rules.push(r);
      }
      // special insertions
      for (const ins of (data.specialInsertions || [])) {
        state.specialInsertions = state.specialInsertions || [];
        state.specialInsertions.push({ ...ins, id: uid() });
      }
      // smart counters
      state.smartCounters = state.smartCounters || [];
      const takenNames = new Set(state.smartCounters.map(x => x.name));
      for (const sc of (data.smartCounters || [])) {
        if (takenNames.has(sc.name)) sc.name = uniqueCounterName(sc.name);
        takenNames.add(sc.name);
        state.smartCounters.push(sc);
      }
      // counters
      state.counters = state.counters || {};
      for (const k of Object.keys(data.counters || {})) {
        state.counters[k] = Math.max(state.counters[k] || 0, data.counters[k]);
      }
      // custom word lists
      state.customWordLists = state.customWordLists || [];
      const wlNames = new Set(state.customWordLists.map(x => x.name));
      for (const wl of (data.customWordLists || [])) {
        if (!wlNames.has(wl.name)) {
          state.customWordLists.push({ ...wl, id: uid() });
          wlNames.add(wl.name);
        }
      }
      // Page shortcuts — merge по key+action, чтобы не задваивать
      state.pageShortcuts = state.pageShortcuts || [];
      const key = sc => (sc.ctrl?'C':'') + (sc.alt?'A':'') + (sc.shift?'S':'') + (sc.meta?'M':'') + '+' + (sc.key || '') + '@' + (sc.action || '');
      const existing = new Set(state.pageShortcuts.map(key));
      for (const sc of (data.pageShortcuts || [])) {
        if (!existing.has(key(sc))) state.pageShortcuts.push({ ...sc, id: uid() });
      }
      // Snapshots
      state.snapshots = state.snapshots || [];
      const snapNames = new Set(state.snapshots.map(s => s.name + '|' + s.createdAt));
      for (const snap of (data.snapshots || [])) {
        const snapKey = snap.name + '|' + snap.createdAt;
        if (!snapNames.has(snapKey)) {
          state.snapshots.push({ ...snap, id: uid() });
          snapNames.add(snapKey);
        }
      }
    }
    await save();
    $('backupStatus').textContent = 'Импорт завершён.';
    renderAll();
  } catch (err) {
    $('backupStatus').textContent = 'Ошибка чтения файла: ' + err.message;
  }
  e.target.value = '';
});

/* ================ Reset ================ */
$('resetConfirmInput').addEventListener('input', (e) => { $('resetBtn').disabled = e.target.value.trim() !== 'УДАЛИТЬ'; });
$('resetBtn').addEventListener('click', async () => {
  if ($('resetConfirmInput').value.trim() !== 'УДАЛИТЬ') return;
  if (!confirm('Точно сбросить настройки? Правила, вставки, инкременторы, списки слов — всё удалится. Версии останутся.')) return;
  if (!confirm('Последнее предупреждение. Отменить действие будет невозможно.')) return;
  const savedSnapshots = JSON.parse(JSON.stringify(state.snapshots || []));
  await new Promise(r => chrome.storage.local.remove(['state'], r));
  state = migrateShape(null);
  state.snapshots = savedSnapshots;
  await save();
  location.reload();
});

/* ================ Shortcuts & version ================ */
const shortcutsLink = document.getElementById('openShortcutsPage');
if (shortcutsLink) {
  shortcutsLink.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); });
}
try {
  const manifest = chrome.runtime.getManifest();
  const v = document.getElementById('aboutVersion');
  if (v) v.textContent = manifest.version;
} catch (e) {}

/* ================ Debug mode ================ */
$('debugModeToggle').addEventListener('change', (e) => {
  state.debugMode = e.target.checked;
  save();
});

$$('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => {
    if (e.target === bd) bd.classList.remove('open');
  });
});

/* ================ Author Name & Activity Log ================ */
const LOG_LIMIT = 100;

function addLog(action, target, name) {
  if (!Array.isArray(state.activityLog)) state.activityLog = [];
  state.activityLog.unshift({
    at: new Date().toISOString(),
    author: state.authorName || '',
    action,
    target,
    name: name || ''
  });
  if (state.activityLog.length > LOG_LIMIT) state.activityLog.length = LOG_LIMIT;
}

function renderActivityLog() {
  const box = $('activityLogBox');
  if (!box) return;
  const log = state.activityLog || [];
  if (!log.length) { box.innerHTML = '<div class="hint">Пока нет записей.</div>'; return; }
  const rows = log.map(e =>
    '<tr>' +
    '<td class="mono" style="font-size:11px;white-space:nowrap;color:var(--text-mute)">' + fmtDate(e.at) + '</td>' +
    '<td>' + escapeText(e.author || '—') + '</td>' +
    '<td>' + escapeText(e.action) + '</td>' +
    '<td>' + escapeText(e.target) + '</td>' +
    '<td>' + escapeText(e.name) + '</td>' +
    '</tr>'
  ).join('');
  box.innerHTML = '<table class="tokens"><thead><tr><th>Дата</th><th>Автор</th><th>Действие</th><th>Тип</th><th>Название</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function renderProfile() {
  const display = $('profileNameDisplay');
  const input = $('profileNameInput');
  const setBtn = $('profileNameSet');
  const editBtn = $('profileNameEdit');
  if (!display) return;

  const name = state.authorName || '';
  if (name) {
    display.textContent = name;
    display.style.display = '';
    input.style.display = 'none';
    setBtn.style.display = 'none';
    editBtn.style.display = '';
  } else {
    display.style.display = 'none';
    input.style.display = '';
    input.value = '';
    setBtn.style.display = '';
    editBtn.style.display = 'none';
  }
  renderActivityLog();
}

$('profileNameSet').addEventListener('click', () => {
  const val = $('profileNameInput').value.trim();
  if (!val) return;
  state.authorName = val;
  save().then(renderProfile);
});

$('profileNameEdit').addEventListener('click', () => {
  $('profileNameDisplay').style.display = 'none';
  $('profileNameEdit').style.display = 'none';
  const input = $('profileNameInput');
  input.value = state.authorName || '';
  input.style.display = '';
  $('profileNameSet').style.display = '';
  input.focus();
});


/* ================ Init ================ */
function renderAll() {
  renderFolders();
  renderScraperConfig();
  renderCopyfxConfig();
  renderUaRules();
  renderSpecial();
  renderCounters();
  renderSnapshots();
  renderGlobalCounters();
  renderPageShortcuts();
  renderWordLists();
  renderProfile();
  $('debugModeToggle').checked = !!state.debugMode;
}

async function grabPreviewUrl() {
  try {
    const tabs = await chrome.tabs.query({});
    const web = tabs.filter(t => t.url && /^https?:/.test(t.url));
    web.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    if (web[0]) previewUrl = web[0].url;
  } catch (e) {}
}

grabPreviewUrl().then(load).then(() => {
  cleanupUnsaved();
  collapseAllExtras(null);
  ensurePresetWordLists();
  // одноразовая миграция: проставить автора существующим записям
  if (state.authorName && !state._authorsMigrated) {
    for (const r of state.rules) {
      if (!r.createdBy) r.createdBy = state.authorName;
      if (!r.modifiedBy) r.modifiedBy = state.authorName;
    }
    for (const sc of state.smartCounters) {
      if (!sc.createdBy) sc.createdBy = state.authorName;
      if (!sc.modifiedBy) sc.modifiedBy = state.authorName;
    }
    state._authorsMigrated = true;
  }
  // одноразовая миграция: начальная запись в истории с правильным автором
  if (!state._historySeeded2) {
    for (const r of state.rules) {
      const own = r.createdBy || r.modifiedBy || '';
      if (!r.history || !r.history.length) {
        r.history = [{ at: r.createdAt || new Date().toISOString(), author: own, summary: 'правило создано' }];
      } else {
        for (const h of r.history) {
          if (!h.author) h.author = own;
        }
        if (r.history.length === 1 && r.history[0].summary === 'правило создано') {
          r.history[0].author = own;
        }
      }
    }
    state._historySeeded2 = true;
  }
  save().then(() => {
    switchTab('rules');
    renderAll();
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      switchTab('extras');
      openAddModal(decodeURIComponent(params.get('url') || ''));
    }
  });
});

window.addEventListener('beforeunload', () => {
  cleanupUnsaved();
  chrome.storage.local.set({ state });
});
