import type { ErrorCode } from './errors.js';
import type { Layout, LayoutAttr, LayoutSource } from './layout/types.js';
import type { WidgetMode, WidgetTrigger } from './config.js';

export interface StartEventDetail {
  gameId: string | null;
}

export interface PassEventDetail {
  /** Wrapped token; null in `game-only` mode where no verification runs. */
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

export type { Layout, LayoutAttr, LayoutSource, WidgetMode, WidgetTrigger };

export interface CaputchinEventMap {
  start: CustomEvent<StartEventDetail>;
  pass: CustomEvent<PassEventDetail>;
  nickname: CustomEvent<NicknameEventDetail>;
  error: CustomEvent<ErrorEventDetail>;
  'layout-resolved': CustomEvent<LayoutResolvedEventDetail>;
}

export interface CaputchinElementShape extends HTMLElement {
  start(): void;
  pass(payload?: { score?: number | null; durationMs?: number | null }): void;
  setNickname(letters: string): void;
  addEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinElementShape, ev: CaputchinEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof CaputchinEventMap>(
    type: K,
    listener: (this: CaputchinElementShape, ev: CaputchinEventMap[K]) => void,
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
    'caputchin-widget': CaputchinElementShape;
  }
}
