// iOS Swift Package Manager isim çakışması düzeltmesi (@capacitor-firebase/app-check).
// Yerel paketin kimliği klasör adından gelir: "app-check" — Firebase'in bağımlısı google/app-check ile AYNI →
// SPM "AppCheckCore bulunamadı" hatasıyla çözümlemeyi bozar. Eklentiye farklı adlı bir bağlantı açıp
// Capacitor'ün ürettiği Package.swift'te yolu ona çevirir. `npm run sync` ve `npm install` sonrası otomatik çalışır.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'node_modules', '@capacitor-firebase');
const link = path.join(dir, 'capacitor-firebase-app-check');
if (!fs.existsSync(path.join(dir, 'app-check'))) process.exit(0);
try { fs.lstatSync(link); } catch (_) { fs.symlinkSync('app-check', link, 'dir'); }
const pkg = path.join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
if (fs.existsSync(pkg)) {
  const s = fs.readFileSync(pkg, 'utf8');
  const t = s.replace('node_modules/@capacitor-firebase/app-check"', 'node_modules/@capacitor-firebase/capacitor-firebase-app-check"');
  if (t !== s) { fs.writeFileSync(pkg, t); console.log('[fix-spm-appcheck] Package.swift yolu düzeltildi'); }
}
