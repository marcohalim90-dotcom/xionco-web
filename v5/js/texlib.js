/* ==========================================================================
   Maison XIONCO v5 — pustaka tekstur PBR (CC0)
   Tekstur asli (Poly Haven / ambientCG, CC0 — lihat LICENSE.txt tiap set) di
   assets/library/textures/<set>/{albedo,normal,rough}.webp. Dimuat MALAS: baru saat
   material yang memakainya dibuat. Selama memuat, gagal, atau dibuka dari file://
   material tetap memakai tekstur kanvas prosedural (fallback).
   • albedo kain/kayu = abu-abu ternormal (rata-rata 200/255) → warna hex pilihan mengalikan
   • roughness dinormalkan ke rata-rata 0,8 → material.roughness = target / 0,8
   • ukuran set dalam meter; UV di maker.js/world.js juga dalam meter → repeat = 1 / ukuran
   API: window.XTEX
   ========================================================================== */
(function () {
  'use strict';
  var T = function () { return window.THREE; };
  // akar situs (folder yang berisi assets/) — dari alamat skrip ini, atau relatif halaman
  var ROOT = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s && /\/js\/texlib\.js/.test(s)) return s.replace(/(v5|checkpoints\/[^\/]+)\/js\/texlib\.js.*$/, '');
    } catch (e) {}
    return '../';
  })();
  var OK = location.protocol !== 'file:';   // file:// → gambar lokal "tainted" untuk WebGL → tetap prosedural
  var BASE = ROOT + 'assets/library/textures/';
  /* s = ukuran nyata [u, v] meter · m = peta tersedia (a albedo, n normal, r roughness) */
  var SETS = {
    'fabric-boucle': { s: [.336, .331], m: 'anr' },     // Curly Teddy Natural (Poly Haven)
    'fabric-velvet': { s: [.284, .273], m: 'anr' },     // Velour Velvet (Poly Haven)
    'fabric-linen': { s: [.271, .271], m: 'anr' },      // Rough Linen (Poly Haven)
    'fabric-chenille': { s: [.4, .4], m: 'anr' },       // Fabric031 (ambientCG)
    'fabric-woven': { s: [.4, .4], m: 'anr' },          // Fabric062 (ambientCG) — Vienna
    'fabric-pet': { s: [.3, .3], m: 'anr' },            // Fabric036 (ambientCG) — anyaman rapat
    'leather-fine': { s: [.3, .3], m: 'nr' },          // Leather023 (ambientCG) — kulit asli berbutir
    'leather-faux': { s: [.35, .35], m: 'nr' },         // Leather025 (ambientCG)
    'wood-oak': { s: [1.83, 1.83], m: 'anr' },          // Oak Veneer 01 (Poly Haven)
    'wood-walnut': { s: [1, 1], m: 'anr' },             // Black Walnut Veneer 02 (Poly Haven)
    'wood-teak': { s: [1, 1], m: 'anr' },               // Rosewood Veneer 02 (Poly Haven) — serat untuk jati
    'wood-ash': { s: [1, 1], m: 'anr' },                // Ash Veneer (Poly Haven)
    'wood-mahogany': { s: [1, 1], m: 'anr' },           // Sapele Veneer 02 (Poly Haven)
    'metal-brushed': { s: [.5, .5], m: 'nr' },          // Metal009 (ambientCG)
    'stone-carrara': { s: [1.2, 1.2], m: 'ar' },        // Marble012 (ambientCG)
    'stone-calacatta': { s: [1.2, 1.2], m: 'ar' },      // Marble014 (ambientCG)
    'stone-nero': { s: [1.2, 1.2], m: 'ar' },           // Marble023 (ambientCG)
    'stone-travertine': { s: [1.2, 1.2], m: 'ar' },     // Travertine009 (ambientCG)
    'stone-terrazzo': { s: [.6, .6], m: 'ar' },         // Terrazzo013 (ambientCG)
    'stone-slate': { s: [1.2, 1.2], m: 'ar' },          // Marble006 (ambientCG)
    'weave-rattan': { s: [.3, .3], m: 'anr' },          // Wicker001 (ambientCG)
    'weave-cord': { s: [.25, .25], m: 'anr' },          // Wicker004 (ambientCG)
    // finishing ruangan (Poly Haven, CC0) — warna asli dipertahankan
    'room-floor-oak': { s: [1.7, 1.7], m: 'anr' }, 'room-floor-parquet': { s: [3.4, 3.4], m: 'anr' }, 'room-floor-laminate': { s: [1.7, 1.7], m: 'anr' },
    'room-floor-marble': { s: [2, 2], m: 'anr' }, 'room-floor-terrazzo': { s: [2, 2], m: 'anr' }, 'room-floor-tiles': { s: [3, 3], m: 'anr' },
    'room-floor-concrete': { s: [2, 2], m: 'anr' }, 'room-floor-carpet': { s: [.27, .276], m: 'anr' },
    'room-wall-plaster': { s: [1, 1], m: 'anr' }, 'room-wall-beige': { s: [3, 3], m: 'anr' }, 'room-wall-brick': { s: [2, 2], m: 'anr' }, 'room-wall-marble': { s: [1.5, 1.5], m: 'anr' },
    'room-floor-oakwide': { s: [1.2, 1.2], m: 'anr' }, 'room-floor-greyoak': { s: [1, 1], m: 'anr' }, 'room-wall-walnut': { s: [1, 1], m: 'anr' }, 'room-wall-limewash': { s: [2, 2], m: 'anr' }
  };
  var FILE = { a: 'albedo', n: 'normal', r: 'rough' }, KEY = { a: 'map', n: 'normalMap', r: 'roughnessMap' };
  var cache = {}, aniso = 8, loader = null;
  function load(name) {
    var S = SETS[name];
    if (!S || !OK || !T()) return Promise.reject(new Error('tekstur ' + name + ' tidak tersedia'));
    if (cache[name]) return cache[name];
    if (!loader) loader = new (T().TextureLoader)();
    var out = {};
    cache[name] = Promise.all(S.m.split('').map(function (k) {
      return new Promise(function (res, rej) {
        loader.load(BASE + name + '/' + FILE[k] + '.webp', function (t) {
          t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(1 / S.s[0], 1 / S.s[1]);
          t.anisotropy = aniso; if (k === 'a') t.encoding = T().sRGBEncoding;
          t.userData.set = name; t.userData.size = S.s;
          out[KEY[k]] = t; res();
        }, null, rej);
      });
    })).then(function () { return out; });
    cache[name].catch(function () { if (window.console) console.warn('[XTEX] gagal memuat tekstur', name); });
    return cache[name];
  }
  /* pasang set ke material (langsung bila sudah dimuat, kalau belum menyusul).
     o: { map: false → abaikan albedo, normal: skala normal (bawaan 1), rough: roughness target, done(mat) } */
  function apply(mat, name, o) {
    if (!mat || !SETS[name]) return mat;
    o = o || {};
    mat.userData.tex = name;
    if (!OK) return mat;
    load(name).then(function (t) {
      if (mat.userData.texOff) return;
      if (t.map && o.map !== false) mat.map = t.map;
      if (t.normalMap && o.normal !== false) { mat.normalMap = t.normalMap; var n = o.normal == null ? 1 : o.normal; mat.normalScale.set(n, n); mat.bumpMap = null; }
      if (t.roughnessMap) { mat.roughnessMap = t.roughnessMap; if (o.rough != null) mat.roughness = o.rough / .8; }
      mat.needsUpdate = true;
      if (o.done) o.done(mat, t);
      if (XTEX.onApply) XTEX.onApply(name, mat);
    }, function () {});
    return mat;
  }
  var XTEX = window.XTEX = {
    ok: OK, root: ROOT, base: BASE, sets: SETS,
    load: load, apply: apply,
    setAnisotropy: function (n) { aniso = n || 8; },
    loaded: function (name) { return !!cache[name]; }
  };
})();
