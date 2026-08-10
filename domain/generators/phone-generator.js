// domain/generators/phone-generator.js
export class PhoneGenerator {
  generate(args, context) {
    const format = args[0] || '+7 (XXX) XXX-XX-XX';
    const num = () => Math.floor(Math.random() * 10);
    return format.replace(/X/g, num);
  }
}
