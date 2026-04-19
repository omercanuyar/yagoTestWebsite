# Koçcihanoğlu Mimarlık

Mimarlık ofisi tanıtım sitesi — **statik, hafif ve GitHub Pages ile yayınlanmaya hazır**.

## Özellikler

- 📐 **Proje portföyü** (konut, ticari, restorasyon vb. kategoriler)
- 🖼️ **Firebase Realtime Database** ile bulut veri & görsel depolama
- 🔐 **Admin paneli** (`y0netim-p4nel.html`) ile proje ekleme/düzenleme
- 🎨 **Pastel mimarlık teması** (sage, dusty rose, powder blue)
- 🔍 **SEO dostu** — Open Graph, Twitter Card, JSON-LD, sitemap.xml
- 📱 Tamamen responsive
- 🚀 Derlemesiz statik dosyalar — GitHub Pages'a direkt yayın

## Yayınlama (GitHub Pages)

1. Bu klasörü bir GitHub reposuna yükleyin.
2. Repo ayarlarından **Pages > Branch: main / root** seçin.
3. Yayın URL'iniz: `https://kullaniciadi.github.io/repo-adi/`
4. `sitemap.xml` ve `robots.txt` içindeki domain'i kendi URL'inize göre güncelleyin.

## Firebase Bağlantısı

1. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni proje oluşturun.
2. **Realtime Database** başlatın.
3. Database URL'sini admin panelindeki **Ayarlar > Firebase Realtime Database URL** alanına yapıştırın.

## Admin Girişi

- URL: `y0netim-p4nel.html`
- Kullanıcı: `kcadmin`
- Şifre: `Koc@Mim2025!`

> **İlk girişten sonra mutlaka kimlik bilgilerini değiştirin.** `js/admin.js` içindeki `_gc()` fonksiyonunda char-code olarak saklanır.

---

## 🔒 Güvenlik

### Sitede ne var, ne yok?

Bu site **tamamen statiktir**: arka uç yok, form verisi kaydedilmez, müşteri bilgisi toplanmaz. Yayınlanan içerik (projeler, açıklamalar, görseller) zaten **herkese açık olarak tasarlanmıştır**.

### Bilinmesi Gereken Riskler

**1. Admin kimliği istemci JavaScript'inde**
`js/admin.js` içindeki `_gc()` fonksiyonu kullanıcı/şifreyi char code dizisi olarak saklar. Bu **gerçek güvenlik değil, engel**. Hedef odaklı biri tarayıcı dev tools ile dakikalar içinde çözebilir. Gerçek güvenlik **Firebase kuralları** tarafından sağlanır.

**2. Rate limiting istemci tarafında**
Brute-force koruması `localStorage` üzerinden çalışır; saldırgan bunu temizleyerek atlatabilir. Ama #1 sebebiyle brute-force'a zaten gerek yok.

**3. Firebase yazma yetkisi (KRİTİK)**
Açık yazma kurallarıyla (`".write": true`) bırakılırsa, Firebase URL'ini ele geçiren **herkes** tüm projelerinizi silebilir/değiştirebilir. URL istemci JS'inde yüklü olduğundan gizli değildir.

### Firebase Güvenlik Kuralları

**Minimum (herkesin yazabildiği, güvensiz — sadece test için):**

```json
{
  "rules": {
    "site": { ".read": true, ".write": true }
  }
}
```

**Önerilen (Firebase Auth ile):**

```json
{
  "rules": {
    "site": {
      ".read": true,
      ".write": "auth != null && auth.token.email == 'sizin-admin-email@domain.com'"
    }
  }
}
```

Bu kuralla yalnızca Firebase Console'dan oluşturduğunuz belirli e-posta sahibi admin yazabilir. Uygulama adımları:

1. **Firebase Console > Authentication > Sign-in method** → Email/Password aktif et.
2. **Authentication > Users > Add user** → admin e-posta + güçlü şifre.
3. Realtime Database > Rules'a yukarıdaki kuralı yapıştır, **Publish**.
4. **Firebase Console > Project Settings > General > Your apps > Web app** oluştur (yoksa) ve SDK config bloğunu kopyala (apiKey, authDomain, databaseURL vs.).
5. Admin paneline **statik kimlikle gir** (`kcadmin` / `Koc@Mim2025!`).
6. **Ayarlar > Firebase Web Config** alanına config'i yapıştır → **Ayarları Kaydet**.
7. Sağ üstten **Çıkış** → tekrar giriş ekranında "Firebase Auth aktif" yazısını gör → **e-posta ve şifre** ile giriş yap.
8. **Dışa Aktar > data.js İndir** → indirilen dosyayı `js/data.js`'in üzerine koy → repo'ya commit et. Böylece diğer cihazlardan da admin paneline aynı config ile girilebilir.

> Firebase Auth ID token'ı her yazma isteğine `?auth=TOKEN` olarak eklenir. Token 1 saatte bir otomatik yenilenir.
> Config değerlerinin (apiKey vs.) herkese açık olması beklenen davranıştır — güvenlik **kurallarda** ve **e-posta/şifre** kombinasyonundadır.

### Üretime geçmeden yapılacaklar (checklist)

- [ ] Firebase Auth kurulumunu yukarıdaki 8 adıma göre tamamla
- [ ] Firebase yazma kuralını e-postaya bağla (yukarıdaki önerilen kural)
- [ ] Firebase Auth aktifleştikten sonra `js/admin.js`'teki statik `_gc()` kimliğini devre dışı bırak veya çok güçlü bir şeye çevir (yerel fallback)
- [ ] `data.js`'i export edip repo'ya commit et
- [ ] GitHub Pages HTTPS zaten aktiftir — custom domain eklenecekse yine HTTPS zorunlu kılınmalı

### Ne İyi Yapılmış?

- ✅ Ziyaretçi verisi toplanmıyor (GDPR/KVKK açısından minimal yüzey)
- ✅ XSS mitigation: tüm kullanıcı içeriği `sanitize()` ile `textContent` üzerinden geçer
- ✅ `X-Frame-Options: DENY` (clickjacking koruması)
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `referrer` politikası `strict-origin-when-cross-origin`
- ✅ Admin sayfası `noindex, nofollow` + `robots.txt` tarafından engellenmiş
- ✅ Inline scriptler dış JS dosyalarına taşındı (CSP-hazır)

### Gelecekte eklenebilecekler

- Content-Security-Policy meta etiketi (JSON-LD için hash veya nonce ile)
- Firebase Auth ile admin giriş akışı
- Rate limiting için Cloudflare Turnstile / hCaptcha

## Dosya Yapısı

```
koccihanoglu-mimarlik/
├── index.html              # Ana sayfa
├── projeler.html           # Proje listesi + filtre
├── proje.html              # Proje detayı
├── hakkimizda.html
├── iletisim.html
├── y0netim-p4nel.html      # Admin paneli
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── css/style.css
└── js/
    ├── data.js             # Veri modeli (projeler)
    ├── common.js           # Ortak fonksiyonlar + bulut sync
    ├── app.js              # Ana sayfa
    ├── projects.js         # Proje listesi
    ├── project.js          # Proje detayı
    ├── about.js            # Hakkımızda sayfası
    ├── contact.js          # İletişim formu
    └── admin.js            # Admin paneli
```
