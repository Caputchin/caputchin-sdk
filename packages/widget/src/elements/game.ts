import { inspectGameConfig, shouldVerify } from '../config/game.js';
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
import { resolvePresentationSize } from '../config/effective-size.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { GameConfig } from '../config/game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';
import { runManual } from '../verify/run-manual.js';
import { fetchBootstrap } from '../bootstrap/client.js';
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
  static observedAttributes = ['sitekey', 'no-verify', 'trigger', 'width', 'height', 'game', 'games', 'game-src', 'layout', 'locale', 'skin'];

  private state: WidgetState<GameConfig> = createInitialState<GameConfig>();

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
    const apiHost = __CAPUTCHIN_API_HOST__;
    // Shadow attaches synchronously so the host keeps its layout box during
    // the bootstrap wait. Empty shadow until bootstrap completes.
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

    void fetchBootstrap({
      apiHost,
      sitekey: state.config.sitekey,
      game: state.config.game ?? null,
      games: state.config.games ?? null,
      locale: resolveLocaleSignal(state.config.locale),
      skin: resolveSkinSignal(state.config.skin),
    }).then((result) => {
      if (!this.state.connected || !this.state.config) return;
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

    // Fold the game's preferred footprint into the shell size: a preferred
    // `"full"` is honored as full-axis only when the embed leaves that axis
    // unset (preferred px stays on the iframe via applyIframeSize).
    const effective = resolvePresentationSize(state.config, state.gamePreferred ?? null);
    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: effective.width,
      height: effective.height,
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

    // Game-only path (no verification gate): mount + run, no trigger axis.
    // Covers both no-sitekey and explicit `no-verify` (with a sitekey, whose
    // overrides were still fetched above). Modal/fullscreen fall through to
    // the trigger so the game opens on click - it just won't run the gate.
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

  /** @internal Custom Element lifecycle; the browser calls this on removal. */
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

  /** @internal Custom Element lifecycle; attributes are read once at mount. */
  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight; ignored`);
    }
  }
}

function resolveLayout(attr: LayoutAttr, preferred: Layout | null): Layout {
  // Embed attribute is authoritative when set to a concrete layout. Only the
  // default `auto` defers to the game's preferred layout; an untrusted manifest
  // value that is not a real layout falls through to `inline`.
  if (attr !== 'auto') return attr;
  return preferred !== null && isLayout(preferred) ? preferred : 'inline';
}
