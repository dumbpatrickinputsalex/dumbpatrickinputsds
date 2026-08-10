// background/content-script-injector.js
export class ContentScriptInjector {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.injectedTabs = new Set();
  }

  /**
 * Гарантирует внедрение content scripts в вкладку.
 * @param {*} tabId - Описание параметра.
 * @returns {void}
 */
async ensureInjected(tabId) {
    if (this.injectedTabs.has(tabId)) return true;

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'lib/generators.js',
          'lib/template.js',
          'lib/matcher.js',
          'content/picker.js',
          'content/content.js',
        ],
      });
      this.injectedTabs.add(tabId);
      return true;
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      console.error('Failed to inject content scripts:', error);
      return false;
    }
  }

  /**
 * Внедряет CopyFX interceptor в MAIN world.
 * @param {*} tabId - Описание параметра.
 * @returns {void}
 */
async injectCopyfxInterceptor(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        files: ['content/copyfx-interceptor.js'],
      });
      return true;
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      console.error('Failed to inject CopyFX interceptor:', error);
      return false;
    }
  }

  /**
 * Очищает кэш внедрённых скриптов для вкладки.
 * @param {*} tabId - Описание параметра.
 * @returns {void}
 */
clear(tabId) {
    this.injectedTabs.delete(tabId);
  }
}
