# ICONS/upgrades — Upgrade kartı ikonları

Her dosya adı, koddaki upgrade anahtarıyla birebir aynıdır. Kendi çizimini
aynı isimle bu dosyanın ÜZERİNE kaydet, sonra kodda bağlarız.

## Çizim kuralları (önemli)

- **viewBox="0 0 24 24"** kullan (kare). Genişlik/yükseklik yazmana gerek yok.
- Renk için **`currentColor`** kullan (`stroke="currentColor"` / `fill="currentColor"`)
  → ikon, oyunun tema rengini (mor) otomatik alır. Sabit renk istersen hex de yazabilirsin.
- Çizgi kalınlığı ~2px iyi görünüyor (kartta 26px boyutunda gösterilecek).

## Dosya ↔ Upgrade eşlemesi

| Dosya | Ekrandaki kart |
|---|---|
| profit.svg | CORE > Profit (coin kazancı) |
| radius.svg | CORE > Radius (çember boyutu) |
| speed.svg | CORE > Speed |
| timer.svg | CORE > Timer (combo süresi) |
| wallSoft.svg | CORE > Walls (duvar affı) |
| magnetRange.svg | CORE > Magnet |
| timeslow.svg | ABILITIES > Time Slow |
| phaseburst.svg | ABILITIES > Phase Burst |
| coinpull.svg | ABILITIES > Coin Pull |
| brake.svg | ABILITIES > Brake |
| mirror.svg | ABILITIES > Mirror Flip |
| shock.svg | ABILITIES > Shockwave |
| anchor.svg | ABILITIES > Anchor |
| revive.svg | ITEMS > Revive |
| doubler.svg | ITEMS > Coin Doubler |
| headstart.svg | ITEMS > Head Start |
| coinrain.svg | ITEMS > Coin Rain |
| preboost.svg | ITEMS > Pre-Booster |
| filter.svg | ITEMS > Filter |
| traceColor.svg | Kozmetik > Trail Colour |
| traceThickness.svg | Kozmetik > Trail Thickness |
| deathName.svg | Kozmetik > Death Name |
| deathAvatar.svg | Kozmetik > Death Avatar |

Hepsi hazır olunca (ya da bir kısmı bile) söyle — kartları bu dosyalardan
okuyacak şekilde kodu bağlayayım. O zamana kadar kartlarda oyunun kendi
yerleşik ikonları görünmeye devam edecek.
