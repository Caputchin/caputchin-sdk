import { inspectWidgetConfig } from '../config/widget.js';
import { fireError } from '../errors.js';
import { buildWidgetShell } from '../locale/widget-shell.js';
import { buildWidgetShellSkin } from '../skin/widget-shell-skin.js';
import { applySkinVars } from '../skin/css-vars.js';
import { buildWidgetShellConfig } from '../configurations/widget-shell-config.js';
import { createPresentation } from '../modes/index.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { WidgetConfig } from '../config/widget.js';
import { installWidgetMethods } from '../verify/methods-widget.js';
import { runCap } from '../verify/run-cap.js';
import { emitDegraded } from '../verify/events.js';
import { fetchBootstrap } from '../bootstrap/client.js';
import { resolveLocaleSignal, resolveSkinSignal } from '../bootstrap/signals.js';
import type { ResolvedAxes } from '../bootstrap/types.js';

/**
 * `<caputchin-widget>`; cap PoW + instrumentation only. Default renders
 * the Caputchin checkbox + brand strip. Add the `invisible` boolean
 * attribute to mount no UI (verification still runs per trigger). For
 * games, use `<caputchin-game>` instead.
 *
 * Mount is two-phase: synchronous prep (config inspection,
 * shadow attach, bundled cascade for hint extraction) followed by an
 * async bootstrap fetch (with a 2s hard timeout). First paint blocks until
 * bootstrap resolves; bundled fallback applies on timeout / network error.
 */
export class CaputchinWidget extends HTMLElement {
  /** @internal Custom Element observed attributes. */
  static observedAttributes = ['sitekey', 'invisible', 'trigger', 'width', 'height', 'size', 'locale', 'skin'];

  private state: WidgetState<WidgetConfig> = createInitialState<WidgetConfig>();

  /** @internal Custom Element lifecycle; the browser calls this on mount. */
  connectedCallback(): void {
    const state = this.state;
    state.connected = true;

    installWidgetMethods(this, state);

    const inspection = inspectWidgetConfig(this);
    for (const issue of inspection.issues) {
      fireError(this, 'invalid-config', issue.message);
    }
    if (inspection.inert) return;

    state.config = inspection.config;
    const apiHost = __CAPUTCHIN_API_HOST__;
    // Shadow attaches synchronously so the host element keeps its layout
    // box during the bootstrap wait (empty box, no FOUC of bundled).
    this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Abort the in-flight bootstrap if the element is removed mid-flight.
    const abort = new AbortController();
    state.bootstrapAbort = abort;
    // The SERVER resolves one preset per axis. The widget pre-resolves its
    // signal inputs first: when the `locale` / `skin` attribute is missing the
    // element falls back to the navigator language / `prefers-color-scheme`,
    // so the server always receives one concrete value per axis. The cap-only
    // widget keeps the short single-attempt window (its bundled checkbox is
    // fully usable, so a long blocking wait would be the worse trade).
    void fetchBootstrap({
      apiHost,
      sitekey: state.config.sitekey,
      locale: resolveLocaleSignal(state.config.locale),
      skin: resolveSkinSignal(state.config.skin),
      signal: abort.signal,
    }).then((result) => {
      // Disconnect race: element removed (or same-node remounted) during the
      // bootstrap wait. A disconnect swaps in a fresh bag and a remount swaps in
      // the next mount's bag, so `this.state !== state` means this resolution
      // belongs to a torn-down mount and must not act on the live one.
      if (this.state !== state || !this.state.connected || !this.state.config) return;
      // Authoritative gate rejection (409): the gated key's pool can't supply a
      // game - and this cap-only element couldn't host one anyway. Surface the
      // server's reason; verification still fails closed at /verify/start.
      if (result.kind === 'gate') {
        const reason = result.error.message
          || 'This site key requires a game to verify, but the server could not supply one.';
        console.warn(`[caputchin] ${reason}`);
        fireError(this, 'gate-unavailable', reason, result.error.code);
        this.completeMount(apiHost, null);
        return;
      }
      // Transient degrade: the resolve failed / timed out, so the cap shell
      // renders with bundled skin/locale. Surface it on the `degraded` event +
      // a dev warning so a slow service is observable, never silent.
      if (result.kind === 'degrade') {
        console.warn(`[caputchin] bootstrap degraded (${result.reason}); rendering widget with bundled defaults`);
        emitDegraded(this, result.reason);
      }
      const bootstrap = result.kind === 'ok' ? result.response : null;
      // This cap-only element can't host a game, but the site key is
      // gated (requires a game). Surface a loud config error; verification
      // fails closed at /verify/start (no ticket). Use <caputchin-game> on a
      // gated key.
      if (bootstrap?.requiresGame === true) {
        fireError(this, 'invalid-config', 'This site key requires a game; use <caputchin-game> instead of <caputchin-widget>');
      }
      this.completeMount(apiHost, bootstrap?.widget?.resolved ?? null);
    });
  }

  private completeMount(apiHost: string, resolved: ResolvedAxes | null): void {
    const state = this.state;
    if (!state.config) return;
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const shell = buildWidgetShell(resolved?.locale ?? null);
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const skin = buildWidgetShellSkin(resolved?.skin ?? null);
    this.setAttribute('data-skin-theme', skin.theme);
    applySkinVars(this, skin.palette);

    const shellConfig = buildWidgetShellConfig(resolved?.config ?? null);

    state.presentation = createPresentation(state.config.invisible, {
      host: this,
      root: shadow,
      trigger: state.config.trigger,
      width: state.config.width,
      height: state.config.height,
      size: state.config.size,
      shell,
      skin,
      shellConfig,
    });
    state.presentation.mount();

    state.trigger = createTriggerStrategy(state.config.trigger);
    state.triggerCtx = {
      el: this,
      presentation: state.presentation,
      runVerification: () => runCap(this, state, apiHost),
      capClient: null,
    };

    state.trigger.activate(state.triggerCtx);
  }

  /** @internal Custom Element lifecycle; the browser calls this on removal. */
  disconnectedCallback(): void {
    const s = this.state;
    // Stop any in-flight bootstrap before tearing down.
    s.bootstrapAbort?.abort();
    s.trigger?.deactivate();
    s.presentation?.unmount();
    s.capClient?.dispose();
    // Null out the bag's fields BEFORE swapping so closures captured by
    // installWidgetMethods (held in widget.start) see inert state. Also
    // makes the bootstrap .then guard fire if the response arrives after
    // disconnect.
    s.config = null;
    s.bootstrapAbort = null;
    s.trigger = null;
    s.triggerCtx = null;
    s.capClient = null;
    s.presentation = null;
    s.widgetId = null;
    s.lockedToken = null;
    s.connected = false;
    this.state = createInitialState<WidgetConfig>();
  }

  /** @internal Custom Element lifecycle; attributes are read once at mount. */
  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight; ignored`);
    }
  }
}
