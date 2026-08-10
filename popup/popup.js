// Auto-generated bundle for Chrome Extension
// Generated on 08/10/2026 15:59:26
// === infrastructure/chrome-storage-repository.js ===
// infrastructure/chrome-storage-repository.js
class ChromeStorageRepository {
  /**
 * Создаёт экземпляр класса.
 * @param {*} storageArea - Описание параметра.
 * @returns {void}
 */
constructor(storageArea = chrome.storage.local) {
    this.storage = storageArea;
  }

  /**
 * Получает состояние из storage.
 * @returns {*} Результат операции.
 */
async getState() {
    return new Promise(resolve => {
      this.storage.get('state', result => {
        resolve(result.state || null);
      });
    });
  }

  /**
 * Сохраняет состояние в storage.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
async saveState(state) {
    return new Promise(resolve => {
      this.storage.set({ state }, () => {
        resolve();
      });
    });
  }

  /**
 * Обновляет состояние через мутатор.
 * @param {*} mutator - Описание параметра.
 * @returns {void}
 */
async updateState(mutator) {
    const current = await this.getState();
    const newState = mutator(current);
    await this.saveState(newState);
    return newState;
  }
}


// === shared/url-matcher.js ===
/**
 * UrlMatcher — единая логика для проверки URL
 * Заменяет дублирование в lib/matcher.js, popup/popup.js, options/options.js
 */
class UrlMatcher {
  /**
   * Проверяет, соответствует ли URL паттерну
   * @param {string|RegExp} pattern - паттерн для проверки
   * @param {string} url - URL для проверки
   * @returns {boolean}
   */
  matchesPattern(pattern, url) {
    if (!pattern) return true;
    if (pattern instanceof RegExp) return pattern.test(url);
    if (typeof pattern === 'string') {
      // Если паттерн содержит *, превращаем в регулярное выражение
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(url);
      }
      return url.includes(pattern);
    }
    return false;
  }

  /**
   * Проверяет URL по массиву условий
   * @param {Array} conditions - массив условий
   * @param {string} url - URL для проверки
   * @returns {boolean}
   */
  matchesConditions(conditions, url) {
    if (!conditions || conditions.length === 0) return true;

    // Если режим AND — все условия должны совпадать
    const mode = conditions.mode || 'AND';
    const items = conditions.items || conditions;

    if (mode === 'OR') {
      return items.some(cond => this._testCondition(cond, url));
    } else {
      return items.every(cond => this._testCondition(cond, url));
    }
  }

  /**
   * Проверяет одно условие
   * @param {Object} condition - условие
   * @param {string} url - URL для проверки
   * @returns {boolean}
   * @private
   */
  _testCondition(condition, url) {
    if (!condition) return true;
    const pattern = condition.pattern || condition;
    return this.matchesPattern(pattern, url);
  }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlMatcher;
}


// === labels ===
// Текст для popup-окна

const POPUP = {
  // Заголовки
  TITLE: 'Dumb Patrick Inputs',

  // Кнопки
  BUTTON_FILL_ALL: 'Заполнить все поля',
  BUTTON_FILL_SPECIAL: 'Спецвставка',
  BUTTON_OPEN_OPTIONS: 'Открыть настройки',

  // Статусы
  STATUS_ACTIVE_RULES: 'Активных правил:',
  STATUS_NO_ACTIVE_RULES: 'Нет активных правил',
  STATUS_FILLING: 'Заполнение...',
  STATUS_DONE: 'Готово!',

  // Результаты
  RESULT_FILLED: 'Заполнено:',
  RESULT_MATCHED: 'Найдено:',
  RESULT_ERRORS: 'Ошибки:',
  RESULT_NO_RESULTS: 'Нет результатов',

  // Панели
  PANEL_SCRAPER: 'Скрапер',
  PANEL_COPYFX: 'CopyFX',
  PANEL_INVESTORS: 'Инвесторы',
  PANEL_UA: 'User-Agent',

  // Scraper
  SCRAPER_BUTTON_SCAN: 'Сканировать страницу',
  SCRAPER_NO_DATA: 'Нет данных для отображения',

  // CopyFX
  COPYFX_TRADERS: 'Трейдеров:',
  COPYFX_REFRESH: 'Обновить',
  COPYFX_NO_DATA: 'Нет данных CopyFX',

  // Investors
  INVESTORS_LIST: 'Инвесторы:',
  INVESTORS_NO_DATA: 'Нет данных об инвесторах',

  // UA
  UA_TOGGLE_LABEL: 'Подменить User-Agent',
  UA_NO_RULES: 'Нет правил для подмены UA',
};

// Общие метки, используемые в разных частях приложения

const COMMON = {
  // Кнопки
  BUTTON_SAVE: 'Сохранить',
  BUTTON_CANCEL: 'Отмена',
  BUTTON_DELETE: 'Удалить',
  BUTTON_ADD: 'Добавить',
  BUTTON_EDIT: 'Редактировать',
  BUTTON_CLOSE: 'Закрыть',
  BUTTON_BACK: 'Назад',
  BUTTON_NEXT: 'Далее',
  BUTTON_RESET: 'Сбросить',

  // Статусы
  STATUS_ENABLED: 'Включено',
  STATUS_DISABLED: 'Отключено',
  STATUS_ACTIVE: 'Активно',
  STATUS_INACTIVE: 'Неактивно',
  STATUS_LOADING: 'Загрузка...',
  STATUS_READY: 'Готово',
  STATUS_ERROR: 'Ошибка',

  // Действия
  ACTION_FILL: 'Заполнить',
  ACTION_FILL_ALL: 'Заполнить все',
  ACTION_FILL_SPECIAL: 'Спецвставка',
  ACTION_PREVIEW: 'Предпросмотр',
  ACTION_IMPORT: 'Импорт',
  ACTION_EXPORT: 'Экспорт',

  // Сообщения
  MSG_SAVED: 'Сохранено',
  MSG_DELETED: 'Удалено',
  MSG_ADDED: 'Добавлено',
  MSG_ERROR_OCCURRED: 'Произошла ошибка',
  MSG_NO_DATA: 'Нет данных',
  MSG_EMPTY_FIELD: 'Поле не может быть пустым',
};


// === popup/fill-panel.js ===
// popup/fill-panel.js





class FillPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.storage = new ChromeStorageRepository();
    this.urlMatcher = new UrlMatcher();
    
    this.elements = {
      fillAll: document.getElementById('fillAll'),
      fillSpecial: document.getElementById('fillSpecial'),
      openOptions: document.getElementById('openOptions'),
      statusLabel: document.getElementById('statusLabel'),
      resultDetails: document.getElementById('resultDetails'),
      resultTable: document.getElementById('resultTable')
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
async init() {
    this._bindEvents();
    await this._updateStatus();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.fillAll) {
      this.elements.fillAll.addEventListener('click', () => this._handleFillAll());
    }
    if (this.elements.fillSpecial) {
      this.elements.fillSpecial.addEventListener('click', () => this._handleFillSpecial());
    }
    if (this.elements.openOptions) {
      this.elements.openOptions.addEventListener('click', () => {
          chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : chrome.tabs.create({ url: 'options/options.html' });
      });
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleFillAll".
 * @returns {void}
 */
async _handleFillAll() {
    const result = await this._sendMessage('FILL_ALL');
    this._showResult(result);
  }

  /**
 * (приватный) Выполняет операцию "_handleFillSpecial".
 * @returns {void}
 */
async _handleFillSpecial() {
    const result = await this._sendMessage('FILL_SPECIAL');
    this._showResult(result);
  }

  /**
 * (приватный) Выполняет операцию "_updateStatus".
 * @returns {void}
 */
async _updateStatus() {
    const state = await this.storage.getState();
    if (!state) return;
    
    const url = window.location.href;
    const activeRules = state.rules?.filter(rule => {
      if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
      return this.urlMatcher.matchesConditions(rule.urlConditions, url);
    }) || [];
    
    if (this.elements.statusLabel) {
      this.elements.statusLabel.textContent = POPUP.STATUS_ACTIVE_RULES ;
    }
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  /**
 * (приватный) Выполняет операцию "_showResult".
 * @param {*} result - Описание параметра.
 * @returns {void}
 */
_showResult(result) {
    if (!result || !this.elements.resultDetails) return;
    
    this.elements.resultDetails.style.display = 'block';
    const table = this.elements.resultTable;
    if (table) {
      const errorsHtml = result.errors ? '<tr><td>' + POPUP.RESULT_ERRORS + '</td><td></td></tr>' : '';
      table.innerHTML = 
        '<tr><td>' + POPUP.RESULT_FILLED + '</td><td></td></tr>'
        '<tr><td>' + POPUP.RESULT_MATCHED + '</td><td></td></tr>'
        
      ;
    }
  }
}


// === popup/scraper-panel.js ===

// popup/scraper-panel.js
class ScraperPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.elements = {
      scraperBox: document.getElementById('scraperBox'),
      scrapeButton: document.getElementById('scrapeButton'),
      scraperResults: document.getElementById('scraperResults'),
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.scrapeButton) {
      this.elements.scrapeButton.addEventListener('click', () => this._handleScrape());
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleScrape".
 * @returns {void}
 */
async _handleScrape() {
    const result = await this._sendMessage('SCRAPE_PAGE');
    this._showResults(result);
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  /**
 * (приватный) Выполняет операцию "_showResults".
 * @param {*} data - Описание параметра.
 * @returns {void}
 */
_showResults(data) {
    if (!data || !this.elements.scraperResults) return;
    this.elements.scraperResults.textContent = JSON.stringify(data, null, 2);
  }
}


// === popup/copyfx-panel.js ===

// popup/copyfx-panel.js
class CopyfxPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.cache = {};
    this.elements = {
      copyfxBox: document.getElementById('copyfxBox'),
      copyfxTraders: document.getElementById('copyfxTraders'),
      copyfxRefresh: document.getElementById('copyfxRefresh')
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
    this._loadData();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.copyfxRefresh) {
      this.elements.copyfxRefresh.addEventListener('click', () => this._loadData(true));
    }
  }

  /**
 * (приватный) Выполняет операцию "_loadData".
 * @param {*} force - Описание параметра.
 * @returns {void}
 */
async _loadData(force = false) {
    if (!force && this.cache.traders) {
      this._renderTraders(this.cache.traders);
      return;
    }
    
    const result = await this._sendMessage('COPYFX_GET_TRADERS');
    if (result && result.traders) {
      this.cache.traders = result.traders;
      this._renderTraders(result.traders);
    }
  }

  /**
 * (приватный) Выполняет операцию "_renderTraders".
 * @param {*} traders - Описание параметра.
 * @returns {void}
 */
_renderTraders(traders) {
    if (!this.elements.copyfxTraders) return;
    this.elements.copyfxTraders.textContent = POPUP.COPYFX_TRADERS ;
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}


// === popup/investor-panel.js ===

// popup/investor-panel.js
class InvestorPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.cache = {};
    this.elements = {
      investorSection: document.getElementById('investorSection'),
      investorList: document.getElementById('investorList')
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
    this._loadData();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {}

  /**
 * (приватный) Выполняет операцию "_loadData".
 * @returns {void}
 */
async _loadData() {
    const result = await this._sendMessage('COPYFX_GET_INVESTORS');
    if (result && result.investors) {
      this.cache.investors = result.investors;
      this._renderInvestors(result.investors);
    }
  }

  /**
 * (приватный) Выполняет операцию "_renderInvestors".
 * @param {*} investors - Описание параметра.
 * @returns {void}
 */
_renderInvestors(investors) {
    if (!this.elements.investorList) return;
    this.elements.investorList.textContent = 'Инвесторов: ';
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}


// === popup/ua-panel.js ===

// popup/ua-panel.js
class UaPanel {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.elements = {
      uaBox: document.getElementById('uaBox'),
      uaToggle: document.getElementById('uaToggle'),
    };
  }

  /**
 * Инициализирует компонент.
 * @returns {void}
 */
init() {
    this._bindEvents();
    this._loadStatus();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.elements.uaToggle) {
      this.elements.uaToggle.addEventListener('change', () => this._handleToggle());
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleToggle".
 * @returns {void}
 */
async _handleToggle() {
    const enabled = this.elements.uaToggle.checked;
    await this._sendMessage('UA_TOGGLE', { enabled });
  }

  /**
 * (приватный) Выполняет операцию "_loadStatus".
 * @returns {void}
 */
async _loadStatus() {
    const state = await this._getState();
    if (state && state.uaRules && state.uaRules.length > 0 && this.elements.uaBox) {
      this.elements.uaBox.style.display = 'block';
      if (this.elements.uaToggle) {
        this.elements.uaToggle.checked = state.uaRules[0].enabled !== false;
      }
    }
  }

  /**
 * (приватный) Выполняет операцию "_getState".
 * @returns {void}
 */
_getState() {
    return new Promise(resolve => {
      chrome.storage.local.get('state', result => {
        resolve(result.state || null);
      });
    });
  }

  /**
 * (приватный) Выполняет операцию "_sendMessage".
 * @param {*} type - Описание параметра.
 * @param {*} payload - Описание параметра.
 * @returns {void}
 */
_sendMessage(type, payload) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }
}


// === popup/popup-app.js ===
// popup/popup-app.js






class PopupApp {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.panels = [];
  }

  /**
 * Запускает приложение.
 * @returns {void}
 */
boot() {
    this.panels = [
      new FillPanel(),
      new ScraperPanel(),
      new CopyfxPanel(),
      new InvestorPanel(),
      new UaPanel(),
    ];

    this.panels.forEach(panel => {
      if (panel.init) panel.init();
    });
  }
}


// === Инициализация ===
setTimeout(() => {
  const app = new PopupApp();
  app.boot();
}, 100);




