/* ==========================================================================
   XIONCO — rencana gambar garis per kelompok pilihan (dipakai build.js)
   Setiap pilihan chips / multi (dan kategori + sub-kategori di langkah Jenis) mendapat satu gambar:
     • 3D  — konfigurasi bawaan sub → XC.apply(pilihan) (bila pilihan butuh syarat, dicari
             konfigurasi terdekat yang membuatnya tersedia), lalu kamera sesuai jenis kelompok:
               full    3/4 depan seluruh benda (dibingkai per pilihan)
               common  3/4 depan, skala sama untuk semua pilihan (ukuran / kapasitas terbaca)
               region  detail: sudut kaki, lengan, sandaran, dudukan, tepi meja, headboard
               diff    dibingkai pada bagian yang berubah (tambahan, isi dalam, handle)
     • SYM — simbol garis (symbols.js) untuk pilihan abstrak: kain, isian, kekerasan, jahitan,
             material, finishing, badan kabinet, aksesori kecil.
   ========================================================================== */
(function () {
  'use strict';
  var XC = window.XC, ICON = window.ICON, SYM = window.SYMBOLS || {};
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var VIEW = { az: 32, el: 16, fov: 20 };

  /* ---------------- kamera dasar */
  function camFor(box, v) {
    v = v || VIEW;
    var t = [(box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2], diag = Math.hypot(box[3] - box[0], box[4] - box[1], box[5] - box[2]);
    var fov = v.fov || VIEW.fov;
    return { az: v.az == null ? VIEW.az : v.az, el: v.el == null ? VIEW.el : v.el, fov: fov, target: t, dist: Math.max(.5, diag) / 2 / Math.tan(fov / 2 * Math.PI / 180) * 1.25, crop: null };
  }
  function square(b, pad, minH) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, h = Math.max(b[2] - b[0], b[3] - b[1]) / 2 * (pad || 1.1);
    if (minH) h = Math.max(h, minH);
    return [cx - h, cy - h, cx + h, cy + h];
  }
  function union(a, b) { return !a ? b.slice() : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])]; }
  function union2(a, b) { return !a ? b.slice() : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }

  /* ---------------- daerah detail (koordinat dunia; depan = +Z, kamera di kanan depan) */
  var REG = {
    // sudut kaki depan kanan
    leg: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], lh = Math.max(.12, (+c.legH || 12) / 100 + .06), s = Math.max(.13, Math.min(.24, Math.min(W, D) * .24, lh * 1.25));
      return [b[3] - s, b[1], b[5] - s, b[3], b[1] + lh, b[5]];
    },
    // muka kanan (handle kabinet)
    frontR: function (b) { var W = b[3] - b[0], s = Math.min(.75, W * .45); return [b[3] - s, b[1], b[5] - .06, b[3], b[4], b[5]]; },
    // bantal hias di ujung kanan sandaran
    pillow: function (b, c) { var sh = (+c.seatH || 44) / 100, D = b[5] - b[2]; return [b[3] - Math.min(.95, (b[3] - b[0]) * .55), sh - .05, b[2], b[3] - .02, b[4], b[2] + D * .7]; },
    // depan badan (laci / sofa bed / recliner)
    deck: function (b, c) { var sh = (+c.seatH || 44) / 100, W = b[3] - b[0]; return [b[3] - Math.min(1.1, W * .55), b[1], b[5] - .2, b[3], sh + .08, b[5]]; },
    // lengan kanan seluruhnya
    arm: function (b) { var W = b[3] - b[0], s = Math.min(.42, W * .3); return [b[3] - s, b[1], b[2], b[3], b[4], b[5]]; },
    // sandaran tengah (permukaan)
    back: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], cx = (b[0] + b[3]) / 2, hw = Math.min(.5, W * .32), sh = (+c.seatH || 44) / 100;
      return [cx - hw, sh, b[2], cx + hw, b[4], b[2] + D * .6];
    },
    // dudukan (permukaan atas)
    seat: function (b, c) {
      var W = b[3] - b[0], D = b[5] - b[2], cx = (b[0] + b[3]) / 2, hw = Math.min(.62, W * .36), sh = (+c.seatH || 44) / 100;
      return [cx - hw * .2, sh - .12, b[2] + D * .2, cx + hw * 1.25, sh + .06, b[5]];
    },
    // tepi depan top meja
    edge: function (b, c) {
      var top = (+c.h || 75) / 100, cx = (b[0] + b[3]) / 2 + (b[3] - b[0]) * .18, t = (+c.thick || 3) / 100;
      return [cx - .09, top - t - .05, b[5] - .14, cx + .09, top + .01, b[5]];
    },
    // headboard (belakang tempat tidur)
    head: function (b) { var D = b[5] - b[2]; return [b[0], b[1], b[2], b[3], b[4], b[2] + Math.min(.6, D * .35)]; },
    // bagian bawah (base, rok, pijakan)
    low: function (b, c) { var H = b[4] - b[1]; return [b[0], b[1], b[2], b[3], b[1] + Math.max(.25, Math.min(.55, H * .45)), b[5]]; }
  };

  /* ---------------- aturan per kelompok  { m: mode, v: view, r: region, open: fn, svg: true } */
  var SMALL = /^(dining|stool)$/;   // kursi kecil: kaki terlihat jelas pada tampilan penuh
  function rule(cat, sub, gid) {
    var k = cat + '/' + sub;
    var R = {
      // bentuk keseluruhan
      shape: { m: 'full' }, form: { m: 'full' }, frame: { m: 'full' }, frameStyle: { m: 'full' }, construction: { m: 'full' },
      seats: { m: 'common', v: cat === 'meja' ? { el: 38 } : null }, height: { m: 'common' }, mattress: { m: 'common', v: { az: 28, el: 34 } },
      hbW: { m: 'common', v: { az: 14, el: 14 } },
      back: { m: 'full', v: cat === 'kursi' && sub !== 'dining' ? { az: 26, el: 12 } : null },
      backrest: { m: 'full' }, backStyle: { m: 'full', v: { az: 22, el: 12 } }, backS: { m: 'full' },
      arm: { m: 'region', r: 'arm', v: { az: 30, el: 14 } }, armStyle: { m: 'full' },
      backTuft: { m: sub === 'dining' ? 'full' : 'region', r: 'back', v: { az: 12, el: 10 } },
      seatC: { m: 'full', v: { el: 26 } }, seatTuft: { m: 'region', r: 'seat', v: { az: 20, el: 34 } },
      top: { m: sub === 'chaise' ? 'full' : 'full', v: { el: 30 } }, topTuft: { m: 'full', v: { el: 30 } }, tuft: { m: 'full', v: { el: 32 } }, sides: { m: 'full', v: { el: 10 } },
      cushion: { m: 'full', v: { el: 24 } }, seatShape: { m: 'full', v: { el: 36 } }, ends: { m: 'full' }, storage: { m: 'full', v: sub === 'divan' ? { az: 40, el: 18 } : { el: 20 } },
      headrest: { m: 'full' }, pillowType: { m: 'region', r: 'pillow', v: { az: 14, el: 12 } },
      base: { m: 'full', v: cat === 'meja' ? { el: 14 } : null }, stretcher: { m: 'full', v: { el: 10 } }, footrest: { m: 'full' },
      leg: { m: SMALL.test(sub) && cat === 'kursi' ? 'full' : 'region', r: 'leg', v: { az: 34, el: 12 } },
      skirt: { m: 'region', r: 'leg', v: { az: 34, el: 12 } },
      mount: { m: 'full', v: { el: 10 } },
      topShape: { m: 'full', v: { el: 40 } }, edge: { m: 'region', r: 'edge', v: { az: 18, el: 9 } },
      headboard: { m: 'region', r: 'head', v: { az: 16, el: 12 } },
      lowerDoors: { m: 'full' },
      doorType: { m: 'full', v: { az: 24, el: 12 }, open: 'one' },
      handle: { m: 'region', r: 'frontR', v: { az: 18, el: 10 } },
      interior: { m: 'diff', open: 'all', v: { az: 18, el: 12 } },
      trim: { m: 'diff', anchor: 'right' }, extras: { m: 'diff', anchor: 'right' }, swivel: { m: 'diff' }
    };
    var r = R[gid] || { m: 'full' };
    if (k === 'kursi/armchair' && gid === 'arm') r = { m: 'full', v: { az: 30, el: 14 } };
    if (k === 'kursi/chaise' && gid === 'base') r = { m: 'full', v: { el: 12 } };
    if (k === 'kursi/bench' && gid === 'leg') r = { m: 'region', r: 'leg', v: { az: 34, el: 12 } };
    if (k === 'kursi/ottoman' && gid === 'leg') r = { m: 'full', v: { az: 30, el: 8 } };
    // tanpa bantal hias agar permukaan / bentuk sandaran terlihat
    if (/^(back|backTuft|seatTuft|seatC|arm)$/.test(gid)) r.set = { pillows: 0, bolsters: 0 };
    // alas piring linen (penanda kapasitas) hanya pada kelompok kapasitas meja makan
    r.mats = gid === 'seats' ? 'faint' : 'hide';
    return r;
  }
  // aturan per pilihan (menggantikan aturan kelompok)
  function optRule(cat, sub, gid, oid, base) {
    var k = gid + '__' + oid, seat = cat === 'kursi', big = /^(sofa|armchair|chaise)$/.test(sub), legR = { m: 'region', r: 'leg', v: { az: 34, el: 12 } };
    var R = {
      trim__nailhead: big && sub !== 'chaise' ? { m: 'region', r: 'arm', v: { az: 30, el: 14 } } : null,
      trim__woodEnd: big ? { m: 'region', r: 'arm', v: { az: 30, el: 14 } } : null,
      trim__brassCap: big || sub === 'bench' ? legR : sub === 'ottoman' ? { m: 'full', v: { az: 30, el: 8 } } : null,
      trim__castor: big ? legR : sub === 'ottoman' ? { m: 'full', v: { az: 30, el: 8 } } : null,
      trim__brassBand: big ? legR : null,
      extras__storage: sub === 'sofa' ? { m: 'region', r: 'deck', v: { az: 24, el: 10 } } : null
    };
    var r = R[k]; if (!r) return null;
    var o = {}; for (var x in base) o[x] = base[x]; for (x in r) o[x] = r[x]; return o;
  }
  // kelompok yang selalu memakai simbol (sifat bahan / kenyamanan yang tidak tampak sebagai bentuk)
  var SYM_GROUPS = /^(uph|fill|firm|stitch|pipingC|pillowColor|legFinish|footrestFinish|topMat|baseMat|finish|carcass)$/;

  /* ---------------- cari konfigurasi yang membuat pilihan tersedia */
  function grOf(c, id) { return XC.sub(c).groups.filter(function (g) { return g.id === id; })[0]; }
  function setOpt(c0, gid, oid, multi) {
    var c = clone(c0), g = grOf(c, gid);
    if (multi) { var a = (c[gid] || []).slice(); if (a.indexOf(oid) < 0) a.push(oid); XC.apply(c, gid, a); }
    else XC.apply(c, gid, oid);
    g = grOf(c, gid);
    var okv = multi ? (c[gid] || []).indexOf(oid) >= 0 : c[gid] === oid;
    return okv && XC.visible(g, c) ? c : null;
  }
  function cfgFor(cat, sub, gr, opt) {
    var base = XC.defaults(cat, sub), multi = gr.type === 'multi', r = setOpt(base, gr.id, opt.id, multi);
    if (r) return { cfg: r, via: '' };
    var others = XC.sub(base).groups.filter(function (g) { return g.id !== gr.id && g.type === 'chips'; });
    others.sort(function (a, b) { return (a.step === gr.step ? 0 : 1) - (b.step === gr.step ? 0 : 1); });
    var all = function (g) { return typeof g.opts === 'function' ? g.opts(base) : g.opts || []; };
    var i, j, a, b2, c1, c2;
    for (i = 0; i < others.length; i++) { a = all(others[i]); for (j = 0; j < a.length; j++) { c1 = setOpt(base, others[i].id, a[j].id); if (c1 && (r = setOpt(c1, gr.id, opt.id, multi))) return { cfg: r, via: others[i].id + '=' + a[j].id }; } }
    for (i = 0; i < others.length; i++) { a = all(others[i]); for (j = 0; j < a.length; j++) { c1 = setOpt(base, others[i].id, a[j].id); if (!c1) continue;
      for (var k = 0; k < others.length; k++) { if (k === i) continue; b2 = all(others[k]); for (var l = 0; l < b2.length; l++) { c2 = setOpt(c1, others[k].id, b2[l].id); if (c2 && (r = setOpt(c2, gr.id, opt.id, multi))) return { cfg: r, via: others[i].id + '=' + a[j].id + ',' + others[k].id + '=' + b2[l].id }; } } } }
    return null;
  }

  /* ---------------- pembukaan pintu / laci */
  function openFn(kind) {
    if (kind === 'all') return function (m) { return m.kind === 'drawer' ? 0 : m.kind === 'slide' ? .9 : .82; };
    if (kind === 'one') return function (m, i, list) {
      var first = list.filter(function (q) { return q.kind !== 'drawer'; })[0] || list[0];
      if (m !== first) return 0;
      return m.kind === 'drawer' ? .55 : m.kind === 'slide' ? .75 : m.kind === 'flip' ? .6 : .55;
    };
    return 0;
  }

  /* ---------------- gambar */
  function fade(a, px) {   // detail: tepi kotak memudar halus
    var N = ICON.OUT;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var d = Math.min(x, y, N - 1 - x, N - 1 - y); if (d >= px) continue;
      var t = d / px; a[y * N + x] = Math.round(a[y * N + x] * t * t * (3 - 2 * t));
    }
    return a;
  }
  function shotFull(cfg, v, open) {
    var info = ICON.build(cfg, open), sp = camFor(info.box, v); ICON.cam(sp);
    var fp = ICON.footprint(ICON.snap()); if (!fp.n) return null;
    sp.crop = square(fp.box, 1.12); return ICON.draw(sp);
  }
  // kelompok: kembalikan [{ id, a: Uint8Array | null, sym: key | null, note }]
  function groupShots(cat, sub, gr) {
    var opts = typeof gr.opts === 'function' ? gr.opts(XC.defaults(cat, sub)) : gr.opts, ru = rule(cat, sub, gr.id), out = [];
    var symKey = function (o) { var k = gr.id + '__' + o.id; return SYM[cat + '/' + sub + ':' + k] ? cat + '/' + sub + ':' + k : SYM[k] ? k : null; };
    var jobs = opts.map(function (o) {
      var sk = symKey(o);
      var f = cfgFor(cat, sub, gr, o);
      if (!f) return { o: o, skip: true, note: 'unreachable' };   // pilihan tidak pernah tampil di sub ini
      if (SYM_GROUPS.test(gr.id) || (sk && (SYM[sk].force || SYM[sk].prefer))) return { o: o, sym: sk || null, note: sk ? '' : 'no symbol' };
      var cfg = f.cfg, ro = optRule(cat, sub, gr.id, o.id, ru) || ru;
      if (ro.set) { cfg = clone(cfg); for (var q in ro.set) if (cfg[q] !== undefined) XC.apply(cfg, q, ro.set[q]); }
      return { o: o, cfg: cfg, note: f.via ? 'via ' + f.via : '', sym: sk, ru: ro };
    });
    ICON.state.mats = ru.mats || 'hide';
    var open = openFn(ru.open), v = ru.v;
    var three = jobs.filter(function (j) { return j.cfg && j.ru.m === ru.m && !(j.ru !== ru && ru.m === 'common'); });
    var solo = jobs.filter(function (j) { return j.cfg && three.indexOf(j) < 0; });
    if (ru.m === 'common' && three.length) {
      var ub = null; three.forEach(function (j) { ub = union(ub, ICON.build(j.cfg, open).box); });
      var sp = camFor(ub, v), fu = null; ICON.cam(sp);
      three.forEach(function (j) { ICON.build(j.cfg, open); ICON.cam(sp); var fp = ICON.footprint(ICON.snap()); if (fp.n) fu = union2(fu, fp.box); });
      sp.crop = square(fu, 1.1);
      three.forEach(function (j) { ICON.build(j.cfg, open); j.a = ICON.draw(sp); });
    }
    solo.forEach(function (j) { one(j); });
    three.forEach(function (j) { if (ru.m !== 'common') one(j); });
    function one(j) {
      var ru = j.ru, v = ru.v, open = openFn(ru.open);
      if (ru.m === 'region') {
        var info = ICON.build(j.cfg, open), sp = camFor(info.box, v); ICON.cam(sp);
        var rb = ICON.project(REG[ru.r](info.box, j.cfg)), fp = ICON.footprint(ICON.snap());
        // daerah dipotong ke tapak objek (tidak ada ruang kosong berlebih)
        if (fp.n) rb = [Math.max(rb[0], fp.box[0] - .04), Math.max(rb[1], fp.box[1] - .04), Math.min(rb[2], fp.box[2] + .04), Math.min(rb[3], fp.box[3] + .04)];
        sp.crop = square(rb, 1.08, .07); j.a = fade(ICON.draw(sp), 16); j.detail = true;
      } else if (ru.m === 'diff') {
        // pembanding: tanpa pilihan ini (multi) atau pilihan acuan / pertama (chips)
        var ref;
        if (gr.type === 'multi') { ref = clone(j.cfg); XC.apply(ref, gr.id, (ref[gr.id] || []).filter(function (x) { return x !== j.o.id; })); }
        else { var rid = ru.ref && ru.ref !== j.o.id ? ru.ref : opts[0].id === j.o.id ? (opts[1] || opts[0]).id : opts[0].id; ref = clone(j.cfg); XC.apply(ref, gr.id, rid); }
        var info = ICON.build(j.cfg, open), rinfo, sp; rinfo = ICON.build(ref, open); sp = camFor(union(info.box, rinfo.box), v); ICON.cam(sp);
        var gR = ICON.snap(); ICON.build(j.cfg, open); ICON.cam(sp); var gA = ICON.snap(), fp = ICON.footprint(gA), d = ICON.diff(gR, gA);
        j.diffN = d.n;
        if (!fp.n) return;
        var full = square(fp.box, 1.12), fh = (full[2] - full[0]) / 2;
        if (d.n >= 10) {
          var db = d.box, h = Math.max(db[2] - db[0], db[3] - db[1]) / 2 * 1.35, minH = fh * .32, maxH = fh * .62;
          h = Math.max(minH, Math.min(maxH, h));
          var cx = (db[0] + db[2]) / 2, cy = (db[1] + db[3]) / 2;
          if ((db[2] - db[0]) / 2 > h) cx = ru.anchor === 'left' ? db[0] + h * .85 : db[2] - h * .85;
          if ((db[3] - db[1]) / 2 > h) cy = db[3] - h * .85;
          if (h >= fh * .6) { sp.crop = full; j.a = ICON.draw(sp); }
          else { sp.crop = [cx - h, cy - h, cx + h, cy + h]; j.a = fade(ICON.draw(sp), 16); j.detail = true; }
        } else { sp.crop = full; j.a = ICON.draw(sp); j.weak = true; }
      } else j.a = shotFull(j.cfg, v, open);
    }
    // perbedaan terlalu kecil (pilihan tidak tampak di 3D) dan ada simbol → pakai simbol
    jobs.forEach(function (j) {
      if (j.weak && j.sym) { j.a = null; j.note = 'weak 3D → symbol'; }
      else if (j.weak) j.note = (j.note ? j.note + '; ' : '') + 'weak diff ' + j.diffN;
      if (j.a && j.sym && !SYM[j.sym].force && SYM[j.sym].prefer) { j.a = null; j.note = 'symbol preferred'; }
      out.push({ id: j.o.id, a: j.a || null, sym: j.a ? null : j.sym, note: j.note || '', detail: !!j.detail, skip: !!j.skip });
    });
    return out;
  }

  /* ---------------- daftar pekerjaan */
  function jobs() {
    var list = [];
    XC.CATS.forEach(function (c) {
      list.push({ kind: 'cat', cat: c.id });
      c.subs.forEach(function (s) {
        list.push({ kind: 'sub', cat: c.id, sub: s.id });
        s.groups.forEach(function (g) { if (g.type === 'chips' || g.type === 'multi') list.push({ kind: 'group', cat: c.id, sub: s.id, group: g.id }); });
      });
    });
    return list;
  }
  function jenisShot(cat, sub) {
    var c = XC.defaults(cat, sub); ICON.state.mats = 'hide';
    return shotFull(c, { az: 30, el: 15 }, 0);
  }
  function run(j) {
    if (j.kind === 'cat') { var c = XC.CATS.filter(function (x) { return x.id === j.cat; })[0]; return [{ id: j.cat, a: jenisShot(j.cat, c.subs[0].id) }]; }
    if (j.kind === 'sub') return [{ id: j.sub, a: jenisShot(j.cat, j.sub) }];
    var gr = XC.sub({ cat: j.cat, sub: j.sub }).groups.filter(function (g) { return g.id === j.group; })[0];
    return groupShots(j.cat, j.sub, gr);
  }
  window.PLAN = { jobs: jobs, run: run, rule: rule, cfgFor: cfgFor, camFor: camFor, VIEW: VIEW };
})();
