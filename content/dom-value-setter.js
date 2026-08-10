// content/dom-value-setter.js
export class DomValueSetter {
  /**
   * Безопасно устанавливает значение в DOM-элемент
   * Поддерживает: input, textarea, select, checkbox, radio, contenteditable
   * Генерирует правильные события для React/Vue/Angular
   */
  setValue(element, value) {
    if (!element) return false;

    const tag = element.tagName?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';

    // checkbox/radio
    if (type === 'checkbox' || type === 'radio') {
      return this._setCheckboxRadio(element, value);
    }

    // select
    if (tag === 'select') {
      return this._setSelect(element, value);
    }

    // contenteditable
    if (element.hasAttribute('contenteditable')) {
      return this._setContentEditable(element, value);
    }

    // обычный input/textarea
    return this._setInputValue(element, value);
  }

  _setInputValue(element, value) {
    // Сохраняем старый value для проверки изменений
    const oldValue = element.value;

    // Устанавливаем значение через native setter
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'value'
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Генерируем события
    this._dispatchEvents(element, oldValue);

    return true;
  }

  _setCheckboxRadio(element, value) {
    const shouldCheck = typeof value === 'boolean' ? value :
                       value === 'true' || value === '1' || value === 'on' || value === 'checked';

    const oldChecked = element.checked;
    if (shouldCheck !== oldChecked) {
      element.checked = shouldCheck;
      this._dispatchEvents(element);
    }
    return true;
  }

  _setSelect(element, value) {
    let found = false;
    const valueStr = String(value);

    // Ищем option по value
    for (const option of element.options) {
      if (option.value === valueStr) {
        option.selected = true;
        found = true;
        break;
      }
    }

    // Если не нашли по value, ищем по тексту
    if (!found) {
      for (const option of element.options) {
        if (option.text === valueStr) {
          option.selected = true;
          found = true;
          break;
        }
      }
    }

    if (found) {
      this._dispatchEvents(element);
    }

    return found;
  }

  _setContentEditable(element, value) {
    element.textContent = value;
    this._dispatchEvents(element);
    return true;
  }

  _dispatchEvents(element, oldValue) {
    // input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    // Для React/Vue также нужен focus
    if (document.activeElement !== element) {
      element.dispatchEvent(new Event('focus', { bubbles: true }));
    }
  }
}
