// background/command-controller.js
export class CommandController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.commands = {};
  }

  /**
 * Регистрирует обработчики сообщений.
 * @param {*} command - Описание параметра.
 * @param {*} handler - Описание параметра.
 * @returns {void}
 */
register(command, handler) {
    this.commands[command] = handler;
  }

  /**
 * Обрабатывает глобальную команду.
 * @param {*} command - Описание параметра.
 * @param {*} tab - Описание параметра.
 * @returns {void}
 */
async handleCommand(command, tab) {
    const handler = this.commands[command];
    if (handler) {
      return handler(tab);
    }
    return { success: false, error: 'Unknown command' };
  }
}
