// background/content-script-injector.js
export class ContentScriptInjector {
  constructor() {
    this.injectedTabs = new Set();
  }

  async ensureInjected(tabId) {
    if (this.injectedTabs.has(tabId)) return true;

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'lib/generators.js',
          'lib/template.js',
          'lib/matcher.js',
          'content/picker.js',
          'content/content.js'
        ]
      });
      this.injectedTabs.add(tabId);
      return true;
    } catch (error) {
      console.error('Failed to inject content scripts:', error);
      return false;
    }
  }

  async injectCopyfxInterceptor(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        files: ['content/copyfx-interceptor.js']
      });
      return true;
    } catch (error) {
      console.error('Failed to inject CopyFX interceptor:', error);
      return false;
    }
  }

  clear(tabId) {
    this.injectedTabs.delete(tabId);
  }
}
