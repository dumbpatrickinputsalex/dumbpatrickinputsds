// background/message-proxy-controller.js
export class MessageProxyController {
  constructor() {
    this.handlers = {};
  }

  register(type, handler) {
    this.handlers[type] = handler;
  }

  async handleMessage(message, sender, sendResponse) {
    const handler = this.handlers[message.type];
    if (handler) {
      try {
        const result = await handler(message.payload, sender);
        sendResponse(result);
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }
    return false;
  }
}
