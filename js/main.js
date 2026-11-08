/* ============================================================================
   WHEEL OF FORTUNE — bootstrap, frame loop, test hooks.
   ?force=spin|wof|sevens|bars|blank   ?wheel=<wedge index>   ?mute=1
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF, C = WOF.CONFIG;

  function setupDebug() {
    const q = new URLSearchParams(root.location.search), f = q.get('force'), wheel = q.get('wheel');
    if (wheel != null) WOF.DEBUG_WHEEL = parseInt(wheel, 10);
    if (!f) return;
    const idx = (reel, sym) => C.layout[reel].indexOf(sym);
    const blank = reel => C.layout[reel].indexOf('BLANK');
    WOF.DEBUG_FORCE = function () {
      if (f === 'spin') return [idx(0, 'SEVEN'), blank(1), idx(2, 'SPIN')];
      if (f === 'wof') return [idx(0, 'WOF'), idx(1, 'WOF'), idx(2, 'WOF')];
      if (f === 'sevens') return [idx(0, 'SEVEN'), idx(1, 'SEVEN'), idx(2, 'SEVEN')];
      if (f === 'bars') return [idx(0, 'BAR3'), idx(1, 'BAR2'), idx(2, 'BAR1')];
      if (f === 'blank') return [blank(0), blank(1), blank(2)];
      return null;
    };
  }

  root.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    const game = new WOF.Game();
    const renderer = new WOF.Renderer(canvas, game);
    game.renderer = renderer;
    const ui = new WOF.UI(game, renderer);
    WOF.game = game; WOF.renderer = renderer; WOF.ui = ui;
    setupDebug();
    ['chant1', 'chant2', 'chant3'].forEach(n => WOF.audio.preloadClip(n, 'assets/audio/' + n + '.mp3'));

    WOF.assets.load(p => ui.setProgress(p)).then(() => {
      WOF.assets.prepareSymbols(800, 316);
      ui.buildHelp(); ui.assetsLoaded();
    });

    WOF.timeOffset = 0;
    const clock = () => performance.now() / 1000 + WOF.timeOffset;
    let last = clock();
    function tick(now, dt, draw) {
      game.update(now, dt); root.ZEUS.fx.update(dt); renderer.update(dt);
      if (draw) { renderer.draw(now, dt); ui.refresh(); }
    }
    function frame() { const now = clock(), dt = Math.min(0.05, Math.max(0, now - last)); last = now; tick(now, dt, true); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    WOF.step = function (seconds) {
      const h = 1 / 60, n = Math.max(1, Math.round(seconds / h));
      for (let i = 0; i < n; i++) { WOF.timeOffset += h; const now = clock(); last = now; tick(now, h, i === n - 1); }
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && WOF.audio.ctx) WOF.audio.ctx.resume(); });
  });
})(window);
