/* ==========================================================================
   Maison XIONCO — interaksi (satu layar, tanpa pindah halaman)
   • Navigator kiri (gaya versi 1). Menyorot menu → kotak deskripsi berubah.
   • Memilih menu → panel kanan bergeser masuk; panggung tengah tetap.
   • Memilih karya di Koleksi / Galeri → objek di tengah panggung berganti.
   • Halaman produk: varian xionco.shop, Beli langsung, Tas, Custom.
   • Semua pembelian berakhir di panel Pembayaran (gateway: js/pay.js).
   • Mengetuk objek di panggung → panel kanan kembali ke halamannya.
   • Pengaturan (bahasa, tema) & Profil di kanan atas.
   Hash (#/koleksi dst.) hanya untuk tautan langsung; layar tidak berganti.
   ========================================================================== */
// mulai setelah database (shared/db.js) selesai dimuat — katalog bisa datang dari folder data/
(function (run) { if (window.XVDB && XVDB.ready) XVDB.ready.then(run, run); else run(); })(function () {
  'use strict';

  var XV = window.XV, G = window.gsap, XW = window.XW || {}, I18N = window.XI18N;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var html = document.documentElement;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ANIM = !!G && !REDUCED;
  var isMobile = function () { return innerWidth <= 760; };
  var T = function (s, v) { return I18N ? I18N.T(s, v) : String(s == null ? '' : s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  var rupiah = function (n) { return 'IDR ' + Math.round(n).toLocaleString('id-ID'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var src = function (p, w) {
    if (!p) return '';
    if (/^(https?:|data:|blob:)/.test(p)) return p;
    if (p.indexOf('assets/') === 0) return '../../' + p;  // aset lokal (folder assets/ di root)
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
  var photoCls = function (p) { return (XV.V3_DARK || []).indexOf(p.id) >= 0 ? 'is-photo' : ''; };
  var catLabel = function (id) { var c = XV.CATEGORIES.filter(function (x) { return x.id === id; })[0]; return T(c ? c.label : id); };
  var dateText = function (t) { try { return new Date(t).toLocaleDateString(I18N && I18N.lang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };

  /* ======================================================================
     Varian (xionco.shop): varian = warna / material, sub = ukuran / opsi.
     Setiap varian & sub punya harga, harga coret, dan foto sendiri.
     ====================================================================== */
  var vsel = {};                                   // pilihan varian per produk { v, s, touched }
  var subDef = function (v) { if (!v || !v.subs || !v.subs.length) return -1; for (var i = 0; i < v.subs.length; i++) if (v.subs[i].on) return i; return 0; };
  function selOf(p) {
    var s = vsel[p.id];
    if (!s) { var v = p.variants && p.variants.length ? Math.max(0, p.variant || 0) : -1; s = vsel[p.id] = { v: v, s: v >= 0 ? subDef(p.variants[v]) : -1, touched: false }; }
    return s;
  }
  function cur(p, s) {
    s = s || selOf(p);
    var v = (p.variants || [])[s.v] || null, sb = v && v.subs && v.subs[s.s] || null;
    var price = (sb && sb.price) || (v && v.price) || p.price, was = (sb && sb.was) || (v && v.was) || p.was;
    if (was && price && was <= price) was = null;
    return {
      v: v, sub: sb, price: price, was: was,
      img: (sb && sb.img) || (v && v.img) || p.img, hex: (sb && sb.hex) || (v && v.hex) || null,
      label: v ? [v.group ? T(v.group) : '', v.label].filter(Boolean).join(' · ') + (sb ? ' · ' + sb.label : '') : ''
    };
  }
  var priceText = function (p, c) { var pr = c ? c.price : p.price; return pr ? (p.from ? T('mulai') + ' ' : '') + rupiah(pr) : T('Melalui penawaran'); };

  /* thumbnail: foto produk dipotong latarnya (cutout.js) agar menyatu dengan kotak.
     Bila gagal (gambar tidak bisa dibaca), tampil di atas "piring" ivory. */
  function thumbImg(p, u) {
    u = u || src(p.img, 768);
    if (photoCls(p)) return '<img class="is-photo is-ready" src="' + esc(u) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">';
    return '<img data-cut="' + esc(u) + '" alt="' + esc(p.name) + '">';
  }
  var cutQ = [], cutActive = 0;
  var cutIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { cutIO.unobserve(en.target); cutQ.push(en.target); pumpCut(); } });
  }, { rootMargin: '240px' }) : null;
  function cutThumbs(rootEl) {
    $$('img[data-cut]', rootEl).forEach(function (im) {
      if (im.dataset.cutting) return;
      im.dataset.cutting = '1';
      if (cutIO) cutIO.observe(im); else { cutQ.push(im); pumpCut(); }
    });
  }
  function pumpCut() {
    while (cutActive < 3 && cutQ.length) {
      var im = cutQ.shift(); cutActive++;
      (function (im) {
        var u = im.dataset.cut, done = function () { cutActive--; pumpCut(); };
        var show = function () { im.classList.add('is-ready'); };
        // gagal dibaca → di atas "piring"; latar studio rumit → foto apa adanya (cover)
        var plain = function (e) { if (e && e.message === 'complex') im.classList.add('is-photo'); else if (im.parentNode) im.parentNode.classList.add('is-plate'); im.onload = show; im.src = u; done(); };
        if (!window.XCUT) return plain();
        XCUT.url(u, im.dataset.max ? +im.dataset.max : 360).then(function (obj) { im.onload = show; im.src = obj; done(); }, plain);
      })(im);
    }
  }
  if (ANIM) html.classList.add('anim');

  $$('.logo-path').forEach(function (p) { p.setAttribute('d', XV.LOGO); });
  function setWaLinks() { $$('[data-wa]').forEach(function (a) { a.href = wa(T(a.dataset.wa)); }); }
  setWaLinks();

  /* ======================================================================
     Isi kotak deskripsi per menu
     ====================================================================== */
  var SECTIONS = {};
  function buildSections() {
    var n = XV.PRODUCTS.length;
    SECTIONS = {
      home: { n: 'Maison XIONCO', t: 'Quality shouldn\'t be a luxury', p: T('Furnitur minimalis dengan pengerjaan tanpa kompromi — dirancang dan diproduksi sendiri di empat pabrik kami di Jawa.'), m: T('{n} karya · 4 pabrik · garansi 3 tahun', { n: n }) },
      koleksi: { n: T('01 — Koleksi'), t: T('Koleksi'), p: T('Sofa, meja, tempat tidur, kabinet, lampu, hingga kelistrikan VAZRA. Pilih satu karya — ia akan tampil di panggung.'), m: T('{n} karya · harga & varian xionco.shop', { n: n }) },
      customize: { n: T('02 — Customize'), t: 'Customize', p: T('Rancang furnitur sesuai ruang Anda — kursi, sofa, meja, kabinet, hingga divan. Bentuk, ukuran, material, dan detail langsung terlihat dalam 3D.'), m: T('4 kategori · 18 jenis · estimasi langsung') },
      manufaktur: { n: T('03 — Manufaktur'), t: T('Manufaktur'), p: T('Empat pabrik di Jawa — dari pengolahan kayu di Jepara hingga pengemasan di Jakarta Selatan.'), m: T('30+ sofa per hari · 80+ pekerja') },
      bisnis: { n: T('04 — Bisnis'), t: 'For Business', p: T('Space plan, produk dalam jumlah besar, interior, dan built-in untuk kantor, hotel, dan retail. Penawaran dalam 1 jam.'), m: T('Cicilan 0% · garansi 3 tahun') },
      galeri: { n: T('05 — Galeri'), t: T('Galeri'), p: T('Proyek dan inspirasi: solusi kelistrikan ruang rapat, pencahayaan, plafon custom, hingga detail material.'), m: T('{n} karya terpilih', { n: XV.MUSE.length }) },
      kontak: { n: T('06 — Kontak'), t: T('Kontak'), p: T('Showroom di Jl. Ciputat Raya No. 8, Jakarta Selatan. Konsultasi privat tanpa biaya melalui WhatsApp.'), m: '+62 822-4040-8055' },
      tas: { n: T('Tas belanja'), t: T('Tas Anda'), p: T('Karya yang Anda pilih. Lanjutkan ke pembayaran kapan saja.'), m: T('Harga mengikuti xionco.shop') },
      bayar: { n: T('Pembayaran'), t: T('Pembayaran'), p: T('Periksa pesanan, isi data pengiriman, lalu pilih metode pembayaran.'), m: T('Transaksi aman') },
      setelan: { n: T('Pengaturan'), t: T('Pengaturan'), p: T('Bahasa dan tema tampilan. Tersimpan di perangkat ini.'), m: 'Maison XIONCO' },
      profil: { n: T('Profil'), t: T('Akun Anda'), p: T('Pesanan dan permintaan custom Anda di perangkat ini.'), m: 'Maison XIONCO' }
    };
  }
  buildSections();
  var ROUTES = ['home', 'koleksi', 'customize', 'manufaktur', 'bisnis', 'galeri', 'kontak', 'tas', 'bayar', 'setelan', 'profil'];
  var ALIAS = { atelier: 'customize', custom: 'customize' };   // tautan lama tetap berfungsi

  /* ======================================================================
     Kursor — satu bentuk yang rapi, tanpa teks.
     • titik champagne kecil
     • di atas tombol/tautan: membesar jadi cincin tipis & menempel ke tengah target
     • di atas objek panggung: cincin; bila bisa diputar, dengan ikon ‹ ›
     • di atas kolom ketik: disembunyikan (kursor teks bawaan)
     ====================================================================== */
  var cur$ = $('#cursor'), curC = $('.cursor__c', cur$);
  var mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  var overWorld = false;
  if (FINE) {
    html.classList.add('has-cursor');
    var cx = mouse.x, cy = mouse.y, target = null;
    (function loop() {
      var tx = mouse.x, ty = mouse.y;
      if (target && target.isConnected) {
        var r = target.getBoundingClientRect();
        if (r.width < 90 && r.height < 70) { tx = lerp(mouse.x, r.left + r.width / 2, .55); ty = lerp(mouse.y, r.top + r.height / 2, .55); }
      }
      cx = lerp(cx, tx, .3); cy = lerp(cy, ty, .3);
      curC.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)' + (cur$.classList.contains('is-down') ? ' scale(.82)' : '');
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var el = e.target;
      var native = el.closest && el.closest('input:not([type=checkbox]):not([type=radio]), textarea, select');
      var t = !native && el.closest && el.closest('a, button, label, [data-cursor]');
      overWorld = !t && !native && el.id === 'world';
      target = t || null;
      cur$.classList.toggle('is-native', !!native);
      cur$.classList.toggle('is-hover', !!t);
      cur$.classList.toggle('is-drag', overWorld && XW.canSpin && XW.canSpin());
      if (!overWorld) cur$.classList.remove('is-pick');
    });
    document.addEventListener('pointerdown', function () { cur$.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur$.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cur$.classList.add('is-out'); });
    document.documentElement.addEventListener('mouseenter', function () { cur$.classList.remove('is-out'); });
  }
  XW.onHover = function (k) {
    cur$.classList.toggle('is-pick', !!k && overWorld);
    cur$.classList.toggle('is-drag', overWorld && !!(XW.canSpin && XW.canSpin()));
  };

  var noticeEl = $('#notice'), noticeT = 0;
  function notice(text) {
    noticeEl.textContent = text;
    noticeEl.classList.add('is-on');
    clearTimeout(noticeT);
    noticeT = setTimeout(function () { noticeEl.classList.remove('is-on'); }, 2800);
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
  var detailEl = $('#detail'), dAct = $('#dAct'), dActFn = null, dPriceFn = null, detailSig = '';
  $('#dPriceBox').addEventListener('click', function () { if (dPriceFn) dPriceFn(); });
  function setDetail(o) {
    dPriceFn = o.priceFn || null;
    detailEl.classList.toggle('has-price-fn', !!dPriceFn);
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
      $('#dPriceK').textContent = o.priceK || T('Harga');
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
    var cp = byId['cubix-series-3-seaters-ac-al-ac-kayu-terang'];
    setDetail({
      name: 'CUBIX Modular', sub: '3 Seater · ' + T('Kayu terang'),
      cols: [[T('Dimensi'), 'W 248 · D 86 · H 74 cm'], [T('Material'), 'Fabric Vienna · ' + T('Kayu terang')]],
      priceK: T('Harga'), price: cp && cp.price ? rupiah(cp.price) : '', was: cp && cp.was ? rupiah(cp.was) : '',
      act: { t: 'Customize', icon: 'i-ruler', fn: function () { openCustomize({ id: 'cubix' }); } }
    });
  }
  function productDetail(p) {
    var c = cur(p), disc = c.was && c.price ? Math.round((1 - c.price / c.was) * 100) : 0;
    setDetail({
      name: p.name, sub: p.type,
      cols: [c.label ? [T('Varian'), c.label] : [T('Kategori'), catLabel(p.cat)], p.sold ? [T('Terjual'), String(p.sold)] : [T('Garansi'), T('3 tahun')], [T('Kirim'), T('1–3 hari kerja')]],
      priceK: c.price ? (p.from ? T('Mulai') : T('Harga')) + (disc ? ' · ' + T('hemat') + ' ' + disc + '%' : '') : T('Harga'),
      price: c.price ? rupiah(c.price) : T('Melalui penawaran'), was: c.was ? rupiah(c.was) : '',
      act: c.price ? { t: T('Beli'), icon: 'i-card', fn: function () { buyNow(p, 1); } } : { t: T('Tanya'), icon: 'i-wa', href: wa(T('Halo XIONCO, saya ingin tahu harga {name} ({type}).', { name: p.name, type: p.type })) }
    });
  }
  function showFurniture() {
    if (furniture.kind === 'product') showProduct(furniture.p);
    else if (furniture.kind === 'custom') { stageKind = 'custom'; if (XW.ok) XW.showCustom(cz); czDetail(); }
    else showCubix();
  }
  function showCubix() {
    stageKind = 'cubix'; furniture = { kind: 'cubix' };
    if (XW.ok) XW.showCubix();
    cubixDetail();
  }
  function showProduct(p) {
    if (p.id === 'cubix') { showCubix(); return; }
    var same = furniture.kind === 'product' && furniture.p.id === p.id && (stageKind === 'product');
    stageKind = 'product'; furniture = { kind: 'product', p: p };
    if (XW.ok && !same) stageShow(p);
    productDetail(p);
  }
  // objek di panggung mengikuti varian: model 3D diwarnai, foto berganti ke foto varian
  function stageShow(p) {
    var s = selOf(p), c = cur(p, s), photo = src(s.touched ? c.img : p.img, 1024);
    if (p.model) XW.showModel(p, src(p.model), photo, c.hex);
    else XW.showProduct(p, photo, src(p.img, 1024));
  }
  function mapDetail(i) {
    if (i >= 0) {
      var f = XV.FACTORIES[i];
      setDetail({ name: f.place, sub: T(f.role), cols: [[T('Tahap'), T('{n} dari IV', { n: ['I', 'II', 'III', 'IV'][i] })], [T('Proses'), T(f.text)]] });
    } else {
      setDetail({ name: T('Pulau Jawa'), sub: T('4 pabrik · Jepara → Jakarta Selatan'), cols: [[T('Kapasitas'), T('30+ sofa per hari')], [T('Tim'), T('80+ pekerja & kreatif')], [T('Kirim'), T('1–3 hari kerja')]] });
    }
  }
  function refreshDetail() {
    detailSig = '';
    if (stageKind === 'product' && furniture.p) productDetail(furniture.p);
    else if (stageKind === 'map') mapDetail(stageSel);
    else if (stageKind === 'art') artDetail(galSel);
    else if (stageKind === 'custom') czDetail();
    else cubixDetail();
  }

  /* ======================================================================
     Panel kanan & navigasi (tanpa pindah halaman)
     ====================================================================== */
  var panel = $('#panel'), current = 'home', booted = false;
  var stageInset = { l: 0, r: 0 };
  function parseHash() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; h = ALIAS[h] || h; return ROUTES.indexOf(h) >= 0 ? h : 'home'; }
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
      html.style.setProperty('--cx', '0px');
      return;
    }
    var l = 100, r = on ? panel.offsetWidth + 28 + 24 : descEl.offsetWidth + 28 + 24;
    var pk = $('#czPicker'); if (on && pk && pk.classList.contains('is-on')) r += pk.offsetWidth + 14;
    stageInset = { l: l, r: r };
    if (XW.ok) XW.setInsets(l, r, 110, 84);
    html.style.setProperty('--cx', ((l - r) / 2) + 'px');
    requestAnimationFrame(fitDetail);
  }
  var TOP_PANES = { setelan: '#setBtn', profil: '#userBtn', tas: '#bagBtn', bayar: '#bagBtn' };
  function titleOf(id) { return id === 'home' ? 'Maison XIONCO — Quality shouldn\'t be a luxury' : SECTIONS[id].t + ' — Maison XIONCO'; }
  function open(id) {
    var prev = current;
    current = id;
    html.classList.toggle('is-panel', id !== 'home');
    $$('.rail__item').forEach(function (a) { a.classList.toggle('is-on', a.dataset.key === id); });
    $$('.top__ic, .top__bag').forEach(function (b) { b.classList.toggle('is-on', TOP_PANES[id] === '#' + b.id); });
    setDesc(id);
    document.title = titleOf(id);
    // panel
    if (id === 'home') { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); }
    else {
      panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
      $$('.pane', panel).forEach(function (p) { p.classList.toggle('is-on', p.dataset.pane === id); });
      var pane = $('.pane[data-pane="' + id + '"]', panel);
      if (ANIM && pane && prev !== id) G.fromTo($$('.pane__scroll:not(.pd) > *', pane).slice(0, 8), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .04, delay: prev === 'home' ? .35 : .2, clearProps: 'transform' });
    }
    // panggung
    if (id === 'customize') { /* panggung diatur enter.customize → czStage */ }
    else if (id === 'manufaktur') { stageKind = 'map'; if (XW.ok) XW.showMap(); mapDetail(-1); }
    else if (id === 'galeri') showArt(galSel);
    else {
      if (stageKind === 'map' || stageKind === 'art') showFurniture();
      else if (stageKind === 'cubix') cubixDetail();
      else if (stageKind === 'custom') czDetail();
    }
    if (XW.ok && prev !== id) XW.setMood(moodNow());
    // model 3D cukup besar → mulai diunduh saat koleksi dibuka, agar tampil seketika saat dipilih
    if (id === 'koleksi' && XW.ok && XW.preloadModel) XV.PRODUCTS.forEach(function (p) { if (p.model) XW.preloadModel(src(p.model)); });
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
     Panggung: ketuk objek → kembali ke halamannya · zoom → tombol recenter
     ====================================================================== */
  XW.onPick = function (kind) {
    if ((kind === 'product' || kind === 'model') && furniture.kind === 'product') openProduct(furniture.p);
    else if (kind === 'custom' && current !== 'customize') go('customize');
    else if (kind === 'cubix' && current !== 'customize') openCustomize({ id: 'cubix' });
    else if (kind === 'art' && current !== 'galeri') go('galeri');
  };
  var recBtn = $('#recenter');
  XW.onView = function (off) { recBtn.classList.toggle('is-on', !!off); };
  recBtn.addEventListener('click', function () { if (XW.recenter) XW.recenter(); });

  /* ======================================================================
     KOLEKSI
     ====================================================================== */
  var ID_CAT = { seats: 'kursi sofa tempat duduk ottoman', tables: 'meja', bedframe: 'ranjang kasur tempat tidur dipan', cabinet: 'lemari kabinet rak penyimpanan', lighting: 'lampu cahaya penerangan', decor: 'dekorasi aksesori cermin bantal', smart: 'listrik stopkontak saklar colokan pintar' };
  var ID_TYPE = [[/chair/, 'kursi'], [/desk|workstation/, 'meja kerja kantor'], [/coffee table/, 'meja kopi meja tamu'], [/dining/, 'makan'], [/side table|nightstand/, 'meja samping nakas'], [/light|lamp/, 'lampu'], [/shelf/, 'rak'], [/wardrobe/, 'lemari pakaian'], [/kitchenette/, 'dapur kitchen set'], [/towel/, 'handuk kamar mandi'], [/slat|panel/, 'panel dinding'], [/bed/, 'ranjang tempat tidur'], [/socket|outlet|switch/, 'stopkontak saklar']];
  function indexProducts() {
    XV.PRODUCTS.forEach(function (p) {
      var t = (p.type || '').toLowerCase();
      var vs = (p.variants || []).map(function (v) { return v.label + ' ' + (v.fabric || ''); }).join(' ');
      p._q = [p.name, t, p.cat, catLabel(p.cat), ID_CAT[p.cat] || '', p.shopName || '', vs].concat(ID_TYPE.filter(function (r) { return r[0].test(t); }).map(function (r) { return r[1]; })).join(' ').toLowerCase();
    });
  }
  indexProducts();
  var kCat = 'all', kList = [], kI = -1, kQty = 1, kReady = false;
  var grid = $('#kGrid'), kSearch = $('#kSearch'), pd = $('#pd');
  function renderCats() {
    var cats = [{ id: 'all', label: T('Semua') }].concat(XV.CATEGORIES.map(function (c) { return { id: c.id, label: T(c.label) }; }));
    $('#kCats').innerHTML = cats.map(function (c) { return '<button type="button" data-cat="' + c.id + '">' + esc(c.label) + '</button>'; }).join('');
    $$('#kCats button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.cat === kCat); });
  }
  renderCats();
  function renderGrid() {
    var q = kSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    kList = XV.PRODUCTS.filter(function (p) { return (kCat === 'all' || p.cat === kCat) && q.every(function (w) { return p._q.indexOf(w) >= 0; }); });
    var selId = furniture.kind === 'product' ? furniture.p.id : furniture.kind === 'cubix' ? 'cubix' : null;
    grid.innerHTML = kList.map(function (p, i) {
      var dots = (p.variants || []).filter(function (v) { return v.hex; }).slice(0, 6).map(function (v) { return '<i style="--c:' + v.hex + '"></i>'; }).join('');
      return '<button class="tile' + (p.id === selId ? ' is-on' : '') + '" type="button" data-i="' + i + '">' +
        '<span class="tile__img">' + thumbImg(p) + '</span>' +
        '<span class="tile__n">' + esc(p.name) + '</span><span class="tile__t">' + esc(p.type) + '</span>' +
        '<span class="tile__p">' + priceText(p) + (p.was ? '<s>' + rupiah(p.was) + '</s>' : '') + '</span>' +
        (dots ? '<span class="tile__v">' + dots + '</span>' : '') + '</button>';
    }).join('');
    cutThumbs(grid);
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
    fillPd(p, true);
    pd.classList.add('is-on'); pd.setAttribute('aria-hidden', 'false'); pd.scrollTop = 0;
  }
  // buka halaman produk dari mana saja (mis. mengetuk objek di panggung, item di tas)
  function openProduct(p) {
    if (!kReady) { kReady = true; renderGrid(); }
    var i = kList.indexOf(p);
    if (i < 0) { kCat = 'all'; kSearch.value = ''; renderGrid(); i = kList.indexOf(p); }
    if (i < 0) return;
    kI = i;
    if (current !== 'koleksi') go('koleksi');
    if (!(furniture.kind === 'product' && furniture.p === p)) showProduct(p);
    if (!pd.classList.contains('is-on') || $('#pdName').textContent !== p.name) { fillPd(p, true); pd.scrollTop = 0; }
    pd.classList.add('is-on'); pd.setAttribute('aria-hidden', 'false');
    $$('.tile', grid).forEach(function (t, k) { t.classList.toggle('is-on', k === kI); });
  }
  function fillPd(p, anim) {
    var c = cur(p), disc = c.was && c.price ? Math.round((1 - c.price / c.was) * 100) : 0;
    $('#pdCat').textContent = catLabel(p.cat) + (p.sold ? ' · ' + T('{n} terjual', { n: p.sold }) : '');
    $('#pdName').textContent = p.name;
    $('#pdType').textContent = p.type;
    $('#pdPrice').innerHTML = c.price ? '<b>' + priceText(p, c) + '</b>' + (c.was ? '<s>' + rupiah(c.was) + '</s><em>' + T('Hemat') + ' ' + disc + '%</em>' : '') : '<b>' + T('Melalui penawaran') + '</b>';
    renderVariants(p);
    renderPhoto(p, c);
    $('#pdDesc').textContent = p.desc || '';
    var spec = [[T('Garansi'), T('3 tahun')], [T('Pengiriman'), T('1–3 hari kerja')]];
    if (c.v && c.v.fabric) spec.unshift([T('Material'), c.v.fabric]);
    if (p.dims) spec.unshift([T('Dimensi'), p.dims]);
    $('#pdSpec').innerHTML = spec.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') +
      (p.id === 'cubix' ? '<dt>Customize</dt><dd><a href="#/customize" data-go="customize">' + T('Rancang komposisi Anda →') + '</a></dd>' : '');
    var canBuy = !!c.price && p.id !== 'cubix';
    $('#pdBuy').style.display = canBuy ? '' : 'none';
    $('#pdNow').style.display = canBuy ? '' : 'none';
    $('#pdCustom').style.display = p.customizable || p.id === 'cubix' ? '' : 'none';
    kQty = 1; $('#pdQty').textContent = 1;
    $('#pdWa').href = wa(T('Halo XIONCO, saya ingin tahu lebih lanjut tentang {name} ({type}).', { name: p.name, type: p.type + (c.label ? ' · ' + c.label : '') }));
    $('#pdWaText').textContent = c.price ? T('Tanya') : T('Tanya harga');
    $('#pdLink').href = p.url || XV.SHOP;
    $('#pdLink span').textContent = /xionco\.shop/.test(p.url || '') ? T('Lihat di xionco.shop') : T('Detail di xionco.com');
    $('#pdN').textContent = (kI + 1) + ' / ' + kList.length;
    if (ANIM && anim) G.fromTo($$('#pd > *').slice(1, 7), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .04, clearProps: 'transform' });
  }
  function renderVariants(p) {
    var vs = p.variants || [], s = selOf(p), c = cur(p, s);
    var box = $('#pdVar'), sub = $('#pdSub');
    if (!vs.length) { box.innerHTML = ''; sub.innerHTML = ''; box.hidden = sub.hidden = true; return; }
    box.hidden = false;
    var swatch = vs.every(function (v) { return v.hex; });
    box.innerHTML = '<p class="opt__h">' + T(vs[0].group ? 'Warna & material' : 'Varian') + '<span>' + esc(c.v ? [c.v.group ? T(c.v.group) : '', c.v.label].filter(Boolean).join(' · ') : '') + '</span></p>' +
      '<div class="' + (swatch ? 'vsw' : 'vchips') + '">' + vs.map(function (v, i) {
        var lab = [v.group ? T(v.group) : '', v.label].filter(Boolean).join(' · ');
        return swatch
          ? '<button type="button" class="vsw__b' + (i === s.v ? ' is-on' : '') + (/faux|leather/i.test(v.group) ? ' is-leather' : '') + '" data-v="' + i + '" style="--c:' + v.hex + '" aria-label="' + esc(lab) + '" title="' + esc(lab) + '"></button>'
          : '<button type="button" class="' + (i === s.v ? 'is-on' : '') + '" data-v="' + i + '">' + esc(v.label) + '</button>';
      }).join('') + '</div>';
    var subs = c.v && c.v.subs || [];
    sub.hidden = !subs.length;
    sub.innerHTML = subs.length ? '<p class="opt__h">' + T('Ukuran & opsi') + '<span>' + esc(c.sub ? c.sub.label : '') + '</span></p><div class="vchips">' +
      subs.map(function (x, i) { return '<button type="button" class="' + (i === s.s ? 'is-on' : '') + '" data-s="' + i + '">' + esc(x.label) + '</button>'; }).join('') + '</div>' : '';
  }
  // foto varian (seperti galeri xionco.shop) — hanya untuk produk bervarian
  function renderPhoto(p, c) {
    var box = $('#pdPhoto'), u = c.v ? src(c.img, 768) : '';
    box.hidden = !u;
    if (!u) { box.innerHTML = ''; box.dataset.u = ''; return; }
    if (box.dataset.u === u) return;
    box.dataset.u = u;
    box.classList.remove('is-plate');
    box.innerHTML = thumbImg(p, u).replace('<img ', '<img data-max="520" ');
    cutThumbs(box);
  }
  function setVariant(p, patch) {
    var s = selOf(p);
    if (patch.v != null && patch.v !== s.v) { s.v = patch.v; s.s = subDef(p.variants[s.v]); }
    if (patch.s != null) s.s = patch.s;
    s.touched = true;
    fillPd(p, false);
    productDetail(p);
    if (!XW.ok || !(furniture.kind === 'product' && furniture.p === p)) return;
    var c = cur(p, s);
    if (p.model) XW.setTint(c.hex);
    else XW.showProduct(p, src(c.img, 1024), src(p.img, 1024));
  }
  $('#pdVar').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b && kList[kI]) setVariant(kList[kI], { v: +b.dataset.v }); });
  $('#pdSub').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b && kList[kI]) setVariant(kList[kI], { s: +b.dataset.s }); });
  function closePd() { pd.classList.remove('is-on'); pd.setAttribute('aria-hidden', 'true'); }
  $('#pdBack').addEventListener('click', closePd);
  $('#pdPrev').addEventListener('click', function () { pick(kI - 1); });
  $('#pdNext').addEventListener('click', function () { pick(kI + 1); });
  $('#pdMinus').addEventListener('click', function () { kQty = Math.max(1, kQty - 1); $('#pdQty').textContent = kQty; });
  $('#pdPlus').addEventListener('click', function () { kQty = Math.min(20, kQty + 1); $('#pdQty').textContent = kQty; });
  $('#pdAdd').addEventListener('click', function () { addToBag(kList[kI], kQty); });
  $('#pdNow').addEventListener('click', function () { buyNow(kList[kI], kQty); });
  $('#pdCustom').addEventListener('click', function () { openCustomize(kList[kI]); });
  enter.koleksi = function () { if (!kReady) { kReady = true; renderGrid(); } };
  leave.koleksi = function (to) { if (to !== 'customize' && to !== 'bayar') closePd(); };

  /* ======================================================================
     TAS — baris = produk + varian + sub-varian
     ====================================================================== */
  function loadBag() {
    var b = store.get('xv5_bag2', null);
    if (b) return b;
    b = {};
    var old = store.get('xv5_bag', {});
    Object.keys(old).forEach(function (id) { if (typeof old[id] === 'number' && byId[id]) b[id + '|-1|-1'] = { id: id, v: -1, s: -1, q: old[id] }; });
    return b;
  }
  var bag = loadBag();
  function line(e) {
    var p = byId[e.id]; if (!p) return null;
    var c = cur(p, { v: e.v, s: e.s });
    if (!c.price) return null;
    return { key: e.id + '|' + e.v + '|' + e.s, p: p, c: c, q: e.q, total: c.price * e.q, e: e };
  }
  function bagLines() { return Object.keys(bag).map(function (k) { return line(bag[k]); }).filter(Boolean); }
  function cleanBag() { Object.keys(bag).forEach(function (k) { if (!line(bag[k])) delete bag[k]; }); }
  cleanBag();
  function bagCount() { return bagLines().reduce(function (n, l) { return n + l.q; }, 0); }
  function sumOf(lines) { return lines.reduce(function (n, l) { return n + l.total; }, 0); }
  function lineHtml(l, controls) {
    return '<li data-k="' + esc(l.key) + '"><div class="bag__th">' + thumbImg(l.p, src(l.c.img || l.p.img, 768)) + '</div><div><p class="bag__n">' + esc(l.p.name) + '</p>' +
      '<p class="bag__v">' + esc(l.c.label || l.p.type) + '</p><p class="bag__p">' + rupiah(l.c.price) + (controls ? '' : ' × ' + l.q) + '</p>' +
      (controls ? '<div class="bag__q"><button type="button" data-d="-1" aria-label="' + T('Kurangi') + '"><svg><use href="#i-minus"/></svg></button><span>' + l.q + '</span><button type="button" data-d="1" aria-label="' + T('Tambah') + '"><svg><use href="#i-plus"/></svg></button></div>' : '') +
      '</div>' + (controls ? '<button class="bag__rm" type="button" data-rm>' + T('Hapus') + '</button>' : '<b class="bag__t">' + rupiah(l.total) + '</b>') + '</li>';
  }
  function renderBag() {
    var lines = bagLines(), n = bagCount();
    $('#bagCount').textContent = n; $('#bagItems').textContent = n;
    $('#bagEmpty').classList.toggle('is-on', !lines.length);
    $('#bagFoot').classList.toggle('is-off', !lines.length);
    $('#bagList').innerHTML = lines.map(function (l) { return lineHtml(l, true); }).join('');
    cutThumbs($('#bagList'));
    $('#bagTotal').textContent = rupiah(sumOf(lines));
    store.set('xv5_bag2', bag);
  }
  $('#bagList').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var k = li.dataset.k, d = e.target.closest('[data-d]');
    if (!bag[k]) return;
    if (d) { bag[k].q = clamp(bag[k].q + (+d.dataset.d), 0, 99); if (!bag[k].q) delete bag[k]; renderBag(); }
    else if (e.target.closest('[data-rm]')) { delete bag[k]; renderBag(); }
    else if (e.target.closest('.bag__th, .bag__n')) openProduct(byId[bag[k].id]);
  });
  function entryOf(p, q) { var s = selOf(p); return { id: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, q: q || 1 }; }
  function addToBag(p, q) {
    if (!p) return;
    var e = entryOf(p, q), l = line(e);
    if (!l) return;
    var k = l.key;
    if (bag[k]) bag[k].q = clamp(bag[k].q + e.q, 1, 99); else bag[k] = e;
    renderBag();
    var b = $('#bagBtn'); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
    notice(T('{name} × {q} ditambahkan ke tas', { name: p.name, q: e.q }));
  }
  function buyNow(p, q) { if (!p) return; var e = entryOf(p, q); if (line(e)) openPay([e], 'produk'); }
  $('#bagCheckout').addEventListener('click', function () { openPay(Object.keys(bag).map(function (k) { return bag[k]; }), 'tas'); });
  renderBag();

  /* ======================================================================
     PEMBAYARAN — semua tombol pembelian berakhir di sini (gateway: js/pay.js)
     ====================================================================== */
  var payItems = [], payFrom = 'tas', payMethod = null, payBusy = false;
  var XPAY = window.XPAY || { methods: [], pay: function (o) { return Promise.resolve({ status: 'pending', ref: o.id }); } };
  function openPay(items, from) {
    payItems = items.map(function (e) { return Object.assign({}, e); }); payFrom = from;
    $('#payForm').hidden = false; $('#payDone').hidden = true;
    var cst = store.get('xv5_customer', {});
    [['pName', 'name'], ['pPhone', 'phone'], ['pEmail', 'email'], ['pAddr', 'address'], ['pCity', 'city'], ['pZip', 'zip']].forEach(function (f) { if (cst[f[1]] && !$('#' + f[0]).value) $('#' + f[0]).value = cst[f[1]]; });
    renderPay();
    if (current !== 'bayar') go('bayar');
    $('#payScroll').scrollTop = 0;
  }
  function payLines() { return payItems.map(line).filter(Boolean); }
  function renderPay() {
    var lines = payLines(), sub = sumOf(lines);
    $('#payList').innerHTML = lines.map(function (l) { return lineHtml(l, false); }).join('');
    cutThumbs($('#payList'));
    $('#paySub').textContent = rupiah(sub);
    $('#payTotal').textContent = rupiah(sub);
    $('#payShip').textContent = T('Dikonfirmasi tim kami');
    $('#payBack span').textContent = payFrom === 'tas' ? T('Tas') : T('Produk');
    $('#payMethods').innerHTML = (XPAY.methods || []).map(function (m) {
      return '<button type="button" class="' + (m.id === payMethod ? 'is-on' : '') + '" data-m="' + m.id + '"><i></i><span><b>' + esc(T(m.label)) + '</b><em>' + esc(T(m.note || '')) + '</em></span></button>';
    }).join('');
  }
  $('#payMethods').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; payMethod = b.dataset.m; $$('#payMethods button').forEach(function (x) { x.classList.toggle('is-on', x === b); }); $('#payNote').classList.remove('is-err'); });
  $('#payBack').addEventListener('click', function () { if (payFrom === 'tas') go('tas'); else if (kList[kI]) openProduct(kList[kI]); else go('koleksi'); });
  enter.bayar = function () { if (!payLines().length) { if (bagLines().length) openPay(Object.keys(bag).map(function (k) { return bag[k]; }), 'tas'); else go('tas'); } };
  $('#payForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (payBusy) return;
    var v = function (id) { return $('#' + id).value.trim(); };
    var cst = { name: v('pName'), phone: v('pPhone').replace(/[^\d+]/g, ''), email: v('pEmail'), address: v('pAddr'), city: v('pCity'), zip: v('pZip'), note: v('pNote') };
    var bad = { pName: !cst.name, pPhone: cst.phone.length < 8, pAddr: !cst.address, pCity: !cst.city };
    Object.keys(bad).forEach(function (id) { $('#' + id).parentNode.classList.toggle('is-err', bad[id]); });
    var note = $('#payNote');
    if (Object.keys(bad).some(function (k) { return bad[k]; })) { note.textContent = T('Mohon lengkapi nama, WhatsApp, alamat, dan kota.'); note.classList.add('is-err'); return; }
    if (!payMethod) { note.textContent = T('Pilih metode pembayaran.'); note.classList.add('is-err'); return; }
    var lines = payLines(); if (!lines.length) return;
    store.set('xv5_customer', cst);
    var order = {
      id: 'XC-' + Date.now().toString(36).toUpperCase(), created: Date.now(),
      items: lines.map(function (l) { return { id: l.p.id, name: l.p.name, variant: l.c.label, qty: l.q, price: l.c.price }; }),
      subtotal: sumOf(lines), total: sumOf(lines), customer: cst, method: payMethod
    };
    payBusy = true; note.classList.remove('is-err'); note.textContent = T('Memproses…');
    Promise.resolve(XPAY.pay(order)).catch(function () { return { status: 'failed' }; }).then(function (res) {
      payBusy = false;
      res = res || {};
      order.status = res.status === 'paid' ? 'paid' : res.status === 'failed' ? 'failed' : 'pending';
      if (order.status === 'failed') { note.textContent = T('Pembayaran gagal. Silakan coba lagi atau pilih metode lain.'); note.classList.add('is-err'); return; }
      var orders = store.get('xv5_orders', []); orders.unshift(order); store.set('xv5_orders', orders.slice(0, 50));
      if (payFrom === 'tas') { lines.forEach(function (l) { delete bag[l.key]; }); renderBag(); }
      note.textContent = T('Pembayaran diproses aman melalui payment gateway resmi.');
      $('#payForm').hidden = true; $('#payDone').hidden = false;
      $('#payDoneT').textContent = order.status === 'paid' ? T('Pembayaran berhasil') : T('Pesanan tersimpan');
      $('#payDoneP').textContent = order.status === 'paid' ? T('Nomor pesanan {id}. Terima kasih — tim kami segera memproses pesanan Anda.', { id: order.id })
        : T('Nomor pesanan {id}. Pembayaran online segera aktif — selesaikan pembayaran dengan konfirmasi melalui WhatsApp.', { id: order.id });
      $('#payDoneWa').href = wa(T('Halo XIONCO, saya ingin menyelesaikan pembayaran pesanan {id}:', { id: order.id }) + '\n' +
        order.items.map(function (i) { return '• ' + i.name + (i.variant ? ' (' + i.variant + ')' : '') + ' × ' + i.qty + ' — ' + rupiah(i.price * i.qty); }).join('\n') +
        '\n\n' + T('Total') + ': ' + rupiah(order.total) + '\n' + T('Metode') + ': ' + T(((XPAY.methods || []).filter(function (m) { return m.id === order.method; })[0] || {}).label || order.method) +
        '\n' + T('Kirim ke') + ': ' + cst.name + ', ' + cst.address + ', ' + cst.city + (cst.zip ? ' ' + cst.zip : ''));
      $('#payScroll').scrollTop = 0;
      renderProfile();
    });
  });

  /* ======================================================================
     CUSTOMIZE — satu halaman gulir: Jenis · Bentuk · Ukuran · Material · Detail · Kirim
     • tab atas menggulir ke bagiannya; tab aktif mengikuti posisi gulir
     • pilihan = kotak (radius), 4 per baris, tinggi seragam, label maks. 15 karakter
     • Box 1: semua pilihan di panel kanan · Box 2 (uji, Developer Settings): panel kanan hanya
       judul + pilihan terpilih; kelompok > 4 pilihan dibuka di kotak kiri
     • harga estimasi → pop-up rincian · Kirim → pop-up tengah untuk data pemesan
     Spesifikasi & estimasi: js/custom-spec.js (XC) · 3D: js/maker.js (XW.showCustom)
     ====================================================================== */
  var XC = window.XC, dimEl = $('#dim');
  var L = function (o) { return !o ? '' : I18N && I18N.lang() === 'en' ? (o.en || o.l) : o.l; };
  var cz = null, czBase = null, czView = 'design', czPick = null;
  try { cz = store.get('xv5_cz', null); if (cz) XC.sub(cz); } catch (e) { cz = null; }
  if (!cz || !cz.cat) cz = XC.defaults('kursi', 'sofa');
  var czSave = function () { store.set('xv5_cz', cz); };
  var cut15 = function (t) { t = String(t); return t.length > 15 ? t.slice(0, 14).replace(/\s+$/, '') + '…' : t; };
  var short = function (n) { var en = I18N && I18N.lang() === 'en'; return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', en ? '.' : ',') + (en ? 'M' : ' jt') : Math.round(n / 1000) + (en ? 'k' : ' rb'); };
  var czVal = function (gr, v) { return gr.unit === 'pcs' ? String(v) : v + ' ' + gr.unit; };
  var czLayout = function () { var s = window.XVDB && XVDB.settings ? XVDB.settings() : {}; return s.czLayout === 'box2' && !isMobile() ? 'box2' : 'box1'; };

  // panggung: rancangan 3D (atau produk asli bila dipilih)
  var czT = 0;
  function czStage() {
    if (current !== 'customize' || !XW.ok) return;
    clearTimeout(czT);
    czT = setTimeout(function () {
      if (czBase && czView === 'product' && byId[czBase.id]) showProduct(byId[czBase.id]);
      else { stageKind = 'custom'; furniture = { kind: 'custom' }; XW.showCustom(cz); }
      czDetail();
    }, 30);
  }
  function czTitle(lang) {
    var Lx = lang === 'id' ? function (o) { return o.l; } : L, sb = XC.sub(cz);
    var g = XC.groups(cz, 'bentuk').filter(function (x) { return x.id === 'shape' || x.id === 'topShape'; })[0], o = g && XC.pick(g, cz);
    return Lx(sb) + (o ? ' · ' + Lx(o) : '');
  }
  function czMat(lang) {
    var Lx = lang === 'id' ? function (o) { return o.l; } : L, gs = XC.groups(cz, 'material');
    for (var i = 0; i < gs.length; i++) if (gs[i].type === 'swatch') { var o = XC.pick(gs[i], cz); if (o) return Lx(o); }
    var f = gs[0] && XC.pick(gs[0], cz); return f ? Lx(f) : '';
  }
  var czDT = 0;
  function czDetail(throttle) {
    if (stageKind !== 'custom' && current !== 'customize') return;
    if (throttle) { if (czDT) return; czDT = setTimeout(function () { czDT = 0; czDetail(); }, 260); return; }
    setDetail({
      name: czTitle(), sub: XC.dimsText(cz), cols: [[T('Material'), czMat()]],
      priceK: T('Estimasi') + ' · ' + T('rincian'), price: rupiah(XC.estimate(cz)), priceFn: czBreakdown,
      act: current !== 'customize' ? { t: 'Customize', icon: 'i-ruler', fn: function () { go('customize'); } } : { t: T('Kirim'), icon: 'i-wa', fn: czSend }
    });
  }

  /* ---------- tampilan */
  function cell(gr, x, on, multi) {
    var full = L(x) + (x.add ? ' (+' + short(x.add) + ')' : '');
    return '<button type="button" class="cz-o' + (on ? ' is-on' : '') + '" data-v="' + x.id + '" title="' + esc(full) + '">' +
      (x.hex ? '<i class="cz-o__c' + (x.vein || x.speck ? ' is-stone' : '') + '" style="--c:' + x.hex + (x.vein ? ';--v:' + x.vein : '') + '"></i>' : multi ? '<i class="cz-o__k"></i>' : '') +
      '<span>' + esc(cut15(x.s || L(x))) + '</span></button>';
  }
  function selText(gr) {
    var v = cz[gr.id];
    if (gr.type === 'range') return czVal(gr, v);
    if (gr.type === 'multi') { var n = (v || []).length; return n ? XC.opts(gr, cz).filter(function (o) { return v.indexOf(o.id) >= 0; }).map(L).join(', ') : T('Tidak ada'); }
    var o = XC.pick(gr, cz); return o ? L(o) : '—';
  }
  function czGroup(gr, box2) {
    var head = function (b) { return '<p class="cz-g__h"><span>' + esc(L(gr)) + '</span><b' + (b ? ' data-out' : '') + '>' + esc(selText(gr)) + '</b></p>'; };
    if (gr.type === 'range') return '<div class="cz-g" data-g="' + gr.id + '">' + head(true) + '<input class="rng" type="range" min="' + gr.min + '" max="' + gr.max + '" step="' + gr.inc + '" value="' + cz[gr.id] + '" data-r="' + gr.id + '" aria-label="' + esc(L(gr)) + '"><p class="rng__ends"><span>' + esc(czVal(gr, gr.min)) + '</span><span>' + esc(czVal(gr, gr.max)) + '</span></p></div>';
    var o = XC.opts(gr, cz), multi = gr.type === 'multi';
    if (box2 && o.length > 4) return '<button type="button" class="cz-row' + (czPick === gr.id ? ' is-on' : '') + '" data-pick="' + gr.id + '"><span>' + esc(L(gr)) + '</span><b>' + esc(selText(gr)) + '</b><svg><use href="#i-arrow"/></svg></button>';
    return '<div class="cz-g" data-g="' + gr.id + '"' + (multi ? ' data-multi' : '') + '>' + head() + '<div class="cz-grid">' +
      o.map(function (x) { return cell(gr, x, multi ? (cz[gr.id] || []).indexOf(x.id) >= 0 : x.id === cz[gr.id], multi); }).join('') + '</div></div>';
  }
  // kelompok "jenis" (kategori & sub) sebagai kelompok pilihan biasa
  function jenisGroups() {
    var cat = XC.CATS.filter(function (c) { return c.id === cz.cat; })[0];
    return [
      { id: '_cat', type: 'chips', l: 'Kategori', en: 'Category', opts: XC.CATS },
      { id: '_sub', type: 'chips', l: 'Jenis', en: 'Type', opts: cat.subs }
    ];
  }
  function groupsOf(step) { return step === 'jenis' ? jenisGroups() : XC.groups(cz, step); }
  function findGroup(id) { var all = jenisGroups().concat(XC.groups(cz)); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }
  // nilai kelompok jenis dibaca dari cz.cat / cz.sub
  var _get = function (gr) { return gr.id === '_cat' ? cz.cat : gr.id === '_sub' ? cz.sub : cz[gr.id]; };
  function czSections(box2) {
    return XC.STEPS.map(function (st, i) {
      var inner;
      if (st.id === 'kirim') {
        inner = '<button type="button" class="cz-est" data-breakdown><span><em>' + T('Estimasi') + '</em><b>' + rupiah(XC.estimate(cz)) + '</b></span><span class="cz-est__go">' + T('Lihat rincian') + '<svg><use href="#i-arrow"/></svg></span></button>' +
          '<button class="btn btn--dark btn--full" type="button" data-send><svg><use href="#i-wa"/></svg><span>' + T('Kirim rancangan') + '</span></button>' +
          '<p class="note">' + T('Angka estimasi — harga final melalui penawaran resmi tim XIONCO.') + '</p>';
      } else {
        var gs = groupsOf(st.id);
        inner = gs.length ? gs.map(function (gr) {
          if (gr.id === '_cat' || gr.id === '_sub') { var save = cz[gr.id]; cz[gr.id] = _get(gr); var h = czGroup(gr, box2); if (save === undefined) delete cz[gr.id]; else cz[gr.id] = save; return h; }
          return czGroup(gr, box2);
        }).join('') : '<p class="note">' + T('Tidak ada pilihan tambahan untuk jenis ini.') + '</p>';
      }
      return '<section class="cz__sec" data-sec="' + st.id + '" id="cz-' + st.id + '"><p class="cz__h"><i>' + (i + 1) + '</i>' + esc(L(st)) + '</p>' + inner + '</section>';
    }).join('');
  }
  function czRender(keepScroll) {
    var sc = $('#czScroll'), top = sc.scrollTop, base = $('#czBase'), box2 = czLayout() === 'box2';
    html.classList.toggle('cz-box2', box2);
    base.hidden = !czBase;
    base.innerHTML = czBase ? '<div class="cz__from"><p class="eyebrow">' + T('Custom dari') + '</p><b>' + esc(czBase.name) + '</b><span>' + esc(czBase.type) + '</span></div>' +
      '<div class="seg seg--sm"><button type="button" data-view="design" class="' + (czView === 'design' ? 'is-on' : '') + '">' + T('Rancangan 3D') + '</button><button type="button" data-view="product" class="' + (czView === 'product' ? 'is-on' : '') + '">' + T('Produk asli') + '</button></div>' +
      '<button class="cz__fresh" type="button" data-czfresh>' + T('Mulai dari nol') + '</button>' : '';
    $('#czTabs').innerHTML = XC.STEPS.map(function (st, i) { return '<button type="button" data-tab="' + st.id + '"><i>' + (i + 1) + '</i><span>' + esc(L(st)) + '</span></button>'; }).join('');
    $('#czBody').innerHTML = czSections(box2);
    sc.scrollTop = keepScroll ? top : 0;
    czSpy();
    if (box2 && czPick && findGroup(czPick) && XC.opts(findGroup(czPick), cz).length > 4) czPickerFill(); else czPickerClose(true);
    czDetail();
  }
  // tab aktif mengikuti gulir
  function czSpy() {
    var sc = $('#czScroll'), y = sc.scrollTop + $('#czTabs').offsetHeight + 40, on = 'jenis';
    $$('.cz__sec', sc).forEach(function (s) { if (s.offsetTop <= y) on = s.dataset.sec; });
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) on = 'kirim';
    $$('#czTabs [data-tab]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === on); });
  }
  $('#czScroll').addEventListener('scroll', function () { if (current === 'customize') czSpy(); }, { passive: true });
  $('#czTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    var sc = $('#czScroll'), sec = $('#cz-' + b.dataset.tab);
    if (sec) sc.scrollTo({ top: sec.offsetTop - $('#czTabs').offsetHeight - 6, behavior: REDUCED ? 'auto' : 'smooth' });
  });

  /* ---------- Box 2: kotak pilihan kiri */
  var picker = $('#czPicker');
  function czPickerFill() {
    var gr = findGroup(czPick); if (!gr) return czPickerClose();
    var multi = gr.type === 'multi', val = _get(gr), sec = XC.STEPS.filter(function (s) { return gr.step ? s.id === gr.step : s.id === 'jenis'; })[0];
    $('#czPickE').textContent = T('Pilih') + (sec ? ' · ' + L(sec) : '');
    $('#czPickT').textContent = L(gr);
    var grid = $('#czPickGrid');
    grid.dataset.g = gr.id; if (multi) grid.setAttribute('data-multi', ''); else grid.removeAttribute('data-multi');
    grid.innerHTML = XC.opts(gr, cz).map(function (x) { return cell(gr, x, multi ? (val || []).indexOf(x.id) >= 0 : x.id === val, multi); }).join('');
    if (!picker.classList.contains('is-on')) { picker.classList.add('is-on'); picker.setAttribute('aria-hidden', 'false'); insets(); }
  }
  function czPickerClose(silent) {
    if (!picker.classList.contains('is-on')) { czPick = silent ? czPick : null; return; }
    picker.classList.remove('is-on'); picker.setAttribute('aria-hidden', 'true');
    if (!silent) { czPick = null; $$('.cz-row').forEach(function (r) { r.classList.remove('is-on'); }); }
    insets();
  }
  picker.addEventListener('click', function (e) {
    if (e.target.closest('[data-pick-close]')) { czPickerClose(); return; }
    var b = e.target.closest('[data-v]'); if (b) czChoose($('#czPickGrid'), b.dataset.v);
  });

  /* ---------- memilih */
  function czChoose(g, v) {
    var id = g.dataset.g;
    if (id === '_cat') { var c0 = XC.CATS.filter(function (c) { return c.id === v; })[0]; czReset(XC.defaults(c0.id, c0.subs[0].id)); return; }
    if (id === '_sub') { czReset(XC.defaults(cz.cat, v)); return; }
    if (g.hasAttribute('data-multi')) { var arr = (cz[id] || []).slice(), i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); XC.apply(cz, id, arr); }
    else XC.apply(cz, id, v);
    if (czBase && czView === 'product') czView = 'design';
    czSave(); czRender(true); czStage();
  }
  function czReset(next) { var q = cz.qty; cz = next; cz.qty = q || 1; czSave(); czRender(true); czStage(); }
  $('#czBase').addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]');
    if (v) { czView = v.dataset.view; czRender(true); czStage(); return; }
    if (e.target.closest('[data-czfresh]')) { czBase = null; czView = 'design'; czReset(XC.defaults(cz.cat, cz.sub)); }
  });
  $('#czBody').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-pick]'))) { var same = czPick === b.dataset.pick && picker.classList.contains('is-on'); if (same) { czPickerClose(); return; } czPick = b.dataset.pick; $$('.cz-row').forEach(function (r) { r.classList.toggle('is-on', r === b); }); czPickerFill(); return; }
    if (e.target.closest('[data-breakdown]')) { czBreakdown(); return; }
    if (e.target.closest('[data-send]')) { czSend(); return; }
    if ((b = e.target.closest('[data-v]')) && b.closest('[data-g]')) czChoose(b.closest('[data-g]'), b.dataset.v);
  });
  $('#czBody').addEventListener('input', function (e) {
    var r = e.target.closest('[data-r]'); if (!r) return;
    var gr = findGroup(r.dataset.r);
    cz[r.dataset.r] = +r.value;
    var out = r.parentNode.querySelector('[data-out]'); if (out && gr) out.textContent = czVal(gr, +r.value);
    if (czBase && czView === 'product') czView = 'design';
    czStage(); czDetail(true);
  });
  $('#czBody').addEventListener('change', function (e) { var r = e.target.closest('[data-r]'); if (r) { XC.apply(cz, r.dataset.r, +r.value); czSave(); czRender(true); } });

  /* ---------- pop-up tengah */
  var modal = $('#modal'), modalBody = $('#modalBody');
  function openModal(htmlStr, cls) { modalBody.innerHTML = htmlStr; modal.className = 'modal is-on' + (cls ? ' ' + cls : ''); modal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { modal.classList.remove('is-on'); modal.setAttribute('aria-hidden', 'true'); }
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('[data-modal-close]')) { closeModal(); return; }
    if (e.target.closest('[data-send]')) czSend();
    if (e.target.closest('[data-cznew]')) { closeModal(); czBase = null; czView = 'design'; czReset(XC.defaults(cz.cat, cz.sub)); $('#czScroll').scrollTop = 0; }
  });
  modalBody.addEventListener('submit', function (e) { e.preventDefault(); czSubmit(); });
  modalBody.addEventListener('input', function (e) { if (e.target.id === 'zQty') { cz.qty = Math.max(1, parseInt(e.target.value, 10) || 1); czSave(); var t = $('#zTotal'); if (t) t.textContent = rupiah(XC.estimate(cz)); czDetail(true); } });

  function czBreakdown() {
    var b = XC.breakdown(cz, L);
    openModal('<p class="eyebrow">' + T('Rincian estimasi') + '</p><p class="pane__t">' + esc(czTitle()) + '</p><p class="pd__type">' + esc(XC.dimsText(cz)) + ' · ' + esc(czMat()) + '</p>' +
      '<dl class="bd">' + b.rows.map(function (r, i) { return '<dt>' + esc(r.l) + '</dt><dd>' + (i ? (r.v < 0 ? '− ' : '+ ') : '') + rupiah(Math.round(Math.abs(r.v) / 1000) * 1000) + '</dd>'; }).join('') +
      '<dt class="bd__sub">' + T('Per unit') + '</dt><dd class="bd__sub">' + rupiah(Math.round(b.unit / 10000) * 10000) + '</dd>' +
      (b.qty > 1 ? '<dt>' + T('Jumlah unit') + '</dt><dd>× ' + b.qty + '</dd>' : '') + '</dl>' +
      '<div class="sum"><div><p class="eyebrow">' + T('Total estimasi') + '</p><p class="sum__price">' + rupiah(b.total) + '</p></div></div>' +
      '<p class="note">' + T('Angka estimasi — harga final melalui penawaran resmi tim XIONCO.') + '</p>' +
      '<button class="btn btn--dark btn--full" type="button" data-send><svg><use href="#i-wa"/></svg><span>' + T('Kirim rancangan') + '</span></button>', 'modal--bd');
  }
  var BUDGET = ['Belum tahu', '< IDR 5 juta', 'IDR 5–15 juta', 'IDR 15–50 juta', '> IDR 50 juta'];
  function czSend() {
    var cst = store.get('xv5_customer', {});
    openModal('<p class="eyebrow">' + T('Kirim rancangan') + '</p><p class="pane__t">' + esc(czTitle()) + '</p><p class="pd__type">' + esc(XC.dimsText(cz)) + ' · ' + esc(czMat()) + (czBase ? ' · ' + T('Berdasarkan') + ' ' + esc(czBase.name) : '') + '</p>' +
      '<div class="sum"><div><p class="eyebrow">' + T('Estimasi') + '</p><p class="sum__price" id="zTotal">' + rupiah(XC.estimate(cz)) + '</p></div><button class="cz__fresh" type="button" data-bd>' + T('Lihat rincian') + '</button></div>' +
      '<form class="form" id="czForm" novalidate>' +
      '<div class="f2"><div class="f"><input id="zQty" inputmode="numeric" placeholder=" " value="' + (cz.qty || 1) + '"><label for="zQty">' + T('Jumlah unit') + '</label></div>' +
      '<div class="f f--sel"><input id="zDate" type="date"><label for="zDate">' + T('Dibutuhkan pada') + '</label></div></div>' +
      '<div class="f2"><div class="f f--sel"><select id="zBudget">' + BUDGET.map(function (x) { return '<option>' + esc(T(x)) + '</option>'; }).join('') + '</select><label for="zBudget">' + T('Kisaran anggaran') + '</label></div>' +
      '<div class="f"><input id="zRef" placeholder=" "><label for="zRef">' + T('Link referensi') + '</label></div></div>' +
      '<div class="f"><textarea id="zNote" rows="2" placeholder=" "></textarea><label for="zNote">' + T('Catatan (opsional)') + '</label></div>' +
      '<div class="f"><input id="zName" required placeholder=" " autocomplete="name" value="' + esc(cst.name || '') + '"><label for="zName">' + T('Nama') + '</label></div>' +
      '<div class="f2"><div class="f"><input id="zPhone" required placeholder=" " inputmode="tel" autocomplete="tel" value="' + esc(cst.phone || '') + '"><label for="zPhone">WhatsApp</label></div>' +
      '<div class="f"><input id="zCity" placeholder=" " autocomplete="address-level2" value="' + esc(cst.city || '') + '"><label for="zCity">' + T('Kota') + '</label></div></div>' +
      '<button class="btn btn--dark btn--full" type="submit"><svg><use href="#i-wa"/></svg><span>' + T('Kirim rancangan') + '</span></button>' +
      '<p class="note" id="zMsg">' + T('Rancangan & estimasi dikirim ke tim XIONCO melalui WhatsApp. Penawaran dalam 1 jam kerja.') + '</p></form>', 'modal--send');
    var bd = modalBody.querySelector('[data-bd]'); if (bd) bd.addEventListener('click', czBreakdown);
  }
  function czSubmit() {
    var v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    var name = v('zName'), phone = v('zPhone').replace(/[^\d+]/g, ''), msgEl = $('#zMsg');
    if (!$('#czForm')) return;
    $('#zName').parentNode.classList.toggle('is-err', !name);
    $('#zPhone').parentNode.classList.toggle('is-err', phone.length < 8);
    if (!name || phone.length < 8) { msgEl.textContent = T('Mohon lengkapi nama dan nomor WhatsApp yang valid.'); msgEl.classList.add('is-err'); return; }
    cz.qty = Math.max(1, parseInt(v('zQty'), 10) || 1);
    var est = XC.estimate(cz), sb = XC.sub(cz), idRows = XC.summary(cz, function (o) { return o.l; }), rows = XC.summary(cz, L);
    var data = {
      qty: cz.qty, w: cz.w || '', d: cz.d || '', h: cz.h || '', deadline: v('zDate'), budget: $('#zBudget').value, refs: v('zRef'), notes: v('zNote'),
      custName: name, custPhone: phone, custCity: v('zCity'), channel: 'Website', status: 'Konsultasi', estimate: est,
      spec: idRows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'), config: JSON.parse(JSON.stringify(cz))
    };
    var type = 'full';
    if (czBase) { type = 'existing'; data.item = czBase.id; data.basePrice = czBase.price || ''; data.matType = (XC.find(XC.UPH, cz.uph) || {}).l || ''; data.matColor = czMat('id'); data.notes = data.spec + (data.notes ? '\n\n' + data.notes : ''); }
    else {
      data.project = czTitle('id'); data.brief = data.spec;
      data.category = { kursi: sb.id === 'sofa' || sb.id === 'armchair' ? 'Sofa' : 'Kursi', meja: 'Meja', kabinet: 'Kabinet / lemari', divan: 'Tempat tidur' }[cz.cat];
      data.matMain = czMat('id'); data.color = (XC.colorOf(cz) || {}).l || '';
      var fg = XC.groups(cz).filter(function (x) { return x.id === 'finish'; })[0];
      data.finish = fg ? ((XC.pick(fg, cz) || {}).l || '') : cz.uph ? 'Upholstery' : '';
    }
    if (window.XVDB && XVDB.saveCustom) { try { XVDB.saveCustom({ type: type, data: data }); } catch (err) {} }
    var reqs = store.get('xv5_requests', []);
    reqs.unshift({ id: 'CR-' + Date.now().toString(36).toUpperCase(), created: Date.now(), name: czTitle(), type: XC.dimsText(cz), data: { matColor: czMat(), w: cz.w, d: cz.d, h: cz.h }, estimate: est });
    store.set('xv5_requests', reqs.slice(0, 50));
    var cst = store.get('xv5_customer', {}); cst.name = name; cst.phone = phone; if (data.custCity) cst.city = data.custCity; store.set('xv5_customer', cst);
    var msg = T('Halo XIONCO, saya {name} ({phone}) ingin custom:', { name: name, phone: phone }) + '\n' +
      (czBase ? '• ' + T('Berdasarkan') + ': ' + czBase.name + ' — ' + czBase.type + '\n' : '') +
      rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') +
      '\n• ' + T('Jumlah unit') + ': ' + data.qty + (data.deadline ? '\n• ' + T('Dibutuhkan pada') + ': ' + data.deadline : '') + '\n• ' + T('Kisaran anggaran') + ': ' + data.budget +
      (data.custCity ? '\n• ' + T('Kota') + ': ' + data.custCity : '') + (data.refs ? '\n• ' + T('Referensi') + ': ' + data.refs : '') + (v('zNote') ? '\n• ' + T('Catatan') + ': ' + v('zNote') : '') +
      '\n\n' + T('Estimasi di website') + ': ' + rupiah(est);
    window.open(wa(msg), '_blank', 'noopener');
    czSave(); czDetail(); renderProfile();
    openModal('<div class="done"><svg><use href="#i-check"/></svg><p class="pane__t">' + T('Rancangan terkirim') + '</p><p class="pane__lede">' +
      T('Tim kami membalas dalam 1 jam kerja melalui WhatsApp. Rancangan juga tersimpan di Profil.') + '</p>' +
      '<button class="btn btn--line btn--full" type="button" data-cznew><svg><use href="#i-plus"/></svg><span>' + T('Buat rancangan baru') + '</span></button>' +
      '<button class="btn btn--dark btn--full" type="button" data-modal-close><span>' + T('Selesai') + '</span></button></div>', 'modal--done');
  }

  // buka Customize: kosong, dari produk (Custom di halaman produk), atau CUBIX
  function czFromProduct(p) {
    var t = (p.name + ' ' + p.type + ' ' + (p.shopName || '')).toLowerCase(), cat = 'kursi', sb = 'sofa';
    if (p.cat === 'seats') sb = /bench/.test(t) ? 'bench' : /ottoman|puff|pouf/.test(t) ? 'ottoman' : /stool/.test(t) ? 'stool' : /armchair|1 seater|single|lounge/.test(t) ? 'armchair' : /chair|kursi/.test(t) ? 'dining' : 'sofa';
    else if (p.cat === 'tables') { cat = 'meja'; sb = /dining|makan/.test(t) ? 'dining' : /side|samping/.test(t) ? 'side' : /console|konsol/.test(t) ? 'console' : /desk|workstation|kerja/.test(t) ? 'desk' : 'coffee'; }
    else if (p.cat === 'bedframe') { cat = 'divan'; sb = /platform/.test(t) && !/somno/.test(t) ? 'platform' : 'divan'; }
    else if (p.cat === 'cabinet') { cat = 'kabinet'; sb = /wardrobe|lemari pakaian/.test(t) ? 'wardrobe' : /tv/.test(t) ? 'tv' : /shoe|sepatu|shusio/.test(t) ? 'shoe' : /nightstand|bedside|nakas|qaztac/.test(t) ? 'nightstand' : /shelf|rak|hanger|lucid/.test(t) ? 'bookshelf' : 'sideboard'; }
    var c = XC.defaults(cat, sb);
    if (sb === 'sofa') {
      var m = t.match(/(\d)\s*-?\s*seat/); if (m) XC.apply(c, 'seats', String(Math.max(2, Math.min(5, +m[1]))));
      if (/sectional|l-shape|l shape/.test(t)) XC.apply(c, 'shape', 'lkiri');
      if (/sofa bed/.test(t)) c.extras = ['sofabed'];
      if (/kyrios/.test(t)) { XC.apply(c, 'arm', 'shelter'); XC.apply(c, 'back', 'channel'); XC.apply(c, 'leg', 'metalplinth'); XC.apply(c, 'metal', 'brass'); XC.apply(c, 'seatC', 'bench'); c.pillows = 0; }
      if (/guise/.test(t)) { XC.apply(c, 'arm', 'track'); XC.apply(c, 'back', 'button'); }
      if (/cubix/.test(t)) XC.apply(c, 'shape', 'modular');
    }
    var cv = cur(p);
    if (cv.v && cv.v.fabric && XC.groups(c).some(function (g) { return g.id === 'uph'; })) {
      var line = /cherokee/i.test(cv.v.fabric) ? 'cherokee' : /vienna/i.test(cv.v.fabric) ? 'vienna' : null;
      if (line) { XC.apply(c, 'uph', line); var u = XC.find(XC.UPH, line), cc = u.colors.filter(function (x) { return x.l.toLowerCase() === cv.v.fabric.toLowerCase(); })[0]; if (cc) XC.apply(c, 'color', cc.id); }
    }
    if (p.dims) { var n = String(p.dims).match(/\d+(\.\d+)?/g); if (n && n.length >= 2) { c.w = +n[0]; c.d = +n[1]; if (n[2]) c.h = +n[2]; } }
    return c;
  }
  function openCustomize(p) {
    czView = 'design'; czPick = null;
    if (p && p.id === 'cubix') { czBase = null; cz = XC.defaults('kursi', 'sofa'); XC.apply(cz, 'shape', 'modular'); XC.apply(cz, 'leg', 'block'); XC.apply(cz, 'color', 'custard'); }
    else if (p) { czBase = { id: p.id, name: p.name, type: p.type, price: cur(p).price }; cz = czFromProduct(p); }
    czSave();
    if (current !== 'customize') go('customize'); else { czRender(); czStage(); }
  }
  enter.customize = function () { czRender(); czStage(); };
  leave.customize = function () { dimEl.classList.remove('is-on'); czPickerClose(); if (stageKind === 'custom') czDetail(); };
  window.addEventListener('xvdb:change', function (e) { if (e.detail && e.detail.what === 'settings' && current === 'customize') czRender(true); });

  /* ======================================================================
     PENGATURAN — bahasa & tema (tersimpan di perangkat)
     ====================================================================== */
  var THEME_COLOR = { dark: '#0f0c0a', light: '#e4ddd1' };
  function themeNow() { return html.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function setTheme(name, instant) {
    name = name === 'light' ? 'light' : 'dark';
    html.setAttribute('data-theme', name);
    store.set('xv5_theme', name); try { localStorage.setItem('xv5_theme', name); } catch (e) {}
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', THEME_COLOR[name]);
    if (XW.ok && XW.setTheme) XW.setTheme(name, instant ? 0 : 1.2);
    renderSettings();
  }
  function moodNow() { var m = store.get('xv5_mood', 'senja'); return /^(siang|senja|malam)$/.test(m) ? m : 'senja'; }
  $('#setMood').addEventListener('click', function (e) { var b = e.target.closest('[data-mood]'); if (!b) return; store.set('xv5_mood', b.dataset.mood); if (XW.ok) XW.setMood(b.dataset.mood); renderSettings(); });
  function renderSettings() {
    $$('#setMood [data-mood]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.mood === moodNow()); });
    $$('#setLang [data-lang]').forEach(function (b) { b.classList.toggle('is-on', I18N ? b.dataset.lang === I18N.lang() : b.dataset.lang === 'id'); });
    $$('#setTheme [data-theme]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.theme === themeNow()); });
  }
  $('#setLang').addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (b && I18N) I18N.set(b.dataset.lang); });
  $('#setTheme').addEventListener('click', function (e) { var b = e.target.closest('[data-theme]'); if (b) setTheme(b.dataset.theme); });
  renderSettings();

  /* ======================================================================
     PROFIL — pesanan & permintaan custom di perangkat ini
     ====================================================================== */
  var STATUS = { pending: 'Menunggu pembayaran', paid: 'Dibayar', failed: 'Gagal' };
  function renderProfile() {
    var orders = store.get('xv5_orders', []), reqs = store.get('xv5_requests', []);
    $('#ordList').innerHTML = orders.map(function (o) {
      return '<li><div><b>' + esc(o.id) + '</b><span>' + esc(dateText(o.created)) + ' · ' + o.items.reduce(function (n, i) { return n + i.qty; }, 0) + ' ' + T('item') + '</span></div><div><em>' + rupiah(o.total) + '</em><span class="st st--' + o.status + '">' + T(STATUS[o.status] || o.status) + '</span></div></li>';
    }).join('');
    $('#ordEmpty').classList.toggle('is-on', !orders.length);
    $('#reqList').innerHTML = reqs.map(function (r) {
      var d = r.data || {}, size = [d.w, d.d, d.h].filter(Boolean).join(' × ');
      return '<li><div><b>' + esc(r.name) + '</b><span>' + esc(dateText(r.created)) + (size ? ' · ' + size + ' cm' : '') + ' · ' + esc(d.matColor || '') + '</span></div><div><span class="st">' + T('Terkirim') + '</span></div></li>';
    }).join('');
    $('#reqEmpty').classList.toggle('is-on', !reqs.length);
  }
  $('#acctLogin').addEventListener('click', function () { notice(T('Akun pelanggan segera hadir')); });
  renderProfile();

  /* ======================================================================
     MANUFAKTUR
     ====================================================================== */
  var stagesEl = $('#stages'), stageSel = -1, ROMAN = ['I', 'II', 'III', 'IV'], mls = [];
  function renderStages() {
    stagesEl.innerHTML = XV.FACTORIES.map(function (f, i) {
      return '<li class="' + (i === stageSel ? 'is-on' : '') + '"><button type="button" data-st="' + i + '"><span class="st__n">' + ROMAN[i] + '</span><span class="st__p">' + esc(f.place) + '</span><span class="st__r">' + esc(T(f.role)) + '</span><span class="st__t">' + esc(T(f.text)) + '</span></button></li>';
    }).join('');
    $('#mLabels').innerHTML = XV.FACTORIES.map(function (f, i) { return '<span class="mlabel" data-ml="' + i + '"><b>' + esc(f.place) + '</b><span>' + esc(T(f.role)) + '</span></span>'; }).join('');
    mls = $$('.mlabel');
  }
  renderStages();
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
    if (current === 'customize' && stageKind === 'custom' && L.dim && L.dim.a.v && L.dim.b.v) {
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
  function renderServices() {
    $('#services').innerHTML = XV.SERVICES.map(function (s) {
      return '<li><a href="' + wa(T('Halo XIONCO, saya tertarik dengan layanan {title} ({note}) untuk proyek saya.', { title: s.title, note: T(s.note) })) + '" target="_blank" rel="noopener">' +
        '<span class="svc__n">' + s.n + '</span><span class="svc__t">' + esc(s.title) + '</span><span class="svc__d">' + esc(T(s.note)) + '</span><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></a></li>';
    }).join('');
  }
  renderServices();
  $('#clients').textContent = XV.CLIENTS.join(' · ');
  $('#bform').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim(), phone = $('#fPhone').value.replace(/[^\d+]/g, ''), note = $('#bNote');
    $('#fName').parentNode.classList.toggle('is-err', !name);
    $('#fPhone').parentNode.classList.toggle('is-err', phone.length < 8);
    if (!name || phone.length < 8) { note.textContent = T('Mohon lengkapi nama dan nomor WhatsApp yang valid.'); note.classList.add('is-err'); return; }
    note.classList.remove('is-err'); note.textContent = T('Membuka WhatsApp…');
    var msg = T('Halo XIONCO, saya {name} ({phone}).', { name: name, phone: phone }) + '\n' + T('Jenis proyek') + ': ' + $('#fType').value + '\n' + T('Nilai proyek') + ': ' + $('#fValue').value + ($('#fNeed').value.trim() ? '\n' + T('Kebutuhan') + ': ' + $('#fNeed').value.trim() : '');
    window.open(wa(msg), '_blank', 'noopener');
  });

  /* ======================================================================
     GALERI — karya terpilih berdiri di panggung
     ====================================================================== */
  var galSel = 0;
  function renderGallery() {
    $('#gal').innerHTML = XV.MUSE.map(function (m, i) {
      return '<button type="button" class="' + (i === galSel ? 'is-on' : '') + '" data-g="' + i + '"><img src="' + src(m.img, 768) + '" alt="' + esc(m.title) + '" loading="lazy" decoding="async"><span>' + esc(m.title) + '</span><em>' + esc(T(m.note)) + '</em></button>';
    }).join('');
  }
  renderGallery();
  function artDetail(i) {
    var m = XV.MUSE[i];
    setDetail({ name: m.title, sub: T(m.note), cols: [[T('Karya'), String(i + 1).padStart(2, '0') + ' / ' + String(XV.MUSE.length).padStart(2, '0')]], act: { t: T('Diskusikan'), icon: 'i-wa', href: wa(T('Halo XIONCO, saya tertarik dengan proyek seperti "{title}" ({note}).', { title: m.title, note: T(m.note) })) } });
  }
  function showArt(i) {
    galSel = i;
    var m = XV.MUSE[i];
    stageKind = 'art';
    $$('#gal button').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    if (XW.ok) XW.showArt(src(m.img, 1024));
    artDetail(i);
  }
  $('#gal').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) showArt(+b.dataset.g); });

  /* ======================================================================
     Bahasa berganti → semua teks yang dibuat skrip ditulis ulang
     ====================================================================== */
  window.addEventListener('xi18n:change', function () {
    buildSections(); setWaLinks();
    descKey = null; setDesc(current);
    document.title = titleOf(current);
    indexProducts(); renderCats();
    if (kReady) renderGrid();
    if (pd.classList.contains('is-on') && kList[kI]) fillPd(kList[kI], false);
    renderBag(); if (current === 'bayar') renderPay();
    if (current === 'customize') czRender(true);
    renderSettings(); renderProfile(); renderStages(); renderServices(); renderGallery();
    if (stageSel >= 0) setStage(stageSel);
    refreshDetail();
  });

  /* ======================================================================
     Database (Developer Settings) → situs ikut berubah tanpa memuat ulang
     ====================================================================== */
  window.addEventListener('xvdb:change', function (e) {
    if (!e.detail || e.detail.what !== 'products' || !window.XVDB) return;
    XV.PRODUCTS = XVDB.activeProducts();
    byId = {}; XV.PRODUCTS.forEach(function (p) { byId[p.id] = p; });
    indexProducts(); buildSections();
    if (descKey === current) { descKey = null; setDesc(current); }
    cleanBag(); renderBag();
    if (kReady) renderGrid();
    if (furniture.kind === 'product') {
      var np = byId[furniture.p.id];
      if (np) { furniture.p = np; if (stageKind === 'product') productDetail(np); if (pd.classList.contains('is-on')) { kI = kList.indexOf(np); fillPd(np, false); } }
      else { closePd(); if (stageKind === 'product') showCubix(); }
    }
  });

  /* ======================================================================
     Keyboard
     ====================================================================== */
  window.addEventListener('keydown', function (e) {
    if (!booted) return;
    var typing = /^(input|textarea|select)$/i.test(e.target.tagName || '');
    if (e.key === 'Escape') {
      if (typing) { e.target.blur(); return; }
      if ($('#modal').classList.contains('is-on')) { $('#modal').classList.remove('is-on'); return; }
      if ($('#czPicker').classList.contains('is-on')) { $('#czPicker [data-pick-close]').click(); return; }
      if (pd.classList.contains('is-on') && current === 'koleksi') { closePd(); return; }
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
    if (e.key === '0' && XW.recenter) XW.recenter();
  });

  /* ======================================================================
     Pembuka
     ====================================================================== */
  var gl = false;
  try { gl = XW.init ? XW.init($('#world'), { mobile: isMobile() || !FINE, reduced: REDUCED }) : false; } catch (err) { gl = false; }
  if (!gl || !XW.ok) html.classList.add('no-webgl');
  XW.onLost = function () { html.classList.add('no-webgl'); };
  if (XW.ok) { XW.setMood(moodNow()); if (themeNow() === 'light') XW.setTheme('light', 0); }
  cubixDetail();
  function preload(list, cb) {
    var n = 0;
    return Promise.all(list.map(function (u) { return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = function () { n++; cb(n / list.length); res(); }; im.src = u; }); }));
  }
  function warm() {
    // siapkan potongan foto beberapa karya populer agar pergantian di panggung instan
    if (XW.cutout) XV.PRODUCTS.slice(0, 6).forEach(function (p) { if (p.id !== 'cubix' && !p.model) XW.cutout(src(p.img, 1024)); });
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
    var prog = { v: 0, t: 0 }, ln = $('#veilLine');
    var tick = function () { prog.v = lerp(prog.v, prog.t, .07); ln.style.width = (prog.v * 100).toFixed(1) + '%'; };
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
});
