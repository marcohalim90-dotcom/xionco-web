/* ==========================================================================
   Maison XIONCO v5 — Customize: spesifikasi lengkap pilihan custom
   Satu sumber untuk: panel Customize (app.js), pratinjau 3D (maker.js),
   estimasi harga, dan ringkasan yang dikirim ke tim (WhatsApp + Developer Settings).

   Struktur: kategori → sub-kategori → kelompok pilihan per langkah
     langkah: jenis · bentuk · ukuran · material · detail · kirim
   Setiap pilihan: { id, l (Indonesia), en (English), f (faktor harga), add (tambahan IDR), hex }
   Kelompok: { id, step, type: chips | multi | swatch | range, l, en, opts | min/max/step/unit,
               when(cfg) → tampil atau tidak }
   Harga = ESTIMASI (dasar sub-kategori × ukuran × material + tambahan) — final lewat penawaran.
   ========================================================================== */
(function () {
  'use strict';
  var O = function (id, l, en, extra) { var o = { id: id, l: l, en: en || l }; if (extra) for (var k in extra) o[k] = extra[k]; return o; };

  /* ------------------------------------------------------------------ material */
  // kain xionco.shop (Vienna) + faux leather Cherokee — warna dari varian produk; plus jenis kain lain
  var UPH = [
    O('vienna', 'Fabric Vienna', 'Vienna fabric', { f: 1, colors: [
      O('black', 'Vienna Black', 0, { hex: '#212121' }), O('graphite', 'Vienna Graphite', 0, { hex: '#4d4d4d' }), O('midgrey', 'Vienna Mid Grey', 0, { hex: '#a8a8a8' }),
      O('ivory', 'Vienna Ivory', 0, { hex: '#e3ded0' }), O('custard', 'Vienna Custard', 0, { hex: '#d9ccba' }), O('brown', 'Vienna Brown', 0, { hex: '#473323' }),
      O('blue', 'Vienna Blue', 0, { hex: '#003a5f' }), O('moss', 'Vienna Moss', 0, { hex: '#a3ae6d' }), O('kiwi', 'Vienna Kiwi', 0, { hex: '#ab9952' }), O('red', 'Vienna Red', 0, { hex: '#932221' })] }),
    O('cherokee', 'Faux leather Cherokee', 'Cherokee faux leather', { f: 1.08, leather: true, colors: [
      O('black', 'Cherokee Black 9201', 0, { hex: '#1f1f1f' }), O('canyon', 'Cherokee Canyon 7209B', 0, { hex: '#433e3b' }), O('dgrey', 'Cherokee D. Grey 3203', 0, { hex: '#3f3f41' }),
      O('peanut', 'Cherokee Peanut 7208', 0, { hex: '#7e5d43' }), O('vlgrey', 'Cherokee Vl. Grey 3201', 0, { hex: '#a09e9c' }), O('snow', 'Cherokee Snow 1202', 0, { hex: '#ece9e3' })] }),
    O('boucle', 'Boucle', 'Bouclé', { f: 1.18, nap: 'boucle', colors: [
      O('cream', 'Boucle Cream', 0, { hex: '#e6dfd2' }), O('oat', 'Boucle Oat', 0, { hex: '#cfc3ad' }), O('stone', 'Boucle Stone', 0, { hex: '#a59d90' }), O('charcoal', 'Boucle Charcoal', 0, { hex: '#4a4643' })] }),
    O('velvet', 'Velvet', 'Velvet', { f: 1.14, nap: 'velvet', colors: [
      O('emerald', 'Velvet Emerald', 0, { hex: '#1f4d3f' }), O('navy', 'Velvet Navy', 0, { hex: '#1f2a44' }), O('terracotta', 'Velvet Terracotta', 0, { hex: '#9a4a33' }),
      O('mustard', 'Velvet Mustard', 0, { hex: '#b88a2a' }), O('blush', 'Velvet Blush', 0, { hex: '#c99a8f' }), O('ink', 'Velvet Ink', 0, { hex: '#232028' })] }),
    O('linen', 'Linen look', 'Linen look', { f: 1.06, colors: [
      O('natural', 'Linen Natural', 0, { hex: '#cdbfa8' }), O('sand', 'Linen Sand', 0, { hex: '#b8a68a' }), O('slate', 'Linen Slate', 0, { hex: '#6b6e70' }), O('olive', 'Linen Olive', 0, { hex: '#6d6b4a' })] }),
    O('chenille', 'Chenille', 'Chenille', { f: 1.12, nap: 'velvet', colors: [
      O('pearl', 'Chenille Pearl', 0, { hex: '#d9d2c4' }), O('mocha', 'Chenille Mocha', 0, { hex: '#7a5f4b' }), O('sage', 'Chenille Sage', 0, { hex: '#8f9b84' }), O('smoke', 'Chenille Smoke', 0, { hex: '#5b5856' })] }),
    O('pet', 'Fabric pet friendly (anti cakar)', 'Pet-friendly fabric (scratch resistant)', { f: 1.15, colors: [
      O('grey', 'Pet Friendly Grey', 0, { hex: '#7d7b78' }), O('beige', 'Pet Friendly Beige', 0, { hex: '#c4b49b' }), O('charcoal', 'Pet Friendly Charcoal', 0, { hex: '#3e3c3a' })] }),
    O('leather', 'Kulit asli', 'Genuine leather', { f: 1.85, leather: true, colors: [
      O('cognac', 'Leather Cognac', 0, { hex: '#7b4a2c' }), O('tan', 'Leather Tan', 0, { hex: '#a86f43' }), O('chocolate', 'Leather Chocolate', 0, { hex: '#4a3022' }),
      O('black', 'Leather Black', 0, { hex: '#1c1a19' }), O('oxblood', 'Leather Oxblood', 0, { hex: '#5a1f1f' })] })
  ];
  // label pendek untuk kotak pilihan warna (tanpa nama lini kain)
  UPH.forEach(function (u) { u.colors.forEach(function (c) { c.s = c.l.replace(/^(Vienna|Cherokee|Boucle|Velvet|Linen|Chenille|Pet Friendly|Leather)\s+/i, ''); }); });
  var WOOD = [
    O('oak', 'Oak natural', 'Natural oak', { hex: '#c8a678', f: 1 }), O('walnut', 'Walnut', 'Walnut', { hex: '#5a3d2b', f: 1.12 }), O('teak', 'Jati (teak)', 'Teak', { hex: '#8a5a33', f: 1.15 }),
    O('ash', 'Ash putih', 'White ash', { hex: '#d8cbb4', f: 1.05 }), O('mahogany', 'Mahoni', 'Mahogany', { hex: '#6b3a2a', f: 1.05 }), O('ebony', 'Hitam (ebony stain)', 'Ebony stain', { hex: '#2a2522', f: 1.05 })
  ];
  var METAL = [
    O('black', 'Besi hitam doff', 'Matte black steel', { hex: '#1d1c1b', f: 1, rough: .45 }), O('brass', 'Kuningan', 'Brass', { hex: '#b8924f', f: 1.2, rough: .26 }),
    O('champagne', 'Champagne gold', 'Champagne gold', { hex: '#c7aa78', f: 1.15, rough: .3 }), O('stainless', 'Stainless brushed', 'Brushed stainless', { hex: '#a9a9a6', f: 1.12, rough: .32 }),
    O('gunmetal', 'Gunmetal', 'Gunmetal', { hex: '#4a4b4d', f: 1.05, rough: .35 }), O('ivory', 'Besi ivory', 'Ivory powder coat', { hex: '#e4ddd0', f: 1, rough: .5 })
  ];
  var STONE = [
    O('carrara', 'Marmer Carrara', 'Carrara marble', { hex: '#e8e5df', vein: '#9a9894', f: 1.55 }), O('calacatta', 'Marmer Calacatta', 'Calacatta marble', { hex: '#ece6dc', vein: '#b19a6c', f: 1.75 }),
    O('nero', 'Marmer Nero Marquina', 'Nero Marquina marble', { hex: '#1f1e1d', vein: '#cfcac0', f: 1.6 }), O('travertine', 'Travertine', 'Travertine', { hex: '#d7c7a9', vein: '#b8a582', f: 1.5 }),
    O('terrazzo', 'Terrazzo', 'Terrazzo', { hex: '#ddd6c9', speck: true, f: 1.35 }), O('slate', 'Sintered stone Dark Slate', 'Sintered stone, dark slate', { hex: '#3a3a3a', vein: '#555352', f: 1.45 })
  ];
  var PANEL = [   // warna HPL / duco
    O('ivory', 'Ivory', 'Ivory', { hex: '#ebe4d6' }), O('greige', 'Greige', 'Greige', { hex: '#b9ad9c' }), O('sage', 'Sage', 'Sage', { hex: '#8f9b84' }),
    O('navy', 'Navy', 'Navy', { hex: '#26324a' }), O('charcoal', 'Charcoal', 'Charcoal', { hex: '#2b2a29' }), O('terracotta', 'Terracotta', 'Terracotta', { hex: '#a35c43' }),
    O('oak', 'Motif oak', 'Oak pattern', { hex: '#c8a678', grain: true }), O('walnut', 'Motif walnut', 'Walnut pattern', { hex: '#5a3d2b', grain: true })
  ];

  /* ------------------------------------------------------------------ kelompok pilihan bersama */
  var seat = function (c) { return c.cat === 'kursi'; };
  var notNone = function (k) { return function (c) { return c[k] && c[k] !== 'none'; }; };
  var G = {
    // ukuran
    w: { id: 'w', step: 'ukuran', type: 'range', l: 'Lebar', en: 'Width', unit: 'cm' },
    d: { id: 'd', step: 'ukuran', type: 'range', l: 'Kedalaman', en: 'Depth', unit: 'cm' },
    h: { id: 'h', step: 'ukuran', type: 'range', l: 'Tinggi', en: 'Height', unit: 'cm' },
    seatH: { id: 'seatH', step: 'ukuran', type: 'range', l: 'Tinggi dudukan', en: 'Seat height', unit: 'cm', min: 36, max: 50, inc: 1 },
    seatD: { id: 'seatD', step: 'ukuran', type: 'range', l: 'Kedalaman dudukan', en: 'Seat depth', unit: 'cm', min: 48, max: 70, inc: 1 },
    armH: { id: 'armH', step: 'ukuran', type: 'range', l: 'Tinggi lengan', en: 'Arm height', unit: 'cm', min: 50, max: 75, inc: 1, when: function (c) { return c.arm && c.arm !== 'none' && c.arm !== 'shelter'; } },
    ret: { id: 'ret', step: 'ukuran', type: 'range', l: 'Panjang sisi L / chaise', en: 'Return / chaise length', unit: 'cm', min: 140, max: 320, inc: 5, when: function (c) { return /^(l|u|chaise)/.test(c.shape); } },
    thick: { id: 'thick', step: 'ukuran', type: 'range', l: 'Tebal top', en: 'Top thickness', unit: 'cm', min: 2, max: 8, inc: .5 },
    legH: { id: 'legH', step: 'detail', type: 'range', l: 'Tinggi kaki', en: 'Leg height', unit: 'cm', min: 4, max: 22, inc: 1, when: function (c) { return c.leg && !/^(plinth|metalplinth|floating|hidden|pedestal|swivel)$/.test(c.leg); } },

    // bahan kain
    uph: { id: 'uph', step: 'material', type: 'chips', l: 'Jenis kain / kulit', en: 'Fabric / leather', opts: UPH },
    color: { id: 'color', step: 'material', type: 'swatch', l: 'Warna', en: 'Colour', opts: function (c) { var u = UPH.filter(function (x) { return x.id === c.uph; })[0] || UPH[0]; return u.colors; } },
    wood: { id: 'wood', step: 'material', type: 'swatch', l: 'Kayu', en: 'Wood', opts: WOOD },
    metal: { id: 'metal', step: 'material', type: 'swatch', l: 'Finishing besi', en: 'Metal finish', opts: METAL },
    legFinish: { id: 'legFinish', step: 'material', type: 'chips', l: 'Material kaki', en: 'Leg material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal'), O('same', 'Sama dengan badan', 'Same as body')], when: function (c) { return c.leg && !/^(plinth|floating|hidden)$/.test(c.leg); } },

    // kenyamanan
    fill: { id: 'fill', step: 'detail', type: 'chips', l: 'Isian dudukan', en: 'Seat fill', opts: [
      O('foam', 'Busa standar', 'Standard foam', { f: 1 }), O('hd', 'Busa high density', 'High-density foam', { f: 1.06 }), O('dacron', 'Busa + dacron', 'Foam + fibre wrap', { f: 1.05 }),
      O('feather', 'Busa + bulu (feather)', 'Foam + feather', { f: 1.18 }), O('pocket', 'Pocket spring', 'Pocket springs', { f: 1.15 }), O('memory', 'Memory foam', 'Memory foam', { f: 1.12 })] },
    firm: { id: 'firm', step: 'detail', type: 'chips', l: 'Kekerasan', en: 'Firmness', opts: [O('soft', 'Empuk', 'Soft'), O('medium', 'Sedang', 'Medium'), O('firm', 'Keras', 'Firm')] },
    pillows: { id: 'pillows', step: 'detail', type: 'range', l: 'Bantal hias', en: 'Throw pillows', unit: 'pcs', min: 0, max: 6, inc: 1, addEach: 175000 },
    pillowColor: { id: 'pillowColor', step: 'detail', type: 'chips', l: 'Warna bantal hias', en: 'Pillow colour', opts: [O('same', 'Sama', 'Same'), O('contrast', 'Kontras', 'Contrast'), O('accent', 'Aksen emas', 'Gold accent')], when: function (c) { return c.pillows > 0; } },
    stitch: { id: 'stitch', step: 'detail', type: 'chips', l: 'Jahitan', en: 'Stitching', opts: [O('clean', 'Rapi tersembunyi', 'Clean seam'), O('piping', 'Piping (list)', 'Piping', { add: 250000 }), O('double', 'Double topstitch', 'Double topstitch', { add: 300000 }), O('contrast', 'Benang kontras', 'Contrast thread', { add: 200000 })] },

    // kaki
    leg: { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki / base', en: 'Leg / base style', opts: [
      O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood'), O('block', 'Blok kotak', 'Block'), O('round', 'Besi bulat', 'Round metal'),
      O('hairpin', 'Hairpin', 'Hairpin'), O('sled', 'Sled / rangka U', 'Sled frame'), O('plinth', 'Plinth tertutup', 'Closed plinth'), O('metalplinth', 'Plinth logam (kuningan)', 'Metal plinth (brass)', { add: 450000 }), O('floating', 'Tersembunyi (melayang)', 'Hidden (floating)'), O('castor', 'Roda', 'Castors', { add: 150000 })] }
  };
  function g(id, over) { var o = {}; for (var k in G[id]) o[k] = G[id][k]; if (over) for (var j in over) o[j] = over[j]; return o; }

  /* ------------------------------------------------------------------ sub-kategori */
  var SOFA_SHAPES = [
    O('lurus', 'Lurus', 'Straight'), O('lkiri', 'L — sudut kiri', 'L — left corner', { f: 1.45 }), O('lkanan', 'L — sudut kanan', 'L — right corner', { f: 1.45 }),
    O('u', 'U', 'U-shape', { f: 1.9 }), O('chaisekiri', 'Chaise kiri', 'Chaise left', { f: 1.25 }), O('chaisekanan', 'Chaise kanan', 'Chaise right', { f: 1.25 }),
    O('curved', 'Melengkung', 'Curved', { f: 1.3 }), O('modular', 'Modular (terpisah)', 'Modular units', { f: 1.1 })
  ];
  var ARM = [O('track', 'Track (kotak)', 'Track'), O('slope', 'Miring (slope)', 'Sloped'), O('rolled', 'Rolled (gulung)', 'Rolled', { add: 350000 }), O('flared', 'Flared (melebar)', 'Flared', { add: 400000 }),
    O('shelter', 'Shelter (setinggi sandaran)', 'Shelter (back height)', { add: 300000 }), O('panel', 'Panel tipis', 'Slim panel'), O('none', 'Tanpa lengan', 'Armless', { f: .92 })];
  var BACK = [O('tight', 'Tight back (rata)', 'Tight back'), O('cushion', 'Bantal lepas', 'Loose cushions', { add: 250000 }), O('channel', 'Channel tufting', 'Channel tufted', { add: 600000 }),
    O('button', 'Button tufting (kancing)', 'Button tufted', { add: 550000 }), O('pillow', 'Pillow back (bantal besar)', 'Pillow back', { add: 400000 }), O('low', 'Sandaran rendah', 'Low back')];
  var SEATC = [O('bench', 'Satu bantal panjang', 'Single bench cushion'), O('split', 'Per dudukan', 'One per seat'), O('tight', 'Tight seat (menyatu)', 'Tight seat', { f: .97 })];

  var CATS = [
    O('kursi', 'Kursi & sofa', 'Seating', { subs: [
      O('sofa', 'Sofa', 'Sofa', { base: 3300000, dims: { w: [140, 380, 5, 220], d: [80, 115, 1, 92], h: [62, 100, 1, 76] },
        def: { shape: 'lurus', seats: '3', arm: 'track', back: 'cushion', seatC: 'split', uph: 'vienna', color: 'graphite', leg: 'tapered', legFinish: 'wood', wood: 'walnut', metal: 'black', legH: 12, seatH: 44, seatD: 58, armH: 62, ret: 200, fill: 'hd', firm: 'medium', pillows: 2, pillowColor: 'contrast', stitch: 'clean' },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: SOFA_SHAPES },
          { id: 'seats', step: 'bentuk', type: 'chips', l: 'Kapasitas', en: 'Seats', opts: [O('2', '2 dudukan', '2 seats'), O('2.5', '2,5 dudukan', '2.5 seats'), O('3', '3 dudukan', '3 seats'), O('4', '4 dudukan', '4 seats'), O('5', '5+ dudukan', '5+ seats')], preset: { w: { 2: 170, 2.5: 200, 3: 220, 4: 280, 5: 330 } } },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: ARM },
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back style', opts: BACK },
          { id: 'seatC', step: 'bentuk', type: 'chips', l: 'Bantal dudukan', en: 'Seat cushion', opts: SEATC },
          g('w'), g('d'), g('h'), g('seatH'), g('seatD'), g('armH'), g('ret'),
          g('uph'), g('color'), g('legFinish'), g('wood', { when: function (c) { return c.legFinish === 'wood' && !/^(plinth|metalplinth|floating)$/.test(c.leg); } }), g('metal', { when: function (c) { return c.leg === 'metalplinth' || c.legFinish === 'metal' && !/^(plinth|metalplinth|floating)$/.test(c.leg); } }),
          g('leg'), g('legH'), g('fill'), g('firm'), g('pillows'), g('pillowColor'), g('stitch'),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('sofabed', 'Mekanisme sofa bed', 'Sofa bed mechanism', { add: 1800000 }), O('storage', 'Storage di bawah dudukan', 'Under-seat storage', { add: 900000 }),
            O('usb', 'Port USB / VAZRA', 'USB / VAZRA power port', { add: 450000 }), O('recliner', 'Recliner manual', 'Manual recliner', { add: 2200000 }), O('cupholder', 'Konsol & cup holder', 'Console & cup holder', { add: 650000 }), O('removable', 'Sarung bisa dilepas', 'Removable covers', { add: 700000 })] }
        ] }),
      O('armchair', 'Armchair & lounge', 'Armchair & lounge', { base: 2100000, dims: { w: [65, 120, 1, 84], d: [70, 105, 1, 86], h: [65, 115, 1, 80] },
        def: { shape: 'standar', arm: 'track', back: 'cushion', seatC: 'split', uph: 'boucle', color: 'cream', leg: 'tapered', legFinish: 'wood', wood: 'oak', metal: 'black', legH: 12, seatH: 43, seatD: 56, armH: 62, fill: 'feather', firm: 'soft', pillows: 1, pillowColor: 'same', stitch: 'piping' },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('standar', 'Standar', 'Classic'), O('wingback', 'Wingback', 'Wingback', { f: 1.2 }), O('barrel', 'Barrel / tub (melengkung)', 'Barrel / tub', { f: 1.15 }),
            O('lounge', 'Lounge (rendah & lebar)', 'Lounge (low & wide)', { f: 1.1 }), O('swivel', 'Swivel (putar)', 'Swivel', { f: 1.2 }), O('slipper', 'Slipper (tanpa lengan)', 'Slipper (armless)', { f: .9 })] },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: ARM, when: function (c) { return !/^(barrel|slipper)$/.test(c.shape); } },
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back style', opts: BACK },
          g('w'), g('d'), g('h'), g('seatH'), g('seatD'), g('armH', { when: function (c) { return !/^(barrel|slipper)$/.test(c.shape) && c.arm !== 'none' && c.arm !== 'shelter'; } }),
          g('uph'), g('color'), g('legFinish'), g('wood', { when: function (c) { return c.legFinish === 'wood' && !/^(plinth|metalplinth|floating)$/.test(c.leg) && c.shape !== 'swivel'; } }), g('metal', { when: function (c) { return c.legFinish === 'metal' || c.shape === 'swivel'; } }),
          g('leg', { when: function (c) { return c.shape !== 'swivel'; } }), g('legH', { when: function (c) { return c.shape !== 'swivel' && !/^(plinth|metalplinth|floating)$/.test(c.leg); } }), g('fill'), g('firm'), g('pillows', { max: 2 }), g('pillowColor'), g('stitch'),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('ottoman', 'Ottoman pasangan', 'Matching ottoman', { add: 1100000 }), O('recliner', 'Recliner', 'Recliner', { add: 1900000 }), O('rocking', 'Goyang (rocking)', 'Rocking base', { add: 900000 })] }
        ] }),
      O('bench', 'Bench', 'Bench', { base: 1500000, dims: { w: [80, 260, 5, 160], d: [32, 60, 1, 42], h: [40, 90, 1, 46] },
        def: { shape: 'lurus', backrest: 'none', top: 'upholstered', cushion: 'none', uph: 'vienna', color: 'custard', wood: 'walnut', leg: 'tapered', legFinish: 'wood', metal: 'black', legH: 30, storage: 'none' },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('lurus', 'Lurus', 'Straight'), O('curved', 'Melengkung', 'Curved', { f: 1.25 }), O('round', 'Bulat (pouf bench)', 'Round', { f: 1.1 })] },
          { id: 'backrest', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Backrest', opts: [O('none', 'Tanpa sandaran', 'Backless'), O('low', 'Sandaran rendah', 'Low backrest', { add: 450000 }), O('full', 'Sandaran penuh', 'Full backrest', { add: 750000 })], when: function (c) { return c.shape !== 'round'; } },
          { id: 'top', step: 'bentuk', type: 'chips', l: 'Dudukan', en: 'Seat', opts: [O('upholstered', 'Berlapis kain (upholstered)', 'Upholstered'), O('wood', 'Kayu solid', 'Solid wood'), O('rattan', 'Rotan anyam', 'Woven rattan', { f: 1.1 })] },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Bantal (cushion)', en: 'Cushion', opts: [O('none', 'Tanpa cushion', 'Without cushion'), O('seat', 'Cushion dudukan', 'Seat cushion', { add: 350000 }), O('seatback', 'Cushion dudukan + sandaran', 'Seat & back cushions', { add: 600000 })], when: function (c) { return c.top !== 'upholstered'; } },
          { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', opts: [O('none', 'Tanpa', 'None'), O('lid', 'Storage tutup angkat', 'Lift-lid storage', { add: 650000 }), O('shelf', 'Rak bawah (sepatu)', 'Lower shelf', { add: 300000 })] },
          g('w'), g('d'), g('h'),
          g('uph', { when: function (c) { return c.top === 'upholstered' || c.cushion !== 'none'; } }), g('color', { when: function (c) { return c.top === 'upholstered' || c.cushion !== 'none'; } }), g('wood'), g('legFinish'), g('metal', { when: function (c) { return c.legFinish === 'metal'; } }),
          g('leg'), g('legH', { min: 10, max: 40 }), g('stitch', { when: function (c) { return c.top === 'upholstered'; } })
        ] }),
      O('dining', 'Kursi makan (dining chair)', 'Dining chair', { base: 850000, dims: { w: [40, 65, 1, 48], d: [44, 62, 1, 52], h: [72, 100, 1, 82] },
        def: { back: 'upholstered', arms: 'none', cushion: 'upholstered', frame: 'wood', uph: 'vienna', color: 'ivory', wood: 'oak', metal: 'black', leg: 'tapered', seatH: 46 },
        groups: [
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Bentuk sandaran', en: 'Back style', opts: [O('open', 'Rangka terbuka', 'Open frame'), O('slat', 'Slat vertikal', 'Vertical slats'), O('ladder', 'Ladder (palang)', 'Ladder back'),
            O('upholstered', 'Upholstered penuh', 'Fully upholstered', { add: 150000 }), O('curved', 'Shell melengkung', 'Curved shell', { add: 200000 }), O('rattan', 'Rotan / cane', 'Rattan / cane', { add: 250000 })] },
          { id: 'arms', step: 'bentuk', type: 'chips', l: 'Lengan', en: 'Arms', opts: [O('none', 'Tanpa lengan', 'Armless'), O('arms', 'Dengan lengan (carver)', 'With arms', { add: 300000 })] },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Dudukan / cushion', en: 'Seat / cushion', opts: [O('none', 'Tanpa cushion (kayu)', 'No cushion (wood)', { f: .92 }), O('pad', 'Seat pad lepas', 'Loose seat pad', { add: 120000 }),
            O('upholstered', 'Dudukan berbusa', 'Padded seat', { add: 150000 }), O('full', 'Full upholstered', 'Fully upholstered', { add: 300000 })] },
          { id: 'frame', step: 'material', type: 'chips', l: 'Rangka', en: 'Frame', opts: [O('wood', 'Kayu solid', 'Solid wood'), O('metal', 'Besi', 'Metal'), O('mix', 'Kayu + besi', 'Wood + metal', { f: 1.05 })] },
          g('w'), g('d'), g('h'), g('seatH', { min: 42, max: 50 }),
          g('uph', { when: function (c) { return c.cushion !== 'none' || c.back === 'upholstered'; } }), g('color', { when: function (c) { return c.cushion !== 'none' || c.back === 'upholstered'; } }),
          g('wood', { when: function (c) { return c.frame !== 'metal'; } }), g('metal', { when: function (c) { return c.frame !== 'wood'; } }),
          { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Tapered', 'Tapered'), O('straight', 'Lurus', 'Straight'), O('splay', 'Miring keluar (splayed)', 'Splayed'), O('sled', 'Sled', 'Sled'), O('x', 'Silang (X)', 'X-cross'), O('cantilever', 'Cantilever', 'Cantilever', { add: 200000 })] },
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('glides', 'Felt pad anti gores', 'Felt floor glides', { add: 40000 }), O('stack', 'Bisa ditumpuk', 'Stackable', { add: 80000 }), O('handle', 'Handle di sandaran', 'Back handle', { add: 90000 })] }
        ] }),
      O('stool', 'Bar & counter stool', 'Bar & counter stool', { base: 950000, dims: { w: [36, 55, 1, 42], d: [36, 55, 1, 42], h: [60, 110, 1, 75] },
        def: { height: 'bar', seatShape: 'round', backS: 'none', cushion: 'pad', uph: 'cherokee', color: 'black', metal: 'black', wood: 'walnut', base: 'legs', footrest: 'ring', swivel: 'no' },
        groups: [
          { id: 'height', step: 'bentuk', type: 'chips', l: 'Tinggi meja', en: 'Counter height', opts: [O('counter', 'Counter (dudukan ±65 cm)', 'Counter (seat ±65 cm)'), O('bar', 'Bar (dudukan ±75 cm)', 'Bar (seat ±75 cm)')], preset: { h: { counter: 65, bar: 75 } } },
          { id: 'seatShape', step: 'bentuk', type: 'chips', l: 'Bentuk dudukan', en: 'Seat shape', opts: [O('round', 'Bulat', 'Round'), O('square', 'Kotak', 'Square'), O('saddle', 'Saddle (cekung)', 'Saddle')] },
          { id: 'backS', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back', opts: [O('none', 'Tanpa sandaran', 'Backless'), O('low', 'Rendah', 'Low back', { add: 200000 }), O('full', 'Penuh', 'Full back', { add: 350000 })] },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Cushion', en: 'Cushion', opts: [O('none', 'Tanpa (kayu)', 'None (wood)'), O('pad', 'Dudukan berbusa', 'Padded seat', { add: 120000 }), O('full', 'Full upholstered', 'Fully upholstered', { add: 250000 })] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Kaki', en: 'Base', opts: [O('legs', '4 kaki', '4 legs'), O('pedestal', 'Pedestal (tiang tunggal)', 'Pedestal', { add: 150000 }), O('sled', 'Sled', 'Sled')] },
          { id: 'footrest', step: 'detail', type: 'chips', l: 'Pijakan kaki', en: 'Footrest', opts: [O('ring', 'Ring', 'Ring'), O('bar', 'Palang', 'Bar'), O('none', 'Tanpa', 'None')] },
          { id: 'swivel', step: 'detail', type: 'chips', l: 'Putar', en: 'Swivel', opts: [O('no', 'Tidak', 'No'), O('yes', 'Ya (swivel)', 'Yes', { add: 250000 }), O('gas', 'Swivel + gas lift', 'Swivel + gas lift', { add: 450000 })] },
          g('w'), g('h', { l: 'Tinggi dudukan', en: 'Seat height', min: 55, max: 85 }),
          g('uph', { when: function (c) { return c.cushion !== 'none'; } }), g('color', { when: function (c) { return c.cushion !== 'none'; } }), g('metal'), g('wood', { when: function (c) { return c.cushion !== 'full'; } })
        ] }),
      O('ottoman', 'Ottoman & pouf', 'Ottoman & pouf', { base: 750000, dims: { w: [40, 140, 1, 70], d: [40, 100, 1, 50], h: [35, 50, 1, 42] },
        def: { shape: 'kotak', tuft: 'plain', storage: 'none', uph: 'boucle', color: 'oat', leg: 'floating', legFinish: 'wood', wood: 'walnut', metal: 'brass', legH: 8 },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('kotak', 'Persegi panjang', 'Rectangle'), O('kubus', 'Kubus', 'Cube'), O('round', 'Bulat', 'Round'), O('oval', 'Oval', 'Oval')] },
          { id: 'tuft', step: 'bentuk', type: 'chips', l: 'Permukaan', en: 'Top', opts: [O('plain', 'Polos', 'Plain'), O('channel', 'Channel', 'Channel', { add: 250000 }), O('button', 'Button tufted', 'Button tufted', { add: 250000 })] },
          { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', opts: [O('none', 'Tanpa', 'None'), O('lid', 'Tutup angkat', 'Lift lid', { add: 350000 }), O('tray', 'Tutup bisa jadi nampan', 'Flip-over tray lid', { add: 450000 })] },
          g('w'), g('d', { when: function (c) { return c.shape !== 'kubus' && c.shape !== 'round'; } }), g('h'),
          g('uph'), g('color'), g('leg'), g('legH', { max: 18 }), g('legFinish'), g('wood', { when: function (c) { return c.legFinish === 'wood' && !/^(plinth|metalplinth|floating)$/.test(c.leg); } }), g('metal', { when: function (c) { return c.legFinish === 'metal' && !/^(plinth|metalplinth|floating)$/.test(c.leg); } })
        ] })
    ] }),

    O('meja', 'Meja', 'Tables', { subs: [
      O('dining', 'Meja makan', 'Dining table', { base: 4200000, dims: { w: [80, 320, 5, 180], d: [70, 120, 1, 90], h: [70, 78, 1, 75] }, tableH: true,
        def: { seats: '6', topShape: 'rect', topMat: 'wood', wood: 'walnut', stone: 'carrara', panel: 'ivory', metal: 'black', edge: 'eased', thick: 4, base: 'legs4', baseMat: 'wood' },
        groups: [
          { id: 'seats', step: 'bentuk', type: 'chips', l: 'Kapasitas', en: 'Seats', opts: [O('2', '2 orang', '2 people'), O('4', '4 orang', '4 people'), O('6', '6 orang', '6 people'), O('8', '8 orang', '8 people'), O('10', '10 orang', '10 people'), O('12', '12 orang', '12 people')],
            preset: { w: { 2: 80, 4: 140, 6: 180, 8: 220, 10: 260, 12: 300 } } },
          { id: 'topShape', step: 'bentuk', type: 'chips', l: 'Bentuk top', en: 'Top shape', opts: [O('rect', 'Persegi panjang', 'Rectangle'), O('square', 'Persegi', 'Square'), O('round', 'Bulat', 'Round'),
            O('oval', 'Oval', 'Oval', { f: 1.06 }), O('capsule', 'Kapsul (racetrack)', 'Racetrack', { f: 1.06 }), O('organic', 'Organik', 'Organic', { f: 1.15 })] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs4', '4 kaki', '4 legs'), O('pedestal', 'Pedestal', 'Pedestal', { add: 900000 }), O('double', 'Double pedestal', 'Double pedestal', { add: 1500000 }),
            O('trestle', 'Trestle', 'Trestle', { add: 600000 }), O('sled', 'Sled (rangka U)', 'Sled frame', { add: 500000 }), O('slab', 'Panel / slab', 'Slab panels', { add: 700000 }), O('x', 'Kaki X', 'X-legs', { add: 500000 }), O('v', 'Kaki V', 'V-legs', { add: 450000 })] },
          g('w', { l: 'Panjang', en: 'Length', when: function (c) { return c.topShape !== 'round' && c.topShape !== 'square'; } }),
          g('d', { l: 'Lebar', en: 'Width', when: function (c) { return c.topShape !== 'round' && c.topShape !== 'square'; } }),
          { id: 'dia', step: 'ukuran', type: 'range', l: 'Diameter / sisi', en: 'Diameter / side', unit: 'cm', min: 70, max: 180, inc: 5, when: function (c) { return c.topShape === 'round' || c.topShape === 'square'; } },
          g('h'), g('thick'),
          { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: [O('wood', 'Kayu solid', 'Solid wood', { f: 1.2 }), O('veneer', 'Veneer kayu', 'Wood veneer', { f: 1 }), O('hpl', 'HPL', 'HPL laminate', { f: .85 }),
            O('stone', 'Marmer / batu', 'Marble / stone', { f: 1.6 }), O('glass', 'Kaca tempered', 'Tempered glass', { f: 1 }), O('duco', 'Duco (cat)', 'Painted (duco)', { f: .95 })] },
          g('wood', { when: function (c) { return /^(wood|veneer)$/.test(c.topMat) || c.baseMat === 'wood'; } }),
          { id: 'stone', step: 'material', type: 'swatch', l: 'Batu / marmer', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone'; } },
          { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl' || c.topMat === 'duco'; } },
          { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal'), O('stone', 'Batu (sama dengan top)', 'Stone (as top)', { f: 1.15 })] },
          g('metal', { when: function (c) { return c.baseMat === 'metal'; } }),
          { id: 'edge', step: 'detail', type: 'chips', l: 'Profil tepi', en: 'Edge profile', opts: [O('square', 'Lurus 90°', 'Square'), O('eased', 'Eased (tumpul tipis)', 'Eased'), O('bevel', 'Bevel (miring)', 'Bevelled', { add: 250000 }),
            O('bullnose', 'Bullnose (bulat)', 'Bullnose', { add: 300000 }), O('knife', 'Knife edge (tipis)', 'Knife edge', { add: 350000 }), O('live', 'Live edge (alami)', 'Live edge', { add: 900000 })] },
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('extend', 'Bisa diperpanjang (extension)', 'Extendable', { add: 1800000 }), O('lazy', 'Lazy susan (putar)', 'Lazy susan', { add: 700000 }),
            O('cable', 'Lubang kabel', 'Cable grommet', { add: 150000 }), O('socket', 'Stopkontak VAZRA di meja', 'VAZRA power socket', { add: 650000 }), O('protect', 'Coating anti noda', 'Stain-proof coating', { add: 400000 })] }
        ] }),
      O('coffee', 'Meja kopi (coffee table)', 'Coffee table', { base: 1300000, dims: { w: [50, 160, 5, 110], d: [40, 100, 1, 60], h: [28, 50, 1, 38] }, tableH: true,
        def: { topShape: 'rect', topMat: 'wood', wood: 'oak', stone: 'travertine', panel: 'ivory', metal: 'black', edge: 'eased', thick: 3, base: 'legs4', baseMat: 'wood', dia: 90 },
        groups: [
          { id: 'topShape', step: 'bentuk', type: 'chips', l: 'Bentuk top', en: 'Top shape', opts: [O('rect', 'Persegi panjang', 'Rectangle'), O('square', 'Persegi', 'Square'), O('round', 'Bulat', 'Round'), O('oval', 'Oval', 'Oval'), O('capsule', 'Kapsul', 'Racetrack'), O('organic', 'Organik', 'Organic', { f: 1.15 }), O('nesting', 'Nesting (set 2)', 'Nesting set of 2', { f: 1.5 })] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs4', '4 kaki', '4 legs'), O('pedestal', 'Pedestal', 'Pedestal', { add: 400000 }), O('drum', 'Drum (base penuh)', 'Drum base', { add: 500000 }), O('sled', 'Sled', 'Sled', { add: 300000 }), O('slab', 'Panel / slab', 'Slab panels', { add: 400000 }), O('x', 'Kaki X', 'X-legs', { add: 300000 })] },
          g('w', { l: 'Panjang', en: 'Length', when: function (c) { return !/^(round|square)$/.test(c.topShape); } }), g('d', { l: 'Lebar', en: 'Width', when: function (c) { return !/^(round|square)$/.test(c.topShape); } }),
          { id: 'dia', step: 'ukuran', type: 'range', l: 'Diameter / sisi', en: 'Diameter / side', unit: 'cm', min: 50, max: 130, inc: 5, when: function (c) { return /^(round|square)$/.test(c.topShape); } },
          g('h'), g('thick'),
          { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: [O('wood', 'Kayu solid', 'Solid wood', { f: 1.2 }), O('veneer', 'Veneer kayu', 'Wood veneer'), O('hpl', 'HPL', 'HPL laminate', { f: .85 }), O('stone', 'Marmer / batu', 'Marble / stone', { f: 1.6 }), O('glass', 'Kaca tempered', 'Tempered glass'), O('duco', 'Duco (cat)', 'Painted (duco)', { f: .95 })] },
          g('wood', { when: function (c) { return /^(wood|veneer)$/.test(c.topMat) || c.baseMat === 'wood'; } }),
          { id: 'stone', step: 'material', type: 'swatch', l: 'Batu / marmer', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone'; } },
          { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl' || c.topMat === 'duco'; } },
          { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal'), O('stone', 'Batu (sama dengan top)', 'Stone (as top)', { f: 1.15 })] },
          g('metal', { when: function (c) { return c.baseMat === 'metal'; } }),
          { id: 'edge', step: 'detail', type: 'chips', l: 'Profil tepi', en: 'Edge profile', opts: [O('square', 'Lurus 90°', 'Square'), O('eased', 'Eased', 'Eased'), O('bevel', 'Bevel', 'Bevelled', { add: 150000 }), O('bullnose', 'Bullnose', 'Bullnose', { add: 200000 }), O('knife', 'Knife edge', 'Knife edge', { add: 250000 }), O('live', 'Live edge', 'Live edge', { add: 600000 })] },
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 300000 }), O('drawer', 'Laci', 'Drawer', { add: 450000 }), O('lift', 'Top angkat (lift-top)', 'Lift-top', { add: 900000 }), O('protect', 'Coating anti noda', 'Stain-proof coating', { add: 250000 })] }
        ] }),
      O('side', 'Meja samping (side table)', 'Side table', { base: 650000, dims: { w: [30, 70, 1, 45], d: [30, 70, 1, 45], h: [40, 70, 1, 55] }, tableH: true,
        def: { topShape: 'round', topMat: 'wood', wood: 'walnut', stone: 'nero', panel: 'sage', metal: 'brass', edge: 'eased', thick: 2.5, base: 'pedestal', baseMat: 'metal', dia: 45 },
        groups: [
          { id: 'topShape', step: 'bentuk', type: 'chips', l: 'Bentuk top', en: 'Top shape', opts: [O('round', 'Bulat', 'Round'), O('square', 'Persegi', 'Square'), O('rect', 'Persegi panjang', 'Rectangle'), O('organic', 'Organik', 'Organic')] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('pedestal', 'Pedestal', 'Pedestal'), O('legs3', '3 kaki', '3 legs'), O('legs4', '4 kaki', '4 legs'), O('cshape', 'C-shape (masuk ke sofa)', 'C-shape (slides over sofa)', { add: 200000 }), O('drum', 'Drum', 'Drum', { add: 200000 })] },
          { id: 'dia', step: 'ukuran', type: 'range', l: 'Diameter / sisi', en: 'Diameter / side', unit: 'cm', min: 30, max: 70, inc: 1, when: function (c) { return c.topShape !== 'rect'; } },
          g('w', { when: function (c) { return c.topShape === 'rect'; } }), g('d', { when: function (c) { return c.topShape === 'rect'; } }), g('h'), g('thick'),
          { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: [O('wood', 'Kayu solid', 'Solid wood', { f: 1.2 }), O('hpl', 'HPL', 'HPL laminate', { f: .85 }), O('stone', 'Marmer / batu', 'Marble / stone', { f: 1.5 }), O('glass', 'Kaca', 'Glass'), O('duco', 'Duco', 'Painted')] },
          g('wood', { when: function (c) { return c.topMat === 'wood' || c.baseMat === 'wood'; } }),
          { id: 'stone', step: 'material', type: 'swatch', l: 'Batu / marmer', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone'; } },
          { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl' || c.topMat === 'duco'; } },
          { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: [O('metal', 'Besi / logam', 'Metal'), O('wood', 'Kayu', 'Wood')] },
          g('metal', { when: function (c) { return c.baseMat === 'metal'; } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 150000 }), O('charger', 'Wireless charger', 'Wireless charger', { add: 450000 }), O('lamp', 'Lampu terintegrasi', 'Integrated lamp', { add: 600000 })] }
        ] }),
      O('console', 'Meja konsol', 'Console table', { base: 2100000, dims: { w: [80, 200, 5, 120], d: [28, 50, 1, 36], h: [70, 90, 1, 80] }, tableH: true,
        def: { topShape: 'rect', topMat: 'wood', wood: 'walnut', stone: 'travertine', panel: 'greige', metal: 'brass', edge: 'eased', thick: 3, base: 'slab', baseMat: 'wood', drawers: 2 },
        groups: [
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('legs4', '4 kaki', '4 legs'), O('slab', 'Panel / slab', 'Slab panels'), O('sled', 'Sled', 'Sled'), O('pedestal', 'Pedestal', 'Pedestal')] },
          { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci', en: 'Drawers', unit: 'pcs', min: 0, max: 3, inc: 1, addEach: 350000 },
          g('w', { l: 'Panjang', en: 'Length' }), g('d'), g('h'), g('thick'),
          { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: [O('wood', 'Kayu solid', 'Solid wood', { f: 1.2 }), O('veneer', 'Veneer kayu', 'Wood veneer'), O('hpl', 'HPL', 'HPL laminate', { f: .85 }), O('stone', 'Marmer / batu', 'Marble / stone', { f: 1.5 }), O('duco', 'Duco', 'Painted')] },
          g('wood', { when: function (c) { return /^(wood|veneer)$/.test(c.topMat) || c.baseMat === 'wood'; } }),
          { id: 'stone', step: 'material', type: 'swatch', l: 'Batu / marmer', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone'; } },
          { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl' || c.topMat === 'duco'; } },
          { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal')] },
          g('metal', { when: function (c) { return c.baseMat === 'metal' || c.drawers > 0; }, l: 'Finishing besi / handle', en: 'Metal / handle finish' }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('shelf', 'Rak bawah', 'Lower shelf', { add: 300000 }), O('led', 'Lampu LED', 'LED light', { add: 450000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { add: 650000 })] }
        ] }),
      O('desk', 'Meja kerja', 'Desk', { base: 2000000, dims: { w: [90, 240, 5, 140], d: [50, 90, 1, 70], h: [70, 78, 1, 75] }, tableH: true,
        def: { topShape: 'rect', topMat: 'veneer', wood: 'oak', stone: 'carrara', panel: 'charcoal', metal: 'black', edge: 'eased', thick: 3, base: 'sled', baseMat: 'metal', drawers: 1 },
        groups: [
          { id: 'topShape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('rect', 'Lurus', 'Straight'), O('lshape', 'L-shape', 'L-shape', { f: 1.5 }), O('executive', 'Executive (dengan kabinet)', 'Executive (with pedestal)', { f: 1.6 })] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Bentuk kaki / base', en: 'Base', opts: [O('sled', 'Sled', 'Sled'), O('legs4', '4 kaki', '4 legs'), O('slab', 'Panel / slab', 'Slab panels'), O('electric', 'Standing desk elektrik', 'Electric standing desk', { add: 3500000 })] },
          { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci', en: 'Drawers', unit: 'pcs', min: 0, max: 3, inc: 1, addEach: 350000 },
          g('w', { l: 'Panjang', en: 'Length' }), g('d'), g('h'), g('thick'),
          { id: 'topMat', step: 'material', type: 'chips', l: 'Material top', en: 'Top material', opts: [O('wood', 'Kayu solid', 'Solid wood', { f: 1.25 }), O('veneer', 'Veneer kayu', 'Wood veneer'), O('hpl', 'HPL', 'HPL laminate', { f: .85 }), O('stone', 'Sintered stone', 'Sintered stone', { f: 1.5 })] },
          g('wood', { when: function (c) { return /^(wood|veneer)$/.test(c.topMat) || c.baseMat === 'wood'; } }),
          { id: 'stone', step: 'material', type: 'swatch', l: 'Batu', en: 'Stone', opts: STONE, when: function (c) { return c.topMat === 'stone'; } },
          { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL', en: 'HPL colour', opts: PANEL, when: function (c) { return c.topMat === 'hpl'; } },
          { id: 'baseMat', step: 'material', type: 'chips', l: 'Material kaki', en: 'Base material', opts: [O('metal', 'Besi / logam', 'Metal'), O('wood', 'Kayu', 'Wood')] },
          g('metal', { when: function (c) { return c.baseMat === 'metal' || c.base === 'electric'; } }),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('cable', 'Tray & lubang kabel', 'Cable tray & grommet', { add: 350000 }), O('socket', 'Stopkontak VAZRA', 'VAZRA power socket', { add: 650000 }),
            O('modesty', 'Panel depan (modesty)', 'Modesty panel', { add: 400000 }), O('monitor', 'Rak monitor', 'Monitor shelf', { add: 450000 }), O('lock', 'Laci berkunci', 'Lockable drawer', { add: 200000 })] }
        ] })
    ] }),

    O('kabinet', 'Kabinet & lemari', 'Cabinets & storage', { subs: [
      O('tv', 'Kabinet TV', 'TV cabinet', { base: 2900000, dims: { w: [100, 320, 5, 180], d: [30, 55, 1, 42], h: [30, 70, 1, 48] }, cab: true,
        def: { doorType: 'swing', doors: 2, drawers: 2, niches: 1, finish: 'veneer', wood: 'walnut', panel: 'ivory', metal: 'brass', handle: 'grip', mount: 'legs', leg: 'tapered', legH: 14, carcass: 'multiplek', interior: [] },
        groups: [] }),
      O('sideboard', 'Sideboard / buffet', 'Sideboard / buffet', { base: 3700000, dims: { w: [100, 260, 5, 180], d: [38, 55, 1, 45], h: [65, 95, 1, 80] }, cab: true,
        def: { doorType: 'swing', doors: 3, drawers: 3, niches: 0, finish: 'fluted', wood: 'oak', panel: 'greige', metal: 'brass', handle: 'bar', mount: 'legs', leg: 'straight', legH: 12, carcass: 'multiplek', interior: [] },
        groups: [] }),
      O('wardrobe', 'Lemari pakaian (wardrobe)', 'Wardrobe', { base: 6200000, dims: { w: [80, 320, 5, 180], d: [52, 68, 1, 60], h: [170, 260, 5, 220] }, cab: true,
        def: { doorType: 'swing', doors: 4, drawers: 2, niches: 0, finish: 'hpl', wood: 'oak', panel: 'ivory', metal: 'black', handle: 'grip', mount: 'plinth', leg: 'plinth', legH: 8, carcass: 'multiplek', interior: ['hang', 'shelf'] },
        groups: [] }),
      O('bookshelf', 'Rak buku / display', 'Bookshelf / display', { base: 2300000, dims: { w: [60, 280, 5, 160], d: [28, 45, 1, 35], h: [80, 260, 5, 200] }, cab: true,
        def: { doorType: 'open', doors: 2, drawers: 0, niches: 0, finish: 'veneer', wood: 'walnut', panel: 'charcoal', metal: 'black', handle: 'push', mount: 'plinth', leg: 'plinth', legH: 6, carcass: 'multiplek', interior: ['shelf'], lowerDoors: 'yes' },
        groups: [] }),
      O('shoe', 'Lemari sepatu', 'Shoe cabinet', { base: 2100000, dims: { w: [60, 200, 5, 110], d: [24, 42, 1, 32], h: [80, 200, 5, 110] }, cab: true,
        def: { doorType: 'flip', doors: 2, drawers: 0, niches: 0, finish: 'duco', wood: 'oak', panel: 'sage', metal: 'brass', handle: 'tab', mount: 'legs', leg: 'round', legH: 12, carcass: 'multiplek', interior: ['shelf'] },
        groups: [] }),
      O('nightstand', 'Nakas (nightstand)', 'Nightstand', { base: 1100000, dims: { w: [35, 70, 1, 50], d: [30, 50, 1, 40], h: [40, 70, 1, 52] }, cab: true,
        def: { doorType: 'none', doors: 0, drawers: 2, niches: 1, finish: 'veneer', wood: 'walnut', panel: 'ivory', metal: 'brass', handle: 'knob', mount: 'legs', leg: 'tapered', legH: 14, carcass: 'multiplek', interior: [] },
        groups: [] })
    ] }),

    O('divan', 'Divan & tempat tidur', 'Divans & beds', { subs: [
      O('divan', 'Divan', 'Divan base', { base: 2400000, bed: true, dims: { h: [20, 45, 1, 30] },
        def: { mattress: '160', storage: 'none', headboard: 'channel', hbH: 110, hbW: 'fit', uph: 'vienna', color: 'midgrey', mount: 'plinth', leg: 'plinth', legH: 10, legFinish: 'wood', wood: 'walnut', metal: 'black', extras: [] },
        groups: [] }),
      O('platform', 'Platform bed (rangka kayu)', 'Platform bed', { base: 3100000, bed: true, platform: true, dims: { h: [15, 40, 1, 25] },
        def: { mattress: '160', storage: 'none', headboard: 'woodpanel', hbH: 95, hbW: 'fit', uph: 'linen', color: 'natural', mount: 'legs', leg: 'tapered', legH: 12, legFinish: 'wood', wood: 'oak', metal: 'black', extras: [] },
        groups: [] }),
      O('headboard', 'Headboard saja', 'Headboard only', { base: 1300000, bed: true, hbOnly: true, dims: { h: [20, 45, 1, 30] },
        def: { mattress: '160', storage: 'none', headboard: 'button', hbH: 120, hbW: 'fit', uph: 'velvet', color: 'navy', mount: 'plinth', leg: 'plinth', legH: 10, legFinish: 'wood', wood: 'walnut', metal: 'brass', extras: [] },
        groups: [] })
    ] })
  ];

  /* ------------------------------------------------------------------ kelompok kabinet (dipakai semua sub kabinet) */
  var CAB_GROUPS = [
    { id: 'doorType', step: 'bentuk', type: 'chips', l: 'Jenis pintu', en: 'Door type', opts: [O('swing', 'Pintu engsel (swing)', 'Hinged doors'), O('sliding', 'Pintu geser (sliding)', 'Sliding doors', { add: 600000 }),
      O('folding', 'Pintu lipat', 'Folding doors', { add: 700000 }), O('flip', 'Flip-up / tipping', 'Flip / tipping doors', { add: 350000 }), O('glass', 'Pintu kaca berbingkai', 'Framed glass doors', { add: 500000 }), O('open', 'Terbuka (tanpa pintu)', 'Open (no doors)', { f: .82 }), O('none', 'Hanya laci', 'Drawers only')] },
    { id: 'doors', step: 'bentuk', type: 'range', l: 'Jumlah pintu / kolom', en: 'Doors / columns', unit: 'pcs', min: 1, max: 6, inc: 1, when: function (c) { return c.doorType !== 'none'; } },
    { id: 'drawers', step: 'bentuk', type: 'range', l: 'Laci', en: 'Drawers', unit: 'pcs', min: 0, max: 6, inc: 1, addEach: 300000 },
    { id: 'niches', step: 'bentuk', type: 'range', l: 'Ruang terbuka (niche)', en: 'Open niches', unit: 'pcs', min: 0, max: 3, inc: 1, when: function (c) { return c.sub !== 'wardrobe' && c.sub !== 'bookshelf'; } },
    { id: 'lowerDoors', step: 'bentuk', type: 'chips', l: 'Pintu bawah', en: 'Lower doors', opts: [O('no', 'Tidak', 'No'), O('yes', 'Ya (kabinet bawah)', 'Yes (lower cabinet)', { add: 600000 })], when: function (c) { return c.sub === 'bookshelf'; } },
    g('w'), g('d'), g('h'),
    { id: 'finish', step: 'material', type: 'chips', l: 'Finishing muka', en: 'Front finish', opts: [O('hpl', 'HPL', 'HPL laminate', { f: .9 }), O('veneer', 'Veneer kayu', 'Wood veneer'), O('solid', 'Kayu solid', 'Solid wood', { f: 1.3 }),
      O('duco', 'Duco doff', 'Matte lacquer', { f: 1.08 }), O('gloss', 'Duco glossy', 'Gloss lacquer', { f: 1.15 }), O('fluted', 'Fluted (kisi vertikal)', 'Fluted', { f: 1.18 }), O('cane', 'Rotan / cane', 'Rattan cane', { f: 1.2 })] },
    g('wood', { when: function (c) { return /^(veneer|solid|fluted|cane)$/.test(c.finish) || c.leg === 'tapered' || c.leg === 'straight'; } }),
    { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return /^(hpl|duco|gloss)$/.test(c.finish); } },
    { id: 'carcass', step: 'material', type: 'chips', l: 'Material badan', en: 'Carcass', opts: [O('multiplek', 'Multiplek (plywood)', 'Plywood'), O('blockboard', 'Blockboard', 'Blockboard', { f: .95 }), O('solid', 'Kayu solid', 'Solid wood', { f: 1.25 }), O('mdf', 'MDF', 'MDF', { f: .9 })] },
    { id: 'handle', step: 'detail', type: 'chips', l: 'Handle', en: 'Handles', opts: [O('push', 'Tanpa handle (push to open)', 'Handleless (push-to-open)', { add: 200000 }), O('grip', 'Profil grip (J)', 'J-profile grip'), O('bar', 'Handle batang', 'Bar handle'),
      O('knob', 'Knob', 'Knob'), O('tab', 'Tab kulit', 'Leather tab', { add: 100000 }), O('recessed', 'Coakan (recessed)', 'Recessed pull')] },
    g('metal', { l: 'Finishing handle / besi', en: 'Handle / metal finish', when: function (c) { return /^(bar|knob)$/.test(c.handle) || c.leg === 'round' || c.leg === 'hairpin' || c.leg === 'sled'; } }),
    { id: 'mount', step: 'detail', type: 'chips', l: 'Dudukan kabinet', en: 'Mounting', opts: [O('legs', 'Berkaki', 'On legs'), O('plinth', 'Plinth', 'Plinth'), O('floating', 'Gantung di dinding', 'Wall-hung (floating)', { add: 250000 }), O('castor', 'Roda', 'Castors', { add: 200000 })] },
    { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood'), O('round', 'Besi bulat', 'Round metal'), O('hairpin', 'Hairpin', 'Hairpin'), O('sled', 'Sled', 'Sled')], when: function (c) { return c.mount === 'legs'; } },
    g('legH', { when: function (c) { return c.mount === 'legs'; } }),
    { id: 'interior', step: 'detail', type: 'multi', l: 'Isi dalam', en: 'Interior', opts: [O('shelf', 'Rak adjustable', 'Adjustable shelves'), O('hang', 'Gantungan baju', 'Hanging rail'), O('inner', 'Laci dalam', 'Inner drawers', { add: 450000 }),
      O('mirror', 'Cermin', 'Mirror', { add: 400000 }), O('led', 'Lampu LED', 'LED lighting', { add: 500000 }), O('lock', 'Kunci', 'Lock', { add: 150000 }), O('soft', 'Soft close', 'Soft-close hinges & runners', { add: 300000 }), O('cable', 'Lubang kabel', 'Cable outlet', { add: 80000 })] }
  ];

  /* ------------------------------------------------------------------ kelompok divan */
  var BED_GROUPS = [
    { id: 'mattress', step: 'ukuran', type: 'chips', l: 'Ukuran kasur', en: 'Mattress size', opts: [O('90', '90 × 200 (single)', '90 × 200 (single)'), O('100', '100 × 200', '100 × 200'), O('120', '120 × 200 (double)', '120 × 200 (double)'),
      O('140', '140 × 200', '140 × 200'), O('160', '160 × 200 (queen)', '160 × 200 (queen)'), O('180', '180 × 200 (king)', '180 × 200 (king)'), O('200', '200 × 200 (super king)', '200 × 200 (super king)')] },
    g('h', { l: 'Tinggi divan (tanpa kasur)', en: 'Base height (without mattress)', when: function (c) { return c.sub !== 'headboard'; } }),
    { id: 'hbH', step: 'ukuran', type: 'range', l: 'Tinggi headboard (dari lantai)', en: 'Headboard height (from floor)', unit: 'cm', min: 80, max: 160, inc: 5, when: function (c) { return c.headboard !== 'none'; } },
    { id: 'headboard', step: 'bentuk', type: 'chips', l: 'Model headboard', en: 'Headboard style', opts: [O('none', 'Tanpa headboard', 'No headboard', { f: .75 }), O('panel', 'Panel polos', 'Plain panel'), O('channel', 'Channel tufting', 'Channel tufted', { add: 500000 }),
      O('button', 'Button tufting', 'Button tufted', { add: 450000 }), O('wingback', 'Wingback', 'Wingback', { add: 700000 }), O('arch', 'Melengkung (arch)', 'Arched', { add: 400000 }), O('woodpanel', 'Panel kayu', 'Wood panel'), O('slat', 'Slat kayu', 'Wood slats', { add: 300000 })] },
    { id: 'hbW', step: 'bentuk', type: 'chips', l: 'Lebar headboard', en: 'Headboard width', opts: [O('fit', 'Sesuai kasur', 'Fits the bed'), O('wide', 'Lebar + panel samping', 'Extended with side panels', { add: 1500000 })], when: function (c) { return c.headboard !== 'none'; } },
    { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', opts: [O('none', 'Tanpa', 'None'), O('d2', '2 laci', '2 drawers', { add: 900000 }), O('d4', '4 laci', '4 drawers', { add: 1600000 }), O('lift', 'Hidrolik (angkat)', 'Hydraulic lift-up', { add: 2200000 })], when: function (c) { return c.sub === 'divan'; } },
    g('uph', { l: 'Kain divan & headboard', en: 'Bed & headboard fabric' }), g('color'),
    g('wood', { when: function (c) { return c.sub === 'platform' || /^(woodpanel|slat)$/.test(c.headboard) || (c.mount === 'legs' && c.legFinish === 'wood'); } }),
    { id: 'mount', step: 'detail', type: 'chips', l: 'Dasar', en: 'Base', opts: [O('plinth', 'Plinth tertutup', 'Closed plinth'), O('legs', 'Berkaki', 'On legs'), O('floating', 'Melayang + LED', 'Floating + LED glow', { add: 650000 })], when: function (c) { return c.sub !== 'headboard'; } },
    { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Kayu tapered', 'Tapered wood'), O('block', 'Blok', 'Block'), O('round', 'Besi bulat', 'Round metal')], when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } },
    g('legH', { min: 6, max: 20, when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } }),
    g('legFinish', { when: function (c) { return c.mount === 'legs' && c.sub !== 'headboard'; } }),
    g('metal', { when: function (c) { return c.mount === 'legs' && c.legFinish === 'metal'; } }),
    { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('bench', 'Bench ujung kasur', 'End-of-bed bench', { add: 1400000 }), O('nightstand', 'Nakas pasangan (×2)', 'Matching nightstands (×2)', { add: 2200000 }),
      O('readlamp', 'Lampu baca di headboard', 'Headboard reading lights', { add: 600000 }), O('usb', 'Port USB / VAZRA', 'USB / VAZRA ports', { add: 450000 }), O('mattressinc', 'Termasuk kasur', 'Mattress included', { add: 3500000 })] }
  ];

  // umum untuk semua: jumlah & catatan (langkah kirim)
  CATS.forEach(function (c) {
    c.subs.forEach(function (s) {
      s.cat = c.id;
      if (s.cab) s.groups = CAB_GROUPS.slice();
      if (s.bed) s.groups = BED_GROUPS.slice();
      s.groups.forEach(function (gr) { if (gr.type === 'range' && G[gr.id] && s.dims && s.dims[gr.id] && gr.min == null) { var dm = s.dims[gr.id]; gr.min = dm[0]; gr.max = dm[1]; gr.inc = dm[2]; } });
      s.groups = s.groups.map(function (gr) {
        if (gr.type !== 'range' || !s.dims || !s.dims[gr.id]) return gr;
        var o = {}; for (var k in gr) o[k] = gr[k];
        if (o.min == null || G[gr.id] && G[gr.id].min == null) { o.min = s.dims[gr.id][0]; o.max = s.dims[gr.id][1]; o.inc = s.dims[gr.id][2]; }
        return o;
      });
    });
  });

  var STEPS = [
    O('jenis', 'Jenis', 'Type'), O('bentuk', 'Bentuk', 'Shape'), O('ukuran', 'Ukuran', 'Size'),
    O('material', 'Material', 'Material'), O('detail', 'Detail', 'Details'), O('kirim', 'Ringkasan', 'Summary')
  ];

  /* ------------------------------------------------------------------ fungsi bantu */
  function sub(c) { var cat = CATS.filter(function (x) { return x.id === c.cat; })[0] || CATS[0]; return cat.subs.filter(function (x) { return x.id === c.sub; })[0] || cat.subs[0]; }
  function opts(gr, c) { return typeof gr.opts === 'function' ? gr.opts(c) : gr.opts || []; }
  function visible(gr, c) { return !gr.when || gr.when(c); }
  function groups(c, step) { return sub(c).groups.filter(function (gr) { return (!step || gr.step === step) && visible(gr, c); }); }
  function pick(gr, c) { var v = c[gr.id]; return opts(gr, c).filter(function (o) { return o.id === v; })[0] || null; }

  // konfigurasi awal sebuah sub-kategori
  function defaults(catId, subId) {
    var cat = CATS.filter(function (x) { return x.id === catId; })[0] || CATS[0];
    var s = cat.subs.filter(function (x) { return x.id === subId; })[0] || cat.subs[0];
    var c = { cat: cat.id, sub: s.id, qty: 1 };
    if (s.dims) Object.keys(s.dims).forEach(function (k) { c[k] = s.dims[k][3]; });
    if (s.cab || s.def.dia == null && /round|square/.test(s.def.topShape || '')) c.dia = 90;
    for (var k in s.def) c[k] = Array.isArray(s.def[k]) ? s.def[k].slice() : s.def[k];
    if (s.bed) { c.w = +c.mattress + 6; c.d = 206; }
    s.groups.forEach(function (gr) { if (c[gr.id] == null) { if (gr.type === 'range') c[gr.id] = gr.min; else if (gr.type === 'multi') c[gr.id] = []; else { var o = opts(gr, c)[0]; if (o) c[gr.id] = o.id; } } });
    return c;
  }
  // setelah satu nilai berubah: preset ukuran & pilihan yang tidak lagi tersedia diperbaiki
  function apply(c, key, val) {
    var s = sub(c);
    c[key] = val;
    s.groups.forEach(function (gr) { if (gr.id === key && gr.preset) Object.keys(gr.preset).forEach(function (dim) { var p = gr.preset[dim][val]; if (p != null) c[dim] = p; }); });
    if (key === 'uph') { var u = UPH.filter(function (x) { return x.id === val; })[0]; if (u && !u.colors.some(function (x) { return x.id === c.color; })) c.color = u.colors[0].id; }
    if (key === 'mattress' && s.bed) c.w = +val + 6;
    if (key === 'leg' && /^(plinth|floating)$/.test(val)) c.mount = val;
    s.groups.forEach(function (gr) {
      if ((gr.type === 'chips' || gr.type === 'swatch') && visible(gr, c) && !pick(gr, c)) { var o = opts(gr, c)[0]; if (o) c[gr.id] = o.id; }
      if (gr.type === 'range' && c[gr.id] != null) c[gr.id] = Math.min(gr.max, Math.max(gr.min, c[gr.id]));
    });
    return c;
  }

  // rincian estimasi: dasar × ukuran, lalu tiap pilihan (faktor → dirupiahkan berurutan), tambahan, jumlah unit
  function breakdown(c, L) {
    L = L || function (o) { return o.l; };
    var s = sub(c), rows = [], d = s.dims || {};
    var ratio = function (k) { return d[k] && c[k] ? c[k] / d[k][3] : 1; };
    var size = sizeFactor(c, s, ratio), run = s.base * size;
    rows.push({ k: 'base', l: L(s), v: s.base });
    if (Math.abs(size - 1) > .005) rows.push({ k: 'size', l: L({ l: 'Ukuran', en: 'Size' }) + ' · ' + dimsText(c), v: s.base * size - s.base });
    var adds = [];
    groups(c).forEach(function (gr) {
      var list = gr.type === 'multi' ? opts(gr, c).filter(function (o) { return (c[gr.id] || []).indexOf(o.id) >= 0; }) : gr.type === 'range' ? [] : [pick(gr, c)].filter(Boolean);
      list.forEach(function (o) {
        if (o.f && o.f !== 1) { var dlt = run * (o.f - 1); run += dlt; rows.push({ k: 'f', l: L(gr) + ' · ' + L(o), v: dlt }); }
        if (o.add) adds.push({ k: 'add', l: L(gr) + ' · ' + L(o), v: o.add });
      });
      if (gr.type === 'range' && gr.addEach && +c[gr.id]) adds.push({ k: 'add', l: L(gr) + ' × ' + c[gr.id], v: gr.addEach * c[gr.id] });
    });
    rows = rows.concat(adds);
    var unit = run + adds.reduce(function (n, r) { return n + r.v; }, 0), qty = +c.qty || 1;
    return { rows: rows, unit: unit, qty: qty, total: estimate(c) };
  }
  function sizeFactor(c, s, ratio) {
    var d = s.dims || {}, size;
    if (s.bed) size = Math.pow((+c.mattress || 160) / 160, .8) * Math.pow(ratio('h'), .2);
    else if (s.cab) size = Math.pow(ratio('w') * ratio('h') * Math.pow(ratio('d'), .5), .85);
    else if (s.tableH && /^(round|square)$/.test(c.topShape)) size = Math.pow(Math.pow((c.dia || 90) / 100, 2) / ((d.w ? d.w[3] * d.d[3] : 10000) / 10000), .7);
    else if (s.tableH) size = Math.pow(ratio('w') * ratio('d'), .7);
    else size = Math.pow(ratio('w') * Math.pow(ratio('d'), .5) * Math.pow(ratio('h'), .3), .9);
    if (c.shape && /^(l|u|chaise)/.test(c.shape)) size *= Math.pow((c.ret || 200) / 200, .5);
    return size;
  }
  // estimasi harga (IDR, dibulatkan ke 10 ribu)
  function estimate(c) {
    var s = sub(c), d = s.dims || {}, f = 1, add = 0;
    var size = sizeFactor(c, s, function (k) { return d[k] && c[k] ? c[k] / d[k][3] : 1; });
    groups(c).forEach(function (gr) {
      if (gr.type === 'multi') opts(gr, c).forEach(function (o) { if ((c[gr.id] || []).indexOf(o.id) >= 0) { if (o.f) f *= o.f; if (o.add) add += o.add; } });
      else if (gr.type === 'range') { if (gr.addEach) add += gr.addEach * (+c[gr.id] || 0); }
      else { var o = pick(gr, c); if (o) { if (o.f) f *= o.f; if (o.add) add += o.add; } }
    });
    return Math.round((s.base * size * f + add) * (+c.qty || 1) / 10000) * 10000;
  }

  // ringkasan berlabel (untuk panel, WhatsApp, dan Developer Settings)
  function summary(c, L) {
    L = L || function (o) { return o.l; };
    var s = sub(c), cat = CATS.filter(function (x) { return x.id === c.cat; })[0];
    var rows = [[L({ l: 'Jenis', en: 'Type' }), L(cat) + ' · ' + L(s)]];
    STEPS.forEach(function (st) {
      groups(c, st.id).forEach(function (gr) {
        var v = c[gr.id], txt;
        if (gr.type === 'range') txt = v + (gr.unit && gr.unit !== 'pcs' ? ' ' + gr.unit : gr.unit === 'pcs' ? '' : '');
        else if (gr.type === 'multi') txt = opts(gr, c).filter(function (o) { return (v || []).indexOf(o.id) >= 0; }).map(L).join(', ') || '—';
        else { var o = pick(gr, c); txt = o ? L(o) : '—'; }
        rows.push([L(gr), txt]);
      });
    });
    return rows;
  }
  function dimsText(c) {
    var s = sub(c);
    if (s.bed) return (+c.mattress) + ' × 200 cm';
    if (s.tableH && /^(round|square)$/.test(c.topShape)) return (c.topShape === 'round' ? 'Ø ' : '') + c.dia + (c.topShape === 'square' ? ' × ' + c.dia : '') + ' · H ' + c.h + ' cm';
    return 'W ' + c.w + (c.d ? ' · D ' + c.d : '') + ' · H ' + c.h + ' cm';
  }
  function colorOf(c) { var u = UPH.filter(function (x) { return x.id === c.uph; })[0]; var o = u && u.colors.filter(function (x) { return x.id === c.color; })[0]; return o || null; }

  window.XC = {
    CATS: CATS, STEPS: STEPS, UPH: UPH, WOOD: WOOD, METAL: METAL, STONE: STONE, PANEL: PANEL,
    sub: sub, opts: opts, groups: groups, visible: visible, pick: pick, defaults: defaults, apply: apply,
    estimate: estimate, breakdown: breakdown, summary: summary, dimsText: dimsText, colorOf: colorOf,
    find: function (list, id) { return (list || []).filter(function (o) { return o.id === id; })[0] || null; }
  };
})();
