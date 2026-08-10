// popup/scraper-panel.js
export class ScraperPanel {
  constructor() {
    this.elements = {
      scraperBox: document.getElementById('scraperBox'),
      scrapeButton: document.getElementById('scrapeButton'),
      scraperResults: document.getElementById('scraperResults')
    };
  }

  init() {
    this._bindEvents();
  }

  _bindEvents() {
    if (this.elements.scrapeButton) {
      this.elements.scrapeButton.addEventListener('click', () => this._handleScrape());
    }
  }

  async _handleScrape() {
    const result = await this._sendMessage('SCRAPE_PAGE');
    this._showResults(result);
  }

  _sendMessage(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  _showResults(data) {
    if (!data || !this.elements.scraperResults) return;
    this.elements.scraperResults.textContent = JSON.stringify(data, null, 2);
  }
}
