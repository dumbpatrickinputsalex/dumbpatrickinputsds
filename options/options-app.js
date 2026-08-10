// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';
import { FoldersController } from './controllers/folders-controller.js';
import { SpecialInsertionsController } from './controllers/special-insertions-controller.js';
import { SmartCountersController } from './controllers/smart-counters-controller.js';
import { ImportExportController } from './controllers/import-export-controller.js';
import { SnapshotsController } from './controllers/snapshots-controller.js';
import { WordListsController } from './controllers/word-lists-controller.js';
import { ScraperConfigController } from './controllers/scraper-config-controller.js';
import { CopyfxConfigController } from './controllers/copyfx-config-controller.js';
import { UaRulesController } from './controllers/ua-rules-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = {
        rules: [],
        folders: [],
        specialInsertions: [],
        smartCounters: [],
        snapshots: [],
        customWordLists: [],
        scraperConfig: { enabled: false },
        copyfxConfig: { enabled: false },
        uaRules: [],
      };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }
    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    document.addEventListener('options-import', e => this._handleImport(e.detail));
    document.addEventListener('options-restore', e => this._handleRestore(e.detail));
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [
      new RulesController(),
      new FoldersController(),
      new SpecialInsertionsController(),
      new SmartCountersController(),
      new ImportExportController(),
      new SnapshotsController(),
      new WordListsController(),
      new ScraperConfigController(),
      new CopyfxConfigController(),
      new UaRulesController(),
    ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }

  async _handleImport(importedData) {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.import) state = controller.import(state, importedData);
    });
    await this.storage.saveState(state);
    location.reload();
  }

  async _handleRestore(snapshot) {
    if (snapshot.data) {
      await this.storage.saveState(snapshot.data);
      location.reload();
    }
  }
}
