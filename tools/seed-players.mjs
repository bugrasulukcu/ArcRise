// Test verisi: N sahte oyuncu profili (players) + rastgele skorlar (scores, normal/extreme) yazar.
// DİKKAT: CANLI Firestore'a (arcrise-e1504) yazar — leaderboard'da gerçek oyuncular da görür.
//   Hepsi TEST#### isimlidir ve TEK anonim uid'e aittir; kimlik + yazılan doc listesi tools/.seed-state.json'da
//   tutulur → `cleanup` hepsini siler. State dosyasını silme (yoksa temizlik için token kaybolur).
// Kullanım:
//   node tools/seed-players.mjs seed [adet=1000]
//   node tools/seed-players.mjs cleanup
import fs from 'node:fs';
import path from 'node:path';
const API_KEY = 'AIzaSyB7x2es8UgEkQ91K4hruM7OaJKhpXkzvW4', PROJECT = 'arcrise-e1504';
const DB = `projects/${PROJECT}/databases/(default)/documents`;
const STATE = path.join(path.dirname(new URL(import.meta.url).pathname), '.seed-state.json');
const cmd = process.argv[2], N = Math.max(1, +(process.argv[3] || 1000));
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return null; } };
const writeState = s => fs.writeFileSync(STATE, JSON.stringify(s));

async function auth(state) {
  if (state?.rt) {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(state.rt) });
    if (r.ok) { const j = await r.json(); return { token: j.id_token, rt: j.refresh_token, uid: j.user_id }; }
  }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  if (!r.ok) throw new Error('anon auth ' + r.status + ' ' + await r.text());
  const j = await r.json(); return { token: j.idToken, rt: j.refreshToken, uid: j.localId };
}
async function commit(token, writes) {
  const r = await fetch(`https://firestore.googleapis.com/v1/${DB.replace(/\/documents$/, '')}/documents:commit?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ writes }) });
  if (!r.ok) throw new Error('commit ' + r.status + ' ' + (await r.text()).slice(0, 400));
}
const rnd = (a, b) => a + Math.random() * (b - a);
const int = v => ({ integerValue: String(Math.round(v)) });
// Çarpık dağılım: çoğu oyuncu düşük, az sayıda yüksek skor
const skewScore = () => Math.round(Math.exp(rnd(Math.log(80), Math.log(60000))));

if (cmd === 'seed') {
  const prev = readState();
  const a = await auth(prev);
  const created = prev?.docs || [];
  const startAt = prev?.next || 1;
  const writes = [], docs = [];
  const sample = [];
  for (let i = startAt; i < startAt + N; i++) {
    const name = 'TEST' + String(i).padStart(4, '0'), tag = String(Math.floor(1000 + Math.random() * 9000)), avatar = Math.floor(Math.random() * 20);
    const modes = Math.random() < 0.6 ? ['normal', 'extreme'] : ['normal'];
    let best = 0, bestDist = 0;
    for (const mode of modes) {
      const score = Math.round(skewScore() * (mode === 'extreme' ? 0.7 : 1)), distance = Math.round(score * rnd(0.015, 0.05) * 1000) / 1000;
      best = Math.max(best, score); bestDist = Math.max(bestDist, distance);
      const p = `${DB}/scores/${a.uid}_seed${i}_${mode}`;
      writes.push({ currentDocument: { exists: false }, update: { name: p, fields: {
        name: { stringValue: name }, tag: { stringValue: tag }, avatar: int(avatar), score: int(score), ts: int(Date.now() - rnd(0, 7 * 864e5)),
        mode: { stringValue: mode }, distance: { doubleValue: distance }, dName: { booleanValue: false }, dAv: { booleanValue: false }, owner: { stringValue: a.uid } } } });
      docs.push(p);
    }
    const pp = `${DB}/players/${name}#${tag}`;
    writes.push({ currentDocument: { exists: false }, update: { name: pp, fields: {
      name: { stringValue: name }, tag: { stringValue: tag }, avatar: int(avatar), score: int(best), dist: { doubleValue: bestDist },
      ts: int(Date.now()), owner: { stringValue: a.uid } } } });
    docs.push(pp);
    if (sample.length < 5) sample.push(`${name}#${tag}`);
  }
  // Önce state'i yaz (yarıda kesilse bile temizlik yapılabilsin)
  writeState({ rt: a.rt, uid: a.uid, next: startAt + N, docs: created.concat(docs) });
  for (let i = 0; i < writes.length; i += 400) { await commit(a.token, writes.slice(i, i + 400)); process.stdout.write(`\r${Math.min(i + 400, writes.length)}/${writes.length} yazma`); }
  console.log(`\n${N} profil, ${writes.length - N} skor kaydı yazıldı (uid ${a.uid}). Örnek: ${sample.join(', ')}`);
} else if (cmd === 'cleanup') {
  const s = readState(); if (!s) { console.log('state yok — silinecek bir şey bulunamadı'); process.exit(0); }
  const a = await auth(s);
  const del = s.docs.map(name => ({ delete: name }));
  for (let i = 0; i < del.length; i += 400) { await commit(a.token, del.slice(i, i + 400)); process.stdout.write(`\r${Math.min(i + 400, del.length)}/${del.length} silindi`); }
  fs.unlinkSync(STATE); console.log('\ntemizlendi');
} else console.log('Kullanım: node tools/seed-players.mjs seed [adet] | cleanup');
