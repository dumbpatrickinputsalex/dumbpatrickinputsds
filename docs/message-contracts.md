# Message Contracts

## Popup → Background

| Тип | Назначение |
|-----|------------|
| FILL_ALL | Заполнить все поля на странице |
| FILL_SPECIAL | Выполнить спецвставку |
| PICK_ELEMENT | Запустить picker |
| PREVIEW_TEMPLATE | Показать предпросмотр шаблона |
| SCRAPE_FIELDS | Собрать поля со страницы |
| SCRAPE_PAGE | Собрать всю страницу |
| COPYFX_GET_TRADERS | Получить трейдеров |
| COPYFX_GET_INVESTORS | Получить инвесторов |

## Background → Content

| Тип | Назначение |
|-----|------------|
| FILL_ALL | Выполнить fillAll на странице |
| FILL_SPECIAL | Выполнить fillSpecial на странице |
| FILL_INSERTION_BY_ID | Выполнить спецвставку по ID |
| PREVIEW_TEMPLATE | Показать предпросмотр шаблона |
| PICK_ELEMENT | Запустить picker |
| SCRAPE_FIELDS | Собрать поля со страницы |
| SCRAPE_PAGE | Собрать всю страницу |

## Ответы

Все ответы — объекты с полем error в случае ошибки:

\\\javascript
{ filled: 5, matched: 10 }  // Успех
{ error: 'No rules found' } // Ошибка
\\\
