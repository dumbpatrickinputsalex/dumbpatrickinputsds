// tests/template-parser.test.js
import { describe, it, expect } from 'vitest';
import { TemplateParser } from '../domain/templates/template-parser.js';

describe('TemplateParser', () => {
  const parser = new TemplateParser();

  it('should parse plain text', () => {
    const result = parser.parse('Hello world');
    expect(result).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('should parse simple token', () => {
    const result = parser.parse('Hello {{name}}');
    expect(result).toEqual([
      { type: 'text', value: 'Hello ' },
      { type: 'token', value: 'name' },
    ]);
  });

  it('should parse token with params', () => {
    const result = parser.parse('{{counter:users}}');
    expect(result).toEqual([{ type: 'token', value: 'counter:users' }]);
  });

  it('should parse multiple tokens', () => {
    const result = parser.parse('{{a}} and {{b}}');
    expect(result).toEqual([
      { type: 'token', value: 'a' },
      { type: 'text', value: ' and ' },
      { type: 'token', value: 'b' },
    ]);
  });

  it('should handle escaped tokens', () => {
    const result = parser.parse('\\{{escaped}}');
    expect(result).toEqual([{ type: 'text', value: '{{escaped}}' }]);
  });

  it('should handle empty template', () => {
    expect(parser.parse('')).toEqual([]);
    expect(parser.parse(null)).toEqual([]);
  });
});
