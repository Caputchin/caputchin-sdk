import { installCustomFetch } from './cap/custom-fetch.js';
import { CaputchinElement } from './element.js';

installCustomFetch();

if (!customElements.get('caputchin-widget')) {
  customElements.define('caputchin-widget', CaputchinElement);
}

export type {
  CaputchinEventMap,
  StartEventDetail,
  PassEventDetail,
  NicknameEventDetail,
  ErrorEventDetail,
  LayoutResolvedEventDetail,
  CaputchinElementShape,
  Layout,
  LayoutAttr,
  LayoutSource,
  WidgetMode,
  WidgetTrigger,
} from './types.js';
export type { ErrorCode } from './errors.js';
export type { ParsedConfig } from './config.js';
export { CaputchinElement } from './element.js';
