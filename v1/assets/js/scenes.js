/* ==========================================================================
   XIONCO BUSINESS — Procedural placeholders untuk Main Frame A–D
   Dipakai selama video/GIF final belum ada. Begitu file video ditemukan
   (lihat manifest.js), canvas ini otomatis digantikan oleh video.

   Setiap scene digambar di "layar" 5 × 4 block (guideline orb):
   orb berdiameter 1 block, pusat di (4, 2) block.
   ========================================================================== */
window.XIONCO_SCENES = (function () {
  'use strict';

  var TAU = Math.PI * 2;
  var F = 4.6; // jarak kamera (perspektif)

  /* ---------------- utils ---------------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  /* Rotasi: Y lalu X (cy/sy = cos/sin yaw, cx/sx = cos/sin pitch) */
  function rotate(p, cy, sy, cx, sx) {
    var x = p[0] * cy + p[2] * sy;
    var z = -p[0] * sy + p[2] * cy;
    var y = p[1];
    return [x, y * cx - z * sx, y * sx + z * cx];
  }

  function fibonacci(n, rand, jitter) {
    var pts = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i + 0.5) / n * 2;
      var r = Math.sqrt(1 - y * y);
      var th = ga * i + (jitter ? (rand() - 0.5) * jitter : 0);
      pts.push(norm([Math.cos(th) * r, y + (jitter ? (rand() - 0.5) * jitter * 0.2 : 0), Math.sin(th) * r]));
    }
    return pts;
  }

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function vgrad(c, y0, y1, a, b) { var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function hgrad(c, x0, x1, a, b) { var g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

  function vignette(b, w, h, strength, cy) {
    var g = b.createRadialGradient(w / 2, h * (cy || 0.5), Math.min(w, h) * 0.32, w / 2, h * (cy || 0.5), Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
  }

  /* ---------------- base scene ---------------- */
  function Scene(canvas, impl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.impl = impl;
    this.t = impl.t0 || 0;
    this.ready = false;
  }
  /* orb = { x, y, r } dari engine (guideline: Ø 1 block, pusat (4, 2) block) */
  Scene.prototype.resize = function (w, h, dpr, orb, u, mode) {
    this.w = w; this.h = h; this.dpr = dpr; this.u = u; this.mode = mode || 'x';
    var W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    this.canvas.width = W; this.canvas.height = H;
    this.bg.width = W; this.bg.height = H;
    this.orb = { x: orb.x, y: orb.y, r: orb.r };
    var b = this.bg.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.impl.setup) this.impl.setup.call(this);
    this.impl.paint.call(this, b, w, h, u);
    this.ready = true;
    this.full = true;
    this.render(this.t);
  };
  /* Hanya area yang bergerak (dirty rect) yang digambar ulang tiap frame */
  Scene.prototype.render = function (t) {
    if (!this.ready) return;
    this.t = t;
    var c = this.ctx, d = this.dpr;
    var r = !this.full && this.impl.dirty ? this.impl.dirty.call(this) : null;
    this.full = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    if (r) {
      var x = Math.max(0, Math.floor(r.x * d)), y = Math.max(0, Math.floor(r.y * d));
      var w = Math.min(this.canvas.width - x, Math.ceil(r.w * d) + 2);
      var h = Math.min(this.canvas.height - y, Math.ceil(r.h * d) + 2);
      if (w <= 0 || h <= 0) return;
      c.drawImage(this.bg, x, y, w, h, x, y, w, h);
      c.save();
      c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.setTransform(d, 0, 0, d, 0, 0);
      this.impl.draw.call(this, c, t, this.w, this.h, this.u);
      c.restore();
    } else {
      c.drawImage(this.bg, 0, 0);
      c.setTransform(d, 0, 0, d, 0, 0);
      this.impl.draw.call(this, c, t, this.w, this.h, this.u);
    }
  };
  function orbBox(s, k) { var o = s.orb, R = o.r * k; return { x: o.x - R, y: o.y - R, w: R * 2, h: R * 2 }; }

  /* ======================================================================
     A — CATALOG : atelier dengan sofa, cahaya jendela & debu melayang
     ====================================================================== */
  function drawSofa(b, cx, fy, W) {
    var s = W, L = cx - W / 2, R = cx + W / 2;

    // bayangan lantai
    b.save();
    b.translate(cx, fy + s * 0.004);
    b.scale(1, 0.1);
    var sg = b.createRadialGradient(0, 0, 0, 0, 0, W * 0.62);
    sg.addColorStop(0, 'rgba(0,0,0,.62)');
    sg.addColorStop(0.6, 'rgba(0,0,0,.25)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = sg;
    b.beginPath(); b.arc(0, 0, W * 0.62, 0, TAU); b.fill();
    b.restore();

    // kaki
    b.fillStyle = '#1b1612';
    [L + s * 0.075, R - s * 0.075].forEach(function (x) {
      b.fillRect(x - s * 0.005, fy - s * 0.05, s * 0.01, s * 0.05);
    });

    // sandaran belakang
    rr(b, L + s * 0.035, fy - s * 0.425, W - s * 0.07, s * 0.3, s * 0.045);
    b.fillStyle = vgrad(b, fy - s * 0.425, fy - s * 0.12, '#a89884', '#7f705e'); b.fill();

    // bantal sandaran
    var bx0 = L + s * 0.118, bw = (W - s * 0.236) / 3;
    for (var i = 0; i < 3; i++) {
      rr(b, bx0 + i * bw + s * 0.004, fy - s * 0.4, bw - s * 0.008, s * 0.215, s * 0.045);
      b.fillStyle = vgrad(b, fy - s * 0.4, fy - s * 0.185, '#d3c6b1', '#a29280'); b.fill();
      b.strokeStyle = 'rgba(255,248,236,.18)'; b.lineWidth = 0.8; b.stroke();
    }

    // bantal hias
    function pillow(x, y, size, rot, col) {
      b.save(); b.translate(x, y); b.rotate(rot);
      rr(b, -size / 2, -size / 2, size, size, size * 0.28);
      b.fillStyle = vgrad(b, -size / 2, size / 2, col[0], col[1]); b.fill();
      b.strokeStyle = 'rgba(255,248,236,.16)'; b.lineWidth = 0.8; b.stroke();
      b.restore();
    }
    pillow(L + s * 0.2, fy - s * 0.25, s * 0.135, -0.2, ['#c8b9a1', '#998a75']);
    pillow(R - s * 0.2, fy - s * 0.25, s * 0.13, 0.17, ['#bcae97', '#8d7e6a']);

    // dudukan
    for (i = 0; i < 3; i++) {
      rr(b, bx0 + i * bw + s * 0.003, fy - s * 0.205, bw - s * 0.006, s * 0.09, s * 0.024);
      b.fillStyle = vgrad(b, fy - s * 0.205, fy - s * 0.115, '#ded2be', '#ab9b86'); b.fill();
    }
    // sisi depan dudukan
    rr(b, L + s * 0.1, fy - s * 0.13, W - s * 0.2, s * 0.07, s * 0.016);
    b.fillStyle = vgrad(b, fy - s * 0.13, fy - s * 0.06, '#a39480', '#7a6b59'); b.fill();
    // base
    rr(b, L + s * 0.03, fy - s * 0.075, W - s * 0.06, s * 0.035, s * 0.01);
    b.fillStyle = '#5a4e41'; b.fill();

    // lengan
    rr(b, L, fy - s * 0.275, s * 0.118, s * 0.235, s * 0.048);
    b.fillStyle = hgrad(b, L, L + s * 0.118, '#cdbfa9', '#9c8d79'); b.fill();
    rr(b, R - s * 0.118, fy - s * 0.275, s * 0.118, s * 0.235, s * 0.048);
    b.fillStyle = hgrad(b, R - s * 0.118, R, '#a99a86', '#7c6d5b'); b.fill();
    b.strokeStyle = 'rgba(255,248,236,.14)'; b.lineWidth = 0.8;
    rr(b, L, fy - s * 0.275, s * 0.118, s * 0.235, s * 0.048); b.stroke();
  }

  var atelier = {
    t0: 3.2,
    setup: function () {
      var r = rng(11);
      this.dust = [];
      for (var i = 0; i < 90; i++) {
        this.dust.push({ x: r(), y: r(), v: 0.012 + r() * 0.03, f: 0.3 + r() * 0.6, ph: r() * TAU, tw: 0.6 + r() * 1.6, a: 0.25 + r() * 0.6, s: 0.5 + r() * 1.3 });
      }
    },
    paint: function (b, w, h, u) {
      // sofa berdiri tepat di atas posisi play button (titik fokus = "orb" Frame A)
      var o = this.orb, floorY = o.y + o.r;
      var sw = this.mode === 'stack' ? w * 0.72 : u * 2.4;
      var hz = floorY - sw * 0.13;
      this.hz = hz;
      // dinding
      var wg = b.createLinearGradient(0, 0, 0, hz);
      wg.addColorStop(0, '#372f27'); wg.addColorStop(0.5, '#665949'); wg.addColorStop(1, '#8a7b67');
      b.fillStyle = wg;
      b.fillRect(0, 0, w, hz);
      // panel dinding (garis vertikal halus)
      b.fillStyle = 'rgba(0,0,0,.08)';
      for (var x = w * 0.08; x < w; x += u * 0.9) b.fillRect(x, 0, 1, hz);
      // cahaya jendela di dinding
      var rg = b.createRadialGradient(w * 0.16, h * 0.18, 0, w * 0.16, h * 0.18, w * 0.75);
      rg.addColorStop(0, 'rgba(255,236,206,.26)'); rg.addColorStop(1, 'rgba(255,236,206,0)');
      b.fillStyle = rg; b.fillRect(0, 0, w, hz);
      // lantai
      var fg = b.createLinearGradient(0, hz, 0, h);
      fg.addColorStop(0, '#5a4e41'); fg.addColorStop(1, '#1d1915');
      b.fillStyle = fg; b.fillRect(0, hz, w, h - hz);
      // garis papan lantai (perspektif)
      b.save();
      b.beginPath(); b.rect(0, hz, w, h - hz); b.clip();
      var vpX = w * 0.46, vpY = hz - h * 1.1;
      b.strokeStyle = 'rgba(0,0,0,.18)'; b.lineWidth = 1;
      for (var i = -16; i <= 16; i++) {
        var bx = w / 2 + i * w * 0.085;
        var tx = vpX + (bx - vpX) * ((hz - vpY) / (h - vpY));
        b.beginPath(); b.moveTo(tx, hz); b.lineTo(bx, h); b.stroke();
      }
      // pantulan cahaya di lantai
      var fr = b.createRadialGradient(w * 0.36, hz + (h - hz) * 0.3, 0, w * 0.36, hz + (h - hz) * 0.3, w * 0.45);
      fr.addColorStop(0, 'rgba(255,232,196,.13)'); fr.addColorStop(1, 'rgba(255,232,196,0)');
      b.fillStyle = fr; b.fillRect(0, hz, w, h - hz);
      b.restore();
      // plint
      b.fillStyle = 'rgba(255,240,215,.12)'; b.fillRect(0, hz - 1, w, 1);
      b.fillStyle = 'rgba(0,0,0,.28)'; b.fillRect(0, hz, w, Math.max(2, u * 0.035));

      // sofa
      drawSofa(b, o.x, floorY, sw);

      vignette(b, w, h, 0.55, 0.55);
    },
    draw: function (c, t, w, h, u) {
      var sway = Math.sin(t * 0.32) * w * 0.018;
      var pulse = 0.82 + 0.18 * Math.sin(t * 0.5);
      var x0 = w * 0.0 + sway, x1 = w * 0.3 + sway, x2 = w * 0.78 + sway * 2, x3 = w * 0.3 + sway * 2;
      c.save();
      c.globalCompositeOperation = 'screen';
      var beam = c.createLinearGradient(w * 0.1, 0, w * 0.5, h);
      beam.addColorStop(0, 'rgba(255,236,206,' + (0.17 * pulse) + ')');
      beam.addColorStop(0.7, 'rgba(255,236,206,' + (0.05 * pulse) + ')');
      beam.addColorStop(1, 'rgba(255,236,206,0)');
      c.fillStyle = beam;
      c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.lineTo(x2, h); c.lineTo(x3, h); c.closePath(); c.fill();

      for (var i = 0; i < this.dust.length; i++) {
        var p = this.dust[i];
        var py = (((p.y - t * p.v) % 1) + 1) % 1 * h;
        var k = py / h;
        var xl = x0 + (x3 - x0) * k, xr = x1 + (x2 - x1) * k;
        var px = xl + (xr - xl) * p.x + Math.sin(t * p.f + p.ph) * u * 0.07;
        var inside = Math.sin(Math.PI * Math.max(0, Math.min(1, (px - xl) / (xr - xl))));
        var a = p.a * inside * (0.45 + 0.55 * Math.sin(t * p.tw + p.ph)) * (1 - k * 0.6);
        if (a <= 0.02) continue;
        c.fillStyle = 'rgba(255,240,214,' + a.toFixed(3) + ')';
        c.beginPath(); c.arc(px, py, p.s, 0, TAU); c.fill();
      }
      c.restore();
    }
  };

  /* ======================================================================
     B — CUSTOMIZE : orb geodesic melayang di atas riak air
     ====================================================================== */
  var GEO = (function () {
    var t = (1 + Math.sqrt(5)) / 2;
    var V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    var Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var cache = {};
    function mid(a, b) {
      var k = a < b ? a + '_' + b : b + '_' + a;
      if (cache[k] != null) return cache[k];
      V.push(norm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2]));
      return (cache[k] = V.length - 1);
    }
    for (var s = 0; s < 2; s++) {
      var nf = [];
      Fc.forEach(function (f) {
        var a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]);
        nf.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]);
      });
      Fc = nf; cache = {};
    }
    // origami: titik tengah tiap segitiga ditekan ke dalam → lipatan bintang
    var T = [];
    Fc.forEach(function (f) {
      var a = V[f[0]], b = V[f[1]], c = V[f[2]];
      var m = norm([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);
      V.push([m[0] * 0.9, m[1] * 0.9, m[2] * 0.9]);
      var mi = V.length - 1;
      T.push([f[0], f[1], mi], [f[1], f[2], mi], [f[2], f[0], mi]);
    });
    return { V: V, T: T };
  })();

  var LIGHT = norm([-0.55, 0.7, 0.72]);
  var FILL = norm([0.7, -0.15, 0.7]);
  var HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

  function drawGeo(c, cx, cy, r, t) {
    var ay = t * 0.3 + 0.6, ax = 0.42 + Math.sin(t * 0.27) * 0.08;
    var cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    var V = GEO.V, T = GEO.T, P = new Array(V.length), S = new Array(V.length);
    var rr2 = r * (F - 1) / F;
    for (var i = 0; i < V.length; i++) {
      var p = rotate(V[i], cY, sY, cX, sX);
      P[i] = p;
      var k = F / (F - p[2]);
      S[i] = [cx + p[0] * rr2 * k, cy - p[1] * rr2 * k];
    }
    var faces = [];
    for (i = 0; i < T.length; i++) {
      var f = T[i], A = P[f[0]], B = P[f[1]], C = P[f[2]];
      var n = norm(cross(sub(B, A), sub(C, A)));
      if (dot(n, [A[0], A[1], A[2]]) < 0) { n = [-n[0], -n[1], -n[2]]; }
      // backface (normal menjauhi kamera)
      var cz = (A[2] + B[2] + C[2]) / 3;
      if (n[2] < -0.05 && cz < 0.2) continue;
      var d = Math.max(0, dot(n, LIGHT));
      var spec = Math.pow(Math.max(0, dot(n, HALF)), 28);
      var bounce = Math.max(0, -n[1]) * 0.35;
      var d2 = Math.max(0, dot(n, FILL));
      var lv = Math.min(1.08, 0.26 + 0.66 * d + 0.2 * d2);
      var col = [
        clamp255(70 + (240 - 70) * lv + spec * 70 + bounce * 40),
        clamp255(56 + (228 - 56) * lv + spec * 64 + bounce * 30),
        clamp255(42 + (208 - 42) * lv + spec * 52 + bounce * 18)
      ];
      faces.push({ z: cz, i: f, c: rgb(col) });
    }
    faces.sort(function (a, b) { return a.z - b.z; });
    c.lineJoin = 'round';
    c.lineWidth = 0.6;
    for (i = 0; i < faces.length; i++) {
      var fc = faces[i], a = S[fc.i[0]], b = S[fc.i[1]], d2 = S[fc.i[2]];
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d2[0], d2[1]); c.closePath();
      c.fillStyle = fc.c; c.strokeStyle = fc.c;
      c.fill(); c.stroke();
    }
    // rim light lembut
    var g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, 'rgba(255,248,236,.10)');
    g.addColorStop(0.75, 'rgba(255,248,236,0)');
    g.addColorStop(1, 'rgba(40,30,20,.18)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r * 1.0, 0, TAU); c.fill();
  }

  function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }

  var ripple = {
    t0: 4.4,
    dirty: function () { var top = this.orb.y - this.orb.r * 1.5; return { x: 0, y: top, w: this.w, h: this.h - top }; },
    paint: function (b, w, h, u) {
      var g = b.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#d2c3ab'); g.addColorStop(0.35, '#bba991'); g.addColorStop(0.6, '#9b8970'); g.addColorStop(1, '#5a4c3d');
      b.fillStyle = g; b.fillRect(0, 0, w, h);
      var o = this.orb;
      // cahaya dari atas
      var rg = b.createRadialGradient(o.x - u * 0.6, -h * 0.2, 0, o.x - u * 0.6, -h * 0.2, w * 0.9);
      rg.addColorStop(0, 'rgba(255,250,240,.32)'); rg.addColorStop(1, 'rgba(255,250,240,0)');
      b.fillStyle = rg; b.fillRect(0, 0, w, h);
      // permukaan air (pantulan horizontal)
      var wy = o.y + u * 0.98;
      var wg = b.createLinearGradient(0, wy - u * 1.6, 0, h);
      wg.addColorStop(0, 'rgba(255,248,236,0)');
      wg.addColorStop(0.35, 'rgba(255,248,236,.07)');
      wg.addColorStop(1, 'rgba(0,0,0,.12)');
      b.fillStyle = wg; b.fillRect(0, wy - u * 1.6, w, h);
      vignette(b, w, h, 0.42, 0.55);
    },
    draw: function (c, t, w, h, u) {
      var o = this.orb;
      var bob = Math.sin(t * 1.05) * u * 0.035;
      var wy = o.y + u * 0.98;
      c.save();
      for (var k = 0; k < 13; k++) {
        var ph = (((t * 0.07 + k / 13) % 1) + 1) % 1;
        var R = u * 0.32 + ph * u * 4.6;
        var a = Math.pow(1 - ph, 1.35) * smooth(0, 0.07, ph);
        c.lineWidth = 0.7 + ph * 2.4;
        c.strokeStyle = 'rgba(255,250,240,' + (a * 0.55).toFixed(3) + ')';
        ellipse(c, o.x, wy - 0.7, R, R * 0.25); c.stroke();
        c.strokeStyle = 'rgba(58,44,30,' + (a * 0.34).toFixed(3) + ')';
        ellipse(c, o.x, wy + 1.4 + ph * 2.2, R * 0.993, R * 0.25); c.stroke();
      }
      c.restore();
      // bayangan orb di air
      c.save();
      c.translate(o.x, wy);
      c.scale(1, 0.24);
      var sr = o.r * (1.3 - bob / u * 2);
      var sg = c.createRadialGradient(0, 0, 0, 0, 0, sr);
      sg.addColorStop(0, 'rgba(40,28,18,.42)'); sg.addColorStop(1, 'rgba(40,28,18,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, sr, 0, TAU); c.fill();
      c.restore();
      drawGeo(c, o.x, o.y + bob, o.r, t);
    }
  };

  /* ======================================================================
     C — WHOLESALE : orb partikel di ruang gelap
     ====================================================================== */
  var particles = {
    t0: 2.2,
    dirty: function () { return orbBox(this, 2.1); },
    setup: function () {
      var r = rng(29);
      var dirs = fibonacci(1500, r, 0.6);
      this.pts = dirs.map(function (d) {
        var big = r() < 0.14;
        return { d: d, amp: big ? 0.18 + r() * 0.65 : 0.01 + r() * 0.03, ph: r() * TAU, s: 0.5 + r() * 1.1, b: 0.55 + r() * 0.45, big: big };
      });
      this.buckets = [];
      for (var i = 0; i < 10; i++) this.buckets.push([]);
    },
    paint: function (b, w, h, u) {
      b.fillStyle = '#080706'; b.fillRect(0, 0, w, h);
      var o = this.orb;
      var g = b.createRadialGradient(o.x, o.y, 0, o.x, o.y, u * 1.7);
      g.addColorStop(0, 'rgba(150,122,88,.20)'); g.addColorStop(1, 'rgba(150,122,88,0)');
      b.fillStyle = g; b.fillRect(0, 0, w, h);
      var r = rng(7);
      for (var i = 0; i < 260; i++) {
        var a = 0.05 + r() * 0.35;
        b.fillStyle = 'rgba(255,240,220,' + a.toFixed(3) + ')';
        var s = 0.4 + r() * 0.9;
        b.fillRect(r() * w, r() * h, s, s);
      }
      vignette(b, w, h, 0.6, 0.5);
    },
    draw: function (c, t, w, h, u) {
      var o = this.orb, R = o.r * 0.9;
      var ay = t * 0.21 + 1.1, ax = 0.36 + Math.sin(t * 0.17) * 0.06;
      var cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
      var B = this.buckets, i, j;
      for (i = 0; i < B.length; i++) B[i].length = 0;
      for (i = 0; i < this.pts.length; i++) {
        var p = this.pts[i];
        var e = 0.5 - 0.5 * Math.cos(t * 0.55 + p.ph);
        var k = 1 + p.amp * e;
        var q = rotate(p.d, cY, sY, cX, sX);
        var z = q[2] * k;
        var pr = F / (F - z);
        var x = o.x + q[0] * k * R * pr, y = o.y - q[1] * k * R * pr;
        var depth = (q[2] + 1) / 2;
        var a = (0.1 + 0.9 * depth) * p.b * (p.big ? 1 - 0.55 * e : 1);
        var s = p.s * (0.7 + 0.7 * depth);
        var bi = Math.min(9, (a * 10) | 0);
        B[bi].push(x, y, s);
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (i = 0; i < B.length; i++) {
        var arr = B[i];
        if (!arr.length) continue;
        c.fillStyle = 'rgba(255,236,208,' + ((i + 0.5) / 10).toFixed(2) + ')';
        for (j = 0; j < arr.length; j += 3) c.fillRect(arr[j], arr[j + 1], arr[j + 2], arr[j + 2]);
      }
      var g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, R * 1.2);
      g.addColorStop(0, 'rgba(255,226,186,.07)'); g.addColorStop(1, 'rgba(255,226,186,0)');
      c.fillStyle = g; c.fillRect(o.x - R * 1.3, o.y - R * 1.3, R * 2.6, R * 2.6);
      c.restore();
    }
  };

  /* ======================================================================
     D — DESIGN SERVICES : orb tersusun dari kubus
     ====================================================================== */
  function randRot(r) {
    // matriks rotasi acak (euler)
    var a = r() * TAU, b = r() * TAU, g = r() * TAU;
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    return [
      [ca * cb, ca * sb * sg - sa * cg, ca * sb * cg + sa * sg],
      [sa * cb, sa * sb * sg + ca * cg, sa * sb * cg - ca * sg],
      [-sb, cb * sg, cb * cg]
    ];
  }
  var PAL_D = [[238, 231, 218], [238, 231, 218], [232, 224, 210], [214, 196, 165], [176, 148, 104], [112, 92, 68]];

  var cubes = {
    t0: 1.4,
    dirty: function () { return orbBox(this, 1.9); },
    setup: function () {
      var r = rng(41);
      var dirs = fibonacci(120, r, 0.4);
      this.cubes = dirs.map(function (d) {
        var m = randRot(r);
        var pick = r();
        var col = pick < 0.72 ? PAL_D[(r() * 3) | 0] : pick < 0.88 ? PAL_D[3] : pick < 0.96 ? PAL_D[4] : PAL_D[5];
        return {
          d: d, m: m, s: 0.2 + r() * 0.16, dist: 0.7 + r() * 0.08,
          ph: r() * TAU, amp: 0.35 + r() * 0.65, col: col
        };
      });
    },
    paint: function (b, w, h, u) {
      var g = b.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#a59b8d'); g.addColorStop(0.5, '#746a5e'); g.addColorStop(1, '#342e27');
      b.fillStyle = g; b.fillRect(0, 0, w, h);
      // kisi diagonal halus
      b.save();
      b.strokeStyle = 'rgba(255,250,240,.075)'; b.lineWidth = 1;
      var step = u * 1.05;
      for (var x = -h; x < w + h; x += step) {
        b.beginPath(); b.moveTo(x, 0); b.lineTo(x + h * 0.9, h); b.stroke();
        b.beginPath(); b.moveTo(x + h * 0.9, 0); b.lineTo(x, h); b.stroke();
      }
      b.restore();
      var o = this.orb;
      var rg = b.createRadialGradient(o.x, o.y, 0, o.x, o.y, u * 1.6);
      rg.addColorStop(0, 'rgba(255,246,230,.22)'); rg.addColorStop(1, 'rgba(255,246,230,0)');
      b.fillStyle = rg; b.fillRect(0, 0, w, h);
      vignette(b, w, h, 0.5, 0.5);
    },
    draw: function (c, t, w, h, u) {
      var o = this.orb, R = o.r * 0.86;
      var ay = t * 0.27 + 0.4, ax = 0.48 + Math.sin(t * 0.21) * 0.1;
      var cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
      var faces = [];
      for (var i = 0; i < this.cubes.length; i++) {
        var q = this.cubes[i];
        var br = q.amp * 0.26 * (0.5 - 0.5 * Math.cos(t * 0.8 + q.ph));
        var dd = q.dist + br;
        var ctr = rotate([q.d[0] * dd, q.d[1] * dd, q.d[2] * dd], cY, sY, cX, sX);
        var ax0 = rotate([q.m[0][0], q.m[1][0], q.m[2][0]], cY, sY, cX, sX);
        var ax1 = rotate([q.m[0][1], q.m[1][1], q.m[2][1]], cY, sY, cX, sX);
        var ax2 = rotate([q.m[0][2], q.m[1][2], q.m[2][2]], cY, sY, cX, sX);
        var hs = q.s / 2;
        var axes = [ax0, ax1, ax2];
        for (var k = 0; k < 3; k++) {
          for (var sgn = -1; sgn <= 1; sgn += 2) {
            var n = [axes[k][0] * sgn, axes[k][1] * sgn, axes[k][2] * sgn];
            if (n[2] <= 0.02) continue;
            var u1 = axes[(k + 1) % 3], u2 = axes[(k + 2) % 3];
            var fc = [ctr[0] + n[0] * hs, ctr[1] + n[1] * hs, ctr[2] + n[2] * hs];
            var pts = [];
            var sgnA = [1, 1, -1, -1], sgnB = [1, -1, -1, 1];
            for (var v = 0; v < 4; v++) {
              var px = fc[0] + (u1[0] * sgnA[v] + u2[0] * sgnB[v]) * hs;
              var py = fc[1] + (u1[1] * sgnA[v] + u2[1] * sgnB[v]) * hs;
              var pz = fc[2] + (u1[2] * sgnA[v] + u2[2] * sgnB[v]) * hs;
              var pr = F / (F - pz);
              pts.push(o.x + px * R * pr, o.y - py * R * pr);
            }
            var dl = Math.max(0, dot(n, LIGHT));
            var sp = Math.pow(Math.max(0, dot(n, HALF)), 22);
            var lv = 0.3 + 0.7 * dl;
            var col = [clamp255(q.col[0] * lv + sp * 60), clamp255(q.col[1] * lv + sp * 56), clamp255(q.col[2] * lv + sp * 48)];
            faces.push({ z: fc[2], p: pts, c: rgb(col) });
          }
        }
      }
      faces.sort(function (a, b) { return a.z - b.z; });
      c.lineJoin = 'round';
      for (i = 0; i < faces.length; i++) {
        var f = faces[i], p2 = f.p;
        c.beginPath();
        c.moveTo(p2[0], p2[1]); c.lineTo(p2[2], p2[3]); c.lineTo(p2[4], p2[5]); c.lineTo(p2[6], p2[7]);
        c.closePath();
        c.fillStyle = f.c; c.fill();
        c.lineWidth = 0.6; c.strokeStyle = 'rgba(255,252,246,.22)'; c.stroke();
      }
    }
  };

  var IMPL = { a: atelier, b: ripple, c: particles, d: cubes };

  return {
    create: function (key, canvas) {
      var impl = IMPL[key];
      return impl ? new Scene(canvas, impl) : null;
    }
  };
})();
