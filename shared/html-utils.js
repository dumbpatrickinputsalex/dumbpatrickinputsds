// shared/html-utils.js
/**
 * Экранирует HTML-сущности для безопасного вставления в DOM.
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 * @example
 * const safe = escapeHtml('<script>alert("xss")</script>');
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
