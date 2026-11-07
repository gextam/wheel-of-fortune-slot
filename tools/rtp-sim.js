/* Par-sheet style report for the current strips and wheel. usage: node tools/rtp-sim.js */
'use strict';
const WOF = require('../js/config.js');
const { analyze } = require('./rtp-lib.js');
const C = WOF.CONFIG;
const r = analyze(C.strips);
console.log('virtual stops per reel :', r.totals.join(' / '));
console.log('wheel: %d wedges, average award %s credits, P(1000) = 1 in %d', C.wheel.length, r.wheelEV.toFixed(1), Math.round(r.wheelTotal / C.wheel[0].weight));
console.log('P(SPIN on payline)     : %s  (1 in %s spins)', r.pSpin.toFixed(5), (1 / r.pSpin).toFixed(0));
console.log('hit frequency (any pay): %s%%  (1 in %s)', (r.hitProb * 100).toFixed(2), (1 / r.hitProb).toFixed(1));
Object.keys(r.hits).sort((x, y) => r.hits[y] - r.hits[x]).forEach(id => console.log('  %s  1 in %s', C.payById[id].label.padEnd(20), (1 / r.hits[id]).toFixed(0)));
r.rtp.forEach(x => console.log('%d coin%s: base %s%% + wheel %s%% = RTP %s%%', x.coins, x.coins > 1 ? 's' : ' ', (x.base * 100).toFixed(2), (x.bonus * 100).toFixed(2), (x.total * 100).toFixed(2)));
console.log('3 WOF jackpot          : 1 in %s spins (meter starts at %d, grows %s%% of each bet)', (1 / (r.hits.WOF3 || 1e-12)).toFixed(0), C.jackpotBase, (C.jackpotRate * 100).toFixed(0));
