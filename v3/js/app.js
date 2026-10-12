/* ==========================================================================
   XIONCO v3 — UI engine
   Layar-layar ala game (bukan halaman scroll): boot → judul → hub → layar.
   Navigasi: mouse, sentuh, keyboard, gamepad. Hash route: #/koleksi dst.
   ========================================================================== */
(function () {
  'use strict';

  var XV = window.XV, G = window.gsap, XW = window.XW || {}, SFX = window.SFX || {};
  var noop = function () {};
  ['hover', 'tick', 'select', 'back', 'open', 'close', 'whoosh', 'coin', 'error', 'type', 'buzz', 'start', 'ach', 'count', 'build', 'unlock'].forEach(function (k) { if (!SFX[k]) SFX[k] = noop; });
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var html = document.documentElement;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ANIM = !!G && !REDUCED;
  var isMobile = function () { return innerWidth <= 860; };
  var rupiah = function (n) { return 'IDR ' + Math.round(n).toLocaleString('id-ID'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var src = function (p, w) {
    var s = w && XV.SIZES && XV.SIZES[p];
    var ok = s ? s.filter(function (v) { return v >= w; }) : [];
    if (!ok.length) return XV.IMG + p;
    var v = Math.min.apply(null, ok);
    return XV.IMG + p.replace(/\.(png|jpe?g|webp)$/i, '-' + v + 'x' + v + '.$1');
  };
  var wa = function (text) { return 'https://wa.me/' + XV.WA + '?text=' + encodeURIComponent(text); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var byId = {};
  XV.PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var imgClass = function (p) { return XV.V3_KNOCK.indexOf(p.id) >= 0 ? 'is-knock' : XV.V3_DARK.indexOf(p.id) >= 0 ? 'is-dark' : ''; };
  if (ANIM) html.classList.add('anim');

  /* ======================================================================
     Konten statis
     ====================================================================== */
  $$('.logo-path').forEach(function (p) { p.setAttribute('d', XV.LOGO); });
  $$('[data-wa]').forEach(function (a) { a.href = wa(a.dataset.wa); });
  var maxDisc = Math.max.apply(null, XV.PRODUCTS.map(function (p) { return p.was ? Math.round((1 - p.price / p.was) * 100) : 0; }));

  var SCREENS = [
    { id: 'koleksi', n: '01', t: 'Koleksi', s: XV.PRODUCTS.length + ' item · ' + XV.CATEGORIES.length + ' kategori · harga xionco.shop', ach: 'explore',
      brief: 'Inventori lengkap XIONCO: sofa, meja, tempat tidur, kabinet, lampu, hingga kelistrikan pintar. Pilih item, cek harga, lalu masukkan ke inventori.',
      stats: [['Item', String(XV.PRODUCTS.length)], ['Kategori', String(XV.CATEGORIES.length)], ['Diskon s/d', '−' + maxDisc + '%'], ['Garansi', '3 tahun']] },
    { id: 'craft', n: '02', t: 'Craft', s: 'Rakit sofa modular CUBIX dalam 3D', ach: 'architect',
      brief: 'Studio perakitan 3D. Atur jumlah modul, lengan, ottoman, material, dan base — putar sofanya, lalu kirim build ke tim kami untuk penawaran.',
      stats: [['Modul', '1–4'], ['Material', String(XV.STUDIO.fabrics.length)], ['Base', String(XV.STUDIO.bases.length)], ['Tampilan', '3D']] },
    { id: 'peta', n: '03', t: 'Peta dunia', s: '4 pabrik · Jepara → Jakarta', ach: 'traveler',
      brief: 'Peta rute produksi. Kayu diolah di Jepara, lalu finishing, upholstery, dan pengemasan di tiga pabrik Jakarta Selatan.',
      stats: [['Pabrik', '4'], ['Sofa / hari', '30+'], ['Pekerja', '80+'], ['Kirim', '1–3 hari']] },
    { id: 'guild', n: '04', t: 'Guild', s: 'XIONCO for Business · proyek & B2B', ach: 'guild',
      brief: 'Mode kooperatif untuk bisnis: space plan, produk dalam jumlah besar, interior, dan built-in. Terima quest — penawaran dalam 1 jam.',
      stats: [['Penawaran', '1 jam'], ['Cicilan', '0%'], ['Layanan', String(XV.SERVICES.length)], ['Klien', XV.CLIENTS.length + '+']] },
    { id: 'galeri', n: '05', t: 'Galeri', s: 'Proyek & inspirasi', ach: 'curator',
      brief: 'Arsip proyek dan inspirasi: solusi kelistrikan ruang rapat, pencahayaan, plafon custom, hingga detail material.',
      stats: [['Karya', String(XV.MUSE.length)], ['Mode', 'Ring 3D'], ['Kontrol', 'Seret'], ['Detail', 'Klik']] },
    { id: 'kontak', n: '06', t: 'Kontak', s: 'Konsultasi gratis via WhatsApp', ach: 'save',
      brief: 'Save point. Hubungi tim XIONCO lewat WhatsApp, Instagram, atau kunjungi showroom di Jakarta Selatan.',
      stats: [['WhatsApp', '0822-4040-8055'], ['Instagram', '@xionco.official'], ['Toko', 'xionco.shop'], ['Kota', 'Jakarta']] }
  ];
  var ROUTES = ['title', 'hub'].concat(SCREENS.map(function (s) { return s.id; }));
  var NAMES = { title: 'Title', hub: 'Hub', koleksi: 'Koleksi', craft: 'Craft', peta: 'Peta dunia', guild: 'Guild', galeri: 'Galeri', kontak: 'Kontak' };

  /* ======================================================================
     Progres & pencapaian
     ====================================================================== */
  var ACH = [
    { id: 'boot', t: 'Boot sequence', d: 'Menyalakan XIONCO//OS', xp: 50 },
    { id: 'explore', t: 'Penjelajah', d: 'Membuka koleksi', xp: 100, q: 'Buka koleksi' },
    { id: 'collector', t: 'Kolektor', d: 'Memasukkan item ke inventori', xp: 100, q: 'Ambil 1 item ke inventori' },
    { id: 'architect', t: 'Arsitek', d: 'Merakit sofa di Craft', xp: 150, q: 'Rakit sofa di Craft' },
    { id: 'traveler', t: 'Pengembara', d: 'Menjelajah peta pabrik', xp: 100, q: 'Jelajahi peta pabrik' },
    { id: 'guild', t: 'Guild master', d: 'Membuka XIONCO for Business', xp: 100, q: 'Kunjungi guild bisnis' },
    { id: 'curator', t: 'Kurator', d: 'Melihat 3 karya di galeri', xp: 100 },
    { id: 'save', t: 'Save point', d: 'Mampir ke kontak', xp: 50, q: 'Mampir ke save point' },
    { id: 'secret', t: 'Kode rahasia', d: '↑ ↑ ↓ ↓ ← → ← → B A', xp: 250, hidden: true },
    { id: 'complete', t: 'Tuntas', d: 'Mengunjungi semua layar', xp: 300 }
  ];
  var achById = {};
  ACH.forEach(function (a) { achById[a.id] = a; });
  var XP_LV = 300;
  var prog = store.get('xv3_prog', null) || { xp: 0, ach: {}, seen: {} };
  function saveProg() { store.set('xv3_prog', prog); }
  function updateXP(gain) {
    var lv = Math.floor(prog.xp / XP_LV) + 1, into = prog.xp % XP_LV;
    $('#lv').textContent = String(lv).padStart(2, '0');
    $('#xpFill').style.width = (into / XP_LV * 100).toFixed(1) + '%';
    $('#xpVal').textContent = into + ' / ' + XP_LV + ' XP';
    $('#achLv').textContent = lv;
    $('#achXp').textContent = prog.xp + ' XP';
    if (gain) { var b = $('#xpBtn'); b.classList.remove('is-gain'); void b.offsetWidth; b.classList.add('is-gain'); }
  }
  function unlock(id) {
    var a = achById[id];
    if (!a || prog.ach[id]) return;
    var lvBefore = Math.floor(prog.xp / XP_LV);
    prog.ach[id] = Date.now();
    prog.xp += a.xp;
    saveProg();
    updateXP(true);
    toast({ k: 'Achievement unlocked', t: a.t, x: '+' + a.xp + ' XP', icon: 'i-trophy' });
    SFX.ach();
    if (Math.floor(prog.xp / XP_LV) > lvBefore) setTimeout(function () { toast({ k: 'Level up', t: 'Level ' + (Math.floor(prog.xp / XP_LV) + 1), x: 'Terus jelajahi', icon: 'i-hub', kind: 'info' }); }, 900);
    renderQuests(); renderAch(); renderMenuDone();
  }
  function markSeen(id) {
    if (!SCREENS.some(function (s) { return s.id === id; })) return;
    prog.seen[id] = 1; saveProg();
    renderPips();
    if (SCREENS.every(function (s) { return prog.seen[s.id]; })) unlock('complete');
  }

  /* ======================================================================
     Toast, glitch, scramble
     ====================================================================== */
  var toastsEl = $('#toasts');
  function toast(o) {
    var el = document.createElement('div');
    el.className = 'toast frame' + (o.kind === 'info' ? ' toast--info' : '');
    el.innerHTML = '<span class="toast__ic"><svg><use href="#' + (o.icon || 'i-trophy') + '"/></svg></span><span><span class="toast__k">' + esc(o.k) + '</span><span class="toast__t" style="display:block">' + esc(o.t) + '</span>' + (o.x ? '<span class="toast__x">' + esc(o.x) + '</span>' : '') + '</span>';
    toastsEl.appendChild(el);
    while (toastsEl.children.length > 3) toastsEl.removeChild(toastsEl.firstChild);
    if (ANIM) G.from(el, { x: 60, opacity: 0, duration: .5, ease: 'expo.out' });
    setTimeout(function () {
      if (!el.parentNode) return;
      if (ANIM) G.to(el, { x: 60, opacity: 0, duration: .4, ease: 'power2.in', onComplete: function () { el.remove(); } });
      else el.remove();
    }, 3400);
  }
  var glitchEl = $('#glitch'), bars = [];
  for (var gi = 0; gi < 7; gi++) { var gb = document.createElement('i'); glitchEl.appendChild(gb); bars.push(gb); }
  if (G) G.set(bars, { x: 0, xPercent: -101 });
  var GCOL = ['255,182,72', '62,232,255', '255,79,168', '155,123,255'];
  function glitch() {
    if (!ANIM) return;
    bars.forEach(function (b, i) {
      var c = GCOL[i % GCOL.length];
      b.style.top = (Math.random() * 96) + '%';
      b.style.height = (1 + Math.random() * 9) + '%';
      b.style.background = 'linear-gradient(90deg, rgba(' + c + ',0), rgba(' + c + ',.55) 40%, rgba(' + c + ',.15) 60%, rgba(' + c + ',0))';
      G.fromTo(b, { x: 0, xPercent: -101 }, { x: 0, xPercent: 101, duration: .32 + Math.random() * .3, delay: Math.random() * .12, ease: 'power2.inOut' });
    });
  }
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*<>/';
  function scramble(el, text, dur) {
    if (!el) return;
    text = text != null ? String(text) : (el.dataset.text || el.textContent);
    el.dataset.text = text;
    if (!ANIM) { el.textContent = text; return; }
    var t0 = performance.now(), d = (dur || .7) * 1000, id = (el._scr = (el._scr || 0) + 1);
    (function step(now) {
      if (el._scr !== id) return;
      var p = clamp((now - t0) / d, 0, 1), n = Math.floor(p * text.length);
      var out = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        out += i < n || ch === ' ' ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = text;
    })(t0);
  }

  /* ======================================================================
     Kursor bidik (reticle) — mengunci ke elemen yang disorot
     ====================================================================== */
  var rt = $('#reticle'), rlabel = $('#rlabel');
  var rcs = { tl: $('.rc--tl', rt), tr: $('.rc--tr', rt), bl: $('.rc--bl', rt), br: $('.rc--br', rt) }, rdot = $('.rdot', rt);
  var ptr = { x: innerWidth / 2, y: innerHeight / 2, down: false, target: null, inside: true };
  var box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  if (FINE) {
    html.classList.add('has-cursor');
    window.addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true; }, { passive: true });
    window.addEventListener('pointerdown', function () { ptr.down = true; });
    window.addEventListener('pointerup', function () { ptr.down = false; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a, button, input, select, textarea, [data-lock], .slot, .rcard');
      if (t && !t.closest('.reticle')) {
        if (t !== ptr.target) SFX.hover();
        ptr.target = t;
      } else ptr.target = null;
      var lab = t && t.getAttribute('data-cursor');
      if (!lab && e.target.id === 'world' && (current === 'hub' || current === 'title' || current === 'craft' || current === 'kontak')) lab = 'Seret';
      rlabel.textContent = lab || '';
      rt.classList.toggle('is-label', !!lab);
    });
    document.documentElement.addEventListener('mouseleave', function () { rt.style.opacity = 0; });
    document.documentElement.addEventListener('mouseenter', function () { rt.style.opacity = 1; });
    (function rloop() {
      var t = ptr.target, s = ptr.down ? 9 : 13, p = 5;
      var tx0, ty0, tx1, ty1;
      if (t && t.isConnected && t.offsetParent !== null) {
        var r = t.getBoundingClientRect();
        tx0 = r.left - p; ty0 = r.top - p; tx1 = r.right + p; ty1 = r.bottom + p;
        if (ptr.down) { tx0 += 3; ty0 += 3; tx1 -= 3; ty1 -= 3; }
      } else { tx0 = ptr.x - s; ty0 = ptr.y - s; tx1 = ptr.x + s; ty1 = ptr.y + s; }
      var k = .3;
      box.x0 = lerp(box.x0, tx0, k); box.y0 = lerp(box.y0, ty0, k); box.x1 = lerp(box.x1, tx1, k); box.y1 = lerp(box.y1, ty1, k);
      rcs.tl.style.transform = 'translate3d(' + box.x0 + 'px,' + box.y0 + 'px,0)';
      rcs.tr.style.transform = 'translate3d(' + (box.x1 - 9) + 'px,' + box.y0 + 'px,0)';
      rcs.bl.style.transform = 'translate3d(' + box.x0 + 'px,' + (box.y1 - 9) + 'px,0)';
      rcs.br.style.transform = 'translate3d(' + (box.x1 - 9) + 'px,' + (box.y1 - 9) + 'px,0)';
      rdot.style.transform = 'translate3d(' + ptr.x + 'px,' + ptr.y + 'px,0)';
      rlabel.style.transform = 'translate3d(' + (box.x1 + 8) + 'px,' + (box.y1 + 4) + 'px,0)';
      rt.classList.toggle('is-lock', !!(t && t.isConnected));
      requestAnimationFrame(rloop);
    })();
  }

  /* ======================================================================
     HUD: pip layar, hint kontrol, jam, suara
     ====================================================================== */
  var pipsEl = $('#pips');
  pipsEl.innerHTML = SCREENS.map(function (s) { return '<a class="pip" href="#/' + s.id + '" data-go="' + s.id + '" data-lock aria-label="' + s.t + '"><span>' + s.t + '</span></a>'; }).join('');
  function renderPips() {
    $$('.pip', pipsEl).forEach(function (p) {
      var id = p.dataset.go;
      p.classList.toggle('is-on', id === current);
      p.classList.toggle('is-seen', !!prog.seen[id]);
    });
  }
  var HINTS = {
    title: [['Enter', 'Mulai'], ['M', 'Suara']],
    hub: [['↑ ↓', 'Pilih'], ['Enter', 'Masuk'], ['1–6', 'Lompat'], ['/', 'Konsol'], ['I', 'Inventori']],
    koleksi: [['Q E', 'Kategori'], ['← ↑ → ↓', 'Pilih item'], ['A', 'Ambil'], ['Esc', 'Hub']],
    craft: [['1–4', 'Modul'], ['L', 'Lengan'], ['O', 'Ottoman'], ['[ ]', 'Material'], ['R', 'Acak'], ['Esc', 'Hub']],
    peta: [['← →', 'Tahap'], ['0', 'Semua'], ['Esc', 'Hub']],
    guild: [['Esc', 'Hub']],
    galeri: [['← →', 'Putar'], ['Enter', 'Lihat'], ['Esc', 'Hub']],
    kontak: [['Esc', 'Hub']]
  };
  function renderHints(id) {
    $('#hints').innerHTML = (HINTS[id] || []).map(function (h) { return '<span><b class="key">' + h[0] + '</b>' + h[1] + '</span>'; }).join('');
  }
  function clockTick() {
    var d = new Date(Date.now() + 7 * 3600 * 1000);
    var hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    $('#clock').textContent = 'JKT 6.29°S 106.77°E · ' + hh + ':' + mm + ' WIB';
  }
  clockTick(); setInterval(clockTick, 15000);
  var sfxBtn = $('#sfxBtn');
  function renderSfx() { sfxBtn.classList.toggle('is-off', !SFX.on); sfxBtn.setAttribute('aria-pressed', String(!!SFX.on)); }
  renderSfx();
  sfxBtn.addEventListener('click', function () { if (SFX.toggle) SFX.toggle(); renderSfx(); toast({ k: 'Audio', t: SFX.on ? 'Suara aktif' : 'Suara mati', icon: 'i-sound', kind: 'info' }); });

  /* ======================================================================
     Router layar
     ====================================================================== */
  var current = null, navToken = 0;
  var enterHooks = {}, leaveHooks = {}, keyHooks = {};
  function parseHash() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; return ROUTES.indexOf(h) >= 0 ? h : null; }
  function go(id) {
    if (ROUTES.indexOf(id) < 0) return;
    if (location.hash !== '#/' + id) location.hash = '#/' + id;
    else show(id);
  }
  window.addEventListener('hashchange', function () { if (!booted) return; show(parseHash() || 'title'); });
  function show(id, instant) {
    if (id === current) return;
    var from = current, token = ++navToken;
    closeOverlays(true);
    var prevEl = from && $('[data-screen="' + from + '"]'), nextEl = $('[data-screen="' + id + '"]');
    current = id;
    html.setAttribute('data-screen', id);
    document.title = 'XIONCO // ' + NAMES[id].toUpperCase() + (id === 'title' ? ' — Quality shouldn\'t be a luxury' : '');
    $('#crumb').textContent = NAMES[id];
    renderPips(); renderHints(id);
    $$('#dock [data-go]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.go === id); });
    $('#dockMore').classList.toggle('is-on', ['guild', 'galeri', 'kontak'].indexOf(id) >= 0);
    if (from && leaveHooks[from]) leaveHooks[from]();
    if (XW.ok) XW.setScreen(id, instant ? 0 : undefined);
    if (!instant && from) { SFX.whoosh(); glitch(); }
    if (id !== 'title') unlock('boot');
    var reveal = function () {
      if (token !== navToken) return;
      $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s === nextEl); });
      if (ANIM) {
        var els = $$('[data-a]', nextEl);
        G.killTweensOf(els);
        G.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .045, delay: instant ? 0 : .08, clearProps: 'transform' });
      }
      $$('[data-scramble]', nextEl).forEach(function (el) { scramble(el, null, .8); });
      if (enterHooks[id]) enterHooks[id](from);
      markSeen(id);
    };
    if (ANIM && prevEl && !instant) {
      var out = $$('[data-a]', prevEl);
      G.killTweensOf(out);
      G.to(out, { opacity: 0, y: -10, duration: .2, ease: 'power2.in', stagger: .015, onComplete: reveal });
    } else reveal();
  }

  /* ======================================================================
     Klik umum
     ====================================================================== */
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) {
      e.preventDefault();
      var close = g.closest('.sheet, .inv, .console, .ach');
      if (close) closeOverlays();
      SFX.select();
      go(g.dataset.go);
      return;
    }
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); closeOverlays(); if (o.dataset.open === 'ach') openAch(); return; }
    var c = e.target.closest('[data-close]');
    if (c) { e.preventDefault(); closeOverlays(); SFX.close(); }
  });

  /* ======================================================================
     BOOT
     ====================================================================== */
  var booted = false;
  var bootEl = $('#boot'), bootLog = $('#bootLog'), bootBar = $('#bootBar'), bootPct = $('#bootPct');
  var glOk = false;
  try { glOk = XW.init ? XW.init($('#world'), { mobile: isMobile() || !FINE, reduced: REDUCED }) : false; } catch (err) { glOk = false; }
  if (!glOk || !XW.ok) html.classList.add('no-webgl');
  XW.onLost = function () { html.classList.add('no-webgl'); };
  var LINES = [
    ['XIONCO//OS v3.0 — furniture manufacturer', 'hl', ''],
    ['Memuat katalog ............ ' + XV.PRODUCTS.length + ' item', '', 'OK'],
    ['Menghubungkan pabrik ...... ' + XV.FACTORIES.length + '/' + XV.FACTORIES.length, '', 'OK'],
    ['Kalibrasi neon ............ amber · cyan', '', 'OK'],
    ['Mesin render .............. ' + (XW.ok ? XW.gl : 'CSS fallback'), '', XW.ok ? 'OK' : 'LITE'],
    ['Siap. Selamat datang.', 'hl', '']
  ];
  var bootDone = false, bootSkip = false, bootProg = 0, imgProg = 0;
  function preload(list) {
    var done = 0;
    return Promise.all(list.map(function (u) {
      return new Promise(function (res) {
        var im = new Image(); im.onload = im.onerror = function () { done++; imgProg = done / list.length; res(); }; im.src = u;
      });
    }));
  }
  var preloadP = preload(XV.PRODUCTS.slice(0, 8).map(function (p) { return src(p.img, 768); }));
  function bootRender() {
    var p = Math.min(bootProg, .25 + imgProg * .75);
    bootBar.style.width = (p * 100).toFixed(1) + '%';
    bootPct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
  }
  function runBoot() {
    var li = 0;
    var next = function () {
      if (bootSkip) return finishBoot();
      if (li >= LINES.length) { bootProg = 1; bootRender(); return Promise.race([preloadP, new Promise(function (r) { setTimeout(r, 2200); })]).then(function () { bootRender(); setTimeout(finishBoot, 260); }); }
      var L = LINES[li++], row = document.createElement('div'), txt = '> ' + L[0], i = 0;
      bootLog.appendChild(row);
      (function type() {
        if (bootSkip) return finishBoot();
        i = Math.min(txt.length, i + (REDUCED ? txt.length : 3));
        row.innerHTML = '<span class="' + (L[1] || '') + '">' + esc(txt.slice(0, i)) + '</span>' + (i >= txt.length && L[2] ? ' <span class="ok">[' + L[2] + ']</span>' : '');
        if (i % 6 === 0) SFX.type();
        bootProg = (li - 1 + i / txt.length) / LINES.length;
        bootRender();
        if (i < txt.length) setTimeout(type, 14); else setTimeout(next, 90);
      })();
    };
    next();
  }
  function finishBoot() {
    if (bootDone) return;
    bootDone = true;
    var start = parseHash() || 'title';
    var end = function () { bootEl.style.display = 'none'; };
    booted = true;
    show(start, true);
    if (ANIM) {
      glitch();
      G.to(bootEl, { opacity: 0, duration: .5, ease: 'power2.out', onComplete: end });
    } else end();
  }
  ['keydown', 'pointerdown'].forEach(function (ev) { bootEl.addEventListener(ev, function () { bootSkip = true; }); });
  window.addEventListener('keydown', function () { if (!bootDone) bootSkip = true; });
  setTimeout(function () { if (!bootDone) finishBoot(); }, 9000);
  runBoot();

  /* ======================================================================
     TITLE
     ====================================================================== */
  var titleLogo = $('.title__logo');
  $('#pressText').textContent = FINE ? 'Tekan untuk mulai' : 'Sentuh untuk mulai';
  function startGame() { SFX.unlock(); SFX.start(); if (XW.ok) XW.setAccent('amber'); go('hub'); }
  $('#pressStart').addEventListener('click', startGame);
  enterHooks.title = function () {
    if (!ANIM) return;
    titleLogo.classList.add('is-off');
    var seq = [120, 70, 180, 60, 260];
    var t = 400;
    seq.forEach(function (d, i) {
      setTimeout(function () { titleLogo.classList.toggle('is-off', i % 2 === 1); if (i % 2 === 0) SFX.buzz(); }, t);
      t += d;
    });
    setTimeout(function () { titleLogo.classList.remove('is-off'); }, t + 40);
    $('.title__tag').classList.add('is-flicker');
  };
  keyHooks.title = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); return true; } };

  /* ======================================================================
     HUB
     ====================================================================== */
  var hubSel = 0, menuEl = $('#hubMenu');
  menuEl.innerHTML = SCREENS.map(function (s, i) {
    return '<li><button type="button" data-i="' + i + '" data-target="' + s.id + '"><span class="menu__n">' + s.n + '</span><span class="menu__t">' + s.t + '</span><span class="menu__s">' + esc(s.s) + '</span></button></li>';
  }).join('');
  var menuBtns = $$('button', menuEl);
  function renderMenuDone() { menuBtns.forEach(function (b) { var s = SCREENS[+b.dataset.i]; b.classList.toggle('is-done', !!prog.ach[s.ach]); }); }
  function hubSelect(i, quiet) {
    i = (i + SCREENS.length) % SCREENS.length;
    var changed = i !== hubSel;
    hubSel = i;
    menuBtns.forEach(function (b, k) { b.classList.toggle('is-sel', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    var s = SCREENS[i];
    $('#briefN').textContent = s.n;
    scramble($('#briefTitle'), s.t, .5);
    $('#briefText').textContent = s.brief;
    $('#briefStats').innerHTML = s.stats.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('');
    var a = achById[s.ach];
    $('#briefReward').textContent = prog.ach[s.ach] ? '✓ Selesai' : '+' + a.xp + ' XP';
    if (XW.ok) XW.preview(s.id);
    if (changed && !quiet) SFX.hover();
  }
  menuBtns.forEach(function (b) {
    b.addEventListener('pointerenter', function () { if (FINE) hubSelect(+b.dataset.i, true); });
    b.addEventListener('focus', function () { hubSelect(+b.dataset.i, true); });
    b.addEventListener('click', function () { SFX.select(); go(b.dataset.target); });
  });
  $('#briefGo').addEventListener('click', function () { SFX.select(); go(SCREENS[hubSel].id); });
  function renderQuests() {
    var qs = ACH.filter(function (a) { return a.q; });
    var done = qs.filter(function (a) { return prog.ach[a.id]; }).length;
    $('#questCount').textContent = done + '/' + qs.length;
    $('#questList').innerHTML = qs.map(function (a) { return '<li class="' + (prog.ach[a.id] ? 'is-done' : '') + '"><i></i><span>' + esc(a.q) + '</span><b>+' + a.xp + '</b></li>'; }).join('');
  }
  enterHooks.hub = function () { hubSelect(hubSel, true); renderMenuDone(); };
  keyHooks.hub = function (e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { hubSelect(hubSel - 1); return true; }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { hubSelect(hubSel + 1); return true; }
    if (k === 'Enter' || k === ' ') { SFX.select(); go(SCREENS[hubSel].id); return true; }
    if (/^[1-6]$/.test(k)) { SFX.select(); go(SCREENS[+k - 1].id); return true; }
  };

  /* ======================================================================
     KOLEKSI
     ====================================================================== */
  var RAR = {
    essential: { k: 'Essential', rgb: '159,180,200', n: 1 }, rare: { k: 'Rare', rgb: '62,232,255', n: 2 },
    epic: { k: 'Epic', rgb: '155,123,255', n: 3 }, legendary: { k: 'Legendary', rgb: '255,182,72', n: 4 }, bespoke: { k: 'Bespoke', rgb: '255,79,168', n: 0 }
  };
  function rar(p) { return !p.price ? RAR.bespoke : p.price >= 6e6 ? RAR.legendary : p.price >= 2.5e6 ? RAR.epic : p.price >= 1e6 ? RAR.rare : RAR.essential; }
  function stars(r) { return r.n ? '◆◆◆◆'.slice(0, r.n) + '◇◇◇◇'.slice(0, 4 - r.n) : '✦'; }
  var ID_CAT = { seats: 'kursi sofa tempat duduk', tables: 'meja', bedframe: 'ranjang kasur tempat tidur dipan', cabinet: 'lemari kabinet rak penyimpanan', decor: 'lampu dekorasi cahaya', smart: 'listrik stopkontak saklar colokan pintar' };
  var ID_TYPE = [[/chair/, 'kursi'], [/desk|workstation/, 'meja kerja kantor'], [/coffee table/, 'meja kopi meja tamu'], [/dining/, 'makan'], [/side table|nightstand/, 'meja samping nakas'], [/light/, 'lampu'], [/shelf/, 'rak'], [/wardrobe/, 'lemari pakaian'], [/kitchenette/, 'dapur kitchen set'], [/towel/, 'handuk kamar mandi'], [/slat|panel/, 'panel dinding'], [/bed/, 'ranjang tempat tidur'], [/socket|outlet|switch/, 'stopkontak saklar']];
  XV.PRODUCTS.forEach(function (p) {
    var t = p.type.toLowerCase(), cat = XV.CATEGORIES.filter(function (c) { return c.id === p.cat; })[0];
    p._q = [p.name, t, p.cat, cat ? cat.label : '', ID_CAT[p.cat] || '', rar(p).k].concat(ID_TYPE.filter(function (r) { return r[0].test(t); }).map(function (r) { return r[1]; })).join(' ').toLowerCase();
  });
  function search(q) {
    var terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return XV.PRODUCTS.filter(function (p) { return terms.every(function (w) { return p._q.indexOf(w) >= 0; }); });
  }
  var kCat = 'all', kList = [], kSel = 0, kSelId = null, kQty = 1;
  var kGrid = $('#kGrid'), kDetail = $('#kDetail'), kSearch = $('#kSearch');
  var TABS = [{ id: 'all', label: 'Semua' }].concat(XV.CATEGORIES.map(function (c) { return { id: c.id, label: c.label.replace(' & Light', '') }; }));
  $('#kTabs').innerHTML = '<span class="key">Q</span>' + TABS.map(function (t) {
    var n = t.id === 'all' ? XV.PRODUCTS.length : XV.PRODUCTS.filter(function (p) { return p.cat === t.id; }).length;
    return '<button class="tab" type="button" role="tab" data-tab="' + t.id + '" data-lock>' + t.label + '<sup>' + n + '</sup></button>';
  }).join('') + '<span class="key">E</span>';
  function priceLine(p) { return p.price ? (p.from ? 'mulai ' : '') + rupiah(p.price) : 'Tanya harga'; }
  function slotHTML(p, i) {
    var r = rar(p), disc = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
    return '<button class="slot" type="button" role="option" data-i="' + i + '" data-id="' + p.id + '" style="--rc:' + r.rgb + '">' +
      '<span class="slot__img"><img class="' + imgClass(p) + '" src="' + src(p.img, 768) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async"></span>' +
      '<span class="slot__rar">' + stars(r) + ' ' + r.k + '</span>' + (disc ? '<span class="slot__disc">−' + disc + '%</span>' : '') +
      '<span class="slot__info"><span class="slot__name" style="display:block">' + esc(p.name) + '</span><span class="slot__price" style="display:block">' + priceLine(p) + '</span></span></button>';
  }
  function renderGrid(keepSel) {
    var q = kSearch.value;
    var base = q.trim() ? search(q) : XV.PRODUCTS;
    kList = base.filter(function (p) { return kCat === 'all' || p.cat === kCat; });
    kGrid.innerHTML = kList.map(slotHTML).join('');
    $('#kEmpty').classList.toggle('is-on', !kList.length);
    $$('.tab', $('#kTabs')).forEach(function (t) { t.classList.toggle('is-on', t.dataset.tab === kCat); t.setAttribute('aria-selected', String(t.dataset.tab === kCat)); });
    var idx = keepSel && kSelId ? kList.findIndex(function (p) { return p.id === kSelId; }) : -1;
    kSelect(idx >= 0 ? idx : 0, true, true);
    if (ANIM) G.fromTo($$('.slot', kGrid).slice(0, 24), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, ease: 'expo.out', stagger: .018, clearProps: 'transform' });
  }
  function kSelect(i, quiet, noOpen) {
    if (!kList.length) { kDetail.innerHTML = ''; return; }
    kSel = clamp(i, 0, kList.length - 1);
    var p = kList[kSel];
    var changed = p.id !== kSelId;
    kSelId = p.id;
    $$('.slot', kGrid).forEach(function (s, k) { s.classList.toggle('is-sel', k === kSel); s.setAttribute('aria-selected', String(k === kSel)); });
    var cur = $('.slot.is-sel', kGrid);
    if (cur && !quiet) cur.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    if (changed) { kQty = 1; renderDetail(p); }
    if (!quiet) SFX.tick();
    if (!noOpen && isMobile()) openDetailSheet();
  }
  function renderDetail(p) {
    var r = rar(p), disc = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
    var cat = XV.CATEGORIES.filter(function (c) { return c.id === p.cat; })[0];
    var big = src(p.img, 1024);
    kDetail.style.setProperty('--rc', r.rgb);
    kDetail.innerHTML = '<div class="det" style="--rc:' + r.rgb + '">' +
      '<div class="det__top"><span class="det__rar">' + stars(r) + ' ' + r.k + '</span><button class="hbtn det__close" type="button" data-lock aria-label="Tutup detail"><svg><use href="#i-close"/></svg></button></div>' +
      '<div class="det__img"><img class="' + imgClass(p) + '" src="' + big + '" alt="' + esc(p.name + ' — ' + p.type) + '"></div>' +
      '<h3 class="det__name">' + esc(p.name) + '</h3><p class="det__type">' + esc(p.type) + '</p>' +
      '<div class="det__price">' + (p.price ? '<b>' + priceLine(p) + '</b>' + (p.was ? '<s>' + rupiah(p.was) + '</s><span class="disc">−' + disc + '%</span>' : '') : '<b class="ask">Tanya harga</b>') + '</div>' +
      '<p class="det__desc">' + esc(p.desc || '') + '</p>' +
      '<dl class="det__stats"><dt>Kategori</dt><dd>' + esc(cat ? cat.label : p.cat) + '</dd><dt>Garansi</dt><dd>3 tahun</dd><dt>Pengiriman</dt><dd>1–3 hari kerja</dd><dt>Harga</dt><dd>' + (p.price ? 'xionco.shop' : 'Via penawaran') + '</dd></dl>' +
      '<div class="det__actions">' + (p.price
        ? '<div class="det__row"><div class="qty"><button type="button" data-q="-1" aria-label="Kurangi" data-lock><svg><use href="#i-minus"/></svg></button><span id="kQty">1</span><button type="button" data-q="1" aria-label="Tambah" data-lock><svg><use href="#i-plus"/></svg></button></div><button class="nbtn" type="button" id="kAdd" data-lock><svg><use href="#i-bag"/></svg>Ambil<span class="key">A</span></button></div>'
        : '') +
      '<a class="nbtn ' + (p.price ? 'nbtn--ghost' : '') + ' nbtn--full" href="' + wa('Halo XIONCO, saya ingin tahu ' + (p.price ? 'lebih lanjut tentang ' : 'harga ') + p.name + ' (' + p.type + ').') + '" target="_blank" rel="noopener" data-lock><svg><use href="#i-wa"/></svg>' + (p.price ? 'Tanya via WhatsApp' : 'Tanya harga') + '</a>' +
      '<a class="det__link" href="' + p.url + '" target="_blank" rel="noopener">Detail di xionco.com →</a></div></div>';
    if (ANIM) {
      G.fromTo($$('.det > *', kDetail), { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: .45, ease: 'expo.out', stagger: .025, clearProps: 'transform' });
      scramble($('.det__name', kDetail), p.name, .45);
    }
  }
  kGrid.addEventListener('click', function (e) {
    var s = e.target.closest('.slot'); if (!s) return;
    kSelect(+s.dataset.i, false, false);
  });
  kGrid.addEventListener('dblclick', function (e) { var s = e.target.closest('.slot'); if (s && byId[s.dataset.id].price) addToInv(byId[s.dataset.id], 1, s.querySelector('img')); });
  kDetail.addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]');
    if (q) { kQty = clamp(kQty + (+q.dataset.q), 1, 20); $('#kQty').textContent = kQty; SFX.tick(); return; }
    if (e.target.closest('#kAdd')) { addToInv(byId[kSelId], kQty, $('.det__img img', kDetail)); return; }
    if (e.target.closest('.det__close')) { closeDetailSheet(); SFX.close(); }
  });
  $('#kTabs').addEventListener('click', function (e) {
    var t = e.target.closest('.tab'); if (!t) return;
    setCat(t.dataset.tab);
  });
  function setCat(id) { if (id === kCat) return; kCat = id; SFX.select(); renderGrid(false); }
  var sT = 0;
  kSearch.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(function () { renderGrid(false); }, 110); });
  function openDetailSheet() { kDetail.classList.add('is-open'); }
  function closeDetailSheet() { kDetail.classList.remove('is-open'); }
  function gridCols() {
    var s = $$('.slot', kGrid); if (s.length < 2) return 1;
    var top = s[0].offsetTop, n = 0;
    for (var i = 0; i < s.length && s[i].offsetTop === top; i++) n++;
    return Math.max(1, n);
  }
  var kInit = false;
  enterHooks.koleksi = function () { unlock('explore'); if (!kInit) { kInit = true; renderGrid(false); } closeDetailSheet(); };
  leaveHooks.koleksi = function () { closeDetailSheet(); };
  keyHooks.koleksi = function (e) {
    var k = e.key, c = gridCols();
    if (k === 'q' || k === 'Q' || k === 'e' || k === 'E') {
      var ti = TABS.findIndex(function (t) { return t.id === kCat; }) + (k.toLowerCase() === 'q' ? -1 : 1);
      setCat(TABS[(ti + TABS.length) % TABS.length].id); return true;
    }
    if (k === 'ArrowRight') { kSelect(kSel + 1, false, true); return true; }
    if (k === 'ArrowLeft') { kSelect(kSel - 1, false, true); return true; }
    if (k === 'ArrowDown') { kSelect(kSel + c, false, true); return true; }
    if (k === 'ArrowUp') { kSelect(kSel - c, false, true); return true; }
    if (k === 'Enter') { if (isMobile()) openDetailSheet(); else if (byId[kSelId] && byId[kSelId].price) addToInv(byId[kSelId], kQty, $('.det__img img', kDetail)); return true; }
    if (k === 'a' || k === 'A') { if (byId[kSelId] && byId[kSelId].price) addToInv(byId[kSelId], kQty, $('.det__img img', kDetail)); else SFX.error(); return true; }
  };

  /* ======================================================================
     INVENTORI (keranjang)
     ====================================================================== */
  var cart = store.get('xv3_cart', {});
  Object.keys(cart).forEach(function (id) { if (!byId[id] || !byId[id].price) delete cart[id]; });
  var invEl = $('#inv');
  function cartCount() { return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0); }
  function cartTotal() { return Object.keys(cart).reduce(function (n, id) { return n + byId[id].price * cart[id]; }, 0); }
  function renderInv() {
    var ids = Object.keys(cart), n = cartCount();
    $('#invCount').textContent = n;
    $('#invCount').classList.toggle('is-on', n > 0);
    $('#invItems').textContent = n + ' item';
    invEl.classList.toggle('is-empty', !ids.length);
    $('#invList').innerHTML = ids.map(function (id) {
      var p = byId[id], r = rar(p);
      return '<li style="--rc:' + r.rgb + '" data-id="' + id + '"><div class="inv__th"><img class="' + imgClass(p) + '" src="' + src(p.img, 768) + '" alt=""></div>' +
        '<div><p class="inv__n">' + esc(p.name) + '</p><p class="inv__p">' + rupiah(p.price) + '</p><div class="inv__q"><button type="button" data-d="-1" aria-label="Kurangi" data-lock><svg><use href="#i-minus"/></svg></button><span>' + cart[id] + '</span><button type="button" data-d="1" aria-label="Tambah" data-lock><svg><use href="#i-plus"/></svg></button></div></div>' +
        '<button class="inv__rm" type="button" data-rm data-lock>Buang</button></li>';
    }).join('');
    $('#invTotal').textContent = rupiah(cartTotal());
    var lines = ids.map(function (id) { var p = byId[id]; return '• ' + p.name + ' (' + p.type + ') × ' + cart[id] + ' — ' + rupiah(p.price * cart[id]); });
    $('#invCheckout').href = wa('Halo XIONCO, saya ingin memesan:\n' + lines.join('\n') + '\n\nSubtotal: ' + rupiah(cartTotal()) + '\n(dari website XIONCO)');
    store.set('xv3_cart', cart);
  }
  $('#invList').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var id = li.dataset.id, d = e.target.closest('[data-d]');
    if (d) { cart[id] = clamp(cart[id] + (+d.dataset.d), 0, 99); if (!cart[id]) delete cart[id]; SFX.tick(); renderInv(); }
    else if (e.target.closest('[data-rm]')) { delete cart[id]; SFX.back(); renderInv(); }
  });
  function addToInv(p, qty, fromImg) {
    if (!p || !p.price) return;
    cart[p.id] = clamp((cart[p.id] || 0) + (qty || 1), 1, 99);
    renderInv();
    SFX.coin();
    unlock('collector');
    var btn = $('#invBtn');
    btn.classList.remove('is-bump'); void btn.offsetWidth; btn.classList.add('is-bump');
    toast({ k: '+' + (qty || 1) + ' masuk inventori', t: p.name, x: rupiah(p.price * (qty || 1)), icon: 'i-bag', kind: 'info' });
    if (ANIM && fromImg) {
      var r = fromImg.getBoundingClientRect(), t = btn.getBoundingClientRect();
      if (!r.width || !t.width) return;
      var fly = document.createElement('img');
      fly.src = fromImg.currentSrc || fromImg.src;
      fly.className = fromImg.className;
      fly.style.cssText = 'position:fixed;z-index:2600;pointer-events:none;object-fit:contain;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;filter:' + (fromImg.classList.contains('is-knock') ? 'url(#knock) ' : '') + 'drop-shadow(0 0 12px rgba(255,182,72,.9))';
      document.body.appendChild(fly);
      var dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
      G.timeline({ onComplete: function () { fly.remove(); } })
        .to(fly, { x: dx, duration: .85, ease: 'power2.in' }, 0)
        .to(fly, { y: dy, duration: .85, ease: 'back.in(1.4)' }, 0)
        .to(fly, { scale: .08, opacity: .3, duration: .85, ease: 'power2.in' }, 0);
    }
  }
  function openInv() { closeOverlays(); renderInv(); invEl.classList.add('is-open'); invEl.setAttribute('aria-hidden', 'false'); SFX.open(); }
  $('#invBtn').addEventListener('click', function () { if (invEl.classList.contains('is-open')) { closeOverlays(); SFX.close(); } else openInv(); });
  invEl.addEventListener('click', function (e) { if (e.target === invEl) { closeOverlays(); SFX.close(); } });
  renderInv();

  /* ======================================================================
     CRAFT
     ====================================================================== */
  var S = XV.STUDIO;
  var NEON = [{ id: 'amber', name: 'Amber', c: '#ffb648' }, { id: 'cyan', name: 'Cyan', c: '#3ee8ff' }, { id: 'magenta', name: 'Magenta', c: '#ff4fa8' }, { id: 'violet', name: 'Violet', c: '#9b7bff' }];
  var DEF = { seats: 3, arms: true, ottoman: false, fabric: 'fb01', base: 'oak', neon: 'amber' };
  var cfg = Object.assign({}, DEF, store.get('xv3_craft', {}));
  var cChanges = 0, priceObj = { v: 0 };
  $('#cFabrics').innerHTML = S.fabrics.map(function (f) { return '<button class="swatch" type="button" data-fabric="' + f.id + '" data-type="' + f.type + '" style="--c:' + f.color + '" aria-label="' + f.code + ' ' + f.name + '" data-cursor="' + f.code + '" data-lock></button>'; }).join('');
  $('#cBases').innerHTML = S.bases.map(function (b) { return '<button class="chip" type="button" data-base="' + b.id + '" style="--c:' + b.color + '" data-lock><i></i>' + b.name + '</button>'; }).join('');
  $('#cNeon').innerHTML = NEON.map(function (n) { return '<button class="chip" type="button" data-neon="' + n.id + '" style="--c:' + n.c + '" data-lock><i></i>' + n.name + '</button>'; }).join('');
  function fabric() { return S.fabrics.filter(function (f) { return f.id === cfg.fabric; })[0] || S.fabrics[0]; }
  function base() { return S.bases.filter(function (b) { return b.id === cfg.base; })[0] || S.bases[0]; }
  function widthCm() { return cfg.seats * S.seatW + (cfg.arms ? 2 * S.armW : 0); }
  function craftPrice() {
    var p = cfg.seats * S.seatPrice + (cfg.arms ? S.armPrice : 0) + (cfg.ottoman ? S.ottomanPrice : 0);
    if (fabric().type === 'leather') p *= S.leatherFactor;
    return p + base().add;
  }
  function craftUpdate(animate) {
    if (XW.ok) { XW.craft({ seats: cfg.seats, arms: cfg.arms, ottoman: cfg.ottoman, fabric: cfg.fabric, base: cfg.base }, animate); if (current === 'craft') XW.setAccent(cfg.neon); }
    $$('#cSeats button').forEach(function (b) { var on = +b.dataset.seats === cfg.seats; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
    $('#cArms').setAttribute('aria-pressed', String(cfg.arms));
    $('#cOtt').setAttribute('aria-pressed', String(cfg.ottoman));
    $$('#cFabrics .swatch').forEach(function (b) { b.classList.toggle('is-on', b.dataset.fabric === cfg.fabric); });
    $$('#cBases .chip').forEach(function (b) { b.classList.toggle('is-on', b.dataset.base === cfg.base); });
    $$('#cNeon .chip').forEach(function (b) { b.classList.toggle('is-on', b.dataset.neon === cfg.neon); });
    var f = fabric(), b = base();
    $('#cFabricName').innerHTML = '<b>' + f.code + '</b> — ' + esc(f.name) + ' · ' + (f.type === 'leather' ? 'faux leather' : 'fabric');
    $('#cName').textContent = cfg.seats + ' Seater' + (cfg.arms ? '' : ' Armless') + (cfg.ottoman ? ' + Ottoman' : '');
    $('#cDims').textContent = 'W ' + widthCm() + ' · D ' + S.depth + ' · H ' + S.height + ' cm' + (cfg.ottoman ? ' · Ottoman 72 × 72' : '');
    var target = craftPrice();
    if (ANIM && animate) G.to(priceObj, { v: target, duration: .8, ease: 'power3.out', onUpdate: function () { $('#cPrice').textContent = rupiah(priceObj.v); } });
    else { priceObj.v = target; $('#cPrice').textContent = rupiah(target); }
    $('#cQuote').href = wa('Halo XIONCO, saya ingin penawaran CUBIX Modular (build dari Craft 3D):\n• Dudukan: ' + cfg.seats + ' seater' + (cfg.arms ? ' dengan lengan' : ' tanpa lengan') +
      '\n• Ottoman: ' + (cfg.ottoman ? 'ya' : 'tidak') + '\n• Material: ' + f.code + ' ' + f.name + '\n• Base: ' + b.name +
      '\n• Ukuran: W ' + widthCm() + ' × D ' + S.depth + ' × H ' + S.height + ' cm\n• Estimasi di website: ' + rupiah(target));
    store.set('xv3_craft', cfg);
  }
  function craftSet(patch) {
    var changed = Object.keys(patch).some(function (k) { return cfg[k] !== patch[k]; });
    if (!changed) return;
    Object.assign(cfg, patch);
    cChanges++;
    if (patch.seats != null || patch.arms != null || patch.ottoman != null) SFX.build(); else SFX.select();
    craftUpdate(true);
    if (cChanges >= 2) unlock('architect');
  }
  $('#cSeats').addEventListener('click', function (e) { var b = e.target.closest('[data-seats]'); if (b) craftSet({ seats: +b.dataset.seats }); });
  $('#cArms').addEventListener('click', function () { craftSet({ arms: !cfg.arms }); });
  $('#cOtt').addEventListener('click', function () { craftSet({ ottoman: !cfg.ottoman }); });
  $('#cFabrics').addEventListener('click', function (e) { var b = e.target.closest('[data-fabric]'); if (b) craftSet({ fabric: b.dataset.fabric }); });
  $('#cBases').addEventListener('click', function (e) { var b = e.target.closest('[data-base]'); if (b) craftSet({ base: b.dataset.base }); });
  $('#cNeon').addEventListener('click', function (e) { var b = e.target.closest('[data-neon]'); if (b) craftSet({ neon: b.dataset.neon }); });
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  $('#cRandom').addEventListener('click', function () {
    craftSet({ seats: 1 + ((Math.random() * 4) | 0), arms: Math.random() > .25, ottoman: Math.random() > .5, fabric: pick(S.fabrics).id, base: pick(S.bases).id, neon: pick(NEON).id });
  });
  $('#cReset').addEventListener('click', function () { craftSet(Object.assign({}, DEF)); });
  $('#cQuote').addEventListener('click', function () { unlock('architect'); });
  var dimEl = $('#dimline');
  enterHooks.craft = function () { craftUpdate(false); if (XW.ok) XW.setAccent(cfg.neon); };
  leaveHooks.craft = function () { dimEl.classList.remove('is-on'); };
  keyHooks.craft = function (e) {
    var k = e.key.toLowerCase();
    if (/^[1-4]$/.test(k)) { craftSet({ seats: +k }); return true; }
    if (k === 'l') { craftSet({ arms: !cfg.arms }); return true; }
    if (k === 'o') { craftSet({ ottoman: !cfg.ottoman }); return true; }
    if (k === 'r') { $('#cRandom').click(); return true; }
    if (k === '[' || k === ']') {
      var i = S.fabrics.findIndex(function (f) { return f.id === cfg.fabric; }) + (k === ']' ? 1 : -1);
      craftSet({ fabric: S.fabrics[(i + S.fabrics.length) % S.fabrics.length].id }); return true;
    }
    if (k === 'b') { var j = S.bases.findIndex(function (b) { return b.id === cfg.base; }) + 1; craftSet({ base: S.bases[j % S.bases.length].id }); return true; }
    if (k === 'n') { var m = NEON.findIndex(function (n) { return n.id === cfg.neon; }) + 1; craftSet({ neon: NEON[m % NEON.length].id }); return true; }
  };
  craftUpdate(false);

  /* ======================================================================
     PETA
     ====================================================================== */
  var stagesEl = $('#stages'), mapLabels = $('#mapLabels'), stageSel = -1;
  stagesEl.innerHTML = XV.FACTORIES.map(function (f, i) {
    return '<li><button type="button" data-st="' + i + '" data-lock><span class="st__n">Stage ' + f.n + '</span><span class="st__p">' + esc(f.place) + '</span><span class="st__r">' + esc(f.role) + '</span><span class="st__t">' + esc(f.text) + '</span></button></li>';
  }).join('');
  mapLabels.innerHTML = XV.FACTORIES.map(function (f, i) { return '<span class="mlabel" data-ml="' + i + '">' + esc(f.place) + '<small>' + esc(f.role) + '</small></span>'; }).join('');
  var mls = $$('.mlabel', mapLabels);
  function setStage(i) {
    stageSel = i;
    $$('li', stagesEl).forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
    mls.forEach(function (m, k) { m.classList.toggle('is-on', k === i); m.classList.toggle('is-dim', i >= 0 && k !== i); });
    if (!XW.ok) return;
    if (i >= 0) XW.mapFocus(i); else XW.mapOverview();
  }
  stagesEl.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; SFX.select(); setStage(+b.dataset.st === stageSel ? -1 : +b.dataset.st); });
  $('#stagePrev').addEventListener('click', function () { SFX.tick(); setStage(stageSel <= 0 ? XV.FACTORIES.length - 1 : stageSel - 1); });
  $('#stageNext').addEventListener('click', function () { SFX.tick(); setStage((stageSel + 1) % XV.FACTORIES.length); });
  $('#stageAll').addEventListener('click', function () { SFX.tick(); setStage(-1); });
  function countUp() {
    $$('#wstats [data-count]').forEach(function (b) {
      var to = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      if (!ANIM) { b.textContent = pre + to + suf; return; }
      var o = { v: 0 };
      G.to(o, { v: to, duration: 1.4, delay: .3, ease: 'power3.out', onUpdate: function () { b.textContent = pre + Math.round(o.v) + suf; } });
    });
  }
  enterHooks.peta = function () { unlock('traveler'); setStage(-1); countUp(); };
  leaveHooks.peta = function () { mls.forEach(function (m) { m.style.opacity = 0; }); };
  keyHooks.peta = function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { $('#stageNext').click(); return true; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { $('#stagePrev').click(); return true; }
    if (e.key === '0') { setStage(-1); return true; }
    if (/^[1-4]$/.test(e.key)) { setStage(+e.key - 1); return true; }
  };

  /* label & garis ukur mengikuti dunia 3D */
  XW.onFrame = function (L) {
    if (current === 'peta') {
      var bs = L.beacons;
      mls.forEach(function (m, i) {
        var p = bs && bs[i];
        if (!p || !p.v) { m.style.opacity = 0; return; }
        m.style.opacity = '';
        // klaster Jakarta: label disebar kiri / atas / kanan agar tidak bertumpuk
        var anchor = i === 1 ? 'translate(calc(-100% - 12px), -40%)' : i === 3 ? 'translate(12px, -40%)' : 'translate(-50%, -100%)';
        m.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) ' + anchor;
      });
    }
    if (current === 'craft' && L.dim && L.dim.a.v && L.dim.b.v) {
      var a = L.dim.a, b = L.dim.b, dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
      if (Math.abs(ang) > Math.PI / 2) { ang += Math.PI; a = L.dim.b; }
      dimEl.style.width = len.toFixed(1) + 'px';
      dimEl.style.transform = 'translate(' + a.x.toFixed(1) + 'px,' + (a.y + 26).toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
      $('#dimText').textContent = L.dim.w + ' cm';
      dimEl.classList.add('is-on');
    } else if (current === 'craft') dimEl.classList.remove('is-on');
  };

  /* ======================================================================
     GUILD
     ====================================================================== */
  $('#questsGrid').innerHTML = XV.SERVICES.map(function (s) {
    return '<article class="quest frame" data-a><div class="quest__img"><img src="' + src(s.img, 768) + '" alt="' + esc(s.title) + '" loading="lazy"></div>' +
      '<div class="quest__body"><p class="quest__n">Quest ' + s.n + '</p><h3 class="quest__t">' + esc(s.title) + '</h3><p class="quest__d">' + esc(s.note) + '</p>' +
      '<p class="quest__r">Reward: <b>penawaran dalam 1 jam</b></p>' +
      '<a class="nbtn nbtn--full" href="' + wa('Halo XIONCO, saya tertarik dengan layanan ' + s.title + ' (' + s.note + ') untuk proyek saya.') + '" target="_blank" rel="noopener" data-lock>Terima quest<svg><use href="#i-arrow"/></svg></a></div></article>';
  }).join('');
  $('#alliance').innerHTML = XV.CLIENTS.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
  $('#party').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim(), phone = $('#fPhone').value.replace(/[^\d+]/g, '');
    $('#fName').parentNode.classList.toggle('is-err', !name);
    $('#fPhone').parentNode.classList.toggle('is-err', phone.length < 8);
    var note = $('#partyNote');
    if (!name || phone.length < 8) { note.textContent = 'Lengkapi nama dan nomor WhatsApp yang valid.'; note.classList.add('is-err'); SFX.error(); return; }
    note.classList.remove('is-err');
    note.textContent = 'Membuka WhatsApp…';
    SFX.select();
    var msg = 'Halo XIONCO, saya ' + name + ' (' + phone + ').\nJenis proyek: ' + $('#fType').value + '\nNilai proyek: ' + $('#fValue').value + ($('#fNeed').value.trim() ? '\nKebutuhan: ' + $('#fNeed').value.trim() : '');
    window.open(wa(msg), '_blank', 'noopener');
    unlock('guild');
  });
  enterHooks.guild = function () {
    unlock('guild');
    var sc = $('.screen--guild .scroll'); if (sc) sc.scrollTop = 0;
  };

  /* ======================================================================
     GALERI — cincin 3D
     ====================================================================== */
  var ringEl = $('#ring'), trackEl = $('#ringTrack'), N = XV.MUSE.length, STEP = 360 / N;
  trackEl.innerHTML = XV.MUSE.map(function (m, i) {
    return '<div class="rcard" data-i="' + i + '" data-cursor="Lihat"><div class="frame"><img src="' + src(m.img, 768) + '" alt="' + esc(m.title) + '" loading="lazy" draggable="false"><p>' + esc(m.title) + '</p></div></div>';
  }).join('');
  var cards = $$('.rcard', trackEl);
  var ring = { a: 0, t: 0, v: 0, drag: false, lastX: 0, moved: 0, front: -1, seen: {}, active: false };
  function ringRadius() { return trackEl.offsetWidth / 2 / Math.tan(Math.PI / N) * 1.12; }
  function ringCaption(i) {
    var m = XV.MUSE[i];
    $('#ringN').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    $('#ringTitle').textContent = m.title;
    $('#ringNote').textContent = m.note;
  }
  function ringTo(i) { ring.t = Math.round(ring.a / STEP) * STEP + (((i - frontIndex()) % N + N + N / 2) % N - N / 2) * STEP; }
  function frontIndex() { return ((Math.round(ring.a / STEP) % N) + N) % N; }
  (function ringLoop() {
    requestAnimationFrame(ringLoop);
    if (!ring.active) return;
    if (!ring.drag) {
      if (Math.abs(ring.v) > .02) { ring.t += ring.v; ring.v *= .9; if (Math.abs(ring.v) < .3) { ring.v = 0; ring.t = Math.round(ring.t / STEP) * STEP; } }
      ring.a = lerp(ring.a, ring.t, REDUCED ? 1 : .09);
    }
    var R = ringRadius();
    trackEl.style.transform = 'translateZ(' + (-R).toFixed(1) + 'px) rotateY(' + (-ring.a).toFixed(2) + 'deg)';
    cards.forEach(function (c, i) {
      var d = ((i * STEP - ring.a) % 360 + 540) % 360 - 180, cos = Math.cos(d * Math.PI / 180);
      c.style.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + R.toFixed(1) + 'px)';
      c.style.opacity = (.18 + .82 * Math.max(0, cos) * Math.max(0, cos)).toFixed(3);
    });
    var f = frontIndex();
    if (f !== ring.front) {
      ring.front = f;
      cards.forEach(function (c, i) { c.classList.toggle('is-front', i === f); });
      ringCaption(f);
      if (ring.started) { SFX.tick(); ring.seen[f] = 1; if (Object.keys(ring.seen).length >= 3) unlock('curator'); }
    }
  })();
  ringEl.addEventListener('pointerdown', function (e) {
    ring.drag = true; ring.lastX = e.clientX; ring.moved = 0; ring.v = 0; ring.started = true;
    try { ringEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  ringEl.addEventListener('pointermove', function (e) {
    if (!ring.drag) return;
    var dx = e.clientX - ring.lastX; ring.lastX = e.clientX; ring.moved += Math.abs(dx);
    ring.a -= dx * .22; ring.t = ring.a; ring.v = -dx * .22;
  });
  var ringUp = function (e) {
    if (!ring.drag) return;
    ring.drag = false;
    if (ring.moved < 6) {
      var c = document.elementFromPoint(e.clientX, e.clientY);
      c = c && c.closest('.rcard');
      if (c) { var i = +c.dataset.i; if (i === frontIndex()) openLb(i); else { ringTo(i); SFX.select(); } }
      ring.v = 0; ring.t = Math.round(ring.a / STEP) * STEP;
    }
  };
  ringEl.addEventListener('pointerup', ringUp);
  ringEl.addEventListener('pointercancel', function () { ring.drag = false; });
  ringEl.addEventListener('wheel', function (e) { e.preventDefault(); ring.started = true; ring.t += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? STEP : -STEP; ring.t = Math.round(ring.t / STEP) * STEP; }, { passive: false });
  $('#ringPrev').addEventListener('click', function () { ring.started = true; ring.t = Math.round(ring.t / STEP) * STEP - STEP; });
  $('#ringNext').addEventListener('click', function () { ring.started = true; ring.t = Math.round(ring.t / STEP) * STEP + STEP; });
  var lbEl = $('#lb');
  function openLb(i) {
    var m = XV.MUSE[i];
    $('#lbImg').src = src(m.img, 1024); $('#lbImg').alt = m.title;
    $('#lbTitle').textContent = m.title; $('#lbNote').textContent = m.note;
    closeOverlays(); lbEl.classList.add('is-open'); lbEl.setAttribute('aria-hidden', 'false'); SFX.open();
    ring.seen[i] = 1; if (Object.keys(ring.seen).length >= 3) unlock('curator');
    if (ANIM) G.from('.lb__fig', { scale: .92, opacity: 0, duration: .5, ease: 'expo.out' });
  }
  lbEl.addEventListener('click', function (e) { if (e.target === lbEl) { closeOverlays(); SFX.close(); } });
  enterHooks.galeri = function () { ring.active = true; };
  leaveHooks.galeri = function () { ring.active = false; };
  keyHooks.galeri = function (e) {
    if (e.key === 'ArrowRight' || e.key === 'd') { $('#ringNext').click(); return true; }
    if (e.key === 'ArrowLeft' || e.key === 'a') { $('#ringPrev').click(); return true; }
    if (e.key === 'Enter' || e.key === ' ') { openLb(frontIndex()); return true; }
  };

  /* ======================================================================
     KONTAK — "Continue?"
     ====================================================================== */
  var contEl = $('#contCount'), contT = 0;
  enterHooks.kontak = function () {
    unlock('save');
    var n = 9;
    clearInterval(contT);
    contEl.textContent = n;
    contT = setInterval(function () {
      n = n <= 0 ? 9 : n - 1;
      contEl.textContent = n;
      contEl.classList.remove('is-tick'); void contEl.offsetWidth; contEl.classList.add('is-tick');
      SFX.count(n === 0);
    }, 1000);
  };
  leaveHooks.kontak = function () { clearInterval(contT); };

  /* ======================================================================
     KONSOL (cari & perintah)
     ====================================================================== */
  var conEl = $('#console'), conIn = $('#cInput'), conRes = $('#cRes'), conItems = [], conSel = 0;
  var CMDS = SCREENS.map(function (s) { return { k: 'Layar', t: s.t, s: s.s, run: function () { go(s.id); }, q: (s.id + ' ' + s.t + ' ' + s.s).toLowerCase() }; }).concat([
    { k: 'Layar', t: 'Hub', s: 'Menu utama', run: function () { go('hub'); }, q: 'hub menu utama home' },
    { k: 'Aksi', t: 'Inventori', s: 'Buka keranjang', run: function () { openInv(); }, q: 'inventori keranjang cart bag' },
    { k: 'Aksi', t: 'Pencapaian', s: 'Lihat progres', run: function () { openAch(); }, q: 'pencapaian achievement xp level' },
    { k: 'Aksi', t: 'Suara', s: 'Nyalakan / matikan', run: function () { sfxBtn.click(); }, q: 'suara sound audio mute' },
    { k: 'Aksi', t: 'Acak sofa', s: 'Build acak di Craft', run: function () { go('craft'); setTimeout(function () { $('#cRandom').click(); }, 600); }, q: 'acak random sofa craft' },
    { k: 'Aksi', t: 'Konsultasi', s: 'WhatsApp tim XIONCO', run: function () { window.open(wa('Halo XIONCO, saya ingin konsultasi gratis.'), '_blank', 'noopener'); }, q: 'konsultasi whatsapp wa kontak hubungi' }
  ]);
  function conRender() {
    var q = conIn.value.trim().toLowerCase();
    var cmds = CMDS.filter(function (c) { return !q || c.q.indexOf(q) >= 0; });
    var items = q ? search(q).slice(0, 8).map(function (p) { return { k: 'Item', t: p.name, s: priceLine(p), item: true, run: function () { openProduct(p.id); } }; }) : [];
    conItems = (q ? items.concat(cmds) : cmds).slice(0, 10);
    conSel = clamp(conSel, 0, Math.max(0, conItems.length - 1));
    conRes.innerHTML = conItems.length ? conItems.map(function (c, i) {
      return '<li class="' + (i === conSel ? 'is-sel' : '') + '"><button type="button" data-ci="' + i + '"><span class="r-k' + (c.item ? ' is-item' : '') + '">' + c.k + '</span><span class="r-t">' + esc(c.t) + '</span><span class="r-s">' + esc(c.s) + '</span></button></li>';
    }).join('') : '<li><button type="button" disabled><span class="r-k">—</span><span class="r-t">Tidak ditemukan</span><span class="r-s">coba: sofa, meja, lampu</span></button></li>';
  }
  function openConsole() { closeOverlays(); conEl.classList.add('is-open'); conEl.setAttribute('aria-hidden', 'false'); conIn.value = ''; conSel = 0; conRender(); SFX.open(); setTimeout(function () { conIn.focus(); }, 30); }
  function conRun(i) { var c = conItems[i]; if (!c) return; closeOverlays(); SFX.select(); c.run(); }
  conIn.addEventListener('input', function () { conSel = 0; conRender(); });
  conIn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); conSel = Math.min(conItems.length - 1, conSel + 1); conRender(); SFX.tick(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); conSel = Math.max(0, conSel - 1); conRender(); SFX.tick(); }
    else if (e.key === 'Enter') { e.preventDefault(); conRun(conSel); }
  });
  conRes.addEventListener('click', function (e) { var b = e.target.closest('[data-ci]'); if (b) conRun(+b.dataset.ci); });
  conEl.addEventListener('click', function (e) { if (e.target === conEl) { closeOverlays(); SFX.close(); } });
  $('#consoleBtn').addEventListener('click', openConsole);
  function openProduct(id) {
    kCat = 'all'; kSearch.value = '';
    kSelId = id;
    var doIt = function () { kInit = true; renderGrid(true); var i = kList.findIndex(function (p) { return p.id === id; }); kSelect(i, true, false); var s = $('.slot.is-sel', kGrid); if (s) s.scrollIntoView({ block: 'center' }); };
    if (current === 'koleksi') doIt(); else { kInit = true; go('koleksi'); setTimeout(doIt, 380); }
  }

  /* ======================================================================
     PENCAPAIAN
     ====================================================================== */
  var achEl = $('#ach');
  function renderAch() {
    $('#achList').innerHTML = ACH.map(function (a) {
      var on = !!prog.ach[a.id], hid = a.hidden && !on;
      return '<li class="' + (on ? 'is-on' : '') + '"><span class="ach__ic"><svg><use href="#i-trophy"/></svg></span><span><span class="ach__t" style="display:block">' + (hid ? '???' : esc(a.t)) + '</span><span class="ach__d">' + (hid ? 'Rahasia — coba kode klasik' : esc(a.d)) + '</span></span><span class="ach__x">+' + a.xp + ' XP</span></li>';
    }).join('');
  }
  function openAch() { closeOverlays(); renderAch(); achEl.classList.add('is-open'); achEl.setAttribute('aria-hidden', 'false'); SFX.open(); if (ANIM) G.from('.ach__panel', { scale: .96, opacity: 0, duration: .45, ease: 'expo.out' }); }
  $('#xpBtn').addEventListener('click', openAch);
  achEl.addEventListener('click', function (e) { if (e.target === achEl) { closeOverlays(); SFX.close(); } });
  var resetArm = false;
  $('#achReset').addEventListener('click', function () {
    if (!resetArm) { resetArm = true; this.textContent = 'Yakin? Klik sekali lagi'; var b = this; setTimeout(function () { resetArm = false; b.textContent = 'Reset progres'; }, 3000); return; }
    prog = { xp: 0, ach: {}, seen: {} }; saveProg(); updateXP(); renderAch(); renderQuests(); renderMenuDone(); renderPips();
    this.textContent = 'Reset progres'; resetArm = false; SFX.back();
  });

  /* ======================================================================
     Overlay & sheet HP
     ====================================================================== */
  var sheetEl = $('#moreSheet');
  $('#dockMore').addEventListener('click', function () { var open = !sheetEl.classList.contains('is-open'); closeOverlays(); if (open) { sheetEl.classList.add('is-open'); SFX.open(); } });
  sheetEl.addEventListener('click', function (e) { if (e.target === sheetEl) closeOverlays(); });
  function anyOverlay() { return [invEl, conEl, achEl, lbEl, sheetEl].some(function (o) { return o.classList.contains('is-open'); }) || kDetail.classList.contains('is-open'); }
  function closeOverlays(keepDetail) {
    [invEl, conEl, achEl, lbEl, sheetEl].forEach(function (o) { o.classList.remove('is-open'); o.setAttribute('aria-hidden', 'true'); });
    if (!keepDetail) closeDetailSheet();
    if (document.activeElement === conIn) conIn.blur();
  }

  /* ======================================================================
     Keyboard, kode rahasia, gamepad
     ====================================================================== */
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'], kon = 0;
  function overdrive() {
    unlock('secret');
    toast({ k: 'Mode rahasia', t: 'Neon overdrive', x: 'Selamat menikmati', icon: 'i-hub', kind: 'info' });
    if (!XW.ok) return;
    var cols = ['magenta', 'cyan', 'violet', 'lime', 'amber'], i = 0;
    var t = setInterval(function () { XW.setAccent(cols[i++ % cols.length]); if (i > 14) { clearInterval(t); XW.setAccent(current === 'craft' ? cfg.neon : 'amber'); } }, 380);
  }
  function handleKey(e) {
    var k = (e.key || '').toLowerCase();
    if (k === KONAMI[kon]) { kon++; if (kon === KONAMI.length) { kon = 0; overdrive(); } } else kon = k === KONAMI[0] ? 1 : 0;
    if (!booted) return;
    var typing = /^(input|textarea|select)$/i.test((e.target && e.target.tagName) || '');
    if (k === 'escape') {
      if (anyOverlay()) { closeOverlays(); SFX.close(); return; }
      if (typing) { e.target.blur(); return; }
      if (current !== 'hub' && current !== 'title') { SFX.back(); go('hub'); }
      return;
    }
    if (typing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === '/' || k === '`') { e.preventDefault(); openConsole(); return; }
    if (anyOverlay()) return;
    if (k === 'm') { sfxBtn.click(); return; }
    if (k === 'i') { $('#invBtn').click(); return; }
    if (k === 'h' && current !== 'title') { SFX.back(); go('hub'); return; }
    if (keyHooks[current] && keyHooks[current](e)) { if (e.preventDefault) e.preventDefault(); }
  }
  window.addEventListener('keydown', handleKey);
  // gamepad: D-pad / A / B / bahu
  var pads = { prev: {} };
  var PADMAP = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight', 0: 'Enter', 1: 'Escape', 9: 'Enter', 4: 'q', 5: 'e', 2: 'a' };
  window.addEventListener('gamepadconnected', function () {
    toast({ k: 'Kontroler', t: 'Gamepad terhubung', x: 'D-pad · A · B', icon: 'i-hub', kind: 'info' });
    (function poll() {
      var gp = navigator.getGamepads ? Array.prototype.slice.call(navigator.getGamepads()).filter(Boolean)[0] : null;
      if (gp) {
        Object.keys(PADMAP).forEach(function (b) {
          var on = gp.buttons[b] && gp.buttons[b].pressed;
          if (on && !pads.prev[b]) handleKey({ key: PADMAP[b], target: document.body, preventDefault: function () {} });
          pads.prev[b] = on;
        });
        requestAnimationFrame(poll);
      }
    })();
  });

  /* ======================================================================
     Mulai
     ====================================================================== */
  updateXP(); renderQuests(); renderAch(); renderMenuDone(); renderPips();
  window.addEventListener('resize', function () { if (!isMobile()) closeDetailSheet(); });
})();
