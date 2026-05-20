import { inspectGameConfig } from '../config/game.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { LayoutAttr } from '../layout.js';
import { fireError } from '../errors.js';
import { createGamePresentation } from '../modes/game.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialGameState, type GameState } from '../verify/state-game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';

/**
 * `<caputchin-game>` — game host with optional cap verification.
 *   - sitekey present → cap.solve runs alongside the game iframe.
 *   - sitekey absent → game-only (no verification, `pass` event carries
 *     `token: null`).
 *
 * Layout drives both rendering and triggering:
 *   - `inline` (default) → iframe up on mount (trigger=auto).
 *   - `modal` / `fullscreen` → checkbox entry; iframe opens on click (trigger=click).
 *
 * There is no `trigger` attribute on this widget — the layout decides.
 */
export class CaputchinGame extends HTMLElement {
  static observedAttributes = ['sitekey', 'width', 'height', 'size', 'game', 'games', 'game-src', 'layout'];

  private state: GameState = createInitialGameState();

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
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    const layout: 'inline' | 'modal' | 'fullscreen' = resolveLayout(state.config.layout);
    const derivedTrigger: WidgetTrigger = layout === 'inline' ? 'auto' : 'click';

    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: state.config.width,
      size: state.config.size,
      layout,
    });
    state.gamePresentation = gp;
    gp.mount();

    // Game-only path (no sitekey): mount + run, no trigger axis.
    if (state.config.sitekey === null) {
      runGame(this, state, apiHost).catch(() => {});
      return;
    }

    state.trigger = createTriggerStrategy(derivedTrigger);
    state.triggerCtx = {
      el: this,
      presentation: gp,
      runVerification: () => runGame(this, state, apiHost),
      releaseManualPass: () => {
        // Game widget has no pass() method — no manual gate to release.
      },
      capClient: null,
    };

    state.trigger.activate(state.triggerCtx);
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
    s.connected = false;
    this.state = createInitialGameState();
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }
}

function resolveLayout(attr: LayoutAttr): 'inline' | 'modal' | 'fullscreen' {
  return attr === 'auto' ? 'inline' : attr;
}
