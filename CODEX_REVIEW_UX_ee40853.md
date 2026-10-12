# ArcRise — son UX değişikliklerinin incelemesi

İncelenen HEAD: `ee40853`. Karşılaştırma: `3fa0593..ee40853`.

Kaynak kodda değişiklik yapılmadı. Testler `--mute-audio` ile sessiz headless Chrome'da, mevcut E2E paketinin sahte Firebase ve ağ engellemesiyle çalıştırıldı. Üretim Firebase'e test verisi gönderilmedi.

## Doğrulanan bulgular

### [P2] Rekor rengi sonraki normal koşuya taşınıyor

Konum: `arcrise.html:10728` (oyun sonu değerlerinin hazırlanması), `arcrise.html:10575` (`celebrateRecord`), `arcrise.html:3761` (`.go-twin-val.rec`).

`celebrateRecord()` skor/mesafe elemanlarına `rec` sınıfını ekliyor. Sonraki oyun sonunda metin ve `is-new` etiketleri sıfırlanıyor fakat `rec` temizlenmiyor. Bu yüzden rekor olmayan sonuçlar da kalıcı altın renk ve parıltıyla gösteriliyor.

Tarayıcıda yeniden üretim:

1. Önceden küçük bir rekoru olan profilde 37 puanlık yeni rekor elde et.
2. Rekor kutlamasının bitmesini bekle, AGAIN ile tekrar başla.
3. İkinci koşuyu 0 puanla bitir.
4. `#go-best-line.is-new` yok; buna rağmen `#go-score-val.rec` hâlâ var ve hesaplanan renk `rgb(255, 224, 102)`.

Öneri: Her oyun sonu hazırlığında iki değerin `rec` sınıfını temizle; panel kutlama durumunu da sıfırla. Sayım/kutlama callback'lerini yeni koşuya geçildiğinde geçersiz kılmak da yaşam döngüsünü güvenli hâle getirir.

Kanıt: `/tmp/arcrise-latest-nonrecord.png`. Ek test, `ordinary run retains PB rec class` doğrulamasında beklendiği gibi başarısız oldu.

### [P2] Dar ekranda yükseltmenin sonraki değeri kırpılıyor

Konum: `arcrise.html:2374` (`.core-card-next`), `arcrise.html:13220` (önizleme satırı).

320 × 568 görünümünde önizlemeler 99 px genişliğindeki alana `white-space: nowrap` ile yerleşiyor. RADIUS kartındaki sonraki değer sağ kenarda kırpılıyor; SPEED satırı kart sınırını aşıyor. Satın alma öncesinde gösterilmek istenen değer tam okunamıyor.

Ölçülen `clientWidth / scrollWidth` değerleri:

| Önizleme | Genişlik |
| --- | --- |
| TURN SIZE ×1.0 → ×1.1 | 99 / 120 px |
| BALL SPEED ×1.0 → ×1.1 | 99 / 126 px |
| COMBO WINDOW 2.0s → 2.5s | 99 / 137 px |
| WALL GRACE 0px → +1px | 99 / 120 px |
| PICKUP REACH OFF → +1mm | 99 / 132 px |

Öneri: Etki adını ve değer geçişini iki satıra ayır veya dar ekran için satır kırılmasına izin ver. Sayısal sonraki değeri üç noktayla gizleme.

Kanıt: `/tmp/arcrise-latest-upgrades320-clean.png`. 390 × 844 görünümünde ilk kartlarda bu kırpılma görülmedi.

## Paketleme durumu

`npm run verify` başarısız: `www/arcrise.html` ve `android/app/src/main/assets/public/arcrise.html` kaynakla farklı. Bu yeni UX kodunun ayrı bir hatası değil; APK build öncesi mevcut `npm run sync` akışı çalıştırılıp doğrulama tekrar yapılmalı. İnceleme kapsamında senkronizasyon/build yapılmadı.

## Doğrulama kapsamı

- Mevcut paketten 10 test geçti: START, AGAIN, müzik yaşam döngüsü, yetenek çapı/cooldown, mesafe coin'i, büyük coin, sandık, oyun sonu sıralaması, önceki review düzeltmeleri, challenge outbox.
- Ek ödül testi geçti: aktif koşuda mini gösterge var ve büyük kart yok; oyun sonu gecikmesinden sonra kart geliyor; gerçek pointer olayıyla AGAIN'e basıldığında kart kapanıyor.
- Rekor durumunun temizlenmesini sınayan ek test başarısız oldu; yukarıdaki bulguyu doğruladı.
- 390 × 844 ve 320 × 568 boyutlarında menü, görevler ve yükseltmeler; ayrıca oyun içi Ghost ve ardışık oyun sonları incelendi.
- Tüm 37 test yeniden çalıştırılmadı. Gerçek Android cihaz performansı ve üretim Firestore kuralları bu testlerin kapsamında değil.

## Görsel değerlendirme — hata değil

Menüde START odağı daha belirgin; Ghost sırasında topun çekirdeği ve enerji sayacı daha okunaklı. Ödüllerin koşu sonuna ertelenmesi ve +0 coin'in geri plana alınması olumlu. Daily Run kartı 320 px görünümünde de erişilebilir.

Bir sonraki görsel ayarda, yoğun toplama anlarında parçacıkların top ve yaklaşan engellerle ne kadar rekabet ettiğine bakılabilir. Bu bir tasarım önerisi; bu incelemede FPS düşüşü ölçülmedi.
