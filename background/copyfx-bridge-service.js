// background/copyfx-bridge-service.js
export class CopyfxBridgeService {
  async getTraders(payload) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.traders || null;
        }
      });

      return result?.[0]?.result || { error: 'No traders data found' };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getInvestors() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { error: 'No active tab found' };
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.__dpi_copyfx_cache?.investors || null;
        }
      });

      return result?.[0]?.result || { error: 'No investors data found' };
    } catch (error) {
      return { error: error.message };
    }
  }
}
