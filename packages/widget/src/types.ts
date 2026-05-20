import type { ErrorCode, ErrorSeverity } from './errors.js';
import type { Layout, LayoutAttr, LayoutSource } from './layout.js';
import type { WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight } from './config/shared.js';

export interface StartEventDetail {
  gameId: string | null;
}

export interface PassEventDetail {
  /** Wrapped token; null on `caputchin-game` without sitekey (game-only). */
  token: string | null;
  score: number | null;
  durationMs: number | null;
}

export interface NicknameEventDetail {
  nickname: string;
}

export interface ErrorEventDetail {
  code: ErrorCode;
  message: string;
  /** `warn` for graceful-degradation paths (invalid-config, invalid-call);
   *  `error` for hard failures (verification-failed, game-load-failed,
   *  game-error-relayed). Customers filter via this without keying off codes. */
  severity: ErrorSeverity;
  originalCode?: string;
}

export interface DialogVisibilityDetail {
  layout: 'modal' | 'fullscreen';
}

export interface LayoutResolvedEventDetail {
  layout: Layout;
  source: LayoutSource;
}

export type { Layout, LayoutAttr, LayoutSource, WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight };

export interface CaputchinEventMap {
  start: CustomEvent<StartEventDetail>;
  pass: CustomEvent<PassEventDetail>;
  nickname: CustomEvent<NicknameEventDetail>;
  error: CustomEvent<ErrorEventDetail>;
  'layout-resolved': CustomEvent<LayoutResolvedEventDetail>;
  // Game widget overlay (modal / fullscreen) dialog visibility hooks. Fire
  // on every show/hide path (programmatic, Escape key, backdrop click).
  'dialog-shown': CustomEvent<DialogVisibilityDetail>;
  'dialog-hidden': CustomEvent<DialogVisibilityDetail>;
}

/** Public shape of `<caputchin-widget>` — cap verification only. */
export interface CaputchinWidgetShape extends HTMLElement {
  start(): void;
  addEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinWidgetShape, ev: CaputchinEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinWidgetShape, ev: CaputchinEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

/** Public shape of `<caputchin-game>` — game host with optional verification.
 *  No `start()` — verification auto-kicks on mount for inline, on first
 *  dialog open for modal/fullscreen. */
export interface CaputchinGameShape extends HTMLElement {
  /** Manual mode (`trigger="manual"`) only — release the cap gate with the
   *  game payload and fire the `pass` event. */
  pass(payload?: { score?: number | null; durationMs?: number | null }): void;
  /** Manual mode only — abort cap verification + fire `game-error-relayed`. */
  fail(payload?: { code?: string; message?: string }): void;
  setNickname(letters: string): void;
  addEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinGameShape, ev: CaputchinEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinGameShape, ev: CaputchinEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'caputchin-widget': CaputchinWidgetShape;
    'caputchin-game': CaputchinGameShape;
  }
}
