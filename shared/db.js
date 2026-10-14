/* ==========================================================================
   XIONCO — Database (prototipe backend)
   Tiga mode, dipilih otomatis:
   • folder  — dibuka lewat `node tools/serve.js` di komputer lokal:
               dibaca & disimpan langsung ke file di folder data/
                 data/products.json          katalog item       (ikut online saat di-push)
                 data/checks.json            centang aset       (ikut online)
                 data/pricing.json           harga Customize    (ikut online — selisih dari harga bawaan)
                 data/private/customs.json   pesanan custom     (TIDAK ikut online)
   • online  — situs yang sudah online: membaca data/*.json yang dipublish;
               perubahan di Developer Settings hanya tersimpan di browser itu
   • browser — dibuka langsung dari file (double-click): tersimpan di browser

   API: window.XVDB
     ready                 Promise — selesai memuat (situs v5 menunggu ini)
     mode()                'folder' | 'online' | 'browser'
     products() / activeProducts() / saveProducts(list) / resetProducts()
     customs() / saveCustom(rec) / deleteCustom(id)
     checks() / setCheck(key, bool)
     pricing() / savePricing(obj) / resetPricing()  harga Customize (selisih dari bawaan custom-spec.js)
     settings() / setSetting(key, value)          (selalu per browser)
     assetList()           Promise<string[]> daftar file di assets/ (mode folder)
     exportAll() / importAll(obj) / resetAll()
   Event: window 'xvdb:change'  { detail: { what } }  ·  'xvdb:error' { detail: { message } }
   ========================================================================== */
(function () {
  'use strict';
  var SCRIPT = document.currentScript;
  var ROOT = ((SCRIPT && SCRIPT.src) || '').replace(/shared\/db\.js(\?.*)?$/, '');
  var NS = 'xionco.db.';
  var XV = window.XV || {};
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var read = function (k, d) { try { var v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var write = function (k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  var drop = function (k) { try { localStorage.removeItem(NS + k); } catch (e) {} };
  var emit = function (what, extra) { try { window.dispatchEvent(new CustomEvent('xvdb:' + (extra ? 'error' : 'change'), { detail: extra ? { message: extra } : { what: what } })); } catch (e) {} };
  var LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var HTTP = /^https?:$/.test(location.protocol);
  var chan = 'BroadcastChannel' in window ? new BroadcastChannel('xionco-db') : null;

  // kolom tambahan katalog (tidak ada di data.js awal)
  var EXTRA = { status: 'aktif', dims: '', leadTime: '', customizable: false, stock: 'Ready', note: '' };
  function normalize(p) {
    var o = Object.assign({}, EXTRA, p);
    o.price = o.price === '' || o.price == null ? null : +o.price;
    o.was = o.was === '' || o.was == null ? null : +o.was;
    o.from = !!o.from;
    o.customizable = !!o.customizable;
    return o;
  }
  var DEFAULTS = (XV.PRODUCTS || []).map(function (p) {
    var o = normalize(p);
    if (p.cat === 'seats' || p.cat === 'tables' || p.cat === 'bedframe' || p.cat === 'cabinet') o.customizable = true;
    return o;
  });

  /* ------------------------------------------------------------------ penyimpanan */
  // isi file: { app:'XIONCO', kind, updated, items|records|checks }
  var FIELD = { products: 'items', customs: 'records', checks: 'checks', pricing: 'pricing' };
  var EMPTY = { products: function () { return clone(DEFAULTS); }, customs: function () { return []; }, checks: function () { return {}; }, pricing: function () { return {}; } };
  var NAMES = ['products', 'customs', 'checks', 'pricing'];
  var state = { mode: 'browser', products: null, customs: null, checks: null, pricing: null, updated: {} };
  function getJSON(url) {
    return fetch(url, { cache: 'no-store', headers: { 'X-XIONCO': '1' } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function fromFile(name, doc) {
    if (!doc || doc.app !== 'XIONCO' || doc.kind !== name) return null;
    state.updated[name] = doc.updated || null;
    var v = doc[FIELD[name]];
    return name === 'products' ? (v || []).map(normalize) : v;
  }
  function docOf(name) { var d = { app: 'XIONCO', kind: name, updated: state.updated[name] || null }; d[FIELD[name]] = state[name]; return d; }
  var pending = {};
  function persist(name, isDefault) {
    state.updated[name] = isDefault ? null : Date.now();
    if (state.mode !== 'folder') {
      if (isDefault) { drop(name); drop(name + '.at'); } else { write(name, state[name]); write(name + '.at', state.updated[name]); }
      return Promise.resolve(true);
    }
    // folder: tulis ke file lewat server lokal (berurutan per file)
    var body = JSON.stringify(docOf(name));
    pending[name] = (pending[name] || Promise.resolve()).then(function () {
      return fetch(ROOT + 'api/db/' + name, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-XIONCO': '1' }, body: body })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); if (chan) chan.postMessage({ what: name }); return true; })
        .catch(function (e) { emit(name, 'Gagal menyimpan ' + name + ' ke folder data/ (' + e.message + '). Pastikan "node tools/serve.js" masih berjalan.'); return false; });
    });
    return pending[name];
  }
  function load() {
    var tryFolder = HTTP && LOCALHOST ? getJSON(ROOT + 'api/db') : Promise.resolve(null);
    return tryFolder.then(function (info) {
      if (info && info.ok && info.writable) {
        state.mode = 'folder';
        return Promise.all(NAMES.map(function (n) { return getJSON(ROOT + 'api/db/' + n); })).then(function (docs) {
          NAMES.forEach(function (n, i) { state[n] = fromFile(n, docs[i]); });
          // pindahkan data lama dari browser ke folder (sekali saja)
          NAMES.forEach(function (n) {
            var local = read(n, null), fileIsDefault = state[n] == null || (n === 'products' ? !state.updated.products : (n === 'customs' ? !state[n].length : !Object.keys(state[n] || {}).length));
            if (local && fileIsDefault) {
              state[n] = n === 'products' ? local.map(normalize) : local;
              var same = n === 'products' && JSON.stringify(state[n]) === JSON.stringify(DEFAULTS);
              persist(n, same);
            }
            if (local) { drop(n); drop(n + '.at'); }
          });
        });
      }
      state.mode = HTTP ? 'online' : 'browser';
      var pub = HTTP ? Promise.all([getJSON(ROOT + 'data/products.json'), getJSON(ROOT + 'data/checks.json'), getJSON(ROOT + 'data/pricing.json')]) : Promise.resolve([null, null, null]);
      return pub.then(function (docs) {
        // perubahan di browser ini (bila ada) didahulukan, lalu file yang dipublish
        var lp = read('products', null), lc = read('checks', null);
        state.products = lp ? lp.map(normalize) : fromFile('products', docs[0]);
        if (lp) state.updated.products = read('products.at', Date.now());
        state.checks = lc || fromFile('checks', docs[1]);
        state.customs = read('customs', null);
        var lpr = read('pricing', null);
        state.pricing = lpr || fromFile('pricing', docs[2]);
      });
    }).then(function () {
      NAMES.forEach(function (n) { if (state[n] == null) { state[n] = EMPTY[n](); state.updated[n] = null; } });
      if (XV.PRODUCTS) XV.PRODUCTS = DB.activeProducts();
      if (window.XC && XC.setPricing) XC.setPricing(state.pricing);
      return DB;
    });
  }
  function reload(name) {
    var url = state.mode === 'folder' ? ROOT + 'api/db/' + name : null;
    if (!url) { if (name === 'settings') emit('settings'); else { var v = read(name, null); if (v) state[name] = name === 'products' ? v.map(normalize) : v; if (name === 'pricing' && window.XC && XC.setPricing) XC.setPricing(state.pricing); emit(name); } return; }
    getJSON(url).then(function (doc) { var v = fromFile(name, doc); state[name] = v == null ? EMPTY[name]() : v; if (name === 'pricing' && window.XC && XC.setPricing) XC.setPricing(state.pricing); emit(name); });
  }

  var DB = window.XVDB = {
    root: ROOT,
    mode: function () { return state.mode; },
    defaults: function () { return clone(DEFAULTS); },
    products: function () { return clone(state.products || DEFAULTS); },
    isModified: function () { return !!state.updated.products; },
    activeProducts: function () { return DB.products().filter(function (p) { return p.status === 'aktif'; }); },
    saveProducts: function (list) { state.products = list.map(normalize); emit('products'); return persist('products'); },
    resetProducts: function () { state.products = clone(DEFAULTS); emit('products'); return persist('products', true); },
    savedAt: function (k) { return state.updated[k] || null; },

    customs: function () { return clone(state.customs || []); },
    saveCustom: function (rec) {
      var list = state.customs || [];
      rec.updated = Date.now();
      if (!rec.id) { rec.id = 'C' + Date.now().toString(36).toUpperCase(); rec.created = rec.updated; }
      var i = list.findIndex(function (r) { return r.id === rec.id; });
      if (i >= 0) list[i] = rec; else list.unshift(rec);
      state.customs = list; emit('customs'); persist('customs');
      return rec;
    },
    deleteCustom: function (id) { state.customs = (state.customs || []).filter(function (r) { return r.id !== id; }); emit('customs'); return persist('customs'); },

    checks: function () { return clone(state.checks || {}); },
    setCheck: function (key, on) { var c = state.checks || {}; if (on) c[key] = Date.now(); else delete c[key]; state.checks = c; emit('checks'); return persist('checks'); },

    // harga Customize: hanya selisih dari harga bawaan di v5/js/custom-spec.js
    pricing: function () { return clone(state.pricing || {}); },
    savePricing: function (p) { state.pricing = clone(p || {}); if (window.XC && XC.setPricing) XC.setPricing(state.pricing); emit('pricing'); return persist('pricing'); },
    resetPricing: function () { state.pricing = {}; if (window.XC && XC.setPricing) XC.setPricing({}); emit('pricing'); return persist('pricing', true); },

    settings: function () { return Object.assign({ position: 'bl', hidden: false }, read('settings', {})); },
    setSetting: function (k, v) { var s = DB.settings(); s[k] = v; write('settings', s); emit('settings'); },

    assetList: function () {
      if (state.mode !== 'folder') return Promise.resolve(null);
      return getJSON(ROOT + 'api/assets').then(function (r) { return r && r.ok ? r.files : null; });
    },
    exportAll: function () {
      return { app: 'XIONCO', kind: 'database', exported: new Date().toISOString(), products: DB.products(), customs: DB.customs(), checks: DB.checks(), pricing: DB.pricing(), settings: DB.settings() };
    },
    importAll: function (o) {
      if (!o || o.app !== 'XIONCO') throw new Error('Bukan file database XIONCO');
      if (o.products) { state.products = o.products.map(normalize); persist('products'); emit('products'); }
      if (o.customs) { state.customs = o.customs; persist('customs'); emit('customs'); }
      if (o.checks) { state.checks = o.checks; persist('checks'); emit('checks'); }
      if (o.pricing) DB.savePricing(o.pricing);
      if (o.settings) { write('settings', o.settings); emit('settings'); }
    },
    resetAll: function () {
      state.products = clone(DEFAULTS); persist('products', true);
      state.customs = []; persist('customs');
      state.checks = {}; persist('checks');
      state.pricing = {}; persist('pricing', true); if (window.XC && XC.setPricing) XC.setPricing({});
      drop('settings');
      ['products', 'customs', 'checks', 'pricing', 'settings'].forEach(function (n) { emit(n); });
    }
  };

  // sinkron antar tab: mode folder lewat BroadcastChannel, mode lain lewat event storage
  if (chan) chan.onmessage = function (e) { if (e.data && e.data.what) reload(e.data.what); };
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(NS) !== 0) return;
    var what = e.key.slice(NS.length).split('.')[0];
    if (what === 'settings' || state.mode !== 'folder') reload(what);
  });

  DB.ready = load().catch(function () {
    NAMES.forEach(function (n) { if (state[n] == null) state[n] = EMPTY[n](); });
    return DB;
  });

  /* ------------------------------------------------------------------------
     Spesifikasi aset — daftar "PR" aset yang perlu disiapkan per item
     ------------------------------------------------------------------------ */
  DB.ASSET_ROOT = 'assets/';
  DB.ITEM_ASSETS = [
    { key: 'utama', file: 'foto-utama.png', label: 'Foto utama', level: 'wajib', spec: 'PNG latar transparan · min. 2000 × 2000 px · tampak 3/4 depan · cahaya studio lembut', use: 'Panggung tengah & katalog', probe: 'img', temp: true },
    { key: 'depan', file: 'foto-depan.png', label: 'Tampak depan', level: 'disarankan', spec: 'PNG transparan · 2000 × 2000 px · lurus dari depan', use: 'Detail produk', probe: 'img' },
    { key: 'samping', file: 'foto-samping.png', label: 'Tampak samping', level: 'disarankan', spec: 'PNG transparan · 2000 × 2000 px · lurus dari samping', use: 'Detail produk', probe: 'img' },
    { key: 'detail', file: 'detail-material.jpg', label: 'Close-up material', level: 'disarankan', spec: 'JPG · 2000 × 2000 px · jahitan / tekstur / sambungan', use: 'Detail produk', probe: 'img' },
    { key: 'model', file: 'model.glb', label: 'Model 3D', level: 'disarankan', spec: 'GLB · ≤ 10 MB · skala meter · pivot di lantai tengah · tekstur ≤ 2K', use: 'Panggung 3D (menggantikan foto)', probe: 'head' },
    { key: 'dimensi', file: 'dimensi.png', label: 'Gambar dimensi', level: 'disarankan', spec: 'PNG / PDF · gambar kerja dengan ukuran W × D × H (cm)', use: 'Detail & custom', probe: 'img' },
    { key: 'suasana', file: 'suasana.jpg', label: 'Foto suasana', level: 'opsional', spec: 'JPG · 2560 × 1440 px · produk di dalam ruang', use: 'Galeri & detail', probe: 'img' }
  ];
  DB.GLOBAL_ASSETS = [
    { group: 'Brand', items: [
      { key: 'logo', path: 'brand/logo.svg', label: 'Logo XIONCO (vektor)', level: 'wajib', spec: 'SVG · satu warna · tanpa latar', probe: 'img', temp: true },
      { key: 'mark', path: 'brand/logo-mark.svg', label: 'Simbol X (lingkaran)', level: 'disarankan', spec: 'SVG · satu warna', probe: 'img' },
      { key: 'favicon', path: 'brand/favicon-512.png', label: 'Favicon', level: 'disarankan', spec: 'PNG 512 × 512 px', probe: 'img' },
      { key: 'og', path: 'brand/share-1200x630.jpg', label: 'Gambar share (WhatsApp/sosmed)', level: 'disarankan', spec: 'JPG 1200 × 630 px', probe: 'img' }
    ] },
    { group: 'Lingkungan 3D', items: [
      { key: 'hdri', path: 'env/studio.hdr', label: 'HDRI studio', level: 'opsional', spec: 'HDR 2K · cahaya studio hangat', probe: 'head' }
    ] }
  ];
  // material untuk custom: tekstur tiap kain / kulit / base
  DB.MATERIAL_ASSETS = function () {
    var S = (window.XV && XV.STUDIO) || { fabrics: [], bases: [] }, out = [];
    S.fabrics.forEach(function (f) {
      out.push({ key: 'mat-' + f.id, path: 'materials/' + f.id + '/albedo.jpg', label: f.code + ' · ' + f.name, level: 'wajib', spec: 'JPG 1024 × 1024 seamless (warna) + normal.jpg · foto swatch asli', probe: 'img' });
    });
    S.bases.forEach(function (b) {
      out.push({ key: 'base-' + b.id, path: 'materials/base-' + b.id + '/albedo.jpg', label: 'Base · ' + b.name, level: 'disarankan', spec: 'JPG 1024 × 1024 seamless', probe: 'img' });
    });
    return out;
  };
})();
