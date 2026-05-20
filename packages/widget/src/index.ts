import { installCustomFetch } from './cap/custom-fetch.js';
import { CaputchinWidget } from './elements/widget.js';
import { CaputchinGame } from './elements/game.js';

installCustomFetch();

if (typeof customElements !== 'undefined') {
  if (!customElements.get('caputchin-widget')) {
    customElements.define('caputchin-widget', CaputchinWidget);
  }
  if (!customElements.get('caputchin-game')) {
    customElements.define('caputchin-game', CaputchinGame);
  }
}

export { CaputchinWidget, CaputchinGame };
export type {
  CaputchinEventMap,
  CaputchinWidgetShape,
  CaputchinGameShape,
  StartEventDetail,
  PassEventDetail,
  NicknameEventDetail,
  ErrorEventDetail,
  DialogVisibilityDetail,
  LayoutResolvedEventDetail,
  Layout,
  LayoutAttr,
  LayoutSource,
  WidgetMode,
  WidgetTrigger,
  WidgetWidth,
  WidgetHeight,
  WidgetSize,
} from './types.js';
export type { ErrorCode, ErrorSeverity } from './errors.js';
export type { WidgetConfig } from './config/widget.js';
export type { GameConfig } from './config/game.js';
