/* ==========================================================================
   Maison XIONCO v5 — Customize: pembuat model 3D parametrik
   XMAKER.build(cfg, kit) → { group, dispose }
   Satu fungsi per jenis (sofa, armchair, bench, kursi makan, stool, ottoman,
   meja, kabinet, divan). Satuan meter, lantai di y = 0, depan menghadap +Z.
   SETIAP pilihan di panel Customize (custom-spec.js) harus terlihat di model:
   bentuk, ukuran, material, kaki, lengan, sandaran, isian & kekerasan bantal,
   jahitan (piping / double / benang kontras), tambahan, isi dalam kabinet, dll.
   Audit otomatis: setiap opsi dibandingkan "sidik" geometri+material-nya.
   kit = { T, rbox, col } dari world.js (Three.js r147).
   Kursi & sofa dibangun dari komponen js/parts.js (window.XPARTS): kaki bubut/kerucut/bun/splay,
   base (plinth, platform, rangka besi, rok, swivel, pedestal, goyang), profil lengan, sandaran
   bergelombang, tufting (channel/biscuit/kancing/diamond), bantal CC0 & bolster, paku hias.
   ========================================================================== */
(function () {
  'use strict';
  var TEX = {};   // tekstur kanvas — dibuat sekali, dipakai ulang (UV dalam meter)

  function canvasTex(T, key, w, h, draw, rep) {
    if (TEX[key]) return TEX[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 16;
    t.wrapS = t.wrapT = T.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    TEX[key] = t; return t;
  }
  // cache geometri bantal & jahitan (sisi CPU): dibuang dari GPU saat dispose, dipakai ulang bila parameternya sama
  var GEO = {}, GEOK = [];
  function cachedGeo(key, make) {
    var g = GEO[key]; if (g) return g;
    g = make(); GEO[key] = g; GEOK.push(key);
    if (GEOK.length > 600) { var k = GEOK.shift(), old = GEO[k]; delete GEO[k]; if (old) old.dispose(); }
    return g;
  }
  var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  // repeat = jumlah ulangan per meter (UV dihitung dalam meter oleh uvBox)
  var TX = {
    weave: function (T) {
      return canvasTex(T, 'weave', 512, 512, function (g, w, h) {
        g.fillStyle = '#cfcac3'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 2) { g.fillStyle = 'rgba(70,64,58,' + (0.06 + rnd() * .1) + ')'; g.fillRect(0, y, w, 1); }
        for (var x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,248,236,' + (0.03 + rnd() * .05) + ')'; g.fillRect(x, 0, 1, h); }
        for (var i = 0; i < 320; i++) { g.fillStyle = 'rgba(' + (rnd() > .5 ? '255,250,240' : '60,54,48') + ',' + (.05 + rnd() * .09).toFixed(3) + ')'; g.fillRect(rnd() * w, Math.floor(rnd() * h / 2) * 2, 6 + rnd() * 34, 1); }
      }, [5, 5]);
    },
    boucle: function (T) {
      return canvasTex(T, 'boucle', 512, 512, function (g, w, h) {
        g.fillStyle = '#c9c4bc'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 5200; i++) { var x = rnd() * w, y = rnd() * h, r = 2.5 + rnd() * 5; g.strokeStyle = 'rgba(' + (rnd() > .5 ? '255,250,240' : '80,74,66') + ',' + (.25 + rnd() * .3).toFixed(3) + ')'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
      }, [4, 4]);
    },
    leather: function (T) {
      return canvasTex(T, 'leather', 512, 512, function (g, w, h) {
        g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 9000; i++) { g.fillStyle = 'rgba(' + (rnd() > .5 ? '255,255,255' : '0,0,0') + ',' + (.05 + rnd() * .12).toFixed(3) + ')'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, .8 + rnd() * 2.6, .6 + rnd() * 1.8, rnd() * 3, 0, Math.PI * 2); g.fill(); }
      }, [4, 4]);
    },
    grain: function (T) {   // kayu solid: serat bergelombang + pori
      return canvasTex(T, 'grain', 1024, 512, function (g, w, h) {
        g.fillStyle = '#d2bc9c'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 300; i++) {
          var y = rnd() * h; g.strokeStyle = 'rgba(70,46,26,' + (.03 + rnd() * .1).toFixed(3) + ')'; g.lineWidth = .6 + rnd() * 2.2;
          g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .006 + i) * (3 + rnd() * 5)); g.stroke();
        }
        for (var k = 0; k < 2200; k++) { g.fillStyle = 'rgba(60,38,20,' + (.08 + rnd() * .15).toFixed(3) + ')'; g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 8, 1); }
      }, [.9, 1.8]);
    },
    veneer: function (T) {  // veneer: serat lurus rapat (quarter cut)
      return canvasTex(T, 'veneer', 1024, 512, function (g, w, h) {
        g.fillStyle = '#d2bc9c'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 1 + rnd() * 3) { g.fillStyle = 'rgba(80,52,30,' + (.02 + rnd() * .09).toFixed(3) + ')'; g.fillRect(0, y, w, .6 + rnd() * 1.6); }
        for (var b = 0; b < 6; b++) { var yb = rnd() * h, hb = 10 + rnd() * 40, gr = g.createLinearGradient(0, yb, 0, yb + hb); gr.addColorStop(0, 'rgba(255,240,215,0)'); gr.addColorStop(.5, 'rgba(255,240,215,.12)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, yb, w, hb); }
      }, [.9, 1.8]);
    },
    fluted: function (T) {
      return canvasTex(T, 'fluted', 64, 8, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(.18, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.82, '#d0d0d0'); gr.addColorStop(1, '#3a3a3a');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, [40, 1]);
    },
    cane: function (T) {
      return canvasTex(T, 'cane', 256, 256, function (g, w, h) {
        g.fillStyle = '#2a211a'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d8bf8f'; g.lineWidth = 6;
        for (var i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
        g.lineWidth = 4.6; for (var y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (var x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      }, [6, 6]);
    },
    stone: function (T, o) {
      return canvasTex(T, 'stone-' + o.id, 1024, 1024, function (g, w, h) {
        g.fillStyle = o.hex; g.fillRect(0, 0, w, h);
        if (o.speck) {
          var cols = ['#7b6e5f', '#b5875b', '#4b4a46', '#cdb89a', '#8f9b84', '#e9e4da'];
          for (var i = 0; i < 6000; i++) { g.fillStyle = cols[i % cols.length]; var r = 1.5 + rnd() * 8; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (.5 + rnd() * .6), rnd() * 3, 0, Math.PI * 2); g.fill(); }
          return;
        }
        for (var k = 0; k < 22; k++) {
          g.strokeStyle = o.vein; g.globalAlpha = .1 + rnd() * .35; g.lineWidth = .8 + rnd() * 4;
          var x = rnd() * w, y = 0; g.beginPath(); g.moveTo(x, y);
          while (y < h) { x += (rnd() - .5) * 80; y += 20 + rnd() * 44; g.lineTo(x, y); }
          g.stroke();
        }
        g.globalAlpha = 1;
      }, [.8, .8]);
    },
    ply: function (T) {   // tepi multiplek: lapisan berselang
      return canvasTex(T, 'ply', 256, 64, function (g, w, h) {
        for (var i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#a88a62' : '#cdb48b'; g.fillRect(0, i * h / 12, w, h / 12 + 1); g.fillStyle = 'rgba(70,48,26,.6)'; g.fillRect(0, i * h / 12, w, 1); }
      }, [2, 55]);
    },
    block: function (T) {  // tepi blockboard: inti balok + muka veneer
      return canvasTex(T, 'block', 512, 64, function (g, w, h) {
        g.fillStyle = '#ddc59c'; g.fillRect(0, 0, w, h);
        for (var x = 0; x < w;) { var bw = 40 + rnd() * 50, v = 150 + Math.floor(rnd() * 40); g.fillStyle = 'rgb(' + (v + 30) + ',' + (v + 2) + ',' + (v - 40) + ')'; g.fillRect(x, 8, bw, h - 16); g.fillStyle = 'rgba(70,48,28,.7)'; g.fillRect(x, 8, 2, h - 16); x += bw; }
        g.fillStyle = 'rgba(70,48,28,.6)'; g.fillRect(0, 7, w, 1); g.fillRect(0, h - 8, w, 1);
      }, [3.3, 55]);
    },
    mdf: function (T) {
      return canvasTex(T, 'mdf', 256, 256, function (g, w, h) {
        g.fillStyle = '#b49a76'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 6000; i++) { g.fillStyle = 'rgba(' + (rnd() > .5 ? '90,66,40' : '220,200,170') + ',' + (.08 + rnd() * .15).toFixed(3) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1); }
      }, [5, 5]);
    },
    hpl: function (T) {    // tekstur doff halus HPL (bump)
      return canvasTex(T, 'hpl', 256, 256, function (g, w, h) {
        g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 7000; i++) { g.fillStyle = 'rgba(' + (rnd() > .5 ? '255,255,255' : '0,0,0') + ',.12)'; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      }, [8, 8]);
    },
    dash: function (T) {   // jahitan putus-putus (alpha)
      return canvasTex(T, 'dash', 64, 8, function (g) { g.clearRect(0, 0, 64, 8); g.fillStyle = '#ffffff'; g.fillRect(4, 1, 38, 6); }, [1, 1]);
    },
    wash: function (T) {   // pendaran LED di dinding belakang
      return canvasTex(T, 'wash', 128, 128, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,205,140,.85)'); gr.addColorStop(.45, 'rgba(255,190,120,.25)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, [1, 1]);
    }
  };

  // konfigurasi kursi lama → model sekarang (salinan; spesifikasi juga menormalkan lewat XC.normalize)
  function normSeat(c0) {
    var c = {}, k; for (k in c0) c[k] = c0[k];
    var arr = function (v) { return Array.isArray(v) ? v.slice() : v && v !== 'off' ? [v] : []; }, s = c.sub;
    c.trim = arr(c.trim); c.extras = arr(c.extras);
    ['backTuft', 'seatTuft', 'topTuft'].forEach(function (g) { if (!c[g] || c[g] === 'off') c[g] = 'plain'; });
    if (s === 'sofa' || s === 'armchair') {
      if (c.back === 'channel') { c.back = 'tight'; if (c.backTuft === 'plain') c.backTuft = 'channelV'; }
      else if (c.back === 'button') { c.back = 'cushion'; if (c.backTuft === 'plain') c.backTuft = 'button'; }
    }
    if (c.leg === 'castor' && /^(sofa|armchair|ottoman|bench|chaise)$/.test(s)) { c.leg = 'tapered'; if (s !== 'bench' && c.trim.indexOf('castor') < 0) c.trim.push('castor'); }
    if (s === 'armchair') { if (c.shape === 'swivel') { c.shape = 'standar'; if (!c.base || c.base === 'legs') c.base = 'swivelDisc'; } if (c.extras.indexOf('rocking') >= 0) { c.extras = c.extras.filter(function (x) { return x !== 'rocking'; }); if (!c.base || c.base === 'legs') c.base = 'rocking'; } }
    if (s === 'dining' && !c.armStyle) c.armStyle = c.arms === 'arms' ? 'carver' : 'none';
    if (s === 'bench') { var bm = { floating: 'plinth', metalplinth: 'plinth', round: 'conic' }; if (bm[c.leg]) c.leg = bm[c.leg]; }
    if (s === 'ottoman') { var om = { hairpin: 'round', sled: 'openFrame' }; if (om[c.leg]) c.leg = om[c.leg]; }
    return c;
  }

  function build(c, kit) {
    var T = kit.T, col = kit.col;
    var made = [];   // geometri & material untuk dibuang saat dibangun ulang
    var keep = function (o) { made.push(o); return o; };
    var root = new T.Group();
    var motions = [];   // bagian bergerak (pintu, laci, panel geser) → world.js menganimasikan
    var X = window.XC;
    var cm = function (v, d) { return (v == null || isNaN(+v) ? d : +v) / 100; };
    var S45 = Math.SQRT1_2;

    /* ---------------- warna bantu (ruang sRGB) */
    function shade(hex, k) { var v = new T.Color(hex); v.r = Math.min(1, v.r * k); v.g = Math.min(1, v.g * k); v.b = Math.min(1, v.b * k); return '#' + v.getHexString(); }
    function lum(hex) { var v = new T.Color(hex); return v.r * .3 + v.g * .59 + v.b * .11; }
    function contrast(hex) { return lum(hex) > .2 ? '#2b2a29' : '#d9ccba'; }

    /* ---------------- material */
    var mcache = {};
    function M(key, make) { if (!mcache[key]) mcache[key] = keep(make()); return mcache[key]; }
    /* tekstur PBR asli (js/texlib.js, CC0): albedo + normal + roughness berskala meter. Material dibuat
       dengan kanvas prosedural sebagai cadangan; set asli menggantikannya begitu termuat. */
    var XT = window.XTEX;
    function TXS(m, set, o) { return XT ? XT.apply(m, set, o) : m; }
    var UPHSET = { boucle: 'fabric-boucle', velvet: 'fabric-velvet', linen: 'fabric-linen', chenille: 'fabric-chenille', pet: 'fabric-pet' };
    // kekuatan relief & roughness per jenis kain (normal map asli menggantikan bump kanvas)
    var UPHN = { 'fabric-boucle': 1.1, 'fabric-velvet': .45, 'fabric-linen': .9, 'fabric-chenille': 1, 'fabric-pet': .7, 'fabric-woven': .85 };
    function woodSet(hex) {
      var w = (X.WOOD || []).filter(function (x) { return x.hex.toLowerCase() === String(hex).toLowerCase(); })[0], id = w ? w.id : '';
      return id === 'ebony' ? 'wood-walnut' : XT && XT.sets['wood-' + id] ? 'wood-' + id : lum(hex) < .2 ? 'wood-walnut' : 'wood-oak';
    }
    function fabric(hex, uphId) {
      var u = X.find(X.UPH, uphId) || X.UPH[0];
      return M('fab' + hex + uphId, function () {
        var base = col(hex);
        if (u.leather) {
          var lt = TX.leather(T), real = uphId === 'leather';
          // kulit: pori halus dari normal map asli, kilau lembut (clearcoat tipis) — tidak seperti plastik
          return TXS(new T.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(.8), bumpMap: lt, bumpScale: real ? .0018 : .0009, roughness: real ? .55 : .46, metalness: 0, clearcoat: real ? .1 : .16, clearcoatRoughness: .5, envMapIntensity: .6 }),
            real ? 'leather-fine' : 'leather-faux', { map: false, normal: real ? 1.2 : .7, rough: real ? .55 : .46 });
        }
        var tex = u.nap === 'boucle' ? TX.boucle(T) : TX.weave(T), set = UPHSET[u.id] || 'fabric-woven';
        var m = new T.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.12), map: tex, bumpMap: tex, bumpScale: u.nap === 'boucle' ? .0045 : .003, roughness: u.nap === 'velvet' ? .82 : .93, metalness: 0, envMapIntensity: .5 });
        // velvet / chenille: kilau serat (sheen) senada warna kain, bukan putih
        if (u.nap === 'velvet') { m.sheen = .75; m.sheenRoughness = .5; m.sheenColor = base.clone().multiplyScalar(1.35).lerp(new T.Color(1, 1, 1), .06); m.color.multiplyScalar(.92); }
        else { m.sheen = .35; m.sheenRoughness = .7; m.sheenColor = base.clone().lerp(new T.Color(1, 1, 1), .35); }
        return TXS(m, set, { normal: UPHN[set], rough: m.roughness });
      });
    }
    // kind: solid (serat bergelombang) | veneer (serat lurus) ; coat: lapisan anti noda (clearcoat)
    function wood(hex, kind, coat) {
      kind = kind || 'solid';
      return M('wood' + hex + kind + (coat ? 'c' : ''), function () {
        var o = { color: col(hex).multiplyScalar(1.15), map: kind === 'veneer' ? TX.veneer(T) : TX.grain(T), roughness: kind === 'veneer' ? .42 : .55, metalness: 0, envMapIntensity: .7 }, m;
        if (coat) { o.clearcoat = .9; o.clearcoatRoughness = .08; o.envMapIntensity = .9; m = new T.MeshPhysicalMaterial(o); }
        else m = new T.MeshStandardMaterial(o);
        return TXS(m, woodSet(hex), { normal: .35, rough: o.roughness, done: function (mt) { mt.color.multiplyScalar(.9); } });
      });
    }
    // logam: brushed (normal + roughness asli) untuk kuningan, champagne, stainless, gunmetal; powder coat & krom polos
    var BRUSH = /^(brass|champagne|stainless|gunmetal)$/;
    function metal(o) { o = o || X.METAL[0]; return M('metal' + o.id, function () { var m = new T.MeshStandardMaterial({ color: col(o.hex), roughness: o.rough || .35, metalness: o.id === 'ivory' ? .2 : 1, envMapIntensity: 1.1 }); return BRUSH.test(o.id) ? TXS(m, 'metal-brushed', { normal: .25, rough: m.roughness }) : m; }); }
    // mode: hpl (doff bertekstur) | duco (cat satin) | gloss
    function paint(hex, mode, grain, coat) {
      if (mode === true) mode = 'gloss'; else if (!mode) mode = 'hpl';
      return M('paint' + hex + mode + grain + (coat ? 'c' : ''), function () {
        var o = { color: col(hex).multiplyScalar(grain ? 1.15 : 1), map: grain ? TX.grain(T) : null, roughness: mode === 'gloss' ? .12 : mode === 'duco' ? .34 : .62, metalness: 0, envMapIntensity: mode === 'gloss' ? 1 : mode === 'duco' ? .8 : .55 }, m;
        if (mode === 'hpl') { o.bumpMap = TX.hpl(T); o.bumpScale = .0006; }
        if (coat || mode === 'gloss') { o.clearcoat = coat ? .9 : .6; o.clearcoatRoughness = .08; m = new T.MeshPhysicalMaterial(o); }
        else m = new T.MeshStandardMaterial(o);
        // motif kayu (HPL / duco bercorak): hanya albedo serat asli, permukaan tetap rata
        return grain ? TXS(m, woodSet(hex), { normal: false, done: function (mt) { mt.color.multiplyScalar(.9); } }) : m;
      });
    }
    var STONESET = { carrara: 'stone-carrara', calacatta: 'stone-calacatta', nero: 'stone-nero', travertine: 'stone-travertine', terrazzo: 'stone-terrazzo', slate: 'stone-slate' };
    function stone(o, coat) {
      return M('stone' + o.id + (coat ? 'c' : ''), function () {
        var r = o.id === 'travertine' ? .4 : o.id === 'terrazzo' ? .3 : .2, p = { map: TX.stone(T, o), roughness: r, metalness: 0, envMapIntensity: .9 }, m;
        if (coat) { p.clearcoat = 1; p.clearcoatRoughness = .04; m = new T.MeshPhysicalMaterial(p); } else m = new T.MeshStandardMaterial(p);
        return STONESET[o.id] ? TXS(m, STONESET[o.id], { rough: r }) : m;
      });
    }
    function glass(coat) { return M('glass' + (coat ? 'c' : ''), function () { return new T.MeshPhysicalMaterial({ color: col(coat ? '#a6bab8' : '#9fb0ad'), roughness: .05, metalness: 0, transparent: true, opacity: .32, envMapIntensity: coat ? 1.6 : 1.2, clearcoat: coat ? 1 : 0, depthWrite: false }); }); }
    function dark(hex) { return M('dark' + (hex || ''), function () { return new T.MeshStandardMaterial({ color: col(hex || '#141110'), roughness: .8, metalness: 0 }); }); }
    function glow(hex) { return M('glow' + (hex || ''), function () { return new T.MeshBasicMaterial({ color: col(hex || '#ffcf8f'), toneMapped: false }); }); }
    function wash() { return M('wash', function () { return new T.MeshBasicMaterial({ map: TX.wash(T), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }); }); }
    function cane(hex) { return M('cane' + hex, function () { var m = new T.MeshStandardMaterial({ color: col(hex || '#d8bf8f').multiplyScalar(1.1), map: TX.cane(T), roughness: .7 }); return TXS(m, 'weave-rattan', { normal: .9, rough: .7, done: function (mt) { mt.color.multiplyScalar(.85); } }); }); }
    function fluted(hex) { return M('flute' + hex, function () { var m = new T.MeshStandardMaterial({ color: col(hex).multiplyScalar(1.15), map: TX.grain(T), bumpMap: TX.fluted(T), bumpScale: .02, roughness: .55, envMapIntensity: .7 }); m.userData.uvx = true; return TXS(m, woodSet(hex), { normal: false, done: function (mt) { mt.color.multiplyScalar(.9); } }); }); }
    function linen() { return M('linen', function () { var t = TX.weave(T); return TXS(new T.MeshPhysicalMaterial({ color: col('#e8e2d6'), map: t, bumpMap: t, bumpScale: .003, roughness: .95, sheen: .3, sheenColor: new T.Color(1, 1, 1), envMapIntensity: .5 }), 'fabric-linen', { normal: .7, rough: .95 }); }); }
    function ghost() { return M('ghost', function () { return new T.MeshStandardMaterial({ color: col('#8a7f70'), transparent: true, opacity: .18, roughness: .9, depthWrite: false }); }); }
    function felt() { return M('felt', function () { return new T.MeshStandardMaterial({ color: col('#bdb3a3'), roughness: 1 }); }); }
    function chrome() { return metal({ id: 'chrome', hex: '#d6d6d4', rough: .12 }); }
    function mirrorM() { return metal({ id: 'mirror', hex: '#c8ccce', rough: .04 }); }
    function thread(hex, dashed) { return M('thr' + hex + (dashed ? 'd' : ''), function () { return new T.MeshStandardMaterial({ color: col(hex), roughness: .75, map: dashed ? TX.dash(T) : null, alphaTest: dashed ? .5 : 0 }); }); }
    function edgeMat(kind) {
      if (kind === 'solid') return wood(woodHex, 'solid');
      return M('edge' + kind, function () { return new T.MeshStandardMaterial({ map: kind === 'blockboard' ? TX.block(T) : kind === 'mdf' ? TX.mdf(T) : TX.ply(T), roughness: kind === 'mdf' ? .85 : .6, metalness: 0, envMapIntensity: .5 }); });
    }

    if (c && c.cat === 'kursi') { if (window.XPARTS) { XPARTS.lastCfg = c; XPARTS.lastPillows = +c.pillows > 0; } c = normSeat(c); }
    var colorHex = (X.colorOf(c) || {}).hex || '#4d4d4d';
    // warna kedua (trim dua warna): warna dari daftar kain yang sama; tanpa pilihan → nada kontras lembut
    var colorHex2 = (function () { var u = X.find(X.UPH, c.uph) || X.UPH[0], all = [u].concat(X.UPH), i, k; for (i = 0; i < all.length; i++) { var cs = all[i].colors || []; for (k = 0; k < cs.length; k++) if (cs[k].id === c.color2 && cs[k].hex.toLowerCase() !== colorHex.toLowerCase()) return cs[k].hex; } return lum(colorHex) > .35 ? shade(colorHex, .45) : shade(colorHex, 2.1); })();
    var FAB2 = function () { return (c.trim || []).indexOf('twoTone') >= 0 ? fabric(colorHex2, c.uph || 'vienna') : FAB(); };
    var FAB = function () { return fabric(colorHex, c.uph || 'vienna'); };
    var woodHex = (X.find(X.WOOD, c.wood) || X.WOOD[0]).hex;
    var WOOD = function () { return wood(woodHex, 'solid'); };
    var METAL = function () { return metal(X.find(X.METAL, c.metal)); };
    var LEGM = function () { return /^(conic|pin|openFrame|xmetal)$/.test(c.leg) ? METAL() : c.legFinish === 'same' ? FAB() : c.legFinish === 'metal' || /^(round|hairpin|sled|uSled)$/.test(c.leg) && c.legFinish !== 'wood' ? METAL() : WOOD(); };

    /* ---------------- geometri */
    // UV kotak dalam meter: arah u mengikuti sisi terpanjang (serat kayu searah panjang benda)
    function uvBox(geo, ux) {
      var p = geo.attributes.position, n = geo.attributes.normal; if (!p || !n) return;
      var uv = geo.attributes.uv; if (!uv || uv.count !== p.count) { uv = new T.BufferAttribute(new Float32Array(p.count * 2), 2); geo.setAttribute('uv', uv); }
      if (!geo.boundingBox) geo.computeBoundingBox();
      var bb = geo.boundingBox, ex = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z], P = p.array, N = n.array, U = uv.array;
      for (var i = 0, j = 0; i < P.length; i += 3, j += 2) {
        var ax = Math.abs(N[i]), ay = Math.abs(N[i + 1]), az = Math.abs(N[i + 2]), a = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2, b, cc;
        if (ux) { b = a === 0 ? 2 : 0; cc = a === 1 ? 2 : 1; }
        else { b = (a + 1) % 3; cc = (a + 2) % 3; if (ex[cc] > ex[b]) { var t = b; b = cc; cc = t; } }
        U[j] = P[i + b]; U[j + 1] = P[i + cc];
      }
      uv.needsUpdate = true;
    }
    function mesh(geo, mat, parent, rawUV) {
      if (!rawUV && mat && (mat.map || mat.bumpMap || mat.userData.tex)) uvBox(geo, mat.userData.uvx);
      var m = new T.Mesh(keep(geo), mat); m.castShadow = true; m.receiveShadow = true; (parent || root).add(m); return m;
    }
    function box(p, w, h, d, mat, x, y, z, r) {
      r = Math.max(0, Math.min(r == null ? .006 : r, w / 2 - .0005, h / 2 - .0005, d / 2 - .0005));
      var geo = r > .001 && kit.rbox ? kit.rbox(w, h, d, r, r <= .004 ? 1 : r <= .012 ? 2 : r <= .03 ? 4 : 5) : new T.BoxGeometry(w, h, d);
      var m = mesh(geo, mat, p); m.position.set(x || 0, y || 0, z || 0); return m;
    }
    function cyl(p, rt, rb, h, mat, x, y, z, seg) { var m = mesh(new T.CylinderGeometry(rt, rb, h, seg || 24), mat, p); m.position.set(x || 0, y || 0, z || 0); return m; }
    function rod(p, a, b, r, mat, seg) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]), L = A.distanceTo(B);
      var m = mesh(new T.CylinderGeometry(r, r, L, seg || 12), mat, p);
      m.position.copy(A).add(B).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      return m;
    }
    function sphere(p, r, mat, x, y, z) { var m = mesh(new T.SphereGeometry(r, 12, 8), mat, p); m.position.set(x, y, z); return m; }
    function torus(p, R, r, mat, x, y, z, arc, seg) { var m = mesh(new T.TorusGeometry(R, r, 8, seg || 48, arc || Math.PI * 2), mat, p); m.position.set(x || 0, y || 0, z || 0); return m; }
    // pelat dari bentuk 2D (x, z) setebal t, alas di y0; bevel = profil tepi
    function slab(p, shape, t, mat, y0, bev, bevSeg) {
      bev = Math.min(bev || 0, t / 2 - .001);
      var geo = new T.ExtrudeGeometry(shape, { depth: Math.max(.001, t - 2 * bev), bevelEnabled: bev > .0005, bevelThickness: bev, bevelSize: bev, bevelSegments: bevSeg || 3, curveSegments: 64 });
      geo.rotateX(-Math.PI / 2);
      var m = mesh(geo, mat, p, true); m.position.y = y0 + bev; return m;
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
    // tepi alami untuk bentuk selain persegi panjang: garis luar bergelombang kecil
    function wobble(shape) {
      var pts = shape.getPoints(90), out = [];
      for (var i = 0; i < pts.length; i++) { var p = pts[i], L = Math.hypot(p.x, p.y) || 1, k = 1 - (.012 + .01 * Math.sin(i * .9) + .008 * Math.cos(i * 2.3)) / Math.max(.2, L) * .6; out.push(new T.Vector2(p.x * k, p.y * k)); }
      var s = new T.Shape(); s.setFromPoints(out); return s;
    }
    function lshapeTop(w, d, w2) { var s = new T.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2 + w2); s.lineTo(w / 2 - d, d / 2 + w2); s.lineTo(w / 2 - d, d / 2); s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, -d / 2); return s; }

    /* ---------------- BANTAL: kotak membulat 9-slice dengan crown, gembung, kendur, kerut & tufting (XPARTS.cushGeo)
       o: { r, cr (crown atas), both, bu (gembung samping), sag, wr (kerut), tuft: {pat, pitch, pitchZ, proud} } */
    var XP = window.XPARTS;
    function cushGeo(w, h, d, o) { return XP.cushGeo(w, h, d, o); }
    // loop jahitan pada permukaan bantal: persegi membulat (xz) setengah ukuran hx, hz, radius sudut cr, di ketinggian y
    function seamTube(m, geo, hx, hz, cr, y, rad, mat, out, dashed) {
      var tk = geo.userData.key ? 't' + geo.userData.key + [hx, hz, cr, y, rad].map(function (v) { return v.toFixed(4); }).join(',') + (out ? 1 : 0) + (dashed ? 1 : 0) + (mat.map || mat.userData.tex ? '' : 'u') : null;
      if (tk && GEO[tk]) { var tc = mesh(GEO[tk], mat, m, true); tc.castShadow = false; return tc; }
      var u = geo.userData, pts = [], st = .03, ix = hx - cr, iz = hz - cr;
      function seg(x0, z0, x1, z1) { var L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / st)); for (var i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
      function arc(cx, cz, a0, a1) { for (var i = 0; i < 6; i++) { var a = a0 + (a1 - a0) * i / 6; pts.push([cx + Math.cos(a) * cr, cz + Math.sin(a) * cr]); } }
      seg(-ix, hz, ix, hz); arc(ix, iz, Math.PI / 2, 0); seg(hx, iz, hx, -iz); arc(ix, -iz, 0, -Math.PI / 2);
      seg(ix, -hz, -ix, -hz); arc(-ix, -iz, -Math.PI / 2, -Math.PI); seg(-hx, -iz, -hx, iz); arc(-ix, iz, Math.PI, Math.PI / 2);
      var v = pts.map(function (p) {
        var s = u.surf(p[0], y, p[1]), ny = y > 0 ? 1 : -1, ox = p[0] - Math.max(-ix, Math.min(ix, p[0])), oz = p[1] - Math.max(-iz, Math.min(iz, p[1])), L = Math.hypot(ox, oz) || 1;
        var nx = out ? ox / L * S45 : 0, nz = out ? oz / L * S45 : 0, nyy = out ? ny * S45 : ny;
        return new T.Vector3(s[0] + nx * rad * .5, s[1] + nyy * rad * .5, s[2] + nz * rad * .5);
      });
      var curve = new T.CatmullRomCurve3(v, true, 'centripetal'), n = Math.min(420, Math.max(48, v.length * 2));
      var geo2 = new T.TubeGeometry(curve, n, rad, dashed ? 4 : 6, true);
      if (dashed) { var uv = geo2.attributes.uv, k = curve.getLength() / .007; for (var i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * k); }
      else if (mat.map || mat.userData.tex) uvBox(geo2);
      if (tk) cachedGeo(tk, function () { return geo2; });
      var t = mesh(geo2, mat, m, true); t.castShadow = false; return t;
    }
    // jahitan menurut pilihan: piping | double | contrast (clean = tersembunyi)
    function stitchOn(m, geo, st, o) {
      o = o || {}; var u = geo.userData, r = u.r, ia = u.A - r, ic = u.C - r;
      var ybot = -(u.B - r + r * S45), ytop = u.B - r + r * S45;
      if (st === 'piping') {
        var pm = pipeMat();
        seamTube(m, geo, ia + r * S45, ic + r * S45, r * S45, ytop, .0042, pm, true);
        if (!o.topOnly) seamTube(m, geo, ia + r * S45, ic + r * S45, r * S45, ybot, .0042, pm, true);
      } else if (st === 'double' || st === 'contrast') {
        var dbl = st === 'double', th = seamMat(st), rr = dbl ? .0016 : .0021, ins = Math.min(.02, ia * .3, ic * .3);
        var a = Math.max(.02, ia - ins), b = Math.max(.02, ic - ins);
        if (!u.tufted) seamTube(m, geo, a, b, Math.min(.02, a, b), u.B, rr, th, false, true);
        if (dbl && !u.tufted) { var a2 = Math.max(.015, a - .009), b2 = Math.max(.015, b - .009); seamTube(m, geo, a2, b2, Math.min(.015, a2, b2), u.B, rr, th, false, true); }
        else if (!o.topOnly) seamTube(m, geo, a, b, Math.min(.02, a, b), -u.B, rr, th, false, true);
      }
      if (o.welt && st !== 'piping') { var wm = fabric(shade(colorHex, .9), c.uph || 'vienna'); seamTube(m, geo, ia + r * S45, ic + r * S45, r * S45, ytop, .003, wm, true); }
      if (o.layer) seamTube(m, geo, u.A, u.C, r, u.B - Math.max(.025, (u.B * 2) * .3), .0022, thread(shade(colorHex, .7), false), true);
    }
    // InstancedMesh: daftar [x,y,z,nx,ny,nz] (normal opsional) — satu draw call per jenis (kancing, paku hias)
    function instOn(parent, geo, mat, list, sink) {
      if (!list || !list.length) return null;
      var im = new T.InstancedMesh(keep(geo), mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), n = new T.Vector3(), one = new T.Vector3(1, 1, 1), p = new T.Vector3();
      list.forEach(function (b, i) { n.set(b[3] || 0, b[4] == null ? 1 : b[4], b[5] || 0).normalize(); q.setFromUnitVectors(up, n); p.set(b[0] - n.x * (sink || 0), b[1] - n.y * (sink || 0), b[2] - n.z * (sink || 0)); m4.compose(p, q, one); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; im.userData.inst = 1; parent.add(im); keep(im); return im;
    }
    function btnMat() { return fabric(shade(colorHex, .82), c.uph || 'vienna'); }
    // bantal siap pakai: berbaring (atas = +y); o.rx memutar (π/2 → atas menghadap depan); o.tuft = pola di muka atas
    function cushion(p, w, h, d, mat, x, y, z, o) {
      o = o || {};
      var tf = o.tuft, key = 'c' + [w, h, d, o.r, o.cr, o.both, o.bu, o.sag, o.wr].map(function (v) { return typeof v === 'number' ? v.toFixed(4) : v ? 1 : 0; }).join(',') + (tf ? '|' + tf.pat + tf.pitch.toFixed(3) + (tf.pitchZ || 0).toFixed(3) + tf.proud.toFixed(4) : '');
      var geo = cachedGeo(key, function () { var g0 = cushGeo(w, h, d, o); uvBox(g0); g0.userData.key = key; g0.userData.tufted = !!tf; return g0; }), m = mesh(geo, mat, p, true); m.position.set(x || 0, y || 0, z || 0);
      if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
      if (tf && geo.userData.buttons && geo.userData.buttons.length && /button|diamond/.test(tf.pat)) instOn(m, XP.buttonGeo(tf.pat === 'diamond' ? .0115 : .0095), btnMat(), geo.userData.buttons, .002);
      if (o.st || o.welt || o.layer) stitchOn(m, geo, o.st, o);
      return m;
    }
    // pola tufting → parameter bantal (muka atas). kind: back | seat | top ; o.pitch memaksa jarak lajur
    function tuftOf(name, kind, o) {
      o = o || {};
      if (!name || name === 'plain' || name === 'none') return null;
      if (name === 'channelV' || name === 'channel') return { pat: 'chanZ', pitch: o.pitch || (kind === 'seat' ? .2 : .125), proud: .018 };
      if (name === 'channelH') return { pat: 'chanX', pitch: .1, pitchZ: o.pitch || (kind === 'back' ? .095 : .11), proud: .016 };
      if (name === 'biscuit') return { pat: 'biscuit', pitch: o.pitch || (kind === 'top' ? .16 : kind === 'seat' ? .22 : .19), pitchZ: o.pitchZ || (kind === 'top' ? .16 : kind === 'seat' ? .2 : .17), proud: .02 };
      if (name === 'button') return { pat: 'button', pitch: o.pitch || .13, pitchZ: o.pitchZ || .11, proud: .006 };
      if (name === 'diamond') return { pat: 'diamond', pitch: o.pitch || .15, pitchZ: o.pitchZ || .23, proud: .026 };
      if (name === 'segmented') return null;
      return null;
    }
    // cakram membulat (lathe): radius R, tinggi h, radius tepi atas rt, crown (boleh negatif = cekung)
    function puckGeo(R, h, rt, crown, rb) {
      rt = Math.min(rt, h * .48, R * .5); rb = Math.min(rb == null ? .006 : rb, h * .3);
      var pts = [], i, ctop = crown * (1 - Math.pow((R - rt) / R, 2));
      for (i = 0; i <= 10; i++) { var u = (R - rt) * i / 10; pts.push(new T.Vector2(Math.max(.0001, u), h + crown * (1 - Math.pow(u / R, 2)))); }
      for (i = 1; i <= 6; i++) { var a = i / 6 * Math.PI / 2; pts.push(new T.Vector2(R - rt + Math.sin(a) * rt, h - rt + Math.cos(a) * rt + ctop * Math.cos(a))); }
      for (i = 1; i <= 4; i++) { var b = i / 4 * Math.PI / 2; pts.push(new T.Vector2(R - rb + Math.cos(b) * rb, rb - Math.sin(b) * rb)); }
      pts.push(new T.Vector2(.0001, 0));
      return new T.LatheGeometry(pts.reverse(), 48);
    }
    // cincin (annulus) membulat: Ri..Ro, tinggi h
    function ringGeo(Ri, Ro, h, rt, crown) {
      var rr = Math.max(.002, Math.min(rt, h / 2.2, (Ro - Ri) / 3)), pts = [], i;
      pts.push(new T.Vector2(Ro, 0));
      for (i = 0; i <= 5; i++) { var a = i / 5 * Math.PI / 2; pts.push(new T.Vector2(Ro - rr + Math.cos(a) * rr, h - rr + Math.sin(a) * rr)); }
      for (i = 1; i < 10; i++) pts.push(new T.Vector2(Ro - rr - (Ro - Ri - 2 * rr) * i / 10, h + crown * Math.sin(i / 10 * Math.PI)));
      for (i = 0; i <= 5; i++) { var b = i / 5 * Math.PI / 2; pts.push(new T.Vector2(Ri + rr - Math.sin(b) * rr, h - rr + Math.cos(b) * rr)); }
      pts.push(new T.Vector2(Ri, 0)); pts.push(new T.Vector2(Ro, 0));
      return new T.LatheGeometry(pts, 96);
    }
    function puck(p, R, h, rt, crown, mat, x, y, z, sz) { var m = mesh(puckGeo(R, h, rt, crown), mat, p); m.position.set(x || 0, y || 0, z || 0); if (sz) m.scale.z = sz; return m; }
    // cincin jahitan di tepi atas cakram (piping / double / contrast)
    function puckStitch(p, R, y, x, z, sz, st) {
      if (!st || st === 'clean') return;
      var t;
      if (st === 'piping') { t = torus(p, R, .0042, pipeMat(), x, y, z, 0, 96); t.rotation.x = Math.PI / 2; t.scale.y = sz || 1; return; }
      var th = seamMat(st);
      [R - .02].concat(st === 'double' ? [R - .03] : []).forEach(function (rr) {
        var g = new T.TorusGeometry(rr, st === 'double' ? .0016 : .0021, 5, 160), uv = g.attributes.uv, k = 2 * Math.PI * rr / .007;
        for (var i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * k);
        var m = mesh(g, th, p, true); m.rotation.x = Math.PI / 2; m.position.set(x, y + .001, z); m.scale.y = sz || 1; m.castShadow = false;
      });
    }

    /* ---------------- KAKI (XPARTS) — dengan sepatu kuningan / roda kuningan dari group trim */
    var feet = null;   // titik kaki di lantai (untuk felt glides)
    var legCap = null; // 'brass' | 'castor' | null — diatur oleh pembangun kursi
    var CAPOK = /^(tapered|turned|conic|block|splay|straight|cylinder|square)$/;
    function brass() { return metal(X.find(X.METAL, 'brass') || { id: 'brass', hex: '#c2a15a', rough: .3 }); }
    function legMesh(p, geo, mat, x, y, z) { var m = mesh(geo, mat, p); m.position.set(x, y, z); return m; }
    // o: { dir: [dx,dz] arah keluar (untuk splay), cap, square }
    function leg(p, type, x, z, h, mat, y0, o) {
      y0 = y0 || 0; o = o || {};
      if (h <= .005) return;
      if (feet && !y0) feet.push([x, z]);
      if (type === 'castor' && !o.seat) { cyl(p, .012, .012, h - .03, mat, x, y0 + h - (h - .03) / 2, z, 12); sphere(p, .022, dark('#2a2522'), x, y0 + .022, z); return; }   // roda lama (kabinet)
      var cap = o.cap !== undefined ? o.cap : (CAPOK.test(type) ? legCap : null);
      var hc = cap === 'castor' ? Math.min(.05, h * .45) : 0, hl = h - hc, yb = y0 + hc;
      if (cap === 'castor') legMesh(p, XP.castorGeo(hc), brass(), x, y0, z);
      var lo = null;
      if (type === 'tapered' && o.square) { mesh(XP.bar([x, yb, z], [x, yb + hl, z], .024, .024, .003, { w1: .04, t1: .04 }), mat, p, false); lo = { rTop: .02, rBot: .012 }; }
      else if (type === 'tapered') { legMesh(p, XP.legGeo('tapered', hl), mat, x, yb, z); }
      else if (type === 'splay') {
        var dir = o.dir || [x >= 0 ? 1 : -1, z >= 0 ? 1 : -1], dl = Math.hypot(dir[0], dir[1]) || 1, k = Math.tan(10 * Math.PI / 180) * hl, kx = dir[0] / dl * k, kz = dir[1] / dl * k;
        var sg = cachedGeo('splay' + [hl, kx, kz].map(function (v) { return v.toFixed(4); }).join(','), function () { return XP.shear(XP.legGeo('splay', hl).clone(), -kx / hl, -kz / hl); });
        legMesh(p, sg, mat, x, yb, z);
      }
      else if (type === 'turned' || type === 'bun' || type === 'cylinder' || type === 'conic') legMesh(p, XP.legGeo(type, hl, type === 'cylinder' ? { r: o.r || .035 } : null), mat, x, yb, z);
      else if (type === 'straight') box(p, .04, hl, .04, mat, x, yb + hl / 2, z, .004);
      else if (type === 'block') box(p, .075, hl, .075, mat, x, yb + hl / 2, z, .008);
      else if (type === 'round' || type === 'pin') legMesh(p, XP.legGeo('pin', hl), mat, x, yb, z);
      else if (type === 'square') box(p, .022, hl, .022, mat, x, yb + hl / 2, z, .003);
      else if (type === 'hairpin') { var hy = y0 + .005 * .025 / Math.hypot(.025, h) + .0003; rod(p, [x - .025, y0 + h, z], [x, hy, z], .005, mat); rod(p, [x + .025, y0 + h, z], [x, hy, z], .005, mat); }
      else legMesh(p, XP.legGeo('tapered', hl), mat, x, yb, z);
      if (cap === 'brass' && type !== 'splay') legMesh(p, XP.capGeo(type === 'tapered' && o.square ? 'tapered' : type, hl, Math.min(.04, hl * .3), lo), brass(), x, yb, z);
      else if (cap === 'brass') { var kk = Math.tan(10 * Math.PI / 180), d2 = o.dir || [x >= 0 ? 1 : -1, z >= 0 ? 1 : -1], l2 = Math.hypot(d2[0], d2[1]) || 1, hcap = Math.min(.04, hl * .3); var cg = cachedGeo('scap' + [hl, d2[0] / l2, d2[1] / l2].map(function (v) { return v.toFixed(4); }).join(','), function () { return XP.shear(XP.capGeo('splay', hl, hcap).clone(), -d2[0] / l2 * kk, -d2[1] / l2 * kk); }); legMesh(p, cg, brass(), x, yb, z); }
    }
    // kaki/base untuk benda kotak (lebar w, dalam d): mengembalikan tinggi atas base
    function baseFor(p, type, w, d, h, mat, o) {
      o = o || {};
      if (type === 'none') return o.y0 || 0;
      if (type === 'plinth') {   // plinth mundur 4 cm; finishing kayu / senada kain / logam / gelap
        var pm = c.cat === 'kabinet' ? (/^(round|hairpin|sled)$/.test(c.leg) ? METAL() : dark('#1f1a16')) : c.legFinish === 'wood' ? WOOD() : c.legFinish === 'same' ? FAB() : c.legFinish === 'metal' ? METAL() : dark('#1f1a16');
        var ins = c.cat === 'kabinet' ? .025 : .04;
        box(p, w - 2 * ins, .07, d - 2 * ins, pm, 0, .035, 0, .004); return .07;
      }
      if (type === 'metalplinth') {
        var mm = metal(X.find(X.METAL, c.metal) || X.METAL[1]);
        box(p, w - .02, .025, d - .02, mm, 0, .0125, 0, .003);
        box(p, w - .045, .04, d - .045, c.legFinish === 'metal' ? mm : mat || mm, 0, .045, 0, .003);
        return .065;
      }
      if (type === 'floating') { box(p, w - .26, .09, d - .26, dark(), 0, .045, 0, .004); return .09; }
      if (type === 'skirt') {   // kaki tersembunyi di balik rok: glide gelap kecil di sudut
        var gy = Math.max(.04, h);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { cyl(p, .018, .02, gy, dark('#1d1915'), q[0] * (w / 2 - .07), gy / 2, q[1] * (d / 2 - .07), 14); });
        return gy;
      }
      if (type === 'sled' || type === 'uSled') {
        var sr = type === 'uSled' ? .011 : .009;
        [-1, 1].forEach(function (s) {
          var x = s * (w / 2 - .05), z0 = -d / 2 + .04, z1 = d / 2 - .04;
          if (type === 'uSled') mesh(XP.tube([[x, h, z0], [x, sr, z0], [x, sr, z1], [x, h, z1]], sr, { fil: .05 }), mat, p, false);
          else { rod(p, [x, .009, z0], [x, .009, z1], .009, mat); rod(p, [x, .009, z0], [x, h, z0], .009, mat); rod(p, [x, .009, z1], [x, h, z1], .009, mat); [-1, 1].forEach(function (e) { sphere(p, .009, mat, x, .009, e * (d / 2 - .04)); }); }
          if (feet) feet.push([x, z0], [x, z1]);
        });
        return h;
      }
      if (type === 'slab') {   // papan kayu di kedua ujung (bench/05)
        [-1, 1].forEach(function (s) { box(p, .04, h, d - .04, mat, s * (w / 2 - .07), h / 2, 0, .006); if (feet) feet.push([s * (w / 2 - .07), 0]); });
        return h;
      }
      if (type === 'compass') {   // A-frame per sisi: dua kaki meruncing bertemu di bawah rel samping
        [-1, 1].forEach(function (s) {
          var x = s * (w / 2 - .05), zt = 0, sp = Math.min(d / 2 - .04, h * .55 + .06);
          [-1, 1].forEach(function (e) { mesh(XP.bar([x, h, zt + e * .03], [x, .011, e * sp], .032, .036, .006, { w1: .022, t1: .026, up: [1, 0, 0] }), mat, p, false); cyl(p, .013, .015, .011, dark('#1d1915'), x, .0055, e * sp, 14); if (feet) feet.push([x, e * sp]); });
          var bh2 = Math.min(.05, h - .012); box(p, .04, bh2, Math.max(.1, d - .1), mat, x, h - bh2 / 2, 0, .006);
        });
        return h;
      }
      if (type === 'xcampaign' || type === 'xmetal') {   // X per sisi + palang bubut (ottoman/23)
        var xm = type === 'xmetal' ? METAL() : mat, rr = type === 'xmetal' ? .011 : .016;
        [-1, 1].forEach(function (s) {
          var x = s * (w / 2 - .045), zz = d / 2 - .05;
          mesh(XP.bar([x, rr, -zz], [x, h - .005, zz], rr * 2, rr * 2.6, rr * .5, { up: [1, 0, 0] }), xm, p, false); mesh(XP.bar([x, rr, zz], [x, h - .005, -zz], rr * 2, rr * 2.6, rr * .5, { up: [1, 0, 0] }), xm, p, false);
          [-zz, zz].forEach(function (zf) { cyl(p, .016, .018, .012, dark('#1d1915'), x, .006, zf, 14); }); if (feet) feet.push([x, -zz], [x, zz]);
        });
        rod(p, [-(w / 2 - .045), h * .5, 0], [w / 2 - .045, h * .5, 0], rr * .8, xm, 14);
        box(p, w - .06, .03, d - .06, xm, 0, h - .015, 0, .004);   // rel atas tempat dudukan
        return h;
      }
      if (type === 'openFrame') {   // rangka besi terbuka: kaki + rel bawah keliling (ottoman/26)
        var om = METAL(), b = .012, ix0 = w / 2 - .03, iz0 = d / 2 - .03;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { box(p, b * 1.6, h, b * 1.6, om, q[0] * ix0, h / 2, q[1] * iz0, .002); if (feet) feet.push([q[0] * ix0, q[1] * iz0]); });
        [-1, 1].forEach(function (e) { box(p, 2 * ix0, b, b * 1.6, om, 0, .05, e * iz0, .002); box(p, b * 1.6, b, 2 * iz0, om, e * ix0, .05, 0, .002); box(p, 2 * ix0, b, b * 1.6, om, 0, h - b / 2, e * iz0, .002); box(p, b * 1.6, b, 2 * iz0, om, e * ix0, h - b / 2, 0, .002); });
        return h;
      }
      var ix = w / 2 - (o.inset || .06), iz = d / 2 - (o.inset || .06), bun = type === 'bun';
      if (bun) { ix = w / 2 - Math.max(o.inset || 0, .07); iz = d / 2 - Math.max(o.inset || 0, .07); }
      [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]].forEach(function (q) { leg(p, type, q[0], q[1], h, mat, 0, { dir: [q[0], q[1]], square: o.square }); });
      if (w > 2.1 && !o.noMid) { leg(p, type, 0, -iz, h, mat, 0, { dir: [0, -1], square: o.square }); leg(p, type, 0, iz, h, mat, 0, { dir: [0, 1], square: o.square }); }
      return h;
    }
    // isian & kekerasan → parameter bentuk bantal
    function fillOf() {
      var f = { foam: { r: .024, cr: .008, bu: .004, dh: 0 }, hd: { r: .016, cr: .004, bu: .002, dh: .008 }, dacron: { r: .03, cr: .013, bu: .007, dh: .004 },
        feather: { r: .034, cr: .016, bu: .009, wr: .003, dh: .012 }, pocket: { r: .02, cr: .01, bu: .002, dh: .02, welt: 1 }, memory: { r: .014, cr: .003, bu: .002, dh: .008, layer: 1 } }[c.fill] || { r: .024, cr: .008, bu: .004, dh: 0 };
      var k = { soft: { h: .92, c: 1.3, r: 1.15, sag: .008 }, firm: { h: 1.06, c: .6, r: .85, sag: 0 } }[c.firm] || { h: 1, c: 1, r: 1, sag: 0 };
      return { r: Math.min(.04, f.r * k.r), cr: Math.min(.02, f.cr * k.c), bu: Math.min(.012, f.bu * k.c), wr: f.wr || 0, sag: k.sag, hk: k.h, dh: f.dh, welt: f.welt, layer: f.layer };
    }
    function fo(base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return o; }
    // detail kecil bersama
    function zipper(p, a, b) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]);
      rod(p, a, b, .0045, dark('#1d1a18'), 6).scale.set(1, 1, .5);
      rod(p, a, b, .0022, chrome(), 6);
      var mpos = A.clone().lerp(B, .82); box(p, .012, .022, .006, chrome(), mpos.x, mpos.y - .008, mpos.z, .002);
    }
    function keyhole(p, x, y, z) { cyl(p, .009, .009, .004, metal(X.find(X.METAL, c.metal) || X.METAL[1]), x, y, z + .002, 20).rotation.x = Math.PI / 2; box(p, .0025, .008, .003, dark('#0a0807'), x, y - .001, z + .0045, 0); }
    function lever(p, x, y, z, side) {
      box(p, .008, .05, .09, chrome(), x - side * .001, y, z, .004);
      rod(p, [x + side * .003, y, z + .02], [x + side * .004, y - .02, z + .07], .005, chrome());
    }
    // paku hias (nailhead): titik-titik [x,y,z,nx,ny,nz] di permukaan; jalur di-resample dengan jarak 2.3 cm
    function nailPath(pts, pitch) {
      pitch = pitch || .023; var out = [], acc = 0, i;
      for (i = 0; i < pts.length; i++) {
        if (!i) { out.push(pts[0]); continue; }
        var a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), t = pitch - acc;
        while (t <= L) { var f = t / L; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f, a[4] + (b[4] - a[4]) * f, a[5] + (b[5] - a[5]) * f]); t += pitch; }
        acc = L - (t - pitch);
      }
      return out;
    }
    function nailsOn(parent, list) { if (list.length) instOn(parent, XP.nailGeo(.0058), brass(), list, .0012); }

    /* ---------------- SOFA: satu "run" lurus di sumbu x lokal, sandaran di -z */
    var ARMW = { track: .15, slope: .16, rolled: .17, flared: .15, shelter: .16, panel: .06, english: .13, scroll: .2, pillow: .22, wood: .06, cane: .06, woodSide: .05, none: 0 };
    var RECL = .17;   // sandaran miring ±10° (ergonomi duduk)
    var PIPC = { contrast: function () { return lum(colorHex) > .35 ? '#2a2623' : '#ece4d4'; }, leather: function () { return '#6a4128'; } };
    function pipeMat() {
      if (c.pipingC === 'contrast') return fabric(PIPC.contrast(), c.uph || 'vienna');
      if (c.pipingC === 'leather') return fabric(PIPC.leather(), 'leather');
      return fabric(shade(colorHex, lum(colorHex) > .35 ? .78 : 1.45), c.uph || 'vienna');
    }
    function seamMat(st) { return thread(st === 'double' ? shade(colorHex, lum(colorHex) > .35 ? .62 : 1.7) : (lum(colorHex) > .35 ? '#3a2c22' : '#efe6d2'), true); }
    function lineTube(p, pts, rad, mat, dashed) {
      var curve = new T.CatmullRomCurve3(pts, false, 'centripetal'), geo = new T.TubeGeometry(curve, Math.min(240, Math.max(8, pts.length * 3)), rad, dashed ? 4 : 6, false);
      if (dashed) { var uv = geo.attributes.uv, k = curve.getLength() / .007; for (var i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * k); }
      var m = mesh(geo, mat, p, !!dashed); m.castShadow = false; return m;
    }
    // polyline 2D [[a,b]...] → jalur ber-parameter panjang busur v∈[0,1]: at(v), nr(v)
    function path2(pts, sgn) {
      var L = [0], i; for (i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      var tot = L[L.length - 1] || 1;
      function seg(v) { var s = v * tot, j = 1; while (j < L.length - 1 && L[j] < s) j++; return [j, Math.max(0, Math.min(1, (s - L[j - 1]) / ((L[j] - L[j - 1]) || 1)))]; }
      function tg(j) { j = Math.max(1, Math.min(pts.length - 1, j)); var dx = pts[j][0] - pts[j - 1][0], dy = pts[j][1] - pts[j - 1][1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
      return { len: tot, pts: pts,
        at: function (v) { var q = seg(v), a = pts[q[0] - 1], b = pts[q[0]]; return [a[0] + (b[0] - a[0]) * q[1], a[1] + (b[1] - a[1]) * q[1]]; },
        nr: function (v) { var q = seg(v), t0 = tg(q[0] - 1), t1 = tg(q[0]), t2 = tg(q[0] + 1), f = q[1], tx = (t0[0] + t1[0]) * (1 - f) + (t1[0] + t2[0]) * f, ty = (t0[1] + t1[1]) * (1 - f) + (t1[1] + t2[1]) * f, l = Math.hypot(tx, ty) || 1; return [ty / l * sgn, -tx / l * sgn]; } };
    }
    // CHANNEL TUFTING: kulit berlajur di atas badan — tiap lajur tabung lembut, dipisah jahitan dalam & sempit.
    var CHT = [0, .02, .06, .12, .22, .35, .5, .65, .78, .88, .94, .98];
    function channelSkin(p, mat, nCh, P, N, proud, nv, fade, Wm, Lm, grp) {
      var per = CHT.length, nu = nCh * per, cols = nu + 1, pos = new Float32Array(cols * (nv + 1) * 3), uv = new Float32Array(cols * (nv + 1) * 2), idx = [], k = 0, i, j;
      for (j = 0; j <= nv; j++) {
        var v = j / nv;
        for (i = 0; i <= nu; i++) {
          var t = i === nu ? 0 : CHT[i % per], ci = Math.floor(i / per), u = i === nu ? 1 : (ci + t) / nCh, cc = Math.pow(Math.sin(Math.PI * t), .5), f = fade ? fade(v, u) : 1;
          if (grp && ((ci % grp === 0 && t < .07) || ((ci + 1) % grp === 0 && t > .93))) cc *= .2;
          var a = P(u, v), n = N(u, v), off = .0015 + proud * cc * f;
          pos[k * 3] = a[0] + n[0] * off; pos[k * 3 + 1] = a[1] + n[1] * off; pos[k * 3 + 2] = a[2] + n[2] * off;
          uv[k * 2] = u * Wm; uv[k * 2 + 1] = v * Lm; k++;
        }
      }
      for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var q = j * cols + i; idx.push(q, q + 1, q + cols, q + 1, q + cols + 1, q + cols); }
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      var nn = geo.attributes.normal, n0 = N(.5 / nCh, .5), mi = Math.floor(cols / 2) + cols * Math.floor(nv / 2); if (nn.getX(mi) * n0[0] + nn.getY(mi) * n0[1] + nn.getZ(mi) * n0[2] < 0) { for (i = 0; i < idx.length; i += 3) { var tmp = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = tmp; } geo.setIndex(idx); geo.computeVertexNormals(); }
      return mesh(geo, mat, p, true);
    }
    // kulit quilt umum (channelH / biscuit / button / diamond) + kancing
    function quiltSkin(p, mat, P, N, Wm, Lm, BT, proud, fade, o) {
      o = o || {};
      var pt = BT === 'channelH' ? ['channelH', .1, o.pitchY || .095] : BT === 'biscuit' ? ['biscuit', o.pitch || .19, o.pitchY || .17] : BT === 'button' ? ['button', o.pitch || .13, o.pitchY || .11] : ['diamond', o.pitch || .15, o.pitchY || .23];
      var g = XP.quilt(P, N, Wm, Lm, pt[0], pt[1], pt[2], proud, fade), m = mesh(g, mat, p, true);
      if ((BT === 'button' || BT === 'diamond') && g.userData.buttons.length) instOn(p, XP.buttonGeo(BT === 'diamond' ? .0115 : .0095), btnMat(), g.userData.buttons, .002);
      return m;
    }
    var fadeEnd = function (v) { return v > .86 ? Math.max(0, (1 - v) / .14) : 1; };
    var PROUD = { channelV: .028, channelH: .022, biscuit: .024, button: .008, diamond: .03 };

    /* ---------------- LENGAN
       side ±1, xo = tepi luar (x), w lebar, dp kedalaman (z), zc pusat z, y0 = atas base, ah = tinggi lengan, chan = lajur channel di muka dalam
       o: { nails: [] (kumpulkan paku hias), woodEnd, Hb } */
    function sofaArm(g, F, ST, style, side, xo, w, dp, y0, ah, zc, chan, yS, o) {
      zc = zc || 0; o = o || {};
      var xi = xo - side * w, bev = .012, i, geo, m, sp;
      if (o.woodEnd && style !== 'none') {   // panel kayu di muka luar lengan; lengan bergeser ke dalam setebal panel
        var pt = .02, ptop = style === 'rolled' || style === 'flared' || style === 'english' || style === 'scroll' ? ah - .09 : style === 'pillow' ? ah - .06 : style === 'slope' ? ah - .1 : ah - .012;
        var prof0 = /^(rolled|flared|english|scroll)$/.test(style), ft0 = prof0 ? armFoot(style, w) : 0, dpw = style === 'english' ? dp - .06 : dp - .01, zcw = style === 'english' ? zc - .025 : zc;
        box(g, pt, Math.max(.1, ptop - y0 + .004), dpw, WOOD(), xo - side * (ft0 + pt / 2 - (prof0 ? .002 : 0)), y0 - .004 + (ptop - y0 + .004) / 2, zcw, .007);
        if (!prof0) { xo -= side * pt; w -= pt; xi = xo - side * w; }   // lengan gulung: panel di bawah gulungan, lengan tidak bergeser
      }
      if (style === 'rolled' || style === 'flared' || style === 'english' || style === 'scroll') {
        if (style === 'scroll') bev = .007;
        var pr = XP.armProfile(style, w, ah, y0, bev), UV = pr.pts;
        sp = new T.Shape(UV.map(function (q) { return new T.Vector2(xo - side * q[0], q[1]); }));
        var dpe = style === 'english' ? dp - .05 : dp, zce = style === 'english' ? zc - .025 : zc;   // English: muka depan mundur 5 cm
        geo = new T.ExtrudeGeometry(sp, { depth: dpe - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 4 });
        m = mesh(geo, F, g); m.position.z = zce - (dpe - 2 * bev) / 2;
        var R = pr.R, uc = pr.uc, vc = pr.vc, zF = zce + dpe / 2;
        if (o.armTuft) {   // muka dalam lengan ber-diamond (Chesterfield): dari dudukan sampai bawah gulungan
          var xIn = xo - side * (w - bev) - side * bev, yA0 = (yS || y0) + .03, yA1 = vc - R * .35, z0q = zce - dpe / 2 + .03, zLq = dpe - .06;
          if (yA1 - yA0 > .1) quiltSkin(g, F, function (u, v) { return [xIn, yA0 + (yA1 - yA0) * v, z0q + u * zLq]; }, function () { return [-side, 0, 0]; }, zLq, yA1 - yA0, o.armTuft, .018, function (v, u) { return Math.min(1, v / .08, (1 - v) / .15, Math.min(u, 1 - u) * 10); }, { pitch: .15, pitchY: .23 });
        }
        if (pr.spiral) {   // muka depan scroll: panel gulung timbul + garis spiral
          var sp2 = [], tq, a1 = Math.PI * 1.02;
          for (i = 0; i <= 44; i++) { tq = i / 44; var an = a1 - tq * Math.PI * 2.35, rr = R * (.86 - .66 * tq); sp2.push(new T.Vector3(xo - side * (uc - rr * Math.cos(an)), vc + rr * Math.sin(an), zF + .0025)); }
          lineTube(g, sp2, .0042, pipeMat(), false);
        }
        if (ST && ST !== 'clean') {
          var edge = UV.slice(0, UV.length - 1);
          if (ST === 'piping') [1, -1].forEach(function (e) { lineTube(g, edge.map(function (q) { return new T.Vector3(xo - side * (q[0] - bev * .55), q[1] + (q[1] > vc - R ? bev * .55 : 0), zce + e * (dpe / 2 - bev * .4)); }), .0042, pipeMat(), false); });
          else lineTube(g, edge.slice(1, edge.length - 1).map(function (q) { var top = q[1] > vc - R * .2, du = top ? (q[0] - uc) : 0, dv = top ? q[1] - vc : 0, L = Math.hypot(du, dv) || 1; return new T.Vector3(xo - side * (top ? uc + du / L * (R - .016) : q[0] + .016), top ? vc + dv / L * (R - .016) : q[1], zF + .0006); }), ST === 'double' ? .0016 : .0021, seamMat(ST), true);
        }
        if (o.nails) {   // paku hias mengelilingi muka depan (sisi luar, gulungan, turun di sisi dalam sampai dudukan)
          var ar = 0; for (i = 0; i < UV.length; i++) { var a = UV[i], b = UV[(i + 1) % UV.length]; ar += a[0] * b[1] - b[0] * a[1]; }
          var sg = ar > 0 ? 1 : -1, np = [];
          for (i = 1; i < UV.length - 1; i++) {
            var q0 = UV[i - 1], q2 = UV[i + 1], tx = q2[0] - q0[0], ty = q2[1] - q0[1], L2 = Math.hypot(tx, ty) || 1, nu = -ty / L2 * sg, nv = tx / L2 * sg, qq = [UV[i][0] + nu * .016, UV[i][1] + nv * .016];
            if (qq[1] < (yS || y0) - .01) continue;
            np.push([xo - side * qq[0], qq[1], zF + .0004, 0, 0, 1]);
          }
          nailPath(np).forEach(function (q) { o.nails.push(q); });
        }
        return;
      }
      if (style === 'slope') {
        var d2 = dp / 2 - bev, ahF = ah - .085;
        sp = new T.Shape();
        sp.moveTo(-(d2), y0 + bev); sp.lineTo(-(-d2), y0 + bev); sp.lineTo(-(-d2), ah - bev - .025); sp.quadraticCurveTo(-(-d2), ah - bev, -(-d2 + .025), ah - bev);
        sp.lineTo(-(d2 - .04), ahF - bev); sp.quadraticCurveTo(-(d2), ahF - bev - .004, -(d2), ahF - bev - .04); sp.lineTo(-(d2), y0 + bev);
        geo = new T.ExtrudeGeometry(sp, { depth: w - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
        geo.rotateY(Math.PI / 2); m = mesh(geo, F, g); m.position.set((xo + xi) / 2 - (w - 2 * bev) / 2, 0, zc);
        if (ST && ST !== 'clean') [xo - side * bev * .45, xi + side * bev * .45].forEach(function (ex) {
          var pip = ST === 'piping', ins = pip ? 0 : side * (ex === xi + side * bev * .45 ? .016 : -.016);
          lineTube(g, [new T.Vector3(ex + ins, ahF + (pip ? bev * .3 : .0008), zc + d2 - .04), new T.Vector3(ex + ins, ah + (pip ? -bev * .3 : .0008), zc - d2 + .025)], pip ? .0042 : ST === 'double' ? .0016 : .0021, pip ? pipeMat() : seamMat(ST), !pip);
        });
        if (o.nails) { var nl = []; [[xo - side * .016, y0 + .02], [xo - side * .016, ahF - bev - .03], [xi + side * .016, ahF - bev - .03], [xi + side * .016, Math.max(y0 + .02, (yS || y0) - .01)]].forEach(function (q) { nl.push([q[0], q[1], zc + dp / 2 + .0004, 0, 0, 1]); }); nailPath(nl).forEach(function (q) { o.nails.push(q); }); }
        return;
      }
      if (style === 'pillow') {   // lengan bulat gemuk (sofa/04): radius besar, menggembung
        var rp = Math.min(.1, w / 2 - .004, (ah - y0) / 2 - .004);
        box(g, Math.max(.04, w - .1), .03, dp - .12, FAB2(), (xo + xi) / 2, y0 + .015, zc, .004);   // alas lengan bulat (menumpu ke kaki)
        var pm = cushion(g, w, ah - y0 - .004, dp, F, (xo + xi) / 2, y0 + (ah - y0 - .004) / 2, zc, { r: rp, cr: .004, bu: 0, st: ST, topOnly: true });
        if (o.nails) { var ug = pm.geometry.userData, nl2 = [], cxp = (xo + xi) / 2, cyp = y0 + (ah - y0 - .004) / 2; for (i = 0; i <= 14; i++) { var aa = Math.PI * i / 14, rx = (w / 2 - .028) * Math.cos(aa), ry = Math.max(-((ah - y0) / 2 - .03), Math.sin(aa) * ((ah - y0) / 2 - .028)), sp3 = ug.surf(rx, ry, ug.C); nl2.push([cxp + sp3[0], cyp + sp3[1], zc + sp3[2] + .0003, 0, 0, 1]); } nailPath(nl2).forEach(function (q) { o.nails.push(q); }); }
        return;
      }
      var r = style === 'panel' ? .018 : .025, pr2 = chan && style !== 'panel' ? .026 : 0, xO = xo - side * pr2 * .9, xI = xo - side * (w - pr2), wB = Math.abs(xO - xI);
      cushion(g, wB, ah - y0 - pr2, style === 'panel' ? dp - .02 : dp, F, (xO + xI) / 2, y0 + (ah - y0 - pr2) / 2, zc, { r: r, cr: .003, bu: 0, st: pr2 ? null : ST, topOnly: true });
      if (pr2) {
        var aT = ah - pr2, pts = [[xI, yS - .03]], k;
        for (k = 0; k <= 6; k++) { var ph = k / 6 * Math.PI / 2; pts.push([xI + side * r * (1 - Math.cos(ph)), aT - r + r * Math.sin(ph)]); }
        for (k = 0; k <= 6; k++) { var ph2 = k / 6 * Math.PI / 2; pts.push([xO - side * r * (1 - Math.sin(ph2)), aT - r + r * Math.cos(ph2)]); }
        pts.push([xO, aT - .07]);
        var pa = path2(pts, -side), nC = Math.max(4, Math.round(dp / .105)), z0 = zc - dp / 2 + .012, zs = dp - .024;
        channelSkin(g, F, nC, function (u, v) { var q = pa.at(v); return [q[0], q[1], z0 + u * zs]; }, function (u, v) { var n = pa.nr(v); return [n[0], n[1], 0]; }, pr2, 28, fadeEnd, zs, pa.len);
      }
      if (o.nails && style !== 'corner') {
        var zf2 = zc + (style === 'panel' ? dp - .02 : dp) / 2 + .0004, a0 = xo - side * .018, b0 = xi + side * .018, yt = ah - pr2 - .022, nl3 = [[a0, y0 + .02], [a0, yt], [b0, yt], [b0, Math.max(y0 + .02, (yS || y0) - .01)]].map(function (q) { return [q[0], q[1], zf2, 0, 0, 1]; });
        if (Math.abs(a0 - b0) > .02) nailPath(nl3).forEach(function (q) { o.nails.push(q); });
      }
    }
    // LENGAN KAYU / CANE (rangka kayu ekspos): tiang depan & belakang dari lantai, sandaran tangan, rel samping, isian
    // o: { infill: 'cane' | 'uph' | null, rearH (tinggi tiang belakang), noRest }
    function woodArm(g, side, xo, aw, D, y0, ah, o) {
      o = o || {}; var W0 = WOOD(), px = xo - side * aw / 2, zf = D / 2 - .03, zb = -D / 2 + .035, pw = .042, top = o.noRest ? y0 : ah - .026;
      mesh(XP.bar([px, 0, zf], [px, top, zf], .03, .03, .005, { w1: pw, t1: pw }), W0, g, false);
      mesh(XP.bar([px, 0, zb + (o.rearH ? .01 : 0)], [px, o.rearH ? o.rearH : top, zb - (o.rearH ? .012 : 0)], .03, .03, .005, { w1: pw, t1: pw }), W0, g, false);
      if (feet) feet.push([px, zf], [px, zb]);
      box(g, aw + .02, .06, zf - zb, W0, px - side * .01, y0 - .03, (zf + zb) / 2, .006);   // rel samping (penopang deck)
      if (o.noRest) return;
      box(g, aw, .026, D / 2 - (zb - pw / 2), W0, px, ah - .013, (D / 2 + zb - pw / 2) / 2, .008);   // sandaran tangan, menjorok 2 cm
      if (o.infill === 'cane') {   // panel cane dalam bingkai (sofa/44)
        var yb0 = y0 + .02, yt0 = ah - .045, zs0 = zb + pw / 2 + .012, zs1 = zf - pw / 2 - .012;
        box(g, .024, .03, zs1 - zs0 + .024, W0, px, yt0, (zs0 + zs1) / 2, .006); box(g, .024, .03, zs1 - zs0 + .024, W0, px, yb0, (zs0 + zs1) / 2, .006);
        var cp = box(g, .006, yt0 - yb0 - .02, zs1 - zs0, caneM(), px, (yb0 + yt0) / 2, (zs0 + zs1) / 2, 0); cp.castShadow = false;
      } else if (o.infill === 'uph') {
        cushion(g, aw - .006, ah - .03 - y0 - .005, zf - zb - pw - .004, FAB2(), px, y0 + (ah - .03 - y0) / 2, (zf + zb) / 2, { r: .015, cr: .002 });
      }
    }
    // material cane (alpha-cut, prosedural)
    function caneM() { return M('canep', function () { var t = XP.tex.cane(); return new T.MeshStandardMaterial({ color: col('#e6cf9f'), map: t, alphaMap: null, transparent: false, alphaTest: .5, side: T.DoubleSide, roughness: .65, metalness: 0, envMapIntensity: .6 }); }); }
    function cordM() { return M('cordp', function () { return TXS(new T.MeshStandardMaterial({ color: col('#f2e3c4'), map: XP.tex.cord(), bumpMap: XP.tex.cord(), bumpScale: .004, roughness: .85, envMapIntensity: .5 }), 'weave-cord', { normal: 1, rough: .85, done: function (mt) { mt.color.multiplyScalar(.82); } }); }); }
    function seaM() { return M('seap', function () { return new T.MeshStandardMaterial({ color: col('#efe3c0'), map: XP.tex.seagrass(), bumpMap: XP.tex.seagrass(), bumpScale: .005, roughness: .9, envMapIntensity: .5 }); }); }

    /* ---------------- SANDARAN SOLID (tight/low/camel/wavy/scallop/sloping): profil samping (muka dalam miring ±10°, atas membulat)
       di-loft sepanjang x dengan puncak f(x); tepi ujung membulat. BT = permukaan (channelV/channelH/biscuit/button/diamond) */
    function backShell(g, F, ST, cx, li, D, y0, yS, topAt, zfB, ta, BT, o) {
      o = o || {};
      var pr = BT && BT !== 'plain' ? PROUD[BT] || 0 : 0, b2 = .012, zb = -D / 2 + pr * .9, zf = zfB - pr * .9;
      var face = function (y) { return zf - Math.max(0, y - yS) * ta; };
      var geomAt = function (Hb) {   // parameter gulungan atas untuk tinggi Hb
        var Ht = Hb - (BT === 'channelV' ? pr : 0), B0 = pr ? .075 : .05, yc = Ht - B0, A = Math.max(.04, (face(yc) - zb) / 2), B = Math.min(B0, A * (pr ? 1 : .8));
        yc = Ht - B; A = (face(yc) - zb) / 2; return { yc: yc, A: A, B: B, zc: zb + A };
      };
      var prof = function (Hb, ins) { var G = geomAt(Hb), q = [[zb + ins, y0 + ins], [zf - ins, y0 + ins], [zf - ins, yS], [face(G.yc) - ins, G.yc]]; for (var k = 1; k <= 16; k++) { var p2 = k / 16 * Math.PI; q.push([G.zc + (G.A - ins) * Math.cos(p2), G.yc + (G.B - ins) * Math.sin(p2)]); } return q; };
      var x0 = cx - li / 2, x1 = cx + li / 2, varies = !!o.varies, xs = [], ins = [], i;
      for (i = 0; i <= 4; i++) { var a = i / 4 * Math.PI / 2; xs.push(x0 + b2 * (1 - Math.sin(a))); ins.push(b2 * (1 - Math.cos(a))); }
      xs.reverse(); ins.reverse();
      var nm = varies ? Math.max(8, Math.round(li / .018)) : 2;
      for (i = 1; i < nm; i++) { xs.push(x0 + b2 + (li - 2 * b2) * i / nm); ins.push(0); }
      for (i = 0; i <= 4; i++) { var a2 = i / 4 * Math.PI / 2; xs.push(x1 - b2 * (1 - Math.cos(a2))); ins.push(b2 * (1 - Math.sin(a2))); }
      var xi = {}; xs.forEach(function (x, k) { xi[x.toFixed(6)] = ins[k]; });
      var geo = XP.loftX(xs, function (x) { return prof(topAt(x), xi[x.toFixed(6)] || 0).map(function (q) { return [q[0], q[1]]; }); }, { check: [cx, y0 + .05, (zb + zf) / 2] });
      mesh(geo, o.F2 || F, g, true);
      // jalur muka per x (dudukan → muka miring → gulungan → turun di belakang), di-cache per lajur
      var cache = {};
      var pathAt = function (x, full) {
        var k = x.toFixed(5) + (full ? 'f' : ''); if (cache[k]) return cache[k];
        var G = geomAt(topAt(x)), pts = [[zf, yS - .035], [zf, yS]], n2;
        for (n2 = 1; n2 <= 8; n2++) { var yy = yS + (G.yc - yS) * n2 / 8; pts.push([face(yy), yy]); }
        var nArc = full ? 20 : 7; for (n2 = 1; n2 <= nArc; n2++) { var p3 = n2 / 20 * Math.PI; pts.push([G.zc + G.A * Math.cos(p3), G.yc + G.B * Math.sin(p3)]); }
        if (full) pts.push([zb, G.yc - .07]);
        return (cache[k] = path2(pts, 1));
      };
      var xa = x0 + .006, xsW = li - .012;
      if (BT === 'channelV') {
        var nC = o.lanes || Math.max(3, Math.round(li / (li > 1 ? .125 : .095)));
        channelSkin(g, F, nC, function (u, v) { var q = pathAt(xa + u * xsW, 1).at(v); return [xa + u * xsW, q[1], q[0]]; }, function (u, v) { var n = pathAt(xa + u * xsW, 1).nr(v); return [0, n[1], n[0]]; }, pr, 44, fadeEnd, xsW, pathAt(cx, 1).len, o.grp || 0);
      } else if (pr) {
        var Lm = pathAt(cx, 0).len;
        quiltSkin(g, F, function (u, v) { var q = pathAt(xa + u * xsW, 0).at(v); return [xa + u * xsW, q[1], q[0]]; }, function (u, v) { var n = pathAt(xa + u * xsW, 0).nr(v); return [0, n[1], n[0]]; }, xsW, Lm, BT, pr,
          function (v, u) { var e = Math.min(1, Math.min(u, 1 - u) * xsW / .03); return Math.min(e, v > .8 ? Math.max(0, (1 - v) / .2) : 1, v < .02 ? v / .02 : 1); }, { pitch: BT === 'biscuit' ? li / Math.max(2, Math.round(li / .19)) : null });
      } else if (ST && ST !== 'clean') {
        var G0 = geomAt(topAt(cx)), pz = G0.zc + G0.A * Math.cos(.55), py = G0.yc + G0.B * Math.sin(.55), pip = ST === 'piping';
        if (!varies) {
          if (pip) lineTube(g, [new T.Vector3(cx - li / 2 + .004, py + .002, pz + .002), new T.Vector3(cx + li / 2 - .004, py + .002, pz + .002)], .0042, pipeMat(), false);
          else lineTube(g, [new T.Vector3(cx - li / 2 + .02, G0.yc - .02, face(G0.yc - .02) + .0008), new T.Vector3(cx + li / 2 - .02, G0.yc - .02, face(G0.yc - .02) + .0008)], ST === 'double' ? .0016 : .0021, seamMat(ST), true);
        } else if (pip) {   // piping mengikuti puncak bergelombang
          var pp = []; for (i = 0; i <= 60; i++) { var xx = cx - li / 2 + .006 + (li - .012) * i / 60, Gx = geomAt(topAt(xx)); pp.push(new T.Vector3(xx, Gx.yc + Gx.B * Math.sin(.55) + .002, Gx.zc + Gx.A * Math.cos(.55) + .002)); }
          lineTube(g, pp, .0042, pipeMat(), false);
        }
      }
      return { face: function (y) { return face(y) + pr; }, top: topAt };
    }
    // CHANNEL utuh dudukan + sandaran (dipakai bila backTuft=channelV & seatTuft=channel & dudukan tight/bench)
    function chanPath(D, ySB, zf, ta, Hb, pr, yF, yR, flatF, y0) {
      var zb = -D / 2 + pr * .9, zFr = D / 2 - pr * .95, rf = .035, rj = .08, face = function (y) { return zf - Math.max(0, y - ySB) * ta; };
      var B = .075, yc = Hb - pr - B, A = (face(yc) - zb) / 2; B = Math.min(B, A); yc = Hb - pr - B; A = (face(yc) - zb) / 2;
      var zc = zb + A, q = [], k, s;
      if (flatF) q.push([D / 2, ySB]);
      else { q.push([zFr, yF]); for (k = 0; k <= 6; k++) { var a1 = k / 6 * Math.PI / 2; q.push([zFr - rf + rf * Math.cos(a1), ySB - rf + rf * Math.sin(a1)]); } }
      var P0 = [zf + rj, ySB], P1 = [zf, ySB], P2 = [face(ySB + rj), ySB + rj];
      q.push(P0); for (k = 1; k <= 8; k++) { s = k / 8; q.push([(1 - s) * (1 - s) * P0[0] + 2 * s * (1 - s) * P1[0] + s * s * P2[0], (1 - s) * (1 - s) * P0[1] + 2 * s * (1 - s) * P1[1] + s * s * P2[1]]); }
      for (k = 1; k <= 6; k++) { var yy = ySB + rj + (yc - ySB - rj) * k / 6; q.push([face(yy), yy]); }
      for (k = 1; k <= 18; k++) { var p3 = k / 18 * Math.PI; q.push([zc + A * Math.cos(p3), yc + B * Math.sin(p3)]); }
      q.push([zb, yR]);
      return q;
    }
    function chanBody(g, F, cx, li, D, y0, SH, Hb, zfB, ta, pr, nCh, grp, flat, ST, F2) {
      var b2 = .012, ySB = SH - pr, zf = zfB - pr * .9, i;
      var bp = chanPath(D, ySB, zf, ta, Hb, pr, y0 + b2, y0 + b2, false), sh2 = [];
      var nrm = function (k) { var a = bp[Math.max(0, k - 1)], b = bp[Math.min(bp.length - 1, k + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; };
      for (i = 0; i < bp.length; i++) { var n = nrm(i), y = i === 0 || i === bp.length - 1 ? y0 + b2 : bp[i][1] - n[1] * b2; sh2.push(new T.Vector2(-(bp[i][0] - n[0] * b2), y)); }
      var geo = new T.ExtrudeGeometry(new T.Shape(sh2), { depth: li - 2 * b2, bevelEnabled: true, bevelThickness: b2, bevelSize: b2, bevelSegments: 3, curveSegments: 4 });
      geo.rotateY(Math.PI / 2); var m = mesh(geo, F2 || F, g); m.position.x = cx - (li - 2 * b2) / 2;
      var p = li / nCh, x0 = cx - li / 2, x1 = cx + li / 2, R = [], xa0 = x0;
      (flat || []).slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (f) { if (f[0] > xa0 + .001) R.push([xa0, f[0], false]); R.push([Math.max(xa0, f[0]), f[1], true]); xa0 = f[1]; });
      if (x1 > xa0 + .001) R.push([xa0, x1, false]);
      R.forEach(function (rg) {
        var w = rg[1] - rg[0], n2 = Math.round(w / p); if (n2 < 1 || w < .02) return;
        var q = chanPath(D, ySB, zf, ta, Hb, pr, y0 + (ST && ST !== 'clean' ? .034 : .012), 0, rg[2]), pt, ya = q[q.length - 2][1]; q[q.length - 1][1] = ya - .07; pt = path2(q, 1);
        var fa = function (v) { return Math.min(1, rg[2] ? 1 : v / .012, (1 - v) / .1); }, xa = rg[0] + .003, xs = w - .006;
        channelSkin(g, F, n2, function (u, v) { var a = pt.at(v); return [xa + u * xs, a[1], a[0]]; }, function (u, v) { var nn = pt.nr(v); return [0, nn[1], nn[0]]; }, pr, 52, fa, xs, pt.len, flat ? 0 : grp);
      });
      if (ST && ST !== 'clean') {
        var zq = D / 2 - pr * .95, pip = ST === 'piping', xa2 = cx - li / 2 + .008, xb2 = cx + li / 2 - .008;
        (pip ? [y0 + .034] : ST === 'double' ? [y0 + .019, y0 + .026] : [y0 + .022]).forEach(function (yy) { lineTube(g, [new T.Vector3(xa2, yy, zq + (pip ? .0025 : .0008)), new T.Vector3(xb2, yy, zq + (pip ? .0025 : .0008))], pip ? .0042 : ST === 'double' ? .0016 : .0021, pip ? pipeMat() : seamMat(ST), !pip); });
      }
      var faceAt = function (y) { var z = -9; if (y <= ySB + .005) return -9; for (var k = 1; k < bp.length; k++) { var a = bp[k - 1], b = bp[k]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) z = Math.max(z, a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + pr); } return z; };
      return [ySB, faceAt];
    }

    /* ---------------- BANTAL HIAS: CC0 (Poly Haven) diskalakan & diwarnai kain; duduk di dudukan, bersandar pada muka sandaran tanpa menembus */
    var PB = RECL + .1;
    var PILT = { square: function (S) { return [S, S, S * .38]; }, lumbar: function (S) { return [Math.min(.52, S * 1.18), Math.min(.31, S * .7), S * .3]; } };
    function throwPillow(p, mat, x, ySeat, faceZ, S, Hs, Tk) {
      var pl = XP.pillow(S, Hs, Tk), cb = Math.cos(PB), sb = Math.sin(PB), P = pl.geo.attributes.position, n = P.count, i, minY = 9, step = n > 600 ? 3 : 1;
      for (i = 0; i < n; i++) minY = Math.min(minY, P.getY(i) * cb + P.getZ(i) * sb);
      var cy = ySeat - .003 - minY, cz = -9;
      for (i = 0; i < n; i += step) { var y = P.getY(i), z = P.getZ(i), yw = cy + y * cb + z * sb, zr = -y * sb + z * cb; cz = Math.max(cz, faceZ(x + P.getX(i), yw) - zr); }
      var m = mesh(pl.geo, mat, p); m.position.set(x, cy, cz - .0015); m.rotation.x = -PB; m.userData.pillow = 1; return m;
    }
    // deret bantal di antara xL..xR (mode: 'both' dari kedua ujung, 'center', -1/1 dari satu sisi); type: square | lumbar | mix
    function pillowRow(p, n, mat, xL, xR, mode, ySeat, faceZ, Htop, S0, type) {
      var gap = .012, avail = xR - xL - .02, Sh = (Htop + .055 - ySeat) / Math.cos(PB);
      var S = Math.max(.22, Math.min(S0, Sh, (avail - gap * (n - 1)) / Math.max(1, n))), nMax = Math.max(0, Math.floor((avail + gap) / (S + gap)));
      n = Math.min(n, nMax);
      var dims = [], i, tw = 0;
      for (i = 0; i < n; i++) { var t = type === 'lumbar' ? 'lumbar' : type === 'mix' ? (mode === 'center' ? (n === 1 || i % 2 === 1 ? 'lumbar' : 'square') : (n === 1 || i === 1 && n === 2 || i >= 2 && i % 2 === 0 ? 'lumbar' : 'square')) : 'square'; var dd = PILT[t](S); if (t === 'lumbar' && dd[1] > Sh) dd[1] = Sh; dims.push(dd); tw += dd[0] + (i ? gap : 0); }
      while (n && tw > avail) { tw -= dims[n - 1][0] + gap; dims.pop(); n--; }
      var xs = [];
      if (mode === 'center') { var x = (xL + xR) / 2 - tw / 2; dims.forEach(function (d) { xs.push(x + d[0] / 2); x += d[0] + gap; }); }
      else if (mode === -1 || mode === 1) { var xx; xx = mode < 0 ? xL + .01 : xR - .01; dims.forEach(function (d) { xs.push(mode < 0 ? xx + d[0] / 2 : xx - d[0] / 2); xx += (mode < 0 ? 1 : -1) * (d[0] + gap); }); }
      else { var aL = xL + .01, aR = xR - .01; dims.forEach(function (d, k) { if (k % 2) { xs.push(aR - d[0] / 2); aR -= d[0] + gap; } else { xs.push(aL + d[0] / 2); aL += d[0] + gap; } }); }
      dims.forEach(function (d, k) { throwPillow(p, mat, xs[k], ySeat, faceZ, d[0], d[1], d[2]); });
    }
    // bolster silinder di ujung dudukan (sumbu sepanjang kedalaman) & bantal bola
    function endBolsters(p, nb, nball, mat, xL, xR, ySeat, faceZ, zFront) {
      var d = .17, i;
      for (i = 0; i < Math.min(2, nb); i++) {
        var s = i ? 1 : -1, y = ySeat + d / 2 + .001, zb = faceZ(y + d * .3), L = Math.min(.52, zFront - zb - .03); if (L < .25) continue;
        var x = s < 0 ? xL + d / 2 + .006 : xR - d / 2 - .006, m = mesh(XP.bolsterGeo(d, L), mat, p, false); m.rotation.y = Math.PI / 2; m.position.set(x, y, zb + .004 + L / 2); m.userData.pillow = 1;
        if (s < 0) xL += d + .01; else xR -= d + .01;
      }
      for (i = 0; i < Math.min(3, nball); i++) {
        var db = .26, yb = ySeat + db / 2 + .001, s2 = i % 2 ? 1 : -1, zb2 = Math.max(faceZ(yb), faceZ(yb + db * .35) - db * .15, faceZ(yb - db * .35) - db * .15), xb = s2 < 0 ? xL + db / 2 + .01 + Math.floor(i / 2) * (db + .01) : xR - db / 2 - .01;
        var mb = mesh(XP.ballGeo(db), mat, p, false); mb.position.set(xb, yb, zb2 + db / 2 + .006); mb.userData.pillow = 1;
        var tb = torus(p, db / 2 + .0005, .0035, pipeMat(), xb, yb, zb2 + db / 2 + .006, 0, 48); tb.rotation.y = Math.PI / 2; tb.userData.pillow = 1;
      }
    }

    // tinggi lengan efektif per gaya (shelter & scroll = setinggi sandaran)
    function armTop(o, Hb) { return o.arm === 'shelter' || o.arm === 'scroll' ? Hb : Math.min(o.armH, o.H); }
    // offset muka luar lengan di bagian bawah (lengan gulung menjorok di atas): untuk rok, list kuningan & paku sisi
    function armFoot(style, aw) { var p = XP.armProfile(style, aw, .7, .1, .012); return p ? Math.max(0, p.pts[0][0] - .012) : 0; }
    // rok (skirt): strip kain keliling dari bawah badan sampai 1.5 cm di atas lantai; kickpleat = lipit terbalik di sudut
    function skirtOn(g, F, len, D, y0, insL, insR, kick) {
      var nt = .01, top = y0 + .03, bot = .015, hs = top - bot, xL = -len / 2 + insL + nt / 2 - .001, xR = len / 2 - insR - nt / 2 + .001, zF = D / 2 - nt / 2 + .001, zB = -D / 2 + nt / 2 - .001, path = [];
      var corner = function (x, z, dx, dz) { return [[x, 0, z]]; };
      if (kick) {   // takik lipit di kedua sisi tiap sudut depan & belakang
        var k = .018, w = .028;
        path = [[xL + .1, 0, zF], [xR - w - .01, 0, zF], [xR - w / 2 - .01, 0, zF - k], [xR - .01, 0, zF], [xR, 0, zF], [xR, 0, zF - .01], [xR + 0, 0, zF - w / 2 - .01], [xR - k, 0, zF - w / 2 - .01], [xR, 0, zF - w - .01],
          [xR, 0, zB + w + .01], [xR - k, 0, zB + w / 2 + .01], [xR, 0, zB + .01], [xR, 0, zB], [xR - .01, 0, zB], [xR - w / 2 - .01, 0, zB + k], [xR - w - .01, 0, zB],
          [xL + w + .01, 0, zB], [xL + w / 2 + .01, 0, zB + k], [xL + .01, 0, zB], [xL, 0, zB], [xL, 0, zB + .01], [xL + k, 0, zB + w / 2 + .01], [xL, 0, zB + w + .01],
          [xL, 0, zF - w - .01], [xL + k, 0, zF - w / 2 - .01], [xL, 0, zF - .01], [xL, 0, zF], [xL + .01, 0, zF], [xL + w / 2 + .01, 0, zF - k], [xL + w + .01, 0, zF], [xL + .1, 0, zF]];
      } else path = XP.fillet([[0, 0, zF], [xR, 0, zF], [xR, 0, zB], [xL, 0, zB], [xL, 0, zF], [0, 0, zF]], .012, 3);
      path = path.map(function (q) { return [q[0], bot + hs / 2, q[2]]; });
      var sg = XP.sweep(XP.rrectPts(nt, hs, .002, 1), path, [0, 1, 0]);
      mesh(sg, F, g, false);
      // welt di tepi atas rok
      var pp = path.map(function (q) { return new T.Vector3(q[0], top - .006, q[2]); });
      if (!kick) lineTube(g, pp, .004, F, false);
    }

    // satu run sofa lurus. o: { H, SH, armH, arm, back, backTuft, seatTuft, seatC, seatD, leg, legH, legM, fill, st, frame, trim, armL, armR, cornerL, cornerR, n, pill, flat, ex, join, bolsters, balls }
    function run(len, D, o) {
      var fr = o.frame || 'upholstered';
      if (/^(wood|cane)$/.test(o.arm) && fr === 'upholstered') fr = 'woodExposed';   // lengan kayu / cane = rangka kayu ekspos
      if (fr === 'woodPlatform' && !o._in) {   // platform kayu (sofa/32): papan 4 cm di atas plinth mundur; menjorok 5 cm di depan & 3 cm di sisi
        var gP = new T.Group(), ov = .05, ph = .04, pl = Math.max(.05, Math.min(.12, o.legH || .08));
        box(gP, len - .16, pl, D - .16, dark('#1f1a16'), 0, pl / 2, -.01, .004);
        box(gP, len, ph, D, WOOD(), 0, pl + ph / 2, 0, .008);
        var inP = run(len - .06, D - ov, fo(o, { _in: 1, leg: 'none', y0: pl + ph })); inP.position.z = -ov / 2; gP.add(inP);
        return gP;
      }
      if (fr === 'metal' && !o._in) {   // rangka besi keliling (sofa/33): rel lantai + tiang depan/belakang memeluk sisi, palang di bawah badan
        var gM = new T.Group(), bt = .012, bh = .038, mm = METAL(), yb = Math.max(.08, o.legH || .12);
        var inM = run(len - 2 * bt - .002, D, fo(o, { _in: 1, leg: 'none', y0: yb })); gM.add(inM);
        var yt = o.arm === 'none' || !(o.armL || o.armR) ? yb + .1 : Math.max(yb + .1, armTop(o, o.back === 'low' ? Math.min(o.H, o.SH + Math.max(.16, (o.H - o.SH) * .55)) : o.H) - .06);
        [-1, 1].forEach(function (s) {
          var x = s * (len / 2 - bt / 2), zz = D / 2 - .025, ytS = (s < 0 ? (o.armL || o.cornerL) : (o.armR || o.cornerR)) ? yt : yb + .03;
          mesh(XP.sweep(XP.rrectPts(bh, bt, .003, 2), XP.fillet([[x, ytS, -zz], [x, bh / 2, -zz], [x, bh / 2, zz], [x, ytS, zz]], .035, 6), [1, 0, 0]), mm, gM, false);
          if (feet) feet.push([x, -zz], [x, zz]);
        });
        [-1, 1].forEach(function (e) { box(gM, len - 2 * bt, .03, .02, mm, 0, yb - .015, e * (D / 2 - .025), .003); });
        return gM;
      }
      var g = new T.Group(), F = FAB(), F2 = FAB2(), H = o.H, SH = o.SH, FL = o.fill || fillOf(), ST = o.st, a = o.recl || RECL, ta = Math.tan(a), tr = o.trim || [];
      var woodF = fr === 'woodExposed', back = o.back, BT = o.backTuft || 'plain', STF = o.seatTuft || 'plain';
      var armSt = o.arm, aw = woodF ? (armSt === 'none' ? .045 : ARMW.wood) : ARMW[armSt] || 0;
      if (!woodF && /^(pillow|scroll)$/.test(armSt)) aw = Math.min(aw, len * .17);
      var endW = function (has, corner) { return has ? aw : corner ? (woodF ? .045 : .17) : (woodF ? .045 : 0); };
      var awL = endW(o.armL, o.cornerL), awR = endW(o.armR, o.cornerR), woodEnd = tr.indexOf('woodEnd') >= 0 && !woodF;
      var y0 = o._in ? o.y0 : woodF ? Math.max(.12, o.legH || .12) : baseFor(g, o.leg === 'skirt' ? 'skirt' : o.leg, len, D, o.legH, o.legM, { y0: o.y0 });
      var li = len - awL - awR, cx = (awL - awR) / 2;
      var shell = /^(tight|low|camel|wavy|scallop|sloping|bolster)$/.test(back), loose = back === 'cushion' || back === 'pillow', floatB = back === 'floating';
      if (back === 'scallop') BT = 'channelV';
      if (BT !== 'plain' && loose && !/^(button|channelH|biscuit)$/.test(BT)) BT = BT === 'diamond' ? 'button' : 'channelH';
      var Hb = back === 'low' ? Math.min(H, SH + Math.max(.16, (H - SH) * .55)) : H, HbS = woodF && back !== false ? Hb - .035 : Hb;
      var varies = /^(camel|wavy|scallop|sloping)$/.test(back), lanes = back === 'scallop' ? Math.max(3, Math.round(li / .155)) : 0;
      var topF = varies ? XP.backTop(back, li, HbS, { n: o.n, lanes: lanes, SH: SH, side: o.slopeSide || 1 }) : null, topAt = topF ? function (x) { return topF(x - cx); } : function () { return HbS; };
      var tight = o.seatC === 'tight', contChan = shell && !varies && BT === 'channelV' && STF === 'channel' && (tight || o.seatC === 'bench');
      var ch = (.13 + FL.dh) * FL.hk, cr = FL.cr, fz = .004 + FL.bu, yS = SH - cr * .5, deckTop = (tight || contChan) ? yS : yS - ch;
      var zF = D / 2 - fz, ft = .12, bz = -D / 2 + ft, zSB = bz, faceZ = null, nails = tr.indexOf('nailhead') >= 0 ? [] : null;
      var pitV = BT === 'channelV' ? li / (lanes || Math.max(3, Math.round(li / (li > 1 ? .125 : .095)))) : 0;
      // dudukan tight / deck
      if (contChan) { /* dibangun utuh dengan sandaran */ }
      else if (tight) cushion(g, li, yS - y0, D, F, cx, y0 + (yS - y0) / 2, 0, fo(FL, { r: Math.max(.022, FL.r), cr: cr * .6, sag: FL.sag * .6, bu: 0, wr: 0, st: ST, topOnly: true, tuft: tuftOf(STF, 'seat', { pitch: STF === 'channel' && pitV ? pitV : null }) }));
      else box(g, li, deckTop - y0, D, F2, cx, y0 + (deckTop - y0) / 2, 0, .015);
      // sandaran
      if (back !== false) {
        if (contChan) {
          var prC = Math.min(.042, .02 + cr * .7 + FL.bu * .5), ftC = Math.max(.13 + (HbS - SH) * ta, Math.min(D - .4, D - o.seatD + .1 * ta)), zfC = -D / 2 + ftC;
          var pit = o.seatC === 'bench' ? (li > 1 ? .15 : .12) : (li > 1 ? .125 : .095), nsC = 1, perC = Math.max(2, Math.round(li / nsC / pit));
          var cbR = chanBody(g, F, cx, li, D, y0, SH, HbS, zfC, ta, prC, perC * nsC, 0, o.flat, ST, F2);
          yS = cbR[0]; faceZ = cbR[1];
        } else if (shell) {
          var ftB = Math.max(.13 + (HbS - yS) * ta, Math.min(D - .4, D - fz - o.seatD + (SH + .1 - yS) * ta)), zfB = -D / 2 + ftB;
          zSB = zfB;
          var bs = backShell(g, F, ST, cx, li, D, y0, yS, topAt, zfB, ta, BT, { varies: varies, lanes: lanes || 0, F2: F2, grp: 0 });
          faceZ = bs.face;
        } else if (back === 'cane') {   // sandaran rangka kayu + anyaman cane (armchair/19, 21)
          var W0 = WOOD(), zTopC = Math.max(-D / 2 + .035, zF - o.seatD - .016 - (HbS - yS) * ta), zAt = function (y) { return zTopC + (HbS - y) * ta; }, xp = li / 2 - .022;
          [-1, 1].forEach(function (s) { mesh(XP.bar([cx + s * xp, y0, zAt(y0)], [cx + s * xp, HbS - .002, zAt(HbS)], .036, .036, .006), W0, g, false); });
          var yT = HbS - .028, yBt = yS + .045, tiltC = function (m) { m.rotation.x = -a; return m; };
          tiltC(box(g, li - .02, .05, .03, W0, cx, yT, zAt(yT), .008)); tiltC(box(g, li - .02, .04, .03, W0, cx, yBt, zAt(yBt), .008));
          var cp = tiltC(box(g, li - .07, yT - yBt - .04, .006, caneM(), cx, (yT + yBt) / 2, zAt((yT + yBt) / 2), 0)); cp.castShadow = false;
          box(g, li, .05, Math.max(.06, zAt(y0) - (-D / 2) + .02), W0, cx, y0 + .025, (zAt(y0) - D / 2) / 2 + .005, .006);   // rel belakang menumpu tiang
          faceZ = function (y) { return zAt(y) + .016; }; zSB = zAt(yS) + .016;
        } else if (floatB) {   // bantal sandaran melayang pada tiang & rel rangka (sofa/09)
          var nP = Math.max(1, o.n || Math.round(li / .62)), thP = .13, gapP = .05, ybP = yS + gapP, hP = Math.max(.18, HbS - .01 - ybP), czP = Math.max(-D / 2 + .1, zF - o.seatD - thP / 2), cwP = li / nP, pm2 = fr === 'woodExposed' ? WOOD() : METAL(), zr = czP - thP / 2 - .012;
          for (var ip = 0; ip < nP; ip++) cushion(g, cwP - .02, thP, hP, F, cx - li / 2 + cwP * (ip + .5), ybP + hP / 2, czP, fo(FL, { r: .045, cr: .012, bu: .004, sag: 0, wr: 0, st: ST, rx: Math.PI / 2, tuft: tuftOf(BT, 'back') }));
          rod(g, [cx - li / 2 + .02, ybP + hP * .55, zr], [cx + li / 2 - .02, ybP + hP * .55, zr], .011, pm2, 14);
          [-1, 1].forEach(function (s) { rod(g, [cx + s * (li / 2 - .02), y0, zr], [cx + s * (li / 2 - .02), ybP + hP * .55 + .011, zr], .011, pm2, 14); });
          var zbfP = czP + thP / 2; faceZ = function (y) { return y > ybP + hP + .01 ? -9 : zbfP + (y < ybP ? -.2 : 0); }; zSB = zbfP;
        } else {
          var yb = yS - .004, btn = BT === 'button', rB = back === 'pillow' ? .042 : btn ? .03 : Math.max(.028, FL.r), hg0 = (HbS - .012 - yb) / Math.cos(a);
          var th = Math.cos(a) * (zF - o.seatD - bz - hg0 * Math.sin(a) + .25 * rB + (SH + .1 - yS) * ta), thX = .24, thN = .14;
          if (th > thX) { ft += (th - thX) / Math.cos(a); bz = -D / 2 + ft; zSB = bz; }
          else if (th < thN) { ft = Math.max(.07, ft - (thN - th) / Math.cos(a)); bz = -D / 2 + ft; zSB = bz; }
          th = Math.max(.14, Math.min(.24, th));
          box(g, li + .002, HbS - y0, ft, F2, cx, y0 + (HbS - y0) / 2, -D / 2 + ft / 2, .03);
          var hg = (HbS - .012 - yb - th * Math.sin(a)) / Math.cos(a), cyB = yb + th / 2 * Math.sin(a) + hg / 2 * Math.cos(a), czB = bz + th / 2 * Math.cos(a) + hg / 2 * Math.sin(a) - rB * .25;
          var zbf = czB + th / 2 * Math.cos(a) + hg / 2 * Math.sin(a), ybf = yb + th * Math.sin(a);
          faceZ = function (y) { return zbf - (y - ybf) * ta; };
          var n = Math.max(1, Math.round(li / .62)), cw = li / n, pil = back === 'pillow', tfB = tuftOf(BT, 'back');
          for (var i = 0; i < n; i++) cushion(g, cw - .01 - 2 * FL.bu, th, hg, F, cx - li / 2 + cw * (i + .5), cyB, czB, fo(FL, { r: rB, cr: tfB ? .006 : pil ? Math.min(.026, cr * 1.3 + .01) : cr * .8, bu: pil ? .008 : FL.bu * .6, sag: 0, wr: tfB ? 0 : pil ? .003 : FL.wr, st: ST, rx: Math.PI / 2 - a, tuft: tfB }));
        }
      }
      // bantal dudukan: dari muka sandaran sampai depan, di dalam lengan
      if (!tight && !contChan) {
        var ns = o.seatC === 'bench' ? 1 : Math.max(1, o.n || Math.round(li / .62)), sw = li / ns, gap = o.join ? -.004 : .008, sd = zF - zSB, tfS = tuftOf(STF, 'seat', { pitch: STF === 'channel' && pitV ? pitV : null });
        for (var s = 0; s < ns; s++) cushion(g, sw - gap - 2 * FL.bu, ch, sd - 2 * FL.bu, F, cx - li / 2 + sw * (s + .5), yS - ch / 2, (zF + zSB) / 2, fo(FL, { st: ST, tuft: tfS, cr: tfS ? Math.min(FL.cr, .006) : FL.cr, wr: tfS ? 0 : FL.wr }));
      }
      // lengan
      var chanArm = BT === 'channelV' && shell && !varies;
      var armAt = function (side) {
        var has = side < 0 ? o.armL : o.armR, corner = side < 0 ? o.cornerL : o.cornerR, xo = side * len / 2, w = side < 0 ? awL : awR;
        if (woodF) { woodArm(g, side, xo, w, D, y0, has ? Math.min(o.armH, Hb) : y0, { infill: armSt === 'cane' ? 'cane' : /^(wood|none)$/.test(armSt) ? null : 'uph', rearH: back !== false ? Hb - .035 : null, noRest: !has }); return; }
        if (has) sofaArm(g, F2, ST, armSt, side, xo, w, D, y0, armTop(o, Hb), 0, chanArm, yS, { nails: nails, woodEnd: woodEnd, armTuft: BT === 'diamond' && /^(scroll|rolled|english)$/.test(armSt) ? 'diamond' : null });
        else if (corner) sofaArm(g, F2, ST, 'corner', side, xo, w, D, y0, Hb, 0, chanArm, yS, {});
      };
      armAt(-1); armAt(1);
      if (woodF && back !== false) box(g, len - .03, .035, .05, WOOD(), 0, Hb - .0175, -D / 2 + .03, .008);   // rel atas sandaran kayu
      // bantal hias, bolster, bola
      var btnB = /^(button|diamond)$/.test(BT) ? .009 : 0, btnS = STF === 'button' ? .008 : 0;
      var pl = o.pill, ySp = (contChan ? SH : (tight ? yS + cr * .2 : yS + cr * .15)) + btnS;
      if (faceZ) {
        var fcr = (loose ? (back === 'pillow' ? Math.min(.026, cr * 1.3 + .01) : cr * .8) : 0) + btnB, fz2 = function (x, y) { return faceZ(y) + fcr; };
        var armQ = BT === 'diamond' && /^(scroll|rolled|english)$/.test(armSt) ? .022 : 0, xL = cx - li / 2 + (o.armL ? armQ : 0), xR = cx + li / 2 - (o.armR ? armQ : 0);
        if ((o.bolsters || o.balls) && !o.noEnds) { endBolsters(g, o.bolsters || 0, o.balls || 0, pl ? pl.mat : pillowMat(), xL, xR, ySp, function (y) { return faceZ(y) + fcr; }, zF); if (o.bolsters) { xL += .18 * Math.min(1, o.armL ? 1 : 0); xR -= .18 * Math.min(1, o.armR ? 1 : 0); } }
        if (pl && pl.n) pillowRow(g, pl.n, pl.mat, xL, xR, pl.center ? 'center' : pl.side || 'both', ySp, fz2, topF ? Math.min(topAt(xL), topAt(xR), topAt(cx)) : HbS, li > 1 ? .45 : .40, o.pillowType);
      }
      // detail hias: paku di rel bawah (depan + sisi lengan), list kuningan, rok
      var fL = o.armL && !woodF ? armFoot(armSt, aw) : 0, fR = o.armR && !woodF ? armFoot(armSt, aw) : 0;
      if (nails && !woodF) {
        var yn = (o.leg === 'skirt' ? y0 + .04 : y0 + .025), zn = (contChan ? D / 2 - Math.min(.042, .02 + cr * .7 + FL.bu * .5) * .95 : D / 2) + .0004, fr0 = [];
        fr0.push([cx - li / 2 + .015, yn, zn, 0, 0, 1], [cx + li / 2 - .015, yn, zn, 0, 0, 1]);
        nailPath(fr0).forEach(function (q) { nails.push(q); });
        var zfA = D / 2 - (armSt === 'english' ? .05 : 0) - .02, sideOk = !/^(pillow|none)$/.test(armSt);
        if (o.armL && sideOk) nailPath([[-len / 2 + fL - .0004, yn, zfA, -1, 0, 0], [-len / 2 + fL - .0004, yn, -D / 2 + .02, -1, 0, 0]]).forEach(function (q) { nails.push(q); });
        if (o.armR && sideOk) nailPath([[len / 2 - fR + .0004, yn, zfA, 1, 0, 0], [len / 2 - fR + .0004, yn, -D / 2 + .02, 1, 0, 0]]).forEach(function (q) { nails.push(q); });
        nailsOn(g, nails);
      }
      if (tr.indexOf('brassBand') >= 0 && !woodF) {
        var bp = XP.fillet([[0, 0, D / 2], [len / 2 - fR, 0, D / 2], [len / 2 - fR, 0, -D / 2], [-len / 2 + fL, 0, -D / 2], [-len / 2 + fL, 0, D / 2], [0, 0, D / 2]], .012, 3).map(function (q) { return [q[0], y0 + .012, q[2]]; });
        mesh(XP.sweep(XP.rrectPts(.004, .018, .0015, 1), bp, [0, 1, 0]), brass(), g, false);
      }
      if (o.leg === 'skirt' && !o._in && !woodF) skirtOn(g, F2, len, D, y0, fL, fR, o.skirt === 'kickpleat');
      // tambahan pada badan (deck depan)
      var ex = o.ex || [], fz3 = D / 2 + .002, xr = len / 2, hasR = o.armR && aw > 0;
      if (ex.indexOf('sofabed') >= 0) {
        box(g, li - .06, .004, .004, dark('#0d0b0a'), cx, y0 + (deckTop - y0) * .45, fz3, 0);
        box(g, .05, .07, .008, fabric(shade(colorHex, .7), c.uph), cx, deckTop - .045, fz3 + .003, .003);
        box(g, li - .1, .025, .012, linen(), cx, deckTop - .006, D / 2 - .015, .005);
        if (y0 > .05) rod(g, [cx - li / 2 + .08, y0 - .008, D / 2 - .1], [cx + li / 2 - .08, y0 - .008, D / 2 - .1], .009, metal(X.METAL[4]));
      }
      if (ex.indexOf('storage') >= 0) {
        box(g, li - .02, .005, .004, dark('#0d0b0a'), cx, deckTop - .028, fz3, 0);
        var nt = Math.max(1, o.n || 1); for (var q = 0; q < nt; q++) box(g, .035, .05, .006, dark('#5a3b26'), cx - li / 2 + li * (q + .5) / nt, deckTop - .05, fz3 + .003, .002);
      }
      if (ex.indexOf('recliner') >= 0) {
        var nr = Math.max(1, o.n || 1), rw = li / nr, ry = y0 + (deckTop - y0) / 2, rh = Math.max(.05, deckTop - y0 - .04);
        for (var qr = 0; qr < nr; qr++) { var rcx = cx - li / 2 + rw * (qr + .5); [-1, 1].forEach(function (e) { box(g, rw - .05, .004, .004, dark('#0d0b0a'), rcx, ry + e * rh / 2, fz3, 0); box(g, .004, rh, .004, dark('#0d0b0a'), rcx + e * (rw / 2 - .025), ry, fz3, 0); }); }
        var ly = hasR ? Math.min(o.armH, SH) - .08 : y0 + (deckTop - y0) / 2;
        if (hasR && !woodF) lever(g, xr - armFoot(armSt, aw) - (armSt === 'flared' ? .042 * Math.max(0, Math.min(1, (ly - y0) / (o.armH - .09 - y0))) : 0) - (armSt === 'pillow' ? .004 : 0), ly, D / 2 - .25, 1);
        else lever(g, cx + li / 2 + .001, y0 + (deckTop - y0) / 2, D / 2 - .25, 1);
      }
      if (ex.indexOf('cupholder') >= 0) {
        var Wd = WOOD();
        if (hasR && /^(track|shelter|panel)$/.test(armSt) && !woodF) {
          var ty = armTop(o, Hb) + .0095, tx = xr - aw / 2;
          box(g, aw - .01, .02, .42, Wd, tx, ty, D / 2 - .26, .006);
          [-1, 1].forEach(function (e) { cyl(g, .036, .036, .022, dark('#120f0d'), tx, ty + .002, D / 2 - .26 + e * .09, 28); torus(g, .037, .004, METAL(), tx, ty + .011, D / 2 - .26 + e * .09, 0, 40).rotation.x = Math.PI / 2; });
        } else {
          var kx = xr + .12; box(g, .24, SH + .1, D * .8, F2, kx, (SH + .1) / 2, 0, .03); box(g, .26, .02, D * .8 + .02, Wd, kx, SH + .11, 0, .006);
          [-1, 1].forEach(function (e) { cyl(g, .036, .036, .022, dark('#120f0d'), kx, SH + .113, e * .1, 28); torus(g, .037, .004, METAL(), kx, SH + .121, e * .1, 0, 40).rotation.x = Math.PI / 2; });
        }
      }
      if (ex.indexOf('usb') >= 0) {
        var onArm = hasR && /^(track|shelter|panel|pillow)$/.test(armSt) && !woodF, uy = onArm ? armTop(o, Hb) + .0015 : y0 + (deckTop - y0) / 2, ux = onArm ? xr - aw / 2 : cx + li / 2 + .002;
        if (onArm) { box(g, .05, .012, .085, dark(), ux, uy, .1, .003); [-1, 1].forEach(function (e) { box(g, .012, .004, .005, glow('#9fd0ff'), ux + e * .011, uy + .006, .1, 0); }); }
        else box(g, .012, .05, .085, dark(), ux, uy, .1, .003);
      }
      if (ex.indexOf('removable') >= 0 && !woodF) {
        [-1, 1].forEach(function (e) { var zx = e * (len / 2 - (e < 0 ? fL : fR) - .001); zipper(g, [zx, y0 + .03, D / 2 - .06], [zx, y0 + .03, -D / 2 + .06]); });
        zipper(g, [cx - li / 2 + .05, y0 + .03, -D / 2 + .001], [cx + li / 2 - .05, y0 + .03, -D / 2 + .001]);
      }
      return g;
    }
    function place(g, x, z, ry) { g.position.set(x, 0, z); g.rotation.y = ry || 0; root.add(g); return g; }
    function seatingCommon() {
      return {
        H: cm(c.h, 78), SH: cm(c.seatH, 44), armH: cm(c.armH, 62), arm: c.arm || 'track', back: c.back || 'cushion', seatC: c.seatC || 'split', seatD: cm(c.seatD, 58),
        leg: c.leg || 'tapered', legH: /^(plinth|metalplinth|floating)$/.test(c.leg) ? 0 : cm(c.legH, 12), legM: LEGM(), fill: fillOf(), st: c.stitch,
        backTuft: c.backTuft || 'plain', seatTuft: c.seatTuft || 'plain', frame: c.frame || 'upholstered', trim: c.trim || [], skirt: c.skirt || 'tailored',
        pillowType: c.pillowType || 'square', bolsters: +c.bolsters || 0, balls: +c.balls || 0
      };
    }
    // pecah segitiga yang panjang di sumbu x (≤ maxLen) agar bisa dilengkungkan mulus
    function tessX(geo0, maxLen) {
      var P0 = geo0.attributes.position.array, I0 = geo0.index ? geo0.index.array : null, nT = I0 ? I0.length : P0.length / 3, need = false;
      for (var q0 = 0; q0 < nT && !need; q0 += 3) { var a0 = (I0 ? I0[q0] : q0) * 3, b0 = (I0 ? I0[q0 + 1] : q0 + 1) * 3, c0 = (I0 ? I0[q0 + 2] : q0 + 2) * 3; if (Math.max(Math.abs(P0[a0] - P0[b0]), Math.abs(P0[b0] - P0[c0]), Math.abs(P0[c0] - P0[a0])) > maxLen) need = true; }
      if (!need) return geo0;
      var names = ['position', 'normal', 'uv'].filter(function (n) { return geo0.attributes[n]; }), sz = names.map(function (n) { return geo0.attributes[n].itemSize; });
      var pool = names.map(function (n) { return Array.prototype.slice.call(geo0.attributes[n].array); }), px = pool[0], nV = px.length / 3, cache = new Map(), out = [], stack = [], i;
      var mid = function (a, b) { var key = a < b ? a * 4194304 + b : b * 4194304 + a, m = cache.get(key); if (m !== undefined) return m; m = nV++; for (var j = 0; j < pool.length; j++) { var s = sz[j], pj = pool[j]; for (var q = 0; q < s; q++) pj.push((pj[a * s + q] + pj[b * s + q]) / 2); } cache.set(key, m); return m; };
      for (i = 0; i < nT; i += 3) stack.push(I0 ? I0[i] : i, I0 ? I0[i + 1] : i + 1, I0 ? I0[i + 2] : i + 2);
      while (stack.length) {
        var c3 = stack.pop(), b3 = stack.pop(), a3 = stack.pop(), d0 = Math.abs(px[a3 * 3] - px[b3 * 3]), d1 = Math.abs(px[b3 * 3] - px[c3 * 3]), d2 = Math.abs(px[c3 * 3] - px[a3 * 3]);
        if (Math.max(d0, d1, d2) <= maxLen) { out.push(a3, b3, c3); continue; }
        if (d0 >= d1 && d0 >= d2) { var m0 = mid(a3, b3); stack.push(a3, m0, c3, m0, b3, c3); }
        else if (d1 >= d2) { var m1 = mid(b3, c3); stack.push(a3, b3, m1, a3, m1, c3); }
        else { var m3 = mid(c3, a3); stack.push(a3, b3, m3, m3, b3, c3); }
      }
      var g2 = new T.BufferGeometry(); names.forEach(function (n, j) { g2.setAttribute(n, new T.Float32BufferAttribute(pool[j], sz[j])); }); g2.setIndex(out);
      return g2;
    }
    // tekuk grup lurus (sumbu x) sepanjang kurva bidang: kappa(s) = kelengkungan pada panjang busur s ∈ [0, L]; depan (+z) di sisi cekung bila kappa > 0
    function bendAlong(gb, L, kappa, center) {
      var N = 400, tab = [], ph = 0, px = 0, pz = 0, i, ds = L / N;
      for (i = 0; i <= N; i++) { tab.push([px, pz, ph, kappa(i * ds)]); var k1 = kappa(i * ds), k2 = kappa((i + 1) * ds); var phm = ph + k1 * ds / 2; px += Math.cos(phm) * ds; pz += Math.sin(phm) * ds; ph += (k1 + k2) / 2 * ds; }
      var mid = center ? tab[N / 2].slice() : [0, 0, 0], cm0 = Math.cos(-mid[2]), sm0 = Math.sin(-mid[2]); tab.forEach(function (q) { var dx = q[0] - mid[0], dz = q[1] - mid[1]; q[0] = dx * cm0 - dz * sm0; q[1] = dx * sm0 + dz * cm0; q[2] -= mid[2]; });
      var at = function (s) { var f = Math.max(0, Math.min(N, s / ds)), j = Math.min(N - 1, Math.floor(f)), t = f - j, A = tab[j], B = tab[j + 1]; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t]; };
      var ms = []; gb.updateMatrixWorld(true); gb.traverse(function (m) { if (m.isMesh && !m.isInstancedMesh) ms.push(m); });
      var ims = []; gb.traverse(function (m) { if (m.isInstancedMesh) ims.push(m); });
      var mapP = function (x, y, z) { var q = at(x + L / 2), sn = Math.sin(q[2]), cs = Math.cos(q[2]); return [q[0] - sn * z, y, q[1] + cs * z, q, sn, cs]; };
      ms.forEach(function (m) {
        var geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); geo = tessX(geo, .12); var P = geo.attributes.position, Nn = geo.attributes.normal;
        for (var i2 = 0; i2 < P.count; i2++) {
          var r = mapP(P.getX(i2), P.getY(i2), P.getZ(i2)), z = P.getZ(i2), q = r[3], sn = r[4], cs = r[5];
          P.setXYZ(i2, r[0], r[1], r[2]);
          if (Nn) { var st = Math.max(.05, 1 - q[3] * z), nx = Nn.getX(i2) / st, nz = Nn.getZ(i2), ny = Nn.getY(i2), Lh = Math.hypot(nx, ny, nz) || 1; Nn.setXYZ(i2, (nx * cs - nz * sn) / Lh, ny / Lh, (nx * sn + nz * cs) / Lh); }
        }
        geo.computeBoundingBox(); geo.computeBoundingSphere(); keep(geo);
        m.geometry = geo; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); gb.add(m);
      });
      ims.forEach(function (im) {   // kancing / paku: pindahkan tiap instance & putar ikut kurva
        var m4 = new T.Matrix4(), p = new T.Vector3(), qq = new T.Quaternion(), s = new T.Vector3(), rq = new T.Quaternion(), w = new T.Matrix4();
        im.updateMatrixWorld(true);
        for (var k = 0; k < im.count; k++) { im.getMatrixAt(k, m4); w.multiplyMatrices(im.matrixWorld, m4); w.decompose(p, qq, s); var r = mapP(p.x, p.y, p.z); rq.setFromAxisAngle(new T.Vector3(0, 1, 0), -r[3][2]); qq.premultiply(rq); p.set(r[0], r[1], r[2]); m4.compose(p, qq, s); im.setMatrixAt(k, m4); }
        im.position.set(0, 0, 0); im.rotation.set(0, 0, 0); im.scale.set(1, 1, 1); gb.add(im); im.instanceMatrix.needsUpdate = true;
      });
      return gb;
    }
    function bendGroup(gb, Rc) { var L = 0; return bendAlong(gb, (function () { var b = new T.Box3().setFromObject(gb); L = (b.max.x - b.min.x) + .02; return L; })(), function () { return 1 / Rc; }, true); }
    function pillowMat() { return fabric(c.pillowColor === 'accent' ? '#b88a2a' : c.pillowColor === 'contrast' ? contrast(colorHex) : colorHex, c.pillowColor === 'accent' ? 'velvet' : c.uph); }

    function sofa() {
      legCap = (c.trim || []).indexOf('castor') >= 0 ? 'castor' : (c.trim || []).indexOf('brassCap') >= 0 ? 'brass' : null;
      var o = seatingCommon(), W = cm(c.w, 220), D = cm(c.d, 92), R = cm(c.ret, 200), seats = parseFloat(c.seats) || 3, sh = c.shape || 'lurus', ex = c.extras || [];
      var common = function (extra) { return fo(o, extra); };
      var armOn = o.arm !== 'none', np = +c.pillows || 0, pm = np || o.bolsters || o.balls ? pillowMat() : null;
      var pill = function (n, side, center) { return n > 0 ? { n: n, mat: pm, side: side, center: center } : null; };
      var chB = o.backTuft === 'channelV' && o.seatTuft === 'channel' && (o.seatC === 'tight' || o.seatC === 'bench') && /^(tight|low)$/.test(o.back);
      var snapC = function (li, cx, x, n, cnt) { var pit = o.seatC === 'bench' ? (li > 1 ? .15 : .12) : (li > 1 ? .125 : .095), nC = Math.max(2, Math.round(li / pit)), p = li / nC, x0 = cx - li / 2; return cnt ? nC : x0 + Math.max(0, Math.min(nC, Math.round((x - x0) / p))) * p; };
      var exMain = ex.filter(function (e) { return e !== 'console' && e !== 'storageOttoman'; });
      if (sh === 'lurus' && ex.indexOf('console') >= 0) {   // konsol kayu terintegrasi di tengah (sectional/02)
        var cwC = .32, lw = (W - cwC) / 2, nL = Math.max(1, Math.ceil(seats / 2)), nR = Math.max(1, Math.floor(seats / 2) || 1);
        place(run(lw, D, common({ armL: armOn, armR: false, n: nL, ex: exMain.filter(function (e) { return e !== 'cupholder' && e !== 'usb'; }), pill: pill(Math.ceil(np / 2), -1), bolsters: Math.min(1, o.bolsters), balls: Math.ceil(o.balls / 2) })), -W / 2 + lw / 2, 0);
        place(run(lw, D, common({ armL: false, armR: armOn, n: nR, ex: exMain, pill: pill(Math.floor(np / 2), 1), bolsters: o.bolsters > 1 ? 1 : 0, balls: Math.floor(o.balls / 2), noEnds: false })), W / 2 - lw / 2, 0);
        consoleModule(cwC, D, o);
      }
      else if (sh === 'lurus') place(run(W, D, common({ armL: armOn, armR: armOn, n: Math.round(seats), ex: exMain, pill: pill(np) })), 0, 0);
      else if (sh === 'modular') {
        var n = Math.max(2, Math.round(seats)), gp = .008, uw = (W - gp * (n - 1)) / n;
        for (var i = 0; i < n; i++) place(run(uw, D, common({ armL: armOn && i === 0, armR: armOn && i === n - 1, n: 1, seatC: o.seatC === 'tight' ? 'tight' : 'bench', join: o.seatC === 'bench', pill: i === 0 ? pill(Math.ceil(np / 2), -1) : i === n - 1 ? pill(Math.floor(np / 2), 1) : null, bolsters: i === 0 || i === n - 1 ? Math.min(1, i === 0 ? o.bolsters : o.bolsters - 1) : 0, balls: 0, ex: i === n - 1 ? exMain : exMain.filter(function (e) { return /sofabed|storage|recliner|removable/.test(e); }) })), -W / 2 + uw / 2 + i * (uw + gp), 0);
      } else if (/^(lkiri|lkanan|u)$/.test(sh)) {
        var L2 = Math.max(.25, R - D), left = sh !== 'lkanan', right = sh !== 'lkiri', fl = null;
        if (chB) {
          var aL = left ? .17 : armOn ? ARMW[o.arm] : 0, aR = right ? .17 : armOn ? ARMW[o.arm] : 0, liM = W - aL - aR, cxM = (aL - aR) / 2; fl = [];
          if (left) fl.push([cxM - liM / 2, snapC(liM, cxM, -W / 2 + D, Math.round(seats))]);
          if (right) fl.push([snapC(liM, cxM, W / 2 - D, Math.round(seats)), cxM + liM / 2]);
        }
        place(run(W, D, common({ armL: armOn && !left, armR: armOn && !right, cornerL: left, cornerR: right, n: Math.round(seats), pill: pill(np), flat: fl, bolsters: 0, balls: 0, ex: exMain.filter(function (e) { return e !== 'cupholder' && e !== 'usb' || !right; }) })), 0, 0);
        if (left) place(run(L2, D, common({ armL: armOn, n: Math.max(1, Math.round(L2 / .65)), bolsters: o.bolsters ? 1 : 0, balls: 0 })), -W / 2 + D / 2, D / 2 + L2 / 2, Math.PI / 2);
        if (right) place(run(L2, D, common({ armR: armOn, n: Math.max(1, Math.round(L2 / .65)), bolsters: o.bolsters > (left ? 1 : 0) ? 1 : 0, balls: 0, ex: exMain.filter(function (e) { return e === 'cupholder' || e === 'usb'; }) })), W / 2 - D / 2, D / 2 + L2 / 2, -Math.PI / 2);
      } else if (/^chaise/.test(sh)) {
        var sd = sh === 'chaisekiri' ? -1 : 1, E = Math.max(.25, R - D), F = FAB(), F2 = FAB2(), FL = o.fill, ch = (.13 + FL.dh) * FL.hk, yS = o.SH - FL.cr * .5;
        var aw = armOn ? (ARMW[o.arm] || .15) : 0, cw = Math.min(.9, W * .42) - aw, gC = new T.Group(), liC = W - 2 * aw, flC = null;
        if (o.frame === 'woodExposed') aw = armOn ? ARMW.wood : .045;
        if (chB) { var xs0 = snapC(liC, 0, sd * (W / 2 - aw - cw), Math.round(seats)); cw = Math.abs(sd * liC / 2 - xs0); flC = [sd > 0 ? [xs0, liC / 2] : [-liC / 2, xs0]]; }
        place(run(W, D, common({ armL: armOn, armR: armOn, n: Math.round(seats), ex: exMain, pill: pill(np), flat: flC })), 0, 0);
        gC.position.set(sd * (W / 2 - (cw + aw) / 2), 0, D / 2 + E / 2); root.add(gC);
        var y0 = o.frame === 'woodPlatform' || o.frame === 'metal' ? baseFor(gC, 'plinth', cw + aw, E, 0, o.legM) : baseFor(gC, o.leg === 'skirt' ? 'skirt' : o.leg, cw + aw, E, o.legH, o.legM), lx = -sd * aw / 2;
        if (chB) {
          var prC = Math.min(.042, .02 + FL.cr * .7 + FL.bu * .5), ySB = o.SH - prC, zFr = E / 2 - prC * .9, rf = .035, qC = [[-E / 2, ySB]], kC;
          box(gC, cw, ySB - y0, E - prC * .9, F2, lx, y0 + (ySB - y0) / 2, -prC * .45, .03);
          qC.push([zFr - rf, ySB]); for (kC = 1; kC <= 6; kC++) { var aC = kC / 6 * Math.PI / 2; qC.push([zFr - rf + rf * Math.sin(aC), ySB - rf + rf * Math.cos(aC)]); } qC.push([zFr, y0 + .012]);
          var pC = path2(qC, -1), lC = lx - cw / 2 + .003, wC = cw - .006, nCc = Math.max(1, Math.round(cw / (liC / snapC(liC, 0, 0, Math.round(seats), 1))));
          channelSkin(gC, F, nCc, function (u, v) { var a2 = pC.at(v); return [lC + u * wC, a2[1], a2[0]]; }, function (u, v) { var nn = pC.nr(v); return [0, nn[1], nn[0]]; }, prC, 40, function (v) { return Math.min(1, (1 - v) / .012); }, wC, pC.len);
          yS = ySB;
        } else {
          box(gC, cw, yS - ch - y0, E, F2, lx, y0 + (yS - ch - y0) / 2, 0, .015);
          cushion(gC, cw - .008 - 2 * FL.bu, ch, E - .004 - 2 * FL.bu, F, lx, yS - ch / 2, -.002, fo(FL, { st: o.st, tuft: tuftOf(o.seatTuft, 'seat') }));
        }
        if (o.leg === 'skirt') skirtOn(gC, F2, cw + aw, E, y0, sd < 0 ? armFoot(o.arm, aw) : 0, sd > 0 ? armFoot(o.arm, aw) : 0, o.skirt === 'kickpleat');
        if (armOn && o.frame !== 'woodExposed') sofaArm(gC, F2, o.st, o.arm, sd, sd * (cw + aw) / 2, aw, E, y0, armTop(o, o.back === 'low' ? Math.min(o.H, o.SH + Math.max(.16, (o.H - o.SH) * .55)) : o.H), 0, false, yS, {});
        else if (o.frame === 'woodExposed') woodArm(gC, sd, sd * (cw + aw) / 2, aw, E, y0, armOn ? o.armH : y0, { noRest: !armOn, infill: o.arm === 'cane' ? 'cane' : null });
      } else if (sh === 'curved') {
        place(bendGroup(run(W, D, common({ armL: armOn, armR: armOn, n: Math.round(seats), ex: exMain, pill: pill(np) })), W / 1.9), 0, 0);
      } else if (sh === 'serpentine') {   // kidney / S: lengkung makin kuat ke ujung (sofa/22, sectional/11)
        var kMax = 1 / (D / 2 + .45), kap = function (L) { return function (s) { var u = 2 * s / L - 1; return kMax * (.35 + .65 * u * u); }; };   // jari-jari dalam di ujung ≥ 45 cm
        var SC = XP._serp || (XP._serp = {}), skey = [W, D, o.arm, o.back, o.backTuft, o.seatC, o.seatTuft, o.frame, o.leg, o.legH, o.SH, o.H, o.armH, o.st, c.fill, c.firm].join('|'), Ls = SC[skey];   // panjang busur tersimpan → satu kali bangun
        if (!Ls) { Ls = W * 1.25; for (var it = 0; it < 3; it++) { var wid = chordW(Ls, kap(Ls), D); Ls *= W / wid; } }
        var mkS = function (L) { return bendAlong(run(L, D, common({ armL: armOn, armR: armOn, n: Math.max(2, Math.round(L / .7)), seatC: o.seatC === 'split' ? 'bench' : o.seatC, ex: [], pill: pill(np) })), L, kap(L), true); };
        var gS = mkS(Ls), bS = new T.Box3().setFromObject(gS), wS = bS.max.x - bS.min.x;
        for (var itS = 0; itS < 2 && Math.abs(wS - W) > .005; itS++) { gS.traverse(function (m) { if (m.isMesh && m.geometry) m.geometry.dispose(); }); Ls *= W / wS; gS = mkS(Ls); bS = new T.Box3().setFromObject(gS); wS = bS.max.x - bS.min.x; }
        SC[skey] = Ls; centerX(gS); root.add(gS);
      } else if (sh === 'lcurve') {   // L dengan sudut melengkung (sectional/13): lurus → seperempat lingkaran → lurus
        var Rc = D / 2 + .38, aM = Math.max(.3, W - (Rc + D / 2)), aR2 = Math.max(.05, R - (Rc + D / 2)), Lc = aR2 + Rc * Math.PI / 2 + aM;
        var kapL = function (s) { return s > aR2 && s < aR2 + Rc * Math.PI / 2 ? 1 / Rc : 0; };
        var gL = new T.Group(); gL.add(run(Lc, D, common({ armL: armOn, armR: armOn, n: Math.max(2, Math.round(Lc / .65)), ex: [], pill: pill(np) })));
        gL = bendAlong(gL, Lc, kapL); gL.rotation.y = Math.PI / 2; gL.updateMatrixWorld(true);
        var bL = new T.Box3().setFromObject(gL); gL.position.set(-(bL.min.x + bL.max.x) / 2, 0, -(bL.min.z + bL.max.z) / 2 + 0); root.add(gL);
      }
      if (ex.indexOf('storageOttoman') >= 0) {   // modul ottoman storage setinggi dudukan di depan (sectional/10)
        var gO = new T.Group(), ow = Math.min(.9, W * .36), od = Math.min(.7, D * .72), oy = baseFor(gO, o.leg === 'skirt' || o.frame !== 'upholstered' ? 'plinth' : o.leg, ow, od, o.legH, o.legM), oh = o.SH - oy;
        var cu = cushion(gO, ow, oh, od, FAB2(), 0, oy + oh / 2, 0, { r: .028, cr: .004, bu: .002, st: o.st, topOnly: true, tuft: tuftOf(o.seatTuft, 'top') });
        seamTube(cu, cu.geometry, cu.geometry.userData.A, cu.geometry.userData.C, cu.geometry.userData.r, oh / 2 - .055, .0028, dark('#1a1512'), false);
        box(gO, .035, .045, .006, dark('#5a3b26'), 0, o.SH - .08, od / 2 + .002, .002);
        var bbS = new T.Box3().setFromObject(root); gO.position.set(sh === 'lurus' ? W * .18 : 0, 0, bbS.max.z + .1 + od / 2); root.add(gO);
      }
      legCap = null;
    }
    // lebar tali busur (bbox x) untuk run sepanjang L yang ditekuk dengan kappa
    function chordW(L, kappa, D) { var N = 200, ds = L / N, ph = 0, x = 0, z = 0, mn = 9, mx = -9, tb = [], i; for (i = 0; i <= N; i++) { tb.push([x, z, ph]); var k1 = kappa(i * ds); x += Math.cos(ph + k1 * ds / 2) * ds; z += Math.sin(ph + k1 * ds / 2) * ds; ph += k1 * ds; } var m = tb[N / 2].slice(); tb.forEach(function (q) { var a = q[2] - m[2], dx = q[0] - m[0], dz = q[1] - m[1], X0 = dx * Math.cos(-m[2]) - dz * Math.sin(-m[2]); [-D / 2, D / 2].forEach(function (zz) { var X = X0 - Math.sin(a) * zz; mn = Math.min(mn, X); mx = Math.max(mx, X); }); }); return mx - mn; }
    function centerX(g) { g.updateMatrixWorld(true); var b = new T.Box3().setFromObject(g); g.position.x -= (b.min.x + b.max.x) / 2; g.position.z -= (b.min.z + b.max.z) / 2; return g; }
    // konsol kayu: kotak kayu dengan nampan & dua cup holder, setinggi dudukan + 15 cm
    function consoleModule(w, D, o) {
      var g = new T.Group(), Wd = WOOD(), h = o.SH + .14, d = D - .06;
      box(g, w, h - .02, d, Wd, 0, (h - .02) / 2, -.01, .008);
      box(g, w + .01, .02, d + .01, Wd, 0, h - .01, -.01, .006);
      box(g, w - .06, .006, d * .5, dark('#2a1d14'), 0, h + .0005, -.01 - d * .15, .002);
      [-1, 1].forEach(function (e) { cyl(g, .036, .036, .006, dark('#120f0d'), 0, h + .001, d * .22 + e * .005, 28).position.x = e * .07; torus(g, .037, .004, brass(), e * .07, h + .004, d * .22, 0, 40).rotation.x = Math.PI / 2; });
      box(g, w - .04, .004, .004, dark('#120c08'), 0, h * .55, d / 2 - .01 + .002, 0);
      if (feet) feet.push([0, 0]);
      root.add(g); return g;
    }

    /* ---------------- CHAISE LOUNGE & DAYBED (sub baru) */
    function chaise() {
      var W = cm(c.w, 180), D = cm(c.d, 80), H = cm(c.h, 75), F = FAB(), F2 = FAB2(), FL = fillOf(), form = c.form || 'onearmL', tr = c.trim || [];
      var bk = form === 'curvedBack' ? 'curved' : (c.back || 'end'), base = c.base || 'tapered', ST = c.stitch, tp = c.top || 'plain';
      var SH = Math.min(cm(c.seatH, 42), H), legH = cm(c.legH, 14), flat = H < SH + .14;   // terlalu rendah untuk sandaran → daybed rata
      if (flat) { form = 'daybed'; bk = 'none'; }
      var ch = Math.max(.1, (.12 + FL.dh) * FL.hk), cr = Math.min(.008, FL.cr), yS = SH - cr * .5, a = .34, ta = Math.tan(a);
      legCap = tr.indexOf('brassCap') >= 0 && /^(tapered|pin)$/.test(base) ? 'brass' : null;
      var nails = tr.indexOf('nailhead') >= 0 ? [] : null, g = root, y0, mx0 = -W / 2, mx1 = W / 2, mz0 = -D / 2, mz1 = D / 2, deck = true;
      // base
      if (base === 'platform') { var ph = .04, pl = .06; box(g, W - .16, pl, D - .16, dark('#1f1a16'), 0, pl / 2, 0, .004); box(g, W, ph, D, WOOD(), 0, pl + ph / 2, 0, .008); y0 = pl + ph; mx0 += .03; mx1 -= .03; mz0 += .0; mz1 -= .05; }
      else if (base === 'barFrame') {   // rel kayu di atas kaki besi lurus (gaya Barcelona)
        var rh = .05; y0 = Math.max(.12, yS - ch - rh); var Mt = METAL();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var x = q[0] * (W / 2 - .09), z = q[1] * (D / 2 - .022); box(g, .022, y0 + .01, .022, Mt, x, (y0 + .01) / 2, z, .004); if (feet) feet.push([x, z]); });
        [-1, 1].forEach(function (e) { box(g, W, rh, .03, WOOD(), 0, y0 + rh / 2, e * (D / 2 - .015), .006); box(g, .03, rh, D - .06, WOOD(), e * (W / 2 - .015), y0 + rh / 2, 0, .006); });
        for (var sl = 0; sl < 6; sl++) box(g, .06, .015, D - .05, WOOD(), -W / 2 + .1 + (W - .2) * sl / 5, y0 + rh - .0075, 0, .003);
        y0 += rh; mx0 += .015; mx1 -= .015; mz0 += .015; mz1 -= .015; deck = false;
      }
      else if (base === 'woodFrame') {   // rangka kayu, kasur di dalam (chaise/04)
        var fh = .1, lh2 = Math.max(.06, yS - ch - fh + .05), Wd = WOOD();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { leg(g, 'straight', q[0] * (W / 2 - .03), q[1] * (D / 2 - .03), lh2, Wd); });
        [-1, 1].forEach(function (e) { box(g, W, fh, .035, Wd, 0, lh2 + fh / 2, e * (D / 2 - .0175), .008); box(g, .035, fh, D - .07, Wd, e * (W / 2 - .0175), lh2 + fh / 2, 0, .008); });
        box(g, W - .07, .02, D - .07, Wd, 0, lh2 + .03, 0, .003);
        y0 = lh2 + .04; mx0 += .035; mx1 -= .035; mz0 += .035; mz1 -= .035; deck = false;
      }
      else { var lt = base === 'pin' ? 'pin' : 'tapered', lm = base === 'pin' ? METAL() : WOOD(); y0 = baseFor(g, lt, W, D, legH, lm, { inset: .07 }); }
      var BTe = tp === 'channelH' ? 'channelH' : tp === 'biscuit' ? 'biscuit' : tp === 'button' ? 'button' : 'plain';
      // ujung naik (lengan / sandaran rebah) memakai profil sandaran sofa yang diputar 90°
      var te = .2, endAt = function (s, Hh, recl) {
        var gE = new T.Group(), Dl = 2 * te, zfB = -Dl / 2 + te + (Hh - yS) * Math.tan(recl) * .5, li = mz1 - mz0;
        var bs = backShell(gE, F, ST, 0, li, Dl, y0, yS, function () { return Hh; }, zfB, Math.tan(recl), BTe === 'plain' ? 'plain' : BTe, { F2: F2 });
        gE.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; gE.position.set(s < 0 ? mx0 + Dl / 2 : mx1 - Dl / 2, 0, (mz0 + mz1) / 2); g.add(gE);
        if (s === (form === 'onearmR' ? 1 : -1) && bk === 'end' && /^onearm/.test(form)) {   // bantal sandaran lepas bersandar di ujung
          var th = .12, hg = Math.max(.2, Hh - yS - .1), yb = yS - .002, cyE = yb + hg / 2 * Math.cos(recl) + th / 2 * Math.sin(recl), czE = zfB - (cyE - yS) * Math.tan(recl) + th / 2 / Math.cos(recl) - .001;
          cushion(gE, li - .08, th, hg, F, 0, cyE, czE, fo(FL, { r: .035, cr: .008, bu: .004, sag: 0, wr: 0, st: ST, rx: Math.PI / 2 - recl, tuft: tuftOf(BTe === 'channelH' ? 'channelH' : BTe, 'back') }));
          zfB += th / Math.cos(recl) * .85;
        }
        return { inner: s < 0 ? mx0 + Dl / 2 + zfB : mx1 - Dl / 2 - zfB, face: bs.face, Dl: Dl };
      };
      var x0 = mx0, x1 = mx1, endF = [];
      var endL = (form === 'onearmL' || form === 'curvedBack' || (form === 'armless' && bk === 'end') || (form === 'daybed' && bk === 'end')), endR = form === 'onearmR' || (form === 'daybed' && bk === 'end');
      var endH = form === 'daybed' || form === 'armless' ? Math.min(H, SH + .22) : H;
      if (form === 'curvedBack') endL = false;
      if (endL) { var eL = endAt(-1, endH, form === 'daybed' ? .05 : a); x0 = mx0 + te + (endH - yS) * 0 + (form === 'daybed' ? 0 : 0); x0 = mx0 + eL.Dl / 2 + (eL.inner - (mx0 + eL.Dl / 2)); endF.push([-1, eL]); }
      if (endR) { var eR = endAt(1, endH, form === 'daybed' ? .05 : a); x1 = eR.inner; endF.push([1, eR]); }
      // sandaran sisi (sepanjang belakang): onearm → menurun ke ujung terbuka; daybed → rata
      var zb0 = mz0, faceBack = null;
      if (bk === 'side' || form === 'curvedBack') {
        var tb = .16, hiS = form === 'daybed' || form === 'armless' ? Math.min(H, SH + .3) : H, loS = form === 'daybed' || form === 'armless' ? hiS : SH + .16, sL = form === 'onearmR' ? 1 : -1;
        var topS = function (x) { var t = (x - x0) / Math.max(.1, x1 - x0); if (sL > 0) t = 1 - t; var s2 = Math.max(0, Math.min(1, (t - .1) / .8)); s2 = s2 * s2 * (3 - 2 * s2); return hiS + (loS - hiS) * s2; };
        var Ds = 2 * tb, gS = new T.Group(), zfS = -Ds / 2 + tb;
        if (form === 'curvedBack') {   // sandaran melengkung mengelilingi ujung kiri lalu sepanjang belakang (chaise/02, 08)
          var Rb = Math.min(.42, (mz1 - mz0) * .55), Lc = Rb * Math.PI / 2 + (x1 - x0 - Rb - tb - .02) + (mz1 - mz0 - Rb - tb - .03), aE = mz1 - mz0 - Rb - tb - .03;
          var bsC = backShell(gS, F, ST, 0, Lc, Ds, y0, yS, function (x) { var s = x + Lc / 2, t = Math.max(0, Math.min(1, (s - aE - Rb * Math.PI / 2) / (x1 - x0 - Rb - tb - .02))); return H - (H - (SH + .2)) * Math.pow(t, 1.6); }, zfS, Math.tan(.2), BTe === 'channelH' ? 'channelV' : BTe, { F2: F2, varies: true });
          bendAlong(gS, Lc, function (s) { return s > aE && s < aE + Rb * Math.PI / 2 ? 1 / (Rb + 0) : 0; });
          gS.rotation.y = Math.PI / 2; gS.updateMatrixWorld(true); var bC = new T.Box3().setFromObject(gS);
          gS.position.set(mx0 - bC.min.x, 0, mz0 - bC.min.z); g.add(gS);
          x0 = mx0 + tb; zb0 = mz0 + tb; faceBack = function () { return mz0 + tb; };
        } else {
          var bsS = backShell(gS, F, ST, (x0 + x1) / 2, x1 - x0, Ds, y0, yS, topS, zfS, Math.tan(.2), BTe === 'channelH' ? 'channelH' : BTe, { F2: F2, varies: form !== 'daybed' && form !== 'armless' });
          gS.position.z = mz0 + Ds / 2; g.add(gS);
          zb0 = mz0 + tb; faceBack = function (y) { return bsS.face(y) + mz0 + Ds / 2; };
        }
      }
      // dek & kasur / bantal atas dengan pola permukaan
      var mW = x1 - x0, mD = mz1 - zb0, mcx = (x0 + x1) / 2, mcz = (zb0 + mz1) / 2;
      if (deck) box(g, mx1 - mx0, yS - ch - y0, mz1 - mz0, F2, (mx0 + mx1) / 2, y0 + (yS - ch - y0) / 2, (mz0 + mz1) / 2, .015);
      var tf = tp === 'channelH' ? { pat: 'chanZ', pitch: .11, proud: .018 } : tuftOf(tp, 'top', { pitch: tp === 'biscuit' ? .2 : null, pitchZ: tp === 'biscuit' ? .18 : null });
      if (form === 'curvedBack') {   // kasur dengan sudut belakang-kiri membulat mengikuti sandaran
        var bvM = Math.min(.03, FL.r + .006), sh2 = new T.Shape(), rr = Math.min(.36, mD * .5), X0 = x0 + bvM, X1 = x1 - .004 - bvM, Z0 = -(mz1 - bvM), Z1 = -(zb0 + bvM);
        sh2.moveTo(X0, Z0); sh2.lineTo(X1, Z0); sh2.lineTo(X1, Z1); sh2.lineTo(X0 + rr, Z1); sh2.quadraticCurveTo(X0, Z1, X0, Z1 - rr); sh2.lineTo(X0, Z0);
        slab(g, sh2, ch + cr * .5, F, yS - ch, bvM, 4);
        if (tf) { var gq = XP.quilt(function (u, v) { var x = X0 + .02 + u * (X1 - X0 - .04), z = mz1 - .02 - v * (mD - .04); return [x, yS + cr * .5, z]; }, function () { return [0, 1, 0]; }, X1 - X0 - .04, mD - .04, tp === 'channelH' ? 'channelV' : tp, tf.pitch, tf.pitchZ || tf.pitch, tf.proud * .6, function (v, u) { var x = X0 + .02 + u * (X1 - X0 - .04), z = mz1 - .02 - v * (mD - .04), dx = x - (X0 + rr), dz = z - (zb0 + rr); var corner = dx < 0 && dz < 0 ? Math.max(0, 1 - (Math.hypot(dx, dz) - rr + .05) / .05) : 1; return Math.min(corner, Math.min(u, 1 - u, v, 1 - v) * 12); }); var mq = mesh(gq, F, g, true); mq.position.y = -tf.proud * .6 - .0012; }
      } else {
        var cu = cushion(g, mW - .004, ch, mD - .004, F, mcx, yS - ch / 2, mcz, fo(FL, { r: Math.max(.02, FL.r), cr: tf ? .004 : cr, bu: 0, sag: 0, wr: 0, st: ST, topOnly: true, tuft: tf }));
      }
      // bolster kepala & bolster ujung (berbaring di kasur, sumbu melintang)
      var bm = pillowMat(), nb = +c.bolsters || 0, slots = [];
      var faceX = function (s) { var e = endF.filter(function (q) { return q[0] === s; })[0]; return e ? (s < 0 ? x0 : x1) : (s < 0 ? x0 : x1); };
      var head = c.headrest === 'yes';
      if (head) slots.push([form === 'onearmR' ? 1 : -1, .15, 'head']);
      for (var b = 0; b < nb; b++) { var s3 = head ? (form === 'onearmR' ? -1 : 1) : (b ? 1 : -1); if (slots.some(function (q) { return q[0] === s3; })) s3 = -s3; if (slots.some(function (q) { return q[0] === s3; })) break; slots.push([s3, .17, 'end']); }
      slots.forEach(function (q) {
        var s = q[0], d = q[1], L = Math.min(.7, mD - .06), yB = yS + d / 2 + .002, hasEnd = endF.some(function (e) { return e[0] === s; });
        var ef = endF.filter(function (e) { return e[0] === s; })[0], xb = ef ? ef[1].inner - s * (d / 2 + .004) : (s < 0 ? x0 + d / 2 + .004 : x1 - d / 2 - .004);
        var m = mesh(XP.bolsterGeo(d, L), q[2] === 'head' ? fabric(shade(colorHex, .8), c.uph) : bm, g, false); m.rotation.y = Math.PI / 2; m.position.set(xb, yB, mcz); m.userData.pillow = 1;
      });
      // detail hias
      if (nails && deck) {
        var yn = y0 + .025, np2 = [];
        nailPath([[mx0 + .02, yn, mz1 + .0004, 0, 0, 1], [mx1 - .02, yn, mz1 + .0004, 0, 0, 1]]).forEach(function (p) { np2.push(p); });
        [-1, 1].forEach(function (s) { nailPath([[s < 0 ? mx0 - .0004 : mx1 + .0004, yn, mz1 - .02, s, 0, 0], [s < 0 ? mx0 - .0004 : mx1 + .0004, yn, mz0 + .02, s, 0, 0]]).forEach(function (p) { np2.push(p); }); });
        nailsOn(g, np2);
      } else if (nails) {   // kasur pada rangka: paku di tepi bawah kasur
        var yn2 = yS - ch + .02, np3 = nailPath([[x0 + .03, yn2, mz1 - .002 + .0004, 0, 0, 1], [x1 - .03, yn2, mz1 - .002 + .0004, 0, 0, 1]]); nailsOn(g, np3);
      }
      if (tr.indexOf('brassBand') >= 0) {
        var bp = XP.fillet([[0, 0, mz1], [mx1, 0, mz1], [mx1, 0, mz0], [mx0, 0, mz0], [mx0, 0, mz1], [0, 0, mz1]], .012, 3).map(function (q) { return [q[0], (deck ? y0 : yS - ch) + .012, q[2]]; });
        mesh(XP.sweep(XP.rrectPts(.004, .018, .0015, 1), bp, [0, 1, 0]), brass(), g, false);
      }
      legCap = null;
    }

    // BARREL / TUB / ROUND: satu cangkang melengkung utuh (sandaran turun jadi lengan), atas membulat; dudukan di dalamnya
    function barrel(o, W, D, F, np, pm) {
      var round = !!o.round, F2 = FAB2(), BT = o.backTuft || 'plain', bk = o.back;
      if (bk === 'scallop') BT = 'channelV';
      var y0 = o.y0 != null ? o.y0 : baseFor(root, o.leg, W * .7, D * .7, o.legH, o.legM), FL = o.fill, ch = (.13 + FL.dh) * FL.hk, cr = FL.cr, yS = o.SH - cr * .5;
      var t = .11, ro = W / 2, rzB = round ? Math.min(D * .5, ro) : Math.min(D * .5, ro), kz = rzB / ro, zS = -D / 2 + rzB, zAF = D / 2 - .03;
      var Ae = Math.PI / 2 + Math.max(0, zAF - zS) / ro, A = 2 * Ae;
      var chan = BT === 'channelV', chH = BT === 'channelH', pr = chan ? .026 : chH ? .022 : 0, ri = ro - t, rin = ri + pr;
      var Hb = bk === 'low' ? Math.min(o.H, o.SH + Math.max(.16, (o.H - o.SH) * .55)) : o.H, aH = round ? Math.min(Hb - .06, o.SH + .2) : Math.min(Hb - .04, Math.max(o.SH + .16, o.armH));
      var scal = bk === 'scallop' ? XP.backTop('scallop', A * ro, 0, { lanes: Math.max(5, Math.round(A * rin / .13)) }) : null;
      var hAt = function (th) { var w = Math.min(1, Math.abs(th) / (round ? Math.PI * .7 : Math.PI / 2)), s = Math.max(0, Math.min(1, (w - .3) / .65)); s = s * s * (3 - 2 * s); var h = aH + (Hb - aH) * (1 - s) - (chan ? pr / 2 : 0); if (scal) h += scal(th * ro); return h; };
      var XZ = function (th, rr) { var a2 = Math.abs(th); if (a2 <= Math.PI / 2) return [Math.sin(th) * rr, zS - Math.cos(th) * rr * kz]; return [Math.sign(th) * rr, zS + (a2 - Math.PI / 2) * ro]; };
      var NXZ = function (th) { if (Math.abs(th) > Math.PI / 2) return [Math.sign(th), 0]; var nx = Math.sin(th), nz = -Math.cos(th) / kz, l = Math.hypot(nx, nz); return [nx / l, nz / l]; };
      var lb = bk === 'cushion' || bk === 'pillow' ? .14 : 0, tb = Math.max(t, Math.min(t + (Hb - yS) * .27, (D - o.seatD - lb) / kz - .02));
      if (round) tb = Math.max(t, Math.min(t + (Hb - yS) * .2, (D - o.seatD) / 2 / kz));
      var rSat = function (th) { var cth = Math.max(0, Math.cos(th)); return ro - (t + (tb - t) * cth * cth) + pr; };
      var zBi = zS - rSat(0) * kz, zSF = D / 2 - .004;
      var BK = []; for (var bq = 0; bq <= 24; bq++) { var tq = -Math.PI / 2 + Math.PI * bq / 24; BK.push(XZ(tq, rSat(tq))); }
      var backZ = function (x) { for (var q = 1; q < BK.length; q++) if (x <= BK[q][0]) { var f = (x - BK[q - 1][0]) / ((BK[q][0] - BK[q - 1][0]) || 1); return BK[q - 1][1] + (BK[q][1] - BK[q - 1][1]) * Math.max(0, Math.min(1, f)); } return BK[BK.length - 1][1]; };
      var seatPts = function (ins) {
        var P = [], k, w = rin - ins;
        if (round) { for (k = 0; k < BK.length; k++) { var xr = BK[k][0] * w / rin; P.push([xr, backZ(xr) + ins]); } var zc2 = zSF - ins - w; for (k = 1; k <= 4; k++) P.push([w, BK[BK.length - 1][1] + ins + (zc2 - BK[BK.length - 1][1] - ins) * k / 4]); for (k = 1; k < 24; k++) { var aR = k / 24 * Math.PI; P.push([w * Math.cos(aR), zc2 + w * Math.sin(aR) * Math.min(1, (zSF - ins - zc2) / w)]); } for (k = 0; k < 4; k++) P.push([-w, zc2 - (zc2 - BK[0][1] - ins) * k / 4]); return P; }
        for (k = 0; k < BK.length; k++) { var x = BK[k][0] * w / rin; P.push([x, backZ(x) + ins]); } for (k = 1; k <= 6; k++) P.push([w, P[P.length - 1][1] + (zSF - ins - BK[BK.length - 1][1] - ins) / 6]); for (k = 1; k <= 10; k++) P.push([w - 2 * w * k / 10, zSF - ins]); for (k = 1; k < 6; k++) P.push([-w, zSF - ins - (zSF - ins - BK[0][1] - ins) * k / 6]); return P; };
      var seatShape = function (ins) { return new T.Shape(seatPts(ins).map(function (q) { return new T.Vector2(q[0], -q[1]); })); };
      var prof = function (h, th) { var q = [[ro, y0], [ro, h - t / 2]]; for (var k = 1; k < 10; k++) { var p2 = k / 10 * Math.PI; q.push([rin + t / 2 - pr / 2 + (t - pr) / 2 * Math.cos(p2), h - t / 2 + (t - pr) / 2 * Math.sin(p2)]); } q.push([rin, h - t / 2]); q.push([rSat(th), yS + .02]); q.push([rSat(th), y0]); q.push([ro, y0]); return q; };
      var nth = scal ? 160 : 56, npf = prof(1, 0).length, pos = [], uv = [], idx = [], i, j;
      for (i = 0; i <= nth; i++) { var th = -A / 2 + A * i / nth, pf = prof(hAt(th), th), acc = 0; for (j = 0; j < npf; j++) { var xz = XZ(th, pf[j][0]); if (j) acc += Math.hypot(pf[j][0] - pf[j - 1][0], pf[j][1] - pf[j - 1][1]); pos.push(xz[0], pf[j][1], xz[1]); uv.push(th * ro, acc); } }
      for (i = 0; i < nth; i++) for (j = 0; j < npf - 1; j++) { var a0 = i * npf + j, b0 = a0 + npf; idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); }
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      mesh(geo, F2, root, true);
      [-1, 1].forEach(function (e) {
        var th = e * A / 2, pf = prof(hAt(th), th), cp = [], cu = [], ci = [], cxz = XZ(th, (ro + rin) / 2), cyy = (y0 + hAt(th)) / 2;
        cp.push(cxz[0], cyy, cxz[1]); cu.push(0, 0);
        pf.forEach(function (q) { var xz = XZ(th, q[0]); cp.push(xz[0], q[1], xz[1]); cu.push(q[0], q[1]); });
        for (var k = 1; k < pf.length; k++) e > 0 ? ci.push(0, k, k + 1) : ci.push(0, k + 1, k);
        var cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cp, 3)); cg.setAttribute('uv', new T.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals(); XP.fixOut(cg, [XZ(th, 0)[0] * 0, cyy, zS]); mesh(cg, F2, root, true);
      });
      var faceZ = function () { return zBi; }, ftop = Hb;
      var stf = o.seatTuft && o.seatTuft !== 'plain' ? o.seatTuft : null;
      if (!(chan && o.seatTuft === 'channel')) {
        var bvS = Math.min(.03, Math.max(.015, FL.r));
        slab(root, seatShape(-.003 + .01), yS - ch - y0, F2, y0, .01);
        slab(root, seatShape(.004 + FL.bu + bvS), ch + cr * .5, F, yS - ch, bvS, 4);
        if (o.st === 'piping') { var ol = seatPts(.004 + FL.bu + bvS * .3); ol.push(ol[0]); lineTube(root, ol.map(function (q) { return new T.Vector3(q[0], yS + cr * .5 - bvS * .3, q[1]); }), .0042, pipeMat(), false); }
      } else {
        var prS = Math.min(.042, .02 + cr * .7 + FL.bu * .5); yS = o.SH - prS;
        slab(root, seatShape(.012 + prS * .2), yS - y0, F, y0, .012);
        var xm = rin - .006, cS = {}, nS = Math.max(4, Math.round(2 * xm / .095));
        var sp = function (u) { var k = u.toFixed(5); if (cS[k]) return cS[k]; var x = -xm + 2 * xm * u, zl = zSF - prS * .95, zb2 = backZ(x), rf = .03, q = [[zl, y0 + .012], [zl, yS - rf]], m3;
          for (m3 = 1; m3 <= 5; m3++) { var a4 = m3 / 5 * Math.PI / 2; q.push([zl - rf + rf * Math.cos(a4), yS - rf + rf * Math.sin(a4)]); }
          q.push([zb2 + .06, yS]); q.push([zb2 + .015, yS + .012]); q.push([zb2, yS + .05]); q.push([zb2, yS + .09]);
          return (cS[k] = { x: x, p: path2(q, 1) }); };
        channelSkin(root, F, nS, function (u, v) { var P = sp(u), q = P.p.at(v); return [P.x, q[1], q[0]]; }, function (u, v) { var n = sp(u).p.nr(v); return [0, n[1], n[0]]; }, prS, 44, function (v) { return Math.min(1, v / .012, (1 - v) / .16); }, 2 * xm, rin * 2.4);
      }
      if (chan || chH) {   // lajur tegak (channelV, scallop) atau mendatar (channelH, armchair/16) di muka dalam, melingkar di atas
        var cache = {}, A2 = A - .08;
        var pathAt = function (u) { var k = u.toFixed(5); if (cache[k]) return cache[k]; var th = -A2 / 2 + A2 * u, h = hAt(th) + pr, rr = (t - pr) / 2, q = [[rSat(th), yS + .02], [rin, h - t / 2 - pr]]; for (var m2 = 1; m2 <= 9; m2++) { var p2 = m2 / 12 * Math.PI; q.push([rin + rr - rr * Math.cos(p2), h - t / 2 - pr + rr * Math.sin(p2)]); } return (cache[k] = { th: th, p: path2(q, -1) }); };
        var P = function (u, v) { var Pp = pathAt(u), q = Pp.p.at(v), xz = XZ(Pp.th, q[0]); return [xz[0], q[1], xz[1]]; }, N = function (u, v) { var Pp = pathAt(u), n = Pp.p.nr(v), nh = NXZ(Pp.th); return [nh[0] * n[0], n[1], nh[1] * n[0]]; };
        if (chan) channelSkin(root, F, scal ? Math.max(5, Math.round(A * rin / .13)) : Math.max(7, Math.round(A * rin / .095)), P, N, pr, scal ? 40 : 30, function (v) { return Math.min(1, v / .07, (1 - v) / .16); }, A2 * rin, .6);
        else quiltSkin(root, F, P, N, A2 * rin, .55, 'channelH', pr, function (v, u) { return Math.min(1, v / .05, (1 - v) / .25, Math.min(u, 1 - u) * 20); }, { pitchY: .085 });
      } else if (BT === 'button' || BT === 'diamond' || BT === 'biscuit') {
        var cache2 = {}, A3 = A - .1;
        var pathB = function (u) { var k = u.toFixed(5); if (cache2[k]) return cache2[k]; var th = -A3 / 2 + A3 * u, h = hAt(th), q = [[rSat(th), yS + .02], [rin, h - t / 2]]; return (cache2[k] = { th: th, p: path2(q, -1) }); };
        quiltSkin(root, F, function (u, v) { var Pp = pathB(u), q = Pp.p.at(v), xz = XZ(Pp.th, q[0]); return [xz[0], q[1], xz[1]]; }, function (u, v) { var Pp = pathB(u), n = Pp.p.nr(v), nh = NXZ(Pp.th); return [nh[0] * n[0], n[1], nh[1] * n[0]]; }, A3 * rin, Hb - yS - .1, BT, .004, function (v, u) { return Math.min(1, v / .08, (1 - v) / .2, Math.min(u, 1 - u) * 14); });
      } else if (bk === 'cushion' || bk === 'pillow') {
        var a = RECL, pil = bk === 'pillow', th2 = pil ? .17 : .14, rB = pil ? .042 : .03, bz = zBi + .01, yb = yS - .004, hg = (Hb - .03 - yb - th2 * Math.sin(a)) / Math.cos(a);
        var cy = yb + th2 / 2 * Math.sin(a) + hg / 2 * Math.cos(a), cz = bz + th2 / 2 * Math.cos(a) + hg / 2 * Math.sin(a);
        cushion(root, rin * (round ? 1.2 : 1.05), th2, hg, F, 0, cy, cz, fo(FL, { r: rB, cr: pil ? .022 : cr * .8, bu: pil ? .008 : FL.bu * .6, sag: 0, st: o.st, rx: Math.PI / 2 - a, tuft: tuftOf(o.backTuft, 'back') }));
        var zbf = cz + th2 / 2 * Math.cos(a) + hg / 2 * Math.sin(a), ybf = yb + th2 * Math.sin(a); faceZ = function (y) { return zbf - (y - ybf) * Math.tan(a); };
      }
      if (np) {
        var rF = pr ? rin - pr : rin, fcB = bk === 'pillow' ? .022 : bk === 'cushion' ? cr * .8 : 0;
        pillowRow(root, np, pm, -rF * .9, rF * .9, 'center', (chan && o.seatTuft === 'channel') ? o.SH : yS + cr * .4, function (x, y) { return Math.max(faceZ(y) + fcB, backZ(x) + pr + .006); }, ftop, .40, o.pillowType);
      }
      return { yS: yS };
    }

    /* ---------------- ARMCHAIR */
    function armBase(base, W, D, liftTo) {   // base selain kaki → tinggi bawah badan
      var Mt = METAL(), Wd = WOOD();
      if (base === 'swivelDisc') {   // disc rendah + leher putar (armchair/16): Ø ±0.6 W, tinggi 9 cm
        var R = Math.min(W, D) * .33; mesh(XP.lathe([[0, 0], [R, 0], [R + .002, .006], [R - .004, .02], [R * .55, .03], [.075, .036], [.07, .07], [.12, .072], [.12, .09], [0, .09]], 64), c.metal === 'brass' || !c.metal ? brass() : Mt, root, false);
        if (feet) feet.push([0, 0]); return .09;
      }
      if (base === 'swivelStar') {   // 5 lengan bintang + tiang (armchair/18)
        var hc = .2, armL = Math.min(.36, Math.min(W, D) * .42);
        cyl(root, .032, .036, hc - .06, Mt, 0, .06 + (hc - .06) / 2, 0, 24); puck(root, .14, .012, .004, 0, Mt, 0, hc - .012, 0);
        for (var k = 0; k < 5; k++) { var an = k / 5 * Math.PI * 2 + Math.PI / 2, ex = Math.cos(an) * armL, ez = Math.sin(an) * armL; mesh(XP.bar([0, .1, 0], [ex, .028, ez], .05, .03, .008, { w1: .03, t1: .02 }), Mt, root, false); cyl(root, .018, .02, .02, dark('#1a1715'), ex, .01, ez, 14); if (feet) feet.push([ex, ez]); }
        cyl(root, .05, .055, .05, Mt, 0, .075, 0, 24);
        return hc;
      }
      if (base === 'pedestal') {   // pedestal kayu bulat (armchair/20)
        var Rp = Math.min(W, D) * .34; mesh(XP.lathe([[0, 0], [Rp, 0], [Rp, .015], [Rp * .62, .05], [Rp * .45, .085], [Rp * .55, .11], [Rp * .62, .12], [0, .12]], 48), Wd, root, false); if (feet) feet.push([0, 0]); return .12;
      }
      return 0;
    }
    // runner goyang di bawah titik kaki (armchair/35): busur R 1.15 m, kursi diangkat, kaki diteruskan ke runner
    function rockers(g0, W, D) {
      var fts = feet || [], Rr = 1.15, sec = XP.rrectPts(.045, .03, .008, 2);
      var xs = {}; fts.forEach(function (f) { var k = f[0] > 0 ? 1 : -1; (xs[k] = xs[k] || []).push(f); });
      var zl = D / 2 + .08, top = function (z) { return Rr - Math.sqrt(Rr * Rr - z * z) + .045; }, lift = top(D / 2 - .06) + .005;
      root.children.slice(g0).forEach(function (ch2) { ch2.position.y += lift; });
      [-1, 1].forEach(function (s) {
        var L = xs[s] || [], x = L.length ? L.reduce(function (a2, f) { return a2 + f[0]; }, 0) / L.length : s * (W / 2 - .06), path = [];
        for (var i = 0; i <= 24; i++) { var z = -zl + 2 * zl * i / 24; path.push([x, Rr - Math.sqrt(Rr * Rr - z * z) + .0225, z]); }
        mesh(XP.sweep(sec, path, [1, 0, 0]), WOOD(), root, false);
        L.forEach(function (f) { var yt2 = top(f[1]); if (lift - yt2 > .003) mesh(XP.bar([f[0], yt2 - .004, f[1]], [f[0], lift + .004, f[1]], .03, .03, .005), WOOD(), root, false); });
      });
      feet = [[0, 0]];
    }
    // lounge rangka kayu (Z / compass / post) + bantal duduk & sandaran lepas
    function woodLounge(o, W, D, style, np, pm) {
      var Wd = WOOD(), F = FAB(), FL = o.fill, bw = .04, bt = .045, xs = W / 2 - bw / 2, ah = Math.min(o.armH, o.H - .08), SH = o.SH, ch = Math.max(.1, (.12 + FL.dh) * FL.hk), yR = SH - ch;
      var zf = D / 2 - .05, zb = -D / 2 + .06, bars = [], B = function (a2, b2, w0, t0, w1, t1, up) { bars.push(XP.bar(a2, b2, w0, t0, .007, { w1: w1 || w0, t1: t1 || t0, up: up })); };
      var backTop = o.H;
      if (style === 'zframe') {
        [-1, 1].forEach(function (s) { var x = s * xs; B([x, ah - .015, zb - .02], [x, ah - .015, zf + .046], bt, .03, bt, .03, [1, 0, 0]); B([x, ah - .03, zf], [x, .036, zb + .02], bt, bw, bt * .8, bw, [1, 0, 0]); B([x, .0235, zb - .01], [x, .0235, zf + .02], bt, .04, bt, .04, [1, 0, 0]); if (feet) feet.push([x, zb], [x, zf]); });
      } else if (style === 'compass') {
        [-1, 1].forEach(function (s) { var x = s * xs, zn = -.04; B([x, .011, zf], [x, ah - .028, zn + .06], .03, .034, .045, .045, [1, 0, 0]); B([x, .011, zb], [x, ah - .028, zn - .02], .03, .034, .045, .045, [1, 0, 0]); [zf, zb].forEach(function (zz) { cyl(root, .013, .015, .011, dark('#1d1915'), x, .0055, zz, 14); }); B([x, ah - .014, zb - .02], [x, ah - .014, zf + .048], .055, .028, .055, .028, [1, 0, 0]); if (feet) feet.push([x, zb], [x, zf]); });
      } else {   // post: kaki tegak + sandaran tangan datar (armchair/21, 25)
        [-1, 1].forEach(function (s) { var x = s * xs; B([x, 0, zf], [x, ah - .028, zf], .032, .032, .042, .042); B([x, 0, zb], [x, ah - .028, zb], .032, .032, .042, .042); B([x, ah - .014, zb - .03], [x, ah - .014, zf + .048], .06, .028, .06, .028, [1, 0, 0]); B([x, .16, zb], [x, .16, zf], .025, .025); if (feet) feet.push([x, zb], [x, zf]); });
      }
      // rel dudukan (depan & belakang) di antara sisi + rangka sandaran miring
      var zfr = zf - .02, zbr = zb + .04, recl = Math.max(.1, Math.min(.3, Math.atan2(zbr - (-D / 2 + .018), o.H - .02 - yR)));
      B([-xs, yR - .03, zfr], [xs, yR - .03, zfr], .04, .05); B([-xs, yR - .03, zbr], [xs, yR - .03, zbr], .04, .05);
      [-1, 1].forEach(function (s) { B([s * xs, yR - .03, zbr], [s * xs, yR - .03, zfr], .025, .045); });
      var yBt = backTop - .0175, zBt = zbr - (yBt - yR) * Math.tan(recl);
      [-1, 1].forEach(function (s) { B([s * (xs - .03), yR - .05, zbr], [s * (xs - .03), yBt - .01, zBt], .035, .035, .03, .03); });
      B([-(xs - .03), yBt, zBt], [xs - .03, yBt, zBt], .04, .035);
      B([-(xs - .03), yR + .08, zbr - .08 * Math.tan(recl)], [xs - .03, yR + .08, zbr - .08 * Math.tan(recl)], .03, .03);
      if (o.back === 'cane') { var cq = box(root, 2 * xs - .1, yBt - yR - .17, .006, caneM(), 0, (yBt + yR + .07) / 2, (zBt + zbr) / 2 + .01, 0); cq.rotation.x = -recl; }
      mesh(XP.merge(bars), Wd, root, false);
      // bantal duduk & sandaran (bantal lepas)
      var sw = 2 * xs - bw - .012, sd = zfr - zbr + .02;
      cushion(root, sw, ch, sd, F, 0, yR + ch / 2, (zfr + zbr) / 2 + .01, fo(FL, { st: o.st, tuft: tuftOf(o.seatTuft, 'seat') }));
      var bh = yBt - .03 - (SH + .02), bth = .11;
      if (o.back !== 'cane') {
        var by = SH + .02 + bh / 2 * Math.cos(recl), bz = zbr - (by - yR) * Math.tan(recl) + bth / 2 / Math.cos(recl) + .02;
        cushion(root, sw - .02, bth, bh, F, 0, by, bz, fo(FL, { r: .035, cr: .01, bu: .004, sag: 0, st: o.st, rx: Math.PI / 2 - recl, tuft: tuftOf(o.backTuft, 'back') }));
        if (np) pillowRow(root, np, pm, -sw / 2, sw / 2, 'center', SH, function (x, y) { return bz + bth / 2 * Math.cos(recl) - (y - by) * Math.tan(recl) + .01; }, o.H - .04, .4, o.pillowType);
      }
    }
    function armchair() {
      var o = seatingCommon(), W = cm(c.w, 84), D = cm(c.d, 86), sh = c.shape || 'standar', F = FAB(), ex = c.extras || [], base = c.base || 'legs';
      if (sh === 'swivel') { sh = 'standar'; if (base === 'legs') base = 'swivelDisc'; }
      if (ex.indexOf('rocking') >= 0 && base === 'legs') base = 'rocking';
      legCap = (o.trim.indexOf('castor') >= 0 ? 'castor' : o.trim.indexOf('brassCap') >= 0 ? 'brass' : null);
      if (sh === 'lounge') { o.SH -= .04; o.recl = Math.max(.17, Math.min(.27, .17 + (D - .7) / .14 * .1)); }   // lounge: lebih rendah & sandaran lebih miring
      if (sh === 'slipper') { o.arm = 'none'; o.SH -= .03; }
      if (/^(barrel|round)$/.test(sh)) o.arm = 'none';
      var g0 = root.children.length, np = +c.pillows || 0, pm = np ? pillowMat() : null;
      feet = [];
      var yB = 0;
      if (base !== 'legs' && base !== 'rocking') { yB = armBase(base, W, D); o.leg = 'none'; o.y0 = yB; legCap = null; }
      var liftR = 1.15 - Math.sqrt(1.15 * 1.15 - Math.pow(D / 2 - .06, 2)) + .05;
      if (base === 'rocking') { o.SH -= liftR; o.armH -= liftR; o.H -= liftR; if (sh !== 'woodframe') { o.leg = 'straight'; o.legH = Math.max(.03, o.legH - liftR); o.legM = WOOD(); legCap = null; } }   // seluruh kursi dibangun lebih rendah setinggi runner
      if (sh === 'woodframe') woodLounge(o, W, D, c.frameStyle || 'post', np, pm);
      else if (sh === 'barrel' || sh === 'round') barrel(fo(o, { round: sh === 'round', y0: base !== 'legs' && base !== 'rocking' ? yB : null }), W, D, F, np, pm);
      else {
        var ro = fo(o, { seatC: 'bench', armL: o.arm !== 'none', armR: o.arm !== 'none', n: 1, pill: np ? { n: np, mat: pm, center: true } : null, ex: ex.indexOf('recliner') >= 0 || sh === 'recliner' ? ['recliner'] : [] });
        if (sh === 'recliner') { ro.back = 'cushion'; ro.backTuft = 'channelH'; ro.reclH = 1; }
        if (o.arm === 'woodSide') { ro.arm = 'none'; ro.armL = ro.armR = false; ro.leg = 'none'; ro.y0 = Math.max(.15, o.legH); }
        if (/^(wood|cane)$/.test(o.arm)) ro.frame = 'woodExposed';
        var gr = run(o.arm === 'woodSide' ? W - .1 : W, D, ro); place(gr, 0, 0);
        if (o.arm === 'woodSide') [-1, 1].forEach(function (s) {   // panel kayu samping = kaki + lengan (armchair/08)
          var sp = new T.Shape(), ah = Math.min(o.armH, o.H - .05), zf = D / 2, zb = -D / 2, x = s * (W / 2 - .025);
          sp.moveTo(zb + .05, .01); sp.lineTo(zb + .14, .01); sp.quadraticCurveTo(zb + .16, .12, zb + .3, .12); sp.lineTo(zf - .3, .12); sp.quadraticCurveTo(zf - .16, .12, zf - .14, .01); sp.lineTo(zf - .05, .01); sp.quadraticCurveTo(zf, ah * .5, zf - .03, ah - .03); sp.quadraticCurveTo(zf - .04, ah, zf - .09, ah); sp.lineTo(zb + .06, ah); sp.quadraticCurveTo(zb + .01, ah, zb + .01, ah - .05); sp.quadraticCurveTo(zb + .01, ah * .4, zb + .05, .01);
          var geo = new T.ExtrudeGeometry(sp, { depth: .03, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 3, curveSegments: 10 }); geo.rotateY(-Math.PI / 2);
          var m = mesh(geo, WOOD(), root); m.position.x = s > 0 ? W / 2 - .01 : -W / 2 + .04;
          if (feet) feet.push([x, zb + .1], [x, zf - .1]);
        });
        if (sh === 'wingback') [-1, 1].forEach(function (s) {
          var shl = o.arm === 'shelter', aw = o.arm === 'none' ? 0 : ARMW[o.arm] || .15, wt = shl ? .05 : Math.max(.06, Math.min(.08, aw || .07)), ab = o.arm === 'none' ? o.SH + .1 : armTop(o, o.H), xo2 = shl ? W / 2 - aw : W / 2, b2 = .012, zb = -D / 2 + b2, Ht = o.H - b2, wd = Math.min(.42, D * .45);
          if (/^(rolled|english|scroll|flared)$/.test(o.arm)) xo2 = W / 2 - armFoot(o.arm, aw);
          var sp = new T.Shape(), Z = function (z) { return -z; };
          sp.moveTo(Z(zb), ab - .02); sp.lineTo(Z(zb + wd - .1), ab - .02); sp.quadraticCurveTo(Z(zb + wd + .02), ab + .02, Z(zb + wd - .01), ab + (Ht - ab) * .55);
          sp.quadraticCurveTo(Z(zb + wd - .05), Ht, Z(zb + wd * .45), Ht); sp.lineTo(Z(zb + .02), Ht); sp.quadraticCurveTo(Z(zb), Ht, Z(zb), Ht - .02); sp.lineTo(Z(zb), ab - .02);
          var geo = new T.ExtrudeGeometry(sp, { depth: wt - 2 * b2, bevelEnabled: true, bevelThickness: b2, bevelSize: b2, bevelSegments: 3, curveSegments: 10 });
          geo.rotateY(Math.PI / 2); var wm = mesh(geo, FAB2(), root); wm.position.x = s * (xo2 - wt / 2 + (shl ? .002 : 0)) - (wt - 2 * b2) / 2;
          if (o.st === 'piping') { var cv = sp.getPoints(10).filter(function (q) { return q.y > ab + .01; }); if (cv.length > 1) lineTube(root, cv.map(function (q) { return new T.Vector3(s * (xo2 - wt) + s * .003, q.y, -q.x); }), .0042, pipeMat(), false); }
          if (o.trim.indexOf('nailhead') >= 0 && ab < Ht - .1) { var ev = sp.getPoints(8).filter(function (q) { return q.y > ab + .02; }).map(function (q) { return [s * (xo2 - wt) + s * .0004 - s * .001, q.y - .016, -q.x - .0, s, 0, 0]; }); nailsOn(root, nailPath(ev)); }
        });
      }
      if (base === 'rocking') rockers(g0, W, D);
      if (ex.indexOf('recliner') >= 0 && sh === 'barrel') lever(root, W / 2, o.SH - .1 + yB, D / 2 - .25, 1);
      if (ex.indexOf('ottoman') >= 0) {   // ottoman pasangan: mewarisi base / rangka kursi
        var gO = new T.Group(), ow = Math.min(W * .72, .7), od = .45, oy, oh;
        if (sh === 'woodframe') {
          var Wd = WOOD(), oh2 = o.SH - .1; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { mesh(XP.bar([q[0] * (ow / 2 - .03), 0, q[1] * (od / 2 - .03)], [q[0] * (ow / 2 - .03), oh2 - .01, q[1] * (od / 2 - .03)], .03, .03, .006, { w1: .04, t1: .04 }), Wd, gO, false); });
          [-1, 1].forEach(function (e) { box(gO, ow - .02, .05, .03, Wd, 0, oh2 - .025, e * (od / 2 - .03), .006); box(gO, .03, .05, od - .06, Wd, e * (ow / 2 - .03), oh2 - .025, 0, .006); });
          cushion(gO, ow - .02, o.SH - .02 - oh2, od - .02, F, 0, oh2 + (o.SH - .02 - oh2) / 2, 0, { r: .03, cr: .006, st: o.st });
        } else {
          oy = baseFor(gO, base !== 'legs' ? 'plinth' : o.leg, ow, od, o.legH, o.legM); oh = o.SH - .02 - oy;
          cushion(gO, ow, oh - .006, od, FAB2(), 0, oy + (oh - .006) / 2, 0, { r: .028, cr: .006, bu: .003, st: o.st, topOnly: true, tuft: tuftOf(o.backTuft === 'diamond' ? 'diamond' : o.backTuft === 'button' ? 'button' : null, 'top') });
        }
        var bbA = new T.Box3().setFromObject(root); gO.position.z = bbA.max.z + .1 + od / 2; root.add(gO);
      }
      feet = null; legCap = null;
    }

    /* ---------------- BENCH */
    // garis luar bangku (x,z): lurus → persegi membulat, oval → kapsul, organik → kidney
    function benchShape(sh, w, d) { return sh === 'oval' ? capsule(w, d) : sh === 'organic' ? organic(w, d, 1.3) : rrect(w, d, .02); }
    function benchBack(g, style, len, H, D, bh, legM, yBase, up) {
      var Wd = WOOD(), F = FAB(), zPo = -D / 2 + .05, zPt = -D / 2 + .016, yb0 = H - .01, top = H + bh;
      var ba = Math.atan2(zPo - zPt, top - yb0), zPb = function (y) { return zPo - (y - yb0) / (top - yb0) * (zPo - zPt); };
      var woodBk = /^(cane|plank|spindle)$/.test(style), pm = woodBk ? Wd : legM, px = len / 2 - .04;
      var post = function (s, yTop) {
        if (woodBk) { mesh(XP.bar([s * px, yBase, zPo], [s * px, yb0, zPo], .032, .032, .005), Wd, g, false); mesh(XP.bar([s * px, yb0 - .005, zPo], [s * px, yTop, zPb(yTop)], .032, .032, .005), Wd, g, false); }
        else { rod(g, [s * px, yBase, zPo], [s * px, yb0, zPo], .014, pm); rod(g, [s * px, yb0, zPo], [s * px, yTop, zPb(yTop)], .014, pm); }
      };
      var tilt = function (m) { m.rotation.x = -ba; return m; };
      var ph = bh * .7, yc = H + bh * .55 + .02;
      if (style === 'bolster') {   // bolster silinder di atas tiang (bench/14)
        var d = .15, yB = top - d / 2; [-1, 1].forEach(function (s) { post(s, yB); });
        var bo = mesh(XP.bolsterGeo(d, len - .04), F, g, false); bo.position.set(0, yB, Math.max(zPb(yB) + .01, -D / 2 + d / 2 + .001)); return;
      }
      if (style === 'oval') {   // pad kapsul (bench/03, 16)
        [-1, 1].forEach(function (s) { post(s, yc + ph * .3); });
        var sl = slab(g, capsule(len - .06, ph + .04), .05, F, 0, .018, 4); sl.rotation.x = Math.PI / 2 - ba; sl.position.set(0, yc + 0, zPb(yc) + .033); return;
      }
      [-1, 1].forEach(function (s) { post(s, top); });
      if (style === 'cane' || style === 'spindle') {
        var yT = top - .025, yBt = H + .05;
        tilt(box(g, len - .04, .045, .028, Wd, 0, yT, zPb(yT), .006));
        if (style === 'cane') { tilt(box(g, len - .04, .035, .026, Wd, 0, yBt, zPb(yBt), .006)); tilt(box(g, len - .1, yT - yBt - .035, .006, caneM(), 0, (yT + yBt) / 2, zPb((yT + yBt) / 2), 0)).castShadow = false; }
        else { var ns = Math.max(4, Math.round(len / .085)); for (var i = 0; i < ns; i++) { var x = -len / 2 + .07 + (len - .14) * (i + .5) / ns; rod(g, [x, H - .005, zPb(H)], [x, yT - .015, zPb(yT - .015)], .0085, Wd, 10); } }
        return;
      }
      if (style === 'plank') { tilt(box(g, len - .08, ph, .024, Wd, 0, yc, zPb(yc), .005)); return; }
      if (style === 'channel') {   // banquette: panel tinggi berlajur tegak dari dudukan
        var hh = top - H - .01;
        cushion(g, len - .03, .07, hh, F, 0, H + .005 + hh / 2, zPb(H + hh / 2) + .036, { r: .025, cr: .004, rx: Math.PI / 2 - ba, tuft: { pat: 'chanZ', pitch: .12, proud: .016 } }); return;
      }
      if (up !== false) cushion(g, len - .08, .05, ph, F, 0, yc, zPb(yc) + .004, { r: .02, cr: .007, rx: Math.PI / 2 - ba, st: c.stitch });   // panel berlapis
      else tilt(box(g, len - .08, ph, .022, Wd, 0, yc, zPb(yc), .005));
    }
    function bench() {
      var W = cm(c.w, 160), D = cm(c.d, 42), H = cm(c.h, 46), sh = c.shape || 'lurus', F = FAB(), Wd = WOOD(), tr = c.trim || [];
      var top = c.top || 'upholstered', topMat = top === 'upholstered' ? F : top === 'rattan' ? cane('#d8bf8f') : Wd, tt = top === 'upholstered' ? .1 : .04;
      var hidden = /^(plinth|metalplinth|floating)$/.test(c.leg), ends = c.ends || 'none', TT = c.topTuft || 'plain';
      legCap = tr.indexOf('brassCap') >= 0 ? 'brass' : null;
      var lh = hidden ? 0 : Math.min(H - tt, cm(c.legH, 30));
      if (!hidden && H - tt - lh > .2) lh = H - tt - .2;
      var cushTop = c.cushion === 'seat' || c.cushion === 'seatback', ctop = top === 'upholstered' ? .008 : 0;
      var tfT = TT === 'channel' ? { pat: 'chanZ', pitch: .12, proud: .016 } : TT === 'button' ? tuftOf('button', 'top', { pitch: .14, pitchZ: .12 }) : null;
      if (sh === 'round') {   // bangku bulat: cincin (bila lebar > 2× dalam) atau pouf
        var Ro = W / 2, ring = W > 2 * D + .1, Ri = ring ? Ro - D : 0, legM0 = LEGM(), y0, up = top === 'upholstered';
        var geoF = function (h, rt, cr) { return ring ? ringGeo(Ri, Ro, h, rt, cr) : puckGeo(Ro, h, rt, cr); };
        if (hidden) {
          y0 = c.leg === 'floating' ? .09 : c.leg === 'metalplinth' ? .065 : .07;
          var pm = c.leg === 'floating' ? dark() : c.leg === 'metalplinth' ? metal(X.find(X.METAL, c.metal) || X.METAL[1]) : c.legFinish === 'wood' ? WOOD() : dark('#1f1a16'), ins = c.leg === 'floating' ? D * .3 : .02;
          mesh(ring ? ringGeo(Ri + ins, Ro - ins, y0, .003, 0) : puckGeo(Ro - (c.leg === 'floating' ? Ro * .4 : .02), y0, .003, 0), pm, root);
        } else {
          y0 = lh;
          var nl = ring ? 8 : 4;
          for (var li = 0; li < nl; li++) {
            var a = li / nl * Math.PI * 2 + .3, rl = ring ? (Ro + Ri) / 2 : Ro * .7, ca = Math.cos(a), sa = Math.sin(a);
            if (c.leg === 'sled' || c.leg === 'uSled') { rod(root, [ca * (rl - .07), .009, sa * (rl - .07)], [ca * (rl + .07), .009, sa * (rl + .07)], .009, legM0); rod(root, [ca * rl, .009, sa * rl], [ca * rl, lh, sa * rl], .009, legM0); [-1, 1].forEach(function (e) { sphere(root, .009, legM0, ca * (rl + e * .07), .009, sa * (rl + e * .07)); }); }
            else if (c.leg === 'slab') box(root, .04, lh, .16, legM0, ca * rl, lh / 2, sa * rl, .006).rotation.y = -a;
            else leg(root, c.leg, ca * rl, sa * rl, lh, legM0, 0, { dir: [ca, sa] });
          }
        }
        var th = up ? 0 : tt, bodyH = H - y0 - th - ctop;
        var body = mesh(geoF(bodyH, up ? .022 : .006, up ? ctop : 0), up ? F : Wd, root); body.position.y = y0;
        if (!up) { var tg = mesh(geoF(tt, .006, 0), topMat, root); tg.position.y = y0 + bodyH; }
        else { var yP = c.stitch === 'piping' ? H - ctop - .0066 : H - ctop - .001; puckStitch(root, Ro - .0066, yP, 0, 0, 1, c.stitch); if (ring && c.stitch === 'piping') puckStitch(root, Ri + .0066, yP, 0, 0, 1, c.stitch); }
        if (up && TT === 'button') { var bl = []; for (var rr = 0; rr < 3; rr++) { var rad = (ring ? (Ri + Ro) / 2 : Ro * (.25 + rr * .25)), n = ring ? Math.round(2 * Math.PI * rad / .15) : Math.max(1, Math.round(2 * Math.PI * rad / .15)); if (ring && rr) break; for (var k = 0; k < n; k++) { var an = k / n * Math.PI * 2; bl.push([Math.cos(an) * rad, H - ctop * (1 - Math.pow(rad / Ro, 2)) - .002, Math.sin(an) * rad]); } } bl.push(ring ? null : [0, H - .002, 0]); instOn(root, XP.buttonGeo(.0095), btnMat(), bl.filter(Boolean), .003); }
        if (cushTop) { var cg = mesh(geoF(.06, .025, .01), F, root); cg.position.y = H + .002; }
        if (c.cushion === 'seatback') { var bt = torus(root, ring ? Ri + .08 : Ro * .55, .07, F, 0, H + .13, 0, 0, 96); bt.rotation.x = Math.PI / 2; }
        if (c.storage === 'lid') { var sr = torus(root, Ro + .001, .003, dark(), 0, H - th - .02, 0, 0, 96); sr.rotation.x = Math.PI / 2; box(root, .035, .045, .006, dark('#5a3b26'), 0, H - th - .045, Ro + .001, .002); }
        if (c.storage === 'shelf') { var ss = mesh(ring ? ringGeo(Ri + .03, Ro - .03, .022, .004, 0) : puckGeo(Ro * .8, .022, .004, 0), Wd, root); ss.position.y = hidden ? H - th : Math.max(.05, lh * .3); }
        if (tr.indexOf('brassBand') >= 0) { var bb = mesh(ring ? ringGeo(Ro - .004, Ro + .0015, .018, .0015, 0) : ringGeo(Ro - .004, Ro + .0015, .018, .0015, 0), brass(), root); bb.position.y = H - (up ? .07 : tt + .018); }
        if (tr.indexOf('nailhead') >= 0 && up) { var nl2 = [], nn = Math.round(2 * Math.PI * Ro / .023); for (var q = 0; q < nn; q++) { var aq = q / nn * Math.PI * 2; nl2.push([Math.cos(aq) * (Ro + .0004), y0 + .02, Math.sin(aq) * (Ro + .0004), Math.cos(aq), 0, Math.sin(aq)]); } nailsOn(root, nl2); }
        legCap = null; return;
      }
      var g = new T.Group(), legM = LEGM(), bm = top === 'upholstered' ? F : Wd, lid = c.storage === 'lid', woodE = ends === 'woodEnds' && !/^(organic|round)$/.test(sh);
      var len = woodE ? W - .07 : W, shaped = sh === 'oval' || sh === 'organic';
      var hasBack = c.backrest && c.backrest !== 'none', bh = c.backrest === 'full' ? .42 : .22;
      if (shaped && top === 'upholstered' && !hidden) tt = Math.min(.18, Math.max(.1, H - lh));
      var lh2 = lid ? Math.max(.03, Math.min(H - tt - .1, lh * .5)) : lh, y0;
      feet = [];
      if (shaped) {   // kaki di dalam garis luar oval / organik
        var ixs = sh === 'oval' ? Math.max(.05, len / 2 - D / 2) : len * .36, izs = D * .26;
        if (hidden) { slab(g, benchShape(sh, len - .1, D - .1), .07, c.legFinish === 'wood' ? WOOD() : dark('#1f1a16'), 0, .004); y0 = .07; }
        else if (c.leg === 'slab') { [-1, 1].forEach(function (s) { box(g, .04, lh2, D * .6, legM, s * ixs, lh2 / 2, 0, .006); }); y0 = lh2; }
        else { [[-ixs, -izs], [ixs, -izs], [-ixs, izs], [ixs, izs]].forEach(function (q) { leg(g, c.leg === 'sled' || c.leg === 'uSled' ? 'pin' : c.leg, q[0], q[1], lh2, legM, 0, { dir: [q[0], q[1]] }); }); y0 = lh2; }
      } else y0 = hidden ? baseFor(g, c.leg, len, D, 0, legM) : baseFor(g, c.leg, len, D, lh2, legM);
      if (shaped) {
        if (H - tt - y0 > .012) slab(g, benchShape(sh, len - .07, D - .07), H - tt - y0, top === 'upholstered' ? F : Wd, y0, .004);
      } else if (lid || hidden) {
        box(g, len, H - tt - y0, D, bm, 0, y0 + (H - tt - y0) / 2, 0, .012);
        if (top === 'upholstered') box(g, len + .004, .025, D + .004, Wd, 0, y0 + .0125, 0, .004);
        if (c.storage === 'shelf') { box(g, len - .08, (H - tt - y0) * .55, .004, dark('#16120f'), 0, y0 + (H - tt - y0) * .35, D / 2 + .001, .002); box(g, len - .08, .02, .03, Wd, 0, y0 + (H - tt - y0) * .35, D / 2 - .01, .003); }
      } else {
        if (H - tt - lh > .012) box(g, len, H - tt - lh, D, Wd, 0, lh + (H - tt - lh) / 2, 0, .01);
        if (c.storage === 'shelf') { var ysh = Math.max(.06, lh * .32); box(g, len - .1, .025, D - .1, Wd, 0, ysh, 0, .004); }
      }
      if (shaped && c.storage === 'shelf' && !hidden) slab(g, benchShape('lurus', sh === 'oval' ? 2 * Math.max(.05, len / 2 - D / 2) + .05 : len * .72 + .05, D * .56), .022, Wd, Math.max(.06, lh2 * .32), .004);
      // dudukan
      var dS = hasBack ? D - .075 : D, zS = hasBack ? .0375 : 0, seg = TT === 'segmented';
      if (shaped) {
        var tbv = top === 'upholstered' ? Math.min(.045, tt * .3) : .006, ts = slab(g, benchShape(sh, len - 2 * tbv, D - 2 * tbv), tt, topMat, H - tt, tbv, top === 'upholstered' ? 5 : 2);
        if (top === 'upholstered' && tfT) {   // tufting di atas kapsul/organik: grid dipetakan ke dalam garis luar
          var pts = benchShape(sh, len, D).getPoints(120), zr = function (x) { var lo = 9, hi = -9; for (var i = 0; i < pts.length; i++) { var a2 = pts[i], b2 = pts[(i + 1) % pts.length]; if ((a2.x - x) * (b2.x - x) <= 0 && a2.x !== b2.x) { var zz = a2.y + (b2.y - a2.y) * (x - a2.x) / (b2.x - a2.x); lo = Math.min(lo, zz); hi = Math.max(hi, zz); } } return [-hi, -lo]; };
          var cacheZ = {}, ZR = function (x) { var k = x.toFixed(4); return cacheZ[k] || (cacheZ[k] = zr(x)); }, mxs = len / 2 - .03;
          var gq = XP.quilt(function (u, v) { var x = -mxs + 2 * mxs * u, r = ZR(x), m = .028; return [x, H, r[0] + m + (r[1] - r[0] - 2 * m) * v]; }, function () { return [0, 1, 0]; }, 2 * mxs, D - .06, TT === 'channel' ? 'channelV' : 'button', TT === 'channel' ? .12 : .14, .12, tfT.proud * .7, function (v, u) { return Math.min(1, Math.min(v, 1 - v) * 10, Math.min(u, 1 - u) * 14); });
          var mq = mesh(gq, F, g, true); mq.position.y = -tfT.proud * .7 - .0013;
          if (TT === 'button') instOn(g, XP.buttonGeo(.0095), btnMat(), gq.userData.buttons.map(function (b) { return [b[0], b[1] - tfT.proud * .7 - .0013, b[2]]; }), .002);
        }
      }
      else if (hasBack && top !== 'upholstered') box(g, len, tt, D, topMat, 0, H - tt / 2, 0, .006);
      else if (top === 'upholstered') {
        if (hasBack) box(g, len, .012, D, Wd, 0, H - tt + .006, 0, .003);
        var tH = tt - (hasBack ? .012 : 0), nSeg = seg ? Math.max(2, Math.min(3, Math.round(len / .55))) : 1, sgw = len / nSeg;
        for (var si = 0; si < nSeg; si++) cushion(g, sgw - (seg ? .006 : 0), tH, dS, F, -len / 2 + sgw * (si + .5), H - ctop - tH / 2, zS, { r: seg ? .03 : .022, cr: seg ? .012 : ctop, bu: .002, st: c.stitch, tuft: tfT });
      }
      else box(g, len, tt, D, topMat, 0, H - tt / 2, 0, .006);
      if (lid) { box(g, len + .002, .005, D + .002, dark(), 0, H - tt - .02, 0, .002); box(g, .035, .045, .006, dark('#5a3b26'), 0, H - tt - .045, D / 2 + .001, .002); }
      if (cushTop) { var nC2 = seg ? Math.max(2, Math.round(len / .55)) : 1, cw2 = (len - .04) / nC2; for (var ci = 0; ci < nC2; ci++) cushion(g, cw2 - (seg ? .006 : 0), .06, dS - .04, F, -len / 2 + .02 + cw2 * (ci + .5), H + .03 - .004, zS, { r: .022, cr: .008, tuft: tfT }); }
      if (hasBack) {
        var yBase = Math.max(y0, lh) - .005;
        benchBack(g, c.backStyle || 'panel', shaped ? len * .82 : len, H, D, bh, legM, yBase, top === 'upholstered' || c.backStyle !== 'panel');
        if (c.cushion === 'seatback' && /^(panel|plank|cane|spindle)$/.test(c.backStyle || 'panel')) { var zPo = -D / 2 + .05, zPt = -D / 2 + .016, ba = Math.atan2(zPo - zPt, bh + .01), zPb = function (y) { return zPo - (y - H + .01) / (bh + .01) * (zPo - zPt); }, a2 = ba + .06, cH = bh * .6, cy2 = H + .056 + cH / 2 * Math.cos(a2) + .07 / 2 * Math.sin(a2) - .006; cushion(g, len - .14, .07, cH, F, 0, cy2, zPb(cy2) + .029 + .035 * Math.cos(a2) - .006, { r: .026, cr: .008, rx: Math.PI / 2 - a2 }); }
      } else if (c.cushion === 'seatback') {
        var bo = mesh(XP.bolsterGeo(.14, len - .14), F, g, false); bo.position.set(0, H + .056 + .07, -D / 2 + .09);
      }
      // ujung: bolster naik / panel kayu
      if (ends === 'bolsterEnds' && !shaped) [-1, 1].forEach(function (s) { var d = .14, yb = H + (cushTop ? .056 : 0) + d / 2 - .002, bo2 = mesh(XP.bolsterGeo(d, dS - .02), F, g, false); bo2.rotation.y = Math.PI / 2; bo2.position.set(s * (len / 2 - d / 2 - .005), yb, zS); bo2.userData.pillow = 1; });
      if (woodE) [-1, 1].forEach(function (s) { box(g, .035, H + .1, D, Wd, s * (W / 2 - .0175), (H + .1) / 2, 0, .008); feet.push([s * (W / 2 - .0175), 0]); });
      // detail hias
      if (tr.indexOf('nailhead') >= 0 && top === 'upholstered') {
        var yn = H - tt + (shaped ? (top === 'upholstered' ? Math.min(.045, tt * .3) : .006) + .008 : .016), nl3 = [];
        if (shaped) { var op = benchShape(sh, len + .0008, D + .0008).getPoints(160); var pp = op.map(function (p, i) { var q2 = op[(i + 1) % op.length], tx = q2.x - p.x, tz = -(q2.y - p.y), L = Math.hypot(tx, tz) || 1; return [p.x, yn, -p.y, tz / L, 0, -tx / L]; }); nl3 = nailPath(pp); }
        else { nl3 = nailPath([[-len / 2 + .015, yn, dS / 2 + zS + .0004, 0, 0, 1], [len / 2 - .015, yn, dS / 2 + zS + .0004, 0, 0, 1]]); [-1, 1].forEach(function (s) { nailPath([[s * (len / 2 + .0004), yn, dS / 2 + zS - .015, s, 0, 0], [s * (len / 2 + .0004), yn, -dS / 2 + zS + .015, s, 0, 0]]).forEach(function (p) { nl3.push(p); }); }); }
        nailsOn(g, nl3);
      }
      if (tr.indexOf('brassBand') >= 0) {
        var yb2 = H - tt - .004;
        if (shaped) { yb2 = H - tt + (top === 'upholstered' ? Math.min(.045, tt * .3) : .006); var op2 = benchShape(sh, len + .002, D + .002).getPoints(160).map(function (p) { return [p.x, yb2, -p.y]; }); op2.push(op2[0]); mesh(XP.sweep(XP.rrectPts(.004, .014, .0015, 1), op2, [0, 1, 0]), brass(), g, false); }
        else { var bp2 = XP.fillet([[0, 0, D / 2], [len / 2, 0, D / 2], [len / 2, 0, -D / 2], [-len / 2, 0, -D / 2], [-len / 2, 0, D / 2], [0, 0, D / 2]], .01, 3).map(function (q) { return [q[0], yb2, q[2]]; }); mesh(XP.sweep(XP.rrectPts(.004, .014, .0015, 1), bp2, [0, 1, 0]), brass(), g, false); }
      }
      if (sh === 'curved') place(bendGroup(g, W / 1.1), 0, 0); else place(g, 0, 0);
      feet = null; legCap = null;
    }

    /* ---------------- KURSI MAKAN */
    // cangkang tub berlapis: denah setengah elips (rx, rz) mengelilingi dudukan, tinggi h(th), tebal t; puncak membulat
    function tubShell(p, mat, cz, rx, rz, Ae, yb, hAt, t, n) {
      n = n || 48; var pos = [], uv = [], idx = [], i, j, prof = function (h) { var q = [[0, yb], [0, h - t / 2]]; for (var k = 1; k < 8; k++) { var a = k / 8 * Math.PI; q.push([t / 2 - t / 2 * Math.cos(a), h - t / 2 + t / 2 * Math.sin(a)]); } q.push([t, h - t / 2]); q.push([t, yb]); q.push([0, yb]); return q; };
      var np = prof(1).length;
      for (i = 0; i <= n; i++) { var th = -Ae + 2 * Ae * i / n, pf = prof(hAt(th)), sx = Math.sin(th), sz = -Math.cos(th), acc = 0; for (j = 0; j < np; j++) { var r = 1 - pf[j][0] / Math.max(rx, rz); if (j) acc += Math.hypot(pf[j][0] - pf[j - 1][0], pf[j][1] - pf[j - 1][1]); pos.push(sx * (rx - pf[j][0]), pf[j][1], cz + sz * (rz - pf[j][0])); uv.push(th * rx, acc); } }
      for (i = 0; i < n; i++) for (j = 0; j < np - 1; j++) { var a0 = i * np + j, b0 = a0 + np; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); XP.fixOut(geo, [0, (yb + hAt(0)) / 2, cz]);
      // tutup ujung
      var caps = [-1, 1].map(function (e) { var th = e * Ae, pf = prof(hAt(th)), cp = [], ci = [], cu = [], sx = Math.sin(th), sz = -Math.cos(th); pf.forEach(function (q) { cp.push(sx * (rx - q[0]), q[1], cz + sz * (rz - q[0])); cu.push(q[0], q[1]); }); var tri = T.ShapeUtils.triangulateShape(pf.slice(0, pf.length - 1).map(function (q) { return new T.Vector2(q[0], q[1]); }), []); tri.forEach(function (t2) { ci.push(t2[0], t2[1], t2[2]); }); var cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cp, 3)); cg.setAttribute('uv', new T.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals(); XP.fixOut(cg, [sx * rx * .5 * 0, (yb + hAt(th)) / 2, cz - e * 0 + sz * rz * .2 - (e) * 0]); return cg; });
      // tutup ujung: pastikan menghadap ke depan (+z)
      caps.forEach(function (cg) { var N = cg.attributes.normal; if (N.getZ(0) < 0) { var I = cg.index.array; for (var k = 0; k < I.length; k += 3) { var tmp = I[k]; I[k] = I[k + 1]; I[k + 1] = tmp; } cg.computeVertexNormals(); } });
      var m = mesh(XP.merge([geo, caps[0], caps[1]]), mat, p, true);
      return m;
    }
    function dining() {
      var W = cm(c.w, 48), D = cm(c.d, 52), H = cm(c.h, 82), SH = cm(c.seatH, 46), F = FAB(), F2 = FAB2(), Wd = WOOD(), Mt = METAL(), ex = c.extras || [], tr = c.trim || [];
      var legM = c.frame === 'wood' ? Wd : Mt, backM = c.frame === 'metal' ? Mt : Wd, metalF = c.frame === 'metal';
      var back = c.back || 'open', aS = c.armStyle || (c.arms === 'arms' ? 'carver' : 'none'), cu = c.cushion || 'upholstered', full = cu === 'full', stack = ex.indexOf('stack') >= 0;
      var arms = aS === 'carver', curvedB = back === 'curved', woven = cu === 'cord' || cu === 'cane', roundS = c.seatShape === 'round' && back !== 'shell', lg = c.leg || 'tapered';
      var tubB = back === 'tub', shellB = back === 'shell', noPosts = /^(floatPad|tub|shell)$/.test(back) || lg === 'tulip';
      if (/^(wishbone|spindle|bentwood|ladder)$/.test(back)) { legM = Wd; backM = Wd; metalF = false; }
      legCap = tr.indexOf('brassCap') >= 0 ? 'brass' : null;
      var crn = cu === 'none' || woven ? 0 : .007, sT = back === 'shell' ? .02 + (cu !== 'none' && !woven ? .024 : 0) : cu === 'none' || woven ? .03 : cu === 'pad' ? .057 : full ? .08 : .06, ys0 = SH - sT - crn;
      var Ws = W - (arms || aS === 'hoop' ? .08 : aS === 'tub' ? .1 : 0), lr = metalF ? .011 : .015, ix = Ws / 2 - .022, izF = D / 2 - .035, sb = curvedB ? .04 : 0;
      var zRf = -D / 2 + (/^(sled|x|cantilever)$/.test(c.leg) ? .011 : noPosts || /^(wishbone|bolsterRail|bentwood|hoop)$/.test(back) ? .016 : .03), zR = -D / 2 + .075 + sb, zTop = -D / 2 + (curvedB ? .002 : .016) + sb, px = W / 2 - (arms ? .014 : .025), apH = metalF ? .03 : .065, yA = ys0 - apH;
      var zRo = zR;
      if (roundS) { var dS0 = D / 2 - .005 - (zR - .012), zS0 = (D / 2 - .005 + zR - .012) / 2, R0 = Math.min(Ws, dS0 + .03) / 2; zR = zS0 - R0 * .8; zRf = -D / 2 + .016; ix = R0 * .56; izF = zS0 + R0 * .6; zTop = Math.min(zTop, zR - .05); }   // dudukan bulat: kaki & tiang di dalam lingkaran
      if (aS === 'tub' || tubB) px = Ws / 2 - .022;
      var al = Math.atan2(zR - zTop, H - ys0), zP = function (y) { return zR - (y - ys0) / (H - ys0) * (zR - zTop); }, bt = H - SH, PM = full ? F : backM;
      var tilt = function (m) { m.rotation.x = -al; return m; };
      var dS = D / 2 - .005 - (zRo - .012), zSc = (D / 2 - .005 + zRo - .012) / 2;
      feet = [];
      var sq = lg === 'straight', lstyle = sq ? (metalF ? 'square' : 'straight') : (metalF ? 'round' : 'tapered');
      var legAt = { f: [ix, izF], b: [ix, zRf] }, legTopB = [ix, zR], spl = lg === 'splay' || stack, k = spl ? .86 : 1;
      // kaki
      if (lg === 'sled') [-1, 1].forEach(function (s) { var x = s * ix; rod(root, [x, .008, zRf], [x, .008, izF], .008, legM); [zRf, izF].forEach(function (z) { sphere(root, .008, legM, x, .008, z); }); rod(root, [x, .008, izF], [x, ys0, izF], .008, legM); rod(root, [x, .008, zRf], [x, ys0, zR], .008, legM); feet.push([x, zRf], [x, izF]); });
      else if (lg === 'x') [-1, 1].forEach(function (s) { var x = s * ix; rod(root, [x, .0095, izF], [x, ys0, zR], .012, legM); rod(root, [x, .0095, zRf], [x, ys0, izF], .012, legM); feet.push([x, zRf], [x, izF]); });
      else if (lg === 'cantilever') { var cm2 = c.frame === 'wood' ? Wd : Mt, cr = c.frame === 'wood' ? .016 : .01; [-1, 1].forEach(function (s) { var x = s * ix; mesh(XP.tube([[x, ys0 - cr, izF], [x, ys0 - cr, zR], [x, cr, zRf], [x, cr, izF + .02]], cr, { fil: .06 }), cm2, root, false); feet.push([x, zRf], [x, izF]); }); }
      else if (lg === 'tulip') {   // pedestal tulip (dining/32): alas bulat, leher ramping, mekar ke dudukan
        var Rb = Math.min(.27, Math.min(W, D) * .5), tm = c.frame === 'wood' ? Wd : metal(X.find(X.METAL, c.metal) || { id: 'white', hex: '#e8e4dc', rough: .3 });
        mesh(XP.lathe([[0, 0], [Rb, 0], [Rb, .006], [Rb * .7, .02], [.06, .06], [.032, .14], [.03, ys0 * .6], [.06, ys0 - .05], [Math.min(.17, Ws * .38), ys0 - .006], [Math.min(.17, Ws * .38), ys0 + (back === 'shell' ? .009 : .003)], [0, ys0 + (back === 'shell' ? .009 : .003)]], 48), tm, root, false).position.z = zSc;
        feet.push([0, zSc]);
      }
      else if (lg === 'compass') [-1, 1].forEach(function (s) { var x = s * ix, zm = zSc; [izF, zRf].forEach(function (zz) { cyl(root, .012, .014, .011, dark('#1d1915'), x, .0055, zz, 14); }); mesh(XP.bar([x, ys0, zm + .03], [x, .011, izF], .034, .03, .006, { w1: .024, t1: .024, up: [1, 0, 0] }), legM, root, false); mesh(XP.bar([x, ys0, zm - .03], [x, .011, zRf], .034, .03, .006, { w1: .024, t1: .024, up: [1, 0, 0] }), legM, root, false); feet.push([x, izF], [x, zRf]); });
      else [-1, 1].forEach(function (s) {
        if (spl) { rod(root, [s * ix * k, ys0, izF * k], [s * ix, .004, izF], lg === 'splay' ? .014 : sq ? .017 : .012, legM, sq ? 4 : 16); feet.push([s * ix, izF]); }
        else leg(root, lstyle, s * ix, izF, ys0, legM);
        rod(root, [s * ix, .003, zRf], [s * ix * (spl ? k : 1), ys0, zR], sq ? .017 : lr, legM, sq ? 4 : 16); feet.push([s * ix, zRf]);
      });
      // sepatu kuningan pada kaki batang (rod)
      if (legCap === 'brass' && /^(splay|compass)$/.test(lg) || legCap === 'brass' && /^(tapered|straight)$/.test(lg)) feet.forEach(function (f, i) { if (lg === 'tapered' || lg === 'straight') { if (Math.abs(f[1] - zRf) > .001) return; } cyl(root, .0175, .0185, .035, brass(), f[0], .0175, f[1], 16); });
      // tiang sandaran = lanjutan kaki belakang
      var postX = spl ? ix * .86 : ix, postR = full ? .016 : lr;
      if (!noPosts && !/^(wishbone|bolsterRail|bentwood|hoop)$/.test(back)) [-1, 1].forEach(function (s) { rod(root, [s * postX, ys0 - .01, zR], [s * px, H - .004, zTop], postR, PM, sq && !full ? 4 : 16); });
      // apron / rangka dudukan
      if (lg !== 'tulip') {
        if (full) box(root, Ws - .006, apH + .004, dS - .006, F, 0, yA + apH / 2, zSc, .012);
        else if (roundS) { var ra = mesh(ringGeo(Math.min(Ws, dS) / 2 - .05, Math.min(Ws, dS) / 2 - .02, apH, .004, 0), legM, root); ra.position.set(0, yA, zSc); ra.scale.z = dS / Ws; }
        else { box(root, Ws - .03, apH, .02, legM, 0, yA + apH / 2, izF, .004); box(root, Ws - .03, apH, .02, legM, 0, yA + apH / 2, zR, .004); [-1, 1].forEach(function (s) { box(root, .02, apH, izF - zR, legM, s * (Ws / 2 - .025), yA + apH / 2, (izF + zR) / 2, .004); }); }
      }
      // palang kaki: H atau keliling
      var st2 = c.stretcher || 'none';
      if (st2 !== 'none' && /^(tapered|straight|splay|turned)$/.test(lg) && !tubB && !shellB) {
        var ys = .14, fx = function (y, front) { var xb = ix, xt = spl ? ix * k : ix; return xb + (xt - xb) * y / ys0; }, fzF = izF - (spl ? (izF - izF * k) * ys / ys0 : 0), fzB = zRf + (zR - zRf) * ys / ys0, xx = fx(ys);
        [-1, 1].forEach(function (s) { rod(root, [s * xx, ys, fzF], [s * xx, ys, fzB], .009, legM, 10); });
        if (st2 === 'h') rod(root, [-xx, ys, (fzF + fzB) / 2], [xx, ys, (fzF + fzB) / 2], .009, legM, 10);
        else { rod(root, [-xx, ys + .02, fzF], [xx, ys + .02, fzF], .009, legM, 10); rod(root, [-xx, ys + .02, fzB], [xx, ys + .02, fzB], .009, legM, 10); }
      }
      // dudukan
      var seatTop = SH, sw = Ws, tfS = tuftOf(c.backTuft === 'channelV' ? null : null, 'seat');
      if (shellB) { /* dudukan menyatu dengan cangkang */ }
      else if (roundS) {
        var Rs = Ws / 2, sz = Math.min(1.15, dS / Ws);
        if (cu === 'none') puck(root, Rs, .03, .008, 0, Wd, 0, ys0, zSc, sz);
        else if (woven) { var rgS = mesh(ringGeo(Rs - .04, Rs, .03, .005, 0), Wd, root); rgS.position.set(0, ys0, zSc); rgS.scale.z = sz; var cvS = cyl(root, Rs - .035, Rs - .035, .012, cu === 'cord' ? cordM() : caneM(), 0, ys0 + .018, zSc, 40); cvS.scale.z = sz; }
        else if (cu === 'pad') { puck(root, Rs, .022, .005, 0, Wd, 0, ys0, zSc, sz); puck(root, Rs - .012, .035, .014, crn, F, 0, ys0 + .022, zSc, sz); }
        else { puck(root, Rs, sT, .025, crn, F, 0, ys0, zSc, sz); puckStitch(root, Rs - .008, ys0 + sT - .008, 0, zSc, sz, c.stitch); }
      }
      else if (cu === 'none') box(root, Ws, .03, dS, Wd, 0, ys0 + .015, zSc, .006);
      else if (woven) {   // rangka dudukan + anyaman tali / cane (dining/33, 29)
        [-1, 1].forEach(function (s) { box(root, Ws, .03, .035, Wd, 0, ys0 + .015, zSc + s * (dS / 2 - .0175), .006); box(root, .035, .03, dS - .07, Wd, s * (Ws / 2 - .0175), ys0 + .015, zSc, .006); });
        var pn = box(root, Ws - .06, .012, dS - .06, cu === 'cord' ? cordM() : caneM(), 0, ys0 + .02, zSc, .002); pn.castShadow = cu === 'cord';
      }
      else if (cu === 'pad') { box(root, Ws, .022, dS, Wd, 0, ys0 + .011, zSc, .005); cushion(root, Ws - .03, .035, dS - .03, F, 0, ys0 + .022 + .0175, zSc, { r: .014, cr: crn }); }
      else cushion(root, Ws - .004, sT, dS - .004, F, 0, ys0 + sT / 2, zSc, { r: full ? .024 : .02, cr: crn, bu: .002, st: c.stitch });
      if (stack) [[-1, izF - .03], [1, izF - .03], [-1, zR + .03], [1, zR + .03]].forEach(function (q) { box(root, .018, .01, .03, dark('#2b2826'), q[0] * (Ws / 2 - .035), yA - .0045, q[1], .003); });
      // sandaran
      var wR = 2 * px, i, j, BT = c.backTuft && c.backTuft !== 'plain' ? c.backTuft : null;
      var panel = function (w, h, th, yc, mat, off) { return tilt(box(root, w, h, th, mat, 0, yc, zP(yc) + (off || 0), Math.min(.006, th / 2 - .001))); };
      var upanel = function (w, h, th, yc, off, x, tf2) { return cushion(root, w, th, h, tf2 ? F : (tr.indexOf('twoTone') >= 0 ? F2 : F), x || 0, yc, zP(yc) + (off || 0), { r: Math.min(.02, th / 2 - .002), cr: .007, rx: Math.PI / 2 - al, tuft: tf2, st: c.stitch }); };
      var shell = function (hc, yc, th, mat, b) {
        var R = (px * px + sb * sb) / (2 * sb), f1 = Math.atan2(R - sb, px) + b / R, s2 = new T.Shape(), gS = new T.Group();
        s2.absarc(0, sb - R, R - b, f1, Math.PI - f1, false); s2.absarc(0, sb - R, R - th + b, Math.PI - f1, f1, true);
        var geo = new T.ExtrudeGeometry(s2, { depth: hc - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 32 }); geo.rotateX(-Math.PI / 2);
        var m = mesh(geo, mat, gS, true); m.position.y = -hc / 2 + b; gS.position.set(0, yc, zP(yc)); gS.rotation.x = -al; root.add(gS); return m;
      };
      var tfB = BT ? tuftOf(BT, 'back', BT === 'channelV' ? { pitch: .08 } : BT === 'biscuit' ? { pitch: .12, pitchZ: .12 } : BT === 'button' ? { pitch: .1, pitchZ: .09 } : BT === 'diamond' ? { pitch: .12, pitchZ: .18 } : BT === 'channelH' ? { pitch: .07 } : null) : null;
      if (aS === 'tub' && !tubB) [-1, 1].forEach(function (s) {   // lengan tub: panel samping berlapis dari dudukan ke ±21 cm
        var hA = SH + .21 - (ys0 - .02); cushion(root, .05, hA, dS - .01, tr.indexOf('twoTone') >= 0 ? F2 : F, s * (W / 2 - .025), ys0 - .02 + hA / 2, zSc, { r: .022, cr: .003 });
        box(root, (W - Ws) / 2 + .01, .03, dS - .06, F, s * (W / 2 - (W - Ws) / 4), ys0 - .005, zSc, .004);
      });
      if (back === 'spindle') {   // Windsor: rel atas melengkung + 5 spindle ke dudukan (dining/23)
        var yC = H - .022, nsp = Math.max(4, Math.round(wR / .075));
        tilt(box(root, wR + .02, .044, .028, Wd, 0, yC, zP(yC), .008));
        for (i = 0; i < nsp; i++) { var xsp = -wR / 2 + .03 + (wR - .06) * (i + .5) / nsp; rod(root, [xsp, SH - .012, zP(SH)], [xsp, yC - .02, zP(yC - .02)], .0085, Wd, 10); }
      } else if (back === 'wishbone') {   // rel atas busur + penopang Y (dining/24)
        var rx = W / 2 - .03, rz = Math.min(.12, D * .22), yW = H - .02, zc = zR + .01 + rz, crest = [];
        for (i = 0; i <= 24; i++) { var aw2 = Math.PI * i / 24; crest.push([-Math.cos(aw2) * rx, yW, zc - Math.sin(aw2) * rz]); }
        mesh(XP.sweep(XP.rrectPts(.03, .04, .01, 3), crest, [0, 1, 0]), Wd, root, false);
        [-1, 1].forEach(function (s) { rod(root, [s * postX, ys0 - .01, zR], [s * rx, yW - .015, zc], .016, Wd, 16); });
        var yY = SH + (yW - SH) * .45; mesh(XP.bar([0, SH - .012, zR + .005], [0, yY, zc - rz + .004], .045, .02, .006), Wd, root, false);
        [-1, 1].forEach(function (s) { mesh(XP.bar([0, yY - .01, zc - rz + .004], [s * rx * .45, yW - .015, zc - rz * Math.sqrt(1 - .2025)], .035, .02, .006), Wd, root, false); });
      } else if (back === 'bolsterRail') {   // tiang + bolster bulat di atas (dining/01)
        var dB = .12, yBr = H - dB / 2 - .001;
        [-1, 1].forEach(function (s) { rod(root, [s * postX, ys0 - .01, zR], [s * px, yBr, zP(yBr)], postR, PM, 16); });
        var bol = mesh(XP.bolsterGeo(dB, Math.min(wR + .06, W - .01)), F, root, false); bol.position.set(0, yBr, Math.max(zP(yBr) + .01, -D / 2 + dB / 2 + .001));
      } else if (back === 'floatPad') {   // tulang tengah + pad melayang (dining/03)
        var padH = Math.min(.24, (H - SH) * .55), yPd = H - padH / 2 - .022;
        mesh(XP.bar([0, ys0 - .02, zR - .005], [0, yPd, zP(yPd) - .012], .07, .025, .008, { w1: .09, t1: .025 }), backM, root, false);
        var pd = slab(root, capsule(wR * .95, padH), .055, BT ? F : F, 0, .02, 4); pd.rotation.x = Math.PI / 2 - al; pd.position.set(0, yPd, zP(yPd) + .021);
        if (tfB && /button|diamond/.test(tfB.pat)) { var bl2 = []; for (i = -2; i <= 2; i++) bl2.push([i * .07, 0, 0, 0, 0, 1]); var gB = new T.Group(); gB.position.set(0, yPd, zP(yPd) + .0525); gB.rotation.x = -al; root.add(gB); instOn(gB, XP.buttonGeo(.0095), btnMat(), bl2, .003); }
      } else if (back === 'bentwood') {   // loop bentwood + panel cane (dining/29)
        var loop = [], yL0 = SH - .01, hL = H - .015 - yL0;
        for (i = 0; i <= 30; i++) { var tl = i / 30, ang = Math.PI * tl; var xL = -Math.cos(ang) * px, yL = yL0 + (tl < .5 ? 1 : 1) * (hL - Math.max(0, Math.cos(ang * 1) * 0)) * Math.min(1, Math.sin(ang) * 1.6 + .0) ; loop.push([xL, yL0 + (yL - yL0), zP(yL)]); }
        loop[0][1] = yL0; loop[loop.length - 1][1] = yL0;
        mesh(XP.sweep(XP.circlePts(.012, 12), loop, [0, 0, 1]), Wd, root, false);
        [-1, 1].forEach(function (s) { rod(root, [s * postX, ys0 - .01, zR], [s * px, yL0 + .01, zP(yL0)], .015, Wd, 16); });
        var yPc = yL0 + hL * .55; tilt(box(root, wR - .07, hL * .55, .006, caneM(), 0, yPc, zP(yPc), 0)).castShadow = false;
        tilt(box(root, wR - .03, .022, .02, Wd, 0, yL0 + hL * .25, zP(yL0 + hL * .25), .006));
      } else if (back === 'hoop') {   // rel tapal kuda di puncak, menjorok ke depan (dining/06)
        var hp = [], rxh = W / 2 - .025, rzh = Math.min(D * .5, .26), yH = H - .018, zch = zR + rzh - .01;
        for (i = 0; i <= 28; i++) { var ah = Math.PI * i / 28; hp.push([-Math.cos(ah) * rxh, yH, zch - Math.sin(ah) * rzh]); }
        mesh(XP.sweep(XP.rrectPts(.045, .028, .008, 3), hp, [0, 1, 0]), backM, root, false);
        [-1, 1].forEach(function (s) { rod(root, [s * postX, ys0 - .01, zR], [s * rxh * .92, yH - .014, zch - rzh * .39], .016, backM, 16); rod(root, [s * (Ws / 2 - .03), ys0 - .01, zch], [s * rxh, yH - .014, zch], .014, backM, 16); });
        for (i = 0; i < 3; i++) { var xs2 = (i - 1) * .1; rod(root, [xs2, SH - .012, zR + .01], [xs2, yH - .014, zch - Math.sqrt(Math.max(0, 1 - xs2 * xs2 / (rxh * rxh))) * rzh + .01], .009, backM, 10); }
      } else if (tubB) {   // tub berlapis membungkus dudukan (dining/34, 02)
        var rxT = W / 2, rzT = Math.min(D * .55, W * .5), czT = Math.min(zR - .03, -D / 2 + .006) + rzT, aeT = aS === 'tub' ? Math.PI * .62 : Math.PI * .5, hArm = aS === 'tub' ? SH + .2 : SH + .1;
        var hT = function (th) { var w2 = Math.min(1, Math.abs(th) / (Math.PI * .5)), s3 = Math.max(0, Math.min(1, (w2 - .35) / .6)); s3 = s3 * s3 * (3 - 2 * s3); return hArm + (H - hArm) * (1 - s3); };
        tubShell(root, tr.indexOf('twoTone') >= 0 ? F2 : F, czT, rxT, rzT, aeT, ys0 - .02, hT, .055, 56);
        if (tfB) { var A3 = aeT * 1.7, P3 = function (u, v) { var th = -A3 / 2 + A3 * u, y = SH + .01 + (hT(th) - .04 - SH) * v; return [Math.sin(th) * (rxT - .055), y, czT - Math.cos(th) * (rzT - .055)]; }, N3 = function (u) { var th = -A3 / 2 + A3 * u, nx = -Math.sin(th) / rxT, nz = Math.cos(th) / rzT, l = Math.hypot(nx, nz); return [nx / l, 0, nz / l]; }; quiltSkin(root, F, P3, N3, A3 * rxT, H - SH - .05, BT, PROUD[BT] * .5, function (v, u) { return Math.min(1, v / .05, (1 - v) / .15, Math.min(u, 1 - u) * 12); }, BT === 'channelV' ? { pitch: .08 } : { pitch: .11, pitchY: BT === 'diamond' ? .18 : .1 }); }
      } else if (shellB) {   // cangkang molded satu bagian (dining/27): dudukan + sandaran
        var tS = .012, ySh = SH - (cu !== 'none' && !woven ? .024 : 0), sw2 = Ws * .5, zf2 = D / 2 - .01, zb2 = -D / 2 + .1;
        var prof = function (x) { var u = x / sw2, edge = 1 - u * u, w2 = .04 * (1 - edge), q = [], qi = [], k2;
          var line = [[zf2 - .01 * u * u, ySh - .02], [zf2 - .03, ySh + .002], [zf2 - .1, ySh - .004 * edge], [(zf2 + zb2) / 2, ySh - .008 * edge], [zb2 + .06, ySh - .006], [zb2 + .015, ySh + .04], [zb2 + .01 - .03 * u * u, ySh + .14], [zb2 - .01 - .05 * u * u + (H - SH) * -.0, ySh + (H - SH) * .62 - .04 * u * u], [zb2 - .03 - .06 * u * u, H - .006 - .07 * Math.pow(Math.abs(u), 3)]];
          var pa = path2(line.map(function (p) { return [p[0], p[1]]; }), 1); for (k2 = 0; k2 <= 22; k2++) { var a5 = pa.at(k2 / 22), n5 = pa.nr(k2 / 22); q.push([a5[0], a5[1]]); qi.push([a5[0] - n5[0] * tS, a5[1] - n5[1] * tS]); }
          return q.concat(qi.reverse()); };
        var xsS = []; for (i = 0; i <= 24; i++) xsS.push(-sw2 + 2 * sw2 * i / 24);
        mesh(XP.loftX(xsS, prof, { check: [0, SH - .05, 0] }), c.frame === 'wood' || c.frame === 'mix' ? WOOD() : metal(X.find(X.METAL, c.metal) || X.METAL[0]), root, false);
        if (cu !== 'none' && !woven) cushion(root, Ws * .8, .025, D * .5, F, 0, ySh + .0115, (zf2 + zb2) / 2 + .02, { r: .01, cr: .004 });
      } else if (!full) {
        if (back === 'open') panel(wR, .07, .022, H - .039, backM);
        else if (back === 'ladder') for (i = 0; i < 3; i++) panel(wR, .04, .02, SH + bt * (.42 + i * .21), backM);
        else if (back === 'slat') { var yb0 = SH + .1, yt0 = H - .054; panel(wR, .05, .024, H - .029, backM); panel(wR, .03, .02, yb0, backM); for (j = 0; j < 4; j++) { var yy = (yt0 + yb0 + .015) / 2; tilt(box(root, .03, yt0 - yb0 - .005, .016, backM, -W * .27 + j * W * .18, yy, zP(yy), .004)); } }
        else if (back === 'upholstered') upanel(wR, H - .004 - (SH + .1), .05, (H - .004 + SH + .1) / 2, .004, 0, tfB);
        else if (curvedB) shell(bt * .55, H - .004 - bt * .275, .016, backM, .003);
        else if (back === 'rattan') { panel(wR, .045, .026, H - .0265, backM); panel(wR, .035, .022, SH + .12, backM); var yc3 = (H - .049 + SH + .1375) / 2; panel(wR - .01, H - .049 - (SH + .1375) + .006, .008, yc3, caneM()); }
      } else {
        if (back === 'open') upanel(W - .01, .13, .05, H - .069, .004);
        else if (back === 'slat') { upanel(wR, .07, .05, H - .039); upanel(wR, .05, .045, SH + .1); var ns = 5, sw3 = (wR - .03) / ns; for (j = 0; j < ns; j++) { var y2 = (H - .074 + SH + .125) / 2; upanel(sw3 - .008, H - .074 - (SH + .125) + .01, .04, y2, 0, -wR / 2 + .015 + sw3 * (j + .5)); } }
        else if (back === 'ladder') for (i = 0; i < 3; i++) upanel(wR, .06, .045, SH + bt * (.4 + i * .22));
        else if (curvedB) shell(bt * .62, H - .004 - bt * .31, .045, F, .012);
        else if (back === 'rattan') { upanel(wR, .06, .05, H - .034); upanel(wR, .05, .045, SH + .1); var yc4 = (H - .064 + SH + .125) / 2; panel(wR - .02, H - .064 - (SH + .125) + .01, .008, yc4, caneM()); }
        else upanel(W - .004, H - .004 - (SH - .012), .07, (H - .004 + SH - .012) / 2, .006, 0, tfB);
      }
      // lengan
      if (arms) { var ya = SH + .21; [-1, 1].forEach(function (s) { var xa = s * px; rod(root, [xa, ya, zP(ya)], [xa, ya, izF - .005], .013, PM); rod(root, [s * ix, ys0 - .01, izF], [xa, ya, izF - .005], .013, PM); sphere(root, .013, PM, xa, ya, izF - .005); if (full) cushion(root, .05, .028, izF - zP(ya) + .02, F, xa - s * .012, ya + .016, (izF + zP(ya)) / 2, { r: .012, cr: .004 }); }); }
      else if (aS === 'hoop' && back !== 'hoop') {   // rel lengan menerus mengelilingi sandaran setinggi lengan
        var yh2 = SH + .21, rxa = W / 2 - .02, hp2 = [[-rxa, yh2, izF - .01]], zbk = zP(yh2) - .012;
        for (i = 0; i <= 20; i++) { var a6 = Math.PI * i / 20; hp2.push([-Math.cos(a6) * rxa, yh2, zbk + (1 - Math.sin(a6)) * 0 + (izF - .01 - zbk) * (1 - Math.sin(a6)) * .0 + (Math.abs(Math.cos(a6)) > .95 ? (izF - .01 - zbk) * .5 : 0)]); }
        hp2 = [[-rxa, yh2, izF - .01], [-rxa, yh2, zbk + .06], [-rxa + .06, yh2, zbk], [rxa - .06, yh2, zbk], [rxa, yh2, zbk + .06], [rxa, yh2, izF - .01]];
        mesh(XP.sweep(XP.rrectPts(.04, .026, .008, 3), XP.fillet(hp2, .08, 8), [0, 1, 0]), backM, root, false);
        [-1, 1].forEach(function (s) { rod(root, [s * ix, ys0 - .01, izF], [s * rxa, yh2 - .013, izF - .02], .013, backM, 14); if (noPosts || /^(wishbone|bentwood)$/.test(back)) rod(root, [s * postX, ys0 - .01, zR], [s * (rxa - .03), yh2 - .013, zbk + .01], .013, backM, 14); });
      }
      // detail hias
      if (tr.indexOf('nailhead') >= 0 && !shellB) {
        var yn = ys0 + (cu === 'none' || woven ? .015 : cu === 'pad' ? .011 : sT * .5), zfN = zSc + dS / 2 + .0004, nl = [];
        if (roundS) { var Rn = Math.min(Ws, dS + .03) / 2 + .0004, sz2 = dS / (2 * Rn) > .8 ? Math.min(1.15, (dS + .02) / (2 * Rn)) : 1, nn = Math.round(Math.PI * Rn / .023); for (i = 0; i <= nn; i++) { var an2 = Math.PI * i / nn; nl.push([Math.cos(an2) * Rn, yn, zSc + Math.sin(an2) * Rn * sz2, Math.cos(an2), 0, Math.sin(an2)]); } }
        else { nl = nailPath([[-sw / 2 + .012, yn, zfN, 0, 0, 1], [sw / 2 - .012, yn, zfN, 0, 0, 1]]); [-1, 1].forEach(function (s) { nailPath([[s * (sw / 2 + .0004), yn, zfN - .015, s, 0, 0], [s * (sw / 2 + .0004), yn, zSc - dS / 2 + .03, s, 0, 0]]).forEach(function (p) { nl.push(p); }); }); }
        nailsOn(root, nl);
      }
      if (ex.indexOf('glides') >= 0) feet.forEach(function (f) { cyl(root, .016, .016, .006, felt(), f[0], .003, f[1], 20); });
      if (ex.indexOf('handle') >= 0 && !/^(spindle|wishbone|hoop|bentwood|floatPad|shell|tub|bolsterRail)$/.test(back)) {
        var hy = curvedB ? H - .004 - bt * .12 : back === 'ladder' ? SH + bt * .84 : back === 'rattan' ? H - (full ? .034 : .0265) : back === 'slat' ? H - (full ? .039 : .029) : back === 'open' ? (full ? H - .069 : H - .039) : H - .06;
        var rear = curvedB ? zP(hy) - sb : full ? (back === 'upholstered' ? zP(hy) - .029 : back === 'open' ? zP(hy) - .021 : back === 'ladder' ? zP(hy) - .0225 : zP(hy) - .025) : back === 'upholstered' ? zP(hy) - .021 : back === 'open' || back === 'slat' ? zP(hy) - .011 - (back === 'slat' ? .001 : 0) : back === 'ladder' ? zP(hy) - .01 : zP(hy) - .013;
        if (full || back === 'upholstered' || curvedB) tilt(box(root, .1, .028, .006, dark('#0e0b09'), 0, hy, rear - .0025, .013));
        else tilt(box(root, .09, .018, .004, dark('#0e0b09'), 0, hy, rear - .0015, .002));
      }
      feet = null; legCap = null;
    }

    /* ---------------- STOOL */
    function stool() {
      var W = cm(c.w, 42), H = cm(c.h, 75), F = FAB(), F2 = FAB2(), Wd = WOOD(), r = W / 2, tr = c.trim || [];
      var frame = c.frame || 'metal', LM = frame === 'metal' ? METAL() : Wd, low = c.height === 'low' || H < .52;
      var FR = c.footrestFinish === 'brass' ? brass() : c.footrestFinish === 'black' ? metal({ id: 'blk', hex: '#1b1a19', rough: .35 }) : frame === 'mix' ? METAL() : LM;
      var cu = c.cushion || 'pad', st = cu === 'none' || cu === 'cord' ? .035 : cu === 'full' ? .085 : .07, sw = c.swivel || 'no', shp = c.seatShape || 'round', sad = shp === 'saddle', drum = shp === 'drum';
      if (drum && cu !== 'none' && cu !== 'cord') st = .11;
      var crn = cu === 'none' || cu === 'cord' || sad ? 0 : shp === 'square' ? .008 : cu === 'full' ? .0096 : .008;
      var base = c.base || 'legs'; if (frame === 'wood' && /^(pedestal|sled|tubular)$/.test(base)) base = 'legs';
      var y1 = H - st - crn, frm = sw !== 'no' && !/^(pedestal|flared)$/.test(base) ? .012 : 0, under = y1 - (sw !== 'no' ? .02 : 0);
      var woodL = frame !== 'metal', lt = woodL ? .6 : .62, lb = woodL ? .74 : .72, ft0 = .008, yf = Math.max(.16, H - .30);
      var fr = low ? 'none' : (c.footrest || 'ring'); if (/^(pedestal|flared)$/.test(base) && !/^(ring|none)$/.test(fr)) fr = 'ring';
      var legPts = function (y) {
        if (base === 'sled' || base === 'tubular') { var ts = Math.max(0, Math.min(1, (y - .009) / (under - frm - .009))), zz = r * (.74 - .24 * ts); return [[-r * .66, -zz], [r * .66, -zz], [-r * .66, zz], [r * .66, zz]]; }
        var tl = Math.max(0, Math.min(1, (y - ft0) / (under - frm - ft0))), k = r * (lb + (lt - lb) * tl); return [[-k, -k], [k, -k], [-k, k], [k, k]];
      };
      var top0 = under - frm;
      legCap = tr.indexOf('brassCap') >= 0 && base === 'legs' ? 'brass' : null;
      if (base === 'pedestal') {
        if (sw === 'gas') { cyl(root, .03, .034, under * .62, dark('#161616'), 0, under * .31, 0, 20); cyl(root, .016, .016, under * .4, chrome(), 0, under * .8, 0, 16); }
        else cyl(root, .03, .03, under, LM, 0, under / 2, 0, 20);
        puck(root, r * .9, .02, .008, 0, LM, 0, 0, 0);
      } else if (base === 'flared') {   // pedestal kayu flare (stool/24): alas lebar, leher ramping, mekar ke dudukan
        var Rb = r * .95; mesh(XP.lathe([[0, 0], [Rb, 0], [Rb, .012], [Rb * .7, .05], [Rb * .38, .14], [.05, under * .45], [.042, under * .7], [.06, under - .03], [r * .55, under - .006], [r * .55, under], [0, under]], 48), Wd, root, false);
      } else if (base === 'sled') [-1, 1].forEach(function (s) { var x = s * r * .66; rod(root, [x, .009, -r * .74], [x, .009, r * .74], .009, LM); [-1, 1].forEach(function (e) { rod(root, [x, .009, e * r * .74], [x, top0, e * r * .5], .009, LM); sphere(root, .009, LM, x, .009, e * r * .74); }); });
      else if (base === 'tubular') [-1, 1].forEach(function (s) { var x = s * r * .66; mesh(XP.tube([[x, top0, -r * .5], [x, .011, -r * .74], [x, .011, r * .74], [x, top0, r * .5]], .011, { fil: .06 }), LM, root, false); });
      else [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        if (woodL) { mesh(XP.bar([q[0] * r * lt, top0, q[1] * r * lt], [q[0] * r * lb, 0, q[1] * r * lb], .034, .034, .006, { w1: .026, t1: .026 }), Wd, root, false); if (legCap === 'brass') mesh(XP.bar([q[0] * r * lb, 0, q[1] * r * lb], [q[0] * r * (lb + (lt - lb) * .04 / top0), .04, q[1] * r * (lb + (lt - lb) * .04 / top0)], .029, .029, .004), brass(), root, false); }
        else { rod(root, [q[0] * r * lt, top0, q[1] * r * lt], [q[0] * r * lb, ft0, q[1] * r * lb], .012, LM, 16); if (legCap === 'brass') cyl(root, .0145, .0155, .035, brass(), q[0] * r * lb, ft0 + .0175, q[1] * r * lb, 16); cyl(root, .014, .014, .01, dark('#1a1716'), q[0] * r * lb, .005, q[1] * r * lb, 16); }
      });
      if (woodL && base === 'legs') { var ar = r * lt * Math.SQRT2; [-1, 1].forEach(function (e) { box(root, 2 * r * lt + .02, .05, .022, Wd, 0, top0 - .025, e * r * lt, .004); box(root, .022, .05, 2 * r * lt, Wd, e * r * lt, top0 - .025, 0, .004); }); }
      if (frm) { var fr0 = base === 'sled' || base === 'tubular' ? r * .86 : r * lt * Math.SQRT2 + .016, fm = mesh(ringGeo(fr0 - .045, fr0, frm, .003, 0), LM, root); fm.position.y = top0; mesh(ringGeo(.1, fr0 - .04, .004, .001, 0), LM, root).position.y = top0 + frm - .004; }
      // pijakan kaki
      if (fr !== 'none') {
        if (/^(pedestal|flared)$/.test(base)) {
          if (fr === 'ring') { var t2 = torus(root, r * .72, .009, FR, 0, yf, 0, 0, 64); t2.rotation.x = Math.PI / 2; var hub = base === 'flared' ? .045 : sw === 'gas' && yf > under * .62 ? .015 : .03; [0, 1, 2, 3].forEach(function (k) { var a = k * Math.PI / 2 + Math.PI / 4; rod(root, [Math.cos(a) * hub, yf, Math.sin(a) * hub], [Math.cos(a) * r * .72, yf, Math.sin(a) * r * .72], .007, FR); }); }
        } else {
          var P4 = legPts(yf), sx = function (q) { return woodL && base === 'legs' ? .0 : 0; };
          if (fr === 'ring') { var t = torus(root, Math.hypot(P4[0][0], P4[0][1]), .009, FR, 0, yf, 0, 0, 64); t.rotation.x = Math.PI / 2; }
          else if (fr === 'bar') rod(root, [P4[2][0], yf, P4[2][1]], [P4[3][0], yf, P4[3][1]], .009, FR);
          else if (fr === 'h') { rod(root, [P4[0][0], yf, P4[0][1]], [P4[2][0], yf, P4[2][1]], woodL ? .012 : .009, FR, 12); rod(root, [P4[1][0], yf, P4[1][1]], [P4[3][0], yf, P4[3][1]], woodL ? .012 : .009, FR, 12); rod(root, [P4[0][0], yf, 0], [P4[1][0], yf, 0], woodL ? .012 : .009, FR, 12); }
          else if (fr === 'box') { var P5 = legPts(yf); [[0, 1], [1, 3], [3, 2], [2, 0]].forEach(function (e) { rod(root, [P5[e[0]][0], yf, P5[e[0]][1]], [P5[e[1]][0], yf, P5[e[1]][1]], woodL ? .012 : .009, FR, 12); }); }
        }
      }
      if (sw !== 'no') {
        puck(root, .11, .016, .004, 0, METAL(), 0, under, 0); cyl(root, .075, .075, .006, dark('#222'), 0, under + .017, 0, 32);
        if (sw === 'gas') {
          if (!/^(pedestal|flared)$/.test(base)) { var yh = top0 - .2, P6 = legPts(yh); cyl(root, .026, .03, under - yh, dark('#161616'), 0, (under + yh) / 2, 0, 20); P6.forEach(function (q) { rod(root, [0, yh, 0], [q[0], yh, q[1]], .006, LM); }); }
          rod(root, [.06, under + .008, 0], [r * .9, under + .002, .03], .005, chrome()); sphere(root, .011, dark('#111'), r * .9, under + .002, .03);
        }
      }
      // dudukan
      var SM = cu === 'cord' ? cordM() : Wd;
      if (shp === 'square') {
        if (cu === 'none') box(root, W, st, W, Wd, 0, y1 + st / 2, 0, .008);
        else if (cu === 'cord') { box(root, W - .02, .012, W - .02, Wd, 0, y1 + .006, 0, .002); [-1, 1].forEach(function (e) { box(root, W, st, .03, Wd, 0, y1 + st / 2, e * (W / 2 - .015), .006); box(root, .03, st, W - .06, Wd, e * (W / 2 - .015), y1 + st / 2, 0, .006); }); box(root, W - .06, .012, W - .06, cordM(), 0, y1 + st - .012, 0, .002); }
        else if (cu === 'pad') { box(root, W, .025, W, Wd, 0, y1 + .0125, 0, .006); cushion(root, W - .02, st - .025, W - .02, tr.indexOf('twoTone') >= 0 ? F2 : F, 0, y1 + .025 + (st - .025) / 2, 0, { r: .016, cr: crn }); }
        else cushion(root, W - .006, st, W - .006, F, 0, y1 + st / 2, 0, { r: .025, cr: crn, bu: .003, welt: 1 });
      } else {
        var sz = sad ? .9 : 1, cr = sad ? -.012 : crn;
        if (cu === 'none') puck(root, r, st, drum ? .012 : .008, sad ? -.01 : 0, Wd, 0, y1, 0, sz);
        else if (cu === 'cord') { var rg = mesh(ringGeo(r - .035, r, st, .006, 0), Wd, root); rg.position.y = y1; rg.scale.z = sz; var cv = cyl(root, r - .03, r - .03, .012, cordM(), 0, y1 + st - .007, 0, 40); cv.scale.z = sz; }
        else if (cu === 'pad') { puck(root, r, .025, .005, 0, Wd, 0, y1, 0, sz); var tt2 = tr.indexOf('twoTone') >= 0; puck(root, r - .012, st - .025, drum ? .02 : .016, cr, tt2 ? F2 : F, 0, y1 + .025, 0, sz); if (tt2) puck(root, r - .04, .006, .003, cr * .5, F, 0, y1 + st - .004 + cr * .6, 0, sz); }
        else { var pk = puck(root, r, st, drum ? .03 : .025, cr, tr.indexOf('twoTone') >= 0 ? F2 : F, 0, y1, 0, sz); puckStitch(root, r - .008, y1 + st - .008, 0, 0, sz, 'piping'); if (tr.indexOf('twoTone') >= 0) puck(root, r - .03, .006, .003, cr * .5, F, 0, y1 + st - .004 + cr * .6, 0, sz); }
      }
      // sandaran
      if (c.backS === 'low' || c.backS === 'full') {
        var bh = c.backS === 'full' ? .34 : .16, bs = c.backStyle || 'bucket', pm = woodL ? Wd : METAL(), zt = -r * .8;
        if (bs === 'bucket') {   // bucket berlapis membungkus belakang (stool/01, 08)
          var hT = function (th) { var w2 = Math.min(1, Math.abs(th) / (Math.PI * .62)); return H + bh * (1 - w2 * w2 * .7); };
          tubShell(root, tr.indexOf('twoTone') >= 0 ? F2 : F, 0, r + .005, r + .005, Math.PI * .62, H - .03, hT, .045, 48);
        } else {
          var rail = function (y, h2, mat) { var pts = []; for (var i = 0; i <= 16; i++) { var a = Math.PI * (.15 + .7 * i / 16); pts.push([-Math.cos(a) * r * .95, y, -Math.sin(a) * r * .95 + .02]); } return mesh(XP.sweep(XP.rrectPts(.024, h2, .008, 3), pts, [0, 1, 0]), mat, root, false); };
          var yTop = H + bh - .03, pxs = r * .95 * Math.cos(Math.PI * .15);
          [-1, 1].forEach(function (s) { if (woodL) mesh(XP.bar([s * r * .62, y1 - .01, -r * .62], [s * pxs, yTop + .02, -r * .95 * Math.sin(Math.PI * .15) + .02], .025, .025, .005), Wd, root, false); else rod(root, [s * r * .6, y1 - .01, -r * .7], [s * pxs, yTop + .02, -r * .95 * Math.sin(Math.PI * .15) + .02], .01, pm); });
          if (bs === 'rail') rail(yTop, .06, Wd);
          else if (bs === 'bolster') { var bo = mesh(XP.bolsterGeo(.12, W * .9), F, root, false); bo.position.set(0, yTop + .02, -r * .95 * Math.sin(Math.PI * .15) + .02); }
          else if (bs === 'spindle') { rail(yTop, .045, Wd); for (var i2 = 0; i2 < 5; i2++) { var a2 = Math.PI * (.3 + .4 * i2 / 4), x2 = -Math.cos(a2) * r * .92, z2 = -Math.sin(a2) * r * .92 + .02; rod(root, [x2, H - .01, z2 * .9], [x2, yTop - .02, z2], .008, Wd, 10); } }
          else if (bs === 'woven' || bs === 'panel') { rail(yTop, .045, Wd); var ph = Math.max(.08, bh - .08), pnl = []; for (var i3 = 0; i3 <= 16; i3++) { var a3 = Math.PI * (.2 + .6 * i3 / 16); pnl.push([-Math.cos(a3) * r * .93, H + .02 + ph / 2, -Math.sin(a3) * r * .93 + .02]); } mesh(XP.sweep(XP.rrectPts(.01, ph, .003, 1), pnl, [0, 1, 0]), bs === 'woven' ? seaM() : Wd, root, false); }
        }
      }
      legCap = null;
    }

    /* ---------------- OTTOMAN & POUF */
    function ottoman() {
      var W = cm(c.w, 70), D = c.shape === 'kubus' || c.shape === 'round' ? W : cm(c.d, 50), H = cm(c.h, 42), F = FAB(), F2 = FAB2(), tr = c.trim || [];
      var cons = c.construction || 'upholstered', sides = cons === 'upholstered' ? (c.sides || 'plain') : 'plain', stor = cons === 'upholstered' ? (c.storage || 'none') : 'none';
      var legM = LEGM(), leg0 = cons === 'pouf' ? 'none' : c.leg || 'floating', hidden = /^(plinth|metalplinth|floating|none)$/.test(leg0), lh = hidden ? 0 : cm(c.legH, 8), rnd2 = c.shape === 'round' || c.shape === 'oval';
      legCap = tr.indexOf('castor') >= 0 ? 'castor' : tr.indexOf('brassCap') >= 0 ? 'brass' : null;
      if (cons === 'onFrame' && hidden) { leg0 = 'tapered'; hidden = false; lh = cm(c.legH, 12); }
      if (/^(xcampaign|xmetal)$/.test(leg0) && cons === 'upholstered') lh = Math.max(lh, H - .115);   // X campaign: kaki silang tinggi, dudukan berupa bantal tebal (ottoman/23)
      var y0 = 0, tuft = c.tuft || 'plain';
      if (cons === 'pouf') {   // pouf lunak: badan menggembung duduk di lantai
        var pr0 = rnd2 ? null : null, crP = .03;
        if (rnd2) puck(root, W / 2, H - crP, .09, crP, F, 0, 0, 0, D / W);
        else { var pb = cushion(root, W - .025, H - crP, D - .025, F, 0, (H - crP) / 2, 0, { r: Math.min(.1, H / 2 - .01), cr: crP, bu: .012, both: false, tuft: tuftOf(tuft === 'channel' ? 'channel' : tuft, 'top', { pitch: tuft === 'channel' ? .12 : null }) }); }
        if (rnd2 && tuft !== 'plain') { var bl0 = [[0, H - .004, 0]]; for (var q0 = 0; q0 < 8; q0++) { var aq0 = q0 / 8 * Math.PI * 2; bl0.push([Math.cos(aq0) * W * .22, H - crP * .2 - .004, Math.sin(aq0) * W * .22 * D / W]); } instOn(root, XP.buttonGeo(.011), btnMat(), bl0, .003); }
        legCap = null; return;
      }
      if (cons === 'onFrame') {   // bantal di atas rangka (ottoman/07, 13): rangka kayu/besi dengan apron, bantal tebal di atas
        var fH = Math.max(.16, Math.min(H - .12, lh + .1)), cuH = H - fH, fm = /^(conic|round|openFrame)$/.test(leg0) ? METAL() : LEGM();
        var yb = rnd2 ? baseFor(root, leg0 === 'openFrame' ? 'tapered' : leg0, W * .78, D * .78, fH - .05, fm) : baseFor(root, leg0, W, D, /^(xcampaign|xmetal|openFrame)$/.test(leg0) ? fH : fH - .05, fm, { inset: .035 });
        if (rnd2) { var ap = mesh(ringGeo(W / 2 - .03, W / 2, .05, .004, 0), fm, root); ap.position.y = fH - .05; ap.scale.z = D / W; var pd2 = mesh(puckGeo(W / 2 - .02, .03, .002, 0), fm, root); pd2.position.y = fH - .05; pd2.scale.z = D / W; }
        else if (leg0 !== 'openFrame' && leg0 !== 'xcampaign') { [-1, 1].forEach(function (e) { box(root, W, .05, .03, fm, 0, fH - .025, e * (D / 2 - .015), .006); box(root, .03, .05, D - .06, fm, e * (W / 2 - .015), fH - .025, 0, .006); }); box(root, W - .06, .05, D - .06, fm, 0, fH - .025, 0, .003); }
        var tfo = tuft === 'channel' ? { pat: 'chanZ', pitch: .11, proud: .016 } : tuftOf(tuft, 'top');
        if (rnd2) { puck(root, W / 2 - .005, cuH - .01, .04, .01, F, 0, fH, 0, D / W); }
        else cushion(root, W - .01, cuH - .006, D - .01, F, 0, fH + (cuH - .006) / 2, 0, { r: .035, cr: tfo ? .004 : .01, bu: .005, tuft: tfo, st: c.stitch || 'piping' });
        if (tr.indexOf('nailhead') >= 0) { var nn0 = nailPath([[-W / 2 + .02, fH - .025, D / 2 + .0004, 0, 0, 1], [W / 2 - .02, fH - .025, D / 2 + .0004, 0, 0, 1]]); nailsOn(root, nn0); }
        legCap = null; return;
      }
      if (hidden && rnd2) {
        var ph = leg0 === 'floating' ? .09 : leg0 === 'metalplinth' ? .065 : .07, pr = leg0 === 'floating' ? W * .32 : W / 2 - .025;
        if (leg0 === 'metalplinth') { var mm = metal(X.find(X.METAL, c.metal) || X.METAL[1]); cyl(root, pr, pr, .025, mm, 0, .0125, 0, 48).scale.z = D / W; cyl(root, pr - .012, pr - .012, .04, c.legFinish === 'metal' ? mm : legM, 0, .045, 0, 48).scale.z = D / W; }
        else cyl(root, pr, pr, ph, leg0 === 'floating' ? dark() : c.legFinish === 'wood' ? WOOD() : dark('#1f1a16'), 0, ph / 2, 0, 48).scale.z = D / W;
        y0 = ph;
      } else if (hidden) y0 = baseFor(root, leg0, W, D, 0, legM);
      else y0 = baseFor(root, leg0, rnd2 ? W * .78 : W, rnd2 ? D * .78 : D, lh, legM);
      // badan rapi; sisi fluted / lipit / channel = kulit timbul di sekeliling (badan menyusut setebal kulit)
      var chan = tuft === 'channel', pc = chan ? .024 : 0, crown = chan ? 0 : .01, Hb = H - pc - crown, rt = .03;
      var sp = sides === 'fluted' ? .012 : sides === 'pleated' ? .009 : sides === 'channel' ? .02 : 0, Wb = W - 2 * sp, Db = D - 2 * Math.max(sp, pc * .65), kz = Db / Wb, body;
      var tfo2 = /^(biscuit|diamond)$/.test(tuft) ? tuftOf(tuft, 'top', tuft === 'biscuit' ? { pitch: Math.min(.17, W / 3), pitchZ: Math.min(.17, D / 3) } : { pitch: Math.min(.15, W / 3.2), pitchZ: Math.min(.22, D / 1.6) }) : null;
      var SF = sides !== 'plain' || tr.indexOf('twoTone') >= 0 ? F2 : F;
      if (rnd2) body = puck(root, Wb / 2, Hb - y0, rt, crown, sides !== 'plain' ? F : (tr.indexOf('twoTone') >= 0 ? F2 : F), 0, y0, 0, Db / Wb);
      else body = cushion(root, Wb, Hb - y0, Db, tr.indexOf('twoTone') >= 0 && sides === 'plain' ? F2 : F, 0, y0 + (Hb - y0) / 2, 0, { r: rt, cr: tfo2 ? .004 : crown, bu: .003, tuft: tfo2 });
      var yc0 = y0 + (Hb - y0) / 2;
      var surfY = function (x, z) { if (rnd2) { var q = Math.min(1, (x * x) / (Wb * Wb / 4) + (z * z) / (Db * Db / 4)); return Hb + crown * (1 - q); } return yc0 + body.geometry.userData.surf(x, (Hb - y0) / 2, z)[1]; };
      if (tr.indexOf('twoTone') >= 0 && rnd2 && sides === 'plain') puck(root, Wb / 2 - .03, .006, .003, crown * .6, F, 0, Hb - .004, 0, Db / Wb);
      if (tuft === 'button' || (tuft === 'diamond' && rnd2) || (tuft === 'biscuit' && rnd2)) {
        var nx = Math.max(2, Math.round(Wb / .17)), nz = Math.max(2, Math.round(Db / .17)), bl = [];
        for (var j = 0; j < nz; j++) for (var i = 0; i < nx - (j % 2); i++) { var bx = -Wb / 2 + Wb * (i + .5 + (j % 2) * .5) / nx, bz = -Db / 2 + Db * (j + .5) / nz; if (!rnd2 || Math.pow(bx / (Wb / 2), 2) + Math.pow(bz / (Db / 2), 2) < .62) bl.push([bx, surfY(bx, bz) - .004, bz]); }
        instOn(root, XP.buttonGeo(tuft === 'diamond' ? .0115 : .0095), btnMat(), bl, .002);
      }
      if (chan) {
        var fade2 = function (v) { return Math.min(1, v / .1, (1 - v) / .1); }, nC = Math.max(4, Math.round(Wb / .105)), cache = {};
        if (!rnd2) {
          var U = body.geometry.userData, ia = U.A - U.r, ib = U.B - U.r, ic = U.C - U.r, Bq = U.B, Cq = U.C, pz = [[Cq, Bq - .07], [Cq, Bq], [-Cq, Bq], [-Cq, Bq - .07]], pa = path2(pz, 1);
          var SP = function (u, v) { var k2 = u.toFixed(4) + ',' + v.toFixed(4); if (cache[k2]) return cache[k2]; var q = pa.at(v), x = -U.A + .002 + u * (2 * U.A - .004), s = U.surf(x, q[1], q[0]), cx2 = Math.max(-ia, Math.min(ia, s[0])), cy2 = Math.max(-ib, Math.min(ib, s[1])), cz2 = Math.max(-ic, Math.min(ic, s[2])), dx = s[0] - cx2, dy = s[1] - cy2, dz = s[2] - cz2, L = Math.hypot(dx, dy, dz) || 1; return (cache[k2] = [[s[0], s[1] + yc0, s[2]], [dx / L, dy / L, dz / L]]); };
          channelSkin(root, F, nC, function (u, v) { return SP(u, v)[0]; }, function (u, v) { return SP(u, v)[1]; }, pc, 40, fade2, Wb, pa.len);
        } else {
          var PA = function (u) { var k3 = u.toFixed(5); if (cache[k3]) return cache[k3]; var x = (u - .5) * Wb * .96, zl = Math.max(rt * 1.3, Db / 2 * Math.sqrt(Math.max(0, 1 - Math.pow(x / (Wb / 2), 2)))), q = [[zl, Hb - .06], [zl, Hb - rt]]; for (var m2 = 1; m2 <= 6; m2++) { var a2 = m2 / 6 * Math.PI / 2; q.push([zl - rt + rt * Math.cos(a2), Hb - rt + rt * Math.sin(a2)]); } for (m2 = 0; m2 <= 6; m2++) { var a3 = Math.PI / 2 + m2 / 6 * Math.PI / 2; q.push([-zl + rt + rt * Math.cos(a3), Hb - rt + rt * Math.sin(a3)]); } q.push([-zl, Hb - .06]); return (cache[k3] = { x: x, p: path2(q, 1) }); };
          channelSkin(root, F, nC, function (u, v) { var P = PA(u), q = P.p.at(v); return [P.x, q[1], q[0]]; }, function (u, v) { var n = PA(u).p.nr(v); return [0, n[1], n[0]]; }, pc, 40, fade2, Wb, Db + .1);
        }
      }
      // sisi berpola: fluted (ottoman/19), lipit (ottoman/20), channel menerus (ottoman/25)
      if (sp) {
        var yA = y0 + .012, yB = Hb - rt * .8, per, PP, NN;
        if (rnd2) { per = Math.PI * (Wb / 2 + Db / 2); PP = function (u, v) { var a = u * Math.PI * 2; return [Math.cos(a) * Wb / 2, yA + (yB - yA) * v, Math.sin(a) * Db / 2]; }; NN = function (u) { var a = u * Math.PI * 2, nx = Math.cos(a) / (Wb / 2), nz = Math.sin(a) / (Db / 2), l = Math.hypot(nx, nz); return [nx / l, 0, nz / l]; }; }
        else {   // keliling persegi membulat (radius tepi bantal)
          var ra = rt, hw = Wb / 2 - ra, hd = Db / 2 - ra, segs = [[2 * hw, 0], [Math.PI * ra / 2, 1], [2 * hd, 0], [Math.PI * ra / 2, 1], [2 * hw, 0], [Math.PI * ra / 2, 1], [2 * hd, 0], [Math.PI * ra / 2, 1]], tot = 0; segs.forEach(function (s) { tot += s[0]; }); per = tot;
          var at = function (u) { var s = u * tot, k = 0; while (k < 7 && s > segs[k][0]) { s -= segs[k][0]; k++; } var t = s / segs[k][0], side = Math.floor(k / 2), ang = side * Math.PI / 2;
            var C = [[hw, hd], [-hw, hd], [-hw, -hd], [hw, -hd]], dirs = [[-1, 0], [0, -1], [1, 0], [0, 1]];
            if (k % 2 === 0) { var st0 = [[hw, hd + ra], [-hw - ra, hd], [-hw, -hd - ra], [hw + ra, -hd]][side], d0 = dirs[side], L0 = segs[k][0]; var n0 = [[0, 1], [-1, 0], [0, -1], [1, 0]][side]; return [st0[0] + d0[0] * L0 * t, st0[1] + d0[1] * L0 * t, n0[0], n0[1]]; }
            var cc = C[side], a0 = Math.PI / 2 * (side + 1), aa = a0 + t * Math.PI / 2; return [cc[0] + Math.cos(aa) * ra, cc[1] + Math.sin(aa) * ra, Math.cos(aa), Math.sin(aa)]; };
          PP = function (u, v) { var q = at(u); return [q[0], yA + (yB - yA) * v, q[1]]; }; NN = function (u) { var q = at(u); return [q[2], 0, q[3]]; };
        }
        var pat = sides === 'channel' ? 'channelV' : 'channelV', pitch = sides === 'fluted' ? .036 : sides === 'pleated' ? .03 : .1;
        var gs = XP.quilt(PP, NN, per, yB - yA, sides === 'pleated' ? 'pleat' : pat, per / Math.round(per / pitch), null, sp, function (v) { return Math.min(1, v / .04, (1 - v) / .06); });
        mesh(gs, sides === 'channel' ? F : SF, root, true);
      }
      if (stor !== 'none') {
        if (rnd2) { var sr = torus(root, W / 2 + .001, .003, dark(), 0, H - .06, 0, 0, 96); sr.rotation.x = Math.PI / 2; sr.scale.y = D / W; }
        else if (stor !== 'insetTray') { var bg = body.geometry, yl = (H - .075) - yc0; seamTube(body, bg, bg.userData.A, bg.userData.C, bg.userData.r, yl, .0028, dark('#1a1512'), false); }
        if (stor === 'lid') { var fzz = rnd2 ? D / 2 : body.geometry.userData.surf(0, (H - .1) - yc0, Db / 2)[2]; box(root, .035, .045, .006, dark('#5a3b26'), 0, H - .1, fzz + sp, .002); }
        if (stor === 'tray') {
          var Wd = WOOD(), tw = W * .62, td = D * .55, ty = chan ? H - .005 : surfY(0, 0) - .002;
          box(root, tw, .012, td, Wd, 0, ty + .006, 0, .004);
          [-1, 1].forEach(function (s) { box(root, tw, .03, .012, Wd, 0, ty + .02, s * (td / 2 - .006), .004); box(root, .012, .03, td, Wd, s * (tw / 2 - .006), ty + .02, 0, .004); box(root, .006, .012, .06, dark('#2a1d14'), s * (tw / 2 + .0005), ty + .024, 0, .002); });
        }
        if (stor === 'insetTray') {   // nampan kayu tertanam di tengah atas (ottoman/27)
          var Wd2 = WOOD(), tw2 = Math.min(W * .5, .5), td2 = Math.min(D * .4, .3), ty2 = surfY(0, 0);
          box(root, tw2 + .03, .02, td2 + .03, Wd2, 0, ty2 - .006, 0, .004);
          box(root, tw2, .004, td2, dark('#2a1d14'), 0, ty2 + .0045, 0, .002);
        }
      }
      if (tr.indexOf('nailhead') >= 0 && !rnd2) {
        var yn = y0 + .02, nl = nailPath([[-W / 2 + .03, yn, D / 2 + .0004, 0, 0, 1], [W / 2 - .03, yn, D / 2 + .0004, 0, 0, 1]]);
        [-1, 1].forEach(function (s) { nailPath([[s * (W / 2 + .0004), yn, D / 2 - .03, s, 0, 0], [s * (W / 2 + .0004), yn, -D / 2 + .03, s, 0, 0]]).forEach(function (p) { nl.push(p); }); });
        nailPath([[W / 2 - .03, yn, -D / 2 - .0004, 0, 0, -1], [-W / 2 + .03, yn, -D / 2 - .0004, 0, 0, -1]]).forEach(function (p) { nl.push(p); });
        nailsOn(root, nl);
      } else if (tr.indexOf('nailhead') >= 0) { var nr = [], Rn = W / 2 + .0004, nn = Math.round(Math.PI * (W / 2 + D / 2) / .023); for (var q = 0; q < nn; q++) { var aq = q / nn * Math.PI * 2; nr.push([Math.cos(aq) * Rn, y0 + .02, Math.sin(aq) * Rn * D / W, Math.cos(aq), 0, Math.sin(aq)]); } nailsOn(root, nr); }
      if (tr.indexOf('brassBand') >= 0) {
        if (rnd2) { var bb = mesh(ringGeo(W / 2 - .003, W / 2 + .003, .02, .002, 0), brass(), root); bb.position.y = y0; bb.scale.z = D / W; }
        else { var bp = XP.fillet([[0, 0, D / 2], [W / 2, 0, D / 2], [W / 2, 0, -D / 2], [-W / 2, 0, -D / 2], [-W / 2, 0, D / 2], [0, 0, D / 2]], rt, 4).map(function (q) { return [q[0], y0 + .011, q[2]]; }); mesh(XP.sweep(XP.rrectPts(.005, .02, .0015, 1), bp, [0, 1, 0]), brass(), root, false); }
      }
      legCap = null;
    }

    /* ---------------- MEJA */
    /* meja, kabinet & divan dibangun di modul terpisah (js/mk-*.js) memakai alat bersama H */
    var H = {c: c, kit: kit, T: T, keep: keep, root: root, motions: motions, X: X, cm: cm, S45: S45, shade: shade, lum: lum, contrast: contrast, mcache: mcache, M: M, XT: XT, TXS: TXS, UPHSET: UPHSET, UPHN: UPHN, woodSet: woodSet, fabric: fabric, wood: wood, BRUSH: BRUSH, metal: metal, paint: paint, STONESET: STONESET, stone: stone, glass: glass, dark: dark, glow: glow, wash: wash, cane: cane, fluted: fluted, linen: linen, ghost: ghost, felt: felt, chrome: chrome, mirrorM: mirrorM, thread: thread, edgeMat: edgeMat, colorHex: colorHex, colorHex2: colorHex2, FAB2: FAB2, FAB: FAB, woodHex: woodHex, WOOD: WOOD, METAL: METAL, LEGM: LEGM, uvBox: uvBox, mesh: mesh, box: box, cyl: cyl, rod: rod, sphere: sphere, torus: torus, slab: slab, rrect: rrect, ellipse: ellipse, capsule: capsule, organic: organic, liveEdge: liveEdge, wobble: wobble, lshapeTop: lshapeTop, XP: XP, cushGeo: cushGeo, seamTube: seamTube, stitchOn: stitchOn, instOn: instOn, btnMat: btnMat, cushion: cushion, tuftOf: tuftOf, puckGeo: puckGeo, ringGeo: ringGeo, puck: puck, puckStitch: puckStitch, feet: feet, legCap: legCap, CAPOK: CAPOK, brass: brass, legMesh: legMesh, leg: leg, baseFor: baseFor, fillOf: fillOf, fo: fo, zipper: zipper, keyhole: keyhole, lever: lever, nailPath: nailPath, nailsOn: nailsOn, ARMW: ARMW, RECL: RECL, PIPC: PIPC, pipeMat: pipeMat, seamMat: seamMat, lineTube: lineTube, path2: path2, CHT: CHT, channelSkin: channelSkin, quiltSkin: quiltSkin, fadeEnd: fadeEnd, PROUD: PROUD, sofaArm: sofaArm, woodArm: woodArm, caneM: caneM, cordM: cordM, seaM: seaM, backShell: backShell, chanPath: chanPath, chanBody: chanBody, PB: PB, PILT: PILT, throwPillow: throwPillow, pillowRow: pillowRow, endBolsters: endBolsters, armTop: armTop, armFoot: armFoot, skirtOn: skirtOn, run: run, place: place, seatingCommon: seatingCommon, tessX: tessX, bendAlong: bendAlong, bendGroup: bendGroup, pillowMat: pillowMat, sofa: sofa, chordW: chordW, centerX: centerX, consoleModule: consoleModule, chaise: chaise, barrel: barrel, armBase: armBase, rockers: rockers, woodLounge: woodLounge, armchair: armchair, benchShape: benchShape, benchBack: benchBack, bench: bench, tubShell: tubShell, dining: dining, stool: stool, ottoman: ottoman};

    var sub = c.sub;
    if (c.cat === 'kursi') ({ sofa: sofa, chaise: chaise, armchair: armchair, bench: bench, dining: dining, stool: stool, ottoman: ottoman }[sub] || sofa)();
    else { var mk = window.XMK && window.XMK[c.cat]; if (mk) mk(H); }   // meja/kabinet/divan: js/mk-meja.js · mk-kabinet.js · mk-divan.js

    return {
      group: root, motions: motions,
      dispose: function () { made.forEach(function (o) { if (o && o.dispose) o.dispose(); }); made = []; }
    };
  }

  window.XMAKER = { build: build };
})();
