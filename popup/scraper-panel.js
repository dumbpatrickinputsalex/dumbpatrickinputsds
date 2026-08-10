import { POPUP } from '../labels/popup-labels.js';
﻿// popup/scraper-panel.js
export class ScraperPanel {
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
