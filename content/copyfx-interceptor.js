// content/copyfx-interceptor.
/**
 * Выполняет операцию "js".
 * @param {*} function ( - Описание параметра.
 * @returns {void}
 */
js
(function () {
  // Guard: предотвращаем повторную установку
  if (window.__dpi_copyfx_interceptor_installed) {
    console.log('ℹ️ CopyFX interceptor already installed');
    return;
  }
  window.__dpi_copyfx_interceptor_installed = true;

  // Кэш для хранения данных
  window.__dpi_copyfx_cache = window.__dpi_copyfx_cache || {
    traders: null,
    investors: null,
    history: [],
  };

  // Проверка URL на принадлежность к CopyFX API
  /**
 * Выполняет операцию "isCopyfxUrl".
 * @param {*} url - Описание параметра.
 * @returns {*} Результат операции.
 */
function isCopyfxUrl(url) {
    if (!url) return false;
    const patterns = ['/api/traders', '/api/investors', '/api/copyfx', '/api/fx'];
    return patterns.some(pattern => url.includes(pattern));
  }

  // Безопасный парсинг JSON
  /**
 * Выполняет операцию "safeJsonParse".
 * @param {*} text - Описание параметра.
 * @returns {void}
 */
function safeJsonParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } /**
 * Выполняет операцию "catch".
 * @param {*} _ - Описание параметра.
 * @returns {void}
 */
catch (_) {
      return null;
    }
  }

  // Сохранение данных в кэш
  /**
 * Выполняет операцию "storeData".
 * @param {*} url - Описание параметра.
 * @param {*} data - Описание параметра.
 * @returns {void}
 */
function storeData(url, data) {
    if (!data) return;

    const historyEntry = {
      url: url,
      timestamp: Date.now(),
      data: data,
    };

    window.__dpi_copyfx_cache.history.push(historyEntry);
    if (window.__dpi_copyfx_cache.history.length > 50) {
      window.__dpi_copyfx_cache.history.shift();
    }

    if (url.includes('traders')) {
      window.__dpi_copyfx_cache.traders = data;
    } else if (url.includes('investors')) {
      window.__dpi_copyfx_cache.investors = data;
    }
  }

  // Перехват fetch
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';

    return originalFetch.call(this, input, init).then(async response => {
      if (isCopyfxUrl(url)) {
        try {
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          const data = safeJsonParse(text);
          if (data) {
            storeData(url, data);
          }
        } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
          // Тихо игнорируем ошибки парсинга
        }
      }
      return response;
    });
  };

  // Перехват XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    this._dpi_url = url;
    return originalOpen.call(this, method, url, async !== false, user, password);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this./**
 * Выполняет операцию "addEventListener".
 * @param {*} 'load' - Описание параметра.
 * @param {*} function ( - Описание параметра.
 * @returns {void}
 */
addEventListener('load', function () {
      if (!this._dpi_url) return;
      if (!isCopyfxUrl(this._dpi_url)) return;

      const data = safeJsonParse(this.responseText);
      if (data) {
        storeData(this._dpi_url, data);
      }
    });

    return originalSend.call(this, body);
  };

  console.log('✅ CopyFX interceptor installed successfully');
})();
