import { CaputchinElement } from '../../src/element.js';

export function getTestElement(attrs: Record<string, string> = {}): CaputchinElement {
  if (!customElements.get('caputchin-widget')) {
    customElements.define('caputchin-widget', CaputchinElement);
  }
  const el = document.createElement('caputchin-widget') as CaputchinElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
