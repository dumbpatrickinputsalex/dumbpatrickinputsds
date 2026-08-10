// tests/generator-registry.test.js
import { describe, it, expect } from 'vitest';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';

describe('GeneratorRegistry', () => {
  const registry = new GeneratorRegistry();

  const mockGenerator = {
    generate: () => 'test',
  };

  it('should register and retrieve generator', () => {
    registry.register('test', mockGenerator);
    expect(registry.get('test')).toBe(mockGenerator);
  });

  it('should return undefined for unknown generator', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('should list registered generators', () => {
    registry.register('test2', mockGenerator);
    const list = registry.list();
    expect(list).toContain('test');
    expect(list).toContain('test2');
  });
});
