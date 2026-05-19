import { inspectConfig } from './config.js';
import { fireError } from './errors.js';
import { createPresentation } from './modes/index.js';
import { createGamePresentation } from './modes/game.js';
import { createTriggerStrategy } from './triggers/index.js';
import { createInitialState, type WidgetState } from './verify/state.js';
import { installMethods } from './verify/methods.js';
import { runVerification } from './verify/run.js';
import { runGameOnly } from './verify/run-game-only.js';

export class CaputchinElement extends HTMLElement {
  static observedAttributes = ['sitekey', 'mode', 'trigger', 'width', 'size', 'game', 'games', 'game-src', 'layout'];

  private state: WidgetState = createInitialState();

  connectedCallback(): void {
    const state = this.state;
    state.connected = true;

    // Always-callable methods. Define before any potential early return so
    // `widget.start()` / `widget.pass()` / `widget.setNickname()` are present
    // even when the widget is inert (missing sitekey, etc.).
    installMethods(this, state);

    const inspection = inspectConfig(this);
    for (const issue of inspection.issues) {
      fireError(this, 'invalid-config', issue.message);
    }
    if (inspection.inert) return;

    state.config = inspection.config;
    const apiHost = __CAPUTCHIN_API_HOST__;
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Game / game-only modes: build the game presentation upfront so the
    // checkbox (modal/fullscreen) or the bordered frame (inline) is in the
    // DOM and ready to receive the trigger's onActivate wiring.
    if (state.config.mode === 'game' || state.config.mode === 'game-only') {
      const layout = (state.config.layout && state.config.layout !== 'auto')
        ? state.config.layout
        : 'inline';
      const gp = createGamePresentation({
        host: this,
        root: shadow,
        trigger: state.config.trigger,
        width: state.config.width,
        size: state.config.size,
        layout,
        mode: state.config.mode,
      });
      state.gamePresentation = gp;
      state.presentation = gp;
      gp.mount();
    } else {
      state.presentation = createPresentation(state.config.mode, {
        host: this,
        root: shadow,
        trigger: state.config.trigger,
        width: state.config.width,
        size: state.config.size,
      });
      state.presentation?.mount();
    }

    // game-only takes its own path (no Cap, no trigger axis).
    if (state.config.mode === 'game-only') {
      runGameOnly(this, state, apiHost).catch(() => {});
      return;
    }

    state.trigger = createTriggerStrategy(state.config.trigger);
    state.triggerCtx = {
      el: this,
      presentation: state.presentation ?? {
        mount(): void {},
        unmount(): void {},
        setState(): void {},
        onActivate(): () => void { return () => {}; },
      },
      runVerification: () => runVerification(this, state, apiHost),
      releaseManualPass: (payload) => {
        state.capClient?.releaseGate({ score: payload.score, durationMs: payload.durationMs });
      },
      capClient: null,
    };

    state.trigger.activate(state.triggerCtx);
  }

  disconnectedCallback(): void {
    const s = this.state;
    s.trigger?.deactivate();
    s.presentation?.unmount();
    s.capClient?.dispose();
    s.iframeHost?.dispose();
    s.gamePresentation?.unmount();
    // Null out the bag's fields BEFORE swapping so closures captured by
    // installMethods (held in widget.start / widget.pass) see inert state —
    // same hazard-free behavior as the pre-refactor `this.field = null`
    // pattern. Then swap for fresh-bag semantics on reconnect.
    s.config = null;
    s.trigger = null;
    s.triggerCtx = null;
    s.capClient = null;
    s.iframeHost = null;
    s.presentation = null;
    s.gamePresentation = null;
    s.widgetId = null;
    s.lockedToken = null;
    s.gameStartedEmitted = false;
    s.gameErrored = false;
    s.connected = false;
    this.state = createInitialState();
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }
}
