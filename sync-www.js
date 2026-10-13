// Root'taki kaynak dosyaları www/ (Capacitor webDir) içine kopyalar.
// Kullanım: npm run sync   (www/ + Android + iOS kopyalarını günceller ve doğrular)
// Amaç: root ↔ www kopyalarının sessizce ayrışmasını (drift) önlemek.
const fs = require('fs');
const path = require('path');

const ITEMS = ['arcrise.html', 'index.html', 'AUDIO', 'PNG'];

for (const it of ITEMS) {
  const src = path.join(__dirname, it);
  const dst = path.join(__dirname, 'www', it);
  if (!fs.existsSync(src)) { console.warn(`atlandı (yok): ${it}`); continue; }
  fs.cpSync(src, dst, { recursive: true });
  console.log(`kopyalandı: ${it} -> www/${it}`);
}
console.log('\nwww/ güncel. Native kopyalar: npx cap sync android && npx cap sync ios');
