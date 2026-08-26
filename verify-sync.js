// Root kaynak dosyaları ile üretilmiş kopyaların (www/ ve Android assets)
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
const capDst = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json');
if (fs.existsSync(capSrc) && fs.existsSync(capDst)) {
  if (md5(capSrc) !== md5(capDst)) { console.error('FARKLI  Android assets/capacitor.config.json'); bad++; }
  else console.log('ayni    Android assets/capacitor.config.json');
}

if (bad) {
  console.error(`\n${bad} dosya guncel degil. Build ETME. Once calistir:\n  npm run sync\n`);
  process.exit(1);
}
console.log('\nTum kopyalar guncel.');
