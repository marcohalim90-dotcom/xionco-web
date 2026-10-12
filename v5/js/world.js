/* ==========================================================================
   Maison XIONCO v5 — Panggung 3D (Three.js r147)
   Satu panggung di tengah layar. Yang berdiri di atasnya bisa berganti:
   • cubix   — sofa modular CUBIX prosedural (bisa dirancang di Atelier)
   • product — foto produk xionco.com yang latarnya dihapus di browser (CORS
               diizinkan oleh xionco.com) lalu berdiri sebagai objek di panggung
   • model   — model 3D asli (GLB) bila item punya model.glb; bisa diputar
   • art     — karya galeri dalam bingkai tipis
   • map     — peta manik emas Pulau Jawa (manufaktur)
   Kamera selalu membingkai objek di ruang kosong antara panel kiri & kanan.
   API: window.XW
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE, G = window.gsap, XV = window.XV;
  var XW = window.XW = { ok: false, labels: {} };
  if (!T) return;

  var col = function (h) { return new T.Color(h).convertSRGBToLinear(); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var tw = function (target, vars) {
    if (G && !XW.reduced && vars.duration !== 0) return G.to(target, vars);
    Object.keys(vars).forEach(function (k) { if (k in target) target[k] = vars[k]; });
    if (vars.onUpdate) vars.onUpdate();
    if (vars.onComplete) vars.onComplete();
    return null;
  };

  var canvas, renderer, scene, camera, controls;
  var W = 1, H = 1, MOBILE = false, last = 0, frame = 0, dtAvg = 16, slow = 0, clock = 0;
  var mats = {}, L = {}, O = {};
  var st = { room: 'home', kind: 'cubix', drag: false, spin: 0, spinV: 0, lastDrag: -1e9, map: 0, mapT: 0, zoom: 1, zoomC: 1, off: false, orbitMoved: false, recenter: false };
  var view = { tx: 0, ty: .42, tz: 0, dist: 6.4, yaw: -.3, pitch: .17, fov: 30 };
  var inset = { l: 0, r: 0, b: 0, t: 0, x: 0, y: 0 };
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };

  /* ---------------------------------------------------------------- tekstur */
  var rnd = (function () { var s = 11; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function weave(g, w, h) {
    g.fillStyle = '#c9c4bd'; g.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 2) { g.fillStyle = 'rgba(70,64,58,' + (0.09 + rnd() * .1) + ')'; g.fillRect(0, y, w, 1); }
    for (var x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,248,236,' + (0.03 + rnd() * .05) + ')'; g.fillRect(x, 0, 1, h); }
    for (var i = 0; i < 2200; i++) { g.fillStyle = 'rgba(60,54,48,' + rnd() * .12 + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1); }
  }
  function grain(base, dark) {
    return function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 160; i++) {
        var y = rnd() * h; g.strokeStyle = dark.replace('A', (.03 + rnd() * .09).toFixed(3)); g.lineWidth = .6 + rnd() * 1.8;
        g.beginPath(); g.moveTo(0, y);
        for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .012 + i) * (2 + rnd() * 3));
        g.stroke();
      }
    };
  }
  /* tema: gelap (bawaan) & terang (ivory hangat — tanpa putih murni) */
  var THEMES = {
    dark: { bg: '#0f0c0a', floor: '#17130f', disc: '#1c1814', wall: ['#0b0907', '#1a1511', '#14100d'], hemiG: '#140f0b', halo: 1, exp: 1, env: 1 },
    light: { bg: '#e4ddd1', floor: '#d3cabb', disc: '#c8bead', wall: ['#ebe5db', '#e0d8cb', '#d2c9b9'], hemiG: '#7d705f', halo: .3, exp: 1.12, env: 1.35 }
  };
  var themeName = 'dark', theme = { halo: 1, exp: 1, env: 1 };
  function backdrop(g, w, h) {
    var c = THEMES[themeName].wall, gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, c[0]); gr.addColorStop(.55, c[1]); gr.addColorStop(1, c[2]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  function radial(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  }
  function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }

  /* ---------------------------------------------------------------- ruang minimal */
  function buildRoom() {
    mats.floor = new T.MeshStandardMaterial({ color: col('#17130f'), roughness: .38, metalness: 0, envMapIntensity: .22 });
    var floor = new T.Mesh(new T.CircleGeometry(60, 96), mats.floor);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var wall = O.wall = new T.Mesh(new T.CylinderGeometry(15, 15, 14, 128, 1, true), new T.MeshBasicMaterial({ map: canvasTex(16, 512, backdrop), side: T.BackSide, toneMapped: false }));
    wall.position.y = 7; scene.add(wall);
    // cahaya hangat lembut di belakang panggung
    O.halo = new T.Mesh(new T.PlaneGeometry(14, 9), new T.MeshBasicMaterial({ map: radial([[0, 'rgba(201,160,108,.34)'], [.45, 'rgba(150,110,70,.1)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, toneMapped: false }));
    O.halo.position.set(0, 2.6, -9.5); scene.add(O.halo);
    // panggung bundar rendah + garis champagne
    O.plinth = new T.Group();
    var disc = O.disc = shadowed(new T.Mesh(new T.CylinderGeometry(1, 1.02, .06, 128), new T.MeshStandardMaterial({ color: col('#1c1814'), roughness: .5, metalness: .1, envMapIntensity: .3 })));
    disc.position.y = .03; O.plinth.add(disc);
    var rim = new T.Mesh(new T.TorusGeometry(1.004, .0035, 8, 200), new T.MeshStandardMaterial({ color: col('#c4a674'), metalness: 1, roughness: .3, envMapIntensity: 1.2 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = .061; O.plinth.add(rim);
    O.plinth.scale.set(2, 1, 2);
    scene.add(O.plinth);
    O.blobTex = radial([[0, 'rgba(0,0,0,.75)'], [.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]);
  }

  /* ---------------------------------------------------------------- CUBIX */
  var S = (XV && XV.STUDIO) || { seatW: 72, armW: 16, depth: 86, height: 74, fabrics: [{ id: 'fb03', color: '#c7bba7', type: 'fabric' }] };
  var SW = S.seatW / 100, AW = S.armW / 100, D = S.depth / 100, HH = S.height / 100, PL = .075, LIFT = .06;
  var sofa, slots = {}, cfg = { seats: 3, arms: true, ottoman: false, fabric: 'fb03', base: 'walnut' };
  var BASES = {
    oak: { color: '#9c7650', metal: 0, rough: .55, wood: true }, walnut: { color: '#5b3e2b', metal: 0, rough: .5, wood: true },
    steel: { color: '#1d1c1b', metal: .9, rough: .32 }, brass: { color: '#b8924f', metal: 1, rough: .26 }
  };
  function rbox(w, h, d, r, seg) { return T.RoundedBoxGeometry ? new T.RoundedBoxGeometry(w, h, d, seg || 5, r) : new T.BoxGeometry(w, h, d); }
  function part(g, geo, mat, x, y, z) { var m = shadowed(new T.Mesh(geo, mat)); m.position.set(x, y, z); g.add(m); return m; }
  function makeSeat() {
    var g = new T.Group();
    part(g, rbox(SW - .02, PL, D - .06, .008, 2), mats.base, 0, PL / 2, 0);
    part(g, rbox(SW, .2, D, .03, 4), mats.fabric, 0, PL + .1, 0);
    part(g, rbox(SW - .03, .14, D - .22, .06, 5), mats.fabric, 0, PL + .27, .09);
    part(g, rbox(SW, .5, .1, .03, 4), mats.fabric, 0, HH - .25, -D / 2 + .05);
    part(g, rbox(SW - .035, .34, .19, .07, 5), mats.fabric, 0, HH - .21, -D / 2 + .17).rotation.x = -.11;
    return g;
  }
  function makeArm() {
    var g = new T.Group();
    part(g, rbox(AW - .02, PL, D - .06, .008, 2), mats.base, 0, PL / 2, 0);
    part(g, rbox(AW, .58, D, .045, 5), mats.fabric, 0, PL + .29, 0);
    return g;
  }
  function makeOttoman() {
    var g = new T.Group();
    part(g, rbox(SW - .02, PL, SW - .02, .008, 2), mats.base, 0, PL / 2, 0);
    part(g, rbox(SW, .34, SW, .06, 5), mats.fabric, 0, PL + .17, 0);
    return g;
  }
  function targets(c) {
    var t = {}, total = c.seats * SW + (c.arms ? 2 * AW : 0), x = -total / 2;
    if (c.arms) { t.armL = { x: x + AW / 2, z: 0 }; x += AW; }
    for (var i = 0; i < c.seats; i++) { t['seat' + i] = { x: x + SW / 2, z: 0 }; x += SW; }
    if (c.arms) t.armR = { x: x + AW / 2, z: 0 };
    if (c.ottoman) t.ottoman = { x: total / 2 - (c.arms ? AW : 0) - SW / 2, z: D / 2 + .3 + SW / 2 };
    return t;
  }
  function cubixBounds() {
    var total = cfg.seats * SW + (cfg.arms ? 2 * AW : 0);
    return { w: total, h: HH, d: D + (cfg.ottoman ? SW + .3 : 0) };
  }
  function applyCfg(c, animate) {
    cfg = Object.assign({}, cfg, c);
    var tg = targets(cfg), d = 0;
    Object.keys(slots).forEach(function (k) {
      if (tg[k]) return;
      var o = slots[k]; delete slots[k];
      if (animate) tw(o.position, { y: -1.1, duration: .7, ease: 'power3.in', onComplete: function () { sofa.remove(o); } });
      else sofa.remove(o);
    });
    Object.keys(tg).forEach(function (k) {
      var o = slots[k], t = tg[k];
      if (!o) {
        o = k === 'ottoman' ? makeOttoman() : k.indexOf('arm') === 0 ? makeArm() : makeSeat();
        slots[k] = o; sofa.add(o);
        o.position.set(t.x, animate ? -1.1 : 0, t.z);
        if (animate) { tw(o.position, { y: 0, duration: 1.1, delay: d, ease: 'power3.out' }); d += .08; }
      } else if (animate) tw(o.position, { x: t.x, z: t.z, duration: 1, ease: 'power3.inOut' });
      else { o.position.x = t.x; o.position.z = t.z; }
    });
    var f = (S.fabrics || []).filter(function (x) { return x.id === cfg.fabric; })[0] || S.fabrics[0];
    var b = BASES[cfg.base] || BASES.oak, leather = f.type === 'leather';
    var fc = col(f.color).multiplyScalar(leather ? 1 : .82), bc = col(b.color);
    mats.fabric.map = mats.fabric.bumpMap = leather ? null : O.weave;
    mats.fabric.roughness = leather ? .4 : .92; mats.fabric.sheen = leather ? 0 : .55; mats.fabric.clearcoat = leather ? .3 : 0;
    mats.fabric.needsUpdate = true;
    mats.base.map = b.wood ? O.wood : null; mats.base.metalness = b.metal; mats.base.roughness = b.rough; mats.base.needsUpdate = true;
    if (animate) {
      tw(mats.fabric.color, { r: fc.r, g: fc.g, b: fc.b, duration: 1, ease: 'power2.inOut' });
      tw(mats.fabric.sheenColor, { r: fc.r * 1.6 + .05, g: fc.g * 1.6 + .05, b: fc.b * 1.6 + .05, duration: 1 });
      tw(mats.base.color, { r: bc.r, g: bc.g, b: bc.b, duration: 1, ease: 'power2.inOut' });
    } else {
      mats.fabric.color.copy(fc); mats.fabric.sheenColor.setRGB(fc.r * 1.6 + .05, fc.g * 1.6 + .05, fc.b * 1.6 + .05); mats.base.color.copy(bc);
    }
    O.cubix.userData.bounds = cubixBounds();
    if (st.kind === 'cubix' && O.plinth) setPlinth(O.cubix.userData.bounds.w, true, animate ? 1.1 : 0);
    if (st.kind === 'cubix' && !orbit) frameItem(O.cubix.userData.bounds, animate ? 1.2 : 0);
    return { width: Math.round(cubixBounds().w * 100) };
  }
  function buildSofa() {
    O.weave = canvasTex(512, 512, weave, [5, 5]);
    O.wood = canvasTex(512, 256, grain('#cdb391', 'rgba(60,38,20,A)'));
    mats.fabric = new T.MeshPhysicalMaterial({ color: col('#a69a88'), map: O.weave, bumpMap: O.weave, bumpScale: .0035, roughness: .92, metalness: 0, sheen: .55, sheenRoughness: .7, sheenColor: new T.Color(.6, .6, .6), envMapIntensity: .5 });
    mats.base = new T.MeshStandardMaterial({ color: col('#5b3e2b'), roughness: .5, metalness: 0, map: O.wood, envMapIntensity: .7 });
    sofa = new T.Group(); sofa.position.y = LIFT;
    O.cubix = new T.Group(); O.cubix.add(sofa); scene.add(O.cubix);
    O.cubix.userData.spin = sofa;
    applyCfg(cfg, false);
  }

  /* ---------------------------------------------------------------- produk: hapus latar foto (cutout.js) */
  var cutCache = {}, rawCache = {};
  var loadImage = function (url) { return window.XCUT.load(url); };
  var cutout = function (im) { return window.XCUT.cutout(im, 768); };
  function getCutout(url) {
    if (!cutCache[url]) cutCache[url] = loadImage(url).then(function (im) {
      var r = cutout(im), t = new T.CanvasTexture(r.canvas);
      t.encoding = T.sRGBEncoding; t.anisotropy = 8;
      return { tex: t, aspect: r.aspect, canvas: r.canvas, ok: r.ok !== false };
    });
    return cutCache[url];
  }
  function getRaw(url) {
    if (!rawCache[url]) rawCache[url] = loadImage(url).then(function (im) {
      var t = new T.Texture(im); t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.needsUpdate = true;
      return { tex: t, aspect: (im.naturalWidth || 1) / (im.naturalHeight || 1) };
    });
    return rawCache[url];
  }
  XW.cutout = getCutout;

  function makeBillboard(tex, w, h, framed) {
    var g = new T.Group();
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, color: framed ? 0xd2cdc4 : 0xcfc9bf, transparent: !framed, alphaTest: framed ? 0 : .04, toneMapped: false, side: T.DoubleSide }));
    m.position.y = LIFT + h / 2 + (framed ? .32 : -h * .045);
    g.add(m);
    if (framed) {
      var fm = new T.MeshStandardMaterial({ color: col('#2a241e'), metalness: .6, roughness: .45, envMapIntensity: .8 }), t = .025, dep = .04;
      [[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, -w / 2 - t / 2, 0], [t, h, w / 2 + t / 2, 0]].forEach(function (b) {
        var bar = shadowed(new T.Mesh(new T.BoxGeometry(b[0], b[1], dep), fm)); bar.position.set(b[2], m.position.y + b[3], 0); g.add(bar);
      });
      var back = shadowed(new T.Mesh(new T.BoxGeometry(w, h, .015), fm)); back.position.set(0, m.position.y, -.022); g.add(back);
      var rod = shadowed(new T.Mesh(new T.CylinderGeometry(.012, .012, .34, 12), mats.brass)); rod.position.set(0, LIFT + .17, -.05); g.add(rod);
    }
    var blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: O.blobTex, transparent: true, depthWrite: false, opacity: framed ? .45 : .6 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.scale.set(w * 1.15, framed ? .5 : Math.max(.35, w * .45), 1); blob.userData.noPick = true;
    g.add(blob);
    g.userData.bounds = { w: w, h: h + (framed ? .32 : 0), d: .4 };
    return g;
  }

  /* ---------------------------------------------------------------- produk: model 3D asli (GLB)
     assets/items/<id>/model.glb — skala meter, depan menghadap +Z, pivot di lantai tengah.
     GLTFLoader (+Draco) baru dimuat saat model pertama dibutuhkan. Satuan yang keliru
     (cm / inci / mm, umum dari SketchUp) dikoreksi otomatis terhadap ukuran wajar kategorinya. */
  var LIBS = ['https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/', 'https://unpkg.com/three@0.147.0/examples/js/'];
  function addScript(path, i) {
    i = i || 0;
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LIBS[i] + path;
      s.onload = res;
      s.onerror = function () { s.remove(); if (i + 1 < LIBS.length) addScript(path, i + 1).then(res, rej); else rej(new Error('gagal memuat ' + path)); };
      document.head.appendChild(s);
    });
  }
  var gltfP = null, modelCache = {};
  function gltfLoader() {
    if (!gltfP) {
      gltfP = (T.GLTFLoader ? Promise.resolve() : addScript('loaders/GLTFLoader.js').then(function () { return addScript('loaders/DRACOLoader.js').catch(function () {}); }))
        .then(function () {
          var l = new T.GLTFLoader();
          if (T.DRACOLoader) { var d = new T.DRACOLoader(); d.setDecoderPath(LIBS[0] + 'libs/draco/gltf/'); l.setDRACOLoader(d); }
          return l;
        });
      gltfP.catch(function () { gltfP = null; });
    }
    return gltfP;
  }
  function getModel(url) {
    if (!modelCache[url]) {
      modelCache[url] = gltfLoader().then(function (l) {
        return new Promise(function (res, rej) { l.load(url, function (gl) { res(gl.scene || gl.scenes[0]); }, null, rej); });
      });
      modelCache[url].catch(function () { delete modelCache[url]; });
    }
    return modelCache[url];
  }
  var UNITS = [1, .01, .0254, .001];   // meter, cm, inci, mm
  function makeModel(srcScene, p) {
    var m = srcScene.clone(true), box = new T.Box3(), size = new T.Vector3(), want = sizeFor(p);
    m.rotation.y = (+p.modelRot || 0) * Math.PI / 180;
    m.updateMatrixWorld(true); box.setFromObject(m); box.getSize(size);
    var wide = Math.max(size.x, size.z) || 1, s = 1, best = 1e9;
    UNITS.forEach(function (u) { var e = Math.abs(Math.log(wide * u / want)); if (e < best) { best = e; s = u; } });
    m.scale.setScalar(s);
    m.updateMatrixWorld(true); box.setFromObject(m); box.getSize(size);
    var c = box.getCenter(new T.Vector3());
    m.position.set(-c.x, LIFT - box.min.y, -c.z);
    var list = [];
    m.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) {
        if (!mt || !('envMapIntensity' in mt) || list.indexOf(mt) >= 0) return;
        // pantulan lingkungan disamakan dengan CUBIX (kain .5, logam 1.1) — nilai bawaan GLB (1) membuat kain gelap tampak abu-abu
        if (mt.userData.env0 == null) mt.userData.env0 = mt.metalness > .5 ? 1.1 : .5;
        list.push(mt);
      });
    });
    var spin = new T.Group(), g = new T.Group();
    spin.add(m); g.add(spin);
    var blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: O.blobTex, transparent: true, depthWrite: false, opacity: .4 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.scale.set(size.x * 1.12, size.z * 1.2, 1); blob.userData.noPick = true;
    g.add(blob);
    g.userData = { bounds: { w: size.x, h: size.y, d: size.z }, spin: spin, mats: list, unit: s };
    g.userData.dispose = function () { scene.remove(g); blob.geometry.dispose(); blob.material.dispose(); };
    return g;
  }

  /* ---------------------------------------------------------------- peta manik emas */
  var MAP = { lon0: 109.8, lat0: -7.25, k: 1.1 };
  var mapXZ = function (lon, lat) { return [(lon - MAP.lon0) * MAP.k, (lat - MAP.lat0) * -MAP.k]; };
  function inside(x, y, poly) {
    var ins = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  var beads, beadPos = [], beacons = [], routeGeo, routeCount = 0, pulse, curve, dummy;
  function buildMap() {
    var g = new T.Group(); g.visible = false; scene.add(g); O.map = g;
    var step = .105;
    for (var lat = -5.9; lat > -8.9; lat -= step) {
      for (var lon = 105; lon < 114.9; lon += step) {
        var off = (Math.round((lat + 5.9) / step) % 2) * step / 2, x = lon + off;
        if (inside(x, lat, XV.JAVA || []) || inside(x, lat, XV.MADURA || [])) beadPos.push(mapXZ(x, lat));
      }
    }
    XW.mapDots = beadPos.length;
    mats.gold = new T.MeshStandardMaterial({ color: col('#c9a86e'), metalness: 1, roughness: .32, envMapIntensity: 1.2 });
    beads = new T.InstancedMesh(new T.SphereGeometry(.032, 12, 8), mats.gold, beadPos.length);
    dummy = new T.Object3D(); g.add(beads);
    var F = XV.FACTORIES || [], center = mapXZ(106.777, -6.287), spread = [[-.24, .13], [.05, -.2], [.24, .09]];
    mats.beacon = new T.MeshStandardMaterial({ color: col('#e8d2a8'), emissive: col('#ffcf8f'), emissiveIntensity: 1.3, roughness: .4 });
    F.forEach(function (f, i) {
      var p = i === 0 ? mapXZ(f.lon, f.lat) : [center[0] + spread[i - 1][0], center[1] + spread[i - 1][1]];
      var b = new T.Group(); b.position.set(p[0], 0, p[1]);
      var h = i === 0 ? .9 : .65;
      var pil = new T.Mesh(new T.CylinderGeometry(.006, .006, h, 8), mats.gold); pil.position.y = h / 2; b.add(pil);
      var top = new T.Mesh(new T.SphereGeometry(.028, 20, 14), mats.beacon); top.position.y = h; b.add(top);
      var ring = new T.Mesh(new T.TorusGeometry(.11, .003, 6, 64), mats.gold); ring.rotation.x = Math.PI / 2; ring.position.y = .01; b.add(ring);
      b.userData = { h: h, ring: ring };
      g.add(b); beacons.push(b);
    });
    var J = beacons[0].position, K = new T.Vector3(center[0], 0, center[1]);
    curve = new T.CatmullRomCurve3([new T.Vector3(J.x, .05, J.z), new T.Vector3(lerp(J.x, K.x, .3), .75, J.z - .3), new T.Vector3(lerp(J.x, K.x, .72), .8, K.z - .3), new T.Vector3(K.x, .05, K.z)]);
    routeGeo = new T.TubeGeometry(curve, 200, .005, 6, false);
    routeCount = routeGeo.index.count; routeGeo.setDrawRange(0, 0);
    g.add(new T.Mesh(routeGeo, mats.gold));
    pulse = new T.Sprite(new T.SpriteMaterial({ map: radial([[0, 'rgba(255,236,206,1)'], [.3, 'rgba(255,214,160,.45)'], [1, 'rgba(255,200,140,0)']]), color: col('#ffe0b0'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
    pulse.scale.set(.22, .22, 1); g.add(pulse);
  }
  function placeBeads(v) {
    for (var i = 0; i < beadPos.length; i++) {
      var p = beadPos[i], local = clamp(v * 1.25 - (5.4 - p[0]) / 11 * .25, 0, 1);
      dummy.position.set(p[0], -.08 + .11 * local, p[1]);
      dummy.scale.setScalar(.001 + local);
      dummy.updateMatrix(); beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- panggung: ganti objek */
  var item = null, req = 0;
  function rise(obj, delay) {
    obj.visible = true; obj.position.y = -1.6;
    tw(obj.position, { y: 0, duration: XW.reduced ? 0 : 1.25, delay: delay || 0, ease: 'power3.out' });
  }
  function sink(obj, done) {
    tw(obj.position, { y: -1.8, duration: XW.reduced ? 0 : .7, ease: 'power3.in', onComplete: function () { obj.visible = false; if (done) done(); } });
  }
  function setPlinth(w, visible, dur) {
    var r = visible ? clamp(w * .52, .66, 1.6) : .001, d = dur == null ? 1.1 : dur;
    tw(O.plinth.scale, { x: r, z: r, duration: d, ease: 'power3.inOut' });
    tw(O.plinth.position, { y: visible ? 0 : -.2, duration: d * .8, ease: 'power3.inOut' });
  }
  function present(kind, obj) {
    var prev = item;
    st.kind = kind; item = obj;
    st.mapT = kind === 'map' ? 1 : 0;
    if (prev !== obj && obj.userData.spin) { st.spin = 0; st.spinV = 0; obj.userData.spin.rotation.y = 0; }
    if (prev !== obj) { st.zoom = 1; st.recenter = false; }
    if (prev && prev !== obj && prev !== O.map) sink(prev, function () { if (prev.userData.dispose) prev.userData.dispose(); });
    if (obj === O.map) { O.map.position.y = 0; O.map.visible = true; }
    else if (prev !== obj) rise(obj, prev && prev !== O.map ? .45 : .1);
    setPlinth(obj.userData.bounds.w, kind !== 'map');
    var fog = kind === 'map' ? [34, 90] : [16, 46];
    tw(scene.fog, { near: fog[0], far: fog[1], duration: 1.4, ease: 'power2.inOut' });
    frameItem(obj.userData.bounds, 1.6);
  }
  function sizeFor(p) {
    var t = (p.type || '').toLowerCase();
    if (p.cat === 'seats') return /chair/.test(t) && !/arm/.test(t) ? .55 : /sectional/.test(t) ? 2.9 : /armchair/.test(t) ? 1.1 : 2.1;
    if (p.cat === 'tables') return /dining/.test(t) ? 1.6 : /desk|workstation/.test(t) ? 1.4 : /side/.test(t) ? .5 : /nesting/.test(t) ? .9 : 1.05;
    if (p.cat === 'bedframe') return 2.0;
    if (p.cat === 'cabinet') return /wardrobe/.test(t) ? 1.5 : /nightstand/.test(t) ? .5 : /kitchenette/.test(t) ? 1.8 : .9;
    if (p.cat === 'decor') return /panel/.test(t) ? 1.3 : /towel/.test(t) ? .55 : .45;
    return /track/.test(t) ? .7 : .3;
  }

  /* ---------------------------------------------------------------- zoom & sentuh objek */
  var ZMIN = .32, ZMAX = 2.8;
  function setZoom(z) { st.zoom = clamp(z, ZMIN, ZMAX); }
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  // objek di panggung yang tersentuh di titik layar (x, y) → jenisnya, atau null
  function hit(x, y) {
    if (!item || !item.visible || st.kind === 'map' || !camera) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(item, true);
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i], o = h.object;
      if (o.userData.noPick) continue;
      var im = o.material && o.material.map && o.material.map.image;
      if (o.material && o.material.alphaTest && im && im.getContext && h.uv) {   // foto potong: abaikan area transparan
        var px = im.getContext('2d').getImageData(clamp(Math.floor(h.uv.x * im.width), 0, im.width - 1), clamp(Math.floor((1 - h.uv.y) * im.height), 0, im.height - 1), 1, 1).data;
        if (px[3] < 40) continue;
      }
      return st.kind;
    }
    return null;
  }

  /* warna kain model 3D mengikuti varian (kode hex xionco.shop). Tekstur kain dinormalkan
     sekali (terang rata-rata, kontras serat dijaga) lalu dikalikan warna varian. */
  var TINT_GAIN = 1.25;
  function normalMap(tex) {
    var im = tex && tex.image; if (!im || !im.width) return null;
    var w = Math.min(512, im.width), h = Math.min(512, im.height);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h), a = d.data, sum = 0, i;
    for (i = 0; i < a.length; i += 4) sum += (a[i] + a[i + 1] + a[i + 2]) / 3;
    var mean = sum / (a.length / 4) || 1;
    for (i = 0; i < a.length; i += 4) { var l = clamp(190 * (1 + ((a[i] + a[i + 1] + a[i + 2]) / 3 / mean - 1) * .3), 0, 255); a[i] = a[i + 1] = a[i + 2] = l; }
    g.putImageData(d, 0, 0);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.flipY = tex.flipY;
    t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.repeat.copy(tex.repeat); t.offset.copy(tex.offset);
    return t;
  }
  function tintModel(obj, hexStr, dur) {
    if (!obj || !obj.userData.mats) return;
    obj.userData.mats.forEach(function (mt) {
      if (mt.metalness > .5 || !mt.map && !mt.userData.map0) return;      // logam (kuningan) tidak diwarnai
      if (!mt.userData.map0) { mt.userData.map0 = mt.map; mt.userData.col0 = mt.color.clone(); }
      if (!hexStr) { mt.map = mt.userData.map0; mt.color.copy(mt.userData.col0); mt.needsUpdate = true; return; }
      if (mt.userData.mapN === undefined) mt.userData.mapN = normalMap(mt.userData.map0);
      if (mt.map !== (mt.userData.mapN || mt.userData.map0)) { mt.map = mt.userData.mapN || mt.userData.map0; mt.needsUpdate = true; }
      var c = col(hexStr).multiplyScalar(TINT_GAIN);
      tw(mt.color, { r: c.r, g: c.g, b: c.b, duration: dur == null ? .8 : dur, ease: 'power2.inOut' });
    });
  }

  /* ---------------------------------------------------------------- tema terang / gelap */
  function setTheme(name, dur) {
    if (!THEMES[name]) name = 'dark';
    themeName = name;
    var th = THEMES[name], d = dur == null ? 1.2 : dur;
    var to = function (c, hexStr) { var v = col(hexStr); tw(c, { r: v.r, g: v.g, b: v.b, duration: d, ease: 'power2.inOut' }); };
    to(scene.background, th.bg); to(scene.fog.color, th.bg); to(mats.floor.color, th.floor); to(O.disc.material.color, th.disc); to(L.hemi.groundColor, th.hemiG);
    tw(theme, { halo: th.halo, exp: th.exp, env: th.env, duration: d, ease: 'power2.inOut' });
    var old = O.wall.material.map; O.wall.material.map = canvasTex(16, 512, backdrop); O.wall.material.needsUpdate = true; if (old) old.dispose();
  }

  /* ---------------------------------------------------------------- kamera membingkai objek */
  var camTw = null, orbit = false;
  function frameItem(b, dur) {
    b = b || (item && item.userData.bounds) || cubixBounds();
    var portrait = W / H < .9;
    if (st.kind === 'map') {
      var freeW = Math.max(200, W - inset.l - inset.r);
      // peta dimiringkan agar terbaca sebagai objek 3D; lebar Jawa ±10.6 unit mengisi ruang kosong
      var vfm = Math.tan(16 * Math.PI / 180) * 2, fill = portrait ? .98 : .9;
      var dm = 10.6 * H / (fill * freeW * vfm);
      return animView({ tx: -.6, ty: 0, tz: .1, dist: clamp(dm, 5, 40), yaw: 0, pitch: portrait ? .95 : .62, fov: 32 }, dur);
    }
    var fov = portrait ? 38 : 30, vf = Math.tan(fov * Math.PI / 360) * 2;
    var fw = Math.max(200, W - inset.l - inset.r), fh = Math.max(200, H - inset.t - inset.b);
    var tight = inset.r > 0 || inset.b > 200;            // ada panel → objek dibingkai lebih dekat
    var kh = st.kind === 'art' ? 1.45 : tight ? 2.3 : 3.6, kw = st.kind === 'art' ? 1.3 : tight ? 1.6 : 2.25;
    if (portrait) { kw = st.kind === 'art' ? 1.15 : st.kind === 'model' || st.kind === 'cubix' ? 1.5 : 1.3; kh = st.kind === 'art' ? 1.3 : 1.9; }
    var needH = b.h * kh + .3, needW = (b.w * kw + .2) * (H / W);
    var span = Math.max(needH * H / fh, needW * W / fw);
    var dist = span / vf;
    var turn = st.kind === 'cubix' || st.kind === 'model';   // objek 3D sungguhan: tampak 3/4
    var yaw = turn ? -.3 : 0, pitch = turn ? .17 : .09;
    animView({ tx: 0, ty: LIFT + b.h * .48, tz: turn ? b.d * .12 : 0, dist: clamp(dist, 2.2, 16), yaw: yaw, pitch: pitch, fov: fov }, dur);
  }
  function animView(to, dur) {
    if (camTw && camTw.kill) camTw.kill();
    if (orbit) setOrbit(false, true);
    if (!G || XW.reduced || !dur) { Object.assign(view, to); return; }
    to.duration = dur; to.ease = 'power3.inOut';
    camTw = G.to(view, to);
  }
  function setOrbit(on, keep) {
    if (!controls || on === orbit) return;
    orbit = on; controls.enabled = on;
    if (on) { controls.target.set(view.tx, view.ty, view.tz); controls.update(); }
    else if (keep) {
      var o = camera.position.clone().sub(controls.target), r = o.length();
      view.dist = r; view.pitch = Math.asin(clamp(o.y / r, -1, 1)); view.yaw = Math.atan2(o.x, o.z);
      view.tx = controls.target.x; view.ty = controls.target.y; view.tz = controls.target.z;
    }
  }

  /* ---------------------------------------------------------------- suasana */
  var MOODS = {
    siang: { key: 2.3, keyC: '#fff1e2', hemi: .45, fill: .55, env: .7, exp: 1.0, halo: .7 },
    senja: { key: 1.55, keyC: '#ffd6aa', hemi: .22, fill: .3, env: .42, exp: .96, halo: 1 },
    malam: { key: .8, keyC: '#ffc48a', hemi: .08, fill: .14, env: .2, exp: .92, halo: .55 }
  };
  var mood = Object.assign({}, MOODS.senja);
  function buildLights() {
    L.hemi = new T.HemisphereLight(col('#d8c7ad'), col('#140f0b'), .22); scene.add(L.hemi);
    L.key = new T.SpotLight(col('#ffd6aa'), 1.55, 0, .5, .9, 1);
    L.key.position.set(2.6, 6.2, 4.2); L.key.target.position.set(0, .3, 0);
    L.key.castShadow = true; L.key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
    L.key.shadow.bias = -.0004; L.key.shadow.normalBias = .02; L.key.shadow.camera.near = 2; L.key.shadow.camera.far = 16;
    scene.add(L.key, L.key.target);
    L.fill = new T.SpotLight(col('#e9d8c2'), .3, 0, .8, 1, 1); L.fill.position.set(-3.8, 1.8, 6); L.fill.target.position.set(0, .45, 0); scene.add(L.fill, L.fill.target);
    L.rim = new T.DirectionalLight(col('#a7b4c4'), .3); L.rim.position.set(-4, 3.5, -4); scene.add(L.rim);
  }
  function setMood(name, dur) {
    var m = MOODS[name] || MOODS.senja, c = col(m.keyC), d = dur == null ? 1.5 : dur;
    tw(mood, { key: m.key, hemi: m.hemi, fill: m.fill, env: m.env, exp: m.exp, halo: m.halo, duration: d, ease: 'power2.inOut' });
    tw(L.key.color, { r: c.r, g: c.g, b: c.b, duration: d });
  }

  /* ---------------------------------------------------------------- loop */
  var v3 = new T.Vector3();
  function project(v) { v3.copy(v).project(camera); return { x: (v3.x * .5 + .5) * W, y: (-v3.y * .5 + .5) * H, v: v3.z > -1 && v3.z < 1 }; }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || XW.paused) { last = now; return; }
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; frame++; clock += dt;
    dtAvg = lerp(dtAvg, dt * 1000, .05);
    if (frame > 150 && dtAvg > 32 && XW.quality > 0) { slow += dt; if (slow > 2.5) { setQuality(XW.quality - 1); slow = 0; } } else slow = 0;
    var k = 1 - Math.pow(.001, dt);
    mouse.sx = lerp(mouse.sx, mouse.x, k * .5); mouse.sy = lerp(mouse.sy, mouse.y, k * .5);
    L.key.intensity = mood.key; L.hemi.intensity = mood.hemi; L.fill.intensity = mood.fill;
    O.halo.material.opacity = mood.halo * theme.halo; renderer.toneMappingExposure = mood.exp * theme.exp;
    mats.fabric.envMapIntensity = .5 * mood.env / .42 * theme.env;
    if (item && item.userData.mats) item.userData.mats.forEach(function (mt) { mt.envMapIntensity = mt.userData.env0 * mood.env / .42 * theme.env; });
    // geser titik pusat pandang agar objek berada di tengah ruang kosong
    inset.x = lerp(inset.x, (inset.r - inset.l) / 2, k * 1.1);
    inset.y = lerp(inset.y, (inset.b - inset.t) / 2, k * 1.1);
    camera.setViewOffset(W, H, inset.x, inset.y, W, H);
    if (!st.drag) {
      st.spinV = lerp(st.spinV, 0, k * .5); st.spin += st.spinV * dt;
      if (st.recenter) { st.spin = lerp(st.spin, 0, k * .7); if (Math.abs(st.spin) < .002) { st.spin = 0; st.recenter = false; } }
    }
    if (item && item.userData.spin) item.userData.spin.rotation.y = st.spin;
    st.map = lerp(st.map, st.mapT, k * .7);
    O.map.visible = st.map > .01;
    if (O.map.visible) {
      if (Math.abs(st.map - (st.beadV || 0)) > .0004) { st.beadV = st.map; placeBeads(st.map); }
      beacons.forEach(function (b, i) {
        var focus = XW.mapFocusI === i;
        b.scale.y = lerp(b.scale.y, (st.map > .6 ? 1 : .001) * (focus ? 1.25 : 1), k * 1.4);
        b.userData.ring.scale.setScalar(1 + ((clock * .5 + i * .25) % 1) * 1.6);
      });
      st.route = lerp(st.route || 0, st.map > .85 ? 1 : 0, k * .6);
      routeGeo.setDrawRange(0, Math.floor(routeCount * st.route / 36) * 36);
      pulse.position.copy(curve.getPointAt((clock * .16) % 1)); pulse.material.opacity = st.route * .9;
    }
    if (orbit) controls.update();
    else {
      var yaw = view.yaw + mouse.sx * .05 + (st.kind !== 'map' ? Math.sin(clock * .11) * .03 : 0), pitch = view.pitch - mouse.sy * .025;
      st.zoomC = lerp(st.zoomC, st.zoom, k * .9);
      var dist = view.dist * st.zoomC;
      camera.position.set(view.tx + Math.sin(yaw) * Math.cos(pitch) * dist, view.ty + Math.sin(pitch) * dist, view.tz + Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(view.tx, view.ty, view.tz);
    }
    var off = Math.abs(st.zoom - 1) > .02 || Math.abs(st.spin) > .03 || st.orbitMoved;
    if (off !== st.off) { st.off = off; if (XW.onView) XW.onView(off); }
    if (Math.abs(camera.fov - view.fov) > .01) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
    var Lb = XW.labels;
    if (st.kind === 'cubix' && st.room === 'atelier' && Math.abs(O.cubix.position.y) < .01) {
      var tot = cfg.seats * SW + (cfg.arms ? 2 * AW : 0);
      Lb.dim = { a: project(sofa.localToWorld(new T.Vector3(-tot / 2, .01, D / 2 + .1))), b: project(sofa.localToWorld(new T.Vector3(tot / 2, .01, D / 2 + .1))), w: Math.round(tot * 100) };
    } else Lb.dim = null;
    Lb.beacons = st.map > .6 ? beacons.map(function (b) { return project(b.localToWorld(new T.Vector3(0, b.userData.h * b.scale.y + .05, 0))); }) : null;
    if (XW.onFrame) XW.onFrame(Lb);
    renderer.render(scene, camera);
  }

  /* ---------------------------------------------------------------- kualitas & ukuran */
  function setQuality(q) {
    XW.quality = q;
    var dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(q >= 2 ? Math.min(dpr, MOBILE ? 1.5 : 1.75) : q === 1 ? 1 : .75);
    renderer.shadowMap.enabled = q > 0;
    renderer.setSize(W, H, false);
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    setQuality(XW.quality);
    if (!orbit) frameItem(null, 0);
  }

  /* ---------------------------------------------------------------- init */
  XW.init = function (cv, opts) {
    opts = opts || {};
    canvas = cv; MOBILE = !!opts.mobile; XW.reduced = !!opts.reduced;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return false; }
    if (!renderer || !renderer.getContext()) return false;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.background = col('#0f0c0a');
    scene.fog = new T.Fog(col('#0f0c0a'), 16, 46);
    camera = new T.PerspectiveCamera(30, 1, .05, 120);
    if (T.RoomEnvironment) scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), .04).texture;
    mats.brass = new T.MeshStandardMaterial({ color: col('#b8924f'), metalness: 1, roughness: .28, envMapIntensity: 1 });
    buildLights(); buildRoom(); buildSofa(); buildMap();
    O.map.userData.bounds = { w: 12, h: 1, d: 4 };
    item = O.cubix;
    setPlinth(cubixBounds().w, true, 0);
    if (T.OrbitControls) {
      controls = new T.OrbitControls(camera, canvas);
      controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .07;
      controls.enablePan = false; controls.minDistance = .9; controls.maxDistance = 24;
      controls.minPolarAngle = .55; controls.maxPolarAngle = 1.48; controls.rotateSpeed = .6;
      controls.addEventListener('start', function () { st.orbitMoved = true; });
    }
    XW.quality = 2;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1; }, { passive: true });
    /* masukan: geser = putar · roda / cubit = zoom (objek apa pun, kapan pun) · ketuk objek = XW.onPick */
    var dx0 = 0, ptrs = {}, pinch = null, down = null, hoverT = 0;
    var gap = function () { var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    canvas.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = Object.keys(ptrs).length;
      down = n === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      if (n === 2 && !orbit) { st.drag = false; pinch = { d: gap(), z: st.zoom }; return; }
      if (n > 1 || orbit || !(item && item.userData.spin)) return;
      st.drag = true; dx0 = e.clientX; st.spinV = 0; st.recenter = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (pinch && Object.keys(ptrs).length >= 2) { setZoom(pinch.z * pinch.d / gap()); return; }
      if (st.drag) { var dx = e.clientX - dx0; dx0 = e.clientX; st.spin += dx * .006; st.spinV = dx * .35; st.lastDrag = performance.now(); return; }
      if (!e.buttons && e.target === canvas && XW.onHover && performance.now() - hoverT > 90) { hoverT = performance.now(); XW.onHover(hit(e.clientX, e.clientY)); }
    }, { passive: true });
    var up = function (e) {
      delete ptrs[e.pointerId];
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (st.drag) { st.drag = false; st.lastDrag = performance.now(); }
      if (down && e.type === 'pointerup' && e.target === canvas && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 550) {
        var k = hit(e.clientX, e.clientY);
        if (k && XW.onPick) XW.onPick(k);
      }
      down = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      if (orbit) return;                                   // Atelier: OrbitControls yang mengurus zoom
      e.preventDefault();
      setZoom(st.zoom * Math.exp(e.deltaY * (e.deltaMode ? .06 : .0013)));
    }, { passive: false });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); XW.ok = false; if (XW.onLost) XW.onLost(); });
    setMood('senja', 0);
    requestAnimationFrame(loop);
    XW.ok = true;
    return true;
  };

  /* ---------------------------------------------------------------- API */
  XW.setInsets = function (l, r, b, t, dur) {
    inset.l = l || 0; inset.r = r || 0; inset.b = b || 0; inset.t = t || 0;
    if (!orbit) frameItem(null, dur == null ? 1.2 : dur);
  };
  XW.setRoom = function (id) {
    st.room = id;
    if (id === 'atelier' && st.kind === 'cubix') {
      var go = function () { if (st.room === 'atelier' && st.kind === 'cubix') { st.spin = 0; setOrbit(true); } };
      if (G && !XW.reduced) G.delayedCall(1.4, go); else go();
    } else if (orbit) { setOrbit(false, true); frameItem(null, 1.2); }
  };
  XW.showCubix = function () {
    req++;
    if (item === O.cubix) { frameItem(null, 1.2); return; }
    present('cubix', O.cubix);
  };
  // fallback: foto lain (mis. foto utama) bila latar foto ini terlalu rumit untuk dipotong rapi
  XW.showProduct = function (p, url, fallback) {
    var my = ++req;
    return getCutout(url).then(function (r) {
      if (my !== req) return;
      if (!r.ok && fallback && fallback !== url) return XW.showProduct(p, fallback);
      var w = sizeFor(p), h = w / r.aspect;
      if (h > 2.2) { h = 2.2; w = h * r.aspect; }
      var g = makeBillboard(r.tex, w, h, false);
      g.visible = false; scene.add(g);
      g.userData.dispose = function () { scene.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== mats.brass) o.material.dispose(); }); };
      present('product', g);
    });
  };
  // model 3D asli; bila gagal dimuat (belum ada / rusak / dibuka dari file://) kembali ke foto
  XW.showModel = function (p, url, photo, hexStr) {
    var my = ++req;
    return getModel(url).then(function (s) {
      if (my !== req) return;
      var g = makeModel(s, p);
      g.visible = false; scene.add(g);
      tintModel(g, hexStr, 0);
      present('model', g);
    }, function (e) {
      if (my !== req) return;
      if (window.console) console.warn('[XW] model 3D tidak bisa dimuat, memakai foto:', url, e && e.message ? e.message : e);
      if (photo) return XW.showProduct(p, photo);
    });
  };
  XW.preloadModel = function (url) { getModel(url).catch(function () {}); };
  XW.setTint = function (hexStr) { if (st.kind === 'model') tintModel(item, hexStr); };
  // kembali ke posisi awal: zoom normal, putaran 0, bingkai kamera semula
  XW.recenter = function () {
    st.zoom = 1; st.spinV = 0; st.recenter = true; st.orbitMoved = false;
    if (orbit) {
      setOrbit(false, true); frameItem(null, 1.1);
      var back = function () { if (st.room === 'atelier' && st.kind === 'cubix') setOrbit(true); };
      if (G && !XW.reduced) G.delayedCall(1.2, back); else back();
    } else frameItem(null, 1.1);
  };
  XW.zoomBy = function (f) { setZoom(st.zoom * f); };
  XW.setTheme = function (n, dur) { setTheme(n, dur); };
  XW.hit = function (x, y) { return hit(x, y); };
  XW.canSpin = function () { return !!(item && item.userData.spin); };
  XW.showArt = function (url) {
    var my = ++req;
    return getRaw(url).then(function (r) {
      if (my !== req) return;
      var g = makeBillboard(r.tex, 1.5, 1.5 / r.aspect, true);
      g.visible = false; scene.add(g);
      g.userData.dispose = function () { scene.remove(g); };
      present('art', g);
    });
  };
  XW.showMap = function () { req++; if (item !== O.map) present('map', O.map); };
  XW.setMood = function (n) { setMood(n); };
  XW.craft = function (c, animate) { return applyCfg(c, animate !== false); };
  XW.mapFocus = function (i) {
    XW.mapFocusI = i;
    if (st.kind !== 'map') return;
    var b = beacons[i]; if (!b) return;
    animView({ tx: b.position.x + (i === 0 ? -1.2 : .8), ty: 0, tz: b.position.z + .1, dist: W / H < .9 ? 14 : 10, yaw: 0, pitch: W / H < .9 ? .95 : .72, fov: 32 }, 1.6);
  };
  XW.mapOverview = function () { XW.mapFocusI = null; if (st.kind === 'map') frameItem(null, 1.6); };
  XW.kind = function () { return st.kind; };
  XW._debug = function () { return { view: Object.assign({}, view), inset: Object.assign({}, inset), cam: camera.position.toArray().map(function (v) { return +v.toFixed(2); }), W: W, H: H }; };
  XW.pause = function (v) { XW.paused = !!v; };
  XW.state = st;
})();
