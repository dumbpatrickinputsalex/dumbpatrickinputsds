// Service worker: обработка глобальных шорткеев, инициализация state, миграция.

const DEFAULT_STATE = {
  version: 2,
  folders: [],
  rules: [
    {
      id: 'r_email',
      folderId: null,
      name: 'Email',
      enabled: true,
      collapsed: true,
      targets: ['input'],
      urlConditions: [],
      template: '{{name.first}}.{{name.last}}{{number:100:999}}@example.com',
      match: {
        customLogic: false,
        conditions: [
          { type: 'attribute', attr: 'type', pattern: 'email', regex: false, connector: 'AND' },
          { type: 'attribute', attr: 'name', pattern: 'email', regex: false, connector: 'OR' },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
    },
    {
      id: 'r_phone',
      folderId: null,
      name: 'Телефон',
      enabled: true,
      collapsed: true,
      targets: ['input'],
      urlConditions: [],
      template: '{{phone}}',
      match: {
        customLogic: false,
        conditions: [
          { type: 'attribute', attr: 'type', pattern: 'tel', regex: false, connector: 'AND' },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
    },
  ],
  specialInsertions: [],
  smartCounters: [],
  snapshots: [],
  pageShortcuts: [],
  counters: {},
};

// Миграция со старой схемы (profiles → folders + rules)
function migrate(state) {
  if (!state) return DEFAULT_STATE;
  if (state.rules && Array.isArray(state.rules) && !state.profiles) {
    // уже новая
    ensureShape(state);
    return state;
  }
  const now = new Date().toISOString();
  const folders = [];
  const rules = [];
  const palette = [
    '#0052CC',
    '#00875A',
    '#DE350B',
    '#FF8B00',
    '#6554C0',
    '#00B8D9',
    '#EB5A46',
    '#403294',
  ];

  for (const profile of state.profiles || []) {
    let folderId = null;
    if (!profile.isDefault && profile.name) {
      const fid = 'f_' + Math.random().toString(36).slice(2, 10);
      folders.push({
        id: fid,
        name: profile.name,
        icon: '',
        collapsed: false,
      });
      folderId = fid;
    }
    for (const oldRule of profile.rules || []) {
      const conds = ((oldRule.match && oldRule.match.conditions) || []).map(c => ({
        ...c,
        connector: 'AND',
      }));
      // старая mode 'OR' на всё правило → customLogic ON, все connectors OR
      const wasOR = oldRule.match && oldRule.match.mode === 'OR';
      if (wasOR && conds.length > 1) {
        for (let i = 1; i < conds.length; i++) conds[i].connector = 'OR';
      }
      rules.push({
        id: oldRule.id || 'r_' + Math.random().toString(36).slice(2, 10),
        folderId,
        name: oldRule.label || oldRule.name || 'Правило',
        enabled: oldRule.enabled !== false,
        collapsed: true,
        targets: (oldRule.targets || ['input']).slice(0, 1),
        urlPatterns: (profile.urlPatterns || []).slice(),
        template: oldRule.template || '',
        match: {
          customLogic: !!wasOR,
          conditions: conds,
        },
        createdAt: now,
        updatedAt: now,
        history: [],
      });
    }
  }

  const migrated = {
    version: 2,
    folders,
    rules,
    specialInsertions: state.specialInsertions || [],
    smartCounters: state.smartCounters || [],
    customWordLists: state.customWordLists || [],
    snapshots: state.snapshots || [],
    counters: state.counters || {},
  };
  ensureShape(migrated);
  return migrated;
}

function ensureShape(s) {
  s.version = 2;
  if (!Array.isArray(s.folders)) s.folders = [];
  if (!Array.isArray(s.rules)) s.rules = [];
  if (!Array.isArray(s.specialInsertions)) s.specialInsertions = [];
  if (!Array.isArray(s.smartCounters)) s.smartCounters = [];
  if (!Array.isArray(s.snapshots)) s.snapshots = [];
  if (!Array.isArray(s.pageShortcuts)) s.pageShortcuts = [];
  if (!Array.isArray(s.customWordLists)) s.customWordLists = [];
  if (typeof s.debugMode !== 'boolean') s.debugMode = false;
  if (!Array.isArray(s.activityLog)) s.activityLog = [];
  if (!Array.isArray(s.uaRules)) s.uaRules = [];
  if (!s.scraperConfig)
    s.scraperConfig = {
      enabled: false,
      urls: [''],
      parentSelector: 'div.debug_plugin_client',
      fields: [],
      collapsed: true,
    };
  if (!Array.isArray(s.scraperConfig.urls))
    s.scraperConfig.urls = s.scraperConfig.url ? [s.scraperConfig.url] : [''];
  delete s.scraperConfig.url;
  if (!s.copyfxConfig)
    s.copyfxConfig = {
      enabled: false,
      collapsed: true,
      pageUrl: '/copyfx/my/strategies/',
      apiUrl: '/copyfx2-api/copyfx/strategies',
      extraFields: [],
    };
  if (!Array.isArray(s.copyfxConfig.extraFields)) s.copyfxConfig.extraFields = [];
  if (!s.counters || typeof s.counters !== 'object') s.counters = {};
  for (const ins of s.specialInsertions) {
    if (!ins.actionType) ins.actionType = 'fill';
  }
  if (!s._historyV2) {
    for (const r of s.rules) {
      r.history = [];
    }
    s._historyV2 = true;
  }
  if (!s._historySeeded2) {
    for (const r of s.rules) {
      const own = r.createdBy || r.modifiedBy || '';
      if (!r.history || !r.history.length) {
        r.history = [
          { at: r.createdAt || new Date().toISOString(), author: own, summary: 'правило создано' },
        ];
      } else {
        for (const h of r.history) {
          if (!h.author) h.author = own;
        }
        if (r.history.length === 1 && r.history[0].summary === 'правило создано') {
          r.history[0].author = own;
        }
      }
    }
    s._historySeeded2 = true;
  }
  // добавляем недостающие поля к rules
  for (const r of s.rules) {
    if (!r.match) r.match = { customLogic: false, conditions: [] };
    if (!Array.isArray(r.match.conditions)) r.match.conditions = [];
    if (typeof r.match.customLogic !== 'boolean') r.match.customLogic = !!(r.match.mode === 'OR');
    delete r.match.mode;
    for (const c of r.match.conditions) if (!c.connector) c.connector = 'AND';
    // urlPatterns → urlConditions
    if (!Array.isArray(r.urlConditions)) {
      r.urlConditions = Array.isArray(r.urlPatterns)
        ? r.urlPatterns.map((p, i) => ({ value: p, connector: i === 0 ? 'AND' : 'OR' }))
        : [];
    }
    for (const c of r.urlConditions) if (!c.connector) c.connector = 'AND';
    delete r.urlPatterns;
    if (!Array.isArray(r.targets)) r.targets = ['input'];
    if (r.targets.length > 1) r.targets = [r.targets[0]];
    if (!Array.isArray(r.history)) r.history = [];
    if (typeof r.collapsed !== 'boolean') r.collapsed = true;
    if (!r.actionType) r.actionType = 'fill';
    if (!r.createdAt) r.createdAt = new Date().toISOString();
    if (!r.updatedAt) r.updatedAt = r.createdAt;
    if (!r.name && r.label) r.name = r.label;
  }
  delete s.profiles;
}

async function ensureState() {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state) {
    await chrome.storage.local.set({ state: DEFAULT_STATE });
    return;
  }
  const migrated = migrate(state);
  if (migrated !== state) {
    await chrome.storage.local.set({ state: migrated });
  }
}

chrome.runtime.onInstalled.addListener(() => ensureState().then(syncUaRules));
chrome.runtime.onStartup.addListener(() => ensureState().then(syncUaRules));

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const CONTENT_FILES = [
  'lib/generators.js',
  'lib/template.js',
  'lib/matcher.js',
  'content/picker.js',
  'content/content.js',
];

// Пробуем послать сообщение. Если content script не загружен (вкладка открыта до
// установки/перезагрузки расширения, либо страница особенная) — программно
// инжектим скрипты и повторяем.
async function sendToActive(msg) {
  const tab = await activeTab();
  if (!tab || !tab.id) return { error: 'no-active-tab' };
  const url = tab.url || '';
  if (/^(chrome|edge|about|chrome-extension|view-source):/.test(url)) {
    return { error: 'unsupported-page', reason: 'unsupported-page' };
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch (e) {
    // не отвечает — попытаемся инжектить и повторить
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: CONTENT_FILES,
      });
      return await chrome.tabs.sendMessage(tab.id, msg);
    } catch (e2) {
      return { error: String(e2), reason: 'inject-failed' };
    }
  }
}

/* ================ User-Agent rules via declarativeNetRequest ================ */
const UA_RULE_ID_BASE = 90000;

async function syncUaRules() {
  const { state } = await chrome.storage.local.get(['state']);
  const uaRules = ((state && state.uaRules) || []).filter(r => r.enabled && r.userAgent);

  const oldIds = (await chrome.declarativeNetRequest.getDynamicRules())
    .filter(r => r.id >= UA_RULE_ID_BASE)
    .map(r => r.id);

  const addRules = [];
  let idx = 0;
  for (const r of uaRules) {
    const urls = Array.isArray(r.urls) ? r.urls : r.url ? [r.url] : [];
    for (const u of urls) {
      if (!u) continue;
      let urlFilter = u;
      if (!/^[|*]/.test(urlFilter) && !/\*/.test(urlFilter)) {
        urlFilter = '*' + urlFilter + '*';
      }
      addRules.push({
        id: UA_RULE_ID_BASE + idx++,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{ header: 'User-Agent', operation: 'set', value: r.userAgent }],
        },
        condition: {
          urlFilter,
          resourceTypes: [
            'main_frame',
            'sub_frame',
            'xmlhttprequest',
            'script',
            'stylesheet',
            'image',
            'font',
            'media',
            'other',
          ],
        },
      });
    }
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldIds,
    addRules,
  });
  console.info('[DPI/bg] UA rules synced:', addRules.length);
}

chrome.storage.onChanged.addListener(changes => {
  if (changes.state) syncUaRules();
});

chrome.commands.onCommand.addListener(async command => {
  console.info('[DPI/bg] command:', command);
  if (command === 'fill-all') await sendToActive({ type: 'FILL_ALL' });
  if (command === 'fill-special') await sendToActive({ type: 'FILL_SPECIAL' });
});

async function handleCopyfxGetTraders(payload) {
  const tab = await activeTab();
  if (!tab || !tab.id) return { ok: false, error: 'no-active-tab' };
  const apiPattern = payload.apiUrl || '/copyfx2-api/copyfx/strategies';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: pattern => {
        var store = window.__dpi_copyfx_cache;
        if (!store) return { ok: false, error: 'no_interceptor' };
        var keys = Object.keys(store);
        var matched = keys.filter(function (k) {
          return k.indexOf(pattern) !== -1;
        });
        if (!matched.length) return { ok: false, error: 'no_requests' };
        var last = matched[matched.length - 1];
        return { ok: true, data: store[last] };
      },
      args: [apiPattern],
    });
    return (results && results[0] && results[0].result) || { ok: false, error: 'no_result' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function handleCopyfxGetInvestors() {
  const tab = await activeTab();
  if (!tab || !tab.id) return { ok: false, error: 'no-active-tab' };
  const apiPattern = 'copyfx2-api/ratingCard/getInvestorSubscriptionList';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: pattern => {
        var store = window.__dpi_copyfx_cache;
        if (!store) return { ok: false, error: 'no_interceptor' };
        var keys = Object.keys(store);
        var matched = keys.filter(function (k) {
          return k.indexOf(pattern) !== -1 && k.indexOf('::body') === -1;
        });
        if (!matched.length) return { ok: false, error: 'no_requests' };
        var last = matched[matched.length - 1];
        var body = store[last + '::body'] || null;
        return { ok: true, data: store[last], body: body };
      },
      args: [apiPattern],
    });
    return (results && results[0] && results[0].result) || { ok: false, error: 'no_result' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'PROXY_TO_TAB') {
    if (msg.payload && msg.payload.type === 'COPYFX_GET_TRADERS') {
      handleCopyfxGetTraders(msg.payload).then(sendResponse);
      return true;
    }
    if (msg.payload && msg.payload.type === 'COPYFX_GET_INVESTORS') {
      handleCopyfxGetInvestors().then(sendResponse);
      return true;
    }
    sendToActive(msg.payload).then(sendResponse);
    return true;
  }
});
