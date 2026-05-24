declare const __CAPUTCHIN_API_HOST__: string;
declare const __IFRAME_RUNTIME__: string;
declare const __IFRAME_RUNTIME_SHA256__: string;

// cap.js reads these lazily on its first wasm/pako load; src/index.ts sets them
// to the bundled @cap.js/wasm + pako asset URLs so cap.js never reaches jsDelivr.
interface Window {
  CAP_CUSTOM_WASM_URL?: string;
  CAP_PAKO_URL?: string;
}

// SVG files are inlined as data URIs by tsup's `dataurl` loader (configured
// in tsup.config.ts).
declare module '*.svg' {
  const dataUri: string;
  export default dataUri;
}
