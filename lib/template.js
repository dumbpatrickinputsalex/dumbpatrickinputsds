// Mustache-подобный парсер.
// Синтаксис:
//   {{token}}                     — вызов генератора без параметров
//   {{token:param1:param2}}       — с параметрами (двоеточие как разделитель)
//   {{regex:[a-z]{5}}}            — regex: всё после первого двоеточия — аргумент
//   Экранирование: \{{ и \}} остаются литералами.
//
// Специальные случаи:
//   - Для 'pick' разделитель значений — '|', параметры двоеточием не разбиваем.
//   - Для 'regex' всё после первого двоеточия — единый аргумент (может содержать :).
//   - Для 'date' до 3 параметров через двоеточие: from|to|формат.
//
// Возвращает объект { render(ctx) -> string, tokens: [...] } для превью и отладки.

(function () {
  // Токены, где первый параметр — сложная строка (regex, целый список pick).
  const RAW_TOKENS = new Set(['regex', 'pick']);

  function parse(template) {
    const parts = [];
    const tokens = [];
    if (typeof template !== 'string') return { parts, tokens };
    let i = 0;
    while (i < template.length) {
      // экранирование
      if (
        template[i] === '\\' &&
        (template.substr(i + 1, 2) === '{{' || template.substr(i + 1, 2) === '}}')
      ) {
        parts.push({ type: 'text', value: template.substr(i + 1, 2) });
        i += 3;
        continue;
      }
      if (template[i] === '{' && template[i + 1] === '{') {
        const end = template.indexOf('}}', i + 2);
        if (end === -1) {
          parts.push({ type: 'text', value: template.slice(i) });
          break;
        }
        const inner = template.slice(i + 2, end).trim();
        let name, args;
        const colon = inner.indexOf(':');
        if (colon === -1) {
          name = inner;
          args = [];
        } else {
          name = inner.slice(0, colon).trim();
          const rest = inner.slice(colon + 1);
          args = RAW_TOKENS.has(name) ? [rest] : rest.split(':').map(s => s.trim());
        }
        parts.push({ type: 'token', name, args });
        tokens.push(name);
        i = end + 2;
      } else {
        // накапливаем литерал до следующего {{
        let j = i;
        while (j < template.length) {
          if (
            template[j] === '\\' &&
            (template.substr(j + 1, 2) === '{{' || template.substr(j + 1, 2) === '}}')
          )
            break;
          if (template[j] === '{' && template[j + 1] === '{') break;
          j++;
        }
        parts.push({ type: 'text', value: template.slice(i, j) });
        i = j;
      }
    }
    return { parts, tokens };
  }

  function render(template, ctx) {
    const generators = (window.FF && window.FF.generators) || {};
    const c = ctx || {};
    const { parts } = parse(template);
    let out = '';
    for (const p of parts) {
      if (p.type === 'text') {
        out += p.value;
        continue;
      }
      const gen = generators[p.name];
      if (!gen) {
        out += '{{' + p.name + (p.args.length ? ':' + p.args.join(':') : '') + '}}';
        continue;
      }
      try {
        out += String(gen(p.args, c));
      } catch (e) {
        out += '<' + p.name + '_ERR>';
      }
    }
    return out;
  }

  window.FF = window.FF || {};
  window.FF.parse = parse;
  window.FF.render = render;
})();
