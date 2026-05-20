import { installCustomFetch } from '../cap/custom-fetch.js';
import { CaputchinWidget } from '../elements/widget.js';
import { CaputchinGame } from '../elements/game.js';

installCustomFetch();

if (!customElements.get('caputchin-widget')) {
  customElements.define('caputchin-widget', CaputchinWidget);
}
if (!customElements.get('caputchin-game')) {
  customElements.define('caputchin-game', CaputchinGame);
}
