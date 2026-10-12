/* ==========================================================================
   Maison XIONCO — Panggung 3D (Three.js r147)
   Satu panggung di tengah layar. Yang berdiri di atasnya bisa berganti:
   • cubix   — sofa modular CUBIX prosedural (bisa dirancang di Atelier)
   • product — foto produk xionco.com yang latarnya dihapus di browser (CORS
               diizinkan oleh xionco.com) lalu berdiri sebagai objek di panggung
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
  var st = { room: 'home', kind: 'cubix', drag: false, spin: 0, spinV: 0, lastDrag: -1e9, map: 0, mapT: 0 };
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
  function backdrop(g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b0907'); gr.addColorStop(.55, '#1a1511'); gr.addColorStop(1, '#14100d');
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
    var wall = new T.Mesh(new T.CylinderGeometry(15, 15, 14, 128, 1, true), new T.MeshBasicMaterial({ map: canvasTex(16, 512, backdrop), side: T.BackSide, toneMapped: false }));
    wall.position.y = 7; scene.add(wall);
    // cahaya hangat lembut di belakang panggung
    O.halo = new T.Mesh(new T.PlaneGeometry(14, 9), new T.MeshBasicMaterial({ map: radial([[0, 'rgba(201,160,108,.34)'], [.45, 'rgba(150,110,70,.1)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, toneMapped: false }));
    O.halo.position.set(0, 2.6, -9.5); scene.add(O.halo);
    // panggung bundar rendah + garis champagne
    O.plinth = new T.Group();
    var disc = shadowed(new T.Mesh(new T.CylinderGeometry(1, 1.02, .06, 128), new T.MeshStandardMaterial({ color: col('#1c1814'), roughness: .5, metalness: .1, envMapIntensity: .3 })));
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
    applyCfg(cfg, false);
  }

  /* ---------------------------------------------------------------- produk: hapus latar foto */
  var cutCache = {}, rawCache = {};
  function loadImage(url) {
    return new Promise(function (res, rej) {
      var im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = rej; im.src = url;
    });
  }
  function dist2(d, i, r, g, b) { var dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b; return dr * dr + dg * dg + db * db; }
  function cutout(im) {
    var s = Math.min(768, im.naturalWidth || 768), h = Math.round(s * (im.naturalHeight || s) / (im.naturalWidth || s));
    var c = document.createElement('canvas'); c.width = s; c.height = h;
    var g = c.getContext('2d'); g.drawImage(im, 0, 0, s, h);
    var id; try { id = g.getImageData(0, 0, s, h); } catch (e) { return { canvas: c, aspect: s / h }; }
    var d = id.data, n = s * h, i, x, y;
    // warna latar: rata-rata piksel tepi
    var br = 0, bgc = 0, bb = 0, ba = 0, cnt = 0;
    var acc = function (p) { var k = p * 4; br += d[k]; bgc += d[k + 1]; bb += d[k + 2]; ba += d[k + 3]; cnt++; };
    for (x = 0; x < s; x += 4) { acc(x); acc((h - 1) * s + x); }
    for (y = 0; y < h; y += 4) { acc(y * s); acc(y * s + s - 1); }
    br /= cnt; bgc /= cnt; bb /= cnt; ba /= cnt;
    if (ba > 200) {
      var dark = (br + bgc + bb) / 3 < 80;
      var tolG = dark ? 95 : 42, tolS = dark ? 14 : 20, tG = tolG * tolG, tS = tolS * tolS;
      var seen = new Uint8Array(n), q = new Int32Array(n), head = 0, tail = 0;
      var seed = function (p) { if (!seen[p] && dist2(d, p * 4, br, bgc, bb) < tG) { seen[p] = 1; q[tail++] = p; } };
      for (x = 0; x < s; x++) { seed(x); seed((h - 1) * s + x); }
      for (y = 0; y < h; y++) { seed(y * s); seed(y * s + s - 1); }
      while (head < tail) {
        var p = q[head++], px = p % s, k = p * 4;
        var nb0 = px > 0 ? p - 1 : -1, nb1 = px < s - 1 ? p + 1 : -1, nb2 = p - s, nb3 = p + s;
        for (var j = 0; j < 4; j++) {
          var o = j === 0 ? nb0 : j === 1 ? nb1 : j === 2 ? nb2 : nb3;
          if (o < 0 || o >= n || seen[o]) continue;
          var ko = o * 4;
          if (dist2(d, ko, br, bgc, bb) < tG && dist2(d, ko, d[k], d[k + 1], d[k + 2]) < tS) { seen[o] = 1; q[tail++] = o; }
        }
      }
      for (i = 0; i < n; i++) if (seen[i]) d[i * 4 + 3] = 0;
      for (i = 0; i < n; i++) {                 // tepi halus
        if (seen[i]) continue;
        var ix = i % s;
        if ((ix > 0 && seen[i - 1]) || (ix < s - 1 && seen[i + 1]) || (i >= s && seen[i - s]) || (i + s < n && seen[i + s])) {
          var dd = Math.sqrt(dist2(d, i * 4, br, bgc, bb)) / (tolG * 2.2);
          d[i * 4 + 3] = Math.round(clamp(dd, .15, 1) * d[i * 4 + 3]);
        }
      }
      g.putImageData(id, 0, 0);
    }
    var x0 = s, y0 = h, x1 = 0, y1 = 0;          // potong ke batas objek
    for (y = 0; y < h; y++) for (x = 0; x < s; x++) if (d[(y * s + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return { canvas: c, aspect: s / h };
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    return { canvas: out, aspect: cw / ch };
  }
  function getCutout(url) {
    if (!cutCache[url]) cutCache[url] = loadImage(url).then(function (im) {
      var r = cutout(im), t = new T.CanvasTexture(r.canvas);
      t.encoding = T.sRGBEncoding; t.anisotropy = 8;
      return { tex: t, aspect: r.aspect, canvas: r.canvas };
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
    blob.rotation.x = -Math.PI / 2; blob.position.y = LIFT + .002; blob.scale.set(w * 1.15, framed ? .5 : Math.max(.35, w * .45), 1);
    g.add(blob);
    g.userData.bounds = { w: w, h: h + (framed ? .32 : 0), d: .4 };
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
    if (portrait) { kw = st.kind === 'art' ? 1.15 : 1.3; kh = st.kind === 'art' ? 1.3 : 1.9; }
    var needH = b.h * kh + .3, needW = (b.w * kw + .2) * (H / W);
    var span = Math.max(needH * H / fh, needW * W / fw);
    var dist = span / vf;
    var yaw = st.kind === 'cubix' ? -.3 : 0, pitch = st.kind === 'cubix' ? .17 : .09;
    animView({ tx: 0, ty: LIFT + b.h * .48, tz: st.kind === 'cubix' ? b.d * .12 : 0, dist: clamp(dist, 2.2, 16), yaw: yaw, pitch: pitch, fov: fov }, dur);
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
    O.halo.material.opacity = mood.halo; renderer.toneMappingExposure = mood.exp;
    mats.fabric.envMapIntensity = .5 * mood.env / .42;
    // geser titik pusat pandang agar objek berada di tengah ruang kosong
    inset.x = lerp(inset.x, (inset.r - inset.l) / 2, k * 1.1);
    inset.y = lerp(inset.y, (inset.b - inset.t) / 2, k * 1.1);
    camera.setViewOffset(W, H, inset.x, inset.y, W, H);
    if (!st.drag) {
      st.spinV = lerp(st.spinV, 0, k * .5); st.spin += st.spinV * dt;
      if (now - st.lastDrag > 2600 && !orbit) st.spin = lerp(st.spin, 0, k * .25);
    }
    sofa.rotation.y = st.spin;
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
      camera.position.set(view.tx + Math.sin(yaw) * Math.cos(pitch) * view.dist, view.ty + Math.sin(pitch) * view.dist, view.tz + Math.cos(yaw) * Math.cos(pitch) * view.dist);
      camera.lookAt(view.tx, view.ty, view.tz);
    }
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
      controls.enablePan = false; controls.minDistance = 2.4; controls.maxDistance = 10;
      controls.minPolarAngle = .55; controls.maxPolarAngle = 1.48; controls.rotateSpeed = .6;
    }
    XW.quality = 2;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1; }, { passive: true });
    var dx0 = 0;
    canvas.addEventListener('pointerdown', function (e) { if (orbit || st.kind !== 'cubix') return; st.drag = true; dx0 = e.clientX; st.spinV = 0; });
    window.addEventListener('pointermove', function (e) { if (!st.drag) return; var dx = e.clientX - dx0; dx0 = e.clientX; st.spin += dx * .006; st.spinV = dx * .35; st.lastDrag = performance.now(); });
    window.addEventListener('pointerup', function () { if (st.drag) { st.drag = false; st.lastDrag = performance.now(); } });
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
  XW.showProduct = function (p, url) {
    var my = ++req;
    return getCutout(url).then(function (r) {
      if (my !== req) return;
      var w = sizeFor(p), h = w / r.aspect;
      if (h > 2.2) { h = 2.2; w = h * r.aspect; }
      var g = makeBillboard(r.tex, w, h, false);
      g.visible = false; scene.add(g);
      g.userData.dispose = function () { scene.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== mats.brass) o.material.dispose(); }); };
      present('product', g);
    });
  };
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
