/* ==========================================================================
   XIONCO — simbol garis untuk pilihan yang tidak tampak sebagai bentuk 3D
   (jenis kain, isian & kekerasan dudukan, jahitan, material top/kaki, finishing muka kabinet,
   badan kabinet, profil tepi meja, isi dalam kabinet, aksesori kecil).
   Gaya sama dengan gambar 3D: tinta tunggal, garis luar ±2.6 px, detail ±1.5 px pada 240 × 240,
   proyeksi isometrik untuk benda, potongan (section) berarsir untuk isian & profil tepi.
   Kunci: '<group>__<opt>' (bersama) atau '<cat>/<sub>:<group>__<opt>' (khusus sub).
     prefer: true → dipakai walau model 3D berbeda (simbol lebih jelas)
   ========================================================================== */
(function () {
  'use strict';
  var W1 = 3.1, W2 = 1.7, W3 = 1.25;   // Y1: +15 % (sama dengan garis gambar 3D)
  var C30 = Math.cos(Math.PI / 6);
  var f = function (n) { return Math.round(n * 10) / 10; };
  var uid = 0;

  /* ---------------- dasar */
  function pts(a) { return a.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }); }
  function P(a, close) { var s = pts(a); return 'M' + s[0] + (s.length > 1 ? ' L' + s.slice(1).join(' L') : '') + (close ? ' Z' : ''); }
  function path(d, w, x) { return '<path d="' + d + '" stroke-width="' + (w || W1) + '"' + (x || '') + '/>'; }
  function line(a, b, w, x) { return path(P([a, b]), w || W2, x); }
  function poly(a, w, close, x) { return path(P(a, close !== false), w || W1, x); }
  function circ(cx, cy, r, w, x) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" stroke-width="' + (w || W2) + '"' + (x || '') + '/>'; }
  function ell(cx, cy, rx, ry, w, x) { return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" stroke-width="' + (w || W2) + '"' + (x || '') + '/>'; }
  function dot(cx, cy, r) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r || 1.6) + '" fill="#000" stroke="none"/>'; }
  var DASH = ' stroke-dasharray="5 4"', DASH2 = ' stroke-dasharray="3 3"';
  function svg(body) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'; }
  function clip(polyPts, body) { var id = 'k' + (++uid); return '<clipPath id="' + id + '"><path d="' + P(polyPts, true) + '"/></clipPath><g clip-path="url(#' + id + ')">' + body + '</g>'; }
  var lerp = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  function quadPt(q, u, v) { return lerp(lerp(q[0], q[1], u), lerp(q[3], q[2], u), v); }   // q: [p00, p10, p11, p01]
  function hatch(q, n, w, ang) {   // garis arsir sejajar di dalam segi empat q (parameter u)
    var s = ''; for (var i = 1; i < n; i++) { var t = i / n; s += ang ? line(quadPt(q, 0, t), quadPt(q, t, 0), w || W3) + line(quadPt(q, t, 1), quadPt(q, 1, t), w || W3) : line(quadPt(q, t, 0), quadPt(q, t, 1), w || W3); }
    return s;
  }
  function diag(box, step, w) {   // arsir diagonal 45° dalam kotak [x0,y0,x1,y1] (dipotong clip)
    var s = '', x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], h = y1 - y0;
    for (var x = x0 - h; x < x1; x += step) s += line([x, y1], [x + h, y0], w || W3);
    return s;
  }

  /* ---------------- balok isometrik: x ke kanan-bawah, z ke kiri-bawah, y ke atas */
  function blk(cx, cy, w, d, h, s) {
    // skala otomatis: benda mengisi ±78 % kotak tanpa keluar tepi
    s = Math.min(s || 1, 188 / ((w + d) * C30), 176 / ((w + d) * .5 + h));
    var o = function (x, y, z) { return [cx + (x - z) * C30 * s, cy + (x + z) * .5 * s - y * s]; };
    var ox = -w / 2, oz = -d / 2, oy = -h / 2;
    var p = function (x, y, z) { return o(ox + x, oy + y, oz + z); };
    var top = [p(0, h, 0), p(w, h, 0), p(w, h, d), p(0, h, d)];
    var front = [p(0, h, d), p(w, h, d), p(w, 0, d), p(0, 0, d)];   // u = x, v = turun
    var side = [p(w, h, d), p(w, h, 0), p(w, 0, 0), p(w, 0, d)];    // u = ke belakang, v = turun
    var outline = [p(0, h, 0), p(w, h, 0), p(w, 0, 0), p(w, 0, d), p(0, 0, d), p(0, h, d)];
    return { p: p, top: top, front: front, side: side, outline: outline,
      draw: function (w1) { return poly(outline, w1 || W1) + line(top[3], top[2], w1 || W1) + line(top[2], top[1], w1 || W1) + line(top[2], front[2], w1 || W1); } };
  }
  // garis pada muka: daftar segmen [u0,v0,u1,v1]
  function onFace(q, segs, w, x) { return segs.map(function (g) { return line(quadPt(q, g[0], g[1]), quadPt(q, g[2], g[3]), w || W3, x); }).join(''); }
  function curveOn(q, fn, n, w) { var a = []; for (var i = 0; i <= (n || 40); i++) { var t = i / (n || 40); a.push(quadPt(q, fn(t)[0], fn(t)[1])); } return path(P(a), w || W3); }

  // kurva halus tertutup (Catmull-Rom → Bézier)
  function smooth(p) {
    var n = p.length, d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += ' C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + ' Z';
  }
  // perbesar sekelompok gambar di sekitar (cx, cy) tanpa menebalkan garis
  function zoom(body, k, cx, cy) { return '<g transform="translate(' + f(120 - cx * k) + ' ' + f(120 - cy * k) + ') scale(' + k + ')">' + body.split('/>').join(' vector-effect="non-scaling-stroke"/>') + '</g>'; }
  var S = {};
  function add(key, body, o) { S[key] = { svg: svg(body), prefer: !!(o && o.prefer), force: !!(o && o.force) }; }

  /* ================================================================== KAIN / KULIT (contoh kain di atas bantalan) */
  function swatch(pattern, o) {
    o = o || {};
    var b = blk(120, 132, 150, 150, 26, 1);
    return pattern(b) + b.draw();
  }
  add('uph__vienna', swatch(function (b) {   // tenun polos
    var s = '', n = 14; for (var i = 1; i < n; i++) { var t = i / n; s += onFace(b.top, [[t, 0, t, 1], [0, t, 1, t]], W3); }
    return s;
  }));
  add('uph__cherokee', swatch(function (b) {   // kulit sintetis: halus, jahitan tepi, kilap
    return onFace(b.top, [[.08, .08, .92, .08], [.92, .08, .92, .92], [.92, .92, .08, .92], [.08, .92, .08, .08]], W2, DASH2) +
      curveOn(b.top, function (t) { return [.25 + t * .35, .3 + Math.sin(t * Math.PI) * .06]; }, 20, W2) + curveOn(b.top, function (t) { return [.32 + t * .2, .42 + Math.sin(t * Math.PI) * .04]; }, 16, W3) +
      onFace(b.front, [[.08, .45, .92, .45]], W2, DASH2);
  }));
  add('uph__boucle', swatch(function (b) {   // ikal kecil
    var s = ''; for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { var u = (i + .5 + (j % 2) * .45) / 8.4, v = (j + .5) / 8, q = quadPt(b.top, u, v); s += ell(q[0], q[1], 4.6, 3, W3); }
    return s;
  }));
  add('uph__velvet', swatch(function (b) {   // beludru: kilap lembut + arah bulu
    var s = ''; [.2, .38, .56, .74].forEach(function (v, k) { s += curveOn(b.top, function (t) { return [.08 + t * .84, v + Math.sin(t * Math.PI * 1.2 + k) * .05]; }, 40, k % 2 ? W3 : W2); });
    for (var i = 0; i < 6; i++) { var q = quadPt(b.top, .2 + i * .12, .88); s += line(q, [q[0] + 4, q[1] - 7], W3); }
    return s;
  }));
  add('uph__linen', swatch(function (b) {   // tenun kasar tidak rata (slub)
    var s = '', n = 11;
    for (var i = 1; i < n; i++) { var t = i / n; s += onFace(b.top, [[t, 0, t, 1]], i % 3 ? W3 : W2, ' stroke-dasharray="' + (14 + i % 4 * 5) + ' 3"'); s += onFace(b.top, [[0, t, 1, t]], i % 4 ? W3 : W2, ' stroke-dasharray="' + (10 + i % 3 * 7) + ' 2"'); }
    return s;
  }));
  add('uph__chenille', swatch(function (b) {   // baris tuft lembut
    var s = ''; for (var j = 1; j < 9; j++) s += curveOn(b.top, function (t) { return [t, j / 9 + Math.sin(t * Math.PI * 14) * .012]; }, 120, j % 2 ? W2 : W3);
    return s;
  }));
  add('uph__pet', (function () {   // tenun rapat + jejak kaki (anti cakar)
    var b = blk(120, 132, 150, 150, 26, 1), s = '', n = 12;
    for (var i = 1; i < n; i++) { var t = i / n; s += onFace(b.top, [[t, 0, t, 1], [0, t, 1, t]], .8); }
    var c = quadPt(b.top, .5, .5);
    var paw = '<g transform="translate(' + f(c[0]) + ' ' + f(c[1]) + ') scale(1 .62)">' + '<ellipse cx="0" cy="6" rx="17" ry="13" fill="#fff" stroke-width="2.6"/>' +
      [[-17, -12], [-6, -20], [6, -20], [17, -12]].map(function (q) { return '<ellipse cx="' + q[0] + '" cy="' + q[1] + '" rx="5.2" ry="6.6" fill="#fff" stroke-width="2.2"/>'; }).join('') + '</g>';
    return s + b.draw() + paw.replace(/fill="#fff"/g, 'fill="none"');
  })());
  add('uph__leather', (function () {   // kulit asli: bentuk kulit utuh (hide) dengan tepi alami
    var pt = [[44, 56], [84, 40], [120, 50], [158, 38], [198, 58], [202, 96], [188, 122], [206, 160], [192, 196], [152, 206], [120, 194], [86, 208], [46, 194], [34, 158], [52, 122], [32, 90]];
    return path(smooth(pt), W1) + path(smooth([[66, 72], [120, 64], [176, 74], [184, 120], [174, 178], [120, 186], [64, 176], [56, 120]]), W2, DASH2) +
      path('M86 104 Q120 94 154 106', W3) + path('M80 132 Q120 122 160 134', W3) + path('M88 160 Q120 152 152 162', W3);
  })());

  /* ================================================================== ISIAN DUDUKAN (potongan bantal) */
  function cushionSection(inner, o) {
    o = o || {};
    var x0 = 26, x1 = 214, y0 = o.y0 || 74, y1 = o.y1 || 162, r = 24;
    var d = 'M' + (x0 + r) + ' ' + y0 + ' Q120 ' + (y0 - (o.crown || 8)) + ' ' + (x1 - r) + ' ' + y0 + ' Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + r) + ' L' + x1 + ' ' + (y1 - r) + ' Q' + x1 + ' ' + y1 + ' ' + (x1 - r) + ' ' + y1 + ' L' + (x0 + r) + ' ' + y1 + ' Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - r) + ' L' + x0 + ' ' + (y0 + r) + ' Q' + x0 + ' ' + y0 + ' ' + (x0 + r) + ' ' + y0 + ' Z';
    var id = 'c' + (++uid);
    return '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + ')">' + inner(x0, y0, x1, y1) + '</g>' + path(d, W1) +
      line([24, y1 + 14], [216, y1 + 14], W2) + diag([24, y1 + 14, 216, y1 + 24], 9, W3).replace(/<path/g, '<path') ;
  }
  function cells(x0, y0, x1, y1, step, r) { var s = '', k = 0; for (var y = y0 + step / 2; y < y1; y += step * .86, k++) for (var x = x0 + step / 2 + (k % 2) * step / 2; x < x1; x += step) s += circ(x + Math.sin(x * y) * 1.5, y, r, W3); return s; }
  function base(s) { return s.replace(/stroke-width="1.1"\/>$/, ''); }
  add('fill__foam', cushionSection(function (x0, y0, x1, y1) { return cells(x0, y0 - 4, x1, y1, 16, 3.4); }));
  add('fill__hd', cushionSection(function (x0, y0, x1, y1) { return cells(x0, y0 - 4, x1, y1, 9, 1.7); }));
  add('fill__dacron', cushionSection(function (x0, y0, x1, y1) {   // inti busa + lapisan serat
    var s = path('M' + (x0 + 14) + ' ' + (y0 + 14) + ' L' + (x1 - 14) + ' ' + (y0 + 14) + ' L' + (x1 - 14) + ' ' + (y1 - 14) + ' L' + (x0 + 14) + ' ' + (y1 - 14) + ' Z', W2);
    s += cells(x0 + 14, y0 + 14, x1 - 14, y1 - 14, 14, 2.6);
    for (var i = 0; i < 3; i++) { var yy = y0 + 4 + i * 3.5; s += path('M' + x0 + ' ' + yy + ' q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0', W3); }
    s += path('M' + x0 + ' ' + (y1 - 6) + ' q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0', W3);
    return s;
  }));
  add('fill__feather', cushionSection(function (x0, y0, x1, y1) {   // inti busa + kantong bulu di atas
    var s = line([x0, y0 + 30], [x1, y0 + 30], W2) + cells(x0, y0 + 34, x1, y1, 15, 3);
    [[70, y0 + 15, -.3], [112, y0 + 12, .2], [154, y0 + 16, -.15], [92, y0 + 22, .5], [134, y0 + 23, -.4]].forEach(function (q) {
      s += '<g transform="translate(' + q[0] + ' ' + q[1] + ') rotate(' + f(q[2] * 57) + ')">' + path('M-14 0 Q0 -7 14 0 Q0 7 -14 0 Z', W3) + line([-17, 0], [15, 0], W3) + '</g>';
    });
    return s;
  }, { crown: 14 }));
  add('fill__pocket', cushionSection(function (x0, y0, x1, y1) {   // pegas kantong
    var s = '', n = 6, w = (x1 - x0 - 16) / n;
    s += line([x0, y0 + 10], [x1, y0 + 10], W2) + line([x0, y1 - 10], [x1, y1 - 10], W2);
    for (var i = 0; i < n; i++) {
      var cx = x0 + 8 + w * (i + .5); s += path('M' + f(cx - w / 2 + 2) + ' ' + (y0 + 14) + ' L' + f(cx + w / 2 - 2) + ' ' + (y0 + 14) + ' L' + f(cx + w / 2 - 2) + ' ' + (y1 - 14) + ' L' + f(cx - w / 2 + 2) + ' ' + (y1 - 14) + ' Z', W3);
      var d = 'M' + f(cx - 7) + ' ' + (y0 + 18); for (var k = 0; k < 6; k++) d += ' L' + f(cx + (k % 2 ? -7 : 7)) + ' ' + f(y0 + 18 + (k + 1) * (y1 - y0 - 36) / 6); s += path(d, W2);
    }
    return s;
  }));
  add('fill__memory', cushionSection(function (x0, y0, x1, y1) {   // busa memori: cekungan bekas tangan pulih perlahan
    var s = cells(x0, y0 + 14, x1, y1, 11, 2);
    s += path('M' + (x0 + 40) + ' ' + (y0 - 2) + ' C' + (x0 + 60) + ' ' + (y0 + 24) + ' ' + (x1 - 60) + ' ' + (y0 + 24) + ' ' + (x1 - 40) + ' ' + (y0 - 2), W2, DASH2);
    s += path('M120 ' + (y0 - 30) + ' L120 ' + (y0 - 8) + ' M112 ' + (y0 - 16) + ' L120 ' + (y0 - 8) + ' L128 ' + (y0 - 16), W2);
    return s;
  }, { y0: 92 }) + path('M120 46 L120 74 M112 66 L120 74 L128 66', W2));

  /* ================================================================== KEKERASAN (bola menekan bantal) */
  function firm(depth, n) {
    var y0 = 108, x0 = 30, x1 = 210, d = depth, r = 26, cy = y0 + d - r;
    var top = 'M' + x0 + ' ' + y0 + ' L60 ' + y0 + ' C' + (95 - d) + ' ' + y0 + ' ' + (98 - d * .3) + ' ' + (y0 + d) + ' 120 ' + (y0 + d) + ' C' + (142 + d * .3) + ' ' + (y0 + d) + ' ' + (145 + d) + ' ' + y0 + ' 180 ' + y0 + ' L' + x1 + ' ' + y0;
    var s = path(top, W1) + path('M' + x0 + ' ' + y0 + ' L' + x0 + ' 172 L' + x1 + ' 172 L' + x1 + ' ' + y0, W1);
    s += circ(120, cy, r, W1);
    for (var i = 0; i < n; i++) { var yy = y0 + 18 + i * (54 / n); s += path('M' + (x0 + 8) + ' ' + f(yy + d * .25 * (1 - i / n)) + ' C80 ' + f(yy + d * .5 * (1 - i / n)) + ' 160 ' + f(yy + d * .5 * (1 - i / n)) + ' ' + (x1 - 8) + ' ' + f(yy + d * .25 * (1 - i / n)), W3); }
    return s + path('M120 ' + f(cy - r - 30) + ' L120 ' + f(cy - r - 8) + ' M113 ' + f(cy - r - 15) + ' L120 ' + f(cy - r - 8) + ' L127 ' + f(cy - r - 15), W2) + line([24, 186], [216, 186], W2);
  }
  add('firm__soft', firm(30, 3)); add('firm__medium', firm(17, 4)); add('firm__firm', firm(5, 6));

  /* ================================================================== JAHITAN (sudut bantal isometrik) */
  function cushionCorner(extra) {
    var b = blk(124, 124, 170, 150, 46, 1), r = '';
    return b.draw() + extra(b);
  }
  add('stitch__clean', cushionCorner(function (b) { return onFace(b.front, [[.02, .5, .98, .5]], W3, ' stroke-opacity=".45"'); }));
  add('stitch__piping', cushionCorner(function (b) {   // list (tali) mengikuti tepi atas
    var e = function (q0, q1) { var a = q0, c = q1; return line([a[0], a[1] + 4], [c[0], c[1] + 4], W2); };
    return e(b.top[3], b.top[2]) + e(b.top[2], b.top[1]) + e(b.front[3], b.front[2]).replace('', '') +
      line([b.front[3][0], b.front[3][1] - 4], [b.front[2][0], b.front[2][1] - 4], W2) + line([b.front[2][0], b.front[2][1] - 4], [b.side[3][0], b.side[3][1] - 4], W2) +
      circ(b.top[2][0], b.top[2][1] + 2, 6, W2);
  }));
  add('stitch__double', cushionCorner(function (b) {
    return onFace(b.top, [[.06, .9, .94, .9], [.06, .83, .94, .83], [.9, .06, .9, .94], [.83, .06, .83, .94]], W2, DASH2) + onFace(b.front, [[.03, .22, .97, .22], [.03, .34, .97, .34]], W2, DASH2);
  }));
  add('stitch__contrast', cushionCorner(function (b) {
    return onFace(b.top, [[.06, .87, .94, .87], [.87, .06, .87, .94]], 3.2, ' stroke-dasharray="7 5"') + onFace(b.front, [[.03, .28, .97, .28]], 3.2, ' stroke-dasharray="7 5"');
  }));
  function pipingSym(thick) {
    var b = blk(124, 124, 170, 150, 46, 1), o = b.draw();
    var tube = function (a, c) { return thick ? line([a[0], a[1]], [c[0], c[1]], 7.5) : line([a[0], a[1] - 3.5], [c[0], c[1] - 3.5], W2) + line([a[0], a[1] + 3.5], [c[0], c[1] + 3.5], W2); };
    return o + tube(b.top[3], b.top[2]) + tube(b.top[2], b.top[1]);
  }
  add('pipingC__same', pipingSym(false)); add('pipingC__contrast', pipingSym(true));

  /* ================================================================== BANTAL HIAS */
  function pillow(fill) {
    var d = 'M58 62 Q120 52 182 62 Q170 120 182 178 Q120 168 58 178 Q70 120 58 62 Z';
    var id = 'p' + (++uid);
    return '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + ')">' + (fill || '') + '</g>' + path(d, W1) + path('M74 80 Q120 92 166 80', W3) + path('M74 160 Q120 148 166 160', W3);
  }
  add('pillowColor__same', pillow(''));
  add('pillowColor__contrast', pillow(diag([40, 40, 200, 200], 6, 1.3)));
  add('pillowColor__accent', pillow(path('M120 82 L156 120 L120 158 L84 120 Z', W2) + path('M120 98 L140 120 L120 142 L100 120 Z', W3) + line([58, 70], [182, 70], 3.4) + line([58, 170], [182, 170], 3.4)));
  add('pillowType__square', pillow(''), { prefer: true });
  add('pillowType__lumbar', path('M36 88 Q120 78 204 88 Q196 120 204 152 Q120 142 36 152 Q44 120 36 88 Z', W1) + path('M50 100 Q120 108 190 100', W3) + path('M50 140 Q120 132 190 140', W3), { prefer: true });
  add('pillowType__mix', path('M30 56 Q90 48 150 56 Q140 104 150 152 Q90 144 30 152 Q40 104 30 56 Z', W1) + path('M84 132 Q150 124 216 132 Q210 158 216 184 Q150 176 84 184 Q90 158 84 132 Z', W1) + path('M98 146 Q150 152 202 146', W3), { prefer: true });

  /* ================================================================== KAKI: MATERIAL */
  function legBase(body) { return poly([[40, 54], [200, 54], [200, 80], [40, 80]], W1) + line([40, 54], [70, 38], W1) + line([200, 54], [212, 46], W2) + line([70, 38], [212, 38], W2) + line([212, 38], [212, 46], W2) + body + line([30, 206], [210, 206], W2); }
  var tapered = 'M104 80 L136 80 L128 204 L112 204 Z';
  add('legFinish__wood', legBase(path(tapered, W1) + path('M114 92 Q118 140 116 196', W3) + path('M124 90 Q121 130 124 160 Q126 180 123 196', W3) + path('M130 100 Q128 116 129 130', W3)));
  add('legFinish__metal', legBase(path('M112 80 L128 80 L124 204 L116 204 Z', W1) + line([119.5, 92], [118.5, 194], W3) + line([123, 96], [122, 120], W2)));
  add('legFinish__same', legBase(path('M96 80 L144 80 L144 196 Q144 204 136 204 L104 204 Q96 204 96 196 Z', W1) + line([100, 90], [140, 90], W2, DASH2) + line([100, 194], [140, 194], W2, DASH2)));
  function bar(extra) { var b = blk(120, 120, 190, 22, 22, 1); return b.draw() + extra(b); }
  add('footrestFinish__same', bar(function () { return ''; }) + line([50, 180], [190, 180], W2));
  add('footrestFinish__brass', bar(function (b) { return onFace(b.top, [[.05, .5, .95, .5]], W2) + onFace(b.front, [[.05, .3, .6, .3]], W3); }) + '<g stroke-width="2"><path d="M178 54 L178 70 M170 62 L186 62 M172 56 L184 68 M184 56 L172 68"/></g>');
  add('footrestFinish__black', bar(function (b) { return clip(b.front, diag([0, 0, 240, 240], 3.2, 1.2)) + clip(b.top, diag([0, 0, 240, 240], 3.2, 1.2)) + clip(b.side, diag([0, 0, 240, 240], 3.2, 1.2)); }));

  /* ================================================================== TOP MEJA: MATERIAL (sudut papan) */
  function slab(extra, h) { var b = blk(120, 126, 180, 150, h || 22, 1); return extra(b) + b.draw(); }
  function grainTop(b, n) { var s = ''; for (var i = 1; i < (n || 6); i++) { var v = i / (n || 6); s += curveOn(b.top, function (t) { return [t, v + Math.sin(t * 7 + i) * .03]; }, 40, W3); } return s; }
  add('topMat__wood', slab(function (b) {   // kayu solid: serat + lingkar tahun di potongan
    var s = grainTop(b, 6), c = quadPt(b.front, .62, 1.6);
    for (var i = 1; i < 6; i++) s += clip(b.front, ell(c[0], c[1], i * 14, i * 9, W3));
    return s;
  }));
  add('topMat__veneer', slab(function (b) { return grainTop(b, 6) + onFace(b.front, [[0, .22, 1, .22], [0, .78, 1, .78]], W2) + clip(b.front, cells(b.front[3][0] - 20, b.front[0][1] - 10, b.front[2][0], b.front[2][1] + 20, 7, 1.1)); }));
  add('topMat__hpl', slab(function (b) { return onFace(b.front, [[0, .16, 1, .16], [0, .84, 1, .84]], W2) + clip(b.front, cells(b.front[3][0] - 20, b.front[0][1] - 10, b.front[2][0], b.front[2][1] + 20, 6, .9)) + onFace(b.top, [[.1, .14, .3, .14]], W3); }));
  add('topMat__stone', slab(function (b) {
    return curveOn(b.top, function (t) { return [t, .25 + Math.sin(t * 5) * .1 + t * .2]; }, 50, W2) + curveOn(b.top, function (t) { return [.15 + t * .7, .5 + Math.sin(t * 8 + 1) * .05 + t * .3]; }, 50, W3) +
      curveOn(b.top, function (t) { return [.4 + t * .55, .1 + t * .3 + Math.sin(t * 9) * .03]; }, 40, W3) + curveOn(b.front, function (t) { return [t * .7, .3 + t * .5]; }, 20, W3);
  }, 26));
  add('topMat__glass', slab(function (b) { return onFace(b.top, [[.15, .35, .4, .1], [.22, .5, .55, .17], [.6, .9, .85, .65]], W2) + onFace(b.front, [[0, .5, 1, .5]], W3, DASH2); }, 12));
  add('topMat__duco', slab(function (b) {   // cat duco: permukaan polos + tetes cat pada potongan
    var c = quadPt(b.front, .4, 1);
    return onFace(b.top, [[.62, .7, .86, .7]], W3) + path('M' + f(c[0] - 6) + ' ' + f(c[1] - 1) + ' Q' + f(c[0] - 6) + ' ' + f(c[1] + 14) + ' ' + f(c[0]) + ' ' + f(c[1] + 20) + ' Q' + f(c[0] + 6) + ' ' + f(c[1] + 14) + ' ' + f(c[0] + 6) + ' ' + f(c[1] + 2), W2) + onFace(b.front, [[0, .2, 1, .2]], W2);
  }));
  /* sintered stone desk = stone */
  S['meja/desk:topMat__stone'] = S['topMat__stone'];

  /* ================================================================== KAKI / BASE: MATERIAL */
  function underTop(body) { return poly([[34, 52], [206, 52], [206, 66], [34, 66]], W1) + line([34, 52], [58, 38], W2) + line([206, 52], [218, 44], W2) + line([58, 38], [218, 38], W2) + line([218, 38], [218, 44], W2) + body + line([28, 208], [212, 208], W2); }
  add('baseMat__wood', underTop(path('M102 66 L138 66 L130 206 L110 206 Z', W1) + path('M112 78 Q118 140 115 198', W3) + path('M126 76 Q122 130 125 196', W3)));
  add('baseMat__metal', underTop(path('M112 66 L128 66 L128 206 L112 206 Z', W1) + line([117, 76], [117, 198], W3) + line([123, 80], [123, 110], W2)));
  add('baseMat__stone', underTop(path('M88 66 L152 66 L152 206 L88 206 Z', W1) + path('M92 92 Q110 110 104 140 Q100 170 120 200', W2) + path('M150 80 Q130 104 140 130', W3) + path('M90 150 Q110 160 130 154', W3)));

  /* ================================================================== FINISHING MUKA KABINET (pintu) */
  function door(extra, o) {
    o = o || {};
    var x0 = 62, y0 = 30, x1 = 178, y1 = 210, r = o.r || 3;
    return extra(x0, y0, x1, y1) + path('M' + (x0 + r) + ' ' + y0 + ' L' + (x1 - r) + ' ' + y0 + ' Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + r) + ' L' + x1 + ' ' + (y1 - r) + ' Q' + x1 + ' ' + y1 + ' ' + (x1 - r) + ' ' + y1 + ' L' + (x0 + r) + ' ' + y1 + ' Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - r) + ' L' + x0 + ' ' + (y0 + r) + ' Q' + x0 + ' ' + y0 + ' ' + (x0 + r) + ' ' + y0 + ' Z', W1) +
      line([x1, y0], [x1 + 12, y0 - 7], W2) + line([x1 + 12, y0 - 7], [x1 + 12, y1 - 7], W2) + line([x1, y1], [x1 + 12, y1 - 7], W2) + line([x0, y0], [x0 + 12, y0 - 7], W2) + line([x0 + 12, y0 - 7], [x1 + 12, y0 - 7], W2);
  }
  add('finish__hpl', door(function (x0, y0, x1, y1) { return line([x0 + 4, y0 + 4], [x1 - 4, y0 + 4], W3) + line([x1 - 4, y0 + 4], [x1 - 4, y1 - 4], W3) + line([x0 + 18, y0 + 30], [x0 + 46, y0 + 30], W3) + line([x0 + 18, y0 + 38], [x0 + 34, y0 + 38], W3); }));
  add('finish__veneer', door(function (x0, y0, x1, y1) { var s = ''; for (var i = 1; i < 8; i++) { var x = x0 + i * (x1 - x0) / 8; s += path('M' + f(x) + ' ' + (y0 + 4) + ' C' + f(x + 6) + ' ' + (y0 + 60) + ' ' + f(x - 6) + ' ' + (y0 + 120) + ' ' + f(x + 2) + ' ' + (y1 - 4), W3); } return s; }));
  add('finish__solid', door(function (x0, y0, x1, y1) { var s = path('M' + (x0 + 20) + ' ' + (y0 + 20) + ' L' + (x1 - 20) + ' ' + (y0 + 20) + ' L' + (x1 - 20) + ' ' + (y1 - 20) + ' L' + (x0 + 20) + ' ' + (y1 - 20) + ' Z', W2) + path('M' + (x0 + 26) + ' ' + (y0 + 26) + ' L' + (x1 - 26) + ' ' + (y0 + 26) + ' L' + (x1 - 26) + ' ' + (y1 - 26) + ' L' + (x0 + 26) + ' ' + (y1 - 26) + ' Z', W3); for (var i = 1; i < 4; i++) s += path('M' + f(x0 + 26 + i * 16) + ' ' + (y0 + 30) + ' Q' + f(x0 + 32 + i * 16) + ' 120 ' + f(x0 + 26 + i * 16) + ' ' + (y1 - 30), W3); return s; }));
  add('finish__duco', door(function (x0, y0, x1, y1) { return path('M' + (x0 + 30) + ' ' + (y1 - 40) + ' q10 -14 22 -4 t22 -4', W2) + path('M' + (x0 + 46) + ' ' + (y1 - 30) + ' l18 -30 l10 6 l-18 30 z', W2); }, { r: 6 }));
  add('finish__gloss', door(function (x0, y0, x1, y1) { return line([x0 + 20, y0 + 70], [x0 + 70, y0 + 20], W2) + line([x0 + 26, y0 + 98], [x0 + 98, y0 + 26], W2) + line([x0 + 50, y1 - 20], [x1 - 20, y0 + 120], W3); }, { r: 6 }));
  add('finish__fluted', door(function (x0, y0, x1, y1) { var s = ''; for (var x = x0 + 10; x < x1 - 4; x += 10) s += line([x, y0 + 3], [x, y1 - 3], W2); return s; }));
  add('finish__cane', door(function (x0, y0, x1, y1) {
    var s = path('M' + (x0 + 14) + ' ' + (y0 + 14) + ' L' + (x1 - 14) + ' ' + (y0 + 14) + ' L' + (x1 - 14) + ' ' + (y1 - 14) + ' L' + (x0 + 14) + ' ' + (y1 - 14) + ' Z', W2), m = '';
    for (var x = x0 + 14; x < x1 - 14; x += 18) for (var y = y0 + 14; y < y1 - 14; y += 18) m += circ(x + 9, y + 9, 6, W3);
    for (var i = -12; i < 22; i++) { m += line([x0 + i * 18, y0], [x0 + i * 18 + 200, y0 + 200], .9) + line([x0 + i * 18, y1], [x0 + i * 18 + 200, y1 - 200], .9); }
    return s + clip([[x0 + 14, y0 + 14], [x1 - 14, y0 + 14], [x1 - 14, y1 - 14], [x0 + 14, y1 - 14]], m);
  }));

  /* ================================================================== BADAN KABINET (potongan papan) */
  function board(extra) { var b = blk(116, 132, 120, 150, 40, 1.12); return extra(b) + b.draw(); }
  add('carcass__multiplek', board(function (b) { var s = ''; for (var i = 1; i < 8; i++) s += onFace(b.front, [[0, i / 8, 1, i / 8]], i % 2 ? W3 : W2); for (i = 1; i < 8; i++) s += onFace(b.side, [[0, i / 8, 1, i / 8]], W3); return s; }));
  add('carcass__blockboard', board(function (b) { var s = onFace(b.front, [[0, .16, 1, .16], [0, .84, 1, .84]], W2); for (var i = 1; i < 7; i++) s += onFace(b.front, [[i / 7, .16, i / 7, .84]], W2); s += onFace(b.side, [[0, .16, 1, .16], [0, .84, 1, .84]], W3); return s + grainTop(b, 5); }));
  add('carcass__solid', board(function (b) { var s = grainTop(b, 6), c = quadPt(b.front, .3, 1.5); for (var i = 1; i < 6; i++) s += clip(b.front, ell(c[0], c[1], i * 12, i * 8, W3)); return s; }));
  add('carcass__mdf', board(function (b) { return clip(b.front, cells(b.front[3][0] - 10, b.front[0][1] - 30, b.front[2][0] + 10, b.front[2][1] + 10, 5, .7)) + clip(b.side, cells(b.side[0][0] - 10, b.side[1][1] - 10, b.side[2][0] + 10, b.side[3][1] + 30, 5, .7)); }));

  /* ================================================================== PROFIL TEPI MEJA (potongan berarsir) */
  function edge(profile) {
    var y0 = 94, y1 = 146, x0 = 18, xe = 196;
    var d = 'M' + x0 + ' ' + y0 + ' L' + profile(xe, y0, y1) + ' L' + x0 + ' ' + y1;
    var id = 'e' + (++uid);
    return '<clipPath id="' + id + '"><path d="' + d + ' Z"/></clipPath><g clip-path="url(#' + id + ')">' + diag([0, 60, 240, 180], 8, W3) + '</g>' + path(d, W1) + line([x0, y0 - 10], [x0, y1 + 10], W2, ' stroke-dasharray="6 3 2 3"') +
      line([x0 + 4, 64], [xe - 40, 64], W3) + line([x0 + 4, 60], [x0 + 4, 68], W3) + line([xe - 40, 60], [xe - 40, 68], W3);
  }
  add('edge__square', edge(function (x, a, b) { return x + ' ' + a + ' L' + x + ' ' + b; }), { prefer: true });
  add('edge__eased', edge(function (x, a, b) { return (x - 6) + ' ' + a + ' Q' + x + ' ' + a + ' ' + x + ' ' + (a + 6) + ' L' + x + ' ' + (b - 6) + ' Q' + x + ' ' + b + ' ' + (x - 6) + ' ' + b; }), { prefer: true });
  add('edge__bevel', edge(function (x, a, b) { return (x - 20) + ' ' + a + ' L' + x + ' ' + (a + 18) + ' L' + x + ' ' + b; }), { prefer: true });
  add('edge__bullnose', edge(function (x, a, b) { var r = (b - a) / 2; return (x - r) + ' ' + a + ' A' + r + ' ' + r + ' 0 0 1 ' + (x - r) + ' ' + b; }), { prefer: true });
  add('edge__knife', edge(function (x, a, b) { return (x - 4) + ' ' + a + ' Q' + (x + 4) + ' ' + (a + 2) + ' ' + (x + 2) + ' ' + (a + 7) + ' L' + (x - 48) + ' ' + b; }), { prefer: true });
  add('edge__live', edge(function (x, a, b) { return (x - 10) + ' ' + a + ' C' + (x + 6) + ' ' + (a + 8) + ' ' + (x - 8) + ' ' + (a + 22) + ' ' + (x + 4) + ' ' + (a + 30) + ' C' + (x + 8) + ' ' + (a + 36) + ' ' + (x - 2) + ' ' + b + ' ' + (x - 12) + ' ' + b; }), { prefer: true });

  /* ================================================================== ISI DALAM KABINET */
  function cell(extra) {
    var x0 = 52, y0 = 30, x1 = 188, y1 = 206, t = 10;
    return path('M' + x0 + ' ' + y0 + ' L' + x1 + ' ' + y0 + ' L' + x1 + ' ' + y1 + ' L' + x0 + ' ' + y1 + ' Z', W1) + path('M' + (x0 + t) + ' ' + (y0 + t) + ' L' + (x1 - t) + ' ' + (y0 + t) + ' L' + (x1 - t) + ' ' + (y1 - t) + ' L' + (x0 + t) + ' ' + (y1 - t) + ' Z', W2) +
      line([x0 + t, y0 + t], [x0 + t + 16, y0 + t + 12], W3) + line([x1 - t, y0 + t], [x1 - t - 16, y0 + t + 12], W3) + line([x0 + t, y1 - t], [x0 + t + 16, y1 - t - 12], W3) + line([x1 - t, y1 - t], [x1 - t - 16, y1 - t - 12], W3) +
      path('M' + (x0 + t + 16) + ' ' + (y0 + t + 12) + ' L' + (x1 - t - 16) + ' ' + (y0 + t + 12) + ' L' + (x1 - t - 16) + ' ' + (y1 - t - 12) + ' L' + (x0 + t + 16) + ' ' + (y1 - t - 12) + ' Z', W3) + extra(x0 + t, y0 + t, x1 - t, y1 - t);
  }
  var P2 = { prefer: true };
  add('interior__shelf', cell(function (x0, y0, x1, y1) {
    var s = ''; [92, 140].forEach(function (y) { s += poly([[x0, y], [x1, y], [x1 - 16, y - 12], [x0 + 16, y - 12]], W2) + line([x0, y], [x1, y], W1) + line([x0, y + 5], [x1, y + 5], W2); [x0 + 22, x1 - 22].forEach(function (x) { s += dot(x, y + 14, 2); dot(x, y + 24, 2); s += dot(x, y + 24, 2); }); });
    return s;
  }), P2);
  add('interior__hang', cell(function (x0, y0, x1, y1) {
    var s = line([x0 + 4, y0 + 30], [x1 - 4, y0 + 30], 3.4);
    [96, 120, 144].forEach(function (x) { s += path('M' + x + ' ' + (y0 + 30) + ' q0 -8 6 -8 q6 0 6 6 q0 5 -6 8 L' + (x - 22) + ' ' + (y0 + 52) + ' L' + (x + 22) + ' ' + (y0 + 52) + ' L' + x + ' ' + (y0 + 38), W2); s += path('M' + (x - 20) + ' ' + (y0 + 54) + ' L' + (x - 24) + ' ' + (y0 + 120) + ' L' + (x + 24) + ' ' + (y0 + 120) + ' L' + (x + 20) + ' ' + (y0 + 54), W3); });
    return s;
  }), P2);
  add('interior__inner', cell(function (x0, y0, x1, y1) {
    var s = line([x0, 112], [x1, 112], W2);
    s += poly([[x0 + 12, 142], [x1 - 12, 142], [x1 - 12, 176], [x0 + 12, 176]], W1) + line([100, 158], [140, 158], 3.2) + poly([[x0 + 12, 142], [x0 + 26, 132], [x1 - 26, 132], [x1 - 12, 142]], W2);
    return s;
  }), P2);
  add('interior__mirror', (function () {
    var s = poly([[66, 28], [174, 28], [174, 212], [66, 212]], W1) + poly([[80, 42], [160, 42], [160, 198], [80, 198]], W2);
    s += line([92, 96], [132, 56], W2) + line([96, 120], [148, 68], W2) + line([110, 180], [150, 140], W3);
    return s + line([174, 28], [190, 40], W2) + line([190, 40], [190, 220], W2) + line([174, 212], [190, 220], W2);
  })(), P2);
  add('interior__led', cell(function (x0, y0, x1, y1) {
    var s = line([x0 + 8, y0 + 8], [x1 - 8, y0 + 8], 4.4) + line([x0, 150], [x1, 150], W1);
    for (var i = 0; i < 7; i++) { var x = x0 + 18 + i * (x1 - x0 - 36) / 6; s += line([x, y0 + 20], [x + (x - 120) * .25, y0 + 90], W3, DASH2); }
    return s;
  }), P2);
  add('interior__lock', (function () {
    var s = poly([[58, 34], [182, 34], [182, 206], [58, 206]], W1) + circ(120, 104, 13, W1) + path('M114 112 L110 142 L130 142 L126 112', W1);
    return s + path('M150 160 a10 10 0 1 1 0.1 0 M160 160 L196 160 M186 160 L186 170 M178 160 L178 168', W2);
  })(), P2);
  add('interior__soft', (function () {   // engsel mangkuk + peredam, panah menutup perlahan
    var s = poly([[40, 60], [100, 60], [100, 190], [40, 190]], W1) + circ(78, 100, 15, W1) + circ(78, 100, 8, W3) + poly([[90, 92], [150, 92], [150, 108], [90, 108]], W2) + line([150, 100], [176, 100], W2);
    s += poly([[118, 120], [172, 120], [172, 136], [118, 136]], W2) + line([128, 128], [162, 128], W3, DASH2);
    s += path('M190 170 A60 60 0 0 0 130 110', W2, DASH) + path('M184 156 L190 170 L176 172', W2);
    return s;
  })(), P2);
  add('interior__cable', (function () {
    var b = blk(120, 110, 180, 120, 18, 1), c = quadPt(b.top, .62, .45);
    return b.draw() + ell(c[0], c[1], 17, 10, W1) + ell(c[0], c[1], 11, 6, W2) + path('M' + f(c[0] - 2) + ' ' + f(c[1] + 3) + ' C' + f(c[0] - 6) + ' ' + f(c[1] + 60) + ' ' + f(c[0] + 30) + ' ' + f(c[1] + 70) + ' ' + f(c[0] + 26) + ' ' + f(c[1] + 104), W1) + poly([[c[0] + 18, c[1] + 104], [c[0] + 34, c[1] + 104], [c[0] + 34, c[1] + 122], [c[0] + 18, c[1] + 122]], W2);
  })(), P2);

  /* ================================================================== TAMBAHAN / AKSESORI */
  // sofa bed: sofa dengan kasur ditarik keluar (tampak samping)
  add('extras__sofabed', zoom(path('M30 96 L30 150 L84 150 L84 120 L76 112 L44 112 L44 96 Z', W1) + path('M30 96 Q30 74 50 74 L58 74 Q70 74 70 92 L70 112', W1) +
    poly([[84, 130], [212, 130], [212, 146], [84, 146]], W1) + line([92, 138], [204, 138], W3, DASH2) + line([36, 150], [36, 164], W1) + line([200, 146], [200, 164], W1) + line([150, 146], [150, 164], W2) + line([24, 164], [216, 164], W2) +
    path('M100 112 L140 112 M132 106 L140 112 L132 118', W2), 1.15, 120, 122), P2);
  add('extras__recliner', path('M40 118 L40 168 L132 168 L132 128 L74 128 L52 70 L36 74 Z', W1) + path('M132 136 L190 118 L196 130 L136 150', W1) + line([56, 168], [56, 182], W1) + line([118, 168], [118, 182], W1) + line([30, 182], [214, 182], W2) +
    path('M70 56 A60 60 0 0 0 30 98', W2, DASH) + path('M176 96 A50 50 0 0 1 206 120', W2, DASH), P2);
  add('extras__removable', (function () { var b = blk(120, 122, 180, 140, 40, 1), s = b.draw(), a = b.front[3], c = b.front[2]; var z = ''; for (var i = 0; i <= 26; i++) { var p = lerp([a[0], a[1] + 22], [c[0], c[1] + 22], i / 26); z += line([p[0], p[1] - 3], [p[0], p[1] + 3], W3); } var e = lerp([a[0], a[1] + 22], [c[0], c[1] + 22], .7); return s + line([a[0], a[1] + 22], [c[0], c[1] + 22], W2) + z + poly([[e[0] - 4, e[1]], [e[0] + 4, e[1]], [e[0] + 4, e[1] + 16], [e[0] - 4, e[1] + 16]], W2); })(), P2);
  add('extras__glides', (function () { var s = path('M108 30 L132 30 L128 150 L112 150 Z', W1) + ell(120, 160, 22, 8, W1) + path('M98 160 L98 168 Q120 180 142 168 L142 160', W1); for (var i = 0; i < 6; i++) s += line([102 + i * 7, 170], [104 + i * 7, 176], W3); return s + line([40, 196], [200, 196], W2) + path('M168 112 A44 44 0 0 1 186 156', W2, DASH2); })(), P2);
  add('extras__stack', (function () { var ch = function (dx, dy) { return path('M' + (60 + dx) + ' ' + (40 + dy) + ' L' + (64 + dx) + ' ' + (110 + dy) + ' L' + (150 + dx) + ' ' + (110 + dy), W1) + line([64 + dx, 110 + dy], [60 + dx, 170 + dy], W1) + line([144 + dx, 110 + dy], [150 + dx, 170 + dy], W1) + line([62 + dx, 60 + dy], [84 + dx, 60 + dy], W2); }; return zoom(ch(0, 0) + ch(16, 14) + line([40, 198], [200, 198], W2), 1.15, 110, 118); })(), P2);
  add('kursi/dining:extras__handle', path('M66 30 L174 30 Q182 30 182 38 L182 132 L58 132 L58 38 Q58 30 66 30 Z', W1) + path('M98 52 L142 52 Q150 52 150 60 Q150 68 142 68 L98 68 Q90 68 90 60 Q90 52 98 52 Z', W1) + line([58, 132], [58, 206], W1) + line([182, 132], [182, 206], W1) + poly([[46, 132], [194, 132], [194, 146], [46, 146]], W1), P2);
  add('extras__extend', (function () { var s = poly([[24, 92], [96, 92], [96, 148], [24, 148]], W1) + poly([[144, 92], [216, 92], [216, 148], [144, 148]], W1) + poly([[100, 92], [140, 92], [140, 148], [100, 148]], W2, true, DASH2); return s + path('M60 120 L30 120 M38 112 L30 120 L38 128 M180 120 L210 120 M202 112 L210 120 L202 128', W2) + line([24, 160], [216, 160], W3) + line([24, 156], [24, 164], W3) + line([216, 156], [216, 164], W3); })(), P2);
  add('extras__cable', (function () { var b = blk(120, 100, 190, 110, 14, 1), c = quadPt(b.top, .6, .5); return b.draw() + ell(c[0], c[1], 16, 9, W1) + ell(c[0], c[1], 10, 5.5, W2) + path('M' + f(c[0]) + ' ' + f(c[1] + 4) + ' C' + f(c[0] - 4) + ' ' + f(c[1] + 60) + ' ' + f(c[0] + 34) + ' ' + f(c[1] + 66) + ' ' + f(c[0] + 30) + ' ' + f(c[1] + 110), W1); })(), P2);
  add('extras__socket', (function () { var b = blk(120, 132, 190, 120, 14, 1), c = quadPt(b.top, .55, .45); var bx = blk(c[0], c[1] - 26, 50, 22, 46, 1); return b.draw() + bx.draw() + (function () { var f1 = quadPt(bx.front, .32, .4), f2 = quadPt(bx.front, .7, .4); return circ(f1[0], f1[1], 5, W2) + circ(f2[0], f2[1], 5, W2) + dot(f1[0] - 1.6, f1[1], 1) + dot(f1[0] + 1.6, f1[1], 1) + dot(f2[0] - 1.6, f2[1], 1) + dot(f2[0] + 1.6, f2[1], 1); })(); })(), P2);
  add('extras__protect', (function () { var b = blk(120, 140, 190, 130, 16, 1), s = b.draw(); [[.3, .4, 1], [.55, .3, .8], [.5, .62, 1.2], [.75, .55, .9]].forEach(function (q) { var c = quadPt(b.top, q[0], q[1]); s += path('M' + f(c[0]) + ' ' + f(c[1] - 14 * q[2]) + ' Q' + f(c[0] + 8 * q[2]) + ' ' + f(c[1] - 2) + ' ' + f(c[0]) + ' ' + f(c[1] + 2) + ' Q' + f(c[0] - 8 * q[2]) + ' ' + f(c[1] - 2) + ' ' + f(c[0]) + ' ' + f(c[1] - 14 * q[2]) + ' Z', W2) + ell(c[0], c[1] + 4, 9 * q[2], 3.6 * q[2], W3); }); return s + path('M120 28 L148 38 L148 58 Q148 76 120 86 Q92 76 92 58 L92 38 Z', W1) + path('M108 56 L117 65 L134 46', W2); })(), P2);
  add('extras__lift', path('M30 150 L30 186 M210 150 L210 186 M24 186 L216 186', W1) + poly([[30, 140], [210, 140], [210, 156], [30, 156]], W1) + poly([[60, 74], [200, 64], [201, 80], [61, 90]], W1) + path('M70 136 L88 90 M150 136 L170 86', W2) + path('M116 60 L130 36 M122 38 L130 36 L132 44', W2), P2);
  add('extras__charger', (function () { var b = blk(120, 150, 190, 130, 14, 1), c = quadPt(b.top, .5, .5); return b.draw() + '<g transform="translate(' + f(c[0]) + ' ' + f(c[1]) + ') scale(1 .58) rotate(45)">' + path('M-20 -34 L20 -34 Q26 -34 26 -28 L26 28 Q26 34 20 34 L-20 34 Q-26 34 -26 28 L-26 -28 Q-26 -34 -20 -34 Z', W1) + '</g>' + path('M100 64 Q120 50 140 64 M92 52 Q120 32 148 52 M108 76 Q120 68 132 76', W2); })(), P2);
  add('extras__led', (function () { var b = blk(120, 92, 190, 90, 14, 1), s = b.draw(), a = b.front[3], c = b.front[2]; s += line([a[0] + 6, a[1] + 20], [c[0] - 6, c[1] + 20], 4); for (var i = 0; i < 7; i++) { var p = lerp([a[0], a[1] + 26], [c[0], c[1] + 26], (i + .5) / 7); s += line(p, [p[0] + (p[0] - 120) * .2, p[1] + 64], W3, DASH2); } return s; })(), P2);
  add('extras__lock', (function () { var s = poly([[40, 70], [200, 70], [200, 150], [40, 150]], W1) + line([94, 110], [146, 110], 3.4) + circ(120, 128, 7, W2) + line([120, 132], [120, 140], W2); return s + line([40, 70], [58, 58], W2) + line([58, 58], [218, 58], W2) + line([218, 58], [218, 138], W2) + line([200, 150], [218, 138], W2) + path('M150 182 a9 9 0 1 1 0.1 0 M159 182 L192 182 M184 182 L184 191 M176 182 L176 189', W2); })(), P2);
  add('extras__usb', (function () { var s = poly([[66, 64], [174, 64], [174, 176], [66, 176]], W1) + poly([[96, 92], [144, 92], [144, 112], [96, 112]], W2) + poly([[96, 128], [144, 128], [144, 148], [96, 148]], W2); return s + line([104, 102], [136, 102], 3.2) + line([110, 138], [130, 138], 3.2) + line([174, 64], [190, 52], W2) + line([190, 52], [190, 164], W2) + line([174, 176], [190, 164], W2) + line([66, 64], [82, 52], W2) + line([82, 52], [190, 52], W2); })(), P2);
  add('extras__mattressinc', (function () { var b = blk(120, 128, 160, 190, 34, .95), s = b.draw(); for (var i = 1; i < 5; i++) s += onFace(b.top, [[i / 5, 0, i / 5, 1]], W3, DASH2); for (i = 1; i < 6; i++) s += onFace(b.top, [[0, i / 6, 1, i / 6]], W3, DASH2); return s + onFace(b.front, [[0, .5, 1, .5]], W3) + onFace(b.side, [[0, .5, 1, .5]], W3); })(), P2);
  // dua warna: kursi tampak depan, badan luar diarsir
  add('trim__twoTone', (function () { var out = 'M40 70 L72 70 L72 132 L168 132 L168 70 L200 70 L200 176 L40 176 Z'; var id = 't' + (++uid); return '<clipPath id="' + id + '"><path d="' + out + '"/></clipPath><g clip-path="url(#' + id + ')">' + diag([30, 60, 210, 180], 6, 1.2) + '</g>' + path(out, W1) + path('M72 40 L168 40 L168 132 L72 132 Z', W1) + poly([[72, 132], [168, 132], [168, 156], [72, 156]], W1) + line([52, 176], [52, 192], W1) + line([188, 176], [188, 192], W1); })(), P2);

  /* ================================================================== BAHAN DUDUKAN / TOP (khusus sub) */
  add('kursi/bench:top__upholstered', (function () { var b = blk(120, 126, 196, 96, 30, 1); return b.draw() + onFace(b.front, [[0, .2, 1, .2]], W3, DASH2) + onFace(b.top, [[0, .92, 1, .92], [.97, 0, .97, 1]], W3, DASH2); })(), P2);
  add('kursi/bench:top__wood', (function () { var b = blk(120, 126, 196, 96, 18, 1), s = grainTop(b, 5), c = quadPt(b.front, .8, 1.5); for (var i = 1; i < 5; i++) s += clip(b.front, ell(c[0], c[1], i * 9, i * 6, W3)); return s + b.draw(); })(), P2);
  function weave(q, n) { var s = ''; for (var i = 1; i < n; i++) { var t = i / n; s += onFace(q, [[t, 0, t, 1], [0, t, 1, t]], W3); } for (i = 0; i < n; i++) for (var j = 0; j < n; j++) if ((i + j) % 2) { var c = quadPt(q, (i + .5) / n, (j + .5) / n); s += dot(c[0], c[1], 1.2); } return s; }
  add('kursi/bench:top__rattan', (function () { var b = blk(120, 126, 196, 96, 18, 1); return weave(b.top, 12) + b.draw(); })(), P2);
  function seatSq(pattern) { var b = blk(120, 112, 150, 150, 14, 1); return pattern(b) + b.draw() + (function () { var s = ''; [b.front[3], b.front[2], b.side[2]].forEach(function (p) { s += line(p, [p[0], p[1] + 56], W1); }); return s; })(); }
  add('kursi/dining:cushion__cord', seatSq(function (b) { var s = ''; for (var i = 1; i < 10; i++) { var t = i / 10; s += onFace(b.top, [[t, .05, t, .95]], i % 2 ? W2 : W3); } for (i = 1; i < 10; i++) { var t2 = i / 10; s += onFace(b.top, [[.05, t2, .95, t2]], W3); } return s; }), P2);
  add('kursi/dining:cushion__cane', seatSq(function (b) { var q = [quadPt(b.top, .1, .1), quadPt(b.top, .9, .1), quadPt(b.top, .9, .9), quadPt(b.top, .1, .9)], s = poly(q, W2), m = ''; for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { var c = quadPt(q, (i + .5) / 8, (j + .5) / 8); m += ell(c[0], c[1], 5, 3, W3); } return s + m + onFace(q, [[0, 0, 1, 1], [1, 0, 0, 1]], .8); }), P2);
  add('kursi/stool:cushion__cord', (function () { var s = ell(120, 90, 74, 34, W1) + path('M46 90 L46 104 Q120 150 194 104 L194 90', W1), m = ''; for (var i = -8; i <= 8; i++) { m += line([120 + i * 9 - 40, 50], [120 + i * 9 + 40, 130], W3) + line([120 + i * 9 + 40, 50], [120 + i * 9 - 40, 130], W3); } var id = 's' + (++uid); return '<clipPath id="' + id + '"><ellipse cx="120" cy="90" rx="70" ry="31"/></clipPath><g clip-path="url(#' + id + ')">' + m + '</g>' + s + line([70, 122], [64, 206], W1) + line([170, 122], [176, 206], W1) + line([104, 132], [102, 200], W2) + line([136, 132], [138, 200], W2); })(), P2);


  /* ================================================================== Y3 · PILIHAN BEDA BAHAN (garis 3D tidak bisa membedakan) */
  var F = { force: true };
  // badan & laci meja: senada top (serat kayu) / dicat (HPL / duco)
  function drawerFront(x0, y0, x1, y1) { var h = (y1 - y0) / 3, s = ''; for (var i = 1; i < 3; i++) s += line([x0, y0 + h * i], [x1, y0 + h * i], W2); for (i = 0; i < 3; i++) s += line([(x0 + x1) / 2 - 14, y0 + h * i + h / 2], [(x0 + x1) / 2 + 14, y0 + h * i + h / 2], W1); return s; }
  add('body__same', door(function (x0, y0, x1, y1) { var s = ''; for (var i = 1; i < 8; i++) { var x = x0 + i * (x1 - x0) / 8; s += path('M' + f(x) + ' ' + (y0 + 4) + ' C' + f(x + 6) + ' ' + (y0 + 60) + ' ' + f(x - 6) + ' ' + (y0 + 120) + ' ' + f(x + 2) + ' ' + (y1 - 4), W3); } return s + drawerFront(x0, y0, x1, y1); }), F);
  add('body__paint', door(function (x0, y0, x1, y1) { return drawerFront(x0, y0, x1, y1) + path('M' + (x1 - 64) + ' ' + (y0 - 18) + ' l26 0 l0 12 l-26 0 z', W2) + line([x1 - 51, y0 - 6], [x1 - 51, y0 + 6], W2) + line([x1 - 64, y0 - 12], [x1 - 70, y0 - 12], W2); }, { r: 6 }), F);

  // rangka (ranjang susun / loft / anak; kursi makan & stool): tiang kayu / dicat / pipa besi / campuran
  function rail(post) { return line([30, 62], [210, 62], W1) + line([30, 74], [210, 74], W2) + line([30, 62], [30, 74], W2) + line([210, 62], [210, 74], W2) + post + line([24, 212], [216, 212], W2); }
  var postWood = path('M100 74 L136 74 L136 208 L100 208 Z', W1) + path('M110 82 Q116 140 112 200', W3) + path('M124 80 Q120 136 126 202', W3) + path('M130 90 Q128 120 131 150', W3);
  var postPaint = path('M100 74 L136 74 L136 208 L100 208 Z', W1) + line([108, 84], [108, 196], W2) + path('M124 74 Q124 92 128 98 Q132 92 132 74', W2);
  var postMetal = path('M110 74 L126 74 L126 208 L110 208 Z', W1) + line([115, 84], [115, 198], W3) + line([121, 88], [121, 118], W2) + ell(118, 208, 10, 3, W2);
  var bedFrame = { wood: rail(postWood), painted: rail(postPaint), metal: rail(postMetal) };
  ['bunk', 'loft', 'kids'].forEach(function (sb) { for (var k in bedFrame) add('divan/' + sb + ':frame__' + k, bedFrame[k], F); });
  function seatOn(leg) { return path('M40 70 L200 70 L200 92 L40 92 Z', W1) + line([40, 70], [60, 56], W2) + line([60, 56], [214, 56], W2) + line([214, 56], [200, 70], W2) + line([214, 56], [214, 78], W2) + line([214, 78], [200, 92], W2) + leg + line([24, 212], [216, 212], W2); }
  var legWood = path('M66 92 L88 92 L84 208 L70 208 Z', W1) + path('M74 100 Q78 150 76 200', W3) + path('M152 92 L174 92 L170 208 L156 208 Z', W1) + path('M160 100 Q164 150 162 200', W3);
  var legMetal = path('M72 92 L82 92 L82 208 L72 208 Z', W1) + line([76, 100], [76, 200], W3) + path('M158 92 L168 92 L168 208 L158 208 Z', W1) + line([162, 100], [162, 200], W3);
  var seatGrain = '';
  for (var gi = 1; gi < 4; gi++) seatGrain += path('M' + (44 + gi * 2) + ' ' + (70 + gi * 5.5) + ' C100 ' + (66 + gi * 6) + ' 150 ' + (74 + gi * 5) + ' ' + (198 - gi) + ' ' + (70 + gi * 5.5), W3);
  var chairFrame = { wood: seatOn(legWood + seatGrain), metal: seatOn(legMetal + line([50, 81], [190, 81], W3)), mix: seatOn(legMetal + seatGrain) };
  ['dining', 'stool'].forEach(function (sb) { for (var k in chairFrame) add('kursi/' + sb + ':frame__' + k, chairFrame[k], F); });

  // jenis kaca pintu kabinet (bar)
  function glassDoor(fill) { return door(function (x0, y0, x1, y1) { var g = [[x0 + 16, y0 + 16], [x1 - 16, y0 + 16], [x1 - 16, y1 - 16], [x0 + 16, y1 - 16]]; return poly(g, W2) + clip(g, fill(x0 + 16, y0 + 16, x1 - 16, y1 - 16)) + line([x1 - 8, (y0 + y1) / 2 - 18], [x1 - 8, (y0 + y1) / 2 + 18], W1); }); }
  var refl = function (x0, y0) { return line([x0 + 10, y0 + 60], [x0 + 60, y0 + 10], W2) + line([x0 + 18, y0 + 88], [x0 + 88, y0 + 18], W2); };
  add('glassType__clear', glassDoor(function (x0, y0) { return refl(x0, y0); }), F);
  add('glassType__fluted', glassDoor(function (x0, y0, x1, y1) { var s = ''; for (var x = x0 + 7; x < x1; x += 7) s += line([x, y0], [x, y1], W3); return s; }), F);
  add('glassType__bronze', glassDoor(function (x0, y0, x1, y1) { return diag([x0, y0, x1, y1], 7, .9) + refl(x0, y0); }), F);
  add('glassType__frosted', glassDoor(function (x0, y0, x1, y1) { var s = ''; for (var y = y0 + 6, r = 0; y < y1; y += 9, r++) for (var x = x0 + 6 + (r % 2) * 4.5; x < x1; x += 9) s += dot(x, y, 1.2); return s; }), F);

  // panel privasi meja kantor: tanpa / kain / akrilik / kaca
  function screen(body) { return poly([[26, 150], [214, 150], [214, 164], [26, 164]], W1) + line([26, 150], [44, 138], W2) + line([214, 150], [226, 140], W2) + line([44, 138], [226, 138], W2) + line([226, 138], [226, 152], W2) + line([214, 164], [226, 152], W2) + body + line([60, 164], [60, 214], W2) + line([180, 164], [180, 214], W2); }
  var scr = [[54, 48], [196, 48], [196, 140], [54, 140]];
  add('meja/office:screen__none', screen(poly(scr, W2, true, DASH)), F);
  add('meja/office:screen__fabric', screen(poly(scr, W1) + clip(scr, (function () { var s = ''; for (var i = 0; i < 22; i++) s += line([54 + i * 7, 48], [54 + i * 7, 140], .9) + line([54, 48 + i * 5], [196, 48 + i * 5], .9); return s; })())), F);
  add('meja/office:screen__acrylic', screen(path('M66 48 L184 48 Q196 48 196 60 L196 140 L54 140 L54 60 Q54 48 66 48 Z', W1) + line([70, 112], [110, 66], W2) + line([88, 124], [136, 70], W2)), F);
  add('meja/office:screen__glass', screen(poly(scr, W1) + poly([[60, 54], [190, 54], [190, 134], [60, 134]], W3) + line([74, 116], [112, 70], W2) + line([92, 126], [136, 74], W2) + poly([[86, 134], [98, 134], [98, 152], [86, 152]], W2) + poly([[152, 134], [164, 134], [164, 152], [152, 152]], W2)), F);

  // panel dinding di belakang kabinet gantung: tanpa / polos / fluted / bilah
  function wallP(panel) { return panel + poly([[46, 138], [194, 138], [194, 176], [46, 176]], W1) + line([46, 138], [58, 130], W2) + line([58, 130], [204, 130], W2) + line([204, 130], [194, 138], W2) + line([204, 130], [204, 166], W2) + line([204, 166], [194, 176], W2) + line([120, 138], [120, 176], W2) + line([88, 157], [100, 157], W2) + line([140, 157], [152, 157], W2); }
  var wp = [[62, 22], [178, 22], [178, 218], [62, 218]];
  add('wallPanel__none', wallP(poly(wp, W2, true, DASH)), F);
  add('wallPanel__flat', wallP(poly(wp, W1) + line([70, 30], [170, 30], W3)), F);
  add('wallPanel__fluted', wallP(poly(wp, W1) + clip(wp, (function () { var s = ''; for (var x = 68; x < 178; x += 7) s += line([x, 22], [x, 218], W3); return s; })())), F);
  add('wallPanel__slat', wallP((function () { var s = ''; for (var x = 62; x < 176; x += 14) s += poly([[x, 22], [x + 8, 22], [x + 8, 218], [x, 218]], W2); return s; })()), F);

  // panel depan meja executive: terbuka / polos / fluted / kulit
  function exFront(panel) {
    return poly([[20, 52], [220, 52], [220, 66], [20, 66]], W1) + line([20, 52], [36, 40], W2) + line([36, 40], [232, 40], W2) + line([232, 40], [220, 52], W2) + line([232, 40], [232, 54], W2) + line([232, 54], [220, 66], W2) +
      poly([[26, 66], [70, 66], [70, 208], [26, 208]], W1) + poly([[170, 66], [214, 66], [214, 208], [170, 208]], W1) + line([36, 104], [60, 104], W2) + line([36, 152], [60, 152], W2) + line([180, 104], [204, 104], W2) + line([180, 152], [204, 152], W2) + panel + line([14, 210], [226, 210], W2);
  }
  var fp = [[70, 70], [170, 70], [170, 178], [70, 178]];
  add('meja/executive:front__open', exFront(poly(fp, W2, true, DASH)), F);
  add('meja/executive:front__panel', exFront(poly(fp, W1)), F);
  add('meja/executive:front__fluted', exFront(poly(fp, W1) + clip(fp, (function () { var s = ''; for (var x = 76; x < 170; x += 7) s += line([x, 70], [x, 178], W3); return s; })())), F);
  add('meja/executive:front__leather', exFront(poly(fp, W1) + poly([[78, 78], [162, 78], [162, 170], [78, 170]], W3, true, DASH2) + clip(fp, (function () { var s = ''; for (var i = -6; i < 8; i++) s += line([70 + i * 20, 70], [70 + i * 20 + 108, 178], .9) + line([70 + i * 20 + 108, 70], [70 + i * 20, 178], .9); return s; })())), F);

  // plinth meja resepsionis (tampak samping): mundur / melayang / besi
  function counterSide(base) { return poly([[40, 34], [200, 34], [200, 46], [40, 46]], W1) + poly([[52, 46], [196, 46], [196, 176], [52, 176]], W1) + line([60, 60], [188, 60], W3) + base + line([20, 212], [220, 212], W2); }
  add('meja/reception:plinth__recessed', counterSide(poly([[70, 176], [180, 176], [180, 210], [70, 210]], W1) + diag([52, 176, 70, 210], 6, .9)), F);
  add('meja/reception:plinth__float', counterSide(poly([[96, 176], [156, 176], [156, 196], [96, 196]], W2) + line([60, 200], [190, 200], W3, DASH2)), F);
  add('meja/reception:plinth__metal', counterSide(poly([[52, 176], [196, 176], [196, 210], [52, 210]], W1) + line([58, 186], [190, 186], W2) + line([58, 192], [120, 192], W3)), F);

  // headboard panel kayu (serat) — panel polos tetap gambar 3D
  add('headboard__woodpanel', (function () {
    var hb = [[40, 30], [200, 30], [200, 132], [40, 132]], s = poly(hb, W1);
    var g = ''; for (var i = 1; i < 9; i++) { var x = 40 + i * 160 / 9; g += path('M' + f(x) + ' 34 C' + f(x + 5) + ' 64 ' + f(x - 5) + ' 98 ' + f(x + 2) + ' 128', W3); }
    return s + clip(hb, g) + poly([[30, 132], [210, 132], [226, 160], [14, 160]], W1) + line([14, 160], [14, 176], W2) + line([226, 160], [226, 176], W2) + line([14, 176], [226, 176], W1) + line([60, 140], [180, 140], W3);
  })(), F);

  // isi kabinet: cermin belakang, nampan tarik, USB, gantungan gelas, laci meja
  add('interior__mback', cell(function (x0, y0, x1, y1) { return line([x0 + 30, y1 - 40], [x0 + 80, y0 + 40], W2) + line([x0 + 44, y1 - 30], [x0 + 104, y0 + 46], W2) + line([x0 + 4, (y0 + y1) / 2], [x1 - 4, (y0 + y1) / 2], W2); }), P2);
  add('interior__tray', cell(function (x0, y0, x1, y1) { var y = (y0 + y1) / 2; return poly([[x0 + 6, y], [x1 - 6, y], [x1 + 14, y + 26], [x0 - 14, y + 26]], W1) + line([x0 - 14, y + 26], [x0 - 14, y + 34], W2) + line([x1 + 14, y + 26], [x1 + 14, y + 34], W2) + line([x0 - 14, y + 34], [x1 + 14, y + 34], W2) + line([(x0 + x1) / 2 - 12, y + 30], [(x0 + x1) / 2 + 12, y + 30], W1); }), P2);
  add('interior__usb', cell(function (x0, y0, x1, y1) { var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; return poly([[cx - 34, cy - 22], [cx + 34, cy - 22], [cx + 34, cy + 22], [cx - 34, cy + 22]], W1) + poly([[cx - 24, cy - 6], [cx - 6, cy - 6], [cx - 6, cy + 6], [cx - 24, cy + 6]], W2) + poly([[cx + 6, cy - 6], [cx + 24, cy - 6], [cx + 24, cy + 6], [cx + 6, cy + 6]], W2) + line([cx - 20, cy - 1], [cx - 10, cy - 1], W3) + line([cx + 10, cy - 1], [cx + 20, cy - 1], W3); }), P2);
  add('interior__stem', cell(function (x0, y0, x1, y1) { var s = line([x0 + 4, y0 + 8], [x1 - 4, y0 + 8], W2); for (var i = 0; i < 3; i++) { var cx = x0 + 22 + i * 32; s += line([cx, y0 + 8], [cx, y0 + 26], W2) + path('M' + (cx - 12) + ' ' + (y0 + 26) + ' L' + (cx + 12) + ' ' + (y0 + 26) + ' Q' + (cx + 12) + ' ' + (y0 + 58) + ' ' + cx + ' ' + (y0 + 60) + ' Q' + (cx - 12) + ' ' + (y0 + 58) + ' ' + (cx - 12) + ' ' + (y0 + 26), W2); } return s; }), P2);

  // putar dudukan stool: tidak / putar / putar + gas lift
  function stoolS(extra) { return ell(120, 60, 52, 14, W1) + path('M68 60 L68 72 Q120 92 172 72 L172 60', W1) + line([120, 82], [120, 196], W1) + ell(120, 200, 40, 10, W1) + extra; }
  add('swivel__no', stoolS(''), { prefer: true });
  add('swivel__yes', stoolS(path('M58 38 Q120 12 182 38', W2) + path('M174 30 L184 39 L171 43', W2)), { prefer: true });
  add('swivel__gas', stoolS(path('M58 38 Q120 12 182 38', W2) + path('M174 30 L184 39 L171 43', W2) + poly([[112, 100], [128, 100], [128, 160], [112, 160]], W2) + path('M146 104 L146 156 M140 112 L146 104 L152 112 M140 148 L146 156 L152 148', W2)), { prefer: true });

  // muka depan meja console / resepsionis: polos / fluted / cane / bilah / batu / LED
  function face(extra) { return door(function (x0, y0, x1, y1) { return extra(x0, y0, x1, y1) + line([x0 - 16, y0 - 2], [x1 + 28, y0 - 2], W1); }); }
  add('face__plain', face(function (x0, y0, x1, y1) { return line([x0 + 6, y0 + 8], [x1 - 6, y0 + 8], W3); }), F);
  add('face__fluted', face(function (x0, y0, x1, y1) { var s = ''; for (var x = x0 + 9; x < x1 - 4; x += 9) s += line([x, y0 + 3], [x, y1 - 3], W2); return s; }), F);
  S['face__cane'] = { svg: S['finish__cane'].svg, prefer: false, force: true };   // rotan = simbol finishing cane
  add('face__slats', face(function (x0, y0, x1, y1) { var s = ''; for (var x = x0 + 4; x < x1 - 8; x += 16) s += poly([[x, y0 + 3], [x + 9, y0 + 3], [x + 9, y1 - 3], [x, y1 - 3]], W2); return s; }), F);
  add('face__stone', face(function (x0, y0, x1, y1) { return path('M' + (x0 + 6) + ' ' + (y0 + 40) + ' Q' + (x0 + 50) + ' ' + (y0 + 70) + ' ' + (x0 + 40) + ' ' + (y0 + 110) + ' T' + (x1 - 10) + ' ' + (y1 - 20), W2) + path('M' + (x1 - 8) + ' ' + (y0 + 20) + ' Q' + (x0 + 70) + ' ' + (y0 + 50) + ' ' + (x0 + 80) + ' ' + (y0 + 90), W3) + path('M' + (x0 + 10) + ' ' + (y1 - 50) + ' Q' + (x0 + 40) + ' ' + (y1 - 40) + ' ' + (x0 + 60) + ' ' + (y1 - 10), W3); }), F);
  add('face__led', face(function (x0, y0, x1, y1) { var s = line([x0 + 8, y1 - 14], [x1 - 8, y1 - 14], W1); for (var i = 0; i < 6; i++) { var x = x0 + 18 + i * (x1 - x0 - 36) / 5; s += line([x, y1 - 22], [x, y1 - 34], W3); } return s; }), F);

  // sandaran stool anyaman (rotan) — pola tidak tampak di gambar 3D
  add('kursi/stool:backStyle__woven', (function () { var bk = [[60, 30], [180, 30], [180, 120], [60, 120]], m = ''; for (var i = -8; i < 14; i++) { m += line([60 + i * 12, 30], [60 + i * 12 + 90, 120], .9) + line([60 + i * 12 + 90, 30], [60 + i * 12, 120], .9); } return path('M60 120 L60 42 Q60 30 72 30 L168 30 Q180 30 180 42 L180 120', W1) + clip(bk, m) + ell(120, 132, 64, 14, W1) + line([70, 140], [62, 210], W1) + line([170, 140], [178, 210], W1) + line([96, 146], [94, 210], W2) + line([144, 146], [146, 210], W2); })(), { prefer: true });

  window.SYMBOLS = S;
})();
