import { installCustomFetch } from '../cap/custom-fetch.js';
import { CaputchinWidget } from '../elements/widget.js';

installCustomFetch();

if (!customElements.get('caputchin-widget')) {
  customElements.define('caputchin-widget', CaputchinWidget);
}
