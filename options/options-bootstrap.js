// options/options-bootstrap.js
import { OptionsApp } from './options-app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new OptionsApp();
  app.boot();
});
