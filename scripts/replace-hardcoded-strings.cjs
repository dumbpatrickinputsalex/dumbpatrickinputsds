const fs = require('fs');
const path = require('path');

// Экранирование спецсимволов для RegExp
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Рекурсивный обход папки для поиска всех JS-файлов
function getAllJsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllJsFiles(fullPath, fileList);
        } else if (file.endsWith('.js')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

// Функция для добавления импортов
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

// Функция для применения замен (безопасная)
function applyReplacements(content, replaces) {
    let newContent = content;
    for (const rep of replaces) {
        const escapedFind = escapeRegExp(rep.find);
        newContent = newContent.replace(new RegExp(escapedFind, 'g'), rep.replace);
    }
    return newContent;
}

// Карта замен: файл -> { imports: [...], replaces: [{ find: 'строка', replace: 'константа' }] }
const replacementsMap = {
    // POPUP
    'popup/fill-panel.js': {
        imports: [
            "import { POPUP } from '../labels/popup-labels.js';",
            "import { COMMON } from '../labels/common-labels.js';"
        ],
        replaces: [
            { find: 'Заполнить все поля', replace: 'POPUP.BUTTON_FILL_ALL' },
            { find: 'Спецвставка', replace: 'POPUP.BUTTON_FILL_SPECIAL' },
            { find: 'Открыть настройки', replace: 'POPUP.BUTTON_OPEN_OPTIONS' },
            { find: 'Активных правил:', replace: 'POPUP.STATUS_ACTIVE_RULES' },
            { find: 'Нет активных правил', replace: 'POPUP.STATUS_NO_ACTIVE_RULES' },
            { find: 'Заполнение...', replace: 'POPUP.STATUS_FILLING' },
            { find: 'Готово!', replace: 'POPUP.STATUS_DONE' },
            { find: 'Заполнено:', replace: 'POPUP.RESULT_FILLED' },
            { find: 'Найдено:', replace: 'POPUP.RESULT_MATCHED' },
            { find: 'Ошибки:', replace: 'POPUP.RESULT_ERRORS' },
            { find: 'Нет результатов', replace: 'POPUP.RESULT_NO_RESULTS' },
        ]
    },
    'popup/scraper-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: 'Сканировать страницу', replace: 'POPUP.SCRAPER_BUTTON_SCAN' },
            { find: 'Нет данных для отображения', replace: 'POPUP.SCRAPER_NO_DATA' },
        ]
    },
    'popup/copyfx-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: 'Трейдеров:', replace: 'POPUP.COPYFX_TRADERS' },
            { find: 'Обновить', replace: 'POPUP.COPYFX_REFRESH' },
            { find: 'Нет данных CopyFX', replace: 'POPUP.COPYFX_NO_DATA' },
        ]
    },
    'popup/investor-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: 'Инвесторы:', replace: 'POPUP.INVESTORS_LIST' },
            { find: 'Нет данных об инвесторах', replace: 'POPUP.INVESTORS_NO_DATA' },
        ]
    },
    'popup/ua-panel.js': {
        imports: ["import { POPUP } from '../labels/popup-labels.js';"],
        replaces: [
            { find: 'Подменить User-Agent', replace: 'POPUP.UA_TOGGLE_LABEL' },
            { find: 'Нет правил для подмены UA', replace: 'POPUP.UA_NO_RULES' },
        ]
    },

    // BACKGROUND
    'background/background-app.js': {
        imports: ["import { BACKGROUND } from '../labels/background-labels.js';"],
        replaces: [
            { find: '🟢 Background service worker started', replace: 'BACKGROUND.STARTUP' },
            { find: '📁 State initialized', replace: 'BACKGROUND.STATE_INIT' },
            { find: '📦 State migrated from old version', replace: 'BACKGROUND.STATE_MIGRATED' },
            { find: 'Неизвестный тип сообщения:', replace: 'BACKGROUND.MSG_UNKNOWN_TYPE' },
            { find: 'Нет активной вкладки', replace: 'BACKGROUND.COPYFX_NO_ACTIVE_TAB' },
            { find: 'Нет данных о трейдерах', replace: 'BACKGROUND.COPYFX_NO_TRADERS_DATA' },
            { find: 'Нет данных об инвесторах', replace: 'BACKGROUND.COPYFX_NO_INVESTORS_DATA' },
        ]
    },

    // CONTENT
    'content/content.js': {
        imports: ["import { CONTENT } from '../labels/content-labels.js';"],
        replaces: [
            { find: '🟢 Dumb Patrick Inputs: content script loaded', replace: 'CONTENT.CONSOLE_START' },
            { find: '📝 Начинаем заполнение...', replace: 'CONTENT.CONSOLE_FILL_START' },
            { find: '✅ Заполнение завершено', replace: 'CONTENT.CONSOLE_FILL_DONE' },
            { find: '❌ Ошибка заполнения:', replace: 'CONTENT.CONSOLE_FILL_ERROR' },
            { find: '🎯 Спецвставка...', replace: 'CONTENT.CONSOLE_SPECIAL_START' },
            { find: '✅ Спецвставка завершена', replace: 'CONTENT.CONSOLE_SPECIAL_DONE' },
            { find: 'Заполняем поля...', replace: 'CONTENT.NOTIFICATION_FILLING' },
            { find: '✅ Готово!', replace: 'CONTENT.NOTIFICATION_DONE' },
            { find: '❌ Ошибка', replace: 'CONTENT.NOTIFICATION_ERROR' },
            { find: 'Наведите на элемент и кликните для выбора', replace: 'CONTENT.PICKER_INSTRUCTION' },
            { find: '❌ Выбор отменён', replace: 'CONTENT.PICKER_CANCELLED' },
            { find: 'Найдено полей:', replace: 'CONTENT.STATUS_FOUND' },
            { find: 'Заполнено полей:', replace: 'CONTENT.STATUS_FILLED' },
            { find: 'Пропущено:', replace: 'CONTENT.STATUS_SKIPPED' },
        ]
    },

    // OPTIONS bootstrap
    'options/options-bootstrap.js': {
        imports: ["import { OPTIONS } from '../labels/options-labels.js';"],
        replaces: [
            { find: 'Настройки Dumb Patrick Inputs', replace: 'OPTIONS.TITLE' },
            { find: 'Управление правилами заполнения форм', replace: 'OPTIONS.SUBTITLE' },
        ]
    },
};

// Добавляем все файлы из options/controllers/
const controllersDir = path.join(__dirname, '..', 'options', 'controllers');
if (fs.existsSync(controllersDir)) {
    const controllerFiles = fs.readdirSync(controllersDir);
    for (const file of controllerFiles) {
        if (file.endsWith('.js')) {
            const filePath = `options/controllers/${file}`;
            const fileName = path.basename(file, '.js');

            let replaces = [];
            let imports = ["import { OPTIONS } from '../labels/options-labels.js';"];

            const controllerMappings = {
                'rules-controller': {
                    replaces: [
                        { find: 'Правила заполнения', replace: 'OPTIONS.RULES_TITLE' },
                        { find: '+ Добавить правило', replace: 'OPTIONS.RULES_ADD_BUTTON' },
                        { find: 'Нет правил. Создайте первое правило!', replace: 'OPTIONS.RULES_NO_RULES' },
                        { find: 'Название правила', replace: 'OPTIONS.RULES_NAME' },
                        { find: 'Шаблон', replace: 'OPTIONS.RULES_TEMPLATE' },
                        { find: 'Условия', replace: 'OPTIONS.RULES_CONDITIONS' },
                        { find: 'URL условия', replace: 'OPTIONS.RULES_URL_CONDITIONS' },
                        { find: 'Удалить правило?', replace: 'OPTIONS.RULES_DELETE_CONFIRM' },
                    ]
                },
                'folders-controller': {
                    replaces: [
                        { find: 'Папки', replace: 'OPTIONS.FOLDERS_TITLE' },
                        { find: '+ Добавить папку', replace: 'OPTIONS.FOLDERS_ADD_BUTTON' },
                        { find: 'Нет папок', replace: 'OPTIONS.FOLDERS_NO_FOLDERS' },
                        { find: 'Название папки', replace: 'OPTIONS.FOLDERS_NAME' },
                        { find: 'Правила в папке', replace: 'OPTIONS.FOLDERS_RULES' },
                    ]
                },
                'special-insertions-controller': {
                    replaces: [
                        { find: 'Спецвставки', replace: 'OPTIONS.INSERTIONS_TITLE' },
                        { find: '+ Добавить спецвставку', replace: 'OPTIONS.INSERTIONS_ADD_BUTTON' },
                        { find: 'Нет спецвставок', replace: 'OPTIONS.INSERTIONS_NO_INSERTIONS' },
                        { find: 'Название вставки', replace: 'OPTIONS.INSERTIONS_NAME' },
                        { find: 'Шаги вставки', replace: 'OPTIONS.INSERTIONS_STEPS' },
                        { find: 'Селектор', replace: 'OPTIONS.INSERTIONS_SELECTOR' },
                        { find: 'Значение', replace: 'OPTIONS.INSERTIONS_VALUE' },
                        { find: 'Задержка (мс)', replace: 'OPTIONS.INSERTIONS_DELAY' },
                    ]
                },
                'smart-counters-controller': {
                    replaces: [
                        { find: 'Смарт-счётчики', replace: 'OPTIONS.COUNTERS_TITLE' },
                        { find: '+ Добавить счётчик', replace: 'OPTIONS.COUNTERS_ADD_BUTTON' },
                        { find: 'Нет счётчиков', replace: 'OPTIONS.COUNTERS_NO_COUNTERS' },
                        { find: 'Название счётчика', replace: 'OPTIONS.COUNTERS_NAME' },
                        { find: 'Текущее значение', replace: 'OPTIONS.COUNTERS_CURRENT' },
                        { find: 'История', replace: 'OPTIONS.COUNTERS_HISTORY' },
                    ]
                },
                'snapshots-controller': {
                    replaces: [
                        { find: 'Снапшоты состояния', replace: 'OPTIONS.SNAPSHOTS_TITLE' },
                        { find: '+ Создать снапшот', replace: 'OPTIONS.SNAPSHOTS_ADD_BUTTON' },
                        { find: 'Нет снапшотов', replace: 'OPTIONS.SNAPSHOTS_NO_SNAPSHOTS' },
                        { find: 'Название снапшота', replace: 'OPTIONS.SNAPSHOTS_NAME' },
                        { find: 'Дата создания', replace: 'OPTIONS.SNAPSHOTS_DATE' },
                        { find: 'Восстановить', replace: 'OPTIONS.SNAPSHOTS_RESTORE' },
                        { find: 'Восстановить это состояние?', replace: 'OPTIONS.SNAPSHOTS_RESTORE_CONFIRM' },
                    ]
                },
                'word-lists-controller': {
                    replaces: [
                        { find: 'Списки слов', replace: 'OPTIONS.WORDLISTS_TITLE' },
                        { find: '+ Добавить список', replace: 'OPTIONS.WORDLISTS_ADD_BUTTON' },
                        { find: 'Нет списков', replace: 'OPTIONS.WORDLISTS_NO_LISTS' },
                        { find: 'Название списка', replace: 'OPTIONS.WORDLISTS_NAME' },
                        { find: 'Слова (через запятую или с новой строки)', replace: 'OPTIONS.WORDLISTS_WORDS' },
                    ]
                },
                'scraper-config-controller': {
                    replaces: [
                        { find: 'Настройки скрапера', replace: 'OPTIONS.SCRAPER_TITLE' },
                        { find: 'Включить скрапер', replace: 'OPTIONS.SCRAPER_ENABLED' },
                        { find: 'URL паттерны (по одному на строку)', replace: 'OPTIONS.SCRAPER_URL_PATTERNS' },
                    ]
                },
                'copyfx-config-controller': {
                    replaces: [
                        { find: 'Настройки CopyFX', replace: 'OPTIONS.COPYFX_TITLE' },
                        { find: 'Включить CopyFX', replace: 'OPTIONS.COPYFX_ENABLED' },
                        { find: 'Административный домен', replace: 'OPTIONS.COPYFX_ADMIN_DOMAIN' },
                    ]
                },
                'ua-rules-controller': {
                    replaces: [
                        { find: 'Правила подмены User-Agent', replace: 'OPTIONS.UA_TITLE' },
                        { find: '+ Добавить правило', replace: 'OPTIONS.UA_ADD_BUTTON' },
                        { find: 'Нет правил UA', replace: 'OPTIONS.UA_NO_RULES' },
                        { find: 'User-Agent', replace: 'OPTIONS.UA_USER_AGENT' },
                        { find: 'URL паттерн', replace: 'OPTIONS.UA_URL_PATTERN' },
                        { find: 'Включено', replace: 'OPTIONS.UA_ENABLED' },
                    ]
                },
                'import-export-controller': {
                    replaces: [
                        { find: 'Импорт и экспорт настроек', replace: 'OPTIONS.IMPORT_EXPORT_TITLE' },
                        { find: 'Экспортировать настройки', replace: 'OPTIONS.IMPORT_EXPORT_EXPORT_BUTTON' },
                        { find: 'Импортировать настройки', replace: 'OPTIONS.IMPORT_EXPORT_IMPORT_BUTTON' },
                        { find: 'Выберите JSON-файл', replace: 'OPTIONS.IMPORT_EXPORT_SELECT_FILE' },
                        { find: 'Настройки успешно импортированы', replace: 'OPTIONS.IMPORT_EXPORT_SUCCESS' },
                        { find: 'Ошибка импорта', replace: 'OPTIONS.IMPORT_EXPORT_ERROR' },
                    ]
                }
            };

            if (controllerMappings[fileName]) {
                replaces = controllerMappings[fileName].replaces;
            }

            if (replaces.length > 0) {
                replacementsMap[filePath] = { imports, replaces };
            }
        }
    }
}

// Основной цикл
const rootDir = path.resolve(__dirname, '..');
let totalUpdated = 0;

for (const [filePath, config] of Object.entries(replacementsMap)) {
    const fullPath = path.join(rootDir, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // Проверяем импорты
    const hasImports = config.imports.some(imp => content.includes(imp));
    if (!hasImports) {
        content = addImports(content, config.imports);
        changed = true;
    }

    // Проверяем замены
    const newContent = applyReplacements(content, config.replaces);
    if (newContent !== content) {
        content = newContent;
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        totalUpdated++;
    } else {
        console.log(`⏭️ No changes: ${filePath}`);
    }
}

console.log(`\n🎉 All replacements completed! Updated ${totalUpdated} files.`);