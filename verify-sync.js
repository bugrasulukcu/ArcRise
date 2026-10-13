// Root kaynak dosyaları ile üretilmiş kopyaların (www/, Android assets, iOS public)
// gerçekten aynı olduğunu doğrular. Fark varsa 1 ile çıkar.
//
// NEDEN VAR: www/ ve android/app/src/main/assets/public/ .gitignore'da olduğu
// için aralarındaki drift git'te GÖRÜNMEZ. 2026-08-26'da APK'ya paketlenen
// arcrise.html'in 8 hafta eski olduğu (esc()/CSP/toUid içermeyen sürüm)
// böyle bir drift yüzünden fark edilmemişti.
//
// Kullanım:  node verify-sync.js     (veya: npm run verify)
// Build öncesi çalıştır. Fark varsa: npm run sync
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILES = ['arcrise.html', 'index.html'];
const TARGETS = [
  ['www', 'www'],
  ['Android assets', path.join('android', 'app', 'src', 'main', 'assets', 'public')],
  ['iOS public', path.join('ios', 'App', 'App', 'public')],
];

const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
let bad = 0;

for (const file of FILES) {
  const src = path.join(__dirname, file);
  if (!fs.existsSync(src)) continue;
  const h = md5(src);
  for (const [label, dir] of TARGETS) {
    const dst = path.join(__dirname, dir, file);
    if (!fs.existsSync(dst)) { console.error(`EKSIK   ${label}/${file}`); bad++; continue; }
    if (md5(dst) !== h) { console.error(`FARKLI  ${label}/${file}`); bad++; }
    else console.log(`ayni    ${label}/${file}`);
  }
}

// Capacitor runtime config'i assets'ten okur — root'taki ile aynı olmalı.
const capSrc = path.join(__dirname, 'capacitor.config.json');
// cap sync JSON'u tab'la yeniden yazıyor → byte değil içerik karşılaştır.
// iOS kopyasına Capacitor kendi packageClassList alanını ekler → karşılaştırmada yok sayılır.
const capJson = p => { const o = JSON.parse(fs.readFileSync(p, 'utf8')); delete o.packageClassList; return JSON.stringify(o); };
for (const [label, dst] of [
  ['Android assets', path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json')],
  ['iOS App', path.join(__dirname, 'ios', 'App', 'App', 'capacitor.config.json')],
]) {
  if (!fs.existsSync(capSrc) || !fs.existsSync(dst)) continue;
  if (capJson(capSrc) !== capJson(dst)) { console.error(`FARKLI  ${label}/capacitor.config.json`); bad++; }
  else console.log(`ayni    ${label}/capacitor.config.json`);
}

if (bad) {
  console.error(`\n${bad} dosya guncel degil. Build ETME. Once calistir:\n  npm run sync\n`);
  process.exit(1);
}
console.log('\nTum kopyalar guncel.');
