// domain/templates/template-parser.js
export class TemplateParser {
  /**
 * Разбирает шаблон на токены и текст.
 * @param {*} template - Описание параметра.
 * @returns {void}
 */
parse(template) {
    if (!template) return [];
    const parts = [];
    let index = 0;
    let inToken = false;
    let tokenStart = 0;
    let escapeNext = false;

    for (let i = 0; i < template.length; i++) {
      const ch = template[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (ch === '\\') {
        escapeNext = true;
        continue;
      }

      if (ch === '{' && i + 1 < template.length && template[i + 1] === '{') {
        if (!inToken) {
          // Добавляем текст перед токеном
          if (i > index) {
            parts.push({ type: 'text', value: template.substring(index, i) });
          }
          inToken = true;
          tokenStart = i + 2;
          i++; // пропускаем второй {
        }
        continue;
      }

      if (ch === '}' && i + 1 < template.length && template[i + 1] === '}' && inToken) {
        const token = template.substring(tokenStart, i).trim();
        parts.push({ type: 'token', value: token });
        inToken = false;
        index = i + 2;
        i++; // пропускаем вторую }
        continue;
      }
    }

    if (index < template.length) {
      parts.push({ type: 'text', value: template.substring(index) });
    }

    return parts;
  }
}
