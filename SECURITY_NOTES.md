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
