// background/background-app.js
import { ContentScriptInjector } from './content-script-injector.js';
import { CommandController } from './command-controller.js';
import { UaRulesService } from './ua-rules-service.js';
import { CopyfxBridgeService } from './copyfx-bridge-service.js';
import { MessageProxyController } from './message-proxy-controller.js';
import { ChromeStorageRepository } from '../infrastructure/chrome-storage-repository.js';
import { StateMigrator } from '../domain/state-migrator.js';
import { DEFAULT_STATE } from '../domain/state-schema.js';

export class BackgroundApp {
  constructor() {
    this.storage = new ChromeStorageRepository();
    this.migrator = new StateMigrator();
    this.injector = new ContentScriptInjector();
    this.commandController = new CommandController();
    this.uaService = new UaRulesService();
    this.copyfxService = new CopyfxBridgeService();
    this.messageProxy = new MessageProxyController();

    this._setupCommands();
    this._setupMessageHandlers();
  }

  async boot() {
    // Инициализируем состояние
    const state = await this.storage.getState();
    if (!state) {
      await this.storage.saveState(this.migrator.ensureShape(DEFAULT_STATE));
    } else {
      const migrated = this.migrator.migrate(state);
      await this.storage.saveState(migrated);
    }

    // Синхронизируем UA правила
    const currentState = await this.storage.getState();
    await this.uaService.syncFromState(currentState);

    // Регистрируем обработчики команд
    chrome.commands.onCommand.addListener((command) => {
      this._handleCommand(command);
    });
  }

  _setupCommands() {
    this.commandController.register('fill-all', async (tab) => {
      await this.injector.ensureInjected(tab.id);
      await this._sendToTab(tab.id, { type: 'FILL_ALL' });
    });

    this.commandController.register('fill-special', async (tab) => {
      await this.injector.ensureInjected(tab.id);
      await this._sendToTab(tab.id, { type: 'FILL_SPECIAL' });
    });
  }

  _setupMessageHandlers() {
    this.messageProxy.register('COPYFX_GET_TRADERS', async (payload) => {
      return this.copyfxService.getTraders(payload);
    });

    this.messageProxy.register('COPYFX_GET_INVESTORS', async () => {
      return this.copyfxService.getInvestors();
    });

    this.messageProxy.register('PROXY_TO_TAB', async (payload, sender) => {
      const tabId = sender?.tab?.id;
      if (!tabId) return { error: 'No tab id' };
      await this.injector.ensureInjected(tabId);
      return this._sendToTab(tabId, payload);
    });

    // Регистрируем обработчик в Chrome
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.messageProxy.handleMessage(message, sender, sendResponse);
    });
  }

  async _handleCommand(command) {
    const tab = await this._getActiveTab();
    if (!tab) return;

    if (!this._isSupportedUrl(tab.url)) {
      console.warn('Command not supported on this URL:', tab.url);
      return;
    }

    await this.commandController.handleCommand(command, tab);
  }

  async _sendToTab(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('Failed to send message to tab:', error);
      return { error: error.message };
    }
  }

  async _getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  _isSupportedUrl(url) {
    if (!url) return false;
    const unsupported = [
      'chrome://', 'edge://', 'about:', 'chrome-extension://'
    ];
    return !unsupported.some(u => url.startsWith(u));
  }
}
