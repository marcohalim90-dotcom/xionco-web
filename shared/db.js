/* ==========================================================================
   XIONCO — Database lokal (prototipe backend)
   Disimpan di localStorage browser. Dibaca situs (v5) dan diubah lewat
   Developer Settings. Export / import JSON tersedia di Developer Settings.
   Muat SETELAH data.js agar katalog situs memakai data terbaru.

   API: window.XVDB
     products()            semua item (termasuk draft/arsip)
     activeProducts()      item berstatus aktif (yang tampil di situs)
     saveProducts(list)    simpan katalog
     resetProducts()       kembali ke data bawaan (data.js)
     customs() / saveCustom(rec) / deleteCustom(id)
     checks() / setCheck(key, bool)        centang aset manual
     settings() / setSetting(key, value)
     exportAll() / importAll(obj)
   Event: window 'xvdb:change'  { detail: { what: 'products'|'customs'|'checks'|'settings' } }
   ========================================================================== */
(function () {
  'use strict';
  var NS = 'xionco.db.';
  var XV = window.XV || {};
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var read = function (k, d) { try { var v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var write = function (k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  var drop = function (k) { try { localStorage.removeItem(NS + k); } catch (e) {} };
  var emit = function (what) { try { window.dispatchEvent(new CustomEvent('xvdb:change', { detail: { what: what } })); } catch (e) {} };

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

  var DB = window.XVDB = {
    defaults: function () { return clone(DEFAULTS); },
    products: function () { var s = read('products', null); return s ? s.map(normalize) : clone(DEFAULTS); },
    isModified: function () { return !!read('products', null); },
    activeProducts: function () { return DB.products().filter(function (p) { return p.status === 'aktif'; }); },
    saveProducts: function (list) { write('products', list.map(normalize)); write('products.at', Date.now()); emit('products'); },
    resetProducts: function () { drop('products'); drop('products.at'); emit('products'); },
    savedAt: function (k) { return read(k + '.at', null); },

    customs: function () { return read('customs', []); },
    saveCustom: function (rec) {
      var list = DB.customs(), i = list.findIndex(function (r) { return r.id === rec.id; });
      rec.updated = Date.now();
      if (!rec.id) { rec.id = 'C' + Date.now().toString(36).toUpperCase(); rec.created = rec.updated; }
      if (i >= 0) list[i] = rec; else list.unshift(rec);
      write('customs', list); emit('customs');
      return rec;
    },
    deleteCustom: function (id) { write('customs', DB.customs().filter(function (r) { return r.id !== id; })); emit('customs'); },

    checks: function () { return read('checks', {}); },
    setCheck: function (key, on) { var c = DB.checks(); if (on) c[key] = Date.now(); else delete c[key]; write('checks', c); emit('checks'); },

    settings: function () { return Object.assign({ position: 'bl', hidden: false, devOn: true }, read('settings', {})); },
    setSetting: function (k, v) { var s = DB.settings(); s[k] = v; write('settings', s); emit('settings'); },

    exportAll: function () {
      return { app: 'XIONCO', kind: 'database', exported: new Date().toISOString(), products: DB.products(), customs: DB.customs(), checks: DB.checks(), settings: DB.settings() };
    },
    importAll: function (o) {
      if (!o || o.app !== 'XIONCO') throw new Error('Bukan file database XIONCO');
      if (o.products) write('products', o.products.map(normalize));
      if (o.customs) write('customs', o.customs);
      if (o.checks) write('checks', o.checks);
      if (o.settings) write('settings', o.settings);
      emit('products'); emit('customs'); emit('checks'); emit('settings');
    },
    resetAll: function () { ['products', 'products.at', 'customs', 'checks', 'settings'].forEach(drop); emit('products'); emit('customs'); emit('checks'); emit('settings'); }
  };

  // perubahan dari tab lain ikut tersinkron
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(NS) !== 0) return;
    var what = e.key.slice(NS.length).split('.')[0];
    emit(what);
  });

  // situs memakai katalog dari database (hanya item aktif)
  if (XV.PRODUCTS) XV.PRODUCTS = DB.activeProducts();

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
