/* ==========================================================================
   XIONCO — Asset Ledger renderer
   Membaca assets/js/manifest.js, lalu mengecek file yang sudah ada.
   ========================================================================== */
(function () {
  'use strict';

  var M = window.XIONCO_MANIFEST;
  var A = window.XIONCO_ASSETS;
  var CFG = window.XIONCO_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var STATUS = {};   // id → checking | ready | missing | manual
  var FOUND = {};    // id → url
  var filter = 'all';

  function groupOf(a) { for (var i = 0; i < M.groups.length; i++) if (M.groups[i].id === a.group) return M.groups[i]; return { phase: 1, title: a.group }; }
  function prioLabel(p) { return p === 'high' ? 'Tinggi' : p === 'medium' ? 'Sedang' : 'Rendah'; }
  function fmtDate(iso) {
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }

  /* ---------------- Assets ---------------- */
  function row(a) {
    var phase = groupOf(a).phase;
    var manual = a.kind === 'manual';
    return '' +
      '<div class="lg-row" data-id="' + esc(a.id) + '" data-phase="' + phase + '" data-prio="' + esc(a.priority) + '">' +
        '<button class="lg-row__main" type="button" aria-expanded="false">' +
          '<span><span class="status ' + (manual ? 'status--manual' : 'status--checking') + '" data-status>' + (manual ? 'Manual' : 'Checking') + '</span></span>' +
          '<span class="lg-name"><b>' + esc(a.name) + '</b><small>' + esc(a.id) + '</small></span>' +
          '<span class="lg-cell"><em>Dipakai di</em>' + esc(a.usedIn) + '</span>' +
          '<span class="lg-cell"><em>Ukuran</em>' + esc(a.size) + '</span>' +
          '<span class="lg-prio"><span class="tag tag--' + esc(a.priority) + '">' + prioLabel(a.priority) + '</span></span>' +
          '<svg class="lg-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>' +
        '</button>' +
        '<div class="lg-row__detail"><div><div class="lg-detail">' +
          '<div>' +
            '<h4>Format</h4><ul><li>' + esc(a.format) + '</li><li>' + esc(a.size) + '</li></ul>' +
            '<h4>Nama file (pilih salah satu)</h4>' +
            '<div class="lg-files">' + a.files.map(function (f) {
              var p = 'assets/media/' + f;
              return '<div class="lg-file"><code>' + esc(p) + '</code><button type="button" data-copy="' + esc(p) + '">Copy</button><span class="found" data-found="' + esc(p) + '"></span></div>';
            }).join('') + '</div>' +
            (a.notes && a.notes.length ? '<h4>Catatan</h4><ul>' + a.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
            '<h4>Sementara dipakai</h4><ul><li>' + esc(a.placeholder) + '</li></ul>' +
          '</div>' +
          '<div><h4>Preview</h4><div class="lg-preview lg-preview--empty" data-preview>' + (manual ? 'Font tidak bisa dicek otomatis.<br>Kirim file ke developer.' : 'Belum ada file.') + '</div></div>' +
        '</div></div></div>' +
      '</div>';
  }

  function renderAssets() {
    $('#groups').innerHTML = M.groups.map(function (g) {
      var items = M.assets.filter(function (a) { return a.group === g.id; });
      if (!items.length) return '';
      return '<div class="lg-group" data-g="' + esc(g.id) + '">' +
        '<div class="lg-group__head"><h3>' + esc(g.title) + '</h3><small>' + items.length + ' aset</small><span class="tag">Phase ' + g.phase + '</span></div>' +
        '<div class="lg-list">' + items.map(row).join('') + '</div></div>';
    }).join('');

    $$('.lg-row__main').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = btn.parentElement, open = !r.classList.contains('is-open');
        r.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); copy(b.dataset.copy); });
    });
  }

  function setStatus(id, st, url) {
    STATUS[id] = st;
    if (url) FOUND[id] = url;
    var r = $('.lg-row[data-id="' + id + '"]');
    if (!r) return;
    var el = $('[data-status]', r);
    el.className = 'status status--' + st;
    el.textContent = st === 'ready' ? 'Ready' : st === 'missing' ? 'Belum ada' : st === 'manual' ? 'Manual' : 'Checking';
    r.dataset.status = st;
    if (url) {
      $$('[data-found]', r).forEach(function (s) { s.textContent = s.dataset.found === url ? '✓ ditemukan' : ''; });
      var pv = $('[data-preview]', r);
      pv.classList.remove('lg-preview--empty');
      pv.innerHTML = /\.(mp4|webm|mov)$/i.test(url)
        ? '<video src="' + esc(url) + '" muted loop autoplay playsinline></video>'
        : '<img src="' + esc(url) + '" alt="">';
    }
    applyFilter();
    updateStats();
  }

  function probeAll() {
    M.assets.forEach(function (a) {
      if (a.kind === 'manual') { STATUS[a.id] = 'manual'; return; }
      STATUS[a.id] = 'checking';
      A.resolve(a.id).then(function (url) { setStatus(a.id, url ? 'ready' : 'missing', url); });
    });
    updateStats();
  }

  function updateStats() {
    var total = M.assets.length, ready = 0, missing = 0, manual = 0, checking = 0, p1 = 0, p1ready = 0;
    M.assets.forEach(function (a) {
      var s = STATUS[a.id];
      if (s === 'ready') ready++;
      else if (s === 'missing') missing++;
      else if (s === 'manual') manual++;
      else checking++;
      if (groupOf(a).phase === 1 && a.kind !== 'manual') { p1++; if (s === 'ready') p1ready++; }
    });
    $('#stTotal').textContent = total;
    $('#stReady').textContent = ready;
    $('#stMissing').textContent = checking ? '…' : missing;
    $('#stManual').textContent = manual;
    var pct = p1 ? Math.round(p1ready / p1 * 100) : 0;
    $('#stBar').style.width = pct + '%';
    $('#stBarTxt').textContent = checking ? 'Memeriksa file…' : p1ready + ' dari ' + p1 + ' aset homepage siap (' + pct + '%)';
  }

  function applyFilter() {
    $$('.lg-row').forEach(function (r) {
      var st = r.dataset.status || 'checking', show = true;
      if (filter === 'missing') show = st === 'missing';
      else if (filter === 'ready') show = st === 'ready';
      else if (filter === 'p1') show = r.dataset.phase === '1';
      else if (filter === 'p2') show = r.dataset.phase === '2';
      else if (filter === 'high') show = r.dataset.prio === 'high';
      r.classList.toggle('is-hidden', !show);
    });
    $$('.lg-group').forEach(function (g) {
      g.style.display = $$('.lg-row:not(.is-hidden)', g).length ? '' : 'none';
    });
  }

  function bindFilters() {
    $$('.lg-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        filter = c.dataset.f;
        $$('.lg-chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        applyFilter();
      });
    });
  }

  /* ---------------- Copy ---------------- */
  var toastT = 0;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 1800);
  }
  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
      toast('Disalin: ' + text);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Disalin: ' + text); }, fallback);
    } else fallback();
  }

  /* ---------------- Spec diagrams ---------------- */
  function specCanvas() {
    var B = 240, W = 1200, H = 960, g = '';
    g += '<defs><radialGradient id="orbG" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff4de"/><stop offset=".55" stop-color="#d6b783"/><stop offset="1" stop-color="#6b5434"/></radialGradient>' +
      '<linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a241d"/><stop offset="1" stop-color="#120f0c"/></linearGradient></defs>';
    g += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#bgG)"/>';
    // visible window (1 block)
    g += '<rect x="840" y="0" width="240" height="960" fill="rgba(156,207,138,.16)" stroke="rgba(156,207,138,.7)" stroke-width="2" stroke-dasharray="10 8"/>';
    // text zones
    g += '<rect x="120" y="720" width="640" height="120" fill="rgba(143,179,217,.16)" stroke="rgba(143,179,217,.65)" stroke-width="2"/>';
    g += '<text x="140" y="758" fill="#8fb3d9" font-size="24" font-family="Inter" font-weight="600" letter-spacing="2">AREA TEKS · B–D</text>';
    g += '<rect x="120" y="120" width="640" height="130" fill="none" stroke="rgba(143,179,217,.45)" stroke-width="2" stroke-dasharray="12 10"/>';
    g += '<text x="140" y="160" fill="rgba(143,179,217,.75)" font-size="24" font-family="Inter" font-weight="600" letter-spacing="2">AREA TEKS · A (Catalog)</text>';
    // grid
    for (var x = 0; x <= W; x += B) g += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="rgba(255,255,255,.16)" stroke-width="2"/>';
    for (var y = 0; y <= H; y += B) g += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="rgba(255,255,255,.16)" stroke-width="2"/>';
    for (var i = 0; i < 5; i++) g += '<text x="' + (i * B + 14) + '" y="34" fill="rgba(255,255,255,.4)" font-size="22" font-family="Inter">' + (i + 1) + '</text>';
    // orb
    g += '<circle cx="960" cy="480" r="120" fill="url(#orbG)"/>';
    g += '<circle cx="960" cy="480" r="120" fill="none" stroke="#f7e6c4" stroke-width="2" stroke-dasharray="8 8"/>';
    g += '<path d="M940 480h40M960 460v40" stroke="#120f0c" stroke-width="3"/>';
    g += '<circle cx="960" cy="690" r="55" fill="#26262a" stroke="#5a5a5d" stroke-width="3"/><path d="M948 668v44l36-22z" fill="#efe9e1"/>';
    g += '<text x="960" y="340" text-anchor="middle" fill="#d6c09b" font-size="22" font-family="Inter" font-weight="600">ORB Ø240 · (960, 480)</text>';
    g += '<text x="960" y="782" text-anchor="middle" fill="#d6c09b" font-size="22" font-family="Inter" font-weight="600">PLAY (960, 690) · Ø110</text>';
    // dimensions
    g += '<text x="600" y="930" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="24" font-family="Inter">1200 px = 5 block</text>';
    g += '<text x="1180" y="480" text-anchor="end" fill="rgba(255,255,255,.55)" font-size="24" font-family="Inter" transform="rotate(-90 1180 480)">960 px = 4 block</text>';
    $('#specCanvas').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Template layar 5 kali 4 block dengan posisi orb">' + g + '</svg>';
  }

  function specWindows() {
    var rows = [
      { label: 'Hover · 5 block', a: 0, b: 1200, note: 'seluruh video', m: 'orb' },
      { label: 'Default A · 4 block', a: 120, b: 1080, note: 'fokus sofa', m: 'sofa' },
      { label: 'Default B · 2 block', a: 720, b: 1200, note: 'fokus orb', m: 'orb' },
      { label: 'Tertutup B–D · 1 block', a: 840, b: 1080, note: 'hanya orb', m: 'orb' },
      { label: 'Tertutup A · 1 block', a: 480, b: 720, note: 'tengah sofa', m: 'sofa' }
    ];
    var W = 1200, rh = 44, gap = 62, top = 44, g = '';
    // block ticks
    var H = top + rows.length * (rh + gap) - gap + 10;
    for (var x = 0; x <= W; x += 240) g += '<line x1="' + x + '" y1="' + (top - 8) + '" x2="' + x + '" y2="' + H + '" stroke="rgba(255,255,255,.09)" stroke-width="2" stroke-dasharray="4 6"/>';
    rows.forEach(function (r, i) {
      var y = top + i * (rh + gap);
      g += '<text x="0" y="' + (y - 14) + '" fill="rgba(255,255,255,.72)" font-size="25" font-family="Inter" font-weight="500">' + r.label +
        '<tspan fill="rgba(255,255,255,.4)" font-weight="400">  ' + r.note + ' · x ' + r.a + '–' + r.b + '</tspan></text>';
      g += '<rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" rx="6" fill="#1d1915"/>';
      g += '<rect x="' + r.a + '" y="' + y + '" width="' + (r.b - r.a) + '" height="' + rh + '" rx="6" fill="rgba(156,207,138,.22)" stroke="rgba(156,207,138,.75)" stroke-width="2"/>';
      g += r.m === 'orb'
        ? '<circle cx="960" cy="' + (y + rh / 2) + '" r="13" fill="#d6b783"/>'
        : '<rect x="560" y="' + (y + rh / 2 - 8) + '" width="80" height="16" rx="5" fill="#cbbfa9"/>';
    });
    $('#specWindows').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + (H + 4) + '" role="img" aria-label="Bagian video yang terlihat per ukuran frame">' + g + '</svg>';
  }

  function simulator() {
    var cells = $$('#simTrack > div'), track = $('#simTrack');
    var idle = (CFG.frame && CFG.frame.idle) || [4, 2, 1, 1];
    function set(state) {
      var w = state === 'idle' ? idle : cells.map(function (_, j) { return j === +state ? 5 : 1; });
      cells.forEach(function (c, j) { c.style.setProperty('--w', w[j]); c.classList.toggle('is-on', state !== 'idle' && j === +state); });
      if (state === 'idle') { track.style.setProperty('--gx', '0%'); track.style.setProperty('--gw', '100%'); }
      else {
        var before = 0; for (var k = 0; k < +state; k++) before += w[k];
        track.style.setProperty('--gx', (before / 8 * 100) + '%');
        track.style.setProperty('--gw', (w[+state] / 8 * 100) + '%');
      }
    }
    $$('#simBtns button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#simBtns button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        set(b.dataset.s);
      });
    });
    cells.forEach(function (c, j) {
      c.addEventListener('mouseenter', function () {
        $$('#simBtns button').forEach(function (x) { x.classList.toggle('is-on', x.dataset.s === String(j)); });
        set(String(j));
      });
    });
    track.addEventListener('mouseleave', function () {
      $$('#simBtns button').forEach(function (x) { x.classList.toggle('is-on', x.dataset.s === 'idle'); });
      set('idle');
    });
    set('idle');
  }

  /* ---------------- Copy, decisions, roadmap ---------------- */
  function renderLists() {
    $('#copyTable tbody').innerHTML = (M.copy || []).map(function (c) {
      var ok = /mockup/i.test(c.status);
      return '<tr><td>' + esc(c.where) + '</td><td>' + esc(c.key) + '</td><td>' + esc(c.text) + '</td><td><span class="st' + (ok ? ' is-ok' : '') + '">' + esc(c.status) + '</span></td></tr>';
    }).join('');
    $('#decisionList').innerHTML = (M.decisions || []).map(function (d) {
      return '<div class="lg-dec"><h4>' + esc(d.topic) + '</h4><p>' + esc(d.choice) + '</p><small>' + esc(d.why) + '</small></div>';
    }).join('');
    $('#roadmapList').innerHTML = (M.roadmap || []).map(function (r) {
      return '<li><b>' + esc(r.name) + '</b><small>' + esc(r.note) + '</small></li>';
    }).join('');
  }

  /* ---------------- Init ---------------- */
  $('#ver').textContent = CFG.version || '0.1';
  $('#updated').textContent = fmtDate(M.updated);
  renderAssets();
  bindFilters();
  renderLists();
  specCanvas();
  specWindows();
  simulator();
  probeAll();
})();
