// popup/popup-app.js
import { FillPanel } from './fill-panel.js';
import { ScraperPanel } from './scraper-panel.js';
import { CopyfxPanel } from './copyfx-panel.js';
import { InvestorPanel } from './investor-panel.js';
import { UaPanel } from './ua-panel.js';

export class PopupApp {
  constructor() {
    this.panels = [];
  }

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
