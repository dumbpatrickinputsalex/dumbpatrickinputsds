# Manual Regression Checklist

## Before each change

- [ ] Расширение загружается в chrome://extensions без ошибок
- [ ] Popup открывается (клик по иконке)
- [ ] Options открываются (правый клик → Options)

## Core functionality

- [ ] Ctrl+Shift+F заполняет поля на форме
- [ ] Ctrl+Shift+1 выполняет спецвставку
- [ ] Popup показывает количество активных правил

## Rules (Options → Rules)

- [ ] Создание правила работает
- [ ] Редактирование правила работает
- [ ] Удаление правила работает
- [ ] Перемещение правила (drag) работает

## Special Insertions

- [ ] Создание спецвставки работает
- [ ] Fill Special заполняет поля
- [ ] Picker выбирает элемент

## Counters

- [ ] Counter увеличивается при fill
- [ ] Seq (smart counter) увеличивается и пишет history
- [ ] После перезагрузки страницы счётчики сохраняются

## Import/Export

- [ ] Export state работает (сохраняется JSON)
- [ ] Import state работает (проверить на exported JSON)
- [ ] После импорта все правила/вставки на месте

## CopyFX (если включено в настройках)

- [ ] Трейдеры загружаются в popup
- [ ] Инвесторы загружаются в popup
- [ ] Данные кэшируются на сессию

## UA Rules

- [ ] UA toggle переключает User-Agent (проверить в DevTools → Network)

## Stability

- [ ] Нет ошибок в консоли после каждого действия
- [ ] Расширение не падает после перезагрузки страницы
- [ ] Service worker не падает (проверить в chrome://extensions)