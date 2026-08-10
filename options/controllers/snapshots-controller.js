import { OPTIONS } from '../labels/options-labels.js';
﻿// options/controllers/snapshots-controller.js
export class SnapshotsController {
  constructor() {
    this.snapshots = [];
    this.container = document.getElementById('snapshotsContainer');
  }

  init(state) {
    this.snapshots = state.snapshots || [];
    this.render();
    this._bindEvents();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.snapshots.forEach((snapshot, index) => {
      const card = this._createCard(snapshot, index);
      this.container.appendChild(card);
    });
  }

  _createCard(snapshot, index) {
    const card = document.createElement('div');
    card.className = 'snapshot-card';
    card.dataset.index = index;
    const escapedName = this._escapeHtml(snapshot.name || 'Снапшот ' + (index + 1));
    const date = snapshot.date ? new Date(snapshot.date).toLocaleDateString() : 'Дата неизвестна';
    card.innerHTML = \
      <div class="snapshot-header">
        <span class="snapshot-name">\</span>
        <span class="snapshot-date">\</span>
        <button class="snapshot-delete" data-index="\">×</button>
      </div>
      <div class="snapshot-body">
        <button class="snapshot-restore" data-index="\">OPTIONS.SNAPSHOTS_RESTORE</button>
      </div>
    \;
    return card;
  }

  _bindEvents() {
    this.container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('snapshot-delete')) {
        const index = parseInt(e.target.dataset.index);
        this.snapshots.splice(index, 1);
        this.render();
        this._save();
      }
      if (e.target.classList.contains('snapshot-restore')) {
        const index = parseInt(e.target.dataset.index);
        const snapshot = this.snapshots[index];
        if (snapshot) {
          document.dispatchEvent(new CustomEvent('options-restore', { detail: snapshot }));
        }
      }
    });
    const addBtn = document.getElementById('addSnapshotBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.snapshots.push({
          name: 'Снапшот ' + (this.snapshots.length + 1),
          date: new Date().toISOString(),
          data: {}
        });
        this.render();
        this._save();
      });
    }
  }

  save(state) {
    state.snapshots = this.snapshots;
    return state;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _save() {
    document.dispatchEvent(new Event('options-save'));
  }
}
