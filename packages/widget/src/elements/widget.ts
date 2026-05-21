import { inspectWidgetConfig } from '../config/widget.js';
import { fireError } from '../errors.js';
import { resolveWidgetShell } from '../lang/widget-shell.js';
import { resolveWidgetShellSkin } from '../skin/widget-shell-skin.js';
import { applySkinVars } from '../skin/css-vars.js';
import { resolveWidgetShellConfig } from '../configurations/widget-shell-config.js';
import { createPresentation } from '../modes/index.js';
import { createTriggerStrategy } from '../triggers/index.js';
import { createInitialState, type WidgetState } from '../verify/state.js';
import type { WidgetConfig } from '../config/widget.js';
import { installWidgetMethods } from '../verify/methods-widget.js';
import { runCap } from '../verify/run-cap.js';

/**
 * `<caputchin-widget>`; cap PoW + instrumentation only. Default renders
 * the Caputchin checkbox + brand strip. Add the `invisible` boolean
 * attribute to mount no UI (verification still runs per trigger). For
 * games, use `<caputchin-game>` instead.
 */
export class CaputchinWidget extends HTMLElement {
  static observedAttributes = ['sitekey', 'invisible', 'trigger', 'width', 'height', 'size', 'lang', 'skin', 'config'];

  private state: WidgetState<WidgetConfig> = createInitialState<WidgetConfig>();

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

    const shell = resolveWidgetShell(state.config.lang);
    for (const message of shell.issues) {
      fireError(this, 'invalid-config', message);
    }
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const skin = resolveWidgetShellSkin(state.config.skin);
    for (const message of skin.issues) {
      fireError(this, 'invalid-config', message);
    }
    this.setAttribute('data-skin-mode', skin.mode);
    applySkinVars(this, skin.palette);

    const shellConfig = resolveWidgetShellConfig(state.config.config);
    for (const message of shellConfig.issues) {
      fireError(this, 'invalid-config', message);
    }

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
    this.state = createInitialState<WidgetConfig>();
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.state.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight; ignored`);
    }
  }
}
