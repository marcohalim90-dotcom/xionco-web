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
    O('cherokee', 'Faux leather Cherokee', 'Cherokee faux leather', { s: 'Faux leather', se: 'Faux leather', f: 1.08, leather: true, colors: [
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
    O('pet', 'Fabric pet friendly (anti cakar)', 'Pet-friendly fabric (scratch resistant)', { s: 'Pet friendly', se: 'Pet-friendly', f: 1.15, colors: [
      O('grey', 'Pet Friendly Grey', 0, { hex: '#7d7b78' }), O('beige', 'Pet Friendly Beige', 0, { hex: '#c4b49b' }), O('charcoal', 'Pet Friendly Charcoal', 0, { hex: '#3e3c3a' })] }),
    O('leather', 'Kulit asli', 'Genuine leather', { f: 1.85, leather: true, colors: [
      O('cognac', 'Leather Cognac', 0, { hex: '#7b4a2c' }), O('tan', 'Leather Tan', 0, { hex: '#a86f43' }), O('chocolate', 'Leather Chocolate', 0, { hex: '#4a3022' }),
      O('black', 'Leather Black', 0, { hex: '#1c1a19' }), O('oxblood', 'Leather Oxblood', 0, { hex: '#5a1f1f' })] })
  ];
  // label pendek untuk kotak pilihan warna (tanpa nama lini kain)
  UPH.forEach(function (u) { u.colors.forEach(function (c) { c.s = c.l.replace(/^(Vienna|Cherokee|Boucle|Velvet|Linen|Chenille|Pet Friendly|Leather)\s+/i, ''); }); });
  var WOOD = [
    O('oak', 'Oak natural', 'Natural oak', { hex: '#c8a678', f: 1 }), O('walnut', 'Walnut', 'Walnut', { hex: '#5a3d2b', f: 1.12 }), O('teak', 'Jati (teak)', 'Teak', { hex: '#8a5a33', f: 1.15 }),
    O('ash', 'Ash putih', 'White ash', { hex: '#d8cbb4', f: 1.05 }), O('mahogany', 'Mahoni', 'Mahogany', { hex: '#6b3a2a', f: 1.05 }), O('ebony', 'Hitam (ebony stain)', 'Ebony stain', { s: 'Hitam (ebony)', hex: '#2a2522', f: 1.05 })
  ];
  var METAL = [
    O('black', 'Besi hitam doff', 'Matte black steel', { se: 'Matte black', hex: '#1d1c1b', f: 1, rough: .45 }), O('brass', 'Kuningan', 'Brass', { hex: '#b8924f', f: 1.2, rough: .26 }),
    O('champagne', 'Champagne gold', 'Champagne gold', { hex: '#c7aa78', f: 1.15, rough: .3 }), O('stainless', 'Stainless brushed', 'Brushed stainless', { s: 'Stainless', se: 'Stainless', hex: '#a9a9a6', f: 1.12, rough: .32 }),
    O('gunmetal', 'Gunmetal', 'Gunmetal', { hex: '#4a4b4d', f: 1.05, rough: .35 }), O('ivory', 'Besi ivory', 'Ivory powder coat', { se: 'Ivory coat', hex: '#e4ddd0', f: 1, rough: .5 })
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
  // harga awal pilihan baru (analisa FurniMesh, selected.json): tengah rentang priceHint,
  // tambahan dibulatkan ke 5 rb — angka final diatur pemilik di Developer Settings › Harga
  var M = function (a, b) { return Math.round((a + b) / 2 / 5000) * 5000; };
  var F = function (a, b) { return Math.round((a + b) / 2 * 1000) / 1000; };
  var has = function (c, k, v) { return (c[k] || []).indexOf(v) >= 0; };
  var seat = function (c) { return c.cat === 'kursi'; };
  var notNone = function (k) { return function (c) { return c[k] && c[k] !== 'none'; }; };
  // kaki yang bukan kaki (base tertutup / tersembunyi / rok)
  var LEGLESS = /^(plinth|metalplinth|floating|hidden|pedestal|swivel|skirt)$/;
  var NOFIN = /^(plinth|metalplinth|floating|skirt|conic|openFrame)$/;   // tanpa pilihan material kaki
  var CAPLEG = /^(tapered|turned|conic|block|splay)$/;                     // kaki yang bisa diberi sepatu kuningan / roda
  // sandaran berlapis rata → semua tufting; scallop → channel tegak; bantal lepas → kancing/channel datar/biscuit
  var TIGHTBACK = /^(tight|low|camel|wavy|upholstered|tub|floatPad)$/;
  var tb = function (re) { return function (c) { return TIGHTBACK.test(c.back) || re.test(c.back || ''); }; };
  var G = {
    // ukuran
    w: { id: 'w', step: 'ukuran', type: 'range', l: 'Lebar', en: 'Width', unit: 'cm' },
    d: { id: 'd', step: 'ukuran', type: 'range', l: 'Kedalaman', en: 'Depth', unit: 'cm' },
    h: { id: 'h', step: 'ukuran', type: 'range', l: 'Tinggi', en: 'Height', unit: 'cm' },
    seatH: { id: 'seatH', step: 'ukuran', type: 'range', l: 'Tinggi dudukan', en: 'Seat height', unit: 'cm', min: 36, max: 50, inc: 1 },
    seatD: { id: 'seatD', step: 'ukuran', type: 'range', l: 'Kedalaman dudukan', en: 'Seat depth', unit: 'cm', min: 48, max: 70, inc: 1 },
    armH: { id: 'armH', step: 'ukuran', type: 'range', l: 'Tinggi lengan', en: 'Arm height', unit: 'cm', min: 50, max: 75, inc: 1, when: function (c) { return c.arm && !/^(none|shelter|scroll)$/.test(c.arm); } },
    ret: { id: 'ret', step: 'ukuran', type: 'range', l: 'Panjang sisi L / chaise', en: 'Return / chaise length', unit: 'cm', min: 140, max: 320, inc: 5, when: function (c) { return /^(lkiri|lkanan|lcurve|u|chaise)/.test(c.shape || ''); } },
    thick: { id: 'thick', step: 'ukuran', type: 'range', l: 'Tebal top', en: 'Top thickness', unit: 'cm', min: 2, max: 8, inc: .5 },
    legH: { id: 'legH', step: 'detail', type: 'range', l: 'Tinggi kaki', en: 'Leg height', unit: 'cm', min: 4, max: 22, inc: 1, when: function (c) { return c.leg && !LEGLESS.test(c.leg); } },

    // bahan kain
    uph: { id: 'uph', step: 'material', type: 'chips', l: 'Jenis kain / kulit', en: 'Fabric / leather', opts: UPH },
    color: { id: 'color', step: 'material', type: 'swatch', l: 'Warna', en: 'Colour', opts: function (c) { var u = UPH.filter(function (x) { return x.id === c.uph; })[0] || UPH[0]; return u.colors; } },
    // warna kedua (trim = dua warna): warna dari jenis kain yang sama — harga ikut material
    color2: { id: 'color2', step: 'material', type: 'swatch', l: 'Warna kedua', en: 'Second colour', opts: function (c) { var u = UPH.filter(function (x) { return x.id === c.uph; })[0] || UPH[0]; return u.colors; }, when: function (c) { return has(c, 'trim', 'twoTone'); } },
    wood: { id: 'wood', step: 'material', type: 'swatch', l: 'Kayu', en: 'Wood', opts: WOOD },
    metal: { id: 'metal', step: 'material', type: 'swatch', l: 'Finishing besi', en: 'Metal finish', opts: METAL },
    legFinish: { id: 'legFinish', step: 'material', type: 'chips', l: 'Material kaki', en: 'Leg material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi / logam', 'Metal'), O('same', 'Sama dengan badan', 'Same as body', { s: 'Sama badan', se: 'As body' })], when: function (c) { return c.leg && !/^(plinth|floating|hidden)$/.test(c.leg) && !NOFIN.test(c.leg); } },

    // kenyamanan
    fill: { id: 'fill', step: 'detail', type: 'chips', l: 'Isian dudukan', en: 'Seat fill', opts: [
      O('foam', 'Busa standar', 'Standard foam', { f: 1 }), O('hd', 'Busa high density', 'High-density foam', { f: 1.06, s: 'Busa HD', se: 'HD foam' }), O('dacron', 'Busa + dacron', 'Foam + fibre wrap', { f: 1.05, se: 'Foam + fibre' }),
      O('feather', 'Busa + bulu (feather)', 'Foam + feather', { f: 1.18, s: 'Busa + bulu' }), O('pocket', 'Pocket spring', 'Pocket springs', { f: 1.15 }), O('memory', 'Memory foam', 'Memory foam', { f: 1.12 })] },
    firm: { id: 'firm', step: 'detail', type: 'chips', l: 'Kekerasan', en: 'Firmness', opts: [O('soft', 'Empuk', 'Soft'), O('medium', 'Sedang', 'Medium'), O('firm', 'Keras', 'Firm')] },
    pillows: { id: 'pillows', step: 'detail', type: 'range', l: 'Bantal hias', en: 'Throw pillows', unit: 'pcs', min: 0, max: 6, inc: 1, addEach: 175000 },
    pillowColor: { id: 'pillowColor', step: 'detail', type: 'chips', l: 'Warna bantal hias', en: 'Pillow colour', opts: [O('same', 'Sama', 'Same'), O('contrast', 'Kontras', 'Contrast'), O('accent', 'Aksen emas', 'Gold accent')], when: function (c) { return c.pillows > 0; } },
    pillowType: { id: 'pillowType', step: 'detail', type: 'chips', l: 'Jenis bantal hias', en: 'Pillow type', opts: [O('square', 'Persegi 45×45', 'Square 45×45', { s: 'Persegi', se: 'Square' }), O('lumbar', 'Lumbar 30×50', 'Lumbar 30×50', { s: 'Lumbar', se: 'Lumbar' }), O('mix', 'Campuran persegi + lumbar', 'Square + lumbar mix', { s: 'Campuran', se: 'Mixed' })], when: function (c) { return c.pillows > 0; } },
    bolsters: { id: 'bolsters', step: 'detail', type: 'range', l: 'Bolster silinder', en: 'Cylinder bolsters', unit: 'pcs', min: 0, max: 2, inc: 1, addEach: M(250000, 350000) },
    stitch: { id: 'stitch', step: 'detail', type: 'chips', l: 'Jahitan', en: 'Stitching', opts: [O('clean', 'Rapi tersembunyi', 'Clean seam', { s: 'Rapi' }), O('piping', 'Piping (list)', 'Piping', { add: 250000 }), O('double', 'Double topstitch', 'Double topstitch', { add: 300000, s: 'Double stitch', se: 'Double stitch' }), O('contrast', 'Benang kontras', 'Contrast thread', { add: 200000 })] },
    pipingC: { id: 'pipingC', step: 'detail', type: 'chips', l: 'Warna piping', en: 'Piping colour', off: 'same', opts: [O('same', 'Senada', 'Matching'), O('contrast', 'Kontras', 'Contrast', { add: M(100000, 200000) })], when: function (c) { return c.stitch === 'piping'; } },

    // permukaan sandaran (tufting) — terpisah dari bentuk sandaran
    backTuft: { id: 'backTuft', step: 'bentuk', type: 'chips', l: 'Permukaan sandaran', en: 'Back surface', off: 'plain', when: tb(/^(scallop|cushion)$/), opts: [
      O('plain', 'Polos', 'Plain', { when: tb(/^cushion$/) }),
      O('channelV', 'Channel vertikal', 'Vertical channel', { s: 'Channel V', se: 'Channel V', add: M(500000, 750000), when: tb(/^scallop$/) }),
      O('channelH', 'Channel horizontal', 'Horizontal channel', { s: 'Channel H', se: 'Channel H', add: M(600000, 850000), when: tb(/^cushion$/) }),
      O('biscuit', 'Biscuit (kotak)', 'Biscuit tufting', { add: M(650000, 950000), when: tb(/^cushion$/) }),
      O('button', 'Kancing dangkal', 'Button tufted', { s: 'Kancing', add: M(450000, 600000), when: tb(/^cushion$/) }),
      O('diamond', 'Diamond dalam (Chesterfield)', 'Deep diamond tufting', { s: 'Chesterfield', se: 'Chesterfield', add: M(900000, 1400000), when: tb(/^$/) })] },
    // permukaan dudukan — bantal per dudukan: tiap bantal ditufting sendiri
    seatTuft: { id: 'seatTuft', step: 'bentuk', type: 'chips', l: 'Permukaan dudukan', en: 'Seat surface', off: 'plain', opts: [
      O('plain', 'Polos', 'Plain'), O('channel', 'Channel', 'Channel seat', { add: M(400000, 650000) }), O('biscuit', 'Biscuit', 'Biscuit seat', { add: M(500000, 750000) }), O('button', 'Kancing', 'Button seat', { add: M(350000, 500000) })] },

    // kaki (daftar dasar — tiap sub menambah / mengurasi)
    leg: { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki / base', en: 'Leg / base style', opts: [
      O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood'), O('block', 'Blok kotak', 'Block'), O('round', 'Besi bulat', 'Round metal'),
      O('hairpin', 'Hairpin', 'Hairpin'), O('sled', 'Sled / rangka U', 'Sled frame'), O('plinth', 'Plinth tertutup', 'Closed plinth'), O('metalplinth', 'Plinth logam (kuningan)', 'Metal plinth (brass)', { add: 450000, s: 'Plinth logam', se: 'Metal plinth' }), O('floating', 'Tersembunyi (melayang)', 'Hidden (floating)', { s: 'Melayang', se: 'Floating' })] }
  };
  function g(id, over) { var o = {}; for (var k in G[id]) o[k] = G[id][k]; if (over) for (var j in over) o[j] = over[j]; return o; }
  // daftar pilihan bersama + tambahan per sub (harga tambahan bisa beda per sub)
  function plus(list, more) { return list.concat(more); }
  // detail hias (multi) — harga per sub dari selected.json; sepatu kuningan & roda hanya pada kaki tertentu
  var capOk = function (shown) { return function (c) { return shown(c) && CAPLEG.test(c.leg || '') && (NOFIN.test(c.leg) || c.legFinish !== 'same'); }; };
  var TRIM = {
    nailhead: function (a) { return O('nailhead', 'Paku hias (nailhead)', 'Nailhead trim', { s: 'Paku hias', se: 'Nailhead', add: a }); },
    brassCap: function (a, ok) { return O('brassCap', 'Sepatu kuningan (kaki)', 'Brass leg caps', { s: 'Sepatu kaki', se: 'Leg caps', add: a, when: ok }); },
    castor: function (a, ok) { return O('castor', 'Roda kuningan', 'Brass castors', { s: 'Roda', se: 'Castors', add: a, when: ok }); },
    woodEnd: function (a) { return O('woodEnd', 'Panel kayu ujung lengan', 'Wood end panel', { s: 'Panel kayu', se: 'Wood ends', add: a }); },
    brassBand: function (a) { return O('brassBand', 'List kuningan', 'Brass band', { s: 'List', se: 'Band', add: a }); },
    twoTone: function (a, ok) { return O('twoTone', 'Dua warna (dalam/luar)', 'Two-tone upholstery', { s: 'Dua warna', se: 'Two-tone', add: a, when: ok }); }
  };
  var trimG = function (opts) { return { id: 'trim', step: 'detail', type: 'multi', l: 'Detail hias', en: 'Decorative trim', opts: opts }; };

  /* ------------------------------------------------------------------ sub-kategori */
  var notSerp = function (c) { return c.shape !== 'serpentine'; };
  var SOFA_SHAPES = [
    O('lurus', 'Lurus', 'Straight'), O('lkiri', 'L — sudut kiri', 'L — left corner', { f: 1.45, se: 'L — left' }), O('lkanan', 'L — sudut kanan', 'L — right corner', { f: 1.45, s: 'L — kanan', se: 'L — right' }),
    O('u', 'U', 'U-shape', { f: 1.9 }), O('chaisekiri', 'Chaise kiri', 'Chaise left', { f: 1.25 }), O('chaisekanan', 'Chaise kanan', 'Chaise right', { f: 1.25 }),
    O('curved', 'Melengkung', 'Curved', { f: 1.3 }), O('modular', 'Modular (terpisah)', 'Modular units', { f: 1.1, s: 'Modular' }),
    O('serpentine', 'Serpentine / kidney', 'Serpentine', { s: 'Serpentine', f: F(1.35, 1.5) }), O('lcurve', 'L sudut melengkung', 'Rounded-corner L', { s: 'L lengkung', se: 'Rounded L', f: F(1.5, 1.6) })
  ];
  var ARM = [O('track', 'Track (kotak)', 'Track', { when: notSerp }), O('slope', 'Miring (slope)', 'Sloped', { when: notSerp }), O('rolled', 'Rolled (gulung)', 'Rolled', { add: 350000, when: notSerp }), O('flared', 'Flared (melebar)', 'Flared', { add: 400000, s: 'Flared', when: notSerp }),
    O('shelter', 'Shelter (setinggi sandaran)', 'Shelter (back height)', { add: 300000, s: 'Shelter', se: 'Shelter', when: notSerp }), O('panel', 'Panel tipis', 'Slim panel', { when: notSerp }), O('none', 'Tanpa lengan', 'Armless', { f: .92 })];
  var SOFA_ARM = plus(ARM, [
    O('english', 'English roll (rendah)', 'English roll', { s: 'English roll', add: M(450000, 600000), when: notSerp }), O('scroll', 'Scroll Chesterfield', 'Chesterfield scroll', { s: 'Scroll', se: 'Scroll', add: M(600000, 900000), when: notSerp }),
    O('pillow', 'Bulat gemuk (pillow)', 'Rounded pillow arm', { s: 'Bulat gemuk', se: 'Pillow arm', add: M(200000, 350000) }), O('wood', 'Lengan kayu terbuka', 'Open wood arm', { s: 'Kayu terbuka', se: 'Wood arm', add: M(500000, 900000), when: notSerp }),
    O('cane', 'Panel cane', 'Cane arm panel', { se: 'Cane panel', add: M(700000, 1100000), when: notSerp })]);
  // sandaran = konstruksi saja; tufting di backTuft (channel/button lama dimigrasi — lihat migrate())
  var BACK = [O('tight', 'Tight back (rata)', 'Tight back', { s: 'Tight (rata)' }), O('cushion', 'Bantal lepas', 'Loose cushions', { add: 250000 }), O('pillow', 'Pillow back (bantal besar)', 'Pillow back', { add: 400000, s: 'Pillow back' }), O('low', 'Sandaran rendah', 'Low back')];
  var SOFA_BACK = plus(BACK, [
    O('camel', 'Camelback', 'Camelback', { add: M(400000, 600000) }), O('scallop', 'Scallop / kerang', 'Scalloped shell', { s: 'Scallop', se: 'Scalloped', add: M(900000, 1300000) }),
    O('wavy', 'Bergelombang (arch)', 'Wavy / arched', { s: 'Gelombang', se: 'Wavy', add: M(600000, 900000) }),
    O('floating', 'Bantal melayang di rangka', 'Floating pads', { s: 'Melayang', se: 'Floating', add: M(300000, 500000), when: function (c) { return c.frame === 'metal' || c.frame === 'woodExposed'; } })]);
  var SEATC = [O('bench', 'Satu bantal panjang', 'Single bench cushion', { s: 'Satu bantal', se: 'One cushion' }), O('split', 'Per dudukan', 'One per seat', { when: notSerp }), O('tight', 'Tight seat (menyatu)', 'Tight seat', { f: .97, s: 'Tight seat' })];
  // kaki sofa: tambah bubut, bun, silinder, kerucut, miring, rok (roda pindah ke trim)
  var SOFA_LEGS = plus(G.leg.opts, [
    O('turned', 'Kayu bubut (turned)', 'Turned wood', { s: 'Kayu bubut', add: M(150000, 250000) }), O('bun', 'Bun / bola', 'Bun foot', { add: M(100000, 200000) }), O('cylinder', 'Silinder tebal', 'Thick cylinder'),
    O('conic', 'Besi tapered (kerucut)', 'Tapered metal', { s: 'Besi kerucut', add: M(100000, 200000) }), O('splay', 'Tapered miring (mid-century)', 'Splayed tapered', { s: 'Kaki miring', se: 'Splayed' }),
    O('skirt', 'Rok (skirt)', 'Skirted (no legs)', { se: 'Skirted', add: M(350000, 700000) })]);
  var sofaLegs = function (c) { return !c.frame || c.frame === 'upholstered'; };
  var noBigMech = function (c) { return !(sofaLegs(c) && c.leg === 'skirt') && !/^(curved|serpentine)$/.test(c.shape) && c.frame !== 'woodExposed'; };

  // armchair
  var acLegs = function (c) { return (!c.base || c.base === 'legs') && c.shape !== 'woodframe'; };
  var notWF = function (c) { return c.shape !== 'woodframe'; };
  var AC_ARM = ARM.map(function (o) { return O(o.id, o.l, o.en, { f: o.f, add: o.add, s: o.s, se: o.se, when: notWF }); }).concat([
    O('wood', 'Lengan kayu terbuka', 'Open wood arm', { s: 'Kayu terbuka', se: 'Wood arm', add: M(300000, 600000) }), O('woodSide', 'Sisi kayu (slab)', 'Wood side panel', { s: 'Sisi kayu', se: 'Wood side', add: M(450000, 800000) }),
    O('cane', 'Panel cane', 'Cane arm panel', { se: 'Cane panel', add: M(400000, 700000), when: notWF }), O('english', 'English roll', 'English roll', { add: M(250000, 400000), when: notWF }),
    O('pillow', 'Bulat gemuk (pillow)', 'Rounded pillow arm', { s: 'Bulat gemuk', se: 'Pillow arm', add: M(150000, 250000), when: notWF })]);
  var AC_BACK = plus(BACK, [O('cane', 'Panel cane', 'Cane back', { add: M(350000, 600000) }), O('scallop', 'Scallop / kerang', 'Scalloped shell', { s: 'Scallop', se: 'Scalloped', add: M(450000, 700000) })]);
  var AC_LEGS = plus(G.leg.opts, [
    O('compass', 'Compass / A-frame', 'Compass', { s: 'Compass', add: M(100000, 200000) }), O('splay', 'Tapered miring', 'Splayed tapered', { s: 'Kaki miring', se: 'Splayed' }), O('cylinder', 'Silinder tebal', 'Thick cylinder'),
    O('turned', 'Kayu bubut', 'Turned wood', { add: M(100000, 200000) }), O('conic', 'Besi tapered (kerucut)', 'Tapered metal', { s: 'Besi kerucut', add: M(80000, 150000) })]);

  // bench: daftar kaki khusus (tanpa roda / melayang / plinth logam)
  var noLid = function (c) { return c.storage !== 'lid'; };
  var BENCH_LEGS = [
    O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood', { when: noLid }), O('block', 'Blok kotak', 'Block'), O('cylinder', 'Silinder tebal', 'Thick cylinder', { when: noLid }),
    O('slab', 'Papan / slab', 'Slab legs', { add: M(100000, 250000) }), O('sled', 'Sled / rangka U', 'Sled frame', { when: noLid }), O('uSled', 'Rangka U', 'U-frame legs', { add: M(150000, 300000), when: noLid }),
    O('hairpin', 'Hairpin', 'Hairpin', { when: noLid }), O('plinth', 'Plinth tertutup', 'Closed plinth'), O('conic', 'Besi tapered (kerucut)', 'Tapered metal', { s: 'Besi kerucut', add: M(100000, 200000), when: noLid })];

  // dining
  var woodOnlyBack = function (c) { return /^(wishbone|spindle|bentwood|ladder)$/.test(c.back); };
  var dnUph = function (c) { return /^(pad|upholstered|full)$/.test(c.cushion) || /^(upholstered|tub|bolsterRail|floatPad)$/.test(c.back); };
  var notTubBack = function (c) { return !/^(tub|shell)$/.test(c.back); };
  var notWish = function (c) { return c.back !== 'wishbone'; };

  // stool
  var stBucket = function (c) { return c.backS && c.backS !== 'none' && c.backStyle === 'bucket'; };
  var stUph = function (c) { return /^(pad|full)$/.test(c.cushion) || c.backS && c.backS !== 'none' && /^(bucket|bolster)$/.test(c.backStyle); };
  var notPed = function (c) { return !/^(pedestal|flared)$/.test(c.base); };
  var notWoodFr = function (c) { return c.frame !== 'wood'; };

  // ottoman: daftar kaki khusus
  var otLegs = function (c) { return c.construction !== 'pouf'; };
  var notOnFrame = function (c) { return c.construction !== 'onFrame'; };
  var OT_LEGS = [
    O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood'), O('block', 'Blok kotak', 'Block'), O('round', 'Besi bulat', 'Round metal'),
    O('conic', 'Besi tapered', 'Tapered metal', { add: M(80000, 150000) }), O('bun', 'Bun / bola', 'Bun feet', { add: M(80000, 150000) }), O('slab', 'Slab kayu', 'Slab legs', { add: M(100000, 200000) }),
    O('xcampaign', 'X campaign kayu', 'X campaign', { s: 'X campaign', add: M(300000, 500000), when: function (c) { return c.shape === 'kotak' && (!c.storage || c.storage === 'none'); } }),
    O('openFrame', 'Rangka besi terbuka', 'Open metal frame', { s: 'Rangka besi', se: 'Open frame', add: M(350000, 600000) }),
    O('plinth', 'Plinth tertutup', 'Closed plinth', { when: notOnFrame }), O('metalplinth', 'Plinth logam (kuningan)', 'Metal plinth (brass)', { add: 450000, s: 'Plinth logam', se: 'Metal plinth', when: notOnFrame }),
    O('floating', 'Tersembunyi (melayang)', 'Hidden (floating)', { s: 'Melayang', se: 'Floating', when: notOnFrame })];

  // chaise lounge & daybed
  var chLegs = function (c) { return /^(tapered|pin)$/.test(c.base); };

  var CATS = [
    O('kursi', 'Kursi & sofa', 'Seating', { subs: [
      O('sofa', 'Sofa', 'Sofa', { base: 3300000, dims: { w: [140, 380, 5, 220], d: [80, 115, 1, 92], h: [62, 100, 1, 76] },
        def: { shape: 'lurus', seats: '3', frame: 'upholstered', arm: 'track', back: 'cushion', backTuft: 'plain', seatC: 'split', seatTuft: 'plain', uph: 'vienna', color: 'graphite', leg: 'tapered', legFinish: 'wood', wood: 'walnut', metal: 'black', legH: 12, seatH: 44, seatD: 58, armH: 62, ret: 200, fill: 'hd', firm: 'medium', pillows: 2, pillowColor: 'contrast', pillowType: 'square', bolsters: 0, stitch: 'clean', pipingC: 'same', skirt: 'tailored', trim: [] },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: SOFA_SHAPES },
          { id: 'seats', step: 'bentuk', type: 'chips', l: 'Kapasitas', en: 'Seats', opts: [O('2', '2 dudukan', '2 seats'), O('2.5', '2,5 dudukan', '2.5 seats'), O('3', '3 dudukan', '3 seats'), O('4', '4 dudukan', '4 seats'), O('5', '5+ dudukan', '5+ seats')], preset: { w: { 2: 170, 2.5: 200, 3: 220, 4: 280, 5: 330 } } },
          { id: 'frame', step: 'bentuk', type: 'chips', l: 'Konstruksi rangka', en: 'Frame construction', opts: [O('upholstered', 'Berlapis penuh', 'Fully upholstered', { s: 'Berlapis', se: 'Upholstered' }),
            O('woodExposed', 'Rangka kayu ekspos', 'Exposed wood frame', { s: 'Kayu ekspos', se: 'Wood frame', f: F(1.15, 1.25) }), O('woodPlatform', 'Platform kayu', 'Wood platform base', { se: 'Platform', add: M(600000, 1200000) }),
            O('metal', 'Rangka besi keliling', 'Metal frame', { s: 'Rangka besi', add: M(700000, 1100000) })] },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: SOFA_ARM },
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back style', opts: SOFA_BACK },
          g('backTuft'),
          { id: 'seatC', step: 'bentuk', type: 'chips', l: 'Bantal dudukan', en: 'Seat cushion', opts: SEATC },
          g('seatTuft'),
          g('w'), g('d'), g('h'), g('seatH'), g('seatD'), g('armH'), g('ret'),
          g('uph'), g('color'), g('color2'), g('legFinish', { when: function (c) { return sofaLegs(c) && G.legFinish.when(c); } }),
          g('wood', { when: function (c) { return /^(woodExposed|woodPlatform)$/.test(c.frame) || sofaLegs(c) && c.legFinish === 'wood' && !NOFIN.test(c.leg) || /^(wood|cane)$/.test(c.arm) || has(c, 'trim', 'woodEnd') || has(c, 'extras', 'console'); } }),
          g('metal', { when: function (c) { return c.frame === 'metal' || sofaLegs(c) && (/^(metalplinth|conic)$/.test(c.leg) || c.legFinish === 'metal' && !/^(plinth|floating|skirt)$/.test(c.leg)); } }),
          g('leg', { opts: SOFA_LEGS, when: sofaLegs }), g('legH', { when: function (c) { return sofaLegs(c) ? !LEGLESS.test(c.leg) : c.frame !== 'woodPlatform'; } }),
          { id: 'skirt', step: 'detail', type: 'chips', l: 'Model rok', en: 'Skirt style', opts: [O('tailored', 'Rok lurus', 'Tailored skirt', { add: M(350000, 550000) }), O('kickpleat', 'Rok lipit sudut', 'Kick-pleat skirt', { se: 'Kick pleat', add: M(450000, 650000) })], when: function (c) { return sofaLegs(c) && c.leg === 'skirt'; } },
          g('fill'), g('firm'), g('stitch'), g('pipingC'), g('pillows'), g('pillowType'), g('pillowColor'), g('bolsters'),
          trimG([TRIM.nailhead(M(450000, 900000)), TRIM.brassCap(M(150000, 350000), capOk(sofaLegs)), TRIM.castor(M(250000, 450000), capOk(sofaLegs)), TRIM.woodEnd(M(350000, 700000)), TRIM.brassBand(M(250000, 600000)), TRIM.twoTone(M(250000, 450000))]),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('sofabed', 'Mekanisme sofa bed', 'Sofa bed mechanism', { add: 1800000, s: 'Sofa bed', se: 'Sofa bed', when: noBigMech }), O('storage', 'Storage di bawah dudukan', 'Under-seat storage', { add: 900000, s: 'Storage bawah', se: 'Under-seat box' }),
            O('usb', 'Port USB / VAZRA', 'USB / VAZRA power port', { add: 450000, s: 'USB / VAZRA', se: 'USB / VAZRA' }), O('recliner', 'Recliner manual', 'Manual recliner', { add: 2200000, when: noBigMech }), O('cupholder', 'Konsol & cup holder', 'Console & cup holder', { add: 650000, s: 'Cup holder', se: 'Cup holder' }), O('removable', 'Sarung bisa dilepas', 'Removable covers', { add: 700000, s: 'Sarung lepas', se: 'Removable cover' }),
            O('console', 'Konsol kayu terintegrasi', 'Integrated console', { s: 'Konsol', se: 'Console', add: M(1200000, 1800000) }), O('storageOttoman', 'Modul ottoman storage', 'Storage ottoman module', { s: 'Ottoman', se: 'Ottoman', add: M(1400000, 2000000) })] }
        ] }),
      O('chaise', 'Chaise lounge & daybed', 'Chaise lounge & daybed', { s: 'Chaise', base: 3300000, dims: { w: [150, 220, 5, 180], d: [65, 110, 1, 80], h: [40, 95, 1, 75] },
        def: { form: 'onearmL', back: 'end', top: 'plain', base: 'tapered', uph: 'velvet', color: 'emerald', wood: 'walnut', metal: 'brass', legH: 14, seatH: 42, fill: 'hd', firm: 'medium', stitch: 'piping', pipingC: 'same', headrest: 'no', bolsters: 1, trim: [] },
        groups: [
          { id: 'form', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Form', opts: [O('onearmL', 'Chaise lengan kiri', 'One-arm chaise, left', { s: 'Lengan kiri', se: 'Left arm' }), O('onearmR', 'Chaise lengan kanan', 'One-arm chaise, right', { s: 'Lengan kanan', se: 'Right arm' }),
            O('armless', 'Chaise tanpa lengan', 'Armless chaise', { s: 'Tanpa lengan', se: 'Armless', f: F(.92, .95) }), O('daybed', 'Daybed', 'Daybed'), O('curvedBack', 'Sandaran lengkung ujung', 'Curved-end back', { s: 'Lengkung', se: 'Curved end', f: F(1.15, 1.25) })] },
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back', opts: [O('none', 'Tanpa', 'None'), O('end', 'Ujung saja', 'End back', { add: M(300000, 500000) }), O('side', 'Sepanjang sisi', 'Full-length back', { s: 'Sisi penuh', se: 'Full length', add: M(700000, 1100000) })], when: function (c) { return c.form !== 'curvedBack'; } },
          { id: 'top', step: 'bentuk', type: 'chips', l: 'Permukaan', en: 'Top surface', opts: [O('plain', 'Polos', 'Plain'), O('biscuit', 'Biscuit', 'Biscuit', { add: M(500000, 800000) }), O('button', 'Kancing', 'Button', { add: M(400000, 600000) }), O('channelH', 'Channel melintang', 'Cross channel', { s: 'Channel H', se: 'Channel H', add: M(500000, 750000) })] },
          g('w', { l: 'Panjang', en: 'Length' }), g('d', { l: 'Lebar', en: 'Width' }), g('h'), g('seatH'),
          g('uph'), g('color'), g('color2'),
          g('wood', { when: function (c) { return /^(tapered|platform|woodFrame|barFrame)$/.test(c.base) || has(c, 'trim', 'woodEnd'); } }),
          g('metal', { when: function (c) { return /^(pin|barFrame)$/.test(c.base); } }),
          { id: 'base', step: 'detail', type: 'chips', l: 'Base', en: 'Base', opts: [O('tapered', 'Kaki kayu tapered', 'Tapered wood legs', { s: 'Kayu tapered', se: 'Tapered' }), O('pin', 'Kaki besi ramping', 'Slim metal legs', { s: 'Besi ramping', se: 'Slim metal' }),
            O('platform', 'Platform kayu', 'Wood platform', { se: 'Platform', add: M(500000, 900000) }), O('barFrame', 'Rangka besi + rel kayu', 'Bar frame (Barcelona-style)', { s: 'Rangka besi', se: 'Bar frame', add: M(800000, 1300000) }),
            O('woodFrame', 'Rangka kayu (kasur di dalam)', 'Wood bed frame', { s: 'Rangka kayu', se: 'Bed frame', add: M(600000, 1000000) })] },
          g('legH', { when: chLegs }),
          g('fill'), g('firm'), g('stitch'), g('pipingC'),
          { id: 'headrest', step: 'detail', type: 'chips', l: 'Bolster kepala', en: 'Headrest bolster', opts: [O('no', 'Tidak', 'No'), O('yes', 'Ya', 'Yes', { add: M(250000, 400000) })] },
          g('bolsters', { l: 'Bolster', en: 'Bolsters' }),
          trimG([TRIM.nailhead(M(360000, 720000)), TRIM.brassCap(M(120000, 280000), chLegs), TRIM.brassBand(M(200000, 480000)), TRIM.twoTone(M(200000, 360000))])
        ] }),
      O('armchair', 'Armchair & lounge', 'Armchair & lounge', { s: 'Armchair', base: 2100000, dims: { w: [65, 120, 1, 84], d: [70, 105, 1, 86], h: [65, 115, 1, 80] },
        def: { shape: 'standar', base: 'legs', frameStyle: 'post', arm: 'track', back: 'cushion', backTuft: 'plain', seatC: 'split', uph: 'linen', color: 'sand', leg: 'tapered', legFinish: 'wood', wood: 'oak', metal: 'black', legH: 12, seatH: 43, seatD: 56, armH: 62, fill: 'feather', firm: 'soft', pillows: 1, pillowColor: 'same', stitch: 'piping', pipingC: 'same', trim: [] },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('standar', 'Standar', 'Classic'), O('wingback', 'Wingback', 'Wingback', { f: 1.2 }), O('barrel', 'Barrel / tub (melengkung)', 'Barrel / tub', { f: 1.15, s: 'Barrel / tub' }),
            O('lounge', 'Lounge (rendah & lebar)', 'Lounge (low & wide)', { f: 1.1, s: 'Lounge', se: 'Lounge' }), O('woodframe', 'Lounge rangka kayu', 'Wood-frame lounge', { s: 'Rangka kayu', se: 'Wood frame', f: F(1.1, 1.2) }),
            O('round', 'Bulat / cuddle', 'Round / cuddle', { s: 'Bulat', se: 'Round', f: F(1.2, 1.3) }), O('recliner', 'Recliner', 'Recliner', { f: F(1.1, 1.2) }), O('slipper', 'Slipper (tanpa lengan)', 'Slipper (armless)', { f: .9, s: 'Slipper', se: 'Slipper' })] },
          // swivel & rocking = base (dulu shape=swivel & extras=rocking — dimigrasi)
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Base / mekanisme', en: 'Base / mechanism', opts: [O('legs', 'Kaki', 'Legs'), O('swivelDisc', 'Swivel disc', 'Swivel disc', { add: M(450000, 700000), when: notWF }),
            O('swivelStar', 'Swivel kaki bintang', 'Star swivel base', { s: 'Kaki bintang', se: 'Star swivel', add: M(600000, 900000), when: function (c) { return /^(recliner|barrel)$/.test(c.shape); } }),
            O('pedestal', 'Pedestal kayu/bundar', 'Pedestal', { s: 'Pedestal', add: M(500000, 800000), when: notWF }),
            O('rocking', 'Landasan goyang', 'Rocking runners', { s: 'Goyang', se: 'Rocking', add: M(900000, 1300000), when: function (c) { return /^(woodframe|standar)$/.test(c.shape); } })] },
          { id: 'frameStyle', step: 'bentuk', type: 'chips', l: 'Model rangka kayu', en: 'Wood frame style', opts: [O('zframe', 'Z-frame', 'Z-frame'), O('compass', 'Compass / A-frame', 'Compass', { s: 'Compass' }), O('post', 'Tiang lurus + lengan datar', 'Post & rail', { s: 'Tiang lurus' })], when: function (c) { return c.shape === 'woodframe'; } },
          { id: 'arm', step: 'bentuk', type: 'chips', l: 'Bentuk lengan', en: 'Arm style', opts: AC_ARM, when: function (c) { return !/^(barrel|slipper|round)$/.test(c.shape); } },
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back style', opts: AC_BACK },
          g('backTuft'),
          g('w'), g('d'), g('h'), g('seatH'), g('seatD'), g('armH', { when: function (c) { return !/^(barrel|slipper|round)$/.test(c.shape) && G.armH.when(c); } }),
          g('uph'), g('color'), g('color2'), g('legFinish', { when: function (c) { return acLegs(c) && G.legFinish.when(c); } }),
          g('wood', { when: function (c) { return acLegs(c) && c.legFinish === 'wood' && !NOFIN.test(c.leg) || c.shape === 'woodframe' || /^(rocking|pedestal)$/.test(c.base) || /^(wood|woodSide|cane)$/.test(c.arm) || c.back === 'cane' || has(c, 'trim', 'woodEnd'); } }),
          g('metal', { when: function (c) { return acLegs(c) && (/^(metalplinth|conic)$/.test(c.leg) || c.legFinish === 'metal' && !/^(plinth|floating)$/.test(c.leg)) || /^swivel/.test(c.base || ''); } }),
          g('leg', { opts: AC_LEGS, when: acLegs }), g('legH', { when: function (c) { return acLegs(c) && !LEGLESS.test(c.leg); } }), g('fill'), g('firm'), g('pillows', { max: 2 }), g('pillowColor'), g('stitch'), g('pipingC'),
          trimG([TRIM.nailhead(M(270000, 540000)), TRIM.brassCap(M(90000, 210000), capOk(acLegs)), TRIM.castor(M(250000, 450000), capOk(acLegs)), TRIM.woodEnd(M(210000, 420000)), TRIM.brassBand(M(150000, 360000)), TRIM.twoTone(M(150000, 270000))]),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('ottoman', 'Ottoman pasangan', 'Matching ottoman', { add: 1100000, s: 'Ottoman', se: 'Ottoman set' }), O('recliner', 'Recliner', 'Recliner', { add: 1900000 })] }
        ] }),
      O('bench', 'Bench', 'Bench', { base: 1500000, dims: { w: [80, 260, 5, 160], d: [32, 60, 1, 42], h: [40, 90, 1, 46] },
        def: { shape: 'lurus', backrest: 'none', backStyle: 'panel', top: 'upholstered', cushion: 'none', topTuft: 'plain', ends: 'none', uph: 'vienna', color: 'custard', wood: 'walnut', leg: 'tapered', legFinish: 'wood', metal: 'black', legH: 30, storage: 'none', trim: [] },
        groups: [
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('lurus', 'Lurus', 'Straight'), O('curved', 'Melengkung', 'Curved', { f: 1.25 }), O('round', 'Bulat (pouf bench)', 'Round', { f: 1.1, s: 'Bulat (pouf)' }),
            O('oval', 'Oval / kapsul', 'Oval / capsule', { f: F(1, 1.05) }), O('organic', 'Organik / kidney', 'Organic / kidney', { s: 'Organik', se: 'Organic', f: F(1.15, 1.25) })] },
          { id: 'backrest', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Backrest', opts: [O('none', 'Tanpa sandaran', 'Backless'), O('low', 'Sandaran rendah', 'Low backrest', { add: 450000 }), O('full', 'Sandaran penuh', 'Full backrest', { add: 750000 })], when: function (c) { return c.shape !== 'round'; } },
          { id: 'backStyle', step: 'bentuk', type: 'chips', l: 'Model sandaran', en: 'Backrest style', opts: [O('panel', 'Panel berlapis', 'Upholstered panel', { se: 'Padded panel' }), O('oval', 'Pad oval / kapsul', 'Oval pad', { s: 'Pad oval', add: M(100000, 200000) }),
            O('bolster', 'Bolster', 'Bolster backrest', { se: 'Bolster', add: M(100000, 250000) }), O('cane', 'Panel cane', 'Cane panel', { add: M(250000, 450000) }), O('plank', 'Papan kayu', 'Wood plank'),
            O('spindle', 'Spindle', 'Spindle back', { add: M(200000, 400000) }), O('channel', 'Banquette channel', 'Channel banquette', { s: 'Banquette', se: 'Banquette', add: M(400000, 700000) })],
            when: function (c) { return c.shape !== 'round' && c.backrest && c.backrest !== 'none'; } },
          { id: 'top', step: 'bentuk', type: 'chips', l: 'Dudukan', en: 'Seat', opts: [O('upholstered', 'Berlapis kain (upholstered)', 'Upholstered', { s: 'Berlapis kain' }), O('wood', 'Kayu solid', 'Solid wood'), O('rattan', 'Rotan anyam', 'Woven rattan', { f: 1.1 })] },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Bantal (cushion)', en: 'Cushion', opts: [O('none', 'Tanpa cushion', 'Without cushion', { se: 'No cushion' }), O('seat', 'Cushion dudukan', 'Seat cushion', { add: 350000 }), O('seatback', 'Cushion dudukan + sandaran', 'Seat & back cushions', { add: 600000, s: 'Duduk + sandar', se: 'Seat & back' })], when: function (c) { return c.top !== 'upholstered'; } },
          { id: 'topTuft', step: 'bentuk', type: 'chips', l: 'Permukaan dudukan', en: 'Seat surface', off: 'plain', opts: [O('plain', 'Polos', 'Plain'), O('channel', 'Channel', 'Channel', { add: M(200000, 400000), when: noLid }),
            O('button', 'Kancing', 'Button tufted', { add: M(250000, 450000) }), O('segmented', 'Bantal terpisah (2–3)', 'Segmented cushions', { s: 'Bantal pisah', se: 'Segmented', add: M(150000, 300000), when: noLid })],
            when: function (c) { return c.top === 'upholstered' || c.cushion && c.cushion !== 'none'; } },
          { id: 'ends', step: 'bentuk', type: 'chips', l: 'Ujung / lengan', en: 'Ends / arms', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('bolsterEnds', 'Ujung naik (bolster)', 'Raised bolster ends', { s: 'Ujung bolster', se: 'Bolster ends', add: M(450000, 700000) }),
            O('woodEnds', 'Panel kayu ujung', 'Wood end panels', { s: 'Panel kayu', se: 'Wood ends', add: M(350000, 650000) })], when: function (c) { return !/^(organic|round)$/.test(c.shape); } },
          { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', opts: [O('none', 'Tanpa', 'None'), O('lid', 'Storage tutup angkat', 'Lift-lid storage', { add: 650000, s: 'Tutup angkat', se: 'Lift lid' }), O('shelf', 'Rak bawah (sepatu)', 'Lower shelf', { add: 300000, s: 'Rak bawah' })] },
          g('w'), g('d'), g('h'),
          g('uph', { when: function (c) { return c.top === 'upholstered' || c.cushion !== 'none' || c.backStyle && /^(panel|oval|bolster|channel)$/.test(c.backStyle) && c.backrest !== 'none' && c.shape !== 'round'; } }),
          g('color', { when: function (c) { return c.top === 'upholstered' || c.cushion !== 'none' || c.backStyle && /^(panel|oval|bolster|channel)$/.test(c.backStyle) && c.backrest !== 'none' && c.shape !== 'round'; } }),
          g('wood'), g('legFinish', { when: function (c) { return !/^(plinth|conic)$/.test(c.leg); } }), g('metal', { when: function (c) { return c.legFinish === 'metal' && c.leg !== 'plinth' || c.leg === 'conic'; } }),
          g('leg', { opts: BENCH_LEGS }), g('legH', { min: 10, max: 40, when: function (c) { return c.leg !== 'plinth'; } }), g('stitch', { when: function (c) { return c.top === 'upholstered'; } }),
          trimG([TRIM.nailhead(M(225000, 450000)), TRIM.brassCap(M(75000, 175000), function (c) { return CAPLEG.test(c.leg) && (NOFIN.test(c.leg) || c.legFinish !== 'same'); }), TRIM.brassBand(M(125000, 300000))])
        ] }),
      O('dining', 'Kursi makan (dining chair)', 'Dining chair', { s: 'Kursi makan', base: 850000, dims: { w: [40, 65, 1, 48], d: [44, 62, 1, 52], h: [72, 100, 1, 82] },
        def: { back: 'upholstered', backTuft: 'plain', armStyle: 'none', cushion: 'upholstered', seatShape: 'square', frame: 'wood', uph: 'vienna', color: 'ivory', wood: 'oak', metal: 'black', leg: 'tapered', stretcher: 'none', seatH: 46, stitch: 'clean', pipingC: 'same', trim: [] },
        groups: [
          { id: 'back', step: 'bentuk', type: 'chips', l: 'Bentuk sandaran', en: 'Back style', opts: [O('open', 'Rangka terbuka', 'Open frame'), O('slat', 'Slat vertikal', 'Vertical slats'), O('ladder', 'Ladder (palang)', 'Ladder back'),
            O('upholstered', 'Upholstered penuh', 'Fully upholstered', { add: 150000, s: 'Upholstered', se: 'Upholstered' }), O('curved', 'Rel lengkung', 'Curved rail', { add: 200000 }), O('rattan', 'Rotan / cane', 'Rattan / cane', { add: 250000 }),
            O('spindle', 'Spindle / Windsor', 'Spindle back', { s: 'Spindle', add: M(150000, 300000) }), O('wishbone', 'Wishbone (Y)', 'Wishbone', { add: M(300000, 450000) }),
            O('tub', 'Tub / barrel berlapis', 'Upholstered tub', { s: 'Tub', se: 'Tub', add: M(250000, 400000) }), O('bolsterRail', 'Rel atas bolster', 'Bolster top rail', { s: 'Rel bolster', se: 'Bolster rail', add: M(150000, 250000) }),
            O('floatPad', 'Pad melayang di tiang', 'Floating pad on spine', { s: 'Pad melayang', se: 'Floating pad', add: M(150000, 250000) }), O('shell', 'Shell molded', 'Moulded shell', { add: M(200000, 400000) }),
            O('bentwood', 'Bentwood (bistro)', 'Bentwood bistro', { s: 'Bentwood', se: 'Bentwood', add: M(250000, 400000) }), O('hoop', 'Hoop / horseshoe', 'Hoop rail', { s: 'Hoop', add: M(250000, 400000) })] },
          g('backTuft'),
          // dulu chips 'arms' (none/arms) — dimigrasi ke armStyle
          { id: 'armStyle', step: 'bentuk', type: 'chips', l: 'Model lengan', en: 'Arm style', opts: [O('none', 'Tanpa lengan', 'Armless'), O('carver', 'Lengan kayu (carver)', 'Carver arms', { s: 'Carver', add: M(250000, 350000), when: notTubBack }),
            O('hoop', 'Hoop menerus', 'Continuous hoop', { s: 'Hoop', se: 'Hoop', add: M(350000, 500000), when: notTubBack }), O('tub', 'Menyatu (tub)', 'Integrated tub arms', { se: 'Tub arms', add: M(300000, 450000) })] },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Dudukan / cushion', en: 'Seat / cushion', opts: [O('none', 'Tanpa cushion (kayu)', 'No cushion (wood)', { f: .92, s: 'Kayu polos', se: 'Plain wood', when: notWish }), O('pad', 'Seat pad lepas', 'Loose seat pad', { add: 120000 }),
            O('upholstered', 'Dudukan berbusa', 'Padded seat', { add: 150000, when: notWish }), O('full', 'Full upholstered', 'Fully upholstered', { add: 300000, s: 'Full uphol.', se: 'Full uphol.', when: notWish }),
            O('cord', 'Anyaman tali (paper cord)', 'Woven cord seat', { s: 'Anyaman tali', se: 'Woven cord', add: M(200000, 350000) }), O('cane', 'Dudukan cane', 'Cane seat', { s: 'Cane', add: M(250000, 400000), when: notWish })] },
          { id: 'seatShape', step: 'bentuk', type: 'chips', l: 'Bentuk dudukan', en: 'Seat shape', opts: [O('square', 'Persegi / trapesium', 'Square', { s: 'Persegi' }), O('round', 'Bulat', 'Round', { add: M(50000, 150000) })] },
          { id: 'frame', step: 'material', type: 'chips', l: 'Rangka', en: 'Frame', opts: [O('wood', 'Kayu solid', 'Solid wood', { when: function (c) { return c.leg !== 'tulip'; } }),
            O('metal', 'Besi', 'Metal', { when: function (c) { return !woodOnlyBack(c); } }), O('mix', 'Kayu + besi', 'Wood + metal', { f: 1.05, when: function (c) { return !woodOnlyBack(c) && c.leg !== 'tulip'; } })] },
          g('w'), g('d'), g('h'), g('seatH', { min: 42, max: 50 }),
          g('uph', { when: dnUph }), g('color', { when: dnUph }), g('color2', { when: function (c) { return dnUph(c) && has(c, 'trim', 'twoTone'); } }),
          g('wood', { when: function (c) { return c.frame !== 'metal' || c.cushion === 'none'; } }), g('metal', { when: function (c) { return c.frame !== 'wood'; } }),
          { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Tapered', 'Tapered'), O('straight', 'Lurus', 'Straight'), O('splay', 'Miring keluar (splayed)', 'Splayed', { s: 'Miring keluar' }), O('sled', 'Sled', 'Sled'), O('x', 'Silang (X)', 'X-cross'), O('cantilever', 'Cantilever', 'Cantilever', { add: 200000 }),
            O('tulip', 'Pedestal tulip', 'Tulip pedestal', { add: M(350000, 600000), when: function (c) { return /^(shell|tub)$/.test(c.back); } }), O('compass', 'Compass / A-frame', 'Compass', { s: 'Compass', add: M(50000, 150000) })] },
          { id: 'stretcher', step: 'detail', type: 'chips', l: 'Palang kaki', en: 'Stretchers', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('h', 'Palang H', 'H-stretcher', { add: M(60000, 120000) }), O('box', 'Palang keliling', 'Box stretcher', { add: M(80000, 150000) })],
            when: function (c) { return /^(tapered|straight|splay|turned)$/.test(c.leg) && notTubBack(c); } },
          // jahitan kursi makan: tambahan lebih kecil dari sofa (bidang jahit kecil)
          g('stitch', { when: dnUph, opts: [O('clean', 'Rapi tersembunyi', 'Clean seam', { s: 'Rapi' }), O('piping', 'Piping (list)', 'Piping', { add: 100000 }), O('double', 'Double topstitch', 'Double topstitch', { add: 120000, s: 'Double stitch', se: 'Double stitch' }), O('contrast', 'Benang kontras', 'Contrast thread', { add: 80000 })] }),
          g('pipingC', { when: function (c) { return dnUph(c) && c.stitch === 'piping'; } }),
          trimG([TRIM.nailhead(M(135000, 270000)), TRIM.brassCap(M(45000, 105000), function (c) { return /^(tapered|straight|splay|compass)$/.test(c.leg); }), TRIM.twoTone(M(75000, 135000), dnUph)]),
          { id: 'extras', step: 'detail', type: 'multi', l: 'Tambahan', en: 'Extras', opts: [O('glides', 'Felt pad anti gores', 'Felt floor glides', { add: 40000, s: 'Felt pad', se: 'Felt glides' }), O('stack', 'Bisa ditumpuk', 'Stackable', { add: 80000 }), O('handle', 'Handle di sandaran', 'Back handle', { add: 90000, s: 'Handle sandaran' })] }
        ] }),
      O('stool', 'Bar & counter stool', 'Bar & counter stool', { s: 'Bar stool', base: 950000, dims: { w: [36, 55, 1, 42], d: [36, 55, 1, 42], h: [40, 110, 1, 75] },
        def: { height: 'bar', seatShape: 'round', backS: 'none', backStyle: 'bucket', cushion: 'pad', uph: 'cherokee', color: 'black', frame: 'metal', metal: 'black', wood: 'walnut', base: 'legs', footrest: 'ring', footrestFinish: 'same', swivel: 'no', trim: [] },
        groups: [
          { id: 'height', step: 'bentuk', type: 'chips', l: 'Tinggi meja', en: 'Counter height', opts: [O('counter', 'Counter (dudukan ±65 cm)', 'Counter (seat ±65 cm)', { s: 'Counter ±65', se: 'Counter ±65' }), O('bar', 'Bar (dudukan ±75 cm)', 'Bar (seat ±75 cm)', { s: 'Bar ±75', se: 'Bar ±75' }),
            O('low', 'Stool rendah (±45 cm)', 'Low stool (±45 cm)', { s: 'Rendah ±45', se: 'Low ±45', f: F(.85, .9) })], preset: { h: { counter: 65, bar: 75, low: 45 } } },
          { id: 'seatShape', step: 'bentuk', type: 'chips', l: 'Bentuk dudukan', en: 'Seat shape', opts: [O('round', 'Bulat', 'Round'), O('square', 'Kotak', 'Square'), O('saddle', 'Saddle (cekung)', 'Saddle'), O('drum', 'Drum tebal', 'Drum', { add: M(50000, 120000) })] },
          { id: 'backS', step: 'bentuk', type: 'chips', l: 'Sandaran', en: 'Back', opts: [O('none', 'Tanpa sandaran', 'Backless'), O('low', 'Rendah', 'Low back', { add: 200000 }), O('full', 'Penuh', 'Full back', { add: 350000 })] },
          { id: 'backStyle', step: 'bentuk', type: 'chips', l: 'Model sandaran', en: 'Back style', opts: [O('bucket', 'Bucket berlapis', 'Upholstered bucket', { s: 'Bucket', se: 'Bucket', add: M(200000, 350000) }), O('rail', 'Rel kayu melengkung', 'Curved wood rail', { s: 'Rel kayu', se: 'Wood rail', add: M(100000, 200000) }),
            O('bolster', 'Bolster', 'Bolster back', { add: M(150000, 250000) }), O('spindle', 'Spindle', 'Spindle back', { add: M(150000, 250000) }), O('woven', 'Anyaman (seagrass)', 'Woven panel', { s: 'Anyaman', add: M(200000, 350000) }), O('panel', 'Panel kayu', 'Wood panel')],
            when: notNone('backS') },
          { id: 'cushion', step: 'bentuk', type: 'chips', l: 'Cushion', en: 'Cushion', opts: [O('none', 'Tanpa (kayu)', 'None (wood)', { when: function (c) { return !stBucket(c); } }), O('pad', 'Dudukan berbusa', 'Padded seat', { add: 120000, when: function (c) { return !stBucket(c); } }),
            O('full', 'Full upholstered', 'Fully upholstered', { add: 250000, s: 'Full uphol.', se: 'Full uphol.' }), O('cord', 'Anyaman tali', 'Woven cord', { add: M(150000, 250000), when: function (c) { return !stBucket(c); } })] },
          { id: 'base', step: 'bentuk', type: 'chips', l: 'Kaki', en: 'Base', opts: [O('legs', '4 kaki', '4 legs'), O('pedestal', 'Pedestal (tiang tunggal)', 'Pedestal', { add: 150000, s: 'Pedestal', when: notWoodFr }), O('sled', 'Sled', 'Sled', { when: notWoodFr }),
            O('flared', 'Pedestal kayu flare', 'Flared wood pedestal', { s: 'Pedestal flare', se: 'Flared', add: M(300000, 500000), when: function (c) { return c.frame !== 'metal'; } }),
            O('tubular', 'Rangka tubular (loop)', 'Tubular loop', { s: 'Tubular loop', add: M(200000, 350000), when: notWoodFr })] },
          g('w'), g('h', { l: 'Tinggi dudukan', en: 'Seat height', min: 40, max: 85 }),
          { id: 'frame', step: 'material', type: 'chips', l: 'Material rangka', en: 'Frame material', opts: [O('wood', 'Kayu', 'Wood'), O('metal', 'Besi', 'Metal'), O('mix', 'Kayu + pijakan logam', 'Wood + metal footrest', { s: 'Kayu + logam', se: 'Wood + metal', f: F(1.03, 1.06) })] },
          g('uph', { when: stUph }), g('color', { when: stUph }), g('color2', { when: function (c) { return stUph(c) && has(c, 'trim', 'twoTone'); } }),
          g('metal', { when: function (c) { return c.frame !== 'wood' || c.swivel && c.swivel !== 'no'; } }),
          g('wood', { when: function (c) { return c.frame !== 'metal' || c.cushion !== 'full' || c.backS !== 'none' && /^(rail|spindle|panel)$/.test(c.backStyle); } }),
          { id: 'footrestFinish', step: 'material', type: 'chips', l: 'Finishing pijakan', en: 'Footrest finish', off: 'same', opts: [O('same', 'Sama rangka', 'Same as frame', { se: 'As frame' }), O('brass', 'Kuningan', 'Brass', { add: M(100000, 200000) }), O('black', 'Besi hitam', 'Black metal', { add: M(50000, 100000) })],
            when: function (c) { return c.height !== 'low' && c.footrest && c.footrest !== 'none'; } },
          { id: 'footrest', step: 'detail', type: 'chips', l: 'Pijakan kaki', en: 'Footrest', off: 'none', opts: [O('ring', 'Ring', 'Ring'), O('bar', 'Palang', 'Bar', { when: notPed }), O('none', 'Tanpa', 'None'),
            O('h', 'Palang H', 'H-stretcher', { when: notPed }), O('box', 'Palang keliling', 'Box stretcher', { add: M(30000, 80000), when: notPed })], when: function (c) { return c.height !== 'low'; } },
          { id: 'swivel', step: 'detail', type: 'chips', l: 'Putar', en: 'Swivel', opts: [O('no', 'Tidak', 'No'), O('yes', 'Ya (swivel)', 'Yes', { add: 250000 }), O('gas', 'Swivel + gas lift', 'Swivel + gas lift', { add: 450000, s: 'Swivel + gas', se: 'Swivel + gas', when: function (c) { return c.frame === 'metal' && c.base === 'pedestal'; } })] },
          trimG([TRIM.brassCap(M(45000, 105000), function (c) { return c.base === 'legs'; }), TRIM.twoTone(M(75000, 135000), stUph)])
        ] }),
      O('ottoman', 'Ottoman & pouf', 'Ottoman & pouf', { base: 750000, dims: { w: [40, 140, 1, 70], d: [40, 100, 1, 50], h: [35, 50, 1, 42] },
        def: { construction: 'upholstered', shape: 'kotak', tuft: 'plain', sides: 'plain', storage: 'none', uph: 'velvet', color: 'terracotta', leg: 'floating', legFinish: 'wood', wood: 'walnut', metal: 'brass', legH: 8, trim: [] },
        groups: [
          { id: 'construction', step: 'bentuk', type: 'chips', l: 'Konstruksi', en: 'Construction', opts: [O('upholstered', 'Berlapis penuh', 'Fully upholstered', { s: 'Berlapis', se: 'Upholstered' }),
            O('onFrame', 'Bantal di atas rangka', 'Cushion on frame', { s: 'Bantal rangka', se: 'On frame', f: F(1.1, 1.2) }), O('pouf', 'Pouf (lunak)', 'Soft pouf', { f: F(.85, .95) })] },
          { id: 'shape', step: 'bentuk', type: 'chips', l: 'Bentuk', en: 'Shape', opts: [O('kotak', 'Persegi panjang', 'Rectangle'), O('kubus', 'Kubus', 'Cube'), O('round', 'Bulat', 'Round'), O('oval', 'Oval', 'Oval')] },
          { id: 'tuft', step: 'bentuk', type: 'chips', l: 'Permukaan', en: 'Top', opts: [O('plain', 'Polos', 'Plain'), O('channel', 'Channel', 'Channel', { add: 250000 }), O('button', 'Button tufted', 'Button tufted', { add: 250000 }),
            O('biscuit', 'Biscuit / bubble', 'Biscuit / bubble', { s: 'Biscuit', se: 'Biscuit', add: M(300000, 450000) }), O('diamond', 'Diamond dalam', 'Deep diamond', { s: 'Diamond', se: 'Diamond', add: M(350000, 500000) })] },
          { id: 'sides', step: 'bentuk', type: 'chips', l: 'Sisi', en: 'Sides', off: 'plain', opts: [O('plain', 'Polos', 'Plain'), O('fluted', 'Fluted', 'Fluted', { add: M(250000, 400000) }), O('pleated', 'Lipit', 'Pleated', { add: M(250000, 450000) }),
            O('channel', 'Channel menerus', 'Wrap channel', { s: 'Channel', add: M(250000, 400000) })], when: function (c) { return c.construction === 'upholstered'; } },
          { id: 'storage', step: 'bentuk', type: 'chips', l: 'Penyimpanan', en: 'Storage', off: 'none', opts: [O('none', 'Tanpa', 'None'), O('lid', 'Tutup angkat', 'Lift lid', { add: 350000 }), O('tray', 'Tutup bisa jadi nampan', 'Flip-over tray lid', { add: 450000, s: 'Tutup nampan', se: 'Flip tray lid' }),
            O('insetTray', 'Nampan tertanam', 'Inset tray', { s: 'Nampan tanam', add: M(450000, 650000) })], when: function (c) { return c.construction === 'upholstered'; } },
          g('w'), g('d', { when: function (c) { return c.shape !== 'kubus' && c.shape !== 'round'; } }), g('h'),
          g('uph'), g('color'), g('color2'),
          g('legFinish', { when: function (c) { return otLegs(c) && G.legFinish.when(c); } }),
          g('wood', { when: function (c) { return otLegs(c) && (c.legFinish === 'wood' && !NOFIN.test(c.leg) || c.leg === 'xcampaign') || c.storage === 'insetTray'; } }),
          g('metal', { when: function (c) { return otLegs(c) && (c.legFinish === 'metal' && !NOFIN.test(c.leg) || /^(metalplinth|conic|openFrame)$/.test(c.leg)); } }),
          g('leg', { opts: OT_LEGS, when: otLegs }), g('legH', { max: 18, when: function (c) { return otLegs(c) && !LEGLESS.test(c.leg); } }),
          trimG([TRIM.nailhead(M(180000, 360000)), TRIM.brassCap(M(60000, 140000), capOk(otLegs)), TRIM.castor(M(250000, 450000), capOk(otLegs)), TRIM.brassBand(M(100000, 240000)), TRIM.twoTone(M(100000, 180000))])
        ] })
    ] }),

    // meja, kabinet & divan: js/spec-meja.js · spec-kabinet.js · spec-divan.js (XC.defineCat)
    O('meja', 'Meja', 'Tables', { subs: [] }),
    O('kabinet', 'Kabinet & lemari', 'Cabinets & storage', { subs: [] }),
    O('divan', 'Divan & tempat tidur', 'Divans & beds', { subs: [] })
  ];

  // umum untuk semua: jumlah & catatan (langkah kirim)
  function prep(c) {
    c.subs.forEach(function (s) {
      s.cat = c.id;
      if (s.cab && c.CAB_GROUPS) s.groups = c.CAB_GROUPS.slice();
      if (s.bed && c.BED_GROUPS) s.groups = c.BED_GROUPS.slice();
      s.groups.forEach(function (gr) { if (gr.type === 'range' && G[gr.id] && s.dims && s.dims[gr.id] && gr.min == null) { var dm = s.dims[gr.id]; gr.min = dm[0]; gr.max = dm[1]; gr.inc = dm[2]; } });
      s.groups = s.groups.map(function (gr) {
        if (gr.type !== 'range' || !s.dims || !s.dims[gr.id]) return gr;
        var o = {}; for (var k in gr) o[k] = gr[k];
        if (o.min == null || G[gr.id] && G[gr.id].min == null) { o.min = s.dims[gr.id][0]; o.max = s.dims[gr.id][1]; o.inc = s.dims[gr.id][2]; }
        return o;
      });
    });
  }
  CATS.forEach(prep);

  var STEPS = [
    O('jenis', 'Jenis', 'Type'), O('ukuran', 'Ukuran', 'Size'), O('bentuk', 'Bentuk', 'Shape'),   // pemilik: ukuran sebelum bentuk
    O('material', 'Material', 'Material'), O('detail', 'Detail', 'Details'), O('kirim', 'Ringkasan', 'Summary')
  ];

  /* ------------------------------------------------------------------ fungsi bantu */
  function sub(c) { var cat = CATS.filter(function (x) { return x.id === c.cat; })[0] || CATS[0]; return cat.subs.filter(function (x) { return x.id === c.sub; })[0] || cat.subs[0]; }
  // pilihan yang tersedia — pilihan boleh punya when(c) sendiri (mis. sepatu kuningan hanya pada kaki tertentu)
  function opts(gr, c) { var list = typeof gr.opts === 'function' ? gr.opts(c) : gr.opts || []; return c ? list.filter(function (o) { return !o.when || o.when(c); }) : list; }
  function visible(gr, c) { return !gr.when || gr.when(c); }
  function groups(c, step) { return sub(c).groups.filter(function (gr) { return (!step || gr.step === step) && visible(gr, c); }); }
  function pick(gr, c) { var v = c[gr.id]; return opts(gr, c).filter(function (o) { return o.id === v; })[0] || null; }

  // perbaiki konfigurasi sampai stabil: pilihan yang tidak tersedia → pilihan pertama, kelompok tersembunyi
  // dengan nilai netral (off) → nilai netral, multi → buang pilihan yang tidak tersedia, ukuran → dalam batas
  function fix(c) {
    var s = sub(c);
    for (var pass = 0; pass < 6; pass++) {
      var changed = false;
      s.groups.forEach(function (gr) {
        var v = c[gr.id];
        if (gr.type === 'range') { if (v != null) { var r = Math.min(gr.max, Math.max(gr.min, v)); if (r !== v) { c[gr.id] = r; changed = true; } } return; }
        if (!visible(gr, c)) { if (gr.off != null && v !== gr.off) { c[gr.id] = gr.off; changed = true; } return; }
        if (gr.type === 'multi') {
          var ok = opts(gr, c).map(function (o) { return o.id; }), arr = Array.isArray(v) ? v : [], nv = arr.filter(function (x) { return ok.indexOf(x) >= 0; });
          if (!Array.isArray(v) || nv.length !== arr.length) { c[gr.id] = nv; changed = true; }
        } else if (!pick(gr, c)) { var o = opts(gr, c)[0]; if (o && o.id !== v) { c[gr.id] = o.id; changed = true; } }
      });
      if (!changed) break;
    }
    return c;
  }

  /* migrasi konfigurasi lama (tas 'custom', rancangan tersimpan xv5_designs, Customize xv5_cz, alias di apply):
       sofa/armchair back=channel → back=tight + backTuft=channelV · back=button → back=cushion + backTuft=button
       leg=castor → leg=tapered + trim castor (roda kuningan) · armchair shape=swivel → shape=standar + base=swivelDisc
       armchair extras rocking → base=rocking · dining arms none/arms → armStyle none/carver
       bench leg floating/metalplinth → plinth, round → conic · ottoman leg hairpin → round, sled → openFrame */
  var MIGR = {};   // migrasi tambahan per kategori (XC.addMigrate)
  function migrate(c) {
    if (c && MIGR[c.cat]) MIGR[c.cat].forEach(function (fn) { fn(c); });
    if (!c || c.cat !== 'kursi') return c;
    var s = c.sub, add = function (k, v) { var a = Array.isArray(c[k]) ? c[k].slice() : []; if (a.indexOf(v) < 0) a.push(v); c[k] = a; };
    if (s === 'sofa' || s === 'armchair') {
      if (c.back === 'channel') { c.back = 'tight'; c.backTuft = 'channelV'; }
      else if (c.back === 'button') { c.back = 'cushion'; c.backTuft = 'button'; }
    }
    if (c.leg === 'castor' && /^(sofa|armchair|ottoman|bench)$/.test(s)) { c.leg = 'tapered'; if (s !== 'bench') add('trim', 'castor'); }
    if (s === 'armchair') {
      if (c.shape === 'swivel') { c.shape = 'standar'; c.base = 'swivelDisc'; }
      if (has(c, 'extras', 'rocking')) { c.extras = c.extras.filter(function (x) { return x !== 'rocking'; }); if (!c.base || c.base === 'legs') c.base = 'rocking'; }
    }
    if (s === 'dining' && c.arms !== undefined) { if (c.armStyle == null) c.armStyle = c.arms === 'arms' ? 'carver' : 'none'; delete c.arms; }
    if (s === 'bench') { var bm = { floating: 'plinth', metalplinth: 'plinth', round: 'conic' }; if (bm[c.leg]) c.leg = bm[c.leg]; }
    if (s === 'ottoman') { var om = { hairpin: 'round', sled: 'openFrame' }; if (om[c.leg]) c.leg = om[c.leg]; }
    return c;
  }
  // konfigurasi (mungkin lama) → konfigurasi lengkap & valid untuk spesifikasi sekarang (diubah di tempat)
  function normalize(c) {
    if (!c || typeof c !== 'object' || !c.cat) return c;
    var cat = CATS.filter(function (x) { return x.id === c.cat; })[0]; if (!cat) return c;
    if (!cat.subs.some(function (x) { return x.id === c.sub; })) c.sub = cat.subs[0].id;
    migrate(c);
    var d = defaults(c.cat, c.sub);
    for (var k in d) if (c[k] === undefined) c[k] = d[k];
    return fix(c);
  }
  // perlu dinormalisasi? (kunci kelompok hilang atau nilai lama)
  function stale(c) {
    if (!c || !c.cat) return false;
    if (sub(c).groups.some(function (gr) { return c[gr.id] === undefined; })) return true;
    if (c.cat !== 'kursi' && !MIGR[c.cat]) return false;
    var a = JSON.stringify(c); return JSON.stringify(migrate(JSON.parse(a))) !== a;
  }
  var current = function (c) { return stale(c) ? normalize(JSON.parse(JSON.stringify(c))) : c; };

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
    return fix(c);
  }
  // setelah satu nilai berubah: alias lama, preset ukuran & pilihan yang tidak lagi tersedia diperbaiki
  function apply(c, key, val) {
    var s = sub(c);
    c[key] = val;
    migrate(c);
    s.groups.forEach(function (gr) { if (gr.id === key && gr.preset) Object.keys(gr.preset).forEach(function (dim) { var p = gr.preset[dim][val]; if (p != null) c[dim] = p; }); });
    if (key === 'uph') { var u = UPH.filter(function (x) { return x.id === val; })[0]; if (u && !u.colors.some(function (x) { return x.id === c.color; })) c.color = u.colors[0].id; }
    if (key === 'mattress' && s.bed) c.w = +val + 6;
    if (key === 'leg' && /^(plinth|floating)$/.test(val)) c.mount = val;
    return fix(c);
  }

  /* ------------------------------------------------------------------ HARGA
     Harga per unit = (harga dasar + penyesuaian ukuran) × faktor pilihan + tambahan pilihan,
     lalu penyesuaian umum (markup %) dan pembulatan.
       • harga dasar      — per sub-kategori pada ukuran referensi (nilai bawaan ukuran)
       • ukuran           — tambahan per 10 cm dari ukuran referensi (lebar, dalam, tinggi, sisi L,
                            diameter, tinggi headboard) dan per 1 cm tebal top; meja bulat/persegi
                            punya harga dasar sendiri pada diameter referensi
       • pilihan          — tiap pilihan: faktor (×) dan/atau tambahan (IDR) — per sub-kategori
       • material         — kain, warna, kayu, besi, batu, warna HPL: faktor & tambahan (semua sub)
       • per unit         — mis. bantal hias, laci: IDR per buah
     Nilai bawaan ada di file ini; perubahan dari Developer Settings › Harga disimpan sebagai
     selisih (data/pricing.json) dan dipasang lewat XC.setPricing(). */
  var MAT_GROUPS = { uph: UPH, wood: WOOD, metal: METAL, stone: STONE, panel: PANEL };
  var SIZE_KEYS = [
    { id: 'w', l: 'Lebar / panjang', en: 'Width / length', per: 10 }, { id: 'd', l: 'Kedalaman', en: 'Depth', per: 10 }, { id: 'h', l: 'Tinggi', en: 'Height', per: 10 },
    { id: 'ret', l: 'Sisi L / chaise', en: 'Return / chaise', per: 10, ref: 200 }, { id: 'dia', l: 'Diameter / sisi (bulat & persegi)', en: 'Diameter / side', per: 10 },
    { id: 'hbH', l: 'Tinggi headboard', en: 'Headboard height', per: 10 }, { id: 'thick', l: 'Tebal top', en: 'Top thickness', per: 1 }
  ];
  var subKey = function (s) { return s.cat + '.' + s.id; };
  var r1k = function (v) { return Math.round(v / 1000) * 1000; };
  // ukuran pemicu harga sebuah sub-kategori + ukuran referensinya
  /* harga ukuran: 'ratio' = harga dikali (ukuran / ukuran referensi) tiap ukuran, berurutan (aturan pemilik untuk sofa:
     10.000 @ 50 cm → panjang 70: 70/50 × 10.000 = 14.000 → lebar 70: 70/50 × 14.000 = 19.600); 'per10' = tambahan per 10 cm (kategori lain) */
  var RATIO_CATS = { kursi: true };
  function sizeMode(s) { return RATIO_CATS[s.cat] ? 'ratio' : 'per10'; }
  function sizeDrivers(s) {
    var d = s.dims || {}, out = [];
    var has = function (id) { return s.groups.some(function (g) { return g.id === id; }); };
    SIZE_KEYS.forEach(function (k) {
      if (!has(k.id) && !(s.bed && k.id === 'h')) return;
      var ref = k.id === 'ret' ? 200 : k.id === 'dia' ? (s.def.dia || 90) : k.id === 'hbH' ? (s.def.hbH || 110) : k.id === 'thick' ? (s.def.thick || 3) : d[k.id] ? d[k.id][3] : null;
      if (ref != null) out.push({ id: k.id, l: k.l, en: k.en, per: k.per, ref: ref });
    });
    return out;
  }
  // nilai bawaan yang setara dengan rumus lama (pangkat) di sekitar ukuran referensi
  function subDefaults(s) {
    var d = s.dims || {}, base = s.base, per10 = {}, opts = {}, each = {};
    var slope = function (k, ex) { return d[k] ? r1k(base * ex / d[k][3] * 10) : 0; };
    sizeDrivers(s).forEach(function (k) {
      var v = 0;
      if (s.bed) v = k.id === 'h' ? slope('h', .2) : 0;
      else if (s.cab) v = k.id === 'w' ? slope('w', .85) : k.id === 'h' ? slope('h', .85) : k.id === 'd' ? slope('d', .425) : 0;
      else if (s.tableH) v = k.id === 'w' ? slope('w', .7) : k.id === 'd' ? slope('d', .7) : k.id === 'dia' ? r1k(roundBase(s) * 1.4 / k.ref * 10) : 0;
      else v = k.id === 'w' ? slope('w', .9) : k.id === 'd' ? slope('d', .45) : k.id === 'h' ? slope('h', .27) : k.id === 'ret' ? r1k(base * .5 / 200 * 10) : 0;
      per10[k.id] = v;
    });
    s.groups.forEach(function (gr) {
      if (MAT_GROUPS[gr.id] || gr.id === 'color') return;
      if (gr.type === 'range') { if (gr.addEach) each[gr.id] = gr.addEach; return; }
      (typeof gr.opts === 'function' ? [] : gr.opts || []).forEach(function (o) { opts[gr.id + '.' + o.id] = { f: o.f || 1, add: o.add || 0 }; });
    });
    // kasur: dulu lewat rumus ukuran, sekarang tambahan per ukuran kasur
    var mg = s.groups.filter(function (x) { return x.id === 'mattress'; })[0];
    if (s.bed && mg) mg.opts.forEach(function (o) { opts['mattress.' + o.id] = { f: 1, add: r1k(base * (Math.pow(+o.id / 160, .8) - 1)) }; });
    var out = { base: base, per10: per10, opts: opts, each: each };
    if (s.tableH && s.groups.some(function (g) { return g.id === 'dia'; })) out.baseRound = roundBase(s);
    return out;
  }
  function roundBase(s) {
    var d = s.dims || {}, dia = s.def.dia || 90, refArea = d.w ? d.w[3] * d.d[3] : 10000;
    return r1k(s.base * Math.pow(dia * dia / refArea, .7));
  }
  function matDefaults() {
    var m = {};
    Object.keys(MAT_GROUPS).forEach(function (g) { MAT_GROUPS[g].forEach(function (o) { m[g + '.' + o.id] = { f: o.f || 1, add: o.add || 0 }; }); });
    UPH.forEach(function (u) { u.colors.forEach(function (c) { m['color.' + u.id + '.' + c.id] = { f: 1, add: 0 }; }); });
    return m;
  }
  var GLOBAL_DEF = { round: 10000, markup: 0, min: 0 };
  // harga yang dulu disimpan pada pilihan lama → pilihan penggantinya (selisih tetap berlaku)
  var PRICE_ALIAS = {
    'kursi.sofa': { 'back.channel': 'backTuft.channelV', 'back.button': 'backTuft.button', 'leg.castor': 'trim.castor' },
    'kursi.armchair': { 'back.channel': 'backTuft.channelV', 'back.button': 'backTuft.button', 'leg.castor': 'trim.castor', 'shape.swivel': 'base.swivelDisc', 'extras.rocking': 'base.rocking' },
    'kursi.dining': { 'arms.none': 'armStyle.none', 'arms.arms': 'armStyle.carver' },
    'kursi.ottoman': { 'leg.castor': 'trim.castor' },
    'meja.desk': { 'topShape.lshape': 'layout.lright', 'topShape.executive': 'pedestal.right' },
    'meja.dining': { 'base.v': 'base.x' },
    'meja.console': { 'base.pedestal': 'base.pillar' }
  };
  function migratePricing(p) {
    Object.keys(PRICE_ALIAS).forEach(function (sk) {
      var o = p.subs && p.subs[sk], m = PRICE_ALIAS[sk]; if (!o || !o.opts) return;
      Object.keys(m).forEach(function (old) { if (o.opts[old]) { if (!o.opts[m[old]]) o.opts[m[old]] = o.opts[old]; delete o.opts[old]; } });
    });
    return p;
  }
  var PRICE = { global: {}, subs: {}, mats: {} };   // selisih dari bawaan (Developer Settings)
  var cacheDef = {};
  function defOf(s) { var k = subKey(s); return cacheDef[k] || (cacheDef[k] = subDefaults(s)); }
  function merge(def, over) {
    var o = JSON.parse(JSON.stringify(def));
    if (!over) return o;
    if (over.base != null) o.base = +over.base;
    if (over.baseRound != null && o.baseRound != null) o.baseRound = +over.baseRound;
    ['per10', 'each'].forEach(function (k) { for (var j in over[k] || {}) if (o[k][j] != null) o[k][j] = +over[k][j]; });
    for (var j2 in over.opts || {}) if (o.opts[j2]) { var v = over.opts[j2]; if (v.f != null) o.opts[j2].f = +v.f; if (v.add != null) o.opts[j2].add = +v.add; }
    return o;
  }
  function priceTable(s) { return merge(defOf(s), PRICE.subs[subKey(s)]); }
  function matPrice(key) { var d = matDefaults()[key] || { f: 1, add: 0 }, o = PRICE.mats[key]; return { f: o && o.f != null ? +o.f : d.f, add: o && o.add != null ? +o.add : d.add }; }
  function globalPrice() { var g = {}; for (var k in GLOBAL_DEF) g[k] = PRICE.global[k] != null ? +PRICE.global[k] : GLOBAL_DEF[k]; return g; }
  // faktor & tambahan sebuah pilihan pada konfigurasi c
  function optPrice(s, gr, o, c, tbl) {
    if (gr.id === 'color') return matPrice('color.' + c.uph + '.' + o.id);
    if (MAT_GROUPS[gr.id]) return matPrice(gr.id + '.' + o.id);
    return (tbl || priceTable(s)).opts[gr.id + '.' + o.id] || { f: o.f || 1, add: o.add || 0 };
  }

  // rincian harga: dasar, ukuran, tiap pilihan (faktor dirupiahkan berurutan), tambahan, penyesuaian, jumlah unit
  function breakdown(c, L) {
    L = L || function (o) { return o.l; };
    c = current(c);
    var s = sub(c), tbl = priceTable(s), g = globalPrice(), rows = [], adds = [];
    var round = /^(round|square)$/.test(c.topShape) && tbl.baseRound != null;
    var base = round ? tbl.baseRound : tbl.base;
    rows.push({ k: 'base', l: L(s) + (round ? ' · ' + L({ l: 'top bulat / persegi', en: 'round / square top' }) : ''), v: base });
    var size = 0, ratio = sizeMode(s) === 'ratio';
    sizeDrivers(s).forEach(function (k) {
      if (round ? /^(w|d)$/.test(k.id) : k.id === 'dia') return;
      if (k.id === 'ret' && !/^(lkiri|lkanan|lcurve|u|chaise)/.test(c.shape || '')) return;
      if (k.id === 'hbH' && c.headboard === 'none') return;
      var v = +c[k.id]; if (!v || (!ratio && !tbl.per10[k.id])) return;
      var dv = ratio ? (base + size) * (v / k.ref - 1) : tbl.per10[k.id] * (v - k.ref) / k.per;
      if (Math.abs(dv) >= 1) { size += dv; rows.push({ k: 'size', l: L(k) + ' ' + v + ' cm' + (ratio ? ' (× ' + v + '/' + k.ref + ')' : ''), v: dv }); }
    });
    var run = base + size;
    groups(c).forEach(function (gr) {
      if (gr.type === 'range') { var ea = tbl.each[gr.id]; if (ea && +c[gr.id]) adds.push({ k: 'add', l: L(gr) + ' × ' + c[gr.id], v: ea * c[gr.id] }); return; }
      var list = gr.type === 'multi' ? opts(gr, c).filter(function (o) { return (c[gr.id] || []).indexOf(o.id) >= 0; }) : [pick(gr, c)].filter(Boolean);
      list.forEach(function (o) {
        var p = optPrice(s, gr, o, c, tbl);
        if (p.f && p.f !== 1) { var dlt = run * (p.f - 1); run += dlt; rows.push({ k: 'f', l: L(gr) + ' · ' + L(o), v: dlt }); }
        if (p.add) adds.push({ k: 'add', l: L(gr) + ' · ' + L(o), v: p.add });
      });
    });
    rows = rows.concat(adds);
    var unit = run + adds.reduce(function (n, r) { return n + r.v; }, 0);
    if (g.markup) { var mk = unit * g.markup / 100; rows.push({ k: 'markup', l: L({ l: 'Penyesuaian harga', en: 'Price adjustment' }) + ' ' + (g.markup > 0 ? '+' : '') + g.markup + '%', v: mk }); unit += mk; }
    unit = Math.max(g.min || 0, Math.round(unit / (g.round || 1)) * (g.round || 1));
    var qty = Math.max(1, +c.qty || 1);
    return { rows: rows, unit: unit, qty: qty, total: unit * qty };
  }
  function estimate(c) { return breakdown(c).total; }

  // ringkasan berlabel (untuk panel, WhatsApp, dan Developer Settings)
  function summary(c, L) {
    L = L || function (o) { return o.l; };
    c = current(c);
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
    normalize: normalize, normalise: normalize, migrate: migrate, stale: stale,
    estimate: estimate, breakdown: breakdown, summary: summary, dimsText: dimsText, colorOf: colorOf,
    // harga (Developer Settings › Harga)
    setPricing: function (p) { p = migratePricing(p || {}); PRICE = { global: p.global || {}, subs: p.subs || {}, mats: p.mats || {} }; },
    getPricing: function () { return JSON.parse(JSON.stringify(PRICE)); },
    priceTable: priceTable, priceDefaults: function (s) { return JSON.parse(JSON.stringify(defOf(s))); }, sizeDrivers: sizeDrivers, sizeMode: sizeMode,
    matDefaults: matDefaults, matPrice: matPrice, globalPrice: globalPrice, GLOBAL_DEF: GLOBAL_DEF, subKey: subKey, MAT_GROUPS: MAT_GROUPS,
    // modul kategori (spec-*.js): alat bersama + daftarkan / ganti kategori
    K: { O: O, UPH: UPH, WOOD: WOOD, METAL: METAL, STONE: STONE, PANEL: PANEL, M: M, F: F, has: has, seat: seat, notNone: notNone, LEGLESS: LEGLESS, NOFIN: NOFIN, CAPLEG: CAPLEG, TIGHTBACK: TIGHTBACK, tb: tb, G: G, g: g, plus: plus, capOk: capOk, TRIM: TRIM, trimG: trimG, notSerp: notSerp, SOFA_SHAPES: SOFA_SHAPES, ARM: ARM, SOFA_ARM: SOFA_ARM, BACK: BACK, SOFA_BACK: SOFA_BACK, SEATC: SEATC, SOFA_LEGS: SOFA_LEGS, sofaLegs: sofaLegs, noBigMech: noBigMech, acLegs: acLegs, notWF: notWF, AC_ARM: AC_ARM, AC_BACK: AC_BACK, AC_LEGS: AC_LEGS, noLid: noLid, BENCH_LEGS: BENCH_LEGS, woodOnlyBack: woodOnlyBack, dnUph: dnUph, notTubBack: notTubBack, notWish: notWish, stBucket: stBucket, stUph: stUph, notPed: notPed, notWoodFr: notWoodFr, otLegs: otLegs, notOnFrame: notOnFrame, OT_LEGS: OT_LEGS, chLegs: chLegs },
    defineCat: function (cat) { prep(cat); var i = -1; CATS.forEach(function (x, j) { if (x.id === cat.id) i = j; }); if (i >= 0) CATS[i] = cat; else CATS.push(cat); cacheDef = {}; return cat; },
    addMigrate: function (catId, fn) { (MIGR[catId] = MIGR[catId] || []).push(fn); },
    find: function (list, id) { return (list || []).filter(function (o) { return o.id === id; })[0] || null; }
  };
})();
