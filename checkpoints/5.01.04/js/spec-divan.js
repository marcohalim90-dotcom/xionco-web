/* ==========================================================================
   Maison XIONCO — spesifikasi Customize: Divan & tempat tidur
   Didaftarkan ke XC lewat XC.defineCat (custom-spec.js harus dimuat lebih dulu).
   K = alat bersama (O, M, g, G, material, dll.) dari custom-spec.js.

   Sub-kategori:
     divan · platform · headboard  — bed: true (harga per ukuran kasur otomatis, ukuran = "<kasur> × 200 cm")
     canopy · bunk · loft · trundle · daybed · kids — kelompok sendiri; harga ukuran kasur = tambahan pilihan;
       ukuran keseluruhan (w/d/h untuk garis ukur & ringkasan) dihitung geom() lewat XC.addMigrate.
   window.XDIVAN.geom(c) dipakai juga oleh mk-divan.js agar 3D & angka ukuran selalu sama.
   ========================================================================== */
(function () {
  'use strict';
  var XC = window.XC, K = XC.K;
  var O = K.O, M = K.M, g = K.g, has = K.has, PANEL = K.PANEL;
  var isSub = function (re) { return function (c) { return re.test(c.sub); }; };
  var not = function (fn) { return function (c) { return !fn(c); }; };

  /* ------------------------------------------------------------------ ukuran kasur */
  // id → [lebar, panjang] cm
  var MATS = { 60: [60, 120], 70: [70, 140], 90: [90, 200], 100: [100, 200], 120: [120, 200], 140: [140, 200], 160: [160, 200], 180: [180, 200], 200: [200, 200] };
  var MATL = {
    60: ['60 × 120 (box bayi)', '60 × 120 (crib)', '60 × 120'], 70: ['70 × 140 (balita)', '70 × 140 (toddler)', '70 × 140'],
    90: ['90 × 200 (single)', '90 × 200 (single)', '90 × 200'], 100: ['100 × 200', '100 × 200'], 120: ['120 × 200 (double)', '120 × 200 (double)', '120 × 200'],
    140: ['140 × 200', '140 × 200'], 160: ['160 × 200 (queen)', '160 × 200 (queen)', '160 × 200'], 180: ['180 × 200 (king)', '180 × 200 (king)', '180 × 200'],
    200: ['200 × 200 (super king)', '200 × 200 (super king)', '200 × 200']
  };
  function matOpt(id, extra) { var t = MATL[id], o = O(String(id), t[0], t[1], extra); if (t[2]) { o.s = t[2]; o.se = t[2]; } return o; }
  // kelompok kasur: adds = { id: tambahan IDR } (sub non-bed) atau null (sub bed: harga otomatis)
  function matGroup(ids, adds, over) {
    var gr = { id: 'mattress', step: 'ukuran', type: 'chips', l: 'Ukuran kasur', en: 'Mattress size', opts: ids.map(function (id) { return matOpt(id, adds && adds[id] ? { add: adds[id] } : null); }) };
    if (over) for (var k in over) gr[k] = over[k];
    return gr;
  }
  var range = function (id, l, en, min, max, inc, extra) { var o = { id: id, step: 'ukuran', type: 'range', l: l, en: en, unit: 'cm', min: min, max: max, inc: inc }; if (extra) for (var k in extra) o[k] = extra[k]; return o; };
  var panelG = function (when) { return { id: 'panel', step: 'material', type: 'swatch', l: 'Warna cat', en: 'Paint colour', opts: PANEL, when: when }; };

  /* ------------------------------------------------------------------ headboard */
  var UPH_HB = /^(panel|channel|channelH|button|wingback|arch|cloud)$/;
  function hbOpts(scale) {
    var a = function (v) { return Math.round(v * (scale || 1) / 5000) * 5000; };
    return [
      O('none', 'Tanpa headboard', 'No headboard', { f: .75, se: 'None', when: function (c) { return c.sub !== 'headboard'; } }), O('panel', 'Panel polos', 'Plain panel'),
      O('channel', 'Channel tufting vertikal', 'Vertical channel tufting', { s: 'Channel tegak', se: 'Channel vert.', add: a(500000) }),
      O('channelH', 'Channel tufting horizontal', 'Horizontal channel tufting', { s: 'Channel datar', se: 'Channel horiz.', add: a(550000) }),
      O('button', 'Button tufting', 'Button tufted', { add: a(450000) }), O('wingback', 'Wingback', 'Wingback', { add: a(700000) }),
      O('arch', 'Melengkung (arch)', 'Arched', { s: 'Lengkung', add: a(400000) }), O('cloud', 'Awan / scallop', 'Cloud / scallop', { add: a(600000) }),
      O('woodpanel', 'Panel kayu', 'Wood panel'), O('slat', 'Slat kayu', 'Wood slats', { add: a(300000) }),
      O('cane', 'Bingkai kayu + rotan cane', 'Wood frame + cane', { s: 'Rotan cane', se: 'Cane panel', add: a(650000) })
    ];
  }

  /* ------------------------------------------------------------------ divan · platform · headboard saja */
  function bedGroups() {
    return [
      matGroup([90, 100, 120, 140, 160, 180, 200], null),
      g('h', { l: 'Tinggi divan (tanpa kasur)', en: 'Base height (without mattress)', when: function (c) { return c.sub !== 'headboard'; } }),
      { id: 'hbH', step: 'ukuran', type: 'range', l: 'Tinggi headboard (dari lantai)', en: 'Headboard height (from floor)', unit: 'cm', min: 80, max: 160, inc: 5, when: function (c) { return c.headboard !== 'none'; } },
      { id: 'headboard', step: 'bentuk', type: 'chips', l: 'Model headboard', en: 'Headboard style', opts: hbOpts() },
      { id: 'hbW', step: 'bentuk', type: 'chips', l: 'Lebar headboard', en: 'Headboard width', opts: [O('fit', 'Sesuai kasur', 'Fits the bed'),
        O('wide', 'Lebar + panel samping', 'Extended with side panels', { s: 'Lebar + samping', se: 'Extended', add: 1500000 }),
        O('wall', 'Panel dinding + nakas melayang', 'Wall panel + floating tables', { s: 'Panel dinding', se: 'Wall panel', add: 3200000 })], when: function (c) { return c.headboard !== 'none'; } },
      { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', opts: [O('none', 'Tanpa', 'None'), O('d2', '2 laci', '2 drawers', { add: 900000 }), O('d4', '4 laci', '4 drawers', { add: 1600000 }),
        O('lift', 'Hidrolik (angkat)', 'Hydraulic lift-up', { s: 'Hidrolik', se: 'Lift-up', add: 2200000 })], when: function (c) { return c.sub === 'divan'; } },
      g('uph', { l: 'Kain divan & headboard', en: 'Bed & headboard fabric' }), g('color'),
      g('wood', { when: function (c) { return c.sub === 'platform' || /^(woodpanel|slat|cane)$/.test(c.headboard) || (c.mount === 'legs' && c.legFinish === 'wood') || c.hbW === 'wall' || has(c, 'extras', 'nightstand') || has(c, 'extras', 'bench'); } }),
      { id: 'mount', step: 'detail', type: 'chips', l: 'Dasar', en: 'Base', opts: [O('plinth', 'Plinth tertutup', 'Closed plinth'), O('legs', 'Berkaki', 'On legs'), O('floating', 'Melayang + LED', 'Floating + LED glow', { se: 'Floating + LED', add: 650000 })], when: function (c) { return c.sub !== 'headboard'; } },
      { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Kayu tapered', 'Tapered wood'), O('block', 'Blok', 'Block'), O('round', 'Besi bulat', 'Round metal')], when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } },
      g('legH', { min: 6, max: 20, when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } }),
      g('legFinish', { when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } }),
      g('metal', { when: function (c) { return c.mount === 'legs' && c.legFinish === 'metal' && c.sub !== 'headboard'; } }),
      { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('bench', 'Bench ujung kasur', 'End-of-bed bench', { s: 'Bench ujung', se: 'End bench', add: 1400000 }),
        O('nightstand', 'Nakas pasangan (×2)', 'Matching nightstands (×2)', { s: 'Nakas ×2', se: 'Nightstands ×2', add: 2200000, when: function (c) { return c.hbW !== 'wall' || c.headboard === 'none'; } }),
        O('readlamp', 'Lampu baca di headboard', 'Headboard reading lights', { s: 'Lampu baca', se: 'Reading lights', add: 600000 }), O('usb', 'Port USB / VAZRA', 'USB / VAZRA ports', { s: 'USB / VAZRA', se: 'USB / VAZRA', add: 450000 }),
        O('mattressinc', 'Termasuk kasur', 'Mattress included', { se: 'With mattress', add: 3500000 })] }
    ];
  }

  /* ------------------------------------------------------------------ kelompok bersama sub baru */
  var FRAME = function (opts) { return { id: 'frame', step: 'bentuk', type: 'chips', l: 'Rangka', en: 'Frame', opts: opts }; };
  var frWood = O('wood', 'Kayu solid', 'Solid wood'), frPaint = O('painted', 'Kayu dicat (duco)', 'Painted wood', { s: 'Kayu dicat', f: 1.06 }), frMetal = O('metal', 'Rangka besi', 'Metal frame', { f: .8 });
  var stairsOk = function (c) { return c.layout !== 'triple'; };
  var ACCESS = function (stairAdd) {
    return { id: 'access', step: 'bentuk', type: 'chips', l: 'Akses ke atas', en: 'Access', opts: [
      O('ladder', 'Tangga lurus', 'Straight ladder'), O('angled', 'Tangga miring', 'Angled ladder', { add: 250000 }),
      O('stairsL', 'Tangga laci di kiri', 'Storage stairs, left', { s: 'Tangga laci kiri', se: 'Stairs left', add: stairAdd }),
      O('stairsR', 'Tangga laci di kanan', 'Storage stairs, right', { s: 'Tangga laci kanan', se: 'Stairs right', add: stairAdd, when: stairsOk })] };
  };
  // label kartu ≤ 15 huruf
  ACCESS.fix = function (gr) { gr.opts[2].s = 'Tangga kiri'; gr.opts[3].s = 'Tangga kanan'; return gr; };
  var RAIL = function (when) {
    return { id: 'rail', step: 'bentuk', type: 'chips', l: 'Pagar pengaman', en: 'Guard rail', opts: [O('bars', 'Palang datar', 'Horizontal bars', { se: 'Bars' }), O('spindle', 'Jeruji tegak', 'Spindles', { add: 450000 }), O('panel', 'Panel penuh', 'Solid panel', { add: 300000 })], when: when };
  };
  var woodWhen = function (c) { return c.frame === 'wood'; };
  var paintWhen = function (c) { return c.frame === 'painted'; };
  var metalWhen = function (c) { return c.frame === 'metal'; };

  /* ------------------------------------------------------------------ GEOMETRI (meter) — dipakai 3D (mk-divan.js) & garis ukur */
  var cmv = function (v, d) { v = +v; return (isNaN(v) || !v ? d : v) / 100; };
  function matDims(id) { var m = MATS[+id] || MATS[90]; return [m[0] / 100, m[1] / 100]; }
  function postT(c) { return c.frame === 'metal' ? .045 : .065; }
  // tangga miring: jarak datar kaki tangga dari muka rangka
  function angledRun(yTop, need) { return Math.max(yTop * .31, need || 0); }
  function geom(c) {
    var s = c.sub, r = { sub: s };
    if (s === 'bunk' || s === 'loft') {
      var pt = postT(c), md = matDims(c.mattress), MW = md[0], ML = 2, H = cmv(c.h, s === 'bunk' ? 170 : 185);
      var L = ML + .02 + 2 * pt, W1 = MW + .02 + 2 * pt, lay = s === 'bunk' ? c.layout || 'twin' : 'loft';
      var MB = lay === 'twinFull' ? matDims(c.bottom)[0] : MW, W2 = s === 'bunk' ? MB + .02 + 2 * pt : W1;
      var yd1 = H - .40, yd0 = c.under === 'trundle' ? .40 : c.under === 'drawers' ? .36 : .30;
      var zb = -W2 / 2, zf1 = zb + W1, zf2 = zb + W2, acc = c.access || 'ladder', sw = .5;
      if (lay === 'triple' && acc === 'stairsR') acc = 'stairsL';
      var x0 = -L / 2, x1 = L / 2, z0 = zb, z1 = zf2;
      if (acc === 'stairsL') x0 -= sw; if (acc === 'stairsR') x1 += sw;
      var run = 0, lad = null;
      if (acc === 'ladder') {
        if (lay === 'twinFull') { lad = { kind: 'end', x: L / 2, z: zb + W1 / 2 + .02 }; x1 = Math.max(x1, L / 2 + .04); }
        else { lad = { kind: 'front', x: L / 2 - pt - .32, z: zf1 }; z1 = Math.max(z1, zf1 + .04); }
      } else if (acc === 'angled') {
        var ytop = yd1 + .05, ylow = yd0 + .3, need = lay === 'twinFull' ? (zf2 + .04 - zf1) / (1 - ylow / ytop) : 0;
        run = angledRun(ytop, need); lad = { kind: 'angled', x: L / 2 - pt - .34, z: zf1, run: run }; z1 = Math.max(z1, zf1 + run + .03);
      }
      if (lay === 'triple') { x1 = Math.max(x1, L / 2 - pt + W1); z1 = Math.max(z1, zb + L + .04); }
      if (s === 'bunk' ? has(c, 'extras', 'curtain') : has(c, 'extras', 'curtain') && c.below !== 'wardrobe') z1 = Math.max(z1, zf1 + .06);
      r = { sub: s, lay: lay, pt: pt, MW: MW, MB: MB, ML: ML, L: L, W1: W1, W2: W2, H: H, yd0: yd0, yd1: yd1, zb: zb, zf1: zf1, zf2: zf2, acc: acc, sw: sw, lad: lad, run: run, x0: x0, x1: x1, z0: z0, z1: z1 };
    } else if (s === 'trundle') {
      var tm = matDims(c.mattress), st = c.style || 'daybed', tH = cmv(c.h, 85), aT = .15, bT = .17, tw = .05;
      if (st === 'daybed') r = { L: tm[1] + .02 + 2 * aT, W: tm[0] + .04 + bT, aT: aT, bT: bT };
      else if (st === 'wood') r = { L: tm[1] + .02 + 2 * tw, W: tm[0] + .02 + 2 * tw, pt: tw };
      else r = { L: tm[1] + .04 + .08, W: tm[0] + .04, hbT: .08 };
      r.sub = s; r.style = st; r.MW = tm[0]; r.ML = tm[1]; r.H = tH; r.deck = .40;
      r.x0 = -r.L / 2; r.x1 = r.L / 2; r.z0 = -r.W / 2; r.z1 = r.W / 2;
    } else if (s === 'daybed') {
      var dm = matDims(c.mattress), fr = c.frame || 'uph', sd = c.sides || 'three', back = /^(three|back)$/.test(sd), ends = /^(three|ends)$/.test(sd), dH = cmv(c.backH, 75);
      if (fr === 'uph') { var at = ends ? .15 : 0, bt = back ? .17 : 0; r = { L: dm[1] + .02 + 2 * at, W: dm[0] + .02 + bt + .02, aT: at, bT: bt }; }
      else { var p2 = fr === 'metal' ? .032 : .05; r = { L: dm[1] + .02 + 2 * p2, W: dm[0] + .02 + 2 * p2, pt: p2 }; }
      r.sub = s; r.frame = fr; r.sides = sd; r.back = back; r.ends = ends; r.MW = dm[0]; r.ML = dm[1];
      r.legH = fr === 'uph' ? (c.leg === 'plinth' ? .08 : cmv(c.legH, 14)) : .22;
      r.deck = fr === 'uph' ? r.legH + .18 : .30;   // atas deck (kasur di atasnya)
      r.top = r.deck + .16;
      r.H = sd === 'open' ? r.top + (+c.bolsters > 0 ? .17 : .02) : Math.max(dH, r.top + .12);
      r.x0 = -r.L / 2; r.x1 = r.L / 2; r.z0 = -r.W / 2; r.z1 = r.W / 2;
    } else if (s === 'canopy') {
      var cmm = matDims(c.mattress), cp = c.post === 'metal' ? .04 : c.post === 'turned' ? .09 : .08, W0 = cmm[0] + .02, L0 = 2.02;
      r = { sub: s, MW: cmm[0], ML: 2, W0: W0, L0: L0, pt: cp, W: W0 + 2 * cp, D: L0 + 2 * cp, H: cmv(c.h, 210), deck: .30 };
      var hbHalf = { channel: .052, button: .045, panel: .04, woodpanel: .02, cane: .021 }[c.headboard] || .04, ext = (c.drape === 'corners' || c.drape === 'full') && c.canopy !== 'posts' ? .03 : 0;
      r.x0 = -r.W / 2 - ext; r.x1 = r.W / 2 + ext; r.z0 = -(L0 / 2 + cp / 2 + Math.max(cp / 2, hbHalf)); r.z1 = r.D / 2;
      if (has(c, 'extras', 'nightstand')) { r.x0 = Math.min(r.x0, -(r.W / 2 + .52)); r.x1 = Math.max(r.x1, r.W / 2 + .52); }
      if (has(c, 'extras', 'bench')) r.z1 = Math.max(r.z1, r.D / 2 + .51);
    } else if (s === 'kids') {
      var ks = c.style || 'house', km = matDims(ks === 'crib' ? (+c.mattress <= 70 ? c.mattress : 60) : c.mattress), kp = ks === 'crib' ? .045 : .05;
      r = { sub: s, style: ks, MW: km[0], ML: km[1], pt: kp };
      if (ks === 'rounded' || ks === 'scallop') {
        r.W = km[0] + .1; r.D = km[1] + .08 + .07; r.H = ks === 'rounded' ? 1.0 : .92; r.deck = c.under === 'trundle' ? .36 : .32;
        r.x0 = -r.W / 2; r.x1 = r.W / 2; r.z0 = -r.D / 2; r.z1 = r.D / 2;
      } else {
        r.L = km[1] + .02 + 2 * kp; r.W = km[0] + .02 + 2 * kp;
        if (ks === 'crib') { r.deck = .32; r.H = has(c, 'extras', 'drape') ? .92 + .57 : .92; }
        else {
          var raised = ks === 'house';
          r.deck = raised ? (c.under === 'trundle' ? .38 : c.under === 'drawers' ? .34 : .28) : .12;
          r.roof = c.roof !== 'none';
          r.eave = raised ? 1.30 : 1.18; r.ridge = r.eave + r.W * .42;
          r.H = r.roof ? r.ridge : r.deck + .42;
        }
        r.x0 = -r.L / 2; r.x1 = r.L / 2; r.z0 = -r.W / 2; r.z1 = r.W / 2;
        if (ks !== 'crib' && r.roof && has(c, 'extras', 'drape')) { r.z0 -= .035; r.z1 += .035; }
        if (ks === 'crib' && has(c, 'extras', 'drape')) { r.x0 -= .5 - kp / 2; r.z0 = Math.min(r.z0, -.5); r.z1 = Math.max(r.z1, .5); }
      }
    }
    return r;
  }
  // ukuran keseluruhan (cm) untuk sub non-bed — h hanya diisi bila bukan kelompok rentang sub itu
  var GEO_SUBS = /^(canopy|bunk|loft|trundle|daybed|kids)$/;
  // salinan konfigurasi dengan pilihan yang tidak tersedia diganti seperti XC.fix (fix dijalankan sesudah migrasi)
  function resolve(s, d) {
    for (var pass = 0; pass < 4; pass++) s.groups.forEach(function (gr) {
      if (gr.type === 'range') { if (d[gr.id] != null) d[gr.id] = Math.min(gr.max, Math.max(gr.min, +d[gr.id])); return; }
      if (!XC.visible(gr, d)) { if (gr.off != null) d[gr.id] = gr.off; return; }
      var list = XC.opts(gr, d);
      if (gr.type === 'multi') { var ok = list.map(function (o) { return o.id; }); d[gr.id] = (d[gr.id] || []).filter(function (x) { return ok.indexOf(x) >= 0; }); }
      else if (gr.type === 'chips' && !list.some(function (o) { return o.id === d[gr.id]; }) && list[0]) d[gr.id] = list[0].id;
    });
    return d;
  }
  function syncDims(c) {
    if (!c || c.cat !== 'divan' || !GEO_SUBS.test(c.sub || '')) return c;
    var s = XC.sub(c); if (!s || s.id !== c.sub) return c;
    var d = {}, k; for (k in s.def) d[k] = s.def[k];
    for (k in c) if (c[k] !== undefined) d[k] = c[k];
    resolve(s, d);
    var r = geom(d), w = Math.round((r.x1 - r.x0) * 100), dd = Math.round((r.z1 - r.z0) * 100), h = Math.round(r.H * 100);
    if (isFinite(w)) c.w = w; if (isFinite(dd)) c.d = dd;
    if (!s.groups.some(function (x) { return x.id === 'h' && (!x.when || x.when(d)); }) && isFinite(h)) c.h = h;
    return c;
  }

  /* ------------------------------------------------------------------ sub-kategori */
  var bunkTwinFull = function (c) { return c.layout === 'twinFull'; };
  var cat = (
    O('divan', 'Divan & tempat tidur', 'Divans & beds', { s: 'Divan & ranjang', se: 'Beds', subs: [
      O('divan', 'Divan', 'Divan base', { base: 2400000, bed: true, dims: { h: [20, 45, 1, 30] },
        def: { mattress: '160', storage: 'none', headboard: 'channel', hbH: 110, hbW: 'fit', uph: 'vienna', color: 'midgrey', mount: 'plinth', leg: 'plinth', legH: 10, legFinish: 'wood', wood: 'walnut', metal: 'black', extras: [] },
        groups: bedGroups() }),
      O('platform', 'Platform bed (rangka kayu)', 'Platform bed (wood frame)', { s: 'Platform bed', se: 'Platform bed', base: 3100000, bed: true, platform: true, dims: { h: [15, 40, 1, 25] },
        def: { mattress: '160', storage: 'none', headboard: 'woodpanel', hbH: 95, hbW: 'fit', uph: 'linen', color: 'natural', mount: 'legs', leg: 'tapered', legH: 12, legFinish: 'wood', wood: 'oak', metal: 'black', extras: [] },
        groups: bedGroups() }),
      O('headboard', 'Headboard saja', 'Headboard only', { base: 1300000, bed: true, hbOnly: true, dims: { h: [20, 45, 1, 30] },
        def: { mattress: '160', storage: 'none', headboard: 'button', hbH: 120, hbW: 'fit', uph: 'velvet', color: 'navy', mount: 'plinth', leg: 'plinth', legH: 10, legFinish: 'wood', wood: 'walnut', metal: 'brass', extras: [] },
        groups: bedGroups() }),

      // kanopi / four-poster
      O('canopy', 'Kanopi / four-poster', 'Canopy / four-poster', { s: 'Kanopi', se: 'Canopy bed', base: 7400000, dims: { h: [140, 240, 5, 210], hbH: [90, 150, 5, 120] },
        def: { mattress: '160', post: 'square', canopy: 'frame', headboard: 'panel', foot: 'none', drape: 'none', uph: 'linen', color: 'sand', wood: 'walnut', metal: 'brass', extras: [] },
        groups: [
          matGroup([120, 140, 160, 180, 200], { 120: -900000, 140: -450000, 180: 700000, 200: 1300000 }),
          range('h', 'Tinggi tiang', 'Post height', 140, 240, 5),
          range('hbH', 'Tinggi headboard', 'Headboard height', 90, 150, 5),
          { id: 'post', step: 'bentuk', type: 'chips', l: 'Model tiang', en: 'Post style', opts: [O('square', 'Tiang kotak', 'Square posts'), O('turned', 'Tiang bubut', 'Turned posts', { add: 900000 }), O('metal', 'Besi ramping', 'Slim metal', { f: .82 })] },
          { id: 'canopy', step: 'bentuk', type: 'chips', l: 'Kanopi', en: 'Canopy', opts: [O('frame', 'Rangka kanopi', 'Canopy frame'), O('posts', 'Tiang saja', 'Posts only', { f: .85 }),
            O('arched', 'Kanopi lengkung', 'Arched canopy', { add: 900000, when: function (c) { return c.post === 'metal'; } })] },
          { id: 'headboard', step: 'bentuk', type: 'chips', l: 'Headboard', en: 'Headboard', opts: [O('panel', 'Panel berlapis', 'Upholstered panel', { se: 'Upholstered' }),
            O('channel', 'Channel tegak', 'Vertical channel', { se: 'Channel vert.', add: 650000 }), O('button', 'Button tufting', 'Button tufted', { add: 550000 }),
            O('woodpanel', 'Panel kayu', 'Wood panel'), O('cane', 'Rotan cane', 'Cane panel', { add: 750000 })] },
          { id: 'foot', step: 'bentuk', type: 'chips', l: 'Footboard', en: 'Footboard', opts: [O('none', 'Tanpa', 'None'), O('low', 'Footboard rendah', 'Low footboard', { s: 'Rendah', se: 'Low', add: 600000 })] },
          g('uph', { when: function (c) { return /^(panel|channel|button)$/.test(c.headboard); } }), g('color', { when: function (c) { return /^(panel|channel|button)$/.test(c.headboard); } }),
          g('wood', { when: function (c) { return c.post !== 'metal' || /^(woodpanel|cane)$/.test(c.headboard) || c.foot === 'low' || has(c, 'extras', 'nightstand'); } }),
          g('metal', { when: function (c) { return c.post === 'metal'; } }),
          { id: 'drape', step: 'detail', type: 'chips', l: 'Tirai & atap kain', en: 'Drapes & fabric top', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('top', 'Atap kain', 'Fabric top', { add: 900000 }),
            O('corners', 'Tirai sudut', 'Corner drapes', { add: 1600000 }), O('full', 'Tirai + atap', 'Drapes + top', { add: 2300000 })], when: function (c) { return c.canopy !== 'posts'; } },
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur', 'Mattress included', { se: 'With mattress', add: 3500000 }),
            O('nightstand', 'Nakas pasangan (×2)', 'Matching nightstands (×2)', { s: 'Nakas ×2', se: 'Nightstands ×2', add: 2200000 }), O('bench', 'Bench ujung kasur', 'End-of-bed bench', { s: 'Bench ujung', se: 'End bench', add: 1400000 }),
            O('led', 'LED di rangka kanopi', 'Canopy LED strip', { s: 'LED kanopi', se: 'Canopy LED', add: 750000, when: function (c) { return c.canopy === 'frame'; } })] }
        ] }),

      // ranjang susun
      O('bunk', 'Ranjang susun', 'Bunk bed', { base: 6500000, dims: { h: [150, 200, 5, 170] },
        def: { layout: 'twin', mattress: '90', bottom: '120', access: 'ladder', rail: 'bars', under: 'none', frame: 'wood', wood: 'oak', panel: 'ivory', metal: 'black', extras: [] },
        groups: [
          { id: 'layout', step: 'bentuk', type: 'chips', l: 'Susunan', en: 'Layout', opts: [O('twin', 'Single / single', 'Twin / twin'), O('twinFull', 'Single / double', 'Twin / full', { add: 1900000 }),
            O('triple', 'Susun 3 bentuk L', 'L-shaped triple', { s: 'Susun 3 (L)', se: 'L triple (3)', f: 1.65 })] },
          FRAME([frWood, frPaint, frMetal]),
          ACCESS.fix(ACCESS(2600000)), RAIL(),
          { id: 'under', step: 'bentuk', type: 'chips', l: 'Bawah ranjang', en: 'Under the bed', opts: [O('none', 'Tanpa', 'None'), O('drawers', '2 laci', '2 drawers', { add: 1300000 }), O('trundle', 'Ranjang sorong', 'Trundle bed', { add: 2200000 })] },
          matGroup([90, 100, 120], { 100: 250000, 120: 800000 }, { l: 'Kasur atas', en: 'Top mattress' }),
          { id: 'bottom', step: 'ukuran', type: 'chips', l: 'Kasur bawah', en: 'Bottom mattress', opts: [matOpt(120, { when: function (c) { return +c.mattress < 120; } }), matOpt(140, { add: 450000 }), matOpt(160, { add: 900000 })], when: bunkTwinFull },
          range('h', 'Tinggi total', 'Overall height', 150, 200, 5),
          g('wood', { when: woodWhen }), panelG(paintWhen), g('metal', { when: metalWhen }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur', 'Mattresses included', { se: 'With mattresses', add: 3400000 }),
            O('shelf', 'Rak kepala tiap tingkat', 'Bedside shelf per bunk', { s: 'Rak kepala', se: 'Bedside shelf', add: 450000 }), O('lamp', 'Lampu baca tiap tingkat', 'Reading light per bunk', { s: 'Lampu baca', se: 'Reading lights', add: 500000 }),
            O('curtain', 'Tirai tingkat bawah', 'Lower bunk curtain', { s: 'Tirai bawah', se: 'Lower curtain', add: 650000 })] }
        ] }),

      // loft bed
      O('loft', 'Loft bed', 'Loft bed', { base: 7200000, dims: { h: [150, 210, 5, 185] },
        def: { mattress: '90', below: 'desk', access: 'ladder', rail: 'bars', frame: 'wood', wood: 'oak', panel: 'ivory', metal: 'black', uph: 'linen', color: 'sand', extras: [] },
        groups: [
          { id: 'below', step: 'bentuk', type: 'chips', l: 'Di bawah ranjang', en: 'Underneath', opts: [O('desk', 'Meja belajar', 'Study desk', { add: 1600000 }), O('wardrobe', 'Lemari + rak', 'Wardrobe + shelves', { se: 'Wardrobe', add: 3200000 }),
            O('sofa', 'Sofa bawah', 'Sofa below', { add: 2600000 }), O('open', 'Terbuka', 'Open space', { f: .92 })] },
          FRAME([frWood, frPaint, frMetal]),
          ACCESS.fix(ACCESS(2400000)), RAIL(),
          matGroup([90, 100, 120, 140], { 100: 250000, 120: 800000, 140: 1300000 }),
          range('h', 'Tinggi total', 'Overall height', 150, 210, 5),
          g('wood', { when: function (c) { return c.frame === 'wood' || c.below === 'desk' || c.below === 'wardrobe'; } }), panelG(paintWhen), g('metal', { when: metalWhen }),
          g('uph', { l: 'Kain sofa', en: 'Sofa fabric', when: function (c) { return c.below === 'sofa'; } }), g('color', { when: function (c) { return c.below === 'sofa'; } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur', 'Mattress included', { se: 'With mattress', add: 1900000 }),
            O('shelf', 'Rak kepala', 'Bedside shelf', { add: 350000 }), O('led', 'LED di bawah ranjang', 'Under-deck LED', { s: 'LED bawah', se: 'Under LED', add: 550000 }),
            O('curtain', 'Tirai bawah', 'Curtain below', { add: 650000, when: function (c) { return c.below !== 'wardrobe'; } })] }
        ] }),

      // ranjang sorong (trundle)
      O('trundle', 'Ranjang sorong', 'Trundle bed', { base: 4200000, dims: { h: [78, 110, 1, 85] },
        def: { style: 'daybed', trundle: 'roll', arm: 'round', mattress: '90', uph: 'boucle', color: 'oat', wood: 'oak', pillows: 3, bolsters: 0, extras: [] },
        groups: [
          { id: 'style', step: 'bentuk', type: 'chips', l: 'Model', en: 'Style', opts: [O('daybed', 'Daybed berlapis kain', 'Upholstered daybed', { s: 'Daybed kain', se: 'Upholstered' }),
            O('wood', 'Daybed rangka kayu', 'Wood daybed', { s: 'Daybed kayu', f: 1.08 }), O('divan', 'Divan + headboard', 'Divan + headboard', { s: 'Divan', se: 'Divan', f: .92 })] },
          { id: 'trundle', step: 'bentuk', type: 'chips', l: 'Bagian sorong', en: 'Pull-out', opts: [O('roll', 'Ranjang sorong', 'Roll-out trundle', { se: 'Roll-out' }), O('popup', 'Pop-up (naik sejajar)', 'Pop-up trundle', { s: 'Pop-up', se: 'Pop-up', add: 900000 }),
            O('drawers', 'Laci saja', 'Storage drawers', { se: 'Drawers only', f: .9 })] },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: [O('track', 'Kotak', 'Track'), O('round', 'Bulat', 'Rounded', { add: 250000 }), O('slope', 'Miring', 'Sloped', { add: 250000 })], when: function (c) { return c.style === 'daybed'; } },
          matGroup([90, 100, 120], { 100: 250000, 120: 750000 }),
          range('h', 'Tinggi sandaran', 'Back height', 78, 110, 1),
          g('uph'), g('color'), g('wood', { when: function (c) { return c.style === 'wood'; } }),
          g('pillows', { when: function (c) { return c.style !== 'divan'; } }), g('bolsters', { when: function (c) { return c.style !== 'divan'; } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur (×2)', 'Mattresses included (×2)', { s: 'Termasuk kasur', se: 'With mattresses', add: 2600000 }),
            O('usb', 'Port USB / VAZRA', 'USB / VAZRA ports', { s: 'USB / VAZRA', se: 'USB / VAZRA', add: 450000 })] }
        ] }),

      // daybed
      O('daybed', 'Daybed', 'Daybed', { base: 3900000, dims: { backH: [70, 95, 1, 75], legH: [6, 18, 1, 14] },
        def: { frame: 'uph', sides: 'three', infill: 'cane', arm: 'track', top: 'button', mattress: '90', leg: 'tapered', legFinish: 'wood', uph: 'linen', color: 'natural', wood: 'walnut', metal: 'black', storage: 'none', bolsters: 2, pillows: 2, extras: [] },
        groups: [
          { id: 'frame', step: 'bentuk', type: 'chips', l: 'Rangka', en: 'Frame', opts: [O('uph', 'Berlapis kain', 'Upholstered'), O('wood', 'Rangka kayu', 'Wood frame', { f: 1.1 }), O('metal', 'Rangka besi', 'Metal frame', { f: 1.04 })] },
          { id: 'sides', step: 'bentuk', type: 'chips', l: 'Sandaran & sisi', en: 'Back & sides', opts: [O('three', '3 sisi', '3-sided', { add: 600000 }), O('back', 'Sandaran saja', 'Back only', { add: 300000 }),
            O('ends', 'Dua ujung', 'Two ends', { add: 300000 }), O('open', 'Terbuka', 'Open', { f: .85 })] },
          { id: 'infill', step: 'bentuk', type: 'chips', l: 'Isi panel sisi', en: 'Side panel infill', opts: [O('solid', 'Panel solid', 'Solid panel'), O('cane', 'Rotan cane', 'Cane', { add: 550000 }),
            O('spindle', 'Jeruji', 'Spindles', { add: 350000 }), O('pad', 'Pad kain', 'Upholstered pad', { se: 'Padded', add: 300000 })], when: function (c) { return c.frame !== 'uph' && c.sides !== 'open'; } },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: [O('track', 'Kotak', 'Track'), O('round', 'Bulat', 'Rounded', { add: 250000 }), O('slope', 'Miring', 'Sloped', { add: 250000 })], when: function (c) { return c.frame === 'uph' && /^(three|ends)$/.test(c.sides); } },
          { id: 'top', step: 'bentuk', type: 'chips', l: 'Permukaan kasur', en: 'Top surface', opts: [O('plain', 'Polos', 'Plain'), O('button', 'Kancing', 'Button tufted', { se: 'Button', add: 450000 }), O('biscuit', 'Biscuit', 'Biscuit', { add: 650000 })] },
          { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('drawers', '2 laci', '2 drawers', { add: 1100000 })], when: function (c) { return c.frame === 'uph' && c.leg === 'plinth'; } },
          matGroup([90, 100, 120], { 100: 250000, 120: 750000 }),
          range('backH', 'Tinggi sandaran', 'Back height', 70, 95, 1, { when: function (c) { return c.sides !== 'open'; } }),
          g('uph'), g('color'),
          g('wood', { when: function (c) { return c.frame === 'wood' || c.frame === 'uph' && c.leg !== 'plinth' && c.leg !== 'round' && c.legFinish === 'wood'; } }),
          g('metal', { when: function (c) { return c.frame === 'metal' || c.frame === 'uph' && (c.leg === 'round' || c.legFinish === 'metal' && c.leg !== 'plinth'); } }),
          { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Kayu tapered', 'Tapered wood'), O('block', 'Blok', 'Block'), O('round', 'Besi bulat', 'Round metal'), O('plinth', 'Plinth tertutup', 'Closed plinth')], when: function (c) { return c.frame === 'uph'; } },
          { id: 'legFinish', step: 'material', type: 'chips', l: 'Material kaki', en: 'Leg material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal')], when: function (c) { return c.frame === 'uph' && /^(tapered|block)$/.test(c.leg); } },
          g('legH', { min: 6, max: 18, when: function (c) { return c.frame === 'uph' && c.leg !== 'plinth'; } }),
          g('bolsters'), g('pillows', { when: function (c) { return c.sides !== 'open' && c.sides !== 'ends'; } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur', 'Mattress included', { se: 'With mattress', add: 1600000 })] }
        ] }),

      // ranjang anak
      O('kids', 'Ranjang anak', "Kids' bed", { base: 3200000,
        def: { style: 'house', roof: 'gable', rail: 'half', mattress: '90', under: 'none', frame: 'wood', wood: 'ash', panel: 'ivory', uph: 'velvet', color: 'blush', extras: [] },
        groups: [
          { id: 'style', step: 'bentuk', type: 'chips', l: 'Model', en: 'Style', opts: [O('house', 'Rumah (berkaki)', 'House bed', { s: 'Rumah' }), O('floor', 'Montessori lantai', 'Montessori floor', { s: 'Montessori', se: 'Floor bed', f: .85 }),
            O('crib', 'Box bayi', 'Baby crib', { f: .8 }), O('rounded', 'Lengkung berlapis kain', 'Rounded upholstered', { s: 'Lengkung kain', se: 'Rounded uph.' }),
            O('scallop', 'Scallop berlapis kain', 'Scalloped upholstered', { s: 'Scallop kain', se: 'Scalloped', add: 400000 })] },
          { id: 'roof', step: 'bentuk', type: 'chips', l: 'Atap', en: 'Roof', opts: [O('gable', 'Atap pelana', 'Gable roof'), O('none', 'Tanpa atap', 'No roof', { f: .85 })], when: function (c) { return /^(house|floor)$/.test(c.style); } },
          { id: 'rail', step: 'bentuk', type: 'chips', l: 'Pagar pengaman', en: 'Guard rail', opts: [O('none', 'Tanpa', 'None'), O('half', 'Pagar sebagian', 'Partial rails', { add: 450000 }), O('full', 'Pagar keliling', 'Full rails', { add: 750000 })], when: function (c) { return /^(house|floor)$/.test(c.style); } },
          { id: 'under', step: 'bentuk', type: 'chips', l: 'Bawah ranjang', en: 'Under the bed', opts: [O('none', 'Tanpa', 'None'), O('drawers', '2 laci', '2 drawers', { add: 1100000 }), O('trundle', 'Ranjang sorong', 'Trundle bed', { add: 1900000 })],
            when: function (c) { return /^(house|rounded|scallop)$/.test(c.style) && +c.mattress >= 90; } },
          matGroup([60, 70, 90, 100, 120], { 60: -400000, 70: -250000, 100: 200000, 120: 600000 }),
          FRAME([frWood, frPaint]),
          g('uph', { when: function (c) { return /^(rounded|scallop)$/.test(c.style); } }), g('color', { when: function (c) { return /^(rounded|scallop)$/.test(c.style); } }),
          g('wood', { when: function (c) { return /^(house|floor|crib)$/.test(c.style) ? c.frame === 'wood' : true; } }), panelG(function (c) { return /^(house|floor|crib)$/.test(c.style) && c.frame === 'painted'; }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('mattressinc', 'Termasuk kasur', 'Mattress included', { se: 'With mattress', add: 1200000 }),
            O('drape', 'Kelambu / tirai', 'Canopy drape', { s: 'Kelambu', add: 550000, when: function (c) { return c.style !== 'rounded' && c.style !== 'scallop' && (c.style === 'crib' || c.roof !== 'none'); } }),
            O('lights', 'Lampu hias di atap', 'Fairy lights on roof', { s: 'Lampu hias', se: 'Fairy lights', add: 350000, when: function (c) { return /^(house|floor)$/.test(c.style) && c.roof !== 'none'; } }),
            O('castor', 'Roda (box bayi)', 'Castors', { s: 'Roda', add: 300000, when: function (c) { return c.style === 'crib'; } })] }
        ] })
    ] })
  );
  // kasur & rangka anak: pilihan kasur per model, rangka hanya untuk rangka kayu
  (function () {
    var kids = cat.subs.filter(function (s) { return s.id === 'kids'; })[0];
    kids.groups.forEach(function (gr) {
      if (gr.id === 'mattress') gr.opts.forEach(function (o) { o.when = +o.id <= 70 ? function (c) { return c.style === 'crib' || o.id === '70'; } : function (c) { return c.style !== 'crib'; }; });
      if (gr.id === 'frame') gr.when = function (c) { return /^(house|floor|crib)$/.test(c.style); };
    });
  })();

  /* urutan tampil panel (app.js memakai cat.plan) */
  cat.plan = [
    ['bentuk', [['Model & rangka', 'Model & frame'], ['layout', 'style', 'frame', 'sides', 'post', 'canopy', 'roof', 'arm', 'infill', 'top']],
               [['Headboard', 'Headboard'], ['headboard', 'hbW', 'foot']],
               [['Akses & pengaman', 'Access & safety'], ['access', 'rail']],
               [['Bawah & penyimpanan', 'Underneath & storage'], ['below', 'under', 'trundle', 'storage']]],
    ['ukuran', [null, ['mattress', 'bottom', 'h', 'backH', 'hbH']]],
    ['material', [['Kain / kulit', 'Fabric / leather'], ['uph', 'color']], [['Kayu & logam', 'Wood & metal'], ['wood', 'panel', 'metal', 'legFinish']]],
    ['detail', [['Dasar & kaki', 'Base & legs'], ['mount', 'leg', 'legH']],
               [['Bantal', 'Pillows'], ['pillows', 'bolsters']],
               [['Tambahan', 'Extras'], ['drape', 'extras']]]
  ];
  // ukuran awal (defaults() tidak menjalankan migrasi): w/d (& h bila bukan kelompok) dari geom(def)
  cat.subs.forEach(function (s) {
    if (!GEO_SUBS.test(s.id)) return;
    var d = { cat: 'divan', sub: s.id }, k; for (k in s.def) d[k] = s.def[k]; if (s.dims) for (k in s.dims) if (d[k] == null) d[k] = s.dims[k][3];
    var r = geom(d); s.dims = s.dims || {};
    s.dims.w = [0, 999, 1, Math.round((r.x1 - r.x0) * 100)]; s.dims.d = [0, 999, 1, Math.round((r.z1 - r.z0) * 100)];
    if (!s.dims.h) s.dims.h = [0, 999, 1, Math.round(r.H * 100)];
  });
  cat.geom = geom;
  window.XDIVAN = { geom: geom, mats: MATS };
  cat.s = 'Divan & ranjang'; cat.se = 'Beds';
  XC.defineCat(cat);

  /* migrasi: konfigurasi lama tetap jalan
     • loft lama tanpa 'below' / bunk dengan nilai lama → default via normalize
     • ukuran keseluruhan sub non-bed (w, d, h) selalu disegarkan dari geom() */
  XC.addMigrate('divan', function (c) {
    if (c.sub === 'loft' && c.under && !c.below) { c.below = c.under; delete c.under; }
    if (c.headboard === 'channelV') c.headboard = 'channel';
    if (c.sub === 'daybed' && c.backH == null && c.h != null && c.sides !== 'open') c.backH = Math.max(70, Math.min(95, +c.h));
    syncDims(c);
  });
})();
