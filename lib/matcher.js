// Матчинг полей по правилу.
// Условия расположены в списке; между соседними условиями — connector ('AND' | 'OR').
// Если rule.match.customLogic === false — connectors игнорируются, все условия соединяются AND.
// Иначе — вычисление слева направо с per-condition connectors (у первого условия connector игнорируется).
//
// Правило:
//   {
//     id, name, template,
//     enabled: true,
//     targets: ['input','textarea','select','checkbox','radio'],
//     urlPatterns: [regex, ...],                             // ← переехало сюда с профиля
//     match: {
//       customLogic: false,                                  // ← toggle
//       conditions: [
//         { type:'selector', value:'#email', connector:'AND' },
//         { type:'attribute', attr:'name', pattern:'mail', regex:false, connector:'OR' },
//         { type:'order', index:2, connector:'AND' }
//       ]
//     }
//   }

(function () {
  function getLabelText(el) {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria;
    const alb = el.getAttribute('aria-labelledby');
    if (alb) { const lbl = document.getElementById(alb); if (lbl) return lbl.textContent.trim(); }
    if (el.id) {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) return l.textContent.trim();
    }
    let p = el.parentElement;
    while (p) {
      if (p.tagName === 'LABEL') return p.textContent.trim();
      p = p.parentElement;
    }
    return '';
  }

  function fieldKind(el) {
    if (el.tagName === 'TEXTAREA') return 'textarea';
    if (el.tagName === 'SELECT') return 'select';
    if (el.tagName === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      if (t === 'hidden' || t === 'submit' || t === 'button' || t === 'reset' || t === 'file' || t === 'image') return null;
      return 'input';
    }
    if (el.isContentEditable) return 'contenteditable';
    return null;
  }

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[\s_\-.]+/g, '');
  }

  function testAttr(el, attr, pattern, useRegex) {
    let hay = '';
    switch (attr) {
      case 'label': hay = getLabelText(el); break;
      case 'class': hay = el.className || ''; break;
      case 'type':  hay = el.type || el.tagName.toLowerCase(); break;
      default:      hay = el.getAttribute(attr) || '';
    }
    if (!pattern) return !!hay;
    if (useRegex) {
      try { return new RegExp(pattern, 'i').test(hay); }
      catch (e) { return false; }
    }
    return normalize(hay).includes(normalize(pattern));
  }

  function testCondition(el, cond, indexInForm) {
    switch (cond.type) {
      case 'selector':
        try { return el.matches(cond.value); } catch (e) { return false; }
      case 'attribute':
        return testAttr(el, cond.attr, cond.pattern, !!cond.regex);
      case 'order':
        return indexInForm === (parseInt(cond.index, 10) - 1);
      default:
        return false;
    }
  }

  // Слева-направо, без precedence (пользователь управляет порядком условий сам).
  function evalConditions(el, conditions, customLogic, indexInForm) {
    if (!conditions || !conditions.length) return false;
    if (!customLogic) {
      for (const c of conditions) {
        if (!testCondition(el, c, indexInForm)) return false;
      }
      return true;
    }
    let acc = testCondition(el, conditions[0], indexInForm);
    for (let i = 1; i < conditions.length; i++) {
      const r = testCondition(el, conditions[i], indexInForm);
      const conn = (conditions[i].connector || 'AND').toUpperCase();
      acc = conn === 'OR' ? (acc || r) : (acc && r);
    }
    return acc;
  }

  function findMatches(rule, root) {
    root = root || document;
    const conds = (rule.match && rule.match.conditions) || [];
    const customLogic = !!(rule.match && rule.match.customLogic);
    if (conds.length === 0) return [];

    const allowedKinds = new Set(rule.targets && rule.targets.length
      ? rule.targets
      : ['input', 'textarea', 'select', 'checkbox', 'radio', 'contenteditable']);

    const nodes = Array.from(root.querySelectorAll('input, textarea, select, [contenteditable="true"]'));
    const perFormIndex = new WeakMap();
    const globalIndex = new Map();
    for (const el of nodes) {
      const kind = fieldKind(el);
      if (!kind) continue;
      const form = el.form || root;
      const idx = (globalIndex.get(form) || 0);
      globalIndex.set(form, idx + 1);
      perFormIndex.set(el, idx);
    }

    const out = [];
    for (const el of nodes) {
      const kind = fieldKind(el);
      if (!kind || !allowedKinds.has(kind)) continue;
      const idx = perFormIndex.get(el);
      if (evalConditions(el, conds, customLogic, idx)) out.push({ el, kind });
    }
    return out;
  }

  function urlMatches(patterns, url) {
    if (!patterns || patterns.length === 0) return true; // пусто = глобальное правило
    for (const p of patterns) {
      const s = String(p || '').trim();
      if (!s) continue;
      try { if (new RegExp(s).test(url)) return true; }
      catch (e) { if (url.includes(s)) return true; }
    }
    return false;
  }

  // Поддерживает wildcards `*` в contains-условии. Каждое условие — { value, connector }.
  // connector первого условия игнорируется. Слева-направо.
  function urlMatchesConditions(conditions, url) {
    if (!conditions || conditions.length === 0) return true;
    const active = conditions.filter(c => c && String(c.value || '').trim());
    if (!active.length) return true;
    let acc = testUrlCond(active[0], url);
    for (let i = 1; i < active.length; i++) {
      const r = testUrlCond(active[i], url);
      const conn = (active[i].connector || 'AND').toUpperCase();
      acc = conn === 'OR' ? (acc || r) : (acc && r);
    }
    return acc;
  }
  function testUrlCond(cond, url) {
    const val = String(cond.value || '').trim();
    if (!val) return true;
    // конвертируем wildcards: экранируем regex-спецсимволы, потом * → .*
    const pattern = val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    try { return new RegExp(pattern, 'i').test(url); }
    catch (e) { return url.toLowerCase().includes(val.toLowerCase()); }
  }

  window.FF = window.FF || {};
  window.FF.findMatches = findMatches;
  window.FF.urlMatches = urlMatches;
  window.FF.urlMatchesConditions = urlMatchesConditions;
  window.FF.getLabelText = getLabelText;
  window.FF.fieldKind = fieldKind;
  window.FF.evalConditions = evalConditions;
})();
