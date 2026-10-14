/* ==========================================================================
   XIONCO — Developer Settings › 3D katalog (3D AI: Tripo lewat fal.ai)
   Hanya di komputer lokal (butuh node tools/serve.js — lihat tools/ai3d.js).
   - Pengaturan: key fal.ai (disimpan di data/private, tidak pernah ditampilkan lagi) + pilihan model AI
   - Tab 3D katalog: daftar produk → cek foto (Depan / Kiri / Belakang / Kanan), upload foto lebih baik,
     Run → loading otomatis sampai GLB selesai → centang. Lihat hasil 3D, lalu "Di situs" untuk memakainya.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.XVDevkit) return;
  var ID = 'ai3d', API = '/api/ai3d/';
  var VIEWS = ['Depan', 'Kiri', 'Belakang', 'Kanan'];
  var RUN = ['tunggu', 'kirim', 'antri', 'proses', 'unduh', 'rapikan'];
  var LABEL = { tunggu: 'Menunggu giliran', kirim: 'Mengirim foto', antri: 'Antre di fal.ai', proses: 'Membuat model 3D', unduh: 'Mengunduh', rapikan: 'Merapikan (Blender)' };
  var MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  var S = { cfg: null, jobs: {}, sel: {}, uploads: {}, f: 'belum', cat: 'semua', q: '', open: null, slot: 0, key: '', loaded: false, cssOn: false, view: null };
  var C;   // konteks devkit terakhir

  var ICON = '<path d="m12 3.5 7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7z"/><path d="m4.5 7.7 7.5 4.3 7.5-4.3M12 12v8.5"/>';
  var IC = {
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    rot: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4v4h-4"/>',
    x: '<path d="M7 7l10 10M17 7 7 17"/>',
    img: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'
  };
  var ic2 = function (n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; };

  var CSS = [
    '.ai-key { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; margin-bottom: 14px; }',
    '.ai-key .in { height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--hair); background: rgba(255,250,242,.6); font-size: 12.5px; outline: none; min-width: 0; }',
    '.ai-key .in:focus { border-color: var(--gold); }',
    '.ai-ks { display: flex; align-items: center; gap: 10px; margin: -4px 0 14px; font-size: 12px; color: var(--tl2); flex-wrap: wrap; }',
    '.ai-models { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }',
    '.ai-models button { text-align: left; padding: 11px 13px 10px; border-radius: 12px; border: 1px solid var(--hair); transition: border-color .25s, background .25s; }',
    '.ai-models button b { display: flex; justify-content: space-between; gap: 8px; font: 400 10.5px/1.3 var(--fh); letter-spacing: .18em; text-transform: uppercase; }',
    '.ai-models button b i { font-style: normal; color: var(--goldlo); letter-spacing: .05em; }',
    '.ai-models button span { display: block; margin-top: 4px; font-size: 11.5px; line-height: 1.4; color: var(--tl3); }',
    '.ai-models button.is-on { border-color: var(--tl); background: rgba(191,162,116,.12); }',
    '.ai-opt { display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 8px 12px; font-size: 12px; color: var(--tl2); }',
    '.ai-opt .seg { justify-self: start; }',
    '.ai-sum { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }',
    '.tbl--ai { container-type: inline-size; }',
    '.tr--ai { grid-template-columns: minmax(0, 1.3fr) 224px minmax(0, 1fr) auto; }',
    '@container (max-width: 640px) { .tr--ai { grid-template-columns: minmax(0, 1fr) auto; } .tr--ai.th span:nth-child(2), .tr--ai.th span:nth-child(3) { display: none; } .tr--ai .ai-slots { grid-column: 1 / -1; } .tr--ai .ai-st { grid-column: 1; } }',
    '.ai-slots { display: grid; grid-template-columns: repeat(4, 50px); gap: 8px; }',
    '.ai-slot { position: relative; display: grid; gap: 3px; justify-items: center; }',
    '.ai-slot > button:first-child { width: 50px; height: 50px; border-radius: 9px; border: 1px dashed rgba(27,24,21,.25); background: var(--ivory2); overflow: hidden; display: grid; place-items: center; color: var(--tl3); transition: border-color .25s, box-shadow .25s; }',
    '.ai-slot > button:first-child img { width: 92%; height: 92%; object-fit: contain; mix-blend-mode: multiply; }',
    '.ai-slot.is-fill > button:first-child { border-style: solid; border-color: var(--hair); }',
    '.ai-slot.is-act > button:first-child { border: 1.5px solid var(--gold); box-shadow: 0 0 0 3px rgba(191,162,116,.22); }',
    '.ai-slot em { font: 400 8px/1 var(--fh); letter-spacing: .16em; text-transform: uppercase; font-style: normal; color: var(--tl3); }',
    '.ai-slot .ai-clr { position: absolute; right: -5px; top: -5px; width: 18px; height: 18px; border-radius: 50%; background: var(--tl); color: var(--ivory); display: none; place-items: center; }',
    '.ai-slot .ai-clr .ic { width: 11px; height: 11px; stroke-width: 2; }',
    '.ai-row.is-open .ai-slot.is-fill .ai-clr { display: grid; }',
    '.ai-st { display: grid; gap: 6px; font-size: 12px; color: var(--tl2); min-width: 0; }',
    '.ai-st > div { display: flex; align-items: center; gap: 8px; min-width: 0; }',
    '.ai-st small { display: block; font-size: 11px; color: var(--tl3); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; }',
    '.ai-st .chk { flex: none; }',
    '.ai-st .chk.is-on { background: var(--gold); border-color: var(--gold); }',
    '.ai-err { color: var(--bad); font-size: 11.5px; line-height: 1.35; word-break: break-word; }',
    '.ai-spin { width: 16px; height: 16px; flex: none; border-radius: 50%; border: 2px solid rgba(140,117,80,.25); border-top-color: var(--goldlo); animation: aispin .8s linear infinite; }',
    '@keyframes aispin { to { transform: rotate(360deg); } }',
    '.ai-bar { position: relative; height: 3px; border-radius: 3px; overflow: hidden; background: rgba(140,117,80,.16); }',
    '.ai-bar::after { content: ""; position: absolute; top: 0; bottom: 0; width: 38%; border-radius: 3px; background: linear-gradient(90deg, transparent, var(--gold), transparent); animation: aibar 1.4s var(--ease) infinite; }',
    '@keyframes aibar { from { left: -40%; } to { left: 100%; } }',
    '.ai-acts { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 6px; max-width: 200px; }',
    '.ai-acts .tg { height: 30px; font-size: 11.5px; gap: 7px; }',
    '.ai-acts .sw { width: 32px; height: 18px; } .ai-acts .sw::after { width: 12px; height: 12px; } .ai-acts .tg.is-on .sw::after { transform: translateX(14px); }',
    '.ai-cost { font: 400 10.5px/1 var(--f); color: var(--tl3); }',
    '.ai-panel { grid-column: 1 / -1; padding: 14px 0 6px; border-top: 1px dashed var(--hair); }',
    '.ai-panel p { margin: 0 0 12px; font-size: 12px; color: var(--tl2); }',
    '.ai-gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(116px, 1fr)); gap: 10px; }',
    '.ai-ph { position: relative; aspect-ratio: 1; border-radius: 12px; background: var(--ivory2); border: 1px solid var(--hair); overflow: hidden; transition: border-color .25s, transform .3s var(--ease); }',
    '.ai-ph:hover { border-color: var(--gold); transform: translateY(-2px); }',
    '.ai-ph img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }',
    '.ai-ph b { position: absolute; left: 6px; top: 6px; padding: 3px 6px 2px; border-radius: 6px; background: var(--tl); color: var(--ivory); font: 400 8px/1 var(--fh); letter-spacing: .14em; text-transform: uppercase; }',
    '.ai-ph i { position: absolute; right: 6px; bottom: 6px; padding: 3px 6px 2px; border-radius: 6px; background: rgba(255,250,242,.85); color: var(--goldlo); font: 400 8px/1 var(--fh); letter-spacing: .14em; text-transform: uppercase; font-style: normal; }',
    '.ai-ph .ai-del { position: absolute; right: 5px; top: 5px; width: 22px; height: 22px; border-radius: 50%; background: rgba(27,24,21,.75); color: var(--ivory); display: grid; place-items: center; }',
    '.ai-ph .ai-del .ic { width: 12px; height: 12px; }',
    '.ai-up { aspect-ratio: 1; border-radius: 12px; border: 1px dashed rgba(27,24,21,.3); display: grid; place-content: center; justify-items: center; gap: 6px; color: var(--tl2); font: 400 9px/1.3 var(--fh); letter-spacing: .18em; text-transform: uppercase; transition: border-color .25s, color .25s; }',
    '.ai-up:hover { border-color: var(--gold); color: var(--goldlo); }',
    '.ai-up .ic { width: 22px; height: 22px; }',
    '.ai-mod { position: fixed; inset: 0; z-index: 6; display: grid; place-items: center; background: rgba(10,8,6,.55); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }',
    '.ai-mod__b { position: relative; width: min(1100px, 92vw); height: min(720px, 86vh); display: grid; grid-template-columns: 1fr 300px; border-radius: 20px; overflow: hidden; background: var(--ivory); color: var(--tl); font: 400 13px/1.55 var(--f); box-shadow: 0 40px 100px rgba(0,0,0,.5); }',
    '.ai-mod model-viewer { width: 100%; height: 100%; background: radial-gradient(circle at 50% 40%, #efe8dc, #d6cbb8); --poster-color: transparent; }',
    '.ai-mod aside { padding: 24px 22px; overflow: auto; border-left: 1px solid var(--hair); display: grid; align-content: start; gap: 14px; }',
    '.ai-mod h3 { margin: 0; font: 400 13px/1.3 var(--fh); letter-spacing: .2em; text-transform: uppercase; }',
    '.ai-mod dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font-size: 12px; } .ai-mod dt { color: var(--tl3); } .ai-mod dd { margin: 0; }',
    '.ai-mod .ai-pv { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; } .ai-mod .ai-pv img { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 8px; background: var(--ivory2); mix-blend-mode: multiply; }',
    '.ai-mod .ai-x { position: absolute; right: 14px; top: 14px; z-index: 2; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,250,242,.8); }',
    '.ai-mod .ai-none { display: grid; place-items: center; height: 100%; color: var(--tl3); font-size: 12px; padding: 30px; text-align: center; }',
    '@media (max-width: 900px) { .ai-mod__b { grid-template-columns: 1fr; grid-template-rows: 1fr auto; } .ai-models { grid-template-columns: 1fr; } }'
  ].join('\n');

  /* ---------------------------------------------------------------- server */
  function api(method, p, body, raw) {
    var o = { method: method, headers: { 'X-XIONCO': '1' }, cache: 'no-store' };
    if (raw) { o.body = raw; o.headers['Content-Type'] = raw.type; }
    else if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    return fetch(API + p, o).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }); })
      .catch(function () { return { ok: false, error: 'Server lokal tidak menjawab — jalankan node tools/serve.js' }; });
  }
  function loadCfg() { return api('GET', 'config').then(function (r) { S.cfg = r.ok ? r : { error: r.error }; return S.cfg; }); }
  function loadJobs() {
    return api('GET', 'jobs').then(function (r) {
      if (!r.ok) return false;
      var old = S.jobs; S.jobs = r.jobs || {}; S.sel = r.sel || {}; S.uploads = r.uploads || {}; S.loaded = true;
      var changed = [];
      Object.keys(S.jobs).forEach(function (id) { if (JSON.stringify(old[id]) !== JSON.stringify(S.jobs[id])) changed.push(id); });
      return changed;
    });
  }

  /* ---------------------------------------------------------------- data */
  var LOCALF = /^(data\/source\/|assets\/)/;   // file di komputer ini (upload / aset) — server membacanya langsung
  var src = function (u) { return !u ? '' : LOCALF.test(u) ? C.ROOT + u : C.imgSrc(u, 1024); };
  var forFal = function (u) { return !u ? null : LOCALF.test(u) ? u : src(u); };
  function photos(p) {
    var out = [], seen = {};
    var add = function (u, tag) { if (u && !seen[u]) { seen[u] = 1; out.push({ u: u, tag: tag }); } };
    add(p.img, 'Utama');
    (p.images || []).forEach(function (u) { add(u, ''); });
    (p.variants || []).forEach(function (v) { add(v.img, v.label ? String(v.label).slice(0, 14) : 'Varian'); });
    (S.uploads[p.id] || []).forEach(function (u) { add(u, 'Upload'); });
    return out;
  }
  function views(p) { var v = S.sel[p.id]; return v && v.some(Boolean) ? v.concat([null, null, null, null]).slice(0, 4) : [p.imgOriginal || (p.images && p.images[0]) || p.img || null, null, null, null]; }
  function job(id) { return S.jobs[id]; }
  function isRun(j) { return j && RUN.indexOf(j.status) >= 0; }
  function cost() {
    var c = S.cfg, m = c && c.models && c.models[c.model]; if (!m) return null;
    return (c.texture === 'detailed' ? m.cost.detailed : m.cost.standard) + (c.geometry === 'detailed' ? m.cost.geo : 0);
  }
  function list() {
    var q = S.q.trim().toLowerCase();
    return C.products().filter(function (p) {
      if (p.status === 'arsip') return false;
      var j = job(p.id), ai = j && j.file && p.model === j.file;
      if (S.f === 'belum' && p.model && !ai) return false;
      if (S.f === 'jalan' && !isRun(j)) return false;
      if (S.f === 'selesai' && !(j && j.status === 'selesai')) return false;
      if (S.cat !== 'semua' && p.cat !== S.cat) return false;
      if (q && (p.name + ' ' + p.id + ' ' + p.type).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  var mmss = function (ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };

  /* ---------------------------------------------------------------- tampilan */
  function css() { if (S.cssOn && C.root.querySelector('style[data-ai3d]')) return; var st = document.createElement('style'); st.setAttribute('data-ai3d', ''); st.textContent = CSS; C.root.appendChild(st); S.cssOn = true; }
  function slotsHTML(p) {
    var v = views(p), open = S.open === p.id;
    return '<div class="ai-slots">' + VIEWS.map(function (l, i) {
      return '<div class="ai-slot' + (v[i] ? ' is-fill' : '') + (open && S.slot === i ? ' is-act' : '') + '"><button type="button" data-act="ai-slot" data-id="' + C.esc(p.id) + '" data-i="' + i + '" title="' + l + (i ? ' (opsional)' : ' (wajib)') + '">' +
        (v[i] ? '<img src="' + C.esc(src(v[i])) + '" alt="" loading="lazy">' : (i ? '+' : ic2('img'))) + '</button>' +
        '<button class="ai-clr" type="button" data-act="ai-clr" data-id="' + C.esc(p.id) + '" data-i="' + i + '" aria-label="Kosongkan">' + ic2('x') + '</button><em>' + l + '</em></div>';
    }).join('') + '</div>';
  }
  function statusHTML(p) {
    var j = job(p.id);
    if (!j) return '<div><span class="chk"></span><span class="muted">Belum dibuat</span></div>';
    if (isRun(j)) return '<div><span class="ai-spin"></span><span>' + LABEL[j.status] + (j.status === 'antri' && j.queue != null ? ' · #' + (j.queue + 1) : '') + '</span></div>' +
      '<div class="ai-bar"></div><small>' + (j.multi ? j.nviews + ' foto · multiview' : '1 foto') + ' · <span data-ai-el="' + C.esc(p.id) + '">' + mmss(Date.now() - j.started) + '</span></small>';
    if (j.status === 'selesai') {
      var inf = j.info || {}, sz = inf.size_cm ? inf.size_cm.map(Math.round).join(' × ') + ' cm' : '';
      return '<div><span class="chk is-on">' + C.ic('check') + '</span><span>Selesai</span></div><small>' + [sz, inf.kb ? (inf.kb / 1024).toFixed(1) + ' MB' : '', j.done ? C.dt(j.done) : ''].filter(Boolean).join(' · ') + '</small>';
    }
    if (j.status === 'batal') return '<div><span class="chk"></span><span class="muted">Dibatalkan</span></div>';
    return '<div><span class="pill pill--bad">Gagal</span></div><div class="ai-err">' + C.esc(j.error || '') + '</div>' + (j.last ? '<small>Hasil sebelumnya masih ada</small>' : '');
  }
  function actsHTML(p) {
    var j = job(p.id), id = C.esc(p.id), h = '', c = cost();
    var done = j && (j.status === 'selesai' ? j.file : j.last && j.last.file);
    if (isRun(j)) h += (j.status === 'tunggu' || j.status === 'antri' ? '<button class="btn btn--sm btn--ghost" type="button" data-act="ai-cancel" data-id="' + id + '">Batal</button>' : '');
    else h += (c != null ? '<span class="ai-cost">$' + c.toFixed(2) + '</span>' : '') + '<button class="btn btn--sm btn--dark" type="button" data-act="ai-run" data-id="' + id + '">' + ic2('play') + (j && j.status === 'selesai' ? 'Run ulang' : 'Run') + '</button>';
    if (done) {
      var on = p.model === done;
      h += '<button class="ibtn" type="button" data-act="ai-view" data-id="' + id + '" title="Lihat 3D">' + ic2('eye') + '</button>' +
        '<button class="tg' + (on ? ' is-on' : '') + '" type="button" data-act="ai-use" data-id="' + id + '" title="Pakai model ini di situs"><span class="sw"></span>Di situs</button>' +
        (on ? '<button class="ibtn" type="button" data-act="ai-rot" data-id="' + id + '" title="Putar 90° di situs (sekarang ' + (+p.modelRot || 0) + '°)">' + ic2('rot') + '</button>' : '');
    }
    return h;
  }
  function panelHTML(p) {
    var v = views(p);
    return '<div class="ai-panel"><p>Klik kotak <b>' + VIEWS[S.slot] + '</b> di atas lalu pilih foto di bawah. Foto terbaik: latar polos, produk utuh, sudut lurus (bukan foto ruangan). ' +
      'Depan wajib — Kiri, Belakang, Kanan opsional dan diisi berurutan (multiview lebih akurat' + (S.cfg && S.cfg.models && S.cfg.models[S.cfg.model] && !S.cfg.models[S.cfg.model].multi ? '; model sekarang hanya memakai foto Depan' : '') + ').</p>' +
      '<div class="ai-gal">' + photos(p).map(function (ph) {
        var at = v.indexOf(ph.u), up = ph.tag === 'Upload';
        return '<div class="ai-ph"><button type="button" data-act="ai-pick" data-id="' + C.esc(p.id) + '" data-u="' + C.esc(ph.u) + '" style="display:block;width:100%;height:100%"><img src="' + C.esc(src(ph.u)) + '" alt="" loading="lazy"></button>' +
          (at >= 0 ? '<b>' + VIEWS[at] + '</b>' : '') + (ph.tag ? '<i>' + C.esc(ph.tag) + '</i>' : '') +
          (up ? '<button class="ai-del" type="button" data-act="ai-delup" data-id="' + C.esc(p.id) + '" data-u="' + C.esc(ph.u) + '" aria-label="Hapus upload">' + ic2('x') + '</button>' : '') + '</div>';
      }).join('') +
      '<label class="ai-up">' + ic2('img') + 'Upload foto<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-plug="' + ID + '" data-ai="up" data-id="' + C.esc(p.id) + '"></label></div></div>';
  }
  function rowHTML(p) {
    var cats = (window.XV && XV.CATEGORIES) || [], cat = cats.filter(function (c) { return c.id === p.cat; })[0], id = C.esc(p.id);
    var other = p.model && !(job(p.id) && (p.model === job(p.id).file));
    return '<div class="tr tr--ai ai-row' + (S.open === p.id ? ' is-open' : '') + '" data-ai-row="' + id + '">' +
      '<div class="prod" style="cursor:pointer" data-act="ai-open" data-id="' + id + '"><div class="thumb"><img src="' + C.esc(src(p.img)) + '" alt="" loading="lazy"></div><div><b>' + C.esc(p.name) + '</b><span>' + C.esc(cat ? cat.label : p.cat) + ' · ' + C.esc(p.dims || 'ukuran belum ada') + '</span>' +
        (other ? '<span class="pill" style="margin-top:4px">Sudah ada 3D</span>' : '') + '</div></div>' +
      slotsHTML(p) +
      '<div class="ai-st" data-ai-st="' + id + '">' + statusHTML(p) + '</div>' +
      '<div class="ai-acts" data-ai-acts="' + id + '">' + actsHTML(p) + '</div>' +
      (S.open === p.id ? panelHTML(p) : '') + '</div>';
  }
  function render(ctx) {
    C = ctx; css();
    if (!S.cfg) { loadCfg().then(function () { if (C.shown(ID)) render(C); }); }
    if (!S.loaded) { loadJobs().then(function () { if (C.shown(ID)) render(C); }); }
    var c = S.cfg || {}, m = c.models && c.models[c.model], all = C.products().filter(function (p) { return p.status !== 'arsip'; });
    var nNo = all.filter(function (p) { return !p.model; }).length, nDone = Object.keys(S.jobs).filter(function (k) { return S.jobs[k].status === 'selesai'; }).length;
    var nRun = Object.keys(S.jobs).filter(function (k) { return isRun(S.jobs[k]); }).length;
    C.head('07 · 3D AI', '3D katalog', nNo + ' produk belum punya model 3D · ' + nDone + ' selesai dibuat AI' + (nRun ? ' · ' + nRun + ' sedang berjalan' : '') + '. Cek foto tiap produk, upload bila kurang bagus, lalu Run. Hasil baru tampil di situs setelah Anda menyalakan <b>Di situs</b>.',
      '<button class="btn" type="button" data-act="ai-set">' + C.ic('set') + 'Model &amp; key</button>');
    var cats = (window.XV && XV.CATEGORIES) || [];
    var h = '<div class="ai-sum">' +
      (c.error ? '<span class="pill pill--bad">' + C.esc(c.error) + '</span>' :
        (c.hasKey ? '<span class="pill pill--ok">Key fal.ai tersimpan</span>' : '<span class="pill pill--warn">Key fal.ai belum diisi — buka Model &amp; key</span>') +
        (m ? '<span class="pill pill--gold">' + C.esc(m.l) + ' · tekstur ' + (c.texture === 'detailed' ? 'detail' : 'standar') + (m.geo && c.geometry === 'detailed' ? ' · geometri detail' : '') + ' · $' + cost().toFixed(2) + '/model</span>' : '') +
        (c.blender === false ? '<span class="pill pill--bad">Blender tidak ditemukan</span>' : '')) + '</div>';
    h += '<div class="bar"><input class="in in--search" type="search" placeholder="Cari produk…" value="' + C.esc(S.q) + '" data-plug="' + ID + '" data-ai="q">' +
      '<select class="sel" data-plug="' + ID + '" data-ai="cat"><option value="semua">Semua kategori</option>' + cats.map(function (k) { return '<option value="' + k.id + '"' + (S.cat === k.id ? ' selected' : '') + '>' + C.esc(k.label) + '</option>'; }).join('') + '</select>' +
      '<div class="seg">' + [['belum', 'Belum 3D'], ['jalan', 'Berjalan'], ['selesai', 'Selesai'], ['semua', 'Semua']].map(function (o) { return '<button type="button" data-act="ai-f" data-v="' + o[0] + '"' + (S.f === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>' +
      '<span class="muted" data-ai-n>' + list().length + ' ditampilkan</span></div>';
    var L = list();
    h += '<div class="tbl tbl--ai"><div class="tr tr--ai th"><span>Produk</span><span>Foto untuk AI</span><span>Status</span><span style="text-align:right">Aksi</span></div>' +
      (L.length ? L.map(rowHTML).join('') : '<div class="empty">' + (S.loaded ? 'Tidak ada produk.' : 'Memuat…') + '</div>') + '</div>';
    var top = C.el.body.scrollTop;
    C.el.body.innerHTML = h; C.el.body.scrollTop = top;
  }
  function refreshRow(id) {
    var row = C.root.querySelector('[data-ai-row="' + id + '"]'), p = byId(id); if (!row || !p) return;
    var st = row.querySelector('[data-ai-st]'), ac = row.querySelector('[data-ai-acts]');
    if (st) st.innerHTML = statusHTML(p); if (ac) ac.innerHTML = actsHTML(p);
  }
  function redrawRow(id) {
    var row = C.root.querySelector('[data-ai-row="' + id + '"]'), p = byId(id); if (!row || !p) return;
    var t = document.createElement('div'); t.innerHTML = rowHTML(p); row.replaceWith(t.firstChild);
  }
  var byId = function (id) { return C.products().filter(function (p) { return p.id === id; })[0]; };

  /* ---------------------------------------------------------------- pengaturan */
  function setCard(ctx) {
    C = ctx; css();
    if (!S.cfg) { loadCfg().then(function () { if (C.shown('pengaturan')) C.render(); }); return '<div class="card set"><h3>3D AI · fal.ai</h3><p>Memuat…</p></div>'; }
    var c = S.cfg;
    if (c.error) return '<div class="card set"><h3>3D AI · fal.ai</h3><p>' + C.esc(c.error) + '</p></div>';
    var m = c.models[c.model];
    return '<div class="card set" style="grid-column:1/-1"><h3>3D AI · fal.ai (Tripo)</h3>' +
      '<p>Key fal.ai disimpan di <span class="mono">data/private/ai3d.json</span> di komputer ini saja — tidak ikut online, tidak dikirim balik ke browser, dan tidak bisa dilihat lagi setelah disimpan.</p>' +
      '<div class="ai-key"><input class="in" type="password" autocomplete="off" spellcheck="false" placeholder="' + (c.hasKey ? 'Ganti key fal.ai…' : 'Tempel key fal.ai di sini') + '" data-plug="' + ID + '" data-ai="key">' +
        '<button class="btn btn--dark" type="button" data-act="ai-key-save">' + C.ic('check') + 'Simpan</button>' +
        '<button class="btn" type="button" data-act="ai-key-test"' + (c.hasKey ? '' : ' disabled') + '>Tes</button></div>' +
      '<div class="ai-ks">' + (c.hasKey ? '<span class="pill pill--ok">Key tersimpan · ••••' + C.esc(c.keyTail) + '</span><button class="btn btn--sm btn--ghost btn--danger" type="button" data-act="ai-key-del">' + C.ic('trash') + 'Hapus key</button>' : '<span class="pill pill--warn">Belum ada key</span>') + '</div>' +
      '<div class="ai-models">' + Object.keys(c.models).map(function (k) {
        var x = c.models[k];
        return '<button type="button" data-act="ai-model" data-v="' + k + '"' + (c.model === k ? ' class="is-on"' : '') + '><b>' + C.esc(x.l) + '<i>$' + x.cost.standard.toFixed(2) + '</i></b><span>' + C.esc(x.d) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="ai-opt"><span>Tekstur</span><div class="seg">' + [['standard', 'Standar'], ['detailed', 'Detail']].map(function (o) { return '<button type="button" data-act="ai-tex" data-v="' + o[0] + '"' + (c.texture === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>' +
        (m && m.geo ? '<span>Geometri</span><div class="seg">' + [['standard', 'Standar'], ['detailed', 'Detail +$0.20']].map(function (o) { return '<button type="button" data-act="ai-geo" data-v="' + o[0] + '"' + (c.geometry === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>' : '') +
        '<span>Biaya</span><span><b>$' + cost().toFixed(2) + '</b> per model (ditagih fal.ai)</span></div></div>';
  }
  function saveCfg(o) { return api('PUT', 'config', o).then(function (r) { if (!r.ok) C.toast(r.error || 'Gagal'); return loadCfg(); }).then(function () { C.render(); }); }

  /* ---------------------------------------------------------------- foto */
  function saveSel(id, v) { S.sel[id] = v; api('PUT', 'sel/' + id, { views: v }); }
  function shrink(file) {   // foto upload diperkecil (maks 1600 px, WEBP) → cepat dikirim ke fal.ai
    return new Promise(function (res) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
        cv.toBlob(function (b) { res(b || file); }, 'image/webp', .92);
      };
      im.onerror = function () { URL.revokeObjectURL(u); res(file); };
      im.src = u;
    });
  }
  function upload(id, files) {
    C.toast('Mengunggah ' + files.length + ' foto…');
    var got = [];
    return files.reduce(function (pr, f) {
      return pr.then(function () { return shrink(f); }).then(function (b) { return api('POST', 'upload/' + id, null, b); }).then(function (r) { if (r.ok) got.push(r.url); else C.toast(r.error || 'Upload gagal'); });
    }, Promise.resolve()).then(function () {
      S.uploads[id] = (S.uploads[id] || []).concat(got);
      if (got.length) { var p = byId(id), v = views(p).slice(); v[S.slot] = got[0]; saveSel(id, v); S.slot = nextSlot(v, S.slot); }
      redrawRow(id); if (got.length) C.toast(got.length + ' foto ditambahkan');
    });
  }
  function nextSlot(v, from) { for (var i = 1; i <= 4; i++) { var k = (from + i) % 4; if (!v[k]) return k; } return from; }

  /* ---------------------------------------------------------------- lihat 3D */
  function viewer(id) {
    var p = byId(id), j = job(id); if (!p || !j) return;
    var file = j.status === 'selesai' ? j.file : j.last && j.last.file, inf = j.status === 'selesai' ? j.info || {} : {};
    close3d();
    if (!customElements.get('model-viewer')) { var s = document.createElement('script'); s.type = 'module'; s.src = MV; document.head.appendChild(s); }
    var wrap = document.createElement('div'); wrap.className = 'ai-mod';
    var used = (j.views || []).filter(Boolean);
    wrap.innerHTML = '<div class="ai-mod__b"><button class="ai-x" type="button" data-act="ai-close" aria-label="Tutup">' + C.ic('close') + '</button>' +
      '<model-viewer src="' + C.esc(C.ROOT + file) + '?t=' + (j.done || Date.now()) + '" camera-controls auto-rotate shadow-intensity="1" exposure="1.05" environment-image="neutral" camera-orbit="30deg 70deg auto" alt="Model 3D ' + C.esc(p.name) + '"></model-viewer>' +
      '<aside><div><p class="eyebrow">Hasil 3D AI</p><h3>' + C.esc(p.name) + '</h3></div>' +
        '<dl>' + (inf.size_cm ? '<dt>Ukuran</dt><dd>' + inf.size_cm.map(Math.round).join(' × ') + ' cm</dd>' : '') + '<dt>Ukuran produk</dt><dd>' + C.esc(p.dims || '—') + '</dd>' +
          (inf.tris_out ? '<dt>Segitiga</dt><dd>' + inf.tris_out.toLocaleString('id-ID') + '</dd>' : '') + (inf.kb ? '<dt>File</dt><dd>' + (inf.kb / 1024).toFixed(1) + ' MB</dd>' : '') +
          '<dt>Model AI</dt><dd>' + C.esc(j.endpoint || '') + '</dd>' + (j.cost ? '<dt>Biaya</dt><dd>$' + j.cost.toFixed(2) + '</dd>' : '') + '<dt>File situs</dt><dd class="mono">' + C.esc(file) + '</dd></dl>' +
        (used.length ? '<div><p class="eyebrow" style="margin:0 0 6px">Foto yang dipakai</p><div class="ai-pv">' + used.map(function (u) { return '<img src="' + C.esc(src(u)) + '" alt="">'; }).join('') + '</div></div>' : '') +
        (j.preview ? '<div><p class="eyebrow" style="margin:0 0 6px">Render Tripo</p><img src="' + C.esc(C.ROOT + j.preview) + '" alt="" style="width:100%;border-radius:10px;background:var(--ivory2)"></div>' : '') +
        '<div class="ai-acts" style="justify-content:flex-start" data-ai-acts="' + C.esc(id) + '">' + actsHTML(p) + '</div>' +
      '</aside></div>';
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close3d(); });
    C.root.appendChild(wrap); S.view = id;
    setTimeout(function () { if (!customElements.get('model-viewer')) { var mv = wrap.querySelector('model-viewer'); if (mv && !customElements.get('model-viewer')) mv.outerHTML = '<div class="ai-none">Penampil 3D tidak bisa dimuat (butuh internet untuk model-viewer).<br>File: ' + C.esc(file) + '</div>'; } }, 8000);
  }
  function close3d() { var m = C && C.root.querySelector('.ai-mod'); if (m) m.remove(); S.view = null; }

  /* ---------------------------------------------------------------- aksi */
  function click(t, e, ctx) {
    C = ctx; var a = t.dataset.act, id = t.dataset.id, p = id && byId(id);
    if (a === 'ai-set') { var tb = C.root.querySelector('[data-tab="pengaturan"]'); if (tb) tb.click(); return; }
    if (a === 'ai-f') { S.f = t.dataset.v; render(C); return; }
    if (a === 'ai-open') { S.open = S.open === id ? null : id; S.slot = 0; render(C); return; }
    if (a === 'ai-slot') {
      var i = +t.dataset.i;
      if (S.open !== id) { S.open = id; S.slot = i; render(C); return; }
      S.slot = i; redrawRow(id); return;
    }
    if (a === 'ai-clr') { var v0 = views(p).slice(); v0[+t.dataset.i] = null; saveSel(id, v0); S.slot = +t.dataset.i; redrawRow(id); return; }
    if (a === 'ai-pick') {
      var v = views(p).slice(), u = t.dataset.u, was = v.indexOf(u);
      if (was >= 0 && was !== S.slot) v[was] = null;
      v[S.slot] = u; saveSel(id, v); S.slot = nextSlot(v, S.slot); redrawRow(id); return;
    }
    if (a === 'ai-delup') {
      var fn = t.dataset.u.split('/').pop();
      api('DELETE', 'upload/' + id + '/' + fn).then(function () {
        S.uploads[id] = (S.uploads[id] || []).filter(function (x) { return x !== t.dataset.u; });
        var v2 = views(p).map(function (x) { return x === t.dataset.u ? null : x; }); saveSel(id, v2); redrawRow(id);
      });
      return;
    }
    if (a === 'ai-run') {
      if (!S.cfg || !S.cfg.hasKey) { C.toast('Isi key fal.ai dulu (Model & key)'); return; }
      var vv = views(p); if (!vv[0]) { C.toast('Pilih foto Depan dulu'); S.open = id; S.slot = 0; render(C); return; }
      t.disabled = true;
      api('POST', 'run/' + id, { views: vv.map(forFal), dims: p.dims || '' }).then(function (r) {
        if (!r.ok) { C.toast(r.error || 'Gagal'); t.disabled = false; return; }
        S.jobs[id] = r.job; if (!S.sel[id]) saveSel(id, vv);
        refreshRow(id); C.toast('Run · ' + p.name); tick();
      });
      return;
    }
    if (a === 'ai-cancel') { api('POST', 'cancel/' + id).then(function () { return loadJobs(); }).then(function () { refreshRow(id); }); return; }
    if (a === 'ai-view') { viewer(id); return; }
    if (a === 'ai-close') { close3d(); return; }
    if (a === 'ai-use') {
      var j = job(id), file = j && (j.status === 'selesai' ? j.file : j.last && j.last.file); if (!file) return;
      if (p.model === file) { p.model = p.modelPrev || ''; delete p.modelPrev; C.toast('Model AI dilepas dari situs'); }
      else {
        if (p.model && !t.dataset.armed) { t.dataset.armed = '1'; t.lastChild.textContent = 'Ganti 3D lama? klik lagi'; return; }
        if (p.model) p.modelPrev = p.model;
        p.model = file; C.toast('Model AI dipakai di situs · ' + p.name);
      }
      C.saveProducts(true); refreshRow(id); var ac = C.root.querySelector('.ai-mod [data-ai-acts]'); if (ac) ac.innerHTML = actsHTML(p);
      return;
    }
    if (a === 'ai-rot') { p.modelRot = ((+p.modelRot || 0) + 90) % 360; C.saveProducts(true); refreshRow(id); C.toast('Putar di situs: ' + p.modelRot + '°'); return; }
    // pengaturan
    if (a === 'ai-key-save') {
      var k = (S.key || '').trim(); if (!k) { C.toast('Tempel key dulu'); return; }
      S.key = ''; saveCfg({ key: k }).then(function () { C.toast('Key tersimpan'); }); return;
    }
    if (a === 'ai-key-test') { api('POST', 'test').then(function (r) { C.toast(r.ok ? 'Key diterima fal.ai ✓' : r.error || 'Key ditolak fal.ai (' + r.code + ')'); }); return; }
    if (a === 'ai-key-del') { if (!t.dataset.armed) { t.dataset.armed = '1'; t.lastChild.textContent = 'Yakin? klik lagi'; return; } saveCfg({ clearKey: true }).then(function () { C.toast('Key dihapus'); }); return; }
    if (a === 'ai-model') { saveCfg({ model: t.dataset.v }); return; }
    if (a === 'ai-tex') { saveCfg({ texture: t.dataset.v }); return; }
    if (a === 'ai-geo') { saveCfg({ geometry: t.dataset.v }); return; }
  }
  function input(t, e, ctx) {
    C = ctx;
    if (t.dataset.ai === 'key') { S.key = t.value; return; }
    if (t.dataset.ai === 'q') {
      S.q = t.value; clearTimeout(input.t);
      input.t = setTimeout(function () { var pos = t.selectionStart; render(C); var n = C.root.querySelector('[data-ai="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} } }, 250);
    }
  }
  function change(t, e, ctx) {
    C = ctx;
    if (t.dataset.ai === 'cat') { S.cat = t.value; render(C); return; }
    if (t.dataset.ai === 'up') { var fs = Array.prototype.slice.call(t.files || []); if (fs.length) upload(t.dataset.id, fs); return; }
  }

  /* ---------------------------------------------------------------- loading otomatis */
  var timer = 0;
  function tick() {
    clearTimeout(timer);
    var running = Object.keys(S.jobs).some(function (k) { return isRun(S.jobs[k]); });
    if (!C) return;
    if (C.shown(ID) || running) {
      loadJobs().then(function (ch) {
        if (ch && C.shown(ID)) ch.forEach(function (id) { if (C.root.querySelector('[data-ai-row="' + id + '"]')) refreshRow(id); });
        if (ch && ch.length && C.root) {
          ch.forEach(function (id) { var j = S.jobs[id]; if (j.status === 'selesai' && j.done && Date.now() - j.done < 15000) C.toast('3D selesai · ' + ((byId(id) || {}).name || id)); if (j.status === 'gagal') C.toast('Gagal · ' + ((byId(id) || {}).name || id)); });
          C.renderTabs();
        }
      });
    }
    timer = setTimeout(tick, running ? 3000 : 10000);
  }
  setInterval(function () {   // jam berjalan
    if (!C || !C.shown(ID)) return;
    Array.prototype.forEach.call(C.root.querySelectorAll('[data-ai-el]'), function (n) { var j = S.jobs[n.dataset.aiEl]; if (j && isRun(j)) n.textContent = mmss(Date.now() - j.started); });
  }, 1000);

  XVDevkit.add({
    id: ID, l: '3D katalog', icon: ICON, prefix: 'ai-',
    init: function (ctx) { C = ctx; loadCfg(); loadJobs().then(tick); },
    count: function (ctx) {
      var n = 0, r = 0; Object.keys(S.jobs).forEach(function (k) { if (S.jobs[k].status === 'selesai') n++; if (isRun(S.jobs[k])) r++; });
      return r ? r + ' jalan' : n || '';
    },
    render: render, click: click, input: input, change: change, setCard: setCard
  });
})();
