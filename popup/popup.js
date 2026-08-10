const $ = (id) => document.getElementById(id);

async function currentTab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

async function updateStatusLabel() {
  const tab = await currentTab();
  if (!tab || !tab.url) { $('profile').textContent = '—'; return; }
  const { state } = await chrome.storage.local.get(['state']);
  if (!state) { $('profile').textContent = '—'; return; }
  const url = tab.url;

  function testUrlCond(cond) {
    const val = String(cond?.value || '').trim();
    if (!val) return true;
    const pattern = val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    try { return new RegExp(pattern, 'i').test(url); }
    catch (e) { return url.toLowerCase().includes(val.toLowerCase()); }
  }
  function urlMatchesConditions(conditions) {
    const active = (conditions || []).filter(c => c && String(c.value || '').trim());
    if (!active.length) return true;
    let acc = testUrlCond(active[0]);
    for (let i = 1; i < active.length; i++) {
      const r = testUrlCond(active[i]);
      const conn = (active[i].connector || 'AND').toUpperCase();
      acc = conn === 'OR' ? (acc || r) : (acc && r);
    }
    return acc;
  }
  function urlMatchesPattern(pattern) {
    const p = String(pattern || '').trim();
    if (!p) return false;
    try { return new RegExp(p).test(url); } catch (e) { return url.includes(p); }
  }

  const rules = state.rules || [];
  const applicable = rules.filter(r => r.enabled !== false && urlMatchesConditions(r.urlConditions));
  $('profile').textContent = applicable.length + ' правил активно';

  const ins = (state.specialInsertions || []).find(i => i.enabled !== false && urlMatchesPattern(i.urlPattern));
  if ($('fillSpecial')) {
    $('fillSpecial').disabled = !ins;
    if (!ins) $('fillSpecial').title = 'Нет специальной вставки для этого URL';
  }
}

function renderResultTable(details) {
  const box = $('resultDetails');
  const tbl = $('resultTable');
  if (!details || !details.length) { box.style.display = 'none'; return; }
  tbl.innerHTML = '<thead><tr><th>Правило</th><th>Селектор</th><th>Значение</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const d of details) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rule-name" title="${d.rule.replace(/"/g,'&quot;')}">${escapeHtml(d.rule)}</td>
      <td class="selector" title="${d.selector.replace(/"/g,'&quot;')}">${escapeHtml(d.selector)}</td>
      <td class="value" title="${String(d.value).replace(/"/g,'&quot;')}">${escapeHtml(String(d.value))}</td>`;
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  box.style.display = 'block';
}
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function send(type) {
  const s = $('status');
  $('resultDetails').style.display = 'none';
  try {
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'PROXY_TO_TAB', payload: { type } }, resolve);
    });
    if (!res) { s.textContent = 'Нет ответа от страницы.'; s.className = 'status err'; return; }
    if (res.error || res.reason === 'unsupported-page') {
      s.textContent = res.reason === 'unsupported-page'
        ? 'На этой странице расширение работать не может (chrome://, extension pages).'
        : 'Ошибка: ' + res.error;
      s.className = 'status err';
      return;
    }
    if (type === 'FILL_ALL') {
      const rulesUsed = res.details ? new Set(res.details.map(d => d.rule)).size : 0;
      s.textContent = `Заполнено: ${res.filled} из ${res.matched} совпадений (правил применено: ${rulesUsed} / ${res.activeRules || 0})`;
      s.className = res.filled ? 'status ok' : 'status err';
      renderResultTable(res.details);
    } else if (type === 'FILL_SPECIAL') {
      if (res.filled) {
        s.textContent = 'Вставка выполнена: ' + res.value;
        s.className = 'status ok';
        renderResultTable([{ rule: 'special', selector: res.selector || '?', value: res.value }]);
      } else {
        s.textContent = 'Не выполнено: ' + (res.reason || 'причина неизвестна'); s.className = 'status err';
      }
    }
  } catch (e) {
    s.textContent = 'Ошибка: ' + e.message;
    s.className = 'status err';
  }
}

$('fillAll').addEventListener('click', () => send('FILL_ALL'));
if ($('fillSpecial')) $('fillSpecial').addEventListener('click', () => send('FILL_SPECIAL'));
$('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

if ($('addInsertion')) {
  $('addInsertion').addEventListener('click', async () => {
    const tab = await currentTab();
    const url = (tab && tab.url) ? tab.url : '';
    const optionsUrl = chrome.runtime.getURL('options/options.html') + '?add=1&url=' + encodeURIComponent(url);
    await chrome.tabs.create({ url: optionsUrl });
    window.close();
  });
}

updateStatusLabel();
loadScraperData();
loadCopyfxData();
loadInvestorData();
loadUaStatus();

function scraperUrlMatches(urls, pageUrl) {
  if (!urls || !urls.length) return false;
  for (const u of urls) {
    const p = String(u || '').trim();
    if (!p) continue;
    const regex = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    try { if (new RegExp(regex, 'i').test(pageUrl)) return true; }
    catch (e) { if (pageUrl.toLowerCase().includes(p.toLowerCase())) return true; }
  }
  return false;
}

async function loadScraperData() {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.scraperConfig || !state.scraperConfig.enabled) return;
  const cfg = state.scraperConfig;

  const tab = await currentTab();
  if (!tab || !tab.url) return;

  const urlMatch = scraperUrlMatches(cfg.urls, tab.url);
  const box = $('scraperBox');
  const scanBtn = $('scraperScanBtn');
  box.style.display = 'block';
  scanBtn.disabled = !urlMatch;
  if (!urlMatch) {
    scanBtn.title = 'URL не совпадает ни с одним паттерном скрапера';
    return;
  }
  scanBtn.title = 'Сканировать страницу и обновить список полей';

  const enabledFields = (cfg.fields || []).filter(f => f.enabled);
  if (!enabledFields.length) return;

  try {
    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'PROXY_TO_TAB',
        payload: { type: 'SCRAPE_PAGE', parentSelector: cfg.parentSelector || 'div.debug_plugin_client' }
      }, resolve);
    });
    if (!res || !res.ok || !res.data || !res.data.length) return;

    const dataMap = {};
    for (const d of res.data) dataMap[d.key] = d.value;

    const tbl = $('scraperTable');
    tbl.innerHTML = '';
    const tbody = document.createElement('tbody');

    for (const field of enabledFields) {
      const val = dataMap[field.key];
      if (val === undefined) continue;
      const tr = document.createElement('tr');
      const tdKey = document.createElement('td');
      tdKey.textContent = field.key;
      const tdVal = document.createElement('td');
      tdVal.appendChild(formatScraperValue(field.key, val));
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
  } catch (e) { /* silent */ }
}

$('scraperScanBtn').addEventListener('click', async () => {
  const status = $('scraperScanStatus');
  status.className = 'scraper-scan-status';
  status.textContent = 'Сканирование…';

  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.scraperConfig) {
    status.textContent = 'Скрапер не настроен. Откройте Настройки → Спец. возможности.';
    status.className = 'scraper-scan-status err';
    return;
  }
  const cfg = state.scraperConfig;
  const parentSel = cfg.parentSelector || 'div.debug_plugin_client';

  try {
    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'PROXY_TO_TAB',
        payload: { type: 'SCRAPE_FIELDS', parentSelector: parentSel }
      }, resolve);
    });
    if (!res || !res.ok) {
      status.textContent = res ? res.error : 'Нет ответа от страницы';
      status.className = 'scraper-scan-status err';
      return;
    }
    const existing = new Set((cfg.fields || []).map(f => f.key));
    const merged = [];
    for (const f of (cfg.fields || [])) {
      if (res.fields.includes(f.key)) merged.push(f);
    }
    for (const key of res.fields) {
      if (!existing.has(key)) merged.push({ key, enabled: true });
    }
    cfg.fields = merged;
    await new Promise(resolve => chrome.storage.local.set({ state }, resolve));
    status.textContent = 'Найдено полей: ' + res.fields.length + '. Настройте выбор в Настройках → Спец. возможности.';
    status.className = 'scraper-scan-status ok';
  } catch (e) {
    status.textContent = 'Ошибка: ' + e.message;
    status.className = 'scraper-scan-status err';
  }
});

const COUNTRY_NUM_TO_ALPHA2 = {
  4:'AF',8:'AL',12:'DZ',16:'AS',20:'AD',24:'AO',28:'AG',31:'AZ',32:'AR',36:'AU',
  40:'AT',44:'BS',48:'BH',50:'BD',51:'AM',52:'BB',56:'BE',60:'BM',64:'BT',68:'BO',
  70:'BA',72:'BW',76:'BR',84:'BZ',86:'IO',90:'SB',96:'BN',100:'BG',104:'MM',108:'BI',
  112:'BY',116:'KH',120:'CM',124:'CA',132:'CV',136:'KY',140:'CF',144:'LK',148:'TD',
  152:'CL',156:'CN',158:'TW',162:'CX',166:'CC',170:'CO',174:'KM',175:'YT',178:'CG',
  180:'CD',184:'CK',188:'CR',191:'HR',192:'CU',196:'CY',203:'CZ',204:'BJ',208:'DK',
  212:'DM',214:'DO',218:'EC',222:'SV',226:'GQ',231:'ET',232:'ER',233:'EE',234:'FO',
  238:'FK',242:'FJ',246:'FI',250:'FR',254:'GF',258:'PF',262:'DJ',266:'GA',268:'GE',
  270:'GM',275:'PS',276:'DE',288:'GH',292:'GI',296:'KI',300:'GR',304:'GL',308:'GD',
  312:'GP',316:'GU',320:'GT',324:'GN',328:'GY',332:'HT',336:'VA',340:'HN',344:'HK',
  348:'HU',352:'IS',356:'IN',360:'ID',364:'IR',368:'IQ',372:'IE',376:'IL',380:'IT',
  384:'CI',388:'JM',392:'JP',398:'KZ',400:'JO',404:'KE',408:'KP',410:'KR',414:'KW',
  417:'KG',418:'LA',422:'LB',426:'LS',428:'LV',430:'LR',434:'LY',438:'LI',440:'LT',
  442:'LU',446:'MO',450:'MG',454:'MW',458:'MY',462:'MV',466:'ML',470:'MT',474:'MQ',
  478:'MR',480:'MU',484:'MX',492:'MC',496:'MN',498:'MD',499:'ME',500:'MS',504:'MA',
  508:'MZ',512:'OM',516:'NA',520:'NR',524:'NP',528:'NL',530:'AN',533:'AW',540:'NC',
  548:'VU',554:'NZ',558:'NI',562:'NE',566:'NG',570:'NU',574:'NF',578:'NO',580:'MP',
  583:'FM',584:'MH',585:'PW',586:'PK',591:'PA',598:'PG',600:'PY',604:'PE',608:'PH',
  612:'PN',616:'PL',620:'PT',624:'GW',626:'TL',630:'PR',634:'QA',638:'RE',642:'RO',
  643:'RU',646:'RW',654:'SH',659:'KN',660:'AI',662:'LC',666:'PM',670:'VC',674:'SM',
  678:'ST',682:'SA',686:'SN',688:'RS',690:'SC',694:'SL',702:'SG',703:'SK',704:'VN',
  705:'SI',706:'SO',710:'ZA',716:'ZW',720:'YE',724:'ES',728:'SS',729:'SD',740:'SR',
  744:'SJ',748:'SZ',752:'SE',756:'CH',760:'SY',762:'TJ',764:'TH',768:'TG',772:'TK',
  776:'TO',780:'TT',784:'AE',788:'TN',792:'TR',795:'TM',796:'TC',798:'TV',800:'UG',
  804:'UA',807:'MK',818:'EG',826:'GB',831:'GG',832:'JE',833:'IM',834:'TZ',840:'US',
  850:'VI',854:'BF',858:'UY',860:'UZ',862:'VE',876:'WF',882:'WS',887:'YE',894:'ZM'
};

const COUNTRY_NAME_TO_ALPHA2 = {
  'afghanistan':'AF','albania':'AL','algeria':'DZ','argentina':'AR','armenia':'AM',
  'australia':'AU','austria':'AT','azerbaijan':'AZ','bahrain':'BH','bangladesh':'BD',
  'belarus':'BY','belgium':'BE','bolivia':'BO','bosnia':'BA','brazil':'BR','brunei':'BN',
  'bulgaria':'BG','cambodia':'KH','cameroon':'CM','canada':'CA','chile':'CL','china':'CN',
  'colombia':'CO','congo':'CG','costa rica':'CR','croatia':'HR','cuba':'CU','cyprus':'CY',
  'czech republic':'CZ','czechia':'CZ','denmark':'DK','dominican republic':'DO',
  'ecuador':'EC','egypt':'EG','el salvador':'SV','estonia':'EE','ethiopia':'ET',
  'finland':'FI','france':'FR','georgia':'GE','germany':'DE','ghana':'GH','greece':'GR',
  'guatemala':'GT','honduras':'HN','hong kong':'HK','hungary':'HU','iceland':'IS',
  'india':'IN','indonesia':'ID','iran':'IR','iraq':'IQ','ireland':'IE','israel':'IL',
  'italy':'IT','jamaica':'JM','japan':'JP','jordan':'JO','kazakhstan':'KZ','kenya':'KE',
  'kuwait':'KW','kyrgyzstan':'KG','laos':'LA','latvia':'LV','lebanon':'LB','libya':'LY',
  'lithuania':'LT','luxembourg':'LU','macau':'MO','macao':'MO','madagascar':'MG',
  'malaysia':'MY','maldives':'MV','malta':'MT','mexico':'MX','moldova':'MD','monaco':'MC',
  'mongolia':'MN','montenegro':'ME','morocco':'MA','mozambique':'MZ','myanmar':'MM',
  'namibia':'NA','nepal':'NP','netherlands':'NL','new zealand':'NZ','nicaragua':'NI',
  'nigeria':'NG','north korea':'KP','north macedonia':'MK','norway':'NO','oman':'OM',
  'pakistan':'PK','palestine':'PS','panama':'PA','paraguay':'PY','peru':'PE',
  'philippines':'PH','poland':'PL','portugal':'PT','qatar':'QA','romania':'RO',
  'russia':'RU','saudi arabia':'SA','senegal':'SN','serbia':'RS','singapore':'SG',
  'slovakia':'SK','slovenia':'SI','somalia':'SO','south africa':'ZA','south korea':'KR',
  'south sudan':'SS','spain':'ES','sri lanka':'LK','sudan':'SD','sweden':'SE',
  'switzerland':'CH','syria':'SY','taiwan':'TW','tajikistan':'TJ','tanzania':'TZ',
  'thailand':'TH','tunisia':'TN','turkey':'TR','turkmenistan':'TM','uganda':'UG',
  'ukraine':'UA','united arab emirates':'AE','uae':'AE','united kingdom':'GB','uk':'GB',
  'united states':'US','usa':'US','uruguay':'UY','uzbekistan':'UZ','venezuela':'VE',
  'vietnam':'VN','yemen':'YE','zambia':'ZM','zimbabwe':'ZW',
  'россия':'RU','украина':'UA','беларусь':'BY','казахстан':'KZ','грузия':'GE',
  'армения':'AM','азербайджан':'AZ','молдова':'MD','кыргызстан':'KG','таджикистан':'TJ',
  'туркменистан':'TM','узбекистан':'UZ','латвия':'LV','литва':'LT','эстония':'EE',
  'польша':'PL','германия':'DE','франция':'FR','италия':'IT','испания':'ES',
  'великобритания':'GB','сша':'US','китай':'CN','япония':'JP','индия':'IN',
  'турция':'TR','бразилия':'BR','канада':'CA','австралия':'AU','мексика':'MX',
  'египет':'EG','нигерия':'NG','таиланд':'TH','вьетнам':'VN','индонезия':'ID',
  'малайзия':'MY','сингапур':'SG','корея':'KR','румыния':'RO','чехия':'CZ',
  'болгария':'BG','сербия':'RS','хорватия':'HR','венгрия':'HU','греция':'GR',
  'кипр':'CY','швеция':'SE','норвегия':'NO','финляндия':'FI','дания':'DK',
  'нидерланды':'NL','бельгия':'BE','швейцария':'CH','австрия':'AT','португалия':'PT',
  'ирландия':'IE','аргентина':'AR','колумбия':'CO','чили':'CL','перу':'PE'
};

function countryAlpha2(val) {
  const s = String(val).trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  if (/^\d+$/.test(s)) return COUNTRY_NUM_TO_ALPHA2[parseInt(s, 10)] || '';
  return COUNTRY_NAME_TO_ALPHA2[s.toLowerCase()] || '';
}

function formatScraperValue(key, val) {
  const span = document.createElement('span');

  if (key === 'is_test') {
    const badge = document.createElement('span');
    badge.className = 'badge-test ' + (val === '1' || val === 1 ? 'test' : 'real');
    badge.textContent = (val === '1' || val === 1) ? 'TEST' : 'REAL';
    span.appendChild(badge);
    return span;
  }

  if (key === 'id' || key === 'email') {
    const link = document.createElement('span');
    link.className = 'copyable';
    link.textContent = val;
    link.title = 'Нажмите чтобы скопировать';
    const copied = document.createElement('span');
    copied.className = 'scraper-copied';
    copied.textContent = '✓';
    link.addEventListener('click', () => {
      navigator.clipboard.writeText(val);
      copied.classList.add('show');
      setTimeout(() => copied.classList.remove('show'), 1500);
    });
    span.appendChild(link);
    span.appendChild(copied);
    return span;
  }

  if (key.toLowerCase().includes('country')) {
    const code = countryAlpha2(val);
    if (code) {
      const img = document.createElement('img');
      img.src = 'https://flagcdn.com/16x12/' + code.toLowerCase() + '.png';
      img.alt = code;
      img.style.cssText = 'vertical-align: middle; margin-right: 4px;';
      span.appendChild(img);
    }
    span.appendChild(document.createTextNode(val));
    return span;
  }

  if (key === 'phone') {
    const text = String(val);
    if (text.length >= 4) {
      span.textContent = text.slice(0, -4);
      const bold = document.createElement('span');
      bold.className = 'phone-bold';
      bold.textContent = text.slice(-4);
      span.appendChild(bold);
    } else {
      span.textContent = val;
    }
    return span;
  }

  span.textContent = val;
  return span;
}

/* ================ CopyFX ================ */
let copyfxAllEntries = [];
let copyfxShownCount = 0;
let copyfxSourceUrl = '';

function copyfxUrlMatches(pageUrl, configPageUrl) {
  const p = String(configPageUrl || '').trim();
  if (!p) return false;
  return pageUrl.includes(p);
}

function getCopyfxLang(url) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean)[0];
    if (seg && /^[a-z]{2}$/.test(seg)) return seg;
  } catch (e) {}
  return 'en';
}

function getCopyfxAdminDomain(hostname) {
  const m = hostname.match(/www-(\d+)/i);
  if (m) return 'https://www-' + m[1] + '.en.lk.roboforex.rbfx.co/admin123';
  return 'https://admin.lk.roboforex.rbfx.co/admin123';
}

async function copyfxSaveSession() {
  await chrome.storage.session.set({
    copyfxCache: { entries: copyfxAllEntries, sourceUrl: copyfxSourceUrl }
  });
}

async function copyfxClearSession() {
  await chrome.storage.session.remove('copyfxCache');
}

async function loadCopyfxData() {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.copyfxConfig || !state.copyfxConfig.enabled) return;
  const cfg = state.copyfxConfig;

  const box = $('copyfxBox');
  const getBtn = $('copyfxGetBtn');
  const clearBtn = $('copyfxClearBtn');
  box.style.display = 'block';

  const cached = await chrome.storage.session.get(['copyfxCache']);
  if (cached.copyfxCache && cached.copyfxCache.entries && cached.copyfxCache.entries.length) {
    copyfxAllEntries = cached.copyfxCache.entries;
    copyfxSourceUrl = cached.copyfxCache.sourceUrl || '';
    copyfxShownCount = 0;
    $('copyfxStatus').textContent = 'Найдено: ' + copyfxAllEntries.length + ' записей';
    $('copyfxStatus').className = 'scraper-scan-status ok';
    getBtn.style.display = 'none';
    clearBtn.style.display = '';
    renderCopyfxEntries(cfg);
    return;
  }

  const tab = await currentTab();
  if (!tab || !tab.url) return;
  const urlMatch = copyfxUrlMatches(tab.url, cfg.pageUrl);
  getBtn.disabled = !urlMatch;
  if (!urlMatch) getBtn.title = 'URL не совпадает с паттерном CopyFX';
}

$('copyfxGetBtn').addEventListener('click', async () => {
  const status = $('copyfxStatus');
  const getBtn = $('copyfxGetBtn');
  const clearBtn = $('copyfxClearBtn');
  status.className = 'scraper-scan-status';
  status.textContent = 'Загрузка трейдеров…';
  getBtn.disabled = true;

  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.copyfxConfig) {
    status.textContent = 'CopyFX не настроен.';
    status.className = 'scraper-scan-status err';
    getBtn.disabled = false;
    return;
  }
  const cfg = state.copyfxConfig;

  const tab = await currentTab();
  const tabUrl = tab ? tab.url : '';

  try {
    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'PROXY_TO_TAB',
        payload: { type: 'COPYFX_GET_TRADERS', apiUrl: cfg.apiUrl }
      }, resolve);
    });

    if (!res || !res.ok) {
      status.textContent = res ? ('Ошибка: ' + res.error) : 'Нет ответа от страницы';
      status.className = 'scraper-scan-status err';
      getBtn.disabled = false;
      return;
    }

    let entries = [];
    const data = res.data;
    if (Array.isArray(data)) entries = data;
    else if (data && Array.isArray(data.entries)) entries = data.entries;
    else if (data && Array.isArray(data.data)) entries = data.data;
    else if (data && Array.isArray(data.strategies)) entries = data.strategies;
    else if (data && Array.isArray(data.items)) entries = data.items;

    if (!entries.length) {
      status.textContent = 'Трейдеры не найдены в ответе API.';
      status.className = 'scraper-scan-status err';
      getBtn.disabled = false;
      return;
    }

    copyfxAllEntries = entries;
    copyfxShownCount = 0;
    copyfxSourceUrl = tabUrl;
    status.textContent = 'Найдено: ' + entries.length + ' записей';
    status.className = 'scraper-scan-status ok';
    getBtn.style.display = 'none';
    clearBtn.style.display = '';
    renderCopyfxEntries(cfg);
    copyfxSaveSession();
  } catch (e) {
    status.textContent = 'Ошибка: ' + e.message;
    status.className = 'scraper-scan-status err';
    getBtn.disabled = false;
  }
});

$('copyfxClearBtn').addEventListener('click', () => {
  copyfxAllEntries = [];
  copyfxShownCount = 0;
  copyfxSourceUrl = '';
  $('copyfxEntries').innerHTML = '';
  $('copyfxLoadMore').style.display = 'none';
  $('copyfxStatus').textContent = '';
  $('copyfxClearBtn').style.display = 'none';
  $('copyfxGetBtn').style.display = '';
  $('copyfxGetBtn').disabled = false;
  copyfxClearSession();
});

$('copyfxLoadMore').addEventListener('click', async () => {
  const { state } = await chrome.storage.local.get(['state']);
  const cfg = (state && state.copyfxConfig) || {};
  renderCopyfxEntries(cfg, true);
});

async function renderCopyfxEntries(cfg, append) {
  const container = $('copyfxEntries');
  const loadMore = $('copyfxLoadMore');
  if (!append) { container.innerHTML = ''; copyfxShownCount = 0; }

  const srcUrl = copyfxSourceUrl || '';
  const lang = getCopyfxLang(srcUrl);
  let hostname = '', origin = '';
  try { const u = new URL(srcUrl); hostname = u.hostname; origin = u.origin; } catch (e) {}
  const adminDomain = getCopyfxAdminDomain(hostname);
  const extraFields = cfg.extraFields || [];

  const batch = copyfxAllEntries.slice(copyfxShownCount, copyfxShownCount + 10);

  for (const entry of batch) {
    const card = document.createElement('div');
    card.className = 'copyfx-entry';

    const login = String(entry.login || '—');
    const platform = String(entry.platform || '').toUpperCase();
    const platformGroup = entry.platform_group_name || '';
    const strategy = String(entry.strategy || entry.name || '—');
    const subs = String(entry.subscriber_count ?? entry.subscribers ?? '—');
    const balance = String(entry.balance_usd ?? entry.balance ?? '—');
    const sourceId = entry.source_id || entry.id || '';

    const row1 = document.createElement('div');
    row1.className = 'copyfx-entry-row1';

    const colLogin = document.createElement('span');
    colLogin.className = 'copyfx-col copyfx-col-login';
    colLogin.title = 'Скопировать ' + login;
    const loginVal = document.createElement('span');
    loginVal.className = 'copyable';
    loginVal.textContent = login;
    colLogin.appendChild(loginVal);
    const copiedTip = document.createElement('span');
    copiedTip.className = 'scraper-copied';
    copiedTip.textContent = '✓';
    colLogin.addEventListener('click', () => {
      navigator.clipboard.writeText(login);
      copiedTip.classList.add('show');
      setTimeout(() => copiedTip.classList.remove('show'), 1500);
    });

    const colPlatform = document.createElement('span');
    colPlatform.className = 'copyfx-col copyfx-col-platform';
    colPlatform.textContent = platform + (platformGroup ? ' ' + platformGroup : '');
    colPlatform.title = platform + ' ' + platformGroup;

    const colStrategy = document.createElement('span');
    colStrategy.className = 'copyfx-col copyfx-col-strategy';
    colStrategy.title = strategy;
    const stratLabel = document.createElement('span');
    stratLabel.className = 'copyfx-label';
    stratLabel.textContent = 'Strategy: ';
    const stratVal = document.createElement('span');
    stratVal.className = 'copyfx-value';
    stratVal.textContent = strategy;
    colStrategy.appendChild(stratLabel);
    colStrategy.appendChild(stratVal);

    const hasAff = !!(entry.offer && entry.offer.partner_program_template_status);
    const colAff = document.createElement('span');
    colAff.className = 'copyfx-col copyfx-col-aff';
    const affLabel = document.createElement('span');
    affLabel.className = 'copyfx-label';
    affLabel.textContent = 'Aff: ';
    const affVal = document.createElement('span');
    affVal.className = 'copyfx-value ' + (hasAff ? 'yes' : 'no');
    affVal.textContent = hasAff ? 'Yes' : 'No';
    colAff.appendChild(affLabel);
    colAff.appendChild(affVal);

    const colSubs = document.createElement('span');
    colSubs.className = 'copyfx-col copyfx-col-subs';
    const subsLabel = document.createElement('span');
    subsLabel.className = 'copyfx-label';
    subsLabel.textContent = 'subs: ';
    const subsVal = document.createElement('span');
    subsVal.className = 'copyfx-value' + (parseInt(subs, 10) > 0 ? ' subs-active' : '');
    subsVal.textContent = subs;
    colSubs.appendChild(subsLabel);
    colSubs.appendChild(subsVal);

    const colBalance = document.createElement('span');
    const balNum = parseFloat(balance);
    colBalance.className = 'copyfx-col copyfx-col-balance' + (balNum < 0 ? ' negative' : '');
    colBalance.textContent = balance + ' USD';

    row1.appendChild(colLogin);
    row1.appendChild(copiedTip);
    row1.appendChild(colPlatform);
    row1.appendChild(colStrategy);
    row1.appendChild(colAff);
    row1.appendChild(colSubs);
    row1.appendChild(colBalance);

    for (const ef of extraFields) {
      const v = entry[ef] !== undefined ? entry[ef] : '—';
      const colExtra = document.createElement('span');
      colExtra.className = 'copyfx-col copyfx-col-extra';
      colExtra.textContent = ef + ': ' + v;
      row1.appendChild(colExtra);
    }

    const row2 = document.createElement('div');
    row2.className = 'copyfx-entry-row2';

    const btnStrategy = document.createElement('button');
    btnStrategy.className = 'copyfx-btn copyfx-btn-strategy';
    btnStrategy.textContent = 'Стратегия';
    btnStrategy.addEventListener('click', () => chrome.tabs.create({ url: `${origin}/${lang}/copyfx/my/strategies/${sourceId}/${login}/settings` }));

    const btnTrader = document.createElement('button');
    btnTrader.className = 'copyfx-btn copyfx-btn-primary';
    btnTrader.textContent = 'Карточка трейдера';
    btnTrader.addEventListener('click', () => chrome.tabs.create({ url: `${origin}/${lang}/copyfx/traders/${sourceId}/${login}` }));

    const btnAccount = document.createElement('button');
    btnAccount.className = 'copyfx-btn copyfx-btn-account';
    btnAccount.textContent = '🔑 Карточка счета';
    btnAccount.addEventListener('click', () => chrome.tabs.create({ url: `${adminDomain}/accounts/edit/${login}/0` }));

    row2.appendChild(btnStrategy);
    row2.appendChild(btnTrader);
    row2.appendChild(btnAccount);

    const btnRemove = document.createElement('button');
    btnRemove.className = 'copyfx-btn copyfx-btn-remove';
    btnRemove.textContent = 'Убрать';
    btnRemove.addEventListener('click', () => card.remove());
    row2.appendChild(btnRemove);

    card.appendChild(row1);
    card.appendChild(row2);
    container.appendChild(card);
  }

  copyfxShownCount += batch.length;
  if (copyfxShownCount < copyfxAllEntries.length) {
    loadMore.style.display = '';
    loadMore.textContent = 'Загрузить следующие ' + Math.min(10, copyfxAllEntries.length - copyfxShownCount) + ' счетов';
  } else {
    loadMore.style.display = 'none';
  }
}

/* ================ Investors ================ */
let investorAllEntries = [];
let investorShownCount = 0;
let investorTraderLogin = '';

const COPY_MODE_MAP = { 0: 'Proportional', 1: 'Classic', 2: 'Fixed' };

function isTraderDetailPage(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('traders');
    return idx !== -1 && parts.length >= idx + 3;
  } catch (e) { return false; }
}

async function investorSaveSession() {
  await chrome.storage.session.set({
    investorCache: { entries: investorAllEntries, login: investorTraderLogin }
  });
}

async function investorClearSession() {
  await chrome.storage.session.remove('investorCache');
}

async function loadInvestorData() {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.copyfxConfig || !state.copyfxConfig.enabled) return;

  const tab = await currentTab();
  if (!tab || !tab.url || !isTraderDetailPage(tab.url)) return;

  const section = $('investorSection');
  section.style.display = '';
  const getBtn = $('investorGetBtn');
  const clearBtn = $('investorClearBtn');

  const cached = await chrome.storage.session.get(['investorCache']);
  if (cached.investorCache && cached.investorCache.entries && cached.investorCache.entries.length) {
    investorAllEntries = cached.investorCache.entries;
    investorTraderLogin = cached.investorCache.login || '';
    investorShownCount = 0;
    $('investorStatus').textContent = 'Найдено: ' + investorAllEntries.length + ' инвесторов';
    $('investorStatus').className = 'scraper-scan-status ok';
    getBtn.style.display = 'none';
    clearBtn.style.display = '';
    updateInvestorTitle();
    renderInvestorEntries();
    return;
  }

  getBtn.disabled = false;
}

function updateInvestorTitle() {
  const el = $('investorTitle');
  if (investorTraderLogin) {
    el.innerHTML = '';
    el.appendChild(document.createTextNode('Трейдер: '));
    const span = document.createElement('span');
    span.className = 'investor-title-login';
    span.textContent = investorTraderLogin;
    span.title = 'Скопировать ' + investorTraderLogin;
    const tip = document.createElement('span');
    tip.className = 'scraper-copied';
    tip.textContent = '✓';
    span.addEventListener('click', () => {
      navigator.clipboard.writeText(String(investorTraderLogin));
      tip.classList.add('show');
      setTimeout(() => tip.classList.remove('show'), 1500);
    });
    el.appendChild(span);
    el.appendChild(tip);
  } else {
    el.textContent = 'Инвесторы';
  }
}

$('investorGetBtn').addEventListener('click', async () => {
  const status = $('investorStatus');
  const getBtn = $('investorGetBtn');
  const clearBtn = $('investorClearBtn');
  status.className = 'scraper-scan-status';
  status.textContent = 'Загрузка инвесторов…';
  getBtn.disabled = true;

  try {
    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'PROXY_TO_TAB',
        payload: { type: 'COPYFX_GET_INVESTORS' }
      }, resolve);
    });

    if (!res || !res.ok) {
      status.textContent = res ? ('Ошибка: ' + res.error) : 'Нет ответа от страницы';
      status.className = 'scraper-scan-status err';
      getBtn.disabled = false;
      return;
    }

    let entries = [];
    const data = res.data;
    if (data && data.data && Array.isArray(data.data.entries)) entries = data.data.entries;
    else if (data && Array.isArray(data.entries)) entries = data.entries;
    else if (Array.isArray(data)) entries = data;

    if (!entries.length) {
      status.textContent = 'Инвесторы не найдены в ответе API.';
      status.className = 'scraper-scan-status err';
      getBtn.disabled = false;
      return;
    }

    investorAllEntries = entries;
    investorShownCount = 0;
    investorTraderLogin = (res.body && res.body.login) ? String(res.body.login) : '';
    status.textContent = 'Найдено: ' + entries.length + ' инвесторов';
    status.className = 'scraper-scan-status ok';
    getBtn.style.display = 'none';
    clearBtn.style.display = '';
    updateInvestorTitle();
    renderInvestorEntries();
    investorSaveSession();
  } catch (e) {
    status.textContent = 'Ошибка: ' + e.message;
    status.className = 'scraper-scan-status err';
    getBtn.disabled = false;
  }
});

$('investorClearBtn').addEventListener('click', () => {
  investorAllEntries = [];
  investorShownCount = 0;
  investorTraderLogin = '';
  $('investorEntries').innerHTML = '';
  $('investorLoadMore').style.display = 'none';
  $('investorStatus').textContent = '';
  $('investorClearBtn').style.display = 'none';
  $('investorGetBtn').style.display = '';
  $('investorGetBtn').disabled = false;
  updateInvestorTitle();
  investorClearSession();
});

$('investorLoadMore').addEventListener('click', () => {
  renderInvestorEntries(true);
});

function getCoefficient(cmv) {
  if (!cmv) return '—';
  if (cmv.rate) return String(cmv.rate);
  if (cmv.factor) return String(cmv.factor);
  if (cmv.volume) return String(cmv.volume);
  return '0';
}

function renderInvestorEntries(append) {
  const container = $('investorEntries');
  const loadMore = $('investorLoadMore');
  if (!append) { container.innerHTML = ''; investorShownCount = 0; }

  const batch = investorAllEntries.slice(investorShownCount, investorShownCount + 10);

  for (const entry of batch) {
    const card = document.createElement('div');
    card.className = 'investor-entry';

    const receiver = String(entry.receiver || '—');
    const subDate = String(entry.subscription_date || '—');
    const modeText = COPY_MODE_MAP[entry.copy_mode] ?? '—';
    const coeff = getCoefficient(entry.copy_mode_value);
    const scopeVal = !!entry.scope;
    const balance = String(entry.balance_usd ?? '—');

    const row1 = document.createElement('div');
    row1.className = 'investor-entry-row1';

    const colReceiver = document.createElement('span');
    colReceiver.className = 'inv-col inv-col-receiver';
    colReceiver.title = 'Скопировать ' + receiver;
    const recVal = document.createElement('span');
    recVal.className = 'copyable';
    recVal.textContent = receiver;
    colReceiver.appendChild(recVal);
    const copiedTip = document.createElement('span');
    copiedTip.className = 'scraper-copied';
    copiedTip.textContent = '✓';
    colReceiver.addEventListener('click', () => {
      navigator.clipboard.writeText(receiver);
      copiedTip.classList.add('show');
      setTimeout(() => copiedTip.classList.remove('show'), 1500);
    });

    const colDate = document.createElement('span');
    colDate.className = 'inv-col inv-col-date';
    colDate.textContent = subDate;

    const colMode = document.createElement('span');
    colMode.className = 'inv-col inv-col-mode';
    colMode.textContent = modeText;

    const colCoeff = document.createElement('span');
    colCoeff.className = 'inv-col inv-col-coeff';
    const coeffLabel = document.createElement('span');
    coeffLabel.className = 'copyfx-label';
    coeffLabel.textContent = 'Коэф: ';
    const coeffVal = document.createElement('span');
    coeffVal.className = 'copyfx-value';
    coeffVal.textContent = coeff;
    colCoeff.appendChild(coeffLabel);
    colCoeff.appendChild(coeffVal);

    const colScope = document.createElement('span');
    colScope.className = 'inv-col inv-col-scope';
    const circle = document.createElement('span');
    circle.className = 'scope-circle' + (scopeVal ? ' filled' : '');
    circle.title = scopeVal ? 'scope: true' : 'scope: false';
    colScope.appendChild(circle);

    const colBalance = document.createElement('span');
    const balNum = parseFloat(balance);
    colBalance.className = 'inv-col inv-col-balance' + (balNum < 0 ? ' negative' : '');
    colBalance.textContent = balance + ' USD';

    row1.appendChild(colReceiver);
    row1.appendChild(copiedTip);
    row1.appendChild(colDate);
    row1.appendChild(colMode);
    row1.appendChild(colCoeff);
    row1.appendChild(colScope);
    row1.appendChild(colBalance);

    const row2 = document.createElement('div');
    row2.className = 'copyfx-entry-row2';

    const btnStrategy = document.createElement('button');
    btnStrategy.className = 'copyfx-btn copyfx-btn-strategy';
    btnStrategy.textContent = 'Стратегия';
    btnStrategy.addEventListener('click', () => {});

    const btnAccount = document.createElement('button');
    btnAccount.className = 'copyfx-btn copyfx-btn-account';
    btnAccount.textContent = '🔑 Карточка счета';
    btnAccount.style.position = 'static';
    btnAccount.style.opacity = '1';
    btnAccount.addEventListener('click', () => {});

    const btnRemove = document.createElement('button');
    btnRemove.className = 'copyfx-btn copyfx-btn-remove';
    btnRemove.textContent = 'Убрать';
    btnRemove.addEventListener('click', () => card.remove());

    row2.appendChild(btnStrategy);
    row2.appendChild(btnAccount);
    row2.appendChild(btnRemove);

    card.appendChild(row1);
    card.appendChild(row2);
    container.appendChild(card);
  }

  investorShownCount += batch.length;
  if (investorShownCount < investorAllEntries.length) {
    loadMore.style.display = '';
    loadMore.textContent = 'Загрузить следующие ' + Math.min(10, investorAllEntries.length - investorShownCount);
  } else {
    loadMore.style.display = 'none';
  }
}

/* ================ UA Rule Toggle ================ */
async function loadUaStatus() {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.uaRules || !state.uaRules.length) return;
  const rule = state.uaRules[0];
  if (!rule.userAgent) return;

  $('uaBox').style.display = 'block';
  $('uaValue').textContent = rule.userAgent;
  $('uaEnabled').checked = rule.enabled !== false;
  $('uaValue').classList.toggle('ua-disabled', !$('uaEnabled').checked);
}

$('uaEnabled').addEventListener('change', async () => {
  const { state } = await chrome.storage.local.get(['state']);
  if (!state || !state.uaRules || !state.uaRules.length) return;
  state.uaRules[0].enabled = $('uaEnabled').checked;
  await new Promise(r => chrome.storage.local.set({ state }, r));
  $('uaValue').classList.toggle('ua-disabled', !$('uaEnabled').checked);
});
