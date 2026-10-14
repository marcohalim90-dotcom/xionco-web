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

  /* thumbnail: foto produk apa adanya (latar tidak dipotong — hasil potong kurang rapi) di atas "piring" ivory;
     latar putih foto menyatu lewat multiply. Foto studio gelap (photoCls) tetap penuh (cover). */
  function thumbImg(p, u) {
    u = u || src(p.img, 768);
    if (!u) return '<span class="noimg"><svg><use href="#i-frame"/></svg><em>' + esc(T('Foto menyusul')) + '</em></span>';   // produk lokal tanpa foto
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
  // sudut foto gelap? (salinan kecil terpisah ber-CORS; bila tidak bisa dibaca, anggap latar putih)
  var darkMemo = {};
  function darkBg(u, cb) {
    if (darkMemo[u] != null) { if (darkMemo[u]) cb(); return; }
    var p = new Image(); p.crossOrigin = 'anonymous';
    p.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = c.height = 8;
        var g = c.getContext('2d'); g.drawImage(p, 0, 0, 8, 8);
        var d = g.getImageData(0, 0, 8, 8).data, lum = 0;
        [0, 7, 56, 63].forEach(function (i) { lum += (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; });
        darkMemo[u] = lum / 4 < 110; if (darkMemo[u]) cb();
      } catch (e) { darkMemo[u] = false; }
    };
    p.src = u;
  }
  function pumpCut() {
    while (cutActive < 3 && cutQ.length) {
      var im = cutQ.shift(); cutActive++;
      (function (im) {
        var u = im.dataset.cut, done = function () { cutActive--; pumpCut(); };
        var show = function () { im.classList.add('is-ready'); };
        // latar putih → di atas "piring" ivory; latar studio gelap (foto varian) → penuh kotak (cover)
        var dark = function () { im.classList.add('is-photo'); if (im.parentNode) im.parentNode.classList.remove('is-plate'); };
        if (im.parentNode) im.parentNode.classList.add('is-plate');
        im.onload = function () { show(); darkBg(u, dark); }; im.src = u; done();
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
      profil: { n: T('Profil'), t: T('Akun Anda'), p: T('Pesanan dan permintaan custom Anda di perangkat ini.'), m: 'Maison XIONCO' },
      ruang: { n: T('Ruang'), t: T('Ruang Anda'), p: T('Beberapa furnitur tampil bersama di panggung — geser untuk menata.'), m: 'Maison XIONCO' }
    };
  }
  buildSections();
  var ROUTES = ['home', 'koleksi', 'customize', 'manufaktur', 'bisnis', 'galeri', 'kontak', 'tas', 'bayar', 'setelan', 'profil', 'ruang'];
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
      if (!overWorld) { cur$.classList.remove('is-pick'); cur$.classList.remove('is-drag'); cur$.classList.remove('is-cam'); cur$.classList.remove('is-door'); }
    });
    document.addEventListener('pointerdown', function () { cur$.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur$.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cur$.classList.add('is-out'); });
    document.documentElement.addEventListener('mouseenter', function () { cur$.classList.remove('is-out'); });
  }
  XW.onHover = function (k, mo) {
    cur$.classList.toggle('is-pick', !!k && overWorld);
    // pintu / laci kabinet: klik untuk buka-tutup (cincin penuh) · produk: putar (‹ ›) · area kosong: arah kamera (putus-putus)
    cur$.classList.toggle('is-door', overWorld && !!mo);
    cur$.classList.toggle('is-drag', overWorld && !!k && !mo && !!(XW.canSpin && XW.canSpin()));
    cur$.classList.toggle('is-cam', overWorld && !k);
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
  var detailLast = null;
  function setDetail(o) {
    dPriceFn = o.priceFn || null;
    detailEl.classList.toggle('has-price-fn', !!dPriceFn);
    var sig = JSON.stringify([o.name, o.sub, o.cols, o.price, o.was, o.priceK, o.act && o.act.t]);
    if (sig === detailSig) return;
    detailSig = sig;
    // hanya nilai yang berubah yang dianimasikan; judul kolom tetap diam
    var prev = detailLast; detailLast = o;
    if (!prev || prev.name !== o.name) rewrite($('#dName'), o.name, .45);
    if (!prev || prev.sub !== o.sub) rewrite($('#dSub'), o.sub || '', .55, .08);
    var cols = o.cols || [], heads = cols.map(function (c) { return c[0]; }).join('|');
    if (!prev || heads !== (prev.cols || []).map(function (c) { return c[0]; }).join('|')) {
      $('#dCols').innerHTML = cols.map(function (c) { return '<div><dt>' + esc(c[0]) + '</dt><dd></dd></div>'; }).join('');
      $$('#dCols dd').forEach(function (dd, i) { rewrite(dd, cols[i][1], .5, .1 + i * .06); });
    } else $$('#dCols dd').forEach(function (dd, i) { if (cols[i][1] !== prev.cols[i][1]) rewrite(dd, cols[i][1], .5); });
    var box = $('#dPriceBox');
    box.classList.toggle('is-off', !o.price);
    if (o.price) {
      var k = o.priceK || T('Harga');
      if ($('#dPriceK').textContent !== k) $('#dPriceK').textContent = k;
      if (!prev || prev.price !== o.price) rewrite($('#dPrice'), o.price, .55, .12);
      $('#dWas').textContent = o.was || '';
    }
    dAct.classList.toggle('is-off', !o.act);
    if (o.act) {
      if ($('#dActT').textContent !== o.act.t) $('#dActT').textContent = o.act.t;
      $('use', dAct).setAttribute('href', '#' + (o.act.icon || 'i-plus'));
      dAct.href = o.act.href || '#';
      dAct.target = o.act.href ? '_blank' : '';
      dAct.rel = o.act.href ? 'noopener' : '';
      dActFn = o.act.fn || null;
    }
    requestAnimationFrame(fitDetail);
  }
  dAct.addEventListener('click', function (e) { if (dActFn) { e.preventDefault(); dActFn(); } });
  // lebar kotak bawah tetap (tidak ikut panjang teks) — hanya berubah bila ruang layar berubah
  function fitDetail() {
    var free = innerWidth - (isMobile() ? 0 : stageInset.l + stageInset.r) - 40;
    detailEl.style.setProperty('--detail-w', Math.round(Math.min(880, free)) + 'px');
    detailEl.classList.toggle('is-compact', free < 820);
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
    var c = pcCur(p, cur(p)), disc = c.was && c.price ? Math.round((1 - c.price / c.was) * 100) : 0;
    setDetail({
      name: p.name, sub: p.type,
      cols: [c.label ? [T('Varian'), c.label] : [T('Kategori'), catLabel(p.cat)], [T('Kirim'), T('1–3 hari kerja')]],
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
  // model 3D per varian (mis. VERK Laci / Tanpa Laci) — p.vmodels { label varian: path }
  function modelOf(p, c) { return c && c.v && p.vmodels && p.vmodels[c.v.label] || p.model || ''; }
  function stageShow(p) {
    var s = selOf(p), c = cur(p, s), photo = src(s.touched ? c.img : p.img, 1024);
    var mdl = modelOf(p, c); furniture.mdl = mdl;
    if (mdl) { var pr = XW.showModel(p, src(mdl), photo, c.hex); if (pr && pr.then) pr.then(function () { if (pcFor(p)) { if (!pcz.w0) pcInit(p); else pcApply(); } }); }
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
    detailSig = ''; detailLast = null;
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
  var TOP_PANES = { setelan: '#setBtn', profil: '#userBtn', tas: '#bagBtn', bayar: '#bagBtn', ruang: '#roomBtn' };
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
    if (id === 'customize' || id === 'ruang') { /* panggung diatur enter.customize → czStage / enter.ruang */ }
    else if (id === 'manufaktur') { stageKind = 'map'; if (XW.ok) XW.showMap(); mapDetail(-1); }
    else if (id === 'galeri') showArt(galSel);
    else {
      if (stageKind === 'map' || stageKind === 'art') showFurniture();
      else if (stageKind === 'cubix') cubixDetail();
      else if (stageKind === 'custom') czDetail();
    }
    if (XW.ok && prev !== id) applyLighting();
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
  window.XVOpen = function (id) { var p = byId[id]; if (p) openProduct(p); return !!p; };   // dipakai skrip uji & tautan langsung
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
    if (pcz && pcz.pid !== p.id) pcz = null;
    var c = pcCur(p, cur(p)), disc = c.was && c.price ? Math.round((1 - c.price / c.was) * 100) : 0;
    $('#pdCat').textContent = catLabel(p.cat) + (p.sold ? ' · ' + T('{n} terjual', { n: p.sold }) : '');
    $('#pdName').textContent = p.name;
    $('#pdType').textContent = p.type;
    $('#pdPrice').innerHTML = c.price ? '<b>' + priceText(p, c) + '</b>' + (c.was ? '<s>' + rupiah(c.was) + '</s><span class="tag tag--gold">' + T('Hemat') + ' ' + disc + '%</span>' : '') : '<b>' + T('Melalui penawaran') + '</b>';
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
    $('#pdCustom').style.display = p.customizable || p.id === 'cubix' || p.model ? '' : 'none';
    pcRender();
    kQty = 1; $('#pdQty').textContent = 1;
    $('#pdWa').href = wa(T('Halo XIONCO, saya ingin tahu lebih lanjut tentang {name} ({type}).', { name: p.name, type: p.type + (c.label ? ' · ' + c.label : '') }));
    $('#pdWaText').textContent = c.price ? T('Tanya') : T('Tanya harga');
    $('#pdLink').href = p.url || XV.SHOP;
    $('#pdLink span').textContent = /xionco\.shop/.test(p.url || '') ? T('Lihat di xionco.shop') : T('Detail di xionco.com');
    $('#pdN').textContent = String(kI + 1).padStart(2, '0') + ' / ' + kList.length;
    if (ANIM && anim) G.fromTo($$('#pd > *').slice(1, 7), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .04, clearProps: 'transform' });
  }
  function renderVariants(p) {
    var vs = p.variants || [], s = selOf(p), c = cur(p, s);
    var box = $('#pdVar'), sub = $('#pdSub');
    if (!vs.length) { box.innerHTML = ''; sub.innerHTML = ''; box.hidden = sub.hidden = true; return; }
    box.hidden = false;
    var lab = function (v) { return [v.group ? T(v.group) : '', v.label].filter(Boolean).join(' · '); };
    box.innerHTML = '<p class="og__h"><span>' + T(vs[0].group ? 'Warna & material' : 'Varian') + '</span><b>' + esc(c.v ? lab(c.v) : '') + '</b></p><div class="og">' + vs.map(function (v, i) {
      var name = v.label.length > 15 ? v.label.slice(0, 14) + '…' : v.label;
      return '<button type="button" class="cz-o' + (i === s.v ? ' is-on' : '') + '" data-v="' + i + '" title="' + esc(lab(v)) + '">' +
        (v.hex ? '<i class="cz-o__c' + (/faux|leather/i.test(v.group) ? ' is-leather' : '') + '" style="--c:' + v.hex + '"></i>' : '') + '<span>' + esc(name) + '</span></button>';
    }).join('') + '</div>';
    var subs = c.v && c.v.subs || [];
    sub.hidden = !subs.length;
    sub.innerHTML = subs.length ? '<p class="og__h"><span>' + T('Ukuran & opsi') + '</span><b>' + esc(c.sub ? c.sub.label : '') + '</b></p><div class="og">' +
      subs.map(function (x, i) { return '<button type="button" class="cz-o' + (i === s.s ? ' is-on' : '') + '" data-s="' + i + '" title="' + esc(x.label) + '"><span>' + esc(x.label.length > 15 ? x.label.slice(0, 14) + '…' : x.label) + '</span></button>'; }).join('') + '</div>' : '';
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
    if (p.vmodels && modelOf(p, c) !== (furniture.mdl || p.model)) { furniture.mdl = modelOf(p, c); stageShow(p); }
    else if (p.model) XW.setTint(c.hex);
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
  /* ---- Sesuaikan produk katalog (model 3D asli): ukuran & warna kaki/base ----
     Yang diubah adalah item itu sendiri (GLB), bukan rancangan Customize baru.
     Harga = harga varian × (lebar/lebar asli)^0,85 × (dalam/dalam asli)^0,4 × faktor finishing
     (+ tambahan finishing) — finishing memakai tabel Material › besi di Developer Settings › Harga. */
  var pcz = null;   // { pid, w, d, w0, d0, metal, metal0, open }
  var pcFor = function (p) { return p && pcz && pcz.pid === p.id ? pcz : null; };
  var pcChanged = function (pc) { return !!pc && (pc.w !== pc.w0 || pc.d !== pc.d0 || pc.metal !== pc.metal0); };
  function pcPrice(base, pc) {
    if (!base || !pc) return base;
    var f = Math.pow(pc.w / pc.w0, .85) * Math.pow(pc.d / pc.d0, .4), add = 0;
    if (pc.metal !== pc.metal0 && window.XC && XC.matPrice) { var a = XC.matPrice('metal.' + pc.metal), b = XC.matPrice('metal.' + pc.metal0); f *= (a.f || 1) / (b.f || 1); add = (a.add || 0) - (b.add || 0); }
    return Math.round((base * f + add) / 10000) * 10000;
  }
  function pcLabel(pc) { var m = window.XC && XC.find(XC.METAL, pc.metal); return 'W ' + Math.round(pc.w) + ' · D ' + pc.d + ' cm' + (m ? ' · ' + L(m) : ''); }
  // harga & label varian setelah penyesuaian (untuk halaman produk & kotak bawah)
  function pcCur(p, c) { var pc = pcFor(p); if (!pcChanged(pc) || !c.price) return c; var o = {}; for (var k in c) o[k] = c[k]; o.price = pcPrice(c.price, pc); o.was = null; o.label = (c.label ? c.label + ' · ' : '') + pcLabel(pc); return o; }
  function nearMetal(hex) {
    if (!hex || !window.XC) return 'brass';
    var t = parseInt(hex.slice(1), 16), best = null, bd = 1e9;
    XC.METAL.forEach(function (m) { var v = parseInt(m.hex.slice(1), 16), d = Math.abs((t >> 16) - (v >> 16)) + Math.abs((t >> 8 & 255) - (v >> 8 & 255)) + Math.abs((t & 255) - (v & 255)); if (d < bd) { bd = d; best = m.id; } });
    return best;
  }
  function pcApply() {
    var p = kList[kI], pc = pcFor(p);
    if (!pc || !XW.reshapeModel || !(furniture.kind === 'product' && furniture.p === p)) return;
    var m = XC.find(XC.METAL, pc.metal);
    XW.reshapeModel({ w: pc.w, d: pc.d, metal: pc.metal === pc.metal0 || !m ? null : { hex: m.hex, rough: m.rough, metalness: m.id === 'ivory' ? .2 : 1 } });
  }
  function pcRender() {
    var p = kList[kI], box = $('#pdPc'), pc = pcFor(p);
    if (!box) return;
    box.hidden = !(pc && pc.open);
    $('#pdCustom span').textContent = pc && pc.open ? T('Tutup penyesuaian') : T('Sesuaikan');
    if (!pc || !pc.open) { box.innerHTML = ''; return; }
    if (!pc.w0) { box.innerHTML = '<p class="note">' + T('Memuat model 3D…') + '</p>'; return; }
    var rng = function (k, lab, v, min, max, step) {
      return '<div class="cz-g"><p class="og__h"><span>' + lab + '</span><b>' + v + ' cm</b></p><input class="rng" type="range" style="--p:' + ((v - min) / (max - min) * 100).toFixed(1) + '%" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-pc="' + k + '" aria-label="' + esc(lab) + '"><p class="rng__ends"><span>' + min + ' cm</span><span>' + max + ' cm</span></p></div>';
    };
    var mg = { id: 'metal', type: 'swatch' }, cm0 = XC.find(XC.METAL, pc.metal);
    box.innerHTML = '<p class="og__h pc__h"><span>' + T('Sesuaikan {name}', { name: p.name }) + '</span></p>' +
      '<p class="note pc__n">' + T('Model asli diubah langsung — lengan & kaki tetap, bagian tengah yang menyesuaikan.') + '</p>' +
      (pcChanged(pc) ? '<p class="pc__r"><button type="button" class="mini" data-pc-reset>' + T('Ukuran asli') + '</button></p>' : '') +
      rng('w', T('Lebar'), Math.round(pc.w), Math.floor(pc.wMin * 10) / 10, Math.ceil(pc.wMax * 10) / 10, pc.wStep) + (pc.tile ? '<p class="note pc__ch">' + T('{n} lajur channel', { n: pc.tile.n0 + Math.round((pc.w - pc.w0) / pc.tile.pitch) }) + '</p>' : '') + rng('d', T('Kedalaman'), pc.d, pc.dMin, pc.dMax, 1) +
      (pc.hasMetal ? '<div class="cz-g"><p class="og__h"><span>' + T('Warna kaki & base') + '</span><b>' + esc(cm0 ? L(cm0) : '') + '</b></p><div class="cz-grid">' +
        XC.METAL.map(function (m) { return cell(mg, m, m.id === pc.metal, false); }).join('') + '</div></div>' : '');
  }
  function pcOpen(p) {
    var pc = pcFor(p);
    if (!pc) pc = pcz = { pid: p.id, open: false };
    pc.open = !pc.open;
    if (pc.open && !pc.w0) pcInit(p);
    pcRender();
    if (pc.open) setTimeout(function () { var b = $('#pdPc'); if (b && !b.hidden) b.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }, 60);
  }
  // ukuran asli diambil dari model yang tampil di panggung (ditunggu bila belum termuat)
  function pcInit(p, tries) {
    var pc = pcFor(p); if (!pc || pc.w0) return;
    var info = furniture.kind === 'product' && furniture.p === p && XW.modelInfo && XW.modelInfo();
    if (!info) { if ((tries || 0) < 40) setTimeout(function () { pcInit(p, (tries || 0) + 1); }, 250); return; }
    var r5 = function (v) { return Math.round(v / 5) * 5; };
    pc.w0 = pc.w = info.w; pc.d0 = pc.d = info.d;
    pc.wMin = r5(info.w * .75); pc.wMax = r5(info.w * 1.35); pc.wStep = 5; pc.dMin = Math.round(info.d * .85); pc.dMax = Math.round(info.d * 1.2);
    // model bermodul channel: lebar bertambah per lajur (channel baru), bukan diregangkan
    if (info.tile) { var tp = info.tile.pitch; pc.tile = info.tile; pc.wStep = tp; pc.wMin = info.w - (info.tile.n0 - 1) * tp; pc.wMax = info.w + 6 * tp; }
    pc.hasMetal = info.metals > 0; pc.metal0 = pc.metal = nearMetal(info.metalHex);
    pcRender();
  }
  function pcUpdate() {
    var p = kList[kI];
    pcApply();
    var c = pcCur(p, cur(p));
    $('#pdPrice').innerHTML = c.price ? '<b>' + priceText(p, c) + '</b>' : '<b>' + T('Melalui penawaran') + '</b>';
    productDetail(p);
  }
  $('#pdPc') && $('#pdPc').addEventListener('input', function (e) {
    var t = e.target; if (!t.dataset.pc) return;
    var pc = pcFor(kList[kI]); if (!pc) return;
    pc[t.dataset.pc] = t.dataset.pc === 'w' && pc.tile ? Math.round((pc.w0 + Math.round((+t.value - pc.w0) / pc.tile.pitch) * pc.tile.pitch) * 10) / 10 : +t.value;
    var ch = $('#pdPc .pc__ch'); if (ch && pc.tile) ch.textContent = T('{n} lajur channel', { n: pc.tile.n0 + Math.round((pc.w - pc.w0) / pc.tile.pitch) });
    t.style.setProperty('--p', ((t.value - t.min) / (t.max - t.min) * 100).toFixed(1) + '%');
    var b = t.parentNode.querySelector('.og__h b'); if (b) b.textContent = Math.round(pc[t.dataset.pc]) + ' cm';
    pcUpdate();
  });
  $('#pdPc') && $('#pdPc').addEventListener('change', function () { pcRender(); });
  $('#pdPc') && $('#pdPc').addEventListener('click', function (e) {
    var pc = pcFor(kList[kI]); if (!pc) return;
    var b = e.target.closest('[data-v]');
    if (b) { pc.metal = b.dataset.v; pcRender(); pcUpdate(); czLazy($('#pdPc')); return; }
    if (e.target.closest('[data-pc-reset]')) { pc.w = pc.w0; pc.d = pc.d0; pc.metal = pc.metal0; pcRender(); pcUpdate(); }
  });
  $('#pdCustom').addEventListener('click', function () {
    var p = kList[kI]; if (!p) return;
    if (p.model) pcOpen(p);   // produk dengan model 3D: sesuaikan item itu sendiri
    else openCustomize(p);    // belum ada model: rancangan Customize seperti sebelumnya
  });
  enter.koleksi = function () { if (!kReady) { kReady = true; renderGrid(); } };
  leave.koleksi = function (to) { if (to !== 'customize' && to !== 'bayar') closePd(); };

  /* ======================================================================
     TAS — baris = produk (+ varian & sub-varian) atau rancangan Customize
     ====================================================================== */
  function loadBag() {
    var b = store.get('xv5_bag2', null);
    // rancangan custom lama di tas → spesifikasi sekarang (mis. back=channel → backTuft)
    if (b) { Object.keys(b).forEach(function (k) { var e = b[k]; if (e && e.type === 'custom' && e.cfg && window.XC && window.XC.normalize) { try { window.XC.normalize(e.cfg); } catch (err) {} } }); return b; }
    b = {};
    var old = store.get('xv5_bag', {});
    Object.keys(old).forEach(function (id) { if (typeof old[id] === 'number' && byId[id]) b[id + '|-1|-1'] = { id: id, v: -1, s: -1, q: old[id] }; });
    return b;
  }
  var bag = loadBag();
  // harga rancangan custom dihitung ulang dari tabel harga terbaru (Developer Settings › Harga)
  function customUnit(cfg, fallback) { if (!cfg || !window.XC) return fallback; try { var c = JSON.parse(JSON.stringify(cfg)); c.qty = 1; return window.XC.estimate(c) || fallback; } catch (err) { return fallback; } }
  function line(e) {
    if (e.type === 'custom') { var up = customUnit(e.cfg, e.price); return { key: e.id, custom: true, p: { id: e.id, name: e.title, type: e.sub }, c: { price: up, label: e.mat ? e.sub + ' · ' + e.mat : e.sub, img: e.img }, q: e.q, total: up * e.q, e: e }; }
    var p = byId[e.id]; if (!p) return null;
    var c = cur(p, { v: e.v, s: e.s });
    if (!c.price) return null;
    var key = e.id + '|' + e.v + '|' + e.s;
    if (e.pc) { var o = {}; for (var k in c) o[k] = c[k]; o.price = pcPrice(c.price, e.pc); o.label = (c.label ? c.label + ' · ' : '') + pcLabel(e.pc); c = o; key += '|' + e.pc.w + 'x' + e.pc.d + e.pc.metal; }
    return { key: key, p: p, c: c, q: e.q, total: c.price * e.q, e: e };
  }
  function bagLines() { return Object.keys(bag).map(function (k) { return line(bag[k]); }).filter(Boolean); }
  function cleanBag() { Object.keys(bag).forEach(function (k) { if (!line(bag[k])) delete bag[k]; }); }
  cleanBag();
  function bagCount() { return bagLines().reduce(function (n, l) { return n + l.q; }, 0); }
  function sumOf(lines) { return lines.reduce(function (n, l) { return n + l.total; }, 0); }
  function thumbOf(l) {
    if (l.custom) return l.c.img ? '<img class="is-snap" src="' + l.c.img + '" alt="">' : '<svg><use href="#i-ruler"/></svg>';
    return thumbImg(l.p, src(l.c.img || l.p.img, 768));
  }
  function lineHtml(l, controls) {
    return '<li data-k="' + esc(l.key) + '"><div class="list__th">' + thumbOf(l) + '</div>' +
      '<div><p class="list__n"><span>' + esc(l.p.name) + '</span>' + (l.custom ? '<span class="tag tag--gold">Custom</span>' : '') + '</p>' +
      '<p class="list__v">' + esc(l.c.label || l.p.type) + '</p>' + (controls ? '<p class="list__p">' + rupiah(l.c.price) + '</p>' : '') + '</div>' +
      '<div class="list__r">' + (controls
        ? '<div class="stepper"><button type="button" data-d="-1" aria-label="' + T('Kurangi') + '"><svg><use href="#i-minus"/></svg></button><span>' + l.q + '</span><button type="button" data-d="1" aria-label="' + T('Tambah') + '"><svg><use href="#i-plus"/></svg></button></div><button class="rm" type="button" data-rm>' + T('Hapus') + '</button>'
        : '<span class="list__p">' + rupiah(l.total) + '</span>' + (l.q > 1 ? '<span class="list__v">' + l.q + ' × ' + rupiah(l.c.price) + '</span>' : '')) + '</div></li>';
  }
  function renderBag() {
    var lines = bagLines(), n = bagCount();
    $('#bagCount').textContent = n || ''; $('#bagCount').dataset.n = n; $('#bagItems').textContent = n;
    $('#bagEmpty').classList.toggle('is-on', !lines.length);
    $('#bagFoot').hidden = !lines.length;
    $('#bagList').innerHTML = lines.map(function (l) { return lineHtml(l, true); }).join('');
    cutThumbs($('#bagList'));
    $('#bagTotal').textContent = rupiah(sumOf(lines));
    store.set('xv5_bag2', bag);
  }
  $('#bagList').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var k = li.dataset.k, d = e.target.closest('[data-d]'), en = bag[k];
    if (!en) return;
    if (d) { en.q = clamp(en.q + (+d.dataset.d), 0, 99); if (!en.q) delete bag[k]; renderBag(); }
    else if (e.target.closest('[data-rm]')) { delete bag[k]; renderBag(); }
    else if (e.target.closest('.list__th, .list__n')) { if (en.type === 'custom') openDesign(en); else openProduct(byId[en.id]); }
  });
  function entryOf(p, q) { var s = selOf(p), pc = pcFor(p), e = { id: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, q: q || 1 }; if (pcChanged(pc)) e.pc = { w: pc.w, d: pc.d, w0: pc.w0, d0: pc.d0, metal: pc.metal, metal0: pc.metal0 }; return e; }
  function bump() { var b = $('#bagBtn'); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
  function addToBag(p, q) {
    if (!p) return;
    var e = entryOf(p, q), l = line(e);
    if (!l) return;
    if (bag[l.key]) bag[l.key].q = clamp(bag[l.key].q + e.q, 1, 99); else bag[l.key] = e;
    renderBag(); bump();
    notice(T('{name} × {q} ditambahkan ke tas', { name: p.name, q: e.q }));
  }
  function addEntry(e) { bag[e.id] = e; renderBag(); bump(); notice(T('{name} × {q} ditambahkan ke tas', { name: e.title, q: e.q })); }
  function buyNow(p, q) { if (!p) return; var e = entryOf(p, q); if (line(e)) openPay([e], 'produk'); }
  /* ======================================================================
     RUANG — beberapa furnitur tampil bersama di panggung (tersimpan di perangkat)
     Tambah dari Customize (rancangan) atau halaman produk; geser di panggung untuk menata.
     ====================================================================== */
  var roomList = function () { return store.get('xv5_room', []); };
  function roomSave(l) { store.set('xv5_room', l); roomBadge(); }
  function roomBadge() { var n = roomList().length, b = $('#roomCount'); if (b) { b.textContent = n || ''; b.dataset.n = n; } }
  // perkiraan lebar (m) untuk penempatan awal berjajar
  function roomWidth(e) {
    if (e.kind === 'custom') return (+e.cfg.w || (e.cfg.dia ? +e.cfg.dia : 0) || (e.cfg.mattress ? +e.cfg.mattress + 10 : 100)) / 100;
    var p = byId[e.pid]; return p ? ((p.cat === 'seats' ? 2 : p.cat === 'tables' ? 1.3 : p.cat === 'bedframe' ? 1.8 : 1)) : 1.2;
  }
  function roomAdd(e) {
    var l = roomList(), right = l.reduce(function (m, x) { return Math.max(m, (x.x || 0) + roomWidth(x) / 2); }, -1e9);
    e.rid = 'R' + Date.now().toString(36); e.ry = 0; e.z = 0;
    e.x = l.length ? +(right + .35 + roomWidth(e) / 2).toFixed(2) : 0;
    l.push(e); roomSave(l);
    notice(T('{name} ditambahkan ke ruang', { name: e.title }) + ' · ' + T('Lihat ruang'));
    var b = $('#roomBtn'); if (b) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
  }
  function roomEntries() {
    return roomList().map(function (e) {
      if (e.kind === 'custom') return { rid: e.rid, kind: 'custom', cfg: XC.normalize(JSON.parse(JSON.stringify(e.cfg))), x: e.x, z: e.z, ry: e.ry };
      var p = byId[e.pid]; if (!p) return null;
      var c = cur(p, { v: e.v, s: e.s });
      return p.model ? { rid: e.rid, kind: 'model', url: src(p.model), p: p, x: e.x, z: e.z, ry: e.ry } : { rid: e.rid, kind: 'photo', url: src(c.img || p.img, 1024), p: p, x: e.x, z: e.z, ry: e.ry };
    }).filter(Boolean);
  }
  function roomPrice(e) { if (e.kind === 'custom') return customUnit(e.cfg, e.price); var p = byId[e.pid]; return p ? cur(p, { v: e.v, s: e.s }).price || 0 : 0; }
  function renderRoom() {
    var l = roomList(), box = $('#roomList'); if (!box) return;
    $('#roomEmpty').classList.toggle('is-on', !l.length);
    $('#roomFoot').hidden = !l.length;
    box.innerHTML = l.map(function (e) {
      return '<li data-rid="' + e.rid + '"><div class="list__th">' + (e.img ? '<img class="is-snap" src="' + e.img + '" alt="">' : '<svg><use href="#i-ruler"/></svg>') + '</div>' +
        '<div><p class="list__n"><span>' + esc(e.title) + '</span>' + (e.kind === 'custom' ? '<span class="tag tag--gold">Custom</span>' : '') + '</p><p class="list__v">' + esc(e.sub || '') + '</p><p class="list__p">' + rupiah(roomPrice(e)) + '</p>' +
        '<div class="list__acts"><button class="mini" type="button" data-rot="-45">↺ 45°</button><button class="mini" type="button" data-rot="45">↻ 45°</button><button class="mini mini--gold" type="button" data-room-bag>' + T('Ke tas') + '</button></div></div>' +
        '<div class="list__r"><button class="rm" type="button" data-room-rm>' + T('Hapus') + '</button></div></li>';
    }).join('');
    $('#roomTotal').textContent = rupiah(l.reduce(function (n, e) { return n + roomPrice(e); }, 0));
  }
  function roomStage() {
    stageKind = 'room';
    var l = roomList();
    setDetail({ name: T('Ruang Anda'), sub: T('{n} furnitur · geser untuk menata', { n: l.length }), cols: [], priceK: T('Total ruang'), price: rupiah(l.reduce(function (n, e) { return n + roomPrice(e); }, 0)) });
    if (XW.ok && XW.showRoom) XW.showRoom(roomEntries());
  }
  XW.onRoomMove = function (rid, x, z) { var l = roomList(); l.forEach(function (e) { if (e.rid === rid) { e.x = x; e.z = z; } }); roomSave(l); };
  $('#roomList') && $('#roomList').addEventListener('click', function (e) {
    var li = e.target.closest('[data-rid]'); if (!li) return;
    var l = roomList(), it = l.filter(function (x) { return x.rid === li.dataset.rid; })[0]; if (!it) return;
    var b;
    if ((b = e.target.closest('[data-rot]'))) { it.ry = ((it.ry || 0) + +b.dataset.rot + 360) % 360; roomSave(l); if (XW.roomSet) XW.roomSet(it.rid, { ry: it.ry }); return; }
    if (e.target.closest('[data-room-rm]')) { roomSave(l.filter(function (x) { return x !== it; })); renderRoom(); roomStage(); return; }
    if (e.target.closest('[data-room-bag]')) {
      if (it.kind === 'custom') addEntry({ id: 'cz-' + Date.now().toString(36), type: 'custom', title: it.title, sub: it.sub, mat: it.mat, cfg: it.cfg, price: roomPrice(it), img: it.img, q: 1 });
      else { var p = byId[it.pid]; if (p) { var en = { id: p.id, v: it.v, s: it.s, q: 1 }; if (it.pc) en.pc = it.pc; var ln = line(en); if (ln) { if (bag[ln.key]) bag[ln.key].q++; else bag[ln.key] = en; renderBag(); bump(); notice(T('{name} × {q} ditambahkan ke tas', { name: p.name, q: 1 })); } } }
    }
  });
  $('#roomClear') && $('#roomClear').addEventListener('click', function () { roomSave([]); renderRoom(); roomStage(); });
  enter.ruang = function () { renderRoom(); roomStage(); };
  leave.ruang = function () { showFurniture(); };
  roomBadge();
  $('#bagCheckout').addEventListener('click', function () { openPay(Object.keys(bag).map(function (k) { return bag[k]; }), 'tas'); });
  renderBag();

  /* ======================================================================
     AKUN — masuk / daftar (js/auth.js). Tidak wajib untuk membeli:
     tamu tetap bisa checkout; akun mengisi data & alamat otomatis.
     ====================================================================== */
  var XA = window.XAUTH;
  var me = function () { return XA ? XA.user() : null; };
  var initial = function (n) { return String(n || '?').trim().charAt(0).toUpperCase() || '?'; };
  var PROV_ICON = { whatsapp: 'W', google: 'G', email: '@', instagram: 'I' };
  function provHtml() {
    return '<div class="prov">' + (XA ? XA.providers : []).map(function (p) {
      return '<button type="button" class="p-' + p.id + '" data-auth="' + p.id + '" title="' + esc(T(p.note)) + '"><i>' + PROV_ICON[p.id] + '</i>' + esc(p.label) + '</button>';
    }).join('') + '</div>';
  }
  var authAfter = null;
  function openAuth(after, pre) {
    authAfter = after || null;
    openModal('<header class="ph"><span class="ph__n"><svg><use href="#i-user"/></svg></span><div><p class="ph__e">' + T('Akun') + '</p><p class="ph__t">' + T('Masuk atau daftar') + '</p></div></header>' +
      '<p class="txt lede">' + T('Data & alamat Anda tersimpan, checkout berikutnya terisi otomatis. Rancangan Customize ikut tersimpan.') + '</p>' + provHtml() +
      '<p class="note" style="margin-top:14px">' + T('Mode pratinjau: akun disimpan di perangkat ini. Versi live memakai kode WhatsApp / akun Google sungguhan.') + '</p>', 'modal--sm');
    if (pre) authForm(pre);
  }
  function authForm(id) {
    var pv = XA.providers.filter(function (p) { return p.id === id; })[0], u = me() || {}, co = coState.form || {};
    var fld = function (k) {
      var lab = { name: T('Nama'), phone: 'WhatsApp', email: 'Email', instagram: 'Instagram' }[k], val = u[k] || co[k] || '';
      return '<label class="fld fld--full"><span>' + lab + '</span><input data-af="' + k + '" value="' + esc(val) + '"' + (k === 'phone' ? ' inputmode="tel" autocomplete="tel"' : k === 'email' ? ' type="email" autocomplete="email"' : k === 'name' ? ' autocomplete="name"' : ' placeholder="@username"') + '></label>';
    };
    openModal('<header class="ph"><span class="ph__n">' + PROV_ICON[id] + '</span><div><p class="ph__e">' + T('Masuk dengan') + '</p><p class="ph__t">' + esc(pv.label) + '</p></div></header>' +
      '<form class="form" id="authForm" data-p="' + id + '"><div class="fgrid">' + pv.needs.map(fld).join('') + '</div>' +
      '<p class="note">' + T(pv.note) + (id === 'instagram' ? ' — ' + T('Meta hanya mengizinkan akun bisnis/kreator untuk login di situs lain; WhatsApp atau Google lebih disarankan.') : '') + '</p>' +
      '<button class="btn btn--gold btn--full" type="submit"><span>' + T('Lanjut') + '</span><svg><use href="#i-arrow"/></svg></button>' +
      '<button class="btn btn--ghost btn--full" type="button" data-auth-back><span>' + T('Pilih cara lain') + '</span></button></form>', 'modal--sm');
    var first = modalBody.querySelector('input'); if (first && !first.value) first.focus();
  }
  function authSubmit(form) {
    var id = form.dataset.p, data = {};
    $$('[data-af]', form).forEach(function (i) { data[i.dataset.af] = i.value.trim(); });
    var bad = !data.name || (data.phone != null && data.phone.replace(/\D/g, '').length < 8) || (data.email != null && !/^\S+@\S+\.\S+$/.test(data.email));
    $$('[data-af]', form).forEach(function (i) { var k = i.dataset.af, v = data[k]; i.parentNode.classList.toggle('is-err', !v || (k === 'phone' && v.replace(/\D/g, '').length < 8) || (k === 'email' && !/^\S+@\S+\.\S+$/.test(v))); });
    if (bad) return;
    XA.signIn(id, data).then(function (u) {
      closeModal(); notice(T('Selamat datang, {name}', { name: u.name.split(' ')[0] }));
      var f = authAfter; authAfter = null; if (f) f(u);
    });
  }
  window.addEventListener('xauth:change', function () { renderMe(); renderProfile(); if (current === 'bayar') renderCo(true); });
  function renderMe() {
    var u = me(), b = $('#userBtn');
    b.innerHTML = u ? '<span class="av">' + esc(initial(u.name)) + '</span>' : '<svg><use href="#i-user"/></svg>';
  }

  /* ======================================================================
     CHECKOUT — satu halaman: pesanan · kontak · alamat · pengiriman · pembayaran
     Harga produk & rancangan sudah final; ongkir & pemasangan dihitung dari alamat.
     Gateway pembayaran: js/pay.js (XPAY.pay)
     ====================================================================== */
  var XPAY = window.XPAY || { methods: [], zones: [], pay: function (o) { return Promise.resolve({ status: 'pending', ref: o.id }); } };
  var coState = { items: [], from: 'tas', form: {}, addrId: null, newAddr: false, zone: null, install: false, method: null, done: null, busy: false };
  function openPay(items, from) {
    var u = me(), cst = store.get('xv5_customer', {});
    coState.items = items.map(function (e) { return JSON.parse(JSON.stringify(e)); });
    coState.from = from; coState.done = null; coState.busy = false;
    coState.form = Object.assign({ label: 'Rumah' }, cst, coState.form.name ? coState.form : {});
    if (u) { ['name', 'phone', 'email'].forEach(function (k) { if (u[k]) coState.form[k] = u[k]; }); var pa = XA.primary(); coState.addrId = pa ? pa.id : null; coState.newAddr = !pa; }
    else { coState.addrId = null; coState.newAddr = true; }
    renderCo();
    if (current !== 'bayar') go('bayar');
    $('#payScroll').scrollTop = 0;
  }
  function coLines() { return coState.items.map(line).filter(Boolean); }
  function coAddr() { var u = me(); if (u && coState.addrId && !coState.newAddr) return (u.addresses || []).filter(function (a) { return a.id === coState.addrId; })[0] || null; return null; }
  function coZone() { var a = coAddr(), z = a ? a.zone : coState.form.zone; return XPAY.zones.filter(function (x) { return x.id === z; })[0] || null; }
  function coCalc() {
    var lines = coLines(), sub = sumOf(lines), z = coZone(), ship = z ? z.cost : null, inst = coState.install ? XPAY.install.cost : 0;
    return { lines: lines, sub: sub, zone: z, ship: ship, inst: inst, total: sub + (ship || 0) + inst };
  }
  function eta(z) {
    if (!z) return '';
    var custom = coLines().some(function (l) { return l.custom; }), pr = XPAY.production[custom ? 'custom' : 'ready'];
    var d = function (n) { var t = new Date(Date.now() + n * 864e5); return t.toLocaleDateString(I18N && I18N.lang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short' }); };
    return d(pr[0] + z.days[0]) + ' – ' + d(pr[1] + z.days[1]);
  }
  var fv = function (k) { return esc(coState.form[k] || ''); };
  function renderCo(keep) {
    var box = $('#coBody'), sc = $('#payScroll'), top = sc.scrollTop;
    if (coState.done) { box.innerHTML = coDoneHtml(coState.done); return; }
    var u = me(), k = coCalc();
    if (!k.lines.length) { box.innerHTML = '<div class="empty-card is-on"><p class="txt">' + T('Tas masih kosong.') + '</p><a class="btn btn--line" href="#/koleksi" data-go="koleksi"><span>' + T('Lihat koleksi') + '</span></a></div>'; return; }
    var hasContact = coState.form.name && (coState.form.phone || '').replace(/\D/g, '').length >= 8;
    var html = '';
    // 1 · pesanan
    html += '<section class="co-sec"><p class="co-h"><i>1</i>' + T('Pesanan') + '<button type="button" class="mini" data-co-back>' + (coState.from === 'tas' ? T('Ubah tas') : T('Kembali')) + '</button></p><ul class="list">' + k.lines.map(function (l) { return lineHtml(l, false); }).join('') + '</ul></section>';
    // 2 · kontak
    html += '<section class="co-sec"><p class="co-h' + (hasContact ? ' is-done' : '') + '"><i>2</i>' + T('Kontak') + (u ? '<button type="button" class="mini" data-go="profil">' + T('Ubah') + '</button>' : '') + '</p>';
    if (u) html += '<div class="who"><span class="who__av">' + esc(initial(u.name)) + '</span><div><b>' + esc(u.name) + '</b><span>' + esc([u.phone, u.email].filter(Boolean).join(' · ')) + '</span></div><span class="tag">' + esc((XA.providers.filter(function (p) { return p.id === u.provider; })[0] || {}).label || '') + '</span></div>';
    else html += '<p class="note" style="margin-bottom:10px">' + T('Isi otomatis dengan akun') + '</p>' + provHtml() + '<p class="or">' + T('atau sebagai tamu') + '</p>' +
      '<div class="fgrid"><label class="fld"><span>' + T('Nama') + '</span><input data-cf="name" value="' + fv('name') + '" autocomplete="name"></label>' +
      '<label class="fld"><span>WhatsApp</span><input data-cf="phone" value="' + fv('phone') + '" inputmode="tel" autocomplete="tel"></label>' +
      '<label class="fld fld--full"><span>' + T('Email (opsional)') + '</span><input data-cf="email" value="' + fv('email') + '" type="email" autocomplete="email"></label></div>';
    html += '</section>';
    // 3 · alamat
    var addrs = u ? (u.addresses || []) : [];
    html += '<section class="co-sec"><p class="co-h' + (coAddr() || coState.form.address ? ' is-done' : '') + '"><i>3</i>' + T('Alamat pengiriman') + (addrs.length ? '<button type="button" class="mini" data-new-addr>' + (coState.newAddr ? T('Alamat tersimpan') : '+ ' + T('Alamat baru')) + '</button>' : '') + '</p>';
    if (addrs.length && !coState.newAddr) html += addrs.map(function (a) { return addrHtml(a, a.id === coState.addrId, true); }).join('');
    else html += addrForm(!!u);
    html += '</section>';
    // 4 · pengiriman
    var z = k.zone;
    html += '<section class="co-sec"><p class="co-h' + (z ? ' is-done' : '') + '"><i>4</i>' + T('Pengiriman') + '</p><div class="opts">' +
      '<div class="opt-c is-on"><i></i><span><b>' + T('Kurir XIONCO') + '</b><em>' + (z ? esc(T(z.label)) + ' · ' + T('tiba') + ' ' + eta(z) : T('Pilih wilayah di alamat untuk menghitung ongkir')) + '</em></span><strong>' + (!z ? '—' : z.cost == null ? T('Dikonfirmasi') : z.cost ? rupiah(z.cost) : T('Gratis')) + '</strong></div>' +
      '<button type="button" class="opt-c' + (coState.install ? ' is-on' : '') + '" data-install><i></i><span><b>' + T(XPAY.install.label) + '</b><em>' + T('Tim kami merakit & memasang di lokasi') + '</em></span><strong>' + rupiah(XPAY.install.cost) + '</strong></button></div></section>';
    // 5 · pembayaran
    html += '<section class="co-sec"><p class="co-h' + (coState.method ? ' is-done' : '') + '"><i>5</i>' + T('Pembayaran') + '</p><div class="opts">' + (XPAY.methods || []).map(function (m) {
      return '<button type="button" class="opt-c' + (m.id === coState.method ? ' is-on' : '') + '" data-m="' + m.id + '"><i></i><span><b>' + esc(T(m.label)) + '</b><em>' + esc(T(m.note || '')) + '</em></span></button>';
    }).join('') + '</div></section>';
    // ringkasan & bayar
    html += '<section class="co-sec co-sum"><dl class="kv"><dt>' + T('Subtotal') + '</dt><dd>' + rupiah(k.sub) + '</dd><dt>' + T('Ongkir') + '</dt><dd>' + (!z ? '—' : k.ship == null ? T('Dikonfirmasi') : k.ship ? rupiah(k.ship) : T('Gratis')) + '</dd>' +
      (k.inst ? '<dt>' + T('Pemasangan') + '</dt><dd>' + rupiah(k.inst) + '</dd>' : '') + '</dl>' +
      '<p class="note" id="payNote">' + T('Pembayaran diproses aman melalui payment gateway resmi.') + '</p></section>';
    html += '<div class="foot foot--bar"><div class="co-total"><span class="eyebrow">' + T('Total') + '</span><b class="price">' + rupiah(k.total) + '</b></div>' +
      '<button class="btn btn--gold" type="button" data-pay' + (coState.busy ? ' disabled' : '') + '><svg><use href="#i-card"/></svg><span>' + (coState.busy ? T('Memproses…') : T('Bayar')) + '</span></button></div>';
    box.innerHTML = html;
    cutThumbs(box);
    sc.scrollTop = keep ? top : 0;
  }
  function addrHtml(a, on, pick) {
    var z = XPAY.zones.filter(function (x) { return x.id === a.zone; })[0];
    return '<' + (pick ? 'button type="button" data-addr="' + a.id + '"' : 'div') + ' class="addr' + (on ? ' is-on' : '') + '"><i></i><span><b>' + esc(T(a.label || 'Alamat')) + (a.primary ? ' <span class="tag tag--gold">' + T('Utama') + '</span>' : '') + (a.geo ? ' <span class="tag tag--ok">GPS</span>' : '') + '</b>' +
      '<span>' + esc(a.name) + ' · ' + esc(a.phone) + '</span><span>' + esc(a.address) + ', ' + esc(a.city) + (a.zip ? ' ' + esc(a.zip) : '') + (z ? ' — ' + esc(T(z.label)) : '') + '</span></span>' + (pick ? '' : '<span></span>') + '</' + (pick ? 'button' : 'div') + '>';
  }
  function addrForm(user) {
    var f = coState.form;
    return '<div class="fgrid">' +
      '<div class="fld fld--full"><span>' + T('Simpan sebagai') + '</span><div class="seg seg--sm" data-addr-label>' + ['Rumah', 'Kantor', 'Lainnya'].map(function (x) { return '<button type="button" data-v="' + x + '" class="' + ((f.label || 'Rumah') === x ? 'is-on' : '') + '">' + T(x) + '</button>'; }).join('') + '</div></div>' +
      '<label class="fld"><span>' + T('Penerima') + '</span><input data-cf="recipient" value="' + esc(f.recipient || f.name || '') + '" autocomplete="name"></label>' +
      '<label class="fld"><span>' + T('HP penerima') + '</span><input data-cf="rphone" value="' + esc(f.rphone || f.phone || '') + '" inputmode="tel"></label>' +
      '<div class="fld fld--full"><span>' + T('Alamat lengkap') + '</span><div class="fld__in"><textarea data-cf="address" rows="2" autocomplete="street-address" placeholder="' + T('Jalan, nomor, RT/RW, kelurahan') + '">' + fv('address') + '</textarea>' +
        '<button type="button" class="fld__act' + (f.geo ? ' is-on' : '') + '" data-geo><svg><use href="#i-pin"/></svg>' + (f.geo ? T('Lokasi tersimpan') : T('Lokasi saya')) + '</button></div></div>' +
      '<label class="fld"><span>' + T('Wilayah') + '</span><select data-cf="zone"><option value="">' + T('Pilih wilayah') + '</option>' + XPAY.zones.map(function (z) { return '<option value="' + z.id + '"' + (f.zone === z.id ? ' selected' : '') + '>' + esc(T(z.label)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>' + T('Kota / kabupaten') + '</span><input data-cf="city" value="' + fv('city') + '" autocomplete="address-level2"></label>' +
      '<label class="fld"><span>' + T('Kode pos') + '</span><input data-cf="zip" value="' + fv('zip') + '" inputmode="numeric" autocomplete="postal-code"></label>' +
      '<label class="fld"><span>' + T('Catatan kurir') + '</span><input data-cf="note" value="' + fv('note') + '" placeholder="' + T('Lantai, patokan') + '"></label>' +
      (user ? '<label class="check fld--full"><input type="checkbox" data-save-addr' + (coState.form.saveAddr !== false ? ' checked' : '') + '>' + T('Simpan alamat ini ke akun') + '</label>' : '') + '</div>';
  }
  var payBox = $('#coBody');
  payBox.addEventListener('input', function (e) {
    var k = e.target.dataset.cf; if (!k) return;
    coState.form[k] = e.target.value;
    if (k === 'zone') renderCo(true);
  });
  payBox.addEventListener('change', function (e) {
    if (e.target.dataset.cf === 'zone') { coState.form.zone = e.target.value; renderCo(true); }
    if (e.target.hasAttribute('data-save-addr')) coState.form.saveAddr = e.target.checked;
  });
  payBox.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-auth]'))) { authForm(b.dataset.auth); authAfter = function () { openPay(coState.items, coState.from); }; return; }
    if (e.target.closest('[data-co-back]')) { if (coState.from === 'tas') go('tas'); else if (coState.from === 'customize') go('customize'); else if (kList[kI]) openProduct(kList[kI]); else go('koleksi'); return; }
    if ((b = e.target.closest('[data-addr]'))) { coState.addrId = b.dataset.addr; renderCo(true); return; }
    if (e.target.closest('[data-new-addr]')) { coState.newAddr = !coState.newAddr; renderCo(true); return; }
    if ((b = e.target.closest('[data-addr-label] [data-v]'))) { coState.form.label = b.dataset.v; renderCo(true); return; }
    if (e.target.closest('[data-install]')) { coState.install = !coState.install; renderCo(true); return; }
    if ((b = e.target.closest('[data-m]'))) { coState.method = b.dataset.m; renderCo(true); return; }
    if (e.target.closest('[data-geo]')) { coGeo(); return; }
    if (e.target.closest('[data-pay]')) { coPay(); return; }
    if ((b = e.target.closest('[data-save-acc]'))) { coSaveAccount(b.dataset.saveAcc); return; }
  });
  function coGeo() {
    if (!navigator.geolocation) { notice(T('Lokasi tidak tersedia di perangkat ini')); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      coState.form.geo = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
      notice(T('Lokasi tersimpan — kurir memakai titik ini')); renderCo(true);
    }, function () { notice(T('Izin lokasi ditolak')); }, { timeout: 8000 });
  }
  function coPay() {
    if (coState.busy) return;
    var u = me(), f = coState.form, note = $('#payNote'), a = coAddr();
    var contact = u ? { name: u.name, phone: u.phone || f.phone || '', email: u.email || f.email || '' } : { name: (f.name || '').trim(), phone: (f.phone || '').replace(/[^\d+]/g, ''), email: (f.email || '').trim() };
    var addr = a || { label: f.label || 'Rumah', name: (f.recipient || contact.name || '').trim(), phone: (f.rphone || contact.phone || '').trim(), address: (f.address || '').trim(), city: (f.city || '').trim(), zone: f.zone, zip: (f.zip || '').trim(), note: (f.note || '').trim(), geo: f.geo || null };
    var miss = [];
    if (!contact.name) miss.push(T('nama')); if (String(contact.phone).replace(/\D/g, '').length < 8) miss.push('WhatsApp');
    if (!addr.address) miss.push(T('alamat')); if (!addr.city) miss.push(T('kota')); if (!addr.zone) miss.push(T('wilayah'));
    if (!coState.method) miss.push(T('metode pembayaran'));
    $$('[data-cf]', payBox).forEach(function (i) { var k = i.dataset.cf; i.closest('.fld') && i.closest('.fld').classList.toggle('is-err', (k === 'name' && !contact.name) || (k === 'phone' && String(contact.phone).replace(/\D/g, '').length < 8) || (k === 'address' && !addr.address) || (k === 'city' && !addr.city) || (k === 'zone' && !addr.zone)); });
    if (miss.length) { note.textContent = T('Lengkapi: {x}', { x: miss.join(', ') }); note.classList.add('is-err'); var bad = $('.fld.is-err', payBox) || (!coState.method && $('[data-m]', payBox)) || note; bad.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); notice(note.textContent); return; }
    if (!addr.name) addr.name = contact.name; if (!addr.phone) addr.phone = contact.phone;
    store.set('xv5_customer', { name: contact.name, phone: contact.phone, email: contact.email, address: addr.address, city: addr.city, zip: addr.zip, zone: addr.zone, label: addr.label });
    if (u && !a && coState.form.saveAddr !== false) { var sa = XA.saveAddress(Object.assign({}, addr)); coState.addrId = sa.id; coState.newAddr = false; }
    var k = coCalc();
    var order = {
      id: 'XC-' + Date.now().toString(36).toUpperCase(), created: Date.now(), account: u ? u.id : null,
      items: k.lines.map(function (l) { return { id: l.p.id, name: l.p.name, variant: l.c.label, qty: l.q, price: l.c.price, custom: l.custom ? l.e.cfg : undefined, adjust: l.e.pc || undefined }; }),
      subtotal: k.sub, shipping: k.ship, install: k.inst, total: k.total, customer: contact, address: addr, method: coState.method, eta: eta(k.zone)
    };
    coState.busy = true; renderCo(true);
    Promise.resolve(XPAY.pay(order)).catch(function () { return { status: 'failed' }; }).then(function (res) {
      coState.busy = false; res = res || {};
      order.status = res.status === 'paid' ? 'paid' : res.status === 'failed' ? 'failed' : 'pending';
      if (order.status === 'failed') { renderCo(true); var n2 = $('#payNote'); n2.textContent = T('Pembayaran gagal. Silakan coba lagi atau pilih metode lain.'); n2.classList.add('is-err'); return; }
      var orders = store.get('xv5_orders', []); orders.unshift(order); store.set('xv5_orders', orders.slice(0, 50));
      if (coState.from === 'tas') { k.lines.forEach(function (l) { delete bag[l.key]; }); renderBag(); }
      coState.done = order; renderCo(); $('#payScroll').scrollTop = 0; renderProfile();
    });
  }
  function coDoneHtml(o) {
    var mlab = T(((XPAY.methods || []).filter(function (m) { return m.id === o.method; })[0] || {}).label || o.method);
    var msg = T('Halo XIONCO, saya ingin menyelesaikan pembayaran pesanan {id}:', { id: o.id }) + '\n' + o.items.map(function (i) { return '• ' + i.name + (i.variant ? ' (' + i.variant + ')' : '') + ' × ' + i.qty + ' — ' + rupiah(i.price * i.qty); }).join('\n') +
      '\n\n' + T('Total') + ': ' + rupiah(o.total) + '\n' + T('Metode') + ': ' + mlab + '\n' + T('Kirim ke') + ': ' + o.address.name + ', ' + o.address.address + ', ' + o.address.city + (o.address.geo ? ' (GPS ' + o.address.geo.lat + ',' + o.address.geo.lng + ')' : '');
    return '<div class="done"><svg><use href="#i-check"/></svg><p class="ph__t">' + (o.status === 'paid' ? T('Pembayaran berhasil') : T('Pesanan tersimpan')) + '</p>' +
      '<p class="txt">' + (o.status === 'paid' ? T('Nomor pesanan {id}. Terima kasih — tim kami segera memproses pesanan Anda.', { id: o.id }) : T('Nomor pesanan {id}. Pembayaran online segera aktif — selesaikan pembayaran dengan konfirmasi melalui WhatsApp.', { id: o.id })) + '</p>' +
      '<dl class="kv" style="width:100%"><dt>' + T('Total') + '</dt><dd>' + rupiah(o.total) + '</dd><dt>' + T('Perkiraan tiba') + '</dt><dd>' + esc(o.eta || '—') + '</dd><dt>' + T('Kirim ke') + '</dt><dd>' + esc(o.address.city) + '</dd></dl>' +
      '<a class="btn btn--gold" href="' + wa(msg) + '" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg><span>' + T('Konfirmasi via WhatsApp') + '</span></a>' +
      (!me() ? '<div class="card" style="width:100%"><p class="sh"><span>' + T('Simpan data Anda') + '</span></p><p class="txt" style="margin-bottom:12px">' + T('Satu ketukan — berikutnya nama, kontak & alamat terisi otomatis.') + '</p><div class="btns"><button class="btn btn--line" type="button" data-save-acc="whatsapp"><span>WhatsApp</span></button><button class="btn btn--line" type="button" data-save-acc="google"><span>Google</span></button></div></div>' : '') +
      '<a class="lnk" href="#/profil" data-go="profil"><span>' + T('Lihat pesanan saya') + '</span><svg><use href="#i-arrow"/></svg></a></div>';
  }
  // setelah membeli sebagai tamu: data yang sudah diisi langsung jadi akun (tanpa mengetik ulang)
  function coSaveAccount(pv) {
    var o = coState.done; if (!o || !XA) return;
    XA.signIn(pv, { name: o.customer.name, phone: o.customer.phone, email: o.customer.email }).then(function () {
      var a = Object.assign({}, o.address); delete a.id; XA.saveAddress(a);
      var orders = store.get('xv5_orders', []); orders.forEach(function (x) { if (x.id === o.id) x.account = me().id; }); store.set('xv5_orders', orders);
      notice(T('Akun dibuat — data & alamat tersimpan')); renderCo();
    });
  }
  enter.bayar = function () { if (!coLines().length && !coState.done) { if (bagLines().length) openPay(Object.keys(bag).map(function (k) { return bag[k]; }), 'tas'); else go('tas'); } };

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
  try { cz = store.get('xv5_cz', null); if (cz) { XC.sub(cz); XC.normalize(cz); } } catch (e) { cz = null; }
  if (!cz || !cz.cat) cz = XC.defaults('kursi', 'sofa');
  var czSave = function () { store.set('xv5_cz', cz); };
  var cut15 = function (t) { t = String(t); return t.length > 15 ? t.slice(0, 14).replace(/\s+$/, '') + '…' : t; };
  // label kotak pilihan ≤ 15: s (Indonesia) / se (English) bila label lengkap terlalu panjang; warna kain: s = tanpa nama lini
  var shortL = function (x) { return I18N && I18N.lang() === 'en' ? (x.se || (x.s && x.en === x.l ? x.s : L(x))) : (x.s || x.l); };
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
  // skrip uji: pasang konfigurasi Customize langsung (mis. XVCustom({ cat: 'meja', sub: 'desk', ... }))
  window.XVCustom = function (cfg) { cz = XC.normalize(Object.assign(XC.defaults(cfg.cat, cfg.sub), cfg)); czSave(); if (current === 'customize') { czRender(); czStage(); } return JSON.parse(JSON.stringify(cz)); };
  function czTitle(lang) {
    var Lx = lang === 'id' ? function (o) { return o.l; } : L, sb = XC.sub(cz);
    var g = XC.groups(cz, 'bentuk').filter(function (x) { return x.id === 'shape' || x.id === 'topShape' || x.id === 'form'; })[0], o = g && XC.pick(g, cz);
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
      priceK: T('Harga') + ' · ' + T('rincian'), price: rupiah(czUnit() * (cz.qty || 1)), priceFn: czBreakdown,
      act: current !== 'customize' ? { t: 'Customize', icon: 'i-ruler', fn: function () { go('customize'); } } : { t: T('Tambah ke tas'), icon: 'i-bag', fn: czAddToBag }
    });
  }

  // harga per unit (final) & kaki panel Customize
  function czUnit() { var q = cz.qty; cz.qty = 1; var v = XC.estimate(cz); cz.qty = q; return v; }
  function czFoot() {
    var el = $('#czFoot'); if (!el) return;
    el.innerHTML = '<button type="button" class="cz__price" data-breakdown><em>' + T('Harga · rincian') + '</em><b>' + rupiah(czUnit()) + '</b></button>' +
      '<button class="btn btn--line btn--ic" type="button" data-cz-save title="' + T('Simpan') + '" aria-label="' + T('Simpan') + '"><svg><use href="#i-heart"/></svg></button>' +   // ikon saja: harga tidak bertabrakan
      '<button class="btn btn--line btn--ic" type="button" data-cz-room title="' + T('Tambah ke ruang') + '" aria-label="' + T('Tambah ke ruang') + '"><svg><use href="#i-room"/></svg></button>' +
      '<button class="btn btn--gold" type="button" data-cz-add><svg><use href="#i-bag"/></svg><span>' + T('Ke tas') + '</span></button>';
  }
  function czEntry() {
    return { id: 'cz-' + Date.now().toString(36), type: 'custom', title: czTitle(), sub: XC.dimsText(cz), mat: czMat(), cfg: JSON.parse(JSON.stringify(cz)), price: czUnit(), img: XW.snapshot ? XW.snapshot(220) : '', q: 1, base: czBase };
  }
  function czAddToBag() { addEntry(czEntry()); }
  function czBuyNow() { openPay([czEntry()], 'customize'); }
  function czSaveDesign() {
    var e = czEntry(), list = designs();
    list.unshift({ id: 'D' + Date.now().toString(36).toUpperCase(), created: Date.now(), title: e.title, sub: e.sub, mat: e.mat, cfg: e.cfg, price: e.price, img: e.img, base: czBase });
    store.set('xv5_designs', list.slice(0, 30));
    renderProfile();
    notice(me() ? T('Rancangan tersimpan di akun Anda') : T('Rancangan tersimpan · Profil › Rancangan'));
  }
  function openDesign(d) {
    czBase = d.base || null; czView = 'design'; czPick = null;
    cz = XC.normalize(JSON.parse(JSON.stringify(d.cfg))); czSave();
    if (current !== 'customize') go('customize'); else { czRender(); czStage(); }
  }
  $('#czFoot').addEventListener('click', function (e) {
    if (e.target.closest('[data-breakdown]')) czBreakdown();
    else if (e.target.closest('[data-cz-save]')) czSaveDesign();
    else if (e.target.closest('[data-cz-add]')) czAddToBag();
    else if (e.target.closest('[data-cz-room]')) { var en = czEntry(); roomAdd({ kind: 'custom', title: en.title, sub: en.sub, mat: en.mat, cfg: en.cfg, price: en.price, img: en.img }); }
  });
  $('#pdRoom').addEventListener('click', function () { var p = kList[kI]; if (!p) return; var s = selOf(p), c = cur(p, s), pc = pcFor(p), e = { kind: 'product', pid: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, title: p.name, sub: c.label || p.type, img: src(c.img || p.img, 400) }; if (pcChanged(pc)) e.pc = { w: pc.w, d: pc.d, w0: pc.w0, d0: pc.d0, metal: pc.metal, metal0: pc.metal0 }; roomAdd(e); });

  /* ---------- kartu pilihan 3:4 — atas 1:1 gambar garis (atau contoh warna/bahan), bawah label
     Gambar garis: assets/cz-icons (dibuat oleh tools/icons/build.js), tampil lewat CSS mask sehingga
     warnanya mengikuti tema (emas saat dipilih). Dimuat saat kartu mendekati layar. */
  // alamat absolut: url() di dalam variabel CSS dibaca relatif terhadap file CSS, bukan halaman
  var CZI = { base: (function () { try { return new URL('../assets/cz-icons/', location.href).href; } catch (e) { return '../assets/cz-icons/'; } })(), man: null, seen: {}, io: null };
  try {
    fetch(CZI.base + 'manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (!m || !m.subs) return; CZI.man = m;
      if (current === 'customize') czRender(true);
    }).catch(function () {});
  } catch (e) {}
  function czIcon(gr, x) {
    var m = CZI.man, rel = null; if (!m) return null;
    if (gr.id === '_cat') rel = m.jenis[x.id] ? '_jenis/' + x.id : null;
    else if (gr.id === '_sub') rel = m.jenis[cz.cat + '/' + x.id] ? '_jenis/' + cz.cat + '__' + x.id : null;
    else {
      var s = m.subs[cz.cat + '/' + cz.sub], e = s && s[gr.id + '__' + x.id], ss = cz.sub, as = XC.sub(cz).iconAs;
      if (e == null && as && m.subs[cz.cat + '/' + as]) { e = m.subs[cz.cat + '/' + as][gr.id + '__' + x.id]; ss = as; }   // sub baru: pinjam gambar sub serupa (spec: iconAs)
      if (e != null) rel = e || cz.cat + '/' + ss + '/' + gr.id + '__' + x.id;
    }
    return rel ? CZI.base + rel + '.png?v=' + m.v : null;
  }
  // contoh bahan untuk kelompok warna: kain (kulit / bouclé / beludru), kayu, logam, batu, warna HPL
  function czSwatch(gr, x) {
    var k = '', u = gr.id === 'color' || gr.id === 'color2' ? XC.find(XC.UPH, cz.uph) : null;
    if (u) k = u.leather ? 'is-leather' : u.nap ? 'is-' + u.nap : 'is-weave';
    else if (gr.id === 'wood' || x.grain) k = 'is-wood';
    else if (gr.id === 'metal') k = 'is-metal';
    else if (x.speck) k = 'is-speck';
    else if (x.vein) k = 'is-stone';
    return '<span class="cz-card__f"><i class="cz-sw ' + k + '" style="--c:' + x.hex + (x.vein ? ';--v:' + x.vein : '') + '"></i></span>';
  }
  function cell(gr, x, on, multi) {
    var full = L(x) + (x.add ? ' (+' + short(x.add) + ')' : ''), fig = '', kind = 'is-tx';
    if (x.hex) { fig = czSwatch(gr, x); kind = 'is-sw'; }
    else {
      var u = czIcon(gr, x);
      if (u) { kind = 'is-ic'; fig = '<span class="cz-card__f"><i class="cz-card__m' + (CZI.seen[u] ? ' is-m" style="--m:url(\'' + u + '\')' : '') + '" data-m="' + esc(u) + '"></i></span>'; }
      else if (x.svg) { kind = 'is-ic'; fig = '<span class="cz-card__f">' + x.svg + '</span>'; }   // gambar garis SVG dari spesifikasi (pilihan tanpa render)
    }
    return '<button type="button" class="cz-o cz-card ' + kind + (on ? ' is-on' : '') + '" data-v="' + x.id + '" title="' + esc(full) + '">' + fig +
      (multi ? '<i class="cz-o__k"></i>' : '') + '<span class="cz-card__l"><span>' + esc(cut15(shortL(x))) + '</span></span></button>';
  }
  // gambar garis dimuat saat kartu mendekati area gulir (panel atau kotak pilihan Box 2)
  function czLazy(root) {
    var list = $$('.cz-card__m:not(.is-m)', root); if (!list.length) return;
    var show = function (el) { var u = el.getAttribute('data-m'); el.style.setProperty('--m', 'url(\'' + u + '\')'); el.classList.add('is-m'); CZI.seen[u] = 1; };
    if (!('IntersectionObserver' in window)) { list.forEach(show); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { root: root.closest('#czScroll, #czPicker') || null, rootMargin: '240px 0px' });
    list.forEach(function (el) { io.observe(el); });
    if (root === $('#czBody')) { if (CZI.io) CZI.io.disconnect(); CZI.io = io; }
  }
  function selText(gr) {
    var v = cz[gr.id];
    if (gr.type === 'range') return czVal(gr, v);
    if (gr.type === 'multi') { var n = (v || []).length; return n ? XC.opts(gr, cz).filter(function (o) { return v.indexOf(o.id) >= 0; }).map(L).join(', ') : T('Tidak ada'); }
    var o = XC.pick(gr, cz); return o ? L(o) : '—';
  }
  function czGroup(gr, box2) {
    if (gr.type === 'layout') return czLayEd(gr);   // editor susunan kolom (kabinet)
    var head = function (b) { return '<p class="cz-g__h"><span>' + esc(L(gr)) + '</span><b' + (b ? ' data-out' : '') + '>' + esc(selText(gr)) + '</b></p>'; };
    if (gr.type === 'range') return '<div class="cz-g" data-g="' + gr.id + '">' + head(true) + '<input class="rng" type="range" style="--p:' + ((cz[gr.id] - gr.min) / (gr.max - gr.min) * 100).toFixed(1) + '%" min="' + gr.min + '" max="' + gr.max + '" step="' + gr.inc + '" value="' + cz[gr.id] + '" data-r="' + gr.id + '" aria-label="' + esc(L(gr)) + '"><p class="rng__ends"><span>' + esc(czVal(gr, gr.min)) + '</span><span>' + esc(czVal(gr, gr.max)) + '</span></p></div>';
    var o = XC.opts(gr, cz), multi = gr.type === 'multi';
    if (box2 && o.length > 4) return '<button type="button" class="cz-row' + (czPick === gr.id ? ' is-on' : '') + '" data-pick="' + gr.id + '"><span>' + esc(L(gr)) + '</span><b>' + esc(selText(gr)) + '</b><svg><use href="#i-arrow"/></svg></button>';
    return '<div class="cz-g" data-g="' + gr.id + '"' + (multi ? ' data-multi' : '') + '>' + head() + '<div class="cz-grid">' +
      o.map(function (x) { return cell(gr, x, multi ? (cz[gr.id] || []).indexOf(x.id) >= 0 : x.id === cz[gr.id], multi); }).join('') + '</div></div>';
  }
  /* ---------- editor susunan kolom (kabinet): jumlah kolom → tampak depan (kolom bisa diklik, terpilih = emas)
     → isi kolom terpilih (kartu 3:4 bergambar garis) → jumlah / posisi / rak / lebar → preset. Data: cz.layout (spec-kabinet.js) */
  var czCol = 0, czColSub = '';
  function czLayEd(gr) {
    var KB = window.XKAB; if (!KB) return '';
    var sub = cz.sub, lay = (cz.layout || []).map(function (q) { return KB.canonCol(q, sub); }), n = lay.length || 1;
    if (czColSub !== sub) { czColSub = sub; czCol = 0; }
    czCol = Math.max(0, Math.min(n - 1, czCol));
    var col = lay[czCol] || KB.newCol(KB.SUBK[sub][0], sub), kd = KB.KIND[col.k], max = KB.MAXC[sub] || 6;
    var Wm = (+cz.w || 100) / 100, ihM = (+cz.h || 80) / 100 - 2 * KB.T, ws = KB.colWidths(Wm, lay), ds = cz.doorStyle;
    var card = function (act, svg, label, on, title) { return '<button type="button" class="cz-o cz-card is-ic' + (on ? ' is-on' : '') + '" data-lay="' + act + '" title="' + esc(title || label) + '"><span class="cz-card__f">' + svg + '</span><span class="cz-card__l"><span>' + esc(cut15(label)) + '</span></span></button>'; };
    // satu kolom digambar di kotak 100×100 dengan proporsi kolom terpilih
    var colIco = function (c2) {
      var cw = ws[czCol] || .5, sc = Math.min(80 / cw, 80 / ihM), w = cw * sc, h = ihM * sc, x = 50 - w / 2, y = 50 - h / 2;
      return KB.svgOpen('0 0 100 100') + KB.R(x - 1.5, y - 1.5, w + 3, h + 3) + KB.colSVG(c2, sub, x, y, w, h, ihM, cw, czCol >= n / 2 && n > 1, ds) + '</svg>';
    };
    var withP = function (k, v) { var o = {}; for (var q in col) o[q] = col[q]; o[k] = v; return KB.canonCol(o, sub); };
    var H2 = function (o, val) { return '<p class="kx-h"><span>' + esc(L(o)) + '</span>' + (val != null ? '<b>' + esc(val) + '</b>' : '') + '</p>'; };
    // tampak depan: kotak setinggi maks 170 px, lebar ≤ 300 px, proporsi W:H
    var Hm = +cz.h || 80, Wc = +cz.w || 100, sc = Math.min(300 / Wc, 170 / Hm), fw = Math.round(Wc * sc), fh = Math.max(64, Math.round(Hm * sc));
    var front = lay.map(function (q, i) {
      var cwc = ws[i] * 100, ihc = ihM * 100;
      return '<button type="button" class="kx-col' + (i === czCol ? ' is-on' : '') + '" data-lay="col:' + i + '" style="flex:' + q.wr + ' 1 0" title="' + esc(L({ l: 'Kolom', en: 'Column' }) + ' ' + (i + 1) + ' · ' + L(KB.KIND[q.k])) + '" aria-pressed="' + (i === czCol) + '">' +
        KB.svgOpen('0 0 ' + cwc.toFixed(1) + ' ' + ihc.toFixed(1)).replace('<svg ', '<svg preserveAspectRatio="none" ') + KB.colSVG(q, sub, 0, 0, cwc, ihc, ihM, ws[i], i >= n / 2 && n > 1, ds) + '</svg></button>';
    }).join('');
    var nums = lay.map(function (q, i) { return '<span style="flex:' + q.wr + ' 1 0"' + (i === czCol ? ' class="is-on"' : '') + '>' + (i + 1) + '</span>'; }).join('');
    var h = '<div class="cz-g kx-lay" data-g="layout" data-layg><p class="cz-g__h"><span>' + esc(L(gr)) + '</span><b>' + esc(n + ' ' + L({ l: 'kolom', en: n > 1 ? 'columns' : 'column' })) + '</b></p>' +
      '<div class="kx-ed" data-lay-a="front"><div class="kx-ed__bar"><span>' + esc(L({ l: 'Kolom', en: 'Columns' })) + '</span>' +
      '<div class="kx-step"><button type="button" data-lay="cols:-1"' + (n <= 1 ? ' disabled' : '') + ' aria-label="' + esc(L({ l: 'Kurangi kolom', en: 'Remove column' })) + '"><svg viewBox="0 0 12 12"><path d="M2.5 6h7"/></svg></button><b>' + n + '</b>' +
      '<button type="button" data-lay="cols:1"' + (n >= max ? ' disabled' : '') + ' aria-label="' + esc(L({ l: 'Tambah kolom', en: 'Add column' })) + '"><svg viewBox="0 0 12 12"><path d="M2.5 6h7M6 2.5v7"/></svg></button></div>' +
      '<em>' + esc(L({ l: 'Ketuk kolom untuk mengatur isinya', en: 'Tap a column to set its content' })) + '</em></div>' +
      '<div class="kx-front" style="width:min(100%,' + fw + 'px);height:' + fh + 'px">' + front + '</div><div class="kx-nums" style="width:min(100%,' + fw + 'px)">' + nums + '</div></div>';
    // isi kolom terpilih
    h += '<div data-lay-a="k">' + H2({ l: 'Isi kolom ' + (czCol + 1), en: 'Column ' + (czCol + 1) + ' content' }, L(kd)) + '<div class="cz-grid">' +
      KB.kindsFor(sub).map(function (k) { return card('k:' + k.id, colIco(KB.newCol(k.id, sub, col.wr)), shortL(k), k.id === col.k, L(k)); }).join('') + '</div></div>';
    (kd.p || []).concat(n > 1 ? ['wr'] : []).forEach(function (p) {
      var opts = [], pl = KB.paramL(p, col.k);
      if (p === 'n') for (var v = kd.n[0]; v <= kd.n[1]; v++) opts.push([v, String(v)]);
      else if (p === 'sh') for (var v2 = 0; v2 <= (kd.shMax || 6); v2++) opts.push([v2, v2 ? v2 + ' ' + L({ l: 'rak', en: v2 > 1 ? 'shelves' : 'shelf' }) : L({ l: 'Tanpa rak', en: 'No shelf' })]);
      else if (p === 'pos') kd.pos.forEach(function (id) { opts.push([id, shortL(KB.POS[id])]); });
      else KB.WR.forEach(function (o) { opts.push([+o.id, shortL(o)]); });
      var cur = col[p], curL = (opts.filter(function (o) { return o[0] === cur; })[0] || [0, ''])[1];
      h += '<div data-lay-a="' + p + '">' + H2(pl, curL) + '<div class="cz-grid">' + opts.map(function (o) {
        var svg = p === 'wr' ? KB.svgOpen('0 0 100 100') + KB.R(50 - 9 * o[0], 18, 18 * o[0], 64) + KB.Ln(50 - 9 * o[0] - 6, 50, 50 - 9 * o[0] - 2, 50) + KB.Ln(50 + 9 * o[0] + 2, 50, 50 + 9 * o[0] + 6, 50) + '</svg>' : colIco(withP(p, o[0]));
        return card(p + ':' + o[0], svg, o[1], o[0] === cur);
      }).join('') + '</div></div>';
    });
    // preset susunan
    var pr = KB.PRESETS[sub] || [], curJ = JSON.stringify(lay);
    if (pr.length) h += '<div data-lay-a="preset">' + H2({ l: 'Preset susunan', en: 'Layout presets' }) + '<div class="cz-grid">' + pr.map(function (p) {
      var cfg = { sub: sub, w: cz.w, h: cz.h, d: cz.d, mount: cz.mount, leg: cz.leg, top: cz.top, doorStyle: ds }, k2; for (k2 in p.dims || {}) cfg[k2] = p.dims[k2];
      cfg.layout = p.layout.map(function (q) { return KB.canonCol(q, sub); });
      return card('preset:' + p.id, KB.frontSVG(cfg, { base: sub === 'wall' ? 0 : 8 }), p.s || shortL(p), JSON.stringify(cfg.layout) === curJ, L(p));
    }).join('') + '</div></div>';
    return h + '</div>';
  }
  // buka pintu / tarik laci kolom terpilih di panggung (yang lain ditutup)
  function czOpenCol() {
    if (!window.XW || !XW.motions || cz.cat !== 'kabinet') return;
    var ms = XW.motions().filter(function (m) { return m.col != null && m.col >= 0; }), mine = ms.filter(function (m) { return m.col === czCol; });
    var doors = mine.filter(function (m) { return m.kind !== 'drawer'; }), pick = doors.length ? doors : mine.slice(0, 1);
    ms.forEach(function (m) { m.to = pick.indexOf(m) >= 0 ? 1 : 0; });
  }
  function czLayClick(b) {
    var KB = window.XKAB, a = b.getAttribute('data-lay'), i = a.indexOf(':'), key = a.slice(0, i), val = a.slice(i + 1);
    var sub = cz.sub, lay = (cz.layout || []).map(function (q) { return KB.canonCol(q, sub); }), sel = Math.max(0, Math.min(lay.length - 1, czCol));
    var sc = $('#czScroll'), blk = b.closest('[data-lay-a]'), aid = blk ? blk.getAttribute('data-lay-a') : null, y0 = blk ? blk.getBoundingClientRect().top : 0;
    var reopen = false;
    if (key === 'col') { czCol = +val; reopen = true; }
    else {
      if (key === 'cols') {
        if (+val > 0 && lay.length < (KB.MAXC[sub] || 6)) { var last = lay[lay.length - 1]; lay.push(KB.canonCol(JSON.parse(JSON.stringify(last)), sub)); czCol = lay.length - 1; }
        else if (+val < 0 && lay.length > 1) { lay.pop(); czCol = Math.min(czCol, lay.length - 1); }
      } else if (key === 'k') { lay[sel] = KB.newCol(val, sub, lay[sel].wr); reopen = true; }
      else if (key === 'preset') {
        var p = (KB.PRESETS[sub] || []).filter(function (x) { return x.id === val; })[0]; if (!p) return;
        for (var k2 in p.dims || {}) cz[k2] = p.dims[k2];
        lay = JSON.parse(JSON.stringify(p.layout)); czCol = 0;
      } else { lay[sel][key] = key === 'pos' ? val : +val; lay[sel] = KB.canonCol(lay[sel], sub); reopen = true; }
      XC.apply(cz, 'layout', lay);
      if (czBase && czView === 'product') czView = 'design';
      czSave(); czStage();
    }
    czRender(true);
    if (aid) { var a2 = sc.querySelector('[data-layg] [data-lay-a="' + aid + '"]'); if (a2) sc.scrollTop += a2.getBoundingClientRect().top - y0; }
    if (reopen) { if (key === 'col') czOpenCol(); else setTimeout(czOpenCol, 140); }
  }
  // kelompok "jenis" (kategori & sub) sebagai kelompok pilihan biasa
  function jenisGroups() {
    var cat = XC.CATS.filter(function (c) { return c.id === cz.cat; })[0];
    return [
      { id: '_cat', type: 'chips', l: 'Kategori', en: 'Category', opts: XC.CATS },
      { id: '_sub', type: 'chips', l: 'Jenis', en: 'Type', opts: cat.subs }
    ];
  }
  /* urutan tampil pilihan per kategori: dari yang terpenting, yang berkaitan bersebelahan
     (mis. bentuk kaki → material kaki → finishing → tinggi kaki). Hanya tampilan — spesifikasi tetap.
     [langkah, [judul kelompok (ID, EN), [id kelompok …]]] ; id yang tidak terdaftar tampil di akhir langkah aslinya */
  var CZ_PLAN = {
    kursi: [
      ['bentuk', [['Bentuk dasar', 'Base form'], ['form', 'shape', 'seats', 'height', 'construction', 'frame', 'frameStyle', 'base']],
                 [['Lengan & sandaran', 'Arms & back'], ['arm', 'armStyle', 'back', 'backStyle', 'backrest', 'backS', 'backTuft']],
                 [['Dudukan', 'Seat'], ['seatC', 'seatTuft', 'top', 'topTuft', 'tuft', 'cushion', 'seatShape', 'sides', 'ends', 'storage']]],
      ['ukuran', [null, ['w', 'd', 'h', 'dia', 'ret', 'seatH', 'seatD', 'armH']]],
      ['material', [['Kain / kulit', 'Fabric / leather'], ['uph', 'color', 'color2']]],
      ['detail', [['Kaki, rangka & base', 'Legs, frame & base'], ['leg', 'legFinish', 'wood', 'metal', 'legH', 'skirt', 'stretcher', 'footrest', 'footrestFinish', 'swivel']],
                 [['Kenyamanan', 'Comfort'], ['fill', 'firm']],
                 [['Jahitan & bantal', 'Stitching & pillows'], ['stitch', 'pipingC', 'pillows', 'pillowType', 'pillowColor', 'bolsters', 'headrest']],
                 [['Aksen & tambahan', 'Accents & extras'], ['trim', 'extras']]]
    ],
    meja: [
      ['bentuk', [null, ['seats', 'topShape', 'base', 'drawers']]],
      ['ukuran', [null, ['w', 'd', 'dia', 'h', 'thick']]],
      ['material', [['Daun meja', 'Table top'], ['topMat', 'wood', 'stone', 'panel']],
                   [['Kaki & base', 'Legs & base'], ['baseMat', 'metal']]],
      ['detail', [null, ['edge', 'extras']]]
    ],
    kabinet: [
      ['bentuk', [null, ['doorType', 'doors', 'drawers', 'niches', 'lowerDoors']]],
      ['ukuran', [null, ['w', 'd', 'h']]],
      ['material', [['Muka & badan', 'Fronts & carcass'], ['finish', 'wood', 'panel', 'carcass']]],
      ['detail', [['Handle', 'Handles'], ['handle', 'metal']],
                 [['Dudukan & kaki', 'Mounting & legs'], ['mount', 'leg', 'legH']],
                 [['Isi dalam', 'Interior'], ['interior']]]
    ],
    divan: [
      ['bentuk', [null, ['headboard', 'hbW', 'storage']]],
      ['ukuran', [null, ['mattress', 'h', 'hbH']]],
      ['material', [null, ['uph', 'color', 'wood']]],
      ['detail', [['Dasar & kaki', 'Base & legs'], ['mount', 'leg', 'legFinish', 'metal', 'legH']],
                 [['Tambahan', 'Extras'], ['extras']]]
    ]
  };
  // kelompok terlihat untuk satu langkah: [{ title, groups }]
  function planOf(step) {
    if (step === 'jenis') return [{ title: null, groups: jenisGroups() }];
    var catDef = XC.CATS.filter(function (x) { return x.id === cz.cat; })[0] || {}, plan = catDef.plan || CZ_PLAN[cz.cat], all = XC.groups(cz), used = {}, out = [];   // spec-*.js boleh membawa plan sendiri
    if (!plan) return [{ title: null, groups: XC.groups(cz, step) }];
    var byId = {}; all.forEach(function (g) { byId[g.id] = g; });
    plan.forEach(function (st) {
      st.slice(1).forEach(function (cl) { cl[1].forEach(function (id) { if (byId[id]) used[id] = st[0]; }); });
      if (st[0] !== step) return;
      st.slice(1).forEach(function (cl) {
        var gs = cl[1].map(function (id) { return byId[id]; }).filter(Boolean);
        if (gs.length) out.push({ title: cl[0], groups: gs });
      });
    });
    var rest = all.filter(function (g) { return !used[g.id] && g.step === step; });
    if (rest.length) out.push({ title: out.length ? ['Lainnya', 'Other'] : null, groups: rest });
    if (out.length < 2) out.forEach(function (o) { o.title = null; });
    return out;
  }
  function findGroup(id) { var all = jenisGroups().concat(XC.groups(cz)); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }
  // nilai kelompok jenis dibaca dari cz.cat / cz.sub
  var _get = function (gr) { return gr.id === '_cat' ? cz.cat : gr.id === '_sub' ? cz.sub : cz[gr.id]; };
  function czSections(box2) {
    return XC.STEPS.map(function (st, i) {
      var inner;
      if (st.id === 'kirim') {
        var rows = XC.summary(cz, L).slice(1);
        inner = '<dl class="kv cz__sum">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
          '<div class="co-total" style="margin-bottom:16px"><button type="button" class="cz__price" data-breakdown><em>' + T('Harga final · rincian') + '</em><b>' + rupiah(czUnit()) + '</b></button><span class="note">' + T('Ongkir dihitung di checkout') + '</span></div>' +
          '<button class="btn btn--gold btn--full" type="button" data-cz-buy><svg><use href="#i-card"/></svg><span>' + T('Beli sekarang') + '</span></button>' +
          '<div class="btns"><button class="btn btn--line" type="button" data-cz-save><svg><use href="#i-heart"/></svg><span>' + T('Simpan') + '</span></button><button class="btn btn--line" type="button" data-send><svg><use href="#i-wa"/></svg><span>' + T('Tanya tim') + '</span></button></div>';
      } else {
        var pl = planOf(st.id), en = I18N && I18N.lang() === 'en';
        inner = pl.length ? pl.map(function (cl) {
          return (cl.title ? '<p class="cz__sub">' + esc(cl.title[en ? 1 : 0]) + '</p>' : '') + cl.groups.map(function (gr) {
            if (gr.id === '_cat' || gr.id === '_sub') { var save = cz[gr.id]; cz[gr.id] = _get(gr); var h = czGroup(gr, box2); if (save === undefined) delete cz[gr.id]; else cz[gr.id] = save; return h; }
            return czGroup(gr, box2);
          }).join('');
        }).join('') : '<p class="note">' + T('Tidak ada pilihan tambahan untuk jenis ini.') + '</p>';
      }
      return '<section class="cz__sec" data-sec="' + st.id + '" id="cz-' + st.id + '"><p class="cz__h"><i>' + String(i + 1).padStart(2, '0') + '</i>' + esc(L(st)) + '</p>' + inner + '</section>';
    }).join('');
  }
  function czRender(keepScroll) {
    var sc = $('#czScroll'), top = sc.scrollTop, base = $('#czBase'), box2 = czLayout() === 'box2';
    html.classList.toggle('cz-box2', box2);
    base.hidden = !czBase;
    base.innerHTML = czBase ? '<div class="cz__from"><p class="eyebrow">' + T('Custom dari') + '</p><b>' + esc(czBase.name) + '</b><span>' + esc(czBase.type) + '</span></div>' +
      '<div class="seg seg--sm"><button type="button" data-view="design" class="' + (czView === 'design' ? 'is-on' : '') + '">' + T('Rancangan 3D') + '</button><button type="button" data-view="product" class="' + (czView === 'product' ? 'is-on' : '') + '">' + T('Produk asli') + '</button></div>' +
      '<button class="cz__fresh" type="button" data-czfresh>' + T('Mulai dari nol') + '</button>' : '';
    var TAB_S = { material: ['Bahan', 'Finish'], detail: ['Detail', 'Detail'], kirim: ['Total', 'Total'] };
    $('#czTabs').innerHTML = XC.STEPS.map(function (st, i) { var sh = TAB_S[st.id], en = I18N && I18N.lang() === 'en'; return '<button type="button" data-tab="' + st.id + '" title="' + esc(L(st)) + '"><i>' + String(i + 1).padStart(2, '0') + '</i><span>' + esc(sh ? sh[en ? 1 : 0] : L(st)) + '</span></button>'; }).join('');
    czFoot();
    $('#czBody').innerHTML = czSections(box2);
    sc.scrollTop = keepScroll ? top : 0;
    czLazy($('#czBody'));
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
    czLazy(grid);
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
    var sc = $('#czScroll'), anc = g.closest && g.closest('[data-g]') && sc.contains(g) ? g.closest('[data-g]') : null, y0 = anc ? anc.getBoundingClientRect().top : 0;
    czSave(); czRender(true); czStage();
    if (anc) { var a2 = sc.querySelector('[data-g="' + id + '"]'); if (a2) sc.scrollTop += a2.getBoundingClientRect().top - y0; }
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
    if (e.target.closest('[data-cz-buy]')) { czBuyNow(); return; }
    if (e.target.closest('[data-cz-save]')) { czSaveDesign(); return; }
    if ((b = e.target.closest('[data-lay]'))) { if (!b.disabled) czLayClick(b); return; }   // editor susunan kolom
    if ((b = e.target.closest('[data-v]')) && b.closest('[data-g]')) czChoose(b.closest('[data-g]'), b.dataset.v);
  });
  $('#czBody').addEventListener('input', function (e) {
    var r = e.target.closest('[data-r]'); if (!r) return;
    var gr = findGroup(r.dataset.r);
    cz[r.dataset.r] = +r.value;
    var out = r.parentNode.querySelector('[data-out]'); if (out && gr) out.textContent = czVal(gr, +r.value);
    if (gr) r.style.setProperty('--p', ((+r.value - gr.min) / (gr.max - gr.min) * 100).toFixed(1) + '%');
    if (czBase && czView === 'product') czView = 'design';
    czStage(); czDetail(true); czFoot();
  });
  $('#czBody').addEventListener('change', function (e) { var r = e.target.closest('[data-r]'); if (r) { XC.apply(cz, r.dataset.r, +r.value); czSave(); czRender(true); } });

  /* ---------- pop-up tengah */
  var modal = $('#modal'), modalBody = $('#modalBody');
  function openModal(htmlStr, cls) { modalBody.innerHTML = htmlStr; modal.className = 'modal is-on' + (cls ? ' ' + cls : ''); modal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { modal.classList.remove('is-on'); modal.setAttribute('aria-hidden', 'true'); }
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('[data-modal-close]')) { closeModal(); return; }
    if (e.target.closest('[data-send]')) czSend();
    if (e.target.closest('[data-cz-addbag]')) czAddToBag();
    if (e.target.closest('[data-cznew]')) { closeModal(); czBase = null; czView = 'design'; czReset(XC.defaults(cz.cat, cz.sub)); $('#czScroll').scrollTop = 0; }
  });
  modalBody.addEventListener('submit', function (e) { e.preventDefault(); if (e.target.id === 'authForm') authSubmit(e.target); else czSubmit(); });
  modalBody.addEventListener('click', function (e) {
    var b = e.target.closest('[data-auth]'); if (b) { authForm(b.dataset.auth); return; }
    if (e.target.closest('[data-auth-back]')) openAuth(authAfter);
  });
  modalBody.addEventListener('input', function (e) { if (e.target.id === 'zQty') { cz.qty = Math.max(1, parseInt(e.target.value, 10) || 1); czSave(); var t = $('#zTotal'); if (t) t.textContent = rupiah(XC.estimate(cz)); czDetail(true); } });

  function czBreakdown() {
    var b = XC.breakdown(cz, L);
    openModal('<header class="ph"><span class="ph__n"><svg><use href="#i-card"/></svg></span><div><p class="ph__e">' + T('Rincian harga') + '</p><p class="ph__t">' + esc(czTitle()) + '</p></div></header><p class="txt" style="margin:-8px 0 12px">' + esc(XC.dimsText(cz)) + ' · ' + esc(czMat()) + '</p>' +
      '<dl class="bd">' + b.rows.map(function (r, i) { return '<dt>' + esc(r.l) + '</dt><dd>' + (i ? (r.v < 0 ? '− ' : '+ ') : '') + rupiah(Math.round(Math.abs(r.v) / 1000) * 1000) + '</dd>'; }).join('') +
      '<dt class="bd__sub">' + T('Per unit') + '</dt><dd class="bd__sub">' + rupiah(Math.round(b.unit / 10000) * 10000) + '</dd>' +
      (b.qty > 1 ? '<dt>' + T('Jumlah unit') + '</dt><dd>× ' + b.qty + '</dd>' : '') + '</dl>' +
      '<div class="co-total"><span class="eyebrow">' + T('Total') + '</span><b class="price">' + rupiah(b.total) + '</b></div>' +
      '<p class="note" style="margin-bottom:16px">' + T('Harga final produksi. Ongkir & pemasangan dihitung di checkout sesuai alamat.') + '</p>' +
      '<button class="btn btn--gold btn--full" type="button" data-modal-close data-cz-addbag><svg><use href="#i-bag"/></svg><span>' + T('Tambah ke tas') + '</span></button>', 'modal--sm');
  }
  var BUDGET = ['Belum tahu', '< IDR 5 juta', 'IDR 5–15 juta', 'IDR 15–50 juta', '> IDR 50 juta'];
  function czSend() {
    var cst = store.get('xv5_customer', {});
    openModal('<header class="ph"><span class="ph__n"><svg><use href="#i-wa"/></svg></span><div><p class="ph__e">' + T('Tanya tim') + '</p><p class="ph__t">' + esc(czTitle()) + '</p></div></header><p class="txt" style="margin:-8px 0 12px">' + esc(XC.dimsText(cz)) + ' · ' + esc(czMat()) + (czBase ? ' · ' + T('Berdasarkan') + ' ' + esc(czBase.name) : '') + '</p>' +
      '<div class="co-total" style="margin-bottom:16px"><span class="eyebrow">' + T('Harga') + '</span><b class="price" id="zTotal">' + rupiah(XC.estimate(cz)) + '</b></div>' +
      '<form class="form" id="czForm" novalidate>' +
      '<div class="fgrid"><label class="fld"><span>' + T('Jumlah unit') + '</span><input id="zQty" inputmode="numeric" value="' + (cz.qty || 1) + '"></label>' +
      '<label class="fld"><span>' + T('Dibutuhkan pada') + '</span><input id="zDate" type="date"></label>' +
      '<label class="fld"><span>' + T('Kisaran anggaran') + '</span><select id="zBudget">' + BUDGET.map(function (x) { return '<option>' + esc(T(x)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>' + T('Link referensi') + '</span><input id="zRef"></label>' +
      '<label class="fld fld--full"><span>' + T('Catatan (opsional)') + '</span><textarea id="zNote" rows="2"></textarea></label>' +
      '<label class="fld fld--full"><span>' + T('Nama') + '</span><input id="zName" required autocomplete="name" value="' + esc((me() || cst).name || '') + '"></label>' +
      '<label class="fld"><span>WhatsApp</span><input id="zPhone" required inputmode="tel" autocomplete="tel" value="' + esc((me() || cst).phone || '') + '"></label>' +
      '<label class="fld"><span>' + T('Kota') + '</span><input id="zCity" autocomplete="address-level2" value="' + esc(cst.city || '') + '"></label></div>' +
      '<button class="btn btn--gold btn--full" type="submit"><svg><use href="#i-wa"/></svg><span>' + T('Kirim ke tim') + '</span></button>' +
      '<p class="note" id="zMsg">' + T('Rancangan & estimasi dikirim ke tim XIONCO melalui WhatsApp. Penawaran dalam 1 jam kerja.') + '</p></form>', 'modal--send');
  }
  function czSubmit() {
    var v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    var name = v('zName'), phone = v('zPhone').replace(/[^\d+]/g, ''), msgEl = $('#zMsg');
    if (!$('#czForm')) return;
    $('#zName').closest('.fld').classList.toggle('is-err', !name);
    $('#zPhone').closest('.fld').classList.toggle('is-err', phone.length < 8);
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
      data.category = { kursi: /^(sofa|armchair|chaise)$/.test(sb.id) ? 'Sofa' : 'Kursi', meja: 'Meja', kabinet: 'Kabinet / lemari', divan: 'Tempat tidur' }[cz.cat];
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
    if (p.cat === 'seats') sb = /chaise|daybed/.test(t) ? 'chaise' : /bench/.test(t) ? 'bench' : /ottoman|puff|pouf/.test(t) ? 'ottoman' : /stool/.test(t) ? 'stool' : /armchair|1 seater|single|lounge/.test(t) ? 'armchair' : /chair|kursi/.test(t) ? 'dining' : 'sofa';
    else if (p.cat === 'tables') { cat = 'meja'; sb = /dining|makan/.test(t) ? 'dining' : /side|samping/.test(t) ? 'side' : /console|konsol/.test(t) ? 'console' : /desk|workstation|kerja/.test(t) ? 'desk' : 'coffee'; }
    else if (p.cat === 'bedframe') { cat = 'divan'; sb = /platform/.test(t) && !/somno/.test(t) ? 'platform' : 'divan'; }
    else if (p.cat === 'cabinet') { cat = 'kabinet'; sb = /wardrobe|lemari pakaian/.test(t) ? 'wardrobe' : /tv/.test(t) ? 'tv' : /shoe|sepatu|shusio/.test(t) ? 'shoe' : /nightstand|bedside|nakas|qaztac/.test(t) ? 'nightstand' : /shelf|rak|hanger|lucid/.test(t) ? 'bookshelf' : 'sideboard'; }
    var c = XC.defaults(cat, sb);
    if (sb === 'sofa') {
      var m = t.match(/(\d)\s*-?\s*seat/); if (m) XC.apply(c, 'seats', String(Math.max(2, Math.min(5, +m[1]))));
      if (/sectional|l-shape|l shape/.test(t)) XC.apply(c, 'shape', 'lkiri');
      if (/sofa bed/.test(t)) c.extras = ['sofabed'];
      if (/cubix/.test(t)) XC.apply(c, 'shape', 'modular');
    }
    // ciri koleksi yang jelas → pilihan baru (tufting terpisah dari bentuk sandaran)
    if (sb === 'sofa' || sb === 'armchair') {
      if (/kyrios/.test(t)) { XC.apply(c, 'arm', 'shelter'); XC.apply(c, 'back', 'tight'); XC.apply(c, 'backTuft', 'channelV'); XC.apply(c, 'leg', 'metalplinth'); XC.apply(c, 'metal', 'brass'); if (sb === 'sofa') XC.apply(c, 'seatC', 'bench'); c.pillows = 0; }
      if (/guise/.test(t)) { XC.apply(c, 'arm', 'track'); XC.apply(c, 'back', 'cushion'); XC.apply(c, 'backTuft', 'button'); }
      if (/chesterfield/.test(t)) { XC.apply(c, 'arm', sb === 'sofa' ? 'scroll' : 'rolled'); XC.apply(c, 'back', 'tight'); XC.apply(c, 'backTuft', 'diamond'); XC.apply(c, 'leg', 'turned'); }
      if (/channel/.test(t)) { XC.apply(c, 'back', 'tight'); XC.apply(c, 'backTuft', 'channelV'); }
      if (/tufted|button/.test(t) && c.backTuft === 'plain') { XC.apply(c, 'back', 'cushion'); XC.apply(c, 'backTuft', 'button'); }
      if (sb === 'armchair' && /swivel/.test(t)) { XC.apply(c, 'shape', 'barrel'); XC.apply(c, 'base', 'swivelDisc'); }
      if (sb === 'armchair' && /rocking|goyang/.test(t)) { XC.apply(c, 'shape', 'woodframe'); XC.apply(c, 'base', 'rocking'); }
    }
    if (sb === 'ottoman' && /guise/.test(t)) XC.apply(c, 'tuft', 'button');
    if (sb === 'ottoman' && /rhombio|diamond/.test(t)) XC.apply(c, 'tuft', 'diamond');
    if (sb === 'bench' && /storage/.test(t)) XC.apply(c, 'storage', 'lid');
    if (sb === 'stool' && /wood|kayu/.test(t)) { XC.apply(c, 'frame', 'wood'); XC.apply(c, 'base', 'legs'); }
    if (sb === 'stool' && /dining stool|low stool/.test(t)) XC.apply(c, 'height', 'low');
    if (sb === 'dining' && /stackable|stack/.test(t)) c.extras = (c.extras || []).concat(['stack']);
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
  window.addEventListener('xvdb:change', function (e) {
    if (e.detail && e.detail.what === 'settings' && current === 'customize') czRender(true);
    if (e.detail && e.detail.what === 'pricing') { if (cz) { czFoot(); if (stageKind === 'custom') czDetail(); if (current === 'customize') czRender(true); } renderBag(); if (current === 'bayar') renderCo(true); }
  });

  /* ======================================================================
     PENGATURAN — bahasa, tema, pencahayaan (tersimpan di perangkat)
     ====================================================================== */
  var THEME_COLOR = { dark: '#0f0c0a', light: '#e4ddd1' };
  function themeNow() { return html.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function setTheme(name, instant) {
    name = name === 'light' ? 'light' : 'dark';
    html.setAttribute('data-theme', name);
    try { localStorage.setItem('xv5_theme', name); } catch (e) {}
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', THEME_COLOR[name]);
    if (XW.ok && XW.setTheme) XW.setTheme(name, instant ? 0 : 1.2);
    renderSettings();
  }
  function moodNow() { var m = store.get('xv5_mood', 'senja'); return /^(siang|senja|malam|manual)$/.test(m) ? m : 'senja'; }
  /* ---- Pencahayaan manual: jenis lampu, jumlah, posisi, kecerahan & suhu warna (tersimpan di perangkat) ---- */
  var LIGHT_TYPES = [['spot', 'Spot', 'Spot'], ['soft', 'Softbox', 'Softbox'], ['point', 'Bohlam', 'Bulb'], ['sun', 'Matahari', 'Sun']];
  var LIGHT_DEF = { ambient: 1, lights: [
    { type: 'spot', on: true, int: 1.55, k: 3200, az: 32, el: 50, dist: 8, shadow: true },
    { type: 'soft', on: true, int: .4, k: 3800, az: -35, el: 14, dist: 7.2, shadow: false },
    { type: 'sun', on: true, int: .3, k: 7000, az: 225, el: 35, dist: 6, shadow: false }
  ] };
  var lightCfg = function () { var c = store.get('xv5_lights', null); return c && c.lights ? c : JSON.parse(JSON.stringify(LIGHT_DEF)); };
  function applyLighting() {
    if (!XW.ok) return;
    if (moodNow() === 'manual' && XW.setLighting) XW.setLighting(lightCfg());
    else XW.setMood(moodNow());
  }
  var lightRaf = 0;
  function renderLights() {
    var box = $('#setLights'); if (!box) return;
    var man = moodNow() === 'manual';
    box.hidden = !man;
    if (XW.lightMarkers) XW.lightMarkers(man && current === 'setelan');
    if (!man) { box.innerHTML = ''; return; }
    var cfg = lightCfg(), en = I18N && I18N.lang() === 'en';
    var rng = function (path, lab, v, min, max, step, unit) {
      return '<label class="lt__r"><span>' + lab + '</span><b>' + (unit === 'K' ? Math.round(v) + ' K' : unit === '°' ? Math.round(v) + '°' : unit === 'm' ? (+v).toFixed(1) + ' m' : (+v).toFixed(2)) + '</b>' +
        '<input class="rng" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-lt="' + path + '" data-u="' + unit + '" style="--p:' + ((v - min) / (max - min) * 100).toFixed(1) + '%"></label>';
    };
    box.innerHTML = '<div class="lt__amb">' + rng('ambient', T('Cahaya ruang (ambient)'), cfg.ambient, 0, 2, .05, '') + '</div>' +
      cfg.lights.map(function (l, i) {
        return '<div class="lt' + (l.on ? '' : ' is-off') + '" data-li="' + i + '">' +
          '<div class="lt__h"><b>' + T('Lampu {n}', { n: i + 1 }) + '</b><div class="seg seg--sm">' + LIGHT_TYPES.map(function (t) { return '<button type="button" data-lt-type="' + t[0] + '" class="' + (l.type === t[0] ? 'is-on' : '') + '">' + (en ? t[2] : t[1]) + '</button>'; }).join('') + '</div></div>' +
          '<div class="lt__t"><button type="button" class="mini' + (l.on ? ' is-on' : '') + '" data-lt-on>' + (l.on ? T('Nyala') : T('Mati')) + '</button>' +
          (l.type !== 'point' ? '<button type="button" class="mini' + (l.shadow ? ' is-on' : '') + '" data-lt-sh>' + T('Bayangan') + (l.shadow ? ' ✓' : '') + '</button>' : '') +
          '<button type="button" class="rm" data-lt-rm>' + T('Hapus') + '</button></div>' +
          rng(i + '.int', T('Kecerahan'), l.int, 0, 4, .05, '') + rng(i + '.k', T('Suhu warna'), l.k, 2200, 7000, 100, 'K') +
          rng(i + '.az', T('Arah'), l.az, -180, 180, 1, '°') + rng(i + '.el', T('Ketinggian'), l.el, 2, 89, 1, '°') + rng(i + '.dist', T('Jarak'), l.dist, 1.5, 12, .1, 'm') +
        '</div>';
      }).join('') +
      (cfg.lights.length < 6 ? '<button type="button" class="btn btn--line btn--full" data-lt-add><svg><use href="#i-plus"/></svg><span>' + T('Tambah lampu') + '</span></button>' : '') +
      '<button type="button" class="btn btn--ghost btn--full" data-lt-reset><span>' + T('Kembali ke awal') + '</span></button>';
  }
  function saveLights(cfg, rebuild) {
    store.set('xv5_lights', cfg);
    cancelAnimationFrame(lightRaf);
    lightRaf = requestAnimationFrame(function () { if (XW.ok && XW.setLighting) XW.setLighting(cfg); });
    if (rebuild) renderLights();
  }
  $('#setLights') && $('#setLights').addEventListener('input', function (e) {
    var t = e.target; if (!t.dataset.lt) return;
    var cfg = lightCfg(), p = t.dataset.lt.split('.'), v = +t.value;
    if (p.length === 1) cfg[p[0]] = v; else cfg.lights[+p[0]][p[1]] = v;
    t.style.setProperty('--p', ((v - t.min) / (t.max - t.min) * 100).toFixed(1) + '%');
    var u = t.dataset.u, b = t.parentNode.querySelector('b'); if (b) b.textContent = u === 'K' ? Math.round(v) + ' K' : u === '°' ? Math.round(v) + '°' : u === 'm' ? v.toFixed(1) + ' m' : v.toFixed(2);
    saveLights(cfg, false);
  });
  $('#setLights') && $('#setLights').addEventListener('click', function (e) {
    var cfg = lightCfg(), card = e.target.closest('[data-li]'), l = card ? cfg.lights[+card.dataset.li] : null, b;
    if ((b = e.target.closest('[data-lt-type]')) && l) { l.type = b.dataset.ltType; if (l.type === 'point') l.shadow = false; saveLights(cfg, true); return; }
    if (e.target.closest('[data-lt-on]') && l) { l.on = !l.on; saveLights(cfg, true); return; }
    if (e.target.closest('[data-lt-sh]') && l) { l.shadow = !l.shadow; saveLights(cfg, true); return; }
    if (e.target.closest('[data-lt-rm]') && card) { cfg.lights.splice(+card.dataset.li, 1); saveLights(cfg, true); return; }
    if (e.target.closest('[data-lt-add]')) { cfg.lights.push({ type: 'spot', on: true, int: .8, k: 4000, az: -60, el: 40, dist: 6, shadow: false }); saveLights(cfg, true); return; }
    if (e.target.closest('[data-lt-reset]')) { store.set('xv5_lights', null); saveLights(lightCfg(), true); }
  });
  enter.setelan = function () { if (XW.lightMarkers) XW.lightMarkers(moodNow() === 'manual'); };
  leave.setelan = function () { if (XW.lightMarkers) XW.lightMarkers(false); };

  var bgNow = function () { var b = store.get('xv5_bg', 'default'); return /^(studio|grid|neon)$/.test(b) ? b : 'default'; };
  // Garis & Neon: warna pilihan per jenis; kotak warna tetap terbuka saat warna diganti
  var BG_DEF = { grid: '#bfa274', neon: '#22e1ff' };
  var BG_SW = ['#22e1ff', '#2f7bff', '#8b5cff', '#ff2bd6', '#ff3b5c', '#ff7a1a', '#ffd23f', '#a6ff3c', '#2bffb0', '#bfa274', '#e8e2d6', '#6f6a64'];
  var bgHexNow = function (b) { return store.get('xv5_bgc_' + b, BG_DEF[b] || '#bfa274'); };
  var bgBox = true;
  function applyBg() { if (XW.ok && XW.setBackground) XW.setBackground(bgNow(), BG_DEF[bgNow()] ? bgHexNow(bgNow()) : null); }
  function renderBgC() {
    var box = $('#setBgC'), b = bgNow(), on = !!BG_DEF[b] && bgBox; if (!box) return;
    box.hidden = !on; if (!on) return;
    var cur = bgHexNow(b).toLowerCase();
    box.innerHTML = '<p class="bgc__h">' + T(b === 'neon' ? 'Warna neon' : 'Warna garis') + '</p><div class="bgc__sw">' +
      BG_SW.map(function (h) { return '<button type="button" class="' + (h === cur ? 'is-on' : '') + '" data-bgc="' + h + '" style="--sw:' + h + '" aria-label="' + h + '"></button>'; }).join('') +
      '<label class="bgc__pick' + (BG_SW.indexOf(cur) < 0 ? ' is-on' : '') + '" title="' + T('Warna lain') + '"' + (BG_SW.indexOf(cur) < 0 ? ' style="--sw:' + cur + '"' : '') + '><input type="color" value="' + cur + '" data-bgc-in></label></div>';
  }
  $('#setBg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bg]'); if (!b) return;
    if (b.dataset.bg === bgNow() && BG_DEF[b.dataset.bg]) bgBox = !bgBox; else bgBox = true;   // klik lagi = buka / tutup kotak warna
    store.set('xv5_bg', b.dataset.bg); applyBg(); renderSettings();
  });
  function setBgColor(h) { store.set('xv5_bgc_' + bgNow(), h); if (XW.ok && XW.setBackgroundColor) XW.setBackgroundColor(h); }
  $('#setBgC').addEventListener('click', function (e) { var b = e.target.closest('[data-bgc]'); if (!b) return; setBgColor(b.dataset.bgc); renderBgC(); });
  $('#setBgC').addEventListener('input', function (e) { if (!e.target.matches('[data-bgc-in]')) return; setBgColor(e.target.value); var l = e.target.parentNode; l.style.setProperty('--sw', e.target.value); });
  $('#setBgC').addEventListener('change', function (e) { if (e.target.matches('[data-bgc-in]')) renderBgC(); });
  // efek render: Klasik (seperti semula) · Realistis (HDRI suasana + bayangan kontak + ambient occlusion)
  var lookNow = function () { return store.get('xv5_look', 'classic') === 'real' ? 'real' : 'classic'; };
  function applyLook() { var r = lookNow() === 'real'; if (XW.ok && XW.setLook) XW.setLook({ hdr: r, contact: r, ao: r }); }
  $('#setLook').addEventListener('click', function (e) { var b = e.target.closest('[data-look]'); if (!b) return; store.set('xv5_look', b.dataset.look); applyLook(); renderSettings(); });
  $('#setMood').addEventListener('click', function (e) { var b = e.target.closest('[data-mood]'); if (!b) return; store.set('xv5_mood', b.dataset.mood); applyLighting(); renderSettings(); });
  function renderSettings() {
    $$('#setMood [data-mood]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.mood === moodNow()); });
    renderLights();
    $$('#setLang [data-lang]').forEach(function (b) { b.classList.toggle('is-on', I18N ? b.dataset.lang === I18N.lang() : b.dataset.lang === 'id'); });
    $$('#setTheme [data-theme]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.theme === themeNow()); });
    $$('#setBg [data-bg]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.bg === bgNow()); });
    renderBgC();
    $$('#setLook [data-look]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.look === lookNow()); });
    $$('#setDims [data-dims]').forEach(function (b) { b.classList.toggle('is-on', +b.dataset.dims === store.get('xv5_dims', 0)); });
  }
  $('#setDims').addEventListener('click', function (e) { var b = e.target.closest('[data-dims]'); if (!b) return; store.set('xv5_dims', +b.dataset.dims); renderSettings(); });
  $('#setLang').addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (b && I18N) I18N.set(b.dataset.lang); });
  $('#setTheme').addEventListener('click', function (e) { var b = e.target.closest('[data-theme]'); if (b) setTheme(b.dataset.theme); });
  renderSettings();

  /* ======================================================================
     PROFIL — akun · pesanan · rancangan tersimpan · alamat
     Tanpa akun pun pesanan & rancangan tetap tersimpan di perangkat ini.
     ====================================================================== */
  var STATUS = { pending: 'Menunggu pembayaran', paid: 'Dibayar', failed: 'Gagal' };
  var pfTab = 'pesanan';
  var designs = function () { return store.get('xv5_designs', []); };
  function renderProfile() {
    var u = me(), orders = store.get('xv5_orders', []), ds = designs(), body = $('#pfBody');
    var av = $('#pfAvatar');
    av.classList.toggle('is-av', !!u);
    av.innerHTML = u ? esc(initial(u.name)) : '<svg><use href="#i-user"/></svg>';
    $('#pfTitle').textContent = u ? u.name : T('Akun Anda');
    var html = '';
    if (!u) html += '<div class="card" style="margin-bottom:18px"><p class="sh"><span>' + T('Masuk atau daftar') + '</span></p><p class="txt" style="margin-bottom:12px">' + T('Checkout berikutnya terisi otomatis — kontak, alamat, dan rancangan tersimpan di akun Anda.') + '</p>' + provHtml() + '</div>';
    else html += '<dl class="kv" style="margin-bottom:18px"><dt>' + T('Masuk dengan') + '</dt><dd>' + esc((XA.providers.filter(function (p) { return p.id === u.provider; })[0] || {}).label || '—') + '</dd>' + (u.phone ? '<dt>WhatsApp</dt><dd>' + esc(u.phone) + '</dd>' : '') + (u.email ? '<dt>Email</dt><dd>' + esc(u.email) + '</dd>' : '') + (u.instagram ? '<dt>Instagram</dt><dd>' + esc(u.instagram) + '</dd>' : '') + '</dl>';
    var tabs = [['pesanan', T('Pesanan'), orders.length], ['rancangan', T('Rancangan'), ds.length], ['alamat', T('Alamat'), u ? (u.addresses || []).length : 0], ['akun', T('Akun'), null]];
    html += '<div class="pf-tabs">' + tabs.map(function (t) { return '<button type="button" data-pf="' + t[0] + '" class="' + (pfTab === t[0] ? 'is-on' : '') + '">' + t[1] + (t[2] ? '<em>' + t[2] + '</em>' : '') + '</button>'; }).join('') + '</div>';
    if (pfTab === 'pesanan') {
      html += orders.length ? '<ul class="list">' + orders.map(function (o) {
        var n = o.items.reduce(function (a, i) { return a + i.qty; }, 0);
        return '<li><div class="list__th"><svg><use href="#i-truck"/></svg></div><div><p class="list__n"><span>' + esc(o.id) + '</span></p><p class="list__v">' + esc(dateText(o.created)) + ' · ' + n + ' ' + T('item') + (o.eta ? ' · ' + T('tiba') + ' ' + esc(o.eta) : '') + '</p><p class="list__p">' + rupiah(o.total) + '</p></div>' +
          '<div class="list__r"><span class="tag' + (o.status === 'paid' ? ' tag--ok' : ' tag--gold') + '">' + T(STATUS[o.status] || o.status) + '</span></div></li>';
      }).join('') + '</ul>' : '<div class="empty-card is-on"><p class="txt">' + T('Belum ada pesanan.') + '</p><a class="btn btn--line" href="#/koleksi" data-go="koleksi"><span>' + T('Lihat koleksi') + '</span></a></div>';
    } else if (pfTab === 'rancangan') {
      html += ds.length ? '<ul class="list">' + ds.map(function (d) {
        return '<li data-ds="' + d.id + '"><div class="list__th" data-ds-open>' + (d.img ? '<img class="is-snap" src="' + d.img + '" alt="">' : '<svg><use href="#i-ruler"/></svg>') + '</div><div><p class="list__n"><span>' + esc(d.title) + '</span></p><p class="list__v">' + esc(d.sub + (d.mat ? ' · ' + d.mat : '')) + '</p><p class="list__p">' + rupiah(customUnit(d.cfg, d.price)) + '</p>' +
          '<div class="list__acts"><button class="mini mini--gold" type="button" data-ds-bag>' + T('Ke tas') + '</button><button class="mini" type="button" data-ds-open>' + T('Buka') + '</button></div></div>' +
          '<div class="list__r"><button class="rm" type="button" data-ds-rm>' + T('Hapus') + '</button></div></li>';
      }).join('') + '</ul>' : '<div class="empty-card is-on"><p class="txt">' + T('Belum ada rancangan tersimpan. Simpan dari Customize — kembali kapan saja.') + '</p><a class="btn btn--line" href="#/customize" data-go="customize"><span>Customize</span></a></div>';
    } else if (pfTab === 'alamat') {
      if (!u) html += '<div class="empty-card is-on"><p class="txt">' + T('Masuk untuk menyimpan alamat — checkout terisi otomatis.') + '</p></div>';
      else html += ((u.addresses || []).map(function (a) { return '<div class="addr-w" data-ad="' + a.id + '">' + addrHtml(a, a.primary, false) + '<div class="list__acts" style="margin:6px 0 12px 26px">' + (a.primary ? '' : '<button class="mini" type="button" data-ad-primary>' + T('Jadikan utama') + '</button>') + '<button class="mini" type="button" data-ad-rm>' + T('Hapus') + '</button></div></div>'; }).join('') ||
        '<div class="empty-card is-on"><p class="txt">' + T('Belum ada alamat. Alamat tersimpan otomatis saat checkout.') + '</p></div>');
    } else {
      if (!u) html += '<div class="empty-card is-on"><p class="txt">' + T('Belum masuk.') + '</p></div>';
      else html += '<form class="form" id="accForm"><div class="fgrid">' +
        '<label class="fld fld--full"><span>' + T('Nama') + '</span><input data-acc="name" value="' + esc(u.name || '') + '"></label>' +
        '<label class="fld"><span>WhatsApp</span><input data-acc="phone" value="' + esc(u.phone || '') + '" inputmode="tel"></label>' +
        '<label class="fld"><span>Email</span><input data-acc="email" value="' + esc(u.email || '') + '" type="email"></label>' +
        '<label class="fld fld--full"><span>Instagram</span><input data-acc="instagram" value="' + esc(u.instagram || '') + '" placeholder="@username"></label></div>' +
        '<button class="btn btn--gold btn--full" type="submit"><span>' + T('Simpan perubahan') + '</span></button>' +
        '<button class="btn btn--ghost btn--full" type="button" data-signout><span>' + T('Keluar') + '</span></button>' +
        '<p class="note">' + T('Mode pratinjau: akun tersimpan di perangkat ini.') + '</p></form>';
    }
    body.innerHTML = html;
  }
  $('#pfBody').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-pf]'))) { pfTab = b.dataset.pf; renderProfile(); return; }
    if ((b = e.target.closest('[data-auth]'))) { authForm(b.dataset.auth); authAfter = null; return; }
    if (e.target.closest('[data-signout]')) { XA.signOut(); notice(T('Anda sudah keluar')); return; }
    var li = e.target.closest('[data-ds]');
    if (li) {
      var d = designs().filter(function (x) { return x.id === li.dataset.ds; })[0]; if (!d) return;
      if (e.target.closest('[data-ds-rm]')) { store.set('xv5_designs', designs().filter(function (x) { return x.id !== d.id; })); renderProfile(); return; }
      if (e.target.closest('[data-ds-bag]')) { addEntry({ id: 'cz-' + Date.now().toString(36), type: 'custom', title: d.title, sub: d.sub, mat: d.mat, cfg: XC.normalize(JSON.parse(JSON.stringify(d.cfg))), price: customUnit(d.cfg, d.price), img: d.img, q: 1 }); return; }
      if (e.target.closest('[data-ds-open]')) { openDesign(d); return; }
    }
    var ad = e.target.closest('[data-ad]');
    if (ad) {
      if (e.target.closest('[data-ad-rm]')) { XA.removeAddress(ad.dataset.ad); return; }
      if (e.target.closest('[data-ad-primary]')) { var a = (me().addresses || []).filter(function (x) { return x.id === ad.dataset.ad; })[0]; if (a) { a.primary = true; XA.saveAddress(a); } return; }
    }
  });
  $('#pfBody').addEventListener('submit', function (e) {
    e.preventDefault();
    var patch = {}; $$('[data-acc]', e.target).forEach(function (i) { patch[i.dataset.acc] = i.value.trim(); });
    if (!patch.name) return;
    XA.update(patch); notice(T('Tersimpan'));
  });
  enter.profil = function () { renderProfile(); };
  renderMe(); renderProfile();

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
  /* ---- Pengaturan › Tampilkan ukuran: semua garis ukur di panggung + kartu rincian ---- */
  var dimsSvg = $('#dims'), dimCard = $('#dimCard'), dimsHtml = '', dimsSig = '', dimsCache = null;
  var dimsOn = function () { return store.get('xv5_dims', 0) === 1; };
  var cmOf = function (s) { var n = String(s || '').match(/\d+(\.\d+)?/g); return n && n.length >= 2 ? n.map(Number) : null; };
  function dimsInfo() {
    var lab = { w: T('Lebar'), d: T('Dalam'), h: T('Tinggi') }, rows = [], v = [];
    if (stageKind === 'custom' && cz) {
      var gs = XC.groups(cz, 'ukuran').concat(XC.groups(cz, 'detail')), has = function (id) { return gs.some(function (g) { return g.id === id; }); };
      rows.push([T('Ukuran'), XC.dimsText(cz)]);
      gs.forEach(function (g) { if (g.type === 'range' && g.unit === 'cm' && !/^(w|d|h)$/.test(g.id)) rows.push([L(g), cz[g.id] + ' cm']); });
      if (has('seatH')) v.push({ l: T('Dudukan'), cm: +cz.seatH });
      if (has('legH')) v.push({ l: T('Kaki'), cm: +cz.legH });
      if (has('armH')) v.push({ l: T('Lengan'), cm: +cz.armH });
      if (has('hbH')) v.push({ l: 'Headboard', cm: +cz.hbH });
      if (cz.cat === 'meja' && +cz.h && +cz.thick) v.push({ l: T('Bawah top'), cm: Math.round(+cz.h - +cz.thick) });
      if (cz.cat === 'divan' && cz.mattress && +cz.h && XC.sub(cz).bed) v.push({ l: T('Divan'), cm: +cz.h });
      if (cz.cat === 'kabinet' && Array.isArray(cz.layout)) rows.push([T('Kolom'), String(cz.layout.length)]);
      var round = /^(round|square)$/.test(cz.topShape) && cz.dia;
      var seatProbe = cz.cat === 'kursi' && (/^(armchair|bench|dining|stool)$/.test(cz.sub) || cz.sub === 'sofa' && /^(lurus|modular)$/.test(cz.shape || 'lurus'));
      return { exact: true, probe: seatProbe ? 'seat' : null, key: JSON.stringify(cz), plabels: PLAB(), w: round ? +cz.dia : +cz.w, d: round ? +cz.dia : /^(lkiri|lkanan|lcurve|u|chaise)/.test(cz.shape || '') ? null : +cz.d, h: +cz.h, labels: lab, v: v, rows: rows, title: czTitle() };
    }
    if (stageKind === 'cubix') return { w: 248, d: 86, h: 74, labels: lab, rows: [[lab.w, '248 cm'], [lab.d, '86 cm'], [lab.h, '74 cm']], title: 'CUBIX Modular' };
    if (stageKind === 'product' && furniture.p) {
      var p = furniture.p, n = cmOf(p.dims), m = !n && XW.measure && XW.measure();
      if (m && m.kind === 'model') n = [m.w, m.d, m.h];
      if (n) rows = [[lab.w, n[0] + ' cm'], [lab.d, n[1] + ' cm']].concat(n[2] ? [[lab.h, n[2] + ' cm']] : []);
      else rows = [[T('Dimensi'), T('Belum tercatat')]];
      if (m && m.kind === 'model') rows.push([T('Sumber'), T('Model 3D')]);
      return { probe: p.cat === 'seats' && m && m.kind === 'model' && !/ottoman|pouf|puff|pillow|bantal|stool|tesse|rhombio/i.test(p.id + ' ' + p.name + ' ' + (p.type || '')) ? 'seat' : null, key: p.id + (m ? '|' + m.w + 'x' + m.d + 'x' + m.h : ''), plabels: PLAB(), w: n && n[0], d: n && n[1], h: n && n[2], labels: lab, rows: rows, title: p.name };
    }
    return null;
  }
  // label ukuran bagian (diukur dari model di world.js)
  function PLAB() { return { seatD: T('Kedalaman dudukan'), backD: T('Tebal sandaran'), armW: T('Tebal lengan'), seatL: T('Panjang dudukan'), seatTop: T('Tinggi permukaan duduk') }; }
  /* penempatan label ukuran: geometri layar sederhana */
  var dimsPrevPos = {}, dimMeasure = null, dimWidths = {};
  function dimLabelW(k, t) {
    var key = k + '|' + t;
    if (dimWidths[key]) return dimWidths[key];
    if (!dimMeasure) dimMeasure = document.createElement('canvas').getContext('2d');
    var fam = getComputedStyle(document.documentElement).getPropertyValue('--f-h') || 'sans-serif';
    dimMeasure.font = '400 8px ' + fam; var kw = dimMeasure.measureText(String(k).toUpperCase()).width + String(k).length * 8 * .22;
    dimMeasure.font = '400 10.5px ' + fam; var tw = dimMeasure.measureText(t).width + t.length * 10.5 * .14;
    return (dimWidths[key] = Math.ceil(kw + 6 + tw));
  }
  function convexHull(pts) {
    if (pts.length < 3) return pts.slice();
    var p = pts.map(function (q) { return { x: q.x, y: q.y }; }).sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var cross = function (o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }, lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function segsCross(p1, p2, p3, p4) {
    var d = function (a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); };
    var d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
  }
  function rectEdges(r) {
    var a = { x: r.x, y: r.y }, b = { x: r.x + r.w, y: r.y }, c = { x: r.x + r.w, y: r.y + r.h }, d = { x: r.x, y: r.y + r.h };
    return [[a, b], [b, c], [c, d], [d, a]];
  }
  function grow(r, m) { return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m }; }
  function rectsHit(a, b, m) { return a.x - m < b.x + b.w && b.x - m < a.x + a.w && a.y - m < b.y + b.h && b.y - m < a.y + a.h; }
  function segHitsRect(p, q, r, m) {
    r = grow(r, m || 0);
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return true;
    if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h) return true;
    return rectEdges(r).some(function (e) { return segsCross(p, q, e[0], e[1]); });
  }
  function rectHitsPoly(r, poly, m) {
    if (poly.length < 3) return false;
    r = grow(r, m || 0);
    var corners = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h], [r.x + r.w / 2, r.y + r.h / 2]];
    if (corners.some(function (k) { return inPoly(k[0], k[1], poly); })) return true;
    if (poly.some(function (p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; })) return true;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) if (rectEdges(r).some(function (e) { return segsCross(poly[i], poly[j], e[0], e[1]); })) return true;
    return false;
  }
  // kandidat posisi label di sepanjang garis (tengah dulu), di kedua sisi, dua jarak; label ujung (garis tegak) juga di atas ujungnya
  // area UI yang tidak boleh tertutup label (diperbarui tiap 0,4 detik)
  var dimUi = { t: 0, list: [] };
  function dimUiRects() {
    var now = performance.now();
    if (now - dimUi.t > 400) {
      dimUi.t = now;
      dimUi.list = ['#detail', '.panel.is-open, .panel', '#dimCard.is-on', '.rail', '.recenter.is-on', '.top', '#czPicker.is-open'].map(function (sel) { var e = document.querySelector(sel); if (!e) return null; var r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .05 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; }).filter(Boolean);
    }
    return dimUi.list;
  }
  function segsCrossPoly(l, poly) { var a = { x: l.x, y: l.y }, b = { x: l.ex, y: l.ey }; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) if (segsCross(a, b, poly[i], poly[j])) return true; return false; }
  function dimCandidates(q, c, w, h) {
    var dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, len = Math.sqrt(dx * dx + dy * dy), nx = -dy / len, ny = dx / len, out = [];
    var ts = q.at === 'end' ? [1, .75, .5, .25] : [.5, .34, .66, .2, .8];
    var mx = (q.a.x + q.b.x) / 2, my = (q.a.y + q.b.y) / 2, outward = nx * (mx - c.x) + ny * (my - c.y) >= 0 ? 1 : -1;
    var pref = q.at === 'end' || q.side ? (q.side > 0 ? (nx > 0 ? 1 : -1) : (nx > 0 ? -1 : 1)) : outward;
    ts.forEach(function (tt, ti) {
      var px = q.a.x + dx * tt, py = q.a.y + dy * tt;
      [pref, -pref].forEach(function (sd, si) {
        [10, 24, 46, 76, 112, 156, 210].forEach(function (dist, di) {
          var ux = nx * sd, uy = ny * sd, ext = Math.abs(ux) * w / 2 + Math.abs(uy) * h / 2;
          var cx = px + ux * (dist + ext), cy = py + uy * (dist + ext);
          out.push({ r: { x: cx - w / 2, y: cy - h / 2, w: w, h: h }, cost: ti * 6 + si * 14 + di * 9, lead: dist > 24 ? { x: px, y: py, ex: cx - ux * ext, ey: cy - uy * ext } : null });
        });
      });
    });
    if (q.at === 'end') { var top = q.b.y < q.a.y ? q.b : q.a; out.push({ r: { x: top.x - w / 2, y: top.y - 12 - h, w: w, h: h }, cost: 10 }); }
    return out;
  }
  var dimsStatSig = null;
  function renderDims(segs) {
    var on = dimsOn() && /^(custom|cubix|product)$/.test(stageKind) && !/^(manufaktur|galeri)$/.test(current);
    var ms = on && XW.measure ? XW.measure() : null;
    var sig = on ? stageKind + '|' + (stageKind === 'custom' ? JSON.stringify(cz) : furniture.p ? furniture.p.id : '') + '|' + (I18N ? I18N.lang() : '') + '|' + (ms ? ms.kind + ms.w : '') : '';
    if (sig !== dimsSig) {
      dimsSig = sig; dimsCache = on ? dimsInfo() : null;
      if (XW.setDims) XW.setDims(!!dimsCache, dimsCache);
      dimsStatSig = null;
    }
    var stats = (dimsCache && segs && segs.stats || []).filter(function (r) { return !dimsCache.rows.some(function (q) { return q[0] === r[0]; }); }), ssig = sig + JSON.stringify(stats);
    if (ssig !== dimsStatSig) {
      dimsStatSig = ssig;
      dimCard.innerHTML = dimsCache ? '<p>' + T('Ukuran') + ' · ' + esc(dimsCache.title || '') + '</p><dl>' + dimsCache.rows.concat(stats).map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' : '';
    }
    dimCard.classList.toggle('is-on', !!dimsCache);
    var html = '';
    if (dimsCache && segs) {
      var f = function (n) { return n.toFixed(1); };
      var hull = convexHull((segs.box || []).filter(function (p) { return p.v; })), placed = [], ui = dimUiRects();
      var vis = segs.filter(function (q) { return q.a.v && q.b.v && Math.sqrt(Math.pow(q.b.x - q.a.x, 2) + Math.pow(q.b.y - q.a.y, 2)) >= 8; });
      var c = hull.length ? hull.reduce(function (m, p) { return { x: m.x + p.x / hull.length, y: m.y + p.y / hull.length }; }, { x: 0, y: 0 }) : segs.center;
      vis.forEach(function (q) {
        var dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, len = Math.sqrt(dx * dx + dy * dy), nx = -dy / len, ny = dx / len, t = 5;
        html += '<line x1="' + f(q.a.x) + '" y1="' + f(q.a.y) + '" x2="' + f(q.b.x) + '" y2="' + f(q.b.y) + '"/>';
        [q.a, q.b].forEach(function (e) { html += '<line class="t" x1="' + f(e.x + nx * t) + '" y1="' + f(e.y + ny * t) + '" x2="' + f(e.x - nx * t) + '" y2="' + f(e.y - ny * t) + '"/>'; });
      });
      // label: pilih posisi kandidat dengan penalti terkecil — tidak menabrak objek, label lain, atau garis
      vis.forEach(function (q) {
        var lw = dimLabelW(q.k, q.t), lh = 14, best = null;
        dimCandidates(q, c, lw, lh).forEach(function (cd, ci) {
          var r = cd.r, pen = cd.cost;
          if (rectHitsPoly(r, hull, 3)) pen += 1000;
          ui.forEach(function (o) { if (rectsHit(r, o, 6)) pen += 900; });
          if (cd.lead && hull.length > 2 && segsCrossPoly(cd.lead, hull)) pen += 60;
          placed.forEach(function (o) { if (rectsHit(r, o, 4)) pen += 800; });
          vis.forEach(function (o) { if (segHitsRect(o.a, o.b, r, 1)) pen += o === q ? 120 : 300; });
          if (r.x < 6 || r.y < 6 || r.x + r.w > innerWidth - 6 || r.y + r.h > innerHeight - 6) pen += 600;
          if (dimsPrevPos[q.k] === ci) pen -= 4;   // tahan posisi lama → tidak bergetar
          if (!best || pen < best.pen) best = { pen: pen, r: r, ci: ci, lead: cd.lead };
        });
        dimsPrevPos[q.k] = best.ci; placed.push(best.r);
        var r = best.r;
        if (best.lead) html += '<line class="ld" x1="' + f(best.lead.x) + '" y1="' + f(best.lead.y) + '" x2="' + f(best.lead.ex) + '" y2="' + f(best.lead.ey) + '"/>';
        if (best.pen >= 900) html += '<rect class="bg" x="' + f(r.x - 5) + '" y="' + f(r.y - 2) + '" width="' + f(r.w + 10) + '" height="' + f(r.h + 4) + '" rx="4"/>';
        html += '<text x="' + f(r.x) + '" y="' + f(r.y + r.h / 2) + '" dominant-baseline="middle"><tspan class="k">' + esc(q.k) + '</tspan><tspan dx="6">' + esc(q.t) + '</tspan></text>';
      });
    }
    if (html !== dimsHtml) { dimsHtml = html; dimsSvg.innerHTML = html; }
    dimsSvg.classList.toggle('is-on', !!html);
    return !!html;
  }
  XW.onFrame = function (L) {
    // garis ukur hanya tampil bila Pengaturan › Tampilkan ukuran aktif
    renderDims(L.dims);
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
  if (XW.ok) { applyLighting(); if (themeNow() === 'light') XW.setTheme('light', 0); applyBg(); applyLook(); }
  cubixDetail();
  function preload(list, cb) {
    var n = 0;
    return Promise.all(list.map(function (u) { return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = function () { n++; cb(n / list.length); res(); }; im.src = u; }); }));
  }
  function warm() {
    // siapkan potongan foto beberapa karya populer agar pergantian di panggung instan
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
