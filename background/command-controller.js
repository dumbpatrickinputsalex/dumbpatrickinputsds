// background/command-controller.js
export class CommandController {
  constructor() {
    this.commands = {};
  }

  register(command, handler) {
    this.commands[command] = handler;
  }

  async handleCommand(command, tab) {
    const handler = this.commands[command];
    if (handler) {
      return handler(tab);
    }
    return { success: false, error: 'Unknown command' };
  }
}
