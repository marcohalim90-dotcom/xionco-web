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
  var st = { room: 'home', kind: 'cubix', drag: false, spin: 0, spinV: 0, lastDrag: -1e9, map: 0, mapT: 0, zoom: 1, zoomC: 1, off: false, orbitMoved: false, recenter: false, cam: false, camYaw: 0, camPitch: 0, camYawT: 0, camPitchT: 0, px: 0, py: 0, pxC: 0, pyC: 0 };   // px/py: geser tampilan (klik tengah)
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
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); O.floor = floor;
    var wall = O.wall = new T.Mesh(new T.CylinderGeometry(15, 15, 14, 128, 1, true), new T.MeshBasicMaterial({ map: canvasTex(16, 512, backdrop), side: T.BackSide, toneMapped: false }));
    wall.position.y = 7; scene.add(wall);
    // cahaya hangat lembut di belakang panggung
    // tekstur halo memudar ke bawah → tidak ada garis tajam di tempat bidang halo memotong lantai
    var haloTex = radial([[0, 'rgba(201,160,108,.34)'], [.45, 'rgba(150,110,70,.1)'], [1, 'rgba(0,0,0,0)']]), hc = haloTex.image, hg = hc.getContext('2d'), hf = hg.createLinearGradient(0, hc.height, 0, 0);
    hf.addColorStop(0, 'rgba(0,0,0,0)'); hf.addColorStop(.42, 'rgba(0,0,0,1)'); hf.addColorStop(1, 'rgba(0,0,0,1)');
    hg.globalCompositeOperation = 'destination-in'; hg.fillStyle = hf; hg.fillRect(0, 0, hc.width, hc.height); haloTex.needsUpdate = true;
    O.halo = new T.Mesh(new T.PlaneGeometry(14, 9), new T.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false }));
    O.halo.position.set(0, 2.6, -9.5); scene.add(O.halo);
    // panggung bundar rendah + garis champagne
    O.plinth = new T.Group();
    var disc = O.disc = shadowed(new T.Mesh(new T.CylinderGeometry(1, 1.02, .06, 128), new T.MeshStandardMaterial({ color: col('#1c1814'), roughness: .5, metalness: .1, envMapIntensity: .3 })));
    disc.position.y = .03; O.plinth.add(disc);
    var rim = new T.Mesh(new T.TorusGeometry(1.004, .0035, 8, 200), new T.MeshStandardMaterial({ color: col('#c4a674'), metalness: 1, roughness: .3, envMapIntensity: 1.2 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = .061; O.plinth.add(rim); O.rim = rim;
    O.plinth.scale.set(2, 1, 2);
    scene.add(O.plinth);
    O.blobTex = radial([[0, 'rgba(0,0,0,.75)'], [.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]);
    buildHorizon(); buildStudio(); buildGrid();
  }
  /* ---------------------------------------------------------------- background: Default & Studio
     Default = ruang gelap/terang dengan dinding melingkar; horizon dilunakkan: lantai memudar ke warna
     dinding mendekati dinding + kabut tipis di kaki dinding (tidak ada garis patah).
     Studio  = cyclorama studio foto: lantai melengkung mulus menjadi dinding (tanpa horizon). */
  var bgName = 'default';
  var STUDIO = { dark: '#57524c', light: '#f2f0ec' };
  function fadeTex(radial) {
    var c = document.createElement('canvas'), n = 512; c.width = radial ? n : 4; c.height = n;
    var g = c.getContext('2d'), gr;
    if (radial) { gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.3, 'rgba(255,255,255,0)'); gr.addColorStop(.62, 'rgba(255,255,255,.55)'); gr.addColorStop(.84, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); }
    else { gr = g.createLinearGradient(0, n, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.8)'); gr.addColorStop(.6, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, c.width, n);
    return new T.CanvasTexture(c);
  }
  function buildHorizon() {
    var wc = col(THEMES[themeName].wall[2]);
    // lantai → warna dinding (cincin transparan di lantai, mulai r ±7,6 m)
    O.hzFloor = new T.Mesh(new T.CircleGeometry(15.2, 128), new T.MeshBasicMaterial({ color: wc, map: fadeTex(true), transparent: true, depthWrite: false, toneMapped: false }));
    O.hzFloor.rotation.x = -Math.PI / 2; O.hzFloor.position.y = .004; O.hzFloor.renderOrder = -1; O.hzFloor.userData.noPick = true; scene.add(O.hzFloor);
    // kabut di kaki dinding: pita melingkar yang memudar ke atas
    O.hzBand = new T.Mesh(new T.CylinderGeometry(14.9, 14.9, 5, 128, 1, true), new T.MeshBasicMaterial({ color: wc, map: fadeTex(false), transparent: true, depthWrite: false, side: T.BackSide, toneMapped: false }));
    O.hzBand.position.y = 2.5; O.hzBand.userData.noPick = true; scene.add(O.hzBand);
  }
  function buildStudio() {
    // profil: lantai datar → lengkung (r 2,6 m) → dinding tegak; diputar 360° jadi mangkuk mulus
    var R = 11, cv = 2.6, Hh = 9, pts = [new T.Vector2(0, 0), new T.Vector2(R - cv, 0)];
    for (var i = 1; i <= 16; i++) { var a = i / 16 * Math.PI / 2; pts.push(new T.Vector2(R - cv + Math.sin(a) * cv, cv - Math.cos(a) * cv)); }
    pts.push(new T.Vector2(R, Hh));
    var geo = new T.LatheGeometry(pts, 128);
    O.studio = new T.Mesh(geo, new T.MeshStandardMaterial({ color: col(STUDIO[themeName]), roughness: .92, metalness: 0, side: T.BackSide, envMapIntensity: .35 }));
    O.studio.receiveShadow = true; O.studio.visible = false; O.studio.userData.noPick = true; scene.add(O.studio);
  }
  /* Garis = jaring garis halus di lantai & dinding (warna pilihan) · Neon = jaring bercahaya digital
     (warna pilihan) + halo & garis podium ikut menyala. Garis dibuat di shader (anti-alias fwidth). */
  var GRIDV = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  var GRIDF = 'uniform vec3 uC; uniform float uOp, uGlow, uWall; varying vec3 vW;\n' +
    'float ln(vec2 p, float w) { vec2 q = abs(fract(p - 0.5) - 0.5) / fwidth(p); return 1.0 - min(min(q.x, q.y) / w, 1.0); }\n' +
    'void main() {\n' +
    ' vec2 p = uWall > 0.5 ? vec2(atan(vW.z, vW.x) * 14.8, vW.y) : vW.xz;\n' +
    ' float minor = ln(p / 0.5, 1.0), major = ln(p / 2.5, 1.4);\n' +
    ' float fade = uWall > 0.5 ? smoothstep(10.0, 0.5, vW.y) * smoothstep(-0.2, 0.6, vW.y) : 1.0 - smoothstep(4.0, 14.5, length(vW.xz));\n' +
    ' float a = (minor * 0.28 + major * 0.75) * fade;\n' +
    ' if (uGlow > 0.5) a += ln(p / 2.5, 7.0) * 0.22 * fade + ln(p / 0.5, 4.0) * 0.06 * fade;\n' +
    ' gl_FragColor = vec4(uC * (1.0 + uGlow * 0.8), a * uOp);\n' +
    '}';
  function gridMat(wall) {
    return new T.ShaderMaterial({ uniforms: { uC: { value: col('#bfa274') }, uOp: { value: .5 }, uGlow: { value: 0 }, uWall: { value: wall ? 1 : 0 } }, vertexShader: GRIDV, fragmentShader: GRIDF,
      extensions: { derivatives: true }, transparent: true, depthWrite: false, toneMapped: false, side: wall ? T.BackSide : T.FrontSide });
  }
  function buildGrid() {
    O.gridFloor = new T.Mesh(new T.CircleGeometry(15, 96), gridMat(false));
    O.gridFloor.rotation.x = -Math.PI / 2; O.gridFloor.position.y = .006; O.gridFloor.renderOrder = 0;
    O.gridWall = new T.Mesh(new T.CylinderGeometry(14.7, 14.7, 12, 128, 1, true), gridMat(true)); O.gridWall.position.y = 6;
    [O.gridFloor, O.gridWall].forEach(function (m) { m.visible = false; m.userData.noPick = true; scene.add(m); });
  }
  var bgHex = '#22e1ff';
  function gridLook(d) {
    var on = bgName === 'grid' || bgName === 'neon', neon = bgName === 'neon', light = themeName === 'light';
    var c = col(bgName === 'grid' && !bgHex ? '#bfa274' : bgHex);
    [O.gridFloor, O.gridWall].forEach(function (m) {
      if (!m) return; m.visible = on;
      var u = m.material.uniforms; u.uGlow.value = neon ? 1 : 0;
      m.material.blending = neon && !light ? T.AdditiveBlending : T.NormalBlending; m.material.needsUpdate = true;
      tw(u.uC.value, { r: c.r, g: c.g, b: c.b, duration: d == null ? .5 : d });
      u.uOp.value = neon ? (light ? .85 : 1) : (light ? .55 : .42);
    });
    // neon: halo & garis podium ikut warna
    if (O.halo) { var hc = neon ? c.clone().multiplyScalar(1.6) : new T.Color(1, 1, 1); tw(O.halo.material.color, { r: hc.r, g: hc.g, b: hc.b, duration: .5 }); }
    if (O.rim) { O.rim.material.emissive.copy(neon ? c : new T.Color(0, 0, 0)); O.rim.material.emissiveIntensity = neon ? 1.2 : 1; }
  }
  function horizonColor(d) {
    var wc = col(THEMES[themeName].wall[2]);
    [O.hzFloor, O.hzBand].forEach(function (m) { if (m) tw(m.material.color, { r: wc.r, g: wc.g, b: wc.b, duration: d == null ? 1.2 : d }); });
    if (O.studio) { var sc = col(STUDIO[themeName]); tw(O.studio.material.color, { r: sc.r, g: sc.g, b: sc.b, duration: d == null ? 1.2 : d }); }
  }
  XW.setBackground = function (name, hex) {
    bgName = /^(studio|grid|neon)$/.test(name) ? name : 'default';
    if (hex) bgHex = hex;
    gridLook();
    var st0 = bgName === 'studio';
    if (O.studio) O.studio.visible = st0;
    [O.wall, O.halo, O.hzFloor, O.hzBand].forEach(function (m) { if (m) m.visible = !st0; });
    if (mats.floor && O.floor) O.floor.visible = !st0;
    if (O.plinth) O.plinth.visible = !st0;   // studio foto: furnitur langsung di lantai, tanpa podium
  };
  XW.background = function () { return bgName; };
  XW.setBackgroundColor = function (hex) { bgHex = hex; gridLook(); };

  /* ---------------------------------------------------------------- CUBIX */
  var S = (XV && XV.STUDIO) || { seatW: 72, armW: 16, depth: 86, height: 74, fabrics: [{ id: 'fb03', color: '#c7bba7', type: 'fabric' }] };
  var SW = S.seatW / 100, AW = S.armW / 100, D = S.depth / 100, HH = S.height / 100, PL = .075, LIFT = .06;
  var sofa, slots = {}, cfg = { seats: 3, arms: true, ottoman: false, fabric: 'fb03', base: 'walnut' };
  var BASES = {
    oak: { color: '#9c7650', metal: 0, rough: .55, wood: true }, walnut: { color: '#5b3e2b', metal: 0, rough: .5, wood: true },
    steel: { color: '#1d1c1b', metal: .9, rough: .32 }, brass: { color: '#b8924f', metal: 1, rough: .26 }
  };
  function rbox(w, h, d, r, seg) { return T.RoundedBoxGeometry ? new T.RoundedBoxGeometry(w, h, d, seg || 5, r) : new T.BoxGeometry(w, h, d); }
  // UV kotak dalam meter (seperti uvBox di maker.js) → tekstur kain/kayu asli berskala nyata
  function uvMetric(geo) {
    var p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; if (!p || !n || !uv) return geo;
    geo.computeBoundingBox();
    var bb = geo.boundingBox, ex = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z], P = p.array, N = n.array, U = uv.array;
    for (var i = 0, j = 0; i < P.length; i += 3, j += 2) {
      var ax = Math.abs(N[i]), ay = Math.abs(N[i + 1]), az = Math.abs(N[i + 2]), a = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2, b = (a + 1) % 3, c = (a + 2) % 3;
      if (ex[c] > ex[b]) { var t = b; b = c; c = t; }
      U[j] = P[i + b]; U[j + 1] = P[i + c];
    }
    uv.needsUpdate = true; return geo;
  }
  function part(g, geo, mat, x, y, z) { var m = shadowed(new T.Mesh(uvMetric(geo), mat)); m.position.set(x, y, z); g.add(m); return m; }
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
  function fabricOf(c) { return (S.fabrics || []).filter(function (x) { return x.id === c.fabric; })[0] || S.fabrics[0]; }
  /* tekstur asli CUBIX (js/texlib.js): kain Vienna / kulit, kayu walnut / oak, logam brushed.
     Selama memuat (atau file://) tetap kanvas prosedural O.weave / O.wood. */
  var CTX = {};
  function cubixTex(name) {
    if (!window.XTEX || !XTEX.ok) return null;
    if (CTX[name] === undefined) { CTX[name] = null; XTEX.load(name).then(function (t) { CTX[name] = t; cubixMaps(); }, function () {}); }
    return CTX[name];
  }
  function cubixMaps() {
    var f = fabricOf(cfg), b = BASES[cfg.base] || BASES.oak, leather = f.type === 'leather', fm = mats.fabric, bm = mats.base;
    var ft = cubixTex(leather ? 'leather-fine' : 'fabric-woven'), bt = cubixTex(b.wood ? (cfg.base === 'walnut' ? 'wood-walnut' : 'wood-oak') : 'metal-brushed');
    fm.map = leather ? null : ft ? ft.map : O.weave; fm.bumpMap = leather || ft ? null : O.weave;
    fm.normalMap = ft ? ft.normalMap : null; fm.roughnessMap = ft ? ft.roughnessMap : null;
    fm.normalScale.set(leather ? .5 : .85, leather ? .5 : .85); fm.roughness = (leather ? .4 : .92) / (ft ? .8 : 1);
    bm.map = b.wood ? (bt ? bt.map : O.wood) : null; bm.normalMap = bt ? bt.normalMap : null; bm.roughnessMap = bt ? bt.roughnessMap : null;
    bm.normalScale.set(b.wood ? .4 : .3, b.wood ? .4 : .3); bm.roughness = b.rough / (bt ? .8 : 1);
    fm.needsUpdate = bm.needsUpdate = true;
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
    var f = fabricOf(cfg), b = BASES[cfg.base] || BASES.oak, leather = f.type === 'leather';
    var fc = col(f.color).multiplyScalar(leather ? 1 : .82), bc = col(b.color);
    mats.fabric.sheen = leather ? 0 : .5; mats.fabric.clearcoat = leather ? .3 : 0;
    mats.base.metalness = b.metal;
    cubixMaps();
    if (animate) {
      tw(mats.fabric.color, { r: fc.r, g: fc.g, b: fc.b, duration: 1, ease: 'power2.inOut' });
      tw(mats.fabric.sheenColor, { r: fc.r * 1.6 + .05, g: fc.g * 1.6 + .05, b: fc.b * 1.6 + .05, duration: 1 });
      tw(mats.base.color, { r: bc.r, g: bc.g, b: bc.b, duration: 1, ease: 'power2.inOut' });
    } else {
      mats.fabric.color.copy(fc); mats.fabric.sheenColor.setRGB(fc.r * 1.6 + .05, fc.g * 1.6 + .05, fc.b * 1.6 + .05); mats.base.color.copy(bc);
    }
    O.cubix.userData.bounds = cubixBounds();
    if (st.kind === 'cubix' && O.plinth) setPlinth(O.cubix.userData.bounds, true, animate ? 1.1 : 0);
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
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.scale.set(w * 1.15, framed ? .5 : Math.max(.35, w * .45), 1); blob.userData.noPick = blob.userData.blob = true;
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
  /* model bermodul (tools/glb/tile.py): ujung kiri + n lajur channel + ujung kanan.
     Panjang berubah = jumlah lajur bertambah/berkurang, bukan channel yang diregangkan. */
  function tileArrange(m, n) {
    var t = m.userData.xionco_tile; if (!t) return;
    var L = m.getObjectByName('endL'), R = m.getObjectByName('endR'), tpl = m.getObjectByName('tile');
    if (!L || !R || !tpl) return;
    var st0 = m.userData._tile || (m.userData._tile = { lx: L.position.x, rx: R.position.x, tx: tpl.position.x, clones: [] });
    st0.clones.forEach(function (c) { c.parent.remove(c); });
    st0.clones = [];
    tpl.visible = false;
    var shift = -(n - t.n0) * t.pitch / 2;
    L.position.x = st0.lx + shift;
    R.position.x = st0.rx + (n - t.n0) * t.pitch + shift;
    for (var i = 0; i < n; i++) {
      var c = tpl.clone(true); c.visible = true; c.name = 'tile#' + i;
      c.position.x = st0.tx + i * t.pitch + shift;
      tpl.parent.add(c); st0.clones.push(c);
    }
    m.userData._tileN = n;
  }
  function makeModel(srcScene, p) {
    var m = srcScene.clone(true), box = new T.Box3(), size = new T.Vector3(), want = sizeFor(p);
    // bagian bergerak dari pipeline (extras xc_motion: pintu, flap, sandaran sofa bed) → motions (klik / Animate)
    var mov = [];
    m.traverse(function (o) {
      var d = o.userData && o.userData.xc_motion; if (!d) return;
      var p0 = o.position.clone(), r0 = o.rotation.clone(), ax = d.axis || 'x';
      var mo = { id: 'gm-' + d.id, kind: d.amt ? 'rot' : 'slide', t: 0, to: 0, apply: function (v) { if (d.move) o.position.set(p0.x + d.move[0] * v, p0.y + d.move[1] * v, p0.z + d.move[2] * v); if (d.amt) o.rotation[ax] = r0[ax] + d.amt * v; } };   // putar dan/atau geser
      o.traverse(function (q) { q.userData.motion = mo; }); mov.push(mo);
    });
    if (m.userData.xionco_tile) tileArrange(m, m.userData.xionco_tile.n0);
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
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.scale.set(size.x * 1.12, size.z * 1.2, 1); blob.userData.noPick = blob.userData.blob = true;
    g.add(blob);
    g.userData = { bounds: { w: size.x, h: size.y, d: size.z }, spin: spin, mats: list, unit: s };
    if (mov.length) g.userData.built = { motions: mov };
    applyWB(g);
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
  // podium jauh lebih lebar dari objek (±1,3 × diagonal tapak) dan selalu mengikuti ukurannya
  function setPlinth(b, visible, dur) {
    b = typeof b === 'number' ? { w: b, d: b * .45 } : b || { w: 1, d: .5 };
    var r = visible ? clamp(Math.sqrt(b.w * b.w + b.d * b.d) / 2 * 1.3 + .24, .95, 3.4) : .001, d = dur == null ? 1.1 : dur;
    tw(O.plinth.scale, { x: r, z: r, duration: d, ease: 'power3.inOut' });
    tw(O.plinth.position, { y: visible ? 0 : -.2, duration: d * .8, ease: 'power3.inOut' });
  }
  function present(kind, obj) {
    var prev = item;
    st.kind = kind; item = obj;
    st.mapT = kind === 'map' ? 1 : 0;
    if (prev !== obj && obj.userData.spin) { st.spin = 0; st.spinV = 0; obj.userData.spin.rotation.y = 0; }
    if (prev !== obj) { st.zoom = 1; st.recenter = false; st.px = st.py = 0; }
    if (prev && prev !== obj && prev !== O.map) sink(prev, function () { if (prev.userData.dispose) prev.userData.dispose(); });
    if (obj === O.map) { O.map.position.y = 0; O.map.visible = true; }
    else if (prev !== obj) rise(obj, prev && prev !== O.map ? .45 : .1);
    setPlinth(obj.userData.bounds, kind !== 'map');
    // ruang (beberapa furnitur): tanpa podium, sorot utama lebih lebar
    O.plinth.visible = kind !== 'room' && bgName !== 'studio';
    if (RS.g) RS.g.visible = RS.on && kind === 'room';
    L.key.angle = kind === 'room' ? 1.05 : .5;
    humanPlace();
    var fog = kind === 'map' ? [34, 90] : kind === 'room' ? [30, 110] : [16, 46];   // ruangan bisa dilihat dari jauh (panel + kotak lebar)
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

  /* ---------------------------------------------------------------- MANUSIA SKALA: manikin 170 cm, 50% transparan
     Model CC0 (assets/library/mannequin, lihat LICENSE.txt): pria & wanita (Blender Studio Human Base Meshes, primitive),
     manikin kayu (burning_barb). Dua lapis: kedalaman dulu, lalu warna opacity .5 → tampak satu lapis. Berdiri di kanan objek. */
  var HUM = { g: null, on: false, kind: 'pria', hw: .3, req: 0 };
  var HUM_URL = { pria: 'mannequin/pria.glb', wanita: 'mannequin/wanita.glb', manikin: 'mannequin/manikin.glb' };
  function humanSkin(src) {
    var g = new T.Group(), depthM = new T.MeshBasicMaterial({ colorWrite: false });
    var bodyM = new T.MeshStandardMaterial({ color: col('#e9e3d9'), roughness: .5, metalness: 0, transparent: true, opacity: .5, depthWrite: false, depthFunc: T.LessEqualDepth });
    src.updateMatrixWorld(true);
    src.traverse(function (m) {
      if (!m.isMesh) return;
      [[depthM, 20], [bodyM, 21]].forEach(function (p) { var q = new T.Mesh(m.geometry, p[0]); m.matrixWorld.decompose(q.position, q.quaternion, q.scale); q.renderOrder = p[1]; q.userData.noPick = true; g.add(q); });
    });
    var b = new T.Box3().setFromObject(g), s = 1.7 / Math.max(.01, b.max.y - b.min.y);   // pastikan tepat 170 cm
    g.scale.setScalar(s); b = new T.Box3().setFromObject(g); g.position.y = -b.min.y;
    var wrap = new T.Group(); wrap.add(g); wrap.userData.noPick = true; wrap.userData.hw = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
    return wrap;
  }
  function humanLoad(kind) {
    var my = ++HUM.req;
    return getModel(src0(LIB + HUM_URL[kind])).then(function (sc) {
      if (my !== HUM.req) return;
      if (HUM.g) { scene.remove(HUM.g); HUM.g = null; }
      HUM.g = humanSkin(sc); HUM.hw = HUM.g.userData.hw; scene.add(HUM.g); humanPlace();
      if (item && st.kind !== 'map') frameItem(null, 1.1);
    }, function () {});
  }
  function humanPlace() {
    if (!HUM.g) return;
    var vis = HUM.on && !!item && st.kind !== 'map'; HUM.g.visible = vis; if (!vis) return;
    var x, z, ry;
    if (st.kind === 'room' && RS.on) { x = RS.cfg.w / 2 - Math.max(.5, HUM.hw * .8); z = RS.cfg.d / 2 - .65; ry = -.45; }   // ruangan: sudut kanan depan
    else { var b = new T.Box3().setFromObject(item); x = b.isEmpty() ? .9 : b.max.x + HUM.hw * .85 + .12; z = b.isEmpty() ? 0 : (b.min.z + b.max.z) / 2 + .1; ry = -.35; }
    HUM.g.position.set(x, LIFT, z); HUM.g.rotation.y = ry;
  }
  // XW.human() → jenis yang tampil atau false; XW.human('pria' | 'wanita' | 'manikin') → tampilkan; XW.human(false) → sembunyikan
  XW.human = function (k) {
    if (k === undefined) return HUM.on ? HUM.kind : false;
    if (k === true) k = HUM.kind;
    HUM.on = !!k && !!HUM_URL[k];
    if (HUM.on && (k !== HUM.kind || !HUM.g)) { HUM.kind = k; humanLoad(k); }
    humanPlace(); if (item && st.kind !== 'map') frameItem(null, 1.1);
    return HUM.on ? HUM.kind : false;
  };

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
  /* white balance produk: cahaya kunci Senja/Malam oranye → kain abu tampak cokelat, kayu tampak merah.
     Warna material model katalog dikoreksi sebagian ke arah netral (panggung & Customize tetap hangat). Logam tidak. */
  var WB = new T.Color(1, 1, 1), WB_K = .65;
  function setWB(tintHex) {
    var t = col(tintHex || '#ffffff'), f = function (v) { return 1 + (1 / Math.max(v, .05) - 1) * WB_K; };
    var r = f(t.r), g = f(t.g), b = f(t.b), l = .2126 * r + .7152 * g + .0722 * b;
    WB.setRGB(r / l, g / l, b / l);
  }
  function wbTarget(mt) {   // warna akhir: warna varian (kain) atau warna asli material, dikali WB
    var u = mt.userData, c = u.tint ? col(u.tint).multiplyScalar(u.tintTex ? TINT_GAIN : 1) : u.col0.clone();
    return c.multiply(WB);
  }
  function applyWB(obj, dur) {
    if (!obj || !obj.userData.mats) return;
    obj.userData.mats.forEach(function (mt) {
      if (!mt.userData.col0) mt.userData.col0 = mt.color.clone();
      if (mt.metalness > .5) return;
      var c = wbTarget(mt);
      if (dur) tw(mt.color, { r: c.r, g: c.g, b: c.b, duration: dur, ease: 'power2.inOut' }); else mt.color.copy(c);
    });
  }
  function tintModel(obj, hexStr, dur) {
    if (!obj || !obj.userData.mats) return;
    var roles = obj.userData.mats.some(function (mt) { return mt.userData.role; });
    obj.userData.mats.forEach(function (mt) {
      if (!mt.userData.col0) mt.userData.col0 = mt.color.clone();
      if (roles ? mt.userData.role !== 'fabric' : (mt.metalness > .5 || !mt.map && !mt.userData.map0)) return;   // model SKP: hanya kain (extras role); lainnya: logam tidak diwarnai
      var tex = !!(mt.map || mt.userData.map0);
      mt.userData.tint = hexStr || null; mt.userData.tintTex = tex;
      if (!tex) return;
      if (!mt.userData.map0) mt.userData.map0 = mt.map;
      if (hexStr && mt.userData.mapN === undefined) mt.userData.mapN = normalMap(mt.userData.map0);
      var want = hexStr ? mt.userData.mapN || mt.userData.map0 : mt.userData.map0;
      if (mt.map !== want) { mt.map = want; mt.needsUpdate = true; }
    });
    applyWB(obj, dur == null ? .8 : dur);
  }

  /* ---------------------------------------------------------------- tema terang / gelap */
  function setTheme(name, dur) {
    if (!THEMES[name]) name = 'dark';
    themeName = name;
    var th = THEMES[name], d = dur == null ? 1.2 : dur;
    var to = function (c, hexStr) { var v = col(hexStr); tw(c, { r: v.r, g: v.g, b: v.b, duration: d, ease: 'power2.inOut' }); };
    to(scene.background, th.bg); to(scene.fog.color, th.bg); to(mats.floor.color, th.floor); to(O.disc.material.color, th.disc); to(L.hemi.groundColor, th.hemiG);
    tw(theme, { halo: th.halo, exp: th.exp, env: th.env, duration: d, ease: 'power2.inOut' });
    if (CS.plane) tw(CS.plane.material, { opacity: name === 'light' ? .72 : 1, duration: d });
    var old = O.wall.material.map; O.wall.material.map = canvasTex(16, 512, backdrop); O.wall.material.needsUpdate = true; if (old) old.dispose();
    horizonColor(d); gridLook(d);
  }

  /* ---------------------------------------------------------------- kamera membingkai objek */
  var camTw = null, orbit = false;
  function frameItem(b, dur) {
    b = b || (item && item.userData.bounds) || cubixBounds();
    if (HUM.on && st.kind !== 'map' && !(st.kind === 'room' && RS.on)) b = { w: b.w + HUM.hw * 2 + .5, h: Math.max(b.h, 1.05), d: b.d };   // manikin di samping: bingkai lebih lebar & tinggi
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
    if (portrait) { kw = st.kind === 'art' ? 1.15 : st.kind === 'model' || st.kind === 'cubix' || st.kind === 'custom' ? 1.5 : 1.3; kh = st.kind === 'art' ? 1.3 : 1.9; }
    var needH = b.h * kh + .3, needW = (b.w * kw + .2) * (H / W);
    var span = Math.max(needH * H / fh, needW * W / fw);
    var dist = span / vf;
    var turn = st.kind === 'cubix' || st.kind === 'cubixcfg' || st.kind === 'model' || st.kind === 'custom';   // objek 3D sungguhan: tampak 3/4
    var yaw = turn ? -.3 : 0, pitch = turn ? .17 : .09;
    if (st.kind === 'room' && RS.on) { yaw = .5; pitch = .2; }   // ruangan: tampak 3/4 dari kanan depan → tembok kiri & belakang terlihat
    animView({ tx: 0, ty: LIFT + b.h * .48, tz: turn ? b.d * .12 : 0, dist: clamp(dist, 2.2, st.kind === 'room' ? 40 : 16), yaw: yaw, pitch: pitch, fov: fov }, dur);
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
  // hdr = lingkungan HDRI (lihat HDR di bawah) · tint = warna cahaya lingkungan (sRGB)
  var MOODS = {
    siang: { key: 2.3, keyC: '#fff1e2', hemi: .45, fill: .55, env: .7, exp: 1.0, halo: .7, hdr: 'room', tint: '#fff8f0' },
    senja: { key: 1.55, keyC: '#ffd6aa', hemi: .22, fill: .3, env: .42, exp: .96, halo: 1, hdr: 'studio', tint: '#ffe6cc' },
    malam: { key: .8, keyC: '#ffc48a', hemi: .08, fill: .14, env: .2, exp: .92, halo: .55, hdr: 'studio', tint: '#ffd2a4' }
  };
  /* ---------------------------------------------------------------- lingkungan HDRI (CC0 Poly Haven, assets/library/hdri)
     RGBELoader dimuat malas; HDRI 512×256 dipasang di bola yang diputar (cahaya kunci kanan-depan, dinding
     terang kiri) lalu PMREM → scene.environment (cache per suasana). k = penyama terang: irradiansi depan
     setara RoomEnvironment lama, jadi envMapIntensity material tetap. Latar tetap ruang gelap / ivory.
     Sebelum siap, bila gagal, atau dari file:// tetap RoomEnvironment. */
  var HDR = { studio: { f: 'studio_small_09_512.hdr', k: 1.136, rot: -1.55 }, room: { f: 'brown_photostudio_02_512.hdr', k: 1.066, rot: -2.74 } };
  var hdrP = {}, envC = {}, moodName = 'senja';
  function hdrTex(id) {
    if (!hdrP[id]) {
      hdrP[id] = (T.RGBELoader ? Promise.resolve() : addScript('loaders/RGBELoader.js')).then(function () {
        return new Promise(function (res, rej) { new T.RGBELoader().load((window.XTEX ? XTEX.root : '../') + 'assets/library/hdri/' + HDR[id].f, res, null, rej); });
      });
      hdrP[id].catch(function () { if (window.console) console.warn('[XW] HDRI gagal dimuat, tetap RoomEnvironment:', HDR[id].f); });
    }
    return hdrP[id];
  }
  function envFor(m) {
    var key = m.hdr + m.tint;
    if (envC[key]) return Promise.resolve(envC[key]);
    if (location.protocol === 'file:' || !HDR[m.hdr]) return Promise.reject(new Error('tanpa HDRI'));
    return hdrTex(m.hdr).then(function (tex) {
      if (envC[key]) return envC[key];
      var es = new T.Scene(), sp = new T.Mesh(new T.SphereGeometry(10, 48, 24), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, toneMapped: false }));
      sp.rotation.y = HDR[m.hdr].rot; sp.material.color.copy(col(m.tint)).multiplyScalar(HDR[m.hdr].k); es.add(sp);
      var pm = new T.PMREMGenerator(renderer), rt = pm.fromScene(es, .02, .1, 50);
      pm.dispose(); sp.geometry.dispose(); sp.material.dispose();
      envC[key] = rt.texture; return rt.texture;
    });
  }
  // tampilan render: HDRI suasana, bayangan kontak, ambient occlusion — bisa dimatikan (XW.setLook)
  var LOOK = { hdr: false, contact: false, ao: false };   // bawaan Klasik (seperti semula); Realistis = semua aktif
  function setEnv(name) {
    if (!LOOK.hdr) { if (O.roomEnv) scene.environment = O.roomEnv; return; }
    envFor(MOODS[name] || MOODS.senja).then(function (t) { if (moodName === name && LOOK.hdr) scene.environment = t; }, function () {});
  }
  var mood = Object.assign({}, MOODS.senja);
  setWB(MOODS.senja.tint);
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
    moodName = MOODS[name] ? name : 'senja'; setEnv(moodName);
    tw(mood, { key: m.key, hemi: m.hemi, fill: m.fill, env: m.env, exp: m.exp, halo: m.halo, duration: d, ease: 'power2.inOut' });
    tw(L.key.color, { r: c.r, g: c.g, b: c.b, duration: d });
    setWB(m.tint); if (item) item.traverse(function (o) { if (o.userData.mats) applyWB(o, d); });
  }

  /* ---------------------------------------------------------------- layar penuh (dipakai bayangan kontak & pasca-proses) */
  var VQ = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FQ = null;
  function quad(mat, target) {
    if (!FQ) { FQ = { s: new T.Scene(), c: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), m: new T.Mesh(new T.PlaneGeometry(2, 2)) }; FQ.m.frustumCulled = false; FQ.s.add(FQ.m); }
    FQ.m.material = mat; renderer.setRenderTarget(target || null); renderer.render(FQ.s, FQ.c);
  }
  // blur gauss 9 ketuk (dir = langkah texel), juga untuk alpha
  var BLUR9 = 'uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;\n' +
    'void main() { vec4 s = texture2D(tDiffuse, vUv) * .2270270;\n' +
    ' s += (texture2D(tDiffuse, vUv + dir * 1.3846154) + texture2D(tDiffuse, vUv - dir * 1.3846154)) * .3162162;\n' +
    ' s += (texture2D(tDiffuse, vUv + dir * 3.2307692) + texture2D(tDiffuse, vUv - dir * 3.2307692)) * .0702703;\n' +
    ' gl_FragColor = s; }';

  /* ---------------------------------------------------------------- bayangan kontak di panggung
     Kamera ortografis dari bawah merekam bagian objek 3D yang ≤ 35 cm di atas panggung sebagai bayangan
     lembut (blur dua kali). Hanya dirender ulang bila objek bergerak / berganti / dibangun ulang.
     Foto potong, karya & peta tetap memakai bayangan bulat (blob). Kualitas 0 → blob saja. */
  var CS = { on: false, sig: '', H: .35, N: 256 };
  function buildContact() {
    var mk = function () { var r = new T.WebGLRenderTarget(CS.N, CS.N); r.texture.generateMipmaps = false; return r; };
    CS.rt = mk(); CS.rtB = mk();
    CS.g = new T.Group(); CS.g.position.y = LIFT + .0015; scene.add(CS.g);
    CS.plane = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ map: CS.rt.texture, transparent: true, depthWrite: false, opacity: 1, toneMapped: false }));
    CS.plane.renderOrder = 1; CS.plane.userData.noPick = true; CS.plane.visible = false; CS.g.add(CS.plane);
    CS.cam = new T.OrthographicCamera(-.5, .5, .5, -.5, 0, CS.H); CS.cam.rotation.x = Math.PI / 2; CS.g.add(CS.cam);
    CS.depth = new T.MeshDepthMaterial(); CS.dark = { value: 1.5 };
    CS.depth.onBeforeCompile = function (sh) {
      sh.uniforms.darkness = CS.dark;
      sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), pow( 1.0 - fragCoordZ, 1.6 ) * darkness );');
    };
    CS.depth.depthTest = CS.depth.depthWrite = false;
    CS.blur = new T.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, dir: { value: new T.Vector2() } }, vertexShader: VQ, fragmentShader: BLUR9, depthTest: false, depthWrite: false });
  }
  var tmpC = new T.Color();
  function contactBlur(px) {
    CS.blur.uniforms.tDiffuse.value = CS.rt.texture; CS.blur.uniforms.dir.value.set(px / CS.N, 0); quad(CS.blur, CS.rtB);
    CS.blur.uniforms.tDiffuse.value = CS.rtB.texture; CS.blur.uniforms.dir.value.set(0, px / CS.N); quad(CS.blur, CS.rt);
  }
  function updateContact() {
    if (!CS.plane) return;
    var three = /^(cubix|cubixcfg|custom|model)$/.test(st.kind), on = CS.on && item && item.visible && three && item.position.y > -.45;
    CS.plane.visible = !!on;
    if (!on) { CS.sig = ''; return; }
    var b = item.userData.bounds || cubixBounds(), S = Math.sqrt(b.w * b.w + b.d * b.d) + .8, sp = item.userData.spin;
    var sig = [item.uuid, item.position.y.toFixed(3), sp ? sp.rotation.y.toFixed(3) : '', S.toFixed(2), item.userData.built ? item.userData.built.group.uuid : ''].join('|');
    if (item.userData.built && item.userData.built.motions) item.userData.built.motions.forEach(function (m) { sig += ',' + (m.lin == null ? m.t : m.lin).toFixed(3); });
    if (item === O.cubix) Object.keys(slots).forEach(function (k) { var p = slots[k].position; sig += ',' + k + p.x.toFixed(3) + p.y.toFixed(3); });
    if (sig === CS.sig) return;
    CS.sig = sig;
    CS.plane.scale.set(S, -1, S);
    CS.cam.left = CS.cam.bottom = -S / 2; CS.cam.right = CS.cam.top = S / 2; CS.cam.updateProjectionMatrix();
    var vis = scene.children.map(function (o) { var v = o.visible; o.visible = o === item; return v; }), hid = [];
    item.traverse(function (o) { if (o.userData.blob && o.visible) { o.visible = false; hid.push(o); } });
    var bg = scene.background, fog = scene.fog, ca = renderer.getClearAlpha(), au = renderer.shadowMap.autoUpdate;
    renderer.getClearColor(tmpC);
    scene.background = null; scene.fog = null; scene.overrideMaterial = CS.depth; renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(CS.rt); renderer.clear(); renderer.render(scene, CS.cam);
    scene.overrideMaterial = null;
    contactBlur(2.2); contactBlur(.9);
    renderer.setRenderTarget(null); renderer.setClearColor(tmpC, ca); renderer.shadowMap.autoUpdate = au;
    scene.background = bg; scene.fog = fog;
    scene.children.forEach(function (o, i) { o.visible = vis[i]; });
    hid.forEach(function (o) { o.visible = true; });
  }

  /* ---------------------------------------------------------------- pasca-proses (kualitas 2, desktop, WebGL2)
     Adegan → target HalfFloat MSAA 4× + depth (nilai sRGB) → AO (SAO ringan: setengah resolusi, 12 sampel, normal dari
     depth) → blur bilateral 2 arah → komposit: warna × AO + dither halus → layar. Tone mapping ACES
     tetap di shader material (sama seperti render langsung). AO hanya untuk objek 3D — foto potong, karya
     & peta tidak (PP.mix → 0). Tanpa WebGL2 / float RT, ponsel, atau kualitas < 2 → render langsung. */
  var PP = { ok: false, on: false, mix: 0, w: 0, h: 0 };
  var AOF = 'uniform sampler2D tDepth; uniform mat4 projInv; uniform vec2 texel, psc, fade; uniform float radius, bias, intensity; varying vec2 vUv;\n' +
    'vec3 vpos(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }\n' +
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
    'void main() {\n' +
    ' float d = texture2D(tDepth, vUv).x; if (d > .99999) { gl_FragColor = vec4(1.0, 1e4, 0.0, 1.0); return; }\n' +
    ' vec3 P = vpos(vUv);\n' +
    ' vec3 r = vpos(vUv + vec2(texel.x, 0.0)) - P, l = P - vpos(vUv - vec2(texel.x, 0.0)), u = vpos(vUv + vec2(0.0, texel.y)) - P, w = P - vpos(vUv - vec2(0.0, texel.y));\n' +
    ' vec3 N = normalize(cross(abs(r.z) < abs(l.z) ? r : l, abs(u.z) < abs(w.z) ? u : w));\n' +
    ' vec2 rv = min(psc * radius / -P.z, vec2(.12));\n' +
    ' float a0 = hash(gl_FragCoord.xy) * 6.2832, occ = 0.0;\n' +
    ' for (int i = 0; i < 12; i++) {\n' +
    '  float t = (float(i) + .5) / 12.0, a = a0 + float(i) * 2.39996;\n' +
    '  vec3 v = vpos(vUv + vec2(cos(a), sin(a)) * sqrt(t) * rv) - P; float L = length(v);\n' +
    '  occ += max(0.0, dot(v, N) / (L + 1e-4) - bias) * clamp(1.0 - L / radius, 0.0, 1.0);\n' +
    ' }\n' +
    ' occ *= 1.0 - smoothstep(fade.x, fade.y, -P.z);\n' +   // AO hanya di sekitar objek, bukan dinding jauh
    ' gl_FragColor = vec4(clamp(1.0 - occ / 12.0 * intensity, 0.0, 1.0), -P.z, 0.0, 1.0);\n' +
    '}';
  var AOB = 'uniform sampler2D tAO; uniform vec2 dir; varying vec2 vUv;\n' +
    'void main() { vec4 c = texture2D(tAO, vUv); float z = c.g, s = c.r * .2270270, ws = .2270270;\n' +
    ' for (int i = 1; i <= 4; i++) { float k = i == 1 ? .1945946 : i == 2 ? .1216216 : i == 3 ? .0540541 : .0162162;\n' +
    '  vec4 a = texture2D(tAO, vUv + dir * float(i)), b = texture2D(tAO, vUv - dir * float(i));\n' +
    '  float wa = k * max(0.0, 1.0 - abs(a.g - z) / (z * .04)), wb = k * max(0.0, 1.0 - abs(b.g - z) / (z * .04));\n' +
    '  s += a.r * wa + b.r * wb; ws += wa + wb; }\n' +
    ' gl_FragColor = vec4(s / ws, z, 0.0, 1.0); }';
  var OUTF = 'uniform sampler2D tColor, tAO; uniform float aoMix; varying vec2 vUv;\n' +
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
    'void main() { vec4 c = texture2D(tColor, vUv); float ao = texture2D(tAO, vUv).r;\n' +
    ' gl_FragColor = vec4(c.rgb * mix(1.0, ao, aoMix) + (hash(gl_FragCoord.xy) - .5) / 255.0, 1.0); }';
  function ppInit() {
    var gl = renderer.getContext();
    if (!renderer.capabilities.isWebGL2 || !(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))) return;
    var sm = function (f, u) { return new T.ShaderMaterial({ uniforms: u, vertexShader: VQ, fragmentShader: f, depthTest: false, depthWrite: false, toneMapped: false }); };
    PP.aoM = sm(AOF, { tDepth: { value: null }, projInv: { value: new T.Matrix4() }, texel: { value: new T.Vector2() }, psc: { value: new T.Vector2() }, fade: { value: new T.Vector2(8, 10) }, radius: { value: .3 }, bias: { value: .1 }, intensity: { value: 2 } });
    PP.blM = sm(AOB, { tAO: { value: null }, dir: { value: new T.Vector2() } });
    PP.outM = sm(OUTF, { tColor: { value: null }, tAO: { value: null }, aoMix: { value: 0 } });
    PP.ok = true;
  }
  var v2 = new T.Vector2();
  function ppSize() {
    var s = renderer.getDrawingBufferSize(v2), w = s.x, h = s.y;
    if (PP.rt && PP.w === w && PP.h === h) return;
    if (PP.rt) { PP.rt.depthTexture.dispose(); PP.rt.dispose(); PP.a.dispose(); PP.b.dispose(); }
    PP.w = w; PP.h = h;
    PP.rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 });
    // material menulis nilai ter-encode sRGB (seperti ke kanvas) → pembauran transparan (halo, blob, bayangan
    // kontak) identik dengan render langsung; r147 hanya memakai encoding target bila isXRRenderTarget
    PP.rt.isXRRenderTarget = true; PP.rt.texture.encoding = T.sRGBEncoding;
    PP.rt.depthTexture = new T.DepthTexture(w, h, T.UnsignedIntType);
    var hw = Math.max(1, Math.round(w / 2)), hh = Math.max(1, Math.round(h / 2));
    PP.a = new T.WebGLRenderTarget(hw, hh, { type: T.HalfFloatType, depthBuffer: false }); PP.b = PP.a.clone();
    PP.a.texture.generateMipmaps = PP.b.texture.generateMipmaps = false;
  }
  function draw() {
    if (!PP.on || !PP.rt) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(PP.rt); renderer.render(scene, camera);
    var ao = PP.mix > .01;
    if (ao) {
      var U = PP.aoM.uniforms, pm = camera.projectionMatrix.elements;
      U.tDepth.value = PP.rt.depthTexture; U.projInv.value.copy(camera.projectionMatrixInverse);
      U.texel.value.set(1 / PP.w, 1 / PP.h); U.psc.value.set(pm[0] * .5, pm[5] * .5);
      var cd = view.dist * st.zoomC; U.fade.value.set(cd + 1.8, cd + 3.6);
      quad(PP.aoM, PP.a);
      PP.blM.uniforms.tAO.value = PP.a.texture; PP.blM.uniforms.dir.value.set(1 / PP.a.width, 0); quad(PP.blM, PP.b);
      PP.blM.uniforms.tAO.value = PP.b.texture; PP.blM.uniforms.dir.value.set(0, 1 / PP.a.height); quad(PP.blM, PP.a);
    }
    PP.outM.uniforms.tColor.value = PP.rt.texture; PP.outM.uniforms.tAO.value = PP.a.texture; PP.outM.uniforms.aoMix.value = ao ? PP.mix : 0;
    quad(PP.outM, null);
  }

  /* ---------------------------------------------------------------- loop */
  var v3 = new T.Vector3();
  function project(v) { v3.copy(v).project(camera); return { x: (v3.x * .5 + .5) * W, y: (-v3.y * .5 + .5) * H, v: v3.z > -1 && v3.z < 1 }; }
  var idleT = 0, upT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || XW.paused) { last = now; return; }
    // tidak ada sentuhan/gerak ≥ 10 dtk → render setengah kecepatan (GPU lebih dingin, baterai awet)
    var idle = now - XW.lastInput > 10000 && !st.drag;
    if (idle && (idleT ^= 1)) return;
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; frame++; clock += dt;
    if (!idle) dtAvg = lerp(dtAvg, dt * 1000, .05);
    // turun kualitas otomatis bila lambat: pasca-proses (AO) dilepas lebih dulu (< ±42 fps), lalu resolusi & bayangan (< 31 fps)
    if (!idle && frame > 150 && XW.quality > 0 && !XW.qLock && dtAvg > (PP.on ? 24 : 32)) { slow += dt; if (slow > 2.5) { setQuality(XW.quality - 1); slow = 0; XW.autoUp = 0; } } else slow = 0;
    // mulai ringan → naik ke kualitas penuh di belakang layar bila perangkat lancar (sekali turun, tidak naik lagi)
    if (!idle && XW.autoUp && !XW.qLock && frame > 240 && XW.quality < XW.autoUp && dtAvg < 18) { upT += dt; if (upT > 2) { setQuality(XW.quality + 1); upT = 0; frame = 151; } } else upT = 0;
    var k = 1 - Math.pow(.001, dt);
    mouse.sx = lerp(mouse.sx, mouse.x, k * .5); mouse.sy = lerp(mouse.sy, mouse.y, k * .5);
    L.key.intensity = mood.key; L.hemi.intensity = mood.hemi; L.fill.intensity = mood.fill;
    O.halo.material.opacity = mood.halo * theme.halo; renderer.toneMappingExposure = mood.exp * theme.exp * (RS.on && st.kind === 'room' ? .8 : 1);   // ruangan: interior terang → paparan diturunkan
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
    if (RS.g && RS.g.visible) { var fk = .85 + Math.sin(clock * 9.1) * .07 + Math.sin(clock * 23.7) * .05; RS.g.traverse(function (o) { if (!o.userData.flame) return; if (o.isLight) o.intensity = .9 * fk; else o.material.opacity = .8 * fk; }); }
    if (item && item.userData.built && item.userData.built.motions) item.userData.built.motions.forEach(function (m) {
      if (m.lin == null) m.lin = m.t;
      if (Math.abs(m.to - m.lin) < .0005) return;
      m.lin = m.to > m.lin ? Math.min(m.to, m.lin + dt / .75) : Math.max(m.to, m.lin - dt / .65);
      m.t = m.lin; m.apply(ease(m.lin));
    });
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
      st.camYaw = lerp(st.camYaw, st.camYawT, k * 1.4); st.camPitch = lerp(st.camPitch, st.camPitchT, k * 1.4);
      var yaw = view.yaw + st.camYaw + mouse.sx * .05 + (st.kind !== 'map' ? Math.sin(clock * .11) * .03 : 0), pitch = clamp(view.pitch + st.camPitch, .02, 1.3) - mouse.sy * .025;
      st.zoomC = lerp(st.zoomC, st.zoom, k * .9);
      var dist = view.dist * st.zoomC;
      st.pxC = lerp(st.pxC, st.px, k); st.pyC = lerp(st.pyC, st.py, k);
      var vtx = view.tx + Math.cos(yaw) * st.pxC, vty = view.ty + st.pyC, vtz = view.tz - Math.sin(yaw) * st.pxC;   // geser: sumbu kanan kamera & atas
      camera.position.set(vtx + Math.sin(yaw) * Math.cos(pitch) * dist, vty + Math.sin(pitch) * dist, vtz + Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(vtx, vty, vtz);
    }
    var off = Math.abs(st.zoom - 1) > .02 || Math.abs(st.spin) > .03 || st.orbitMoved || Math.abs(st.camYawT) > .03 || Math.abs(st.camPitchT) > .02 || Math.abs(st.px) > .02 || Math.abs(st.py) > .02;
    if (off !== st.off) { st.off = off; if (XW.onView) XW.onView(off); }
    if (Math.abs(camera.fov - view.fov) > .01) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
    var Lb = XW.labels;
    if (st.kind === 'custom' && item && item.userData.bounds && Math.abs(item.position.y) < .01) {
      var cb = item.userData.bounds, sp = item.userData.spin;
      Lb.dim = { a: project(sp.localToWorld(new T.Vector3(-cb.w / 2, .01, cb.d / 2 + .08))), b: project(sp.localToWorld(new T.Vector3(cb.w / 2, .01, cb.d / 2 + .08))), w: Math.round(cb.w * 100) };
    } else if (st.kind === 'cubix' && st.room === 'atelier' && Math.abs(O.cubix.position.y) < .01) {
      var tot = cfg.seats * SW + (cfg.arms ? 2 * AW : 0);
      Lb.dim = { a: project(sofa.localToWorld(new T.Vector3(-tot / 2, .01, D / 2 + .1))), b: project(sofa.localToWorld(new T.Vector3(tot / 2, .01, D / 2 + .1))), w: Math.round(tot * 100) };
    } else Lb.dim = null;
    Lb.dims = dimsOn ? dimSegs() : null;
    Lb.beacons = st.map > .6 ? beacons.map(function (b) { return project(b.localToWorld(new T.Vector3(0, b.userData.h * b.scale.y + .05, 0))); }) : null;
    if (XW.onFrame) XW.onFrame(Lb);
    var three = /^(cubix|cubixcfg|custom|model)$/.test(st.kind);
    var roomAO = RS.on && st.kind === 'room';   // ruangan mewah: bayangan sudut (AO) selalu aktif bila perangkat mampu
    PP.mix = lerp(PP.mix, (LOOK.ao && three || roomAO) && item && Math.abs(item.position.y) < .05 ? 1 : 0, k * 1.2);
    if (item) item.children.forEach(function (o) { if (o.userData.blob) o.visible = !(CS.on && three); });
    updateContact();
    draw();
  }

  /* ---------------------------------------------------------------- garis ukur lengkap (Pengaturan › Ukuran)
     Lebar (tepi depan), kedalaman (sisi kanan), tinggi (sudut belakang kanan) + garis tegak tambahan
     (dudukan, lengan, kaki, headboard …) dari XW.setDims(on, info). Info dalam cm; nilai info dipakai
     bila cocok dengan ukuran objek (±8%), selain itu ukuran objek yang diukur. */
  var dimsOn = false, dimsInfo = null;
  XW.setDims = function (on, info) { dimsOn = !!on; dimsInfo = info || null; };
  // ukuran objek yang sedang tampil (cm), untuk model 3D tanpa data dimensi
  XW.measure = function () {
    if (st.kind === 'cubixcfg' && CFG.g) { var cb = cfgBounds(); if (cb.box.isEmpty()) return null; var cs = cb.box.getSize(new T.Vector3()); return { kind: st.kind, w: Math.round(cs.x * 100), d: Math.round(cs.z * 100), h: Math.round((cb.box.max.y - LIFT) * 100) }; }
    var b = st.kind === 'cubix' ? cubixBounds() : /^(custom|model)$/.test(st.kind) && item && item.userData.bounds;
    return b ? { kind: st.kind, w: Math.round(b.w * 100), d: Math.round((st.kind === 'cubix' ? D : b.d) * 100), h: Math.round(b.h * 100) } : null;
  };
  function dimSegs() {
    var tgt, floor, b;
    if (st.kind === 'cubix') { if (Math.abs(O.cubix.position.y) > .01) return null; tgt = sofa; floor = 0; b = { w: cubixBounds().w, h: HH, d: D }; }
    else if (st.kind === 'cubixcfg' && CFG.g && Math.abs(CFG.g.position.y) < .01) {   // susunan CUBIX: ukuran total
      var cbb = cfgBounds().box; if (cbb.isEmpty()) return null;
      var ccn = cbb.getCenter(new T.Vector3()), csz = cbb.getSize(new T.Vector3());
      CFG.dimT = CFG.dimT || new T.Object3D(); CFG.dimT.position.set(ccn.x, 0, ccn.z); CFG.dimT.updateMatrixWorld(true);
      tgt = CFG.dimT; floor = LIFT; b = { w: csz.x, h: cbb.max.y - LIFT, d: csz.z };
    }
    else if (/^(custom|model)$/.test(st.kind) && item && item.userData.spin && item.userData.bounds && Math.abs(item.position.y) < .01) { tgt = item.userData.spin; floor = LIFT; b = item.userData.bounds; }
    else return null;
    var inf = dimsInfo || {}, val = function (k) { var m = Math.round(b[k] * 100), v = +inf[k]; return v && (inf.exact || Math.abs(v - m) / m < .08) ? v : m; };
    if (inf.exact && +inf.h) b = { w: b.w, d: b.d, h: inf.h / 100 };
    var P = function (x, y, z) { return project(tgt.localToWorld(new T.Vector3(x, floor + y, z))); };
    var hw = b.w / 2, hd = b.d / 2, o = .12, L = inf.labels || {};
    var segs = [
      { a: P(-hw, .005, hd + o), b: P(hw, .005, hd + o), k: L.w || 'W', t: val('w') + ' cm', at: 'mid' },
      { a: P(hw + o, .005, hd), b: P(hw + o, .005, -hd), k: L.d || 'D', t: val('d') + ' cm', at: 'mid' },
      { a: P(hw + o, 0, hd), b: P(hw + o, b.h, hd), k: L.h || 'H', t: val('h') + ' cm', at: 'mid', side: 1 }
    ];
    // garis tegak tambahan di sudut depan kiri: yang tertinggi paling dekat, label di ujung atas → tidak saling silang
    (inf.v || []).slice().sort(function (p, q) { return q.cm - p.cm; }).forEach(function (e, i) {
      var y = Math.min(b.h, e.cm / 100), x = -hw - o - i * .15;
      segs.push({ a: P(x, 0, hd), b: P(x, y, hd), k: e.l, t: e.cm + ' cm', at: 'end', side: -1 });
    });
    // ukuran bagian (kursi & sofa): diukur langsung dari model yang tampil (raycast), bukan dari angka konfigurasi
    if (inf.probe === 'seat' && /^(custom|model)$/.test(st.kind)) {
      var pr = probeSeat(tgt, b, floor, inf.key), LB = inf.plabels || {};
      segs.stats = [];
      if (pr) {
        var add = function (k, a, bb, cmv, at) { segs.push({ a: P(a[0], a[1], a[2]), b: P(bb[0], bb[1], bb[2]), k: LB[k] || k, t: cmv + ' cm', at: at || 'mid', inner: true }); segs.stats.push([LB[k] || k, cmv + ' cm']); };
        var ys = pr.seatTop + .012, xl = pr.xInL + Math.min(.12, (pr.xInR - pr.xInL) * .15);
        if (pr.seatD) add('seatD', [xl, ys, pr.zFront], [xl, ys, pr.zBack], pr.seatD);
        if (pr.seatL) add('seatL', [pr.xInL, ys, pr.zFront - .06], [pr.xInR, ys, pr.zFront - .06], pr.seatL);
        if (pr.armW) add('armW', [pr.xInR, pr.armTop + .012, pr.zFront - .1], [hw, pr.armTop + .012, pr.zFront - .1], pr.armW);
        if (pr.backD) add('backD', [xl, pr.backY, pr.zRear], [xl, pr.backY, pr.zBackY], pr.backD);
        if (pr.seatH) segs.stats.push([LB.seatTop || 'seat', pr.seatH + ' cm']);
      }
    }
    segs.center = P(0, b.h / 2, 0);
    // siluet objek di layar (8 sudut kotak pembatas) — label ukuran menghindari area ini
    segs.box = [];
    [-hw, hw].forEach(function (x) { [0, b.h].forEach(function (y) { [-hd, hd].forEach(function (z) { segs.box.push(P(x, y, z)); }); }); });
    return segs;
  }

  /* probe dudukan: sinar ke model (ruang lokal objek berputar; y dari lantai) → tepi depan dudukan, muka sandaran,
     punggung sandaran, sisi dalam lengan, permukaan duduk & atas lengan. Hasil disimpan per konfigurasi. */
  var probeC = { key: null, res: null }, pray = new T.Raycaster();
  function probeSeat(tgt, b, floor, key) {
    tgt.updateMatrixWorld(true);
    var meshes = []; tgt.traverse(function (o) { if (o.isMesh && o.visible && !o.userData.noPick && !o.userData.blob && !(o.material && o.material.transparent && o.material.opacity < .5)) meshes.push(o); });
    // kunci = konfigurasi + geometri yang benar-benar tampil (model dibangun ulang di tempat → tunggu geometri baru)
    key = key + '|' + meshes.length + '|' + (meshes[0] ? meshes[0].geometry.uuid : '') + '|' + b.w.toFixed(3);
    if (probeC.key === key && probeC.tgt === tgt) return probeC.res;
    var hw = b.w / 2, hd = b.d / 2, rot = new T.Matrix4().extractRotation(tgt.matrixWorld);
    function cast(o, d, far) {
      var ow = tgt.localToWorld(new T.Vector3(o[0], floor + o[1], o[2])), dw = new T.Vector3(d[0], d[1], d[2]).applyMatrix4(rot).normalize();
      pray.set(ow, dw); pray.far = far || 20;
      var h = pray.intersectObjects(meshes, false)[0]; if (!h) return null;
      var l = tgt.worldToLocal(h.point.clone()); l.y -= floor; return l;
    }
    var r = {}, cm = function (v) { return Math.round(v * 100); };
    // permukaan duduk: sinar turun di depan-tengah (hindari bantal sandaran)
    var tops = [0, -.2, .2].map(function (x) { return cast([x * b.w, b.h + .2, hd * .45], [0, -1, 0]); }).filter(Boolean);
    if (!tops.length) return (probeC = { key: key, tgt: tgt, res: null }).res;
    r.seatTop = Math.min.apply(null, tops.map(function (p) { return p.y; }));
    if (r.seatTop < .15 || r.seatTop > b.h - .05) return (probeC = { key: key, tgt: tgt, res: null }).res;
    // tepi depan dudukan
    var fr = cast([0, r.seatTop - .04, hd + 1], [0, 0, -1]); r.zFront = fr ? fr.z : hd;
    // sisi dalam lengan (setinggi 8 cm di atas dudukan, tengah kedalaman dudukan)
    var zMid = r.zFront - .15, yA = r.seatTop + .08;
    var aR = cast([0, yA, zMid], [1, 0, 0]), aL = cast([0, yA, zMid], [-1, 0, 0]);
    r.xInR = aR && aR.x < hw - .005 ? aR.x : hw; r.xInL = aL && aL.x > -hw + .005 ? aL.x : -hw;
    // muka sandaran: sinar dari depan, beberapa titik x → yang paling belakang (bantal hias di depan diabaikan)
    var xs = [-.3, -.1, .1, .3].map(function (f) { return (r.xInL + r.xInR) / 2 + f * (r.xInR - r.xInL); });
    var bk = [];   // beberapa ketinggian: kursi makan sering punya celah antara dudukan & sandaran
    [.1, .2, .3].forEach(function (dy) { if (bk.length) return; bk = xs.map(function (x) { return cast([x, r.seatTop + dy, hd + 1], [0, 0, -1]); }).filter(function (p) { return p && p.z < r.zFront - .1; }); });
    r.zBack = bk.length ? Math.min.apply(null, bk.map(function (p) { return p.z; })) : null;
    // tebal sandaran: setengah tinggi sandaran, depan & belakang
    r.backY = r.seatTop + Math.max(.12, (b.h - r.seatTop) * .5);
    var bf = cast([xs[1], r.backY, hd + 1], [0, 0, -1]), br = cast([xs[1], r.backY, -hd - 1], [0, 0, 1]);
    if (bf && br && bf.z > br.z) { r.zBackY = bf.z; r.zRear = br.z; r.backD = cm(bf.z - br.z); }
    // atas lengan kanan
    if (r.xInR < hw - .02) { var at = cast([(r.xInR + hw) / 2, b.h + .2, zMid], [0, -1, 0]); r.armTop = at ? at.y : r.seatTop + .2; r.armW = cm(hw - r.xInR); }
    if (r.zBack != null) r.seatD = cm(r.zFront - r.zBack);
    r.seatL = cm(r.xInR - r.xInL);
    r.seatH = cm(r.seatTop);
    probeC = { key: key, tgt: tgt, res: r }; return r;
  }

  /* ---------------------------------------------------------------- kualitas & ukuran */
  /* 2 = penuh: desktop + WebGL2 → pasca-proses (MSAA 4×, AO, dither); ponsel → render langsung (MSAA kanvas)
     1 = resolusi 1×, bayangan + bayangan kontak, tanpa AO · 0 = resolusi .75×, tanpa bayangan (blob saja) */
  function setQuality(q) {
    XW.quality = q = clamp(q, 0, 2);
    var dpr = window.devicePixelRatio || 1;
    PP.on = q >= 2 && !MOBILE && PP.ok;
    renderer.setPixelRatio(q >= 2 ? Math.min(dpr, MOBILE || PP.on ? 1.5 : 1.75) : q === 1 ? 1 : .75);
    renderer.shadowMap.enabled = q > 0;
    renderer.setSize(W, H, false);
    if (PP.on) ppSize();
    CS.on = q > 0 && !!CS.plane && LOOK.contact; CS.sig = '';
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
    // RoomEnvironment = cadangan sampai HDRI suasana siap (setMood → setEnv)
    if (T.RoomEnvironment) scene.environment = O.roomEnv = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), .04).texture;
    if (window.XTEX) XTEX.setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    try { ppInit(); } catch (e) { PP.ok = false; }
    mats.brass = new T.MeshStandardMaterial({ color: col('#b8924f'), metalness: 1, roughness: .28, envMapIntensity: 1 });
    buildLights(); buildRoom(); buildContact(); buildSofa(); buildMap();
    // lantai & podium tetap memantulkan ruang lama → tampilan panggung gelap tidak berubah oleh HDRI
    if (O.roomEnv) { mats.floor.envMap = O.roomEnv; O.disc.material.envMap = O.roomEnv; }
    O.map.userData.bounds = { w: 12, h: 1, d: 4 };
    item = O.cubix;
    setPlinth(cubixBounds(), true, 0);
    if (T.OrbitControls) {
      controls = new T.OrbitControls(camera, canvas);
      controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .07;
      controls.enablePan = false; controls.minDistance = .9; controls.maxDistance = 24;
      controls.minPolarAngle = .55; controls.maxPolarAngle = 1.48; controls.rotateSpeed = .6;
      controls.addEventListener('start', function () { st.orbitMoved = true; });
    }
    XW.quality = opts.quality != null ? opts.quality : 2; XW.qLock = !!opts.qLock; XW.autoUp = opts.autoUp || 0;
    XW.lastInput = performance.now();
    ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { XW.lastInput = performance.now(); }, { passive: true, capture: true }); });
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1; }, { passive: true });
    /* masukan: geser di produk = putar produk · geser di area kosong = ubah arah kamera ·
       roda / cubit = zoom (objek apa pun, kapan pun) · ketuk objek = XW.onPick */
    var dx0 = 0, dy0 = 0, ptrs = {}, pinch = null, down = null, hoverT = 0;
    var camLimit = function () { return /^(product|art|map)$/.test(st.kind) ? .5 : 3.2; };   // foto datar: jangan sampai terlihat dari samping
    var gap = function () { var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    canvas.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = Object.keys(ptrs).length;
      down = n === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      if (n === 2 && !orbit) { st.drag = false; pinch = { d: gap(), z: st.zoom }; return; }
      if (n > 1 || orbit) return;
      if (e.button === 2) { down = null; return; }   // klik kanan → menu (contextmenu)
      dx0 = e.clientX; dy0 = e.clientY; st.recenter = false;
      if (e.button === 1) { e.preventDefault(); down = null; midStart(e); return; }
      var cw = cfgAt(e.clientX, e.clientY);
      if (cw) {
        var fq = floorAt(e.clientX, e.clientY), gp = CFG.g.position;
        CFG.drag = { w: cw, ox: fq ? cw.position.x - (fq.x - gp.x) : 0, oz: fq ? cw.position.z - (fq.z - gp.z) : 0, x0: cw.position.x, z0: cw.position.z };
        CFG.sel = cw.userData.uid; cfgMark(); if (XW.onCfgPick) XW.onCfgPick(CFG.sel); return;
      }
      var rw = roomAt(e.clientX, e.clientY);
      if (rw && rw.userData.acc) { ROOM.drag = { w: rw, acc: true }; return; }
      if (rw) {
        var fp = floorAt(e.clientX, e.clientY), rb = new T.Box3().setFromObject(rw), rgp = ROOM.g.position;
        var riders = ROOM.g.children.filter(function (o) { return o.userData.acc && !o.userData.flat && o.position.y > LIFT + .05 && o.position.x + rgp.x > rb.min.x && o.position.x + rgp.x < rb.max.x && o.position.z + rgp.z > rb.min.z && o.position.z + rgp.z < rb.max.z; })
          .map(function (o) { return { w: o, dx: o.position.x - rw.position.x, dz: o.position.z - rw.position.z }; });
        ROOM.drag = { w: rw, ox: fp ? rw.position.x - fp.x : 0, oz: fp ? rw.position.z - fp.z : 0, snap: snapPrep(rw), riders: riders }; return;
      }
      var shd = shellAt(e.clientX, e.clientY);
      if (shd && shd.kind === 'obj') { RS.drag = { w: shd.w, oid: shd.oid, part: shd.part, moved: false }; return; }
      if (shd && shd.kind === 'open') { RS.drag = { w: shd.w, open: shd.id, part: shd.part, moved: false, s0: shd.w.userData.s + shd.w.position.x }; return; }
      if (item && item.userData.spin && hit(e.clientX, e.clientY)) { st.drag = true; st.spinV = 0; }
      else st.cam = true;
    });
    /* klik tengah (tombol roda): di produk = putar produk (ruang: bebas, berhenti tiap 15° · konfigurasi CUBIX: 90°);
       di latar = geser tampilan (pan) */
    var mid = null;
    function midStart(e) {
      var cw = cfgAt(e.clientX, e.clientY), rw = !cw && roomAt(e.clientX, e.clientY);
      if (cw) mid = { k: 'cfg', w: cw, acc: 0 };
      else if (rw) mid = { k: 'room', w: rw };
      else if (item && item.userData.spin && hit(e.clientX, e.clientY)) { mid = { k: 'spin' }; st.drag = true; st.spinV = 0; }
      else mid = { k: 'pan' };
      mid.x = e.clientX; mid.y = e.clientY;
    }
    canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });   // tanpa autoscroll browser
    canvas.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });
    function ctxAt(x, y) {
      var cw = cfgAt(x, y), rw = !cw && roomAt(x, y), it = !cw && !rw && item && hit(x, y);
      if (XW.onContext) XW.onContext(x, y, cw ? { kind: 'cfg', uid: cw.userData.uid } : rw ? { kind: 'room', rid: rw.userData.rid } : it ? { kind: 'item' } : null);
    }
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); if (!LP.fired) ctxAt(e.clientX, e.clientY); });
    // layar sentuh: tekan lama (0,6 dtk, jari diam) = menu klik kanan; geser / gerakan yang sedang berjalan dibatalkan
    var LP = { t: 0, x: 0, y: 0, fired: false };
    canvas.addEventListener('pointerdown', function (e) {
      clearTimeout(LP.t); LP.fired = false; if (e.pointerType !== 'touch') return;
      LP.x = e.clientX; LP.y = e.clientY;
      LP.t = setTimeout(function () { LP.fired = true; ROOM.drag = CFG.drag = RS.drag = null; st.cam = st.drag = false; snapGuides(null, null); ctxAt(LP.x, LP.y); }, 600);
    });
    canvas.addEventListener('pointermove', function (e) { if (LP.t && Math.hypot(e.clientX - LP.x, e.clientY - LP.y) > 10) { clearTimeout(LP.t); LP.t = 0; } });
    ['pointerup', 'pointercancel'].forEach(function (ev) { canvas.addEventListener(ev, function () { clearTimeout(LP.t); LP.t = 0; }); });
    window.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (mid) {
        var mx = e.clientX - mid.x, my = e.clientY - mid.y; mid.x = e.clientX; mid.y = e.clientY;
        if (mid.k === 'pan') { var ps = 2 * Math.tan(camera.fov * Math.PI / 360) * view.dist * st.zoomC / H; /* 1 px mouse = 1 px di bidang target */ st.px = clamp(st.px - mx * ps, -4, 4); st.py = clamp(st.py + my * ps, -1.2, 2.4); st.lastDrag = performance.now(); return; }
        if (mid.k === 'room') { mid.w.rotation.y += mx * .012; return; }
        if (mid.k === 'cfg') { mid.acc += mx; if (Math.abs(mid.acc) > 45) { var dir = mid.acc > 0 ? 1 : -1; mid.acc = 0; if (XW.onCfgTurn) XW.onCfgTurn(mid.w.userData.uid, dir); } return; }
      }
      if (pinch && Object.keys(ptrs).length >= 2) { setZoom(pinch.z * pinch.d / gap()); return; }
      if (st.drag) { var dx = e.clientX - dx0; dx0 = e.clientX; st.spin += dx * .006; st.spinV = dx * .35; st.lastDrag = performance.now(); return; }
      if (CFG.drag) {
        var fc = floorAt(e.clientX, e.clientY);
        if (fc) { var d = CFG.drag, sp = cfgSnap(d.w, fc.x - CFG.g.position.x + d.ox, fc.z - CFG.g.position.z + d.oz); if (!cfgHits(d.w, sp[0], sp[1])) { d.w.position.x = sp[0]; d.w.position.z = sp[1]; cfgMark(); } }
        return;
      }
      if (ROOM.drag && ROOM.drag.acc) { var ap = accDropAt(e.clientX, e.clientY, ROOM.drag.w); if (ap) ROOM.drag.w.position.set(ap.x, ap.y, ap.z); return; }
      if (ROOM.drag) {
        var fp2 = floorAt(e.clientX, e.clientY);
        if (fp2) {
          var sn = snapAt(ROOM.drag.snap, clamp(fp2.x + ROOM.drag.ox, -6, 6), clamp(fp2.z + ROOM.drag.oz, -4, 4), e.altKey); ROOM.drag.w.position.x = sn.x; ROOM.drag.w.position.z = sn.z; snapGuides(sn.gx, sn.gz);
          ROOM.drag.riders.forEach(function (r) { r.w.position.x = sn.x + r.dx; r.w.position.z = sn.z + r.dz; });
        }
        return;
      }
      if (RS.drag) {   // objek tembok / plafon / lantai: geser di bidangnya
        ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1); ray.setFromCamera(ndc, camera);
        var sp = new T.Vector3(), C = RS.cfg;
        if (RS.drag.open) {   // pintu / jendela: geser di sepanjang tembok (lubang dibangun ulang saat dilepas)
          if (ray.ray.intersectPlane(shellPlane(RS.drag.part), sp)) {
            var od = RS.drag, ou = shellUV(od.part, sp)[0], os = od.part === 'B' ? ou : -ou;
            if (od.a == null) od.a = os - od.s0;
            var ns = Math.round((os - od.a) * 20) / 20, olen = od.part === 'B' ? C.w : C.d; ns = clamp(ns, -olen / 2 + .4, olen / 2 - .4);
            od.w.position.x = ns - od.w.userData.s; od.u = od.part === 'B' ? ns : -ns; od.moved = Math.abs(ns - od.w.userData.s) > .02;
          }
          return;
        }
        if (ray.ray.intersectPlane(shellPlane(RS.drag.part), sp)) {
          var uv = shellUV(RS.drag.part, sp), pt = RS.drag.part, lim = pt === 'L' ? C.d / 2 - .3 : C.w / 2 - .3;
          uv[0] = clamp(Math.round(uv[0] * 20) / 20, -lim, lim);
          uv[1] = pt === 'B' || pt === 'L' ? clamp(Math.round(uv[1] * 20) / 20, .3, C.h - .3) : clamp(Math.round(uv[1] * 20) / 20, -C.d / 2 + .3, C.d / 2 - .3);
          shellPose(RS.drag.w, { part: pt, u: uv[0], v: uv[1] }); RS.drag.u = uv[0]; RS.drag.v = uv[1]; RS.drag.moved = true;
        }
        return;
      }
      if (st.cam) {
        var cx = e.clientX - dx0, cy = e.clientY - dy0, lim = camLimit(); dx0 = e.clientX; dy0 = e.clientY;
        st.camYawT = clamp(st.camYawT - cx * .005, -lim, lim);
        st.camPitchT = clamp(st.camPitchT + cy * .004, -view.pitch + .02, 1.3 - view.pitch);
        st.lastDrag = performance.now(); return;
      }
      if (!e.buttons && e.target === canvas && XW.onHover && performance.now() - hoverT > 90) { hoverT = performance.now(); XW.onHover(hit(e.clientX, e.clientY), motionAt(e.clientX, e.clientY)); }
    }, { passive: true });
    var up = function (e) {
      delete ptrs[e.pointerId];
      if (mid) {
        if (mid.k === 'room') {
          var deg = Math.round(mid.w.rotation.y * 180 / Math.PI / 15) * 15; mid.w.rotation.y = deg * Math.PI / 180;
          if (XW.onRoomTurn) XW.onRoomTurn(mid.w.userData.rid, ((deg % 360) + 360) % 360);
        }
        mid = null;
      }
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (st.drag) { st.drag = false; st.lastDrag = performance.now(); }
      if (CFG.drag) {
        var cd = CFG.drag; CFG.drag = null;
        if (cd.w.position.x !== cd.x0 || cd.w.position.z !== cd.z0) {
          var nb = cfgBounds(); CFG.g.userData.bounds = { w: nb.w, h: nb.h, d: nb.d }; setPlinth(CFG.g.userData.bounds, true, .6);
          if (XW.onCfgMove) XW.onCfgMove(cd.w.userData.uid, +cd.w.position.x.toFixed(3), +cd.w.position.z.toFixed(3));
        }
      }
      if (RS.drag && RS.drag.open) { var odr = RS.drag; RS.drag = null; if (odr.moved) { if (XW.onOpenMove) XW.onOpenMove(odr.open, +odr.u.toFixed(2)); } else if (XW.onShellPick) XW.onShellPick({ open: odr.open, part: odr.part }); }
      if (RS.drag) { var rd = RS.drag; RS.drag = null; if (rd.moved) { if (XW.onShellMove) XW.onShellMove(rd.oid, +rd.u.toFixed(3), +rd.v.toFixed(3)); } else if (XW.onShellPick) XW.onShellPick({ oid: rd.oid, part: rd.part }); }
      if (ROOM.drag) {
        snapGuides(null, null); var rd0 = ROOM.drag, dw = rd0.w; ROOM.drag = null;
        var mv = [{ rid: dw.userData.rid, x: +dw.position.x.toFixed(3), z: +dw.position.z.toFixed(3), y: rd0.acc ? +dw.position.y.toFixed(3) : undefined }].concat((rd0.riders || []).map(function (r) { return { rid: r.w.userData.rid, x: +r.w.position.x.toFixed(3), z: +r.w.position.z.toFixed(3) }; }));
        if (XW.onRoomMoves) XW.onRoomMoves(mv); else if (XW.onRoomMove) XW.onRoomMove(mv[0].rid, mv[0].x, mv[0].z);
      }
      if (st.cam) { st.cam = false; st.lastDrag = performance.now(); }
      if (down && e.type === 'pointerup' && e.target === canvas && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 550) {
        var mo = motionAt(e.clientX, e.clientY);
        var spk = st.kind === 'room' && !roomAt(e.clientX, e.clientY) && shellAt(e.clientX, e.clientY);
        if (spk && spk.kind === 'part') { var suv = shellUV(spk.part, spk.point); if (XW.onShellPick) XW.onShellPick({ part: spk.part, u: +suv[0].toFixed(3), v: +suv[1].toFixed(3) }); }
        else if (st.kind === 'cubixcfg' && !cfgAt(e.clientX, e.clientY)) { CFG.sel = null; cfgMark(); if (XW.onCfgPick) XW.onCfgPick(null); }
        else if (mo) { toggleMotion(mo); if (XW.onMotion) XW.onMotion(mo); }
        else { var k = hit(e.clientX, e.clientY); if (k && XW.onPick) XW.onPick(k); }
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
  // produk tanpa model 3D: foto apa adanya (latar tidak dipotong) dalam bingkai di atas penyangga
  function photoSize(r) { var w = 1.4, h = w / r.aspect; if (h > 1.5) { h = 1.5; w = h * r.aspect; } return [w, h]; }
  XW.showProduct = function (p, url) {
    var my = ++req;
    return getRaw(url).then(function (r) {
      if (my !== req) return;
      var s = photoSize(r), g = makeBillboard(r.tex, s[0], s[1], true);
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
  // foto kecil objek di panggung (thumbnail rancangan di tas & profil) — persegi di tengah ruang kosong
  XW.snapshot = function (size) {
    if (!renderer) return '';
    try {
      draw();
      var src = renderer.domElement, k = src.width / W;
      var fw = W - inset.l - inset.r, fh = H - inset.t - inset.b, side = Math.min(fw, fh) * .82;
      var cx = inset.l + fw / 2, cy = inset.t + fh / 2;
      var c = document.createElement('canvas'), n = size || 240; c.width = c.height = n;
      c.getContext('2d').drawImage(src, (cx - side / 2) * k, (cy - side / 2) * k, side * k, side * k, 0, 0, n, n);
      return c.toDataURL('image/jpeg', .8);
    } catch (e) { return ''; }
  };
  XW.preloadModel = function (url) { return getModel(url).catch(function () {}); };
  /* custom produk katalog: model GLB asli yang diubah langsung (bukan modul Customize).
     Ukuran: lebar & dalam diregangkan hanya di zona tengah (9-slice) — lengan, sudut & kaki tetap
     berukuran asli, hanya bergeser. Warna kaki/base: semua material logam diganti finishing pilihan. */
  function modelSetup(g) {
    if (g.userData.pc) return g.userData.pc;
    var spin = g.userData.spin, inv = new T.Matrix4(), list = [];
    spin.updateMatrixWorld(true);
    var spinInv = new T.Matrix4().copy(spin.matrixWorld).invert();
    spin.traverseVisible(function (o) {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      if (!o.userData.geo0) o.userData.geo0 = o.geometry;   // geometri asli (dipakai bersama antar klon)
      o.geometry = o.userData.geo0.clone();
      var toSpin = new T.Matrix4().multiplyMatrices(spinInv, o.matrixWorld), back = new T.Matrix4().copy(toSpin).invert();
      var pos = o.geometry.attributes.position, nor = o.geometry.attributes.normal, v = new T.Vector3(), P = new Float32Array(pos.count * 3), N = nor ? new Float32Array(nor.count * 3) : null;
      var nm = new T.Matrix3().getNormalMatrix(toSpin);
      for (var i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(toSpin); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z; }
      }
      list.push({ m: o, P: P, N: N, back: back, nback: new T.Matrix3().getNormalMatrix(back) });
    });
    var box = new T.Box3();
    list.forEach(function (it) { for (var i = 0; i < it.P.length; i += 3) box.expandByPoint(new T.Vector3(it.P[i], it.P[i + 1], it.P[i + 2])); });
    var mats = [];
    (g.userData.mats || []).forEach(function (mt) { if (mt.userData.pcCol0 || mt.metalness > .5 || mt.userData.role === 'metal') { if (!mt.userData.pcCol0) { mt.userData.pcCol0 = mt.color.clone(); mt.userData.pcRough0 = mt.roughness; mt.userData.pcMetal0 = mt.metalness; } mats.push(mt); } });
    var bs = box.getSize(new T.Vector3());
    g.userData.pc = { list: list, box: box, mats: mats, b0: { w: bs.x, h: bs.y, d: bs.z }, blob0: g.children.filter(function (o) { return o.userData.blob; })[0] };
    return g.userData.pc;
  }
  // regang 1D: zona tengah [c-a, c+a] diskalakan, sisi luar digeser
  function slice1(x, c, a, dlt) { var r = x - c; if (Math.abs(r) <= a) return c + r * (a + dlt) / a; return c + r + (r > 0 ? dlt : -dlt); }
  XW.modelInfo = function () {
    if (st.kind !== 'model' || !item) return null;
    var pc = modelSetup(item), m = pc.mats[0];
    var mm = item.userData.spin.children[0], t = mm && mm.userData.xionco_tile, u = item.userData.unit || 1;
    var b0 = t ? pc.b0.w - (mm.userData._tileN - t.n0) * t.pitch * u : pc.b0.w;   // lebar asli (lajur bawaan)
    return { w: Math.round(b0 * 100), d: Math.round(pc.b0.d * 100), h: Math.round(pc.b0.h * 100), metals: pc.mats.length, metalHex: m ? '#' + m.userData.pcCol0.getHexString() : null,
      tile: t ? { pitch: t.pitch * u * 100, n0: t.n0, n: mm.userData._tileN } : null };
  };
  // o: { w, d (cm, kosong = asli), metal: { hex, rough, metalness } | null }
  XW.reshapeModel = function (o) {
    if (st.kind !== 'model' || !item) return false;
    o = o || {};
    var mm = item.userData.spin.children[0], tl = mm && mm.userData.xionco_tile, u = item.userData.unit || 1;
    if (tl && o.w) {
      var info0 = XW.modelInfo(), n = Math.max(1, Math.min(14, tl.n0 + Math.round((o.w - info0.w) / (tl.pitch * u * 100))));
      if (n !== mm.userData._tileN) { tileArrange(mm, n); item.userData.pc = null; }
      o = { d: o.d, metal: o.metal };   // lebar dari jumlah lajur, bukan diregangkan
    }
    var pc = modelSetup(item), bx = pc.box, cx = (bx.min.x + bx.max.x) / 2, cz = (bx.min.z + bx.max.z) / 2;
    var hw = (bx.max.x - bx.min.x) / 2, hd = (bx.max.z - bx.min.z) / 2;
    var dx = o.w ? (o.w / 100 - pc.b0.w) / 2 : 0, dz = o.d ? (o.d / 100 - pc.b0.d) / 2 : 0;
    var ax = Math.max(.05, hw - Math.min(.24, hw * .3)), az = Math.max(.05, hd - Math.min(.16, hd * .28));   // zona lengan & tepi depan/belakang tetap
    var sx = (ax + dx) / ax, sz = (az + dz) / az, v = new T.Vector3();
    pc.list.forEach(function (it) {
      var pos = it.m.geometry.attributes.position, nor = it.m.geometry.attributes.normal, P = it.P, N = it.N;
      for (var i = 0, j = 0; i < pos.count; i++, j += 3) {
        v.set(slice1(P[j], cx, ax, dx), P[j + 1], slice1(P[j + 2], cz, az, dz)).applyMatrix4(it.back);
        pos.setXYZ(i, v.x, v.y, v.z);
        if (N) {
          var inX = Math.abs(P[j] - cx) <= ax, inZ = Math.abs(P[j + 2] - cz) <= az;
          v.set(N[j] / (inX ? sx : 1), N[j + 1], N[j + 2] / (inZ ? sz : 1)).normalize().applyMatrix3(it.nback).normalize();
          nor.setXYZ(i, v.x, v.y, v.z);
        }
      }
      pos.needsUpdate = true; if (nor) nor.needsUpdate = true;
      it.m.geometry.computeBoundingBox(); it.m.geometry.computeBoundingSphere();
    });
    var b = item.userData.bounds; b.w = pc.b0.w + 2 * dx; b.d = pc.b0.d + 2 * dz;
    if (pc.blob0) pc.blob0.scale.set(b.w * 1.12, b.d * 1.2, 1);
    pc.mats.forEach(function (mt) {
      var m = o.metal;
      if (!m) { mt.color.copy(mt.userData.pcCol0); mt.roughness = mt.userData.pcRough0; mt.metalness = mt.userData.pcMetal0; }
      else { tw(mt.color, (function (c) { return { r: c.r, g: c.g, b: c.b, duration: .6, ease: 'power2.inOut' }; })(col(m.hex))); mt.roughness = m.rough != null ? m.rough : mt.userData.pcRough0; mt.metalness = m.metalness != null ? m.metalness : mt.userData.pcMetal0; }
      mt.needsUpdate = true;
    });
    setPlinth(b, true, .6);
    // bingkai kamera ikut bila ukuran berubah cukup jauh dari bingkai terakhir
    var fb = pc.framed || pc.b0;
    if (Math.abs(b.w - fb.w) / fb.w > .06 || Math.abs(b.d - fb.d) / fb.d > .1) { pc.framed = { w: b.w, d: b.d }; frameItem(b, .9); }
    return true;
  };
  XW.setTint = function (hexStr) { if (st.kind === 'model') tintModel(item, hexStr); };
  // kembali ke posisi awal: zoom normal, putaran 0, bingkai kamera semula
  XW.recenter = function () {
    st.zoom = 1; st.spinV = 0; st.recenter = true; st.orbitMoved = false; st.camYawT = 0; st.camPitchT = 0; st.px = st.py = 0;
    if (orbit) {
      setOrbit(false, true); frameItem(null, 1.1);
      var back = function () { if (st.room === 'atelier' && st.kind === 'cubix') setOrbit(true); };
      if (G && !XW.reduced) G.delayedCall(1.2, back); else back();
    } else frameItem(null, 1.1);
  };
  XW.zoomBy = function (f) { setZoom(st.zoom * f); };
  XW.setTheme = function (n, dur) { setTheme(n, dur); };
  XW.hit = function (x, y) { return hit(x, y); };
  /* Customize: rancangan parametrik dari maker.js. Dibangun ulang di tempat saat pilihan berubah
     (putaran & zoom pengguna tetap), dibingkai ulang bila ukurannya berubah cukup jauh. */
  var customKit = null;
  /* bagian bergerak rancangan (pintu, laci, panel geser, flip, lipat): klik → buka / tutup beranimasi.
     Posisi terakhir diingat per jenis produk selama pilihan lain diubah. */
  var motionMem = { key: '', s: {} };
  var ease = function (v) { return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  function motionAt(x, y) {
    if (!item || !(item.userData.custom || item.userData.built) || !item.visible || !camera) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(item, true);
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].object.userData.noPick) continue;
      for (var o = hits[i].object; o && o !== item; o = o.parent) if (o.userData.motion) return o.userData.motion;
      return null;   // objek terdepan bukan bagian bergerak
    }
    return null;
  }
  function toggleMotion(m) { m.to = m.to > .5 ? 0 : 1; motionMem.s[m.id] = m.to; }
  XW.motions = function () { return item && item.userData.built && item.userData.built.motions || []; };
  // Animate (klik kanan): semua bagian bergerak dibuka; sekali lagi → ditutup
  XW.animate = function () { var ms = XW.motions(); if (!ms.length) return null; var open = ms.some(function (m) { return m.to < .5; }); ms.forEach(function (m) { m.to = open ? 1 : 0; motionMem.s[m.id] = m.to; }); return open; };
  XW.toggleMotion = function (id) { var m = XW.motions().filter(function (q) { return q.id === id; })[0]; if (m) toggleMotion(m); return !!m; };
  function buildCustom(g, cfg) {
    var spin = g.userData.spin, prevB = g.userData.bounds;
    if (g.userData.built) { spin.remove(g.userData.built.group); g.userData.built.dispose(); }
    if (!customKit) customKit = { T: T, rbox: rbox, col: col };
    var b = window.XMAKER.build(cfg, customKit), mv = b.motions || [];
    mv.forEach(function (m) { m.apply(0); });   // ukur dalam keadaan tertutup
    var box3 = new T.Box3().setFromObject(b.group), size = box3.getSize(new T.Vector3()), c = box3.getCenter(new T.Vector3());
    var mkey = cfg.cat + '.' + cfg.sub;
    if (motionMem.key !== mkey) motionMem = { key: mkey, s: {} };
    mv.forEach(function (m) { if (motionMem.s[m.id] != null) m.t = m.to = motionMem.s[m.id]; m.lin = m.t; m.apply(ease(m.t)); });
    b.group.position.set(-c.x, LIFT - box3.min.y, -c.z);
    spin.add(b.group);
    g.userData.built = b;
    g.userData.bounds = { w: size.x, h: size.y, d: size.z };
    var list = [];
    b.group.traverse(function (o) { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) { if (mt && 'envMapIntensity' in mt && list.indexOf(mt) < 0) { mt.userData.env0 = mt.metalness > .5 ? 1.1 : .5; list.push(mt); } }); });
    g.userData.mats = list;
    g.userData.blob.scale.set(size.x * 1.15, size.z * 1.2, 1);
    return !prevB || Math.abs(prevB.w - size.x) / size.x > .06 || Math.abs(prevB.h - size.y) / size.y > .06;
  }
  /* ---------------------------------------------------------------- RUANGAN: sudut terbuka (lantai + tembok belakang & kiri + plafon)
     cfg = { type, w, d, h, floor, wall: { fin, col }, wallL: { fin, col }, ceil: { fin, col }, rug: null | { col }, objs: [{ oid, k, part: B|L|C|F, u, v }] }
     B: u = x, v = tinggi · L: u = z, v = tinggi · C / F: u = x, v = z. Tembok & plafon satu sisi menghadap ke dalam →
     dari luar / atas otomatis tak terlihat. Ketuk tembok / lantai / objek → XW.onShellPick; geser objek → XW.onShellMove. */
  var RS = { g: null, cfg: null, on: false, drag: null };
  var LIB = 'assets/library/';
  function meterUV(geo, w, h) { var uv = geo.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); uv.needsUpdate = true; return geo; }
  /* bahan: [set XTEX, roughness, tipe (planks: papan terpisah · tint: diwarnai), warna] — warna gaya mengalikan set abu-abu */
  var FLOORS = {
    oakwide: ['room-floor-oakwide', .55, null, '#c2b6a8'], greyoak: ['room-floor-greyoak', .55, 'planks', '#cfc5b8'], walnutdark: ['room-wall-walnut', .45, 'planks', '#7a5c47'],
    parquet: ['room-floor-parquet', .5], oak: ['room-floor-oak', .6], laminate: ['room-floor-laminate', .5], marble: ['room-floor-marble', .2], terrazzo: ['room-floor-terrazzo', .35],
    tiles: ['room-floor-tiles', .3], carpet: ['room-floor-carpet', .95]
  };
  var STONE = { travertine: 'stone-travertine', calacatta: 'stone-calacatta', nero: 'stone-nero', carrara: 'stone-carrara' };
  function texMat(set, o) {
    o = o || {}; var m = new T.MeshStandardMaterial({ color: col(o.col || '#ffffff'), roughness: o.rough || .7, metalness: 0, envMapIntensity: o.env || .5 });
    if (window.XTEX && set) XTEX.apply(m, set, { map: o.map, rough: o.rough || .7, normal: o.normal == null ? .7 : o.normal }); return m;
  }
  function wallpaperTex(hex) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
    g.fillStyle = hex; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.1)'; for (var i = 0; i < 256; i += 32) g.fillRect(i, 0, 10, 256);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); t.encoding = T.sRGBEncoding; return t;
  }
  // tembok dasar (cat / limewash / wallpaper / bata / marmer); feature (walnut, travertine, boiserie …) = geometri di atasnya
  function baseWallMat(fin, hex) {
    if (fin === 'limewash' || fin === 'boiserie' || fin === 'walnut' || fin === 'smoked' || fin === 'travertine' || fin === 'calacatta' || fin === 'nero') return texMat('room-wall-limewash', { col: hex || '#e9e2d6', rough: .95, normal: .9 });
    if (fin === 'paint') return texMat('room-wall-plaster', { col: hex || '#ece6dc', map: false, rough: .9, normal: .35 });
    if (fin === 'wallpaper') { var m = new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: .85 }); m.map = wallpaperTex(hex || '#cdbfa8'); return m; }
    if (fin === 'beige') return texMat('room-wall-beige', { rough: .9 });
    if (fin === 'brick') return texMat('room-wall-brick', { rough: .85 });
    if (fin === 'marble') return texMat('room-wall-marble', { rough: .25, env: .8 });
    return texMat('room-wall-limewash', { col: hex || '#e9e2d6', rough: .95 });
  }
  // kumpulan quad (UV meter, offset acak per keping) → satu geometri: papan lantai, panel, slab
  function quadGeo(quads) {
    var pos = [], uv = [], nor = [], idx = [], n = 0;
    quads.forEach(function (q) {   // q: { o: [x,y,z], u: [ux,uy,uz], v: [vx,vy,vz], w, h, uo, vo, nrm }
      for (var k = 0; k < 4; k++) {
        var a = k === 1 || k === 2 ? 1 : 0, b = k >= 2 ? 1 : 0;
        pos.push(q.o[0] + q.u[0] * q.w * a + q.v[0] * q.h * b, q.o[1] + q.u[1] * q.w * a + q.v[1] * q.h * b, q.o[2] + q.u[2] * q.w * a + q.v[2] * q.h * b);
        uv.push(q.uo + q.w * a, q.vo + q.h * b); nor.push(q.nrm[0], q.nrm[1], q.nrm[2]);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    });
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
  }
  var rnd = function (s) { var x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
  // lantai papan: keping 20 cm × 0,9–1,9 m, sambungan bergeser, celah 2 mm (dasar gelap terlihat)
  function plankFloor(W, D, y, set, rough, hex) {
    var q = [], pw = .2, gap = .002, row = 0;
    for (var z = -D / 2; z < D / 2 - .001; z += pw, row++) {
      var x = -W / 2 - rnd(row) * 1.2;
      for (var k = 0; x < W / 2; k++) {
        var L = .9 + rnd(row * 31 + k) * 1.0, x0 = Math.max(x, -W / 2), x1 = Math.min(x + L, W / 2), z1 = Math.min(z + pw, D / 2);
        if (x1 - x0 > .02) q.push({ o: [x0 + gap, y, z1 - gap], u: [1, 0, 0], v: [0, 0, -1], w: x1 - x0 - gap * 2, h: z1 - z - gap * 2, uo: rnd(row * 7 + k * 3) * 5, vo: rnd(row * 11 + k) * 5, nrm: [0, 1, 0] });
        x += L;
      }
    }
    return new T.Mesh(quadGeo(q), texMat(set, { col: hex, rough: rough, normal: .5 }));
  }
  /* feature wall (geometri di depan tembok, lokal: x sepanjang tembok, y tinggi, z keluar):
     walnut / smoked: papan vertikal 32 cm + celah bayangan 6 mm (smoked: garis kuningan tiap 3 papan)
     travertine / calacatta / nero: slab 120 × 60 cm, nat 3 mm · boiserie: list dinding & dado */
  /* persegi dikurangi lubang (pintu / jendela): r & lubang = [x0, x1, y0, y1] → daftar persegi sisa (pita tegak) */
  function rectMinus(r, holes) {
    var E = 1e-4, hs = (holes || []).filter(function (h) { return h[0] < r[1] - E && h[1] > r[0] + E && h[2] < r[3] - E && h[3] > r[2] + E; });
    if (!hs.length) return [r];
    var xs = [r[0], r[1]]; hs.forEach(function (h) { [h[0], h[1]].forEach(function (x) { if (x > r[0] && x < r[1]) xs.push(x); }); });
    xs.sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 0; i < xs.length - 1; i++) {
      var a = xs[i], b = xs[i + 1]; if (b - a < E) continue;
      var bl = hs.filter(function (h) { return h[0] < b - E && h[1] > a + E; }).map(function (h) { return [Math.max(h[2], r[2]), Math.min(h[3], r[3])]; }).sort(function (p, q) { return p[0] - q[0]; });
      var y = r[2]; bl.forEach(function (iv) { if (iv[0] > y + E) out.push([a, b, y, iv[0]]); y = Math.max(y, iv[1]); });
      if (r[3] > y + E) out.push([a, b, y, r[3]]);
    }
    return out;
  }
  var rq = function (r, z, uo, vo) { return { o: [r[0], r[2], z], u: [1, 0, 0], v: [0, 1, 0], w: r[1] - r[0], h: r[3] - r[2], uo: uo == null ? r[0] : uo, vo: vo == null ? r[2] : vo, nrm: [0, 0, 1] }; };
  function featureWall(fin, len, Hh, hex, holes) {
    var g = new T.Group(), q = [], top = Hh - .32, H = holes || [];
    var backing = function (c, z) { var bq = rectMinus([-len / 2, len / 2, 0, top], H).map(function (r) { return rq(r, z); }); if (bq.length) g.add(new T.Mesh(quadGeo(bq), new T.MeshStandardMaterial({ color: col(c), roughness: 1 }))); };
    if (fin === 'walnut' || fin === 'smoked') {
      var pw = .32, n = Math.round(len / pw), wd = len / n, i;
      for (i = 0; i < n; i++) { var px0 = -len / 2 + i * wd + .003, uo = rnd(i) * 3, vo = rnd(i + 9) * 3; rectMinus([px0, px0 + wd - .006, 0, top], H).forEach(function (r) { q.push(rq(r, .02, uo + r[0] - px0, vo + r[2])); }); }
      if (q.length) { var pm = new T.Mesh(quadGeo(q), texMat('room-wall-walnut', { col: fin === 'smoked' ? '#5a4436' : '#a3815f', rough: .5, normal: .5, env: .6 })); pm.castShadow = pm.receiveShadow = true; g.add(pm); }
      backing('#100c09', .014);
      if (fin === 'smoked') for (i = 3; i < n; i += 3) rectMinus([-len / 2 + i * wd - .003, -len / 2 + i * wd + .003, 0, top], H).forEach(function (r) { var br = new T.Mesh(new T.BoxGeometry(r[1] - r[0], r[3] - r[2], .008), mats.brass); br.position.set((r[0] + r[1]) / 2, (r[2] + r[3]) / 2, .02); g.add(br); });
    } else if (STONE[fin]) {
      var sw = 1.2, sh = .6, rr = 0;
      for (var y = 0; y < top - .001; y += sh, rr++) for (var x = -len / 2 - (rr % 2) * sw / 2; x < len / 2; x += sw) {
        var x0 = Math.max(x, -len / 2), x1 = Math.min(x + sw, len / 2), y1 = Math.min(y + sh, top), su = rnd(rr * 13 + x) * 4, sv = rnd(rr * 5 + x * 3) * 4;
        if (x1 - x0 > .02) rectMinus([x0 + .0015, x1 - .0015, y + .0015, y1 - .0015], H).forEach(function (r) { q.push(rq(r, .015, su + r[0] - x0, sv + r[2] - y)); });
      }
      if (q.length) { var sm = new T.Mesh(quadGeo(q), texMat(STONE[fin], { col: fin === 'travertine' ? '#e0d0b8' : fin === 'calacatta' ? '#f0ebe4' : '#ffffff', rough: fin === 'travertine' ? .7 : .3, normal: .5, env: fin === 'travertine' ? .4 : .9 })); sm.receiveShadow = true; g.add(sm); }
      backing('#3a332c', .012);
    } else if (fin === 'boiserie') {
      var mm = new T.MeshStandardMaterial({ color: col(hex || '#efe9df'), roughness: .6 });
      var bar = function (x, y, wl, hl, d) { rectMinus([x - wl / 2, x + wl / 2, y - hl / 2, y + hl / 2], H).forEach(function (r) { var b = new T.Mesh(new T.BoxGeometry(r[1] - r[0], r[3] - r[2], d || .022), mm); b.position.set((r[0] + r[1]) / 2, (r[2] + r[3]) / 2, (d || .022) / 2); b.castShadow = b.receiveShadow = true; g.add(b); }); };
      bar(0, .9, len, .05, .03); bar(0, top - .04, len, .08, .05);   // dado & cornice
      var np = Math.max(2, Math.round(len / 1.05)), pwid = len / np;
      for (var p = 0; p < np; p++) {
        var cx = -len / 2 + pwid * (p + .5), fw = pwid - .24;
        [[.18, .62], [1.08, top - .32]].forEach(function (z) {
          var y0 = z[0], y1 = z[1], hh = y1 - y0;
          if (rectMinus([cx - fw / 2, cx + fw / 2, y0, y1], H).length !== 1) return;   // panel terpotong bukaan → dilewati
          bar(cx, y0, fw, .022); bar(cx, y1, fw, .022); bar(cx - fw / 2, (y0 + y1) / 2, .022, hh); bar(cx + fw / 2, (y0 + y1) / 2, .022, hh);
        });
      }
    }
    return g;
  }
  /* ---------------------------------------------------------------- BUKAAN: jendela & pintu di tembok belakang (B) / kiri (L)
     o = { id, t: win | door, wall: B | L, u (tengah di sepanjang tembok: B = x, L = z, meter), w (jendela), kind,
           cur (tirai 0/1), hinge l | r (dilihat dari dalam ruang), swing in | out, open 0..1 }
     Tembok dibangun di bingkai lokal: x sepanjang tembok (kiri = −x dilihat dari dalam), y dari lantai, z = ke dalam ruang. */
  var WIN_K = { full: function (H) { return [0, H - .3]; }, std: function () { return [.9, 2.35]; }, tall: function (H) { return [.45, H - .55]; } };
  var DOOR_K = { panel: [.9, 2.2], flush: [.9, 2.35], glass: [.95, 2.35], double: [1.5, 2.35], pivot: [1.2, 2.6], slide: [1.0, 2.35] };
  function openW(o, len) { return o.t === 'door' ? (DOOR_K[o.kind] || DOOR_K.panel)[0] : clamp(o.w || 1.6, .5, Math.max(.5, len - .3)); }
  function openRect(o, Hh, len, pk) {
    var w = openW(o, len), s = clamp(pk === 'B' ? o.u : -o.u, -len / 2 + w / 2 + .05, len / 2 - w / 2 - .05), y;
    if (o.t === 'door') y = [0, Math.min((DOOR_K[o.kind] || DOOR_K.panel)[1], Hh - .25)];
    else y = (WIN_K[o.kind] || WIN_K.full)(Hh);
    return [s - w / 2, s + w / 2, y[0], Math.min(y[1], Hh - .1)];
  }
  function legacyOpens(C) {
    var z0 = C.win ? C.win.z0 : -C.d / 2 + .9, z1 = C.win ? C.win.z1 : Math.min(C.d / 2 - .9, z0 + 2.6);
    return [{ id: 'w0', t: 'win', wall: 'L', u: (z0 + z1) / 2, w: z1 - z0, kind: 'full', cur: 1 }];
  }
  var SKY = null;
  function skyTex() {
    if (SKY) return SKY;
    var c = document.createElement('canvas'); c.width = 4; c.height = 128; var sg = c.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#dfe7ea'); gr.addColorStop(.7, '#f6efe2'); gr.addColorStop(1, '#d9d0bf'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 128);
    SKY = new T.CanvasTexture(c); return SKY;
  }
  // daun pintu dari x = 0 … lw (engsel di x = 0), tebal berpusat di z = 0; hEnd: gagang di ujung x = lw
  function doorLeaf(kind, lw, lh, hEnd, sty, metal) {
    var g = new T.Group(), dark = sty.id === 'dark';
    var add = function (geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    var hx = hEnd ? lw - .075 : .075, sgn = hEnd ? -1 : 1;
    if (kind === 'glass' || kind === 'double') {   // rangka baja ramping + kaca (gaya Crittall / French)
      var fr = .05, gl = new T.MeshStandardMaterial({ color: col('#d5dde0'), roughness: .04, metalness: .1, transparent: true, opacity: .14, depthWrite: false, side: T.DoubleSide });
      add(new T.BoxGeometry(fr, lh, .045), metal, fr / 2, lh / 2, 0); add(new T.BoxGeometry(fr, lh, .045), metal, lw - fr / 2, lh / 2, 0);
      add(new T.BoxGeometry(lw, fr * 1.6, .045), metal, lw / 2, fr * .8, 0); add(new T.BoxGeometry(lw, fr, .045), metal, lw / 2, lh - fr / 2, 0);
      var nr = kind === 'double' ? 5 : 3; for (var i = 1; i < nr; i++) add(new T.BoxGeometry(lw - fr, .022, .03), metal, lw / 2, fr * 1.6 + (lh - fr * 2.6) * i / nr, 0);
      if (kind === 'double') add(new T.BoxGeometry(.022, lh - fr * 2.6, .03), metal, lw / 2, lh / 2 + fr * .3, 0);
      var gm = add(new T.PlaneGeometry(lw - fr * 2, lh - fr * 2.6), gl, lw / 2, lh / 2 + fr * .3, 0); gm.castShadow = false;
      [.03, -.03].forEach(function (z) { add(new T.BoxGeometry(.11, .014, .014), metal, hx + sgn * .045, 1.02, z * 1.4); });
    } else {
      var face = kind === 'flush' ? new T.MeshStandardMaterial({ color: col(dark ? '#2e2925' : '#ddd5c8'), roughness: .55 }) : texMat('room-wall-walnut', { col: kind === 'slide' ? '#b8956b' : dark || kind === 'pivot' ? '#6b4f3c' : '#a3815f', rough: .5, normal: .4 });
      add(new T.BoxGeometry(lw, lh, .044), new T.MeshStandardMaterial({ color: col(kind === 'flush' ? (dark ? '#2a2521' : '#d3cabd') : '#4a3627'), roughness: .7 }), lw / 2, lh / 2, 0);
      [.0225, -.0225].forEach(function (z, k) { var pl = add(meterUV(new T.PlaneGeometry(lw, lh), lw, lh), face, lw / 2, lh / 2, z); if (k) pl.rotation.y = Math.PI; });
      if (kind === 'panel') {   // dua panel timbul (rangka moulding) di kedua muka
        var mm = texMat('room-wall-walnut', { col: dark ? '#4e3a2c' : '#8c6c4e', rough: .5 });
        [[.14, lh * .44], [lh * .52, lh - .14]].forEach(function (pz) { [.024, -.024].forEach(function (z) {
          var x0 = .12, x1 = lw - .12, y0 = pz[0], y1 = pz[1];
          add(new T.BoxGeometry(x1 - x0, .02, .012), mm, lw / 2, y0, z); add(new T.BoxGeometry(x1 - x0, .02, .012), mm, lw / 2, y1, z);
          add(new T.BoxGeometry(.02, y1 - y0, .012), mm, x0, (y0 + y1) / 2, z); add(new T.BoxGeometry(.02, y1 - y0, .012), mm, x1, (y0 + y1) / 2, z);
        }); });
        [.03, -.03].forEach(function (z) { add(new T.CylinderGeometry(.026, .026, .01, 24), metal, hx, 1.02, z * 1.1).rotation.x = Math.PI / 2; add(new T.BoxGeometry(.12, .016, .016), metal, hx + sgn * .05, 1.02, z * 1.6); });
      } else if (kind === 'slide') {   // panel fluted: alur tegak
        var gm2 = new T.MeshStandardMaterial({ color: col('#3a2a1e'), roughness: .8 });
        for (var xg = .08; xg < lw - .04; xg += .08) [.0235, -.0235].forEach(function (z) { add(new T.BoxGeometry(.006, lh - .04, .002), gm2, xg, lh / 2, z); });
        [.03, -.03].forEach(function (z) { add(new T.BoxGeometry(.03, .22, .012), metal, hx, 1.05, z * 1.05); });
      } else {   // polos / pivot: gagang tarik tegak panjang
        var pl2 = kind === 'pivot' ? 1.4 : .8;
        [.045, -.045].forEach(function (z) { add(new T.CylinderGeometry(.013, .013, pl2, 16), metal, hx, 1.05, z); [-1, 1].forEach(function (e) { add(new T.CylinderGeometry(.007, .007, .03, 10), metal, hx, 1.05 + e * (pl2 / 2 - .06), z * .72).rotation.x = Math.PI / 2; }); });
      }
    }
    return g;
  }
  function openObj(o, r, Hh, fd, bm, sty) {
    var g = new T.Group(), x0 = r[0], x1 = r[1], y0 = r[2], y1 = r[3], w = x1 - x0, cx = (x0 + x1) / 2, TK = .16, dz = TK + fd, zc = (fd - TK) / 2;
    var add = function (geo, mat, x, y, z, noSh) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !noSh; m.receiveShadow = true; g.add(m); return m; };
    var metal = new T.MeshStandardMaterial({ color: col(sty.metal || '#4a3b2c'), metalness: .85, roughness: .4, envMapIntensity: 1.1 });
    // kusen dalam setebal tembok
    add(new T.BoxGeometry(.012, y1 - y0, dz), bm, x0 - .006, (y0 + y1) / 2, zc); add(new T.BoxGeometry(.012, y1 - y0, dz), bm, x1 + .006, (y0 + y1) / 2, zc);
    add(new T.BoxGeometry(w + .024, .012, dz), bm, cx, y1 + .006, zc);
    if (o.t === 'win') {
      if (y0 > .01) add(new T.BoxGeometry(w + .12, .035, dz + .05), texMat('stone-' + (sty.stone || 'travertine'), { col: (sty.stone || 'travertine') === 'travertine' ? '#e0d0b8' : '#ffffff', rough: .5 }), cx, y0 - .0175, zc + .025);   // ambang batu
      var view = add(new T.PlaneGeometry(w, y1 - y0), new T.MeshBasicMaterial({ map: skyTex(), toneMapped: false }), cx, (y0 + y1) / 2, -TK - .02, true); view.castShadow = false;
      var fz = -TK * .55, nm = Math.max(1, Math.round(w / .9));
      for (var i = 0; i <= nm; i++) add(new T.BoxGeometry(.04, y1 - y0, .05), metal, x0 + w * i / nm, (y0 + y1) / 2, fz);
      add(new T.BoxGeometry(w + .04, .05, .05), metal, cx, y1 - .025, fz); add(new T.BoxGeometry(w + .04, .045, .05), metal, cx, y0 + .0225, fz);
      if (o.kind !== 'std') add(new T.BoxGeometry(w, .03, .045), metal, cx, y0 + (y1 - y0) * .8, fz);   // transom
      var gls = add(new T.PlaneGeometry(w, y1 - y0), new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: .03, metalness: .2, transparent: true, opacity: .07, depthWrite: false }), cx, (y0 + y1) / 2, fz + .01, true); gls.castShadow = false;
      if (o.cur !== 0) {   // tirai linen sheer ripple-fold, plafon ke lantai, kedua sisi
        var cm = texMat('fabric-linen', { col: o.col || sty.curtain || '#efe9df', rough: .95, normal: .6 }); cm.transparent = true; cm.opacity = .9; cm.side = T.DoubleSide;
        [x0 - .25, x1 + .25 - .75].forEach(function (c0) {
          var cg = new T.PlaneGeometry(.75, Hh - .06, 40, 1), cp = cg.attributes.position; for (var j = 0; j < cp.count; j++) cp.setZ(j, Math.sin((cp.getX(j) + .375) / .75 * Math.PI * 9) * .035);
          cg.computeVertexNormals(); var cu = new T.Mesh(cg, cm); cu.position.set(c0 + .375, (Hh - .06) / 2 - .01, fd + .14); cu.castShadow = true; g.add(cu);
        });
      }
    } else {
      var lw = w, lh = y1, kind = o.kind || 'panel', hingeL = o.hinge !== 'r', sw = o.swing === 'out' ? -1 : 1, ang = clamp(o.open || 0, 0, 1) * 1.45;
      add(new T.BoxGeometry(w + 1, y1 + .5, 1.8), new T.MeshStandardMaterial({ color: col('#3b322a'), roughness: 1, side: T.BackSide }), cx, (y1 + .5) / 2 - .01, -TK - .9, true).userData.noPick = true;   // koridor gelap di balik pintu
      var cmat = kind === 'glass' || kind === 'double' ? metal : new T.MeshStandardMaterial({ color: col(sty.id === 'dark' ? '#2b2621' : '#e2dacd'), roughness: .5 });
      add(new T.BoxGeometry(w + .16, .07, .022), cmat, cx, y1 + .035, fd + .011); add(new T.BoxGeometry(.07, y1, .022), cmat, x0 - .035, y1 / 2, fd + .011); add(new T.BoxGeometry(.07, y1, .022), cmat, x1 + .035, y1 / 2, fd + .011);   // architrave
      var leaf = function (xh, l, hEnd, rot, k) { var pv = new T.Group(), lf = doorLeaf(k, l, lh - .01, hEnd, sty, metal); pv.position.set(xh, 0, -.03); if (!hEnd) lf.position.x = -l; pv.add(lf); pv.rotation.y = rot; g.add(pv); return pv; };
      if (kind === 'double') { leaf(x0, w / 2, true, -sw * ang, 'double'); leaf(x1, w / 2, false, sw * ang, 'double'); }
      else if (kind === 'pivot') {   // poros di 1/4 lebar
        var px = hingeL ? x0 + w * .25 : x1 - w * .25, pv = new T.Group(), lf2 = doorLeaf('pivot', w, lh - .01, hingeL, sty, metal); lf2.position.x = -w * .25 * (hingeL ? 1 : -1) - (hingeL ? 0 : w); pv.add(lf2); pv.position.set(px, 0, -.03); pv.rotation.y = (hingeL ? -1 : 1) * sw * ang; g.add(pv);
      } else if (kind === 'slide') {   // geser di muka tembok, rel di atas; bergeser ke sisi "engsel"
        var off = (hingeL ? -1 : 1) * clamp(o.open || 0, 0, 1) * w * .96, sl = doorLeaf('slide', w + .06, lh + .03, !hingeL, sty, metal); sl.position.set(x0 - .03 + off, 0, fd + .035); g.add(sl);
        add(new T.BoxGeometry(w * 2 + .2, .035, .035), metal, cx + (hingeL ? -1 : 1) * w * .5, lh + .07, fd + .035);
      } else leaf(hingeL ? x0 : x1, w, hingeL, (hingeL ? -1 : 1) * sw * ang, kind);
    }
    return g;
  }
  // objek tembok / plafon / lantai. Model GLB: katalog & pustaka (Poly Haven CC0)
  var SHELL_GLB = { walllamp: 'assets/items/aether/model.glb', pendant: LIB + 'polyhaven/modern_ceiling_lamp_01/model.glb', chandelier: LIB + 'polyhaven/Chandelier_01/model.glb', sky: 'assets/items/aether-sky/model.glb', plant: LIB + 'polyhaven/potted_plant_01/model.glb', plant2: LIB + 'polyhaven/potted_plant_04/model.glb', vase: LIB + 'polyhaven/ceramic_vase_01/model.glb', floorlamp: 'assets/items/aether-standing-side-floor-lamp/model.glb' };
  var src0 = function (u) { return XW._src ? XW._src(u) : u; };
  function shellObj(o) {
    var g = new T.Group(), k = o.k, S = RS.cfg || {}, sty = S.sty || {};
    var add = function (geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    var glb = function (url, cb) { getModel(src0(url)).then(function (s) { var m = s.clone(true); m.traverse(function (q) { if (q.isMesh) q.castShadow = q.receiveShadow = true; }); if (cb) cb(m); g.add(m); }, function () {}); };
    var metal = new T.MeshStandardMaterial({ color: col(sty.metal || '#9a7a4e'), metalness: 1, roughness: .38, envMapIntensity: 1.1 });
    var artImg = function (mesh, i) { mesh.material.map = abstractArt(sty.id, i || 0, mesh.geometry.parameters.width / mesh.geometry.parameters.height); mesh.material.color = col('#ffffff'); mesh.material.needsUpdate = true; };
    if (k === 'art' || k === 'frame') {   // karya seni besar + picture light
      var fw = k === 'art' ? 1.5 : .9, fh = k === 'art' ? 1.05 : .62;
      add(new T.BoxGeometry(fw + .05, fh + .05, .04), new T.MeshStandardMaterial({ color: col(sty.frame || '#2b241d'), roughness: .5 }), 0, 0, .02);
      artImg(add(new T.PlaneGeometry(fw, fh), new T.MeshStandardMaterial({ color: col('#d8d2c6'), roughness: .9 }), 0, 0, .041), o.art);
      add(new T.CylinderGeometry(.012, .012, fw * .55, 16), metal, 0, fh / 2 + .1, .13).rotation.z = Math.PI / 2;
      add(new T.BoxGeometry(.03, .1, .03), metal, 0, fh / 2 + .05, .06);
      var gl = add(new T.PlaneGeometry(fw * 1.05, fh * .7), new T.MeshBasicMaterial({ map: glowTex(), transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, color: col('#ffd9a8') }), 0, fh * .2, .045); gl.castShadow = false; gl.userData.noPick = true;
    } else if (k === 'mirror') {   // cermin besar bingkai emas (Parisian) / bulat kuningan
      if (sty.id === 'paris') {
        add(new T.BoxGeometry(1.3, 1.6, .05), new T.MeshStandardMaterial({ color: col('#b8924f'), metalness: .9, roughness: .3 }), 0, 0, .025);
        add(new T.PlaneGeometry(1.14, 1.44), new T.MeshStandardMaterial({ color: col('#e8ecee'), metalness: 1, roughness: .03, envMapIntensity: 1.5 }), 0, 0, .052);
      } else { add(new T.CircleGeometry(.4, 64), new T.MeshStandardMaterial({ color: col('#dfe3e6'), metalness: 1, roughness: .04, envMapIntensity: 1.4 }), 0, 0, .02); add(new T.TorusGeometry(.41, .014, 12, 64), metal, 0, 0, .02); }
    } else if (k === 'fireplace') {   // perapian batu: badan, mantel, ruang api berpendar
      var st = texMat(STONE[sty.stone] || 'stone-travertine', { rough: sty.stone === 'travertine' ? .7 : .3, normal: .4, env: .7 }), fwid = 1.9, fht = 1.15;
      add(new T.BoxGeometry(fwid, fht, .34), st, 0, fht / 2, .17);
      add(new T.BoxGeometry(fwid + .16, .06, .42), st, 0, fht + .03, .21);
      add(new T.BoxGeometry(.92, .56, .3), new T.MeshStandardMaterial({ color: col('#0c0a09'), roughness: 1 }), 0, .36, .2);
      var fire = add(new T.PlaneGeometry(.7, .3), new T.MeshBasicMaterial({ map: glowTex(), color: col('#ff8a3a'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, .3, .36);
      fire.castShadow = false; fire.userData.noPick = true; fire.userData.flame = true;
      var fl = new T.PointLight(col('#ff9a4a'), .9, 3.2, 2); fl.position.set(0, .4, .6); fl.userData.flame = true; g.add(fl);
      add(new T.BoxGeometry(fwid + .3, .03, .5), st, 0, .015, .25);
    } else if (k === 'window') {   // jendela lama (kecil) — arsitektur baru memakai jendela lantai–plafon
      add(new T.PlaneGeometry(1.4, 1.5), new T.MeshBasicMaterial({ color: col('#fff3dc'), toneMapped: false }), 0, 0, .005);
    } else if (k === 'shelf') {   // rak melayang + buku & keramik
      var wd = texMat('room-wall-walnut', { rough: .5 });
      add(new T.BoxGeometry(1.2, .045, .26), wd, 0, 0, .13);
      books(g, -.42, .022, .13, 5); glb(SHELL_GLB.vase, function (m) { m.scale.setScalar(.55); m.position.set(.1, .022, .13); });
      books(g, .38, .022, .13, 3, true);
    } else if (k === 'tv') {
      add(new T.BoxGeometry(1.6, .92, .035), new T.MeshStandardMaterial({ color: col('#0b0b0c'), roughness: .15, metalness: .4 }), 0, 0, .02);
    } else if (k === 'slat') {
      var sl = texMat('room-wall-walnut', { rough: .5 }); for (var i = 0; i < 18; i++) add(new T.BoxGeometry(.035, 2.4, .025), sl, -.6 + i * .07, 0, .0125);
    } else if (k === 'downlight') {
      var dl = new T.MeshBasicMaterial({ color: col('#fff4e0'), toneMapped: false });
      [[-1, -.8], [1, -.8], [-1, .8], [1, .8]].forEach(function (p) { add(new T.CircleGeometry(.05, 24), dl, p[0], -.002, p[1]).rotation.x = Math.PI / 2; });
    } else if (k === 'olive') {   // pohon dalam pot travertine
      add(new T.CylinderGeometry(.44, .37, .62, 48), texMat('stone-travertine', { col: '#e0d0b8', rough: .7, normal: .5 }), 0, .31, 0);
      add(new T.CircleGeometry(.41, 40), new T.MeshStandardMaterial({ color: col('#2a2119'), roughness: 1 }), 0, .59, 0).rotation.x = -Math.PI / 2;   // tanah
      glb(SHELL_GLB.plant, function (m) { m.scale.setScalar(1.2); m.position.y = .02; });   // pot asli tersembunyi di dalam pot batu
    } else if (k === 'books') { books(g, 0, 0, 0, 4); }
    else if (SHELL_GLB[k]) {
      glb(SHELL_GLB[k], function (m) { if (o.part === 'C') { var bx = new T.Box3().setFromObject(m); m.position.y = -(bx.max.y); } });
    }
    return g;
  }
  /* ---------------------------------------------------------------- AKSESORIS RUANG (styling, tanpa harga)
     Dibuat prosedural (+ aset CC0 Poly Haven yang sudah ada); dasar di y = 0, depan menghadap +z. */
  function pillowGeo(w, h, t) {   // bantal: kotak tersegmen, tepi menipis & sudut sedikit menarik ke dalam
    var gm = new T.BoxGeometry(1, 1, 1, 20, 20, 6), p = gm.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = Math.max(0, (1 - Math.pow(Math.abs(2 * x), 3)) * (1 - Math.pow(Math.abs(2 * y), 3)));
      p.setXYZ(i, x * w * (1 - .07 * Math.abs(2 * y)), y * h * (1 - .07 * Math.abs(2 * x)), z * t * (.22 + .78 * f));
    }
    gm.computeVertexNormals(); return gm;
  }
  var ACC_FLAT = { rug: 1, rugr: 1 };
  function accPiece(k) {
    var g = new T.Group(), S = RS.cfg || {}, sty = S.sty || {}, dark = sty.id === 'dark';
    var add = function (geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    var std = function (c, r, m) { return new T.MeshStandardMaterial({ color: col(c), roughness: r == null ? .6 : r, metalness: m || 0 }); };
    var metal = new T.MeshStandardMaterial({ color: col(sty.metal || '#9a7a4e'), metalness: 1, roughness: .32, envMapIntensity: 1.1 });
    var stone = texMat('stone-' + (sty.stone || 'travertine'), { col: (sty.stone || 'travertine') === 'travertine' ? '#e0d0b8' : '#ffffff', rough: .55, normal: .4 });
    var lathe = function (pts, mat, y) { return add(new T.LatheGeometry(pts.map(function (q) { return new T.Vector2(q[0], q[1]); }), 56), mat, 0, y || 0, 0); };
    var flame = function (x, y, z) { var fl = add(new T.SphereGeometry(.011, 12, 10), new T.MeshBasicMaterial({ color: col('#ffd08a'), toneMapped: false }), x, y, z); fl.scale.y = 2; fl.castShadow = false; };
    var FAB = dark ? ['#6b5d50', '#a08a70', '#2f2a25'] : sty.id === 'paris' ? ['#d6cab8', '#9fb0b3', '#b8a58a'] : sty.id === 'quiet' ? ['#e4dccd', '#bfb19c', '#8f8170'] : ['#d9cfbf', '#a8875f', '#5e4a38'];
    var wait = [], glb = function (url, s) { wait.push(getModel(src0(url)).then(function (sc) { var m = sc.clone(true); m.traverse(function (q) { if (q.isMesh) q.castShadow = q.receiveShadow = true; }); m.scale.setScalar(s || 1); var bx = new T.Box3().setFromObject(m); m.position.y = -bx.min.y; g.add(m); }, function () {})); };
    if (k === 'tv') {   // TV 65" di kaki ramping
      add(new T.BoxGeometry(1.45, .84, .03), std('#0b0b0c', .2, .5), 0, .56, 0);
      add(new T.PlaneGeometry(1.42, .81), new T.MeshStandardMaterial({ color: col('#040405'), roughness: .04, metalness: .3, emissive: col('#0e1118'), emissiveIntensity: .8 }), 0, .56, .0155).castShadow = false;
      [-.55, .55].forEach(function (x) { add(new T.BoxGeometry(.04, .15, .22), std('#1b1b1c', .3, .7), x, .075, .02); });
    } else if (k === 'lamp') {   // lampu meja: keramik + kap linen menyala
      lathe([[0, 0], [.075, 0], [.1, .05], [.105, .17], [.07, .29], [.025, .33], [.02, .35], [0, .35]], std(dark ? '#3a332c' : '#ebe2d3', .3));
      add(new T.CylinderGeometry(.006, .006, .14, 8), metal, 0, .42, 0);
      var shd = add(new T.CylinderGeometry(.14, .18, .23, 56, 1, true), new T.MeshStandardMaterial({ color: col('#f2e9da'), roughness: .9, side: T.DoubleSide, emissive: col('#ffcf96'), emissiveIntensity: .9 }), 0, .55, 0); shd.castShadow = false;
      add(new T.CircleGeometry(.135, 40), new T.MeshBasicMaterial({ color: col('#ffe2b8'), toneMapped: false }), 0, .445, 0).rotation.x = Math.PI / 2;   // pendar bawah kap (tanpa PointLight: lampu baru memicu kompilasi ulang semua shader)
    } else if (k === 'vase') { glb(SHELL_GLB.vase, .85); }
    else if (k === 'plant') { glb(SHELL_GLB.plant2, 1); }
    else if (k === 'olive') { var ol = shellObj({ k: 'olive' }); g.add(ol); }
    else if (k === 'books') { books(g, 0, 0, 0, 4); add(new T.SphereGeometry(.045, 32, 20), metal, .02, .2, 0).scale.y = .8; }
    else if (k === 'tray') {   // nampan logam + tiga lilin
      add(new T.CylinderGeometry(.21, .2, .012, 56), metal, 0, .006, 0);
      add(new T.TorusGeometry(.205, .006, 8, 72), metal, 0, .014, 0).rotation.x = Math.PI / 2;
      [[-.08, .02, .12], [.06, -.05, .08], [.03, .09, .1]].forEach(function (c) { add(new T.CylinderGeometry(.033, .033, c[2], 36), std('#efe6d6', .75), c[0], .012 + c[2] / 2, c[1]); flame(c[0], .012 + c[2] + .02, c[1]); });
    } else if (k === 'candles') {   // lilin pilar di alas batu
      add(new T.BoxGeometry(.3, .025, .12), stone, 0, .0125, 0);
      [[-.09, .16], [0, .24], [.09, .12]].forEach(function (c) { add(new T.CylinderGeometry(.038, .038, c[1], 40), std('#efe6d6', .75), c[0], .025 + c[1] / 2, 0); flame(c[0], .025 + c[1] + .02, 0); });
    } else if (k === 'sculpture') {   // cincin perunggu di blok batu
      add(new T.BoxGeometry(.15, .05, .15), stone, 0, .025, 0);
      add(new T.TorusGeometry(.1, .024, 28, 80), metal, 0, .05 + .1 + .024, 0);
    } else if (k === 'bowl') { lathe([[0, 0], [.06, 0], [.13, .035], [.17, .085], [.164, .09], [.124, .045], [.05, .03], [0, .03]], texMat('room-wall-walnut', { col: '#8a6a4f', rough: .45 })); }
    else if (k === 'clock') {   // jam meja: cincin kuningan, muka gading
      add(new T.CylinderGeometry(.1, .1, .03, 56), metal, 0, .12, 0).rotation.x = Math.PI / 2;
      add(new T.CircleGeometry(.086, 56), std('#efe7da', .6), 0, .12, .0155);
      var hd = std('#2a2420', .4); add(new T.BoxGeometry(.006, .055, .003), hd, 0, .14, .018); add(new T.BoxGeometry(.04, .005, .003), hd, .016, .12, .018).rotation.z = -.4;
      add(new T.BoxGeometry(.12, .02, .06), metal, 0, .01, 0);
    } else if (k === 'cushion') {   // sepasang bantal bersandar
      [[-.2, 0], [.2, 1]].forEach(function (c, i) { var m = add(pillowGeo(.48, .48, .17), texMat('fabric-linen', { col: FAB[i], rough: .95 }), c[0], .23, 0); m.rotation.x = -.32; m.rotation.z = i ? -.08 : .06; });
    } else if (k === 'throw') {   // selimut terlipat
      var tm = texMat('fabric-boucle', { col: FAB[1], rough: 1 });
      var t1 = add(pillowGeo(.55, .36, .05), tm, 0, .025, 0); t1.rotation.x = -Math.PI / 2;
      var t2 = add(pillowGeo(.55, .32, .04), tm, .01, .062, -.01); t2.rotation.x = -Math.PI / 2;
    } else if (k === 'rug' || k === 'rugr') {   // karpet bouclé + garis tepi
      var rm = texMat('fabric-boucle', { col: FAB[0], rough: 1 }), rb = texMat('fabric-boucle', { col: FAB[2], rough: 1 });
      if (k === 'rug') { add(new T.BoxGeometry(2.4, .012, 1.7), rb, 0, .006, 0); add(meterUV(new T.PlaneGeometry(2.24, 1.54), 2.24, 1.54), rm, 0, .0125, 0).rotation.x = -Math.PI / 2; }
      else { add(new T.CylinderGeometry(1, 1, .012, 96), rb, 0, .006, 0); add(new T.CircleGeometry(.92, 96), rm, 0, .0125, 0).rotation.x = -Math.PI / 2; }
      g.children.forEach(function (m) { m.castShadow = false; });
    }
    g.userData.flat = !!ACC_FLAT[k]; g.userData.ready = Promise.all(wait);   // GLB dimuat dulu → ukuran benar untuk penempatan
    return g;
  }
  // tumpukan buku sampul linen (warna gaya) — tidur atau berdiri
  function books(g, x, y, z, n, upright) {
    var C = ['#d9cfbf', '#8e7f6c', '#3f3a35', '#b9a58a', '#6b5a48', '#e8e1d5'], yy = y;
    for (var i = 0; i < n; i++) {
      var bw = upright ? .035 + rnd(i) * .02 : .24 - rnd(i) * .04, bh = upright ? .2 + rnd(i + 3) * .05 : .035 + rnd(i + 5) * .02, bd = .17 - rnd(i + 2) * .03;
      var b = new T.Mesh(new T.BoxGeometry(bw, bh, bd), new T.MeshStandardMaterial({ color: col(C[(i + Math.round(x * 10)) % C.length]), roughness: .8 }));
      if (upright) b.position.set(x + i * .045, y + bh / 2, z); else { b.position.set(x + (rnd(i + 7) - .5) * .03, yy + bh / 2, z); b.rotation.y = (rnd(i) - .5) * .2; yy += bh; }
      b.castShadow = b.receiveShadow = true; g.add(b);
    }
  }
  /* lukisan abstrak (bidang warna organik + tekstur kuas / kanvas) — palet per gaya, ala Burri / Bonalumi di katalog Minotti */
  var ART_PAL = { minotti: ['#d8c7ad', '#8a6a4a', '#efe7da', '#3a2c20', '#b38b62'], quiet: ['#ece5d9', '#cdbfaa', '#a8987f', '#f6f2eb', '#857560'], paris: ['#e2d6c4', '#9fb0b3', '#efe5d6', '#b8924f', '#6f7f84'], dark: ['#2b2520', '#7a5c47', '#c9a46a', '#4a423b', '#151210'] };
  function abstractArt(id, seed, aspect) {
    var P = ART_PAL[id] || ART_PAL.minotti, c = document.createElement('canvas'), Wc = 768, Hc = Math.round(Wc / (aspect || 1.43)); c.width = Wc; c.height = Hc;
    var g = c.getContext('2d'), r = function (k) { return rnd(seed * 17.3 + k); };
    g.fillStyle = P[0]; g.fillRect(0, 0, Wc, Hc);
    for (var b = 0; b < 4; b++) {   // bidang warna organik
      g.fillStyle = P[1 + b % (P.length - 1)]; g.globalAlpha = .55 + r(b) * .4; g.beginPath();
      var cx = r(b + 1) * Wc, cy = r(b + 2) * Hc, rad = (.18 + r(b + 3) * .3) * Wc;
      for (var a = 0; a <= 24; a++) { var t = a / 24 * Math.PI * 2, rr = rad * (.7 + r(b * 30 + a) * .5); g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * .7); }
      g.closePath(); g.fill();
    }
    g.globalAlpha = .9; g.strokeStyle = P[3]; g.lineWidth = 3 + r(9) * 5; g.beginPath(); g.moveTo(r(10) * Wc * .3, Hc * (.3 + r(11) * .4)); g.bezierCurveTo(Wc * .4, r(12) * Hc, Wc * .6, r(13) * Hc, Wc * (.7 + r(14) * .3), Hc * (.3 + r(15) * .4)); g.stroke();
    var img = g.getImageData(0, 0, Wc, Hc), d = img.data;   // tekstur kanvas & kuas
    for (var i = 0; i < d.length; i += 4) { var px = (i / 4) % Wc, py = Math.floor(i / 4 / Wc), n = (rnd(i * .37) - .5) * 18 + Math.sin(px * .9) * 3 + Math.sin(py * .7) * 3; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0); g.globalAlpha = 1;
    var t2 = new T.CanvasTexture(c); t2.encoding = T.sRGBEncoding; t2.anisotropy = 8; return t2;
  }
  var GLOW = null;
  function glowTex() {   // gradasi lembut untuk cahaya (picture light, api, cove)
    if (GLOW) return GLOW;
    var c = document.createElement('canvas'); c.width = 64; c.height = 128; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 128); GLOW = new T.CanvasTexture(c); return GLOW;
  }
  function shellPose(g, o) {
    var C = RS.cfg, L0 = LIFT;
    g.rotation.set(0, 0, 0);
    if (o.part === 'B') g.position.set(o.u, L0 + o.v, -C.d / 2 + (o.k === 'fireplace' ? 0 : RS.fdep || 0));
    else if (o.part === 'L') { g.position.set(-C.w / 2 + (o.k === 'fireplace' ? 0 : RS.fdepL || 0), L0 + o.v, o.u); g.rotation.y = Math.PI / 2; }
    else if (o.part === 'C') g.position.set(o.u, L0 + C.h - .12, o.v);
    else g.position.set(o.u, L0, o.v);
  }
  function shellBuild() {
    if (RS.g) { scene.remove(RS.g); RS.g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); RS.g = null; }
    var C = RS.cfg; if (!C) return;
    var g = new T.Group(), W = C.w, D = C.d, Hh = C.h, L0 = LIFT, sty = C.sty || {}, cove = C.cove;
    var part = function (mesh, p) { mesh.userData.part = p; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    var shadowWall = function (m) { m.castShadow = true; m.material.shadowSide = T.DoubleSide; return m; };
    // lantai: papan / set bertekstur + dasar gelap (celah papan) + tebal sampai tanah
    var F = FLOORS[C.floor] || FLOORS.oakwide;
    var base = part(new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: col('#1a1410'), roughness: 1 })), 'F'); base.rotation.x = -Math.PI / 2; base.position.y = L0 + .0005;
    if (F[2] === 'planks') part(plankFloor(W, D, L0 + .002, F[0], F[1], F[3]), 'F');
    else { var fl = part(new T.Mesh(meterUV(new T.PlaneGeometry(W, D), W, D), texMat(F[0], { col: F[3], rough: F[1], env: C.floor === 'marble' ? .8 : .5 })), 'F'); fl.rotation.x = -Math.PI / 2; fl.position.y = L0 + .002; }
    var slab = new T.Mesh(new T.BoxGeometry(W, L0, D), new T.MeshStandardMaterial({ color: col('#1c1814'), roughness: .9 })); slab.position.y = L0 / 2; slab.userData.noPick = true; g.add(slab);
    if (C.rug) { var rw = Math.min(3.2, W - 1.6), rd = Math.min(2.4, D - 1.4), rg = new T.Mesh(meterUV(new T.PlaneGeometry(rw, rd), rw, rd), texMat('fabric-boucle', { col: C.rug.col || '#d9cfc0', rough: .95, normal: .8 })); rg.rotation.x = -Math.PI / 2; rg.position.set(C.rug.x || .2, L0 + .008, C.rug.z == null ? -D / 2 + 1.5 : C.rug.z); rg.receiveShadow = true; rg.userData.part = 'F'; g.add(rg); }
    // tembok belakang (B) & kiri (L): finishing + feature wall + bukaan pintu / jendela (bingkai lokal per tembok)
    var opens = C.opens || legacyOpens(C), Lw = C.wallL || C.wall, sunAt = null, gapM = new T.MeshBasicMaterial({ color: col('#0d0b0a') });
    var WALLS = { B: { len: W, fin: C.wall.fin, col: C.wall.col, pos: [0, L0, -D / 2], ry: 0 }, L: { len: D, fin: Lw.fin, col: Lw.col, pos: [-W / 2, L0, 0], ry: Math.PI / 2 } };
    RS.fdep = RS.fdepL = 0;
    ['B', 'L'].forEach(function (pk) {
      var wl = WALLS[pk], wg = new T.Group(); wg.position.fromArray(wl.pos); wg.rotation.y = wl.ry;
      var ops = opens.filter(function (o) { return o.wall === pk; }).map(function (o) { return { o: o, r: openRect(o, Hh, wl.len, pk) }; }), holes = ops.map(function (q) { return q.r; });
      var bm = baseWallMat(wl.fin, wl.col), wq = rectMinus([-wl.len / 2, wl.len / 2, 0, Hh], holes).map(function (r) { return rq(r, 0, r[0] + wl.len / 2, r[2]); });
      var wm = shadowWall(new T.Mesh(quadGeo(wq), bm)); wm.userData.part = pk; wm.receiveShadow = true; wg.add(wm);
      var fw = featureWall(wl.fin, wl.len, Hh, wl.col, holes.map(function (h) { return [h[0] - .08, h[1] + .08, h[2], h[3] + .08]; })), fd = fw.children.length ? .03 : 0;
      fw.traverse(function (m) { m.userData.part = pk; }); wg.add(fw);
      if (pk === 'B') RS.fdep = fd; else RS.fdepL = fd;
      var sk = rectMinus([-wl.len / 2, wl.len / 2, 0, .018], holes).map(function (r) { return rq(r, fd + .002); });   // shadow-gap skirting
      if (sk.length) { var skm = new T.Mesh(quadGeo(sk), gapM); skm.userData.noPick = true; wg.add(skm); }
      ops.forEach(function (q) { var og = openObj(q.o, q.r, Hh, fd, bm, sty); og.userData.openId = q.o.id; og.userData.part = pk; og.userData.s = (q.r[0] + q.r[1]) / 2; wg.add(og); if (q.o.t === 'win' && !sunAt) sunAt = { wg: wg, s: (q.r[0] + q.r[1]) / 2, y: (q.r[2] + q.r[3]) / 2 }; });
      g.add(wg);
    });
    // matahari lembut lewat jendela pertama (bayangan bukaan di lantai); tanpa jendela: cahaya redup dari sisi terbuka
    var sun = new T.DirectionalLight(col('#ffe9cf'), (C.sun == null ? .85 : C.sun) * (sunAt ? 1 : .45));
    if (sunAt) {
      g.updateMatrixWorld(true);
      var wc = new T.Vector3(sunAt.s, sunAt.y, 0).applyMatrix4(sunAt.wg.matrixWorld), outW = new T.Vector3(0, 0, -1).applyQuaternion(sunAt.wg.quaternion), tan = new T.Vector3(1, 0, 0).applyQuaternion(sunAt.wg.quaternion);
      sun.position.copy(wc).addScaledVector(outW, 4).addScaledVector(tan, -1.2); sun.position.y = L0 + Hh + 1.6;
      sun.target.position.copy(wc).addScaledVector(outW, -2.2).addScaledVector(tan, -.4); sun.target.position.y = L0;
    } else { sun.position.set(W / 2 + 3, L0 + Hh + 3, D / 2 + 3); sun.target.position.set(0, L0, 0); }
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = .5; sc.far = 16; sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
    g.add(sun, sun.target);
    // plafon + drop ceiling keliling (cove) + cahaya LED tersembunyi & cahaya membasuh tembok
    var cmat = baseWallMat('limewash', C.ceil.fin === 'wood' ? '#a07a55' : (C.ceil.col || '#f2ede5'));
    var ce = part(new T.Mesh(meterUV(new T.PlaneGeometry(W - .9, D - .9), W - .9, D - .9), C.ceil.fin === 'wood' ? texMat('room-wall-walnut', { rough: .5 }) : cmat), 'C'); ce.rotation.x = Math.PI / 2; ce.position.set(.0, L0 + Hh, 0);
    var sof = function (x, z, sw, sd) { var m = part(new T.Mesh(new T.PlaneGeometry(sw, sd), cmat), 'C'); m.rotation.x = Math.PI / 2; m.position.set(x, L0 + Hh - .16, z); };
    sof(0, -D / 2 + .225, W, .45); sof(0, D / 2 - .225, W, .45); sof(-W / 2 + .225, 0, .45, D - .9); sof(W / 2 - .225, 0, .45, D - .9);
    if (cove) {
      var led = new T.MeshBasicMaterial({ color: col(cove), toneMapped: false });
      [[0, -D / 2 + .45, W - .9, .012], [-W / 2 + .45, 0, .012, D - .9]].forEach(function (s) { var m = new T.Mesh(new T.BoxGeometry(s[2], .012, s[3]), led); m.position.set(s[0], L0 + Hh - .1, s[1]); m.userData.noPick = true; g.add(m); });
      var wash = function (len, x, z, ry) { var m = new T.Mesh(new T.PlaneGeometry(len, 1.6), new T.MeshBasicMaterial({ map: glowTex(), color: col(cove), transparent: true, opacity: C.coveK || .22, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); m.position.set(x, L0 + Hh - .16 - .8, z); m.rotation.y = ry; m.userData.noPick = true; g.add(m); };
      wash(W, 0, -D / 2 + .035, 0); wash(D, -W / 2 + .035, 0, Math.PI / 2);
      var amb = new T.PointLight(col(cove), C.coveL || .35, Math.max(W, D) * 1.4, 1.6); amb.position.set(0, L0 + Hh - .25, -D / 4); g.add(amb);
    }
    (C.objs || []).forEach(function (o) { var og = shellObj(o); og.userData.oid = o.oid; og.userData.part = o.part; og.userData.k = o.k; shellPose(og, o); g.add(og); });
    g.visible = RS.on && st.kind === 'room'; scene.add(g); RS.g = g;
  }
  // pasang / ganti ruangan (null = tanpa ruangan). Furnitur ruang tidak lagi dipusatkan bila ada ruangan.
  XW.roomShell = function (cfg) { RS.cfg = cfg ? JSON.parse(JSON.stringify(cfg)) : null; RS.on = !!cfg; shellBuild(); if (ROOM.g && st.kind === 'room') { roomCenter(); frameItem(ROOM.g.userData.bounds, .9); } };
  function shellAt(x, y) {
    if (st.kind !== 'room' || !RS.g || !RS.g.visible) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(RS.g, true);
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].object.userData.noPick) continue;
      for (var q = hits[i].object; q && q !== RS.g; q = q.parent) {
        if (q.userData.openId) return { kind: 'open', id: q.userData.openId, part: q.userData.part, point: hits[i].point, w: q };
        if (q.userData.oid) return { kind: 'obj', oid: q.userData.oid, part: q.userData.part, point: hits[i].point, w: q };
        if (q.userData.part) return { kind: 'part', part: q.userData.part, point: hits[i].point };
      }
    }
    return null;
  }
  function shellUV(part, p) { return part === 'B' ? [p.x, p.y - LIFT] : part === 'L' ? [p.z, p.y - LIFT] : [p.x, p.z]; }
  function shellPlane(part) {
    var C = RS.cfg;
    return part === 'B' ? new T.Plane(new T.Vector3(0, 0, 1), C.d / 2) : part === 'L' ? new T.Plane(new T.Vector3(1, 0, 0), C.w / 2) : part === 'C' ? new T.Plane(new T.Vector3(0, -1, 0), LIFT + C.h) : new T.Plane(new T.Vector3(0, 1, 0), -LIFT);
  }
  // furnitur ruang: tanpa ruangan → tata letak dipusatkan; dengan ruangan → koordinat ruangan apa adanya
  function roomCenter() {
    var g = ROOM.g; if (!g) return;
    var box = new T.Box3(); g.children.forEach(function (o) { if (o.userData.rid) box.expandByObject(o); });
    if (RS.on) { g.position.set(0, 0, 0); g.userData.bounds = { w: RS.cfg.w, h: RS.cfg.h * .62, d: RS.cfg.d }; return; }
    var sz = box.isEmpty() ? new T.Vector3(1, 1, 1) : box.getSize(new T.Vector3());
    if (!box.isEmpty()) { var cc = box.getCenter(new T.Vector3()).sub(g.position); g.position.set(-cc.x, 0, -cc.z); }
    g.userData.bounds = { w: Math.max(sz.x, 1), h: Math.max(sz.y, .5), d: Math.max(sz.z, 1) };
  }
  /* snap furnitur ruang: grid 10 cm, punggung / sisi rapat ke tembok, tepi sejajar furnitur lain (Alt = bebas) */
  var SNAP = { lines: null };
  function snapPrep(wr) {
    var g = ROOM.g, b = new T.Box3().setFromObject(wr), gp = g.position, others = [];
    g.children.forEach(function (o) { if (o.userData.rid && o !== wr && !o.userData.acc) { var ob = new T.Box3().setFromObject(o); others.push({ x0: ob.min.x - gp.x, x1: ob.max.x - gp.x, z0: ob.min.z - gp.z, z1: ob.max.z - gp.z }); } });
    return { L: wr.position.x - (b.min.x - gp.x), R: (b.max.x - gp.x) - wr.position.x, B: wr.position.z - (b.min.z - gp.z), F: (b.max.z - gp.z) - wr.position.z, others: others };
  }
  function snapAt(d, x, z, free) {
    var gx = null, gz = null;
    if (free) return { x: x, z: z, gx: gx, gz: gz };
    x = Math.round(x * 10) / 10; z = Math.round(z * 10) / 10;
    var best = function (pairs, cur) { var m = null; pairs.forEach(function (p) { var dd = p[1] - p[0]; if (Math.abs(dd) < .07 && (!m || Math.abs(dd) < Math.abs(m.d))) m = { d: dd, at: p[1] }; }); return m; };
    var sx = best([].concat.apply([], d.others.map(function (o) { return [[x - d.L, o.x0], [x - d.L, o.x1], [x + d.R, o.x0], [x + d.R, o.x1]]; })));
    if (sx) { x += sx.d; gx = sx.at; }
    var sz = best([].concat.apply([], d.others.map(function (o) { return [[z - d.B, o.z0], [z - d.B, o.z1], [z + d.F, o.z0], [z + d.F, o.z1]]; })));
    if (sz) { z += sz.d; gz = sz.at; }
    if (RS.on) {
      var Wd = RS.cfg.w, Dd = RS.cfg.d;
      if (Math.abs((z - d.B) + Dd / 2) < .18) { z = -Dd / 2 + d.B; gz = -Dd / 2; }
      if (Math.abs((x - d.L) + Wd / 2) < .18) { x = -Wd / 2 + d.L; gx = -Wd / 2; }
      x = clamp(x, -Wd / 2 + d.L, Wd / 2 - d.R); z = clamp(z, -Dd / 2 + d.B, Dd / 2 - d.F);
    }
    return { x: x, z: z, gx: gx, gz: gz };
  }
  function snapGuides(gx, gz) {
    if (!SNAP.lines) {
      var m = new T.LineBasicMaterial({ color: col('#dcc59c'), transparent: true, opacity: .9 });
      SNAP.lines = [0, 1].map(function () { var l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), m); l.userData.noPick = true; l.renderOrder = 4; return l; });
    }
    SNAP.lines.forEach(function (l) { if (ROOM.g && l.parent !== ROOM.g) ROOM.g.add(l); });
    var y = LIFT + .006, S = 8, p0 = SNAP.lines[0].geometry.attributes.position, p1 = SNAP.lines[1].geometry.attributes.position;
    SNAP.lines[0].visible = gx != null; if (gx != null) { p0.setXYZ(0, gx, y, -S); p0.setXYZ(1, gx, y, S); p0.needsUpdate = true; }
    SNAP.lines[1].visible = gz != null; if (gz != null) { p1.setXYZ(0, -S, y, gz); p1.setXYZ(1, S, y, gz); p1.needsUpdate = true; }
  }
  /* ---------------------------------------------------------------- RUANG: beberapa furnitur sekaligus di panggung
     entries = [{ rid, kind: custom|model|photo, cfg | url + p | photo + p, x, z, ry }]
     Geser furnitur di lantai untuk memindahkan (XW.onRoomMove(rid, x, z)). */
  var ROOM = { g: null, drag: null, my: 0 };
  function roomPiece(e) {
    if (e.kind === 'custom' && !window.XMAKER && window.XNeedMaker) return window.XNeedMaker().then(function () { return roomPiece(e); });
    if (e.kind === 'custom' && window.XMAKER) {
      if (!customKit) customKit = { T: T, rbox: rbox, col: col };
      var b = window.XMAKER.build(e.cfg, customKit);
      (b.motions || []).forEach(function (m) { m.apply(0); });
      var bx = new T.Box3().setFromObject(b.group), c = bx.getCenter(new T.Vector3());
      b.group.position.set(-c.x, LIFT - bx.min.y, -c.z);
      var g0 = new T.Group(); g0.add(b.group); g0.userData.dispose = b.dispose;
      return Promise.resolve(g0);
    }
    if (e.kind === 'model') return getModel(e.url).then(function (s) { var g = makeModel(s, e.p || {}); if (e.ai) g.traverse(function (m) { if (m.isMesh && m.material) m.material.side = T.DoubleSide; });   /* model AI: normal kadang terbalik */ if (e.flip) g.scale.x = -1; if (e.hex) tintModel(g, e.hex, 0); return g; });
    if (e.kind === 'acc') { var ap = accPiece(e.k); return ap.userData.ready.then(function () { return ap; }); }
    if (e.kind === 'photo') return getRaw(e.url).then(function (r) { var s = photoSize(r); return makeBillboard(r.tex, s[0], s[1], true); });
    return Promise.resolve(null);
  }
  XW.showRoom = function (entries) {
    var my = ++req;
    return Promise.all((entries || []).map(function (e) { return roomPiece(e).catch(function () { return null; }); })).then(function (parts) {
      if (my !== req) { parts.forEach(function (p) { if (p && p.userData.dispose) p.userData.dispose(); }); return; }
      var g = new T.Group(), box = new T.Box3();
      parts.forEach(function (p, i) {
        if (!p) return;
        var e = entries[i], wrap = new T.Group();
        wrap.add(p); wrap.position.set(e.x || 0, e.kind === 'acc' ? (e.y != null ? e.y : LIFT) : 0, e.z || 0); wrap.rotation.y = (e.ry || 0) * Math.PI / 180;
        wrapTag(wrap, e, p); g.add(wrap);
      });
      g.updateMatrixWorld(true);
      g.userData = { room: true }; ROOM.g = g; roomCenter();   // tanpa ruangan: dipusatkan · dengan ruangan: koordinat ruangan
      g.userData.dispose = function () { scene.remove(g); g.children.forEach(function (wr) { wr.traverse(function (o) { if (o.userData.dispose && o !== wr) o.userData.dispose(); }); }); };
      g.visible = false; scene.add(g); ROOM.g = g;
      present('room', g);
    });
  };
  /* tempat kosong di lantai untuk furnitur baru: tidak menimpa furnitur lain (jarak 8 cm), di dalam ruangan,
     sedekat mungkin ke tengah ruang (ada ruangan: agak ke belakang). Hasil = posisi pivot (x, z). */
  // penanda di bungkus furnitur ruang: rid, aksesoris (acc / k / flat), kategori produk
  function wrapTag(wrap, e, p) { wrap.userData.rid = e.rid; wrap.userData.acc = e.kind === 'acc'; wrap.userData.k = e.k || ''; wrap.userData.flat = !!(p && p.userData.flat); wrap.userData.cat = e.p ? e.p.cat || '' : e.kind === 'custom' ? 'seats' : ''; wrap.userData.on = e.on || ''; }
  var onFloor = function (o) { return !o.userData.acc || (!o.userData.flat && o.position.y < LIFT + .05); };   // karpet & barang di atas furnitur bukan penghalang lantai
  function roomFree(wr) {
    var g = ROOM.g, gp = g.position, M = .08, others = [], ry0 = wr.rotation.y;
    var boxOf = function (o) { var ob = new T.Box3().setFromObject(o); others.push([ob.min.x - gp.x - M, ob.max.x - gp.x + M, ob.min.z - gp.z - M, ob.max.z - gp.z + M]); };
    g.children.forEach(function (o) { if (o.userData.rid && o !== wr && onFloor(o)) boxOf(o); });
    if (RS.on && RS.g) RS.g.children.forEach(function (o) { if (o.userData.oid && (o.userData.part === 'F' || /fireplace/.test(o.userData.k || ''))) boxOf(o); });   // perapian, pot, lampu lantai ruangan
    var b0 = new T.Box3().setFromObject(wr), tall = RS.on && b0.max.y - b0.min.y > 1.1;
    // lemari / barang tinggi: punggung ke tembok belakang → diputar ke tembok kiri → bebas
    var tries = tall ? [[0, 'B'], [Math.PI / 2, 'L'], [0, '']] : [[0, '']];
    for (var t = 0; t < tries.length; t++) {
      wr.rotation.y = ry0 + tries[t][0]; wr.updateMatrixWorld(true);
      var b = new T.Box3().setFromObject(wr), hw = (b.max.x - b.min.x) / 2, hd = (b.max.z - b.min.z) / 2;
      if (b.isEmpty()) break;   // model belum termuat: posisi apa adanya
      var ox = wr.position.x - ((b.min.x + b.max.x) / 2 - gp.x), oz = wr.position.z - ((b.min.z + b.max.z) / 2 - gp.z);
      var X = RS.on ? RS.cfg.w / 2 - hw - .02 : 6, Z = RS.on ? RS.cfg.d / 2 - hd - .02 : 6, px = RS.on ? 0 : -gp.x, pz = RS.on ? (tall ? -Z : -.3) : -gp.z, best = null, side = tries[t][1];
      for (var x = -X; x <= X + 1e-6; x += .1) for (var z = -Z; z <= Z + 1e-6; z += .1) {
        if (side === 'L' && x > -X + 1e-6) continue; if (side === 'B' && z > -Z + 1e-6) continue;
        if (others.some(function (o) { return x + hw > o[0] && x - hw < o[1] && z + hd > o[2] && z - hd < o[3]; })) continue;
        var sc = (x - px) * (x - px) + (z - pz) * (z - pz) * 1.3;
        if (!best || sc < best.s) best = { s: sc, x: x, z: z };
      }
      if (best) return { x: +(best.x + ox).toFixed(2), z: +(best.z + oz).toFixed(2), ry: Math.round(wr.rotation.y * 180 / Math.PI) };
    }
    wr.rotation.y = ry0; return { x: wr.position.x, z: wr.position.z, ry: Math.round(ry0 * 180 / Math.PI) };
  }
  /* aksesoris baru: cari permukaan yang cocok — TV → kabinet / meja lebar & rendah, lampu → meja samping / nakas,
     bantal & selimut → sofa / ranjang, karpet → tengah kelompok duduk, lainnya → meja kopi lalu kabinet. Tidak menimpa aksesoris lain. */
  var ACC_SURF = { tv: 'wide', lamp: 'small', cushion: 'seat', throw: 'seat', rug: 'rug', rugr: 'rug', olive: 'floor' };
  function surfTop(o, x, z) {   // tinggi permukaan teratas o di titik ruang (x, z)
    var gp = ROOM.g.position, rc = new T.Raycaster(new T.Vector3(x + gp.x, 6, z + gp.z), new T.Vector3(0, -1, 0));
    var h = rc.intersectObject(o, true).filter(function (q) { return !q.object.userData.noPick && q.object.isMesh; })[0];
    return h ? h.point.y - gp.y : null;   // relatif terhadap grup ruang (grup bisa sedang beranimasi naik)
  }
  function localSize(o) { var r = o.rotation.y; o.rotation.y = 0; o.updateMatrixWorld(true); var b = new T.Box3().setFromObject(o); o.rotation.y = r; o.updateMatrixWorld(true); return { w: b.max.x - b.min.x, d: b.max.z - b.min.z }; }
  function accFree(wr) {
    var k = wr.userData.k, mode = ACC_SURF[k] || 'top', g = ROOM.g, gp = g.position;
    var bw = new T.Box3().setFromObject(wr), aw = bw.isEmpty() ? .1 : (bw.max.x - bw.min.x) / 2, ad = bw.isEmpty() ? .1 : (bw.max.z - bw.min.z) / 2;
    if (mode === 'rug') {
      var c = new T.Vector3(), n = 0;
      g.children.forEach(function (o) { if (o.userData.rid && !o.userData.acc && /seats|tables/.test(o.userData.cat)) { c.add(o.position); n++; } });
      if (n) c.divideScalar(n); else c.set(RS.on ? 0 : -gp.x, 0, RS.on ? -.3 : -gp.z);
      return { x: +c.x.toFixed(2), z: +c.z.toFixed(2), y: LIFT };
    }
    var floor = function () { var f0 = roomFree(wr); return { x: f0.x, z: f0.z, y: LIFT, ry: f0.ry }; };
    if (mode === 'floor') return floor();
    var taken = g.children.filter(function (o) { return o.userData.acc && o !== wr && !o.userData.flat; }).map(function (o) { return new T.Box3().setFromObject(o); });
    var free = function (x, z) { return !taken.some(function (r) { return x + aw > r.min.x - gp.x && x - aw < r.max.x - gp.x && z + ad > r.min.z - gp.z && z - ad < r.max.z - gp.z; }); };
    var surfs = [];
    g.children.forEach(function (o) {
      if (!o.userData.rid || o.userData.acc || o === wr) return;
      if (wr.userData.on && o.userData.rid !== wr.userData.on) return;
      var b = new T.Box3().setFromObject(o), cat = o.userData.cat, top = b.max.y - gp.y, ww = b.max.x - b.min.x, dd = b.max.z - b.min.z, sc;
      if (wr.userData.on && (cat === 'seats' || cat === 'bedframe') && mode !== 'seat') mode = 'seat';
      if (mode === 'seat') { if (cat !== 'seats' && cat !== 'bedframe') return; sc = cat === 'seats' ? 0 : 1; }
      else if (wr.userData.on) sc = 0;
      else {
        if (!(cat === 'tables' || cat === 'cabinet') || top < .25 || top > 1.3 || ww < aw * 2 + .04 || dd < ad * 2 + .04) return;
        sc = mode === 'wide' ? -Math.max(ww, dd) + (top > .95 ? 3 : 0) + (cat === 'cabinet' ? -.5 : 0) : mode === 'small' ? ww * dd + (top < .4 ? 2 : 0) : (top < .56 ? 0 : 1) + ww * dd * .05;
      }
      surfs.push({ o: o, b: b, sc: sc });
    });
    surfs.sort(function (a, b) { return a.sc - b.sc; });
    for (var i = 0; i < surfs.length; i++) {
      var s = surfs[i], o = s.o, b = s.b, best = null, deg = Math.round(o.rotation.y * 180 / Math.PI);
      if (mode === 'seat') {   // bantal: ujung kiri / kanan dudukan, dekat sandaran; mengikuti arah sofa
        var ls = localSize(o), cs = Math.cos(o.rotation.y), sn = Math.sin(o.rotation.y);
        var spots = [[-ls.w / 2 + .42, -ls.d * .12], [ls.w / 2 - .42, -ls.d * .12], [-ls.w / 2 + .95, -ls.d * .12], [ls.w / 2 - .95, -ls.d * .12], [0, -ls.d * .12]];
        for (var q = 0; q < spots.length && !best; q++) {
          var lx = spots[q][0], lz = spots[q][1], x = o.position.x + lx * cs + lz * sn, z = o.position.z - lx * sn + lz * cs;
          if (!free(x, z)) continue;
          var y = surfTop(o, x, z); if (y != null && y < LIFT + .8) best = { x: x, z: z, y: y };
        }
      } else {
        var cx = (b.min.x + b.max.x) / 2 - gp.x, cz = (b.min.z + b.max.z) / 2 - gp.z, X0 = b.min.x - gp.x + aw + .03, X1 = b.max.x - gp.x - aw - .03, Z0 = b.min.z - gp.z + ad + .03, Z1 = b.max.z - gp.z - ad - .03;
        var cand = [];   // titik bebas, dari tengah permukaan ke luar; raycast dibatasi (model ber-poligon tinggi)
        for (var x2 = X0; x2 <= X1 + 1e-6; x2 += .05) for (var z2 = Z0; z2 <= Z1 + 1e-6; z2 += .05) if (free(x2, z2)) cand.push([x2, z2, (x2 - cx) * (x2 - cx) + (z2 - cz) * (z2 - cz)]);
        cand.sort(function (p1, p2) { return p1[2] - p2[2]; });
        for (var c2 = 0; c2 < cand.length && c2 < 40 && !best; c2++) {
          var y2 = surfTop(o, cand[c2][0], cand[c2][1]); if (y2 == null || y2 < b.max.y - gp.y - (wr.userData.on ? .2 : .04) || y2 < LIFT + .2) continue;   // bidang atas yang rata (meja susun: bidang mana saja yang tinggi)
          best = { x: cand[c2][0], z: cand[c2][1], y: y2 };
        }
      }
      if (best) return { x: +best.x.toFixed(3), z: +best.z.toFixed(3), y: +best.y.toFixed(3), ry: deg };
    }
    if (wr.userData.on) { wr.userData.on = ''; return accFree(wr); }   // furnitur tujuan penuh → permukaan lain
    return floor();
  }
  // titik taruh aksesoris di bawah kursor: bidang atas furnitur / aksesoris lain (normal menghadap atas), atau lantai
  var _n = new T.Vector3();
  function accDropAt(x, y, wr) {
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var gp = ROOM.g.position, p = null;
    if (!wr.userData.flat) {
      var objs = ROOM.g.children.filter(function (o) { return o.userData.rid && o !== wr && !o.userData.flat; });
      var hits = ray.intersectObjects(objs, true);
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i]; if (h.object.userData.noPick || !h.face) continue;
        _n.copy(h.face.normal).transformDirection(h.object.matrixWorld);
        if (_n.y > .65) { p = { x: h.point.x - gp.x, z: h.point.z - gp.z, y: h.point.y - gp.y }; break; }
        break;   // sisi tegak furnitur: jangan menembus ke lantai di baliknya
      }
      if (!p && hits.length) return null;
    }
    if (!p) { var fp = floorAt(x, y); if (!fp) return null; p = { x: fp.x - gp.x, z: fp.z - gp.z, y: LIFT }; }
    if (RS.on) { p.x = clamp(p.x, -RS.cfg.w / 2 + .05, RS.cfg.w / 2 - .05); p.z = clamp(p.z, -RS.cfg.d / 2 + .05, RS.cfg.d / 2 - .05); }
    return p;
  }
  /* furnitur yang menghalangi pintu (area 1 m di depan bukaan) digeser di sepanjang tembok, atau menjauh dari tembok;
     tetap di dalam ruangan & tidak menimpa furnitur lain. Dipakai setelah preset dipasang. */
  XW.roomTidy = function () {
    if (!ROOM.g || !RS.on) return [];
    var C = RS.cfg, Wd = C.w, Dd = C.d, zones = [];
    (C.opens || []).forEach(function (o) {
      if (o.t !== 'door') return;
      var r = openRect(o, C.h, o.wall === 'B' ? Wd : Dd, o.wall);
      if (o.wall === 'B') zones.push({ b: [r[0] - .1, r[1] + .1, -Dd / 2, -Dd / 2 + 1], ax: 'x', away: [0, 1] });
      else zones.push({ b: [-Wd / 2, -Wd / 2 + 1, -r[1] - .1, -r[0] + .1], ax: 'z', away: [1, 0] });
    });
    if (!zones.length) return [];
    var items = ROOM.g.children.filter(function (o) { return o.userData.rid && !o.userData.acc; }), mv = [];
    var boxOf = function (o) { var b = new T.Box3().setFromObject(o); return [b.min.x, b.max.x, b.min.z, b.max.z]; };
    var hit = function (b, c, m) { return b[0] < c[1] - m && b[1] > c[0] + m && b[2] < c[3] - m && b[3] > c[2] + m; };
    items.forEach(function (o) {
      var b = boxOf(o), hz = zones.filter(function (z) { return hit(b, z.b, 0); }); if (!hz.length) return;
      var z0 = hz[0], tries = [], best = null;
      for (var s = .1; s <= 3.01; s += .1) tries.push(z0.ax === 'x' ? [-s, 0] : [0, -s], z0.ax === 'x' ? [s, 0] : [0, s], [z0.away[0] * s, z0.away[1] * s]);
      for (var i = 0; i < tries.length && !best; i++) {
        var d = tries[i], nb = [b[0] + d[0], b[1] + d[0], b[2] + d[1], b[3] + d[1]];
        if (nb[0] < -Wd / 2 - .01 || nb[1] > Wd / 2 + .01 || nb[2] < -Dd / 2 - .01 || nb[3] > Dd / 2 + .01) continue;
        if (zones.some(function (z) { return hit(nb, z.b, 0); }) || items.some(function (q) { return q !== o && hit(nb, boxOf(q), .02); })) continue;
        best = d;
      }
      if (!best) return;
      o.position.x += best[0]; o.position.z += best[1]; o.updateMatrixWorld(true);
      mv.push({ rid: o.userData.rid, x: +o.position.x.toFixed(3), z: +o.position.z.toFixed(3) });
    });
    if (mv.length && XW.onRoomMoves) XW.onRoomMoves(mv, true);
    return mv;
  };
  // tambah satu furnitur tanpa memuat ulang ruang (kamera tetap). auto → dicarikan tempat kosong. false = panggung bukan ruang
  XW.roomAppend = function (e, auto) {
    if (st.kind !== 'room' || !ROOM.g) return Promise.resolve(false);
    var g = ROOM.g;
    return roomPiece(e).then(function (p) {
      if (!p || ROOM.g !== g) { if (p && p.userData.dispose) p.userData.dispose(); return false; }
      var wrap = new T.Group(); wrap.add(p); wrapTag(wrap, e, p);
      wrap.position.set(e.x || 0, e.kind === 'acc' ? (e.y != null ? e.y : LIFT) : 0, e.z || 0); wrap.rotation.y = (e.ry || 0) * Math.PI / 180;
      g.add(wrap); g.updateMatrixWorld(true);
      if (auto) {
        var s = e.kind === 'acc' ? accFree(wrap) : roomFree(wrap);
        wrap.position.x = s.x; wrap.position.z = s.z; if (s.y != null) wrap.position.y = s.y; if (s.ry != null) wrap.rotation.y = s.ry * Math.PI / 180;
        if (XW.onRoomMove) XW.onRoomMove(e.rid, s.x, s.z, true, s.ry, s.y);
      }
      wrap.scale.setScalar(.01); tw(wrap.scale, { x: 1, y: 1, z: 1, duration: .7, ease: 'back.out(1.3)' });
      return true;
    }, function () { return false; });
  };
  XW.roomRemove = function (rid) {
    if (!ROOM.g) return false;
    var wr = ROOM.g.children.filter(function (o) { return o.userData.rid === rid; })[0]; if (!wr) return false;
    tw(wr.scale, { x: .01, y: .01, z: .01, duration: .35, ease: 'power2.in', onComplete: function () { ROOM.g.remove(wr); wr.traverse(function (o) { if (o.userData.dispose && o !== wr) o.userData.dispose(); }); } });
    return true;
  };
  XW.roomSet = function (rid, o) {
    if (!ROOM.g) return;
    ROOM.g.children.forEach(function (wr) { if (wr.userData.rid !== rid) return; if (o.ry != null) tw(wr.rotation, { y: o.ry * Math.PI / 180, duration: .6, ease: 'power2.inOut' }); if (o.x != null) wr.position.x = o.x; if (o.z != null) wr.position.z = o.z; });
  };
  // posisi layar tiap furnitur ruang (uji otomatis, label)
  XW.roomInfo = function () {
    if (st.kind !== 'room' || !ROOM.g) return [];
    return ROOM.g.children.filter(function (o) { return o.userData.rid; }).map(function (o) { var v = new T.Vector3(); o.getWorldPosition(v); v.y = LIFT + .35; v.project(camera); return { rid: o.userData.rid, sx: (v.x + 1) / 2 * W, sy: (1 - v.y) / 2 * H, ry: Math.round(o.rotation.y * 180 / Math.PI) }; });
  };
  XW.viewPan = function () { return { x: +st.px.toFixed(3), y: +st.py.toFixed(3) }; };
  function roomAt(x, y) {
    if (st.kind !== 'room' || !ROOM.g) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(ROOM.g, true);
    for (var i = 0; i < hits.length; i++) { if (hits[i].object.userData.noPick) continue; for (var o = hits[i].object; o; o = o.parent) if (o.userData.rid) return o; }
    return null;
  }
  var floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function floorAt(x, y) { ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); var p = new T.Vector3(); return ray.ray.intersectPlane(floorPlane, p) ? p : null; }
  /* ---------------------------------------------------------------- KONFIGURASI CUBIX: modul GLB disusun bebas di grid
     mods = [{ uid, url, cat, type, x, z, r (0–3 × 90°, r=1: depan menghadap +X), flip (cermin, AC kiri/kanan), auto }]
     Ketuk modul = pilih (XW.onCfgPick(uid | null)); geser = pindah, menempel ke grid 0,32 m & tidak boleh
     menimpa modul lain (XW.onCfgMove(uid, x, z)). auto: modul baru dicarikan tempat kosong terdekat. */
  var CFG = { g: null, drag: null, sel: null, mark: null, hex: null }, CFG_GRID = .32;
  function cfgFoot(wr) { var b = wr.userData.b, odd = wr.userData.r % 2; return { w: odd ? b.d : b.w, d: odd ? b.w : b.d }; }
  function cfgHits(wr, x, z) {
    var f = cfgFoot(wr);
    return CFG.g.children.some(function (o) {
      if (o === wr || !o.userData.uid) return false;
      var g = cfgFoot(o); return Math.abs(o.position.x - x) < (f.w + g.w) / 2 - .02 && Math.abs(o.position.z - z) < (f.d + g.d) / 2 - .02;
    });
  }
  function cfgSnap(wr, x, z) { var f = cfgFoot(wr), G = CFG_GRID; return [Math.round((x - f.w / 2) / G) * G + f.w / 2, Math.round((z - f.d / 2) / G) * G + f.d / 2]; }
  function cfgFree(wr, x, z) {   // titik kosong terdekat (spiral grid)
    var p = cfgSnap(wr, x, z);
    for (var ring = 0; ring < 14; ring++) for (var i = -ring; i <= ring; i++) for (var j = -ring; j <= ring; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
      var tx = p[0] + i * CFG_GRID, tz = p[1] + j * CFG_GRID; if (!cfgHits(wr, tx, tz)) return [tx, tz];
    }
    return p;
  }
  function cfgPiece(m) {
    return getModel(m.url).then(function (s) {
      var inner = makeModel(s, { cat: m.cat || 'seats', type: m.type || '' }), wr = new T.Group();
      wr.add(inner); wr.userData = { uid: m.uid, url: m.url, b: inner.userData.bounds, r: 0, inner: inner };
      return wr;
    });
  }
  function cfgPose(wr, m) {
    wr.userData.r = (((m.r || 0) % 4) + 4) % 4;
    wr.userData.inner.scale.x = m.flip ? -1 : 1;
    wr.rotation.y = wr.userData.r * Math.PI / 2;
    wr.position.set(m.x || 0, 0, m.z || 0);
  }
  function cfgBounds() {
    var box = new T.Box3();
    CFG.g.children.forEach(function (o) { if (o.userData.uid) box.expandByObject(o); });
    var sz = box.isEmpty() ? new T.Vector3(1.4, .8, 1) : box.getSize(new T.Vector3());
    return { w: Math.max(sz.x, 1.4), h: Math.max(sz.y, .8), d: Math.max(sz.z, 1), box: box };
  }
  function cfgMark() {
    var wr = CFG.g && CFG.sel && CFG.g.children.filter(function (o) { return o.userData.uid === CFG.sel; })[0];
    if (!CFG.mark) {
      var geo = new T.BufferGeometry().setFromPoints([new T.Vector3(-.5, 0, -.5), new T.Vector3(.5, 0, -.5), new T.Vector3(.5, 0, .5), new T.Vector3(-.5, 0, .5)]);
      CFG.mark = new T.LineLoop(geo, new T.LineBasicMaterial({ color: col('#dcc59c'), transparent: true, opacity: .9 }));
      CFG.mark.userData.noPick = true; CFG.mark.renderOrder = 3;
    }
    if (CFG.mark.parent !== CFG.g && CFG.g) CFG.g.add(CFG.mark);
    CFG.mark.visible = !!wr;
    if (!wr) return;
    var f = cfgFoot(wr); CFG.mark.scale.set(f.w + .06, 1, f.d + .06); CFG.mark.position.set(wr.position.x, LIFT + .006, wr.position.z);
  }
  function cfgTint() { if (CFG.g) CFG.g.children.forEach(function (o) { if (o.userData.inner) tintModel(o.userData.inner, CFG.hex, 0); }); }
  // bangun / perbarui susunan; modul yang sudah ada hanya digeser (tidak dimuat ulang) kecuali file-nya berubah (ganti kayu)
  XW.cfgSync = function (mods, hex, reframe) {
    var first = !CFG.g || st.kind !== 'cubixcfg' || item !== CFG.g, my = first ? ++req : req;
    if (first) {
      CFG.g = new T.Group(); CFG.g.userData = { bounds: { w: 1.4, h: .8, d: 1 }, cfg: true };
      var g0 = CFG.g; g0.userData.dispose = function () { scene.remove(g0); if (CFG.g === g0) CFG.g = null; };
      CFG.mark = null; CFG.sel = null;
    }
    var g = CFG.g; CFG.hex = hex || null;
    var want = {}; (mods || []).forEach(function (m) { want[m.uid] = m; });
    g.children.slice().forEach(function (o) { if (o.userData.uid && (!want[o.userData.uid] || want[o.userData.uid].url !== o.userData.url)) g.remove(o); });
    var have = {}; g.children.forEach(function (o) { if (o.userData.uid) have[o.userData.uid] = o; });
    var jobs = (mods || []).map(function (m) {
      if (have[m.uid]) { var hw = have[m.uid]; cfgPose(hw, m); if (cfgHits(hw, hw.position.x, hw.position.z)) { var fp0 = cfgFree(hw, hw.position.x, hw.position.z); hw.position.x = fp0[0]; hw.position.z = fp0[1]; if (XW.onCfgMove) XW.onCfgMove(m.uid, +fp0[0].toFixed(3), +fp0[1].toFixed(3), true); } return Promise.resolve(); }
      return cfgPiece(m).then(function (wr) {
        if (my !== req || CFG.g !== g) return;
        cfgPose(wr, m); g.add(wr);
        if (m.auto || cfgHits(wr, wr.position.x, wr.position.z)) { var p = cfgFree(wr, wr.position.x, wr.position.z); wr.position.x = p[0]; wr.position.z = p[1]; if (XW.onCfgMove) XW.onCfgMove(m.uid, +p[0].toFixed(3), +p[1].toFixed(3), true); }
      }, function () {});
    });
    return Promise.all(jobs).then(function () {
      if (my !== req || CFG.g !== g) return;
      cfgTint(); cfgMark();
      var b = cfgBounds(), c = b.box.isEmpty() ? new T.Vector3() : b.box.getCenter(new T.Vector3());
      g.userData.bounds = { w: b.w, h: b.h, d: b.d };
      if (first) { g.position.set(-c.x, 0, -c.z); g.visible = false; scene.add(g); present('cubixcfg', g); return; }
      if (reframe) { tw(g.position, { x: -c.x, z: -c.z, duration: .6, ease: 'power2.inOut' }); setPlinth(g.userData.bounds, true, .8); frameItem(g.userData.bounds, 1); }
    });
  };
  XW.cfgSelect = function (uid) { CFG.sel = uid || null; if (CFG.g) cfgMark(); };
  // posisi layar tiap modul (label di atas panggung, uji otomatis)
  XW.cfgInfo = function () {
    if (!CFG.g || st.kind !== 'cubixcfg') return [];
    return CFG.g.children.filter(function (o) { return o.userData.uid; }).map(function (o) {
      var v = new T.Vector3(); o.getWorldPosition(v); v.y = LIFT + .3; v.project(camera);
      var f = cfgFoot(o); return { uid: o.userData.uid, sx: (v.x + 1) / 2 * W, sy: (1 - v.y) / 2 * H, x: o.position.x, z: o.position.z, w: f.w, d: f.d };
    });
  };
  XW.cfgShot = function (px) { return XW.snapshot ? XW.snapshot(px || 220) : ''; };
  function cfgAt(x, y) {
    if (st.kind !== 'cubixcfg' || !CFG.g) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(CFG.g, true);
    for (var i = 0; i < hits.length; i++) { if (hits[i].object.userData.noPick || hits[i].object.userData.blob) continue; for (var o = hits[i].object; o; o = o.parent) if (o.userData.uid) return o; }
    return null;
  }
  XW.showCustom = function (cfg) {
    if (!window.XMAKER) { if (window.XNeedMaker) window.XNeedMaker().then(function () { if (window.XMAKER) XW.showCustom(cfg); }); return; }
    if (st.kind === 'custom' && item && item.userData.custom) {
      req++;
      var big = buildCustom(item, cfg);
      setPlinth(item.userData.bounds, true, .6);
      if (big) frameItem(item.userData.bounds, .9);
      return;
    }
    var my = ++req, g = new T.Group(), spin = new T.Group();
    g.add(spin);
    var blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: O.blobTex, transparent: true, depthWrite: false, opacity: .4 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.userData.noPick = blob.userData.blob = true; g.add(blob);
    g.userData = { spin: spin, custom: true, blob: blob };
    g.userData.dispose = function () { scene.remove(g); if (g.userData.built) g.userData.built.dispose(); blob.geometry.dispose(); blob.material.dispose(); };
    buildCustom(g, cfg);
    if (my !== req) return;
    g.visible = false; scene.add(g);
    present('custom', g);
  };
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
  /* ---------------------------------------------------------------- pencahayaan manual (Pengaturan › Pencahayaan › Manual)
     cfg = { ambient 0–2, lights: [{ type: spot|soft|point|sun, on, int 0–4, k 2200–7000 (Kelvin), az 0–360°, el 0–89°, dist m, shadow }] }
     Lampu preset (key/fill/rim) dimatikan; ambient mengatur cahaya langit & pantulan lingkungan. */
  var MAN = { on: false, objs: [], marks: null, showMarks: false };
  function kelvin(k) {
    var t = k / 100, r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
    else { r = 329.7 * Math.pow(t - 60, -.1332); g = 288.12 * Math.pow(t - 60, -.0755); b = 255; }
    var c = function (v) { return Math.max(0, Math.min(255, v)) / 255; };
    return new T.Color().setRGB(c(r), c(g), c(b)).convertSRGBToLinear();
  }
  function lightPos(l) {
    var a = l.az * Math.PI / 180, e = l.el * Math.PI / 180;
    return new T.Vector3(Math.sin(a) * Math.cos(e) * l.dist, Math.sin(e) * l.dist + .3, Math.cos(a) * Math.cos(e) * l.dist);
  }
  function clearManual() {
    MAN.objs.forEach(function (o) { scene.remove(o); if (o.target) scene.remove(o.target); if (o.shadow && o.shadow.map) o.shadow.map.dispose(); if (o.dispose) o.dispose(); });
    MAN.objs = [];
    if (MAN.marks) { scene.remove(MAN.marks); MAN.marks = null; }
  }
  var lightSig = function (cfg) { return cfg && cfg.lights ? JSON.stringify(cfg.lights.map(function (l) { return [l.type, !!l.on, !!l.shadow]; })) : ''; };
  XW.setLighting = function (cfg) {
    if (MAN.on && cfg && cfg.lights && lightSig(cfg) === MAN.sig) {
      var amb0 = cfg.ambient == null ? 1 : +cfg.ambient, j = 0;
      mood.hemi = .22 * amb0; mood.env = .42 * amb0;
      cfg.lights.forEach(function (l) { if (!l.on) return; var o = MAN.objs[j], mk = MAN.marks && MAN.marks.children[j * 2], ln = MAN.marks && MAN.marks.children[j * 2 + 1], p = lightPos(l), c = kelvin(l.k || 4000); j++; if (!o) return;
        o.position.copy(p); o.color.copy(c); o.intensity = +l.int * (l.type === 'point' ? 1.6 : l.type === 'soft' ? 1.3 : 1);
        if (mk) { mk.position.copy(p); mk.material.color.copy(c.clone().convertLinearToSRGB()); }
        if (ln) { ln.geometry.setFromPoints([p, new T.Vector3(0, .35, 0)]); } });
      return;
    }
    clearManual(); MAN.sig = lightSig(cfg);
    MAN.on = !!(cfg && cfg.lights);
    L.rim.intensity = MAN.on ? 0 : .3;
    if (!MAN.on) { setMood(moodName); return; }
    var amb = cfg.ambient == null ? 1 : +cfg.ambient, shadows = 0;
    tw(mood, { key: 0, fill: 0, hemi: .22 * amb, env: .42 * amb, exp: 1, halo: .7, duration: .8, ease: 'power2.inOut' });
    MAN.marks = new T.Group(); MAN.marks.visible = MAN.showMarks; scene.add(MAN.marks);
    (cfg.lights || []).forEach(function (l) {
      if (!l.on) return;
      var c = kelvin(l.k || 4000), p = lightPos(l), o, I = +l.int;
      if (l.type === 'sun') o = new T.DirectionalLight(c, I);
      else if (l.type === 'point') o = new T.PointLight(c, I * 1.6, 0, 1);
      else o = new T.SpotLight(c, I * (l.type === 'soft' ? 1.3 : 1), 0, l.type === 'soft' ? 1.05 : .55, l.type === 'soft' ? 1 : .75, 1);
      o.position.copy(p);
      if (o.target) { o.target.position.set(0, .35, 0); scene.add(o.target); }
      if (l.shadow && shadows < 2 && o.shadow && XW.quality > 0) {
        shadows++; o.castShadow = true; o.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
        o.shadow.bias = -.0004; o.shadow.normalBias = .02;
        if (o.shadow.camera.isOrthographicCamera) { var s = 4; o.shadow.camera.left = -s; o.shadow.camera.right = s; o.shadow.camera.top = s; o.shadow.camera.bottom = -s; }
        o.shadow.camera.near = .5; o.shadow.camera.far = 20; o.shadow.radius = l.type === 'soft' ? 8 : 3;
      }
      scene.add(o); MAN.objs.push(o);
      // penanda posisi lampu (terlihat saat Pengaturan terbuka)
      var mk = new T.Mesh(new T.SphereGeometry(.07, 16, 12), new T.MeshBasicMaterial({ color: c.clone().convertLinearToSRGB(), toneMapped: false }));
      mk.position.copy(p); mk.userData.noPick = true; MAN.marks.add(mk);
      var ln = new T.Line(new T.BufferGeometry().setFromPoints([p, new T.Vector3(0, .35, 0)]), new T.LineBasicMaterial({ color: col('#c4a674'), transparent: true, opacity: .35 }));
      MAN.marks.add(ln);
    });
  };
  XW.lightMarkers = function (on) { MAN.showMarks = !!on; if (MAN.marks) MAN.marks.visible = MAN.showMarks; };
  XW.setMood = function (n) { if (MAN.on) XW.setLighting(null); setMood(n); };
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
  // kualitas manual (mis. dari pengujian / pengaturan); lock = jangan turun otomatis
  XW.setLook = function (o) { o = o || {}; ['hdr', 'contact', 'ao'].forEach(function (k) { if (o[k] != null) LOOK[k] = !!o[k]; }); setEnv(moodName); setQuality(XW.quality); return Object.assign({}, LOOK); };
  XW.look = function () { return Object.assign({}, LOOK); };
  XW.setQuality = function (q, lock) { XW.qLock = !!lock; setQuality(q); };
  XW.info = function () { return { q: XW.quality, post: PP.on, ao: +PP.mix.toFixed(2), contact: CS.on, pr: renderer.getPixelRatio(), dtAvg: +dtAvg.toFixed(1), env: scene.environment && scene.environment.isTexture && envC[(MOODS[moodName] || {}).hdr + (MOODS[moodName] || {}).tint] === scene.environment ? moodName : 'room-env', calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; };
  // ukur biaya GPU per frame (ms): n frame digambar beruntun lalu dipaksa selesai (readPixels)
  XW.bench = function (n) {
    n = n || 40; var gl = renderer.getContext(), px = new Uint8Array(4);
    draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    var t0 = performance.now();
    for (var i = 0; i < n; i++) { updateContact(); draw(); }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return +((performance.now() - t0) / n).toFixed(2);
  };
  XW.state = st;
})();
