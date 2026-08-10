# Baseline — State Before Refactoring

**Date:** 2026-08-10
**Version:** (from manifest.json)

## Key Invariants

### State Invariants
- chrome.storage.local.state contains:
  - ules, olders, specialInsertions, smartCounters, counters, snapshots, customWordLists, scraperConfig, copyfxConfig, uaRules

### Runtime API Invariants
- window.FF.render, parse, indMatches, urlMatches, startPicker, illAll, illSpecial

### Message Contract Invariants
- FILL_ALL, FILL_SPECIAL, FILL_INSERTION_BY_ID, PICK_ELEMENT, PREVIEW_TEMPLATE, SCRAPE_FIELDS, SCRAPE_PAGE, COPYFX_GET_TRADERS, COPYFX_GET_INVESTORS, PROXY_TO_TAB

## Known Risks
1. options/options.js (2500+ строк) — самый большой
2. popup/popup.js (800-1000 строк) — второй по размеру
3. Дублирование логики: URL matching, selector building
4. Monkey patching в content/copyfx-interceptor.js
