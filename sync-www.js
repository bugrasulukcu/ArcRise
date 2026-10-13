// Root'taki kaynak dosyaları www/ (Capacitor webDir) içine kopyalar.
// Kullanım: npm run sync   (www/ + Android + iOS kopyalarını günceller ve doğrular)
// Amaç: root ↔ www kopyalarının sessizce ayrışmasını (drift) önlemek.
const fs = require('fs');
const path = require('path');

const ITEMS = ['arcrise.html', 'index.html', 'AUDIO', 'PNG', 'FONTS'];

// Dosyayi silip yeniden olusturmak yerine yerinde uzerine yazar (bazi
// senkron/izinli klasorlerde silme engelli olabilir); degismeyenleri atlar.
function copyInPlace(src, dst) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copyInPlace(path.join(src, name), path.join(dst, name));
    return;
  }
  const data = fs.readFileSync(src);
  if (fs.existsSync(dst) && fs.readFileSync(dst).equals(data)) return;
  fs.writeFileSync(dst, data);
}

for (const it of ITEMS) {
  const src = path.join(__dirname, it);
  const dst = path.join(__dirname, 'www', it);
  if (!fs.existsSync(src)) { console.warn(`atlandı (yok): ${it}`); continue; }
  copyInPlace(src, dst);
  console.log(`kopyalandı: ${it} -> www/${it}`);
}
console.log('\nwww/ güncel. Native kopyalar: npx cap sync android && npx cap sync ios');
