/* ============================================================================
   WHEEL OF FORTUNE — DOM control deck: LED meters, coin buttons, lever hit
   area, help overlay, splash, keyboard and volume.
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF, C = WOF.CONFIG;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const A = () => WOF.audio;

  function UI(game, renderer) {
    this.game = game; this.renderer = renderer;
    this.el = {
      credits: $('m-credits'), coins: $('m-coins'), paid: $('m-paid'), dots: [$('dot1'), $('dot2'), $('dot3')],
      insert: $('btn-insert'), betOne: $('btn-betone'), betMax: $('btn-betmax'), spin: $('btn-spin'), cash: $('btn-cash'),
      help: $('btn-help'), sound: $('btn-sound'), vol: $('vol'), lever: $('lever-hit'),
      splash: $('splash'), splashText: $('splash-text'), splashBar: $('splash-bar'), helpBox: $('help'), helpClose: $('help-close'), helpBody: $('help-body')
    };
    this.splashVisible = true; this.assetsReady = false; this.helpOpen = false;
    this.bind();
  }
  const P = UI.prototype;
  P.bind = function () {
    const g = this.game, e = this.el;
    const press = (el, fn) => el.addEventListener('click', ev => { ev.preventDefault(); A().init(); fn(); });
    press(e.insert, () => g.insertCoins(100));
    press(e.betOne, () => g.betOne());
    press(e.betMax, () => g.betMax());
    press(e.spin, () => g.pressSpin());
    press(e.cash, () => g.cashOut());
    press(e.lever, () => g.pullLever());
    press(e.help, () => { A().tick(); this.toggleHelp(); });
    press(e.helpClose, () => { A().tick(); this.toggleHelp(false); });
    press(e.sound, () => { const m = A().toggleMute(); this.updateSound(); if (!m) A().tick(); });
    e.vol.addEventListener('input', () => { A().init(); A().setVolume(parseFloat(e.vol.value)); if (A().muted) { A().setMuted(false); this.updateSound(); } });
    e.splash.addEventListener('pointerdown', () => { if (this.assetsReady) this.start(); });
    root.addEventListener('keydown', ev => {
      if (ev.repeat) return;
      if (ev.code === 'Space' || ev.code === 'Enter') {
        ev.preventDefault(); A().init();
        if (this.splashVisible) { if (this.assetsReady) this.start(); }
        else if (this.helpOpen) this.toggleHelp(false);
        else g.pressSpin();
        return;
      }
      if (this.splashVisible) return;
      A().init();
      switch (ev.code) {
        case 'Digit1': g.betOne(); break;
        case 'Digit3': case 'KeyM': g.betMax(); break;
        case 'KeyL': g.pullLever(); break;
        case 'KeyC': g.cashOut(); break;
        case 'KeyI': g.insertCoins(100); break;
        case 'KeyH': this.toggleHelp(); break;
        case 'KeyS': A().toggleMute(); this.updateSound(); break;
        case 'Escape': this.toggleHelp(false); break;
        default: break;
      }
    });
    e.vol.value = A().volume; this.updateSound();
  };
  P.start = function () { A().init(); this.splashVisible = false; this.el.splash.classList.add('hidden'); this.game.begin(); A().coinIn(); };
  P.setProgress = function (p) { this.el.splashBar.style.width = Math.round(p * 100) + '%'; };
  P.assetsLoaded = function () { this.assetsReady = true; this.el.splashText.textContent = 'PRESS TO PLAY'; this.el.splash.classList.add('ready'); };
  function set(el, text) { if (el && el._t !== text) { el._t = text; el.textContent = text; } }
  P.refresh = function () {
    const g = this.game, e = this.el, st = g.state;
    set(e.credits, fmt(g.credits)); set(e.coins, String(g.coins)); set(e.paid, fmt(g.paidDisplay));
    e.dots.forEach((d, i) => d.classList.toggle('on', i < g.coins));
    let label = 'SPIN REELS';
    if (st === 'bonusReady') label = 'SPIN WHEEL'; else if (st === 'paying' && g.rollup) label = 'TAKE WIN'; else if (g.overlay) label = 'CONTINUE';
    set(e.spin, label);
    const idle = st === 'idle';
    e.betOne.disabled = !idle; e.betMax.disabled = !idle; e.cash.disabled = !idle || g.credits <= 0; e.insert.disabled = !(idle || st === 'boot');
    e.spin.disabled = st === 'boot' || st === 'spinning' || st === 'wheel' || st === 'cashout' || st === 'wheelPaying';
    e.spin.classList.toggle('pulse', idle || st === 'bonusReady');
    e.spin.classList.toggle('bonus', st === 'bonusReady');
  };
  P.updateSound = function () { this.el.sound.textContent = A().muted ? '🔇' : '🔊'; this.el.sound.classList.toggle('muted', A().muted); };
  P.toggleHelp = function (force) { const open = force == null ? !this.helpOpen : force; this.helpOpen = open; this.el.helpBox.classList.toggle('hidden', !open); };
  P.buildHelp = function () {
    let html = '<table class="pays"><tr><th></th><th>1 COIN</th><th>2 COINS</th><th>3 COINS</th></tr>';
    C.pays.forEach(p => { html += '<tr><td>' + p.label + '</td>' + p.pays.map(v => '<td>' + (v === 'JACKPOT' ? '<b class="jp">JACKPOT</b>' : v) + '</td>').join('') + '</tr>'; });
    html += '</table><ul class="rules">' + C.rules.map(r => '<li>' + r + '</li>').join('') + '</ul>';
    html += '<p class="wheel-values">Wheel values: ' + C.wheel.map(w => w.value).sort((a, b) => b - a).join(' · ') + '</p>';
    html += '<p class="rtp">Theoretical return with 3 coins ' + (WOF.RTP || '93') + '%. Click the CREDITS meter or INSERT COINS to add 100 play credits. Unofficial fan recreation &mdash; play money only.</p>';
    this.el.helpBody.innerHTML = html;
  };
  WOF.UI = UI;
})(window);
