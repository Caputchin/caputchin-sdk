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
import { fetchBootstrap } from '../bootstrap/client.js';
import type { OverridesPerAxis } from '../bootstrap/types.js';
import type { ConfigPreset, LanguagePreset, SkinPreset } from '@caputchin/game-sdk';

/**
 * `<caputchin-widget>`; cap PoW + instrumentation only. Default renders
 * the Caputchin checkbox + brand strip. Add the `invisible` boolean
 * attribute to mount no UI (verification still runs per trigger). For
 * games, use `<caputchin-game>` instead.
 *
 * Mount is two-phase per ADR-0059: synchronous prep (config inspection,
 * shadow attach, bundled cascade for hint extraction) followed by an
 * async bootstrap fetch (with a 2s hard timeout). First paint blocks until
 * bootstrap resolves; bundled fallback applies on timeout / network error.
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
    // Shadow attaches synchronously so the host element keeps its layout
    // box during the bootstrap wait (empty box, no FOUC of bundled).
    this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Bundled cascade once for hint extraction. Synchronous + cheap; result
    // discarded because mount re-runs the resolvers with the override layer.
    const hintShell = resolveWidgetShell(state.config.lang);
    const hintSkin = resolveWidgetShellSkin(state.config.skin);

    void fetchBootstrap({
      apiHost,
      sitekey: state.config.sitekey,
      langIso: hintShell.iso,
      skinMode: hintSkin.mode,
    }).then((bootstrap) => {
      // Disconnect race: element removed from DOM during the bootstrap
      // wait. The new state bag from disconnectedCallback has no config,
      // so the guard fires and the mount is skipped.
      if (!this.state.connected || !this.state.config) return;
      this.completeMount(apiHost, bootstrap?.widget?.overrides ?? null);
    });
  }

  private completeMount(apiHost: string, overrides: OverridesPerAxis | null): void {
    const state = this.state;
    if (!state.config) return;
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const langOverride = (overrides?.language?.presets ?? null) as Record<string, LanguagePreset> | null;
    const skinOverride = (overrides?.skin?.presets ?? null) as Record<string, SkinPreset> | null;
    const configOverride = (overrides?.configuration?.presets ?? null) as Record<string, ConfigPreset> | null;

    const shell = resolveWidgetShell(state.config.lang, undefined, langOverride);
    for (const message of shell.issues) {
      fireError(this, 'invalid-config', message);
    }
    if (shell.direction === 'rtl') this.setAttribute('dir', 'rtl');

    const skin = resolveWidgetShellSkin(state.config.skin, undefined, skinOverride);
    for (const message of skin.issues) {
      fireError(this, 'invalid-config', message);
    }
    this.setAttribute('data-skin-mode', skin.mode);
    applySkinVars(this, skin.palette);

    const shellConfig = resolveWidgetShellConfig(state.config.config, configOverride);
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
    // installWidgetMethods (held in widget.start) see inert state. Also
    // makes the bootstrap .then guard fire if the response arrives after
    // disconnect.
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
