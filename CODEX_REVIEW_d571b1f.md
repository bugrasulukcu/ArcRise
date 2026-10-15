# ArcRise — d571b1f test ve inceleme

Tarih: 14–15 Ekim 2026. İncelenen commit: `d571b1fd1afe82102d8ff0be143e1aee6a9ee721`; karşılaştırma tabanı: `e15dcc9`.

**15 Ekim takip kontrolü:** Aşağıdaki iki bulgu, sonradan yapılan çalışma dosyası düzeltmelerinde giderildi. Tam paket 39/39, ek kontroller 9/9 geçti. [Düzeltme doğrulaması ve yeni performans ölçümleri](CODEX_REVIEW_d571b1f_FOLLOWUP.md). Bu rapor aşağıda ilk incelemenin tarihsel sonuçlarını korur.

**Sonuç:** Depodaki tam uçtan uca paket **38/38 geçti**. Ek hedefli kontroller **4 geçti / 2 kaldı**; başarısız iki kontrol aynı parçacık bütçesi hatasının High ve Low örnekleri. Menü çizim yükü azalmış; buna karşılık yeni modal CSS kuralının oyun sırasında ek stil hesaplama yükü oluşturduğu ayrı A/B ölçümleriyle doğrulandı. İki performans bulgusu aşağıda. Oyun kodu değiştirilmedi.

## Doğrulanan yeni bulgular

### [P2] Menü animasyonlarını durduran genel `html:has(...)` kuralı oyun sırasında da stil maliyetini artırıyor

Konum: `arcrise.html:3657–3658`.

Modal açıkken menü animasyonlarını durdurmak için belge köküne bağlanan `html:has([id$="-modal"].open)` eklendi. Yoğun toplama testinde modal kapalı ve oyun sahnesi aktifken bile stil hesaplama maliyeti arttı. Son commitin test kopyasından **yalnız bu CSS kuralını çıkararak**, diğer optimizasyonları koruyan A/B deneyi yapıldı. Depodaki dosya değiştirilmedi.

| Sıralı koşu, 15 saniye / CPU ×4 | Stil hesaplama toplamı | Ana iş parçacığı TaskDuration | Ortalama FPS |
|---|---:|---:|---:|
| Son commit, kural mevcut, tekrar 1 | 2,5495 s | 12,2062 s | 58,3 |
| Son commit, yalnız kural çıkarıldı, tekrar 1 | 1,2602 s | 10,7511 s | 58,9 |
| Son commit, yalnız kural çıkarıldı, tekrar 2 | 1,1346 s | 10,1408 s | 59,2 |
| Son commit, kural mevcut, tekrar 2 | 2,2857 s | 11,7066 s | 58,0 |
| Önceki commit, referans | 1,3274 s | 11,9836 s | 56,6 |

Kural çıkarıldığında iki koşunun ortalama stil maliyeti **2,418 s → 1,197 s (%50,5 azalma)**, toplam TaskDuration **11,956 s → 10,446 s (%12,6 azalma)** oldu. FPS bu ikinci ölçüm grubunda zaten 60 sınırına yakındı; bu oranlar FPS artışı değildir. İlk ölçüm grubundaki son commit stres sonuçları 40,9–48,9 FPS, önceki commit 49,2–50,3 FPS idi. Gruplar arasında mutlak FPS değişken olduğundan cihazlar için sabit bir FPS kaybı iddia edilmiyor. Tekrarlanan A/B ölçümünde belirgin olan sonuç ek stil maliyeti.

**Olası mekanizma:** Oyun sırasında güncellenen HUD/efekt DOM'u, belge köküne bağlı geniş `:has()` kontrolünün yeniden değerlendirilmesini tetikliyor. Bu mekanizma çıkarımdır; kuralın maliyet etkisi yukarıdaki deneyle ölçüldü. Geniş köklü `:has()` seçicilerinin DOM değişikliklerindeki maliyeti [MDN performans açıklamasıyla](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has#performance_considerations) da uyumlu.

**Düzeltme yönü:** Modal açma/kapatma akışında açık modal durumunu bir CSS sınıfıyla tutup animasyon durdurmayı bu sınıfa bağlamak; birden fazla modal açıksa sonuncu kapanana kadar durumu korumak. Böylece animasyon durdurma kazanımı korunur ve oyun DOM değişikliklerinde kökten ilişki sorgusu gerekmez.

### [P2] Dönüş parçacığı bütçesi dolunca da en az 8 yeni parçacık ekleniyor

Konum: `arcrise.html:8692–8694`, `homeRoom`.

```js
return Math.max(Math.min(8, want), Math.min(want, HOME_MAX() - n));
```

Dıştaki `Math.max` kalan bütçe sıfır veya negatif olduğunda da 8 döndürüyor. Bu nedenle 56/30 değeri gerçek bir üst sınır oluşturmuyor; daha fazla aynı anda toplama, her yeni patlamada sınırı yeniden aşabiliyor.

**Yeniden üretim:** Temiz profilde Coin Pull tak, oyunu başlat; topun 50 dünya pikseli önüne iki yeşil ve bir altın koy; Coin Pull'u tetikle ve bir simülasyon adımı işlet. Ek test, nesneleri yalnız yerleştirmek/gözlemlemek için test kopyasına yardımcı erişim ekliyor; gerçek `triggerAbility`, Coin Pull etkisi, toplama döngüleri ve parçacık oluşturma fonksiyonları kullanılıyor.

| Grafik modu | HOME_MAX | Aynı adım sonundaki p.home sayısı |
|---|---:|---:|
| High | 56 | 64 |
| Low | 30 | 38 |

**Etki:** Özellikle Coin Pull veya birbirine yakın toplamalarda hedeflenen tepe çizim yükü aşılıyor. 2,2 saniye sonra dönüş parçacıkları sıfıra indi; bu test bir kalıcı bellek sızıntısı göstermedi. Low'daki genel 40 parçacık temizliği de ayrı bir mekanizma ve 30 dönüş parçacığı hedefini sağlamıyor.

**Düzeltme yönü:** Bütçe dolunca yeni sayı sıfıra kadar düşebilmeli; her toplamada en az 8 parçacık zorunluysa aynı bütçe içinde eski parçacıkların yerini almalı. Görsel tercih korunarak gerçek toplam sınır uygulanmalı.

## Geçen kontroller

- `npm test`: **38 geçti, 0 kaldı**; bağımsız tekrar gerektiren paket hatası olmadı.
- Daily: eşya tüketilmiyor; yetenek slotları gizli, programatik tetikleme cooldown başlatmıyor. Daily'den ana menüye, ardından normal oyuna geçince CSS sınıfı kalkıyor; slot görünüyor ve Shock cooldown başlıyor.
- PB hayaleti: hem normal hem Extreme eski kayıtları açılışta siliniyor. Ayar satırı ve yeni kayıt üretimi mevcut pakette doğrulanıyor.
- PB mesafe bonusu korunmuş: çizgi geçişinde 25 puan, sonraki adımda hâlâ 25; ikinci kez verilmedi.
- Altın vinyet sprite'ı ekran değişiminde yeniden üretiliyor: 600×1298 için 150×325, 600×1077 için 150×270.
- Menü: START halkası, avatar halkası ve Extreme kenarının CSS animasyonları Quests açıkken `paused`, kapatılınca `running`.
- `node verify-sync.js`: web, Android, iOS HTML ve Capacitor config kopyaları aynı.
- `git show --format= --check HEAD`: geçti.

## Görsel kontrol

390×844 varsayılan ve Game Boy menülerinde yeni START çerçevesi görsel olarak doğrulandı. 320×568 varsayılan menü de görüntülendi. Daha önce raporlanan dar ekran profil SCORE/DIST taşması hâlâ var: UPG sütunu metnin üstüne geliyor. Bu commitin yeni regresyonu olarak sayılmadı.

Ekran görüntüleri: `/tmp/arcrise-review-d571b1f/home-390-default.png`, `home-390-gameboy.png`, `home-320-default.png`.

## Ölçüm yöntemi ve sınırlar

İlk karşılaştırmada menü kazanımları:

| Senaryo, 3 saniye / CPU ×4 | Önceki commit Paint | Son commit Paint | Önceki → son stil hesaplama |
|---|---:|---:|---:|
| Ana menü | 394,08 ms | 0 ms | 656,4 → 198,6 ms |
| Quests modalı açık | 372,35 ms | 216,60 ms | 489,2 → 155,3 ms |

Normal oyun koşusunda önceki commit 59,2 FPS, son commit 59,9 FPS ölçüldü. Menü optimizasyonu ölçülebilir kazanım sağlıyor; yoğun toplama sırasındaki ek CSS yükü ayrıca ele alınmalı.

Performans karşılaştırması, işlevsel testler bittikten sonra sırayla çalıştırıldı. Ayrı geçici Chrome profilleri, 390×844 CSS piksel/DPR 3, CPU ×4, High grafik modu kullanıldı. Oyun koşuları 15 saniye; yoğun toplama koşulu her 700 ms'de bir yeşil ve bir altını oyuncuya yerleştiriyor. Bot/Ghost açık, kayıtlar yeni profil. Bu stres üst sınır denemesidir; ortalama oyuncunun koşusu değildir. Rastgele tohum aynı olsa da farklı kare zamanları birebir aynı oynanışı garanti etmez.

Menü koşuları 3 saniyedir. Paint, Chrome zaman çizelgesindeki `Paint` olaylarının toplamı; tüm GPU maliyetini temsil etmez. FPS gerçek rAF farkından hesaplanır.

Firebase/Auth trafiği test paketinde sahte sunucuya yönlendirildi; performans koşularında engellendi. Üretime test verisi yazılmadı. Fiziksel Nothing Phone 1, Safari veya Android WebView'da test yapılmadı. Native kaynak değişmediğinden Android/iOS derlemesi yeniden yapılmadı; paket kaynak eşitliği doğrulandı.

## Kanıt ve tekrar üretim

- `/tmp/arcrise-review-d571b1f/e2e.log` — 38/38 tam paket sonucu.
- `/tmp/arcrise-review-d571b1f/extra.mjs`, `inject.js`, `extra.log`, `extra-results.json` — ek kontroller ve parçacık bütçesi yeniden üretimi.
- `/tmp/arcrise-review-d571b1f/bench.mjs`, `perf.mjs`, `perf.jsonl` — önceki/son commit ölçümleri.
- `/tmp/arcrise-review-d571b1f/has-recheck.mjs`, `has-recheck.jsonl`, `has-recheck.log` — yalnız modal CSS kuralını çıkaran sıralı A/B tekrarları.
- Oyun kaynağı SHA-256: `d9c17bd0250dc656ca1f753351584838fc0185be9c31ec1f8e5b604da7bb1ac8`.

Ek kontrolün ilk taslağında PB konumu yalnız `player.y` ile değiştirildi; `step` konumu yay merkezinden yeniden hesapladığı için test çizgiyi geçmedi. Test düzeneği yay merkeziyle tutarlı konuma getirildi ve gerçek 25 puan/tek sefer sonucu alındı. İlk Game Boy görüntü kurulumunda sahiplik listesi yoktu; geçerli tema sahipliğiyle tekrarlandı. Bunlar oyun hatası olarak raporlanmadı.
