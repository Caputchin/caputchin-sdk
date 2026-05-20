import { inspectWidgetConfig } from '../config/widget.js';
import { fireError } from '../errors.js';
import { createPresentation } from '../modes/index.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialWidgetState, type WidgetState } from '../verify/state-widget.js';
import { installWidgetMethods } from '../verify/methods-widget.js';
import { runCap } from '../verify/run-cap.js';

/**
 * `<caputchin-widget>` — cap PoW + instrumentation only. Two modes:
 * `invisible` (no UI) and `simple` (checkbox + brand). For games, use
 * `<caputchin-game>` instead.
 */
export class CaputchinWidget extends HTMLElement {
  static observedAttributes = ['sitekey', 'mode', 'trigger', 'width', 'size'];

  private state: WidgetState = createInitialWidgetState();

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
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    state.presentation = createPresentation(state.config.mode, {
      host: this,
      root: shadow,
      trigger: state.config.trigger,
      width: state.config.width,
      size: state.config.size,
    });
    state.presentation.mount();

    state.trigger = createTriggerStrategy(state.config.trigger);
    state.triggerCtx = {
      el: this,
      presentation: state.presentation,
      runVerification: () => runCap(this, state, apiHost),
      releaseManualPass: () => {
        // Cap widget has no `pass()` method — no manual gate to release.
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
    // Null out the bag's fields BEFORE swapping so closures captured by
    // installWidgetMethods (held in widget.start) see inert state.
    s.config = null;
    s.trigger = null;
    s.triggerCtx = null;
    s.capClient = null;
    s.presentation = null;
    s.widgetId = null;
    s.lockedToken = null;
    s.connected = false;
    this.state = createInitialWidgetState();
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }
}
