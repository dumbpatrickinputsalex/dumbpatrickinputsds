/**
 * UrlMatcher — единая логика для проверки URL
 * Заменяет дублирование в lib/matcher.js, popup/popup.js, options/options.js
 */
class UrlMatcher {
  /**
   * Проверяет, соответствует ли URL паттерну
   * @param {string|RegExp} pattern - паттерн для проверки
   * @param {string} url - URL для проверки
   * @returns {boolean}
   */
  matchesPattern(pattern, url) {
    if (!pattern) return true;
    if (pattern instanceof RegExp) return pattern.test(url);
    if (typeof pattern === 'string') {
      // Если паттерн содержит *, превращаем в регулярное выражение
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(url);
      }
      return url.includes(pattern);
    }
    return false;
  }

  /**
   * Проверяет URL по массиву условий
   * @param {Array} conditions - массив условий
   * @param {string} url - URL для проверки
   * @returns {boolean}
   */
  matchesConditions(conditions, url) {
    if (!conditions || conditions.length === 0) return true;

    // Если режим AND — все условия должны совпадать
    const mode = conditions.mode || 'AND';
    const items = conditions.items || conditions;

    if (mode === 'OR') {
      return items.some(cond => this._testCondition(cond, url));
    } else {
      return items.every(cond => this._testCondition(cond, url));
    }
  }

  /**
   * Проверяет одно условие
   * @param {Object} condition - условие
   * @param {string} url - URL для проверки
   * @returns {boolean}
   * @private
   */
  _testCondition(condition, url) {
    if (!condition) return true;
    const pattern = condition.pattern || condition;
    return this.matchesPattern(pattern, url);
  }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlMatcher;
}
