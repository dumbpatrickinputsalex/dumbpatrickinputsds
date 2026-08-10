# Архитектура проекта

## Слои

### 1. UI Layer (popup/, options/)

- Отвечает за отображение интерфейса
- Не содержит бизнес-логики
- Использует сервисы из application слоя

### 2. Application Layer (content/, background/)

- Содержит use-case'ы и контроллеры
- Координирует работу domain и infrastructure
- Примеры: FillAllUseCase, BackgroundApp

### 3. Domain Layer (domain/)

- Чистая бизнес-логика
- Не зависит от Chrome API и DOM
- Примеры: TemplateParser, RuleMatcher

### 4. Infrastructure Layer (infrastructure/)

- Работа с внешними API (Chrome storage, messaging)
- Примеры: ChromeStorageRepository

### 5. Shared Layer (shared/)

- Общие утилиты
- Примеры: UrlMatcher

## Ключевые инварианты

### State

- Хранится в chrome.storage.local.state
- Мигрируется через StateMigrator
- Используется через ChromeStorageRepository

### Messages

- FILL_ALL — заполнение всех полей
- FILL_SPECIAL — спецвставка
- PICK_ELEMENT — выбор элемента
- PREVIEW_TEMPLATE — предпросмотр шаблона
- SCRAPE_* — сбор данных
- COPYFX_* — работа с CopyFX

## Тестирование

- Unit-тесты:
  pm run test
- Покрытие: domain и shared слои
- Используется Vitest + jsdom
