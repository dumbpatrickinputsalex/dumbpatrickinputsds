// content/element-waiter.js
export class ElementWaiter {
  /**
 * Ожидает появления элемента по селектору.
 * @param {*} selector - Описание параметра.
 * @param {*} timeoutMs - Описание параметра.
 * @returns {void}
 */
waitForSelector(selector, timeoutMs = 5000) {
    return new Promise(resolve => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      let timeoutId;
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);
    });
  }
}
