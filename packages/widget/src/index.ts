import { installCustomFetch } from './cap/custom-fetch.js';
import { CaputchinWidget } from './elements/widget.js';
import { CaputchinGame } from './elements/game.js';

// cap.js loads its proof-of-work wasm and the pako inflate fallback from
// jsDelivr by default. The widget ships both next to its own bundle (copied
// into dist/ from the @cap.js/wasm + pako build deps by
// scripts/copy-cap-assets.mjs); this points cap.js at them relative to
// widget.mjs so the consumer's bundler re-emits them as same-origin assets.
// Net result: no third-party CDN reach, no hand-vendored consumer mirror, no
// consumer CSP change (the assets sit under the consumer's own origin). `??=`
// so a host that sets its own override still wins; window-guarded for SSR.
//
// ESM entry only (builds to widget.mjs). The IIFE entries (src/entries/*) set
// the same globals from document.currentScript.src via cap/asset-urls.ts,
// since a script-tag consumer has no bundler to emit the assets.
if (typeof window !== 'undefined') {
  window.CAP_CUSTOM_WASM_URL ??= new URL('./cap_wasm_bg.wasm', import.meta.url).href;
  window.CAP_PAKO_URL ??= new URL('./pako_inflate.min.js', import.meta.url).href;
}

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
  WidgetTrigger,
  WidgetWidth,
  WidgetHeight,
  WidgetSize,
} from './types.js';
export type { ErrorCode, ErrorSeverity } from './errors.js';
export type { WidgetConfig } from './config/widget.js';
export type { GameConfig } from './config/game.js';
