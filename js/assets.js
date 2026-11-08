/* ============================================================================
   WHEEL OF FORTUNE — asset loading, symbol variants (sharp + motion blurred),
   procedural textures. Also exposed as ZEUS.assets for the shared fx module.
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF || (root.WOF = {});
  const ZEUS = root.ZEUS || (root.ZEUS = {});
  const A = WOF.assets = ZEUS.assets = { images: {}, missing: {}, symbols: {}, ready: false, progress: 0 };
  const FILES = { logo: 'assets/logo.png', bg: 'assets/bg/casino.jpg' };
  WOF.CONFIG.symbols.forEach(s => { if (s.file) FILES['sym_' + s.id] = 'assets/symbols/' + s.file + '.png'; });

  function loadImage(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { A.images[key] = img; resolve(img); };
      img.onerror = () => { A.missing[key] = true; resolve(null); };
      img.src = src;
    });
  }
  A.load = function (onProgress) {
    const keys = Object.keys(FILES); let done = 0;
    return Promise.all(keys.map(k => loadImage(k, FILES[k]).then(() => { done++; A.progress = done / keys.length; if (onProgress) onProgress(A.progress); })))
      .then(() => { A.ready = true; return A; });
  };
  A.image = key => A.images[key] || null;
  A.symbolImage = id => A.images['sym_' + id] || null;

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  A.roundRect = roundRect;

  /* Bounding box of the painted pixels of an image (alpha above `min`), in image coordinates.
     Lets a wide BAR or the logo fill the width of a wide cell and a 7 fill its height, like the
     printed strip of a real stepper. Falls back to the whole image when the canvas is tainted
     (a page opened straight from disk) or nothing is painted. */
  A.paintedBounds = function (img, min) {
    const full = { x: 0, y: 0, w: img.width, h: img.height };
    try {
      const n = 160, c = document.createElement('canvas'); c.width = c.height = n;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, n, n);
      const d = cx.getImageData(0, 0, n, n).data;
      let x0 = n, y0 = n, x1 = -1, y1 = -1;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > (min || 48)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return full;
      const sx = img.width / n, sy = img.height / n;
      const bx = Math.max(0, (x0 - 1) * sx), by = Math.max(0, (y0 - 1) * sy);
      return { x: bx, y: by, w: Math.min(img.width, (x1 + 2) * sx) - bx, h: Math.min(img.height, (y1 + 2) * sy) - by };
    } catch (e) { return full; }
  };

  /* symbol variants at 2x cell size: [sharp, blur1, blur2, blur3] */
  A.prepareSymbols = function (w, h) {
    A.symW = w; A.symH = h;
    WOF.CONFIG.symbols.forEach(s => {
      if (s.id === 'BLANK') return;
      const base = document.createElement('canvas'); base.width = w; base.height = h;
      const ctx = base.getContext('2d');
      const img = A.symbolImage(s.id) || (s.id === 'WOF' ? A.image('logo') : null);
      if (img) {
        /* the painted part of the artwork fills 96% of the cell in its limiting direction */
        const b = A.paintedBounds(img), m = 0.02, aw = w * (1 - 2 * m), ah = h * (1 - 2 * m);
        const sc = Math.min(aw / b.w, ah / b.h), dw = b.w * sc, dh = b.h * sc;
        ctx.drawImage(img, b.x, b.y, b.w, b.h, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else drawFallback(ctx, s, w, h);
      const variants = [base];
      [0.12, 0.3, 0.55].forEach(frac => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const cx = c.getContext('2d'), n = 12, span = h * frac;
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 1 / n;
        for (let i = 0; i < n; i++) cx.drawImage(base, 0, -span / 2 + span * i / (n - 1));
        variants.push(c);
      });
      A.symbols[s.id] = variants;
    });
  };
  A.symbol = function (id, level) { const v = A.symbols[id]; return v ? v[Math.max(0, Math.min(3, level | 0))] : null; };
  function drawFallback(ctx, s, w, h) {
    ctx.save(); ctx.fillStyle = s.id === 'SEVEN' ? '#d62828' : s.id === 'WOF' ? '#2f6fe8' : s.id === 'SPIN' ? '#36b36b' : '#111';
    ctx.font = 'bold ' + Math.floor(h * 0.55) + 'px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = s.id === 'SEVEN' ? '7' : s.id === 'BAR3' ? 'BAR BAR BAR' : s.id === 'BAR2' ? 'BAR BAR' : s.id === 'BAR1' ? 'BAR' : s.id === 'SPIN' ? 'SPIN' : 'WHEEL OF FORTUNE';
    ctx.fillText(label, w / 2, h / 2, w * 0.9); ctx.restore();
  }

  A.noise = function () {
    if (A._noise) return A._noise;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'), id = ctx.createImageData(256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 70; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(id, 0, 0); A._noise = c; return c;
  };
  A.coin = function () {
    if (A._coin) return A._coin;
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s * 0.38, s * 0.35, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff6c2'); g.addColorStop(0.35, '#f5d060'); g.addColorStop(0.8, '#b8860b'); g.addColorStop(1, '#6b4e07');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,0,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(s * 0.4, s * 0.32, s * 0.16, s * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
    A._coin = c; return c;
  };
})(window);
