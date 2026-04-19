/* ============================================
   KOÇCIHANOĞLU MİMARLIK - İLETİŞİM FORMU
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('cf-name').value.trim();
        var phone = document.getElementById('cf-phone').value.trim();
        var email = document.getElementById('cf-email').value.trim();
        var subject = document.getElementById('cf-subject').value;
        var message = document.getElementById('cf-message').value.trim();

        if (!name || !email || !message) {
            showToast('Lütfen zorunlu alanları doldurun', 'error');
            return;
        }

        var waNumber = (SITE_DATA.settings && SITE_DATA.settings.whatsappNumber) || '';
        if (!waNumber) {
            showToast('İletişim numarası yapılandırılmamış', 'error');
            return;
        }

        var text = '*Koçcihanoğlu Mimarlık - İletişim Formu*\n\n' +
            '*Ad Soyad:* ' + name + '\n' +
            (phone ? '*Telefon:* ' + phone + '\n' : '') +
            '*E-posta:* ' + email + '\n' +
            '*Konu:* ' + subject + '\n\n' +
            '*Mesaj:*\n' + message;

        var url = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);
        window.open(url, '_blank');
        showToast('WhatsApp açılıyor...', 'success');
        setTimeout(function() { form.reset(); }, 1500);
    });
});
