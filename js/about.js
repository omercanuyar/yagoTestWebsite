/* ============================================
   KOÇCIHANOĞLU MİMARLIK - HAKKIMIZDA SAYFASI
   ============================================ */

'use strict';

onCloudDataReady(function() {
    var s = SITE_DATA.settings && SITE_DATA.settings.about;
    if (!s) return;

    if (s.title) document.getElementById('about-title').textContent = s.title;
    if (s.subtitle) document.getElementById('about-subtitle').textContent = s.subtitle;
    if (s.story) document.getElementById('about-story').textContent = s.story;
    if (s.mission) document.getElementById('about-mission').textContent = s.mission;
    if (s.vision) document.getElementById('about-vision').textContent = s.vision;

    var values = Array.isArray(s.values) ? s.values : [];
    var container = document.getElementById('values-container');
    if (container && values.length) {
        var html = '';
        for (var i = 0; i < values.length; i++) {
            var v = values[i];
            var icon = typeof v === 'string' ? '◇' : (v.icon || '◇');
            var title = typeof v === 'string' ? v : (v.title || '');
            var desc = typeof v === 'string' ? '' : (v.desc || '');
            html += '<div class="value-card">' +
                '<div class="value-icon" aria-hidden="true">' + sanitize(icon) + '</div>' +
                '<h4>' + sanitize(title) + '</h4>' +
                (desc ? '<p>' + sanitize(desc) + '</p>' : '') +
            '</div>';
        }
        container.innerHTML = html;
    }
});
