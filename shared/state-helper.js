// shared/state-helper.js
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';

/**
 * Вспомогательный класс для работы с состоянием.
 */
export class StateHelper {
    constructor() {
        this.repository = new ChromeStorageRepository();
    }

    /**
     * Получает состояние из storage.
     * @returns {Promise<Object>} Состояние
     */
    async getState() {
        return this.repository.getState();
    }

    /**
     * Сохраняет состояние в storage.
     * @param {Object} state - Состояние
     * @returns {Promise<void>}
     */
    async saveState(state) {
        return this.repository.saveState(state);
    }

    /**
     * Обновляет состояние через мутатор.
     * @param {Function} mutator - Функция-мутатор
     * @returns {Promise<Object>} Обновлённое состояние
     */
    async updateState(mutator) {
        return this.repository.updateState(mutator);
    }

    /**
     * Получает активные правила для URL.
     * @param {Object} state - Состояние
     * @param {string} url - URL страницы
     * @param {UrlMatcher} urlMatcher - Экземпляр UrlMatcher
     * @returns {Array} Активные правила
     */
    getActiveRules(state, url, urlMatcher) {
        if (!state || !state.rules) return [];
        return state.rules.filter(rule => {
            if (!rule.urlConditions || rule.urlConditions.length === 0) return true;
            return urlMatcher.matchesConditions(rule.urlConditions, url);
        });
    }

    /**
     * Получает активные спецвставки для URL.
     * @param {Object} state - Состояние
     * @param {string} url - URL страницы
     * @param {UrlMatcher} urlMatcher - Экземпляр UrlMatcher
     * @returns {Array} Активные спецвставки
     */
    getActiveInsertions(state, url, urlMatcher) {
        if (!state || !state.specialInsertions) return [];
        return state.specialInsertions.filter(insertion => {
            if (!insertion.urlConditions || insertion.urlConditions.length === 0) return true;
            return urlMatcher.matchesConditions(insertion.urlConditions, url);
        });
    }

    /**
     * Обновляет счётчики в состоянии.
     * @param {Object} state - Состояние
     * @param {Object} counters - Новые счётчики
     * @returns {Object} Обновлённое состояние
     */
    updateCounters(state, counters) {
        state.counters = { ...state.counters, ...counters };
        return state;
    }
}
