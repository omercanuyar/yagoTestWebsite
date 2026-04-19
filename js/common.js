/* ============================================
   KOÇCIHANOĞLU MİMARLIK - ORTAK FONKSİYONLAR
   ============================================ */

'use strict';

/* ===== BULUT VERİ SENKRONİZASYONU (Firebase Realtime DB) ===== */
var _cloudDataReady = false;
var _cloudCallbacks = [];

function onCloudDataReady(fn) {
    if (_cloudDataReady) {
        fn();
    } else {
        _cloudCallbacks.push(fn);
    }
}

function _fireCloudCallbacks() {
    _cloudDataReady = true;
    for (var i = 0; i < _cloudCallbacks.length; i++) {
        try { _cloudCallbacks[i](); } catch(e) { console.error(e); }
    }
    _cloudCallbacks = [];
}

function _getFirebaseURL() {
    var url = (SITE_DATA.settings && SITE_DATA.settings.firebaseURL)
        ? SITE_DATA.settings.firebaseURL.replace(/\/+$/, '') : '';
    return url;
}

function loadFromCloud() {
    var url = _getFirebaseURL();
    if (!url) {
        setTimeout(_fireCloudCallbacks, 0);
        return;
    }
    fetch(url + '/site.json')
        .then(function(res) {
            if (!res.ok) throw new Error('Network error');
            return res.json();
        })
        .then(function(data) {
            if (data && Array.isArray(data.projects)) {
                var fbUrl = SITE_DATA.settings.firebaseURL;
                SITE_DATA.projects = data.projects;
                SITE_DATA.categories = data.categories || SITE_DATA.categories;
                if (data.settings) SITE_DATA.settings = data.settings;
                SITE_DATA.settings.firebaseURL = fbUrl;
            }
        })
        .catch(function() { /* çevrimdışı veya hata - yerel veri kullanılır */ })
        .then(function() { _fireCloudCallbacks(); });
}

function saveToCloud(data) {
    var url = _getFirebaseURL();
    if (!url) return Promise.resolve();
    var payload = JSON.parse(JSON.stringify(data));
    if (payload.settings) delete payload.settings.firebaseURL;
    return fetch(url + '/site.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(function() {
        if (typeof showToast === 'function') showToast('Bulut senkronizasyonu başarısız oldu', 'error');
    });
}

/* ===== GÜVENLİK: XSS TEMİZLEME ===== */
function sanitize(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ===== PROJE BULMA ===== */
function findProject(id) {
    if (!window.SITE_DATA || !SITE_DATA.projects) return null;
    return SITE_DATA.projects.find(function(p) { return p.id === id; }) || null;
}

function getProjectsByCategory(category) {
    if (!SITE_DATA.projects) return [];
    if (!category) return SITE_DATA.projects;
    return SITE_DATA.projects.filter(function(p) { return p.category === category; });
}

/* ===== TOAST BİLDİRİM ===== */
function showToast(message, type) {
    type = type || 'success';
    var container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            toast.classList.add('show');
        });
    });

    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
    }, 3200);
}

/* ===== HEADER SCROLL EFEKT ===== */
function initHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;
    var onScroll = function() {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ===== MOBİL MENÜ ===== */
function initMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var mobileNav = document.querySelector('.mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.addEventListener('click', function(e) {
        if (e.target === mobileNav) {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    var links = mobileNav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function() {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

/* ===== PROJE KART HTML ===== */
function createProjectCard(project, opts) {
    if (!project) return '';
    opts = opts || {};

    var imageHtml = '';
    var coverSrc = project.coverImage || (project.images && project.images[0]);
    if (coverSrc) {
        imageHtml = '<img src="' + sanitize(coverSrc) + '" alt="' + sanitize(project.name) + ' - ' + sanitize(project.category) + '" loading="lazy">';
    } else {
        imageHtml = '<div class="placeholder-img">◱</div>';
    }

    var badgeHtml = '';
    if (project.isFeatured) {
        badgeHtml = '<span class="project-badge featured">Öne Çıkan</span>';
    } else {
        badgeHtml = '<span class="project-badge">' + sanitize(project.category || '') + '</span>';
    }

    var arrowHtml = '<span class="project-card-arrow" aria-hidden="true">→</span>';

    var metaParts = [];
    if (project.category && project.isFeatured) metaParts.push(sanitize(project.category));
    if (project.year) metaParts.push(sanitize(String(project.year)));
    if (project.area) metaParts.push(sanitize(project.area));

    var metaHtml = '';
    if (metaParts.length) {
        metaHtml = '<div class="project-card-meta">';
        for (var i = 0; i < metaParts.length; i++) {
            if (i > 0) metaHtml += '<span class="dot"></span>';
            metaHtml += '<span>' + metaParts[i] + '</span>';
        }
        metaHtml += '</div>';
    }

    var locationHtml = project.location
        ? '<div class="project-card-location"><span aria-hidden="true">◉</span> ' + sanitize(project.location) + '</div>'
        : '';

    var projectUrl = 'proje.html?id=' + encodeURIComponent(project.id);

    return '<a href="' + projectUrl + '" class="project-card animate-in" itemscope itemtype="https://schema.org/CreativeWork">' +
        '<div class="project-card-image">' +
            imageHtml +
            badgeHtml +
            arrowHtml +
        '</div>' +
        '<div class="project-card-info">' +
            metaHtml +
            '<h3 class="project-card-name" itemprop="name">' + sanitize(project.name) + '</h3>' +
            locationHtml +
        '</div>' +
    '</a>';
}

/* ===== URL PARAMETRE ===== */
function getUrlParam(key) {
    var params = new URLSearchParams(window.location.search);
    return params.get(key);
}

/* ===== SCROLL ANİMASYON ===== */
function initScrollAnimation() {
    var elements = document.querySelectorAll('.animate-in');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
        for (var k = 0; k < elements.length; k++) elements[k].classList.add('visible');
        return;
    }

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    for (var i = 0; i < elements.length; i++) {
        observer.observe(elements[i]);
    }
}

/* ===== YIL FOOTER ===== */
function initFooterYear() {
    var el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
}

/* ===== SETTINGS -> DOM (footer vb.) ===== */
function applyGlobalSettings() {
    var s = SITE_DATA.settings || {};
    var elems = document.querySelectorAll('[data-site-setting]');
    for (var i = 0; i < elems.length; i++) {
        var key = elems[i].getAttribute('data-site-setting');
        var value = '';
        if (key === 'phone') value = s.phone || '';
        else if (key === 'email') value = s.email || '';
        else if (key === 'address') value = s.address || '';
        else if (key === 'workingHours') value = s.workingHours || '';
        else if (key === 'whatsapp') value = s.whatsappNumber ? ('https://wa.me/' + s.whatsappNumber) : '#';
        else if (key === 'tagline') value = s.tagline || '';
        else if (key === 'siteName') value = s.siteName || '';

        if (elems[i].tagName === 'A' && (key === 'phone' || key === 'email' || key === 'whatsapp')) {
            if (key === 'phone') elems[i].setAttribute('href', 'tel:' + (s.phone || '').replace(/\s+/g, ''));
            else if (key === 'email') elems[i].setAttribute('href', 'mailto:' + (s.email || ''));
            else if (key === 'whatsapp') elems[i].setAttribute('href', value);
            if (key !== 'whatsapp') elems[i].textContent = value;
        } else {
            elems[i].textContent = value;
        }
    }
}

/* ===== BAŞLATMA ===== */
function initCommon() {
    initHeaderScroll();
    initMobileMenu();
    initFooterYear();
    loadFromCloud();
}

document.addEventListener('DOMContentLoaded', initCommon);
onCloudDataReady(applyGlobalSettings);
