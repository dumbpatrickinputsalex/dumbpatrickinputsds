# Гайд по поэтапному рефакторингу проекта

---

# Dumb Patrick Inputs — гайд по поэтапному рефакторингу

## Оглавление

1. [Цель рефакторинга](#1-цель-рефакторинга)
2. [Главные принципы](#2-главные-принципы)
3. [Текущая проблема архитектуры](#3-текущая-проблема-архитектуры)
4. [Целевая архитектура](#4-целевая-архитектура)
5. [Предлагаемая структура проекта](#5-предлагаемая-структура-проекта)
6. [Иерархия классов и модулей](#6-иерархия-классов-и-модулей)
7. [Общие acceptance criteria для всего рефакторинга](#7-общие-acceptance-criteria-для-всего-рефакторинга)
8. [Этап 0. Зафиксировать baseline](#8-этап-0-зафиксировать-baseline)
9. [Этап 1. Ввести инфраструктуру качества](#9-этап-1-ввести-инфраструктуру-качества)
10. [Этап 2. Выделить общие utility-модули](#10-этап-2-выделить-общие-utility-модули)
11. [Этап 3. Выделить слой хранения состояния](#11-этап-3-выделить-слой-хранения-состояния)
12. [Этап 4. Рефакторинг шаблонов и генераторов](#12-этап-4-рефакторинг-шаблонов-и-генераторов)
13. [Этап 5. Рефакторинг matcher-логики](#13-этап-5-рефакторинг-matcher-логики)
14. [Этап 6. Рефакторинг content script](#14-этап-6-рефакторинг-content-script)
15. [Этап 7. Рефакторинг background service worker](#15-этап-7-рефакторинг-background-service-worker)
16. [Этап 8. Рефакторинг popup](#16-этап-8-рефакторинг-popup)
17. [Этап 9. Рефакторинг options page](#17-этап-9-рефакторинг-options-page)
18. [Этап 10. Рефакторинг CopyFX/interceptor](#18-этап-10-рефакторинг-copyfxinterceptor)
19. [Этап 11. Введение тестов](#19-этап-11-введение-тестов)
20. [Этап 12. Финальная стабилизация](#20-этап-12-финальная-стабилизация)
21. [Чеклист для ревьюера](#21-чеклист-для-ревьюера)
22. [Риски и анти-паттерны](#22-риски-и-анти-паттерны)
23. [Итоговая стратегия](#23-итоговая-стратегия)

---

## 1. Цель рефакторинга

Проект был быстро собран с помощью ИИ и сейчас содержит много логики в крупных файлах. Главная цель рефакторинга — сделать код понятным, сопровождаемым и безопасным для дальнейшей разработки людьми.

Рефакторинг должен:

- сохранить текущее поведение расширения;
- разделить ответственность между модулями;
- убрать дублирование логики;
- ввести понятную архитектуру;
- подготовить проект к тестированию;
- сделать код удобным для ревью;
- снизить риск случайных регрессий;
- создать структуру, похожую на учебный пример качественного рефакторинга.

---

## 2. Главные принципы

### 2.1. Поведение не меняем без отдельной задачи

Рефакторинг — это изменение структуры кода без изменения поведения.

Запрещено в рамках одного refactoring PR одновременно:

- менять UI;
- менять бизнес-логику;
- менять формат state;
- добавлять новые фичи;
- удалять старые сценарии.

Если изменение поведения необходимо — оно должно идти отдельной задачей.

---

### 2.2. Маленькие PR вместо одного большого

Каждый этап должен быть самостоятельным и проверяемым.

Плохой подход:

```
Переписать весь проект за один PR.
```

Хороший подход:

```
PR 1: добавить тестовую инфраструктуру.
PR 2: вынести UrlMatcher.
PR 3: заменить дубли URL matching.
PR 4: вынести StorageRepository.
PR 5: разделить popup на панели.
```

---

### 2.3. Сначала тесты и baseline, потом декомпозиция

Перед крупными изменениями нужно зафиксировать текущее поведение:

- ручными сценариями;
- snapshot state;
- тестами для чистых функций;
- smoke-тестами расширения.

---

### 2.4. Чистая архитектура для Chrome Extension

Проект должен быть разделён на слои:

```
UI layer
↓
Application services
↓
Domain logic
↓
Infrastructure
```

Пример:

```
Popup UI
↓
FillCommandService
↓
RuleExecutionService
↓
ChromeMessageBus / ChromeStorageRepository
```

---

## 3. Текущая проблема архитектуры

Сейчас в проекте есть несколько крупных зон риска.

### 3.1. Большие файлы

Особенно перегружены:

```
options/options.js
popup/popup.js
content/content.js
background.js
```

В них смешаны:

- DOM-рендеринг;
- бизнес-логика;
- работа с Chrome API;
- хранение state;
- валидация;
- миграции;
- обработчики событий;
- форматирование данных.

---

### 3.2. Глобальный объект `window.FF`

Многие файлы используют общий глобальный namespace:

```
javascript
window.FF = window.FF || {};
```

Это создаёт неявные зависимости между файлами и порядком их подключения.

---

### 3.3. Дублирование логики

Есть повторяющиеся зоны:

- URL matching;
- selector building;
- escape HTML/CSS;
- работа с Chrome storage;
- отправка сообщений;
- форматирование данных;
- preview шаблонов.

---

### 3.4. Сложность state

В одном объекте `state` лежит всё:

```
rules
folders
specialInsertions
smartCounters
snapshots
pageShortcuts
counters
scraperConfig
copyfxConfig
uaRules
customWordLists
activityLog
```

Любая запись в storage перезаписывает весь state.

---

## 4. Целевая архитектура

Целевая архитектура должна выглядеть так:

```
src/
├── domain/
│   ├── rules/
│   ├── templates/
│   ├── generators/
│   ├── matching/
│   ├── insertions/
│   ├── counters/
│   └── copyfx/
│
├── application/
│   ├── fill/
│   ├── shortcuts/
│   ├── state/
│   ├── import-export/
│   └── migrations/
│
├── infrastructure/
│   ├── chrome/
│   ├── storage/
│   ├── dom/
│   ├── messaging/
│   └── network/
│
├── ui/
│   ├── popup/
│   ├── options/
│   └── content/
│
└── shared/
├── utils/
├── constants/
└── types/
```

Если проект пока остаётся без сборщика, можно не создавать `src`, а постепенно раскладывать модули по существующим папкам:

```
lib/
content/
popup/
options/
background/
shared/
```

Но целевая модель должна быть именно слоистой.

---

## 5. Предлагаемая структура проекта

### 5.1. Промежуточная структура без сборщика

```
formfiller-extension/
├── manifest.json
├── background.js
│
├── shared/
│   ├── dom-utils.js
│   ├── html-utils.js
│   ├── css-utils.js
│   ├── url-matcher.js
│   ├── selector-builder.js
│   ├── date-utils.js
│   ├── object-utils.js
│   └── logger.js
│
├── infrastructure/
│   ├── chrome-storage-repository.js
│   ├── chrome-message-bus.js
│   ├── active-tab-service.js
│   └── chrome-scripting-service.js
│
├── domain/
│   ├── state-schema.js
│   ├── state-migrator.js
│   ├── rule-matcher.js
│   ├── rule-executor.js
│   ├── template-parser.js
│   ├── template-renderer.js
│   ├── generator-registry.js
│   ├── value-generator.js
│   ├── special-insertion-runner.js
│   ├── smart-counter-service.js
│   └── copyfx-cache-service.js
│
├── content/
│   ├── content.js
│   ├── content-bootstrap.js
│   ├── dom-value-setter.js
│   ├── field-highlighter.js
│   ├── page-shortcut-controller.js
│   ├── content-message-router.js
│   ├── element-waiter.js
│   ├── picker.js
│   └── copyfx-interceptor.js
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── popup-bootstrap.js
│   ├── fill-panel.js
│   ├── scraper-panel.js
│   ├── copyfx-panel.js
│   ├── investor-panel.js
│   ├── ua-panel.js
│   └── popup-renderer.js
│
├── options/
│   ├── options.html
│   ├── options.css
│   ├── options.js
│   ├── options-bootstrap.js
│   ├── options-router.js
│   ├── rules/
│   ├── folders/
│   ├── special-insertions/
│   ├── smart-counters/
│   ├── snapshots/
│   ├── import-export/
│   ├── scraper/
│   ├── copyfx/
│   ├── ua-rules/
│   ├── word-lists/
│   └── analyzer.js
│
└── docs/
├── architecture.md
├── refactoring-guide.md
└── manual-regression-checklist.md
```

---

### 5.2. Финальная структура со сборщиком

В идеале проект стоит перевести на сборку через Vite/Rollup/Webpack и TypeScript.

```
src/
├── background/
├── content/
├── popup/
├── options/
├── domain/
├── application/
├── infrastructure/
├── shared/
└── types/
```

Сборка должна генерировать:

```
dist/
├── manifest.json
├── background.js
├── content/
├── popup/
├── options/
├── icons/
└── assets/
```

---

## 6. Иерархия классов и модулей

Ниже — целевая схема классов/сервисов. Не обязательно внедрять всё за один раз. Это ориентир.

---

### 6.1. Domain layer

Domain layer не должен знать про Chrome API и DOM.

#### `TemplateParser`

Ответственность:

- парсит строковый шаблон;
- возвращает список text/token частей.

```
javascript
class TemplateParser {
parse(template) {
// returns TemplateAst
}
}
```

---

#### `TemplateRenderer`

Ответственность:

- принимает AST или строку;
- вызывает генераторы;
- возвращает итоговое значение.

```
javascript
class TemplateRenderer {
constructor(parser, generatorRegistry) {}

render(template, context) {}
}
```

---

#### `GeneratorRegistry`

Ответственность:

- хранит генераторы;
- регистрирует генераторы;
- возвращает генератор по имени.

```
javascript
class GeneratorRegistry {
register(name, generator) {}
get(name) {}
list() {}
}
```

---

#### `BaseGenerator`

Базовая идея для генераторов.

```
javascript
class BaseGenerator {
generate(args, context) {
throw new Error('Not implemented');
}
}
```

---

#### Конкретные генераторы

```
NameGenerator
EmailGenerator
PhoneGenerator
NumberGenerator
DecimalGenerator
DateGenerator
UuidGenerator
LoremGenerator
PickGenerator
CounterGenerator
IncrementGenerator
RegexGenerator
SmartSequenceGenerator
CustomListGenerator
```

Пример:

```
javascript
class CounterGenerator extends BaseGenerator {
generate(args, context) {
const key = args[0] || 'default';
context.counters[key] = (context.counters[key] || 0) + 1;
return String(context.counters[key]);
}
}
```

---

#### `RuleMatcher`

Ответственность:

- проверяет DOM-field descriptor against rule;
- не должен напрямую зависеть от реального DOM, если возможно.

```
javascript
class RuleMatcher {
matches(rule, fieldDescriptor) {}
findMatches(rule, fields) {}
}
```

---

#### `ConditionEvaluator`

Ответственность:

- вычисляет AND/OR-условия;
- поддерживает selector/attribute/order.

```
javascript
class ConditionEvaluator {
evaluate(conditions, target, context) {}
}
```

---

#### `UrlMatcher`

Ответственность:

- единая логика URL matching для popup/content/options/background.

```
javascript
class UrlMatcher {
matchesPattern(pattern, url) {}
matchesConditions(conditions, url) {}
}
```

---

#### `SpecialInsertionRunner`

Ответственность:

- выполняет спецвставку;
- использует абстракции DOM и TemplateRenderer.

```
javascript
class SpecialInsertionRunner {
constructor(templateRenderer, valueSetter, elementWaiter) {}

run(insertion, context) {}
}
```

---

#### `SmartCounterService`

Ответственность:

- считает следующее значение `seq`;
- ведёт history;
- применяет branch rules.

```
javascript
class SmartCounterService {
next(counterConfig, url, options) {}
}
```

---

### 6.2. Infrastructure layer

Infrastructure знает про Chrome API, storage, tabs, scripting.

#### `ChromeStorageRepository`

```
javascript
class ChromeStorageRepository {
async getState() {}
async setState(state) {}
async updateState(mutator) {}
}
```

Reviewer должен проверять:

- нет ли прямого `chrome.storage.local.set({ state })` вне repository;
- нет ли гонок при нескольких update;
- сохраняется ли полный state.

---

#### `ChromeMessageBus`

```
javascript
class ChromeMessageBus {
async sendToActiveTab(message) {}
onMessage(type, handler) {}
}
```

---

#### `ActiveTabService`

```
javascript
class ActiveTabService {
async getActiveTab() {}
isSupportedUrl(url) {}
}
```

---

#### `ChromeScriptingService`

```
javascript
class ChromeScriptingService {
async injectContentScripts(tabId) {}
async executeInMainWorld(tabId, func, args) {}
}
```

---

### 6.3. Content UI/application layer

#### `DomValueSetter`

Ответственность:

- безопасно устанавливает значение в DOM;
- поддерживает input/textarea/select/checkbox/radio/contenteditable;
- генерирует события.

```
javascript
class DomValueSetter {
setValue(element, value) {}
}
```

---

#### `FieldHighlighter`

```
javascript
class FieldHighlighter {
highlight(element) {}
}
```

---

#### `ElementWaiter`

```
javascript
class ElementWaiter {
waitForSelector(selector, timeoutMs) {}
}
```

---

#### `ContentRuleExecutor`

```
javascript
class ContentRuleExecutor {
constructor(ruleMatcher, templateRenderer, valueSetter, highlighter) {}

async execute(rule, context, usedFields, details) {}
}
```

---

#### `FillAllUseCase`

```
javascript
class FillAllUseCase {
constructor(stateRepository, ruleExecutor, urlMatcher) {}

async execute() {}
}
```

---

#### `ContentMessageRouter`

```
javascript
class ContentMessageRouter {
register() {}
}
```

---

#### `PageShortcutController`

```
javascript
class PageShortcutController {
start() {}
stop() {}
reloadShortcuts() {}
}
```

---

### 6.4. Background layer

#### `BackgroundApp`

```
javascript
class BackgroundApp {
async boot() {}
}
```

---

#### `StateMigrator`

```
javascript
class StateMigrator {
migrate(rawState) {}
ensureShape(state) {}
}
```

---

#### `CommandController`

```
javascript
class CommandController {
register() {}
}
```

---

#### `UaRulesService`

```
javascript
class UaRulesService {
async syncFromState(state) {}
}
```

---

#### `CopyfxBridgeService`

```
javascript
class CopyfxBridgeService {
async getTraders(payload) {}
async getInvestors() {}
}
```

---

### 6.5. Popup layer

#### `PopupApp`

```
javascript
class PopupApp {
async boot() {}
}
```

---

#### Панели popup

```
FillPanel
ScraperPanel
CopyfxPanel
InvestorPanel
UaPanel
```

Каждая панель должна:

- сама находить свои DOM-элементы;
- иметь `init()`;
- иметь `render()`;
- не знать внутренности других панелей.

```
javascript
class FillPanel {
constructor(messageBus, tabService) {}

async init() {}
async renderStatus() {}
async fillAll() {}
async fillSpecial() {}
}
```

---

### 6.6. Options layer

Options нужно делить агрессивно.

```
OptionsApp
OptionsRouter
RulesController
FoldersController
SpecialInsertionsController
ValueBuilderController
SmartCountersController
SnapshotsController
ImportExportController
ScraperConfigController
CopyfxConfigController
UaRulesController
WordListsController
```

Каждый controller отвечает за одну вкладку или одну фичу.

---

## 7. Общие acceptance criteria для всего рефакторинга

Эти критерии применимы к каждому этапу.

### Функциональные критерии

- Расширение устанавливается как unpacked extension.
- Popup открывается без ошибок.
- Options page открывается без ошибок.
- В консоли popup/options/content нет новых runtime errors.
- `Ctrl+Shift+F` продолжает запускать заполнение.
- `Ctrl+Shift+1` продолжает запускать спецвставку.
- Существующий state пользователя не теряется.
- Импорт/экспорт state работает.
- Старые настройки мигрируются.
- Новые настройки сохраняются.
- Счётчики не сбрасываются.
- Smart counters сохраняют history.
- Picker продолжает возвращать селектор.
- CopyFX-функции не падают, если включены.

### Нефункциональные критерии

- Каждый новый файл имеет понятную ответственность.
- В одном модуле нет нескольких unrelated features.
- Нет новых глобальных переменных без необходимости.
- Нет прямого дублирования URL matching.
- Нет прямого дублирования selector building.
- Chrome API изолирован в infrastructure/application слоях.
- Domain-функции можно тестировать без Chrome API.
- Нет больших функций без необходимости.
- Нет крупных `innerHTML`-рендеров без экранирования данных.
- Ошибки не проглатываются молча там, где нужна диагностика.

---

## 8. Этап 0. Зафиксировать baseline

### Цель

Перед любыми изменениями нужно понять и зафиксировать текущее поведение.

### Что сделать

1. Создать документ:

```
docs/manual-regression-checklist.md
```

2. Описать ручные сценарии:

```
- установка расширения;
- открытие popup;
- открытие options;
- заполнение всех полей;
- спецвставка;
- добавление правила;
- редактирование правила;
- удаление правила;
- picker;
- smart counter;
- import/export;
- scraper;
- CopyFX;
- UA rule.
```

3. Экспортировать текущий state через UI расширения.
4. Сделать git commit:

```
baseline before refactoring
```

5. Снять метрики:

```
количество файлов;
количество строк;
количество функций;
количество warning'ов;
самые большие файлы.
```

### Acceptance criteria

- Есть git commit baseline.
- Есть экспортированный JSON state.
- Есть manual regression checklist.
- Расширение до рефакторинга проходит checklist.
- Известны текущие warning'и IDE.
- Известны самые большие файлы.

### На что смотреть ревьюеру

- Baseline должен быть воспроизводимым.
- Checklist должен покрывать не только happy path.
- Должны быть сценарии с уже существующим state, а не только с чистой установкой.

---

## 9. Этап 1. Ввести инфраструктуру качества

### Цель

Сделать так, чтобы рефакторинг был проверяемым.

### Что сделать

1. Добавить форматирование.
2. Добавить lint.
3. Добавить тестовый раннер.
4. Добавить типы Chrome API.
5. Добавить базовые npm scripts.

### Рекомендуемый стек

Если проект остаётся на JavaScript:

```
ESLint
Prettier
Vitest
jsdom
@types/chrome
```

Если проект переводится на TypeScript:

```
TypeScript
ESLint
Prettier
Vitest
jsdom
@types/chrome
Vite/Rollup
```

### Acceptance criteria

- Команда lint запускается одной командой.
- Команда test запускается одной командой.
- IDE перестаёт массово ругаться на `chrome`.
- Форматирование единообразное.
- В проекте есть минимум 5 smoke/unit-тестов на чистые функции.
- Нет изменения runtime-поведения расширения.

### На что смотреть ревьюеру

- Не должен появиться тяжёлый build process без необходимости.
- Если добавляется сборщик, manifest должен продолжать корректно ссылаться на итоговые файлы.
- Не должно быть автоформатирования всего проекта вместе с логическими изменениями в одном PR.

---

## 10. Этап 2. Выделить общие utility-модули

### Цель

Убрать дублирование и создать foundation для дальнейшего рефакторинга.

### Что вынести

```
shared/url-matcher.js
shared/selector-builder.js
shared/html-utils.js
shared/css-utils.js
shared/date-utils.js
shared/logger.js
shared/object-utils.js
```

---

### 10.1. `UrlMatcher`

Должен заменить дубли URL matching в:

```
content
popup
options
background, если требуется
```

Пример API:

```
javascript
class UrlMatcher {
matchesPattern(pattern, url) {}
matchesConditions(conditions, url) {}
}
```

### Acceptance criteria

- Popup показывает то же количество активных правил, что и до изменения.
- Content script применяет те же правила, что и до изменения.
- Спецвставки активируются на тех же URL.
- Wildcard `*` работает как раньше.
- Пустые URL conditions означают глобальное правило.
- Некорректный regex не ломает выполнение.
- Тесты покрывают:
  - пустой pattern;
  - обычную подстроку;
  - wildcard;
  - AND;
  - OR;
  - некорректное значение.

### На что смотреть ревьюеру

- Нет двух разных реализаций URL matching.
- Поведение popup и content одинаковое.
- Нет изменения семантики wildcard/regex без отдельного решения.

---

### 10.2. `SelectorBuilder`

Должен объединить логику из:

```
content/picker.js
options/analyzer.js
content/content.js shortSelector
```

Пример API:

```
javascript
class SelectorBuilder {
buildUniqueSelector(element) {}
buildStableSelector(element) {}
buildDebugSelector(element) {}
}
```

### Acceptance criteria

- Picker возвращает рабочий селектор.
- HTML analyzer предлагает селектор не хуже прежнего.
- Debug selector остаётся читаемым.
- ID со спецсимволами корректно экранируются.
- `name`, `data-testid`, `aria-label`, `placeholder` обрабатываются безопасно.
- Нет XSS через selector preview.

### На что смотреть ревьюеру

- Обязательно использовать `CSS.escape` или fallback.
- Не вставлять сырые значения атрибутов в HTML без escape.
- Уникальность selector должна проверяться в актуальном DOM, если это runtime picker.

---

### 10.3. `HtmlUtils`

Пример API:

```
javascript
class HtmlUtils {
escapeText(value) {}
escapeAttr(value) {}
}
```

### Acceptance criteria

- Все места с `innerHTML`, куда попадают пользовательские значения, используют escaping.
- Существующий UI отображает значения как раньше.
- Нельзя вставить HTML через имя правила/шаблон/селектор.

### На что смотреть ревьюеру

- Особое внимание на `innerHTML`.
- Нельзя использовать `innerHTML` с сырыми значениями из state.
- Если можно заменить на `textContent`, лучше заменить.

---

## 11. Этап 3. Выделить слой хранения состояния

### Цель

Централизовать работу с `chrome.storage.local`.

### Целевой класс

```
javascript
class ChromeStorageRepository {
async getState() {}
async saveState(state) {}
async updateState(mutator) {}
}
```

### Дополнительные классы

```
javascript
class StateSchema {
getDefaultState() {}
}

class StateMigrator {
migrate(state) {}
ensureShape(state) {}
}
```

### Что перенести

Из `background.js`:

```
DEFAULT_STATE
migrate
ensureShape
ensureState
```

В отдельные модули:

```
domain/state-schema.js
domain/state-migrator.js
infrastructure/chrome-storage-repository.js
```

### Acceptance criteria

- При чистой установке создаётся тот же default state.
- Старый state мигрируется в тот же формат, что и раньше.
- Существующие правила не теряются.
- Существующие спецвставки не теряются.
- Существующие smart counters не теряются.
- Snapshots сохраняются.
- Import/export работает.
- Все места чтения/записи state используют repository или постепенно помечены TODO.

### На что смотреть ревьюеру

- Нельзя менять структуру state без миграции.
- Нельзя удалять legacy-поля без подтверждения, что миграция завершена.
- `updateState` должен минимизировать race conditions.
- Не должно быть прямой записи `chrome.storage.local.set({ state })` в новых модулях.

---

## 12. Этап 4. Рефакторинг шаблонов и генераторов

### Цель

Разделить parsing, rendering и генераторы.

### Текущая проблема

Сейчас генераторы и словари находятся в одном большом файле. Часть генераторов мутирует context.

### Целевая структура

```
domain/templates/template-parser.js
domain/templates/template-renderer.js
domain/templates/template-token.js

domain/generators/generator-registry.js
domain/generators/base-generator.js
domain/generators/name-generator.js
domain/generators/email-generator.js
domain/generators/phone-generator.js
domain/generators/number-generator.js
domain/generators/date-generator.js
domain/generators/uuid-generator.js
domain/generators/lorem-generator.js
domain/generators/pick-generator.js
domain/generators/counter-generator.js
domain/generators/smart-sequence-generator.js
domain/generators/regex-generator.js

domain/generators/data/name-data.js
domain/generators/data/word-lists.js
domain/generators/data/lorem-data.js
```

### Acceptance criteria

- Все старые токены работают:
  - `{{email}}`;
  - `{{phone}}`;
  - `{{number}}`;
  - `{{date}}`;
  - `{{now}}`;
  - `{{uuid}}`;
  - `{{pick}}`;
  - `{{counter}}`;
  - `{{increment}}`;
  - `{{regex}}`;
  - `{{seq}}`;
  - `{{list}}`.
- Preview в options работает.
- Fill all генерирует значения.
- Counter увеличивается.
- Smart counter увеличивается и пишет history.
- `dryRun` не мутирует smart counters.
- Regex generator сохраняет прежний уровень поддержки.
- Неизвестный токен остаётся в шаблоне как раньше.

### На что смотреть ревьюеру

- Генераторы не должны напрямую читать `chrome.storage`.
- Мутация context должна быть явно описана.
- `TemplateRenderer` не должен знать про DOM.
- Словари лучше вынести из логики.
- Тесты обязательны для `counter`, `seq`, `regex`, `pick`.

---

## 13. Этап 5. Рефакторинг matcher-логики

### Цель

Сделать matcher тестируемым и независимым от остального приложения.

### Целевая структура

```
domain/matching/field-kind-detector.js
domain/matching/label-resolver.js
domain/matching/attribute-matcher.js
domain/matching/condition-evaluator.js
domain/matching/rule-matcher.js
domain/matching/dom-field-collector.js
```

### Классы

```
javascript
class FieldKindDetector {
detect(element) {}
}

class LabelResolver {
getLabelText(element) {}
}

class AttributeMatcher {
test(element, attr, pattern, useRegex) {}
}

class ConditionEvaluator {
evaluate(element, conditions, options) {}
}

class RuleMatcher {
findMatches(rule, root) {}
}
```

### Acceptance criteria

- Правила по selector работают.
- Правила по attribute работают.
- Правила по label работают.
- Правила по order работают.
- AND logic работает.
- OR logic работает.
- Пустые conditions не матчят поля.
- Hidden/submit/file/button input не заполняются.
- Checkbox/radio/select распознаются.
- Contenteditable не ломается, если он поддерживался раньше.
- Поведение `findMatches` совпадает с baseline.

### На что смотреть ревьюеру

- Нельзя менять порядок найденных полей.
- Нельзя менять семантику order matching.
- Нужно проверить forms и поля вне form.
- Нужно проверить label через:
  - `aria-label`;
  - `aria-labelledby`;
  - `label[for]`;
  - wrapping label.

---

## 14. Этап 6. Рефакторинг content script

### Цель

Разделить выполнение правил, работу с DOM, сообщения и горячие клавиши.

### Целевая структура

```
content/
├── content-bootstrap.js
├── content-message-router.js
├── dom-value-setter.js
├── field-highlighter.js
├── element-waiter.js
├── rule-execution-service.js
├── fill-all-use-case.js
├── special-insertion-use-case.js
├── page-shortcut-controller.js
└── content-public-api.js
```

### Классы

```
javascript
class DomValueSetter {}
class FieldHighlighter {}
class ElementWaiter {}
class RuleExecutionService {}
class FillAllUseCase {}
class SpecialInsertionUseCase {}
class PageShortcutController {}
class ContentMessageRouter {}
```

### Особое место: `DomValueSetter`

Он должен сохранить framework-safe поведение:

```
native setter
input/change/blur events
checkbox/radio support
select support
contenteditable support
```

### Acceptance criteria

- `FILL_ALL` работает.
- `FILL_SPECIAL` работает.
- `FILL_INSERTION_BY_ID` работает.
- `PICK_ELEMENT` работает.
- `PREVIEW_TEMPLATE` работает.
- `SCRAPE_FIELDS` работает.
- `SCRAPE_PAGE` работает.
- Page-scoped shortcuts работают.
- Поле не заполняется повторно менее приоритетным правилом.
- Checkbox/radio корректно включаются/выключаются.
- Select выбирает option по value/text.
- React/Vue/Angular-формы продолжают получать события.
- Delayed rules выполняются.
- Счётчики после delayed rules сохраняются.
- `matched` считается корректно.

### На что смотреть ревьюеру

- Нативные setter'ы нельзя заменить простым `el.value = ...` без теста.
- `WeakSet usedFields` должен сохранить семантику приоритетов.
- Асинхронные delayed rules должны сохранять context.
- Message listener должен возвращать `true` для async `sendResponse`.
- Нельзя ломать compatibility с already-open tabs, где background inject делает content scripts вручную.

---

## 15. Этап 7. Рефакторинг background service worker

### Цель

Разделить service worker на bootstrap, команды, миграции, messaging, UA rules, CopyFX bridge.

### Целевая структура

```
background/
├── background-bootstrap.js
├── background-app.js
├── command-controller.js
├── active-tab-service.js
├── content-script-injector.js
├── message-proxy-controller.js
├── ua-rules-service.js
├── copyfx-bridge-service.js
└── state-initializer.js
```

### Классы

```
javascript
class BackgroundApp {
async boot() {}
}

class CommandController {
register() {}
}

class ContentScriptInjector {
async ensureInjected(tabId) {}
}

class MessageProxyController {
register() {}
}

class UaRulesService {
async sync() {}
}

class CopyfxBridgeService {
async getTraders(payload) {}
async getInvestors() {}
}
```

### Acceptance criteria

- Расширение инициализирует state при установке.
- Расширение мигрирует старый state.
- Глобальные shortcuts работают.
- `sendToActive` работает на уже открытых вкладках.
- Content scripts инжектятся при необходимости.
- Unsupported pages корректно возвращают ошибку.
- UA rules синхронизируются при изменении state.
- CopyFX traders/investors работают.
- Background не падает после перезапуска service worker.

### На что смотреть ревьюеру

- MV3 service worker может выгружаться; нельзя полагаться на долговременное in-memory состояние.
- Все данные должны восстанавливаться из storage/session.
- Обработчики сообщений должны корректно возвращать `true` при async.
- Нельзя инжектить content scripts на `chrome://`, `edge://`, `about:`, extension pages.

---

## 16. Этап 8. Рефакторинг popup

### Цель

Разделить popup на независимые панели.

### Целевая структура

```
popup/
├── popup-bootstrap.js
├── popup-app.js
├── popup-dom.js
├── fill-panel.js
├── scraper-panel.js
├── copyfx-panel.js
├── investor-panel.js
├── ua-panel.js
├── result-table.js
├── country-format-service.js
└── popup-message-client.js
```

### Панели

```
javascript
class FillPanel {}
class ScraperPanel {}
class CopyfxPanel {}
class InvestorPanel {}
class UaPanel {}
```

### Acceptance criteria

- Popup открывается быстро.
- Кнопка fill all работает.
- Кнопка fill special включается/выключается как раньше.
- Status label показывает количество активных правил.
- Result table отображает детали.
- Scraper box появляется только когда включён.
- Scraper scan работает.
- CopyFX box появляется только когда включён.
- CopyFX session cache работает.
- Investor section появляется на нужной странице.
- UA toggle отображается и переключает первое UA правило.
- Popup закрывается при переходе в options для добавления вставки.

### На что смотреть ревьюеру

- Каждая панель должна быть независимой.
- Панель не должна напрямую менять DOM другой панели.
- Общие функции форматирования вынести отдельно.
- Все обращения к DOM должны проверять наличие элемента, если элемент опциональный.
- Не должно быть неэкранированного `innerHTML`.

---

## 17. Этап 9. Рефакторинг options page

### Цель

Разложить самый крупный файл на фичевые модули.

### Целевая структура

```
options/
├── options-bootstrap.js
├── options-app.js
├── options-state-controller.js
├── options-tabs-controller.js
│
├── rules/
│   ├── rules-controller.js
│   ├── rule-card-renderer.js
│   ├── rule-editor.js
│   ├── rule-history.js
│   └── rule-order-service.js
│
├── folders/
│   ├── folders-controller.js
│   └── folder-card-renderer.js
│
├── special-insertions/
│   ├── special-insertions-controller.js
│   ├── insertion-card-renderer.js
│   ├── insertion-editor.js
│   └── insertion-preview-service.js
│
├── value-builder/
│   ├── value-builder-controller.js
│   ├── value-template-builder.js
│   └── token-menu.js
│
├── smart-counters/
│   ├── smart-counters-controller.js
│   ├── smart-counter-card-renderer.js
│   └── smart-counter-preview-service.js
│
├── snapshots/
│   ├── snapshots-controller.js
│   └── snapshot-service.js
│
├── import-export/
│   ├── import-export-controller.js
│   └── state-importer.js
│
├── scraper/
│   └── scraper-config-controller.js
│
├── copyfx/
│   └── copyfx-config-controller.js
│
├── ua-rules/
│   └── ua-rules-controller.js
│
└── word-lists/
└── word-lists-controller.js
```

### Acceptance criteria

- Все вкладки options открываются.
- Активная вкладка сохраняет прежнее поведение.
- Добавление правила работает.
- Редактирование правила работает.
- Удаление правила работает.
- Перемещение правил работает.
- Папки работают.
- История правила сохраняется.
- Спецвставки создаются/редактируются/удаляются.
- Picker из options работает.
- Value builder генерирует тот же template.
- Preview значения работает.
- Модалка "из HTML" работает.
- Analyzer предлагает selector/template.
- Smart counters работают.
- Snapshots работают.
- Import/export работает.
- Scraper config работает.
- CopyFX config работает.
- UA rules работают.
- Word lists работают.
- Dangerous reset работает так же, как раньше.

### На что смотреть ревьюеру

- Это самый опасный этап: дробить только по одной фиче за PR.
- Не смешивать перенос кода и изменение UI.
- При переносе модулей сохранять ID DOM-элементов.
- Проверять autosave/debounced save.
- Проверять cancel/rollback через snapshots `_snapshot`.
- Проверять `_isNew` сценарии.
- Проверять collapsed/expanded состояние карточек.
- Проверять activity log и autoSnapshot.

---

## 18. Этап 10. Рефакторинг CopyFX/interceptor

### Цель

Сделать сетевой interceptor безопасным и изолированным.

### Целевая структура

```
content/copyfx-interceptor.js
domain/copyfx/copyfx-cache-service.js
domain/copyfx/copyfx-response-extractor.js
background/copyfx-bridge-service.js
popup/copyfx-panel.js
popup/investor-panel.js
```

### Что улучшить

1. Добавить guard от повторной установки.
2. Вынести URL check.
3. Вынести JSON parse.
4. Хранить историю запросов, а не только последний ответ.
5. Не ломать оригинальный fetch/XHR.
6. Не читать response body без clone.

### Acceptance criteria

- Страница продолжает выполнять свои fetch/XHR.
- Interceptor не устанавливается дважды.
- Ответы CopyFX сохраняются в cache.
- Тела запросов сохраняются отдельно.
- CopyFX traders загружаются.
- CopyFX investors загружаются.
- Если API не найден — возвращается понятная ошибка.
- Если ответ не JSON — страница не ломается.
- Если fetch отсутствует — скрипт не падает.

### На что смотреть ревьюеру

- Monkey patching должен быть максимально минимальным.
- Нельзя менять `this` и `arguments` при вызове оригинальных методов.
- Нельзя читать оригинальный response напрямую без `clone`.
- Нужно избегать перезаписи важных данных из-за одинакового key.

---

## 19. Этап 11. Введение тестов

### Цель

Покрыть чистую логику тестами.

### Что тестировать в первую очередь

```
UrlMatcher
TemplateParser
TemplateRenderer
GeneratorRegistry
CounterGenerator
SmartSequenceGenerator
RegexGenerator
RuleMatcher
ConditionEvaluator
StateMigrator
SelectorBuilder
Analyzer
```

### Пример тестовых групп

```
template-parser.test.js
template-renderer.test.js
generators.test.js
smart-counter.test.js
url-matcher.test.js
rule-matcher.test.js
state-migrator.test.js
selector-builder.test.js
analyzer.test.js
```

### Acceptance criteria

- Есть тесты для ключевой domain-логики.
- Тесты запускаются одной командой.
- Тесты не требуют реального Chrome.
- DOM-тесты используют jsdom.
- Storage/message тесты используют mocks.
- Перед каждым крупным PR тесты проходят.

### На что смотреть ревьюеру

- Тесты должны проверять поведение, а не реализацию.
- Не нужно snapshot-тестить огромный HTML без необходимости.
- Для генераторов с random лучше использовать seed/random provider или проверять формат.
- Для counter/seq обязательно проверять мутацию context.

---

## 20. Этап 12. Финальная стабилизация

### Цель

После декомпозиции выровнять стиль и документацию.

### Что сделать

1. Обновить README.
2. Добавить `docs/architecture.md`.
3. Добавить `docs/state-schema.md`.
4. Добавить `docs/message-contracts.md`.
5. Добавить `docs/manual-regression-checklist.md`.
6. Удалить устаревшие TODO.
7. Удалить dead code.
8. Проверить permissions в manifest.
9. Проверить performance popup/options.
10. Проверить warnings IDE.

### Acceptance criteria

- README соответствует фактической архитектуре.
- Есть описание state schema.
- Есть описание message types.
- Нет крупных неиспользуемых блоков.
- Нет новых critical warnings.
- Ручной regression checklist полностью пройден.
- Расширение работает после reload.
- Расширение работает на уже открытых вкладках после injection.

### На что смотреть ревьюеру

- Документация должна описывать не идеальную, а фактическую архитектуру.
- Не оставлять временные compatibility wrappers без срока удаления.
- Проверить, что refactoring не раздул manifest permissions.

---

## 21. Чеклист для ревьюера

### 21.1. Архитектура

- [ ] Один модуль отвечает за одну область.
- [ ] Domain logic не зависит от Chrome API.
- [ ] UI не содержит сложной бизнес-логики.
- [ ] Storage изолирован.
- [ ] Messaging изолирован.
- [ ] DOM utilities переиспользуются.
- [ ] Нет нового глобального хаоса вокруг `window.FF`.

---

### 21.2. Безопасность

- [ ] Нет небезопасного `innerHTML` с пользовательскими данными.
- [ ] Все значения для HTML экранируются.
- [ ] Все CSS selectors экранируются.
- [ ] Нет случайной утечки данных в console logs.
- [ ] Нет расширения permissions без причины.
- [ ] Network monkey patching не ломает страницу.

---

### 21.3. Совместимость

- [ ] Существующий state читается.
- [ ] Старые поля мигрируются.
- [ ] Новые поля имеют defaults.
- [ ] Старые настройки не теряются.
- [ ] Counters сохраняются.
- [ ] Smart counters сохраняют history.
- [ ] Content scripts подключаются в правильном порядке.

---

### 21.4. Поведение

- [ ] Fill all работает.
- [ ] Fill special работает.
- [ ] Picker работает.
- [ ] Preview template работает.
- [ ] Popup status корректен.
- [ ] Options сохраняют изменения.
- [ ] Import/export работает.
- [ ] CopyFX работает, если включён.
- [ ] UA rules работают, если включены.

---

### 21.5. Тестируемость

- [ ] Новая domain-логика покрыта тестами.
- [ ] Тесты не зависят от реального Chrome.
- [ ] Нет тестов, которые случайно зависят от текущей даты/random без контроля.
- [ ] Есть mocks для Chrome API.

---

## 22. Риски и анти-паттерны

### 22.1. Анти-паттерн: переписать всё сразу

Это почти гарантированно создаст регрессии.

Правильно:

```
перенести один модуль → проверить → закоммитить.
```

---

### 22.2. Анти-паттерн: смешать рефакторинг и фичи

Плохо:

```
Разделить popup и заодно поменять UI CopyFX.
```

Хорошо:

```
Сначала разделить popup без изменения UI.
Потом отдельным PR изменить UI CopyFX.
```

---

### 22.3. Анти-паттерн: скрытые изменения state

Любое изменение формата state требует:

- миграции;
- теста миграции;
- описания в docs;
- проверки import/export.

---

### 22.4. Анти-паттерн: перенести код без тестов

Если код переносится из одного файла в другой, нужно доказать, что поведение сохранилось.

Минимум:

- regression checklist;
- unit tests для extracted logic;
- ручная проверка расширения.

---

### 22.5. Анти-паттерн: оставить compatibility wrapper навсегда

Временные мосты допустимы:

```
javascript
window.FF.render = templateRenderer.render.bind(templateRenderer);
```

Но нужно добавить TODO с планом удаления.

---

## 23. Итоговая стратегия

Рефакторинг должен идти от безопасного к опасному:

```
1. Baseline и checklist
2. Lint/test/types
3. Shared utilities
4. Storage repository
5. Template/generators
6. Matcher
7. Content script
8. Background
9. Popup
10. Options
11. CopyFX/interceptor hardening
12. Финальная документация
```

Самые важные правила:

```
- не менять поведение без необходимости;
- каждый PR должен быть маленьким;
- acceptance criteria обязательны;
- reviewer checklist обязателен;
- сначала тестируем чистую логику;
- UI дробим по фичам;
- Chrome API изолируем;
- state мигрируем осторожно;
- window.FF постепенно превращаем в compatibility layer.
```

Финальная цель — проект, где новый разработчик может открыть папку конкретной фичи и понять её без чтения всего приложения.
