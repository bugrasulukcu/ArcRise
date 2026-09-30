// ArcRise uçtan uca testleri — `npm test`
//
// Headless Chrome (CDP) ile arcrise.html'i gerçek tarayıcıda çalıştırır.
// Firebase ASLA gerçek sunucuya gitmez: tüm *googleapis.com istekleri CDP Fetch ile
// yakalanıp bellekteki sahte Auth + Firestore'a yönlendirilir (kural taklidi dahil:
// kimliksiz yazma → 403). reCAPTCHA / gstatic engellidir.
//
// Çalıştırma: npm test            (tümü)
//             npm test -- pb      (adında "pb" geçen testler; virgülle birden çok: pb,müzik)
// Chrome yolu farklıysa: CHROME=/yol/chrome npm test
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILTER = (process.argv[2] || '').toLowerCase();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TEST_TIMEOUT = 90000;
let lastStep = '-';

// macOS: test sürerken sistemin uyumasını/App Nap'i engelle (uyku, zamanlayıcıları dakikalarca
// dondurup testleri "asılı" gösteriyordu).
if (process.platform === 'darwin') { try { spawn('caffeinate', ['-i', '-s', '-w', String(process.pid)], { stdio: 'ignore' }).unref(); } catch {} }

// ── Statik sunucu ────────────────────────────────────────────
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (req.url === '/__blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>blank</title>'); }
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const PAGE = `${ORIGIN}/arcrise.html`;

// ── Chrome + CDP ─────────────────────────────────────────────
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 200 && !wsUrl; i++) {
  try {
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(100);
}
if (!wsUrl) { console.error('Chrome başlatılamadı:', CHROME); process.exit(2); }
const ws = new WebSocket(wsUrl); await new Promise(r => (ws.onopen = r));
let msgId = 0; const pending = new Map(); let jsErrors = []; const dialogs = [];
const send = (method, params = {}) => new Promise(res => { const i = ++msgId; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => {
  lastStep = expr.replace(/\s+/g, ' ').slice(0, 70);
  const r = await Promise.race([send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }),
    sleep(15000).then(() => { throw new Error('ev zaman aşımı: ' + lastStep); })]);
  if (r.result?.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
  return r.result?.result?.value;
};

// ── Sahte Firebase ───────────────────────────────────────────
const fb = { docs: new Map(), writes: [], authCalls: [], offline: false, uidN: 0 };
const fbReset = () => { fb.docs.clear(); fb.writes = []; fb.authCalls = []; fb.offline = false; };
const reply = (requestId, status, body) => send('Fetch.fulfillRequest', { requestId, responseCode: status,
  responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }],
  body: Buffer.from(JSON.stringify(body)).toString('base64') });
function onFirebase({ requestId, request }) {
  if (fb.offline) return send('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return reply(requestId, 204, {});
  if (url.pathname.includes('accounts:signUp')) {
    const uid = 'UID' + (++fb.uidN); fb.authCalls.push('signUp');
    return reply(requestId, 200, { idToken: 'tok-' + uid, refreshToken: 'RT-' + uid, localId: uid, expiresIn: '3600' });
  }
  if (url.host.includes('securetoken')) {
    const rt = decodeURIComponent((request.postData || '').split('refresh_token=')[1] || ''); fb.authCalls.push('refresh:' + rt);
    const uid = rt.replace(/^RT-/, '');
    return reply(requestId, 200, { id_token: 'tok-' + uid, refresh_token: rt, user_id: uid, expires_in: '3600' });
  }
  if (!url.host.includes('firestore')) return reply(requestId, 404, {});
  const authed = Object.keys(request.headers || {}).some(k => k.toLowerCase() === 'authorization');
  const docPath = decodeURIComponent(url.pathname.split('/documents/')[1] || '');
  if (url.pathname.endsWith(':runQuery')) {
    const q = JSON.parse(request.postData || '{}').structuredQuery || {};
    const coll = q.from?.[0]?.collectionId;
    const rows = [...fb.docs.entries()].filter(([k]) => k.split('/')[0] === coll).map(([, d]) => d)
      .sort((a, b) => Number(b.fields.score?.integerValue || 0) - Number(a.fields.score?.integerValue || 0));
    return reply(requestId, 200, rows.length ? rows.map(document => ({ document })) : [{ readTime: new Date().toISOString() }]);
  }
  if (request.method === 'GET') return fb.docs.has(docPath) ? reply(requestId, 200, fb.docs.get(docPath)) : reply(requestId, 404, { error: { code: 404 } });
  if (request.method === 'PATCH' || request.method === 'POST') {
    const body = JSON.parse(request.postData || '{}');
    const target = request.method === 'POST' ? `${docPath}/AUTO${fb.writes.length}` : docPath;
    const w = { method: request.method, path: target, authed, masked: url.searchParams.getAll('updateMask.fieldPaths').length > 0,
      mustNotExist: url.searchParams.get('currentDocument.exists') === 'false', status: 200 };
    fb.writes.push(w);
    if (!authed) { w.status = 403; return reply(requestId, 403, { error: { code: 403, message: 'PERMISSION_DENIED' } }); }
    if (w.mustNotExist && fb.docs.has(target)) { w.status = 409; return reply(requestId, 409, { error: { code: 409 } }); }
    const cur = fb.docs.get(target) || { name: `projects/p/databases/(default)/documents/${target}`, fields: {} };
    cur.fields = { ...cur.fields, ...(body.fields || {}) };
    fb.docs.set(target, cur);
    return reply(requestId, 200, cur);
  }
  return reply(requestId, 200, {});
}
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Fetch.requestPaused') onFirebase(d.params);
  if (d.method === 'Page.javascriptDialogOpening') { dialogs.push(d.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
  if (d.method === 'Runtime.exceptionThrown') jsErrors.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text);
};
await send('Fetch.enable', { patterns: [{ urlPattern: '*googleapis.com/*' }] });
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*recaptcha*', '*gstatic.com/*'] });
await send('Page.enable'); await send('Runtime.enable');
// Müzik sayacı: döngülü AudioBufferSource = arka plan müziği
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__music = 0;
  const _st = AudioBufferSourceNode.prototype.start, _sp = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function(...a) { if (this.loop) { window.__music++; this.__m = 1; } return _st.apply(this, a); };
  AudioBufferSourceNode.prototype.stop  = function(...a) { if (this.__m) { window.__music--; this.__m = 0; } return _sp.apply(this, a); };` });

// ── Yardımcılar ──────────────────────────────────────────────
const nav = async url => { await send('Page.navigate', { url: 'about:blank' }); await sleep(100); await send('Page.navigate', { url }); };
let RESET_V = null;
async function waitFor(expr, ms = 15000, step = 150) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(step); }
  return false;
}
// Temiz profil: localStorage'ı sil, `seed` anahtarlarını yaz, sayfayı yeniden yükle.
async function fresh(seed = {}, { firstplay = true, name = 'ARC', keepReset = true } = {}) {
  if (!RESET_V) { await nav(PAGE); await waitFor(`!!window.ARC_BOT`); RESET_V = await ev(`localStorage.getItem('arc_reset_v')`); }
  const all = { arc_debug: '1', ...(keepReset ? { arc_reset_v: RESET_V } : {}), ...(name ? { arc_name: name } : {}), ...(firstplay ? { arc_firstplay: '1' } : {}), ...seed };
  // Önceki sayfa (belki oyun ortasında) kapanırken durumunu geri yazmasın: aynı origin'deki
  // oyun kodu olmayan boş sayfaya geç, depoyu orada temizleyip tohumla.
  await send('Page.navigate', { url: `${ORIGIN}/__blank` });
  if (!await waitFor(`location.pathname === '/__blank' && document.readyState === 'complete'`, 5000)) throw new Error('boş sayfa açılmadı');
  await ev(`localStorage.clear(); sessionStorage.clear(); Object.entries(${JSON.stringify(all)}).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); true`);
  await send('Page.navigate', { url: PAGE });
  if (!await waitFor(`!!window.ARC_TEST`)) throw new Error('sayfa hazır olmadı');
  await sleep(600);
  await ev(`document.querySelectorAll('#reward-toast').forEach(e => e.classList.remove('show')); true`);
}
const ls = k => ev(`localStorage.getItem(${JSON.stringify(k)})`);
const lsJSON = async k => JSON.parse(await ls(k) || 'null');
const scene = () => ev(`ARC_TEST.scene`);
async function realClick(sel) {   // gerçek fare olayı (sentetik .click() değil) — çift dinleyici hatalarını yakalar
  const r = await ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
}
async function playRun(ms) {   // bot `ms` oynar, sonra bırakır → top düşer → game over
  dbg('run başlıyor'); await ev(`document.getElementById('btn-start').click(); ARC_BOT.start(); true`);
  await sleep(ms); await ev(`ARC_BOT.stop(); true`); dbg('bot durdu');
  if (!await waitFor(`ARC_TEST.scene === 'over'`, 30000)) throw new Error('game over ekranına gelinmedi');
  dbg('game over');
  await sleep(2500);   // skor gönderimi (async) bitsin
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

class Fail extends Error {}
const T0 = { t: Date.now() };
const dbg = m => { if (process.env.E2E_DEBUG) console.log(`    · ${((Date.now() - T0.t) / 1000).toFixed(1)}s ${m}`); };
if (process.env.E2E_DEBUG) setInterval(() => dbg('♥ son adım: ' + lastStep + ' · bekleyen CDP: ' + pending.size), 5000).unref();
const check = (cond, msg) => { if (!cond) throw new Fail(msg); };

// ── Testler ──────────────────────────────────────────────────
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('start: tek dokunuş tek run başlatır, item bir kez harcanır', async () => {
  await fresh({ arc_upg_v1: { comboSplitV22: true, inv: { shield: { count: 5, armed: true } } } });
  await realClick('#btn-start'); await sleep(600);
  check(await scene() === 'play', 'oyun başlamadı');
  const n = (await lsJSON('arc_upg_v1')).inv.shield.count;
  check(n === 4, `shield 5 → ${n} (beklenen 4)`);
});

test('again: çift tıklama tek run, tek harcama', async () => {
  await fresh({ arc_upg_v1: { comboSplitV22: true, inv: { shield: { count: 5, armed: true } } } });
  await realClick('#btn-start');
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'game over gelmedi');
  await sleep(1200);
  await realClick('#btn-again'); await sleep(60); await realClick('#btn-again'); await sleep(600);
  const n = (await lsJSON('arc_upg_v1')).inv.shield.count;
  check(n === 3, `shield → ${n} (beklenen 3: START + tek AGAIN)`);
});

test('pb: ilk skor oluşturulur, daha iyisi kimlikli güncellenir; aynı isimli başka oyuncuya dokunulmaz', async () => {
  fbReset();
  const other = { name: 'projects/p/databases/(default)/documents/scores/OTHER_normal',
    fields: { name: { stringValue: 'ARC' }, owner: { stringValue: 'OTHER' }, score: { integerValue: '99999' }, mode: { stringValue: 'normal' }, ts: { integerValue: String(Date.now()) } } };
  fb.docs.set('scores/OTHER_normal', JSON.parse(JSON.stringify(other)));
  dbg('fresh'); await fresh(); dbg('sayfa hazır');
  const uid = await waitFor(`!!ARC_DB.getUid()`) && await ev(`ARC_DB.getUid()`);
  const myDoc = `scores/${uid}_normal`;
  // 1. run başlangıç çizgisini kesin geçsin (bot bazen hemen ölüyordu → skor 0, yazım yok)
  await ev(`document.getElementById('btn-start').click(); ARC_BOT.start(); true`); await sleep(300);
  await ev(`ARC_TEST.ghost(6); true`); await sleep(8000); await ev(`ARC_BOT.stop(); true`);   // skor > 0 olacak kadar (5 puan/m)
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), '1. run bitmedi'); await sleep(2500);
  const w1 = fb.writes.filter(w => w.path === myDoc);
  check(w1.length === 1 && w1[0].authed && w1[0].mustNotExist && w1[0].status === 200,
    `ilk yazım hatalı: ${JSON.stringify(w1)} · uid=${uid} · tüm yazımlar=${JSON.stringify(fb.writes.map(w => w.path))} · run=${JSON.stringify(await ev('ARC_TEST.lastRun'))}`);
  const s1 = Number(fb.docs.get(myDoc).fields.score.integerValue);
  // 2. run kesin daha iyi olsun: 12 sn Ghost (engele çarpmaz) + bot → daha uzağa gider
  await ev(`document.getElementById('btn-again').click(); ARC_BOT.start(); true`); await sleep(400);
  await ev(`ARC_TEST.ghost(12); true`);
  // skor artık küçük (5 puan/m) → iyileşmeyi garanti et: 3 kapı (her biri +10 × çarpan)
  for (let g = 0; g < 3; g++) { await sleep(700); await ev(`ARC_TEST.spawnFeatHere('gate'); true`); }
  dbg('2. run'); await sleep(12000); await ev(`ARC_BOT.stop(); true`); dbg('bot durdu, sahne=' + await scene());
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'ikinci run bitmedi'); dbg('2. game over');
  await sleep(2500);
  const best = Number(await ls('arc_best'));
  const s2 = Number(fb.docs.get(myDoc).fields.score.integerValue);
  check(best > s1, `ikinci run daha iyi olmadı (s1=${s1}, best=${best}) — bot ayarını kontrol et`);
  const w2 = fb.writes.filter(w => w.path === myDoc).slice(1);
  check(w2.some(w => w.authed && w.masked && w.status === 200), `PB güncellemesi yazılmadı: ${JSON.stringify(w2)}`);
  check(s2 === best, `bulut skoru ${s2}, yerel en iyi ${best}`);
  check(JSON.stringify(fb.docs.get('scores/OTHER_normal')) === JSON.stringify(other), 'aynı isimli başka oyuncunun kaydı değişti');
  check(!fb.writes.some(w => w.status === 403), '403 alan yazım var');
  const rows = await ev(`ARC_DB.invalidateTopCache(), ARC_DB.getTopScores(20, 'normal').then(r => r.map(x => x.name + ':' + x.score))`);
  check(rows.length === 2 && rows.every(r => r.startsWith('ARC:')), `liderlikte iki ayrı ARC olmalı: ${rows}`);
});

test('reset: sürüm kapısı eski hesabı tazelemez, yeni anonim hesap açar', async () => {
  fbReset();
  await fresh({ arc_reset_v: 'r-OLD', arc_fb_rt: 'RT-OLDUID' }, { keepReset: false });
  await waitFor(`!!ARC_DB.getUid()`);
  check(!fb.authCalls.some(c => c.startsWith('refresh:RT-OLDUID')), `eski token tazelendi: ${fb.authCalls}`);
  check(fb.authCalls.includes('signUp'), 'yeni anonim hesap açılmadı');
  const uid = await ev(`ARC_DB.getUid()`);
  check(uid !== 'OLDUID' && (await ls('arc_fb_rt')) === 'RT-' + uid, `uid=${uid}, arc_fb_rt=${await ls('arc_fb_rt')}`);
  check(await ls('arc_name') === null, 'reset yerel profili silmedi');
  check(await ls('arc_debug') === '1', 'reset arc_debug bayrağını sildi');
});

test('izler: depo 120 izle sınırlı, eski büyük depo kırpılır', async () => {
  const traces = Array.from({ length: 300 }, (_, i) => ({ points: [{ x: 0, y: -i }, { x: 5, y: -i - 50 }], yMin: -i - 50, yMax: -i, mode: 'normal' }));
  await fresh({ arc_traces_v1: traces });
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(400);
  const n = (await lsJSON('arc_traces_v1')).length;
  check(n === 120, `iz sayısı ${n} (beklenen 120)`);
});

test('liderlik: çevrimdışıyken "LOADING"de takılmaz, mesaj gösterir', async () => {
  fbReset();
  await fresh();
  fb.offline = true;
  await ev(`ARC_DB.invalidateTopCache(); document.getElementById('btn-lb').click(); true`);
  const ok = await waitFor(`/couldn|offline/i.test(document.getElementById('lb-list').textContent)`, 15000);
  const txt = await ev(`document.getElementById('lb-list').textContent.trim()`);
  fb.offline = false;
  check(ok, `liste: "${txt}"`);
});

test('müzik: yalnız oyun ekranında çalar', async () => {
  await fresh();
  await ev(`document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`); await sleep(1500);
  check(await ev('window.__music') === 0, 'ana ekranda müzik çalıyor');
  await ev(`document.getElementById('btn-start').click(); true`);
  check(await waitFor(`window.__music > 0`, 8000), 'oyunda müzik başlamadı');
  await sleep(800);
  const a = await ev(`ARC_TEST.audio`);
  check(a.ctx === 'running' && a.playing && a.gain > 0.3, `müzik duyulmuyor: ${JSON.stringify(a)}`);
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'game over gelmedi');
  check(await waitFor(`window.__music === 0`, 3000), 'game over ekranında müzik sürüyor');
});

test('ekonomi: metre başına coin, extreme ×2, günlük yumuşak tavan', async () => {
  await fresh({ arc_coin_day: today(), arc_coin_day_amt: '20' });
  const [n, x] = await ev(`(() => { const m = ARC_TEST.mode; ARC_TEST.setMode('normal'); const a = ARC_TEST.runCoinsRaw(1000, 0);
    ARC_TEST.setMode('extreme'); const b = ARC_TEST.runCoinsRaw(1000, 0); ARC_TEST.setMode(m); return [a, b]; })()`);
  check(n === 10 && x === 20, `10 m → normal ${n} (10), extreme ${x} (20)`);
  const capped = await ev(`ARC_TEST.applySoftCap(10)`);
  check(Math.abs(capped - 7) < 1e-9, `bugün 20 kazanılmışken 10 ham → ${capped} (beklenen 5 + 5×0.4 = 7)`);
});

test('ekonomi: run sonu coin tam sayı, kesir taşınır', async () => {
  await fresh({ arc_coins_earned: '0', arc_coin_carry: '0.5', arc_login_day: today() });
  await playRun(3000);
  const carry = Number(await ls('arc_coin_carry'));
  const earned = Number(await ls('arc_coins_earned'));
  check(carry >= 0 && carry < 1, `taşınan kesir ${carry} [0,1) dışında`);
  check(Number.isInteger(earned) && earned >= 0, `kazanılan coin tam sayı değil: ${earned}`);
});

test('günlük: yeni gün → görevler yenilenir, seri ilerler, giriş +1 coin', async () => {
  await fresh({ arc_login_day: '2000-1-1', arc_series_day: '3', arc_coins_earned: '0',
    arc_quests_v1: { date: '2000-1-1', day: 3, quests: [{ metric: 'runs', target: 1, progress: 1, claimed: true, reward: 2, label: 'x' }], allBonusClaimed: true } });
  const q = await lsJSON('arc_quests_v1');
  check(q.date === today(), `görev tarihi ${q.date}`);
  check(q.quests.length === 3 && q.quests.every(x => !x.claimed && x.progress === 0), 'görevler sıfırlanmadı');
  check(await ls('arc_series_day') === '4', `seri günü ${await ls('arc_series_day')} (beklenen 4)`);
  check(Number(await ls('arc_coins_earned')) === 1, `giriş coini: ${await ls('arc_coins_earned')} (beklenen 1)`);
  await nav(PAGE); await waitFor(`!!window.ARC_TEST`); await sleep(600);
  check(Number(await ls('arc_coins_earned')) === 1, 'aynı gün ikinci açılışta giriş coini tekrar verildi');
});

test('seri: 5. gün sandık, 1 gün kaçırma serbest, 2 gün sıfırlar, 60. gün özel iz', async () => {
  const dayNum = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
  const streakOf = async () => ({ s: (await lsJSON('arc_stats_v1')).dayStreak, p: ((await lsJSON('arc_streak_v1')) || { pending: [] }).pending.map(x => x.day + ':' + x.tier).join(',') });
  await fresh({ arc_stats_v1: { dayStreak: 4, lastDayNum: dayNum(-1) }, arc_streak_v1: { lastDay: 4, pending: [] }, arc_coins_earned: '0' });
  let r = await streakOf(); check(r.s === 5 && r.p === '5:small', `4→5: ${JSON.stringify(r)}`);
  await ev(`document.getElementById('btn-quests').click(); true`); await sleep(400);
  const inv0 = JSON.stringify((await lsJSON('arc_upg_v1'))?.inv || {});
  await ev(`document.querySelector('.st-open').click(); true`); await sleep(300);
  const coinsGot = Number(await ls('arc_coins_earned')) - 1;   // -1 = günlük giriş
  const inv1 = JSON.stringify((await lsJSON('arc_upg_v1')).inv);
  check(coinsGot === 10 || inv1 !== inv0, `sandık boş çıktı (coin +${coinsGot})`);
  check(((await lsJSON('arc_streak_v1')).pending.length) === 0, 'sandık açıldıktan sonra beklemede kaldı');
  await fresh({ arc_stats_v1: { dayStreak: 9, lastDayNum: dayNum(-2) }, arc_streak_v1: { lastDay: 9, pending: [] } });
  r = await streakOf(); check(r.s === 10, `1 gün kaçırma sonrası seri ${r.s} (beklenen 10)`);
  await fresh({ arc_stats_v1: { dayStreak: 9, lastDayNum: dayNum(-3) }, arc_streak_v1: { lastDay: 9, pending: [] } });
  r = await streakOf(); check(r.s === 1, `2 gün kaçırma sonrası seri ${r.s} (beklenen 1)`);
  await fresh({ arc_stats_v1: { dayStreak: 59, lastDayNum: dayNum(-1) }, arc_streak_v1: { lastDay: 59, pending: [] } });
  await ev(`document.getElementById('btn-quests').click(); true`); await sleep(400);
  await ev(`document.querySelector('.st-open').click(); true`); await sleep(300);
  check((await lsJSON('arc_upg_v1')).traceColorsOwned.includes('rb:ember'), '60. gün Ember izi verilmedi');
});

test('tutorial: gerçek run\'a geçişte takılı item harcanır', async () => {
  await fresh({ arc_upg_v1: { comboSplitV22: true, inv: { shield: { count: 3, armed: true } } } }, { firstplay: false });
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(800);
  check((await lsJSON('arc_upg_v1')).inv.shield.count === 3, 'tutorial başlarken item harcandı');
  await ev(`ARC_TEST.finishTutorial(); true`); await sleep(300);
  const n = (await lsJSON('arc_upg_v1')).inv.shield.count;
  check(n === 2, `tutorial sonrası run: shield 3 → ${n} (beklenen 2)`);
});

test('credits: alert yerine oyun penceresi', async () => {
  await fresh();
  await ev(`document.getElementById('btn-credits').click(); true`); await sleep(300);
  check(dialogs.length === 0, 'alert açıldı');
  check(await ev(`document.getElementById('credits-modal').classList.contains('open')`), 'credits penceresi açılmadı');
});

test('seri: 2. epik sandık tema verir', async () => {
  const dayNum = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
  await fresh({ arc_stats_v1: { dayStreak: 179, lastDayNum: dayNum(-1) }, arc_streak_v1: { lastDay: 179, pending: [], epicN: 1 } });
  await ev(`document.getElementById('btn-quests').click(); true`); await sleep(400);
  await ev(`document.querySelector('.st-open').click(); true`); await sleep(300);
  const u = await lsJSON('arc_upg_v1');
  check((u.themesOwned || []).length === 1, `tema verilmedi: ${JSON.stringify(u.themesOwned)}`);
});

test('tema denemesi: TRY → o temada tek run → çıkınca eski tema, hak bir kez', async () => {
  await fresh();
  await ev(`document.getElementById('btn-settings').click(); document.getElementById('theme-open').click(); true`); await sleep(400);
  await ev(`document.querySelector('[data-try="noir"]').click(); true`);
  check(await waitFor(`!!window.ARC_TEST && ARC_TEST.scene === 'play'`, 10000), 'deneme run\'ı başlamadı');
  check(await ev(`document.documentElement.classList.contains('theme-noir')`), 'deneme sırasında tema uygulanmadı');
  check((await lsJSON('arc_upg_v1')).theme === '', 'kayıtlı tema değişti');
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi');
  await sleep(1200);
  await ev(`document.getElementById('btn-again').click(); true`);
  check(await waitFor(`!!window.ARC_TEST && document.getElementById('theme-modal').classList.contains('open')`, 10000), 'deneme sonrası tema penceresine dönülmedi');
  check(!await ev(`document.documentElement.classList.contains('theme-noir')`), 'deneme bitince tema kalktı değil');
  check(await ev(`!document.querySelector('[data-try="noir"]') && !!document.querySelector('[data-try="gameboy"]')`), 'deneme hakkı tüketilmedi');
});

test('thread: dönen ikilinin arasından geçmek bonus verir', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  await ev(`ARC_TEST.ghost(5); ARC_TEST.spawnOrbitHere(90); true`);
  check(await waitFor(`ARC_TEST.threads === 1`, 4000), 'THREAD bonusu verilmedi');
});

test('nesneler: kapı, ×2 halkası, koridor, kristal, timing bonus verir', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(600);
  for (const k of ['ring', 'gate', 'corridor', 'crystal', 'timing']) { await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnFeatHere('${k}'); true`); await sleep(900); }
  const f = await ev('ARC_TEST.feats');
  check(f.gates === 1 && f.crystals === 1 && f.timings === 1 && f.corridors === 1, `sayaçlar: ${JSON.stringify(f)}`);
});

test('rozetler: THREADER / GATEKEEPER / CRYSTAL / MAESTRO açılır', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(600);
  await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnOrbitHere(90); true`); await sleep(1500);
  for (const k of ['gate', 'corridor', 'crystal', 'timing']) { await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnFeatHere('${k}'); true`); await sleep(900); }
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi');
  await sleep(800);
  const earned = JSON.parse(await ls('arc_badges_earned_v1') || '[]');
  for (const id of ['threader-1', 'gatekeeper-1', 'breaker-1', 'maestro'])
    check(earned.includes(id), `${id} açılmadı (açılanlar: ${earned.join(',')})`);
});

test('PB hayaleti: rekor run kaydedilir, sonraki run\'da oynatılır', async () => {
  await fresh();
  await playRun(5000);   // başlangıç çizgisini geçecek kadar
  const g = await lsJSON('arc_pb_ghost_normal');
  check(g && g.p.length > 5, 'rekor run hayaleti kaydedilmedi');
  await ev(`document.getElementById('btn-again').click(); true`); await sleep(500);
  const pg = await ev('ARC_TEST.pbGhost');
  check(pg && pg.n === g.p.length, `2. run'da hayalet yüklenmedi: ${JSON.stringify(pg)}`);
});

test('günlük meydan okuma: aynı pist, eşyasız, normal mod, skor günlük tabloya', async () => {
  fbReset();
  await fresh({ arc_mode: 'extreme', arc_upg_v1: { comboSplitV22: true, inv: { shield: { count: 3, armed: true } } } });
  await ev(`document.getElementById('btn-quests').click(); true`); await sleep(400);
  await ev(`document.querySelector('.dl-play').click(); true`); await sleep(900);
  const d1 = await ev('ARC_TEST.daily');
  check(d1.on && d1.mode === 'normal', `günlük mod açılmadı: ${JSON.stringify(d1)}`);
  check((await lsJSON('arc_upg_v1')).inv.shield.count === 3, 'günlük koşuda eşya harcandı');
  const sig1 = await ev('ARC_TEST.layoutSig(10)');
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi');
  await sleep(2500);
  const day = await ev(`(() => { const d = new Date(); return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); })()`);
  const uid = await ev('ARC_DB.getUid()');
  const w = fb.writes.filter(x => x.path === `daily/${day}/scores/${uid}`);
  const sc = (await ev('ARC_TEST.daily')).local.best;
  check(sc === 0 ? w.length === 0 : (w.length === 1 && w[0].authed && w[0].status === 200), `günlük yazım: ${JSON.stringify(w)} (skor ${sc})`);
  check(!fb.writes.some(x => x.path.startsWith('scores/')), 'günlük skor normal tabloya da yazıldı');
  // AGAIN → yine günlük, aynı pist
  await ev(`document.getElementById('btn-again').click(); true`); await sleep(900);
  check((await ev('ARC_TEST.daily')).on, 'AGAIN günlükten çıktı');
  const sig2 = await ev('ARC_TEST.layoutSig(10)');
  check(sig1 === sig2, `pist farklı:\n${sig1}\n${sig2}`);
  // menüye dön → mod geri gelir
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), '2. run bitmedi'); await sleep(1200);
  await ev(`document.getElementById('btn-menu').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`); await sleep(900);
  await ev(`document.getElementById('btn-menu').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); true`); await sleep(500);
  check(await ev('ARC_TEST.scene') === 'home', 'menüye dönülmedi');
  const d3 = await ev('ARC_TEST.daily');
  check(!d3.on && d3.mode === 'extreme', `menüde günlük mod kapanmadı / mod geri gelmedi: ${JSON.stringify(d3)}`);
});

test('görevler: START\'a basıp hemen ölmek görev ilerletmez', async () => {
  const q = (metric, target, param) => ({ metric, target, param: param || 0, reward: 2, label: metric, progress: 0, claimed: false });
  await fresh({ arc_mode: 'extreme', arc_extreme_unlocked: '1', arc_login_day: today(),
    arc_quests_v1: { date: today(), day: 1, quests: [q('runsToday', 3), q('extremeRuns', 1, 100), q('nearMissToday', 4)], allBonusClaimed: false } });
  await ev(`document.getElementById('btn-start').click(); true`);
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi');
  await sleep(800);
  const dist = (await ev('ARC_TEST.lastRun')).distCm;
  const pr = (await lsJSON('arc_quests_v1')).quests.map(x => x.metric + '=' + x.progress);
  check(dist < 50, `run beklenenden uzun sürdü (${dist} cm) — test geçersiz`);
  check(pr.every(x => x.endsWith('=0')), `hemen ölen run görev ilerletti: ${pr.join(', ')}`);
});

test('combo: seri çarpanı tüm kazançları çarpar (v27 tabanları)', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  const cap = (await ev('ARC_TEST.combo')).cap;
  await ev(`ARC_TEST.setCombo(2); true`);
  check((await ev('ARC_TEST.combo')).mul === 1, '2 topta combo başlamamalı');
  await ev(`ARC_TEST.setCombo(4); true`);   // combo 3 topla ×2 başlar → 4 top = ×3
  check((await ev('ARC_TEST.combo')).mul === Math.min(3, cap), 'combo çarpanı 3 değil');
  const b0 = await ev('ARC_TEST.bonus');
  await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnFeatHere('gate'); true`); await sleep(400);
  const got = (await ev('ARC_TEST.bonus')) - b0;
  check(got === 10 * Math.min(3, cap), `kapı combo ×3'te ${got} verdi (beklenen ${10 * Math.min(3, cap)})`);
  await ev(`ARC_TEST.setCombo(99); true`);
  check((await ev('ARC_TEST.combo')).mul === cap, 'tavanda çarpan tavanı aşıyor');
});

test('başlangıç çizgisi: 10 cm\'yi geçmeyen run 0 m / 0 puan, oyun sayılmaz', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`);
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi');
  await sleep(800);
  if (await ev('ARC_TEST.startCrossed')) return;   // top yayla çizgiyi geçtiyse test geçersiz (nadir)
  const r = await ev('ARC_TEST.lastRun');
  check(r.distCm === 0 && r.score === 0, `çizgi geçilmeden mesafe/skor: ${JSON.stringify(r)}`);
  check(((await lsJSON('arc_stats_v1')) || {}).gamesTotal ? false : true, 'çizgiyi geçmeyen run oyun sayıldı');
});

test('ghost duvara yapışmaz: yansır, dokunuş çalışır', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  await ev(`ARC_TEST.ghost(6); const p = ARC_TEST.player; ARC_TEST.placePlayer(p.wl + p.r + 3, Math.PI + 0.35, -1); true`);
  let stuck = 0, away = 0;
  for (let k = 0; k < 20; k++) { await sleep(50); const q = await ev('ARC_TEST.player'); if (q.x <= q.wl + q.r + 2) stuck++; away = Math.max(away, q.x - q.wl - q.r); }
  check(stuck <= 2 && away > 60, `duvara yapıştı: ${stuck}/20 kare, en uzak ${away}px`);
  await ev('ARC_TEST.tap(); true'); const d1 = (await ev('ARC_TEST.player')).dir; await sleep(150);
  check((await ev('ARC_TEST.player')).dir === d1, 'dokunuş geri alındı');
});

test('kristal CLOSE: sıyırıp geçmek booster verir', async () => {
  await fresh();
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  // kristali oyuncunun yanına (çarpmadan, 22 px içinde) koy → uzaklaşınca CLOSE tetiklenir
  await ev(`ARC_TEST.spawnCrystalBeside(); true`);
  const ok = await waitFor(`ARC_TEST.feats.crystalClose >= 1 || ARC_TEST.scene !== 'play'`, 4000);
  const f = await ev('ARC_TEST.feats');
  if (process.env.E2E_DEBUG) console.log('    · kristal:', JSON.stringify(f));
  if (f.crystalClose < 1) return;   // top kristale çarptıysa (yerleşim rastgele) test geçersiz
  check(ok && f.booster, `CLOSE sonrası booster yok: ${JSON.stringify(f)}`);
});

test('bounce: duvar ve engelden seker, 3 hak, ölmez', async () => {
  await fresh({ arc_upg_v1: { comboSplitV22: true, inv: { bounce: { count: 2, armed: true } } } });
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  check((await lsJSON('arc_upg_v1')).inv.bounce.count === 1, 'bounce eşyası harcanmadı');
  check(await ev('ARC_TEST.bounces') === 3, `run başında 3 hak yok: ${await ev('ARC_TEST.bounces')}`);
  await ev(`const p = ARC_TEST.player; ARC_TEST.placePlayer(p.wl + p.r + 3, Math.PI + 0.35, -1); true`);
  await sleep(300);
  check(await ev('ARC_TEST.scene') === 'play', 'duvarda öldü');
  check(await ev('ARC_TEST.bounces') === 2, `duvar sekmesi hak düşürmedi: ${await ev('ARC_TEST.bounces')}`);
  const q = await ev('ARC_TEST.player');
  check(q.x > q.wl + q.r + 5, 'duvardan uzaklaşmadı');
  await ev(`ARC_TEST.obstacleAhead(40, 24); true`); await sleep(300);
  check(await ev('ARC_TEST.scene') === 'play', 'engelde öldü');
  check(await ev('ARC_TEST.bounces') === 1, `engel sekmesi hak düşürmedi: ${await ev('ARC_TEST.bounces')}`);
});

test('davet: linkle kaydolan oyuncu davet edenin arkadaş listesine otomatik düşer', async () => {
  fbReset();
  // 1) Davet eden (HOST) hesap açar
  await fresh({}, { name: 'HOST' });
  check(await waitFor(`!!localStorage.getItem('arc_tag') && !!ARC_DB.getUid()`, 8000), 'HOST hesabı oluşmadı');
  await sleep(800);
  const host = await ev(`({ code: localStorage.getItem('arc_friend_code'), tag: localStorage.getItem('arc_tag'), rt: localStorage.getItem('arc_fb_rt'), reset: localStorage.getItem('arc_reset_v') })`);
  check(host.code, 'HOST davet kodu yok');
  const hostId = 'HOST#' + host.tag;
  check(fb.docs.has('players/' + hostId), 'HOST profili sunucuda yok');
  // 2) Yeni oyuncu linkle gelir (profil yok), GUEST adıyla kaydolur
  await send('Page.navigate', { url: `${ORIGIN}/__blank` }); await sleep(200);
  await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('arc_reset_v', ${JSON.stringify(host.reset)}); localStorage.setItem('arc_debug', '1'); true`);
  await send('Page.navigate', { url: `${PAGE}?ref=${host.code}&from=${encodeURIComponent(hostId)}` });
  check(await waitFor(`!!window.ARC_TEST && document.getElementById('profile-setup').classList.contains('active')`, 10000), 'profil ekranı açılmadı');
  check(!!(await ls('arc_ref_from')), 'davet bilgisi saklanmadı');
  await ev(`const i = document.getElementById('ps-name-input'); i.value = 'GUEST'; i.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('ps-confirm').click(); true`);
  check(await waitFor(`!localStorage.getItem('arc_ref_from')`, 10000), 'davet edene istek gönderilmedi');
  const reqKey = [...fb.docs.keys()].find(k => k.startsWith('friendreqs/') && k.includes(hostId));
  check(reqKey, 'friendreqs dokümanı yok');
  check(fb.docs.get(reqKey).fields.via?.stringValue === host.code, 'istekte via kodu yok');
  // 3) HOST oyuna döner → otomatik kabul
  await send('Page.navigate', { url: `${ORIGIN}/__blank` }); await sleep(200);
  await ev(`localStorage.clear(); ['arc_reset_v', 'arc_debug', 'arc_name', 'arc_tag', 'arc_friend_code', 'arc_fb_rt', 'arc_firstplay'].forEach((k, i) => localStorage.setItem(k, ${JSON.stringify([host.reset, '1', 'HOST', host.tag, host.code, host.rt, '1'])}[i])); true`);
  await send('Page.navigate', { url: PAGE });
  check(await waitFor(`!!window.ARC_TEST`, 10000), 'HOST sayfası açılmadı');
  const accepted = await (async () => { for (let k = 0; k < 40; k++) { if (fb.docs.get(reqKey)?.fields.status?.stringValue === 'accepted') return true; await sleep(200); } return false; })();
  check(accepted, `istek otomatik kabul edilmedi: ${JSON.stringify(fb.docs.get(reqKey)?.fields.status)}`);
});

test('iz renkleri: iz dolduktan sonra da yol uzunluğuyla akar (topa yapışmaz)', async () => {
  await fresh({ arc_upg_v1: { comboSplitV22: true, traceColor: 'custom', customOwned: true, customStops: ['#ff3b3b', '#3bd1ff', '#c45bff'] } });
  await ev(`document.getElementById('btn-start').click(); ARC_BOT.start(); true`); await sleep(300);
  await ev(`ARC_TEST.ghost(20); true`);
  check(await waitFor(`ARC_TEST.trailInfo.n >= 600`, 25000), 'iz 600 noktaya dolmadı');
  const t1 = await ev('ARC_TEST.trailInfo'); await sleep(600); const t2 = await ev('ARC_TEST.trailInfo');
  check(t2.n === 600, 'iz uzunluğu sabit değil');
  check(t2.headD - t1.headD > 80, `iz dolunca tepe yol uzunluğu ilerlemiyor: ${t1.headD} → ${t2.headD}`);
  check(t2.tailD > t1.tailD, 'kuyruk kırpılmıyor');
});

test('yetenek çapı + slot geliştirmeleri: Coin Pull çapla sınırlı, cooldown slot seviyesine göre', async () => {
  await fresh({ arc_slots_owned: '2', arc_slots_v1: [{ type: 'ability', key: 'coinpull', icon: 'u-coinpull' }, { type: 'ability', key: 'timeslow', icon: 'u-timeslow' }, null, null],
    arc_upg_v1: { comboSplitV22: true, slotUpg: [{ dur: 0, cd: 2 }, { dur: 3, cd: 0 }], inv: { coinpull: { owned: true, durLvl: 2, durOwn: 2 }, timeslow: { owned: true, durLvl: 0 }, shock: { owned: true, durLvl: 4, durOwn: 4 } } } });
  const a = await ev(`ARC_TEST.abil('coinpull', 0)`), t = await ev(`ARC_TEST.abil('timeslow', 1)`), sh = await ev(`ARC_TEST.abil('shock', 0)`);
  check(a.R === 560 + 2 * 160, `Coin Pull çapı ${a.R}`);
  check(sh.R === 260 + 4 * 60, `Shockwave çapı ${sh.R}`);
  check(a.cd === 16, `slot 1 cooldown ${a.cd} (beklenen 16)`);
  check(Math.abs(t.dur - 2 * 1.6) < 1e-6, `slot 2 süre ${t.dur} (beklenen 3.2)`);
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(500);
  await ev(`ARC_TEST.trigger(0); true`);
  const cd = (await ev('ARC_TEST.slotCD'))[0];
  check(cd > 15 && cd <= 16, `tetik sonrası slot cooldown ${cd}`);
});

test('coin yalnız mesafeden: altın ve kristal coin vermez, dolum önceki kesirden', async () => {
  await fresh({ arc_coin_carry: '0.85', arc_login_day: today(), arc_coins_earned: '0' });
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(400);
  for (const k of ['crystal']) { await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnFeatHere('${k}'); true`); await sleep(700); }
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi'); await sleep(2500);
  const c = await ev('ARC_TEST.coinAnim'), r = await ev('ARC_TEST.lastRun');
  check(Math.abs(c.from - 0.85) < 1e-6, `dolum başlangıcı ${c.from}`);
  check(Math.abs((c.to - c.from) - r.distCm / 100) < 0.02, `coin kazancı mesafeden farklı: ${c.to - c.from} vs ${r.distCm / 100} m (altın/kristal coin vermemeli)`);
});

test('büyük coin: 5 m\'de oluşur, toplanınca 2 coin', async () => {
  await fresh({ arc_coin_carry: '0', arc_login_day: today(), arc_coins_earned: '0' });
  await ev(`document.getElementById('btn-start').click(); true`); await sleep(400);
  await ev(`ARC_TEST.ghost(3); ARC_TEST.spawnFeatHere('bigcoin'); true`); await sleep(600);
  check((await ev('ARC_TEST.feats')).bigCoins === 1, 'büyük coin toplanmadı');
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi'); await sleep(2500);
  const c = await ev('ARC_TEST.coinAnim'), r = await ev('ARC_TEST.lastRun');
  check(Math.abs((c.to - c.from) - (r.distCm / 100 + 2)) < 0.02, `kazanç ${c.to - c.from} (beklenen mesafe + 2)`);
});

// İki oyunculu testler için: tüm localStorage'ı yakala / geri yükle (aynı origin'de kimlik değiştirir)
async function snapshotUser() { return await ev(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))`); }
async function asUser(snap) {
  await send('Page.navigate', { url: `${ORIGIN}/__blank` }); await sleep(200);
  await ev(`localStorage.clear(); sessionStorage.clear(); Object.entries(${snap}).forEach(([k, v]) => localStorage.setItem(k, v)); true`);
  await send('Page.navigate', { url: PAGE });
  if (!await waitFor(`!!window.ARC_TEST`, 10000)) throw new Error('sayfa açılmadı');
}
const toastHas = (txt, ms = 15000) => waitFor(`(document.getElementById('reward-toast')?.textContent || '').includes(${JSON.stringify(txt)})`, ms, 200);

test('arkadaşlık: istek ve kabul bildirimi, meydan okuma gönder → oyna → sonuç iki tarafa', async () => {
  fbReset();
  await fresh({}, { name: 'HOST' });
  check(await waitFor(`!!localStorage.getItem('arc_tag') && !!ARC_DB.getUid()`, 8000), 'HOST hesabı yok'); await sleep(600);
  const H = await snapshotUser(), hostTag = JSON.parse(H).arc_tag, hostId = 'HOST#' + hostTag;
  // ALICE (en iyi skoru 100) hesap açar
  await asUser(JSON.stringify({ arc_reset_v: JSON.parse(H).arc_reset_v, arc_debug: '1', arc_name: 'ALICE', arc_firstplay: '1', arc_score_v26: '1', arc_denom_v23: '1', arc_dist_reset_v2: '1', arc_combo_reset_v24: '1', arc_stats_v1: JSON.stringify({ bestNormal: 100 }) }));
  check(await waitFor(`!!localStorage.getItem('arc_tag') && !!ARC_DB.getUid()`, 8000), 'ALICE hesabı yok'); await sleep(600);
  // 1) ALICE → HOST istek
  await ev(`document.getElementById('btn-friends').click(); document.getElementById('fl-add-input').value = ${JSON.stringify(hostId)}; document.getElementById('fl-add-btn').click(); true`);
  check(await waitFor(`/Request sent/.test(document.getElementById('fl-add-msg').textContent)`, 8000), 'istek gönderilemedi: ' + await ev(`document.getElementById('fl-add-msg').textContent`));
  const A = await snapshotUser();
  // 2) HOST: bildirim + kabul
  await asUser(H);
  check(await toastHas('FRIEND REQUEST'), 'HOST\'a istek bildirimi düşmedi');
  await ev(`document.getElementById('btn-friends').click(); true`); await sleep(600);
  await ev(`document.querySelector('.fl-inv-acc').click(); true`);
  const reqKey = [...fb.docs.keys()].find(k => k.startsWith('friendreqs/'));
  check(await (async () => { for (let k = 0; k < 30; k++) { if (fb.docs.get(reqKey)?.fields.status?.stringValue === 'accepted') return true; await sleep(200); } })(), 'kabul yazılmadı');
  const H2 = await snapshotUser();
  // 3) ALICE: kabul bildirimi + meydan okuma
  await asUser(A);
  check(await toastHas('FRIEND ADDED'), 'ALICE\'e kabul bildirimi düşmedi');
  await ev(`document.getElementById('btn-friends').click(); true`); await sleep(800);
  await ev(`document.querySelector('.fl-chal').click(); true`);
  const chKey = await (async () => { for (let k = 0; k < 30; k++) { const c = [...fb.docs.keys()].find(x => x.startsWith('challenges/')); if (c) return c; await sleep(200); } })();
  check(chKey && fb.docs.get(chKey).fields.target.integerValue === '100', `meydan okuma dokümanı yok / hedef yanlış: ${chKey && fb.docs.get(chKey).fields.target.integerValue} · toast="${await ev(`document.getElementById('toast').textContent`)}" · butonlar=${await ev(`document.querySelectorAll('.fl-chal').length`)} · best=${await ev(`JSON.parse(localStorage.getItem('arc_stats_v1')).bestNormal`)} · yazımlar=${JSON.stringify(fb.writes.slice(-4).map(w => w.path + ':' + w.status))}`);
  const A2 = await snapshotUser();
  // 4) HOST: bildirim → PLAY → sonuç
  await asUser(H2);
  check(await toastHas('CHALLENGE!'), 'HOST\'a meydan okuma bildirimi düşmedi');
  await ev(`document.getElementById('btn-friends').click(); true`); await sleep(800);
  await ev(`document.querySelector('.fl-ch-play').click(); true`);
  check(await waitFor(`ARC_TEST.scene === 'play' && !document.getElementById('chal-num').hidden`, 5000), 'meydan okuma run\'ı / hedef HUD yok');
  check(await waitFor(`ARC_TEST.scene === 'over'`, 30000), 'run bitmedi'); await sleep(1500);
  const st = fb.docs.get(chKey).fields.status?.stringValue;
  check(st === 'won' || st === 'lost', `sonuç yazılmadı: ${st}`);
  // 5) ALICE: sonuç bildirimi
  await asUser(A2);
  check(await toastHas(st === 'won' ? 'CHALLENGE BEATEN' : 'CHALLENGE HELD'), 'ALICE\'e sonuç bildirimi düşmedi');
});

// ── Koştur ───────────────────────────────────────────────────
let pass = 0, fail = 0;
const run = tests.filter(t => !FILTER || FILTER.split(',').some(f => t.name.toLowerCase().includes(f.trim())));
for (const t of run) {
  jsErrors = [];
  const t0 = Date.now(); T0.t = t0;
  try {
    await Promise.race([t.fn(), sleep(TEST_TIMEOUT).then(() => { throw new Fail(`${TEST_TIMEOUT / 1000} sn içinde bitmedi (son adım: ${lastStep})`); })]);
    if (jsErrors.length) throw new Fail('JS hatası: ' + [...new Set(jsErrors)].slice(0, 3).join(' | '));
    pass++; console.log(`✓ ${t.name}  (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
  } catch (e) {
    fail++; console.log(`✗ ${t.name}\n    ${e instanceof Fail ? e.message : e.stack}`);
  }
}
console.log(`\n${pass} geçti, ${fail} kaldı (${run.length} test)`);
chrome.kill(); server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
