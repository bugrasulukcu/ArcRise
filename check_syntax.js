// arcrise.html içindeki tüm <script> bloklarını sözdizimi açısından doğrular.
const fs = require('fs');
const src = fs.readFileSync('c:/Users/DELL/Desktop/BUGRA/ArcRise/arcrise.html', 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, i = 0, fail = 0;
while ((m = re.exec(src))) {
  i++;
  try {
    new Function(m[1]);
  } catch (e) {
    fail++;
    const line = src.slice(0, m.index).split('\n').length;
    console.log(`script #${i} (html satır ~${line}): ${e.message}`);
  }
}
console.log(`${i} script bloğu, ${fail} hata`);
