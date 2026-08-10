// domain/matching/field-kind-detector.js
export class FieldKindDetector {
  /**
 * Определяет тип поля.
 * @param {*} element - Описание параметра.
 * @returns {void}
 */
detect(element) {
    if (!element) return 'unknown';

    const tag = element.tagName?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();

    // Проверяем по типу
    if (tag === 'input') {
      if (type === 'email' || name.includes('email') || id.includes('email')) return 'email';
      if (type === 'tel' || name.includes('phone') || id.includes('phone')) return 'phone';
      if (type === 'number') return 'number';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'password') return 'password';
      if (type === 'hidden' || type === 'submit' || type === 'button') return 'ignored';
      if (name.includes('name') || id.includes('name')) return 'name';
      if (name.includes('last') || id.includes('last')) return 'lastname';
      if (name.includes('first') || id.includes('first')) return 'firstname';
      return 'text';
    }

    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'button') return 'ignored';

    return 'unknown';
  }
}
