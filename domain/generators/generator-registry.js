// domain/generators/generator-registry.js
export class GeneratorRegistry {
  constructor() {
    this.generators = new Map();
  }

  register(name, generator) {
    this.generators.set(name, generator);
  }

  get(name) {
    return this.generators.get(name);
  }

  list() {
    return Array.from(this.generators.keys());
  }
}
