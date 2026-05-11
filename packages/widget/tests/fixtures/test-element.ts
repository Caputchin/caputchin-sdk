import { CaputchinElement } from '../../src/element.js';

let registered = false;

export function getTestElement(attrs: Record<string, string> = {}): CaputchinElement {
  if (!customElements.get('cap-utchin-test')) {
    customElements.define('cap-utchin-test', CaputchinElement);
    registered = true;
  }
  const el = document.createElement('cap-utchin-test') as CaputchinElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
