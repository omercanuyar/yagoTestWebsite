/* ============================================
   KOÇCIHANOĞLU MİMARLIK - PROJELER SAYFASI
   ============================================ */

'use strict';

(function() {
    var activeCategory = '';

    function renderFilter() {
        var container = document.getElementById('category-filter');
        if (!container) return;

        var cats = SITE_DATA.categories || [];
        var html = '<button class="category-pill' + (activeCategory === '' ? ' active' : '') + '" data-cat="">Tümü</button>';
        for (var i = 0; i < cats.length; i++) {
            html += '<button class="category-pill' + (activeCategory === cats[i] ? ' active' : '') + '" data-cat="' + sanitize(cats[i]) + '">' + sanitize(cats[i]) + '</button>';
        }
        container.innerHTML = html;

        var pills = container.querySelectorAll('.category-pill');
        for (var j = 0; j < pills.length; j++) {
            pills[j].addEventListener('click', function() {
                activeCategory = this.getAttribute('data-cat') || '';
                renderFilter();
                renderProjects();
            });
        }
    }

    function renderProjects() {
        var container = document.getElementById('projects-grid');
        var empty = document.getElementById('projects-empty');
        if (!container) return;

        var urlCat = getUrlParam('kategori');
        if (urlCat && !activeCategory) {
            activeCategory = urlCat;
        }

        var projects = getProjectsByCategory(activeCategory);

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
        initScrollAnimation();
    }

    function renderAll() {
        renderFilter();
        renderProjects();
    }

    onCloudDataReady(renderAll);
})();
