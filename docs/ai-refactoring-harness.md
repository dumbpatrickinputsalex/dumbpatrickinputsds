# AI Refactoring Harness — техническое задание для многоагентного рефакторинга

## 1. Назначение документа

Этот документ описывает строгий процесс поэтапного рефакторинга проекта несколькими AI-агентами.

Рефакторинг должен выполняться строго по плану из:
```
docs/refactoring-guide.md
```
Агенты не имеют права перескакивать этапы, объединять этапы без разрешения или менять поведение приложения вне явно согласованного acceptance criteria.

Каждый этап должен проходить полный цикл:
```
Планирование → Реализация → Самопроверка → Ревью → Исправления → Финальная проверка → Git commit
```
---

## 2. Роли агентов

В процессе участвуют минимум три роли.

---

### 2.1. Agent A — Refactoring Implementer

**Ответственность:** выполняет рефакторинг.

Обязанности:

- читать `docs/refactoring-guide.md`;
- брать только текущий этап;
- декомпозировать задачу на малые изменения;
- сохранять существующее поведение;
- не добавлять новые фичи;
- не менять UI без необходимости;
- не менять формат `state` без миграции;
- обновлять документацию, если меняется архитектура;
- запускать проверки;
- готовить отчёт для ревьюера.

Agent A не имеет права:

- коммитить до ревью;
- пропускать acceptance criteria;
- делать следующий этап до принятия текущего;
- переписывать весь файл, если можно сделать безопасное извлечение;
- удалять legacy compatibility без отдельного решения.

---

### 2.2. Agent B — Reviewer / Quality Gate

**Ответственность:** проверяет изменения Agent A.

Обязанности:

- сверять изменения с текущим этапом `docs/refactoring-guide.md`;
- проверять, что поведение не изменилось;
- проверять acceptance criteria;
- искать архитектурные нарушения;
- проверять риски регрессии;
- требовать исправления, если критерии не выполнены;
- разрешать коммит только после полной приёмки.

Agent B не должен сам делать массовый рефакторинг. Его роль — контроль качества.

---

### 2.3. Agent C — Test & Regression Auditor

**Ответственность:** проверяет тесты, smoke-сценарии и регрессии.

Обязанности:

- запускать доступные проверки;
- предлагать недостающие тесты;
- сверять ручной checklist;
- проверять, что refactoring не изменил контракт сообщений, storage и UI;
- фиксировать, какие сценарии проверены.

Agent C может быть объединён с Reviewer, но логически его проверки должны быть отдельным разделом отчёта.

---

### 2.4. Human Maintainer

**Ответственность:** принимает стратегические решения.

Только человек может разрешить:

- изменение поведения;
- изменение формата `state`;
- изменение permissions в `manifest.json`;
- добавление сборщика;
- удаление старого публичного API;
- крупное переименование пользовательских сущностей;
- изменение UX.

---

## 3. Основной принцип harness engineering

Любой этап рефакторинга должен иметь тестовый и процедурный harness — набор средств, который доказывает, что поведение осталось прежним.

Harness включает:
```
1. Baseline before
2. Список изменённых файлов
3. Acceptance criteria
4. Автоматические проверки
5. Ручной regression checklist
6. Review checklist
7. Commit after approval
```
Нельзя считать этап завершённым, если нет проверяемого результата.

---

## 4. Общий workflow одного этапа

Каждый этап выполняется строго по следующему сценарию.

---

### 4.1. Step 1 — Stage Planning

Agent A создаёт короткий план этапа.

Формат:
```
markdown
## Stage Plan

Этап: <номер и название из refactoring-guide.md>

Цель:
- ...

Файлы, которые можно менять:
- ...

Файлы, которые нельзя менять:
- ...

План изменений:
1. ...
2. ...
3. ...

Риски:
- ...

Acceptance criteria:
- [ ] ...
- [ ] ...
```
Reviewer должен подтвердить, что план соответствует `docs/refactoring-guide.md`.

---

### 4.2. Step 2 — Implementation

Agent A выполняет только согласованный объём.

Правила реализации:

- изменения должны быть минимальными;
- одно изменение — одна причина;
- нельзя делать unrelated cleanup;
- нельзя форматировать весь файл без необходимости;
- нельзя менять публичные контракты без adapter/compatibility layer;
- нельзя удалять старый API до завершения миграции.

---

### 4.3. Step 3 — Self-check

Agent A после реализации обязан подготовить отчёт.

Формат:
```
markdown
## Implementer Self-check

Что изменено:
- ...

Почему это безопасно:
- ...

Какие файлы изменены:
- ...

Какие acceptance criteria выполнены:
- [x] ...
- [x] ...

Проверки:
- [ ] lint
- [ ] tests
- [ ] manual smoke
- [ ] chrome extension reload

Известные ограничения:
- ...
```
---

### 4.4. Step 4 — Review

Agent B проверяет изменения.

Формат ревью:
```
markdown
## Reviewer Report

Статус:
- APPROVED / CHANGES_REQUESTED

Архитектура:
- ...

Поведение:
- ...

Риски:
- ...

Замечания:
1. ...
2. ...

Необходимые исправления:
- ...
```
Если статус `CHANGES_REQUESTED`, Agent A обязан исправить замечания и снова пройти self-check.

---

### 4.5. Step 5 — Regression Audit

Agent C проверяет тесты и ручные сценарии.

Формат:
```
markdown
## Regression Audit

Автоматические проверки:
- lint: pass/fail/not configured
- tests: pass/fail/not configured
- typecheck: pass/fail/not configured

Ручные проверки:
- [ ] popup opens
- [ ] options opens
- [ ] fill all
- [ ] fill special
- [ ] picker
- [ ] import/export
- [ ] counters
- [ ] smart counters
- [ ] CopyFX if applicable
- [ ] UA if applicable

Вывод:
- PASS / FAIL
```
---

### 4.6. Step 6 — Commit

Коммит разрешён только если:
```
Reviewer: APPROVED
Regression Audit: PASS
Acceptance criteria: выполнены
```
Коммит должен быть атомарным.

Формат commit message:
```
refactor(<area>): <short description>
```
Примеры:
```
refactor(shared): extract url matcher
refactor(content): split value setter from content script
refactor(background): extract state migrator
refactor(popup): isolate fill panel
refactor(options): extract special insertions controller
```
После коммита агент должен указать hash коммита в отчёте этапа.

---

## 5. Глобальные запреты

AI-агентам запрещено:

- менять поведение без отдельного approval;
- делать несколько этапов за один commit;
- удалять пользовательские данные;
- менять permissions в `manifest.json` без approval;
- менять `manifest_version`;
- удалять поддержку существующих shortcuts;
- менять имена message types без compatibility;
- ломать `chrome.storage.local.state`;
- удалять миграции;
- оставлять проект в нерабочем состоянии;
- игнорировать ошибки тестов;
- коммитить после failed review;
- делать force push;
- скрывать known issues.

---

## 6. Глобальные инварианты проекта

На любом этапе должны сохраняться следующие инварианты.

---

### 6.1. Chrome extension инварианты

- Расширение загружается как unpacked extension.
- `manifest.json` валиден.
- Popup открывается.
- Options page открывается.
- Background service worker не падает при старте.
- Content scripts подключаются в правильном порядке.
- Горячие клавиши продолжают работать.

---

### 6.2. State инварианты

- `chrome.storage.local.state` не теряется.
- Старый state мигрируется.
- `rules` остаются массивом.
- `folders` остаются массивом.
- `specialInsertions` остаются массивом.
- `smartCounters` остаются массивом.
- `counters` остаётся object/map.
- `snapshots` не удаляются.
- `customWordLists` не удаляются.
- `activityLog`, если есть, не удаляется без причины.

---

### 6.3. Runtime API инварианты

До полного перехода на новую архитектуру должны работать:
```
javascript
window.FF.render
window.FF.parse
window.FF.findMatches
window.FF.urlMatches
window.FF.urlMatchesConditions
window.FF.startPicker
window.FF.fillAll
window.FF.fillSpecial
window.FF.fillSpecialById
```
Если реализация переносится в классы, старые методы должны остаться как compatibility layer.

---

### 6.4. Message contract инварианты

Должны продолжать работать message types:
```
FILL_ALL
FILL_SPECIAL
FILL_INSERTION_BY_ID
PICK_ELEMENT
PREVIEW_TEMPLATE
SCRAPE_FIELDS
SCRAPE_PAGE
COPYFX_GET_TRADERS
COPYFX_GET_INVESTORS
PROXY_TO_TAB
```
---

### 6.5. UI инварианты

- ID элементов в popup/options нельзя менять без одновременного обновления JS.
- Пользовательские значения должны экранироваться перед вставкой в HTML.
- Существующие кнопки должны выполнять прежние действия.
- Collapsed/expanded состояния карточек должны сохраняться.
- Autosave/debounced save должен работать.

---

## 7. Порядок этапов

Агенты обязаны идти строго в следующем порядке.
```
0. Baseline и checklist
1. Инфраструктура качества
2. Shared utilities
3. Storage/state layer
4. Templates/generators
5. Matcher logic
6. Content script
7. Background service worker
8. Popup
9. Options page
10. CopyFX/interceptor
11. Tests expansion
12. Финальная стабилизация
```
Нельзя начинать следующий этап, пока предыдущий не:
```
- реализован;
- проверен;
- отревьювен;
- закоммичен.
```
---

## 8. Детальное ТЗ по этапам

---

# Этап 0. Baseline и checklist

## Цель

Зафиксировать текущее состояние проекта перед изменениями.

## Agent A должен

1. Создать или обновить:
```
docs/manual-regression-checklist.md
```
2. Добавить список ручных проверок.
3. Добавить инструкцию по загрузке расширения.
4. Добавить checklist фич.
5. Создать baseline notes:
```
docs/baseline.md
```
6. Зафиксировать текущую структуру проекта.
7. Не менять runtime-код.

## Agent B проверяет

- Документы есть.
- Checklist покрывает основные сценарии.
- Runtime-код не изменён.
- План соответствует refactoring guide.

## Agent C проверяет

- Можно пройти checklist вручную.
- Есть место для отметок pass/fail.

## Acceptance criteria

- [ ] `docs/manual-regression-checklist.md` создан.
- [ ] `docs/baseline.md` создан.
- [ ] Runtime JS/CSS/HTML не изменены.
- [ ] Описан порядок smoke-проверки.
- [ ] Этап закоммичен.

## Commit
```
docs(refactoring): add baseline checklist
```
---

# Этап 1. Инфраструктура качества

## Цель

Добавить инструменты проверки без изменения поведения.

## Agent A должен

1. Проверить, есть ли package.json.
2. Если нет — предложить добавить.
3. Добавить минимальный набор инструментов:
   - ESLint;
   - Prettier;
   - Vitest;
   - jsdom;
   - Chrome API types.
4. Добавить scripts:
   - `lint`;
   - `test`;
   - `format:check`;
   - опционально `typecheck`, если добавлен TypeScript/JSDoc.
5. Не форматировать весь проект автоматически в этом же PR.

## Agent B проверяет

- Инструменты не ломают расширение.
- Нет массового изменения файлов.
- Нет смены архитектуры в этом этапе.

## Agent C проверяет

- Команды запускаются.
- Если тестов ещё мало — команда `test` всё равно корректна.
- IDE warning по `chrome` должен уменьшиться или быть явно описан.

## Acceptance criteria

- [ ] Есть npm scripts для проверок.
- [ ] Проверки запускаются.
- [ ] Runtime behavior не изменён.
- [ ] Нет массового autoformat.
- [ ] Этап закоммичен.

## Commit
```
chore(quality): add lint and test harness
```
---

# Этап 2. Shared utilities

## Цель

Вынести общие pure utilities.

## Agent A должен

Создать модули:
```
shared/url-matcher.js
shared/selector-builder.js
shared/html-utils.js
shared/css-utils.js
shared/object-utils.js
shared/logger.js
```
Начинать рекомендуется только с одного utility за PR, например `url-matcher`.

## Обязательное правило

Если utility заменяет старую функцию, нужно:

- либо заменить все дубли сразу, если это безопасно;
- либо оставить compatibility wrapper;
- либо явно записать TODO migration map.

## Agent B проверяет

- Utility не зависит от Chrome API, если это pure shared module.
- Нет изменения поведения.
- Дубли действительно сокращаются.
- Старые API продолжают работать.

## Agent C проверяет

- Есть unit tests для utility.
- Popup/content/options используют одинаковое поведение, если utility уже подключён.

## Acceptance criteria для `UrlMatcher`

- [ ] Пустые conditions работают как глобальные.
- [ ] Wildcard `*` работает.
- [ ] AND/OR работают.
- [ ] Некорректный pattern не ломает выполнение.
- [ ] Popup и content показывают одинаковую применимость правил.
- [ ] Тесты добавлены.

## Acceptance criteria для `SelectorBuilder`

- [ ] ID экранируется.
- [ ] `name` экранируется.
- [ ] `data-*` поддерживается.
- [ ] Picker возвращает рабочий selector.
- [ ] Analyzer предлагает рабочий selector.
- [ ] Нет XSS через selector output.

## Commit examples
```
refactor(shared): extract url matcher
refactor(shared): extract selector builder
refactor(shared): extract html escaping helpers
```
---

# Этап 3. Storage/state layer

## Цель

Централизовать state, миграции и storage.

## Agent A должен

Создать:
```
domain/state-schema.js
domain/state-migrator.js
infrastructure/chrome-storage-repository.js
```
Перенести:
```
DEFAULT_STATE
migrate
ensureShape
ensureState
```
из background в новые модули, сохранив compatibility.

## Agent B проверяет

- Формат state не изменён.
- Миграции не удалены.
- Default state совпадает.
- Нет потери данных.
- Прямые storage calls не размножаются.

## Agent C проверяет

- Чистая установка создаёт state.
- Старый state мигрируется.
- Import/export работает.
- Options сохраняет изменения.
- Popup читает state.

## Acceptance criteria

- [ ] Чистая установка работает.
- [ ] Старый state мигрируется.
- [ ] Existing state не теряется.
- [ ] StorageRepository используется в новых местах.
- [ ] Есть тесты на migrator.
- [ ] Этап закоммичен.

## Commit
```
refactor(state): extract storage repository and migrator
```
---

# Этап 4. Templates/generators

## Цель

Разделить parser, renderer и генераторы.

## Agent A должен

Создать:
```
domain/templates/template-parser.js
domain/templates/template-renderer.js
domain/generators/generator-registry.js
domain/generators/*
```
Переносить постепенно:

1. parser;
2. renderer;
3. простые генераторы;
4. stateful generators;
5. regex generator;
6. smart sequence generator.

## Agent B проверяет

- `window.FF.render` работает.
- `window.FF.parse` работает.
- `window.FF.generators` compatibility сохранена.
- Stateful generators явно мутируют context.
- `dryRun` работает.

## Agent C проверяет

- Тесты для шаблонов.
- Тесты для counter.
- Тесты для seq.
- Тесты для regex.
- Preview в options работает.
- Fill all работает.

## Acceptance criteria

- [ ] Все существующие токены работают.
- [ ] Unknown token сохраняется как раньше.
- [ ] Counter увеличивается.
- [ ] Seq увеличивается и пишет history.
- [ ] dryRun не мутирует state.
- [ ] Regex generator работает на прежних паттернах.
- [ ] Этап закоммичен.

## Commit
```
refactor(templates): split parser renderer and generators
```
---

# Этап 5. Matcher logic

## Цель

Сделать matching изолированным и тестируемым.

## Agent A должен

Создать:
```
domain/matching/field-kind-detector.js
domain/matching/label-resolver.js
domain/matching/attribute-matcher.js
domain/matching/condition-evaluator.js
domain/matching/rule-matcher.js
```
Сохранить compatibility:
```
javascript
window.FF.findMatches
window.FF.fieldKind
window.FF.evalConditions
```
## Agent B проверяет

- Не изменился порядок matching.
- Не изменилась логика AND/OR.
- Не изменилась логика order.
- Не изменился набор поддерживаемых field types.

## Agent C проверяет

- Тесты на selector conditions.
- Тесты на attribute conditions.
- Тесты на label.
- Тесты на order.
- Тесты на AND/OR.
- Fill all работает на реальной странице.

## Acceptance criteria

- [ ] Selector matching работает.
- [ ] Attribute matching работает.
- [ ] Label matching работает.
- [ ] Order matching работает.
- [ ] AND/OR работают.
- [ ] Hidden/file/submit inputs игнорируются.
- [ ] Этап закоммичен.

## Commit
```
refactor(matching): extract rule matcher services
```
---

# Этап 6. Content script

## Цель

Разложить content script на сервисы.

## Agent A должен

Создать:
```
content/dom-value-setter.js
content/field-highlighter.js
content/element-waiter.js
content/rule-execution-service.js
content/fill-all-use-case.js
content/special-insertion-use-case.js
content/page-shortcut-controller.js
content/content-message-router.js
content/content-bootstrap.js
```
Переносить по одному блоку.

## Особо важно

Сохранить:

- native setters;
- input/change/blur events;
- WeakSet usedFields;
- delayed rules;
- message listener contracts;
- page shortcuts.

## Agent B проверяет

- Нет изменения поведения DOM value setting.
- Async message handling корректен.
- `sendResponse` не ломается.
- Compatibility `window.FF.fillAll` сохранена.

## Agent C проверяет

- Fill all.
- Fill special.
- Fill insertion by id.
- Preview.
- Picker.
- Scrape fields/page.
- Page shortcuts.
- Counters after delayed rules.

## Acceptance criteria

- [ ] Все message types работают.
- [ ] Fill all работает.
- [ ] Fill special работает.
- [ ] Page shortcuts работают.
- [ ] React/Vue-like формы получают события.
- [ ] Delayed rules сохраняют counters.
- [ ] matched/fill statistics корректны.
- [ ] Этап закоммичен.

## Commit
```
refactor(content): split content script services
```
---

# Этап 7. Background service worker

## Цель

Разделить background на контроллеры и сервисы.

## Agent A должен

Создать:
```
background/background-app.js
background/command-controller.js
background/message-proxy-controller.js
background/content-script-injector.js
background/ua-rules-service.js
background/copyfx-bridge-service.js
background/state-initializer.js
```
## Agent B проверяет

- MV3 service worker semantics сохранены.
- Нет долгоживущего memory state.
- Async listeners возвращают true где нужно.
- Unsupported pages handled.

## Agent C проверяет

- Extension install.
- Startup.
- Hotkeys.
- Proxy to active tab.
- Injection fallback.
- UA sync.
- CopyFX bridge.

## Acceptance criteria

- [ ] State создаётся при установке.
- [ ] State мигрируется.
- [ ] Hotkeys работают.
- [ ] Injection fallback работает.
- [ ] Unsupported URLs дают корректную ошибку.
- [ ] UA rules синхронизируются.
- [ ] CopyFX bridge работает.
- [ ] Этап закоммичен.

## Commit
```
refactor(background): split service worker controllers
```
---

# Этап 8. Popup

## Цель

Разделить popup на независимые панели.

## Agent A должен

Создать:
```
popup/popup-app.js
popup/popup-bootstrap.js
popup/fill-panel.js
popup/scraper-panel.js
popup/copyfx-panel.js
popup/investor-panel.js
popup/ua-panel.js
popup/result-table.js
popup/popup-message-client.js
```
## Agent B проверяет

- Панели не зависят друг от друга напрямую.
- DOM IDs сохранены.
- Нет unsafe innerHTML.
- Message contracts сохранены.

## Agent C проверяет

- Popup opens.
- Fill all.
- Fill special.
- Result table.
- Scraper.
- CopyFX.
- Investor.
- UA toggle.
- Open options.
- Add insertion from HTML.

## Acceptance criteria

- [ ] Popup визуально работает как раньше.
- [ ] Все кнопки работают.
- [ ] Все panels отображаются по условиям.
- [ ] Session cache работает.
- [ ] Нет новых runtime errors.
- [ ] Этап закоммичен.

## Commit
```
refactor(popup): split popup panels
```
---

# Этап 9. Options page

## Цель

Разделить самый большой options файл по фичам.

## Agent A должен

Идти только по одному sub-stage за раз:
```
9.1 options bootstrap/router
9.2 rules
9.3 folders
9.4 special insertions
9.5 value builder
9.6 smart counters
9.7 snapshots
9.8 import/export
9.9 scraper config
9.10 copyfx config
9.11 ua rules
9.12 word lists
9.13 modals/analyzer integration
```
Каждый sub-stage должен иметь отдельный review и commit.

## Agent B проверяет

- Не смешаны unrelated features.
- DOM IDs сохранены.
- Save/cancel/collapse работает.
- `_snapshot` и `_isNew` semantics сохранены.
- Autosave работает.

## Agent C проверяет

Для каждого sub-stage только соответствующую фичу + общий smoke:

- Options opens.
- State loads.
- Save works.
- No console errors.

## Acceptance criteria

- [ ] Каждая вкладка options работает.
- [ ] Rules CRUD работает.
- [ ] Folders работают.
- [ ] Special insertions работают.
- [ ] Value builder работает.
- [ ] Smart counters работают.
- [ ] Snapshots работают.
- [ ] Import/export работает.
- [ ] Scraper config работает.
- [ ] CopyFX config работает.
- [ ] UA rules работают.
- [ ] Word lists работают.
- [ ] Analyzer modal работает.
- [ ] Этапы закоммичены отдельно.

## Commit examples
```
refactor(options): extract options bootstrap
refactor(options): extract rules controller
refactor(options): extract special insertions controller
refactor(options): extract smart counters controller
```
---

# Этап 10. CopyFX/interceptor

## Цель

Сделать interceptor безопаснее.

## Agent A должен

1. Добавить guard от повторного patch.
2. Вынести URL matching.
3. Вынести safe JSON parse.
4. Не ломать оригинальный fetch/XHR.
5. Рассмотреть хранение истории запросов.

## Agent B проверяет

- Monkey patch минимальный.
- `this` и `arguments` сохраняются.
- `Response.clone()` используется.
- Повторная инъекция безопасна.

## Agent C проверяет

- Fetch страницы работает.
- XHR страницы работает.
- CopyFX data попадает в cache.
- Popup получает traders/investors.
- Non-JSON response не ломает страницу.

## Acceptance criteria

- [ ] Interceptor не устанавливается дважды.
- [ ] Fetch не ломается.
- [ ] XHR не ломается.
- [ ] Cache работает.
- [ ] CopyFX UI работает.
- [ ] Этап закоммичен.

## Commit
```
refactor(copyfx): harden network interceptor
```
---

# Этап 11. Tests expansion

## Цель

Увеличить покрытие ключевой логики.

## Agent A должен

Добавить тесты для:
```
UrlMatcher
TemplateParser
TemplateRenderer
Generators
SmartCounterService
RuleMatcher
StateMigrator
SelectorBuilder
Analyzer
```
## Agent B проверяет

- Тесты проверяют поведение.
- Нет brittle snapshot tests без причины.
- Нет зависимости от реального Chrome.
- Random controlled или проверяется формат.

## Agent C проверяет

- Все тесты проходят.
- Coverage по ключевой domain logic достаточен.
- Manual checklist всё ещё проходит.

## Acceptance criteria

- [ ] Тесты добавлены.
- [ ] Тесты запускаются одной командой.
- [ ] Тесты проходят.
- [ ] Ключевая логика покрыта.
- [ ] Этап закоммичен.

## Commit
```
test(domain): add regression coverage for core logic
```
---

# Этап 12. Финальная стабилизация

## Цель

Очистить проект после рефакторинга.

## Agent A должен

1. Обновить README.
2. Обновить docs.
3. Удалить dead code.
4. Удалить завершённые TODO.
5. Проверить manifest permissions.
6. Проверить warnings.
7. Проверить final manual checklist.

## Agent B проверяет

- Документация соответствует факту.
- Нет compatibility wrappers без TODO.
- Нет dead code.
- Нет лишних permissions.

## Agent C проверяет

- Полный regression checklist.
- Extension reload.
- Existing state.
- Clean install.
- All commands.

## Acceptance criteria

- [ ] README обновлён.
- [ ] Architecture docs обновлены.
- [ ] State schema docs есть.
- [ ] Message contracts docs есть.
- [ ] Full checklist пройден.
- [ ] Финальный commit сделан.

## Commit
```
docs(refactoring): finalize architecture documentation
```
---

## 9. Правила работы с Git

### 9.1. Перед началом этапа

Agent A должен выполнить:
```
bash
git status
```
Рабочее дерево должно быть чистым.

Если есть чужие изменения — остановиться и запросить решение человека.

---

### 9.2. После реализации

Agent A должен показать:
```
bash
git diff
```
И кратко объяснить каждый изменённый файл.

---

### 9.3. Перед commit

Должны быть выполнены:
```
bash
npm run lint
npm run test
npm run format:check
```
Если scripts ещё не заведены, Agent C должен отметить это в regression audit.

---

### 9.4. Commit только после approval

Запрещено делать commit без:
```
Reviewer: APPROVED
Regression Audit: PASS
```
---

### 9.5. Commit message

Формат:
```
<type>(<scope>): <summary>
```
Разрешённые type:
```
refactor
test
docs
chore
fix
```
`fix` используется только если этап явно исправляет баг, найденный в процессе.

---

## 10. Формат финального отчёта этапа

После commit Agent A должен создать отчёт:
```
markdown
# Stage Completion Report

Этап:
Commit:

## Что сделано

- ...

## Изменённые файлы

- ...

## Проверки

- lint:
- tests:
- format:
- manual:

## Acceptance criteria

- [x] ...
- [x] ...

## Reviewer approval

- APPROVED by Agent B

## Regression audit

- PASS by Agent C

## Known follow-ups

- ...
```
Отчёт можно хранить в:
```
docs/refactoring-reports/stage-XX.md
```
---

## 11. Definition of Done

Этап считается завершённым только если:

- код реализован;
- self-check выполнен;
- review выполнен;
- regression audit выполнен;
- все обязательные замечания исправлены;
- acceptance criteria выполнены;
- commit сделан;
- отчёт этапа добавлен.

---

## 12. Definition of Failed Stage

Этап считается проваленным, если:

- появились runtime errors;
- расширение не загружается;
- popup/options не открываются;
- state повреждён;
- acceptance criteria не выполнены;
- reviewer не принял изменения;
- regression audit failed;
- агент изменил поведение без approval;
- агент начал следующий этап без commit текущего.

При failed stage нужно:

1. остановить дальнейшие этапы;
2. зафиксировать проблему;
3. либо исправить в рамках этапа;
4. либо откатить изменения;
5. повторить review.

---

## 13. Минимальный smoke checklist после каждого этапа

После каждого этапа нужно проверить:
```
[ ] Расширение загружается в chrome://extensions
[ ] Popup открывается
[ ] Options открываются
[ ] Нет ошибок в console popup
[ ] Нет ошибок в console options
[ ] Нет ошибок service worker
[ ] Fill all работает на простой форме
[ ] Fill special не падает
[ ] Existing state читается
[ ] Export state работает
```
Для этапов, затрагивающих конкретные зоны, добавляются дополнительные проверки.

---

## 14. Финальное правило

Если агент сомневается, менять ли поведение — он не меняет поведение.

Если агент видит баг, не относящийся к текущему этапу — он фиксирует его в `Known follow-ups`, но не исправляет без отдельного approval.

Главная цель процесса — не быстрый рефакторинг, а безопасная, проверяемая и объяснимая декомпозиция проекта.
```


---

## Что я бы добавил в `docs/refactoring-guide.md`

В самый верх файла `docs/refactoring-guide.md` можно добавить короткую ссылку:

```markdown
> Для AI-агентов и автоматизированного рефакторинга см.  
> [`docs/ai-refactoring-harness.md`](./ai-refactoring-harness.md).
```


---

## Короткая инструкция для запуска агентов

Можно дать агентам такой стартовый промпт:

```plain text
Ты участвуешь в многоагентном рефакторинге Chrome Extension проекта.

Обязательные документы:
1. docs/refactoring-guide.md
2. docs/ai-refactoring-harness.md
3. docs/manual-regression-checklist.md, если уже создан

Твоя роль: <Implementer / Reviewer / Regression Auditor>.

Работай строго по текущему этапу. 
Не переходи к следующему этапу, пока текущий не принят, не проверен и не закоммичен.
Не меняй поведение приложения без отдельного approval.
После каждого этапа подготовь отчёт в формате из ai-refactoring-harness.md.
```


---

## Рекомендация по первому запуску

Начать нужно не с рефакторинга кода, а с этапа:

```plain text
Этап 0. Baseline и checklist
```


То есть первый AI-агент должен создать:

```plain text
docs/manual-regression-checklist.md
docs/baseline.md
docs/refactoring-reports/
```


И только после review/commit переходить к инструментам качества и декомпозиции.