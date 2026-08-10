const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Все замены в одном месте
const allReplacements = [
    // POPUP
    { file: 'popup/fill-panel.js', find: "'Открыть настройки'", replace: 'POPUP.BUTTON_OPEN_OPTIONS' },
    { file: 'popup/fill-panel.js', find: '"Открыть настройки"', replace: 'POPUP.BUTTON_OPEN_OPTIONS' },
    { file: 'popup/fill-panel.js', find: "'Активных правил:'", replace: 'POPUP.STATUS_ACTIVE_RULES' },
    { file: 'popup/fill-panel.js', find: '"Активных правил:"', replace: 'POPUP.STATUS_ACTIVE_RULES' },
    { file: 'popup/fill-panel.js', find: "'Нет активных правил'", replace: 'POPUP.STATUS_NO_ACTIVE_RULES' },
    { file: 'popup/fill-panel.js', find: '"Нет активных правил"', replace: 'POPUP.STATUS_NO_ACTIVE_RULES' },
    { file: 'popup/fill-panel.js', find: "'Заполнено:'", replace: 'POPUP.RESULT_FILLED' },
    { file: 'popup/fill-panel.js', find: '"Заполнено:"', replace: 'POPUP.RESULT_FILLED' },
    { file: 'popup/fill-panel.js', find: "'Найдено:'", replace: 'POPUP.RESULT_MATCHED' },
    { file: 'popup/fill-panel.js', find: '"Найдено:"', replace: 'POPUP.RESULT_MATCHED' },
    { file: 'popup/fill-panel.js', find: "'Ошибки:'", replace: 'POPUP.RESULT_ERRORS' },
    { file: 'popup/fill-panel.js', find: '"Ошибки:"', replace: 'POPUP.RESULT_ERRORS' },
    { file: 'popup/fill-panel.js', find: "'Заполнение...'", replace: 'POPUP.STATUS_FILLING' },
    { file: 'popup/fill-panel.js', find: '"Заполнение..."', replace: 'POPUP.STATUS_FILLING' },
    { file: 'popup/fill-panel.js', find: "'Готово!'", replace: 'POPUP.STATUS_DONE' },
    { file: 'popup/fill-panel.js', find: '"Готово!"', replace: 'POPUP.STATUS_DONE' },

    // UA Panel
    { file: 'popup/ua-panel.js', find: "'Подменить User-Agent'", replace: 'POPUP.UA_TOGGLE_LABEL' },
    { file: 'popup/ua-panel.js', find: '"Подменить User-Agent"', replace: 'POPUP.UA_TOGGLE_LABEL' },

    // BACKGROUND
    { file: 'background/background-app.js', find: "'🟢 Background service worker started'", replace: 'BACKGROUND.STARTUP' },
    { file: 'background/background-app.js', find: '"🟢 Background service worker started"', replace: 'BACKGROUND.STARTUP' },
    { file: 'background/background-app.js', find: "'📁 State initialized'", replace: 'BACKGROUND.STATE_INIT' },
    { file: 'background/background-app.js', find: '"📁 State initialized"', replace: 'BACKGROUND.STATE_INIT' },

    // CONTENT
    { file: 'content/content.js', find: "'🟢 Dumb Patrick Inputs: content script loaded'", replace: 'CONTENT.CONSOLE_START' },
    { file: 'content/content.js', find: '"🟢 Dumb Patrick Inputs: content script loaded"', replace: 'CONTENT.CONSOLE_START' },
    { file: 'content/content.js', find: "'📝 Начинаем заполнение...'", replace: 'CONTENT.CONSOLE_FILL_START' },
    { file: 'content/content.js', find: '"📝 Начинаем заполнение..."', replace: 'CONTENT.CONSOLE_FILL_START' },
    { file: 'content/content.js', find: "'Заполняем поля...'", replace: 'CONTENT.NOTIFICATION_FILLING' },
    { file: 'content/content.js', find: '"Заполняем поля..."', replace: 'CONTENT.NOTIFICATION_FILLING' },

    // OPTIONS CONTROLLERS
    { file: 'options/controllers/rules-controller.js', find: "'Правила заполнения'", replace: 'OPTIONS.RULES_TITLE' },
    { file: 'options/controllers/rules-controller.js', find: '"Правила заполнения"', replace: 'OPTIONS.RULES_TITLE' },
    { file: 'options/controllers/rules-controller.js', find: "'+ Добавить правило'", replace: 'OPTIONS.RULES_ADD_BUTTON' },
    { file: 'options/controllers/rules-controller.js', find: '"+ Добавить правило"', replace: 'OPTIONS.RULES_ADD_BUTTON' },
    { file: 'options/controllers/rules-controller.js', find: "'Нет правил. Создайте первое правило!'", replace: 'OPTIONS.RULES_NO_RULES' },
    { file: 'options/controllers/rules-controller.js', find: '"Нет правил. Создайте первое правило!"', replace: 'OPTIONS.RULES_NO_RULES' },
    { file: 'options/controllers/rules-controller.js', find: "'Название правила'", replace: 'OPTIONS.RULES_NAME' },
    { file: 'options/controllers/rules-controller.js', find: '"Название правила"', replace: 'OPTIONS.RULES_NAME' },
    { file: 'options/controllers/rules-controller.js', find: "'Шаблон'", replace: 'OPTIONS.RULES_TEMPLATE' },
    { file: 'options/controllers/rules-controller.js', find: '"Шаблон"', replace: 'OPTIONS.RULES_TEMPLATE' },
    { file: 'options/controllers/rules-controller.js', find: "'Условия'", replace: 'OPTIONS.RULES_CONDITIONS' },
    { file: 'options/controllers/rules-controller.js', find: '"Условия"', replace: 'OPTIONS.RULES_CONDITIONS' },
    { file: 'options/controllers/rules-controller.js', find: "'URL условия'", replace: 'OPTIONS.RULES_URL_CONDITIONS' },
    { file: 'options/controllers/rules-controller.js', find: '"URL условия"', replace: 'OPTIONS.RULES_URL_CONDITIONS' },

    // Folders
    { file: 'options/controllers/folders-controller.js', find: "'Папки'", replace: 'OPTIONS.FOLDERS_TITLE' },
    { file: 'options/controllers/folders-controller.js', find: '"Папки"', replace: 'OPTIONS.FOLDERS_TITLE' },
    { file: 'options/controllers/folders-controller.js', find: "'+ Добавить папку'", replace: 'OPTIONS.FOLDERS_ADD_BUTTON' },
    { file: 'options/controllers/folders-controller.js', find: '"+ Добавить папку"', replace: 'OPTIONS.FOLDERS_ADD_BUTTON' },
    { file: 'options/controllers/folders-controller.js', find: "'Нет папок'", replace: 'OPTIONS.FOLDERS_NO_FOLDERS' },
    { file: 'options/controllers/folders-controller.js', find: '"Нет папок"', replace: 'OPTIONS.FOLDERS_NO_FOLDERS' },

    // Special Insertions
    { file: 'options/controllers/special-insertions-controller.js', find: "'Спецвставки'", replace: 'OPTIONS.INSERTIONS_TITLE' },
    { file: 'options/controllers/special-insertions-controller.js', find: '"Спецвставки"', replace: 'OPTIONS.INSERTIONS_TITLE' },
    { file: 'options/controllers/special-insertions-controller.js', find: "'+ Добавить спецвставку'", replace: 'OPTIONS.INSERTIONS_ADD_BUTTON' },
    { file: 'options/controllers/special-insertions-controller.js', find: '"+ Добавить спецвставку"', replace: 'OPTIONS.INSERTIONS_ADD_BUTTON' },

    // Smart Counters
    { file: 'options/controllers/smart-counters-controller.js', find: "'Смарт-счётчики'", replace: 'OPTIONS.COUNTERS_TITLE' },
    { file: 'options/controllers/smart-counters-controller.js', find: '"Смарт-счётчики"', replace: 'OPTIONS.COUNTERS_TITLE' },
    { file: 'options/controllers/smart-counters-controller.js', find: "'+ Добавить счётчик'", replace: 'OPTIONS.COUNTERS_ADD_BUTTON' },
    { file: 'options/controllers/smart-counters-controller.js', find: '"+ Добавить счётчик"', replace: 'OPTIONS.COUNTERS_ADD_BUTTON' },

    // Snapshots
    { file: 'options/controllers/snapshots-controller.js', find: "'Снапшоты состояния'", replace: 'OPTIONS.SNAPSHOTS_TITLE' },
    { file: 'options/controllers/snapshots-controller.js', find: '"Снапшоты состояния"', replace: 'OPTIONS.SNAPSHOTS_TITLE' },
    { file: 'options/controllers/snapshots-controller.js', find: "'+ Создать снапшот'", replace: 'OPTIONS.SNAPSHOTS_ADD_BUTTON' },
    { file: 'options/controllers/snapshots-controller.js', find: '"+ Создать снапшот"', replace: 'OPTIONS.SNAPSHOTS_ADD_BUTTON' },

    // Word Lists
    { file: 'options/controllers/word-lists-controller.js', find: "'Списки слов'", replace: 'OPTIONS.WORDLISTS_TITLE' },
    { file: 'options/controllers/word-lists-controller.js', find: '"Списки слов"', replace: 'OPTIONS.WORDLISTS_TITLE' },
    { file: 'options/controllers/word-lists-controller.js', find: "'+ Добавить список'", replace: 'OPTIONS.WORDLISTS_ADD_BUTTON' },
    { file: 'options/controllers/word-lists-controller.js', find: '"+ Добавить список"', replace: 'OPTIONS.WORDLISTS_ADD_BUTTON' },

    // UA Rules
    { file: 'options/controllers/ua-rules-controller.js', find: "'Правила подмены User-Agent'", replace: 'OPTIONS.UA_TITLE' },
    { file: 'options/controllers/ua-rules-controller.js', find: '"Правила подмены User-Agent"', replace: 'OPTIONS.UA_TITLE' },
    { file: 'options/controllers/ua-rules-controller.js', find: "'+ Добавить правило'", replace: 'OPTIONS.UA_ADD_BUTTON' },
    { file: 'options/controllers/ua-rules-controller.js', find: '"+ Добавить правило"', replace: 'OPTIONS.UA_ADD_BUTTON' },
    { file: 'options/controllers/ua-rules-controller.js', find: "'User-Agent'", replace: 'OPTIONS.UA_USER_AGENT' },
    { file: 'options/controllers/ua-rules-controller.js', find: '"User-Agent"', replace: 'OPTIONS.UA_USER_AGENT' },

    // Import/Export
    { file: 'options/controllers/import-export-controller.js', find: "'Импорт и экспорт настроек'", replace: 'OPTIONS.IMPORT_EXPORT_TITLE' },
    { file: 'options/controllers/import-export-controller.js', find: '"Импорт и экспорт настроек"', replace: 'OPTIONS.IMPORT_EXPORT_TITLE' },
    { file: 'options/controllers/import-export-controller.js', find: "'Экспортировать настройки'", replace: 'OPTIONS.IMPORT_EXPORT_EXPORT_BUTTON' },
    { file: 'options/controllers/import-export-controller.js', find: '"Экспортировать настройки"', replace: 'OPTIONS.IMPORT_EXPORT_EXPORT_BUTTON' },
    { file: 'options/controllers/import-export-controller.js', find: "'Импортировать настройки'", replace: 'OPTIONS.IMPORT_EXPORT_IMPORT_BUTTON' },
    { file: 'options/controllers/import-export-controller.js', find: '"Импортировать настройки"', replace: 'OPTIONS.IMPORT_EXPORT_IMPORT_BUTTON' },
];

// Добавляем импорты в файлы, если их нет
const importsMap = {
    'popup/fill-panel.js': ["import { POPUP } from '../labels/popup-labels.js';", "import { COMMON } from '../labels/common-labels.js';"],
    'popup/ua-panel.js': ["import { POPUP } from '../labels/popup-labels.js';"],
    'background/background-app.js': ["import { BACKGROUND } from '../labels/background-labels.js';"],
    'content/content.js': ["import { CONTENT } from '../labels/content-labels.js';"],
    'options/controllers/rules-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/folders-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/special-insertions-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/smart-counters-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/snapshots-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/word-lists-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/ua-rules-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
    'options/controllers/import-export-controller.js': ["import { OPTIONS } from '../labels/options-labels.js';"],
};

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

// Применяем замены
for (const rep of allReplacements) {
    const fullPath = path.join(rootDir, rep.file);
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ File not found: ${rep.file}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Добавляем импорты
    if (importsMap[rep.file]) {
        const hasImport = importsMap[rep.file].some(imp => content.includes(imp));
        if (!hasImport) {
            content = addImports(content, importsMap[rep.file]);
        }
    }

    // Заменяем строку
    if (content.includes(rep.find)) {
        content = content.replace(new RegExp(rep.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rep.replace);
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Replaced in ${rep.file}: ${rep.find} -> ${rep.replace}`);
    }
}

console.log('\n🎉 All replacements completed!');