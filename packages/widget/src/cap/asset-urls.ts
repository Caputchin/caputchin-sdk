// cap.js loads its proof-of-work wasm and the pako inflate fallback from
// jsDelivr by default. The widget ships both next to its own bundle (copied
// into dist/ from the @cap.js/wasm + pako build deps by
// scripts/copy-cap-assets.mjs). This points cap.js at them relative to the
// running script's URL, so they load from the same origin the script itself
// loaded from (a jsDelivr <script>, or a self-hosted copy). Used by the IIFE
// entry, which has no import.meta and so derives its base from
// document.currentScript.src. The ESM entry (src/index.ts) does the equivalent
// via `new URL('./cap_wasm_bg.wasm', import.meta.url)` so a bundler re-emits
// the assets same-origin.
//
// `??=` so a host that sets its own override (e.g. a self-hosted path) still
// wins; no-op without a base URL, leaving cap.js on its jsDelivr default.
export function setCapAssetUrlsFrom(baseUrl: string | null | undefined): void {
  if (typeof window === 'undefined' || !baseUrl) return;
  window.CAP_CUSTOM_WASM_URL ??= new URL('./cap_wasm_bg.wasm', baseUrl).href;
  window.CAP_PAKO_URL ??= new URL('./pako_inflate.min.js', baseUrl).href;
}
