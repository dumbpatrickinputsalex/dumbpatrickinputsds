// infrastructure/chrome-storage-repository.js
export class ChromeStorageRepository {
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
