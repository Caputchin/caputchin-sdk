// IIFE counterpart to wasm-host-esm: the single IIFE entry (src/entries/widget.ts)
// imports this FIRST, ahead of the element/cap.js chain, so the override is set
// before @cap.js/widget eagerly loads its wasm at module-init. A script-tag
// bundle has no import.meta, so the base is the URL the <script> itself loaded
// from (document.currentScript.src), next to which the wasm + pako ship.
import { setCapAssetUrlsFrom } from './asset-urls.js';

if (typeof document !== 'undefined') {
  setCapAssetUrlsFrom((document.currentScript as HTMLScriptElement | null)?.src);
}
