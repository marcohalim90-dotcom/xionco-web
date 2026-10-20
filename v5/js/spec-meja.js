/* ==========================================================================
   Maison XIONCO — spesifikasi Customize: Meja
   Didaftarkan ke XC lewat XC.defineCat (custom-spec.js harus dimuat lebih dulu).
   K = alat bersama (O, M, g, G, material, dll.) dari custom-spec.js.

   12 jenis: makan · kopi · samping · nesting · konsol · counter / island · bar ·
             kerja · kantor (workstation) · eksekutif · resepsionis · rias
   Kombinasi yang tidak masuk akal disembunyikan lewat when(c) (kelompok & pilihan).
   Bangun 3D: js/mk-meja.js
   ========================================================================== */
(function () {
  'use strict';
  var XC = window.XC, K = XC.K;
  var O = K.O, STONE = K.STONE, PANEL = K.PANEL, M = K.M, F = K.F, g = K.g, has = K.has;

  /* ------------------------------------------------------------------ bantu */
  var RS = /^(round|square)$/;
  var isRS = function (c) { return RS.test(c.topShape); };
  var notRS = function (c) { return !RS.test(c.topShape); };
  var notRound = function (c) { return c.topShape !== 'round'; };
  var rectish = function (c) { return /^(rect|softrect|square)$/.test(c.topShape || 'rect'); };
  var isL = function (c) { return c.layout === 'lleft' || c.layout === 'lright'; };
  var W = function (over) { var o = { l: 'Panjang', en: 'Length', when: notRS }; for (var k in over || {}) o[k] = over[k]; return g('w', o); };
  var D = function (over) { var o = { l: 'Lebar', en: 'Width', when: notRS }; for (var k in over || {}) o[k] = over[k]; return g('d', o); };
  var DIA = function (min, max, inc) { return { id: 'dia', step: 'ukuran', type: 'range', l: 'Diameter / sisi', en: 'Diameter / side', unit: 'cm', min: min, max: max, inc: inc || 5, when: isRS }; };
  var RET = function (min, max, when) { return { id: 'retL', step: 'ukuran', type: 'range', l: 'Panjang sisi L', en: 'Return length', unit: 'cm', min: min, max: max, inc: 5, when: when }; };

  // bentuk daun meja (tiap sub memilih daftarnya)
  var SHP = {
    rect: function (o) { return O('rect', 'Persegi panjang', 'Rectangle', o); },
    softrect: function (o) { return O('softrect', 'Sudut tumpul', 'Soft rectangle', o); },
    square: function (o) { return O('square', 'Persegi', 'Square', o); },
    round: function (o) { return O('round', 'Bulat', 'Round', o); },
    oval: function (o) { return O('oval', 'Oval', 'Oval', o); },
    capsule: function (o) { return O('capsule', 'Kapsul (racetrack)', 'Racetrack', merge({ s: 'Kapsul' }, o)); },
    boat: function (o) { return O('boat', 'Boat (perahu)', 'Boat shape', merge({ s: 'Boat' }, o)); },
    organic: function (o) { return O('organic', 'Organik', 'Organic', o); },
    dshape: function (o) { return O('dshape', 'Setengah bulat (D)', 'Demilune (D)', merge({ s: 'Bentuk D', se: 'D-shape' }, o)); }
  };
  function merge(a, b) { var o = {}, k; for (k in a || {}) o[k] = a[k]; for (k in b || {}) o[k] = b[k]; return o; }
  function topShape(list, extra) { return merge({ id: 'topShape', step: 'bentuk', type: 'chips', l: 'Bentuk top', en: 'Top shape', opts: list }, extra); }

  // material daun meja
  var TOPS = {
    wood: function (f) { return O('wood', 'Kayu solid', 'Solid wood', { f: f || 1.2 }); },
    veneer: function (f) { return O('veneer', 'Veneer kayu', 'Wood veneer', { f: f || 1 }); },
    hpl: function (f) { return O('hpl', 'HPL', 'HPL laminate', { f: f || .85 }); },
    stone: function (f, l) { return O('stone', l || 'Marmer / batu', l ? 'Sintered stone' : 'Marble / stone', { f: f || 1.6 }); },
    glass: function (f) { return O('glass', 'Kaca tempered', 'Tempered glass', { f: f || 1 }); },
    duco: function (f) { return O('duco', 'Duco (cat)', 'Painted (duco)', { f: f || .95 }); }
  };
  function topMat(opts) { return { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: opts }; }
  var WOODISH = /^(wood|veneer)$/;
  var bodyPaint = function (c) { return c.body === 'paint'; };
  // kayu dipakai bila top kayu, kaki kayu, atau badan (laci / kabinet) senada top non-kayu → veneer
  function woodG(extra) { return g('wood', { when: function (c) { return WOODISH.test(c.topMat) || c.baseMat === 'wood' || (extra ? extra(c) : false); } }); }
  var stoneG = function () { return { id: 'stone', step: 'material', type: 'swatch', l: 'Batu / marmer', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone' || c.baseMat === 'stone' || c.face === 'stone'; } }; };
  var panelG = function () { return { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl' || c.topMat === 'duco' || bodyPaint(c); } }; };
  function baseMat(opts, when) { return { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: opts, when: when }; }
  var BM = {
    wood: function () { return O('wood', 'Kayu', 'Wood'); },
    metal: function () { return O('metal', 'Besi / logam', 'Metal'); },
    stone: function () { return O('stone', 'Batu (sama dengan top)', 'Stone (as top)', { s: 'Batu senada', f: 1.15 }); }
  };
  // badan / laci / kabinet: senada top atau warna HPL / duco
  function bodyG(when) { return { id: 'body', step: 'material', type: 'chips', l: 'Badan & laci', en: 'Body & drawers', opts: [O('same', 'Senada top', 'Match top'), O('paint', 'Warna HPL / duco', 'Paint colour', { s: 'Warna HPL', f: 1.03 })], when: when }; }

  // kaki: profil kaki (untuk base 4 kaki / 3 kaki)
  function legStyle(when, add) {
    add = add || 1;
    return { id: 'legStyle', step: 'bentuk', type: 'chips', l: 'Profil kaki', en: 'Leg profile', when: when, opts: [
      O('tapered', 'Tapered (meruncing)', 'Tapered', { s: 'Tapered' }), O('square', 'Kotak lurus', 'Straight square', { se: 'Square' }), O('round', 'Bulat lurus', 'Straight round', { se: 'Round' }),
      O('splay', 'Miring (mid-century)', 'Splayed mid-century', { s: 'Miring', se: 'Splayed', add: Math.round(150000 * add / 5000) * 5000 }),
      O('block', 'Blok tebal', 'Chunky block', { se: 'Block', add: Math.round(200000 * add / 5000) * 5000 }), O('cyl', 'Silinder tebal', 'Thick cylinder', { s: 'Silinder', se: 'Cylinder', add: Math.round(200000 * add / 5000) * 5000 })] };
  }
  var legsBase = function (c) { return c.base === 'legs4' || c.base === 'legs3'; };

  function edgeG(k) {
    k = k || 1; var r = function (v) { return Math.round(v * k / 5000) * 5000; };
    return { id: 'edge', step: 'detail', type: 'chips', l: 'Profil tepi', en: 'Edge profile', opts: [O('square', 'Lurus 90°', 'Square'), O('eased', 'Eased (tumpul tipis)', 'Eased', { s: 'Eased' }),
      O('bevel', 'Bevel (miring)', 'Bevelled', { s: 'Bevel', add: r(250000) }), O('bullnose', 'Bullnose (bulat)', 'Bullnose', { s: 'Bullnose', add: r(300000) }),
      O('knife', 'Knife edge (tipis)', 'Knife edge', { s: 'Knife edge', add: r(350000) }), O('live', 'Live edge (alami)', 'Live edge', { s: 'Live edge', add: r(900000), when: function (c) { return WOODISH.test(c.topMat) && c.topMat === 'wood'; } })] };
  }
  // tampilan meja (tanpa harga): alas piring / set makan lengkap
  var TABLEWARE = { id: 'tableware', step: 'detail', type: 'chips', l: 'Tampilan meja', en: 'Table setting', opts: [
    O('none', 'Tanpa', 'None', { f: 1, add: 0 }), O('mats', 'Alas piring', 'Placemats', { f: 1, add: 0 }), O('full', 'Set makan lengkap', 'Full place setting', { s: 'Set makan', se: 'Place setting', f: 1, add: 0 })] };

  /* ------------------------------------------------------------------ base per sub */
  var END = /^(trestle|sled|slab|arch|x|v|double)$/;
  var DINING_BASE = [
    O('legs4', '4 kaki', '4 legs'), O('pedestal', 'Pedestal tulip', 'Tulip pedestal', { add: 900000 }), O('cone', 'Pedestal kerucut', 'Cone pedestal', { s: 'Kerucut', se: 'Cone', add: 1000000 }),
    O('cross', 'Pedestal silang', 'Cross pedestal', { add: 800000 }), O('blade', 'Sirip silang', 'Blade base', { add: 1100000 }),
    O('double', 'Dua pedestal', 'Double pedestal', { add: 1500000, when: notRS }), O('trestle', 'Trestle', 'Trestle', { add: 600000, when: notRound }),
    O('sled', 'Rangka U', 'Sled frame', { add: 500000, when: notRound }), O('slab', 'Panel slab', 'Slab panels', { add: 700000, when: notRound }),
    O('arch', 'Panel lengkung', 'Arched panels', { add: 950000, when: notRound }), O('x', 'Kaki X', 'X-legs', { add: 500000, when: notRound })
  ];

  // meja kerja: bantu
  var deskPedOk = function (side) { return function (c) { var w = +c.w || 140; return side === 'both' ? w >= 140 && c.base !== 'electric' : w >= 100; }; };
  var towerOk = function (side) { return function (c) { var ps = c.pedestal || 'none', floor = (c.pedType || 'floor') === 'floor'; if (floor && (ps === side || ps === 'both')) return false; if (c.layout === (side === 'left' ? 'lleft' : 'lright')) return false; return c.base !== 'electric'; }; };

  var cat = (
    O('meja', 'Meja', 'Tables', { subs: [
      /* ---------------- MEJA MAKAN */
      O('dining', 'Meja makan', 'Dining table', { base: 4200000, dims: { w: [80, 320, 5, 180], d: [70, 120, 1, 90], h: [70, 78, 1, 75] }, tableH: true,
        def: { seats: '6', topShape: 'rect', topMat: 'wood', wood: 'walnut', stone: 'carrara', panel: 'ivory', metal: 'black', edge: 'eased', thick: 4, base: 'legs4', legStyle: 'tapered', baseMat: 'wood', dia: 140, tableware: 'none' },
        groups: [
          { id: 'seats', step: 'bentuk', type: 'chips', l: 'Kapasitas', en: 'Seats', opts: [O('2', '2 orang', '2 people'), O('4', '4 orang', '4 people'), O('6', '6 orang', '6 people'), O('8', '8 orang', '8 people'), O('10', '10 orang', '10 people'), O('12', '12 orang', '12 people')],
            preset: { w: { 2: 80, 4: 140, 6: 180, 8: 220, 10: 260, 12: 300 }, dia: { 2: 80, 4: 110, 6: 140, 8: 160, 10: 180, 12: 180 } } },
          topShape([SHP.rect(), SHP.softrect({ f: 1.03 }), SHP.square(), SHP.round(), SHP.oval({ f: 1.06 }), SHP.capsule({ f: 1.06 }), SHP.boat({ f: 1.08 }), SHP.organic({ f: 1.15 })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: DINING_BASE },
          legStyle(function (c) { return c.base === 'legs4'; }),
          W(), D(), DIA(70, 180), g('h'), g('thick'),
          topMat([TOPS.wood(), TOPS.veneer(), TOPS.hpl(), TOPS.stone(), TOPS.glass(), TOPS.duco()]),
          woodG(), stoneG(), panelG(),
          baseMat([BM.wood(), BM.metal(), BM.stone()]),
          g('metal', { when: function (c) { return c.baseMat === 'metal'; } }),
          edgeG(), TABLEWARE,
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('extend', 'Bisa diperpanjang (extension)', 'Extendable', { s: 'Extension', add: 1800000, when: function (c) { return c.topShape !== 'organic' && c.topMat !== 'glass'; } }),
            O('lazy', 'Lazy susan (putar)', 'Lazy susan', { s: 'Lazy susan', add: 700000, when: isRS }),
            O('cable', 'Lubang kabel', 'Cable grommet', { add: 150000 }), O('socket', 'Stopkontak VAZRA di meja', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('protect', 'Coating anti noda', 'Stain-proof coating', { s: 'Anti noda', se: 'Stain-proof', add: 400000 })] }
        ] }),

      /* ---------------- MEJA KOPI */
      O('coffee', 'Meja kopi (coffee table)', 'Coffee table', { s: 'Meja kopi', base: 1300000, dims: { w: [50, 160, 5, 110], d: [40, 100, 1, 60], h: [28, 50, 1, 38] }, tableH: true,
        def: { topShape: 'rect', topMat: 'wood', wood: 'oak', stone: 'travertine', panel: 'ivory', metal: 'black', edge: 'eased', thick: 3, base: 'legs4', legStyle: 'tapered', baseMat: 'wood', dia: 90 },
        groups: [
          topShape([SHP.rect(), SHP.softrect(), SHP.square(), SHP.round(), SHP.oval(), SHP.capsule(), SHP.organic({ f: 1.15 })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs4', '4 kaki', '4 legs'), O('pedestal', 'Pedestal', 'Pedestal', { add: 400000 }),
            O('drum', 'Drum (silinder)', 'Drum base', { s: 'Drum', add: 500000 }), O('plinth', 'Plinth (blok)', 'Block plinth', { s: 'Plinth', se: 'Plinth', add: 600000 }),
            O('pillar', 'Kaki pilar', 'Pillar legs', { add: 350000 }), O('slab', 'Panel slab', 'Slab panels', { add: 400000, when: notRound }),
            O('sled', 'Rangka U', 'Sled frame', { add: 300000, when: notRound }), O('waterfall', 'Waterfall', 'Waterfall', { add: 450000, when: function (c) { return /^(rect|square)$/.test(c.topShape); } }),
            O('x', 'Kaki X', 'X-legs', { add: 300000, when: notRound })] },
          legStyle(function (c) { return c.base === 'legs4'; }, .6),
          W(), D(), DIA(50, 130), g('h'), g('thick'),
          topMat([TOPS.wood(), TOPS.veneer(), TOPS.hpl(), TOPS.stone(), TOPS.glass(), TOPS.duco()]),
          woodG(), stoneG(), panelG(),
          baseMat([BM.wood(), BM.metal(), BM.stone()], function (c) { return c.base !== 'waterfall'; }),
          g('metal', { when: function (c) { return c.baseMat === 'metal' && c.base !== 'waterfall'; } }),
          edgeG(.6),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 300000, when: function (c) { return /^(legs4|sled|slab|waterfall|x)$/.test(c.base); } }),
            O('drawer', 'Laci', 'Drawer', { add: 450000, when: function (c) { return rectish(c) && /^(legs4|slab|waterfall|plinth|sled)$/.test(c.base); } }),
            O('lift', 'Top angkat (lift-top)', 'Lift-top', { s: 'Lift-top', add: 900000, when: function (c) { return rectish(c) && /^(legs4|slab|plinth|sled)$/.test(c.base) && c.topMat !== 'glass' && c.topMat !== 'stone'; } }),
            O('protect', 'Coating anti noda', 'Stain-proof coating', { s: 'Anti noda', se: 'Stain-proof', add: 250000 })] }
        ] }),

      /* ---------------- MEJA SAMPING */
      O('side', 'Meja samping (side table)', 'Side table', { s: 'Meja samping', base: 650000, dims: { w: [30, 70, 1, 45], d: [30, 70, 1, 45], h: [40, 70, 1, 55] }, tableH: true,
        def: { topShape: 'round', topMat: 'wood', wood: 'walnut', stone: 'nero', panel: 'sage', metal: 'brass', edge: 'eased', thick: 2.5, base: 'pedestal', legStyle: 'tapered', baseMat: 'metal', dia: 45 },
        groups: [
          topShape([SHP.round(), SHP.square(), SHP.rect(), SHP.oval(), SHP.organic()]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('pedestal', 'Pedestal', 'Pedestal'), O('cone', 'Kerucut', 'Cone', { add: 150000 }),
            O('legs3', '3 kaki', '3 legs', { when: function (c) { return /^(round|organic|oval)$/.test(c.topShape); } }), O('legs4', '4 kaki', '4 legs'),
            O('cshape', 'C-shape (masuk ke sofa)', 'C-shape (slides over sofa)', { s: 'C-shape', se: 'C-shape', add: 200000 }), O('drum', 'Drum', 'Drum', { add: 200000 })] },
          legStyle(legsBase, .4),
          DIA(30, 70, 1), g('w', { when: notRS }), g('d', { when: notRS }), g('h'), g('thick'),
          topMat([TOPS.wood(), TOPS.hpl(), TOPS.stone(1.5), TOPS.glass(), TOPS.duco()]),
          woodG(), stoneG(), panelG(),
          baseMat([BM.metal(), BM.wood(), BM.stone()]),
          g('metal', { when: function (c) { return c.baseMat === 'metal' || has(c, 'extras', 'lamp'); } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 150000, when: function (c) { return /^(legs3|legs4|cshape)$/.test(c.base); } }),
            O('charger', 'Wireless charger', 'Wireless charger', { s: 'Charger', se: 'Charger', add: 450000 }), O('lamp', 'Lampu terintegrasi', 'Integrated lamp', { s: 'Lampu', se: 'Lamp', add: 600000 })] }
        ] }),

      /* ---------------- MEJA NESTING (SET) */
      O('nesting', 'Meja nesting (set)', 'Nesting tables', { s: 'Meja nesting', se: 'Nesting set', base: 1600000, dims: { w: [40, 120, 5, 70], d: [35, 80, 1, 50], h: [35, 65, 1, 45] }, tableH: true,
        def: { pieces: '2', topShape: 'round', topMat: 'wood', wood: 'walnut', stone: 'travertine', panel: 'greige', metal: 'black', thick: 2.5, base: 'legs', baseMat: 'metal', dia: 60 },
        groups: [
          { id: 'pieces', step: 'bentuk', type: 'chips', l: 'Jumlah meja', en: 'Pieces', opts: [O('2', 'Set 2 meja', 'Set of 2'), O('3', 'Set 3 meja', 'Set of 3', { f: 1.4 })] },
          topShape([SHP.round(), SHP.square(), SHP.rect(), SHP.organic({ f: 1.12 })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs', 'Kaki ramping', 'Slim legs'), O('sled', 'Rangka U', 'Sled frame', { add: 200000 }),
            O('pedestal', 'Pedestal', 'Pedestal', { add: 250000 }), O('drum', 'Silinder (drum)', 'Drum', { s: 'Drum', add: 400000 })] },
          DIA(35, 90), W({ l: 'Panjang (terbesar)', en: 'Length (largest)' }), D({ l: 'Lebar (terbesar)', en: 'Width (largest)' }), g('h', { l: 'Tinggi (tertinggi)', en: 'Height (tallest)' }), g('thick'),
          topMat([TOPS.wood(), TOPS.veneer(), TOPS.stone(1.5), TOPS.glass(), TOPS.duco()]),
          woodG(), stoneG(), panelG(),
          baseMat([BM.metal(), BM.wood()], function (c) { return c.base !== 'drum'; }),
          g('metal', { when: function (c) { return c.baseMat === 'metal' && c.base !== 'drum'; } })
        ] }),

      /* ---------------- MEJA KONSOL */
      O('console', 'Meja konsol', 'Console table', { base: 2100000, dims: { w: [80, 200, 5, 120], d: [28, 50, 1, 36], h: [70, 90, 1, 80] }, tableH: true,
        def: { topShape: 'rect', topMat: 'wood', wood: 'walnut', stone: 'travertine', panel: 'greige', metal: 'brass', edge: 'eased', thick: 3, base: 'slab', legStyle: 'tapered', baseMat: 'wood', drawers: 2, face: 'plain' },
        groups: [
          topShape([SHP.rect(), SHP.softrect(), SHP.capsule(), SHP.dshape({ f: 1.08 }), SHP.organic({ f: 1.12 })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs4', '4 kaki', '4 legs'), O('slab', 'Panel slab', 'Slab panels'), O('arch', 'Panel lengkung', 'Arched panels', { add: 350000 }),
            O('waterfall', 'Waterfall', 'Waterfall', { add: 300000, when: function (c) { return c.topShape === 'rect'; } }), O('sled', 'Rangka U', 'Sled frame'),
            O('pillar', 'Dua pilar bubut', 'Twin turned pillars', { s: 'Dua pilar', se: 'Twin pillars', add: 450000 }),
            O('wall', 'Gantung dinding', 'Wall-hung', { s: 'Gantung', se: 'Wall-hung', f: .9 })] },
          legStyle(function (c) { return c.base === 'legs4'; }, .7),
          { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci', en: 'Drawers', unit: 'pcs', min: 0, max: 3, inc: 1, addEach: 350000, when: function (c) { return c.topShape !== 'organic'; } },
          { id: 'face', step: 'bentuk', type: 'chips', l: 'Muka laci', en: 'Drawer fronts', off: 'plain', when: function (c) { return +c.drawers > 0 && c.topShape !== 'organic'; }, opts: [O('plain', 'Polos', 'Plain'), O('fluted', 'Fluted', 'Fluted', { add: 400000 }), O('cane', 'Rotan (cane)', 'Cane', { s: 'Rotan', add: 350000 })] },
          W(), g('d'), g('h'), g('thick'),
          topMat([TOPS.wood(), TOPS.veneer(), TOPS.hpl(), TOPS.stone(1.5), TOPS.duco()]),
          woodG(function (c) { return +c.drawers > 0 && c.topShape !== 'organic' || c.face !== 'plain'; }), stoneG(), panelG(),
          baseMat([BM.wood(), BM.metal()], function (c) { return !/^(waterfall|wall)$/.test(c.base); }),
          g('metal', { when: function (c) { return c.baseMat === 'metal' && !/^(waterfall|wall)$/.test(c.base) || +c.drawers > 0; }, l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(.7),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 300000, when: function (c) { return /^(legs4|slab|arch|waterfall|sled)$/.test(c.base); } }),
            O('led', 'Lampu LED', 'LED light', { add: 450000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 })] }
        ] }),

      /* ---------------- MEJA COUNTER / KITCHEN ISLAND (tinggi counter 90 cm) */
      O('counter', 'Meja counter / island', 'Counter table / island', { s: 'Meja counter', se: 'Counter table', base: 4500000, dims: { w: [80, 300, 5, 160], d: [60, 120, 1, 90], h: [86, 96, 1, 90] }, tableH: true,
        def: { form: 'table', topShape: 'rect', topMat: 'stone', wood: 'oak', stone: 'carrara', panel: 'sage', metal: 'brass', edge: 'eased', thick: 4, base: 'legs4', legStyle: 'square', baseMat: 'wood', dia: 100, islandBody: 'drawers', body: 'same', footrest: 'none', tableware: 'none' },
        groups: [
          { id: 'form', step: 'bentuk', type: 'chips', l: 'Jenis', en: 'Form', opts: [O('table', 'Meja counter', 'Counter table'), O('island', 'Kitchen island', 'Kitchen island', { s: 'Island', se: 'Island', f: 1.6 })] },
          topShape([SHP.rect(), SHP.softrect(), SHP.square({ when: function (c) { return c.form !== 'island'; } }), SHP.round({ when: function (c) { return c.form !== 'island'; } }), SHP.capsule({ f: 1.05 })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', when: function (c) { return c.form !== 'island'; }, opts: [O('legs4', '4 kaki', '4 legs'),
            O('pedestal', 'Pedestal', 'Pedestal', { add: 900000 }), O('cross', 'Pedestal silang', 'Cross pedestal', { add: 800000 }),
            O('double', 'Dua pedestal', 'Double pedestal', { add: 1400000, when: notRS }), O('trestle', 'Trestle', 'Trestle', { add: 600000, when: notRound }),
            O('sled', 'Rangka U', 'Sled frame', { add: 500000, when: notRound }), O('slab', 'Panel slab', 'Slab panels', { add: 700000, when: notRound })] },
          legStyle(function (c) { return c.form !== 'island' && c.base === 'legs4'; }),
          { id: 'islandBody', step: 'bentuk', type: 'chips', l: 'Penyimpanan island', en: 'Island storage', when: function (c) { return c.form === 'island'; }, opts: [O('drawers', 'Laci + pintu', 'Drawers + doors', { s: 'Laci + pintu', se: 'Drawers+doors' }),
            O('doors', 'Pintu', 'Doors', { f: .96 }), O('open', 'Rak terbuka', 'Open shelves', { s: 'Rak terbuka', se: 'Open shelves', f: .9 })] },
          { id: 'footrest', step: 'bentuk', type: 'chips', l: 'Pijakan kaki', en: 'Footrest', off: 'none', opts: [O('none', 'Tanpa', 'None'),
            O('bar', 'Palang pijakan', 'Foot bar', { add: 650000, when: function (c) { return c.form === 'island' || /^(legs4|trestle|double|sled|slab)$/.test(c.base); } }),
            O('ring', 'Ring pijakan', 'Foot ring', { add: 750000, when: function (c) { return c.form !== 'island' && /^(pedestal|cross)$/.test(c.base); } })] },
          W(), D(), DIA(70, 120), g('h'), g('thick'),
          topMat([TOPS.stone(1.5), TOPS.wood(), TOPS.veneer(), TOPS.hpl(), TOPS.duco()]),
          woodG(function (c) { return c.form === 'island' && c.body !== 'paint' && !WOODISH.test(c.topMat); }), stoneG(), panelG(),
          bodyG(function (c) { return c.form === 'island'; }),
          baseMat([BM.wood(), BM.metal(), BM.stone()], function (c) { return c.form !== 'island'; }),
          g('metal', { when: function (c) { return c.form !== 'island' && c.baseMat === 'metal' || c.form === 'island' || c.footrest !== 'none'; }, l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(), TABLEWARE,
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('waterfall', 'Sisi waterfall', 'Waterfall ends', { s: 'Waterfall', se: 'Waterfall', add: 2400000, when: function (c) { return c.form === 'island'; } }),
            O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('protect', 'Coating anti noda', 'Stain-proof coating', { s: 'Anti noda', se: 'Stain-proof', add: 450000 })] }
        ] }),

      /* ---------------- MEJA BAR (tinggi bar 105 cm) */
      O('bar', 'Meja bar', 'Bar table', { base: 2400000, dims: { w: [60, 240, 5, 120], d: [50, 90, 1, 60], h: [100, 112, 1, 105] }, tableH: true,
        def: { topShape: 'round', topMat: 'wood', wood: 'walnut', stone: 'nero', panel: 'charcoal', metal: 'black', edge: 'eased', thick: 3, base: 'pedestal', legStyle: 'tapered', baseMat: 'metal', dia: 70, footrest: 'none', tableware: 'none' },
        groups: [
          topShape([SHP.round(), SHP.square(), SHP.rect(), SHP.softrect()]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('pedestal', 'Pedestal tulip', 'Tulip pedestal'), O('cross', 'Pedestal silang', 'Cross pedestal', { add: 150000 }),
            O('cone', 'Pedestal kerucut', 'Cone pedestal', { s: 'Kerucut', se: 'Cone', add: 300000 }), O('slatted', 'Bilah kayu (slatted)', 'Slatted wood', { s: 'Bilah kayu', se: 'Slatted', add: 650000, when: isRS }),
            O('legs4', '4 kaki', '4 legs'), O('legs3', '3 kaki', '3 legs', { when: function (c) { return c.topShape === 'round'; } }),
            O('double', 'Dua tiang', 'Twin column', { add: 400000, when: notRS }), O('trestle', 'Trestle', 'Trestle', { add: 350000, when: notRS })] },
          legStyle(legsBase, .6),
          { id: 'footrest', step: 'bentuk', type: 'chips', l: 'Pijakan kaki', en: 'Footrest', off: 'none', opts: [O('none', 'Tanpa', 'None'),
            O('ring', 'Ring pijakan', 'Foot ring', { add: 450000, when: function (c) { return /^(pedestal|cross|cone|slatted|legs3|legs4)$/.test(c.base); } }),
            O('bar', 'Palang pijakan', 'Foot bar', { add: 400000, when: function (c) { return /^(legs4|double|trestle)$/.test(c.base); } })] },
          W(), D(), DIA(55, 110), g('h'), g('thick'),
          topMat([TOPS.wood(), TOPS.veneer(), TOPS.hpl(), TOPS.stone(1.5), TOPS.glass()]),
          woodG(function (c) { return c.base === 'slatted'; }), stoneG(), panelG(),
          baseMat([BM.metal(), BM.wood()], function (c) { return c.base !== 'slatted'; }),
          g('metal', { when: function (c) { return c.baseMat === 'metal' && c.base !== 'slatted' || c.footrest !== 'none'; } }),
          edgeG(.6), TABLEWARE,
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('hooks', 'Gantungan tas', 'Bag hooks', { s: 'Gantungan tas', add: 150000 }),
            O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('protect', 'Coating anti noda', 'Stain-proof coating', { s: 'Anti noda', se: 'Stain-proof', add: 250000 })] }
        ] }),

      /* ---------------- MEJA KERJA (rumah) — konfigurasi: lurus / L, kaki, pedestal laci, hutch, rak menara */
      O('desk', 'Meja kerja', 'Desk', { base: 2000000, dims: { w: [90, 240, 5, 140], d: [50, 90, 1, 70], h: [70, 78, 1, 75] }, tableH: true,
        def: { layout: 'straight', topShape: 'rect', topMat: 'veneer', wood: 'oak', stone: 'carrara', panel: 'charcoal', metal: 'black', edge: 'eased', thick: 3, base: 'sled', legStyle: 'tapered', baseMat: 'metal', body: 'same',
          pedestal: 'none', pedType: 'floor', pedDrawers: '3', drawers: 1, hutch: 'none', tower: 'none', retL: 120 },
        groups: [
          { id: 'layout', step: 'bentuk', type: 'chips', l: 'Konfigurasi', en: 'Layout', opts: [O('straight', 'Lurus', 'Straight'), O('lleft', 'L — sisi kiri', 'L — return left', { s: 'L kiri', se: 'L left', f: 1.45 }),
            O('lright', 'L — sisi kanan', 'L — return right', { s: 'L kanan', se: 'L right', f: 1.45 })] },
          topShape([SHP.rect(), SHP.softrect({ f: 1.03, when: function (c) { return !isL(c); } }), SHP.capsule({ f: 1.06, when: function (c) { return !isL(c); } }), SHP.organic({ f: 1.15, when: function (c) { return !isL(c); } })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Rangka / kaki', en: 'Frame / legs', opts: [O('legs4', '4 kaki', '4 legs'), O('sled', 'Rangka U', 'Sled frame'),
            O('aframe', 'Rangka A', 'A-frame', { add: 250000 }), O('slab', 'Panel samping', 'Side panels', { add: 300000 }),
            O('waterfall', 'Waterfall', 'Waterfall', { add: 450000, when: function (c) { return !isL(c) && c.topShape === 'rect'; } }),
            O('electric', 'Standing elektrik', 'Electric standing', { s: 'Elektrik', se: 'Electric', add: 3500000, when: function (c) { return !isL(c) && rectish(c); } })] },
          legStyle(function (c) { return c.base === 'legs4'; }, .7),
          { id: 'pedestal', step: 'bentuk', type: 'chips', l: 'Pedestal laci', en: 'Drawer pedestal', off: 'none', opts: [O('none', 'Tanpa', 'None'),
            O('left', 'Kiri', 'Left', { add: 1400000, when: deskPedOk('left') }), O('right', 'Kanan', 'Right', { add: 1400000, when: deskPedOk('right') }),
            O('both', 'Kiri & kanan', 'Both sides', { add: 2700000, when: deskPedOk('both') })] },
          { id: 'pedType', step: 'bentuk', type: 'chips', l: 'Jenis pedestal', en: 'Pedestal type', when: function (c) { return c.pedestal && c.pedestal !== 'none'; }, opts: [
            O('floor', 'Berdiri (penopang)', 'Floor (support)', { s: 'Berdiri', se: 'Floor', when: function (c) { return c.base !== 'electric'; } }),
            O('hang', 'Gantung di bawah top', 'Hanging', { s: 'Gantung', f: .97, when: function (c) { return c.base !== 'electric'; } }),
            O('mobile', 'Mobile (roda)', 'Mobile (castors)', { s: 'Mobile', se: 'Mobile', add: 250000 })] },
          { id: 'pedDrawers', step: 'bentuk', type: 'chips', l: 'Isi pedestal', en: 'Pedestal drawers', when: function (c) { return c.pedestal && c.pedestal !== 'none'; }, opts: [
            O('3', '3 laci', '3 drawers'), O('2f', '2 laci + file', '2 + file drawer', { s: '2 laci + file', se: '2 + file', add: 200000 }),
            O('door', 'Laci + pintu', 'Drawer + door', { when: function (c) { return c.pedType !== 'hang'; } })] },
          { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci tengah (tipis)', en: 'Centre drawers (slim)', unit: 'pcs', min: 0, max: 2, inc: 1, addEach: 350000, when: function (c) { return c.topShape !== 'organic'; } },
          { id: 'hutch', step: 'bentuk', type: 'chips', l: 'Rak atas (hutch)', en: 'Hutch / top shelf', off: 'none', when: rectish, opts: [O('none', 'Tanpa', 'None'),
            O('gallery', 'Gallery rendah', 'Low gallery', { add: 900000 }), O('shelf', 'Rak terbuka', 'Open hutch', { add: 1500000 }), O('cabinet', 'Hutch berpintu', 'Hutch with doors', { s: 'Hutch pintu', se: 'Door hutch', add: 2300000 })] },
          { id: 'tower', step: 'bentuk', type: 'chips', l: 'Rak menara samping', en: 'Side shelf tower', off: 'none', when: rectish, opts: [O('none', 'Tanpa', 'None'),
            O('left', 'Kiri', 'Left', { add: 1600000, when: towerOk('left') }), O('right', 'Kanan', 'Right', { add: 1600000, when: towerOk('right') })] },
          W(), D(), RET(80, 180, isL), g('h', { l: 'Tinggi (duduk)', en: 'Height (seated)' }), g('thick'),
          topMat([TOPS.wood(1.25), TOPS.veneer(), TOPS.hpl(), TOPS.stone(1.5, 'Sintered stone')]),
          woodG(function (c) { return !bodyPaint(c) && (c.pedestal !== 'none' || +c.drawers > 0 || c.hutch !== 'none' || c.tower !== 'none'); }), stoneG(), panelG(),
          bodyG(function (c) { return c.pedestal !== 'none' || c.hutch !== 'none' || c.tower !== 'none' || +c.drawers > 0; }),
          baseMat([BM.metal(), BM.wood()], function (c) { return !/^(waterfall|electric|slab)$/.test(c.base); }),
          g('metal', { l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(.8),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('modesty', 'Panel depan (modesty)', 'Modesty panel', { s: 'Panel modesty', se: 'Modesty panel', add: 400000 }),
            O('cable', 'Tray & lubang kabel', 'Cable tray & grommet', { s: 'Tray kabel', se: 'Cable tray', add: 350000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('monitor', 'Rak monitor', 'Monitor shelf', { add: 450000, when: function (c) { return c.hutch === 'none'; } }),
            O('keyboard', 'Laci keyboard', 'Keyboard tray', { add: 500000, when: function (c) { return !(+c.drawers > 0) && c.topShape !== 'organic'; } }),
            O('lock', 'Laci berkunci', 'Lockable drawers', { s: 'Kunci laci', se: 'Lockable', add: 200000, when: function (c) { return c.pedestal !== 'none' || +c.drawers > 0; } })] }
        ] }),

      /* ---------------- MEJA KANTOR / WORKSTATION */
      O('office', 'Meja kantor (workstation)', 'Office workstation', { s: 'Meja kantor', se: 'Workstation', base: 2800000, dims: { w: [100, 180, 5, 140], d: [60, 80, 1, 70], h: [72, 76, 1, 75] }, tableH: true,
        def: { layout: 'single', frame: 'sled', topMat: 'hpl', wood: 'oak', panel: 'ivory', metal: 'black', thick: 2.5, baseMat: 'metal', screen: 'fabric', mped: 'none' },
        groups: [
          { id: 'layout', step: 'bentuk', type: 'chips', l: 'Tata letak', en: 'Layout', opts: [O('single', '1 orang', 'Single'), O('b2', 'Bench 2 orang', 'Bench for 2', { s: 'Bench 2', se: 'Bench 2', f: 1.85 }),
            O('b4', 'Bench 4 orang', 'Bench for 4', { s: 'Bench 4', se: 'Bench 4', f: 3.5 }), O('b6', 'Bench 6 orang', 'Bench for 6', { s: 'Bench 6', se: 'Bench 6', f: 5.1 })] },
          { id: 'frame', step: 'bentuk', type: 'chips', l: 'Rangka', en: 'Frame', opts: [O('sled', 'Rangka U (loop)', 'Loop frame', { s: 'Rangka U' }), O('legs4', 'Kaki kotak', 'Square legs'),
            O('aframe', 'Rangka A', 'A-frame', { f: 1.04 }), O('slab', 'Panel samping', 'Side panels', { f: 1.05 }),
            O('electric', 'Standing elektrik', 'Electric standing', { s: 'Elektrik', se: 'Electric', add: 3500000, when: function (c) { return c.layout === 'single'; } })] },
          { id: 'screen', step: 'bentuk', type: 'chips', l: 'Panel privasi', en: 'Privacy screen', opts: [O('none', 'Tanpa', 'None', { f: .94 }), O('fabric', 'Panel kain', 'Fabric panel'),
            O('acrylic', 'Akrilik frosted', 'Frosted acrylic', { s: 'Akrilik', se: 'Acrylic', f: 1.02 }), O('glass', 'Kaca + rangka', 'Framed glass', { s: 'Kaca', se: 'Glass', f: 1.06 })] },
          { id: 'mped', step: 'bentuk', type: 'chips', l: 'Pedestal mobile', en: 'Mobile pedestal', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('each', 'Per orang (3 laci)', 'One per person', { s: 'Per orang', se: 'Per person', f: 1.2 })] },
          g('w', { l: 'Lebar per orang', en: 'Width per person' }), g('d', { l: 'Kedalaman per orang', en: 'Depth per person' }), g('h'), g('thick'),
          topMat([TOPS.hpl(1), TOPS.veneer(1.12), TOPS.wood(1.3)]),
          woodG(function (c) { return c.mped !== 'none' && c.topMat !== 'hpl'; }), panelG(),
          baseMat([BM.metal(), BM.wood()], function (c) { return c.frame !== 'electric' && c.frame !== 'slab'; }),
          g('metal'),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('tray', 'Tray kabel', 'Cable tray', { add: 300000 }),
            O('spine', 'Cable spine (tengah)', 'Central cable spine', { s: 'Cable spine', se: 'Cable spine', add: 850000, when: function (c) { return c.layout !== 'single'; } }),
            O('power', 'Power box di top', 'Desktop power box', { s: 'Power box', se: 'Power box', add: 550000 }), O('modesty', 'Panel modesty', 'Modesty panel', { add: 350000 }),
            O('arm', 'Lengan monitor', 'Monitor arm', { s: 'Lengan monitor', add: 750000 })] }
        ] }),

      /* ---------------- MEJA EKSEKUTIF */
      O('executive', 'Meja eksekutif', 'Executive desk', { base: 9500000, dims: { w: [160, 300, 5, 200], d: [80, 110, 1, 90], h: [74, 78, 1, 76] }, tableH: true,
        def: { form: 'desk', side: 'right', topShape: 'softrect', base: 'ped2', front: 'panel', inlay: 'none', pedDrawers: '3', topMat: 'veneer', wood: 'walnut', stone: 'nero', panel: 'charcoal', metal: 'brass', body: 'same', edge: 'eased', thick: 4, retL: 140 },
        groups: [
          { id: 'form', step: 'bentuk', type: 'chips', l: 'Komposisi', en: 'Composition', opts: [O('desk', 'Meja saja', 'Desk only'), O('return', 'Dengan return (L)', 'With return (L)', { s: 'Dengan return', se: 'With return', f: 1.35 }),
            O('credenza', 'Dengan credenza', 'With credenza', { s: 'Dgn credenza', se: 'With credenza', f: 1.45 }), O('u', 'U (return + credenza)', 'U (return + credenza)', { s: 'Bentuk U', se: 'U-shape', f: 1.8 })] },
          { id: 'side', step: 'bentuk', type: 'chips', l: 'Sisi return', en: 'Return side', when: function (c) { return c.form === 'return' || c.form === 'u'; }, opts: [O('left', 'Kiri', 'Left'), O('right', 'Kanan', 'Right')] },
          topShape([SHP.rect(), SHP.softrect(), SHP.capsule({ f: 1.06, when: function (c) { return c.form === 'desk' || c.form === 'credenza'; } }), SHP.boat({ f: 1.08, when: function (c) { return c.form === 'desk' || c.form === 'credenza'; } })]),
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Penopang', en: 'Support', opts: [O('ped2', 'Dua pedestal', 'Twin pedestals'), O('pedPanel', 'Pedestal + panel', 'Pedestal + panel', { s: 'Pedestal+panel', se: 'Ped. + panel', f: .93 }),
            O('pedCyl', 'Pedestal + pilar', 'Pedestal + column', { s: 'Pedestal+pilar', se: 'Ped. + column', f: .95 }), O('slab', 'Panel slab', 'Slab panels', { f: .86 }),
            O('legs4', 'Kaki + laci gantung', 'Legs + hanging drawers', { s: 'Kaki + laci', se: 'Legs + drawers', f: .82 }), O('sled', 'Rangka logam', 'Metal frame', { f: .85 })] },
          { id: 'pedDrawers', step: 'bentuk', type: 'chips', l: 'Isi pedestal', en: 'Pedestal drawers', when: function (c) { return /^(ped2|pedPanel|pedCyl|legs4)$/.test(c.base); }, opts: [O('3', '3 laci', '3 drawers'), O('2f', '2 laci + file', '2 + file drawer', { s: '2 laci + file', se: '2 + file', add: 300000 })] },
          { id: 'front', step: 'bentuk', type: 'chips', l: 'Panel depan', en: 'Front panel', opts: [O('open', 'Terbuka', 'Open', { f: .95 }), O('panel', 'Panel polos', 'Plain panel', { s: 'Polos', se: 'Plain' }),
            O('fluted', 'Fluted', 'Fluted', { add: 1600000 }), O('leather', 'Kulit jahit', 'Stitched leather', { s: 'Kulit', se: 'Leather', add: 2200000 })] },
          W(), D(), RET(100, 200, function (c) { return c.form === 'return' || c.form === 'u'; }), g('h'), g('thick'),
          topMat([TOPS.veneer(), TOPS.wood(1.25), TOPS.stone(1.45), TOPS.glass(1.05)]),
          { id: 'inlay', step: 'material', type: 'chips', l: 'Inlay kulit', en: 'Leather inlay', off: 'none', when: function (c) { return c.topMat !== 'glass' && c.topShape !== 'boat'; }, opts: [O('none', 'Tanpa', 'None'),
            O('black', 'Kulit hitam', 'Black leather', { s: 'Hitam', se: 'Black', add: 1200000, hex: '#1c1a19' }), O('cognac', 'Kulit cognac', 'Cognac leather', { s: 'Cognac', se: 'Cognac', add: 1200000, hex: '#7b4a2c' }), O('green', 'Kulit hijau', 'Green leather', { s: 'Hijau', se: 'Green', add: 1200000, hex: '#2f4a3a' })] },
          woodG(function (c) { return !bodyPaint(c); }), stoneG(), panelG(), bodyG(),
          g('metal', { l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(1.2),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('lock', 'Kunci laci', 'Lockable drawers', { se: 'Lockable', add: 300000 }),
            O('cable', 'Tray & lubang kabel', 'Cable tray & grommet', { s: 'Tray kabel', se: 'Cable tray', add: 450000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('charger', 'Wireless charger', 'Wireless charger', { s: 'Charger', se: 'Charger', add: 450000 }), O('brass', 'List kuningan', 'Brass inlay strip', { s: 'List kuningan', se: 'Brass strip', add: 900000 }),
            O('led', 'LED credenza', 'Credenza LED', { add: 600000, when: function (c) { return c.form === 'credenza' || c.form === 'u'; } })] }
        ] }),

      /* ---------------- MEJA RESEPSIONIS */
      O('reception', 'Meja resepsionis', 'Reception desk', { s: 'Resepsionis', base: 12000000, dims: { w: [120, 400, 10, 240], d: [60, 90, 1, 70], h: [100, 120, 1, 110] }, tableH: true,
        def: { plan: 'straight', face: 'fluted', ada: 'none', plinth: 'recessed', topMat: 'stone', wood: 'oak', stone: 'travertine', panel: 'ivory', metal: 'brass', body: 'same', edge: 'eased', thick: 4, retL: 140 },
        groups: [
          { id: 'plan', step: 'bentuk', type: 'chips', l: 'Denah', en: 'Plan', opts: [O('straight', 'Lurus', 'Straight'), O('lleft', 'L — sisi kiri', 'L — return left', { s: 'L kiri', se: 'L left', f: 1.4 }),
            O('lright', 'L — sisi kanan', 'L — return right', { s: 'L kanan', se: 'L right', f: 1.4 }), O('curved', 'Lengkung', 'Curved', { f: 1.5 })] },
          { id: 'face', step: 'bentuk', type: 'chips', l: 'Muka depan', en: 'Front finish', opts: [O('plain', 'Polos', 'Plain'), O('fluted', 'Fluted', 'Fluted', { f: 1.1 }), O('slats', 'Bilah kayu', 'Wood slats', { f: 1.08 }),
            O('stone', 'Batu / marmer', 'Stone cladding', { s: 'Batu', se: 'Stone', f: 1.25 }), O('led', 'Panel logo LED', 'Backlit LED logo', { s: 'Logo LED', se: 'LED logo', add: 3500000 })] },
          { id: 'ada', step: 'bentuk', type: 'chips', l: 'Area rendah (kursi roda)', en: 'Accessible low section', off: 'none', when: function (c) { return c.plan !== 'curved' && (+c.w || 240) >= 180; }, opts: [O('none', 'Tanpa', 'None'),
            O('left', 'Ujung kiri', 'Left end', { s: 'Kiri', se: 'Left', add: 1500000, when: function (c) { return c.plan !== 'lleft'; } }), O('right', 'Ujung kanan', 'Right end', { s: 'Kanan', se: 'Right', add: 1500000, when: function (c) { return c.plan !== 'lright'; } })] },
          { id: 'plinth', step: 'bentuk', type: 'chips', l: 'Plinth bawah', en: 'Base plinth', opts: [O('recessed', 'Plinth mundur', 'Recessed plinth', { s: 'Mundur', se: 'Recessed' }),
            O('float', 'Melayang + LED', 'Floating + LED', { s: 'Melayang LED', se: 'Floating LED', add: 1200000 }), O('metal', 'List logam', 'Metal kick strip', { s: 'List logam', se: 'Metal strip', add: 800000 })] },
          g('w', { l: 'Panjang depan', en: 'Front length' }), g('d', { l: 'Kedalaman meja kerja', en: 'Worktop depth' }), RET(80, 240, function (c) { return c.plan === 'lleft' || c.plan === 'lright'; }), g('h', { l: 'Tinggi counter', en: 'Counter height' }), g('thick'),
          topMat([TOPS.stone(1.4), TOPS.wood(1.2), TOPS.veneer(), TOPS.hpl(.88), TOPS.duco()]),
          woodG(function (c) { return !bodyPaint(c) || /^(fluted|slats)$/.test(c.face); }), stoneG(), panelG(), bodyG(),
          g('metal', { l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(1.3),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('logo', 'Logo kuningan 3D', 'Brass 3D logo', { s: 'Logo kuningan', se: 'Brass logo', add: 2500000, when: function (c) { return c.face !== 'led'; } }),
            O('ledTop', 'LED bawah ledge', 'Under-ledge LED', { s: 'LED ledge', se: 'Ledge LED', add: 900000 }), O('lock', 'Laci berkunci', 'Lockable drawers', { s: 'Kunci laci', se: 'Lockable', add: 300000 }),
            O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }), O('cable', 'Tray & lubang kabel', 'Cable tray & grommet', { s: 'Tray kabel', se: 'Cable tray', add: 450000 })] }
        ] }),

      /* ---------------- MEJA RIAS */
      O('vanity', 'Meja rias', 'Vanity table', { base: 2800000, dims: { w: [70, 160, 5, 100], d: [38, 55, 1, 45], h: [72, 78, 1, 75] }, tableH: true,
        def: { mount: 'legs', topShape: 'rect', mirror: 'round', legStyle: 'tapered', baseMat: 'wood', drawers: 2, stool: 'round', stoolC: 'cream', topMat: 'duco', wood: 'oak', stone: 'carrara', panel: 'ivory', metal: 'champagne', body: 'same', edge: 'eased', thick: 2.5 },
        groups: [
          { id: 'mount', step: 'bentuk', type: 'chips', l: 'Konstruksi', en: 'Construction', opts: [O('legs', 'Berkaki', 'On legs'),
            O('pedestal', 'Kabinet laci 2 sisi', 'Twin drawer cabinets', { s: 'Kabinet laci', se: 'Drawer cabinets', f: 1.35, when: function (c) { return (+c.w || 100) >= 110; } }),
            O('wall', 'Gantung dinding', 'Wall-hung', { s: 'Gantung', se: 'Wall-hung', f: .92 })] },
          topShape([SHP.rect(), SHP.softrect(), SHP.capsule({ f: 1.05 })]),
          legStyle(function (c) { return c.mount === 'legs'; }, .5),
          { id: 'mirror', step: 'bentuk', type: 'chips', l: 'Cermin', en: 'Mirror', opts: [O('none', 'Tanpa', 'None', { f: .92 }), O('round', 'Bulat', 'Round'), O('arch', 'Lengkung (arch)', 'Arched', { s: 'Arch', add: 150000 }),
            O('rect', 'Persegi (putar)', 'Swivel rectangle', { s: 'Persegi', se: 'Rectangle' }), O('ledring', 'Bulat LED', 'LED ring', { add: 650000 }),
            O('hollywood', 'Hollywood (bohlam)', 'Hollywood bulbs', { s: 'Hollywood', se: 'Hollywood', add: 1100000 }), O('trifold', 'Lipat 3', 'Tri-fold', { add: 450000 })] },
          { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci atas', en: 'Top drawers', unit: 'pcs', min: 0, max: 3, inc: 1, addEach: 300000 },
          W(), g('d'), g('h'), g('thick'),
          topMat([TOPS.duco(1), TOPS.wood(1.2), TOPS.veneer(), TOPS.hpl(.88), TOPS.stone(1.45)]),
          woodG(function (c) { return !bodyPaint(c) && !/^(hpl|duco)$/.test(c.topMat); }), stoneG(), panelG(), bodyG(),
          baseMat([BM.wood(), BM.metal()], function (c) { return c.mount === 'legs'; }),
          g('metal', { l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          edgeG(.6),
          { id: 'stool', step: 'detail', type: 'chips', l: 'Stool pasangan', en: 'Matching stool', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('round', 'Stool bulat', 'Round stool', { add: 950000 }), O('bench', 'Bangku empuk', 'Upholstered bench', { s: 'Bangku', se: 'Bench', add: 1300000 })] },
          { id: 'stoolC', step: 'detail', type: 'swatch', l: 'Kain stool (bouclé)', en: 'Stool fabric (bouclé)', when: function (c) { return c.stool && c.stool !== 'none'; }, opts: [
            O('cream', 'Cream', 'Cream', { hex: '#e6dfd2' }), O('oat', 'Oat', 'Oat', { hex: '#cfc3ad' }), O('blush', 'Blush', 'Blush', { hex: '#d8b4a8' }), O('sage', 'Sage', 'Sage', { hex: '#a3ad96' }), O('charcoal', 'Charcoal', 'Charcoal', { hex: '#4a4643' })] },
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('flip', 'Flip-top bercermin', 'Mirrored flip-top', { s: 'Flip-top', se: 'Flip-top', add: 1100000, when: function (c) { return +c.drawers <= 2 && c.topMat !== 'stone'; } }),
            O('jewelry', 'Sekat perhiasan', 'Jewellery insert', { s: 'Sekat perhiasan', se: 'Jewellery tray', add: 350000, when: function (c) { return +c.drawers > 0 || c.mount === 'pedestal'; } }),
            O('led', 'LED bawah meja', 'Under-top LED', { s: 'LED bawah', se: 'LED strip', add: 400000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { s: 'Stopkontak', se: 'Power socket', add: 650000 }),
            O('lock', 'Laci berkunci', 'Lockable drawer', { s: 'Kunci laci', se: 'Lockable', add: 200000, when: function (c) { return +c.drawers > 0 || c.mount === 'pedestal'; } })] }
        ] })
    ] })
  );

  /* urutan panel: dari yang terpenting, yang berkaitan bersebelahan (app.js memakai cat.plan) */
  cat.plan = [
    ['bentuk', [['Bentuk & tata letak', 'Form & layout'], ['seats', 'pieces', 'form', 'layout', 'plan', 'side', 'topShape']],
               [['Kaki & penopang', 'Legs & support'], ['base', 'frame', 'mount', 'legStyle', 'footrest', 'plinth']],
               [['Laci & penyimpanan', 'Drawers & storage'], ['pedestal', 'pedType', 'pedDrawers', 'drawers', 'face', 'islandBody', 'hutch', 'tower', 'mped']],
               [['Panel & cermin', 'Panels & mirror'], ['front', 'screen', 'ada', 'mirror']]],
    ['ukuran', [null, ['w', 'd', 'dia', 'retL', 'h', 'thick']]],
    // kayu / batu / warna HPL dipakai bersama beberapa bagian → ditempatkan otomatis di bawah bagian yang memakainya (app.js CZ_SHARED)
    ['material', [['Daun meja', 'Table top'], ['topMat', 'inlay']],
                 [['Kaki & penopang', 'Legs & base'], ['baseMat', 'metal']],
                 [['Badan & laci', 'Body & drawers'], ['body']],
                 [['Kayu, batu & warna', 'Wood, stone & colour'], ['wood', 'stone', 'panel']]],
    ['detail', [['Tepi & tampilan', 'Edge & display'], ['edge', 'tableware']],
               [['Tambahan', 'Extras'], ['stool', 'stoolC', 'extras']]]
  ];

  XC.defineCat(cat);

  /* migrasi konfigurasi lama (rancangan tersimpan / tas / Customize terakhir)
       coffee topShape nesting → sub nesting · desk topShape lshape → layout lright · desk executive → pedestal kanan (berdiri)
       dining base v → x · console base pedestal → pillar */
  XC.addMigrate('meja', function (c) {
    if (c.sub === 'coffee' && c.topShape === 'nesting') {
      c.sub = 'nesting'; c.topShape = 'round'; if (c.pieces == null) c.pieces = '2';
      if (c.dia == null) c.dia = 60; if (c.base && !/^(legs|sled|pedestal|drum)$/.test(c.base)) c.base = c.base === 'legs4' ? 'legs' : c.base === 'x' ? 'sled' : 'pedestal';
      if (c.extras) c.extras = [];
    }
    if (c.sub === 'desk') {
      if (c.topShape === 'lshape') { c.topShape = 'rect'; c.layout = 'lright'; }
      else if (c.topShape === 'executive') { c.topShape = 'rect'; if (c.layout == null) c.layout = 'straight'; c.pedestal = 'right'; c.pedType = 'floor'; if (c.pedDrawers == null) c.pedDrawers = '3'; }
    }
    if (c.sub === 'dining' && c.base === 'v') c.base = 'x';
    if (c.sub === 'console' && c.base === 'pedestal') c.base = 'pillar';
    return c;
  });
})();
