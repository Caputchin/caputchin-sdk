import type { ErrorCode } from './errors.js';
import type { Layout, LayoutAttr, LayoutSource } from './layout.js';
import type { WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight } from './config/shared.js';
import type { WidgetMode } from './config/widget.js';

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
  originalCode?: string;
}

export interface LayoutResolvedEventDetail {
  layout: Layout;
  source: LayoutSource;
}

export type { Layout, LayoutAttr, LayoutSource, WidgetMode, WidgetTrigger, WidgetWidth, WidgetSize, WidgetHeight };

export interface CaputchinEventMap {
  start: CustomEvent<StartEventDetail>;
  pass: CustomEvent<PassEventDetail>;
  nickname: CustomEvent<NicknameEventDetail>;
  error: CustomEvent<ErrorEventDetail>;
  'layout-resolved': CustomEvent<LayoutResolvedEventDetail>;
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

/** Public shape of `<caputchin-game>` — game host with optional verification. */
export interface CaputchinGameShape extends HTMLElement {
  start(): void;
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
