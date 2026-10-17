/* ==========================================================================
   Maison XIONCO v5 — XPARTS: pustaka komponen parametrik untuk kursi & sofa
   Semua bentuk dibangun ulang secara prosedural (lathe / sweep / loft / 9-slice /
   permukaan quilt). Proporsi & profil diukur dari referensi lokal (hanya angka
   & rasio — tidak ada mesh, tekstur atau normal map referensi yang dipakai).
   Satu-satunya aset pihak ketiga: Poly Haven "throw_pillows_01" (CC0) untuk
   bantal hias, dimuat async; sampai termuat dipakai bantal prosedural.
   Satuan meter, Y ke atas, depan +Z. Three.js r147 (window.THREE).
   ========================================================================== */
(function () {
  'use strict';
  var T = function () { return window.THREE; };

  /* ------------------------------------------------------------ cache geometri (sisi CPU) */
  var GEO = {}, GEOK = [];
  function cached(key, make) {
    var g = GEO[key]; if (g) return g;
    g = make(); GEO[key] = g; GEOK.push(key);
    if (GEOK.length > 500) { var k = GEOK.shift(), old = GEO[k]; delete GEO[k]; if (old && old.dispose) old.dispose(); }
    return g;
  }
  function fx(v) { return typeof v === 'number' ? v.toFixed(4) : String(v); }
  function key() { return Array.prototype.map.call(arguments, fx).join(','); }

  /* ------------------------------------------------------------ util geometri */
  function bufGeo(pos, idx, uv, nrm) {
    var g = new (T().BufferGeometry)();
    g.setAttribute('position', new (T().Float32BufferAttribute)(pos, 3));
    if (uv) g.setAttribute('uv', new (T().Float32BufferAttribute)(uv, 2));
    if (idx) g.setIndex(idx);
    if (nrm) g.setAttribute('normal', new (T().Float32BufferAttribute)(nrm, 3)); else g.computeVertexNormals();
    return g;
  }
  // gabungkan geometri (posisi, normal, uv) menjadi satu — satu draw call per material
  function merge(list) {
    var pos = [], nrm = [], uv = [], idx = [], off = 0;
    list.forEach(function (g) {
      if (!g) return;
      if (!g.attributes.normal) g.computeVertexNormals();
      var P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv ? g.attributes.uv.array : null, n = P.length / 3, i;
      for (i = 0; i < P.length; i++) { pos.push(P[i]); nrm.push(N[i]); }
      for (i = 0; i < n; i++) { uv.push(U ? U[i * 2] : 0, U ? U[i * 2 + 1] : 0); }
      if (g.index) { var I = g.index.array; for (i = 0; i < I.length; i++) idx.push(I[i] + off); }
      else for (i = 0; i < n; i++) idx.push(i + off);
      off += n;
    });
    return bufGeo(pos, idx, uv, nrm);
  }
  function xf(g, m) { g.applyMatrix4(m); return g; }
  // geser (shear) agar penampang horizontal tetap horizontal: kaki miring tetap rata di lantai & di bawah badan
  function shear(g, kx, kz) {
    var P = g.attributes.position;
    for (var i = 0; i < P.count; i++) { var y = P.getY(i); P.setX(i, P.getX(i) + kx * y); P.setZ(i, P.getZ(i) + kz * y); }
    P.needsUpdate = true; g.computeVertexNormals(); return g;
  }

  /* ------------------------------------------------------------ LATHE dengan profil [[r, y]...] (bawah → atas) */
  function lathe(prof, seg) {
    var pts = prof.map(function (q) { return new (T().Vector2)(Math.max(1e-4, q[0]), q[1]); });
    var g = new (T().LatheGeometry)(pts, seg || 24);
    // UV dalam meter: u = keliling, v = panjang profil (serat kayu searah tinggi)
    var uv = g.attributes.uv, P = g.attributes.position, acc = [0], i;
    for (i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
    var np = pts.length;
    for (i = 0; i < uv.count; i++) { var j = i % np; uv.setXY(i, uv.getX(i) * 2 * Math.PI * .03, acc[j]); }
    return g;
  }
  // profil bubut dengan detail dalam cm tetap: bagian "neck" meregang mengikuti tinggi
  // spec: [[r_cm, dy_cm | 'neck'] ...] dari bawah; neck = sisa tinggi
  function turnProfile(spec, h) {
    var fixed = 0, nn = 0; spec.forEach(function (s) { if (s[1] === 'n') nn++; else fixed += s[1]; });
    var neck = Math.max(.2, (h * 100 - fixed) / Math.max(1, nn)), y = 0, out = [[0, 0]];
    spec.forEach(function (s, i) { var dy = s[1] === 'n' ? neck : s[1]; if (i === 0) { out.push([s[0] / 100, 0]); } y += dy; out.push([s[2] != null ? s[2] / 100 : s[0] / 100, y / 100]); });
    var sc = h / (y / 100);   // skala kecil bila tinggi < bagian tetap
    out.forEach(function (q) { q[1] *= sc; });
    out.push([0, h]);
    return out;
  }
  // bevel kecil pada profil silinder: [[r,y]...] tepi bulat
  function roundCyl(rb, rt, h, e, n) {
    e = Math.min(e, h / 3, rb / 2, rt / 2); n = n || 3; var o = [[0, 0]], i;
    for (i = 0; i <= n; i++) { var a = i / n * Math.PI / 2; o.push([rb - e + Math.sin(a) * e, e - Math.cos(a) * e]); }
    for (i = 0; i <= n; i++) { var b = i / n * Math.PI / 2; o.push([rt - e + Math.cos(b) * e, h - e + Math.sin(b) * e]); }
    o.push([0, h]); return o;
  }

  /* ------------------------------------------------------------ KAKI
     legGeo(type, h, o) → { geo, cap (bagian kuningan / roda, opsional), rTop, rBot }
     sumbu kaki di x = z = 0, dari y = 0 (lantai) sampai y = h. o.cap: 'brass' | 'castor' */
  var LEG = {
    // tapered kayu: Ø atas 4.4 cm → Ø bawah 2.4 cm (sofa/30, armchair/03)
    tapered: function (h, o) { var rt = (o.rTop || .022), rb = (o.rBot || .012); return lathe(roundCyl(rb, rt, h, .002, 2), 20); },
    // splay mid-century (sofa/43): Ø 4.6 → 3.2 cm, kemiringan lewat shear
    splay: function (h, o) { return lathe(roundCyl(o.rBot || .015, o.rTop || .021, h, .002, 2), 20); },
    // bubut klasik: kerah, cove, manik, leher meruncing, manik kecil, kaki (sofa/42, 24, 07)
    turned: function (h) {
      var s = [[1.45, .6, 1.5], [1.5, .8, 1.25], [1.25, 'n', 1.75], [1.75, .9, 2.05], [2.05, .7, 1.7], [1.7, 1.4, 2.25], [2.25, .9, 2.35], [2.35, 1.6, 2.35], [2.35, .5, 2.0]];
      return lathe(turnProfile(s, h), 24);
    },
    // bun: bola terpotong rata di atas (ottoman/11: h ≈ Ø)
    bun: function (h, o) {
      var R = Math.min(.065, Math.max(.035, Math.min(h * .55, o.r || h * .55))), a0 = -Math.acos(.35), dy = R + R * Math.sin(a0), p = [[0, 0]], i, top = Math.min(h, R * 1.75);
      for (i = 0; i <= 14; i++) { var a = a0 + (Math.PI * .5 - a0) * i / 14, y = R + R * Math.sin(a) - dy, r = Math.cos(a) * R; if (y > top - .004) break; p.push([r, y]); }
      var last = p[p.length - 1]; p.push([Math.min(last[0], R * .6), top]);
      if (h > top + .004) { p.push([R * .42, top + .004]); p.push([R * .38, h - .004]); p.push([R * .46, h]); }
      p.push([0, h]);
      return lathe(p, 24);
    },
    // silinder tebal (bench/01: Ø 9 cm) — tepi bulat 4 mm
    cylinder: function (h, o) { var r = o.r || .035; return lathe(roundCyl(r, r, h, .004, 3), 28); },
    // kerucut logam + pelat atas (ottoman/25, sofa/25)
    conic: function (h, o) { var rt = o.rTop || .014, rb = o.rBot || .0055; return lathe([[0, 0], [rb, 0], [rb + .0004, .002], [rt, h - .006], [rt + .006, h - .005], [rt + .006, h], [0, h]], 20); },
    // pin / stiletto
    pin: function (h) { return lathe(roundCyl(.0065, .0075, h, .0015, 2), 14); }
  };
  function legGeo(type, h, o) {
    o = o || {};
    return cached(key('leg', type, h, o.rTop || 0, o.rBot || 0, o.r || 0), function () { return (LEG[type] || LEG.tapered)(h, o); });
  }
  // jari-jari profil kaki pada ketinggian relatif (untuk ferrule)
  function legRadiusAt(type, h, y, o) {
    o = o || {};
    if (type === 'conic') { var rt = o.rTop || .014, rb = o.rBot || .0055; return rb + (rt - rb) * y / Math.max(.01, h - .006); }
    if (type === 'tapered' || type === 'splay') { var a = o.rTop || (type === 'splay' ? .021 : .022), b = o.rBot || (type === 'splay' ? .015 : .012); return b + (a - b) * y / h; }
    if (type === 'turned') return .0235;
    if (type === 'cylinder') return o.r || .035;
    if (type === 'pin') return .007;
    return o.r || .02;
  }
  // sepatu kuningan (ferrule) setinggi hc, pas di luar kaki
  function capGeo(type, h, hc, o) {
    return cached(key('cap', type, h, hc, (o && o.rTop) || 0, (o && o.rBot) || 0), function () {
      var r0 = legRadiusAt(type, h, 0, o) + .0012, r1 = legRadiusAt(type, h, hc, o) + .0012;
      return lathe([[0, 0], [r0, 0], [r0 + .0008, .001], [r1 + .0004, hc - .002], [r1 + .0012, hc - .0012], [r1 - .0004, hc], [0, hc]], 20);
    });
  }
  // roda kuningan: pelat, rumah putar, garpu, roda — tinggi total hc (±5 cm)
  function castorGeo(hc) {
    return cached(key('castor', hc), function () {
      var M = T().Matrix4, wr = Math.min(.022, hc * .42), parts = [];
      parts.push(lathe(roundCyl(.017, .017, .006, .0015, 2), 16).translate(0, hc - .006, 0));      // pelat atas
      parts.push(lathe(roundCyl(.011, .013, hc - .006 - wr * 1.2, .002, 2), 16).translate(0, wr * 1.2, 0));   // rumah putar
      [-1, 1].forEach(function (s) { var f = new (T().BoxGeometry)(.003, wr * 1.5, wr * 1.5); f.translate(s * .0115, wr * .95, -.006); parts.push(f); });
      var wh = new (T().CylinderGeometry)(wr, wr, .016, 18); wh.rotateZ(Math.PI / 2); wh.translate(0, wr, -.006); parts.push(wh);
      var ax = new (T().CylinderGeometry)(.003, .003, .028, 8); ax.rotateZ(Math.PI / 2); ax.translate(0, wr, -.006); parts.push(ax);
      return merge(parts);
    });
  }

  /* ------------------------------------------------------------ BATANG / RANGKA */
  // batang berpenampang persegi membulat dari a ke b (lebar w, tebal t, radius r), boleh meruncing (w1,t1 di b)
  // up: vektor acuan orientasi sisi "tebal" (default Y, atau Z bila batang tegak)
  function bar(a, b, w, t, r, o) {
    o = o || {};
    return cached(key('bar', a[0], a[1], a[2], b[0], b[1], b[2], w, t, r, o.w1 || 0, o.t1 || 0, (o.up || [0, 0, 0]).join('/'), o.cap ? 1 : 0), function () {
      var V = T().Vector3, A = new V(a[0], a[1], a[2]), B = new V(b[0], b[1], b[2]), d = B.clone().sub(A), L = d.length(); d.normalize();
      var up = o.up ? new V(o.up[0], o.up[1], o.up[2]) : (Math.abs(d.y) > .9 ? new V(0, 0, 1) : new V(0, 1, 0));
      var s = new V().crossVectors(d, up).normalize(), u = new V().crossVectors(s, d).normalize();
      var sec = rrectPts(1, 1, 0, 3);   // satuan; di-skala per ujung
      var rings = [[A, w, t], [B, o.w1 || w, o.t1 || t]], pos = [], uv = [], idx = [], n = 0, i, j;
      var secAt = function (W, Tt) { var rr = Math.min(r, W / 2 - .0005, Tt / 2 - .0005); return rrectPts(W, Tt, Math.max(0, rr), 3); };
      var ringPts = rings.map(function (R) { return secAt(R[1], R[2]); });
      n = ringPts[0].length;
      rings.forEach(function (R, k) { var P = ringPts[k], vv = k ? L : 0, acc = 0; for (i = 0; i <= n; i++) { var q = P[i % n]; if (i) acc += Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]); var X = R[0].x + s.x * q[0] + u.x * q[1], Y = R[0].y + s.y * q[0] + u.y * q[1], Z = R[0].z + s.z * q[0] + u.z * q[1]; pos.push(X, Y, Z); uv.push(acc, vv); } });
      for (i = 0; i < n; i++) idx.push(i, i + n + 1, i + 1, i + 1, i + n + 1, i + n + 2);
      var body = bufGeo(pos, idx, uv);
      // tutup ujung (datar)
      var caps = rings.map(function (R, k) {
        var P = ringPts[k], cp = [], cu = [], ci = [], c0 = R[0]; cp.push(c0.x, c0.y, c0.z); cu.push(0, 0);
        P.forEach(function (q) { cp.push(c0.x + s.x * q[0] + u.x * q[1], c0.y + s.y * q[0] + u.y * q[1], c0.z + s.z * q[0] + u.z * q[1]); cu.push(q[0], q[1]); });
        for (j = 1; j <= n; j++) { var j2 = j % n + 1; if (k) ci.push(0, j2, j); else ci.push(0, j, j2); }
        return bufGeo(cp, ci, cu);
      });
      return merge([body, caps[0], caps[1]]);
    });
  }
  // titik persegi membulat (berlawanan jarum jam), pusat 0
  function rrectPts(w, h, r, seg) {
    var o = [], hw = w / 2, hh = h / 2, c = [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, Math.PI * 1.5]];
    c.forEach(function (q) { for (var i = 0; i <= seg; i++) { var a = q[2] + i / seg * Math.PI / 2; o.push([q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r]); } });
    return o;
  }
  // SWEEP penampang 2D (tertutup, [[a,b]...]) sepanjang jalur 3D; up = acuan orientasi (vektor tetap)
  function sweep(sec, path, up, o) {
    o = o || {};
    var V = T().Vector3, n = sec.length, m = path.length, pos = [], uv = [], idx = [], i, j, U = new V(up[0], up[1], up[2]).normalize();
    var acc = 0, frames = [];
    for (i = 0; i < m; i++) {
      var p = new V(path[i][0], path[i][1], path[i][2]), a = path[Math.max(0, i - 1)], b = path[Math.min(m - 1, i + 1)];
      var t = new V(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(), s = new V().crossVectors(t, U).normalize(), u = new V().crossVectors(s, t).normalize();
      var sc = o.scale ? o.scale(i / (m - 1)) : 1;
      if (i) acc += p.distanceTo(new V(path[i - 1][0], path[i - 1][1], path[i - 1][2]));
      frames.push([p, s, u, sc]);
      var la = 0;
      for (j = 0; j <= n; j++) { var q = sec[j % n]; if (j) la += Math.hypot(q[0] - sec[j - 1][0], q[1] - sec[j - 1][1]); pos.push(p.x + (s.x * q[0] + u.x * q[1]) * sc, p.y + (s.y * q[0] + u.y * q[1]) * sc, p.z + (s.z * q[0] + u.z * q[1]) * sc); uv.push(la, acc); }
    }
    for (i = 0; i < m - 1; i++) for (j = 0; j < n; j++) { var k0 = i * (n + 1) + j, k1 = k0 + n + 1; idx.push(k0, k1, k0 + 1, k0 + 1, k1, k1 + 1); }
    var g = bufGeo(pos, idx, uv);
    if (o.flip) { var I = g.index.array; for (i = 0; i < I.length; i += 3) { var tmp = I[i]; I[i] = I[i + 1]; I[i + 1] = tmp; } g.computeVertexNormals(); }
    if (o.caps === false) return g;
    var caps = [0, m - 1].map(function (fi, k) {
      var F = frames[fi], cp = [F[0].x, F[0].y, F[0].z], cu = [0, 0], ci = [];
      sec.forEach(function (q) { cp.push(F[0].x + (F[1].x * q[0] + F[2].x * q[1]) * F[3], F[0].y + (F[1].y * q[0] + F[2].y * q[1]) * F[3], F[0].z + (F[1].z * q[0] + F[2].z * q[1]) * F[3]); cu.push(q[0], q[1]); });
      for (j = 1; j <= n; j++) { var j2 = j % n + 1; if (k ^ (o.flip ? 1 : 0)) ci.push(0, j2, j); else ci.push(0, j, j2); }
      return bufGeo(cp, ci, cu);
    });
    return merge([g, caps[0], caps[1]]);
  }
  // polyline dengan sudut membulat (fillet radius r) — 3D
  function fillet(pts, r, seg) {
    seg = seg || 6; var V = T().Vector3, out = [pts[0]], i;
    for (i = 1; i < pts.length - 1; i++) {
      var P = new V().fromArray(pts[i]), A = new V().fromArray(pts[i - 1]), B = new V().fromArray(pts[i + 1]);
      var da = A.clone().sub(P), db = B.clone().sub(P), la = da.length(), lb = db.length(); da.normalize(); db.normalize();
      var rr = Math.min(r, la * .45, lb * .45), p0 = P.clone().addScaledVector(da, rr), p1 = P.clone().addScaledVector(db, rr);
      for (var k = 0; k <= seg; k++) { var t = k / seg, q = p0.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(P, 2 * t * (1 - t)).addScaledVector(p1, t * t); out.push(q.toArray()); }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function circlePts(r, n) { var o = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; }
  // tabung bulat sepanjang jalur (fillet otomatis), ujung bulat opsional
  function tube(path, r, o) {
    o = o || {};
    return cached(key('tube', JSON.stringify(path), r, o.fil || 0, o.up ? o.up.join('/') : '', o.n || 0), function () {
      var p = o.fil ? fillet(path, o.fil, 8) : path;
      // jalur tegak murni: acuan up Z
      var up = o.up || [0, 1, 0], d0 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], L = Math.hypot(d0[0], d0[1], d0[2]) || 1;
      if (!o.up && Math.abs(d0[1] / L) > .95) up = [0, 0, 1];
      return sweep(circlePts(r, o.n || 12), p, up);
    });
  }
  // busur 3D di bidang yang direntang u & v dari pusat c: c + u*cos + v*sin
  function arcPts(c, R, a0, a1, n, u, v) { var o = []; u = u || [1, 0, 0]; v = v || [0, 1, 0]; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n, ca = Math.cos(a) * R, sa = Math.sin(a) * R; o.push([c[0] + u[0] * ca + v[0] * sa, c[1] + u[1] * ca + v[1] * sa, c[2] + u[2] * ca + v[2] * sa]); } return o; }

  /* ------------------------------------------------------------ LOFT sepanjang X: profil tertutup [[z,y]...] per x (jumlah titik tetap) */
  function loftX(xs, profAt, o) {
    o = o || {};
    var pr0 = profAt(xs[0]), n = pr0.length, pos = [], uv = [], idx = [], i, j, profs = [];
    for (i = 0; i < xs.length; i++) {
      var pr = i ? profAt(xs[i]) : pr0, la = 0; profs.push(pr);
      for (j = 0; j <= n; j++) { var q = pr[j % n]; if (j) la += Math.hypot(q[0] - pr[j - 1][0], q[1] - pr[j - 1][1]); pos.push(xs[i], q[1], q[0]); uv.push(xs[i], la); }
    }
    for (i = 0; i < xs.length - 1; i++) for (j = 0; j < n; j++) { var k0 = i * (n + 1) + j, k1 = k0 + n + 1; idx.push(k0, k0 + 1, k1, k0 + 1, k1 + 1, k1); }
    var body = bufGeo(pos, idx, uv), parts = [body];
    if (o.caps !== false) [0, xs.length - 1].forEach(function (fi, k) {
      var pr = profs[fi], sh = pr.map(function (q) { return new (T().Vector2)(q[0], q[1]); });
      var tris = T().ShapeUtils.triangulateShape(sh, []), cp = [], cu = [], ci = [];
      pr.forEach(function (q) { cp.push(xs[fi], q[1], q[0]); cu.push(q[0], q[1]); });
      var cw = T().ShapeUtils.isClockWise(sh);
      tris.forEach(function (t) { if ((k === 0) !== cw) ci.push(t[0], t[2], t[1]); else ci.push(t[0], t[1], t[2]); });
      parts.push(bufGeo(cp, ci, cu));
    });
    var g = merge(parts);
    if (o.check) fixOut(g, o.check);
    return g;
  }
  // pastikan arah segitiga menghadap keluar (uji satu titik acuan dalam)
  function fixOut(g, inside) {
    var P = g.attributes.position, N = g.attributes.normal, s = 0;
    for (var i = 0; i < P.count; i += 7) s += (P.getX(i) - inside[0]) * N.getX(i) + (P.getY(i) - inside[1]) * N.getY(i) + (P.getZ(i) - inside[2]) * N.getZ(i);
    if (s < 0) { var I = g.index.array; for (i = 0; i < I.length; i += 3) { var t = I[i]; I[i] = I[i + 1]; I[i + 1] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    return g;
  }

  /* ------------------------------------------------------------ BANTAL 9-SLICE (radius tepi & crown tetap dalam cm, tengah direntang)
     o: { r, cr (crown atas), both, bu (gembung samping), sag, wr (kerut), tuft: {pat, pitch, pitchZ, proud} } */
  function weldNormals(geo, nx, ny, nz) {
    geo.computeVertexNormals();
    var P = geo.attributes.position.array, N = geo.attributes.normal.array, map = new Map(), base = 0;
    [[nz, ny], [nz, ny], [nx, nz], [nx, nz], [nx, ny], [nx, ny]].forEach(function (gd) {
      var gx = gd[0], gy = gd[1];
      for (var iy = 0; iy <= gy; iy++) for (var ix = 0; ix <= gx; ix++) {
        if (ix && iy && ix < gx && iy < gy) continue;
        var v = (base + iy * (gx + 1) + ix) * 3, k = Math.round(P[v] * 2e4) * 73856093 ^ Math.round(P[v + 1] * 2e4) * 19349663 ^ Math.round(P[v + 2] * 2e4) * 83492791;
        var l = map.get(k); if (!l) map.set(k, l = []); l.push(v);
      }
      base += (gx + 1) * (gy + 1);
    });
    map.forEach(function (l) {
      if (l.length < 2) return;
      var x = 0, y = 0, z = 0, j, a = l[0];
      for (j = 0; j < l.length; j++) { var b = l[j]; if (Math.abs(P[a] - P[b]) + Math.abs(P[a + 1] - P[b + 1]) + Math.abs(P[a + 2] - P[b + 2]) > 2e-4) continue; x += N[b]; y += N[b + 1]; z += N[b + 2]; }
      var L = Math.sqrt(x * x + y * y + z * z) || 1;
      for (j = 0; j < l.length; j++) { var c2 = l[j]; if (Math.abs(P[a] - P[c2]) + Math.abs(P[a + 1] - P[c2 + 1]) + Math.abs(P[a + 2] - P[c2 + 2]) > 2e-4) continue; N[c2] = x / L; N[c2 + 1] = y / L; N[c2 + 2] = z / L; }
    });
  }
  // sampel posisi dalam sel tufting: rapat di dekat jahitan agar lipatan tajam
  var CHT = [0, .03, .08, .16, .27, .39, .5, .61, .73, .84, .92, .97];
  var UNI = { diamond: [0, .125, .25, .375, .5, .625, .75, .875], button: [0, .25, .5, .75], pleat: [0, .25, .5, .75] };
  function cellSamples(len, pitch, uni) { var n = Math.max(1, Math.round(len / pitch)), s = [], L = uni ? (UNI[uni] || UNI.diamond) : CHT; for (var c = 0; c < n; c++) for (var k = 0; k < L.length; k++) s.push((c + L[k]) / n); s.push(1); return { n: n, s: s }; }
  function cushGeo(w, h, d, o) {
    o = o || {};
    var r = Math.max(.004, Math.min(o.r == null ? .03 : o.r, w / 2 - .002, h / 2 - .002, d / 2 - .002)), E = 3, tf = o.tuft;
    var sx = null, sz = null;
    if (tf) {
      var uniX = tf.pat === 'diamond' || tf.pat === 'button' ? tf.pat : null, uniZ = uniX;
      sx =(tf.pat === 'chanX') ? { n: 1, s: lin(Math.max(2, Math.min(12, Math.round(w / .08)))) } : cellSamples(w - 2 * r, tf.pitch, uniX);
      sz = (tf.pat === 'chanZ') ? { n: 1, s: lin(Math.max(2, Math.min(12, Math.round(d / .08)))) } : cellSamples(d - 2 * r, tf.pitchZ || tf.pitch, uniZ);
    }
    var nx = 2 * E + (sx ? sx.s.length - 1 : Math.max(2, Math.min(12, Math.round(w / .08)))), ny = 2 * E + Math.max(1, Math.min(4, Math.round(h / .06))), nz = 2 * E + (sz ? sz.s.length - 1 : Math.max(2, Math.min(12, Math.round(d / .08))));
    var geo = new (T().BoxGeometry)(w, h, d, nx, ny, nz), P = geo.attributes.position.array;
    var A = w / 2, B = h / 2, C = d / 2, ia = A - r, ib = B - r, ic = C - r;
    function remap(v, half, n, S) {
      var i = Math.round((v + half) / (2 * half) * n);
      if (i <= E) return -(half - r) - r * Math.cos(i / E * Math.PI / 2);
      if (i >= n - E) return (half - r) + r * Math.cos((n - i) / E * Math.PI / 2);
      var t = S ? S[i - E] : (i - E) / (n - 2 * E);
      return -half + r + (2 * half - 2 * r) * t;
    }
    function proj(x, y, z) {
      var cx = Math.max(-ia, Math.min(ia, x)), cy = Math.max(-ib, Math.min(ib, y)), cz = Math.max(-ic, Math.min(ic, z));
      var dx = x - cx, dy = y - cy, dz = z - cz, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (L > 1e-7) { x = cx + dx / L * r; y = cy + dy / L * r; z = cz + dz / L * r; }
      return [x, y, z];
    }
    function def(x, y, z) {
      var ux = x / A, uz = z / C, vy = (y + B) / (2 * B), f = Math.max(0, 1 - ux * ux) * Math.max(0, 1 - uz * uz);
      var sv = o.both ? 2 * vy - 1 : vy;
      y += (o.cr || 0) * f * sv;
      if (o.sag) y -= o.sag * Math.exp(-(ux * ux * 3 + (uz - .25) * (uz - .25) * 4)) * vy;
      if (o.wr) y += o.wr * Math.sin(ux * 9 + 1.3) * Math.sin(uz * 6 + .4) * f * vy;
      if (o.bu) { var mid = 1 - (2 * vy - 1) * (2 * vy - 1); x *= 1 + o.bu / A * mid * Math.sqrt(Math.max(0, 1 - uz * uz)); z *= 1 + o.bu / C * mid * Math.sqrt(Math.max(0, 1 - ux * ux)); }
      return [x, y, z];
    }
    var pat = tf ? pattern(tf.pat, tf.pitch, tf.pitchZ) : null, x0 = -A + r, z0 = -C + r, wIn = 2 * A - 2 * r, dIn = 2 * C - 2 * r;
    for (var k = 0; k < P.length; k += 3) {
      var top = P[k + 1] > B - 1e-6;
      var q = proj(remap(P[k], A, nx, sx && sx.s), remap(P[k + 1], B, ny), remap(P[k + 2], C, nz, sz && sz.s));
      var bx = q[0], bz = q[2];
      q = def(q[0], q[1], q[2]);
      if (pat && top) {
        // hanya muka atas; memudar ke tepi gulung
        var ex = Math.max(0, Math.min(1, (ia - Math.abs(bx)) / .004 + 1)), ez = Math.max(0, Math.min(1, (ic - Math.abs(bz)) / .004 + 1)), wt = Math.min(ex, ez);
        if (pat.chan === 'x' || tf.pat === 'chanX') wt = ez; else if (tf.pat === 'chanZ') wt = ex;
        var hv = pat.h(bx - x0, bz - z0, wIn, dIn);
        q[1] -= tf.proud * (1 - hv) * Math.max(0, wt);
      }
      P[k] = q[0]; P[k + 1] = q[1]; P[k + 2] = q[2];
    }
    weldNormals(geo, nx, ny, nz);
    var ud = { A: A, B: B, C: C, r: r, surf: function (x, y, z) { var p = proj(x, y, z); return def(p[0], p[1], p[2]); } };
    if (pat && pat.btn) ud.buttons = pat.btn(wIn, dIn).map(function (b) { var s = ud.surf(b[0] + x0, B, b[1] + z0); return [s[0], s[1] - tf.proud * (1 - pat.h(b[0], b[1], wIn, dIn)), s[2]]; });
    geo.userData = ud;
    return geo;
  }
  function lin(n) { var s = []; for (var i = 0; i <= n; i++) s.push(i / n); return s; }

  /* ------------------------------------------------------------ POLA TUFTING (prosedural)
     h(x, y, W, L) ∈ [0,1]: 1 = puncak, 0 = jahitan/kancing; x melintang, y memanjang (meter, dari sudut).
     btn(W, L) → titik kancing [[x,y]...] */
  function pattern(name, pitch, pitchY) {
    var py = pitchY || pitch;
    var sn = function (t) { return Math.pow(Math.max(0, Math.sin(Math.PI * t)), .5); };
    var cellT = function (x, len, p) { var n = Math.max(1, Math.round(len / p)), f = x / len * n; return f - Math.floor(Math.min(n - 1e-9, Math.max(0, f))); };
    if (name === 'chanZ' || name === 'channelV' || name === 'channel') return { h: function (x, y, W) { return sn(cellT(x, W, pitch)); } };
    if (name === 'chanX' || name === 'channelH') return { chan: 'x', h: function (x, y, W, L) { return sn(cellT(y, L, py)); } };
    if (name === 'biscuit') return { h: function (x, y, W, L) { return Math.pow(Math.max(0, Math.sin(Math.PI * cellT(x, W, pitch)) * Math.sin(Math.PI * cellT(y, L, py))), .42); } };
    if (name === 'button') {   // kancing dangkal: grid berselang, lekukan kecil + lipatan diagonal pendek
      var lat = function (W, L) {
        var nx = Math.max(1, Math.round(W / pitch)), ny = Math.max(1, Math.round(L / py)), o = [], i, j;
        for (j = 0; j < ny; j++) { var y = L * (j + .5) / ny; if (j % 2) for (i = 1; i < nx; i++) o.push([W * i / nx, y]); else for (i = 0; i < nx; i++) o.push([W * (i + .5) / nx, y]); }
        return o;
      };
      var memo = {};
      return { btn: lat, h: function (x, y, W, L) {
        var k = W.toFixed(3) + L.toFixed(3), B = memo[k] || (memo[k] = lat(W, L)), h = 1;
        for (var i = 0; i < B.length; i++) { var dx = x - B[i][0], dy = y - B[i][1]; if (Math.abs(dx) > .06 || Math.abs(dy) > .06) continue; var d2 = dx * dx + dy * dy; h -= Math.exp(-d2 / (.012 * .012)) * .9; var ad = Math.abs(Math.abs(dx) - Math.abs(dy)); if (d2 < .05 * .05) h -= Math.exp(-ad * ad / (.0035 * .0035)) * .35 * (1 - Math.sqrt(d2) / .05); }
        return Math.max(0, h);
      } };
    }
    if (name === 'pleat') return { h: function (x, y, W) { var t = cellT(x, W, pitch); return 1 - Math.abs(2 * t - 1); } };   // lipit tajam (ottoman/20)
    if (name === 'diamond') {   // Chesterfield: kisi berlian, lipatan diagonal di antara kancing
      return { btn: function (W, L) { var nx = Math.max(1, Math.round(W / pitch)), ny = Math.max(1, Math.round(L / py)), o = []; for (var k = 1; k < 2 * ny; k++) for (var i = 0; i <= nx; i++) { var bx = W * (i + (k % 2 ? .5 : 0)) / nx; if (bx < W * .04 || bx > W * .96) continue; o.push([bx, L * k / (2 * ny)]); } return o; },
        h: function (x, y, W, L) {
          var nx = Math.max(1, Math.round(W / pitch)), ny = Math.max(1, Math.round(L / py)), u = x / W * nx, v = y / L * ny;
          var a = (u + v) / 1, b = (u - v) / 1;   // sel berlian: garis u±v = bilangan bulat
          var fa = a - Math.floor(a), fb = b - Math.floor(b);
          var puff = Math.pow(Math.max(0, Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb)), .35);
          var ev = Math.min(1, Math.min(v, ny - v) * 2.2);   // tepi atas/bawah tanpa kancing: puff penuh
          return 1 - (1 - puff) * ev;
        } };
    }
    return { h: function () { return 1; } };
  }

  /* ------------------------------------------------------------ KULIT QUILT pada permukaan berparameter P(u,v), N(u,v)
     u ∈ [0,1] melintang (Wm meter), v ∈ [0,1] sepanjang jalur (Lm meter) */
  function quilt(P, N, Wm, Lm, patName, pitch, pitchY, proud, fade, nvMin) {
    var pat = pattern(patName, pitch, pitchY), uni = /^(diamond|button|pleat)$/.test(patName) ? patName : null;
    var su = patName === 'channelH' ? lin(Math.max(8, Math.round(Wm / .05))) : cellSamples(Wm, pitch, uni).s;
    var sv = patName === 'channelV' || patName === 'pleat' ? lin(Math.max(nvMin || 24, Math.round(Lm / .03))) : cellSamples(Lm, pitchY || pitch, uni).s;
    var cols = su.length, rows = sv.length, pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), idx = [], i, j, k = 0;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var u = su[i], v = sv[j], a = P(u, v), n = N(u, v), f = fade ? fade(v, u) : 1, hv = pat.h(u * Wm, v * Lm, Wm, Lm), off = .0015 + proud * hv * f;
      pos[k * 3] = a[0] + n[0] * off; pos[k * 3 + 1] = a[1] + n[1] * off; pos[k * 3 + 2] = a[2] + n[2] * off; uv[k * 2] = u * Wm; uv[k * 2 + 1] = v * Lm; k++;
    }
    for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) { var q = j * cols + i; idx.push(q, q + 1, q + cols, q + 1, q + cols + 1, q + cols); }
    var g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(pos, 3)); g.setAttribute('uv', new (T().BufferAttribute)(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    var mi = Math.floor(rows / 2) * cols + Math.floor(cols / 2), n0 = N(su[Math.floor(cols / 2)], sv[Math.floor(rows / 2)]), nn = g.attributes.normal;
    if (nn.getX(mi) * n0[0] + nn.getY(mi) * n0[1] + nn.getZ(mi) * n0[2] < 0) { for (i = 0; i < idx.length; i += 3) { var t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; } g.setIndex(idx); g.computeVertexNormals(); }
    var btns = [];
    if (pat.btn) pat.btn(Wm, Lm).forEach(function (b) { var u = b[0] / Wm, v = b[1] / Lm, f = fade ? fade(v, u) : 1; if (f < .5) return; var a = P(u, v), n = N(u, v), off = .0015 + proud * pat.h(b[0], b[1], Wm, Lm) * f; btns.push([a[0] + n[0] * off, a[1] + n[1] * off, a[2] + n[2] * off, n[0], n[1], n[2]]); });
    g.userData.buttons = btns;
    return g;
  }

  /* ------------------------------------------------------------ HARDWARE kecil (untuk InstancedMesh) */
  function buttonGeo(r) { return cached(key('btn', r), function () { return lathe([[0, 0], [r, .002], [r * .8, r * .35 + .002], [0, r * .52 + .002]], 7); }); }   // ±48 segitiga
  function nailGeo(r) { return cached(key('nail', r), function () { return lathe([[0, 0], [r, .0026], [r * .62, r * .6 + .002], [0, r * .72 + .002]], 6); }); }

  /* ------------------------------------------------------------ PROFIL LENGAN (penampang melintang, diekstrusi sepanjang kedalaman)
     u = jarak ke dalam dari muka luar (0 = luar, w = dalam), y absolut. bev = bevel ekstrusi. */
  function armProfile(style, w, ah, y0, bev) {
    var UV = [], i;
    if (style === 'rolled' || style === 'flared') {
      var fl = style === 'flared', R = fl ? .058 : .066, uc = R + bev, vc = ah - R - bev, uo = fl ? .062 : .03, ui = w - bev;
      var t0 = fl ? -.5 : -Math.acos(Math.min(1, (uc - uo) / R)), t1 = Math.PI * 1.1;
      UV.push([uo, y0 + bev]);
      for (i = 0; i <= 24; i++) { var t = t0 + (t1 - t0) * i / 24; UV.push([uc - R * Math.cos(t), vc + R * Math.sin(t)]); }
      var e0 = UV[UV.length - 1];
      for (i = 1; i <= 5; i++) { var s = i / 5; UV.push([(1 - s) * (1 - s) * e0[0] + 2 * s * (1 - s) * ui + s * s * ui, (1 - s) * (1 - s) * e0[1] + 2 * s * (1 - s) * (vc - .03) + s * s * (vc - .075)]); }
      UV.push([ui, y0 + bev]);
      return { pts: UV, R: R, uc: uc, vc: vc };
    }
    if (style === 'english') {   // English roll (sofa/42): batang ±8 cm, gulungan kecil R 4.5 cm sedikit keluar
      var Re = .042, uce = Re + bev, vce = ah - Re - bev, so = .016;   // badan mundur 1.6 cm dari muka luar, gulungan menutup sampai muka luar
      UV.push([so + bev * .2, y0 + bev]);
      UV.push([so + bev * .2, vce - Re * .7]);
      var ta = -Math.PI / 2 + .45, tb = Math.PI * 1.05;
      for (i = 0; i <= 22; i++) { var te = ta + (tb - ta) * i / 22; UV.push([uce - Re * Math.cos(te), vce + Re * Math.sin(te)]); }
      var ee = UV[UV.length - 1];
      for (i = 1; i <= 4; i++) { var se = i / 4; UV.push([ee[0] + (w - bev - ee[0]) * se, ee[1] - (.012 + .02 * se) * se]); }
      UV.push([w - bev, y0 + bev]);
      return { pts: UV, R: Re, uc: uce, vc: vce };
    }
    if (style === 'scroll') {    // scroll Chesterfield (sofa/31): gulungan besar keluar, Ø ±15 cm, setinggi sandaran
      var Rs = Math.min(.075, (ah - y0) * .22), ucs = Rs + bev, vcs = ah - Rs - bev, ws = Math.max(.05, w - bev - .03);   // badan lengan penuh; gulungan hanya menjorok ±3 cm ke luar
      var us0 = w - bev - ws;   // muka luar batang
      var cs = function (a) { return [ucs - Rs * Math.cos(a), vcs + Rs * Math.sin(a)]; };
      var aj = -Math.acos(Math.max(-1, Math.min(1, (ucs - us0) / Rs))), aE = Math.PI * .62;
      // sambungan batang → bawah gulungan dibulatkan (bevel ekstrusi tidak saling memotong)
      var yj = vcs + Rs * Math.sin(aj), a2 = aj + .45, P2 = cs(a2), P0 = [us0, yj - .03];
      UV.push([us0, y0 + bev]); UV.push(P0);
      for (i = 1; i < 6; i++) { var tt = i / 6; UV.push([(1 - tt) * (1 - tt) * P0[0] + 2 * tt * (1 - tt) * us0 + tt * tt * P2[0], (1 - tt) * (1 - tt) * P0[1] + 2 * tt * (1 - tt) * yj + tt * tt * P2[1]]); }
      for (i = 0; i <= 30; i++) UV.push(cs(a2 + (aE - a2) * i / 30));   // bawah gulungan → sisi luar → puncak
      var es = UV[UV.length - 1];
      for (i = 1; i <= 4; i++) { var ss = i / 4; UV.push([es[0] + (w - bev - es[0]) * ss, es[1] - (.004 + .03 * ss) * ss]); }
      UV.push([w - bev, y0 + bev]);
      return { pts: UV, R: Rs, uc: ucs, vc: vcs, spiral: true };
    }
    return null;
  }

  /* ------------------------------------------------------------ KURVA PUNCAK SANDARAN f(x) (x dari -L/2..L/2) */
  function backTop(style, L, Hb, o) {
    o = o || {};
    if (style === 'camel') { var amp = Math.min(.09, Math.max(.05, L * .03)); return function (x) { var t = x / (L / 2); return Hb - amp * (1 - Math.pow(Math.max(0, Math.cos(Math.min(1, Math.abs(t) / .9) * Math.PI / 2)), 1.4)); }; }   // satu punuk (sofa/26)
    if (style === 'wavy') { var ns = Math.max(1, o.n || Math.round(L / .65)), aw = .07; return function (x) { var t = (x + L / 2) / L * ns, f = t - Math.floor(Math.min(ns - 1e-9, t)); return Hb - aw * (1 - Math.pow(Math.sin(Math.PI * f), .7)); }; }   // satu busur per dudukan (sofa/38)
    if (style === 'scallop') { var nl = Math.max(3, o.lanes || Math.round(L / .155)), as = .045; return function (x) { var t = (x + L / 2) / L * nl, f = t - Math.floor(Math.min(nl - 1e-9, t)); var u2 = 2 * x / L; return Hb - as * (1 - Math.pow(Math.max(0, Math.sin(Math.PI * f)), .55)) - .055 * u2 * u2; }; }   // per lajur, kipas naik di tengah (sofa/45)
    if (style === 'sloping') { var drop = Math.min(.16, (Hb - (o.SH || .44)) * .4), sd = o.side || 1; return function (x) { var t = (x * sd + L / 2) / L; return Hb - drop * (1 - t) * (1 - t); }; }
    return function () { return Hb; };
  }

  /* ------------------------------------------------------------ BANTAL HIAS
     CC0 Poly Haven throw_pillows_01 (mesh "pillow02"): dinormalisasi ke kubus satuan, lalu diskalakan (S × Hs × Tk).
     Sebelum termuat: bantal prosedural (dua muka menggembung, tepi "telinga"). */
  var PIL = { state: 0, geo: null, back: null, cbs: [] };
  var PIL_URL = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/v5\/js\/parts\.js.*$/, 'assets/library/polyhaven/throw_pillows_01/'); } catch (e) {} return '../assets/library/polyhaven/throw_pillows_01/'; })();
  function loadPillow() {
    if (PIL.state) return PIL.p;
    PIL.state = 1;
    PIL.p = fetch(PIL_URL + 'throw_pillows_01_1k.gltf').then(function (r) { if (!r.ok) throw new Error('gltf ' + r.status); return r.json(); }).then(function (gl) {
      return fetch(PIL_URL + (gl.buffers[0].uri || 'throw_pillows_01.bin')).then(function (r) { if (!r.ok) throw new Error('bin ' + r.status); return r.arrayBuffer(); }).then(function (bin) {
        var node = gl.nodes.filter(function (n) { return /pillow02/.test(n.name); })[0] || gl.nodes[0], prim = gl.meshes[node.mesh].primitives[0];
        var acc = function (i) {
          var a = gl.accessors[i], bv = gl.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
          return new C(bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n);
        };
        var P = acc(prim.attributes.POSITION), N = acc(prim.attributes.NORMAL), I = acc(prim.indices), n = P.length / 3, i;
        // mesh lokal: x lebar, -z tinggi, y tebal → X, Y, Z
        var pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), mn = [9, 9, 9], mx = [-9, -9, -9];
        for (i = 0; i < n; i++) { var X = P[i * 3], Y = -P[i * 3 + 2], Z = P[i * 3 + 1]; pos[i * 3] = X; pos[i * 3 + 1] = Y; pos[i * 3 + 2] = Z; nrm[i * 3] = N[i * 3]; nrm[i * 3 + 1] = -N[i * 3 + 2]; nrm[i * 3 + 2] = N[i * 3 + 1]; mn = [Math.min(mn[0], X), Math.min(mn[1], Y), Math.min(mn[2], Z)]; mx = [Math.max(mx[0], X), Math.max(mx[1], Y), Math.max(mx[2], Z)]; }
        var c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], s = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
        for (i = 0; i < n; i++) for (var k = 0; k < 3; k++) pos[i * 3 + k] = (pos[i * 3 + k] - c[k]) / s[k];
        // kedalaman punggung (z minimum) pada grid 9×9 untuk menempelkan bantal ke sandaran tanpa menembus
        var G = 9, back = [], front = [];
        for (i = 0; i < G * G; i++) { back.push(.5); front.push(-.5); }
        for (i = 0; i < n; i++) { var gx = Math.min(G - 1, Math.floor((pos[i * 3] + .5) * G)), gy = Math.min(G - 1, Math.floor((pos[i * 3 + 1] + .5) * G)), q = gy * G + gx; back[q] = Math.min(back[q], pos[i * 3 + 2]); front[q] = Math.max(front[q], pos[i * 3 + 2]); }
        for (i = 0; i < G * G; i++) if (back[i] > .49) back[i] = -.05;   // sel kosong (sudut): anggap tipis
        var g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(pos, 3)); g.setAttribute('normal', new (T().BufferAttribute)(nrm, 3)); g.setIndex(new (T().BufferAttribute)(new Uint32Array(I), 1));
        PIL.geo = g; PIL.back = back; PIL.G = G; PIL.state = 2; PIL.aspect = s[2] / s[0];
        PIL.cbs.forEach(function (f) { try { f(); } catch (e) {} }); PIL.cbs = [];
        // bangun ulang model Customize yang sedang tampil agar memakai bantal asli
        if (api.lastPillows && window.XW && XW.kind && XW.kind() === 'custom' && api.lastCfg) try { XW.showCustom(api.lastCfg); } catch (e) {}
      });
    }).catch(function () { PIL.state = 3; });
    return PIL.p;
  }
  // bantal persegi / lumbar: S lebar, Hs tinggi, Tk tebal → geo (atas = +Y, depan = +Z), back(u,v) = kedalaman punggung (m, negatif)
  function pillow(S, Hs, Tk) {
    if (PIL.state === 0) loadPillow();
    if (PIL.state === 2) {
      var g = cached(key('pilcc0', S, Hs, Tk), function () { var c = PIL.geo.clone(); c.scale(S, Hs, Tk); c.computeBoundingBox(); return c; });
      return { geo: g, cc0: true, back: function (u, v) { var G = PIL.G, gx = Math.max(0, Math.min(G - 1, Math.floor((u * .5 + .5) * G))), gy = Math.max(0, Math.min(G - 1, Math.floor((v * .5 + .5) * G))); return PIL.back[gy * G + gx] * Tk; } };
    }
    var gp = cached(key('pilproc', S, Hs, Tk), function () {
      var n = 14, pos = [], uv = [], idx = [], i, j, sd;
      for (sd = 0; sd < 2; sd++) {
        var sg = sd ? -1 : 1, base = pos.length / 3;
        for (j = 0; j <= n; j++) for (i = 0; i <= n; i++) {
          var u = i / n * 2 - 1, v = j / n * 2 - 1, t = Tk * Math.pow(Math.max(0, 1 - u * u), .6) * Math.pow(Math.max(0, 1 - v * v), .6);
          pos.push(u * S / 2 * (1 - .035 * (1 - v * v)), v * Hs / 2 * (1 - .035 * (1 - u * u)), sg * t / 2); uv.push(u * S / 2, v * Hs / 2);
        }
        for (j = 0; j < n; j++) for (i = 0; i < n; i++) { var a = base + j * (n + 1) + i, b2 = a + 1, c2 = a + n + 1, d2 = c2 + 1; if (sg > 0) idx.push(a, b2, c2, b2, d2, c2); else idx.push(a, c2, b2, b2, c2, d2); }
      }
      return bufGeo(pos, idx, uv);
    });
    return { geo: gp, cc0: false, back: function (u, v) { return -Tk / 2 * Math.pow(Math.max(0, 1 - u * u), .6) * Math.pow(Math.max(0, 1 - v * v), .6); } };
  }
  // bolster silinder: Ø d, panjang L (sumbu X), ujung mengerut berlipit ke kancing tengah
  function bolsterGeo(d, L) {
    return cached(key('bolster', d, L), function () {
      var R = d / 2, nA = 28, pos = [], uv = [], idx = [], i, j, e = Math.min(R * .75, L * .12), prof = [], a;
      // ujung = kubah pipih yang mengerut berlipit ke kancing tengah; badan sedikit menggembung
      for (i = 0; i <= 8; i++) { a = i / 8; prof.push([-L / 2 + e * (1 - Math.cos(a * Math.PI / 2)), R * Math.sin(a * Math.PI / 2), 1 - a]); }
      for (i = 1; i < 12; i++) { var m = i / 12; prof.push([-L / 2 + e + (L - 2 * e) * m, R * (1 + .025 * Math.sin(m * Math.PI)), 0]); }
      for (i = 8; i >= 0; i--) { a = i / 8; prof.push([L / 2 - e * (1 - Math.cos(a * Math.PI / 2)), R * Math.sin(a * Math.PI / 2), 1 - a]); }
      for (i = 0; i < prof.length; i++) for (j = 0; j <= nA; j++) {
        var an = j / nA * Math.PI * 2, rr = prof[i][1] * (1 + prof[i][2] * .07 * Math.sin(an * 14));
        pos.push(prof[i][0], Math.cos(an) * rr, Math.sin(an) * rr); uv.push(an * R, prof[i][0]);
      }
      for (i = 0; i < prof.length - 1; i++) for (j = 0; j < nA; j++) { var k0 = i * (nA + 1) + j, k1 = k0 + nA + 1; idx.push(k0, k1, k0 + 1, k0 + 1, k1, k1 + 1); }
      var g = bufGeo(pos, idx, uv); fixOut(g, [0, 0, 0]); return g;
    });
  }
  function ballGeo(d) { return cached(key('ball', d), function () { return new (T().SphereGeometry)(d / 2, 28, 18); }); }

  /* ------------------------------------------------------------ TEKSTUR PROSEDURAL (kanvas, dibuat sekali) */
  var TEX = {}, rs = 11;
  function rnd() { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; }
  function canvasTex(k, w, h, draw, rep, linear) {
    if (TEX[k]) return TEX[k];
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new (T().CanvasTexture)(c); if (!linear) t.encoding = T().sRGBEncoding; t.anisotropy = 8; t.wrapS = t.wrapT = T().RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    TEX[k] = t; return t;
  }
  var tex = {
    // anyaman rotan (cane) berpola segi-delapan klasik: alpha-cut (lubang tembus)
    cane: function () {
      return canvasTex('pcane', 256, 256, function (g, w, h) {
        g.clearRect(0, 0, w, h); var p = 32;
        var strand = function (x0, y0, x1, y1, wd) { g.lineWidth = wd; g.strokeStyle = '#e7d3a8'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineWidth = wd * .35; g.strokeStyle = 'rgba(120,86,40,.35)'; g.beginPath(); g.moveTo(x0, y0 + wd * .3); g.lineTo(x1, y1 + wd * .3); g.stroke(); };
        for (var i = -w; i <= w * 2; i += p) { strand(i, 0, i + h, h, 5); strand(i + h, 0, i, h, 5); }
        for (var y = p / 2; y < h + p; y += p) strand(0, y, w, y, 4.2);
        for (var x = p / 2; x < w + p; x += p) strand(x, 0, x, h, 4.2);
        g.fillStyle = '#d9c08e'; for (var a = 0; a <= w; a += p) for (var b = 0; b <= h; b += p) { g.beginPath(); g.arc(a + p / 2, b + p / 2, 3.2, 0, Math.PI * 2); g.fill(); }
      }, [7, 7]);
    },
    // anyaman tali kertas (paper cord, dining/33): pita bergantian
    cord: function () {
      return canvasTex('pcord', 256, 256, function (g, w, h) {
        g.fillStyle = '#6e5a3e'; g.fillRect(0, 0, w, h); var n = 16, s = w / n;
        for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
          var hor = ((i >> 1) + (j >> 1)) % 2 === 0, x = i * s, y = j * s, gr = hor ? g.createLinearGradient(x, y, x, y + s) : g.createLinearGradient(x, y, x + s, y);
          gr.addColorStop(0, '#a88b5f'); gr.addColorStop(.5, '#e4cfa4'); gr.addColorStop(1, '#a3865a'); g.fillStyle = gr; g.fillRect(x + .6, y + .6, s - 1.2, s - 1.2);
          g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = .8; for (var k = 1; k < 4; k++) { g.beginPath(); if (hor) { g.moveTo(x + k * s / 4, y + 1); g.lineTo(x + k * s / 4 - 2, y + s - 1); } else { g.moveTo(x + 1, y + k * s / 4); g.lineTo(x + s - 1, y + k * s / 4 - 2); } g.stroke(); }
        }
      }, [6, 6]);
    },
    // seagrass (stool/19): anyaman tali berpilin
    seagrass: function () {
      return canvasTex('psea', 256, 256, function (g, w, h) {
        g.fillStyle = '#5d5233'; g.fillRect(0, 0, w, h); var s = 16;
        for (var j = 0; j < h / s; j++) for (var i = 0; i < w / s; i++) { var x = i * s, y = j * s, o = (i + j) % 2; g.fillStyle = o ? '#b9a873' : '#a8975f'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s * .55, s * .34, o ? .6 : -.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(70,60,30,.5)'; g.lineWidth = 1; for (var k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + s / 2 + k * 3 - 4, y + 3); g.lineTo(x + s / 2 + k * 3 + 4, y + s - 3); g.stroke(); } }
      }, [8, 8]);
    },
    // flute / lipit: bump map pita vertikal (u melintang)
    flute: function () { return canvasTex('pflute', 64, 4, function (g, w, h) { var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#202020'); gr.addColorStop(.2, '#b0b0b0'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.8, '#b0b0b0'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [1, 1], true); }
  };

  var api = {
    cached: cached, merge: merge, shear: shear, lathe: lathe, roundCyl: roundCyl, legGeo: legGeo, legRadiusAt: legRadiusAt, capGeo: capGeo, castorGeo: castorGeo,
    bar: bar, rrectPts: rrectPts, sweep: sweep, fillet: fillet, tube: tube, arcPts: arcPts, circlePts: circlePts, loftX: loftX, fixOut: fixOut,
    cushGeo: cushGeo, weldNormals: weldNormals, pattern: pattern, quilt: quilt, cellSamples: cellSamples,
    buttonGeo: buttonGeo, nailGeo: nailGeo, armProfile: armProfile, backTop: backTop,
    pillow: pillow, loadPillow: loadPillow, pillowReady: function () { return PIL.state === 2; }, bolsterGeo: bolsterGeo, ballGeo: ballGeo,
    tex: tex, lastCfg: null, lastPillows: false
  };
  window.XPARTS = api;
})();
