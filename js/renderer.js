/* ============================================================================
   WHEEL OF FORTUNE — canvas renderer: casino background, upright cabinet with
   chase lights, top-glass paytable and bonus rules, the big bonus wheel with
   flapper and lights, progressive meter, three stepper reels behind glass,
   the pull handle, messages and celebration overlays.
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF, ZEUS = root.ZEUS, A = WOF.assets, FX = ZEUS.fx, C = WOF.CONFIG;
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  /* Big stepper reels (400 x 158 cells in a 1200 x 474 window, about three times the glass
     area of the first layout) under a compact top box that holds the wheel and both panels. */
  const CAB = { x: 300, w: 1320 };
  const WHEEL = { cx: 960, cy: 206, r: 150 };
  const REEL = { x: 360, y: 504, cellW: 400, cellH: 158, cols: 3, rows: 3 };
  REEL.w = REEL.cellW * REEL.cols; REEL.h = REEL.cellH * REEL.rows; REEL.cy = REEL.y + REEL.h / 2;
  const PAD = 18, R_CELLS = 3.2;
  const FONT = '"Arial Black", Impact, "Segoe UI", Arial, sans-serif';
  const LED = 'Consolas, "Lucida Console", "Courier New", monospace';
  const rr = A.roundRect;
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  WOF.fmt = fmt; WOF.LAYOUT = { W: W, H: H, REEL: REEL, WHEEL: WHEEL, CAB: CAB };
  function proj(u) { const a = Math.max(-1.45, Math.min(1.45, u / R_CELLS)); return R_CELLS * Math.sin(a) * REEL.cellH; }
  function cover(ctx, img) { const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  function shade(hex, k) { /* lighten (k>0) or darken (k<0) a #rrggbb */
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = c => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  function Renderer(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.game = game;
    this.scale = 1; this.dpr = 1; this.time = 0;
    this.resize(); root.addEventListener('resize', () => this.resize());
  }
  const P = Renderer.prototype;
  P.resize = function () {
    const vw = root.innerWidth, vh = root.innerHeight, s = Math.min(vw / W, vh / H);
    this.scale = s; this.dpr = Math.min(2, root.devicePixelRatio || 1);
    const stage = document.getElementById('stage');
    if (stage) stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    this.canvas.width = Math.round(W * s * this.dpr); this.canvas.height = Math.round(H * s * this.dpr);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
  };
  P.update = function () { /* nothing time-integrated here yet */ };
  P.cellRect = function (reel, row) {
    const x = REEL.x + reel * REEL.cellW, y0 = REEL.cy + proj(row - 1.5), y1 = REEL.cy + proj(row - 0.5);
    return { x: x, y: y0, w: REEL.cellW, h: y1 - y0, cx: x + REEL.cellW / 2, cy: (y0 + y1) / 2 };
  };

  P.draw = function (now) {
    const ctx = this.ctx, S = this.scale * this.dpr; this.time = now;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.save();
    if (FX.shake > 0.3) ctx.translate((Math.random() - 0.5) * FX.shake, (Math.random() - 0.5) * FX.shake);
    this.drawBackground(ctx);
    this.drawCabinet(ctx, now);
    this.drawTopGlass(ctx);
    this.drawWheel(ctx, now);
    this.drawJackpotBand(ctx, now);
    this.drawReelWindow(ctx, now);
    this.drawLever(ctx);
    this.drawMessage(ctx, now);
    FX.drawBolts(ctx); FX.drawParticles(ctx);
    this.drawOverlay(ctx, now);
    FX.drawFlash(ctx, W, H);
    ctx.restore();
  };

  /* ------------------------------------------------------- background */
  P.drawBackground = function (ctx) {
    const img = A.image('bg');
    ctx.fillStyle = '#07060a'; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (img) cover(ctx, img);
    else { const g = ctx.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 1200); g.addColorStop(0, '#3a1f2a'); g.addColorStop(1, '#070508'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0.15)'); v.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  };

  /* ---------------------------------------------------------- cabinet */
  P.drawCabinet = function (ctx, now) {
    const x = CAB.x, w = CAB.w;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 60; ctx.fillStyle = '#0b0a0f'; rr(ctx, x, -30, w, H + 60, 36); ctx.fill(); ctx.restore();
    let g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#201e28'); g.addColorStop(0.08, '#14131a'); g.addColorStop(0.5, '#1a1922'); g.addColorStop(0.92, '#14131a'); g.addColorStop(1, '#201e28');
    ctx.fillStyle = g; rr(ctx, x, -30, w, H + 60, 36); ctx.fill();
    /* top box backdrop behind the wheel */
    g = ctx.createRadialGradient(WHEEL.cx, WHEEL.cy, 60, WHEEL.cx, WHEEL.cy, 620);
    g.addColorStop(0, '#2b2746'); g.addColorStop(0.55, '#14121f'); g.addColorStop(1, '#0c0b12');
    ctx.fillStyle = g; rr(ctx, x + 14, 6, w - 28, 402, 24); ctx.fill();
    /* chrome trims */
    const trim = (yy, hh) => { const t = ctx.createLinearGradient(0, yy, 0, yy + hh); t.addColorStop(0, '#f4f4f8'); t.addColorStop(0.5, '#8d8f99'); t.addColorStop(1, '#2d2e36'); ctx.fillStyle = t; ctx.fillRect(x + 14, yy, w - 28, hh); };
    trim(410, 5); trim(474, 4);
    /* chase lights around the top box */
    this.drawChaseLights(ctx, x + 22, 14, w - 44, 384, now);
    /* side light strips of the reel section */
    [x + 24, x + w - 36].forEach(sx => {
      const sg = ctx.createLinearGradient(sx, 0, sx + 12, 0); sg.addColorStop(0, '#5a4a1a'); sg.addColorStop(0.5, '#ffe9a8'); sg.addColorStop(1, '#5a4a1a');
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 2 + sx); ctx.fillStyle = sg; ctx.fillRect(sx, 520, 12, 440); ctx.globalAlpha = 1;
    });
  };
  P.drawChaseLights = function (ctx, x, y, w, h, now) {
    const g = this.game, mode = g.state === 'bonusReady' || g.state === 'wheel' || g.state === 'wheelPaying' || (g.overlay && g.overlay.kind === 'jackpot') ? 'fast' : (g.wheel.lightMode === 'chase' ? 'medium' : 'slow');
    const speed = mode === 'fast' ? 14 : mode === 'medium' ? 7 : 1.6;
    const per = 26, pts = [];
    for (let xx = x; xx <= x + w; xx += per) { pts.push([xx, y]); }
    for (let yy = y + per; yy <= y + h; yy += per) pts.push([x + w, yy]);
    for (let xx = x + w - per; xx >= x; xx -= per) pts.push([xx, y + h]);
    for (let yy = y + h - per; yy > y; yy -= per) pts.push([x, yy]);
    const colors = ['#ff3b3b', '#ffd23a', '#fff6d6'];
    ctx.save();
    pts.forEach((p, i) => {
      const phase = (i / pts.length) * TAU * 3 - now * speed;
      const lit = mode === 'slow' ? 0.35 + 0.65 * Math.max(0, Math.sin(phase)) : (Math.sin(phase) > 0.2 ? 1 : 0.12);
      const col = colors[i % 3];
      ctx.shadowColor = col; ctx.shadowBlur = 14 * lit; ctx.globalAlpha = 0.25 + 0.75 * lit;
      const rg = ctx.createRadialGradient(p[0] - 2, p[1] - 2, 1, p[0], p[1], 7); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, col); rg.addColorStop(1, shade(col, -0.6));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p[0], p[1], 6.5, 0, TAU); ctx.fill();
    });
    ctx.restore();
  };

  /* -------------------------------------------------------- top glass */
  P.panel = function (ctx, x, y, w, h) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.fillStyle = '#0a0a12'; rr(ctx, x, y, w, h, 14); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(60,40,90,0.75)'); g.addColorStop(1, 'rgba(10,8,22,0.9)');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 14); ctx.fill();
    ctx.lineWidth = 3; const b = ctx.createLinearGradient(0, y, 0, y + h); b.addColorStop(0, '#fff1b0'); b.addColorStop(0.5, '#b8860b'); b.addColorStop(1, '#5a3d08'); ctx.strokeStyle = b; rr(ctx, x, y, w, h, 14); ctx.stroke();
    const gl = ctx.createLinearGradient(x, y, x + w * 0.6, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.08)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; rr(ctx, x, y, w, h, 14); ctx.fill();
  };
  P.drawTopGlass = function (ctx) {
    const g = this.game;
    /* left: paytable */
    let x = CAB.x + 30, y = 26, w = 380, h = 374;
    this.panel(ctx, x, y, w, h);
    ctx.save(); ctx.textBaseline = 'middle';
    ctx.font = '900 22px ' + FONT; ctx.fillStyle = '#ffd23a'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(255,200,60,0.6)'; ctx.shadowBlur = 10; ctx.fillText('PAYS', x + w / 2, y + 26); ctx.shadowBlur = 0;
    const colX = i => x + 110 + i * 110;
    [1, 2, 3].forEach((cn, i) => { ctx.fillStyle = cn === g.coins ? '#ffffff' : '#8f8468'; ctx.textAlign = 'center'; ctx.font = '700 12px ' + FONT; ctx.fillText(cn + (cn > 1 ? ' COINS' : ' COIN'), colX(i), y + 52); });
    C.pays.forEach((p, row) => {
      const yy = y + 84 + row * 46;
      ctx.textAlign = 'left'; ctx.font = '700 14px ' + FONT; ctx.fillStyle = '#e9dcc0'; ctx.fillText(p.label.toUpperCase(), x + 14, yy - 12, 350);
      [0, 1, 2].forEach(i => {
        const v = p.pays[i]; const col = (i + 1) === g.coins, jp = v === 'JACKPOT';
        ctx.textAlign = 'center'; ctx.font = (col ? (jp ? '900 13px ' : '900 20px ') : (jp ? '700 12px ' : '700 17px ')) + FONT;
        ctx.fillStyle = jp ? (col ? '#ff4d4d' : '#8a3030') : (col ? '#ffffff' : '#8f8468');
        ctx.fillText(jp ? 'JACKPOT' : String(v), colX(i), yy + 12);
      });
    });
    ctx.textAlign = 'center'; ctx.font = '700 12px ' + FONT; ctx.fillStyle = '#c9b98d';
    ctx.fillText('WHEEL OF FORTUNE SYMBOL IS WILD', x + w / 2, y + h - 18);
    ctx.restore();
    /* right: wheel bonus */
    x = CAB.x + CAB.w - 30 - 380;
    this.panel(ctx, x, y, w, h);
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = '900 22px ' + FONT; ctx.fillStyle = '#ffd23a'; ctx.shadowColor = 'rgba(255,200,60,0.6)'; ctx.shadowBlur = 10; ctx.fillText('WHEEL BONUS', x + w / 2, y + 26); ctx.shadowBlur = 0;
    ctx.font = '700 14px ' + FONT; ctx.fillStyle = '#e9dcc0';
    ['SPIN SYMBOL ON 3RD REEL', 'WITH 3 COINS PLAYED', 'SPINS THE WHEEL'].forEach((t, i) => ctx.fillText(t, x + w / 2, y + 54 + i * 20));
    ctx.font = '900 17px ' + FONT; ctx.fillStyle = '#ffffff'; ctx.fillText('WIN 25 TO 1,000 CREDITS', x + w / 2, y + 124);
    const vals = C.wheel.slice().sort((a, b) => b.value - a.value);
    vals.forEach((wd, i) => {
      const cx = x + 50 + (i % 5) * 70, cy = y + 164 + Math.floor(i / 5) * 36;
      ctx.fillStyle = wd.color; rr(ctx, cx - 30, cy - 15, 60, 30, 6); ctx.fill();
      ctx.fillStyle = wd.value >= 100 ? '#1a1200' : '#ffffff'; ctx.font = '900 ' + (wd.value >= 1000 ? 14 : 15) + 'px ' + FONT; ctx.fillText(String(wd.value), cx, cy + 1);
    });
    ctx.font = '700 11px ' + FONT; ctx.fillStyle = '#c9b98d'; ctx.fillText('PLAY MAX COINS FOR THE WHEEL', x + w / 2, y + h - 18);
    ctx.restore();
  };

  /* ------------------------------------------------------------ wheel */
  P.drawWheel = function (ctx, now) {
    const wh = this.game.wheel, cx = WHEEL.cx, cy = WHEEL.cy, R = WHEEL.r, n = wh.n, step = wh.step;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, R + 40, 0, TAU); ctx.fill();
    ctx.restore();
    /* light ring */
    let g = ctx.createRadialGradient(cx, cy, R + 14, cx, cy, R + 44); g.addColorStop(0, '#2a2416'); g.addColorStop(0.5, '#3a3220'); g.addColorStop(1, '#0d0b08');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 42, 0, TAU); ctx.fill();
    const bulbs = 44;
    for (let i = 0; i < bulbs; i++) {
      const a = i / bulbs * TAU, bx = cx + Math.cos(a) * (R + 29), by = cy + Math.sin(a) * (R + 29);
      let lit;
      if (wh.lightMode === 'win') lit = Math.sin(wh.winFlash * 12) > 0 ? 1 : 0.15;
      else if (wh.lightMode === 'chase' || wh.state === 'spinning') lit = ((i + Math.floor(wh.lightPhase)) % 4 === 0) ? 1 : 0.15;
      else lit = 0.3 + 0.5 * Math.max(0, Math.sin(wh.lightPhase * 1.2 + i * 0.6));
      const col = i % 2 ? '#ffd23a' : '#fff4d0';
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12 * lit; ctx.globalAlpha = 0.3 + 0.7 * lit;
      const rg = ctx.createRadialGradient(bx - 1.5, by - 1.5, 1, bx, by, 6); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.5, col); rg.addColorStop(1, '#6b4e07');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, TAU); ctx.fill(); ctx.restore();
    }
    /* gold rim */
    g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    [[0, '#7a5a0d'], [0.25, '#ffe9a8'], [0.5, '#b8860b'], [0.75, '#fff3c4'], [1, '#6a4a08']].forEach(s => g.addColorStop(s[0], s[1]));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 13, 0, TAU); ctx.fill();
    /* wedges (with rotational motion blur while spinning fast) */
    const blurPasses = Math.abs(wh.omega) > 2.5 ? [[-0.012, 0.3], [0.012, 0.3], [0, 1]] : [[0, 1]];
    blurPasses.forEach(([dAng, alpha]) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(wh.theta + dAng * Math.abs(wh.omega)); ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * step - step / 2, a1 = a0 + step, wd = wh.wedges[i];
      const wg = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R);
      wg.addColorStop(0, shade(wd.color, 0.18)); wg.addColorStop(0.7, wd.color); wg.addColorStop(1, shade(wd.color, -0.25));
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
      /* value text, radial, reading outward */
      ctx.save(); ctx.rotate(a0 + step / 2);
      ctx.font = '900 ' + (wd.value >= 1000 ? 21 : 23) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(String(wd.value), R * 0.42, 0);
      ctx.fillStyle = wd.value >= 1000 ? '#3a2600' : '#ffffff'; ctx.fillText(String(wd.value), R * 0.42, 0);
      ctx.restore();
      if (wh.state === 'stopped' && wh.result === i && wh.lightMode === 'win') {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.22 * Math.max(0, Math.sin(wh.winFlash * 10))) + ')';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath(); ctx.fill();
      }
    }
    /* pegs */
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * step - step / 2, px = Math.cos(a) * (R + 5), py = Math.sin(a) * (R + 5);
      const pg = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 5.5); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#d9d9e0'); pg.addColorStop(1, '#4a4a55');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    });
    /* fixed centre cap with the title emblem */
    ctx.save(); ctx.translate(cx, cy);
    g = ctx.createRadialGradient(-10, -10, 4, 0, 0, R * 0.32); g.addColorStop(0, '#3a3650'); g.addColorStop(1, '#0b0a12');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.31, 0, TAU); ctx.fill();
    ctx.lineWidth = 6; const hg = ctx.createLinearGradient(-R * 0.3, -R * 0.3, R * 0.3, R * 0.3); hg.addColorStop(0, '#fff1b0'); hg.addColorStop(0.5, '#b8860b'); hg.addColorStop(1, '#fff1b0'); ctx.strokeStyle = hg; ctx.stroke();
    const logo = A.image('logo');
    if (logo) { const lw = R * 0.56, lh = lw * logo.height / logo.width; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh); }
    ctx.restore();
    /* glass highlight */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, TAU); ctx.clip();
    g = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.3, cy + R * 0.6); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0.03)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R - 12, cy - R - 12, 2 * R + 24, 2 * R + 24); ctx.restore();
    /* flapper */
    ctx.save(); ctx.translate(cx, cy - R - 48); ctx.rotate(wh.flapper);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    g = ctx.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#7a0c0c'); g.addColorStop(0.45, '#ff5a5a'); g.addColorStop(0.6, '#d81e1e'); g.addColorStop(1, '#6a0a0a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(15, -6); ctx.lineTo(3, 58); ctx.lineTo(-3, 58); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffd23a'; ctx.stroke();
    const pg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12); pg.addColorStop(0, '#fff6d0'); pg.addColorStop(0.6, '#c9a227'); pg.addColorStop(1, '#5a3d08'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.restore();
    /* bonus banners */
    const gm = this.game;
    if (gm.state === 'bonusReady') this.goldText(ctx, 'SPIN THE WHEEL!', cx, cy + R + 34, 26, { glow: 14 + 10 * Math.sin(now * 6) });
    if (gm.state === 'wheelPaying' || (gm.state === 'idle' && gm.wheel.lightMode === 'win' && gm.bonusValue)) this.goldText(ctx, '+ ' + fmt(gm.bonusValue), cx, cy + R + 34, 28, { glow: 20, fill: '#ffffff' });
  };

  /* ------------------------------------------------------- meters/reels */
  P.drawJackpotBand = function (ctx, now) {
    const x = REEL.x - PAD, w = REEL.w + 2 * PAD, y = 420, h = 30;
    ctx.save(); ctx.fillStyle = '#06060a'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#6a5a2a'; rr(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.font = '900 15px ' + FONT; ctx.fillStyle = '#ffd23a'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('PROGRESSIVE JACKPOT', x + 18, y + h / 2 + 1);
    ctx.font = '700 24px ' + LED; ctx.textAlign = 'right'; ctx.fillStyle = '#ff2a2a'; ctx.shadowColor = 'rgba(255,60,60,0.9)'; ctx.shadowBlur = 12 + 4 * Math.sin(now * 3);
    ctx.fillText(fmt(Math.floor(this.game.jackpot)), x + w - 18, y + h / 2 + 1); ctx.restore();
  };
  P.drawReelWindow = function (ctx, now) {
    const g0 = this.game, x = REEL.x - PAD, y = REEL.y - PAD, w = REEL.w + 2 * PAD, h = REEL.h + 2 * PAD;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30; ctx.fillStyle = '#111'; rr(ctx, x, y, w, h, 16); ctx.fill(); ctx.restore();
    let g = ctx.createLinearGradient(0, y, 0, y + h);
    [[0, '#f4f4f8'], [0.15, '#9a9ca8'], [0.5, '#5c5e6a'], [0.85, '#b9bbc6'], [1, '#2a2b33']].forEach(s => g.addColorStop(s[0], s[1]));
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 16); ctx.fill();
    ctx.fillStyle = '#08080c'; rr(ctx, x + 8, y + 8, w - 16, h - 16, 10); ctx.fill();
    const noise = A.noise();
    for (let i = 0; i < 3; i++) {
      const reel = g0.reels[i], rx = REEL.x + i * REEL.cellW;
      ctx.save(); ctx.beginPath(); ctx.rect(rx, REEL.y, REEL.cellW, REEL.h); ctx.clip();
      g = ctx.createLinearGradient(0, REEL.y, 0, REEL.y + REEL.h); g.addColorStop(0, '#b9b4a4'); g.addColorStop(0.5, '#fbf9f2'); g.addColorStop(1, '#b9b4a4');
      ctx.fillStyle = g; ctx.fillRect(rx, REEL.y, REEL.cellW, REEL.h);
      const grainA = 0.06 * (1 - Math.min(1, reel.speed / 10));
      if (grainA > 0.005) { ctx.globalAlpha = grainA; const off = ((reel.pos * REEL.cellH) % 256 + 256) % 256; for (let yy = REEL.y - 256 + off; yy < REEL.y + REEL.h; yy += 256) ctx.drawImage(noise, rx, yy, 256, 256); ctx.globalAlpha = 1; }
      const level = reel.speed < 6 ? 0 : reel.speed < 15 ? 1 : reel.speed < 25 ? 2 : 3;
      const kc = Math.round(reel.pos);
      for (let k = kc - 2; k <= kc + 2; k++) this.drawSymbol(ctx, reel, k, rx, level);
      g = ctx.createLinearGradient(0, REEL.y, 0, REEL.y + REEL.h);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.36, 'rgba(255,255,255,0.0)'); g.addColorStop(0.42, 'rgba(255,255,255,0.18)'); g.addColorStop(0.48, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g; ctx.fillRect(rx, REEL.y, REEL.cellW, REEL.h);
      if (g0.winCells && g0.winCells.indexOf(i) >= 0) {
        const r = this.cellRect(i, 1), a = 0.5 + 0.5 * Math.sin(now * 9);
        ctx.save(); ctx.shadowColor = 'rgba(255,215,80,1)'; ctx.shadowBlur = 24; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,225,120,' + (0.5 + 0.5 * a) + ')'; rr(ctx, r.x + 6, r.y + 4, r.w - 12, r.h - 8, 10); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    for (let i = 1; i < 3; i++) { const dx = REEL.x + i * REEL.cellW, dg = ctx.createLinearGradient(dx - 5, 0, dx + 5, 0); dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(0.3, '#15151c'); dg.addColorStop(0.5, '#8a8c98'); dg.addColorStop(0.7, '#15151c'); dg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = dg; ctx.fillRect(dx - 5, REEL.y, 10, REEL.h); }
    /* payline */
    ctx.save(); ctx.strokeStyle = 'rgba(230,30,30,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(REEL.x, REEL.cy); ctx.lineTo(REEL.x + REEL.w, REEL.cy); ctx.stroke();
    ctx.fillStyle = '#e52020'; ctx.shadowColor = 'rgba(255,60,60,0.8)'; ctx.shadowBlur = 10;
    [[x - 2, 1], [x + w + 2, -1]].forEach(([px, dir]) => { ctx.beginPath(); ctx.moveTo(px, REEL.cy - 12); ctx.lineTo(px + dir * 16, REEL.cy); ctx.lineTo(px, REEL.cy + 12); ctx.closePath(); ctx.fill(); });
    ctx.restore();
    /* glass */
    ctx.save(); ctx.beginPath(); ctx.rect(REEL.x, REEL.y, REEL.w, REEL.h); ctx.clip();
    g = ctx.createLinearGradient(REEL.x, REEL.y, REEL.x + REEL.w * 0.5, REEL.y + REEL.h); g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.4, 'rgba(255,255,255,0.02)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(REEL.x, REEL.y, REEL.w, REEL.h); ctx.restore();
  };
  P.drawSymbol = function (ctx, reel, k, rx, level) {
    const id = reel.symbolAt(k); if (id === 'BLANK') return;
    const img = A.symbol(id, level); if (!img) return;
    const u = reel.pos - k; if (Math.abs(u) > 2.1) return;
    const n = level > 0 ? 3 : 8, pad = 6, dw = REEL.cellW - 2 * pad, dx = rx + pad;
    for (let j = 0; j < n; j++) {
      const u0 = u - 0.5 + j / n, u1 = u0 + 1 / n, y0 = REEL.cy + proj(u0), y1 = REEL.cy + proj(u1);
      if (y1 <= REEL.y - 1 || y0 >= REEL.y + REEL.h + 1) continue;
      ctx.drawImage(img, 0, j * img.height / n, img.width, img.height / n, dx, y0, dw, (y1 - y0) + 0.7);
    }
  };

  /* ------------------------------------------------------------ lever */
  P.drawLever = function (ctx) {
    const lv = this.game.lever, px = CAB.x + CAB.w + 62, py = 740;
    ctx.save();
    let g = ctx.createLinearGradient(px - 40, 0, px + 40, 0); g.addColorStop(0, '#2a2b33'); g.addColorStop(0.5, '#9a9ca8'); g.addColorStop(1, '#2a2b33');
    ctx.fillStyle = g; rr(ctx, px - 42, py - 60, 84, 150, 14); ctx.fill();
    ctx.fillStyle = '#0d0d12'; rr(ctx, px - 30, py - 48, 60, 126, 10); ctx.fill();
    const ang = -Math.PI / 2 + lv.angle * 2.1, len = 190;
    const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
    ctx.lineCap = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#2b2c34'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = '#b4b6c2'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(px - 2, py - 2); ctx.lineTo(ex - 2, ey - 2); ctx.stroke();
    g = ctx.createRadialGradient(ex - 8, ey - 10, 3, ex, ey, 28); g.addColorStop(0, '#ff9a9a'); g.addColorStop(0.3, '#e02020'); g.addColorStop(1, '#5a0808');
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 27, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; const hub = ctx.createRadialGradient(px - 4, py - 4, 2, px, py, 18); hub.addColorStop(0, '#f0f0f4'); hub.addColorStop(1, '#3a3b44'); ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(px, py, 17, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* --------------------------------------------------- text & overlays */
  P.goldText = function (ctx, text, x, y, size, o) {
    o = o || {}; ctx.save();
    ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    g.addColorStop(0, '#fff6c8'); g.addColorStop(0.42, '#f8d865'); g.addColorStop(0.5, '#b8860b'); g.addColorStop(0.62, '#f5cf4a'); g.addColorStop(1, '#8a5a06');
    if (o.glow) { ctx.shadowColor = o.glowColor || 'rgba(255,200,90,0.9)'; ctx.shadowBlur = o.glow; }
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size * 0.1); ctx.strokeStyle = o.stroke || '#2a1a02'; ctx.strokeText(text, x, y);
    ctx.shadowBlur = 0; ctx.fillStyle = o.fill || g; ctx.fillText(text, x, y); ctx.restore();
  };
  P.drawMessage = function (ctx, now) {
    const g = this.game;
    ctx.save(); ctx.font = '900 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    ctx.fillStyle = g.state === 'bonusReady' ? (Math.sin(now * 8) > 0 ? '#ffd23a' : '#ffffff') : '#ffe9a8';
    ctx.fillText(g.message || '', CAB.x + CAB.w / 2, 471); ctx.restore();
  };
  P.drawOverlay = function (ctx, now) {
    const ov = this.game.overlay; if (!ov) return;
    const t = now - ov.t0, a = Math.min(1, t / 0.3) * (ov.ending ? Math.max(0, 1 - (now - ov.endAt) / 0.4) : 1);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    if (ov.kind === 'jackpot') {
      const g = ctx.createRadialGradient(W / 2, 400, 100, W / 2, 400, 1000); g.addColorStop(0, 'rgba(40,10,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sc = 1 + 0.05 * Math.sin(now * 5);
      ctx.save(); ctx.translate(W / 2, 330); ctx.scale(sc, sc); this.goldText(ctx, 'JACKPOT!', 0, 0, 170, { glow: 50 }); ctx.restore();
      this.goldText(ctx, fmt(this.game.paidDisplay), W / 2, 520, 130, { glow: 30, fill: '#ffffff', stroke: '#5a3a00' });
      ctx.font = '900 30px ' + FONT; ctx.fillStyle = 'rgba(255,240,200,' + (0.6 + 0.4 * Math.sin(now * 6)) + ')'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('THREE WHEEL OF FORTUNE SYMBOLS  ·  MAXIMUM COINS', W / 2, 640);
    }
    ctx.restore();
  };

  WOF.Renderer = Renderer;
})(window);
