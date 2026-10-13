// Kare süresi ölçümü (FPS): headless Chrome, telefon ekranı, CPU yavaşlatma, bot oynar. Firebase ENGELLİ.
// Önce oyunu servis et:  python3 -m http.server 8765 --bind 127.0.0.1   (repo kökünde)
// Kullanım: node tools/fps-bench.mjs <url> [cpuRate=4] [saniye=15] [stress=0|1]
//   stress=1 → her 0.7 sn topun üstüne bir yeşil + bir altın (ARC_TEST.spawnBonusHere / spawnGoldHere, ?debug=1 gerekir)
// Örn:      node tools/fps-bench.mjs "http://127.0.0.1:8765/arcrise.html?debug=1" 4 15 1
// Çıktı: fps (ortalama), p50/p95/p99 kare süresi (ms), 33 ms / 50 ms üstü kare sayısı. PROF=1 → en pahalı fonksiyonlar.
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [PAGE, RATE = '4', SECS = '15', STRESS = '0'] = process.argv.slice(2);
const BLOCK = ['*firestore.googleapis.com*', '*identitytoolkit.googleapis.com*', '*securetoken.googleapis.com*', '*firebaseappcheck.googleapis.com*', '*firebaseinstallations.googleapis.com*', '*google.com/recaptcha*', '*gstatic.com/recaptcha*'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9555 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TMPDIR}fps-${Date.now()}`, '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
let wsUrl; for (let i = 0; i < 160 && !wsUrl; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = t.find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
await new Promise(r => ws.readyState === 1 ? r() : (ws.onopen = r));
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) console.log('ERR', r.result.exceptionDetails.exception?.description?.slice(0, 200)); return r.result?.result?.value; };
await send('Network.enable'); await send('Network.setBlockedURLs', { urls: BLOCK }); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Page.navigate', { url: PAGE }); await sleep(2500);
const rv = await ev(`localStorage.getItem('arc_reset_v')`);
await ev(`localStorage.clear(); Object.entries({arc_reset_v:${JSON.stringify(rv)},arc_debug:'1',arc_denom_v23:'1',arc_combo_reset_v24:'1',arc_dist_reset_v2:'1',arc_score_v26:'1',arc_firstplay:'1',arc_name:'ARC',arc_tag:'1234',arc_gfx:'high'}).forEach(([k,v])=>localStorage.setItem(k,v)); true`);
await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
await send('Page.navigate', { url: PAGE }); await sleep(3000);
await send('Emulation.setCPUThrottlingRate', { rate: +RATE });
await ev(`document.getElementById('btn-start').click(); ARC_BOT.start(); ARC_TEST.ghost(999); true`);
await sleep(1500);
if (STRESS === '1') await ev(`window._st = setInterval(() => { try { ARC_TEST.spawnBonusHere(0, 0, 14); if (ARC_TEST.spawnGoldHere) ARC_TEST.spawnGoldHere(0, 0); } catch(e) {} }, 700); true`);
if (process.env.PROF) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start'); }
const res = await ev(`new Promise(res => { const d = []; let last = performance.now(); const end = last + ${+SECS * 1000};
  function f(t) { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(d); } requestAnimationFrame(f); })`);
if (process.env.PROF) { const p = (await send('Profiler.stop')).result.profile; const self = new Map(); const dt = p.timeDeltas; const byId = new Map(p.nodes.map(n => [n.id, n]));
  p.samples.forEach((sid, i) => { const n = byId.get(sid); const k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
  const tot = [...self.values()].reduce((a, b) => a + b, 0); console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => (v / tot * 100).toFixed(1) + '% ' + k).join('\n')); }
const s = [...res].sort((a, b) => a - b), avg = res.reduce((a, b) => a + b, 0) / res.length;
const pct = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
const out = { frames: res.length, fps: +(1000 / avg).toFixed(1), p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), p99: +pct(0.99).toFixed(1), over33: res.filter(x => x > 33.4).length, over50: res.filter(x => x > 50).length,
  scene: await ev('ARC_TEST.scene'), lowfx: await ev(`document.documentElement.classList.contains('lowfx')`) };
console.log(JSON.stringify(out));
chrome.kill(); process.exit(0);
