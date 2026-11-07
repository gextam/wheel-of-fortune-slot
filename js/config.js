/* ============================================================================
   WHEEL OF FORTUNE (classic 3-reel stepper) — configuration.
   Shared by the browser (window.WOF) and the node tools (module.exports).

   Three physical reels of 22 stops with blanks between symbols. Each stop has
   a weight (virtual stops) exactly like a real stepper's par sheet, so the
   reels tease near-misses: blanks beside the top symbol are heavy. One payline
   (center row), 1–3 coins. SPIN appears on reel 3 only; on the payline with
   3 coins played it spins the 22-wedge bonus wheel (25–1000 credits, weighted).
   ========================================================================== */
(function (root) {
  'use strict';
  const WOF = root.WOF || (root.WOF = {});

  const SYMBOLS = [
    { id: 'WOF',   name: 'Wheel of Fortune', file: 'wof',   wild: true },
    { id: 'SEVEN', name: 'Red Seven',        file: 'seven' },
    { id: 'BAR3',  name: 'Triple Bar',       file: 'bar3',  bar: true },
    { id: 'BAR2',  name: 'Double Bar',       file: 'bar2',  bar: true },
    { id: 'BAR1',  name: 'Single Bar',       file: 'bar1',  bar: true },
    { id: 'SPIN',  name: 'Spin',             file: 'spin',  bonus: true },
    { id: 'BLANK', name: 'Blank',            file: null }
  ];
  const BY_ID = {}; SYMBOLS.forEach(s => { BY_ID[s.id] = s; });

  /* pays per coin for 1 / 2 / 3 coins; 'JACKPOT' = the progressive meter */
  const PAYS = [
    { id: 'WOF3',   label: '3 Wheel of Fortune', pays: [1000, 2000, 'JACKPOT'] },
    { id: 'SEVEN3', label: '3 Red Sevens',       pays: [200, 400, 600] },
    { id: 'BAR33',  label: '3 Triple Bars',      pays: [100, 200, 300] },
    { id: 'BAR23',  label: '3 Double Bars',      pays: [50, 100, 150] },
    { id: 'BAR13',  label: '3 Single Bars',      pays: [25, 50, 75] },
    { id: 'ANYBAR', label: 'Any 3 Bars',         pays: [10, 20, 30] }
  ];
  const PAY_BY_ID = {}; PAYS.forEach(p => { PAY_BY_ID[p.id] = p; });

  /* physical symbol order on each reel (22 stops) */
  const LAYOUT = [
    ['WOF', 'BLANK', 'SEVEN', 'BLANK', 'BAR3', 'BLANK', 'BAR1', 'BLANK', 'BAR2', 'BLANK', 'SEVEN', 'BLANK', 'BAR1', 'BLANK', 'BAR3', 'BLANK', 'BAR2', 'BLANK', 'BAR1', 'BLANK', 'BAR2', 'BLANK'],
    ['WOF', 'BLANK', 'SEVEN', 'BLANK', 'BAR3', 'BLANK', 'BAR1', 'BLANK', 'BAR2', 'BLANK', 'SEVEN', 'BLANK', 'BAR1', 'BLANK', 'BAR3', 'BLANK', 'BAR2', 'BLANK', 'BAR1', 'BLANK', 'BAR2', 'BLANK'],
    ['WOF', 'BLANK', 'SEVEN', 'BLANK', 'BAR3', 'BLANK', 'BAR1', 'BLANK', 'BAR2', 'BLANK', 'SPIN', 'BLANK', 'BAR1', 'BLANK', 'BAR3', 'BLANK', 'BAR2', 'BLANK', 'SEVEN', 'BLANK', 'BAR2', 'BLANK']
  ];
  /* virtual-stop weights per symbol; BLANK_NEAR_WOF applies to the two blanks
     beside the WOF logo (the near-miss tease). Tuned with tools/tune.js. */
  const WEIGHTS = { WOF: 2, SEVEN: 4, BAR3: 3, BAR2: 5, BAR1: 7, SPIN: 1, BLANK: 5, BLANK_NEAR_WOF: 12 };

  function buildStrips(weights) {
    weights = weights || WEIGHTS;
    return LAYOUT.map(layout => layout.map((sym, i) => {
      const n = layout.length;
      let w = weights[sym];
      if (sym === 'BLANK' && (layout[(i + 1) % n] === 'WOF' || layout[(i - 1 + n) % n] === 'WOF')) w = weights.BLANK_NEAR_WOF;
      return [sym, w];
    }));
  }

  /* bonus wheel: 22 wedges clockwise from the pointer; weights tuned so the
     average award is ~54 credits and 1000 hits about 1 in 250 spins */
  const WHEEL = [
    { value: 1000, weight: 1, color: '#ffd23a' }, { value: 25, weight: 70, color: '#e8312f' }, { value: 200, weight: 1, color: '#2f6fe8' },
    { value: 35, weight: 45, color: '#36b36b' }, { value: 300, weight: 1, color: '#f28c1f' }, { value: 40, weight: 30, color: '#8b3fd9' },
    { value: 500, weight: 1, color: '#f9e34a' }, { value: 45, weight: 24, color: '#e8312f' }, { value: 100, weight: 3, color: '#2f6fe8' },
    { value: 50, weight: 18, color: '#36b36b' }, { value: 250, weight: 1, color: '#f28c1f' }, { value: 55, weight: 12, color: '#8b3fd9' },
    { value: 150, weight: 2, color: '#ff5fa2' }, { value: 60, weight: 10, color: '#e8312f' }, { value: 400, weight: 1, color: '#2f6fe8' },
    { value: 65, weight: 8, color: '#36b36b' }, { value: 125, weight: 2, color: '#f28c1f' }, { value: 70, weight: 6, color: '#8b3fd9' },
    { value: 90, weight: 3, color: '#ff5fa2' }, { value: 75, weight: 5, color: '#e8312f' }, { value: 80, weight: 4, color: '#2f6fe8' },
    { value: 85, weight: 4, color: '#36b36b' }
  ];

  /* ---------- evaluation ---------- */
  function isBar(id) { return !!(BY_ID[id] && BY_ID[id].bar); }
  function evalLine(line) {
    const all = pred => line.every(pred);
    if (all(s => s === 'WOF')) return 'WOF3';
    if (all(s => s === 'SEVEN' || s === 'WOF')) return 'SEVEN3';
    if (all(s => s === 'BAR3' || s === 'WOF')) return 'BAR33';
    if (all(s => s === 'BAR2' || s === 'WOF')) return 'BAR23';
    if (all(s => s === 'BAR1' || s === 'WOF')) return 'BAR13';
    if (all(s => isBar(s) || s === 'WOF')) return 'ANYBAR';
    return null;
  }
  /* pays[] already holds the TOTAL award for 1 / 2 / 3 coins */
  function payFor(payId, coins, jackpot) {
    const p = PAY_BY_ID[payId].pays[coins - 1];
    return p === 'JACKPOT' ? Math.round(jackpot) : p;
  }
  function weightedPick(items, weightOf, rnd) {
    const total = items.reduce((a, x) => a + weightOf(x), 0);
    let r = rnd * total;
    for (let i = 0; i < items.length; i++) { r -= weightOf(items[i]); if (r < 0) return i; }
    return items.length - 1;
  }
  const wheelPick = rnd => weightedPick(WHEEL, w => w.weight, rnd);
  const stopPick = (strips, reel, rnd) => weightedPick(strips[reel], s => s[1], rnd);

  WOF.CONFIG = {
    title: 'WHEEL OF FORTUNE',
    reels: 3, rows: 3, maxCoins: 3,
    startCredits: 200,
    jackpotBase: 5000, jackpotRate: 0.03,
    symbols: SYMBOLS, symbolById: BY_ID, pays: PAYS, payById: PAY_BY_ID,
    layout: LAYOUT, weights: WEIGHTS, strips: buildStrips(WEIGHTS), wheel: WHEEL,
    rules: [
      'All pays are on the center payline only, left to right.',
      'WHEEL OF FORTUNE symbol is wild and substitutes for all symbols except SPIN.',
      'SPIN symbol on the payline of reel 3 with 3 coins played spins the bonus wheel for 25 to 1,000 credits.',
      'Three WHEEL OF FORTUNE symbols with 3 coins played win the progressive jackpot.',
      'Only the highest winning combination is paid. Malfunction voids all pays and plays.'
    ]
  };
  WOF.RTP = '92.5';
  WOF.buildStrips = buildStrips;
  WOF.evalLine = evalLine;
  WOF.payFor = payFor;
  WOF.wheelPick = wheelPick;
  WOF.stopPick = stopPick;
  WOF.isBar = isBar;

  if (typeof module !== 'undefined' && module.exports) module.exports = WOF;
})(typeof window !== 'undefined' ? window : globalThis);
