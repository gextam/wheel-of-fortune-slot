/* Scan "arcade" settings for the wheel bonus: a heavier SPIN stop and a flatter wheel,
   ranked by distance to a target 3-coin RTP.  usage: node tools/tune-arcade.js [targetRtp=0.96] */
'use strict';
const WOF = require('../js/config.js');
const { analyze } = require('./rtp-lib.js');
const C = WOF.CONFIG;
const TARGET = parseFloat(process.argv[2] || '0.96');
function wheelVariant(smallMult, topMult) {
  return C.wheel.map(w => Object.assign({}, w, { weight: w.value <= 60 ? Math.round(w.weight * smallMult) : w.value >= 1000 ? Math.max(1, Math.round(w.weight * topMult)) : w.weight }));
}
const rows = [];
for (const SPIN of [1, 2, 3]) for (const sm of [1, 1.5, 2, 2.5, 3, 4]) for (const tm of [1, 2]) {
  const strips = WOF.buildStrips(Object.assign({}, C.weights, { SPIN: SPIN }));
  const wheel = wheelVariant(sm, tm);
  const r = analyze(strips, wheel);
  rows.push({ name: 'SPIN weight ' + SPIN + '  small wedges x' + sm + '  1000 wedge x' + tm, r, wheel });
}
const near = rows.filter(x => 1 / x.r.pSpin >= 30 && 1 / x.r.pSpin <= 70);
near.sort((a, b) => Math.abs(a.r.rtp[2].total - TARGET) - Math.abs(b.r.rtp[2].total - TARGET));
near.slice(0, 24).forEach(({ name, r, wheel }) => {
  const tot = wheel.reduce((a, w) => a + w.weight, 0);
  console.log(name.padEnd(46), 'spin 1/' + (1 / r.pSpin).toFixed(0), 'wheel EV', r.wheelEV.toFixed(1), 'P(1000) 1/' + Math.round(tot / wheel[0].weight), 'base', (r.rtp[2].base * 100).toFixed(1), 'wheel', (r.rtp[2].bonus * 100).toFixed(1), 'RTP', (r.rtp[2].total * 100).toFixed(2));
});
console.log(near.length + ' candidates between 1/30 and 1/70 of ' + rows.length);
