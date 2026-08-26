# Güvenlik geçişi — 2026-07-02

## Yapılan kod değişiklikleri

- **firestore.rules**: `name`/`tag` artık regex'le kısıtlı (`^[A-Z0-9]{1,16}$` / `^[0-9]{4}$`) → XSS/isim spoof sunucuda engellenir. `tracePts` limiti 200KB → **20KB** (maliyet istismarı). `traceColor` ≤64, `traceThickness` 0-20, `badges` charset'li. `friendreqs` create: alan listesi sabit (`keys().hasOnly`), doc id `from__to` formatı doğrulanır, tüm alanlar validasyonlu.
- **arcrise.html**: `esc()` helper eklendi; Firestore'dan gelen tüm isim/tag'ler innerHTML'e escape'lenerek giriyor (leaderboard, game-over listesi, arkadaş listesi, davetler). `playerName` localStorage'dan yüklenirken charset filtresi. `tracePts` 19KB client guard. **App Check** altyapısı hazır: `FIREBASE_CONFIG`'e `appId` + `appCheckSiteKey` girilince otomatik devreye girer (`X-Firebase-AppCheck` header).
- **capacitor.config.json**: `allowMixedContent: true` kaldırıldı (her şey HTTPS).
- **sync-www.js + `npm run sync`**: root → www kopyalama + `cap sync` tek komut (drift önlenir).

## Senin yapman gerekenler (Console — kod değil)

1. **Rules deploy**: Firebase Console > Firestore > Rules → yeni `firestore.rules` içeriğini yapıştır > Publish. *(Kod değişiklikleri rules deploy edilmeden tam koruma sağlamaz.)*
2. **App Check** (skor sahteciliğinin asıl çözümü):
   - Project Settings > General → Web app yoksa ekle, `appId`'yi `arcrise.html`'deki `FIREBASE_CONFIG`'e yaz.
   - App Check > Apps → web app'i reCAPTCHA v3 ile kaydet, site key'i `appCheckSiteKey`'e yaz.
   - App Check > APIs > Cloud Firestore → önce **Monitor**, istekler "verified" akınca **Enforce**.
   - Android'de daha güçlüsü: Play Integrity (`@capacitor-firebase/app-check` plugin'i gerekir).
3. **API key kısıtı**: console.cloud.google.com > Credentials > API key → HTTP referrer (`bugrasulukcu.github.io/*`) + Android app kısıtlaması ekle.
4. **keystore/keystore_credentials.txt**: parola yöneticisine taşı, klasörden sil (git'te yok ama diskte düz metin).

## 2. tur (2026-07-02, aynı gün) — YENİDEN RULES PUBLISH GEREKİR

- **Sahipsiz-doc sahiplenme penceresi kapatıldı**: canlı veri doğrulandı (scores 12/12, players 21/21 owner'lı), `ownsOld()` artık yalnızca gerçek sahibi kabul ediyor.
- **friendreqs sosyal graf gizliliği**: doc'lara `toUid` eklendi (players/{to}.owner'dan, rules `get()` ile doğruluyor — spoof edilemez). Read artık yalnızca taraflara açık; client sorguları `fromUid`/`toUid` üzerinden.
  - NOT: `toUid`'siz ESKİ friendreq doc'ları artık okunamaz → eski bekleyen davetler görünmez, eski arkadaşlıklar localStorage'da durur ama yeni cihaza taşınmaz. Market öncesi kabul edilen kısıt; gerekirse arkadaşlar yeniden eklenir.
- Deploy: Console > Firestore > Rules → güncel `firestore.rules`'ı tekrar yapıştır > Publish. Sonra oyunda arkadaş ekleme/kabul akışını bir kez test et.

## 3. tur (2026-07-02) — YENİDEN RULES PUBLISH GEREKİR

- **Referral sayacı üst sınırı**: clicks 100.000'de durur (spam/doc şişmesi engeli). → rules'ı tekrar Publish et.
- **CSP başlığı** (`arcrise.html` head): enjekte kod dış script yükleyemez / dış sunucuya veri sızdıramaz. İzinli kaynaklar: Google Fonts, Firestore/Auth/App Check, reCAPTCHA. **Yeni bir dış servis eklersen CSP'ye de eklemeyi unutma** — yoksa sessizce engellenir. Deploy sonrası oyunu baştan sona bir test et (ses, font, skor gönderimi, arkadaşlar, avatar upload).
- **Hesap kurtarma kodu** (Settings > BACKUP CODE / RESTORE): kod = oturum anahtarının base64'ü; yeni cihazda RESTORE ile girilince aynı hesap (uid + NAME#TAG + skorlar + arkadaşlar) geri gelir. Coin/upgrade'ler client-side olduğundan geri GELMEZ (bilinen kısıt). Kod hesabın tam anahtarıdır — kullanıcı uyarısı UI'da var.

## Bilinçli bırakılanlar

- Coin bakiyesi client-side (bilinen kısıt, rules yorumlarında belgeli).
- Referral sayacında rate limit yok (coin client-side olduğundan pratik değeri düşük).
- Anonim auth → cihaz/veri silme = hesap kaybı. Market sonrası Google Play Games / account linking düşünülebilir.
- App Check + API key kısıtı + keystore taşıma → market publish'te (yukarıdaki liste).

## 4. tur (2026-08-26) — Claude ile denetim

### KRİTİK: APK'ya paketlenen web kopyası 8 hafta eskiydi

`android/app/src/main/assets/public/arcrise.html` 1 Tem tarihliydi; içinde **ne `esc()`, ne CSP, ne `toUid`** vardı — yani 2026-07-02 güvenlik geçişinin hiçbiri Android build'inde yoktu. `android/app/src/main/assets/capacitor.config.json` de hâlâ `allowMixedContent: true` içeriyordu (root'tan kaldırılmıştı ama Capacitor runtime'da **assets'teki** config'i okur, dolayısıyla ayar hiç yürürlükten kalkmamıştı).

**Neden fark edilmedi:** `www/` ve `android/app/src/main/assets/public/` `.gitignore`'da → aralarındaki drift git'te görünmüyor.

- Düzeltildi: her iki kopya root ile birebir eşitlendi (md5 doğrulandı).
- **`verify-sync.js` eklendi** + `npm run verify`. `npm run sync` artık sonunda otomatik doğruluyor. **Build öncesi `npm run verify` çalıştır** — fark varsa 1 ile çıkar.

### Kod düzeltmeleri (arcrise.html)

- `appId` dolduruldu (`1:66023331166:web:...`). App Check için geriye sadece `appCheckSiteKey` kaldı.
- **localStorage → CSS/HTML enjeksiyonu kapatıldı.** `upg.customGrad` ve `upg.traceColor` doğrudan `style="background:${...}"` içine giriyordu; `arc_upg` kurcalanırsa attribute kırılıp (CSP'de `unsafe-inline` var) JS çalıştırılabilirdi → `arc_fb_rt` okunur, hesap devralınır. `loadUpg()` içinde tek noktadan beyaz listeye bağlandı (`SAFE_CSS_VALUE` / `SAFE_TRACE_ID`). Not: `SAFE_TRACE_ID` charset'inde `:` var — `rb:warm` gibi meşru id'ler elenmesin diye.
- **Custom avatar doğrulaması**: `arc_avatar_custom` `<img src="${...}">` içine ham giriyordu; artık yalnızca gerçek `data:image/...;base64,...` kabul ediliyor.
- `traceColorCss(id)` tip guard'ı: bozuk localStorage'da `id.charAt` TypeError atıp upgrade ekranını çökertiyordu.
- `esc()` eklenen noktalar: quest label (`arc_quests_v1`'den geliyor), friendreq `data-acc`/`data-rej`, arkadaş `data-id` (×2).

### AndroidManifest

- `android:allowBackup` **true → false**. Hesabın tam anahtarı (Firebase refresh token `arc_fb_rt`) WebView localStorage'ında; `true` iken Android Auto Backup bunu kullanıcının Drive yedeğine ve cihaz-cihaz transferine dahil ediyordu. Anonim refresh token'ın süresi dolmaz ve iptal edilemez → sızarsa kalıcı erişim.

### Cloud Console (yapıldı)

- Android API anahtarı: 25 API → **5** (Firestore, Identity Toolkit, Token Service, Installations, App Check).
- Web (Browser) API anahtarı: 25 API → **4** (Firestore, Identity Toolkit, Token Service, App Check). Liste `arcrise.html:52`'deki CSP `connect-src` ile birebir aynı.
- GitHub secret scanning alert'leri (#1, #2) `wont_fix` + açıklama ile kapatıldı; `android/app/google-services.json` git takibinden çıkarıldı.
- Doğrulandı: canlı Firestore kuralları `firestore.rules` ile **birebir aynı** (3 turun tamamı publish edilmiş).
- Doğrulandı: projede **billing account yok** (Spark). Yani anahtar kötüye kullanımı fatura riski değil, ücretsiz kota riski. Blaze'e geçilirse ilk iş bütçe uyarısı kurmak.

### Açık kalanlar

1. ~~**App Check**~~ — **KURULDU** (2026-08-26): reCAPTCHA v3 sitesi oluşturuldu (domainler: `bugrasulukcu.github.io`, `localhost` — Capacitor `androidScheme: https` olduğu için WebView origin'i `https://localhost`), secret Firebase'e girildi, App Check > Apps'te **Registered** görünüyor, site key `FIREBASE_CONFIG.appCheckSiteKey`'e yazıldı. App Check > APIs > Cloud Firestore şu an **Unenforced** = monitor modu. **KALAN ADIM:** push + yeni sürüm sahaya çıktıktan birkaç gün sonra metrics'te istekler "verified" akmaya başlayınca **Enforce** et. (Enforce edilmeden sahte REST istekleri ENGELLENMEZ.)
2. **Application restriction** her iki anahtarda da hâlâ `None` (Android için SHA-1 gerekir; web'e referrer kısıtı Capacitor WebView'ı kırar → App Check doğru çözüm).
3. **Otopilot production'da açık**: `?bot=1` / `ARC_BOT.toggle()` tam otomatik oynuyor ve skorları normal `submitScore` yolundan public leaderboard'a yazıyor. App Check bunu durdurmaz (istek meşru istemciden gelir). Release build'de derleme dışı bırakılmalı.
4. `keystore/keystore_credentials.txt` diskte düz metin (git'te değil) — parola yöneticisine taşınmalı.
5. `scores`/`players` public okunabilir ve `owner` (uid) alanı taşıyor → NAME#TAG ↔ uid eşlemesi toplanabilir. Doğrudan istismarı yok; kabul edilebilir.

## Market öncesi açık liste (2026-08-26 denetimi — henüz YAPILMADI)

Öncelik sırasıyla. Hepsi doğrulandı, tahmin değil.

### 1. Firestore okuma maliyeti — launch riski + DoS vektörü

`getTopScores` mode filtresini client'ta yapıyor (composite index yok; `firestore.indexes.json` dosyası bile yok), telafi için `n*6+30` (üst sınır 250) doküman çekiyor. `arcrise.html:8423` her skor gönderiminde cache'i temizliyor → neredeyse her run yeni tam sorgu. Leaderboard için ~150, ghost listesi için ~250 okuma.

Spark limiti **50.000 okuma/gün**. Birkaç düzine aktif oyuncu günü doldurur; kota bitince Firestore 429 döner, leaderboard **herkes için** gün sonuna kadar ölür. Aynı yolla kasıtlı kota yakma da mümkün — App Check bunu durdurmaz (istek meşru istemciden, geçerli token'la geliyor).

**Yapılacak:** `(mode ASC, score DESC)` composite index + sorguya `where mode == X` → 250 yerine ~20 okuma. Ayrıca her run'da tüm cache'i temizlemek yerine yalnızca kendi satırını yerelde güncelle. İkisi birlikte ~10× düşürür.

### 2. UGC moderasyonu yok — Play reddi riski

Public leaderboard'da serbest kullanıcı adları + yabancılardan arkadaşlık isteği = user-generated content. Kodda `report`/`block`/`mute` yok. Play'in UGC politikası bildirme + engelleme bekliyor. İsim charset'i `A-Z0-9`, küfür hâlâ mümkün.
**Minimum:** "report player" düğmesi + isim kaydında kara liste.

### 3. Application restriction her iki anahtarda da `None`

Web'e referrer kısıtı Capacitor WebView'ı kırar → **App Check Enforce** tek gerçek koruma. Android için SHA-1 gerekiyor; Play App Signing'e geçince Play Console'un verdiği SHA-1 kullanılmalı.

### 4. Kurtarma kodu iptal edilemez (bilinen kısıt)

Kod = anonim refresh token'ın base64'ü; süresi dolmaz, revoke edilemez. Sızarsa kalıcı hesap devri, geri alma yolu yok. Bugün mitigasyonu yok — uzun vadede Play Games account linking.

### 5. Data Safety formu — "Photos" İŞARETLEME

Custom avatar sunucuya gitmiyor: Firestore'a yalnızca `avatarIdx` (int 0-100) yazılıyor, kural da `is int` diye zorluyor. Yüklenen foto localStorage'da kalıyor. `privacy.html` "avatar you pick" diyerek fazla beyan etmiş (güvenli tarafta) ama forma bakarak "Photos" işaretlenirse gereksiz yere ağır bir kategoriye girilir.

### 6. Zaten bilinenler

- Otopilot (`?bot=1` / `ARC_BOT.toggle()`) release'den çıkarılmalı.
- `keystore/keystore_credentials.txt` parola yöneticisine taşınmalı; **Play App Signing** kullanılmalı (upload key kaybı felaket olmasın).
- **App Check Enforce sırası önemli:** önce yeni Android build'i sahaya çıksın, sonra Enforce. Tersi olursa eski APK'lar Firestore'a yazamaz.
