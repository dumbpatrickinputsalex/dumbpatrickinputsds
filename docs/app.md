Ниже — **аналитическая карта проекта перед крупным рефакторингом**. Я разделю её на:

1. **Структуру проекта**
2. **Назначение каждого файла**
3. **Оценку размера/сложности**
4. **Предупреждения PhpStorm**
5. **Архитектурные зоны риска**
6. **Рекомендации перед рефакторингом**

> Важно: по части файлов у меня есть точные данные из IDE-инспекций, по части — оценка на основе доступного содержимого. Для `options/options.js` файл очень большой, поэтому его стоит дополнительно прогнать отдельным скриптом/инструментом для точной метрики строк и функций.

---

# 1. Общая структура проекта

```plain text
formfiller-extension/
├── .idea/
│   ├── .gitignore
│   └── workspace.xml
│
├── background.js
├── manifest.json
├── README.md
│
├── content/
│   ├── content.js
│   ├── copyfx-interceptor.js
│   └── picker.js
│
├── lib/
│   ├── generators.js
│   ├── matcher.js
│   └── template.js
│
├── options/
│   ├── analyzer.js
│   ├── options.css
│   ├── options.html
│   └── options.js
│
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
│
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    └── patrick.gif
```


Это **Chrome Extension Manifest V3**.

Главные точки входа:

| Зона | Файл |
|---|---|
| Manifest | `manifest.json` |
| Background service worker | `background.js` |
| Content scripts | `content/content.js`, `content/picker.js`, `content/copyfx-interceptor.js` |
| Popup UI | `popup/popup.html`, `popup/popup.css`, `popup/popup.js` |
| Options UI | `options/options.html`, `options/options.css`, `options/options.js`, `options/analyzer.js` |
| Shared logic | `lib/generators.js`, `lib/template.js`, `lib/matcher.js` |

---

# 2. Сводная таблица файлов

| Файл | Примерно строк | Примерно функций/методов | Назначение | Риск рефакторинга |
|---|---:|---:|---|---|
| `manifest.json` | ~70 | 0 | Конфигурация расширения, permissions, content scripts, popup, options, shortcuts | Средний |
| `background.js` | ~360 | ~9 | Service worker: init state, миграции, hotkeys, прокси сообщений, UA rules, CopyFX bridge | Высокий |
| `content/content.js` | ~460 | ~19 | Главный content script: заполнение форм, спецвставки, page-shortcuts, сообщения | Высокий |
| `content/picker.js` | ~100 | ~6 | Overlay-пикер DOM-элемента и генерация CSS-селектора | Средний |
| `content/copyfx-interceptor.js` | ~35 | 0 именованных, 4 monkey-patch callbacks | Перехват `fetch`/`XHR` в MAIN world для CopyFX API | Высокий |
| `lib/generators.js` | ~500+ | ~8 helper + много генераторов | Генераторы токенов шаблонов: email, phone, date, regex, seq и т.д. | Средний/Высокий |
| `lib/template.js` | ~70 | 2 | Парсер и рендер Mustache-подобных шаблонов | Средний |
| `lib/matcher.js` | ~150 | ~8 | Матчинг DOM-полей по правилам и URL-условиям | Высокий |
| `popup/popup.html` | неизвестно | 0 | Разметка popup | Средний |
| `popup/popup.css` | неизвестно | 0 | Стили popup | Низкий/Средний |
| `popup/popup.js` | ~800–1000 | ~30+ | Логика popup: fill actions, scraper, CopyFX, investors, UA toggle | Очень высокий |
| `options/options.html` | неизвестно | 0 | Разметка страницы настроек | Средний |
| `options/options.css` | неизвестно | 0 | Стили страницы настроек | Средний |
| `options/options.js` | очень большой, вероятно 2500+ | много, вероятно 80+ | Главная логика настроек: правила, вставки, счётчики, версии, импорт/экспорт, UA, scraper, CopyFX | Критически высокий |
| `options/analyzer.js` | ~250 | ~8 | Анализ HTML элемента, подбор селектора и шаблона для вставки | Средний |
| `README.md` | ~200+ | 0 | Пользовательская документация | Низкий |
| `icons/*` | — | — | Иконки расширения | Низкий |
| `.idea/*` | — | — | Настройки IDE | Низкий |

---

# 3. Подробно по файлам

---

## `manifest.json`

### За что отвечает

Файл описывает расширение Chrome:

- версия manifest: `3`;
- имя и описание расширения;
- permissions:
  - `storage`;
  - `activeTab`;
  - `scripting`;
  - `tabs`;
  - `declarativeNetRequest`;
- popup:
  - `popup/popup.html`;
- options page:
  - `options/options.html`;
- глобальные горячие клавиши:
  - `Ctrl+Shift+F`;
  - `Ctrl+Shift+1`;
- content scripts:
  - `content/copyfx-interceptor.js` в `MAIN world`;
  - `lib/*` + `content/*` в обычном isolated world.

### Важные особенности

```json
"host_permissions": ["<all_urls>"]
```


Расширение имеет доступ ко всем сайтам. Это удобно, но перед публикацией/поддержкой стоит проверить необходимость такого широкого доступа.

### Риск

**Средний.**

Любое изменение порядка content scripts может сломать зависимости:

```plain text
generators.js → template.js → matcher.js → picker.js → content.js
```


---

## `background.js`

### За что отвечает

Это **service worker расширения**.

Основные обязанности:

1. Хранит `DEFAULT_STATE`.
2. Делает миграцию старого состояния:
   - `profiles` → `folders + rules`.
3. Нормализует структуру `state` через `ensureShape`.
4. Инициализирует `state` при установке/старте.
5. Обрабатывает глобальные команды Chrome:
   - `fill-all`;
   - `fill-special`.
6. Отправляет сообщения в активную вкладку.
7. Если content script ещё не загружен — инжектит его вручную.
8. Синхронизирует User-Agent правила через `declarativeNetRequest`.
9. Работает как proxy для popup/options.
10. Забирает CopyFX-данные из MAIN world через `chrome.scripting.executeScript`.

### Примерный список функций

| Функция | Назначение |
|---|---|
| `migrate(state)` | Миграция старого формата настроек в новый |
| `ensureShape(s)` | Дозаполнение недостающих полей в `state` |
| `ensureState()` | Создание/миграция state при старте |
| `activeTab()` | Получение активной вкладки |
| `sendToActive(msg)` | Отправка команды в активную вкладку |
| `syncUaRules()` | Обновление DNR-правил для User-Agent |
| `handleCopyfxGetTraders(payload)` | Получение трейдеров из перехваченного CopyFX API |
| `handleCopyfxGetInvestors()` | Получение инвесторов из перехваченного CopyFX API |
| `chrome.runtime.onMessage` callback | Роутинг сообщений от popup/options |

### Найденные предупреждения PhpStorm

По `background.js` найдено много предупреждений, но часть из них — ложные/контекстные из-за Chrome Extension API.

#### Существенные

| Тип | Описание |
|---|---|
| `WARNING` | `Unused constant palette` — константа объявлена, но не используется |
| `WARNING` | Можно упростить `!!(r.match.mode === 'OR')` |
| `WEAK WARNING` | `Promise returned from syncUaRules is ignored` |
| `WEAK WARNING` | `Unresolved variable isDefault` |
| `WEAK WARNING` | Условия по `command === 'fill-all'` определены IDE как всегда false — вероятно проблема типизации Chrome API |

#### Контекстные/возможно ложные

Много предупреждений вида:

```plain text
Unresolved variable or type chrome
Unresolved variable runtime
Unresolved function executeScript()
Deprecated symbol used
```


Они связаны с тем, что IDE не всегда знает типы Chrome Extension API. Это можно улучшить подключением типов.

### Риск

**Высокий.**

`background.js` — центральный маршрутизатор. Ошибка здесь может сломать:

- popup;
- горячие клавиши;
- инжект content scripts;
- UA rules;
- CopyFX;
- передачу команд в активную вкладку.

---

## `content/content.js`

### За что отвечает

Главный content script, который выполняется на странице.

Основные обязанности:

1. Безопасно устанавливает значения в поля.
2. Заполняет поля по правилам.
3. Выполняет click-правила.
4. Выполняет специальные вставки.
5. Ждёт появления динамических элементов.
6. Обрабатывает сообщения:
   - `FILL_ALL`;
   - `FILL_SPECIAL`;
   - `FILL_INSERTION_BY_ID`;
   - `PICK_ELEMENT`;
   - `PREVIEW_TEMPLATE`;
   - `SCRAPE_FIELDS`;
   - `SCRAPE_PAGE`.
7. Обрабатывает page-scoped горячие клавиши.
8. Экспортирует debug API в `window.FF`.

### Примерный список функций

| Функция | Назначение |
|---|---|
| `setValue(el, value)` | Установка значения в input/textarea/select/checkbox/radio/contenteditable |
| `highlight(el)` | Подсветка обработанного элемента |
| `isElementChecked(el)` | Определение состояния checkbox/radio/custom toggle |
| `shouldClickByGuard(el, guard)` | Решение, нужно ли кликать с учётом guard |
| `buildCtx(state)` | Создание контекста для шаблонизатора |
| `shortSelector(el)` | Короткое описание элемента для логов |
| `loadPageShortcuts()` | Загрузка page-scoped шорткатов |
| `eventMatches(e, sc)` | Проверка совпадения KeyboardEvent и настройки |
| `keyOfEvent(e)` | Нормализация клавиши |
| `isEditableTarget(t)` | Проверка, что фокус в редактируемом элементе |
| `formatComboFromSc(sc)` | Форматирование shortcut в строку |
| `fillAll()` | Массовое заполнение страницы |
| `waitForElement(selector, timeoutMs)` | Ожидание появления элемента |
| `executeRule(rule, ctx, usedFields, details, dbg)` | Выполнение одного правила |
| `fillSpecialById(insertionId)` | Спецвставка по ID |
| `fillSpecial()` | Поиск спецвставки для текущего URL |
| `runInsertion(state, ins)` | Выполнение спецвставки |
| `getState()` | Чтение состояния из storage |
| `persistCtx(state, ctx)` | Сохранение счётчиков после рендера |

### Найденные предупреждения PhpStorm

| Тип | Описание |
|---|---|
| `WEAK WARNING` | `Unresolved variable value/text` у `option.value` / `option.text` |
| `WEAK WARNING` | `Unresolved variable or type chrome` |
| `WEAK WARNING` | `Deprecated symbol used` для Chrome listeners |
| `WEAK WARNING` | `Promise returned from fillAll/fillSpecial/fillSpecialById is ignored` в обработчике hotkeys |

### Логические замечания

Есть важный момент:

```javascript
let filled = 0, matched = 0;
```


`matched` сейчас фактически не увеличивается. Значит popup может показывать:

```plain text
Заполнено: N из 0 совпадений
```


Это нужно исправлять до/во время рефакторинга.

Ещё один момент — delayed rules:

```javascript
setTimeout(async () => {
  await executeRule(...)
}, delay);
```


Они выполняются после `persistCtx(state, ctx)`, поэтому изменения счётчиков в delayed-правилах могут не сохраниться.

### Риск

**Высокий.**

Это один из самых важных файлов проекта. Его лучше рефакторить поэтапно.

---

## `content/picker.js`

### За что отвечает

Overlay-пикер DOM-элемента:

- показывает рамку вокруг элемента под курсором;
- строит CSS-селектор;
- возвращает селектор при клике;
- отменяется по `Esc`.

### Функции

| Функция | Назначение |
|---|---|
| `buildSelector(el)` | Генерация CSS-селектора |
| `ensureOverlay()` | Создание overlay и label |
| `onMove(e)` | Обновление позиции overlay при движении мыши |
| `onClick(e)` | Выбор элемента кликом |
| `onKey(e)` | Отмена по `Esc` |
| `stop(result)` | Завершение picker-сессии |
| `startPicker()` | Запуск picker |

### Риск

**Средний.**

Файл небольшой и изолированный. Хороший кандидат для раннего безопасного рефакторинга.

### Потенциальные улучшения

- переиспользовать selector builder из `options/analyzer.js`;
- лучше экранировать `name` и `data-*`;
- добавить ограничение на выбор элементов самого overlay.

---

## `content/copyfx-interceptor.js`

### За что отвечает

Скрипт выполняется в `MAIN world` на `document_start`.

Он перехватывает:

- `window.fetch`;
- `XMLHttpRequest`.

И складывает JSON-запросы/ответы CopyFX API в:

```javascript
window.__dpi_copyfx_cache
```


### Особенности

Файл делает monkey-patching браузерных API:

```javascript
window.fetch = function () { ... }
XMLHttpRequest.prototype.open = function (...) { ... }
XMLHttpRequest.prototype.send = function () { ... }
```


### Риск

**Высокий.**

Хотя файл маленький, он вмешивается в сетевой слой страницы. Любая ошибка может сломать запросы сайта.

### Потенциальные улучшения

- вынести проверку CopyFX URL в helper;
- вынести JSON parse в helper;
- не перетирать разные ответы одного endpoint с разными query-параметрами;
- проверить наличие `window.fetch` перед патчем;
- добавить флаг, чтобы не патчить повторно при повторной инъекции.

---

## `lib/template.js`

### За что отвечает

Mustache-подобный шаблонизатор.

Поддерживает:

```plain text
{{token}}
{{token:param1:param2}}
{{regex:[a-z]{5}}}
\{{ escaped }}
```


### Функции

| Функция | Назначение |
|---|---|
| `parse(template)` | Разбор шаблона на части: текст и токены |
| `render(template, ctx)` | Генерация итоговой строки |

### Экспорт

```javascript
window.FF.parse = parse;
window.FF.render = render;
```


### Риск

**Средний.**

Файл маленький, но критичный: через него проходят все шаблоны.

### Потенциальные улучшения

- добавить unit-тесты на edge cases;
- явно документировать RAW-токены;
- добавить возвращение ошибок вместо `<token_ERR>` для debug-режима;
- подумать про AST-кэширование шаблонов, если рендеров много.

---

## `lib/matcher.js`

### За что отвечает

Поиск DOM-полей, подходящих под правило.

Поддерживает условия:

- CSS selector;
- attribute matching;
- order matching;
- AND/OR logic;
- URL conditions.

### Функции

| Функция | Назначение |
|---|---|
| `getLabelText(el)` | Поиск текста label для поля |
| `fieldKind(el)` | Определение типа поля |
| `normalize(s)` | Нормализация строки для сравнения |
| `testAttr(el, attr, pattern, useRegex)` | Проверка атрибута |
| `testCondition(el, cond, indexInForm)` | Проверка одного условия |
| `evalConditions(...)` | Вычисление AND/OR-логики |
| `findMatches(rule, root)` | Поиск всех подходящих элементов |
| `urlMatches(patterns, url)` | Legacy URL matching |
| `urlMatchesConditions(conditions, url)` | Новые URL conditions |
| `testUrlCond(cond, url)` | Проверка одного URL-условия |

### Риск

**Высокий.**

Это ядро логики правил. Любая ошибка меняет, какие поля будут заполнены.

### Потенциальные улучшения

- выделить pure logic в тестируемые функции;
- добавить тесты на AND/OR;
- добавить тесты на selector/attribute/order;
- добавить тесты на URL wildcard;
- унифицировать URL matching с popup/options, где похожая логика дублируется.

---

## `lib/generators.js`

### За что отвечает

Генераторы токенов шаблонов:

- имена;
- email;
- телефон;
- числа;
- даты;
- UUID;
- lorem;
- pick;
- counter;
- increment;
- decimal;
- regex;
- smart seq;
- custom word lists.

### Основные helper-функции

| Функция | Назначение |
|---|---|
| `rand(n)` | Случайное число |
| `pick(arr)` | Случайный элемент массива |
| `translit(s)` | Транслитерация |
| `formatDate(d, fmt)` | Форматирование даты |
| `parseDate(s)` | Парсинг даты |
| `generateFromRegex(pattern)` | Упрощённая генерация строки по regex |

### Важные токены

```plain text
{{email}}
{{phone}}
{{number:min:max}}
{{date:from:to:format}}
{{now:format}}
{{uuid}}
{{pick:a|b|c}}
{{counter:name}}
{{increment:name:start:step}}
{{regex:pattern}}
{{seq:name}}
{{list:name}}
```


### Риск

**Средний/Высокий.**

Особенно важны:

- `counter`;
- `increment`;
- `seq`.

Они мутируют `ctx`, а потом `content.js` сохраняет изменения в storage.

### Потенциальные улучшения

- разделить данные и функции;
- вынести словари в отдельный файл;
- добавить unit-тесты для каждого генератора;
- стабилизировать regex generator;
- добавить seed/random provider для воспроизводимых тестов.

---

## `popup/popup.js`

### За что отвечает

Логика popup-окна расширения.

Основные блоки:

1. Получение активной вкладки.
2. Отображение количества активных правил.
3. Запуск `FILL_ALL`.
4. Запуск `FILL_SPECIAL`.
5. Открытие options page.
6. Добавление вставки из HTML.
7. Scraper data:
   - сканирование страницы;
   - отображение полей клиента.
8. CopyFX:
   - загрузка трейдеров;
   - рендер карточек;
   - session cache;
   - кнопки переходов.
9. Investors:
   - загрузка инвесторов;
   - рендер карточек;
   - session cache.
10. UA toggle.

### Примерные функции

| Функция | Назначение |
|---|---|
| `$` | Быстрый `getElementById` |
| `currentTab()` | Активная вкладка |
| `updateStatusLabel()` | Статус активных правил |
| `renderResultTable(details)` | Таблица результатов заполнения |
| `escapeHtml(s)` | Экранирование HTML |
| `send(type)` | Отправка команды в background |
| `scraperUrlMatches(...)` | Проверка URL для scraper |
| `loadScraperData()` | Загрузка scraper-блока |
| `countryAlpha2(val)` | Преобразование страны в alpha-2 |
| `formatScraperValue(key, val)` | Отображение значения scraper |
| `copyfxUrlMatches(...)` | Проверка CopyFX URL |
| `getCopyfxLang(url)` | Язык из URL |
| `getCopyfxAdminDomain(hostname)` | Admin domain |
| `copyfxSaveSession()` | Сохранение CopyFX cache |
| `copyfxClearSession()` | Очистка CopyFX cache |
| `loadCopyfxData()` | Инициализация CopyFX блока |
| `renderCopyfxEntries(cfg, append)` | Рендер трейдеров |
| `isTraderDetailPage(url)` | Проверка страницы трейдера |
| `investorSaveSession()` | Сохранение investors cache |
| `investorClearSession()` | Очистка investors cache |
| `loadInvestorData()` | Инициализация investors |
| `updateInvestorTitle()` | Заголовок investors |
| `getCoefficient(cmv)` | Коэффициент копирования |
| `renderInvestorEntries(append)` | Рендер инвесторов |
| `loadUaStatus()` | Статус UA toggle |

### Риск

**Очень высокий.**

Файл смешивает много разных продуктов/фич:

- fill UI;
- scraper;
- CopyFX;
- investors;
- UA.

Это один из главных кандидатов на декомпозицию.

### Предупреждения IDE

По `popup/popup.js` инспекция не вернула список проблем, но был timeout. Это значит, что файл достаточно тяжёлый для анализа или проверка не успела завершиться.

---

## `popup/popup.html`

### За что отвечает

Разметка popup.

Содержит UI для:

- кнопки заполнения всех полей;
- кнопки спецвставки;
- перехода в настройки;
- результата заполнения;
- scraper-блока;
- CopyFX-блока;
- investors-блока;
- UA-блока.

### Риск

**Средний.**

При рефакторинге JS нужно следить, чтобы все `id`, используемые в `popup.js`, остались совместимыми.

Например, JS ожидает элементы вроде:

```plain text
fillAll
fillSpecial
openOptions
resultDetails
resultTable
scraperBox
copyfxBox
investorSection
uaBox
```


---

## `popup/popup.css`

### За что отвечает

Стили popup.

Вероятные зоны:

- layout popup;
- кнопки;
- статусы;
- result table;
- scraper blocks;
- CopyFX cards;
- investor cards;
- UA toggle.

### Риск

**Низкий/Средний.**

Основной риск — сломать компактность popup, потому что Chrome popup имеет ограниченное пространство.

---

## `options/options.js`

### За что отвечает

Главная логика страницы настроек.

По доступному фрагменту видно, что файл отвечает за:

1. Рендер правил.
2. Папки.
3. Историю изменений.
4. Специальные вставки.
5. Value builder.
6. Модалку «Добавить вставку из HTML».
7. User-Agent rules.
8. Scraper config.
9. CopyFX config.
10. Smart counters.
11. Word lists.
12. Версии/snapshots.
13. Import/export.
14. Preview шаблонов.
15. Drag/reorder/expand/collapse логику.

### Риск

**Критически высокий.**

Судя по структуре, это самый перегруженный файл проекта.

Вероятные проблемы:

- много глобального состояния;
- много DOM-рендера через `innerHTML`;
- много inline event listeners;
- смешаны:
  - state management;
  - UI rendering;
  - business logic;
  - persistence;
  - migration-related logic;
  - validation;
  - preview;
  - domain-specific features.

### Что с ним делать при рефакторинге

Его нельзя «переписать одним махом». Лучше дробить по секциям:

```plain text
options/
├── options.js                    // bootstrap
├── state.js                      // load/save/state helpers
├── rules-ui.js                   // правила
├── folders-ui.js                 // папки
├── special-insertions-ui.js      // спецвставки
├── value-builder.js              // билдер значений
├── smart-counters-ui.js          // инкременторы
├── word-lists-ui.js              // списки слов
├── snapshots-ui.js               // версии
├── import-export-ui.js           // импорт/экспорт
├── scraper-config-ui.js          // scraper
├── copyfx-config-ui.js           // CopyFX
├── ua-rules-ui.js                // User-Agent
├── modal-add-from-html.js        // модалка HTML
└── dom-utils.js                  // $, $$, escapeText, toast etc.
```


---

## `options/analyzer.js`

### За что отвечает

Анализирует HTML, который пользователь вставляет из DevTools.

Основные задачи:

1. Распарсить `outerHTML`.
2. Найти целевой элемент.
3. Определить стабильный CSS-селектор.
4. Определить категорию поля:
   - email;
   - phone;
   - card;
   - cvc;
   - expiry;
   - money;
   - firstname;
   - lastname;
   - select;
   - checkbox;
   - и т.д.
5. Предложить шаблоны.
6. Анализировать trigger HTML.

### Функции

| Функция | Назначение |
|---|---|
| `escapeRegex(s)` | Экранирование regex |
| `cssEscape(s)` | CSS escape fallback |
| `isStableId(id)` | Проверка стабильности id |
| `isStableClass(c)` | Проверка стабильности class |
| `buildSelector(el)` | Построение селектора |
| `autoUrlPattern(rawUrl)` | Генерация URL-паттерна |
| `guessCategory(el)` | Определение категории поля |
| `suggestionsFor(category, el)` | Предложения шаблонов |
| `describeElement(el)` | Краткое описание элемента |
| `analyze(html, url)` | Анализ целевого HTML |
| `analyzeTrigger(html)` | Анализ HTML триггера |

### Риск

**Средний.**

Файл логически хорошо отделён. Его можно рефакторить отдельно и покрыть тестами.

---

## `options/options.html`

### За что отвечает

Разметка options page.

Вероятно содержит:

- вкладки;
- контейнеры для правил;
- контейнеры для спецвставок;
- контейнеры для инкременторов;
- формы настроек;
- модалки;
- import/export UI;
- версии;
- help/about sections.

### Риск

**Средний.**

Основной риск — сильная связка с `options/options.js` через `id` и классы.

---

## `options/options.css`

### За что отвечает

Стили страницы настроек:

- карточки правил;
- collapsed/expanded состояния;
- tabs;
- inputs/selects/buttons;
- модалки;
- badges;
- history;
- smart counters;
- scraper/copyfx/UA configs.

### Риск

**Средний.**

Вероятно файл большой и может содержать много специфичных классов.

---

# 4. Предупреждения и качество кода

## Уже найденные предупреждения

### `background.js`

Около **60+ предупреждений**, но большая часть связана с тем, что IDE не распознаёт Chrome Extension API.

Ключевые реальные:

```plain text
Unused constant palette
Promise returned from syncUaRules is ignored
Can be simplified to (r.match.mode === 'OR')
Unresolved variable isDefault
```


### `content/content.js`

Около **15 предупреждений**.

Ключевые:

```plain text
Promise returned from fillAll is ignored
Promise returned from fillSpecial is ignored
Promise returned from fillSpecialById is ignored
Unresolved variable or type chrome
Deprecated symbol used
```


### `popup/popup.js`

Инспекция не завершилась за лимит времени. Это само по себе сигнал: файл большой/сложный.

### `options/options.js`

Требует отдельной инспекции. По видимой структуре файл, скорее всего, даст много warning’ов.

---

# 5. Архитектурная картина

## Текущий поток выполнения

```plain text
User
 ↓
Popup / Hotkey
 ↓
background.js
 ↓
sendToActive()
 ↓
content/content.js
 ↓
lib/matcher.js ищет поля
 ↓
lib/template.js рендерит шаблон
 ↓
lib/generators.js генерирует значения
 ↓
content/content.js вставляет значения в DOM
 ↓
chrome.storage.local обновляет counters/state
```


---

## Поток настройки правил

```plain text
options/options.html
 ↓
options/options.js
 ↓
chrome.storage.local.state
 ↓
background.js ensureShape/migrate
 ↓
content.js использует state при заполнении
```


---

## CopyFX поток

```plain text
content/copyfx-interceptor.js в MAIN world
 ↓
window.__dpi_copyfx_cache
 ↓
background.js через chrome.scripting.executeScript
 ↓
popup/popup.js
 ↓
рендер карточек CopyFX / investors
```


---

# 6. Главные зоны риска перед рефакторингом

## 1. Глобальный `window.FF`

Много файлов пишут в один глобальный объект:

```javascript
window.FF = window.FF || {};
```


Туда добавляются:

```plain text
generators
parse
render
findMatches
urlMatches
startPicker
fillAll
fillSpecial
```


### Риск

Порядок подключения файлов критичен.

Если `template.js` загрузится раньше `generators.js`, рендер может работать не так, как ожидается.

### Рекомендация

Перед рефакторингом явно задокументировать зависимости:

```plain text
generators.js должен быть до template.js
template.js должен быть до content.js/options.js preview
matcher.js должен быть до content.js
picker.js должен быть до content.js
```


---

## 2. Один большой `state`

`state` содержит всё:

```plain text
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


### Риск

Любая запись:

```javascript
chrome.storage.local.set({ state })
```


перезаписывает весь объект.

Если два разных UI одновременно меняют разные части state, возможны гонки.

### Рекомендация

Минимум:

- ввести `StateRepository`;
- централизовать `loadState/saveState/updateState`;
- добавить версионирование изменений.

---

## 3. `options/options.js` слишком большой

Это главный долг проекта.

### Риск

Высокая вероятность сломать настройки при изменении любой секции.

### Рекомендация

Рефакторить только по вертикальным slices:

1. сначала вынести utils;
2. потом state;
3. потом отдельные UI-модули;
4. потом domain logic.

---

## 4. Дублирование URL matching

URL matching есть минимум в:

- `lib/matcher.js`;
- `popup/popup.js`;
- вероятно `options/options.js`.

### Риск

Разное поведение popup и content script.

Например popup может сказать «правило активно», а content script потом его не применит.

### Рекомендация

Вынести общий URL matcher в один файл, например:

```plain text
lib/url-matcher.js
```


---

## 5. Дублирование selector builder

Селектор строится в:

- `content/picker.js`;
- `options/analyzer.js`;
- частично `content/content.js` через `shortSelector`.

### Риск

Один UI генерирует один тип селектора, другой — другой.

### Рекомендация

Вынести:

```plain text
lib/selector-utils.js
```


---

## 6. Monkey patching сетевых API

`copyfx-interceptor.js` патчит:

```javascript
window.fetch
XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.send
```


### Риск

- повторный patch;
- конфликт с сайтом;
- конфликт с другим расширением;
- потеря данных из-за ключа без query string.

### Рекомендация

Добавить guard:

```javascript
if (window.__dpi_copyfx_interceptor_installed) return;
window.__dpi_copyfx_interceptor_installed = true;
```


---

# 7. Рекомендуемый план рефакторинга

## Этап 0. Зафиксировать baseline

Перед рефакторингом:

1. Сделать backup проекта.
2. Сделать git commit.
3. Экспортировать state из расширения.
4. Записать ручные сценарии проверки.

Минимальный regression checklist:

```plain text
[ ] Popup открывается
[ ] Ctrl+Shift+F заполняет поля
[ ] Ctrl+Shift+1 выполняет спецвставку
[ ] Options открываются
[ ] Создание правила работает
[ ] Создание спецвставки работает
[ ] Picker выбирает элемент
[ ] Counter увеличивается
[ ] Seq увеличивается
[ ] Import/export работает
[ ] CopyFX блок не падает
[ ] UA toggle работает
```


---

## Этап 1. Метрики и диагностика

Добавить точный отчёт по проекту:

```textmate
Get-ChildItem -Recurse -Include *.js,*.html,*.css,*.json,*.md |
  Where-Object { $_.FullName -notmatch '\\.idea\\' } |
  ForEach-Object {
    $lines = (Get-Content $_.FullName).Count
    [PSCustomObject]@{
      File = $_.FullName
      Lines = $lines
    }
  } | Format-Table -AutoSize
```


Для примерного количества функций в JS:

```textmate
Get-ChildItem -Recurse -Include *.js |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $functions = ([regex]::Matches($content, 'function\s+\w+|=>')).Count
    [PSCustomObject]@{
      File = $_.FullName
      FunctionsOrArrows = $functions
    }
  } | Format-Table -AutoSize
```


---

## Этап 2. Безопасные мелкие исправления

Сначала править то, что не меняет архитектуру:

| Файл | Действие |
|---|---|
| `background.js` | Удалить `palette`, если не нужна |
| `content/content.js` | Исправить `matched` |
| `content/content.js` | Сохранять `ctx` после delayed rules |
| `content/content.js` | Улучшить `shortSelector` |
| `copyfx-interceptor.js` | Добавить guard от повторной установки |
| `popup/popup.js` | Обработать ignored promises |
| все JS | Подключить типы Chrome API для IDE |

---

## Этап 3. Вынести shared utils

Хорошие кандидаты:

```plain text
lib/url-matcher.js
lib/selector-utils.js
lib/dom-utils.js
lib/storage.js
```


---

## Этап 4. Разделить popup

Предлагаемая структура:

```plain text
popup/
├── popup.html
├── popup.css
├── popup.js              // bootstrap only
├── fill-panel.js
├── scraper-panel.js
├── copyfx-panel.js
├── investors-panel.js
├── ua-panel.js
└── popup-utils.js
```


---

## Этап 5. Разделить options

Самый большой этап.

```plain text
options/
├── options.js
├── options-state.js
├── options-tabs.js
├── rules-ui.js
├── folders-ui.js
├── special-insertions-ui.js
├── value-builder.js
├── smart-counters-ui.js
├── snapshots-ui.js
├── import-export-ui.js
├── scraper-config-ui.js
├── copyfx-config-ui.js
├── ua-rules-ui.js
├── word-lists-ui.js
└── modal-add-from-html.js
```


---

# 8. Приоритеты файлов для рефакторинга

## Высший приоритет

| Файл | Почему |
|---|---|
| `options/options.js` | Самый большой и перегруженный |
| `popup/popup.js` | Много разных фич в одном файле |
| `content/content.js` | Ядро выполнения правил |
| `background.js` | Центральный маршрутизатор и миграции |

## Средний приоритет

| Файл | Почему |
|---|---|
| `lib/matcher.js` | Важная бизнес-логика, нужны тесты |
| `lib/generators.js` | Много генераторов, есть мутации ctx |
| `options/analyzer.js` | Можно изолированно улучшить selector logic |
| `content/picker.js` | Можно объединить selector generation |

## Низкий приоритет

| Файл | Почему |
|---|---|
| `manifest.json` | Менять осторожно, но редко |
| CSS/HTML | После стабилизации JS |
| icons | Не требуют рефакторинга |
| README | Обновлять после изменений |

---

# 9. Главные выводы

Проект рабочий, но имеет типичную структуру расширения, которое быстро росло фичами:

- много логики в `options.js`;
- много логики в `popup.js`;
- общий `state` используется напрямую;
- зависимости между файлами держатся на `window.FF`;
- есть дублирование URL/selector логики;
- мало явных границ между слоями.

## Самые важные действия перед крупным рефакторингом

1. **Сначала добавить точные метрики.**
2. **Сделать regression checklist.**
3. **Не начинать с переписывания `options.js` целиком.**
4. **Вынести общие утилиты.**
5. **Покрыть тестами `template`, `matcher`, `generators`.**
6. **Разделять popup/options по фичам, а не по типам кода.**

Если коротко: главный технический долг — **не отдельные баги, а высокая связанность и слишком крупные UI-файлы**. Их лучше дробить постепенно, сохраняя текущее поведение.