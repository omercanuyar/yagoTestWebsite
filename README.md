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

Bu kuralla yalnızca Firebase Console'dan oluşturduğunuz belirli e-posta sahibi admin yazabilir. Uygulamak için:

1. Firebase Console > **Authentication** > Sign-in method > **Email/Password** aktif.
2. Authentication > Users > Add user → admin e-posta + şifre.
3. Yukarıdaki kuralı uygulayın.
4. Admin panelinin Firebase Auth SDK ile entegre edilmesi gerekir — bu README tamamen statik setup içindir; Auth entegrasyonu eklenecekse bir adım daha gereklidir.

### Üretime geçmeden yapılacaklar (checklist)

- [ ] Admin kullanıcı/şifresini `js/admin.js` içinden değiştir
- [ ] Firebase yazma kuralını `auth != null` olarak sıkılaştır
- [ ] Firebase Auth entegrasyonu ekle (gerçek bir giriş için)
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
