import type { ErrorCode, ErrorSeverity } from './errors.js';
import type { Layout, LayoutAttr, LayoutSource } from './layout.js';
import type { WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight } from './config/shared.js';

/** Payload (`event.detail`) of the `start` event, fired when verification begins. */
export interface StartEventDetail {
  /** The game identifier for a game round, or `null` for the plain
   *  verification widget. */
  gameId: string | null;
}

/** Payload of the `pass` event, fired when verification is released. */
export interface PassEventDetail {
  /** Wrapped token; null on `caputchin-game` without sitekey (game-only). */
  token: string | null;
  /** Client-reported score, for analytics only. May be `null`. Never a trust
   *  signal: the gate is the server's replay, not this value. */
  score: number | null;
  /** Client-reported solve duration in milliseconds, for analytics only. May
   *  be `null`. */
  durationMs: number | null;
}

/** Payload of the `nickname` event. */
export interface NicknameEventDetail {
  /** The nickname the visitor entered. */
  nickname: string;
}

/** Payload of the `error` event, spanning benign config warnings to hard failures. */
export interface ErrorEventDetail {
  /** Stable code you branch on (for example `invalid-config`,
   *  `verification-failed`, `game-load-failed`). */
  code: ErrorCode;
  /** Human-readable description of what happened. */
  message: string;
  /** `warn` for graceful-degradation paths (invalid-config, invalid-call);
   *  `error` for hard failures (verification-failed, game-load-failed,
   *  gate-unavailable, game-error-relayed). Customers filter via this without
   *  keying off codes. */
  severity: ErrorSeverity;
  /** Present when `code` is a generalization of a more specific internal
   *  reason; carries that raw reason for diagnostics only. */
  originalCode?: string;
}

/** Payload of the `dialog-shown` / `dialog-hidden` events (game overlay layouts). */
export interface DialogVisibilityDetail {
  /** Which overlay layout the dialog uses: `modal` or `fullscreen`. */
  layout: 'modal' | 'fullscreen';
}

/** Payload of the `layout-resolved` event: the layout the widget settled on and why. */
export interface LayoutResolvedEventDetail {
  /** The resolved layout. */
  layout: Layout;
  /** Where the resolved layout came from (attribute, default, etc.). */
  source: LayoutSource;
}

export type { Layout, LayoutAttr, LayoutSource, WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight };

/** Map of every event the Caputchin widget elements emit to its `CustomEvent` type. */
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

/** Public shape of `<caputchin-widget>`; cap verification only. */
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

/** Public shape of `<caputchin-game>`; game host with optional verification.
 *  No `start()`; verification auto-kicks on mount for inline, on first
 *  dialog open for modal/fullscreen. */
export interface CaputchinGameShape extends HTMLElement {
  /** Manual mode (`trigger="manual"`) only; release the cap gate with the
   *  game payload and fire the `pass` event. */
  pass(payload?: { score?: number | null; durationMs?: number | null }): void;
  /** Manual mode only; abort cap verification + fire `game-error-relayed`. */
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
