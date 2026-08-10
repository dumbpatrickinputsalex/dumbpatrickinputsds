// options/controllers/scraper-config-controller.js
export class ScraperConfigController {
  constructor() {
    this.config = {};
    this.container = document.getElementById('scraperConfigContainer');
  }

  init(state) {
    this.config = state.scraperConfig || { enabled: false };
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = \
      <div class="scraper-config">
        <label>
          <input type="checkbox" class="scraper-enabled" \>
          Включить Scraper
        </label>
        <div class="scraper-settings">
          <label>URL паттерны:</label>
          <textarea class="scraper-urls">\</textarea>
        </div>
      </div>
    \;
  }

  _bindEvents() {
    this.container?.addEventListener('change', (e) => {
      if (e.target.classList.contains('scraper-enabled')) {
        this.config.enabled = e.target.checked;
        this._save();
      }
    });
  }

  save(state) {
    if (this.container) {
      const enabled = this.container.querySelector('.scraper-enabled');
      const urls = this.container.querySelector('.scraper-urls');
      if (enabled) this.config.enabled = enabled.checked;
      if (urls) this.config.urlPatterns = urls.value.split('\n').filter(Boolean);
    }
    state.scraperConfig = this.config;
    return state;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
