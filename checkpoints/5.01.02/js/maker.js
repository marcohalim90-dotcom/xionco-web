/* ==========================================================================
   Maison XIONCO v5 — Customize: pembuat model 3D parametrik
   XMAKER.build(cfg, kit) → { group, dispose }
   Satu fungsi per jenis (sofa, armchair, bench, kursi makan, stool, ottoman,
   meja, kabinet, divan). Satuan meter, lantai di y = 0, depan menghadap +Z.
   Bentuk, ukuran, material, kaki, lengan, sandaran, handle, penyimpanan, dll.
   mengikuti pilihan di panel Customize (spesifikasi: custom-spec.js).
   kit = { T, rbox, col } dari world.js (Three.js r147).
   ========================================================================== */
(function () {
  'use strict';
  var TEX = {};   // tekstur kanvas — dibuat sekali, dipakai ulang

  function canvasTex(T, key, w, h, draw, rep) {
    if (TEX[key]) return TEX[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    t.wrapS = t.wrapT = T.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    TEX[key] = t; return t;
  }
  var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  var TX = {
    weave: function (T) {
      return canvasTex(T, 'weave', 256, 256, function (g, w, h) {
        g.fillStyle = '#cfcac3'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 2) { g.fillStyle = 'rgba(70,64,58,' + (0.08 + rnd() * .1) + ')'; g.fillRect(0, y, w, 1); }
        for (var x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,248,236,' + (0.03 + rnd() * .05) + ')'; g.fillRect(x, 0, 1, h); }
      }, [6, 6]);
    },
    boucle: function (T) {
      return canvasTex(T, 'boucle', 256, 256, function (g, w, h) {
        g.fillStyle = '#c9c4bc'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 2600; i++) { var x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 2.6; g.strokeStyle = 'rgba(' + (rnd() > .5 ? '255,250,240' : '80,74,66') + ',' + (.25 + rnd() * .3) + ')'; g.lineWidth = .9; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
      }, [5, 5]);
    },
    grain: function (T) {
      return canvasTex(T, 'grain', 512, 256, function (g, w, h) {
        g.fillStyle = '#d2bc9c'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 170; i++) {
          var y = rnd() * h; g.strokeStyle = 'rgba(70,46,26,' + (.03 + rnd() * .1).toFixed(3) + ')'; g.lineWidth = .6 + rnd() * 1.8;
          g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .012 + i) * (2 + rnd() * 3)); g.stroke();
        }
      }, [1.5, 1.5]);
    },
    fluted: function (T) {
      return canvasTex(T, 'fluted', 64, 8, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(.18, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.82, '#d0d0d0'); gr.addColorStop(1, '#3a3a3a');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, [1, 1]);
    },
    cane: function (T) {
      return canvasTex(T, 'cane', 128, 128, function (g, w, h) {
        g.fillStyle = '#2a211a'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d8bf8f'; g.lineWidth = 3.2;
        for (var i = -w; i < w * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
        g.lineWidth = 2.4; for (var y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (var x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      }, [6, 6]);
    },
    stone: function (T, o) {
      return canvasTex(T, 'stone-' + o.id, 512, 512, function (g, w, h) {
        g.fillStyle = o.hex; g.fillRect(0, 0, w, h);
        if (o.speck) {
          var cols = ['#7b6e5f', '#b5875b', '#4b4a46', '#cdb89a', '#8f9b84', '#e9e4da'];
          for (var i = 0; i < 1800; i++) { g.fillStyle = cols[i % cols.length]; var r = 1 + rnd() * 5; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (.5 + rnd() * .6), rnd() * 3, 0, Math.PI * 2); g.fill(); }
          return;
        }
        for (var k = 0; k < 14; k++) {
          g.strokeStyle = o.vein; g.globalAlpha = .12 + rnd() * .35; g.lineWidth = .5 + rnd() * 2.6;
          var x = rnd() * w, y = 0; g.beginPath(); g.moveTo(x, y);
          while (y < h) { x += (rnd() - .5) * 46; y += 14 + rnd() * 26; g.lineTo(x, y); }
          g.stroke();
        }
        g.globalAlpha = 1;
      }, [1, 1]);
    }
  };

  function build(c, kit) {
    var T = kit.T, col = kit.col;
    var made = [];   // geometri & material untuk dibuang saat dibangun ulang
    var keep = function (o) { made.push(o); return o; };
    var root = new T.Group();
    var X = window.XC;
    var cm = function (v, d) { return (v == null || isNaN(+v) ? d : +v) / 100; };

    /* ---------------- material */
    var mcache = {};
    function M(key, make) { if (!mcache[key]) mcache[key] = keep(make()); return mcache[key]; }
    function fabric(hex, uphId) {
      var u = X.find(X.UPH, uphId) || X.UPH[0];
      return M('fab' + hex + uphId, function () {
        var base = col(hex);
        if (u.leather) return new T.MeshPhysicalMaterial({ color: base, roughness: uphId === 'leather' ? .5 : .42, metalness: 0, clearcoat: .22, clearcoatRoughness: .45, envMapIntensity: .6 });
        var tex = u.nap === 'boucle' ? TX.boucle(T) : TX.weave(T);
        var m = new T.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.12), map: tex, bumpMap: tex, bumpScale: u.nap === 'boucle' ? .012 : .004, roughness: u.nap === 'velvet' ? .78 : .93, metalness: 0, envMapIntensity: .5 });
        if (u.nap === 'velvet') { m.sheen = 1; m.sheenRoughness = .35; m.sheenColor = base.clone().lerp(new T.Color(1, 1, 1), .35); }
        else { m.sheen = .4; m.sheenRoughness = .7; m.sheenColor = base.clone().lerp(new T.Color(1, 1, 1), .45); }
        return m;
      });
    }
    function wood(hex) { return M('wood' + hex, function () { return new T.MeshStandardMaterial({ color: col(hex).multiplyScalar(1.15), map: TX.grain(T), roughness: .55, metalness: 0, envMapIntensity: .7 }); }); }
    function metal(o) { o = o || X.METAL[0]; return M('metal' + o.id, function () { return new T.MeshStandardMaterial({ color: col(o.hex), roughness: o.rough || .35, metalness: o.id === 'ivory' ? .2 : 1, envMapIntensity: 1.1 }); }); }
    function paint(hex, gloss, grain) {
      return M('paint' + hex + gloss + grain, function () {
        return new T.MeshStandardMaterial({ color: col(hex).multiplyScalar(grain ? 1.15 : 1), map: grain ? TX.grain(T) : null, roughness: gloss ? .14 : .55, metalness: 0, envMapIntensity: gloss ? 1 : .6 });
      });
    }
    function stone(o) { return M('stone' + o.id, function () { return new T.MeshStandardMaterial({ map: TX.stone(T, o), roughness: .22, metalness: 0, envMapIntensity: .9 }); }); }
    function glass() { return M('glass', function () { return new T.MeshPhysicalMaterial({ color: col('#9fb0ad'), roughness: .05, metalness: 0, transparent: true, opacity: .32, envMapIntensity: 1.2, depthWrite: false }); }); }
    function dark(hex) { return M('dark' + (hex || ''), function () { return new T.MeshStandardMaterial({ color: col(hex || '#141110'), roughness: .8, metalness: 0 }); }); }
    function glow() { return M('glow', function () { return new T.MeshBasicMaterial({ color: col('#ffcf8f'), toneMapped: false }); }); }
    function cane(hex) { return M('cane' + hex, function () { return new T.MeshStandardMaterial({ color: col(hex || '#d8bf8f').multiplyScalar(1.1), map: TX.cane(T), roughness: .7 }); }); }
    function fluted(hex) { return M('flute' + hex, function () { return new T.MeshStandardMaterial({ color: col(hex).multiplyScalar(1.15), map: TX.grain(T), bumpMap: TX.fluted(T), bumpScale: .02, roughness: .55, envMapIntensity: .7 }); }); }
    function linen() { return M('linen', function () { var t = TX.weave(T); return new T.MeshPhysicalMaterial({ color: col('#e8e2d6'), map: t, bumpMap: t, bumpScale: .003, roughness: .95, sheen: .3, sheenColor: new T.Color(1, 1, 1), envMapIntensity: .5 }); }); }
    function ghost() { return M('ghost', function () { return new T.MeshStandardMaterial({ color: col('#8a7f70'), transparent: true, opacity: .18, roughness: .9, depthWrite: false }); }); }

    var colorHex = (X.colorOf(c) || {}).hex || '#4d4d4d';
    var FAB = function () { return fabric(colorHex, c.uph || 'vienna'); };
    var woodHex = (X.find(X.WOOD, c.wood) || X.WOOD[0]).hex;
    var WOOD = function () { return wood(woodHex); };
    var METAL = function () { return metal(X.find(X.METAL, c.metal)); };
    var LEGM = function () { return c.legFinish === 'metal' || /^(round|hairpin|sled)$/.test(c.leg) && c.legFinish !== 'wood' ? METAL() : c.legFinish === 'same' ? FAB() : WOOD(); };

    /* ---------------- geometri */
    function mesh(geo, mat, parent) { var m = new T.Mesh(keep(geo), mat); m.castShadow = true; m.receiveShadow = true; (parent || root).add(m); return m; }
    function box(p, w, h, d, mat, x, y, z, r) {
      r = Math.max(0, Math.min(r == null ? .006 : r, w / 2 - .0005, h / 2 - .0005, d / 2 - .0005));
      var geo = r > .001 && kit.rbox ? kit.rbox(w, h, d, r, r > .02 ? 4 : 2) : new T.BoxGeometry(w, h, d);
      var m = mesh(geo, mat, p); m.position.set(x || 0, y || 0, z || 0); return m;
    }
    function cyl(p, rt, rb, h, mat, x, y, z, seg) { var m = mesh(new T.CylinderGeometry(rt, rb, h, seg || 24), mat, p); m.position.set(x || 0, y || 0, z || 0); return m; }
    function rod(p, a, b, r, mat) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]), L = A.distanceTo(B);
      var m = mesh(new T.CylinderGeometry(r, r, L, 12), mat, p);
      m.position.copy(A).add(B).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      return m;
    }
    function sphere(p, r, mat, x, y, z) { var m = mesh(new T.SphereGeometry(r, 12, 8), mat, p); m.position.set(x, y, z); return m; }
    // pelat dari bentuk 2D (x, z) setebal t, alas di y0; bevel = profil tepi
    function slab(p, shape, t, mat, y0, bev, bevSeg) {
      bev = Math.min(bev || 0, t / 2 - .001);
      var geo = new T.ExtrudeGeometry(shape, { depth: Math.max(.001, t - 2 * bev), bevelEnabled: bev > .0005, bevelThickness: bev, bevelSize: bev, bevelSegments: bevSeg || 3, curveSegments: 64 });
      geo.rotateX(-Math.PI / 2);
      var m = mesh(geo, mat, p); m.position.y = y0 + bev; return m;
    }
    function rrect(w, d, r) {
      var s = new T.Shape(), x = -w / 2, y = -d / 2; r = Math.min(r, w / 2, d / 2);
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
      s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    function ellipse(w, d) { var s = new T.Shape(); s.absellipse(0, 0, w / 2, d / 2, 0, Math.PI * 2, false, 0); return s; }
    function capsule(w, d) { var r = d / 2, s = new T.Shape(); s.moveTo(-w / 2 + r, -r); s.lineTo(w / 2 - r, -r); s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-w / 2 + r, r); s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); return s; }
    function organic(w, d, seed) {
      var pts = [], n = 14;
      for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, k = 1 + .09 * Math.sin(a * 2 + seed) + .06 * Math.cos(a * 3 + seed * 2); pts.push(new T.Vector2(Math.cos(a) * w / 2 * k, Math.sin(a) * d / 2 * k)); }
      var s = new T.Shape(); s.setFromPoints(new T.SplineCurve(pts.concat([pts[0]])).getPoints(80)); return s;
    }
    function liveEdge(w, d) {
      var s = new T.Shape(), n = 18, i; s.moveTo(-w / 2, -d / 2 + .02);
      for (i = 0; i <= n; i++) s.lineTo(-w / 2 + w * i / n, -d / 2 + .02 * Math.sin(i * 1.7) + .015 * Math.cos(i * 3.1));
      for (i = n; i >= 0; i--) s.lineTo(-w / 2 + w * i / n, d / 2 - .02 * Math.cos(i * 1.3) - .012 * Math.sin(i * 2.7));
      return s;
    }
    function lshapeTop(w, d, w2) { var s = new T.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2 + w2); s.lineTo(w / 2 - d, d / 2 + w2); s.lineTo(w / 2 - d, d / 2); s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, -d / 2); return s; }

    /* ---------------- kaki */
    function leg(p, type, x, z, h, mat, y0) {
      y0 = y0 || 0;
      if (h <= .005) return;
      if (type === 'tapered') cyl(p, .022, .013, h, mat, x, y0 + h / 2, z, 16);
      else if (type === 'straight') box(p, .04, h, .04, mat, x, y0 + h / 2, z, .004);
      else if (type === 'block') box(p, .075, h, .075, mat, x, y0 + h / 2, z, .008);
      else if (type === 'round') cyl(p, .011, .011, h, mat, x, y0 + h / 2, z, 12);
      else if (type === 'hairpin') { rod(p, [x - .025, y0 + h, z], [x, y0, z], .005, mat); rod(p, [x + .025, y0 + h, z], [x, y0, z], .005, mat); }
      else if (type === 'castor') { cyl(p, .012, .012, h - .03, mat, x, y0 + h - (h - .03) / 2, z, 10); sphere(p, .022, dark('#2a2522'), x, y0 + .022, z); }
      else if (type === 'splay') { var r = rod(p, [x * .92, y0 + h, z * .92], [x, y0, z], .014, mat); r.scale.set(1, 1, 1); }
      else cyl(p, .018, .014, h, mat, x, y0 + h / 2, z, 14);
    }
    // kaki/base untuk benda berbentuk kotak (lebar w, dalam d): mengembalikan tinggi badan mulai
    function baseFor(p, type, w, d, h, mat) {
      if (type === 'plinth') { box(p, w - .05, .07, d - .05, dark('#1f1a16'), 0, .035, 0, .004); return .07; }
      if (type === 'metalplinth') { box(p, w - .02, .065, d - .02, metal(X.find(X.METAL, c.metal) || X.METAL[1]), 0, .0325, 0, .003); return .065; }
      if (type === 'floating') { box(p, w - .26, .09, d - .26, dark(), 0, .045, 0, .004); return .09; }
      if (type === 'sled') {
        [-1, 1].forEach(function (s) {
          var x = s * (w / 2 - .05);
          rod(p, [x, 0, -d / 2 + .04], [x, 0, d / 2 - .04], .009, mat); rod(p, [x, 0, -d / 2 + .04], [x, h, -d / 2 + .04], .009, mat); rod(p, [x, 0, d / 2 - .04], [x, h, d / 2 - .04], .009, mat);
        });
        return h;
      }
      var ix = w / 2 - .06, iz = d / 2 - .06;
      [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]].forEach(function (q) { leg(p, type, q[0], q[1], h, mat); });
      if (w > 2.1) { leg(p, type, 0, -iz, h, mat); leg(p, type, 0, iz, h, mat); }
      return h;
    }
    function pillowAt(p, mat, x, y, z, rz, s) { s = s || 1; var m = box(p, .44 * s, .44 * s, .13 * s, mat, x, y, z, .06 * s); m.rotation.set(-.32, 0, rz || 0); return m; }

    /* ---------------- SOFA: satu "run" lurus di sumbu x lokal, sandaran di -z */
    function run(len, D, o) {
      var g = new T.Group(), F = FAB(), H = o.H, SH = o.SH;
      var aw = { track: .15, slope: .16, rolled: .18, flared: .18, shelter: .16, panel: .06, none: 0 }[o.arm] || 0;
      var awL = o.armL ? aw : o.cornerL ? .17 : 0, awR = o.armR ? aw : o.cornerR ? .17 : 0;
      var y0 = baseFor(g, o.leg, len, D, o.legH, o.legM);
      if (/^(plinth|metalplinth|floating|sled)$/.test(o.leg)) y0 = Math.max(y0, o.leg === 'sled' ? o.legH : y0);
      var li = len - awL - awR, cx = (awL - awR) / 2;
      var tight = o.seatC === 'tight', backT = o.back === 'cushion' || o.back === 'pillow' ? .2 : .16;
      var deckTop = tight ? SH : SH - .13;
      box(g, li, deckTop - y0, D, F, cx, y0 + (deckTop - y0) / 2, 0, tight ? .04 : .015);
      // sandaran
      if (o.back !== false) {
        var bh = H - y0, frameT = o.back === 'tight' ? .2 : .13;
        box(g, li + .002, bh, frameT, F, cx, y0 + bh / 2, -D / 2 + frameT / 2, o.back === 'tight' ? .06 : .035);
        var bz = -D / 2 + frameT, bTop = H - (o.back === 'cushion' || o.back === 'pillow' ? .02 : .03), bBot = SH;
        if (o.back === 'cushion' || o.back === 'pillow') {
          var n = Math.max(1, Math.round(li / .62)), cw = li / n, r = o.back === 'pillow' ? .08 : .045, th = o.back === 'pillow' ? .22 : .17;
          for (var i = 0; i < n; i++) { var bc = box(g, cw - .012, bTop - bBot, th, F, cx - li / 2 + cw * (i + .5), (bTop + bBot) / 2, bz + th / 2 - .02, r); bc.rotation.x = -.12; }
        } else if (o.back === 'channel') {
          var k = Math.max(3, Math.round(li / .13)), ch = li / k;
          for (var j = 0; j < k; j++) box(g, ch - .005, bTop - bBot, .085, F, cx - li / 2 + ch * (j + .5), (bTop + bBot) / 2, bz + .04, .038);
        } else if (o.back === 'button') {
          box(g, li, bTop - bBot, .08, F, cx, (bTop + bBot) / 2, bz + .04, .035);
          var BTN = fabric(colorHex, c.uph), cols = Math.max(3, Math.round(li / .16)), rows = 3;
          for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols - (rr % 2); cc++) sphere(g, .009, BTN, cx - li / 2 + li * (cc + .5 + (rr % 2) * .5) / cols, bBot + (bTop - bBot) * (rr + .7) / (rows + .4), bz + .082);
        }
      }
      // bantal dudukan
      if (!tight) {
        var ns = o.seatC === 'bench' ? 1 : Math.max(1, o.n || Math.round(li / .62)), sw = li / ns, sd = D - (o.back === false ? .02 : backT + .01);
        for (var s = 0; s < ns; s++) box(g, sw - .01, .135, sd, F, cx - li / 2 + sw * (s + .5), SH - .0675, D / 2 - sd / 2 - .005, .04);
      }
      // lengan
      function arm(side, w, style) {
        var x = side * (len / 2 - w / 2), ah = style === 'shelter' || style === 'corner' ? H : o.armH;
        if (style === 'slope') {
          // profil samping (x bentuk → -z dunia setelah diputar): tinggi di belakang, rendah di depan
          var sh = new T.Shape(); sh.moveTo(-D / 2, y0); sh.lineTo(D / 2, y0); sh.lineTo(D / 2, ah); sh.lineTo(-D / 2, ah - .1); sh.lineTo(-D / 2, y0);
          var geo = new T.ExtrudeGeometry(sh, { depth: w - .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 3 });
          geo.rotateY(Math.PI / 2); var m = mesh(geo, F, g); m.position.x = x - (w - .02) / 2;
          return;
        }
        if (style === 'rolled' || style === 'flared') {
          box(g, w - .05, ah - .07 - y0, D, F, x - side * .02, y0 + (ah - .07 - y0) / 2, 0, .02);
          var roll = cyl(g, .075, .075, D, F, x + side * (style === 'flared' ? .03 : .005), ah - .07, 0, 24); roll.rotation.x = Math.PI / 2;
          return;
        }
        if (style === 'panel') { box(g, w, ah - y0, D - .02, F, x, y0 + (ah - y0) / 2, 0, .02); return; }
        box(g, w, ah - y0, D, F, x, y0 + (ah - y0) / 2, 0, style === 'track' ? .025 : .04);
      }
      if (o.armL) arm(-1, aw, o.arm); else if (o.cornerL) arm(-1, .17, 'corner');
      if (o.armR) arm(1, aw, o.arm); else if (o.cornerR) arm(1, .17, 'corner');
      if (o.arm === 'none' && o.armL && aw === 0) { /* tanpa lengan */ }
      return g;
    }
    function place(g, x, z, ry) { g.position.set(x, 0, z); g.rotation.y = ry || 0; root.add(g); return g; }
    function seatingCommon() {
      return {
        H: cm(c.h, 78), SH: cm(c.seatH, 44), armH: cm(c.armH, 62), arm: c.arm || 'track', back: c.back || 'cushion', seatC: c.seatC || 'split',
        leg: c.leg || 'tapered', legH: /^(plinth|metalplinth|floating)$/.test(c.leg) ? 0 : cm(c.legH, 12), legM: LEGM()
      };
    }
    function pillows(n, W, D, SH, z0) {
      var hex = c.pillowColor === 'accent' ? '#b88a2a' : c.pillowColor === 'contrast' ? contrast(colorHex) : colorHex;
      var mat = fabric(hex, c.pillowColor === 'accent' ? 'velvet' : c.uph);
      for (var i = 0; i < n; i++) {
        var side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
        pillowAt(root, mat, side * (W / 2 - .42 - k * .38), SH + .2, z0, side * .08);
      }
    }
    function contrast(hex) { var v = col(hex), l = v.r * .3 + v.g * .59 + v.b * .11; return l > .2 ? '#2b2a29' : '#d9ccba'; }

    function sofa() {
      var o = seatingCommon(), W = cm(c.w, 220), D = cm(c.d, 92), R = cm(c.ret, 200), seats = parseFloat(c.seats) || 3, sh = c.shape || 'lurus';
      var common = function (extra) { var x = {}; for (var k in o) x[k] = o[k]; for (var j in extra) x[j] = extra[j]; return x; };
      var armOn = o.arm !== 'none';
      if (sh === 'lurus') place(run(W, D, common({ armL: armOn, armR: armOn, n: Math.round(seats) })), 0, 0);
      else if (sh === 'modular') {
        var n = Math.max(2, Math.round(seats)), mw = W / n;
        for (var i = 0; i < n; i++) place(run(mw - .012, D, common({ armL: armOn && i === 0, armR: armOn && i === n - 1, n: 1, seatC: 'bench' })), -W / 2 + mw * (i + .5), 0);
      } else if (/^(lkiri|lkanan|u)$/.test(sh)) {
        var L2 = Math.max(.6, R - D), left = sh !== 'lkanan', right = sh !== 'lkiri';
        place(run(W, D, common({ armL: armOn && !left, armR: armOn && !right, cornerL: left, cornerR: right, n: Math.round(seats) })), 0, 0);
        if (left) place(run(L2, D, common({ armL: armOn, n: Math.max(1, Math.round(L2 / .65)) })), -W / 2 + D / 2, D / 2 + L2 / 2, Math.PI / 2);
        if (right) place(run(L2, D, common({ armR: armOn, n: Math.max(1, Math.round(L2 / .65)) })), W / 2 - D / 2, D / 2 + L2 / 2, -Math.PI / 2);
      } else if (/^chaise/.test(sh)) {
        var sd = sh === 'chaisekiri' ? -1 : 1, E = Math.max(.5, R - D), F = FAB();
        place(run(W, D, common({ armL: armOn, armR: armOn, n: Math.round(seats) })), 0, 0);
        var aw = armOn ? ({ track: .15, slope: .16, rolled: .18, flared: .18, shelter: .16, panel: .06 }[o.arm] || .15) : 0, cw = Math.min(.9, W * .42) - aw;
        var x0 = sd * (W / 2 - aw - cw / 2), z0 = D / 2 + E / 2, y0 = /^(plinth|metalplinth|floating)$/.test(o.leg) ? .08 : o.legH;
        box(root, cw, o.SH - .13 - y0, E, F, x0, y0 + (o.SH - .13 - y0) / 2, z0, .015);
        box(root, cw - .01, .135, E - .01, F, x0, o.SH - .0675, z0, .04);
        if (armOn) box(root, aw, Math.min(o.armH, o.SH + .12) - y0, E, F, sd * (W / 2 - aw / 2), y0 + (Math.min(o.armH, o.SH + .12) - y0) / 2, z0, .025);
        if (!/^(plinth|metalplinth|floating)$/.test(o.leg)) { leg(root, o.leg, sd * (W / 2 - .06), D / 2 + E - .06, o.legH, o.legM); leg(root, o.leg, sd * (W / 2 - cw - aw + .06), D / 2 + E - .06, o.legH, o.legM); }
        else box(root, cw + aw - .06, .07, E - .04, dark('#1f1a16'), sd * (W / 2 - (cw + aw) / 2), .035, z0, .004);
      } else if (sh === 'curved') {
        var N = Math.max(4, Math.round(W / .5)), A = 1.9, Rr = W / A, step = A / N, segL = 2 * (Rr + D / 2) * Math.sin(step / 2) + .004;
        for (var k = 0; k < N; k++) {
          var ph = -A / 2 + step * (k + .5);
          place(run(segL, D, common({ armL: armOn && k === 0, armR: armOn && k === N - 1, n: 1, seatC: 'bench', back: o.back === 'button' || o.back === 'channel' ? 'tight' : o.back })), Math.sin(ph) * Rr, Rr - Math.cos(ph) * Rr, -ph);
        }
      }
      var pz = -D / 2 + (o.back === 'cushion' || o.back === 'pillow' ? .36 : .27);
      if (+c.pillows) pillows(+c.pillows, sh === 'curved' ? W * .8 : W, D, o.SH, pz);
      if ((c.extras || []).indexOf('usb') >= 0) box(root, .05, .015, .08, dark(), (armOn ? 1 : 0) * (W / 2 - .08), o.armH + .005, .1, .003);
    }

    function armchair() {
      var o = seatingCommon(), W = cm(c.w, 84), D = cm(c.d, 86), sh = c.shape || 'standar', F = FAB();
      if (sh === 'lounge') o.SH = Math.min(o.SH, .4);
      if (sh === 'slipper') o.arm = 'none';
      if (sh === 'swivel') { o.leg = 'floating'; }
      if (sh === 'barrel') {
        var y0 = baseFor(root, o.leg, W * .8, D * .8, o.legH, o.legM), r = W / 2;
        cyl(root, r * .92, r * .92, o.SH - .13 - y0, F, 0, y0 + (o.SH - .13 - y0) / 2, .02, 40);
        var cu = cyl(root, r * .78, r * .8, .13, F, 0, o.SH - .065, .06, 40); cu.scale.z = D / W;
        var N = 13, A = Math.PI * 1.25;
        for (var i = 0; i < N; i++) { var ph = -A / 2 + A * (i + .5) / N, hh = o.H - y0 - Math.abs(Math.sin(ph)) * .14; var b = box(root, 2 * r * Math.sin(A / N / 2) + .02, hh, .16, F, Math.sin(ph) * (r - .08), y0 + hh / 2, -Math.cos(ph) * (r - .08) * D / W, .05); b.rotation.y = -ph; }
      } else {
        place(run(W, D, { H: o.H, SH: o.SH, armH: o.armH, arm: o.arm, back: o.back, seatC: 'bench', leg: o.leg, legH: o.legH, legM: o.legM, armL: o.arm !== 'none', armR: o.arm !== 'none', n: 1 }), 0, 0);
        if (sh === 'wingback') [-1, 1].forEach(function (s) { var wg = box(root, .09, o.H - o.SH - .02, .34, F, s * (W / 2 - .1), (o.H + o.SH) / 2, -D / 2 + .25, .04); wg.rotation.y = s * .32; });
      }
      if (sh === 'swivel') { cyl(root, .04, .04, .06, METAL(), 0, .06, 0, 16); cyl(root, W * .36, W * .38, .02, METAL(), 0, .01, 0, 40); }
      if (+c.pillows) pillowAt(root, fabric(c.pillowColor === 'contrast' ? contrast(colorHex) : colorHex, c.uph), 0, o.SH + .2, -D / 2 + .32, 0, .9);
      if ((c.extras || []).indexOf('ottoman') >= 0) box(root, W * .7, o.SH - .02, .45, F, 0, (o.SH - .02) / 2, D / 2 + .38, .05);
    }

    function bench() {
      var W = cm(c.w, 160), D = cm(c.d, 42), H = cm(c.h, 46), sh = c.shape || 'lurus', F = FAB(), Wd = WOOD();
      var top = c.top || 'upholstered', topMat = top === 'upholstered' ? F : top === 'rattan' ? cane('#d8bf8f') : Wd, tt = top === 'upholstered' ? .1 : .04;
      if (sh === 'round') { cyl(root, W / 2, W / 2, H, F, 0, H / 2, 0, 48); return; }
      var lh = /^(plinth|metalplinth|floating)$/.test(c.leg) ? 0 : Math.min(H - tt, cm(c.legH, 30));
      function seg(len, x, z, ry, ends) {
        var g = new T.Group(), legM = LEGM();
        var y0 = /^(plinth|metalplinth|floating)$/.test(c.leg) ? baseFor(g, c.leg, len, D, 0, legM) : 0;
        if (c.storage === 'lid' || /^(plinth|metalplinth|floating)$/.test(c.leg)) box(g, len, H - tt - y0, D, top === 'upholstered' ? F : Wd, 0, y0 + (H - tt - y0) / 2, 0, .01);
        else {
          var ix = len / 2 - .05, iz = D / 2 - .05;
          (ends ? [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]] : [[-ix, -iz], [-ix, iz]]).forEach(function (q) { leg(g, c.leg, q[0], q[1], H - tt, legM); });
          if (c.storage === 'shelf') box(g, len - .06, .025, D - .06, Wd, 0, (H - tt) * .3, 0, .004);
        }
        box(g, len, tt, D, topMat, 0, H - tt / 2, 0, top === 'upholstered' ? .035 : .006);
        if (c.storage === 'lid') box(g, len + .002, .006, D + .002, dark(), 0, H - tt - .02, 0, .002);
        if (c.cushion === 'seat' || c.cushion === 'seatback') box(g, len - .04, .06, D - .04, F, 0, H + .03, 0, .028);
        if (c.backrest && c.backrest !== 'none') {
          var bh = c.backrest === 'full' ? .42 : .22, bm = top === 'upholstered' ? F : Wd;
          [-1, 1].forEach(function (s) { rod(g, [s * (len / 2 - .04), H, -D / 2 + .03], [s * (len / 2 - .04), H + bh, -D / 2 + .01], .014, LEGM()); });
          box(g, len - .04, bh * .7, top === 'upholstered' ? .07 : .025, bm, 0, H + bh * .55, -D / 2 + .02, top === 'upholstered' ? .03 : .005).rotation.x = -.1;
          if (c.cushion === 'seatback') box(g, len - .1, bh * .6, .07, F, 0, H + bh * .5, -D / 2 + .08, .03).rotation.x = -.12;
        }
        place(g, x, z, ry);
      }
      if (sh === 'curved') {
        var N = 5, A = 1.1, Rr = W / A;
        for (var k = 0; k < N; k++) { var ph = -A / 2 + A * (k + .5) / N; seg(2 * (Rr + D / 2) * Math.sin(A / N / 2) + .004, Math.sin(ph) * Rr, Rr - Math.cos(ph) * Rr, -ph, true); }
      } else seg(W, 0, 0, 0, true);
    }

    function dining() {
      var W = cm(c.w, 48), D = cm(c.d, 52), H = cm(c.h, 82), SH = cm(c.seatH, 46), F = FAB(), Wd = WOOD(), Mt = METAL();
      var frameM = c.frame === 'metal' ? Mt : Wd, legM = c.frame === 'wood' ? Wd : Mt, backM = c.frame === 'metal' ? Mt : Wd;
      var cu = c.cushion || 'upholstered', st = cu === 'upholstered' || cu === 'full' ? .07 : .03;
      var ix = W / 2 - .03, iz = D / 2 - .03, lt = SH - st;
      if (c.leg === 'sled') { [-1, 1].forEach(function (s) { var x = s * ix; rod(root, [x, 0, -iz], [x, 0, iz], .008, legM); rod(root, [x, 0, -iz], [x, lt, -iz], .008, legM); rod(root, [x, 0, iz], [x, lt, iz], .008, legM); }); }
      else if (c.leg === 'x') { rod(root, [-ix, 0, -iz], [ix, lt, iz], .012, legM); rod(root, [ix, 0, -iz], [-ix, lt, iz], .012, legM); rod(root, [-ix, 0, iz], [ix, lt, -iz], .012, legM); rod(root, [ix, 0, iz], [-ix, lt, -iz], .012, legM); }
      else if (c.leg === 'cantilever') { [-1, 1].forEach(function (s) { var x = s * ix; rod(root, [x, 0, -iz], [x, 0, iz], .01, Mt); rod(root, [x, 0, -iz], [x, lt, -iz + .02], .01, Mt); rod(root, [x, lt, -iz + .02], [x, lt, iz], .01, Mt); }); }
      else [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]].forEach(function (q) {
        if (c.leg === 'splay') rod(root, [q[0] * .85, lt, q[1] * .85], [q[0] * 1.05, 0, q[1] * 1.05], .014, legM);
        else leg(root, c.leg === 'straight' ? (c.frame === 'metal' ? 'round' : 'straight') : (c.frame === 'metal' ? 'round' : 'tapered'), q[0], q[1], lt, legM);
      });
      // dudukan
      if (cu === 'none') box(root, W, .03, D, Wd, 0, SH - .015, 0, .008);
      else if (cu === 'pad') { box(root, W, .025, D, Wd, 0, SH - .045, 0, .006); box(root, W - .03, .035, D - .03, F, 0, SH - .017, 0, .016); }
      else box(root, W, st, D, F, 0, SH - st / 2, 0, .025);
      // sandaran
      var bt = H - SH, bz = -D / 2 + .02, back = cu === 'full' ? 'upholstered' : c.back || 'open';
      [-1, 1].forEach(function (s) { rod(root, [s * (W / 2 - .025), SH - .01, bz], [s * (W / 2 - .03), H, bz - .03], .013, backM); });
      if (back === 'open') box(root, W - .02, .06, .025, backM, 0, H - .04, bz - .028, .008);
      else if (back === 'ladder') for (var i = 0; i < 3; i++) box(root, W - .04, .035, .02, backM, 0, SH + bt * (.35 + i * .24), bz - .01 - i * .007, .006);
      else if (back === 'slat') { box(root, W - .02, .05, .025, backM, 0, H - .035, bz - .028, .008); for (var j = 0; j < 4; j++) box(root, .03, bt - .14, .018, backM, -W / 2 + .1 + j * (W - .2) / 3, SH + (bt - .1) / 2 + .02, bz - .015, .004); }
      else if (back === 'upholstered') { var up = box(root, W - .02, bt - .06, .06, F, 0, SH + (bt - .06) / 2 + .05, bz - .01, .025); up.rotation.x = -.1; }
      else if (back === 'curved') { for (var k = 0; k < 9; k++) { var ph = -.7 + 1.4 * (k + .5) / 9, pnl = box(root, W * .17, bt * .55, .015, backM, Math.sin(ph) * W * .55, H - bt * .3, bz + .06 - Math.cos(ph) * W * .55 + W * .5, .004); pnl.rotation.y = -ph; } }
      else if (back === 'rattan') { box(root, W - .02, .04, .03, backM, 0, H - .03, bz - .028, .006); box(root, W - .08, bt * .55, .012, cane('#d8bf8f'), 0, H - bt * .35, bz - .02, .002); }
      if (c.arms === 'arms') [-1, 1].forEach(function (s) { rod(root, [s * (W / 2 - .02), SH + .2, bz], [s * (W / 2 - .01), SH + .2, D / 2 - .05], .012, backM); rod(root, [s * (W / 2 - .01), SH, D / 2 - .05], [s * (W / 2 - .01), SH + .2, D / 2 - .05], .012, backM); });
    }

    function stool() {
      var W = cm(c.w, 42), H = cm(c.h, 75), F = FAB(), Mt = METAL(), Wd = WOOD(), r = W / 2;
      var cu = c.cushion || 'pad', st = cu === 'none' ? .035 : .065, seatM = cu === 'none' ? Wd : F;
      if (c.base === 'pedestal') { cyl(root, .03, .03, H - st, Mt, 0, (H - st) / 2, 0, 16); cyl(root, r * .9, r, .025, Mt, 0, .0125, 0, 40); }
      else if (c.base === 'sled') [-1, 1].forEach(function (s) { var x = s * r * .8; rod(root, [x, 0, -r * .9], [x, 0, r * .9], .009, Mt); rod(root, [x, 0, -r * .9], [x, H - st, -r * .6], .009, Mt); rod(root, [x, 0, r * .9], [x, H - st, r * .6], .009, Mt); });
      else [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { rod(root, [q[0] * r * .62, H - st, q[1] * r * .62], [q[0] * r * .95, 0, q[1] * r * .95], .012, Mt); });
      if (c.footrest === 'ring' && c.base !== 'pedestal') { var t = mesh(new T.TorusGeometry(r * .82, .008, 8, 48), Mt); t.rotation.x = Math.PI / 2; t.position.y = H * .38; }
      else if (c.footrest === 'bar') rod(root, [-r * .85, H * .36, r * .78], [r * .85, H * .36, r * .78], .009, Mt);
      else if (c.footrest === 'ring') { var t2 = mesh(new T.TorusGeometry(r * .7, .008, 8, 48), Mt); t2.rotation.x = Math.PI / 2; t2.position.y = H * .38; }
      if (c.seatShape === 'square') box(root, W, st, W, seatM, 0, H - st / 2, 0, cu === 'none' ? .008 : .025);
      else { var sm = cyl(root, r, r * .96, st, seatM, 0, H - st / 2, 0, 40); if (c.seatShape === 'saddle') sm.scale.z = .9; }
      if (c.backS === 'low' || c.backS === 'full') {
        var bh = c.backS === 'full' ? .34 : .16;
        [-1, 1].forEach(function (s) { rod(root, [s * r * .6, H, -r * .7], [s * r * .65, H + bh, -r * .8], .01, Mt); });
        box(root, W * .85, bh * .6, cu === 'full' ? .05 : .02, cu === 'full' ? F : Wd, 0, H + bh * .65, -r * .82, .01);
      }
    }

    function ottoman() {
      var W = cm(c.w, 70), D = c.shape === 'kubus' || c.shape === 'round' ? W : cm(c.d, 50), H = cm(c.h, 42), F = FAB();
      var legM = LEGM(), lh = /^(plinth|metalplinth|floating)$/.test(c.leg) ? 0 : cm(c.legH, 8);
      var y0 = lh ? baseFor(root, c.leg, W, D, lh, legM) : c.leg === 'floating' ? baseFor(root, 'floating', W, D, 0, legM) : 0;
      var body;
      if (c.shape === 'round' || c.shape === 'oval') { body = cyl(root, W / 2, W / 2, H - y0, F, 0, y0 + (H - y0) / 2, 0, 48); body.scale.z = D / W; }
      else body = box(root, W, H - y0, D, F, 0, y0 + (H - y0) / 2, 0, .05);
      if (c.tuft === 'button') { var nx = Math.max(2, Math.round(W / .18)), nz = Math.max(2, Math.round(D / .18)); for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) if (c.shape !== 'round' || Math.hypot((i + .5) / nx - .5, (j + .5) / nz - .5) < .42) sphere(root, .008, F, -W / 2 + W * (i + .5) / nx, H + .002, -D / 2 + D * (j + .5) / nz); }
      if (c.tuft === 'channel') { var k = Math.max(3, Math.round(W / .12)); for (var q = 0; q < k; q++) box(root, W / k - .004, .03, D * .92, F, -W / 2 + W * (q + .5) / k, H + .01, 0, .014); }
      if (c.storage !== 'none') box(root, W * (c.shape === 'round' ? .98 : 1.002), .006, D * 1.002, dark(), 0, H - .06, 0, .002);
    }

    /* ---------------- MEJA */
    function table() {
      var s = c.sub, shp = c.topShape || 'rect', H = cm(c.h, 75), t = cm(c.thick, 3);
      var round = shp === 'round' || shp === 'square', W = round ? cm(c.dia, 90) : cm(c.w, 120), D = round ? W : cm(c.d, 70);
      if (s === 'console') shp = 'rect';
      var topM = c.topMat === 'stone' ? stone(X.find(X.STONE, c.stone) || X.STONE[0]) : c.topMat === 'glass' ? glass()
        : c.topMat === 'hpl' || c.topMat === 'duco' ? paint((X.find(X.PANEL, c.panel) || X.PANEL[0]).hex, false, (X.find(X.PANEL, c.panel) || {}).grain) : WOOD();
      var baseM = c.baseMat === 'metal' ? METAL() : c.baseMat === 'stone' ? (c.topMat === 'stone' ? topM : stone(X.STONE[0])) : WOOD();
      if (c.base === 'electric') baseM = METAL();
      var edge = c.edge || 'eased', bev = { square: .0015, eased: .004, bevel: .01, bullnose: t * .48, knife: t * .45, live: .004 }[edge] || .004, segs = edge === 'bullnose' ? 6 : edge === 'bevel' || edge === 'knife' ? 1 : 3;
      function topShapeOf(w, d) {
        if (s === 'desk' && shp === 'lshape') return lshapeTop(w, d, Math.min(1, w * .5));
        if (edge === 'live' && shp === 'rect') return liveEdge(w, d);
        if (shp === 'round') return ellipse(w, w);
        if (shp === 'oval') return ellipse(w, d);
        if (shp === 'capsule') return capsule(w, d);
        if (shp === 'organic') return organic(w, d, 1.3);
        return rrect(w, d, shp === 'square' ? .02 : .012);
      }
      function oneTable(w, d, h, x, z) {
        var g = new T.Group(), top = slab(g, topShapeOf(w, d), t, topM, h - t, bev, segs);
        if (c.topMat === 'glass') { top.castShadow = false; }
        var under = h - t, b = c.base || 'legs4', isRound = shp === 'round' || shp === 'organic' || (shp === 'oval' && d / w > .7);
        if (b === 'legs4' || b === 'legs3') {
          var pts = [];
          if (isRound || b === 'legs3') { var n = b === 'legs3' ? 3 : 4; for (var i = 0; i < n; i++) { var a = Math.PI / 4 + i * Math.PI * 2 / n; pts.push([Math.cos(a) * w * .33, Math.sin(a) * d * .33]); } }
          else { var ix = w / 2 - .07, iz = d / 2 - .07; pts = [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]]; }
          pts.forEach(function (q) { leg(g, c.baseMat === 'metal' ? 'round' : 'tapered', q[0], q[1], under, baseM); });
          if (!isRound && b === 'legs4' && c.baseMat !== 'metal' && w > .6) { box(g, w - .16, .06, .02, baseM, 0, under - .03, -d / 2 + .07, .004); box(g, w - .16, .06, .02, baseM, 0, under - .03, d / 2 - .07, .004); }
        } else if (b === 'pedestal' || b === 'double') {
          var cols = b === 'double' || (w > 1.5 && !isRound) ? [-w * .27, w * .27] : [0];
          cols.forEach(function (cx) {
            var cr = Math.min(.12, Math.min(w, d) * .12);
            cyl(g, cr * .8, cr, under - .03, baseM, cx, (under - .03) / 2 + .03, 0, 32);
            var foot = cyl(g, Math.min(d, w) * .32, Math.min(d, w) * .34, .03, baseM, cx, .015, 0, 40); if (!isRound) foot.scale.x = .8;
          });
          if (cols.length > 1) box(g, w * .54, .05, .06, baseM, 0, .22, 0, .01);
        } else if (b === 'trestle' || b === 'x' || b === 'v' || b === 'sled' || b === 'electric') {
          var ex = w / 2 - Math.min(.25, w * .18), dz = d / 2 - .07;
          [-1, 1].forEach(function (sx) {
            var xx = sx * ex;
            if (b === 'trestle') { rod(g, [xx, under, -.04], [xx, 0, -dz], .022, baseM); rod(g, [xx, under, .04], [xx, 0, dz], .022, baseM); box(g, .05, .04, d * .8, baseM, xx, under - .02, 0, .004); }
            else if (b === 'x') { rod(g, [xx, under, -dz], [xx, 0, dz], .02, baseM); rod(g, [xx, under, dz], [xx, 0, -dz], .02, baseM); }
            else if (b === 'v') { rod(g, [xx, 0, 0], [xx, under, -dz], .02, baseM); rod(g, [xx, 0, 0], [xx, under, dz], .02, baseM); rod(g, [xx, .005, -dz * .6], [xx, .005, dz * .6], .02, baseM); }
            else if (b === 'electric') { box(g, .07, under - .02, .07, baseM, xx, (under - .02) / 2 + .02, 0, .01); box(g, .06, .03, d * .85, baseM, xx, .015, 0, .008); box(g, .05, .03, d * .8, baseM, xx, under - .015, 0, .006); }
            else { rod(g, [xx, 0, -dz], [xx, 0, dz], .012, baseM); rod(g, [xx, 0, -dz], [xx, under, -dz], .012, baseM); rod(g, [xx, 0, dz], [xx, under, dz], .012, baseM); rod(g, [xx, under - .01, -dz], [xx, under - .01, dz], .012, baseM); }
          });
          if (b === 'trestle') box(g, w - 2 * Math.min(.25, w * .18), .05, .04, baseM, 0, under * .35, 0, .006);
          if (b === 'electric') box(g, w - 2 * Math.min(.25, w * .18), .05, .05, baseM, 0, under - .03, 0, .006);
        } else if (b === 'slab') {
          var px = w / 2 - .08;
          [-1, 1].forEach(function (sx) { box(g, .05, under, d - .08, baseM, sx * px, under / 2, 0, .006); });
          if (s === 'console' || s === 'coffee') box(g, w - .2, .025, d - .1, baseM, 0, under * .22, 0, .004);
        } else if (b === 'drum') { var dc = cyl(g, Math.min(w, d) * .36, Math.min(w, d) * .36, under, baseM, 0, under / 2, 0, 40); dc.scale.x = isRound ? 1 : w / d * .8; }
        else if (b === 'cshape') { box(g, .04, under, .06, baseM, 0, under / 2, -d / 2 + .04, .004); box(g, w * .7, .02, d * .9, baseM, 0, .01, -d * .12, .004); top.position.z += d * .15; }
        // tambahan
        var ex2 = c.extras || [];
        if (ex2.indexOf('shelf') >= 0) slab(g, topShapeOf(w * .82, d * .82), .02, topM, under * .22, .002, 1);
        var nd = +c.drawers || (ex2.indexOf('drawer') >= 0 ? 1 : 0);
        for (var k = 0; k < nd; k++) { var dw = (w * .8) / Math.max(1, nd); box(g, dw - .01, .09, .02, topM === glass() ? WOOD() : topM, -w * .4 + dw * (k + .5), under - .055, d / 2 - .06, .004); box(g, .08, .008, .012, METAL(), -w * .4 + dw * (k + .5), under - .05, d / 2 - .045, .003); }
        if (ex2.indexOf('cable') >= 0) cyl(g, .03, .03, .004, dark(), w * .3, h + .001, -d * .25, 24);
        if (ex2.indexOf('socket') >= 0) box(g, .2, .004, .05, dark('#2a2522'), -w * .2, h + .002, -d * .3, .002);
        if (ex2.indexOf('lazy') >= 0) cyl(g, Math.min(w, d) * .25, Math.min(w, d) * .25, .02, topM, 0, h + .01, 0, 40);
        if (ex2.indexOf('extend') >= 0) [-1, 1].forEach(function (sx) { box(g, .003, .002, d * .98, dark(), sx * w * .12, h + .001, 0, 0); });
        if (ex2.indexOf('modesty') >= 0) box(g, w - .2, under * .45, .02, topM, 0, under * .7, -d / 2 + .08, .004);
        if (ex2.indexOf('monitor') >= 0) { box(g, w * .55, .025, .24, topM, 0, h + .12, -d / 2 + .14, .004); [-1, 1].forEach(function (sx) { box(g, .025, .1, .2, topM, sx * w * .26, h + .05, -d / 2 + .14, .003); }); }
        if (ex2.indexOf('led') >= 0) box(g, w * .8, .008, .008, glow(), 0, under - .005, d / 2 - .1, 0);
        if (ex2.indexOf('lift') >= 0) box(g, w * .98, .003, d * .5, dark(), 0, h + .001, 0, 0);
        if (s === 'desk' && shp === 'executive') { box(g, .45, under - .05, d - .1, topM === glass() ? WOOD() : topM, w / 2 - .3, (under - .05) / 2, 0, .006); for (var q = 0; q < 3; q++) box(g, .42, .18, .02, WOOD(), w / 2 - .3, .12 + q * .22, d / 2 - .04, .004); }
        place(g, x || 0, z || 0);
      }
      if (shp === 'nesting') { shp = 'round'; oneTable(W * .62, W * .62, H, -W * .2, 0); oneTable(W * .5, W * .5, H * .8, W * .26, D * .18); }
      else oneTable(W, D, H, 0, 0);
    }

    /* ---------------- KABINET */
    function cabinet() {
      var s = c.sub, W = cm(c.w, 180), D = cm(c.d, 45), Hh = cm(c.h, 80);
      var pnl = X.find(X.PANEL, c.panel) || X.PANEL[0];
      var fin = c.finish || 'veneer';
      var FM = fin === 'hpl' || fin === 'duco' || fin === 'gloss' ? paint(pnl.hex, fin === 'gloss', pnl.grain) : fin === 'fluted' ? fluted(woodHex) : WOOD();
      var bodyM = fin === 'cane' ? WOOD() : FM, inner = dark('#1b1714');
      var mount = c.mount || 'legs', y0 = 0, legM = /^(round|hairpin|sled)$/.test(c.leg) ? METAL() : WOOD();
      if (mount === 'legs') y0 = baseFor(root, c.leg || 'tapered', W, D, cm(c.legH, 12), legM);
      else if (mount === 'plinth') y0 = baseFor(root, 'plinth', W, D, 0, legM);
      else if (mount === 'castor') { y0 = .08; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { leg(root, 'castor', q[0] * (W / 2 - .06), q[1] * (D / 2 - .06), .08, METAL()); }); }
      else if (mount === 'floating') y0 = s === 'tv' ? .32 : s === 'nightstand' ? .3 : s === 'wardrobe' ? .02 : .4;
      var H = Hh, fz = D / 2 + .009, gap = .004;
      box(root, W, H, D, bodyM, 0, y0 + H / 2, 0, .006);
      var hasMetal = /^(bar|knob)$/.test(c.handle), HM = hasMetal ? METAL() : dark('#2a211b');
      function handle(x, y, w, h, vertical, drawer) {
        var hd = c.handle || 'grip';
        if (hd === 'push') return;
        if (hd === 'grip') { box(root, Math.min(w * .9, .5), .012, .012, dark('#0f0c0a'), x, y + h / 2 - .01, fz + .006, .003); return; }
        if (hd === 'bar') { if (vertical && !drawer) rod(root, [x, y - .08, fz + .03], [x, y + .08, fz + .03], .006, HM); else rod(root, [x - Math.min(.12, w * .3), y, fz + .03], [x + Math.min(.12, w * .3), y, fz + .03], .006, HM); return; }
        if (hd === 'knob') { sphere(root, .014, HM, x, y, fz + .025); return; }
        if (hd === 'tab') { box(root, .03, .05, .006, dark('#5a3b26'), x, y + h / 2 - .02, fz + .012, .002); return; }
        if (hd === 'recessed') box(root, .08, .022, .006, dark('#0f0c0a'), x, y + h / 2 - .04, fz + .002, .006);
      }
      function front(x, y, w, h, kind, hx) {
        // kind: door | drawer | niche | glass | flip
        if (kind === 'niche') {
          // bukaan: bidang gelap di muka badan + bingkai tipis yang menonjol → terbaca sebagai ruang terbuka
          box(root, w - .02, h - .02, .004, inner, x, y, D / 2 + .002, .001);
          var fr = .016, fd = .016;
          box(root, w, fr, fd, bodyM, x, y + h / 2 - fr / 2, D / 2 + fd / 2, .002);
          box(root, w, fr, fd, bodyM, x, y - h / 2 + fr / 2, D / 2 + fd / 2, .002);
          box(root, fr, h, fd, bodyM, x - w / 2 + fr / 2, y, D / 2 + fd / 2, .002);
          box(root, fr, h, fd, bodyM, x + w / 2 - fr / 2, y, D / 2 + fd / 2, .002);
          if (s === 'bookshelf' || h > .45) box(root, w - .02, .006, .01, dark('#2a2420'), x, y - h / 2 + fr + .004, D / 2 + .006, .001);
          if ((c.interior || []).indexOf('led') >= 0) box(root, w * .8, .006, .006, glow(), x, y + h / 2 - .028, D / 2 + .006, 0);
          return;
        }
        var mat = fin === 'cane' && kind === 'door' ? cane('#d8bf8f') : kind === 'glass' ? glass() : FM;
        if (kind === 'glass') { box(root, w - .02, h - .02, .01, inner, x, y, fz - .03, .002); box(root, w - gap, h - gap, .018, WOOD(), x, y, fz - .001, .003).scale.set(1, 1, .4); }
        var f = box(root, w - gap, h - gap, .018, mat, x, y, fz, .003);
        if (kind === 'glass') f.castShadow = false;
        if (fin === 'cane' && kind === 'door') { [-1, 1].forEach(function (q) { box(root, .035, h - gap, .022, WOOD(), x + q * (w / 2 - .02), y, fz + .002, .003); box(root, w - gap, .035, .022, WOOD(), x, y + q * (h / 2 - .02), fz + .002, .003); }); }
        handle(hx == null ? x : hx, y, w, h, kind !== 'drawer', kind === 'drawer');
      }
      var doors = c.doorType === 'none' ? 0 : Math.max(1, +c.doors || 1), drawers = +c.drawers || 0, niches = +c.niches || 0;
      var dt = c.doorType || 'swing', open = dt === 'open', doorKind = dt === 'glass' ? 'glass' : 'door';
      var x0 = -W / 2 + .015, IW = W - .03, ybot = y0 + .015, IH = H - .03;
      if (s === 'wardrobe') {
        var band = drawers ? Math.min(.5, drawers * .2) : 0;
        if (band) { var cols = Math.max(1, Math.min(drawers, Math.ceil(doors / 2) || 1)); for (var dc = 0; dc < cols; dc++) front(x0 + IW * (dc + .5) / cols, ybot + band / 2, IW / cols, band, 'drawer'); }
        var dh = IH - band, dyc = ybot + band + dh / 2;
        if (dt === 'sliding') { var np = Math.max(2, Math.min(3, doors)); for (var sp = 0; sp < np; sp++) { var sw = IW / np + .03, fx = x0 + IW * (sp + .5) / np; var pf = box(root, sw, dh - gap, .02, FM, fx, dyc, fz + (sp % 2 ? .025 : 0), .003); handle(fx + (sp % 2 ? -1 : 1) * (sw / 2 - .05), dyc, sw, dh, true); } }
        else for (var di = 0; di < doors; di++) {
          var w1 = IW / doors, cx = x0 + w1 * (di + .5), hx = cx + (di % 2 ? -1 : 1) * (w1 / 2 - .05);
          if (open) front(cx, dyc, w1, dh, 'niche'); else front(cx, dyc, w1, dh, doorKind, hx);
          if (dt === 'folding' && !open) box(root, .004, dh - .01, .004, dark(), cx, dyc, fz + .01, 0);
        }
        if ((c.interior || []).indexOf('mirror') >= 0 && dt !== 'sliding' && !open) box(root, IW / doors - .08, dh * .8, .004, metal({ id: 'mirror', hex: '#c8ccce', rough: .04 }), x0 + IW / doors / 2, dyc, fz + .011, .002);
      } else if (s === 'bookshelf') {
        var lower = c.lowerDoors === 'yes' ? Math.min(.8, IH * .36) : 0, colsB = Math.max(1, Math.min(6, doors || Math.round(W / .8)));
        if (lower) for (var lc = 0; lc < colsB; lc++) front(x0 + IW * (lc + .5) / colsB, ybot + lower / 2, IW / colsB, lower, 'door');
        var top0 = ybot + lower, rows = Math.max(1, Math.round((IH - lower) / .36)), rh = (IH - lower) / rows;
        box(root, IW, IH - lower, .01, inner, 0, top0 + (IH - lower) / 2, -D / 2 + .02, .002);
        for (var r = 0; r < rows; r++) for (var cc = 0; cc < colsB; cc++) front(x0 + IW * (cc + .5) / colsB, top0 + rh * (r + .5), IW / colsB, rh, 'niche');
        for (var vv = 1; vv < colsB; vv++) box(root, .02, IH - lower, D - .02, bodyM, x0 + IW * vv / colsB, top0 + (IH - lower) / 2, 0, .002);
      } else if (s === 'nightstand') {
        var nRows = drawers + niches || 1, rhN = IH / nRows;
        for (var nr = 0; nr < nRows; nr++) front(0, ybot + IH - rhN * (nr + .5), IW, rhN, nr < drawers ? 'drawer' : 'niche');
      } else if (s === 'shoe' && dt === 'flip') {
        var rowsS = Math.max(2, Math.min(4, Math.round(IH / .4))), colsS = Math.max(1, doors);
        for (var rs = 0; rs < rowsS; rs++) for (var cs = 0; cs < colsS; cs++) front(x0 + IW * (cs + .5) / colsS, ybot + IH * (rs + .5) / rowsS, IW / colsS, IH / rowsS, 'door');
      } else {
        // tv · sideboard · shoe (engsel/geser): baris kolom = pintu kiri | laci | niche | pintu kanan
        var bays = [], half = Math.ceil(doors / 2);
        for (var a = 0; a < half; a++) bays.push(open ? 'niche' : doorKind);
        if (drawers) bays.push('drawers');
        for (var b2 = 0; b2 < niches; b2++) bays.push('niche');
        for (var a2 = half; a2 < doors; a2++) bays.push(open ? 'niche' : doorKind);
        if (!bays.length) bays.push('drawers');
        var bw = IW / bays.length;
        bays.forEach(function (k, i) {
          var cx2 = x0 + bw * (i + .5);
          if (k === 'drawers') { var nd = Math.max(1, drawers); for (var q = 0; q < nd; q++) front(cx2, ybot + IH - IH / nd * (q + .5), bw, IH / nd, 'drawer'); }
          else if (dt === 'sliding' && k !== 'niche') { box(root, bw + .02, IH - gap, .018, FM, cx2, ybot + IH / 2, fz + (i % 2 ? .022 : 0), .003); handle(cx2 + (i % 2 ? -1 : 1) * (bw / 2 - .04), ybot + IH / 2, bw, IH, true); }
          else front(cx2, ybot + IH / 2, bw, IH, k, cx2 + (i < half ? 1 : -1) * (bw / 2 - .05));
        });
      }
      if ((c.interior || []).indexOf('led') >= 0 && mount === 'floating') box(root, W * .9, .006, .006, glow(), 0, y0 - .004, D / 2 - .1, 0);
    }

    /* ---------------- DIVAN */
    function bed() {
      var s = c.sub, MW = (+c.mattress || 160) / 100, ML = 2, W = MW + .06, L = 2.06, Hb = cm(c.h, 30), F = FAB(), Wd = WOOD();
      var mount = s === 'platform' ? 'legs' : c.mount || 'plinth', y0 = 0;
      var hbOnly = s === 'headboard';
      var BM = s === 'platform' ? Wd : F;
      var legM = c.legFinish === 'metal' ? METAL() : Wd;
      var g = new T.Group(); root.add(g);
      if (hbOnly) { box(g, W, Hb, L, ghost(), 0, Hb / 2, 0, .02).castShadow = false; }
      else {
        if (mount === 'plinth') { box(g, W - .08, .06, L - .08, dark('#1f1a16'), 0, .03, 0, .004); y0 = .06; }
        else if (mount === 'floating') { box(g, W - .5, .1, L - .5, dark(), 0, .05, 0, .004); box(g, W - .52, .006, .006, glow(), 0, .012, L / 2 - .26, 0); box(g, .006, .006, L - .52, glow(), W / 2 - .26, .012, 0, 0); box(g, .006, .006, L - .52, glow(), -W / 2 + .26, .012, 0, 0); y0 = .1; }
        else { y0 = cm(c.legH, 12); var ix = W / 2 - .07, iz = L / 2 - .07; [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz], [-ix, 0], [ix, 0]].forEach(function (q) { leg(g, c.leg || 'tapered', q[0], q[1], y0, legM); }); }
        if (s === 'platform') { var ft = .04, hh = Math.max(.12, Hb - y0); box(g, ft, hh, L, Wd, -W / 2 + ft / 2, y0 + hh / 2, 0, .005); box(g, ft, hh, L, Wd, W / 2 - ft / 2, y0 + hh / 2, 0, .005); box(g, W, hh, ft, Wd, 0, y0 + hh / 2, L / 2 - ft / 2, .005); box(g, W - .08, .03, L - .08, Wd, 0, y0 + hh - .1, 0, .003); }
        else box(g, W, Hb - y0, L, BM, 0, y0 + (Hb - y0) / 2, 0, .02);
        var st = c.storage || 'none';
        if (st === 'd2' || st === 'd4') {
          var per = st === 'd2' ? 1 : 2;
          [-1, 1].forEach(function (sx) { for (var k = 0; k < per; k++) { var dl = (L - .5) / per, zc = -L / 2 + .35 + dl * (k + .5); box(g, .012, Hb - y0 - .06, dl - .02, BM, sx * (W / 2 + .004), y0 + (Hb - y0) / 2, zc, .004); box(g, .008, .02, .1, dark(), sx * (W / 2 + .012), y0 + (Hb - y0) - .05, zc, .003); } });
        }
        if (st === 'lift') box(g, W + .003, .004, L + .003, dark(), 0, Hb - .04, 0, .002);
        var mt = Hb + (s === 'platform' ? -.08 : 0);
        box(g, MW, .26, ML, linen(), 0, mt + .13, .02, .06);
        var np = MW < 1.1 ? 1 : 2;
        for (var p = 0; p < np; p++) box(g, Math.min(.66, MW / np - .06), .13, .4, linen(), -MW / 2 + MW * (p + .5) / np, mt + .32, -ML / 2 + .3, .06).rotation.x = -.18;
        box(g, MW + .04, .045, .55, fabric(contrast(colorHex) === '#2b2a29' ? '#8c7a66' : '#b8a68a', 'linen'), 0, mt + .27, ML / 2 - .4, .02);
      }
      // headboard
      var hb = c.headboard || 'panel', hbH = cm(c.hbH, 110), hw = c.hbW === 'wide' ? W + 1 : W + .04, hz = -L / 2 - .05;
      if (hb !== 'none') {
        if (hb === 'woodpanel') box(g, hw, hbH, .04, Wd, 0, hbH / 2, hz, .006);
        else if (hb === 'slat') { var ns = Math.round(hw / .08); for (var i = 0; i < ns; i++) box(g, .05, hbH, .03, Wd, -hw / 2 + hw * (i + .5) / ns, hbH / 2, hz, .005); box(g, hw, .05, .03, Wd, 0, hbH * .5, hz - .03, .004); }
        else if (hb === 'arch') { var sh = new T.Shape(), r = hw / 2; sh.moveTo(-r, 0); sh.lineTo(-r, hbH - r * .6); sh.quadraticCurveTo(-r, hbH, 0, hbH); sh.quadraticCurveTo(r, hbH, r, hbH - r * .6); sh.lineTo(r, 0); sh.lineTo(-r, 0); var geo = new T.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 4, curveSegments: 40 }); var m = mesh(geo, F, g); m.position.z = hz - .05; }
        else {
          box(g, hw, hbH, .08, F, 0, hbH / 2, hz, .03);
          var top = hbH, bot = Math.max(Hb + .25, .45);
          if (hb === 'channel') { var k = Math.max(5, Math.round(hw / .13)); for (var j = 0; j < k; j++) box(g, hw / k - .005, top - bot - .04, .07, F, -hw / 2 + hw * (j + .5) / k, (top + bot) / 2, hz + .06, .032); }
          if (hb === 'button') { var cols = Math.max(4, Math.round(hw / .2)), rows = 3; for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols - (rr % 2); cc++) sphere(g, .01, F, -hw / 2 + hw * (cc + .5 + (rr % 2) * .5) / cols, bot + (top - bot) * (rr + .6) / (rows + .2), hz + .045); }
          if (hb === 'wingback') [-1, 1].forEach(function (sx) { var wg = box(g, .1, hbH * .92, .38, F, sx * (hw / 2 - .02), hbH * .46, hz + .18, .04); wg.rotation.y = sx * .3; });
        }
        var ex = c.extras || [];
        if (ex.indexOf('readlamp') >= 0) [-1, 1].forEach(function (sx) { rod(g, [sx * (W / 2 - .15), hbH - .1, hz + .05], [sx * (W / 2 - .15), hbH - .1, hz + .2], .006, METAL()); sphere(g, .03, glow(), sx * (W / 2 - .15), hbH - .13, hz + .2); });
        if (ex.indexOf('usb') >= 0) [-1, 1].forEach(function (sx) { box(g, .05, .08, .01, dark(), sx * (W / 2 - .05), Hb + .32, hz + .06, .003); });
      }
      var ex2 = c.extras || [];
      if (!hbOnly && ex2.indexOf('bench') >= 0) box(g, W * .72, .42, .42, F, 0, .21, L / 2 + .33, .04);
      if (ex2.indexOf('nightstand') >= 0) [-1, 1].forEach(function (sx) { var nx = sx * (Math.max(W, hw) / 2 + .28); box(g, .48, .5, .4, Wd, nx, .3, hz + .25, .006); box(g, .46, .2, .012, Wd, nx, .42, hz + .45, .003); [-1, 1].forEach(function (q) { leg(g, 'tapered', nx + q * .2, hz + .1, .05, Wd); leg(g, 'tapered', nx + q * .2, hz + .4, .05, Wd); }); });
    }

    var sub = c.sub;
    if (c.cat === 'kursi') ({ sofa: sofa, armchair: armchair, bench: bench, dining: dining, stool: stool, ottoman: ottoman }[sub] || sofa)();
    else if (c.cat === 'meja') table();
    else if (c.cat === 'kabinet') cabinet();
    else bed();

    return {
      group: root,
      dispose: function () { made.forEach(function (o) { if (o && o.dispose) o.dispose(); }); made = []; }
    };
  }

  window.XMAKER = { build: build };
})();
