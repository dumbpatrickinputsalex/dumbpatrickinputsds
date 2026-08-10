// options/options-app.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { RulesController } from './controllers/rules-controller.js';

export class OptionsApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.controllers = [];
  }

  async boot() {
    let state = await this.storage.getState();
    if (!state) {
      const defaultState = { rules: [], folders: [], specialInsertions: [], smartCounters: [] };
      state = this.migrator.ensureShape(defaultState);
      await this.storage.saveState(state);
    }

    this.controllers = this._createControllers(state);
    this.controllers.forEach(controller => {
      if (controller.init) controller.init(state);
    });
    document.addEventListener('options-save', () => this._saveAll());
    window.addEventListener('beforeunload', () => this._saveAll());
  }

  _createControllers(state) {
    return [ new RulesController() ];
  }

  async _saveAll() {
    let state = await this.storage.getState();
    this.controllers.forEach(controller => {
      if (controller.save) state = controller.save(state);
    });
    await this.storage.saveState(state);
  }
}
