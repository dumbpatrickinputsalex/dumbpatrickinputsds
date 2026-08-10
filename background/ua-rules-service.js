// background/ua-rules-service.js
export class UaRulesService {
  /**
 * Создаёт экземпляр класса.
 * @returns {void}
 */
constructor() {
    this.currentRules = [];
  }

  /**
 * Синхронизирует UA правила из состояния.
 * @param {*} state - Описание параметра.
 * @returns {void}
 */
async syncFromState(state) {
    const uaRules = state.uaRules || [];
    const rules = uaRules
      .filter(rule => rule.enabled !== false)
      .map((rule, index) => ({
        id: index + 1,
        priority: index + 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{ header: 'User-Agent', operation: 'set', value: rule.userAgent }],
        },
        condition: {
          urlFilter: rule.urlPattern || '*',
          resourceTypes: ['main_frame', 'sub_frame'],
        },
      }));

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: this.currentRules.map(r => r.id),
        addRules: rules,
      });
      this.currentRules = rules;
    } /**
 * Выполняет операцию "catch".
 * @param {*} error - Описание параметра.
 * @returns {void}
 */
catch (error) {
      console.error('Failed to update UA rules:', error);
    }
  }
}
