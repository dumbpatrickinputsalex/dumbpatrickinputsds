// content/fill-all-use-case.js
import { ContentRuleExecutor } from './content-rule-executor.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class FillAllUseCase {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.executor = new ContentRuleExecutor();
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();
  }

  /**
 * Выполняет правило заполнения.
 * @returns {void}
 */
async execute() {
    const state = await this.storage.getState();
    if (!state || !state.rules) {
      return { filled: 0, matched: 0, errors: ['No rules found'] };
    }

    const url = window.location.href;
    const context = {
      counters: state.counters || {},
      url: url
    };

    const usedFields = new WeakSet();
    let totalFilled = 0;
    let totalMatched = 0;
    const errors = [];

    // Фильтруем правила по URL
    const activeRules = state.rules.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    });

    for (const rule of activeRules) {
      try {
        const result = await this.executor.execute(rule, context, usedFields);
        totalFilled += result.filled;
        totalMatched += result.matched;
      } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
        errors.push(Rule : );
      }
    }

    // Сохраняем обновлённые счётчики
    if (Object.keys(context.counters).length > 0) {
      state.counters = context.counters;
      await this.storage.saveState(state);
    }

    return {
      filled: totalFilled,
      matched: totalMatched,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
