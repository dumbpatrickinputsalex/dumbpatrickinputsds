# Baseline — состояние проекта перед рефакторингом

## Дата фиксации
2026-08-10

## Версия расширения
(указана в manifest.json)

## Структура проекта
formfiller-extension/
├── .claude/
│ └── commands/
│ ├── agent-a-implementer.md
│ ├── agent-b-reviewer.md
│ ├── agent-c-regression-auditor.md
│ └── harness-engineer.md
├── content/
│ ├── content.js (460 строк)
│ ├── picker.js (100 строк)
│ └── copyfx-interceptor.js (35 строк)
├── lib/
│ ├── generators.js (500+ строк)
│ ├── template.js (70 строк)
│ └── matcher.js (150 строк)
├── options/
│ ├── options.js (2500+ строк — самый большой)
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

## Ключевые инварианты (что должно остаться неизменным)

### State инварианты
- `chrome.storage.local.state` содержит:
  - `rules` (массив)
  - `folders` (массив)
  - `specialInsertions` (массив)
  - `smartCounters` (массив)
  - `counters` (объект)
  - `snapshots` (массив)
  - `customWordLists` (массив)
  - `scraperConfig`, `copyfxConfig`, `uaRules`

### Runtime API инварианты
До полного перехода на новую архитектуру должны работать:
- `window.FF.render`
- `window.FF.parse`
- `window.FF.findMatches`
- `window.FF.urlMatches`
- `window.FF.startPicker`
- `window.FF.fillAll`
- `window.FF.fillSpecial`

### Message contract инварианты
Должны работать:
- `FILL_ALL`
- `FILL_SPECIAL`
- `FILL_INSERTION_BY_ID`
- `PICK_ELEMENT`
- `PREVIEW_TEMPLATE`
- `SCRAPE_FIELDS`
- `SCRAPE_PAGE`
- `COPYFX_GET_TRADERS`
- `COPYFX_GET_INVESTORS`
- `PROXY_TO_TAB`

## Известные риски на старте

1. **Самый большой файл** — `options/options.js` (2500+ строк). Будет дробиться в последнюю очередь.
2. **Второй по размеру** — `popup/popup.js` (800-1000 строк). Будет дробиться отдельным этапом.
3. **Дублирование логики**:
   - URL matching в `lib/matcher.js` и `popup/popup.js`
   - Selector building в `content/picker.js` и `options/analyzer.js`
4. **Monkey patching** в `content/copyfx-interceptor.js` — требует осторожности.

## Инструменты качества на старте

На момент baseline:
- ❌ Нет ESLint
- ❌ Нет Prettier
- ❌ Нет тестов
- ❌ Нет TypeScript

## Как проверять регрессии

После каждого этапа нужно пройти `docs/manual-regression-checklist.md`.