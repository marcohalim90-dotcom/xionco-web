/* ==========================================================================
   XIONCO — Developer Settings
   Tombol melayang (default kiri bawah) → overlay hampir layar penuh yang
   bergeser dari kanan ke kiri. Tidak membuka halaman baru.
   Tab: Versi · Aset · Katalog · Custom · Harga · (tab tambahan) · Pengaturan
   Tab tambahan dari file lain lewat XVDevkit.add({...}) — mis. shared/devkit/ai3d.js (3D katalog, lokal saja),
   shared/devkit/links.js (Link & penawaran, lokal saja), shared/devkit/wood.js (Kayu koleksi, lokal saja).
   Gaya mengikuti versi 4 (ivory, garis champagne, Josefin Sans + Inter).
   Komponen terisolasi (Shadow DOM) → aman dipasang di versi mana pun.
   Pintasan: Ctrl + Shift + D
   ========================================================================== */
(function () {
  'use strict';
  if (window.__xvDevkit) return;
  window.__xvDevkit = true;

  var SCRIPT = document.currentScript;
  var ROOT = ((SCRIPT && SCRIPT.src) || '').replace(/shared\/devkit\/devkit\.js(\?.*)?$/, '');
  // situs online: tombol hanya untuk pemilik. Aktifkan sekali dengan ?dev (nonaktifkan dengan ?dev=0).
  var LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/.test(location.hostname);
  var DEV_KEY = 'xionco.dev';
  (function () {
    try {
      var q = new URLSearchParams(location.search);
      if (q.has('dev')) {
        localStorage.setItem(DEV_KEY, q.get('dev') === '0' ? '0' : '1');
        q.delete('dev');
        var rest = q.toString();
        history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
      }
    } catch (e) {}
  })();
  function devAllowed() { if (LOCAL) return true; try { return localStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; } }
  var ROOT_PATH = (function () { try { return decodeURIComponent(new URL(ROOT).pathname); } catch (e) { return '/'; } })();

  /* ---------------------------------------------------------------- util */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rupiah = function (n) { return n == null || n === '' || isNaN(n) ? '—' : 'IDR ' + Math.round(n).toLocaleString('id-ID'); };
  var num = function (v) { if (v == null) return null; var s = String(v).replace(/[^\d]/g, ''); return s ? +s : null; };
  var fmt = function (n) { return n == null || n === '' ? '' : Math.round(n).toLocaleString('id-ID'); };
  var dt = function (t) { if (!t) return '—'; var d = new Date(t); return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); };
  function loadScript(src) {
    return new Promise(function (res) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  }
  function ensureFonts() {
    if (document.querySelector('link[data-xvdk-font]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.setAttribute('data-xvdk-font', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600&family=Inter:wght@400;500&display=swap';
    document.head.appendChild(l);
  }
  function download(name, text, type) {
    var b = new Blob([text], { type: type || 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    root.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csv(rows) {
    return rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
  }

  /* ---------------------------------------------------------------- ikon */
  var I = {
    dev: '<path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5M13.5 5l-3 14"/>',
    versi: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
    aset: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12.5 2.7 2.7L16 9.8"/>',
    katalog: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    custom: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    set: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    reset: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4v4h4"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
    open: '<path d="M14 5h5v5M19 5l-8 8M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
    scan: '<path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M4 12h16"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    dup: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    harga: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.6"/>'
  };
  var ic = function (n, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; };

  /* ---------------------------------------------------------------- gaya */
  var CSS = [
    ':host { all: initial; cursor: auto !important; }',
    '*, *::before, *::after { box-sizing: border-box; cursor: inherit; }',
    ':host { --ink:#0f0c0a; --ink2:#16120f; --ivory:#ece5d9; --ivory2:#e3dacb; --ivory3:#d6cbb8; --tl:#1b1815; --tl2:#5c544a; --tl3:#8d8478; --td:#ece5d8; --td2:#a39a8b; --td3:#6f675c;',
    '  --gold:#bfa274; --goldhi:#dcc59c; --goldlo:#8c7550; --hair:rgba(27,24,21,.12); --haird:rgba(236,229,216,.12); --ok:#5f7d4f; --warn:#a5763e; --bad:#a5523e;',
    '  --f:"Inter","Segoe UI",system-ui,sans-serif; --fh:"Josefin Sans","Inter","Segoe UI",sans-serif; --ease:cubic-bezier(.22,1,.36,1); }',
    'button, input, select, textarea { font: inherit; color: inherit; }',
    'button { background: none; border: 0; padding: 0; cursor: pointer; }',
    'a { color: inherit; }',
    '.ic { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; flex: none; }',
    /* tombol melayang */
    '.fab { position: fixed; z-index: 3; width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; color: var(--td);',
    '  background: linear-gradient(180deg, rgba(34,29,24,.82), rgba(18,15,12,.78)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);',
    '  border: 1px solid rgba(220,197,156,.2); box-shadow: inset 0 1px 0 rgba(255,240,220,.06), 0 18px 50px rgba(0,0,0,.45); touch-action: none;',
    '  transition: left .5s var(--ease), top .5s var(--ease), transform .4s var(--ease), border-color .3s, color .3s; }',
    '.fab:hover { border-color: var(--gold); color: var(--goldhi); transform: translateY(-2px); }',
    '.fab.is-drag { transition: transform .4s var(--ease); }',
    '.fab.is-hidden { display: none; }',
    '.fab.is-under { opacity: 0; pointer-events: none; transform: scale(.8); }',
    '.fab .ic { width: 20px; height: 20px; }',
    '.fab__tip { position: absolute; white-space: nowrap; padding: 7px 10px 5px; border-radius: 8px; background: var(--ink2); color: var(--td); font: 400 9.5px/1 var(--fh); letter-spacing: .22em; text-transform: uppercase; opacity: 0; pointer-events: none; transition: opacity .3s; }',
    '.fab[data-pos^="b"] .fab__tip { bottom: calc(100% + 10px); } .fab[data-pos^="t"] .fab__tip { top: calc(100% + 10px); }',
    '.fab[data-pos$="l"] .fab__tip { left: 0; } .fab[data-pos$="r"] .fab__tip { right: 0; }',
    '.fab:hover .fab__tip { opacity: 1; }',
    /* overlay */
    '.scrim { position: fixed; inset: 0; z-index: 1; background: rgba(10,8,6,.5); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: opacity .7s var(--ease); }',
    '.scrim.is-on { opacity: 1; pointer-events: auto; }',
    '.dk { position: fixed; z-index: 2; top: 14px; right: 14px; bottom: 14px; left: max(14px, 4.5vw); display: grid; grid-template-columns: 236px 1fr; border-radius: 22px; overflow: hidden;',
    '  background: var(--ivory); color: var(--tl); font: 400 13.5px/1.6 var(--f); -webkit-font-smoothing: antialiased; box-shadow: 0 50px 120px rgba(0,0,0,.55);',
    '  transform: translateX(calc(100% + 60px)); visibility: hidden; transition: transform .85s var(--ease), visibility 0s .85s; }',
    '.dk.is-open { transform: none; visibility: visible; transition: transform .85s var(--ease), visibility 0s; }',
    /* sidebar */
    '.side { display: flex; flex-direction: column; padding: 26px 16px 18px; background: var(--ink2); color: var(--td); }',
    '.brand { display: flex; flex-direction: column; gap: 10px; padding: 0 10px 26px; border-bottom: 1px solid var(--haird); }',
    '.brand svg { width: 96px; height: auto; fill: var(--td); }',
    '.brand span { font: 400 9.5px/1 var(--fh); letter-spacing: .32em; text-transform: uppercase; color: var(--gold); }',
    '.tabs { display: flex; flex-direction: column; gap: 2px; margin-top: 18px; }',
    '.tab { position: relative; display: flex; align-items: center; gap: 14px; height: 44px; padding: 0 12px; border-radius: 10px; color: var(--td2); text-align: left; transition: background .3s, color .3s; }',
    '.tab span { flex: 1; padding-top: 2px; font: 400 11px/1 var(--fh); letter-spacing: .22em; text-transform: uppercase; }',
    '.tab b { font: 500 10px/1 var(--f); color: var(--td3); }',
    '.tab:hover { color: var(--td); background: rgba(236,229,216,.05); }',
    '.tab.is-on { color: var(--td); background: rgba(191,162,116,.12); }',
    '.tab.is-on::after { content: ""; position: absolute; right: -16px; top: 12px; bottom: 12px; width: 2px; background: var(--goldhi); box-shadow: 0 0 8px rgba(191,162,116,.6); }',
    '.tab.is-on b { color: var(--goldhi); }',
    '.side__foot { margin-top: auto; padding: 16px 10px 0; border-top: 1px solid var(--haird); font: 400 11px/1.6 var(--f); color: var(--td3); }',
    '.side__foot b { display: block; font: 400 9px/1.4 var(--fh); letter-spacing: .26em; text-transform: uppercase; color: var(--td2); margin-bottom: 2px; }',
    /* konten */
    '.main { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; }',
    '.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 30px 84px 20px 36px; border-bottom: 1px solid var(--hair); }',
    '.head h2 { margin: 8px 0 0; font: 300 30px/1.1 var(--fh); letter-spacing: .05em; text-transform: uppercase; color: var(--tl); }',
    '.head p { margin: 8px 0 0; max-width: 62ch; color: var(--tl2); font-size: 13px; }',
    '.eyebrow { font: 400 10px/1.4 var(--fh); letter-spacing: .3em; text-transform: uppercase; color: var(--tl3); }',
    '.acts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }',
    '.body { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 36px 60px; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(140,117,80,.4) transparent; }',
    '.close { position: absolute; z-index: 5; top: 22px; right: 22px; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; color: var(--tl2); border: 1px solid var(--hair); transition: background .3s, color .3s; }',
    '.close:hover { background: var(--tl); color: var(--ivory); }',
    /* tombol & input */
    '.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 38px; padding: 2px 16px 0; border-radius: 999px; border: 1px solid rgba(27,24,21,.18); font: 400 10px/1 var(--fh); letter-spacing: .22em; text-transform: uppercase; color: var(--tl); white-space: nowrap; transition: background .3s, color .3s, border-color .3s; }',
    '.btn .ic { width: 14px; height: 14px; margin-top: -2px; }',
    '.btn:hover { background: var(--tl); color: var(--ivory); border-color: var(--tl); }',
    '.btn--dark { background: var(--tl); color: var(--ivory); border-color: var(--tl); }',
    '.btn--dark:hover { background: var(--goldlo); border-color: var(--goldlo); }',
    '.btn--ghost { border-color: transparent; color: var(--tl2); }',
    '.btn--danger:hover { background: var(--bad); border-color: var(--bad); }',
    '.btn--sm { height: 30px; padding: 2px 12px 0; font-size: 9px; }',
    '.ibtn { width: 32px; height: 32px; display: inline-grid; place-items: center; border-radius: 50%; color: var(--tl2); transition: background .3s, color .3s; }',
    '.ibtn:hover { background: rgba(27,24,21,.07); color: var(--tl); }',
    '.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-bottom: 18px; }',
    '.in, .sel, .ta { height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--hair); background: rgba(255,250,242,.35); color: var(--tl); font: 400 13px var(--f); outline: none; transition: border-color .3s, background .3s; }',
    '.ta { height: auto; min-height: 76px; padding: 10px 12px; resize: vertical; line-height: 1.5; }',
    '.in:focus, .sel:focus, .ta:focus { border-color: var(--tl); background: rgba(255,250,242,.7); }',
    '.in--search { width: 240px; }',
    '.in::-webkit-search-cancel-button { -webkit-appearance: none; }',
    '.sel { padding-right: 30px; -webkit-appearance: none; appearance: none; background-image: linear-gradient(45deg, transparent 50%, #5c544a 50%), linear-gradient(135deg, #5c544a 50%, transparent 50%); background-position: calc(100% - 15px) 16px, calc(100% - 11px) 16px; background-size: 4px 4px; background-repeat: no-repeat; }',
    '.seg { display: inline-flex; padding: 3px; border-radius: 999px; border: 1px solid var(--hair); }',
    '.seg button { padding: 8px 12px 6px; border-radius: 999px; font: 400 9.5px/1 var(--fh); letter-spacing: .2em; text-transform: uppercase; color: var(--tl3); transition: background .3s, color .3s; }',
    '.seg button.is-on { background: var(--tl); color: var(--ivory); }',
    '.chk { position: relative; width: 20px; height: 20px; border-radius: 6px; border: 1px solid rgba(27,24,21,.28); display: inline-grid; place-items: center; transition: background .25s, border-color .25s; }',
    '.chk .ic { width: 13px; height: 13px; stroke-width: 2; color: var(--ivory); opacity: 0; transform: scale(.6); transition: opacity .25s, transform .3s var(--ease); }',
    '.chk.is-on { background: var(--tl); border-color: var(--tl); }',
    '.chk.is-on .ic { opacity: 1; transform: none; }',
    '.chk.is-auto { background: var(--ok); border-color: var(--ok); }',
    '.pill { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 2px 9px 0; border-radius: 999px; font: 400 8.5px/1 var(--fh); letter-spacing: .2em; text-transform: uppercase; white-space: nowrap; border: 1px solid var(--hair); color: var(--tl2); }',
    '.pill--ok { color: var(--ok); border-color: rgba(95,125,79,.35); background: rgba(95,125,79,.08); }',
    '.pill--warn { color: var(--warn); border-color: rgba(165,118,62,.35); background: rgba(165,118,62,.08); }',
    '.pill--bad { color: var(--bad); border-color: rgba(165,82,62,.3); background: rgba(165,82,62,.06); }',
    '.pill--gold { color: var(--goldlo); border-color: rgba(140,117,80,.4); background: rgba(191,162,116,.12); }',
    '.pill--dark { color: var(--ivory); background: var(--tl); border-color: var(--tl); }',
    '.mono { font: 400 11.5px/1.4 ui-monospace, Consolas, monospace; color: var(--tl2); }',
    '.muted { color: var(--tl3); font-size: 12px; }',
    '.card { border: 1px solid var(--hair); border-radius: 16px; background: rgba(255,250,242,.28); }',
    /* versi */
    '.vlist { display: flex; flex-direction: column; gap: 10px; }',
    '.vrow { display: grid; grid-template-columns: 10px minmax(0, 1.3fr) 120px 120px minmax(0, 2fr) auto; align-items: center; gap: 18px; padding: 18px 20px; border: 1px solid var(--hair); border-radius: 16px; background: rgba(255,250,242,.28); transition: border-color .3s, background .3s; }',
    '.vrow:hover { border-color: rgba(27,24,21,.3); background: rgba(255,250,242,.55); }',
    '.vrow.is-here { border-color: var(--gold); background: rgba(191,162,116,.1); }',
    '.vdot { width: 8px; height: 8px; border-radius: 50%; background: var(--ivory3); }',
    '.vrow.is-here .vdot { background: var(--gold); box-shadow: 0 0 0 4px rgba(191,162,116,.2); }',
    '.vname b { display: block; font: 400 15px/1.2 var(--fh); letter-spacing: .14em; text-transform: uppercase; padding-top: 2px; }',
    '.vname span { font-size: 12.5px; color: var(--tl2); }',
    '.vnote { font-size: 12.5px; color: var(--tl2); }',
    '.vnote .mono { display: block; margin-top: 4px; font-size: 10.5px; color: var(--tl3); }',
    '.howto { margin-top: 26px; padding: 22px 24px; display: grid; grid-template-columns: 1fr auto; gap: 14px 24px; align-items: center; }',
    '.howto h3 { margin: 0 0 6px; font: 400 12px/1.3 var(--fh); letter-spacing: .22em; text-transform: uppercase; }',
    '.code { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--ink2); color: var(--td); font: 400 12px/1.4 ui-monospace, Consolas, monospace; }',
    '.code .ibtn { color: var(--td2); width: 28px; height: 28px; } .code .ibtn:hover { background: rgba(236,229,216,.08); color: var(--td); }',
    /* aset */
    '.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }',
    '.stat { padding: 16px 18px; }',
    '.stat b { display: block; font: 300 26px/1.1 var(--fh); letter-spacing: .03em; }',
    '.stat span { font: 400 9px/1.4 var(--fh); letter-spacing: .24em; text-transform: uppercase; color: var(--tl3); }',
    '.meter { height: 3px; margin-top: 10px; border-radius: 3px; background: var(--ivory3); overflow: hidden; }',
    '.meter i { display: block; height: 100%; background: var(--gold); transition: width .8s var(--ease); }',
    '.group__h { display: flex; align-items: baseline; gap: 12px; margin: 30px 0 12px; font: 400 11px/1.3 var(--fh); letter-spacing: .26em; text-transform: uppercase; color: var(--tl2); }',
    '.group__h small { font: 400 11px var(--f); letter-spacing: 0; text-transform: none; color: var(--tl3); }',
    '.item { margin-bottom: 12px; overflow: hidden; }',
    '.item__h { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto auto; gap: 16px; align-items: center; padding: 12px 16px; }',
    '.thumb { width: 54px; height: 54px; border-radius: 10px; background: var(--ivory2); display: grid; place-items: center; overflow: hidden; }',
    '.thumb img { width: 88%; height: 88%; object-fit: contain; mix-blend-mode: multiply; }',
    '.thumb img.is-photo { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: normal; }',
    '.item__n b { display: block; font: 400 13px/1.3 var(--fh); letter-spacing: .16em; text-transform: uppercase; padding-top: 2px; }',
    '.arows { border-top: 1px solid var(--hair); }',
    '.arow { display: grid; grid-template-columns: 20px minmax(150px, 1fr) minmax(150px, 1fr) minmax(0, 2.2fr) 150px; gap: 14px; align-items: center; padding: 10px 16px; border-top: 1px solid rgba(27,24,21,.06); }',
    '.arow:first-child { border-top: 0; }',
    '.arow__l b { display: block; font-weight: 500; font-size: 12.5px; }',
    '.arow__s { font-size: 11.5px; color: var(--tl2); }',
    '.arow__st { display: flex; justify-content: flex-end; }',
    /* tabel */
    '.tbl { border: 1px solid var(--hair); border-radius: 16px; overflow: hidden; }',
    '.tr { display: grid; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid rgba(27,24,21,.07); }',
    '.tr:first-child { border-top: 0; }',
    '.th { background: rgba(27,24,21,.04); font: 400 9px/1.3 var(--fh); letter-spacing: .24em; text-transform: uppercase; color: var(--tl3); padding-top: 12px; padding-bottom: 10px; }',
    '.tr--kat { grid-template-columns: minmax(220px, 2.2fr) 110px 150px 130px 64px 110px 64px 40px; }',
    '.tr--cus { grid-template-columns: 96px 110px minmax(160px, 2fr) minmax(130px, 1.4fr) 150px 140px 130px 40px; cursor: pointer; }',
    '.tr--cus:not(.th):hover { background: rgba(255,250,242,.55); }',
    '.prod { display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; min-width: 0; }',
    '.prod .thumb { width: 44px; height: 44px; border-radius: 8px; }',
    '.prod > div { min-width: 0; }',
    '.prod b { display: block; font: 400 12px/1.3 var(--fh); letter-spacing: .14em; text-transform: uppercase; padding-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.prod span { display: block; font-size: 11.5px; color: var(--tl3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.cell-in { width: 100%; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; font: 400 12.5px var(--f); color: var(--tl); outline: none; text-align: right; font-variant-numeric: tabular-nums; transition: border-color .3s, background .3s; }',
    '.cell-in:hover { border-color: var(--hair); }',
    '.cell-in:focus { border-color: var(--tl); background: rgba(255,250,242,.7); }',
    '.cell-in.is-price { font-weight: 500; }',
    '.cell-sel { height: 32px; font-size: 12px; padding: 0 26px 0 10px; background-position: calc(100% - 13px) 13px, calc(100% - 9px) 13px; }',
    '.empty { padding: 50px 20px; text-align: center; color: var(--tl3); }',
    /* laci editor */
    '.drawer { position: absolute; z-index: 4; top: 0; right: 0; bottom: 0; width: min(620px, 100%); display: flex; flex-direction: column; background: var(--ivory); border-left: 1px solid var(--hair); box-shadow: -30px 0 80px rgba(0,0,0,.18); transform: translateX(100%); transition: transform .7s var(--ease); }',
    '.drawer.is-wide { width: min(880px, 100%); }',
    '.drawer.is-open { transform: none; }',
    '.drawer__h { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 26px 84px 18px 28px; border-bottom: 1px solid var(--hair); }',
    '.drawer__h h3 { margin: 6px 0 0; font: 300 24px/1.15 var(--fh); letter-spacing: .05em; text-transform: uppercase; }',
    '.drawer__b { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 28px 30px; scrollbar-width: thin; }',
    '.drawer__f { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; padding: 16px 28px; border-top: 1px solid var(--hair); background: var(--ivory2); }',
    '.drawer__f > div { display: flex; gap: 8px; }',
    '.fs { padding: 18px 0 6px; border-bottom: 1px solid var(--hair); }',
    '.fs:last-child { border-bottom: 0; }',
    '.fs__h { margin-bottom: 14px; font: 400 10.5px/1.3 var(--fh); letter-spacing: .26em; text-transform: uppercase; color: var(--goldlo); }',
    '.grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px 14px; }',
    '.fl { display: flex; flex-direction: column; gap: 6px; grid-column: span 3; min-width: 0; }',
    '.fl.s1 { grid-column: span 1; } .fl.s2 { grid-column: span 2; } .fl.s4 { grid-column: span 4; } .fl.s6 { grid-column: span 6; }',
    '.fl > label { font: 400 9px/1.3 var(--fh); letter-spacing: .22em; text-transform: uppercase; color: var(--tl3); }',
    '.fl > label em { font-style: normal; color: var(--bad); }',
    '.fl .in, .fl .sel, .fl .ta { width: 100%; }',
    '.unit { position: relative; } .unit .in { padding-right: 38px; } .unit i { position: absolute; right: 12px; top: 11px; font: 400 11px var(--f); font-style: normal; color: var(--tl3); }',
    '.cg { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.cg button { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--hair); font-size: 12px; color: var(--tl2); transition: all .25s; }',
    '.cg button.is-on { background: var(--tl); color: var(--ivory); border-color: var(--tl); }',
    '.tg { display: inline-flex; align-items: center; gap: 10px; height: 38px; font-size: 12.5px; color: var(--tl2); }',
    '.sw { position: relative; width: 38px; height: 22px; border-radius: 999px; background: var(--ivory3); transition: background .3s; }',
    '.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--ivory); box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .35s var(--ease); }',
    '.tg.is-on .sw { background: var(--tl); } .tg.is-on .sw::after { transform: translateX(16px); }',
    '.est { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; padding: 16px 18px; border-radius: 14px; background: var(--ink2); color: var(--td); }',
    '.est b { display: block; font: 300 26px/1.1 var(--fh); letter-spacing: .03em; color: var(--goldhi); font-variant-numeric: tabular-nums; }',
    '.est span { font: 400 9px/1.4 var(--fh); letter-spacing: .24em; text-transform: uppercase; color: var(--td3); }',
    '.est p { margin: 0; max-width: 36ch; font-size: 11.5px; color: var(--td2); text-align: right; }',
    '.prev { width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: var(--ivory2); display: grid; place-items: center; overflow: hidden; }',
    '.prev img { max-width: 80%; max-height: 86%; object-fit: contain; mix-blend-mode: multiply; }',
    /* pengaturan */
    '.sets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }',
    '.set { padding: 22px 24px; }',
    '.set h3 { margin: 0 0 6px; font: 400 12px/1.3 var(--fh); letter-spacing: .22em; text-transform: uppercase; }',
    '.set p { margin: 0 0 16px; color: var(--tl2); font-size: 12.5px; }',
    '.corners { display: grid; grid-template-columns: repeat(2, 110px); gap: 8px; }',
    '.corners button { height: 54px; border-radius: 12px; border: 1px solid var(--hair); position: relative; font: 400 9px var(--fh); letter-spacing: .2em; text-transform: uppercase; color: var(--tl3); }',
    '.corners button::after { content: ""; position: absolute; width: 10px; height: 10px; border-radius: 3px; background: var(--ivory3); }',
    '.corners--2 { grid-template-columns: 1fr 1fr; } .corners--2 button::after { display: none; }',
    '.corners [data-pos="tl"]::after { left: 8px; top: 8px; } .corners [data-pos="tr"]::after { right: 8px; top: 8px; } .corners [data-pos="bl"]::after { left: 8px; bottom: 8px; } .corners [data-pos="br"]::after { right: 8px; bottom: 8px; }',
    '.corners button.is-on { border-color: var(--tl); color: var(--tl); } .corners button.is-on::after { background: var(--gold); }',
    '.keys { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 12.5px; color: var(--tl2); }',
    '.keys kbd { font: 400 11px ui-monospace, Consolas, monospace; padding: 3px 7px; border-radius: 6px; border: 1px solid var(--hair); background: rgba(255,250,242,.5); color: var(--tl); justify-self: start; }',
    /* harga */
    '.hp { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 26px; align-items: start; }',
    '.hp-nav { position: sticky; top: 0; display: flex; flex-direction: column; gap: 2px; padding: 10px; border: 1px solid var(--hair); border-radius: 16px; background: rgba(255,250,242,.28); max-height: calc(100vh - 230px); overflow-y: auto; scrollbar-width: thin; }',
    '.hp-nav__h { margin: 14px 10px 6px; font: 400 9px/1.3 var(--fh); letter-spacing: .26em; text-transform: uppercase; color: var(--goldlo); }',
    '.hp-nav button { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 34px; padding: 6px 10px; border-radius: 9px; text-align: left; font-size: 12.5px; color: var(--tl2); transition: background .25s, color .25s; }',
    '.hp-nav button:hover { background: rgba(27,24,21,.05); color: var(--tl); }',
    '.hp-nav button.is-on { background: var(--tl); color: var(--ivory); }',
    '.hp-nav button b { font: 500 10px var(--f); color: var(--goldlo); } .hp-nav button.is-on b { color: var(--goldhi); }',
    '.hp-main .group__h:first-of-type { margin-top: 22px; }',
    '.hp-est { margin-bottom: 4px; } .hp-est p { max-width: 46ch; }',
    '.tr--hp { grid-template-columns: minmax(180px, 1.7fr) minmax(120px, 1.1fr) 104px 150px 140px 36px; padding-top: 6px; padding-bottom: 6px; }',
    '.tr--hp > span { min-width: 0; font-size: 12.5px; }',
    '.tr--hp .r { text-align: right; font-variant-numeric: tabular-nums; }',
    '.tr--hp.tr--sub { background: rgba(191,162,116,.08); padding-top: 9px; padding-bottom: 7px; }',
    '.tr--hp.tr--sub > span:first-child { font: 400 10px/1.3 var(--fh); letter-spacing: .2em; text-transform: uppercase; color: var(--tl); }',
    '.tr--hp.tr--in .hp-opt { padding-left: 22px; color: var(--tl2); }',
    '.hp-opt { display: flex; align-items: center; gap: 8px; }',
    '.hp-sw { width: 12px; height: 12px; border-radius: 3px; flex: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }',
    '.hp-c { position: relative; display: block; } .hp-c i { position: absolute; right: 8px; top: 8px; font: 400 11px var(--f); font-style: normal; color: var(--tl3); pointer-events: none; }',
    '.hp-c .cell-in { border-color: var(--hair); background: rgba(255,250,242,.4); } .hp-c .is-f { padding-right: 22px; }',
    '.hp-c.is-mod .cell-in { border-color: var(--gold); background: rgba(191,162,116,.14); }',
    '@media (max-width: 1100px) { .hp { grid-template-columns: 1fr; } .hp-nav { position: static; max-height: 240px; } .tr--hp { grid-template-columns: minmax(140px, 1.5fr) 96px 130px 110px 32px; } .tr--hp > :nth-child(2) { display: none; } }',
    /* toast */
    '.toast { position: fixed; z-index: 6; left: 50%; bottom: 30px; transform: translate(-50%, 20px); opacity: 0; pointer-events: none; padding: 12px 20px 10px; border-radius: 999px; background: var(--ink2); color: var(--td); border: 1px solid rgba(191,162,116,.35); font: 400 10.5px/1 var(--fh); letter-spacing: .2em; text-transform: uppercase; transition: opacity .4s, transform .6s var(--ease); white-space: nowrap; }',
    '.toast.is-on { opacity: 1; transform: translate(-50%, 0); }',
    /* responsif */
    '@media (max-width: 1100px) { .tr--kat { grid-template-columns: minmax(180px, 2fr) 120px 110px 90px 40px; } .tr--kat > :nth-child(2), .tr--kat > :nth-child(5), .tr--kat > :nth-child(7) { display: none; } .tr--cus { grid-template-columns: 90px minmax(140px, 2fr) 130px 120px 36px; } .tr--cus > :nth-child(2), .tr--cus > :nth-child(4), .tr--cus > :nth-child(7) { display: none; } .vrow { grid-template-columns: 10px 1fr 110px auto; } .vrow > :nth-child(4), .vrow > :nth-child(5) { display: none; } .arow { grid-template-columns: 20px 1fr 1fr 130px; } .arow > :nth-child(4) { display: none; } }',
    '@media (max-width: 760px) {',
    '  .dk { inset: 0; border-radius: 0; grid-template-columns: 1fr; grid-template-rows: auto 1fr; }',
    '  .side { flex-direction: row; align-items: center; padding: 10px 12px; gap: 10px; overflow-x: auto; }',
    '  .brand, .side__foot { display: none; }',
    '  .tabs { flex-direction: row; margin: 0; gap: 4px; }',
    '  .tab { height: 36px; padding: 0 10px; gap: 8px; } .tab b { display: none; } .tab.is-on::after { display: none; }',
    '  .head { padding: 18px 64px 14px 18px; flex-direction: column; align-items: flex-start; } .head h2 { font-size: 22px; }',
    '  .body { padding: 16px 16px 50px; } .close { top: 62px; right: 14px; }',
    '  .stats { grid-template-columns: 1fr 1fr; } .sets { grid-template-columns: 1fr; } .grid { grid-template-columns: 1fr 1fr; } .fl, .fl.s4, .fl.s6 { grid-column: span 2; } .fl.s1 { grid-column: span 1; }',
    '  .in--search { width: 100%; } .howto { grid-template-columns: 1fr; }',
    '  .tr--kat { grid-template-columns: 1fr 110px 36px; } .tr--kat > :nth-child(4), .tr--kat > :nth-child(6) { display: none; }',
    '  .tr--cus { grid-template-columns: 1fr 120px; } .tr--cus > :nth-child(1), .tr--cus > :nth-child(5), .tr--cus > :nth-child(8) { display: none; }',
    '  .vrow { grid-template-columns: 10px 1fr auto; } .vrow > :nth-child(3) { display: none; }',
    '  .arow { grid-template-columns: 20px 1fr 110px; } .arow > :nth-child(3) { display: none; }',
    '  .drawer, .drawer.is-wide { width: 100%; }',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------------- formulir custom */
  var STATUS = ['Draft', 'Konsultasi', 'Survei', 'Penawaran dikirim', 'Disetujui / DP', 'Produksi', 'QC', 'Dikirim', 'Selesai', 'Batal'];
  var CUST_FIELDS = [
    { k: 'custName', l: 'Nama pelanggan', t: 'text', s: 3, req: true },
    { k: 'custCompany', l: 'Perusahaan / instansi', t: 'text', s: 3 },
    { k: 'custPhone', l: 'WhatsApp', t: 'text', s: 2, req: true, ph: '08…' },
    { k: 'custEmail', l: 'Email', t: 'text', s: 2 },
    { k: 'custCity', l: 'Kota', t: 'text', s: 2 },
    { k: 'custAddress', l: 'Alamat pengiriman', t: 'textarea', s: 4 },
    { k: 'channel', l: 'Sumber', t: 'select', s: 2, o: ['Showroom', 'WhatsApp', 'Instagram', 'Website', 'Referral', 'B2B / tender', 'Lainnya'] }
  ];
  var PROD_FIELDS = function (est) {
    return [
      est ? { k: '_est', l: 'Estimasi otomatis', t: 'estimate', s: 6 } : null,
      { k: 'quote', l: 'Harga penawaran final', t: 'money', s: 2 },
      { k: 'dp', l: 'Uang muka (DP)', t: 'select', s: 2, o: ['30%', '50%', '100%', 'Termin proyek'] },
      { k: 'leadTime', l: 'Lead time', t: 'number', s: 2, u: 'hari' },
      { k: 'status', l: 'Status', t: 'select', s: 2, o: STATUS },
      { k: 'deadline', l: 'Dibutuhkan pada', t: 'date', s: 2 },
      { k: 'pic', l: 'PIC sales', t: 'text', s: 2 }
    ].filter(Boolean);
  };
  var NOTE_FIELDS = [
    { k: 'refs', l: 'Referensi (URL gambar / Pinterest, satu per baris)', t: 'textarea', s: 6 },
    { k: 'notes', l: 'Catatan untuk produksi', t: 'textarea', s: 3 },
    { k: 'internal', l: 'Catatan internal', t: 'textarea', s: 3 }
  ];
  function fabricOptions() {
    var S = (window.XV && XV.STUDIO) || { fabrics: [] };
    return S.fabrics.map(function (f) { return f.code + ' · ' + f.name; }).concat(['Material pelanggan (COM)', 'Lainnya']);
  }
  function itemOptions() {
    return XVDB.products().filter(function (p) { return p.customizable; }).map(function (p) { return { v: p.id, l: p.name + ' — ' + p.type }; });
  }
  var FORM = {
    existing: {
      title: 'Custom dari item', short: 'Dari item',
      sections: [
        { h: 'Item dasar', f: [
          { k: 'item', l: 'Item katalog', t: 'item', s: 3, req: true },
          { k: 'basePrice', l: 'Harga dasar', t: 'money', s: 2 },
          { k: 'qty', l: 'Jumlah unit', t: 'number', s: 1, d: 1 },
          { k: 'shape', l: 'Bentuk / konfigurasi', t: 'select', s: 3, o: ['Sesuai item', 'Lurus', 'L — sudut kiri', 'L — sudut kanan', 'U', 'Modular / terpisah'] },
          { k: 'seats', l: 'Jumlah dudukan', t: 'select', s: 3, o: ['Sesuai item', '1', '2', '2,5', '3', '4', '5', '6+'] }
        ] },
        { h: 'Ukuran custom', f: [
          { k: 'w', l: 'Lebar (W)', t: 'number', s: 2, u: 'cm' },
          { k: 'd', l: 'Kedalaman (D)', t: 'number', s: 2, u: 'cm' },
          { k: 'h', l: 'Tinggi (H)', t: 'number', s: 2, u: 'cm' },
          { k: 'seatH', l: 'Tinggi dudukan', t: 'number', s: 2, u: 'cm' },
          { k: 'seatD', l: 'Kedalaman dudukan', t: 'number', s: 2, u: 'cm' },
          { k: 'armH', l: 'Tinggi lengan', t: 'number', s: 2, u: 'cm' },
          { k: 'sizeAdj', l: 'Penyesuaian harga ukuran', t: 'number', s: 2, u: '%', d: 0 },
          { k: 'sizeNote', l: 'Catatan ukuran / ruang', t: 'text', s: 4 }
        ] },
        { h: 'Material & warna', f: [
          { k: 'matType', l: 'Jenis material', t: 'select', s: 2, o: ['Fabric', 'Velvet', 'Boucle', 'Faux leather', 'Kulit asli', 'Kayu solid', 'Veneer', 'HPL', 'Metal', 'Lainnya'] },
          { k: 'matCode', l: 'Kode material', t: 'select', s: 2, o: fabricOptions },
          { k: 'matColor', l: 'Warna', t: 'text', s: 2 },
          { k: 'matSupplier', l: 'Supplier / kode katalog', t: 'text', s: 3 },
          { k: 'matSecondary', l: 'Material sekunder / aksen', t: 'text', s: 3 }
        ] },
        { h: 'Rangka, kaki & finishing', f: [
          { k: 'frame', l: 'Rangka', t: 'select', s: 2, o: ['Kayu solid', 'Multiplek', 'Metal', 'Sesuai item'] },
          { k: 'leg', l: 'Model kaki / base', t: 'select', s: 2, o: ['Sesuai item', 'Kaki kayu tapered', 'Kaki besi', 'Plinth / base tertutup', 'Kaki kuningan', 'Lainnya'] },
          { k: 'legFinish', l: 'Finishing kaki', t: 'select', s: 2, o: ['Oak', 'Walnut', 'Black steel', 'Brass', 'Natural', 'Duco / cat', 'Lainnya'] },
          { k: 'legH', l: 'Tinggi kaki', t: 'number', s: 2, u: 'cm' },
          { k: 'finishNote', l: 'Catatan finishing', t: 'text', s: 4 }
        ] },
        { h: 'Kenyamanan', f: [
          { k: 'foam', l: 'Kekerasan dudukan', t: 'select', s: 2, o: ['Soft', 'Medium', 'Firm'] },
          { k: 'fill', l: 'Isian', t: 'select', s: 2, o: ['Busa', 'Busa + dacron', 'Busa + bulu', 'Pocket spring'] },
          { k: 'backCushion', l: 'Bantal sandaran', t: 'select', s: 1, o: ['Tetap', 'Lepas'] },
          { k: 'pillows', l: 'Bantal ekstra', t: 'number', s: 1, d: 0 }
        ] },
        { h: 'Detail & fitur', f: [
          { k: 'stitch', l: 'Jahitan', t: 'select', s: 2, o: ['Standar', 'Piping', 'Jahitan kontras', 'Double stitch', 'Tufting'] },
          { k: 'features', l: 'Fitur tambahan', t: 'checks', s: 6, o: ['Recliner manual', 'Recliner elektrik', 'Port USB', 'Storage', 'Sofa bed', 'Headrest adjustable', 'Kaki roda'] },
          { k: 'featureNote', l: 'Catatan fitur', t: 'text', s: 6 }
        ] },
        { h: 'Harga & produksi', f: PROD_FIELDS(true) },
        { h: 'Pelanggan', f: CUST_FIELDS },
        { h: 'Referensi & catatan', f: NOTE_FIELDS }
      ]
    },
    full: {
      title: 'Full custom', short: 'Full custom',
      sections: [
        { h: 'Proyek', f: [
          { k: 'project', l: 'Nama proyek / item', t: 'text', s: 3, req: true },
          { k: 'category', l: 'Kategori', t: 'select', s: 3, o: ['Sofa', 'Kursi', 'Meja', 'Kabinet / lemari', 'Tempat tidur', 'Built-in / panel dinding', 'Kitchen set', 'Rak / display', 'Plafon / partisi', 'Lainnya'] },
          { k: 'room', l: 'Ruang', t: 'select', s: 3, o: ['Ruang tamu', 'Kamar tidur', 'Ruang makan', 'Kantor', 'Ruang rapat', 'Lobi / resepsionis', 'Hotel', 'Retail / toko', 'Kafe / restoran', 'Lainnya'] },
          { k: 'qty', l: 'Jumlah unit', t: 'number', s: 3, d: 1 },
          { k: 'brief', l: 'Kebutuhan & fungsi', t: 'textarea', s: 6, ph: 'Contoh: lemari arsip 4 pintu untuk ruang direksi, kunci digital, finishing walnut…' }
        ] },
        { h: 'Dimensi', f: [
          { k: 'w', l: 'Panjang / lebar', t: 'number', s: 2, u: 'cm' },
          { k: 'd', l: 'Kedalaman', t: 'number', s: 2, u: 'cm' },
          { k: 'h', l: 'Tinggi', t: 'number', s: 2, u: 'cm' },
          { k: 'drawing', l: 'Gambar kerja', t: 'select', s: 3, o: ['Belum ada', 'Ada sketsa', 'Ada gambar kerja', 'Perlu dibuat tim XIONCO'] },
          { k: 'dimNote', l: 'Catatan dimensi / ruang tersedia', t: 'text', s: 3 }
        ] },
        { h: 'Material & finishing', f: [
          { k: 'matMain', l: 'Material utama', t: 'text', s: 3, ph: 'Kayu jati, multiplek, besi hollow…' },
          { k: 'matSecondary', l: 'Material sekunder', t: 'text', s: 3 },
          { k: 'finish', l: 'Finishing', t: 'select', s: 2, o: ['Natural / clear coat', 'Duco / cat', 'HPL', 'Veneer', 'Powder coat', 'Upholstery', 'Lainnya'] },
          { k: 'color', l: 'Warna', t: 'text', s: 2 },
          { k: 'hardware', l: 'Hardware & aksesori', t: 'text', s: 2, ph: 'Engsel, rel, handle…' },
          { k: 'electrical', l: 'Kelistrikan', t: 'checks', s: 6, o: ['Lampu LED', 'Stopkontak / VAZRA', 'Port USB', 'Smart switch', 'Kabel tersembunyi'] }
        ] },
        { h: 'Lokasi & layanan', f: [
          { k: 'survey', l: 'Survei lokasi', t: 'select', s: 2, o: ['Perlu', 'Tidak perlu'] },
          { k: 'install', l: 'Instalasi', t: 'select', s: 2, o: ['Perlu', 'Tidak perlu'] },
          { k: 'siteCity', l: 'Kota lokasi', t: 'text', s: 2 },
          { k: 'siteAddress', l: 'Alamat lokasi', t: 'textarea', s: 4 },
          { k: 'access', l: 'Akses (lantai, lift, jam kerja)', t: 'text', s: 2 }
        ] },
        { h: 'Anggaran & produksi', f: [{ k: 'budget', l: 'Kisaran anggaran', t: 'select', s: 2, o: ['< IDR 10 juta', 'IDR 10–50 juta', 'IDR 50–250 juta', 'IDR 250 juta – 1 M', '> IDR 1 M'] }].concat(PROD_FIELDS(false)) },
        { h: 'Pelanggan', f: CUST_FIELDS },
        { h: 'Referensi & catatan', f: NOTE_FIELDS }
      ]
    }
  };
  // aturan estimasi (demo) — ubah sesuai kebijakan harga
  var RULES = {
    material: { 'Fabric': 1, 'Velvet': 1.1, 'Boucle': 1.15, 'Faux leather': 1.15, 'Kulit asli': 1.6 },
    leg: { 'Black steel': 150000, 'Brass': 450000 },
    feature: { 'Recliner manual': 1200000, 'Recliner elektrik': 2800000, 'Port USB': 350000, 'Storage': 900000, 'Sofa bed': 1800000, 'Headrest adjustable': 600000, 'Kaki roda': 300000 },
    pillow: 150000
  };
  function estimate(d) {
    var p = XVDB.products().filter(function (x) { return x.id === d.item; })[0];
    var base = d.basePrice != null && d.basePrice !== '' ? +d.basePrice : p && p.price ? p.price : 0;
    if (!base) return null;
    var size = 1 + (+d.sizeAdj || 0) / 100, mat = RULES.material[d.matType] || 1;
    var extras = (RULES.leg[d.legFinish] || 0) + (d.features || []).reduce(function (s, f) { return s + (RULES.feature[f] || 0); }, 0) + (+d.pillows || 0) * RULES.pillow;
    return Math.round((base * size * mat + extras) * Math.max(1, +d.qty || 1) / 1000) * 1000;
  }

  /* ---------------------------------------------------------------- state */
  var host, root, el = {}, state = {
    open: false, tab: 'versi',
    aset: { q: '', status: 'semua', level: 'semua', cat: 'semua' },
    kat: { q: '', cat: 'semua', status: 'semua' },
    cus: { q: '', type: 'semua', status: 'semua' },
    harga: { sel: 'kursi.sofa', keep: false },
    detect: {}, scanning: false, editor: null
  };
  var products = [], saveT = 0;

  /* ---------------------------------------------------------------- mulai */
  function deps() {
    ensureFonts();
    var jobs = [];
    if (!window.XIONCO_VERSIONS) jobs.push(loadScript(ROOT + 'shared/versions.js'));
    var needData = !(window.XV && XV.PRODUCTS && XV.STUDIO);
    var chain = Promise.all(jobs);
    if (needData) chain = chain.then(function () { return loadScript(ROOT + 'v5/js/data.js'); });
    return chain.then(function () { if (!window.XVDB) return loadScript(ROOT + 'shared/db.js'); }).then(function () { return window.XVDB && XVDB.ready; })
      .then(function (r) { return LOCAL && location.protocol !== 'file:' ? loadScript(ROOT + 'shared/devkit/ai3d.js').then(function () { return loadScript(ROOT + 'shared/devkit/links.js'); }).then(function () { return loadScript(ROOT + 'shared/devkit/materials.js'); }).then(function () { return loadScript(ROOT + 'shared/devkit/wood.js'); }).then(function () { return r; }) : r; });   // 3D AI butuh serve.js
  }
  function mount() {
    if (!window.XVDB || !window.XV) return;
    host = document.createElement('div');
    host.id = 'xionco-devkit';
    host.setAttribute('data-lenis-prevent', '');
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000;';
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    var logo = XV.LOGO ? '<svg viewBox="0 0 206 28"><path d="' + XV.LOGO + '"/></svg>' : '<b>XIONCO</b>';
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<button class="fab" type="button" aria-label="Developer settings">' + ic('dev') + '<span class="fab__tip">Developer</span></button>' +
      '<div class="scrim"></div>' +
      '<section class="dk" role="dialog" aria-modal="true" aria-label="Developer settings">' +
        '<aside class="side"><div class="brand">' + logo + '<span>Developer settings</span></div><nav class="tabs"></nav><div class="side__foot"></div></aside>' +
        '<main class="main"><header class="head"></header><div class="body"></div><aside class="drawer"></aside></main>' +
        '<button class="close" type="button" aria-label="Tutup">' + ic('close') + '</button>' +
      '</section>' +
      '<div class="toast"></div><input type="file" accept="application/json,.json" hidden>';
    ['fab', 'scrim', 'dk', 'tabs', 'head', 'body', 'drawer', 'close', 'toast'].forEach(function (k) { el[k] = root.querySelector('.' + k); });
    el.side = root.querySelector('.side__foot');
    el.file = root.querySelector('input[type=file]');
    // event dari dalam panel tidak bocor ke situs (shortcut, scroll halus, dll.)
    ['keydown', 'keyup', 'keypress', 'wheel', 'touchmove'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: ev === 'wheel' || ev === 'touchmove' }); });
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (state.editor) closeEditor(); else close(); } });
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    el.scrim.addEventListener('click', close);
    el.close.addEventListener('click', function () { if (state.editor) closeEditor(); else close(); });
    el.file.addEventListener('change', onImport);
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); toggle(); }
    }, true);
    window.addEventListener('xvdb:error', function (e) { toast(e.detail && e.detail.message ? 'Gagal menyimpan — cek serve.js' : 'Gagal menyimpan'); });
    window.addEventListener('xvdb:change', function (e) {
      if (e.detail && e.detail.what === 'settings') placeFab();
      if (e.detail && e.detail.what === 'pricing') pr = null;
      if (state.open && (!state.editor || e.detail.what !== 'customs') && !(e.detail && e.detail.what === 'pricing' && state.tab === 'harga')) renderTab();
    });
    setupFab();
    placeFab();
    products = XVDB.products();
    renderTabs();
  }

  /* ---------------------------------------------------------------- tombol melayang */
  function setupFab() {
    var drag = null;
    el.fab.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, moved: false, r: el.fab.getBoundingClientRect() };
      try { el.fab.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.fab.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; el.fab.classList.add('is-drag'); }
      if (drag.moved) { el.fab.style.left = (drag.r.left + dx) + 'px'; el.fab.style.top = (drag.r.top + dy) + 'px'; }
    });
    el.fab.addEventListener('pointerup', function (e) {
      if (!drag) return;
      var moved = drag.moved; drag = null; el.fab.classList.remove('is-drag');
      if (moved) {
        var pos = (e.clientY < innerHeight / 2 ? 't' : 'b') + (e.clientX < innerWidth / 2 ? 'l' : 'r');
        XVDB.setSetting('position', pos); placeFab();
      } else toggle();
    });
    window.addEventListener('resize', placeFab);
    if ('MutationObserver' in window) new MutationObserver(placeFab).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  function placeFab() {
    if (!el.fab) return;
    var s = XVDB.settings(), pos = s.position || 'bl', mob = innerWidth <= 760, m = mob ? 12 : 18, size = mob ? 40 : 46;
    // HP: di atas bar rincian & dock situs; disembunyikan saat panel situs terbuka
    var bottomGap = mob ? 172 : m + (document.querySelector('.hud-bot') && !mob ? 34 : 0);   // v3 punya bar status di bawah
    el.fab.style.width = el.fab.style.height = size + 'px';
    el.fab.classList.toggle('is-under', state.open || (mob && document.documentElement.classList.contains('is-panel')));
    // jangan menimpa panel situs: panel di kiri (layout III) → tombol pindah ke kanan, dan sebaliknya
    var hc = document.documentElement.classList;
    if (!mob && hc.contains('is-panel')) { var pl = !!document.querySelector('.lay3'); if (pl && pos[1] === 'l') pos = pos[0] + 'r'; else if (!pl && pos[1] === 'r' && document.querySelector('#panel')) pos = pos[0] + 'l'; }
    el.fab.dataset.pos = pos;
    el.fab.style.left = (pos[1] === 'l' ? m : innerWidth - size - m) + 'px';
    el.fab.style.top = (pos[0] === 't' ? (mob ? 220 : m) : innerHeight - size - bottomGap) + 'px';
    el.fab.classList.toggle('is-hidden', !!s.hidden || !devAllowed());
  }

  /* ---------------------------------------------------------------- buka / tutup */
  function open() {
    if (state.open) return;
    state.open = true;
    products = XVDB.products();
    renderTabs(); renderTab();
    el.dk.classList.add('is-open'); el.scrim.classList.add('is-on'); el.fab.classList.add('is-under');
    setTimeout(function () { if (state.open && window.XW && XW.pause) XW.pause(true); }, 850);
  }
  function close() {
    if (!state.open) return;
    state.open = false;
    closeEditor();
    el.dk.classList.remove('is-open'); el.scrim.classList.remove('is-on'); el.fab.classList.remove('is-under');
    if (window.XW && XW.pause) XW.pause(false);
  }
  function toggle() { if (state.open) close(); else open(); }
  var toastT = 0;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.toast.classList.remove('is-on'); }, 2200);
  }

  /* ---------------------------------------------------------------- tab */
  var TABS = [
    { id: 'versi', l: 'Versi', i: 'versi' }, { id: 'aset', l: 'Aset', i: 'aset' },
    { id: 'katalog', l: 'Katalog', i: 'katalog' }, { id: 'custom', l: 'Custom', i: 'custom' },
    { id: 'harga', l: 'Harga', i: 'harga' }, { id: 'pengaturan', l: 'Pengaturan', i: 'set' }
  ];
  /* tab tambahan: XVDevkit.add({ id, l, icon, prefix, count, render, click, change, input, setCard, init }) */
  var PLUG = [];
  function plugCtx() {
    return { get root() { return root; }, el: el, ROOT: ROOT, esc: esc, ic: ic, toast: toast, head: head, imgSrc: imgSrc, dt: dt,
      products: function () { return products; }, saveProducts: saveProducts, render: renderTab, renderTabs: renderTabs,
      shown: function (id) { return state.open && state.tab === id; } };
  }
  window.XVDevkit = { add: function (pl) { PLUG.push(pl); if (pl.icon) I[pl.id] = pl.icon; if (pl.init) pl.init(plugCtx()); if (root) renderTabs(); } };
  function allTabs() { return TABS.slice(0, -1).concat(PLUG.map(function (p) { return { id: p.id, l: p.l, i: p.id }; }), TABS.slice(-1)); }
  function plugById(id) { return PLUG.filter(function (p) { return p.id === id; })[0]; }
  function counts() {
    var pc = {}; PLUG.forEach(function (p) { pc[p.id] = p.count ? p.count(plugCtx()) : ''; });
    return Object.assign(pc, {
      versi: (window.XIONCO_VERSIONS || []).length,
      aset: assetSummary().readyAll + '/' + assetSummary().totalAll,
      katalog: products.length,
      custom: XVDB.customs().length,
      harga: window.XC && XC.priceTable ? (prCount() || '') : '',
      pengaturan: ''
    });
  }
  function renderTabs() {
    var c = counts();
    el.tabs.innerHTML = allTabs().map(function (t) {
      return '<button class="tab' + (state.tab === t.id ? ' is-on' : '') + '" type="button" data-tab="' + t.id + '">' + ic(t.i) + '<span>' + t.l + '</span><b>' + c[t.id] + '</b></button>';
    }).join('');
    var cur = currentVersion();
    el.side.innerHTML = '<b>Sedang dibuka</b>' + esc(cur ? cur.name + ' — ' + cur.title : location.pathname.split('/').slice(-2).join('/')) +
      '<br><br><b>Penyimpanan</b>' + MODE_TEXT[XVDB.mode()] + ' · ' + (XVDB.isModified() ? 'katalog diubah' : 'katalog bawaan');
  }
  function renderTab() {
    renderTabs();
    var pl = plugById(state.tab);
    if (pl) { pl.render(plugCtx()); return; }
    ({ versi: renderVersi, aset: renderAset, katalog: renderKatalog, custom: renderCustom, harga: renderHarga, pengaturan: renderSet })[state.tab]();
  }
  function head(eye, title, sub, acts) {
    el.head.innerHTML = '<div><p class="eyebrow">' + eye + '</p><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="acts">' + (acts || '') + '</div>';
  }

  /* ---------------------------------------------------------------- VERSI */
  function currentVersion() {
    var p = decodeURIComponent(location.pathname);
    return (window.XIONCO_VERSIONS || []).filter(function (v) {
      var full = ROOT_PATH + v.path;
      return p === full || (/index\.html$/.test(v.path) && p === full.replace(/index\.html$/, ''));
    })[0];
  }
  function renderVersi() {
    var list = window.XIONCO_VERSIONS || [], cur = currentVersion();
    var TYPE = { current: ['Terbaru', 'pill--dark'], version: ['Versi', ''], checkpoint: ['Checkpoint', 'pill--gold'], fun: ['For fun', 'pill--warn'] };
    head('01 · Versi', 'Versi & checkpoint', 'Klik untuk pindah versi. Versi lama tidak pernah dihapus — setiap versi baru dan perubahan besar ditambahkan sebagai checkpoint, jadi selalu bisa kembali.');
    el.body.innerHTML = '<div class="vlist">' + list.map(function (v) {
      var t = TYPE[v.type] || TYPE.version, here = cur && cur.id === v.id;
      return '<div class="vrow' + (here ? ' is-here' : '') + '"><span class="vdot"></span>' +
        '<div class="vname"><b>' + esc(v.name) + '</b><span>' + esc(v.title) + '</span></div>' +
        '<div><span class="pill ' + t[1] + '">' + t[0] + '</span></div>' +
        '<div class="muted">' + esc(v.date) + '</div>' +
        '<div class="vnote">' + esc(v.note) + '<span class="mono">' + esc(v.path) + '</span></div>' +
        (here ? '<span class="pill pill--ok">Sedang dibuka</span>' : '<button class="btn btn--sm" type="button" data-act="goto" data-path="' + esc(v.path) + '">' + ic('open') + 'Buka</button>') +
      '</div>';
    }).join('') + '</div>' +
    '<div class="card howto"><div><h3>Membuat checkpoint baru</h3><p class="muted">Sebelum merombak, simpan keadaan sekarang. Salinan lengkap masuk ke folder <span class="mono">checkpoints/</span> dan otomatis muncul di daftar ini. Atau cukup minta Claude: “buat checkpoint v5”.</p></div>' +
      '<div class="code"><span>node tools/checkpoint.js v5 "catatan"</span><button class="ibtn" type="button" data-act="copy" data-text="node tools/checkpoint.js v5 &quot;catatan&quot;" aria-label="Salin">' + ic('copy') + '</button></div></div>';
  }

  /* ---------------------------------------------------------------- ASET */
  function imgSrc(p, w) {
    if (!p) return '';
    if (/^(https?:|data:|blob:)/.test(p)) return p;
    if (/^assets\//.test(p)) return ROOT + p;
    var S = XV.SIZES && XV.SIZES[p], ok = S ? S.filter(function (v) { return v >= (w || 768); }) : [];
    if (!ok.length) return XV.IMG + p;
    var v = Math.min.apply(null, ok);
    return XV.IMG + p.replace(/\.(png|jpe?g|webp)$/i, '-' + v + 'x' + v + '.$1');
  }
  function photoCls(p) { return XV.V3_DARK && XV.V3_DARK.indexOf(p.id) >= 0 ? 'is-photo' : ''; }
  function assetRows() {
    var rows = [], cats = XV.CATEGORIES || [];
    XVDB.GLOBAL_ASSETS.forEach(function (g) {
      g.items.forEach(function (a) { rows.push({ group: g.group, gkey: 'g-' + g.group, key: 'g:' + a.key, label: a.label, file: a.path, path: XVDB.ASSET_ROOT + a.path, level: a.level, spec: a.spec, probe: a.probe, temp: a.temp }); });
    });
    XVDB.MATERIAL_ASSETS().forEach(function (a) { rows.push({ group: 'Material (untuk Custom & Atelier)', gkey: 'g-mat', key: 'g:' + a.key, label: a.label, file: a.path, path: XVDB.ASSET_ROOT + a.path, level: a.level, spec: a.spec, probe: a.probe }); });
    products.forEach(function (p) {
      XVDB.ITEM_ASSETS.forEach(function (a) {
        var cat = cats.filter(function (c) { return c.id === p.cat; })[0];
        rows.push({ item: p, cat: p.cat, group: cat ? cat.label : p.cat, gkey: 'i-' + p.id, key: 'item:' + p.id + ':' + a.key, label: a.label, file: a.file, path: XVDB.ASSET_ROOT + 'items/' + p.id + '/' + a.file, level: a.level, spec: a.spec, use: a.use, probe: a.probe, temp: a.temp && !!p.img });
      });
    });
    var checks = XVDB.checks();
    rows.forEach(function (r) {
      r.detected = state.detect[r.key] === true;
      r.checked = !!checks[r.key];
      r.ready = r.detected || r.checked;
    });
    return rows;
  }
  function assetSummary() {
    var rows = assetRows(), req = rows.filter(function (r) { return r.level === 'wajib'; });
    return {
      rows: rows,
      readyAll: rows.filter(function (r) { return r.ready; }).length, totalAll: rows.length,
      readyReq: req.filter(function (r) { return r.ready; }).length, totalReq: req.length,
      temp: rows.filter(function (r) { return !r.ready && r.temp; }).length
    };
  }
  function statusPill(r) {
    if (r.detected) return '<span class="pill pill--ok">' + ic('check') + 'Terdeteksi</span>';
    if (r.checked) return '<span class="pill pill--ok">Siap</span>';
    if (r.temp) return '<span class="pill pill--warn">Sementara · xionco.com</span>';
    return '<span class="pill pill--bad">Belum</span>';
  }
  function levelPill(l) { return '<span class="pill' + (l === 'wajib' ? ' pill--gold' : '') + '">' + l + '</span>'; }
  function renderAset() {
    var S = assetSummary(), f = state.aset, cats = XV.CATEGORIES || [];
    head('02 · Aset', 'PR aset', 'Daftar aset yang perlu Anda siapkan, dibuat dari database item. Simpan file di folder yang tertulis — saat terdeteksi, otomatis tercentang. Anda juga bisa mencentang manual.',
      '<button class="btn" type="button" data-act="scan">' + ic('scan') + (state.scanning ? 'Memindai…' : 'Pindai folder aset') + '</button>' +
      '<button class="btn" type="button" data-act="aset-csv">' + ic('down') + 'Unduh daftar (CSV)</button>');
    var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
    var html = '<div class="stats">' +
      '<div class="card stat"><span>Wajib siap</span><b>' + S.readyReq + ' / ' + S.totalReq + '</b><div class="meter"><i style="width:' + pct(S.readyReq, S.totalReq) + '%"></i></div></div>' +
      '<div class="card stat"><span>Semua aset</span><b>' + S.readyAll + ' / ' + S.totalAll + '</b><div class="meter"><i style="width:' + pct(S.readyAll, S.totalAll) + '%"></i></div></div>' +
      '<div class="card stat"><span>Masih sementara</span><b>' + S.temp + '</b><p class="muted" style="margin:6px 0 0">Memakai foto xionco.com</p></div>' +
      '<div class="card stat"><span>Folder aset</span><b style="font-size:16px;padding-top:6px">assets/</b><p class="muted" style="margin:6px 0 0">di root proyek</p></div></div>';
    html += '<div class="bar"><input class="in in--search" type="search" placeholder="Cari item atau aset…" value="' + esc(f.q) + '" data-f="aset.q">' +
      seg('aset.status', [['semua', 'Semua'], ['belum', 'Belum'], ['siap', 'Siap']], f.status) +
      seg('aset.level', [['semua', 'Semua level'], ['wajib', 'Wajib'], ['disarankan', 'Disarankan'], ['opsional', 'Opsional']], f.level) +
      '<select class="sel" data-f="aset.cat"><option value="semua">Semua grup</option><option value="global"' + (f.cat === 'global' ? ' selected' : '') + '>Brand, 3D & material</option>' +
      cats.map(function (c) { return '<option value="' + c.id + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>';
    var q = f.q.trim().toLowerCase();
    var rows = S.rows.filter(function (r) {
      if (f.status === 'belum' && r.ready) return false;
      if (f.status === 'siap' && !r.ready) return false;
      if (f.level !== 'semua' && r.level !== f.level) return false;
      if (f.cat === 'global' && r.item) return false;
      if (f.cat !== 'semua' && f.cat !== 'global' && r.cat !== f.cat) return false;
      if (q && (r.label + ' ' + r.file + ' ' + (r.item ? r.item.name + ' ' + r.item.id : r.group)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (!rows.length) { el.body.innerHTML = html + '<div class="empty">Tidak ada aset yang cocok dengan filter.</div>'; return; }
    // kelompokkan
    var groups = [], gi = {};
    rows.forEach(function (r) { if (!gi[r.gkey]) { gi[r.gkey] = { key: r.gkey, item: r.item, group: r.group, rows: [] }; groups.push(gi[r.gkey]); } gi[r.gkey].rows.push(r); });
    var lastHead = '';
    html += groups.map(function (g) {
      var out = '';
      var headName = g.item ? g.group : 'Global';
      if (headName !== lastHead) { lastHead = headName; out += '<div class="group__h">' + esc(headName) + '</div>'; }
      var all = S.rows.filter(function (r) { return r.gkey === g.key; }), done = all.filter(function (r) { return r.ready; }).length;
      var thumb = g.item ? '<div class="thumb"><img class="' + photoCls(g.item) + '" src="' + esc(imgSrc(g.item.img, 300)) + '" alt="" loading="lazy"></div>' : '<div class="thumb">' + ic(g.key === 'g-mat' ? 'custom' : 'aset') + '</div>';
      var folder = g.item ? XVDB.ASSET_ROOT + 'items/' + g.item.id + '/' : '';
      out += '<div class="card item"><div class="item__h">' + thumb +
        '<div class="item__n"><b>' + esc(g.item ? g.item.name : g.group) + '</b>' + (folder ? '<span class="mono">' + esc(folder) + '</span>' : '<span class="muted">' + all.length + ' aset</span>') + '</div>' +
        (folder ? '<button class="ibtn" type="button" data-act="copy" data-text="' + esc(folder) + '" aria-label="Salin folder">' + ic('copy') + '</button>' : '<span></span>') +
        '<span class="pill' + (done === all.length ? ' pill--ok' : '') + '">' + done + ' / ' + all.length + '</span></div>' +
        '<div class="arows">' + g.rows.map(function (r) {
          return '<div class="arow"><button class="chk' + (r.detected ? ' is-on is-auto' : r.checked ? ' is-on' : '') + '" type="button" data-act="check" data-key="' + esc(r.key) + '" aria-label="Centang ' + esc(r.label) + '">' + ic('check') + '</button>' +
            '<div class="arow__l"><b>' + esc(r.label) + '</b>' + levelPill(r.level) + '</div>' +
            '<div class="mono">' + esc(r.item ? r.file : r.file) + '</div>' +
            '<div class="arow__s">' + esc(r.spec) + (r.use ? ' · <i>' + esc(r.use) + '</i>' : '') + '</div>' +
            '<div class="arow__st">' + statusPill(r) + '</div></div>';
        }).join('') + '</div></div>';
      return out;
    }).join('');
    el.body.innerHTML = html;
  }
  function seg(key, opts, val) {
    return '<div class="seg">' + opts.map(function (o) { return '<button type="button" data-seg="' + key + '" data-v="' + o[0] + '"' + (val === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function probe(r) {
    return new Promise(function (res) {
      var url = ROOT + r.path;
      if (r.probe === 'img') {
        var im = new Image(), done = false;
        var fin = function (v) { if (!done) { done = true; res(v); } };
        im.onload = function () { fin(true); }; im.onerror = function () { fin(false); };
        setTimeout(function () { fin(false); }, 6000);
        im.src = url + '?t=' + Date.now();
      } else {
        if (!/^https?:$/.test(location.protocol)) return res(null);
        fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function (x) { res(x.ok); }).catch(function () { res(false); });
      }
    });
  }
  function scan() {
    if (state.scanning) return;
    state.scanning = true; renderAset();
    return XVDB.assetList().then(function (files) {
      if (!files) return scanProbe();
      var set = {}; files.forEach(function (f) { set[f.toLowerCase()] = 1; });
      var found = 0;
      assetRows().forEach(function (r) { var ok = !!set[r.path.toLowerCase()]; state.detect[r.key] = ok; if (ok) found++; });
      state.scanning = false;
      var used = adoptLocalPhotos();
      renderTab();
      toast(found ? found + ' aset terdeteksi' + (used ? ' · ' + used + ' aset (foto/model 3D) dipakai di situs' : '') : 'Belum ada aset di folder assets/');
    });
  }
  function scanProbe() {
    var rows = assetRows(), i = 0, active = 0, found = 0;
    return new Promise(function (resolve) {
      var next = function () {
        if (i >= rows.length && !active) {
          state.scanning = false;
          var used = adoptLocalPhotos();
          renderTab();
          toast(found ? found + ' aset terdeteksi' + (used ? ' · ' + used + ' aset (foto/model 3D) dipakai di situs' : '') : 'Belum ada aset di folder assets/');
          return resolve();
        }
        while (active < 6 && i < rows.length) {
          var r = rows[i++]; active++;
          probe(r).then((function (rr) { return function (ok) { state.detect[rr.key] = ok === true; if (ok) found++; active--; next(); }; })(r));
        }
      };
      next();
    });
  }

  // foto utama & model 3D yang ditemukan di assets/items/<id>/ langsung dipakai situs (via database)
  function adoptLocalPhotos() {
    var n = 0;
    products.forEach(function (p) {
      var key = 'item:' + p.id + ':utama', local = XVDB.ASSET_ROOT + 'items/' + p.id + '/foto-utama.png';
      if (state.detect[key] && p.img !== local) { p.imgOriginal = p.imgOriginal || p.img; p.img = local; n++; }
      else if (!state.detect[key] && p.img === local && p.imgOriginal) { p.img = p.imgOriginal; n++; }
      var mk = 'item:' + p.id + ':model', glb = XVDB.ASSET_ROOT + 'items/' + p.id + '/model.glb';
      if (state.detect[mk] && !p.model) { p.model = glb; n++; }
      else if (state.detect[mk] === false && p.model === glb) { p.model = ''; n++; }
    });
    if (n) XVDB.saveProducts(products);
    return n;
  }

  /* ---------------------------------------------------------------- KATALOG */
  function katFiltered() {
    var f = state.kat, q = f.q.trim().toLowerCase();
    return products.filter(function (p) {
      if (f.cat !== 'semua' && p.cat !== f.cat) return false;
      if (f.status !== 'semua' && p.status !== f.status) return false;
      if (q && (p.name + ' ' + p.id + ' ' + p.type).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderKatalog() {
    var f = state.kat, cats = XV.CATEGORIES || [], at = XVDB.savedAt('products');
    var act = products.filter(function (p) { return p.status === 'aktif'; }).length;
    head('03 · Database', 'Katalog item', products.length + ' item · ' + act + ' aktif tampil di situs · ' + (XVDB.isModified() ? 'diubah ' + dt(at) : 'data bawaan') + '. Harga & status bisa langsung diubah di tabel — tersimpan otomatis.',
      '<button class="btn btn--dark" type="button" data-act="kat-new">' + ic('plus') + 'Item baru</button>' +
      '<button class="btn" type="button" data-act="kat-export">' + ic('down') + 'Export</button>' +
      '<button class="btn" type="button" data-act="import">' + ic('up') + 'Import</button>' +
      '<button class="btn btn--ghost" type="button" data-act="kat-reset">' + ic('reset') + 'Bawaan</button>');
    var list = katFiltered();
    var html = '<div class="bar"><input class="in in--search" type="search" placeholder="Cari nama, ID, tipe…" value="' + esc(f.q) + '" data-f="kat.q">' +
      '<select class="sel" data-f="kat.cat"><option value="semua">Semua kategori</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select>' +
      seg('kat.status', [['semua', 'Semua'], ['aktif', 'Aktif'], ['draft', 'Draft'], ['arsip', 'Arsip']], f.status) + '<span class="muted">' + list.length + ' ditampilkan</span></div>';
    html += '<div class="tbl"><div class="tr tr--kat th"><span>Item</span><span>Kategori</span><span style="text-align:right">Harga (IDR)</span><span style="text-align:right">Harga coret</span><span>Mulai</span><span>Status</span><span>Custom</span><span></span></div>' +
      (list.length ? list.map(function (p) {
        var cat = cats.filter(function (c) { return c.id === p.cat; })[0];
        return '<div class="tr tr--kat" data-id="' + esc(p.id) + '">' +
          '<div class="prod"><div class="thumb"><img class="' + photoCls(p) + '" src="' + esc(imgSrc(p.img, 300)) + '" alt="" loading="lazy"></div><div><b>' + esc(p.name) + '</b><span>' + esc(p.type) + ' · ' + esc(p.id) + '</span></div></div>' +
          '<span class="muted">' + esc(cat ? cat.label : p.cat) + '</span>' +
          '<input class="cell-in is-price" data-cell="price" value="' + fmt(p.price) + '" placeholder="Tanya harga" inputmode="numeric">' +
          '<input class="cell-in" data-cell="was" value="' + fmt(p.was) + '" placeholder="—" inputmode="numeric">' +
          '<button class="chk' + (p.from ? ' is-on' : '') + '" type="button" data-cell="from" aria-label="Harga mulai dari">' + ic('check') + '</button>' +
          '<select class="sel cell-sel" data-cell="status">' + ['aktif', 'draft', 'arsip'].map(function (s) { return '<option' + (p.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          '<button class="chk' + (p.customizable ? ' is-on' : '') + '" type="button" data-cell="customizable" aria-label="Bisa custom">' + ic('check') + '</button>' +
          '<button class="ibtn" type="button" data-act="kat-edit" aria-label="Ubah">' + ic('edit') + '</button></div>';
      }).join('') : '<div class="empty">Tidak ada item.</div>') + '</div>';
    el.body.innerHTML = html;
  }
  function saveProducts(silent) {
    clearTimeout(saveT);
    saveT = setTimeout(function () { XVDB.saveProducts(products); if (!silent) toast('Tersimpan'); }, 350);
  }
  var KAT_FIELDS = function (isNew) {
    var cats = (XV.CATEGORIES || []).map(function (c) { return { v: c.id, l: c.label }; });
    return [
      { h: 'Identitas', f: [
        { k: 'id', l: 'ID (slug unik)', t: 'text', s: 2, req: true, ro: !isNew, ph: 'contoh: guise-2s' },
        { k: 'name', l: 'Nama', t: 'text', s: 2, req: true },
        { k: 'cat', l: 'Kategori', t: 'select', s: 2, o: cats },
        { k: 'type', l: 'Tipe / keterangan', t: 'text', s: 6, ph: 'Sofa · 3 seater' }
      ] },
      { h: 'Harga & stok', f: [
        { k: 'price', l: 'Harga', t: 'money', s: 2, ph: 'Kosong = tanya harga' },
        { k: 'was', l: 'Harga coret', t: 'money', s: 2 },
        { k: 'from', l: 'Harga “mulai dari”', t: 'toggle', s: 2 },
        { k: 'status', l: 'Status', t: 'select', s: 2, o: ['aktif', 'draft', 'arsip'] },
        { k: 'stock', l: 'Stok', t: 'select', s: 2, o: ['Ready', 'Pre-order', 'Habis'] },
        { k: 'leadTime', l: 'Lead time', t: 'number', s: 2, u: 'hari' }
      ] },
      { h: 'Spesifikasi', f: [
        { k: 'dims', l: 'Dimensi (W × D × H)', t: 'text', s: 3, ph: '220 × 90 × 75 cm' },
        { k: 'customizable', l: 'Bisa dipesan custom', t: 'toggle', s: 3 },
        { k: 'desc', l: 'Deskripsi', t: 'textarea', s: 6 }
      ] },
      { h: 'Media & tautan', f: [
        { k: 'img', l: 'Gambar (path xionco.com, URL, atau assets/items/…)', t: 'text', s: 6 },
        { k: '_prev', l: 'Pratinjau', t: 'preview', s: 6 },
        { k: 'model', l: 'Model 3D (assets/items/…/model.glb · kosong = pakai foto)', t: 'text', s: 4 },
        { k: 'modelRot', l: 'Putar model', t: 'number', s: 2, u: '°', ph: '0' },
        { k: 'url', l: 'URL halaman produk', t: 'text', s: 6 },
        { k: 'note', l: 'Catatan internal', t: 'textarea', s: 6 }
      ] }
    ];
  };

  /* ---------------------------------------------------------------- CUSTOM */
  function cusName(r) {
    var d = r.data || {};
    if (r.type === 'existing') { var p = products.filter(function (x) { return x.id === d.item; })[0]; return (p ? p.name : 'Item belum dipilih') + (d.w ? ' · ' + d.w + ' cm' : ''); }
    return d.project || 'Proyek tanpa nama';
  }
  function cusValue(r) { var d = r.data || {}; return d.quote ? rupiah(d.quote) : r.type === 'existing' && estimate(d) ? '± ' + rupiah(estimate(d)) : d.budget || '—'; }
  function renderCustom() {
    var f = state.cus, list = XVDB.customs();
    head('04 · Database', 'Pesanan custom', 'Dua tipe: <b>custom dari item</b> yang sudah ada (ukuran, material, fitur) dan <b>full custom</b> dari nol. Semua kolom input sudah disiapkan.',
      '<button class="btn btn--dark" type="button" data-act="cus-new" data-type="existing">' + ic('plus') + 'Custom dari item</button>' +
      '<button class="btn btn--dark" type="button" data-act="cus-new" data-type="full">' + ic('plus') + 'Full custom</button>' +
      '<button class="btn" type="button" data-act="cus-csv">' + ic('down') + 'CSV</button>');
    var q = f.q.trim().toLowerCase();
    var rows = list.filter(function (r) {
      if (f.type !== 'semua' && r.type !== f.type) return false;
      if (f.status !== 'semua' && (r.data || {}).status !== f.status) return false;
      if (q && (r.id + ' ' + cusName(r) + ' ' + ((r.data || {}).custName || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var byStatus = {};
    list.forEach(function (r) { var s = (r.data || {}).status || 'Draft'; byStatus[s] = (byStatus[s] || 0) + 1; });
    var html = '<div class="stats">' +
      '<div class="card stat"><span>Total pesanan</span><b>' + list.length + '</b></div>' +
      '<div class="card stat"><span>Dari item</span><b>' + list.filter(function (r) { return r.type === 'existing'; }).length + '</b></div>' +
      '<div class="card stat"><span>Full custom</span><b>' + list.filter(function (r) { return r.type === 'full'; }).length + '</b></div>' +
      '<div class="card stat"><span>Dalam produksi</span><b>' + ((byStatus['Produksi'] || 0) + (byStatus['QC'] || 0)) + '</b></div></div>';
    html += '<div class="bar"><input class="in in--search" type="search" placeholder="Cari ID, item, proyek, pelanggan…" value="' + esc(f.q) + '" data-f="cus.q">' +
      seg('cus.type', [['semua', 'Semua'], ['existing', 'Dari item'], ['full', 'Full custom']], f.type) +
      '<select class="sel" data-f="cus.status"><option value="semua">Semua status</option>' + STATUS.map(function (s) { return '<option' + (f.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>';
    html += '<div class="tbl"><div class="tr tr--cus th"><span>ID</span><span>Tipe</span><span>Item / proyek</span><span>Pelanggan</span><span>Status</span><span>Nilai</span><span>Diperbarui</span><span></span></div>' +
      (rows.length ? rows.map(function (r) {
        var d = r.data || {};
        return '<div class="tr tr--cus" data-act="cus-edit" data-id="' + esc(r.id) + '"><span class="mono">' + esc(r.id) + '</span>' +
          '<span><span class="pill' + (r.type === 'full' ? ' pill--gold' : '') + '">' + (r.type === 'full' ? 'Full' : 'Dari item') + '</span></span>' +
          '<span><b style="font-weight:500">' + esc(cusName(r)) + '</b></span><span class="muted">' + esc(d.custName || '—') + '</span>' +
          '<span><span class="pill' + (d.status === 'Selesai' ? ' pill--ok' : d.status === 'Batal' ? ' pill--bad' : '') + '">' + esc(d.status || 'Draft') + '</span></span>' +
          '<span style="font-variant-numeric:tabular-nums">' + esc(cusValue(r)) + '</span><span class="muted">' + dt(r.updated) + '</span>' +
          '<span class="ibtn">' + ic('edit') + '</span></div>';
      }).join('') : '<div class="empty">Belum ada pesanan custom. Buat dengan tombol di kanan atas.</div>') + '</div>';
    el.body.innerHTML = html;
  }

  /* ---------------------------------------------------------------- HARGA CUSTOMIZE
     Tabel semua angka yang membentuk harga Customize (v5/js/custom-spec.js).
     Yang disimpan hanya selisih dari bawaan → data/pricing.json (ikut online saat dipublish). */
  var pr = null, prT = 0;
  function xcReady() {
    if (window.XC && XC.priceTable) return Promise.resolve();
    return loadScript(ROOT + 'v5/js/custom-spec.js').then(function () { return Promise.all(['meja', 'kabinet', 'divan'].map(function (k) { return loadScript(ROOT + 'v5/js/spec-' + k + '.js'); })); }).then(function () { if (window.XC && XC.setPricing) XC.setPricing(XVDB.pricing()); });
  }
  function prGet() { if (!pr) pr = XVDB.pricing(); pr.global = pr.global || {}; pr.subs = pr.subs || {}; pr.mats = pr.mats || {}; return pr; }
  function prSave() {
    var p = prGet();
    Object.keys(p.subs).forEach(function (k) { var o = p.subs[k]; ['per10', 'opts', 'each'].forEach(function (j) { if (o[j] && !Object.keys(o[j]).length) delete o[j]; }); if (!Object.keys(o).length) delete p.subs[k]; });
    if (window.XC && XC.setPricing) XC.setPricing(p);
    clearTimeout(prT); prT = setTimeout(function () { XVDB.savePricing(p); toast('Harga tersimpan'); }, 300);
  }
  function prCount() {
    var p = prGet(), n = Object.keys(p.global).length + Object.keys(p.mats).length;
    Object.keys(p.subs).forEach(function (k) { var o = p.subs[k]; n += (o.base != null) + (o.baseRound != null) + Object.keys(o.per10 || {}).length + Object.keys(o.opts || {}).length + Object.keys(o.each || {}).length; });
    return n;
  }
  var fx = function (f) { f = +f; return f === 1 ? '1' : String(Math.round(f * 1000) / 1000).replace('.', ','); };
  var dec = function (v) { var s = String(v == null ? '' : v).replace(',', '.').replace(/[^\d.\-]/g, ''); return s === '' || isNaN(+s) ? null : +s; };
  function subsAll() { var out = []; XC.CATS.forEach(function (c) { c.subs.forEach(function (s) { out.push({ cat: c, s: s, key: XC.subKey(s) }); }); }); return out; }
  function subChanged(key) { var o = prGet().subs[key]; if (!o) return 0; return (o.base != null) + (o.baseRound != null) + Object.keys(o.per10 || {}).length + Object.keys(o.opts || {}).length + Object.keys(o.each || {}).length; }
  function hpCell(path, val, def, kind) {
    var mod = val !== def;
    var shown = kind === 'f' ? fx(val) : fmt(val);
    return '<span class="hp-c' + (mod ? ' is-mod' : '') + '"><input class="cell-in' + (kind === 'f' ? ' is-f' : ' is-price') + '" data-hp="' + esc(path) + '" data-kind="' + kind + '" value="' + esc(shown) + '" inputmode="decimal" title="Bawaan: ' + esc(kind === 'f' ? '×' + fx(def) : rupiah(def)) + '">' + (kind === 'f' ? '<i>×</i>' : '') + '</span>';
  }
  function hpReset(path, mod) { return mod ? '<button class="ibtn" type="button" data-act="hp-reset" data-path="' + esc(path) + '" aria-label="Kembali ke bawaan" title="Kembali ke bawaan">' + ic('reset') + '</button>' : '<span></span>'; }
  function renderHarga() {
    if (!window.XC || !XC.priceTable) { head('05 · Database', 'Harga Customize', 'Memuat spesifikasi Customize…'); el.body.innerHTML = '<div class="empty">Memuat…</div>'; xcReady().then(function () { if (state.tab === 'harga') renderHarga(); }); return; }
    var H = state.harga, n = prCount();
    head('05 · Database', 'Harga Customize', 'Semua angka yang membentuk harga di Customize. Harga per unit = (harga dasar + penyesuaian ukuran) × faktor pilihan + tambahan, lalu penyesuaian umum & pembulatan. Ubah langsung di tabel — tersimpan otomatis' + (XVDB.mode() === 'folder' ? ' ke <span class="mono">data/pricing.json</span>' : ' di browser ini') + ' dan langsung dipakai di Customize, tas, dan checkout. ' + (n ? '<b>' + n + ' angka diubah</b> dari bawaan.' : 'Semua masih harga bawaan.'),
      '<button class="btn" type="button" data-act="hp-csv">' + ic('down') + 'CSV</button>' +
      '<button class="btn btn--ghost" type="button" data-act="hp-reset-all">' + ic('reset') + 'Semua ke bawaan</button>');
    var nav = '<nav class="hp-nav">' +
      '<button type="button" data-act="hp-sel" data-v="umum" class="' + (H.sel === 'umum' ? 'is-on' : '') + '"><span>Umum</span><b>' + (Object.keys(prGet().global).length || '') + '</b></button>' +
      '<button type="button" data-act="hp-sel" data-v="material" class="' + (H.sel === 'material' ? 'is-on' : '') + '"><span>Material & warna</span><b>' + (Object.keys(prGet().mats).length || '') + '</b></button>' +
      XC.CATS.map(function (c) {
        return '<p class="hp-nav__h">' + esc(c.l) + '</p>' + c.subs.map(function (s) { var k = XC.subKey(s), m = subChanged(k); return '<button type="button" data-act="hp-sel" data-v="' + k + '" class="' + (H.sel === k ? 'is-on' : '') + '"><span>' + esc(s.l) + '</span><b>' + (m || '') + '</b></button>'; }).join('');
      }).join('') + '</nav>';
    var main = H.sel === 'umum' ? hargaUmum() : H.sel === 'material' ? hargaMaterial() : hargaSub(H.sel);
    var sc = el.body.querySelector('.hp-main'), top = sc ? sc.scrollTop : 0, bodyTop = el.body.scrollTop;
    el.body.innerHTML = '<div class="hp">' + nav + '<div class="hp-main">' + main + '</div></div>';
    if (state.harga.keep) { el.body.scrollTop = bodyTop; state.harga.keep = false; }
  }
  function hpHead(cols) { return '<div class="tr tr--hp th"><span>' + cols[0] + '</span><span>' + cols[1] + '</span><span style="text-align:right">Faktor</span><span style="text-align:right">Tambahan (IDR)</span><span style="text-align:right">Dampak contoh</span><span></span></div>'; }
  function hargaSub(key) {
    var it = subsAll().filter(function (x) { return x.key === key; })[0]; if (!it) return '<div class="empty">Pilih sub-kategori.</div>';
    var s = it.s, def = XC.priceDefaults(s), tbl = XC.priceTable(s), cfg = XC.defaults(it.cat.id, s.id), bd = XC.breakdown(cfg), drivers = XC.sizeDrivers(s);
    var refTxt = drivers.filter(function (k) { return /^(w|d|h)$/.test(k.id); }).map(function (k) { return k.id.toUpperCase() + ' ' + k.ref; }).join(' · ') + ' cm';
    var out = '<div class="est hp-est"><div><span>Contoh harga · konfigurasi bawaan</span><b>' + rupiah(bd.total) + '</b></div><p>' + esc(XC.dimsText(cfg)) + '<br>' + bd.rows.length + ' komponen harga — buka Customize untuk mencoba kombinasi lain; harga di sana ikut tabel ini.</p></div>';
    // dasar & ukuran
    var p = 'sub|' + key + '|';
    out += '<p class="group__h">Harga dasar & ukuran <small>ukuran referensi ' + esc(refTxt) + '</small></p><div class="tbl">' +
      '<div class="tr tr--hp th"><span>Komponen</span><span>Keterangan</span><span></span><span style="text-align:right">IDR</span><span style="text-align:right">Bawaan</span><span></span></div>' +
      '<div class="tr tr--hp"><span><b>Harga dasar</b></span><span class="muted">pada ukuran referensi</span><span></span>' + hpCell(p + 'base', tbl.base, def.base, 'm') + '<span class="muted r">' + rupiah(def.base) + '</span>' + hpReset(p + 'base', tbl.base !== def.base) + '</div>' +
      (def.baseRound != null ? '<div class="tr tr--hp"><span><b>Harga dasar top bulat / persegi</b></span><span class="muted">pada Ø ' + ((drivers.filter(function (k) { return k.id === 'dia'; })[0] || {}).ref || 90) + ' cm</span><span></span>' + hpCell(p + 'baseRound', tbl.baseRound, def.baseRound, 'm') + '<span class="muted r">' + rupiah(def.baseRound) + '</span>' + hpReset(p + 'baseRound', tbl.baseRound !== def.baseRound) + '</div>' : '') +
      drivers.map(function (k) {
        var g = s.groups.filter(function (x) { return x.id === k.id; })[0] || {}, range = g.min != null ? g.min + '–' + g.max + ' cm' : '';
        if (XC.sizeMode && XC.sizeMode(s) === 'ratio') return '<div class="tr tr--hp"><span>' + esc(k.l) + '</span><span class="muted">ref ' + k.ref + ' cm' + (range ? ' · ' + range : '') + '</span><span></span><span class="muted r" style="grid-column:span 3">harga × ukuran / ' + k.ref + '</span></div>';   // sofa: dikali rasio, tanpa tarif per 10 cm
        return '<div class="tr tr--hp"><span>' + esc(k.l) + ' · per ' + k.per + ' cm</span><span class="muted">ref ' + k.ref + ' cm' + (range ? ' · ' + range : '') + '</span><span></span>' + hpCell(p + 'per10|' + k.id, tbl.per10[k.id], def.per10[k.id], 'm') + '<span class="muted r">' + rupiah(def.per10[k.id]) + '</span>' + hpReset(p + 'per10|' + k.id, tbl.per10[k.id] !== def.per10[k.id]) + '</div>';
      }).join('') + '</div>';
    // pilihan per kelompok
    var groupsOf = s.groups.filter(function (g) { return g.type !== 'range' && !XC.MAT_GROUPS[g.id] && g.id !== 'color' && typeof g.opts !== 'function'; });
    out += '<p class="group__h">Pilihan <small>faktor × mengalikan (dasar + ukuran) · tambahan ditambahkan per unit</small></p><div class="tbl">' + hpHead(['Pilihan', 'Kelompok']) +
      groupsOf.map(function (g) {
        return '<div class="tr tr--hp tr--sub"><span>' + esc(g.l) + '</span><span class="muted">' + esc({ jenis: 'Jenis', bentuk: 'Bentuk', ukuran: 'Ukuran', material: 'Material', detail: 'Detail' }[g.step] || g.step) + (g.type === 'multi' ? ' · bisa lebih dari satu' : '') + '</span><span></span><span></span><span></span><span></span></div>' +
          g.opts.map(function (o) {
            var k2 = g.id + '.' + o.id, d0 = def.opts[k2] || { f: 1, add: 0 }, v = tbl.opts[k2] || d0, mod = v.f !== d0.f || v.add !== d0.add;
            var imp = def.base * (v.f - 1) + v.add;
            return '<div class="tr tr--hp"><span class="hp-opt">' + esc(o.l) + '</span><span class="muted">' + (o.en && o.en !== o.l ? esc(o.en) : '') + '</span>' + hpCell(p + 'opts|' + k2 + '|f', v.f, d0.f, 'f') + hpCell(p + 'opts|' + k2 + '|add', v.add, d0.add, 'm') +
              '<span class="r' + (imp ? '' : ' muted') + '">' + (imp ? (imp > 0 ? '+ ' : '− ') + rupiah(Math.abs(imp)) : '—') + '</span>' + hpReset(p + 'opts|' + k2, mod) + '</div>';
          }).join('');
      }).join('') + '</div>';
    // per unit
    var eachKeys = Object.keys(def.each);
    if (eachKeys.length) out += '<p class="group__h">Per buah</p><div class="tbl"><div class="tr tr--hp th"><span>Komponen</span><span>Keterangan</span><span></span><span style="text-align:right">IDR / buah</span><span style="text-align:right">Bawaan</span><span></span></div>' +
      eachKeys.map(function (k) { var g = s.groups.filter(function (x) { return x.id === k; })[0] || { l: k }; return '<div class="tr tr--hp"><span>' + esc(g.l) + '</span><span class="muted">' + (g.min != null ? g.min + '–' + g.max + ' buah' : '') + '</span><span></span>' + hpCell(p + 'each|' + k, tbl.each[k], def.each[k], 'm') + '<span class="muted r">' + rupiah(def.each[k]) + '</span>' + hpReset(p + 'each|' + k, tbl.each[k] !== def.each[k]) + '</div>'; }).join('') + '</div>';
    out += '<p class="muted" style="margin-top:14px">Kain, warna, kayu, besi, batu & warna HPL diatur sekali untuk semua sub-kategori di <b>Material & warna</b>.</p>';
    return out;
  }
  function hargaMaterial() {
    var md = XC.matDefaults(), T2 = { uph: 'Kain & kulit', wood: 'Kayu', metal: 'Finishing besi / logam', stone: 'Batu & marmer', panel: 'Warna HPL / duco' };
    var row = function (key, label, sub, indent) {
      var d0 = md[key] || { f: 1, add: 0 }, v = XC.matPrice(key), mod = v.f !== d0.f || v.add !== d0.add, imp = 3300000 * (v.f - 1) + v.add;
      return '<div class="tr tr--hp' + (indent ? ' tr--in' : '') + '"><span class="hp-opt">' + label + '</span><span class="muted">' + (sub || '') + '</span>' + hpCell('mat|' + key + '|f', v.f, d0.f, 'f') + hpCell('mat|' + key + '|add', v.add, d0.add, 'm') +
        '<span class="r' + (imp ? '' : ' muted') + '">' + (imp ? (imp > 0 ? '+ ' : '− ') + rupiah(Math.abs(imp)) : '—') + '</span>' + hpReset('mat|' + key, mod) + '</div>';
    };
    var sw = function (hex) { return hex ? '<i class="hp-sw" style="background:' + esc(hex) + '"></i>' : ''; };
    return '<div class="est hp-est"><div><span>Material berlaku untuk semua sub-kategori</span><b>Faktor × &amp; tambahan</b></div><p>Faktor mengalikan harga (dasar + ukuran) — cocok untuk kain/kulit yang kebutuhannya ikut ukuran. Kolom “dampak contoh” memakai sofa 3 dudukan bawaan (IDR 3.300.000).</p></div>' +
      Object.keys(XC.MAT_GROUPS).map(function (g) {
        var list = XC.MAT_GROUPS[g];
        return '<p class="group__h">' + T2[g] + '</p><div class="tbl">' + hpHead(['Material', 'Keterangan']) +
          list.map(function (o) {
            var r = row(g + '.' + o.id, sw(o.hex) + esc(o.l), g === 'uph' ? o.colors.length + ' warna' : '', false);
            if (g === 'uph') r += o.colors.map(function (c) { return row('color.' + o.id + '.' + c.id, sw(c.hex) + esc(c.l), '', true); }).join('');
            return r;
          }).join('') + '</div>';
      }).join('');
  }
  function hargaUmum() {
    var g = XC.globalPrice(), d = XC.GLOBAL_DEF, P = prGet().global;
    var rounds = [1000, 5000, 10000, 50000, 100000];
    return '<div class="sets">' +
      '<div class="card set"><h3>Pembulatan harga</h3><p>Harga per unit dibulatkan ke kelipatan ini (bawaan ' + rupiah(d.round) + ').</p><select class="sel" data-hp="glob|round" data-kind="sel">' + rounds.map(function (r) { return '<option value="' + r + '"' + (g.round === r ? ' selected' : '') + '>' + rupiah(r) + '</option>'; }).join('') + '</select></div>' +
      '<div class="card set"><h3>Penyesuaian umum</h3><p>Persen yang ditambahkan (atau dikurangi, pakai minus) ke semua harga Customize — mis. kenaikan bahan baku. Bawaan 0%.</p><div class="unit" style="max-width:180px"><input class="in" data-hp="glob|markup" data-kind="p" value="' + esc(String(g.markup).replace('.', ',')) + '" inputmode="decimal"><i>%</i></div>' + (P.markup != null ? hpReset('glob|markup', true) : '') + '</div>' +
      '<div class="card set"><h3>Harga minimum</h3><p>Harga per unit tidak akan di bawah angka ini (0 = tanpa batas).</p><div class="unit" style="max-width:220px"><input class="in" data-hp="glob|min" data-kind="m" value="' + fmt(g.min) + '" inputmode="numeric"><i>IDR</i></div>' + (P.min != null ? hpReset('glob|min', true) : '') + '</div>' +
      '<div class="card set"><h3>Cara kerja</h3><p>1. Harga dasar sub-kategori pada ukuran referensi.<br>2. + penyesuaian per 10 cm dari ukuran referensi.<br>3. × faktor setiap pilihan & material (berurutan).<br>4. + tambahan setiap pilihan, material & komponen per buah.<br>5. ± penyesuaian umum, lalu dibulatkan. Jumlah unit dikalikan terakhir.</p></div>' +
    '</div>';
  }
  function hpSet(path, raw, kind) {
    var p = prGet(), seg = path.split('|');
    if (seg[0] === 'glob') {
      var gv = kind === 'p' ? dec(raw) : kind === 'sel' ? +raw : num(raw);
      if (gv == null || gv === XC.GLOBAL_DEF[seg[1]]) delete p.global[seg[1]]; else p.global[seg[1]] = gv;
      return;
    }
    var val = kind === 'f' ? dec(raw) : num(raw);
    if (seg[0] === 'mat') {
      var key = seg[1], f = seg[2], d0 = XC.matDefaults()[key] || { f: 1, add: 0 }, o = p.mats[key] || {};
      if (val == null) val = d0[f];
      if (val === d0[f]) delete o[f]; else o[f] = val;
      if (Object.keys(o).length) p.mats[key] = o; else delete p.mats[key];
      return;
    }
    var sk = seg[1], it = subsAll().filter(function (x) { return x.key === sk; })[0]; if (!it) return;
    var def = XC.priceDefaults(it.s), o2 = p.subs[sk] = p.subs[sk] || {};
    if (seg[2] === 'base' || seg[2] === 'baseRound') { if (val == null || val === def[seg[2]]) delete o2[seg[2]]; else o2[seg[2]] = val; return; }
    if (seg[2] === 'per10' || seg[2] === 'each') { var m = o2[seg[2]] = o2[seg[2]] || {}; if (val == null || val === def[seg[2]][seg[3]]) delete m[seg[3]]; else m[seg[3]] = val; return; }
    if (seg[2] === 'opts') {
      var ok = seg[3], fld = seg[4], d1 = def.opts[ok] || { f: 1, add: 0 }, oo = (o2.opts = o2.opts || {})[ok] || {};
      if (val == null) val = d1[fld];
      if (val === d1[fld]) delete oo[fld]; else oo[fld] = val;
      if (Object.keys(oo).length) o2.opts[ok] = oo; else delete o2.opts[ok];
    }
  }
  function hpResetPath(path) {
    var p = prGet(), seg = path.split('|');
    if (seg[0] === 'glob') delete p.global[seg[1]];
    else if (seg[0] === 'mat') delete p.mats[seg[1]];
    else { var o = p.subs[seg[1]]; if (!o) return; if (seg.length === 3) delete o[seg[2]]; else if (o[seg[2]]) delete o[seg[2]][seg[3]]; }
  }
  function hpCsv() {
    var rows = [['Bagian', 'Sub-kategori', 'Kelompok', 'Pilihan / komponen', 'Faktor', 'Tambahan (IDR)', 'Faktor bawaan', 'Tambahan bawaan (IDR)']];
    rows.push(['Umum', '', '', 'Pembulatan', '', XC.globalPrice().round, '', XC.GLOBAL_DEF.round]);
    rows.push(['Umum', '', '', 'Penyesuaian umum (%)', '', XC.globalPrice().markup, '', 0]);
    subsAll().forEach(function (it) {
      var s = it.s, def = XC.priceDefaults(s), t = XC.priceTable(s), nm = it.cat.l + ' › ' + s.l;
      rows.push(['Dasar', nm, '', 'Harga dasar', '', t.base, '', def.base]);
      if (def.baseRound != null) rows.push(['Dasar', nm, '', 'Harga dasar top bulat / persegi', '', t.baseRound, '', def.baseRound]);
      XC.sizeDrivers(s).forEach(function (k) { rows.push(['Ukuran', nm, '', k.l + ' per ' + k.per + ' cm (ref ' + k.ref + ')', '', t.per10[k.id], '', def.per10[k.id]]); });
      s.groups.forEach(function (g) {
        if (g.type === 'range' || XC.MAT_GROUPS[g.id] || g.id === 'color' || typeof g.opts === 'function') return;
        g.opts.forEach(function (o) { var k = g.id + '.' + o.id, v = t.opts[k] || { f: 1, add: 0 }, d0 = def.opts[k] || { f: 1, add: 0 }; rows.push(['Pilihan', nm, g.l, o.l, v.f, v.add, d0.f, d0.add]); });
      });
      Object.keys(def.each).forEach(function (k) { rows.push(['Per buah', nm, '', k, '', t.each[k], '', def.each[k]]); });
    });
    var md = XC.matDefaults();
    Object.keys(md).forEach(function (k) { var v = XC.matPrice(k); rows.push(['Material', '', k.split('.')[0], k.split('.').slice(1).join(' · '), v.f, v.add, md[k].f, md[k].add]); });
    download('XIONCO-harga-customize.csv', csv(rows), 'text/csv');
  }

  /* ---------------------------------------------------------------- PENGATURAN */
  var MODE_TEXT = { folder: 'Folder data/ (lokal)', online: 'Online — hanya di browser ini', browser: 'Browser ini (buka lewat serve.js)' };
  function storageSize() { var n = 0; try { for (var k in localStorage) if (k.indexOf('xionco') === 0) n += (localStorage.getItem(k) || '').length; } catch (e) {} return n; }
  function renderSet() {
    var s = XVDB.settings();
    head('06 · Pengaturan', 'Pengaturan', 'Posisi tombol, data, dan pintasan. Semua data tersimpan di browser ini — gunakan export untuk cadangan atau memindahkan ke komputer lain.');
    el.body.innerHTML = '<div class="sets">' + PLUG.map(function (p) { return p.setCard ? p.setCard(plugCtx()) : ''; }).join('') +
      '<div class="card set"><h3>Posisi tombol</h3><p>Default di kiri bawah. Tombol juga bisa diseret — ia akan menempel ke sudut terdekat.</p><div class="corners">' +
        [['tl', 'Kiri atas'], ['tr', 'Kanan atas'], ['bl', 'Kiri bawah'], ['br', 'Kanan bawah']].map(function (c) { return '<button type="button" data-act="pos" data-pos="' + c[0] + '"' + (s.position === c[0] ? ' class="is-on"' : '') + '>' + c[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card set"><h3>Tampilan tombol</h3><p>Sembunyikan tombol melayang. Panel tetap bisa dibuka dengan Ctrl + Shift + D.</p>' +
        '<button class="tg' + (s.hidden ? ' is-on' : '') + '" type="button" data-act="hide"><span class="sw"></span>Sembunyikan tombol</button></div>' +
      '<div class="card set"><h3>Database</h3><p>' + (XVDB.mode() === 'folder' ? 'Tersimpan di folder proyek: <span class="mono">data/products.json</span>, <span class="mono">data/checks.json</span> (ikut online saat dipublish) dan <span class="mono">data/private/customs.json</span> (data pelanggan — tidak pernah online). Cadangan otomatis di <span class="mono">data/history/</span>.' : XVDB.mode() === 'online' ? 'Situs online membaca katalog yang dipublish. Perubahan di sini hanya tersimpan di browser ini — ubah di komputer lokal lalu publish agar tampil untuk semua.' : 'Dibuka langsung dari file, jadi data tersimpan di browser ini. Jalankan <span class="mono">node tools/serve.js</span> agar tersimpan ke folder data/.') + '</p>' +
        '<div class="acts" style="justify-content:flex-start"><button class="btn" type="button" data-act="all-export">' + ic('down') + 'Export semua</button><button class="btn" type="button" data-act="import">' + ic('up') + 'Import</button><button class="btn btn--danger" type="button" data-act="all-reset">' + ic('trash') + 'Hapus semua data lokal</button></div></div>' +
      '<div class="card set"><h3>Situs online</h3><p>' + (LOCAL ? 'Anda sedang di komputer lokal — tombol selalu tampil.' : 'Tombol developer hanya tampil di browser yang sudah diaktifkan (sekarang: <b>' + (devAllowed() ? 'aktif' : 'tidak aktif') + '</b>). Pengunjung umum tidak melihatnya.') + '</p><div class="keys"><kbd>?dev</kbd><span>Tambahkan di akhir alamat untuk mengaktifkan di browser ini</span><kbd>?dev=0</kbd><span>Menonaktifkan lagi</span></div></div>' +
      '<div class="card set"><h3>Pintasan</h3><div class="keys"><kbd>Ctrl Shift D</kbd><span>Buka / tutup developer settings</span><kbd>Esc</kbd><span>Tutup editor / panel</span></div></div>' +
    '</div>';
  }

  /* ---------------------------------------------------------------- editor (laci) */
  function fieldHTML(fd, val, data) {
    var cls = 'fl s' + (fd.s || 3), lab = '<label>' + esc(fd.l) + (fd.req ? ' <em>*</em>' : '') + '</label>', k = esc(fd.k);
    var opts = typeof fd.o === 'function' ? fd.o() : fd.o;
    var v = val == null ? (fd.d != null ? fd.d : '') : val;
    switch (fd.t) {
      case 'textarea': return '<div class="' + cls + '">' + lab + '<textarea class="ta" data-k="' + k + '" placeholder="' + esc(fd.ph || '') + '">' + esc(v) + '</textarea></div>';
      case 'select': return '<div class="' + cls + '">' + lab + '<select class="sel" data-k="' + k + '"><option value="">—</option>' + (opts || []).map(function (o) { var ov = o.v != null ? o.v : o, ol = o.l != null ? o.l : o; return '<option value="' + esc(ov) + '"' + (String(v) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select></div>';
      case 'item': return fieldHTML({ k: fd.k, l: fd.l, t: 'select', s: fd.s, req: fd.req, o: itemOptions }, val, data);
      case 'money': return '<div class="' + cls + '">' + lab + '<div class="unit"><input class="in" data-k="' + k + '" data-money value="' + fmt(v === '' ? null : v) + '" placeholder="' + esc(fd.ph || '0') + '" inputmode="numeric"><i>IDR</i></div></div>';
      case 'number': return '<div class="' + cls + '">' + lab + '<div class="unit"><input class="in" type="number" data-k="' + k + '" value="' + esc(v) + '"' + (fd.u ? '' : '') + '>' + (fd.u ? '<i>' + esc(fd.u) + '</i>' : '') + '</div></div>';
      case 'date': return '<div class="' + cls + '">' + lab + '<input class="in" type="date" data-k="' + k + '" value="' + esc(v) + '"></div>';
      case 'toggle': return '<div class="' + cls + '">' + lab + '<button class="tg' + (v ? ' is-on' : '') + '" type="button" data-tg="' + k + '"><span class="sw"></span>' + (v ? 'Ya' : 'Tidak') + '</button></div>';
      case 'checks': var arr = Array.isArray(v) ? v : []; return '<div class="' + cls + '">' + lab + '<div class="cg">' + (opts || []).map(function (o) { return '<button type="button" data-cg="' + k + '" data-v="' + esc(o) + '"' + (arr.indexOf(o) >= 0 ? ' class="is-on"' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div></div>';
      case 'estimate': var e = estimate(data); return '<div class="' + cls + '"><div class="est" data-est><div><span>Estimasi otomatis</span><b>' + (e ? rupiah(e) : '—') + '</b></div><p>Harga dasar × penyesuaian ukuran × faktor material + kaki, fitur, bantal × jumlah. Aturan contoh — ubah sesuai kebijakan harga.</p></div></div>';
      case 'preview': return '<div class="' + cls + '"><div class="prev" data-prev>' + (data.img ? '<img src="' + esc(imgSrc(data.img, 768)) + '" alt="">' : '<span class="muted">Belum ada gambar</span>') + '</div></div>';
      default: return '<div class="' + cls + '">' + lab + '<input class="in" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(fd.ph || '') + '"' + (fd.ro ? ' readonly' : '') + '></div>';
    }
  }
  function openEditor(kind, rec, opts) {
    // kind: 'product' | 'custom'
    state.editor = { kind: kind, rec: JSON.parse(JSON.stringify(rec)), isNew: !!(opts && opts.isNew), type: opts && opts.type };
    var E = state.editor, data = kind === 'product' ? E.rec : (E.rec.data = E.rec.data || {});
    var sections, title, eye;
    if (kind === 'product') { sections = KAT_FIELDS(E.isNew); title = E.isNew ? 'Item baru' : E.rec.name; eye = 'Katalog · ' + (E.isNew ? 'tambah' : 'ubah'); }
    else {
      var F = FORM[E.rec.type]; sections = F.sections; title = E.isNew ? F.title + ' baru' : cusName(E.rec); eye = 'Custom · ' + F.title + (E.rec.id ? ' · ' + E.rec.id : '');
      if (E.isNew && !data.status) data.status = 'Draft';
    }
    el.drawer.classList.toggle('is-wide', kind === 'custom');
    el.drawer.innerHTML = '<div class="drawer__h"><div><p class="eyebrow">' + esc(eye) + '</p><h3>' + esc(title) + '</h3></div></div>' +
      '<div class="drawer__b">' + sections.map(function (s) { return '<div class="fs"><p class="fs__h">' + esc(s.h) + '</p><div class="grid">' + s.f.map(function (fd) { return fieldHTML(fd, data[fd.k], data); }).join('') + '</div></div>'; }).join('') + '</div>' +
      '<div class="drawer__f"><div>' + (E.isNew ? '' : '<button class="btn btn--ghost btn--danger" type="button" data-act="ed-del">' + ic('trash') + 'Hapus</button>' + '<button class="btn btn--ghost" type="button" data-act="ed-dup">' + ic('dup') + 'Duplikat</button>') + '</div>' +
      '<div><button class="btn" type="button" data-act="ed-close">Batal</button><button class="btn btn--dark" type="button" data-act="ed-save">' + ic('check') + 'Simpan</button></div></div>';
    el.drawer.classList.add('is-open');
    el.drawer.querySelector('.drawer__b').scrollTop = 0;
  }
  function closeEditor() { if (!state.editor) return; state.editor = null; el.drawer.classList.remove('is-open'); }
  function edData() { var E = state.editor; return E.kind === 'product' ? E.rec : E.rec.data; }
  function refreshEst() {
    var box = el.drawer.querySelector('[data-est] b');
    if (box) { var e = estimate(edData()); box.textContent = e ? rupiah(e) : '—'; }
  }
  function saveEditor() {
    var E = state.editor, d = edData();
    if (E.kind === 'product') {
      d.id = String(d.id || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      if (!d.id || !d.name) { toast('ID dan nama wajib diisi'); return; }
      var i = products.findIndex(function (p) { return p.id === d.id; });
      if (E.isNew && i >= 0) { toast('ID sudah dipakai'); return; }
      if (i >= 0) products[i] = d; else products.unshift(d);
      XVDB.saveProducts(products); products = XVDB.products();
      toast(E.isNew ? 'Item ditambahkan' : 'Item diperbarui');
    } else {
      var miss = FORM[E.rec.type].sections.reduce(function (a, s) { return a.concat(s.f.filter(function (f) { return f.req && !d[f.k]; })); }, []);
      E.rec.estimate = E.rec.type === 'existing' ? estimate(d) : null;
      var saved = XVDB.saveCustom(E.rec);
      toast('Tersimpan · ' + saved.id + (miss.length ? ' · ' + miss.length + ' kolom wajib kosong' : ''));
    }
    closeEditor(); renderTab();
  }

  /* ---------------------------------------------------------------- event */
  function setFilter(path, v) { var p = path.split('.'); state[{ aset: 'aset', kat: 'kat', cus: 'cus' }[p[0]]][p[1]] = v; }
  function onClick(e) {
    var t = e.target.closest('[data-tab],[data-act],[data-seg],[data-cell],[data-tg],[data-cg]');
    if (!t || !root.contains(t)) return;
    if (t === el.fab || t.closest('.fab')) return;
    if (t.dataset.tab) { state.tab = t.dataset.tab; closeEditor(); renderTab(); el.body.scrollTop = 0; if (state.tab === 'aset' && !Object.keys(state.detect).length) scan(); return; }
    if (t.dataset.seg) { setFilter(t.dataset.seg, t.dataset.v); renderTab(); return; }
    if (t.dataset.tg) { var d = edData(), on = !d[t.dataset.tg]; d[t.dataset.tg] = on; t.classList.toggle('is-on', on); t.lastChild.textContent = on ? 'Ya' : 'Tidak'; return; }
    if (t.dataset.cg) { var d2 = edData(), arr = d2[t.dataset.cg] = Array.isArray(d2[t.dataset.cg]) ? d2[t.dataset.cg] : [], i = arr.indexOf(t.dataset.v); if (i >= 0) arr.splice(i, 1); else arr.push(t.dataset.v); t.classList.toggle('is-on', i < 0); refreshEst(); return; }
    if (t.dataset.cell && t.tagName === 'BUTTON') {
      var row = t.closest('[data-id]'), p = products.filter(function (x) { return x.id === row.dataset.id; })[0];
      p[t.dataset.cell] = !p[t.dataset.cell]; t.classList.toggle('is-on', p[t.dataset.cell]); saveProducts(); return;
    }
    var a = t.dataset.act;
    for (var pi = 0; pi < PLUG.length; pi++) if (a && PLUG[pi].prefix && a.indexOf(PLUG[pi].prefix) === 0) { PLUG[pi].click(t, e, plugCtx()); return; }
    if (a === 'goto') { location.href = ROOT + t.dataset.path; return; }
    if (a === 'copy') { var txt = t.dataset.text; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Disalin'); }, function () { toast(txt); }); return; }
    if (a === 'scan') { state.detect = {}; scan(); return; }
    if (a === 'check') { var k = t.dataset.key; if (state.detect[k]) { toast('Terdeteksi otomatis di folder'); return; } XVDB.setCheck(k, !XVDB.checks()[k]); return; }
    if (a === 'aset-csv') {
      var rows = assetRows();
      download('XIONCO-PR-aset.csv', csv([['Grup', 'Item', 'ID', 'Aset', 'Level', 'Path', 'Spesifikasi', 'Status']].concat(rows.map(function (r) {
        return [r.group, r.item ? r.item.name : '', r.item ? r.item.id : '', r.label, r.level, r.path, r.spec, r.ready ? 'Siap' : r.temp ? 'Sementara' : 'Belum'];
      }))), 'text/csv');
      return;
    }
    if (a === 'kat-new') { openEditor('product', { id: '', name: '', cat: 'seats', type: '', price: null, was: null, from: false, status: 'draft', stock: 'Ready', customizable: true, desc: '', img: '', url: '' }, { isNew: true }); return; }
    if (a === 'kat-edit') { var r = t.closest('[data-id]'); openEditor('product', products.filter(function (x) { return x.id === r.dataset.id; })[0]); return; }
    if (a === 'kat-export') { download('XIONCO-katalog.json', JSON.stringify({ app: 'XIONCO', kind: 'database', exported: new Date().toISOString(), products: products }, null, 2)); return; }
    if (a === 'kat-reset') { if (t.dataset.armed) { XVDB.resetProducts(); products = XVDB.products(); toast('Katalog kembali ke data bawaan'); renderTab(); } else { t.dataset.armed = '1'; t.lastChild.textContent = 'Yakin? klik lagi'; setTimeout(function () { if (t.isConnected) { delete t.dataset.armed; t.lastChild.textContent = 'Bawaan'; } }, 3000); } return; }
    if (a === 'import') { el.file.value = ''; el.file.click(); return; }
    if (a === 'cus-new') { openEditor('custom', { type: t.dataset.type, data: { qty: 1 } }, { isNew: true }); return; }
    if (a === 'cus-edit') { var rec = XVDB.customs().filter(function (x) { return x.id === t.dataset.id; })[0]; if (rec) openEditor('custom', rec); return; }
    if (a === 'cus-csv') {
      var list = XVDB.customs();
      download('XIONCO-custom.csv', csv([['ID', 'Tipe', 'Item/Proyek', 'Pelanggan', 'WhatsApp', 'Status', 'Penawaran', 'Estimasi', 'Dibuat', 'Diperbarui']].concat(list.map(function (r) {
        var d = r.data || {}; return [r.id, r.type === 'full' ? 'Full custom' : 'Dari item', cusName(r), d.custName, d.custPhone, d.status, d.quote, r.estimate, r.created ? new Date(r.created).toISOString() : '', r.updated ? new Date(r.updated).toISOString() : ''];
      }))), 'text/csv');
      return;
    }
    if (a === 'ed-close') { closeEditor(); return; }
    if (a === 'ed-save') { saveEditor(); return; }
    if (a === 'ed-dup') {
      var E = state.editor, copy = JSON.parse(JSON.stringify(E.rec));
      if (E.kind === 'product') { copy.id = copy.id + '-copy'; copy.name = copy.name + ' (salinan)'; copy.status = 'draft'; openEditor('product', copy, { isNew: true }); }
      else { delete copy.id; delete copy.created; copy.data.status = 'Draft'; openEditor('custom', copy, { isNew: true }); }
      return;
    }
    if (a === 'ed-del') {
      if (!t.dataset.armed) { t.dataset.armed = '1'; t.lastChild.textContent = 'Yakin hapus?'; return; }
      var E2 = state.editor;
      if (E2.kind === 'product') { products = products.filter(function (x) { return x.id !== E2.rec.id; }); XVDB.saveProducts(products); toast('Item dihapus'); }
      else { XVDB.deleteCustom(E2.rec.id); toast('Pesanan dihapus'); }
      closeEditor(); renderTab(); return;
    }
    if (a === 'hp-sel') { state.harga.sel = t.dataset.v; renderHarga(); el.body.scrollTop = 0; return; }
    if (a === 'hp-reset') { hpResetPath(t.dataset.path); prSave(); state.harga.keep = true; renderHarga(); renderTabs(); return; }
    if (a === 'hp-csv') { hpCsv(); return; }
    if (a === 'hp-reset-all') { if (!t.dataset.armed) { t.dataset.armed = '1'; t.lastChild.textContent = 'Yakin? klik lagi'; setTimeout(function () { if (t.isConnected) { delete t.dataset.armed; t.lastChild.textContent = 'Semua ke bawaan'; } }, 3000); return; } pr = {}; XVDB.resetPricing(); pr = null; toast('Semua harga kembali ke bawaan'); renderHarga(); renderTabs(); return; }
    if (a === 'pos') { XVDB.setSetting('position', t.dataset.pos); renderSet(); return; }
    if (a === 'czlayout') { XVDB.setSetting('czLayout', t.dataset.v); renderSet(); toast(t.dataset.v === 'box2' ? 'Customize: Box 2 (kotak kiri)' : 'Customize: Box 1 (satu kotak)'); return; }
    if (a === 'hide') { var s = XVDB.settings(); XVDB.setSetting('hidden', !s.hidden); renderSet(); toast(!s.hidden ? 'Tombol disembunyikan · Ctrl+Shift+D' : 'Tombol ditampilkan'); return; }
    if (a === 'all-export') { download('XIONCO-database-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(XVDB.exportAll(), null, 2)); return; }
    if (a === 'all-reset') { if (!t.dataset.armed) { t.dataset.armed = '1'; t.lastChild.textContent = 'Yakin? klik lagi'; return; } XVDB.resetAll(); products = XVDB.products(); toast('Semua data lokal dihapus'); renderTab(); return; }
  }
  function onInput(e) {
    var t = e.target;
    if (t.dataset.plug) { var pl = plugById(t.dataset.plug); if (pl && pl.input) pl.input(t, e, plugCtx()); return; }
    if (t.dataset.f) { setFilter(t.dataset.f, t.value); clearTimeout(onInput.t); onInput.t = setTimeout(function () { var pos = t.selectionStart; renderTab(); var n = root.querySelector('[data-f="' + t.dataset.f + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} } }, 200); return; }
    if (t.dataset.k && state.editor) {
      var d = edData();
      d[t.dataset.k] = t.dataset.money !== undefined ? num(t.value) : t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value;
      if (t.dataset.k === 'item') { var p = products.filter(function (x) { return x.id === t.value; })[0]; var bp = el.drawer.querySelector('[data-k="basePrice"]'); if (p && bp && !num(bp.value)) { d.basePrice = p.price; bp.value = fmt(p.price); } }
      if (t.dataset.k === 'img') { var pv = el.drawer.querySelector('[data-prev]'); if (pv) pv.innerHTML = t.value ? '<img src="' + esc(imgSrc(t.value, 768)) + '" alt="">' : '<span class="muted">Belum ada gambar</span>'; }
      refreshEst();
    }
  }
  function onChange(e) {
    var t = e.target;
    if (t.dataset.plug) { var pl = plugById(t.dataset.plug); if (pl && pl.change) pl.change(t, e, plugCtx()); return; }
    if (t.dataset.f && t.tagName === 'SELECT') { setFilter(t.dataset.f, t.value); renderTab(); return; }
    if (t.dataset.hp) { hpSet(t.dataset.hp, t.value, t.dataset.kind); prSave(); state.harga.keep = true; var nextPath = t.dataset.hp; renderHarga(); renderTabs(); return; }
    if (t.dataset.money !== undefined) { t.value = fmt(num(t.value)); }
    if (t.dataset.k && t.tagName === 'SELECT') onInput(e);
    if (t.dataset.cell) {
      var row = t.closest('[data-id]'), p = products.filter(function (x) { return x.id === row.dataset.id; })[0];
      if (t.dataset.cell === 'status') p.status = t.value;
      else { p[t.dataset.cell] = num(t.value); t.value = fmt(p[t.dataset.cell]); }
      saveProducts();
    }
  }
  function onImport() {
    var f = el.file.files && el.file.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { XVDB.importAll(JSON.parse(r.result)); products = XVDB.products(); toast('Data diimport'); renderTab(); }
      catch (err) { toast('Gagal: ' + err.message); }
    };
    r.readAsText(f);
  }

  /* ---------------------------------------------------------------- jalan */
  function start() { deps().then(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
