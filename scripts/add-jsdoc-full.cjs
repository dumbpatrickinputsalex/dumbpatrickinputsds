const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Все папки с JS-файлами
const targetDirs = [
    'background',
    'content',
    'domain',
    'domain/generators',
    'domain/matching',
    'domain/templates',
    'infrastructure',
    'options/controllers',
    'popup',
    'shared',
    'labels'
];

// Описания для методов
const descriptions = {
    // Background
    'constructor': 'Создаёт экземпляр класса.',
    'boot': 'Запускает приложение.',
    'ensureInjected': 'Гарантирует внедрение content scripts в вкладку.',
    'injectCopyfxInterceptor': 'Внедряет CopyFX interceptor в MAIN world.',
    'clear': 'Очищает кэш внедрённых скриптов для вкладки.',
    'register': 'Регистрирует команду или обработчик.',
    'handleCommand': 'Обрабатывает глобальную команду.',
    'syncFromState': 'Синхронизирует UA правила из состояния.',
    'getTraders': 'Получает данные о трейдерах из страницы.',
    'getInvestors': 'Получает данные об инвесторах из страницы.',
    'handleMessage': 'Обрабатывает входящее сообщение.',
    'setupCommands': 'Настраивает глобальные команды.',
    'setupMessageHandlers': 'Настраивает обработчики сообщений.',

    // Content
    'setValue': 'Устанавливает значение в DOM-элемент.',
    'highlight': 'Подсвечивает DOM-элемент.',
    'waitForSelector': 'Ожидает появления элемента по селектору.',
    'register': 'Регистрирует обработчики сообщений.',
    'unregister': 'Отменяет регистрацию обработчиков сообщений.',
    'execute': 'Выполняет правило заполнения.',
    'fillAll': 'Заполняет все поля на странице.',
    'fillSpecial': 'Выполняет спецвставку.',

    // Domain - Templates
    'parse': 'Разбирает шаблон на токены и текст.',
    'render': 'Рендерит шаблон с использованием генераторов.',
    'generate': 'Генерирует значение для токена.',

    // Domain - Generators
    'detect': 'Определяет тип поля.',
    'getLabelText': 'Получает текст лейбла для элемента.',
    'evaluate': 'Вычисляет условия для элемента.',
    'findMatches': 'Находит элементы, соответствующие правилу.',
    'collectFields': 'Собирает все поля на странице.',

    // Domain - State
    'migrate': 'Мигрирует состояние из старого формата.',
    'ensureShape': 'Гарантирует правильную структуру состояния.',

    // Infrastructure
    'getState': 'Получает состояние из storage.',
    'saveState': 'Сохраняет состояние в storage.',
    'updateState': 'Обновляет состояние через мутатор.',

    // Popup
    'init': 'Инициализирует компонент.',
    'updateStatus': 'Обновляет статус в popup.',
    'loadData': 'Загружает данные.',
    'loadStatus': 'Загружает статус.',
    'renderResult': 'Отрисовывает результат.',
    'showResults': 'Показывает результаты.',
    'handleScrape': 'Обрабатывает сканирование страницы.',
    'handleToggle': 'Обрабатывает переключение.',
    'handleExport': 'Обрабатывает экспорт данных.',
    'handleImport': 'Обрабатывает импорт данных.',
    'handleRestore': 'Обрабатывает восстановление из снапшота.',
    'renderTraders': 'Отрисовывает список трейдеров.',
    'renderInvestors': 'Отрисовывает список инвесторов.',
    'renderCards': 'Отрисовывает карточки.',
    'escapeHtml': 'Экранирует HTML-сущности.',
    'save': 'Сохраняет данные.',
    'load': 'Загружает данные.',

    // Options Controllers
    'render': 'Отрисовывает интерфейс.',
    'bindEvents': 'Привязывает обработчики событий.',
    'createCard': 'Создаёт карточку элемента.',
    'addItem': 'Добавляет новый элемент.',
    'deleteItem': 'Удаляет элемент.',
    'restoreItem': 'Восстанавливает элемент из снапшота.',
    'importData': 'Импортирует данные.',
    'exportData': 'Экспортирует данные.',
    'validate': 'Валидирует данные.',
    'reset': 'Сбрасывает состояние.',

    // Shared
    'matchesPattern': 'Проверяет, соответствует ли URL паттерну.',
    'matchesConditions': 'Проверяет URL по массиву условий.',
};

// Функция для определения типа функции
function getFunctionType(funcName) {
    if (funcName.startsWith('_')) return 'private';
    if (funcName.startsWith('get') || funcName.startsWith('find') || funcName.startsWith('has') || funcName.startsWith('is')) return 'getter';
    if (funcName.startsWith('set') || funcName.startsWith('add') || funcName.startsWith('create') || funcName.startsWith('init')) return 'setter';
    if (funcName.startsWith('handle') || funcName.startsWith('on')) return 'handler';
    if (funcName.startsWith('render') || funcName.startsWith('show') || funcName.startsWith('display')) return 'render';
    if (funcName === 'constructor') return 'constructor';
    return 'method';
}

// Генерация JSDoc для метода
function generateJsdoc(funcName, params) {
    const type = getFunctionType(funcName);
    let jsdoc = '/**\n';

    let description = descriptions[funcName] || `Выполняет операцию "${funcName}".`;
    if (type === 'private') {
        description = `(приватный) ${description}`;
    }

    jsdoc += ` * ${description}\n`;

    if (params && params.length > 0) {
        for (const param of params) {
            const cleanParam = param.replace(/[=,].*$/, '').trim();
            if (cleanParam && !cleanParam.includes('{') && !cleanParam.includes('}')) {
                jsdoc += ` * @param {*} ${cleanParam} - Описание параметра.\n`;
            }
        }
    }

    const returnTypes = {
        'constructor': ' * @returns {void}\n',
        'getter': ' * @returns {*} Результат операции.\n',
        'setter': ' * @returns {void}\n',
        'handler': ' * @returns {void}\n',
        'render': ' * @returns {void}\n',
        'private': ' * @returns {void}\n',
    };

    jsdoc += returnTypes[type] || ' * @returns {void}\n';

    jsdoc += ' */';
    return jsdoc;
}

// Извлечение параметров функции
function extractParams(funcStr) {
    const match = funcStr.match(/\(([^)]*)\)/);
    if (match) {
        return match[1].split(',').map(p => p.trim()).filter(p => p && p !== '');
    }
    return [];
}

// Поиск всех функций и методов в файле
function findFunctions(content) {
    const functions = [];

    // Обычные функции: function name() { ... }
    const funcRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            params: extractParams(match[0]),
            start: match.index,
            end: content.indexOf('}', match.index + match[0].length)
        });
    }

    // Методы класса: methodName() { ... } или async methodName() { ... }
    const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
        const isFunction = functions.some(f => f.name === match[1] && Math.abs(f.start - match.index) < 10);
        if (!isFunction && !match[1].startsWith('if') && !match[1].startsWith('for') && !match[1].startsWith('while')) {
            functions.push({
                name: match[1],
                params: extractParams(match[0]),
                start: match.index,
                end: content.indexOf('}', match.index + match[0].length)
            });
        }
    }

    return functions;
}

// Проверка наличия JSDoc
function hasJsdoc(content, funcStart) {
    const before = content.substring(Math.max(0, funcStart - 200), funcStart);
    return before.includes('/**') && before.includes('*/');
}

// Добавление JSDoc в файл
function addJsdocToFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const functions = findFunctions(content);
    let modified = false;

    // Сортируем от конца к началу
    functions.sort((a, b) => b.start - a.start);

    for (const func of functions) {
        // Пропускаем, если уже есть JSDoc
        if (hasJsdoc(content, func.start)) continue;

        // Пропускаем тесты
        if (filePath.includes('.test.js')) continue;

        // Пропускаем анонимные функции
        if (!func.name || func.name === '' || func.name === 'function') continue;

        // Пропускаем конструкторы и методы, которые уже задокументированы
        const before = content.substring(Math.max(0, func.start - 100), func.start);
        if (before.includes('/**')) continue;

        const jsdoc = generateJsdoc(func.name, func.params);
        const insertPos = func.start;

        content = content.substring(0, insertPos) + jsdoc + '\n' + content.substring(insertPos);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Added JSDoc to: ${path.relative(rootDir, filePath)}`);
        return true;
    } else {
        console.log(`⏭️ No changes needed: ${path.relative(rootDir, filePath)}`);
        return false;
    }
}

// Основной цикл
let totalUpdated = 0;

for (const dir of targetDirs) {
    const fullDir = path.join(rootDir, dir);
    if (!fs.existsSync(fullDir)) {
        console.log(`⚠️ Directory not found: ${dir}`);
        continue;
    }

    const files = fs.readdirSync(fullDir);
    for (const file of files) {
        if (file.endsWith('.js') && !file.endsWith('.test.js')) {
            const filePath = path.join(fullDir, file);
            if (addJsdocToFile(filePath)) {
                totalUpdated++;
            }
        }
    }
}

console.log(`\n🎉 JSDoc documentation added to ${totalUpdated} files!`);