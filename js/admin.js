/* ============================================
   KOÇCIHANOĞLU MİMARLIK - ADMİN PANELİ
   Güvenlik: rate limiting, session timeout
   ============================================ */

'use strict';

(function() {
    /* ===== SABİTLER ===== */
    var ATTEMPTS_KEY = 'kc_la';
    var SESSION_KEY = 'kc_admin_session';
    var LOCAL_DATA_KEY = 'kc_site_data';
    var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    var MAX_IMAGE_WIDTH = 1400;
    var IMAGE_QUALITY = 0.75;
    var MAX_IMAGES = 8;

    var workingData = null;
    var deleteTargetId = null;
    var tempCoverImage = null;
    var tempImages = [];

    /* ===== KİMLİK (kcadmin / Koc@Mim2025!) ===== */
    function _gc() {
        var a = [107,99,97,100,109,105,110];
        var b = [75,111,99,64,77,105,109,50,48,50,53,33];
        return {
            u: String.fromCharCode.apply(null, a),
            p: String.fromCharCode.apply(null, b)
        };
    }

    function verifyCredentials(username, password) {
        var c = _gc();
        return username === c.u && password === c.p;
    }

    /* ===== GİRİŞ DENEME TAKİBİ ===== */
    function getAttemptData() {
        try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || { c: 0, t: 0 }; }
        catch(e) { return { c: 0, t: 0 }; }
    }

    function getLockoutMs(count) {
        if (count >= 15) return 86400000;
        if (count >= 10) return 3600000;
        if (count >= 5)  return 900000;
        return 0;
    }

    function isLockedOut() {
        var d = getAttemptData();
        var lockMs = getLockoutMs(d.c);
        if (!lockMs) return false;
        var remaining = lockMs - (Date.now() - d.t);
        if (remaining > 0) return Math.ceil(remaining / 1000);
        return false;
    }

    function recordFailedAttempt() {
        var d = getAttemptData();
        d.c++;
        d.t = Date.now();
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(d));
    }

    function clearAttempts() { localStorage.removeItem(ATTEMPTS_KEY); }

    function createSession() {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), active: true }));
    }
    function isSessionValid() {
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            if (!s || !s.active) return false;
            if (Date.now() - s.ts > SESSION_TIMEOUT_MS) { destroySession(); return false; }
            return true;
        } catch(e) { return false; }
    }
    function refreshSession() {
        if (isSessionValid()) {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            s.ts = Date.now();
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        }
    }
    function destroySession() { sessionStorage.removeItem(SESSION_KEY); }

    /* ===== BAŞLATMA ===== */
    function init() {
        /* Firebase Auth config varsa başlat */
        var cfg = SITE_DATA.settings && SITE_DATA.settings.firebaseConfig;
        if (cfg) initFirebaseAuth(cfg);

        /* Firebase Auth varsa onAuthStateChanged dinle — otomatik oturum */
        if (isFirebaseAuthReady()) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    clearAttempts();
                    createSession();
                    if (document.getElementById('admin-dashboard').classList.contains('active')) {
                        refreshSession();
                    } else {
                        initDashboard();
                    }
                } else {
                    /* Çıkış yapıldı veya oturum yok */
                    if (document.getElementById('admin-dashboard').classList.contains('active')) {
                        destroySession();
                        location.reload();
                    }
                }
            });
        }

        if (isSessionValid() && (!isFirebaseAuthReady() || firebase.auth().currentUser)) {
            initDashboard();
            return;
        }
        showLogin();
    }

    function updateLoginModeBadge() {
        var badge = document.getElementById('login-mode-badge');
        var label = document.getElementById('login-username-label');
        if (!badge || !label) return;
        if (isFirebaseAuthReady()) {
            badge.innerHTML = '<span style="color:var(--success);">● Firebase Auth aktif</span>';
            label.textContent = 'E-posta';
            document.getElementById('login-username').setAttribute('type', 'email');
        } else {
            badge.innerHTML = '<span style="color:var(--warning);">● Yerel mod (Firebase config eksik)</span>';
            label.textContent = 'Kullanıcı Adı';
            document.getElementById('login-username').setAttribute('type', 'text');
        }
    }

    function showLogin() {
        var form = document.getElementById('login-form');
        form.style.display = 'block';
        updateLoginModeBadge();

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var lockSec = isLockedOut();
            if (lockSec) { showLockout(); return; }

            var u = document.getElementById('login-username').value.trim();
            var p = document.getElementById('login-password').value;
            var err = document.getElementById('login-error');
            err.classList.remove('show');

            if (!u || !p) {
                err.textContent = 'Lütfen tüm alanları doldurun.';
                err.classList.add('show');
                return;
            }

            /* Firebase Auth modu */
            if (isFirebaseAuthReady()) {
                var submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Giriş yapılıyor...'; }

                firebase.auth().signInWithEmailAndPassword(u, p)
                    .then(function() {
                        clearAttempts();
                        /* onAuthStateChanged dinleyicisi initDashboard çağıracak */
                    })
                    .catch(function(error) {
                        recordFailedAttempt();
                        var msg = 'Giriş başarısız. ';
                        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                            msg = 'E-posta veya şifre hatalı.';
                        } else if (error.code === 'auth/invalid-email') {
                            msg = 'Geçersiz e-posta formatı.';
                        } else if (error.code === 'auth/too-many-requests') {
                            msg = 'Çok fazla hatalı deneme. Firebase tarafından geçici olarak engellendi. Bir süre bekleyin.';
                        } else if (error.code === 'auth/network-request-failed') {
                            msg = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
                        } else {
                            msg = 'Hata: ' + (error.message || error.code || 'bilinmeyen');
                        }
                        err.textContent = msg;
                        err.classList.add('show');
                        if (isLockedOut()) showLockout();
                    })
                    .then(function() {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Giriş Yap'; }
                    });
                return;
            }

            /* Yerel mod (Firebase yok) — eski davranış */
            if (verifyCredentials(u, p)) {
                clearAttempts();
                createSession();
                initDashboard();
            } else {
                recordFailedAttempt();
                if (isLockedOut()) {
                    showLockout();
                } else {
                    var d = getAttemptData();
                    var next = 5 - (d.c % 5);
                    err.textContent = 'Kullanıcı adı veya şifre hatalı. ' + next + ' deneme hakkı kaldı.';
                    err.classList.add('show');
                }
            }
        });

        if (isLockedOut()) showLockout();
    }

    function showLockout() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('lockout-section').style.display = 'block';
        var msgEl = document.getElementById('lockout-msg');
        var d = getAttemptData();

        function fmt(total) {
            var h = Math.floor(total / 3600);
            var m = Math.floor((total % 3600) / 60);
            var s = total % 60;
            if (h > 0) return h + ' sa ' + m + ' dk ' + s + ' sn';
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        (function tick() {
            var s = isLockedOut();
            if (!s) {
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('lockout-section').style.display = 'none';
                return;
            }
            var lvl = d.c >= 15 ? '24 saat' : d.c >= 10 ? '1 saat' : '15 dakika';
            msgEl.textContent = 'Erişim engellendi (' + d.c + ' hatalı deneme). ' + lvl + ' süreyle kilitlendi. Kalan: ' + fmt(s);
            setTimeout(tick, 1000);
        })();
    }

    /* ===== DASHBOARD ===== */
    function initDashboard() {
        document.getElementById('admin-login-page').style.display = 'none';
        document.getElementById('admin-dashboard').classList.add('active');

        initNavigation();
        initProjectForm();
        initCategoryForm();
        initSettingsForm();
        initExport();
        initImport();
        initDeleteModal();
        initLogout();
        initSidebarToggle();

        document.addEventListener('click', refreshSession);
        document.addEventListener('keydown', refreshSession);

        setInterval(function() { if (!isSessionValid()) location.reload(); }, 60000);

        loadWorkingData();
    }

    function renderAllDashboard() {
        renderDashboardStats();
        renderRecentProjects();
        renderProjectsTable();
        renderCategoriesList();
        loadSettings();
    }

    function loadWorkingData() {
        workingData = JSON.parse(JSON.stringify(SITE_DATA));
        renderAllDashboard();

        var url = _getFirebaseURL();
        if (!url) return;

        fetch(url + '/site.json')
            .then(function(res) { if (!res.ok) throw new Error('Network'); return res.json(); })
            .then(function(data) {
                if (data && Array.isArray(data.projects)) {
                    var fb = SITE_DATA.settings.firebaseURL;
                    workingData = data;
                    if (!workingData.settings) workingData.settings = {};
                    workingData.settings.firebaseURL = fb;
                    renderAllDashboard();
                }
            })
            .catch(function() {});
    }

    function saveWorkingData() {
        try { localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(workingData)); }
        catch(e) { showToast('Veri kaydedilemedi', 'error'); }
        saveToCloud(workingData);
    }

    function generateId() {
        return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    /* ===== NAVİGASYON ===== */
    function switchSection(sectionId) {
        var all = document.querySelectorAll('.admin-section');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        var target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        var ls = document.querySelectorAll('.admin-sidebar nav a');
        for (var k = 0; k < ls.length; k++) {
            ls[k].classList.toggle('active', ls[k].getAttribute('data-section') === sectionId);
        }
        document.getElementById('admin-sidebar').classList.remove('open');
    }

    function initNavigation() {
        /* Tüm [data-section] linkleri (sidebar + inline uyarı linkleri dahil) */
        document.addEventListener('click', function(e) {
            var el = e.target.closest('[data-section]');
            if (!el) return;
            e.preventDefault();
            switchSection(el.getAttribute('data-section'));
        });
    }

    function initSidebarToggle() {
        var toggle = document.getElementById('toggle-sidebar');
        var sidebar = document.getElementById('admin-sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', function() { sidebar.classList.toggle('open'); });
        }
    }

    /* ===== DASHBOARD İSTATİSTİK ===== */
    function renderDashboardStats() {
        var projects = workingData.projects || [];
        document.getElementById('stat-projects').textContent = projects.length;
        document.getElementById('stat-categories').textContent = (workingData.categories || []).length;
        document.getElementById('stat-featured').textContent = projects.filter(function(p) { return p.isFeatured; }).length;
        var years = projects.map(function(p) { return parseInt(p.year) || 0; }).filter(function(y) { return y > 0; });
        var oldest = years.length ? Math.min.apply(null, years) : new Date().getFullYear();
        var experienceYears = new Date().getFullYear() - oldest;
        document.getElementById('stat-experience').textContent = experienceYears > 0 ? experienceYears + '+' : '—';
    }

    function renderRecentProjects() {
        var tbody = document.getElementById('recent-projects-body');
        if (!tbody) return;
        var projects = (workingData.projects || []).slice(-5).reverse();
        if (!projects.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Henüz proje eklenmemiş</td></tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < projects.length; i++) {
            var p = projects[i];
            var thumbSrc = p.coverImage || (p.images && p.images[0]);
            var thumb = thumbSrc
                ? '<img class="project-thumb" src="' + sanitize(thumbSrc) + '" alt="">'
                : '<div class="project-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-alt);">◱</div>';
            html += '<tr>' +
                '<td>' + thumb + '</td>' +
                '<td>' + sanitize(p.name) + '</td>' +
                '<td>' + sanitize(p.category) + '</td>' +
                '<td>' + sanitize(p.year || '—') + '</td>' +
                '<td><button class="btn btn-sm btn-secondary edit-project-btn" data-id="' + sanitize(p.id) + '">Düzenle</button></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
        bindEditButtons(tbody);
    }

    /* ===== PROJE TABLOSU ===== */
    function renderProjectsTable() {
        var tbody = document.getElementById('projects-table-body');
        var empty = document.getElementById('projects-empty');
        if (!tbody) return;

        /* Kategori yok uyarısı */
        var warn = document.getElementById('no-category-warning');
        if (warn) warn.style.display = (workingData.categories || []).length === 0 ? 'block' : 'none';

        var projects = workingData.projects || [];
        if (!projects.length) {
            tbody.parentElement.parentElement.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }
        tbody.parentElement.parentElement.style.display = '';
        if (empty) empty.style.display = 'none';

        var html = '';
        for (var i = projects.length - 1; i >= 0; i--) {
            var p = projects[i];
            var thumbSrc = p.coverImage || (p.images && p.images[0]);
            var thumb = thumbSrc
                ? '<img class="project-thumb" src="' + sanitize(thumbSrc) + '" alt="">'
                : '<div class="project-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-alt);">◱</div>';
            var featured = p.isFeatured ? '<span style="color:var(--primary);font-weight:700;">★ Öne Çıkan</span>' : '—';
            html += '<tr>' +
                '<td>' + thumb + '</td>' +
                '<td>' + sanitize(p.name) + '</td>' +
                '<td>' + sanitize(p.category) + '</td>' +
                '<td>' + sanitize(p.location || '—') + '</td>' +
                '<td>' + sanitize(p.year || '—') + '</td>' +
                '<td>' + featured + '</td>' +
                '<td class="actions">' +
                    '<button class="btn btn-sm btn-secondary edit-project-btn" data-id="' + sanitize(p.id) + '">Düzenle</button>' +
                    '<button class="btn btn-sm btn-danger delete-project-btn" data-id="' + sanitize(p.id) + '">Sil</button>' +
                '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
        bindEditButtons(tbody);
        bindDeleteButtons(tbody);
    }

    function bindEditButtons(container) {
        var btns = container.querySelectorAll('.edit-project-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() { openEditProject(this.getAttribute('data-id')); });
        }
    }
    function bindDeleteButtons(container) {
        var btns = container.querySelectorAll('.delete-project-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() { openDeleteModal(this.getAttribute('data-id')); });
        }
    }

    /* ===== PROJE FORMU ===== */
    function initProjectForm() {
        var modal = document.getElementById('project-modal');
        var addBtn = document.getElementById('btn-add-project');
        var closeBtn = document.getElementById('close-project-modal');
        var cancelBtn = document.getElementById('cancel-project-btn');
        var form = document.getElementById('project-form');
        var uploadArea = document.getElementById('image-upload-area');
        var fileInput = document.getElementById('image-file-input');

        addBtn.addEventListener('click', function() { openNewProject(); });
        closeBtn.addEventListener('click', closeProjectModal);
        cancelBtn.addEventListener('click', closeProjectModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeProjectModal(); });

        /* Galeri görselleri uploader */
        uploadArea.addEventListener('click', function() { fileInput.click(); });
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });
        uploadArea.addEventListener('dragleave', function() { uploadArea.style.borderColor = ''; });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            handleImageFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', function() { handleImageFiles(this.files); this.value = ''; });

        /* Vitrin (kapak) görseli uploader */
        var coverArea = document.getElementById('cover-upload-area');
        var coverInput = document.getElementById('cover-file-input');
        if (coverArea && coverInput) {
            coverArea.addEventListener('click', function() { coverInput.click(); });
            coverArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                coverArea.style.borderColor = 'var(--primary)';
            });
            coverArea.addEventListener('dragleave', function() { coverArea.style.borderColor = ''; });
            coverArea.addEventListener('drop', function(e) {
                e.preventDefault();
                coverArea.style.borderColor = '';
                if (e.dataTransfer.files[0]) processCoverImage(e.dataTransfer.files[0]);
            });
            coverInput.addEventListener('change', function() {
                if (this.files[0]) processCoverImage(this.files[0]);
                this.value = '';
            });
        }

        form.addEventListener('submit', function(e) { e.preventDefault(); saveProject(); });
    }

    function openNewProject() {
        /* Kategori yoksa uyar, kategoriler sekmesine yönlendir */
        if (!workingData.categories || workingData.categories.length === 0) {
            showToast('Önce en az bir kategori eklemelisiniz', 'error');
            switchSection('categories-section');
            return;
        }
        tempImages = [];
        tempCoverImage = null;
        document.getElementById('project-edit-id').value = '';
        document.getElementById('project-modal-title').textContent = 'Yeni Proje Ekle';
        document.getElementById('project-form').reset();
        renderImagePreviews();
        renderCoverPreview();
        populateCategorySelect();
        openModal('project-modal');
    }

    function openEditProject(id) {
        var p = null;
        for (var i = 0; i < workingData.projects.length; i++) {
            if (workingData.projects[i].id === id) { p = workingData.projects[i]; break; }
        }
        if (!p) return;

        tempImages = (p.images || []).slice();
        tempCoverImage = p.coverImage || null;
        document.getElementById('project-edit-id').value = p.id;
        document.getElementById('project-modal-title').textContent = 'Projeyi Düzenle';
        document.getElementById('project-name').value = p.name || '';
        document.getElementById('project-location').value = p.location || '';
        document.getElementById('project-year').value = p.year || '';
        document.getElementById('project-area').value = p.area || '';
        document.getElementById('project-client').value = p.client || '';
        document.getElementById('project-status').value = p.status || '';
        document.getElementById('project-summary').value = p.summary || '';
        document.getElementById('project-description').value = p.description || '';
        document.getElementById('project-details').value = p.details || '';
        document.getElementById('project-is-featured').checked = !!p.isFeatured;

        populateCategorySelect();
        document.getElementById('project-category').value = p.category || '';

        renderImagePreviews();
        renderCoverPreview();
        openModal('project-modal');
    }

    function populateCategorySelect() {
        var sel = document.getElementById('project-category');
        var current = sel.value;
        sel.innerHTML = '<option value="">Kategori seçin</option>';
        var cats = workingData.categories || [];
        for (var i = 0; i < cats.length; i++) {
            var opt = document.createElement('option');
            opt.value = cats[i];
            opt.textContent = cats[i];
            sel.appendChild(opt);
        }
        if (current) sel.value = current;
    }

    function saveProject() {
        var editId = document.getElementById('project-edit-id').value;
        var name = document.getElementById('project-name').value.trim();
        var category = document.getElementById('project-category').value;
        var location = document.getElementById('project-location').value.trim();
        var year = document.getElementById('project-year').value.trim();
        var area = document.getElementById('project-area').value.trim();
        var client = document.getElementById('project-client').value.trim();
        var status = document.getElementById('project-status').value.trim();
        var summary = document.getElementById('project-summary').value.trim();
        var description = document.getElementById('project-description').value.trim();
        var details = document.getElementById('project-details').value.trim();
        var isFeatured = document.getElementById('project-is-featured').checked;

        if (!name || !category) {
            showToast('Ad ve kategori zorunludur', 'error');
            return;
        }
        if (!summary) {
            showToast('Özet alanı zorunludur (SEO için)', 'error');
            document.getElementById('project-summary').focus();
            return;
        }
        if (!description) {
            showToast('Ana açıklama zorunludur (SEO için)', 'error');
            document.getElementById('project-description').focus();
            return;
        }

        var projectData = {
            name: name,
            category: category,
            location: location,
            year: year,
            area: area,
            client: client,
            status: status,
            summary: summary,
            description: description,
            details: details,
            coverImage: tempCoverImage || '',
            images: tempImages.slice(),
            isFeatured: isFeatured
        };

        if (editId) {
            for (var i = 0; i < workingData.projects.length; i++) {
                if (workingData.projects[i].id === editId) {
                    projectData.id = editId;
                    projectData.createdAt = workingData.projects[i].createdAt;
                    workingData.projects[i] = projectData;
                    break;
                }
            }
            showToast('Proje güncellendi', 'success');
        } else {
            projectData.id = generateId();
            projectData.createdAt = new Date().toISOString();
            workingData.projects.push(projectData);
            showToast('Proje eklendi', 'success');
        }

        saveWorkingData();
        closeProjectModal();
        renderDashboardStats();
        renderRecentProjects();
        renderProjectsTable();
    }

    function closeProjectModal() {
        closeModal('project-modal');
        tempImages = [];
        tempCoverImage = null;
    }

    /* ===== GÖRSEL İŞLEME ===== */
    function handleImageFiles(files) {
        if (!files || !files.length) return;
        for (var i = 0; i < files.length; i++) {
            if (tempImages.length >= MAX_IMAGES) {
                showToast('En fazla ' + MAX_IMAGES + ' görsel ekleyebilirsiniz', 'error');
                break;
            }
            var file = files[i];
            if (!file.type.match(/image\/(jpeg|png|webp)/)) {
                showToast('Sadece JPEG, PNG veya WebP yükleyebilirsiniz', 'error');
                continue;
            }
            processImage(file);
        }
    }

    function processImage(file) {
        resizeImage(file, function(dataUrl) {
            tempImages.push(dataUrl);
            renderImagePreviews();
        });
    }

    function processCoverImage(file) {
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
            showToast('Sadece JPEG, PNG veya WebP yükleyebilirsiniz', 'error');
            return;
        }
        resizeImage(file, function(dataUrl) {
            tempCoverImage = dataUrl;
            renderCoverPreview();
        });
    }

    function resizeImage(file, cb) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var w = img.width, h = img.height;
                if (w > MAX_IMAGE_WIDTH) {
                    h = Math.round(h * (MAX_IMAGE_WIDTH / w));
                    w = MAX_IMAGE_WIDTH;
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                cb(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderCoverPreview() {
        var container = document.getElementById('cover-preview');
        if (!container) return;
        if (!tempCoverImage) { container.innerHTML = ''; return; }
        container.innerHTML =
            '<div class="image-preview-item" style="width:140px;height:100px;">' +
                '<img src="' + tempCoverImage + '" alt="Kapak">' +
                '<button type="button" class="remove-img" id="remove-cover-btn">✕</button>' +
            '</div>';
        document.getElementById('remove-cover-btn').addEventListener('click', function() {
            tempCoverImage = null;
            renderCoverPreview();
        });
    }

    function renderImagePreviews() {
        var container = document.getElementById('image-previews');
        if (!container) return;
        if (!tempImages.length) { container.innerHTML = ''; return; }

        var html = '';
        for (var i = 0; i < tempImages.length; i++) {
            html += '<div class="image-preview-item">' +
                '<img src="' + tempImages[i] + '" alt="Görsel ' + (i + 1) + '">' +
                '<button type="button" class="remove-img" data-index="' + i + '">✕</button>' +
            '</div>';
        }
        container.innerHTML = html;

        var btns = container.querySelectorAll('.remove-img');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function() {
                var idx = parseInt(this.getAttribute('data-index'));
                tempImages.splice(idx, 1);
                renderImagePreviews();
            });
        }
    }

    /* ===== SİLME MODAL ===== */
    function initDeleteModal() {
        var modal = document.getElementById('delete-modal');
        var closeBtn = document.getElementById('close-delete-modal');
        var cancelBtn = document.getElementById('cancel-delete-btn');
        var confirmBtn = document.getElementById('confirm-delete-btn');

        closeBtn.addEventListener('click', function() { closeModal('delete-modal'); });
        cancelBtn.addEventListener('click', function() { closeModal('delete-modal'); });
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal('delete-modal'); });

        confirmBtn.addEventListener('click', function() {
            if (!deleteTargetId) return;
            workingData.projects = workingData.projects.filter(function(p) { return p.id !== deleteTargetId; });
            saveWorkingData();
            deleteTargetId = null;
            closeModal('delete-modal');
            renderDashboardStats();
            renderRecentProjects();
            renderProjectsTable();
            showToast('Proje silindi', 'success');
        });
    }

    function openDeleteModal(id) {
        deleteTargetId = id;
        var p = null;
        for (var i = 0; i < workingData.projects.length; i++) {
            if (workingData.projects[i].id === id) { p = workingData.projects[i]; break; }
        }
        if (p) document.getElementById('delete-project-name').textContent = p.name;
        openModal('delete-modal');
    }

    /* ===== KATEGORİ ===== */
    function initCategoryForm() {
        var btn = document.getElementById('btn-add-category');
        var input = document.getElementById('new-category-input');

        btn.addEventListener('click', function() {
            var name = input.value.trim();
            if (!name) return;
            if (workingData.categories.indexOf(name) >= 0) {
                showToast('Bu kategori zaten mevcut', 'error');
                return;
            }
            workingData.categories.push(name);
            saveWorkingData();
            input.value = '';
            renderCategoriesList();
            renderDashboardStats();
            showToast('Kategori eklendi', 'success');
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
        });
    }

    function renderCategoriesList() {
        var container = document.getElementById('categories-list');
        if (!container) return;
        var cats = workingData.categories || [];
        if (!cats.length) { container.innerHTML = '<p style="color:var(--text-muted);">Henüz kategori eklenmemiş.</p>'; return; }

        var html = '';
        for (var i = 0; i < cats.length; i++) {
            var count = (workingData.projects || []).filter(function(p) { return p.category === cats[i]; }).length;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-soft);border-radius:var(--radius-sm);margin-bottom:8px;">' +
                '<span>' + sanitize(cats[i]) + ' <small style="color:var(--text-muted);">(' + count + ' proje)</small></span>' +
                '<button class="btn btn-sm btn-danger remove-cat-btn" data-cat="' + sanitize(cats[i]) + '" ' + (count > 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;" title="Projesi olan kategori silinemez"' : '') + '>Sil</button>' +
            '</div>';
        }
        container.innerHTML = html;

        var btns = container.querySelectorAll('.remove-cat-btn:not([disabled])');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function() {
                var cat = this.getAttribute('data-cat');
                workingData.categories = workingData.categories.filter(function(c) { return c !== cat; });
                saveWorkingData();
                renderCategoriesList();
                renderDashboardStats();
                showToast('Kategori silindi', 'success');
            });
        }
    }

    /* ===== AYARLAR ===== */
    /* Firebase config bloğunu parse et (JSON veya JS nesne sözdizimi).
       Örn: { apiKey: "...", authDomain: "..." } veya tam `const firebaseConfig = {...};` bloğu. */
    function parseFirebaseConfig(text) {
        if (!text) return null;
        var trimmed = text.trim();
        /* Saf JSON dene */
        try {
            if (trimmed.charAt(0) === '{') {
                var obj = JSON.parse(trimmed);
                if (obj && obj.apiKey) return obj;
            }
        } catch(e) {}
        /* JS sözdizimi — regex ile key-value çıkar */
        var keys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
        var result = {};
        for (var i = 0; i < keys.length; i++) {
            var re = new RegExp('["\']?' + keys[i] + '["\']?\\s*[:=]\\s*["\']([^"\']+)["\']');
            var m = text.match(re);
            if (m) result[keys[i]] = m[1];
        }
        if (!result.apiKey || !result.authDomain) return null;
        return result;
    }

    function initSettingsForm() {
        document.getElementById('btn-save-settings').addEventListener('click', function() {
            var s = workingData.settings;
            s.siteName = document.getElementById('setting-site-name').value.trim() || s.siteName;
            s.tagline = document.getElementById('setting-tagline').value.trim() || s.tagline;
            s.phone = document.getElementById('setting-phone').value.trim() || s.phone;
            s.email = document.getElementById('setting-email').value.trim() || s.email;
            s.whatsappNumber = document.getElementById('setting-whatsapp').value.trim().replace(/[^\d]/g, '') || s.whatsappNumber;
            s.address = document.getElementById('setting-address').value.trim() || s.address;
            s.workingHours = document.getElementById('setting-hours').value.trim() || s.workingHours;

            if (!s.social) s.social = {};
            s.social.instagram = document.getElementById('setting-instagram').value.trim();
            s.social.linkedin = document.getElementById('setting-linkedin').value.trim();
            s.social.behance = document.getElementById('setting-behance').value.trim();

            /* Firebase Config - textarea'dan parse et */
            var cfgText = document.getElementById('setting-firebase-config').value.trim();
            var parsedCfg = cfgText ? parseFirebaseConfig(cfgText) : null;
            if (cfgText && !parsedCfg) {
                showToast('Firebase config çözümlenemedi. apiKey/authDomain/databaseURL içermeli.', 'error');
                return;
            }
            if (parsedCfg) {
                s.firebaseConfig = parsedCfg;
                SITE_DATA.settings.firebaseConfig = parsedCfg;
                try { localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(parsedCfg)); } catch(e) {}
            } else {
                delete s.firebaseConfig;
                delete SITE_DATA.settings.firebaseConfig;
                try { localStorage.removeItem(FIREBASE_CONFIG_KEY); } catch(e) {}
            }

            var fb = (parsedCfg && parsedCfg.databaseURL)
                ? parsedCfg.databaseURL.replace(/\/+$/, '')
                : document.getElementById('setting-firebase-url').value.trim().replace(/\/+$/, '');
            s.firebaseURL = fb;
            SITE_DATA.settings.firebaseURL = fb;
            document.getElementById('setting-firebase-url').value = fb;
            try {
                if (fb) localStorage.setItem(FIREBASE_URL_KEY, fb);
                else localStorage.removeItem(FIREBASE_URL_KEY);
            } catch(e) {}

            /* Firebase Auth'u başlat (config yeni girildiyse) */
            if (parsedCfg && !isFirebaseAuthReady()) {
                initFirebaseAuth(parsedCfg);
                if (isFirebaseAuthReady()) {
                    showToast('Firebase Auth aktif — bir sonraki girişte e-posta/şifre kullanın', 'success');
                }
            }

            if (!s.about) s.about = {};
            s.about.story = document.getElementById('setting-about-story').value.trim();
            s.about.mission = document.getElementById('setting-about-mission').value.trim();
            s.about.vision = document.getElementById('setting-about-vision').value.trim();

            saveWorkingData();
            updateFirebaseStatus();
            showToast('Ayarlar kaydedildi', 'success');
        });

        /* Test Bağlantı butonu */
        var testBtn = document.getElementById('btn-test-firebase');
        if (testBtn) {
            testBtn.addEventListener('click', function() {
                var raw = document.getElementById('setting-firebase-url').value.trim();
                if (!raw) {
                    showToast('Önce Firebase URL girin', 'error');
                    return;
                }
                testBtn.disabled = true;
                var original = testBtn.textContent;
                testBtn.textContent = 'Test ediliyor...';
                var statusEl = document.getElementById('firebase-status');
                if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-light);">⟳ Firebase bağlantısı test ediliyor...</span>';

                testCloudConnection(raw).then(function(result) {
                    if (statusEl) {
                        statusEl.innerHTML = '<span style="color:var(--success); font-weight:600;">✓ Bağlantı başarılı (' + result.latency + 'ms) — yazma/okuma çalışıyor</span>';
                    }
                    showToast('Firebase bağlantısı doğrulandı', 'success');
                }).catch(function(err) {
                    var msg = err && err.message ? err.message : 'bilinmeyen hata';
                    var hint = '';
                    if (err && err.status === 401) hint = 'Kurallar yazmayı reddediyor. Firebase Console > Realtime Database > Rules bölümünden kuralları kontrol edin.';
                    else if (err && err.status === 403) hint = 'Erişim reddedildi. Kurallar yazmaya izin vermiyor.';
                    else if (err && err.status === 404) hint = 'URL yanlış veya veritabanı oluşturulmamış. Örnek: https://proje-adi-default-rtdb.firebaseio.com';
                    else if (!err.status) hint = 'Ağ hatası veya CORS. URL\'de yazım hatası olabilir.';

                    if (statusEl) {
                        statusEl.innerHTML = '<div style="color:var(--danger); font-weight:600;">✗ Bağlantı başarısız: ' + sanitize(msg) + '</div>' +
                            (hint ? '<div style="color:var(--text-light); margin-top:6px; font-size:0.88rem;">' + sanitize(hint) + '</div>' : '');
                    }
                    showToast('Firebase testi başarısız', 'error');
                }).then(function() {
                    testBtn.disabled = false;
                    testBtn.textContent = original;
                });
            });
        }
    }

    function loadSettings() {
        var s = workingData.settings;
        document.getElementById('setting-site-name').value = s.siteName || '';
        document.getElementById('setting-tagline').value = s.tagline || '';
        document.getElementById('setting-phone').value = s.phone || '';
        document.getElementById('setting-email').value = s.email || '';
        document.getElementById('setting-whatsapp').value = s.whatsappNumber || '';
        document.getElementById('setting-address').value = s.address || '';
        document.getElementById('setting-hours').value = s.workingHours || '';
        document.getElementById('setting-instagram').value = (s.social && s.social.instagram) || '';
        document.getElementById('setting-linkedin').value = (s.social && s.social.linkedin) || '';
        document.getElementById('setting-behance').value = (s.social && s.social.behance) || '';
        document.getElementById('setting-firebase-url').value = s.firebaseURL || SITE_DATA.settings.firebaseURL || '';
        var cfg = s.firebaseConfig || SITE_DATA.settings.firebaseConfig;
        document.getElementById('setting-firebase-config').value = cfg ? JSON.stringify(cfg, null, 2) : '';
        document.getElementById('setting-about-story').value = (s.about && s.about.story) || '';
        document.getElementById('setting-about-mission').value = (s.about && s.about.mission) || '';
        document.getElementById('setting-about-vision').value = (s.about && s.about.vision) || '';
        updateFirebaseStatus();
    }

    function updateFirebaseStatus() {
        var el = document.getElementById('firebase-status');
        if (!el) return;
        var url = _getFirebaseURL();
        var authActive = isFirebaseAuthReady();
        var currentUser = authActive && firebase.auth().currentUser;
        var lines = [];

        if (url) {
            lines.push('<span style="color:var(--success); font-weight:600;">✓ Realtime Database bağlı</span>');
        } else {
            lines.push('<span style="color:var(--warning); font-weight:600;">⚠ Realtime Database URL\'i yok</span>');
        }

        if (authActive) {
            if (currentUser) {
                lines.push('<span style="color:var(--success); font-weight:600;">✓ Firebase Auth aktif — giriş: ' + sanitize(currentUser.email || '') + '</span>');
            } else {
                lines.push('<span style="color:var(--warning); font-weight:600;">⚠ Firebase Auth hazır ama giriş yapılmamış</span>');
            }
        } else {
            lines.push('<span style="color:var(--warning); font-weight:600;">⚠ Firebase Auth kapalı — kurallar yazma için auth gerektiriyorsa yazma başarısız olur</span>');
        }

        el.innerHTML = lines.join('<br>');
    }

    /* ===== DIŞA AKTAR ===== */
    function initExport() {
        document.getElementById('btn-export').addEventListener('click', function() {
            var exportData = JSON.parse(JSON.stringify(workingData));
            exportData.version = (exportData.version || 0) + 1;

            var content = '/* Koçcihanoğlu Mimarlık - Proje Verileri\n' +
                '   Bu dosya admin panelinden dışa aktarılarak güncellenir.\n' +
                '   Elle düzenlemeyin - admin panelini kullanın. */\n\n' +
                'var SITE_DATA = ' + JSON.stringify(exportData, null, 2) + ';\n';

            var blob = new Blob([content], { type: 'application/javascript' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'data.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('data.js dosyası indirildi', 'success');
        });
    }

    function initImport() {
        var fileInput = document.getElementById('import-file');
        document.getElementById('btn-import').addEventListener('click', function() { fileInput.click(); });

        fileInput.addEventListener('change', function() {
            var file = this.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var text = e.target.result;
                    var match = text.match(/(?:const|var)\s+SITE_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
                    if (!match) { showToast('Geçersiz data.js formatı', 'error'); return; }
                    var parsed = JSON.parse(match[1]);
                    if (!parsed.settings || !parsed.categories) { showToast('Geçersiz veri yapısı', 'error'); return; }
                    workingData = parsed;
                    saveWorkingData();
                    renderAllDashboard();
                    showToast('Veri içe aktarıldı', 'success');
                } catch(err) { showToast('Dosya okunamadı: ' + err.message, 'error'); }
            };
            reader.readAsText(file);
            this.value = '';
        });
    }

    function initLogout() {
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            destroySession();
            /* Firebase Auth aktifse imza çıkışı da yap */
            if (isFirebaseAuthReady() && firebase.auth().currentUser) {
                firebase.auth().signOut().catch(function(err) { console.warn(err); });
            }
            location.reload();
        });
    }

    function openModal(id) {
        document.getElementById(id).classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', init);
})();
