export interface KickoffMessage {
  kind: 'kickoff';
  seq: number;
  gameId: string | null;
}

export interface DisposeMessage {
  kind: 'dispose';
  seq: number;
}

export type WidgetToIframe = KickoffMessage | DisposeMessage;

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

export type IframeToWidget = GameStartedMessage | GamePassMessage | GameErrorMessage;

const IFRAME_KINDS = new Set(['game-started', 'game-pass', 'game-error']);

export function isIframeToWidget(msg: unknown): msg is IframeToWidget {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return IFRAME_KINDS.has(m['kind'] as string) && typeof m['seq'] === 'number';
}
