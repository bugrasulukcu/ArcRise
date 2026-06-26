# ArcRise — Development Log

> Bu dosya, ArcRise'ın geliştirme sürecini ve mevcut durumunu özetler. Yeni bir oturum başlattığında öncelikle bu dosyayı oku — projenin nerede olduğunu hemen anlarsın. Tek dosyalı bir oyun (`arcrise.html` ~5000+ satır vanilla HTML5 canvas).

---

## 📁 Proje Yapısı

```
C:\Users\DELL\Desktop\BUGRA\ArcRise\
├── arcrise.html              ← oyunun tamamı (HTML + CSS + JS)
├── LOGO.png                  ← ana sayfa logosu (ball+arc, profilin arkasından peek)
├── AUDIO/
│   ├── ArcRiseBGMusic.wav    ← background loop (~2MB)
│   ├── ArcRiseTouch.wav      ← her tıklama sesi (~90KB)
│   └── ArcRiseDead.wav       ← ölüm sesi (~170KB)
├── PNG/                      ← Figma export PNG'leri (referans)
├── RESOURCES/                ← gitignored (ham asset'ler)
├── .claude/                  ← Claude Code config (settings, launch)
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
8. **innerHTML XSS** — leaderboard satırlarında. Name filter (`[^A-Za-z0-9]` strip) güvence.
9. **5000+ satır tek dosya** — bir noktada split mantıklı (vite/esbuild ile bundle olabilir).
10. **Firestore security rules production-ready değil** — test mode'da; spam yazma riski var.
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

**Son güncelleme**: 2026-06-26 (v17). Sonraki oturumda bu dosyayı oku, sonra çalışmaya devam et.

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

