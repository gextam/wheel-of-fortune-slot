/* Exact analysis of weighted 3-reel strips + the bonus wheel. */
'use strict';
const WOF = require('../js/config.js');
const C = WOF.CONFIG;

function analyze(strips, wheel, jackpot) {
  wheel = wheel || C.wheel; jackpot = jackpot || C.jackpotBase;
  const totals = strips.map(s => s.reduce((a, x) => a + x[1], 0));
  const wheelTotal = wheel.reduce((a, w) => a + w.weight, 0);
  const wheelEV = wheel.reduce((a, w) => a + w.value * w.weight, 0) / wheelTotal;
  const hits = {}; let pSpin = 0; const ev = [0, 0, 0]; let hitProb = 0;
  for (let a = 0; a < strips[0].length; a++) for (let b = 0; b < strips[1].length; b++) for (let c = 0; c < strips[2].length; c++) {
    const p = (strips[0][a][1] / totals[0]) * (strips[1][b][1] / totals[1]) * (strips[2][c][1] / totals[2]);
    const line = [strips[0][a][0], strips[1][b][0], strips[2][c][0]];
    if (line[2] === 'SPIN') pSpin += p;
    const id = WOF.evalLine(line);
    if (!id) continue;
    hits[id] = (hits[id] || 0) + p; hitProb += p;
    for (let coins = 1; coins <= 3; coins++) ev[coins - 1] += p * WOF.payFor(id, coins, jackpot);
  }
  const rtp = [1, 2, 3].map(coins => {
    const base = ev[coins - 1] / coins, bonus = coins === 3 ? pSpin * wheelEV / coins : 0;
    return { coins, base, bonus, total: base + bonus };
  });
  return { totals, wheelEV, wheelTotal, pSpin, hits, hitProb, rtp };
}
module.exports = { analyze };
