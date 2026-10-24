/* ==========================================================================
   Maison XIONCO v5 — Galeri: versi "3D langsung" (tanpa render)
   Memuat assets/galeri/<set>/scene.glb (warna rata) + path.json (jalur kamera per frame,
   sama dengan jalur render) + lights.json (lampu sorot/titik/area dari Blender), lalu
   menggambar kamera di posisi frame pecahan apa pun → gulir terasa sama seperti versi render.
   Lampu: kumpulan tetap (POOL) yang dipindah ke lampu terdekat kamera tiap frame,
   jadi jumlah lampu di shader tidak berubah (tanpa kompilasi ulang).
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) return;
  var LIBS = ['https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/', 'https://unpkg.com/three@0.147.0/examples/js/'];
  function addScript(path, i) {
    i = i || 0;
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LIBS[i] + path; s.onload = res;
      s.onerror = function () { s.remove(); if (i + 1 < LIBS.length) addScript(path, i + 1).then(res, rej); else rej(new Error(path)); };
      document.head.appendChild(s);
    });
  }
  var POOL = 14, SHADOWS = 4, K_SPOT = 0.42, K_AREA = 0.025, CAP = 420;   // watt Blender → candela three (disetel dengan mata); lampu sangat kuat (cahaya kerai) dibatasi
  var st = null;

  function build(canvas) {
    var r = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    r.physicallyCorrectLights = true; r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFShadowMap;            // bayangan tegas dari lampu terdekat
    var sc = new T.Scene(); sc.background = new T.Color(0x0d0b09);
    sc.add(new T.HemisphereLight(0xf2e6d6, 0x3a3029, 0.75));
    var cam = new T.PerspectiveCamera(60, 16 / 9, 0.05, 200);
    var pool = [];
    for (var i = 0; i < POOL; i++) {
      var L = new T.SpotLight(0xffffff, 0, 0, Math.PI / 4, 0.4, 2);
      L.target.position.set(0, 0, -1); sc.add(L); sc.add(L.target); pool.push(L);
      if (i < SHADOWS) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.0004; L.shadow.camera.near = 0.1; L.shadow.camera.far = 30; }
    }
    return { r: r, sc: sc, cam: cam, pool: pool, path: null, lights: [], ready: false, hfov: 73.7 };
  }

  function load(set, canvas) {
    if (!T) return Promise.reject(new Error('three'));
    if (st && st.id === set.id) return st.p;
    if (!st || st.canvas !== canvas) { st = build(canvas); st.canvas = canvas; }
    st.id = set.id; st.ready = false;
    var base = '../assets/galeri/' + set.id + '/';
    var gl = (T.GLTFLoader ? Promise.resolve() : addScript('loaders/GLTFLoader.js'))
      .then(function () { return T.DRACOLoader ? null : addScript('loaders/DRACOLoader.js').catch(function () {}); });   // v12+: geometri terkompres Draco
    st.p = Promise.all([
      gl.then(function () { return new Promise(function (ok, no) {
        var ld = new T.GLTFLoader();
        if (T.DRACOLoader) { var dr = new T.DRACOLoader(); dr.setDecoderPath(LIBS[0] + 'libs/draco/gltf/'); ld.setDRACOLoader(dr); }
        ld.load(base + 'scene.glb', ok, null, no);
      }); }),
      fetch(base + 'path.json').then(function (x) { return x.json(); }),
      fetch(base + 'lights.json').then(function (x) { return x.json(); })
    ]).then(function (res) {
      if (st.model) st.sc.remove(st.model);
      st.model = res[0].scene; st.sc.add(st.model);
      st.model.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      st.path = res[1]; st.hfov = st.path.hfov || 73.7;
      st.lights = res[2].map(function (L) {
        var o = { p: new T.Vector3().fromArray(L.p), d: new T.Vector3().fromArray(L.d), c: new T.Color(L.c[0], L.c[1], L.c[2]) };
        var e = Math.min(L.e, CAP);
        if (L.t === 'AREA') { o.i = e * K_AREA; o.a = Math.PI / 2.3; o.b = 1; o.area = true; }
        else if (L.t === 'SPOT') { o.i = e * K_SPOT; o.a = Math.min(Math.PI / 2.1, L.a / 2); o.b = L.b; }
        else { o.i = e * K_SPOT; o.a = Math.PI / 2.05; o.b = 1; }
        return o;
      });
      st.ready = true;
      return st;
    });
    return st.p;
  }

  function resize(w, h) {
    if (!st) return;
    st.r.setSize(w, h, false);
    st.cam.aspect = w / h;
    setHfov(st.hfov);
  }
  function setHfov(h) {
    st.curHf = h;
    var hf = h * Math.PI / 180;
    st.cam.fov = 2 * Math.atan(Math.tan(hf / 2) / st.cam.aspect) * 180 / Math.PI;
    st.cam.updateProjectionMatrix();
  }

  var tmpA = new T.Vector3(), tmpB = new T.Vector3(), dir = new T.Vector3();
  function frame(pos) {
    if (!st || !st.ready) return false;
    var F = st.path.frames, n = F.length;
    var k = Math.floor(pos), t = pos - k;
    var a = F[((k % n) + n) % n], b = F[(((k + 1) % n) + n) % n];
    tmpA.set(a[0], a[1], a[2]); tmpB.set(b[0], b[1], b[2]);
    // jalur menutup (frame terakhir → pertama): jangan lompat melintasi cincin
    st.cam.position.copy(tmpA.distanceTo(tmpB) > 3 ? tmpA : tmpA.lerp(tmpB, t));
    dir.set(a[3] + (b[3] - a[3]) * t, 0, a[4] + (b[4] - a[4]) * t).normalize();
    st.cam.lookAt(st.cam.position.x + dir.x, st.cam.position.y, st.cam.position.z + dir.z);
    // zoom geser per frame [perbesaran, pusat u, pusat v] (arah kamera tetap), bila jalur menyediakannya
    var zf = 1, cu = 0, cv = 0;
    if (a.length > 7) {
      var bz = b.length > 7 ? b : [0, 0, 0, 0, 0, 1, 0, 0];
      zf = a[5] + (bz[5] - a[5]) * t; cu = a[6] + (bz[6] - a[6]) * t; cv = a[7] + (bz[7] - a[7]) * t;
    }
    if (zf > 1.0005) {
      var W = 1000, Hh = W / st.cam.aspect, w = W / zf, h = Hh / zf;
      st.cam.setViewOffset(W, Hh, W / 2 + cu * W / 2 - w / 2, Hh / 2 - cv * W / 2 - h / 2, w, h);
      st.zoomed = true;
    } else if (st.zoomed) { st.cam.clearViewOffset(); st.zoomed = false; }
    // lampu terdekat (diberi bobot ke arah pandang) → kumpulan lampu
    var cp = st.cam.position;
    st.lights.forEach(function (L) {
      var dx = L.p.x - cp.x, dz = L.p.z - cp.z, dd = Math.sqrt(dx * dx + dz * dz);
      L.k = dd - Math.max(0, (dx * dir.x + dz * dir.z)) * 0.6;
    });
    var near = st.lights.slice().sort(function (x, y) { return (x.k + (x.area ? 3 : 0)) - (y.k + (y.area ? 3 : 0)); });   // lampu isi (area) tanpa bayangan → urutan belakang
    st.pool.forEach(function (S, i) {
      var L = near[i];
      if (!L) { S.intensity = 0; return; }
      S.position.copy(L.p); S.target.position.copy(L.p).add(L.d); S.target.updateMatrixWorld();
      S.color.copy(L.c); S.intensity = L.i; S.angle = L.a; S.penumbra = L.b;
    });
    // jalur tidak menyambung (mis. v7: dinding menutup jalan kembali) → peralihan gelap singkat di titik putaran
    var ex = 1.15;
    if (st.path.fadeLoop) { var kk = ((pos % n) + n) % n; if (kk > n - 8) ex *= Math.max(0.03, (n - kk) / 8); }   // gelap sebelum kembali ke awal
    st.r.toneMappingExposure = ex;
    st.r.render(st.sc, st.cam);
    return true;
  }

  window.XG3 = { load: load, frame: frame, resize: resize, ready: function () { return !!(st && st.ready); }, _st: function () { return st; } };
})();
