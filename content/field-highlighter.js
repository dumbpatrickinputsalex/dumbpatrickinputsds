// content/field-highlighter.js
export class FieldHighlighter {
  constructor() {
    this.highlightedElements = new WeakSet();
  }

  highlight(element) {
    if (!element) return;
    this._removeHighlight(element);

    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;

    element.style.outline = '2px solid #FF6B35';
    element.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';

    this.highlightedElements.set(element, {
      outline: originalOutline,
      background: originalBackground
    });

    setTimeout(() => {
      this._removeHighlight(element);
    }, 2000);
  }

  _removeHighlight(element) {
    if (!element) return;
    const data = this.highlightedElements.get(element);
    if (data) {
      element.style.outline = data.outline || '';
      element.style.backgroundColor = data.background || '';
      this.highlightedElements.delete(element);
    }
  }
}
