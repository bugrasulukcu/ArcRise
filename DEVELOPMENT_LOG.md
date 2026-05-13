# ArcRise — Development Log

> Bu dosya, ArcRise'ın geliştirme sürecini ve mevcut durumunu özetler. Yeni bir oturum başlattığında öncelikle bu dosyayı oku — projenin nerede olduğunu hemen anlarsın. Tek dosyalı bir oyun (`arcrise.html` ~3800 satır vanilla HTML5 canvas).

---

## 📁 Proje Yapısı

```
C:\Users\DELL\Desktop\BUGRA\ArcRise\
├── arcrise.html              ← oyunun tamamı (HTML + CSS + JS)
├── AUDIO/
│   ├── ArcRiseBGMusic.wav    ← background loop (~2MB)
│   ├── ArcRiseTouch.wav      ← her tıklama sesi (~90KB)
│   └── ArcRiseDead.wav       ← ölüm sesi (~170KB)
├── RESOURCES/                ← gitignored (ham asset'ler)
├── .gitignore
└── DEVELOPMENT_LOG.md        ← bu dosya
```

**Git**: `main` branch GitHub Pages'te yayında. Feature branch `feat/music-particles-booster-border` da var, her commit önce ona, sonra main'e merge ediliyor.

---

## 🎮 Oyun Mekaniği — Mevcut Durum

### Temel oynanış
- Vanilla HTML5 canvas, mobile-first (`width: min(100vw, 56.25vh)`)
- Top kavisli bir yörüngede hareket eder. Ekrana dokununca yön değişir (sol → tight arc, sağ → wide arc).
- Yeşil top topla → enerji dolar (9 sn'lik geri sayım)
- Kırmızı engele çarp → öl
- Altın toplar puan verir, mor toplar booster verir

### Profil Sistemi
- LocalStorage'da: `arc_name`, `arc_avatar` (0-19 preset SVG), `arc_avatar_custom` (yüklenen JPEG base64, 256×256)
- Ana sayfa profil kartına dokun → profile edit modal açılır (avatar/upload/isim)
- 20 preset SVG avatar (`AVATARS` array)

### Oyun Modları (`gameMode`)
| | Normal | Extreme |
|---|---|---|
| `getBaseSpeed()` | 400 | 800 |
| `getScoreMul()` | 1.5 | 3.0 |
| Dinamik hız artışı | Yok | `+8/50pt`, 2× cap |
| Görsel | Kırmızı kenarlar/engeller | **ALEV** kenarlar/engeller |

Extreme butonuna basınca **popup** çıkar (×3 score, acceleration on, "LET'S GO" / "Stay Normal" buttons).

### Booster Sistemi (`BOOSTER_INFO`)
9 booster türü: `wide, narrow, magnet, x2, x3, x4, ghost, shield, speed`. Her birinin icon/name/duration/color'ı var. Mor toplar (`purpleBalls`) toplanınca aktive olur.

`getRadius()`: wide → W/3, narrow → W/5, default → W/4.

### Combo Sistemi
- Yeşil top topladığında: `bonus = Math.round(countdown/2) * 10` puan (8 sn → +40, 6 sn → +30, ...)
- HUD'da `×N.N` combo göstergesi (countdown/2)
- Toplama yerinde "+N" yeşil floating text animasyonu (`spawnFloatText`)
- Renk enerji seviyesine göre yeşil → kırmızı kayar

### Altın Top (Combo Çarpanlı)
- `b.pts × (countdown/2)`, 10'a yuvarlanır
- **Uçan animasyon**: SCORE HUD'a doğru ease-out hareket eden parlak "+N"
- **Sarı vignette flash** ekran kenarlarından (`triggerGoldFlash(intensity)`)

### XP/Coin Sistemi
- Her oyunun skoru `arc_xp`'ye eklenir (birikimli)
- `coins = Math.floor(xpTotal / 1000)` — her 1000 XP'de 1 coin
- Game Over ekranında progress bar: `xpTotal % 1000` / 1000

### Skor Sistemi
- `score = floor(maxAscend / 200 × getScoreMul() × scoreMulBoost) + scoreBonus`
- `scoreBonus`: yeşil/altın toplardan gelen ek puan
- HUD ve Game Over: 5 haneli pad (`00000`)
- Game Over: 0'dan final skora ease-out cubic count-up animasyonu

### Tutorial
- İlk oyunda otomatik (`firstPlay` flag — `arc_firstplay` localStorage)
- 5 adım: TOUCH ANYWHERE → COLLECT GREEN → AVOID RED → RIGHT WIDE → LEFT TIGHT
- Aşağıda banner + alttaki nokta göstergeleri + SKIP butonu
- **Tutorial home'dan erişim YOK** (eskiden vardı, kaldırıldı) — sadece firstPlay'de tetikleniyor

---

## 🎨 Görsel Efektler

### Background (bctx) — sadece game play sahnesinde
1. **Grid** (`drawGrid`) — sürekli
2. **drawBgFlash** — müzik beat'ine senkron, multi-blob:
   - AnalyserNode'dan bass enerjisi (`vizData[0..5]`)
   - Beat algılandığında 2-3 random pozisyonda flash blob spawn
   - `flashBlobs[]` array'i, her frame `alpha *= 0.80` ile sönümleniyor
   - `lighter` composite operation → renkler toplanıyor
   - `alpha × energy` → can azaldıkça ışık azalır
3. **Gold flash vignette** — ekran kenarlarından sarı parlama (`goldFlashAlpha`)

### Game canvas (ctx)
- **Walls**: Normal'da düz kırmızı; Extreme'de dikey gradient + 12 ember highlight
- **Obstacles**: Normal'da düz kırmızı daire; Extreme'de multi-stop radial gradient + wobble
- **Bonuses (yeşil)**: glow + core, basit
- **Gold balls**: minik core (r=1-2px) + büyük sarı glow + "+pts" yazısı üzerinde
- **Purple balls**: mor glow + core + icon
- **Trail**: rainbow renk geçişli iz
- **Ghost trail**: önceki oyunun trail'i %22 opaklık (`ghostTrail` from endGame)
- **Particles**: 48 polygonal shard, 1200-2800 px/s spread, 2.5-7px (küçük & geniş)
- **Float texts**: combo bonus +N yazıları (`floatTexts[]`)
- **Fly scores**: gold ball puanlarının HUD'a uçan animasyonu (`flyScores[]`)
- **Flame particles**: sadece Extreme + scene='play' — sol/sağ duvar ve üst kenardan alev parçacıkları
- **Booster border**: aktif booster için renkli pürüzlü ekran kenarı

### Audio Visualizer (kaldırıldı)
- `drawVisualizer` fonksiyonu hala kodda ama **çağrılmıyor** (eski 24-bar equalizer). Silebilirsin.
- Yerine `drawBgFlash` çoklu blob sistemi var.

---

## 🔊 Audio Sistemi

```js
const bgAudio    = new Audio('AUDIO/ArcRiseBGMusic.wav'); // loop = true, vol = 0.7
const touchAudio = new Audio('AUDIO/ArcRiseTouch.wav');   // vol = 0.55
const deadAudio  = new Audio('AUDIO/ArcRiseDead.wav');    // vol = 0.8
```

- `new Audio()` kullanıyor (fetch+AudioContext file:// protokolde CORS'tan engelleniyordu)
- Touch/dead için `cloneNode()` — paralel çalabilmesi için
- `playBgMusic()`:
  - Audio context suspended ise `resume()` çağırır (mobil tab-switch fix)
  - `currentTime`'ı sıfırlamaz (oyunlar arası kesme önlenmiş)
- `stopBgMusic()`: sadece `pause()`, currentTime korunur
- `initAudioViz()`: AudioContext + AnalyserNode kurar, `bgAudio`'ya bağlar (sadece bir kez)
- **SFX/Music toggle** (slider yok, sadece on/off): `setSfx(v)`, `setMus(v)`

---

## ⚙️ Ayarlar (`#settings`)

- Profil bölümü **yok** (artık ana sayfada)
- 3 toggle: SFX, Music, Feedback (vibrate)
- Back butonu
- **Reset Data**: panelin DIŞINDA, ekranın altında, geniş tek satır (`position: absolute; bottom: 28px`)

---

## 🏗️ Kod Mimarisi

### State Variables (modül kapsamında dağınık)
```js
// Game
let score, maxAscend, energy, scoreBonus, camY, best, lastScore
let running, started, scene
let player = {x, y, r, dir, speed, heading, radius, cx, cy, ang}
let trail, obstacles, bonuses, ripples, goldBalls, purpleBalls
let particles, floatTexts, flameParticles, flyScores
let ghostTrail, lbNPCScores

// Booster
let boosterType, boosterTime, boosterDur, isGhost, hasShield

// Tutorial
let tutStep, tutTimer, tutAlpha, tutPaused

// Mode
let gameMode, GAME_SPEED

// Audio + Viz
let audioCtx, analyser, vizData
let beatAvg, flashBlobs[], goldFlashAlpha

// Profile
let playerName, avatarIdx, customAvatarSrc
let coins, xpTotal

// Settings
let sfxOn, musOn, feedbackOn

// UI
let modeDecoTimer (mode butonu deco partikül spawn timer)
```

### LocalStorage Keys
```
arc_name, arc_avatar, arc_avatar_custom
arc_best, arc_last, arc_xp, arc_coins
arc_sfx, arc_mus, arc_fb
arc_mode, arc_firstplay
```

### Önemli Fonksiyonlar
- `resetGame()` — yeni oyun başlarken tüm state temizliği
- `step(dt)` — her frame'de fizik + collision + skor
- `loop(ts)` — ana RAF döngüsü
- `endGame()` — async, Firestore submit + animasyonlar
- `showScene(s)` — sahne geçişi
- `applyProfile()` — profile UI sync
- `spawnAhead()` — obstacle + bonus + gold + purple spawn (procedural)
- `setGameMode(m)`, `setSfx(v)`, `setMus(v)`, `setFeedback(v)`

### Performans
- **Culling**: `obstacles, bonuses, goldBalls, purpleBalls` — `player.y + H*1.5` altındakiler temizleniyor
- **Particle limit**: yok ama low friction + 1sn life cycle ile pratik
- `trail` 600 öğeyle sınırlı (shift)

---

## 🔥 Firestore Leaderboard

```js
const FIREBASE_CONFIG = {
  apiKey:    'AIzaSyB7x2es8UgEkQ91K4hruM7OaJKhpXkzvW4',
  projectId: 'arcrise-e1504',
};
```

- REST API ile (SDK yok)
- `ARC_DB.submitScore(name, avatar, score)` — eski skor varsa PATCH, yoksa POST
- `ARC_DB.getTopScores(50)` — game over'da çekilir
- DELETE security rules tarafından bloklanıyor (reset için Firebase Console manuel)

---

## 📝 Son Yapılan Değişiklikler (kronolojik)

### v1 — Başlangıç temel oyun + profile + leaderboard

### v2 — UI overhaul (büyük commit)
- Settings UI redesign (backdrop-blur, SVG icons)
- Audio sliders → On/Off toggles
- Profile artık home'da, settings'den kaldırıldı
- Tutorial butonu kaldırıldı
- Settings butonu %70 genişlik
- Reset Data ekran altına, geniş tek satır
- iOS zoom fix (`font-size: 16px` inputs)
- Global `user-select: none`

### v3 — Game features
- Polygonal partiküller (3-6 kenarlı, spin)
- Audio system: `new Audio()` + cloneNode + AudioContext+Analyser
- Tek difficulty kaldırıldı (Normal/Extreme seçici eklendi)
- Combo sistemi: countdown/2 çarpanı
- XP coin sistemi (1000 XP = 1 coin)
- Game over: skor sayaç animasyonu + coin progress bar
- Extreme mode popup
- 5 haneli skor
- Skor animasyonu (Game Over count-up)
- Music doesn't play on home, only during game
- ArcRiseDead.wav → endGame
- Beat-synced bg flash (centered önce, sonra multi-blob)

### v6 — Popup flame, home frame tune, beat-flash off, SFX latency fix
- **Home flame frame**: Hızlı flicker kaldırıldı → 2.6s breathe animasyonu, yarı yoğunlukta soft glow
- **Extreme popup**: Açıkken `#extreme-modal-deco` içinde alev partikülleri spawn eder; kapanınca temizlenir (`tickPopupDeco`)
- **Beat-synced bg flash**: Şimdilik tamamen kaldırıldı (`drawBgFlash` sadece gold vignette); `beatAvg/beatPeak/beatCooldown/flashBlobs` değişkenleri silindi
- **Touch/dead ses gecikmesi**: `cloneNode()` → `AudioBuffer` + `BufferSourceNode`. Ayrı `sfxCtx` AudioContext ile (bgAudio analyser'ından bağımsız). İlk user gesture'da `fetch` + `decodeAudioData` ile pre-decode; buffer hazır değilse `cloneNode` fallback. Mobil gecikme ~80-200ms → ~1-5ms

### v5 — Mode-conscious home + cilalı flash/gold animation
- **Home deco artık mod'a duyarlı**: Normal'da sadece kar, Extreme'de sadece alev (önceden ikisi de aynı anda spawn oluyordu)
- **Home flame frame**: Extreme seçildiğinde ekranın çerçevesi animasyonlu alev haline geçiyor (`#home-flame-frame` div, `home.extreme-mode` toggle ile)
- **Beat flash overhaul**: 
  - Adaptif eşik (`beatAvg + 0.04` / `beatAvg * 1.12` / `beatPeak * 0.72` max'ı) — artık şarkı boyunca tetikleniyor, sadece başta değil
  - `beatPeak` slow envelope (decay 0.985)
  - 0.45s cooldown — back-to-back stacking yok
  - 2-3 blob yerine 1 blob, alpha %50 azaltıldı (0.05 + 0.07 intensity)
  - Daha az göz yorucu
- **Gold pickup animation 3-aşamalı**:
  1. `grow` (0.35s): "+basePts" merkez yakınında 0→1.0 scale, ease-out cubic
  2. `multiply` (0.55s, mul≠1 ise): scale pulse 1.0→1.4→1.0, midpoint'te `shownPts` `basePts`'den `finalPts`'e snap, "× N.N" badge görünür
  3. `fly`: HUD'a easing, scale shrink (1.0→0.45), alpha fade
  - `spawnFlyScore` artık `(sx, sy, basePts, mul, finalPts)` alır
  - Combo=1 olduğunda multiply stage 0.20s'e düşüyor (es geçiliyor)

### v4 — Görsel cilalar
- Hızlar 400/800 (Normal/Extreme)
- Extreme button: alev gradient + flicker
- Normal button: buz gradient + shimmer
- Mode wrapper'a CSS animasyonlu deco partikülleri (❄ ❅ 🔥 ✦)
- Flame walls + flame obstacles Extreme'de
- drawVisualizer (equalizer) kaldırıldı, drawBgFlash multi-blob oldu
- Gold flash vignette + flying score animasyonu
- Yeşil partiküller daha küçük + daha geniş (count 48, spd 1200-2800, r 2.5-7)
- Obstacle culling (memory leak fix)
- Beat state reset on game restart

---

## 🐛 Bilinen Sorunlar / TODO

1. **drawVisualizer fonksiyonu hala kodda** ama çağrılmıyor — temizlenebilir
2. **iOS Safari haptic feedback** desteklenmiyor — Feedback ayarı yanıltıcı
3. **Firestore READ maliyeti** — her oyunda 50 satır çekiliyor, cache yok
4. **Custom avatar localStorage quota** — error handling sessiz, kullanıcıya bildirim yok
5. **Music visibility change** — tab switch'te durmuyor, sadece AudioContext suspend olduğunda fark var
6. **DELETE Firestore security rules** — leaderboard manuel reset gerektirir
7. **Tutorial'a yeniden erişim yok** — Settings'e "Show Tutorial" butonu eklenebilir
8. **innerHTML XSS riski** — leaderboard satırlarında, isim filtresine güveniyoruz (`[^A-Za-z0-9]` strip)
9. **Magic numbers her yerde** — `CFG = {...}` objesine toplanabilir
10. **3800 satır tek dosya** — bir noktada `<script src="game.js">` split mantıklı

---

## 💡 Olası Gelecek Özellikler

- **Daily challenge** — sabit seed + özel leaderboard
- **Achievement / coin store** — coin'lerle booster/skin açma
- **Replay sistemi** — trail kaydet, "watch replay"
- **Combo flame indicator** — yüksek combo'da topun etrafında alev efekti
- **Skin sistemi** — coin'lerle alınabilir top renkleri/trail efektleri
- **Settings → Tutorial showcase** — tekrar görmek için
- **Performance: home/settings 30fps** — pil tasarrufu

---

## 🚀 Geliştirme İpuçları

### Test workflow
1. `arcrise.html` Chrome'da `file://` ile aç (lokal test)
2. Mobil için: GitHub Pages URL (`main` branch'ten serve ediliyor)
3. JS syntax check: `node -e "const m=require('fs').readFileSync('arcrise.html','utf8').match(/<script>([\s\S]*?)<\/script>/); new Function(m[1])"`

### Commit pattern
```bash
git add arcrise.html
git commit -m "..." 
git push origin feat/music-particles-booster-border
git checkout main
git merge feat/music-particles-booster-border --no-edit
git push origin main
git checkout feat/music-particles-booster-border
```

GitHub Pages `main`'ten serve ediyor — feature branch'e push yeterli değil, main'e merge gerek.

### Mevcut PR
- PR #2: https://github.com/bugrasulukcu/ArcRise/pull/2

---

**Son güncelleme**: 2026-05-13 (v6). Sonraki oturumda bu dosyayı oku, sonra çalışmaya devam et.
