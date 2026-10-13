# ArcRise — genel test ve güncelleme incelemesi

Tarih: 13 Ekim 2026. Tam oyun testlerinin ve native derlemelerin tabanı: `3b3568f`.

**Sonuç:** Mevcut 38 oyun testinin tamamından başarılı sonuç alındı; ilk tam tur 36/38, başarısız iki testin bağımsız tekrarı 2/2. Android debug ve iOS simülatör derlemeleri başarılı. Dar ana menüde bir görsel hata doğrulandı.

## Doğrulanan bulgu

### [P2] 320 px ana menüde skor ve mesafe sağ düğmelerin altına taşıyor

Konum: `arcrise.html:1085–1123`, özellikle `.hs-pair` ve `#home-side`.

320 × 568 ekranda ana menüyü açmak yeterli; sıfır skorlu yeni profilde de oluşuyor. Profil kartındaki sabit avatar, boşluklar ve en az 88 px genişliğindeki sağ sütun, istatistiklere yeterli alan bırakmıyor. `min-width: 0` kullanan orta sütunun içindeki `46px 1fr` grid ve satır kırılmayan sayılar sağa taşıyor.

| Değer | Metnin sağ kenarı | Sağ sütunun başlangıcı | Taşma |
| --- | ---: | ---: | ---: |
| SCORE `000000` | 225,84 px | 187 px | 38,84 px |
| DIST `0.00m` | 212,02 px | 187 px | 25,02 px |

Skor/mesafe kısmen UPG düğmesiyle üst üste biniyor. 390 × 844 ve 768 × 1024 görünümlerinde aynı profil taşmıyor. Yükseltme önizlemelerinin önceki 320 px kırpılma düzeltmesi ise geçiyor.

Öneri: Dar genişliklerde profil kartının sütun düzenini değiştir; etiket ve değeri alt alta yerleştir veya sağ düğmeleri ayrı satıra taşı. Skorun rakamlarını gizleyerek çözme.

Kanıt: `/tmp/arcrise-review-3b3568f-isolated/home-320.png` ve aynı klasördeki `details.json`.

## Oyun ve görsel kontroller

- `npm test`: 38 testin ilk turunda 36 geçti. Sandık toplama ve arkadaşlık/challenge testleri eşzamanlı derleme sırasında başarısız oldu. Derlemeler bittikten sonra `npm test -- 'mesafe sandığı,arkadaşlık:'` ile ikisi de geçti. Tek turda temiz 38/38 sonucu elde edildiği iddia edilmiyor; bu iki testin sabit beklemeleri ve rastlantısal oyun akışı sağlamlaştırılabilir.
- Kapsam: START/AGAIN ve eşya tüketimi, rekor/skor kaydı, öğretici, müzik yaşam döngüsü, ekonomi, günlük görevler/seri, temalar, engeller ve bonuslar, combo, Ghost/Bounce, yetenekler, sandıklar, sıralama, davet, arkadaşlık, challenge ve çevrimdışı gönderim kuyruğu.
- Harici ağ engelliyken 6 font ağırlığının Latin ve Latin Extended dosyaları yüklendi; Türkçe karakterler ve çevrimdışı oyun başlangıcı doğrulandı.
- Bağımsız ek testlerde yüksek/düşük efekt modları geçti: 22/12 altın parçacığı topa dönüyor, iz oluşuyor, skor artıyor, yeşil enerji halkası tetikleniyor, dokunuş yönü değişiyor ve yeni koşuda parçacıklar temizleniyor.
- 320, 390 ve 768 px menü/görev/yükseltme/ayar ekranları incelendi. Üç görünüm testinden yalnız yukarıdaki 320 px profil taşması kaldı.
- Yaklaşık 15 saniyede 30 kez altın + enerji toplama yükünde oyun sürdü; sayısal durum geçerli kaldı, parçacıklar sonrasında temizlendi. Bu, fiziksel telefon performansı ölçümü değildir.

Testler sessiz headless Chrome ve sahte Firebase ile çalıştırıldı. Canlı Firebase'e test verisi gönderilmedi. Ek test sunucusu efekt durumunu okuyabilmek için yalnız testte kullanılan bir getter ekledi; oyun kaynak dosyasını değiştirmedi.

## Native ve paketleme

- iOS: Xcode 27, Debug, generic iOS Simulator, imzasız build **başarılı**. SceneDelegate dahil kaynaklar derlendi. Oluşan `.app` içindeki oyun kaynakla aynı ve 12 font dosyası mevcut.
- Android: kurulu Java 21 ile `sh ./gradlew --offline --no-daemon --max-workers=2 :app:assembleDebug :app:testDebugUnitTest` **başarılı**. APK içindeki oyun kaynakla aynı ve 12 font dosyası mevcut. Mevcut tek JUnit testi şablon testidir; oyun kapsamını yukarıdaki tarayıcı testleri sağlar.
- İnceleme başlangıcında web/Android/iOS HTML ve config doğrulaması geçti. Ayrıca ses, görsel ve fontların toplam 60 paket kopyası kaynakla birebir eşleşti.
- Fiziksel Android/iOS cihazında oynama, iOS uygulamasını simülatörde başlatma, üretim Firestore kuralları/indexleri ve gerçek kullanıcılar arası bağlantı bu incelemede doğrulanmadı.

## İnceleme sırasında eklenen son çizim optimizasyonu

Tam test ve derlemeler bittikten sonra çalışma ağacındaki `arcrise.html` başka bir işlem tarafından güncellendi: dönüş parçacıklarında daha ucuz çizim ve `shadowBlur` yerine katmanlı çizgiler eklendi.

Bu yeni kaynağın sabit kopyasında yüksek efekt, düşük efekt ve yoğun toplama testleri yeniden çalıştırıldı: **3/3 geçti**. Test edilen kopyanın SHA-256 değeri:

`4cc61b19a3e38c509fa7a862f08db0ba93862da9e6a3539538330b1d76f97639`

Bu son değişiklik için tüm 38 test ve native derlemeler yeniden çalıştırılmadı; değişiklik çizimle sınırlı olduğundan hedefli doğrulama yapıldı. Son paket kontrolünde `www/arcrise.html`, Android ve iOS oyun kopyaları bu yeni kaynakla farklıydı. Son düzenleme tamamlanınca **`npm run sync` ve `npm run verify`** gerekli.

## Yerel kanıtlar

- Bağımsız tekrar: `/tmp/arcrise-review-retry.log`
- Ek testler ve ekran görüntüleri: `/tmp/arcrise-review-3b3568f-isolated/`
- Son optimizasyon: `/tmp/arcrise-review-final-effects.log`, `/tmp/arcrise-review-final-effects/`
- iOS build: `/tmp/arcrise-ios-review-build.log`
- Android build: `/tmp/arcrise-android-review-build-jdk21.log`

İnceleme sırasında oyun kodunu değiştirmedim. Bu rapor dışında oluşturduğum çıktılar test/derleme dosyalarıdır. Çalışma ağacındaki oyun düzenlemesi ve `__fps_old.html` inceleme sırasında başka işlem tarafından oluşturuldu.
