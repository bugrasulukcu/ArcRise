# ArcRise — düzeltmelerin ikinci incelemesi

İncelenen commit: `5f9b485`. Karşılaştırma: `0a9e2f5..5f9b485`. Önceki rapor: `CODEX_REVIEW_RESULTS_v25.md`.

Önceki beş ana hata testlerde giderilmiş; 36 mevcut testin tamamı geçti. Yeni eklenen challenge gönderim kuyruğunda iki ayrı veri kaybı doğrulandı. Oyun kodu ve kurallar değiştirilmedi.

## Yeni bulgular

### 1. [P2] Çevrimdışıyken yeniden deneme sayacı tükeniyor; challenge sessizce siliniyor

**Konum:** `flushChalOutbox`, `arcrise.html:15488–15496`; çağıran `loadSocial`, `15340`; periyodik/ön plana dönüş yenilemesi, `15662–15663`.

Her başarısız `sendChallenge()` çağrısı, bağlantı hiç kurulmasa bile `n` sayacını artırıyor. Altıncı başarısızlıkta kayıt `keep` listesine eklenmiyor; `finally` onu kalıcı kuyruktan siliyor. Menü açıkken sosyal yenileme 20 saniyede bir çalıştığı için yaklaşık iki dakikalık bağlantısızlık kaydı yok edebilir. Uygulamayı ön plana getirmek de aynı sayacı tüketiyor. Kullanıcıya gösterilen “will retry when you are online” mesajı bu davranışla uyuşmuyor.

**Tekrar üretme:** Google API isteklerinin tamamını sahte Firebase'de bağlantı hatasına düşür. Geçerli yerel isim/tag ve aşağıdaki kayıtla uygulamayı aç:

```js
arc_chal_outbox = [{
  to: 'HOST#1234', mode: 'normal', best: 123,
  seed: Date.now(), n: 0
}];
```

Altı sosyal yenileme gerçekleşsin. Testte beklemeyi kısaltmak için uygulamanın zaten dinlediği `visibilitychange` olayı kullanıldı; ağ bütün süre boyunca kapalı kaldı.

**Gözlenen:** Kalıcı kaydın sayacı `1 → 2 → 3 → 4 → 5 → null`. Sahte sunucuda başarılı challenge yazımı yok; `arc_chal_outbox` tamamen kaldırılıyor.

**Beklenen:** Geçici bağlantı hatasında gönderilmeyen challenge'ın korunması veya kullanıcıya yeniden deneme imkânıyla başarısız durumda tutulması. Deneme sınırı uygulanacaksa bile kayıt sessizce kaybedilmemeli. Bu bulgu altı sayısının denge açısından değiştirilmesi talebi değil; bağlantısızlığın kalıcı veri kaybına dönüşmesiyle ilgili.

**Doğrulama:** Gerçek oyun sayfasında Chrome/CDP ve sahte Firebase ile yeniden üretildi.

### 2. [P2] Gönderim sürerken kuyruğa eklenen challenge eski listeyle eziliyor

**Konum:** `flushChalOutbox`, `arcrise.html:15480–15496`; `queueChalSend`, `15472–15475`.

`flushChalOutbox()` kuyruğu bir kez okuyor ve ağ isteğini bekliyor. Bu sırada `queueChalSend()` yeni bir challenge ekleyebilir. Bekleyen işlem tamamlanınca `writeChalOutbox(keep)` yalnız ilk okunan listedeki kayıtları geri yazar; sonradan eklenenleri siler. `_chalOutboxBusy` yalnız ikinci flush'ı engeller; kuyruğa eklemeyi korumaz.

**Tekrar üretme:**

1. Kuyrukta FIRST hedefli A challenge'ı olsun; `flushChalOutbox()` başlat.
2. A'nın ağ isteğini beklet.
3. İkinci challenge için `queueChalSend(B)` çalıştır; kalıcı kuyruk artık `[A, B]`.
4. A'nın isteğini başarısız sonuçlandır.

**Gözlenen:** Kuyruk `[A(n:1)]` oluyor; B hiç gönderilmeden kayboluyor. A başarılı olsa da aynı eski listeyi yazma sorunu mevcut.

**Beklenen:** A'nın sonucu yalnız A kaydını değiştirmeli; sonradan eklenen B korunmalı. Örneğin güncel kuyruğa kayıt kimliği üzerinden sonuç uygulamak gerekir.

**Doğrulama:** Yeni kuyruk fonksiyonları kaynak dosyadan değiştirilmeden alınarak Node VM'de çalıştırıldı. `localStorage` bellek içi taklit, `sendChallenge` kontrollü bekleyen Promise idi. Tarayıcıda iki gerçek kullanıcı akışı eşzamanlı oynatılmadı; doğrulanan şey doğrudan üretimde kullanılan fonksiyonların bu zamanlama altında B'yi silmesi.

## Önceki bulguların durumu

| Önceki bulgu | İkinci inceleme |
|---|---|
| Günlük koşuda Revive kullanımı | `offerRevive()` artık `_seeded()` kontrolü yapıyor. Günlük koşu regresyon testiyle kontrol edildi. |
| Gold Rush'ın günlük parkura sızması | Eşya bayrakları ilk spawn öncesinde kuruluyor. Temiz günlük parkurla önceki Gold Rush koşusu sonrası parkur karşılaştırılıyor. |
| Challenge hakkının yenilemeyle korunması | Başlangıç çizgisinde alıcının hakkı kalıcı düşülüyor. İki gerçek sayfa yenilemesiyle ikinci/üçüncü hakların korunduğu ve dördüncü koşunun başlamadığı ayrıca doğrulandı. |
| Kendi skor kaydının alt komşuyu gizlemesi | Sorgu bir fazla kayıt alıp kendi kaydını eledikten sonra kesiyor. Alt ve üst komşu durumları test kapsamına alınmış. |
| Wife modunda sandıktan coin kazanılması | Hem doğal spawn hem toplama yoluna Wife engeli eklenmiş. Sandık yerleştirme regresyon testiyle kalıcı hak/pending yazılmadığı kontrol ediliyor. |

Hak testinde `tries:1` ile başlandı: çizgiden önce değer 1 kaldı; çizgiden sonra 2 oldu. Yenileme sonrası üçüncü koşuda 3 oldu. İkinci yenilemede PLAY seçilince sonuçlandırma çalıştı; `{scene:"home", chal:null, intro:false}` gözlendi. Normal oyun sonunda aynı hakkın tekrar düşülmesi mevcut arkadaşlık testinde de kontrol ediliyor.

Ek değişiklikler: Rastgele hareket eden engeller kendi RNG'sini alıyor; Mystery/kristal ödülleri parkur RNG'sinden ayrı akış kullanıyor. Önceki tohumlanmamış çağrılar kodda kaldırılmış. Uzun koşularda ve farklı kare hızlarında eşitlik ayrıca ölçülmedi. Challenge modu ve soft-cap hakkındaki önceki belge farkları özet dosyasında düzeltilmiş.

## Firestore

`firestore.rules:201` artık `status == 'won'` ile `result > target` eşitliğini şart koşuyor. Böylece bildirilen sonuç hedefin altındayken `won` yazılması statik olarak engelleniyor; beraberlik `lost` olmalı. Önceki tutarsız sonuç bulgusu kaynak kuralda giderilmiş görünüyor.

Rules Emulator çalıştırılmadı ve canlı deploy durumu kontrol edilmedi. E2E'nin sahte Firebase'i hâlâ gerçek `firestore.rules` dosyasını yürütmüyor. `via` alanının davet kodunu bilen kişiye otomatik arkadaşlık sağlaması ve ilerlemenin cihazlar arasında sunucudan doğrulanmaması önceki sınırlamalar olarak sürüyor; yeni regresyon diye sayılmadı.

## Doğrulama ve sınırlar

| Kontrol | Sonuç |
|---|---|
| `E2E_PART=1/2 npm test` | 18/18 geçti |
| `E2E_PART=2/2 npm test` | 18/18 geçti; arkadaşlık ve yeni review regresyon testi dahil |
| Ek gerçek-yenileme testi | Geçti; üçüncü hak sonrası dördüncü koşu başlamadı |
| Ek çevrimdışı kuyruk testi | Veri kaybı doğrulandı; altıncı başarısızlıkta kayıt silindi |
| İzole eşzamanlı kuyruk testi | Veri kaybı doğrulandı; bekleme sırasında eklenen B silindi |
| `git diff 0a9e2f5 HEAD --check` | Geçti |
| `npm run verify` | Başarısız; iki oyun kopyası farklı |

Önceki incelemede aralıklı başarısız olan arkadaşlık testi bu sefer ilk çalıştırmada geçti. Testte pozitif skoru garanti etmek için başlangıç çizgisi sonrası kapı yerleştirilmiş; o eski kararsızlığın tetikleyicisi ele alınmış.

`npm run verify` hâlâ iki dosyada fark bildiriyor: `www/arcrise.html` ve `android/app/src/main/assets/public/arcrise.html`. Kaynak düzeltmeleri bu yerel paket kopyalarına aktarılmamış. Yeni Android build öncesinde sync gerekir; inceleme kapsamında sync yapılmadı.

Ek doğrulama araçları: `/tmp/arcrise-rereview-e2e.mjs` ve `/tmp/arcrise-rereview-outbox.mjs`. Üretim Firebase'e oyun verisi gönderilmedi; Firebase CLI, seed aracı, deploy ve push çalıştırılmadı.
