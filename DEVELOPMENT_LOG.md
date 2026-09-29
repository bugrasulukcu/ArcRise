# ArcRise — Development Log

> Bu dosya, ArcRise'ın geliştirme sürecini ve mevcut durumunu özetler. Yeni bir oturum başlattığında öncelikle bu dosyayı oku — projenin nerede olduğunu hemen anlarsın. Tek dosyalı bir oyun (`arcrise.html` ~11.500 satır vanilla HTML5 canvas).

---

## 🚀 COWORK HANDOFF — ÖNCE BUNU OKU (2026-07-01, güncel)

**Capacitor/Android scaffold artık hazır** (bkz. v19 changelog aşağıda). `applicationId` = `com.bugrasulukcu.arcrise`. VS Code/Android Studio tarafında sırada:
1. `android/` klasörünü Android Studio'da aç (ilk Gradle sync internet + SDK indirmesi ister).
2. Emülatör/cihazda çalıştır, mağaza için ekran görüntüsü al (Chill + Extreme + profil + high scores popup).
3. `Build → Generate Signed Bundle / APK` → **Android App Bundle** → imzalama `android/keystore.properties`'ten otomatik okunur.
4. Play Console → yeni uygulama → `store_listing.md`'deki metin/checklist ile **internal testing**'e yükle.

**Şifreler/anahtar**: `keystore/arcrise-upload-keystore.jks` + `keystore/keystore_credentials.txt` — **asla kaybetme/paylaşma**, `.gitignore`'da hariç (repoya girmez). Ayrıca bir şifre yöneticisine yedekle.

---

## 🚀 COWORK HANDOFF — ÖNCEKİ (2026-06-30)

Yeni/cowork bir ajan buraya bakınca projeyi hızlıca kavrasın diye özet. **Detaylı "Mevcut Durum" bölümlerinin bir kısmı v18 öncesi durumu anlatır; profil/trace/UI için asıl kaynak aşağıdaki v18 changelog'udur.**

**Ne bu proje:** Tek dosyalık (`arcrise.html`) vanilla HTML5 canvas mobil arcade oyunu. Build step yok. `index.html` cache-bust ile `arcrise.html`'e yönlendirir. Firebase (Firestore + Anonymous Auth) ile leaderboard/profil/arkadaş/hayalet-iz.

**Mimari — arcrise.html içinde nerede ne var:**
- Tek büyük IIFE. Üstte `<head>` içinde FOUT guard, localStorage shim, global error handler.
- **`ARC_DB` modülü** (ayrı scope, ~line 4200-4900): Firebase REST + anon auth; `submitScore`, `getTopScores`, `getCrossPlayerGhosts`, `registerPlayer`, `sendFriendRequest`/`acceptFriendRequest`/`removeFriendEdge`, **`deleteMyData`** (hesap silme). `api` objesiyle dışarı açılır.
- **Oyun scope'u** (~line 4960+): `W=600` sabit, `H_REF=1066` (adalet), `H` değişken (`fitCanvas`). Feature flag'ler burada: `IAP_ENABLED`, `ADS_ENABLED` (v1'de `false`).
- Render loop ~line 7900; `drawTrail` (iz) ~6700; `drawPlayer` ~6840; oyun update ~7100-7460 (enerji/combo/ölüm).
- Profil modalı JS ~8530+ (`openProfModal`, `renderProfStats`, `renderProfButtons`, `renderProfRank`); trace/tomb/deathtext/custom modalları ~8640+; `traceMainColor()` trace rengini/gradyenini/glow'unu üretir (profil+home halkası+stroke bunu kullanır).
- Badge/bildirim sistemi ~10400+ (`BADGES`, `checkBadgeUnlocks`, `refreshNotifs`, `_setDot`).
- Quests ~11050+; sosyal/arkadaş UI ~11250+.

**Doğrulama:** her düzenleme sonrası script bloklarını kontrol et:
`node -e "const fs=require('fs');const h=fs.readFileSync('arcrise.html','utf8');const m=[...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];let e=0;m.forEach((x,i)=>{try{new Function(x[1])}catch(err){e++;console.log('blok',i,err.message)}});console.log(m.length+' blok, '+e+' hata')"` → beklenen **"2 blok, 0 hata"**. (Runtime hatalarını yakalamaz; sadece syntax.)

**Auto-commit:** `.claude/settings.json` PostToolUse hook her Write/Edit'te commit+push eder (`main`).

**Yayın durumu (pazar hazırlığı):**
- ✅ Gizlilik politikası: in-app modal + kök `privacy.html` (mağaza URL'si için — GitHub Pages'te yayınla).
- ✅ Hesap/veri silme: Settings → **Delete Account & Data** artık bulutu da siler (`deleteMyData` + `firestore.rules`'ta owner-DELETE). **Kuralları deploy etmek gerekir.**
- ✅ IAP tier'ları `IAP_ENABLED=false` ile gizli; sahte reklam `ADS_ENABLED=false` ile gizli.
- ⏳ **Native paket yok** — Capacitor ile sarılacak. Toolchain (bu Windows makinesi): Node ✅, Git ✅, **JDK 17 kuruldu**, **Android Studio kuruldu**. iOS için Mac gerekir (Windows'ta yok → önce Android).
- ⏳ Anti-cheat kısmi: skor hâlâ client-side, rules aralık kontrolü yapıyor. **App Check kuruldu (2026-08-26) ama Cloud Firestore'da hâlâ Unenforced/monitor** — yeni build sahaya çıkınca Enforce edilecek. Bkz. `SECURITY_NOTES.md`.

**Yayın yol haritası (Android):** (1) Capacitor scaffold + `cap add android`, webDir=arcrise dosyaları. (2) Android Studio'da emülatörde çalıştır. (3) İkon/splash, ekran görüntüleri, `privacy.html` URL. (4) Upload keystore üret → imzalı **AAB**. (5) Play Console **internal testing** → burada IAP (RevenueCat/Play Billing) + AdMob rewarded bağla, `IAP_ENABLED`/`ADS_ENABLED=true` yap, sandbox'ta test. (6) Prod.

---

## 📁 Proje Yapısı

```
C:\Users\DELL\Desktop\BUGRA\ArcRise\
├── arcrise.html              ← oyunun tamamı (HTML + CSS + JS, ~11.500 satır)
├── index.html                ← cache-bust ile arcrise.html'e redirect (giriş)
├── privacy.html              ← mağaza için gizlilik politikası sayfası (yeni)
├── firestore.rules           ← Firebase güvenlik kuralları
├── firebase.json/.firebaserc ← `firebase deploy --only firestore:rules` için (2026-08-26)
├── SECURITY_NOTES.md         ← güvenlik denetim kaydı + market öncesi açık liste
├── sync-www.js               ← root → www/ kopyalama (`npm run sync`)
├── verify-sync.js            ← root/www/android assets drift kontrolü (`npm run verify`) — BUILD ÖNCESİ ZORUNLU
├── android/                  ← Capacitor Android projesi (assets kopyası .gitignore'da)
├── PNG/                      ← LOGO.png, GAME_ICON.png + Figma export'ları
├── AUDIO/                    ← BGMusic(.mp3/.wav), Touch.wav, Dead.wav
├── RESOURCES/                ← ham asset zip'leri (build'e dahil etme)
├── .claude/                  ← Claude Code config (settings + auto-commit hook)
├── .gitignore
└── DEVELOPMENT_LOG.md        ← bu dosya
```

**Git akışı**: `main` branch GitHub Pages'te yayında (https://bugrasulukcu.github.io/ArcRise/arcrise.html). Feature branch `feat/music-particles-booster-border`'a commit → PR → squash-merge to main. Build step yok, statik dosya.

**Font**: Sarpanch (Google Fonts, 400-900 weights) — fallback Press Start 2P → monospace.

---

## 🎮 Oyun Mekaniği — Mevcut Durum

### Temel oynanış
- Vanilla HTML5 canvas, mobile-first
- Canvas internal: genişlik sabit **600**, yükseklik (`H`) `fitCanvas()` ile değişken. Uzun ekran (oran ≥1.25) → `H = round(600·oran)`, `.stack` tam ekranı doldurur (distorsiyonsuz, daha çok dikey dünya). Yatay/PC → `body.letterbox` + 9:16 ortalı (esnemez). Mesafe/zorluk **sabit `H_REF=1066`**'ya bağlı (cihazdan bağımsız). `gc`/`bg` height resize'da güncellenir.
- Top kavisli bir yörüngede hareket eder. Ekrana dokununca yön değişir (sol → tight arc, sağ → wide arc).
- Yeşil top topla → enerji dolar (8 sn'lik geri sayım — eskiden 9)
- Kırmızı engele çarp → öl
- Altın toplar puan verir, mor toplar booster verir

### Profil Sistemi
- LocalStorage'da: `arc_name`, `arc_avatar` (0-19 preset SVG), `arc_avatar_custom` (yüklenen JPEG base64, 256×256 **center-cropped cover**)
- Ana sayfa profil kartına dokun → **yeni profil modalı** açılır:
  - Avatar + iki **badge slot** (sol/sağ — boşsa "+", doluysa ikon)
  - Statik isim (artık düzenlenmiyor; ilk açılış `profile-setup` ekranı dışında)
  - İnce divider çizgisi
  - Yatay stats satırı: **BEST / DIST / COINS** — mode-tinted (Chill mavi, Extreme alev)
  - Avatar'a tıkla → grid expand (Upload tile + 20 preset SVG)
  - **UPGRADES** butonu (mor, primary CTA)
  - BACK + SAVE butonları (yan yana, footer)
- Coin pill ayrı: profil kartının sağında ufak altın disk + sayı; tıklayınca **Coins modal** açar.
- 20 preset SVG avatar (`AVATARS` array, `AVATAR_NAMES` etc.)

### Oyun Modları (`gameMode`)
| | Chill (`normal`) | Extreme |
|---|---|---|
| `getBaseSpeed()` | 400 | 800 |
| `getScoreMul()` | 1.5 | 3.0 |
| Dinamik hız | 1× sabit | 1× → 2× **lineer** (0..1000m üstünden) |
| Görsel | Mavi/buz tonları | **ALEV** kenarlar/engeller + ekran çerçevesi yanıyor |
| Profile kartı | Beyaz cam | Extreme'de border alev + flicker |

"Normal" mode adı UI'da **"Chill"** olarak gösteriliyor (localStorage key hâlâ `normal`). Extreme butonuna basınca onay popup'ı çıkar (×3 score, acceleration, "LET'S GO" / "Stay Normal").

### Difficulty (mesafe-bazlı, lineer 0..1000m)
- `t = clamp(distM / 1000, 0, 1)` — tüm zorluk parametreleri bu üzerinden.
- **Gap** (dikey aralık): 430→200 lineer.
- **Engel yarıçapı**: 30→**W/8** (max W/4 width) lineer.
- **Hareket**: 200m'den sonra başlıyor, 1000m'de full. Maks amplitude = `r` (≈ %50 of diameter).
- **Hareket türü**: <600m h/v, 600-900m diag, 900m+ rand.
- **Pickup'lar**: gold 4m+, purple 10m+ (eskiden score eşikliydi).
- Eski score-eşikli ani patlama (sc=500'de) gitti.

### Booster Sistemi (`BOOSTER_INFO`)
9 booster türü: `wide, narrow, magnet, x2, x3, x4, ghost, shield, speed`. Mor toplar (`purpleBalls`) toplanınca aktive olur.
- `getRadius()`: wide → W/3, narrow → W/5, default → W/4.
- HUD'da combo + booster pill'i **üstte** (score satırının altında) — başparmak kapatmıyor.

### Combo Sistemi
- Yeşil top topladığında: `bonus = round(countdown/2) * 10` puan.
- Geri sayım: 8 sn'den 0'a düşer, **0'dan sonra 0-0.5sn forgiving period** (rakam 0 olarak göründüğü süre).
- HUD daire içinde `×N` countdown. Font Sarpanch 700 weight, 18-22px (yarıçapa göre).
- Combo "+N" floating green text spawn (`spawnFloatText`).

### Skor Sistemi
- `score = floor(distancePx / 200 * getScoreMul() * boosterMul) + scoreBonus`
- **`distancePx` spawn-relative**: `Math.max(distancePx, (H-200) - player.y)` — ilk frame'den itibaren artıyor. Eski `maxAscend = -player.y` formülü Extreme'de kısa oyunlarda 0 kalıyordu, score=0 olunca submit eleniyordu — fix.
- 5 haneli pad (`00000`). HUD'da SCORE + altında BEST satırı.

### Distance (mesafe)
- `distM = distancePx / (H/2)` — **yarım ekran = 1 metre**.
- HUD sağ kolonda DISTANCE + BEST (mode-tinted).
- Sayı formatı: <10 için 1 ondalık (`7.4`), ≥10 için tam sayı (`16`). **M suffix yok**.
- Game-over: SCORE ve DISTANCE yan yana count-up animasyonu, küçük BEST satırı altta.
- Best distance: per-mode → `stats.bestDistNormal`, `stats.bestDistExtreme`.
- **PB line on map**: kişisel rekor distance'a denk gelen world-Y'de yatay kesikli çizgi (mode rengi + "PB N" etiketi).

### Altın Top (Combo Çarpanlı)
- `b.pts × (countdown/2)`, 10'a yuvarlanır.
- 3-aşamalı animasyon: grow → multiply (×N badge) → fly to HUD.
- **Sarı vignette flash** (`triggerGoldFlash`) + 56-poligon amber partikül burst.
- `stats.goldsCollected` ve `stats.boostersCollected` artık tutulmuyor (cleanup'la kaldırıldı).

### XP/Coin Sistemi
- Her oyunun skoru `arc_xp`'ye eklenir (birikimli).
- `coins = floor(xpTotal / 1000)` — her 1000 XP'de 1 coin.
- Game Over: coin progress bar, +N coin earned animasyonu.
- Coins modal: balance + NEXT COIN progress bar (XP mod 1000 / 1000) + IAP placeholders (+50/+100/+200) + UPGRADES jumper + Close.

### Multi-Trace Ghost System
- Her oyunun trail'inden sparse sample (`ghostSampled`) alınır (her ~20 world-px yükselişte 1 nokta, **shift yok** → spawn dahil).
- `endGame`'de `localStorage.arc_traces_v1` ring buffer'ına yazılır: `{mode, score, ts, points, yMin, yMax}`. Cap **1000 trace**, oldest dropped, quota-error tolerant.
- `drawGhostTrail` son 80 trace'i render eder. Newest 10 biraz parlak. Chill mavi (`#88bbff`), Extreme turuncu (`#ff8866`). Alpha 0.07/0.035, `lighter` composite.
- Bounding-cull (`yMin`/`yMax`) → ekran dışı trace'ler atlanır.

### Badges (placeholder)
- 12 dummy badge: 🥉 FIRST 1K, 🔥 COMBO 9, ⚡ EXTREME, 🪙 100 GOLD, 🎯 STREAK 5, 🏃 SPEEDRUN, 💎 COLLECTOR, 🦉 NIGHT OWL, 📏 100 M, 🚀 500 M, 👑 BOSS, 🛡️ SURVIVOR.
- Profil avatar'ının yanındaki slot'lara tıklayınca **Badges modal** açılır (4-sütun scrollable grid).
- Tıkla → equip first empty slot; re-tap → unequip; her iki slot dolu ise slot 2'yi replace.
- State `arc_badges_v1` (array [slot0, slot1]).
- Henüz unlock şartı yok — hepsi tıklanabilir (gerçek catalog sonra).

### Upgrades (shell only)
- Mor placeholder modal — profile'dan ve coin popup'tan açılır.
- Şu an sadece "Coming soon" gibi mesaj. Booster catalog tasarımı bekleniyor.
- Önerilen kategoriler (önceki sohbette tablo halinde verilmişti):
  - **Pasif**: Combo Stamina (+1s countdown × seviye), Late Bloomer, Coin Magnet, Iron Will, Greedy Gold
  - **Aktif**: Continue/Revive (500 coin/run), Score Boost ×2 (300), Soft Start (200)
  - **In-game slot**: Combo Saver, Shield Charge, Magnet Pulse, Time Brake, Auto-Pilot, Score Snap

### Tutorial
- İlk oyunda otomatik (`firstPlay` flag — `arc_firstplay` localStorage)
- 5 adım: TOUCH ANYWHERE → COLLECT GREEN → AVOID RED → RIGHT WIDE → LEFT TIGHT
- Banner + dot göstergeleri + SKIP butonu
- **Tutorial home'dan erişim YOK**, sadece firstPlay'de tetikleniyor

---

## 🎨 Görsel Efektler

### Background (bctx) — sadece game play sahnesinde
1. **Grid** (`drawGrid`) — sürekli; anti-aliasing toggle off ise 0.5px pixel-aligned snap.
2. **drawBgFlash** — sahte 64-bin spektrum (`updateFakeViz`) ile animasyonlu glow (gerçek FFT yok artık, audio path AudioContext'ten ayrıştı — aşağıya bak).
3. **Gold flash vignette** — ekran kenarlarından sarı parlama (`goldFlashAlpha`).

### Game canvas (ctx)
- **Walls**: Chill'de düz; Extreme'de dikey gradient + 12 ember highlight.
- **Obstacles**: Chill'de düz kırmızı daire; Extreme'de multi-stop radial gradient + wobble.
- **Bonuses (yeşil)**: glow + core + countdown rakamı (Sarpanch 700, mode-aware boyut).
- **Gold balls**: minik core (r=1-2px) + sarı glow + "+pts".
- **Purple balls**: mor glow + core + icon.
- **Trail**: rainbow gradient.
- **Multi-trace ghosts**: yukarıda anlatılan sistem.
- **PB distance line**: yatay kesikli mode-renkli çizgi + "PB N" etiketi.
- **Particles**: gold/purple/green pickup burst (her biri ~48-64 polygonal shard, hue ayrı).
- **Float texts**: combo bonus +N yazıları.
- **Fly scores**: gold ball puanlarının HUD'a uçan animasyonu.
- **Flame particles**: sadece Extreme + scene='play' — duvarlardan alev parçacıkları.
- **Booster border**: aktif booster için renkli pürüzlü ekran kenarı.

### Anti-Aliasing toggle
- Settings'te "Smooth" toggle (`arc_aa`). Default on.
- Off → canvas grid çizimleri `Math.floor(x) + 0.5` ile pixel-perfect snap, soft kenarlar kapanır. Low-end GPU dostu.

---

## 🔊 Audio Sistemi

```js
const bgAudio    = new Audio('AUDIO/ArcRiseBGMusic.wav'); // loop, vol 0.7
const touchAudio = new Audio('AUDIO/ArcRiseTouch.wav');   // vol 0.55
const deadAudio  = new Audio('AUDIO/ArcRiseDead.wav');    // vol 0.8
```

- **bgAudio artık AudioContext'ten geçmiyor**. Eski setup `createMediaElementSource` ile AnalyserNode kullanıyordu, ama suspended context durumunda (autoplay policy, tab switch, iOS gesture awaiti) müzik sessiz kalıyordu. `playBgMusic` artık sync, `bgAudio.play()` doğrudan.
- **`updateFakeViz`** her frame 64-bin sahte spektrum üretiyor → bg flash animasyonu sürüyor.
- Touch/dead için low-latency **AudioBuffer + BufferSourceNode** (ayrı `sfxCtx`). ~1-5ms gecikme.
- SFX/Music/Feedback toggle: `setSfx`, `setMus`, `setFeedback`.

---

## ⚙️ Ayarlar (`#settings`)

- 4 toggle: **SFX, Music, Feedback (vibrate), Smooth (anti-aliasing)**
- Profil bölümü yok (ana sayfada)
- Back butonu
- **Reset Data**: panelin dışında, geniş tek satır (`#reset-outer`).

Settings paneli sınırında **dönen rainbow gradient stroke** (Start butonuyla aynı `spinA` keyframe, CSS mask).

---

## 🏆 High Scores Popup (`#lb-modal`)

- Home'da "High Scores" butonu — Settings ile yan yana, eşit genişlik, plain gray.
- **Chill/Extreme tab'ları** üstte: home'daki mod selector look'unu paylaşıyor (icy-blue / flame gradient).
- **Score / Distance metric sub-tab'ları**: aynı Firestore data'sından her iki metric türetilir (ekstra read yok).
- 3 record kart: ALL-TIME (yellow), TODAY (green), MONTH (purple) — square aspect, centered text.
- Your Position: 1. altın çerçeve + divider + 2 üst + sen (yeşil) + 2 alt; oyuncu listede yoksa placeholder satır.
- **Top-1 always gold-framed**, oyuncu da olsa.
- **Frame**: Chill'de blue ring (static), Extreme'de **rising-flame** radial gradient + flicker keyframe (box-shadow only). Smooth cross-fade.

---

## 🪙 Coins Popup (`#coins-modal`)

- Coin disc (radial gold + brass border + ¢ damgası) + balance.
- **NEXT COIN** progress bar (XP mod 1000 / 1000) animated.
- IAP placeholder tiles: **+50 $0.99 / +100 $1.79 / +200 $2.99** (alert'le ack, gerçek IAP yok).
- **UPGRADES** jumper (primary, büyük) → upgrades modal.
- Close (küçük, ikincil).
- Tüm popup gold-themed: animasyonlu conic ring, gradient text.

---

## 🏗️ Kod Mimarisi

### IIFE'ler
1. ARC_DB modülü (Firestore wrapper)
2. **One-shot reset gate** (data migration — sürüm bumplanırsa wipe)
3. Ana oyun IIFE

### State Variables (modül kapsamında)
```js
// Game
let score, maxAscend, distancePx, energy, scoreBonus, camY, best, lastScore
let running, started, scene
let player = {x, y, r, dir, speed, heading, radius, cx, cy, ang}
let trail, obstacles, bonuses, ripples, goldBalls, purpleBalls
let particles, floatTexts, flameParticles, flyScores
let ghostSampled, allGhosts, lbNPCScores

// Booster
let boosterType, boosterTime, boosterDur, isGhost, hasShield

// Tutorial
let tutStep, tutTimer, tutAlpha, tutPaused

// Mode
let gameMode, GAME_SPEED

// Audio + Viz
let analyser, vizData (sahte spektrum)
let goldFlashAlpha

// Profile
let playerName, avatarIdx, customAvatarSrc
let coins, xpTotal, bestDistanceM, stats
let equippedBadges

// Settings
let sfxOn, musOn, feedbackOn, aaOn

// Debug
let debugOverlay, fps
```

### LocalStorage Keys
```
arc_name, arc_avatar, arc_avatar_custom
arc_best, arc_last, arc_xp, arc_coins, arc_bestdist
arc_sfx, arc_mus, arc_fb, arc_aa
arc_mode, arc_firstplay
arc_stats_v1            (JSON: gamesTotal, gamesNormal, gamesExtreme,
                              bestNormal, bestExtreme,
                              bestDistNormal, bestDistExtreme, maxCombo)
arc_traces_v1           (JSON: trace ring buffer, max 1000)
arc_badges_v1           (JSON: [slot0, slot1])
arc_slots_v1            (JSON: in-game booster slots, placeholder)
arc_reset_v             (string: data-migration version marker)
arc_topcache_*          (sessionStorage: Firestore read cache, 5 min TTL)
```

### Önemli Fonksiyonlar
- `resetGame()` — yeni oyun başlarken state cleanup (artık `ghostSampled.length = 0; allGhosts = loadGhostTraces();` de var)
- `step(dt)` — her frame fizik + collision + skor + `distancePx` update
- `loop(ts)` — ana RAF döngüsü
- `endGame()` — async; Firestore submit (skor + distance), stats güncelle, trace kaydet, count-up animasyonu
- `showScene(s)` — sahne geçişi
- `applyProfile()` — profile UI sync (per-mode best, coin pill, isim, vs.)
- `spawnAhead()` — obstacle + bonus + gold + purple spawn, **distance-driven linear difficulty**
- `setGameMode(m)`, `setSfx/setMus/setFeedback/setAa(v)`
- `drawBestDistanceLine()` — PB yatay çizgisi
- `saveGhostTrace(trace)`, `loadGhostTraces()`
- `renderProfStats()`, `renderEquipSlots()`, `renderBadgeGrid()`
- `openProfModal()`, `openLbModal()`, `openBadgesModal()`, `coins-modal`, `upgrades-modal` handlers

### Performans
- **Culling**: obstacles/bonuses/goldBalls/purpleBalls — `player.y + H*1.5` altındakiler atılıyor
- Trail 600 öğeyle sınırlı (live render); `ghostSampled` sınırsız ama sparse (~20px adım)
- `drawGhostTrail` son 80 trace + per-trace bounding cull
- Particle low friction + 1sn life cycle ile pratik limit
- Firestore reads cached (5min TTL)

### Mobil Zoom Lock
- viewport meta `maximum-scale=1, user-scalable=no`
- body `touch-action: manipulation`
- `gesturestart/change/end`, çift dokunma, 2+ parmaklı `touchmove` → preventDefault

### Desktop / Debug
- **Space** klavyede arc flip
- **T-T** (500ms içinde çift): debug overlay aç/kapa (FPS + live state — yarı opak)
- Mobil: **RTL swipe** ile debug aç, **LTR swipe** ile kapa

---

## 🔥 Firestore Leaderboard

```js
const FIREBASE_CONFIG = {
  apiKey:    'AIzaSyB7x2es8UgEkQ91K4hruM7OaJKhpXkzvW4',
  projectId: 'arcrise-e1504',
};
```

- REST API ile (SDK yok), `:runQuery` ve `scores` koleksiyonu.
- **Doc schema**: `{name, avatar, score, distance (double), ts, mode}` — `(name, mode)` başına 1 doc.
- `submitScore(name, avatar, score, mode, distance)`:
  - Aynı (name, mode) için existing doc bul.
  - Score VE distance bağımsız yarışır — her metric'in yüksek olanı kalır. Score düşük ama distance yüksekse sadece distance güncellenir.
  - Yoksa POST yeni doc.
- `getTopScores(n, mode)`:
  - **5-min TTL cache** (memory + sessionStorage), key `mode:fetchN`.
  - Cache hit → 0 read.
  - Cache miss → `min(n*6+30, 250)` doc fetch (mode-filter için overfetch).
  - **`dedupeBest`** read katmanında (`(name, mode)` başına tek satır).
- `invalidateTopCache()` — `submitScore` sonrası çağrılır.
- **Admin (DevTools)**:
  - `await ARC_DB.wipeAllScores()` — tüm `scores` koleksiyonu sayfalı silinir (onaylı).
  - `await ARC_DB.dedupeScores()` — her `(name, mode)` için en yükseği tutar, gerisini siler.
- Security rules: read=allow, write=allow, delete=allow (test mode). Production'da kısıtla.

---

## 🔁 Data Migration / One-shot Reset

```js
const ARC_RESET_VERSION = 'r-2026-06-19-2';
```

App yüklenince:
1. `localStorage.arc_reset_v` bu sabite eşit değilse,
2. Tüm `arc_*` localStorage anahtarları silinir (`arc_reset_v` hariç),
3. `arc_topcache_*` sessionStorage anahtarları silinir,
4. `arc_reset_v` yeni değerle yazılır → tekrar tetiklenmez.

İleride yeniden sıfırlama gerekirse: `ARC_RESET_VERSION` string'ini bump et, push et. Tüm cihazlar bir kez wipe yapar.

---

## 📝 Son Yapılan Değişiklikler (kronolojik, en yeni üstte)

### Görevler: "N run oyna" açığı kapandı (2026-09-29)

- **Sorun:** "Play N runs today" ve "Finish N Extreme runs today" her run'ı sayıyordu → START'a basıp duvara çarpmak görevi tamamlıyordu.
- "Play N runs" havuzdan çıktı → **"Get N CLOSE! near-misses today"** (taban 4; `_runNearMiss` run sonunda eklenir).
- Extreme görevi → **"Reach 1.00m in N Extreme run(s) today"** (`param` 100 cm, yıl içinde 1.5 m'ye büyür).
- Bugün zaten atanmış eski `runsToday` görevleri artık yalnız 0.5 m'yi geçen run'ları sayar.
- Diğer görevler zaten performans istiyor (skor, mesafe, combo, toplam mesafe, 1.5 m+ run, coin, THREAD, kapı).
- Test 22/22 (yeni: hemen ölen run hiçbir görevi ilerletmez).

### Günlük meydan okuma (DAILY RUN) (2026-09-29)

- **Aynı pist:** `spawnAhead` + kapı/halka/koridor üreticileri `srand()` kullanır; günlük koşuda `mulberry32(FNV('arcrise-daily-YYYYMMDD'))`, normalde `Math.random`. Pistin herkes için aynı olması için günlükte: zorluk (`distCm`) oyuncunun anlık konumundan değil **slotun kendi yüksekliğinden**, ilk slot `H` yerine sabit `H_REF`'ten; kristal oranı yüklemeden bağımsız (%10). Doğrulama: 375×667, 430×932, 1280×800 ve büyük top upgrade'inde ilk 25 nesnenin koordinatları birebir aynı.
- **Kurallar:** her zaman Normal mod (oyuncunun modu saklanıp çıkışta geri yüklenir), eşyalar kullanılmaz/harcanmaz, sınırsız deneme, günün en iyisi sayılır. AGAIN günlükte kalır; menüye dönüş günlükten çıkar.
- **Giriş:** Görevler penceresinde "DAILY RUN" kartı (bugünkü en iyi + günün tablosundaki sıra / oyuncu sayısı, PLAY). Game over'da "DAILY SCORE" başlığı ve günün tablosu. Günlük skor normal liderlik tablosuna **yazılmaz**.
- **Sunucu:** `daily/{YYYYMMDD}/scores/{uid}` (oyuncu başına tek doküman, yalnız skor artarsa güncellenir). `ARC_DB.submitDaily / getDailyTop`. `firestore.rules`'a `validDaily` + `match /daily/{day}/scores/{uid}` eklendi — **2026-09-29 deploy edildi** (`firebase deploy --only firestore:rules`, derleme temiz). Canlı doğrulama (yalnız okuma/ret): günün tablosu herkese açık okunuyor (200, boş), kimliksiz yazma 403. Kimlikli yazma üretimde denenmedi (test verisi bırakmamak için) — ilk gerçek günlük koşu doğrular.
- **Yarış hatası (bulunup düzeltildi):** `_proceedEndGame` asenkron; önceki run'ın kaydı sürerken günlük mod açılırsa normal skor günlük tabloya yazılıyordu → bayrak fonksiyon başında sabitlenir (`wasDaily`).
- Görev penceresi günlük kartla SE Safari'de 491 px (kaydırmasız). Test 21/21 (yeni: günlük akış uçtan uca + pist eşitliği).

### Kendi en iyi run'ının hayaleti (PB ghost) (2026-09-29)

- Run boyunca 0.1 sn'de bir `[t×10, x, başlangıçtan yükseklik]` kaydı (`_pbRec`, en fazla 4000 nokta ≈ 6.5 dk). Yükseklik başlangıç noktasına göre tutulur (başlangıç `H−200` cihaza göre değişir; genişlik sabit 600).
- Mesafe rekoru kırılınca (rekor güncellenmeden önce kıyaslanır) mod başına `arc_pb_ghost_normal/extreme` saklanır (~10 KB/dk).
- Sonraki run'larda aynı zamanlamayla doğrusal ara değerle oynatılır: yarı saydam koyu top, kesikli açık mavi çember, "PB" etiketi; hayalet kendi run'ını bitirince kaybolur. Wife mode ve tutorial'da yok. `upg.pbGhost === false` ile kapatılabilir (UI yok). Delete data hayaletleri de siler.
- Test 20/20 (yeni: rekor run kaydı + 2. run'da yükleme).

### Yeni hareketler için rozet + görev (2026-09-29)

- Rozet ızgarası 16 → 20 (4 sütun, tam dolu): **THREADER I–V** (toplam THREAD 1/10/50/200/500), **GATEKEEPER I–V** (kapı 1/10/50/200/500), **CRYSTAL I–V** (kırılan kristal 1/10/40/150/400), özel **MAESTRO** (tek run'da THREAD + KAPI + TIMING + KORİDOR). Yeni glifler (iki top arasından yay, direk+hedef, çatlak altıgen, takımyıldız).
- İstatistikler olay anında: `stats.threadsTotal / gatesTotal / crystalsTotal / maestroDone` (kayıt endGame'de, altın gibi).
- Görev havuzu (BONUS ekseni): "Thread between spinning twins N time(s) today" (taban 1), "Pass N gates dead centre today" (taban 2).
- Test 19/19 (yeni: rozetler tek run'da açılıyor).

### Skorla birleşen nesneler: Kapı, ×2 Halkası, Kristal, Altın Koridor, TIMING + ölüm sebebi (2026-09-29)

Hepsi `feats` dizisinde (kapı hedefi / halka / kıvılcım) ya da engel özelliği (kristal, TIMING). Spawn: engel slotlarının kapı %7 (0.4 m+), koridor %4 (0.6 m+), halka %3 (0.8 m+); kristal normal engellerin %8'i (0.5 m+; Shockwave/Phase takılıysa ya da Shield aktifse %16).

| Nesne | Kural | Ödül |
|---|---|---|
| KAPI | aynı hizada iki engel + aradaki altın hedef; hizayı hedefin ortasından geç (iki yönde sayılır) | +60 × çarpan, combo sayacı dolar |
| ×2 HALKASI | koridoru süpüren altın halka; içinden geç | 5 sn tüm bonuslar ×2 (booster'la çarpılır), oyuncu etrafında kalan süre yayı |
| KRİSTAL | kırmızı çekirdek + buzlu altıgen kabuk; dokunursan ölürsün; Shockwave / Shield / Ghost-Phase ile kır | +100 × çarpan + 1 coin |
| ALTIN KORİDOR | iki yanı engelli kıvrımlı hatta 5 kıvılcım (coin vermez) | her biri +15; hepsi → +200 × çarpan; biri kaçarsa zincir söner |
| TIMING | nabız atan engel küçükken, büyükken kaplayacağı alandan geç | +40 × çarpan |

- Kırılma yolları tek noktada: `onObstacleBroken()` (Shockwave, Shield, Ghost içinden geçme).
- **Ölüm sebebi:** `beginDeath(cause, x, y, r)` — engel / kristal / duvar / enerji. Game over'ın üstünde sebep + ipucu ("Switch direction before you reach the edge" vb.); ölüm anında çarpma noktasında 1.6 sn genişleyen halka (duvarda dikey çizgi).
- `ARC_TEST`: `feats` sayaçları, `spawnFeatHere(kind, ahead, dx)`, `score`. Testler 18/18.

### THREAD: dönen ikilinin arasından geçme bonusu + yeni engel görünümü (2026-09-29)

- **THREAD** (arkadaş önerisi): SPIN engeli (ortak merkez etrafında karşılıklı dönen iki top) çiftinin yörünge dairesine girip sağ çıkmak = iki topun arasından geçmek. **+75 × booster çarpanı**, topları 26 px'ten yakın sıyırırsan **PERFECT +150**; ayrıca +%15 enerji, altın parçacık, titreşim. Çift `pid` ile bağlı, bonusu `lead` üye taşır (çift başına bir kez). Tutorial'da kapalı. Ölçek: CLOSE +25, yeşil ~10, PB +200. Sayaç `_runThreads` (ileride rozet/görev için).
- **İpucu görseli:** çiftin etrafında altın kesikli, dönüş yönünde akan yörünge halkası + topları bağlayan nabız atan ince ışın + merkez noktası; geçilince halka yeşil genişleyip söner.
- **Engeller:** düz kırmızı daire → hacimli küre (ışık gradyeni, parlak kenar, iç derinlik halkası, parlama noktası, dış ışıma). Bir kez offscreen'e çizilip her karede ölçeklenir (kare başına gradyen yok); tema paleti sprite'a da uygulanır; LOWFX'te dış ışımasız ayrı sprite. Extreme alev görünümü ve tutorial yanıp sönmesi aynı.
- `ARC_TEST`: `threads`, `spawnOrbitHere(orbR, ahead)`, `ghost(s)`. Test 16/16.

### Görev ekranı kısaldı, geri butonları hizalandı, tema denemesi, epik sandıkta tema (2026-09-29)

- **Görev ekranı:** "New quests every day" alt başlığı ve seri açıklama metni kaldırıldı; kartlarda ilerleme yazısı çubuğun yanına alındı. iPhone SE Safari (375×553) görünür alanında 464 px — kaydırma yok. `max-height: 520px` altında (SE1) ek sıkıştırma.
- **Geri butonu** her pencerede kutu köşesinden aynı yerde (21 px sağ / 25 px aşağı). Sapanlar: profil (17/17, absolute), temalar (17/17, dolgu 16), coins (23/27, dolgu 26/22) → eşitlendi. Ölçüm: upgrades, coins, lb, quests, challenge, friends, profile, credits, settings, themes.
- **Tema denemesi (TRY 1 RUN):** satın alınmamış her tema için bir kez. `upg.themesTried` işaretlenir, `sessionStorage.arc_theme_trial` ile sayfa o temada yenilenir ve run hemen başlar; kayıtlı tema değişmez (`effectiveTheme()`). Run bitip game over'dan ayrılınca (AGAIN / menü) ya da run ortasında oyundan çıkılınca eski temaya dönülür ve tema penceresi açılır. Deneme ortasında uygulama yeniden açılırsa da eski temaya döner. Kartta "TRY 1 RUN" / "TRIED".
- **Epik sandık (60. gün)** sırayla iz ↔ tema verir (1. iz, 2. tema, …; `streakRw.epicN`); biri tükenince diğeri, ikisi de tükenince +30 coin. Tema, mağazadaki henüz sahip olunmayan ilk tema (Game Boy → Noir → CRT). Sandık ekranında tema önizlemesi.
- Testler 15/15 (yeni: 2. epik sandık tema, tema denemesi uçtan uca).

### Giriş serisi ödülleri, yeni görev kartları, görev eşikleri, LOWFX ısınma, tutorial item'ları, credits (2026-09-29)

**Giriş serisi (120 günlük tekrarlayan döngü)** — `stats.dayStreak` üzerinden; bir güne tek ödül, büyüğü geçerli:

| Gün | Sandık | İçerik |
|---|---|---|
| her 5. | CHEST | %55 10 coin / %45 rastgele 1 item (ağırlık 1/fiyat; stok doluysa 10 coin) |
| her 15. | BIG | 25 coin + 1 item (stok doluysa +5 coin) |
| her 60. | EPIC | 60 coin + sıradaki seri izi: Ember → Aurora → Nebula → Abyss (hepsi varsa +30) |
| her 120. | LEGEND | 100 coin + Solar → Legend izi (hepsi varsa +60) |

Döngü başına ≈ 500 coin ≈ günde +4 (normal oyuncu gelirinin ~%12'si) + kozmetik. Seri izleri mağazada satılmaz (🔥 kilitli görünür, dokununca "Login streak reward"). Açılmamış sandık kaybolmaz (en fazla 12). İlk kurulumda geriye dönük sandık verilmez.
- **Seri kuralı:** tek gün kaçırmak seriyi bozmaz (o gün sayılmaz), iki gün üst üste kaçırılırsa 1'e döner. Gün farkı artık **takvim günüyle** (`localDayNum`) — eskiden 24 saat karşılaştırıldığı için yaz/kış saati geçişinde seri sıfırlanıyordu. Eski `lastDayTs` kaydı otomatik taşınır; `bestDayStreak` tutulur.
- **UI:** Görevler penceresinin üstünde 10 günlük nokta şeridi (geçilen dolu, bugün parlar, ödül günleri kademe renginde sandık; bekleyen sandık sallanır), "OPEN CHEST" düğmesi, sıradaki ödüllere kalan gün. Sandık açma katmanı: sallanma → kapak açılır → ışık patlaması → ödül satırları → COLLECT. Görevler düğmesinin "ödül hazır" noktası bekleyen sandığı da sayar. Giriş bildirimi artık seri gününü yazar ("Streak day N").
- **Görev kartları:** eksen ikonu + rengi (SKILL mavi / GRIND mor / BONUS pembe), sol renk şeridi, coin çipi, parlayan CLAIM, alınmış kart soluk.
- **Görev eşikleri (bot ölçümü: upgrade'siz medyan run ≈ 1 m / 126 skor, iyi run ≈ 2.7 m / 1000; orta upgrade medyan ≈ 2.7 m / 2100):** tek run skor 1500→**600**, tek run mesafe 3.5→**2.5 m**, toplam skor 6000→**3000**, toplam mesafe 25→**15 m**, "iyi run" eşiği 4→**1.5 m**. Yıllık büyüme ×3.0 → **×1.6**.
- **LOWFX:** açılışın ilk 4 sn'si (ön plana dönüşte 2 sn) sayılmaz; art arda **iki** düşük 3 sn'lik ölçüm gerekir.
- **Tutorial → gerçek run** kesintisiz geçişinde takılı item'lar artık harcanır/devreye girer (Pre-Booster dahil).
- **Credits:** `alert()` yerine oyunun pencere stili (`#credits-modal`).
- Testler: 13/13 (yeni: seri sandıkları + kaçırma kuralı + 60. gün izi, tutorial item'ı, credits). `ARC_TEST`'e `lastRun`, `audio`, `finishTutorial` eklendi.

### iPhone'da ses gelmiyordu: sessiz anahtarı + 'interrupted' bağlam (2026-09-29)

- Tüm sesler Web Audio'ya geçince (29c21d8) iOS'ta **zil/sessiz anahtarına uymaya** başladı → telefon sessizdeyken hiç ses yok (eskiden müzik `<audio>` ile çaldığı için duyuluyordu). `navigator.audioSession.type = 'playback'` (Safari 16.4+) ilk dokunuşta ve ön plana dönüşte; arka planda `'auto'`.
- iOS arama/bildirim/Siri sonrası bağlamı `'interrupted'` yapar; `playSfxBuffer` ve ön plana dönüş yalnız `'suspended'`ı açıyordu → artık `state !== 'running'` ise `resume()`.
- `index.html` önbellek sürümü `20260929a`.
- Telefonda doğrulandı (2026-09-29): SFX ve müzik çalıyor. İlk denemede müzik gelmedi, bir sonraki sürümde (önbellek `20260929b`) geldi; büyük olasılıkla telefon eski sürümü önbellekten açıyordu.
- Tanı için: debug panelinde (`?debug=1`, oyunda sağdan sola kaydır) `audio` satırı → bağlam durumu, müzik tamponu, çalıyor mu, gain, müzik ayarı, audioSession. `ARC_TEST.audio` aynısını testlere verir; müzik testi artık gain > 0.3 de denetler.

### Otomatik testler: `npm test` (2026-09-29)

`tests/e2e.mjs` — headless Chrome (CDP) + kendi statik sunucusu + **bellekte sahte Firebase** (Auth + Firestore, kural taklidi: kimliksiz yazma 403). Gerçek Firebase'e hiçbir istek gitmez; reCAPTCHA/gstatic engelli. ~50 sn, 10 test:
start tek run/tek item · AGAIN çift tık tek harcama · PB oluştur+kimlikli güncelle, aynı isimli başka oyuncuya dokunmama, liderlikte iki ayrı satır · reset kapısı yeni anonim hesap · iz deposu 120 · çevrimdışı liderlik mesajı · müzik yalnız oyunda · coin/m, extreme ×2, günlük yumuşak tavan · run sonu coin tam sayı + kesir taşıma · yeni gün (görev yenileme, seri, giriş +1, aynı gün tekrar yok).
- Seçerek: `npm test -- pb,müzik`; ayrıntılı zamanlama: `E2E_DEBUG=1 npm test`. Test başına 90 sn sınırı, `ev` 15 sn; JS dialog'ları otomatik kapatılır; macOS'ta `caffeinate`.
- Her test aynı origin'deki boş sayfada (`/__blank`) depoyu temizleyip tohumlar — önceki oyun sayfası kapanırken durumunu geri yazamaz.
- Oyuna `window.ARC_TEST` (yalnız `ARC_DEBUG`): `scene`, `mode/setMode`, `runCoinsRaw`, `applySoftCap`, `coinsEarnedToday`.
- Testin bulduğu hata: `parseRows` eksik alanlı tek bir dokümanda (`avatar` yok) patlıyor → **tüm liderlik tablosu boş** dönüyordu. Artık adı olmayan atlanır, diğer alanlar varsayılana düşer.
- Not: arka planda (araç tarafından) koşturulunca macOS süreci dakikalarca dondurabiliyor → uzun `pb` testi zaman aşımına düşüyor; ön planda sorunsuz.

### Reset kapısı ↔ auth yarışı, iz deposu sınırı (2026-09-28)

- **Reset sonrası eski hesap geri geliyordu (Codex #2):** ARC_DB IIFE'si kurulurken `ensureAuth()` refresh token'ı senkron okuyordu; tek seferlik reset kapısı bundan **sonra** çalıştığı için eski uid tazelenip silinen `arc_fb_rt` geri yazılıyordu. Kapı `<head>` script'ine (localStorage guard + debug bayrağından hemen sonra) taşındı → tüm okumalardan önce çalışır. Test (sahte auth): eski sürüm `refresh:OLD_RT → OLDUID`; yeni sürüm `signUp → NEWUID`, `arc_fb_rt = NEW_RT`.
- **Hayalet iz deposu 1000 → 120:** çizim yalnız son 80 izi kullanıyor; 1000 iz localStorage kotasını doldurup coin/upgrade kaydını düşürebilir, her açılışta büyük `JSON.parse` yapardı. Eski büyük depolar ilk okumada bir kez kırpılır. Test: 300 iz → 120.

### Liderlik tablosu: PB güncellemesi, uid tabanlı doküman, asılı istekler, çevrimdışı durum (2026-09-28)

- **PB güncellemesi hiç yazılmıyordu (Codex #1):** eski yol skoru isimle arıyor, güncellemeyi Authorization'sız düz `fetch` ile PATCH ediyordu; kurallar `isAuthed()` + `ownsOld()` istediği için 403. Artık doküman kimliği sabit **`scores/{uid}_{mode}`**: `fbFetch` ile GET (200/404) → varsa updateMask'li kimlikli PATCH, yoksa `currentDocument.exists=false` ile oluşturma. Aynı isimli farklı oyuncular birbirinin kaydına dokunamaz; `dedupeBest` artık `owner` ile gruplar (`parseRows` `owner` döndürür). Firestore bugün sıfırlandığı için taşıma gerekmedi. (Not: admin `dedupeScores` hâlâ isimle grupluyor — yalnız bakım aracı.)
- **Tüm Firestore istekleri sonsuza dek asılı kalabiliyordu:** reCAPTCHA yüklenemezse (reklam engelleyici, zayıf ağ) App Check SDK'nın `getToken`'ı hiç dönmüyor → `fbFetch` bekliyor. Init 6 sn, token 4 sn süre sınırı; `fbFetch` 12 sn sonra `AbortController` ile iptal. "LOADING…'te takılı kalan tablo"nun kök nedeni buydu.
- **Çevrimdışı/hata:** `getTopScores` hata cevabını (403/5xx) boş liste olarak cache'lemiyor (`!res.ok` → hata, `topFailed()`); tablo "Offline — connect to see scores" / "Couldn't load scores — try again" gösterir, başarısız okuma `lbCache`'e yazılmaz (sonraki açılış tekrar dener).
- Test (CDP `Fetch` ile sahte Auth+Firestore, kural taklidi: kimliksiz yazma 403): 1. run → `PATCH scores/UID123_normal exists=false` kimlikli; daha iyi 2. run → updateMask'li kimlikli PATCH, skor 7→356. Firestore tamamen engelliyken tablo 1 sn içinde hata mesajı gösteriyor.

### Çift START/AGAIN, Revive'da enerji, Anchor sızıntısı (2026-09-28, bb68588)

- START/AGAIN hem butona hem sarmalayıcıya dinleyici bağlıydı → tek dokunuş 2 run başlatıp kalkan/item'ı iki kez harcıyordu. Tek dinleyici + 400 ms `_startGate`. Test: kalkan 5→4 (tek tık), AGAIN çift tık tek harcama.
- Revive: enerji en az 0.6'ya çekilir (boş enerjiyle dirilip hemen ölme yok); ghost zaman aşımı yalnız hâlâ oyundaysa ve booster ghost değilse kapatır.
- `resetGame`: `shockWaves`, `brakeT`, `anchorPoint` sıfırlanır (önceki run'dan sızıyordu).

### Müzik zamansız çalıyordu → tek kural (2026-09-28)

`musicAllowed()` = müzik açık + ses başlatıldı + `scene === 'play'` + tutorial değil + ön planda. Tüm girişler (`playBgMusic`: run başı, revive, reklamla devam, tampon geç çözülünce, müzik aç) bu kuraldan geçer; `showScene` oyun dışı her ekranda durdurur.
Düzeltilen kaynaklar: (1) müzik tamponu geç çözülünce hangi ekrandaysa orada başlıyordu; (2) ölümde müzik henüz başlamadıysa "hazır olunca çal" işareti temizlenmiyordu; (3) menüye dönüşte müziği durduran kod yoktu; (4) ölümün 430 ms gecikmeli "durdur"u hızlı yeni run'ın müziğini kesebiliyordu (`_fadeStopT` iptal edilir); (5) `startGame` müziği ekran `play` olmadan çağırıyordu (sıra düzeltildi).
Test (döngülü AudioBufferSource sayımı, gerçek oyuncu akışı): ana ekran/tutorial/game over/menü/ayarlar sessiz; run/yeni run/AGAIN/ön plana dönüş çalıyor; arka planda bağlam askıda; `<audio>` öğesi 0.

### Ses sistemi: tümü Web Audio, ilk dokunuşta hazır, kilit ekranı kartı yok (2026-09-28)

- **Tutorial'da sesler gecikip toplu çalıyordu:** Web Audio bağlamı yalnız START'ta (`startGame → initAudio`) kuruluyordu; tutorial ilk girişte START'tan önce başladığı için dokunuşlar `<audio>` klonlarıyla çalınıyor, iOS bunları sıraya alıp sonradan birden çalıyordu. Artık bağlam **ilk dokunuşta** (`pointerdown/touchend/keydown`, capture) kurulur; tampon hazır değilse ses **atlanır** (`playSfx`). `<audio>` yalnız Web Audio hiç yoksa yedek.
- **Kilit ekranında "Şimdi Çalıyor":** müzik `<audio>` öğesiyle çalıyordu → iOS medya oturumu. Müzik artık **AudioBuffer döngüsü** (`musicBuffer`, `_musicGain`; dosya ~12 sn/200 KB, çözülünce ~4 MB), kaldığı yerden devam (`_musicOffset`), ducking/fade gain üzerinden. Test: hiç `<audio>` öğesi oluşmuyor.
- Uygulama arka plana gidince (`visibilitychange` / `pagehide`) bağlam askıya alınır, dönünce devam.
- Düzeltme: `setSfx` silinen `touchAudioFallback`'e dokunuyordu.

### 🧭 Oturum devri — 2026-09-28 (buradan devam et)

**Bugün yapılanlar (ayrıntılar aşağıdaki girişlerde):** canlı veri sıfırlandı (Firestore + `ARC_RESET_VERSION r-2026-09-28-2`); ekonomi ×1 ölçek (1 m = 1 coin, Extreme ×2, kesirli birikim, 3 yıllık katalog); "−" düğmesi/seviye kırpma düzeltmeleri; upgrade ikonları + info animasyonları (SMIL) + metinler; avatarlar ve glow UI dili (`.gl`); temalar stil olarak (Game Boy / Noir / CRT, canvas paleti `THEME_STYLE`); tutorial "yaparak öğren"; eşyalar (Shield, Gold Rush, Lucky Boost, Doubler 5 run), Mirror kaldırıldı, şok dalgası; küçük ekran (iPhone SE) düzeltmeleri; düşük efekt modu (`LOWFX`); rozetler (madalyon ikon + gerçekçi eşikler + DAREDEVIL / LAST SECOND); en uzun combo = seri sayısı; debug coin (Coins → sayıya 5 dokunuş, `?debug=1`).

**Araçlar:** `tools/bot-econ.mjs` (Firebase engelli bot ölçümü, `PORT_BASE` ile paralel). Test için headless Chrome + CDP; oyun `python3 -m http.server 8765` ile servis edilir. `CODEX_REVIEW_v25.md` çapraz kontrol notu (v25 ekonomi için; sonrası kapsamda değil).

**Sıradaki / açık işler:**
1. ~~Sesler~~ — düzeltildi (aşağıdaki "Ses sistemi" girişi). Gerçek iPhone'da doğrulanmalı.
2. Walls upgrade'i zayıf (maks 5 px). Combo Timer hayatta kalmada Timer'dan verimli.
3. Extreme indirim şartı "5.000 skor" ×3 kalkınca çok zor. Günlük "3.50m tek run" görevi ortalama 2 m'ye göre zor olabilir.
4. IAP paketleri (55/200/450/1100) fiyat noktaları; coin bakiyesi sunucuda doğrulanmıyor (IAP öncesi şart).
5. Market öncesi (SECURITY_NOTES): Firestore okuma maliyeti, UGC moderasyonu, otopilotun release'ten çıkarılması, App Check Enforce (yeni APK sahaya çıktıktan sonra).
6. Gerçek cihaz doğrulaması bekleyenler: Game Boy'da basınca "patlama" (iOS), düşük güç modu, tema geçişleri.

### En uzun combo artık sayı (seri), çarpan değil (2026-09-28)

`stats.maxCombo` eskiden zincir uzunluğuydu — zincir tavanda (×3–×7) bankalanıp sıfırlandığı için 7'yi geçemiyordu ve rozet/görev "×N combo" diyordu. Artık **combo penceresinde art arda toplanan top sayısı** (`_comboStreak`): tavanda bankalama seriyi kesmez (`comboBreak(true)`), yalnız pencereden çıkış/ölüm sıfırlar.
- Bot: upgrade'siz en iyi seri **3**, tam upgrade'le (Timer 12, Combo Timer 4 sn, Max Combo, Magnet) **77**.
- COMBO rozeti: ×3/×4/×5/×6/×7 → **5 / 15 / 30 / 60 / 100** ("Chain N balls in a row"). Eski kademeler yeni eşiği karşılamıyorsa tek seferlik geri alınır (`arc_combo_badge_v2`).
- Günlük combo görevi: "Hit a ×5 combo" (tavan kısıtlı) → "Chain N balls in a row", taban 3 (seriyle 9'a kadar).

### İki yeni özel rozet: DAREDEVIL, LAST SECOND (2026-09-28)

Rozet ızgarası 4 sütun, 14 rozetle son satır yarımdı → 16. İkisi de mevcut mekaniklere dayalı beceri anı:
- **DAREDEVIL** — tek run'da 10 "CLOSE!" yakın geçiş (`_runNearMiss`, `stats.daredevilDone`). 60 sn bot testinde kazanılmadı → gerçekten beceri istiyor.
- **LAST SECOND** — geri sayım **0**'dayken (ölüm öncesi son şans penceresi) yeşil yakalamak (`stats.lastSecondDone`). İlk hâli "1 veya 0" idi; bot 60 sn'de kazandı → fazla kolay, 0'a daraltıldı. Tutorial ve Wife modunda sayılmaz.

### Rozetler yeniden (eşik + madalyon), iz animasyonları, hesap silmede tema (2026-09-28)

**Rozet eşikleri** bot ölçümüne göre (iyi oyuncu ort. 2.1 m/run, en iyi ~7 m, ~2.5 altın/gün); eskilerin çoğu ilk kademede bile erişilemezdi:

| Aile | Eski (I→V) | Yeni (I→V) |
|---|---|---|
| SCORE | 1k / 5k / 20k / 75k / 250k | 500 / 2.000 / 6.000 / 15.000 / 40.000 |
| DISTANCE | 10 / 25 / 50 / 100 / 250 m | 2 / 5 / 10 / 20 / 40 m |
| TRAVELLER | 100 m / 500 m / 2.5 / 10 / 50 km | 50 m / 250 m / 1 / 3 / 10 km |
| GOLD, COLLECTOR | 10 / 50 / 250 / 1.000 / 5.000 | 10 / 50 / 200 / 600 / 1.500 |
| VETERAN | … / 5.000 | 10 / 50 / 250 / 1.000 / 3.000 |
| EXTREME | … / 250 / 1.000 | 1 / 10 / 50 / 200 / 500 |
| COMBO, STREAK, SOCIAL | — | değişmedi |

Özel: SPEEDRUN 60 sn'de 10 m → **5 m**; SURVIVOR 10 m → **8 m**, artık Shield da "ikinci şans" sayılır (`_runShieldArmed`).

**Madalyon ikonları** (`badgeHTML`, `BADGE_GLYPHS`): avatar stili — koyu disk, kademe renginde iç ışık + halka, üstten beyaza açılan parlayan glif (aileye özgü: kupa, bayrak, kuyruklu yıldız, zincir, coin yığını, mücevher, kalkan, alev, şimşek, kişiler, kronometre, ay, kalp, taç), altta kademe noktaları. Rozet ızgarası, takılı yuvalar, leaderboard ve "badge unlocked" bildirimi hepsi madalyon kullanıyor. `ICONS/README.md` notu + tablosu güncellendi.

**İz animasyonları:** Pulse → **Glitter** (iz boyunca yanıp sönen 4 köşeli parıltılar, `drawGlitter`); Glow sabitti → **sinüsle nefes alır** (×1.1 ↔ ×3.0). Pulse sahipleri Glitter'a göçer. Menü önizlemesi düz bir çizgiydi (animasyon görünmüyordu) → seçili renk/kalınlık/animasyonla **canlı canvas önizleme** (menü açıkken rAF). Not: global `canvas{position:absolute;inset:0}` kuralı yüzünden önizleme kutusu `position:relative` olmalı.

**Hesap silmede tema kalıyordu:** Game Boy / Noir'ın canvas paleti yalnız açılışta kurulur; sıfırlama sayfayı yenilemediği için oyun baştan başlıyor ama tema kalıyordu. Artık tema sınıfı hemen kalkar, canvas teması varsa sayfa yenilenir (→ profil oluşturma).

### Düşük efekt modu (iPhone düşük güç modunda kasma) (2026-09-28)

iPhone düşük güç modu rAF'ı ~30 fps'e indirir ve CPU'yu kısar; yeni efektlerle kasıyordu.
- **Ucuzlatma:** START halesi artık dönen gradyeni her karede yeniden bulanıklaştırmıyor (sabit bulanık katman, yalnız opacity/scale canlanır); parıltı `left` yerine `transform` ile → ikisi de kompozitörde.
- **`LOWFX` / `html.lowfx`:** oyun döngüsü 3 sn'lik pencerede kare hızını ölçer (`trackFps`), 42'nin altında (ya da `prefers-reduced-motion`) açılır: START halesi/parıltısı, mod parçacıkları, dönen avatar halkası, segment animasyonları ve **tüm backdrop-filter bulanıklaştırmaları** kapanır (camsı paneller opak olur); canvas'ta `shadowBlur` prototip setter'ı ile 0'a iner. Oynanış aynı. Test: 30 fps taklidi (rAF kare atlama) ve reduced-motion'da açılıyor, normal cihazda kapalı.
- Settings'teki mod düğmelerinden ikonlar kaldırıldı (yazılar sıkışıyordu); efektler duruyor.

### Yetenek/eşya revizyonu + UI: START, mod efektleri, High Scores, Settings (2026-09-28)

**Oynanış**
- **Shockwave:** anlık 200px yarıçap yerine **genişleyen şok dalgası** (`shockWaves`, 820 px/s, 260px'e kadar); halkanın değdiği her engel patlar. Canvas'ta altın halka (`drawShockWaves`).
- **Ghost (Phase Burst / booster):** engelden geçer ama **oyun alanından çıkamaz** — duvardan seker. Phase Burst bitince aktif Ghost booster'ını artık kapatmıyor.
- **Brake:** `player.speed`'i ezmek yerine açısal hıza ×0.5 çarpan (`brakeT`) → Extreme'de de çalışıyor (orada hız her karede yeniden hesaplandığı için etkisizdi).
- **Mirror Flip kaldırıldı** (kullanımı zordu): 6 yetenek, açma merdiveni 6 fiyat (toplam 1.900), BOSS rozeti "6 yetenek", slotta kalan mirror yüklemede boşaltılır.
- **Head Start → Shield** (4 coin): run boyunca **ilk çarpışmayı affeder** — engel parçalanır ya da duvardan seker; topun etrafında mavi balon, kırılınca mavi halka. Eski Head Start stoğu Shield'a devredilir. (Head Start'ın ölçülür bir faydası yoktu; oyunun başında zaten az engel var.)

**Info / animasyonlar:** GOT IT → **BACK**; Speed: yan yana yavaş/normal/hızlı; Max Combo: puan rakamları yerine "×7'ye kadar puan"; Time Slow: engeller normal → belirgin yavaş → normal (mavi ton); Brake: yol üstünde yavaşlama; Shockwave: büyüyen halka, engel değdiği anda patlar; Shield sahnesi.

**UI**
- **START / AGAIN:** dönen gökkuşağı çerçevenin arkasında nefes alan bulanık hale, camsı iç, parıltı süpürmesi, oynat ikonu.
- **Mod efektleri hiç görünmüyordu:** `tickModeDeco` yalnız `home` sahnesinde çalışıyordu ama mod seçici Settings'te → düzeltildi. Mod düğmelerine ikon (dönen kar tanesi / titreyen alev), aktif göstergeye buz ışıltısı / alev nabzı. İkonlar ve parçacıklar panelin glow degradesinden muaf (lila görünüyordu).
- **Settings'te Extreme'in sağında 1px boşluk:** segment göstergesi tam sayı `offsetWidth` ile ölçülüyordu → kesirli rect (+açılış scale düzeltmesi), son düğme iç kenara uzar. Ölçüm: 0px.
- **Settings çakışması (benim küçük ekran düzeltmemin yan etkisi):** panel `margin-top:auto` ile dibe iniyordu, Backup/Restore/Delete hâlâ `absolute` dipteydi → uzun ekranda bile üst üste biniyordu. Artık her boyda akışta.
- **Theme** kendi çerçevesinde ("APPEARANCE").
- **High Scores:** ALL-TIME/TODAY/MONTH kartları tek altın ailesi (sıralama rengi), ikonlu (taç/güneş/takvim), kare değil; boşken iki "—" yerine tek sönük "NO RECORD". Sıra numaraları altın.

### Game Boy teması: filtre → gerçek LCD stili; Coins'te "next coin" (2026-09-28)

- **Game Boy "düğmeye basınca patlıyordu" (iOS):** menü katmanlarına uygulanan SVG filtresi (`#fx-gb-ui`) Safari'de yazılımla hesaplanıyor; basınca `transform` tüm filtre alanını yeniden çizdiriyordu. Profil ekranı da tam boyanmıyordu. Artık arayüz 4 tonlu LCD paleti doğrudan CSS (`--gb0..3`): düz yüzeyler, gölge/parlama/blur yok, seçili/onay öğeleri "ters" (açık zemin, koyu yazı), basınca küçülme yerine zemin değişir. Filtre yalnız küçük görsellerde (img, satır içi svg, avatar). Üstte **nokta matrisi LCD ızgarası** (`body::after`, 3px) — CRT'nin tarama çizgisinden farklı. Canvas zaten `THEME_STYLE` ile çizim anında boyanıyor.
- **Coins penceresi:** "TODAY x/25" (günlük yumuşak tavan) yerine **NEXT COIN · 0.64M TO GO** + birikmiş oran çubuğu (`coinCarry`). Kalan mesafe Extreme ×2'yi ve tavan aşıldıysa ×0.4'ü hesaba katar ("REDUCED RATE").

### Küçük ekran düzeltmeleri — iPhone SE (2026-09-28)

Bildirilen: iPhone SE'de ilk girişteki profil paneli ekrandan taşıyordu. Headless ölçüm (375×667, Safari çubuklarıyla 375×553, SE1 320×568 ve 320×460) — her ekran/pencere için taşma px:
- **Profil oluşturma:** 639px panel, 553'te iki yandan 43px, 460'ta 75px kesiliyordu. Kök neden: `.screen` `justify-content: center` → sığmayınca üstten de taşıyor ve kaydırılamıyordu.
- **Settings:** Backup/Restore/Delete/How-to-play `position: absolute; bottom` → kısa ekranda (Theme satırı eklenince) panelin üstüne biniyordu.
- **Quests:** 460'ta başlık üstten kesiliyordu.
- İlk girişte **Daily Login bildirimi** profil panelinin başlığını/isim kutusunu kapatıyordu.

Düzeltme: `#profile-setup`, `#settings`, `#gameover` → `flex-start` + `overflow-y: auto` + ilk/son çocukta `margin: auto` (sığarsa ortada, sığmazsa üstten başlar ve kayar), safe-area padding. `max-height: 700px`'te profil paneli sıkışır (639 → 502px, SE'de Safari'yle tam sığar) ve Settings'in alt düğmeleri akışa girer. `max-height: 620px`'te tüm pencere kutuları ekranı aşmaz, içerik kutuda kayar. Ödül bildirimleri profil oluşturma sırasında da kuyrukta bekler (`_tutOn`).

### Temalar stile çevrildi (3 tema), tutorial yeniden yazıldı, renk rolleri (2026-09-28)

**Temalar: filtre değil stil.** Dither, 1-Bit, Synthwave, Blueprint ve Thermal kaldırıldı; kalanlar **Game Boy, Noir, CRT Arcade**.
- **Oyun alanı:** `CanvasRenderingContext2D.prototype`'taki `fillStyle` / `strokeStyle` / `shadowColor` setter'ları ve degrade `addColorStop` araya girilerek her renk çizim anında paletten seçiliyor (`THEME_STYLE`, `themeColor()`). Game Boy: parlaklık → 4 yeşil; Noir: kontrastlı gri. Alfa korunur → ışımalar yumuşak; sonuç önbellekte (`_tCache`); tema yoksa katman hiç kurulmaz. Kayıtlı tema `upg`'den önce ham localStorage'dan (yalnız bilinen stiller) okunur, ilk `getContext`'ten önce kurulur. Tema değişince sayfa bir kez yenilenir (önbellekli degrade/sprite'lar yeni paletle kurulsun).
- **Arayüz:** yalnız `body > :not(.stack)` (menüler) — Noir `grayscale+contrast`, Game Boy yumuşak tablo eşlemesi (`#fx-gb-ui`, discrete değil → bantlaşma/titreme yok). Oyun alanına filtre uygulanmıyor → her kare tüm ekranı işleyen maliyet yok. CRT: yalnız tarama çizgisi + vinyet katmanı.
- Önizlemeler de filtre değil aynı `themeColor` paletiyle çiziliyor.

**Tutorial (yaparak öğren).** Eski hâlinde 4 sahnenin hepsi "oku → dokun" idi; oyuncu hiçbir şey yapmıyordu, **enerji geri sayımı ve duvarlar hiç anlatılmıyordu**. Yeni akış (pratik yavaş çekimde ×0.6, ölüm/enerji kaybı yok, duvarda seker):
1. TURN — top durur, dokun → gerçekten döner
2. GREEN — ileride yeşil, oyuncu kendi dokunuşlarıyla toplar; kaçırırsa yenisi + ipucu
3. ENERGY — top durur, sayı nabız halkasıyla vurgulanır, geri sayım canlı gösterilir (8→3→dolar)
4. RED — yolda engel + duvarlar yanıp söner; yanından geçmeli, çarparsa engel yeniden
5. GO! — kesintisiz gerçek run
Düzeltilenler: `#hud.tutorial` kuralı hiç yoktu (HUD tutorial'da görünüyordu); ödül bildirimleri tutorial bitene kadar kuyrukta bekliyor (`_tutOn`, TDZ güvenli); pratik sahnelerinde yazı altta (`#tut-text.bottom`). Otopilot artık tutorial'ın pratik sahnelerinde de oynuyor → uçtan uca test edilebilir.

**Renk karışıklıkları.** Glow dili uygulanırken davet/challenge penceresine (`friends-modal`, iç öğeleri camgöbeği) yeşil verilmişti → karışıklığın kaynağı buydu. Challenge/Share/davet tümüyle **mavi** (`gl-blue`, `rgba(61,139,255)`, paylaşılan skor kartı dahil); oyun sonu "arkadaş ekle" Friends ile aynı yeşil; Extreme turuncu (orijinali ateş), Revive gül (orijinali pembe-kırmızı), Analysis lila. Renk rolleri `.gl` CSS'inin başına yorum olarak yazıldı. Davet rozeti "+5" diyordu (ödül 10) → düzeltildi.

### Glow UI dili, 8 satın alınabilir tema, eşyalar yeniden tasarlandı (2026-09-28)

**Eşyalar — ölçümle karar verildi.** `tools/bot-econ.mjs` ile her eşya takılıyken 10–15 run (5 varyant paralel, Firebase engelli): hiçbirinin etkisi run'dan run'a dalgalanmayı aşmıyordu (ort. 1.3–1.8 m, 1.4–1.9 coin/run). Coin Rain altını *artırmadı* bile (0.13 vs 0.21 — altın zaten nadir). Yeniden tasarım (anahtarlar aynı, kayıtlar bozulmaz):

| Anahtar | Yeni hâli | Fiyat |
|---|---|---|
| `revive` | Aynı (tek gerçekten işe yarayan) | 7 |
| `doubler` | Bir adet **5 run** ×2 coin verir (`inv.doubler.runsLeft`, kurcalamaya karşı kırpılır; kartta `· N▸`) | 2 → 6 |
| `headstart` | Yarı hız yerine run **10 sn Ghost** ile başlar (engel+duvar geçer). Pre-Booster da takılıysa ghost bitince başlar (`_runPreboostQueued`) | 3 → 4 |
| `coinrain` → **Gold Rush** | Altın **×4** ve 0 m'den itibaren (normalde 30 cm sonra) | 3 |
| `preboost` | Havuzdan Narrow çıktı, süre **2×** | 3 |
| `filter` → **Lucky Boost** | Booster havuzunu kısıtlamak yerine o run'daki **tüm booster'lar 2× uzun** (`runLuckyBoost`, `applyBooster(type, durOverride)`) | 5 |

Not: `hasShield` ölü kod — BOOSTER_INFO'da `shield` yok, hiç true olmuyor.

**Glow UI dili.** Avatar stili (koyu zemin + vurgu rengiyle iç ışık + ince halka + üstten beyaza açılan parlayan ikon) ortak CSS'e dönüştü: `.gl` + `.gl-<renk>` (`--c`, `--gg`), yarı saydamlar için `.gl-glass`. İkon degradesi `#glow-defs`'teki `gg-<renk>` (userSpaceOnUse). Kurallar `html#arc` önekli → mevcut `#id` kurallarını ezer; `color-mix` bilmeyen tarayıcı bloğu düşürür, eski görünüm kalır. Uygulanan: ana ekran, 23 modal kutusu, Settings/Profile Setup/Game Over panelleri, ödül kartı, tüm `.btn-gray`.

**Temalar (Settings → Theme, `THEMES`).** `<html class="theme-<id>">` → CSS `body`'ye filtre (oyun alanı dahil). id sınıf adına girdiği için yalnız THEMES'teki değerler kabul edilir (`applyTheme`). `upg.theme`, `upg.themesOwned`.

| Tema | Yöntem | Fiyat |
|---|---|---|
| Dither | SVG: 4×4 Bayer + kanal başı 4 seviye | 60 |
| Game Boy | SVG: gri → 4 yeşil (discrete) | 50 |
| CRT Arcade | CSS filtre + `body::after` tarama çizgisi/vinyet | 40 |
| 1-Bit | SVG: gri + Bayer → siyah/beyaz | 60 |
| Synthwave | SVG: gri → mor/pembe/camgöbeği tablo | 50 |
| Noir | CSS gri+kontrast + `body::after` gren | 40 |
| Blueprint | SVG: iki ton mavi | 45 |
| Thermal | SVG: ısı kamerası tablosu | 50 |

⚠️ Filtre her karede tüm ekrana uygulanıyor. Headless'ta 60 FPS'e dokunmadı ama GPU'suz test telefonu yansıtmaz — **gerçek cihazda denenmeli**; takılırsa filtreyi oyun alanından çıkarıp yalnız menülere uygula.

**Diğer:** info animasyonlarında engeller daire (oyundaki gibi, `obst()`); Game Over coin satırından "next coin %" kaldırıldı (çubuk zaten gösteriyor); `tools/bot-econ.mjs` `PORT_BASE` (paralel süreçler) + 40 sn Chrome bağlanma beklemesi.

### Upgrade ikonları, info animasyonları ve avatarlar yenilendi (2026-09-28)

- **İkon seti (`UPG_ART.icons`, `ICONS['u-<key>']`):** 21 upgrade/gear ikonu tek stilde yeniden çizildi (24×24, 1.8px çizgi + %22 dolgu, currentColor). Renkli emoji-benzeri üç ikon (madalya, alev, roket) ve paylaşılan ikonlar (Doubler/Coin Rain, Combo Timer/Time Slow, Filter/Shockwave) ayrıştırıldı; Brake'teki okunmayan "STOP" yazısı kaldırıldı. Slot HUD da yeni ikonları kullanıyor.
- **Info penceresi (`#upginfo-modal`, `openUpgInfo`):** 1.6 sn'lik toast yerine kapatılana kadar açık kalan pencere: SMIL animasyonu (`UPG_ART.anims`, 21 sahne, JS gerektirmez), normal harfli açıklama, CORE için NOW/NEXT, yetenek için süre/recharge, eşya için stok. Kapanınca animasyon DOM'dan silinir. Info düğmesi italik serif "I" yerine SVG glif.
- **Metinler** oyunun gerçek davranışına göre düzeltildi (tek kaynak: `CORE_DESC` / `ABILITY_DESC` / `CONSUMABLE_CFG.desc`): Revive otomatik değil soruluyor ve run başına 1; Combo Timer toplam hayatta kalma süresini de uzatıyor; Timer yeşil/mor puanını da artırıyor; Anchor'da ikinci kullanım recharge bekliyor; Coin Rain'deki "altın coin verir" ima'sı düzeltildi; Radius/Speed'de iki yönlü satın alma anlatıldı.
- **Avatarlar (`_avSVGs`):** 20 avatar tek stilde yeniden çizildi (renkli iç ışık + ince halka + degradeli parlayan glif). Sıra/isim/renk korundu (`avatarIdx` Firestore'da saklanıyor).
- **Bilinen hatalar (düzeltilmedi):** Brake Extreme'de çalışmıyor (hız her karede yeniden hesaplanıyor); Phase Burst bitince aktif Ghost booster'ını da kapatıyor.

### v25 — Ekonomi ×1 ölçeğine indi (1 m = 1 coin), 3 yıllık katalog, veri sıfırlama (2026-09-28)

**Canlı veri sıfırlandı.** Firestore'daki tüm koleksiyonlar (`scores`, `players`, `wallets`, `friendreqs`; `referrals` zaten boştu) `firebase firestore:delete --all-collections` ile silindi. Silmeden önce 35 doküman yedeklendi: `~/Desktop/Projects/Games/ArcRise_firestore_backup_2026-09-28/` (repo dışı). Gerçek IAP alımı yoktu (`wallets.purchased` hiçbir dokümanda yok). İstemci tarafında `ARC_RESET_VERSION` iki kez artırıldı (`r-2026-09-28-1`, sonra ölçek değişince `-2`) → her cihaz açılışta `arc_*` anahtarlarını (`arc_fb_rt` dahil) siler ve **yeni anonim uid** ile başlar, bu yüzden buluttaki eski ×12 cüzdanlara hiç bağlanmaz. ⚠️ Eski APK'lar sıfırlanmaz — yeni Android build gerekli.

**Neden: v23 simülasyonu gerçek oynanışla tutmuyordu.** `ARC_BOT` ile ölçüldü (upgrade'siz, Normal, 50 run, Firebase istekleri tarayıcıda engellenerek): ortalama **2.13 m/run** (medyan 1.68, run'ların %40'ı < 1 m), 0.24 altın/run, 41 sn/run. v23'ün varsaydığı ~17 coin/run yerine gerçekte ~4 coin/run çıkıyordu; günlük gelirin yarısından fazlası login/görevden geliyordu (v23'ün düzeltmek istediği "gelir takvimden geliyor" sorunu geri gelmişti). Bot iyi bir oyuncuyu temsil ediyor → insanlar için üst sınır.

**Yeni gelir modeli (×1 ölçek)**
- `COIN_PER_M = 1`, `COIN_EXTREME_MUL = 2` (Extreme'de metre ×2, altın hariç), `COIN_PER_GOLD = 1`.
- **Kesirli birikim:** run kazancı kesirli hesaplanır, kalan `arc_coin_carry`'de sonraki run'a devreder → 1 m'ye varmayan run bile boşa gitmez. Game over çubuğu sayımdan sonra bir sonraki coin'e biriken yüzdeyi gösterir ("next coin 40%").
- `applySoftCap` artık kesirli; `COIN_DAY_SOFT` 150 → **25** (normal oyuncu ~25 m/gün, tavana takılmaz; grinder ~2× ilerler).
- Ödüller: login **1**, görev **2** × 3, hepsi bonusu **1** (günlük toplam 8), ilk oyun 3, davet 10 (HTML'deki "5 coins" metni eskimişti, düzeltildi).
- Normal oyuncu ≈ 25 (run) + 8 (görev) = **~33 coin/gün**.

**Extreme:** skor ×3 kaldırıldı (`getScoreMul` her modda 1.5), yerine **coin ×2**. Popup "Coins ×2", `store_listing.md` güncellendi. Açma 45 / indirimli 6. ⚠️ İndirim şartı "5.000 skor" ×3 gidince çok zorlaştı (bot Normal'de max 2.834) — gözden geçirilmeli.

**Katalog: normal oyuncu için ~3 yıl (36.131 coin).** İlk seviyeler 1-2 günlük, geometrik dikleşir. Timer / Combo Timer / Max Combo en güçlü eksenler → diğerlerinin 2 katı ağırlık.

| Blok | Fiyatlar | Toplam |
|---|---|---|
| Score Boost ×10 | 3, 6, 14, 30, 60, 130, 280, 600, 1250, 2700 | 5.073 |
| Radius / Speed (yön başı ×4) | 3, 16, 85, 440 | 544 × 4 |
| Timer ×4 | 15, 95, 580, 3550 | 4.240 |
| Combo Timer ×4 | 8, 60, 490, 3800 | 4.358 |
| Max Combo ×4 | 7, 55, 460, 3700 | 4.222 |
| Walls ×5 | 4, 16, 60, 240, 940 | 1.260 |
| Magnet ×8 | 3, 8, 19, 45, 120, 300, 740, 1850 | 3.085 |
| Ability açma (sıraya göre) | 30, 60, 120, 240, 480, 970, 1950 | 3.850 |
| Ability süresi ×4 (3 yetenek) | 7, 40, 230, 1350 | 1.627 × 3 |
| Gear slot ×4 | 6, 45, 340, 2550 | 2.941 |
| Extreme | 45 | 45 |

Kozmetik, consumable ve IAP ~÷9 ölçeklendi (renk 3, gradyen 10, rainbow 28, custom 65, show 45, tomb/name 55; revive 7, doubler 2, headstart/coinrain/preboost 3, filter 5; IAP 55/200/450/1100). Kozmetikler 3 yıl hedefinin dışında.

**Upgrade etkileri**
- **Max Combo tavanı ×12 → ×7** (`COMBOMAX_PRICES` 4 seviye). COMBO rozeti kademeleri [3,5,7,9,12] → **[3,4,5,6,7]**.
- **Magnet nerf:** seviye başı +22 px → **+1 mm yarıçap** (`MAG_PX_PER_LVL = H_REF / CM_PER_SCREEN / 10` ≈ 7.1 px). Max 176 px → ~57 px. Etiket artık "+3mm".
- **Ability açma fiyatı** yeteneğe değil **kaçıncı açılış olduğuna** bağlı (`ABILITY_UNLOCK_PRICES`, `abilityUnlockPrice()`); `ABILITY_CFG.unlock` alanı kaldırıldı.

**Hata düzeltmeleri**
- **"−" düğmesi parayı yakıyordu.** Tek yönlü CORE'larda (Score Boost, Timer…) ve ability süresinde seviye düşürüp geri çıkınca aynı seviye tekrar ücretli satın alınıyordu. Artık satın alınmış tavan ayrıca saklanıyor: `upg.coreOwned[key]` (radius/speed'deki `Pos`/`Neg` modeli) ve `upg.inv[k].durOwn`. Tavana kadar − / + ücretsiz.
- **Seviyeler yüklemede kırpılmıyordu** (localStorage'da `comboMax: 100000` → combo tavanı kalkıp skor patlıyordu). `clampCoreLevels()` ve `clampAbilityLadders()` her yüklemede katalog tavanına kırpar.
- **"Hit a ×N combo" görevi** 5'ten başlıyordu (seriyle 15'e kadar) ama taban tavan ×3 → Max Combo almamış oyuncu görevi hiç tamamlayamıyordu (v24'ten beri). Hedef artık `min(hedef, comboCap())`.
- `verify-sync.js`: `capacitor.config.json` md5 yerine JSON içeriğiyle karşılaştırılıyor (Capacitor 8 dosyayı tab'la yeniden yazıyor, içerik aynıyken "FARKLI" diyordu).

**Açık kalanlar**
- Walls çok zayıf (max 5 px, 18 px'lik topta) — etkisi büyütülmeli.
- Combo Timer hayatta kalma için Timer'dan hâlâ daha verimli (enerji = Timer × pencere/2).
- Extreme dakika başına ~2.3× coin veriyor; günlük tavan sınırlıyor ama izlenmeli.
- Rakamlar bot üst sınırına dayanıyor → canlıda 1-2 hafta gerçek mesafe verisiyle tek çarpanla ince ayar.
- IAP paketleri (55/200/450/1100) fiyat noktaları yeniden değerlendirilmeli.

### Güvenlik denetimi — App Check devrede, localStorage→DOM enjeksiyonu kapatıldı, 8 haftalık build drift'i yakalandı (2026-08-26)

Ayrıntılı kayıt: **`SECURITY_NOTES.md` → "4. tur (2026-08-26)"**. Burada özet + devlog'a düşen sonuçlar.

**KRİTİK bulgu: APK'ya paketlenen web kopyası 8 hafta eskiydi**
- `android/app/src/main/assets/public/arcrise.html` 1 Tem tarihliydi — içinde **ne `esc()`, ne CSP, ne `toUid`** vardı. Yani 2026-07-02 güvenlik geçişinin (v20) hiçbiri Android build'inde yoktu.
- `assets/capacitor.config.json` hâlâ `allowMixedContent: true` içeriyordu; root'tan kaldırılmıştı ama Capacitor runtime'da **assets'teki** kopyayı okuduğu için ayar hiç yürürlükten kalkmamıştı.
- **Neden görünmedi:** `www/` ve `android/app/src/main/assets/` `.gitignore`'da → aralarındaki drift git'e hiç yansımıyor.
- Her iki kopya root ile birebir eşitlendi (md5 doğrulandı) + **`verify-sync.js` / `npm run verify`** eklendi. `npm run sync` artık sonunda otomatik doğruluyor, fark varsa 1 ile çıkar. **Build öncesi zorunlu adım.**

**localStorage → CSS/HTML enjeksiyonu (hesap devralmaya kadar giden zincir)**
- `upg.customGrad` ve `upg.traceColor` ham hâlde `style="background:${...}"` içine giriyordu. `arc_upg` kurcalanırsa attribute kırılır, CSP'de `unsafe-inline` olduğu için JS çalışır, oradan `arc_fb_rt` (Firebase refresh token) okunup hesap devralınırdı.
- `loadUpg()` içinde tek noktadan beyaz listeye bağlandı (`SAFE_CSS_VALUE` / `SAFE_TRACE_ID`). `SAFE_TRACE_ID` charset'inde `:` **bilerek** var — `rb:warm` gibi meşru id'ler elenmesin diye.
- `arc_avatar_custom` artık yalnızca gerçek `data:image/...;base64,...` kabul ediyor (önce ham hâlde `<img src="${...}">` içine giriyordu).
- `traceColorCss(id)` tip guard'ı: bozuk localStorage'da `id.charAt` TypeError atıp **upgrade ekranını çökertiyordu**.
- `esc()` kalan noktalara yayıldı: quest label (`arc_quests_v1`'den geliyor), friendreq `data-acc`/`data-rej`, arkadaş `data-id` (×2).

**AndroidManifest — `android:allowBackup` true → false**

Hesabın tam anahtarı (`arc_fb_rt`) WebView localStorage'ında duruyor. `true` iken Android Auto Backup onu kullanıcının Drive yedeğine ve cihaz-cihaz transferine dahil ediyordu. Anonim refresh token'ın süresi dolmaz ve iptal edilemez → sızarsa **kalıcı** erişim.

**App Check — KURULDU (şimdilik monitor modu)**
- reCAPTCHA v3 sitesi oluşturuldu; domainler `bugrasulukcu.github.io` + `localhost` (Capacitor `androidScheme: https` olduğu için WebView origin'i `https://localhost`).
- `FIREBASE_CONFIG.appId` + `appCheckSiteKey` dolu → `_appCheckInit()` SDK'yi yüklüyor, `fbFetch` her Firestore/Auth isteğine `X-Firebase-AppCheck` header'ı ekliyor. CSP zaten gstatic/google.com/recaptcha ve firebaseappcheck hostlarına izinliydi.
- Console: App Check > Apps = **Registered**, APIs > Cloud Firestore = **Unenforced (monitor)**.
- ⚠️ **KALAN ADIM:** yeni Android build'i sahaya çıktıktan birkaç gün sonra, metrics'te istekler "verified" akmaya başlayınca **Enforce** et. **Sıra önemli** — tersi olursa eski APK'lar Firestore'a yazamaz. Enforce edilmeden sahte REST istekleri engellenmez.

**Cloud Console (yapıldı)**
- Android API anahtarı 25 API → **5** (Firestore, Identity Toolkit, Token Service, Installations, App Check). Web anahtarı 25 API → **4**; liste `arcrise.html:52`'deki CSP `connect-src` ile birebir aynı.
- `android/app/google-services.json` git takibinden çıkarıldı; GitHub secret scanning alert'leri (#1, #2) `wont_fix` + açıklama ile kapatıldı.
- **Doğrulandı:** canlı Firestore kuralları `firestore.rules` ile birebir aynı (3 turun tamamı publish edilmiş) → TODO'daki "rules test mode'da" maddesi geçersiz.
- **Doğrulandı:** projede billing account yok (Spark planı). Yani anahtar kötüye kullanımı fatura riski değil, **ücretsiz kota** riski. Blaze'e geçilirse ilk iş bütçe uyarısı kurmak.

**Firebase CLI deploy config**

`.firebaserc` + `firebase.json` eklendi → kurallar artık Console'a elle yapıştırmak yerine `firebase deploy --only firestore:rules` ile gidiyor (bir kerelik `firebase login` gerekiyor).

**Market öncesi açık liste (henüz YAPILMADI)** — tamamı `SECURITY_NOTES.md` sonunda, öncelik sırasıyla. En kritik üçü:

1. **Firestore okuma maliyeti — launch riski + DoS vektörü.** `getTopScores` mode filtresini client'ta yapıyor (composite index yok, `firestore.indexes.json` dosyası bile yok), telafi için `n*6+30` (tavan 250) doküman çekiyor; `arcrise.html:8423` her skor gönderiminde cache'i temizliyor → neredeyse her run yeni tam sorgu. Spark limiti **50.000 okuma/gün**; birkaç düzine aktif oyuncu günü doldurur, kota bitince Firestore 429 döner ve leaderboard **herkes için** gün sonuna kadar ölür. App Check bunu durdurmaz (istek meşru istemciden, geçerli token'la geliyor). Çözüm: `(mode ASC, score DESC)` composite index + sorguya `where mode == X` (250 → ~20 okuma) + tüm cache'i temizlemek yerine yalnızca kendi satırını yerelde güncelle.
2. **UGC moderasyonu yok → Play reddi riski.** Public leaderboard'da serbest isimler + yabancılardan arkadaşlık isteği var ama kodda `report`/`block`/`mute` yok. Minimum: "report player" düğmesi + isim kaydında kara liste.
3. **Otopilot production'da açık.** `?bot=1` / `ARC_BOT.toggle()` tam otomatik oynuyor ve skorları normal `submitScore` yolundan public leaderboard'a yazıyor; App Check durdurmaz. Release build'de derleme dışı bırakılmalı.

### v24 — Combo yeniden yazıldı: tavanlı lineer zincir + Max Combo yükseltmesi (2026-08-26)

Ekonomi düzeldikten sonra **skor ekseni** ölçüldü ve tek başına ekonomiden daha kırıktı: skor formülünün tamamı tek bir zincire bağlıydı.

**Bulgular**
- **Combo eksponansiyeldi ve TAVANSIZDI.** Her link `10 · 1.5^(n-1)` veriyordu; zincir toplamı `20·(1.5^n − 1)`. 38'lik bir zincir tek başına **~98 milyon** puan basıyor — run'ın geri kalanı (mesafe, altın, hayatta kalma) ölçüm dışı kalıyordu. Skor "ne kadar iyi oynadın"ı değil "bir kez ne kadar uzun zincir tutturdun"u ölçüyordu.
- **Sunucu tavanı hiçbir şeyi elemiyordu.** `firestore.rules > validScore` sınırı 1.000.000.000 (1 milyar) idi; tavansız eğriyle 128 milyonluk bir run rahatça geçiyordu. Tavan pratikte kapalıydı.
- **COMBO rozeti combo saymıyordu.** HUD güncellemesinde `stats.maxCombo = countdown` yazılıyordu — `countdown` zincir değil **enerji kademesi** (8..12). Yani tek bir combo yapmadan, sadece timer dolu olduğu için rozetin 5 ve 9 kademeleri açılıyordu. Üstelik eski eşiklerin son üçü ([15, 25, 50]) gerçek zincirle **hiç** erişilemezdi.

**Yeni eğri — lineer link, tavanlı zincir**
```js
_comboPot += 10 * runCombo;              // 10, 20, 30, … (eskiden 10·1.5^(n-1))
if (runCombo >= comboCap()) comboBreak(); // tavana varınca pot bankalanır, zincir sıfırlanır
```
- Zincir toplamı `5·n·(n+1)` — **karesel ve okunur**, patlamasız.
- Zincir uzunluğu `comboCap()` ile tavanlı; tavana varınca pot otomatik patlar ve oyuncu yeni zincire başlar.
- Sonuç: skor artık "en uzun tek zincir"i değil **run boyunca kurulan zincir SAYISINI** ödüllendiriyor → oyun süresiyle doğrusal.
- Sahnedeki etiket tavanı da yazıyor (`COMBO ×4/7`) — yükseltme ekseni oyuncuya görünür.

**Yeni CORE yükseltmesi: Max Combo (`comboMax`)**

CORE'un en güçlü skor ekseni olduğu için en uzun ve en pahalı merdiven: **9 seviye, toplam 2.530 coin** (katalog toplamı 11.875 → **14.405**).

| Seviye | Tavan | Zincir başına puan | Fiyat |
|---|---|---|---|
| taban | ×3 | 60 | — |
| 3 | ×6 | 210 | 60/90/130 |
| 6 | ×9 | 450 | +180/240/310 |
| 9 | ×12 | **780** | +400/500/620 |

`COMBO_CAP_BASE = 3`, `comboCap() = 3 + upg.comboMax`. Eski kayıtlarda anahtar yok → `loadUpg`'ın `Object.assign` merge'i 0 veriyor, ayrı migrasyon gerekmedi.

**Skor tavanı 1 milyar → 50 milyon** (`arcrise.html` + `firestore.rules`, iki yerde de aynı sayı)
Tavanlı eğriyle en uzun makul run ~1M mertebesinde kalıyor; 50M = ~50× başlık payı. Meşru skoru reddetmez, saçmalığı sunucuda keser. İstemci tarafı `submitScore`'da da eliyor — **sadece** rules'a bırakılsaydı oyun "kaydettim" sanıp sessizce hiçbir şey yazmayacaktı.
⚠️ İki sayı **birebir aynı** tutulmalı; ayrışırsa istemci gönderir, sunucu reddeder, run sessizce kaybolur.

**Rozet eşikleri tavan merdiveninin içine alındı**
`[5, 9, 15, 25, 50]` → **`[3, 5, 7, 9, 12]`** — sırasıyla comboMax lvl 0 / 2 / 4 / 6 / 9. Son kademe ancak merdiven tam alınmışsa mümkün.
HUD'daki `stats.maxCombo = countdown` yazımı kaldırıldı; gerçek zincir uzunluğu zaten `_runMaxCombo`'da tutuluyor ve `endGame`'de stats'a yazılıyor.

**One-shot reset (`arc_combo_reset_v24`)**
`maxCombo`, `bestNormal`, `bestExtreme`, `scoreLifetime` sıfırlanır: eski skorlar tavansız 1.5^n eğrisinden geliyor ve yeni ölçekle kıyaslanamaz, `maxCombo` ise zincir değil enerji kademesi tutuyordu. Mesafe rekorları combo'dan etkilenmediği için **dokunulmadı**.
Buluttaki `scores` koleksiyonu kontrol edildi — en yüksek kayıt **10.611**, şişmiş skor yok, purge gerekmedi.

⚠️ **Deploy gerekiyor**: `firestore.rules` (v24 tavanı + hâlâ bekleyen `wallets/{uid}` bloğu) Console'a yapıştırılıp Publish edilmeli.

---

### v23 — Ekonomi elden geçirildi: run-başı musluk + ×12 yeniden değerleme (2026-07-31)

IAP açılmadan önce ekonominin tamamı incelendi. Üç yapısal kırık bulundu ve düzeltildi.

**Bulgular (düzeltme öncesi ölçüm)**
- **Musluk ~10. günde ölüyordu.** Coin N için kümülatif `N(N+1)/2` metre gerekiyordu; marjinal gelir `1/√(2m)` ile sönümleniyor. 30. gün oyuncusu için **fazladan 1 metre = 0.026 coin** → 25m'lik bir gün 0.65 coin. Aynı gün sadece uygulamayı açmak 1 coin (login) veriyordu. Bir beceri arcade'inde gelirin %80'i takvimden geliyordu.
- **Coin Doubler matematiksel olarak her zaman zarardı.** 3 coin'e alınıyor, 30. günde 4m'lik bir run'da **0.10 coin** getiriyordu. Başabaş için tek runda 116m gerekiyordu (en zor mesafe rozeti 250m).
- **Coin Rain hiç coin vermiyordu.** Altın top spawn'ını 2× yapıyor ama altın toplar `scoreBonus` veriyor. İsim/ikon/açıklama üçü de coin diyordu.

**Yeni musluk (sönümsüz, run-başı)**
```js
COIN_PER_M = 2, COIN_PER_GOLD = 1        // mesafe × 2 + altın top × 1
COIN_DAY_SOFT = 150, COIN_SOFT_RATE = 0.4 // günlük yumuşak tavan (asla sıfırlanmaz)
```
- Lifetime decay yerine **günlük yumuşak tavan**: eşiğe kadar tam oran, sonrası %40. Grinder 60 run oynayınca engaged'ın 3× değil ~2× gelirini alıyor.
- **Altın toplar artık coin ödüyor** → Coin Rain dürüst hale geldi, Coin Doubler gerçek bir karar oldu.
- Kazanç defteri açıkça tutuluyor (`arc_coins_earned`); `distTotal` artık coin'i beslemiyor, salt istatistik odometresi. Migrasyon eski üçgensel defterden bakiyeyi birebir türetiyor.
- `grantCoins` artık `coinsSpent`'i negatife itmek yerine kazanç defterine yazıyor. Ödül/IAP coin'i **günlük tavana tabi değil** — tavan yalnız run grind'ini dengeliyor.
- `devCheatBoost` artık `distTotal`'a dokunmuyor (eski hâli test cihazını gerçek oyuncudan farklı bir ekonomiye sokuyordu).

**×12 yeniden değerleme (`arc_denom_v23`)**
2-3-4'lük fiyatların dokusu yoktu: her tek alım bedava gibi, toplam ulaşılmazdı. Tüm katalog ×12 ölçeğine taşındı; mevcut oyuncunun **kazanç ve harcama defterlerinin ikisi de** ölçekleniyor → bakiye ×12, sahip olunan yükseltmeler (`upg` içinde) aynen kalıyor.

| Blok | Yeni |
|---|---|
| CORE radius/speed (yön başına) | 25 / 40 / 60 / 85 |
| Score Boost ×10 | 25→70 artan (475) |
| **Timer ×4** | 120 / 180 / 260 / 360 (**920**) |
| Combo Timer ×4 | 70 / 100 / 140 / 190 (500) |
| Walls ×5 · Magnet ×8 | 315 · 460 |
| Slot 1-4 | 50 / 150 / 400 / 900 |
| Ability unlock ×7 | 250 |
| Ability süre merdiveni | **10 → 4 seviye**: 60/90/130/180, adım +0.5s → **+1.0s** |
| Consumable | revive 60 · doubler 12 · headstart 30 · coinrain 25 · preboost 25 · filter 45 |
| Kozmetik | renk 30 · gradyen 90 · rainbow 250 · custom 600 · show 400 · tomb/name 500 |
| Extreme | 400 direkt / 50 indirimli |
| Quest · all-bonus · login · referral · ilk oyun | 15 · 25 · 15 · 100 · 25 |

Ability merdiveni 10→4'e indiği için eski kayıtlardaki `durLvl` tek seferlik tavana kırpılıyor (`clampAbilityLadders`).

**Sonuç dengesi** (katalog toplamı **11.875 coin**)

| profil | günlük gelir | kataloğu bitirme |
|---|---|---|
| çok casual (4 run) | 113 | 105 gün |
| casual (6 run) | 151 | 79 gün |
| normal (12 run) | 251 | 47 gün |
| engaged (20 run) | 379 | 31 gün |
| grinder (60 run) | 779 | 15 gün |

Aynı 30. gün oyuncusu eskiden 0.65 coin/gün alıyordu, şimdi **151** — beceri artık kalıcı olarak ödüllendiriliyor.

**IAP tier'ları** (hâlâ `IAP_ENABLED=false` arkasında)

| | coin | coin/$ | katalog payı |
|---|---|---|---|
| $0.99 | 500 | 505 | %4 |
| $2.99 | 1.800 | 602 | %15 |
| $5.99 | 4.000 | 668 | %34 |
| $12.99 | 10.000 | 770 | %84 |

Çapa: en pahalı tek kalem (Timer full 920, custom trace 600) $0.99'un biraz üstünde, $2.99'un rahat içinde. 1.5× coin/$ yayılımı orta tier'ı "akıllı seçim" yapıyor, üst tier'ı zorunlu yapmıyor.

**UI**
- Game-over coin barı artık büyüyen mesafe eşiğine değil, sabit oranlı kazanca doluyor. Alt satır kırılımı gösteriyor: `4.20m → 8 · 5 gold → 5 · ×2 · daily cap −3`.
- Coins modalındaki "NEXT COIN" barı **"TODAY N / 150"** oldu (tavan aşılınca "TODAY · REDUCED RATE"). Eski `0 / 1000` statik placeholder'ı da düzeltildi.

**Henüz YAPILMADI**
- **Fortune CORE'u** (seviye başına +%8 run coin'i) — coin gelirini artıran kalıcı upgrade hâlâ yok. v21'de Profit → Score Boost olunca bu eksen boşaldı.
- **Sunucu cüzdanı** — coin hâlâ salt localStorage. IAP açmadan önce blocking (aşağıya bak).
- Rewarded ad → coin yolu (`ADS_ENABLED` hâlâ false).

**Doğrulama**: syntax check macOS JXA ile (node yok), iki blok da temiz. Denge rakamları Python simülasyonuyla. **Tarayıcıda runtime testi yapılmadı.**

---

### v22 — Timer ikiye bölündü: geri sayım rakamı vs. combo penceresi (2026-07-30)

Eskiden tek bir **Timer** CORE upgrade'i vardı ve adı yanıltıcıydı: gerçekte *combo penceresini* uzatıyordu, geri sayım rakamı sabit 8'de kalıyordu. Artık iki ayrı kart:

**`timer` — Timer (geri sayım rakamı)**
- Topun üzerindeki geri sayım tavanını yükseltir: **8 → 12** (seviye başına +1, **maks 4 seviye**).
- `comboDisplayMax()` artık `8 + upg.timer` (eskiden sabit 8).
- Bir kademe combo penceresi tabanında ~1 sn kaldığı için tavanı yükseltmek **hem hayatta kalma süresini** (8s → 12s) **hem altın top çarpanını** (`countdown/2` → maks ×4 yerine **×6**) büyütür.
- **En pahalı CORE kalemi**: `TIMER_PRICES = [12, 16, 20, 24]` — tam yükseltme **72 coin** (eski Timer 36 idi).

**`comboWin` — Combo Timer (yeşil pencere) → ayrı kart**
- Eski Timer davranışının birebir devamı: yeşil combo bandı **2.0s taban + 0.5s/sv**, maks 4 seviye.
- `COMBOWIN_PRICES = [6, 8, 10, 12]` (eski Timer fiyatları korundu).
- Kum saati ikonu (`hourglass`) + kendi `coreGauge` SVG'si.

**Formüller**
```js
comboDisplayMax() = 8 + upg.timer                          // 8..12
comboWindowSec()  = 2 + upg.comboWin * 0.5                 // 2.0..4.0 sn
comboTimerSec()   = comboDisplayMax() * (comboWindowSec()/2)
```
Taban (0/0) → 8 kademe · 8 sn · 1 sn/kademe · 2 sn yeşil pencere — **v21 ile birebir aynı**. `comboWin=4` → 16 sn toplam, eski `timer=4` ile birebir aynı. Yani mevcut denge bozulmadı, yalnızca yeni bir eksen açıldı.

**Bağlı düzeltmeler**
- **Renk bantları tavana göre kaydı**: `drawPlayer`'daki sabit `≥7 yeşil / ≥5 sarı / ≥3 turuncu` eşikleri `cdMax-1 / cdMax-3 / cdMax-5` oldu. Tavan 12'ye çıktığında "7" artık yeşil değil (aksi halde yeşil bant combo kuralıyla uyuşmazdı).
- **Kıvılcım efekti** eşiği de `>= 7` → `>= comboDisplayMax()-1`.
- **Çift haneli rakam**: countdown 10-12 topa sığsın diye font `×0.74` daraltılıyor.
- **Migrasyon** (`comboSplitV22`): eski `upg.timer` seviyeleri **`comboWin`'e taşınır**, `timer` 0'lanır — oyuncu satın aldığı şeyi (combo penceresi) aynen korur, bedava geri sayım rakamı almaz. `loadUpg()` sonrası hemen `saveUpg()` ile kalıcılaşır.
- `CORE_DESC`, `upgStateLabel`, `coreValueText`, `coreSideMax/SidePrice`, `PASSIVE_TILES` ve senkron tutulan ölü `buildDetailBody` hepsi güncellendi.

**Not**: CORE grid 2 sütun olduğu için tile sayısı 6 → 7 oldu; son satırda `magnetRange` tek başına kalıyor (kozmetik, sorun değil).

**Doğrulama**: `node` bu Mac'te kurulu değil — syntax check macOS JXA (`osascript -l JavaScript`) ile yapıldı, iki script bloğu da temiz parse etti. Runtime testi (emülatör/tarayıcı) yapılmadı.

---

### v21 — Profit CORE'u "Score Boost"a dönüştürüldü, upgrade/gear metin sadeleştirme (2026-07-20)

**CORE: Profit → Score Boost**
- `upg.profit` artık **coin çarpanı değil, skor çarpanı**: `score = floor((distancePx/200 * mul + scoreBonus) * profitMul)`. Coin kazanımı (`earnedCm`) artık `profitMul` içermiyor — sadece mesafe + doubler.
- Kart başlığı **Profit → Score Boost**, ikon `coinUp → medal`; `CORE_DESC.profit` ve kod içi yorumlar ("gelir çarpanı" → "skor çarpanı") güncellendi.

**Metin sadeleştirme**
- CORE açıklamaları (`radius`, `speed`, `timer`, `wallSoft`, `magnetRange`) daha kısa/aksiyon odaklı ifadelerle yeniden yazıldı.
- Gear (consumable) açıklamaları (`revive`, `doubler`, `headstart`, `coinrain`, `preboost`, `filter`) ve ability açıklamaları (`phaseburst`, `coinpull`, `brake`, `mirror`, `shock`, `anchor`) kısaltıldı, tekrar eden "arm it before a run" kalıpları sadeleştirildi.

**Config**
- `.claude/settings.json` izin listesine `git fetch`, `git restore` ve bir `grep` deseni eklendi (auto-commit hook akışını destekliyor).

---

### v20 — Güvenlik sertleştirme, kademeli rozet sistemi, eksen bazlı görevler, CORE birim düzeltmesi (2026-07-02 → 2026-07-03)

**Güvenlik**
- XSS koruması: `esc()` ile kullanıcı girdisi kaçışı + `firestore.rules`'ta regex doğrulama.
- `friendreqs` koleksiyonunda `toUid` alanı gizlendi (başkasının istek listesini görememe).
- CSP eklendi, hesap kurtarma kodu akışı, App Check altyapısı (henüz aktif değil), `tracePts` 20KB sınırı, `sync-www` scripti (kaynak → `www/` build kopyası).
- `firestore.rules` genel olarak sıkılaştırıldı; Capacitor bağımlılıkları + `config/ICONS` düzenlendi.

**Android/paketleme**
- Android projesi, store görselleri ve `store_listing.md` repoya alındı; üretilmiş `www/` kopyası `.gitignore`'a eklendi.
- Kullanılmayan WAV master dosyaları `RESOURCES/`'a taşındı — www/APK paketi **3.9MB → 1.9MB**.

**Bug fix'ler**
- Oyun sonu listesinde oyuncunun **çift görünmesi** giderildi: "ben" tespiti artık skor eşitliğiyle değil isim+tag kimliğiyle (`isMyRow`) yapılıyor; bayat sunucu skoru güncellenip yeniden sıralanıyor.
- **CORE değerleri gerçek birimleriyle** gösteriliyor: Walls artık `0px / +Npx` (eskiden yanıltıcı `×1.0`), Magnet `OFF / +22px`, Timer `2.0s + 0.5s/sv`; `upgStateLabel` timer/magnet için düzeltildi.

**Kademeli rozet sistemi**
- 10 aile × 5 kademe (bronz → elmas) + 4 özel rozet. Grid artık aile bazlı, kademe renkleri var, toplu açılışta özet kart gösteriliyor. `ICONS/badges` placeholder'ları eklendi.
- Rozet coin ödülleri kaldırıldı — rozetler artık salt koleksiyon amaçlı; coin yalnızca mesafe + görev/giriş/davet ödüllerinden geliyor.

**Görevler (quests)**
- Günlük görevler artık **eksen bazlı** (skill + grind + spice) — aynı ekseni ölçen çift görev çakışması bitti.
- 3 yeni görev türü: coin, el sayısı, extreme.
- Seri (streak) eşiği **200 → 365 gün**; `goodRuns` eşiği de buna göre ölçekleniyor.
- Rozet placeholder'ları artık kademe başına ayrı dosya.

**Diğer**
- İlk oyun bonusu: ilk gerçek run tamamlanınca **+1 coin** (tek seferlik, wife modu hariç).
- Animasyonlu ödül kartı (rozet/coin kazanımları); toast 5sn + tıkla-kapat.
- Upgrades kart ikonları artık görünüyor (boş placeholder fix), info butonu büyütüldü, Walls başlığı, Settings backup butonları belirginleştirildi.
- Metin tutarlılığı: Feedback→Vibration, Reset Data→Delete Account & Data (privacy ile uyum), Daily challenges→quests, coin çoğulları, "5000 points"→score, arkadaş mesajları düzeltildi.
- Rozet dokununca altta bilgi mesajı (takıldı/çıkarıldı + koşul + ilerleme); ölü drill-down kodundaki eski birim etiketleri canlıyla senkronlandı ve **ÖLÜ KOD** olarak işaretlendi.
- ICONS/upgrades placeholder SVG'leri — 23 upgrade anahtarıyla aynı isimde, üzerine çizilecek.

---

### v19 — Capacitor/Android scaffold, ikon/splash, keystore, store listing (2026-07-01, Cowork)

**Node + Capacitor kurulumu**
- `package.json`, `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` kuruldu.
- `capacitor.config.json`: `appId com.bugrasulukcu.arcrise`, `appName ArcRise`, `webDir www`.
- `www/` klasörü eklendi: `index.html`, `arcrise.html`, `PNG/`, `AUDIO/` içeriyor (native app'in bundle edeceği statik dosyalar; kaynak dosyalar kökte değişmeden duruyor, `www/` sadece build'e giden kopya).

**Android platformu**
- `npx cap add android` ile `android/` klasörü oluşturuldu, `applicationId`/`namespace` = **`com.bugrasulukcu.arcrise`** olacak şekilde ayarlandı (build.gradle, strings.xml).
- Web assetleri `android/app/src/main/assets/public`'e sync edildi.

**İkon + Splash**
- `PNG/GAME_ICON.png` kaynak alınarak tüm mipmap yoğunlukları (mdpi→xxxhdpi) için `ic_launcher`, `ic_launcher_round` (dairesel maskeli) ve adaptive icon `ic_launcher_foreground` (güvenli alan için %66 ölçekli, saydam kenarlı) üretildi. Adaptive icon arka plan rengi ikonun kendi koyu tonuna (`#0A080C`) çekildi (`values/ic_launcher_background.xml`).
- `PNG/LOGO.png` kaynak alınarak tüm splash screen yoğunlukları (portrait + landscape, 11 dosya) koyu arkaplan (`#080a0e`, oyunun kendi bg rengi) üzerine ortalanmış logo ile üretildi.
- Play Store hi-res ikon: `PNG/play_store_icon_512.png` (512×512).
- Feature graphic: `PNG/feature_graphic.png` (1024×500, logo + koyu bg).

**Upload keystore + imzalama**
- `keystore/arcrise-upload-keystore.jks` üretildi (RSA 2048, 10000 gün geçerlilik, alias `arcrise`). Şifreler `keystore/keystore_credentials.txt`'te.
- `android/keystore.properties` (git'e girmez) ile `android/app/build.gradle`'a release `signingConfig` bağlandı — dosya varsa Android Studio'da `Generate Signed Bundle` otomatik bu anahtarı kullanır.
- `.gitignore`'a eklendi: `keystore/`, `*.jks`, `*.keystore`, `android/keystore.properties`, `android/app/build/`, `*.aab`, `*.apk` — **imzalama anahtarı asla repoya girmez**.

**Store listing hazırlığı**
- `store_listing.md`: kısa/uzun açıklama (İngilizce, oyunun kendi UI diliyle tutarlı), kategori önerisi (Arcade), data-safety/content-rating anket notları, görsel checklist, internal testing adım listesi.
- `privacy.html` GitHub Pages'te canlı olduğu doğrulandı (`https://bugrasulukcu.github.io/ArcRise/privacy.html`).

**Sırada (VS Code/Android Studio tarafında, kullanıcı):**
- Gradle sync + emülatörde çalıştırma, ekran görüntüsü alma.
- `Generate Signed Bundle` → imzalı AAB.
- Play Console'da uygulama oluşturma, `store_listing.md` ile internal testing'e yükleme.
- Daha sonra IAP (RevenueCat/Play Billing) + AdMob rewarded entegrasyonu, `IAP_ENABLED`/`ADS_ENABLED=true`.

---

### v18 — Profil/trace elden geçirme, bildirim noktaları, wife ∞, pazar hazırlığı (2026-06-30)

**Profil ekranı yeniden düzenlendi**
- **ANALYSIS ve SAVE/BACK kaldırıldı**; sol üstte diğer modallardaki gibi **geri oku**. Kullanıcı adı büyütüldü (22px bold).
- Üst 2 stat: **HIGHEST SCORE / HIGHEST DISTANCE** (kutu arka planı yok, **trace renginde**); altlarında **liderlik sıran** (`#N`) — yükseldiyse yeşil ▲, düştüyse kırmızı ▼ (son görüntülemeye göre, `arc_view_rank*`).
- Alt 3 stat: **TOTAL GAMES** (beyaz), **AVG SCORE / AVG DISTANCE** (artıyorsa yeşil ▲ / azalıyorsa kırmızı ▼; `scoreLifetime` istatistiği eklendi). İki satır arasında ince ayraç.
- **Extreme modunda**: skor/mesafe extreme'e özel (`bestExtreme`/`bestDistExtreme`), değerlerin üstünde küçük turuncu **EXTREME** etiketi, sıra da extreme tablosundan.
- **TOMB / TRACE / DEATH TEXT** artık **gri gradyenli buton**; sahip olunca profil butonuna basmak **doğrudan aç/kapa** (uyarı yalnız satın alma anında). Açıkken **yeşil glow**. TOMB/DEATH TEXT alt-modalları yalnızca sahip değilken (satın alma) açılır; trace her zaman ayar merkezi olarak açılır. Trace show-to-others = gerçek **toggle switch**.

**Rozet slotları + yeşil bildirim noktası sistemi**
- İki slot **avatarın sol/sağ alt köşesine** taşındı; boşken içinde **BADGE 1/BADGE 2** yazar.
- Yeniden kullanılabilir `.notif-dot` + `_setDot()` + `refreshNotifs()`. Sinyaller: **yeni badge** (slotlar + profil kartı, `arc_badges_seen`), **extreme kilit hakkı** (home ayarlar butonu + settings mod satırı, `arc_seen_extreme`), **quests** (toplanmamış ödül), **upgrades** (son ziyaretten beri coin arttıysa, `arc_seen_upg_coins`), **profil TOMB/TRACE/TEXT** (sahip değil + parası yetiyorsa). Arkadaş istekleri mevcut sayaç rozetinde.

**Trace sistemi büyük revizyon**
- **Varsayılan renk BEYAZ** (bedava). Fiyatlar: düz renk **5**, gradyen **10**, gökkuşağı **30**, **custom 50**. Grid sırası: beyaz → düz → gradyen → custom.
- **Custom gradyen editörü** ayrı **pencere** (`#custom-modal`): 3 durak + **11 dairesel palet** (8 ana renk + siyah/gri/beyaz), canlı önizleme, SAVE. `upg.customStops`/`customGrad`. Oyun-içi iz custom paleti boyunca **akan** renk.
- **Animasyonlar yeniden tasarlandı** (rainbow anim kaldırıldı → artık sadece *renk*): **WAVE** (ekran konumuna sabit ilerleyen parlaklık dalgası), **PULSE** (kalp atışı `profHeartBeat`), **GLOW** (sabit full ışık), OFF. Hem profil çerçevesine hem **oyun-içi ize** uygulanır.
- **Profil çerçevesi (stroke)** + **profil avatar halkası** + **ana sayfa avatar halkası** trace rengi/gradyeniyle eşlenik (gradyende dönen konik, merkez profil resmi). **Glow = renk ortalaması** (`_avgGlow` — gradyende mor takılı kalmıyor). Gradyen uçlarındaki 1px kalıntı `background-repeat:no-repeat` ile giderildi.
- Not: ana sayfa **kart çerçevesi değil, sadece avatar halkası** boyanır (denenmiş kart-gradyeni geri alındı).

**Settings + Home**
- Seçili mod glow'u geri açıldı (**Chill mavi / Extreme turuncu**). **Wife butonu** seçili değilken **sönük/disabled**, sadece seçiliyken pembe glow+nabız.
- **HOW TO PLAY** büyütüldü + başına **daire içinde ? ikonu**.
- Ana sayfa **profil kartı genişliği** menüyle eşitlendi (`#home-logo-wrap` `min(80vw,300px)`).
- Tüm alt-menü stroke'ları **2px**'e eşitlendi; High Scores'taki **çift-stroke bug** düzeltildi (Chill modunda taban border şeffaf).

**Wife mode = sonsuz**
- Enerji/geri-sayım tükenmez (hep dolu), **ölüm yok**; top üzerindeki sayı yerine **∞** gösterilir.

**Pazar hazırlığı (madde 1 + 2)**
- **Hesap + bulut veri silme:** `ARC_DB.deleteMyData(name,tag)` → arkadaş kenarları → profil → skorlar (owner==uid). `doReset` artık async: önce bulut siler, sonra tüm local (+ `arc_fb_rt` kimlik token'ı + seen anahtarları). Reset modalı "DELETE ACCOUNT & DATA" oldu. **`firestore.rules`**: scores/players için **owner-DELETE** izni.
- **Gizlilik politikası:** ana sayfada **PRIVACY** linki + `#privacy-modal`; ayrıca mağaza URL'si için kök **`privacy.html`**.
- **IAP/Reklam feature-flag:** `IAP_ENABLED`/`ADS_ENABLED` (v1 `false`). Coin satın-alma tier'ları gizli (`#coins-buy-row[hidden]{display:none}` ile CSS ezme düzeltildi); ölünce "reklam izle · devam" butonu gizli (sahte AD ekranı devrede değil). Açma yolu kod içi TODO'larda + handoff'ta.

---

### v17 — Upgrade/CORE yeniden tasarım, ×çarpan dili, profil kişiselleştirme, uzaktan ölüm işaretçileri (2026-06)

**Upgrades — satın alma akışı + kart tasarımı**
- **Onay popup'ı** (`#buy-modal`, `confirmPurchase`): mor cam estetiği, büyük altın fiyat chip'i + bakiye; yetmezse BUY pasif. Tüm coin harcamaları buradan.
- **CORE kartları kare** (`aspect-ratio:1`): üstte ikon **placeholder** (gerçek SVG'ler sonra gelecek), başlık + **×değer** yan yana ortalı, altta **− / +** butonları. Başlık 12px/700.
- **Tüm CORE statları çift/tek yönlü merdiven, ortak kural:** tabandan (×1.0) **uzaklaşmak ücretli**, tabana **geri dönmek ücretsiz**. Forward statlarda − tabanda **gri/boş** form.

**Değer dili = ×çarpan (her şey)**
- `coreValueLabel` → `×(1+lvl*0.1)`. Speed/Radius **çift yönlü** (negatif = ×0.9.. yavaş/küçük; ayrı satın alma). Profit = ×1.0 taban +%10/lvl (coin çarpanı).
- **Timer** (eski "Combo Timer" → **Timer**): combo penceresi taban **2.0sn**, +0.5sn/lvl (`comboTimerSec = 8 + timer*2`, `comboDisplayMax = 8`); fiyat **6/8/10/12** (kıymetli).
- **Magnet** yeniden yazıldı → **pasif toplama menzili** (`magGrab = magnetRange*22px`); yeşil/altın/mor'a **değmeden yaklaşınca** toplar (booster'dan bağımsız).

**ABILITIES / ITEMS → CORE formu**
- Cooldown yükseltmesi **kaldırıldı** (sabit 20sn, gösterilmez). Sadece **süre** yükseltilir (saniye, `2.5s` küçük `s`). Anlık yetenekler açılınca **✓** (yükseltme yok).
- Kilitli yetenek → **🔒 ikon** (metin yerine). Consumables → **SINGLE-USE** (loadout buradan çıkarıldı, profile taşındı).

**Profil yeniden yapılandı**
- Sadece **4 stat** (HIGH SCORE · DISTANCE · GAMES · COINS). Detaylar yeni **ANALYSIS** modalında. Altında **TOMB · TRACE · DEATH TEXT** + ANALYSIS + UPGRADES.
- **TRACE** (profil altı, ücretli own-once): kalınlık **sıralı** (S→M→L→XL, öncekini almadan sonraki kilitli), renk paleti + **rainbow varyantları** (full/warm/cool/candy/aqua — oyunda `RB_HUE` ile gerçek hue aralığı), animasyon (OFF/PULSE/RAINBOW/GLOW). Profil butonlarında **seçili olan** önizlenir; **trace rengi profil çerçevesini** boyar.
- **TOMB** = profil resmi · **DEATH TEXT** = kullanıcı adı; her biri **50 coin**, sonra ON/OFF. Özel metin kaldırıldı.

**Küfür/nefret filtresi (genişletildi)**
- `BAD_WORDS` + `hasBadWord`: küfür + ırkçı slur + ırk/etnisite + din; **doğrudan + leet/boşluk atlatma** (`n1gg3r`, `n.i.g.g.e.r`) tespiti. **Kullanıcı adı girişinde tamamen engellenir** (yazılamaz). Yaygın çakışan kısa kelimeler (mal/top/oc/anan/hoe…) bilerek dışarıda.

**Uzaktan ölüm işaretçileri (diğer oyuncular görür)**
- Skor dokümanına `dName`/`dAv` bayrakları (her gönderimde; aç/kapa yayılır). `parseRows`/`getCrossPlayerGhosts` taşır. `drawRemoteDeathMarkers()`: her izin **en uzak noktasına** (en uzun mesafe) o oyuncunun avatar/adını çizer.
- **Tomb+text birlikte → ad avatarın çevresinde dairesel** (`drawArcText`); yalnız text → düz. Uzaktan avatar **hazır index** ile (özel foto taşınmaz — kısıt).

**Görsel düzeltmeler**
- **Trace beyazlaşması** giderildi: tek `lighter` yerine **ışıltı (geniş/soluk additive) + çekirdek (`source-over`)** iki katman → kalın izde renk korunur.
- **Sünme (oval) düzeltmesi:** `fitCanvas` artık iç yüksekliği `innerHeight` yerine **gerçek render kutusundan** (`getBoundingClientRect`) hesaplar; load/pageshow/rAF/startGame/visualViewport tetikleyicileri; `?debug=1` ölçüm overlay'i (`oval` oranı).
- **Segmented tab kayan göstergesi** (upgrades/highscore/settings) — MutationObserver ile, tema renkli pil.
- **Modal geri-oku** çerçeveli buton, her sayfanın **kendi stroke rengi**; alt-sayfalardan **Close kaldırıldı**. Başlıklar tek tip (21px/3px/700, Settings ile). High Score sekmeleri kutu içi + uppercase.
- **Settings:** üstte geri oku, alttaki Back → **HOW TO PLAY** metin link; satır ikonları kaldırıldı; **seçili mod glow** verir.



**Firebase Anonymous Auth + uid sahipliği**
- `ARC_DB` içine anonim oturum (Identity Toolkit REST): `ensureAuth()` refresh token'ı `arc_fb_rt`'de saklar → kalıcı uid. `fbFetch()` tüm Firestore isteklerine `Authorization: Bearer` ekler (14 çağrı).
- `firestore.rules`: scores/players/friendreqs **auth zorunlu** + `owner == uid` (başkasının kaydı devralınamaz/spoof'lanamaz). Skor sınırı 1M → **1 milyar** (combo'lu skorlar için). **KURULUM:** Console'da Anonymous Enable + Rules publish şart.
- **Bilinen kısıt:** coin bakiyesi tamamen client-side (localStorage), sunucu cüzdanı yok → coin miktarı korunamaz (kabul edildi). Karar: app wrapper konsolu kapatınca casual hile zaten biter.

**Sosyal sistem (onaylı arkadaşlık)**
- `friendreqs/{from__to}` koleksiyonu: istek → kabul/ret. Sahiplik `get(players/{id}).owner` ile doğrulanır. REST: `sendFriendRequest/getMySocial/acceptFriendRequest/removeFriendEdge`.
- Arkadaş ekleme artık **anında değil → istek gönderir**. Friends modalında **Davetler** bölümü (✓/× glassy butonlar), Friends butonunda **bildirim rozeti** (60sn'de bir + açılışta poll).
- Oyun-sonu leaderboard satırlarına **"Add"** butonu (scores'a `tag` eklendi → benzersiz kimlik; tag yoksa isimden çözer).
- `publishPlayerProfile` artık **max-merge** (doc'u hep oluşturur, skoru asla düşürmez).
- Referral: davet başına **5 coin** (eski 1), `REFERRAL_COIN` sabiti, verince toast.

**Combo sistemi (cash-out pot modeli)**
- Combo yalnızca **ışık yeşilken** (countdown ≥ `comboDisplayMax()−1`, timer satın alımıyla ölçeklenir) toplanırsa sayılır. Yeşil banttan çıkınca **kırılır → pot patlar** (altın parçacık + "+N") → skora eklenir → sıfırlanır. Ölümde de pot cash-out (kaybolmaz).
- Pot **×1.5 katlanır** (10,15,23,34…), yuvarlı. Etiket topun ÜSTÜNDE sabit (`drawComboLabel`, "COMBO ×N", her kare çizilir, pop animasyonu).
- Scoreboard `pad()` 6 hane.

**Quest serisi (200 günlük kişisel)**
- Performans temelli QUEST_DEFS (`base` + seri-günü çarpanı): score / distCm / **combo** / scoreTotal / distTotal / goodRuns. "Start'a bas" tipi yok.
- **Deterministik** (seed = seri günü) → herkese aynı liste. **Kişisel seri günü** (`arc_series_day` 1→200, her yeni gün +1) → yeni oyuncu gün 1'den, kademeli zorluk (×1.0→×2.5). "DAY X/200" göstergesi kaldırıldı (bitiş algısı).
- Ödül: quest +1 · hepsi +1 bonus · **günlük login +1** = 5/gün. Login quest listesinde "Daily login ✓" kartı. Açılışta stagger entrance animasyonu (`questIn`).

**Profil istatistikleri genişledi**
- GAMES / lifetime DISTANCE / COINS earned + mod tablosu (CHILL|EXTREME: skor/mesafe/oyun) + BEST COMBO + STREAK. Yeni stats: `distLifetimeCm, maxCombo, streak, lastPlayDate`.

**Ekonomi & upgrade**
- Insurance consumable **tamamen kaldırıldı**. Profit fiyatı 4/lvl. Ability ladder'ları **10 seviye**, yarım adım, temiz tam-sayı dur/cd (booster ölçeği 6-8s).
- **Refund:** "Son alımı geri al" — `spendCoins`'te merkezi snapshot, upgrades modalında "UNDO LAST PURCHASE" butonu. Run başında / yeni alımda pencere kapanır (exploit guard).
- 3 sekmeli upgrades (CORE/ABILITIES/ITEMS). Gear slotları satın alınabilir, PS renkleri, ayrı picker modal. Reset Data **onay modalı** (CANCEL/CONTINUE) + tüm in-game satın almaları temizler.

**Görsel / UX**
- Ölüm: yavaşlatma yerine **patlama efekti**. Reklamla dönüşte **top içinde 3→1 geri sayım**. Gameover popup arkası blur. Davet/back butonları SVG ikonlar.
- **Responsive ekran:** uzun ekranda (oran ≥1.25) canvas iç yüksekliği ekran oranına eşitlenir → **distorsiyonsuz tam ekran** (daha çok dikey dünya); yatay/PC'de **letterbox** (`body.letterbox`). Mesafe/zorluk **sabit `H_REF=1066`**'ya bağlı (cihazdan bağımsız adalet). HUD'a `env(safe-area-inset)`.

**Altyapı**
- **Cache-busting:** `index.html` → `arcrise.html?v=Date.now()` (cache yüzünden eski sürüm/reset takılmasın). `ARC_RESET_VERSION = 'r-2026-06-19-2'` (uzaktan tek-seferlik yerel reset; DB silmeden ÖNCE cihazların yerelini sıfırlaması gerekir).
- **Test otopilotu:** `?bot=1` veya `ARC_BOT.start()` — kısa-ufuk ileri-simülasyon ile oynar (yeşil-arayış + ability kullanımı + auto-restart), `MAX_TAP_HZ=5`.

### v15 — Profile yeniden düzenlendi, badges/coins/upgrades shell, distance leaderboard
- Profile modalı: PROFILE title kaldırıldı, isim statik (düzenlenemez), avatar yanında 2 badge slot, yatay BEST/DIST/COINS satırı, UPGRADES + BACK/SAVE footer.
- Avatar'a tıkla → grid (Upload tile + presets). Upload **center-cropped cover** (eski letterbox bitti).
- **Badges modal** (standalone): 12 dummy badge, 4-col scrollable grid, slot equip/unequip.
- **Coins modal**: gold-themed, coin disc + balance, NEXT COIN progress bar, IAP placeholder tile'lar (+50/+100/+200), UPGRADES jumper + Close.
- **Upgrades modal** (placeholder): mor framed, "Coming soon" — catalog wiring beklenir.
- High Scores: **Score/Distance metric sub-tab'ları**. Distance leaderboard cross-player (Firestore distance field), local stats PB fallback for self.
- Top-1 her zaman altın çerçeveli (oyuncu da olsa).
- One-shot reset gate.

### v14 — Distance metric, multi-trace ghost, linear difficulty
- `distancePx` spawn-relative (skor formülü buna geçti — Extreme score=0 bug fix).
- Per-mode bestDist + HUD'da DISTANCE/BEST sağ kolonu, yatay PB line on map.
- Multi-trace ghost system (`arc_traces_v1`, cap 1000, last 80 render).
- Difficulty mesafe-bazlı lineer 0..1000m. Score-eşikli ani patlama kaldırıldı.
- Firestore: `submitScore` + `distance` field; getTopScores cache + dedupe + overfetch fix.
- Admin: `wipeAllScores`, `dedupeScores`.

### v13 — UI polish, font scale, glow buttons
- Sarpanch font (Press Start 2P fallback). Tüm `font-size`'lar ×1.3.
- START / AGAIN büyük + bold UPPERCASE.
- Tüm butonlara subtle top-down gradient + glow + inner shadow (`.btn-gray`, `.tog-btn`, `extreme-confirm/back`, `lb-modal-close`, `prof-modal-save`).
- Home profile: white-glass card + LOGO.png peeking out from behind. Profile card border alev flicker'a girer Extreme'de.
- Popup overlays: blur(20px) saturate(1.15) + light dark wash → home blurred but readable behind.
- Combo + booster pills moved top.
- HUD bumped fonts.
- Game-over: SCORE + DISTANCE side by side, small BEST lines below. Back to Menu nowrap, hold 500ms, no HOLD hint.

### v12 — Android viewport fix, profile stats
- Canvas vertical-stretch fix: `.stack` her iki ekseni de canvas aspect'e clamp.
- Profile stats panel (yeni profile modal'dan önceki): Games / Best Chill / Best Extreme / Max Combo / Total XP.
- `arc_stats_v1` persisted, reset data clears it.

### v11 — BG music robust path
- bgAudio createMediaElementSource'tan ayrıldı. updateFakeViz sahte spektrum.

### v10 — Logo, white-glass profile, blurred popups
- LOGO.png eklendi (önceden repo'dan eksikti, sonradan commit).
- Eski ArcRise h1 title kaldırıldı.

### v9 — Themed HS popup, gold/purple particles, fast hold-to-menu
- HS popup'ta blue ring (Chill) / flame ring (Extreme) animasyonlu.
- Gold + purple pickup polygon bursts.
- Hold-to-menu 2000 → 500 ms.

### v8 — Score-save fix
- submitScore empty name guard, status logging.

### v7 — Mobile zoom lock, mode-split leaderboard, hold-to-menu

### v6 — Popup flame, beat-flash off, SFX latency fix

### v5 — Mode-conscious home, gold animation overhaul

### v4 — Görsel cilalar, ice/flame mode buttons

### v3 — Game features, audio, modes, combo, XP, animations

### v2 — UI overhaul, profile to home

### v1 — Temel oyun + profile + leaderboard

---

## 🐛 Bilinen Sorunlar / TODO

1. **Upgrades catalog wiring eksik** — modal var ama içerik yok. Booster tablosu beklemede.
2. **Badge unlock şartı yok** — dummy badges hepsi açılabilir.
3. **In-game slot HUD** — placeholder. Aktif booster slot UI'sı henüz görsel olarak entegre değil.
4. **drawVisualizer fonksiyonu hala kodda** ama çağrılmıyor — temizlenebilir.
5. **iOS Safari haptic feedback** desteklenmiyor — Feedback ayarı yanıltıcı.
6. **Custom avatar localStorage quota** — error handling sessiz.
7. **Music visibility change** — tab switch'te otomatik durmuyor (sadece AudioContext suspend olunca).
8. ~~**innerHTML XSS**~~ — kapatıldı: `esc()` tüm Firestore/localStorage kaynaklı innerHTML noktalarına yayıldı (v20 + 2026-08-26 denetimi), `arc_upg`/`arc_avatar_custom` beyaz listeye bağlandı.
9. **5000+ satır tek dosya** — bir noktada split mantıklı (vite/esbuild ile bundle olabilir).
10. ~~**Firestore rules test mode'da**~~ — geçersiz: 3 turluk sertleştirme publish edildi ve 2026-08-26'da canlı kuralların `firestore.rules` ile birebir aynı olduğu doğrulandı. Açık kalan asıl risk **okuma maliyeti/kota** (bkz. `SECURITY_NOTES.md` market öncesi liste #1).
11. **IAP entegrasyonu yok** — coin buy butonları alert placeholder.

---

## 💡 Olası Gelecek Özellikler

- **Booster catalog**: Pasif/Aktif/In-game slot 3 kategori. Coin spend mekaniği.
- **Badge unlock şartları**: Stats trigger (1k score, 9 combo, 100m, vb.).
- **Daily challenge** — sabit seed + özel leaderboard.
- **Replay sistemi** — ghost trace'den own replay reconstruction.
- **Skin sistemi** — coin'lerle alınabilir top renkleri / trail efektleri.
- **Settings → Tutorial showcase** — tekrar görmek için.
- **Performance: home/settings 30fps** — pil tasarrufu.
- **Cloud sync stats** (opsiyonel hesap) — cihazlar arası taşıma.
- **Firestore composite index** (mode + score DESC) → server-side filter, overfetch'ten kurtulurız.

---

## 🚀 Geliştirme İpuçları

### Test workflow
1. Lokal: `arcrise.html` Chrome'da `file://` ile veya `python -m http.server 8088` (launch.json var).
2. Mobil: GitHub Pages URL (`main` branch).
3. Tek dosya, syntax check için yeterli: `node -e "const m=require('fs').readFileSync('arcrise.html','utf8').match(/<script>([\s\S]*?)<\/script>/); new Function(m[1])"`

### Commit pattern
PR akışı tercih ediliyor: feature branch'e push → PR aç → squash-merge.
```bash
git add arcrise.html
git commit -m "..."
git push origin feat/music-particles-booster-border
# Sonra GitHub API ile PR + squash-merge (script var konuşmada).
```

GitHub Pages `main`'den serve ediyor.

### DevTools çağrılabilir admin
- `await ARC_DB.wipeAllScores()` — Firestore wipe (onaylı).
- `await ARC_DB.dedupeScores()` — `(name, mode)` dedupe + sil.
- `ARC_DB.invalidateTopCache()` — okuma cache wipe.
- T-T → debug overlay (FPS + state).

### Cihaz wipe
- `ARC_RESET_VERSION` string'ini bump et, deploy et → her cihaz bir kez localStorage temizler.
- Manuel: Settings → Reset Data.

---

## 🤖 Custom Agent Önerileri (henüz yaratılmadı)

Sonraki oturumda Claude Code subagent'ları yaratılırken bu sette başlanabilir:

| Agent | Rol | Tetikleyici |
|---|---|---|
| **css-tuner** | UI/CSS düzenleme, layout, gradient, glow | "şu butonu düzenle", "popup tasarımı" |
| **firestore-cost-auditor** | Read/write maliyeti analizi, cache tunings | "neden bu kadar okuma yapıyor", "quota" |
| **canvas-perf-reviewer** | RAF loop, render bottleneck, particle systems | "FPS düştü", "render yavaş" |
| **game-mechanic-tweaker** | Difficulty curve, score/distance formula, balance | "zorluk dengesini ayarla", "score formülü" |
| **ui-restructurer** | Modal/popup yeniden tasarım, ekran akışları | "profil sayfası yeniden", "yeni ekran" |

Her biri için `.claude/agents/<isim>.md` dosyasında prompt + tool permissions tanımlanır.

---

**Son güncelleme**: 2026-09-28 (v25). Sonraki oturumda **önce en üstteki "🚀 COWORK HANDOFF" bölümünü**, sonra v23/v22 changelog'larını oku; ardından çalışmaya devam et.

**Sıradaki işler (öncelik sırasıyla):**
1. **v23 ekonomisini tarayıcıda oyna-test et** — rakamlar simülasyondan, gerçek run mesafeleri varsayımla eşleşiyor mu doğrula.
2. **Fortune CORE'u** ekle (coin gelirini artıran kalıcı upgrade — şu an yok).
3. **Sunucu cüzdanı + login** (aşağıdaki bölüm). IAP'den ÖNCE.
4. Android Studio Gradle sync + emülatör test → imzalı AAB → Play Console internal testing.
5. IAP/AdMob bağlama, `IAP_ENABLED`/`ADS_ENABLED=true`.

---

## 💳 IAP Öncesi Blocking: Sunucu Cüzdanı + Login (2026-07-31)

Coin bakiyesi şu an **salt localStorage** (`arc_coins_earned` / `arc_coins_spent`); `publishPlayerProfile` sadece skor+mesafe gönderiyor. Bugün bu "casual hile" meselesi — **para girdiği anda başka bir şey oluyor**: uygulamayı silen oyuncu satın aldığı coin'i kaybeder → iade talebi, mağaza şikâyeti, destek yükü.

**Kritik teknik gerçek:** Play Billing **tüketilen (consumable) ürünleri geri yüklemez**. `queryPurchases()` sadece tüketilmemişleri döner. Coin paketleri tanımı gereği consumable → **mağaza tek başına bakiyeyi kurtaramaz.** Dayanıklı kimlik şart.

### ✅ Adım 1 tamamlandı (2026-07-31): `wallets/{uid}` + geri yükleme

Backend'e dokunmadan, IAP kapalıyken **cihaz değişiminde bakiye geri gelmesi** sağlandı.

**Şema — iki güven seviyesi**
```
wallets/{uid}
  purchased  : int   ← SADECE sunucu yazar (rules'ta client'a kapalı)
  earnedSync : int   ← client yazar (geri yükleme amaçlı)
  spentSync  : int   ← client yazar
  ts         : int
```
**Bakiye = `earnedSync + purchased − spentSync`**

- `firestore.rules`: `wallets/{uid}` bloğu. Doc id = uid (ayrı `owner` alanı gereksiz). Cüzdan **gizli** — skor/profil aksine `read` yalnız sahibine. `purchased` client tarafından ne yaratılabilir ne değiştirilebilir; Admin SDK rules'ı baypas ettiği için webhook serbest yazar. Defterlerde **monotonluk** zorunlu → bayat bir cihaz buluttaki ilerlemeyi ezemez. `delete` sahibine açık (KVKK).
- `ARC_DB.fetchWallet()` / `ARC_DB.syncWallet(earned, spent)`. Yazma `updateMask` ile sadece 3 alana → `purchased`'a hiç dokunulmuyor.
- `syncCoins()` artık `pushWallet()` çağırıyor (2.5sn debounce — her alım/run ayrı istek atmasın).
- Açılışta `restoreWallet()` (1.2sn gecikmeli, bloklamaz): bulut defteri yereldekinden ileriyse benimsenir. **`max()` alınıyor** — çevrimdışı oynanan run'lar da kaybolmasın.
- `deleteMyData` artık cüzdanı da siliyor.

**⚠️ Deploy gerekiyor**: yeni `firestore.rules` Console'a yapıştırılıp Publish edilmeli, yoksa cüzdan yazımları sessizce reddedilir (oyun yerel bakiyeyle çalışmaya devam eder, veri kaybı olmaz).

**Bu adımın KAPSAMADIĞI**: kazanılan coin hâlâ client-side, yani hile riski aynen duruyor (kabul edilen kısıt). Korunan tek şey **ödenmiş** kısım olacak — o da adım 3'te.

---

**Kalan adımlar**
1. ~~`wallets/{uid}` + rules + client senkronu~~ ✅
2. **Google Sign-In / Sign in with Apple + Firebase account linking** (anonim → kalıcı hesap yükseltme). Mevcut anonim uid'in ilerlemesi korunur.
2. **Login'i ilk satın almaya kadar zorunlu tutma** — checkout anında iste, ücretsiz oyuncuya sürtünme binmesin.
3. Mevcut kurtarma kodu (`getRecoveryCode`, refresh token base64'ü) **yedek** olarak kalsın — ama tek başına yeterli değil: kod hesabın tam anahtarı, kaybolursa/sızarsa telafisi yok.
4. **RevenueCat** (seçildi — Cloud Functions yerine; Blaze planı/kart gerektirmiyor): receipt doğrulama + webhook → `wallets/{uid}.purchased` artırımı.

**Google Sign-In için SHA-1 parmak izleri** — Firebase Console → Project Settings → Your apps → Android → *Add fingerprint*. **Üçü de** eklenmeli:

| Sertifika | Nereden |
|---|---|
| Debug | `~/.android/debug.keystore` (şifre `android`) — ilk Android Studio build'inde oluşur |
| Upload | `keytool -list -v -keystore keystore/arcrise-upload-keystore.jks -alias arcrise` |
| **Play App Signing** | Play Console → Release → Setup → App signing (ilk AAB yüklendikten SONRA görünür) |

⚠️ Üçüncüsü kritik: Google, yüklediğin AAB'yi **kendi anahtarıyla yeniden imzalayıp** dağıtıyor. Onu eklemezsen Sign-In emülatörde çalışır, **mağazadan inen sürümde sessizce çalışmaz**.

⚠️ Bu Mac'te **JDK kurulu değil** (`/usr/bin/java` sadece macOS stub'ı) — `brew install --cask temurin@17`. Android Studio için zaten gerekiyor.

⚠️ iOS: Sign in with Apple, Apple Developer Program üyeliği ($99/yıl) istiyor. App Store kuralı **4.8** gereği iOS'ta Google ile giriş sunuyorsan Apple ile girişi de sunmak **zorundasın**. Capacitor WebView'da web popup akışı çalışmaz → `@capacitor-firebase/authentication` gibi native plugin gerekir.

**KVKK/GDPR — login gelince değişenler**

| Konu | Yapılacak |
|---|---|
| Aydınlatma metni | Yeni veri kategorileri (hesap kimliği, e-posta, satın alma kaydı), amaç, saklama süresi, alıcılar eklenmeli |
| **Yurt dışına aktarım (KVKK m.9)** | Firebase sunucuları yurt dışında. Mart 2024 değişikliğiyle **standart sözleşme** yolu açıldı — imzalayıp Kurum'a **5 iş günü içinde bildirim**. Bu zaten bugün de geçerli (Firestore kullanılıyor), para girince denetim riski artar |
| Hukuki sebep | Satın alma verisi **"sözleşmenin ifası"** — açık rıza gerekmez. Pazarlama/analitik için **ayrı** açık rıza. İkisini karıştırma |
| Silme çelişkisi | Mevcut `deleteMyData` her şeyi siliyor. "Profil silinir, işlem kaydı anonimleştirilerek saklanır" diye ayrışmalı ve metinde yazmalı |
| Yükü azaltan | IAP'de **merchant of record Google/Apple** — fatura, vergi, cayma hakkı onlarda. Sen sadece "bu uid'e N coin verildi" kaydını tutarsın |
| Çocuk kullanıcı | Play Families / yaş derecelendirmesi. 13 altına yönelikse veli rızası rejimi |
| VERBİS | <50 çalışan + <25M TL bilanço ise muaf; teyit et |
| GDPR | AB'de yayınlanacaksa ayrıca devreye girer; Firebase DPA kabul edilmeli |

⚠️ Bunlar hukuk tavsiyesi değil — gizlilik metni yayın öncesi bir avukata okutulmalı, özellikle m.9 aktarım kısmı.

---

## 🆕 v16 (2026-06-10) — Distance system, GEAR economy, Tutorial, SVG icons

### Mesafe ve coin sistemi
- **Mesafe birimi**: `0.00m` formatında metre cinsinden. Internal storage cm; `fmtDist(cm)` = `(cm/100).toFixed(2) + 'm'`.
- **Sabit ekran-cm referansı**: `CM_PER_SCREEN = 15` (auto-calibrate kaldırıldı). 1 ekran yüksekliği = 15 cm.
- **Triangular coin earning**: N'inci coin için N metre EK mesafe. 1. coin 1m'de, 2. coin 3m'de, 3. coin 6m'de, N'inci coin N(N+1)/2 m'de. `coinsEarnedFrom(cm)` ve `distCmForCoin(n)` helpers.
- **`coinsSpent` ledger**: Coin harcaması `distTotal`'ı geri sarmıyor — ayrı sayaçtan düşülür. `coins = max(0, coinsEarnedFrom(distTotal) - coinsSpent)`.
- **Game-over coin bar animasyonu**: Bar run sırasındaki distance'ı RAF ile animate eder; her threshold geçildiğinde `+N` sayaç pulse atar (scale 1.55→1, color flash), haptic feedback. Coin sembolü olarak "C" (cent yerine) — SVG ve tüm UI'da tutarlı.

### Extreme unlock yeniden tasarım
- **İki yol** popup'ta net gösterilir:
  - DIRECT: 50 coin, koşulsuz
  - DISCOUNT: 5.00m + 5000 puan ulaşılırsa 5 coin'e iner
- Confirm butonu en ucuz yolu otomatik seçer. Unlock kalıcı.

### Skor padding 5 → 6 hane
- `pad(n)` artık `padStart(6, '0')` — `000000` formatı. Tüm statik placeholder'lar da güncellendi.

### Booster overhaul
- **X-MAGNET kaldırıldı** (snap-to-center hareketi karmaşıktı).
- **MAGNET** yeni davranış: yeşil (bonuses), sarı (goldBalls), mor (purpleBalls) topları `H * 0.7 * (1 + magnetRange * 0.10)` yarıçapında çeker.
- **MYSTERY (?)** eklendi: yakalanınca rastgele 8 booster'dan birine dönüşür, HUD direkt çıkanı gösterir.
- **Mor toplar üzerinde mini ikon**: ↔ wide, ↕ narrow, M magnet, ×2/×3/×4 score, G ghost, » speed, ? mystery. Press Start 2P font ile beyaz tek renk.

### CORE upgrade ekonomisi (kalıcı sayısal buff'lar)
- **Profit** 0→10 (each +%10 coin gain) — endGame'de `distTotal += runDistCm * profitMul`.
- **Wall Forgive** 0→5 (each +1px collision tolerance) — `walls.left + wallSoft` ile gate.
- **Magnet Range** 0→8 (each +%10 magnet pull radius).
- **Boost Duration kaldırıldı** — bunun yerine her ability kendi süre/cooldown ladder'ını alır (GEAR'da).
- CORE tile'ları artık dikey kart layout (büyük ikon üstte, başlık-state altta), `grid-auto-rows: 1fr` ile alanı doldurur.

### GEAR sistemi (run loadout)
- **3 alt grup tek tab'da**: LOADOUT (kozmetik) · CONSUMABLES · ABILITIES.
- **Envanter modeli** (`upg.inv`):
  - Consumable: `{ count, armed }` — sat al, ARM toggle ile bir sonraki run'a aktif et, run-start'ta otomatik tüketilir.
  - Ability: `{ owned, durLvl, cdLvl }` — Unlock + iki ladder (duration ↑ / cooldown ↓) + slot equip.
- **CONSUMABLES** (hepsi 80/60/50/40/30 coin):
  - **Revive** (80/max 5, auto-armed): ölünce son safe spot'tan devam — revive modal popup
  - **Coin Doubler** (50): run coin gain ×2
  - **Head Start** (40): ilk 5s yarı hız (loop'ta `slow *= 0.5`)
  - **Insurance** (60): ölünce coin gain refund
  - **Coin Rain** (40): gold ball spawn rate ×2
  - **Pre-Booster** (30): random booster ile başla
  - **Boost Filter** (80): sadece ghost+speed booster
- **ABILITIES** (Unlock 60-120 coin):
  - **Time Slow**: dt × 0.5 (1.5+0.3s/lvl, CD 15-2s/lvl)
  - **Phase Burst**: ghost mode (0.8+0.2s/lvl, CD 10-1s/lvl)
  - **Coin Pull**: instant snap of bonuses/golds/purples to player (no dur, CD 20-2s/lvl)
  - **Brake**: speed × 0.5 (1.0+0.25s/lvl, CD 12-1s/lvl)
  - **Mirror Flip**: `player.x = W - player.x` + dir flip (no dur, CD 30-3s/lvl)
  - **Shockwave**: 200px etrafındaki obstacle'ları yok et (no dur, CD 25-2s/lvl)
  - **Anchor**: 1. tap drop anchor, 2. tap teleport back (no dur, CD 30-3s/lvl)
- **Slot HUD**: Sol-altta Gameboy diagonal layout (slot-1 alt-sağ, slot-2 üst-sol), 76×76 yuvarlak, boş = %20 opacity. Tap ile ability tetiklenir, radial SVG cooldown ring (stroke-dasharray animation) gösterilir.
- **Detay sayfa açıklamaları**: `CORE_DESC`, `ABILITY_DESC`, `CONSUMABLE_CFG.desc` üçü fallback ile detail panel'in tepesinde 1 satır description.

### Tutorial sistemi
- 4 sahnelik onboarding, ana sayfada wife mode'un simetrisinde cyan **"?"** butonu (`mode-btn-tutorial`).
- **İlk START tıklamasında** otomatik açılır (`localStorage.arc_firstplay !== '1'`).
- Stages:
  1. Ball tek yay çizip durur → "TAP SCREEN TO ROTATE" (350ms timeout, duvardan önce freeze)
  2. Ball ters yöne yay → "EVERY TAP FLIPS THE ARC"
  3. Sahnenin üstünde merkezi yeşil + glow yanıp söner → "COLLECT GREEN FOR ENERGY"
  4. Sahnenin üstünde merkezi kırmızı + duvar stroke pulse → "STAY AWAY FROM RED"
- **Seamless transition**: Stage 4'te son tap → tutorial overlay kalkar, isGhost kapanır, beginArc(-player.dir), gerçek gameplay devam (sahne değiştirmeden).
- **Güvenlik**: `tutActive` flag collision'ı atlatır (önceki "isGhost=true → mor top" sorunu çözüldü; collision şimdi `!isGhost && !tutActive` ile gate'leniyor, top normal renkte). `tutReady` flag tap'ın metni gösterilmeden önce skip'lemesini önler. spawnAhead tutorialde no-op.
- SKIP butonu home'a döner, doğal akış gerçek oyuna geçer.

### Spawn sistemi düzeltmesi
- `nextSpawnY = lastBonusY = player.y - H` (1 ekran yukarı). Engel/bonuslar baştan kuyrukta beklerl, oyuncu yukarı çıktıkça akarak görünür alana girer.
- `resetGame()` sonunda + tutorial seamless geçişte `spawnAhead()` manuel çağrılır — buffer baştan dolu.
- Eski 0.2m spawn-gate kaldırıldı.

### SVG ikon sistemi (FOUT + emoji corruption fix)
- `ICONS` registry: 40+ inline SVG (24×24 viewBox, currentColor). `iconHTML(name, { size, color, cls })` helper. Coin için radial gradient ile gold look.
- **Tüm emojiler SVG'ye çevrildi** — booster ikonları, upgrade tile ikonları, badge ikonları, particle glyph'leri, modal slot içerikleri.
- **Encoding fix**: Python script ile dosya boyunca çift-encoded UTF-8 byte sequence'leri proper UTF-8'e döndü (2400+ replacement: `Â·` → `·`, `Ã—` → `×`, `â•` → `═`, vs).
- **Sarpanch FOUT engelleme**: Google Fonts `display=swap` → `display=block` + `html.fonts-loading body { visibility: hidden }` CSS + `document.fonts.ready.then(reveal)` + 1500ms yedek timeout.

### High Scores yeniden tasarım
- Distance değerleri `fmtMetric` üzerinden `fmtDist()` → "X.XXm" format
- **Tam 4 satır kural**: 1./top + üst + me + alt (oyuncu top 2'de ise ilk 4)
- **Sabit kutu yüksekliği**: `#lb-list { min-height: 188px }` — tab geçişinde zıplamaz
- **Backdrop blur tüm modal'larda** (lb, prof, badges, upgrades, wife, extreme, settings panel): box opacity 0.96 → 0.72-0.78 + her box'a `backdrop-filter: blur(8px) saturate(1.1)`. Wife-modal overlay 18px → 20px.

### Wife Mode kalıcı izolasyon
- Skor/mesafe/coin kaydı yok: `if (gameMode !== 'wife')` guard'ı `bestDistanceM`, `stats.*`, `submitScore`, `distTotal`'a uygulandı.
- `submitScore` içinde de defense-in-depth: `if (mode === 'wife') return`.
- `wipeMyScores(name)` admin helper eklendi (DevTools'tan çağrılır, kullanıcının kendi adına Firestore kayıtlarını siler).
- Bir kerelik stats reset (`arc_dist_reset_v2` flag): eski migration/RR cheat ile bozulan distance bests sıfırlandı.

### Ghost trace smooth rendering
- `strokeTrace`'te midpoint-quadratic smoothing — 150 noktaya downsample edilmiş trace'ler polygonal değil yumuşak eğri olarak çizilir.
- **Gap guard**: iki ardışık nokta ekranda 180px+ aralıkta ise path kesilir (büyük süpürme yayları önlenir).

### Profile UI yenileme
- **Profile-setup (ilk profil oluştur)**: Name input → "Your name cannot be changed later." (input altında) → "SELECT AN AVATAR" → grid → "OR UPLOAD AN IMAGE" → kamera ikonlu upload butonu → CONFIRM.
- **Avatar picker bağımsız modal** (`#avpick-modal`): Profil ringe basınca popup açılır (eski `prof-av-grid` kutunun içinde açılıp kutuyu kaydırma sorunu çözüldü). Backdrop click ya da DONE ile kapanır.
- **Toast helper** (`showToast(msg)`): Resim upload sonrası "PHOTO UPLOADED" — yeşil bordered pill, 1.6s gösterir. Her iki upload akışında entegre.

### Görsel iyileştirmeler
- **Grid yeniden**: parallax (camY × 0.45) + top/bottom 80px edge fade → akışkan kayma hissi. play/over'da kamera bağlı, diğer sahnelerde zaman bağlı yavaş kayma.
- **Coins pill (Upgrades header)**: altın gradient border + coin SVG + altın text "Coins" (büyük C).
- **Slot HUD**: 60→76px, sol-alt köşeden duvardan daha uzak (left:36px, bottom:44px).
- **Hold-to-back**: 500ms → 200ms.
- **Ölüm sesi**: 0.8 → 1.0 volume.

### Bug fixes
- Y → 6 haneli skorda HTML placeholder'lar `00000` → `000000`.
- Distance ana sayfa profile card: `fmtDist` uygulanıp "2.13m" formatına geldi (önceden "213" gösteriyordu).
- Tutorial Stage 1 timeout 900ms → 350ms (top duvara çarpmadan önce dondurma).
- Tutorial top mor görünüyordu → isGhost=true kaldırıldı, collision tutActive ile gate'leniyor.
- Back arrow (upg-back) inline SVG path — encoding-independent (önce Unicode ←/U+8592 emoji olarak render oluyordu desktop'ta).

