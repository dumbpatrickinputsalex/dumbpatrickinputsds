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
