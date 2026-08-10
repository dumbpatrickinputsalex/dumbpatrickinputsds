// content/content-rule-executor.js
import { DomValueSetter } from './dom-value-setter.js';
import { FieldHighlighter } from './field-highlighter.js';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';
import { CounterGenerator } from '../domain/generators/counter-generator.js';
import { EmailGenerator } from '../domain/generators/email-generator.js';
import { PhoneGenerator } from '../domain/generators/phone-generator.js';

export class ContentRuleExecutor {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.valueSetter = new DomValueSetter();
    this.highlighter = new FieldHighlighter();
    this.generatorRegistry = new GeneratorRegistry();
    this.templateRenderer = new TemplateRenderer(this.generatorRegistry);

    // Регистрируем генераторы
    this.generatorRegistry.register('counter', new CounterGenerator());
    this.generatorRegistry.register('email', new EmailGenerator());
    this.generatorRegistry.register('phone', new PhoneGenerator());
  }

  async execute(rule, context, usedFields = new WeakSet()) {
    if (!rule || !rule.template) return { filled: 0, matched: 0 };

    // Находим поля по правилу
    const matches = this._findMatches(rule);
    let filled = 0;

    for (const field of matches) {
      // Пропускаем уже заполненные поля
      if (usedFields.has(field)) continue;

      // Генерируем значение
      const value = this.templateRenderer.render(rule.template, context);

      // Устанавливаем значение
      const success = this.valueSetter.setValue(field, value);

      if (success) {
        this.highlighter.highlight(field);
        usedFields.add(field);
        filled++;
      }
    }

    return { filled, matched: matches.length };
  }

  /**
 * (приватный) Выполняет операцию "_findMatches".
 * @param {*} rule - Описание параметра.
 * @returns {void}
 */
_findMatches(rule) {
    // Используем RuleMatcher из domain/matching
    // Временно используем старую логику, пока не интегрируем RuleMatcher
    const elements = document.querySelectorAll('input, select, textarea, [contenteditable="true"]');
    const matches = [];

    for (const el of elements) {
      if (el.disabled) continue;
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;

      // Простая проверка: если есть условие selector
      if (rule.conditions && rule.conditions.items) {
        for (const cond of rule.conditions.items) {
          if (cond.selector) {
            try {
              if (el.matches(cond.selector)) {
                matches.push(el);
                break;
              }
            } /**
 * Выполняет операцию "catch".
 * @param {*} _ - Описание параметра.
 * @returns {void}
 */
catch (_) {}
          }
        }
      } else {
        // Если условий нет — заполняем все поля
        matches.push(el);
      }
    }

    return matches;
  }
}
