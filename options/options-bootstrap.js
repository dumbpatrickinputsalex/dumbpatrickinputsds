// options/options-bootstrap.js
import { OptionsApp } from './options-app.js';
import { OPTIONS } from '../labels/options-labels.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new OptionsApp();
  app.boot();
});
