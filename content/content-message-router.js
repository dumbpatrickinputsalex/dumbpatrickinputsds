// content/content-message-router.js
export class ContentMessageRouter {
  /**
 * Создаёт экземпляр класса.
 * @param {*} handlers - Описание параметра.
 * @returns {void}
 */
constructor(handlers = {}) {
    this.handlers = handlers;
    this._listener = null;
  }

  /**
 * Регистрирует обработчики сообщений.
 * @returns {void}
 */
register() {
    this._listener = (message, sender, sendResponse) => {
      const handler = this.handlers[message.type];
      if (handler) {
        const result = handler(message.payload, sender);
        if (result && result.then) {
          result.then(sendResponse).catch(() => sendResponse({ error: 'Handler failed' }));
          return true;
        } else {
          sendResponse(result);
        }
      }
    };

    chrome.runtime.onMessage.addListener(this._listener);
  }

  /**
 * Отменяет регистрацию обработчиков сообщений.
 * @returns {void}
 */
unregister() {
    if (this._listener) {
      chrome.runtime.onMessage.removeListener(this._listener);
      this._listener = null;
    }
  }
}
