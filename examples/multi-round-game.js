// Edge-case fixture: calls bridge.pass three times in a row with different
// scores. Verifies: (1) wrapped token locks at first pass, (2) subsequent
// passes still emit `pass` events for scoreboard purposes, (3) score and
// durationMs flow correctly through each round.
(function () {
  globalThis.Caputchin = globalThis.Caputchin ?? { games: {} };

  globalThis.Caputchin.games['@demo/multi-round'] = function (container, bridge) {
    const startMs = Date.now();
    let round = 0;

    const btn = document.createElement('button');
    btn.textContent = 'Pass round 1 / 3';
    btn.style.cssText = 'font-size:1rem;padding:0.6rem 1rem;border-radius:8px;border:2px solid #2F6640;background:#f0fdf4;color:#1f4a2c;cursor:pointer';
    container.appendChild(btn);

    btn.addEventListener('click', function () {
      round += 1;
      const score = round * 0.33;
      const durationMs = Date.now() - startMs;
      bridge.pass({ score: score, durationMs: durationMs });
      if (round >= 3) {
        btn.disabled = true;
        btn.textContent = 'All 3 rounds passed';
      } else {
        btn.textContent = 'Pass round ' + (round + 1) + ' / 3';
      }
    });
  };
})();
