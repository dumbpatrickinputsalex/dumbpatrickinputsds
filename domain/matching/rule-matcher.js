// domain/matching/rule-matcher.js
import { FieldKindDetector } from './field-kind-detector.js';
import { LabelResolver } from './label-resolver.js';
import { ConditionEvaluator } from './condition-evaluator.js';

export class RuleMatcher {
  constructor() {
    this.fieldKindDetector = new FieldKindDetector();
    this.labelResolver = new LabelResolver();
    this.conditionEvaluator = new ConditionEvaluator(this.labelResolver);
  }

  findMatches(rule, root = document) {
    if (!rule || !rule.conditions) return [];

    const fields = this._collectFields(root);
    const matches = [];

    for (const field of fields) {
      const kind = this.fieldKindDetector.detect(field);
      if (kind === 'ignored') continue;

      const conditionResult = this.conditionEvaluator.evaluate(field, rule.conditions);
      if (conditionResult) {
        matches.push(field);
      }
    }

    return matches;
  }

  _collectFields(root) {
    const elements = root.querySelectorAll('input, select, textarea, [contenteditable="true"]');
    const fields = [];

    for (const el of elements) {
      // Проверяем, что элемент видимый и не disabled
      if (el.disabled) continue;
      if (el.type === 'hidden') continue;
      if (el.type === 'submit' || el.type === 'button') continue;
      if (el.type === 'file') continue;

      fields.push(el);
    }

    return fields;
  }
}
