import { inspectGameConfig } from '../config/game.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { Layout } from '@caputchin/game-sdk';
import type { LayoutAttr } from '../layout.js';
import { isLayout } from '../layout.js';
import { fireError, type ErrorCode } from '../errors.js';
import { buildWidgetShell } from '../locale/widget-shell.js';
import { buildWidgetShellSkin } from '../skin/widget-shell-skin.js';
import { applySkinVars } from '../skin/css-vars.js';
import { buildWidgetShellConfig } from '../configurations/widget-shell-config.js';
import { createGamePresentation } from '../modes/game.js';
import { resolveGameSizing } from '../config/effective-size.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { GameConfig } from '../config/game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';
import { runManual } from '../verify/run-manual.js';
import { emitDegraded } from '../verify/events.js';
import { fetchBootstrap, fetchBootstrapResilient } from '../bootstrap/client.js';
import type { BootstrapResponse } from '../bootstrap/types.js';
import { resolveLocaleSignal, resolveSkinSignal } from '../bootstrap/signals.js';
import type { ResolvedAxes } from '../bootstrap/types.js';

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
  /** @internal Custom Element observed attributes. */
  static observedAttributes = ['sitekey', 'no-verify', 'trigger', 'width', 'height', 'overlay-width', 'overlay-height', 'game', 'games', 'game-src', 'layout', 'locale', 'skin', 'api-host'];

  private state: WidgetState<GameConfig> = createInitialState<GameConfig>();

  /** API host captured at mount so a live reskin can refetch bootstrap. */
  private apiHost = '';
  /** Observed attributes changed since the last microtask flush; coalesced so a
   *  `skin`+`locale` pair set in one tick triggers ONE refetch. */
  private readonly dirtyAttrs = new Set<string>();
  private reinitScheduled = false;
  /** Monotonic reskin id; only the latest resolved refetch applies. Kept
   *  element-private so it never disturbs the solved token / cap session. */
  private reskinEpoch = 0;
  private reskinAbort: AbortController | null = null;
  /** OS color-scheme tracker, installed only when `skin` is auto/absent. */
  private skinMedia: MediaQueryList | null = null;

  private readonly onSkinMediaChange = (): void => {
    if (!this.skinIsAuto()) return;
    this.markAttrDirty('skin');
  };

  /** @internal Custom Element lifecycle; the browser calls this on mount. */
  connectedCallback(): void {
    const state = this.state;
    state.connected = true;

    installGameMethods(this, state);

    const inspection = inspectGameConfig(this);
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
    // the mount window uses the real API host, not an empty relative URL.
    this.apiHost = apiHost;
    // Shadow attaches synchronously so the host keeps its layout box during
    // the bootstrap wait.
    this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Warn (but keep widget running) if non-manual mode receives slotted
    // children; they'd never appear without a <slot>. Manual is the only
    // mode where customer DOM gets projected into the shell.
    const isManual = state.config.trigger === 'manual';
    if (!isManual && this.childElementCount > 0) {
      fireError(this, 'invalid-config', 'Light DOM children on <caputchin-game> are ignored unless trigger="manual"');
    }

    // No sitekey = a game-only (no-verify) mount. With a marketplace game id we
    // still run a KEYLESS bootstrap (sitekey omitted) so the server resolves the
    // game off the live index: the preferred footprint (sizes the iframe) + one
    // preset per axis (resolves locale/skin). Only the cap solve is skipped
    // (run-game's shouldVerify is false without a sitekey). With no id (a bare
    // game-src the server can't resolve) there's nothing to fetch, so mount the
    // bundled defaults directly.
    if (state.config.sitekey === null && state.config.game === null && state.config.games === null) {
      this.completeMount(apiHost, null);
      return;
    }

    // The bootstrap carries the game's preferred footprint + resolved
    // skin/locale, so a silent degrade mis-sizes the game and drops to bundled
    // skin. It runs through the RESILIENT fetch regardless of whether an in-page
    // `game-src` bundle exists: a generous per-attempt ceiling tolerates a
    // slow-but-alive server instead of the old 2s abort (which rendered an
    // unstyled, wrongly-sized game), with a bounded retry on fast transient
    // failure. On final exhaustion it degrades to bundled AND fires `degraded`.
    // A `game-src` bundle just means the final degrade still has something to
    // paint; the resilient policy is the same either way.

    // Show a loading skeleton while we wait. Without it the host box is an
    // empty sized rectangle for the full bootstrap window, which reads as
    // "blank / broken" rather than "loading". Skipped in manual mode (the
    // customer's slotted DOM owns the box).
    if (state.config.trigger !== 'manual') this.showLoadingSkeleton();

    // Abort the in-flight bootstrap (and its retry loop) if the element is
    // removed mid-flight, so a torn-down widget stops fetching.
    const abort = new AbortController();
    state.bootstrapAbort = abort;
    const signals = {
      apiHost,
      sitekey: state.config.sitekey,
      game: state.config.game ?? null,
      games: state.config.games ?? null,
      locale: resolveLocaleSignal(state.config.locale),
      skin: resolveSkinSignal(state.config.skin),
      signal: abort.signal,
    };

    void fetchBootstrapResilient(signals).then((result) => {
      // Guard on the captured bag identity first: a disconnect swaps in a fresh
      // bag (and a same-node remount swaps in the NEXT mount's bag), so
      // `this.state !== state` means this resolution belongs to a torn-down
      // mount and must not act on the live one. The connected/config checks keep
      // the original narrowing for the `this.state.*` reads below.
      if (this.state !== state || !this.state.connected || !this.state.config) return;
      // Authoritative gate rejection (409): the server says this key+game can't
      // make a valid round. Mount the error presentation + fire the `error`
      // event; do NOT proceed into a bundled round (it would dead-end at
      // /verify/start with no ticket). Transient failures (timeout / 5xx /
      // network / malformed) arrive as kind:'degrade' and fall through to the
      // bundled mount below.
      if (result.kind === 'gate') {
        const reason = result.error.message
          || 'This site key requires a game to verify, but the server could not supply one.';
        this.completeMount(apiHost, null, {
          code: 'gate-unavailable',
          message: reason,
          originalCode: result.error.code,
        });
        return;
      }
      // Transient degrade (timeout / network / 5xx / malformed): the resolve
      // failed after the retry budget, so the game renders with bundled
      // defaults (size/skin/locale may be off). Surface it on the `degraded`
      // event + a dev warning so a slow service is observable, never silent.
      if (result.kind === 'degrade') {
        console.warn(`[caputchin] bootstrap degraded (${result.reason}); rendering game with bundled defaults`);
        emitDegraded(this, result.reason);
      }
      const bootstrap = result.kind === 'ok' ? result.response : null;
      // The server-resolved GAME axes + preferred footprint ride to the iframe
      // via state; the shell AROUND the game consumes the widget block.
      this.state.gameResolved = bootstrap?.game?.resolved ?? null;
      this.state.gamePreferred = bootstrap?.game?.preferred ?? null;
      // Server gate: when the server gated this key it PICKED the game from
      // the per-site pool + signed a ticket. The server pick overrides the
      // client game/games/game-src attrs; stash the ticket to echo at
      // /verify/start. The picked game's bundle is in bootstrap.game.
      const requiresGame = bootstrap?.requiresGame === true;
      this.state.requiresGame = requiresGame;
      this.state.gateTicket = bootstrap?.ticket ?? null;
      if (requiresGame && bootstrap?.gameId) {
        this.state.config.game = bootstrap.gameId;
      }
      // The same bootstrap response already carries the bundle url + integrity
      // for the resolved game - stash it (tagged with that id) so the game-load
      // path can skip a second /widget/bootstrap call.
      this.state.gameBundle = bootstrap?.game
        ? { gameId: this.state.config.game, url: bootstrap.game.url, integrity: bootstrap.game.integrity }
        : null;
      this.completeMount(apiHost, bootstrap?.widget?.resolved ?? null);
    });
  }

  private completeMount(
    apiHost: string,
    resolved: ResolvedAxes | null,
    gateError?: { code: ErrorCode; message: string; originalCode?: string },
  ): void {
    // Tear down the loading skeleton before any early-return, so a guarded-out
    // mount still clears it (it no-ops when none is present).
    this.removeLoadingSkeleton();
    const state = this.state;
    if (!state.config) return;
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const isManual = state.config.trigger === 'manual';
    // Shell pick: an explicit embed `layout` wins; otherwise (default `auto`)
    // fall back to the game's preferred layout from bootstrap, then `inline`.
    // The preferred layout rides the bootstrap `game` block, so it is only
    // present for platform-resolved games (marketplace / keyless-with-id); a
    // customer-hosted game-src bundle has no preferred here and stays `inline`.
    const layout: Layout = resolveLayout(state.config.layout, state.gamePreferred?.layout ?? null);
    const derivedTrigger: WidgetTrigger = layout === 'inline' ? 'auto' : 'click';

    // Gated key: the server requires one of its installed games. Manual mode
    // is never compatible (no seed-determinism for replay), so fail closed.
    // game-src IS compatible when the server's picked game is a custom
    // upload: the customer's CDN holds the playable bundle (game-src) and
    // the platform stored the headless run.js for replay determinism. The
    // signal that the server picked a custom-replayable id is
    // `state.gameBundle.url === null` (the bootstrap response carries no
    // platform-vendored bundle URL for the picked id). Marketplace picks
    // always carry a non-null url; clear game-src in those cases since the
    // page is trying to override the gate.
    if (state.requiresGame) {
      if (isManual) {
        fireError(this, 'invalid-config', 'trigger="manual" is not supported on a site key that requires a game; use the default game presentation');
      } else if (state.config.gameSrc) {
        const pickedCustomReplayable = state.gameBundle != null && state.gameBundle.url === null;
        if (!pickedCustomReplayable) {
          fireError(this, 'invalid-config', "game-src is ignored on a site key that requires a game; the site's installed game is used instead");
          state.config.gameSrc = null;
        }
      }
    }

    // Shell around the game is built from the server-resolved WIDGET axes. The
    // GAME's own resolved axes (state.gameResolved) ride to the iframe kickoff
    // separately (install-game-frame).
    const shell = buildWidgetShell(resolved?.locale ?? null);
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const skin = buildWidgetShellSkin(resolved?.skin ?? null);
    this.setAttribute('data-skin-theme', skin.theme);
    applySkinVars(this, skin.palette);

    const shellConfig = buildWidgetShellConfig(resolved?.config ?? null);

    // Resolve the two surfaces in one place (entry = the in-page element,
    // footprint = the game box). Inline → both equal width/height folded with
    // preferred. Overlay → entry is the RAW width/height (the entry checkbox is
    // not the game, so preferred must not promote it), footprint folds the
    // overlay-* attrs with preferred. The footprint is stashed for the iframe
    // sizer (install-game-frame) alongside the resolved layout.
    const { entry, footprint } = resolveGameSizing(state.config, state.gamePreferred ?? null, layout);
    state.resolvedLayout = layout;
    state.gameFootprint = footprint;
    // overlay-width / overlay-height only mean something in modal/fullscreen
    // (inline has one box, sized by width/height). Warn instead of silently
    // dropping, mirroring the other completeMount ignore-warnings.
    if (layout === 'inline' && (state.config.overlayWidth !== 'auto' || state.config.overlayHeight !== null)) {
      fireError(this, 'invalid-config', 'overlay-width / overlay-height are ignored in inline layout; they size the dialog + iframe in modal/fullscreen only');
    }
    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: entry.width,
      height: entry.height,
      footprintWidth: footprint.width,
      footprintHeight: footprint.height,
      layout,
      manual: isManual,
      shell,
      skin,
      shellConfig,
    });
    state.gamePresentation = gp;
    gp.mount();

    // Authoritative gate rejection from bootstrap: show the error presentation
    // + fire the `error` event (dev-facing message also logged), then stop. We
    // never wire the verify trigger - there's no ticket, so a round here would
    // only dead-end at /verify/start. The visitor sees the errored shield, not
    // the raw dev message.
    if (gateError) {
      console.warn(`[caputchin] ${gateError.message}`);
      fireError(this, gateError.code, gateError.message, gateError.originalCode);
      gp.setState('error');
      return;
    }

    // Verification trigger axis. The no-verify / no-sitekey game-only path runs
    // through the SAME trigger as the gated path - runGame branches to the
    // game-only runner internally (via shouldVerify), so it never runs the cap
    // gate. Routing it through the trigger (instead of running on mount) keeps
    // layout behavior uniform with the gated path:
    //   - inline → auto trigger → the game loads + the verifying indicator
    //     shows on mount (the iframe is visible immediately).
    //   - modal / fullscreen → click trigger → the game loads (and verifying
    //     shows) only when the user opens the dialog, never on mount. Showing
    //     verifying on a closed overlay's entry before any interaction was the
    //     bug this replaced.
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

    // Track OS color scheme so `skin="auto"` (or absent) re-skins the shell live
    // on an OS light/dark flip. Explicit skins ignore this (see onSkinMediaChange).
    this.installSkinMedia();

    // Flush any skin/locale change that arrived DURING the mount bootstrap window
    // (applyAttrChanges defers while the game presentation is unmounted).
    if (this.dirtyAttrs.size > 0) this.applyAttrChanges();

    // For inline (manual or iframe) verification auto-kicks on mount via the
    // auto trigger above. For modal/fullscreen the simple-click entry opens
    // the dialog AND fires the trigger on the first click. No start() exists
    // on this widget; pass() / fail() drive completion in manual mode.
  }

  /** Paint a neutral loading skeleton into the empty shadow while the bootstrap
   *  is in flight. Without it a bootstrap-sourced game shows an empty sized box
   *  for the whole (un-aborted) bootstrap window, which reads as broken. Torn
   *  down by `removeLoadingSkeleton` the moment `completeMount` paints the real
   *  presentation. No-op if one is already present. */
  private showLoadingSkeleton(): void {
    const shadow = this.shadowRoot;
    if (!shadow || shadow.querySelector('[part="loading"]')) return;
    // Reserve the eventual footprint on the host NOW, from the customer's
    // width/height attributes, so the skeleton fills the same box the game will
    // (no min-size flash that then pops to full / pixel size on load). The real
    // presentation re-applies the authoritative size in completeMount; for an
    // unsized (auto) axis the skeleton keeps its min-size fallback.
    this.applyLoadingHostSize();
    const style = document.createElement('style');
    style.dataset['cptLoading'] = '';
    style.textContent = LOADING_SKELETON_CSS;
    const box = document.createElement('div');
    box.setAttribute('part', 'loading');
    box.setAttribute('aria-hidden', 'true');
    // modal / fullscreen mount a small checkbox ENTRY (the game opens in a
    // dialog on click), not a game-area frame - so the loading placeholder must
    // be entry-sized, not the tall game-frame box (which dwarfs the entry it
    // resolves into). Inline keeps the full game-frame skeleton.
    const layout = this.state.config?.layout;
    if (layout === 'modal' || layout === 'fullscreen') box.dataset['overlay'] = '';
    // An explicit width (full / pixel) was just reserved on the host by
    // applyLoadingHostSize; flag the box so the overlay skeleton fills that
    // reserved width (100%) instead of hugging its min-size floor - so it spans
    // the same box the entry will. An `auto` width keeps the floor (the entry
    // is content-width too, so there is nothing to reserve).
    const w = this.state.config?.width;
    if (w === 'full' || typeof w === 'number') box.dataset['sized'] = '';
    const spinner = document.createElement('div');
    spinner.setAttribute('part', 'loading-spinner');
    box.appendChild(spinner);
    shadow.append(style, box);
  }

  /** Provisionally size the host from the embed's width/height attributes so the
   *  loading skeleton occupies the eventual box. Mirrors the full / pixel sizing
   *  the resolved presentation applies later; an `auto` width or unset height is
   *  left alone so the skeleton's min-size fallback governs that axis. */
  private applyLoadingHostSize(): void {
    const config = this.state.config;
    if (!config) return;
    // Reserve only the host axes the resolved presentation will RE-APPLY (and
    // reset on teardown), so nothing the loaded state ignores can leak as a
    // stale inline style. Width: both layouts host-apply full + pixel (inline
    // via createInlineGame; overlay via the simple presentation), so reserve it
    // regardless of layout - including `auto`, which resolves to one of those
    // post-bootstrap and wants the same footprint either way. Pixel height: also
    // host-applied in both. Full height is ASYMMETRIC: inline routes it to the
    // host (createInlineGame re-applies AND resets it), but overlay routes
    // height="full" to the entry's inner wrapper (createOverlayGame), never the
    // host - and the simple presentation host-applies only PIXEL height. So a
    // host height:100% reserved for an overlay (or an `auto` layout that resolves
    // to one) would STICK: never re-applied, never reset on unmount. Restrict the
    // full-height host reservation to explicit inline. We reserve only the
    // customer's OWN dims, never the game's manifest footprint (overlay-decoupled
    // and unknown pre-bootstrap), so nothing game-sized leaks onto an entry.
    const fullW = config.width === 'full';
    const fullH = config.height === 'full' && config.layout === 'inline';
    const pxW = typeof config.width === 'number' ? config.width : null;
    const pxH = typeof config.height === 'number' ? config.height : null;
    if (fullW || fullH || pxW !== null || pxH !== null) this.style.display = 'block';
    if (fullW) this.style.width = '100%';
    else if (pxW !== null) this.style.width = `${pxW}px`;
    if (fullH) this.style.height = '100%';
    else if (pxH !== null) this.style.height = `${pxH}px`;
  }

  /** Remove the loading skeleton (box + its scoped style). Safe to call when
   *  none is present. */
  private removeLoadingSkeleton(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    shadow.querySelectorAll('[part="loading"],style[data-cpt-loading]').forEach((n) => n.remove());
  }

  /** @internal Custom Element lifecycle; the browser calls this on removal. */
  disconnectedCallback(): void {
    const s = this.state;
    // Stop any in-flight bootstrap + its retry loop before tearing down.
    s.bootstrapAbort?.abort();
    // Stop reactive machinery: OS tracker + any in-flight reskin refetch.
    this.teardownSkinMedia();
    this.reskinAbort?.abort();
    this.reskinAbort = null;
    this.dirtyAttrs.clear();
    this.reinitScheduled = false;
    this.removeLoadingSkeleton();
    s.trigger?.deactivate();
    s.gamePresentation?.unmount();
    s.capClient?.dispose();
    s.iframeHost?.dispose();
    // Null out the bag's fields BEFORE swapping so closures captured by
    // installGameMethods see inert state.
    s.config = null;
    s.bootstrapAbort = null;
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

  /** @internal Custom Element lifecycle; the browser calls this on attr change. */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // Fires during upgrade (before connect) for parsed-in attributes; ignore
    // until the first render is done. A same-value set is a no-op.
    if (!this.state.connected || oldValue === newValue) return;
    // `skin` / `locale` re-resolve via a bootstrap refetch and re-theme the
    // SHELL in place, preserving an already-solved token. A live in-progress
    // game keeps its old theme until it next kicks off (D2). Everything else
    // still needs a remount.
    if (name === 'skin' || name === 'locale') {
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
    // Defer while the game shell is still mounting: KEEP dirtyAttrs and let
    // completeMount flush them, so the reskin applies to real DOM and runs
    // strictly after the mount paint (no mount-fetch vs reskin-fetch race).
    if (!this.state.gamePresentation) return;
    const dirty = new Set(this.dirtyAttrs);
    this.dirtyAttrs.clear();
    if (dirty.size === 0) return;
    if (dirty.has('skin')) this.syncSkinMedia();
    if (dirty.has('skin') || dirty.has('locale')) this.reskinRefetch();
  }

  /** Refetch bootstrap with the new signals, then re-theme the shell in place.
   *  The embedded game's own theme rides the NEXT kickoff (state.gameResolved is
   *  refreshed here); a live in-progress iframe is left untouched (D2). On any
   *  non-`ok` result we keep the current theme (no flash to bundled). */
  private reskinRefetch(): void {
    const state = this.state;
    if (!state.config) return;
    // A pure bundled mount (no sitekey, no game, no games) has nothing for the
    // server to resolve; there is no theme to refetch.
    if (state.config.sitekey === null && state.config.game === null && state.config.games === null) return;

    const inspection = inspectGameConfig(this);
    if (inspection.inert || !inspection.config) return;
    state.config = inspection.config;

    this.reskinEpoch += 1;
    const epoch = this.reskinEpoch;
    this.reskinAbort?.abort();
    const abort = new AbortController();
    this.reskinAbort = abort;

    // Single-attempt (snappy): a slow/failed reskin keeps the current theme
    // rather than blocking behind the resilient retry loop.
    void fetchBootstrap({
      apiHost: this.apiHost,
      sitekey: state.config.sitekey,
      game: state.config.game ?? null,
      games: state.config.games ?? null,
      locale: resolveLocaleSignal(state.config.locale),
      skin: resolveSkinSignal(state.config.skin),
      signal: abort.signal,
    }).then((result) => {
      if (epoch !== this.reskinEpoch || this.state !== state || !this.state.connected || !this.state.config) return;
      if (result.kind !== 'ok') return;
      this.applyResolvedAxes(result.response);
    });
  }

  private applyResolvedAxes(response: BootstrapResponse): void {
    const shell = buildWidgetShell(response.widget?.resolved?.locale ?? null);
    const skin = buildWidgetShellSkin(response.widget?.resolved?.skin ?? null);
    // Host-level theme + direction (set AND removed).
    this.setAttribute('data-skin-theme', skin.theme);
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');
    else this.removeAttribute('dir');
    applySkinVars(this, skin.palette);
    // Shell (checkbox entry / inline badge / dialog) re-themes in place.
    this.state.gamePresentation?.applySkin(skin);
    this.state.gamePresentation?.applyLocale(shell);
    // Refresh the resolved GAME axes so a not-yet-opened iframe (modal/fullscreen
    // pre-open) kicks off in the new theme (D2 case a). Keep the old value if the
    // refetch carried none.
    this.state.gameResolved = response.game?.resolved ?? this.state.gameResolved;
  }
}

function resolveLayout(attr: LayoutAttr, preferred: Layout | null): Layout {
  // Embed attribute is authoritative when set to a concrete layout. Only the
  // default `auto` defers to the game's preferred layout; an untrusted manifest
  // value that is not a real layout falls through to `inline`.
  if (attr !== 'auto') return attr;
  return preferred !== null && isLayout(preferred) ? preferred : 'inline';
}

// Loading-skeleton styles. Fills the host box (full-axis games) or shows a
// modest min-size placeholder (auto-size games, before the bootstrap reveals
// the preferred footprint). The skeleton paints BEFORE any skin is resolved
// (it is torn down the instant completeMount applies the resolved palette), so
// the `--cpt-skin-*` references resolve to the neutral grey fallbacks; the
// var() form just lets a host that already carries a palette (e.g. a remount)
// tint it. The spinner is the only motion and drops to static under
// prefers-reduced-motion.
const LOADING_SKELETON_CSS = [
  '[part="loading"]{',
  'display:flex;align-items:center;justify-content:center;box-sizing:border-box;',
  'width:100%;height:100%;min-width:180px;min-height:120px;',
  'background:var(--cpt-skin-surface_bg,#f4f4f5);',
  'border:1px solid var(--cpt-skin-border,#e4e4e7);border-radius:0.5rem;',
  '}',
  // Overlay (modal / fullscreen) entry: compact, checkbox-entry-sized placeholder
  // instead of the tall game-frame box, so it matches the small entry it becomes.
  // Auto width: hug content with the SAME min-width floor the real normal
  // checkbox uses (min(18rem,100%) in simple.ts), so an auto entry's skeleton
  // doesn't pop wider on load.
  '[part="loading"][data-overlay]{width:fit-content;height:auto;min-width:min(18rem,100%);min-height:3rem}',
  // Pinned width (full / pixel): the host was reserved at that width by
  // applyLoadingHostSize - fill it so the skeleton spans the same box the entry
  // will occupy (kills the narrow-flash that pops to full / pixel width on load).
  '[part="loading"][data-overlay][data-sized]{width:100%}',
  '[part="loading"][data-overlay] [part="loading-spinner"]{width:22px;height:22px}',
  '[part="loading-spinner"]{',
  'width:28px;height:28px;border-radius:50%;',
  'border:3px solid var(--cpt-skin-border,#d4d4d8);',
  'border-top-color:var(--cpt-skin-text,#71717a);',
  'animation:cpt-skel-spin 0.8s linear infinite;',
  '}',
  '@keyframes cpt-skel-spin{to{transform:rotate(360deg)}}',
  '@media (prefers-reduced-motion:reduce){[part="loading-spinner"]{animation:none}}',
].join('');
