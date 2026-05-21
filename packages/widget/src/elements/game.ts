import { inspectGameConfig } from '../config/game.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { LayoutAttr } from '../layout.js';
import { fireError } from '../errors.js';
import { resolveWidgetShell } from '../lang/widget-shell.js';
import { createGamePresentation } from '../modes/game.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { GameConfig } from '../config/game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';
import { runManual } from '../verify/run-manual.js';

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
  static observedAttributes = ['sitekey', 'trigger', 'width', 'height', 'game', 'games', 'game-src', 'layout', 'lang'];

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
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    const layout: 'inline' | 'modal' | 'fullscreen' = resolveLayout(state.config.layout);
    const isManual = state.config.trigger === 'manual';
    const derivedTrigger: WidgetTrigger = layout === 'inline' ? 'auto' : 'click';

    // Warn (but keep widget running) if non-manual mode receives slotted
    // children; they'd never appear without a <slot>. Manual is the only
    // mode where customer DOM gets projected into the shell.
    if (!isManual && this.childElementCount > 0) {
      fireError(this, 'invalid-config', 'Light DOM children on <caputchin-game> are ignored unless trigger="manual"');
    }

    // Resolve shell from the same `lang` attribute so the widget's own UI
    // strings (Verify label, brand, close button) match the customer's
    // locale choice. Inline JSON is valid on the game side but not on the
    // shell side — so we don't pass the JSON through verbatim. Instead we
    // pull TWO signals out of inline payloads:
    //   1. A locale hint (`_iso` first, then `_extends`) used as the
    //      shell's preset selector. Declaring `_iso: "ar"` for the game
    //      implies the surrounding shell should also resolve to ar.
    //   2. An explicit direction override (`_direction`). Always wins
    //      over the resolved shell's direction. Useful for the case
    //      `{ _direction: "rtl", ... }` — customer wants the shell to
    //      flip RTL without picking a specific Arabic locale.
    // Neither signal present → shell falls back to browser auto.
    // Malformed JSON also falls back silently (the game-side resolveLanguage
    // already emits a parse issue).
    const rawLang = state.config.lang;
    const inlineSignals = rawLang ? deriveShellSignals(rawLang) : { hint: null, direction: null };
    const baseShell = resolveWidgetShell(inlineSignals.hint);
    const shell = inlineSignals.direction
      ? { ...baseShell, direction: inlineSignals.direction }
      : baseShell;
    for (const message of baseShell.issues) {
      fireError(this, 'invalid-config', message);
    }
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: state.config.width,
      height: state.config.height,
      layout,
      manual: isManual,
      shell,
    });
    state.gamePresentation = gp;
    gp.mount();

    // Game-only path (no sitekey): mount + run, no trigger axis.
    if (state.config.sitekey === null && !isManual) {
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
 *  override). Inline JSON contributes `_iso` / `_extends` as the hint AND
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
  if (typeof obj._iso === 'string' && obj._iso.length > 0) hint = obj._iso;
  else if (typeof obj._extends === 'string' && obj._extends.length > 0) hint = obj._extends;
  const direction = obj._direction === 'rtl' || obj._direction === 'ltr' ? obj._direction : null;
  return { hint, direction };
}

function resolveLayout(attr: LayoutAttr): 'inline' | 'modal' | 'fullscreen' {
  return attr === 'auto' ? 'inline' : attr;
}
