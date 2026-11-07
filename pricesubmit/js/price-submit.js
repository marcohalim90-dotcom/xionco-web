/* ==========================================================================
   XIONCO · /pricesubmit — kotak isi harga tim (C111)
   Salinan Customize khusus tim: klik kartu mana pun (2 seats, Straight, L-left, Track, warna, kaki, kolom kabinet, …)
   → kotak di atas kotak deskripsi & harga: selisih harga (Rp; 0 = sama, + = tambah biaya, − = lebih murah) + catatan.
   Kartu khusus: kategori / jenis = harga dasar jenis itu; geser ukuran = harga per +10 cm.
   Simpan → POST /api/prices (worker/index.js → Cloudflare D1). Isian terakhir tiap kartu dimuat lagi saat dibuka;
   kartu yang sudah diisi diberi tanda. Tidak mengubah harga situs — tim mengisi, Claude meringkas & menerapkan.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XV_PRICE) return;
  // app.js bisa selesai dimuat setelah berkas ini (data katalog async): tunggu penghubung XVPS & XC
  function init() {
  var API = '/api/prices', XC = window.XC, P = window.XVPS, L = P.L;
  var T = function (s, v) { return P.T(s, v); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rp = function (n) { return (n < 0 ? '−' : n > 0 ? '+' : '') + P.rupiah(Math.abs(n)); };
  var clone = function (c) { return JSON.parse(JSON.stringify(c)); };
  var keyOf = function (k) { return [k.grp, k.opt, k.ctx || ''].join('|'); };
  var subOf = function (c) { return c.cat + '.' + c.sub; };

  var LAY = { 'lay.preset': 'Preset susunan', 'lay.k': 'Isi kolom', 'lay.n': 'Jumlah di kolom', 'lay.sh': 'Rak di kolom', 'lay.pos': 'Posisi di kolom', 'lay.hd': 'Handle kolom', 'lay.ac': 'Aksesori kolom' };
  var cur = null;          // kartu yang sedang diisi { sub, grp, opt, ctx, label, gl, site }
  var saved = {}, savedSub = '', loading = null;
  var NAME_K = 'ps_name';

  /* ---------- kotak ---------- */
  var box = document.createElement('section');
  box.className = 'psbox'; box.id = 'psBox'; box.setAttribute('aria-hidden', 'true'); box.setAttribute('aria-label', T('Isi harga'));
  box.innerHTML =
    '<div class="psbox__k"><p class="psbox__e" id="psE"></p><p class="psbox__t" id="psT"></p><p class="psbox__s" id="psS"></p></div>' +
    '<label class="psbox__f psbox__f--p"><span>' + esc(T('Selisih harga (Rp)')) + '</span><input id="psP" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><em>' + esc(T('0 = sama · + tambah · − kurang')) + '</em></label>' +
    '<label class="psbox__f psbox__f--n"><span>' + esc(T('Catatan')) + '</span><textarea id="psN" rows="2" placeholder="' + esc(T('Hal khusus, bahan, waktu produksi…')) + '"></textarea></label>' +
    '<label class="psbox__f psbox__f--w"><span>' + esc(T('Nama')) + '</span><input id="psW" type="text" autocomplete="name" maxlength="60" placeholder="' + esc(T('Opsional')) + '"></label>' +
    '<div class="psbox__a"><button type="button" class="btn btn--gold" id="psSave"><span>' + esc(T('Simpan')) + '</span></button><p class="psbox__st" id="psSt" aria-live="polite"></p></div>' +
    '<button type="button" class="psbox__x" id="psX" aria-label="' + esc(T('Tutup')) + '"><svg><use href="#i-close"/></svg></button>';
  document.body.appendChild(box);
  var inP = $('#psP'), inN = $('#psN'), inW = $('#psW'), stEl = $('#psSt'), saveBtn = $('#psSave');
  try { inW.value = localStorage.getItem(NAME_K) || ''; } catch (e) {}

  // angka: titik ribuan, boleh minus
  function parseRp(t) { t = String(t || '').replace(/[−–]/g, '-').replace(/[^\d-]/g, ''); var neg = /^-/.test(t); t = t.replace(/-/g, ''); if (!t) return neg ? '-' : ''; var n = parseInt(t, 10); return neg ? -n : n; }
  function fmtRp(v) { if (v === '' || v === '-') return v; return (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('id-ID'); }
  inP.addEventListener('input', function () { var v = parseRp(inP.value); inP.value = fmtRp(v); dirty(); });
  inN.addEventListener('input', dirty);
  inW.addEventListener('change', function () { try { localStorage.setItem(NAME_K, inW.value.trim()); } catch (e) {} });
  function dirty() { if (!cur) return; stEl.textContent = T('Belum disimpan'); stEl.className = 'psbox__st is-dirty'; }

  /* ---------- posisi: tepat di atas kotak deskripsi & harga (desktop) · di bawahnya bila kotak itu di atas (ponsel) ---------- */
  var det = $('#detail');
  function place() {
    if (!cur) return;
    var r = det && det.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, gap = 10;
    if (!r || !r.width) { box.style.transform = 'translate3d(16px,' + (vh - box.offsetHeight - 16) + 'px,0)'; return; }
    var w = Math.min(Math.max(r.width, 320), vw - 24), x = Math.max(12, Math.min(vw - w - 12, r.left + (r.width - w) / 2));
    box.style.width = w + 'px';
    if (box.classList.contains('is-narrow') !== (w < 680)) box.classList.toggle('is-narrow', w < 680);   // kotak deskripsi menyempit saat kotak "Lihat semua" terbuka → isi kotak harga 2 kolom
    var above = r.top + r.height / 2 > vh / 2, y0 = above ? 8 : r.bottom + gap, lim = above ? r.top - gap - 8 : vh - y0 - 8;
    var pn = document.getElementById('panel'), pr = pn && pn.getBoundingClientRect();   // ponsel: lembar Customize di bawah — kotak berhenti di atasnya
    if (!above && pr && pr.height && pr.top > y0 + 120) lim = Math.min(lim, pr.top - y0 - 8);
    box.style.maxHeight = Math.max(160, lim) + 'px';
    var h = box.offsetHeight, y = above ? r.top - h - gap : y0;
    box.style.transform = 'translate3d(' + x.toFixed(0) + 'px,' + Math.max(8, y).toFixed(0) + 'px,0)';
  }
  var placeT = 0;
  function loop() { if (!cur) { placeT = 0; return; } place(); placeT = setTimeout(loop, 250); }
  addEventListener('resize', place);

  /* ---------- harga situs sekarang (pembanding): selisih estimasi dengan pilihan standar jenis itu ---------- */
  function est(c) { try { return XC.estimate(XC.normalize(c)); } catch (e) { return null; } }
  function siteDiff(k, c) {
    try {
      if (k.grp === 'base') return est(XC.defaults(c.cat, c.sub));
      if (/^lay\./.test(k.grp)) return null;
      var d = XC.defaults(c.cat, c.sub), c0 = clone(c), c1 = clone(c);
      if (k.grp.indexOf('size.') === 0) { var g = k.grp.slice(5); c0[g] = d[g]; c1[g] = (+d[g] || 0) + 10; var a = est(c0), b = est(c1); return a == null || b == null ? null : b - a; }
      if (Array.isArray(c[k.grp])) {
        c0[k.grp] = (c[k.grp] || []).filter(function (x) { return x !== k.opt; });
        c1[k.grp] = c0[k.grp].concat([k.opt]);
      } else {
        var dv = k.grp === 'color' ? (XC.defaults(c.cat, c.sub).uph === c.uph ? d.color : null) : d[k.grp];
        if (dv == null) { var gr = group(c, k.grp), os = gr ? XC.opts(gr, c) : []; dv = os[0] && os[0].id; }
        XC.apply(c0, k.grp, dv); XC.apply(c1, k.grp, k.opt);
      }
      var e0 = est(c0), e1 = est(c1);
      return e0 == null || e1 == null ? null : e1 - e0;
    } catch (e) { return null; }
  }
  function group(c, id) { try { return XC.sub(c).groups.filter(function (g) { return g.id === id; })[0] || null; } catch (e) { return null; } }

  /* ---------- buka kartu ---------- */
  function openCard(k) {
    var c = P.cz(); if (!c) return;
    k.sub = subOf(c); k.site = siteDiff(k, c);
    cur = k;
    $('#psE').textContent = T('Isi harga') + ' · ' + L(XC.sub(c));
    $('#psT').textContent = k.label;
    $('#psS').textContent = k.site == null ? T('Situs sekarang: —') : T('Situs sekarang: {v}', { v: k.grp === 'base' ? P.rupiah(k.site) : rp(k.site) });
    inP.value = ''; inN.value = ''; stEl.textContent = ''; stEl.className = 'psbox__st';
    $('.psbox__f--p span').textContent = k.grp === 'base' ? T('Harga dasar (Rp)') : k.grp.indexOf('size.') === 0 ? T('Selisih per +10 cm (Rp)') : T('Selisih harga (Rp)');
    box.classList.add('is-on'); box.setAttribute('aria-hidden', 'false');
    if (!placeT) loop(); place();
    load(k.sub).then(function () { if (cur === k) fill(k); });
  }
  function fill(k) {
    var r = saved[keyOf(k)];
    if (r) {
      inP.value = fmtRp(r.price); inN.value = r.note || '';
      stEl.textContent = T('Tersimpan {d}', { d: when(r.created_at) }) + (r.name ? ' · ' + r.name : ''); stEl.className = 'psbox__st is-ok';
    } else { stEl.textContent = T('Belum diisi'); stEl.className = 'psbox__st'; }
  }
  function when(iso) { try { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }
  function close() { cur = null; box.classList.remove('is-on'); box.setAttribute('aria-hidden', 'true'); }
  $('#psX').addEventListener('click', close);

  /* ---------- simpan ---------- */
  saveBtn.addEventListener('click', function () {
    if (!cur) return;
    var v = parseRp(inP.value);
    if (v === '' || v === '-') { stEl.textContent = T('Isi angka dulu (0 bila sama)'); stEl.className = 'psbox__st is-err'; inP.focus(); return; }
    var k = cur, name = inW.value.trim();
    try { localStorage.setItem(NAME_K, name); } catch (e) {}
    saveBtn.disabled = true; stEl.textContent = T('Menyimpan…'); stEl.className = 'psbox__st';
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sub: k.sub, grp: k.grp, opt: k.opt, ctx: k.ctx || '', price: v, note: inN.value.trim(), name: name, label: k.label, site: k.site }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error(j && j.error || 'gagal');
        saved[keyOf(k)] = j.row; mark();
        if (cur === k) fill(k);
      })
      .catch(function () { if (cur === k) { stEl.textContent = T('Gagal menyimpan — coba lagi'); stEl.className = 'psbox__st is-err'; } })
      .then(function () { saveBtn.disabled = false; });
  });

  /* ---------- isian tersimpan per jenis + tanda di kartu ---------- */
  function load(sub) {
    if (sub === savedSub && !loading) return Promise.resolve();
    if (loading && loading.sub === sub) return loading;
    var pr = fetch(API + '?sub=' + encodeURIComponent(sub), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (savedSub !== sub) saved = {};
      savedSub = sub;
      (j && j.rows || []).forEach(function (r) { saved[keyOf({ grp: r.grp, opt: r.opt, ctx: r.ctx })] = r; });
      mark();
    }).catch(function () { savedSub = sub; }).then(function () { loading = null; });
    loading = pr; pr.sub = sub;
    return pr;
  }
  // kunci kartu dari atributnya (dibaca saat klik: kotak "Lihat semua" menggambar ulang isinya sesudah memilih, kartu lama lepas dari halaman)
  function cardInfo(el) { var g = el.closest('[data-g]'); return { lay: el.getAttribute('data-lay'), gid: g && g.getAttribute('data-g'), v: el.getAttribute('data-v'), title: el.getAttribute('title') }; }
  function keyFrom(f, c) {
    if (f.lay) { var m = f.lay.split(':'); return m.length === 2 && !/^(col|cols|wr)$/.test(m[0]) ? { grp: 'lay.' + m[0], opt: m[1] } : null; }   // pilih kolom / tambah-kurang kolom / lebar = navigasi, bukan harga
    if (!f.gid || f.v == null || f.gid === '_cat' || f.gid === '_sub') return null;
    return { grp: f.gid, opt: f.v, ctx: f.gid === 'color' ? c.uph : '' };
  }
  function cardKey(el, c) { return keyFrom(cardInfo(el), c); }
  function mark() {
    var c = P.cz(); if (!c || subOf(c) !== savedSub) return;
    document.querySelectorAll('.cz-card, .cz-o').forEach(function (el) {
      var k = cardKey(el, c), on = !!(k && saved[keyOf(k)]);
      if (el.classList.contains('ps-done') !== on) el.classList.toggle('ps-done', on);
    });
    var bb = $('#psBase'); if (bb) bb.classList.toggle('ps-done', !!saved[keyOf({ grp: 'base', opt: 'base' })]);
  }

  /* ---------- klik kartu ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#psBox')) return;
    var el = e.target.closest('.cz-card, .cz-o, [data-lay]');
    if (!el || el.hasAttribute('data-pick') || el.hasAttribute('data-exp') || !el.closest('#panel, #czPicker, .picker, .cz')) return;
    var f = cardInfo(el);   // sekarang, sebelum Customize menggambar ulang kartunya
    setTimeout(function () {   // pilihan diterapkan dulu oleh Customize, lalu kotak dibuka
      var c = P.cz(); if (!c) return;
      if (f.gid === '_cat' || f.gid === '_sub') { openBase(); return; }
      var k = keyFrom(f, c); if (!k) return;
      var gr = /^lay\./.test(k.grp) ? null : group(c, k.grp), o = gr ? XC.opts(gr, c).filter(function (x) { return String(x.id) === String(k.opt); })[0] : null;
      k.label = gr ? L(gr) + ' · ' + (o ? L(o) : k.opt) : (LAY[k.grp] ? T(LAY[k.grp]) + ' · ' : '') + (f.title || k.opt);
      openCard(k);
    }, 0);
  }, true);
  // geser ukuran → harga per +10 cm
  document.addEventListener('change', function (e) {
    var r = e.target.closest && e.target.closest('input[data-r]'); if (!r) return;
    var c = P.cz(), gr = group(c, r.dataset.r);
    openCard({ grp: 'size.' + r.dataset.r, opt: '10cm', label: T('Ukuran') + ' · ' + (gr ? L(gr) : r.dataset.r) + ' · ' + T('per +10 cm') });
  }, true);
  function openBase() { var c = P.cz(); openCard({ grp: 'base', opt: 'base', label: T('Harga dasar') + ' · ' + P.title(c) + ' · ' + T('ukuran & pilihan standar') }); }

  // tombol "Harga dasar jenis ini" di kepala panel + muat isian saat jenis berganti
  function baseBtn() {
    if ($('#psBase')) return;
    var hd = $('#czBody') || $('#panel'); if (!hd) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'psBase'; b.className = 'psbase';
    b.innerHTML = '<span>' + esc(T('Harga dasar jenis ini')) + '</span><svg><use href="#i-arrow"/></svg>';
    b.addEventListener('click', openBase);
    hd.parentNode.insertBefore(b, hd);
  }
  var lastSub = '';
  var moT = 0;
  var mo = new MutationObserver(function () { if (!moT) moT = setTimeout(sync, 120); });
  function sync() {
    moT = 0; var c = P.cz(); if (!c) return;
    baseBtn();
    var s = subOf(c);
    if (s !== lastSub) { lastSub = s; if (cur && cur.sub !== s) close(); load(s); }
    else mark();
  }
  mo.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur && !e.target.closest('#psBox')) close(); });
  }
  (function wait(n) { if (window.XVPS && window.XC) init(); else if (n < 300) setTimeout(function () { wait(n + 1); }, 100); })(0);
})();
