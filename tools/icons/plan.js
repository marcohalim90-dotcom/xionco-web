/* ==========================================================================
   XIONCO — rencana gambar garis per kelompok pilihan (dipakai build.js)
   Setiap pilihan chips / multi (dan kategori + sub-kategori di langkah Jenis) mendapat satu gambar:
     • 3D  — konfigurasi bawaan sub → XC.apply(pilihan) (bila pilihan butuh syarat, dicari
             konfigurasi terdekat yang membuatnya tersedia), lalu kamera sesuai jenis kelompok:
               full    3/4 depan seluruh benda (dibingkai per pilihan)
               common  3/4 depan, skala sama untuk semua pilihan (ukuran / kapasitas terbaca)
               region  detail: sudut kaki, lengan, sandaran, dudukan, tepi meja, headboard
               diff    dibingkai pada bagian yang berubah (tambahan, isi dalam, handle)
               part    hanya bagian yang dijelaskan (mis. base meja tanpa top, kaki kursi tanpa dudukan)
               new     bagian yang berbeda dari pilihan pembanding digambar tegas, sisanya samar (konteks),
                       kamera fokus ke bagian itu (storage, sandaran, laci, rel, tangga, handle …)
     • SYM — simbol garis (symbols.js) untuk pilihan abstrak: kain, isian, kekerasan, jahitan,
             material, finishing, badan kabinet, aksesori kecil.
   ========================================================================== */
(function () {
  'use strict';
  var XC = window.XC, ICON = window.ICON, SYM = window.SYMBOLS || {};
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var VIEW = { az: 32, el: 16, fov: 20 };

  /* ---------------- kamera dasar */
  function camFor(box, v) {
    v = v || VIEW;
    var t = [(box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2], diag = Math.hypot(box[3] - box[0], box[4] - box[1], box[5] - box[2]);
    var fov = v.fov || VIEW.fov;
    return { az: v.az == null ? VIEW.az : v.az, el: v.el == null ? VIEW.el : v.el, fov: fov, target: t, dist: Math.max(.5, diag) / 2 / Math.tan(fov / 2 * Math.PI / 180) * 1.25, crop: null };
  }
  function square(b, pad, minH) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, h = Math.max(b[2] - b[0], b[3] - b[1]) / 2 * (pad || 1.1);
    if (minH) h = Math.max(h, minH);
    return [cx - h, cy - h, cx + h, cy + h];
  }
  function union(a, b) { return !a ? b.slice() : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])]; }
  function union2(a, b) { return !a ? b.slice() : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }

  // tinggi dudukan (m): kursi = seatH, stool = h (tinggi dudukan)
  function seatY(c) { return (+c.seatH || +c.h || 44) / 100; }
  /* ---------------- daerah detail (koordinat dunia; depan = +Z, kamera di kanan depan) */
  var REG = {
    // sudut kaki depan kanan
    leg: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], lh = Math.max(.12, (+c.legH || 12) / 100 + .06), s = Math.max(.13, Math.min(.24, Math.min(W, D) * .24, lh * 1.25));
      return [b[3] - s, b[1], b[5] - s, b[3], b[1] + lh, b[5]];
    },
    // muka kanan (handle kabinet)
    frontR: function (b) { var W = b[3] - b[0], s = Math.min(.75, W * .45); return [b[3] - s, b[1], b[5] - .06, b[3], b[4], b[5]]; },
    // bantal hias di ujung kanan sandaran
    pillow: function (b, c) { var sh = (+c.seatH || 44) / 100, D = b[5] - b[2]; return [b[3] - Math.min(.95, (b[3] - b[0]) * .55), sh - .05, b[2], b[3] - .02, b[4], b[2] + D * .7]; },
    // depan badan (laci / sofa bed / recliner)
    deck: function (b, c) { var sh = (+c.seatH || 44) / 100, W = b[3] - b[0]; return [b[3] - Math.min(1.1, W * .55), b[1], b[5] - .2, b[3], sh + .08, b[5]]; },
    // lengan kanan seluruhnya
    arm: function (b) { var W = b[3] - b[0], s = Math.min(.42, W * .3); return [b[3] - s, b[1], b[2], b[3], b[4], b[5]]; },
    // sandaran tengah (permukaan)
    back: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], cx = (b[0] + b[3]) / 2, hw = Math.min(.5, W * .32), sh = (+c.seatH || 44) / 100;
      return [cx - hw, sh, b[2], cx + hw, b[4], b[2] + D * .6];
    },
    // dudukan (permukaan atas)
    seat: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], cx = (b[0] + b[3]) / 2, hw = Math.min(.62, W * .36), sh = (+c.seatH || 44) / 100;
      return [cx - hw * .2, sh - .12, b[2] + D * .2, cx + hw * 1.25, sh + .06, b[5]];
    },
    // tepi depan top meja
    edge: function (b, c) {
      var top = (+c.h || 75) / 100, cx = (b[0] + b[3]) / 2 + (b[3] - b[0]) * .18, t = (+c.thick || 3) / 100;
      return [cx - .09, top - t - .05, b[5] - .14, cx + .09, top + .01, b[5]];
    },
    // headboard (belakang tempat tidur)
    head: function (b) { var D = b[5] - b[2]; return [b[0], b[1], b[2], b[3], b[4], b[2] + Math.min(.6, D * .35)]; },
    // bagian bawah (base, rok, pijakan)
    low: function (b, c) { var H = b[4] - b[1]; return [b[0], b[1], b[2], b[3], b[1] + Math.max(.25, Math.min(.55, H * .45)), b[5]]; },
    // sudut bawah depan kanan (dudukan kabinet / ranjang: kaki, plinth, melayang, roda)
    lowR: function (b) { var W = b[3] - b[0], H = b[4] - b[1], s = Math.max(.3, Math.min(.6, W * .4)); return [b[3] - s, b[1], b[5] - Math.min(.5, (b[5] - b[2]) * .6), b[3], b[1] + Math.max(.22, Math.min(.42, H * .4)), b[5]]; },
    // sudut kanan seluruh tinggi (rangka sofa / ranjang, lengan + kaki)
    corner: function (b) { var W = b[3] - b[0], s = Math.min(.8, W * .42); return [b[3] - s, b[1], b[2], b[3], b[4], b[5]]; },
    // bagian atas di atas dudukan (sandaran kursi makan / bangku), maks. 0,9 m dari kanan
    upper: function (b, c) { var sh = seatY(c); return [Math.max(b[0], b[3] - .9), Math.min(b[4] - .12, sh - .04), b[2], b[3], b[4], b[5]]; },
    // pita dudukan kursi kecil (bantalan, bentuk dudukan)
    band: function (b, c) { var sh = seatY(c); return [b[0], sh - .14, b[2], b[3], Math.min(b[4], sh + .1), b[5]]; },
    // sudut atas kanan (top kabinet)
    topR: function (b) { var W = b[3] - b[0], H = b[4] - b[1], s = Math.min(.55, W * .4); return [b[3] - s, b[4] - Math.max(.1, Math.min(.28, H * .22)), b[2], b[3], b[4], b[5]]; }
  };
  /* ---------------- penyaring bagian (mode part) — kotak bagian, kotak penuh, cfg → true = disembunyikan */
  var HIDE = {
    // top meja disembunyikan → hanya base / kaki / pedestal
    under: function (mb, B, c) { var y = (+c.h || 75) / 100 - (+c.thick || 3) / 100; return mb[4] > y + .012; },
    // hanya bagian bawah (titik tengah bagian di bawah fraksi tinggi)
    lo: function (f) { return function (mb, B) { return (mb[1] + mb[4]) / 2 > B[1] + (B[4] - B[1]) * f; }; }
  };

  /* ---------------- aturan per kelompok  { m: mode, v: view, r: region, open: fn, svg: true } */
  var SMALL = /^(dining|stool)$/;   // kursi kecil: kaki terlihat jelas pada tampilan penuh
  function rule(cat, sub, gid) {
    var k = cat + '/' + sub;
    var R = {
      // bentuk keseluruhan
      shape: { m: 'full' }, form: { m: 'full' }, frame: { m: 'region', r: 'corner', v: { az: 34, el: 12 } }, frameStyle: { m: 'region', r: 'corner', v: { az: 34, el: 12 } }, construction: { m: 'full' },
      seats: { m: 'common', v: cat === 'meja' ? { el: 38 } : null }, height: { m: 'common' }, mattress: { m: 'common', v: { az: 28, el: 34 } },
      hbW: { m: 'common', v: { az: 14, el: 14 } },
      back: SMALL.test(sub) ? { m: 'region', r: 'upper', v: { az: 26, el: 12 } } : { m: 'region', r: 'back', v: { az: 26, el: 12 } },
      backrest: { m: 'new', v: { az: 30, el: 14 }, fb: { m: 'region', r: 'upper' } }, backStyle: { m: 'new', v: { az: 26, el: 12 }, fb: { m: 'region', r: 'upper' } },
      backS: { m: 'new', v: { az: 30, el: 14 }, fb: { m: 'region', r: 'upper' } },
      arm: { m: 'region', r: 'arm', v: { az: 30, el: 14 } }, armStyle: { m: 'region', r: 'upper', v: { az: 30, el: 14 } },
      backTuft: SMALL.test(sub) ? { m: 'region', r: 'upper', v: { az: 16, el: 10 }, weight: 1.3, zoom: .8 } : { m: 'region', r: 'back', v: { az: 12, el: 10 }, weight: 1.3, zoom: .72 },
      seatC: { m: 'region', r: 'seat', v: { az: 20, el: 30 } }, seatTuft: { m: 'region', r: 'seat', v: { az: 20, el: 34 }, weight: 1.3, zoom: .72 },
      top: cat === 'kabinet' ? { m: 'region', r: 'topR', v: { az: 30, el: 22 } } : { m: 'region', r: 'seat', v: { az: 20, el: 32 } },
      topTuft: { m: 'region', r: 'seat', v: { az: 20, el: 32 }, weight: 1.3, zoom: .72 }, tuft: { m: 'full', v: { el: 32 }, weight: 1.3 }, sides: { m: 'full', v: { el: 10 } },
      cushion: SMALL.test(sub) ? { m: 'region', r: 'band', v: { az: 28, el: 26 } } : { m: 'new', v: { az: 28, el: 24 }, fb: { m: 'region', r: 'seat', v: { az: 20, el: 30 } } },
      seatShape: { m: 'region', r: 'band', v: { az: 28, el: 34 } },
      ends: { m: 'new', v: { az: 32, el: 14 }, fb: { m: 'region', r: 'arm', v: { az: 30, el: 14 } } },
      storage: { m: 'new', rev: true, open: 'all', v: { az: 36, el: 16 }, fb: { m: 'region', r: 'lowR', v: { az: 36, el: 14 } } },
      headrest: { m: 'new', v: { az: 30, el: 14 } }, pillowType: { m: 'region', r: 'pillow', v: { az: 14, el: 12 } },
      base: cat === 'meja' ? { m: 'part', hide: 'under', v: { az: 30, el: 12 } } : { m: 'part', hide: sub === 'stool' ? .5 : .24, v: { az: 30, el: 12 } },
      stretcher: { m: 'part', hide: .42, v: { az: 30, el: 14 } }, footrest: { m: 'new', v: { az: 30, el: 14 } },
      leg: SMALL.test(sub) && cat === 'kursi' ? { m: 'part', hide: .42, v: { az: 32, el: 12 } } : { m: 'region', r: 'leg', v: { az: 34, el: 12 } },
      skirt: { m: 'region', r: 'leg', v: { az: 34, el: 12 } },
      mount: { m: 'region', r: 'lowR', v: { az: 32, el: 10 } },
      topShape: { m: 'full', v: { el: 40 } }, edge: { m: 'region', r: 'edge', v: { az: 18, el: 9 } },
      headboard: { m: 'region', r: 'head', v: { az: 16, el: 12 } },
      lowerDoors: { m: 'full' },
      doorType: { m: 'full', v: { az: 24, el: 12 }, open: 'one' },
      // kabinet (spec-kabinet.js): model pintu, jenis kaca, batu top, model & panel kabinet gantung
      doorStyle: { m: 'full', v: { az: 24, el: 12 }, open: 'one' }, glassType: { m: 'region', r: 'frontR', v: { az: 14, el: 8 } },
      topStone: { m: 'region', r: 'topR', v: { az: 30, el: 22 } }, wallType: { m: 'full', v: { az: 26, el: 10 } }, wallPanel: { m: 'new', v: { az: 26, el: 10 } },
      handle: { m: 'new', rev: true, one: true, minH: .07, pad: 2, v: { az: 18, el: 10 }, fb: { m: 'region', r: 'frontR', v: { az: 18, el: 10 } } },
      interior: { m: 'diff', open: 'all', v: { az: 18, el: 12 } },
      trim: { m: 'diff', anchor: 'right' }, extras: { m: 'diff', anchor: 'right' }, swivel: { m: 'diff' }
    };
    var r = R[gid] || { m: 'full' };
    if (k === 'kursi/dining' && gid === 'frame') r = { m: 'part', hide: .42, v: { az: 30, el: 12 } };
    if (k === 'kursi/stool' && gid === 'frame') r = { m: 'part', hide: .5, v: { az: 30, el: 12 } };
    if (k === 'kursi/chaise' && gid === 'back') r = { m: 'new', v: { az: 30, el: 14 }, fb: { m: 'region', r: 'back', v: { az: 26, el: 12 } } };
    if (k === 'kursi/chaise' && gid === 'base') r = { m: 'new', one: true, minH: .1, pad: 1.8, v: { az: 32, el: 10 }, fb: { m: 'part', hide: .26 } };   // satu kaki / base dari dekat
    if (k === 'kursi/ottoman' && gid === 'tuft') r = { m: 'full', v: { az: 20, el: 52 }, weight: 1.3 };   // ottoman kecil: seluruh permukaan atas
    if (/^kursi\/(sofa|armchair)$/.test(k) && gid === 'back') r = { m: 'region', r: 'back', v: { az: 46, el: 16 } };   // tampak serong: bantal sandaran vs sandaran menyatu terbaca
    if (k === 'kursi/bench' && gid === 'leg') r = { m: 'region', r: 'leg', v: { az: 34, el: 12 } };
    if (k === 'kursi/ottoman' && gid === 'leg') r = { m: 'full', v: { az: 30, el: 8 } };
    // divan & ranjang (spec-divan.js): susun / loft / sorong / daybed / kanopi / anak
    if (cat === 'divan') {
      var DV = { layout: { m: 'full', v: { az: 30, el: 16 } }, access: { m: 'full', v: { az: 34, el: 12 } }, rail: { m: 'full', v: { az: 26, el: 18 } },
        under: { m: 'region', r: 'lowR', open: 'all', v: { az: 30, el: 12 } }, trundle: { m: 'region', r: 'low', v: { az: 24, el: 12 }, open: 'all' }, below: { m: 'full', v: { az: 26, el: 8 } },
        bottom: { m: 'common', v: { az: 28, el: 34 } }, post: { m: 'full', v: { az: 30, el: 10 } }, canopy: { m: 'full', v: { az: 30, el: 14 } }, drape: { m: 'full', v: { az: 30, el: 12 } },
        roof: { m: 'full', v: { az: 30, el: 12 } }, sides: { m: 'full', v: { az: 28, el: 16 } }, infill: { m: 'region', r: 'corner', v: { az: 30, el: 12 } }, foot: { m: 'full', v: { az: 30, el: 14 } } };
      if (DV[gid]) r = DV[gid];
      if (gid === 'style') r = { m: 'full', v: { az: 30, el: 14 } };
      if (gid === 'frame') r = { m: 'region', r: 'corner', v: { az: 32, el: 12 } };
      if (/^(access|rail)$/.test(gid)) r = { m: 'new', one: gid === 'rail', v: { az: 30, el: 14 } };
      if (gid === 'arm' && /^(trundle|daybed)$/.test(sub)) r = { m: 'region', r: 'arm', v: { az: 30, el: 14 } };
    }
    // meja (spec-meja.js): tata letak dilihat dari atas, kaki / pijakan dari samping, panel depan rendah
    if (cat === 'meja') {
      var MJ = { layout: { m: 'full', v: { az: 30, el: 34 } }, plan: { m: 'full', v: { az: 30, el: 30 } }, form: { m: 'full', v: { az: 30, el: 22 } }, side: { m: 'full', v: { az: 30, el: 34 } },
        pieces: { m: 'full', v: { el: 24 } }, legStyle: { m: 'new', one: true, minH: .1, pad: 1.7, v: { az: 32, el: 10 }, fb: { m: 'region', r: 'leg', v: { az: 34, el: 12 } } }, footrest: { m: 'new', v: { az: 30, el: 10 } }, frame: { m: 'part', hide: 'under', v: { az: 30, el: 12 } }, mount: { m: 'region', r: 'lowR', v: { az: 30, el: 10 } },
        pedestal: { m: 'new', v: { az: 28, el: 14 }, fb: { m: 'part', hide: 'under', v: { az: 30, el: 12 } } }, pedType: { m: 'new', v: { az: 28, el: 12 } }, pedDrawers: { m: 'new', v: { az: 24, el: 10 } },
        islandBody: { m: 'new', v: { az: 22, el: 10 } }, hutch: { m: 'new', v: { az: 28, el: 14 } }, tower: { m: 'new', v: { az: 28, el: 14 } }, face: { m: 'full', v: { az: 18, el: 8 } }, front: { m: 'full', v: { az: 16, el: 8 } }, screen: { m: 'full', v: { el: 16 } },
        mped: { m: 'new', v: { az: 28, el: 14 } }, ada: { m: 'new', v: { az: 28, el: 12 } }, plinth: { m: 'region', r: 'low', v: { az: 24, el: 8 } }, mirror: { m: 'new', v: { az: 24, el: 10 } }, stool: { m: 'new', v: { az: 28, el: 14 } },
        inlay: { m: 'full', v: { el: 40 } }, tableware: { m: 'full', v: { el: 40 } } };
      if (MJ[gid]) r = MJ[gid];
      if (gid === 'topShape' && /^(side|nesting)$/.test(sub)) r = { m: 'full', v: { az: 20, el: 64 } };   // bentuk top kecil: dari atas
      if (sub === 'vanity' && gid === 'mount') r = { m: 'part', hide: 'under', v: { az: 30, el: 12 }, set: { stool: 'none' } };
      if (gid === 'seats') r.set = { tableware: 'mats' };
    }
    // tanpa bantal hias agar permukaan / bentuk sandaran terlihat
    if (/^(back|backTuft|seatTuft|seatC|arm)$/.test(gid)) r.set = { pillows: 0, bolsters: 0 };
    // alas piring linen (penanda kapasitas) hanya pada kelompok kapasitas meja makan
    r.mats = gid === 'tableware' ? 'solid' : gid === 'seats' ? 'faint' : 'hide';
    return r;
  }
  // aturan per pilihan (menggantikan aturan kelompok)
  function optRule(cat, sub, gid, oid, base) {
    var k = gid + '__' + oid, seat = cat === 'kursi', big = /^(sofa|armchair|chaise)$/.test(sub), legR = { m: 'region', r: 'leg', v: { az: 34, el: 12 } };
    var R = {
      trim__nailhead: big && sub !== 'chaise' ? { m: 'region', r: 'arm', v: { az: 30, el: 14 } } : null,
      trim__woodEnd: big ? { m: 'region', r: 'arm', v: { az: 30, el: 14 } } : null,
      trim__brassCap: big || sub === 'bench' || sub === 'ottoman' ? legR : null,
      trim__castor: big || sub === 'ottoman' ? legR : null,
      trim__brassBand: big ? legR : null,
      back__pillow: /^(sofa|armchair)$/.test(sub) ? { set: {} } : null,   // sandaran bantal lepas: bantal tidak dihapus (beda dari cushion)
      extras__storage: sub === 'sofa' ? { m: 'region', r: 'deck', v: { az: 24, el: 10 } } : null,
      // top oval / persegi panjang pada meja kecil: ukuran contoh dibuat lonjong agar beda dari bulat / persegi
      topShape__oval: /^(side|nesting)$/.test(sub) ? { set: { w: 62 } } : null,
      topShape__rect: /^(side|nesting)$/.test(sub) ? { set: { w: 62 } } : null
    };
    var r = R[k]; if (!r) return null;
    var o = {}; for (var x in base) o[x] = base[x]; for (x in r) o[x] = r[x]; return o;
  }
  // kelompok yang selalu memakai simbol (sifat bahan / kenyamanan yang tidak tampak sebagai bentuk)
  var SYM_GROUPS = /^(uph|fill|firm|stitch|pipingC|pillowColor|legFinish|footrestFinish|topMat|baseMat|finish|carcass)$/;

  /* ---------------- cari konfigurasi yang membuat pilihan tersedia */
  function grOf(c, id) { return XC.sub(c).groups.filter(function (g) { return g.id === id; })[0]; }
  function setOpt(c0, gid, oid, multi) {
    var c = clone(c0), g = grOf(c, gid);
    if (multi) { var a = (c[gid] || []).slice(); if (a.indexOf(oid) < 0) a.push(oid); XC.apply(c, gid, a); }
    else XC.apply(c, gid, oid);
    g = grOf(c, gid);
    var okv = multi ? (c[gid] || []).indexOf(oid) >= 0 : c[gid] === oid;
    return okv && XC.visible(g, c) ? c : null;
  }
  function cfgFor(cat, sub, gr, opt) {
    var base = XC.defaults(cat, sub), multi = gr.type === 'multi', r = setOpt(base, gr.id, opt.id, multi);
    if (r) return { cfg: r, via: '' };
    var others = XC.sub(base).groups.filter(function (g) { return g.id !== gr.id && g.type === 'chips'; });
    others.sort(function (a, b) { return (a.step === gr.step ? 0 : 1) - (b.step === gr.step ? 0 : 1); });
    var all = function (g) { return typeof g.opts === 'function' ? g.opts(base) : g.opts || []; };
    var i, j, a, b2, c1, c2;
    for (i = 0; i < others.length; i++) { a = all(others[i]); for (j = 0; j < a.length; j++) { c1 = setOpt(base, others[i].id, a[j].id); if (c1 && (r = setOpt(c1, gr.id, opt.id, multi))) return { cfg: r, via: others[i].id + '=' + a[j].id }; } }
    for (i = 0; i < others.length; i++) { a = all(others[i]); for (j = 0; j < a.length; j++) { c1 = setOpt(base, others[i].id, a[j].id); if (!c1) continue;
      for (var k = 0; k < others.length; k++) { if (k === i) continue; b2 = all(others[k]); for (var l = 0; l < b2.length; l++) { c2 = setOpt(c1, others[k].id, b2[l].id); if (c2 && (r = setOpt(c2, gr.id, opt.id, multi))) return { cfg: r, via: others[i].id + '=' + a[j].id + ',' + others[k].id + '=' + b2[l].id }; } } } }
    return null;
  }

  /* ---------------- pembukaan pintu / laci */
  function openFn(kind) {
    if (kind === 'all') return function (m) { return m.kind === 'drawer' ? 0 : m.kind === 'slide' ? .9 : .82; };
    if (kind === 'one') return function (m, i, list) {
      var first = list.filter(function (q) { return q.kind !== 'drawer'; })[0] || list[0];
      if (m !== first) return 0;
      return m.kind === 'drawer' ? .55 : m.kind === 'slide' ? .75 : m.kind === 'flip' ? .6 : .55;
    };
    return 0;
  }

  /* ---------------- gambar */
  function fade(a, px) {   // detail: tepi kotak memudar halus
    var N = ICON.OUT;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var d = Math.min(x, y, N - 1 - x, N - 1 - y); if (d >= px) continue;
      var t = d / px; a[y * N + x] = Math.round(a[y * N + x] * t * t * (3 - 2 * t));
    }
    return a;
  }
  function shotFull(cfg, v, open, j) {
    var info = ICON.build(cfg, open), sp = camFor(info.box, v); ICON.cam(sp);
    var fp = ICON.footprint(ICON.snap()); if (!fp.n) return null;
    sp.crop = square(fp.box, 1.12); return j ? shot(j, sp) : ICON.draw(sp);
  }
  // gambar dasar + lapis aksen (bagian yang dijelaskan) dengan kamera yang sama; fadePx = tepi memudar (detail)
  function shot(j, sp, fadePx) {
    var a = ICON.draw(sp), c = ICON.draw(sp, { acc: true });
    if (fadePx) { a = fade(a, fadePx); c = fade(c, fadePx); }
    j.acc = c; return a;
  }
  // tanda bagian pilihan pembanding (tanpa pilihan ini untuk multi; pilihan acuan / pertama untuk chips)
  function refCfg(j, gr, opts) {
    var ru = j.ru, rf = clone(j.cfg);
    if (gr.type === 'multi') XC.apply(rf, gr.id, (rf[gr.id] || []).filter(function (x) { return x !== j.o.id; }));
    else { var rid = ru.ref && ru.ref !== j.o.id ? ru.ref : opts[0].id === j.o.id ? (opts[1] || opts[0]).id : opts[0].id; XC.apply(rf, gr.id, rid); }
    return rf;
  }
  function refCount(j, gr, opts) {
    ICON.state.accRef = null;
    var cnt = {}; ICON.build(refCfg(j, gr, opts), openFn(j.ru.open)).sigs.forEach(function (g) { cnt[g] = (cnt[g] || 0) + 1; });
    return cnt;
  }
  // kelompok: kembalikan [{ id, a: Uint8Array | null, sym: key | null, note }]
  function groupShots(cat, sub, gr) {
    var opts = typeof gr.opts === 'function' ? gr.opts(XC.defaults(cat, sub)) : gr.opts, ru = rule(cat, sub, gr.id), out = [];
    var symKey = function (o) { var k = gr.id + '__' + o.id; return SYM[cat + '/' + sub + ':' + k] ? cat + '/' + sub + ':' + k : SYM[k] ? k : null; };
    var jobs = opts.map(function (o) {
      var sk = symKey(o);
      var f = cfgFor(cat, sub, gr, o);
      if (!f) return { o: o, skip: true, note: 'unreachable' };   // pilihan tidak pernah tampil di sub ini
      if (SYM_GROUPS.test(gr.id) || (sk && (SYM[sk].force || SYM[sk].prefer))) return { o: o, sym: sk || null, note: sk ? '' : 'no symbol' };
      var cfg = f.cfg, ro = optRule(cat, sub, gr.id, o.id, ru) || ru;
      if (ro.fb) ro = Object.assign({}, ro, { fb: Object.assign({ v: ro.v, open: ro.open }, ro.fb) });
      if (ro.set) { cfg = clone(cfg); for (var q in ro.set) if (cfg[q] !== undefined) XC.apply(cfg, q, ro.set[q]); }
      return { o: o, cfg: cfg, note: f.via ? 'via ' + f.via : '', sym: sk, ru: ro };
    });
    ICON.state.mats = ru.mats || 'hide';
    var open = openFn(ru.open), v = ru.v;
    var three = jobs.filter(function (j) { return j.cfg && j.ru.m === ru.m && !(j.ru !== ru && ru.m === 'common'); });
    var solo = jobs.filter(function (j) { return j.cfg && three.indexOf(j) < 0; });
    if (ru.m === 'common' && three.length) {
      var ub = null; three.forEach(function (j) { ub = union(ub, ICON.build(j.cfg, open).box); });
      var sp = camFor(ub, v), fu = null; ICON.cam(sp);
      three.forEach(function (j) { ICON.build(j.cfg, open); ICON.cam(sp); var fp = ICON.footprint(ICON.snap()); if (fp.n) fu = union2(fu, fp.box); });
      sp.crop = square(fu, 1.1);
      three.forEach(function (j) { ICON.state.accRef = refCount(j, gr, opts); ICON.build(j.cfg, open); j.a = shot(j, sp); ICON.state.accRef = null; });
    }
    solo.forEach(function (j) { one(j); });
    three.forEach(function (j) { if (ru.m !== 'common') one(j); });
    function one(j) {
      ICON.state.accRef = /^(part|new)$/.test(j.ru.m) ? null : refCount(j, gr, opts);   // aksen = bagian yang berbeda dari pembanding
      ICON.state.weight = j.ru.weight || 1.15;   // pola halus (tuft) digambar sedikit lebih tebal
      try { one0(j); } finally { ICON.state.accRef = null; ICON.state.weight = 1.15; }
    }
    function one0(j) {
      var ru = j.ru, v = ru.v, open = openFn(ru.open);
      // bagian tegas, sisanya samar → kamera fokus pada bagian tegas (min. 30 % bingkai penuh, konteks tetap terbaca)
      function focus(info, swap) {
        var sp = camFor(info.box, v); ICON.cam(sp);
        var g = ICON.snap(), fa = ICON.footprint(g), fs = ICON.footSolid(g);
        if (!fa.n) return false;
        var fullC = square(fa.box, 1.12), fh = (fullC[2] - fullC[0]) / 2, tb = fs.n ? fs.box : fa.box;
        if (ru.one && info.parts.length > 1) {   // satu contoh saja (handle, rel): bagian paling kanan-depan
          var pick = info.parts.slice().sort(function (a, b) { return (b[3] + b[5]) - (a[3] + a[5]); })[0];
          tb = ICON.project(pick);
        }
        var c = square(tb, ru.pad || (ru.one ? 1.5 : 1.3), fh * (ru.minH != null ? ru.minH : ru.one ? .2 : .32)), hc = (c[2] - c[0]) / 2;
        if (ru.cut && hc >= fh * .6 && (tb[3] - tb[1]) < (fa.box[3] - fa.box[1]) * .5) {   // bagian lebar tapi rendah (laci kolong): potong sisi kanan
          hc = fh * .62; var cx = Math.min((tb[0] + tb[2]) / 2, tb[2] - hc * .85), cy = (tb[1] + tb[3]) / 2;
          c = [cx - hc, cy - hc, cx + hc, cy + hc];
        }
        if (swap) swap();   // model lain digambar dengan bingkai yang sama
        if ((c[2] - c[0]) / 2 >= fh * .86) { sp.crop = fullC; j.a = shot(j, sp); }
        else { sp.crop = c; j.a = shot(j, sp, 16); j.detail = true; }
        return true;
      }
      if (ru.m === 'part') {
        // hanya bagian yang dijelaskan tegas (base meja, kaki kursi), sisanya samar; penyaring gagal → seluruh benda
        var hf = typeof ru.hide === 'number' ? HIDE.lo(ru.hide) : HIDE[ru.hide], cfg0 = j.cfg;
        var pi = ICON.build(cfg0, open, { dim: function (mb, B) { return hf(mb, B, cfg0); }, accSolid: true });
        if (!pi.solid || pi.solid === pi.total || !focus(pi)) j.a = shotFull(cfg0, v, open, j);
        return;
      }
      if (ru.m === 'new') {
        // pembanding: tanpa pilihan ini (multi) atau pilihan acuan / pertama (chips)
        var rf;
        if (gr.type === 'multi') { rf = clone(j.cfg); XC.apply(rf, gr.id, (rf[gr.id] || []).filter(function (x) { return x !== j.o.id; })); }
        else { var rid2 = ru.ref && ru.ref !== j.o.id ? ru.ref : opts[0].id === j.o.id ? (opts[1] || opts[0]).id : opts[0].id; rf = clone(j.cfg); XC.apply(rf, gr.id, rid2); }
        var ri = ICON.build(rf, open), cnt = {}; ri.sigs.forEach(function (g) { cnt[g] = (cnt[g] || 0) + 1; });
        var ni = ICON.build(j.cfg, open, { faint: cnt, accSolid: true });
        if (!ni.solid && ru.rev) {
          // pilihan "tanpa" (push, tanpa storage): bingkai = letak bagian pada pembanding, digambar tanpa bagian itu
          var me = {}; ICON.build(j.cfg, open).sigs.forEach(function (g) { me[g] = (me[g] || 0) + 1; });
          var rv = ICON.build(rf, open, { faint: me, accSolid: true });
          if (rv.solid && focus(rv, function () { ICON.build(j.cfg, open); })) return;
        }
        if (!ni.solid) { if (ru.fb) { j.ru = ru.fb; one(j); } else j.a = shotFull(j.cfg, v, open, j); return; }
        if (!focus(ni)) j.a = shotFull(j.cfg, v, open, j);
        return;
      }
      if (ru.m === 'region') {
        var info = ICON.build(j.cfg, open);
        ICON.state.accBox = REG[ru.r](info.box, j.cfg); info = ICON.build(j.cfg, open); ICON.state.accBox = null;
        var sp = camFor(info.box, v); ICON.cam(sp);
        var rb = ICON.project(REG[ru.r](info.box, j.cfg)), fp = ICON.footprint(ICON.snap());
        // daerah dipotong ke tapak objek (tidak ada ruang kosong berlebih)
        if (fp.n) rb = [Math.max(rb[0], fp.box[0] - .04), Math.max(rb[1], fp.box[1] - .04), Math.min(rb[2], fp.box[2] + .04), Math.min(rb[3], fp.box[3] + .04)];
        sp.crop = square(rb, 1.08 * (ru.zoom || 1), .07); j.a = shot(j, sp, 16); j.detail = true;
      } else if (ru.m === 'diff') {
        // pembanding: tanpa pilihan ini (multi) atau pilihan acuan / pertama (chips)
        var ref;
        if (gr.type === 'multi') { ref = clone(j.cfg); XC.apply(ref, gr.id, (ref[gr.id] || []).filter(function (x) { return x !== j.o.id; })); }
        else { var rid = ru.ref && ru.ref !== j.o.id ? ru.ref : opts[0].id === j.o.id ? (opts[1] || opts[0]).id : opts[0].id; ref = clone(j.cfg); XC.apply(ref, gr.id, rid); }
        var info = ICON.build(j.cfg, open), rinfo, sp; rinfo = ICON.build(ref, open); sp = camFor(union(info.box, rinfo.box), v); ICON.cam(sp);
        var gR = ICON.snap(); ICON.build(j.cfg, open); ICON.cam(sp); var gA = ICON.snap(), fp = ICON.footprint(gA), d = ICON.diff(gR, gA);
        j.diffN = d.n;
        if (!fp.n) return;
        var full = square(fp.box, 1.12), fh = (full[2] - full[0]) / 2;
        if (d.n >= 10) {
          var db = d.box, h = Math.max(db[2] - db[0], db[3] - db[1]) / 2 * 1.35, minH = fh * .32, maxH = fh * .62;
          h = Math.max(minH, Math.min(maxH, h));
          var cx = (db[0] + db[2]) / 2, cy = (db[1] + db[3]) / 2;
          if ((db[2] - db[0]) / 2 > h) cx = ru.anchor === 'left' ? db[0] + h * .85 : db[2] - h * .85;
          if ((db[3] - db[1]) / 2 > h) cy = db[3] - h * .85;
          if (h >= fh * .6) { sp.crop = full; j.a = shot(j, sp); }
          else { sp.crop = [cx - h, cy - h, cx + h, cy + h]; j.a = shot(j, sp, 16); j.detail = true; }
        } else { sp.crop = full; j.a = shot(j, sp); j.weak = true; }
      } else j.a = shotFull(j.cfg, v, open, j);
    }
    // perbedaan terlalu kecil (pilihan tidak tampak di 3D) dan ada simbol → pakai simbol
    jobs.forEach(function (j) {
      if (j.weak && j.sym) { j.a = null; j.note = 'weak 3D → symbol'; }
      else if (j.weak) j.note = (j.note ? j.note + '; ' : '') + 'weak diff ' + j.diffN;
      if (j.a && j.sym && !SYM[j.sym].force && SYM[j.sym].prefer) { j.a = null; j.note = 'symbol preferred'; }
      var acc = null;
      if (j.a && j.acc) {
        var sa = 0, sc = 0; for (var i = 0; i < j.a.length; i++) { sa += j.a[i]; sc += Math.min(j.acc[i], j.a[i]); }
        if (sa) j.note = (j.note ? j.note + '; ' : '') + 'aksen ' + Math.round(sc / sa * 100) + '%';
        if (sa && sc / sa > .02 && sc / sa < .85) { acc = j.acc; for (i = 0; i < j.a.length; i++) { var c0 = Math.min(acc[i], j.a[i]); acc[i] = c0; j.a[i] = j.a[i] - c0; } }
      }
      out.push({ id: j.o.id, a: j.a || null, acc: acc, sym: j.a ? null : j.sym, note: j.note || '', detail: !!j.detail, skip: !!j.skip });
    });
    return out;
  }

  /* ---------------- daftar pekerjaan */
  function jobs() {
    var list = [];
    XC.CATS.forEach(function (c) {
      list.push({ kind: 'cat', cat: c.id });
      c.subs.forEach(function (s) {
        list.push({ kind: 'sub', cat: c.id, sub: s.id });
        s.groups.forEach(function (g) { if (g.type === 'chips' || g.type === 'multi') list.push({ kind: 'group', cat: c.id, sub: s.id, group: g.id }); });
      });
    });
    return list;
  }
  function jenisShot(cat, sub) {
    var c = XC.defaults(cat, sub); ICON.state.mats = 'hide';
    return shotFull(c, { az: 30, el: 15 }, 0);
  }
  function run(j) {
    if (j.kind === 'cat') { var c = XC.CATS.filter(function (x) { return x.id === j.cat; })[0]; return [{ id: j.cat, a: jenisShot(j.cat, c.subs[0].id) }]; }
    if (j.kind === 'sub') return [{ id: j.sub, a: jenisShot(j.cat, j.sub) }];
    var gr = XC.sub({ cat: j.cat, sub: j.sub }).groups.filter(function (g) { return g.id === j.group; })[0];
    return groupShots(j.cat, j.sub, gr);
  }
  window.PLAN = { jobs: jobs, run: run, rule: rule, cfgFor: cfgFor, camFor: camFor, VIEW: VIEW };
})();
