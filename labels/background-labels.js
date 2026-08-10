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
