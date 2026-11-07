/* ============================================================================
   WHEEL OF FORTUNE — game flow: coins & credits, weighted reel stops, line
   evaluation, roll-ups, the SPIN bonus (chant → wheel → award), the
   progressive jackpot, lever, cash-out and attract mode.
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF, ZEUS = root.ZEUS, C = WOF.CONFIG, FX = ZEUS.fx;
  const A = () => WOF.audio;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rnd() {
    const c = root.crypto;
    if (c && c.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }

  function Game() {
    this.credits = C.startCredits; this.coins = 1; this.paid = 0; this.paidDisplay = 0;
    this.jackpot = C.jackpotBase;
    this.state = 'boot'; this.message = 'LOADING';
    this.strips = C.strips;
    this.reels = [];
    for (let i = 0; i < 3; i++) {
      const strip = C.layout[i];
      const r = new ZEUS.Reel(i, strip, { vmax: 34, accelTime: 0.22, overshoot: 0.1, omega: 30, zeta: 0.55 });
      r.windupTime = 0.09; r.windupDist = 0.12;
      r.onLand = rr => this.onReelLand(rr);
      r.onStop = () => this.onReelStop();
      r.onPass = (rr, v) => { if (v > 6 && (Math.floor(rr.pos) & 1) === 0) A().reelTick(rr.index); };
      this.reels.push(r);
    }
    this.wheel = new WOF.Wheel(C.wheel);
    this.wheel.onTick = speed => A().wheelTick(speed);
    this.wheel.onStop = idx => this.onWheelStop(idx);
    this.lever = { angle: 0, t0: -10 };
    this.now = 0; this.sched = null; this.evalAt = 0; this.rollup = null; this.winCells = null; this.lastWinId = null;
    this.bonusValue = 0; this.overlay = null; this.spinTimer = 0; this.nextAttract = 15; this.lastInput = 0;
    this.stats = { spins: 0, wagered: 0, won: 0, wheels: 0, wheelWon: 0, jackpots: 0 };
    this.renderer = null;
  }
  const P = Game.prototype;

  P.begin = function () { this.state = 'idle'; this.setMessage(this.defaultMessage()); this.nextAttract = this.now + 14; };
  P.setMessage = function (m) { this.message = m; };
  P.defaultMessage = function () { return this.credits <= 0 ? 'INSERT COINS' : 'PLAY ' + this.coins + ' COIN' + (this.coins > 1 ? 'S' : '') + '  ·  SPIN REELS OR PULL THE HANDLE'; };
  P.canBet = function () { return this.state === 'idle'; };

  /* ---------------------------------------------------------- inputs */
  P.betOne = function () {
    this.lastInput = this.now;
    if (!this.canBet()) { A().deny(); return; }
    this.coins = this.coins % C.maxCoins + 1; A().coinIn(); this.setMessage(this.defaultMessage());
  };
  P.betMax = function () {
    this.lastInput = this.now;
    if (!this.canBet()) { A().deny(); return; }
    this.coins = C.maxCoins; A().coinIn(); this.spin();
  };
  P.insertCoins = function (n) {
    this.lastInput = this.now;
    if (this.state !== 'idle' && this.state !== 'boot') { A().deny(); return; }
    this.credits += n; A().coinIn(); this.setMessage(this.defaultMessage());
  };
  P.pressSpin = function () {
    this.lastInput = this.now;
    if (this.overlay) { if (this.overlay.skippable && this.now - this.overlay.t0 > (this.overlay.minTime || 1)) this.endOverlay(); return; }
    if (this.state === 'bonusReady') { this.spinWheel(); return; }
    if (this.state === 'paying' && this.rollup) { this.finishRollup(); return; }
    if (this.state === 'idle') this.spin();
  };
  P.pullLever = function () {
    this.lastInput = this.now;
    if (this.overlay) { this.pressSpin(); return; }
    if (this.state !== 'idle' && this.state !== 'bonusReady') { A().deny(); return; }
    if (this.state === 'idle' && this.credits < this.coins) { A().deny(); this.setMessage('INSERT COINS'); return; }
    this.lever.t0 = this.now; A().leverPull();
    this.spinTimer = this.now + 0.28; this.spinVia = 'lever';
  };
  P.cashOut = function () {
    this.lastInput = this.now;
    if (this.state !== 'idle' || this.credits <= 0) { A().deny(); return; }
    const amount = this.credits, dur = clamp(amount * 0.03, 0.8, 7);
    this.state = 'cashout'; A().hopper(dur);
    this.cash = { t0: this.now, dur: dur, from: amount };
    this.setMessage('PAYING OUT ' + amount + ' CREDITS');
    FX.coins(Math.min(60, 10 + amount / 5), { x: 960 });
  };

  /* ------------------------------------------------------------ spin */
  P.spin = function () {
    if (this.state !== 'idle' && this.state !== 'bonusReady') return false;
    if (this.state === 'bonusReady') { this.spinWheel(); return true; }
    if (this.credits < this.coins) { A().deny(); this.setMessage('INSERT COINS'); return false; }
    this.credits -= this.coins; this.jackpot += this.coins * C.jackpotRate;
    this.stats.spins++; this.stats.wagered += this.coins;
    this.paid = 0; this.paidDisplay = 0; this.winCells = null; this.lastWinId = null; this.wheel.reset();
    this.stops = [0, 1, 2].map(i => WOF.stopPick(this.strips, i, rnd()));
    if (WOF.DEBUG_FORCE) { const f = WOF.DEBUG_FORCE(this); if (f) this.stops = f; }
    this.line = this.stops.map((s, i) => C.layout[i][s]);
    this.state = 'spinning'; this.setMessage('GOOD LUCK');
    const base = this.now;
    this.sched = { startAt: [base, base + 0.07, base + 0.14], stopAt: [base + 0.95, base + 1.3, base + 1.65], started: [false, false, false], requested: [false, false, false] };
    this.stoppedCount = 0;
    A().stepperStart();
    return true;
  };
  P.update = function (now, dt) {
    this.now = now;
    if (this.spinTimer && now >= this.spinTimer) { this.spinTimer = 0; this.spin(); }
    if (this.state === 'spinning' && this.sched) {
      const s = this.sched;
      for (let i = 0; i < 3; i++) {
        const r = this.reels[i];
        if (!s.started[i] && now >= s.startAt[i]) { r.spin(now); s.started[i] = true; }
        if (s.started[i] && !s.requested[i] && now >= s.stopAt[i]) { r.requestStop(this.stops[i], false); s.requested[i] = true; }
      }
      let sp = 0; this.reels.forEach(r => { sp += r.speed; }); A().stepperSet(sp / (3 * this.reels[0].vmax));
    }
    this.reels.forEach(r => r.update(now, dt));
    this.wheel.update(now, dt);
    const lt = now - this.lever.t0; this.lever.angle = lt < 0.3 ? Math.sin(lt / 0.3 * Math.PI / 2) : lt < 0.9 ? Math.cos((lt - 0.3) / 0.6 * Math.PI / 2) : 0;
    if (this.evalAt && now >= this.evalAt) { this.evalAt = 0; this.evaluate(); }
    if (this.rollup) {
      const ru = this.rollup, u = Math.min(1, (now - ru.t0) / ru.dur);
      const target = Math.round(ru.to * u);
      if (target > this.paidDisplay) { const steps = target - this.paidDisplay; this.paidDisplay = target; this.credits = ru.creditsBase + target; if (now - (ru.lastTick || 0) > 0.055) { ru.lastTick = now; A().creditTick(ru.ticks = (ru.ticks || 0) + 1); } void steps; }
      if (u >= 1) this.finishRollup();
    }
    if (this.state === 'cashout' && this.cash) {
      const u = Math.min(1, (now - this.cash.t0) / this.cash.dur);
      this.credits = Math.round(this.cash.from * (1 - u));
      if (u >= 1) { this.credits = 0; this.cash = null; this.state = 'idle'; this.setMessage('THANK YOU  ·  INSERT COINS TO PLAY'); }
    }
    if (this.overlay) {
      const ov = this.overlay;
      if (!ov.ending && now - ov.t0 >= ov.dur) this.endOverlay();
      else if (ov.ending && now >= ov.endAt + 0.4) { this.overlay = null; if (ov.onDone) ov.onDone(); }
    }
    if (this.state === 'idle' && now > this.nextAttract && A().ready) {
      this.nextAttract = now + 16 + Math.random() * 12;
      if (now - this.lastInput > 10) { A().attractJingle(); this.wheel.lightMode = 'chase'; setTimeout(() => { if (this.state === 'idle') this.wheel.lightMode = 'idle'; }, 4000); }
    }
  };

  /* ------------------------------------------------------ reel events */
  P.onReelLand = function (reel) {
    A().reelStopStepper(reel.index);
    const R = this.renderer; if (!R) return;
    const sym = this.line[reel.index];
    if (sym === 'WOF' || (sym === 'SPIN' && this.coins === 3)) { const rect = R.cellRect(reel.index, 1); FX.sparkle(rect.cx, rect.cy, 12, { color: sym === 'WOF' ? '#ffe27a' : '#9fd0ff' }); }
  };
  P.onReelStop = function () {
    this.stoppedCount++;
    if (this.stoppedCount >= 3) { A().stepperStop(); this.evalAt = this.now + 0.15; }
  };
  P.evaluate = function () {
    const payId = WOF.evalLine(this.line);
    if (payId) {
      const isJackpot = payId === 'WOF3' && this.coins === 3;
      const win = WOF.payFor(payId, this.coins, this.jackpot);
      this.lastWinId = payId; this.winCells = [0, 1, 2]; this.paid = win; this.stats.won += win;
      this.state = 'paying';
      this.rollup = { t0: this.now, dur: clamp(win * 0.04, 0.5, isJackpot ? 9 : 6), to: win, creditsBase: this.credits };
      this.setMessage(C.payById[payId].label.toUpperCase() + '  ·  WINNER PAID ' + win);
      if (isJackpot) {
        this.stats.jackpots++; this.jackpot = C.jackpotBase;
        A().jackpotBells(8); this.overlay = { kind: 'jackpot', amount: win, t0: this.now, dur: 9, skippable: true, minTime: 2 };
        FX.coins(80); FX.flash = 0.8;
      } else A().winBell(win >= 100 * this.coins ? 2 : 1);
      if (win >= 150) FX.coins(Math.min(50, win / 8));
      return;
    }
    if (this.line[2] === 'SPIN') {
      if (this.coins === C.maxCoins) {
        this.state = 'bonusReady'; A().chant(); this.wheel.lightMode = 'chase';
        this.winCells = [2]; this.setMessage('SPIN THE WHEEL!  ·  PRESS SPIN OR PULL THE HANDLE');
        FX.sparkle(960, 300, 30, { color: '#ffffff', speed: 400 });
        return;
      }
      this.setMessage('PLAY 3 COINS TO SPIN THE WHEEL');
      A().deny();
    } else this.setMessage(this.defaultMessage());
    this.state = 'idle';
  };
  P.finishRollup = function () {
    const ru = this.rollup; if (!ru) return;
    this.paidDisplay = ru.to; this.credits = ru.creditsBase + ru.to; this.rollup = null;
    if (this.state === 'paying') { this.state = 'idle'; if (!this.overlay) this.setMessage(this.defaultMessage()); }
    if (this.state === 'wheelPaying') { this.state = 'idle'; this.setMessage(this.defaultMessage()); this.wheel.lightMode = 'idle'; }
  };

  /* ------------------------------------------------------------ wheel */
  P.spinWheel = function () {
    if (this.state !== 'bonusReady') return;
    this.state = 'wheel'; this.stats.wheels++;
    const target = WOF.wheelPick(rnd());
    this.wheel.spinTo(WOF.DEBUG_WHEEL != null ? WOF.DEBUG_WHEEL : target, this.now);
    A().wheelStart(); this.setMessage('WHEEL OF FORTUNE!'); this.winCells = null;
  };
  P.onWheelStop = function (idx) {
    const value = C.wheel[idx].value;
    this.bonusValue = value; this.stats.wheelWon += value; this.stats.won += value;
    A().wheelStop(value);
    this.state = 'wheelPaying'; this.paid = value; this.paidDisplay = 0;
    this.rollup = { t0: this.now + 0.6, dur: clamp(value * 0.03, 0.8, 6), to: value, creditsBase: this.credits };
    this.setMessage('THE WHEEL AWARDS ' + value + ' CREDITS');
    FX.sparkle(960, 300 - 225, 24, { color: '#ffe27a', speed: 300 });
    if (value >= 300) FX.coins(Math.min(60, value / 10));
  };
  P.endOverlay = function () { const ov = this.overlay; if (!ov || ov.ending) return; ov.ending = true; ov.endAt = this.now; if (this.rollup) this.finishRollup(); };

  WOF.Game = Game;
})(window);
