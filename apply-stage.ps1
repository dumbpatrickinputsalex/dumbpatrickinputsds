param(
    [string]$Stage = "0"
)

Write-Host "🚀 Applying stage $Stage..." -ForegroundColor Green

function CreateStage0 {
    Write-Host "📁 Stage 0: Baseline documentation..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "docs/refactoring-reports" | Out-Null
    
    @"
# Manual Regression Checklist

## Before each change
- [ ] Extension loads in chrome://extensions
- [ ] Popup opens
- [ ] Options page opens

## Core functionality
- [ ] Ctrl+Shift+F fills form
- [ ] Ctrl+Shift+1 runs special insertion
- [ ] Popup shows active rules count

## Rules
- [ ] Create rule works
- [ ] Edit rule works
- [ ] Delete rule works

## Special Insertions
- [ ] Create insertion works
- [ ] Fill Special works
- [ ] Picker works

## Counters
- [ ] Counter increments
- [ ] Seq (smart counter) works

## Import/Export
- [ ] Export works
- [ ] Import works

## CopyFX
- [ ] Traders load
- [ ] Investors load

## UA Rules
- [ ] UA toggle works

## Stability
- [ ] No console errors
- [ ] Extension doesn't crash
"@ | Out-File -FilePath "docs/manual-regression-checklist.md" -Encoding utf8

    @"
# Baseline — State Before Refactoring

**Date:** 2026-08-10
**Version:** (from manifest.json)

## Key Invariants

### State Invariants
- `chrome.storage.local.state` contains:
  - `rules`, `folders`, `specialInsertions`, `smartCounters`, `counters`, `snapshots`, `customWordLists`, `scraperConfig`, `copyfxConfig`, `uaRules`

### Runtime API Invariants
- `window.FF.render`, `parse`, `findMatches`, `urlMatches`, `startPicker`, `fillAll`, `fillSpecial`

### Message Contract Invariants
- `FILL_ALL`, `FILL_SPECIAL`, `FILL_INSERTION_BY_ID`, `PICK_ELEMENT`, `PREVIEW_TEMPLATE`, `SCRAPE_FIELDS`, `SCRAPE_PAGE`, `COPYFX_GET_TRADERS`, `COPYFX_GET_INVESTORS`, `PROXY_TO_TAB`

## Known Risks
1. `options/options.js` (2500+ строк) — самый большой
2. `popup/popup.js` (800-1000 строк) — второй по размеру
3. Дублирование логики: URL matching, selector building
4. Monkey patching в `content/copyfx-interceptor.js`
"@ | Out-File -FilePath "docs/baseline.md" -Encoding utf8

    @"
# Refactoring Reports

Stage reports go here.
"@ | Out-File -FilePath "docs/refactoring-reports/README.md" -Encoding utf8

    git add docs/
    git commit -m "docs(refactoring): stage 0 baseline checklist"
    git push origin master
    Write-Host "✅ Stage 0 complete!" -ForegroundColor Green
}

function CreateStage1 {
    Write-Host "📦 Stage 1: Quality infrastructure..." -ForegroundColor Yellow
    
    @"
{
  "name": "formfiller-extension",
  "version": "1.0.0",
  "description": "Chrome Extension for form filling",
  "type": "module",
  "scripts": {
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "ci": "npm run format:check && npm run lint && npm run test"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "jsdom": "^24.1.0",
    "prettier": "^3.3.2",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
"@ | Out-File -FilePath "package.json" -Encoding utf8

    @"
{
  "env": {
    "browser": true,
    "es2021": true,
    "webextensions": true
  },
  "extends": ["eslint:recommended", "plugin:prettier/recommended"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "globals": {
    "chrome": "readonly",
    "FF": "writable"
  },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "prefer-const": "warn"
  },
  "ignorePatterns": ["node_modules/", "dist/", "*.min.js", "coverage/"]
}
"@ | Out-File -FilePath ".eslintrc.json" -Encoding utf8

    @"
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
"@ | Out-File -FilePath ".prettierrc" -Encoding utf8

    @"
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.js', '**/vitest.config.js']
    }
  }
});
"@ | Out-File -FilePath "vitest.config.js" -Encoding utf8

    if (Test-Path ".gitignore") {
        Add-Content ".gitignore" "`n# Node.js`nnode_modules/`nnpm-debug.log*`npackage-lock.json`nyarn.lock`npnpm-lock.yaml`n`n# Test`ncoverage/`n*.log`n"
    } else {
        @"
# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node.js
node_modules/
npm-debug.log*
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build
dist/
build/
*.zip
*.crx
*.pem

# Test
coverage/
*.log

# Temporary
*.tmp
*.bak
.env
.env.local
"@ | Out-File -FilePath ".gitignore" -Encoding utf8
    }

    git add package.json .eslintrc.json .prettierrc vitest.config.js .gitignore
    git commit -m "chore(quality): stage 1 add lint and test harness"
    git push origin master
    
    Write-Host "✅ Stage 1 complete!" -ForegroundColor Green
    Write-Host "📌 Run: npm install" -ForegroundColor Yellow
}

function CreateStage2 {
    Write-Host "📦 Stage 2: Shared utilities (UrlMatcher)..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "shared" | Out-Null
    
    @"
class UrlMatcher {
  matchesPattern(pattern, url) {
    if (!pattern) return true;
    if (pattern instanceof RegExp) return pattern.test(url);
    if (typeof pattern === 'string') {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(url);
      }
      return url.includes(pattern);
    }
    return false;
  }

  matchesConditions(conditions, url) {
    if (!conditions || conditions.length === 0) return true;
    const mode = conditions.mode || 'AND';
    const items = conditions.items || conditions;
    if (mode === 'OR') {
      return items.some(cond => this._testCondition(cond, url));
    } else {
      return items.every(cond => this._testCondition(cond, url));
    }
  }

  _testCondition(condition, url) {
    if (!condition) return true;
    const pattern = condition.pattern || condition;
    return this.matchesPattern(pattern, url);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlMatcher;
}
"@ | Out-File -FilePath "shared/url-matcher.js" -Encoding utf8

    New-Item -ItemType Directory -Force -Path "tests" | Out-Null
    
    @"
import { describe, it, expect } from 'vitest';
import UrlMatcher from '../shared/url-matcher.js';

describe('UrlMatcher', () => {
  const matcher = new UrlMatcher();

  it('should match empty pattern', () => {
    expect(matcher.matchesPattern(null, 'https://example.com')).toBe(true);
  });

  it('should match simple substring', () => {
    expect(matcher.matchesPattern('example', 'https://example.com')).toBe(true);
    expect(matcher.matchesPattern('google', 'https://example.com')).toBe(false);
  });

  it('should match wildcard', () => {
    expect(matcher.matchesPattern('*.example.com', 'https://api.example.com')).toBe(true);
  });

  it('should match regex', () => {
    expect(matcher.matchesPattern(/example/, 'https://example.com')).toBe(true);
  });

  it('should support AND mode', () => {
    const conditions = { mode: 'AND', items: ['example', 'https'] };
    expect(matcher.matchesConditions(conditions, 'https://example.com')).toBe(true);
  });

  it('should support OR mode', () => {
    const conditions = { mode: 'OR', items: ['example', 'google'] };
    expect(matcher.matchesConditions(conditions, 'https://example.com')).toBe(true);
    expect(matcher.matchesConditions(conditions, 'https://yahoo.com')).toBe(false);
  });
});
"@ | Out-File -FilePath "tests/url-matcher.test.js" -Encoding utf8

    git add shared/ tests/
    git commit -m "refactor(shared): extract url matcher with tests"
    git push origin master
    
    Write-Host "✅ Stage 2 complete!" -ForegroundColor Green
}

function CreateStage3 {
    Write-Host "📦 Stage 3: Storage/State layer..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "domain" | Out-Null
    New-Item -ItemType Directory -Force -Path "infrastructure" | Out-Null
    
    @"
export const DEFAULT_STATE = {
  rules: [],
  folders: [],
  specialInsertions: [],
  smartCounters: [],
  snapshots: [],
  counters: {},
  customWordLists: [],
  scraperConfig: { enabled: false },
  copyfxConfig: { enabled: false },
  uaRules: [],
  pageShortcuts: [],
  activityLog: []
};
"@ | Out-File -FilePath "domain/state-schema.js" -Encoding utf8

    @"
export class StateMigrator {
  migrate(rawState) {
    const state = rawState || {};
    if (state.profiles && Array.isArray(state.profiles)) {
      state.folders = state.profiles.map(p => ({
        id: p.id || 'folder_' + Date.now(),
        name: p.name || 'Folder',
        rules: p.rules || []
      }));
      state.rules = state.folders.flatMap(f => f.rules);
      delete state.profiles;
    }
    return this.ensureShape(state);
  }

  ensureShape(state) {
    const defaultState = {
      rules: [],
      folders: [],
      specialInsertions: [],
      smartCounters: [],
      snapshots: [],
      counters: {},
      customWordLists: [],
      scraperConfig: { enabled: false },
      copyfxConfig: { enabled: false },
      uaRules: [],
      pageShortcuts: [],
      activityLog: []
    };
    for (const key in defaultState) {
      if (!(key in state)) {
        state[key] = defaultState[key];
      }
    }
    return state;
  }
}
"@ | Out-File -FilePath "domain/state-migrator.js" -Encoding utf8

    @"
export class ChromeStorageRepository {
  constructor(storageArea = chrome.storage.local) {
    this.storage = storageArea;
  }

  async getState() {
    return new Promise((resolve) => {
      this.storage.get('state', (result) => {
        resolve(result.state || null);
      });
    });
  }

  async saveState(state) {
    return new Promise((resolve) => {
      this.storage.set({ state }, () => {
        resolve();
      });
    });
  }

  async updateState(mutator) {
    const current = await this.getState();
    const newState = mutator(current);
    await this.saveState(newState);
    return newState;
  }
}
"@ | Out-File -FilePath "infrastructure/chrome-storage-repository.js" -Encoding utf8

    git add domain/ infrastructure/
    git commit -m "refactor(state): extract storage repository and migrator"
    git push origin master
    
    Write-Host "✅ Stage 3 complete!" -ForegroundColor Green
}

function CreateStage4 {
    Write-Host "📦 Stage 4: Templates and generators..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "domain/templates" | Out-Null
    New-Item -ItemType Directory -Force -Path "domain/generators" | Out-Null
    
    @"
export class TemplateParser {
  parse(template) {
    if (!template) return [];
    const parts = [];
    let index = 0;
    let inToken = false;
    let tokenStart = 0;
    let escapeNext = false;

    for (let i = 0; i < template.length; i++) {
      const ch = template[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (ch === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (ch === '{' && i + 1 < template.length && template[i + 1] === '{') {
        if (!inToken) {
          if (i > index) {
            parts.push({ type: 'text', value: template.substring(index, i) });
          }
          inToken = true;
          tokenStart = i + 2;
          i++;
        }
        continue;
      }
      
      if (ch === '}' && i + 1 < template.length && template[i + 1] === '}' && inToken) {
        const token = template.substring(tokenStart, i).trim();
        parts.push({ type: 'token', value: token });
        inToken = false;
        index = i + 2;
        i++;
        continue;
      }
    }
    
    if (index < template.length) {
      parts.push({ type: 'text', value: template.substring(index) });
    }
    
    return parts;
  }
}
"@ | Out-File -FilePath "domain/templates/template-parser.js" -Encoding utf8

    @"
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
    return `{{${token}}}`;
  }
}
"@ | Out-File -FilePath "domain/templates/template-renderer.js" -Encoding utf8

    @"
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
"@ | Out-File -FilePath "domain/generators/generator-registry.js" -Encoding utf8

    @"
export class CounterGenerator {
  generate(args, context) {
    const key = args[0] || 'default';
    context.counters = context.counters || {};
    context.counters[key] = (context.counters[key] || 0) + 1;
    return String(context.counters[key]);
  }
}
"@ | Out-File -FilePath "domain/generators/counter-generator.js" -Encoding utf8

    @"
export class EmailGenerator {
  generate(args, context) {
    const domains = ['example.com', 'test.com', 'mail.com'];
    const domain = args[0] || domains[Math.floor(Math.random() * domains.length)];
    const username = 'user' + Math.floor(Math.random() * 10000);
    return username + '@' + domain;
  }
}
"@ | Out-File -FilePath "domain/generators/email-generator.js" -Encoding utf8

    @"
export class PhoneGenerator {
  generate(args, context) {
    const format = args[0] || '+7 (XXX) XXX-XX-XX';
    const num = () => Math.floor(Math.random() * 10);
    return format.replace(/X/g, num);
  }
}
"@ | Out-File -FilePath "domain/generators/phone-generator.js" -Encoding utf8

    git add domain/templates/ domain/generators/
    git commit -m "refactor(templates): split parser renderer and generators"
    git push origin master
    
    Write-Host "✅ Stage 4 complete!" -ForegroundColor Green
}

function CreateStage5 {
    Write-Host "📦 Stage 5: Matcher logic..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "domain/matching" | Out-Null
    
    @"
export class FieldKindDetector {
  detect(element) {
    if (!element) return 'unknown';
    
    const tag = element.tagName?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    
    if (tag === 'input') {
      if (type === 'email' || name.includes('email') || id.includes('email')) return 'email';
      if (type === 'tel' || name.includes('phone') || id.includes('phone')) return 'phone';
      if (type === 'number') return 'number';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'password') return 'password';
      if (type === 'hidden' || type === 'submit' || type === 'button') return 'ignored';
      if (name.includes('name') || id.includes('name')) return 'name';
      if (name.includes('last') || id.includes('last')) return 'lastname';
      if (name.includes('first') || id.includes('first')) return 'firstname';
      return 'text';
    }
    
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'button') return 'ignored';
    
    return 'unknown';
  }
}
"@ | Out-File -FilePath "domain/matching/field-kind-detector.js" -Encoding utf8

    @"
export class LabelResolver {
  getLabelText(element) {
    if (!element) return '';
    
    if (element.hasAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }
    
    if (element.hasAttribute('aria-labelledby')) {
      const id = element.getAttribute('aria-labelledby');
      const labelEl = document.getElementById(id);
      if (labelEl) return labelEl.textContent?.trim() || '';
    }
    
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) return label.textContent?.trim() || '';
    }
    
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName?.toLowerCase() === 'label') {
        return parent.textContent?.trim() || '';
      }
      parent = parent.parentElement;
    }
    
    if (element.hasAttribute('placeholder')) {
      return element.getAttribute('placeholder');
    }
    
    return '';
  }
}
"@ | Out-File -FilePath "domain/matching/label-resolver.js" -Encoding utf8

    @"
export class ConditionEvaluator {
  constructor(labelResolver) {
    this.labelResolver = labelResolver;
  }

  evaluate(element, conditions) {
    if (!conditions || conditions.length === 0) return true;
    
    const mode = conditions.mode || 'AND';
    const items = conditions.items || conditions;
    
    const results = items.map(cond => this._testCondition(element, cond));
    
    if (mode === 'OR') {
      return results.some(r => r);
    } else {
      return results.every(r => r);
    }
  }

  _testCondition(element, cond) {
    if (!cond) return true;
    
    if (cond.selector) {
      try {
        return element.matches(cond.selector);
      } catch (_) {
        return false;
      }
    }
    
    if (cond.attr) {
      const attr = cond.attr;
      const pattern = cond.pattern || '';
      const useRegex = cond.useRegex || false;
      const value = element.getAttribute(attr) || '';
      if (useRegex) {
        try {
          return new RegExp(pattern).test(value);
        } catch (_) {
          return false;
        }
      }
      return value.includes(pattern);
    }
    
    if (cond.label) {
      const labelText = this.labelResolver.getLabelText(element);
      const pattern = cond.label;
      const useRegex = cond.useRegex || false;
      if (useRegex) {
        try {
          return new RegExp(pattern).test(labelText);
        } catch (_) {
          return false;
        }
      }
      return labelText.includes(pattern);
    }
    
    return true;
  }
}
"@ | Out-File -FilePath "domain/matching/condition-evaluator.js" -Encoding utf8

    @"
import { FieldKindDetector } from './field-kind-detector.js';
import { LabelResolver } from './label-resolver.js';
import { ConditionEvaluator } from './condition-evaluator.js';

export class RuleMatcher {
  constructor() {
    this.fieldKindDetector = new FieldKindDetector();
    this.labelResolver = new LabelResolver();
    this.conditionEvaluator = new ConditionEvaluator(this.labelResolver);
  }

  findMatches(rule, root = document) {
    if (!rule || !rule.conditions) return [];
    
    const fields = this._collectFields(root);
    const matches = [];
    
    for (const field of fields) {
      const kind = this.fieldKindDetector.detect(field);
      if (kind === 'ignored') continue;
      
      const conditionResult = this.conditionEvaluator.evaluate(field, rule.conditions);
      if (conditionResult) {
        matches.push(field);
      }
    }
    
    return matches;
  }

  _collectFields(root) {
    const elements = root.querySelectorAll('input, select, textarea, [contenteditable="true"]');
    const fields = [];
    
    for (const el of elements) {
      if (el.disabled) continue;
      if (el.type === 'hidden') continue;
      if (el.type === 'submit' || el.type === 'button') continue;
      if (el.type === 'file') continue;
      
      fields.push(el);
    }
    
    return fields;
  }
}
"@ | Out-File -FilePath "domain/matching/rule-matcher.js" -Encoding utf8

    git add domain/matching/
    git commit -m "refactor(matching): extract rule matcher services"
    git push origin master
    
    Write-Host "✅ Stage 5 complete!" -ForegroundColor Green
}

function CreateStage6 {
    Write-Host "📦 Stage 6: Content script - DomValueSetter..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "content" | Out-Null
    
    @"
export class DomValueSetter {
  setValue(element, value) {
    if (!element) return false;
    
    const tag = element.tagName?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    
    if (type === 'checkbox' || type === 'radio') {
      return this._setCheckboxRadio(element, value);
    }
    
    if (tag === 'select') {
      return this._setSelect(element, value);
    }
    
    if (element.hasAttribute('contenteditable')) {
      return this._setContentEditable(element, value);
    }
    
    return this._setInputValue(element, value);
  }

  _setInputValue(element, value) {
    const oldValue = element.value;
    
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'value'
    )?.set;
    
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
    
    this._dispatchEvents(element, oldValue);
    return true;
  }

  _setCheckboxRadio(element, value) {
    const shouldCheck = typeof value === 'boolean' ? value : 
                       value === 'true' || value === '1' || value === 'on' || value === 'checked';
    
    const oldChecked = element.checked;
    if (shouldCheck !== oldChecked) {
      element.checked = shouldCheck;
      this._dispatchEvents(element);
    }
    return true;
  }

  _setSelect(element, value) {
    let found = false;
    const valueStr = String(value);
    
    for (const option of element.options) {
      if (option.value === valueStr) {
        option.selected = true;
        found = true;
        break;
      }
    }
    
    if (!found) {
      for (const option of element.options) {
        if (option.text === valueStr) {
          option.selected = true;
          found = true;
          break;
        }
      }
    }
    
    if (found) {
      this._dispatchEvents(element);
    }
    
    return found;
  }

  _setContentEditable(element, value) {
    element.textContent = value;
    this._dispatchEvents(element);
    return true;
  }

  _dispatchEvents(element, oldValue) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    if (document.activeElement !== element) {
      element.dispatchEvent(new Event('focus', { bubbles: true }));
    }
  }
}
"@ | Out-File -FilePath "content/dom-value-setter.js" -Encoding utf8

    git add content/dom-value-setter.js
    git commit -m "refactor(content): extract DomValueSetter"
    git push origin master
    
    Write-Host "✅ Stage 6 complete!" -ForegroundColor Green
}

function CreateStage6b {
    Write-Host "📦 Stage 6b: Content script - FieldHighlighter, ElementWaiter, ContentMessageRouter..." -ForegroundColor Yellow
    
    @"
// content/field-highlighter.js
export class FieldHighlighter {
  constructor() {
    this.highlightedElements = new WeakSet();
  }

  highlight(element) {
    if (!element) return;
    this._removeHighlight(element);
    
    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;
    
    element.style.outline = '2px solid #FF6B35';
    element.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
    
    this.highlightedElements.set(element, {
      outline: originalOutline,
      background: originalBackground
    });
    
    setTimeout(() => {
      this._removeHighlight(element);
    }, 2000);
  }

  _removeHighlight(element) {
    if (!element) return;
    const data = this.highlightedElements.get(element);
    if (data) {
      element.style.outline = data.outline || '';
      element.style.backgroundColor = data.background || '';
      this.highlightedElements.delete(element);
    }
  }
}
"@ | Out-File -FilePath "content/field-highlighter.js" -Encoding utf8

    @"
// content/element-waiter.js
export class ElementWaiter {
  waitForSelector(selector, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      let timeoutId;
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(el);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);
    });
  }
}
"@ | Out-File -FilePath "content/element-waiter.js" -Encoding utf8

    @"
// content/content-message-router.js
export class ContentMessageRouter {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this._listener = null;
  }

  register() {
    this._listener = (message, sender, sendResponse) => {
      const handler = this.handlers[message.type];
      if (handler) {
        const result = handler(message.payload, sender);
        if (result && result.then) {
          result.then(sendResponse).catch(() => sendResponse({ error: 'Handler failed' }));
          return true;
        } else {
          sendResponse(result);
        }
      }
    };
    
    chrome.runtime.onMessage.addListener(this._listener);
  }

  unregister() {
    if (this._listener) {
      chrome.runtime.onMessage.removeListener(this._listener);
      this._listener = null;
    }
  }
}
"@ | Out-File -FilePath "content/content-message-router.js" -Encoding utf8

    git add content/field-highlighter.js content/element-waiter.js content/content-message-router.js
    git commit -m "refactor(content): extract FieldHighlighter, ElementWaiter, ContentMessageRouter"
    git push origin master
    
    Write-Host "✅ Stage 6b complete!" -ForegroundColor Green
}

function CreateStage6c {
    Write-Host "📦 Stage 6c: Content script - ContentRuleExecutor, FillAllUseCase, SpecialInsertionUseCase..." -ForegroundColor Yellow
    
    @"
// content/content-rule-executor.js
import { DomValueSetter } from './dom-value-setter.js';
import { FieldHighlighter } from './field-highlighter.js';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';
import { CounterGenerator } from '../domain/generators/counter-generator.js';
import { EmailGenerator } from '../domain/generators/email-generator.js';
import { PhoneGenerator } from '../domain/generators/phone-generator.js';

export class ContentRuleExecutor {
  constructor() {
    this.valueSetter = new DomValueSetter();
    this.highlighter = new FieldHighlighter();
    this.generatorRegistry = new GeneratorRegistry();
    this.templateRenderer = new TemplateRenderer(this.generatorRegistry);
    
    this.generatorRegistry.register('counter', new CounterGenerator());
    this.generatorRegistry.register('email', new EmailGenerator());
    this.generatorRegistry.register('phone', new PhoneGenerator());
  }

  async execute(rule, context, usedFields = new WeakSet()) {
    if (!rule || !rule.template) return { filled: 0, matched: 0 };
    
    const matches = this._findMatches(rule);
    let filled = 0;
    
    for (const field of matches) {
      if (usedFields.has(field)) continue;
      
      const value = this.templateRenderer.render(rule.template, context);
      const success = this.valueSetter.setValue(field, value);
      
      if (success) {
        this.highlighter.highlight(field);
        usedFields.add(field);
        filled++;
      }
    }
    
    return { filled, matched: matches.length };
  }

  _findMatches(rule) {
    const elements = document.querySelectorAll('input, select, textarea, [contenteditable="true"]');
    const matches = [];
    
    for (const el of elements) {
      if (el.disabled) continue;
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
      
      if (rule.conditions && rule.conditions.items) {
        for (const cond of rule.conditions.items) {
          if (cond.selector) {
            try {
              if (el.matches(cond.selector)) {
                matches.push(el);
                break;
              }
            } catch (_) {}
          }
        }
      } else {
        matches.push(el);
      }
    }
    
    return matches;
  }
}
"@ | Out-File -FilePath "content/content-rule-executor.js" -Encoding utf8

    @"
// content/fill-all-use-case.js
import { ContentRuleExecutor } from './content-rule-executor.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class FillAllUseCase {
  constructor() {
    this.executor = new ContentRuleExecutor();
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();
  }

  async execute() {
    const state = await this.storage.getState();
    if (!state || !state.rules) {
      return { filled: 0, matched: 0, errors: ['No rules found'] };
    }
    
    const url = window.location.href;
    const context = {
      counters: state.counters || {},
      url: url
    };
    
    const usedFields = new WeakSet();
    let totalFilled = 0;
    let totalMatched = 0;
    const errors = [];
    
    const activeRules = state.rules.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    });
    
    for (const rule of activeRules) {
      try {
        const result = await this.executor.execute(rule, context, usedFields);
        totalFilled += result.filled;
        totalMatched += result.matched;
      } catch (error) {
        errors.push(`Rule ${rule.name || 'unnamed'}: ${error.message}`);
      }
    }
    
    if (Object.keys(context.counters).length > 0) {
      state.counters = context.counters;
      await this.storage.saveState(state);
    }
    
    return {
      filled: totalFilled,
      matched: totalMatched,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
"@ | Out-File -FilePath "content/fill-all-use-case.js" -Encoding utf8

    @"
// content/special-insertion-use-case.js
import { DomValueSetter } from './dom-value-setter.js';
import { FieldHighlighter } from './field-highlighter.js';
import { ElementWaiter } from './element-waiter.js';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';
import { CounterGenerator } from '../domain/generators/counter-generator.js';
import { EmailGenerator } from '../domain/generators/email-generator.js';
import { PhoneGenerator } from '../domain/generators/phone-generator.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class SpecialInsertionUseCase {
  constructor() {
    this.valueSetter = new DomValueSetter();
    this.highlighter = new FieldHighlighter();
    this.waiter = new ElementWaiter();
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();

    this.generatorRegistry = new GeneratorRegistry();
    this.templateRenderer = new TemplateRenderer(this.generatorRegistry);

    this.generatorRegistry.register('counter', new CounterGenerator());
    this.generatorRegistry.register('email', new EmailGenerator());
    this.generatorRegistry.register('phone', new PhoneGenerator());
  }

  async execute(insertionId) {
    const state = await this.storage.getState();
    if (!state || !state.specialInsertions) {
      return { success: false, error: 'No insertions found' };
    }

    const url = window.location.href;
    let insertion = null;

    if (insertionId) {
      insertion = state.specialInsertions.find(ins => ins.id === insertionId);
      if (!insertion) {
        return { success: false, error: `Insertion with id ${insertionId} not found` };
      }
    } else {
      for (const ins of state.specialInsertions) {
        if (!ins.urlConditions || ins.urlConditions.length === 0) {
          insertion = ins;
          break;
        }
        if (this.urlMatcher.matchesConditions(ins.urlConditions, url)) {
          insertion = ins;
          break;
        }
      }
    }

    if (!insertion) {
      return { success: false, error: 'No matching insertion found' };
    }

    return await this._runInsertion(insertion, state);
  }

  async _runInsertion(insertion, state) {
    const context = {
      counters: state.counters || {},
      url: window.location.href
    };

    const usedFields = new WeakSet();
    let filledCount = 0;

    for (const step of insertion.steps || []) {
      const element = await this.waiter.waitForSelector(step.selector, 3000);
      if (!element) continue;

      if (usedFields.has(element)) continue;

      const value = this.templateRenderer.render(step.value || step.template, context);
      const success = this.valueSetter.setValue(element, value);
      if (success) {
        this.highlighter.highlight(element);
        usedFields.add(element);
        filledCount++;
      }
    }

    if (Object.keys(context.counters).length > 0) {
      state.counters = context.counters;
      await this.storage.saveState(state);
    }

    return {
      success: filledCount > 0,
      filled: filledCount,
      total: (insertion.steps || []).length
    };
  }
}
"@ | Out-File -FilePath "content/special-insertion-use-case.js" -Encoding utf8

    git add content/content-rule-executor.js content/fill-all-use-case.js content/special-insertion-use-case.js
    git commit -m "refactor(content): add ContentRuleExecutor, FillAllUseCase, SpecialInsertionUseCase"
    git push origin master

    Write-Host "✅ Stage 6c complete!" -ForegroundColor Green
}

function CreateStage7 {
    Write-Host "📦 Stage 7: Background Service Worker..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "background" | Out-Null

    @"
// background/content-script-injector.js
export class ContentScriptInjector {
  constructor() {
    this.injectedTabs = new Set();
  }

  async ensureInjected(tabId) {
    if (this.injectedTabs.has(tabId)) return true;

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'lib/generators.js',
          'lib/template.js',
          'lib/matcher.js',
          'content/picker.js',
          'content/content.js'
        ]
      });
      this.injectedTabs.add(tabId);
      return true;
    } catch (error) {
      console.error('Failed to inject content scripts:', error);
      return false;
    }
  }

  async injectCopyfxInterceptor(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        files: ['content/copyfx-interceptor.js']
      });
      return true;
    } catch (error) {
      console.error('Failed to inject CopyFX interceptor:', error);
      return false;
    }
  }

  clear(tabId) {
    this.injectedTabs.delete(tabId);
  }
}
"@ | Out-File -FilePath "background/content-script-injector.js" -Encoding utf8

    @"
// background/command-controller.js
export class CommandController {
  constructor() {
    this.commands = {};
  }

  register(command, handler) {
    this.commands[command] = handler;
  }

  async handleCommand(command, tab) {
    const handler = this.commands[command];
    if (handler) {
      return handler(tab);
    }
    return { success: false, error: 'Unknown command' };
  }
}
"@ | Out-File -FilePath "background/command-controller.js" -Encoding utf8

    @"
// background/ua-rules-service.js
export class UaRulesService {
  constructor() {
    this.currentRules = [];
  }

  async syncFromState(state) {
    const uaRules = state.uaRules || [];
    const rules = uaRules
      .filter(rule => rule.enabled !== false)
      .map((rule, index) => ({
        id: index + 1,
        priority: index + 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'User-Agent', operation: 'set', value: rule.userAgent }
          ]
        },
        condition: {
          urlFilter: rule.urlPattern || '*',
          resourceTypes: ['main_frame', 'sub_frame']
        }
      }));

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: this.currentRules.map(r => r.id),
        addRules: rules
      });
      this.currentRules = rules;
    } catch (error) {
      console.error('Failed to update UA rules:', error);
    }
  }
}
"@ | Out-File -FilePath "background/ua-rules-service.js" -Encoding utf8

    @"
// background/copyfx-bridge-service.js
export class CopyfxBridgeService {
  async getTraders(payload) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.traders || null;
        }
      });

      return result?.[0]?.result || { error: 'No traders data found' };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getInvestors() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.investors || null;
        }
      });

      return result?.[0]?.result || { error: 'No investors data found' };
    } catch (error) {
      return { error: error.message };
    }
  }
}
"@ | Out-File -FilePath "background/copyfx-bridge-service.js" -Encoding utf8

    @"
// background/message-proxy-controller.js
export class MessageProxyController {
  constructor() {
    this.handlers = {};
  }

  register(type, handler) {
    this.handlers[type] = handler;
  }

  async handleMessage(message, sender, sendResponse) {
    const handler = this.handlers[message.type];
    if (handler) {
      try {
        const result = await handler(message.payload, sender);
        sendResponse(result);
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }
    return false;
  }
}
"@ | Out-File -FilePath "background/message-proxy-controller.js" -Encoding utf8

    @"
// background/background-app.js
import { ContentScriptInjector } from './content-script-injector.js';
import { CommandController } from './command-controller.js';
import { UaRulesService } from './ua-rules-service.js';
import { CopyfxBridgeService } from './copyfx-bridge-service.js';
import { MessageProxyController } from './message-proxy-controller.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { DEFAULT_STATE } from '../domain/state-schema.js';

export class BackgroundApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.injector = new ContentScriptInjector();
    this.commandController = new CommandController();
    this.uaService = new UaRulesService();
    this.copyfxService = new CopyfxBridgeService();
    this.messageProxy = new MessageProxyController();

    this._setupCommands();
    this._setupMessageHandlers();
  }

  async boot() {
    const state = await this.storage.getState();
    if (!state) {
      await this.storage.saveState(this.migrator.ensureShape(DEFAULT_STATE));
    } else {
      const migrated = this.migrator.migrate(state);
      await this.storage.saveState(migrated);
    }

    const currentState = await this.storage.getState();
    await this.uaService.syncFromState(currentState);

    chrome.commands.onCommand.addListener((command) => {
      this._handleCommand(command);
    });
  }

  _setupCommands() {
    this.commandController.register('fill-all', async (tab) => {
      await this.injector.ensureInjected(tab.id);
      await this._sendToTab(tab.id, { type: 'FILL_ALL' });
    });

    this.commandController.register('fill-special', async (tab) => {
      await this.injector.ensureInjected(tab.id);
      await this._sendToTab(tab.id, { type: 'FILL_SPECIAL' });
    });
  }

  _setupMessageHandlers() {
    this.messageProxy.register('COPYFX_GET_TRADERS', async (payload) => {
      return this.copyfxService.getTraders(payload);
    });

    this.messageProxy.register('COPYFX_GET_INVESTORS', async () => {
      return this.copyfxService.getInvestors();
    });

    this.messageProxy.register('PROXY_TO_TAB', async (payload, sender) => {
      const tabId = sender?.tab?.id;
      if (!tabId) return { error: 'No tab id' };
      await this.injector.ensureInjected(tabId);
      return this._sendToTab(tabId, payload);
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.messageProxy.handleMessage(message, sender, sendResponse);
    });
  }

  async _handleCommand(command) {
    const tab = await this._getActiveTab();
    if (!tab) return;

    if (!this._isSupportedUrl(tab.url)) {
      console.warn('Command not supported on this URL:', tab.url);
      return;
    }

    await this.commandController.handleCommand(command, tab);
  }

  async _sendToTab(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('Failed to send message to tab:', error);
      return { error: error.message };
    }
  }

  async _getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  _isSupportedUrl(url) {
    if (!url) return false;
    const unsupported = [
      'chrome://', 'edge://', 'about:', 'chrome-extension://'
    ];
    return !unsupported.some(u => url.startsWith(u));
  }
}
"@ | Out-File -FilePath "background/background-app.js" -Encoding utf8

    git add background/
    git commit -m "refactor(background): split service worker into services"
    git push origin master

    Write-Host "✅ Stage 7 complete!" -ForegroundColor Green
}

function CreateStage8 {
    Write-Host "📦 Stage 8: Popup refactoring..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "popup" | Out-Null

    @"
// popup/popup-bootstrap.js
import { PopupApp } from './popup-app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  app.boot();
});
"@ | Out-File -FilePath "popup/popup-bootstrap.js" -Encoding utf8

    @"
// popup/popup-app.js
import { FillPanel } from './fill-panel.js';
import { ScraperPanel } from './scraper-panel.js';
import { CopyfxPanel } from './copyfx-panel.js';
import { InvestorPanel } from './investor-panel.js';
import { UaPanel } from './ua-panel.js';

export class PopupApp {
  constructor() {
    this.panels = [];
  }

  boot() {
    this.panels = [
      new FillPanel(),
      new ScraperPanel(),
      new CopyfxPanel(),
      new InvestorPanel(),
      new UaPanel()
    ];

    this.panels.forEach(panel => {
      if (panel.init) panel.init();
    });
  }
}
"@ | Out-File -FilePath "popup/popup-app.js" -Encoding utf8

    @"
// popup/fill-panel.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { UrlMatcher } from '../shared/url-matcher.js';

export class FillPanel {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();

    this.elements = {
      fillAll: document.getElementById('fillAll'),
      fillSpecial: document.getElementById('fillSpecial'),
      openOptions: document.getElementById('openOptions'),
      statusLabel: document.getElementById('statusLabel'),
      resultDetails: document.getElementById('resultDetails'),
      resultTable: document.getElementById('resultTable')
    };
  }

  async init() {
    this._bindEvents();
    await this._updateStatus();
  }

  _bindEvents() {
    if (this.elements.fillAll) {
      this.elements.fillAll.addEventListener('click', () => this._handleFillAll());
    }
    if (this.elements.fillSpecial) {
      this.elements.fillSpecial.addEventListener('click', () => this._handleFillSpecial());
    }
    if (this.elements.openOptions) {
      this.elements.openOptions.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }

  async _handleFillAll() {
    const result = await this._sendMessage('FILL_ALL');
    this._showResult(result);
  }

  async _handleFillSpecial() {
    const result = await this._sendMessage('FILL_SPECIAL');
    this._showResult(result);
  }

  async _updateStatus() {
    const state = await this.storage.getState();
    if (!state) return;

    const url = window.location.href;
    const activeRules = state.rules?.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    }) || [];

    if (this.elements.statusLabel) {
      this.elements.statusLabel.textContent = `Активных правил: ${activeRules.length}`;
    }
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  _showResult(result) {
    if (!result || !this.elements.resultDetails) return;

    this.elements.resultDetails.style.display = 'block';
    const table = this.elements.resultTable;
    if (table) {
      const errorsHtml = result.errors ? `<tr><td>Ошибки:</td><td>${result.errors.join(', ')}</td></tr>` : '';
      table.innerHTML = `
        <tr><td>Заполнено:</td><td>${result.filled || 0}</td></tr>
        <tr><td>Найдено:</td><td>${result.matched || 0}</td></tr>
        ${errorsHtml}
      `;
    }
  }
}
"@ | Out-File -FilePath "popup/fill-panel.js" -Encoding utf8

    @"
// popup/scraper-panel.js
export class ScraperPanel {
  constructor() {
    this.elements = {
      scraperBox: document.getElementById('scraperBox'),
      scrapeButton: document.getElementById('scrapeButton'),
      scraperResults: document.getElementById('scraperResults')
    };
  }

  init() {
    this._bindEvents();
  }

  _bindEvents() {
    if (this.elements.scrapeButton) {
      this.elements.scrapeButton.addEventListener('click', () => this._handleScrape());
    }
  }

  async _handleScrape() {
    const result = await this._sendMessage('SCRAPE_PAGE');
    this._showResults(result);
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  _showResults(data) {
    if (!data || !this.elements.scraperResults) return;
    this.elements.scraperResults.textContent = JSON.stringify(data, null, 2);
  }
}
"@ | Out-File -FilePath "popup/scraper-panel.js" -Encoding utf8

    @"
// popup/copyfx-panel.js
export class CopyfxPanel {
  constructor() {
    this.cache = {};
    this.elements = {
      copyfxBox: document.getElementById('copyfxBox'),
      copyfxTraders: document.getElementById('copyfxTraders'),
      copyfxRefresh: document.getElementById('copyfxRefresh')
    };
  }

  init() {
    this._bindEvents();
    this._loadData();
  }

  _bindEvents() {
    if (this.elements.copyfxRefresh) {
      this.elements.copyfxRefresh.addEventListener('click', () => this._loadData(true));
    }
  }

  async _loadData(force = false) {
    if (!force && this.cache.traders) {
      this._renderTraders(this.cache.traders);
      return;
    }

    const result = await this._sendMessage('COPYFX_GET_TRADERS');
    if (result && result.traders) {
      this.cache.traders = result.traders;
      this._renderTraders(result.traders);
    }
  }

  _renderTraders(traders) {
    if (!this.elements.copyfxTraders) return;
    this.elements.copyfxTraders.textContent = `Трейдеров: ${traders.length || 0}`;
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
"@ | Out-File -FilePath "popup/copyfx-panel.js" -Encoding utf8

    @"
// popup/investor-panel.js
export class InvestorPanel {
  constructor() {
    this.cache = {};
    this.elements = {
      investorSection: document.getElementById('investorSection'),
      investorList: document.getElementById('investorList')
    };
  }

  init() {
    this._bindEvents();
    this._loadData();
  }

  _bindEvents() {}

  async _loadData() {
    const result = await this._sendMessage('COPYFX_GET_INVESTORS');
    if (result && result.investors) {
      this.cache.investors = result.investors;
      this._renderInvestors(result.investors);
    }
  }

  _renderInvestors(investors) {
    if (!this.elements.investorList) return;
    this.elements.investorList.textContent = `Инвесторов: ${investors.length || 0}`;
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
"@ | Out-File -FilePath "popup/investor-panel.js" -Encoding utf8

    @"
// popup/ua-panel.js
export class UaPanel {
  constructor() {
    this.elements = {
      uaBox: document.getElementById('uaBox'),
      uaToggle: document.getElementById('uaToggle')
    };
  }

  init() {
    this._bindEvents();
    this._loadStatus();
  }

  _bindEvents() {
    if (this.elements.uaToggle) {
      this.elements.uaToggle.addEventListener('change', () => this._handleToggle());
    }
  }

  async _handleToggle() {
    const enabled = this.elements.uaToggle.checked;
    await this._sendMessage('UA_TOGGLE', { enabled });
  }

  async _loadStatus() {
    const state = await this._getState();
    if (state && state.uaRules && state.uaRules.length > 0 && this.elements.uaBox) {
      this.elements.uaBox.style.display = 'block';
      if (this.elements.uaToggle) {
        this.elements.uaToggle.checked = state.uaRules[0].enabled !== false;
      }
    }
  }

  _getState() {
    return new Promise((resolve) => {
      chrome.storage.local.get('state', (result) => {
        resolve(result.state || null);
      });
    });
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}
"@ | Out-File -FilePath "popup/ua-panel.js" -Encoding utf8

    git add popup/
    git commit -m "refactor(popup): split popup into independent panels"
    git push origin master

    Write-Host "✅ Stage 8 complete!" -ForegroundColor Green
}

function CreateStage9 {
    Write-Host "📦 Stage 9: Options page - bootstrap and app..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options" | Out-Null

    @"
// options/options-bootstrap.js
import { OptionsApp } from './options-app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new OptionsApp();
  app.boot();
});
"@ | Out-File -FilePath "options/options-bootstrap.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }

    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });

    window.addEventListener('beforeunload', () => {
      this._saveAll();
    });
  }

  _createControllers(state) {
    return [];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) {
        state = controller.save(state);
      }
    });
    await this.storage.saveState(state);
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/
    git commit -m "refactor(options): add bootstrap and app"
    git push origin master

    Write-Host "✅ Stage 9 complete!" -ForegroundColor Green
}

function CreateStage91 {
    Write-Host "📦 Stage 91: Options - RulesController..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/rules-controller.js
export class RulesController {
  constructor() {
    this.rules = [];
    this.container = document.getElementById('rulesContainer');
  }

  init(state) {
    this.rules = state.rules || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.rules.forEach((rule, index) => {
      const card = this._createCard(rule, index);
      this.container.appendChild(card);
    });
  }

  _createCard(rule, index) {
    const card = document.createElement('div');
    card.className = 'rule-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(rule.name || 'Без имени');
    const escapedTemplate = this._escapeHtml(rule.template || '');
    const conditionsStr = JSON.stringify(rule.conditions || {}, null, 2);
    const escapedConditions = this._escapeHtml(conditionsStr);
    card.innerHTML = \`
      <div class="rule-header">
        <span class="rule-name">\${escapedName}</span>
        <button class="rule-delete" data-index="\${index}">×</button>
      </div>
      <div class="rule-body">
        <div class="rule-template">
          <label>Шаблон:</label>
          <input type="text" class="rule-template-input" value="\${escapedTemplate}" data-index="\${index}">
        </div>
        <div class="rule-conditions">
          <label>Условия:</label>
          <textarea class="rule-conditions-input" data-index="\${index}">\${escapedConditions}</textarea>
        </div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('rule-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.rules.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addRuleBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.rules.push({ name: 'Новое правило', template: '{{text}}', conditions: { items: [] } });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    const inputs = this.container?.querySelectorAll('.rule-template-input');
    inputs?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].template = input.value;
    });
    state.rules = this.rules;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/rules-controller.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }

    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [ new RulesController() ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/controllers/rules-controller.js options/options-app.js
    git commit -m "refactor(options): add RulesController"
    git push origin master

    Write-Host "✅ Stage 91 complete!" -ForegroundColor Green
}

function CreateStage92 {
    Write-Host "📦 Stage 92: Options - FoldersController..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/folders-controller.js
export class FoldersController {
  constructor() {
    this.folders = [];
    this.container = document.getElementById('foldersContainer');
  }

  init(state) {
    this.folders = state.folders || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.folders.forEach((folder, index) => {
      const card = this._createCard(folder, index);
      this.container.appendChild(card);
    });
  }

  _createCard(folder, index) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(folder.name || 'Без имени');
    const rulesCount = (folder.rules || []).length;
    let rulesList = '';
    (folder.rules || []).forEach(ruleId => {
      rulesList += '<li>' + this._escapeHtml(ruleId) + '</li>';
    });
    card.innerHTML = \`
      <div class="folder-header">
        <span class="folder-name">\${escapedName}</span>
        <span class="folder-count">(\${rulesCount} правил)</span>
        <button class="folder-delete" data-index="\${index}">×</button>
      </div>
      <div class="folder-body">
        <div class="folder-rules"><ul>\${rulesList}</ul></div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('folder-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.folders.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addFolderBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.folders.push({ name: 'Новая папка', rules: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.folders = this.folders;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/folders-controller.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';
import { FoldersController } from './controllers/folders-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }
    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [ new RulesController(), new FoldersController() ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/controllers/folders-controller.js options/options-app.js
    git commit -m "refactor(options): add FoldersController"
    git push origin master

    Write-Host "✅ Stage 92 complete!" -ForegroundColor Green
}

function CreateStage93 {
    Write-Host "📦 Stage 93: Special Insertions & Smart Counters..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/special-insertions-controller.js
export class SpecialInsertionsController {
  constructor() {
    this.insertions = [];
    this.container = document.getElementById('specialInsertionsContainer');
  }

  init(state) {
    this.insertions = state.specialInsertions || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.insertions.forEach((insertion, index) => {
      const card = this._createCard(insertion, index);
      this.container.appendChild(card);
    });
  }

  _createCard(insertion, index) {
    const card = document.createElement('div');
    card.className = 'insertion-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(insertion.name || 'Без имени');
    const stepsCount = (insertion.steps || []).length;
    let stepsList = '';
    (insertion.steps || []).forEach(step => {
      stepsList += '<li>' + this._escapeHtml(step.selector || '') + '</li>';
    });
    card.innerHTML = \`
      <div class="insertion-header">
        <span class="insertion-name">\${escapedName}</span>
        <span class="insertion-count">(\${stepsCount} шагов)</span>
        <button class="insertion-delete" data-index="\${index}">×</button>
      </div>
      <div class="insertion-body">
        <div class="insertion-steps"><ul>\${stepsList}</ul></div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('insertion-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.insertions.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addInsertionBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.insertions.push({ name: 'Новая вставка', steps: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.specialInsertions = this.insertions;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/special-insertions-controller.js" -Encoding utf8

    @"
// options/controllers/smart-counters-controller.js
export class SmartCountersController {
  constructor() {
    this.counters = [];
    this.container = document.getElementById('smartCountersContainer');
  }

  init(state) {
    this.counters = state.smartCounters || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.counters.forEach((counter, index) => {
      const card = this._createCard(counter, index);
      this.container.appendChild(card);
    });
  }

  _createCard(counter, index) {
    const card = document.createElement('div');
    card.className = 'counter-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(counter.name || 'Без имени');
    const currentValue = counter.current || 0;
    card.innerHTML = \`
      <div class="counter-header">
        <span class="counter-name">\${escapedName}</span>
        <span class="counter-value">\${currentValue}</span>
        <button class="counter-delete" data-index="\${index}">×</button>
      </div>
      <div class="counter-body">
        <div class="counter-history">История: \${(counter.history || []).length} записей</div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('counter-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.counters.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addCounterBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.counters.push({ name: 'Новый счётчик', current: 0, history: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.smartCounters = this.counters;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/smart-counters-controller.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';
import { FoldersController } from './controllers/folders-controller.js';
import { SpecialInsertionsController } from './controllers/special-insertions-controller.js';
import { SmartCountersController } from './controllers/smart-counters-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }
    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [
      new RulesController(),
      new FoldersController(),
      new SpecialInsertionsController(),
      new SmartCountersController()
    ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add special insertions and smart counters controllers"
    git push origin master

    Write-Host "✅ Stage 93 complete!" -ForegroundColor Green
}

function CreateStage94 {
    Write-Host "📦 Stage 94: Import/Export, Snapshots & Word Lists..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/import-export-controller.js
export class ImportExportController {
  constructor() {
    this.exportBtn = document.getElementById('exportBtn');
    this.importInput = document.getElementById('importInput');
    this.importBtn = document.getElementById('importBtn');
  }

  init(state) {
    this.state = state;
    this._bindEvents();
  }

  _bindEvents() {
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => this._handleExport());
    }
    if (this.importBtn) {
      this.importBtn.addEventListener('click', () => this._handleImport());
    }
  }

  async _handleExport() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formfiller-state-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async _handleImport() {
    const file = this.importInput?.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      document.dispatchEvent(new CustomEvent('options-import', { detail: imported }));
    } catch (error) {
      console.error('Failed to import:', error);
    }
  }

  save(state) {
    return state;
  }
}
"@ | Out-File -FilePath "options/controllers/import-export-controller.js" -Encoding utf8

    @"
// options/controllers/snapshots-controller.js
export class SnapshotsController {
  constructor() {
    this.snapshots = [];
    this.container = document.getElementById('snapshotsContainer');
  }

  init(state) {
    this.snapshots = state.snapshots || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.snapshots.forEach((snapshot, index) => {
      const card = this._createCard(snapshot, index);
      this.container.appendChild(card);
    });
  }

  _createCard(snapshot, index) {
    const card = document.createElement('div');
    card.className = 'snapshot-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(snapshot.name || 'Снапшот ' + (index + 1));
    const date = snapshot.date ? new Date(snapshot.date).toLocaleDateString() : 'Дата неизвестна';
    card.innerHTML = \`
      <div class="snapshot-header">
        <span class="snapshot-name">\${escapedName}</span>
        <span class="snapshot-date">\${date}</span>
        <button class="snapshot-delete" data-index="\${index}">×</button>
      </div>
      <div class="snapshot-body">
        <button class="snapshot-restore" data-index="\${index}">Восстановить</button>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('snapshot-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.snapshots.splice(index, 1);
        this.render();
        this._save();
      }
      if (e.target.classList.contains('snapshot-restore')) {
        const index = parseInt(e.target.dataset.index);
        const snapshot = this.snapshots[index];
        if (snapshot) {
          document.dispatchEvent(new CustomEvent('options-restore', { detail: snapshot }));
        }
      }
    });
    const addBtn = document.getElementById('addSnapshotBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.snapshots.push({
          name: 'Снапшот ' + (this.snapshots.length + 1),
          date: new Date().toISOString(),
          data: {}
        });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.snapshots = this.snapshots;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/snapshots-controller.js" -Encoding utf8

    @"
// options/controllers/word-lists-controller.js
export class WordListsController {
  constructor() {
    this.lists = [];
    this.container = document.getElementById('wordListsContainer');
  }

  init(state) {
    this.lists = state.customWordLists || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.lists.forEach((list, index) => {
      const card = this._createCard(list, index);
      this.container.appendChild(card);
    });
  }

  _createCard(list, index) {
    const card = document.createElement('div');
    card.className = 'wordlist-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(list.name || 'Без имени');
    const wordsCount = (list.words || []).length;
    let wordsHtml = '';
    (list.words || []).forEach(w => {
      wordsHtml += '<span class="word-tag">' + this._escapeHtml(w) + '</span>';
    });
    card.innerHTML = \`
      <div class="wordlist-header">
        <span class="wordlist-name">\${escapedName}</span>
        <span class="wordlist-count">(\${wordsCount} слов)</span>
        <button class="wordlist-delete" data-index="\${index}">×</button>
      </div>
      <div class="wordlist-body">
        <div class="wordlist-words">\${wordsHtml}</div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('wordlist-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.lists.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addWordListBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.lists.push({ name: 'Новый список', words: [] });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.customWordLists = this.lists;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/word-lists-controller.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';
import { FoldersController } from './controllers/folders-controller.js';
import { SpecialInsertionsController } from './controllers/special-insertions-controller.js';
import { SmartCountersController } from './controllers/smart-counters-controller.js';
import { ImportExportController } from './controllers/import-export-controller.js';
import { SnapshotsController } from './controllers/snapshots-controller.js';
import { WordListsController } from './controllers/word-lists-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [], snapshots: [], customWordLists: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }
    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    document.addEventListener('options-import', (e) => this._handleImport(e.detail));
    document.addEventListener('options-restore', (e) => this._handleRestore(e.detail));
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [
      new RulesController(),
      new FoldersController(),
      new SpecialInsertionsController(),
      new SmartCountersController(),
      new ImportExportController(),
      new SnapshotsController(),
      new WordListsController()
    ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }

  async _handleImport(importedData) {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.import) state = controller.import(state, importedData);
    });
    await this.storage.saveState(state);
    location.reload();
  }

  async _handleRestore(snapshot) {
    if (snapshot.data) {
      await this.storage.saveState(snapshot.data);
      location.reload();
    }
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add import-export, snapshots and word lists controllers"
    git push origin master

    Write-Host "✅ Stage 94 complete!" -ForegroundColor Green
}

function CreateStage95 {
    Write-Host "📦 Stage 95: Scraper Config, CopyFX Config & UA Rules..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "options/controllers" | Out-Null

    @"
// options/controllers/scraper-config-controller.js
export class ScraperConfigController {
  constructor() {
    this.config = {};
    this.container = document.getElementById('scraperConfigContainer');
  }

  init(state) {
    this.config = state.scraperConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = \`
      <div class="scraper-config">
        <label>
          <input type="checkbox" class="scraper-enabled" \${this.config.enabled ? 'checked' : ''}>
          Включить Scraper
        </label>
        <div class="scraper-settings">
          <label>URL паттерны:</label>
          <textarea class="scraper-urls">\${(this.config.urlPatterns || []).join('\n')}</textarea>
        </div>
      </div>
    \`;
  }

  _bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('scraper-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.scraper-enabled');
      const urls = this.container.querySelector('.scraper-urls');
      if (enabled) this.config.enabled = enabled.checked;
      if (urls) this.config.urlPatterns = urls.value.split('\n').filter(Boolean);
    }
    state.scraperConfig = this.config;
    return state;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/scraper-config-controller.js" -Encoding utf8

    @"
// options/controllers/copyfx-config-controller.js
export class CopyfxConfigController {
  constructor() {
    this.config = {};
    this.container = document.getElementById('copyfxConfigContainer');
  }

  init(state) {
    this.config = state.copyfxConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = \`
      <div class="copyfx-config">
        <label>
          <input type="checkbox" class="copyfx-enabled" \${this.config.enabled ? 'checked' : ''}>
          Включить CopyFX
        </label>
        <div class="copyfx-settings">
          <label>Административный домен:</label>
          <input type="text" class="copyfx-domain" value="\${this.config.adminDomain || ''}">
        </div>
      </div>
    \`;
  }

  _bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('copyfx-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.copyfx-enabled');
      const domain = this.container.querySelector('.copyfx-domain');
      if (enabled) this.config.enabled = enabled.checked;
      if (domain) this.config.adminDomain = domain.value;
    }
    state.copyfxConfig = this.config;
    return state;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/copyfx-config-controller.js" -Encoding utf8

    @"
// options/controllers/ua-rules-controller.js
export class UaRulesController {
  constructor() {
    this.rules = [];
    this.container = document.getElementById('uaRulesContainer');
  }

  init(state) {
    this.rules = state.uaRules || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.rules.forEach((rule, index) => {
      const card = this._createCard(rule, index);
      this.container.appendChild(card);
    });
  }

  _createCard(rule, index) {
    const card = document.createElement('div');
    card.className = 'ua-rule-card';
    card.dataset.index = index;
    const escapedUserAgent = this._escapeHtml(rule.userAgent || '');
    const escapedUrlPattern = this._escapeHtml(rule.urlPattern || '*');
    card.innerHTML = \`
      <div class="ua-rule-header">
        <span class="ua-rule-index">#\${index + 1}</span>
        <span class="ua-rule-enabled">\${rule.enabled !== false ? '✅' : '❌'}</span>
        <button class="ua-rule-delete" data-index="\${index}">×</button>
      </div>
      <div class="ua-rule-body">
        <div class="ua-rule-field">
          <label>User-Agent:</label>
          <input type="text" class="ua-rule-agent" value="\${escapedUserAgent}" data-index="\${index}">
        </div>
        <div class="ua-rule-field">
          <label>URL паттерн:</label>
          <input type="text" class="ua-rule-url" value="\${escapedUrlPattern}" data-index="\${index}">
        </div>
        <div class="ua-rule-field">
          <label>
            <input type="checkbox" class="ua-rule-enabled-checkbox" \${rule.enabled !== false ? 'checked' : ''} data-index="\${index}">
            Включено
          </label>
        </div>
      </div>
    \`;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('ua-rule-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.rules.splice(index, 1);
        this.render();
        this._save();
      }
    });
    const addBtn = document.getElementById('addUaRuleBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.rules.push({ userAgent: 'Mozilla/5.0 ...', urlPattern: '*', enabled: true });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    const agents = this.container?.querySelectorAll('.ua-rule-agent');
    const urls = this.container?.querySelectorAll('.ua-rule-url');
    const checkboxes = this.container?.querySelectorAll('.ua-rule-enabled-checkbox');
    agents?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].userAgent = input.value;
    });
    urls?.forEach((input, index) => {
      if (this.rules[index]) this.rules[index].urlPattern = input.value;
    });
    checkboxes?.forEach((checkbox, index) => {
      if (this.rules[index]) this.rules[index].enabled = checkbox.checked;
    });
    state.uaRules = this.rules;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
"@ | Out-File -FilePath "options/controllers/ua-rules-controller.js" -Encoding utf8

    @"
// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';
import { FoldersController } from './controllers/folders-controller.js';
import { SpecialInsertionsController } from './controllers/special-insertions-controller.js';
import { SmartCountersController } from './controllers/smart-counters-controller.js';
import { ImportExportController } from './controllers/import-export-controller.js';
import { SnapshotsController } from './controllers/snapshots-controller.js';
import { WordListsController } from './controllers/word-lists-controller.js';
import { ScraperConfigController } from './controllers/scraper-config-controller.js';
import { CopyfxConfigController } from './controllers/copyfx-config-controller.js';
import { UaRulesController } from './controllers/ua-rules-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [], snapshots: [], customWordLists: [], scraperConfig: { enabled: false }, copyfxConfig: { enabled: false }, uaRules: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }
    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    document.addEventListener('options-import', (e) => this._handleImport(e.detail));
    document.addEventListener('options-restore', (e) => this._handleRestore(e.detail));
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [
      new RulesController(),
      new FoldersController(),
      new SpecialInsertionsController(),
      new SmartCountersController(),
      new ImportExportController(),
      new SnapshotsController(),
      new WordListsController(),
      new ScraperConfigController(),
      new CopyfxConfigController(),
      new UaRulesController()
    ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }

  async _handleImport(importedData) {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.import) state = controller.import(state, importedData);
    });
    await this.storage.saveState(state);
    location.reload();
  }

  async _handleRestore(snapshot) {
    if (snapshot.data) {
      await this.storage.saveState(snapshot.data);
      location.reload();
    }
  }
}
"@ | Out-File -FilePath "options/options-app.js" -Encoding utf8

    git add options/controllers/
    git commit -m "refactor(options): add scraper config, copyfx config and ua rules controllers"
    git push origin master

    Write-Host "✅ Stage 95 complete!" -ForegroundColor Green
}

function CreateStage10 {
    Write-Host "📦 Stage 10: CopyFX interceptor hardening..." -ForegroundColor Yellow

    @"
// content/copyfx-interceptor.js
(function() {
    // Guard: предотвращаем повторную установку
    if (window.__dpi_copyfx_interceptor_installed) {
        console.log('ℹ️ CopyFX interceptor already installed');
        return;
    }
    window.__dpi_copyfx_interceptor_installed = true;

    // Кэш для хранения данных
    window.__dpi_copyfx_cache = window.__dpi_copyfx_cache || {
        traders: null,
        investors: null,
        history: []
    };

    // Проверка URL на принадлежность к CopyFX API
    function isCopyfxUrl(url) {
        if (!url) return false;
        const patterns = [
            '/api/traders',
            '/api/investors',
            '/api/copyfx',
            '/api/fx'
        ];
        return patterns.some(pattern => url.includes(pattern));
    }

    // Безопасный парсинг JSON
    function safeJsonParse(text) {
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (_) {
            return null;
        }
    }

    // Сохранение данных в кэш
    function storeData(url, data) {
        if (!data) return;

        const historyEntry = {
            url: url,
            timestamp: Date.now(),
            data: data
        };

        window.__dpi_copyfx_cache.history.push(historyEntry);
        if (window.__dpi_copyfx_cache.history.length > 50) {
            window.__dpi_copyfx_cache.history.shift();
        }

        if (url.includes('traders')) {
            window.__dpi_copyfx_cache.traders = data;
        } else if (url.includes('investors')) {
            window.__dpi_copyfx_cache.investors = data;
        }
    }

    // Перехват fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input?.url || '';

        return originalFetch.call(this, input, init).then(async (response) => {
            if (isCopyfxUrl(url)) {
                try {
                    const clonedResponse = response.clone();
                    const text = await clonedResponse.text();
                    const data = safeJsonParse(text);
                    if (data) {
                        storeData(url, data);
                    }
                } catch (error) {
                    // Тихо игнорируем ошибки парсинга
                }
            }
            return response;
        });
    };

    // Перехват XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._dpi_url = url;
        return originalOpen.call(this, method, url, async !== false, user, password);
    };

    XMLHttpRequest.prototype.send = function(body) {
        this.addEventListener('load', function() {
            if (!this._dpi_url) return;
            if (!isCopyfxUrl(this._dpi_url)) return;

            const data = safeJsonParse(this.responseText);
            if (data) {
                storeData(this._dpi_url, data);
            }
        });

        return originalSend.call(this, body);
    };

    console.log('✅ CopyFX interceptor installed successfully');
})();
"@ | Out-File -FilePath "content/copyfx-interceptor.js" -Encoding utf8

    git add content/copyfx-interceptor.js
    git commit -m "refactor(copyfx): harden network interceptor"
    git push origin master

    Write-Host "✅ Stage 10 complete!" -ForegroundColor Green
    Write-Host "📌 Next: Stage 11 - Tests expansion" -ForegroundColor Yellow
}

function CreateStage11 {
    Write-Host "📦 Stage 11: Tests expansion..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "tests" | Out-Null

    @"
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
      { type: 'token', value: 'name' }
    ]);
  });

  it('should parse token with params', () => {
    const result = parser.parse('{{counter:users}}');
    expect(result).toEqual([
      { type: 'token', value: 'counter:users' }
    ]);
  });

  it('should parse multiple tokens', () => {
    const result = parser.parse('{{a}} and {{b}}');
    expect(result).toEqual([
      { type: 'token', value: 'a' },
      { type: 'text', value: ' and ' },
      { type: 'token', value: 'b' }
    ]);
  });

  it('should handle escaped tokens', () => {
    const result = parser.parse('\\{{escaped}}');
    expect(result).toEqual([
      { type: 'text', value: '{{escaped}}' }
    ]);
  });

  it('should handle empty template', () => {
    expect(parser.parse('')).toEqual([]);
    expect(parser.parse(null)).toEqual([]);
  });
});
"@ | Out-File -FilePath "tests/template-parser.test.js" -Encoding utf8

    @"
// tests/template-renderer.test.js
import { describe, it, expect, vi } from 'vitest';
import { TemplateRenderer } from '../domain/templates/template-renderer.js';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';

describe('TemplateRenderer', () => {
  const registry = new GeneratorRegistry();
  const mockGenerator = {
    generate: vi.fn().mockReturnValue('mocked_value')
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
"@ | Out-File -FilePath "tests/template-renderer.test.js" -Encoding utf8

    @"
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
"@ | Out-File -FilePath "tests/counter-generator.test.js" -Encoding utf8

    @"
// tests/state-migrator.test.js
import { describe, it, expect } from 'vitest';
import { StateMigrator } from '../domain/state-migrator.js';

describe('StateMigrator', () => {
  const migrator = new StateMigrator();

  it('should migrate profiles to folders', () => {
    const oldState = {
      profiles: [
        { id: 'p1', name: 'Profile 1', rules: [{ id: 'r1', name: 'Rule 1' }] },
        { id: 'p2', name: 'Profile 2', rules: [{ id: 'r2', name: 'Rule 2' }] }
      ]
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
"@ | Out-File -FilePath "tests/state-migrator.test.js" -Encoding utf8

    @"
// tests/generator-registry.test.js
import { describe, it, expect } from 'vitest';
import { GeneratorRegistry } from '../domain/generators/generator-registry.js';

describe('GeneratorRegistry', () => {
  const registry = new GeneratorRegistry();

  const mockGenerator = {
    generate: () => 'test'
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
"@ | Out-File -FilePath "tests/generator-registry.test.js" -Encoding utf8

    git add tests/
    git commit -m "test(domain): add regression coverage for core logic"
    git push origin master

    Write-Host "✅ Stage 11 complete!" -ForegroundColor Green
    Write-Host "📌 Run: npm run test" -ForegroundColor Yellow
    Write-Host "📌 Next: Stage 12 - Final stabilization" -ForegroundColor Yellow
}

function CreateStage12 {
    Write-Host "📦 Stage 12: Final stabilization..." -ForegroundColor Yellow

    # Обновляем README.md
    @"
# Dumb Patrick Inputs — Chrome Extension для умного заполнения форм

Расширение для Chrome, которое автоматически заполняет веб-формы по заданным правилам.

## Возможности

- 🚀 **Заполнение форм** — по правилам с поддержкой CSS-селекторов и атрибутов
- 🎯 **Спецвставки** — заполнение сложных форм с ожиданием элементов
- 📊 **Счётчики** — автоматическое увеличение чисел при каждом заполнении
- 📁 **Папки** — группировка правил для разных проектов
- 🔄 **Импорт/Экспорт** — перенос настроек между устройствами
- 📸 **Снапшоты** — сохранение и восстановление состояния
- 🌐 **User-Agent** — подмена User-Agent для разных сайтов
- 📈 **Scraper** — сбор данных со страниц
- 💹 **CopyFX** — интеграция с трейдинговыми платформами

## Установка

1. Скачай репозиторий
2. Открой `chrome://extensions`
3. Включи "Режим разработчика"
4. Нажми "Загрузить распакованное расширение"
5. Выбери папку с проектом

## Горячие клавиши

- `Ctrl+Shift+F` — заполнить все поля
- `Ctrl+Shift+1` — выполнить спецвставку

## Структура проекта

\`\`\`
formfiller-extension/
├── background/         # Service worker
├── content/           # Content scripts
├── domain/           # Бизнес-логика
├── infrastructure/   # Работа с Chrome API
├── options/          # Страница настроек
├── popup/            # Popup-окно
├── shared/           # Общие утилиты
└── tests/            # Unit-тесты
\`\`\`

## Разработка

\`\`\`bash
# Установка зависимостей
npm install

# Запуск тестов
npm run test

# Проверка кода
npm run lint
npm run format:check
\`\`\`

## Лицензия

MIT
"@ | Out-File -FilePath "README.md" -Encoding utf8

    # Создаём архитектурную документацию
    New-Item -ItemType Directory -Force -Path "docs" | Out-Null

    @"
# Архитектура проекта

## Слои

### 1. UI Layer (popup/, options/)
- Отвечает за отображение интерфейса
- Не содержит бизнес-логики
- Использует сервисы из application слоя

### 2. Application Layer (content/, background/)
- Содержит use-case'ы и контроллеры
- Координирует работу domain и infrastructure
- Примеры: FillAllUseCase, BackgroundApp

### 3. Domain Layer (domain/)
- Чистая бизнес-логика
- Не зависит от Chrome API и DOM
- Примеры: TemplateParser, RuleMatcher

### 4. Infrastructure Layer (infrastructure/)
- Работа с внешними API (Chrome storage, messaging)
- Примеры: ChromeStorageRepository

### 5. Shared Layer (shared/)
- Общие утилиты
- Примеры: UrlMatcher

## Ключевые инварианты

### State
- Хранится в `chrome.storage.local.state`
- Мигрируется через `StateMigrator`
- Используется через `ChromeStorageRepository`

### Messages
- `FILL_ALL` — заполнение всех полей
- `FILL_SPECIAL` — спецвставка
- `PICK_ELEMENT` — выбор элемента
- `PREVIEW_TEMPLATE` — предпросмотр шаблона
- `SCRAPE_*` — сбор данных
- `COPYFX_*` — работа с CopyFX

## Тестирование

- Unit-тесты: `npm run test`
- Покрытие: domain и shared слои
- Используется Vitest + jsdom
"@ | Out-File -FilePath "docs/architecture.md" -Encoding utf8

    @"
# State Schema

## Полная структура state

\`\`\`javascript
{
  rules: [
    {
      id: string,
      name: string,
      template: string,      // Шаблон для заполнения
      conditions: {
        mode: 'AND' | 'OR',
        items: [
          {
            selector: string,  // CSS-селектор
            // или
            attr: string,      // Атрибут
            pattern: string,
            useRegex: boolean
          }
        ]
      },
      urlConditions: [
        {
          pattern: string,    // URL-паттерн с *
          // или
          regex: string
        }
      ],
      order: number
    }
  ],
  folders: [
    {
      id: string,
      name: string,
      rules: string[]        // ID правил в папке
    }
  ],
  specialInsertions: [
    {
      id: string,
      name: string,
      urlConditions: [...],  // Те же, что у rules
      steps: [
        {
          selector: string,
          value: string,     // Шаблон для вставки
          delay: number      // Задержка перед заполнением
        }
      ]
    }
  ],
  smartCounters: [
    {
      id: string,
      name: string,
      current: number,
      history: number[]
    }
  ],
  counters: {
    [key: string]: number   // Простые счётчики
  },
  snapshots: [
    {
      id: string,
      name: string,
      date: string,
      data: object          // Полный state
    }
  ],
  customWordLists: [
    {
      id: string,
      name: string,
      words: string[]
    }
  ],
  scraperConfig: {
    enabled: boolean,
    urlPatterns: string[]
  },
  copyfxConfig: {
    enabled: boolean,
    adminDomain: string
  },
  uaRules: [
    {
      userAgent: string,
      urlPattern: string,
      enabled: boolean
    }
  ],
  pageShortcuts: [
    {
      key: string,
      modifiers: string[],  // ['ctrl', 'shift']
      action: 'fillAll' | 'fillSpecial',
      urlPattern: string
    }
  ],
  activityLog: [
    {
      timestamp: number,
      action: string,
      details: object
    }
  ]
}
\`\`\`

## Миграции

Все миграции проходят через `StateMigrator.migrate()`.
При добавлении новых полей обновляется `ensureShape()`.
"@ | Out-File -FilePath "docs/state-schema.md" -Encoding utf8

    @"
# Message Contracts

## Popup → Background

| Тип | Назначение |
|-----|------------|
| `FILL_ALL` | Заполнить все поля на странице |
| `FILL_SPECIAL` | Выполнить спецвставку |
| `PICK_ELEMENT` | Запустить picker |
| `PREVIEW_TEMPLATE` | Показать предпросмотр шаблона |
| `SCRAPE_FIELDS` | Собрать поля со страницы |
| `SCRAPE_PAGE` | Собрать всю страницу |
| `COPYFX_GET_TRADERS` | Получить трейдеров |
| `COPYFX_GET_INVESTORS` | Получить инвесторов |

## Background → Content

| Тип | Назначение |
|-----|------------|
| `FILL_ALL` | Выполнить fillAll на странице |
| `FILL_SPECIAL` | Выполнить fillSpecial на странице |
| `FILL_INSERTION_BY_ID` | Выполнить спецвставку по ID |
| `PREVIEW_TEMPLATE` | Показать предпросмотр шаблона |
| `PICK_ELEMENT` | Запустить picker |
| `SCRAPE_FIELDS` | Собрать поля со страницы |
| `SCRAPE_PAGE` | Собрать всю страницу |

## Ответы

Все ответы — объекты с полем `error` в случае ошибки:

\`\`\`javascript
{ filled: 5, matched: 10 }  // Успех
{ error: 'No rules found' } // Ошибка
\`\`\`
"@ | Out-File -FilePath "docs/message-contracts.md" -Encoding utf8

    # Удаляем dead code и завершённые TODO (если есть)
    # (пропускаем, так как скрипт не может анализировать код)

    git add README.md docs/architecture.md docs/state-schema.md docs/message-contracts.md
    git commit -m "docs(refactoring): finalize architecture documentation"
    git push origin master

    Write-Host "✅ Stage 12 complete!" -ForegroundColor Green
    Write-Host "🎉 Refactoring is COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Final checklist:" -ForegroundColor Yellow
    Write-Host "  1. Load extension in chrome://extensions" -ForegroundColor White
    Write-Host "  2. Test popup, options, fill all, fill special" -ForegroundColor White
    Write-Host "  3. Test import/export" -ForegroundColor White
    Write-Host "  4. Test CopyFX (if enabled)" -ForegroundColor White
    Write-Host "  5. Run: npm run lint" -ForegroundColor White
    Write-Host "  6. Run: npm run test" -ForegroundColor White
    Write-Host "  7. Check console for errors" -ForegroundColor White
    Write-Host ""
    Write-Host "🎊 Congratulations! The project is now fully refactored!" -ForegroundColor Green
}

# Основная логика
switch ($Stage) {
    "0" { CreateStage0 }
    "1" { CreateStage1 }
    "2" { CreateStage2 }
    "3" { CreateStage3 }
    "4" { CreateStage4 }
    "5" { CreateStage5 }
    "6" { CreateStage6 }
    "6b" { CreateStage6b }
    "6c" { CreateStage6c }
    "7" { CreateStage7 }
    "8" { CreateStage8 }
    "9" { CreateStage9 }
    "91" { CreateStage91 }
    "92" { CreateStage92 }
    "93" { CreateStage93 }
    "94" { CreateStage94 }
    "95" { CreateStage95 }
    "10" { CreateStage10 }
    "11" { CreateStage11 }
    "12" { CreateStage12 }
    default {
        Write-Host "❌ Unknown stage: $Stage" -ForegroundColor Red
        Write-Host "Available: 0, 1, 2, 3, 4, 5, 6, 6b, 6c, 7, 8, 9, 91, 92, 93, 94, 95, 10, 11, 12" -ForegroundColor Yellow
    }
}