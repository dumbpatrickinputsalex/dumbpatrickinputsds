import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/import-export-controller.js
export class ImportExportController {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.exportBtn = document.getElementById('exportBtn');
    this.importInput = document.getElementById('importInput');
    this.importBtn = document.getElementById('importBtn');
  }

  /**
 * Инициализирует компонент.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
init(state) {
    this.state = state;
    this._bindEvents();
  }

  /**
 * (приватный) Выполняет операцию "_bindEvents".
 * @returns {void}
 */
_bindEvents() {
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => this._handleExport());
    }
    if (this.importBtn) {
      this.importBtn.addEventListener('click', () => this._handleImport());
    }
  }

  /**
 * (приватный) Выполняет операцию "_handleExport".
 * @returns {void}
 */
async _handleExport() {
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formfiller-state-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
 * (приватный) Выполняет операцию "_handleImport".
 * @returns {void}
 */
async _handleImport() {
    const file = this.importInput?.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      document.dispatchEvent(new CustomEvent('options-import', { detail: imported }));
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      console.error('Failed to import:', error);
    }
  }

  /**
 * Сохраняет данные.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
save(state) {
    return state;
  }
}
