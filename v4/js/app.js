/* ==========================================================================
   Maison XIONCO — interaksi (satu layar, tanpa pindah halaman)
   • Navigator kiri (gaya versi 1). Menyorot menu → kotak deskripsi berubah.
   • Memilih menu → panel kanan bergeser masuk; panggung tengah tetap.
   • Memilih karya di Koleksi / Galeri → objek di tengah panggung berganti.
   Hash (#/koleksi dst.) hanya untuk tautan langsung; layar tidak berganti.
   ========================================================================== */
(function () {
  'use strict';

  var XV = window.XV, G = window.gsap, XW = window.XW || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var html = document.documentElement;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ANIM = !!G && !REDUCED;
  var isMobile = function () { return innerWidth <= 760; };
  var rupiah = function (n) { return 'IDR ' + Math.round(n).toLocaleString('id-ID'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var src = function (p, w) {
    var s = w && XV.SIZES && XV.SIZES[p];
    var ok = s ? s.filter(function (v) { return v >= w; }) : [];
    if (!ok.length) return XV.IMG + p;
    var v = Math.min.apply(null, ok);
    return XV.IMG + p.replace(/\.(png|jpe?g|webp)$/i, '-' + v + 'x' + v + '.$1');
  };
  var wa = function (t) { return 'https://wa.me/' + XV.WA + '?text=' + encodeURIComponent(t); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var byId = {};
  XV.PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var photoCls = function (p) { return XV.V3_DARK.indexOf(p.id) >= 0 ? 'is-photo' : ''; };
  var catLabel = function (id) { var c = XV.CATEGORIES.filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; };
  var priceText = function (p) { return p.price ? (p.from ? 'mulai ' : '') + rupiah(p.price) : 'Melalui penawaran'; };
  if (ANIM) html.classList.add('anim');

  $$('.logo-path').forEach(function (p) { p.setAttribute('d', XV.LOGO); });
  $$('[data-wa]').forEach(function (a) { a.href = wa(a.dataset.wa); });

  /* ======================================================================
     Isi kotak deskripsi per menu
     ====================================================================== */
  var SECTIONS = {
    home: { n: 'Maison XIONCO', t: 'Quality shouldn\'t be a luxury', p: 'Furnitur minimalis dengan pengerjaan tanpa kompromi — dirancang dan diproduksi sendiri di empat pabrik kami di Jawa.', m: XV.PRODUCTS.length + ' karya · 4 pabrik · garansi 3 tahun' },
    koleksi: { n: '01 — Koleksi', t: 'Koleksi', p: 'Sofa, meja, tempat tidur, kabinet, lampu, hingga kelistrikan VAZRA. Pilih satu karya — ia akan tampil di panggung.', m: XV.PRODUCTS.length + ' karya · harga xionco.shop' },
    atelier: { n: '02 — Atelier', t: 'Atelier', p: 'Rancang sofa modular CUBIX: komposisi, material, base, hingga suasana ruang. Estimasi langsung, penawaran via WhatsApp.', m: '8 material · 4 base · 3 suasana' },
    manufaktur: { n: '03 — Manufaktur', t: 'Manufaktur', p: 'Empat pabrik di Jawa — dari pengolahan kayu di Jepara hingga pengemasan di Jakarta Selatan.', m: '30+ sofa per hari · 80+ pekerja' },
    bisnis: { n: '04 — Bisnis', t: 'For Business', p: 'Space plan, produk dalam jumlah besar, interior, dan built-in untuk kantor, hotel, dan retail. Penawaran dalam 1 jam.', m: 'Cicilan 0% · garansi 3 tahun' },
    galeri: { n: '05 — Galeri', t: 'Galeri', p: 'Proyek dan inspirasi: solusi kelistrikan ruang rapat, pencahayaan, plafon custom, hingga detail material.', m: XV.MUSE.length + ' karya terpilih' },
    kontak: { n: '06 — Kontak', t: 'Kontak', p: 'Showroom di Jl. Ciputat Raya No. 8, Jakarta Selatan. Konsultasi privat tanpa biaya melalui WhatsApp.', m: '+62 822-4040-8055' },
    tas: { n: 'Tas belanja', t: 'Tas Anda', p: 'Karya yang Anda pilih. Checkout dikirim langsung ke WhatsApp tim XIONCO.', m: 'Harga mengikuti xionco.shop' }
  };
  var ROUTES = ['home', 'koleksi', 'atelier', 'manufaktur', 'bisnis', 'galeri', 'kontak', 'tas'];

  /* ======================================================================
     Kursor
     ====================================================================== */
  var cur = $('#cursor'), curLabel = $('#cursorLabel');
  var mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  if (FINE) {
    html.classList.add('has-cursor');
    var cdot = $('.cursor__dot', cur), cring = $('.cursor__ring', cur), rx = mouse.x, ry = mouse.y;
    (function loop() {
      rx = lerp(rx, mouse.x, .18); ry = lerp(ry, mouse.y, .18);
      cdot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';
      cring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, label, input, select, textarea');
      cur.classList.toggle('is-hover', !!t);
      cur.classList.toggle('is-light', !!e.target.closest('.panel'));
      var lab = t && t.getAttribute('data-cursor');
      if (!lab && e.target.id === 'world' && XW.kind && XW.kind() === 'cubix') lab = current === 'atelier' ? 'Putar' : 'Seret';
      cur.classList.toggle('is-label', !!lab);
      if (lab) curLabel.textContent = lab;
    });
    document.documentElement.addEventListener('mouseleave', function () { cur.style.opacity = 0; });
    document.documentElement.addEventListener('mouseenter', function () { cur.style.opacity = 1; });
  }

  var noticeEl = $('#notice'), noticeT = 0;
  function notice(text) {
    noticeEl.textContent = text;
    noticeEl.classList.add('is-on');
    clearTimeout(noticeT);
    noticeT = setTimeout(function () { noticeEl.classList.remove('is-on'); }, 2600);
  }

  /* ======================================================================
     Efek "menulis ulang" (seperti versi 3): teks lama dihapus, teks baru
     tertulis dari kiri dengan ekor huruf acak berwarna emas. Ukuran kotak tetap.
     ====================================================================== */
  var GL_UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', GL_LO = 'abcdefghijklmnopqrstuvwxyz', GL_NUM = '0123456789';
  function rewrite(el, text, dur, delay) {
    text = String(text == null ? '' : text);
    if (!el) return;
    if (!ANIM) { el.textContent = text; return; }
    var id = (el._rw = (el._rw || 0) + 1), d = (dur || .6) * 1000, t0 = performance.now() + (delay || 0) * 1000;
    var tail = text.length > 40 ? 5 : 3;
    var glyph = function (ch) {
      if (/\s/.test(ch)) return ch;
      var set = /[0-9]/.test(ch) ? GL_NUM : ch === ch.toLowerCase() && ch !== ch.toUpperCase() ? GL_LO : GL_UP;
      return set.charAt((Math.random() * set.length) | 0);
    };
    el.textContent = '';
    (function step(now) {
      if (el._rw !== id) return;
      if (now < t0) { requestAnimationFrame(step); return; }
      var p = clamp((now - t0) / d, 0, 1), n = Math.floor(p * (text.length + tail));
      var shown = text.slice(0, Math.min(n, text.length)), rest = '';
      for (var i = Math.min(n, text.length); i < Math.min(text.length, n + tail) && i < text.length; i++) rest += glyph(text.charAt(i));
      if (p >= 1) { el.textContent = text; return; }
      el.innerHTML = esc(shown) + (rest ? '<i class="rw">' + esc(rest) + '</i>' : '');
      requestAnimationFrame(step);
    })(performance.now());
  }

  /* ======================================================================
     Kotak deskripsi (kanan) & navigator kiri yang melebar
     ====================================================================== */
  var descEl = $('#desc'), railEl = $('#rail'), railHover = $('#railHover');
  var descKey = null;
  function setDesc(key) {
    if (key === descKey) return;
    descKey = key;
    var s = SECTIONS[key] || SECTIONS.home;
    rewrite($('#descN'), s.n, .35);
    rewrite($('#descT'), s.t, .5, .05);
    rewrite($('#descP'), s.p, .85, .12);
    rewrite($('#descM'), s.m, .5, .3);
    descEl.classList.remove('is-swap'); void descEl.offsetWidth; descEl.classList.add('is-swap');
  }
  var railT = 0;
  railEl.addEventListener('pointerenter', function () { if (!FINE || isMobile()) return; clearTimeout(railT); railEl.classList.add('is-open'); });
  railEl.addEventListener('pointerleave', function () {
    railHover.classList.remove('is-on');
    railT = setTimeout(function () { railEl.classList.remove('is-open'); }, 120);
    setDesc(current);
  });
  railEl.addEventListener('focusin', function () { if (!isMobile()) railEl.classList.add('is-open'); });
  railEl.addEventListener('focusout', function () { if (!railEl.contains(document.activeElement)) railEl.classList.remove('is-open'); });
  $$('.rail__item', railEl).forEach(function (a) {
    a.addEventListener('pointerenter', function () {
      if (!FINE) return;
      setDesc(a.dataset.key);
      var r = a.getBoundingClientRect(), rr = railEl.getBoundingClientRect();
      railHover.style.transform = 'translateY(' + (r.top - rr.top) + 'px)';
      railHover.classList.add('is-on');
    });
    a.addEventListener('focus', function () { setDesc(a.dataset.key); });
  });

  /* ======================================================================
     Rincian objek di bawah panggung: nama · detail · HARGA
     ====================================================================== */
  var detailEl = $('#detail'), dAct = $('#dAct'), dActFn = null, detailSig = '';
  function setDetail(o) {
    var sig = JSON.stringify([o.name, o.sub, o.cols, o.price, o.was, o.priceK, o.act && o.act.t]);
    if (sig === detailSig) return;
    detailSig = sig;
    rewrite($('#dName'), o.name, .45);
    rewrite($('#dSub'), o.sub || '', .55, .08);
    $('#dCols').innerHTML = (o.cols || []).map(function (c) { return '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>'; }).join('');
    $$('#dCols dd').forEach(function (dd, i) { rewrite(dd, dd.textContent, .5, .1 + i * .06); });
    var box = $('#dPriceBox');
    box.classList.toggle('is-off', !o.price);
    if (o.price) {
      $('#dPriceK').textContent = o.priceK || 'Harga';
      rewrite($('#dPrice'), o.price, .55, .12);
      $('#dWas').textContent = o.was || '';
    }
    dAct.classList.toggle('is-off', !o.act);
    if (o.act) {
      $('#dActT').textContent = o.act.t;
      $('use', dAct).setAttribute('href', '#' + (o.act.icon || 'i-plus'));
      dAct.href = o.act.href || '#';
      dAct.target = o.act.href ? '_blank' : '';
      dAct.rel = o.act.href ? 'noopener' : '';
      dActFn = o.act.fn || null;
    }
    requestAnimationFrame(fitDetail);
  }
  dAct.addEventListener('click', function (e) { if (dActFn) { e.preventDefault(); dActFn(); } });
  function fitDetail() {
    detailEl.classList.remove('is-compact');
    var free = innerWidth - (stageInset.l + stageInset.r) - 40;
    if (detailEl.offsetWidth > free) detailEl.classList.add('is-compact');
  }

  /* ======================================================================
     Panggung: apa yang berdiri di tengah
     ====================================================================== */
  var furniture = { kind: 'cubix' };       // furnitur terakhir (cubix atau produk pilihan)
  var stageKind = 'cubix';
  function cubixDetail() {
    var f = fabric(), b = base();
    setDetail({
      name: 'CUBIX Modular', sub: cfg.seats + ' Seater' + (cfg.arms ? '' : ' Armless') + (cfg.ottoman ? ' + Ottoman' : ''),
      cols: [['Dimensi', 'W ' + widthCm() + ' · D ' + S.depth + ' · H ' + S.height + ' cm'], ['Material', f.name + ' · ' + b.name]],
      priceK: 'Estimasi', price: rupiah(price()),
      act: current === 'atelier' ? { t: 'Penawaran', icon: 'i-wa', href: $('#aQuote').href } : { t: 'Rancang', icon: 'i-arrow', fn: function () { go('atelier'); } }
    });
  }
  function productDetail(p) {
    var disc = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
    setDetail({
      name: p.name, sub: p.type,
      cols: [['Kategori', catLabel(p.cat)], ['Garansi', '3 tahun'], ['Kirim', '1–3 hari kerja']],
      priceK: p.price ? (p.from ? 'Mulai' : 'Harga') + (disc ? ' · hemat ' + disc + '%' : '') : 'Harga',
      price: p.price ? rupiah(p.price) : 'Melalui penawaran', was: p.was ? rupiah(p.was) : '',
      act: p.price ? { t: 'Tambah', icon: 'i-plus', fn: function () { addToBag(p, 1); } } : { t: 'Tanya', icon: 'i-wa', href: wa('Halo XIONCO, saya ingin tahu harga ' + p.name + ' (' + p.type + ').') }
    });
  }
  function showFurniture() {
    if (furniture.kind === 'product') showProduct(furniture.p, true);
    else showCubix();
  }
  function showCubix() {
    stageKind = 'cubix'; furniture = { kind: 'cubix' };
    if (XW.ok) XW.showCubix();
    cubixDetail();
  }
  function showProduct(p) {
    if (p.id === 'cubix') { showCubix(); return; }
    stageKind = 'product'; furniture = { kind: 'product', p: p };
    if (XW.ok) XW.showProduct(p, src(p.img, 1024));
    productDetail(p);
  }
  function mapDetail(i) {
    if (i >= 0) {
      var f = XV.FACTORIES[i];
      setDetail({ name: f.place, sub: f.role, cols: [['Tahap', ['I', 'II', 'III', 'IV'][i] + ' dari IV'], ['Proses', f.text]] });
    } else {
      setDetail({ name: 'Pulau Jawa', sub: '4 pabrik · Jepara → Jakarta Selatan', cols: [['Kapasitas', '30+ sofa per hari'], ['Tim', '80+ pekerja & kreatif'], ['Kirim', '1–3 hari kerja']] });
    }
  }

  /* ======================================================================
     Panel kanan & navigasi (tanpa pindah halaman)
     ====================================================================== */
  var panel = $('#panel'), current = 'home', booted = false;
  var stageInset = { l: 0, r: 0 };
  function parseHash() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; return ROUTES.indexOf(h) >= 0 ? h : 'home'; }
  function go(id) {
    if (ROUTES.indexOf(id) < 0) return;
    var h = id === 'home' ? '#/' : '#/' + id;
    if (location.hash !== h && !(id === 'home' && (location.hash === '' || location.hash === '#'))) location.hash = h;
    else open(id);
  }
  window.addEventListener('hashchange', function () { if (booted) open(parseHash()); });
  function insets() {
    var on = current !== 'home';
    if (isMobile()) {
      stageInset = { l: 0, r: 0 };
      if (XW.ok) XW.setInsets(0, 0, on ? panel.offsetHeight + 76 + 74 : 150, on ? 64 : 230);
      detailEl.style.setProperty('--cx', '0px');
      return;
    }
    var l = 100, r = on ? panel.offsetWidth + 28 + 24 : descEl.offsetWidth + 28 + 24;
    stageInset = { l: l, r: r };
    if (XW.ok) XW.setInsets(l, r, 110, 84);
    detailEl.style.setProperty('--cx', ((l - r) / 2) + 'px');
    requestAnimationFrame(fitDetail);
  }
  function open(id) {
    var prev = current;
    current = id;
    html.classList.toggle('is-panel', id !== 'home');
    $$('.rail__item').forEach(function (a) { a.classList.toggle('is-on', a.dataset.key === id); });
    $('#bagBtn').classList.toggle('is-on', id === 'tas');
    setDesc(id);
    document.title = id === 'home' ? 'Maison XIONCO — Quality shouldn\'t be a luxury' : SECTIONS[id].t + ' — Maison XIONCO';
    // panel
    if (id === 'home') { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); }
    else {
      panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
      $$('.pane', panel).forEach(function (p) { p.classList.toggle('is-on', p.dataset.pane === id); });
      var pane = $('.pane[data-pane="' + id + '"]', panel);
      if (ANIM && pane) G.fromTo($$('.pane__scroll:not(.pd) > *', pane).slice(0, 8), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .04, delay: prev === 'home' ? .35 : .2, clearProps: 'transform' });
    }
    // panggung
    if (id === 'atelier') { showCubix(); if (XW.ok) XW.setMood(cfg.mood); }
    else if (id === 'manufaktur') { stageKind = 'map'; if (XW.ok) { XW.showMap(); XW.setMood('senja'); } mapDetail(-1); }
    else if (id === 'galeri') { showArt(galSel); if (XW.ok) XW.setMood('senja'); }
    else {
      if (stageKind === 'map' || stageKind === 'art') showFurniture();
      else if (stageKind === 'cubix') cubixDetail();
      if (XW.ok && prev !== id) XW.setMood('senja');
    }
    if (XW.ok) XW.setRoom(id);
    if (enter[id]) enter[id](prev);
    if (prev !== id && leave[prev]) leave[prev](id);
    insets();
  }
  var enter = {}, leave = {};
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (!g) return;
    e.preventDefault();
    var id = g.dataset.go;
    if (id === current && id !== 'home') id = 'home';    // klik lagi = tutup panel
    go(id);
  });
  window.addEventListener('resize', function () { insets(); });

  /* ======================================================================
     KOLEKSI
     ====================================================================== */
  var ID_CAT = { seats: 'kursi sofa tempat duduk', tables: 'meja', bedframe: 'ranjang kasur tempat tidur dipan', cabinet: 'lemari kabinet rak penyimpanan', decor: 'lampu dekorasi cahaya', smart: 'listrik stopkontak saklar colokan pintar' };
  var ID_TYPE = [[/chair/, 'kursi'], [/desk|workstation/, 'meja kerja kantor'], [/coffee table/, 'meja kopi meja tamu'], [/dining/, 'makan'], [/side table|nightstand/, 'meja samping nakas'], [/light/, 'lampu'], [/shelf/, 'rak'], [/wardrobe/, 'lemari pakaian'], [/kitchenette/, 'dapur kitchen set'], [/towel/, 'handuk kamar mandi'], [/slat|panel/, 'panel dinding'], [/bed/, 'ranjang tempat tidur'], [/socket|outlet|switch/, 'stopkontak saklar']];
  XV.PRODUCTS.forEach(function (p) {
    var t = p.type.toLowerCase();
    p._q = [p.name, t, p.cat, catLabel(p.cat), ID_CAT[p.cat] || ''].concat(ID_TYPE.filter(function (r) { return r[0].test(t); }).map(function (r) { return r[1]; })).join(' ').toLowerCase();
  });
  var kCat = 'all', kList = [], kI = -1, kQty = 1, kReady = false;
  var grid = $('#kGrid'), kSearch = $('#kSearch'), pd = $('#pd');
  var CATS = [{ id: 'all', label: 'Semua' }].concat(XV.CATEGORIES.map(function (c) { return { id: c.id, label: c.label.replace(' & Light', '') }; }));
  $('#kCats').innerHTML = CATS.map(function (c) { return '<button type="button" data-cat="' + c.id + '">' + c.label + '</button>'; }).join('');
  function renderGrid() {
    var q = kSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    kList = XV.PRODUCTS.filter(function (p) { return (kCat === 'all' || p.cat === kCat) && q.every(function (w) { return p._q.indexOf(w) >= 0; }); });
    var selId = furniture.kind === 'product' ? furniture.p.id : furniture.kind === 'cubix' ? 'cubix' : null;
    grid.innerHTML = kList.map(function (p, i) {
      return '<button class="tile' + (p.id === selId ? ' is-on' : '') + '" type="button" data-i="' + i + '" data-cursor="Tampilkan">' +
        '<span class="tile__img"><img class="' + photoCls(p) + '" src="' + src(p.img, 768) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async"></span>' +
        '<span class="tile__n">' + esc(p.name) + '</span><span class="tile__p">' + priceText(p) + (p.was ? '<s>' + rupiah(p.was) + '</s>' : '') + '</span></button>';
    }).join('');
    $('#kEmpty').classList.toggle('is-on', !kList.length);
    $('#kCount').textContent = kList.length;
    $$('#kCats button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.cat === kCat); });
  }
  $('#kCats').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; kCat = b.dataset.cat; renderGrid(); });
  var sT = 0;
  kSearch.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(renderGrid, 120); });
  grid.addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) pick(+t.dataset.i); });
  function pick(i) {
    kI = (i + kList.length) % kList.length;
    var p = kList[kI];
    showProduct(p);
    $$('.tile', grid).forEach(function (t, k) { t.classList.toggle('is-on', k === kI); });
    fillPd(p);
    pd.classList.add('is-on'); pd.setAttribute('aria-hidden', 'false'); pd.scrollTop = 0;
  }
  function fillPd(p) {
    var disc = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
    $('#pdCat').textContent = catLabel(p.cat);
    $('#pdName').textContent = p.name;
    $('#pdType').textContent = p.type;
    $('#pdPrice').innerHTML = p.price ? '<b>' + priceText(p) + '</b>' + (p.was ? '<s>' + rupiah(p.was) + '</s><em>Hemat ' + disc + '%</em>' : '') : '<b>Melalui penawaran</b>';
    $('#pdDesc').textContent = p.desc || '';
    $('#pdSpec').innerHTML = '<dt>Garansi</dt><dd>3 tahun</dd><dt>Pengiriman</dt><dd>1–3 hari kerja</dd><dt>Harga</dt><dd>' + (p.price ? 'Resmi xionco.shop' : 'Melalui penawaran') + '</dd>';
    $('#pdBuy').style.display = p.price ? '' : 'none';
    kQty = 1; $('#pdQty').textContent = 1;
    $('#pdWa').href = wa('Halo XIONCO, saya ingin tahu ' + (p.price ? 'lebih lanjut tentang ' : 'harga ') + p.name + ' (' + p.type + ').');
    $('#pdWaText').textContent = p.price ? 'Tanya via WhatsApp' : 'Tanya harga via WhatsApp';
    $('#pdLink').href = p.url;
    $('#pdN').textContent = (kI + 1) + ' / ' + kList.length;
    if (p.id === 'cubix') { $('#pdSpec').innerHTML += '<dt>Atelier</dt><dd><a href="#/atelier" data-go="atelier">Rancang komposisi Anda →</a></dd>'; }
    if (ANIM) G.fromTo($$('#pd > *').slice(1, 6), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .04, clearProps: 'transform' });
  }
  function closePd() { pd.classList.remove('is-on'); pd.setAttribute('aria-hidden', 'true'); }
  $('#pdBack').addEventListener('click', closePd);
  $('#pdPrev').addEventListener('click', function () { pick(kI - 1); });
  $('#pdNext').addEventListener('click', function () { pick(kI + 1); });
  $('#pdMinus').addEventListener('click', function () { kQty = Math.max(1, kQty - 1); $('#pdQty').textContent = kQty; });
  $('#pdPlus').addEventListener('click', function () { kQty = Math.min(20, kQty + 1); $('#pdQty').textContent = kQty; });
  $('#pdAdd').addEventListener('click', function () { addToBag(kList[kI], kQty); });
  enter.koleksi = function () { if (!kReady) { kReady = true; renderGrid(); } };
  leave.koleksi = function () { closePd(); };

  /* ======================================================================
     TAS
     ====================================================================== */
  var bag = store.get('xv4_bag', {});
  Object.keys(bag).forEach(function (id) { if (!byId[id] || !byId[id].price) delete bag[id]; });
  function bagCount() { return Object.keys(bag).reduce(function (n, id) { return n + bag[id]; }, 0); }
  function bagTotal() { return Object.keys(bag).reduce(function (n, id) { return n + byId[id].price * bag[id]; }, 0); }
  function renderBag() {
    var ids = Object.keys(bag), n = bagCount();
    $('#bagCount').textContent = n; $('#bagItems').textContent = n;
    $('#bagEmpty').classList.toggle('is-on', !ids.length);
    $('#bagFoot').classList.toggle('is-off', !ids.length);
    $('#bagList').innerHTML = ids.map(function (id) {
      var p = byId[id];
      return '<li data-id="' + id + '"><div class="bag__th"><img class="' + photoCls(p) + '" src="' + src(p.img, 768) + '" alt=""></div><div><p class="bag__n">' + esc(p.name) + '</p><p class="bag__p">' + rupiah(p.price) + '</p>' +
        '<div class="bag__q"><button type="button" data-d="-1" aria-label="Kurangi"><svg><use href="#i-minus"/></svg></button><span>' + bag[id] + '</span><button type="button" data-d="1" aria-label="Tambah"><svg><use href="#i-plus"/></svg></button></div></div>' +
        '<button class="bag__rm" type="button" data-rm>Hapus</button></li>';
    }).join('');
    $('#bagTotal').textContent = rupiah(bagTotal());
    var lines = ids.map(function (id) { var p = byId[id]; return '• ' + p.name + ' (' + p.type + ') × ' + bag[id] + ' — ' + rupiah(p.price * bag[id]); });
    $('#bagCheckout').href = wa('Halo XIONCO, saya ingin memesan:\n' + lines.join('\n') + '\n\nSubtotal: ' + rupiah(bagTotal()) + '\n(dari Maison XIONCO)');
    store.set('xv4_bag', bag);
  }
  $('#bagList').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var id = li.dataset.id, d = e.target.closest('[data-d]');
    if (d) { bag[id] = clamp(bag[id] + (+d.dataset.d), 0, 99); if (!bag[id]) delete bag[id]; renderBag(); }
    else if (e.target.closest('[data-rm]')) { delete bag[id]; renderBag(); }
  });
  function addToBag(p, q) {
    if (!p || !p.price) return;
    bag[p.id] = clamp((bag[p.id] || 0) + (q || 1), 1, 99);
    renderBag();
    var b = $('#bagBtn'); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
    notice(p.name + ' × ' + (q || 1) + ' ditambahkan ke tas');
  }
  renderBag();

  /* ======================================================================
     ATELIER
     ====================================================================== */
  var S = XV.STUDIO;
  var DEF = { seats: 3, arms: true, ottoman: false, fabric: 'fb03', base: 'walnut', mood: 'senja' };
  var cfg = Object.assign({}, DEF, store.get('xv4_atelier', {}));
  var priceObj = { v: 0 };
  $('#aFabrics').innerHTML = S.fabrics.map(function (f) { return '<button class="swatch" type="button" data-fabric="' + f.id + '" data-type="' + f.type + '" style="--c:' + f.color + '" aria-label="' + f.code + ' ' + f.name + '" data-cursor="' + f.name + '"></button>'; }).join('');
  $('#aBases').innerHTML = S.bases.map(function (b) { return '<button type="button" data-base="' + b.id + '" style="--c:' + b.color + '"><i></i>' + b.name + '</button>'; }).join('');
  function fabric() { return S.fabrics.filter(function (f) { return f.id === cfg.fabric; })[0] || S.fabrics[0]; }
  function base() { return S.bases.filter(function (b) { return b.id === cfg.base; })[0] || S.bases[0]; }
  function widthCm() { return cfg.seats * S.seatW + (cfg.arms ? 2 * S.armW : 0); }
  function price() {
    var p = cfg.seats * S.seatPrice + (cfg.arms ? S.armPrice : 0) + (cfg.ottoman ? S.ottomanPrice : 0);
    if (fabric().type === 'leather') p *= S.leatherFactor;
    return p + base().add;
  }
  function atelierUpdate(animate) {
    if (XW.ok) XW.craft({ seats: cfg.seats, arms: cfg.arms, ottoman: cfg.ottoman, fabric: cfg.fabric, base: cfg.base }, animate);
    $$('#aSeats button').forEach(function (b) { b.classList.toggle('is-on', +b.dataset.seats === cfg.seats); });
    $('#aArms').setAttribute('aria-pressed', String(cfg.arms));
    $('#aOtt').setAttribute('aria-pressed', String(cfg.ottoman));
    $$('#aFabrics .swatch').forEach(function (b) { b.classList.toggle('is-on', b.dataset.fabric === cfg.fabric); });
    $$('#aBases button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.base === cfg.base); });
    $$('#aMood button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.mood === cfg.mood); });
    var f = fabric(), b = base();
    $('#aFabricName').textContent = f.code + ' · ' + f.name;
    $('#aDims').textContent = 'W ' + widthCm() + ' · D ' + S.depth + ' · H ' + S.height + ' cm';
    var target = price();
    if (ANIM && animate) G.to(priceObj, { v: target, duration: 1, ease: 'power3.out', onUpdate: function () { $('#aPrice').textContent = rupiah(priceObj.v); } });
    else { priceObj.v = target; $('#aPrice').textContent = rupiah(target); }
    $('#aQuote').href = wa('Halo XIONCO, saya ingin penawaran CUBIX Modular (dirancang di Maison XIONCO):\n• Komposisi: ' + cfg.seats + ' seater' + (cfg.arms ? ' dengan lengan' : ' tanpa lengan') +
      '\n• Ottoman: ' + (cfg.ottoman ? 'ya' : 'tidak') + '\n• Material: ' + f.code + ' ' + f.name + '\n• Base: ' + b.name +
      '\n• Ukuran: W ' + widthCm() + ' × D ' + S.depth + ' × H ' + S.height + ' cm\n• Estimasi di website: ' + rupiah(target));
    if (stageKind === 'cubix') cubixDetail();
    store.set('xv4_atelier', cfg);
  }
  function setCfg(patch) {
    if (!Object.keys(patch).some(function (k) { return cfg[k] !== patch[k]; })) return;
    Object.assign(cfg, patch);
    if (patch.mood && XW.ok) XW.setMood(cfg.mood);
    if (stageKind !== 'cubix') showCubix();
    atelierUpdate(true);
  }
  $('#aSeats').addEventListener('click', function (e) { var b = e.target.closest('[data-seats]'); if (b) setCfg({ seats: +b.dataset.seats }); });
  $('#aArms').addEventListener('click', function () { setCfg({ arms: !cfg.arms }); });
  $('#aOtt').addEventListener('click', function () { setCfg({ ottoman: !cfg.ottoman }); });
  $('#aFabrics').addEventListener('click', function (e) { var b = e.target.closest('[data-fabric]'); if (b) setCfg({ fabric: b.dataset.fabric }); });
  $('#aBases').addEventListener('click', function (e) { var b = e.target.closest('[data-base]'); if (b) setCfg({ base: b.dataset.base }); });
  $('#aMood').addEventListener('click', function (e) { var b = e.target.closest('[data-mood]'); if (b) setCfg({ mood: b.dataset.mood }); });
  var pickOne = function (a) { return a[(Math.random() * a.length) | 0]; };
  $('#aRandom').addEventListener('click', function () { setCfg({ seats: 1 + ((Math.random() * 4) | 0), arms: Math.random() > .25, ottoman: Math.random() > .5, fabric: pickOne(S.fabrics).id, base: pickOne(S.bases).id }); });
  $('#aReset').addEventListener('click', function () { setCfg(Object.assign({}, DEF)); });
  var dimEl = $('#dim');
  leave.atelier = function () { dimEl.classList.remove('is-on'); };
  atelierUpdate(false);

  /* ======================================================================
     MANUFAKTUR
     ====================================================================== */
  var stagesEl = $('#stages'), stageSel = -1, ROMAN = ['I', 'II', 'III', 'IV'];
  stagesEl.innerHTML = XV.FACTORIES.map(function (f, i) {
    return '<li><button type="button" data-st="' + i + '"><span class="st__n">' + ROMAN[i] + '</span><span class="st__p">' + esc(f.place) + '</span><span class="st__r">' + esc(f.role) + '</span><span class="st__t">' + esc(f.text) + '</span></button></li>';
  }).join('');
  $('#mLabels').innerHTML = XV.FACTORIES.map(function (f, i) { return '<span class="mlabel" data-ml="' + i + '"><b>' + esc(f.place) + '</b><span>' + esc(f.role) + '</span></span>'; }).join('');
  var mls = $$('.mlabel');
  function setStage(i) {
    stageSel = i;
    $$('li', stagesEl).forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
    mls.forEach(function (m, k) { m.classList.toggle('is-on', k === i); m.classList.toggle('is-dim', i >= 0 && k !== i); });
    if (!XW.ok) return;
    mapDetail(i);
    if (i >= 0) XW.mapFocus(i); else XW.mapOverview();
  }
  stagesEl.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (b) setStage(+b.dataset.st === stageSel ? -1 : +b.dataset.st); });
  $('#stageAll').addEventListener('click', function () { setStage(-1); });
  function countUp() {
    $$('#figs [data-count]').forEach(function (b) {
      var to = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      if (!ANIM) { b.textContent = pre + to + suf; return; }
      var o = { v: 0 };
      G.to(o, { v: to, duration: 1.6, delay: .5, ease: 'power3.out', onUpdate: function () { b.textContent = pre + Math.round(o.v) + suf; } });
    });
  }
  enter.manufaktur = function () { setStage(-1); countUp(); };
  leave.manufaktur = function () { mls.forEach(function (m) { m.classList.remove('is-vis'); }); };

  /* ======================================================================
     Label & garis ukur dari panggung 3D
     ====================================================================== */
  XW.onFrame = function (L) {
    if (current === 'atelier' && L.dim && L.dim.a.v && L.dim.b.v) {
      var a = L.dim.a, b = L.dim.b, dx = b.x - a.x, dy = b.y - a.y, ang = Math.atan2(dy, dx);
      if (Math.abs(ang) > Math.PI / 2) { ang += Math.PI; a = L.dim.b; }
      dimEl.style.width = Math.sqrt(dx * dx + dy * dy).toFixed(1) + 'px';
      dimEl.style.transform = 'translate(' + a.x.toFixed(1) + 'px,' + (a.y + 20).toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
      $('#dimText').textContent = L.dim.w + ' cm';
      dimEl.classList.add('is-on');
    } else dimEl.classList.remove('is-on');
    if (current === 'manufaktur') {
      mls.forEach(function (m, i) {
        var p = L.beacons && L.beacons[i];
        if (!p || !p.v) { m.classList.remove('is-vis'); return; }
        var anchor = isMobile() ? (i === 0 ? 'translate(calc(-100% - 8px), -100%)' : 'translate(8px, -100%)') : i === 1 ? 'translate(calc(-100% - 12px), -50%)' : i === 3 ? 'translate(14px, 35%)' : 'translate(8px, -100%)';
        if (isMobile() && (i === 2 || i === 3) && stageSel !== i) { m.classList.remove('is-vis'); return; }
        m.classList.add('is-vis');
        m.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) ' + anchor;
      });
    }
  };

  /* ======================================================================
     BISNIS
     ====================================================================== */
  $('#services').innerHTML = XV.SERVICES.map(function (s) {
    return '<li><a href="' + wa('Halo XIONCO, saya tertarik dengan layanan ' + s.title + ' (' + s.note + ') untuk proyek saya.') + '" target="_blank" rel="noopener" data-cursor="Diskusi">' +
      '<span class="svc__n">' + s.n + '</span><span class="svc__t">' + esc(s.title) + '</span><span class="svc__d">' + esc(s.note) + '</span><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></a></li>';
  }).join('');
  $('#clients').textContent = XV.CLIENTS.join(' · ');
  $('#bform').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim(), phone = $('#fPhone').value.replace(/[^\d+]/g, ''), note = $('#bNote');
    $('#fName').parentNode.classList.toggle('is-err', !name);
    $('#fPhone').parentNode.classList.toggle('is-err', phone.length < 8);
    if (!name || phone.length < 8) { note.textContent = 'Mohon lengkapi nama dan nomor WhatsApp yang valid.'; note.classList.add('is-err'); return; }
    note.classList.remove('is-err'); note.textContent = 'Membuka WhatsApp…';
    var msg = 'Halo XIONCO, saya ' + name + ' (' + phone + ').\nJenis proyek: ' + $('#fType').value + '\nNilai proyek: ' + $('#fValue').value + ($('#fNeed').value.trim() ? '\nKebutuhan: ' + $('#fNeed').value.trim() : '');
    window.open(wa(msg), '_blank', 'noopener');
  });

  /* ======================================================================
     GALERI — karya terpilih berdiri di panggung
     ====================================================================== */
  var galSel = 0;
  $('#gal').innerHTML = XV.MUSE.map(function (m, i) {
    return '<button type="button" data-g="' + i + '" data-cursor="Tampilkan"><img src="' + src(m.img, 768) + '" alt="' + esc(m.title) + '" loading="lazy" decoding="async"><span>' + esc(m.title) + '</span><em>' + esc(m.note) + '</em></button>';
  }).join('');
  function showArt(i) {
    galSel = i;
    var m = XV.MUSE[i];
    stageKind = 'art';
    $$('#gal button').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    if (XW.ok) XW.showArt(src(m.img, 1024));
    setDetail({ name: m.title, sub: m.note, cols: [['Karya', String(i + 1).padStart(2, '0') + ' / ' + String(XV.MUSE.length).padStart(2, '0')]], act: { t: 'Diskusikan', icon: 'i-wa', href: wa('Halo XIONCO, saya tertarik dengan proyek seperti "' + m.title + '" (' + m.note + ').') } });
  }
  $('#gal').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) showArt(+b.dataset.g); });

  /* ======================================================================
     Keyboard
     ====================================================================== */
  window.addEventListener('keydown', function (e) {
    if (!booted) return;
    var typing = /^(input|textarea|select)$/i.test(e.target.tagName || '');
    if (e.key === 'Escape') {
      if (typing) { e.target.blur(); return; }
      if (pd.classList.contains('is-on')) { closePd(); return; }
      if (current !== 'home') go('home');
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (current === 'koleksi' && pd.classList.contains('is-on')) {
      if (e.key === 'ArrowRight') { pick(kI + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { pick(kI - 1); e.preventDefault(); }
    }
    if (current === 'galeri') {
      if (e.key === 'ArrowRight') { showArt((galSel + 1) % XV.MUSE.length); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { showArt((galSel - 1 + XV.MUSE.length) % XV.MUSE.length); e.preventDefault(); }
    }
  });

  /* ======================================================================
     Pembuka
     ====================================================================== */
  var gl = false;
  try { gl = XW.init ? XW.init($('#world'), { mobile: isMobile() || !FINE, reduced: REDUCED }) : false; } catch (err) { gl = false; }
  if (!gl || !XW.ok) html.classList.add('no-webgl');
  XW.onLost = function () { html.classList.add('no-webgl'); };
  if (XW.ok) atelierUpdate(false);
  cubixDetail();
  function preload(list, cb) {
    var n = 0;
    return Promise.all(list.map(function (u) { return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = function () { n++; cb(n / list.length); res(); }; im.src = u; }); }));
  }
  function warm() {
    // siapkan potongan foto beberapa karya populer agar pergantian di panggung instan
    if (XW.cutout) XV.PRODUCTS.slice(0, 6).forEach(function (p) { if (p.id !== 'cubix') XW.cutout(src(p.img, 1024)); });
    XV.MUSE.forEach(function (m) { var im = new Image(); im.src = src(m.img, 768); });
  }
  function start() {
    booted = true;
    open(parseHash());
    setTimeout(warm, 1800);
  }
  (function veil() {
    if (!ANIM) { html.classList.add('is-ready'); start(); return; }
    var stroke = $('.veil__stroke'), fill = $('.veil__fill'), len = 2000;
    try { len = stroke.getTotalLength(); } catch (e) {}
    G.set(stroke, { strokeDasharray: len, strokeDashoffset: len });
    G.to(stroke, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' });
    var prog = { v: 0, t: 0 }, line = $('#veilLine');
    var tick = function () { prog.v = lerp(prog.v, prog.t, .07); line.style.width = (prog.v * 100).toFixed(1) + '%'; };
    G.ticker.add(tick);
    var list = XV.PRODUCTS.slice(0, 6).map(function (p) { return src(p.img, 768); });
    var minT = new Promise(function (r) { setTimeout(r, 2100); }), maxT = new Promise(function (r) { setTimeout(r, 6000); });
    Promise.race([Promise.all([preload(list, function (p) { prog.t = p * .95; }), minT]), maxT]).then(function () {
      prog.t = 1;
      G.timeline({ delay: .25, onComplete: function () { G.ticker.remove(tick); html.classList.add('is-ready'); } })
        .to(fill, { opacity: 1, duration: .7, ease: 'power2.out' })
        .add(start, '+=.2')
        .to('#veil', { opacity: 0, duration: 1.1, ease: 'power2.inOut' })
        .from(['.top', '.rail', '.desc', '.detail'], { opacity: 0, duration: 1.2, ease: 'power2.out', stagger: .08, clearProps: 'opacity' }, '-=.6');
    });
  })();
})();
