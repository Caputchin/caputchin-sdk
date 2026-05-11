import { installCustomFetch } from './cap/custom-fetch.js';
import { CaputchinElement } from './element.js';

installCustomFetch();

if (!customElements.get('caputchin')) {
  customElements.define('caputchin', CaputchinElement);
}

export type { CaputchinEventMap, StartEventDetail, CompleteEventDetail, NicknameEventDetail, ErrorEventDetail, CaputchinElementShape } from './types.js';
export type { ErrorCode } from './errors.js';
export type { ParsedConfig, WidgetMode } from './config.js';
export { CaputchinElement } from './element.js';
