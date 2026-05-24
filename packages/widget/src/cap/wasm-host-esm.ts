// Point cap.js at the wasm + pako shipped in this package's dist, set BEFORE
// @cap.js/widget loads. The ESM entry (src/index.ts) imports this module FIRST,
// ahead of the element/cap.js chain, because @cap.js/widget reads
// window.CAP_CUSTOM_WASM_URL and eagerly loads its wasm at module-init: setting
// the override later (in the entry body, after the imports) is one tick too
// late and lets cap.js fall back to its jsDelivr default.
//
// `new URL(...)` resolves the dist-shipped assets relative to the built bundle
// so the consumer's bundler re-emits them same-origin (no jsDelivr reach, no
// consumer CSP change). `??=` so a host that set its own override still wins;
// window-guarded for SSR.
if (typeof window !== 'undefined') {
  window.CAP_CUSTOM_WASM_URL ??= new URL('./cap_wasm_bg.wasm', import.meta.url).href;
  window.CAP_PAKO_URL ??= new URL('./pako_inflate.min.js', import.meta.url).href;
}
