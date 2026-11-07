/* Scan virtual-stop weight tables; prints 1-coin and 3-coin RTP, hit rate and wheel frequency. */
'use strict';
const WOF = require('../js/config.js');
const { analyze } = require('./rtp-lib.js');
const base = WOF.CONFIG.weights;
const TARGET = parseFloat(process.argv[2] || '0.935');
const rows = [];
for (const SEVEN of [4, 5]) for (const BAR3 of [3, 4]) for (const BAR2 of [4, 5]) for (const BAR1 of [5, 6, 7]) for (const SPIN of [1]) for (const BLANK of [6, 7, 8]) {
  const w = Object.assign({}, base, { SEVEN, BAR3, BAR2, BAR1, SPIN, BLANK, BLANK_NEAR_WOF: BLANK * 2 });
  const r = analyze(WOF.buildStrips(w));
  if (r.hitProb < parseFloat(process.argv[3] || "0.04")) continue;
  rows.push({ w, r });
}
rows.sort((a, b) => Math.abs(a.r.rtp[2].total - TARGET) - Math.abs(b.r.rtp[2].total - TARGET));
rows.slice(0, 20).forEach(({ w, r }) => console.log(
  JSON.stringify({ SEVEN: w.SEVEN, BAR3: w.BAR3, BAR2: w.BAR2, BAR1: w.BAR1, SPIN: w.SPIN, BLANK: w.BLANK }),
  '1c', (r.rtp[0].total * 100).toFixed(1), '3c', (r.rtp[2].total * 100).toFixed(2), 'wheel%', (r.rtp[2].bonus * 100).toFixed(1),
  'hit', (r.hitProb * 100).toFixed(1) + '%', 'spin 1/' + (1 / r.pSpin).toFixed(0), 'stops', r.totals.join('/')));
