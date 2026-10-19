/* ==========================================================================
   XIONCO — Developer Settings › Foto referensi
   Semua foto setiap produk dari xionco.shop (galeri, foto tiap varian, gambar di deskripsi), disimpan lokal di
   data/source/shop-img/<id>/ oleh tools/shop-images.js — dipakai sebagai referensi saat membuat / memeriksa model 3D.
   Klik foto → buka ukuran penuh. "Perbarui dari xionco.shop" mengunduh foto yang belum ada (server lokal).
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'ref';
  var S = { idx: null, job: null, err: null, q: '', f: 'aktif', poll: 0 };
  var C;
  var ICON = '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/>';
  var BASE = 'data/source/shop-img/';
  var CSS = [
    '.rf-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }',
    '.rf-bar .in--search { flex: 0 1 260px; }',
    '.rf-p { border-top: 1px solid rgba(27,24,21,.08); padding: 14px 0; }',
    '.rf-p:first-child { border-top: 0; }',
    '.rf-h { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }',
    '.rf-h b { font: 500 13px var(--f); color: var(--tl); }',
    '.rf-h span { font: 400 11px var(--f); color: var(--tl3); }',
    '.rf-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }',
    '.rf-i { position: relative; display: block; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #fff; border: 1px solid var(--hair); }',
    '.rf-i img { width: 100%; height: 100%; object-fit: contain; display: block; }',
    '.rf-i em { position: absolute; left: 6px; bottom: 6px; max-width: calc(100% - 12px); padding: 2px 6px; border-radius: 6px; background: rgba(27,24,21,.72); color: #f6f1e8; font: 400 9.5px/1.3 var(--f); font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.rf-i.is-err { display: grid; place-items: center; color: var(--tl3); font: 400 10px var(--f); }',
    '.rf-note { font: 400 11.5px/1.5 var(--f); color: var(--tl2); margin: 0 0 12px; }'
  ].join('\n');
  function css() { var r = C && C.root; if (!r || r.querySelector('#rf-css')) return; var s = document.createElement('style'); s.id = 'rf-css'; s.textContent = CSS; r.appendChild(s); }
  function api(method, p, body) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/' + p, o).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  function load() {
    return api('GET', 'shopimg').then(function (r) {
      if (r.ok) { S.idx = r.index || { items: {} }; S.job = r.job; S.err = null; }
      else return fetch(C.ROOT + BASE + '_index.json', { cache: 'no-cache' }).then(function (x) { return x.ok ? x.json() : { items: {} }; }).catch(function () { return { items: {} }; }).then(function (j) { S.idx = j; S.err = r.error; });
    }).then(function () {
      if (C && C.shown(ID)) render(C); if (C) C.renderTabs();
      clearTimeout(S.poll); if (S.job && S.job.running) S.poll = setTimeout(load, 2000);   // pantau unduhan
    });
  }
  function list() {
    var q = S.q.trim().toLowerCase(), it = (S.idx && S.idx.items) || {};
    return Object.keys(it).map(function (id) { return Object.assign({ id: id }, it[id]); }).filter(function (p) {
      if (S.f === 'aktif' && p.status !== 'aktif') return false;
      if (S.f === 'lain' && p.status === 'aktif') return false;
      return !q || (p.id + ' ' + p.name + ' ' + p.type + ' ' + p.shopName).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }
  function render(ctx) {
    C = ctx; css();
    if (!S.idx) { C.head('Database', 'Foto referensi', 'Memuat…'); C.el.body.innerHTML = ''; load(); return; }
    var it = S.idx.items || {}, ids = Object.keys(it), nImg = ids.reduce(function (a, k) { return a + (it[k].images || []).length; }, 0);
    var j = S.job || {}, busy = !!j.running;
    C.head('Database · ' + ids.length + ' produk · ' + nImg + ' foto', 'Foto referensi',
      'Semua foto setiap produk dari xionco.shop (galeri, foto varian, gambar deskripsi) — referensi untuk membuat & memeriksa model 3D. Disimpan lokal di ' + BASE + ' (tidak ikut online).' + (S.idx.fetched ? ' Diperbarui ' + C.dt(S.idx.fetched) + '.' : ''),
      '<button class="btn btn--dark" type="button" data-act="rf-sync"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Mengunduh ' + j.done + '/' + j.total + '…' : 'Perbarui dari xionco.shop') + '</button>');
    var ls = list(), cnt = { aktif: 0, lain: 0 }; ids.forEach(function (k) { cnt[it[k].status === 'aktif' ? 'aktif' : 'lain']++; });
    var seg = [['aktif', 'Produk aktif', cnt.aktif], ['lain', 'Arsip / toko saja', cnt.lain], ['semua', 'Semua', ids.length]];
    var h = (S.err ? '<p class="pill pill--bad" style="margin-bottom:10px">' + C.esc(S.err) + '</p>' : '') +
      (j.fail ? '<p class="pill pill--warn" style="margin-bottom:10px">' + j.fail + ' foto gagal diunduh — klik Perbarui untuk mencoba lagi</p>' : '') +
      '<div class="rf-bar"><input class="in in--search" type="search" placeholder="Cari produk…" value="' + C.esc(S.q) + '" data-plug="' + ID + '" data-rfq="1">' +
      '<div class="seg">' + seg.map(function (o) { return '<button type="button" data-act="rf-f" data-v="' + o[0] + '"' + (S.f === o[0] ? ' class="is-on"' : '') + '>' + o[1] + ' ' + o[2] + '</button>'; }).join('') + '</div>' +
      '<span class="muted">' + ls.length + ' ditampilkan</span></div>' +
      '<p class="rf-note">Klik foto untuk membuka ukuran penuh. Label: galeri · varian (nama varian) · deskripsi.</p>' +
      (ls.length ? ls.map(function (p) {
        var ims = p.images || [];
        return '<div class="rf-p"><div class="rf-h"><b>' + C.esc(p.name) + '</b><span>' + C.esc(p.type || p.shopName || '') + ' · ' + C.esc(p.id) + ' · ' + ims.length + ' foto</span></div><div class="rf-g">' +
          ims.map(function (im) {
            var full = C.ROOT + BASE + p.id + '/' + im.f, th = C.ROOT + BASE + p.id + '/' + im.t, lab = im.kind + (im.label ? ' · ' + im.label : '');
            if (im.err) return '<span class="rf-i is-err" title="' + C.esc(im.url) + '">gagal: ' + C.esc(im.err) + '</span>';
            return '<a class="rf-i" href="' + C.esc(full) + '" target="_blank" rel="noopener" title="' + C.esc(lab + (im.w ? ' · ' + im.w + '×' + im.h + ' px' : '')) + '"><img src="' + C.esc(th) + '" alt="" loading="lazy"><em>' + C.esc(lab) + '</em></a>';
          }).join('') + '</div></div>';
      }).join('') : '<div class="empty">Belum ada foto — klik "Perbarui dari xionco.shop".</div>');
    var top = C.el.body.scrollTop; C.el.body.innerHTML = h; C.el.body.scrollTop = top;
  }
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act;
    if (a === 'rf-f') { S.f = t.dataset.v; render(C); return; }
    if (a === 'rf-sync') api('POST', 'shopimg/sync', {}).then(function (r) { if (!r.ok) C.toast(r.error || 'Gagal'); else C.toast('Mengunduh foto dari xionco.shop…'); load(); });
  }
  function input(t, e, ctx) {
    C = ctx;
    if (t.dataset.rfq) { S.q = t.value; clearTimeout(input.t); input.t = setTimeout(function () { render(C); var s = C.el.body.querySelector('[data-rfq]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 250); }
  }
  XVDevkit.add({
    id: ID, l: 'Foto referensi', icon: ICON, prefix: 'rf-',
    init: function (ctx) { C = ctx; },
    count: function () { return ''; },
    render: render, click: click, input: input
  });
})();
