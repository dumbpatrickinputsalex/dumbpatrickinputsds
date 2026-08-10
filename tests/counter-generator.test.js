// tests/counter-generator.test.js
import { describe, it, expect } from 'vitest';
import { CounterGenerator } from '../domain/generators/counter-generator.js';

describe('CounterGenerator', () => {
  const generator = new CounterGenerator();

  it('should increment counter', () => {
    const context = { counters: {} };
    const result1 = generator.generate(['test'], context);
    const result2 = generator.generate(['test'], context);

    expect(result1).toBe('1');
    expect(result2).toBe('2');
    expect(context.counters.test).toBe(2);
  });

  it('should use default key when not provided', () => {
    const context = { counters: {} };
    generator.generate([], context);
    expect(context.counters.default).toBe(1);
  });

  it('should work with existing counters', () => {
    const context = { counters: { users: 10 } };
    const result = generator.generate(['users'], context);
    expect(result).toBe('11');
    expect(context.counters.users).toBe(11);
  });

  it('should return string value', () => {
    const context = { counters: {} };
    const result = generator.generate(['test'], context);
    expect(typeof result).toBe('string');
  });
});
