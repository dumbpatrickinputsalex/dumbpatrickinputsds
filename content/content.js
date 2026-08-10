// Основной content script.
// Выполняется на странице и принимает команды от background/popup:
// заполнить поля, выполнить спецвставку, выбрать элемент или сделать preview шаблона.

(function () {
  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  ).set;
  const nativeAreaSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  ).set;
  const nativeSelectSetter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    'value'
  ).set;
  const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'checked'
  ).set;

  // Универсально устанавливает значение в поле и генерирует события,
  // чтобы страница обработала изменение как обычный пользовательский ввод.
  function setValue(el, value) {
    if (el.tagName === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      if (t === 'checkbox' || t === 'radio') {
        const desired = value === true || value === 'true' || value === '1' || value === 'on';
        if (el.checked !== desired) {
          nativeCheckedSetter.call(el, desired);
          el.dispatchEvent(new Event('click', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      nativeInputSetter.call(el, value);
    } else if (el.tagName === 'TEXTAREA') {
      nativeAreaSetter.call(el, value);
    } else if (el.tagName === 'SELECT') {
      // пытаемся найти option по value или тексту (без учёта регистра)
      let chosen = null;
      const v = String(value).toLowerCase();
      for (const opt of el.options) {
        if (opt.value.toLowerCase() === v || opt.text.toLowerCase() === v) {
          chosen = opt;
          break;
        }
      }
      if (!chosen) {
        // fallback: случайный не-пустой option
        const pool = Array.from(el.options).filter(o => o.value);
        if (pool.length) chosen = pool[Math.floor(Math.random() * pool.length)];
      }
      if (chosen) nativeSelectSetter.call(el, chosen.value);
    } else if (el.isContentEditable) {
      el.focus();
      el.textContent = String(value);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function highlight(el) {
    const old = el.style.outline;
    const oldT = el.style.transition;
    el.style.transition = 'outline 0.15s';
    el.style.outline = '2px solid #1e78d2';
    setTimeout(() => {
      el.style.outline = old;
      el.style.transition = oldT;
    }, 500);
  }

  function isElementChecked(el) {
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio'))
      return el.checked;
    const aria = el.getAttribute('aria-checked');
    if (aria != null) return aria === 'true';
    const ds = el.getAttribute('data-state');
    if (ds != null) return ds === 'checked' || ds === 'on' || ds === 'active';
    return (
      el.classList.contains('checked') ||
      el.classList.contains('active') ||
      el.classList.contains('selected')
    );
  }

  function shouldClickByGuard(el, guard) {
    if (!guard || guard === 'none') return true;
    const checked = isElementChecked(el);
    if (guard === 'on') return !checked;
    if (guard === 'off') return checked;
    return true;
  }

  function buildCtx(state) {
    return {
      counters: Object.assign({}, state.counters || {}),
      smartCounters: state.smartCounters || [],
      customWordLists: state.customWordLists || [],
      url: location.href,
      dryRun: false,
      smartCountersDirty: false,
    };
  }

  function shortSelector(el) {
    if (el.id) return '#' + el.id;
    const name = el.getAttribute('name');
    if (name) return el.tagName.toLowerCase() + '[name="' + name + '"]';
    return el.tagName.toLowerCase() + (el.type ? '[type=' + el.type + ']' : '');
  }

  /* ------------ Кастомные (page-scoped) горячие клавиши ------------ */

  let pageShortcuts = [];

  // Загружает горячие клавиши, которые работают прямо внутри страницы.
  function loadPageShortcuts() {
    chrome.storage.local.get(['state'], r => {
      pageShortcuts = (r.state && r.state.pageShortcuts) || [];
    });
  }

  loadPageShortcuts();

  // Обновляет локальный список шорткатов при изменении настроек.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.state) loadPageShortcuts();
  });

  // Проверяет, совпадает ли текущее нажатие клавиш с сохранённой комбинацией.
  function eventMatches(e, sc) {
    if ((sc.key || '').toUpperCase() !== keyOfEvent(e)) return false;
    if (!!sc.ctrl !== !!e.ctrlKey) return false;
    if (!!sc.alt !== !!e.altKey) return false;
    if (!!sc.shift !== !!e.shiftKey) return false;
    return !!sc.meta === !!e.metaKey;
  }

  // Нормализует клавишу из KeyboardEvent для сравнения с настройкой.
  function keyOfEvent(e) {
    const k = e.key;
    if (!k) return '';
    if (k.length === 1) return k.toUpperCase();
    return k; // 'Enter', 'ArrowUp', etc.
  }

  // Проверяет, находится ли фокус в поле ввода.
  // Нужно, чтобы шорткаты не мешали обычному набору текста.
  function isEditableTarget(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  // Перехватывает page-scoped шорткаты и запускает соответствующее действие.
  document.addEventListener(
    'keydown',
    e => {
      if (!pageShortcuts.length) return;

      for (const sc of pageShortcuts) {
        if (!sc.action || !sc.key) continue;

        // В полях ввода запрещаем шорткаты без модификаторов,
        // чтобы не перехватывать обычный ввод текста.
        const hasMod = e.ctrlKey || e.altKey || e.metaKey;
        if (isEditableTarget(e.target) && !(sc.ctrl || sc.alt || sc.meta) && !hasMod) continue;

        if (!eventMatches(e, sc)) continue;

        e.preventDefault();
        e.stopPropagation();

        console.info('[DPI] page-shortcut fired:', formatComboFromSc(sc), '→', sc.action);

        if (sc.action === 'FILL_ALL') fillAll();
        else if (sc.action === 'FILL_SPECIAL') fillSpecial();
        else if (sc.action === 'FILL_INSERTION_BY_ID' && sc.targetId) fillSpecialById(sc.targetId);

        return;
      }
    },
    true
  );

  // Собирает комбинацию клавиш в строку для логов.
  function formatComboFromSc(sc) {
    const parts = [];
    if (sc.ctrl) parts.push('Ctrl');
    if (sc.alt) parts.push('Alt');
    if (sc.shift) parts.push('Shift');
    if (sc.meta) parts.push('Meta');
    if (sc.key) parts.push(sc.key);
    return parts.join('+');
  }

  // Запускает массовое заполнение страницы всеми активными правилами,
  // которые подходят под текущий URL.
  async function fillAll() {
    const state = await getState();
    const dbg = !!state.debugMode;
    const url = location.href;
    const rules = state.rules || [];
    if (dbg) console.info('[DPI] fillAll starting on', url, 'rules:', rules.length);

    const ctx = buildCtx(state);
    const usedFields = new WeakSet();
    const details = [];
    let filled = 0,
      matched = 0;
    let ruleCount = 0;
    const delayed = [];

    for (const rule of rules) {
      if (rule.enabled === false) continue;

      // URL-фильтр: правило выполняется только на подходящих страницах.
      if (!FF.urlMatchesConditions(rule.urlConditions, url)) {
        if (dbg) console.debug('[DPI] rule skip (url no match):', rule.name);
        continue;
      }

      ruleCount++;
      const delay = parseInt(rule.fillDelay, 10) || 0;

      // Правила с задержкой выполняются позже — полезно для динамических форм.
      if (delay > 0) {
        delayed.push({ rule, delay });
        if (dbg) console.debug('[DPI] rule deferred (' + delay + 'ms):', rule.name);
        continue;
      }

      filled += await executeRule(rule, ctx, usedFields, details, dbg);
    }

    if (delayed.length) {
      // Группируем отложенные правила по одинаковой задержке,
      // чтобы не создавать лишние таймеры.
      const groups = new Map();
      for (const d of delayed) {
        if (!groups.has(d.delay)) groups.set(d.delay, []);
        groups.get(d.delay).push(d.rule);
      }

      for (const [delay, batch] of groups) {
        setTimeout(async () => {
          if (dbg)
            console.info('[DPI] executing', batch.length, 'delayed rule(s) after', delay, 'ms');
          for (const rule of batch) {
            await executeRule(rule, ctx, usedFields, details, dbg);
          }
        }, delay);
      }
    }

    await persistCtx(state, ctx);
    if (dbg) {
      console.info(
        '[DPI] fillAll done. Активных правил:',
        ruleCount,
        '| совпадений:',
        matched,
        '| заполнено:',
        filled,
        delayed.length ? '| отложено: ' + delayed.length : ''
      );
      console.table(details);
    }
    return { filled, matched, activeRules: ruleCount, details, delayed: delayed.length };
  }

  // Ждёт появления элемента в DOM.
  // Используется после клика по triggerSelector, когда поле создаётся динамически.
  function waitForElement(selector, timeoutMs) {
    return new Promise(resolve => {
      let el = null;
      try {
        el = document.querySelector(selector);
      } catch (e) {
        return resolve(null);
      }
      if (el) return resolve(el);
      const start = Date.now();
      const iv = setInterval(() => {
        let found = null;
        try {
          found = document.querySelector(selector);
        } catch (e) {
          clearInterval(iv);
          return resolve(null);
        }
        if (found) {
          clearInterval(iv);
          resolve(found);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve(null);
        }
      }, 50);
    });
  }

  async function executeRule(rule, ctx, usedFields, details, dbg) {
    // Выполняет одно правило.
    // Правило может либо кликать по элементу, либо заполнять найденные поля шаблоном.
    // Click-action rules
    if (rule.actionType === 'click') {
      if (!rule.clickSelector) {
        if (dbg) console.debug('[DPI] rule skip (click, no selector):', rule.name);
        return 0;
      }
      if (rule.clickTriggerSelector) {
        let trigger = null;
        try {
          trigger = document.querySelector(rule.clickTriggerSelector);
        } catch (e) {
          /* bad selector */
        }
        if (trigger) {
          try {
            trigger.click();
          } catch (e) {
            /* click failed */
          }
          const wait = Math.max(50, Number(rule.clickTriggerWait) || 500);
          await new Promise(r => setTimeout(r, wait));
        } else if (dbg) {
          console.debug('[DPI]   click trigger not found:', rule.clickTriggerSelector);
        }
      }
      let target = null;
      try {
        target = document.querySelector(rule.clickSelector);
      } catch (e) {
        /* bad selector */
      }
      if (!target) {
        if (dbg) console.debug('[DPI]   click target not found:', rule.clickSelector);
        return 0;
      }
      if (!shouldClickByGuard(target, rule.clickGuard)) {
        if (dbg)
          console.debug(
            '[DPI]   click skipped (guard: already',
            rule.clickGuard === 'on' ? 'ON' : 'OFF',
            '):',
            rule.name
          );
        return 0;
      }
      try {
        target.click();
        highlight(target);
        details.push({
          rule: rule.name || '(без имени)',
          selector: shortSelector(target),
          value: '(click)',
          kind: 'click',
        });
        if (dbg) console.info('[DPI]   clicked', shortSelector(target), '(rule:', rule.name + ')');
        return 1;
      } catch (e) {
        console.warn('[DPI]   click error:', e);
        return 0;
      }
    }

    // Fill-action rules (default)
    const hits = FF.findMatches(rule);
    if (dbg) console.debug('[DPI] rule', rule.name, 'matches:', hits.length);
    let count = 0;
    for (const { el, kind } of hits) {
      if (usedFields.has(el)) {
        if (dbg) console.debug('[DPI]   field already filled by earlier rule, skip');
        continue;
      }
      usedFields.add(el);
      const raw = FF.render(rule.template || '', ctx);
      let val = raw;
      if (kind === 'checkbox' || kind === 'radio') {
        val = /^(true|1|yes|on|checked)$/i.test(raw.trim());
      }
      try {
        setValue(el, val);
        highlight(el);
        count++;
        const sel = shortSelector(el);
        details.push({ rule: rule.name || '(без имени)', selector: sel, value: String(val), kind });
        if (dbg) console.info('[DPI]   filled', sel, '=', val, '(rule:', rule.name + ')');
      } catch (e) {
        console.warn('[DPI]   setValue error:', e);
      }
    }
    return count;
  }

  // Выполняет специальную вставку по id.
  // Используется для пользовательских горячих клавиш, привязанных к конкретной вставке.
  async function fillSpecialById(insertionId) {
    const state = await getState();
    const ins = (state.specialInsertions || []).find(
      i => i.id === insertionId && i.enabled !== false
    );
    if (!ins) return { filled: 0, reason: 'not-found' };
    return await runInsertion(state, ins);
  }

  // Ищет первую активную специальную вставку, подходящую под текущий URL.
  async function fillSpecial() {
    const state = await getState();
    const url = location.href;
    const ins = (state.specialInsertions || []).find(
      i => i.enabled !== false && FF.urlMatches([i.urlPattern], url)
    );
    if (!ins) return { filled: 0, reason: 'no-insertion' };
    return await runInsertion(state, ins);
  }

  // Выполняет специальную вставку:
  // находит цель, при необходимости кликает triggerSelector,
  // затем либо кликает по цели, либо вставляет значение из шаблона.
  async function runInsertion(state, ins) {
    const dbg = !!state.debugMode;
    if (dbg) console.info('[DPI] runInsertion:', ins.name || ins.id);
    if (!ins.targetSelector) return { filled: 0, reason: 'no-target-selector' };

    // 1) Пробуем найти цель сразу — сценарий, когда кнопка уже нажата и input виден
    let el = null;
    try {
      el = document.querySelector(ins.targetSelector);
    } catch (e) {
      return { filled: 0, reason: 'bad-selector' };
    }

    // 2) Цели нет и есть триггер — кликаем и ждём
    let usedTrigger = false;
    if (!el && ins.triggerSelector) {
      let trigger = null;
      try {
        trigger = document.querySelector(ins.triggerSelector);
      } catch (e) {
        return { filled: 0, reason: 'bad-trigger-selector' };
      }
      if (!trigger) return { filled: 0, reason: 'trigger-not-found' };
      try {
        trigger.click();
      } catch (e) {
        return { filled: 0, reason: 'trigger-click-failed' };
      }
      usedTrigger = true;
      const wait = Math.max(50, Number(ins.triggerWait) || 300);
      el = await waitForElement(ins.targetSelector, wait + 500);
    }

    if (!el)
      return {
        filled: 0,
        reason: usedTrigger ? 'target-not-found-after-trigger' : 'target-not-found',
      };

    // Спецвставка может быть не только вводом значения, но и click-действием.
    if (ins.actionType === 'click') {
      if (!shouldClickByGuard(el, ins.clickGuard)) {
        if (dbg) console.info('[DPI]   click skipped (guard):', shortSelector(el));
        return { filled: 0, reason: 'guard-skip' };
      }
      try {
        el.click();
      } catch (e) {
        return { filled: 0, reason: 'click-failed' };
      }
      highlight(el);
      if (dbg) console.info('[DPI]   clicked', shortSelector(el));
      return { filled: 1, action: 'click', usedTrigger, selector: shortSelector(el) };
    }

    const kind = FF.fieldKind(el);
    if (
      kind !== 'input' &&
      kind !== 'textarea' &&
      kind !== 'checkbox' &&
      kind !== 'radio' &&
      kind !== 'select'
    ) {
      return { filled: 0, reason: 'not-input' };
    }

    const ctx = buildCtx(state);
    const value = FF.render(ins.valueTemplate || '', ctx);
    if (dbg) console.info('[DPI]   template:', ins.valueTemplate, '→', value);

    try {
      el.focus();
    } catch (e) {}

    // Перед вставкой очищаем текстовые поля, но не очищаем checkbox/radio/select.
    if (kind !== 'checkbox' && kind !== 'radio' && kind !== 'select') {
      setValue(el, '');
    }

    setValue(el, value);
    highlight(el);
    await persistCtx(state, ctx);
    if (dbg) console.info('[DPI]   inserted into', shortSelector(el), '=', value);
    return { filled: 1, value, usedTrigger, selector: shortSelector(el) };
  }

  // Читает состояние расширения из chrome.storage.local.
  function getState() {
    return new Promise(resolve => {
      chrome.storage.local.get(['state'], r =>
        resolve(r.state || { profiles: [], specialInsertions: [], smartCounters: [], counters: {} })
      );
    });
  }

  // Сохраняет изменения счётчиков после рендера шаблонов.
  function persistCtx(state, ctx) {
    state.counters = ctx.counters;
    // state.smartCounters — тот же массив, что ctx.smartCounters, генератор мутировал его in-place.
    return new Promise(resolve => chrome.storage.local.set({ state }, resolve));
  }

  // Роутер сообщений от popup/background/options.
  // Возвращает true для асинхронных ответов, чтобы sendResponse оставался активным.
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'FILL_ALL') {
      fillAll().then(sendResponse);
      return true;
    }
    if (msg && msg.type === 'FILL_SPECIAL') {
      fillSpecial().then(sendResponse);
      return true;
    }
    if (msg && msg.type === 'FILL_INSERTION_BY_ID') {
      fillSpecialById(msg.id).then(sendResponse);
      return true;
    }
    if (msg && msg.type === 'PICK_ELEMENT') {
      FF.startPicker().then(sendResponse);
      return true;
    }
    if (msg && msg.type === 'PREVIEW_TEMPLATE') {
      const ctx = { counters: {} };
      try {
        sendResponse({ ok: true, value: FF.render(msg.template || '', ctx) });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
      return false;
    }
    if (msg && msg.type === 'SCRAPE_FIELDS') {
      const sel = msg.parentSelector || 'div.debug_plugin_client';
      const parent = document.querySelector(sel);
      if (!parent) {
        sendResponse({ ok: false, fields: [], error: 'Элемент не найден: ' + sel });
        return false;
      }
      const rows = parent.querySelectorAll('table tbody tr');
      const fields = [];
      rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 2) fields.push(tds[1].textContent.trim());
      });
      sendResponse({ ok: true, fields });
      return false;
    }
    if (msg && msg.type === 'SCRAPE_PAGE') {
      const sel = msg.parentSelector || 'div.debug_plugin_client';
      const parent = document.querySelector(sel);
      if (!parent) {
        sendResponse({ ok: false, data: [], error: 'Элемент не найден' });
        return false;
      }
      const rows = parent.querySelectorAll('table tbody tr');
      const data = [];
      rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 3) {
          data.push({ key: tds[1].textContent.trim(), value: tds[2].textContent.trim() });
        }
      });
      sendResponse({ ok: true, data });
      return false;
    }
    if (msg && msg.type === 'COPYFX_GET_TRADERS') {
      // Обрабатывается в background.js через chrome.scripting.executeScript в MAIN world.
      return false;
    }
  });

  window.FF = window.FF || {};
  window.FF.fillAll = fillAll;
  window.FF.fillSpecial = fillSpecial;
  window.FF.fillSpecialById = fillSpecialById;
})();
