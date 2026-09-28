// ARC_BOT ile ekonomi ölçümü: N paralel headless Chrome, her biri MINUTES dakika oynar.
// Firebase istekleri ENGELLENİR (canlı leaderboard/cüzdan kirlenmesin) — bu engeli kaldırma.
// Önce oyunu servis et:   python3 -m http.server 8765 --bind 127.0.0.1   (repo kökünde)
// Kullanım: node tools/bot-econ.mjs [instances=3] [minutes=12] [upgJSON] [normal|extreme]
// Örn:      node tools/bot-econ.mjs 1 2 '{"comboSplitV22":true,"magnetRange":8}' extreme
import os from 'node:os';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'http://127.0.0.1:8765/arcrise.html';
const N = +(process.argv[2] || 3), MINUTES = +(process.argv[3] || 12);
const UPG = process.argv[4] || '{"comboSplitV22":true}'; const MODE = process.argv[5] || 'normal';
const BLOCK = ['*firestore.googleapis.com*', '*identitytoolkit.googleapis.com*', '*securetoken.googleapis.com*',
  '*firebaseappcheck.googleapis.com*', '*firebaseinstallations.googleapis.com*', '*google.com/recaptcha*', '*gstatic.com/recaptcha*'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function instance(idx) {
  const port = 9400 + (Number(process.env.PORT_BASE) || 0) + idx;   // paralel süreçler için PORT_BASE
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TMPDIR}bot${idx}-${Date.now()}`,
    '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=450,800', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  // Birden çok Chrome aynı anda açılırken başlatma 15 sn'yi geçebiliyor → 40 sn bekle.
  for (let i = 0; i < 160 && !wsUrl; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = t.find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
  const ws = new WebSocket(wsUrl);
  let id = 0; const pend = new Map(); const netHits = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === 'Network.loadingFailed' && d.params.blockedReason) netHits.push(d.params.blockedReason); };
  await new Promise(r => ws.readyState === 1 ? r() : (ws.onopen = r));
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
  await send('Network.enable'); await send('Network.setBlockedURLs', { urls: BLOCK }); await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: PAGE }); await sleep(2500);
  const rv = await ev(`localStorage.getItem('arc_reset_v')`);
  await ev(`localStorage.clear(); localStorage.setItem('arc_reset_v', ${JSON.stringify(rv)}); localStorage.setItem('arc_denom_v23','1');
    localStorage.setItem('arc_combo_reset_v24','1'); localStorage.setItem('arc_dist_reset_v2','1'); localStorage.setItem('arc_firstplay','1');
    localStorage.setItem('arc_mode','${MODE}'); localStorage.setItem('arc_extreme_unlocked','1'); localStorage.setItem('arc_name','BOT${idx}'); localStorage.setItem('arc_upg_v1', ${JSON.stringify(UPG)}); true`);
  await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  await send('Page.navigate', { url: PAGE }); await sleep(3000);
  await ev(`ARC_BOT.start(); true`);
  const snap = () => ev(`JSON.stringify({ d: +localStorage.getItem('arc_dist_total') || 0, g: (JSON.parse(localStorage.getItem('arc_stats_v1') || '{}').goldTotal) || 0,
    c: +localStorage.getItem('arc_coins_earned') || 0, s: +localStorage.getItem('arc_last') || 0, gm: (JSON.parse(localStorage.getItem('arc_stats_v1') || '{}').gamesTotal) || 0 })`).then(JSON.parse);
  const runs = []; let prev = await snap(), tPrev = Date.now();
  const end = Date.now() + MINUTES * 60e3;
  while (Date.now() < end) {
    await sleep(400);
    const cur = await snap();
    if (cur.gm !== prev.gm || cur.d !== prev.d) {
      const cm = cur.d - prev.d, golds = cur.g - prev.g, now = Date.now();
      runs.push({ m: cm / 100, golds, raw: +(cm / 100 * (MODE === 'extreme' ? 2 : 1) + golds).toFixed(2), score: cur.s, sec: (now - tPrev) / 1000 - 1.2 });
      prev = cur; tPrev = now;
    }
  }
  const fin = await ev(`JSON.stringify({ earned: +localStorage.getItem('arc_coins_earned'), carry: +localStorage.getItem('arc_coin_carry'), distM: (+localStorage.getItem('arc_dist_total'))/100, golds: (JSON.parse(localStorage.getItem('arc_stats_v1')||'{}').goldTotal)||0, today: localStorage.getItem('arc_coin_day_amt'), goText: document.getElementById('go-coin-progress')?.textContent })`);
  console.log('SON DURUM', idx, fin);
  await ev(`ARC_BOT.stop(); true`);
  chrome.kill();
  return { runs, blocked: netHits.length };
}

const results = await Promise.all(Array.from({ length: N }, (_, i) => instance(i)));
const runs = results.flatMap(r => r.runs);
const outFile = os.tmpdir() + '/bot-econ-runs.json';
fs.writeFileSync(outFile, JSON.stringify(runs, null, 1));
console.log('run verisi:', outFile);
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const col = k => runs.map(r => r[k]);
console.log(`run sayısı: ${runs.length}  (engellenen Firebase isteği: ${results.reduce((a, r) => a + r.blocked, 0)})`);
for (const k of ['m', 'golds', 'raw', 'sec', 'score']) {
  const a = col(k); console.log(`${k.padEnd(6)} ort=${avg(a).toFixed(2)}  medyan=${q(a, .5).toFixed(2)}  p10=${q(a, .1).toFixed(2)}  p90=${q(a, .9).toFixed(2)}  max=${Math.max(...a).toFixed(2)}`);
}
