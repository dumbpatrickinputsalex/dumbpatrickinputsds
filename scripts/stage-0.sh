#!/bin/bash

echo "📁 Creating baseline documentation..."

mkdir -p docs/refactoring-reports

cat > docs/manual-regression-checklist.md << 'EOF'
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
EOF

cat > docs/baseline.md << 'EOF'
# Baseline — State Before Refactoring

**Date:** 2026-08-10
**Version:** (from manifest.json)

## Project Structure
formfiller-extension/
├── content/
│ ├── content.js (460 строк)
│ ├── picker.js (100 строк)
│ └── copyfx-interceptor.js (35 строк)
├── lib/
│ ├── generators.js (500+ строк)
│ ├── template.js (70 строк)
│ └── matcher.js (150 строк)
├── options/
│ ├── options.js (2500+ строк)
│ ├── analyzer.js (250 строк)
│ ├── options.html
│ └── options.css
├── popup/
│ ├── popup.js (800-1000 строк)
│ ├── popup.html
│ └── popup.css
├── icons/
├── background.js (360 строк)
├── manifest.json
└── README.md

text

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
EOF

cat > docs/refactoring-reports/README.md << 'EOF'
# Refactoring Reports

Stage reports go here.
EOF

git add docs/
git commit -m "docs(refactoring): stage 0 baseline checklist"