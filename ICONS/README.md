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

> **Not (2026-09-28):** Rozetler artık kodda madalyon olarak çiziliyor (`badgeHTML`, `BADGE_GLYPHS` —
> avatar stili, kademe rengi + kademe noktaları). Bu klasördeki SVG'ler kullanılmıyor; eşikler aşağıda güncel.

Rozet sistemi kademelidir: 10 ailenin her birinin 5 kademesi vardır
(I bronz → II gümüş → III altın → IV platin → V elmas). **Her kademe AYRI
dosyadır**: `score-1.svg` … `score-5.svg` gibi — dosya adları koddaki rozet
kimlikleriyle (`score-1`) birebir aynıdır, bağlama işi bu sayede otomatik olacak.

Placeholder'lara her kademenin önerilen rengi gömülüdür; kendi çizimlerinde
bu paleti veya istediğin varyasyonu kullanabilirsin — SABİT renk serbest
(kod tarafı yeniden boyamayacak, çizim neyse o görünecek):

| Kademe | Renk | Hex |
|---|---|---|
| 1 | Bronz | `#cd7f32` |
| 2 | Gümüş | `#c8ccd4` |
| 3 | Altın | `#ffd700` |
| 4 | Platin | `#7de3ff` |
| 5 | Elmas | `#c77dff` |

| Dosyalar (her biri -1 … -5) | Rozet ailesi | Kademe hedefleri (I→V) |
|---|---|---|
| score-N.svg | SCORE — tek elde skor | 500 / 2.000 / 6.000 / 15.000 / 40.000 |
| range-N.svg | DISTANCE — tek elde mesafe | 2m / 5m / 10m / 20m / 40m |
| odometer-N.svg | TRAVELLER — toplam mesafe | 50m / 250m / 1km / 3km / 10km |
| combo-N.svg | COMBO — art arda toplanan top (seri) | 5 / 15 / 30 / 60 / 100 |
| gold-N.svg | GOLD — toplam altın top | 10 / 50 / 200 / 600 / 1.500 |
| boost-N.svg | COLLECTOR — toplam booster | 10 / 50 / 200 / 600 / 1.500 |
| veteran-N.svg | VETERAN — oynanan el | 10 / 50 / 250 / 1.000 / 3.000 |
| daily-N.svg | STREAK — üst üste gün | 3 / 7 / 14 / 30 / 100 |
| extreme-N.svg | EXTREME — extreme el | 1 / 10 / 50 / 200 / 500 |
| social-N.svg | SOCIAL — arkadaş sayısı | 1 / 3 / 5 / 10 / 25 |

Özel rozetler (kademesiz, tek ikon):

| Dosya | Rozet | Koşul |
|---|---|---|
| speedrun.svg | SPEEDRUN | 60 saniyede 5.00m |
| night-owl.svg | NIGHT OWL | 00:00-04:00 arası bir el bitir |
| survivor.svg | SURVIVOR | Revive/continue/Shield olmadan 8.00m |
| boss.svg | BOSS | 7 yeteneğin hepsine sahip ol |
| daredevil.svg | DAREDEVIL | Tek run'da 10 CLOSE! (yakın geçiş) |
| last-second.svg | LAST SECOND | Geri sayım 0'dayken yeşil yakala |
