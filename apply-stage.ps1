param(
    [string]$Stage = "0"
)

Write-Host "🚀 Applying stage $Stage..." -ForegroundColor Green
function CreateStage14 {
    Write-Host "📦 Stage 14: Auto-replace hardcoded strings with labels..." -ForegroundColor Yellow

    # Создаём скрипт для замены
    @"
// scripts/replace-hardcoded-strings.js
const fs = require('fs');
const path = require('path');

// Карта замен для каждого файла
const replacements = {
  // popup/fill-panel.js
  'popup/fill-panel.js': {
    imports: [
      "import { POPUP } from '../labels/popup-labels.js';",
      "import { COMMON } from '../labels/common-labels.js';"
    ],
    replaces: [
      { find: /'Заполнить все поля'/g, replace: 'POPUP.BUTTON_FILL_ALL' },
      { find: /'Спецвставка'/g, replace: 'POPUP.BUTTON_FILL_SPECIAL' },
      { find: /'Открыть настройки'/g, replace: 'POPUP.BUTTON_OPEN_OPTIONS' },
      { find: /'Активных правил:'/g, replace: 'POPUP.STATUS_ACTIVE_RULES' },
      { find: /'Нет активных правил'/g, replace: 'POPUP.STATUS_NO_ACTIVE_RULES' },
      { find: /'Заполнение\.\.\.'/g, replace: 'POPUP.STATUS_FILLING' },
      { find: /'Готово!'/g, replace: 'POPUP.STATUS_DONE' },
      { find: /'Заполнено:'/g, replace: 'POPUP.RESULT_FILLED' },
      { find: /'Найдено:'/g, replace: 'POPUP.RESULT_MATCHED' },
      { find: /'Ошибки:'/g, replace: 'POPUP.RESULT_ERRORS' },
      { find: /'Нет результатов'/g, replace: 'POPUP.RESULT_NO_RESULTS' },
    ]
  },

  // popup/scraper-panel.js
  'popup/scraper-panel.js': {
    imports: [
      "import { POPUP } from '../labels/popup-labels.js';"
    ],
    replaces: [
      { find: /'Сканировать страницу'/g, replace: 'POPUP.SCRAPER_BUTTON_SCAN' },
      { find: /'Нет данных для отображения'/g, replace: 'POPUP.SCRAPER_NO_DATA' },
    ]
  },

  // popup/copyfx-panel.js
  'popup/copyfx-panel.js': {
    imports: [
      "import { POPUP } from '../labels/popup-labels.js';"
    ],
    replaces: [
      { find: /'Трейдеров:'/g, replace: 'POPUP.COPYFX_TRADERS' },
      { find: /'Обновить'/g, replace: 'POPUP.COPYFX_REFRESH' },
      { find: /'Нет данных CopyFX'/g, replace: 'POPUP.COPYFX_NO_DATA' },
    ]
  },

  // popup/investor-panel.js
  'popup/investor-panel.js': {
    imports: [
      "import { POPUP } from '../labels/popup-labels.js';"
    ],
    replaces: [
      { find: /'Инвесторы:'/g, replace: 'POPUP.INVESTORS_LIST' },
      { find: /'Нет данных об инвесторах'/g, replace: 'POPUP.INVESTORS_NO_DATA' },
    ]
  },

  // popup/ua-panel.js
  'popup/ua-panel.js': {
    imports: [
      "import { POPUP } from '../labels/popup-labels.js';"
    ],
    replaces: [
      { find: /'Подменить User-Agent'/g, replace: 'POPUP.UA_TOGGLE_LABEL' },
      { find: /'Нет правил для подмены UA'/g, replace: 'POPUP.UA_NO_RULES' },
    ]
  },

  // background/background-app.js
  'background/background-app.js': {
    imports: [
      "import { BACKGROUND } from '../labels/background-labels.js';"
    ],
    replaces: [
      { find: /'🟢 Background service worker started'/g, replace: 'BACKGROUND.STARTUP' },
      { find: /'📁 State initialized'/g, replace: 'BACKGROUND.STATE_INIT' },
      { find: /'📦 State migrated from old version'/g, replace: 'BACKGROUND.STATE_MIGRATED' },
      { find: /'Неизвестный тип сообщения:'/g, replace: 'BACKGROUND.MSG_UNKNOWN_TYPE' },
      { find: /'Нет активной вкладки'/g, replace: 'BACKGROUND.COPYFX_NO_ACTIVE_TAB' },
      { find: /'Нет данных о трейдерах'/g, replace: 'BACKGROUND.COPYFX_NO_TRADERS_DATA' },
      { find: /'Нет данных об инвесторах'/g, replace: 'BACKGROUND.COPYFX_NO_INVESTORS_DATA' },
    ]
  },

  // content/content.js
  'content/content.js': {
    imports: [
      "import { CONTENT } from '../labels/content-labels.js';"
    ],
    replaces: [
      { find: /'🟢 Dumb Patrick Inputs: content script loaded'/g, replace: 'CONTENT.CONSOLE_START' },
      { find: /'📝 Начинаем заполнение\.\.\.'/g, replace: 'CONTENT.CONSOLE_FILL_START' },
      { find: /'✅ Заполнение завершено'/g, replace: 'CONTENT.CONSOLE_FILL_DONE' },
      { find: /'❌ Ошибка заполнения:'/g, replace: 'CONTENT.CONSOLE_FILL_ERROR' },
      { find: /'🎯 Спецвставка\.\.\.'/g, replace: 'CONTENT.CONSOLE_SPECIAL_START' },
      { find: /'✅ Спецвставка завершена'/g, replace: 'CONTENT.CONSOLE_SPECIAL_DONE' },
      { find: /'Заполняем поля\.\.\.'/g, replace: 'CONTENT.NOTIFICATION_FILLING' },
      { find: /'✅ Готово!'/g, replace: 'CONTENT.NOTIFICATION_DONE' },
      { find: /'❌ Ошибка'/g, replace: 'CONTENT.NOTIFICATION_ERROR' },
      { find: /'Наведите на элемент и кликните для выбора'/g, replace: 'CONTENT.PICKER_INSTRUCTION' },
      { find: /'❌ Выбор отменён'/g, replace: 'CONTENT.PICKER_CANCELLED' },
      { find: /'Найдено полей:'/g, replace: 'CONTENT.STATUS_FOUND' },
      { find: /'Заполнено полей:'/g, replace: 'CONTENT.STATUS_FILLED' },
      { find: /'Пропущено:'/g, replace: 'CONTENT.STATUS_SKIPPED' },
    ]
  },

  // options/options-bootstrap.js
  'options/options-bootstrap.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Настройки Dumb Patrick Inputs'/g, replace: 'OPTIONS.TITLE' },
      { find: /'Управление правилами заполнения форм'/g, replace: 'OPTIONS.SUBTITLE' },
    ]
  },

  // options/controllers/rules-controller.js
  'options/controllers/rules-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Правила заполнения'/g, replace: 'OPTIONS.RULES_TITLE' },
      { find: /'+ Добавить правило'/g, replace: 'OPTIONS.RULES_ADD_BUTTON' },
      { find: /'Нет правил. Создайте первое правило!'/g, replace: 'OPTIONS.RULES_NO_RULES' },
      { find: /'Название правила'/g, replace: 'OPTIONS.RULES_NAME' },
      { find: /'Шаблон'/g, replace: 'OPTIONS.RULES_TEMPLATE' },
      { find: /'Условия'/g, replace: 'OPTIONS.RULES_CONDITIONS' },
      { find: /'Удалить правило?'/g, replace: 'OPTIONS.RULES_DELETE_CONFIRM' },
      { find: /'URL условия'/g, replace: 'OPTIONS.RULES_URL_CONDITIONS' },
    ]
  },

  // options/controllers/folders-controller.js
  'options/controllers/folders-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Папки'/g, replace: 'OPTIONS.FOLDERS_TITLE' },
      { find: /'+ Добавить папку'/g, replace: 'OPTIONS.FOLDERS_ADD_BUTTON' },
      { find: /'Нет папок'/g, replace: 'OPTIONS.FOLDERS_NO_FOLDERS' },
      { find: /'Название папки'/g, replace: 'OPTIONS.FOLDERS_NAME' },
      { find: /'Правила в папке'/g, replace: 'OPTIONS.FOLDERS_RULES' },
    ]
  },

  // options/controllers/special-insertions-controller.js
  'options/controllers/special-insertions-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Спецвставки'/g, replace: 'OPTIONS.INSERTIONS_TITLE' },
      { find: /'+ Добавить спецвставку'/g, replace: 'OPTIONS.INSERTIONS_ADD_BUTTON' },
      { find: /'Нет спецвставок'/g, replace: 'OPTIONS.INSERTIONS_NO_INSERTIONS' },
      { find: /'Название вставки'/g, replace: 'OPTIONS.INSERTIONS_NAME' },
      { find: /'Шаги вставки'/g, replace: 'OPTIONS.INSERTIONS_STEPS' },
      { find: /'Селектор'/g, replace: 'OPTIONS.INSERTIONS_SELECTOR' },
      { find: /'Значение'/g, replace: 'OPTIONS.INSERTIONS_VALUE' },
      { find: /'Задержка \(мс\)'/g, replace: 'OPTIONS.INSERTIONS_DELAY' },
    ]
  },

  // options/controllers/smart-counters-controller.js
  'options/controllers/smart-counters-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Смарт-счётчики'/g, replace: 'OPTIONS.COUNTERS_TITLE' },
      { find: /'+ Добавить счётчик'/g, replace: 'OPTIONS.COUNTERS_ADD_BUTTON' },
      { find: /'Нет счётчиков'/g, replace: 'OPTIONS.COUNTERS_NO_COUNTERS' },
      { find: /'Название счётчика'/g, replace: 'OPTIONS.COUNTERS_NAME' },
      { find: /'Текущее значение'/g, replace: 'OPTIONS.COUNTERS_CURRENT' },
      { find: /'История'/g, replace: 'OPTIONS.COUNTERS_HISTORY' },
    ]
  },

  // options/controllers/snapshots-controller.js
  'options/controllers/snapshots-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Снапшоты состояния'/g, replace: 'OPTIONS.SNAPSHOTS_TITLE' },
      { find: /'+ Создать снапшот'/g, replace: 'OPTIONS.SNAPSHOTS_ADD_BUTTON' },
      { find: /'Нет снапшотов'/g, replace: 'OPTIONS.SNAPSHOTS_NO_SNAPSHOTS' },
      { find: /'Название снапшота'/g, replace: 'OPTIONS.SNAPSHOTS_NAME' },
      { find: /'Дата создания'/g, replace: 'OPTIONS.SNAPSHOTS_DATE' },
      { find: /'Восстановить'/g, replace: 'OPTIONS.SNAPSHOTS_RESTORE' },
      { find: /'Восстановить это состояние?'/g, replace: 'OPTIONS.SNAPSHOTS_RESTORE_CONFIRM' },
    ]
  },

  // options/controllers/word-lists-controller.js
  'options/controllers/word-lists-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Списки слов'/g, replace: 'OPTIONS.WORDLISTS_TITLE' },
      { find: /'+ Добавить список'/g, replace: 'OPTIONS.WORDLISTS_ADD_BUTTON' },
      { find: /'Нет списков'/g, replace: 'OPTIONS.WORDLISTS_NO_LISTS' },
      { find: /'Название списка'/g, replace: 'OPTIONS.WORDLISTS_NAME' },
      { find: /'Слова \(через запятую или с новой строки\)'/g, replace: 'OPTIONS.WORDLISTS_WORDS' },
    ]
  },

  // options/controllers/scraper-config-controller.js
  'options/controllers/scraper-config-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Настройки скрапера'/g, replace: 'OPTIONS.SCRAPER_TITLE' },
      { find: /'Включить скрапер'/g, replace: 'OPTIONS.SCRAPER_ENABLED' },
      { find: /'URL паттерны \(по одному на строку\)'/g, replace: 'OPTIONS.SCRAPER_URL_PATTERNS' },
    ]
  },

  // options/controllers/copyfx-config-controller.js
  'options/controllers/copyfx-config-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Настройки CopyFX'/g, replace: 'OPTIONS.COPYFX_TITLE' },
      { find: /'Включить CopyFX'/g, replace: 'OPTIONS.COPYFX_ENABLED' },
      { find: /'Административный домен'/g, replace: 'OPTIONS.COPYFX_ADMIN_DOMAIN' },
    ]
  },

  // options/controllers/ua-rules-controller.js
  'options/controllers/ua-rules-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Правила подмены User-Agent'/g, replace: 'OPTIONS.UA_TITLE' },
      { find: /'+ Добавить правило'/g, replace: 'OPTIONS.UA_ADD_BUTTON' },
      { find: /'Нет правил UA'/g, replace: 'OPTIONS.UA_NO_RULES' },
      { find: /'User-Agent'/g, replace: 'OPTIONS.UA_USER_AGENT' },
      { find: /'URL паттерн'/g, replace: 'OPTIONS.UA_URL_PATTERN' },
      { find: /'Включено'/g, replace: 'OPTIONS.UA_ENABLED' },
    ]
  },

  // options/controllers/import-export-controller.js
  'options/controllers/import-export-controller.js': {
    imports: [
      "import { OPTIONS } from '../labels/options-labels.js';"
    ],
    replaces: [
      { find: /'Импорт и экспорт настроек'/g, replace: 'OPTIONS.IMPORT_EXPORT_TITLE' },
      { find: /'Экспортировать настройки'/g, replace: 'OPTIONS.IMPORT_EXPORT_EXPORT_BUTTON' },
      { find: /'Импортировать настройки'/g, replace: 'OPTIONS.IMPORT_EXPORT_IMPORT_BUTTON' },
      { find: /'Выберите JSON-файл'/g, replace: 'OPTIONS.IMPORT_EXPORT_SELECT_FILE' },
      { find: /'Настройки успешно импортированы'/g, replace: 'OPTIONS.IMPORT_EXPORT_SUCCESS' },
      { find: /'Ошибка импорта'/g, replace: 'OPTIONS.IMPORT_EXPORT_ERROR' },
    ]
  }
};

// Функция для добавления импортов в файл
function addImports(content, imports) {
  // Находим последний import
  const importRegex = /^import .*?;$/gm;
  const matches = content.match(importRegex);

  if (matches && matches.length > 0) {
    const lastImport = matches[matches.length - 1];
    const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
    const before = content.substring(0, lastImportIndex);
    const after = content.substring(lastImportIndex);
    return before + '\n' + imports.join('\n') + after;
  } else {
    // Если импортов нет — добавляем в начало
    return imports.join('\n') + '\n' + content;
  }
}

// Функция для применения замен
function applyReplacements(content, replaces) {
  let newContent = content;
  for (const rep of replaces) {
    newContent = newContent.replace(rep.find, rep.replace);
  }
  return newContent;
}

// Основной цикл
for (const [filePath, config] of Object.entries(replacements)) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Проверяем, есть ли уже импорты
  const hasImports = config.imports.some(imp => content.includes(imp));

  if (!hasImports) {
    content = addImports(content, config.imports);
  }

  // Применяем замены
  content = applyReplacements(content, config.replaces);

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated: ${filePath}`);
}

console.log('🎉 All replacements completed!');
"@ | Out-File -FilePath "scripts/replace-hardcoded-strings.js" -Encoding utf8

    # Создаём папку scripts если её нет
    New-Item -ItemType Directory -Force -Path "scripts" | Out-Null

    # Запускаем скрипт замены
    node scripts/replace-hardcoded-strings.js

    git add .
    git commit -m "refactor(labels): replace hardcoded strings with labels"
    git push origin master

    Write-Host "✅ Stage 14 complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 Done!" -ForegroundColor Yellow
    Write-Host "  All hardcoded strings in JS files replaced with labels imports." -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Updated files:" -ForegroundColor Yellow
    Write-Host "  - popup/fill-panel.js" -ForegroundColor White
    Write-Host "  - popup/scraper-panel.js" -ForegroundColor White
    Write-Host "  - popup/copyfx-panel.js" -ForegroundColor White
    Write-Host "  - popup/investor-panel.js" -ForegroundColor White
    Write-Host "  - popup/ua-panel.js" -ForegroundColor White
    Write-Host "  - background/background-app.js" -ForegroundColor White
    Write-Host "  - content/content.js" -ForegroundColor White
    Write-Host "  - options/options-bootstrap.js" -ForegroundColor White
    Write-Host "  - options/controllers/*.js" -ForegroundColor White
}
function CreateStage13 {
    Write-Host "📦 Stage 13: Extract all hardcoded text to labels..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path "labels" | Out-Null

    # common-labels.js
    @"
// Общие метки, используемые в разных частях приложения

export const COMMON = {
  // Кнопки
  BUTTON_SAVE: 'Сохранить',
  BUTTON_CANCEL: 'Отмена',
  BUTTON_DELETE: 'Удалить',
  BUTTON_ADD: 'Добавить',
  BUTTON_EDIT: 'Редактировать',
  BUTTON_CLOSE: 'Закрыть',
  BUTTON_BACK: 'Назад',
  BUTTON_NEXT: 'Далее',
  BUTTON_RESET: 'Сбросить',

  // Статусы
  STATUS_ENABLED: 'Включено',
  STATUS_DISABLED: 'Отключено',
  STATUS_ACTIVE: 'Активно',
  STATUS_INACTIVE: 'Неактивно',
  STATUS_LOADING: 'Загрузка...',
  STATUS_READY: 'Готово',
  STATUS_ERROR: 'Ошибка',

  // Действия
  ACTION_FILL: 'Заполнить',
  ACTION_FILL_ALL: 'Заполнить все',
  ACTION_FILL_SPECIAL: 'Спецвставка',
  ACTION_PREVIEW: 'Предпросмотр',
  ACTION_IMPORT: 'Импорт',
  ACTION_EXPORT: 'Экспорт',

  // Сообщения
  MSG_SAVED: 'Сохранено',
  MSG_DELETED: 'Удалено',
  MSG_ADDED: 'Добавлено',
  MSG_ERROR_OCCURRED: 'Произошла ошибка',
  MSG_NO_DATA: 'Нет данных',
  MSG_EMPTY_FIELD: 'Поле не может быть пустым',
};
"@ | Out-File -FilePath "labels/common-labels.js" -Encoding utf8

    # popup-labels.js
    @"
// Текст для popup-окна

export const POPUP = {
  // Заголовки
  TITLE: 'Dumb Patrick Inputs',

  // Кнопки
  BUTTON_FILL_ALL: 'Заполнить все поля',
  BUTTON_FILL_SPECIAL: 'Спецвставка',
  BUTTON_OPEN_OPTIONS: 'Открыть настройки',

  // Статусы
  STATUS_ACTIVE_RULES: 'Активных правил:',
  STATUS_NO_ACTIVE_RULES: 'Нет активных правил',
  STATUS_FILLING: 'Заполнение...',
  STATUS_DONE: 'Готово!',

  // Результаты
  RESULT_FILLED: 'Заполнено:',
  RESULT_MATCHED: 'Найдено:',
  RESULT_ERRORS: 'Ошибки:',
  RESULT_NO_RESULTS: 'Нет результатов',

  // Панели
  PANEL_SCRAPER: 'Скрапер',
  PANEL_COPYFX: 'CopyFX',
  PANEL_INVESTORS: 'Инвесторы',
  PANEL_UA: 'User-Agent',

  // Scraper
  SCRAPER_BUTTON_SCAN: 'Сканировать страницу',
  SCRAPER_NO_DATA: 'Нет данных для отображения',

  // CopyFX
  COPYFX_TRADERS: 'Трейдеров:',
  COPYFX_REFRESH: 'Обновить',
  COPYFX_NO_DATA: 'Нет данных CopyFX',

  // Investors
  INVESTORS_LIST: 'Инвесторы:',
  INVESTORS_NO_DATA: 'Нет данных об инвесторах',

  // UA
  UA_TOGGLE_LABEL: 'Подменить User-Agent',
  UA_NO_RULES: 'Нет правил для подмены UA',
};
"@ | Out-File -FilePath "labels/popup-labels.js" -Encoding utf8

    # options-labels.js
    @"
// Текст для страницы настроек (Options)

export const OPTIONS = {
  // Основные заголовки
  TITLE: 'Настройки Dumb Patrick Inputs',
  SUBTITLE: 'Управление правилами заполнения форм',

  // Вкладки
  TAB_RULES: 'Правила',
  TAB_FOLDERS: 'Папки',
  TAB_SPECIAL_INSERTIONS: 'Спецвставки',
  TAB_SMART_COUNTERS: 'Смарт-счётчики',
  TAB_SNAPSHOTS: 'Снапшоты',
  TAB_WORD_LISTS: 'Списки слов',
  TAB_SCRAPER: 'Скрапер',
  TAB_COPYFX: 'CopyFX',
  TAB_UA_RULES: 'User-Agent',
  TAB_IMPORT_EXPORT: 'Импорт/Экспорт',

  // Правила
  RULES_TITLE: 'Правила заполнения',
  RULES_ADD_BUTTON: '+ Добавить правило',
  RULES_NO_RULES: 'Нет правил. Создайте первое правило!',
  RULES_NAME: 'Название правила',
  RULES_TEMPLATE: 'Шаблон',
  RULES_CONDITIONS: 'Условия',
  RULES_DELETE_CONFIRM: 'Удалить правило?',
  RULES_URL_CONDITIONS: 'URL условия',

  // Папки
  FOLDERS_TITLE: 'Папки',
  FOLDERS_ADD_BUTTON: '+ Добавить папку',
  FOLDERS_NO_FOLDERS: 'Нет папок',
  FOLDERS_NAME: 'Название папки',
  FOLDERS_RULES: 'Правила в папке',

  // Спецвставки
  INSERTIONS_TITLE: 'Спецвставки',
  INSERTIONS_ADD_BUTTON: '+ Добавить спецвставку',
  INSERTIONS_NO_INSERTIONS: 'Нет спецвставок',
  INSERTIONS_NAME: 'Название вставки',
  INSERTIONS_STEPS: 'Шаги вставки',
  INSERTIONS_SELECTOR: 'Селектор',
  INSERTIONS_VALUE: 'Значение',
  INSERTIONS_DELAY: 'Задержка (мс)',

  // Смарт-счётчики
  COUNTERS_TITLE: 'Смарт-счётчики',
  COUNTERS_ADD_BUTTON: '+ Добавить счётчик',
  COUNTERS_NO_COUNTERS: 'Нет счётчиков',
  COUNTERS_NAME: 'Название счётчика',
  COUNTERS_CURRENT: 'Текущее значение',
  COUNTERS_HISTORY: 'История',

  // Снапшоты
  SNAPSHOTS_TITLE: 'Снапшоты состояния',
  SNAPSHOTS_ADD_BUTTON: '+ Создать снапшот',
  SNAPSHOTS_NO_SNAPSHOTS: 'Нет снапшотов',
  SNAPSHOTS_NAME: 'Название снапшота',
  SNAPSHOTS_DATE: 'Дата создания',
  SNAPSHOTS_RESTORE: 'Восстановить',
  SNAPSHOTS_RESTORE_CONFIRM: 'Восстановить это состояние?',

  // Списки слов
  WORDLISTS_TITLE: 'Списки слов',
  WORDLISTS_ADD_BUTTON: '+ Добавить список',
  WORDLISTS_NO_LISTS: 'Нет списков',
  WORDLISTS_NAME: 'Название списка',
  WORDLISTS_WORDS: 'Слова (через запятую или с новой строки)',

  // Скрапер
  SCRAPER_TITLE: 'Настройки скрапера',
  SCRAPER_ENABLED: 'Включить скрапер',
  SCRAPER_URL_PATTERNS: 'URL паттерны (по одному на строку)',

  // CopyFX
  COPYFX_TITLE: 'Настройки CopyFX',
  COPYFX_ENABLED: 'Включить CopyFX',
  COPYFX_ADMIN_DOMAIN: 'Административный домен',

  // User-Agent
  UA_TITLE: 'Правила подмены User-Agent',
  UA_ADD_BUTTON: '+ Добавить правило',
  UA_NO_RULES: 'Нет правил UA',
  UA_USER_AGENT: 'User-Agent',
  UA_URL_PATTERN: 'URL паттерн',
  UA_ENABLED: 'Включено',

  // Импорт/Экспорт
  IMPORT_EXPORT_TITLE: 'Импорт и экспорт настроек',
  IMPORT_EXPORT_EXPORT_BUTTON: 'Экспортировать настройки',
  IMPORT_EXPORT_IMPORT_BUTTON: 'Импортировать настройки',
  IMPORT_EXPORT_SELECT_FILE: 'Выберите JSON-файл',
  IMPORT_EXPORT_SUCCESS: 'Настройки успешно импортированы',
  IMPORT_EXPORT_ERROR: 'Ошибка импорта',
};
"@ | Out-File -FilePath "labels/options-labels.js" -Encoding utf8

    # content-labels.js
    @"
// Текст для content script (сообщения на странице)

export const CONTENT = {
  // Сообщения в консоли
  CONSOLE_START: '🟢 Dumb Patrick Inputs: content script loaded',
  CONSOLE_FILL_START: '📝 Начинаем заполнение...',
  CONSOLE_FILL_DONE: '✅ Заполнение завершено',
  CONSOLE_FILL_ERROR: '❌ Ошибка заполнения:',
  CONSOLE_SPECIAL_START: '🎯 Спецвставка...',
  CONSOLE_SPECIAL_DONE: '✅ Спецвставка завершена',

  // Уведомления на странице
  NOTIFICATION_FILLING: 'Заполняем поля...',
  NOTIFICATION_DONE: '✅ Готово!',
  NOTIFICATION_ERROR: '❌ Ошибка',

  // Плейсхолдеры для picker
  PICKER_INSTRUCTION: 'Наведите на элемент и кликните для выбора',
  PICKER_CANCELLED: '❌ Выбор отменён',

  // Статусы
  STATUS_FOUND: 'Найдено полей:',
  STATUS_FILLED: 'Заполнено полей:',
  STATUS_SKIPPED: 'Пропущено:',
};
"@ | Out-File -FilePath "labels/content-labels.js" -Encoding utf8

    # background-labels.js
    @"
// Текст для background service worker

export const BACKGROUND = {
  // Стартовые сообщения
  STARTUP: '🟢 Background service worker started',
  STATE_INIT: '📁 State initialized',
  STATE_MIGRATED: '📦 State migrated from old version',

  // Команды
  COMMAND_FILL_ALL: 'Заполнение всех полей (Ctrl+Shift+F)',
  COMMAND_FILL_SPECIAL: 'Спецвставка (Ctrl+Shift+1)',
  COMMAND_UNSUPPORTED_URL: 'Команда не поддерживается на этом URL:',

  // CopyFX
  COPYFX_NO_ACTIVE_TAB: 'Нет активной вкладки',
  COPYFX_NO_TRADERS_DATA: 'Нет данных о трейдерах',
  COPYFX_NO_INVESTORS_DATA: 'Нет данных об инвесторах',

  // UA Rules
  UA_RULES_SYNCED: 'UA правила синхронизированы',
  UA_RULES_SYNC_ERROR: 'Ошибка синхронизации UA правил:',

  // Messages
  MSG_UNKNOWN_TYPE: 'Неизвестный тип сообщения:',
};
"@ | Out-File -FilePath "labels/background-labels.js" -Encoding utf8

    # index.js
    @"
// Главный файл для импорта всех меток

export * from './common-labels.js';
export * from './popup-labels.js';
export * from './options-labels.js';
export * from './content-labels.js';
export * from './background-labels.js';
"@ | Out-File -FilePath "labels/index.js" -Encoding utf8

    git add labels/
    git commit -m "refactor(labels): extract all hardcoded text to labels"
    git push origin master

    Write-Host "✅ Stage 13 complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Replace hardcoded strings in JS files with imports from labels/" -ForegroundColor White
    Write-Host "  2. Example: import { POPUP } from '../labels/popup-labels.js'" -ForegroundColor White
    Write-Host "  3. Example: use POPUP.BUTTON_FILL_ALL instead of 'Заполнить все поля'" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Labels created:" -ForegroundColor Yellow
    Write-Host "  - labels/common-labels.js" -ForegroundColor White
    Write-Host "  - labels/popup-labels.js" -ForegroundColor White
    Write-Host "  - labels/options-labels.js" -ForegroundColor White
    Write-Host "  - labels/content-labels.js" -ForegroundColor White
    Write-Host "  - labels/background-labels.js" -ForegroundColor White
    Write-Host "  - labels/index.js" -ForegroundColor White
}

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
    "13" { CreateStage13 }
    "14" { CreateStage14 }
    default {
        Write-Host "❌ Unknown stage: $Stage" -ForegroundColor Red
        Write-Host "Available: 0, 1, 2, 3, 4, 5, 6, 6b, 6c, 7, 8, 9, 91, 92, 93, 94, 95, 10, 11, 12, 13, 14" -ForegroundColor Yellow
    }
}