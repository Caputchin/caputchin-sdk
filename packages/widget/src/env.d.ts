declare const __CAPUTCHIN_API_HOST__: string;
declare const __IFRAME_RUNTIME__: string;
declare const __IFRAME_RUNTIME_SHA256__: string;

// SVG files are inlined as data URIs by tsup's `dataurl` loader (configured
// in tsup.config.ts).
declare module '*.svg' {
  const dataUri: string;
  export default dataUri;
}
