import type {
  ConfigPreset,
  ConfigSchemaEntry,
  LocalePreset,
  Layout,
  ResolvedConfig,
  ResolvedLocale,
  ResolvedSkin,
  SkinPreset,
  SkinSchemaEntry,
} from '@caputchin/game-sdk';

export interface KickoffMessage {
  kind: 'kickoff';
  seq: number;
  gameId: string | null;
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
  locales: { presets: Record<string, LocalePreset> } | null;
  /** Carries BOTH presets and schema, because the schema drives per-value
   *  type validation at resolve time (color / image / audio / video
   *  allow-list). The `locales` field has no analogue — locale text validation
   *  isn't type-based. */
  skins: {
    schema?: Record<string, SkinSchemaEntry>;
    presets: Record<string, SkinPreset>;
  } | null;
  /** Configurations block from the game's manifest. Carries schema + presets
   *  because schema drives runtime validation, parallel to skins. */
  configurations: {
    schema?: Record<string, ConfigSchemaEntry>;
    presets: Record<string, ConfigPreset>;
  } | null;
}

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
  | ManifestMessage
  | DimensionsMeasuredMessage;

const IFRAME_KINDS = new Set(['game-started', 'game-pass', 'game-error', 'manifest', 'dimensions-measured']);

export function isIframeToWidget(msg: unknown): msg is IframeToWidget {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return IFRAME_KINDS.has(m['kind'] as string) && typeof m['seq'] === 'number';
}
