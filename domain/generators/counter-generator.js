// domain/generators/counter-generator.js
export class CounterGenerator {
  /**
 * Генерирует значение для токена.
 * @param {*} args - Описание параметра.
 * @param {*} context - Описание параметра.
 * @returns {void}
 */
generate(args, context) {
    const key = args[0] || 'default';
    context.counters = context.counters || {};
    context.counters[key] = (context.counters[key] || 0) + 1;
    return String(context.counters[key]);
  }
}
