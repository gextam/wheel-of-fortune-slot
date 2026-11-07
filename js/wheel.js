/* ============================================================================
   WHEEL OF FORTUNE — bonus wheel physics.
   theta = wheel rotation (radians, clockwise on screen). The pointer sits at
   the top; wedge i is centred at local angle i*step, pegs on the boundaries.
   A spin is a constant-deceleration profile that ends exactly inside the
   predetermined wedge (never on a peg). The flapper is a stiff spring kicked
   by every peg that passes; ticks are reported for sound.
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF || (root.WOF = {});
  const TAU = Math.PI * 2;

  function Wheel(wedges) {
    this.wedges = wedges; this.n = wedges.length; this.step = TAU / this.n;
    this.theta = Math.random() * TAU; this.omega = 0;
    this.state = 'idle';
    this.flapper = 0; this.flapperV = 0;
    this.lightMode = 'idle'; this.lightPhase = 0; this.winFlash = 0;
    this.result = null; this.target = null;
    this.onTick = null; this.onStop = null;
  }
  const P = Wheel.prototype;

  P.wedgeAtPointer = function () {
    const local = ((-this.theta) % TAU + TAU) % TAU;
    return Math.floor((local + this.step / 2) / this.step) % this.n;
  };
  P.spinTo = function (target, now, opts) {
    opts = opts || {};
    const turns = opts.turns || (5 + Math.random() * 2);
    const u = (Math.random() * 0.7 - 0.35) * this.step;      /* rest inside the wedge, clear of the pegs */
    const base = -(target * this.step + u);
    const k = Math.ceil((this.theta + turns * TAU - base) / TAU);
    this.theta0 = this.theta; this.thetaF = base + k * TAU; this.dTheta = this.thetaF - this.theta0;
    this.T = opts.duration || (6.4 + Math.random() * 1.2);
    this.t0 = now; this.state = 'spinning'; this.result = null; this.target = target; this.lightMode = 'chase';
  };
  P.update = function (now, dt) {
    if (this.state === 'spinning') {
      const t = Math.min(this.T, now - this.t0), w0 = 2 * this.dTheta / this.T, a = w0 / this.T;
      const prev = this.theta;
      this.theta = this.theta0 + w0 * t - 0.5 * a * t * t; this.omega = w0 - a * t;
      const pegPrev = Math.floor((-prev) / this.step - 0.5), pegNow = Math.floor((-this.theta) / this.step - 0.5);
      if (pegNow !== pegPrev) {
        this.flapperV = -Math.min(14, 4 + Math.abs(this.omega) * 1.3);
        if (this.onTick) this.onTick(Math.abs(this.omega));
      }
      if (t >= this.T) {
        this.theta = this.thetaF; this.omega = 0; this.state = 'stopped';
        this.result = this.wedgeAtPointer(); this.lightMode = 'win'; this.winFlash = 0;
        if (this.onStop) this.onStop(this.result);
      }
    }
    const k = 420, c = 16;
    this.flapperV += (-k * this.flapper - c * this.flapperV) * dt;
    this.flapper += this.flapperV * dt;
    if (this.flapper > 0.03) { this.flapper = 0.03; if (this.flapperV > 0) this.flapperV = 0; }
    if (this.flapper < -0.55) { this.flapper = -0.55; if (this.flapperV < 0) this.flapperV = 0; }
    this.lightPhase += dt * (this.state === 'spinning' ? 9 : this.lightMode === 'chase' ? 7 : 2.5);
    this.winFlash += dt;
  };
  P.reset = function () { this.state = 'idle'; this.lightMode = 'idle'; this.result = null; };

  WOF.Wheel = Wheel;
})(window);
