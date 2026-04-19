/* Koçcihanoğlu Mimarlık - Proje Verileri
   Bu dosya admin panelinden dışa aktarılarak güncellenir.
   Elle düzenlemeyin - admin panelini kullanın. */

var SITE_DATA = {
    version: 1,
    settings: {
        siteName: "Koçcihanoğlu Mimarlık",
        tagline: "Mekâna Değer Katan Mimari Çözümler",
        phone: "+90 555 000 00 00",
        email: "info@koccihanoglu.com",
        whatsappNumber: "905550000000",
        address: "Atatürk Cad. No:1, İstanbul, Türkiye",
        workingHours: "Pazartesi – Cumartesi, 09:00 – 18:00",
        social: {
            instagram: "",
            linkedin: "",
            behance: ""
        },
        firebaseURL: "",
        about: {
            title: "Koçcihanoğlu Mimarlık",
            subtitle: "2010'dan bu yana mimari tasarım ve uygulama",
            story: "Koçcihanoğlu Mimarlık, konut, ticari ve kamusal yapılar başta olmak üzere geniş bir yelpazede mimari tasarım ve uygulama hizmetleri sunar. Her projede mekânın ruhunu, kullanıcının ihtiyaçlarını ve çevre dokusunu özenle okur; zamansız, işlevsel ve estetik çözümler üretiriz.",
            mission: "Mekânla kurulan ilişkiyi zenginleştiren, işvereninin vizyonunu sadelik ve zarafetle buluşturan mimari çözümler üretmek.",
            vision: "Türkiye ve uluslararası arenada mimarinin insani değerini önceleyen, sürdürülebilir ve ilham veren yapılar ortaya koymak.",
            values: [
                { icon: "✦", title: "Özgünlük", desc: "Her projeyi bağlamıyla ele alır, tekrar etmeyen çözümler üretiriz." },
                { icon: "◇", title: "Sadelik", desc: "Gösterişten uzak, zamansız ve anlamlı tasarımlar." },
                { icon: "○", title: "Sürdürülebilirlik", desc: "Malzeme, enerji ve çevre odaklı duyarlı mimarlık." },
                { icon: "△", title: "Detay Titizliği", desc: "Ölçekten detaya aynı özenle çalışır, kaliteyi takip ederiz." }
            ]
        },
        stats: [
            { num: "120+", label: "Tamamlanan Proje" },
            { num: "14", label: "Yıl Tecrübe" },
            { num: "9", label: "Ödül" },
            { num: "18", label: "Şehir" }
        ]
    },
    /* Kategoriler tamamen dinamik — admin panelinden eklenir.
       Proje şeması:
       {
         id, name, category,
         location, year, area, client, status,
         summary,      // Özet (SEO meta, ~160 karakter, zorunlu)
         description,  // Ana açıklama / detay (zorunlu)
         details,      // Alt bölüm / ek bilgi (opsiyonel, SEO için değerli)
         coverImage,   // Vitrin (kapak) görseli - kartlarda kullanılır
         images,       // Detay galerisi
         isFeatured, createdAt
       } */
    categories: [],
    projects: []
};
