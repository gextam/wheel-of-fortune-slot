#!/usr/bin/env node
/* ============================================================================
   tools/screenshots.mjs — documentation screenshots + headless smoke test.
   Headless Chrome/Edge over the DevTools protocol, no dependencies (Node 22+).
   Serves the project from a throwaway static server, loads the game muted,
   drives it deterministically (WOF.step / WOF.DEBUG_FORCE / WOF.DEBUG_WHEEL),
   writes JPEGs to docs/screenshots/ and reports any page errors.

   usage: node tools/screenshots.mjs [--chrome=<path>] [--width=1600] [--height=900]
   ========================================================================== */
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs, existsSync, createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const W = parseInt(args.width || '1600', 10), H = parseInt(args.height || '900', 10), QUALITY = 86;
const wait = ms => new Promise(r => setTimeout(r, ms));

function which(cmd) { try { execSync((process.platform === 'win32' ? 'where ' : 'which ') + cmd, { stdio: 'ignore' }); return true; } catch { return false; } }
function findChrome() {
  if (args.chrome) return args.chrome;
  const env = process.env, pf = env.PROGRAMFILES || 'C:\\Program Files', pf86 = env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = process.platform === 'win32' ? [
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ] : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  for (const c of candidates) if (c.includes(path.sep) ? existsSync(c) : which(c)) return c;
  throw new Error('No Chrome/Edge found. Pass --chrome=<path to chrome.exe>');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json', '.svg': 'image/svg+xml' };
function serve(root) {
  return new Promise(resolve => {
    const srv = createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(root, p));
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
      else if (msg.method) this.listeners.forEach(l => l(msg));
    });
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  on(fn) { this.listeners.push(fn); }
  once(method, timeout = 15000) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.listeners = this.listeners.filter(x => x !== l); resolve(null); }, timeout);
      const l = msg => { if (msg.method === method) { clearTimeout(timer); this.listeners = this.listeners.filter(x => x !== l); resolve(msg.params); } };
      this.listeners.push(l);
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
}
const wsOpen = url => new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.addEventListener('open', () => resolve(ws)); ws.addEventListener('error', () => reject(new Error('websocket error ' + url))); });
async function fetchJson(url, tries = 60) { for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* retry */ } await wait(250); } throw new Error('browser did not answer at ' + url); }

const HELPERS = `
  window.__L = WOF.CONFIG.layout; window.__ix = (r, s) => __L[r].indexOf(s);
  window.__settle = () => { const g = WOF.game; g.rollup = null; g.overlay = null; g.winCells = null; g.wheel.reset(); g.state = 'idle'; g.paidDisplay = g.paid; g.setMessage(g.defaultMessage()); };
  window.__spin = (stops, coins, seconds) => { const g = WOF.game; g.coins = coins; WOF.DEBUG_FORCE = () => stops; g.pressSpin(); WOF.step(seconds); };
  true`;
const SCENES = [
  { name: 'splash', run: 'true' },
  { name: 'base', run: `WOF.ui.start(); WOF.step(0.5); __spin([__ix(0,'WOF'), __ix(1,'SEVEN'), __ix(2,'BAR3')], 1, 3.6); __settle(); true` },
  { name: 'spin', run: `__spin(null, 1, 0.8); true` },
  { name: 'win', run: `WOF.step(3.5); __settle(); __spin([__ix(0,'SEVEN'), __ix(1,'SEVEN'), __ix(2,'SEVEN')], 3, 4.0); true` },
  { name: 'bonus', run: `WOF.step(8); __settle(); WOF.DEBUG_WHEEL = 0; __spin([__ix(0,'SEVEN'), __ix(1,'BLANK'), __ix(2,'SPIN')], 3, 3.4); true` },
  { name: 'wheel', run: `WOF.game.pressSpin(); WOF.step(2.6); true` },
  { name: 'wheelwin', run: `WOF.step(6.0); true` },
  { name: 'jackpot', run: `WOF.step(9); __settle(); __spin([__ix(0,'WOF'), __ix(1,'WOF'), __ix(2,'WOF')], 3, 4.6); true` },
  { name: 'help', run: `WOF.step(12); __settle(); WOF.ui.toggleHelp(true); true` }
];

async function main() {
  const chrome = findChrome();
  await fs.mkdir(OUT, { recursive: true });
  const srv = await serve(ROOT);
  const url = `http://127.0.0.1:${srv.address().port}/index.html?mute=1`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'wof-shots-'));
  const debugPort = 9222 + Math.floor(Math.random() * 400);
  console.log('browser :', chrome); console.log('page    :', url);
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', 'about:blank'], { stdio: 'ignore' });
  let page = null; const errors = [];
  try {
    await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    page = new CDP(await wsOpen(targets.find(t => t.type === 'page').webSocketDebuggerUrl));
    page.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
      if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) errors.push(msg.params.type + ': ' + msg.params.args.map(a => a.value || a.description).join(' '));
    });
    await page.send('Page.enable'); await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const loaded = page.once('Page.loadEventFired');
    await page.send('Page.navigate', { url }); await loaded;
    const ready = await page.eval(`new Promise(r => { const t = setInterval(() => { if (window.WOF && WOF.ui && WOF.ui.assetsReady) { clearInterval(t); r(true); } }, 100); setTimeout(() => { clearInterval(t); r(false); }, 30000); })`);
    if (!ready) throw new Error('game did not finish loading');
    await page.eval(`document.fonts ? document.fonts.ready.then(() => true) : true`);
    await page.eval(HELPERS); await wait(300);
    for (const scene of SCENES) {
      await page.eval(scene.run);
      await page.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: QUALITY });
      await fs.writeFile(path.join(OUT, scene.name + '.jpg'), Buffer.from(data, 'base64'));
      const st = await page.eval('JSON.stringify({state: WOF.game.state, credits: WOF.game.credits, paid: WOF.game.paid, msg: WOF.game.message})');
      console.log('  saved docs/screenshots/' + scene.name + '.jpg  ' + st);
    }
    await fs.copyFile(path.join(OUT, 'base.jpg'), path.join(OUT, 'hero.jpg'));
    const stats = await page.eval('JSON.stringify(WOF.game.stats)');
    console.log('stats:', stats);
  } finally {
    try { page && page.ws.close(); } catch { /* ignore */ }
    proc.kill(); srv.close(); await wait(300);
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
  if (errors.length) { console.log('\nPAGE ERRORS:'); errors.forEach(e => console.log(' -', e)); process.exitCode = 2; }
  else console.log('no page errors');
}
main().catch(err => { console.error(err.message || err); process.exit(1); });
