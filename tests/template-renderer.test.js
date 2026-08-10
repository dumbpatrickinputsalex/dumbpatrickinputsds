// tests/template-renderer.test.js
import { describe, it, expect, vi } from 'vitest';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';

describe('TemplateRenderer', () => {
  const registry = new GeneratorRegistry();
  const mockGenerator = {
    generate: vi.fn().mockReturnValue('mocked_value'),
  };
  registry.register('mock', mockGenerator);

  const renderer = new TemplateRenderer(registry);

  it('should render plain text', () => {
    expect(renderer.render('Hello world')).toBe('Hello world');
  });

  it('should render token using generator', () => {
    const result = renderer.render('{{mock}}');
    expect(result).toBe('mocked_value');
    expect(mockGenerator.generate).toHaveBeenCalledWith([], {});
  });

  it('should pass context to generator', () => {
    const context = { counters: { test: 5 } };
    renderer.render('{{mock}}', context);
    expect(mockGenerator.generate).toHaveBeenCalledWith([], context);
  });

  it('should handle unknown token', () => {
    const result = renderer.render('{{unknown}}');
    expect(result).toBe('{{unknown}}');
  });

  it('should render mixed content', () => {
    const result = renderer.render('Hello {{mock}}!');
    expect(result).toBe('Hello mocked_value!');
  });
});
