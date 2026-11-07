/* ============================================================================
   WHEEL OF FORTUNE — sound: classic stepper noises, coin handling, bells,
   the bonus wheel flapper and the crowd chant (generated voice clip layered
   into a crowd; synthesized fallback when the clip is unavailable).
   Built on the shared synthesizer engine (ZEUS.AudioEngine in audio.js).
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF, ZEUS = root.ZEUS;
  const A = WOF.audio = new ZEUS.AudioEngine();
  A.clipsRaw = {}; A.clips = {};
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---- clips (voice) ---- */
  A.preloadClip = function (name, url) {
    if (!root.fetch) return;
    fetch(url).then(r => (r.ok ? r.arrayBuffer() : null)).then(buf => { if (buf) this.clipsRaw[name] = buf; }).catch(() => { /* offline or file:// */ });
  };
  A.playClip = function (name, o) {
    o = o || {};
    if (!this.ready) return false;
    const raw = this.clipsRaw[name]; if (!raw && !this.clips[name]) return false;
    const play = ab => {
      const layers = o.layers || [{ detune: 0, delay: 0, gain: 1 }];
      layers.forEach(L => {
        const src = this.ctx.createBufferSource(); src.buffer = ab; src.detune.value = L.detune || 0;
        if (L.rate) src.playbackRate.value = L.rate;
        const g = this._g((o.gain || 0.8) * (L.gain || 1), this.sfx, o.send == null ? 0.5 : o.send);
        src.connect(g); src.start(this.now() + (L.delay || 0));
      });
    };
    if (this.clips[name]) play(this.clips[name]);
    else this.ctx.decodeAudioData(raw.slice(0)).then(ab => { this.clips[name] = ab; play(ab); }).catch(() => {});
    return true;
  };
  /* the famous studio-audience chant: one voice line layered into a crowd */
  A.chant = function () {
    if (!this.ready) return;
    /* three generated voices, each doubled with detuned copies = a small crowd */
    let ok = false;
    [['chant1', 0], ['chant2', 0.04], ['chant3', 0.08]].forEach(([name, d]) => {
      ok = this.playClip(name, { gain: 0.5, send: 0.7, layers: [{ detune: 0, delay: d, gain: 1 }, { detune: -60, delay: d + 0.03, gain: 0.7 }, { detune: 45, delay: d + 0.055, gain: 0.6 }] }) || ok;
    });
    if (!ok) { /* synthesized stand-in: three brass hits */
      const t = this.now();
      [[0, 0.3, 60], [0.42, 0.3, 62], [0.84, 0.9, 67]].forEach(([d, dur, n]) => { [0, 4, 7].forEach(iv => this.brass(midi(n + iv), t + d, dur, 0.12)); this.thump(t + d, { freq: 70, gain: 0.4, dur: 0.12 }); });
    }
    this.lightsSweep();
  };
  A.lightsSweep = function () { const t = this.now(); for (let i = 0; i < 10; i++) this.tone({ t: t + i * 0.07, freq: 1200 + i * 180, gain: 0.05, a: 0.003, d: 0.05, s: 0.001, r: 0.03, dur: 0.05 }); };

  /* ---- stepper reels ---- */
  A.stepperStart = function () {
    if (!this.ready || this._step) return;
    const ctx = this.ctx, t = this.now();
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 96;
    const sq = ctx.createOscillator(); sq.type = 'square'; sq.frequency.value = 193;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 1.2;
    const am = ctx.createGain(); am.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 27; const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(); g.gain.value = 0;
    saw.connect(f); sq.connect(f); f.connect(am); am.connect(g); g.connect(this.sfx);
    const nz = ctx.createBufferSource(); nz.buffer = this.noiseBuf; nz.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0; nz.connect(nf); nf.connect(ng); ng.connect(this.sfx);
    saw.start(t); sq.start(t); lfo.start(t); nz.start(t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.15); ng.gain.linearRampToValueAtTime(0.035, t + 0.15);
    this._step = { saw: saw, sq: sq, lfo: lfo, nz: nz, g: g, ng: ng };
    this.thump(t, { freq: 160, gain: 0.3, dur: 0.06 });
  };
  A.stepperSet = function (level) {
    if (!this._step) return; const t = this.now();
    this._step.g.gain.setTargetAtTime(0.05 * level, t, 0.08); this._step.ng.gain.setTargetAtTime(0.035 * level, t, 0.08);
  };
  A.stepperStop = function () {
    if (!this._step) return; const s = this._step, t = this.now();
    s.g.gain.setTargetAtTime(0, t, 0.05); s.ng.gain.setTargetAtTime(0, t, 0.05);
    [s.saw, s.sq, s.lfo, s.nz].forEach(n => n.stop(t + 0.4)); this._step = null;
  };
  A.reelStopStepper = function (i) {
    if (!this.ready) return; const t = this.now();
    this.noise({ t: t, type: 'lowpass', freq: 900, gain: 0.5, dur: 0.02, d: 0.03, s: 0.2, r: 0.03 });
    this.thump(t, { freq: 190 - i * 12, gain: 0.35, dur: 0.05 });
    const f = [784, 988, 1175][i] || 1319;
    this.tone({ t: t + 0.01, freq: f, gain: 0.16, a: 0.002, d: 0.22, s: 0.001, r: 0.05, dur: 0.22, send: 0.3 });
    this.tone({ t: t + 0.01, freq: f * 2, gain: 0.05, a: 0.002, d: 0.12, s: 0.001, r: 0.05, dur: 0.12 });
  };

  /* ---- coins & credits ---- */
  A.coinIn = function () {
    if (!this.ready) return; const t = this.now();
    this.noise({ t: t, type: 'bandpass', freq: 3800, Q: 4, gain: 0.3, dur: 0.02, d: 0.04, s: 0.2, r: 0.05 });
    this.bell(3400 * (0.97 + Math.random() * 0.06), t + 0.01, { gain: 0.07, dur: 0.35 });
    this.noise({ t: t + 0.09, type: 'lowpass', freq: 600, gain: 0.25, dur: 0.02, d: 0.03, s: 0.2, r: 0.03 });
  };
  A.creditTick = function (k) {
    if (!this.ready) return; const t = this.now();
    const f = k % 2 ? 1568 : 1760;
    this.tone({ t: t, freq: f, gain: 0.11, a: 0.002, d: 0.07, s: 0.001, r: 0.03, dur: 0.07, send: 0.2 });
    this.tone({ t: t, freq: f * 2.01, gain: 0.03, a: 0.002, d: 0.05, s: 0.001, r: 0.02, dur: 0.05 });
    this.noise({ t: t + 0.01, type: 'bandpass', freq: 4500, Q: 3, gain: 0.08, dur: 0.012, d: 0.02, s: 0.1, r: 0.02 });
  };
  A.winBell = function (level) {
    if (!this.ready) return; const t = this.now();
    const notes = level >= 2 ? [76, 80, 83, 88, 92] : [76, 80, 83];
    notes.forEach((n, i) => this.bell(midi(n), t + i * 0.09, { gain: 0.12, dur: 0.9 }));
  };
  A.jackpotBells = function (dur) {
    if (!this.ready) return; const ctx = this.ctx, t = this.now(); dur = dur || 6;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 2050;
    const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 2650;
    const trem = ctx.createGain(); trem.gain.value = 0.5; const lfo = ctx.createOscillator(); lfo.frequency.value = 9; const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(trem.gain);
    const g = this._g(0.0001, this.sfx, 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.1); g.gain.setValueAtTime(0.12, t + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(trem); osc2.connect(trem); trem.connect(g); osc.start(t); osc2.start(t); lfo.start(t); osc.stop(t + dur); osc2.stop(t + dur); lfo.stop(t + dur);
    for (let k = 0; k < 4; k++) [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79]][k].forEach(n => this.brass(midi(n), t + 0.3 + k * 0.5, k === 3 ? 1.6 : 0.42, 0.1));
    this.duck(dur);
  };
  A.hopper = function (seconds) {
    if (!this.ready) return; const t = this.now(), n = Math.floor(seconds / 0.045);
    for (let k = 0; k < n; k++) {
      const tt = t + k * 0.045 + Math.random() * 0.02;
      this.bell(2600 + Math.random() * 2600, tt, { gain: 0.035, dur: 0.25 });
      this.noise({ t: tt, type: 'bandpass', freq: 3000 + Math.random() * 3000, Q: 2, gain: 0.08, dur: 0.01, d: 0.02, s: 0.1, r: 0.02 });
    }
    this.noise({ t: t, type: 'lowpass', freq: 500, gain: 0.08, a: 0.05, d: seconds, s: 0.6, r: 0.3, dur: seconds });
  };
  A.deny = function () {
    if (!this.ready) return; const t = this.now();
    this.tone({ t: t, type: 'square', freq: 170, gain: 0.07, a: 0.005, d: 0.12, s: 0.5, r: 0.05, dur: 0.16, filter: { type: 'lowpass', freq: 900 } });
  };
  A.leverPull = function () {
    if (!this.ready) return; const t = this.now();
    for (let k = 0; k < 4; k++) this.noise({ t: t + k * 0.045, type: 'highpass', freq: 2200, gain: 0.25, dur: 0.008, d: 0.012, s: 0.1, r: 0.01 });
    this.tone({ t: t + 0.2, freq: 320, freqEnd: 140, sweep: 0.18, gain: 0.12, a: 0.005, d: 0.15, s: 0.2, r: 0.08, dur: 0.18 });
    this.thump(t + 0.22, { freq: 140, gain: 0.35, dur: 0.07 });
  };

  /* ---- bonus wheel ---- */
  A.wheelStart = function () {
    if (!this.ready) return; const t = this.now();
    this.noise({ t: t, type: 'bandpass', freq: 400, freqEnd: 1800, sweep: 0.5, Q: 1, gain: 0.18, a: 0.05, d: 0.4, s: 0.4, r: 0.3, dur: 0.5 });
    this.thump(t, { freq: 120, gain: 0.3, dur: 0.08 });
  };
  A.wheelTick = function (speed) {
    if (!this.ready) return; const t = this.now();
    const g = 0.12 + Math.min(0.2, speed * 0.015);
    this.noise({ t: t, type: 'highpass', freq: 2600, gain: g, dur: 0.006, d: 0.01, s: 0.1, r: 0.01 });
    this.tone({ t: t, freq: 980 + Math.random() * 120, freqEnd: 600, sweep: 0.03, gain: g * 0.8, a: 0.001, d: 0.03, s: 0.01, r: 0.02, dur: 0.03 });
  };
  A.wheelStop = function (value) {
    if (!this.ready) return; const t = this.now();
    this.thump(t, { freq: 110, gain: 0.4, dur: 0.1 });
    this.noise({ t: t, type: 'lowpass', freq: 700, gain: 0.3, dur: 0.03, d: 0.04, s: 0.2, r: 0.04 });
    const level = value >= 300 ? 2 : value >= 100 ? 1 : 0;
    [72, 76, 79, 84].slice(0, 3 + level).forEach((n, i) => this.bell(midi(n), t + 0.15 + i * 0.1, { gain: 0.13, dur: 1.4 }));
    if (level === 2) [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79]].forEach((ch, k) => ch.forEach(n => this.brass(midi(n), t + 0.5 + k * 0.4, k === 3 ? 1.5 : 0.35, 0.1)));
    if (value >= 1000) this.jackpotBells(5);
  };

  /* ---- attract ---- */
  A.attractJingle = function () {
    if (!this.ready) return; const t = this.now();
    [72, 76, 79, 84, 79, 76, 72].forEach((n, i) => this.bell(midi(n), t + i * 0.13, { gain: 0.06, dur: 0.7 }));
  };
})(window);
