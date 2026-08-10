// domain/generators/generator-registry.js
export class GeneratorRegistry {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.generators = new Map();
  }

  /**
 * Регистрирует обработчики сообщений.
 * @param {*} name - Описание параметра.
 * @param {*} generator - Описание параметра.
 * @returns {void}
 */
register(name, generator) {
    this.generators.set(name, generator);
  }

  /**
 * Выполняет операцию "get".
 * @param {*} name - Описание параметра.
 * @returns {*} Результат операции.
 */
get(name) {
    return this.generators.get(name);
  }

  /**
 * Выполняет операцию "list".
 * @returns {void}
 */
list() {
    return Array.from(this.generators.keys());
  }
}
