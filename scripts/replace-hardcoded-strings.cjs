const fs = require('fs');
const path = require('path');

// Карта замен для каждого файла
const replacements = {
    'popup/fill-panel.js': {
        imports: [
            "import { POPUP } from '../labels/popup-labels.js';",
            "import { COMMON } from '../labels/common-labels.js';"
        ],
        replaces: [
            { find: /['"`]Заполнить все поля['"`]/g, replace: 'POPUP.BUTTON_FILL_ALL' },
            { find: /['"`]Спецвставка['"`]/g, replace: 'POPUP.BUTTON_FILL_SPECIAL' },
            { find: /['"`]Открыть настройки['"`]/g, replace: 'POPUP.BUTTON_OPEN_OPTIONS' },
            { find: /['"`]Активных правил:['"`]/g, replace: 'POPUP.STATUS_ACTIVE_RULES' },
            { find: /['"`]Нет активных правил['"`]/g, replace: 'POPUP.STATUS_NO_ACTIVE_RULES' },
            { find: /['"`]Заполнено:['"`]/g, replace: 'POPUP.RESULT_FILLED' },
            { find: /['"`]Найдено:['"`]/g, replace: 'POPUP.RESULT_MATCHED' },
            { find: /['"`]Ошибки:['"`]/g, replace: 'POPUP.RESULT_ERRORS' },
            { find: /['"`]Нет результатов['"`]/g, replace: 'POPUP.RESULT_NO_RESULTS' },
            { find: /['"`]Заполнение\.\.\.['"`]/g, replace: 'POPUP.STATUS_FILLING' },
            { find: /['"`]Готово!['"`]/g, replace: 'POPUP.STATUS_DONE' },
        ]
    },
    'popup/scraper-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: /['"`]Сканировать страницу['"`]/g, replace: 'POPUP.SCRAPER_BUTTON_SCAN' },
            { find: /['"`]Нет данных для отображения['"`]/g, replace: 'POPUP.SCRAPER_NO_DATA' },
        ]
    },
    'popup/copyfx-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: /['"`]Трейдеров:['"`]/g, replace: 'POPUP.COPYFX_TRADERS' },
            { find: /['"`]Обновить['"`]/g, replace: 'POPUP.COPYFX_REFRESH' },
            { find: /['"`]Нет данных CopyFX['"`]/g, replace: 'POPUP.COPYFX_NO_DATA' },
        ]
    },
    'popup/investor-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: /['"`]Инвесторы:['"`]/g, replace: 'POPUP.INVESTORS_LIST' },
            { find: /['"`]Нет данных об инвесторах['"`]/g, replace: 'POPUP.INVESTORS_NO_DATA' },
        ]
    },
    'popup/ua-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: /['"`]Подменить User-Agent['"`]/g, replace: 'POPUP.UA_TOGGLE_LABEL' },
            { find: /['"`]Нет правил для подмены UA['"`]/g, replace: 'POPUP.UA_NO_RULES' },
        ]
    },
    'background/background-app.js': {
        imports: ["import { BACKGROUND } from '../labels/background-labels.js';"],
        replaces: [
            { find: /['"`]🟢 Background service worker started['"`]/g, replace: 'BACKGROUND.STARTUP' },
            { find: /['"`]📁 State initialized['"`]/g, replace: 'BACKGROUND.STATE_INIT' },
            { find: /['"`]Неизвестный тип сообщения:['"`]/g, replace: 'BACKGROUND.MSG_UNKNOWN_TYPE' },
            { find: /['"`]Нет активной вкладки['"`]/g, replace: 'BACKGROUND.COPYFX_NO_ACTIVE_TAB' },
            { find: /['"`]Нет данных о трейдерах['"`]/g, replace: 'BACKGROUND.COPYFX_NO_TRADERS_DATA' },
            { find: /['"`]Нет данных об инвесторах['"`]/g, replace: 'BACKGROUND.COPYFX_NO_INVESTORS_DATA' },
        ]
    },
    'content/content.js': {
        imports: ["import { CONTENT } from '../labels/content-labels.js';"],
        replaces: [
            { find: /['"`]🟢 Dumb Patrick Inputs: content script loaded['"`]/g, replace: 'CONTENT.CONSOLE_START' },
            { find: /['"`]📝 Начинаем заполнение\.\.\.['"`]/g, replace: 'CONTENT.CONSOLE_FILL_START' },
            { find: /['"`]✅ Заполнение завершено['"`]/g, replace: 'CONTENT.CONSOLE_FILL_DONE' },
            { find: /['"`]❌ Ошибка заполнения:['"`]/g, replace: 'CONTENT.CONSOLE_FILL_ERROR' },
            { find: /['"`]🎯 Спецвставка\.\.\.['"`]/g, replace: 'CONTENT.CONSOLE_SPECIAL_START' },
            { find: /['"`]✅ Спецвставка завершена['"`]/g, replace: 'CONTENT.CONSOLE_SPECIAL_DONE' },
            { find: /['"`]Заполняем поля\.\.\.['"`]/g, replace: 'CONTENT.NOTIFICATION_FILLING' },
            { find: /['"`]✅ Готово!['"`]/g, replace: 'CONTENT.NOTIFICATION_DONE' },
            { find: /['"`]❌ Ошибка['"`]/g, replace: 'CONTENT.NOTIFICATION_ERROR' },
            { find: /['"`]Наведите на элемент и кликните для выбора['"`]/g, replace: 'CONTENT.PICKER_INSTRUCTION' },
            { find: /['"`]❌ Выбор отменён['"`]/g, replace: 'CONTENT.PICKER_CANCELLED' },
            { find: /['"`]Найдено полей:['"`]/g, replace: 'CONTENT.STATUS_FOUND' },
            { find: /['"`]Заполнено полей:['"`]/g, replace: 'CONTENT.STATUS_FILLED' },
            { find: /['"`]Пропущено:['"`]/g, replace: 'CONTENT.STATUS_SKIPPED' },
        ]
    },
    'options/options-bootstrap.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Настройки Dumb Patrick Inputs['"`]/g, replace: 'OPTIONS.TITLE' },
            { find: /['"`]Управление правилами заполнения форм['"`]/g, replace: 'OPTIONS.SUBTITLE' },
        ]
    },
    'options/controllers/rules-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Правила заполнения['"`]/g, replace: 'OPTIONS.RULES_TITLE' },
            { find: /['"`]\+ Добавить правило['"`]/g, replace: 'OPTIONS.RULES_ADD_BUTTON' },
            { find: /['"`]Нет правил\. Создайте первое правило!['"`]/g, replace: 'OPTIONS.RULES_NO_RULES' },
            { find: /['"`]Название правила['"`]/g, replace: 'OPTIONS.RULES_NAME' },
            { find: /['"`]Шаблон['"`]/g, replace: 'OPTIONS.RULES_TEMPLATE' },
            { find: /['"`]Условия['"`]/g, replace: 'OPTIONS.RULES_CONDITIONS' },
            { find: /['"`]URL условия['"`]/g, replace: 'OPTIONS.RULES_URL_CONDITIONS' },
            { find: /['"`]Удалить правило?['"`]/g, replace: 'OPTIONS.RULES_DELETE_CONFIRM' },
        ]
    },
    'options/controllers/folders-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Папки['"`]/g, replace: 'OPTIONS.FOLDERS_TITLE' },
            { find: /['"`]\+ Добавить папку['"`]/g, replace: 'OPTIONS.FOLDERS_ADD_BUTTON' },
            { find: /['"`]Нет папок['"`]/g, replace: 'OPTIONS.FOLDERS_NO_FOLDERS' },
            { find: /['"`]Название папки['"`]/g, replace: 'OPTIONS.FOLDERS_NAME' },
            { find: /['"`]Правила в папке['"`]/g, replace: 'OPTIONS.FOLDERS_RULES' },
        ]
    },
    'options/controllers/special-insertions-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Спецвставки['"`]/g, replace: 'OPTIONS.INSERTIONS_TITLE' },
            { find: /['"`]\+ Добавить спецвставку['"`]/g, replace: 'OPTIONS.INSERTIONS_ADD_BUTTON' },
            { find: /['"`]Нет спецвставок['"`]/g, replace: 'OPTIONS.INSERTIONS_NO_INSERTIONS' },
            { find: /['"`]Название вставки['"`]/g, replace: 'OPTIONS.INSERTIONS_NAME' },
            { find: /['"`]Шаги вставки['"`]/g, replace: 'OPTIONS.INSERTIONS_STEPS' },
            { find: /['"`]Селектор['"`]/g, replace: 'OPTIONS.INSERTIONS_SELECTOR' },
            { find: /['"`]Значение['"`]/g, replace: 'OPTIONS.INSERTIONS_VALUE' },
            { find: /['"`]Задержка \(мс\)['"`]/g, replace: 'OPTIONS.INSERTIONS_DELAY' },
        ]
    },
    'options/controllers/smart-counters-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Смарт-счётчики['"`]/g, replace: 'OPTIONS.COUNTERS_TITLE' },
            { find: /['"`]\+ Добавить счётчик['"`]/g, replace: 'OPTIONS.COUNTERS_ADD_BUTTON' },
            { find: /['"`]Нет счётчиков['"`]/g, replace: 'OPTIONS.COUNTERS_NO_COUNTERS' },
            { find: /['"`]Название счётчика['"`]/g, replace: 'OPTIONS.COUNTERS_NAME' },
            { find: /['"`]Текущее значение['"`]/g, replace: 'OPTIONS.COUNTERS_CURRENT' },
            { find: /['"`]История['"`]/g, replace: 'OPTIONS.COUNTERS_HISTORY' },
        ]
    },
    'options/controllers/snapshots-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Снапшоты состояния['"`]/g, replace: 'OPTIONS.SNAPSHOTS_TITLE' },
            { find: /['"`]\+ Создать снапшот['"`]/g, replace: 'OPTIONS.SNAPSHOTS_ADD_BUTTON' },
            { find: /['"`]Нет снапшотов['"`]/g, replace: 'OPTIONS.SNAPSHOTS_NO_SNAPSHOTS' },
            { find: /['"`]Название снапшота['"`]/g, replace: 'OPTIONS.SNAPSHOTS_NAME' },
            { find: /['"`]Дата создания['"`]/g, replace: 'OPTIONS.SNAPSHOTS_DATE' },
            { find: /['"`]Восстановить['"`]/g, replace: 'OPTIONS.SNAPSHOTS_RESTORE' },
            { find: /['"`]Восстановить это состояние?['"`]/g, replace: 'OPTIONS.SNAPSHOTS_RESTORE_CONFIRM' },
        ]
    },
    'options/controllers/word-lists-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Списки слов['"`]/g, replace: 'OPTIONS.WORDLISTS_TITLE' },
            { find: /['"`]\+ Добавить список['"`]/g, replace: 'OPTIONS.WORDLISTS_ADD_BUTTON' },
            { find: /['"`]Нет списков['"`]/g, replace: 'OPTIONS.WORDLISTS_NO_LISTS' },
            { find: /['"`]Название списка['"`]/g, replace: 'OPTIONS.WORDLISTS_NAME' },
            { find: /['"`]Слова \(через запятую или с новой строки\)['"`]/g, replace: 'OPTIONS.WORDLISTS_WORDS' },
        ]
    },
    'options/controllers/scraper-config-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Настройки скрапера['"`]/g, replace: 'OPTIONS.SCRAPER_TITLE' },
            { find: /['"`]Включить скрапер['"`]/g, replace: 'OPTIONS.SCRAPER_ENABLED' },
            { find: /['"`]URL паттерны \(по одному на строку\)['"`]/g, replace: 'OPTIONS.SCRAPER_URL_PATTERNS' },
        ]
    },
    'options/controllers/copyfx-config-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Настройки CopyFX['"`]/g, replace: 'OPTIONS.COPYFX_TITLE' },
            { find: /['"`]Включить CopyFX['"`]/g, replace: 'OPTIONS.COPYFX_ENABLED' },
            { find: /['"`]Административный домен['"`]/g, replace: 'OPTIONS.COPYFX_ADMIN_DOMAIN' },
        ]
    },
    'options/controllers/ua-rules-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Правила подмены User-Agent['"`]/g, replace: 'OPTIONS.UA_TITLE' },
            { find: /['"`]\+ Добавить правило['"`]/g, replace: 'OPTIONS.UA_ADD_BUTTON' },
            { find: /['"`]Нет правил UA['"`]/g, replace: 'OPTIONS.UA_NO_RULES' },
            { find: /['"`]User-Agent['"`]/g, replace: 'OPTIONS.UA_USER_AGENT' },
            { find: /['"`]URL паттерн['"`]/g, replace: 'OPTIONS.UA_URL_PATTERN' },
            { find: /['"`]Включено['"`]/g, replace: 'OPTIONS.UA_ENABLED' },
        ]
    },
    'options/controllers/import-export-controller.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: /['"`]Импорт и экспорт настроек['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_TITLE' },
            { find: /['"`]Экспортировать настройки['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_EXPORT_BUTTON' },
            { find: /['"`]Импортировать настройки['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_IMPORT_BUTTON' },
            { find: /['"`]Выберите JSON-файл['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_SELECT_FILE' },
            { find: /['"`]Настройки успешно импортированы['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_SUCCESS' },
            { find: /['"`]Ошибка импорта['"`]/g, replace: 'OPTIONS.IMPORT_EXPORT_ERROR' },
        ]
    }
};

function addImports(content, imports) {
    const importRegex = /^import .*?;$/gm;
    const matches = content.match(importRegex);

    if (matches && matches.length > 0) {
        const lastImport = matches[matches.length - 1];
        const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
        return content.substring(0, lastImportIndex) + '\n' + imports.join('\n') + content.substring(lastImportIndex);
    } else {
        return imports.join('\n') + '\n' + content;
    }
}

function applyReplacements(content, replaces) {
    let newContent = content;
    for (const rep of replaces) {
        newContent = newContent.replace(rep.find, rep.replace);
    }
    return newContent;
}

const rootDir = path.resolve(__dirname, '..');

for (const [filePath, config] of Object.entries(replacements)) {
    const fullPath = path.join(rootDir, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const hasImports = config.imports.some(imp => content.includes(imp));

    if (!hasImports) {
        content = addImports(content, config.imports);
    }

    content = applyReplacements(content, config.replaces);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
}

console.log('🎉 All replacements completed!');