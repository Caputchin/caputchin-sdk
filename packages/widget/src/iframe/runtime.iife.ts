// Self-contained iframe bootstrap. Only types imported — they erase at compile time.
// Runs inside srcdoc iframe — opaque origin. communicates with host page via postMessage.

import type { Bridge, GameFactory, Layout, RegisterOptions } from '@caputchin/game-sdk';

(function () {
  interface CaputchinGlobal {
    games: Record<string, GameFactory>;
    gameOpts: Record<string, RegisterOptions>;
  }

  (window as unknown as Record<string, unknown>)['Caputchin'] = {
    games: {},
    gameOpts: {},
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

  // Read embedded game id from the runtime script tag (srcdoc sets data-game-id).
  const runtimeScript = document.querySelector('script[data-game-id]');
  const embeddedRaw = runtimeScript ? runtimeScript.getAttribute('data-game-id') : null;
  const embeddedGameId: string | null = embeddedRaw && embeddedRaw.length > 0 ? embeddedRaw : null;

  let seq = -1;
  let cleanup: (() => void) | void = undefined;
  let kickoffGameId: string | null = null;
  let currentLayout: Layout | null = null;

  function postToParent(msg: Record<string, unknown>): void {
    window.parent.postMessage(msg, '*');
  }

  function postError(code: string, message: string): void {
    postToParent({ kind: 'game-error', seq, code, message });
  }

  function postManifest(): void {
    const opts =
      embeddedGameId !== null
        ? (W['Caputchin'] as CaputchinGlobal).gameOpts[embeddedGameId]
        : undefined;
    postToParent({
      kind: 'manifest',
      seq: 0,
      gameId: embeddedGameId,
      preferredLayout: opts?.preferredLayout ?? null,
      preferredWidth: typeof opts?.preferredWidth === 'number' ? opts.preferredWidth : null,
      preferredHeight: typeof opts?.preferredHeight === 'number' ? opts.preferredHeight : null,
    });
  }

  // Defer manifest until all body scripts have run so register() has populated gameOpts.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', postManifest, { once: true });
  } else {
    postManifest();
  }

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

      const factory = registry[kickoffGameId];
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
        const wInt = Math.max(1, Math.round(w));
        const hInt = Math.max(1, Math.round(h));
        if (wInt === lastPostedW && hInt === lastPostedH) return;
        lastPostedW = wInt;
        lastPostedH = hInt;
        postToParent({ kind: 'dimensions-measured', seq, width: wInt, height: hInt, source });
      }

      const bridge: Bridge = {
        pass({ score, durationMs }) {
          postToParent({
            kind: 'game-pass',
            seq,
            score,
            durationMs: durationMs ?? null,
          });
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

      try {
        cleanup = factory(root, bridge);
      } catch (err) {
        postError('game-error-relayed', String(err));
        return;
      }

      // Auto-measure the game's first rendered child. Works for intrinsic-
      // sized roots (canvas with width/height attrs, fixed-px divs) — the
      // ResizeObserver fires with the natural content size which differs
      // from the iframe's CSS size. For CSS-percentage layouts the measured
      // size will equal the iframe size (no useful signal) — those games
      // call bridge.setSize() explicitly instead.
      if (typeof ResizeObserver === 'function') {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const rect = entry.contentRect;
            if (rect.width > 0 && rect.height > 0) {
              postDimensions(rect.width, rect.height, 'auto');
            }
          }
        });
        const target = root.firstElementChild ?? root;
        ro.observe(target);
        // Single-shot per design — viewport changes mid-session are an
        // antipattern. Disconnect after the first paint settles.
        // Use a microtask + raf to give the game a chance to render then
        // disconnect on next frame.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => ro.disconnect());
        });
      }

      postToParent({ kind: 'game-started', seq });
      return;
    }

    if (data['kind'] === 'dispose') {
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
