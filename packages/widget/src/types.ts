import type { ErrorCode } from './errors.js';

export interface StartEventDetail {
  gameId: string | null;
}

export interface CompleteEventDetail {
  token: string;
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

export interface CaputchinEventMap {
  start: CustomEvent<StartEventDetail>;
  complete: CustomEvent<CompleteEventDetail>;
  nickname: CustomEvent<NicknameEventDetail>;
  error: CustomEvent<ErrorEventDetail>;
}

export interface CaputchinElementShape extends HTMLElement {
  start(): void;
  complete(payload: { score: number | null; durationMs: number | null }): void;
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
