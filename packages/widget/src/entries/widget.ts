import { installCustomFetch } from '../cap/custom-fetch.js';
import { setCapAssetUrlsFrom } from '../cap/asset-urls.js';
import { CaputchinWidget } from '../elements/widget.js';

// Point cap.js at the wasm + pako shipped next to this script. Read
// currentScript synchronously at load time, before any solve runs.
setCapAssetUrlsFrom(
  typeof document !== 'undefined'
    ? (document.currentScript as HTMLScriptElement | null)?.src
    : undefined,
);

installCustomFetch();

if (!customElements.get('caputchin-widget')) {
  customElements.define('caputchin-widget', CaputchinWidget);
}
