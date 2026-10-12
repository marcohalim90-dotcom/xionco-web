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
    if (p.indexOf('assets/') === 0) return '../' + p;  // aset lokal (folder assets/ di root)
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
      atelier: { n: T('02 — Atelier'), t: 'Atelier', p: T('Rancang sofa modular CUBIX: komposisi, material, base, hingga suasana ruang. Estimasi langsung, penawaran via WhatsApp.'), m: T('8 material · 4 base · 3 suasana') },
      manufaktur: { n: T('03 — Manufaktur'), t: T('Manufaktur'), p: T('Empat pabrik di Jawa — dari pengolahan kayu di Jepara hingga pengemasan di Jakarta Selatan.'), m: T('30+ sofa per hari · 80+ pekerja') },
      bisnis: { n: T('04 — Bisnis'), t: 'For Business', p: T('Space plan, produk dalam jumlah besar, interior, dan built-in untuk kantor, hotel, dan retail. Penawaran dalam 1 jam.'), m: T('Cicilan 0% · garansi 3 tahun') },
      galeri: { n: T('05 — Galeri'), t: T('Galeri'), p: T('Proyek dan inspirasi: solusi kelistrikan ruang rapat, pencahayaan, plafon custom, hingga detail material.'), m: T('{n} karya terpilih', { n: XV.MUSE.length }) },
      kontak: { n: T('06 — Kontak'), t: T('Kontak'), p: T('Showroom di Jl. Ciputat Raya No. 8, Jakarta Selatan. Konsultasi privat tanpa biaya melalui WhatsApp.'), m: '+62 822-4040-8055' },
      tas: { n: T('Tas belanja'), t: T('Tas Anda'), p: T('Karya yang Anda pilih. Lanjutkan ke pembayaran kapan saja.'), m: T('Harga mengikuti xionco.shop') },
      bayar: { n: T('Pembayaran'), t: T('Pembayaran'), p: T('Periksa pesanan, isi data pengiriman, lalu pilih metode pembayaran.'), m: T('Transaksi aman') },
      custom: { n: T('Custom'), t: T('Custom'), p: T('Ukuran, material, dan detail sesuai ruang Anda — diproduksi di pabrik kami sendiri.'), m: T('Penawaran dalam 1 jam kerja') },
      setelan: { n: T('Pengaturan'), t: T('Pengaturan'), p: T('Bahasa dan tema tampilan. Tersimpan di perangkat ini.'), m: 'Maison XIONCO' },
      profil: { n: T('Profil'), t: T('Akun Anda'), p: T('Pesanan dan permintaan custom Anda di perangkat ini.'), m: 'Maison XIONCO' }
    };
  }
  buildSections();
  var ROUTES = ['home', 'koleksi', 'atelier', 'manufaktur', 'bisnis', 'galeri', 'kontak', 'tas', 'bayar', 'custom', 'setelan', 'profil'];

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
    var f = fabric(), b = base();
    setDetail({
      name: 'CUBIX Modular', sub: cfg.seats + ' Seater' + (cfg.arms ? '' : ' Armless') + (cfg.ottoman ? ' + Ottoman' : ''),
      cols: [[T('Dimensi'), 'W ' + widthCm() + ' · D ' + S.depth + ' · H ' + S.height + ' cm'], [T('Material'), f.name + ' · ' + T(b.name)]],
      priceK: T('Estimasi'), price: rupiah(price()),
      act: current === 'atelier' ? { t: T('Penawaran'), icon: 'i-wa', href: $('#aQuote').href } : { t: T('Rancang'), icon: 'i-arrow', fn: function () { go('atelier'); } }
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
    else cubixDetail();
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
      html.style.setProperty('--cx', '0px');
      return;
    }
    var l = 100, r = on ? panel.offsetWidth + 28 + 24 : descEl.offsetWidth + 28 + 24;
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
    if (id === 'atelier') { showCubix(); if (XW.ok) XW.setMood(cfg.mood); }
    else if (id === 'manufaktur') { stageKind = 'map'; if (XW.ok) { XW.showMap(); XW.setMood('senja'); } mapDetail(-1); }
    else if (id === 'galeri') { showArt(galSel); if (XW.ok) XW.setMood('senja'); }
    else {
      if (stageKind === 'map' || stageKind === 'art') showFurniture();
      else if (stageKind === 'cubix') cubixDetail();
      if (XW.ok && prev !== id) XW.setMood('senja');
    }
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
    else if (kind === 'cubix' && current !== 'atelier') go('atelier');
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
      (p.id === 'cubix' ? '<dt>Atelier</dt><dd><a href="#/atelier" data-go="atelier">' + T('Rancang komposisi Anda →') + '</a></dd>' : '');
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
  $('#pdCustom').addEventListener('click', function () { var p = kList[kI]; if (p.id === 'cubix') go('atelier'); else openCustom(p); });
  enter.koleksi = function () { if (!kReady) { kReady = true; renderGrid(); } };
  leave.koleksi = function (to) { if (to !== 'custom' && to !== 'bayar') closePd(); };

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
     CUSTOM — dari produk reguler (tercatat di Developer Settings › Custom)
     ====================================================================== */
  var cusP = null;
  function openCustom(p) {
    cusP = p;
    $('#cusName').textContent = p.name;
    $('#cusType').textContent = p.type;
    var c = cur(p), opts = [];
    (p.variants || []).forEach(function (v) { var l = [v.group ? T(v.group) : '', v.label].filter(Boolean).join(' · '); if (opts.indexOf(l) < 0) opts.push(l); });
    if (!opts.length) opts.push(T('Sesuai produk'));
    opts.push(T('Lainnya (tulis di catatan)'));
    var curLab = c.v ? [c.v.group ? T(c.v.group) : '', c.v.label].filter(Boolean).join(' · ') : '';
    $('#cColor').innerHTML = opts.map(function (o) { return '<option' + (o === curLab ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
    var mat = c.v && /faux|leather/i.test(c.v.group) ? 'Faux leather' : 'Fabric';
    $$('#cMat option').forEach(function (o) { o.selected = o.value === mat; });
    var cst = store.get('xv5_customer', {});
    if (cst.name && !$('#cName').value) $('#cName').value = cst.name;
    if (cst.phone && !$('#cPhone').value) $('#cPhone').value = cst.phone;
    if (cst.city && !$('#cCity').value) $('#cCity').value = cst.city;
    $('#cusNote').classList.remove('is-err'); $('#cusNote').textContent = T('Permintaan dikirim melalui WhatsApp resmi XIONCO.');
    if (current !== 'custom') go('custom');
  }
  $('#cusBack').addEventListener('click', function () { if (cusP) openProduct(cusP); else go('koleksi'); });
  enter.custom = function () { if (!cusP) go('koleksi'); };
  $('#cusForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!cusP) return;
    var v = function (id) { return $('#' + id).value.trim(); };
    var name = v('cName'), phone = v('cPhone').replace(/[^\d+]/g, ''), note = $('#cusNote');
    $('#cName').parentNode.classList.toggle('is-err', !name);
    $('#cPhone').parentNode.classList.toggle('is-err', phone.length < 8);
    if (!name || phone.length < 8) { note.textContent = T('Mohon lengkapi nama dan nomor WhatsApp yang valid.'); note.classList.add('is-err'); return; }
    note.classList.remove('is-err');
    var p = cusP, c = cur(p), num = function (id) { var n = parseInt(v(id), 10); return isFinite(n) && n > 0 ? n : ''; };
    var data = {
      item: p.id, basePrice: c.price || '', qty: num('cQty') || 1, w: num('cW'), d: num('cD'), h: num('cH'),
      matType: $('#cMat').value, matColor: $('#cColor').value, leg: $('#cLeg').value, notes: v('cNote'),
      custName: name, custPhone: phone, custCity: v('cCity'), channel: 'Website', status: 'Konsultasi'
    };
    if (window.XVDB && XVDB.saveCustom) { try { XVDB.saveCustom({ type: 'existing', data: data }); } catch (err) {} }
    var reqs = store.get('xv5_requests', []); reqs.unshift({ id: 'CR-' + Date.now().toString(36).toUpperCase(), created: Date.now(), name: p.name, type: p.type, data: data }); store.set('xv5_requests', reqs.slice(0, 50));
    var cst = store.get('xv5_customer', {}); cst.name = name; cst.phone = phone; if (data.custCity) cst.city = data.custCity; store.set('xv5_customer', cst);
    var size = [data.w && 'W ' + data.w, data.d && 'D ' + data.d, data.h && 'H ' + data.h].filter(Boolean).join(' × ');
    var msg = T('Halo XIONCO, saya {name} ({phone}) ingin custom {item}:', { name: name, phone: phone, item: p.name + ' — ' + p.type }) +
      (size ? '\n• ' + T('Ukuran') + ': ' + size + ' cm' : '') + '\n• ' + T('Material') + ': ' + data.matType + ' · ' + data.matColor +
      '\n• ' + T('Kaki / base') + ': ' + data.leg + '\n• ' + T('Jumlah') + ': ' + data.qty + (data.custCity ? '\n• ' + T('Kota') + ': ' + data.custCity : '') + (data.notes ? '\n• ' + T('Catatan') + ': ' + data.notes : '');
    window.open(wa(msg), '_blank', 'noopener');
    note.textContent = T('Permintaan terkirim — tim kami membalas dalam 1 jam kerja.');
    renderProfile();
  });

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
  function renderSettings() {
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
     ATELIER
     ====================================================================== */
  var S = XV.STUDIO;
  var DEF = { seats: 3, arms: true, ottoman: false, fabric: 'fb03', base: 'walnut', mood: 'senja' };
  var cfg = Object.assign({}, DEF, store.get('xv5_atelier', store.get('xv4_atelier', {})));
  var priceObj = { v: 0 };
  $('#aFabrics').innerHTML = S.fabrics.map(function (f) { return '<button class="swatch" type="button" data-fabric="' + f.id + '" data-type="' + f.type + '" style="--c:' + f.color + '" aria-label="' + f.code + ' ' + f.name + '"></button>'; }).join('');
  function renderBases() { $('#aBases').innerHTML = S.bases.map(function (b) { return '<button type="button" data-base="' + b.id + '" style="--c:' + b.color + '"><i></i>' + esc(T(b.name)) + '</button>'; }).join(''); }
  renderBases();
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
    $('#aQuote').href = wa(T('Halo XIONCO, saya ingin penawaran CUBIX Modular (dirancang di Maison XIONCO):') + '\n• ' + T('Komposisi') + ': ' + cfg.seats + ' seater' + (cfg.arms ? ' ' + T('dengan lengan') : ' ' + T('tanpa lengan')) +
      '\n• Ottoman: ' + (cfg.ottoman ? T('ya') : T('tidak')) + '\n• ' + T('Material') + ': ' + f.code + ' ' + f.name + '\n• Base: ' + T(b.name) +
      '\n• ' + T('Ukuran') + ': W ' + widthCm() + ' × D ' + S.depth + ' × H ' + S.height + ' cm\n• ' + T('Estimasi di website') + ': ' + rupiah(target));
    if (stageKind === 'cubix') cubixDetail();
    store.set('xv5_atelier', cfg);
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
    if (cusP && current === 'custom') openCustom(cusP);
    renderSettings(); renderProfile(); renderStages(); renderServices(); renderGallery(); renderBases();
    if (stageSel >= 0) setStage(stageSel);
    atelierUpdate(false);
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
  if (XW.ok) { atelierUpdate(false); if (themeNow() === 'light') XW.setTheme('light', 0); }
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
