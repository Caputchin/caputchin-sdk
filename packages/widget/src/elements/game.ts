import { inspectGameConfig } from '../config/game.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { LayoutAttr } from '../layout.js';
import { fireError } from '../errors.js';
import { createGamePresentation } from '../modes/game.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialGameState, type GameState } from '../verify/state-game.js';
import { installGameMethods } from '../verify/methods-game.js';
import { runGame } from '../verify/run-game.js';
import { runManual } from '../verify/run-manual.js';

/**
 * `<caputchin-game>` — game host with optional cap verification.
 *   - sitekey present → cap.solve runs alongside the game.
 *   - sitekey absent → game-only (no verification, `pass` event carries
 *     `token: null`).
 *
 * Layout drives rendering. Trigger is implicit per layout except for the
 * `trigger="manual"` escape hatch:
 *   - `inline` (default) → iframe up on mount, trigger=auto.
 *   - `modal` / `fullscreen` → checkbox entry, iframe opens on click.
 *   - `trigger="manual"` → no iframe; customer slots custom game DOM into
 *     the layout chrome via the default `<slot>`. Methods `start` / `pass`
 *     / `fail` drive the lifecycle.
 */
export class CaputchinGame extends HTMLElement {
  static observedAttributes = ['sitekey', 'trigger', 'width', 'height', 'game', 'games', 'game-src', 'layout'];

  private state: GameState = createInitialGameState();

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
    // children — they'd never appear without a <slot>. Manual is the only
    // mode where customer DOM gets projected into the chrome.
    if (!isManual && this.childElementCount > 0) {
      fireError(this, 'invalid-config', 'Light DOM children on <caputchin-game> are ignored unless trigger="manual"');
    }

    const gp = createGamePresentation({
      host: this,
      root: shadow,
      trigger: derivedTrigger,
      width: state.config.width,
      layout,
      manual: isManual,
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
      releaseManualPass: (payload) => {
        // In iframe mode this releases the cap gate with the game payload
        // from postMessage. In manual mode the public pass() method routes
        // through the same path, so cap solve completes with score/duration.
        state.capClient?.releaseGate({ score: payload.score, durationMs: payload.durationMs });
      },
      capClient: null,
    };

    state.trigger.activate(state.triggerCtx);

    // For inline + manual there's no entry click — customer must call start()
    // to kick verification. For modal/fullscreen + manual the simple-click
    // entry on the dialog opens it AND fires the trigger, same as iframe mode.
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
