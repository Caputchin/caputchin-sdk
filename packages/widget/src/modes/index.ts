import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize } from '../config/shared.js';
import type { WidgetShell } from '../locale/widget-shell.js';
import type { WidgetShellSkin } from '../skin/widget-shell-skin.js';
import type { WidgetShellConfig } from '../configurations/widget-shell-config.js';
import { createInvisiblePresentation } from './invisible.js';
import { createSimplePresentation } from './simple.js';

export type PresentationState = 'idle' | 'verifying' | 'verified' | 'error';

export interface Presentation {
  /** Build any DOM into the widget shadow root or host. Called once. */
  mount(): void;
  /** Tear down DOM + listeners. Called on widget disconnect. */
  unmount(): void;
  /** Visual state feedback. */
  setState(state: PresentationState): void;
  /**
   * Register a user-activation handler (e.g. checkbox click). Presentations
   * with no clickable surface (invisible, simple-pill) return a no-op cleanup.
   * The `click` trigger relies on this; other triggers ignore it.
   */
  onActivate(handler: () => void): () => void;
  /**
   * Live-apply a new server-resolved skin to the ALREADY-mounted DOM, in place,
   * without a rebuild (so the verification session + solved state are untouched).
   * Recolors what CSS custom properties can't reach: the SVG shield
   * stroke/fill/glyph + spinner (baked raw at mount) and the brand logo asset.
   * CSS-var-driven surfaces recolor automatically when the owning element
   * rewrites the host `--cpt-skin-*` vars. No-op before mount.
   */
  applySkin(skin: WidgetShellSkin): void;
  /**
   * Live-apply a new server-resolved locale to the ALREADY-mounted DOM, in
   * place: visible strings, aria labels, and text direction (set AND removed).
   * No-op before mount.
   */
  applyLocale(shell: WidgetShell): void;
}

export interface PresentationFactoryInput {
  /** The custom-element host (used for host-level styling like full-width). */
  host: HTMLElement;
  /** Where to append DOM; shadow root by default; isolated from page CSS. */
  root: ShadowRoot;
  trigger: WidgetTrigger;
  width: WidgetWidth;
  /** Explicit pixel height. `null` means "auto"; fit to content. Applied to
   *  the host element so the brand strip can fill it. Game widget plumbs its
   *  own height into the iframe; cap-widget uses this only for simple mode. */
  height?: WidgetHeight;
  size: WidgetSize;
  /** Pre-resolved shell (strings + direction). Owner element resolves once
   *  from its `lang` attribute and threads the result down so every nested
   *  presentation shares the same locale. */
  shell: WidgetShell;
  /** Pre-resolved shell skin (mode + color palette). Owner element resolves
   *  once from its `skin` attribute and threads the result down so every
   *  nested presentation shares the same theme. CSS-var-driven colors apply
   *  to most surfaces; SVG presentation attributes (shield stroke / fill)
   *  consume the palette directly because CSS vars don't apply there. */
  skin: WidgetShellSkin;
  /** Pre-resolved widget shell configuration (brand strip link targets).
   *  Owner element resolves once from its `config` attribute (widget) or
   *  uses the bundled default (game). The brand strip reads
   *  `shellConfig.values.home_link` + `legal_link` to set `href` on the
   *  anchor tags. */
  shellConfig: WidgetShellConfig;
}

/**
 * Lightweight presentations for the cap widget. `invisible=true` mounts no
 * DOM; default mounts the checkbox + brand strip. Game presentation lives
 * in `./game.ts` (consumed by `<caputchin-game>`).
 */
export function createPresentation(invisible: boolean, input: PresentationFactoryInput): Presentation {
  return invisible ? createInvisiblePresentation() : createSimplePresentation(input);
}
