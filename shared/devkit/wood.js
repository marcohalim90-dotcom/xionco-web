/* ==========================================================================
   XIONCO — Developer Settings › Kayu koleksi
   Koleksi hanya 3 kelas kayu: Gelap · Terang · Natural. Setiap komponen kayu model 3D diberi label kelas
   (extras xc_wood di GLB, dari tools/glb/finish.py) → ganti pengaturan kelas di sini = semua komponen berlabel
   kelas itu ikut berubah. Coba langsung di CUBIX (panggung terlihat di samping), lalu "Simpan untuk koleksi"
   → data/wood.json. Model 3D AI (tekstur satu lembar) diperbarui lewat tombol "Perbarui model AI".
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'wood';
  var DEMO = 'cubix-series-3-seaters-ac-al-ac-kayu-terang';
  var CLS = [['gelap', 'Gelap'], ['terang', 'Terang'], ['natural', 'Natural']];
  var S = { cfg: null, saved: null, err: null, cls: 'terang', side: false, ai: null };
  var C, aiPoll = 0;
  var ICON = '<path d="M5 19c3-1 4-4 4-8s1-6 4-6"/><path d="M9 19c3-1 4-4 4-8s1-6 4-6"/><path d="M13 19c3-1 4-4 4-8"/><rect x="3" y="3" width="18" height="18" rx="3"/>';
  var CSS = [
    '.wd-cls { display: flex; gap: 8px; margin-bottom: 14px; } .wd-cls button { flex: 1; height: 40px; border-radius: 10px; border: 1px solid rgba(27,24,21,.16); background: transparent; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }',
    '.wd-cls button i { width: 16px; height: 16px; border-radius: 4px; background: center/cover; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }',
    '.wd-cls button.is-on { background: #1b1815; color: #f4efe6; border-color: #1b1815; }',
    '.wd-sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; margin-bottom: 16px; }',
    '.wd-set { border: 1px solid rgba(27,24,21,.12); border-radius: 10px; overflow: hidden; background: #fffaf2; cursor: pointer; padding: 0; text-align: left; }',
    '.wd-set.is-on { border-color: #b0915e; box-shadow: 0 0 0 2px rgba(176,145,94,.35); }',
    '.wd-set i { display: block; aspect-ratio: 1; background: #ddd center/cover no-repeat; } .wd-set span { display: block; padding: 5px 7px 6px; font-size: 10px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.wd-row { display: grid; grid-template-columns: 120px 1fr 56px; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 11.5px; }',
    '.wd-row input[type=range] { width: 100%; } .wd-row b { font-weight: 500; text-align: right; font-variant-numeric: tabular-nums; }',
    '.wd-row input[type=color] { width: 56px; height: 30px; border: 1px solid rgba(27,24,21,.16); border-radius: 8px; padding: 2px; background: transparent; }',
    '.wd-sw { height: 46px; border-radius: 10px; margin-bottom: 14px; background: center/cover; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }',
    '.wd-note { font-size: 11px; color: #8a8174; line-height: 1.5; margin: 6px 0 14px; }',
    // mode pratinjau: panel menyempit ke kanan, panggung situs terlihat & berjalan
    '.dk.is-side { left: auto !important; width: min(470px, calc(100vw - 28px)); grid-template-columns: 1fr !important; }',
    '.dk.is-side .side { display: none; } .dk.is-side .head { padding-right: 64px; }'
  ].join('\n');
  function css() { var r = C && C.root; if (!r || r.querySelector('#wd-css')) return; var s = document.createElement('style'); s.id = 'wd-css'; s.textContent = CSS; r.appendChild(s); }
  function api(method, p, body) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/' + p, o).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  function load() {
    return api('GET', 'wood').then(function (r) {
      if (r.ok) { S.cfg = clone(r.classes); S.saved = clone(r.classes); S.err = null; }
      else return fetch(C.ROOT + 'data/wood.json', { cache: 'no-cache' }).then(function (x) { return x.json(); }).then(function (j) { S.cfg = clone(j.classes); S.saved = clone(j.classes); S.err = r.error; });
    }).then(function () { if (C && C.shown(ID)) render(C); });
  }
  // set tekstur kayu: pustaka (wood-*) + kayu yang di-Acc (x-kayu-*)
  function sets() {
    var X = window.XTEX; if (!X) return [];
    var NAMA = { 'wood-oak': 'Oak veneer', 'wood-walnut': 'Black walnut', 'wood-teak': 'Rosewood (jati)', 'wood-ash': 'Ash veneer', 'wood-mahogany': 'Sapele (mahoni)' };
    return Object.keys(X.sets).filter(function (k) { return /^wood-/.test(k); }).map(function (k) { return { set: k, l: NAMA[k] || k, img: X.base + k + '/albedo.webp' }; })
      .concat((X.extra || []).filter(function (x) { return x.g === 'kayu'; }).map(function (x) { return { set: x.set, l: x.l + ' · Acc', img: X.thumb(x.set) }; }));
  }
  function imgOf(set) { var s = sets().filter(function (x) { return x.set === set; })[0]; return s ? s.img : ''; }
  function apply() {   // tampilkan perubahan di panggung (belum disimpan)
    if (!window.XW || !XW.setWood || !S.cfg) return;
    if (S.side) XW.woodPreviewAs(S.cls, S.cfg[S.cls]); else XW.setWood(S.cfg, true);
  }
  function side(on) {
    S.side = on; var dk = C.el.dk, sc = C.root.querySelector('.scrim');
    dk.classList.toggle('is-side', on); if (sc) sc.classList.toggle('is-on', !on);
    if (window.XW && XW.pause) setTimeout(function () { XW.pause(false); }, on ? 900 : 0);
    if (on && window.XVOpen) { XVOpen(DEMO); setTimeout(function () { var x = document.querySelector('#panel .panel__close'); if (x) x.click(); setTimeout(apply, 2500); }, 600); }
    if (!on && window.XW && XW.setWood) XW.setWood(S.saved || {});
  }
  function row(k, l, min, max, step) {
    var v = S.cfg[S.cls][k];
    return '<label class="wd-row"><span>' + l + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-plug="' + ID + '" data-wd="' + k + '"><b data-wd-out="' + k + '">' + (+v).toFixed(2) + '</b></label>';
  }
  var watched = false;
  function watch() {   // devkit ditutup saat pratinjau → kembali ke kayu tersimpan
    if (watched || !C.el.dk || !('MutationObserver' in window)) return; watched = true;
    new MutationObserver(function () { if (!C.el.dk.classList.contains('is-open') && S.side) { S.side = false; C.el.dk.classList.remove('is-side'); if (window.XW && XW.setWood) XW.setWood(S.saved || {}); } }).observe(C.el.dk, { attributes: true, attributeFilter: ['class'] });
  }
  function render(ctx) {
    C = ctx; css(); watch();
    if (!S.cfg) { C.head('Koleksi', 'Kayu koleksi', 'Memuat pengaturan…'); C.el.body.innerHTML = ''; load(); return; }
    var c = S.cfg[S.cls], dirty = JSON.stringify(S.cfg) !== JSON.stringify(S.saved);
    C.head('Koleksi · 3 kelas kayu', 'Kayu koleksi',
      'Setiap komponen kayu model 3D berlabel Gelap, Terang, atau Natural. Ubah kelas di sini → semua komponen berlabel kelas itu ikut berubah. ' + (S.side ? 'Pratinjau: kelas terpilih dipasang ke semua kayu CUBIX di panggung.' : 'Tekan "Coba di CUBIX" untuk melihat langsung.'),
      '<button class="btn" type="button" data-act="wd-side">' + (S.side ? 'Tutup pratinjau' : 'Coba di CUBIX') + '</button>' +
      '<button class="btn btn--dark" type="button" data-act="wd-save"' + (dirty ? '' : ' disabled') + '>' + (dirty ? 'Simpan untuk koleksi' : 'Tersimpan') + '</button>');
    var h = '<div class="wd-cls">' + CLS.map(function (o) { return '<button type="button" data-act="wd-cls" data-v="' + o[0] + '"' + (S.cls === o[0] ? ' class="is-on"' : '') + '><i style="background-image:url(\'' + imgOf(S.cfg[o[0]].set) + '\');background-color:' + S.cfg[o[0]].hex + ';background-blend-mode:multiply"></i>' + o[1] + '</button>'; }).join('') + '</div>' +
      (S.err ? '<p class="pill pill--bad" style="margin-bottom:10px">' + C.esc(S.err) + '</p>' : '') +
      '<div class="wd-sw" style="background-color:' + c.hex + ';background-image:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0)),url(\'' + imgOf(c.set) + '\');background-blend-mode:multiply"></div>' +
      '<p class="eyebrow" style="margin:0 0 8px">Tekstur serat</p><div class="wd-sets">' + sets().map(function (x) {
        return '<button type="button" class="wd-set' + (x.set === c.set ? ' is-on' : '') + '" data-act="wd-set" data-v="' + C.esc(x.set) + '"><i style="background-image:url(\'' + x.img + '\')' + (/^wood-/.test(x.set) ? ';background-color:' + c.hex + ';background-blend-mode:multiply' : '') + '"></i><span title="' + C.esc(x.l) + '">' + C.esc(x.l) + '</span></button>';
      }).join('') + '</div>' +
      '<label class="wd-row"><span>Warna rata-rata</span><input type="color" value="' + c.hex + '" data-plug="' + ID + '" data-wd="hex"><b data-wd-out="hex">' + c.hex + '</b></label>' +
      row('ctr', 'Kontras serat', .2, 1.5, .05) + row('rough', 'Kekasaran (doff)', .2, .9, .01) + row('normal', 'Relief serat', 0, 1, .05) + row('scale', 'Skala serat', .4, 2.5, .05) +
      '<p class="wd-note">Kontras serat kecil = serat halus & bersih; besar = serat tegas. Natural belum dipakai produk mana pun (disiapkan).</p>' +
      '<div class="card"><p style="margin:0 0 8px"><b>Model 3D AI</b> (tekstur satu lembar, tidak bisa diberi label per komponen) mengikuti warna kelas lewat pewarnaan ulang: LOPHUS, AZEDRA, QAZTAC, ottoman GUISE (gelap) · SF3S, REGALE, CRUISEO, SCANDUS (terang).</p>' +
      '<button class="btn" type="button" data-act="wd-ai"' + (S.ai && S.ai.run ? ' disabled' : '') + '>' + (S.ai && S.ai.run ? 'Memperbarui model AI…' : 'Perbarui model AI dengan warna tersimpan') + '</button>' +
      (S.ai && !S.ai.run && S.ai.log ? '<pre style="white-space:pre-wrap;font-size:10.5px;margin:10px 0 0">' + C.esc(S.ai.log.slice(-600)) + '</pre>' : '') + '</div>';
    var top = C.el.body.scrollTop; C.el.body.innerHTML = h; C.el.body.scrollTop = top;
  }
  function aiStatus() {
    clearTimeout(aiPoll);
    api('GET', 'wood/ai').then(function (r) { S.ai = r; if (C && C.shown(ID)) render(C); if (r.run) aiPoll = setTimeout(aiStatus, 4000); else if (r.done) C.toast('Model AI diperbarui — muat ulang halaman untuk melihat'); });
  }
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act;
    if (a === 'wd-cls') { S.cls = t.dataset.v; render(C); apply(); return; }
    if (a === 'wd-set') { S.cfg[S.cls].set = t.dataset.v; render(C); apply(); return; }
    if (a === 'wd-side') { side(!S.side); render(C); return; }
    if (a === 'wd-save') {
      api('PUT', 'wood', { classes: S.cfg }).then(function (r) {
        if (!r.ok) { C.toast(r.error || 'Gagal menyimpan'); return; }
        S.saved = clone(r.classes); S.cfg = clone(r.classes);
        if (window.XW && XW.setWood) { XW.setWood(S.saved); if (S.side) apply(); }
        C.toast('Tersimpan — semua komponen berlabel memakai kayu baru'); render(C);
      });
      return;
    }
    if (a === 'wd-ai') { if (JSON.stringify(S.cfg) !== JSON.stringify(S.saved)) { C.toast('Simpan dulu, lalu perbarui model AI'); return; } api('POST', 'wood/ai').then(function (r) { S.ai = r; render(C); aiStatus(); }); }
  }
  function input(t, e, ctx) {
    C = ctx; var k = t.dataset.wd; if (!k || !S.cfg) return;
    S.cfg[S.cls][k] = k === 'hex' ? t.value : +t.value;
    var o = C.root.querySelector('[data-wd-out="' + k + '"]'); if (o) o.textContent = k === 'hex' ? t.value : (+t.value).toFixed(2);
    clearTimeout(input.t); input.t = setTimeout(function () { apply(); var b = C.root.querySelector('[data-act="wd-save"]'); if (b) { b.disabled = false; b.textContent = 'Simpan untuk koleksi'; } }, 120);
  }
  XVDevkit.add({
    id: ID, l: 'Kayu koleksi', icon: ICON, prefix: 'wd-',
    init: function (ctx) { C = ctx; },
    render: render, click: click, input: input, change: input
  });
})();
