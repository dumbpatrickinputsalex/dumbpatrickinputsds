// Overlay-пикер элемента: подсвечивает элемент под курсором и возвращает
// CSS-селектор при клике. Отмена по Esc.

(function () {
  let active = false;
  let resolveFn = null;
  let overlay, label;

  function buildSelector(el) {
    if (!(el instanceof Element)) return '';
    // 1) id — приоритет
    if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
      return '#' + CSS.escape(el.id);
    }
    // 2) name атрибут
    const name = el.getAttribute('name');
    if (name) {
      const sel = el.tagName.toLowerCase() + '[name="' + name.replace(/"/g, '\\"') + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    // 3) data-* атрибуты
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-') && attr.value) {
        const sel =
          el.tagName.toLowerCase() +
          '[' +
          attr.name +
          '="' +
          attr.value.replace(/"/g, '\\"') +
          '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }
    // 4) путь nth-child
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      let part = cur.tagName.toLowerCase();
      if (cur.parentElement) {
        const same = Array.from(cur.parentElement.children).filter(c => c.tagName === cur.tagName);
        if (same.length > 1) {
          const idx = same.indexOf(cur) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      cur = cur.parentElement;
      if (parts.length > 5) break;
    }
    return parts.join(' > ');
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;pointer-events:none;z-index:2147483646;' +
      'border:2px solid #1e78d2;background:rgba(30,120,210,0.10);border-radius:2px;' +
      'transition:all 0.05s linear;';
    label = document.createElement('div');
    label.style.cssText =
      'position:fixed;z-index:2147483647;background:#1e78d2;color:#fff;' +
      'font:12px/1.4 system-ui,sans-serif;padding:4px 8px;border-radius:4px;' +
      'pointer-events:none;max-width:60vw;word-break:break-all;';
    label.textContent = 'Клик — выбрать • Esc — отмена';
  }

  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === label) return;
    const r = el.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    label.style.left = Math.min(window.innerWidth - 300, r.left) + 'px';
    label.style.top = Math.max(0, r.top - 24) + 'px';
    label.textContent = buildSelector(el);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    stop({ ok: true, selector: buildSelector(el) });
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      stop({ ok: false, cancelled: true });
    }
  }

  function stop(result) {
    if (!active) return;
    active = false;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (label && label.parentNode) label.parentNode.removeChild(label);
    if (resolveFn) {
      const r = resolveFn;
      resolveFn = null;
      r(result);
    }
  }

  function startPicker() {
    return new Promise(resolve => {
      if (active) {
        resolve({ ok: false, error: 'already-active' });
        return;
      }
      active = true;
      resolveFn = resolve;
      ensureOverlay();
      document.body.appendChild(overlay);
      document.body.appendChild(label);
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey, true);
    });
  }

  window.FF = window.FF || {};
  window.FF.startPicker = startPicker;
})();
