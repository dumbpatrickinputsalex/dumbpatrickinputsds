// infrastructure/chrome-storage-repository.js
export class ChromeStorageRepository {
  constructor(storageArea = chrome.storage.local) {
    this.storage = storageArea;
  }

  async getState() {
    return new Promise(resolve => {
      this.storage.get('state', result => {
        resolve(result.state || null);
      });
    });
  }

  async saveState(state) {
    return new Promise(resolve => {
      this.storage.set({ state }, () => {
        resolve();
      });
    });
  }

  async updateState(mutator) {
    const current = await this.getState();
    const newState = mutator(current);
    await this.saveState(newState);
    return newState;
  }
}
