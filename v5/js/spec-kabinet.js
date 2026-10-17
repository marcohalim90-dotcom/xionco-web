/* ==========================================================================
   Maison XIONCO — spesifikasi Customize: Kabinet & lemari
   Didaftarkan ke XC lewat XC.defineCat (custom-spec.js harus dimuat lebih dulu).

   Susunan kolom (editor per kolom):
     c.layout = [{ k, n, pos, sh, wr }, …]   satu objek per kolom, kiri → kanan
       k   isi kolom      door | glass | drawers | open | combo | dOpen | oDoor | gDoor | flip | tip |
                          hang | hang2 | hangDr | shelf | shelfDr | wine | wDoor | flap | pull
       n   jumlah         laci / flip / tingkat tipping / keranjang pull-out (0 bila tidak dipakai)
       pos posisi/model   top | mid | bottom (laci / rak / kaca) · even | grad (tinggi laci) · grid | diamond (rak anggur)
       sh  jumlah rak     rak di dalam pintu / rak terbuka (0–6)
       wr  lebar relatif  .6 | 1 | 1.5 | 2
   Jumlah pintu / laci / rak dsb. diturunkan dari susunan (kelompok tersembunyi nDoor, nDrawer, …
   dengan addEach → harga per buah, dapat diatur di Developer Settings › Harga). Disinkronkan di
   XC.addMigrate('kabinet') — juga mengubah konfigurasi lama (doorType / doors / drawers / niches).
   window.XKAB = alat bersama untuk pembangun 3D (mk-kabinet.js) dan editor kolom (app.js).
   ========================================================================== */
(function () {
  'use strict';
  var XC = window.XC, K = XC.K;
  var O = K.O, M = K.M, g = K.g, PANEL = K.PANEL, STONE = K.STONE;
  var T_BOARD = .018;   // tebal papan (m) — sama dengan pembangun 3D

  /* ------------------------------------------------------------------ isi kolom */
  var KINDS = [
    O('door', 'Pintu', 'Door', { p: ['sh'], sh: 1 }),
    O('glass', 'Pintu kaca', 'Glass door', { p: ['sh'], sh: 2 }),
    O('drawers', 'Laci', 'Drawers', { p: ['n', 'pos'], n: [1, 8, 3], pos: ['even', 'grad'] }),
    O('open', 'Rak terbuka', 'Open shelves', { se: 'Open shelf', p: ['sh'], sh: 2 }),
    O('combo', 'Laci + pintu', 'Drawer + door', { p: ['n', 'pos', 'sh'], n: [1, 3, 1], pos: ['top', 'mid', 'bottom'], sh: 1 }),
    O('dOpen', 'Laci + rak', 'Drawer + shelf', { p: ['n', 'pos', 'sh'], n: [1, 3, 1], pos: ['top', 'bottom'], sh: 0 }),
    O('oDoor', 'Rak + pintu', 'Shelf + door', { p: ['pos', 'sh'], pos: ['top', 'bottom'], sh: 2 }),
    O('gDoor', 'Kaca + pintu', 'Glass + door', { p: ['pos', 'sh'], pos: ['top', 'bottom'], sh: 2 }),
    O('flip', 'Pintu flip', 'Flip-up door', { s: 'Flip-up', se: 'Flip-up', p: ['n'], n: [1, 3, 1] }),
    O('tip', 'Tipping sepatu', 'Tip-out shoe', { s: 'Tipping', se: 'Tip-out', p: ['n'], n: [1, 4, 3] }),
    O('hang', 'Gantung panjang', 'Long hanging', { s: 'Gantung', se: 'Long hang' }),
    O('hang2', 'Gantung ganda', 'Double hanging', { s: '2 gantungan', se: 'Double hang' }),
    O('hangDr', 'Gantung + laci', 'Hang + drawers', { p: ['n'], n: [1, 4, 2] }),
    O('shelf', 'Rak lipatan', 'Shelves', { p: ['sh'], sh: 4 }),
    O('shelfDr', 'Rak + laci', 'Shelf + drawers', { p: ['n', 'sh'], n: [1, 4, 2], sh: 3 }),
    O('wine', 'Rak anggur', 'Wine rack', { p: ['pos'], pos: ['grid', 'diamond'] }),
    O('wDoor', 'Anggur + pintu', 'Wine + door', { p: ['pos'], pos: ['diamond', 'grid'] }),
    O('flap', 'Bar flap', 'Bar flap', { p: ['sh'], sh: 1, shMax: 2 }),
    O('pull', 'Pull-out', 'Pull-out', { p: ['n'], n: [3, 6, 5] })
  ];
  var KIND = {}; KINDS.forEach(function (k) { KIND[k.id] = k; });
  // isi yang tersedia per sub-kategori (urutan = urutan kartu)
  var SUBK = {
    tv: ['door', 'drawers', 'open', 'combo', 'dOpen', 'flip', 'glass', 'oDoor'],
    sideboard: ['door', 'drawers', 'combo', 'open', 'glass', 'dOpen', 'oDoor', 'wine'],
    wardrobe: ['hang', 'hang2', 'hangDr', 'shelf', 'shelfDr', 'drawers', 'open', 'glass'],
    bookshelf: ['open', 'oDoor', 'dOpen', 'door', 'glass', 'gDoor', 'drawers', 'combo'],
    shoe: ['tip', 'door', 'open', 'combo', 'drawers', 'oDoor'],
    nightstand: ['drawers', 'dOpen', 'combo', 'door', 'open', 'oDoor'],
    dresser: ['drawers', 'dOpen', 'combo', 'door', 'open', 'oDoor'],
    bar: ['gDoor', 'glass', 'flap', 'wine', 'wDoor', 'door', 'drawers', 'combo', 'open'],
    wall: ['door', 'open', 'drawers', 'flip', 'combo', 'dOpen', 'glass'],
    pantry: ['pull', 'door', 'combo', 'oDoor', 'glass', 'gDoor', 'drawers', 'open']
  };
  var MAXC = { tv: 6, sideboard: 6, wardrobe: 6, bookshelf: 6, shoe: 4, nightstand: 2, dresser: 4, bar: 4, wall: 6, pantry: 4 };
  // isi lama / sub lain → pengganti terdekat
  var FALL = {
    door: ['shelf', 'glass', 'open'], glass: ['gDoor', 'door', 'shelf'], drawers: ['shelfDr', 'combo', 'door'], open: ['shelf', 'door'],
    combo: ['shelfDr', 'dOpen', 'drawers', 'door'], dOpen: ['combo', 'shelfDr', 'open'], oDoor: ['gDoor', 'shelf', 'door'], gDoor: ['oDoor', 'glass', 'door'],
    flip: ['tip', 'door', 'shelf'], tip: ['flip', 'door'], hang: ['door', 'pull'], hang2: ['hang', 'door'], hangDr: ['combo', 'hang', 'door'],
    shelf: ['door', 'open'], shelfDr: ['combo', 'drawers', 'door'], wine: ['open', 'door'], wDoor: ['oDoor', 'wine', 'door'], flap: ['gDoor', 'door'], pull: ['door', 'shelf']
  };
  var POS = {
    top: O('top', 'Atas', 'Top'), mid: O('mid', 'Tengah', 'Middle'), bottom: O('bottom', 'Bawah', 'Bottom'),
    even: O('even', 'Sama tinggi', 'Even'), grad: O('grad', 'Bertingkat', 'Graduated'),
    grid: O('grid', 'Kotak', 'Grid'), diamond: O('diamond', 'Diamond', 'Diamond')
  };
  var WR = [O('.6', 'Sempit', 'Narrow'), O('1', 'Normal', 'Normal'), O('1.5', 'Lebar', 'Wide'), O('2', 'Ganda', 'Double')];
  // judul parameter per isi kolom
  function paramL(p, k) {
    if (p === 'n') return k === 'flip' ? O('n', 'Jumlah flip', 'Flip doors') : k === 'tip' ? O('n', 'Jumlah tingkat', 'Tiers') : k === 'pull' ? O('n', 'Keranjang', 'Baskets') : O('n', 'Jumlah laci', 'Drawers');
    if (p === 'pos') return k === 'drawers' ? O('pos', 'Tinggi laci', 'Drawer heights') : /^(combo|dOpen)$/.test(k) ? O('pos', 'Posisi laci', 'Drawer position') : k === 'oDoor' ? O('pos', 'Posisi rak', 'Shelf position') : k === 'gDoor' ? O('pos', 'Posisi kaca', 'Glass position') : O('pos', 'Model rak anggur', 'Wine rack style');
    if (p === 'sh') return O('sh', 'Jumlah rak', 'Shelves');
    return O('wr', 'Lebar kolom', 'Column width');
  }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function kindsFor(sub) { return (SUBK[sub] || SUBK.tv).map(function (id) { return KIND[id]; }); }
  // satu kolom → bentuk kanonik (kunci k, n, pos, sh, wr selalu ada & berurutan tetap)
  function canonCol(col, sub) {
    col = col && typeof col === 'object' ? col : {};
    var list = SUBK[sub] || SUBK.tv, k = col.k;
    if (list.indexOf(k) < 0) { var alt = (FALL[k] || []).filter(function (x) { return list.indexOf(x) >= 0; })[0]; k = alt || list[0]; }
    var d = KIND[k], has = function (p) { return d.p && d.p.indexOf(p) >= 0; };
    var n = has('n') ? clamp(Math.round(+col.n || d.n[2]), d.n[0], d.n[1]) : 0;
    var pos = has('pos') ? (d.pos.indexOf(col.pos) >= 0 ? col.pos : d.pos[0]) : '';
    var sh = has('sh') ? clamp(Math.round(col.sh == null || isNaN(+col.sh) ? d.sh : +col.sh), 0, d.shMax || 6) : 0;
    var wr = +col.wr; wr = WR.some(function (o) { return +o.id === wr; }) ? wr : 1;
    return { k: k, n: n, pos: pos, sh: sh, wr: wr };
  }
  function newCol(k, sub, wr) { var d = KIND[k]; return canonCol({ k: k, n: d.n ? d.n[2] : 0, pos: d.pos ? d.pos[0] : '', sh: d.sh || 0, wr: wr || 1 }, sub); }
  var C = function (k, o) { var r = { k: k }; if (o) for (var q in o) r[q] = o[q]; return r; };

  /* ---------- segmen vertikal sebuah kolom (atas → bawah); tinggi dalam meter, total = ih */
  function drH(ih) { return Math.max(.11, Math.min(.18, ih * .16)); }
  function segs(col, ih, sub) {
    var k = col.k, n = Math.max(1, col.n || 1), sh = col.sh || 0, pos = col.pos;
    var S = function (t, h, o) { var r = { t: t, h: h }; if (o) for (var q in o) r[q] = o[q]; return r; };
    var band = function (cnt, unit, cap) { return Math.min(ih * (cap || .5), cnt * (unit || drH(ih))); };
    var b, rest, dh;
    switch (k) {
      case 'door': case 'shelf': return [S('door', ih, { sh: sh })];
      case 'glass': return [S('glass', ih, { sh: sh })];
      case 'open': return [S('open', ih, { sh: sh })];
      case 'drawers': return [S('drawers', ih, { n: n, grad: pos === 'grad' })];
      case 'flip': return [S('flip', ih, { n: n })];
      case 'tip': return [S('tip', ih, { n: n })];
      case 'pull': return [S('pull', ih, { n: n })];
      case 'wine': return [S('wine', ih, { style: pos })];
      case 'hang': return [S('hang', ih, { rails: 1 })];
      case 'hang2': return [S('hang', ih, { rails: 2 })];
      case 'combo': case 'dOpen':
        b = band(n); rest = ih - b;
        var dr = S('drawers', b, { n: n }), ot = k === 'combo' ? 'door' : 'open';
        if (pos === 'mid' && k === 'combo') return [S('door', rest / 2, { sh: Math.min(sh, 2) }), dr, S('door', rest / 2, { sh: 0 })];
        return pos === 'bottom' ? [S(ot, rest, { sh: sh }), dr] : [dr, S(ot, rest, { sh: sh })];
      case 'oDoor': case 'gDoor': case 'wDoor':
        dh = ih >= 1.1 ? Math.min(.85, ih * .42) : ih * .5;
        var up = k === 'wDoor' ? S('wine', ih - dh, { style: pos }) : S(k === 'oDoor' ? 'open' : 'glass', ih - dh, { sh: sh }), lo = S('door', dh, { sh: ih >= 1.1 ? 1 : 0 });
        return pos === 'bottom' && k !== 'wDoor' ? [lo, up] : [up, lo];
      case 'hangDr': b = band(n, .2, .4); return [S('hang', ih - b, { rails: 1 }), S('drawers', b, { n: n })];
      case 'shelfDr': b = band(n, .2, .4); return [S('door', ih - b, { sh: sh }), S('drawers', b, { n: n })];
      case 'flap':
        if (ih < .9) return [S('flap', ih, { sh: sh })];
        var fh = Math.min(.62, ih * .48); return [S('flap', fh, { sh: sh }), S('door', ih - fh, { sh: 1 })];
    }
    return [S('door', ih, { sh: sh })];
  }
  // lebar tiap kolom (m) di dalam badan selebar Wm (sekat setebal papan di antara kolom)
  function colWidths(Wm, layout) {
    var t = T_BOARD, nc = layout.length, sum = 0;
    layout.forEach(function (q) { sum += +q.wr || 1; });
    var inner = Wm - 2 * t - (nc - 1) * t;
    return layout.map(function (q) { return inner * (+q.wr || 1) / sum; });
  }
  var leavesOf = function (cw) { return cw > .62 ? 2 : 1; };
  function slidePanels(Wm) { return clamp(Math.round(Wm / .9), 2, 4); }

  /* ---------- jumlah turunan (harga per buah) */
  var CNT = [
    { id: 'nDoor', l: 'Daun pintu', en: 'Door leaves', addEach: 250000 },
    { id: 'nGlass', l: 'Pintu kaca', en: 'Glass doors', addEach: 550000 },
    { id: 'nDrawer', l: 'Laci', en: 'Drawers', addEach: 300000 },
    { id: 'nShelf', l: 'Rak / ambalan', en: 'Shelves', addEach: 75000 },
    { id: 'nFlip', l: 'Pintu flip / tipping', en: 'Flip / tip-out doors', addEach: 220000 },
    { id: 'nHang', l: 'Gantungan baju', en: 'Hanging rails', addEach: 150000 },
    { id: 'nWine', l: 'Rak anggur', en: 'Wine racks', addEach: 650000 },
    { id: 'nFlap', l: 'Bar flap', en: 'Bar flaps', addEach: 900000 },
    { id: 'nPull', l: 'Pull-out pantry', en: 'Pantry pull-outs', addEach: 2400000 }
  ];
  function counts(c) {
    var o = {}; CNT.forEach(function (x) { o[x.id] = 0; });
    var lay = c.layout || [], Wm = (+c.w || 100) / 100, ih = (+c.h || 80) / 100 - 2 * T_BOARD, ws = colWidths(Wm, lay);
    var ds = c.doorStyle || 'swing', wardOpen = c.sub === 'wardrobe' && ds === 'open', wardSlide = c.sub === 'wardrobe' && ds === 'sliding';
    lay.forEach(function (col, i) {
      var L = leavesOf(ws[i]);
      if (col.k === 'wine' || col.k === 'wDoor') o.nWine++;
      if (col.k === 'pull') o.nPull++;
      segs(col, ih, c.sub).forEach(function (s) {
        if (s.t === 'drawers') o.nDrawer += s.n;
        else if (s.t === 'flip' || s.t === 'tip') o.nFlip += s.n;
        else if (s.t === 'flap') { o.nFlap++; o.nShelf += s.sh || 0; }
        else if (s.t === 'glass') { o.nGlass += L; o.nShelf += s.sh || 0; }
        else if (s.t === 'door' || s.t === 'hang') { if (!wardOpen && !wardSlide) o.nDoor += L; o.nShelf += s.sh || 0; if (s.t === 'hang') o.nHang += s.rails; }
        else if (s.t === 'open') o.nShelf += s.sh || 0;
      });
    });
    if (wardSlide) o.nDoor += slidePanels(Wm);
    return o;
  }
  // teks ringkasan susunan (panel, WhatsApp, Developer Settings)
  function layoutText(c, L) {
    L = L || function (o) { return o.l; };
    var en = L({ l: 0, en: 1 }) === 1, lay = c.layout || [];
    var parts = lay.map(function (col) {
      var d = KIND[col.k] || KINDS[0], t = L(d), x = [];
      if (d.p && d.p.indexOf('n') >= 0) x.push(col.n + '×');
      if (d.p && d.p.indexOf('pos') >= 0 && POS[col.pos]) x.push(L(POS[col.pos]).toLowerCase());
      if (d.p && d.p.indexOf('sh') >= 0 && col.sh) x.push(col.sh + ' ' + (en ? (col.sh > 1 ? 'shelves' : 'shelf') : 'rak'));
      if (col.wr !== 1) x.push(L(WR.filter(function (o) { return +o.id === col.wr; })[0] || WR[1]).toLowerCase());
      return t + (x.length ? ' (' + x.join(', ') + ')' : '');
    });
    return lay.length + ' ' + (en ? (lay.length > 1 ? 'columns' : 'column') : 'kolom') + ': ' + parts.join(' · ');
  }

  /* ---------- gambar garis (SVG, warna = currentColor) untuk kartu & editor kolom */
  var f1 = function (v) { return Math.round(v * 10) / 10; };
  function svgOpen(vb, cls) { return '<svg class="kx' + (cls ? ' ' + cls : '') + '" viewBox="' + vb + '" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'; }
  var R = function (x, y, w, h, ex) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(.1, w)) + '" height="' + f1(Math.max(.1, h)) + '" rx=".6" vector-effect="non-scaling-stroke"' + (ex || '') + '/>'; };
  var Ln = function (x1, y1, x2, y2, dash) { return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" vector-effect="non-scaling-stroke"' + (dash ? ' stroke-dasharray="2.2 2.2" opacity=".6"' : '') + '/>'; };
  var Pth = function (d, dash) { return '<path d="' + d + '" vector-effect="non-scaling-stroke"' + (dash ? ' stroke-dasharray="2.2 2.2" opacity=".6"' : '') + '/>'; };
  // satu segmen di kotak (x, y, w, h) — koordinat SVG; L = jumlah daun; hr = engsel kanan
  function segSVG(s, x, y, w, h, L, hr) {
    var o = '', i, hl = Math.min(7, h * .22), cy = y + h / 2;
    var shelves = function (dash) { for (var q = 1; q <= (s.sh || 0); q++) { var yy = y + h * q / ((s.sh || 0) + 1); o += Ln(x + 1.2, yy, x + w - 1.2, yy, dash); } };
    if (s.t === 'door' || s.t === 'glass' || s.t === 'hang') {
      if (s.t === 'hang') {   // isi lemari pakaian (tembus pandang): rel + gantungan
        var rails = s.rails === 2 ? [y + h * .12, y + h * .56] : [y + h * .14];
        rails.forEach(function (ry, j) {
          o += Ln(x + 2, ry, x + w - 2, ry, true);
          var gn = Math.max(1, Math.min(3, Math.floor(w / 9))), gl = s.rails === 2 ? h * .34 : h * .58;
          for (var q = 0; q < gn; q++) { var gx = x + w * (q + .5) / gn; o += Pth('M' + f1(gx) + ' ' + f1(ry) + 'l' + f1(-Math.min(4, w / gn * .35)) + ' 3v' + f1(gl - 3) + 'h' + f1(Math.min(8, w / gn * .7)) + 'v' + f1(-(gl - 3)) + 'z', true); }
          if (j === 1) o += Ln(x + 1, ry - 2.5, x + w - 1, ry - 2.5, true);
        });
        o += Ln(x + 1, y + h * .1, x + w - 1, y + h * .1, true);
      } else shelves(s.t === 'door');
      for (i = 0; i < L; i++) {
        var lw = w / L, lx = x + lw * i;
        o += R(lx + .6, y + .6, lw - 1.2, h - 1.2);
        if (s.t === 'glass') { o += R(lx + 3, y + 3, lw - 6, h - 6); o += Ln(lx + lw * .3, y + h * .3, lx + lw * .45, y + h * .18) + Ln(lx + lw * .35, y + h * .42, lx + lw * .58, y + h * .22); }
        var right = L === 2 ? i === 0 : !hr, hx = right ? lx + lw - 3 : lx + 3;
        o += Ln(hx, cy - hl / 2, hx, cy + hl / 2);
      }
    } else if (s.t === 'open') { o += R(x + .6, y + .6, w - 1.2, h - 1.2, ' opacity=".55"'); shelves(false); }
    else if (s.t === 'drawers' || s.t === 'flip' || s.t === 'tip' || s.t === 'pull') {
      var n = s.t === 'pull' ? 1 : Math.max(1, s.n || 1), wts = [], tw = 0;
      for (i = 0; i < n; i++) { var wt = s.grad ? 1 + i * .14 : 1; wts.push(wt); tw += wt; }
      var yy0 = y;
      for (i = 0; i < n; i++) {
        var dh = h * wts[i] / tw, cx = x + w / 2, hw = Math.min(9, w * .28);
        o += R(x + .6, yy0 + .6, w - 1.2, dh - 1.2);
        if (s.t === 'drawers') o += Ln(cx - hw / 2, yy0 + dh / 2, cx + hw / 2, yy0 + dh / 2);
        else if (s.t === 'flip') o += Ln(cx - hw / 2, yy0 + dh - 3, cx + hw / 2, yy0 + dh - 3);
        else if (s.t === 'tip') { o += Ln(cx - hw / 2, yy0 + 3, cx + hw / 2, yy0 + 3); o += Ln(x + 3, yy0 + dh - 2.5, x + w - 3, yy0 + dh * .35, true); }
        else { o += Ln(x + w - 3, yy0 + dh * .08, x + w - 3, yy0 + dh * .08 + hl); for (var q = 1; q <= (s.n || 4); q++) { var by = yy0 + dh * q / ((s.n || 4) + 1); o += Ln(x + 3, by, x + w - 5, by, true); } }
        yy0 += dh;
      }
    } else if (s.t === 'wine') {
      o += R(x + .6, y + .6, w - 1.2, h - 1.2, ' opacity=".55"');
      if (s.style === 'diamond') {
        var st = Math.max(5, Math.min(w, h) / 3);
        for (var k2 = -h; k2 < w; k2 += st) {   // garis x - y = k2 dan x + y = k2 + h di dalam kotak
          var a1 = Math.max(0, k2), a2 = Math.min(w, k2 + h); if (a2 - a1 > .5) o += Ln(x + a1, y + a1 - k2, x + a2, y + a2 - k2);
          var b1 = Math.max(0, k2), b2 = Math.min(w, k2 + h); if (b2 - b1 > .5) o += Ln(x + b1, y + h - (b1 - k2), x + b2, y + h - (b2 - k2));
        }
      } else {
        var cs = Math.max(4.5, Math.min(w, h) / Math.max(2, Math.round(Math.min(w, h) / 7))), nx = Math.max(1, Math.round(w / cs)), ny = Math.max(1, Math.round(h / cs));
        for (i = 1; i < nx; i++) o += Ln(x + w * i / nx, y + 1, x + w * i / nx, y + h - 1);
        for (i = 1; i < ny; i++) o += Ln(x + 1, y + h * i / ny, x + w - 1, y + h * i / ny);
      }
    } else if (s.t === 'flap') {
      o += R(x + .6, y + .6, w - 1.2, h - 1.2) + Ln(x + w / 2 - Math.min(5, w * .2), y + 3.5, x + w / 2 + Math.min(5, w * .2), y + 3.5);
      var by2 = y + h * .62, bw = Math.min(3.2, w * .1);
      o += Ln(x + 2, by2, x + w - 2, by2, true);
      [.3, .5].forEach(function (f) { var bx = x + w * f; o += Pth('M' + f1(bx - bw / 2) + ' ' + f1(by2) + 'v' + f1(-h * .2) + 'l' + f1(bw / 4) + ' ' + f1(-h * .05) + 'v' + f1(-h * .06) + 'h' + f1(bw / 2) + 'v' + f1(h * .06) + 'l' + f1(bw / 4) + ' ' + f1(h * .05) + 'v' + f1(h * .2) + 'z', true); });
      o += Pth('M' + f1(x + w * .72 - 2) + ' ' + f1(by2 - h * .17) + 'h4l-1 ' + f1(h * .07) + 'h-2z' + 'M' + f1(x + w * .72) + ' ' + f1(by2 - h * .1) + 'v' + f1(h * .1), true);
    }
    return o;
  }
  // satu kolom (x, y, w, h) — ih/cw dalam meter untuk proporsi segmen & daun pintu
  function colSVG(col, sub, x, y, w, h, ihM, cwM, hr, doorStyle) {
    var ss = segs(col, ihM, sub), tot = 0, o = '', yy = y;
    ss.forEach(function (s) { tot += s.h; });
    var L = leavesOf(cwM || .5);
    ss.forEach(function (s, i) {
      var sh2 = h * s.h / tot;
      if (doorStyle === 'open' && (s.t === 'door' || s.t === 'hang')) { var s2 = {}; for (var q in s) s2[q] = s[q]; if (s.t === 'door') s2.t = 'open'; o += s.t === 'hang' ? segSVG(s, x, yy, w, sh2, 0, hr) : segSVG(s2, x, yy, w, sh2, L, hr); }
      else o += segSVG(s, x, yy, w, sh2, L, hr);
      if (i) o += Ln(x, yy, x + w, yy);
      yy += sh2;
    });
    return o;
  }
  // tampak depan seluruh kabinet di kotak 100×100 (kartu preset / jenis)
  function frontSVG(cfg, o) {
    o = o || {};
    var Wc = +cfg.w || 100, Hc = +cfg.h || 80, lay = cfg.layout || [], sub = cfg.sub, base = o.base == null ? 10 : o.base, top = cfg.top && cfg.top !== 'same' ? 2 : 0;
    var sc = Math.min(84 / Wc, (84 - base - top) / Hc), w = Wc * sc, h = Hc * sc, x0 = 50 - w / 2, y0 = 50 - (h + base + top) / 2 + top;
    var s = svgOpen('0 0 100 100'), ws = colWidths(Wc / 100, lay), sw = 0;
    ws.forEach(function (v) { sw += v; });
    s += R(x0, y0, w, h);
    if (top) s += R(x0 - 1.2, y0 - top, w + 2.4, top);
    var ihM = Hc / 100 - 2 * T_BOARD, xx = x0 + 1;
    lay.forEach(function (col, i) {
      var cw = (w - 2) * ws[i] / sw;
      if (i) s += Ln(xx, y0, xx, y0 + h);
      s += colSVG(col, sub, xx, y0 + 1, cw, h - 2, ihM, ws[i], i >= lay.length / 2, cfg.doorStyle);
      xx += cw;
    });
    if (cfg.doorStyle === 'sliding' && (sub === 'wardrobe')) { s += Ln(x0 + w / 2, y0 + 2, x0 + w / 2, y0 + h - 2); }
    var yb = y0 + h, mt = cfg.mount || 'legs';
    if (sub === 'wall') { s += Ln(x0 - 6, 6, x0 - 6, 94, true); }
    else if (mt === 'plinth') s += R(x0 + 2, yb, w - 4, base * .5);
    else if (mt === 'castor') [x0 + 4, x0 + w - 4].forEach(function (lx) { s += '<circle cx="' + f1(lx) + '" cy="' + f1(yb + 2.6) + '" r="2.2" vector-effect="non-scaling-stroke"/>'; });
    else if (mt === 'floating') s += Ln(x0 - 4, y0 - 6, x0 - 4, yb + 6, true);
    else if (base) [x0 + 3, x0 + w - 3].forEach(function (lx, j) { var sp = cfg.leg === 'splay' || cfg.leg === 'tapered' ? (j ? 1.4 : -1.4) : 0; s += Ln(lx, yb, lx + sp, yb + base * .8); });
    return s + '</svg>';
  }
  // ikon garis kecil untuk pilihan baru (tanpa gambar render) — kotak 100×100
  function ico(body) { return svgOpen('0 0 100 100') + body + '</svg>'; }
  var ICO = {
    swing: ico(R(22, 20, 56, 62) + Ln(50, 20, 50, 82) + Pth('M50 82 L32 90 L32 28 L50 20', true) + Ln(44, 46, 44, 56) + Ln(56, 46, 56, 56)),
    sliding: ico(R(18, 20, 64, 62) + R(22, 24, 30, 54) + R(48, 24, 30, 54) + Pth('M30 51h12m-4-4 4 4-4 4', true) + Ln(66, 46, 66, 56)),
    folding: ico(R(18, 20, 64, 62) + Pth('M18 22l14 6v52l-14 2M32 28l14-6v60l-14-2', false) + Ln(64, 46, 64, 56) + Ln(50, 22, 50, 82)),
    open: ico(R(18, 20, 64, 62) + Ln(50, 20, 50, 82) + Ln(22, 34, 78, 34, true) + Pth('M34 34l-5 4v20h10V38z', true) + Ln(54, 48, 78, 48) + Ln(54, 64, 78, 64)),
    same: ico(R(16, 36, 68, 36) + Ln(16, 36, 84, 36) + Ln(50, 36, 50, 72) + Ln(22, 72, 22, 80) + Ln(78, 72, 78, 80)),
    wood: ico(R(14, 30, 72, 6) + R(16, 36, 68, 36) + Pth('M20 33h14m6 0h20m6 0h12', true) + Ln(50, 36, 50, 72) + Ln(22, 72, 22, 80) + Ln(78, 72, 78, 80)),
    stone: ico(R(14, 31, 72, 5) + R(16, 36, 68, 36) + Pth('M24 34l8-3m14 3l10-3m10 3l8-3', true) + Ln(50, 36, 50, 72) + Ln(22, 72, 22, 80) + Ln(78, 72, 78, 80)),
    clear: ico(R(30, 14, 40, 72) + R(35, 19, 30, 62) + Ln(40, 40, 48, 30) + Ln(42, 50, 56, 34)),
    fluted: ico(R(30, 14, 40, 72) + R(35, 19, 30, 62) + [39, 43, 47, 51, 55, 59, 63].map(function (x) { return Ln(x, 21, x, 79); }).join('')),
    bronze: ico(R(30, 14, 40, 72) + R(35, 19, 30, 62) + Pth('M35 70l30-26M35 58l30-26M35 46l30-26', true)),
    frosted: ico(R(30, 14, 40, 72) + R(35, 19, 30, 62) + [26, 34, 42, 50, 58, 66, 74].map(function (y, i) { return Ln(38 + (i % 2) * 3, y, 62 - (i % 2) * 3, y, true); }).join('')),
    console: ico(Ln(12, 12, 12, 88, true) + R(16, 52, 70, 16) + Ln(39, 52, 39, 68) + Ln(63, 52, 63, 68) + Ln(28, 60, 28, 60.5) + Pth('M30 22h40v22H30z', true)),
    cabinet: ico(Ln(12, 12, 12, 88, true) + R(18, 18, 66, 30) + Ln(51, 18, 51, 48) + Ln(46, 38, 46, 44) + Ln(56, 38, 56, 44) + Pth('M18 74h66', true)),
    desk: ico(Ln(12, 12, 12, 88, true) + R(18, 16, 64, 24) + Ln(39, 16, 39, 40) + Ln(61, 16, 61, 40) + R(16, 58, 68, 4) + R(38, 62, 24, 7) + Ln(46, 65.5, 54, 65.5)),
    shelf: ico(Ln(12, 12, 12, 88, true) + R(18, 20, 22, 16) + R(44, 30, 22, 16) + R(26, 52, 22, 16) + R(56, 60, 24, 16)),
    none: ico(Ln(16, 14, 16, 86, true) + R(26, 50, 60, 18) + Ln(56, 50, 56, 68)),
    flat: ico(R(18, 12, 64, 76) + R(26, 54, 48, 14) + Ln(50, 54, 50, 68)),
    flutedP: ico(R(18, 12, 64, 76) + [24, 30, 36, 42, 48, 54, 60, 66, 72, 78].map(function (x) { return Ln(x, 14, x, 52) + Ln(x, 70, x, 86); }).join('') + R(26, 54, 48, 14)),
    slat: ico(R(18, 12, 64, 76) + [26, 36, 46, 56, 66, 76].map(function (x) { return R(x - 2.5, 14, 5, 72, ' opacity=".7"'); }).join('') + R(24, 54, 52, 14)),
    led: ico(R(22, 20, 56, 60) + Ln(28, 26, 72, 26) + Pth('M34 30l-4 10M50 30v12M66 30l4 10', true) + Ln(26, 54, 74, 54)),
    soft: ico(R(22, 26, 56, 48) + Ln(40, 50, 60, 50) + Pth('M66 36c6 4 6 24 0 28', true) + Pth('M72 32c9 6 9 30 0 36', true)),
    lock: ico(R(30, 46, 40, 32) + Pth('M38 46V36a12 12 0 0 1 24 0v10') + Ln(50, 58, 50, 66)),
    mirror: ico(R(28, 12, 44, 76) + R(33, 17, 34, 66) + Ln(38, 40, 50, 26) + Ln(40, 52, 58, 30)),
    mback: ico(R(18, 20, 64, 60) + R(24, 26, 52, 48, ' stroke-dasharray="2.2 2.2" opacity=".6"') + Ln(30, 48, 44, 34) + Ln(34, 60, 54, 38) + Ln(18, 56, 82, 56)),
    stem: ico(Ln(16, 22, 84, 22) + [30, 50, 70].map(function (x) { return Pth('M' + (x - 5) + ' 22h10M' + x + ' 22v12M' + (x - 7) + ' 52c0-10 3-18 7-18s7 8 7 18z'); }).join('')),
    tray: ico(R(18, 34, 64, 34) + Ln(18, 46, 82, 46, true) + Ln(40, 46, 40, 68, true) + Ln(61, 46, 61, 68, true) + Ln(40, 57, 82, 57, true)),
    usb: ico(R(26, 30, 48, 40) + R(36, 44, 12, 6) + R(54, 44, 12, 6) + Ln(42, 56, 42, 60) + Ln(60, 56, 60, 60)),
    cable: ico(R(16, 44, 68, 30) + Pth('M58 44a8 3 0 1 0 16 0a8 3 0 1 0-16 0', false) + Pth('M66 44c0 14-10 20-22 30', true)),
    deskDr: ico(R(14, 34, 72, 5) + R(34, 39, 32, 12) + Ln(44, 45, 56, 45) + Ln(18, 39, 18, 62, true)),
    splay: ico(R(16, 30, 68, 40) + Ln(50, 30, 50, 70) + Ln(24, 70, 18, 86) + Ln(76, 70, 82, 86)),
    block: ico(R(16, 30, 68, 40) + Ln(50, 30, 50, 70) + R(20, 70, 9, 12) + R(71, 70, 9, 12)),
    openFrame: ico(R(18, 24, 64, 42) + Ln(50, 24, 50, 66) + Pth('M16 66h68M18 66v18M82 66v18M18 80h64')),
    dresser: ico(R(20, 22, 60, 52) + [35, 48, 61].map(function (y) { return Ln(20, y, 80, y); }).join('') + Ln(50, 22, 50, 35) + [28.5, 41.5, 54.5, 67.5].map(function (y) { return Ln(44, y, 56, y); }).join('') + Ln(25, 74, 22, 84) + Ln(75, 74, 78, 84)),
    bar: ico(R(26, 12, 48, 74) + Ln(26, 50, 74, 50) + R(30, 16, 40, 30) + Pth('M38 46V34l2-3v-4h2v4l2 3v12M52 46V36l2-3v-4h2v4l2 3v10', true) + Ln(50, 50, 50, 86) + Ln(46, 64, 46, 72) + Ln(54, 64, 54, 72) + Ln(30, 86, 30, 92) + Ln(70, 86, 70, 92)),
    wall: ico(Ln(14, 8, 14, 92, true) + R(20, 46, 66, 20) + Ln(42, 46, 42, 66) + Ln(64, 46, 64, 66) + Ln(30, 56, 32, 56) + Pth('M22 16h60v24H22z', true)),
    pantry: ico(R(32, 8, 36, 84) + Ln(62, 14, 62, 26) + [24, 40, 56, 72].map(function (y) { return Pth('M36 ' + y + 'h24v8H36z', true); }).join(''))
  };

  /* ------------------------------------------------------------------ kelompok pilihan */
  var IN = function (re) { return function (c) { return re.test(c.sub); }; };
  var layHas = function (re) { return function (c) { return (c.layout || []).some(function (q) { return re.test(q.k); }); }; };
  var hasDrawers = function (c) { return (c.layout || []).some(function (q) { return /^(drawers|combo|dOpen|hangDr|shelfDr)$/.test(q.k); }); };
  var hasDoors = layHas(/^(door|combo|oDoor|gDoor|glass|hang|hang2|hangDr|shelf|shelfDr|wDoor|flap)$/);
  var isWall = function (c) { return c.sub === 'wall'; };
  var notWall = function (c) { return c.sub !== 'wall'; };

  var LAYOUT_G = {
    id: 'layout', step: 'bentuk', type: 'layout', l: 'Susunan kolom', en: 'Column layout',
    // satu "pilihan" = susunan saat ini (identitas array) → XC.pick / ringkasan / harga tetap bekerja tanpa kait khusus
    opts: function (c) { return c && Array.isArray(c.layout) ? [{ id: c.layout, l: layoutText(c), en: layoutText(c, function (o) { return o.en || o.l; }) }] : []; }
  };
  var CNT_G = CNT.map(function (x) { return { id: x.id, step: '_', type: 'range', l: x.l, en: x.en, unit: 'pcs', min: 0, max: 99, inc: 1, addEach: x.addEach }; });

  function topG(stoneAdd, woodAdd) {
    return { id: 'top', step: 'bentuk', type: 'chips', l: 'Top', en: 'Top', off: 'same', opts: [O('same', 'Senada badan', 'Same as body', { s: 'Senada', se: 'Same', svg: ICO.same }),
      O('wood', 'Top kayu solid', 'Solid wood top', { s: 'Kayu solid', se: 'Solid wood', add: woodAdd, svg: ICO.wood }), O('stone', 'Top marmer / batu', 'Stone top', { s: 'Marmer / batu', se: 'Stone', add: stoneAdd, svg: ICO.stone })] };
  }
  var TOP_STONE = STONE.map(function (o) {
    var sh = { carrara: 'Carrara', calacatta: 'Calacatta', nero: 'Nero Marquina', travertine: 'Travertine', terrazzo: 'Terrazzo', slate: 'Sintered slate' }[o.id];
    return O(o.id, o.l, o.en, { s: sh, se: sh, hex: o.hex, vein: o.vein, speck: o.speck, add: { calacatta: 350000, nero: 250000, slate: 150000 }[o.id] || 0 });
  });
  var DOOR_STYLE = function (slideAdd) {
    return { id: 'doorStyle', step: 'bentuk', type: 'chips', l: 'Model pintu', en: 'Door style', off: 'swing', when: function (c) { return hasDoors(c) && c.sub !== 'wall'; }, opts: [
      O('swing', 'Pintu engsel', 'Hinged doors', { s: 'Engsel', se: 'Hinged', svg: ICO.swing }), O('sliding', 'Pintu geser', 'Sliding doors', { s: 'Geser', se: 'Sliding', add: slideAdd, svg: ICO.sliding }),
      O('folding', 'Pintu lipat', 'Folding doors', { s: 'Lipat', se: 'Folding', add: 700000, svg: ICO.folding, when: IN(/^wardrobe$/) }),
      O('open', 'Tanpa pintu (terbuka)', 'No doors (open)', { s: 'Tanpa pintu', se: 'No doors', f: .85, svg: ICO.open, when: IN(/^wardrobe$/) })] };
  };
  var GLASS_G = { id: 'glassType', step: 'bentuk', type: 'chips', l: 'Jenis kaca', en: 'Glass type', off: 'clear', when: layHas(/^(glass|gDoor)$/), opts: [
    O('clear', 'Kaca bening', 'Clear glass', { s: 'Bening', se: 'Clear', svg: ICO.clear }), O('fluted', 'Kaca fluted (reeded)', 'Fluted / reeded glass', { s: 'Fluted', se: 'Fluted', add: 450000, svg: ICO.fluted }),
    O('bronze', 'Kaca bronze', 'Bronze tinted glass', { s: 'Bronze', se: 'Bronze', add: 250000, svg: ICO.bronze }), O('frosted', 'Kaca buram (sandblast)', 'Frosted glass', { s: 'Buram', se: 'Frosted', add: 200000, svg: ICO.frosted })] };
  var WALLTYPE_G = { id: 'wallType', step: 'bentuk', type: 'chips', l: 'Model gantung', en: 'Wall unit type', when: isWall, opts: [
    O('console', 'Konsol melayang (TV)', 'Floating console (TV)', { s: 'Konsol TV', se: 'TV console', svg: ICO.console }), O('cabinet', 'Kabinet atas', 'Upper cabinet', { svg: ICO.cabinet }),
    O('desk', 'Meja dinding + kabinet', 'Wall desk + hutch', { s: 'Meja dinding', se: 'Wall desk', add: 900000, svg: ICO.desk }), O('shelf', 'Rak dinding modular', 'Modular wall shelving', { s: 'Rak dinding', se: 'Wall shelving', f: .9, svg: ICO.shelf })],
    preset: {
      w: { console: 180, cabinet: 120, desk: 120, shelf: 150 }, h: { console: 36, cabinet: 60, desk: 60, shelf: 90 }, d: { console: 38, cabinet: 35, desk: 55, shelf: 28 }, elev: { console: 30, cabinet: 145, desk: 110, shelf: 100 },
      layout: { console: [C('door'), C('open', { sh: 0 }), C('drawers', { n: 1 }), C('door')], cabinet: [C('door', { sh: 1 }), C('door', { sh: 1 }), C('flip', { n: 1, wr: 1.5 })],
        desk: [C('open', { sh: 1 }), C('door', { sh: 1, wr: 1.5 }), C('open', { sh: 1 })], shelf: [C('open', { sh: 2 }), C('open', { sh: 2 }), C('open', { sh: 2 })] }
    } };
  var WALLPANEL_G = { id: 'wallPanel', step: 'material', type: 'chips', l: 'Panel dinding', en: 'Wall panel', off: 'none', when: isWall, opts: [
    O('none', 'Tanpa panel', 'No panel', { s: 'Tanpa', se: 'None', svg: ICO.none }), O('flat', 'Panel polos', 'Plain panel', { s: 'Polos', se: 'Plain', add: 1200000, svg: ICO.flat }),
    O('fluted', 'Panel fluted', 'Fluted panel', { s: 'Fluted', se: 'Fluted', add: 1900000, svg: ICO.flutedP }), O('slat', 'Panel kisi kayu', 'Wood slat panel', { s: 'Kisi kayu', se: 'Slats', add: 1700000, svg: ICO.slat })] };
  var ELEV_G = { id: 'elev', step: 'ukuran', type: 'range', l: 'Tinggi pasang (dari lantai)', en: 'Mounting height (from floor)', unit: 'cm', min: 10, max: 180, inc: 5, when: isWall };

  function cabGroups(extra) {
    extra = extra || {};
    var gs = [LAYOUT_G];
    if (extra.wall) gs.unshift(WALLTYPE_G);
    if (extra.doors) gs.push(DOOR_STYLE(extra.doors));
    gs.push(GLASS_G);
    if (extra.top) gs.push(topG(extra.top[0], extra.top[1]), { id: 'topStone', step: 'bentuk', type: 'swatch', l: 'Batu top', en: 'Top stone', opts: TOP_STONE, when: function (c) { return c.top === 'stone'; } });
    gs.push(g('w'), g('d', extra.wall ? { l: 'Kedalaman', en: 'Depth' } : null), g('h', extra.wall ? { l: 'Tinggi kabinet', en: 'Cabinet height' } : null));
    if (extra.wall) gs.push(ELEV_G);
    gs.push(
      { id: 'finish', step: 'material', type: 'chips', l: 'Finishing muka', en: 'Front finish', opts: [O('hpl', 'HPL', 'HPL laminate', { f: .9 }), O('veneer', 'Veneer kayu', 'Wood veneer'), O('solid', 'Kayu solid', 'Solid wood', { f: 1.3 }),
        O('duco', 'Duco doff', 'Matte lacquer', { f: 1.08 }), O('gloss', 'Duco glossy', 'Gloss lacquer', { f: 1.15 }), O('fluted', 'Fluted (kisi vertikal)', 'Fluted', { s: 'Fluted', f: 1.18 }), O('cane', 'Rotan / cane', 'Rattan cane', { f: 1.2 })] },
      g('wood', { when: function (c) { return /^(veneer|solid|fluted|cane)$/.test(c.finish) || c.top === 'wood' || c.mount === 'legs' && /^(tapered|straight|splay|block)$/.test(c.leg) || c.wallPanel === 'slat' || c.wallPanel === 'fluted' || layHas(/^(glass|gDoor)$/)(c); } }),
      { id: 'panel', step: 'material', type: 'swatch', l: 'Warna HPL / duco', en: 'HPL / paint colour', opts: PANEL, when: function (c) { return /^(hpl|duco|gloss)$/.test(c.finish); } },
      { id: 'carcass', step: 'material', type: 'chips', l: 'Material badan', en: 'Carcass', opts: [O('multiplek', 'Multiplek (plywood)', 'Plywood', { s: 'Multiplek', se: 'Plywood' }), O('blockboard', 'Blockboard', 'Blockboard', { f: .95 }), O('solid', 'Kayu solid', 'Solid wood', { f: 1.25 }), O('mdf', 'MDF', 'MDF', { f: .9 })] }
    );
    if (extra.wall) gs.push(WALLPANEL_G);
    gs.push(
      { id: 'handle', step: 'detail', type: 'chips', l: 'Handle', en: 'Handles', opts: [O('push', 'Tanpa handle (push to open)', 'Handleless (push-to-open)', { s: 'Push to open', se: 'Push to open', add: 200000 }), O('grip', 'Profil grip (J)', 'J-profile grip', { se: 'J-grip' }), O('bar', 'Handle batang', 'Bar handle'),
        O('knob', 'Knob', 'Knob'), O('tab', 'Tab kulit', 'Leather tab', { add: 100000 }), O('recessed', 'Coakan (recessed)', 'Recessed pull', { s: 'Coakan', se: 'Recessed' })] },
      g('metal', { l: 'Finishing handle / besi', en: 'Handle / metal finish', when: function (c) { return /^(bar|knob)$/.test(c.handle) || c.mount === 'legs' && /^(round|hairpin|sled|openFrame)$/.test(c.leg) || c.mount === 'castor'; } })
    );
    if (!extra.wall) gs.push(
      { id: 'mount', step: 'detail', type: 'chips', l: 'Dudukan kabinet', en: 'Mounting', opts: [O('legs', 'Berkaki', 'On legs'), O('plinth', 'Plinth', 'Plinth'), O('floating', 'Gantung di dinding', 'Wall-hung (floating)', { s: 'Gantung', se: 'Wall-hung', add: 250000 }), O('castor', 'Roda', 'Castors', { add: 200000 })] },
      { id: 'leg', step: 'detail', type: 'chips', l: 'Bentuk kaki', en: 'Leg style', opts: [O('tapered', 'Kayu tapered', 'Tapered wood'), O('straight', 'Kayu lurus', 'Straight wood'), O('splay', 'Kaki miring (mid-century)', 'Splayed (mid-century)', { s: 'Kaki miring', se: 'Splayed', svg: ICO.splay }),
        O('block', 'Blok kotak', 'Block', { svg: ICO.block }), O('round', 'Besi bulat', 'Round metal'), O('hairpin', 'Hairpin', 'Hairpin'), O('sled', 'Sled', 'Sled'), O('openFrame', 'Rangka besi', 'Metal frame base', { se: 'Metal frame', add: 450000, svg: ICO.openFrame })], when: function (c) { return c.mount === 'legs'; } },
      g('legH', { when: function (c) { return c.mount === 'legs'; } })
    );
    gs.push({ id: 'interior', step: 'detail', type: 'multi', l: 'Isi dalam & aksesori', en: 'Interior & accessories', opts: [
      O('led', 'Lampu LED', 'LED lighting', { add: 500000, svg: ICO.led }), O('soft', 'Soft close', 'Soft-close hinges & runners', { se: 'Soft close', add: 300000, svg: ICO.soft }), O('lock', 'Kunci', 'Lock', { add: 150000, svg: ICO.lock }),
      O('mirror', 'Cermin di pintu', 'Mirrored door', { s: 'Cermin pintu', se: 'Mirror door', add: 600000, svg: ICO.mirror, when: function (c) { return c.sub === 'wardrobe' && c.doorStyle !== 'open'; } }),
      O('mback', 'Cermin belakang', 'Mirrored back', { s: 'Cermin dalam', se: 'Mirror back', add: 450000, svg: ICO.mback, when: function (c) { return /^(bar|bookshelf|sideboard|wall|tv)$/.test(c.sub) && layHas(/^(open|glass|gDoor|oDoor|dOpen|wine|wDoor|flap)$/)(c); } }),
      O('stem', 'Rak gelas gantung', 'Stemware rack', { s: 'Rak gelas', se: 'Stemware', add: 350000, svg: ICO.stem, when: function (c) { return /^(bar|sideboard)$/.test(c.sub) && layHas(/^(glass|gDoor|flap|open|oDoor)$/)(c); } }),
      O('tray', 'Baki beludru di laci', 'Velvet drawer tray', { s: 'Baki beludru', se: 'Velvet tray', add: 250000, svg: ICO.tray, when: hasDrawers }),
      O('usb', 'Port USB / VAZRA', 'USB / VAZRA power port', { s: 'USB / VAZRA', se: 'USB / VAZRA', add: 350000, svg: ICO.usb, when: IN(/^(nightstand|tv|wall|sideboard|dresser)$/) }),
      O('cable', 'Lubang kabel', 'Cable outlet', { se: 'Cable outlet', add: 80000, svg: ICO.cable, when: IN(/^(tv|wall|sideboard)$/) }),
      O('deskDr', 'Laci bawah meja', 'Under-desk drawer', { s: 'Laci meja', se: 'Desk drawer', add: 450000, svg: ICO.deskDr, when: function (c) { return c.sub === 'wall' && c.wallType === 'desk'; } })] });
    return gs.concat(CNT_G);
  }

  /* ------------------------------------------------------------------ sub-kategori */
  var BASE = { finish: 'veneer', wood: 'walnut', panel: 'ivory', metal: 'brass', handle: 'grip', mount: 'legs', leg: 'tapered', legH: 14, carcass: 'multiplek', interior: [], doorStyle: 'swing', glassType: 'clear', top: 'same', topStone: 'carrara' };
  function def(o) { var r = {}, k; for (k in BASE) r[k] = Array.isArray(BASE[k]) ? BASE[k].slice() : BASE[k]; for (k in o) r[k] = o[k]; return r; }
  // preset susunan per sub: { id, l, en, s, layout, dims }
  var P = function (id, l, en, layout, dims, s) { return { id: id, l: l, en: en, s: s, layout: layout, dims: dims || null }; };
  var PRESETS = {
    tv: [P('classic', 'Klasik', 'Classic', [C('door'), C('drawers', { n: 2 }), C('open', { sh: 0 }), C('door')]),
      P('drawers', 'Laci penuh', 'All drawers', [C('drawers', { n: 2 }), C('drawers', { n: 2 }), C('drawers', { n: 2 })]),
      P('flip', 'Flip-up', 'Flip-up', [C('flip'), C('flip'), C('flip')]),
      P('open', 'Rak + laci', 'Shelf + drawer', [C('dOpen', { n: 1, pos: 'bottom', sh: 0 }), C('dOpen', { n: 1, pos: 'bottom', sh: 0, wr: 1.5 }), C('dOpen', { n: 1, pos: 'bottom', sh: 0 })]),
      P('glass', 'Kaca + laci', 'Glass + drawers', [C('glass', { sh: 1 }), C('drawers', { n: 2, wr: 1.5 }), C('glass', { sh: 1 })]),
      P('asym', 'Asimetris', 'Asymmetric', [C('open', { sh: 0, wr: 1.5 }), C('combo', { n: 1, pos: 'top' }), C('door')]),
      P('low', 'Low panjang', 'Long & low', [C('door'), C('door'), C('open', { sh: 0, wr: 1.5 }), C('door'), C('door')], { w: 240, h: 40 })],
    sideboard: [P('mid', 'Laci tengah', 'Centre drawers', [C('door'), C('drawers', { n: 3 }), C('door')]),
      P('3door', 'Buffet 3 pintu', '3-door buffet', [C('door'), C('door'), C('door')]),
      P('top', 'Laci atas', 'Drawers on top', [C('combo', { n: 1, pos: 'top' }), C('combo', { n: 1, pos: 'top' }), C('combo', { n: 1, pos: 'top' })]),
      P('4door', 'Credenza 4', '4-door credenza', [C('door'), C('door'), C('door'), C('door')], { w: 200 }),
      P('glass', 'Kaca + laci', 'Glass + drawers', [C('glass', { sh: 1 }), C('drawers', { n: 3 }), C('glass', { sh: 1 })]),
      P('wine', 'Buffet anggur', 'Wine buffet', [C('door'), C('wine', { pos: 'diamond' }), C('door')]),
      P('chest', 'Laci penuh', 'All drawers', [C('drawers', { n: 3 }), C('drawers', { n: 3 }), C('drawers', { n: 3 })])],
    wardrobe: [P('4door', '4 pintu', '4 doors', [C('hang'), C('shelf', { sh: 4 }), C('shelfDr', { n: 2, sh: 2 }), C('hang2')]),
      P('2door', '2 pintu', '2 doors', [C('hang'), C('shelfDr', { n: 2, sh: 3 })], { w: 100 }),
      P('3door', '3 pintu', '3 doors', [C('hang'), C('shelfDr', { n: 3, sh: 2 }), C('hang2')], { w: 150 }),
      P('wide', 'Gantung lebar', 'Wide hanging', [C('hang', { wr: 2 }), C('shelf', { sh: 5 }), C('hang2', { wr: 2 })], { w: 240 }),
      P('6door', '6 pintu', '6 doors', [C('hang'), C('hang'), C('shelfDr', { n: 3, sh: 3 }), C('shelf', { sh: 5 }), C('hang2'), C('hang2')], { w: 270 }),
      P('dress', 'Walk-in', 'Walk-in', [C('hang2'), C('drawers', { n: 5, pos: 'grad' }), C('open', { sh: 5 }), C('hang')], { w: 220 })],
    bookshelf: [P('lower', 'Rak + pintu', 'Shelf + doors', [C('oDoor', { pos: 'top', sh: 3 }), C('oDoor', { pos: 'top', sh: 3 })]),
      P('open', 'Rak penuh', 'All open', [C('open', { sh: 4 }), C('open', { sh: 4 }), C('open', { sh: 4 })]),
      P('drawer', 'Rak + laci', 'Shelf + drawers', [C('dOpen', { n: 2, pos: 'bottom', sh: 3 }), C('dOpen', { n: 2, pos: 'bottom', sh: 3 })]),
      P('glass', 'Lemari kaca', 'Glass cabinet', [C('gDoor', { pos: 'top', sh: 3 }), C('gDoor', { pos: 'top', sh: 3 })]),
      P('asym', 'Asimetris', 'Asymmetric', [C('open', { sh: 4, wr: .6 }), C('oDoor', { pos: 'top', sh: 3, wr: 1.5 }), C('open', { sh: 2, wr: .6 })], { w: 180 }),
      P('ladder', 'Display tinggi', 'Tall display', [C('glass', { sh: 4 })], { w: 80, h: 200 })],
    shoe: [P('tip2', 'Tipping 2×3', 'Tip-out 2×3', [C('tip', { n: 3 }), C('tip', { n: 3 })]),
      P('tip1', 'Tipping ramping', 'Slim tip-out', [C('tip', { n: 3 })], { w: 60, d: 24 }),
      P('door', 'Pintu + rak', 'Doors + shelves', [C('door', { sh: 4 }), C('door', { sh: 4 })]),
      P('mix', 'Rak + tipping', 'Open + tip-out', [C('open', { sh: 3 }), C('tip', { n: 3 })]),
      P('drawer', 'Laci atas', 'Drawer on top', [C('combo', { n: 1, pos: 'top', sh: 3 }), C('combo', { n: 1, pos: 'top', sh: 3 })])],
    nightstand: [P('d2', '2 laci', '2 drawers', [C('drawers', { n: 2 })]),
      P('d3', '3 laci', '3 drawers', [C('drawers', { n: 3 })]),
      P('dOpen', 'Laci + rak', 'Drawer + shelf', [C('dOpen', { n: 1, pos: 'top' })]),
      P('combo', 'Laci + pintu', 'Drawer + door', [C('combo', { n: 1, pos: 'top' })]),
      P('open', 'Rak terbuka', 'Open shelf', [C('open', { sh: 1 })]),
      P('wide', 'Nakas lebar', 'Wide nightstand', [C('drawers', { n: 2 }), C('open', { sh: 1 })], { w: 70 })],
    dresser: [P('d6', 'Dresser 6 laci', '6-drawer dresser', [C('drawers', { n: 3 }), C('drawers', { n: 3 })], { w: 120, h: 85 }, 'Dresser 6'),
      P('c3', 'Chest 3 laci', '3-drawer chest', [C('drawers', { n: 3 })], { w: 80, h: 80 }),
      P('c5', 'Chest tinggi 5', 'Tall chest 5', [C('drawers', { n: 5, pos: 'grad' })], { w: 80, h: 125 }),
      P('d9', 'Dresser 9 laci', '9-drawer dresser', [C('drawers', { n: 3 }), C('drawers', { n: 3 }), C('drawers', { n: 3 })], { w: 160, h: 85 }, 'Dresser 9'),
      P('mix', 'Laci + rak', 'Drawers + shelf', [C('drawers', { n: 4, pos: 'grad' }), C('dOpen', { n: 1, pos: 'bottom', sh: 1 })], { w: 120, h: 95 }),
      P('door', 'Laci + pintu', 'Drawers + doors', [C('door', { sh: 1 }), C('drawers', { n: 3 }), C('door', { sh: 1 })], { w: 150, h: 85 })],
    bar: [P('mix', 'Bar + display', 'Bar + display', [C('gDoor', { pos: 'top', sh: 2 }), C('flap', { sh: 1 })], { w: 110, h: 150 }),
      P('display', 'Display kaca', 'Glass display', [C('glass', { sh: 4 }), C('glass', { sh: 4 })], { w: 100, h: 180 }),
      P('flap', 'Bar flap', 'Bar flap', [C('flap', { sh: 1 })], { w: 70, h: 140 }),
      P('wine', 'Bar anggur', 'Wine bar', [C('wDoor', { pos: 'diamond' })], { w: 70, h: 180 }),
      P('buffet', 'Bar konsol', 'Bar console', [C('door'), C('wine', { pos: 'grid' }), C('door')], { w: 150, h: 90 }),
      P('home', 'Home bar', 'Home bar', [C('gDoor', { pos: 'top', sh: 3, wr: 1.5 }), C('wine', { pos: 'grid', wr: .6 })], { w: 140, h: 190 })],
    wall: [P('console', 'Konsol TV', 'TV console', WALLTYPE_G.preset.layout.console, { w: 180, h: 36, d: 38, elev: 30 }),
      P('consoleD', 'Konsol laci', 'Drawer console', [C('drawers', { n: 1 }), C('drawers', { n: 1 }), C('drawers', { n: 1 })], { w: 160, h: 30, d: 38, elev: 35 }),
      P('upper', 'Kabinet atas', 'Upper cabinet', WALLTYPE_G.preset.layout.cabinet, { w: 120, h: 60, d: 35, elev: 145 }),
      P('desk', 'Meja + rak', 'Desk + hutch', WALLTYPE_G.preset.layout.desk, { w: 120, h: 60, d: 55, elev: 110 }),
      P('shelf', 'Rak modular', 'Modular shelf', WALLTYPE_G.preset.layout.shelf, { w: 150, h: 90, d: 28, elev: 100 }),
      P('night', 'Nakas melayang', 'Floating nightstand', [C('dOpen', { n: 1, pos: 'top' })], { w: 50, h: 30, d: 35, elev: 40 })],
    pantry: [P('pull', 'Pull-out', 'Pull-out', [C('pull', { n: 5 })], { w: 45 }),
      P('pull2', 'Pull-out + pintu', 'Pull-out + door', [C('pull', { n: 5, wr: .6 }), C('door', { sh: 5 })], { w: 90 }),
      P('2door', 'Pantry 2 pintu', '2-door pantry', [C('door', { sh: 5 }), C('door', { sh: 5 })], { w: 90 }, 'Pantry 2 pintu'),
      P('combo', 'Pintu + laci', 'Door + drawers', [C('combo', { n: 2, pos: 'bottom', sh: 4 }), C('combo', { n: 2, pos: 'bottom', sh: 4 })], { w: 90 }),
      P('office', 'Lemari kantor', 'Office cabinet', [C('oDoor', { pos: 'top', sh: 2 }), C('oDoor', { pos: 'top', sh: 2 })], { w: 90, d: 42 }),
      P('glass', 'Kaca + pintu', 'Glass + door', [C('gDoor', { pos: 'top', sh: 3 }), C('gDoor', { pos: 'top', sh: 3 })], { w: 90 })]
  };

  var cat = O('kabinet', 'Kabinet & lemari', 'Cabinets & storage', { subs: [
    O('tv', 'Kabinet TV', 'TV cabinet', { base: 2400000, dims: { w: [100, 320, 5, 180], d: [30, 55, 1, 42], h: [30, 70, 1, 48] }, cab: true,
      def: def({ layout: PRESETS.tv[0].layout, interior: [] }), groups: cabGroups({ doors: 600000, top: [M(1400000, 1800000), M(600000, 900000)] }) }),
    O('sideboard', 'Sideboard / buffet', 'Sideboard / buffet', { s: 'Sideboard', se: 'Sideboard', base: 2700000, dims: { w: [80, 280, 5, 180], d: [38, 55, 1, 45], h: [65, 100, 1, 80] }, cab: true,
      def: def({ layout: PRESETS.sideboard[0].layout, finish: 'fluted', wood: 'oak', panel: 'greige', handle: 'bar', leg: 'straight', legH: 12 }), groups: cabGroups({ doors: 600000, top: [M(1600000, 2200000), M(700000, 1000000)] }) }),
    O('wardrobe', 'Lemari pakaian (wardrobe)', 'Wardrobe', { s: 'Lemari pakaian', se: 'Wardrobe', base: 4600000, dims: { w: [60, 320, 5, 200], d: [52, 68, 1, 60], h: [170, 260, 5, 220] }, cab: true,
      def: def({ layout: PRESETS.wardrobe[0].layout, finish: 'hpl', wood: 'oak', panel: 'ivory', metal: 'black', mount: 'plinth', leg: 'tapered', legH: 8 }), groups: cabGroups({ doors: 900000 }) }),
    O('bookshelf', 'Rak buku / display', 'Bookshelf / display', { s: 'Rak buku', se: 'Bookshelf', base: 1900000, dims: { w: [40, 280, 5, 160], d: [25, 45, 1, 35], h: [80, 260, 5, 200] }, cab: true,
      def: def({ layout: PRESETS.bookshelf[0].layout, panel: 'charcoal', metal: 'black', handle: 'push', mount: 'plinth', legH: 6 }), groups: cabGroups({ doors: 600000 }) }),
    O('shoe', 'Lemari sepatu', 'Shoe cabinet', { base: 1200000, dims: { w: [50, 200, 5, 110], d: [24, 42, 1, 32], h: [80, 200, 5, 110] }, cab: true,
      def: def({ layout: PRESETS.shoe[0].layout, finish: 'duco', wood: 'oak', panel: 'sage', handle: 'tab', leg: 'round', legH: 12 }), groups: cabGroups({}) }),
    O('nightstand', 'Nakas (nightstand)', 'Nightstand', { s: 'Nakas', se: 'Nightstand', base: 650000, dims: { w: [35, 80, 1, 50], d: [30, 50, 1, 40], h: [40, 75, 1, 52] }, cab: true,
      def: def({ layout: [C('dOpen', { n: 2, pos: 'top', sh: 0 })], handle: 'knob' }), groups: cabGroups({ top: [M(500000, 750000), M(250000, 400000)] }) }),
    O('dresser', 'Laci susun / dresser', 'Chest of drawers / dresser', { s: 'Laci susun', se: 'Dresser', svg: ICO.dresser, iconAs: 'sideboard', base: 2600000, dims: { w: [40, 220, 5, 120], d: [38, 55, 1, 48], h: [60, 150, 1, 85] }, cab: true,
      def: def({ layout: PRESETS.dresser[0].layout, wood: 'oak', handle: 'bar', leg: 'splay', legH: 16 }), groups: cabGroups({ top: [M(1200000, 1700000), M(500000, 800000)] }) }),
    O('bar', 'Kabinet display & bar', 'Display & bar cabinet', { s: 'Display & bar', se: 'Bar & display', svg: ICO.bar, iconAs: 'bookshelf', base: 3100000, dims: { w: [50, 200, 5, 110], d: [35, 55, 1, 45], h: [80, 200, 5, 150] }, cab: true,
      def: def({ layout: PRESETS.bar[0].layout, finish: 'fluted', wood: 'walnut', handle: 'knob', leg: 'straight', legH: 16, glassType: 'fluted', interior: ['led', 'mback'] }), groups: cabGroups({ top: [M(1000000, 1400000), M(400000, 700000)] }) }),
    O('wall', 'Kabinet gantung (dinding)', 'Wall-mounted unit', { s: 'Kabinet gantung', se: 'Wall unit', svg: ICO.wall, iconAs: 'tv', base: 2200000, dims: { w: [40, 300, 5, 180], d: [20, 60, 1, 38], h: [20, 120, 1, 36] }, cab: true,
      def: def({ wallType: 'console', elev: 30, wallPanel: 'fluted', layout: WALLTYPE_G.preset.layout.console, finish: 'veneer', wood: 'walnut', handle: 'push', mount: 'floating', interior: ['cable'] }), groups: cabGroups({ wall: true }) }),
    O('pantry', 'Lemari serbaguna / pantry', 'Pantry & utility cabinet', { s: 'Lemari pantry', se: 'Pantry', svg: ICO.pantry, iconAs: 'wardrobe', base: 2600000, dims: { w: [30, 180, 5, 60], d: [35, 65, 1, 58], h: [150, 250, 5, 210] }, cab: true,
      def: def({ layout: PRESETS.pantry[0].layout, finish: 'hpl', panel: 'greige', wood: 'oak', metal: 'stainless', handle: 'bar', mount: 'plinth', legH: 10, interior: ['soft'] }), groups: cabGroups({ doors: 600000 }) })
  ] });
  // nilai turunan bawaan (jumlah pintu/laci …) + salinan susunan per sub
  cat.subs.forEach(function (s) {
    s.def.layout = s.def.layout.map(function (q) { return canonCol(q, s.id); });
    var cc = counts({ sub: s.id, w: s.dims.w[3], h: s.dims.h[3], layout: s.def.layout, doorStyle: s.def.doorStyle });
    for (var k in cc) s.def[k] = cc[k];
  });

  /* urutan tampil di panel Customize (app.js memakai cat.plan bila ada) */
  cat.plan = [
    ['bentuk', [['Model', 'Model'], ['wallType']], [null, ['layout']], [['Pintu, kaca & top', 'Doors, glass & top'], ['doorStyle', 'glassType', 'top']]],
    ['ukuran', [null, ['w', 'd', 'h', 'elev']]],
    // semua bahan di langkah Material, per bagian; konstruksi badan dipisah dari finishing muka
    ['material', [['Muka & finishing', 'Fronts & finish'], ['finish', 'wood', 'panel']], [['Top', 'Top'], ['topStone']], [['Konstruksi badan', 'Carcass construction'], ['carcass']],
                 [['Handle & logam', 'Handles & metal'], ['metal']], [['Panel dinding', 'Wall panel'], ['wallPanel']]],
    ['detail', [['Handle', 'Handles'], ['handle']], [['Dudukan & kaki', 'Mounting & legs'], ['mount', 'leg', 'legH']], [['Isi dalam & aksesori', 'Interior & accessories'], ['interior']]]
  ];
  cat.s = 'Kabinet'; cat.se = 'Cabinets';
  XC.defineCat(cat);

  /* ------------------------------------------------------------------ migrasi + sinkron susunan
     konfigurasi lama { doorType, doors, drawers, niches, lowerDoors } → layout + doorStyle */
  function legacyLayout(c) {
    var s = c.sub, dt = c.doorType || 'swing', doors = dt === 'none' ? 0 : Math.max(0, +c.doors || 0), dr = Math.max(0, +c.drawers || 0), ni = Math.max(0, +c.niches || 0);
    var DK = dt === 'open' ? 'open' : dt === 'glass' ? 'glass' : dt === 'flip' ? (s === 'shoe' ? 'tip' : 'flip') : 'door';
    var L = [];
    if (s === 'wardrobe') {
      var nc = clamp(doors || 2, 1, 6), seq = ['hang', 'shelf', 'hang2', 'hang', 'shelf', 'hang2'];
      for (var i = 0; i < nc; i++) L.push(C(dt === 'open' && i % 2 ? 'open' : seq[i], { sh: 4 }));
      if (dr) { var mi = Math.min(nc - 1, Math.floor(nc / 2)); L[mi] = C('shelfDr', { n: clamp(dr, 1, 4), sh: 3 }); }
      if (dt === 'glass') L[0] = C('glass', { sh: 4 });
    } else if (s === 'bookshelf') {
      var nb = clamp(doors || 2, 1, 6), lower = c.lowerDoors === 'yes';
      for (var j = 0; j < nb; j++) {
        if (dt === 'glass' || dt === 'swing' && !lower) L.push(C(dt === 'glass' ? (lower ? 'gDoor' : 'glass') : 'door', { pos: 'top', sh: 3 }));
        else if (dr && j === 0) L.push(C('dOpen', { n: clamp(dr, 1, 3), pos: 'bottom', sh: 3 }));
        else L.push(C(lower ? 'oDoor' : 'open', { pos: 'top', sh: 3 }));
      }
    } else if (s === 'nightstand') {
      if (dt !== 'none' && dr) L.push(C('combo', { n: clamp(dr, 1, 3), pos: 'top' }));
      else if (dr && ni) L.push(C('dOpen', { n: clamp(dr, 1, 3), pos: 'top' }));
      else if (dr) L.push(C('drawers', { n: dr }));
      else L.push(C(dt === 'none' || dt === 'open' ? 'open' : 'door', { sh: 1 }));
    } else if (s === 'shoe' && dt === 'flip') {
      var ns = clamp(doors || 2, 1, 4), rows = clamp(Math.round(((+c.h || 110) / 100) / .4), 2, 4);
      for (var q = 0; q < ns; q++) L.push(C('tip', { n: rows }));
      if (dr) L.push(C('drawers', { n: clamp(dr, 1, 8) }));
    } else {
      var half = Math.ceil(doors / 2), b;
      for (b = 0; b < half; b++) L.push(C(DK));
      if (dr) L.push(C('drawers', { n: dr }));
      for (b = 0; b < ni; b++) L.push(C('open', { sh: 0 }));
      for (b = half; b < doors; b++) L.push(C(DK));
      if (!L.length) L.push(C('drawers', { n: 3 }));
    }
    return L;
  }
  function sync(c) {
    if (!c || c.cat !== 'kabinet') return c;
    var s = cat.subs.filter(function (x) { return x.id === c.sub; })[0] || cat.subs[0], sid = s.id;
    if (c.doorType !== undefined || c.doors !== undefined || c.niches !== undefined || c.drawers !== undefined || c.lowerDoors !== undefined) {
      var cs = {}; for (var k0 in c) cs[k0] = c[k0]; cs.sub = sid;
      c.layout = legacyLayout(cs);
      if (c.doorType === 'sliding') c.doorStyle = 'sliding';
      else if (c.doorType === 'folding') c.doorStyle = sid === 'wardrobe' ? 'folding' : 'swing';
      else if (c.doorType === 'open' && sid === 'wardrobe') c.doorStyle = 'open';
      if (c.doorType === 'glass' && !c.glassType) c.glassType = 'clear';
      if (c.leg === 'plinth') { c.mount = 'plinth'; c.leg = 'tapered'; }
      if (Array.isArray(c.interior)) c.interior = c.interior.filter(function (x) { return !/^(shelf|hang|inner)$/.test(x); }).map(function (x) { return x === 'mirror' && sid !== 'wardrobe' ? 'mback' : x; });
      delete c.doorType; delete c.doors; delete c.drawers; delete c.niches; delete c.lowerDoors;
    }
    var src = Array.isArray(c.layout) && c.layout.length ? c.layout : s.def.layout;
    c.layout = src.slice(0, MAXC[sid] || 6).map(function (q) { return canonCol(q, sid); });
    var cc = counts({ sub: sid, w: c.w || s.dims.w[3], h: c.h || s.dims.h[3], layout: c.layout, doorStyle: c.doorStyle || 'swing' });
    for (var k in cc) if (c[k] !== cc[k]) c[k] = cc[k];
    return c;
  }
  XC.addMigrate('kabinet', sync);

  window.XKAB = {
    KINDS: KINDS, KIND: KIND, SUBK: SUBK, MAXC: MAXC, POS: POS, WR: WR, PRESETS: PRESETS, ICO: ICO, T: T_BOARD,
    kindsFor: kindsFor, canonCol: canonCol, newCol: newCol, paramL: paramL, segs: segs, colWidths: colWidths, leavesOf: leavesOf, slidePanels: slidePanels,
    counts: counts, layoutText: layoutText, sync: sync, colSVG: colSVG, frontSVG: frontSVG, svgOpen: svgOpen, R: R, Ln: Ln
  };
})();
