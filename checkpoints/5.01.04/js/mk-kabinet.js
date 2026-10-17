/* ==========================================================================
   Maison XIONCO — Kabinet & lemari: bangun 3D parametrik (dipanggil XMAKER.build lewat window.XMK.kabinet).
   H = alat bersama dari maker.js (material, geometri, kaki, dll). Ukuran dalam meter, depan = +Z.
   Susunan per kolom: c.layout (lihat spec-kabinet.js) → segmen vertikal per kolom (XKAB.segs) →
   sel depan (pintu / kaca / laci / flip / tipping / bar flap / pull-out / panel geser) yang bergerak
   saat diklik di panggung + isi dalam per segmen (rak, gantungan, rak anggur, keranjang, dll).
   ========================================================================== */
(function () {
  window.XMK = window.XMK || {};
  window.XMK.kabinet = function (H) {
    var c = H.c, T = H.T, root = H.root, motions = H.motions, X = H.X, cm = H.cm, KB = window.XKAB;
    var wood = H.wood, paint = H.paint, fluted = H.fluted, glass = H.glass, dark = H.dark, glow = H.glow, wash = H.wash, cane = H.cane, chrome = H.chrome, mirrorM = H.mirrorM, ghost = H.ghost;
    var edgeMat = H.edgeMat, woodHex = H.woodHex, WOOD = H.WOOD, METAL = H.METAL, mesh = H.mesh, box = H.box, cyl = H.cyl, rod = H.rod, sphere = H.sphere, torus = H.torus;
    var cushion = H.cushion, fabric = H.fabric, leg = H.leg, baseFor = H.baseFor, keyhole = H.keyhole, stone = H.stone, shade = H.shade, Mc = H.M;
    if (!KB) return;

    function cabinet() {
      var s = c.sub, wall = s === 'wall', wt = c.wallType || 'console', desk = wall && wt === 'desk';
      var W = cm(c.w, 180), Dm = cm(c.d, 45), Hb = cm(c.h, 80), D = desk ? Math.min(.32, Dm) : Dm;
      var pnl = X.find(X.PANEL, c.panel) || X.PANEL[0], fin = c.finish || 'veneer', ints = c.interior || [], has = function (k) { return ints.indexOf(k) >= 0; };
      var painted = /^(hpl|duco|gloss)$/.test(fin);
      var FM = painted ? paint(pnl.hex, fin, pnl.grain) : fin === 'fluted' ? fluted(woodHex) : fin === 'solid' ? wood(woodHex, 'solid') : wood(woodHex, 'veneer');
      var bodyM = fin === 'cane' || fin === 'fluted' ? wood(woodHex, 'veneer') : FM, EM = edgeMat(c.carcass || 'multiplek');
      var backM = s === 'wardrobe' ? dark('#4a4038') : painted ? paint(shade(pnl.hex, .86), 'hpl', pnl.grain) : wood(shade(woodHex, .78), 'veneer');
      var frameM = fin === 'cane' ? WOOD() : fin === 'fluted' ? wood(woodHex, 'veneer') : FM;
      var t = KB.T, ds = c.doorStyle || 'swing', wardSlide = s === 'wardrobe' && ds === 'sliding', wardOpen = s === 'wardrobe' && ds === 'open';
      var topK = wall ? 'same' : (c.top || 'same'), topT = topK === 'stone' ? .02 : topK === 'wood' ? .028 : 0, ovh = topT ? .012 : 0, Hc = Hb - topT;
      var gt = c.glassType || 'clear';
      var ledN = 0, stemN = 0, bookN = 0;
      var bottleM = function (red) { return Mc('kxBottle' + (red ? 'r' : 'g'), function () { return new T.MeshPhysicalMaterial({ color: new T.Color(red ? '#3a1416' : '#1d3527'), roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 }); }); };
      var hasMetal = /^(bar|knob)$/.test(c.handle), HM = hasMetal ? METAL() : dark('#2a211b');
      var lowGrip = wall && wt === 'cabinet';

      var cells = [], regions = [];
      /* ---------- dudukan */
      var mount = wall ? 'wall' : (c.mount || 'legs'), y0 = 0, lg = c.leg || 'tapered', legM = /^(round|hairpin|sled|openFrame)$/.test(lg) ? METAL() : WOOD();
      if (mount === 'legs') y0 = baseFor(root, lg, W, D, cm(c.legH, 12), legM, { inset: lg === 'splay' ? .07 : .05 });
      else if (mount === 'plinth') y0 = baseFor(root, 'plinth', W, D, 0, legM);
      else if (mount === 'castor') { y0 = .08; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { leg(root, 'castor', q[0] * (W / 2 - .06), q[1] * (D / 2 - .06), .08, METAL()); }); }
      else if (mount === 'floating') y0 = s === 'tv' || s === 'nightstand' ? .3 : s === 'wardrobe' ? .12 : .4;
      else if (mount === 'wall') { y0 = cm(c.elev, 30); if (desk) y0 = Math.max(y0, .98); }
      var wp = wall ? c.wallPanel || 'none' : 'none';
      // dinding semu (transparan) untuk unit gantung tanpa panel: unit menempel, bukan melayang
      if (mount === 'floating' || wall && wp === 'none') { var gh = Math.max(y0 + Hb + .32, 1.05), gw2 = box(root, W + .5, gh, .006, ghost(), 0, gh / 2, -D / 2 - .004, 0); gw2.castShadow = false; gw2.receiveShadow = false; }
      if (wall && wp !== 'none') wallPanel(wp);
      if (desk) deskTop();

      /* ---------- badan */
      box(root, W, t, D, bodyM, 0, y0 + Hc - t / 2, 0, .003); box(root, W, t, D, bodyM, 0, y0 + t / 2, 0, .003);
      [-1, 1].forEach(function (e) { box(root, t, Hc - 2 * t, D, bodyM, e * (W / 2 - t / 2), y0 + Hc / 2, 0, .002); box(root, t, Hc - 2 * t, .002, EM, e * (W / 2 - t / 2), y0 + Hc / 2, D / 2 + .001, 0); });
      box(root, W, t, .002, EM, 0, y0 + Hc - t / 2, D / 2 + .001, 0); box(root, W, t, .002, EM, 0, y0 + t / 2, D / 2 + .001, 0);
      box(root, W - 2 * t, Hc - 2 * t, .01, backM, 0, y0 + Hc / 2, -D / 2 + .005, .001);
      if (topT) {
        var tm = topK === 'stone' ? stone(X.find(X.STONE, c.topStone) || X.STONE[0]) : WOOD();
        box(root, W + 2 * ovh, topT, D + ovh, tm, 0, y0 + Hc + topT / 2, ovh / 2, topK === 'wood' ? .006 : .003);
      }

      /* ---------- kolom & segmen */
      var lay = (c.layout || []).map(function (q) { return KB.canonCol(q, s); });
      if (!lay.length) lay = [KB.newCol(KB.SUBK[s] ? KB.SUBK[s][0] : 'door', s)];
      var nc = lay.length, ws = KB.colWidths(W, lay), ih = Hc - 2 * t, zc = -D / 2 + .01 + (D - .012) / 2, d2 = D - .012;
      var xc = -W / 2 + t;
      lay.forEach(function (col, i) {
        var cw = ws[i], cx = xc + cw / 2;
        if (i) { box(root, t, ih, d2, bodyM, xc - t / 2, y0 + Hc / 2, zc, .002); box(root, t, ih, .002, EM, xc - t / 2, y0 + Hc / 2, D / 2 - .001, 0); }
        var sg = KB.segs(col, ih, s), m = sg.length, k = (ih - (m - 1) * t) / ih, yT = y0 + Hc - t;
        sg.forEach(function (g, j) {
          var h = g.h * k, r = { x: cx, y: yT - h / 2, w: cw, h: h, col: i, g: g, ci: col };
          regions.push(r); region(r);
          yT -= h;
          if (j < m - 1) { box(root, cw + .004, t, d2, bodyM, cx, yT - t / 2, zc, .002); box(root, cw + .004, t, .002, EM, cx, yT - t / 2, D / 2 - .001, 0); yT -= t; }
        });
        xc += cw + t;
      });
      // lemari pakaian geser: panel melintang seluruh lebar + list atas (pelmet) senada badan, rel bawah logam
      if (wardSlide) {
        var np = KB.slidePanels(W), IW = W - .01, py0 = y0 + .006, py1 = y0 + Hc - .046, ph = py1 - py0;
        for (var sp = 0; sp < np; sp++) cells.push({ x: -IW / 2 + IW * (sp + .5) / np, y: py0 + ph / 2, w: IW / np + .03, h: ph, k: 'slide', z: sp % 2 ? .025 : 0, hinge: sp % 2 ? 'r' : 'l', col: Math.min(nc - 1, Math.floor(sp * nc / np)) });
        box(root, W, .044, .052, bodyM, 0, y0 + Hc - .022, D / 2 + .026, .004);
        box(root, W - .01, .008, .05, chrome(), 0, y0 + .004, D / 2 + .026, .002);
      }

      // sel yang terbuka sebagai contoh (isi dalam terlihat)
      var target = null;
      var firstK = function (re) { return cells.filter(function (q) { return re.test(q.k); })[0] || null; };
      if (s === 'bar') target = firstK(/^flap$/);
      else if (s === 'wardrobe') target = firstK(/^(door|fold|slide)$/);
      else if (s === 'pantry') target = firstK(/^pull$/) || firstK(/^(door|glass)$/);
      var firstFront = null;
      cells.forEach(function (cl, idx) { front(cl, idx); });

      /* ---------- aksesori */
      var topY = y0 + Hc + topT;
      if (has('lock')) { if (firstFront) keyhole(firstFront.P, firstFront.x, firstFront.y, firstFront.z); else keyhole(root, 0, y0 + Hc - t / 2, D / 2 + .002); }
      if (has('cable')) { var gx2 = W / 2 - Math.min(.2, W * .2); cyl(root, .03, .03, .004, dark('#0c0a09'), gx2, topY + .0005, -D / 2 + .09, 28); torus(root, .031, .003, METAL(), gx2, topY + .002, -D / 2 + .09, 0, 40).rotation.x = Math.PI / 2; }
      if (has('usb')) {   // port USB / VAZRA tertanam di top, belakang kanan
        var ux = -W / 2 + Math.min(.12, W * .25), uz = -D / 2 + .06;
        box(root, .075, .004, .036, dark('#1c1a18'), ux, topY + .002, uz, .003);
        [-1, 1].forEach(function (e) { box(root, .016, .002, .005, METAL(), ux + e * .017, topY + .0045, uz, .001); });
      }
      if (has('led') && (mount === 'floating' || wall)) { var gl0 = box(root, W * .9, .006, .006, glow(), 0, y0 - .004, D / 2 - .1, 0); gl0.castShadow = false; }
      if (mount === 'floating' && /^(round|hairpin|sled)$/.test(lg)) box(root, W - .01, .012, .012, METAL(), 0, y0 + .006, D / 2 - .006, .002);
      if (s === 'wardrobe' && has('mirror')) { var mc = cells.filter(function (q) { return /^(door|slide|fold)$/.test(q.k) && q !== target; })[0]; if (mc && mc.P) box(mc.P, mc.lw - .08, mc.lh * .82, .004, mirrorM(), mc.lx, mc.ly, mc.lz + .02 + (mc.k === 'slide' ? .001 : 0), .002); }

      /* ================= bagian-bagian ================= */
      function wallPanel(kind) {
        var ph2 = Math.max(2.1, y0 + Hb + .35), pz = -D / 2 - .0125, pw = W + (desk ? 0 : 0);
        if (kind === 'flat') box(root, pw, ph2, .025, bodyM, 0, ph2 / 2, pz, .003);
        else if (kind === 'fluted') box(root, pw, ph2, .025, fluted(woodHex), 0, ph2 / 2, pz, .003);
        else {   // kisi kayu di atas papan gelap
          box(root, pw, ph2, .012, dark('#2a2420'), 0, ph2 / 2, pz - .006, .002);
          var n = Math.max(3, Math.floor(pw / .045)), step = pw / n;
          for (var i = 0; i < n; i++) box(root, step * .62, ph2, .018, WOOD(), -pw / 2 + step * (i + .5), ph2 / 2, pz + .009, .003);
        }
      }
      function deskTop() {
        var ty = .75, tz = -D / 2 + Dm / 2;
        box(root, W, .03, Dm, bodyM, 0, ty - .015, tz, .004);
        box(root, W, .03, .002, EM, 0, ty - .015, tz + Dm / 2 + .001, 0);
        if (has('deskDr')) {   // laci tipis di bawah daun meja (rumah + muka bergerak)
          var dw = Math.min(.6, W * .45), dh = .09, dz0 = -D / 2 + .02, dd = Dm * .62;
          [-1, 1].forEach(function (e) { box(root, .014, dh, dd + .02, bodyM, e * (dw / 2 + .007), ty - .03 - dh / 2, dz0 + (dd + .02) / 2, .002); });
          box(root, dw + .028, .01, dd + .02, bodyM, 0, ty - .03 - dh - .005, dz0 + (dd + .02) / 2, .002);
          cells.push({ x: 0, y: ty - .03 - dh / 2, w: dw, h: dh - .004, k: 'drawer', zAbs: -D / 2 + Dm - .03, dd: dd, col: -1 });
        }
      }
      function rackShelf(r, y, glassy) {
        var cw = r.w;
        if (glassy) { var gs = box(root, cw - .004, .008, d2 - .03, glass(true), r.x, y, zc - .01, .001); gs.castShadow = false; return; }
        box(root, cw - .002, .018, d2 - .02, bodyM, r.x, y, zc - .01, .002); box(root, cw - .002, .018, .002, EM, r.x, y, zc - .01 + (d2 - .02) / 2 + .001, 0);
        [-1, 1].forEach(function (e) { cyl(root, .003, .003, .012, chrome(), r.x + e * (cw / 2 - .006), y - .012, zc + d2 * .3, 8).rotation.z = Math.PI / 2; });
      }
      function shelvesIn(r, n, glassy) {
        if (!n) return [];
        var ys = [], step = r.h / (n + 1);
        if (step < .09) { n = Math.max(1, Math.floor(r.h / .09) - 1); step = r.h / (n + 1); }
        for (var i = 1; i <= n; i++) { var y = r.y - r.h / 2 + step * i; ys.push(y); rackShelf(r, y, glassy); }
        return ys;
      }
      function showcase(r, glassy) {   // lampu, cermin belakang, rak gelas — ruang terbuka / berkaca / bar
        if (has('mback')) box(root, r.w - .006, r.h - .006, .003, mirrorM(), r.x, r.y, -D / 2 + .0115, .001);
        if (has('led') && ledN < 8) { ledN++; var gs = box(root, r.w * .86, .006, .01, glow(), r.x, r.y + r.h / 2 - .008, D / 2 - .035, 0); gs.castShadow = false; var wp2 = mesh(new T.PlaneGeometry(r.w * .94, r.h * .94), wash(), root, true); wp2.position.set(r.x, r.y, -D / 2 + .013); wp2.castShadow = false; wp2.receiveShadow = false; }
        if (has('stem') && stemN < 2 && r.h > .3 && /^(bar|sideboard)$/.test(s)) { stemN++; stemware(r); }
      }
      function stemware(r) {
        var ry = r.y + r.h / 2 - .012, rails = r.w > .4 ? [-.25, .25] : [0], depth = d2 - .06, ng = Math.max(1, Math.min(3, Math.floor(depth / .09)));
        rails.forEach(function (f) {
          var rx = r.x + f * r.w;
          [-1, 1].forEach(function (e) { box(root, .004, .006, depth, chrome(), rx + e * .02, ry, zc, .001); });
          for (var i = 0; i < ng; i++) {
            var gz = zc - depth / 2 + depth * (i + .5) / ng;
            cyl(root, .026, .026, .003, glass(true), rx, ry - .006, gz, 18);
            cyl(root, .003, .003, .07, glass(true), rx, ry - .043, gz, 8);
            cyl(root, .016, .036, .085, glass(true), rx, ry - .12, gz, 18);
          }
        });
      }
      function bottleUp(x, y, z, i, k) {
        k = k || 1; var bm = bottleM(i % 2), r = .034 * Math.min(1, k + .15);
        cyl(root, r, r, .2 * k, bm, x, y + .1 * k, z, 18); cyl(root, .013, r, .045 * k, bm, x, y + .222 * k, z, 18); cyl(root, .012, .012, .07 * k, bm, x, y + .28 * k, z, 12);
        cyl(root, .0125, .0125, .02 * k, dark(i % 3 ? '#b8924f' : '#2b2420'), x, y + .31 * k, z, 12);
      }
      function bottleLie(x, y, i) {
        var bm = bottleM(i % 3 === 1), r = .031, zb = D / 2 - .045 - .11, b1 = cyl(root, r, r, .22, bm, x, y, zb, 16); b1.rotation.x = Math.PI / 2;
        var b2 = cyl(root, .012, r, .04, bm, x, y, zb + .13, 16); b2.rotation.x = Math.PI / 2; var b3 = cyl(root, .011, .011, .05, bm, x, y, zb + .175, 10); b3.rotation.x = Math.PI / 2;
      }
      // botol berdiri hanya di tingkat yang cukup tinggi (tidak menembus rak / top)
      function bottlesOn(r, ys, maxLv) {
        var lv = [r.y - r.h / 2 + .001].concat(ys.map(function (y) { return y + .009; })), tops = ys.map(function (y) { return y - .009; }).concat([r.y + r.h / 2]), done = 0;
        lv.forEach(function (y, q) { var room = tops[q] - y; if (done >= maxLv || room < .2) return; done++; var k = Math.min(1, (room - .02) / .32); bottleUp(r.x - r.w * .2, y, zc - .02, q, k); if (r.w > .3) bottleUp(r.x + r.w * .12, y, zc - .04, q + 1, k * .92); });
      }
      function wine(r, style) {
        var x0 = r.x - r.w / 2, yb0 = r.y - r.h / 2, dz = d2 - .02, bt = .008, nb = 0;
        if (style === 'diamond') {
          var sp = Math.max(.1, Math.min(.16, Math.min(r.w, r.h) / 3)), w = r.w, h = r.h, k, u1, u2, L;
          for (k = -h + sp / 2; k < w; k += sp) {   // u - v = k  (naik ke kanan)
            u1 = Math.max(0, k); u2 = Math.min(w, k + h); L = (u2 - u1) * Math.SQRT2;
            if (L > .03) { var b = box(root, L, bt, dz, bodyM, x0 + (u1 + u2) / 2, yb0 + (u1 + u2) / 2 - k, zc - .005, .001); b.rotation.z = Math.PI / 4; }
          }
          for (k = sp / 2; k < w + h; k += sp) {   // u + v = k  (turun ke kanan)
            u1 = Math.max(0, k - h); u2 = Math.min(w, k); L = (u2 - u1) * Math.SQRT2;
            if (L > .03) { var b2 = box(root, L, bt, dz, bodyM, x0 + (u1 + u2) / 2, yb0 + k - (u1 + u2) / 2, zc - .005, .001); b2.rotation.z = -Math.PI / 4; }
          }
          // botol di tengah belah ketupat
          for (var a = -h + sp / 2; a < w; a += sp) for (var b3 = sp / 2; b3 < w + h; b3 += sp) {
            var u = (a + b3) / 2 + sp / 2, v = (b3 - a) / 2;
            if (u < sp * .45 || u > w - sp * .45 || v < sp * .45 || v > h - sp * .45 || nb >= 16) continue;
            if (((Math.round(u / sp * 2) + Math.round(v / sp * 2)) % 3) === 0) continue;
            bottleLie(x0 + u, yb0 + v - .004, nb++);
          }
        } else {
          var nx = Math.max(1, Math.round(r.w / .105)), ny = Math.max(1, Math.round(r.h / .105)), i, j;
          for (i = 1; i < nx; i++) box(root, bt, r.h, dz, bodyM, x0 + r.w * i / nx, r.y, zc - .005, .001);
          for (j = 1; j < ny; j++) box(root, r.w, bt, dz, bodyM, r.x, yb0 + r.h * j / ny, zc - .005, .001);
          for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) { if ((i + j) % 2 || nb >= 18) continue; bottleLie(x0 + r.w * (i + .5) / nx, yb0 + r.h * j / ny + .035, nb++); }
        }
      }
      function books(r, ys) {   // buku di sebagian rak terbuka (rak buku)
        var lv = [r.y - r.h / 2].concat(ys), pal = ['#6e5a48', '#b9a988', '#3f4a52', '#8a3f2e', '#d8cfbd', '#4f5b46', '#2f2a26'];
        lv.forEach(function (yb, li) {
          var top = li < ys.length ? ys[li] : r.y + r.h / 2, room = top - yb - .02;
          if (room < .16 || (li + r.col) % 2) return;
          var x = r.x - r.w / 2 + .02 + ((li * 7 + r.col * 3) % 5) * .02, end = x + r.w * .55, i = 0;
          while (x < end && i < 14) { var bw = .018 + ((i * 7 + li) % 4) * .006, bh = Math.min(room - .01, .17 + ((i * 5 + li * 3) % 5) * .018); box(root, bw, bh, Math.min(.2, d2 - .06), wood(pal[(i + li + r.col) % pal.length], 'veneer'), x + bw / 2, yb + .009 + bh / 2, zc - .01, .002); x += bw + .002; i++; }
          if (room > .14) { var bx = Math.min(r.x + r.w / 2 - .07, x + .06); cyl(root, .035, .03, .1, paint('#cfc6b6', 'duco'), bx, yb + .009 + .05, zc, 20); }
        });
        bookN++;
      }
      function rails(r, n) {   // gantungan baju + pakaian
        var x = r.x, cw = r.w - t, ytop = r.y + r.h / 2, ybt = r.y - r.h / 2, dz = d2 - .03, zz = zc, pal = ['#5d6f86', '#e2d8c6', '#9a7354', '#4a4a4c', '#a7b39a'];
        var levels = n === 2 ? [ytop - .07, r.y - .02] : [ytop - .34];
        if (n !== 2) rackShelf(r, ytop - .28, false);
        else rackShelf(r, r.y + .04, false);
        levels.forEach(function (railY, li) {
          rod(root, [x - cw / 2 + .004, railY, zz], [x + cw / 2 - .004, railY, zz], .011, chrome());
          var low = n === 2 && li === 0 ? r.y + .06 : ybt, gl = Math.min(n === 2 ? .8 : 1.05, (railY - low) * .8), gw = Math.min(.42, dz - .06), ng = Math.max(1, Math.min(5, Math.floor(cw / .09)));
          if (gl > .12) for (var gi = 0; gi < ng; gi++) {
            var gx = x - cw / 2 + cw * (gi + .5) / ng, hk = torus(root, .018, .002, chrome(), gx, railY + .004, zz, Math.PI, 16); hk.rotation.y = Math.PI / 2;
            rod(root, [gx, railY - .03, zz - gw * .45], [gx, railY - .005, zz], .003, wood('#b48a5a'), 6); rod(root, [gx, railY - .03, zz + gw * .45], [gx, railY - .005, zz], .003, wood('#b48a5a'), 6);
            cushion(root, .025, gl, gw, fabric(pal[(gi + li + r.col) % pal.length], 'linen'), gx, railY - .03 - gl / 2, zz, { r: .012, cr: .004 });
          }
        });
      }
      function region(r) {
        var g = r.g, ty = g.t, i = r.col, hingeR = nc === 1 ? false : i >= nc / 2;
        var closable = function (k) { cellsFor(r, k, hingeR); };
        if (ty === 'open') { var ys = shelvesIn(r, g.sh, false); if (fin === 'cane') box(root, r.w - t, r.h - t, .006, cane('#d8bf8f'), r.x, r.y, -D / 2 + .014, .001); showcase(r); if (s === 'bookshelf' || s === 'wall' && wt === 'shelf') books(r, ys); return; }
        if (ty === 'door' || ty === 'glass' || ty === 'hang') {
          var gl2 = ty === 'glass', ys2 = ty === 'hang' ? (rails(r, g.rails), []) : shelvesIn(r, g.sh, gl2);
          if (gl2) { showcase(r, true); if (s === 'bar') bottlesOn(r, ys2, 2); }
          if (wardOpen && ty !== 'glass' || wardSlide) return;
          if (ds === 'sliding' && !wall) { cells.push({ x: r.x, y: r.y, w: r.w + .02, h: r.h, k: 'slide', gl: gl2, z: i % 2 ? .022 : 0, hinge: i % 2 ? 'r' : 'l', col: i }); return; }
          if (s === 'wardrobe' && ds === 'folding' && !gl2) { cells.push({ x: r.x, y: r.y, w: r.w, h: r.h, k: 'fold', hinge: hingeR ? 'r' : 'l', col: i }); return; }
          closable(gl2 ? 'glass' : 'door'); return;
        }
        if (ty === 'drawers') {
          var n = Math.max(1, Math.min(g.n || 1, Math.floor(r.h / .07))), wts = [], tw = 0, q;
          for (q = 0; q < n; q++) { var wv = g.grad ? 1 + q * .14 : 1; wts.push(wv); tw += wv; }
          var yy = r.y + r.h / 2;
          for (q = 0; q < n; q++) { var dh = r.h * wts[q] / tw; cells.push({ x: r.x, y: yy - dh / 2, w: r.w, h: dh, k: 'drawer', z: wardSlide ? -.03 : 0, col: i }); yy -= dh; }
          return;
        }
        if (ty === 'flip' || ty === 'tip') {
          var nf = Math.max(1, Math.min(g.n || 1, Math.floor(r.h / .12))), y2 = r.y + r.h / 2, fh = r.h / nf;
          for (var f = 0; f < nf; f++) { cells.push({ x: r.x, y: y2 - fh / 2, w: r.w, h: fh, k: ty, col: i }); y2 -= fh; }
          return;
        }
        if (ty === 'wine') { wine(r, g.style); showcase(r); return; }
        if (ty === 'flap') {
          box(root, r.w - .006, r.h - .006, .003, has('mback') || s === 'bar' ? mirrorM() : backM, r.x, r.y, -D / 2 + .0115, .001);
          var ys3 = shelvesIn(r, g.sh, true), yb = r.y - r.h / 2;
          if (has('led')) { var gs = box(root, r.w * .86, .006, .01, glow(), r.x, r.y + r.h / 2 - .008, D / 2 - .035, 0); gs.castShadow = false; }
          if (has('stem') && r.h > .3) { stemN++; stemware(r); }
          bottlesOn(r, ys3, 1);
          if (ys3.length && r.h - (ys3[0] - yb) > .1) cyl(root, .03, .022, .06, glass(true), r.x + r.w * .2, ys3[0] + .034, zc, 18);
          cells.push({ x: r.x, y: r.y, w: r.w, h: r.h, k: 'flap', col: i });
          return;
        }
        if (ty === 'pull') { cells.push({ x: r.x, y: r.y, w: r.w, h: r.h, k: 'pull', n: g.n, col: i }); return; }
      }
      function cellsFor(r, k, hingeR) {
        var L = KB.leavesOf(r.w);
        if (L === 2) { cells.push({ x: r.x - r.w / 4, y: r.y, w: r.w / 2, h: r.h, k: k, hinge: 'l', col: r.col }); cells.push({ x: r.x + r.w / 4, y: r.y, w: r.w / 2, h: r.h, k: k, hinge: 'r', col: r.col }); }
        else cells.push({ x: r.x, y: r.y, w: r.w, h: r.h, k: k, hinge: hingeR ? 'r' : 'l', col: r.col });
      }

      /* ---------- handle (z0 = muka depan bidang, relatif p) — J-grip dari material muka, tanpa batang gelap */
      function handle(p, x, y, w, h, vertical, drawer, flip, z0) {
        var hd = c.handle || 'grip', z = (z0 || 0) + .018;
        if (hd === 'push') return;
        var hy = flip ? y - h / 2 + .03 : y + h / 2 - .01;
        if (hd === 'grip') { var gw = w * .86, gy = flip ? y - h / 2 + .006 : y + h / 2 - .006; box(p, gw, .008, .012, FM, x, gy, z + .004, .002); box(p, gw - .004, .003, .003, dark('#2e2620'), x, gy + (flip ? .0055 : -.0055), z + .0015, 0); return; }
        if (hd === 'bar') { if (vertical && !drawer && !flip) rod(p, [x, y - .08, z + .03], [x, y + .08, z + .03], .006, HM); else rod(p, [x - Math.min(.12, w * .3), flip ? hy : y, z + .03], [x + Math.min(.12, w * .3), flip ? hy : y, z + .03], .006, HM); [-1, 1].forEach(function (e) { if (vertical && !drawer && !flip) rod(p, [x, y + e * .07, z], [x, y + e * .07, z + .03], .004, HM); else rod(p, [x + e * Math.min(.1, w * .25), flip ? hy : y, z], [x + e * Math.min(.1, w * .25), flip ? hy : y, z + .03], .004, HM); }); return; }
        if (hd === 'knob') { sphere(p, .014, HM, x, flip ? hy : y, z + .025); cyl(p, .005, .005, .02, HM, x, flip ? hy : y, z + .012, 8).rotation.x = Math.PI / 2; return; }
        if (hd === 'tab') { box(p, .03, .05, .006, dark('#5a3b26'), x, flip ? y - h / 2 + .02 : y + h / 2 - .02, z + .003, .002); return; }
        if (hd === 'recessed') box(p, .08, .022, .006, dark('#0f0c0a'), x, flip ? y - h / 2 + .04 : y + h / 2 - .04, z - .002, .006);
      }
      function pane(P, w, h, x, y, z) {   // kaca pintu sesuai jenis kaca
        if (gt === 'fluted') {   // kaca reeded: satu profil bergelombang diekstrusi setinggi daun
          var sh = new T.Shape(), n = Math.max(6, Math.round(w / .012)), step = w / n, i;
          sh.moveTo(-w / 2, 0);
          for (i = 0; i <= n * 4; i++) { var u = -w / 2 + step * i / 4; sh.lineTo(u, .003 + .0035 * Math.abs(Math.sin(Math.PI * i / 4))); }
          sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
          var geo = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 4 }); geo.rotateX(-Math.PI / 2);
          var rm = Mc('kxReed', function () { return new T.MeshPhysicalMaterial({ color: new T.Color('#c3cdc9'), roughness: .2, metalness: 0, transparent: true, opacity: .5, envMapIntensity: 1.3, depthWrite: false }); });
          var m = mesh(geo, rm, P, true); m.position.set(x, y - h / 2, z - .004); m.castShadow = false; return m;
        }
        var mat = gt === 'bronze' ? Mc('kxBronze', function () { return new T.MeshPhysicalMaterial({ color: new T.Color('#6a5641'), roughness: .05, metalness: 0, transparent: true, opacity: .5, envMapIntensity: 1.3, depthWrite: false }); })
          : gt === 'frosted' ? Mc('kxFrost', function () { return new T.MeshPhysicalMaterial({ color: new T.Color('#dfe3e0'), roughness: .5, metalness: 0, transparent: true, opacity: .62, envMapIntensity: .8, depthWrite: false }); }) : glass();
        var gp = box(P, w, h, .006, mat, x, y, z, .001); gp.castShadow = false; return gp;
      }

      /* ---------- bidang depan — setiap pintu / laci / panel adalah bagian bergerak (klik di panggung → buka / tutup) */
      function front(cl, idx) {
        var k = cl.k, open0 = cl === target ? 1 : 0, fz = D / 2 + .009, oz = cl.zAbs != null ? cl.zAbs : fz - .009 + (cl.z || 0);
        var P = new T.Group(), Q = null, hs = cl.hinge === 'l' ? -1 : 1, gap = .004, w = cl.w - gap, h = cl.h - gap;
        root.add(P);
        if (k === 'door' || k === 'glass' || k === 'fold') P.position.set(cl.x + hs * cl.w / 2, cl.y, oz);
        if (k === 'flip') P.position.set(cl.x, cl.y + cl.h / 2, oz);
        if (k === 'tip' || k === 'flap') P.position.set(cl.x, cl.y - cl.h / 2, oz);
        var lx = cl.x - P.position.x, ly = cl.y - P.position.y, lz = P.position.z ? 0 : oz;
        var cane1 = fin === 'cane' && k !== 'glass' && !cl.gl, mat = cane1 ? cane('#d8bf8f') : FM;
        if (k === 'glass' || cl.gl) {
          [-1, 1].forEach(function (q) { box(P, .035, h, .022, frameM, lx + q * (w / 2 - .0175), ly, lz + .011, .003); box(P, w - .07, .035, .022, frameM, lx, ly + q * (h / 2 - .0175), lz + .011, .003); });
          pane(P, w - .06, h - .06, lx, ly, lz + .011);
        } else if (k === 'fold') {
          var hw = w / 2 - .002;
          box(P, hw, h, .018, mat, -hs * hw / 2, ly, lz + .009, .003);
          Q = new T.Group(); Q.position.set(-hs * (hw + .002), 0, 0); P.add(Q);
          box(Q, hw, h, .018, mat, -hs * hw / 2, ly, lz + .009, .003);
          [-.35, 0, .35].forEach(function (f) { cyl(P, .004, .004, .03, METAL(), -hs * (hw + .001), ly + f * h, lz + .019, 8); });
        } else box(P, w, h, .018, mat, lx, ly, lz + .009, fin === 'solid' ? .005 : .003);
        if ((cane1 || fin === 'solid') && k !== 'fold' && !cl.gl) { var fw = cane1 ? .035 : .045, fd = cane1 ? .022 : .024, FWM = cane1 ? WOOD() : FM; [-1, 1].forEach(function (q) { box(P, fw, h, fd, FWM, lx + q * (w / 2 - fw / 2), ly, lz + fd / 2, .004); box(P, w - 2 * fw, fw, fd, FWM, lx, ly + q * (h / 2 - fw / 2), lz + fd / 2, .004); }); }
        cl.P = P; cl.lx = lx; cl.ly = ly; cl.lz = lz; cl.lw = w; cl.lh = h;
        // handle
        var vertical = !/^(drawer|flip|tip|flap)$/.test(k), hx = lx, HP = P, hy = ly;
        if ((k === 'door' || k === 'glass' || k === 'slide') && c.handle !== 'grip') hx = lx + (cl.hinge === 'l' ? 1 : -1) * (w / 2 - .05);
        if (k === 'fold') { HP = Q; hx = -hs * (w / 2 - .05); }
        if (k === 'pull' && c.handle !== 'grip') hy = ly + h / 2 - Math.min(.35, h * .2);
        if ((k === 'door' || k === 'glass') && h > 1.3 && c.handle !== 'grip') hy = Math.max(-h / 2 + .12, Math.min(h / 2 - .12, 1.02 - cl.y));   // handle setinggi ±1 m di pintu tinggi
        handle(HP, hx, hy, w, h, vertical, k === 'drawer', k === 'flip' || lowGrip && (k === 'door' || k === 'glass'), lz);
        if (!firstFront) firstFront = { P: HP, x: hx, y: hy + (k === 'drawer' ? 0 : -.07), z: lz + .018, k: k };
        // engsel (+ peredam soft close)
        if (/^(door|glass|fold|flip|tip|flap)$/.test(k)) {
          var hz = -.004, sideH = !/^(flip|tip|flap)$/.test(k), hxx = lx + (cl.hinge === 'l' ? -1 : 1) * (w / 2 - .03);
          [-1, 1].forEach(function (e) {
            var px = sideH ? hxx : lx + e * (w / 2 - .08), py = sideH ? ly + e * (h / 2 - .1) : ly + (k === 'flip' ? h / 2 - .03 : -h / 2 + .03);
            cyl(P, .018, .018, .006, chrome(), px, py, hz, 20).rotation.x = Math.PI / 2;
            if (has('soft')) cyl(P, .006, .006, .04, dark('#5a5a5a'), px + (sideH ? (cl.hinge === 'l' ? .025 : -.025) : 0), py, hz - .006, 10).rotation.z = Math.PI / 2;
          });
        }
        if (k === 'tip') {   // rak sepatu miring menempel di balik muka tipping
          var sd = Math.min(.17, D * .55), shf = box(P, w - .03, .012, sd, bodyM, lx, ly + h * .05, lz - sd * .42, .002); shf.rotation.x = .55;
          box(P, w - .03, .03, .012, bodyM, lx, ly - h / 2 + .03, lz - .02, .002);
        }
        if (k === 'flap') {   // sisi dalam bar flap: pelapis kulit / felt sebagai alas saji
          box(P, w - .05, h - .05, .003, dark('#3b2a22'), lx, ly, lz - .0015, .002);
          [-1, 1].forEach(function (e) { rod(P, [lx + e * (w / 2 - .03), ly + h / 2 - .04, lz - .004], [lx + e * (w / 2 - .03), ly + h / 2 - .12, lz - .004], .003, chrome()); });
        }
        var dd = cl.dd || D * .7;
        if (k === 'drawer') {   // kotak laci ikut bergerak dengan mukanya
          var bz = lz - dd / 2;
          box(P, w - .03, .012, dd, bodyM, cl.x, cl.y - h / 2 + .02, bz, .002);
          [-1, 1].forEach(function (e) { box(P, .012, h - .04, dd, bodyM, cl.x + e * (w / 2 - .02), cl.y - .01, bz, .002); box(root, .006, .012, dd + .1, chrome(), cl.x + e * (w / 2 - .008), cl.y - .02, bz - .05, .002); if (has('soft')) cyl(root, .005, .005, .05, dark('#5a5a5a'), cl.x + e * (w / 2 - .008), cl.y - .03, bz - dd / 2 - .02, 10).rotation.x = Math.PI / 2; });
          box(P, w - .03, h - .04, .012, bodyM, cl.x, cl.y - .01, lz - dd, .002);
          if (has('tray')) {   // baki beludru bersekat
            var tm2 = fabric('#4b3442', 'velvet'), ty = cl.y - h / 2 + .03;
            box(P, w - .06, .006, dd - .03, tm2, cl.x, ty, bz, .002);
            [-.18, .18].forEach(function (f) { box(P, .008, Math.min(.04, h * .3), dd - .03, tm2, cl.x + f * w, ty + .018, bz, .002); });
          }
        }
        if (k === 'pull') {   // pull-out pantry: rangka krom + keranjang kawat, ikut keluar
          var nb = Math.max(3, Math.min(6, cl.n || 5)), pd = D * .78, bw = w - .05, z1 = lz - .01, zb = z1 - pd / 2;
          [-1, 1].forEach(function (e) { rod(P, [cl.x + e * bw / 2, cl.y - h / 2 + .03, z1 - pd], [cl.x + e * bw / 2, cl.y + h / 2 - .03, z1 - pd], .006, chrome()); });
          for (var b = 0; b < nb; b++) {
            var by = cl.y - h / 2 + .05 + (h - .14) * b / Math.max(1, nb - 1);
            box(P, bw, .004, pd, dark('#8d8a85'), cl.x, by, zb, .001);
            [[-1, 0], [1, 0]].forEach(function (q) { rod(P, [cl.x + q[0] * bw / 2, by + .07, z1], [cl.x + q[0] * bw / 2, by + .07, z1 - pd], .003, chrome()); });
            rod(P, [cl.x - bw / 2, by + .07, z1 - pd], [cl.x + bw / 2, by + .07, z1 - pd], .003, chrome());
            if (b % 2 === 0) [-.25, .15].forEach(function (f, j) { cyl(P, .035, .035, .12 - j * .03, paint(j ? '#c8b89a' : '#e4ddd0', 'duco'), cl.x + f * bw, by + .062 - j * .015, zb + (j ? .05 : -.04), 18); });
          }
        }
        // gerak: t 0 = tertutup … 1 = terbuka
        var sdir = cl.hinge === 'r' ? 1 : -1, apply;
        if (k === 'door' || k === 'glass') apply = function (v) { P.rotation.y = hs * 1.62 * v; };
        else if (k === 'fold') apply = function (v) { P.rotation.y = hs * 1.35 * v; Q.rotation.y = -hs * 2.75 * v; };
        else if (k === 'flip') apply = function (v) { P.rotation.x = -1.38 * v; };
        else if (k === 'tip') apply = function (v) { P.rotation.x = .62 * v; };
        else if (k === 'flap') apply = function (v) { P.rotation.x = 1.5708 * v; };
        else if (k === 'slide') apply = function (v) { P.position.x = -sdir * cl.w * .86 * v; };
        else if (k === 'pull') apply = function (v) { P.position.z = D * .82 * v; };
        else apply = function (v) { P.position.z = dd * .78 * v; };
        var mo = { id: 'f' + idx, kind: k, col: cl.col, t: open0, to: open0, apply: apply };
        apply(open0);
        P.userData.motion = mo; if (Q) Q.userData.motion = mo;
        motions.push(mo);
      }
    }

    cabinet();
  };
})();
