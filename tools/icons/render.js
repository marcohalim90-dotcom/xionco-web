/* ==========================================================================
   XIONCO — gambar garis (line drawing) untuk kartu pilihan Customize
   Model 3D dari XMAKER.build (maker.js + parts.js) → G-buffer (normal + kedalaman + id bagian)
   → deteksi tepi (siluet tebal, kontur kedalaman sedang, lipatan & sambungan bagian tipis)
   → garis hitam di atas transparan, dirender 4× lalu diperkecil (anti-alias) ke 240 × 240.
   Garis tersembunyi otomatis hilang karena hanya permukaan terdepan yang masuk G-buffer.
   API (dipanggil oleh plan.js / build.js):
     ICON.build(cfg, open)  → bangun model (open: 0..1 = pintu/laci dibuka)
     ICON.cam(spec)          → kamera {az, el, fov, target, dist, crop:[x0,y0,x1,y1] NDC}
     ICON.snap()             → G-buffer kecil (analisis) dari kamera tanpa crop
     ICON.footprint(g)       → kotak NDC piksel objek · ICON.diff(a, b) → kotak NDC perbedaan
     ICON.draw(spec)         → Uint8Array alfa 240 × 240
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE, S = 960, OUT = 240, F = S / OUT, A = 384;   // A = resolusi analisis
  var canvas = document.getElementById('c');
  var R = new T.WebGLRenderer({ canvas: canvas, antialias: false, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: false });
  R.setPixelRatio(1); R.setSize(S, S, false); R.setClearColor(0x000000, 0);
  var rtOpt = { type: T.FloatType, format: T.RGBAFormat, minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: false };
  var rt = new T.WebGLRenderTarget(S, S, rtOpt), rtA = new T.WebGLRenderTarget(A, A, rtOpt);
  var scene = new T.Scene(), cam = new T.PerspectiveCamera(20, 1, .01, 60);
  var kit = { T: T, rbox: function (w, h, d, r, seg) { return new T.RoundedBoxGeometry(w, h, d, seg || 5, r); }, col: function (h) { return new T.Color(h).convertSRGBToLinear(); } };

  /* ---------------- G-buffer: oct-normal (xy), kedalaman pandang (z), id bagian (w; +.5 = bagian samar/ghost) */
  var GV = [
    '#include <common>', 'varying vec3 vN; varying float vD;',
    'void main() {', '#include <beginnormal_vertex>', '#include <defaultnormal_vertex>', '#include <begin_vertex>', '#include <project_vertex>',
    '  vN = normalize(transformedNormal); vD = -mvPosition.z;', '}'].join('\n');
  var GF = [
    'uniform float uId; varying vec3 vN; varying float vD;',
    'vec2 octE(vec3 n) { n /= (abs(n.x) + abs(n.y) + abs(n.z)); vec2 p = n.xy; if (n.z < 0.0) p = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0); return p; }',
    'void main() {', '  vec3 n = normalize(vN);', '#ifdef DOUBLE_SIDED', '  if (!gl_FrontFacing) n = -n;', '#endif',
    '  gl_FragColor = vec4(octE(n), vD, uId);', '}'].join('\n');
  function gmat(id, side) { return new T.ShaderMaterial({ vertexShader: GV, fragmentShader: GF, uniforms: { uId: { value: id } }, side: side }); }

  /* ---------------- tepi */
  var EF = [
    'uniform sampler2D tG; uniform vec2 px; uniform float rS, rD, rI, tD, tN, wD, wI;', 'varying vec2 vUv;',
    'vec3 octD(vec2 e) { vec3 n = vec3(e, 1.0 - abs(e.x) - abs(e.y)); if (n.z < 0.0) n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0); return normalize(n); }',
    'vec4 G(vec2 o) { return texture2D(tG, vUv + o * px); }',
    'bool bg(vec4 g) { return g.w < 0.25; }',
    'float idv(vec4 g) { return floor(g.w + 0.01); }',
    'bool fnt(vec4 g) { return fract(g.w) > 0.25; }',
    'void main() {',
    '  vec4 c = G(vec2(0.0)); bool cb = bg(c);',
    '  float sil = 0.0, dep = 0.0, inn = 0.0; bool faint = !cb && fnt(c);',
    '  vec3 nc = octD(c.xy);',
    '  for (int i = 0; i < 16; i++) {',
    '    float a = float(i) * 0.392699; vec2 d = vec2(cos(a), sin(a));',
    // siluet: batas objek ↔ latar (tebal)
    '    vec4 s = G(d * rS); if (bg(s) != cb) { sil = 1.0; if (!bg(s) && fnt(s)) faint = true; }',
    '    if (cb) continue;',
    // kontur kedalaman: turunan kedua 1/z (bidang datar = 0, juga yang miring)
    '    if (i < 8) { vec4 p = G(d * rD), q = G(-d * rD);',
    '      if (!bg(p) && !bg(q)) { float e = abs(1.0 / p.z + 1.0 / q.z - 2.0 / c.z) * c.z; if (e > tD) dep = 1.0; }',
    '      else if (!bg(p) && abs(p.z - c.z) > tD * 3.0 * c.z) dep = 1.0; }',
    // lipatan (normal) & sambungan bagian (id)
    '    vec4 m = G(d * rI); if (!bg(m)) { if (idv(m) != idv(c)) { if (abs(m.z - c.z) > 0.0006 * c.z || dot(octD(m.xy), nc) < 0.995) { inn = 1.0; if (fnt(m)) faint = true; } } else if (dot(octD(m.xy), nc) < tN) inn = 1.0; }',
    '  }',
    '  float a = max(sil, max(dep * wD, inn * wI));',
    '  if (faint) a *= 0.42;',
    '  gl_FragColor = vec4(0.0, 0.0, 0.0, a);',
    '}'].join('\n');
  var edgeMat = new T.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: EF, transparent: false, depthTest: false, depthWrite: false,
    uniforms: { tG: { value: rt.texture }, px: { value: new T.Vector2(1 / S, 1 / S) }, rS: { value: 5.6 }, rD: { value: 4.4 }, rI: { value: 3.2 }, tD: { value: .022 }, tN: { value: .72 }, wD: { value: 1 }, wI: { value: .92 } }
  });
  var quad = new T.Mesh(new T.PlaneGeometry(2, 2), edgeMat), qScene = new T.Scene(), qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; qScene.add(quad);

  /* ---------------- model */
  var cur = null, mats = [], ICON_STATE = { mats: 'faint' };
  function clear() {
    if (!cur) return;
    scene.remove(cur.group); cur.dispose(); cur = null;
    mats.forEach(function (m) { m.dispose(); }); mats = [];
  }
  // opt (fokus bagian, dipakai plan.js):
  //   hide(kotak, kotakPenuh, sig) → true = bagian disembunyikan (mis. top meja saat menggambar kaki/base)
  //   dim(kotak, kotakPenuh, sig) → true = bagian digambar samar (konteks)
  //   faint: { sig: jumlah } → bagian yang sama persis dengan pilihan pembanding digambar samar (konteks)
  // kembali: box (bagian tampak), sbox (bagian tegas saja), sigs (tanda tiap bagian), solid/total (jumlah bagian), parts (kotak bagian tegas)
  function build(cfg, open, opt) {
    clear(); opt = opt || {};
    var b = window.XMAKER.build(JSON.parse(JSON.stringify(cfg)), kit);
    var mv = b.motions || [];
    mv.forEach(function (m, i) { var t = typeof open === 'function' ? open(m, i, mv) : (open || 0); m.apply(t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); });
    b.group.updateMatrixWorld(true);
    var list = [], B = new T.Box3();
    b.group.traverse(function (o) {
      if (!o.isMesh) return;
      var m0 = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m0 || m0.blending === T.AdditiveBlending || o.visible === false) { o.visible = false; return; }
      // samar: bayangan kasur (ghost) & alas piring linen (penanda kapasitas meja)
      var P = o.geometry && o.geometry.parameters, placemat = !!(P && P.height === .003 && P.radiusTop === .13);
      if (placemat && ICON_STATE.mats === 'hide') { o.visible = false; return; }
      var wb = new T.Box3().setFromObject(o), q = function (v) { return Math.round(v * 250); };
      var pos = o.geometry && o.geometry.attributes.position;
      var sig = [q(wb.min.x), q(wb.min.y), q(wb.min.z), q(wb.max.x), q(wb.max.y), q(wb.max.z), pos ? pos.count : 0].join(',');
      list.push({ o: o, m0: m0, placemat: placemat, box: [wb.min.x, wb.min.y, wb.min.z, wb.max.x, wb.max.y, wb.max.z], sig: sig });
      if (!placemat) B.union(wb);
    });
    var full = [B.min.x, B.min.y, B.min.z, B.max.x, B.max.y, B.max.z], id = 1, vis = new T.Box3(), sb = new T.Box3(), sigs = [], solid = 0, total = 0, parts = [];
    var left = {}; if (opt.faint) for (var k in opt.faint) left[k] = opt.faint[k];
    list.forEach(function (e) {
      var o = e.o; sigs.push(e.sig);
      if (opt.hide && !e.placemat && opt.hide(e.box, full, e.sig)) { o.visible = false; return; }
      var ctx = !!(opt.dim && !e.placemat && opt.dim(e.box, full, e.sig)); if (!ctx && opt.faint && left[e.sig] > 0) { left[e.sig]--; ctx = true; }
      var faint = e.m0.transparent && e.m0.opacity < .25 || e.placemat || ctx;
      var gm = gmat(id++ + (faint ? .5 : 0), e.m0.side); mats.push(gm);
      o.material = gm; o.castShadow = o.receiveShadow = false;
      if (!e.placemat) { vis.union(new T.Box3(new T.Vector3(e.box[0], e.box[1], e.box[2]), new T.Vector3(e.box[3], e.box[4], e.box[5]))); total++; }
      if (!faint) { solid++; parts.push(e.box); sb.union(new T.Box3(new T.Vector3(e.box[0], e.box[1], e.box[2]), new T.Vector3(e.box[3], e.box[4], e.box[5]))); }
    });
    scene.add(b.group);
    cur = b;
    var bx = vis.isEmpty() ? B : vis;
    return { box: [bx.min.x, bx.min.y, bx.min.z, bx.max.x, bx.max.y, bx.max.z], full: full, sbox: sb.isEmpty() ? null : [sb.min.x, sb.min.y, sb.min.z, sb.max.x, sb.max.y, sb.max.z],
      sigs: sigs, solid: solid, total: total, parts: parts };
  }

  /* ---------------- kamera */
  var last = null;
  function setCam(sp) {
    last = sp;
    var az = (sp.az || 0) * Math.PI / 180, el = (sp.el || 0) * Math.PI / 180, t = sp.target, d = sp.dist;
    cam.fov = sp.fov || 20; cam.near = Math.max(.01, d * .05); cam.far = d * 6;
    cam.position.set(t[0] + d * Math.sin(az) * Math.cos(el), t[1] + d * Math.sin(el), t[2] + d * Math.cos(az) * Math.cos(el));
    cam.up.set(0, 1, 0); cam.lookAt(t[0], t[1], t[2]);
    if (sp.crop) {
      var c = sp.crop, x0 = (c[0] + 1) / 2 * S, x1 = (c[2] + 1) / 2 * S, y0 = (1 - c[3]) / 2 * S, y1 = (1 - c[1]) / 2 * S;
      cam.setViewOffset(S, S, x0, y0, x1 - x0, y1 - y0);
    } else cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  }
  // kotak dunia → kotak NDC pada kamera tanpa crop
  function project(box) {
    var sp = last, crop = sp.crop; setCam(Object.assign({}, sp, { crop: null }));
    var x0 = 9, y0 = 9, x1 = -9, y1 = -9, v = new T.Vector3();
    for (var i = 0; i < 8; i++) {
      v.set(i & 1 ? box[3] : box[0], i & 2 ? box[4] : box[1], i & 4 ? box[5] : box[2]).project(cam);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    setCam(Object.assign({}, sp, { crop: crop }));
    return [x0, y0, x1, y1];
  }

  /* ---------------- analisis (G-buffer kecil, kamera tanpa crop) */
  function snap() {
    var sp = last, crop = sp.crop; setCam(Object.assign({}, sp, { crop: null }));
    R.setRenderTarget(rtA); R.clear(); R.render(scene, cam); var buf = new Float32Array(A * A * 4); R.readRenderTargetPixels(rtA, 0, 0, A, A, buf); R.setRenderTarget(null);
    setCam(Object.assign({}, sp, { crop: crop }));
    return buf;
  }
  function bbox(test) {
    var x0 = A, y0 = A, x1 = -1, y1 = -1, n = 0;
    for (var y = 0; y < A; y++) for (var x = 0; x < A; x++) if (test(x, y)) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!n) return { n: 0 };
    return { n: n, box: [x0 / A * 2 - 1, y0 / A * 2 - 1, (x1 + 1) / A * 2 - 1, (y1 + 1) / A * 2 - 1] };
  }
  function footprint(g) { return bbox(function (x, y) { return g[(y * A + x) * 4 + 3] > .25; }); }
  // hanya bagian tegas (tanpa bagian samar / konteks)
  function footSolid(g) { return bbox(function (x, y) { var w = g[(y * A + x) * 4 + 3]; return w > .25 && w - Math.floor(w + .01) < .25; }); }
  function octD(a, b) { var z = 1 - Math.abs(a) - Math.abs(b), x = a, y = b; if (z < 0) { x = (1 - Math.abs(b)) * (a >= 0 ? 1 : -1); y = (1 - Math.abs(a)) * (b >= 0 ? 1 : -1); } var l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
  // piksel yang berbeda (latar, kedalaman > 0.2 %, normal > 14°) — piksel tunggal (derau) diabaikan
  function diff(a, b) {
    var D = new Uint8Array(A * A);
    for (var i = 0; i < A * A; i++) {
      var k = i * 4, ba = a[k + 3] > .25, bb = b[k + 3] > .25;
      if (ba !== bb) { D[i] = 1; continue; }
      if (!ba) continue;
      if (Math.abs(a[k + 2] - b[k + 2]) > .002 * a[k + 2]) { D[i] = 1; continue; }
      var na = octD(a[k], a[k + 1]), nb = octD(b[k], b[k + 1]);
      if (na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < .97) D[i] = 1;
    }
    return bbox(function (x, y) {
      var i = y * A + x; if (!D[i]) return false;
      var c = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < A && yy < A && D[yy * A + xx]) c++; }
      return c >= 2;
    });
  }

  /* ---------------- gambar akhir */
  function draw(sp, opt) {
    if (sp) setCam(sp);
    opt = opt || {};
    var u = edgeMat.uniforms, k = opt.weight || 1;
    u.rS.value = 5.6 * k; u.rD.value = 4.2 * k; u.rI.value = 3.0 * k;
    R.setRenderTarget(rt); R.clear(); R.render(scene, cam);
    R.setRenderTarget(null); R.clear(); R.render(qScene, qCam);
    var px = new Uint8Array(S * S * 4); var gl = R.getContext(); gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, px);
    var out = new Uint8Array(OUT * OUT);
    for (var y = 0; y < OUT; y++) for (var x = 0; x < OUT; x++) {
      var s = 0;
      for (var yy = 0; yy < F; yy++) { var row = (S - 1 - (y * F + yy)) * S; for (var xx = 0; xx < F; xx++) s += px[(row + x * F + xx) * 4 + 3]; }
      out[y * OUT + x] = Math.round(s / (F * F));
    }
    return out;
  }

  // SVG (simbol) → alfa 240 × 240
  function svgAlpha(svg) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = c.height = OUT; var g = c.getContext('2d');
        g.drawImage(img, 0, 0, OUT, OUT);
        var d = g.getImageData(0, 0, OUT, OUT).data, out = new Uint8Array(OUT * OUT);
        for (var i = 0; i < OUT * OUT; i++) out[i] = d[i * 4 + 3];
        res(out);
      };
      img.onerror = function () { rej(new Error('svg')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  // pratinjau di kanvas utama (debug)
  function preview(alpha) {
    var c = document.createElement('canvas'); c.width = c.height = OUT; var g = c.getContext('2d'), im = g.createImageData(OUT, OUT);
    for (var i = 0; i < OUT * OUT; i++) { im.data[i * 4 + 3] = alpha[i]; }
    g.putImageData(im, 0, 0); return c.toDataURL('image/png');
  }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }

  window.ICON = { state: ICON_STATE, S: S, OUT: OUT, A: A, build: build, cam: setCam, project: project, snap: snap, footprint: footprint, footSolid: footSolid, diff: diff, draw: draw, svgAlpha: svgAlpha, preview: preview, b64: b64, clear: clear, uniforms: edgeMat.uniforms };
})();
