// content/special-insertion-use-case.js
import { DomValueSetter } from './dom-value-setter.js';
import { FieldHighlighter } from './field-highlighter.js';
import { ElementWaiter } from './element-waiter.js';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';
import { CounterGenerator } from '../domain/generators/counter-generator.js';
import { EmailGenerator } from '../domain/generators/email-generator.js';
import { PhoneGenerator } from '../domain/generators/phone-generator.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class SpecialInsertionUseCase {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.valueSetter = new DomValueSetter();
    this.highlighter = new FieldHighlighter();
    this.waiter = new ElementWaiter();
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();

    this.generatorRegistry = new GeneratorRegistry();
    this.templateRenderer = new TemplateRenderer(this.generatorRegistry);

    this.generatorRegistry.register('counter', new CounterGenerator());
    this.generatorRegistry.register('email', new EmailGenerator());
    this.generatorRegistry.register('phone', new PhoneGenerator());
  }

  /**
 * Выполняет правило заполнения.
 * @param {*} insertionId - Описание параметра.
 * @returns {void}
 */
async execute(insertionId) {
    const state = await this.storage.getState();
    if (!state || !state.specialInsertions) {
      return { success: false, error: 'No insertions found' };
    }

    const url = window.location.href;
    let insertion = null;

    // Если передан ID — ищем конкретную вставку
    if (insertionId) {
      insertion = state.specialInsertions.find(ins => ins.id === insertionId);
      if (!insertion) {
        return { success: false, error: Insertion with id  not found };
      }
    } else {
      // Ищем первую подходящую по URL
      for (const ins of state.specialInsertions) {
        if (!ins.urlConditions || ins.urlConditions.length === 0) {
          insertion = ins;
          break;
        }
        if (this.urlMatcher.matchesConditions(ins.urlConditions, url)) {
          insertion = ins;
          break;
        }
      }
    }

    if (!insertion) {
      return { success: false, error: 'No matching insertion found' };
    }

    return await this._runInsertion(insertion, state);
  }

  /**
 * (приватный) Выполняет операцию "_runInsertion".
 * @param {*} insertion - Описание параметра.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
async _runInsertion(insertion, state) {
    const context = {
      counters: state.counters || {},
      url: window.location.href
    };

    const usedFields = new WeakSet();
    let filledCount = 0;

    for (const step of insertion.steps || []) {
      // Ждём появления элемента
      const element = await this.waiter.waitForSelector(step.selector, 3000);
      if (!element) {
        continue;
      }

      // Пропускаем уже заполненные
      if (usedFields.has(element)) continue;

      // Генерируем значение
      const value = this.templateRenderer.render(step.value || step.template, context);

      // Устанавливаем значение
      const success = this.valueSetter.setValue(element, value);
      if (success) {
        this.highlighter.highlight(element);
        usedFields.add(element);
        filledCount++;
      }
    }

    // Сохраняем счётчики
    if (Object.keys(context.counters).length > 0) {
      state.counters = context.counters;
      await this.storage.saveState(state);
    }

    return {
      success: filledCount > 0,
      filled: filledCount,
      total: (insertion.steps || []).length
    };
  }
}
