// tests/state-migrator.test.js
import { describe, it, expect } from 'vitest';
import { StateMigrator } from '../domain/state-migrator.js';

describe('StateMigrator', () => {
  const migrator = new StateMigrator();

  it('should migrate profiles to folders', () => {
    const oldState = {
      profiles: [
        { id: 'p1', name: 'Profile 1', rules: [{ id: 'r1', name: 'Rule 1' }] },
        { id: 'p2', name: 'Profile 2', rules: [{ id: 'r2', name: 'Rule 2' }] },
      ],
    };

    const result = migrator.migrate(oldState);
    expect(result.folders).toHaveLength(2);
    expect(result.folders[0].name).toBe('Profile 1');
    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].id).toBe('r1');
    expect(result.rules[1].id).toBe('r2');
    expect(result.profiles).toBeUndefined();
  });

  it('should ensure shape with defaults', () => {
    const state = {};
    const result = migrator.ensureShape(state);
    expect(result.rules).toEqual([]);
    expect(result.folders).toEqual([]);
    expect(result.specialInsertions).toEqual([]);
    expect(result.smartCounters).toEqual([]);
    expect(result.counters).toEqual({});
  });

  it('should preserve existing fields', () => {
    const state = { rules: [{ id: 'r1' }], customField: 'value' };
    const result = migrator.ensureShape(state);
    expect(result.rules).toHaveLength(1);
    expect(result.customField).toBe('value');
  });
});
