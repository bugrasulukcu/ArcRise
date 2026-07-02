# ArcRise — Play Console Store Listing

Bu dosya Play Console'da "Store presence → Main store listing" ve "App content" bölümlerine kopyala-yapıştır için hazırlandı.

---

## Short description (max 80 characters)

```
Rotate the arc, dodge obstacles, chase your best distance. Fast & addictive.
```
(76 karakter)

## Full description (max 4000 characters)

```
ArcRise is a fast, one-touch arcade game built around a single simple rule: tap to flip your orbit.

Guide a glowing ball along a curved arc as it rises endlessly upward. Every tap flips your direction between a tight turn and a wide sweep — timing is everything.

HOW TO PLAY
• Tap anywhere to flip your arc
• Collect green orbs to refill your energy
• Avoid red obstacles — one hit and it's over
• Grab gold orbs for bonus score, purple orbs for power-ups

TWO WAYS TO PLAY
• Chill Mode — a relaxed, steady-paced climb
• Extreme Mode — 3x score, accelerating speed, and a screen that's literally on fire

CHASE YOUR BEST
• Global leaderboards for both Score and Distance
• Every run leaves a glowing trail — see the ghost paths of your last 80 runs, and cross-player ghost trails from other players around the world
• Track your personal bests, lifetime stats, and rank over time

MAKE IT YOURS
• Customize your profile with avatars and colored/gradient/rainbow trails
• Add friends, send requests, and see how you stack up
• Earn coins as you play and unlock upgrades

Simple to learn, hard to put down. How far can you rise?
```

---

## Kategori / Category

- **App category**: Games → Arcade
- **Tags** (Play Console content tags, öneri): Arcade, Casual, Single player, Leaderboards

## App content anketi notları

- **Ads**: Hayır (şu an `ADS_ENABLED=false`) — açıldığında bu cevap güncellenmeli.
- **In-app purchases**: Hayır (şu an `IAP_ENABLED=false`) — açıldığında güncellenmeli, fiyat aralığı girilmeli.
- **Target audience / age**: Genel (13+ önerilir çünkü online leaderboard + kullanıcı adı + arkadaş sistemi var — "Designed for Families" programına girmeyin, karma sosyal özellikler var).
- **Data safety anketi**:
  - Toplanan veri: kullanıcı adı (App info bölümünde public), oyun içi skor/mesafe (App activity), cihaz için anonim kimlik (App info).
  - Toplanmayan: gerçek ad, e-posta, telefon, konum, kişiler, fotoğraf galerisi.
  - Veri paylaşımı: 3. taraf ile paylaşım yok (Firebase = data processor, Google altyapısı, "shared" değil "processed" olarak işaretlenir).
  - Silme: Uygulama içi hesap silme mevcut → "Users can request data deletion" = Evet.
- **Privacy policy URL**: `https://bugrasulukcu.github.io/ArcRise/privacy.html` (canlı, doğrulandı ✓)
- **Content rating anketi**: Şiddet/kumar/kullanıcı üretimi müstehcen içerik yok → muhtemelen PEGI 3 / Everyone çıkacak. Anket sırasında "kullanıcılar birbirleriyle etkileşime girebilir mi" sorusuna (arkadaş/leaderboard nedeniyle) **Evet** denmeli.

---

## Görsel varlıklar (checklist)

| Varlık | Boyut/oran | Durum |
|---|---|---|
| App icon (hi-res) | 512×512 PNG, 32-bit | ✅ `PNG/play_store_icon_512.png` hazır |
| Feature graphic | 1024×500 PNG/JPG | ✅ `PNG/feature_graphic.png` hazır |
| Phone screenshots | min 2, önerilen 4–8, 16:9 veya 9:16, min kenar 320px, maks 3840px | ⏳ Emülatör/cihazdan gerçek oynanış görüntüsü lazım (Android Studio'da) |
| Tablet screenshots | opsiyonel | — |

**Screenshot alma notu**: Gerçek oynanış görüntüleri Android Studio emülatöründe veya fiziksel cihazda alınmalı (Chill + Extreme mod, profil ekranı, high scores popup önerilir — 4 görsel yeterli). Bu adım VS Code/Android Studio tarafında, ben computer-use ile ekran görüntüsü almanda eşlik edebilirim.

---

## Internal testing kurulumu (sıradaki adım, Play Console'da)

1. Play Console'da yeni uygulama oluştur → applicationId **`com.bugrasulukcu.arcrise`**.
2. Yukarıdaki metinleri + görselleri gir.
3. App content anketini yukarıdaki notlara göre doldur.
4. Signed **AAB** yükle (bkz. `android/keystore.properties` + `keystore/` klasörü — Android Studio'da `Build → Generate Signed Bundle`).
5. Internal testing track'e yükle, test e-postalarını ekle (kendi hesabın + varsa test kullanıcıları).
6. Test linkini açıp cihazda/emülatörde kur, temel akışı doğrula.
