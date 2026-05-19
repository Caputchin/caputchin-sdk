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
    });
  }

  // Auto-size: report content dimensions to parent whenever they change.
  // The parent (IframeHost) snaps the iframe to match. First report also
  // reveals the iframe (kept visibility:hidden until then to avoid the
  // default 300×150 flash on iframe-load).
  // Auto-size: scrollWidth/scrollHeight on the html element reflect the
  // furthest extent of any content overflow. We force the html element to
  // shrink-wrap (width:max-content) so it reports the natural content
  // bounds instead of the iframe viewport. Combined with starting iframe
  // hidden, the user only ever sees the iframe at the correct size.
  let lastReportedWidth = -1;
  let lastReportedHeight = -1;
  function reportSize(): void {
    const root = document.documentElement;
    if (!root) return;
    const width = Math.ceil(root.scrollWidth);
    const height = Math.ceil(root.scrollHeight);
    if (width === lastReportedWidth && height === lastReportedHeight) return;
    if (width === 0 && height === 0) return;
    lastReportedWidth = width;
    lastReportedHeight = height;
    postToParent({ kind: 'resize', seq: 0, width, height });
  }
  function installResizeReporter(): void {
    // Shrink-wrap html so scrollWidth/scrollHeight = content extent, not
    // viewport. We inject a style at runtime instead of in the srcdoc CSP
    // so customer game scripts can still override (e.g. set html width to
    // 100% explicitly) if they need viewport-driven sizing.
    const style = document.createElement('style');
    style.textContent = 'html,body{width:max-content;height:max-content;margin:0}';
    document.head.appendChild(style);

    reportSize();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => reportSize());
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
  }

  // Defer manifest until all body scripts have run so register() has populated gameOpts.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      postManifest();
      installResizeReporter();
    }, { once: true });
  } else {
    postManifest();
    installResizeReporter();
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
