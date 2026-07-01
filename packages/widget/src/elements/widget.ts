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
  static observedAttributes = ['sitekey', 'invisible', 'trigger', 'width', 'height', 'size', 'locale', 'skin', 'api-host'];

  private state: WidgetState<WidgetConfig> = createInitialState<WidgetConfig>();

  /** API host captured at mount so a live reskin can refetch bootstrap without
   *  re-deriving it. */
  private apiHost = '';
  /** Observed attributes changed since the last microtask flush; coalesced so a
   *  `skin`+`locale` pair set in one tick triggers ONE refetch. */
  private readonly dirtyAttrs = new Set<string>();
  private reinitScheduled = false;
  /** Monotonic reskin id. A resolved refetch only applies when it is still the
   *  latest (a rapid second change bumps this and aborts the prior fetch), so
   *  the newest theme always wins. Element-private (not on the state bag) so it
   *  never disturbs the solved token / cap session. */
  private reskinEpoch = 0;
  private reskinAbort: AbortController | null = null;
  /** OS color-scheme tracker, installed only when `skin` is auto/absent. */
  private skinMedia: MediaQueryList | null = null;

  /** OS light/dark flip → live reskin, but only while `skin` is auto/absent
   *  (an explicit skin attribute wins and is handled by its own attr change). */
  private readonly onSkinMediaChange = (): void => {
    if (!this.skinIsAuto()) return;
    this.markAttrDirty('skin');
  };

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
    // `api-host` attribute lets self-hosters or SDK-pinning consumers override
    // the build-time default without rebuilding the bundle (additive, non-breaking).
    const apiHostAttr = this.getAttribute('api-host');
    const apiHost = (apiHostAttr && apiHostAttr.trim()) ? apiHostAttr.trim() : __CAPUTCHIN_API_HOST__;
    // Capture the host NOW (before the bootstrap fetch), so a reskin fired during
    // the mount window uses the real API host, not an empty relative URL that
    // would hit the customer page origin.
    this.apiHost = apiHost;
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

    // Track OS color scheme so `skin="auto"` (or absent) re-skins live on an OS
    // light/dark flip. Explicit skins ignore this (see onSkinMediaChange).
    this.installSkinMedia();

    // Flush any skin/locale change that arrived DURING the mount bootstrap
    // window: applyAttrChanges defers while the presentation is unmounted, so
    // the reskin now runs against real DOM and strictly AFTER this mount paint
    // (newest-wins, no race with the mount fetch).
    if (this.dirtyAttrs.size > 0) this.applyAttrChanges();
  }

  /** @internal Custom Element lifecycle; the browser calls this on removal. */
  disconnectedCallback(): void {
    const s = this.state;
    // Stop any in-flight bootstrap before tearing down.
    s.bootstrapAbort?.abort();
    // Stop reactive machinery: OS tracker + any in-flight reskin refetch.
    this.teardownSkinMedia();
    this.reskinAbort?.abort();
    this.reskinAbort = null;
    this.dirtyAttrs.clear();
    this.reinitScheduled = false;
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

  /** @internal Custom Element lifecycle; the browser calls this on attr change. */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // Fires during upgrade (before connect) for parsed-in attributes; ignore
    // until the first render is done. A same-value set is a no-op.
    if (!this.state.connected || oldValue === newValue) return;
    // Reactive in place, preserving an already-solved token: `skin` / `locale`
    // (via a bootstrap refetch) and `width` / `height` / `size` (a client-only
    // resize, no refetch). Everything else still needs a remount.
    if (name === 'skin' || name === 'locale' || name === 'width' || name === 'height' || name === 'size') {
      this.markAttrDirty(name);
      return;
    }
    console.warn(`[caputchin] attribute "${name}" changed after mount and was ignored; remove and re-add the element to apply it`);
  }

  /** Queue an attribute for the next microtask flush so several attrs set in
   *  one tick coalesce into a single refetch. */
  private markAttrDirty(name: string): void {
    this.dirtyAttrs.add(name);
    if (this.reinitScheduled) return;
    this.reinitScheduled = true;
    queueMicrotask(() => this.applyAttrChanges());
  }

  /** `skin` is auto when the attribute is missing, empty, or literally `auto`. */
  private skinIsAuto(): boolean {
    const attr = this.getAttribute('skin');
    if (attr === null) return true;
    const t = attr.trim().toLowerCase();
    return t === '' || t === 'auto';
  }

  private installSkinMedia(): void {
    if (this.skinMedia || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (!this.skinIsAuto()) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', this.onSkinMediaChange);
    this.skinMedia = mq;
  }

  private teardownSkinMedia(): void {
    this.skinMedia?.removeEventListener('change', this.onSkinMediaChange);
    this.skinMedia = null;
  }

  /** Keep the OS tracker in sync when `skin` flips between explicit and auto at
   *  runtime: install when it becomes auto, tear down when it becomes explicit. */
  private syncSkinMedia(): void {
    if (this.skinIsAuto()) this.installSkinMedia();
    else this.teardownSkinMedia();
  }

  private applyAttrChanges(): void {
    // Reset BEFORE processing so a change during apply reschedules a flush.
    this.reinitScheduled = false;
    if (!this.state.connected || !this.state.config) { this.dirtyAttrs.clear(); return; }
    // Defer while the presentation is still mounting: KEEP dirtyAttrs and let
    // completeMount flush them, so the reskin applies to real DOM and runs
    // strictly after the mount paint (no mount-fetch vs reskin-fetch race).
    if (!this.state.presentation) return;
    const dirty = new Set(this.dirtyAttrs);
    this.dirtyAttrs.clear();
    if (dirty.size === 0) return;
    // Keep the OS tracker in sync if the skin mode flipped explicit<->auto.
    if (dirty.has('skin')) this.syncSkinMedia();
    if (dirty.has('skin') || dirty.has('locale')) this.reskinRefetch();
    if (dirty.has('width') || dirty.has('height') || dirty.has('size')) this.applyGeometryChange();
  }

  /** Live-resize the presentation in place from the current attributes. No
   *  refetch (geometry does not feed bootstrap) and no session touch (a solved
   *  token + verified visual survive). */
  private applyGeometryChange(): void {
    const state = this.state;
    if (!state.config) return;
    const inspection = inspectWidgetConfig(this);
    if (inspection.inert || !inspection.config) return;
    state.config = inspection.config;
    state.presentation?.applyGeometry({
      width: state.config.width,
      height: state.config.height,
      size: state.config.size,
    });
  }

  /** Refetch bootstrap with the new signals, then apply the resolved skin/locale
   *  in place. The solved token + cap session are never touched; on any
   *  non-`ok` result we keep the current theme (no flash to bundled). */
  private reskinRefetch(): void {
    const state = this.state;
    if (!state.config) return;
    // Re-inspect so the refetch signals reflect the new attributes; sitekey is
    // not reactive, so this stays non-inert for a skin/locale-only change.
    const inspection = inspectWidgetConfig(this);
    if (inspection.inert || !inspection.config) return;
    state.config = inspection.config;

    this.reskinEpoch += 1;
    const epoch = this.reskinEpoch;
    this.reskinAbort?.abort();
    const abort = new AbortController();
    this.reskinAbort = abort;

    void fetchBootstrap({
      apiHost: this.apiHost,
      sitekey: state.config.sitekey,
      locale: resolveLocaleSignal(state.config.locale),
      skin: resolveSkinSignal(state.config.skin),
      signal: abort.signal,
    }).then((result) => {
      // Only the latest reskin, on the same live mount, applies.
      if (epoch !== this.reskinEpoch || this.state !== state || !this.state.connected || !this.state.config) return;
      // Keep the current theme on gate / degrade / failure - never flash to
      // bundled light (mount already covered first paint).
      if (result.kind !== 'ok') return;
      this.applyResolvedAxes(result.response.widget?.resolved ?? null);
    });
  }

  private applyResolvedAxes(resolved: ResolvedAxes | null): void {
    const shell = buildWidgetShell(resolved?.locale ?? null);
    const skin = buildWidgetShellSkin(resolved?.skin ?? null);
    // Host-level theme + direction. `dir` is set AND removed so an rtl→ltr
    // switch doesn't leave a stale attribute.
    this.setAttribute('data-skin-theme', skin.theme);
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');
    else this.removeAttribute('dir');
    applySkinVars(this, skin.palette);
    // In place: no rebuild, no trigger re-arm → solved token + verified visual
    // survive.
    this.state.presentation?.applySkin(skin);
    this.state.presentation?.applyLocale(shell);
  }
}
