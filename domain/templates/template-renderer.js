// domain/templates/template-renderer.js
import { TemplateParser } from './template-parser.js';

export class TemplateRenderer {
  constructor(generatorRegistry) {
    this.parser = new TemplateParser();
    this.generatorRegistry = generatorRegistry;
  }

  render(template, context = {}) {
    const parts = this.parser.parse(template);
    return parts.map(part => {
      if (part.type === 'text') return part.value;
      return this._renderToken(part.value, context);
    }).join('');
  }

  _renderToken(token, context) {
    const [name, ...args] = token.split(':');
    const generator = this.generatorRegistry.get(name.trim());
    if (generator) {
      return generator.generate(args.map(a => a.trim()), context);
    }
    return {{}};
  }
}
