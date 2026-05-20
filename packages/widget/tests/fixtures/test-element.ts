import { CaputchinWidget } from '../../src/elements/widget.js';
import { CaputchinGame } from '../../src/elements/game.js';

export function getWidget(attrs: Record<string, string> = {}): CaputchinWidget {
  if (!customElements.get('caputchin-widget')) {
    customElements.define('caputchin-widget', CaputchinWidget);
  }
  const el = document.createElement('caputchin-widget') as CaputchinWidget;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function getGame(attrs: Record<string, string> = {}): CaputchinGame {
  if (!customElements.get('caputchin-game')) {
    customElements.define('caputchin-game', CaputchinGame);
  }
  const el = document.createElement('caputchin-game') as CaputchinGame;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
