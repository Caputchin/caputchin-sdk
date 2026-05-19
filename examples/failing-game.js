// Edge-case fixture: deliberately calls bridge.error after a short delay.
// Exercises the iframe → widget error-relay path (`game-error-relayed`).
(function () {
  globalThis.Caputchin = globalThis.Caputchin ?? { games: {}, gameOpts: {} };
  globalThis.Caputchin.gameOpts = globalThis.Caputchin.gameOpts ?? {};

  globalThis.Caputchin.gameOpts['@demo/failing'] = { preferredWidth: 320, preferredHeight: 80 };

  globalThis.Caputchin.games['@demo/failing'] = function (container, bridge) {
    const msg = document.createElement('div');
    msg.textContent = 'This game will fail in 1.5s …';
    msg.style.cssText = 'font:14px system-ui;color:#c2410c;padding:1rem';
    container.appendChild(msg);

    setTimeout(function () {
      bridge.error({ code: 'demo-failure', message: 'Simulated bridge.error from failing-game.js' });
    }, 1500);
  };
})();
