// domain/matching/label-resolver.js
export class LabelResolver {
  /**
 * Получает текст лейбла для элемента.
 * @param {*} element - Описание параметра.
 * @returns {*} Результат операции.
 */
getLabelText(element) {
    if (!element) return '';

    // aria-label
    if (element.hasAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }

    // aria-labelledby
    if (element.hasAttribute('aria-labelledby')) {
      const id = element.getAttribute('aria-labelledby');
      const labelEl = document.getElementById(id);
      if (labelEl) return labelEl.textContent?.trim() || '';
    }

    // label[for]
    if (element.id) {
      const label = document.querySelector(label[for=""]);
      if (label) return label.textContent?.trim() || '';
    }

    // wrapping label
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName?.toLowerCase() === 'label') {
        return parent.textContent?.trim() || '';
      }
      parent = parent.parentElement;
    }

    // placeholder
    if (element.hasAttribute('placeholder')) {
      return element.getAttribute('placeholder');
    }

    return '';
  }
}
