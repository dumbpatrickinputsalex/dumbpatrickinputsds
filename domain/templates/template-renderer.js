// domain/templates/template-renderer.js
import { TemplateParser } from './template-parser.js';

export class TemplateRenderer {
  /**
 * Создаёт экземпляр класса.
 * @param {*} generatorRegistry - Описание параметра.
 * @returns {void}
 */
constructor(generatorRegistry) {
    this.parser = new TemplateParser();
    this.generatorRegistry = generatorRegistry;
  }

  /**
 * Отрисовывает интерфейс.
 * @param {*} template - Описание параметра.
 * @param {*} context - Описание параметра.
 * @returns {void}
 */
render(template, context = {}) {
    const parts = this.parser.parse(template);
    return parts.map(part => {
      if (part.type === 'text') return part.value;
      return this._renderToken(part.value, context);
    }).join('');
  }

  /**
 * (приватный) Выполняет операцию "_renderToken".
 * @param {*} token - Описание параметра.
 * @param {*} context - Описание параметра.
 * @returns {void}
 */
_renderToken(token, context) {
    const [name, ...args] = token.split(':');
    const generator = this.generatorRegistry.get(name.trim());
    if (generator) {
      return generator.generate(args.map(a => a.trim()), context);
    }
    return {{}};
  }
}
