import { defineCaputchinElements } from '../register.js';
import { setCapAssetUrlsFrom } from '../cap/asset-urls.js';

// Single IIFE entry (builds to widget.js); registers both <caputchin-widget>
// and <caputchin-game>. Script-tag / jsDelivr consumers load this one file.
//
// Point cap.js at the wasm + pako shipped next to this script. Read
// currentScript synchronously at load time, before any solve runs; a
// script-tag consumer has no bundler to emit the assets same-origin.
setCapAssetUrlsFrom(
  typeof document !== 'undefined'
    ? (document.currentScript as HTMLScriptElement | null)?.src
    : undefined,
);

defineCaputchinElements();
