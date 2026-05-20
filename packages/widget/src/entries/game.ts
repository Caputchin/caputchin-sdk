import { installCustomFetch } from '../cap/custom-fetch.js';
import { CaputchinGame } from '../elements/game.js';

installCustomFetch();

if (!customElements.get('caputchin-game')) {
  customElements.define('caputchin-game', CaputchinGame);
}
