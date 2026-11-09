# ArcRise — Uyarlanabilir müzik entegrasyonu (devir dokümanı)

Bu klasör, oyunun mevcut müziğini ve iki ses efektini **kodla üretilen, oyuna tepki veren bir müzik motoruyla** değiştirmek için hazırlandı. Bu dokümanı okuyan asistan: aşağıdaki adımları sırayla uygula, test et, `DEVELOPMENT_LOG.md`'ye not düş, commit'le ve GitHub'a push'la.

## Neden

- `AUDIO/ArcRiseBGMusic.mp3` Envato'dan **Buğra'nın eski işyerinin hesabıyla** indirildi; lisans Buğra'ya ait değil, ticari yayında kullanılamaz.
- `AUDIO/ArcRiseTouch.wav` ve `AUDIO/ArcRiseDead.wav` büyük ihtimalle aynı hesaptan gelen `RESOURCES/` dosyalarından (7 Mayıs 2026 indirmeleri: `cinematic-hit-digital-bit-02…`, `rocket-marble-explosion-1…`, `cyber-power…`) türetildi. Bunlar da kaldırılacak.
- Yeni motor tamamen sentezle çalışır: dosya yok, lisans sorunu yok, birkaç KB. 2 MB'lık oynanabilir reklama da sığar.

## Bu klasördekiler

| Dosya | Ne |
|---|---|
| `arc-music.js` | Motorun kendisi. `ArcMusic.create(ctx, destination, opts)` döner. Bağımsız, global `ArcMusic` tanımlar. |
| `prototype.html` | Dinleme / deneme sayfası (tarayıcıda aç, **SESİ AÇ**). Demo run'lar + elle olay tuşları. |
| `HANDOFF.md` | Bu doküman. |

Yayınlanmış prototip (Buğra'nın hesabında): https://claude.ai/artifact/AL48Pu5VWLgTghJTUCUhXw

## Motorun arayüzü (`arc-music.js`)

```js
const M = ArcMusic.create(audioCtx, destinationNode, { lite: false });
// Sahne
M.start(mode)        // run başı. mode: 'chill' | 'extreme' | 'vanilla'
M.menu()             // menü ambiyansı (yalnız boğuk pad) — bkz. "Karar 1"
M.stop()             // müziği söndür + zamanlayıcıyı durdur
// Sürekli parametreler (her karede çağrılabilir, ucuz)
M.setIntensity(0..1) // ritim katmanları, tempo, filtre buna göre açılır
M.setCombo(0..3)     // 0 yok, 1-2 arpej, 3 = MAX (lead melodisi)
M.setMode(mode)
M.setMusicEnabled(bool), M.setSfxEnabled(bool)
// Anlık olaylar (hepsi A minör tonunda)
M.tap(dir)           // yay çevirme tık sesi (dir: -1 | 1)
M.collect()          // yeşil top: pentatonikte sıradaki nota; zincir sayısını döner
M.gold()             // altın çınlama
M.comboBreak()       // aşağı glide + filtre düşüşü, zincir sıfırlanır
M.nearMiss()         // CLOSE! whoosh
M.booster(seconds)   // yükselen sweep + süre boyunca parlaklık/hi-hat
M.death()            // bas darbesi + patlama, müzik boğulup kısılır
M.revive()           // riser, müzik geri döner
M.state()            // tanı: { scene, mode, bpm, eS, combo, chain, chord, layers }
M.analyser           // AnalyserNode (görselleştirici için)
```

Notlar:
- Motor kendi `setInterval` (25 ms) zamanlayıcısıyla 120 ms ileriyi planlar. `AudioContext` askıdayken `currentTime` durduğu için hiçbir şey planlanmaz; ekstra iş gerekmez.
- `opts.lite: true` yankı (convolver) ve gecikme (delay) efektlerini kapatır. `LOWFX` açıkken bununla oluştur.
- Motorun içinde compressor + limiter var; çıkış tepe değeri ölçümde ~0.8. Ayrıca kazanç düğümüne gerek yok, ama oyunun `_musicGain`'ine bağlanırsa onun seviyesi (0.7) de uygulanır. Bkz. adım 2.

## Oyundaki bağlanma noktaları (`arcrise.html`, 2026-11-09 itibarıyla yaklaşık satırlar)

`gameMode` iç değerleri: `'normal'` = Chill, `'extreme'` = Extreme, `'wife'` = Vanilla. Motora çevirirken: `{ normal: 'chill', extreme: 'extreme', wife: 'vanilla' }`.

| Oyundaki yer | Şu an | Yeni |
|---|---|---|
| `initAudio()` ~8350 | `sfxCtx` + `_musicGain` kurar, 3 dosya yükler | `sfxCtx` aynı kalsın. `ArcRiseTouch.wav`, `ArcRiseDead.wav`, `BG_SRC` yüklemeleri silinsin. `_arcMusic = ArcMusic.create(sfxCtx, sfxCtx.destination, { lite: LOWFX })`; sonra `setMusicEnabled(musOn)`, `setSfxEnabled(sfxOn)`. |
| `playBgMusic()` ~8407 | tampon kaynağını başlatır | `musicAllowed()` kuralı **aynen kalsın**; izinliyse `_arcMusic.start(modeMap[gameMode])` (zaten çalıyorsa tekrar başlatma; revive'dan geliyorsa `revive()` zaten döndürür). |
| `stopBgMusic()` ~8428 | kaynağı durdurur | `_arcMusic.stop()` (ya da Karar 1'e göre `menu()`). |
| `fadeOutMusic()` ~8458 | ölümde 0.4 sn fade | Ölüm artık `_arcMusic.death()` ile; bu fonksiyon `death()` çağırıp ardından oyun sonu ekranında `stop()`/`menu()`'ye bırakmalı. |
| `duckMusic(on)` ~8453, `activateBooster` ~7578 | booster'da müziği kısar | Booster'da kısma kaldırılsın; yerine `_arcMusic.booster(süreSn)`. (Booster süresi `BOOSTER_INFO[type].dur` ya da `durOverride`.) |
| `playTouchSound()` ~8466 (çağrı ~10297, 10947, 10955, 12351, 12372) | `ArcRiseTouch.wav` | Oyun içi dokunuşlarda `_arcMusic.tap(player.dir)`. Menü düğmesi tıkları (12351, 12372) için de `tap()` yeterli, ya da sessiz bırakılabilir. |
| `addCombo(wx, wy, green)` ~10567 | combo sayar | `green` true ise `_arcMusic.collect()`. |
| `comboBreak()` ~10649 | zinciri sıfırlar | `_arcMusic.comboBreak()` |
| Combo seviyesi (her kare) | `comboMul()` ~7798, `comboCap()` ~7783 | `mul < 2 → 0`; değilse `1 + Math.round(2 * (mul - 2) / Math.max(1, comboCap() - 2))` (2..cap → 1..3). `_arcMusic.setCombo(...)` |
| Yoğunluk (her kare, run döngüsü ~10780 civarı) | Chill sabit hız; Extreme 0→75 m'de 1×→2× | `distCm = (distancePx / H_REF) * CM_PER_SCREEN`. Chill/Vanilla: `Math.min(1, distCm / 1500)` (15 m'de tam). Extreme: `0.3 + 0.7 * Math.min(1, distCm / 7500)` (hız eğrisiyle aynı). Sabitleri ayarlanabilir bırak. |
| Altın toplama (~9437 `if (p.gold) { _goldHitAt … }`) | görsel | `_arcMusic.gold()` (parçacık topa vardığı an; ya da altın alındığı an — hangisi daha iyi hissettiriyorsa). |
| `triggerCloseCall(pts)` ~9212 | CLOSE! yazısı | `_arcMusic.nearMiss()` |
| `beginDeath(cause, x, y, r)` ~11391 | `fadeOutMusic()` + `ArcRiseDead.wav` (~11397) | `_arcMusic.death()`; dead.wav çağrısı silinsin. |
| `doRevive()` ~11470 | `playBgMusic()` (~11482) | `_arcMusic.revive()` |
| `showScene(s)` ~12200 | play dışına çıkınca müziği durdurur (~12214) | Karar 1'e göre `stop()` ya da `menu()`. |
| `setMus(v)` ~12634, `setSfx(v)` ~12629 | | `_arcMusic.setMusicEnabled(v)` / `setSfxEnabled(v)` |
| `visibilitychange` / `pagehide` ~8490 | `sfxCtx` askıya alınır | Değişiklik gerekmez (aynı bağlam). |
| `_audioDiag()` | `music: musicBuffer ? 'ok' …` | `_arcMusic ? _arcMusic.state() : '-'` ile güncelle. `tests/e2e.mjs` bu alana bakıyorsa testi de güncelle. |
| `initAudioViz()` ~8053 | müzik yoluna analyser bağlıyor olabilir | Kontrol et; gerekirse `_arcMusic.analyser`'ı kullan. |
| `playCoinTing()` ~8472 | zaten sentez | Dokunma. |

Tutorial kuralı korunur: `musicAllowed()` tutorial'da false döner → müzik yok. Tutorial'da `tap()` / `collect()` SFX'leri çalabilir (`sfxOn` ise).

## Kararlar (Buğra'ya sor ya da varsayılanı uygula)

1. **Menüde müzik:** şu an menüde müzik yok (`musicAllowed` yalnız `scene === 'play'`). Varsayılan: **bu kuralı koru**; menü/oyun sonu ekranında `stop()`. İstenirse menüde `menu()` ile kısık bir ambiyans açılabilir.
2. **Booster'da müzik kısma (duck):** varsayılan: kaldır, yerine `booster()` parlaklığı.
3. **Menü düğmesi tık sesi:** varsayılan: `tap()`.

## Kaldırılacaklar

- `AUDIO/ArcRiseBGMusic.mp3`, `AUDIO/ArcRiseTouch.wav`, `AUDIO/ArcRiseDead.wav` ve bunları yükleyen kod (`BG_SRC`, `loadSfxBuffer` çağrıları, `touchBuffer`, `deadBuffer`, `musicBuffer`, `<audio>` yedekleri `_fallbackAudio`/`bgAudio` — artık gerekmiyorsa).
- `AUDIO/` boşalırsa `sync-www.js` içindeki `ITEMS` listesinden `'AUDIO'` çıkar.
- `RESOURCES/` altındaki Envato kaynakları (`ArcRiseBGMusic_master.wav`, `cinematic-hit-…`, `cyber-power-…`, `rocket-marble-explosion-…` ve `.zip`'leri) **repodan** kaldır (git'ten sil). Buğra yerelde başka yere taşımak isteyebilir; silmeden önce sor.
- `www/`, Android `assets/public/AUDIO` ve iOS `public/AUDIO` kopyaları `npm run sync` ile güncellenir; eski dosyalar orada kalırsa elle temizle.

## Motoru oyuna koyma

Oyun tek dosya (`arcrise.html`). İki seçenek:
- **Önerilen:** `arc-music.js` içeriğini `arcrise.html`'e, ses kodundan (`initAudio`) önce, ayrı bir `<script>` bloğu olarak göm. CSP değişikliği gerekmez.
- Alternatif: dosya olarak bırak, `<script src="ADAPTIVE_MUSIC/arc-music.js">` + `sync-www.js` `ITEMS`'a ekle. Tek kaynak olması için ilk seçenek daha güvenli.

## Test listesi

- [ ] Tarayıcıda: ilk dokunuşta ses bağlamı açılıyor, tutorial sessiz (müzik), run başında müzik geliyor.
- [ ] Chill: mesafe arttıkça kick → bas → hi-hat → snare sırayla giriyor; tempo ~100'den ~122'ye çıkıyor.
- [ ] Yeşil toplar notaya dönüşüyor; combo kırılınca glide.
- [ ] Extreme ve Vanilla farklı duyuluyor.
- [ ] Ölüm: patlama + müzik boğuluyor; oyun sonu ekranında müzik duruyor (Karar 1).
- [ ] Revive ve reklamla devam: müzik geri geliyor.
- [ ] Ayarlar: müzik kapalı → yalnız SFX; SFX kapalı → yalnız müzik.
- [ ] Uygulama arka plana gidince ses kesiliyor, dönünce devam ediyor.
- [ ] iOS: sessiz anahtarı davranışı önceki gibi (`navigator.audioSession = 'playback'` korunuyor).
- [ ] Düşük donanımlı Android'de takılma yok (`LOWFX` → `lite: true`).
- [ ] `npm test` (e2e) geçiyor; `node verify-sync.js` "Tum kopyalar guncel".
- [ ] `privacy.html` / mağaza metinlerinde müzik lisansına dair bir şey varsa güncelle.

## Ayarlanabilir sabitler (`arc-music.js` içinde)

- `targetBpm()`: Chill sabit 120 (2026-11-09, eski müzik temposu), Extreme `126 + 24·e`, Vanilla 88, menü 96.
- Katman eşikleri `scheduleStep()` içinde: kick `e > 0.12`, bas `> 0.22`, hi-hat `> 0.35`, snare `> 0.45`, 16'lık bas `> 0.62`, 16'lık hat `> 0.72`.
- Kick run başından her vuruşta (2026-11-09). Dubstep denemesi geri alındı (git: 0858715).
- Akor yürüyüşleri `PROG`: Chill/Vanilla Am–F–C–G, Extreme Am–F–Dm–E.
- Toplama notaları `PENTA` (A minör pentatonik), MAX combo melodisi `LEAD`.

## İş bitince

1. `DEVELOPMENT_LOG.md`'ye kısa bir oturum notu.
2. Commit mesajı önerisi: `Müzik: lisanslı mp3/wav yerine kodla üretilen uyarlanabilir müzik + SFX (ArcMusic)`.
3. `git push`.
