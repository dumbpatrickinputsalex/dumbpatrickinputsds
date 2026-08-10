// popup/popup-bootstrap.js
import { PopupApp } from './popup-app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  app.boot();
});
