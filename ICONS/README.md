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

---

# ICONS/badges — Rozet ikonları

Rozet sistemi kademelidir: 10 ailenin her birinin 5 kademesi vardır
(I bronz → II gümüş → III altın → IV platin → V elmas). **Aile başına TEK
ikon çizilir** — kademe rengi (bronz/gümüş/altın/platin/elmas) kod tarafından
`currentColor` üzerinden otomatik uygulanır. Bu yüzden rozet ikonlarında
MUTLAKA `currentColor` kullan, sabit renk kullanma.

| Dosya | Rozet ailesi | Kademe hedefleri (I→V) |
|---|---|---|
| score.svg | SCORE — tek elde skor | 1.000 / 5.000 / 20.000 / 75.000 / 250.000 |
| range.svg | DISTANCE — tek elde mesafe | 10m / 25m / 50m / 100m / 250m |
| odometer.svg | TRAVELLER — toplam mesafe | 100m / 500m / 2.5km / 10km / 50km |
| combo.svg | COMBO — en yüksek kombo | 5 / 9 / 15 / 25 / 50 |
| gold.svg | GOLD — toplam altın top | 10 / 50 / 250 / 1.000 / 5.000 |
| boost.svg | COLLECTOR — toplam booster | 10 / 50 / 250 / 1.000 / 5.000 |
| veteran.svg | VETERAN — oynanan el | 10 / 50 / 250 / 1.000 / 5.000 |
| daily.svg | STREAK — üst üste gün | 3 / 7 / 14 / 30 / 100 |
| extreme.svg | EXTREME — extreme el | 1 / 10 / 50 / 250 / 1.000 |
| social.svg | SOCIAL — arkadaş sayısı | 1 / 3 / 5 / 10 / 25 |

Özel rozetler (kademesiz, tek ikon):

| Dosya | Rozet | Koşul |
|---|---|---|
| speedrun.svg | SPEEDRUN | 60 saniyede 10.00m |
| night-owl.svg | NIGHT OWL | 00:00-04:00 arası bir el bitir |
| survivor.svg | SURVIVOR | Revive/continue olmadan 10.00m |
| boss.svg | BOSS | 7 yeteneğin hepsine sahip ol |
