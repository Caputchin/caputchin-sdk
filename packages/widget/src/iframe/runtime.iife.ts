// Self-contained iframe bootstrap. No external imports.
// Runs inside srcdoc iframe — opaque origin. communicates with host page via postMessage.

(function () {
  type Bridge = {
    complete(payload: { score: number | null; durationMs: number | null }): void;
    error(code: string, message: string): void;
  };

  type GameFactory = (container: HTMLElement, bridge: Bridge) => (() => void) | void;

  interface CaputchinGlobal {
    games: Record<string, GameFactory>;
  }

  (window as unknown as Record<string, unknown>)['Caputchin'] = {
    games: {},
  } satisfies CaputchinGlobal;

  const W = window as unknown as Record<string, unknown>;

  let seq = -1;
  let cleanup: (() => void) | void = undefined;
  let gameId: string | null = null;

  function postToParent(msg: Record<string, unknown>): void {
    window.parent.postMessage(msg, '*');
  }

  function postError(code: string, message: string): void {
    postToParent({ kind: 'game-error', seq, code, message });
  }

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;

    const data = event.data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) return;

    if (data['kind'] === 'kickoff') {
      seq = data['seq'] as number;
      gameId = (data['gameId'] as string | null) ?? null;

      const root = document.getElementById('cpt-root');
      if (!root) {
        postError('game-not-registered', 'cpt-root element missing');
        return;
      }

      if (gameId === null) {
        postToParent({ kind: 'game-started', seq });
        return;
      }

      const registry = ((W['Caputchin'] as CaputchinGlobal) || {}).games || {};

      const factory = registry[gameId];
      if (!factory) {
        postError('game-not-registered', `No game registered for id "${gameId}"`);
        return;
      }

      const bridge: Bridge = {
        complete({ score, durationMs }) {
          postToParent({ kind: 'game-complete', seq, score, durationMs });
        },
        error(code, message) {
          postError(code, message);
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
