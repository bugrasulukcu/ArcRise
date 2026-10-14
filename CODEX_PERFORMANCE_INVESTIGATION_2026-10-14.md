# ArcRise performans incelemesi — 14 Ekim 2026

Kullanıcı yavaşlamanın tüm oyunda hissedildiğini belirtti; inceleme yalnız toplama efektleriyle sınırlanmadı. İnceleme oyun kodunu değiştirmez. Yerel test kopyalarında efektleri ayrı ayrı devre dışı bırakmak yalnız teşhis içindir.

## Kısa sonuç

En güçlü sürekli yük, ekran dışında kalmış olsa da 600 noktaya kadar izin iki katman halinde tekrar çizilmesi. Normal oyun tekrarında yalnız görünmeyen segmentleri atlamak 52,9 → 58,5 FPS; p95 kare süresi 33,3 → 16,8 ms verdi. Yoğun toplamada aynı müdahale üç karşılaştırmada da FPS'i yükseltti. Buna uçan altın puanı, parçacıklar ve gereksiz HUD güncellemeleri ekleniyor. 33 ms simülasyon sınırı düşük FPS'i ayrıca ağır çekime dönüştürüyor.

Bu, Nothing Phone 1 üzerinde kesin kök neden teşhisi değildir; yerel kod ve kontrollü tarayıcı denemeleriyle desteklenen önceliklendirmedir. CPU yavaşlatılmayan kontrol koşusu yoğun toplamada 60 FPS verdi.

## Kapsam ve yöntem

- Kayıtlı sürüm: cac222f / oyun kaynağı 8c1c81c ile aynı.
- Çalışma dosyası SHA-256: 1a8524524f9fa4a5d649b6b6cb82a224cdc2a1d087e0adcdb907cc5f07e9d0da. İnceleme başladığında bu dosyada zaten performans değişiklikleri vardı.
- HEAD ve üretilmiş www/Android kopyalarının SHA-256 değeri: 892a6662bd7699b0bc90f28f71ce37367c15cc036a0c989bbb71cf0454eb7936.
- Chrome headless, 390×844 CSS px, DPR 3; canvas iç çözünürlüğü 600×1298. Ana iş parçacığı 4 kat yavaşlatıldı. Her senaryo yeni geçici profil, bot + Ghost, 15 saniye ölçüm.
- Normal: doğal oyun. Stres: her 700 ms bir yeşil ve bir altın doğrudan oyuncunun üzerine bırakıldı. Yoğun toplama üst sınır testi; ortalama bir koşuyu temsil etmez.
- Firebase/Auth/reCAPTCHA ağ uçları engellendi; üretime test kaydı gönderilmedi. FPS, oyun içi gösterge yerine doğrudan requestAnimationFrame zamanlarından hesaplandı.
- İlk tarama sırasında aynı makinede başka bir performans testi de çalışıyordu. İlk tablodaki sonuçlar keşif niteliğindedir; küçük farklar anlamlı kabul edilmez. İşlevsel test süreci de takip ölçümlerinin bir kısmında çalışıyordu. Kritik karşılaştırmalar ayrıca tekrarlandı; makinedeki diğer test faaliyetleri nedeniyle bunlar tamamen boş bir makinenin ölçümü olarak sunulmuyor.
- Sabit rastgele tohum kullanıldı; farklı FPS ve simülasyon adımları yüzünden koşular birebir aynı nesne dizisini üretmez. Bot gerektiğinde yeniden koşu başlatır; normal oyun tekrarının birinde bu gerçekleşti. Dolayısıyla bunlar sabit kaydedilmiş bir sahnenin birebir tekrarları değildir. Etkileri toplamak veya tek koşudan kesin yüzde vaat etmek doğru değildir.
- CPU yavaşlatma Nothing Phone 1 emülatörü değildir: telefonun GPU, bellek, ısınma ve WebView koşulları doğrulanmadı. Chrome da GPU sürecinin bu CPU yavaşlatmasından etkilenmediğini açıklıyor: [Chrome: CPU yavaşlatmasının sınırları](https://developer.chrome.com/blog/devtools-grounded-real-world)

## Ölçüm tablosu — keşif turu

Hepsi CPU ×4, 15 saniye. `p95`, karelerin %95'inin altında kaldığı süredir; düşük olması daha iyidir. Efekt kapatmaları HEAD üstünde yalnız teşhis kopyasına uygulanır.

| Sürüm / değişiklik | Senaryo | FPS | p95 (ms) |
|---|---|---:|---:|
| HEAD — Tam çizim | Normal | 52.6 | 33.4 |
| Çalışma dosyası — Tam çizim | Normal | 57.4 | 16.8 |
| HEAD — Tam çizim | Yoğun toplama | 35.9 | 49.9 |
| Çalışma dosyası — Tam çizim | Yoğun toplama | 35.6 | 49.9 |
| HEAD — İz çizimi kapalı | Yoğun toplama | 47.4 | 33.4 |
| HEAD — Ekran dışı iz çizimi atlandı | Yoğun toplama | 43.6 | 33.4 |
| HEAD — Parçacık çizimi kapalı | Yoğun toplama | 40.7 | 33.4 |
| HEAD — CSS backdrop blur kapalı | Yoğun toplama | 36.7 | 49.9 |
| HEAD — Canvas shadowBlur kapalı | Yoğun toplama | 41.7 | 33.4 |
| HEAD — Low grafik modu | Yoğun toplama | 49.3 | 33.4 |
| HEAD — Uçan altın puanı çizimi kapalı | Yoğun toplama | 45.7 | 33.4 |
| HEAD — Küçük kayan yazılar kapalı | Yoğun toplama | 35.6 | 33.5 |
| HEAD — Tam çizim | Yoğun toplama | 31.8 | 50.0 |
| HEAD — Ekran dışı iz çizimi atlandı | Yoğun toplama | 40.8 | 33.4 |

Bu oranlar birbirine eklenemez. Bir efektin çizimini kapatmak onu ürün tasarımından kaldırma önerisi değildir.

## Tekrar ve eski sürüm karşılaştırması

| Sürüm / değişiklik | CPU | Senaryo | FPS | p95 (ms) |
|---|---:|---|---:|---:|
| HEAD / base | ×4 | Yoğun toplama | 38.1 | 33.4 |
| HEAD / culltrail | ×4 | Yoğun toplama | 49.3 | 33.4 |
| HEAD / noshadow | ×4 | Yoğun toplama | 42.2 | 33.4 |
| HEAD / base | ×1 | Yoğun toplama | 60.0 | 16.8 |
| 3b3568f / base | ×4 | Yoğun toplama | 30.3 | 50.0 |
| 3fa0593 / base (iki yardımcı tamamlanmış) | ×4 | Yoğun toplama | 31.2 | 50.0 |

Geçerli tarihsel stres denemesinde 3fa0593 31,2 FPS, 3b3568f 30,3 FPS verdi; HEAD tekrarları 31,8–38,1 FPS aralığındaydı. Son iki parçacık optimizasyonu yön olarak faydalı görünüyor; bu gürültülü ölçüm son değişiklikleri tek başına regresyon kaynağı ilan etmeyi desteklemiyor.

İlk `3fa0593` denemesinde eski sayfa başlangıcı tamamlanmadan bot başlatıldı; sayfa home durumunda kaldığı için çıkan sayı oyun FPS sonucu olarak **reddedildi**. Ölçüm aracına oyun başlangıcını açıkça bekleyen kontrol eklendi. İkinci denemede eski sürümde `spawnBonusHere` da olmadığı için stres yükünün uygulanmadığı görüldü; 52,7 FPS sonucu da tarihsel stres kıyasına **alınmadı**. Son tekrarda eksik iki yardımcı da yalnız test kopyasına eklenip gerçek toplama yükü doğrulandı.

## Sürekli yavaşlama için normal oyun tekrarı

Toplama stresi uygulanmadı; CPU ×4, 15 saniye:

| Değişiklik | FPS | p95 (ms) |
|---|---:|---:|
| HEAD normal çizim | 52,9 | 33,3 |
| HEAD yalnız görünmeyen iz segmentleri atlandı | 58,5 | 16,8 |

Bu testte de yön aynı; performans sorunu sadece altın/enerji toplama anlarıyla sınırlı değil.

## Doğrulanan nedenler

### 1. Ekran dışında kalan iz parçaları her karede işleniyor

`drawTrail` iki döngüde bütün izi ayrı çizgi parçaları olarak çizer; `step` izi 600 noktada sınırlar. Böylece sadece iz için kare başına 1.198 stroke ve renk/genişlik ayarı yapılabilir. LOWFX bu döngüleri azaltmaz. Ölçüm sonlarında 600 noktanın yalnızca yaklaşık 60–113'i ekran çevresindeydi; kalan kısmın JavaScript/Canvas komut maliyeti sürüyordu.

Teşhis kopyasında yalnız ekran dışındaki segmentleri atlamak FPS'i artırdı. Görünen izin renk, kalınlık ve alfa hesabı değiştirilmedi. Bu yaklaşım, izi kaldırmadan denenebilecek ilk optimizasyondur. Üretim uygulamasında sınır payı maksimum iz kalınlığı/parıltıya göre seçilmeli.

### 2. Toplama anında birden çok pahalı efekt üst üste geliyor

`drawParticles`, `drawFlyScores`, `drawFloatTexts`, `drawBgFlash` ve oyuncu parlamaları birlikte çalışıyor. Altın puanı yazısında her kare değişen font boyutu ve 12–22 px shadowBlur var. Yeni dönüş parçacıkları sprite kullanıyor, fakat diğer efektler hâlâ gradyan/gölge üretiyor. Uçan puanı ve parçacık çizimini ayrı ayrı kapatmak iyileşme sağladı; yalnız son parçacık optimizasyonu bütün yükü kaldırmıyor.

`triggerGoldFlash` kendi başına yalnız bir sayıyı güncelliyor; gerçek çizim yükü `drawBgFlash` içinde. Profilde görülen `(program)` süresi tek bir oyun fonksiyonuna mal edilemez.

### 3. Düşük FPS, kayıtlı sürümde oyun hızını da düşürüyor

HEAD `loop` gerçek kare aralığını en fazla 0,033 saniye sayıyor. Sabit 20 FPS'te saniyede yalnız 20×0,033=0,66 oyun saniyesi ilerliyor. Dolayısıyla takılma, ağır çekim hissine dönüşüyor; enerji/cooldown gibi bu süreyi kullanan sayaçlar da etkileniyor.

Çalışma dosyasında önceden yapılmış değişiklik bu sınırı 0,05'e çıkarıp uzun adımı ikiye bölüyor. Bu, 20–30 FPS aralığını iyileştirmeyi hedefler; 20 FPS altındaki zaman kaybını tamamen çözmez. Sağlam çözüm sınırlı yakalama adımlı sabit simülasyon zamanı ve ayrı çizim zamanıdır; duraklama/arkaplandan dönüş davranışı korunmalıdır.

### 4. Her kare DOM güncellemeleri ve geç kalan Auto modu

HEAD skor/rekor/mesafe metinlerini ve slot SVG özniteliklerini değer değişmese de tekrar yazar. `step` içinde combo metinleri de her adımda yeniden yazılır; combo animasyonu için `offsetWidth` okunur. İlk stres koşusunda 15 saniye içinde yaklaşık 2 saniye style+layout işi ölçüldü (4× yavaşlatma altında). Bu ölçüm tek başına tüm maliyeti belirli bir metne bağlamaz.

Mevcut çalışma dosyası HUD/slot tekrarlarını azaltmış, fakat combo güncellemeleri devam ediyor. Normal oyun ölçümü iyileşse de stres koşusu hâlâ 60 FPS'e ulaşmıyor. Çalışma dosyasının zaman adımı da değiştiğinden karşılaştırma yalnız DOM optimizasyonunun etkisi değildir.

HEAD Auto modu açılıştaki 4 saniyeden sonra iki ardışık 3 saniyelik pencerede ortalama FPS'in 42 altına inmesini bekler. Sürekli 45–50 FPS veya aralıklı takılmalar bu nedenle yüksek efektte kalabilir. High seçeneği otomatik düşüşü tamamen kapatır. Çalışma dosyasındaki yeni eşik daha erken tepki verir; ancak esas çizim yükünü ortadan kaldırmaz.

## Ölçümü yanıltan ve paketlemeyi etkileyen noktalar

- `_fpsCur`, gerçek zaman yerine kırpılmış ve Time Slow/tutorial ile yavaşlatılmış `dt` kullanır. HEAD sabit 20 gerçek FPS'te yaklaşık 30 FPS gösterebilir. FPS/frametime göstergesi gerçek rAF farkından hesaplanmalı.
- `node verify-sync.js`: www, Android assets ve iOS public arcrise.html kaynakla farklı; üç üretilmiş kopya eski HEAD sürümünde. Yereldeki yeni optimizasyonlar bu paketlere henüz yansımamıştı. Arkadaşın kurulu APK'sının sürümü bu incelemede bilinmiyor.
- Canvas genişliği DPR ile çarpılmıyor; bu testte DPR 3 nedeniyle canvas'ın kontrolsüz büyüdüğü görülmedi.
- CSS backdrop blur kapatılması bu masaüstü testinde belirgin iyileşme göstermedi. Bu, gerçek telefonda GPU maliyetinin olmadığı anlamına gelmez.
- Son toplama değişikliğini tek başına regresyonun nedeni ilan etmek için yeterli kanıt yok. İz maliyeti ve zaman kırpması daha eski kodda da bulunuyor.

## Önerilen sıra

1. Görünmeyen iz segmentlerini atla; görünür kısmın mevcut stilini koru.
2. Uçan skor yazılarının/parlamaların tekrar çizim maliyetini azalt; benzer sabit görselleri önceden üret.
3. Combo dahil HUD'u yalnız değer değiştiğinde güncelle; layout okumalarını yazmalardan ayır.
4. Gerçek zaman FPS ölçümünü ve simülasyon zamanını düzelt; Auto kararını gerçek kare süreleriyle ver.
5. Paketleri senkronize edip Nothing Phone 1'de aynı koşuyu High/Low ile ölç. Chrome sürümü/WebView sürümü, 60/120 Hz, güç tasarrufu ve cihaz sıcaklığı test kaydına alınmalı.

Geçici kullanıcı çözümü: Settings → Graphics → Low. Testte fayda sağladı, ancak mevcut iz döngüsü Low'da da aynı kaldığından sürekli 60 FPS garantisi değildir.

## Kaynak konumları ve yerel kanıt

Satırlar inceleme başlangıcındaki çalışma dosyasına aittir:

- `arcrise.html:9206` — drawTrail; `:9266` ve `:9276` iki çizim döngüsü; `:9913` 600 nokta sınırı.
- `arcrise.html:7722` — drawFlyScores; `:8862` — drawParticles.
- `arcrise.html:11118` — loop/zaman kırpması; `:11143` — FPS hesabı.
- `arcrise.html:10000` — combo DOM güncellemeleri; `:12643` — slot güncellemeleri.
- `arcrise.html:6292` — grafik seçimi ve otomatik LOWFX.
- `/tmp/arcrise-perf-20261014/bench.mjs` — depo kodunu değiştirmeden kaynak kopyası servis eden ölçüm aracı.
- `/tmp/arcrise-perf-20261014/results.jsonl` — ilk 14 senaryo, ham kare/DOM/oyun durum özetleri.
- `/tmp/arcrise-perf-20261014/normal.jsonl` — normal oyun A/B; dosyanın son tarihsel sonucu stres yükü eksik olduğundan geçersizdir.
- `/tmp/arcrise-perf-20261014/history-valid.jsonl` — iki yardımcı eklenmiş geçerli tarihsel stres ölçümü.
- `/tmp/arcrise-perf-20261014/recheck.jsonl` — ek sürüm/tekrar ölçümleri.
- `/tmp/arcrise-perf-20261014/{HEAD,working,3b3568f,3fa0593}.html` — incelenen kaynak anlık kopyaları.

Oyun davranışı değiştirilmediğinden işlevsel test paketi veya native build tarafımdan yeniden çalıştırılmadı. Fiziksel Nothing Phone 1 ölçümü yapılmadı.
