/* ==========================================================================
   XIONCO — Developer Settings › Aset material (review sebelum dipakai)
   Katalog material & tekstur CC0 (Poly Haven, ambientCG). Acc → tekstur diunduh & diproses ke
   assets/library/textures/x-<kelompok>-<nama>/ (lihat tools/staging.js). Tolak → tidak diunduh.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'materials';
  var GROUPS = [['semua', 'Semua'], ['kain', 'Kain'], ['kulit', 'Kulit'], ['kayu', 'Kayu'], ['batu', 'Batu & marmer'], ['logam', 'Logam'], ['tembok', 'Tembok'], ['lantai', 'Lantai'], ['anyaman', 'Anyaman']];
  var STATUS = [['baru', 'Belum direview'], ['acc', 'Acc'], ['tolak', 'Tolak'], ['semua', 'Semua']];
  var S = { items: null, err: null, g: 'semua', st: 'baru', src: 'semua', q: '', n: 120, busy: false, scanned: 0 };
  var C, poll = 0;
  var ICON = '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M13 16.5h7M16.5 13v7"/>';
  var CSS = [
    '.mt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }',
    '.mt-card { position: relative; border-radius: 12px; overflow: hidden; background: #fffaf2; border: 1px solid rgba(27,24,21,.1); display: flex; flex-direction: column; }',
    '.mt-card.is-acc { border-color: #6f8f5a; box-shadow: 0 0 0 2px rgba(111,143,90,.25); } .mt-card.is-tolak { opacity: .45; } .mt-card.is-proses { border-color: #bfa274; }',
    '.mt-card .mt-img { display: block; aspect-ratio: 1; background: #e9e2d6 center/cover no-repeat; }',
    '.mt-card .mt-img img { width: 100%; height: 100%; object-fit: cover; display: block; }',
    '.mt-meta { padding: 8px 9px 4px; font-size: 11px; line-height: 1.35; } .mt-meta b { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .mt-meta span { color: #8a8174; }',
    '.mt-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px 9px 9px; }',
    '.mt-acts button { height: 28px; border-radius: 8px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; border: 1px solid rgba(27,24,21,.16); background: transparent; cursor: pointer; }',
    '.mt-acts .is-acc { background: #6f8f5a; border-color: #6f8f5a; color: #fff; } .mt-acts .is-tolak { background: #8a4a2e; border-color: #8a4a2e; color: #fff; }',
    '.mt-badge { position: absolute; left: 8px; top: 8px; padding: 3px 7px; border-radius: 6px; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; background: rgba(255,250,242,.9); }',
    '.mt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; } .mt-chips button { padding: 6px 11px; border-radius: 999px; border: 1px solid rgba(27,24,21,.16); background: transparent; font-size: 11px; cursor: pointer; }',
    '.mt-chips button.is-on { background: #1b1815; color: #f4efe6; border-color: #1b1815; } .mt-chips button b { font-weight: 500; opacity: .6; margin-left: 4px; }',
    '.mt-more { display: flex; justify-content: center; margin: 16px 0; }'
  ].join('\n');
  function css() { var r = C && C.root; if (!r || r.querySelector('#mt-css')) return; var s = document.createElement('style'); s.id = 'mt-css'; s.textContent = CSS; r.appendChild(s); }
  function api(method, p, body) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/' + p, o).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }); })
      .catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  function load() {
    S.busy = true;
    return api('GET', 'staging').then(function (r) { S.busy = false; S.items = r.ok ? r.items : (S.items || []); S.err = r.ok ? null : r.error; S.scanned = r.scanned || 0; if (C && C.shown(ID)) render(C); schedule(); });
  }
  function schedule() {   // selama ada yang diproses: segarkan tiap 3 dtk
    clearTimeout(poll);
    if ((S.items || []).some(function (x) { return x.status === 'proses'; })) poll = setTimeout(function () { if (C && C.shown(ID)) load(); else schedule(); }, 3000);
  }
  function list() {
    var q = S.q.trim().toLowerCase();
    return (S.items || []).filter(function (x) {
      if (S.g !== 'semua' && x.group !== S.g) return false;
      if (S.src !== 'semua' && x.src !== S.src) return false;
      if (S.st === 'baru' && x.status !== 'baru') return false;
      if (S.st === 'acc' && !/acc|proses|gagal/.test(x.status)) return false;
      if (S.st === 'tolak' && x.status !== 'tolak') return false;
      if (q && (x.name + ' ' + x.id + ' ' + (x.tags || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function count(k, v) { return (S.items || []).filter(function (x) { return k === 'g' ? (v === 'semua' || x.group === v) && (S.st === 'semua' || (S.st === 'acc' ? /acc|proses|gagal/.test(x.status) : x.status === S.st)) : (v === 'semua' || (v === 'acc' ? /acc|proses|gagal/.test(x.status) : x.status === v)); }).length; }
  function card(x) {
    var st = x.status;
    return '<div class="mt-card is-' + st + '" data-mt-card="' + C.esc(x.id) + '">' +
      '<a class="mt-img" href="' + C.esc(x.page) + '" target="_blank" rel="noopener" title="Buka halaman sumber"><img src="' + C.esc(x.thumb) + '" alt="" loading="lazy"></a>' +
      '<span class="mt-badge">' + (st === 'proses' ? 'Mengunduh…' : st === 'gagal' ? 'Gagal' : st === 'acc' ? 'Acc' : st === 'tolak' ? 'Tolak' : C.esc(x.group)) + '</span>' +
      '<div class="mt-meta"><b title="' + C.esc(x.name) + '">' + C.esc(x.name) + '</b><span>' + C.esc(x.src) + ' · ' + Math.round(x.size[0] * 100) + ' × ' + Math.round(x.size[1] * 100) + ' cm</span>' + (x.error ? '<br><span style="color:#8a4a2e">' + C.esc(x.error) + '</span>' : '') + '</div>' +
      '<div class="mt-acts"><button type="button" class="' + (st === 'acc' || st === 'proses' ? 'is-acc' : '') + '" data-act="mt-set" data-id="' + C.esc(x.id) + '" data-v="' + (st === 'acc' ? 'baru' : 'acc') + '">' + (st === 'acc' ? '✓ Acc' : 'Acc') + '</button>' +
      '<button type="button" class="' + (st === 'tolak' ? 'is-tolak' : '') + '" data-act="mt-set" data-id="' + C.esc(x.id) + '" data-v="' + (st === 'tolak' ? 'baru' : 'tolak') + '">' + (st === 'tolak' ? '✕ Tolak' : 'Tolak') + '</button></div></div>';
  }
  function render(ctx) {
    C = ctx; css();
    if (S.items == null && !S.busy) load();
    var all = S.items || [], L = list();
    C.head('09 · Review aset', 'Aset material', all.length ? all.length + ' material & tekstur CC0 dari Poly Haven dan ambientCG · ' + count('s', 'acc') + ' Acc · ' + count('s', 'tolak') + ' Tolak · ' + count('s', 'baru') + ' belum direview. Acc = tekstur diunduh & masuk pustaka; Tolak = tidak dipakai.' : 'Mengambil katalog Poly Haven & ambientCG… (sekali saja, ±20 detik)',
      '<button class="btn" type="button" data-act="mt-scan">Perbarui katalog</button>');
    if (S.items == null) { C.el.body.innerHTML = '<div class="card"><p class="muted">' + (S.err ? C.esc(S.err) : 'Memuat katalog…') + '</p></div>'; return; }
    var h = '<div class="mt-chips">' + STATUS.map(function (o) { return '<button type="button" data-act="mt-st" data-v="' + o[0] + '"' + (S.st === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '<b>' + count('s', o[0]) + '</b></button>'; }).join('') + '</div>' +
      '<div class="mt-chips">' + GROUPS.map(function (o) { return '<button type="button" data-act="mt-g" data-v="' + o[0] + '"' + (S.g === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '<b>' + count('g', o[0]) + '</b></button>'; }).join('') + '</div>' +
      '<div class="bar"><input class="in in--search" type="search" placeholder="Cari: boucle, walnut, travertine, brushed…" value="' + C.esc(S.q) + '" data-plug="' + ID + '" data-mt="q">' +
      '<select class="sel" data-plug="' + ID + '" data-mt="src"><option value="semua">Semua sumber</option><option' + (S.src === 'Poly Haven' ? ' selected' : '') + '>Poly Haven</option><option' + (S.src === 'ambientCG' ? ' selected' : '') + '>ambientCG</option></select>' +
      '<span class="muted">' + L.length + ' ditampilkan</span></div>' +
      (S.err ? '<p class="pill pill--bad" style="margin-bottom:10px">' + C.esc(S.err) + '</p>' : '') +
      '<div class="mt-grid">' + (L.length ? L.slice(0, S.n).map(card).join('') : '<div class="empty">Tidak ada aset di filter ini.</div>') + '</div>' +
      (L.length > S.n ? '<div class="mt-more"><button class="btn" type="button" data-act="mt-more">Tampilkan ' + Math.min(120, L.length - S.n) + ' lagi (' + (L.length - S.n) + ' tersisa)</button></div>' : '');
    var top = C.el.body.scrollTop; C.el.body.innerHTML = h; C.el.body.scrollTop = top;
  }
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act;
    if (a === 'mt-g') { S.g = t.dataset.v; S.n = 120; render(C); return; }
    if (a === 'mt-st') { S.st = t.dataset.v; S.n = 120; render(C); return; }
    if (a === 'mt-more') { S.n += 120; render(C); return; }
    if (a === 'mt-scan') { C.toast('Memperbarui katalog…'); api('POST', 'staging/scan').then(function (r) { C.toast(r.ok ? r.n + ' aset di katalog' : r.error); S.items = null; load(); }); return; }
    if (a === 'mt-set') {
      var id = t.dataset.id, v = t.dataset.v, x = (S.items || []).filter(function (i) { return i.id === id; })[0]; if (!x) return;
      x.status = v === 'acc' ? 'proses' : v;   // langsung terlihat; server menyusul
      var el = C.root.querySelector('[data-mt-card="' + id.replace(/"/g, '') + '"]'); if (el) { var d = document.createElement('div'); d.innerHTML = card(x); el.replaceWith(d.firstChild); }
      api('PUT', 'staging/item', { id: id, status: v }).then(function (r) { if (!r.ok) { C.toast(r.error || 'Gagal'); } load(); });
    }
  }
  function input(t, e, ctx) { C = ctx; if (t.dataset.mt === 'q') { S.q = t.value; S.n = 120; clearTimeout(input.t); input.t = setTimeout(function () { render(C); var i = C.root.querySelector('[data-mt="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } }
  function change(t, e, ctx) { C = ctx; if (t.dataset.mt === 'src') { S.src = t.value; S.n = 120; render(C); } }
  XVDevkit.add({
    id: ID, l: 'Aset material', icon: ICON, prefix: 'mt-',
    init: function (ctx) { C = ctx; },
    count: function () { return S.items ? S.items.filter(function (x) { return x.status === 'baru'; }).length || '' : ''; },
    render: render, click: click, input: input, change: change
  });
})();
