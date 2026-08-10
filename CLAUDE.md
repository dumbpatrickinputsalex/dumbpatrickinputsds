# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dumb Patrick Inputs** — Chrome Extension (Manifest V3) for form filling. Features rule-based field matching with AND/OR logic, Mustache-like templates with dynamic generators, special insertions per URL, smart incrementors, and full import/export of settings. All data lives in `chrome.storage.local`.

The project is vanilla JavaScript with no build step — load it as an unpacked extension at `chrome://extensions/`.

## Architecture

### Execution Flow

User → Popup / Hotkey (Ctrl+Shift+F / Ctrl+Shift+1)
→ background.js (service worker: routes commands, manages state)
→ content/content.js (fills fields on the page)
→ lib/matcher.js (finds matching DOM fields per rule)
→ lib/template.js (parses {{token}} templates)
→ lib/generators.js (generates values: email, phone, counter, seq, regex, etc.)
→ chrome.storage.local (persists counters/state)

### Global Namespace `window.FF`

All content-script modules register on `window.FF`. Load order in manifest is critical:
generators.js → template.js → matcher.js → picker.js → content.js
Key exports: `FF.generators`, `FF.parse`, `FF.render`, `FF.findMatches`, `FF.urlMatches`, `FF.startPicker`, `FF.fillAll`, `FF.fillSpecial`.

### Content Scripts Run in Two Worlds

- `copyfx-interceptor.js` runs in `MAIN` world at `document_start` — monkey-patches `fetch`/`XHR` to cache CopyFX API responses in `window.__dpi_copyfx_cache`.
- Everything else runs in the isolated world at `document_idle`.

### State Model

Single `state` object in `chrome.storage.local` contains: `rules[]`, `folders[]`, `specialInsertions[]`, `smartCounters[]`, `snapshots[]`, `pageShortcuts[]`, `counters{}`, `scraperConfig`, `copyfxConfig`, `uaRules[]`, `customWordLists[]`, `activityLog[]`. Every write replaces the entire object.

`background.js` owns `DEFAULT_STATE`, `migrate()` (profiles→folders+rules), and `ensureShape()`.

### Message Types (background ↔ content)

`FILL_ALL`, `FILL_SPECIAL`, `FILL_INSERTION_BY_ID`, `PICK_ELEMENT`, `PREVIEW_TEMPLATE`, `SCRAPE_FIELDS`, `SCRAPE_PAGE`, `COPYFX_GET_TRADERS`, `COPYFX_GET_INVESTORS`, `PROXY_TO_TAB`.

### Framework-Safe Value Setting

`content.js` uses native property setters (`HTMLInputElement.prototype.value.set`, etc.) and dispatches `input`/`change`/`blur` events so React/Vue/Angular correctly detect changes.

## Key Files

| File                            | Role                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `background.js`                 | Service worker: state init/migration, hotkey routing, UA rules (declarativeNetRequest), CopyFX bridge |
| `content/content.js`            | Main content script: fills fields, runs special insertions, handles page shortcuts                    |
| `content/picker.js`             | DOM element picker overlay — generates CSS selectors on click                                         |
| `content/copyfx-interceptor.js` | MAIN world script; intercepts fetch/XHR for CopyFX API caching                                        |
| `lib/generators.js`             | All template token generators (email, phone, counter, seq, regex, etc.)                               |
| `lib/template.js`               | `{{token:param}}` parser and renderer                                                                 |
| `lib/matcher.js`                | Rule-to-field matching: selector/attribute/order conditions with AND/OR logic                         |
| `options/options.js`            | Full options page logic (~2500+ lines) — rules, insertions, counters, snapshots, import/export        |
| `options/analyzer.js`           | Analyzes pasted HTML to auto-generate selectors and suggest templates                                 |
| `popup/popup.js`                | Popup logic: fill actions, scraper, CopyFX traders/investors, UA toggle                               |

## Template Token Syntax

`{{token}}` or `{{token:param1:param2}}`. Special cases: `pick` uses `|` separator (`{{pick:a\|b\|c}}`), `regex` treats everything after first `:` as one argument. Stateful tokens (`counter`, `increment`, `seq`) mutate `ctx` which gets persisted after fill.

## Development

No build tools, no package.json. To develop:

1. Open `chrome://extensions/`, enable Developer mode
2. "Load unpacked" → select this folder
3. After code changes, click the reload button on the extension card
4. Shortcuts: `chrome://extensions/shortcuts`

The project language is primarily Russian (UI strings, comments, docs).

## Known Architectural Concerns

Documented in `docs/app.md` and `docs/refactoring-guide.md`:

- `options/options.js` is critically overloaded (~2500+ lines, 80+ functions)
- URL matching logic is duplicated across `lib/matcher.js`, `popup/popup.js`, and `options/options.js`
- Selector building logic is duplicated between `content/picker.js` and `options/analyzer.js`
- Entire `state` object is overwritten on every save (race condition risk)
- Delayed rules in `content.js` execute after `persistCtx()`, so counter mutations from them may not persist
- A planned multi-phase refactoring is documented in `docs/refactoring-guide.md` with a harness process in `docs/ai-refactoring-harness.md`

---

## AI Refactoring Harness & Agent Protocol

When refactoring or making code modifications in this project, you MUST strictly follow the process described in:

- `docs/refactoring-guide.md`
- `docs/ai-refactoring-harness.md`

### Core Rules for AI Agents

1. **Strict Stage Sequence:** Work strictly stage-by-stage (from Stage 0 to 12). Do NOT combine stages, skip steps, or start a new stage until the current one is approved and committed.
2. **Behavior Invariance:** Do NOT change existing application behavior, UI element IDs, or storage state structures without explicit Human Maintainer approval.
3. **No Unapproved Commits:** Commits are strictly forbidden without `Reviewer: APPROVED` and `Regression Audit: PASS`.
4. **Stage Workflow:** Follow the strict lifecycle for every stage:
   `Stage Planning (Step 1) → Implementation (Step 2) → Self-check (Step 3) → Review (Step 4) → Regression Audit (Step 5) → Commit (Step 6)`.
5. **Stage Reports:** Save stage outputs and reports in `docs/refactoring-reports/stage-XX.md`.

### Agent Roles & Explicit Responsibilities

When assigned a role during a session, adhere strictly to its duties:

- **Agent A — Refactoring Implementer:**
  - Reads `docs/refactoring-guide.md` and handles implementation for the current stage only.
  - Generates the Stage Plan (`Step 1`) and Implementer Self-check report (`Step 3`).
  - Does NOT commit code prior to approval.
- **Agent B — Reviewer / Quality Gate:**
  - Inspects changes against `docs/refactoring-guide.md` and acceptance criteria.
  - Verifies architectural integrity and safety. Does NOT perform refactoring code writes.
  - Produces Reviewer Report (`APPROVED` / `CHANGES_REQUESTED`).
- **Agent C — Test & Regression Auditor:**
  - Runs quality checks, linting, tests, and verifies manual smoke tests (`docs/manual-regression-checklist.md`).
  - Produces Regression Audit report (`PASS` / `FAIL`).

### Verification & Check Commands

When configured/available during or after Stage 1, run these checks during self-check and audit steps:

- **Lint:** `npm run lint`
- **Tests:** `npm run test`
- **Format check:** `npm run format:check`
- **Git status check:** `git status` / `git diff`
