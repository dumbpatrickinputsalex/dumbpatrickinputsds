// domain/generators/phone-generator.js
export class PhoneGenerator {
  /**
 * Генерирует значение для токена.
 * @param {*} args - Описание параметра.
 * @param {*} context - Описание параметра.
 * @returns {void}
 */
generate(args, context) {
    const format = args[0] || '+7 (XXX) XXX-XX-XX';
    const num = () => Math.floor(Math.random() * 10);
    return format.replace(/X/g, num);
  }
}
