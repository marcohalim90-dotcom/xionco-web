/* ==========================================================================
   XIONCO — Developer Settings › Ukuran & material
   Satu baris per produk (dan per ukuran / versi bila ada): W × D × H resmi (cm), material (rangka, pelapis
   kain/kulit, finishing, kaki/base), sumber data, ukuran model 3D (diukur otomatis dari GLB — tools/spec/measure.js),
   selisih, status, dan temuan. Disimpan ke data/specs.json (server lokal tools/serve.js).
   Baris yang belum pernah disimpan diusulkan otomatis dari data situs (kolom dims & varian ukuran) — tampil pudar.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'spec';
  var S = { specs: null, m3d: null, err: null, q: '', f: 'semua', edits: {}, busy: false };
  var C;
  var ICON = '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v3M11 7v4M15 7v3M19 7v2"/>';
  var MATS = [['frame', 'Rangka'], ['uph', 'Pelapis (kain/kulit)'], ['finish', 'Finishing'], ['legs', 'Kaki / base']];
  var NOSIZE = /packing|bulb|white|black|hitam|putih|abu|gold|silver|natural|warna|sakura|wave|pet friendly|fb black/i;
  var COLS = '230px minmax(980px, 1fr)';
  var ROWC = '112px 58px 58px 58px 112px 92px minmax(220px, 1fr) repeat(4, 112px) 104px 220px 26px';   // ukuran · 3D · status · temuan dulu, lalu material
  var CSS = [
    '.sp-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }',
    '.sp-bar .in--search { flex: 0 1 260px; }',
    '.sp-sum { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }',
    '.sp-wrap { overflow-x: auto; border: 1px solid var(--hair); border-radius: 16px; }',
    '.sp-t { min-width: 1680px; }',
    '.sp-p { display: grid; grid-template-columns: ' + COLS + '; border-top: 1px solid rgba(27,24,21,.08); }',
    '.sp-p:first-child { border-top: 0; }',
    '.sp-p.th { background: rgba(27,24,21,.04); position: sticky; top: 0; z-index: 2; }',
    '.sp-p > .prod { padding: 10px 14px; align-self: start; position: sticky; left: 0; background: var(--paper, #f6f1e8); z-index: 1; }',
    '.sp-p.th > span { padding: 12px 14px 10px; }',
    '.sp-r { display: grid; grid-template-columns: ' + ROWC + '; gap: 8px; align-items: center; padding: 6px 12px 6px 0; }',
    '.sp-r + .sp-r { border-top: 1px dashed rgba(27,24,21,.08); }',
    '.sp-r.th { padding-top: 12px; padding-bottom: 10px; }',
    '.th span { font: 400 9px/1.3 var(--fh); letter-spacing: .2em; text-transform: uppercase; color: var(--tl3); }',
    '.sp-r input { width: 100%; height: 30px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--hair); background: rgba(255,250,242,.5); font: 400 12px var(--f); color: var(--tl); outline: none; }',
    '.sp-r input:focus { border-color: var(--tl); background: #fffaf2; }',
    '.sp-r input.n { text-align: right; font-variant-numeric: tabular-nums; padding-right: 6px; }',
    '.sp-r.is-new input { border-style: dashed; color: var(--tl2); background: transparent; }',
    '.sp-r.is-new input:focus { border-style: solid; }',
    '.sp-3d { font: 400 11.5px/1.35 var(--f); font-variant-numeric: tabular-nums; color: var(--tl2); }',
    '.sp-3d small { display: block; color: var(--tl3); font-size: 10.5px; }',
    '.sp-d { font: 400 11px/1.4 var(--f); color: var(--tl2); }',
    '.sp-d b { font-weight: 500; color: var(--bad); }',
    '.sp-x { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: var(--tl3); }',
    '.sp-x:hover { background: rgba(27,24,21,.06); color: var(--bad); }',
    '.sp-x svg { width: 12px; height: 12px; }',
    '.sp-add { margin: 2px 0 8px; font: 400 9.5px/1 var(--fh); letter-spacing: .18em; text-transform: uppercase; color: var(--tl3); padding: 6px 0; }',
    '.sp-add:hover { color: var(--tl); }',
    '.sp-rows { min-width: 0; }',
    '.sp-note { font-size: 11px; color: var(--tl3); line-height: 1.5; margin: 0 0 12px; }'
  ].join('\n');
  function css() { var r = C && C.root; if (!r || r.querySelector('#sp-css')) return; var s = document.createElement('style'); s.id = 'sp-css'; s.textContent = CSS; r.appendChild(s); }
  function api(method, p, body) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/' + p, o).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  function load() {
    return api('GET', 'specs').then(function (r) {
      if (r.ok) { S.specs = r.specs || { items: {} }; S.m3d = r.m3d || { models: {} }; S.err = null; }
      else {   // tanpa server: baca file (hanya lihat)
        return Promise.all([fetch(C.ROOT + 'data/specs.json', { cache: 'no-cache' }).then(function (x) { return x.ok ? x.json() : { items: {} }; }).catch(function () { return { items: {} }; }),
          fetch(C.ROOT + 'data/specs-3d.json', { cache: 'no-cache' }).then(function (x) { return x.ok ? x.json() : { models: {} }; }).catch(function () { return { models: {} }; })])
          .then(function (a) { S.specs = a[0]; S.m3d = a[1]; S.err = r.error; });
      }
    }).then(function () { if (C && C.shown(ID)) render(C); if (C) C.renderTabs(); });
  }

  /* ---------- baris: tersimpan / diusulkan dari data situs ---------- */
  function parseDims(s) {
    var m = String(s || '').replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
    return m ? { w: +m[1], d: +m[2], h: +m[3] } : {};
  }
  function proposed(p) {
    var rows = [Object.assign({ k: 'Utama', src: p.dims ? 'Situs (dimensi)' : '' }, parseDims(p.dims))], seen = { utama: 1 };
    var add = function (l) { var k = String(l || '').trim(); if (!k || NOSIZE.test(k) || seen[k.toLowerCase()]) return; seen[k.toLowerCase()] = 1; rows.push({ k: k }); };
    (p.variants || []).forEach(function (v) {
      if (!v.hex && !/fabric|faux|leather/i.test(v.group || '') && !/^(terang|gelap)$/i.test(v.label)) add(v.label);
      (v.subs || []).forEach(function (x) { if (!x.hex) add(x.label); });
    });
    Object.keys(p.vmodels || {}).forEach(add);
    return rows;
  }
  function rowsOf(p) {
    if (S.edits[p.id]) return S.edits[p.id];
    var it = S.specs && S.specs.items && S.specs.items[p.id];
    return it && it.rows && it.rows.length ? it.rows : proposed(p).map(function (r) { r._new = 1; return r; });
  }
  function edit(p) { if (!S.edits[p.id]) S.edits[p.id] = rowsOf(p).map(function (r) { var o = Object.assign({}, r); return o; }); return S.edits[p.id]; }

  /* ---------- bandingkan dengan model 3D ---------- */
  function modelFor(p, r) { return r.k === 'Utama' ? p.model : p.vmodels && p.vmodels[r.k] || r.model || null; }
  function cmp(p, r) {
    var mf = modelFor(p, r), m = mf && S.m3d && S.m3d.models[mf];
    if (!mf) return { st: p.model ? 'other' : 'none', m: null };   // ukuran lain tanpa model sendiri: tidak dibandingkan
    if (!m) return { st: 'nom', m: null };
    if (!(r.w && r.d && r.h)) return { st: 'empty', m: m };
    var tol = function (a, b) { return Math.abs(a - b) <= Math.max(2, b * .03); };
    var okH = tol(m.h, r.h), ok = tol(m.w, r.w) && tol(m.d, r.d) && okH, sw = !ok && okH && tol(m.w, r.d) && tol(m.d, r.w);
    var dif = [];
    if (!sw) [['w', 'W (lebar)'], ['d', 'D (dalam)'], ['h', 'H (tinggi)']].forEach(function (a) { var k = a[0], d = Math.round((m[k] - r[k]) * 10) / 10; if (!tol(m[k], r[k])) dif.push(a[1] + ' 3D ' + (d > 0 ? '+' : '') + d + ' cm (' + m[k] + ' vs ' + r[k] + ')'); });
    if (!ok && r.ok3d) return { st: 'acc', m: m, auto: 'Diterima: ' + r.ok3d };   // selisih dijelaskan (bentuk / cara ukur), bukan model salah
    return { st: ok ? 'ok' : sw ? 'swap' : 'diff', m: m, auto: ok ? '' : sw ? 'Lebar & dalam model 3D tertukar (3D ' + m.w + ' × ' + m.d + ' vs ' + r.w + ' × ' + r.d + ')' : dif.join(' · ') };
  }
  var ST = { acc: ['Diterima', 'gold'], ok: ['Sesuai', 'ok'], diff: ['Beda', 'bad'], swap: ['W/D tertukar', 'warn'], empty: ['Belum diisi', 'gold'], none: ['Tanpa 3D', ''], other: ['', ''], nom: ['Belum diukur', 'warn'] };
  function prodStatus(p) {   // status produk = baris terburuk
    var order = ['diff', 'swap', 'nom', 'empty', 'acc', 'ok', 'other', 'none'], best = 'none';
    rowsOf(p).forEach(function (r) { var s = cmp(p, r).st; if (order.indexOf(s) < order.indexOf(best)) best = s; });
    return best;
  }
  function list() {
    var q = S.q.trim().toLowerCase();
    return C.products().filter(function (p) { return p.status === 'aktif'; }).filter(function (p) {
      if (q && (p.name + ' ' + p.type + ' ' + p.id).toLowerCase().indexOf(q) < 0) return false;
      if (S.f === 'semua') return true;
      var st = prodStatus(p);
      return S.f === 'beda' ? st === 'diff' || st === 'swap' : S.f === 'kosong' ? st === 'empty' || rowsOf(p).some(function (r) { return !(r.w && r.d && r.h); }) : S.f === 'tanpa' ? st === 'none' : st === 'ok' || st === 'acc';
    });
  }

  function cell(p, i, k, v, cls, ph) { return '<input class="' + (cls || '') + '" data-plug="' + ID + '" data-sp="' + C.esc(p.id) + '" data-i="' + i + '" data-k="' + k + '" value="' + C.esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + C.esc(ph) + '"' : '') + (cls === 'n' ? ' inputmode="decimal"' : '') + '>'; }
  function rowHtml(p, r, i) {
    var c = cmp(p, r), s = ST[c.st], m = c.m;
    return '<div class="sp-r' + (r._new ? ' is-new' : '') + '">' + cell(p, i, 'k', r.k, '', 'Ukuran / versi') + cell(p, i, 'w', r.w, 'n', 'W') + cell(p, i, 'd', r.d, 'n', 'D') + cell(p, i, 'h', r.h, 'n', 'H') +
      '<span class="sp-3d">' + (m ? m.w + ' × ' + m.d + ' × ' + m.h + '<small>' + C.esc(String(modelFor(p, r)).split('/').pop()) + '</small>' : c.st === 'none' || c.st === 'other' ? '—' : '<small>belum diukur</small>') + '</span>' +
      '<span>' + (s[0] ? '<span class="pill' + (s[1] ? ' pill--' + s[1] : '') + '">' + s[0] + '</span>' : '<span class="muted">—</span>') + '</span>' +
      '<span class="sp-d">' + (c.auto ? '<b>' + C.esc(c.auto) + '</b><br>' : '') + cell(p, i, 'note', r.note, '', 'Catatan temuan') + '</span>' +
      MATS.map(function (a) { return cell(p, i, a[0], r[a[0]], '', '—'); }).join('') + cell(p, i, 'src', r.src, '', 'Sumber') + cell(p, i, 'other', r.other, '', 'Detail (tinggi dudukan, area tidur, …)') +
      '<button class="sp-x" type="button" data-act="sp-del" data-sp="' + C.esc(p.id) + '" data-i="' + i + '" aria-label="Hapus baris">' + C.ic('close') + '</button></div>';
  }
  function render(ctx) {
    C = ctx; css();
    if (!S.specs) { C.head('Database', 'Ukuran & material', 'Memuat…'); C.el.body.innerHTML = ''; load(); return; }
    var all = C.products().filter(function (p) { return p.status === 'aktif'; }), cnt = { diff: 0, swap: 0, empty: 0, none: 0, ok: 0, acc: 0, nom: 0, other: 0 };
    all.forEach(function (p) { cnt[prodStatus(p)]++; });
    var dirty = Object.keys(S.edits).length, ls = list();
    C.head('Database · ' + all.length + ' produk', 'Ukuran & material',
      'Ukuran resmi (cm) & material tiap produk / ukuran, dibandingkan otomatis dengan model 3D (toleransi ±2 cm atau 3%). Baris pudar = usulan dari data situs, belum disimpan.' + (S.m3d && S.m3d.measured ? ' Model 3D diukur ' + C.dt(S.m3d.measured) + '.' : ''),
      '<button class="btn" type="button" data-act="sp-measure"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Mengukur…' : 'Ukur ulang model 3D') + '</button>' +
      '<button class="btn btn--dark" type="button" data-act="sp-save"' + (dirty ? '' : ' disabled') + '>' + (dirty ? 'Simpan (' + dirty + ' produk)' : 'Tersimpan') + '</button>');
    var seg = [['semua', 'Semua', all.length], ['beda', 'Beda', cnt.diff + cnt.swap], ['kosong', 'Belum diisi', cnt.empty], ['ok', 'Sesuai', cnt.ok + cnt.acc], ['tanpa', 'Tanpa 3D', cnt.none]];
    var h = (S.err ? '<p class="pill pill--bad" style="margin-bottom:10px">' + C.esc(S.err) + '</p>' : '') +
      '<div class="sp-bar"><input class="in in--search" type="search" placeholder="Cari produk…" value="' + C.esc(S.q) + '" data-plug="' + ID + '" data-spq="1">' +
      '<div class="seg">' + seg.map(function (o) { return '<button type="button" data-act="sp-f" data-v="' + o[0] + '"' + (S.f === o[0] ? ' class="is-on"' : '') + '>' + o[1] + ' ' + o[2] + '</button>'; }).join('') + '</div>' +
      '<span class="muted">' + ls.length + ' ditampilkan</span></div>' +
      '<p class="sp-note">W = lebar · D = dalam · H = tinggi (cm). Kolom 3D = ukuran model di panggung. Baris "Utama" dibandingkan dengan model utama; baris ukuran lain dibandingkan bila punya model sendiri (mis. VERK Laci). Temuan otomatis tampil merah; catatan bisa ditulis di bawahnya.</p>' +
      '<div class="sp-wrap"><div class="sp-t"><div class="sp-p th"><span>Produk</span><div class="sp-r th"><span>Ukuran / versi</span><span>W</span><span>D</span><span>H</span><span>Model 3D</span><span>Status</span><span>Temuan</span>' + MATS.map(function (a) { return '<span>' + a[1] + '</span>'; }).join('') + '<span>Sumber</span><span>Detail ukuran</span><span></span></div></div>' +
      (ls.length ? ls.map(function (p) {
        return '<div class="sp-p" data-pid="' + C.esc(p.id) + '"><div class="prod"><div class="thumb"><img class="is-photo" src="' + C.esc(C.imgSrc(p.img, 120)) + '" alt="" loading="lazy"></div><div><b>' + C.esc(p.name) + '</b><span>' + C.esc(p.type) + '</span></div></div>' +
          '<div class="sp-rows">' + rowsOf(p).map(function (r, i) { return rowHtml(p, r, i); }).join('') + '<button class="sp-add" type="button" data-act="sp-add" data-sp="' + C.esc(p.id) + '">+ Baris ukuran</button></div></div>';
      }).join('') : '<div class="empty">Tidak ada produk yang cocok.</div>') + '</div></div>';
    var top = C.el.body.scrollTop, wrap = C.el.body.querySelector('.sp-wrap'), left = wrap ? wrap.scrollLeft : 0;
    C.el.body.innerHTML = h; C.el.body.scrollTop = top;
    wrap = C.el.body.querySelector('.sp-wrap'); if (wrap) wrap.scrollLeft = left;
  }
  function byPid(id) { return C.products().filter(function (p) { return p.id === id; })[0]; }
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act;
    if (a === 'sp-f') { S.f = t.dataset.v; render(C); return; }
    if (a === 'sp-add') { var p = byPid(t.dataset.sp); if (p) { edit(p).push({ k: '' }); render(C); } return; }
    if (a === 'sp-del') { var q = byPid(t.dataset.sp); if (q) { edit(q).splice(+t.dataset.i, 1); render(C); } return; }
    if (a === 'sp-measure') {
      S.busy = true; render(C);
      api('POST', 'specs/measure').then(function (r) { S.busy = false; if (r.ok) { S.m3d = r.m3d; C.toast(r.n + ' model 3D diukur' + (r.bad && r.bad.length ? ' · ' + r.bad.length + ' gagal' : '')); } else C.toast(r.error || 'Gagal mengukur'); render(C); C.renderTabs(); });
      return;
    }
    if (a === 'sp-save') {
      var items = {};
      Object.keys(S.edits).forEach(function (id) {
        var p = byPid(id);
        items[id] = { rows: S.edits[id].filter(function (r) { return r.k || r.w || r.d || r.h; }).map(function (r) { var o = Object.assign({}, r); delete o._new; var c = p ? cmp(p, o) : {}; if (c.auto) o.auto = c.auto; else delete o.auto; return o; }) };
      });
      api('PUT', 'specs', { items: items }).then(function (r) {
        if (!r.ok) { C.toast(r.error || 'Gagal menyimpan'); return; }
        S.specs = r.specs; S.edits = {}; C.toast('Tersimpan ke data/specs.json'); render(C); C.renderTabs();
      });
    }
  }
  function input(t, e, ctx) {
    C = ctx;
    if (t.dataset.spq) { S.q = t.value; clearTimeout(input.t); input.t = setTimeout(function () { render(C); var s = C.el.body.querySelector('[data-spq]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 250); return; }
    var p = byPid(t.dataset.sp); if (!p) return;
    var rows = edit(p), r = rows[+t.dataset.i]; if (!r) return;
    delete r._new; r[t.dataset.k] = /^[wdh]$/.test(t.dataset.k) ? (parseFloat(t.value.replace(',', '.')) || '') : t.value;
    var b = C.root.querySelector('[data-act="sp-save"]'); if (b) { b.disabled = false; b.textContent = 'Simpan (' + Object.keys(S.edits).length + ' produk)'; }
  }
  function change(t, e, ctx) { C = ctx; if (/^[wdhk]$/.test(t.dataset.k || '')) render(C); }   // ukuran berubah → status & temuan dihitung ulang
  XVDevkit.add({
    id: ID, l: 'Ukuran & material', icon: ICON, prefix: 'sp-',
    init: function (ctx) { C = ctx; },
    count: function (ctx) { C = ctx; if (!S.specs) return ''; var n = 0; ctx.products().forEach(function (p) { if (p.status === 'aktif') { var s = prodStatus(p); if (s === 'diff' || s === 'swap') n++; } }); return n || ''; },
    render: render, click: click, input: input, change: change
  });
})();
