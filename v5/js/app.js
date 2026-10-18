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
  var LOCAL_HOST = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/.test(location.hostname);
  var SAVE_DATA = !!(navigator.connection && (navigator.connection.saveData || /^(slow-2g|2g|3g)$/.test(navigator.connection.effectiveType || '')));
  /* Pengaturan › Grafis: Otomatis (mulai ringan → naik ke penuh bila lancar) · Ringan (terkunci) · Tinggi (terkunci) */
  function gfxNow() { var g = store.get('xv5_gfx', 'auto'); return /^(auto|lite|hd)$/.test(g) ? g : 'auto'; }
  function gfxOpts(g) {
    var low = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    return g === 'lite' ? { quality: 0, qLock: true } : g === 'hd' ? { quality: 2, qLock: true } : { quality: 1, autoUp: low ? 1 : 2 };
  }
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
  var catLabel = function (id) { var c = XV.CATEGORIES.filter(function (x) { return x.id === id; })[0]; return T(c ? c.label : id); };
  /* kategori Koleksi = kategori xionco.shop (urutan & gambar sama seperti toko); p.kats dari tools/import-shop.js */
  var KATS = [['Sofa', 'sofa'], ['Bed', 'bed'], ['Sofa Bed', 'sofa-bed'], ['Desk', 'desk'], ['Cabinet', 'cabinet'], ['Table', 'table'], ['Chair', 'chair'], ['Ottoman', 'ottoman'], ['Hardware', 'hardware'], ['Lightings', 'lightings'], ['Lifestyle', 'lifestyle'], ['Smart', 'smart'], ['Accent', 'accent']];
  var katImg = function (k) { return '../assets/kats/' + k + '.webp'; };   // gambar kategori xionco.shop, dikecilkan (tools/kat-img.js)
  var katsOf = function (p) { return p.kats && p.kats.length ? p.kats : [catLabel(p.cat)]; };
  // sub-filter jumlah dudukan hanya untuk Sofa (pemilik)
  var SOFA_SUB = [['1s', '1 Seat', /\b1 ?seat|\b1s\b|single|one seat|\(a[cl]\)|seater ?\(?a[cl]\)?$|armchair|armless/], ['2s', '2 Seat', /\b2 ?seat|\b2s\b|sf2s|two seat|ac,? ?ac/], ['3s', '3 Seat', /\b3 ?seat|\b3s\b|sf3s|three seat|ac,? ?al,? ?ac/], ['set', 'Sectional & set', /sectional|set l|5 seater/]];
  var subOk = function (p, sub) { var t = (p._ft = p._ft || [p.name, p.type, p.shopName || ''].join(' ').toLowerCase()); return SOFA_SUB.some(function (r) { return r[0] === sub && r[2].test(t); }); };
  function inKat(p, kat, sub) { return (kat === 'all' || katsOf(p).indexOf(kat) >= 0) && (!sub || subOk(p, sub)); }
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

  /* thumbnail: gambar utama xionco.shop apa adanya — penuh kotak dengan latarnya sendiri, sama seperti di toko */
  function thumbImg(p, u) {
    u = u || src(p.img, 768);
    if (!u) return '<span class="noimg"><svg><use href="#i-frame"/></svg><em>' + esc(T('Foto menyusul')) + '</em></span>';   // produk lokal tanpa foto
    return '<img class="is-photo" data-cut="' + esc(u) + '" alt="' + esc(p.name) + '">';
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
        im.onload = function () { im.classList.add('is-ready'); }; im.src = u; done();
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
      cubix: { n: 'CUBIX', t: T('Konfigurasi CUBIX'), p: T('Susun modul AC, AL, OT dan meja CUBIX sesuka Anda — pilih kayu & kain, lihat harganya langsung.'), m: 'Maison XIONCO' },
      more: { n: '07 — More', t: 'More', p: T('Pengaturan, konfigurasi CUBIX, dan alat lainnya.'), m: 'Maison XIONCO' },
      profil: { n: T('Profil'), t: T('Akun Anda'), p: T('Pesanan dan permintaan custom Anda di perangkat ini.'), m: 'Maison XIONCO' },
      ruang: { n: T('Ruang'), t: T('Ruang Anda'), p: T('Beberapa furnitur tampil bersama di panggung — geser untuk menata.'), m: 'Maison XIONCO' },
      penawaran: { n: T('Penawaran'), t: T('Penawaran khusus'), p: T('Harga khusus dari tim XIONCO untuk Anda.'), m: 'Maison XIONCO' }
    };
  }
  buildSections();
  var ROUTES = ['home', 'koleksi', 'customize', 'manufaktur', 'bisnis', 'galeri', 'kontak', 'tas', 'bayar', 'setelan', 'profil', 'ruang', 'cubix', 'penawaran'];
  var ALIAS = { atelier: 'customize', custom: 'customize' };   // tautan lama tetap berfungsi

  /* ======================================================================
     Kursor — satu bentuk yang rapi, tanpa teks.
     • titik champagne kecil
     • di atas tombol/tautan: membesar jadi cincin tipis & menempel ke tengah target
     • di atas objek panggung: cincin; bila bisa diputar, dengan ikon ‹ ›
     • di atas kolom ketik: disembunyikan (kursor teks bawaan)
     ====================================================================== */
  var cur$ = $('#cursor'), curC = $('.cursor__c', cur$);
  // panah putar di kursor = petunjuk awal: hilang setelah pengunjung pernah memutar objek
  (function () {
    var k = 'xv5_spun', x0 = 0, y0 = 0, on = false;
    if (store.get(k, 0)) cur$.classList.add('is-learned');
    addEventListener('pointerdown', function (e) { on = cur$.classList.contains('is-drag'); x0 = e.clientX; y0 = e.clientY; }, true);
    addEventListener('pointerup', function (e) { if (on && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 30) { store.set(k, 1); cur$.classList.add('is-learned'); } on = false; }, true);
  })();
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
  // act: { t: 'Urungkan', fn } → tombol di notifikasi (tampil lebih lama)
  function notice(text, act) {
    noticeEl.textContent = text;
    if (act) { var nb = document.createElement('button'); nb.type = 'button'; nb.className = 'notice__act'; nb.textContent = act.t; nb.addEventListener('click', function () { noticeEl.classList.remove('is-on'); act.fn(); }); noticeEl.appendChild(nb); }
    noticeEl.classList.toggle('has-act', !!act);
    noticeEl.classList.add('is-on');
    clearTimeout(noticeT);
    noticeT = setTimeout(function () { noticeEl.classList.remove('is-on'); }, act ? 6500 : 2800);
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
  /* More: hover item More → kotak pilihan di samping rail (Pengaturan, Konfigurasi CUBIX, …); klik / ketuk juga membuka */
  var MORE_KEYS = ['setelan', 'cubix', 'ruang'], moreBtn = $('#railMore'), moreBox = $('#moreBox'), moreT = 0;
  function moreOpen(on) {
    clearTimeout(moreT);
    if (on) {
      var r = moreBtn.getBoundingClientRect(), mob = isMobile();
      // desktop: di sebelah rail yang sudah melebar penuh (200 px), bukan lebar saat animasi
      moreBox.style.left = (mob ? Math.max(12, Math.min(innerWidth - moreBox.offsetWidth - 12, r.left + r.width / 2 - moreBox.offsetWidth / 2)) : html.classList.contains('lay3') ? railEl.getBoundingClientRect().right - 200 - 10 - moreBox.offsetWidth : railEl.getBoundingClientRect().left + 200 + 10) + 'px';   // layout III: sidebar kanan → kotak More di kirinya
      moreBox.style.top = (mob ? r.top - moreBox.offsetHeight - 12 : Math.min(innerHeight - moreBox.offsetHeight - 12, r.top - 6)) + 'px';
    }
    moreBox.classList.toggle('is-on', on); moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  var moreLater = function () { clearTimeout(moreT); moreT = setTimeout(function () { moreOpen(false); }, 220); };
  moreBtn.addEventListener('pointerenter', function () { if (FINE && !isMobile()) moreOpen(true); });
  moreBtn.addEventListener('pointerleave', function () { if (FINE && !isMobile()) moreLater(); });
  moreBtn.addEventListener('click', function () { moreOpen(!moreBox.classList.contains('is-on')); });
  moreBox.addEventListener('pointerenter', function () { clearTimeout(moreT); clearTimeout(railT); if (!isMobile()) railEl.classList.add('is-open'); });
  moreBox.addEventListener('pointerleave', function () { if (!FINE) return; moreLater(); railT = setTimeout(function () { railEl.classList.remove('is-open'); }, 240); setDesc(current); });
  moreBox.addEventListener('click', function (e) { if (e.target.closest('.more__item')) moreOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && moreBox.classList.contains('is-on')) { moreOpen(false); moreBtn.focus(); } });
  document.addEventListener('pointerdown', function (e) { if (moreBox.classList.contains('is-on') && !moreBox.contains(e.target) && !moreBtn.contains(e.target)) moreOpen(false); });
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
    $('#dName').title = o.name || '';
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
    detailEl.classList.toggle('is-tiny', free < 600);
  }
  /* kartu bawah sesuai halaman: tombol aksi disembunyikan bila panel sudah punya tombol beli untuk barang yang sama;
     Tas & Checkout → ringkasan isi (bukan barang terakhir di panggung) */
  var detailSum = false;
  function detailMode() {
    var own = (current === 'koleksi' && pd.classList.contains('is-on')) || current === 'customize' || current === 'cubix' || current === 'tas' || current === 'bayar' || current === 'penawaran';
    html.classList.toggle('no-dact', own);
    if (current === 'tas' || current === 'bayar') {
      var ls = current === 'tas' ? bagLines() : coLines(), n = ls.reduce(function (a, l) { return a + l.q; }, 0);
      setDetail({ name: current === 'tas' ? T('Tas Anda') : T('Checkout'), sub: n ? T('{n} barang', { n: n }) : T('Tas masih kosong.'), cols: [], priceK: T('Subtotal'), price: n ? rupiah(sumOf(ls)) : '' });
      detailSum = true;
    } else if (detailSum) { detailSum = false; refreshDetail(); }
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
      cols: [c.label ? [T('Varian'), c.label] : [T('Kategori'), T(katsOf(p)[0])], [T('Kirim'), T('1–3 hari kerja')]],
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
  // bagian varian di panggung (mis. VERK Laci = kabinet laci ditempel ke meja, bukan model baru) — p.vparts { label: path }
  function partOf(p, c) { return c && c.v && p.vparts && p.vparts[c.v.label] || ''; }
  function stageModelOf(p, c) { return p.vparts ? p.model || '' : modelOf(p, c); }
  function stageShow(p) {
    var s = selOf(p), c = cur(p, s), photo = src(s.touched ? c.img : p.img, 1024);
    var mdl = stageModelOf(p, c); furniture.mdl = mdl;
    if (mdl) { var pr = XW.showModel(p, src(mdl), photo, c.hex); if (pr && pr.then) pr.then(function () { var pt = partOf(p, c); if (pt && XW.setPart) XW.setPart(src(pt), false); if (pcFor(p)) { if (!pcz.w0) pcInit(p); else pcApply(); } }); }
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
  /* TAUTAN LANGSUNG (iklan, admin):
       #/p/<id>?v=<varian>&s=<sub>  → buka produk dengan varian terpilih
       #/q/<KODE>                   → penawaran harga khusus (dicek ke server)
     Parameter iklan (?utm_source=…, fbclid, gclid) di depan # dicatat & ikut ke pesanan. */
  var deep = null;
  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, ''), h = raw.split('?')[0], qs = new URLSearchParams(raw.split('?')[1] || ''), m;
    if ((m = h.match(/^p\/([\w-]+)/))) { deep = { p: m[1], v: qs.get('v'), s: qs.get('s') }; return 'koleksi'; }
    if ((m = h.match(/^q\/([A-Za-z0-9]{4,16})/))) { deep = { q: m[1].toUpperCase() }; return 'penawaran'; }
    h = ALIAS[h] || h; return ROUTES.indexOf(h) >= 0 && h !== 'penawaran' ? h : 'home';
  }
  var UTM = (function () {
    var o = {}, n = 0;
    try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_[a-z]+|fbclid|gclid|ttclid)$/.test(k)) { o[k] = v.slice(0, 120); n++; } }); } catch (e) {}
    if (n) { o.at = Date.now(); o.land = location.hash || '#/'; try { sessionStorage.setItem('xv5_utm', JSON.stringify(o)); } catch (e) {} return o; }
    try { return JSON.parse(sessionStorage.getItem('xv5_utm') || 'null'); } catch (e) { return null; }
  })();
  function go(id) {
    if (ROUTES.indexOf(id) < 0) return;
    var h = id === 'home' ? '#/' : id === 'penawaran' ? '#/q/' + (Q.code || '') : '#/' + id;
    if (location.hash !== h && !(id === 'home' && (location.hash === '' || location.hash === '#'))) location.hash = h;
    else open(id);
  }
  window.addEventListener('hashchange', function () { if (booted) open(parseHash()); });
  function insets() {
    var on = current !== 'home';
    if (isMobile()) {
      html.classList.remove('lay3');
      stageInset = { l: 0, r: 0 };
      if (XW.ok) XW.setInsets(0, 0, on ? panel.offsetHeight + 76 + 74 : 150, on ? 64 : 230);
      html.style.setProperty('--cx', '0px');
      return;
    }
    var lay3 = czlNow() === 3; html.classList.toggle('lay3', lay3);
    var side = on ? panel.offsetWidth + 28 + 24 : descEl.offsetWidth + 28 + 24;
    var l = lay3 ? side : 100, r = lay3 ? 100 : side;   // layout III: panel / deskripsi di kiri, sidebar di kanan
    if (!on) l = r = Math.max(l, r);   // beranda: produk & kartu harga tepat di tengah layar
    [$('#czPicker'), $('#cbxGrid'), $('#shellEd'), $('#roomAddBox')].forEach(function (pk) {
      if (!(on && pk && pk.classList.contains('is-on'))) return;
      if (lay3 || html.classList.contains('cz-box3')) l += pk.offsetWidth + 14; else r += pk.offsetWidth + 14;   // layout III: kotak di kanan panel kiri
    });
    stageInset = { l: l, r: r };
    if (XW.ok) XW.setInsets(l, r, 110, 84);
    html.style.setProperty('--cx', ((l - r) / 2) + 'px');
    requestAnimationFrame(fitDetail);
  }
  var TOP_PANES = { profil: '#userBtn', tas: '#bagBtn', bayar: '#bagBtn' };   // Ruang & Pengaturan di rail › More   // Pengaturan pindah ke rail › More
  function titleOf(id) { return id === 'home' ? 'Maison XIONCO — Quality shouldn\'t be a luxury' : SECTIONS[id].t + ' — Maison XIONCO'; }
  function open(id) {
    var prev = current;
    current = id;
    html.classList.toggle('is-panel', id !== 'home'); html.dataset.pane = id;
    $$('.rail__item').forEach(function (a) { a.classList.toggle('is-on', a.dataset.key === id || (a.id === 'railMore' && MORE_KEYS.indexOf(id) >= 0)); });
    $$('.more__item').forEach(function (a) { a.classList.toggle('is-on', a.dataset.moreKey === id); });
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
    if (id === 'customize' || id === 'ruang' || id === 'cubix') { /* panggung diatur enter.customize → czStage / enter.ruang / enter.cubix */ }
    else if (id === 'manufaktur') { stageKind = 'map'; if (XW.ok) XW.showMap(); mapDetail(-1); }
    else if (id === 'galeri') showArt(galSel);
    else {
      if (stageKind === 'map' || stageKind === 'art') showFurniture();
      else if (stageKind === 'cubix') cubixDetail();
      else if (stageKind === 'custom') czDetail();
    }
    if (XW.ok && prev !== id) applyLighting();
    // model 3D cukup besar → mulai diunduh saat koleksi dibuka, agar tampil seketika saat dipilih
    // (Q1) model diunduh saat dipilih; kartu yang terlihat di Koleksi di-prefetch pelan saat idle — lihat pfObserve()
    if (XW.ok) XW.setRoom(id);
    if (enter[id]) enter[id](prev);
    if (prev !== id && leave[prev]) leave[prev](id);
    insets(); detailMode();
    if (deep && deep.p) { var dp = deep; deep = null; deepProduct(dp); }
  }
  // varian dari tautan: cocokkan kunci, label (huruf kecil, tanda → '-'), "grup-label", atau nomor urut
  var slug = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  function pickIdx(list, want) {
    if (want == null || want === '' || !list || !list.length) return -1;
    var w = slug(want);
    for (var i = 0; i < list.length; i++) { var x = list[i]; if (slug(x.key) === w || slug(x.label) === w || slug((x.group || '') + ' ' + x.label) === w) return i; }
    return /^\d+$/.test(want) && +want < list.length ? +want : -1;
  }
  function deepProduct(d) {
    var p = byId[d.p];
    if (!p) { notice(T('Produk dari tautan tidak ditemukan')); return; }
    var vi = pickIdx(p.variants, d.v);
    if (vi >= 0) { var v = p.variants[vi], si = pickIdx(v.subs, d.s); vsel[p.id] = { v: vi, s: si >= 0 ? si : subDef(v), touched: true }; }
    openProduct(p);
  }
  var enter = {}, leave = {};
  /* ---------- PENAWARAN HARGA KHUSUS (#/q/KODE)
     Harga khusus dikunci di server: situs hanya meminta data dengan kode; saat bayar, server yang menghitung tagihan. */
  var XAPI = window.XV_API || '/api/';   // nanti: alamat server sungguhan
  var Q = { code: null, data: null, err: null };
  function qFetch(path, opt) {
    return fetch(XAPI + path, Object.assign({ cache: 'no-store' }, opt || {}))
      .then(function (r) { return r.json().then(function (j) { return j; }, function () { return { ok: false, error: T('Server penawaran belum tersedia') }; }); },
        function () { return { ok: false, error: T('Server penawaran belum tersedia') }; });
  }
  enter.penawaran = function () {
    var code = deep && deep.q || Q.code; deep = null;
    if (!code) { go('home'); return; }
    if (Q.code === code && Q.data) { qRender(); qStage(); return; }
    Q.code = code; Q.data = null; Q.err = null; qRender();
    qFetch('pub/q/' + encodeURIComponent(code)).then(function (r) {
      if (Q.code !== code) return;
      if (!r || !r.ok) { Q.err = r && r.error || T('Penawaran tidak dapat dibuka'); qRender(); return; }
      Q.data = r.quote; qRender(); if (current === 'penawaran') qStage();
    });
  };
  function qUnitNormal(q) { return q.normal || 0; }
  function qRender() {
    var box = $('#qBody'); if (!box) return;
    var q = Q.data;
    $('#qT').textContent = q ? q.title : Q.err ? T('Penawaran tidak tersedia') : T('Memuat penawaran…');
    if (!q) {
      box.innerHTML = Q.err ? '<div class="card"><p class="txt" style="margin-bottom:14px">' + esc(Q.err) + '.</p><p class="txt" style="margin-bottom:14px">' + T('Kode') + ': <b>' + esc(Q.code || '') + '</b></p>' +
        '<a class="btn btn--gold btn--full" href="' + wa(T('Halo XIONCO, saya ingin menanyakan penawaran dengan kode {c}.', { c: Q.code || '' })) + '" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg><span>' + T('Tanya via WhatsApp') + '</span></a></div>'
        : '<p class="txt">' + T('Memeriksa kode penawaran…') + '</p>';
      return;
    }
    var qty = q.qty || 1, total = q.price * qty, norm = qUnitNormal(q) * qty, save = norm > total ? Math.round((1 - total / norm) * 100) : 0;
    var left = q.expires ? Math.max(0, Math.ceil((q.expires - Date.now()) / 864e5)) : null;
    box.innerHTML = '<p class="eyebrow" style="margin-bottom:10px">' + T('Kode') + ' · ' + esc(q.code) + '</p>' +
      (q.sub ? '<p class="txt" style="margin-bottom:16px">' + esc(q.sub) + '</p>' : '') +
      '<dl class="kv" style="margin-bottom:18px">' +
      '<dt>' + T('Jumlah') + '</dt><dd>' + qty + '</dd>' +
      (norm > total ? '<dt>' + T('Harga normal') + '</dt><dd><s>' + rupiah(norm) + '</s></dd>' : '') +
      '<dt>' + T('Harga khusus') + '</dt><dd class="price">' + rupiah(total) + '</dd>' +
      (save ? '<dt>' + T('Hemat') + '</dt><dd>' + save + '%</dd>' : '') +
      (q.expires ? '<dt>' + T('Berlaku sampai') + '</dt><dd>' + dateText(q.expires) + (left != null ? ' · ' + T('{n} hari lagi', { n: left }) : '') + '</dd>' : '') + '</dl>' +
      (q.note ? '<div class="card" style="margin-bottom:18px"><p class="sh"><span>' + T('Catatan dari XIONCO') + '</span></p><p class="txt">' + esc(q.note).replace(/\n/g, '<br>') + '</p></div>' : '') +
      '<button class="btn btn--gold btn--full" type="button" data-q-pay><svg><use href="#i-card"/></svg><span>' + T('Bayar sekarang') + '</span></button>' +
      '<a class="btn btn--line btn--full" style="margin-top:10px" href="' + wa(T('Halo XIONCO, saya ingin menanyakan penawaran {c} ({t}).', { c: q.code, t: q.title })) + '" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg><span>' + T('Tanya via WhatsApp') + '</span></a>' +
      '<p class="note" style="margin-top:14px">' + T('Harga khusus dikunci di server dan hanya berlaku untuk kode ini.') + '</p>';
  }
  function qEntry() {
    var q = Q.data; if (!q) return null;
    return { type: 'quote', id: 'q-' + q.code, code: q.code, kind: q.kind, title: q.title, sub: q.sub, img: q.img, price: q.price, q: q.qty || 1, cfg: q.cfg, pid: q.pid, v: q.v, s: q.s };
  }
  function qStage() {
    var q = Q.data; if (!q || !XW.ok) return;
    if (q.kind === 'produk' && byId[q.pid]) {
      var p = byId[q.pid], vi = pickIdx(p.variants, q.v);
      if (vi >= 0) { var v = p.variants[vi], si = pickIdx(v.subs, q.s); vsel[p.id] = { v: vi, s: si >= 0 ? si : subDef(v), touched: true }; }
      stageKind = 'product'; furniture = { kind: 'product', p: p }; stageShow(p);
    } else if (q.cfg && window.XC) { stageKind = 'custom'; XW.showCustom(XC.normalize(JSON.parse(JSON.stringify(q.cfg)))); }
    qDetail();
  }
  function qDetail() {
    var q = Q.data; if (!q) return;
    setDetail({ name: q.title, sub: q.sub, cols: [[T('Kode'), q.code], [T('Berlaku sampai'), q.expires ? dateText(q.expires) : '—']], priceK: T('Harga khusus'), price: rupiah(q.price * (q.qty || 1)), was: q.normal > q.price ? rupiah(q.normal * (q.qty || 1)) : '',
      act: { t: T('Bayar'), icon: 'i-card', fn: function () { var e = qEntry(); if (e) openPay([e], 'penawaran'); } } });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-q-pay]')) { var en = qEntry(); if (en) openPay([en], 'penawaran'); } });
  leave.penawaran = function (to) { if (OWN_STAGE.indexOf(to) < 0 && to !== 'bayar') showFurniture(); };
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
      p._q = [p.name, t, p.cat, catLabel(p.cat), katsOf(p).join(' '), ID_CAT[p.cat] || '', p.shopName || '', vs].concat(ID_TYPE.filter(function (r) { return r[0].test(t); }).map(function (r) { return r[1]; })).join(' ').toLowerCase();
    });
  }
  indexProducts();
  var kCat = 'all', kSub = '', kList = [], kI = -1, kQty = 1, kReady = false;
  var grid = $('#kGrid'), kSearch = $('#kSearch'), pd = $('#pd');
  /* kotak Filter: kartu bergambar kategori xionco.shop + jumlah produk; Sofa punya jenis jumlah dudukan */
  var fltBox = $('#kFltBox'), fltBtn = $('#kFlt');
  function fCard(attr, on, label, img, n) {
    return '<button type="button" class="kfc' + (on ? ' is-on' : '') + '" ' + attr + (n ? '' : ' disabled') + '><span class="kfc__i">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') + '</span>' +
      '<span class="kfc__l">' + esc(T(label)) + '</span><em>' + n + '</em></button>';
  }
  function renderCats() {
    var all = XV.PRODUCTS, body = $('#kFltBody');
    var h = '<p class="og__h"><span>' + T('Kategori') + '</span><b>' + esc(kCat === 'all' ? T('Semua') : T(kCat)) + '</b></p><div class="kfg">' +
      fCard('data-fc="all"', kCat === 'all', 'Semua', '', all.length) +
      KATS.map(function (k) { return fCard('data-fc="' + k[0] + '"', kCat === k[0], k[0], katImg(k[1]), all.filter(function (p) { return inKat(p, k[0], ''); }).length); }).join('') + '</div>';
    if (kCat === 'Sofa') {
      var sofa = all.filter(function (p) { return inKat(p, 'Sofa', ''); });
      h += '<p class="og__h og__h--sub"><span>' + T('Jumlah dudukan') + '</span><b>' + esc(kSub ? T((SOFA_SUB.filter(function (r) { return r[0] === kSub; })[0] || [0, ''])[1]) : T('Semua')) + '</b></p><div class="kfg">' +
        SOFA_SUB.map(function (r) { var l = sofa.filter(function (p) { return subOk(p, r[0]); }), ph = l.filter(function (p) { return p.img; }).sort(function (a, b) { return (b.sold || 0) - (a.sold || 0); })[0]; return fCard('data-fs="' + r[0] + '"', kSub === r[0], r[1], ph ? src(ph.img, 240) : '', l.length); }).join('') + '</div>';
    }
    if (body && fltBox.classList.contains('is-on')) body.innerHTML = h;   // kotak tertutup: gambar belum diunduh
    var n = (kCat !== 'all' ? 1 : 0) + (kSub ? 1 : 0), parts = [];
    $('#kFltN').textContent = n || ''; fltBtn.classList.toggle('is-act', !!n);
    if (kCat !== 'all') parts.push(T(kCat));
    if (kSub) parts.push(T((SOFA_SUB.filter(function (r) { return r[0] === kSub; })[0] || [0, ''])[1]));
    var act = $('#kAct'); act.hidden = !parts.length;
    act.innerHTML = parts.length ? '<span>' + esc(parts.join(' · ')) + '</span><button type="button" data-fclear aria-label="' + esc(T('Hapus filter')) + '"><svg><use href="#i-close"/></svg></button>' : '';
  }
  function fltPlace() {
    if (!fltBox.classList.contains('is-on')) return;
    var pr = panel.getBoundingClientRect();
    fltBox.style.top = pr.top + 'px'; fltBox.style.maxHeight = pr.height + 'px';
    if (isMobile()) { fltBox.style.left = pr.left + 'px'; fltBox.style.width = pr.width + 'px'; return; }
    fltBox.style.width = '';
    fltBox.style.left = (html.classList.contains('lay3') ? pr.right + 14 : pr.left - 14 - fltBox.offsetWidth) + 'px';
  }
  function fltOpen(on) {
    fltBox.classList.toggle('is-on', !!on); fltBox.setAttribute('aria-hidden', on ? 'false' : 'true');
    fltBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); fltBtn.classList.toggle('is-on', !!on);
    if (on) renderCats();
    fltPlace();
  }
  function setKat(cat, sub) { kCat = cat; kSub = sub || ''; renderGrid(); renderCats(); fltPlace(); }
  fltBtn.addEventListener('click', function (e) { e.stopPropagation(); fltOpen(!fltBox.classList.contains('is-on')); });
  fltBox.addEventListener('click', function (e) {
    var c = e.target.closest('[data-fc]'), sb = e.target.closest('[data-fs]');
    if (c) setKat(c.dataset.fc === kCat && kCat !== 'all' ? 'all' : c.dataset.fc);
    else if (sb) setKat(kCat, sb.dataset.fs === kSub ? '' : sb.dataset.fs);
  });
  $('#kFltReset').addEventListener('click', function () { setKat('all'); });
  $('#kAct').addEventListener('click', function (e) { if (e.target.closest('[data-fclear]')) setKat('all'); });
  document.addEventListener('pointerdown', function (e) { if (fltBox.classList.contains('is-on') && !fltBox.contains(e.target) && !fltBtn.contains(e.target)) fltOpen(false); });
  addEventListener('resize', fltPlace);
  renderCats();
  function renderGrid() {
    var q = kSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    kList = XV.PRODUCTS.filter(function (p) { return inKat(p, kCat, kSub) && q.every(function (w) { return p._q.indexOf(w) >= 0; }); });
    var selId = furniture.kind === 'product' ? furniture.p.id : furniture.kind === 'cubix' ? 'cubix' : null;
    grid.innerHTML = kList.map(function (p, i) {
      var hx = (p.variants || []).filter(function (v) { return v.hex; }), dots = hx.slice(0, 6).map(function (v) { return '<i style="--c:' + v.hex + '"></i>'; }).join('') + (hx.length > 6 ? '<b>+' + (hx.length - 6) + '</b>' : '');   // seperti xionco.shop: 6 warna, sisanya "+n"
      return '<button class="tile' + (p.id === selId ? ' is-on' : '') + '" type="button" data-i="' + i + '">' +
        '<span class="tile__img">' + thumbImg(p) + '</span>' +
        '<span class="tile__n">' + esc(p.name) + '</span><span class="tile__t">' + esc(p.type) + '</span>' +
        '<span class="tile__p">' + priceText(p) + (p.was ? '<s>' + rupiah(p.was) + '</s>' : '') + '</span>' +
        (dots ? '<span class="tile__v">' + dots + '</span>' : '') + '</button>';
    }).join('');
    cutThumbs(grid);
    $('#kEmpty').classList.toggle('is-on', !kList.length);
    pfObserve();
    $('#kCount').textContent = kList.length;
  }
  /* ---------- prefetch model (Q1): kartu Koleksi yang terlihat ≥ 0,7 dtk / disorot → antre, maks 2 unduhan sekaligus, saat browser idle.
     Tidak jalan bila hemat data aktif atau Grafis = Ringan. */
  var pfQ = [], pfBusy = 0, pfSeen = {}, pfIO = null;
  function pfOk() { return XW.ok && XW.preloadModel && !SAVE_DATA && gfxNow() !== 'lite'; }
  function pfUrl(p) { var m = p && modelOf(p, cur(p)); return m ? src(m) : ''; }
  function pfAdd(u, front) { if (!u || pfSeen[u] || !pfOk()) return; pfSeen[u] = 1; if (front) pfQ.unshift(u); else pfQ.push(u); pfPump(); }
  function pfPump() {
    if (pfBusy >= 2 || !pfQ.length) return;
    pfBusy++;
    (window.requestIdleCallback || function (f) { return setTimeout(f, 250); })(function () {
      var u = pfQ.shift(), done = function () { pfBusy--; pfPump(); };
      if (!u) { done(); return; }
      var pr = XW.preloadModel(u); if (pr && pr.then) pr.then(done, done); else done();
    }, { timeout: 2500 });
    pfPump();
  }
  function pfObserve() {
    if (!pfOk() || !('IntersectionObserver' in window)) return;
    if (pfIO) pfIO.disconnect();
    pfIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { var t = en.target; clearTimeout(t._pf); if (en.isIntersecting) t._pf = setTimeout(function () { pfAdd(pfUrl(kList[+t.dataset.i])); }, 700); });
    }, { root: $('#kolList'), threshold: .6 });
    $$('.tile', grid).forEach(function (t) { pfIO.observe(t); });
  }
  grid.addEventListener('pointerover', function (e) { var t = e.target.closest('.tile'); if (t) pfAdd(pfUrl(kList[+t.dataset.i]), true); });
  var sT = 0;
  kSearch.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(renderGrid, 120); });
  // cari & filter menempel: pita solid di atasnya saat menempel
  var kBar = $('#kBar'), kol = $('#kolList');
  kol.addEventListener('scroll', function () { kBar.classList.toggle('is-stuck', kBar.getBoundingClientRect().top - kol.getBoundingClientRect().top <= 65); }, { passive: true });
  grid.addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) pick(+t.dataset.i); });
  function pick(i) {
    kI = (i + kList.length) % kList.length;
    var p = kList[kI];
    advOpen(false);
    showProduct(p);
    $$('.tile', grid).forEach(function (t, k) { t.classList.toggle('is-on', k === kI); });
    fillPd(p, true);
    pd.classList.add('is-on'); pd.setAttribute('aria-hidden', 'false'); pd.scrollTop = 0; detailMode();
  }
  // buka halaman produk dari mana saja (mis. mengetuk objek di panggung, item di tas)
  window.XVOpen = function (id) { var p = byId[id]; if (p) openProduct(p); return !!p; };   // dipakai skrip uji & tautan langsung
  function openProduct(p) {
    if (!kReady) { kReady = true; renderGrid(); }
    var i = kList.indexOf(p);
    if (i < 0) { kCat = 'all'; kSub = ''; kSearch.value = ''; renderGrid(); renderCats(); i = kList.indexOf(p); }
    if (i < 0) return;
    kI = i;
    if (current !== 'koleksi') go('koleksi');
    if (!(furniture.kind === 'product' && furniture.p === p)) showProduct(p);
    if (!pd.classList.contains('is-on') || $('#pdName').textContent !== p.name) { fillPd(p, true); pd.scrollTop = 0; }
    pd.classList.add('is-on'); pd.setAttribute('aria-hidden', 'false'); detailMode();
    $$('.tile', grid).forEach(function (t, k) { t.classList.toggle('is-on', k === kI); });
  }
  function fillPd(p, anim) {
    if (pcz && pcz.pid !== p.id) pcz = null;
    var c = pcCur(p, cur(p)), disc = c.was && c.price ? Math.round((1 - c.price / c.was) * 100) : 0;
    $('#pdCat').textContent = T(katsOf(p)[0]) + (p.sold ? ' · ' + T('{n} terjual', { n: p.sold }) : '');
    $('#pdName').textContent = p.name;
    $('#pdType').textContent = p.type;
    $('#pdPrice').innerHTML = c.price ? '<b>' + priceText(p, c) + '</b>' + (c.was ? '<s>' + rupiah(c.was) + '</s><span class="tag tag--gold">' + T('Hemat') + ' ' + disc + '%</span>' : '') : '<b>' + T('Melalui penawaran') + '</b>';
    renderVariants(p);
    renderPhoto(p, c);
    renderInfo(p, c, anim);
    var canBuy = !!c.price && p.id !== 'cubix';
    $('#pdFoot').style.display = canBuy ? '' : 'none';
    $('#pdCustom').style.display = p.customizable || p.id === 'cubix' || p.model ? '' : 'none';
    $('#pdCfg').hidden = !(p.series === 'cubix' || p.id === 'cubix');
    pcRender();
    kQty = 1; $('#pdQty').textContent = 1;
    $('#pdWa').href = wa(T('Halo XIONCO, saya ingin tahu lebih lanjut tentang {name} ({type}).', { name: p.name, type: p.type + (c.label ? ' · ' + c.label : '') }));
    $('#pdWaText').textContent = c.price ? T('Tanya') : T('Tanya harga');
    $('#pdN').textContent = String(kI + 1).padStart(2, '0') + ' / ' + kList.length;
    if (ANIM && anim) G.fromTo($$('#pd > *').slice(1, 7), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .04, clearProps: 'transform' });
  }
  var vMore = {};   // produk → semua varian dibuka
  function renderVariants(p) {
    var vs = p.variants || [], s = selOf(p), c = cur(p, s);
    var box = $('#pdVar'), sub = $('#pdSub');
    if (!vs.length) { box.innerHTML = ''; sub.innerHTML = ''; box.hidden = sub.hidden = true; return; }
    box.hidden = false;
    var lab = function (v) { return [v.group ? T(v.group) : '', v.label].filter(Boolean).join(' · '); };
    var groups = [], dOf = function (i) { var x = cur(p, { v: i, s: subDef(vs[i]) }); return x.price && c.price ? x.price - c.price : 0; }, anyD = false;
    vs.forEach(function (v, i) { var g = v.group || ''; var gg = groups.filter(function (x) { return x.g === g; })[0]; if (!gg) groups.push(gg = { g: g, i: [] }); gg.i.push(i); if (i !== s.v && dOf(i)) anyD = true; });
    var order = [].concat.apply([], groups.map(function (gg) { return gg.i; })), more = order.length > 6 && !vMore[p.id] && order.indexOf(s.v) < 6;   // 6 pertama tampil
    var btn = function (i) {
      var v = vs[i], name = v.label.length > 15 ? v.label.slice(0, 14) + '…' : v.label, d = i === s.v ? 0 : dOf(i), hid = more && order.indexOf(i) >= 6;
      return '<button type="button" class="cz-o' + (i === s.v ? ' is-on' : '') + '" data-v="' + i + '" title="' + esc(lab(v)) + '"' + (hid ? ' hidden' : '') + '>' +
        (v.hex ? '<i class="cz-o__c' + (/faux|leather/i.test(v.group) ? ' is-leather' : '') + '" style="--c:' + v.hex + '"></i>' : '') + '<span>' + esc(name) + '</span>' + (anyD ? '<em class="cz-o__d' + (d < 0 ? ' is-neg' : '') + '">' + (d ? (d > 0 ? '+' : '−') + 'Rp ' + short(Math.abs(d)) : '') + '</em>' : '') + '</button>';
    };
    box.innerHTML = '<p class="og__h"><span>' + T(p.vTitle || (vs[0].group ? 'Warna & material' : 'Varian')) + '</span><b>' + esc(c.v ? lab(c.v) : '') + '</b></p>' +
      groups.map(function (gg) {
        var vis = !more || gg.i.some(function (i) { return order.indexOf(i) < 6; });
        return vis ? (groups.length > 1 && gg.g ? '<p class="og__g">' + esc(T(gg.g)) + ' <i>' + gg.i.length + '</i></p>' : '') + '<div class="og' + (anyD ? ' og--d' : '') + '">' + gg.i.map(btn).join('') + '</div>' : '';
      }).join('') +
      (order.length > 6 ? '<button type="button" class="vmore" data-vmore>' + (more ? T('More variants') + ' <i>+' + (order.length - 6) + '</i>' : T('Lebih sedikit')) + '<svg><use href="#i-arrow"/></svg></button>' : '');
    var subs = c.v && c.v.subs || [];
    sub.hidden = !subs.length;
    sub.innerHTML = subs.length ? '<p class="og__h"><span>' + T(p.sTitle || 'Ukuran & opsi') + '</span><b>' + esc(c.sub ? c.sub.label : '') + '</b></p><div class="og">' +
      subs.map(function (x, i) { return '<button type="button" class="cz-o' + (i === s.s ? ' is-on' : '') + '" data-s="' + i + '" title="' + esc(x.label) + '">' + (x.hex ? '<i class="cz-o__c" style="--c:' + x.hex + '"></i>' : '') + '<span>' + esc(x.label.length > 15 ? x.label.slice(0, 14) + '…' : x.label) + '</span></button>'; }).join('') + '</div>' : '';
  }
  /* ---------- informasi produk: Overview & Specification (seperti xionco.shop) ----------
     data/specs.json (tools/spec/fill.js + Developer Settings › Ukuran & material): baris ukuran per produk/varian,
     material, detail ukuran, overview (cerita produk), isi paket, perawatan. Dimuat saat halaman produk pertama dibuka. */
  var SPECS = null, specsP = null, pdTab = 'ov', pdMore = false;
  function loadSpecs() {
    if (specsP) return specsP;
    specsP = fetch('../data/specs.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { SPECS = j.items || {}; }, function () { SPECS = {}; })
      .then(function () { var p = kList[kI]; if (p && pd.classList.contains('is-on')) renderInfo(p, pcCur(p, cur(p)), false); });
    return specsP;
  }
  var MATL = [['frame', 'Rangka'], ['uph', 'Pelapis'], ['finish', 'Finishing'], ['legs', 'Kaki / base']];
  var dimTxt = function (r) { return [r.w, r.d, r.h].filter(function (x) { return x; }).map(function (x) { return String(x).replace('.', ','); }).join(' × ') + ' cm'; };
  function renderInfo(p, c, anim) {
    if (!SPECS) loadSpecs();
    var sp = SPECS && SPECS[p.id] || {}, rows = (sp.rows || []).filter(function (r) { return r.w || r.d || r.h; });
    var picked = [c.v && c.v.label, c.sub && c.sub.label].filter(Boolean);
    var main = rows.filter(function (r) { return picked.indexOf(r.k) >= 0; })[0] || rows.filter(function (r) { return r.k === 'Utama'; })[0] || rows[0];
    var base = (sp.rows || [])[0] || {};
    if (anim) { pdTab = 'ov'; pdMore = false; }
    // Overview: ringkas (dimensi · material · garansi · kirim) + cerita produk + isi paket
    var kv = [[T('Garansi'), T('3 tahun')], [T('Pengiriman'), T('1–3 hari kerja')]];
    if (c.v && c.v.fabric) kv.unshift([T('Material'), c.v.fabric]); else if (base.uph || base.frame) kv.unshift([T('Material'), String(base.uph || base.frame).split(' · ')[0]]);
    if (main) kv.unshift([T('Dimensi'), dimTxt(main)]); else if (p.dims) kv.unshift([T('Dimensi'), p.dims]);
    $('#pdSpec').innerHTML = kv.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') +
      (p.id === 'cubix' ? '<dt>Customize</dt><dd><a href="#/customize" data-go="customize">' + T('Rancang komposisi Anda →') + '</a></dd>' : '');
    var ov = sp.overview || p.desc || '', d = $('#pdDesc'), long = ov.length > 280 || ov.split('\n').length > 4;
    d.textContent = ov; d.classList.toggle('is-clamp', long && !pdMore);
    $('#pdMore').hidden = !long; $('#pdMore span').textContent = pdMore ? T('Lebih sedikit') : T('More details'); $('#pdMore').classList.toggle('is-open', pdMore);
    var bx = $('#pdBox'); bx.hidden = !(sp.box && sp.box.length);
    bx.innerHTML = sp.box && sp.box.length ? '<p class="og__h"><span>' + T('Isi paket') + '</span></p><ul>' + sp.box.map(function (l) { return '<li' + (/^termasuk/i.test(l) ? ' class="is-h"' : '') + '>' + esc(l) + '</li>'; }).join('') + '</ul>' : '';
    // Specification: Measurements · Materials · Manuals · Description (bagian kosong disembunyikan)
    var acc = function (id, title, body, open) { return body ? '<details class="acc" data-acc="' + id + '"' + (open ? ' open' : '') + '><summary>' + T(title) + '<svg><use href="#i-arrow"/></svg></summary><div class="acc__b">' + body + '</div></details>' : ''; };
    var extras = String(base.other || '').split(' · ').filter(function (x) { return x && !/^ukuran /i.test(x); });
    var meas = rows.length ? '<dl class="kv kv--dim">' + rows.map(function (r) { return '<dt' + (r === main ? ' class="is-on"' : '') + '>' + esc(r.k === 'Utama' ? (rows.length > 1 ? ((String(r.other || '').match(/ukuran ([^·]+)/) || [])[1] || T('Standar')).trim() : T('Ukuran keseluruhan')) : r.k) + '</dt><dd' + (r === main ? ' class="is-on"' : '') + '>' + esc(dimTxt(r)) + '</dd>'; }).join('') + '</dl>' +
      '<p class="acc__n">' + T('P × L × T (panjang × lebar/dalam × tinggi)') + '</p>' : (p.dims ? '<dl class="kv kv--dim"><dt>' + T('Ukuran keseluruhan') + '</dt><dd>' + esc(p.dims) + '</dd></dl>' : '');
    if (extras.length) meas += '<ul class="acc__l">' + extras.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    var mats = MATL.filter(function (m) { return base[m[0]]; }).map(function (m) { return '<dt>' + T(m[1]) + '</dt><dd>' + esc(base[m[0]]) + '</dd>'; }).join('');
    if (!mats && c.v && c.v.fabric) mats = '<dt>' + T('Pelapis') + '</dt><dd>' + esc(c.v.fabric) + '</dd>';
    var care = sp.care && sp.care.length ? '<ul class="acc__l">' + sp.care.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
    var desc = p.desc && sp.overview && sp.overview.indexOf(p.desc.slice(0, 40)) < 0 ? '<p class="txt">' + esc(p.desc) + '</p>' : '';
    var spHtml = acc('m', 'Measurements', meas, true) + acc('t', 'Materials', mats ? '<dl class="kv">' + mats + '</dl>' : '', true) + acc('c', 'Manuals', care, false) + acc('d', 'Description', desc, false);
    $('#pdSp').innerHTML = spHtml || '<p class="txt acc__n">' + T('Belum ada data.') + '</p>';
    setPdTab(pdTab);
  }
  function setPdTab(t) {
    pdTab = t;
    $$('#pdTabs [data-pt]').forEach(function (b) { var on = b.dataset.pt === t; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $$('#pdTabs [data-pp]').forEach(function (x) { x.hidden = x.dataset.pp !== t; });
  }
  $('#pdTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pt]'); if (b) { setPdTab(b.dataset.pt); return; }
    if (e.target.closest('#pdMore')) { pdMore = !pdMore; var p = kList[kI]; if (p) renderInfo(p, pcCur(p, cur(p)), false); }
  });
  // galeri foto seperti xionco.shop: gambar utama lalu foto lainnya (geser), titik penanda; varian dipilih → foto varian
  function renderPhoto(p, c) {
    var box = $('#pdPhoto'), list = [p.img].concat(p.images || [], (p.variants || []).map(function (v) { return v.img; })).filter(function (u, i, a) { return u && a.indexOf(u) === i; });
    box.hidden = !list.length;
    if (!list.length) { box.innerHTML = ''; box.dataset.pid = ''; return; }
    if (box.dataset.pid !== p.id) {
      box.dataset.pid = p.id;
      box.innerHTML = '<div class="gal__s">' + list.map(function (u, i) { return '<span class="gal__i" data-gi="' + i + '"><img src="' + esc(src(u, 768)) + '" alt="' + esc(p.name) + '"' + (i ? ' loading="lazy"' : '') + ' decoding="async"></span>'; }).join('') + '</div>' +
        (list.length > 1 ? '<div class="gal__d">' + list.map(function (u, i) { return '<i class="' + (i ? '' : 'is-on') + '"></i>'; }).join('') + '</div>' : '');
      box.dataset.list = JSON.stringify(list);
      var s = box.firstChild; s.addEventListener('scroll', function () { var k = Math.round(s.scrollLeft / Math.max(1, s.clientWidth)); $$('.gal__d i', box).forEach(function (d, j) { d.classList.toggle('is-on', j === k); }); }, { passive: true });
    }
    var want = c && c.v && !(c.v.nophoto && !(c.sub && c.sub.img)) && selOf(p).touched ? c.img : null, k = want ? JSON.parse(box.dataset.list).indexOf(want) : -1;
    if (k >= 0) box.firstChild.scrollTo({ left: k * box.firstChild.clientWidth, behavior: 'smooth' });
  }
  function setVariant(p, patch) {
    var s = selOf(p);
    if (patch.v != null && patch.v !== s.v) {   // ganti varian (mis. kayu) → pilihan kain yang sama dipertahankan bila ada
      var was = p.variants[s.v] && p.variants[s.v].subs && p.variants[s.v].subs[s.s], nv = p.variants[patch.v], same = was && nv.subs ? nv.subs.map(function (x) { return x.label; }).indexOf(was.label) : -1;
      s.v = patch.v; s.s = same >= 0 ? same : subDef(nv);
    }
    if (patch.s != null) s.s = patch.s;
    s.touched = true;
    fillPd(p, false);
    productDetail(p);
    if (!XW.ok || !(furniture.kind === 'product' && furniture.p === p)) return;
    var c = cur(p, s);
    if (p.vparts && XW.setPart) { var pt = partOf(p, c); XW.setPart(pt ? src(pt) : null); if (p.model) XW.setTint(c.hex); }   // bagian varian: hanya bagian itu yang muncul / hilang
    else if (p.vmodels && modelOf(p, c) !== (furniture.mdl || p.model)) { furniture.mdl = modelOf(p, c); stageShow(p); }
    else if (p.model) XW.setTint(c.hex);
    else XW.showProduct(p, src(c.img, 1024), src(p.img, 1024));
  }
  $('#pdVar').addEventListener('click', function (e) {
    var p = kList[kI]; if (!p) return;
    if (e.target.closest('[data-vmore]')) { vMore[p.id] = !vMore[p.id]; renderVariants(p); return; }
    var b = e.target.closest('[data-v]'); if (b) setVariant(p, { v: +b.dataset.v });
  });
  $('#pdSub').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b && kList[kI]) setVariant(kList[kI], { s: +b.dataset.s }); });
  panel.addEventListener('scroll', function (e) { var t = e.target; if (t.classList && t.classList.contains('pane__scroll')) t.classList.toggle('is-sc', t.scrollTop > 6); }, { capture: true, passive: true });
  function closePd() { advOpen(false); pd.classList.remove('is-on'); pd.setAttribute('aria-hidden', 'true'); detailMode(); }
  $('#pdBack').addEventListener('click', closePd);
  $('#pdPrev').addEventListener('click', function () { pick(kI - 1); });
  $('#pdNext').addEventListener('click', function () { pick(kI + 1); });
  $('#pdMinus').addEventListener('click', function () { kQty = Math.max(1, kQty - 1); $('#pdQty').textContent = kQty; });
  $('#pdPlus').addEventListener('click', function () { kQty = Math.min(20, kQty + 1); $('#pdQty').textContent = kQty; });
  $('#pdAdd').addEventListener('click', function () { addToBag(kList[kI], kQty); });
  $('#pdNow').addEventListener('click', function () { buyNow(kList[kI], kQty); });
  /* Advance: Ke ruang & Tanya di kotak samping panel (menggantikan tautan xionco.shop) */
  var advBox = $('#pdAdvBox'), advBtn = $('#pdAdv');
  function advPlace() {
    if (!advBox.classList.contains('is-on')) return;
    var br = advBtn.getBoundingClientRect(), pr = panel.getBoundingClientRect(), h = advBox.offsetHeight, w = advBox.offsetWidth;
    if (isMobile()) { advBox.style.left = pr.left + 'px'; advBox.style.width = pr.width + 'px'; advBox.style.top = Math.max(70, br.top - h - 10) + 'px'; return; }
    advBox.style.width = '';
    advBox.style.top = clamp(br.top + br.height / 2 - h / 2, pr.top, innerHeight - h - 16) + 'px';
    advBox.style.left = (html.classList.contains('lay3') ? pr.right + 14 : pr.left - 14 - w) + 'px';
  }
  function advOpen(on) {
    advBox.classList.toggle('is-on', !!on); advBox.setAttribute('aria-hidden', on ? 'false' : 'true');
    advBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); advBtn.classList.toggle('is-on', !!on);
    advPlace();
  }
  advBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var on = !advBox.classList.contains('is-on');
    if (on && isMobile()) { advBtn.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(advPlace, 450); }   // ponsel: kotak muncul di atas tombol, tombol harus terlihat
    advOpen(on);
  });
  document.addEventListener('pointerdown', function (e) { if (advBox.classList.contains('is-on') && !advBox.contains(e.target) && !advBtn.contains(e.target)) advOpen(false); });
  pd.addEventListener('scroll', advPlace, { passive: true });
  addEventListener('resize', advPlace);
  $('#pdWa').addEventListener('click', function () { setTimeout(function () { advOpen(false); }, 0); });
  /* ---- Sesuaikan produk katalog (model 3D asli): ukuran & warna kaki/base ----
     Yang diubah adalah item itu sendiri (GLB), bukan rancangan Customize baru.
     Harga = harga varian × (lebar/lebar asli) × (dalam/dalam asli) × faktor finishing (aturan pemilik: dikali rasio tiap ukuran)
     (+ tambahan finishing) — finishing memakai tabel Material › besi di Developer Settings › Harga. */
  var pcz = null;   // { pid, w, d, w0, d0, metal, metal0, open }
  var pcFor = function (p) { return p && pcz && pcz.pid === p.id ? pcz : null; };
  var pcChanged = function (pc) { return !!pc && (pc.w !== pc.w0 || pc.d !== pc.d0 || pc.metal !== pc.metal0); };
  function pcPrice(base, pc) {
    if (!base || !pc) return base;
    var f = (pc.w / pc.w0) * (pc.d / pc.d0), add = 0;
    if (pc.metal !== pc.metal0 && window.XC && XC.matPrice) { var a = XC.matPrice('metal.' + pc.metal), b = XC.matPrice('metal.' + pc.metal0); f *= (a.f || 1) / (b.f || 1); add = (a.add || 0) - (b.add || 0); }
    return Math.round((base * f + add) / 100) * 100;
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
    if (e.type === 'quote') return { key: e.id, custom: true, quote: true, p: { id: e.code, name: e.title, type: e.sub }, c: { price: e.price, label: T('Penawaran') + ' ' + e.code + (e.sub ? ' · ' + e.sub : ''), img: e.img }, q: e.q, total: e.price * e.q, e: e };
    if (e.type === 'cubix') { var cp = cbxPrice(e.cfg); if (!cp.total) return null; return { key: e.id, custom: true, p: { id: e.id, name: e.title, type: e.sub }, c: { price: cp.total, label: e.sub, img: e.img }, q: e.q, total: cp.total * e.q, e: e }; }
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
        ? (l.e && l.e.type === 'custom' ? '<button class="rm" type="button" data-edit>' + T('Ubah rancangan') + '</button>' : '') + '<div class="stepper"><button type="button" data-d="-1" aria-label="' + T('Kurangi') + '"><svg><use href="#i-minus"/></svg></button><span>' + l.q + '</span><button type="button" data-d="1" aria-label="' + T('Tambah') + '"><svg><use href="#i-plus"/></svg></button></div><button class="rm" type="button" data-rm>' + T('Hapus') + '</button>'
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
    if (current === 'tas') detailMode();
  }
  $('#bagList').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var k = li.dataset.k, d = e.target.closest('[data-d]'), en = bag[k];
    if (!en) return;
    if (d) { en.q = clamp(en.q + (+d.dataset.d), 0, 99); if (!en.q) delete bag[k]; renderBag(); }
    else if (e.target.closest('[data-rm]')) { delete bag[k]; renderBag(); }
    else if (e.target.closest('[data-edit]')) { czEditKey = k; openDesign(en); notice(T('Ubah rancangan, lalu tekan Perbarui tas')); }
    else if (e.target.closest('.list__th, .list__n')) { if (en.type === 'cubix') cbxOpen(en.cfg); else if (en.type === 'custom') openDesign(en); else openProduct(byId[en.id]); }
  });
  function entryOf(p, q) { var s = selOf(p), pc = pcFor(p), e = { id: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, q: q || 1 }; if (pcChanged(pc)) e.pc = { w: pc.w, d: pc.d, w0: pc.w0, d0: pc.d0, metal: pc.metal, metal0: pc.metal0 }; return e; }
  function bump() { var b = $('#bagBtn'); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
  function addToBag(p, q) {
    if (!p) return;
    var e = entryOf(p, q), l = line(e);
    if (!l) return;
    if (bag[l.key]) bag[l.key].q = clamp(bag[l.key].q + e.q, 1, 99); else bag[l.key] = e;
    renderBag(); bump();
    notice(T('{name} × {q} ditambahkan ke tas', { name: p.name, q: e.q }), { t: T('Lihat tas'), fn: function () { go('tas'); } });
  }
  function addEntry(e) { bag[e.id] = e; renderBag(); bump(); notice(T('{name} × {q} ditambahkan ke tas', { name: e.title, q: e.q }), { t: T('Lihat tas'), fn: function () { go('tas'); } }); }
  function buyNow(p, q) { if (!p) return; var e = entryOf(p, q); if (line(e)) openPay([e], 'produk'); }
  /* ======================================================================
     RUANG — beberapa furnitur tampil bersama di panggung (tersimpan di perangkat)
     Tambah dari Customize (rancangan) atau halaman produk; geser di panggung untuk menata.
     ====================================================================== */
  var roomList = function () { return store.get('xv5_room', []); };
  /* riwayat Ruang (Ctrl+Z / Ctrl+Shift+Z): keadaan sebelum tiap simpan dicatat; satu geser / putar / preset = satu langkah */
  var roomHist = { u: [], r: [], quiet: false };
  var shell = store.get('xv5_shell', null);   // ruangan (null = tanpa ruangan)
  var roomSnap = function (l, s) { return JSON.stringify({ l: l, s: s === undefined ? shell : s }); };
  function histPush(next) { if (roomHist.quiet) return; var prev = roomSnap(roomList()); if (prev !== next) { roomHist.u.push(prev); if (roomHist.u.length > 60) roomHist.u.shift(); roomHist.r = []; } }
  function roomSave(l) { histPush(roomSnap(l)); store.set('xv5_room', l); roomBadge(); }
  function shellSave(s) { var ty = shell && shell.type; histPush(roomSnap(roomList(), s)); shell = s; store.set('xv5_shell', s); if (XW.roomShell) XW.roomShell(shell); renderShell(); if ((s && s.type) !== ty && $('#roomPre')) renderRoomPre(); }
  function roomStep(back) {
    var from = back ? roomHist.u : roomHist.r, to = back ? roomHist.r : roomHist.u;
    if (!from.length) return false;
    var before = roomList(), snap = JSON.parse(from.pop()), next = snap.l, shellChanged = JSON.stringify(snap.s) !== JSON.stringify(shell);
    to.push(roomSnap(before));
    roomHist.quiet = true; roomSave(next); if (shellChanged) shellSave(snap.s); roomHist.quiet = false;
    renderRoom(); if (shellChanged) shellEdRender();
    // isi sama (hanya posisi / putaran berubah) → geser di panggung tanpa memuat ulang
    var ids = function (l) { return l.map(function (e) { return e.rid; }).sort().join(); };
    if (current === 'ruang' && XW.roomSet && ids(before) === ids(next)) next.forEach(function (e) { XW.roomSet(e.rid, { x: e.x || 0, z: e.z || 0, ry: e.ry || 0 }); });
    else if (current === 'ruang') roomStage();
    return true;
  }
  function roomBump() { var b = $('#railMore'); if (b) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); } }   // Ruang di rail › More
  function roomBadge() { var n = roomList().length, b = $('#roomCount'); if (b) { b.textContent = n || ''; b.dataset.n = n; } }
  // perkiraan lebar (m) untuk penempatan awal berjajar
  function roomWidth(e) {
    if (e.kind === 'acc') return .4;
    if (e.kind === 'custom') return (+e.cfg.w || (e.cfg.dia ? +e.cfg.dia : 0) || (e.cfg.mattress ? +e.cfg.mattress + 10 : 100)) / 100;
    var p = byId[e.pid]; return p ? ((p.cat === 'seats' ? 2 : p.cat === 'tables' ? 1.3 : p.cat === 'bedframe' ? 1.8 : 1)) : 1.2;
  }
  function roomAdd(e) {
    var l = roomList(), right = l.reduce(function (m, x) { return Math.max(m, (x.x || 0) + roomWidth(x) / 2); }, -1e9);
    e.rid = 'R' + Date.now().toString(36); e.ry = 0; e.z = 0;
    e.x = l.length ? +(right + .35 + roomWidth(e) / 2).toFixed(2) : 0;
    l.push(e); roomSave(l);
    if (current === 'ruang') {
      renderRoom(); roomDetail();
      var en = roomEntry(e), ap = en && XW.roomAppend ? XW.roomAppend(en, true) : Promise.resolve(false);
      ap.then(function (ok) { if (!ok) roomStage(); });
      notice(T('{name} ditambahkan ke ruang', { name: e.title }));
      return;
    }
    notice(T('{name} ditambahkan ke ruang', { name: e.title }) + ' · ' + T('Lihat ruang'));
    roomBump();
  }
  var ROOM_MODEL = { 'scandus-dining-table': 'assets/items/scandus-dining-table/model-ai.glb' };   // dipakai di Ruang saja
  function roomEntries() { return roomList().map(roomEntry).filter(Boolean); }
  function roomEntry(e) {
    {
      if (e.kind === 'acc') return ACC_BY[e.k] ? { rid: e.rid, kind: 'acc', k: e.k, x: e.x, z: e.z, y: e.y, ry: e.ry, on: e.on } : null;
      if (e.kind === 'custom') return { rid: e.rid, kind: 'custom', cfg: XC.normalize(JSON.parse(JSON.stringify(e.cfg))), x: e.x, z: e.z, ry: e.ry };
      var p = byId[e.pid]; if (!p) return null;
      var c = cur(p, { v: e.v, s: e.s });
      var mdl = modelOf(p, c) || ROOM_MODEL[p.id];
      return mdl ? { rid: e.rid, kind: 'model', url: src(mdl), p: p, x: e.x, z: e.z, ry: e.ry, flip: e.flip, hex: c.hex, ai: !modelOf(p, c) } : { rid: e.rid, kind: 'photo', url: src(c.img || p.img, 1024), p: p, x: e.x, z: e.z, ry: e.ry };
    }
  }
  function roomPrice(e) { if (e.kind === 'acc') return 0; if (e.kind === 'custom') return customUnit(e.cfg, e.price); var p = byId[e.pid]; return p ? cur(p, { v: e.v, s: e.s }).price || 0 : 0; }
  function renderRoom() {
    var l = roomList(), box = $('#roomList'); if (!box) return;
    $('#roomEmpty').classList.toggle('is-on', !l.length);
    $('#roomFoot').hidden = !l.length;
    box.innerHTML = l.map(function (e) {
      var acc = e.kind === 'acc';
      return '<li data-rid="' + e.rid + '"' + (acc ? ' class="is-acc"' : '') + '><div class="list__th">' + (acc ? accIcon(e.k) : e.img ? '<img class="is-snap" src="' + e.img + '" alt="">' : '<svg><use href="#i-ruler"/></svg>') + '</div>' +
        '<div><p class="list__n"><span>' + esc(acc ? T(ACC_BY[e.k] ? ACC_BY[e.k][1] : e.title) : e.title) + '</span>' + (e.kind === 'custom' ? '<span class="tag tag--gold">Custom</span>' : '') + '</p><p class="list__v">' + esc(acc ? T('Aksesoris · styling') : e.sub || '') + '</p>' + (acc ? '' : '<p class="list__p">' + rupiah(roomPrice(e)) + '</p>') +
        '<div class="list__acts"><button class="mini" type="button" data-rot="-45">↺ 45°</button><button class="mini" type="button" data-rot="45">↻ 45°</button>' + (acc ? '' : '<button class="mini mini--gold" type="button" data-room-bag>' + T('Ke tas') + '</button>') + '</div></div>' +
        '<div class="list__r"><button class="rm" type="button" data-room-rm>' + T('Hapus') + '</button></div></li>';
    }).join('');
    $('#roomTotal').textContent = rupiah(l.reduce(function (n, e) { return n + roomPrice(e); }, 0));
  }
  function roomDetail() {
    var l = roomList();
    setDetail({ name: T('Ruang Anda'), sub: T('{n} furnitur · geser untuk menata', { n: l.length }), cols: [], priceK: T('Total ruang'), price: rupiah(l.reduce(function (n, e) { return n + roomPrice(e); }, 0)) });
  }
  function roomStage() {
    stageKind = 'room'; roomDetail();
    return XW.ok && XW.showRoom ? XW.showRoom(roomEntries()) : Promise.resolve();
  }
  // quiet: penempatan otomatis barang baru — satu langkah urungkan dengan penambahannya
  XW.onRoomMove = function (rid, x, z, quiet, ry, y) { var l = roomList(); l.forEach(function (e) { if (e.rid === rid) { e.x = x; e.z = z; if (ry != null) e.ry = ((ry % 360) + 360) % 360; if (y != null) e.y = y; } }); if (quiet) { var q = roomHist.quiet; roomHist.quiet = true; roomSave(l); roomHist.quiet = q; } else roomSave(l); };
  // satu geser = satu langkah urungkan (furnitur + aksesoris yang ikut terbawa di atasnya)
  XW.onRoomMoves = function (mv, quiet) { var l = roomList(); mv.forEach(function (m) { l.forEach(function (e) { if (e.rid === m.rid) { e.x = m.x; e.z = m.z; if (m.y != null) e.y = m.y; } }); }); var q = roomHist.quiet; if (quiet) roomHist.quiet = true; roomSave(l); roomHist.quiet = q; };
  $('#roomList') && $('#roomList').addEventListener('click', function (e) {
    var li = e.target.closest('[data-rid]'); if (!li) return;
    var l = roomList(), it = l.filter(function (x) { return x.rid === li.dataset.rid; })[0]; if (!it) return;
    var b;
    if ((b = e.target.closest('[data-rot]'))) { it.ry = ((it.ry || 0) + +b.dataset.rot + 360) % 360; roomSave(l); if (XW.roomSet) XW.roomSet(it.rid, { ry: it.ry }); return; }
    if (e.target.closest('[data-room-rm]')) { roomSave(l.filter(function (x) { return x !== it; })); renderRoom(); if (XW.roomRemove && XW.roomRemove(it.rid)) roomDetail(); else roomStage(); return; }
    if (e.target.closest('[data-room-bag]')) {
      if (it.kind === 'custom') addEntry({ id: 'cz-' + Date.now().toString(36), type: 'custom', title: it.title, sub: it.sub, mat: it.mat, cfg: it.cfg, price: roomPrice(it), img: it.img, q: 1 });
      else { var p = byId[it.pid]; if (p) { var en = { id: p.id, v: it.v, s: it.s, q: 1 }; if (it.pc) en.pc = it.pc; var ln = line(en); if (ln) { if (bag[ln.key]) bag[ln.key].q++; else bag[ln.key] = en; renderBag(); bump(); notice(T('{name} × {q} ditambahkan ke tas', { name: p.name, q: 1 })); } } }
    }
  });
  $('#roomClear') && $('#roomClear').addEventListener('click', function () { roomSave([]); renderRoom(); roomStage(); });

  /* PRESET RUANG per jenis ruangan (koordinat untuk ukuran bawaan jenis itu; x, z meter, ry derajat, depan = +z).
     m: furnitur [id, x, z, ry] · a: aksesoris [kunci, indeks furnitur tempatnya | null, x?, z?] — tanpa x/z dicarikan
     permukaan otomatis (TV → kabinet, lampu → meja samping, bantal → sofa / ranjang). sh: ubah ruangan (mis. naikkan lukisan). */
  var ROOM_PRE = {
    tamu: [
      { l: 'Lounge', m: [['canis', -.1, -1.62, 0], ['rouled', -.1, -.15, 0], ['guise-1-seater', -.85, 1.05, 155], ['guise-1-seater', .65, 1.05, -155], ['hexter', -1.95, -.9, 0]],
        a: [['rug', null, -.1, -.1], ['tray', 1], ['vase', 1], ['books', 1], ['cushion', 0], ['throw', 0], ['lamp', 4]] },
      { l: 'Keluarga + TV', m: [['gliza-tv-cabinet-stand', -.3, -2.15, 0], ['kyrios', -.3, .95, 180], ['recta', -.3, -.05, 0], ['astral-1-seater', -2.05, -.4, 90], ['hexter', 1.25, .95, 0]],
        a: [['rug', null, -.3, .25], ['tv', 0], ['candles', 0], ['books', 0], ['tray', 2], ['lamp', 4], ['cushion', 1], ['plant', null]],
        sh: function (s) { s.objs.forEach(function (o) { if (o.part === 'B' && (o.k === 'art' || o.k === 'frame')) o.v = Math.min(s.h - .9, 2.3); }); return s; } },
      { l: 'Percakapan', m: [['capra-signature-3s', -.2, -1.9, 0], ['pluq', -.2, -.75, 0], ['kyrios-1-seater', -1.75, -.75, 90], ['kyrios-1-seater', 1.35, -.75, -90], ['rhombio-puff-ottoman', -.2, .55, 0], ['aether-standing-side-floor-lamp', -1.55, -2.05, 0]],
        a: [['rugr', null, -.2, -.6], ['tray', 1], ['vase', 1], ['cushion', 0], ['cushion', 0], ['throw', 4]] },
      { l: 'Modern', m: [['astral-3-seater', -.2, -1.93, 0], ['hout', -.2, -.85, 0], ['guise-2-seater', 1.35, -.75, -90], ['hexter', -1.65, -.9, 0], ['aether-standing-side-floor-lamp', 1.2, -2.1, 0]],
        a: [['rug', null, -.1, -.85], ['bowl', 1], ['books', 1], ['lamp', 3], ['cushion', 0], ['cushion', 2], ['sculpture', 3]] }
    ],
    tidur: [
      { l: 'Master', m: [['somno', 0, -1.51, 0], ['hexter', -1.1, -2.07, 0], ['hexter', 1.1, -2.07, 0], ['rhombio-puff-ottoman', 0, .05, 0], ['kyrios-1-seater', 1.75, .9, -135], ['aether-standing-side-floor-lamp', 2.2, .3, 0]],
        a: [['rug', null, 0, -.55], ['lamp', 1], ['lamp', 2], ['cushion', 0], ['throw', 0], ['books', 3], ['plant', null]] },
      { l: 'Divan', m: [['poel', 0, -1.5, 0], ['hexter', -1.1, -2.07, 0], ['lucid', 1.9, -2.17, 0], ['astral-2-seater', 1.85, .5, -90], ['tesse-kursi-puff-ottoman', -.6, .35, 0]],
        a: [['rug', null, 0, -.5], ['lamp', 1], ['cushion', 0], ['throw', 0], ['cushion', 3], ['vase', 1], ['plant', null]] },
      { l: 'Suite + kerja', m: [['somno', -.6, -1.51, 0], ['hexter', .5, -2.07, 0], ['verk', 1.75, -2.07, 0], ['nora', 1.75, -1.4, 180], ['rhombio-puff-ottoman', -.6, .1, 0]],
        a: [['rug', null, -.6, -.55], ['lamp', 1], ['cushion', 0], ['throw', 0], ['clock', 1], ['books', 2]] }
    ],
    makan: [
      { l: 'Makan 8', m: [['scandus-dining-table', 0, -.1, 0], ['nora', -.7, -.85, 0], ['nora', 0, -.85, 0], ['nora', .7, -.85, 0], ['nora', -.7, .65, 180], ['nora', 0, .65, 180], ['nora', .7, .65, 180], ['nora', -1.45, -.1, 90], ['nora', 1.45, -.1, -90], ['gliza-tv-cabinet-stand', -.2, -2.15, 0]],
        a: [['candles', 0], ['vase', 0], ['bowl', 0], ['books', 9], ['sculpture', 9], ['lamp', 9]] },
      { l: 'Makan 6', m: [['scandus-dining-table', .2, 0, 0], ['nora', -.2, -.75, 0], ['nora', .6, -.75, 0], ['nora', -.2, .75, 180], ['nora', .6, .75, 180], ['nora', -1.25, 0, 90], ['nora', 1.65, 0, -90], ['gliza-tv-cabinet-stand', -.6, -2.15, 0], ['lucid', 2.45, -.9, -90]],
        a: [['tray', 0], ['vase', 0], ['candles', 7], ['books', 7], ['plant', null]] }
    ],
    kerja: [
      { l: 'Studio', m: [['trapezo', -.9, -1.9, 0], ['nora', -.9, -1.25, 180], ['kyrios-1-seater', 1.25, .55, -145], ['hexter', 1.95, .6, 0], ['lucid', 2.25, -.4, -90], ['aether-standing-side-floor-lamp', .6, .25, 0]],
        a: [['rugr', null, 1.3, .5], ['lamp', 0], ['books', 0], ['clock', 0], ['vase', 3], ['cushion', 2], ['plant', null]] },
      { l: 'Executive', m: [['trapezo', 0, -.3, 0], ['nora', 0, -.95, 0], ['nora', -.4, .45, 180], ['nora', .4, .45, 180], ['lucid', .22, -1.97, 0], ['guise-2-seater', 1.7, 1.1, -90]],
        a: [['rug', null, 0, -.15], ['lamp', 0], ['books', 0], ['clock', 0], ['cushion', 5], ['plant', null]] }
    ]
  };
  // tanpa ruangan: satu preset per jenis
  function roomPreList() {
    if (shell && ROOM_PRE[shell.type]) return ROOM_PRE[shell.type].map(function (p, i) { return { key: shell.type + ':' + i, l: p.l }; });
    return Object.keys(ROOM_PRE).map(function (k) { return { key: k + ':0', l: SHELLS[k].l }; });
  }
  function roomPreset(key) {
    var kk = key.split(':'), type = kk[0], P = ROOM_PRE[type] && ROOM_PRE[type][+kk[1]]; if (!P) return;
    var T0 = SHELLS[type], t = Date.now().toString(36);
    // ukuran ruangan berbeda: x mengikuti lebar, z dihitung dari tembok belakang
    var fx = function (x, z) { if (!shell) return [x, z]; return [+clamp(x * shell.w / T0.w, -shell.w / 2 + .3, shell.w / 2 - .3).toFixed(2), +clamp(-shell.d / 2 + (z + T0.d / 2), -shell.d / 2 + .3, shell.d / 2 - .3).toFixed(2)]; };
    var l = P.m.map(function (a, i) {
      var p = byId[a[0]]; if (!p) return null;
      var s = selOf(p), c = cur(p, s), xz = fx(a[1], a[2]);
      return { kind: 'product', pid: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, title: p.name, sub: c.label || p.type, img: src(c.img || p.img, 400), rid: 'R' + t + i, x: xz[0], z: xz[1], ry: a[3] };
    });
    var acc = (P.a || []).filter(function (a) { return ACC_BY[a[0]]; }).map(function (a, j) {
      var e = { kind: 'acc', k: a[0], title: ACC_BY[a[0]][1], sub: 'Aksesoris', rid: 'R' + t + 'a' + j, x: 0, z: 0, ry: 0 };
      if (a[1] != null) { if (!l[a[1]]) return null; e.on = l[a[1]].rid; }
      if (a[2] != null) { var xz = fx(a[2], a[3]); e.x = xz[0]; e.z = xz[1]; e.fixed = 1; }
      return e;
    }).filter(Boolean);
    l = l.filter(Boolean);
    roomSave(l);   // satu langkah urungkan: furnitur + aksesoris + perubahan ruangan
    var q = roomHist.quiet; roomHist.quiet = true;
    if (P.sh && shell && shell.type === type) shellSave(P.sh(JSON.parse(JSON.stringify(shell))));
    roomHist.quiet = q;
    renderRoom();
    var my = roomPreset.run = (roomPreset.run || 0) + 1;
    roomStage().then(function () {
      if (my !== roomPreset.run || current !== 'ruang') return;
      if (XW.roomTidy) XW.roomTidy();
      // aksesoris satu per satu setelah furnitur tampil → dicarikan permukaan yang tepat
      return acc.reduce(function (pr, e) {
        return pr.then(function () {
          if (my !== roomPreset.run || current !== 'ruang') return;
          var cl = roomList(), q2 = roomHist.quiet; cl.push(e); roomHist.quiet = true; roomSave(cl); roomHist.quiet = q2;
          return XW.roomAppend ? XW.roomAppend(roomEntry(e), !e.fixed) : null;
        });
      }, Promise.resolve()).then(function () { if (my === roomPreset.run) { renderRoom(); roomDetail(); } });
    });
  }
  /* ---------- RUANGAN: pilihan ruangan, ukuran, editor tembok / lantai / plafon / objek (ketuk di panggung) */
  /* gaya mewah (referensi: Minotti Home Stories 2025, Vincent Van Duysen, Joseph Dirand / Haussmann, lounge hotel) —
     menentukan lantai, feature wall, batu perapian, logam, tirai, karpet & cahaya cove */
  var STYLES = {
    minotti: { l: 'Italian', floor: 'oakwide', wall: { fin: 'walnut', col: '#cfc0aa' }, wallL: { fin: 'limewash', col: '#cfc0aa' }, ceil: { fin: 'paint', col: '#efe8dd' }, rug: { col: '#d9cfc0' }, cove: '#ffd6a0',
      sty: { id: 'minotti', stone: 'travertine', metal: '#8a6a45', curtain: '#e6dccb', frame: '#3a2c20' } },
    quiet: { l: 'Quiet luxury', floor: 'greyoak', wall: { fin: 'travertine', col: '#e2d9cb' }, wallL: { fin: 'limewash', col: '#e2d9cb' }, ceil: { fin: 'paint', col: '#ece6dc' }, rug: { col: '#d9cfbf' }, cove: '#ffe2bd',
      sty: { id: 'quiet', stone: 'travertine', metal: '#b08d57', curtain: '#f1ece3', frame: '#cbbca3' } },
    paris: { l: 'Parisian', floor: 'parquet', wall: { fin: 'boiserie', col: '#e8e0d3' }, wallL: { fin: 'limewash', col: '#e8e0d3' }, ceil: { fin: 'paint', col: '#efe9df' }, rug: { col: '#cbbfae' }, cove: '#ffe8c8', coveK: .18,
      sty: { id: 'paris', stone: 'calacatta', metal: '#b8924f', curtain: '#ece4d6', frame: '#b8924f' } },
    dark: { l: 'Dark luxe', floor: 'walnutdark', wall: { fin: 'smoked', col: '#3d3832' }, wallL: { fin: 'limewash', col: '#3d3832' }, ceil: { fin: 'paint', col: '#2e2a26' }, rug: { col: '#4a423b' }, cove: '#ffc27a', coveK: .45, coveL: .8, sun: .7,
      sty: { id: 'dark', stone: 'nero', metal: '#b08d57', curtain: '#6b5d50', frame: '#1c1712' } }
  };
  // jenis ruangan: ukuran, jendela lantai–plafon (tembok kiri, z), objek arsitektur & styling
  var SHELLS = {
    tamu: { l: 'Ruang tamu', w: 5.6, d: 4.8, h: 3.2, opens: [{ t: 'win', wall: 'L', u: -.85, w: 2.3, kind: 'full', cur: 1 }, { t: 'door', wall: 'B', u: 2.05, kind: 'panel', hinge: 'r', swing: 'in', open: 0 }], objs: function (s) { return [{ k: 'art', part: 'B', u: 0, v: 1.85 }, { k: 'fireplace', part: 'L', u: 1.45, v: 0 }, { k: s === 'paris' ? 'mirror' : 'frame', part: 'L', u: 1.45, v: s === 'paris' ? 2.05 : 1.85 }, { k: 'olive', part: 'F', u: -2.2, v: -1.85 }]; } },
    tidur: { l: 'Kamar tidur', w: 5.0, d: 4.8, h: 3.2, opens: [{ t: 'win', wall: 'L', u: -.4, w: 2.4, kind: 'full', cur: 1 }, { t: 'door', wall: 'L', u: 1.6, kind: 'panel', hinge: 'l', swing: 'in', open: 0 }], objs: function (s) { return [{ k: 'walllamp', part: 'B', u: -1.3, v: 1.2 }, { k: 'walllamp', part: 'B', u: 1.3, v: 1.2 }, { k: 'art', part: 'B', u: 0, v: 2.05 }, { k: 'olive', part: 'F', u: -1.95, v: -1.85 }].concat(s === 'paris' ? [{ k: 'chandelier', part: 'C', u: 0, v: -.6 }] : []); } },
    makan: { l: 'Ruang makan', w: 5.4, d: 4.8, h: 3.2, opens: [{ t: 'win', wall: 'L', u: -.7, w: 2.4, kind: 'full', cur: 1 }, { t: 'door', wall: 'L', u: 1.5, kind: 'double', hinge: 'l', swing: 'in', open: .35 }], objs: function (s) { return [{ k: s === 'paris' || s === 'dark' ? 'chandelier' : 'pendant', part: 'C', u: 0, v: 0 }, { k: s === 'paris' ? 'mirror' : 'art', part: 'B', u: 0, v: 1.75 }, { k: 'olive', part: 'F', u: -2.1, v: -1.85 }, { k: 'shelf', part: 'B', u: 1.85, v: 1.35 }]; } },
    kerja: { l: 'Ruang kerja', w: 5.0, d: 4.4, h: 3.2, opens: [{ t: 'win', wall: 'L', u: -.4, w: 2.2, kind: 'full', cur: 1 }, { t: 'door', wall: 'L', u: 1.35, kind: 'glass', hinge: 'l', swing: 'in', open: 0 }], objs: function () { return [{ k: 'shelf', part: 'B', u: 1.2, v: 1.25 }, { k: 'shelf', part: 'B', u: 1.2, v: 1.8 }, { k: 'art', part: 'B', u: -.9, v: 1.65 }, { k: 'olive', part: 'F', u: -1.95, v: -1.65 }]; } }
  };
  var oidOf = function () { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  function shellFrom(k, style, keepSize) {
    style = STYLES[style] ? style : (shell && shell.style) || 'minotti';
    var T0 = SHELLS[k], S0 = JSON.parse(JSON.stringify(STYLES[style]));
    var s = { type: k, style: style, w: T0.w, d: T0.d, h: T0.h, opens: T0.opens.map(function (o) { return Object.assign({ id: opId() }, o); }), floor: S0.floor, wall: S0.wall, wallL: S0.wallL, ceil: S0.ceil, rug: S0.rug, cove: S0.cove, coveK: S0.coveK, coveL: S0.coveL, sun: S0.sun, sty: S0.sty };
    s.objs = T0.objs(style).map(function (o) { o.oid = oidOf(); if (o.k === 'art' || o.k === 'frame') o.art = Math.floor(Math.random() * ((XV.MUSE || []).length || 1)); return o; });
    if (keepSize && shell) { s.w = shell.w; s.d = shell.d; s.h = shell.h || s.h; if (shell.opens) s.opens = JSON.parse(JSON.stringify(shell.opens)); }   // ganti gaya: ukuran & bukaan tetap
    return s;
  }
  var opId = function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  if (shell && !shell.sty) shell = SHELLS[shell.type] ? shellFrom(shell.type, 'minotti') : null;   // ruangan versi lama → gaya mewah
  if (shell && !shell.opens) { var w0 = shell.win || { z0: -shell.d / 2 + .9, z1: -shell.d / 2 + 3.5 }; shell.opens = [{ id: 'w0', t: 'win', wall: 'L', u: (w0.z0 + w0.z1) / 2, w: w0.z1 - w0.z0, kind: 'full', cur: 1 }]; delete shell.win; }   // jendela lama → bukaan
  var WALL_FIN = [['limewash', 'Limewash'], ['walnut', 'Panel walnut'], ['smoked', 'Walnut smoked'], ['travertine', 'Travertine'], ['calacatta', 'Calacatta'], ['nero', 'Nero marquina'], ['boiserie', 'Boiserie'], ['paint', 'Cat'], ['wallpaper', 'Wallpaper'], ['brick', 'Bata putih']];
  /* tekstur yang di-Acc: tembok → tembok; lantai & batu → lantai (nilai 'x:<set>', warna asli) */
  (window.XTEX_EXTRA || []).forEach(function (x) { if (x.g === 'tembok') WALL_FIN.push(['x:' + x.set, x.l]); });
  var WALLL_FIN = WALL_FIN;
  var texChip = function (v) { return String(v).indexOf('x:') === 0 && window.XTEX ? '<i class="cz-o__c is-tex" style="background-image:url(\'' + XTEX.thumb(String(v).slice(2)) + '\')"></i>' : ''; };
  var FLOOR_FIN = [['oakwide', 'Oak lebar'], ['greyoak', 'Grey oak'], ['oak', 'Oak'], ['walnutdark', 'Walnut'], ['parquet', 'Herringbone'], ['laminate', 'Laminate'], ['marble', 'Marmer'], ['terrazzo', 'Teraso'], ['tiles', 'Keramik'], ['carpet', 'Karpet']];
  (window.XTEX_EXTRA || []).forEach(function (x) { if (x.g === 'lantai' || x.g === 'batu') FLOOR_FIN.push(['x:' + x.set, x.l]); });
  var WALL_COL = ['#efe9df', '#e9e2d6', '#d8cbb8', '#c9b9a2', '#b8ab95', '#8e8578', '#5c544c', '#3d3832'];
  var RUG_COL = ['#e4dccd', '#d9cfc0', '#cbbfae', '#a99a86', '#6b6158', '#4a423b'];
  var OBJ_WALL = [['art', 'Karya seni'], ['frame', 'Lukisan kecil'], ['mirror', 'Cermin'], ['shelf', 'Rak + buku'], ['fireplace', 'Perapian'], ['walllamp', 'Lampu dinding'], ['tv', 'TV']];
  var OBJ_CEIL = [['pendant', 'Lampu gantung'], ['chandelier', 'Chandelier'], ['downlight', 'Downlight'], ['sky', 'Lampu AETHER']];
  var OBJ_FLOOR = [['olive', 'Pohon pot batu'], ['plant2', 'Tanaman kecil'], ['vase', 'Vas'], ['books', 'Buku'], ['floorlamp', 'Lampu lantai']];
  var OBJ_DEF_V = { art: 1.75, frame: 1.65, mirror: 1.6, shelf: 1.4, tv: 1.25, fireplace: 0, walllamp: 1.25 };
  var shEd = { at: null };   // { part, u, v } atau { oid } atau { open }
  // warna bebas: kotak pemilih warna di akhir baris swatch
  function colPick(attr, on, list) { var free = on && list.indexOf(on) < 0; return '<label class="cz-o is-sw is-pick' + (free ? ' is-on' : '') + '" title="' + esc(T('Warna bebas')) + '"><input type="color" value="' + (on || '#e9e2d6') + '" ' + attr + '-pick><i class="cz-o__c" style="--c:' + (on || '#e9e2d6') + '"></i><span>' + (free ? on.slice(1).toUpperCase() : T('Bebas')) + '</span></label>'; }
  /* ---------- BUKAAN (jendela & pintu) — data: shell.opens [{ id, t, wall, u, w, kind, cur, hinge, swing, open }] */
  var WIN_KIND = [['full', 'Lantai–plafon'], ['std', 'Standar'], ['tall', 'Tinggi']];
  var DOOR_KIND = [['panel', 'Panel kayu'], ['flush', 'Polos'], ['glass', 'Kaca rangka'], ['double', 'Double'], ['pivot', 'Pivot'], ['slide', 'Geser']];
  var DOOR_W = { panel: .9, flush: .9, glass: .95, double: 1.5, pivot: 1.2, slide: 1.0 };
  var OBJ_W = { fireplace: 1.8, art: 1.6, frame: 1, mirror: 1.1, shelf: 1.3, tv: 1.7, slat: 1.3, walllamp: .3 };
  var opW = function (o) { return o.t === 'door' ? DOOR_W[o.kind] || .9 : o.w || 1.6; };
  var opLen = function (s, o) { return o.wall === 'L' ? s.d : s.w; };
  // posisi "dari kiri" dilihat dari dalam ruang: tembok belakang → dari sudut kiri; tembok kiri → dari ujung depan
  var opLeft = function (s, o) { return o.wall === 'L' ? s.d / 2 - o.u : o.u + s.w / 2; };
  var opSetLeft = function (s, o, v) { o.u = +(o.wall === 'L' ? s.d / 2 - v : v - s.w / 2).toFixed(2); };
  function opFree(s, wall, ww, skip) {   // tengah celah terlebar di tembok yang muat ww (u dunia) atau null
    var len = wall === 'L' ? s.d : s.w, iv = s.opens.filter(function (o) { return o.wall === wall && o !== skip; }).map(function (o) { var c = wall === 'B' ? o.u : -o.u, q = opW(o); return [c - q / 2 - .15, c + q / 2 + .15]; });
    (s.objs || []).forEach(function (o) { if (o.part === wall && OBJ_W[o.k]) { var c = wall === 'B' ? o.u : -o.u; iv.push([c - OBJ_W[o.k] / 2 - .1, c + OBJ_W[o.k] / 2 + .1]); } });   // perapian, lukisan, rak, TV di tembok
    iv.sort(function (a, b) { return a[0] - b[0]; });
    var best = null, x = -len / 2 + .12;
    iv.concat([[len / 2 - .12, len / 2]]).forEach(function (h) { var gap = h[0] - x; if (gap >= ww && (!best || gap > best.g)) best = { g: gap, c: (x + h[0]) / 2 }; x = Math.max(x, h[1]); });
    return best ? +(wall === 'B' ? best.c : -best.c).toFixed(2) : null;
  }
  function opCount(s, t, n) {
    var cur = s.opens.filter(function (o) { return o.t === t; });
    while (cur.length > n) { var last = cur.pop(); s.opens = s.opens.filter(function (o) { return o !== last; }); }
    while (cur.length < n) {
      var o = t === 'win' ? { id: opId(), t: 'win', kind: 'std', w: 1.4, cur: 1 } : { id: opId(), t: 'door', kind: 'panel', hinge: 'r', swing: 'in', open: 0 };
      ['L', 'B'].some(function (wl) { var c = opFree(s, wl, opW(o)); if (c == null) return false; o.wall = wl; o.u = c; return true; });
      if (!o.wall) { notice(T('Tembok sudah penuh — geser atau hapus objek tembok dulu')); break; }
      s.opens.push(o); cur.push(o);
    }
  }
  function opBlock(o, n) {
    var s = shell, b = function (fk, list, on) { return '<div class="og">' + list.map(function (x) { return '<button type="button" class="cz-o' + (String(x[0]) === String(on) ? ' is-on' : '') + '" data-op="' + o.id + '" data-op-f="' + fk + '" data-op-v="' + x[0] + '"><span>' + esc(T(x[1])) + '</span></button>'; }).join('') + '</div>'; };
    var sub = function (t) { return '<p class="og__h og__h--sub"><span>' + T(t) + '</span></p>'; };
    var len = opLen(s, o), ww = opW(o), lo = ww / 2 + .1, hi = Math.max(lo, len - ww / 2 - .1), v = clamp(opLeft(s, o), lo, hi);
    var rng = function (t, fk, mn, mx, val) { return '<label>' + T(t) + '<input class="rng" type="range" min="' + mn.toFixed(2) + '" max="' + mx.toFixed(2) + '" step=".05" value="' + val.toFixed(2) + '" data-op="' + o.id + '" data-op-f="' + fk + '"><b>' + val.toFixed(2) + ' m</b></label>'; };
    var h = '<div class="op-b"><p class="og__h"><span>' + T(o.t === 'win' ? 'Jendela' : 'Pintu') + (n ? ' ' + n : '') + '</span><button type="button" class="op-rm" data-op="' + o.id + '" data-op-f="rm">' + T('Hapus') + '</button></p>';
    h += sub('Tembok') + b('wall', [['L', 'Kiri'], ['B', 'Belakang']], o.wall);
    if (o.t === 'win') {
      h += sub('Jenis') + b('kind', WIN_KIND, o.kind) + sub('Tirai') + b('cur', [[1, 'Ada'], [0, 'Tanpa']], o.cur === 0 ? 0 : 1);
      h += '<div class="shell-dims">' + rng('Lebar', 'w', .6, Math.min(4, len - .3), o.w || 1.6) + rng('Posisi (dari kiri)', 'pos', lo, hi, v) + '</div>';
    } else {
      h += sub('Jenis') + b('kind', DOOR_KIND, o.kind || 'panel') + sub(o.kind === 'slide' ? 'Arah geser' : 'Engsel') + b('hinge', [['l', 'Kiri'], ['r', 'Kanan']], o.hinge || 'r');
      if (o.kind !== 'slide') h += sub('Arah buka') + b('swing', [['in', 'Ke dalam'], ['out', 'Ke luar']], o.swing || 'in');
      h += sub('Bukaan') + b('open', [[0, 'Tutup'], [.35, 'Sedikit'], [1, 'Terbuka']], o.open || 0);
      h += '<div class="shell-dims">' + rng('Posisi (dari kiri)', 'pos', lo, hi, v) + '</div>';
    }
    return h + '</div>';
  }
  function opEdit(id, fk, v) {
    var s = JSON.parse(JSON.stringify(shell)), o = s.opens.filter(function (x) { return x.id === id; })[0]; if (!o) return;
    if (fk === 'rm') { s.opens = s.opens.filter(function (x) { return x !== o; }); if (shEd.at && shEd.at.open === id) shEd.at = null; }
    else if (fk === 'wall') { if (o.wall === v) return; o.wall = v; var c = opFree(s, v, opW(o), o); o.u = c == null ? 0 : c; }
    else if (fk === 'kind') { o.kind = v; var lim = Math.max(0, opLen(s, o) / 2 - opW(o) / 2 - .1); o.u = +clamp(o.u, -lim, lim).toFixed(2); }   // pintu lebih lebar: digeser seperlunya ke dalam tembok
    else if (fk === 'cur' || fk === 'open') o[fk] = +v;
    else if (fk === 'hinge' || fk === 'swing') o[fk] = v;
    else if (fk === 'w') o.w = +(+v).toFixed(2);
    else if (fk === 'pos') opSetLeft(s, o, +v);
    else return;
    shellSave(s); if (shEd.at) shellEdRender(); else if ($('#shellEd').classList.contains('is-on')) shellEdOpen(null);
  }
  XW.onOpenMove = function (id, u) { var s = JSON.parse(JSON.stringify(shell)); s.opens.forEach(function (o) { if (o.id === id) o.u = u; }); shellSave(s); if (shEd.at) shellEdRender(); };
  /* panel Ruang: tab Tembok / Lantai / Jendela / Pintu */
  var shTab = 'tembok';
  function shellTabs() {
    var s = shell, sub = function (t, extra) { return '<p class="og__h og__h--sub"><span>' + T(t) + '</span>' + (extra ? '<b>' + extra + '</b>' : '') + '</p>'; };
    var chips = function (attr, list, on, k) { return '<div class="og">' + list.map(function (x) { return '<button type="button" class="cz-o' + (String(x[0]) === String(on) ? ' is-on' : '') + '" ' + attr + '="' + x[0] + '"' + (k ? ' data-pk="' + k + '"' : '') + ' title="' + esc(T(x[1])) + '">' + texChip(x[0]) + '<span>' + esc(T(x[1])) + '</span></button>'; }).join('') + '</div>'; };
    var sws = function (attr, list, on, k) { return '<div class="og">' + list.map(function (c) { return '<button type="button" class="cz-o is-sw' + (c === on ? ' is-on' : '') + '" ' + attr + '="' + c + '"' + (k ? ' data-pk="' + k + '"' : '') + '><i class="cz-o__c" style="--c:' + c + '"></i><span>' + c.slice(1).toUpperCase() + '</span></button>'; }).join('') + colPick(attr, on, list).replace(attr + '-pick', attr + '-pick' + (k ? ' data-pk="' + k + '"' : '')) + '</div>'; };
    var tint = function (fin) { return !STONE_FIN[fin] && String(fin).indexOf('x:') !== 0; };
    var h = '<div class="og sh-tabs" style="margin-top:16px">' + [['tembok', 'Tembok'], ['lantai', 'Lantai'], ['jendela', 'Jendela'], ['pintu', 'Pintu']].map(function (x) { return '<button type="button" class="cz-o' + (x[0] === shTab ? ' is-on' : '') + '" data-sh-tab="' + x[0] + '"><span>' + T(x[1]) + '</span></button>'; }).join('') + '</div><div class="sh-tab">';
    if (shTab === 'tembok') {
      [['wall', 'Tembok belakang'], ['wallL', 'Tembok kiri']].forEach(function (x) { var wd = s[x[0]] || s.wall; h += sub(x[1]) + chips('data-pw-fin', WALL_FIN, wd.fin, x[0]) + (tint(wd.fin) ? '<div style="height:8px"></div>' + sws('data-pw-col', WALL_COL, wd.col, x[0]) : ''); });
      h += sub('Plafon') + chips('data-pc', [['paint', 'Polos'], ['wood', 'Kayu']], s.ceil.fin) + sub('Lampu cove') + chips('data-pcove', [[1, 'Nyala'], [0, 'Mati']], s.cove ? 1 : 0);
    } else if (shTab === 'lantai') {
      h += sub('Lantai') + chips('data-pf', FLOOR_FIN, s.floor) + sub('Karpet') + '<div class="og"><button type="button" class="cz-o' + (!s.rug ? ' is-on' : '') + '" data-pr=""><span>' + T('Tanpa') + '</span></button>' + RUG_COL.map(function (c) { return '<button type="button" class="cz-o is-sw' + (s.rug && s.rug.col === c ? ' is-on' : '') + '" data-pr="' + c + '"><i class="cz-o__c" style="--c:' + c + '"></i><span>' + c.slice(1).toUpperCase() + '</span></button>'; }).join('') + '</div>';
    } else {
      var t = shTab === 'jendela' ? 'win' : 'door', mine = s.opens.filter(function (o) { return o.t === t; });
      h += sub('Jumlah') + chips('data-pn', (t === 'win' ? [0, 1, 2, 3] : [0, 1, 2]).map(function (n) { return [n, String(n)]; }), mine.length);
      h += mine.map(function (o, i) { return opBlock(o, i + 1); }).join('') + '<p class="note" style="margin-top:10px">' + T('Ketuk atau geser pintu / jendela di panggung untuk mengubahnya.') + '</p>';
    }
    return h + '</div>';
  }
  var STONE_FIN = { travertine: 1, calacatta: 1, nero: 1, brick: 1, marble: 1 };
  function renderShell() {
    var box = $('#roomShell'); if (!box) return;
    var k = shell ? shell.type : '';
    var sk = shell ? shell.style : '';
    box.innerHTML = '<p class="og__h"><span>' + T('Ruangan') + '</span><b>' + (shell ? T(SHELLS[k] ? SHELLS[k].l : '') : T('Tanpa')) + '</b></p><div class="og">' +
      [['', 'Tanpa']].concat(Object.keys(SHELLS).map(function (x) { return [x, SHELLS[x].l]; })).map(function (o) { return '<button type="button" class="cz-o' + (o[0] === k ? ' is-on' : '') + '" data-shell="' + o[0] + '"><span>' + esc(T(o[1])) + '</span></button>'; }).join('') + '</div>' +
      (shell ? '<p class="og__h" style="margin-top:16px"><span>' + T('Gaya') + '</span><b>' + esc(T(STYLES[sk] ? STYLES[sk].l : '')) + '</b></p><div class="og">' + Object.keys(STYLES).map(function (x) { return '<button type="button" class="cz-o' + (x === sk ? ' is-on' : '') + '" data-style="' + x + '"><span>' + esc(T(STYLES[x].l)) + '</span></button>'; }).join('') + '</div>' : '') +
      (shell ? '<div class="shell-dims"><label>' + T('Lebar ruang') + '<input class="rng" type="range" min="3" max="8" step=".1" value="' + shell.w + '" data-shell-dim="w"><b>' + shell.w.toFixed(1) + ' m</b></label><label>' + T('Dalam ruang') + '<input class="rng" type="range" min="3" max="7" step=".1" value="' + shell.d + '" data-shell-dim="d"><b>' + shell.d.toFixed(1) + ' m</b></label><label>' + T('Tinggi plafon') + '<input class="rng" type="range" min="2.6" max="4" step=".1" value="' + (shell.h || 3.2) + '" data-shell-dim="h"><b>' + (shell.h || 3.2).toFixed(1) + ' m</b></label></div>' + shellTabs() : '');
    $$('#roomShell .rng, #shellBody .rng').forEach(function (r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%'); });
  }
  // panel Ruang: tab arsitektur, finishing, bukaan
  function shellPanelClick(e) {
    var b = e.target.closest('button'); if (!b || !shell) return false;
    var d = b.dataset, s = JSON.parse(JSON.stringify(shell));
    if (d.shTab) { shTab = d.shTab; renderShell(); return true; }
    if (d.op) { opEdit(d.op, d.opF, d.opV); return true; }
    if (d.pwFin) s[d.pk] = Object.assign({}, s[d.pk] || s.wall, { fin: d.pwFin });
    else if (d.pwCol) s[d.pk] = Object.assign({}, s[d.pk] || s.wall, { col: d.pwCol });
    else if (d.pf) s.floor = d.pf;
    else if (d.pr != null) s.rug = d.pr ? { col: d.pr } : null;
    else if (d.pc) s.ceil = Object.assign({}, s.ceil, { fin: d.pc });
    else if (d.pcove != null) s.cove = +d.pcove ? (STYLES[s.style] || STYLES.minotti).cove : null;
    else if (d.pn != null) opCount(s, shTab === 'jendela' ? 'win' : 'door', +d.pn);
    else return false;
    shellSave(s); return true;
  }
  $('#roomShell') && $('#roomShell').addEventListener('click', function (e) {
    if (shellPanelClick(e)) return;
    var st = e.target.closest('[data-style]');
    if (st && shell) { shellSave(shellFrom(shell.type, st.dataset.style, true)); shellEdOpen(null); return; }
    var b = e.target.closest('[data-shell]'); if (!b) return;
    shellSave(b.dataset.shell ? shellFrom(b.dataset.shell, shell && shell.style, false) : null); shellEdOpen(null);
    if (current === 'ruang') roomStage();
  });
  // geser posisi / lebar bukaan: label ikut saat digeser, simpan saat dilepas
  function opRangeInput(e) { var r = e.target.closest('input[data-op]'); if (!r) return false; r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%'); r.parentNode.querySelector('b').textContent = (+r.value).toFixed(2) + ' m'; return true; }
  function opRangeChange(e) { var r = e.target.closest('input[data-op]'); if (!r) return false; opEdit(r.dataset.op, r.dataset.opF, r.value); return true; }
  // warna bebas (input warna): simpan saat dipilih
  function colPickChange(e) {
    var c = e.target; if (c.type !== 'color' || !shell) return false;
    var s = JSON.parse(JSON.stringify(shell)), v = c.value;
    if (c.hasAttribute('data-pw-col-pick')) s[c.dataset.pk] = Object.assign({}, s[c.dataset.pk] || s.wall, { col: v });
    else if (c.hasAttribute('data-sh-wcol-pick') && shEd.at) { var wk = shEd.at.part === 'L' ? 'wallL' : 'wall'; s[wk] = Object.assign({}, s[wk] || s.wall, { col: v }); }
    else if (c.hasAttribute('data-sh-curtain-pick') && shEd.at) s.objs.forEach(function (x) { if (x.oid === shEd.at.oid) x.col = v; });
    else return false;
    shellSave(s); if (shEd.at) shellEdRender(); return true;
  }
  $('#roomShell') && $('#roomShell').addEventListener('input', function (e) {
    if (opRangeInput(e)) return;
    var r = e.target.closest('[data-shell-dim]'); if (!r || !shell) return;
    r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%'); r.parentNode.querySelector('b').textContent = (+r.value).toFixed(1) + ' m';
  });
  $('#roomShell') && $('#roomShell').addEventListener('change', function (e) {
    if (opRangeChange(e) || colPickChange(e)) return;
    var r = e.target.closest('[data-shell-dim]'); if (!r || !shell) return;
    var s = JSON.parse(JSON.stringify(shell)); s[r.dataset.shellDim] = +r.value; shellSave(s);
  });
  function shellEdOpen(at) {
    shEd.at = at; var box = $('#shellEd'), on = !!at && !!shell;
    if (on && raBox && raBox.classList.contains('is-on')) { raBox.classList.remove('is-on'); raBox.setAttribute('aria-hidden', 'true'); $('#roomAddBtn').classList.remove('is-on'); }
    if (on) { html.classList.toggle('cz-box3', czLayout() === 'box3'); shellEdRender(); }
    box.classList.toggle('is-on', on); box.setAttribute('aria-hidden', on ? 'false' : 'true'); insets();
  }
  function shellEdRender() {
    if (!shEd.at || !shell) return;
    var at = shEd.at, h = '', o = at.oid && shell.objs.filter(function (x) { return x.oid === at.oid; })[0];
    var opts = function (attr, list, on) { return '<div class="og">' + list.map(function (x) { return '<button type="button" class="cz-o' + (x[0] === on ? ' is-on' : '') + '" ' + attr + '="' + x[0] + '" title="' + esc(T(x[1])) + '">' + texChip(x[0]) + '<span>' + esc(T(x[1])) + '</span></button>'; }).join('') + '</div>'; };
    var sw = function (attr, list, on) { return '<div class="og">' + list.map(function (c) { return '<button type="button" class="cz-o is-sw' + (c === on ? ' is-on' : '') + '" ' + attr + '="' + c + '" title="' + c + '"><i class="cz-o__c" style="--c:' + c + '"></i><span>' + c.slice(1).toUpperCase() + '</span></button>'; }).join('') + colPick(attr, on, list) + '</div>'; };
    var sec = function (t, body) { return '<div class="cbx-g"><p class="og__h"><span>' + T(t) + '</span></p>' + body + '</div>'; };
    var op = at.open && (shell.opens || []).filter(function (x) { return x.id === at.open; })[0];
    if (at.open && !op) { shEd.at = null; return shellEdOpen(null); }
    if (op) {
      $('#shellE').textContent = T('Ruangan'); $('#shellT').textContent = T(op.t === 'win' ? 'Jendela' : 'Pintu');
      $('#shellBody').innerHTML = opBlock(op, 0);
      $$('#shellBody .rng').forEach(function (r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%'); });
      return;
    }
    if (o) {
      var all = OBJ_WALL.concat(OBJ_CEIL, OBJ_FLOOR), nm = (all.filter(function (x) { return x[0] === o.k; })[0] || [0, 'Objek'])[1];
      $('#shellE').textContent = T('Objek'); $('#shellT').textContent = T(nm);
      if (o.k === 'frame') h += sec('Lukisan', '<div class="og"><button type="button" class="cz-o" data-sh-act="art"><span>' + T('Ganti lukisan') + '</span></button></div>');
      if (o.k === 'window') h += sec('Warna tirai', sw('data-sh-curtain', ['#d9cfbf', '#efe9e0', '#8e8578', '#5f5a55', '#a9b6c2', '#c9a99a'], o.col || '#d9cfbf'));
      h += '<div class="og"><button type="button" class="cz-o" data-sh-act="del"><span>' + T('Hapus') + '</span></button></div>';
    } else if (at.part === 'F') {
      $('#shellE').textContent = T('Ruangan'); $('#shellT').textContent = T('Lantai');
      h += sec('Finishing', opts('data-sh-floor', FLOOR_FIN, shell.floor));
      h += sec('Karpet', '<div class="og"><button type="button" class="cz-o' + (!shell.rug ? ' is-on' : '') + '" data-sh-rug=""><span>' + T('Tanpa') + '</span></button>' + RUG_COL.map(function (c) { return '<button type="button" class="cz-o is-sw' + (shell.rug && shell.rug.col === c ? ' is-on' : '') + '" data-sh-rug="' + c + '"><i class="cz-o__c" style="--c:' + c + '"></i><span>' + c.slice(1).toUpperCase() + '</span></button>'; }).join('') + '</div>');
      h += sec('Tambah di titik ini', opts('data-sh-add', OBJ_FLOOR, ''));
    } else {
      var wk = at.part === 'L' ? 'wallL' : 'wall', wd = shell[wk] || shell.wall;
      $('#shellE').textContent = T('Ruangan'); $('#shellT').textContent = T(at.part === 'C' ? 'Plafon' : at.part === 'L' ? 'Tembok kiri' : 'Tembok belakang');
      if (at.part !== 'C') {
        h += sec('Finishing', opts('data-sh-wall', at.part === 'L' ? WALLL_FIN : WALL_FIN, wd.fin));
        if (/^(paint|wallpaper|limewash|boiserie)$/.test(wd.fin)) h += sec('Warna', sw('data-sh-wcol', WALL_COL, wd.col));
        h += sec('Tambah di titik ini', opts('data-sh-add', OBJ_WALL, ''));
      }
      h += sec('Plafon', opts('data-sh-ceil', [['paint', 'Polos'], ['wood', 'Kayu']], shell.ceil.fin) + '<div style="height:8px"></div>' + opts('data-sh-addc', OBJ_CEIL, ''));
    }
    $('#shellBody').innerHTML = h;
  }
  $('#shellEd') && $('#shellEd').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !shell) return;
    if (b.closest('[data-shell-close]')) { shellEdOpen(null); return; }
    if (b.dataset.op) { opEdit(b.dataset.op, b.dataset.opF, b.dataset.opV); return; }
    var s = JSON.parse(JSON.stringify(shell)), at = shEd.at, d = b.dataset;
    if (d.shFloor) s.floor = d.shFloor;
    else if (d.shRug != null) s.rug = d.shRug ? { col: d.shRug } : null;
    else if (d.shWall) { var wk = at.part === 'L' ? 'wallL' : 'wall'; s[wk] = Object.assign({}, s[wk] || s.wall, { fin: d.shWall }); }
    else if (d.shWcol) { var wk2 = at.part === 'L' ? 'wallL' : 'wall'; s[wk2] = Object.assign({}, s[wk2] || s.wall, { col: d.shWcol }); }
    else if (d.shCeil) s.ceil = Object.assign({}, s.ceil, { fin: d.shCeil });
    else if (d.shAdd) { var n = { oid: oidOf(), k: d.shAdd, part: at.part, u: at.u || 0, v: at.part === 'F' ? at.v || 0 : (OBJ_DEF_V[d.shAdd] != null ? OBJ_DEF_V[d.shAdd] : Math.min(Math.max(at.v || 1.4, .4), s.h - .4)) }; if (d.shAdd === 'frame' || d.shAdd === 'art') n.art = Math.floor(Math.random() * ((XV.MUSE || []).length || 1)); s.objs.push(n); }
    else if (d.shAddc) { var cx = at.part === 'B' || at.part === 'C' ? at.u || 0 : 0, cz = at.part === 'C' ? at.v || 0 : at.part === 'L' ? at.u || 0 : 0; s.objs.push({ oid: oidOf(), k: d.shAddc, part: 'C', u: cx, v: cz }); }
    else if (d.shCurtain) s.objs.forEach(function (x) { if (x.oid === at.oid) x.col = d.shCurtain; });
    else if (d.shAct === 'art') s.objs.forEach(function (x) { if (x.oid === at.oid) x.art = ((x.art || 0) + 1) % Math.max(1, (XV.MUSE || []).length); });
    else if (d.shAct === 'del') { s.objs = s.objs.filter(function (x) { return x.oid !== at.oid; }); shEd.at = null; }
    else return;
    shellSave(s); if (shEd.at) shellEdRender(); else shellEdOpen(null);
  });
  $('#shellEd') && $('#shellEd').addEventListener('input', opRangeInput);
  $('#shellEd') && $('#shellEd').addEventListener('change', function (e) { if (!opRangeChange(e)) colPickChange(e); });
  XW._src = function (u) { return src(u); }; XW._imgUrl = function (u) { return src(u, 1024); };
  XW.onShellPick = function (at) { if (current !== 'ruang' || !shell) return; shellEdOpen(at); };
  XW.onShellMove = function (oid, u, v) { if (!shell) return; var s = JSON.parse(JSON.stringify(shell)); s.objs.forEach(function (x) { if (x.oid === oid) { x.u = u; x.v = v; } }); shellSave(s); };
  function renderRoomPre() {
    var box = $('#roomPre'); if (!box) return;
    box.innerHTML = '<p class="og__h"><span>' + T('Preset') + '</span>' + (shell ? '<b>' + esc(T(SHELLS[shell.type] ? SHELLS[shell.type].l : '')) + '</b>' : '') + '</p><div class="og">' + roomPreList().map(function (p) { return '<button type="button" class="cz-o" data-room-pre="' + p.key + '" data-l="' + esc(p.l) + '" title="' + esc(T(p.l)) + '"><span>' + esc(T(p.l)) + '</span></button>'; }).join('') + '</div>';
  }
  $('#roomPre') && $('#roomPre').addEventListener('click', function (e) {
    var b = e.target.closest('[data-room-pre]'); if (!b) return;
    if (roomList().length && !b.dataset.armed) {   // ruang sudah berisi → klik sekali lagi untuk mengganti
      $$('#roomPre [data-armed]').forEach(function (x) { delete x.dataset.armed; x.classList.remove('is-on'); x.firstChild.textContent = T(x.dataset.l); });
      b.dataset.armed = '1'; b.classList.add('is-on'); b.firstChild.textContent = T('Ganti isi ruang?'); return;
    }
    roomPreset(b.dataset.roomPre); renderRoomPre();
  });
  /* ---------- TAMBAH BARANG di halaman Ruang: katalog (cari + kategori) & rancangan Customize — tanpa pindah halaman.
     Klik kartu = barang masuk ruang di tempat kosong; kotak tetap terbuka untuk menambah lagi. */
  /* aksesoris (styling, tidak dijual): [kunci, label ≤ 15 huruf, ikon garis 48×48] */
  var ACC = [
    ['tv', 'TV 65"', '<rect x="6" y="10" width="36" height="21" rx="1"/><path d="M14 31v5M34 31v5"/>'],
    ['lamp', 'Lampu meja', '<path d="M17 10h14l4 11H13z"/><path d="M24 21v4"/><path d="M19 38c0-7 2-13 5-13s5 6 5 13z"/>'],
    ['vase', 'Vas keramik', '<path d="M20 8h8M21 8c0 5-6 8-6 18 0 7 4 12 9 12s9-5 9-12c0-10-6-13-6-18"/>'],
    ['plant', 'Tanaman kecil', '<path d="M16 30h16l-2 10H18z"/><path d="M24 30V16M24 23c-4-6-10-6-12-4 3 3 8 4 12 4zM24 19c3-6 9-7 12-5-3 3-8 5-12 5z"/>'],
    ['olive', 'Pohon pot', '<path d="M15 34h18l-2 8H17z"/><path d="M24 34V19"/><circle cx="24" cy="13" r="7"/><circle cx="17" cy="19" r="5"/><circle cx="31" cy="19" r="5"/>'],
    ['books', 'Buku', '<path d="M10 34h26v5H10zM12 29h24v5H12zM9 24h25v5H9z"/><circle cx="22" cy="20" r="3"/>'],
    ['tray', 'Nampan & lilin', '<ellipse cx="24" cy="35" rx="16" ry="4"/><path d="M15 34v-9h5v9M22 34V21h5v13M29 34v-7h5v7"/>'],
    ['candles', 'Lilin', '<path d="M13 38V24h6v14M21 38V18h6v20M29 38V27h6v11M10 38h28"/><path d="M16 21v-2M24 15v-2M32 24v-2"/>'],
    ['sculpture', 'Patung', '<rect x="15" y="35" width="18" height="5"/><circle cx="24" cy="23" r="11"/><circle cx="24" cy="23" r="6"/>'],
    ['bowl', 'Mangkuk kayu', '<path d="M8 24h32c0 8-7 14-16 14S8 32 8 24z"/><path d="M19 38h10"/>'],
    ['clock', 'Jam meja', '<circle cx="24" cy="21" r="12"/><path d="M24 21v-7M24 21l4 3"/><path d="M15 37h18"/>'],
    ['cushion', 'Bantal', '<path d="M10 14c5 2 23 2 28 0-2 6-2 14 0 20-5-2-23-2-28 0 2-6 2-14 0-20z"/>'],
    ['throw', 'Selimut', '<path d="M8 20h30a4 4 0 0 1 0 8H8zM8 28h30a4 4 0 0 1 0 8H8z"/>'],
    ['rug', 'Karpet', '<rect x="6" y="14" width="36" height="20" rx="1"/><rect x="10" y="18" width="28" height="12"/>'],
    ['rugr', 'Karpet bulat', '<ellipse cx="24" cy="24" rx="18" ry="11"/><ellipse cx="24" cy="24" rx="13" ry="7"/>']
  ], ACC_BY = {};
  ACC.forEach(function (a) { ACC_BY[a[0]] = a; });
  function accIcon(k) { return '<svg class="acc-ic" viewBox="0 0 48 48" aria-hidden="true">' + (ACC_BY[k] ? ACC_BY[k][2] : '') + '</svg>'; }
  var raCat = 'all', raBox = $('#roomAddBox');
  function raOpen(on) {
    if (!raBox) return;
    if (on) { shellEdOpen(null); html.classList.toggle('cz-box3', czLayout() === 'box3'); renderRoomAdd(); }
    raBox.classList.toggle('is-on', on); raBox.setAttribute('aria-hidden', on ? 'false' : 'true');
    $('#roomAddBtn') && $('#roomAddBtn').classList.toggle('is-on', on); insets();
  }
  function renderRoomAdd() {
    var cats = [{ id: 'all', label: T('Semua') }, { id: 'acc', label: T('Aksesoris') }].concat(KATS.map(function (k) { return { id: k[0], label: T(k[0]) }; }), [{ id: 'mine', label: T('Rancangan saya') }]);
    $('#raCats').innerHTML = cats.map(function (c) { return '<button type="button" class="' + (c.id === raCat ? 'is-on' : '') + '" data-ra-cat="' + c.id + '">' + esc(c.label) + '</button>'; }).join('');
    var q = $('#raSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean), h = '';
    if (raCat === 'acc') {
      h = ACC.filter(function (a) { var s = (a[1] + ' ' + T(a[1]) + ' ' + a[0]).toLowerCase(); return q.every(function (x) { return s.indexOf(x) >= 0; }); })
        .map(function (a) { return '<button class="tile" type="button" data-ra-a="' + a[0] + '"><span class="tile__img is-acc">' + accIcon(a[0]) + '</span><span class="tile__n">' + esc(T(a[1])) + '</span><span class="tile__t">' + T('Styling') + '</span></button>'; }).join('');
      $('#raEmpty').textContent = T('Tidak ada yang cocok.');
    } else if (raCat === 'mine') {
      var ds = designs().filter(function (d) { var s = (d.title + ' ' + (d.sub || '')).toLowerCase(); return q.every(function (x) { return s.indexOf(x) >= 0; }); });
      h = ds.map(function (d) { return '<button class="tile" type="button" data-ra-d="' + d.id + '"><span class="tile__img is-plate">' + (d.img ? '<img class="is-ready" src="' + esc(d.img) + '" alt="">' : '<svg><use href="#i-ruler"/></svg>') + '</span><span class="tile__n">' + esc(d.title) + '</span><span class="tile__t">' + esc(d.sub || '') + '</span><span class="tile__p">' + rupiah(customUnit(d.cfg, d.price)) + '</span></button>'; }).join('');
      $('#raEmpty').textContent = T('Belum ada rancangan. Simpan rancangan di Customize.');
    } else {
      var ps = XV.PRODUCTS.filter(function (p) { return inKat(p, raCat, '') && q.every(function (x) { return p._q.indexOf(x) >= 0; }); });
      ps = ps.filter(function (p) { return modelOf(p, cur(p)); }).concat(ps.filter(function (p) { return !modelOf(p, cur(p)); }));   // ber-model 3D lebih dulu
      h = ps.map(function (p) { return '<button class="tile" type="button" data-ra-p="' + p.id + '"><span class="tile__img">' + thumbImg(p) + '</span><span class="tile__n">' + esc(p.name) + '</span><span class="tile__t">' + esc(p.type) + '</span><span class="tile__p">' + priceText(p) + '</span></button>'; }).join('');
      $('#raEmpty').textContent = T('Tidak ada yang cocok.');
    }
    $('#raGrid').innerHTML = h; $('#raEmpty').hidden = !!h; cutThumbs($('#raGrid'));
  }
  function raAdd(t) {
    var d = t.dataset;
    if (d.raP) { var p = byId[d.raP]; if (!p) return; var s = selOf(p), c = cur(p, s); roomAdd({ kind: 'product', pid: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, title: p.name, sub: c.label || p.type, img: src(c.img || p.img, 400) }); }
    else if (d.raA) { var a = ACC_BY[d.raA]; if (!a) return; roomAdd({ kind: 'acc', k: a[0], title: a[1], sub: 'Aksesoris' }); }
    else if (d.raD) { var ds = designs().filter(function (x) { return x.id === d.raD; })[0]; if (!ds) return; roomAdd({ kind: 'custom', title: ds.title, sub: ds.sub, mat: ds.mat, cfg: JSON.parse(JSON.stringify(ds.cfg)), price: ds.price, img: ds.img }); }
    else return;
    t.classList.remove('is-added'); void t.offsetWidth; t.classList.add('is-added');
  }
  if (raBox) {
    $('#roomAddBtn').addEventListener('click', function () { raOpen(!raBox.classList.contains('is-on')); });
    raBox.addEventListener('click', function (e) {
      if (e.target.closest('[data-ra-close]')) { raOpen(false); return; }
      var c = e.target.closest('[data-ra-cat]'); if (c) { raCat = c.dataset.raCat; renderRoomAdd(); $('#raGrid').scrollTop = 0; return; }
      var t = e.target.closest('.tile'); if (t) raAdd(t);
    });
    var raT = 0; $('#raSearch').addEventListener('input', function () { clearTimeout(raT); raT = setTimeout(renderRoomAdd, 120); });
  }
  XW.onRoomTurn = function (rid, deg) { var l = roomList(); l.forEach(function (e) { if (e.rid === rid) e.ry = deg; }); roomSave(l); };
  enter.ruang = function () { renderShell(); renderRoomPre(); renderRoom(); if (XW.roomShell) XW.roomShell(shell); roomStage(); };
  // halaman yang mengatur panggungnya sendiri: leave dijalankan SETELAH enter halaman tujuan → jangan ditimpa furnitur
  var OWN_STAGE = ['customize', 'ruang', 'cubix', 'manufaktur', 'galeri', 'penawaran'];
  leave.ruang = function (to) { shellEdOpen(null); raOpen(false); if (OWN_STAGE.indexOf(to) < 0) showFurniture(); };

  /* ======================================================================
     KONFIGURASI CUBIX — susun modul AC / AL / OT / coffee / side bebas di panggung (grid, menempel, putar, cermin)
     Kayu & kain satu untuk semua. Harga = jumlah modul; paket toko (AC-AL-AC, AC-AC) dipakai bila ada di susunan.
     Tersimpan di perangkat (xv5_cubix); ke tas sebagai satu baris "Konfigurasi CUBIX" (bisa dibuka lagi).
     ====================================================================== */
  var svgM = function (body) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round">' + body + '</svg>') + '")'; };
  // modul: produk sumber (harga & model 3D) + gambar garis tampak atas
  var CBX = {
    ac: { pid: 'cubix-series-1-seater-ac-kayu-terang', l: 'AC', n: 'Armchair', cat: 'seats', type: 'armchair', m: svgM('<rect x="9" y="9" width="42" height="42"/><path d="M9 11.5h39.5V51" stroke-width="5"/><rect x="14" y="18" width="29" height="28" rx="3"/>') },
    al: { pid: 'cubix-series-1-seater-al-kayu-terang', l: 'AL', n: 'Armless', cat: 'seats', type: 'armless', m: svgM('<rect x="9" y="9" width="42" height="42"/><path d="M9 11.5h42" stroke-width="5"/><rect x="13" y="18" width="34" height="28" rx="3"/>') },
    ot: { pid: 'cubix-series-ottoman-kayu-terang', l: 'OT', n: 'Ottoman', cat: 'seats', type: 'ottoman', m: svgM('<rect x="10" y="10" width="40" height="40"/><rect x="14" y="14" width="32" height="32" rx="3"/>') },
    ct: { pid: 'cubixct', l: 'Coffee', n: 'Coffee table', cat: 'tables', type: 'coffee', m: svgM('<rect x="4" y="15" width="52" height="30"/><rect x="8" y="19" width="44" height="22" stroke-dasharray="3 3"/>') },
    st: { pid: 'cubix-series-meja-sudut-side', l: 'Side', n: 'Side table', cat: 'tables', type: 'side', m: svgM('<rect x="12" y="12" width="36" height="36"/><rect x="16" y="16" width="28" height="28" stroke-dasharray="3 3"/>') }
  };
  var CBX_PACK = [{ pid: 'cubix-series-3-seaters-ac-al-ac-kayu-terang', l: 'Paket 3 seater (AC-AL-AC)', need: { ac: 2, al: 1 } }, { pid: 'cubix-series-2-seater-ac-ac-kayu-terang', l: 'Paket 2 seater (AC-AC)', need: { ac: 2 } }];
  // preset: [kode, x, z, r (×90°, 1 = menghadap +X), flip] — modul ±64 cm; AC asli: lengan di kanan
  var S6 = .64, CBX_PRESET = {
    '1s': { l: '1 Seater', m: [['ac', 0, 0, 0, 0]] },
    '2s': { l: '2 Seater', m: [['ac', -S6 / 2, 0, 0, 1], ['ac', S6 / 2, 0, 0, 0]] },
    '3s': { l: '3 Seater', m: [['ac', -S6, 0, 0, 1], ['al', 0, 0, 0, 0], ['ac', S6, 0, 0, 0]] },
    'L': { l: 'Sudut L', m: [['ac', -S6, 0, 0, 1], ['al', 0, 0, 0, 0], ['ac', S6, 0, 0, 0], ['al', S6, S6, 3, 0], ['ac', S6, 2 * S6, 3, 0]] },
    'U': { l: 'Bentuk U', m: [['ac', -S6, 0, 0, 1], ['al', 0, 0, 0, 0], ['ac', S6, 0, 0, 0], ['al', -S6, S6, 1, 0], ['ac', -S6, 2 * S6, 1, 1], ['al', S6, S6, 3, 0], ['ac', S6, 2 * S6, 3, 0]] },
    'lounge': { l: 'Lounge', m: [['ac', -S6, 0, 0, 1], ['al', 0, 0, 0, 0], ['ac', S6, 0, 0, 0], ['ct', 0, 1.02, 0, 0], ['ot', 1.6, .9, 0, 0]] },
    'set': { l: 'Set lengkap', m: [['ac', -S6, 0, 0, 1], ['al', 0, 0, 0, 0], ['ac', S6, 0, 0, 0], ['ct', 0, 1.02, 0, 0], ['st', -1.44, 0, 0, 0], ['st', 1.44, 0, 0, 0]] },
    'kosong': { l: 'Kosongkan', m: [] }
  };
  var cbxUid = function () { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  function cbxFromPreset(k, base) {
    var c = base ? JSON.parse(JSON.stringify(base)) : { wood: 'Terang', fab: '' };
    c.mods = CBX_PRESET[k].m.map(function (a) { return { uid: cbxUid(), k: a[0], x: a[1], z: a[2], r: a[3], flip: !!a[4] }; });
    return c;
  }
  var cbx = store.get('xv5_cubix', null), cbxSel = null;
  if (!cbx || !cbx.mods) cbx = cbxFromPreset('3s');
  /* riwayat konfigurasi CUBIX (Ctrl+Z / Ctrl+Shift+Z) */
  var cbxHist = { u: [], r: [], last: null };
  var cbxSave = function (quiet) {
    var now = JSON.stringify(cbx);
    if (!quiet && cbxHist.last && now !== cbxHist.last) { cbxHist.u.push(cbxHist.last); if (cbxHist.u.length > 60) cbxHist.u.shift(); cbxHist.r = []; }
    cbxHist.last = now; store.set('xv5_cubix', cbx);
  };
  cbxHist.last = JSON.stringify(cbx);
  function cbxStep(back) {
    var from = back ? cbxHist.u : cbxHist.r, to = back ? cbxHist.r : cbxHist.u;
    if (!from.length) return false;
    to.push(cbxHist.last); cbxHist.last = from.pop(); cbx = JSON.parse(cbxHist.last); store.set('xv5_cubix', cbx);
    if (!cbx.mods.some(function (m) { return m.uid === cbxSel; })) cbxSel = null;
    cbxRender(); cbxStage(false); cbxDetail(); if (CG.on) { cgOrigin(); cgRender(); }
    return true;
  }
  var cbxProd = function (k) { return byId[CBX[k].pid]; };
  function cbxFabrics() { var p = cbxProd('ac'), v = p && p.variants && p.variants[0]; return v && v.subs ? v.subs : []; }
  function cbxHex() { var f = cbxFabrics().filter(function (x) { return x.label === cbx.fab; })[0] || cbxFabrics()[0]; return f ? f.hex : null; }
  function cbxUrl(k) { var p = cbxProd(k); if (!p) return ''; var u = cbx.wood === 'Gelap' && p.vmodels && p.vmodels.Gelap || p.model; return u ? src(u) : ''; }
  var cbxUnit = function (k) { var p = cbxProd(k); return p && p.price || 0; };
  function cbxPrice(c) {
    var n = {}, left = {}, rows = [], total = 0, unitSum = 0;
    (c && c.mods || []).forEach(function (m) { if (CBX[m.k]) n[m.k] = (n[m.k] || 0) + 1; });
    Object.keys(n).forEach(function (k) { left[k] = n[k]; unitSum += n[k] * cbxUnit(k); });
    CBX_PACK.forEach(function (pk) {
      var p = byId[pk.pid]; if (!p || !p.price) return;
      var times = Math.min.apply(null, Object.keys(pk.need).map(function (k) { return Math.floor((left[k] || 0) / pk.need[k]); }));
      if (times > 0) { Object.keys(pk.need).forEach(function (k) { left[k] -= pk.need[k] * times; }); rows.push({ l: T(pk.l), q: times, v: p.price }); total += p.price * times; }
    });
    Object.keys(CBX).forEach(function (k) { if (left[k]) { rows.push({ l: CBX[k].n + ' (' + CBX[k].l + ')', q: left[k], v: cbxUnit(k) }); total += cbxUnit(k) * left[k]; } });
    return { rows: rows, total: total, save: Math.max(0, unitSum - total), n: n };
  }
  function cbxSub(c) {
    var n = cbxPrice(c).n, parts = Object.keys(CBX).filter(function (k) { return n[k]; }).map(function (k) { return n[k] + ' ' + CBX[k].l; });
    return [T(c.wood), c.fab || (cbxFabrics()[0] || {}).label, parts.join(' · ')].filter(Boolean).join(' · ');
  }
  function cbxStage(reframe) {
    if (!XW.ok || !XW.cfgSync) return;
    stageKind = 'cubixcfg';
    var mods = cbx.mods.filter(function (m) { return CBX[m.k] && cbxUrl(m.k); }).map(function (m) { return { uid: m.uid, url: cbxUrl(m.k), cat: CBX[m.k].cat, type: CBX[m.k].type, x: m.x, z: m.z, r: m.r, flip: m.flip, auto: m.auto }; });
    cbx.mods.forEach(function (m) { delete m.auto; });
    XW.cfgSync(mods, cbxHex(), reframe);
    if (XW.cfgSelect) XW.cfgSelect(cbxSel);
  }
  function cbxDetail() {
    var pr = cbxPrice(cbx);
    setDetail({ name: T('Konfigurasi CUBIX'), sub: T('{n} modul', { n: cbx.mods.length }) + ' · ' + T(cbx.wood) + ' · ' + (cbx.fab || (cbxFabrics()[0] || {}).label || ''), cols: [], priceK: T('Total'), price: pr.total ? rupiah(pr.total) : '', act: pr.total ? { t: T('Ke tas'), icon: 'i-bag', fn: cbxToBag } : null });
  }
  function cbxRender() {
    var box = $('#cbxBody'); if (!box) return;
    var pr = cbxPrice(cbx), sel = cbx.mods.filter(function (m) { return m.uid === cbxSel; })[0], fabs = cbxFabrics(), fab = cbx.fab || (fabs[0] || {}).label;
    var opt = function (attr, v, on, label, hex) { return '<button type="button" class="cz-o' + (on ? ' is-on' : '') + '" ' + attr + '="' + esc(v) + '" title="' + esc(label) + '">' + (hex ? '<i class="cz-o__c" style="--c:' + hex + '"></i>' : '') + '<span>' + esc(label) + '</span></button>'; };
    var h = '<div class="cbx-g"><p class="og__h"><span>' + T('Preset') + '</span></p><div class="og">' + Object.keys(CBX_PRESET).filter(function (k) { return !CBX_PRESET[k].hide; }).map(function (k) { return opt('data-cbx-preset', k, false, T(CBX_PRESET[k].l)); }).join('') + '</div></div>';
    h += '<div class="cbx-g"><p class="og__h"><span>' + T('Tambah modul') + '</span><b>' + T('{n} modul', { n: cbx.mods.length }) + '</b></p><div class="cz-grid">' + Object.keys(CBX).map(function (k) {
      return '<button type="button" class="cz-o cz-card" data-cbx-add="' + k + '" title="' + esc(CBX[k].n) + '"><span class="cz-card__f"><span class="cz-card__m is-m" style="--m:' + CBX[k].m.replace(/"/g, '&quot;') + '"></span>' + (pr.n[k] ? '<i class="cbx-n">' + pr.n[k] + '</i>' : '') + '</span><span class="cz-card__l"><span>' + esc(CBX[k].l) + '</span></span></button>';
    }).join('') + '</div></div>';
    h += '<div class="cbx-g"><p class="og__h"><span>' + T('Modul terpilih') + '</span><b>' + (sel ? esc(CBX[sel.k].n + ' (' + CBX[sel.k].l + ')') : '—') + '</b></p>' + (sel ? '<div class="og">' +
      opt('data-cbx-do', 'rot', false, T('Putar 90°')) + opt('data-cbx-do', 'flip', !!sel.flip, T('Balik')) + opt('data-cbx-do', 'dup', false, T('Duplikat')) + opt('data-cbx-do', 'del', false, T('Hapus')) + '</div>' : '<p class="note">' + T(cbx.mods.length ? 'Ketuk modul di panggung untuk mengubahnya.' : 'Belum ada modul — pilih preset atau tambah modul.') + '</p>') + '</div>';
    h += '<div class="cbx-g"><p class="og__h"><span>' + T('Kayu') + '</span><b>' + T(cbx.wood) + '</b></p><div class="og">' + ['Terang', 'Gelap'].map(function (wd) { return opt('data-cbx-wood', wd, cbx.wood === wd, T(wd)); }).join('') + '</div></div>';
    h += '<div class="cbx-g"><p class="og__h"><span>' + T('Warna kain') + '</span><b>' + esc(fab || '') + '</b></p><div class="og">' + fabs.map(function (x) { return opt('data-cbx-fab', x.label, x.label === fab, x.label, x.hex); }).join('') + '</div></div>';
    h += '<div class="cbx-g"><p class="og__h"><span>' + T('Rincian harga') + '</span></p><dl class="cbx-sum">' + (pr.rows.length ? pr.rows.map(function (r) { return '<div><dt>' + esc(r.l) + (r.q > 1 ? ' × ' + r.q : '') + '</dt><dd>' + rupiah(r.v * r.q) + '</dd></div>'; }).join('') : '<div><dt>—</dt><dd></dd></div>') + '</dl></div>';
    box.innerHTML = h;
    $('#cbxTotal').textContent = pr.total ? rupiah(pr.total) : '—';
    $('#cbxSave').textContent = pr.save ? T('Hemat {v} dengan harga paket', { v: rupiah(pr.save) }) : '';
    $('#cbxBag').disabled = !pr.total;
    czLazy && czLazy(box);
  }
  function cbxChanged(reframe) { cbxRender(); cbxStage(reframe); cbxSave(); cbxDetail(); if (CG.on) cgRender(); }   // cbxStage dulu: tanda auto dibuang sebelum disimpan
  function cbxEdit(act) {
    var i = cbx.mods.map(function (m) { return m.uid; }).indexOf(cbxSel); if (i < 0) return;
    var m = cbx.mods[i];
    if (act === 'rot') m.r = ((m.r || 0) + 1) % 4;
    else if (act === 'flip') m.flip = !m.flip;
    else if (act === 'dup') { var d = JSON.parse(JSON.stringify(m)); d.uid = cbxUid(); d.x += .64; d.auto = true; cbx.mods.push(d); cbxSel = d.uid; }
    else if (act === 'del') { cbx.mods.splice(i, 1); cbxSel = null; }
    cbxChanged(act === 'dup' || act === 'del');
  }
  $('#cbxBody') && $('#cbxBody').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-cbx-preset]'))) { cbx = cbxFromPreset(b.dataset.cbxPreset, cbx); cbxSel = null; if (CG.on) cgOrigin(); cbxChanged(true); return; }
    if ((b = e.target.closest('[data-cbx-add]'))) {
      var k = b.dataset.cbxAdd, maxX = cbx.mods.reduce(function (n, m) { return Math.max(n, m.x); }, -.64), seat = CBX[k].cat === 'seats';
      var m = { uid: cbxUid(), k: k, x: seat ? maxX + .64 : 0, z: seat ? 0 : 1.02, r: 0, flip: false, auto: true };
      cbx.mods.push(m); cbxSel = m.uid; cbxChanged(true); return;
    }
    if ((b = e.target.closest('[data-cbx-do]'))) { cbxEdit(b.dataset.cbxDo); return; }
    if ((b = e.target.closest('[data-cbx-wood]'))) { cbx.wood = b.dataset.cbxWood; cbxChanged(false); return; }
    if ((b = e.target.closest('[data-cbx-fab]'))) { cbx.fab = b.dataset.cbxFab; cbxChanged(false); return; }
  });

  /* ---------- Grid layout: tampak atas, 1 kotak = 1 modul (64 cm), depan di bawah. Pilih tipe lalu klik kotak:
     kosong → tambah, berisi → ganti tipe (posisi & putaran tetap); Hapus → buang. Panggung, harga & undo ikut. */
  var CG = { G: .64, cols: 9, rows: 6, tool: 'ac', x0: 0, z0: 0, on: false };
  var CBX_SIZE = { ac: [.64, .64], al: [.65, .64], ot: [.63, .63], ct: [.94, .63], st: [.63, .63] };
  function cgSpan(m) { var s = CBX_SIZE[m.k] || [.64, .64], a = Math.max(1, Math.ceil(s[0] / CG.G - .2)), b = Math.max(1, Math.ceil(s[1] / CG.G - .2)); return (m.r || 0) % 2 ? [b, a] : [a, b]; }
  function cgOrigin() {   // titik grid mengikuti susunan (modul jatuh tepat di kotak), dipusatkan
    var ms = cbx.mods, G = CG.G; if (!ms.length) { CG.x0 = 0; CG.z0 = 0; return; }
    var m0 = ms[0], sp = cgSpan(m0), ox = m0.x - (sp[0] - 1) * G / 2, oz = m0.z - (sp[1] - 1) * G / 2;
    ox = ((ox % G) + G) % G; oz = ((oz % G) + G) % G;
    var xs = ms.map(function (m) { return m.x; }), zs = ms.map(function (m) { return m.z; });
    CG.x0 = ox + Math.round(((Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 - ox) / G) * G;
    CG.z0 = oz + Math.round((Math.min.apply(null, zs) - oz) / G) * G;
  }
  var cgCellX = function (c) { return CG.x0 + (c - 4) * CG.G; }, cgCellZ = function (r) { return CG.z0 + (r - 1) * CG.G; };
  function cgCells(m) { var sp = cgSpan(m), c0 = Math.round((m.x - (sp[0] - 1) * CG.G / 2 - CG.x0) / CG.G) + 4, r0 = Math.round((m.z - (sp[1] - 1) * CG.G / 2 - CG.z0) / CG.G) + 1; return { c: c0, r: r0, w: sp[0], h: sp[1] }; }
  function cgAt(c, r) { for (var i = cbx.mods.length - 1; i >= 0; i--) { var q = cgCells(cbx.mods[i]); if (c >= q.c && c < q.c + q.w && r >= q.r && r < q.r + q.h) return cbx.mods[i]; } return null; }
  function cgRender() {
    if (!CG.on) return;
    var tools = Object.keys(CBX).map(function (k) { return '<button type="button" class="cz-o' + (CG.tool === k ? ' is-on' : '') + '" data-cg-tool="' + k + '" title="' + esc(CBX[k].n) + '"><i class="cbx-ti" style="--m:' + CBX[k].m.replace(/"/g, '&quot;') + '"></i><span>' + esc(CBX[k].l) + '</span></button>'; }).join('') +
      '<button type="button" class="cz-o' + (CG.tool === 'del' ? ' is-on' : '') + '" data-cg-tool="del"><span>' + T('Hapus') + '</span></button>' +
      '<button type="button" class="cz-o" data-cg-do="rot"' + (cbxSel ? '' : ' disabled') + '><span>' + T('Putar 90°') + '</span></button><button type="button" class="cz-o" data-cg-do="flip"' + (cbxSel ? '' : ' disabled') + '><span>' + T('Balik') + '</span></button>';
    $('#cbxTools').innerHTML = tools;
    var cell = 34, gap = 2, h = '';
    for (var r = 0; r < CG.rows; r++) for (var c = 0; c < CG.cols; c++) h += '<button type="button" data-c="' + c + '" data-r="' + r + '" aria-label="' + (c + 1) + ',' + (r + 1) + '"></button>';
    h += cbx.mods.map(function (m) {
      var q = cgCells(m); if (q.c < 0 || q.r < 0 || q.c + q.w > CG.cols || q.r + q.h > CG.rows) return '';
      var bw = q.w * cell + (q.w - 1) * gap, bh = q.h * cell + (q.h - 1) * gap, odd = (m.r || 0) % 2;
      // ikon digambar tegak (lebar × tinggi asli) lalu diputar: depan modul (+z) = bawah grid
      return '<span class="cbx-mod' + (m.uid === cbxSel ? ' is-sel' : '') + '" style="left:calc(50% - ' + (CG.cols * (cell + gap) - gap) / 2 + 'px + ' + q.c * (cell + gap) + 'px);top:' + (8 + q.r * (cell + gap)) + 'px;width:' + bw + 'px;height:' + bh + 'px">' +
        '<i style="--m:' + CBX[m.k].m.replace(/"/g, '&quot;') + ';' + (odd ? 'inset:auto;left:50%;top:50%;width:' + (bh - 6) + 'px;height:' + (bw - 6) + 'px;' : '') + 'transform:' + (odd ? 'translate(-50%,-50%) ' : '') + 'rotate(' + (-(m.r || 0) * 90) + 'deg) scaleX(' + (m.flip ? -1 : 1) + ')"></i></span>';
    }).join('');
    h += '<p class="cbx-cells__front">' + T('Depan') + '</p>';
    $('#cbxCells').innerHTML = h;
  }
  function cgOpen(on) {
    var box = $('#cbxGrid'); CG.on = on;
    if (on) { html.classList.toggle('cz-box3', czLayout() === 'box3'); cgOrigin(); cgRender(); }
    box.classList.toggle('is-on', on); box.setAttribute('aria-hidden', on ? 'false' : 'true');
    $('#cbxGridBtn').classList.toggle('is-on', on);
    insets();
  }
  function cgClick(c, r) {
    var m = cgAt(c, r), t = CG.tool, G = CG.G;
    if (t === 'del') { if (!m) return; cbx.mods = cbx.mods.filter(function (x) { return x !== m; }); if (cbxSel === m.uid) cbxSel = null; cbxChanged(true); cgRender(); return; }
    if (m) { if (m.k !== t) m.k = t; cbxSel = m.uid; cbxChanged(false); cgRender(); return; }
    var n = { uid: cbxUid(), k: t, r: 0, flip: false }, sp = cgSpan(n);
    for (var i = 0; i < sp[0]; i++) for (var j = 0; j < sp[1]; j++) if (cgAt(c + i, r + j) || c + i >= CG.cols || r + j >= CG.rows) return;   // tidak muat
    n.x = +(cgCellX(c) + (sp[0] - 1) * G / 2).toFixed(3); n.z = +(cgCellZ(r) + (sp[1] - 1) * G / 2).toFixed(3);
    if (t === 'ac') {   // lengan AC ke sisi luar: tetangga di kiri saja → lengan kanan; di kanan saja → lengan kiri
      var seat = function (x) { return x && CBX[x.k].cat === 'seats'; }, L = seat(cgAt(c - 1, r)), Rt = seat(cgAt(c + 1, r));
      if (Rt && !L) n.flip = true;
    }
    cbx.mods.push(n); cbxSel = n.uid; cbxChanged(true); cgRender();
  }
  $('#cbxGridBtn') && $('#cbxGridBtn').addEventListener('click', function () { cgOpen(!CG.on); });
  $('#cbxGrid') && $('#cbxGrid').addEventListener('click', function (e) {
    var b;
    if (e.target.closest('[data-grid-close]')) { cgOpen(false); return; }
    if ((b = e.target.closest('[data-cg-tool]'))) { CG.tool = b.dataset.cgTool; cgRender(); return; }
    if ((b = e.target.closest('[data-cg-do]'))) { cbxEdit(b.dataset.cgDo); cgRender(); return; }
    if ((b = e.target.closest('[data-c]'))) cgClick(+b.dataset.c, +b.dataset.r);
  });
  function cbxEntry() { return { id: 'cbx-' + Date.now().toString(36), type: 'cubix', title: T('Konfigurasi CUBIX'), sub: cbxSub(cbx), cfg: JSON.parse(JSON.stringify(cbx)), price: cbxPrice(cbx).total, img: XW.cfgShot ? XW.cfgShot(220) : '', q: 1 }; }
  function cbxToBag() { if (!cbxPrice(cbx).total) return; addEntry(cbxEntry()); }
  $('#cbxBag') && $('#cbxBag').addEventListener('click', cbxToBag);
  // buka konfigurator: dari tas (susunan tersimpan) atau dari halaman produk CUBIX (preset sesuai produk, kayu & kain ikut pilihan)
  function cbxOpen(cfg) { if (cfg) { cbx = JSON.parse(JSON.stringify(cfg)); cbxSave(); } cbxSel = null; go('cubix'); }
  var CBX_FOR = { 'cubix-series-1-seater-ac-kayu-terang': '1s', 'cubix-series-1-seater-al-kayu-terang': '1al', 'cubix-series-ottoman-kayu-terang': '1ot', 'cubix-series-2-seater-ac-ac-kayu-terang': '2s', 'cubix-series-3-seaters-ac-al-ac-kayu-terang': '3s', 'cubixct': 'lounge', 'cubix-series-meja-sudut-side': 'set' };
  CBX_PRESET['1al'] = { l: 'AL', m: [['al', 0, 0, 0, 0]], hide: true }; CBX_PRESET['1ot'] = { l: 'OT', m: [['ot', 0, 0, 0, 0]], hide: true };
  $('#pdCfg') && $('#pdCfg').addEventListener('click', function () {
    var p = kList[kI]; if (!p) return;
    var c = cur(p), base = { wood: c.v && /gelap/i.test(c.v.label) ? 'Gelap' : 'Terang', fab: c.sub && c.sub.hex ? c.sub.label : cbx.fab };
    cbx = cbxFromPreset(CBX_FOR[p.id] || '3s', base); cbxSave(); cbxSel = null; go('cubix');
  });
  XW.onCfgPick = function (uid) { if (current !== 'cubix') return; cbxSel = uid; cbxRender(); if (CG.on) cgRender(); };
  XW.onCfgTurn = function (uid, dir) { cbx.mods.forEach(function (m) { if (m.uid === uid) m.r = (((m.r || 0) + dir) % 4 + 4) % 4; }); cbxSel = uid; cbxChanged(false); };
  // susunan CUBIX → Ruang: tiap modul jadi furnitur ruang (kayu, kain, putaran & cermin ikut), diletakkan di sebelah kanan isi ruang
  function cbxToRoom() {
    if (!cbx.mods.length) return;
    var l = roomList(), right = l.reduce(function (m, x) { return Math.max(m, (x.x || 0) + roomWidth(x) / 2); }, -1e9);
    var minX = Math.min.apply(null, cbx.mods.map(function (m) { return m.x; })), maxX = Math.max.apply(null, cbx.mods.map(function (m) { return m.x; }));
    var dx = l.length ? right + .5 + .35 - minX : -(minX + maxX) / 2, t = Date.now().toString(36), fi = Math.max(0, cbxFabrics().map(function (x) { return x.label; }).indexOf(cbx.fab));
    cbx.mods.forEach(function (m, i) {
      var p = cbxProd(m.k); if (!p) return;
      var vi = p.variants && p.variants.length ? Math.max(0, p.variants.map(function (v) { return v.label; }).indexOf(cbx.wood)) : -1, v = p.variants && p.variants[vi];
      l.push({ kind: 'product', pid: p.id, v: vi, s: v && v.subs && v.subs.length ? Math.min(fi, v.subs.length - 1) : -1, title: p.name, sub: T(cbx.wood) + (CBX[m.k].cat === 'seats' ? ' · ' + cbx.fab : ''), img: src(p.img, 400), rid: 'R' + t + i, x: +(m.x + dx).toFixed(3), z: m.z, ry: (m.r || 0) * 90, flip: !!m.flip });
    });
    roomSave(l); notice(T('Konfigurasi CUBIX ditambahkan ke ruang') + ' · ' + T('Lihat ruang'));
    roomBump();
  }
  $('#cbxRoom') && $('#cbxRoom').addEventListener('click', cbxToRoom);
  XW.onCfgMove = function (uid, x, z, auto) { cbx.mods.forEach(function (m) { if (m.uid === uid) { m.x = x; m.z = z; } }); cbxSave(auto); if (CG.on) cgRender(); };   // auto: bagian dari "tambah modul", bukan langkah sendiri
  function histStep(back) {
    var ok = current === 'cubix' ? cbxStep(back) : current === 'ruang' ? roomStep(back) : current === 'customize' ? czStep(back) : false;
    if (ok) notice(T(back ? 'Diurungkan' : 'Diulangi'));
    return ok;
  }
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || (current !== 'cubix' && current !== 'ruang' && current !== 'customize') || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    var k = e.key.toLowerCase();
    if (k === 'z' || k === 'y') { e.preventDefault(); histStep(k === 'z' && !e.shiftKey); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) return;
    if (current !== 'cubix' || !cbxSel || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    var k = e.key.toLowerCase();
    if (k === 'r') cbxEdit('rot'); else if (k === 'f') cbxEdit('flip'); else if (k === 'delete' || k === 'backspace') { e.preventDefault(); cbxEdit('del'); }
  });

  /* ======================================================================
     MENU KLIK KANAN di panggung — opsi sesuai yang diklik (modul CUBIX, furnitur ruang, produk) + umum
     (Tampilkan ukuran, Reset tampilan). Opsi baru cukup ditambah di ctxItems.
     ====================================================================== */
  var ctxEl = $('#ctxMenu'), ctxPick = null;
  function ctxItems(pick) {
    var it = [];
    if (pick && pick.kind === 'cfg' && current === 'cubix') { cbxSel = pick.uid; cbxRender(); if (XW.cfgSelect) XW.cfgSelect(pick.uid); it.push(['cfg-rot', T('Putar 90°')], ['cfg-flip', T('Balik')], ['cfg-dup', T('Duplikat')], ['cfg-del', T('Hapus modul')], null); }
    if (pick && pick.kind === 'room') it.push(['room-rot', T('Putar 45°')], ['room-del', T('Hapus dari ruang')], null);
    var hs = current === 'cubix' ? cbxHist : current === 'ruang' ? roomHist : current === 'customize' ? czHist : null;
    if (hs && (hs.u.length || hs.r.length)) { if (hs.u.length) it.push(['undo', T('Urungkan') + '  ·  Ctrl+Z']); if (hs.r.length) it.push(['redo', T('Ulangi') + '  ·  Ctrl+Shift+Z']); it.push(null); }
    if (XW.motions && XW.motions().length && !(pick && pick.kind !== 'item' && pick.kind)) it.push(['anim', T('Animate'), XW.motions().some(function (m) { return m.to > .5; })], null);
    it.push(['dims', T('Tampilkan ukuran'), dimsOn()], null, ['human:pria', T('Manusia 170 cm · pria'), XW.human && XW.human() === 'pria'], ['human:wanita', T('Manusia 170 cm · wanita'), XW.human && XW.human() === 'wanita'], ['human:manikin', T('Manikin kayu 170 cm'), XW.human && XW.human() === 'manikin'], null, ['reset', T('Reset tampilan')]);
    return it;
  }
  function ctxOpen(x, y, pick) {
    ctxPick = pick;
    ctxEl.innerHTML = '<p class="ctx__h">' + T('Panggung') + '</p>' + ctxItems(pick).map(function (o) {
      if (!o) return '<hr>';
      return '<button type="button" class="more__item" role="menuitem" data-ctx="' + o[0] + '"><span>' + esc(o[1]) + '</span>' + (o.length > 2 ? '<i class="' + (o[2] ? 'is-on' : '') + '"></i>' : '') + '</button>';
    }).join('');
    ctxEl.style.left = Math.max(8, Math.min(innerWidth - ctxEl.offsetWidth - 8, x + 4)) + 'px';
    ctxEl.style.top = Math.max(8, Math.min(innerHeight - ctxEl.offsetHeight - 8, y + 4)) + 'px';
    ctxEl.classList.add('is-on');
  }
  function ctxClose() { ctxEl.classList.remove('is-on'); ctxPick = null; }
  XW.onContext = function (x, y, pick) { ctxOpen(x, y, pick); };
  (function () { var hk = store.get('xv5_human', 0); if (XW.human && hk) XW.human(hk === 1 ? 'pria' : hk); })();   // manikin skala diingat di perangkat
  ctxEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ctx]'); if (!b) return;
    var a = b.dataset.ctx, pick = ctxPick; ctxClose();
    if (a === 'dims') { store.set('xv5_dims', dimsOn() ? 0 : 1); renderSettings(); return; }
    if (a === 'reset') { if (XW.recenter) XW.recenter(); return; }
    if (a.indexOf('human:') === 0) { if (XW.human) { var hk = a.slice(6); store.set('xv5_human', XW.human(XW.human() === hk ? false : hk) || 0); renderSettings(); } return; }   // pilih lagi = sembunyikan
    if (a === 'undo' || a === 'redo') { histStep(a === 'undo'); return; }
    if (a === 'anim') { if (XW.animate) XW.animate(); return; }
    if (a.indexOf('cfg-') === 0) { cbxEdit({ 'cfg-rot': 'rot', 'cfg-flip': 'flip', 'cfg-dup': 'dup', 'cfg-del': 'del' }[a]); return; }
    if (pick && a === 'room-rot') { var l = roomList(); l.forEach(function (it) { if (it.rid === pick.rid) { it.ry = ((it.ry || 0) + 45) % 360; if (XW.roomSet) XW.roomSet(it.rid, { ry: it.ry }); } }); roomSave(l); return; }
    if (pick && a === 'room-del') { roomSave(roomList().filter(function (it) { return it.rid !== pick.rid; })); renderRoom(); if (XW.roomRemove && XW.roomRemove(pick.rid)) roomDetail(); else roomStage(); }
  });
  document.addEventListener('pointerdown', function (e) { if (ctxEl.classList.contains('is-on') && !ctxEl.contains(e.target)) ctxClose(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { ctxClose(); if (CG.on && current === 'cubix') cgOpen(false); } });
  window.addEventListener('wheel', ctxClose, { passive: true });
  window.addEventListener('resize', ctxClose);
  enter.cubix = function () { cbxRender(); cbxStage(true); cbxDetail(); };
  leave.cubix = function (to) { cbxSel = null; if (CG.on) cgOpen(false); if (OWN_STAGE.indexOf(to) < 0) showFurniture(); };
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
    html += '<div class="foot foot--bar"><div class="co-total"><span class="eyebrow">' + T('Total') + '</span><b class="price">' + rupiah(k.total) + '</b><span class="co-trust">' + T('Garansi 3 tahun') + (coLines().some(function (l) { return l.custom; }) ? ' · ' + T('custom dibuat setelah bayar') : '') + '</span></div>' +
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
    $$('[data-cf]', payBox).forEach(function (i) { var k = i.dataset.cf, f = i.closest('.fld'); if (f) f.dataset.err = k === 'phone' ? T('Nomor WhatsApp belum lengkap') : T('Wajib diisi'); i.closest('.fld') && i.closest('.fld').classList.toggle('is-err', (k === 'name' && !contact.name) || (k === 'phone' && String(contact.phone).replace(/\D/g, '').length < 8) || (k === 'address' && !addr.address) || (k === 'city' && !addr.city) || (k === 'zone' && !addr.zone)); });
    if (miss.length) { note.textContent = T('Lengkapi: {x}', { x: miss.join(', ') }); note.classList.add('is-err'); var bad = $('.fld.is-err', payBox) || (!coState.method && $('[data-m]', payBox)) || note; bad.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); notice(note.textContent); return; }
    if (!addr.name) addr.name = contact.name; if (!addr.phone) addr.phone = contact.phone;
    store.set('xv5_customer', { name: contact.name, phone: contact.phone, email: contact.email, address: addr.address, city: addr.city, zip: addr.zip, zone: addr.zone, label: addr.label });
    if (u && !a && coState.form.saveAddr !== false) { var sa = XA.saveAddress(Object.assign({}, addr)); coState.addrId = sa.id; coState.newAddr = false; }
    var k = coCalc(), ql = k.lines.filter(function (l) { return l.quote; });
    coState.busy = true; renderCo(true);
    // penawaran: tagihan dihitung server dari kode (angka di browser tidak dipakai)
    Promise.all(ql.map(function (l) { return qFetch('pub/q/' + encodeURIComponent(l.e.code) + '/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qty: l.q }) }); })).then(function (rs) {
      var bad = rs.filter(function (r) { return !r || !r.ok; })[0];
      if (bad) { coState.busy = false; renderCo(true); var nb = $('#payNote'); nb.textContent = (bad && bad.error) || T('Penawaran tidak valid'); nb.classList.add('is-err'); return; }
      rs.forEach(function (r, i) { var l = ql[i]; l.c = Object.assign({}, l.c, { price: r.unit }); l.q = r.qty; l.total = r.amount; l.ref = r.ref; });
      k.sub = sumOf(k.lines); k.total = k.sub + (k.ship || 0) + k.inst;
      coPlace(k, u, contact, addr);
    });
  }
  function coPlace(k, u, contact, addr) {
    var order = {
      id: 'XC-' + Date.now().toString(36).toUpperCase(), created: Date.now(), account: u ? u.id : null,
      items: k.lines.map(function (l) { return { id: l.p.id, name: l.p.name, variant: l.c.label, qty: l.q, price: l.c.price, custom: l.custom ? l.e.cfg : undefined, adjust: l.e.pc || undefined, quote: l.quote ? l.e.code : undefined, quoteRef: l.ref }; }),
      subtotal: k.sub, shipping: k.ship, install: k.inst, total: k.total, customer: contact, address: addr, method: coState.method, eta: eta(k.zone), src: UTM || undefined
    };
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
  /* Info layout (Pengaturan): I = semua pilihan di panel kanan · II = pilihan > 4 di kotak sebelah panel ·
     III = seperti II, kotak tepat di kanan side panel (rail) dan preview bergeser ke kanan. Mobile selalu I. */
  function czlNow() {
    var v = store.get('xv5_czl', null);
    if (v == null) { var s = window.XVDB && XVDB.settings ? XVDB.settings() : {}; v = s.czLayout === 'box2' ? 2 : s.czLayout === 'box1' ? 1 : 3; }   /* bawaan: Layout III */   // dulu: Developer Settings › Tampilan Customize
    return [1, 2, 3].indexOf(+v) >= 0 ? +v : 1;
  }
  var czLayout = function () { return isMobile() ? 'box1' : 'box' + czlNow(); };

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
  /* estimasi lama produksi custom per kategori (hari kerja) — angka sementara, konfirmasi ke pabrik */
  var CZ_LEAD = { kursi: [14, 21], meja: [14, 21], kabinet: [18, 28], divan: [14, 21] };
  function czUnit() { var q = cz.qty; cz.qty = 1; var v = XC.estimate(cz); cz.qty = q; return v; }
  function czFoot() {
    var el = $('#czFoot'); if (!el) return;
    var q = Math.max(1, +cz.qty || 1);
    el.innerHTML = '<button type="button" class="cz__price" data-breakdown><em>' + (q > 1 ? T('Total {n} unit', { n: q }) : T('Harga · rincian')) + '</em><b>' + rupiah(czUnit() * q) + '</b></button>' +
      '<button class="btn btn--line btn--ic" type="button" data-cz-save title="' + T('Simpan rancangan') + '"><svg><use href="#i-heart"/></svg><span class="btn__l">' + T('Simpan') + '</span></button>' +   // ikon + label kecil
      '<button class="btn btn--line btn--ic" type="button" data-cz-room title="' + T('Tambah ke ruang') + '"><svg><use href="#i-room"/></svg><span class="btn__l">' + T('Ruang') + '</span></button>' +
      '<button class="btn btn--gold" type="button" data-cz-add' + (czEditing() ? ' title="' + T('Perbarui rancangan di tas') + '"' : '') + '><svg><use href="#i-bag"/></svg><span>' + (czEditing() ? T('Perbarui') : T('Ke tas')) + '</span></button>';
  }
  function czEntry() {
    return { id: 'cz-' + Date.now().toString(36), type: 'custom', title: czTitle(), sub: XC.dimsText(cz), mat: czMat(), cfg: JSON.parse(JSON.stringify(cz)), price: czUnit(), img: XW.snapshot ? XW.snapshot(220) : '', q: Math.max(1, +cz.qty || 1), base: czBase };
  }
  var czEditKey = null;   // rancangan di tas yang sedang diubah
  function czEditing() { return !!(czEditKey && bag[czEditKey]); }
  function czAddToBag() {
    if (czEditing()) { var old = bag[czEditKey], ne = czEntry(); ne.id = old.id; ne.q = old.q; delete bag[czEditKey]; bag[ne.id] = ne; czEditKey = null; renderBag(); bump(); czFoot(); notice(T('Rancangan di tas diperbarui'), { t: T('Lihat tas'), fn: function () { go('tas'); } }); return; }
    addEntry(czEntry());
  }
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
  $('#pdRoom').addEventListener('click', function () { advOpen(false); var p = kList[kI]; if (!p) return; var s = selOf(p), c = cur(p, s), pc = pcFor(p), e = { kind: 'product', pid: p.id, v: p.variants && p.variants.length ? s.v : -1, s: p.variants && p.variants.length ? s.s : -1, title: p.name, sub: c.label || p.type, img: src(c.img || p.img, 400) }; if (pcChanged(pc)) e.pc = { w: pc.w, d: pc.d, w0: pc.w0, d0: pc.d0, metal: pc.metal, metal0: pc.metal0 }; roomAdd(e); });

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
      var s = m.subs[cz.cat + '/' + cz.sub], xid = gr.id === 'uph' && x.tex ? 'vienna' : x.id, e = s && s[gr.id + '__' + xid], ss = cz.sub, as = XC.sub(cz).iconAs;   // kain koleksi: pinjam gambar kain tenun
      x = xid !== x.id ? { id: xid } : x;
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
    if (x.tex && window.XTEX) return '<span class="cz-card__f"><i class="cz-sw is-tex" style="--c:' + x.hex + ';background-image:url(\'' + XTEX.thumb(x.tex) + '\')"></i></span>';   // tekstur koleksi: gambar asli
    return '<span class="cz-card__f"><i class="cz-sw ' + k + '" style="--c:' + x.hex + (x.vein ? ';--v:' + x.vein : '') + '"></i></span>';
  }
  /* selisih harga bila pilihan ini dipilih (dihitung dari rancangan sekarang, per unit) */
  var czUnit0 = null;
  function czDelta(gr, x, on, multi) {
    if (on || gr.id === '_cat' || gr.id === '_sub' || !window.XC) return 0;
    try {
      if (czUnit0 == null) { var c0 = JSON.parse(JSON.stringify(cz)); c0.qty = 1; czUnit0 = XC.estimate(c0) || 0; }
      var c = JSON.parse(JSON.stringify(cz)); c.qty = 1; XC.apply(c, gr.id, multi ? (c[gr.id] || []).concat([x.id]) : x.id);
      return Math.round(((XC.estimate(c) || 0) - czUnit0) / 5000) * 5000;
    } catch (e) { return 0; }
  }
  function cell(gr, x, on, multi) {
    var full = L(x) + (x.add ? ' (+' + short(x.add) + ')' : ''), fig = '', kind = 'is-tx', dd = czDelta(gr, x, on, multi);
    if (x.hex) { fig = czSwatch(gr, x); kind = 'is-sw'; }
    else {
      var u = czIcon(gr, x);
      if (u) { kind = 'is-ic'; fig = '<span class="cz-card__f"><i class="cz-card__m' + (CZI.seen[u] ? ' is-m" style="--m:url(\'' + u + '\')' : '') + '" data-m="' + esc(u) + '"></i></span>'; }
      else if (x.svg) { kind = 'is-ic'; fig = '<span class="cz-card__f">' + x.svg + '</span>'; }   // gambar garis SVG dari spesifikasi (pilihan tanpa render)
    }
    return '<button type="button" class="cz-o cz-card ' + kind + (on ? ' is-on' : '') + '" data-v="' + x.id + '" title="' + esc(full) + '">' + fig +
      (multi ? '<i class="cz-o__k"></i>' : '') + '<span class="cz-card__l"><span>' + esc(cut15(shortL(x))) + '</span>' + (dd ? '<em class="cz-card__d' + (dd < 0 ? ' is-neg' : '') + '">' + (dd > 0 ? '+' : '−') + 'Rp ' + short(Math.abs(dd)) + '</em>' : '') + '</span></button>';
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
  var czPrev = [];   // grup yang sudah dirender di langkah ini (untuk deteksi turunan)
  function czDepOn(gr) {
    if (!gr.when || gr.id === '_sub' || gr.preset) return false;
    var p = czPrev.slice(-2);
    for (var i = 0; i < p.length; i++) {
      var P = p[i]; if (P.type === 'range' || P.type === 'layout' || /^_/.test(P.id)) continue;
      var os = XC.opts(P, cz), c2 = Object.assign({}, cz);
      for (var k = 0; k < os.length; k++) { c2[P.id] = P.type === 'multi' ? [os[k].id] : os[k].id; try { if (!gr.when(c2)) return true; } catch (e) {} }
      if (P.type === 'multi') { c2[P.id] = []; try { if (!gr.when(c2)) return true; } catch (e) {} }
    }
    return false;
  }
  function czGroup(gr, box2) {
    if (gr.type === 'layout') return czLayEd(gr);   // editor susunan kolom (kabinet)
    var dep = czDepOn(gr) ? ' is-dep' : '';   // pilihan turunan (muncul karena pilihan di atasnya)
    var lab = L(gr) + (gr.partsL && gr.partsL.length ? ' · ' + T('untuk') + ' ' + gr.partsL.join(' & ') : '');
    var head = function (b) { return '<p class="cz-g__h"><span>' + esc(lab) + '</span><b' + (b ? ' data-out' : '') + '>' + esc(selText(gr)) + '</b></p>'; };
    if (gr.type === 'range') return '<div class="cz-g' + dep + '" data-g="' + gr.id + '">' + head(true) + '<input class="rng" type="range" style="--p:' + ((cz[gr.id] - gr.min) / (gr.max - gr.min) * 100).toFixed(1) + '%" min="' + gr.min + '" max="' + gr.max + '" step="' + gr.inc + '" value="' + cz[gr.id] + '" data-r="' + gr.id + '" aria-label="' + esc(L(gr)) + '"><p class="rng__ends"><span>' + esc(czVal(gr, gr.min)) + '</span><span>' + esc(czVal(gr, gr.max)) + '</span></p></div>';
    var o = XC.opts(gr, cz), multi = gr.type === 'multi';
    if (box2 && o.length > 4 && gr.id !== '_cat' && gr.id !== '_sub') {   // 3 pilihan tampil (yang terpilih selalu ikut) + kartu "Lihat semua" yang membuka kotak samping
      var selIds = multi ? (cz[gr.id] || []) : [cz[gr.id]], show = o.slice(0, 3), si = o.filter(function (x) { return selIds.indexOf(x.id) >= 0; })[0];
      if (si && show.indexOf(si) < 0) show[2] = si;
      var arrow = czlNow() === 3 ? '→' : '←';   // kotak samping di kanan panel pada Layout III
      return '<div class="cz-g' + dep + '" data-g="' + gr.id + '"' + (multi ? ' data-multi' : '') + '>' + head() + '<div class="cz-grid">' +
        show.map(function (x) { return cell(gr, x, selIds.indexOf(x.id) >= 0, multi); }).join('') +
        '<button type="button" class="cz-o cz-card cz-more' + (czPick === gr.id ? ' is-on' : '') + '" data-pick="' + gr.id + '" title="' + esc(T('Lihat semua pilihan')) + '"><span class="cz-more__n">' + o.length + '</span><span class="cz-card__l"><span>' + esc(T('Lihat semua')) + ' ' + arrow + '</span></span></button></div></div>';
    }
    if (false) return '<button type="button" class="cz-row' + (czPick === gr.id ? ' is-on' : '') + '" data-pick="' + gr.id + '"><span>' + esc(L(gr)) + '</span><b>' + esc(selText(gr)) + '</b><svg><use href="#i-arrow"/></svg></button>';
    return '<div class="cz-g' + dep + '" data-g="' + gr.id + '"' + (multi ? ' data-multi' : '') + '>' + head() + '<div class="cz-grid">' +
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
    var h = '<div class="cz-g kx-lay" data-g="layout" data-layg>';
    // preset susunan
    var pr = KB.PRESETS[sub] || [], curJ = JSON.stringify(lay);
    if (pr.length) h += '<div data-lay-a="preset">' + H2({ l: 'Mulai dari preset susunan', en: 'Start from a layout preset' }) + '<div class="cz-grid">' + pr.map(function (p) {
      var cfg = { sub: sub, w: cz.w, h: cz.h, d: cz.d, mount: cz.mount, leg: cz.leg, top: cz.top, doorStyle: ds }, k2; for (k2 in p.dims || {}) cfg[k2] = p.dims[k2];
      cfg.layout = p.layout.map(function (q) { return KB.canonCol(q, sub); });
      return card('preset:' + p.id, KB.frontSVG(cfg, { base: sub === 'wall' ? 0 : 8 }), p.s || shortL(p), JSON.stringify(cfg.layout) === curJ, L(p));
    }).join('') + '</div></div>';
    h += '<p class="cz-g__h"><span>' + esc(L(gr)) + '</span><b>' + esc(n + ' ' + L({ l: 'kolom', en: n > 1 ? 'columns' : 'column' })) + '</b></p>' +
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
      czMark(); czTouched.bentuk = 1;
      if (key === 'cols') {
        if (+val > 0 && lay.length < (KB.MAXC[sub] || 6)) { var last = lay[lay.length - 1]; lay.push(KB.canonCol(JSON.parse(JSON.stringify(last)), sub)); czCol = lay.length - 1; }
        else if (+val < 0 && lay.length > 1) { lay.pop(); czCol = Math.min(czCol, lay.length - 1); }
      } else if (key === 'k') { lay[sel] = KB.newCol(val, sub, lay[sel].wr); reopen = true; }
      else if (key === 'preset') {
        var p = (KB.PRESETS[sub] || []).filter(function (x) { return x.id === val; })[0]; if (!p) return;
        for (var k2 in p.dims || {}) cz[k2] = p.dims[k2];
        lay = JSON.parse(JSON.stringify(p.layout)); czCol = 0;
        notice(T('Susunan diganti ke preset {x}', { x: L(p) }), czUndoAct());
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
      ['material', [['Kain / kulit', 'Fabric / leather'], ['uph', 'color', 'color2']],
                   [['Kayu & logam (kaki, rangka)', 'Wood & metal (legs, frame)'], ['frame', 'legFinish', 'wood', 'metal', 'footrestFinish']]],
      ['detail', [['Kaki, rangka & base', 'Legs, frame & base'], ['leg', 'legH', 'skirt', 'stretcher', 'footrest', 'swivel']],
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
  /* bahan yang dipakai bersama beberapa bagian: fungsi → bagian yang memakainya (urut), diletakkan di bawah pilihan
     bagian pertama & labelnya menyebut semua bagian — agar memilih "Kayu" di bawah Daun meja tidak diam-diam mengubah badan */
  var WOODISH = /^(wood|veneer)$/;
  var CZ_SHARED = {
    meja: {
      wood: function (c) { var p = []; if (WOODISH.test(c.topMat)) p.push('top'); if (c.baseMat === 'wood') p.push('kaki'); if (c.body === 'same' && !WOODISH.test(c.topMat)) p.push('badan'); return p; },
      stone: function (c) { return [c.topMat === 'stone' && 'top', c.baseMat === 'stone' && 'kaki', c.face === 'stone' && 'muka'].filter(Boolean); },
      panel: function (c) { return [/^(hpl|duco)$/.test(c.topMat) && 'top', c.body === 'paint' && 'badan'].filter(Boolean); }
    }
  };
  var CZ_PART = { top: ['top', 'top', 'topMat'], kaki: ['kaki', 'base', 'baseMat'], badan: ['badan & laci', 'body', 'body'], muka: ['muka laci', 'fronts', 'face'] };
  function czPresetGroups() { return XC.groups(cz).filter(function (g) { return g.preset && g.type !== 'range'; }); }
  function planOf(step) {
    if (step === 'jenis') return [{ title: null, groups: jenisGroups() }];
    var presets = czPresetGroups(), pIds = presets.map(function (g) { return g.id; });
    var out0 = planOf0(step).map(function (cl) { return { title: cl.title, groups: cl.groups.filter(function (g) { return pIds.indexOf(g.id) < 0; }) }; }).filter(function (cl) { return cl.groups.length; });
    // preset yang mengubah ukuran (kapasitas, tinggi meja, model gantung) → paling atas langkah Ukuran, sebelum slider
    if (step === 'ukuran' && presets.length) out0.unshift({ title: ['Mulai dari ukuran standar', 'Start from a standard size'], groups: presets });
    var sh = CZ_SHARED[cz.cat]; if (!sh || step !== 'material') return out0;
    var en = I18N && I18N.lang() === 'en';
    Object.keys(sh).forEach(function (id) {
      var parts = sh[id](cz), src = null;
      out0.forEach(function (cl) { cl.groups = cl.groups.filter(function (g) { if (g.id === id) { src = g; return false; } return true; }); });
      if (!src) return;
      var home = null;
      for (var i = 0; i < parts.length && !home; i++) out0.forEach(function (cl, ci) { cl.groups.forEach(function (g, gi) { if (!home && g.id === CZ_PART[parts[i]][2]) home = [ci, gi]; }); });
      var g2 = Object.create(src); g2.partsL = parts.map(function (p) { return CZ_PART[p][en ? 1 : 0]; });
      if (home) { var cl = out0[home[0]], at = home[1] + 1; while (cl.groups[at] && cl.groups[at].partsL) at++; cl.groups.splice(at, 0, g2); }
      else (out0[out0.length - 1] || (out0[0] = { title: null, groups: [] })).groups.push(g2);
    });
    return out0.filter(function (cl) { return cl.groups.length; });
  }
  function planOf0(step) {
    var catDef = XC.CATS.filter(function (x) { return x.id === cz.cat; })[0] || {}, plan = catDef.plan || CZ_PLAN[cz.cat], all = XC.groups(cz), used = {}, out = [];   // spec-*.js boleh membawa plan sendiri
    if (!plan) return [{ title: null, groups: XC.groups(cz, step) }];
    var byId = {}; all.forEach(function (g) { byId[g.id] = g; });
    plan.forEach(function (st) {
      st.slice(1).forEach(function (cl) { cl[1].forEach(function (id) { if (byId[id]) (used[id] = used[id] || []).push(st[0]); }); });
    });
    plan.forEach(function (st) {
      if (st[0] !== step) return;
      st.slice(1).forEach(function (cl) {
        var gs = cl[1].map(function (id) { return byId[id]; }).filter(function (g) { return g && (used[g.id].length < 2 || g.step === step); });   // id di dua langkah (mis. frame) → ikut step aslinya
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
        var lead = CZ_LEAD[cz.cat] || CZ_LEAD.kursi;
        inner = '<dl class="kv cz__sum">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') +
          '<dt>' + T('Estimasi produksi') + '</dt><dd>' + T('{a}–{b} hari kerja', { a: lead[0], b: lead[1] }) + '</dd><dt>' + T('Garansi') + '</dt><dd>' + T('3 tahun') + '</dd></dl>' +
          '<div class="row cz__qty"><span>' + T('Jumlah unit') + '</span><div class="stepper"><button type="button" data-czq="-1" aria-label="' + T('Kurangi') + '"><svg><use href="#i-minus"/></svg></button><span>' + (cz.qty || 1) + '</span><button type="button" data-czq="1" aria-label="' + T('Tambah') + '"><svg><use href="#i-plus"/></svg></button></div></div>' +
          '<div class="co-total" style="margin-bottom:16px"><button type="button" class="cz__price" data-breakdown><em>' + T('Harga final · rincian') + '</em><b>' + rupiah(czUnit()) + '</b></button><span class="note">' + T('Ongkir dihitung di checkout') + '</span></div>' +
          '<button class="btn btn--gold btn--full" type="button" data-cz-buy><svg><use href="#i-card"/></svg><span>' + T('Beli sekarang') + '</span></button>' +
          '<div class="btns"><button class="btn btn--line" type="button" data-cz-save><svg><use href="#i-heart"/></svg><span>' + T('Simpan') + '</span></button><button class="btn btn--line" type="button" data-send><svg><use href="#i-wa"/></svg><span>' + T('Tanya desainer') + '</span></button></div>';
      } else {
        var pl = planOf(st.id), en = I18N && I18N.lang() === 'en'; czPrev = [];
        inner = pl.length ? pl.map(function (cl) {
          var tt = cl.title && cl.title[en ? 1 : 0], nrm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
          if (tt && cl.groups.length === 1) { var a = nrm(tt), b = nrm(L(cl.groups[0])); if (a === b) tt = null; }   // judul = label satu-satunya grup
          return (tt ? '<p class="cz__sub">' + esc(tt) + '</p>' : '') + cl.groups.map(function (gr) {
            if (gr.id === '_cat' || gr.id === '_sub') { var save = cz[gr.id]; cz[gr.id] = _get(gr); var h = czGroup(gr, box2); if (save === undefined) delete cz[gr.id]; else cz[gr.id] = save; return h; }
            var h2 = czGroup(gr, box2); czPrev.push(gr); return h2;
          }).join('');
        }).join('') : '<p class="note">' + T('Tidak ada pilihan tambahan untuk jenis ini.') + '</p>';
      }
      return '<section class="cz__sec" data-sec="' + st.id + '" id="cz-' + st.id + '"><p class="cz__h"><i>' + String(i + 1).padStart(2, '0') + '</i>' + esc(L(st)) + '</p>' + inner + '</section>';
    }).join('');
  }
  function czRender(keepScroll) {
    var sc = $('#czScroll'), top = sc.scrollTop, base = $('#czBase'), lay = czLayout(), box2 = lay !== 'box1';
    html.classList.toggle('cz-box2', box2); html.classList.toggle('cz-box3', lay === 'box3');
    base.hidden = !czBase;
    base.innerHTML = czBase ? '<div class="cz__from"><p class="eyebrow">' + T('Custom dari') + '</p><b>' + esc(czBase.name) + '</b><span>' + esc(czBase.type) + '</span></div>' +
      '<div class="seg seg--sm"><button type="button" data-view="design" class="' + (czView === 'design' ? 'is-on' : '') + '">' + T('Rancangan 3D') + '</button><button type="button" data-view="product" class="' + (czView === 'product' ? 'is-on' : '') + '">' + T('Produk asli') + '</button></div>' +
      '<button class="cz__fresh" type="button" data-czfresh>' + T('Mulai dari nol') + '</button>' : '';
    var TAB_S = { material: ['Bahan', 'Finish'], detail: ['Detail', 'Detail'], kirim: ['Total', 'Total'] };
    $('#czTabs').innerHTML = XC.STEPS.map(function (st, i) { var sh = TAB_S[st.id], en = I18N && I18N.lang() === 'en'; return '<button type="button" data-tab="' + st.id + '" title="' + esc(L(st)) + '"><i>' + String(i + 1).padStart(2, '0') + '</i><span>' + esc(sh ? sh[en ? 1 : 0] : L(st)) + '</span></button>'; }).join('');
    czFoot(); czUnit0 = null;
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
    $$('#czTabs [data-tab]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === on); b.classList.toggle('is-done', !!czTouched[b.dataset.tab]); });
  }
  var czTouched = {};   // langkah yang sudah diubah pengguna (tanda di tab)
  function czTouch(id) { var gr = findGroup(id); var st = id === '_cat' || id === '_sub' ? 'jenis' : gr && (czPresetGroups().indexOf(gr) >= 0 ? 'ukuran' : gr.step); if (!st) return; czTouched[st] = 1; }
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
    czUnit0 = null;
    grid.innerHTML = XC.opts(gr, cz).map(function (x) { return cell(gr, x, multi ? (val || []).indexOf(x.id) >= 0 : x.id === val, multi); }).join('');
    czLazy(grid);
    if (!picker.classList.contains('is-on')) { picker.classList.add('is-on'); picker.setAttribute('aria-hidden', 'false'); insets(); }
  }
  function czPickerClose(silent) {
    if (!picker.classList.contains('is-on')) { czPick = silent ? czPick : null; return; }
    picker.classList.remove('is-on'); picker.setAttribute('aria-hidden', 'true');
    if (!silent) { czPick = null; $$('.cz-row, .cz-more').forEach(function (r) { r.classList.remove('is-on'); }); }
    insets();
  }
  picker.addEventListener('click', function (e) {
    if (e.target.closest('[data-pick-close]')) { czPickerClose(); return; }
    var b = e.target.closest('[data-v]'); if (b) czChoose($('#czPickGrid'), b.dataset.v);
  });

  /* ---------- memilih */
  /* ---------- URUNGKAN di Customize (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, klik kanan, tombol di notifikasi) */
  var czHist = { u: [], r: [] };
  function czMark() { var s = JSON.stringify(cz); if (czHist.u[czHist.u.length - 1] !== s) { czHist.u.push(s); if (czHist.u.length > 80) czHist.u.shift(); } czHist.r = []; }
  function czStep(back) {
    var from = back ? czHist.u : czHist.r, to = back ? czHist.r : czHist.u; if (!from.length) return false;
    to.push(JSON.stringify(cz)); cz = XC.normalize(JSON.parse(from.pop())); czSave(); czRender(true); czStage(); return true;
  }
  var czUndoAct = function () { return { t: T('Urungkan'), fn: function () { if (czStep(true)) notice(T('Diurungkan')); } }; };
  // rancangan sudah diubah dari bawaannya? (untuk peringatan saat ganti jenis)
  function czEdited(c) { try { var d = XC.defaults(c.cat, c.sub), a = JSON.parse(JSON.stringify(c)); delete a.qty; delete d.qty; return JSON.stringify(XC.normalize(a)) !== JSON.stringify(XC.normalize(d)); } catch (e) { return true; } }
  function czChoose(g, v) {
    var id = g.dataset.g;
    if (id === '_cat' || id === '_sub') {
      if ((id === '_cat' ? cz.cat : cz.sub) === v) return;
      var had = czEdited(cz); czMark(); czTouch(id);
      if (id === '_cat') { var c0 = XC.CATS.filter(function (c) { return c.id === v; })[0]; czReset(XC.defaults(c0.id, c0.subs[0].id)); }
      else czReset(XC.defaults(cz.cat, v));
      if (had) notice(T('Jenis diganti — rancangan sebelumnya bisa dikembalikan'), czUndoAct());
      return;
    }
    czMark(); czTouch(id);
    var gp = findGroup(id), before = gp && gp.preset ? Object.keys(gp.preset).map(function (d) { return cz[d]; }).join() : null;
    if (g.hasAttribute('data-multi')) { var arr = (cz[id] || []).slice(), i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); XC.apply(cz, id, arr); }
    else XC.apply(cz, id, v);
    if (before != null && Object.keys(gp.preset).map(function (d) { return cz[d]; }).join() !== before) notice(T('Ukuran disesuaikan ke {x}', { x: selText(gp) }), czUndoAct());
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
    if ((b = e.target.closest('[data-pick]'))) { var same = czPick === b.dataset.pick && picker.classList.contains('is-on'); if (same) { czPickerClose(); return; } czPick = b.dataset.pick; $$('.cz-row, .cz-more').forEach(function (r) { r.classList.toggle('is-on', r === b); }); czPickerFill(); return; }
    if (e.target.closest('[data-breakdown]')) { czBreakdown(); return; }
    if (e.target.closest('[data-send]')) { czSend(); return; }
    if (e.target.closest('[data-cz-buy]')) { czBuyNow(); return; }
    if ((b = e.target.closest('[data-czq]'))) { cz.qty = clamp((+cz.qty || 1) + (+b.dataset.czq), 1, 50); czSave(); czRender(true); return; }
    if (e.target.closest('[data-cz-save]')) { czSaveDesign(); return; }
    if ((b = e.target.closest('[data-lay]'))) { if (!b.disabled) czLayClick(b); return; }   // editor susunan kolom
    if ((b = e.target.closest('[data-v]')) && b.closest('[data-g]')) czChoose(b.closest('[data-g]'), b.dataset.v);
  });
  $('#czBody').addEventListener('input', function (e) {
    var r = e.target.closest('[data-r]'); if (!r) return;
    var gr = findGroup(r.dataset.r);
    if (!r.dataset.m) { czMark(); czTouch(r.dataset.r); r.dataset.m = '1'; }   // satu geser = satu langkah urungkan
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
    $$('#setCzl [data-czl]').forEach(function (b) { b.classList.toggle('is-on', +b.dataset.czl === czlNow()); });
    var hk = XW.human ? XW.human() : false; $$('#setHuman [data-hum]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.hum === String(hk || 0)); });
    $$('#setGfx [data-gfx]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.gfx === gfxNow()); });
    renderHd();
  }
  /* ---------- PERFORMA (Q2/Q5/Q7): grafis & paket HD ---------- */
  $('#setGfx').addEventListener('click', function (e) {
    var b = e.target.closest('[data-gfx]'); if (!b) return;
    store.set('xv5_gfx', b.dataset.gfx);
    var o = gfxOpts(b.dataset.gfx);
    if (XW.ok && XW.setQuality) { XW.setQuality(o.quality, !!o.qLock); XW.autoUp = o.autoUp || 0; }
    renderSettings();
  });
  var HD = { run: false, done: 0, total: 0, bytes: 0, all: 0 }, HD_CACHE = 'xv-assets-v1';
  function swReg() { return 'serviceWorker' in navigator ? navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () { return null; }) : Promise.resolve(null); }
  if (!LOCAL_HOST || store.get('xv5_hd', 0)) swReg();   // lokal (pengembangan): hanya bila paket HD dipakai, agar model baru langsung terlihat
  function renderHd() {
    var b = $('#setHd'), rm = $('#setHdRm'), bar = $('#setHdBar'); if (!b) return;
    var mb = function (n) { return (n / 1048576).toFixed(0) + ' MB'; }, at = store.get('xv5_hdAt', 0), pct = HD.total ? Math.round(HD.done / HD.total * 100) : 0;
    b.textContent = HD.run ? T('Jeda') + ' · ' + pct + '%' : HD.total && HD.done < HD.total ? T('Lanjutkan') + ' · ' + pct + '%' : at ? T('Tersimpan') + ' ✓' : T('Unduh') + (HD.all ? ' ' + mb(HD.all) : '');
    b.classList.toggle('is-on', !!at && !HD.run);
    rm.hidden = !(at || HD.done) || HD.run;
    bar.hidden = !HD.run && !(HD.total && HD.done < HD.total);
    $('i', bar).style.width = pct + '%';
  }
  function hdStart() {
    if (!('caches' in window)) { notice(T('Browser ini tidak mendukung penyimpanan offline')); return; }
    if (HD.run) { HD.run = false; renderHd(); return; }   // jeda
    HD.run = true; store.set('xv5_hd', 1); swReg(); renderHd();
    fetch('../assets/manifest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
      HD.total = m.files.length; HD.all = m.bytes; HD.done = 0; HD.bytes = 0;
      return caches.open(HD_CACHE).then(function (c) {
        var i = 0;
        var next = function () {
          if (!HD.run) return Promise.resolve();
          var f = m.files[i++]; if (!f) return Promise.resolve();
          var u = new URL('../' + f.p, location.href).href;
          return c.match(u).then(function (hit) { if (!hit) return fetch(u).then(function (r) { if (r.ok) return c.put(u, r); }); })
            .catch(function () {}).then(function () { HD.done++; HD.bytes += f.b; if (HD.done % 8 === 0 || HD.done === HD.total) renderHd(); return next(); });
        };
        return Promise.all([next(), next(), next()]);
      });
    }).then(function () {
      if (HD.run && HD.done >= HD.total) { HD.run = false; store.set('xv5_hdAt', Date.now()); notice(T('Paket HD tersimpan di perangkat')); }
      renderHd();
    }).catch(function () { HD.run = false; renderHd(); notice(T('Paket HD gagal diunduh — coba lagi')); });
  }
  $('#setHd').addEventListener('click', hdStart);
  $('#setHdRm').addEventListener('click', function () {
    HD.run = false; HD.done = HD.total = 0;
    (window.caches ? caches.delete(HD_CACHE) : Promise.resolve()).then(function () { store.set('xv5_hdAt', 0); store.set('xv5_hd', 0); renderHd(); notice(T('Paket HD dihapus dari perangkat')); });
  });
  $('#setCzl').addEventListener('click', function (e) { var b = e.target.closest('[data-czl]'); if (!b) return; store.set('xv5_czl', +b.dataset.czl); czPickerClose(); renderSettings(); insets(); });
  // manusia skala dari Pengaturan (tanpa klik kanan — juga untuk layar sentuh)
  $('#setHuman') && $('#setHuman').addEventListener('click', function (e) { var b = e.target.closest('[data-hum]'); if (!b || !XW.human) return; var k = b.dataset.hum === '0' ? false : b.dataset.hum; store.set('xv5_human', XW.human(k) || 0); renderSettings(); });
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
    if (stageKind === 'cubixcfg') { var ms = XW.measure && XW.measure(); return ms ? { w: ms.w, d: ms.d, h: ms.h, labels: lab, rows: [[lab.w, ms.w + ' cm'], [lab.d, ms.d + ' cm'], [lab.h, ms.h + ' cm']], title: T('Konfigurasi CUBIX') } : null; }
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
    var on = dimsOn() && /^(custom|cubix|cubixcfg|product)$/.test(stageKind) && !/^(manufaktur|galeri)$/.test(current);
    var ms = on && XW.measure ? XW.measure() : null;
    var sig = on ? stageKind + '|' + (stageKind === 'custom' ? JSON.stringify(cz) : stageKind === 'cubixcfg' ? JSON.stringify(cbx.mods) : furniture.p ? furniture.p.id : '') + '|' + (I18N ? I18N.lang() : '') + '|' + (ms ? ms.kind + ms.w : '') : '';
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
      if (raBox && raBox.classList.contains('is-on')) { raOpen(false); return; }
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
  try { gl = XW.init ? XW.init($('#world'), Object.assign({ mobile: isMobile() || !FINE, reduced: REDUCED }, gfxOpts(gfxNow()))) : false; } catch (err) { gl = false; }
  if (!gl || !XW.ok) html.classList.add('no-webgl');
  XW.onLost = function () { html.classList.add('no-webgl'); };
  if (XW.ok) { applyLighting(); if (themeNow() === 'light') XW.setTheme('light', 0); applyBg(); applyLook(); }
  // kayu koleksi global (Developer Settings › Kayu koleksi) — semua komponen berlabel gelap / terang / natural
  if (XW.ok && XW.setWood) fetch('../data/wood.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.classes) XW.setWood(j.classes); }).catch(function () {});
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
    // (Q3) pembuat model Customize diunduh di belakang layar setelah halaman siap
    setTimeout(function () { (window.requestIdleCallback || setTimeout)(function () { if (window.XNeedMaker) window.XNeedMaker(); }); }, SAVE_DATA ? 15000 : 5000);
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
