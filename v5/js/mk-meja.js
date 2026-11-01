/* ==========================================================================
   Maison XIONCO — Meja: bangun 3D parametrik (dipanggil XMAKER.build lewat window.XMK.meja).
   H = alat bersama dari maker.js (material, geometri, kaki, bantal, dll). Ukuran dalam meter, depan = +Z.

   Aturan umum: semua kaki / base dihitung DI DALAM tapak daun meja (fit / zRange per bentuk:
   persegi, sudut tumpul, bulat, oval, kapsul, boat, organik, D) — tidak ada kaki di luar top.
   Bagian bergerak (laci, pintu, flip-top, lift-top, laci keyboard) → motions (klik di panggung).
   ========================================================================== */
(function () {
  window.XMK = window.XMK || {};
  window.XMK.meja = function (H) {
    var c = H.c, T = H.T, root = H.root, motions = H.motions, X = H.X, cm = H.cm, XP = H.XP, MC = H.M;
    var wood = H.wood, metal = H.metal, paint = H.paint, stone = H.stone, glass = H.glass, dark = H.dark, glow = H.glow, fabric = H.fabric, chrome = H.chrome, mirrorM = H.mirrorM, cane = H.cane;
    var mesh = H.mesh, box = H.box, cyl = H.cyl, rod = H.rod, sphere = H.sphere, torus = H.torus, slab = H.slab, rrect = H.rrect, ellipse = H.ellipse, capsule = H.capsule, organic = H.organic, liveEdge = H.liveEdge, wobble = H.wobble, cushion = H.cushion;
    var woodHex = H.woodHex, WOOD = H.WOOD, METAL = H.METAL;
    var PI = Math.PI, s = c.sub, ex = c.extras || [], has = function (k) { return ex.indexOf(k) >= 0; };

    /* ---------------- material */
    var PAN = X.find(X.PANEL, c.panel) || X.PANEL[0], STN = X.find(X.STONE, c.stone) || X.STONE[0], coat = has('protect');
    function matOf(id) {
      if (id === 'stone') return stone(STN, coat);
      if (id === 'glass') return glass(coat);
      if (id === 'hpl' || id === 'duco') return paint(PAN.hex, id, PAN.grain, coat);
      return wood(woodHex, id === 'veneer' ? 'veneer' : 'solid', coat);
    }
    var topM = matOf(c.topMat || 'wood'), GL = c.topMat === 'glass';
    // badan / laci / kabinet: warna HPL-duco, atau senada top (top batu / kaca → veneer kayu)
    var bodyM = c.body === 'paint' ? paint(PAN.hex, 'duco', PAN.grain) : /^(hpl|duco)$/.test(c.topMat) ? paint(PAN.hex, c.topMat, PAN.grain) : wood(woodHex, c.topMat === 'wood' ? 'solid' : 'veneer');
    var baseM = c.baseMat === 'metal' ? METAL() : c.baseMat === 'stone' ? (c.topMat === 'stone' ? topM : stone(STN)) : WOOD();
    var shelfM = /^(stone|glass)$/.test(c.topMat) ? bodyM : topM;
    var HM = METAL(), inner = wood('#d9c4a3', 'veneer');
    var frost = function () { return MC('frostAcr', function () { return new T.MeshPhysicalMaterial({ color: new T.Color('#eef2f1'), roughness: .55, metalness: 0, transparent: true, opacity: .62, depthWrite: false }); }); };
    var t = cm(c.thick, 3), edge = c.edge || 'eased';
    var bev = { square: .0015, eased: .004, bevel: .01, bullnose: t * .48, knife: t * .45, live: .004 }[edge] || .004, segs = edge === 'bullnose' ? 6 : edge === 'bevel' || edge === 'knife' ? 1 : 3;
    var SPL = Math.tan(9 * PI / 180);

    /* ---------------- bentuk 2D (koordinat dunia x,z → Shape x,-z) */
    function wsh(pts) { var sh = new T.Shape(); pts.forEach(function (p, i) { if (i) sh.lineTo(p[0], -p[1]); else sh.moveTo(p[0], -p[1]); }); return sh; }
    function boatPts(w, d) { var pts = []; for (var i = 0; i < 72; i++) { var f = i / 72 * PI * 2, cs = Math.cos(f); pts.push([w / 2 * (cs < 0 ? -1 : 1) * Math.sqrt(Math.abs(cs)), d / 2 * Math.sin(f)]); } return pts; }
    function dPts(w, d) { var pts = []; for (var i = 0; i <= 48; i++) { var f = PI - PI * i / 48; pts.push([w / 2 * Math.cos(f), -d / 2 + d * Math.sin(f)]); } return pts; }
    function SH(k, w, d) {
      if (k === 'round') return ellipse(w, w);
      if (k === 'oval') return ellipse(w, d);
      if (k === 'capsule') return w >= d ? capsule(w, d) : ellipse(w, d);
      if (k === 'softrect') return rrect(w, d, Math.min(w, d) * .2);
      if (k === 'organic') return organic(w, d, 1.3);
      if (k === 'boat') return wsh(boatPts(w, d));
      if (k === 'dshape') return wsh(dPts(w, d));
      return rrect(w, d, k === 'square' ? .02 : .012);
    }
    var RECTK = /^(rect|square|softrect)$/;
    // titik (x,z) di dalam bentuk dengan jarak tepi ≥ m
    function inside(k, w, d, x, z, m) {
      var ax = Math.abs(x), az = Math.abs(z), a, b;
      if (k === 'round' || k === 'oval' || k === 'organic') { var f = k === 'organic' ? .41 : .5; a = w * f - m; b = d * f - m; return a > 0 && b > 0 && x * x / (a * a) + z * z / (b * b) <= 1; }
      if (k === 'capsule') { if (w < d) return inside('oval', w, d, x, z, m); var r = d / 2; return Math.hypot(Math.max(0, ax - (w / 2 - r)), az) <= r - m; }
      if (k === 'boat') { a = w / 2 - m; b = d / 2 - m; return a > 0 && b > 0 && Math.pow(ax / a, 4) + Math.pow(az / b, 2) <= 1; }
      if (k === 'dshape') { if (z < -d / 2 + m) return false; a = w / 2 - m; b = d - m; return a > 0 && x * x / (a * a) + Math.pow(z + d / 2, 2) / (b * b) <= 1; }
      if (ax > w / 2 - m || az > d / 2 - m) return false;
      var rr = k === 'softrect' ? Math.min(w, d) * .2 : 0;
      if (rr > m) { var cx = w / 2 - rr, cz = d / 2 - rr; if (ax > cx && az > cz && Math.hypot(ax - cx, az - cz) > rr - m) return false; }
      return true;
    }
    // tarik titik ke arah pusat sampai masuk (jarak tepi m)
    function fit(k, w, d, x, z, m) { if (inside(k, w, d, x, z, m)) return [x, z]; var lo = 0, hi = 1; for (var i = 0; i < 24; i++) { var md = (lo + hi) / 2; if (inside(k, w, d, x * md, z * md, m)) lo = md; else hi = md; } return [x * lo, z * lo]; }
    // rentang z di dalam bentuk pada x
    function zRange(k, w, d, x, m) {
      if (!inside(k, w, d, x, 0, m)) return [0, 0];
      var bs = function (sg) { var lo = 0, hi = d; for (var i = 0; i < 24; i++) { var md = (lo + hi) / 2; if (inside(k, w, d, x, sg * md, m)) lo = md; else hi = md; } return sg * lo; };
      return [bs(-1), bs(1)];
    }
    // posisi rangka ujung: mundur dari tepi e sampai rentang z cukup (bentuk melengkung → rangka masuk ke dalam)
    function endPos(k, w, d, e, m, frac) { var xe = w / 2 - e, r = [0, 0]; for (var i = 0; i < 80; i++) { r = zRange(k, w, d, xe, m); if (r[1] - r[0] >= (d - 2 * m) * (frac || .6) || xe < w * .12) break; xe -= .01; } return { xe: xe, zc: (r[0] + r[1]) / 2, len: r[1] - r[0] }; }
    function topSlab(p, k, w, d, y, tt, mat, o) {
      o = o || {}; mat = mat || topM;
      var sh = SH(k, w, d);
      if (edge === 'live' && !o.noLive && mat === topM && c.topMat === 'wood') sh = k === 'rect' || k === 'square' ? liveEdge(w, d) : wobble(sh);
      var m = slab(p, sh, tt, mat, y - tt, Math.min(bev, tt * .48), segs);
      if (GL && mat === topM) m.castShadow = false;
      return m;
    }
    function group(p, x, z, ry) { var G = new T.Group(); G.position.set(x || 0, 0, z || 0); G.rotation.y = ry || 0; (p || root).add(G); return G; }
    // panel tegak dari garis luar 2D (u, y), tebal th (sumbu z lokal), diputar ry
    function panel(p, pts, th, mat, x, z, ry, y) {
      var sh = new T.Shape(); pts.forEach(function (q, i) { if (i) sh.lineTo(q[0], q[1]); else sh.moveTo(q[0], q[1]); });
      var geo = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 24 }); geo.translate(0, 0, -th / 2);
      var m = mesh(geo, mat, p); m.position.set(x || 0, y || 0, z || 0); m.rotation.y = ry || 0; return m;
    }
    function archPts(L, Hh, aw, ah) {
      var pts = [[-L / 2, 0], [-aw / 2, 0]], cy = Math.max(.02, ah - aw / 2);
      for (var i = 0; i <= 16; i++) { var a = PI - i / 16 * PI; pts.push([Math.cos(a) * aw / 2, cy + Math.sin(a) * aw / 2]); }
      pts.push([aw / 2, 0], [L / 2, 0], [L / 2, Hh], [-L / 2, Hh]); return pts;
    }

    /* ---------------- kaki */
    function lhs(st, met, k) { k = k || 1; return (st === 'block' ? (met ? .035 : .043) : st === 'cyl' ? (met ? .03 : .045) : st === 'square' ? (met ? .015 : .025) : st === 'pin' ? .008 : st === 'round' ? (met ? .014 : .024) : (met ? .016 : .027)) * k; }
    function taper(p, a, b, ra, rb, mat, seg) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]), L = A.distanceTo(B);
      var m = mesh(XP.lathe([[0, 0], [ra, 0], [ra, .002], [rb, L - .002], [rb, L], [0, L]], seg || 20), mat, p);
      m.position.copy(A); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
    }
    function legOne(p, x, z, h, st, mat, met, k, dir) {
      k = k || 1;
      if (st === 'splay') { var off = SPL * h, dl = Math.hypot(dir[0], dir[1]) || 1; taper(p, [x + dir[0] / dl * off, .004, z + dir[1] / dl * off], [x, h, z], (met ? .008 : .014) * k, (met ? .013 : .024) * k, mat); return; }
      if (st === 'square') box(p, (met ? .03 : .05) * k, h, (met ? .03 : .05) * k, mat, x, h / 2, z, .003);
      else if (st === 'round') cyl(p, (met ? .014 : .024) * k, (met ? .014 : .024) * k, h, mat, x, h / 2, z, 20);
      else if (st === 'block') { if (met) box(p, .07 * k, h, .014, mat, x, h / 2, z, .003); else box(p, .085 * k, h, .085 * k, mat, x, h / 2, z, .008); }
      else if (st === 'cyl') cyl(p, (met ? .03 : .045) * k, (met ? .03 : .045) * k, h, mat, x, h / 2, z, 28);
      else if (st === 'pin') cyl(p, .008 * k, .008 * k, h, mat, x, h / 2, z, 12);
      else taper(p, [x, 0, z], [x, h, z], (met ? .007 : .015) * k, (met ? .016 : .027) * k, mat);
    }
    function turnedPts(r, Hh) { return [[0, 0], [r, 0], [r, .015], [r * .9, .03], [r * .55, Hh * .3], [r * .85, Hh * .45], [r * .9, Hh * .5], [r * .55, Hh * .62], [r * .42, Hh * .85], [r * .7, Hh - .015], [r * .75, Hh], [0, Hh]]; }

    /* ---------------- rangka satu ujung (sepanjang z lokal; axis 'x' → diputar) */
    function endFrame(p, B, x, z, len, axis, under, mat, o) {
      o = o || {}; var F = group(p, x, z, axis === 'x' ? PI / 2 : 0), met = o.met, hl = len / 2, wd = met ? .028 : .045;
      if (B === 'legs4' || B === 'legs') {
        [-1, 1].forEach(function (e) { legOne(F, 0, e * hl, under, o.st || 'square', mat, met, 1, [o.out || 0, e]); });
        if (!o.noApron) box(F, .022, .06, 2 * hl, mat, 0, under - .03, 0, .003);
      } else if (B === 'trestle') {
        box(F, .07, .05, len, mat, 0, .025, 0, .008); box(F, .08, under - .1, .14, mat, 0, under / 2, 0, .008); box(F, .06, .05, len * .92, mat, 0, under - .025, 0, .006);
      } else if (B === 'column') {
        box(F, .06, .035, len, mat, 0, .0175, 0, .006); cyl(F, .032, .032, under - .07, mat, 0, under / 2, 0, 24); box(F, .05, .035, len * .8, mat, 0, under - .0175, 0, .005);
      } else if (B === 'sled') {
        box(F, wd, wd, len, mat, 0, wd / 2, 0, .004); box(F, wd, wd, len, mat, 0, under - wd / 2, 0, .004);
        [-1, 1].forEach(function (e) { box(F, wd, under - 2 * wd, wd, mat, 0, under / 2, e * (hl - wd / 2), .004); });
      } else if (B === 'slab') box(F, .05, under, len, mat, 0, under / 2, 0, .006);
      else if (B === 'arch') panel(F, archPts(len, under, len * .5, under * .62), .05, mat, 0, 0, PI / 2);
      else if (B === 'x') {
        var rx = met ? .014 : .022;
        rod(F, [0, under - .03, -hl], [0, rx + .004, hl], rx, mat, 14); rod(F, [0, under - .03, hl], [0, rx + .004, -hl], rx, mat, 14);
        box(F, .045, .04, len, mat, 0, under - .02, 0, .005);
        [-1, 1].forEach(function (e) { cyl(F, rx * 1.2, rx * 1.2, .012, dark('#1d1915'), 0, .006, e * hl, 14); });
      } else if (B === 'aframe') {
        var top0 = .05, ra = met ? .012 : .02, yb = .24, zAt = top0 + (hl - top0) * (1 - yb / (under - .03));
        [-1, 1].forEach(function (e) { taper(F, [0, .012, e * hl], [0, under - .03, e * top0], ra * .8, ra * 1.15, mat); });
        box(F, .045, .035, Math.max(.3, 2 * top0 + .1), mat, 0, under - .0175, 0, .005); box(F, .045, .035, len * .92, mat, 0, under - .0175, 0, .005);
        box(F, .025, .025, 2 * zAt, mat, 0, yb, 0, .003);
      } else if (B === 'electric') {
        var Mt = METAL();
        box(F, .07, .035, len, Mt, 0, .0175, 0, .008); box(F, .085, under * .52, .1, Mt, 0, .035 + under * .26, 0, .008);
        box(F, .07, under * .5, .085, Mt, 0, under * .53 + .0, 0, .006); box(F, .05, .03, len * .92, Mt, 0, under - .015, 0, .006);
      } else if (B === 'waterfall') box(F, o.t || t, under, len, o.topM || topM, 0, under / 2, 0, .003);
      return F;
    }

    /* ---------------- base meja (semua di dalam tapak top) → info untuk rak bawah / pijakan */
    var EF = { trestle: .3, column: .25, sled: .07, slab: .1, arch: .1, x: .1, aframe: .08, electric: .22, waterfall: 0 };
    function base(g, B, k, w, d, under, o) {
      o = o || {};
      var met = !!o.met, mat = o.mat || baseM, st = o.st || 'tapered', kk = o.kk || 1, mn = Math.min(w, d), compact = w / d < 1.4, info = { pts: [] };
      var rect = RECTK.test(k), i;
      if (B === 'legs4' || B === 'legs' || B === 'legs3') {
        var off = st === 'splay' ? SPL * under : 0, lh = lhs(st, met, kk), m0 = lh + .03 + off, pts = [];
        if (B === 'legs3') [90, 210, 330].forEach(function (a) { var r = Math.max(w, d); pts.push(fit(k, w, d, Math.cos(a * PI / 180) * r, -Math.sin(a * PI / 180) * r, m0)); });
        else if (rect) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { pts.push(fit(k, w, d, q[0] * w / 2, q[1] * d / 2, m0)); }); if (w > 2.5) { pts.push(fit(k, w, d, 0, -d / 2, m0)); pts.push(fit(k, w, d, 0, d / 2, m0)); } }
        else { var el = endPos(k, w, d, m0, m0, .72); [-1, 1].forEach(function (e) { [-1, 1].forEach(function (f) { pts.push([e * el.xe, el.zc + f * el.len / 2]); }); }); }
        pts.forEach(function (q) { legOne(g, q[0], q[1], under, st, mat, met, kk, [q[0], q[1]]); });
        var ah = o.apron || 0;
        if (ah && rect && B !== 'legs3') {
          var ix = Math.abs(pts[0][0]), iz = Math.abs(pts[0][1]), at = met ? .02 : .022; if (met) ah = Math.min(ah, .035);
          [-1, 1].forEach(function (e) { box(g, 2 * ix, ah, at, mat, 0, under - ah / 2, e * iz, .003); box(g, at, ah, 2 * iz, mat, e * ix, under - ah / 2, 0, .003); });
          info.apron = ah;
        }
        info.pts = pts; info.lh = lh; info.innerX = Math.abs(pts[0][0]) - lh - .006; info.innerZ = Math.abs(pts[0][1]) - lh - .006;
        return info;
      }
      if (B === 'pedestal' || B === 'cone') {
        if (compact) {
          var R = Math.min(mn / 2 - .03, mn * (o.footK || .32)), rc = o.small ? Math.max(.016, mn * .05) : Math.max(.035, Math.min(.08, mn * .06));
          R = Math.max(R, Math.min(mn / 2 - .02, rc * 2.7));
          var pr = B === 'pedestal' ? [[0, 0], [R, 0], [R, .01], [R * .93, .022], [rc * 2.5, .06], [rc * 1.3, under * .2], [rc, under * .48], [rc * 1.08, under * .8], [rc * 1.7, under - .016], [rc * 2.1, under - .005], [rc * 2.1, under], [0, under]]
            : [[0, 0], [R, 0], [R, .01], [rc * 1.15, under - .012], [rc * 1.7, under - .004], [rc * 1.7, under], [0, under]];
          mesh(XP.lathe(pr, 48), mat, g);
          info.col = { R: R, rc: rc, cone: B === 'cone' }; return info;
        }
        var kc = /^(rect|square|boat)$/.test(k) ? 'softrect' : k === 'dshape' ? 'oval' : k;
        if (B === 'cone') {
          var Rf = Math.min(d * .3, .26), xp = Math.min(w * .27, w / 2 - Rf - .08), rc2 = .055;
          [-1, 1].forEach(function (e) { var cm2 = mesh(XP.lathe([[0, 0], [Rf, 0], [Rf, .01], [rc2 * 1.15, under - .012], [rc2 * 1.7, under - .004], [rc2 * 1.7, under], [0, under]], 40), mat, g); cm2.position.x = e * xp; });
          return info;
        }
        slab(g, SH(kc, w * .36, d * .3), under - .03, mat, .03, .012, 3);
        slab(g, SH(kc, w * .5, d * .48), .03, mat, 0, .006, 2);
        return info;
      }
      if (B === 'cross') {
        var cw = Math.max(.05, Math.min(.1, mn * .09));
        if (compact) {
          var ax = fit(k, w, d, w / 2, 0, .04)[0], az = Math.abs(fit(k, w, d, 0, d / 2, .04)[1]);
          box(g, cw, under - .09, cw, mat, 0, under / 2, 0, .006);
          box(g, 2 * ax, .045, cw * .8, mat, 0, .0225, 0, .006); box(g, cw * .8, .045, 2 * az, mat, 0, .0225, 0, .006);
          box(g, 2 * ax * .75, .045, cw * .7, mat, 0, under - .0225, 0, .004); box(g, cw * .7, .045, 2 * az * .75, mat, 0, under - .0225, 0, .004);
          info.col = { R: Math.min(ax, az), rc: cw * .6 }; return info;
        }
        var xq = w * .3, zr = zRange(k, w, d, xq, .05), zl = (zr[1] - zr[0]) * .85, zq = (zr[0] + zr[1]) / 2;
        box(g, 2 * xq + .2, .045, cw * .8, mat, 0, .0225, 0, .006); box(g, 2 * xq + .2, .045, cw * .7, mat, 0, under - .0225, 0, .004);
        [-1, 1].forEach(function (e) { box(g, cw, under - .09, cw, mat, e * xq, under / 2, 0, .006); box(g, cw * .8, .045, zl, mat, e * xq, .0225, zq, .006); box(g, cw * .7, .045, zl * .8, mat, e * xq, under - .0225, zq, .004); });
        return info;
      }
      if (B === 'blade') {
        var fin = function (L, x, z, ry, tk) { panel(g, [[-L / 2, 0], [L / 2, 0], [L / 2 * tk, under], [-L / 2 * tk, under]], .03, mat, x, z, ry); };
        if (compact) { var q = fit(k, w, d, w / 2 * .7071, d / 2 * .7071, .05), R2 = Math.hypot(q[0], q[1]); fin(2 * R2, 0, 0, PI / 4, .55); fin(2 * R2, 0, 0, -PI / 4, .55); return info; }
        var xb = w * .28, Lb = Math.min(d * .95, w * .3);
        for (var ib = 0; ib < 40 && !(inside(k, w, d, xb + Lb * .3536, Lb * .3536, .04)); ib++) Lb -= .02;
        [-1, 1].forEach(function (e) { fin(Lb, e * xb, 0, PI / 4, .55); fin(Lb, e * xb, 0, -PI / 4, .55); });
        box(g, 2 * xb, .05, .04, mat, 0, under - .025, 0, .006);
        return info;
      }
      if (B === 'double') {
        var rr2 = Math.min(.16, d * .2), xq2 = Math.min(w * .3, w / 2 - rr2 - .1);
        for (i = 0; i < 40 && !inside(k, w, d, xq2 + rr2, 0, .03); i++) xq2 -= .02;
        rr2 = Math.max(.07, Math.min(rr2, zRange(k, w, d, xq2, .03)[1]));
        [-1, 1].forEach(function (e) { cyl(g, rr2, rr2, under, mat, e * xq2, under / 2, 0, 40); });
        info.ends = { xe: xq2, zc: 0, len: rr2 * 2 }; return info;
      }
      if (EF[B] != null) {
        var ep = B === 'waterfall' ? { xe: w / 2 - t / 2, zc: 0, len: d - .03 } : endPos(k, w, d, B === 'trestle' ? Math.min(.3, w * .18) : B === 'electric' ? Math.min(.22, w * .14) : B === 'column' ? Math.min(.25, w * .2) : EF[B], .04, .55);
        [-1, 1].forEach(function (e) { endFrame(g, B, e * ep.xe, ep.zc, ep.len, 'z', under, mat, { met: met, st: st, out: e, t: t, noApron: true }); });
        if (B === 'trestle' || B === 'column') box(g, 2 * ep.xe, .05, .04, mat, 0, under * .3, ep.zc, .006);
        info.ends = ep; info.innerX = ep.xe - (B === 'slab' || B === 'arch' ? .03 : B === 'waterfall' ? t / 2 + .004 : .03); info.innerZ = ep.len / 2 - .02;
        return info;
      }
      if (B === 'drum' || B === 'plinth') {
        var kd = B === 'drum' ? (/^(rect|boat)$/.test(k) ? 'softrect' : k === 'square' ? 'round' : k === 'dshape' ? 'oval' : k) : k, sc = B === 'drum' ? .62 : .88, dw = w * sc, dd = kd === 'round' ? dw : d * sc;
        slab(g, SH(kd, dw, dd), under, mat, 0, .006, 2); info.solid = true; return info;
      }
      if (B === 'pillar') {
        if (o.turned) { var rp2 = Math.min(.11, d * .3), xt = w / 2 - rp2 - .06; [-1, 1].forEach(function (e) { mesh(XP.lathe(turnedPts(rp2, under), 40), mat, g).position.x = e * xt; }); info.innerX = xt - rp2 - .01; info.innerZ = d / 2 - .04; return info; }
        var rp = Math.max(.05, Math.min(.09, mn * .08)), m1 = rp + .04, P3 = /^(round|organic|oval)$/.test(k) && w / d < 1.3;
        var pp = P3 ? [90, 210, 330].map(function (a) { return fit(k, w, d, Math.cos(a * PI / 180) * w, -Math.sin(a * PI / 180) * d, m1); }) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(function (q2) { return fit(k, w, d, q2[0] * w / 2, q2[1] * d / 2, m1); });
        pp.forEach(function (q2) { cyl(g, rp, rp, under, mat, q2[0], under / 2, q2[1], 32); });
        info.pts = pp; info.lh = rp; return info;
      }
      if (B === 'cshape') {
        var pz = fit(k, w, d, 0, -d / 2, .045)[1];
        box(g, .04, under, .05, mat, 0, under / 2, pz, .004);
        slab(g, SH(k, w * .78, d * .78), .02, mat, 0, .004, 2);
        box(g, .04, .025, d * .5, mat, 0, under - .0125, pz + d * .25, .004);
        info.innerX = 0; return info;
      }
      if (B === 'slatted') {
        var Nn = 16, rb = Math.min(mn / 2 - .04, mn * .4), rt = Math.max(.07, mn * .14);
        for (i = 0; i < Nn; i++) { var a3 = i / Nn * PI * 2; mesh(XP.bar([Math.cos(a3) * rb, .008, Math.sin(a3) * rb], [Math.cos(a3) * rt, under - .03, Math.sin(a3) * rt], .04, .016, .004, { up: [Math.cos(a3), 0, Math.sin(a3)] }), mat, g, false); }
        var ring = function (R3, y) { var tr = torus(g, R3, .012, mat, 0, y, 0, 0, 64); tr.rotation.x = PI / 2; };
        ring(rb, .02); ring(rt, under - .03); ring(rb + (rt - rb) * .35, .02 + (under - .05) * .35);
        cyl(g, rt + .03, rt + .03, .03, mat, 0, under - .015, 0, 32);
        info.slat = { rb: rb, rt: rt }; return info;
      }
      return info;
    }

    /* ---------------- pijakan kaki (bar & counter) */
    function footrest(g, kind, B, k, w, d, under, info, y) {
      if (!kind || kind === 'none') return;
      var FM = METAL(), r = .011, i;
      var legAt = function (q) { var off = c.legStyle === 'splay' ? SPL * under * (1 - y / under) : 0, L = Math.hypot(q[0], q[1]) || 1; return [q[0] + q[0] / L * off, q[1] + q[1] / L * off]; };
      if (kind === 'ring') {
        if (info.pts && info.pts.length) {
          var P = info.pts.map(legAt);
          if (P.length === 3 || !RECTK.test(k)) { var Rr = P.reduce(function (n, q) { return n + Math.hypot(q[0], q[1]); }, 0) / P.length, tr = torus(g, Rr, r, FM, 0, y, 0, 0, 64); tr.rotation.x = PI / 2; }
          else [[0, 1], [1, 3], [3, 2], [2, 0]].forEach(function (e) { rod(g, [P[e[0]][0], y, P[e[0]][1]], [P[e[1]][0], y, P[e[1]][1]], r, FM, 12); });
          return;
        }
        if (info.slat) { var sl = info.slat, Rs = sl.rb + (sl.rt - sl.rb) * (y - .02) / (under - .05), ts = torus(g, Rs, r, FM, 0, y, 0, 0, 64); ts.rotation.x = PI / 2; return; }
        var col = info.col || { R: .2, rc: .05 }, mn = Math.min(w, d), colR = col.cone ? col.R + (col.rc * 1.15 - col.R) * y / under : col.rc * 1.3;
        var R4 = Math.min(mn / 2 - .05, Math.max(colR + .1, .2)), tor = torus(g, R4, r, FM, 0, y, 0, 0, 64); tor.rotation.x = PI / 2;
        for (i = 0; i < 4; i++) { var a = i * PI / 2 + PI / 4; rod(g, [Math.cos(a) * colR, y, Math.sin(a) * colR], [Math.cos(a) * R4, y, Math.sin(a) * R4], .007, FM, 8); }
        return;
      }
      if (info.ends) { var e2 = info.ends, zf = e2.zc + e2.len * .3; rod(g, [-e2.xe, y, zf], [e2.xe, y, zf], r, FM, 12); return; }
      if (info.pts && info.pts.length) { var fr = info.pts.filter(function (q) { return q[1] > 0; }).map(legAt); if (fr.length >= 2) rod(g, [fr[0][0], y, fr[0][1]], [fr[1][0], y, fr[1][1]], r, FM, 12); }
    }

    /* ---------------- gerak */
    var mid = 0;
    function motion(P, kind, apply, t0) { var mo = { id: 'm' + (mid++), kind: kind, t: t0 || 0, to: t0 || 0, apply: apply }; apply(mo.t); P.userData.motion = mo; motions.push(mo); return mo; }
    // handle: bar | barL (panjang) | knob | slot (alur) — pada muka di z (arah dir)
    function handle(p, x, y, w, h, z, dir, kind, vertical) {
      kind = kind || 'bar';
      if (kind === 'knob') { rod(p, [x, y, z], [x, y, z + dir * .016], .004, HM, 8); sphere(p, .013, HM, x, y, z + dir * .022); return; }
      if (kind === 'slot') { if (vertical) box(p, .012, Math.min(.16, h * .5), .004, dark('#14100d'), x, y, z + dir * .0008, .001); else box(p, Math.min(.14, w * .5), .012, .004, dark('#14100d'), x, y + h / 2 - .022, z + dir * .0008, .001); return; }
      var L = kind === 'barL' ? Math.min(.3, w * .6) : Math.min(.16, w * .42), zo = z + dir * .026;
      if (vertical) { L = Math.min(.18, h * .4); rod(p, [x, y - L / 2, zo], [x, y + L / 2, zo], .0055, HM, 10); [-1, 1].forEach(function (e) { rod(p, [x, y + e * (L / 2 - .015), z], [x, y + e * (L / 2 - .015), zo], .004, HM, 8); }); return; }
      rod(p, [x - L / 2, y, zo], [x + L / 2, y, zo], .0055, HM, 10);
      [-1, 1].forEach(function (e) { rod(p, [x + e * (L / 2 - .015), y, z], [x + e * (L / 2 - .015), y, zo], .004, HM, 8); });
    }
    function lockOn(p, x, y, z, dir) { var k = cyl(p, .009, .009, .004, HM, x, y, z + dir * .002, 20); k.rotation.x = PI / 2; box(p, .0025, .008, .003, dark('#0a0807'), x, y - .001, z + dir * .0045, 0); }
    // laci: muka di bidang zf (menghadap dir), badan laci sedalam dd ikut bergerak
    function drawer(p, x, y, w, h, zf, dir, dd, o) {
      o = o || {};
      var P = new T.Group(); p.add(P);
      var fm = o.mat || bodyM, fz = zf + dir * .009;
      box(P, w - .004, h - .004, .018, fm, x, y, fz, .003);
      if (o.face === 'fluted') { var n = Math.max(3, Math.floor((w - .02) / .024)); for (var i = 0; i < n; i++) cyl(P, .0075, .0075, h - .02, fm, x - (w - .02) / 2 + (w - .02) * (i + .5) / n, y, zf + dir * .018, 10); }
      if (o.face === 'cane') box(P, w - .05, h - .04, .004, cane('#d8bf8f'), x, y, zf + dir * .0185, .001);
      var bz = zf - dir * dd / 2;
      box(P, w - .03, .012, dd, inner, x, y - h / 2 + .02, bz, .002);
      [-1, 1].forEach(function (e) { box(P, .012, h - .04, dd, inner, x + e * (w / 2 - .021), y - .005, bz, .002); });
      box(P, w - .03, h - .04, .012, inner, x, y - .005, zf - dir * (dd - .006), .002);
      if (o.jewel) { box(P, w - .06, .012, dd - .03, fabric('#3a2430', 'velvet'), x, y - h / 2 + .032, bz, .003); for (var j = 1; j < 3; j++) box(P, .006, h * .4, dd - .03, inner, x - (w - .06) / 2 + (w - .06) * j / 3, y - h / 2 + .04 + h * .2, bz, .001); }
      var hz = zf + dir * (o.face === 'fluted' ? .0255 : .018);
      handle(P, x, y, w, h, hz, dir, o.handle);
      if (o.lock) lockOn(P, x + (o.handle === 'slot' ? 0 : 0), o.handle === 'slot' ? y - .01 : y - Math.min(.03, h * .3), hz, dir);
      motion(P, 'drawer', function (v) { P.position.z = dir * dd * .72 * v; });
      return P;
    }
    // pintu engsel (hinge -1 kiri / 1 kanan)
    function door(p, x, y, w, h, zf, dir, hinge, mat, hk) {
      var P = new T.Group(); P.position.set(x + hinge * w / 2, y, zf); p.add(P);
      box(P, w - .004, h - .004, .018, mat || bodyM, -hinge * w / 2, 0, dir * .009, .003);
      handle(P, -hinge * (w - .045), 0, w, h, dir * .018, dir, hk === 'knob' ? 'knob' : hk === 'slot' ? 'slot' : 'bar', true);
      motion(P, 'door', function (v) { P.rotation.y = hinge * dir * 1.6 * v; });
      return P;
    }
    // pedestal laci: baris [{k: drawer|door, f}], muka menghadap dir
    function rowsOf(spec, hang) {
      if (hang) return spec === '2f' ? [{ k: 'drawer', f: .38 }, { k: 'drawer', f: .62 }] : [{ k: 'drawer', f: .5 }, { k: 'drawer', f: .5 }];
      if (spec === '2f') return [{ k: 'drawer', f: .25 }, { k: 'drawer', f: .25 }, { k: 'drawer', f: .5 }];
      if (spec === 'door') return [{ k: 'drawer', f: .25 }, { k: 'door', f: .75 }];
      return [{ k: 'drawer', f: 1 }, { k: 'drawer', f: 1 }, { k: 'drawer', f: 1 }];
    }
    function pedUnit(p, x, y0, pw, ph, zc, pd, dir, rows, o) {
      o = o || {};
      if (o.castor) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var cx = x + q[0] * (pw / 2 - .045), cz = zc + q[1] * (pd / 2 - .05); cyl(p, .006, .006, y0 - .04, chrome(), cx, .04 + (y0 - .04) / 2, cz, 8); sphere(p, .022, dark('#222'), cx, .022, cz); });
      if (o.kick) box(p, pw - .03, y0, pd - .03, o.kickM || dark('#1a1613'), x, y0 / 2, zc - dir * .015, .002);
      var sum = rows.reduce(function (n, r) { return n + r.f; }, 0), yy = y0 + ph, first = true;
      rows.forEach(function (r) {
        var rh = ph * r.f / sum, yc = yy - rh / 2;
        if (r.k === 'drawer') { box(p, pw, rh, pd, bodyM, x, yc, zc, .003); drawer(p, x, yc, pw, rh, zc + dir * pd / 2, dir, Math.min(pd - .05, .5), { handle: o.handle, lock: o.lock && first, mat: o.front, jewel: o.jewel && first }); first = false; }
        else {
          [-1, 1].forEach(function (e) { box(p, .018, rh, pd, bodyM, x + e * (pw / 2 - .009), yc, zc, .002); });
          box(p, pw, .018, pd, bodyM, x, yy - rh + .009, zc, .002);
          box(p, pw - .036, rh - .018, .012, bodyM, x, yc + .009, zc - dir * (pd / 2 - .006), .002);
          box(p, pw - .036, .016, pd - .03, bodyM, x, yc, zc - dir * .01, .002);
          door(p, x, yc, pw, rh, zc + dir * pd / 2, dir, -1, o.front || bodyM, o.handle);
        }
        yy -= rh;
      });
    }
    // deretan kabinet (credenza, return, island): bay drawers3 | door | open ; muka lokal +z
    function cabinetRow(p, L, D, Hh, x, z, ry, bays, o) {
      o = o || {}; var G = group(p, x, z, ry), pl = .07, n = bays.length, bw = L / n, zf = D / 2, ch = Hh - pl - .018;
      box(G, L - .04, pl, D - .05, dark('#1a1613'), 0, pl / 2, -.015, .002);
      box(G, L, .018, D, bodyM, 0, Hh - .009, 0, .002); box(G, L, .018, D, bodyM, 0, pl + .009, 0, .002);
      [-1, 1].forEach(function (e) { box(G, .018, Hh - pl, D, bodyM, e * (L / 2 - .009), pl + (Hh - pl) / 2, 0, .002); });
      box(G, L - .036, Hh - pl, .012, bodyM, 0, pl + (Hh - pl) / 2, -D / 2 + .006, .002);
      bays.forEach(function (b, i) {
        var cx = -L / 2 + bw * (i + .5), y0 = pl + .018, yc = y0 + ch / 2;
        if (i) box(G, .018, ch, D - .02, bodyM, -L / 2 + bw * i, yc, -.01, .002);
        if (b === 'drawers3') { box(G, bw - .02, ch, D - .02, bodyM, cx, yc, -.01, .002); for (var j = 0; j < 3; j++) drawer(G, cx, y0 + ch - ch / 3 * (j + .5), bw, ch / 3, zf, 1, Math.min(D - .06, .5), { handle: o.handle, lock: o.lock && j === 0 }); }
        else if (b === 'open') { [1, 2].forEach(function (q) { box(G, bw - .03, .018, D - .03, bodyM, cx, y0 + ch * q / 3, -.01, .002); }); }
        else {
          box(G, bw - .03, .018, D - .04, bodyM, cx, yc, -.01, .002);
          if (bw > .62) { door(G, cx - bw / 4, yc, bw / 2, ch, zf, 1, -1, bodyM, o.handle); door(G, cx + bw / 4, yc, bw / 2, ch, zf, 1, 1, bodyM, o.handle); }
          else door(G, cx, yc, bw, ch, zf, 1, i % 2 ? 1 : -1, bodyM, o.handle);
        }
      });
      if (o.top) slab(G, rrect(L + .02, D + .02, .01), t, topM, Hh, Math.min(bev, t * .45), segs);
      if (o.led) { var lg = box(G, L - .1, .006, .008, glow(), 0, Hh - .025, zf + .004, 0); lg.castShadow = false; }
      return G;
    }

    /* ---------------- tampilan meja: alas piring / set makan */
    function settings(p, k, w, d, h, n, mode, o) {
      if (!mode || mode === 'none') return;
      o = o || {};
      var pos = [], i, roundish = k === 'round' || k === 'square' || w / d < 1.25;
      if (o.back) { var nb = Math.max(1, Math.floor(w / .62)); for (i = 0; i < nb; i++) { var xb = -w / 2 + w * (i + .5) / nb, zb = zRange(k, w, d, xb, .17)[0]; pos.push([xb, zb, PI]); } }
      else if (roundish) { n = Math.min(n, Math.max(1, Math.floor(PI * (Math.min(w, d) - .34) / .36))); for (i = 0; i < n; i++) { var a = i / n * PI * 2 + PI / 2, q = fit(k, w, d, Math.cos(a) * w / 2, Math.sin(a) * d / 2, .17); pos.push([q[0], q[1], Math.atan2(q[0], q[1])]); } }
      else {
        var ends = n >= 6 && !o.noEnds ? 2 : 0, Lx = w - (ends ? .75 : .25), sn = Math.max(1, Math.min(Math.round((n - ends) / 2), Math.floor(Lx / .36)));
        for (i = 0; i < sn; i++) { var x = -Lx / 2 + Lx * (i + .5) / sn, zr = zRange(k, w, d, x, .17); if (zr[1] - zr[0] < .05) continue; pos.push([x, zr[1], 0]); pos.push([x, zr[0], PI]); }
        if (ends) { var e1 = fit(k, w, d, w / 2, 0, .17), e2 = fit(k, w, d, -w / 2, 0, .17); pos.push([e1[0], e1[1], PI / 2]); pos.push([e2[0], e2[1], -PI / 2]); }
      }
      var lin = fabric('#4a4038', 'linen'), cer = paint('#f2eee6', true), gl = glass(), cut = chrome();
      pos.forEach(function (q) {
        var S = group(p, q[0], q[1], q[2]); S.position.y = h;
        var pm = cyl(S, .13, .13, .003, lin, 0, .0016, 0, 40); pm.scale.x = 1.25; pm.castShadow = false;
        if (mode !== 'full') return;
        cyl(S, .125, .095, .014, cer, 0, .0105, 0, 40); cyl(S, .075, .075, .001, cer, 0, .018, 0, 32);
        box(S, .016, .003, .19, cut, -.175, .0045, 0, .0012); box(S, .013, .003, .2, cut, .175, .0045, 0, .0012);
        cyl(S, .032, .034, .003, gl, .13, .0045, -.15, 20); cyl(S, .0035, .0035, .07, gl, .13, .041, -.15, 8); cyl(S, .04, .026, .07, gl, .13, .111, -.15, 24);
      });
    }

    /* ---------------- tambahan meja (makan, kopi, samping, bar, counter) */
    function tableExtras(G, k, w, d, h, I, o) {
      o = o || {}; var under = h - t, mn = Math.min(w, d), q;
      if (has('extend')) [-1, 1].forEach(function (e) { var zr = zRange(k, w, d, e * w * .12, .005); box(G, .003, .0015, zr[1] - zr[0], dark(), e * w * .12, h + .0008, (zr[0] + zr[1]) / 2, 0); });
      if (has('lazy')) { cyl(G, mn * .25, mn * .25, .02, topM, 0, h + .012, 0, 48); cyl(G, mn * .08, mn * .08, .002, dark('#2a2522'), 0, h + .001, 0, 32); }
      if (has('cable')) { q = fit(k, w, d, w * .3, -d * .25, .06); cyl(G, .03, .03, .004, dark(), q[0], h + .001, q[1], 28); torus(G, .031, .003, METAL(), q[0], h + .002, q[1], 0, 40).rotation.x = PI / 2; }
      if (has('socket')) { q = fit(k, w, d, -w * .2, -d * .3, .08); box(G, .2, .004, .05, dark('#2a2522'), q[0], h + .002, q[1], .002); [0, 1, 2].forEach(function (j) { cyl(G, .008, .008, .002, metal(X.METAL[3]), q[0] - .06 + j * .06, h + .0045, q[1], 12); }); }
      if (has('hooks')) { q = fit(k, w, d, 0, d / 2, .05); [-1, 1].forEach(function (e) { var hx = q[0] + e * Math.min(.12, w * .15); box(G, .03, .005, .03, METAL(), hx, under - .0025, q[1], .002); var hk = torus(G, .016, .003, METAL(), hx, under - .025, q[1], PI * 1.3, 16); hk.rotation.y = PI / 2; }); }
      if (has('shelf') && !I.solid) {
        var sy = Math.max(.06, under * .22), sw, sd;
        if (I.ends) { sw = 2 * I.innerX; sd = Math.min(d * .8, 2 * I.innerZ); slab(G, SH(RECTK.test(k) ? k : 'softrect', sw, sd), .02, shelfM, sy, .002, 1); }
        else if (I.pts && I.pts.length) {
          var sc = .86, lh = (I.lh || .03) + .008;
          for (var it = 0; it < 30; it++) { var ok = I.pts.every(function (p2) { return !inside(k, w * sc, d * sc, p2[0], p2[1], -lh); }); if (ok) break; sc -= .02; }
          if (k === 'cshape') sc = .7;
          slab(G, SH(k, w * sc, d * sc), .02, shelfM, sy, .002, 1);
        }
      }
      if (has('drawer') && s === 'coffee') {
        var hw = Math.min(w * .5, (I.innerX ? 2 * I.innerX : w * .6) - .04), zfr = I.solid ? (zRange(k, w * .88, d * .88, 0, 0)[1]) : Math.min(d / 2 - .04, (I.innerZ || d / 2 - .06)), hd = Math.min(d * .7, zfr + d * .3);
        if (!I.solid) box(G, hw + .02, .08, hd, bodyM, 0, under - .04, zfr - hd / 2, .003);
        drawer(G, 0, under - .04, hw, .075, zfr, 1, hd - .03, { handle: 'slot' });
      }
      if (has('charger')) { q = fit(k, w, d, w * .22, d * .2, .06); cyl(G, .045, .045, .003, dark('#151515'), q[0], h + .0015, q[1], 40); var cr2 = torus(G, .04, .0016, glow('#bfe3ff'), q[0], h + .0032, q[1], 0, 48); cr2.rotation.x = PI / 2; cr2.castShadow = false; }
      if (has('lamp')) {
        q = fit(k, w, d, -w * .26, -d * .22, .06); var lx = q[0], lz = q[1], lh2 = .34, lm = metal(X.find(X.METAL, c.metal) || X.METAL[1]);
        cyl(G, .008, .008, lh2, lm, lx, h + lh2 / 2, lz, 12); cyl(G, .03, .034, .008, lm, lx, h + .004, lz, 24);
        var shd = mesh(new T.SphereGeometry(.1, 32, 12, 0, PI * 2, 0, PI / 2), lm, G); shd.position.set(lx, h + lh2 - .02, lz); shd.scale.y = .55;
        var gd = cyl(G, .092, .092, .004, glow(), lx, h + lh2 - .021, lz, 32); gd.castShadow = false;
      }
    }

    function simple(o) {
      var G = group(root, o.x, o.z), under = o.h - o.t;
      if (!o.noTop) topSlab(G, o.k, o.w, o.d, o.h, o.t, o.topM || topM, o);
      var info = base(G, o.B, o.k, o.w, o.d, under, o); info.G = G; info.under = under; return info;
    }
    var shapeDims = function (defW, defD, defDia) { var k = c.topShape || 'rect', rs = /^(round|square)$/.test(k), w = rs ? cm(c.dia, defDia) : cm(c.w, defW); return { k: k, w: w, d: rs ? w : cm(c.d, defD), rs: rs }; };

    /* ================================================================== MEJA MAKAN */
    function dining() {
      var S = shapeDims(180, 90, 140), h = cm(c.h, 75), B = c.base || 'legs4', met = c.baseMat === 'metal';
      if (S.k === 'round' && /^(trestle|sled|slab|arch|x|v|double)$/.test(B)) B = 'pedestal'; if (S.rs && B === 'double') B = 'pedestal'; if (B === 'v') B = 'x';
      var I = simple({ k: S.k, w: S.w, d: S.d, h: h, t: t, B: B, st: c.legStyle, met: met, mat: baseM, apron: met ? .035 : .07, kk: met ? 1.1 : 1.25 });
      tableExtras(I.G, S.k, S.w, S.d, h, I);
      settings(I.G, S.k, S.w, S.d, h, +c.seats || 6, c.tableware);
    }
    /* ================================================================== MEJA KOPI */
    function coffee() {
      var S = shapeDims(110, 60, 90), h = cm(c.h, 38), B = c.base || 'legs4', under = h - t;
      if (S.k === 'round' && /^(slab|sled|x)$/.test(B)) B = 'pedestal'; if (B === 'waterfall' && !/^(rect|square)$/.test(S.k)) B = 'slab';
      var lift = has('lift') && RECTK.test(S.k);
      var I = simple({ k: S.k, w: S.w, d: S.d, h: h, t: t, B: B, st: c.legStyle, met: c.baseMat === 'metal', mat: B === 'waterfall' ? topM : baseM, apron: lift ? 0 : .045, kk: .85, noTop: lift });
      tableExtras(I.G, S.k, S.w, S.d, h, I);
      if (lift) {   // top angkat: strip belakang tetap, panel depan terangkat ke arah pengguna; badan penyimpanan di bawah
        var w = S.w, d = S.d, kb = S.k === 'square' ? 'rect' : S.k;
        var G1 = group(I.G, 0, -d * .35); topSlab(G1, kb, w, d * .3, h, t, topM, { noLive: true });
        var bw = I.ends ? 2 * I.innerX : I.innerX ? 2 * I.innerX + .03 : w * .86, bd = I.innerZ ? Math.min(d - .04, 2 * I.innerZ + .03) : d * .86;
        if (!I.solid) box(I.G, bw, .13, bd, bodyM, 0, under - .065, 0, .004);
        box(I.G, bw - .04, .002, d * .6, dark('#2a2420'), 0, under + .0006, d * .15, 0);
        var P = group(I.G, 0, d * .15), lid = group(P, 0, 0); topSlab(lid, kb, w, d * .7 - .004, h, t, topM, { noLive: true });
        var arms = new T.Group(); P.add(arms); arms.position.y = under;
        [-1, 1].forEach(function (e) { box(arms, .02, .17, .02, METAL(), e * (bw / 2 - .06), .085, -d * .1, .003); });
        motion(P, 'flip', function (v) { P.position.y = .16 * v; P.position.z = d * .15 + .09 * v; arms.scale.y = Math.max(.01, v * .16 / .17); arms.position.y = under - .16 * v; });
      }
    }
    /* ================================================================== MEJA SAMPING */
    function side() {
      var S = shapeDims(45, 45, 45), h = cm(c.h, 55), B = c.base || 'pedestal';
      if (B === 'legs3' && !/^(round|organic|oval)$/.test(S.k)) B = 'legs4';
      var I = simple({ k: S.k, w: S.w, d: S.d, h: h, t: t, B: B, st: c.legStyle, met: c.baseMat === 'metal', mat: baseM, small: true, kk: .7, footK: .36 });
      tableExtras(I.G, S.k, S.w, S.d, h, I);
    }
    /* ================================================================== MEJA NESTING */
    function nesting() {
      var n = c.pieces === '3' ? 3 : 2, k = c.topShape || 'round', rs = /^(round|square)$/.test(k), W0 = rs ? cm(c.dia, 60) : cm(c.w, 70), D0 = rs ? W0 : cm(c.d, 50), H0 = cm(c.h, 45), B = c.base || 'legs';
      var met = c.baseMat === 'metal' && B !== 'drum', mat = B === 'drum' ? (GL ? WOOD() : topM) : baseM, st = B === 'legs' ? (met ? 'round' : 'tapered') : 'square';
      var step = Math.max(.07, t + .035), sc = [1, .78, .61];
      var need = B === 'sled' ? .17 : .12, nested = (B === 'legs' || B === 'sled') && /^(rect|square)$/.test(k) && W0 * .22 >= need;
      var T0 = [], i;
      for (i = 0; i < n; i++) T0.push({ w: W0 * sc[i], d: rs ? W0 * sc[i] : D0 * (nested ? 1 - .1 * i : sc[i]), h: Math.max(.25, H0 - i * step) });
      var overlap = B === 'pedestal' || B === 'drum';
      var colR = function (q) { var mn = Math.min(q.w, q.d); return B === 'drum' ? Math.max(q.w, q.d) * .36 : Math.max(.016, mn * .05) * 2.1; };
      var footR = function (q) { var mn = Math.min(q.w, q.d); return B === 'drum' ? Math.max(q.w, q.d) * .36 : Math.min(mn / 2 - .03, mn * .36); };
      T0.forEach(function (q, j) {
        var x = 0, z = 0;
        if (nested) z = j * D0 * .36;
        else if (j) {
          var a = j === 1 ? .35 : .5, sg = j === 1 ? 1 : -1, dist;
          if (overlap) dist = Math.max(colR(T0[0]) + Math.max(q.w, q.d) / 2 + .02, footR(T0[0]) + footR(q) + .04);
          else dist = (Math.max(T0[0].w, T0[0].d) / 2 + Math.max(q.w, q.d) / 2 + .03) / Math.cos(a);
          x = sg * dist * Math.cos(a); z = dist * Math.sin(a);
        }
        simple({ k: k, w: q.w, d: q.d, h: q.h, t: t, B: B === 'legs' ? 'legs4' : B, st: st, met: met, mat: mat, x: x, z: z, small: true, kk: met ? 1 : .7, footK: .36 });
      });
    }
    /* ================================================================== MEJA KONSOL */
    function consoleT() {
      var k = c.topShape || 'rect', w = cm(c.w, 120), d = cm(c.d, 36), h = cm(c.h, 80), under = h - t, B = c.base || 'slab', nd = k === 'organic' ? 0 : Math.max(0, +c.drawers || 0), met = c.baseMat === 'metal';
      if (B === 'waterfall' && k !== 'rect') B = 'slab'; if (B === 'pedestal') B = 'pillar';
      topSlab(root, k, w, d, h, t, topM);
      var I = { innerX: w / 2 - .05, innerZ: d / 2 - .03 }, apH = nd ? .13 : 0;
      if (B === 'wall') {
        var bh = nd ? .14 : .05, zr0 = zRange(k, w, d, w / 2 - .06, .02);
        box(root, w - .08, bh, Math.max(.12, zr0[1] - zr0[0] - .02), bodyM, 0, under - bh / 2, (zr0[0] + zr0[1]) / 2, .004);
        box(root, w * .7, .04, .015, dark('#2a2420'), 0, under - .03, -d / 2 - .0075, .002);
        I.innerX = w / 2 - .05; apH = nd ? bh : 0;
      } else I = base(root, B, k, w, d, under, { st: c.legStyle, met: met, mat: B === 'waterfall' ? topM : baseM, apron: nd ? 0 : (met ? .035 : .06), turned: B === 'pillar', kk: .85 });
      if (nd) {
        var ix = Math.max(.15, I.innerX - .005), zr = zRange(k, w, d, ix, .02), zf = Math.min(d / 2 - .05, zr[1] - .045), zb = zr[0] + .02, hd = zf - zb;
        if (B !== 'wall') box(root, 2 * ix, apH, hd, bodyM, 0, under - apH / 2, zb + hd / 2, .003);
        var dw = 2 * ix / nd;
        for (var i = 0; i < nd; i++) drawer(root, -ix + dw * (i + .5), under - apH / 2, dw, apH - .006, zf, 1, Math.max(.1, hd - .03), { handle: 'bar', face: c.face, mat: c.face === 'fluted' && c.body !== 'paint' && !WOODISH() ? wood(woodHex, 'solid') : bodyM });
      }
      if (has('shelf') && B !== 'wall' && B !== 'pillar') { var sw = 2 * (I.innerX || w / 2 - .1), zr2 = zRange(k, w, d, sw / 2, .03); box(root, sw, .022, Math.max(.12, zr2[1] - zr2[0]), shelfM, 0, .12, (zr2[0] + zr2[1]) / 2, .003); }
      if (has('led')) { var lg = box(root, w * .75, .006, .008, glow(), 0, under - apH - .004, d * .25 - (nd ? 0 : .05), 0); lg.castShadow = false; }
      if (has('socket')) { var q = fit(k, w, d, w * .32, -d * .2, .06); box(root, .2, .004, .05, dark('#2a2522'), q[0], h + .002, q[1], .002); }
    }
    function WOODISH() { return /^(wood|veneer)$/.test(c.topMat); }
    /* ================================================================== MEJA COUNTER / ISLAND */
    function counter() {
      if (c.form === 'island') return island();
      var S = shapeDims(160, 90, 100), h = cm(c.h, 90), B = c.base || 'legs4';
      if (S.k === 'round' && /^(trestle|sled|slab|double)$/.test(B)) B = 'pedestal'; if (S.rs && B === 'double') B = 'pedestal';
      var I = simple({ k: S.k, w: S.w, d: S.d, h: h, t: t, B: B, st: c.legStyle, met: c.baseMat === 'metal', mat: baseM, apron: c.baseMat === 'metal' ? .035 : .07, footK: .36, kk: c.baseMat === 'metal' ? 1.1 : 1.2 });
      footrest(I.G, c.footrest, B, S.k, S.w, S.d, I.under, I, .22);
      tableExtras(I.G, S.k, S.w, S.d, h, I);
      settings(I.G, S.k, S.w, S.d, h, S.rs ? (S.w >= .95 ? 4 : 3) : 2 * Math.max(1, Math.floor(S.w / .6)), c.tableware, { noEnds: true });
    }
    function island() {
      var wf = has('waterfall'), k = wf ? 'rect' : (/^(softrect|capsule)$/.test(c.topShape) ? c.topShape : 'rect'), w = cm(c.w, 160), d = cm(c.d, 90), h = cm(c.h, 90), ov = .28;
      var bodyD = Math.max(.45, d - ov - .05), zb = d / 2 - .05 - bodyD / 2, bw = wf ? w - 2 * t - .01 : w - .08;
      for (var i = 0; i < 80 && !(inside(k, w, d, bw / 2, d / 2 - .05, .01) && inside(k, w, d, bw / 2, zb - bodyD / 2, .01)); i++) bw -= .02;
      topSlab(root, k, w, d, h, t, topM, { noLive: true });
      if (wf) [-1, 1].forEach(function (e) { box(root, t, h - t, d, topM, e * (w / 2 - t / 2), (h - t) / 2, 0, .003); });
      var n = Math.max(2, Math.round(bw / .55)), bays = [];
      for (var j = 0; j < n; j++) bays.push(c.islandBody === 'open' ? 'open' : c.islandBody === 'doors' ? 'door' : (j % 2 ? 'door' : 'drawers3'));
      cabinetRow(root, bw, bodyD, h - t, 0, zb, 0, bays, { handle: 'bar' });
      if (c.footrest === 'bar') { var fz = zb - bodyD / 2 - .07; rod(root, [-bw / 2 + .1, .2, fz], [bw / 2 - .1, .2, fz], .012, METAL(), 12); [-1, 1].forEach(function (e) { rod(root, [e * (bw / 2 - .15), .2, fz], [e * (bw / 2 - .15), .2, zb - bodyD / 2], .008, METAL(), 8); }); }
      if (has('socket')) box(root, .2, .004, .05, dark('#2a2522'), -w * .25, h + .002, d * .1, .002);
      settings(root, k, w, d, h, 0, c.tableware, { back: true });
    }
    /* ================================================================== MEJA BAR */
    function barT() {
      var S = shapeDims(120, 60, 70), h = cm(c.h, 105), B = c.base || 'pedestal';
      if (S.rs && /^(double|trestle)$/.test(B)) B = 'pedestal'; if (!S.rs && B === 'slatted') B = 'pedestal'; if (B === 'legs3' && S.k !== 'round') B = 'legs4';
      var I = simple({ k: S.k, w: S.w, d: S.d, h: h, t: t, B: B === 'double' ? 'column' : B, st: c.legStyle, met: c.baseMat === 'metal' && B !== 'slatted', mat: B === 'slatted' ? WOOD() : baseM, apron: c.baseMat === 'metal' ? .035 : .06, footK: .42, kk: .85 });
      footrest(I.G, c.footrest, B, S.k, S.w, S.d, I.under, I, .28);
      tableExtras(I.G, S.k, S.w, S.d, h, I);
      settings(I.G, S.k, S.w, S.d, h, S.rs ? (S.w >= .8 ? 4 : 2) : 2 * Math.max(1, Math.floor(S.w / .6)), c.tableware, { noEnds: true });
    }

    /* ================================================================== MEJA KERJA */
    var CLR = { legs4: .11, sled: .09, aframe: .1, slab: .13, waterfall: .05, electric: .27 };
    function desk() {
      var k = c.topShape || 'rect', w = cm(c.w, 140), d = cm(c.d, 70), h = cm(c.h, 75), under = h - t, sx = c.layout === 'lleft' ? -1 : c.layout === 'lright' ? 1 : 0;
      var B = c.base || 'sled'; if (sx && /^(waterfall|electric)$/.test(B)) B = 'sled'; if (sx) k = 'rect'; if (B === 'waterfall' && k !== 'rect') B = 'slab';
      var met = B === 'electric' || c.baseMat === 'metal' && !/^(waterfall|slab)$/.test(B), fm = B === 'electric' ? METAL() : B === 'waterfall' ? topM : B === 'slab' ? bodyM : (c.baseMat === 'metal' ? METAL() : WOOD()), st = B === 'legs4' ? (c.legStyle || 'tapered') : 'square';
      var ped = c.pedestal || 'none', pk = B === 'electric' ? 'mobile' : (c.pedType || 'floor'), tower = RECTK.test(k) ? (c.tower || 'none') : 'none', hutch = RECTK.test(k) ? (c.hutch || 'none') : 'none';
      var pw = .42, d2 = Math.max(.5, Math.min(d, .7) * .85), rl = sx ? Math.max(cm(c.retL, 120), d + .3) : 0, clr = CLR[B] || .1;
      var hasPed = function (e) { return ped === 'both' || ped === (e < 0 ? 'left' : 'right'); };
      // top
      if (!sx) topSlab(root, k, w, d, h, t, topM);
      else { var P0 = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, -d / 2 + rl], [w / 2 - d2, -d / 2 + rl], [w / 2 - d2, d / 2], [-w / 2, d / 2]].map(function (q) { return [q[0] * sx, q[1]]; }); slab(root, wsh(P0), t, topM, h - t, Math.min(bev, t * .45), segs); }
      // ujung kiri (-1) / kanan (1): rangka, pedestal berdiri, atau rak menara
      var lim = {};
      [-1, 1].forEach(function (e) {
        var isRet = sx && e === sx, pedHere = hasPed(e), floorPed = pedHere && pk === 'floor', towerHere = tower === (e < 0 ? 'left' : 'right');
        var limit;   // jarak dari tepi ujung ke ruang kaki
        if (isRet) {   // ujung sisi return: rangka di ujung depan return + tiang sudut belakang (atau pedestal berdiri di sudut)
          var zr = -d / 2 + rl - .06, xc = e * (w / 2 - d2 / 2);
          endFrame(root, B === 'legs4' ? 'legs4' : B, xc, zr - (B === 'legs4' ? 0 : 0), d2 - .12, 'x', under, fm, { met: met, st: st, out: -1 });
          if (!floorPed) legOne(root, e * (w / 2 - .05), -d / 2 + .05, under, B === 'legs4' ? st : 'square', fm, met, 1, [e, -1]);
          limit = floorPed ? pw + .03 : .12;
        } else if (towerHere) {
          var TW = group(root, e * (w / 2 + .2), 0), H2 = Math.max(1.4, h + .7), tmet = c.baseMat === 'metal';
          if (tmet) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { box(TW, .025, H2, .025, METAL(), q[0] * .1875, H2 / 2, q[1] * (d / 2 - .0125), .003); });
          else [-1, 1].forEach(function (q) { box(TW, .02, H2, d, bodyM, q * .19, H2 / 2, 0, .003); });
          [.06, .42, under - .0125, h + .38, H2 - .0125].forEach(function (y) { box(TW, tmet ? .4 : .36, .025, d - (tmet ? .01 : .0), shelfM, 0, y, 0, .003); });
          if (tmet) [-1, 1].forEach(function (q) { rod(TW, [-.18, .08, -d / 2 + .013], [.18, H2 - .1, -d / 2 + .013], .004, METAL(), 6); });
          limit = .03;
        } else if (floorPed) { limit = pw + .03; }
        else {
          var ep = endPos(k, w, d, B === 'electric' ? Math.min(.22, w * .14) : B === 'waterfall' ? t / 2 : B === 'slab' ? .09 : .06 + (st === 'splay' ? SPL * under : 0), .04, .6);
          if (B === 'waterfall') ep = { xe: w / 2 - t / 2, zc: 0, len: d - .03 };
          endFrame(root, B, e * ep.xe, ep.zc, B === 'electric' ? ep.len * .9 : ep.len, 'z', under, fm, { met: met, st: st, out: e, t: t });
          limit = w / 2 - ep.xe + clr - (B === 'electric' ? .06 : .05);
        }
        if (pedHere) {
          var pd, zc, y0, ph, xP;
          if (pk === 'floor') { pd = d - .1; zc = -.02; y0 = .03; ph = under - .03; xP = w / 2 - pw / 2 - .015; for (var i = 0; i < 40 && !inside(k, w, d, xP + pw / 2, pd / 2, .01); i++) xP -= .01; }
          else { pd = Math.min(d - .12, .5); zc = d / 2 - .05 - pd / 2; y0 = pk === 'hang' ? under - .4 : .055; ph = pk === 'hang' ? .4 : Math.min(.58, under - .12); xP = w / 2 - limit - pw / 2 - .01; limit += pw + .02; }
          pedUnit(root, e * xP, y0, pw, ph, zc, pd, 1, rowsOf(c.pedDrawers, pk === 'hang'), { handle: 'bar', lock: has('lock'), kick: pk === 'floor', castor: pk === 'mobile' });
        }
        lim[e] = e * (w / 2 - limit);
      });
      var xl = lim[-1], xr = lim[1], span = xr - xl, xm = (xl + xr) / 2;
      // rangka penghubung belakang / panel modesty
      if (has('modesty')) {
        box(root, span - .02, under * .45, .018, B === 'waterfall' ? topM : bodyM, xm, under - under * .225 - .01, -d / 2 + .03, .003);
        if (sx) box(root, .018, under * .45, rl - d - .1, bodyM, sx * (w / 2 - .03), under - under * .225 - .01, d / 2 + (rl - d - .1) / 2, .003);
      } else if (/^(legs4|sled|aframe|electric)$/.test(B)) box(root, span + .08, .04, .025, B === 'electric' ? METAL() : fm, xm, under - .02, -d / 2 + .05, .004);
      // laci tengah tipis atau laci keyboard
      var nd = k === 'organic' ? 0 : Math.max(0, +c.drawers || 0), zfD = Math.min(d / 2 - .03, zRange(k, w, d, Math.min(Math.abs(xl), Math.abs(xr)), .03)[1]);
      if (nd) {
        var dw = Math.min(.55, (span - .06) / nd), hdD = Math.min(.45, d - .15);
        box(root, dw * nd + .02, .1, hdD, bodyM, xm, under - .05, zfD - hdD / 2, .003);
        for (var j = 0; j < nd; j++) drawer(root, xm - dw * nd / 2 + dw * (j + .5), under - .05, dw, .09, zfD, 1, hdD - .03, { handle: 'slot', lock: has('lock') && j === 0 && ped === 'none' });
      } else if (has('keyboard')) {
        var KB = Math.min(.7, span - .1); [-1, 1].forEach(function (e) { box(root, .02, .02, .42, METAL(), xm + e * (KB / 2 + .01), under - .01, zfD - .23, .002); });
        var P = new T.Group(); root.add(P); box(P, KB, .016, .3, bodyM, xm, under - .045, zfD - .17, .004); [-1, 1].forEach(function (e) { box(P, .012, .03, .3, METAL(), xm + e * (KB / 2 + .006), under - .03, zfD - .17, .002); });
        motion(P, 'drawer', function (v) { P.position.z = .24 * v; });
      }
      // hutch
      var hD = hutch === 'gallery' ? .22 : .28, back0 = hutch !== 'none' ? hD + .02 : 0;
      if (hutch !== 'none') {
        var hw = w, hx = 0; if (sx) { hw = w - d2; hx = -sx * d2 / 2; }
        var hh = hutch === 'gallery' ? .2 : .55, zc2 = -d / 2 + hD / 2, G = group(root, hx, zc2);
        [-1, 1].forEach(function (e) { box(G, .02, hh, hD, bodyM, e * (hw / 2 - .01), h + hh / 2, 0, .003); });
        box(G, hw, .02, hD, bodyM, 0, h + hh - .01, 0, .003); box(G, hw - .04, hh - .02, .01, bodyM, 0, h + hh / 2, -hD / 2 + .005, .002);
        if (hutch === 'gallery') { var nc = Math.max(2, Math.round(hw / .3)); for (var q = 1; q < nc; q++) box(G, .016, hh - .02, hD - .01, bodyM, -hw / 2 + hw * q / nc, h + hh / 2, 0, .002); box(G, hw - .04, .016, hD - .01, bodyM, 0, h + hh * .5, 0, .002); }
        else {
          var nv = Math.max(2, Math.round(hw / .5)); for (var q2 = 1; q2 < nv; q2++) box(G, .018, hh - .02, hD - .01, bodyM, -hw / 2 + hw * q2 / nv, h + hh / 2, 0, .002);
          for (var q3 = 0; q3 < nv; q3++) box(G, hw / nv - .03, .018, hD - .02, bodyM, -hw / 2 + hw * (q3 + .5) / nv, h + hh * .5, 0, .002);
          if (hutch === 'cabinet') for (var q4 = 0; q4 < nv; q4++) door(G, -hw / 2 + hw * (q4 + .5) / nv, h + hh / 2, hw / nv - .004, hh - .03, hD / 2, 1, q4 % 2 ? 1 : -1, bodyM, 'slot');
        }
      }
      // aksesori
      if (has('cable')) { var tw2 = Math.max(.3, Math.min(.9, span - .06)); box(root, tw2, .06, .1, dark('#262626'), xm, under - .05, -d / 2 + .12, .004); var gq = [xm + tw2 * .35, -d / 2 + .08 + back0]; cyl(root, .03, .03, .004, dark(), gq[0], h + .001, gq[1], 28); torus(root, .031, .003, METAL(), gq[0], h + .002, gq[1], 0, 40).rotation.x = PI / 2; }
      if (has('socket')) { box(root, .2, .004, .05, dark('#2a2522'), xm - Math.min(.3, span * .3), h + .002, -d / 2 + .09 + back0, .002); [0, 1, 2].forEach(function (j2) { cyl(root, .008, .008, .002, metal(X.METAL[3]), xm - Math.min(.3, span * .3) - .06 + j2 * .06, h + .0045, -d / 2 + .09 + back0, 12); }); }
      if (has('monitor') && hutch === 'none') { var mw = Math.min(w * .6, 1.0), mx = sx ? -sx * d2 / 2 : 0; box(root, mw, .022, .24, shelfM, mx, h + .111, -d / 2 + .15, .004); [-1, 1].forEach(function (e) { box(root, .022, .1, .22, shelfM, mx + e * (mw / 2 - .02), h + .05, -d / 2 + .15, .003); }); }
      if (B === 'electric') box(root, .09, .025, .045, dark(), xr - .12, under - .0125, d / 2 - .07, .006);
    }

    /* ================================================================== MEJA KANTOR / WORKSTATION */
    function office() {
      var n = { single: 1, b2: 2, b4: 4, b6: 6 }[c.layout] || 1, cols = n === 1 ? 1 : n / 2, rows = n === 1 ? 1 : 2;
      var w = cm(c.w, 140), d = cm(c.d, 70), h = cm(c.h, 75), under = h - t, Wt = cols * w, Dt = rows * d, B = c.frame || 'sled';
      if (B === 'electric' && n > 1) B = 'sled';
      var met = c.baseMat !== 'wood' || B === 'electric', fm = B === 'slab' ? topM : met ? METAL() : WOOD(), j, r;
      var zc = function (r) { return rows === 1 ? 0 : (r ? d / 2 : -d / 2); }, dirOf = function (r) { return rows === 1 || r ? 1 : -1; };
      for (j = 0; j < cols; j++) for (r = 0; r < rows; r++) { var G = group(root, -Wt / 2 + w * (j + .5), zc(r)); topSlab(G, 'rect', w - .004, d - .004, h, t, topM, { noLive: true }); }
      var e0 = B === 'electric' ? Math.min(.22, w * .14) : B === 'slab' ? .03 : B === 'aframe' ? .07 : .05;
      for (j = 0; j <= cols; j++) {
        var outer = j === 0 || j === cols, fx = j === 0 ? -Wt / 2 + e0 : j === cols ? Wt / 2 - e0 : -Wt / 2 + j * w, kind = !outer && B === 'slab' ? 'sled' : B;
        endFrame(root, kind, fx, 0, (B === 'electric' ? .85 : 1) * (Dt - (kind === 'slab' ? .06 : .1)), 'z', under, kind === 'sled' && B === 'slab' ? METAL() : fm, { met: met || kind === 'sled', st: 'square', out: j === 0 ? -1 : j === cols ? 1 : 0, noApron: true });
      }
      if (/^(sled|legs4|aframe)$/.test(B)) [-1, 1].forEach(function (e) { box(root, Wt - 2 * e0, .035, .025, fm, 0, under - .0175, e * (Dt / 2 - .08), .003); });
      if (B === 'electric') box(root, Wt - 2 * e0, .05, .05, METAL(), 0, under - .03, 0, .006);
      // panel privasi
      var scr = c.screen || 'none';
      if (scr !== 'none') {
        var sm = scr === 'fabric' ? fabric('#8a8d86', 'linen') : scr === 'acrylic' ? frost() : glass(), sh = .42;
        for (j = 0; j < cols; j++) {
          var x = -Wt / 2 + w * (j + .5), sw = w - (rows === 1 ? .1 : .03), z = rows === 1 ? -d / 2 + .02 : 0;
          var pm = box(root, sw, sh, scr === 'fabric' ? .025 : .008, sm, x, h + .012 + sh / 2, z, scr === 'fabric' ? .008 : .002); if (scr !== 'fabric') pm.castShadow = false;
          if (scr === 'glass') { [-1, 1].forEach(function (e) { box(root, sw, .016, .016, METAL(), x, h + .012 + (e > 0 ? sh : 0), z, .002); box(root, .016, sh, .016, METAL(), x + e * (sw / 2), h + .012 + sh / 2, z, .002); }); }
          [-1, 1].forEach(function (e) { box(root, .04, .03, .045, METAL(), x + e * sw * .35, h + .012, z, .003); });
        }
      }
      for (j = 0; j < cols; j++) for (r = 0; r < rows; r++) {
        var xc = -Wt / 2 + w * (j + .5), zz = zc(r), dr = dirOf(r), far = zz - dr * (d / 2 - .1);
        if (c.mped === 'each') { var pd = Math.min(d - .14, .5), xP = xc + w / 2 - .12 - .21; pedUnit(root, xP, .055, .42, Math.min(.58, under - .14), zz + dr * (d / 2 - .06 - pd / 2), pd, dr, rowsOf('3'), { handle: 'slot', castor: true }); }
        if (has('tray')) box(root, Math.min(.9, w * .6), .06, .1, dark('#262626'), xc - w * .05, under - .05, zz - dr * (d / 2 - (rows === 1 ? .12 : .13)), .004);
        if (has('power')) { box(root, .24, .01, .09, dark('#222'), xc, h + .005, far, .002); box(root, .2, .002, .002, chrome(), xc, h + .011, far + dr * .03, 0); }
        if (has('arm')) { var ax = xc + w * .28, az = zz - dr * (d / 2 - .06); cyl(root, .014, .014, .38, METAL(), ax, h + .19, az, 16); rod(root, [ax, h + .36, az], [ax - .16, h + .36, az + dr * .14], .012, METAL(), 10); rod(root, [ax - .16, h + .36, az + dr * .14], [ax - .3, h + .34, az + dr * .2], .011, METAL(), 10); box(root, .1, .1, .012, METAL(), ax - .3, h + .34, az + dr * .21, .003); box(root, .06, .03, .08, METAL(), ax, h + .015, az, .003); }
        if (has('modesty') && rows === 1) box(root, w - .2, under * .4, .015, bodyM, xc, under - under * .2 - .02, -d / 2 + .05, .003);
      }
      if (has('modesty') && rows > 1) for (j = 0; j < cols; j++) box(root, w - .2, under * .4, .015, bodyM, -Wt / 2 + w * (j + .5), (has('spine') ? under - .13 : under - .02) - under * .2, 0, .003);
      if (has('spine') && rows > 1) { box(root, Wt - .3, .09, .12, dark('#2b2b2b'), 0, under - .065, 0, .006); box(root, .1, under - .11, .06, dark('#2b2b2b'), -Wt / 2 + w * .5, (under - .11) / 2, 0, .006); }
    }

    /* ================================================================== MEJA EKSEKUTIF (sisi tamu = +z, pengguna = -z) */
    var LEA = { black: '#1c1a19', cognac: '#7b4a2c', green: '#2f4a3a' };
    function executive() {
      var k = c.topShape || 'softrect', w = cm(c.w, 200), d = cm(c.d, 90), h = cm(c.h, 76), under = h - t, form = c.form || 'desk', sx = c.side === 'left' ? -1 : 1, B = c.base || 'ped2';
      var hasRet = form === 'return' || form === 'u', hasCred = form === 'credenza' || form === 'u', rl = Math.max(cm(c.retL, 140), 1.0);
      if (hasRet && !/^(rect|softrect)$/.test(k)) k = 'rect';
      topSlab(root, k, w, d, h, t, topM);
      var pw = Math.min(.5, w * .22), pd = d - .14, pedSide = hasRet ? -sx : 1, kickM = has('brass') ? metal(X.find(X.METAL, 'brass')) : dark('#1a1613'), xl = -w / 2 + .1, xr = w / 2 - .1;
      var pedAt = function (e) { var xP = w / 2 - pw / 2 - .04; for (var i = 0; i < 60 && !inside(k, w, d, xP + pw / 2, pd / 2, .02); i++) xP -= .01; pedUnit(root, e * xP, .03, pw, under - .03, -.01, pd, -1, rowsOf(c.pedDrawers), { handle: 'barL', lock: has('lock'), kick: true, kickM: kickM }); return xP - pw / 2; };
      var kl = null, kr = null, lim = function (e, v) { if (e < 0) xl = -v; else xr = v; };
      if (B === 'ped2') { [-1, 1].forEach(function (e) { lim(e, pedAt(e)); }); }
      else if (B === 'pedPanel' || B === 'pedCyl' || B === 'slab') {
        if (B !== 'slab') lim(pedSide, pedAt(pedSide));
        (B === 'slab' ? [-1, 1] : [-pedSide]).forEach(function (e) {
          if (B === 'pedCyl') { var r = Math.min(.2, d * .24), xc = w / 2 - r - .08; for (var i = 0; i < 60 && !inside(k, w, d, xc + r, 0, .03); i++) xc -= .01; cyl(root, r, r, under, bodyM, e * xc, under / 2, 0, 48); if (has('brass')) cyl(root, r + .002, r + .002, .03, kickM, e * xc, .015, 0, 48); lim(e, xc - r); }
          else { var ep = endPos(k, w, d, .07, .04, .7); box(root, .06, under, ep.len, bodyM, e * ep.xe, under / 2, ep.zc, .006); lim(e, ep.xe - .03); }
        });
      } else if (B === 'legs4') {
        var I = base(root, 'legs4', k, w, d, under, { st: 'tapered', met: false, mat: WOOD(), apron: .06 }), ix = I.innerX, iz = Math.abs(I.pts[0][1]);
        var xP = pedSide * (ix - pw / 2 - .005); pedUnit(root, xP, under - .06 - .34, pw, .34, -iz + (d * .6) / 2 - .011, d * .6, -1, rowsOf(c.pedDrawers, true), { handle: 'barL', lock: has('lock') });
        lim(pedSide, ix); lim(-pedSide, ix); kl = pedSide > 0 ? -ix : -ix + pw + .02; kr = pedSide > 0 ? ix - pw - .02 : ix;
      } else { var I2 = base(root, 'sled', k, w, d, under, { met: true, mat: METAL() }); xl = -I2.innerX; xr = I2.innerX; }
      // panel depan (sisi tamu)
      var fr = c.front || 'panel';
      if (fr !== 'open') {
        var fw = xr - xl - .004, fx = (xl + xr) / 2, fy0 = B === 'legs4' || B === 'sled' ? under * .45 : .1, fh = under - fy0 - (B === 'legs4' ? .06 : 0), fz = zRange(k, w, d, (xl + xr) / 2 + fw / 2, .09)[1];
        var ky = fy0 + fh / 2;
        if (fr === 'leather') { var lm2 = fabric(LEA[c.inlay] || LEA.cognac, 'leather'); box(root, fw, fh, .03, lm2, fx, ky, fz, .012); var nl = Math.max(2, Math.floor(fh / .09)); for (var q = 1; q < nl; q++) box(root, fw - .02, .003, .002, dark('#2a1a12'), fx, fy0 + fh * q / nl, fz + .0155, 0); }
        else { box(root, fw, fh, .025, bodyM, fx, ky, fz - .003, .004); if (fr === 'fluted') { var fmF = c.body === 'paint' ? bodyM : wood(woodHex, 'solid'), nf = Math.floor(fw / .03); for (var q5 = 0; q5 < nf; q5++) cyl(root, .011, .011, fh - .01, fmF, fx - fw / 2 + fw * (q5 + .5) / nf, ky, fz + .009, 10); } }
      }
      // inlay kulit (alas tulis) di sisi pengguna
      if (c.inlay && c.inlay !== 'none' && !GL) slab(root, rrect(Math.min(w * .5, 1.0), Math.min(d * .42, .45), .02), .0025, fabric(LEA[c.inlay], 'leather'), h, .0008, 2).position.z = -d * .14;
      if (has('brass') && RECTK.test(k)) { var bl = [[w - .2, .006, 0, d / 2 - .035], [w - .2, .006, 0, -d / 2 + .035]]; bl.forEach(function (q6) { box(root, q6[0], .0015, q6[1], kickM, q6[2], h + .0006, q6[3], 0); }); [-1, 1].forEach(function (e) { box(root, .006, .0015, d - .2, kickM, e * (w / 2 - .035), h + .0006, 0, 0); }); }
      if (kl == null) { kl = xl; kr = xr; }
      if (has('cable')) { box(root, Math.max(.3, Math.min(1, kr - kl - .1)), .06, .1, dark('#262626'), (kl + kr) / 2, under - .05, d * .1, .004); cyl(root, .03, .03, .004, dark(), w * .25, h + .001, d * .2, 28); }
      if (has('socket')) box(root, .2, .004, .05, dark('#2a2522'), -w * .25, h + .002, d * .25, .002);
      if (has('charger')) { var cr = torus(root, .04, .0016, glow('#bfe3ff'), w * .3, h + .0032, -d * .2, 0, 48); cr.rotation.x = PI / 2; cr.castShadow = false; cyl(root, .045, .045, .003, dark('#151515'), w * .3, h + .0015, -d * .2, 40); }
      // return (L) & credenza
      if (hasRet) cabinetRow(root, rl, .5, h - t, sx * (w / 2 - .25), -d / 2 - rl / 2, -sx * PI / 2, rl > 1.2 ? ['door', 'drawers3', 'door'] : ['drawers3', 'door'], { top: true, handle: 'barL', lock: has('lock') });
      if (hasCred) {
        var L2 = form === 'u' ? w : Math.min(w * .95, 2.4), cz = form === 'u' ? -d / 2 - rl - .25 : -d / 2 - 1.0 - .25, Hc = form === 'u' ? h - t : .62, nb = Math.max(3, Math.round(L2 / .55)), bays = [];
        for (var b = 0; b < nb; b++) bays.push(b === 0 || b === nb - 1 ? 'door' : b % 2 ? 'drawers3' : 'open');
        cabinetRow(root, L2, .5, Hc, 0, cz, 0, bays, { top: true, handle: 'barL', led: has('led'), lock: has('lock') });
      }
    }

    /* ================================================================== MEJA RESEPSIONIS (tamu = +z) */
    function reception() {
      var plan = c.plan || 'straight', w = cm(c.w, 240), D0 = cm(c.d, 70), Hh = cm(c.h, 110), Dt = D0 + .05, rl = Math.max(cm(c.retL, 140), .8), ada = (+c.w || 240) >= 180 ? c.ada || 'none' : 'none';
      var pl = c.plinth || 'recessed', py0 = pl === 'float' ? .1 : .08, lw = .32, wt = .75, face = c.face || 'plain';
      var woodF = c.body === 'paint' ? bodyM : wood(woodHex, 'solid');
      function facePanel(G, cx, L, y0, fh, zf, logo) {
        if (face === 'stone') { box(G, L, fh, .04, stone(STN), cx, y0 + fh / 2, zf - .02, .003); return; }
        box(G, L, fh, .03, face === 'slats' ? dark('#2a231e') : bodyM, cx, y0 + fh / 2, zf - .025, .003);
        var i, n;
        if (face === 'fluted') { n = Math.floor(L / .032); for (i = 0; i < n; i++) cyl(G, .013, .013, fh - .01, woodF, cx - L / 2 + L * (i + .5) / n, y0 + fh / 2, zf - .012, 12); }
        if (face === 'slats') { n = Math.floor(L / .06); for (i = 0; i < n; i++) box(G, .032, fh - .01, .025, wood(woodHex, 'solid'), cx - L / 2 + L * (i + .5) / n, y0 + fh / 2, zf - .0125, .003); }
        if (face === 'led' && L > .8 && logo) { var lw2 = Math.min(1.4, L * .5), lh2 = fh * .5, ly = y0 + fh * .55; box(G, lw2 + .04, lh2 + .04, .012, METAL(), cx, ly, zf - .004, .003); var gp = box(G, lw2, lh2, .006, glow('#fff4e0'), cx, ly, zf + .003, 0); gp.castShadow = false; box(G, lw2 * .5, lh2 * .12, .003, dark('#2b2622'), cx + lw2 * .06, ly, zf + .0075, .001); box(G, lh2 * .3, lh2 * .3, .003, dark('#2b2622'), cx - lw2 * .3, ly, zf + .0075, .001); }
      }
      function plinth(G, cx, L, zf) {
        if (pl === 'metal') box(G, L, py0, .012, METAL(), cx, py0 / 2, zf - .006, .002);
        else { box(G, L - .02, py0, .03, dark('#1a1613'), cx, py0 / 2, zf - .07, .002); if (pl === 'float') { var gs = box(G, L - .1, .006, .01, glow(), cx, py0 - .006, zf - .04, 0); gs.castShadow = false; } }
      }
      function run(G, len, o) {
        var zf = Dt / 2, aw = .9, adaL = o.ada === 'L', adaR = o.ada === 'R';
        var x0 = -len / 2 + (adaL ? aw : 0), x1 = len / 2 - (adaR ? aw : 0), segL = x1 - x0, cx = (x0 + x1) / 2, fh = Hh - .04 - py0;
        plinth(G, cx, segL, zf); facePanel(G, cx, segL, py0, fh, zf, o.extras);
        box(G, segL, .04, lw, topM, cx, Hh - .02, zf - lw / 2 + .04, Math.min(.006, bev));
        if (has('ledTop')) { var lg = box(G, segL - .1, .006, .01, glow(), cx, Hh - .043, zf + .022, 0); lg.castShadow = false; }
        box(G, segL - .08, Hh - .04 - wt, .02, bodyM, cx, wt + (Hh - .04 - wt) / 2, zf + .04 - lw + .02, .002);
        // meja kerja di belakang
        var wx0 = -len / 2 + (o.endL ? .04 : 0), wx1 = len / 2 - (o.endR ? .04 : 0);
        var ax0 = adaL ? x0 : wx1, ax1 = adaR ? x1 : wx0;
        box(G, Math.min(x1, wx1) - Math.max(x0, wx0), .03, Dt - .04, topM, (Math.min(x1, wx1) + Math.max(x0, wx0)) / 2, wt - .015, -.02, .003);
        [adaL ? [wx0, x0] : null, adaR ? [x1, wx1] : null].forEach(function (a) {
          if (!a) return; var ac = (a[0] + a[1]) / 2, aL = a[1] - a[0];
          box(G, aL, .03, Dt + .02, topM, ac, wt - .015, .01, .003); plinth(G, ac, aL, zf); facePanel(G, ac, aL, py0, wt - .03 - py0, zf);
        });
        void ax0; void ax1;
        // panel ujung
        [['L', -1], ['R', 1]].forEach(function (q) {
          if (!o['end' + q[0]]) return; var ex2 = q[1] * (len / 2 - .02), low = (q[0] === 'L' && adaL) || (q[0] === 'R' && adaR);
          if (low) { box(G, .04, wt - .03, Dt, bodyM, ex2, (wt - .03) / 2, 0, .003); return; }
          if (o['full' + q[0]]) { box(G, .04, Hh - .04, Dt, bodyM, ex2, (Hh - .04) / 2, 0, .003); return; }
          box(G, .04, Hh - .04, lw - .04, bodyM, ex2, (Hh - .04) / 2, zf - (lw - .04) / 2, .003);
          box(G, .04, wt - .03, Dt - lw + .04, bodyM, ex2, (wt - .03) / 2, -Dt / 2 + (Dt - lw + .04) / 2, .003);
        });
        if (o.ped) { var pd = Math.min(.5, Dt - .1), ps = o.ped, px = ps * (len / 2 - .04 - .22); if ((ps < 0 && adaL) || (ps > 0 && adaR)) px -= ps * .9; pedUnit(G, px, .03, .42, wt - .06, -Dt / 2 + .02 + pd / 2, pd, -1, rowsOf('3'), { handle: 'slot', lock: has('lock'), kick: true }); }
        if (o.extras) {
          if (has('logo') && face !== 'led') { box(G, .48, .13, .012, METAL(), cx, py0 + fh * .6, zf + .008, .003); box(G, .4, .02, .002, dark('#2b2622'), cx, py0 + fh * .6, zf + .0145, 0); }
          if (has('socket')) box(G, .2, .004, .05, dark('#2a2522'), cx - segL * .2, wt + .002, -Dt / 2 + .12, .002);
          if (has('cable')) { cyl(G, .03, .03, .004, dark(), cx + segL * .2, wt + .001, -Dt / 2 + .1, 28); box(G, Math.min(.9, segL * .4), .06, .1, dark('#262626'), cx + segL * .2, wt - .08, -Dt / 2 + .12, .004); }
        }
      }
      if (plan === 'curved') return curved();
      var sx = plan === 'lleft' ? -1 : plan === 'lright' ? 1 : 0;
      var main = group(root, 0, 0);
      run(main, w, { endL: true, endR: true, fullL: sx < 0, fullR: sx > 0, ada: ada === 'left' ? 'L' : ada === 'right' ? 'R' : null, ped: sx ? -sx : (ada === 'right' ? -1 : 1), extras: true });
      if (sx) run(group(root, sx * (w / 2 - Dt / 2), -Dt / 2 - rl / 2, sx * PI / 2), rl, { endL: sx < 0, endR: sx > 0 });
      function curved() {
        var sg = w * .16, R = (w * w / 4 + sg * sg) / (2 * sg), zc0 = Dt / 2 - R, al = Math.asin(Math.min(1, w / 2 / R)), fh = Hh - .04 - py0, i;
        var arc = function (r, a0, a1, n) { var o = []; for (var j = 0; j <= n; j++) { var a = a0 + (a1 - a0) * j / n; o.push([r * Math.sin(a), zc0 + r * Math.cos(a)]); } return o; };
        var band = function (r1, r2, a0, a1) { return wsh(arc(r1, a0, a1, 64).concat(arc(r2, a1, a0, 64))); };
        var fM = face === 'stone' ? stone(STN) : face === 'slats' ? dark('#2a231e') : bodyM;
        slab(root, band(R - .005, R - .04, -al, al), fh, fM, py0, .001, 1);
        var n = Math.floor(2 * al * R / (face === 'fluted' ? .032 : .06));
        if (face === 'fluted') for (i = 0; i < n; i++) { var a = -al + 2 * al * (i + .5) / n; cyl(root, .013, .013, fh - .01, woodF, (R - .016) * Math.sin(a), py0 + fh / 2, zc0 + (R - .016) * Math.cos(a), 12); }
        if (face === 'slats') for (i = 0; i < n; i++) { var a2 = -al + 2 * al * (i + .5) / n; box(root, .032, fh - .01, .025, wood(woodHex, 'solid'), (R - .017) * Math.sin(a2), py0 + fh / 2, zc0 + (R - .017) * Math.cos(a2), .003).rotation.y = a2; }
        if (face === 'led') { var gb = slab(root, band(R + .002, R - .01, -.16, .16), fh * .45, glow('#fff4e0'), py0 + fh * .3, 0, 1); gb.castShadow = false; }
        if (pl === 'metal') slab(root, band(R - .005, R - .015, -al, al), py0, METAL(), 0, 0, 1);
        else { slab(root, band(R - .06, R - .09, -al, al), py0, dark('#1a1613'), 0, 0, 1); if (pl === 'float') { var gf = slab(root, band(R - .03, R - .045, -al, al), .006, glow(), py0 - .007, 0, 1); gf.castShadow = false; } }
        slab(root, band(R + .04, R + .04 - lw, -al, al), .04, topM, Hh - .04, Math.min(.004, bev), 2);
        if (has('ledTop')) { var gl2 = slab(root, band(R + .03, R + .02, -al + .02, al - .02), .006, glow(), Hh - .047, 0, 1); gl2.castShadow = false; }
        slab(root, band(R + .04 - lw + .02, R + .04 - lw, -al, al), Hh - .04 - wt, bodyM, wt, .001, 1);
        var xe = (R - .04) * Math.sin(al), za = zc0 + (R - .04) * Math.cos(al), zb = za - D0;
        slab(root, wsh(arc(R - .04, -al, al, 64).concat([[xe, zb], [-xe, zb]])), .03, topM, wt - .03, .003, 2);
        [-1, 1].forEach(function (e) { box(root, .04, wt - .03, za - zb, bodyM, e * (xe - .02), (wt - .03) / 2, (za + zb) / 2, .003); });
        var pd = .45; pedUnit(root, xe - .3, .03, .42, wt - .06, zb + .03 + pd / 2, pd, -1, rowsOf('3'), { handle: 'slot', lock: has('lock'), kick: true });
        if (has('logo') && face !== 'led') { var lg3 = box(root, .48, .13, .012, METAL(), 0, py0 + fh * .6, Dt / 2 + .004, .003); void lg3; }
        if (has('socket')) box(root, .2, .004, .05, dark('#2a2522'), -xe * .4, wt + .002, zb + .12, .002);
        if (has('cable')) cyl(root, .03, .03, .004, dark(), xe * .3, wt + .001, zb + .1, 28);
      }
    }

    /* ================================================================== MEJA RIAS */
    function mirrorUnit(kind, zc, y0, mw, stand) {
      var G = group(root, 0, zc), FM = METAL(), mm = mirrorM(), i;
      if (kind === 'round' || kind === 'ledring') {
        var R = mw / 2, cy = y0 + R + .07;
        var fr = torus(G, R, .012, FM, 0, cy, 0, 0, 72); void fr;
        cyl(G, R - .004, R - .004, .004, mm, 0, cy, .002, 64).rotation.x = PI / 2;
        cyl(G, R, R, .01, bodyM, 0, cy, -.01, 64).rotation.x = PI / 2;
        if (kind === 'ledring') { var lr = torus(G, R - .025, .005, glow('#fff3dc'), 0, cy, .006, 0, 72); lr.castShadow = false; }
        if (stand) { cyl(G, .11, .12, .018, FM, 0, y0 + .009, -.02, 40); rod(G, [0, y0 + .018, -.02], [0, cy - R + .02, -.02], .012, FM, 12); }
        return;
      }
      if (kind === 'arch') {
        var mh = mw * 1.45, ap = function (aw, ah) { var p = [[-aw / 2, 0], [aw / 2, 0]]; for (var j = 0; j <= 20; j++) { var a = j / 20 * PI; p.push([Math.cos(a) * aw / 2, ah - aw / 2 + Math.sin(a) * aw / 2]); } return p; };
        panel(G, ap(mw, mh), .025, bodyM, 0, 0, 0, y0 + .02);
        panel(G, ap(mw - .05, mh - .05), .004, mm, 0, .0145, 0, y0 + .045);
        if (stand) { [-1, 1].forEach(function (e) { box(G, .05, .02, .1, bodyM, e * mw * .3, y0 + .01, 0, .004); }); rod(G, [0, y0, -.12], [0, y0 + mh * .5, -.013], .008, FM, 8); }
        return;
      }
      if (kind === 'rect') {
        var mh2 = mw * 1.1, cy2 = y0 + mh2 * .5 + .05;
        box(G, mw + .04, .025, .14, bodyM, 0, y0 + .0125, 0, .005);
        [-1, 1].forEach(function (e) { rod(G, [e * (mw / 2 + .012), y0 + .025, 0], [e * (mw / 2 + .012), cy2 + .05, 0], .009, FM, 10); sphere(G, .012, FM, e * (mw / 2 + .012), cy2 + .05, 0); });
        var P = group(G, 0, 0); P.position.y = cy2;
        box(P, mw * .96, mh2 * .82, .02, bodyM, 0, 0, 0, .006); box(P, mw * .96 - .04, mh2 * .82 - .04, .004, mm, 0, 0, .0115, .002);
        P.rotation.x = -.08;
        return;
      }
      if (kind === 'hollywood') {
        var mh3 = mw * .8, cy3 = y0 + mh3 / 2 + .03;
        box(G, mw, mh3, .03, bodyM, 0, cy3, 0, .006); box(G, mw - .12, mh3 - .12, .004, mm, 0, cy3, .016, .002);
        var bl = glow('#fff1d0'), nb = Math.max(3, Math.round(mh3 / .12)), nt = Math.max(3, Math.round(mw / .14));
        for (i = 0; i < nb; i++) [-1, 1].forEach(function (e) { var y = cy3 - mh3 / 2 + .05 + (mh3 - .1) * i / (nb - 1); sphere(G, .017, bl, e * (mw / 2 - .03), y, .028).castShadow = false; });
        for (i = 1; i < nt - 1; i++) sphere(G, .017, bl, -mw / 2 + .03 + (mw - .06) * i / (nt - 1), cy3 + mh3 / 2 - .03, .028).castShadow = false;
        if (stand) [-1, 1].forEach(function (e) { box(G, .05, .03, .12, bodyM, e * mw * .35, y0 + .015, 0, .004); });
        return;
      }
      if (kind === 'trifold') {
        var mh4 = mw * .95, cw = mw * .5, sw = mw * .25, cy4 = y0 + mh4 / 2 + .02;
        box(G, cw, mh4, .02, bodyM, 0, cy4, 0, .004); box(G, cw - .04, mh4 - .04, .004, mm, 0, cy4, .0115, .002);
        [-1, 1].forEach(function (e) { var S = group(G, e * cw / 2, 0); S.position.y = cy4; S.rotation.y = -e * .55; box(S, sw, mh4 * .9, .02, bodyM, e * sw / 2, 0, 0, .004); box(S, sw - .03, mh4 * .9 - .04, .004, mm, e * sw / 2, 0, .0115, .002); });
        box(G, cw + .02, .02, .1, bodyM, 0, y0 + .01, -.02, .004);
      }
    }
    function vanity() {
      var k = c.topShape || 'rect', w = cm(c.w, 100), d = cm(c.d, 45), h = cm(c.h, 75), under = h - t, mount = c.mount || 'legs', nd = Math.max(0, +c.drawers || 0), flip = has('flip') && nd <= 2, ah = .15;
      if (mount === 'pedestal' && w < 1.09) mount = 'legs';
      topSlab(root, k, w, d, h, t, topM);
      var rx, zf, pts = null;
      if (mount === 'legs') {
        var I = base(root, 'legs4', k, w, d, under, { st: c.legStyle || 'tapered', met: c.baseMat === 'metal', mat: baseM, kk: .8 });
        var px = Math.abs(I.pts[0][0]), pz = Math.abs(I.pts[0][1]), lh = I.lh; pts = I.pts;
        box(root, 2 * (px - lh), ah, 2 * pz + .02, bodyM, 0, under - ah / 2, 0, .004);
        rx = px - lh - .012; zf = pz + .011;
      } else if (mount === 'pedestal') {
        var pw = Math.min(.4, w * .3);
        [-1, 1].forEach(function (e) { var xP = w / 2 - pw / 2 - .02; for (var i = 0; i < 40 && !inside(k, w, d, xP + pw / 2, d / 2 - .03, .005); i++) xP -= .01; pedUnit(root, e * xP, .03, pw, under - .03, -.03, d - .1, 1, rowsOf('3'), { handle: 'knob', kick: true, lock: has('lock') && e > 0, jewel: has('jewelry') && e > 0 }); rx = xP - pw / 2 - .015; });
        box(root, 2 * rx + .02, ah, d - .1, bodyM, 0, under - ah / 2, 0, .004); zf = d / 2 - .05;
      } else {
        var zr = zRange(k, w, d, w / 2 - .04, .02);
        box(root, w - .04, ah + .02, Math.max(.2, zr[1] - zr[0] - .02), bodyM, 0, under - (ah + .02) / 2, (zr[0] + zr[1]) / 2, .004);
        box(root, w * .8, .04, .015, dark('#2a2420'), 0, under - .03, -d / 2 - .0075, .002);
        rx = w / 2 - .06; zf = Math.min(d / 2 - .02, zr[1] - .005);
      }
      // laci atas (di kiri-kanan bila ada flip-top)
      var lw = Math.min(.42, w * .36), slots = [];
      if (flip) { if (nd === 1) slots.push([lw / 2 + .01, rx]); if (nd === 2) { slots.push([-rx, -lw / 2 - .01]); slots.push([lw / 2 + .01, rx]); } }
      else for (var i2 = 0; i2 < nd; i2++) slots.push([-rx + 2 * rx * i2 / nd, -rx + 2 * rx * (i2 + 1) / nd]);
      slots.forEach(function (sl, j) { drawer(root, (sl[0] + sl[1]) / 2, under - ah / 2, sl[1] - sl[0], ah - .012, zf, 1, Math.min(.36, d - .1), { handle: 'knob', lock: has('lock') && j === 0 && mount !== 'pedestal', jewel: has('jewelry') && j === 0 && mount !== 'pedestal' }); });
      if (flip) {
        var hz = -d * .42, ld = d * .8;
        box(root, lw - .02, .002, ld - .02, dark('#2a2420'), 0, h + .0008, hz + ld / 2, 0);
        [-1, 0, 1].forEach(function (e) { box(root, .006, .002, ld - .04, inner, e * lw * .2, h + .002, hz + ld / 2, 0); });
        var P = group(root, 0, hz); P.position.y = h;
        box(P, lw, .012, ld, topM, 0, .006, ld / 2, .003); box(P, lw - .04, .003, ld - .04, mirrorM(), 0, -.0016, ld / 2, .001);
        motion(P, 'flip', function (v) { P.rotation.x = -1.75 * v; });
      }
      // cermin
      var mk = c.mirror || 'none', mw = Math.min(w * .55, .62);
      if (mk !== 'none') { if (mount === 'wall' || flip) mirrorUnit(mk, -d / 2 - .02, h + .1, mw, false); else mirrorUnit(mk, -d / 2 + .07, h, mk === 'trifold' ? Math.min(w * .7, .8) : mk === 'hollywood' ? Math.min(w * .7, .75) : mw, true); }
      if (has('led')) { var lg = box(root, rx * 1.6, .006, .008, glow(), 0, under - ah - .004, zf - .04, 0); lg.castShadow = false; }
      if (has('socket')) box(root, .16, .004, .05, dark('#2a2522'), w * .32, h + .002, -d / 2 + .08, .002);
      // stool
      var st = c.stool || 'none';
      if (st !== 'none') {
        var sw2 = (X.find(X.CATS.filter(function (q) { return q.id === 'meja'; })[0].subs.filter(function (q) { return q.id === 'vanity'; })[0].groups.filter(function (g) { return g.id === 'stoolC'; })[0].opts, c.stoolC) || { hex: '#e6dfd2' }).hex;
        var fab = fabric(sw2, 'boucle'), zS = d / 2 + (st === 'bench' ? .26 : .3), FM = METAL();
        if (st === 'round') {
          mesh(XP.lathe([[0, .37], [.17, .37], [.19, .385], [.198, .41], [.192, .44], [.17, .46], [0, .462]], 40), fab, root).position.z = zS;
          for (var q = 0; q < 4; q++) { var a = q * PI / 2 + PI / 4; taper(root, [Math.cos(a) * .16, 0, zS + Math.sin(a) * .16], [Math.cos(a) * .12, .372, zS + Math.sin(a) * .12], .006, .009, FM); }
        } else {
          cushion(root, .7, .1, .36, fab, 0, .42, zS, { r: .03, cr: .008 });
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q2) { taper(root, [q2[0] * .3, 0, zS + q2[1] * .14], [q2[0] * .29, .372, zS + q2[1] * .13], .007, .011, FM); });
        }
      }
      void pts;
    }

    ({ dining: dining, coffee: coffee, side: side, nesting: nesting, console: consoleT, counter: counter, bar: barT, desk: desk, office: office, executive: executive, reception: reception, vanity: vanity }[s] || dining)();
  };
})();
