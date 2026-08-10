// scripts/add-jsdoc.cjs
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Папки для обработки
const targetDirs = [
    'background',
    'content',
    'domain',
    'infrastructure',
    'options/controllers',
    'popup',
    'shared',
    'labels'
];

// Функция для определения типа функции
function getFunctionType(funcName, content) {
    if (funcName.startsWith('_')) return 'private';
    if (funcName.startsWith('get') || funcName.startsWith('find') || funcName.startsWith('has') || funcName.startsWith('is')) return 'getter';
    if (funcName.startsWith('set') || funcName.startsWith('add') || funcName.startsWith('create') || funcName.startsWith('init')) return 'setter';
    if (funcName.startsWith('handle') || funcName.startsWith('on')) return 'handler';
    if (funcName.startsWith('render') || funcName.startsWith('show') || funcName.startsWith('display')) return 'render';
    if (funcName === 'constructor') return 'constructor';
    return 'method';
}

// Генерация JSDoc для функции
function generateJsdoc(funcName, funcType, params) {
    const type = getFunctionType(funcName, '');
    let jsdoc = '/**\n';

    // Описание
    const descriptions = {
        'constructor': 'Создаёт экземпляр класса.',
        'init': 'Инициализирует компонент.',
        'render': 'Отрисовывает интерфейс.',
        'save': 'Сохраняет данные.',
        'load': 'Загружает данные.',
        'get': 'Возвращает значение.',
        'set': 'Устанавливает значение.',
        'handle': 'Обрабатывает событие.',
        'bind': 'Привязывает обработчики событий.',
        'update': 'Обновляет состояние.',
        'execute': 'Выполняет основное действие.',
        'boot': 'Запускает приложение.',
        'register': 'Регистрирует компонент.',
        'unregister': 'Отменяет регистрацию компонента.',
        'highlight': 'Подсвечивает элемент.',
        'waitFor': 'Ожидает условие.',
        'parse': 'Разбирает данные.',
        'generate': 'Генерирует значение.',
        'detect': 'Определяет тип.',
        'evaluate': 'Вычисляет условие.',
        'matches': 'Проверяет соответствие.',
        'migrate': 'Выполняет миграцию данных.',
        'ensureShape': 'Гарантирует структуру данных.',
        'ensureInjected': 'Гарантирует внедрение скриптов.',
        'sync': 'Синхронизирует данные.',
        'setValue': 'Устанавливает значение в DOM-элемент.',
        'getState': 'Получает состояние.',
        'saveState': 'Сохраняет состояние.',
        'updateState': 'Обновляет состояние.',
    };

    let description = descriptions[funcName] || Выполняет операцию "".;
    if (type === 'private') {
        description = (приватный) ;
    }

    jsdoc +=  * \n;

    // Параметры
    if (params && params.length > 0) {
        for (const param of params) {
            const cleanParam = param.replace(/[=,].*$/, '').trim();
            if (cleanParam && !cleanParam.includes('{') && !cleanParam.includes('}')) {
                jsdoc +=  * @param {*}  - Описание параметра.\n;
            }
        }
    }

    // Возвращаемое значение
    if (funcName.startsWith('get') || funcName.startsWith('find') || funcName === 'render' || funcName === 'parse') {
        jsdoc +=  * @returns {*} Результат операции.\n;
    } else if (funcName.startsWith('set') || funcName.startsWith('save') || funcName.startsWith('update')) {
        jsdoc +=  * @returns {void}\n;
    } else if (funcName.startsWith('handle') || funcName.startsWith('on') || funcName.startsWith('bind')) {
        jsdoc +=  * @returns {void}\n;
    } else if (funcName.startsWith('ensure') || funcName.startsWith('sync')) {
        jsdoc +=  * @returns {Promise<*>} Результат операции.\n;
    } else {
        jsdoc +=  * @returns {void}\n;
    }

    // Пример
    const examples = {
        'init': ' * @example\n * const component = new Component();\n * component.init();',
        'render': ' * @example\n * component.render();',
        'save': ' * @example\n * component.save(data);',
        'load': ' * @example\n * const data = await component.load();',
        'get': ' * @example\n * const value = component.get();',
        'set': ' * @example\n * component.set(value);',
        'handle': ' * @example\n * component.handle(event);',
        'bind': ' * @example\n * component.bind();',
        'update': ' * @example\n * component.update(newData);',
        'execute': ' * @example\n * const result = await component.execute();',
        'boot': ' * @example\n * app.boot();',
        'register': ' * @example\n * registry.register(name, component);',
        'unregister': ' * @example\n * registry.unregister(name);',
        'highlight': ' * @example\n * highlighter.highlight(element);',
        'waitFor': ' * @example\n * const el = await waiter.waitFor(\'.selector\');',
        'parse': ' * @example\n * const result = parser.parse(input);',
        'generate': ' * @example\n * const value = generator.generate(args);',
        'detect': ' * @example\n * const type = detector.detect(element);',
        'evaluate': ' * @example\n * const result = evaluator.evaluate(condition);',
        'matches': ' * @example\n * const isMatch = matcher.matches(pattern, url);',
        'migrate': ' * @example\n * const newState = migrator.migrate(oldState);',
        'ensureShape': ' * @example\n * const shaped = migrator.ensureShape(data);',
        'ensureInjected': ' * @example\n * await injector.ensureInjected(tabId);',
        'sync': ' * @example\n * await service.sync(state);',
        'setValue': ' * @example\n * setter.setValue(input, "Hello");',
        'getState': ' * @example\n * const state = await repository.getState();',
        'saveState': ' * @example\n * await repository.saveState(state);',
        'updateState': ' * @example\n * await repository.updateState(mutator);',
    };

    if (examples[funcName]) {
        jsdoc += ${examples[funcName]}\n;
    }

    jsdoc += ' */';
    return jsdoc;
}

// Парсинг функции для извлечения параметров
function extractParams(funcStr) {
    const match = funcStr.match(/\(([^)]*)\)/);
    if (match) {
        return match[1].split(',').map(p => p.trim()).filter(p => p);
    }
    return [];
}

// Находит все функции в файле
function findFunctions(content) {
    const functions = [];
    // Обычные функции: function name() { ... }
    const funcRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            params: match[2].split(',').map(p => p.trim()).filter(p => p),
            start: match.index,
            end: content.indexOf('}', match.index + match[0].length)
        });
    }

    // Методы класса: methodName() { ... } или async methodName() { ... }
    const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
        // Проверяем, что это не функция (уже найдена)
        const isFunction = functions.some(f => f.name === match[1] && Math.abs(f.start - match.index) < 10);
        if (!isFunction && !match[1].startsWith('if') && !match[1].startsWith('for') && !match[1].startsWith('while')) {
            functions.push({
                name: match[1],
                params: match[2].split(',').map(p => p.trim()).filter(p => p),
                start: match.index,
                end: content.indexOf('}', match.index + match[0].length)
            });
        }
    }

    return functions;
}

// Проверяет, есть ли уже JSDoc над функцией
function hasJsdoc(content, funcStart) {
    const before = content.substring(Math.max(0, funcStart - 150), funcStart);
    return before.includes('/**') && before.includes('*/');
}

// Добавляет JSDoc в файл
function addJsdocToFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const functions = findFunctions(content);
    let modified = false;

    // Сортируем функции по позиции (от конца к началу, чтобы не сбивать индексы)
    functions.sort((a, b) => b.start - a.start);

    for (const func of functions) {
        // Пропускаем, если уже есть JSDoc
        if (hasJsdoc(content, func.start)) continue;

        // Пропускаем функции в тестах
        if (filePath.includes('.test.js')) continue;

        // Пропускаем анонимные функции и стрелочные
        if (!func.name || func.name === '' || func.name === 'function') continue;

        const jsdoc = generateJsdoc(func.name, getFunctionType(func.name, ''), func.params);
        const insertPos = func.start;
        const before = content.substring(0, insertPos);
        const after = content.substring(insertPos);

        // Проверяем, нет ли уже комментария перед функцией
        const trimmedBefore = before.trim();
        if (trimmedBefore.endsWith('*/')) continue;

        content = before + jsdoc + '\n' + after;
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(✅ Added JSDoc to: );
        return true;
    } else {
        console.log(⏭️ No changes needed: );
        return false;
    }
}

// Обход всех файлов
let totalUpdated = 0;

for (const dir of targetDirs) {
    const fullDir = path.join(rootDir, dir);
    if (!fs.existsSync(fullDir)) {
        console.log(⚠️ Directory not found: );
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

console.log(\n🎉 JSDoc documentation added to  files!);
