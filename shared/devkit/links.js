/* ==========================================================================
   XIONCO — Developer Settings › Link & penawaran
   1. Link iklan: buka produk + varian langsung (#/p/<id>?v=&s=), dengan parameter iklan (utm_*)
   2. Penawaran harga khusus: admin membuat penawaran (produk katalog / rancangan Customize) → server memberi kode
      → link #/q/<KODE> untuk customer. Harga dikunci di server (tools/quotes.js — tiruan lokal, nanti server sungguhan).
   Domain link bisa diganti (sementara: domain uji di Cloudflare).
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'links', DEF_BASE = 'https://xionco-web.marcohalim90.workers.dev';
  var S = { base: '', ad: { pid: '', v: -1, s: -1, src: 'meta', med: 'paid_social', camp: '', cont: '', q: '' }, list: null, err: null, form: null, last: null };
  var C;
  try { S.base = localStorage.getItem('xv_dk_linkbase') || DEF_BASE; } catch (e) { S.base = DEF_BASE; }
  var ICON = '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>';
  var IC2 = { eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>', send: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>' };
  var ic2 = function (n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + IC2[n] + '</svg>'; };
  var SRC = [['meta', 'Meta (FB/IG)'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['google', 'Google'], ['whatsapp', 'WhatsApp'], ['email', 'Email']];
  var MED = [['paid_social', 'Iklan sosial'], ['cpc', 'Iklan klik (CPC)'], ['organic', 'Organik'], ['chat', 'Chat'], ['bio', 'Link bio']];
  var CSS = [
    '.lk-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }',
    '.lk-grid label, .lk-f { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: var(--tl2, #8a8174); }',
    '.lk-wide { grid-column: span 2; } .lk-full { grid-column: 1 / -1; }',
    '.lk-out { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; margin-top: 6px; }',
    '.lk-out .in { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; }',
    '.lk-sec { margin-bottom: 22px; } .lk-sec > h3 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 10px; }',
    '.tr--lk { grid-template-columns: 110px minmax(0, 2fr) minmax(0, 1.2fr) 130px 110px 90px 70px 150px; }',
    '.lk-acts { display: flex; gap: 4px; justify-content: flex-end; }',
    '.lk-price { font-variant-numeric: tabular-nums; } .lk-price s { color: var(--tl3, #a99f92); margin-right: 6px; }',
    '@media (max-width: 900px) { .lk-grid { grid-template-columns: 1fr 1fr; } .tr--lk { grid-template-columns: 1fr 1fr; } }'
  ].join('\n');
  function css() { var r = C && C.root; if (!r || r.querySelector('#lk-css')) return; var s = document.createElement('style'); s.id = 'lk-css'; s.textContent = CSS; r.appendChild(s); }   // di dalam shadow root Developer Settings
  var rp = function (n) { return 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID'); };
  var slug = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var base = function () { return (S.base || DEF_BASE).replace(/\/+$/, ''); };
  var localUrl = function (hash, qs) { return location.origin + '/v5/' + (qs || '') + hash; };

  /* ---------------------------------------------------------------- server */
  function api(method, p, body) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/' + p, o).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }); })
      .catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  function loadList() { return api('GET', 'quotes').then(function (r) { S.list = r.ok ? r.items : []; S.err = r.ok ? null : r.error; if (C && C.shown(ID)) render(C); }); }

  /* ---------------------------------------------------------------- produk & harga */
  function prods() { return C.products().filter(function (p) { return p.status !== 'arsip'; }).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }); }
  function prod(id) { return C.products().filter(function (p) { return p.id === id; })[0]; }
  function vParam(p, vi) { var v = p && p.variants && p.variants[vi]; return v ? (v.key || slug((v.group ? v.group + ' ' : '') + v.label)) : ''; }
  function sParam(p, vi, si) { var v = p && p.variants && p.variants[vi], s = v && v.subs && v.subs[si]; return s ? slug(s.label) : ''; }
  function unitPrice(p, vi, si) {
    var v = p && p.variants && p.variants[vi], s = v && v.subs && v.subs[si];
    return (s && s.price) || (v && v.price) || (p && p.price) || 0;
  }
  function varLabel(p, vi, si) {
    var v = p && p.variants && p.variants[vi], s = v && v.subs && v.subs[si];
    return v ? [v.group, v.label].filter(Boolean).join(' · ') + (s ? ' · ' + s.label : '') : '';
  }
  function varSelects(p, vi, si, keyV, keyS) {
    if (!p || !p.variants || !p.variants.length) return '<label>Varian<select class="sel" disabled><option>—</option></select></label><label>Ukuran / opsi<select class="sel" disabled><option>—</option></select></label>';
    var v = p.variants[vi];
    return '<label>Varian<select class="sel" data-plug="' + ID + '" data-k="' + keyV + '">' + p.variants.map(function (x, i) { return '<option value="' + i + '"' + (i === vi ? ' selected' : '') + '>' + C.esc([x.group, x.label].filter(Boolean).join(' · ')) + '</option>'; }).join('') + '</select></label>' +
      '<label>Ukuran / opsi<select class="sel" data-plug="' + ID + '" data-k="' + keyS + '"' + (v && v.subs && v.subs.length ? '' : ' disabled') + '>' + (v && v.subs && v.subs.length ? v.subs.map(function (x, i) { return '<option value="' + i + '"' + (i === si ? ' selected' : '') + '>' + C.esc(x.label) + '</option>'; }).join('') : '<option>—</option>') + '</select></label>';
  }
  function prodSelect(key, val) {
    return '<label class="lk-wide">Produk<select class="sel" data-plug="' + ID + '" data-k="' + key + '"><option value="">— pilih produk —</option>' + prods().map(function (p) { return '<option value="' + C.esc(p.id) + '"' + (p.id === val ? ' selected' : '') + '>' + C.esc(p.name + (p.type ? ' — ' + p.type : '')) + '</option>'; }).join('') + '</select></label>';
  }
  function defVar(p) { if (!p || !p.variants || !p.variants.length) return [-1, -1]; var vi = Math.max(0, p.variant || 0), v = p.variants[vi], si = -1; if (v && v.subs && v.subs.length) { si = 0; v.subs.forEach(function (x, i) { if (x.on) si = i; }); } return [vi, si]; }

  /* ---------------------------------------------------------------- link iklan */
  function adHash() { var a = S.ad, p = prod(a.pid); if (!p) return ''; var v = vParam(p, a.v), s = sParam(p, a.v, a.s); return '#/p/' + p.id + (v ? '?v=' + encodeURIComponent(v) + (s ? '&s=' + encodeURIComponent(s) : '') : ''); }
  function adQs() {
    var a = S.ad, q = [];
    if (a.src) q.push('utm_source=' + encodeURIComponent(a.src)); if (a.med) q.push('utm_medium=' + encodeURIComponent(a.med));
    if (a.camp) q.push('utm_campaign=' + encodeURIComponent(slug(a.camp))); if (a.cont) q.push('utm_content=' + encodeURIComponent(slug(a.cont)));
    return q.length ? '?' + q.join('&') : '';
  }
  function adHtml() {
    var a = S.ad, p = prod(a.pid), h = adHash(), link = h ? base() + '/' + adQs() + h : '';
    return '<div class="card lk-sec"><h3>Link iklan produk</h3><p class="muted" style="margin:-4px 0 12px">Customer yang membuka link langsung melihat produk & varian ini di panggung 3D. Parameter iklan ikut tercatat di pesanan.</p>' +
      '<div class="lk-grid">' + prodSelect('ad.pid', a.pid) + varSelects(p, a.v, a.s, 'ad.v', 'ad.s') +
      '<label>Sumber iklan<select class="sel" data-plug="' + ID + '" data-k="ad.src">' + SRC.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === a.src ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Jenis<select class="sel" data-plug="' + ID + '" data-k="ad.med">' + MED.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === a.med ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Nama kampanye<input class="in" data-plug="' + ID + '" data-k="ad.camp" value="' + C.esc(a.camp) + '" placeholder="mis. sofa-oktober"></label>' +
      '<label>Isi iklan (opsional)<input class="in" data-plug="' + ID + '" data-k="ad.cont" value="' + C.esc(a.cont) + '" placeholder="mis. video-1"></label></div>' +
      (p ? '<p class="muted" style="margin-bottom:6px">' + C.esc(p.name) + (varLabel(p, a.v, a.s) ? ' · ' + C.esc(varLabel(p, a.v, a.s)) : '') + ' · ' + rp(unitPrice(p, a.v, a.s)) + '</p>' : '') +
      '<div class="lk-out"><input class="in" readonly value="' + C.esc(link || 'Pilih produk dulu') + '" data-lk-sel>' +
      '<button class="btn btn--dark" type="button" data-act="lk-copy" data-v="' + C.esc(link) + '"' + (link ? '' : ' disabled') + '>' + C.ic('copy') + 'Salin</button>' +
      '<button class="btn" type="button" data-act="lk-open" data-v="' + C.esc(h ? localUrl(h, adQs()) : '') + '"' + (link ? '' : ' disabled') + '>Buka (lokal)</button></div></div>';
  }

  /* ---------------------------------------------------------------- penawaran */
  function designs() { try { return JSON.parse(localStorage.getItem('xv5_designs') || '[]'); } catch (e) { return []; } }
  function activeCz() { try { return JSON.parse(localStorage.getItem('xv5_cz') || 'null'); } catch (e) { return null; } }
  function czPrice(cfg) { try { var c = JSON.parse(JSON.stringify(cfg)); c.qty = 1; return (window.XC && XC.estimate(window.XC.normalize ? XC.normalize(c) : c)) || 0; } catch (e) { return 0; } }
  function czSub(cfg) { try { return window.XC && XC.dimsText ? XC.dimsText(XC.normalize(JSON.parse(JSON.stringify(cfg)))) : ''; } catch (e) { return ''; } }
  function newForm(q) {
    if (q) return { code: q.code, kind: q.kind, pid: q.pid || '', v: q.kind === 'produk' ? vIdx(q) : -1, s: -1, design: '', cfg: q.cfg, title: q.title, sub: q.sub, img: q.img, qty: q.qty || 1, normal: q.normal, price: q.price, days: '', maxUse: q.maxUse, note: q.note, internal: q.internal, cname: (q.customer || {}).name || '', cphone: (q.customer || {}).phone || '', status: q.status };
    return { code: null, kind: 'produk', pid: '', v: -1, s: -1, design: '', cfg: null, title: '', sub: '', img: '', qty: 1, normal: 0, price: '', days: 7, maxUse: 1, note: '', internal: '', cname: '', cphone: '', status: 'aktif' };
  }
  function vIdx(q) { var p = prod(q.pid); if (!p || !p.variants) return -1; for (var i = 0; i < p.variants.length; i++) if (vParam(p, i) === q.v) return i; return -1; }
  function formFill(f) {   // judul, spesifikasi, foto & harga normal dari pilihan
    if (f.kind === 'produk') {
      var p = prod(f.pid); if (!p) return;
      var v = p.variants && p.variants[f.v], s = v && v.subs && v.subs[f.s];
      f.title = p.name; f.sub = [p.type, varLabel(p, f.v, f.s)].filter(Boolean).join(' · ');
      f.img = (s && s.img) || (v && v.img) || p.img || ''; f.normal = unitPrice(p, f.v, f.s);
    } else if (f.cfg) {
      var d = designs().filter(function (x) { return x.id === f.design; })[0];
      f.title = d ? d.title : 'Rancangan Customize'; f.sub = czSub(f.cfg) || (d && d.sub) || ''; f.img = d && d.img || f.img || ''; f.normal = czPrice(f.cfg) || (d && d.price) || 0;
    }
  }
  function formHtml() {
    var f = S.form, p = prod(f.pid), ds = designs(), act = activeCz();
    var src = f.kind === 'produk'
      ? prodSelect('f.pid', f.pid) + varSelects(p, f.v, f.s, 'f.v', 'f.s')
      : '<label class="lk-full">Rancangan<select class="sel" data-plug="' + ID + '" data-k="f.design"><option value="">— pilih rancangan —</option>' +
        (act ? '<option value="__aktif"' + (f.design === '__aktif' ? ' selected' : '') + '>Rancangan yang sedang dibuka di Customize</option>' : '') +
        ds.map(function (d) { return '<option value="' + C.esc(d.id) + '"' + (d.id === f.design ? ' selected' : '') + '>' + C.esc(d.title + ' — ' + (d.sub || '')) + '</option>'; }).join('') + '</select></label>';
    var save = f.normal && +f.price ? Math.round((1 - (+f.price) / f.normal) * 100) : 0;
    return '<div class="card lk-sec"><h3>' + (f.code ? 'Ubah penawaran ' + C.esc(f.code) : 'Penawaran baru') + '</h3>' +
      '<div class="lk-grid"><label class="lk-wide">Jenis<select class="sel" data-plug="' + ID + '" data-k="f.kind"' + (f.code ? ' disabled' : '') + '><option value="produk"' + (f.kind === 'produk' ? ' selected' : '') + '>Produk katalog</option><option value="custom"' + (f.kind === 'custom' ? ' selected' : '') + '>Rancangan Customize</option></select></label>' +
      '<label>Jumlah<input class="in" type="number" min="1" data-plug="' + ID + '" data-k="f.qty" value="' + f.qty + '"></label>' +
      '<label>Status<select class="sel" data-plug="' + ID + '" data-k="f.status"><option value="aktif"' + (f.status !== 'nonaktif' ? ' selected' : '') + '>Aktif</option><option value="nonaktif"' + (f.status === 'nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label>' +
      src + '</div>' +
      (f.title ? '<p class="muted" style="margin-bottom:10px"><b style="color:inherit">' + C.esc(f.title) + '</b>' + (f.sub ? ' · ' + C.esc(f.sub) : '') + ' · harga normal ' + rp(f.normal) + ' / unit</p>' : '') +
      '<div class="lk-grid"><label>Harga khusus / unit (Rp)<input class="in" inputmode="numeric" data-plug="' + ID + '" data-k="f.price" value="' + C.esc(f.price) + '" placeholder="mis. 3500000"></label>' +
      '<label>Berlaku<select class="sel" data-plug="' + ID + '" data-k="f.days">' + (f.code ? '<option value="">Tidak diubah</option>' : '') + [[3, '3 hari'], [7, '7 hari'], [14, '14 hari'], [30, '30 hari'], [0, 'Tanpa batas']].map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(f.days) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Bisa dipakai<select class="sel" data-plug="' + ID + '" data-k="f.maxUse">' + [[1, '1 pesanan'], [3, '3 pesanan'], [0, 'Tanpa batas']].map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(f.maxUse) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Hemat<input class="in" disabled value="' + (save > 0 ? save + '%' : '—') + '"></label>' +
      '<label class="lk-wide">Catatan untuk customer<textarea class="in" rows="2" data-plug="' + ID + '" data-k="f.note" placeholder="mis. Harga khusus proyek apartemen — sudah termasuk pengiriman Jabodetabek">' + C.esc(f.note) + '</textarea></label>' +
      '<label class="lk-wide">Catatan internal (tidak dikirim ke customer)<textarea class="in" rows="2" data-plug="' + ID + '" data-k="f.internal">' + C.esc(f.internal) + '</textarea></label>' +
      '<label class="lk-wide">Nama customer (lokal saja)<input class="in" data-plug="' + ID + '" data-k="f.cname" value="' + C.esc(f.cname) + '"></label>' +
      '<label class="lk-wide">WhatsApp customer (lokal saja)<input class="in" inputmode="tel" data-plug="' + ID + '" data-k="f.cphone" value="' + C.esc(f.cphone) + '" placeholder="62812…"></label></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" type="button" data-act="lk-cancel">Batal</button><button class="btn btn--dark" type="button" data-act="lk-save">' + C.ic('check') + (f.code ? 'Simpan' : 'Buat link penawaran') + '</button></div></div>';
  }
  function qLink(code) { return base() + '/#/q/' + code; }
  function waLink(q) {
    var ph = String((q.customer || {}).phone || '').replace(/\D/g, '').replace(/^0/, '62');
    var msg = 'Halo' + ((q.customer || {}).name ? ' ' + q.customer.name : '') + ', berikut penawaran khusus XIONCO untuk ' + q.title + ':\n' + qLink(q.code) + '\n\nHarga khusus berlaku' + (q.expires ? ' sampai ' + new Date(q.expires).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '') + '.';
    return 'https://wa.me/' + (ph || '') + '?text=' + encodeURIComponent(msg);
  }
  function listHtml() {
    var L = S.list;
    if (L == null) return '<div class="card"><p class="muted">Memuat penawaran…</p></div>';
    var now = Date.now();
    var stat = function (q) { return q.status !== 'aktif' ? ['Nonaktif', 'pill--bad'] : q.expires && now > q.expires ? ['Kedaluwarsa', 'pill--bad'] : q.maxUse && (q.used || 0) >= q.maxUse ? ['Terpakai', 'pill--ok'] : ['Aktif', 'pill--gold']; };
    return '<div class="tbl"><div class="tr tr--lk th"><span>Kode</span><span>Item</span><span>Customer</span><span>Harga</span><span>Berlaku</span><span>Status</span><span>Dilihat</span><span></span></div>' +
      (L.length ? L.map(function (q) {
        var st = stat(q);
        return '<div class="tr tr--lk"><span class="mono">' + C.esc(q.code) + '</span><span><b style="font-weight:500">' + C.esc(q.title) + '</b>' + (q.qty > 1 ? ' × ' + q.qty : '') + '<br><span class="muted">' + C.esc(q.kind === 'custom' ? 'Rancangan Customize' : (q.sub || '')) + '</span></span>' +
          '<span class="muted">' + C.esc((q.customer || {}).name || '—') + '</span><span class="lk-price">' + (q.normal > q.price ? '<s>' + rp(q.normal) + '</s><br>' : '') + rp(q.price) + '</span>' +
          '<span class="muted">' + (q.expires ? new Date(q.expires).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Tanpa batas') + '</span><span><span class="pill ' + st[1] + '">' + st[0] + '</span></span>' +
          '<span class="muted">' + (q.views || 0) + '× · ' + (q.used || 0) + (q.maxUse ? '/' + q.maxUse : '') + '</span>' +
          '<span class="lk-acts"><button class="ibtn" type="button" title="Salin link" data-act="lk-copy" data-v="' + C.esc(qLink(q.code)) + '">' + C.ic('copy') + '</button>' +
          '<button class="ibtn" type="button" title="Buka (lokal)" data-act="lk-open" data-v="' + C.esc(localUrl('#/q/' + q.code)) + '">' + ic2('eye') + '</button>' +
          '<a class="ibtn" title="Kirim via WhatsApp" href="' + C.esc(waLink(q)) + '" target="_blank" rel="noopener">' + ic2('send') + '</a>' +
          '<button class="ibtn" type="button" title="Ubah" data-act="lk-edit" data-id="' + C.esc(q.code) + '">' + C.ic('edit') + '</button>' +
          '<button class="ibtn" type="button" title="Hapus" data-act="lk-del" data-id="' + C.esc(q.code) + '">' + C.ic('trash') + '</button></span></div>';
      }).join('') : '<div class="empty">Belum ada penawaran. Buat dengan tombol di kanan atas.</div>') + '</div>';
  }

  /* ---------------------------------------------------------------- render & event */
  function render(ctx) {
    C = ctx; css();
    if (S.list == null && !S.loading) { S.loading = true; loadList().then(function () { S.loading = false; }); }
    C.head('08 · Pemasaran', 'Link & penawaran', 'Link iklan langsung ke produk, dan penawaran harga khusus untuk customer — harga dikunci di server, customer hanya menerima kode.',
      '<button class="btn btn--dark" type="button" data-act="lk-new">' + C.ic('plus') + 'Penawaran baru</button>');
    var h = '<div class="card lk-sec"><div class="lk-out" style="grid-template-columns:auto 1fr auto;margin:0"><span class="muted">Domain link</span><input class="in" data-plug="' + ID + '" data-k="base" value="' + C.esc(S.base) + '"><span class="pill pill--warn">Domain uji</span></div></div>';
    h += adHtml();
    if (S.last) h += '<div class="card lk-sec"><h3>Link penawaran ' + C.esc(S.last.code) + ' siap</h3><div class="lk-out"><input class="in" readonly value="' + C.esc(qLink(S.last.code)) + '"><button class="btn btn--dark" type="button" data-act="lk-copy" data-v="' + C.esc(qLink(S.last.code)) + '">' + C.ic('copy') + 'Salin</button><a class="btn" href="' + C.esc(waLink(S.last)) + '" target="_blank" rel="noopener">Kirim via WhatsApp</a></div></div>';
    if (S.form) h += formHtml();
    h += '<div class="lk-sec"><h3>Penawaran harga khusus</h3>' + (S.err ? '<p class="pill pill--bad" style="margin-bottom:10px">' + C.esc(S.err) + '</p>' : '') + listHtml() + '</div>';
    C.el.body.innerHTML = h;
  }
  function copy(v) {
    if (!v) return;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { C.toast('Link disalin'); }, function () { var i = C.root.querySelector('[data-lk-sel]'); if (i) { i.value = v; i.select(); document.execCommand('copy'); C.toast('Link disalin'); } });
  }
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act;
    if (a === 'lk-copy') { copy(t.dataset.v); return; }
    if (a === 'lk-open') { if (t.dataset.v) window.open(t.dataset.v, '_blank', 'noopener'); return; }
    if (a === 'lk-new') { S.form = newForm(); S.last = null; render(C); return; }
    if (a === 'lk-cancel') { S.form = null; render(C); return; }
    if (a === 'lk-edit') { var q = (S.list || []).filter(function (x) { return x.code === t.dataset.id; })[0]; if (q) { S.form = newForm(q); S.last = null; render(C); } return; }
    if (a === 'lk-del') { if (!confirm('Hapus penawaran ' + t.dataset.id + '? Link-nya tidak akan bisa dibuka lagi.')) return; api('DELETE', 'quotes/' + t.dataset.id).then(function (r) { C.toast(r.ok ? 'Penawaran dihapus' : r.error); loadList(); }); return; }
    if (a === 'lk-save') {
      var f = S.form; formFill(f);
      if (!f.title) { C.toast(f.kind === 'produk' ? 'Pilih produk dulu' : 'Pilih rancangan dulu'); return; }
      var price = Math.round(+String(f.price).replace(/[^\d]/g, ''));
      if (!price) { C.toast('Isi harga khusus'); return; }
      var p = prod(f.pid);
      var body = { code: f.code, kind: f.kind, title: f.title, sub: f.sub, img: f.img, qty: Math.max(1, +f.qty || 1), normal: f.normal, price: price, maxUse: +f.maxUse, note: f.note, internal: f.internal, customer: { name: f.cname, phone: f.cphone }, status: f.status };
      if (f.days !== '') body.days = +f.days;
      if (f.kind === 'produk') { body.pid = f.pid; body.v = vParam(p, f.v) || null; body.s = sParam(p, f.v, f.s) || null; } else body.cfg = f.cfg;
      t.disabled = true;
      api('POST', 'quotes', body).then(function (r) {
        t.disabled = false;
        if (!r.ok) { C.toast(r.error || 'Gagal menyimpan'); return; }
        S.form = null; S.last = r.quote; C.toast('Penawaran ' + r.quote.code + ' tersimpan'); loadList();
      });
    }
  }
  function setK(t) {
    var k = t.dataset.k, v = t.value;
    if (k === 'base') { S.base = v.trim() || DEF_BASE; try { localStorage.setItem('xv_dk_linkbase', S.base); } catch (e) {} return 'soft'; }
    var o = k.slice(0, 2) === 'f.' ? S.form : S.ad, key = k.split('.')[1]; if (!o) return;
    if (key === 'pid') { o.pid = v; var dv = defVar(prod(v)); o.v = dv[0]; o.s = dv[1]; }
    else if (key === 'v') { o.v = +v; var p = prod(o.pid), vv = p && p.variants[o.v]; o.s = vv && vv.subs && vv.subs.length ? 0 : -1; }
    else if (key === 's') o.s = +v;
    else if (key === 'design') { o.design = v; o.cfg = v === '__aktif' ? activeCz() : ((designs().filter(function (d) { return d.id === v; })[0] || {}).cfg || null); }
    else if (key === 'kind') { o.kind = v; o.pid = ''; o.design = ''; o.cfg = null; o.title = ''; }
    else o[key] = v;
    if (o === S.form) formFill(o);
    return /^(pid|v|s|design|kind)$/.test(key) ? 'hard' : 'soft';
  }
  function change(t, e, ctx) { C = ctx; var r = setK(t); render(C); }
  function input(t, e, ctx) {
    C = ctx; if (t.tagName === 'SELECT') return;
    setK(t);
    // teks diketik: perbarui link / hemat tanpa menggambar ulang (fokus tetap di kolom)
    var out = C.root.querySelector('[data-lk-sel]'); if (out && S.ad.pid) { var h = adHash(); out.value = base() + '/' + adQs() + h; }
  }

  XVDevkit.add({
    id: ID, l: 'Link & penawaran', icon: ICON, prefix: 'lk-',
    init: function (ctx) { C = ctx; },
    count: function () { return S.list ? S.list.filter(function (q) { return q.status === 'aktif' && !(q.expires && Date.now() > q.expires); }).length || '' : ''; },
    render: render, click: click, input: input, change: change
  });
})();
