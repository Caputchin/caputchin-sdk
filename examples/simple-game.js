// Minimal customer-hosted game running inside an opaque-origin iframe.
// No imports — registers directly on globalThis.Caputchin.games.
(function () {
  globalThis.Caputchin = globalThis.Caputchin ?? { games: {}, gameOpts: {} };
  globalThis.Caputchin.gameOpts = globalThis.Caputchin.gameOpts ?? {};

  globalThis.Caputchin.gameOpts['@demo/simple'] = { preferredWidth: 280, preferredHeight: 160 };

  globalThis.Caputchin.games['@demo/simple'] = function (container, bridge) {
    const startMs = Date.now();
    let clicks = 0;

    const btn = document.createElement('button');
    btn.textContent = 'Click me (0 / 3)';
    btn.style.cssText = [
      'font-size:1.25rem',
      'padding:0.75rem 1.5rem',
      'border-radius:8px',
      'border:2px solid #6a4c93',
      'background:#f5f0ff',
      'color:#3d2a5e',
      'cursor:pointer',
    ].join(';');

    btn.addEventListener('click', function () {
      clicks += 1;
      btn.textContent = 'Click me (' + clicks + ' / 3)';

      if (clicks >= 3) {
        btn.disabled = true;
        btn.textContent = 'Done!';
        bridge.pass({ score: 1.0, durationMs: Date.now() - startMs });
      }
    });

    container.appendChild(btn);
  };
})();
