import { inspectGameConfig, shouldVerify } from '../config/game.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { LayoutAttr } from '../layout.js';
import { fireError } from '../errors.js';
import { resolveWidgetShell } from '../locale/widget-shell.js';
import { resolveWidgetShellSkin } from '../skin/widget-shell-skin.js';
import { applySkinVars } from '../skin/css-vars.js';
import { resolveWidgetShellConfig } from '../configurations/widget-shell-config.js';
import { createGamePresentation } from '../modes/game.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { GameConfig } from '../config/game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';
import { runManual } from '../verify/run-manual.js';
import { fetchBootstrap } from '../bootstrap/client.js';
import type { OverridesPerAxis } from '../bootstrap/types.js';
import type { LocalePreset, SkinPreset } from '@caputchin/game-sdk';

/**
 * `<caputchin-game>`; game host with optional cap verification.
 *   - sitekey present → cap.solve runs alongside the game.
 *   - sitekey absent → game-only (no verification, `pass` event carries
 *     `token: null`).
 *
 * Layout drives rendering. Trigger is implicit per layout except for the
 * `trigger="manual"` escape hatch:
 *   - `inline` (default) → iframe up on mount, trigger=auto.
 *   - `modal` / `fullscreen` → checkbox entry, iframe opens on click.
 *   - `trigger="manual"` → no iframe; customer slots custom game DOM into
 *     the layout shell via the default `<slot>`. Methods `start` / `pass`
 *     / `fail` drive the lifecycle.
 */
export class CaputchinGame extends HTMLElement {
  static observedAttributes = ['sitekey', 'no-verify', 'trigger', 'width', 'height', 'game', 'games', 'game-src', 'layout', 'locale', 'skin'];

  private state: WidgetState<GameConfig> = createInitialState<GameConfig>();

  connectedCallback(): void {
    const state = this.state;
    state.connected = true;

    installGameMethods(this, state, __CAPUTCHIN_API_HOST__);

    const inspection = inspectGameConfig(this);
    for (const issue of inspection.issues) {
      fireError(this, 'invalid-config', issue.message);
    }
    if (inspection.inert) return;

    state.config = inspection.config;
    const apiHost = __CAPUTCHIN_API_HOST__;
    // Shadow attaches synchronously so the host keeps its layout box during
    // the bootstrap wait. Empty shadow until bootstrap completes per ADR-0059.
    this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Warn (but keep widget running) if non-manual mode receives slotted
    // children; they'd never appear without a <slot>. Manual is the only
    // mode where customer DOM gets projected into the shell.
    const isManual = state.config.trigger === 'manual';
    if (!isManual && this.childElementCount > 0) {
      fireError(this, 'invalid-config', 'Light DOM children on <caputchin-game> are ignored unless trigger="manual"');
    }

    // Bundled cascade once for hint extraction (sitekey + game both feed
    // the bootstrap call). If sitekey is absent (game-only path), skip
    // bootstrap entirely — overrides are gated by sitekey/plan-tier and
    // there's nothing to fetch.
    const rawLocale = state.config.locale;
    const inlineSignals = rawLocale ? deriveShellSignals(rawLocale) : { hint: null, direction: null };
    const skinThemeHint = state.config.skin ? deriveShellSkinHint(state.config.skin) : null;
    const hintShell = resolveWidgetShell(inlineSignals.hint);
    const hintSkin = resolveWidgetShellSkin(skinThemeHint);

    if (state.config.sitekey === null) {
      this.completeMount(apiHost, null, inlineSignals, skinThemeHint);
      return;
    }

    void fetchBootstrap({
      apiHost,
      sitekey: state.config.sitekey,
      game: state.config.game ?? null,
      localeLang: hintShell.lang,
      skinTheme: hintSkin.theme,
    }).then((bootstrap) => {
      if (!this.state.connected || !this.state.config) return;
      // Game-scope override banks ride to the iframe via state; the shell
      // around the game still consumes only the widget block (its _theme /
      // _lang signals), same as before.
      this.state.gameOverrides = bootstrap?.game?.overrides ?? null;
      // The same bootstrap response already carries the marketplace bundle
      // url + integrity for state.config.game — stash it (tagged with that
      // id) so the game-load path can skip a second /widget/bootstrap call.
      this.state.gameBundle = bootstrap?.game
        ? { gameId: this.state.config.game, url: bootstrap.game.url, integrity: bootstrap.game.integrity }
        : null;
      this.completeMount(apiHost, bootstrap?.widget?.overrides ?? null, inlineSignals, skinThemeHint);
    });
  }

  private completeMount(
    apiHost: string,
    overrides: OverridesPerAxis | null,
    inlineSignals: ShellSignals,
    skinThemeHint: string | null,
  ): void {
    const state = this.state;
    if (!state.config) return;
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const localeOverride = (overrides?.locale?.presets ?? null) as Record<string, LocalePreset> | null;
    const skinOverride = (overrides?.skin?.presets ?? null) as Record<string, SkinPreset> | null;
    const isManual = state.config.trigger === 'manual';
    const layout: 'inline' | 'modal' | 'fullscreen' = resolveLayout(state.config.layout);
    const derivedTrigger: WidgetTrigger = layout === 'inline' ? 'auto' : 'click';

    const baseShell = resolveWidgetShell(inlineSignals.hint, undefined, localeOverride);
    const shell = inlineSignals.direction
      ? { ...baseShell, direction: inlineSignals.direction }
      : baseShell;
    for (const message of baseShell.issues) {
      fireError(this, 'invalid-config', message);
    }
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const skin = resolveWidgetShellSkin(skinThemeHint, undefined, skinOverride);
    for (const message of skin.issues) {
      fireError(this, 'invalid-config', message);
    }
    this.setAttribute('data-skin-theme', skin.theme);
    applySkinVars(this, skin.palette);

    // Widget shell config (brand link targets) on the game element always
    // uses the bundled default. The customer's `config` attribute on
    // `<caputchin-game>` drives the GAME's configurations only (see
    // install-game-frame). There's no cross-cutting dimension between
    // game configurations and widget shell configurations. Widget shell
    // configurations CAN still be overridden via the bootstrap response's
    // widget.overrides.configuration block — same as on `<caputchin-widget>`.
    const widgetConfigOverride = (overrides?.configuration?.presets ?? null) as Parameters<typeof resolveWidgetShellConfig>[0];
    const shellConfig = resolveWidgetShellConfig(widgetConfigOverride);
    for (const message of shellConfig.issues) {
      fireError(this, 'invalid-config', message);
    }

    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: state.config.width,
      height: state.config.height,
      layout,
      manual: isManual,
      shell,
      skin,
      shellConfig,
    });
    state.gamePresentation = gp;
    gp.mount();

    // Game-only path (no verification gate): mount + run, no trigger axis.
    // Covers both no-sitekey and explicit `no-verify` (with a sitekey, whose
    // overrides were still fetched above). Modal/fullscreen fall through to
    // the trigger so the game opens on click — it just won't run the gate.
    if (!shouldVerify(state.config) && !isManual) {
      runGame(this, state, apiHost).catch(() => {});
      return;
    }

    state.trigger = createTriggerStrategy(derivedTrigger);
    state.triggerCtx = {
      el: this,
      presentation: gp,
      runVerification: () => {
        if (isManual) {
          runManual(this, state, apiHost);
          return Promise.resolve();
        }
        return runGame(this, state, apiHost);
      },
      capClient: null,
    };

    state.trigger.activate(state.triggerCtx);

    // For inline (manual or iframe) verification auto-kicks on mount via the
    // auto trigger above. For modal/fullscreen the simple-click entry opens
    // the dialog AND fires the trigger on the first click. No start() exists
    // on this widget; pass() / fail() drive completion in manual mode.
  }

  disconnectedCallback(): void {
    const s = this.state;
    s.trigger?.deactivate();
    s.gamePresentation?.unmount();
    s.capClient?.dispose();
    s.iframeHost?.dispose();
    // Null out the bag's fields BEFORE swapping so closures captured by
    // installGameMethods see inert state.
    s.config = null;
    s.trigger = null;
    s.triggerCtx = null;
    s.capClient = null;
    s.iframeHost = null;
    s.gamePresentation = null;
    s.widgetId = null;
    s.lockedToken = null;
    s.gameStartedEmitted = false;
    s.gameErrored = false;
    s.firstPassFired = false;
    s.connected = false;
    this.state = createInitialState<GameConfig>();
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight; ignored`);
    }
  }
}

interface ShellSignals {
  /** Preset name / ISO to feed to `resolveWidgetShell`. `null` ⇒ browser auto. */
  hint: string | null;
  /** Explicit direction override pulled from inline JSON's `_direction`.
   *  Applied on top of the shell's own resolved direction. */
  direction: 'ltr' | 'rtl' | null;
}

/** Pull shell-relevant signals out of the customer's `lang` attribute.
 *  Non-JSON values pass through verbatim as the hint (no direction
 *  override). Inline JSON contributes `_lang` / `_extends` as the hint AND
 *  `_direction` as an explicit override. Malformed JSON yields no signals
 *  (shell falls back to browser auto; the game-side resolver emits the
 *  parse issue). */
function deriveShellSignals(raw: string): ShellSignals {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return { hint: raw, direction: null };
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { return { hint: null, direction: null }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { hint: null, direction: null };
  }
  const obj = parsed as Record<string, unknown>;
  let hint: string | null = null;
  if (typeof obj._lang === 'string' && obj._lang.length > 0) hint = obj._lang;
  else if (typeof obj._extends === 'string' && obj._extends.length > 0) hint = obj._extends;
  const direction = obj._direction === 'rtl' || obj._direction === 'ltr' ? obj._direction : null;
  return { hint, direction };
}

/** Pull a mode hint from the customer's `skin` attribute for the widget
 *  shell. The shell never consumes per-key overrides; it just needs to
 *  know whether to render light or dark. For non-JSON values the raw
 *  string passes through (light/dark/auto/preset-name). For inline JSON
 *  we extract `_theme`, falling back to `_extends` if it names a mode
 *  shortcut. Malformed JSON yields `null` → shell auto. */
function deriveShellSkinHint(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return raw;
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (obj._theme === 'light' || obj._theme === 'dark') return obj._theme;
  if (obj._extends === 'light' || obj._extends === 'dark') return obj._extends;
  return null;
}

function resolveLayout(attr: LayoutAttr): 'inline' | 'modal' | 'fullscreen' {
  return attr === 'auto' ? 'inline' : attr;
}
