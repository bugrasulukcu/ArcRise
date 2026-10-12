# ArcRise — v25 sonrası inceleme sonuçları

Tarih: 12 Ekim 2026. İncelenen HEAD: `0a9e2f5`; oyun kodu kapsamı: `61b5f7d..90ce218`, öncelikle `arcrise.html` ve `firestore.rules`. `CODEX_REVIEW_v25.md` okundu. Oyun kodu, kurallar ve denge değerleri değiştirilmedi.

**Sonuç: Tarayıcıda yeniden üretilmiş 5 hata var.** Bunlara ek olarak aşağıda çalışma zamanı doğrulaması yapılmamış kod bulguları ve Firestore değerlendirmesi bulunuyor. P1: rekabetin temel koşullarını bozan, öncelikli hata. P2: normal öncelikli işlev hatası.

## Yeniden üretilen hatalar

### 1. [P1] Eşyasız günlük koşuda Revive kullanılabiliyor

**Konum:** `offerRevive`, `doRevive`, `endGame`, `arcrise.html:10310–10342`; başlangıçtaki eşya engeli `consumeArmedConsumables`, `14305`.

`consumeArmedConsumables()` günlük koşu ve meydan okumada erken dönüyor. Ancak ölümden sonra ayrı çalışan `offerRevive()` yalnız bilet sayısını kontrol ediyor; `_seeded()` kontrolü yok. `doRevive()` bileti tüketip oyunu devam ettiriyor.

**Tekrar üretme:** Temiz test profilinde `arc_upg_v1 = {"comboSplitV22":true,"inv":{"revive":{"count":1}}}`. Günlük koşuyu başlat, çarpıp öl, açılan REVIVE penceresinde Use Ticket seç.

**Gözlenen:** `{daily:true,count:1}` → `{daily:true,count:0,scene:"play"}`. Günlük koşu devam ediyor ve bilet harcanıyor.

**Beklenen:** Günlük koşuda Revive önerilmemesi ve biletin korunması. Aynı ortak ölüm yolu meydan okumada da kullanılıyor; meydan okuma varyantı ayrıca çalıştırılmadı. Bu, yalnız görsel bir uyarı hatası değil; eşyası olan oyuncuya ikinci hayat veriyor.

### 2. [P1] Gold Rush önceki koşudan günlük parkura sızıyor

**Konum:** `startGame`, `arcrise.html:14276–14278`; `resetGame → spawnAhead`, `9336`; `spawnAhead`, `9368`; `consumeArmedConsumables`, `14297–14305`.

`resetGame()` ilk parkur tamponunu üretirken önceki koşunun `runCoinRainActive` değeri hâlâ etkin. Bayrak ancak daha sonra çağrılan `consumeArmedConsumables()` içinde temizleniyor. Dolayısıyla tohum aynı olsa bile ilk üretimde farklı olasılıklar ve farklı sayıda RNG çağrısı kullanılıyor; değişiklik sonraki parkura da yayılıyor.

**Tekrar üretme:** `arc_upg_v1 = {"comboSplitV22":true,"inv":{"coinrain":{"count":1,"armed":true}}}` ile normal koşu başlat. Bu koşudan menüye dönüp günlük koşuyu aç. İlk `ARC_TEST.layoutSig(12)` sonucunu, aynı gün temiz profille doğrudan başlatılan günlük koşuyla karşılaştır.

**Gözlenen örnek:**

```text
Gold Rush sonrasında: o:380:1066,b:373:1503,b:189:1990,g:429:2122
Temiz başlangıç:       o:380:1066,o:509:1503,b:189:1999
```

**Beklenen:** Aynı günlük tohum için aynı başlangıç nesneleri. Etki, önceki koşudaki eşyanın tüketilmiş olmasına rağmen sürüyor. Meydan okumalar da aynı başlangıç sırasını kullanıyor.

### 3. [P1] Sayfayı koşu ortasında yenilemek meydan okuma hakkını koruyor

**Konum:** `startChalRun`, `arcrise.html:15428`; hak düşümü `_proceedEndGame`, `10639–10643`; `saveChalProg`, `15446`.

Hak yalnız koşu sona erdiğinde kalıcı kayda yazılıyor. Başlangıç çizgisini geçmek veya koşuya girmek herhangi bir devam eden deneme kaydı oluşturmuyor.

**Tekrar üretme:** Alıcı için açık bir challenge ve `arc_chal_prog = {"HOST#1234__ARC#5678__123456":{"tries":2,"best":1}}` hazırla. Üçüncü denemeyi başlat, başlangıç çizgisini geç, ölmeden sayfayı yenile. Aynı challenge'ı tekrar aç.

**Gözlenen:** Yenileme öncesinde çizgi geçilmiş olmasına rağmen kalıcı kayıt hâlâ `tries:2,best:1`; yeniden açılan koşu yine üçüncü deneme. Gerçek sayfa yenilemesiyle doğrulandı. Bu döngü kötü giden denemeleri ücretsiz iptal etmeye izin veriyor.

**Beklenen:** Başlangıç çizgisini geçen yarıda bırakılmış denemenin hakkı tüketmesi. Oyun sonu ekranına ulaşmış bir denemede kayıt, ilk ağ `await`inden önce yapılıyor; doğrulanan açık özellikle koşu sırasında yenileme. İkinci cihazda hakların sıfırdan başlaması da yalnız yerel ilerleme tutulmasının koddan görülen ek sonucu; çok cihazlı test yapılmadı.

### 4. [P2] Kendi skor kaydı, hemen alttaki oyuncuyu sorgudan düşürüyor

**Konum:** `_scoreRange`, `arcrise.html:5521–5528`; `getScoresBelow`, `5536`; `loadLbData`, `11517`.

Firestore önce `limit:1` uygular. İstemci, gelen tek kayıt kendi `uid_normal` kaydıysa onu sonradan eler. Daha düşük puanlı oyuncu bulunmasına rağmen sonuç boş kalır. Mevcut sıralama testi kullanıcının bulut skor kaydını oluşturmadığı için bu durumu yakalamıyor.

**Tekrar üretme:** Sahte Firestore'a `scores/{uid}_normal` için 500 puan, `scores/OTHER_normal` için 499 puan yaz. Çağır:

```js
await ARC_DB.getScoresBelow('normal', 500, 1); // []
await ARC_DB.getScoresBelow('normal', 500, 2); // [{ name: 'OTHER', score: 499, ... }]
```

**Beklenen:** İlk çağrının OTHER oyuncusunu döndürmesi. Kullanıcı ilk 30 dışındayken High Scores penceresindeki alt komşu satırı kaybolur. Üst komşu sorgusunda da kendi kişisel rekoru bu koşunun skorundan yüksekse aynı filtre/limit sırası risk oluşturuyor; o varyant ayrıca çalıştırılmadı.

### 5. [P2] Wife modunda sandık açılıyor; yeniden açılışta coin veriliyor

**Konum:** `spawnAhead`, `arcrise.html:9399`; sandık toplama, `9870–9875`; Wife kazanç engeli, `10371`; bekleyen sandık kurtarma, `14897`.

Sandık üretimi yalnız `_seeded()` ile engelleniyor; Wife modu buna dahil değil. Toplama, kalıcı açılmış sandık kaydını ve `arc_chest_pending` değerini yazıyor. Açılıştaki kurtarma yolu moddan bağımsız `grantCoins()` çağırıyor.

**Tekrar üretme:** `arc_mode = 'wife'` olan temiz profilde koşu başlat. Testi hızlandırmak için `ARC_TEST.spawnFeatHere('chest')` ile normal toplama yolunu tetikle. Sandık toplandıktan sonra sayfayı yenile.

**Gözlenen:** Önce `mode:"wife", opened:[250], pending:"25", earned:1`; yeniden açılınca `opened:[250], earned:26`, pending kaldırılmış. Wife modunda 25 coin kazanılmış oluyor.

**Beklenen:** Coin ve kalıcı ödül vermeyen Wife koşusunun sandık hakkını tüketmemesi veya kurtarma yoluyla coin üretmemesi. Üretim kontrolünün Wife modunu dışlamadığı kodda görüldü; uzun koşuyla doğal 2,5 m sandığına gitmek yerine debug nesne yerleştirmesi kullanıldı.

## Koddan görülen, ayrıca çalışma zamanı doğrulaması yapılmayan noktalar

- **[P2] Tohumlu parkurda hareket hâlâ rastgele:** `step`, `arcrise.html:9835`, `rand` türü engelin yönünü ve sonraki yön değiştirme süresini `Math.random()` ile yeniliyor. Yaklaşık 4,5 m sonrasında üretilen bu engellerde aynı tohum ve aynı hareket geçmişi aynı hareketi garanti etmiyor. `activateBooster('mystery')` (`7006`) ve kristal CLOSE ödülü (`10008`) de tohumlanmamış. İlk birkaç statik nesneyi karşılaştıran mevcut test bu davranışları kapsamıyor. Engel hareketi için nesneye bağlı deterministik RNG gerekir; ortak parkur RNG'sini kare sayısına bağlı tüketmek de parkuru bozabilir.
- **Skor belgesiyle uygulama arasında fark:** `gainScore()` (`7241`) yalnız combo uygular. Kapı, THREAD, kristal, CLOSE, koridor ve TIMING çağrılarında süre çarpanı yok; PB çizgisinde booster da yok (`9707`). `DEVELOPMENT_LOG.md:569` bu nesneler için süre × combo × booster diyor. Mevcut combo testi kapıda combo ×3 ile 30 puanı özellikle bekliyor (`tests/e2e.mjs:469–471`); dolayısıyla otomatik olarak denge hatası ilan etmiyorum. Tasarım niyeti netleştirilmeli. Mesafenin yalnız combo × booster kullanması devlog ile uyumlu.
- **Özetin iki iddiası mevcut kodla uyuşmuyor:** Challenge modu gönderenin Extreme seçimini koruyabiliyor (`challengeFriend`, `15398`; `startChalRun`, `15432`); her challenge Normal değil. Ayrıca günlük/challenge koşu gelirleri `_proceedEndGame` içinde soft cap'e tabi (`10371–10385`); özetin “seeded koşularda soft cap kapalı” ifadesi uygulanmıyor. Tasarım kararı gerektiren belge/kod farkları olarak bırakıldı.
- **Challenge gönderim hatasının yeniden denemesi yok:** `finishChallenge` (`15451–15461`) aktif challenge'ı kaldırıp `done=true` yapıyor; gönderim başarısız olursa yalnız mesaj gösteriyor. En iyi skor/seed kalıcı gönderim kuyruğuna alınmıyor. Çevrimdışı challenge gönderme senaryosu ayrıca test edilmedi.

## Firestore kuralları — statik değerlendirme

Bu bölümdeki sonuçlar gerçek Rules Emulator üzerinde doğrulanmadı. Mevcut sahte Firebase `firestore.rules` dosyasını okumuyor; esas olarak Authorization başlığını ve create-only çakışmasını denetliyor. Bu nedenle uygulama E2E başarısı, kuralların güvenli olduğuna dair kanıt sayılmamalı.

### [P2] Sonuç puanı ile won/lost tutarlılığı kontrol edilmiyor

**Konum:** `firestore.rules:193–199`, challenge update.

Alıcı uid'si, açık bir challenge için yalnız `status,result,rts` değiştirerek `target:100` karşısında `result:0,status:"won"` gönderebilir. Yazılı koşullar bunun tutarsızlığını reddetmiyor. Beklenen, beraberlik gönderen lehine olduğundan `won` için `result > target`, `lost` için `result <= target` olması.

Gerçek puanın istemci tarafından bildirildiği bilinen sınır bundan ayrıdır: kurallar, bildirilen puanın kendi içinde bile kazanma durumuyla uyuşmasını sağlamıyor. Oynamadan sonuç göndermek de mümkün; deneme sayısını veya tamamlanmış koşuyu doğrulayan sunucu kaydı yok.

### via alanı güvenilir bir link-açma kanıtı değil

**Konum:** `firestore.rules:139–141`; istemcide `loadSocial`, `arcrise.html:15326–15335`.

`via` için yalnız altı karakter format kontrolü var. Bir oyuncunun paylaşılmış kodunu bilen başka hesap, linki hiç açmadan kendi profilinden o oyuncuya `via:KOD` içeren istek gönderebilir. Alıcının uygulaması bunu normal yenilemede otomatik kabul eder. Bu akış, paylaşılmış davet kodunu bilen kişiye arkadaşlık yetkisi veren bir tasarım olarak görülmeli; doğrulanmış link ziyareti veya alıcı onayı sağlamıyor. Kod bilinmeden rastgele bir kişiyi zorla arkadaş yapabildiğim doğrulanmadı. Canlıya istek gönderilmedi.

Diğer kontroller: Challenge create, `areFriends(from,to)` ile kabul edilmiş kenar arıyor; `from` sahipliği ve gerçek `toUid` kontrol ediliyor. Challenge update yalnız alıcı uid'sine, yalnız açık kayda ve yalnız üç sonuç alanına izin veriyor. Bunlarda yeni bir yetki atlama doğrulanmadı. Eski friendreq update kuralının alan değişikliklerini `status` ile sınırlamaması ise v25 öncesinden mevcut; yeni regresyon olarak sayılmadı.

## Testler ve inceleme sınırları

| Kontrol | Sonuç |
|---|---|
| `E2E_PART=1/2 npm test` | 18/18 geçti |
| `E2E_PART=2/2 npm test` | 16/17 geçti |
| Başarısız arkadaşlık testini tek başına tekrar | 1/1 geçti |
| Ek hata yeniden üretmeleri | Yukarıdaki 5 hata ayrı testlerle doğrulandı |
| `npm run verify` | Başarısız: `www/arcrise.html` ve Android asset kopyası kaynakla farklı |

Arkadaşlık testinin ilk başarısızlığında game-over verisi `{"again":"TRY 2/3","strip":true,"best":0}` idi; test `best > 0` bekliyordu. Tek başına tekrar geçti. Seed/zamanlama ve botun belirli sürede pozitif skor alacağı varsayımı nedeniyle kararsızlık olasılığı var; kesin kök neden belirlenmedi. “35/35 ilk seferde temiz geçti” sonucu çıkarılmamalı.

Ek testler `/tmp/arcrise-review-e2e.mjs` içinde mevcut E2E altyapısından türetildi; oyun kaynakları değiştirilmedi. Google API çağrıları CDP ile sahte yanıtlara yönlendirildi. Üretim Firebase'e oyun verisi gönderilmedi; seed aracı, Firebase CLI, deploy ve push çalıştırılmadı.

Sahte sorgu motoru günlük alt koleksiyonun ebeveyn yolunu da doğru modellemiyor (`tests/e2e.mjs:94–95` yalnız ilk koleksiyon segmentine bakıyor). Bu yüzden günlük tablonun gerçek sunucu sorgusu ve güvenlik kuralları için mevcut test kapsamı yetersiz.

## Özette sorulan diğer kontroller

- **Cache-bust:** `index.html:16` JavaScript yönlendirmesi `v=Date.now()` kullanıyor. Bu giriş yolunda sabit meta-refresh sürümü tek başına eski oyun sürümünde kalındığını kanıtlamıyor. Sabit `?v=20261001e` JS çalışmadığında kullanılan meta-refresh yolunda. Doğrudan `arcrise.html` açılışının cache davranışı sunucu başlıklarına bağlı; canlı hosting kontrol edilmedi.
- **Eksik composite index:** `_scoreRange` hata halinde `null`, `countAbove` hata halinde `null` döndürüyor. High Scores eski top-N görünümüne düşer; game-over tarafı kullanıcıyı top-20 sonuna ekleyip örneğin #21 gösterebilir. Panelin boşalması zorunlu değil ama gerçek sıra iddiası o durumda kaybolur. Indexlerin canlıya deploy edilip edilmediği doğrulanmadı.
- **Coin hesabı:** İncelenen normal run-end yolunda pozitif/sonlu girdiler ve tam sayı sandık ödülleri için `floor(total)` ile carry ayrımı doğru; sandık günlük deftere eklenmiyor. Temel ekonomi, sandık tek-sefer ve carry testleri geçti. Ad-continue senaryosu çalıştırılmadı (`ADS_ENABLED=false`).
- **Clamp ve eski yükseltmeler:** `clampCoreLevels` ve `clampAbilityLadders` hâlâ var; yeni Coin Pull/Shockwave radius seviyeleri aynı ability ladder'dan sınırlandırılıyor. `slotUpgOf` her okumada 0–3 clamp yapıyor. Normal kayıt şekilleri için sınır aşımı saptanmadı; keyfi bozuk JSON şekillerinin tamamı fuzz edilmedi.
- **Mod dönüşü, tema, sosyal cache:** Günlük koşudan menüye dönüş, tema denemesi ve ilgili mevcut testler geçti. `getMySocial` hatasında `null` ve çağırandaki Array kontrolü, mevcut cache'i koruyor. Oyun içindeki eski sağ isim listesi kaldırılmış; test de geçti. 320 px ekran için görsel denetim yapılmadı.
- **Paketleme:** Kaynak ve üretilmiş kopyalar farklı. Yeni Android build alınmadan önce sync gerekir; inceleme kapsamında kopyalar yenilenmedi.

Öncelik sırası: seeded koşularda Revive engeli → tüketilebilir bayraklarını ilk spawn öncesinde sıfırlama → kesilen challenge haklarını kalıcılaştırma → komşu sorgusunun limit/eleme sırası → Wife sandık akışı. Denge değerlerini değiştirmeden ele alınabilecek hatalar bunlar.
