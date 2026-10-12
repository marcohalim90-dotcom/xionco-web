/* ==========================================================================
   XIONCO v3 — World (Three.js r147 + UnrealBloom)
   Satu dunia 3D untuk semua layar: lantai grid neon, pedestal hologram,
   sofa modular CUBIX (prosedural), partikel, portal, dan peta titik Jawa.
   Setiap layar = posisi kamera + keadaan dunia.
   API: window.XW (lihat bagian bawah file).
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE, G = window.gsap, XV = window.XV;
  var XW = window.XW = { ok: false, labels: {}, quality: 2 };
  if (!T || !T.EffectComposer) return;

  var col = function (h) { return new T.Color(h).convertSRGBToLinear(); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var tween = function (target, vars) {
    if (G && !XW.reduced) return G.to(target, vars);
    for (var k in vars) if (k in target) target[k] = vars[k];
    if (vars.onUpdate) vars.onUpdate();
    if (vars.onComplete) vars.onComplete();
    return null;
  };

  var canvas, renderer, scene, camera, composer, bloom, controls;
  var W = 1, H = 1, MOBILE = false;
  var clockT = 0, last = 0, frame = 0, dtAvg = 16, slowFor = 0;
  var ACCENTS = { amber: '#ffb648', cyan: '#3ee8ff', magenta: '#ff4fa8', violet: '#9b7bff', lime: '#b8ff5c' };
  var accent = col(ACCENTS.amber), accentT = col(ACCENTS.amber), accent2 = col(ACCENTS.cyan);
  var st = {
    screen: 'title', sofa: 1, sofaT: 1, map: 0, mapT: 0, explode: 0, explodeT: 0,
    spin: 0, spinVel: 0, drag: false, scroll: 1, scrollT: 1, glow: 1, routeP: 0
  };
  var rig = { px: 0, py: 2.05, pz: 9.4, tx: 0, ty: 1.05, tz: 0, fov: 36 };
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  var mats = {}, objs = {};

  /* ---------------------------------------------------------------- utils */
  function glowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.75)');
    gr.addColorStop(.45, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var t = new T.CanvasTexture(c); return t;
  }
  function edges(w, h, d, mat) { return new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, h, d)), mat); }
  function rbox(w, h, d, r, seg) { return T.RoundedBoxGeometry ? new T.RoundedBoxGeometry(w, h, d, seg || 3, r) : new T.BoxGeometry(w, h, d); }

  /* ---------------------------------------------------------------- floor */
  function buildFloor() {
    mats.floor = new T.ShaderMaterial({
      uniforms: { uA: { value: accent.clone() }, uB: { value: accent2.clone() }, uTime: { value: 0 }, uScroll: { value: 1 }, uGlow: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform vec3 uA; uniform vec3 uB; uniform float uTime; uniform float uScroll; uniform float uGlow;',
        'varying vec3 vW;',
        'float grid(vec2 p, float s, float w){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y) / w, 1.0); }',
        'void main(){',
        '  vec2 p = vW.xz; p.y += uTime * uScroll;',
        '  float d = length(vW.xz);',
        '  float fade = exp(-d * 0.06);',
        '  vec3 c = uB * grid(p, 1.0, 1.0) * 0.16 + uA * grid(p, 5.0, 1.3) * 0.62;',
        '  c *= fade;',
        '  c += uA * uGlow * 0.11 * exp(-d * 0.35);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      extensions: { derivatives: true }
    });
    var floor = new T.Mesh(new T.PlaneGeometry(320, 320), mats.floor);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
  }

  /* ---------------------------------------------------------------- pedestal */
  function buildPedestal() {
    var g = new T.Group();
    var disc = new T.Mesh(new T.CylinderGeometry(2.55, 2.7, .16, 96), new T.MeshStandardMaterial({ color: col('#100d1a'), metalness: .75, roughness: .34 }));
    disc.position.y = .08; g.add(disc);
    mats.rim = new T.MeshBasicMaterial({ color: accent.clone() });
    var rim = new T.Mesh(new T.TorusGeometry(2.56, .016, 8, 220), mats.rim);
    rim.rotation.x = Math.PI / 2; rim.position.y = .162; g.add(rim);
    mats.rim2 = new T.MeshBasicMaterial({ color: accent2.clone(), transparent: true, opacity: .8 });
    var rim2 = new T.Mesh(new T.TorusGeometry(2.72, .01, 6, 220), mats.rim2);
    rim2.rotation.x = Math.PI / 2; rim2.position.y = .012; g.add(rim2);
    // cincin putus-putus yang berputar
    var segs = new T.Group(), n = 18;
    mats.seg = new T.MeshBasicMaterial({ color: accent2.clone(), transparent: true, opacity: .9 });
    for (var i = 0; i < n; i++) {
      var a = new T.Mesh(new T.TorusGeometry(3.1, .011, 6, 18, Math.PI * 2 / n * .58), mats.seg);
      a.rotation.z = i * Math.PI * 2 / n; segs.add(a);
    }
    segs.rotation.x = Math.PI / 2; segs.position.y = .03;
    g.add(segs); objs.segs = segs;
    // genangan cahaya di lantai
    mats.pool = new T.MeshBasicMaterial({ map: XW.glowTex, color: accent.clone(), transparent: true, opacity: .42, blending: T.AdditiveBlending, depthWrite: false });
    var pool = new T.Mesh(new T.PlaneGeometry(10, 10), mats.pool);
    pool.rotation.x = -Math.PI / 2; pool.position.y = .006; g.add(pool);
    scene.add(g);
    objs.pedestal = g;
  }

  /* ---------------------------------------------------------------- sofa (CUBIX) */
  var S = (XV && XV.STUDIO) || { seatW: 72, armW: 16, depth: 86, height: 74, fabrics: [{ color: '#4a4846', type: 'fabric' }], bases: [{ id: 'oak', color: '#c8a678' }] };
  var SW = S.seatW / 100, AW = S.armW / 100, D = S.depth / 100, HH = S.height / 100, PL = .07;
  var sofa, slots = {}, cfg = { seats: 3, arms: true, ottoman: false, fabric: 'fb01', base: 'oak' };
  var BASES = {
    oak: { color: '#c8a678', metal: 0, rough: .62 }, walnut: { color: '#5a3d2b', metal: 0, rough: .55 },
    steel: { color: '#1d1c1b', metal: .85, rough: .32 }, brass: { color: '#b8924f', metal: 1, rough: .28 }
  };
  function part(group, geo, mat, x, y, z, w, h, d, outline) {
    var m = new T.Mesh(geo, mat); m.position.set(x, y, z); group.add(m);
    if (outline) { var e = edges(w * 1.004, h * 1.004, d * 1.004, mats.edge); e.position.set(x, y, z); group.add(e); m.userData.edge = e; }
    return m;
  }
  function makeSeat() {
    var g = new T.Group();
    part(g, new T.BoxGeometry(SW - .02, PL, D - .06), mats.base, 0, PL / 2, 0, SW - .02, PL, D - .06, true);
    part(g, rbox(SW, .2, D, .025, 2), mats.fabric, 0, PL + .1, 0, SW, .2, D, true);
    part(g, rbox(SW - .035, .13, D - .24, .045), mats.fabric, 0, PL + .2 + .065, .1, SW - .035, .13, D - .24, true);
    part(g, rbox(SW, .5, .1, .025, 2), mats.fabric, 0, HH - .25, -D / 2 + .05, SW, .5, .1, true);
    var back = part(g, rbox(SW - .04, .34, .18, .05), mats.fabric, 0, HH - .2, -D / 2 + .17, SW - .04, .34, .18, true);
    back.rotation.x = -.1; back.userData.edge.rotation.x = -.1;
    return g;
  }
  function makeArm() {
    var g = new T.Group();
    part(g, new T.BoxGeometry(AW - .02, PL, D - .06), mats.base, 0, PL / 2, 0, AW - .02, PL, D - .06, true);
    part(g, rbox(AW, .58, D, .03), mats.fabric, 0, PL + .29, 0, AW, .58, D, true);
    return g;
  }
  function makeOttoman() {
    var g = new T.Group();
    part(g, new T.BoxGeometry(SW - .02, PL, SW - .02), mats.base, 0, PL / 2, 0, SW - .02, PL, SW - .02, true);
    part(g, rbox(SW, .34, SW, .05), mats.fabric, 0, PL + .17, 0, SW, .34, SW, true);
    return g;
  }
  function slotTargets(c) {
    var t = {}, total = c.seats * SW + (c.arms ? 2 * AW : 0), x = -total / 2;
    if (c.arms) { t.armL = { x: x + AW / 2, z: 0, i: -1 }; x += AW; }
    for (var i = 0; i < c.seats; i++) { t['seat' + i] = { x: x + SW / 2, z: 0, i: i }; x += SW; }
    if (c.arms) t.armR = { x: x + AW / 2, z: 0, i: c.seats };
    if (c.ottoman) t.ottoman = { x: total / 2 - (c.arms ? AW : 0) - SW / 2, z: D / 2 + .3 + SW / 2, i: 99 };
    return t;
  }
  function explodeOffset(key, tg, c) {
    var e = st.explode;
    if (!e) return [0, 0, 0];
    var mid = (c.seats - 1) / 2;
    if (key === 'armL') return [-(mid + 1.1) * .2 * e - .12 * e, .1 * e, 0];
    if (key === 'armR') return [(mid + 1.1) * .2 * e + .12 * e, .1 * e, 0];
    if (key === 'ottoman') return [0, .06 * e, .45 * e];
    return [(tg.i - mid) * .2 * e, .16 * e + Math.sin(clockT * 2 + tg.i) * .03 * e, 0];
  }
  function applyCfg(c, animate) {
    cfg = Object.assign({}, cfg, c);
    var targets = slotTargets(cfg);
    Object.keys(slots).forEach(function (k) {
      if (targets[k]) return;
      var o = slots[k]; delete slots[k];
      if (animate) tween(o.scale, { x: .001, y: .001, z: .001, duration: .45, ease: 'back.in(2)', onComplete: function () { sofa.remove(o); } });
      else sofa.remove(o);
    });
    var delay = 0;
    Object.keys(targets).forEach(function (k) {
      var tg = targets[k], o = slots[k];
      if (!o) {
        o = k === 'ottoman' ? makeOttoman() : k.indexOf('arm') === 0 ? makeArm() : makeSeat();
        o.userData.key = k; slots[k] = o; sofa.add(o);
        o.position.set(tg.x, animate ? 1.8 : 0, tg.z);
        if (animate) {
          o.scale.setScalar(.001);
          tween(o.scale, { x: 1, y: 1, z: 1, duration: .7, delay: delay, ease: 'back.out(1.6)' });
          tween(o.position, { y: 0, duration: .8, delay: delay, ease: 'bounce.out' });
          delay += .06;
          XW.sparks(tg.x, .3, tg.z);
        }
      }
      o.userData.tx = tg.x; o.userData.tz = tg.z; o.userData.tg = tg;
      if (!animate) { o.position.x = tg.x; o.position.z = tg.z; }
    });
    // material
    var f = (S.fabrics || []).filter(function (x) { return x.id === cfg.fabric; })[0] || S.fabrics[0];
    var b = BASES[cfg.base] || BASES.oak;
    var fc = col(f.color), bc = col(b.color);
    var setMat = function () {
      mats.fabric.roughness = f.type === 'leather' ? .42 : .86;
      mats.fabric.metalness = f.type === 'leather' ? .08 : 0;
      mats.base.metalness = b.metal; mats.base.roughness = b.rough;
    };
    if (animate) {
      tween(mats.fabric.color, { r: fc.r, g: fc.g, b: fc.b, duration: .8, ease: 'power2.inOut' });
      tween(mats.base.color, { r: bc.r, g: bc.g, b: bc.b, duration: .8, ease: 'power2.inOut' });
      setMat(); XW.scan();
    } else { mats.fabric.color.copy(fc); mats.base.color.copy(bc); setMat(); }
    var total = cfg.seats * S.seatW + (cfg.arms ? 2 * S.armW : 0);
    return { width: total, depth: S.depth, height: S.height };
  }
  function buildSofa() {
    mats.fabric = new T.MeshStandardMaterial({ color: col('#4a4846'), roughness: .86, metalness: 0 });
    mats.base = new T.MeshStandardMaterial({ color: col('#c8a678'), roughness: .62, metalness: 0 });
    mats.edge = new T.LineBasicMaterial({ color: accent.clone(), transparent: true, opacity: .95 });
    sofa = new T.Group();
    sofa.position.y = .165;
    scene.add(sofa);
    applyCfg(cfg, false);
    // pemindai (lembar laser horizontal)
    mats.scan = new T.MeshBasicMaterial({ map: XW.glowTex, color: accent2.clone(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    var scan = new T.Mesh(new T.PlaneGeometry(4.2, 2.6), mats.scan);
    scan.rotation.x = -Math.PI / 2; scan.position.y = .2;
    sofa.add(scan); objs.scan = scan;
  }

  /* ---------------------------------------------------------------- partikel & latar */
  function makeParticles(n, color, size) {
    var pos = new Float32Array(n * 3), spd = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var r = 1.6 + Math.random() * 12, a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = Math.sin(a) * r - 2;
      spd[i] = .08 + Math.random() * .32;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var m = new T.PointsMaterial({ map: XW.glowTex, color: color, size: size, transparent: true, opacity: .8, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });
    var p = new T.Points(geo, m); p.userData.spd = spd;
    scene.add(p);
    return p;
  }
  function buildBackdrop() {
    var g = new T.Group();
    mats.portal = new T.MeshBasicMaterial({ color: col('#b45cff') });
    var ring = new T.Mesh(new T.TorusGeometry(12, .05, 8, 300), mats.portal);
    g.add(ring);
    mats.portal2 = new T.MeshBasicMaterial({ color: accent2.clone(), transparent: true, opacity: .7 });
    var ring2 = new T.Mesh(new T.TorusGeometry(13.1, .018, 6, 300, Math.PI * 1.55), mats.portal2);
    g.add(ring2); objs.ring2 = ring2;
    var halo = new T.Sprite(new T.SpriteMaterial({ map: XW.glowTex, color: col('#6b3cff'), transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false }));
    halo.scale.set(38, 38, 1); g.add(halo);
    g.position.set(0, 5.6, -26);
    scene.add(g); objs.portal = g;
    // pilar neon di kejauhan
    var pg = new T.Group();
    for (var i = 0; i < 22; i++) {
      var a = Math.PI * (.08 + .84 * i / 21) + Math.PI, r = 20 + (i % 3) * 6;
      var h = 6 + ((i * 7) % 5) * 2.2;
      var m = new T.Mesh(new T.BoxGeometry(.07, h, .07), new T.MeshBasicMaterial({ color: col(i % 2 ? ACCENTS.cyan : ACCENTS.amber).multiplyScalar(.55) }));
      m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 4);
      pg.add(m);
    }
    scene.add(pg); objs.pillars = pg;
  }

  /* ---------------------------------------------------------------- peta Jawa */
  var MAP = { lon0: 109.8, lat0: -7.25, k: 3.0 };
  var mapXZ = function (lon, lat) { return [(lon - MAP.lon0) * MAP.k, (lat - MAP.lat0) * -MAP.k]; };
  function inside(x, y, poly) {
    var ins = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  var beacons = [], route, routeGeo, routeCount = 0, pulse, curve;
  function buildMap() {
    var g = new T.Group(); g.visible = false;
    var pts = [], step = .105;
    var JAVA = XV.JAVA || [], MADURA = XV.MADURA || [];
    for (var lat = -5.9; lat > -8.9; lat -= step) {
      for (var lon = 105; lon < 114.9; lon += step) {
        var off = (Math.round((lat + 5.9) / step) % 2) * step / 2, x = lon + off;
        if (inside(x, lat, JAVA) || inside(x, lat, MADURA)) { var p = mapXZ(x, lat); pts.push(p[0], .05, p[1]); }
      }
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    mats.dots = new T.PointsMaterial({ map: XW.glowTex, color: accent2.clone(), size: .2, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    g.add(new T.Points(geo, mats.dots));
    XW.mapDots = pts.length / 3;
    // suar pabrik
    var F = XV.FACTORIES || [];
    var center = mapXZ(106.777, -6.287);
    var spread = [[-.62, .34], [.12, -.52], [.62, .22]];
    mats.beam = new T.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0 });
    mats.cone = new T.MeshBasicMaterial({ map: null, color: accent.clone(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    F.forEach(function (f, i) {
      var p = i === 0 ? mapXZ(f.lon, f.lat) : [center[0] + spread[i - 1][0], center[1] + spread[i - 1][1]];
      var b = new T.Group(); b.position.set(p[0], 0, p[1]);
      var h = i === 0 ? 3 : 2.2;
      var pil = new T.Mesh(new T.CylinderGeometry(.03, .03, h, 8), mats.beam); pil.position.y = h / 2; b.add(pil);
      var cone = new T.Mesh(new T.ConeGeometry(.42, h, 32, 1, true), mats.cone); cone.position.y = h / 2; cone.rotation.x = Math.PI; b.add(cone);
      var ringM = new T.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0 });
      var ring = new T.Mesh(new T.TorusGeometry(.34, .014, 6, 64), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = .06; b.add(ring);
      var top = new T.Sprite(new T.SpriteMaterial({ map: XW.glowTex, color: accent.clone(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      top.scale.set(.9, .9, 1); top.position.y = h; b.add(top);
      b.userData = { ring: ring, top: top, h: h, i: i };
      g.add(b); beacons.push(b);
    });
    // rute Jepara → Jakarta
    var J = beacons[0].position, K = new T.Vector3(center[0], 0, center[1]);
    curve = new T.CatmullRomCurve3([
      new T.Vector3(J.x, .15, J.z), new T.Vector3(lerp(J.x, K.x, .3), 2.2, J.z - .9),
      new T.Vector3(lerp(J.x, K.x, .72), 2.3, K.z - .9), new T.Vector3(K.x, .15, K.z)
    ]);
    routeGeo = new T.TubeGeometry(curve, 180, .03, 6, false);
    routeCount = routeGeo.index.count;
    routeGeo.setDrawRange(0, 0);
    mats.route = new T.MeshBasicMaterial({ color: accent2.clone(), transparent: true, opacity: 0 });
    route = new T.Mesh(routeGeo, mats.route); g.add(route);
    pulse = new T.Sprite(new T.SpriteMaterial({ map: XW.glowTex, color: col('#d9fbff'), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    pulse.scale.set(.8, .8, 1); g.add(pulse);
    scene.add(g); objs.map = g;
  }

  /* ---------------------------------------------------------------- percikan */
  var sparks = [];
  XW.sparks = function (x, y, z) {
    if (!scene || XW.reduced) return;
    var n = 26, pos = new Float32Array(n * 3), vel = [];
    for (var i = 0; i < n; i++) {
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      vel.push([(Math.random() - .5) * 3, Math.random() * 3 + 1, (Math.random() - .5) * 3]);
    }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var p = new T.Points(geo, new T.PointsMaterial({ map: XW.glowTex, color: accent.clone(), size: .12, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending }));
    p.position.copy(sofa.position);
    p.userData = { vel: vel, life: 1 };
    scene.add(p); sparks.push(p);
  };
  XW.scan = function () {
    if (!objs.scan) return;
    objs.scan.position.y = -.05; mats.scan.opacity = .9;
    tween(objs.scan.position, { y: 1.05, duration: .9, ease: 'power2.inOut' });
    tween(mats.scan, { opacity: 0, duration: .5, delay: .55 });
  };

  /* ---------------------------------------------------------------- kamera per layar */
  var RIGS = {
    title:   { p: [0, 2.05, 9.6], t: [0, 1.2, 0], fov: 34 },
    hub:     { p: [-.5, 2.35, 9.2], t: [-.15, .7, 0], fov: 34 },
    koleksi: { p: [7.5, 4.6, 12.5], t: [2.5, 1.6, -3], fov: 36 },
    craft:   { p: [.35, 1.55, 4.9], t: [0, .42, .15], fov: 34 },
    peta:    { p: [-5.2, 15.5, 10.6], t: [-6.4, 0, -1.6], fov: 40 },
    guild:   { p: [-8, 2.8, 8.5], t: [2, 1.6, -4], fov: 36 },
    galeri:  { p: [0, 2.6, 12], t: [0, 4.4, -20], fov: 38 },
    kontak:  { p: [0, 1.5, 6.2], t: [0, .95, 0], fov: 34 }
  };
  var RIGS_PORTRAIT = {
    title:   { p: [0, 2.5, 12.5], t: [0, 1.6, 0], fov: 44 },
    hub:     { p: [0, 3.2, 11], t: [0, -1.7, 0], fov: 44 },
    craft:   { p: [0, 2.4, 8.2], t: [0, 0, .2], fov: 42 },
    peta:    { p: [-3.4, 26, 14], t: [-3.4, 0, -1.6], fov: 46 },
    kontak:  { p: [0, 2.2, 9], t: [0, 1.7, 0], fov: 44 }
  };
  var SCREEN_STATE = {
    title:   { sofa: 1, map: 0, scroll: 1, accent: 'amber' },
    hub:     { sofa: 1, map: 0, scroll: .25, accent: 'amber' },
    koleksi: { sofa: 1, map: 0, scroll: .2, accent: 'amber' },
    craft:   { sofa: 1, map: 0, scroll: 0, accent: null },
    peta:    { sofa: 0, map: 1, scroll: 0, accent: 'cyan' },
    guild:   { sofa: 1, map: 0, scroll: .15, accent: 'violet' },
    galeri:  { sofa: 0, map: 0, scroll: .35, accent: 'magenta' },
    kontak:  { sofa: 0, map: 0, scroll: .5, accent: 'amber' }
  };
  function rigFor(id) {
    var portrait = W / H < .9;
    return (portrait && RIGS_PORTRAIT[id]) || RIGS[id] || RIGS.hub;
  }
  var camTw = null;
  function moveCamera(id, dur) {
    var r = rigFor(id);
    if (camTw && camTw.kill) camTw.kill();
    var to = { px: r.p[0], py: r.p[1], pz: r.p[2], tx: r.t[0], ty: r.t[1], tz: r.t[2], fov: r.fov, duration: dur == null ? 1.7 : dur, ease: 'power3.inOut' };
    if (XW.reduced) to.duration = 0;
    if (!G || !to.duration) { Object.assign(rig, { px: r.p[0], py: r.p[1], pz: r.p[2], tx: r.t[0], ty: r.t[1], tz: r.t[2], fov: r.fov }); return; }
    camTw = G.to(rig, to);
  }

  /* ---------------------------------------------------------------- orbit (craft) */
  var orbit = false;
  function setOrbit(on) {
    if (!controls) return;
    if (on === orbit) return;
    orbit = on;
    controls.enabled = on;
    if (on) {
      controls.target.set(rig.tx, rig.ty, rig.tz);
      controls.update();
    } else {
      rig.px = camera.position.x; rig.py = camera.position.y; rig.pz = camera.position.z;
      rig.tx = controls.target.x; rig.ty = controls.target.y; rig.tz = controls.target.z;
    }
  }

  /* ---------------------------------------------------------------- loop */
  var vTmp = new T.Vector3();
  function project(v, out) {
    vTmp.copy(v).project(camera);
    out.x = (vTmp.x * .5 + .5) * W; out.y = (-vTmp.y * .5 + .5) * H; out.v = vTmp.z < 1 && vTmp.z > -1;
    return out;
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || XW.paused) { last = now; return; }
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    frame++;
    clockT += dt;
    // kualitas adaptif
    dtAvg = lerp(dtAvg, dt * 1000, .05);
    if (frame > 120 && dtAvg > 30 && XW.quality > 0) { slowFor += dt; if (slowFor > 2.5) { setQuality(XW.quality - 1); slowFor = 0; } } else slowFor = 0;
    // layar berat → 30fps cukup untuk latar
    if (st.lite && frame % 2) return;
    var k = 1 - Math.pow(.001, dt);       // faktor lerp tak tergantung fps
    mouse.sx = lerp(mouse.sx, mouse.x, k * .9); mouse.sy = lerp(mouse.sy, mouse.y, k * .9);
    accent.lerp(accentT, k * 1.4);
    st.sofa = lerp(st.sofa, st.sofaT, k * 1.2);
    st.map = lerp(st.map, st.mapT, k * 1.2);
    st.explode = lerp(st.explode, st.explodeT, k * 1.6);
    st.scroll = lerp(st.scroll, st.scrollT, k);

    [mats.edge, mats.rim, mats.pool, mats.beam, mats.cone].forEach(function (m) { if (m) m.color.copy(accent); });
    mats.floor.uniforms.uA.value.copy(accent);
    mats.floor.uniforms.uTime.value += dt * st.scroll;
    mats.floor.uniforms.uScroll.value = 1;
    mats.floor.uniforms.uGlow.value = .35 + st.sofa * .65;
    if (objs.ampP) objs.ampP.material.color.copy(accent);

    // sofa & pedestal
    var sv = st.sofa;
    sofa.visible = objs.pedestal.visible = sv > .01;
    var sc = .25 + .75 * sv;
    sofa.scale.setScalar(sc); objs.pedestal.scale.setScalar(sc);
    sofa.position.y = .165 * sc - (1 - sv) * .6;
    if (!st.drag) {
      st.spinVel = lerp(st.spinVel, 0, k * .6);
      var auto = (st.screen === 'title' || st.screen === 'hub' || st.screen === 'kontak') ? .16 : (st.screen === 'craft' ? 0 : .06);
      if (XW.reduced) auto = 0;
      st.spin += (auto + st.spinVel) * dt;
    }
    if (st.screen === 'craft' && !st.drag) st.spin = lerp(st.spin, Math.round(st.spin / (Math.PI * 2)) * Math.PI * 2, k * .8);
    sofa.rotation.y = st.spin;
    Object.keys(slots).forEach(function (key) {
      var o = slots[key], tg = o.userData.tg; if (!tg) return;
      var off = explodeOffset(key, tg, cfg);
      o.position.x = lerp(o.position.x, o.userData.tx + off[0], k * 2);
      o.position.z = lerp(o.position.z, o.userData.tz + off[2], k * 2);
      if (!G || !G.isTweening(o.position)) o.position.y = lerp(o.position.y, off[1], k * 2);
    });
    mats.edge.opacity = .75 + .25 * Math.sin(clockT * 3.2) * .5 + st.explode * .2;
    objs.segs.rotation.z += dt * .22;
    objs.ring2.rotation.z -= dt * .06;
    objs.portal.rotation.z = Math.sin(clockT * .1) * .05;

    // partikel
    [objs.ampP, objs.cyaP].forEach(function (p) {
      if (!p) return;
      var a = p.geometry.attributes.position.array, s = p.userData.spd;
      for (var i = 0; i < s.length; i++) { a[i * 3 + 1] += s[i] * dt; if (a[i * 3 + 1] > 7) a[i * 3 + 1] = 0; }
      p.geometry.attributes.position.needsUpdate = true;
    });
    for (var si = sparks.length - 1; si >= 0; si--) {
      var sp = sparks[si], sa = sp.geometry.attributes.position.array, sv2 = sp.userData.vel;
      sp.userData.life -= dt * 1.2;
      for (var j = 0; j < sv2.length; j++) { sv2[j][1] -= 6 * dt; sa[j * 3] += sv2[j][0] * dt; sa[j * 3 + 1] += sv2[j][1] * dt; sa[j * 3 + 2] += sv2[j][2] * dt; }
      sp.geometry.attributes.position.needsUpdate = true;
      sp.material.opacity = Math.max(0, sp.userData.life);
      sp.material.color.copy(accent);
      if (sp.userData.life <= 0) { scene.remove(sp); sp.geometry.dispose(); sp.material.dispose(); sparks.splice(si, 1); }
    }

    // peta
    var mv = st.map;
    objs.map.visible = mv > .01;
    if (objs.map.visible) {
      mats.dots.opacity = .85 * mv;
      objs.map.position.y = (mv - 1) * .8;
      mats.beam.opacity = mv; mats.cone.opacity = .1 * mv; mats.route.opacity = mv;
      beacons.forEach(function (b, i) {
        var u = b.userData, ph = (clockT * .8 + i * .3) % 1;
        u.ring.scale.setScalar(1 + ph * 2.2); u.ring.material.opacity = (1 - ph) * mv; u.ring.material.color.copy(accent);
        u.top.material.opacity = mv * (.75 + Math.sin(clockT * 4 + i) * .25); u.top.material.color.copy(accent);
        var on = XW.mapFocusI === i || (XW.mapFocusI > 0 && i > 0 && XW.mapFocusI == null);
        b.scale.y = lerp(b.scale.y, (XW.mapFocusI === i ? 1.35 : 1), k * 2);
      });
      st.routeP = lerp(st.routeP, mv > .9 ? 1 : 0, k * .9);
      routeGeo.setDrawRange(0, Math.floor(routeCount * st.routeP / 36) * 36);
      var pt = (clockT * .22) % 1;
      pulse.position.copy(curve.getPointAt(pt));
      pulse.material.opacity = mv * st.routeP;
    }

    // kamera
    if (orbit) {
      controls.update();
    } else {
      var px = st.screen === 'peta' ? .6 : .32, py = st.screen === 'peta' ? .3 : .18;
      camera.position.set(rig.px + mouse.sx * px, rig.py - mouse.sy * py, rig.pz);
      camera.lookAt(rig.tx, rig.ty, rig.tz);
    }
    if (Math.abs(camera.fov - rig.fov) > .01) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }

    // label HTML
    var L = XW.labels;
    if (mv > .5) {
      L.beacons = beacons.map(function (b) { var w = b.localToWorld(new T.Vector3(0, b.userData.h + .35, 0)); return project(w, {}); });
    } else L.beacons = null;
    if (st.screen === 'craft' && sv > .9) {
      var total = cfg.seats * SW + (cfg.arms ? 2 * AW : 0);
      var a = sofa.localToWorld(new T.Vector3(-total / 2, .02, D / 2 + .08)), b2 = sofa.localToWorld(new T.Vector3(total / 2, .02, D / 2 + .08));
      L.dim = { a: project(a, {}), b: project(b2, {}), w: cfg.seats * S.seatW + (cfg.arms ? 2 * S.armW : 0) };
    } else L.dim = null;
    if (XW.onFrame) XW.onFrame(L);

    if (XW.quality > 0) composer.render(); else renderer.render(scene, camera);
  }

  /* ---------------------------------------------------------------- kualitas */
  function setQuality(q) {
    XW.quality = q;
    var dpr = window.devicePixelRatio || 1;
    var pr = q >= 2 ? Math.min(dpr, MOBILE ? 1.25 : 1.5) : 1;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); }
    if (bloom) bloom.strength = MOBILE ? .95 : 1.12;
    if (XW.onQuality) XW.onQuality(q);
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    setQuality(XW.quality);
    moveCamera(st.screen, 0);
  }

  /* ---------------------------------------------------------------- init */
  XW.init = function (cv, opts) {
    opts = opts || {};
    canvas = cv; MOBILE = !!opts.mobile; XW.reduced = !!opts.reduced;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    if (!renderer || !renderer.getContext()) return false;
    XW.gl = renderer.capabilities.isWebGL2 ? 'WEBGL2' : 'WEBGL';
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x07060c, 1);
    scene = new T.Scene();
    scene.background = col('#07060c');
    scene.fog = new T.FogExp2(0x07060c, .028);
    camera = new T.PerspectiveCamera(34, 1, .1, 260);
    XW.glowTex = glowTexture();

    scene.add(new T.HemisphereLight(col('#8f7fd0'), col('#0b0812'), .55));
    var key = new T.DirectionalLight(col('#ffd7a3'), 1.25); key.position.set(3, 6, 4); scene.add(key);
    var rim = new T.PointLight(col(ACCENTS.cyan), 2.6, 14, 2); rim.position.set(-2.4, 2.6, -2.8); scene.add(rim);
    var fill = new T.PointLight(col(ACCENTS.amber), 2.2, 8, 2); fill.position.set(1.5, .7, 3); scene.add(fill);
    objs.fill = fill;

    buildFloor(); buildPedestal(); buildSofa(); buildBackdrop(); buildMap();
    objs.ampP = makeParticles(MOBILE ? 160 : 380, accent.clone(), .07);
    objs.cyaP = makeParticles(MOBILE ? 100 : 240, accent2.clone(), .05);

    composer = new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, camera));
    bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 1.12, .62, .16);
    composer.addPass(bloom);

    if (T.OrbitControls) {
      controls = new T.OrbitControls(camera, canvas);
      controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .08;
      controls.enablePan = false; controls.minDistance = 2.6; controls.maxDistance = 9;
      controls.minPolarAngle = .35; controls.maxPolarAngle = 1.48; controls.rotateSpeed = .7;
    }

    XW.quality = MOBILE ? 1 : 2;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1; }, { passive: true });
    // seret untuk memutar sofa (judul, hub, kontak)
    var dragX = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (orbit || st.sofaT < .5) return;
      st.drag = true; dragX = e.clientX; st.spinVel = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!st.drag) return;
      var dx = e.clientX - dragX; dragX = e.clientX;
      st.spin += dx * .008; st.spinVel = dx * .5;
    });
    window.addEventListener('pointerup', function () { st.drag = false; });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); XW.ok = false; if (XW.onLost) XW.onLost(); });

    requestAnimationFrame(loop);
    XW.ok = true;
    return true;
  };

  /* ---------------------------------------------------------------- API */
  XW.setScreen = function (id, dur) {
    if (!XW.ok) return;
    st.screen = id;
    var s = SCREEN_STATE[id] || SCREEN_STATE.hub;
    st.sofaT = s.sofa; st.mapT = s.map; st.scrollT = s.scroll;
    st.explodeT = 0;
    st.lite = id === 'koleksi' || id === 'guild';
    if (s.accent) XW.setAccent(s.accent);
    if (id !== 'peta') XW.mapFocusI = null;
    setOrbit(false);
    moveCamera(id, dur);
    if (id === 'craft') G ? G.delayedCall(XW.reduced ? 0 : 1.75, function () { if (st.screen === 'craft') setOrbit(true); }) : setOrbit(true);
  };
  XW.preview = function (id) {
    if (!XW.ok || st.screen !== 'hub') return;
    var map = { koleksi: 'amber', craft: 'cyan', peta: 'cyan', guild: 'violet', galeri: 'magenta', kontak: 'lime' };
    XW.setAccent(map[id] || 'amber');
    st.explodeT = id === 'craft' ? 1 : 0;
    st.mapT = id === 'peta' ? .45 : 0;
    st.sofaT = id === 'peta' ? .55 : 1;
  };
  XW.setAccent = function (name) { accentT.copy(col(ACCENTS[name] || name || ACCENTS.amber)); };
  XW.craft = function (c, animate) { return applyCfg(c, animate !== false); };
  XW.mapFocus = function (i) {
    XW.mapFocusI = i;
    if (!XW.ok || st.screen !== 'peta') return;
    var b = beacons[i]; if (!b) return;
    var portrait = W / H < .9, base = rigFor('peta');
    var tx = i === 0 ? b.position.x - 2.2 : b.position.x - 1.4, tz = b.position.z;
    var to = { px: tx + (portrait ? 0 : 1.2), py: portrait ? 18 : 9.5, pz: tz + (portrait ? 11 : 8.5), tx: tx, ty: 0, tz: tz - .4, fov: base.fov, duration: XW.reduced ? 0 : 1.5, ease: 'power3.inOut' };
    if (camTw && camTw.kill) camTw.kill();
    if (G && to.duration) camTw = G.to(rig, to); else Object.assign(rig, to);
  };
  XW.mapOverview = function () { if (st.screen === 'peta') moveCamera('peta'); XW.mapFocusI = null; };
  XW.pause = function (v) { XW.paused = !!v; };
  XW.state = st;
})();
