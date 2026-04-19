/* ============================================
   KOÇCIHANOĞLU MİMARLIK - PROJE DETAY
   ============================================ */

'use strict';

(function() {
    var currentProject = null;
    var currentImageIndex = 0;

    function loadProject() {
        var id = getUrlParam('id');
        if (!id) { showNotFound(); return; }

        currentProject = findProject(id);
        if (!currentProject) { showNotFound(); return; }

        renderProject();
        renderRelated();
        updateMeta();
        injectJSONLD();
    }

    function showNotFound() {
        var detail = document.getElementById('project-detail');
        var nf = document.getElementById('project-not-found');
        if (detail) detail.style.display = 'none';
        if (nf) nf.style.display = 'block';
    }

    function updateMeta() {
        var p = currentProject;
        var siteName = (SITE_DATA.settings && SITE_DATA.settings.siteName) || 'Koçcihanoğlu Mimarlık';
        document.title = p.name + ' | ' + siteName;

        /* SEO meta description önceliği: summary > description > kategori */
        var desc = p.summary
            ? p.summary.slice(0, 160)
            : (p.description ? p.description.replace(/\s+/g, ' ').slice(0, 155) : ((p.category || 'Mimari') + ' kategorisinde bir proje.'));
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', desc);

        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', p.name + ' | ' + siteName);
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', desc);
        var ogImg = document.querySelector('meta[property="og:image"]');
        var imgSrc = p.coverImage || (p.images && p.images[0]);
        if (ogImg && imgSrc) ogImg.setAttribute('content', imgSrc);
    }

    function injectJSONLD() {
        var p = currentProject;
        var data = {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": p.name,
            "description": p.description || '',
            "creator": {
                "@type": "Organization",
                "name": (SITE_DATA.settings && SITE_DATA.settings.siteName) || "Koçcihanoğlu Mimarlık"
            },
            "genre": p.category,
            "dateCreated": p.year ? String(p.year) : undefined,
            "locationCreated": p.location ? { "@type": "Place", "name": p.location } : undefined,
            "image": (p.images && p.images.length) ? p.images : undefined
        };

        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    function renderProject() {
        var p = currentProject;
        var bcCat = document.getElementById('bc-category');
        var bcName = document.getElementById('bc-name');
        if (bcCat) {
            bcCat.textContent = p.category || 'Projeler';
            bcCat.setAttribute('href', 'projeler.html?kategori=' + encodeURIComponent(p.category || ''));
        }
        if (bcName) bcName.textContent = p.name;

        var nameEl = document.getElementById('project-name');
        if (nameEl) nameEl.textContent = p.name;

        /* Üst satır: kategori • konum */
        var metaLine = document.getElementById('project-meta-line');
        if (metaLine) {
            var parts = [];
            if (p.category) parts.push(p.category);
            if (p.location) parts.push(p.location);
            metaLine.textContent = parts.join(' • ');
        }

        /* Özet - başlık altında büyük puntolu */
        var summaryEl = document.getElementById('project-summary');
        if (summaryEl) {
            if (p.summary) {
                summaryEl.textContent = p.summary;
                summaryEl.style.display = '';
            } else {
                summaryEl.style.display = 'none';
            }
        }

        /* Ana açıklama */
        var descEl = document.getElementById('project-description-text');
        if (descEl) {
            if (p.description) {
                descEl.innerHTML = formatMultiParagraph(p.description);
            } else {
                descEl.innerHTML = '<p style="color:var(--text-muted);font-style:italic;">Bu proje için henüz açıklama eklenmemiştir.</p>';
            }
        }

        /* Alt bölüm / detaylar */
        var detailsSection = document.getElementById('project-details-section');
        var detailsEl = document.getElementById('project-details-text');
        if (detailsEl && detailsSection) {
            if (p.details) {
                detailsEl.innerHTML = formatMultiParagraph(p.details);
                detailsSection.style.display = '';
            } else {
                detailsSection.style.display = 'none';
            }
        }

        renderMeta(p);
        renderGallery(p);
    }

    function formatMultiParagraph(text) {
        var paragraphs = text.split(/\n\s*\n/);
        var html = '';
        for (var i = 0; i < paragraphs.length; i++) {
            var safe = sanitize(paragraphs[i]).replace(/\n/g, '<br>');
            if (safe.trim()) html += '<p>' + safe + '</p>';
        }
        return html;
    }

    function renderMeta(p) {
        var bar = document.getElementById('project-meta-bar');
        if (!bar) return;

        var items = [];
        if (p.category) items.push({ label: 'Kategori', value: p.category });
        if (p.location) items.push({ label: 'Konum', value: p.location });
        if (p.year) items.push({ label: 'Yıl', value: p.year });
        if (p.area) items.push({ label: 'Alan', value: p.area });
        if (p.client) items.push({ label: 'İşveren', value: p.client });
        if (p.status) items.push({ label: 'Durum', value: p.status });

        if (items.length === 0) { bar.style.display = 'none'; return; }

        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += '<div class="project-meta-item">' +
                '<div class="meta-label">' + sanitize(items[i].label) + '</div>' +
                '<div class="meta-value">' + sanitize(String(items[i].value)) + '</div>' +
            '</div>';
        }
        bar.innerHTML = html;
    }

    /* Tüm galeri görselleri: kapak (varsa) + galeri görselleri */
    function getAllImages(p) {
        var all = [];
        if (p.coverImage) all.push(p.coverImage);
        if (p.images && p.images.length) {
            for (var i = 0; i < p.images.length; i++) {
                /* kapak zaten eklendiyse tekrarlama */
                if (p.images[i] !== p.coverImage) all.push(p.images[i]);
            }
        }
        return all;
    }

    function renderGallery(p) {
        var main = document.getElementById('gallery-main');
        var thumbs = document.getElementById('gallery-thumbs');
        if (!main) return;

        var allImages = getAllImages(p);

        if (allImages.length === 0) {
            main.innerHTML = '<div class="placeholder-img" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;font-family:var(--font-heading);color:var(--primary);">◱</div>';
            if (thumbs) thumbs.style.display = 'none';
            return;
        }

        currentImageIndex = 0;
        updateMainImage();

        if (allImages.length > 1 && thumbs) {
            var html = '';
            for (var i = 0; i < allImages.length; i++) {
                html += '<img src="' + sanitize(allImages[i]) + '" alt="' + sanitize(p.name) + ' ' + (i + 1) + '" class="' + (i === 0 ? 'active' : '') + '" data-index="' + i + '" loading="lazy">';
            }
            thumbs.innerHTML = html;
            thumbs.style.display = '';
            var imgEls = thumbs.querySelectorAll('img');
            for (var j = 0; j < imgEls.length; j++) {
                imgEls[j].addEventListener('click', function() {
                    currentImageIndex = parseInt(this.getAttribute('data-index'));
                    updateMainImage();
                });
            }
        } else if (thumbs) {
            thumbs.style.display = 'none';
        }

        main.addEventListener('click', function() { openLightbox(currentImageIndex); });
    }

    function updateMainImage() {
        var p = currentProject;
        var main = document.getElementById('gallery-main');
        if (!main) return;
        var allImages = getAllImages(p);
        if (!allImages.length) return;
        main.innerHTML = '<img src="' + sanitize(allImages[currentImageIndex]) + '" alt="' + sanitize(p.name) + '">';

        var thumbs = document.getElementById('gallery-thumbs');
        if (thumbs) {
            var imgEls = thumbs.querySelectorAll('img');
            for (var i = 0; i < imgEls.length; i++) {
                imgEls[i].classList.toggle('active', i === currentImageIndex);
            }
        }
    }

    /* LIGHTBOX */
    function openLightbox(index) {
        var p = currentProject;
        var allImages = getAllImages(p);
        if (!allImages.length) return;

        var lb = document.getElementById('lightbox');
        var img = document.getElementById('lightbox-img');
        if (!lb || !img) return;

        img.src = allImages[index];
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function initLightbox() {
        var lb = document.getElementById('lightbox');
        var closeBtn = document.getElementById('lightbox-close');
        if (!lb) return;

        function close() {
            lb.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (closeBtn) closeBtn.addEventListener('click', close);
        lb.addEventListener('click', function(e) { if (e.target === lb) close(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lb.classList.contains('active')) close();
        });
    }

    function renderRelated() {
        var container = document.getElementById('related-projects');
        var section = document.getElementById('related-section');
        if (!container || !section) return;

        var related = (SITE_DATA.projects || []).filter(function(p) {
            return p.category === currentProject.category && p.id !== currentProject.id;
        }).slice(0, 3);

        if (related.length === 0) { section.style.display = 'none'; return; }

        section.style.display = '';
        var html = '';
        for (var i = 0; i < related.length; i++) {
            html += createProjectCard(related[i]);
        }
        container.innerHTML = html;
        initScrollAnimation();
    }

    document.addEventListener('DOMContentLoaded', initLightbox);
    onCloudDataReady(loadProject);
})();
