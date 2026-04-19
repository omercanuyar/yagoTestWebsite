/* ============================================
   KOÇCIHANOĞLU MİMARLIK - ANA SAYFA MANTIĞI
   ============================================ */

'use strict';

(function() {
    function renderFeaturedProjects() {
        var container = document.getElementById('featured-projects');
        var empty = document.getElementById('featured-projects-empty');
        if (!container) return;

        var projects = (SITE_DATA.projects || []).filter(function(p) { return p.isFeatured; });
        if (projects.length === 0) {
            projects = (SITE_DATA.projects || []).slice(-6).reverse();
        }
        projects = projects.slice(0, 6);

        if (projects.length === 0) {
            container.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }
        container.style.display = '';
        if (empty) empty.style.display = 'none';

        var html = '';
        for (var i = 0; i < projects.length; i++) {
            html += createProjectCard(projects[i]);
        }
        container.innerHTML = html;
    }

    function renderStats() {
        var container = document.getElementById('stats-bar');
        if (!container) return;
        var stats = (SITE_DATA.settings && SITE_DATA.settings.stats) || [];
        if (!stats.length) return;

        var html = '';
        for (var i = 0; i < stats.length; i++) {
            html += '<div class="stat-item">' +
                '<div class="stat-number">' + sanitize(stats[i].num) + '</div>' +
                '<div class="stat-label">' + sanitize(stats[i].label) + '</div>' +
            '</div>';
        }
        container.innerHTML = html;
    }

    function renderAll() {
        renderFeaturedProjects();
        renderStats();
        initScrollAnimation();
    }

    onCloudDataReady(renderAll);
})();
