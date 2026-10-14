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
  var st = { room: 'home', kind: 'cubix', drag: false, spin: 0, spinV: 0, lastDrag: -1e9, map: 0, mapT: 0, zoom: 1, zoomC: 1, off: false, orbitMoved: false, recenter: false, cam: false, camYaw: 0, camPitch: 0, camYawT: 0, camPitchT: 0 };
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
    if (prev !== obj) { st.zoom = 1; st.recenter = false; }
    if (prev && prev !== obj && prev !== O.map) sink(prev, function () { if (prev.userData.dispose) prev.userData.dispose(); });
    if (obj === O.map) { O.map.position.y = 0; O.map.visible = true; }
    else if (prev !== obj) rise(obj, prev && prev !== O.map ? .45 : .1);
    setPlinth(obj.userData.bounds, kind !== 'map');
    // ruang (beberapa furnitur): tanpa podium, sorot utama lebih lebar
    O.plinth.visible = kind !== 'room' && bgName !== 'studio';
    L.key.angle = kind === 'room' ? 1.05 : .5;
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
    var roles = obj.userData.mats.some(function (mt) { return mt.userData.role; });
    obj.userData.mats.forEach(function (mt) {
      if (roles ? mt.userData.role !== 'fabric' : (mt.metalness > .5 || !mt.map && !mt.userData.map0)) return;   // model SKP: hanya kain (extras role); lainnya: logam tidak diwarnai
      if (!mt.map && !mt.userData.map0) { if (!mt.userData.col0) mt.userData.col0 = mt.color.clone(); if (!hexStr) { mt.color.copy(mt.userData.col0); return; } var cc = col(hexStr); tw(mt.color, { r: cc.r, g: cc.g, b: cc.b, duration: dur == null ? .8 : dur, ease: 'power2.inOut' }); return; }
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
    if (CS.plane) tw(CS.plane.material, { opacity: name === 'light' ? .72 : 1, duration: d });
    var old = O.wall.material.map; O.wall.material.map = canvasTex(16, 512, backdrop); O.wall.material.needsUpdate = true; if (old) old.dispose();
    horizonColor(d); gridLook(d);
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
    if (portrait) { kw = st.kind === 'art' ? 1.15 : st.kind === 'model' || st.kind === 'cubix' || st.kind === 'custom' ? 1.5 : 1.3; kh = st.kind === 'art' ? 1.3 : 1.9; }
    var needH = b.h * kh + .3, needW = (b.w * kw + .2) * (H / W);
    var span = Math.max(needH * H / fh, needW * W / fw);
    var dist = span / vf;
    var turn = st.kind === 'cubix' || st.kind === 'model' || st.kind === 'custom';   // objek 3D sungguhan: tampak 3/4
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
    var three = /^(cubix|custom|model)$/.test(st.kind), on = CS.on && item && item.visible && three && item.position.y > -.45;
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
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || XW.paused) { last = now; return; }
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; frame++; clock += dt;
    dtAvg = lerp(dtAvg, dt * 1000, .05);
    // turun kualitas otomatis bila lambat: pasca-proses (AO) dilepas lebih dulu (< ±42 fps), lalu resolusi & bayangan (< 31 fps)
    if (frame > 150 && XW.quality > 0 && !XW.qLock && dtAvg > (PP.on ? 24 : 32)) { slow += dt; if (slow > 2.5) { setQuality(XW.quality - 1); slow = 0; } } else slow = 0;
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
      camera.position.set(view.tx + Math.sin(yaw) * Math.cos(pitch) * dist, view.ty + Math.sin(pitch) * dist, view.tz + Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(view.tx, view.ty, view.tz);
    }
    var off = Math.abs(st.zoom - 1) > .02 || Math.abs(st.spin) > .03 || st.orbitMoved || Math.abs(st.camYawT) > .03 || Math.abs(st.camPitchT) > .02;
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
    var three = /^(cubix|custom|model)$/.test(st.kind);
    PP.mix = lerp(PP.mix, LOOK.ao && three && item && Math.abs(item.position.y) < .05 ? 1 : 0, k * 1.2);
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
    var b = st.kind === 'cubix' ? cubixBounds() : /^(custom|model)$/.test(st.kind) && item && item.userData.bounds;
    return b ? { kind: st.kind, w: Math.round(b.w * 100), d: Math.round((st.kind === 'cubix' ? D : b.d) * 100), h: Math.round(b.h * 100) } : null;
  };
  function dimSegs() {
    var tgt, floor, b;
    if (st.kind === 'cubix') { if (Math.abs(O.cubix.position.y) > .01) return null; tgt = sofa; floor = 0; b = { w: cubixBounds().w, h: HH, d: D }; }
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
    XW.quality = 2;
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
      dx0 = e.clientX; dy0 = e.clientY; st.recenter = false;
      var rw = roomAt(e.clientX, e.clientY);
      if (rw) { var fp = floorAt(e.clientX, e.clientY); ROOM.drag = { w: rw, ox: fp ? rw.position.x - fp.x : 0, oz: fp ? rw.position.z - fp.z : 0 }; return; }
      if (item && item.userData.spin && hit(e.clientX, e.clientY)) { st.drag = true; st.spinV = 0; }
      else st.cam = true;
    });
    window.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (pinch && Object.keys(ptrs).length >= 2) { setZoom(pinch.z * pinch.d / gap()); return; }
      if (st.drag) { var dx = e.clientX - dx0; dx0 = e.clientX; st.spin += dx * .006; st.spinV = dx * .35; st.lastDrag = performance.now(); return; }
      if (ROOM.drag) { var fp2 = floorAt(e.clientX, e.clientY); if (fp2) { ROOM.drag.w.position.x = clamp(fp2.x + ROOM.drag.ox, -6, 6); ROOM.drag.w.position.z = clamp(fp2.z + ROOM.drag.oz, -3, 3); } return; }
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
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (st.drag) { st.drag = false; st.lastDrag = performance.now(); }
      if (ROOM.drag) { var dw = ROOM.drag.w; ROOM.drag = null; if (XW.onRoomMove) XW.onRoomMove(dw.userData.rid, +dw.position.x.toFixed(3), +dw.position.z.toFixed(3)); }
      if (st.cam) { st.cam = false; st.lastDrag = performance.now(); }
      if (down && e.type === 'pointerup' && e.target === canvas && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 550) {
        var mo = motionAt(e.clientX, e.clientY);
        if (mo) { toggleMotion(mo); if (XW.onMotion) XW.onMotion(mo); }
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
  XW.preloadModel = function (url) { getModel(url).catch(function () {}); };
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
    st.zoom = 1; st.spinV = 0; st.recenter = true; st.orbitMoved = false; st.camYawT = 0; st.camPitchT = 0;
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
    if (!item || !item.userData.custom || !item.visible || !camera) return null;
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
  /* ---------------------------------------------------------------- RUANG: beberapa furnitur sekaligus di panggung
     entries = [{ rid, kind: custom|model|photo, cfg | url + p | photo + p, x, z, ry }]
     Geser furnitur di lantai untuk memindahkan (XW.onRoomMove(rid, x, z)). */
  var ROOM = { g: null, drag: null, my: 0 };
  function roomPiece(e) {
    if (e.kind === 'custom' && window.XMAKER) {
      if (!customKit) customKit = { T: T, rbox: rbox, col: col };
      var b = window.XMAKER.build(e.cfg, customKit);
      (b.motions || []).forEach(function (m) { m.apply(0); });
      var bx = new T.Box3().setFromObject(b.group), c = bx.getCenter(new T.Vector3());
      b.group.position.set(-c.x, LIFT - bx.min.y, -c.z);
      var g0 = new T.Group(); g0.add(b.group); g0.userData.dispose = b.dispose;
      return Promise.resolve(g0);
    }
    if (e.kind === 'model') return getModel(e.url).then(function (s) { return makeModel(s, e.p || {}); });
    if (e.kind === 'photo') return getCutout(e.url).then(function (r) { var wd = sizeFor(e.p || {}); return makeBillboard(r.tex, wd, wd / r.aspect); });
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
        wrap.add(p); wrap.position.set(e.x || 0, 0, e.z || 0); wrap.rotation.y = (e.ry || 0) * Math.PI / 180;
        wrap.userData.rid = e.rid; g.add(wrap);
      });
      g.updateMatrixWorld(true); box.setFromObject(g);
      // tata letak dipusatkan di panggung (kamera membingkai dari titik pusat)
      if (!box.isEmpty()) { var cc = box.getCenter(new T.Vector3()); g.position.set(-cc.x, 0, -cc.z); }
      var sz = box.isEmpty() ? new T.Vector3(1, 1, 1) : box.getSize(new T.Vector3());
      g.userData = { bounds: { w: Math.max(sz.x, 1), h: Math.max(sz.y, .5), d: Math.max(sz.z, 1) }, room: true };
      g.userData.dispose = function () { scene.remove(g); g.children.forEach(function (wr) { wr.traverse(function (o) { if (o.userData.dispose && o !== wr) o.userData.dispose(); }); }); };
      g.visible = false; scene.add(g); ROOM.g = g;
      present('room', g);
    });
  };
  XW.roomSet = function (rid, o) {
    if (!ROOM.g) return;
    ROOM.g.children.forEach(function (wr) { if (wr.userData.rid !== rid) return; if (o.ry != null) tw(wr.rotation, { y: o.ry * Math.PI / 180, duration: .6, ease: 'power2.inOut' }); if (o.x != null) wr.position.x = o.x; if (o.z != null) wr.position.z = o.z; });
  };
  function roomAt(x, y) {
    if (st.kind !== 'room' || !ROOM.g) return null;
    ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObject(ROOM.g, true);
    for (var i = 0; i < hits.length; i++) { if (hits[i].object.userData.noPick) continue; for (var o = hits[i].object; o; o = o.parent) if (o.userData.rid) return o; }
    return null;
  }
  var floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function floorAt(x, y) { ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); var p = new T.Vector3(); return ray.ray.intersectPlane(floorPlane, p) ? p : null; }
  XW.showCustom = function (cfg) {
    if (!window.XMAKER) return;
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
