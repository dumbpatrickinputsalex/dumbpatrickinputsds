// domain/matching/condition-evaluator.js
export class ConditionEvaluator {
  constructor(labelResolver) {
    this.labelResolver = labelResolver;
  }

  evaluate(element, conditions) {
    if (!conditions || conditions.length === 0) return true;

    const mode = conditions.mode || 'AND';
    const items = conditions.items || conditions;

    const results = items.map(cond => this._testCondition(element, cond));

    if (mode === 'OR') {
      return results.some(r => r);
    } else {
      return results.every(r => r);
    }
  }

  _testCondition(element, cond) {
    if (!cond) return true;

    // selector condition
    if (cond.selector) {
      try {
        return element.matches(cond.selector);
      } catch (_) {
        return false;
      }
    }

    // attribute condition
    if (cond.attr) {
      const attr = cond.attr;
      const pattern = cond.pattern || '';
      const useRegex = cond.useRegex || false;
      const value = element.getAttribute(attr) || '';
      if (useRegex) {
        try {
          return new RegExp(pattern).test(value);
        } catch (_) {
          return false;
        }
      }
      return value.includes(pattern);
    }

    // label condition
    if (cond.label) {
      const labelText = this.labelResolver.getLabelText(element);
      const pattern = cond.label;
      const useRegex = cond.useRegex || false;
      if (useRegex) {
        try {
          return new RegExp(pattern).test(labelText);
        } catch (_) {
          return false;
        }
      }
      return labelText.includes(pattern);
    }

    return true;
  }
}
