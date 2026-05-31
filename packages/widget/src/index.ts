// MUST be the first import: it sets window.CAP_CUSTOM_WASM_URL before the
// element/cap.js chain below loads @cap.js/widget (which eagerly loads its
// wasm at module-init). See cap/wasm-host-esm.ts.
import './cap/wasm-host-esm.js';
import { defineCaputchinElements } from './register.js';
import { CaputchinWidget } from './elements/widget.js';
import { CaputchinGame } from './elements/game.js';

defineCaputchinElements();

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
  WidgetTrigger,
  WidgetWidth,
  WidgetHeight,
  WidgetSize,
} from './types.js';
export type { ErrorCode, ErrorSeverity } from './errors.js';
export type { WidgetConfig } from './config/widget.js';
export type { GameConfig, GameTrigger } from './config/game.js';
