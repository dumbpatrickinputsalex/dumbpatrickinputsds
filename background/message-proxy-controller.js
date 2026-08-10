// background/message-proxy-controller.js
export class MessageProxyController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.handlers = {};
  }

  /**
 * Регистрирует обработчики сообщений.
 * @param {*} type - Описание параметра.
 * @param {*} handler - Описание параметра.
 * @returns {void}
 */
register(type, handler) {
    this.handlers[type] = handler;
  }

  /**
 * Обрабатывает входящее сообщение.
 * @param {*} message - Описание параметра.
 * @param {*} sender - Описание параметра.
 * @param {*} sendResponse - Описание параметра.
 * @returns {void}
 */
async handleMessage(message, sender, sendResponse) {
    const handler = this.handlers[message.type];
    if (handler) {
      try {
        const result = await handler(message.payload, sender);
        sendResponse(result);
      } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }
    return false;
  }
}
