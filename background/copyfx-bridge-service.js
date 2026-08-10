// background/copyfx-bridge-service.js
export class CopyfxBridgeService {
  /**
 * Получает данные о трейдерах из страницы.
 * @param {*} payload - Описание параметра.
 * @returns {*} Результат операции.
 */
async getTraders(payload) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.traders || null;
        },
      });

      return result?.[0]?.result || { error: 'No traders data found' };
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      return { error: error.message };
    }
  }

  /**
 * Получает данные об инвесторах из страницы.
 * @returns {*} Результат операции.
 */
async getInvestors() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.investors || null;
        },
      });

      return result?.[0]?.result || { error: 'No investors data found' };
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      return { error: error.message };
    }
  }
}
