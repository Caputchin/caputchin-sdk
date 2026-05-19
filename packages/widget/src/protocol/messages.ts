import type { Layout } from '@caputchin/game-sdk';

export interface KickoffMessage {
  kind: 'kickoff';
  seq: number;
  gameId: string | null;
}

export interface DisposeMessage {
  kind: 'dispose';
  seq: number;
}

export interface LayoutContextMessage {
  kind: 'layout-context';
  seq: number;
  layout: Layout;
}

export type WidgetToIframe = KickoffMessage | DisposeMessage | LayoutContextMessage;

export interface GameStartedMessage {
  kind: 'game-started';
  seq: number;
}

export interface GamePassMessage {
  kind: 'game-pass';
  seq: number;
  score: number | null;
  durationMs: number | null;
}

export interface GameErrorMessage {
  kind: 'game-error';
  seq: number;
  code: string;
  message: string;
}

export interface ManifestMessage {
  kind: 'manifest';
  seq: number;
  gameId: string | null;
  preferredLayout: Layout | null;
  preferredWidth: number | null;
  preferredHeight: number | null;
}

export type IframeToWidget =
  | GameStartedMessage
  | GamePassMessage
  | GameErrorMessage
  | ManifestMessage;

const IFRAME_KINDS = new Set(['game-started', 'game-pass', 'game-error', 'manifest']);

export function isIframeToWidget(msg: unknown): msg is IframeToWidget {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return IFRAME_KINDS.has(m['kind'] as string) && typeof m['seq'] === 'number';
}
