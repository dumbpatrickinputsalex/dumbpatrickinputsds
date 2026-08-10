// domain/generators/email-generator.js
export class EmailGenerator {
  generate(args, context) {
    const domains = ['example.com', 'test.com', 'mail.com'];
    const domain = args[0] || domains[Math.floor(Math.random() * domains.length)];
    const username = 'user' + Math.floor(Math.random() * 10000);
    return username + '@' + domain;
  }
}
