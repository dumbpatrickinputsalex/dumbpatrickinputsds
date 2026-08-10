// Анализ вставленного outerHTML: селектор + предложения шаблона по типу поля.
// Экспорт: window.FFAnalyzer.analyze(html, url) -> { ok, element, selector, urlPattern, suggestions }

(function () {
  function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cssEscape(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/(["\\])/g, '\\$1'); }

  function isStableId(id) {
    if (!id) return false;
    if (/^:/.test(id)) return false;                        // React :r0:
    if (/^ember\d+/i.test(id)) return false;
    if (/^__/.test(id)) return false;
    if (/^[a-z]+-\d+-/i.test(id)) return false;             // react-select-9-input
    if (/^[a-z]{1,4}-?[0-9a-f]{8,}$/i.test(id)) return false; // hash-подобные
    if (id.length > 40) return false;
    return true;
  }

  function isStableClass(c) {
    if (!c) return false;
    // CSS modules: name_hash, name--hash
    if (/^[a-zA-Z][\w-]*(?:_+|--+)[a-zA-Z0-9]{4,}/.test(c)) return false;
    if (/^[a-z]{1,2}\d+$/i.test(c)) return false;           // короткие обфусцированные
    if (/^_[a-z0-9]{4,}/i.test(c)) return false;
    if (/\d{5,}/.test(c)) return false;
    return true;
  }

  function buildSelector(el) {
    const tag = el.tagName.toLowerCase();

    // 1) id
    const id = el.getAttribute('id');
    if (isStableId(id)) return '#' + cssEscape(id);

    // 2) тестовые data-* атрибуты
    for (const attr of ['data-testid', 'data-test', 'data-qa', 'data-cy', 'data-test-id', 'data-e2e']) {
      const v = el.getAttribute(attr);
      if (v) return tag + '[' + attr + '="' + v.replace(/"/g, '\\"') + '"]';
    }

    // 3) name
    const name = el.getAttribute('name');
    if (name) return tag + '[name="' + name.replace(/"/g, '\\"') + '"]';

    // 4) aria-label
    const aria = el.getAttribute('aria-label');
    if (aria && aria.length < 60) return tag + '[aria-label="' + aria.replace(/"/g, '\\"') + '"]';

    // 5) autocomplete
    const autoc = el.getAttribute('autocomplete');
    if (autoc && autoc !== 'off' && autoc !== 'on') return tag + '[autocomplete="' + autoc + '"]';

    // 6) type + placeholder
    const type = el.getAttribute('type');
    const placeholder = el.getAttribute('placeholder');
    if (type && placeholder) return tag + '[type="' + type + '"][placeholder="' + placeholder.replace(/"/g, '\\"') + '"]';
    if (placeholder) return tag + '[placeholder="' + placeholder.replace(/"/g, '\\"') + '"]';

    // 7) стабильные классы
    const cls = el.getAttribute('class');
    if (cls) {
      const stable = cls.split(/\s+/).filter(Boolean).filter(isStableClass);
      if (stable.length) return tag + '.' + stable.map(cssEscape).join('.');
    }

    // 8) только type
    if (type) return tag + '[type="' + type + '"]';

    return tag;
  }

  function autoUrlPattern(rawUrl) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl);
      // предлагаем host+path — самое надёжное
      return escapeRegex(u.host + u.pathname);
    } catch (e) {
      return escapeRegex(rawUrl);
    }
  }

  // Guess по совокупности сигналов: name, id, placeholder, aria-label, автозаполнение.
  function guessCategory(el) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return 'longtext';
    if (tag === 'select') return 'select';

    if (type === 'email') return 'email';
    if (type === 'tel') return 'phone';
    if (type === 'url') return 'url';
    if (type === 'password') return 'password';
    if (type === 'number') return 'number';
    if (type === 'date') return 'date';
    if (type === 'datetime-local') return 'datetime';
    if (type === 'time') return 'time';
    if (type === 'month') return 'month';
    if (type === 'week') return 'week';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'color') return 'color';
    if (type === 'range') return 'number';
    if (type === 'search') return 'text';
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') return 'skip';

    const bag = [
      el.getAttribute('name'),
      el.getAttribute('id'),
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-testid')
    ].filter(Boolean).join(' ').toLowerCase();

    const has = (arr) => arr.some(k => bag.includes(k));
    if (has(['email', 'e-mail', 'mail', 'почт'])) return 'email';
    if (has(['phone', 'tel', 'mobile', 'моб', 'телеф'])) return 'phone';
    if (has(['card', 'pan', 'карт'])) return 'card';
    if (has(['cvc', 'cvv', 'ccv', 'securitycode'])) return 'cvc';
    if (has(['expir', 'exp-', 'exp_', 'срок'])) return 'expiry';
    if (has(['amount', 'price', 'sum', 'total', 'cost', 'стоимость', 'цена', 'сумм'])) return 'money';
    if (has(['currency', 'валют'])) return 'currency';
    if (has(['firstname', 'first-name', 'first_name', 'given', 'имя'])) return 'firstname';
    if (has(['lastname', 'last-name', 'last_name', 'surname', 'family', 'фамил'])) return 'lastname';
    if (has(['fullname', 'full-name', 'full_name', 'полное имя', 'фио'])) return 'fullname';
    if (has(['company', 'organization', 'organisation', 'компан', 'организац'])) return 'company';
    if (has(['address', 'street', 'адрес', 'улиц'])) return 'address';
    if (has(['city', 'town', 'город'])) return 'city';
    if (has(['zip', 'postal', 'индекс', 'почт-инд'])) return 'zip';
    if (has(['country', 'страна'])) return 'country';
    if (has(['login', 'username', 'user-name', 'user_name', 'логин', 'пользоват'])) return 'login';
    if (has(['inn', 'инн'])) return 'inn';
    if (has(['snils', 'снилс'])) return 'snils';
    if (has(['ogrn', 'огрн'])) return 'ogrn';
    if (has(['url', 'website', 'site', 'сайт'])) return 'url';
    if (has(['dob', 'birth', 'рожден'])) return 'birthdate';
    if (has(['comment', 'message', 'description', 'коммент', 'сообщен', 'описан'])) return 'longtext';
    if (has(['code', 'otp', 'confirm', 'код'])) return 'otp';
    return 'text';
  }

  // Возвращает список предложений {label, template, desc}.
  function suggestionsFor(category, el) {
    const s = [];
    switch (category) {
      case 'email':
        s.push({ label: 'Случайный email', template: '{{email}}', desc: 'ivan.petrov42@example.com' });
        s.push({ label: 'Email с меткой времени', template: 'test+{{now:yyyyMMddHHmmss}}@example.com', desc: 'Плюс-адрес для уникальности' });
        s.push({ label: 'Email на mail.ru', template: '{{email:mail.ru}}' });
        break;
      case 'phone':
        s.push({ label: 'Российский моб. в формате', template: '{{phone}}', desc: '+7 (912) 345-67-89' });
        s.push({ label: 'Только цифры', template: '{{phone:79#########}}' });
        break;
      case 'password':
        s.push({ label: 'Тестовый пароль', template: 'Test{{regex:[A-Z]{2}}}{{number:100:999}}!', desc: 'Смешанный регистр, цифры, спецсимвол' });
        s.push({ label: 'Простой', template: 'Password123!' });
        s.push({ label: 'Длинный случайный', template: '{{regex:[A-Za-z0-9]{16}}}' });
        break;
      case 'card':
        s.push({ label: 'Тестовая карта Visa', template: '4111 1111 1111 1111', desc: 'Только для тестирования!' });
        s.push({ label: 'Тестовая MasterCard', template: '5555 5555 5555 4444' });
        s.push({ label: 'Тестовая карта без пробелов', template: '4242424242424242' });
        break;
      case 'cvc':
        s.push({ label: '3 цифры', template: '{{regex:\\d{3}}}' });
        s.push({ label: '123', template: '123' });
        break;
      case 'expiry':
        s.push({ label: 'MM/YY (в будущем)', template: '{{number:1:12}}/29' });
        s.push({ label: 'MM/YYYY', template: '{{number:1:12}}/2029' });
        break;
      case 'money':
        s.push({ label: 'Число 1000–9999', template: '{{number:1000:9999}}' });
        s.push({ label: 'Крупная сумма', template: '{{number:10000:99999}}' });
        break;
      case 'currency':
        s.push({ label: 'RUB', template: 'RUB' });
        s.push({ label: 'USD', template: 'USD' });
        s.push({ label: 'Случайная из списка', template: '{{pick:RUB|USD|EUR|KZT|BYN}}' });
        break;
      case 'firstname':
        s.push({ label: 'Случайное имя', template: '{{name.first}}' });
        break;
      case 'lastname':
        s.push({ label: 'Случайная фамилия', template: '{{name.last}}' });
        break;
      case 'fullname':
        s.push({ label: 'Полное имя', template: '{{name.full}}' });
        break;
      case 'company':
        s.push({ label: 'Название компании', template: '{{company}}' });
        break;
      case 'address':
        s.push({ label: 'Полный адрес', template: '{{address}}' });
        s.push({ label: 'Только улица+дом', template: '{{street}}' });
        break;
      case 'city':
        s.push({ label: 'Город', template: '{{city}}' });
        break;
      case 'zip':
        s.push({ label: '6-значный индекс РФ', template: '{{regex:\\d{6}}}' });
        break;
      case 'country':
        s.push({ label: 'Россия', template: 'Россия' });
        s.push({ label: 'Случайная из списка', template: '{{pick:Россия|Казахстан|Беларусь|Украина}}' });
        break;
      case 'login':
        s.push({ label: 'user + число', template: 'user{{number:1000:9999}}' });
        s.push({ label: 'transliterated', template: 'test_{{now:yyyyMMdd}}' });
        break;
      case 'inn':
        s.push({ label: '12 цифр (физлицо)', template: '{{regex:\\d{12}}}' });
        s.push({ label: '10 цифр (юрлицо)', template: '{{regex:\\d{10}}}' });
        break;
      case 'snils':
        s.push({ label: 'XXX-XXX-XXX XX', template: '{{regex:\\d{3}}}-{{regex:\\d{3}}}-{{regex:\\d{3}}} {{regex:\\d{2}}}' });
        break;
      case 'ogrn':
        s.push({ label: '13 цифр', template: '{{regex:\\d{13}}}' });
        break;
      case 'url':
        s.push({ label: 'Случайный URL', template: 'https://example.com/{{regex:[a-z]{6}}}' });
        break;
      case 'otp':
        s.push({ label: '4 цифры', template: '{{regex:\\d{4}}}' });
        s.push({ label: '6 цифр', template: '{{regex:\\d{6}}}' });
        break;
      case 'date':
        s.push({ label: 'Сегодня', template: '{{now:yyyy-MM-dd}}' });
        s.push({ label: 'Случайная за 5 лет', template: '{{date:2020-01-01:2025-12-31:yyyy-MM-dd}}' });
        break;
      case 'datetime':
        s.push({ label: 'Сейчас', template: '{{now:yyyy-MM-ddTHH:mm}}' });
        break;
      case 'time':
        s.push({ label: 'Текущее время', template: '{{now:HH:mm}}' });
        s.push({ label: '09:00', template: '09:00' });
        break;
      case 'month':
        s.push({ label: 'Текущий месяц', template: '{{now:yyyy-MM}}' });
        break;
      case 'week':
        s.push({ label: 'Текущая неделя', template: '{{now:yyyy}}-W{{number:1:52}}' });
        break;
      case 'birthdate':
        s.push({ label: 'Взрослый (18–60 лет)', template: '{{date:1965-01-01:2007-12-31:yyyy-MM-dd}}' });
        break;
      case 'number':
        s.push({ label: '1–100', template: '{{number:1:100}}' });
        s.push({ label: '1–1000', template: '{{number:1:1000}}' });
        break;
      case 'color':
        s.push({ label: 'Случайный HEX', template: '#{{regex:[0-9a-f]{6}}}' });
        break;
      case 'checkbox':
        s.push({ label: 'Отметить', template: 'true' });
        s.push({ label: 'Снять отметку', template: 'false' });
        break;
      case 'radio': {
        const val = el.getAttribute('value');
        if (val) s.push({ label: 'Выбрать этот radio', template: 'true', desc: 'value="' + val + '"' });
        else s.push({ label: 'Выбрать этот radio', template: 'true' });
        break;
      }
      case 'select': {
        // распарсим <option>
        const opts = Array.from(el.querySelectorAll('option'))
          .map(o => (o.getAttribute('value') || o.textContent).trim())
          .filter(v => v && v !== '-1');
        if (opts.length) {
          s.push({ label: 'Случайный из опций', template: '{{pick:' + opts.slice(0, 10).map(v => v.replace(/\|/g, '')).join('|') + '}}', desc: opts.length > 10 ? 'первые 10 из ' + opts.length : opts.length + ' опций' });
          for (const o of opts.slice(0, 3)) s.push({ label: 'Всегда: ' + o, template: o });
        } else {
          s.push({ label: 'Первый непустой option', template: '{{pick:option1|option2}}', desc: 'дозаполните вручную' });
        }
        break;
      }
      case 'longtext':
        s.push({ label: 'Один абзац', template: '{{lorem.paragraph:2}}' });
        s.push({ label: 'Короткий комментарий', template: '{{lorem.sentence:8}}' });
        s.push({ label: 'Длинный текст', template: '{{lorem.paragraph:4}}' });
        break;
      default: // text
        // если есть pattern, попробуем regex
        {
          const pattern = el.getAttribute('pattern');
          const maxLen = parseInt(el.getAttribute('maxlength'), 10);
          if (pattern) s.push({ label: 'По HTML pattern', template: '{{regex:' + pattern + '}}', desc: 'из атрибута pattern' });
          if (maxLen > 0 && maxLen < 40) s.push({ label: 'Латиница до maxlength', template: '{{regex:[a-z]{' + Math.min(maxLen, 12) + '}}}' });
          s.push({ label: 'Короткий текст', template: '{{lorem.words:3}}' });
          s.push({ label: 'Слово + число', template: '{{lorem.words:1}}_{{number:100:999}}' });
        }
    }
    // Всегда добавляем "свой шаблон"
    s.push({ label: '✎ Свой шаблон', template: '', desc: 'написать вручную' });
    return s;
  }

  function describeElement(el) {
    const parts = [];
    parts.push('<' + el.tagName.toLowerCase() + '>');
    const attrs = ['type', 'name', 'id', 'placeholder', 'aria-label', 'autocomplete', 'maxlength'];
    for (const a of attrs) {
      const v = el.getAttribute(a);
      if (v) parts.push(a + '=' + JSON.stringify(v.length > 30 ? v.slice(0, 30) + '…' : v));
    }
    return parts.join(' ');
  }

  function analyze(html, url) {
    if (!html || !html.trim()) return { ok: false, error: 'Пустой HTML' };
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    // первый форм-элемент; если пусто — первый ребёнок вообще
    let el = doc.querySelector('input, textarea, select, button, [contenteditable]');
    if (!el) el = doc.body.firstElementChild && doc.body.firstElementChild.firstElementChild;
    if (!el) return { ok: false, error: 'Не удалось распознать элемент' };

    const category = guessCategory(el);
    if (category === 'skip') return { ok: false, error: 'Элемент типа ' + (el.getAttribute('type') || el.tagName) + ' не поддерживается для заполнения' };

    const selector = buildSelector(el);
    const urlPattern = autoUrlPattern(url);
    const suggestions = suggestionsFor(category, el);

    return {
      ok: true,
      category,
      element: describeElement(el),
      tagName: el.tagName.toLowerCase(),
      selector,
      urlPattern,
      suggestions
    };
  }

  // Анализирует HTML произвольного элемента (обычно <button> или <a>) для триггера.
  // Возвращает { ok, selector, element } — без категории/шаблонов.
  function analyzeTrigger(html) {
    if (!html || !html.trim()) return { ok: false, error: 'Пустой HTML' };
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    let el = doc.body.firstElementChild && doc.body.firstElementChild.firstElementChild;
    // если это обёртка вроде <label><input ...>...</label> — берём именно кликабельное
    if (!el) return { ok: false, error: 'Не удалось распознать элемент' };
    if (el.tagName === 'LABEL' || el.tagName === 'DIV') {
      const inner = el.querySelector('button, a, [role="button"], [onclick]');
      if (inner) el = inner;
    }
    return {
      ok: true,
      selector: buildSelector(el),
      element: describeElement(el),
      tagName: el.tagName.toLowerCase()
    };
  }

  window.FFAnalyzer = { analyze, analyzeTrigger, escapeRegex, autoUrlPattern, buildSelector, guessCategory, suggestionsFor };
})();
