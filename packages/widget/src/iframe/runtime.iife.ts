// Self-contained iframe bootstrap. esbuild bundles this file with its imports;
// the resulting IIFE is injected into the srcdoc as a string literal.
// Runs inside srcdoc iframe; opaque origin. communicates with host page via postMessage.

import type { Bridge, GameContext, GameFactory, GameManifest, Layout, ResolvedConfig, ResolvedLocale, ResolvedSkin, Seed } from '@caputchin/game-sdk';
import { DEFAULT_REGISTRY_KEY } from '@caputchin/game-sdk';

(function () {
  interface CaputchinGlobal {
    games: Record<string, GameFactory>;
    manifests: Record<string, GameManifest>;
  }

  (window as unknown as Record<string, unknown>)['Caputchin'] = {
    games: {},
    manifests: {},
  } satisfies CaputchinGlobal;

  const W = window as unknown as Record<string, unknown>;

  // ---- audio mute on hide ----
  // Wrap AudioContext constructors so every instance the game creates is
  // tracked. When the host page postMessages visibility=false, suspend them
  // all; on visibility=true, resume. This guarantees the iframe stays
  // silent while the modal/fullscreen dialog is closed even though the
  // iframe document keeps running.
  type AudioCtxLike = AudioContext & { suspend?: () => Promise<void>; resume?: () => Promise<void> };
  const audioContexts: AudioCtxLike[] = [];
  let suspendedByHost = false;

  function wrapAudio(name: 'AudioContext' | 'webkitAudioContext'): void {
    const Orig = (window as unknown as Record<string, unknown>)[name];
    if (typeof Orig !== 'function') return;
    const Wrapped = function (this: unknown, ...args: unknown[]) {
      const ctx = new (Orig as unknown as new (...a: unknown[]) => AudioCtxLike)(...args);
      audioContexts.push(ctx);
      if (suspendedByHost) { try { ctx.suspend?.(); } catch { /* */ } }
      return ctx;
    } as unknown as typeof Orig;
    // Preserve prototype chain for `instanceof` checks the game might do.
    (Wrapped as unknown as { prototype: unknown }).prototype = (Orig as unknown as { prototype: unknown }).prototype;
    (window as unknown as Record<string, unknown>)[name] = Wrapped;
  }
  wrapAudio('AudioContext');
  wrapAudio('webkitAudioContext');

  function setAudioSuspended(suspended: boolean): void {
    suspendedByHost = suspended;
    for (const ctx of audioContexts) {
      try {
        if (suspended) ctx.suspend?.();
        else ctx.resume?.();
      } catch { /* best effort */ }
    }
  }

  // ---- focus-steal guard ----
  // Games commonly call element.focus() on mount (e.g. auto-focusing a
  // Start button so keyboard users can hit Enter). Inside an iframe that
  // hasn't been interacted with yet, focus() yanks focus away from the
  // host page - interrupting whatever the user was typing into a form
  // field, breaking RTM screen-readers, etc.
  //
  // Patch: while the iframe document is unfocused AND the user hasn't
  // interacted with it yet, swallow focus() calls. Once the user clicks
  // or types inside the iframe, lift the guard so in-game focus
  // management (board navigation, win-screen retry button) works as
  // authored.
  //
  // Scope: HTMLElement.prototype.focus is the entry point for buttons,
  // inputs, divs, anchors - covers every focusable element. The runtime
  // is the right layer for the patch (works for every game without each
  // game opting in).
  let userInteractedWithIframe = false;
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function focusGuarded(this: HTMLElement, options?: FocusOptions): void {
    if (!userInteractedWithIframe && !document.hasFocus()) return;
    return originalFocus.call(this, options);
  };
  const markUserInteracted = (): void => { userInteractedWithIframe = true; };
  document.addEventListener('pointerdown', markUserInteracted, { once: true, capture: true });
  document.addEventListener('keydown', markUserInteracted, { once: true, capture: true });
  document.addEventListener('focusin', markUserInteracted, { once: true, capture: true });

  // Read embedded game id from the runtime script tag (srcdoc sets data-game-id).
  const runtimeScript = document.querySelector('script[data-game-id]');
  const embeddedRaw = runtimeScript ? runtimeScript.getAttribute('data-game-id') : null;
  const embeddedGameId: string | null = embeddedRaw && embeddedRaw.length > 0 ? embeddedRaw : null;

  let seq = -1;
  let cleanup: (() => void) | void = undefined;
  let kickoffGameId: string | null = null;
  let currentLayout: Layout | null = null;
  let sizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;

  function postToParent(msg: Record<string, unknown>): void {
    window.parent.postMessage(msg, '*');
  }

  function postError(code: string, message: string): void {
    postToParent({ kind: 'game-error', seq, code, message });
  }

  // The game no longer posts its manifest up to the widget. The server resolves
  // presets + the preferred footprint (the bootstrap response), and the resolved
  // presets arrive via the kickoff message below. The game factory + manifest
  // registry (looked up on kickoff) are unchanged.

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;

    const data = event.data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) return;

    if (data['kind'] === 'layout-context') {
      const raw = data['layout'];
      if (raw === 'inline' || raw === 'modal' || raw === 'fullscreen') {
        currentLayout = raw;
      }
      return;
    }

    if (data['kind'] === 'visibility') {
      // Host signals dialog visibility (modal/fullscreen open/close). Game
      // logic keeps running; only audio context is suspended so the hidden
      // dialog can't leak sound through the host page.
      setAudioSuspended(data['visible'] === false);
      return;
    }

    if (data['kind'] === 'kickoff') {
      seq = data['seq'] as number;
      kickoffGameId = (data['gameId'] as string | null) ?? null;
      const kickoffSeed = (data['seed'] as Seed | null) ?? null;
      const kickoffLocale = (data['locale'] as ResolvedLocale | null) ?? null;
      const kickoffSkin = (data['skin'] as ResolvedSkin | null) ?? null;
      const kickoffConfig = (data['config'] as ResolvedConfig | null) ?? null;

      const root = document.getElementById('cpt-root');
      if (!root) {
        postError('game-not-registered', 'cpt-root element missing');
        return;
      }

      if (kickoffGameId === null) {
        postToParent({ kind: 'game-started', seq });
        return;
      }

      const registry = ((W['Caputchin'] as CaputchinGlobal) || {}).games || {};

      // Try the marketplace id first, then fall through to the default slot so
      // games that registered without an author-declared id still resolve.
      const factory = registry[kickoffGameId] ?? registry[DEFAULT_REGISTRY_KEY];
      if (!factory) {
        postError('game-not-registered', `No game registered for id "${kickoffGameId}"`);
        return;
      }

      // Single helper for both auto-measure + bridge.setSize. Tracks the
      // last posted dimensions so repeat triggers (e.g., a ResizeObserver
      // firing twice with the same size) don't spam the host.
      let lastPostedW = -1;
      let lastPostedH = -1;
      function postDimensions(w: number, h: number, source: 'auto' | 'explicit'): void {
        let wInt = Math.max(1, Math.round(w));
        let hInt = Math.max(1, Math.round(h));
        // Auto-measure is grow-only; pin each axis to the max of measured
        // and last-posted. Explicit (bridge.setSize) bypasses this guard
        // so games can deliberately resize down too.
        if (source === 'auto' && lastPostedW > 0 && lastPostedH > 0) {
          if (wInt <= lastPostedW && hInt <= lastPostedH) return;
          wInt = Math.max(wInt, lastPostedW);
          hInt = Math.max(hInt, lastPostedH);
        }
        if (wInt === lastPostedW && hInt === lastPostedH) return;
        lastPostedW = wInt;
        lastPostedH = hInt;
        postToParent({ kind: 'dimensions-measured', seq, width: wInt, height: hInt, source });
      }

      const bridge: Bridge = {
        pass({ trace }) {
          postToParent({ kind: 'game-pass', seq, trace });
        },
        error({ code, message }) {
          postError(code, message ?? '');
        },
        setSize(width, height) {
          postDimensions(width, height, 'explicit');
        },
        get layout(): Layout | null {
          return currentLayout;
        },
      };

      const ctx: GameContext = { seed: kickoffSeed, locale: kickoffLocale, skin: kickoffSkin, config: kickoffConfig };

      try {
        cleanup = factory(root, bridge, ctx);
      } catch (err) {
        postError('game-error-relayed', String(err));
        return;
      }

      // Auto-measure the game's natural content size. Probes the document
      // root's scrollWidth / scrollHeight; those exceed the iframe size
      // whenever content overflows in either axis, which is the universal
      // signal the SDK can read regardless of how the game lays its DOM
      // out (canvas with intrinsic dimensions, CSS-percentage flex/grid,
      // absolute-positioned). When scroll measurements match the iframe
      // size, content fits inside and no resize is needed.
      //
      // Observer stays connected for the lifetime of the round so legitimate
      // post-game UI shifts (replay buttons, score panels) re-flow the
      // iframe too. The `postDimensions` dedupe guard suppresses spam from
      // animations that don't change layout dimensions. Cleaned up in the
      // 'dispose' handler below alongside the rest of the game lifecycle.
      // Auto-measure the game's natural content size. Probes documentElement
      // scrollWidth/Height; those exceed the iframe size whenever content
      // overflows in either axis. ResizeObserver catches the iframe being
      // resized externally; MutationObserver catches game DOM additions
      // that grow content past the current iframe (e.g., a post-game replay
      // button appears under the game tiles).
      //
      // Grow-only: auto-measure can only EXPAND the iframe, never shrink
      // it. A game whose content shrinks mid-session (button removed,
      // panel collapsed) is allowed; the iframe stays at the grown size.
      // Games that genuinely need to shrink can call `bridge.setSize(w, h)`
      // explicitly; that path bypasses the grow-only guard.
      function measureDocumentSize(): void {
        const docEl = document.documentElement;
        const w = Math.max(docEl.scrollWidth, document.body?.scrollWidth ?? 0);
        const h = Math.max(docEl.scrollHeight, document.body?.scrollHeight ?? 0);
        if (w > 0 && h > 0) postDimensions(w, h, 'auto');
      }
      if (typeof ResizeObserver === 'function') {
        sizeObserver = new ResizeObserver(() => measureDocumentSize());
        sizeObserver.observe(document.documentElement);
        if (document.body) sizeObserver.observe(document.body);
      }
      if (typeof MutationObserver === 'function' && document.body) {
        mutationObserver = new MutationObserver(() => measureDocumentSize());
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
      }
      requestAnimationFrame(() => requestAnimationFrame(measureDocumentSize));

      postToParent({ kind: 'game-started', seq });
      return;
    }

    if (data['kind'] === 'dispose') {
      if (sizeObserver) {
        sizeObserver.disconnect();
        sizeObserver = null;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (_) {
          // best-effort cleanup
        }
      }
      return;
    }
  });

  document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
    const msg = `${event.violatedDirective}: ${event.blockedURI}`.slice(0, 200);
    postError('iframe-script-blocked', msg);
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    const msg = event.message ? String(event.message).slice(0, 200) : 'Script error';
    postError('game-error-relayed', msg);
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = event.reason ? String(event.reason).slice(0, 200) : 'Unhandled rejection';
    postError('game-error-relayed', msg);
  });
})();
