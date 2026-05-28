import type { Layout, ResolvedConfig, ResolvedLocale, ResolvedSkin, Seed } from '@caputchin/game-sdk';

export interface KickoffMessage {
  kind: 'kickoff';
  seq: number;
  gameId: string | null;
  /** Per-round replay seed handed to the game so its live run is deterministic
   *  under the same seed the server re-derives at replay. Null for a
   *  gameless/no-verify mount. */
  seed: Seed | null;
  locale: ResolvedLocale | null;
  skin: ResolvedSkin | null;
  config: ResolvedConfig | null;
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

export interface VisibilityMessage {
  kind: 'visibility';
  seq: number;
  visible: boolean;
}

export type WidgetToIframe = KickoffMessage | DisposeMessage | LayoutContextMessage | VisibilityMessage;

export interface GameStartedMessage {
  kind: 'game-started';
  seq: number;
}

export interface GamePassMessage {
  kind: 'game-pass';
  seq: number;
  /** The opaque trace of the completed play. The widget forwards it to
   *  /verify/pass; the server replays it for the authoritative verdict. The
   *  game reports no score here - the gate is the server replay. */
  trace: string;
}

export interface GameErrorMessage {
  kind: 'game-error';
  seq: number;
  code: string;
  message: string;
}

// The game→widget ManifestMessage is gone. The server resolves presets + the
// preferred footprint (in the bootstrap response), so the game no longer posts
// its manifest up to the widget. The game→widget channel keeps only its
// lifecycle + sizing messages.

/** Initial-render size measurement / explicit `bridge.setSize()` from the
 *  game. Widget re-applies via IframeHost.setSize so the iframe fits the
 *  actual content. Fires at most a few times during initial render; not
 *  intended as a mid-game live-resize channel (per design; games that
 *  resize their viewport mid-session are an antipattern). */
export interface DimensionsMeasuredMessage {
  kind: 'dimensions-measured';
  seq: number;
  width: number;
  height: number;
  /** 'auto' = ResizeObserver picked up an intrinsic size; 'explicit' = game
   *  called bridge.setSize(). Lets the host log/debug which source won. */
  source: 'auto' | 'explicit';
}

export type IframeToWidget =
  | GameStartedMessage
  | GamePassMessage
  | GameErrorMessage
  | DimensionsMeasuredMessage;

const IFRAME_KINDS = new Set(['game-started', 'game-pass', 'game-error', 'dimensions-measured']);

export function isIframeToWidget(msg: unknown): msg is IframeToWidget {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return IFRAME_KINDS.has(m['kind'] as string) && typeof m['seq'] === 'number';
}
