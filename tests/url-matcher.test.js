import { describe, it, expect } from 'vitest';
import UrlMatcher from '../shared/url-matcher.js';

describe('UrlMatcher', () => {
  const matcher = new UrlMatcher();

  describe('matchesPattern', () => {
    it('должен возвращать true для пустого паттерна', () => {
      expect(matcher.matchesPattern(null, 'https://example.com')).toBe(true);
      expect(matcher.matchesPattern('', 'https://example.com')).toBe(true);
    });

    it('должен поддерживать простые подстроки', () => {
      expect(matcher.matchesPattern('example', 'https://example.com')).toBe(true);
      expect(matcher.matchesPattern('google', 'https://example.com')).toBe(false);
    });

    it('должен поддерживать wildcard (*)', () => {
      expect(matcher.matchesPattern('*.example.com', 'https://api.example.com')).toBe(true);
      expect(matcher.matchesPattern('*.example.com', 'https://example.com')).toBe(false);
      expect(
        matcher.matchesPattern('https://*.example.com/*', 'https://api.example.com/path')
      ).toBe(true);
    });

    it('должен поддерживать RegExp', () => {
      expect(matcher.matchesPattern(/example/, 'https://example.com')).toBe(true);
      expect(matcher.matchesPattern(/^https:/, 'https://example.com')).toBe(true);
      expect(matcher.matchesPattern(/^http:/, 'https://example.com')).toBe(false);
    });
  });

  describe('matchesConditions', () => {
    it('должен возвращать true для пустых условий', () => {
      expect(matcher.matchesConditions(null, 'https://example.com')).toBe(true);
      expect(matcher.matchesConditions([], 'https://example.com')).toBe(true);
    });

    it('должен поддерживать AND режим', () => {
      const conditions = {
        mode: 'AND',
        items: ['example', 'https'],
      };
      expect(matcher.matchesConditions(conditions, 'https://example.com')).toBe(true);
      expect(matcher.matchesConditions(conditions, 'http://example.com')).toBe(false);
    });

    it('должен поддерживать OR режим', () => {
      const conditions = {
        mode: 'OR',
        items: ['example', 'google'],
      };
      expect(matcher.matchesConditions(conditions, 'https://example.com')).toBe(true);
      expect(matcher.matchesConditions(conditions, 'https://google.com')).toBe(true);
      expect(matcher.matchesConditions(conditions, 'https://yahoo.com')).toBe(false);
    });
  });
});
