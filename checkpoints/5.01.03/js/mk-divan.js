/* ==========================================================================
   Maison XIONCO — Divan & tempat tidur: bangun 3D parametrik (dipanggil XMAKER.build lewat window.XMK.divan).
   H = alat bersama dari maker.js (material, geometri, kaki, bantal, dll). Ukuran dalam meter, +Z = depan, y = atas.
   Ukuran pokok (rangka, tinggi deck, tangga) dari window.XDIVAN.geom (spec-divan.js) — sama dengan angka garis ukur.
   Sub: divan · platform · headboard (bed) · canopy · bunk · loft · trundle · daybed · kids
   Bagian bergerak (klik): laci, laci tangga, ranjang sorong / pop-up, divan hidrolik, pintu lemari loft.
   ========================================================================== */
(function () {
  window.XMK = window.XMK || {};
  window.XMK.divan = function (H) {
    var c = H.c, T = H.T, root = H.root, motions = H.motions, X = H.X, cm = H.cm, shade = H.shade, lum = H.lum, M = H.M;
    var fabric = H.fabric, wood = H.wood, metal = H.metal, paint = H.paint, dark = H.dark, glow = H.glow, fluted = H.fluted, linen = H.linen, ghost = H.ghost;
    var colorHex = H.colorHex, FAB = H.FAB, woodHex = H.woodHex, WOOD = H.WOOD, METAL = H.METAL;
    var mesh = H.mesh, box = H.box, cyl = H.cyl, rod = H.rod, sphere = H.sphere, torus = H.torus, cushion = H.cushion, tuftOf = H.tuftOf, leg = H.leg, caneM = H.caneM;
    var XP = H.XP, pillowRow = H.pillowRow, endBolsters = H.endBolsters, pillowMat = H.pillowMat;
    var GEO = window.XDIVAN && window.XDIVAN.geom;
    var ex = c.extras || [], hasX = function (k) { return ex.indexOf(k) >= 0; };
    var PNL = X.find(X.PANEL, c.panel) || X.PANEL[0];
    var isMetal = c.frame === 'metal';
    var FR = function () { return isMetal ? METAL() : c.frame === 'painted' ? paint(PNL.hex, 'duco', PNL.grain) : WOOD(); };
    var SLAT = function () { return wood('#d6c09a', 'solid'); };   // reng / slat kayu pinus alami
    var throwHex = function () { return lum(colorHex) < .2 ? '#8c7a66' : '#b8a68a'; };
    var MID = 0;

    /* ================================================================ alat bantu */
    // kotak dari sudut min → max
    function bx(p, x0, y0, z0, x1, y1, z1, mat, r) { return box(p, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, r == null ? .004 : r); }
    // tiang tegak (kotak, atau pipa bulat untuk rangka besi)
    function post(p, x, z, y0, y1, mat, pt, round) {
      if (y1 - y0 < .005) return null;
      if (round) return cyl(p, pt / 2, pt / 2, y1 - y0, mat, x, (y0 + y1) / 2, z, 20);
      return bx(p, x - pt / 2, y0, z - pt / 2, x + pt / 2, y1, z + pt / 2, mat, .006);
    }
    // batang lurus miring berpenampang kotak (w lebar, t tebal) dari A ke B pada bidang tegak
    function strut(p, A, B, w, t, mat) {
      var dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], L = Math.hypot(dx, dy, dz);
      var m = box(p, w, L, t, mat, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, .004);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(dx, dy, dz).normalize());
      return m;
    }
    // potongan memanjang: ax 'x' → sepanjang x di z = f ; 'z' → sepanjang z di x = f ; th = tebal
    function piece(p, ax, A, B, f, y0, y1, th, mat, r) {
      if (B - A < .004 || y1 - y0 < .002) return null;
      return ax === 'x' ? bx(p, A, y0, f - th / 2, B, y1, f + th / 2, mat, r) : bx(p, f - th / 2, y0, A, f + th / 2, y1, B, mat, r);
    }
    function rodAx(p, ax, A, B, f, y, r, mat) { return ax === 'x' ? rod(p, [A, y, f], [B, y, f], r, mat, 14) : rod(p, [f, y, A], [f, y, B], r, mat, 14); }
    // reng (slat) kasur: ax = arah panjang ranjang; slat melintang b0..b1, atas di y
    function slats(p, ax, a0, a1, b0, b1, y, mat) {
      var n = Math.max(6, Math.round((a1 - a0) / .095)), sw = .066, i, a;
      for (i = 0; i < n; i++) { a = a0 + (a1 - a0) * (i + .5) / n; if (ax === 'x') bx(p, a - sw / 2, y - .018, b0, a + sw / 2, y, b1, mat, .003); else bx(p, b0, y - .018, a - sw / 2, b1, y, a + sw / 2, mat, .003); }
      // penopang tengah untuk ranjang lebar
      if (b1 - b0 > 1.15) { var bm = (b0 + b1) / 2; if (ax === 'x') bx(p, a0, y - .018 - .05, bm - .025, a1, y - .018, bm + .025, mat, .003); else bx(p, bm - .025, y - .018 - .05, a0, bm + .025, y - .018, a1, mat, .003); }
    }
    // kasur: termasuk → kasur linen + bantal + selimut ; tidak → bayangan ukuran (ghost). Kepala di -x (alongX) atau -z
    function bedding(p, cx, y, cz, mw, ml, alongX, o) {
      o = o || {};
      var t = o.t || .18, inc = o.inc != null ? o.inc : hasX('mattressinc'), Lx = alongX ? ml : mw, Dz = alongX ? mw : ml;
      if (!inc) { var gm = box(p, Lx, t, Dz, ghost(), cx, y + t / 2, cz, Math.min(.05, t / 3)); gm.castShadow = false; return; }
      cushion(p, Lx, t, Dz, linen(), cx, y + t / 2, cz, { r: Math.min(.04, t / 3), cr: .006, bu: .005 });
      if (o.noPillow) return;
      var np = mw < 1.1 ? 1 : 2, pw = Math.min(.62, mw / np - .06), k, off;
      for (k = 0; k < np; k++) {
        off = -mw / 2 + mw * (k + .5) / np;
        var pl = alongX ? cushion(p, .4, .12, pw, linen(), cx - ml / 2 + .26, y + t + .065, cz + off, { r: .03, cr: .04, both: true })
                        : cushion(p, pw, .12, .4, linen(), cx + off, y + t + .065, cz - ml / 2 + .26, { r: .03, cr: .04, both: true });
        if (alongX) pl.rotation.z = .18; else pl.rotation.x = -.18;
      }
      var tf = fabric(throwHex(), 'linen');
      if (alongX) box(p, .5, .035, mw + .01, tf, cx + ml / 2 - .36, y + t + .012, cz, .012); else box(p, mw + .01, .035, .5, tf, cx, y + t + .012, cz + ml / 2 - .36, .012);
    }
    // laci: muka di (cx, cy, cz) menghadap arah ry (0 = +z); badan di belakang; klik → tertarik keluar sejauh pull
    function drawer(p, cx, cy, cz, w, h, depth, ry, mat, pull, o) {
      o = o || {};
      var P = new T.Group(); P.position.set(cx, cy, cz); P.rotation.y = ry || 0; p.add(P);
      box(P, w, h, .02, mat, 0, 0, .01, .004);
      var bw = w - .04, bh = Math.max(.04, (h - .03) * .8), bd = Math.max(.05, depth - .03), yb = -h / 2 + .02;
      box(P, bw, .012, bd, mat, 0, yb, -bd / 2, .002);
      [-1, 1].forEach(function (e) { box(P, .012, bh, bd, mat, e * (bw / 2 - .006), yb + bh / 2, -bd / 2, .002); });
      box(P, bw, bh, .012, mat, 0, yb + bh / 2, -bd + .006, .002);
      if (o.handle === 'slot') box(P, Math.min(.14, w * .3), .012, .004, dark('#2a241f'), 0, h / 2 - Math.min(.035, h * .22), .0205, .001);
      else if (o.handle !== false) box(P, Math.min(.16, w * .32), .012, .012, o.hm || dark('#3a3430'), 0, h / 2 - Math.min(.045, h * .28), .026, .004);
      var dx = Math.sin(ry || 0), dz = Math.cos(ry || 0), x0 = cx, z0 = cz;
      var mo = { id: 'dv' + (++MID), kind: 'drawer', t: 0, to: 0, apply: function (v) { P.position.x = x0 + dx * pull * v; P.position.z = z0 + dz * pull * v; } };
      P.userData.motion = mo; motions.push(mo);
      return P;
    }
    function addMotion(P, kind, apply) { var mo = { id: 'dv' + (++MID), kind: kind, t: 0, to: 0, apply: apply }; P.traverse(function (o) { o.userData.motion = mo; }); motions.push(mo); apply(0); return mo; }
    // pagar pengaman: ax, A..B, di f ; yb (atas rel) .. yt ; gaya bars | spindle | panel ; gaps = [[a,b]] bukaan
    function guard(p, ax, A, B, f, yb, yt, style, mat, gaps, o) {
      o = o || {};
      var th = o.th || .03, segs = [[A, B]], met = o.metal;
      (gaps || []).forEach(function (gp) { var out = []; segs.forEach(function (s) { if (gp[1] <= s[0] || gp[0] >= s[1]) { out.push(s); return; } if (gp[0] > s[0]) out.push([s[0], gp[0]]); if (gp[1] < s[1]) out.push([gp[1], s[1]]); }); segs = out; });
      segs.forEach(function (s) {
        var a = s[0], b = s[1]; if (b - a < .03) return;
        if (met) rodAx(p, ax, a, b, f, yt - .015, .014, mat); else piece(p, ax, a, b, f, yt - .045, yt, th, mat, .006);
        var ytop = yt - (met ? .03 : .045);
        if (style === 'bars') { var ym = yb + (ytop - yb) * .45; if (met) rodAx(p, ax, a, b, f, ym, .011, mat); else piece(p, ax, a, b, f, ym - .022, ym + .022, th, mat, .005); }
        else if (style === 'panel') piece(p, ax, a, b, f, yb, ytop, .018, mat, .004);
        else {
          var n = Math.max(1, Math.round((b - a) / .095)), i, q;
          for (i = 0; i < n; i++) { q = a + (b - a) * (i + .5) / n; if (met) { if (ax === 'x') rod(p, [q, yb, f], [q, ytop, f], .008, mat, 10); else rod(p, [f, yb, q], [f, ytop, q], .008, mat, 10); } else piece(p, ax, q - .012, q + .012, f, yb, ytop, .024, mat, .003); }
        }
      });
      if (o.gapPosts !== false) (gaps || []).forEach(function (gp) {
        [gp[0] - .02, gp[1] + .02].forEach(function (q) { if (q < A + .02 || q > B - .02) return; if (ax === 'x') post(p, q, f, yb, yt, mat, .04, met); else post(p, f, q, yb, yt, mat, .04, met); });
      });
    }
    // tangga lurus: lebar sepanjang ax, menempel pada muka f (keluar ke arah dir), dari lantai sampai yTop (pegangan), anak tangga sampai yDeck
    function ladderV(p, ax, c0, f, yDeck, yTop, dir, mat, met) {
      var hw = .2, sd = .04, sw = .045, fz = f + dir * sd / 2;
      [-1, 1].forEach(function (e) { var q = c0 + e * hw; if (ax === 'x') { if (met) cyl(p, .02, .02, yTop, mat, q, yTop / 2, fz, 16); else bx(p, q - sw / 2, 0, fz - sd / 2, q + sw / 2, yTop, fz + sd / 2, mat, .006); } else { if (met) cyl(p, .02, .02, yTop, mat, fz, yTop / 2, q, 16); else bx(p, fz - sd / 2, 0, q - sw / 2, fz + sd / 2, yTop, q + sw / 2, mat, .006); } });
      var n = Math.max(3, Math.round(yDeck / .27)), k, y;
      for (k = 1; k < n; k++) { y = yDeck * k / n; if (ax === 'x') rod(p, [c0 - hw, y, fz], [c0 + hw, y, fz], .016, mat, 14); else rod(p, [fz, y, c0 - hw], [fz, y, c0 + hw], .016, mat, 14); }
    }
    // tangga miring: kaki di lantai sejauh run dari muka f, puncak menempel di rel (yTop)
    function ladderA(p, ax, c0, f, yTop, runD, dir, mat) {
      var hw = .21, sw = .045, sd = .04;
      [-1, 1].forEach(function (e) {
        var q = c0 + e * hw;
        if (ax === 'x') strut(p, [q, 0, f + dir * (runD - sd / 2)], [q, yTop, f + dir * sd / 2], sw, sd, mat);
        else { var m = strut(p, [f + dir * (runD - sd / 2), 0, q], [f + dir * sd / 2, yTop, q], sd, sw, mat); }
      });
      var n = Math.max(3, Math.round(yTop / .26)), k;
      for (k = 1; k < n; k++) {
        var t = k / n, y = yTop * t, o = f + dir * (sd / 2 + (runD - sd) * (1 - t));
        if (ax === 'x') bx(p, c0 - hw + sw / 2, y - .022, o - .04, c0 + hw - sw / 2, y, o + .04, mat, .004);
        else bx(p, o - .04, y - .022, c0 - hw + sw / 2, o + .04, y, c0 + hw - sw / 2, mat, .004);
      }
    }
    // tangga laci: sx = sisi (-1 kiri / 1 kanan), xIn = muka ujung ranjang, langkah naik dari depan (zF) ke belakang (zB)
    function stairs(p, sx, xIn, sw, zF, zB, yTop, mat) {
      var n = Math.max(4, Math.round(yTop / .27)), rise = yTop / n, dz = (zF - zB) / n, xa = sx > 0 ? xIn : xIn - sw, xb = sx > 0 ? xIn + sw : xIn, k;
      for (k = 1; k <= n; k++) {
        var zf = zF - dz * (k - 1), zbk = zF - dz * k;
        bx(p, xa, 0, zbk, xb, rise * k, zf, mat, .004);
        bx(p, xa - .004, rise * k - .022, zbk - .0, xb + .004, rise * k, zf + .012, mat, .004);   // tutup anak tangga (nosing)
        drawer(p, (xa + xb) / 2, rise * (k - .5) - .006, zf - .018, sw - .03, rise - .045, dz * .85, 0, mat, Math.min(.3, dz * .85), { handle: 'slot' });
      }
      // pegangan tangan di sisi luar
      var xo = sx > 0 ? xb - .025 : xa + .025, zf1 = zF - dz * .5, zb1 = zB + dz * .5, h1 = rise + .62, h2 = yTop + .34;
      post(p, xo, zf1, rise, h1, mat, .04, isMetal); post(p, xo, zb1, yTop, h2, mat, .04, isMetal);
      if (isMetal) rod(p, [xo, h1, zf1], [xo, h2, zb1], .016, mat, 14); else strut(p, [xo, h1 - .02, zf1], [xo, h2 - .02, zb1], .045, .04, mat);
      return { n: n, dz: dz };
    }
    // bawah ranjang: laci (2) atau ranjang sorong; x0..x1, muka depan zF, kedalaman dalam ke zB, tinggi sampai yTop
    function underBed(p, kind, x0, x1, zF, zB, yTop, mat, mw) {
      if (kind === 'drawers') {
        var wd = (x1 - x0 - .03) / 2, hh = Math.min(.24, yTop - .05);
        [0, 1].forEach(function (i) { var cx = x0 + .01 + wd / 2 + i * (wd + .01); drawer(p, cx, .03 + hh / 2, zF - .02, wd, hh, Math.min(.6, zF - zB - .05), 0, mat, Math.min(.42, (zF - zB) * .7)); });
      } else if (kind === 'trundle') {
        var P = new T.Group(); p.add(P);
        var L = x1 - x0 - .02, D = zF - zB - .03, cx = (x0 + x1) / 2, zc = zF - .02 - D / 2, yd = .16;
        bx(P, cx - L / 2, .05, zF - .04, cx + L / 2, yd + .02, zF - .02, mat, .006);   // muka depan
        bx(P, cx - L / 2, .05, zc - D / 2, cx + L / 2, yd, zc - D / 2 + .02, mat, .004);
        [-1, 1].forEach(function (e) { bx(P, cx + e * (L / 2 - .01) - .01, .05, zc - D / 2, cx + e * (L / 2 - .01) + .01, yd, zF - .04, mat, .004); [-1, 1].forEach(function (q) { var w = cyl(P, .022, .022, .016, dark('#2a2522'), cx + e * (L / 2 - .08), .022, zc + q * (D / 2 - .08), 16); w.rotation.z = Math.PI / 2; }); });
        slats(P, 'x', cx - L / 2 + .03, cx + L / 2 - .03, zc - D / 2 + .02, zF - .04, yd, SLAT());
        box(P, Math.min(.18, L * .2), .014, .012, dark('#3a3430'), cx, yd - .03, zF - .014, .004);
        bedding(P, cx, yd, zc - .01, Math.min(mw, D - .04), Math.min(1.9, L - .06), true, { t: Math.min(.12, yTop - yd - .03), noPillow: true });
        addMotion(P, 'drawer', function (v) { P.position.z = (D - .05) * v; });
      }
    }
    // tirai tipis / kain: jangkar di A (atas), mengembang searah dirV sepanjang w; o.tie → diikat menyempit
    function curtain(p, A, dirV, nrm, w, yTop, yBot, mat, o) {
      o = o || {};
      var nu = Math.max(12, Math.round(w / .02)), nv = 24, pos = [], uv = [], idx = [], i, j, folds = Math.max(2, w / .085);
      for (j = 0; j <= nv; j++) {
        var v = j / nv, y = yTop - (yTop - yBot) * v, s = 1;
        if (o.tie) { var tv = o.tie; s = v < tv ? 1 - (1 - o.tw) * Math.pow(v / tv, 1.3) : o.tw + (o.flare || .3) * (v - tv) / (1 - tv); }
        for (i = 0; i <= nu; i++) {
          var u = i / nu, al = u * w * s, amp = (o.amp || .022) * (o.tie ? Math.min(1, .6 + .6 * (1 - s)) : 1), off = amp * Math.sin(u * folds * Math.PI * 2) * (u < .03 ? u / .03 : 1);
          pos.push(A[0] + dirV[0] * al + nrm[0] * off, y, A[2] + dirV[2] * al + nrm[2] * off); uv.push(u * w, y);
        }
      }
      for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * (nu + 1) + i; idx.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1); }
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      var m = mesh(geo, mat, p, true); m.castShadow = !!o.shadow; return m;
    }
    function sheer() { return M('sheer', function () { return new T.MeshStandardMaterial({ color: new T.Color('#f4efe6'), transparent: true, opacity: .42, side: T.DoubleSide, roughness: .95, metalness: 0, depthWrite: false }); }); }
    function clothM(hex) { return M('cloth' + hex, function () { var m = fabric(hex, 'linen').clone(); m.side = T.DoubleSide; return m; }); }
    // nakas pasangan (berkaki) di kiri-kanan, punggung di zBack
    function nightstands(p, xOut, zBack, Wd) {
      [-1, 1].forEach(function (sx) {
        var nx = sx * (xOut + .3), z0 = zBack + .02;
        bx(p, nx - .24, .06, z0, nx + .24, .56, z0 + .4, Wd, .006);
        drawer(p, nx, .43, z0 + .4, .44, .17, .32, 0, Wd, .22, { hm: H.brass() });
        [-1, 1].forEach(function (q) { leg(p, 'tapered', nx + q * .2, z0 + .05, .06, Wd); leg(p, 'tapered', nx + q * .2, z0 + .35, .06, Wd); });
      });
    }

    /* ================================================================ HEADBOARD (divan / platform / headboard saja / kanopi) */
    // channel tufting: satu permukaan menerus — tabung vertikal ±11 cm dengan puncak membulat,
    // jahitan sempit & dalam di antaranya, melengkung melewati tepi atas sampai ke belakang panel
    function hbChannel(p, hw, top, hz, F) {
      var th = .08, R = th / 2, pr = .03, k = Math.max(5, Math.round(hw / .11)), cw = hw / k;
      var zf = hz + th / 2, yArc = top - R - pr, yb = .02, Ls = yArc - yb, La = Math.PI * R, Ltot = Ls + La;
      var nu = k * 14, nv = Math.max(10, Math.round(Ls / .05)) + 18;
      var pos = [], nor = [], uvs = [], cols = [], idx = [];
      var crown = function (u) { var f = (u / cw) % 1; return Math.pow(Math.max(0, Math.sin(Math.PI * f)), .55); };
      for (var j = 0; j <= nv; j++) {
        var s = Ltot * j / nv, py, pz, ny, nz;
        if (s <= Ls) { py = yb + s; pz = zf; ny = 0; nz = 1; }
        else { var a = (s - Ls) / R; py = yArc + Math.sin(a) * R; pz = hz + Math.cos(a) * R; ny = Math.sin(a); nz = Math.cos(a); }
        var taper = Math.min(1, s / .04);   // ujung bawah merapat ke panel
        for (var i = 0; i <= nu; i++) {
          var u = hw * i / nu, x = -hw / 2 + u, cr = crown(u), off = pr * cr * taper;
          pos.push(x, py + ny * off, pz + nz * off);
          uvs.push(x, s);
          var sh = .62 + .38 * Math.pow(cr, .7); cols.push(sh, sh, sh);
        }
      }
      for (var jj = 0; jj < nv; jj++) for (var ii = 0; ii < nu; ii++) {
        var a0 = jj * (nu + 1) + ii, b0 = a0 + 1, c0 = a0 + nu + 1, d0 = c0 + 1;
        idx.push(a0, b0, c0, b0, d0, c0);
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      geo.setIndex(idx); geo.computeVertexNormals();
      var CM = M('chan' + F.uuid, function () { var m = F.clone(); m.vertexColors = true; m.side = T.DoubleSide; return m; });
      mesh(geo, CM, p, true);
      // panel dasar di belakang permukaan channel (sisi & punggung tetap rapi)
      box(p, hw, yArc - .005, th, F, 0, (yArc - .005) / 2, hz, .006);
      [-1, 1].forEach(function (e) { box(p, .012, top - pr * .5, th + pr * .8, F, e * (hw / 2 + .004), (top - pr * .5) / 2, hz + pr * .3, .005); });
    }
    // pelat berlapis dari bentuk 2D (x, y) setebal d, berpusat di z = zc; tepi membulat (bevel ke dalam garis bentuk)
    function softSlab(p, shape, d, zc, mat, bev) {
      bev = bev || .025;
      var geo = new T.ExtrudeGeometry(shape, { depth: Math.max(.005, d - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 5, curveSegments: 36 });
      var m = mesh(geo, mat, p); m.position.z = zc - d / 2 + bev; return m;
    }
    // garis atas awan / scallop: n lengkung, puncak tengah lebih tinggi (awan) atau sama (scallop)
    function scallopShape(hw, top, y0, n, cloud) {
      var sh = new T.Shape(), lw = hw / n, amp = Math.min(cloud ? .16 : .1, lw * (cloud ? .42 : .3)), i;
      var yb = function (i) { var m = (i + .5) / n - .5; return top - amp - (cloud ? Math.abs(m) * Math.min(.18, top * .16) : 0); };
      sh.moveTo(-hw / 2, y0); sh.lineTo(-hw / 2, yb(0) - amp * .25);
      for (i = 0; i < n; i++) {
        var x0 = -hw / 2 + lw * i, x1 = x0 + lw, b = yb(i), b1 = i < n - 1 ? Math.min(b, yb(i + 1)) : b - amp * .25;
        // satu lengkung: naik dari lekuk kiri, puncak membulat, turun ke lekuk kanan
        sh.bezierCurveTo(x0 + lw * .02, b + amp * 1.25, x1 - lw * .02, b + amp * 1.25, x1, i < n - 1 ? b1 : b1);
      }
      sh.lineTo(hw / 2, y0); sh.lineTo(-hw / 2, y0);
      return sh;
    }
    function archShape(hw, top, y0, rr) {
      var sh = new T.Shape(), r = hw / 2, k = rr == null ? .6 : rr;
      sh.moveTo(-r, y0); sh.lineTo(-r, top - r * k); sh.quadraticCurveTo(-r, top, 0, top); sh.quadraticCurveTo(r, top, r, top - r * k); sh.lineTo(r, y0); sh.lineTo(-r, y0);
      return sh;
    }
    function rrShape(w, y0, y1, rt) {   // persegi dengan sudut atas membulat
      var s = new T.Shape(), x0 = -w / 2, x1 = w / 2; rt = Math.min(rt, w / 2, (y1 - y0) / 2);
      s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1 - rt); s.quadraticCurveTo(x1, y1, x1 - rt, y1); s.lineTo(x0 + rt, y1); s.quadraticCurveTo(x0, y1, x0, y1 - rt); s.lineTo(x0, y0);
      return s;
    }
    // headboard → kembalikan z muka belakang. o: { F, Wd, Hb (tinggi divan), hbOnly, W }
    function headboard(p, hb, hw, hbH, hz, o) {
      var F = o.F, Wd = o.Wd, Hb = o.Hb || .3, back = hz - .04;
      if (hb === 'woodpanel') { box(p, hw, hbH, .04, Wd, 0, hbH / 2, hz, .006); back = hz - .02; }
      else if (hb === 'slat') { var ns = Math.round(hw / .08); for (var i = 0; i < ns; i++) box(p, .05, hbH, .03, Wd, -hw / 2 + hw * (i + .5) / ns, hbH / 2, hz, .005); box(p, hw, .05, .03, Wd, 0, hbH * .5, hz - .03, .004); back = hz - .045; }
      else if (hb === 'cane') {
        var fw = .055, sh = rrShape(hw, 0, hbH, Math.min(.16, hw * .1)), y0c = Math.max(Hb + .1, .42), nP = hw > 1.25 ? 2 : 1, pw = (hw - 2 * fw - (nP - 1) * fw) / nP;
        for (var q = 0; q < nP; q++) { var hx = -hw / 2 + fw + q * (pw + fw), hole = new T.Path(); hole.moveTo(hx, y0c); hole.lineTo(hx + pw, y0c); hole.lineTo(hx + pw, hbH - fw); hole.lineTo(hx, hbH - fw); hole.lineTo(hx, y0c); sh.holes.push(hole); var cp = box(p, pw + .01, hbH - fw - y0c + .01, .006, caneM(), hx + pw / 2, (y0c + hbH - fw) / 2, hz, 0); cp.castShadow = false; }
        var fm = new T.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelOffset: -.006, bevelSegments: 2, curveSegments: 24 });
        var mf = mesh(fm, Wd, p); mf.position.z = hz - .015 - .0; back = hz - .021;
      }
      else if (hb === 'arch') { softSlab(p, archShape(hw, hbH, 0), .1, hz, F, .03); back = hz - .05; }
      else if (hb === 'cloud') { var n = Math.max(3, Math.round(hw / .42)); softSlab(p, scallopShape(hw, hbH, 0, n, true), .1, hz, F, .04); back = hz - .05; }
      else if (hb === 'channel') hbChannel(p, hw, hbH, hz, F);
      else if (hb === 'channelH') cushion(p, hw, .08, hbH, F, 0, hbH / 2, hz, { r: .03, cr: .004, rx: Math.PI / 2, tuft: tuftOf('channelH', 'back', { pitch: .11 }) });
      else if (hb === 'button') cushion(p, hw, .09, hbH, F, 0, hbH / 2, hz, { r: .035, cr: .006, rx: Math.PI / 2, tuft: { pat: 'diamond', pitch: .17, pitchZ: .2, proud: .022 } });
      else {
        cushion(p, hw, .08, hbH, F, 0, hbH / 2, hz, { r: .03, cr: .004, rx: Math.PI / 2 });
        if (hb === 'wingback') [-1, 1].forEach(function (sx) { var wg = cushion(p, .1, hbH * .92, .38, F, sx * (hw / 2 - .02), hbH * .46, hz + .18, { r: .04, cr: .004 }); wg.rotation.y = sx * .3; });
      }
      if (o.hbOnly && (hb === 'woodpanel' || hb === 'slat')) { var ph = Math.max(.2, Math.min(.4, hbH - Hb - .35)); cushion(p, Math.min(o.W - .1, hw - .1), .05, ph, F, 0, Math.min(hbH - .08 - ph / 2, Hb + .3 + ph / 2), hz + (hb === 'slat' ? .04 : .045), { r: .022, cr: .012, rx: Math.PI / 2 - .05 }); }   // bantalan kain pada headboard kayu
      return back;
    }

    /* ================================================================ DIVAN · PLATFORM · HEADBOARD SAJA */
    function bed() {
      var s = c.sub, MW = (+c.mattress || 160) / 100, ML = 2, W = MW + .06, L = 2.06, Hb = cm(c.h, 30), F = FAB(), Wd = WOOD();
      var mount = c.mount || 'plinth', y0 = 0, inc = hasX('mattressinc');
      var hbOnly = s === 'headboard', plat = s === 'platform';
      var BM = plat ? Wd : F;
      var legM = c.legFinish === 'metal' ? METAL() : c.legFinish === 'same' ? F : Wd;
      var g = new T.Group(); root.add(g);
      var mt = Hb, st = c.storage || 'none', lift = !plat && !hbOnly && st === 'lift', LIFT = null;
      if (hbOnly) { box(g, W, Hb, L, ghost(), 0, Hb / 2, 0, .02).castShadow = false; }
      else {
        if (mount === 'plinth') { box(g, W - .08, .06, L - .08, dark('#1f1a16'), 0, .03, 0, .004); y0 = .06; }
        else if (mount === 'floating') { box(g, W - .5, .1, L - .5, dark(), 0, .05, 0, .004); box(g, W - .52, .006, .006, glow(), 0, .012, L / 2 - .26, 0); box(g, .006, .006, L - .52, glow(), W / 2 - .26, .012, 0, 0); box(g, .006, .006, L - .52, glow(), -W / 2 + .26, .012, 0, 0); y0 = .1; }
        else { y0 = cm(c.legH, 12); var ix = W / 2 - .07, iz = L / 2 - .07; [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz], [-ix, 0], [ix, 0]].forEach(function (q) { leg(g, c.leg || 'tapered', q[0], q[1], y0, legM); }); }
        if (plat) {   // rangka kayu + panel kain di rel samping & kaki
          var ft = .04, hh = Math.max(.12, Hb - y0);
          [-1, 1].forEach(function (e) { box(g, ft, hh, L, Wd, e * (W / 2 - ft / 2), y0 + hh / 2, 0, .005); cushion(g, .012, hh * .6, L - .3, F, e * (W / 2 + .004), y0 + hh / 2, 0, { r: .005, cr: .002 }); });
          box(g, W, hh, ft, Wd, 0, y0 + hh / 2, L / 2 - ft / 2, .005); cushion(g, W - .3, .012, hh * .6, F, 0, y0 + hh / 2, L / 2 + .004, { r: .005, cr: .002, rx: Math.PI / 2 });
          box(g, W - .08, .03, L - .08, Wd, 0, y0 + hh - .1, 0, .003);
          mt = y0 + hh - .085;
        } else if (lift) {
          // badan berongga (dinding kain + lantai gelap) — tutup + kasur terangkat dari ujung kaki (engsel di kepala)
          var wt = .035, hw0 = Hb - .04 - y0;
          [-1, 1].forEach(function (e) { cushion(g, wt, hw0, L, F, e * (W / 2 - wt / 2), y0 + hw0 / 2, 0, { r: .012, cr: .002 }); cushion(g, W - 2 * wt, hw0, wt, F, 0, y0 + hw0 / 2, e * (L / 2 - wt / 2), { r: .012, cr: .002 }); });
          box(g, W - 2 * wt, .012, L - 2 * wt, dark('#2a241f'), 0, y0 + .006, 0, .002);
          box(g, W - 2 * wt - .02, .02, .03, dark('#2a241f'), 0, y0 + hw0 - .03, 0, .002);
          LIFT = new T.Group(); LIFT.position.set(0, Hb - .04, -L / 2 + .02); g.add(LIFT);
          cushion(LIFT, W, .04, L, F, 0, .02, L / 2 - .02, { r: .012, cr: .002 });
        } else {
          cushion(g, W, Hb - y0, L, F, 0, y0 + (Hb - y0) / 2, 0, { r: .025, cr: .003, st: null });
        }
        if (!plat && (st === 'd2' || st === 'd4')) {
          var per = st === 'd2' ? 1 : 2, dh = Hb - y0 - .06;
          [-1, 1].forEach(function (sx) { for (var k = 0; k < per; k++) { var dl = (L - .5) / per, zc = -L / 2 + .35 + dl * (k + .5); drawer(g, sx * (W / 2 - .016), y0 + (Hb - y0) / 2, zc, dl - .02, dh, Math.min(.5, W / 2 - .1), sx * Math.PI / 2, BM, .42, { hm: dark() }); } });
        }
      }
      // kasur
      var MP = LIFT || g, mz = LIFT ? L / 2 - .02 + .02 : .02, myo = LIFT ? .04 : mt;
      if (!hbOnly || inc) {
        if (inc) {
          cushion(MP, MW, .22, ML, linen(), 0, myo + .11, mz, { r: .045, cr: .006, bu: .006, st: null });
          var pt = cushion(MP, MW - .01, .06, ML - .01, linen(), 0, myo + .25, mz, { r: .03, cr: .015, bu: .004 });
          H.stitchOn(pt, pt.geometry, 'piping', { topOnly: true });
          var np = MW < 1.1 ? 1 : 2;
          for (var p = 0; p < np; p++) { var pw = Math.min(.66, MW / np - .06), pl = cushion(MP, pw, .13, .42, linen(), -MW / 2 + MW * (p + .5) / np, myo + .36, mz - ML / 2 + .28, { r: .03, cr: .04, both: true }); pl.rotation.x = -.18; }
          box(MP, MW + .04, .045, .55, fabric(throwHex(), 'linen'), 0, myo + .3, mz + ML / 2 - .4, .02);
        } else box(MP, MW, .26, ML, ghost(), 0, myo + .13, mz, .06).castShadow = false;
      }
      if (LIFT) addMotion(LIFT, 'lift', function (v) { LIFT.rotation.x = -.6 * v; });
      // headboard
      var hb = c.headboard || 'panel', hbH = cm(c.hbH, 110), hw = c.hbW === 'wide' ? W + 1 : W + .04, hz = -L / 2 - .05;
      if (hb !== 'none') {
        var back = headboard(g, hb, hw, hbH, hz, { F: F, Wd: Wd, Hb: Hb, hbOnly: hbOnly, W: W });
        if (c.hbW === 'wall') {   // panel dinding fluted + nakas melayang di kiri-kanan
          var Wp = W + 1.3, Hp = Math.max(hbH + .25, 1.3), wz = back - .015;
          box(g, Wp, Hp, .03, fluted(woodHex), 0, Hp / 2, wz, .004);
          [-1, 1].forEach(function (sx) {
            var nx = sx * (W / 2 + .1 + .225), z0 = wz + .015;
            bx(g, nx - .225, .44, z0, nx + .225, .58, z0 + .38, Wd, .006);
            drawer(g, nx, .51, z0 + .38, .41, .1, .3, 0, Wd, .2, { hm: H.brass() });
            box(g, .4, .006, .006, glow(), nx, .437, z0 + .3, 0).castShadow = false;
          });
        }
      }
      // lampu baca & USB: di headboard, atau (tanpa headboard) di sudut kepala divan
      var lampY = hb !== 'none' ? hbH - .1 : mt + .5, lampZ = hb !== 'none' ? hz + .05 : -L / 2 + .02;
      if (hasX('readlamp')) [-1, 1].forEach(function (sx) {
        if (hb === 'none') rod(g, [sx * (W / 2 - .03), mt - .05, -L / 2 + .02], [sx * (W / 2 - .03), lampY, -L / 2 + .02], .006, METAL());
        rod(g, [sx * (W / 2 - .15), lampY, lampZ], [sx * (W / 2 - .15), lampY, lampZ + .15], .006, METAL()); if (hb === 'none') rod(g, [sx * (W / 2 - .03), lampY, lampZ], [sx * (W / 2 - .15), lampY, lampZ], .006, METAL());
        sphere(g, .03, glow(), sx * (W / 2 - .15), lampY - .03, lampZ + .15);
      });
      if (hasX('usb')) [-1, 1].forEach(function (sx) { if (hb !== 'none') box(g, .05, .08, .01, dark(), sx * (W / 2 - .05), Hb + .32, hz + .06, .003); else box(g, .01, .05, .08, dark(), sx * (W / 2 + .006), (hbOnly ? Hb : mt) - .06, -L / 2 + .2, .003); });
      if (hasX('bench')) cushion(g, W * .72, .42, .42, F, 0, .21, L / 2 + .33, { r: .04, cr: .01 });
      if (hasX('nightstand') && !(c.hbW === 'wall' && hb !== 'none')) nightstands(g, Math.max(W, hw) / 2 - .02, hz - .04, Wd);
    }

    /* ================================================================ KANOPI / FOUR-POSTER */
    function canopy() {
      var G = GEO(c), g = new T.Group(); root.add(g);
      var pt = G.pt, W0 = G.W0, L0 = G.L0, Hh = G.H, met = c.post === 'metal', PM = met ? METAL() : WOOD(), F = FAB(), Wd = WOOD(), cp = c.canopy || 'frame';
      var px = W0 / 2 + pt / 2, pz = L0 / 2 + pt / 2, rt = met ? .03 : .045, yR0 = .16, yR1 = .36, yd = .30;
      var postTop = cp === 'arched' ? Hh - .3 : Hh;
      // tiang
      [[-px, -pz], [px, -pz], [-px, pz], [px, pz]].forEach(function (q) {
        if (met) { cyl(g, pt / 2, pt / 2, postTop - .01, PM, q[0], (postTop - .01) / 2, q[1], 20); cyl(g, pt / 2 + .006, pt / 2 + .006, .02, PM, q[0], .01, q[1], 20); if (cp !== 'frame') sphere(g, .026, H.brass(), q[0], postTop + .012, q[1]); return; }
        if (c.post === 'turned') {
          var topB = cp === 'posts' ? postTop - .09 : postTop, yb0 = .5, yt0 = topB - .14, prof = [], k;
          bx(g, q[0] - pt / 2, 0, q[1] - pt / 2, q[0] + pt / 2, yb0, q[1] + pt / 2, PM, .008);
          bx(g, q[0] - pt / 2, yt0, q[1] - pt / 2, q[0] + pt / 2, topB, q[1] + pt / 2, PM, .008);
          for (k = 0; k <= 60; k++) { var t = k / 60, y = yb0 + (yt0 - yb0) * t, r = .026 + .016 * Math.exp(-Math.pow((t - .08) / .03, 2)) + .02 * Math.exp(-Math.pow((t - .2) / .07, 2)) + .012 * Math.exp(-Math.pow((t - .5) / .02, 2)) + .014 * Math.exp(-Math.pow((t - .93) / .03, 2)) + .006 * Math.sin(t * 40) * Math.exp(-Math.pow((t - .7) / .12, 2)); prof.push(new T.Vector2(Math.min(pt / 2, r), y)); }
          var lg = mesh(new T.LatheGeometry(prof, 28), PM, g); lg.position.set(q[0], 0, q[1]);
          if (cp === 'posts') { cyl(g, .018, .028, .03, PM, q[0], topB + .015, q[1], 20); sphere(g, .036, PM, q[0], postTop - .036, q[1]); }
        } else { bx(g, q[0] - pt / 2, 0, q[1] - pt / 2, q[0] + pt / 2, postTop, q[1] + pt / 2, PM, .01); }
      });
      // rangka ranjang (rel di sumbu tiang) + reng + kasur
      [-1, 1].forEach(function (e) { piece(g, 'z', -pz + pt / 2, pz - pt / 2, e * px, yR0, yR1, rt, met ? PM : Wd, .006); piece(g, 'x', -px + pt / 2, px - pt / 2, e * pz, yR0, yR1, rt, met ? PM : Wd, .006); });
      [-1, 1].forEach(function (e) { piece(g, 'z', -pz + pt / 2, pz - pt / 2, e * (px - rt / 2 - .011), yd - .045, yd - .018, .022, SLAT(), .002); });
      slats(g, 'z', -pz + pt / 2 + .01, pz - pt / 2 - .01, -px + rt / 2, px - rt / 2, yd, SLAT());
      bedding(g, 0, yd, 0, G.MW, G.ML, false, { t: .24 });
      // headboard di antara tiang kepala
      var hbH = Math.min(cm(c.hbH, 120), postTop - .12);
      headboard(g, c.headboard || 'panel', W0, hbH, -pz, { F: F, Wd: Wd, Hb: .5, W: W0 });
      if (c.foot === 'low') { var fy = .62; bx(g, -W0 / 2, yR1 - .01, pz - .018, W0 / 2, fy, pz + .018, Wd, .006); piece(g, 'x', -W0 / 2, W0 / 2, pz, fy - .045, fy, .05, Wd, .008); }
      // kanopi
      var yT = Hh - (met ? .015 : .035);
      if (cp === 'frame') {
        [-1, 1].forEach(function (e) {
          if (met) { rod(g, [-px, yT, e * pz], [px, yT, e * pz], .014, PM, 16); rod(g, [e * px, yT, -pz], [e * px, yT, pz], .014, PM, 16); }
          else { piece(g, 'x', -px + pt / 2, px - pt / 2, e * pz, Hh - .075, Hh - .005, .05, PM, .006); piece(g, 'z', -pz + pt / 2, pz - pt / 2, e * px, Hh - .075, Hh - .005, .05, PM, .006); }
        });
        if (met) [[-px, -pz], [px, -pz], [-px, pz], [px, pz]].forEach(function (q) { sphere(g, .02, PM, q[0], yT, q[1]); });
        if (hasX('led')) [-1, 1].forEach(function (e) { box(g, .006, .006, 2 * pz - pt - .04, glow(), e * (px - (met ? .02 : .03)), Hh - .08, 0, 0).castShadow = false; });
      } else if (cp === 'arched') {
        var arc = function (A, B) { var pts = [], k; for (k = 0; k <= 24; k++) { var t = k / 24; pts.push(new T.Vector3(A[0] + (B[0] - A[0]) * t, postTop + .3 * Math.pow(Math.sin(Math.PI * t), .8), A[2] + (B[2] - A[2]) * t)); } mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, .012, 10, false), PM, g); };
        [-1, 1].forEach(function (e) { arc([-px, 0, e * pz], [px, 0, e * pz]); arc([e * px, 0, -pz], [e * px, 0, pz]); });
      }
      // tirai & atap kain
      var dr = cp === 'posts' ? 'none' : c.drape || 'none', yTop = cp === 'arched' ? postTop - .01 : Hh - .08;
      if (dr === 'top' || dr === 'full') {
        var ty = cp === 'arched' ? postTop + .26 : Hh - .002, nX = 20, nZ = 26, pos = [], uv = [], idx = [], i, j;
        for (j = 0; j <= nZ; j++) for (i = 0; i <= nX; i++) { var u = i / nX, v = j / nZ, sag = .05 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v); pos.push(-px + 2 * px * u, ty - sag - (cp === 'arched' ? .22 * (1 - Math.sin(Math.PI * u) * Math.sin(Math.PI * v)) : 0), -pz + 2 * pz * v); uv.push(u * 2 * px, v * 2 * pz); }
        for (j = 0; j < nZ; j++) for (i = 0; i < nX; i++) { var a = j * (nX + 1) + i; idx.push(a, a + nX + 1, a + 1, a + 1, a + nX + 1, a + nX + 2); }
        var tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
        mesh(tg, sheer(), g, true).castShadow = false;
        // valance (lis kain) keliling
        if (cp === 'frame') [-1, 1].forEach(function (e) { curtain(g, [-px - .03, 0, e * (pz + .03)], [1, 0, 0], [0, 0, e], 2 * px + .06, Hh, Hh - .14, sheer(), { amp: .004 }); curtain(g, [e * (px + .03), 0, -pz - .03], [0, 0, 1], [e, 0, 0], 2 * pz + .06, Hh, Hh - .14, sheer(), { amp: .004 }); });
      }
      if (dr === 'corners' || dr === 'full') {
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
          var x = q[0] * (px + (met ? .02 : .03)), z = q[1] * pz;
          // tirai di sisi panjang, terikat di tiang setinggi ±1 m
          curtain(g, [x, 0, z - q[1] * pt * .6], [0, 0, -q[1]], [q[0], 0, 0], Math.min(.7, pz * .6), yTop, .02, sheer(), { tie: (yTop - 1.0) / (yTop - .02), tw: .3, flare: .35, amp: .03 });
        });
      }
      if (hasX('bench')) cushion(g, W0 * .72, .42, .42, F, 0, .21, pz + pt / 2 + .3, { r: .04, cr: .01 });
      if (hasX('nightstand')) nightstands(g, px + pt / 2 - .02, -pz - pt / 2 + .02, Wd);
    }

    /* ================================================================ RANJANG SUSUN & LOFT (panjang searah x, sisi panjang menghadap depan) */
    function frameDeck(p, x0, x1, z0, z1, yd, mat, o) {
      // rel samping/ujung di antara tiang (muka luar rata dengan tiang), lis penahan & reng; o.skip = ['xF','xB','zL','zR']
      o = o || {};
      var pt = o.pt, rT = isMetal ? .03 : .045, rH = isMetal ? .07 : .14, yt = yd + .05, sk = o.skip || [];
      if (sk.indexOf('xB') < 0) piece(p, 'x', x0 + pt, x1 - pt, z0 + rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('xF') < 0) piece(p, 'x', x0 + pt, x1 - pt, z1 - rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('zL') < 0) piece(p, 'z', z0 + pt, z1 - pt, x0 + rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('zR') < 0) piece(p, 'z', z0 + pt, z1 - pt, x1 - rT / 2, yt - rH, yt, rT, mat, .005);
      // lis penahan reng (di bawah reng, menempel muka dalam rel)
      piece(p, 'x', x0 + pt, x1 - pt, z0 + rT + .011, yd - .045, yd - .018, .022, SLAT(), .002);
      piece(p, 'x', x0 + pt, x1 - pt, z1 - rT - .011, yd - .045, yd - .018, .022, SLAT(), .002);
      slats(p, 'x', x0 + pt + .01, x1 - pt - .01, z0 + rT, z1 - rT, yd, SLAT());
      return { rT: rT, rH: rH, yt: yt };
    }
    function frameDeckZ(p, x0, x1, z0, z1, yd, mat, o) {   // deck memanjang searah z (loft bagian L)
      o = o || {};
      var pt = o.pt, rT = isMetal ? .03 : .045, rH = isMetal ? .07 : .14, yt = yd + .05, sk = o.skip || [];
      if (sk.indexOf('zL') < 0) piece(p, 'z', z0 + pt, z1 - pt, x0 + rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('zR') < 0) piece(p, 'z', z0 + pt, z1 - pt, x1 - rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('xB') < 0) piece(p, 'x', x0 + pt, x1 - pt, z0 + rT / 2, yt - rH, yt, rT, mat, .005);
      if (sk.indexOf('xF') < 0) piece(p, 'x', x0 + pt, x1 - pt, z1 - rT / 2, yt - rH, yt, rT, mat, .005);
      piece(p, 'z', z0 + pt, z1 - pt, x0 + rT + .011, yd - .045, yd - .018, .022, SLAT(), .002);
      piece(p, 'z', z0 + pt, z1 - pt, x1 - rT - .011, yd - .045, yd - .018, .022, SLAT(), .002);
      slats(p, 'z', z0 + pt + .01, z1 - pt - .01, x0 + rT, x1 - rT, yd, SLAT());
      return { rT: rT, rH: rH, yt: yt };
    }
    function bunkLike(isLoft) {
      var G = GEO(c), g = new T.Group(); root.add(g);
      var FM = FR(), pt = G.pt, L = G.L, W1 = G.W1, W2 = G.W2, zb = G.zb, zf1 = G.zf1, zf2 = G.zf2, Hh = G.H, yd0 = G.yd0, yd1 = G.yd1, lay = G.lay, acc = G.acc, rail = c.rail || 'bars';
      var xl = -L / 2 + pt / 2, xr = L / 2 - pt / 2, zbp = zb + pt / 2, zf1p = zf1 - pt / 2, zf2p = zf2 - pt / 2, triple = lay === 'triple', tf = lay === 'twinFull';
      var gOpt = { metal: isMetal, th: isMetal ? .03 : .028 };
      var endTop = yd0 + .42;
      // ---- tiang
      post(g, xl, zbp, 0, Hh, FM, pt, isMetal); post(g, xr, zbp, 0, Hh, FM, pt, isMetal);
      if (tf) {
        post(g, xl, zf2p, 0, endTop, FM, pt, isMetal); post(g, xr, zf2p, 0, endTop, FM, pt, isMetal);
        post(g, xl, zf1p, endTop, Hh, FM, pt, isMetal); post(g, xr, zf1p, endTop, Hh, FM, pt, isMetal);
        [xl, xr].forEach(function (x) { piece(g, 'z', zb + pt, zf2 - pt, x, endTop - .06, endTop, pt, FM, .006); });   // palang ujung penopang tiang atas
      } else { post(g, xl, zf1p, 0, Hh, FM, pt, isMetal); post(g, xr, zf1p, 0, Hh, FM, pt, isMetal); }
      // ---- deck bawah (bunk)
      var gb = (G.x0 + G.x1) / 2;
      if (!isLoft) {
        var d0 = frameDeck(g, -L / 2, L / 2, zb, zf2, yd0, FM, { pt: pt });
        bedding(g, 0, yd0, (zb + zf2) / 2, G.MB, G.ML, true, { t: .18 });
        // panel ujung bawah (kepala & kaki)
        [-1, 1].forEach(function (e) { guard(g, 'z', zb + pt, (tf ? zf2 : zf1) - pt, e * (L / 2 - d0.rT / 2), d0.yt, endTop - (tf ? .06 : 0), rail, FM, null, gOpt); });
        if (c.under === 'drawers' || c.under === 'trundle') underBed(g, c.under, -L / 2 + pt, L / 2 - pt, zf2, zb + pt, yd0 - .1, FM, G.MB);
        if (hasX('curtain')) { var cy = yd1 - .09 - .03; rod(g, [-L / 2 + pt, cy, zf1 + .03], [L / 2 - pt, cy, zf1 + .03], .009, METAL(), 12); [-L / 2 + pt + .03, L / 2 - pt - .03].forEach(function (x) { bx(g, x - .008, cy - .01, zf1, x + .008, cy + .015, zf1 + .03, METAL(), .002); }); curtain(g, [-L / 2 + pt + .02, 0, zf1 + .03], [1, 0, 0], [0, 0, 1], Math.min(.95, L * .42), cy - .005, yd0 + .08, clothM('#c9bba4'), { amp: .028, shadow: true }); }
        if (hasX('shelf')) { bx(g, -L / 2 + pt, yd0 + .32, zb + .03, -L / 2 + pt + .32, yd0 + .34, zb + .16, FM, .003); bx(g, -L / 2 + pt, yd0 + .34, zb + .03, -L / 2 + pt + .32, yd0 + .42, zb + .045, FM, .003); }
        if (hasX('lamp')) box(g, .2, .012, .05, glow(), -L / 2 + pt + .35, yd1 - .06, zb + .2, .004).castShadow = false;
      }
      // ---- deck atas
      var skipU = triple ? ['zR'] : [];
      var d1 = frameDeck(g, -L / 2, L / 2, zb, zf1, yd1, FM, { pt: pt, skip: skipU });
      bedding(g, 0, yd1, (zb + zf1) / 2, G.MW, G.ML, true, { t: .18 });
      var lad = G.lad, gapF = [], gapL = [], gapR = [];
      if (lad && lad.kind === 'front') gapF.push([lad.x - .2, lad.x + .2]);
      if (lad && lad.kind === 'angled') gapF.push([lad.x - .23, lad.x + .23]);
      if (lad && lad.kind === 'end') gapR.push([lad.z - .2, lad.z + .2]);
      var stairW = Math.min(W1 - 2 * pt - .05, .5);
      if (acc === 'stairsL') gapL.push([zb + pt, zb + pt + stairW]);
      if (acc === 'stairsR') gapR.push([zb + pt, zb + pt + stairW]);
      guard(g, 'x', -L / 2 + pt, L / 2 - pt, zb + d1.rT / 2, d1.yt, Hh, rail, FM, null, gOpt);
      guard(g, 'x', -L / 2 + pt, L / 2 - pt, zf1 - d1.rT / 2, d1.yt, Hh, rail, FM, gapF, { metal: isMetal, th: gOpt.th, gapPosts: !(lad && lad.kind === 'front') });
      guard(g, 'z', zb + pt, zf1 - pt, -L / 2 + d1.rT / 2, d1.yt, Hh, rail, FM, gapL, gOpt);
      if (!triple) guard(g, 'z', zb + pt, zf1 - pt, L / 2 - d1.rT / 2, d1.yt, Hh, rail, FM, gapR, { metal: isMetal, th: gOpt.th, gapPosts: !(lad && lad.kind === 'end') });
      // ---- akses
      if (lad && lad.kind === 'front') ladderV(g, 'x', lad.x, zf1, d1.yt, Hh, 1, FM, isMetal);
      else if (lad && lad.kind === 'end') ladderV(g, 'z', lad.z, L / 2, d1.yt, Hh, 1, FM, isMetal);
      else if (lad && lad.kind === 'angled') ladderA(g, 'x', lad.x, zf1, d1.yt, G.run, 1, FM);
      else if (acc === 'stairsL' || acc === 'stairsR') { var sx = acc === 'stairsL' ? -1 : 1; stairs(g, sx, sx * L / 2, G.sw, zf2, zb, yd1 + .02, FM); }
      // ---- bagian L (susun 3): deck atas memanjang ke depan di kanan
      if (triple) {
        var xa = L / 2 - pt, xb = xa + W1, zL1 = zb + L, xm = (xa + xb) / 2;
        post(g, xb - pt / 2, zbp, 0, Hh, FM, pt, isMetal); post(g, xa + pt / 2, zL1 - pt / 2, 0, Hh, FM, pt, isMetal); post(g, xb - pt / 2, zL1 - pt / 2, 0, Hh, FM, pt, isMetal);
        var d2 = frameDeckZ(g, xa, xb, zb, zL1, yd1, FM, { pt: pt });
        bedding(g, xm, yd1, (zb + zL1) / 2, G.MW, G.ML, false, { t: .18 });
        guard(g, 'z', zb + pt, zL1 - pt, xa + d2.rT / 2, d2.yt, Hh, rail, FM, [[zf1 - pt - .002, zf1 + .002]], { metal: isMetal, th: gOpt.th, gapPosts: false });
        guard(g, 'z', zb + pt, zL1 - pt, xb - d2.rT / 2, d2.yt, Hh, rail, FM, null, gOpt);
        guard(g, 'x', xa + pt, xb - pt, zb + d2.rT / 2, d2.yt, Hh, rail, FM, null, gOpt);
        guard(g, 'x', xa + pt, xb - pt, zL1 - d2.rT / 2, d2.yt, Hh, rail, FM, [[xm - .2, xm + .2]], { metal: isMetal, th: gOpt.th, gapPosts: false });
        ladderV(g, 'x', xm, zL1, d2.yt, Hh, 1, FM, isMetal);
        // rel bawah pengaku di bawah bagian L
        piece(g, 'x', xa + pt, xb - pt, zL1 - pt / 2, .1, .16, .03, FM, .004);
      }
      // ---- loft: isi bawah
      if (isLoft) {
        var below = c.below || 'desk', ix0 = -L / 2 + pt, ix1 = L / 2 - pt, yU = yd1 + .05 - d1.rH, Wd = WOOD();
        if (below === 'desk') {
          var shW = .4, dk = .74, dd = Math.min(.58, W1 - 2 * pt - .1);
          // rak buku terbuka (sisi, atas, alas, punggung, papan) menempel rel bawah deck
          [ix0, ix0 + shW - .018].forEach(function (x) { bx(g, x, 0, zb + .01, x + .018, yU, zb + .36, Wd, .003); });
          bx(g, ix0 + .018, yU - .018, zb + .01, ix0 + shW - .018, yU, zb + .36, Wd, .003); bx(g, ix0 + .018, .0, zb + .01, ix0 + shW - .018, .06, zb + .36, Wd, .003);
          bx(g, ix0 + .018, .06, zb + .01, ix0 + shW - .018, yU - .018, zb + .022, Wd, .002);
          [.3, .55, .8].forEach(function (f) { bx(g, ix0 + .018, yU * f - .009, zb + .022, ix0 + shW - .018, yU * f + .009, zb + .35, Wd, .002); });
          bx(g, ix0 + shW, dk - .03, zb + pt, ix1, dk, zb + pt + dd, Wd, .006);
          leg(g, 'straight', ix1 - .03, zb + pt + dd - .03, dk - .03, Wd);
          bx(g, ix0 + shW + .02, dk - .25, zb + pt, ix1 - .02, dk - .03, zb + pt + .018, Wd, .003);   // panel belakang
          drawer(g, ix1 - .3, dk - .08, zb + pt + dd - .02, .42, .09, .4, 0, Wd, .26);
        } else if (below === 'wardrobe') {
          var ww = Math.min(1.0, (ix1 - ix0) * .48), wd = Math.min(.58, W1 - 2 * pt - .04), wx0 = ix1 - ww;
          bx(g, wx0, 0, zb + pt, ix1, yU, zb + pt + wd, FM, .004);
          var DP = new T.Group(); DP.position.set(wx0 + .005, 0, zb + pt + wd); g.add(DP);
          bx(DP, 0, .03, 0, ww / 2 - .01, yU - .02, .02, FM, .004); box(DP, .016, .22, .02, H.brass(), ww / 2 - .06, yU * .5, .03, .004);
          addMotion(DP, 'door', function (v) { DP.rotation.y = -1.55 * v; });
          box(g, ww / 2 - .015, yU - .05, .02, FM, ix1 - ww / 4 - .005, yU / 2 + .005, zb + pt + wd + .01, .004); box(g, .016, .22, .02, H.brass(), ix1 - ww / 2 + .045, yU * .5, zb + pt + wd + .03, .004);
          // rak terbuka + laci di kiri
          var cw = Math.min(.8, wx0 - ix0 - .1), cd = Math.min(.45, wd);
          bx(g, ix0, 0, zb + pt, ix0 + cw, .74, zb + pt + cd, FM, .004);
          [0, 1, 2].forEach(function (k) { drawer(g, ix0 + cw / 2, .03 + .235 * k + .11, zb + pt + cd, cw - .03, .22, cd - .04, 0, FM, .3); });
          bx(g, ix0, 1.1, zb + pt, wx0, 1.125, zb + pt + .3, FM, .003);
        } else if (below === 'sofa') {
          var Fs = FAB(), sd = Math.min(.82, W1 - 2 * pt), sz0 = zb + .0;
          cushion(g, ix1 - ix0, .3, sd, Fs, 0, .15, sz0 + sd / 2, { r: .02, cr: .003 });
          cushion(g, ix1 - ix0, .62, .12, Fs, 0, .3 + .31, sz0 + pt + .06, { r: .03, cr: .004 });   // sandaran rangka
          cushion(g, ix1 - ix0 - .02, .14, sd - .2, Fs, 0, .37, sz0 + .2 + (sd - .2) / 2, { r: .04, cr: .02 });
          var nb = Math.max(2, Math.round((ix1 - ix0) / .7));
          for (var k = 0; k < nb; k++) { var bw = (ix1 - ix0 - .02) / nb, bc = cushion(g, bw - .01, .16, .44, Fs, ix0 + .01 + bw * (k + .5), .44 + .22, sz0 + pt + .12 + .08 + .02, { r: .05, cr: .03, rx: Math.PI / 2 - .2 }); }
        }
        if (hasX('led')) box(g, ix1 - ix0 - .1, .006, .006, glow(), 0, yU - .004, zf1 - .06, 0).castShadow = false;
        if (hasX('curtain')) { var cy2 = yU - .03; rod(g, [ix0, cy2, zf1 + .03], [ix1, cy2, zf1 + .03], .009, METAL(), 12); [ix0 + .03, ix1 - .03].forEach(function (x) { bx(g, x - .008, cy2 - .01, zf1, x + .008, cy2 + .015, zf1 + .03, METAL(), .002); }); curtain(g, [ix0 + .02, 0, zf1 + .03], [1, 0, 0], [0, 0, 1], Math.min(.9, (ix1 - ix0) * .42), cy2 - .005, .03, clothM('#c9bba4'), { amp: .028, shadow: true }); }
      }
      if (hasX('shelf')) { bx(g, -L / 2 + pt, yd1 + .3, zb + .03, -L / 2 + pt + .32, yd1 + .32, zb + .16, FM, .003); }
      if (hasX('lamp')) { rod(g, [-L / 2 + pt + .45, Hh - .06, zb + .03], [-L / 2 + pt + .45, Hh - .03, zb + .13], .006, METAL()); sphere(g, .026, glow(), -L / 2 + pt + .45, Hh - .045, zb + .15); }
    }

    /* ================================================================ DAYBED & RANJANG SORONG (panjang searah x) */
    // lengan berlapis: profil (z, y) diekstrusi sepanjang x dari x0 setebal t
    function armSlab(p, x0, t, zb, zf, y0, top, style, mat, ySeat) {
      var s = new T.Shape(), bev = .022;
      if (style === 'round') { var R = Math.min(.2, (top - y0) * .45, (zf - zb) * .4); s.moveTo(zb, y0); s.lineTo(zf, y0); s.lineTo(zf, top - R); s.absarc(zf - R, top - R, R, 0, Math.PI / 2, false); s.lineTo(zb, top); s.lineTo(zb, y0); }
      else if (style === 'slope') { var yl = Math.min(top - .05, ySeat + .2); s.moveTo(zb, y0); s.lineTo(zf, y0); s.lineTo(zf, yl - .04); s.quadraticCurveTo(zf, yl, zf - .05, yl + .01); s.quadraticCurveTo(zb + (zf - zb) * .45, top - .02, zb + .03, top); s.lineTo(zb, top); s.lineTo(zb, y0); }
      else { s.moveTo(zb, y0); s.lineTo(zf, y0); s.lineTo(zf, top); s.lineTo(zb, top); s.lineTo(zb, y0); }
      var geo = new T.ExtrudeGeometry(s, { depth: Math.max(.01, t - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 4, curveSegments: 24 });
      geo.rotateY(-Math.PI / 2);
      var m = mesh(geo, mat, p); m.position.x = x0 + t - bev; return m;
    }
    // daybed berlapis: badan + (lengan) + (sandaran) ; base = 'legs' | 'plinth' | 'trundle'
    function dayUph(p, o) {
      var F = FAB(), L = o.L, W = o.W, aT = o.aT, bT = o.bT, yb = o.yb, deck = o.deck, top = o.top, Hh = o.H, x0 = -L / 2 + aT, x1 = L / 2 - aT, zf = W / 2, zbk = -W / 2;
      // badan / deck
      if (o.base === 'trundle') {
        bx(p, x0, deck - .09, zbk + bT - .01, x1, deck, zf, F, .012);    // deck berlapis (rel depan)
        bx(p, x0, yb, zbk + bT - .02, x1, deck - .09, zbk + bT, dark('#2a241f'), .002);   // dinding belakang rongga
      } else cushion(p, x1 - x0 + (aT ? .0 : 0), deck - yb, W - bT + (bT ? .01 : 0), F, (x0 + x1) / 2, yb + (deck - yb) / 2, (zbk + bT - (bT ? .01 : 0) + zf) / 2, { r: .02, cr: .003 });
      if (o.ends) [-1, 1].forEach(function (e) { armSlab(p, e < 0 ? -L / 2 : L / 2 - aT, aT, zbk, zf, yb, o.armTop, c.arm || 'track', F, top); });
      if (o.back) cushion(p, x1 - x0 + (o.ends ? .02 : 0), Hh - yb, bT, F, (x0 + x1) / 2, yb + (Hh - yb) / 2, zbk + bT / 2, { r: .03, cr: .004 });
      return { x0: x0, x1: x1, zFace: zbk + bT, zf: zf };
    }
    // permukaan kasur daybed (kain) + bantal + bolster
    function dayTop(p, x0, x1, zFace, zf, deck, Hh, o) {
      o = o || {};
      var F = FAB(), t = .16, ml = x1 - x0 - .02, mw = zf - zFace - .02, cx = (x0 + x1) / 2, cz = (zFace + zf) / 2 - .002;
      if (o.ghost) { bedding(p, cx, deck, cz, mw, ml, true, { t: t }); }
      else cushion(p, ml, t, mw, F, cx, deck + t / 2, cz, { r: .04, cr: .012, bu: .004, tuft: o.tuft || null });
      var ySeat = deck + t, faceZ = function () { return zFace + .005; };
      var nb = Math.min(2, +c.bolsters || 0);
      if (nb) endBolsters(p, nb, 0, F, x0 + .01, x1 - .01, ySeat, faceZ, zf - .02);
      var np = +c.pillows || 0;
      if (np && o.back !== false) pillowRow(p, np, pillowMat(), x0 + (nb ? .19 : .02), x1 - (nb > 1 ? .19 : .02), 'both', ySeat, faceZ, Hh - .06, .46, 'square');
    }
    function trundle() {
      var G = GEO(c), g = new T.Group(); root.add(g);
      var L = G.L, W = G.W, Hh = G.H, st = G.style, deck = G.deck - .02, F = FAB(), Wd = WOOD(), inc = hasX('mattressinc'), yb = .03, mat = st === 'wood' ? Wd : F;
      var ix0, ix1, zFace, zFr = W / 2;
      if (st === 'daybed') {
        // kaki blok gelap
        [-1, 1].forEach(function (e) { [-1, 1].forEach(function (q) { bx(g, e * (L / 2 - .07) - .03, 0, q * (W / 2 - .07) - .03, e * (L / 2 - .07) + .03, yb, q * (W / 2 - .07) + .03, dark('#2a2522'), .004); }); });
        var r = dayUph(g, { L: L, W: W, aT: G.aT, bT: G.bT, yb: yb, deck: deck, top: deck + .16, H: Hh, armTop: Math.max(deck + .28, Hh - (c.arm === 'track' ? .1 : 0)), ends: true, back: true, base: 'trundle' });
        ix0 = r.x0; ix1 = r.x1; zFace = r.zFace;
      } else if (st === 'wood') {
        var pt = G.pt, armT = Math.max(deck + .3, Hh - .14);
        [[-1, -1, Hh], [1, -1, Hh], [-1, 1, armT], [1, 1, armT]].forEach(function (q) { post(g, q[0] * (L / 2 - pt / 2), q[1] * (W / 2 - pt / 2), 0, q[2], Wd, pt); });
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - .02, deck - .09, deck, .04, Wd, .005);
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + .02, deck - .09, deck, .04, Wd, .005);
        [-1, 1].forEach(function (e) { piece(g, 'z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - .02), .1, deck, .04, Wd, .005); guard(g, 'z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - pt / 2), deck, armT, 'spindle', Wd, null, { th: .03 }); });
        guard(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + pt / 2, deck, Hh, 'spindle', Wd, null, { th: .03 });
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + .045 + .011, deck - .045, deck - .018, .022, SLAT(), .002);
        slats(g, 'x', -L / 2 + pt + .01, L / 2 - pt - .01, -W / 2 + .045, W / 2 - .04, deck - .0, SLAT());
        ix0 = -L / 2 + pt; ix1 = L / 2 - pt; zFace = -W / 2 + pt; mat = Wd;
        deck = deck;   // reng di deck
      } else {   // divan + headboard di ujung kiri
        var hbT = G.hbT;
        [-1, 1].forEach(function (e) { [-1, 1].forEach(function (q) { bx(g, e * (L / 2 - .08) - .03 + (e < 0 ? hbT / 2 : 0), 0, q * (W / 2 - .07) - .03, e * (L / 2 - .08) + .03 + (e < 0 ? hbT / 2 : 0), yb, q * (W / 2 - .07) + .03, dark('#2a2522'), .004); }); });
        bx(g, -L / 2 + hbT, deck - .09, -W / 2, L / 2, deck, W / 2, F, .012);
        bx(g, -L / 2 + hbT, yb, -W / 2, L / 2, deck - .09, -W / 2 + .03, F, .006);
        bx(g, L / 2 - .03, yb, -W / 2, L / 2, deck - .09, W / 2, F, .006);
        cushion(g, hbT, Hh, W, F, -L / 2 + hbT / 2, Hh / 2, 0, { r: .035, cr: .004 });
        ix0 = -L / 2 + hbT; ix1 = L / 2; zFace = -W / 2;
      }
      // kasur utama
      var mx0 = st === 'divan' ? ix0 + .01 : ix0, mx1 = st === 'divan' ? ix1 - .01 : ix1;
      if (st === 'divan') bedding(g, (mx0 + mx1) / 2, deck, 0, G.MW, G.ML, true, { t: .18 });
      else dayTop(g, mx0, mx1, zFace, zFr - (st === 'wood' ? .04 : 0), deck, Hh, {});
      // ranjang sorong / pop-up / laci di rongga bawah
      var tx0 = (st === 'divan' ? ix0 : ix0) + .015, tx1 = (st === 'divan' ? ix1 - .03 : ix1) - .015, zB = zFace + .02, kind = c.trundle || 'roll';
      if (kind === 'drawers') {
        var wd = (tx1 - tx0 - .02) / 2, dh = deck - .09 - yb - .03;
        [0, 1].forEach(function (i) { drawer(g, tx0 + wd / 2 + i * (wd + .02), yb + .015 + dh / 2, zFr - .02, wd, dh, Math.min(.6, zFr - zB - .05), 0, mat, .42, { hm: dark() }); });
      } else {
        var P = new T.Group(); g.add(P);
        var tL = tx1 - tx0, tD = zFr - zB - .02, cx = (tx0 + tx1) / 2, zc = zFr - tD / 2 - .01, ytd = .16, fh = deck - .09 - .02 - .015;
        var FR2 = new T.Group(); P.add(FR2);
        bx(FR2, tx0, .015, zFr - .025, tx1, .015 + fh, zFr - .005, mat, .008);   // muka depan (rata dengan badan)
        bx(FR2, tx0, .05, zc - tD / 2, tx1, ytd, zc - tD / 2 + .025, Wd, .003);
        [-1, 1].forEach(function (e) { bx(FR2, cx + e * tL / 2 - (e > 0 ? .025 : 0), .05, zc - tD / 2, cx + e * tL / 2 + (e > 0 ? 0 : .025), ytd, zFr - .025, Wd, .003); });
        slats(FR2, 'x', tx0 + .03, tx1 - .03, zc - tD / 2 + .025, zFr - .025, ytd, SLAT());
        box(FR2, .2, .014, .012, dark('#3a3430'), cx, .015 + fh - .045, zFr - .002, .004);
        bedding(FR2, cx, ytd, zc - .005, Math.min(G.MW, tD - .06), Math.min(G.ML - .04, tL - .06), true, { t: .12, inc: inc, noPillow: true });
        // roda & kaki pop-up
        var LG = [];
        [-1, 1].forEach(function (e) { [-1, 1].forEach(function (q) { var x = cx + e * (tL / 2 - .1), z = zc + q * (tD / 2 - .1); var w = cyl(P, .022, .022, .016, dark('#2a2522'), x, .022, z, 16); w.rotation.z = Math.PI / 2; if (kind === 'popup') LG.push(box(P, .03, .02, .03, METAL(), x, .05, z, .003)); }); });
        var out = tD - .02, rise = Math.max(0, deck + .16 - (ytd + .12));
        addMotion(P, kind === 'popup' ? 'popup' : 'drawer', function (v) {
          var a = kind === 'popup' ? Math.min(1, v / .6) : v, b = kind === 'popup' ? Math.max(0, (v - .6) / .4) : 0;
          P.position.z = out * a; FR2.position.y = rise * b;
          LG.forEach(function (m) { var h = .02 + rise * b; m.scale.y = h / .02; m.position.y = .04 + h / 2; });
        });
      }
      if (hasX('usb')) box(g, .01, .05, .08, dark(), (st === 'divan' ? -L / 2 + G.hbT + .002 : ix0 + .006), deck + .25, zFace + .25, .003);
    }
    function daybed() {
      var G = GEO(c), g = new T.Group(); root.add(g);
      var L = G.L, W = G.W, Hh = G.H, fr = G.frame, F = FAB(), Wd = WOOD(), tuft = tuftOf(c.top === 'button' ? 'button' : c.top === 'biscuit' ? 'biscuit' : 'plain', 'top');
      if (fr === 'uph') {
        var yb = G.legH, lm = c.leg === 'round' ? METAL() : c.legFinish === 'metal' ? METAL() : Wd;
        if (c.leg === 'plinth') bx(g, -L / 2 + .06, 0, -W / 2 + .06, L / 2 - .06, yb, W / 2 - .06, dark('#1f1a16'), .004);
        else [-1, 1].forEach(function (e) { [-1, 1].forEach(function (q) { leg(g, c.leg || 'tapered', e * (L / 2 - .07), q * (W / 2 - .07), yb, lm); }); });
        var r = dayUph(g, { L: L, W: W, aT: G.aT, bT: G.bT, yb: yb, deck: G.deck, top: G.top, H: Hh, armTop: G.back ? Math.max(G.top + .12, Hh - (c.arm === 'track' ? .08 : 0)) : Hh, ends: G.ends, back: G.back, base: 'legs' });
        if (c.storage === 'drawers' && c.leg === 'plinth') { var wd = (r.x1 - r.x0 - .04) / 2; [0, 1].forEach(function (i) { drawer(g, r.x0 + .01 + wd / 2 + i * (wd + .02), yb + (G.deck - yb) / 2, W / 2 + .004, wd, G.deck - yb - .05, Math.min(.55, W - .3), 0, F, .4, { hm: dark() }); }); }
        dayTop(g, r.x0 + (G.ends ? 0 : .01), r.x1 - (G.ends ? 0 : .01), r.zFace + (G.back ? 0 : .01), r.zf - .01, G.deck, Hh, { tuft: tuft, ghost: false, back: G.back });
      } else {
        var met = fr === 'metal', FM = met ? METAL() : Wd, pt = G.pt, deck = G.deck, inf = c.infill || 'cane';
        var endTop = G.ends ? Hh - (G.back ? .1 : 0) : deck + .08, backTop = G.back ? Hh : deck + .08;
        [[-1, -1, Math.max(backTop, G.ends ? endTop : 0)], [1, -1, Math.max(backTop, G.ends ? endTop : 0)], [-1, 1, G.ends ? endTop : deck + .08], [1, 1, G.ends ? endTop : deck + .08]].forEach(function (q) { post(g, q[0] * (L / 2 - pt / 2), q[1] * (W / 2 - pt / 2), 0, q[2], FM, pt, met); });
        // rel deck + reng
        var rT = met ? .025 : .035;
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - rT / 2, deck - .07, deck + .02, rT, FM, .005); piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + rT / 2, deck - .07, deck + .02, rT, FM, .005);
        [-1, 1].forEach(function (e) { piece(g, 'z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - rT / 2), deck - .07, deck + .02, rT, FM, .005); });
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + rT + .011, deck - .045, deck - .018, .022, SLAT(), .002); piece(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - rT - .011, deck - .045, deck - .018, .022, SLAT(), .002);
        slats(g, 'x', -L / 2 + pt + .01, L / 2 - pt - .01, -W / 2 + rT, W / 2 - rT, deck, SLAT());
        // panel sisi: rel atas + isi
        var panel = function (ax, A, B, f, y0, y1) {
          if (met) rodAx(g, ax, A, B, f, y1 - .014, .014, FM); else piece(g, ax, A, B, f, y1 - .045, y1, .04, FM, .008);
          var ya = y0 + .005, yt = y1 - (met ? .028 : .045);
          if (inf === 'spindle') guard(g, ax, A, B, f, ya, yt + (met ? .03 : .045), 'spindle', FM, null, { metal: met, th: .025 });
          else if (inf === 'cane') { if (!met) piece(g, ax, A, B, f, ya, ya + .03, .03, FM, .005); var cp = piece(g, ax, A, B, f, ya + .03, yt, .006, caneM(), 0); if (cp) cp.castShadow = false; }
          else if (inf === 'pad') { var ln = B - A; cushion(g, ax === 'x' ? ln - .01 : .05, yt - ya - .02, ax === 'x' ? .05 : ln - .01, F, ax === 'x' ? (A + B) / 2 : f + (f < 0 ? .03 : -.03), (ya + yt) / 2, ax === 'x' ? f + (f < 0 ? .03 : -.03) : (A + B) / 2, { r: .02, cr: .006 }); }
          else piece(g, ax, A, B, f, ya, yt, .02, FM, .004);
        };
        if (G.back) panel('x', -L / 2 + pt, L / 2 - pt, -W / 2 + pt / 2, deck + .02, backTop);
        if (G.ends) [-1, 1].forEach(function (e) { panel('z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - pt / 2), deck + .02, endTop); });
        dayTop(g, -L / 2 + pt + .005, L / 2 - pt - .005, -W / 2 + rT + (inf === 'pad' && G.back ? .06 : 0), W / 2 - rT, deck, Hh, { tuft: tuft, back: G.back });
      }
      if (hasX('mattressinc') && false) return;
    }

    /* ================================================================ RANJANG ANAK */
    function kids() {
      var G = GEO(c), g = new T.Group(), st = G.style; root.add(g);
      var FM = /^(rounded|scallop)$/.test(st) ? WOOD() : FR(), pt = G.pt, inc = hasX('mattressinc');
      if (st === 'rounded' || st === 'scallop') {
        var F = FAB(), W = G.W, D = G.D, deck = G.deck, ft = .04, zh = -D / 2, zfo = D / 2, Hh = G.H, legH = .07;
        var bodyZ0 = zh + .07, under = c.under || 'none';
        [-1, 1].forEach(function (e) { [bodyZ0 + .06, zfo - .06].forEach(function (z) { leg(g, 'bun', e * (W / 2 - .06), z, legH, WOOD()); }); });
        var yS = under === 'none' ? legH : deck - .1;
        [-1, 1].forEach(function (e) { cushion(g, ft, deck + .1 - yS, zfo - bodyZ0 - .06, F, e * (W / 2 - ft / 2), (deck + .1 + yS) / 2, (bodyZ0 + zfo - .06) / 2, { r: .015, cr: .003 }); });
        if (under !== 'none') {
          bx(g, -W / 2, legH, bodyZ0, W / 2, yS, zfo - .06, F, .01);
          if (under === 'drawers') { var dl = (zfo - .06 - bodyZ0 - .04) / 2; [0, 1].forEach(function (i) { drawer(g, W / 2 + .002, legH + (yS - legH) / 2, bodyZ0 + .02 + dl / 2 + i * (dl + .01), dl, yS - legH - .03, Math.min(.5, W - .2), Math.PI / 2, F, .38, { hm: dark() }); }); }
          else {   // sorong ke samping kanan
            var P = new T.Group(); g.add(P);
            var tl = zfo - .06 - bodyZ0 - .04, tw2 = W - .1;
            bx(P, W / 2 - .02, legH + .005, bodyZ0 + .02, W / 2 + .003, yS - .01, bodyZ0 + .02 + tl, F, .008);
            box(P, .012, .014, .2, dark('#3a3430'), W / 2 + .008, yS - .05, bodyZ0 + .02 + tl / 2, .004);
            bedding(P, W / 2 - .02 - tw2 / 2, legH + .02, bodyZ0 + .02 + tl / 2, tw2 - .04, tl - .04, false, { t: Math.max(.06, yS - legH - .06), inc: true, noPillow: true });
            addMotion(P, 'drawer', function (v) { P.position.x = (tw2 - .05) * v; });
          }
        }
        // deck
        slats(g, 'z', bodyZ0 + .02, zfo - .08, -W / 2 + ft, W / 2 - ft, deck, SLAT());
        piece(g, 'z', bodyZ0, zfo - .06, -W / 2 + ft + .011, deck - .045, deck - .018, .022, SLAT(), .002); piece(g, 'z', bodyZ0, zfo - .06, W / 2 - ft - .011, deck - .045, deck - .018, .022, SLAT(), .002);
        bedding(g, 0, deck, (bodyZ0 + zfo - .06) / 2, G.MW, G.ML, false, { t: .18, inc: inc });
        // headboard & footboard berlapis
        var hbShape = st === 'rounded' ? archShape(W, Hh, 0, 1) : scallopShape(W, Hh, 0, 3, false);
        softSlab(g, hbShape, .07, zh + .035, F, .028);
        var fbH = .56, fbShape = st === 'rounded' ? archShape(W, fbH, 0, .55) : scallopShape(W, fbH, 0, 3, false);
        softSlab(g, fbShape, .06, zfo - .03, F, .025);
        return;
      }
      var L = G.L, W = G.W, deck = G.deck, raised = st === 'house', xl = -L / 2 + pt / 2, xr = L / 2 - pt / 2, zbp = -W / 2 + pt / 2, zfp = W / 2 - pt / 2;
      if (st === 'crib') {
        var ch = .92, cas = hasX('castor'), y0c = cas ? .055 : 0;
        [[xl, zbp], [xr, zbp], [xl, zfp], [xr, zfp]].forEach(function (q) { post(g, q[0], q[1], y0c, ch, FM, pt); if (cas) { var w = cyl(g, .025, .025, .02, dark('#2a2522'), q[0], .027, q[1], 18); w.rotation.x = Math.PI / 2; bx(g, q[0] - .012, .045, q[1] - .012, q[0] + .012, y0c, q[1] + .012, METAL(), .003); } });
        // ujung: panel solid berpuncak lengkung
        [-1, 1].forEach(function (e) { var sh = archShape(W - 2 * pt, ch - .01, .14, .25), m = mesh(new T.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelOffset: -.004, bevelSegments: 2, curveSegments: 32 }), FM, g); m.rotation.y = Math.PI / 2; m.position.x = e * (L / 2 - pt / 2) - .01; });
        // sisi: rel atas & bawah + jeruji bulat
        [-1, 1].forEach(function (e) {
          var z = e * (W / 2 - pt / 2); piece(g, 'x', -L / 2 + pt, L / 2 - pt, z, ch - .06, ch - .02, .035, FM, .008); piece(g, 'x', -L / 2 + pt, L / 2 - pt, z, .2, .25, .03, FM, .006);
          var n = Math.round((L - 2 * pt) / .068); for (var i = 0; i < n; i++) { var x = -L / 2 + pt + (L - 2 * pt) * (i + .5) / n; cyl(g, .011, .011, ch - .06 - .25, FM, x, (ch - .06 + .25) / 2, z, 12); }
        });
        // dasar kasur (papan pada lis)
        bx(g, -(L / 2 - pt / 2 - .01), deck - .02, -(W / 2 - pt / 2 - .015), L / 2 - pt / 2 - .01, deck, W / 2 - pt / 2 - .015, SLAT(), .003);
        bedding(g, 0, deck, 0, G.MW, G.ML, true, { t: .1, inc: inc, noPillow: true });
        if (hasX('drape')) {   // kelambu mahkota di ujung kepala: ring pada tiang, kain jatuh di luar panel & pagar
          var ay = ch + .55, xc = xl - .02; rod(g, [xl, ch, 0], [xl, ay + .02, 0], .008, FM, 10); rod(g, [xl, ay + .02, 0], [xc + .0, ay + .02, 0], .006, FM, 8);
          torus(g, .15, .006, FM, xc, ay, 0).rotation.x = Math.PI / 2;
          var nT = 48, nY = 20, pos = [], uv = [], idx = [], i, j, a0 = Math.PI / 2 - .55, a1 = 3 * Math.PI / 2 + .55;
          for (j = 0; j <= nY; j++) { var t = j / nY, y = ay - (ay - deck - .1) * t, rr = .15 + (.47 - .15) * Math.min(1, Math.pow(t / .55, .8)) + .03 * Math.max(0, t - .55); for (i = 0; i <= nT; i++) { var a = a0 + (a1 - a0) * i / nT, f = 1 + .06 * Math.sin(i * 1.9) * t; pos.push(xc + Math.cos(a) * rr * f, y, Math.sin(a) * rr * f); uv.push(a * rr, y); } }
          for (j = 0; j < nY; j++) for (i = 0; i < nT; i++) { var q = j * (nT + 1) + i; idx.push(q, q + nT + 1, q + 1, q + 1, q + nT + 1, q + nT + 2); }
          var dg = new T.BufferGeometry(); dg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); dg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); dg.setIndex(idx); dg.computeVertexNormals();
          mesh(dg, sheer(), g, true).castShadow = false;
        }
        return;
      }
      // rumah / montessori lantai
      var roof = G.roof, topP = roof ? G.eave : deck + .42, Rm = c.rail || 'half', gs = raised ? 'spindle' : 'bars';
      [[xl, zbp], [xr, zbp], [xl, zfp], [xr, zfp]].forEach(function (q) { post(g, q[0], q[1], 0, topP, FM, pt); });
      var d = raised ? frameDeck(g, -L / 2, L / 2, -W / 2, W / 2, deck, FM, { pt: pt }) : (function () {
        // montessori: rangka rendah di lantai
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + .02, 0, deck + .05, .04, FM, .006); piece(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - .02, 0, deck + .05, .04, FM, .006);
        [-1, 1].forEach(function (e) { piece(g, 'z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - .02), 0, deck + .05, .04, FM, .006); });
        piece(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + .04 + .011, deck - .045, deck - .018, .022, SLAT(), .002); piece(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - .04 - .011, deck - .045, deck - .018, .022, SLAT(), .002);
        slats(g, 'x', -L / 2 + pt + .01, L / 2 - pt - .01, -W / 2 + .04, W / 2 - .04, deck, SLAT());
        return { rT: .04, yt: deck + .05 };
      })();
      bedding(g, 0, deck, 0, G.MW, G.ML, true, { t: raised ? .16 : .14, inc: inc });
      if (raised && (c.under === 'drawers' || c.under === 'trundle')) underBed(g, c.under, -L / 2 + pt, L / 2 - pt, W / 2, -W / 2 + pt, deck - .1, FM, G.MW);
      // pagar
      var gt = deck + (raised ? .42 : .34);
      if (Rm !== 'none') {
        guard(g, 'x', -L / 2 + pt, L / 2 - pt, -W / 2 + d.rT / 2, d.yt, gt, gs, FM, null, { th: .026 });
        guard(g, 'x', -L / 2 + pt, L / 2 - pt, W / 2 - d.rT / 2, d.yt, gt, gs, FM, Rm === 'half' ? [[-L / 2 + pt + (L - 2 * pt) * .5, L / 2 - pt]] : [[-.22, .22]], { th: .026 });
      }
      [-1, 1].forEach(function (e) { guard(g, 'z', -W / 2 + pt, W / 2 - pt, e * (L / 2 - d.rT / 2), d.yt, gt, gs, FM, null, { th: .026 }); });
      if (roof) {
        var eave = G.eave, ridge = G.ridge;
        [-1, 1].forEach(function (e) { piece(g, 'x', -L / 2, L / 2, e * (W / 2 - pt / 2), eave - .06, eave, pt, FM, .006); });
        [-1, 1].forEach(function (e) {
          var x = e * (L / 2 - pt / 2);
          piece(g, 'z', -W / 2 + pt, W / 2 - pt, x, eave - .06, eave, pt, FM, .006);
          [-1, 1].forEach(function (q) { strut(g, [x, eave - .03, q * (W / 2 - pt / 2)], [x, ridge - .03, 0], pt, pt, FM); });
        });
        piece(g, 'x', -L / 2, L / 2, 0, ridge - .07, ridge, .045, FM, .006);
        if (hasX('lights')) { var nL = 16; for (var i = 0; i <= nL; i++) { var t = i / nL, x = -L / 2 + L * t, sag = .05 * Math.sin(Math.PI * ((t * 4) % 1)); sphere(g, .014, glow('#ffd9a0'), x, ridge - .09 - sag, .03); } }
        if (hasX('drape')) {
          // kain kelambu menyampir di bubungan, jatuh di belakang
          var s0 = -L * .25, sw = L * .42, rafL = Math.hypot(W / 2, ridge - eave);
          [-1, 1].forEach(function (q) {
            var nX = 18, nY = 10, pos = [], uv = [], idx = [], i2, j2;
            for (j2 = 0; j2 <= nY; j2++) for (i2 = 0; i2 <= nX; i2++) { var u = i2 / nX, v = j2 / nY, fold = .012 * Math.sin(u * 12 * Math.PI); pos.push(s0 + sw * u, ridge + .005 - (ridge - eave) * v + fold * v, q * (W / 2 + .02) * v + q * .03 * (1 - v)); uv.push(u * sw, v * rafL); }
            for (j2 = 0; j2 < nY; j2++) for (i2 = 0; i2 < nX; i2++) { var a = j2 * (nX + 1) + i2; idx.push(a, a + nX + 1, a + 1, a + 1, a + nX + 1, a + nX + 2); }
            var dg = new T.BufferGeometry(); dg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); dg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); dg.setIndex(idx); dg.computeVertexNormals();
            mesh(dg, sheer(), g, true).castShadow = false;
          });
          curtain(g, [s0, 0, -W / 2 - .025], [1, 0, 0], [0, 0, -1], sw, eave, gt + .05, sheer(), { amp: .025 });
        }
      }
    }

    ({ divan: bed, platform: bed, headboard: bed, canopy: canopy, bunk: function () { bunkLike(false); }, loft: function () { bunkLike(true); }, trundle: trundle, daybed: daybed, kids: kids }[c.sub] || bed)();
  };
})();
