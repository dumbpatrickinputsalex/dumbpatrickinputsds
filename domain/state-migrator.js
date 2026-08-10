// domain/state-migrator.js
export class StateMigrator {
  migrate(rawState) {
    const state = rawState || {};
    // Миграция из старых версий (profiles → folders + rules)
    if (state.profiles && Array.isArray(state.profiles)) {
      state.folders = state.profiles.map(p => ({
        id: p.id || 'folder_' + Date.now(),
        name: p.name || 'Folder',
        rules: p.rules || []
      }));
      state.rules = state.folders.flatMap(f => f.rules);
      delete state.profiles;
    }
    return this.ensureShape(state);
  }

  ensureShape(state) {
    const defaultState = {
      rules: [],
      folders: [],
      specialInsertions: [],
      smartCounters: [],
      snapshots: [],
      counters: {},
      customWordLists: [],
      scraperConfig: { enabled: false },
      copyfxConfig: { enabled: false },
      uaRules: [],
      pageShortcuts: [],
      activityLog: []
    };

    for (const key in defaultState) {
      if (!(key in state)) {
        state[key] = defaultState[key];
      }
    }
    return state;
  }
}
