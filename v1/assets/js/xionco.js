/* ==========================================================================
   XIONCO BUSINESS — Core interaction engine (v0.2)
   Mode "x"     : desktop / landscape — Main Frame accordion 8 × 4 block
   Mode "stack" : mobile / portrait   — kartu bertumpuk (gambar 6), swipe
   - Spring physics, garis emas, cahaya bawah frame (terkunci di lebar frame)
   - Play button = tombol ke halaman, selalu terlihat, tepat di bawah orb
   - Video/animasi berjalan hanya saat frame aktif (hover / kartu tengah)
   - Routing (hash), transisi frame → halaman, sidebar, intro, keyboard, dev
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.XIONCO_CONFIG || {};
  var ASSETS = window.XIONCO_ASSETS;
  var SCENES = window.XIONCO_SCENES;
  var ROUTES = CFG.routes || { home: {} };
  var MOTION = CFG.motion || {};
  var IDLE = (CFG.frame && CFG.frame.idle) || [4, 2, 1, 1];
  var EXPANDED = (CFG.frame && CFG.frame.expanded) || 5;
  var STACK_START = 1; // kartu awal di mobile (gambar 6: Customize di tengah)

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function store(kind, key, val) {
    try {
      var s = kind === 'local' ? localStorage : sessionStorage;
      if (val === undefined) return s.getItem(key);
      s.setItem(key, val);
    } catch (e) { return null; }
  }

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (REDUCED) MOTION = Object.assign({}, MOTION, { hover: { k: 520, c: 46 }, enter: { k: 420, c: 41 } });

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */
  var S = {
    route: null, tab: null,
    state: 'boot',          // boot | idle | hover | page
    active: -1,
    ready: false,
    introRunning: false,
    pointer: FINE ? 'mouse' : 'touch',
    devGrid: false,
    suppressClick: false
  };

  /* ---------------------------------------------------------------------- */
  /* Tracking — UTM (first & last touch) + window.dataLayer                 */
  /* ---------------------------------------------------------------------- */
  var Track = (function () {
    var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid'];
    var utm = {};
    try {
      var q = new URLSearchParams(location.search);
      KEYS.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
      if (Object.keys(utm).length) {
        utm.landing = location.pathname + location.search;
        utm.referrer = document.referrer || '';
        utm.ts = new Date().toISOString();
        store('session', 'xc_utm_last', JSON.stringify(utm));
        if (!store('local', 'xc_utm_first')) store('local', 'xc_utm_first', JSON.stringify(utm));
      } else {
        utm = JSON.parse(store('session', 'xc_utm_last') || '{}');
      }
    } catch (e) { utm = {}; }
    window.dataLayer = window.dataLayer || [];
    return {
      utm: function () { return utm; },
      event: function (name, data) {
        var payload = { event: 'xc_' + name, xc_route: S.route || 'home' };
        for (var k in data) if (data[k] !== undefined) payload[k] = data[k];
        if (utm.utm_source) payload.utm_source = utm.utm_source;
        if (utm.utm_campaign) payload.utm_campaign = utm.utm_campaign;
        window.dataLayer.push(payload);
      }
    };
  })();
  window.XIONCO = { track: Track.event, utm: Track.utm };

  /* ---------------------------------------------------------------------- */
  /* Spring                                                                 */
  /* ---------------------------------------------------------------------- */
  function Spring(x, cfg, eps) {
    this.x = x; this.v = 0; this.t = x;
    this.eps = eps || 1e-4;
    this.set(cfg || { k: 120, c: 21 });
  }
  Spring.prototype.set = function (cfg) { this.k = cfg.k; this.c = cfg.c; return this; };
  Spring.prototype.step = function (dt) {
    if (this.x === this.t && this.v === 0) return false;
    var n = Math.ceil(dt / 0.004), h = dt / n;
    for (var i = 0; i < n; i++) {
      var a = -this.k * (this.x - this.t) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    if (Math.abs(this.x - this.t) < this.eps && Math.abs(this.v) < this.eps * 10) { this.x = this.t; this.v = 0; return false; }
    return true;
  };
  Spring.prototype.snap = function (v) { if (v != null) this.t = v; this.x = this.t; this.v = 0; };

  /* ---------------------------------------------------------------------- */
  /* Elements                                                               */
  /* ---------------------------------------------------------------------- */
  var root = document.documentElement;
  var app = $('#app'), frame = $('#frame'), track = $('#track'), rail = $('#rail');
  var underglow = $('#underglow');
  var page = $('#page'), pageBody = $('#pageBody'), pageGlyph = $('#pageGlyph');
  var subnavInner = $('#subnavInner'), crumbs = $('#crumbs');
  var sidebar = $('#sidebar'), sbHover = $('#sidebarHover');
  var menuBtn = $('#menuBtn'), drawerScrim = $('#drawerScrim');
  var stackNav = $('#stackNav'), stackDots = $$('#stackNav button');
  var hud = $('#hud'), grid = $('#frameGrid');

  var panels = $$('.panel', track).map(function (el, i) {
    var p = {
      el: el, i: i, key: el.dataset.key, route: el.dataset.route,
      focusX: parseFloat(el.dataset.focus || '2.5'),
      stage: $('.panel__stage', el), media: $('.panel__media', el), canvas: $('.panel__canvas', el),
      hit: $('.panel__hit', el), play: $('.panel__play', el), devtag: $('.panel__devtag', el),
      w: new Spring(2, MOTION.hover),
      rate: 0, rateT: 0, time: 0, dirty: true,
      scene: null, video: null, gif: null, poster: null, mediaKind: 'procedural',
      orb: { x: 0, y: 0, r: 0 }, rect: { x: 0, y: 0, w: 0, h: 0 },
      pos: 0, size: 0, _k: ''
    };
    p.scene = SCENES ? SCENES.create(p.key, p.canvas) : null;
    if (p.scene) p.time = p.scene.t;
    return p;
  });
  var N = panels.length;

  var railX = new Spring(0, MOTION.rail, 0.02);
  var railW = new Spring(0, MOTION.rail, 0.02);
  var tiltX = new Spring(0, { k: 38, c: 11.5 }, 1e-4);
  var tiltY = new Spring(0, { k: 38, c: 11.5 }, 1e-4);
  var stackPos = new Spring(STACK_START, { k: 165, c: 25 }, 1e-4);
  var expand = new Spring(0, MOTION.enter, 1e-4);

  /* ---------------------------------------------------------------------- */
  /* Text splitting                                                         */
  /* ---------------------------------------------------------------------- */
  function splitTitles() {
    $$('[data-split]').forEach(function (h) {
      var txt = h.textContent.trim();
      h.textContent = '';
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = txt;
      h.appendChild(sr);
      var ci = 0;
      txt.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.setAttribute('aria-hidden', 'true');
        if (ch === ' ') s.className = 'sp';
        else { s.className = 'ch'; s.textContent = ch; s.style.setProperty('--ci', ci++); }
        h.appendChild(s);
      });
    });
  }

  function splitBrand() {
    var el = $('#brandText');
    if (!el) return;
    var txt = el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    // gradasi highlight hangat → emas → perunggu (mockup: puncak #c2af99)
    var stops = [[0, [205, 189, 166]], [0.5, [184, 160, 120]], [1, [106, 90, 71]]];
    function colorAt(t) {
      for (var k = 1; k < stops.length; k++) {
        if (t <= stops[k][0]) {
          var a = stops[k - 1], b = stops[k], f = (t - a[0]) / (b[0] - a[0]);
          return [0, 1, 2].map(function (j) { return Math.round(a[1][j] + (b[1][j] - a[1][j]) * f); });
        }
      }
      return stops[stops.length - 1][1];
    }
    var n = txt.length;
    txt.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      if (ch === ' ') { s.className = 'brand__sp'; el.appendChild(s); return; }
      s.className = 'brand__ch';
      s.textContent = ch;
      s.style.setProperty('--c', 'rgb(' + colorAt(i / (n - 1)).join(',') + ')');
      s.style.setProperty('--i', i);
      el.appendChild(s);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Geometry                                                               */
  /* ---------------------------------------------------------------------- */
  var G = { mode: '', u: 0, bz: 0, hdr: 72, vw: 0, vh: 0, fx: 0, fy: 0, fw: 0, fh: 0, tw: 0, th: 0, sw: 0, sh: 0, cw: 0, ch: 0, pd: 48, py: 0, mobile: false, dpr: 1 };

  function measure() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var mobile = vw < 700;
    var hdr = mobile ? 60 : 72;
    var mode = vw / vh < 0.9 ? 'stack' : 'x';
    var B = CFG.block || {};
    var u, bz, tw, th, fx, fy, sw, sh, cw = 0, ch = 0, pd, py;

    if (mode === 'x') {
      var wr = (B.widthRatio || 0.0705) + clamp((1440 - vw) / 416, 0, 1) * 0.012;
      u = Math.min(vw * wr, (vh - hdr) * (B.heightRatio || 0.135));
      u = Math.min(u, (vw - (mobile ? 32 : 168)) / 8.25);
      u = Math.round(clamp(u, B.min || 44, B.max || 168) * 2) / 2;
      bz = Math.max(6, Math.round(u * 0.1));
      tw = u * 8; th = u * 4;
      fx = Math.round((vw - tw - bz * 2) / 2);
      fy = Math.round(hdr + (vh - hdr) * 0.475 - (th + bz * 2) / 2);
      sw = u * 5; sh = u * 4;
      pd = Math.round(clamp(u * 0.46, 40, 58));
      py = u * 2 + u * 0.5 + u * 0.14 + pd / 2;       // tepat di bawah orb (pusat orb di 2 block)
    } else {
      var side = mobile ? 46 : 120;                   // ruang untuk irisan kartu kiri/kanan
      var top = hdr + (mobile ? 16 : 40), bottom = mobile ? 64 : 100;
      var availH = vh - top - bottom;
      cw = Math.min(vw - side * 2, availH * 0.8, 560);
      ch = cw * 1.25;
      u = cw / 4;
      bz = 0;
      tw = vw - (mobile ? 24 : 64); th = availH;
      fx = Math.round((vw - tw) / 2); fy = top;
      sw = cw; sh = ch;
      pd = Math.round(clamp(cw * 0.15, 42, 56));
      py = ch * 0.34 + cw / 8 + 12 + pd / 2;
    }

    var modeChanged = mode !== G.mode;
    var unitChanged = u !== G.u || cw !== G.cw;
    G.mode = mode; G.u = u; G.bz = bz; G.hdr = hdr; G.vw = vw; G.vh = vh; G.mobile = mobile;
    G.fx = fx; G.fy = fy; G.fw = tw + bz * 2; G.fh = th + bz * 2; G.tw = tw; G.th = th; G.sw = sw; G.sh = sh;
    G.cw = cw; G.ch = ch; G.pd = pd; G.py = py;
    // mode kartu: jarak atas halaman agar tidak tertutup sub-navigasi
    G.pt = mode === 'stack' ? Math.max(0, hdr + (mobile ? 38 : 42) + 12 - fy) : 0;
    G.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);

    var st = root.style;
    st.setProperty('--u', u + 'px');
    st.setProperty('--bz', bz + 'px');
    st.setProperty('--hdr', hdr + 'px');
    st.setProperty('--fx', fx + 'px');
    st.setProperty('--fy', fy + 'px');
    st.setProperty('--fw', G.fw + 'px');
    st.setProperty('--fh', G.fh + 'px');
    st.setProperty('--tw', tw + 'px');
    st.setProperty('--th', th + 'px');
    st.setProperty('--sw', sw + 'px');
    st.setProperty('--sh', sh + 'px');
    st.setProperty('--pd', pd + 'px');
    st.setProperty('--py', py + 'px');
    st.setProperty('--pt', G.pt + 'px');

    // orb per panel (koordinat "layar")
    panels.forEach(function (p) {
      p.orb = mode === 'x'
        ? { x: p.focusX * u, y: u * 2, r: u / 2 }
        : { x: cw / 2, y: ch * 0.34, r: cw / 8 };
      p.el.style.setProperty('--ox', p.orb.x + 'px');
      p.el.style.setProperty('--oy', p.orb.y + 'px');
      p.el.style.setProperty('--or', p.orb.r + 'px');
    });

    frame.dataset.mode = mode;
    app.classList.toggle('is-stack', mode === 'stack');
    app.classList.toggle('is-mobile', mobile);
    if (mode === 'stack') {
      stackNav.style.top = (fy + (th - ch) * 0.42 + ch + 16) + 'px';
    }

    if (modeChanged) {
      panels.forEach(function (p) {
        ['left', 'top', 'width', 'height', 'opacity', 'zIndex', 'transform', 'visibility'].forEach(function (k) { p.el.style[k] = ''; });
        p.el.style.removeProperty('--dim');
        p._k = '';
        if (p.video) p.video.style.objectPosition = objectPos(p);
        if (p.poster) p.poster.style.objectPosition = objectPos(p);
      });
      rail.style.width = ''; rail.style.height = '';
      frame.style.transform = '';
    } else if (unitChanged) {
      panels.forEach(function (p) { p._k = ''; });
    }
    if ((modeChanged || unitChanged) && S.devGrid) buildGrid();
    return modeChanged;
  }

  /* Resolusi canvas: normal di homepage; saat frame membuka halaman, layar di-zoom
     (desktop 1.6×, mobile ±1.8×) → canvas digambar ulang lebih tajam agar tidak pecah. */
  function sceneDensity(z) {
    return z > 1.01 ? Math.min(Math.min(G.dpr, 2) * z, 3.4) : Math.min(G.dpr, 1.5);
  }
  function pageZoom() {
    return G.mode === 'x' ? 8 / EXPANDED : Math.max(G.tw / G.cw, (G.th - G.pt) / G.ch, 1);
  }
  function resizeScene(p) {
    if (p.scene && !p.video && !p.poster) {
      p.scene.resize(G.sw, G.sh, sceneDensity(p.zoom || 1), p.orb, G.u, G.mode);
      p.dirty = true;
    }
  }
  function setZoom(p, z) {
    if (Math.abs((p.zoom || 1) - z) < 0.01) return;
    p.zoom = z;
    resizeScene(p);
  }
  function resizeScenes() {
    panels.forEach(function (p) {
      if (S.state === 'page' && p.i === S.active) p.zoom = pageZoom();
      resizeScene(p);
    });
  }

  function objectPos(p) {
    return G.mode === 'x' ? '50% 50%' : (p.focusX / 5 * 100).toFixed(1) + '% 50%';
  }

  /* ---------------------------------------------------------------------- */
  /* Layout per frame                                                       */
  /* ---------------------------------------------------------------------- */
  function layout() { if (G.mode === 'stack') layoutStack(); else layoutAccordion(); }

  function layoutAccordion() {
    var main = G.tw, unit = G.u, dpr = G.dpr;
    var total = 0, i, p;
    for (i = 0; i < N; i++) total += Math.max(0, panels[i].w.x);
    if (total < 1e-6) total = 1;
    var scale = main / total, pos = 0;
    for (i = 0; i < N; i++) {
      p = panels[i];
      var size = Math.max(0, p.w.x) * scale;
      var a = Math.round(pos * dpr) / dpr;
      var b = Math.round((pos + size) * dpr) / dpr;
      var len = Math.max(0, b - a);
      var key = a + '|' + len;
      if (p._k !== key) {
        // "layar" 5 × 4 block; saat panel > 5 block (masuk halaman) layar di-zoom
        var stageMain = EXPANDED * unit;
        var s = Math.max(1, len / stageMain);
        var focus = p.focusX * unit * s;
        var off = clamp(focus - len / 2, 0, Math.max(0, stageMain * s - len));
        p.el.style.transform = 'translate3d(' + a + 'px,0,0)';
        p.el.style.width = len + 'px';
        p.stage.style.transform = 'translate3d(' + (-off).toFixed(2) + 'px,0,0) scale(' + s.toFixed(4) + ')';
        p.el.style.setProperty('--px', (p.orb.x * s - off).toFixed(1) + 'px');   // play tepat di bawah orb
        p.el.style.visibility = len < 0.5 ? 'hidden' : '';
        p._k = key;
      }
      p.pos = a; p.size = len;
      pos += size;
    }
  }

  function layoutStack() {
    var pos = stackPos.x, E = clamp(expand.x, 0, 1.15);
    var cw = G.cw, ch = G.ch, tw = G.tw, th = G.th, pt = G.pt;
    var bL = (tw - cw) / 2, bT = (th - ch) * 0.42;
    for (var i = 0; i < N; i++) {
      var p = panels[i];
      var d = i - pos, ad = Math.abs(d), sg = d < 0 ? -1 : 1, k = Math.min(ad, 3);
      var s = 1 - 0.07 * k;
      var slice = k <= 1 ? 26 * k : k <= 2 ? 26 + 18 * (k - 1) : 44 + 14 * (k - 2);
      var tx = ad < 1e-4 ? 0 : sg * (cw / 2 + slice - cw * s / 2);
      var ry = -sg * Math.min(ad, 1) * 8;
      var W = cw, H = ch, L = bL, T = bT, op = 1;
      if (E > 0.0001 && S.state === 'page' && i === S.active) {
        // halaman: kartu melebar mengisi area di bawah sub-navigasi
        W = cw + (tw - cw) * E; H = ch + (th - pt - ch) * E;
        L = bL * (1 - E); T = bT + (pt - bT) * E;
        tx *= 1 - E; ry *= 1 - E; s += (1 - s) * E;
      } else if (E > 0.0001) {
        op = Math.max(0, 1 - E * 1.5); tx += sg * 30 * E;
      }
      var key = [L, T, W, H, tx, ry, s, op].map(function (v) { return v.toFixed(2); }).join('|');
      if (p._k !== key) {
        p.el.style.left = L + 'px';
        p.el.style.top = T + 'px';
        p.el.style.width = W + 'px';
        p.el.style.height = H + 'px';
        p.el.style.transform = 'perspective(1400px) translate3d(' + tx.toFixed(2) + 'px,0,0) rotateY(' + ry.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
        p.el.style.opacity = op.toFixed(3);
        p.el.style.zIndex = String(100 - Math.round(ad * 10));
        p.el.style.setProperty('--dim', (k * 0.26).toFixed(3));
        p.el.style.setProperty('--px', (W / 2) + 'px');
        var sc = Math.max(W / cw, H / ch);
        p.stage.style.transform = 'translate3d(' + ((W - cw * sc) / 2).toFixed(2) + 'px,' + ((H - ch * sc) / 2).toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
        p._k = key;
      }
      // rect visual (untuk garis emas)
      p.rect.x = L + tx + W * (1 - s) / 2;
      p.rect.y = T + H * (1 - s) / 2;
      p.rect.w = W * s; p.rect.h = H * s;
      p.size = W;
    }
  }

  function railTarget() {
    if (S.active >= 0 && (S.state === 'hover' || S.state === 'page')) {
      var p = panels[S.active];
      return [p.pos, p.size];
    }
    return [0, G.tw];
  }

  function drawRail() {
    var x, w;
    if (G.mode === 'x') {
      x = railX.x; w = Math.max(0, railW.x);
      rail.style.transform = 'translate3d(' + (G.bz + x).toFixed(2) + 'px,' + (G.bz + G.th - 1) + 'px,0)';
      rail.style.width = w.toFixed(2) + 'px';
      underglow.style.transform = 'translate3d(' + (G.bz + x).toFixed(1) + 'px,0,0)';
      underglow.style.width = w.toFixed(1) + 'px';
    } else {
      var idx = clamp(Math.round(stackPos.x), 0, N - 1);
      var r = panels[S.state === 'page' && S.active >= 0 ? S.active : idx].rect;
      rail.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,' + (r.y + r.h - 1).toFixed(2) + 'px,0)';
      rail.style.width = r.w.toFixed(2) + 'px';
    }
  }

  function tiltEnabled() { return FINE && !REDUCED && G.mode === 'x' && MOTION.tilt; }
  function applyTilt() {
    var k = S.state === 'page' ? 0.25 : 1;
    var T = MOTION.tilt;
    frame.style.transform = 'perspective(2400px) rotateX(' + (tiltY.x * T.x * k).toFixed(3) + 'deg) rotateY(' + (-tiltX.x * T.y * k).toFixed(3) + 'deg)';
  }

  /* ---------------------------------------------------------------------- */
  /* Media (video / GIF / poster / procedural)                              */
  /* ---------------------------------------------------------------------- */
  function setRate(p, r) { p.rateT = r; }

  function updateMedia(p, dt) {
    var up = p.rateT > p.rate;
    p.rate += (p.rateT - p.rate) * (1 - Math.exp(-dt * (up ? 4.2 : 2.8)));
    if (Math.abs(p.rate - p.rateT) < 0.003) p.rate = p.rateT;
    var moving = p.rate > 0.0008;
    var visible = p.size > 0.5 && p.el.style.opacity !== '0.000';

    if (p.video) {
      var v = p.video;
      if (p.rateT > 0 && v.paused && visible) {
        try { v.playbackRate = Math.max(0.25, p.rate); } catch (e) {}
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      }
      if (!v.paused) {
        var target = Math.max(0.0625, Math.round(p.rate * 20) / 20);
        if (Math.abs(v.playbackRate - target) > 0.04) { try { v.playbackRate = target; } catch (e) {} }
        if ((p.rateT === 0 && p.rate < 0.1) || !visible) v.pause();
      }
    } else if (p.gif) {
      var want = p.rateT > 0 && visible;
      if (want && !p.gifOn) { p.gif.src = p.gifSrc; p.gifOn = true; }
      else if (!want && p.gifOn && p.rate < 0.2 && p.posterSrc) { p.gif.src = p.posterSrc; p.gifOn = false; }
    } else if (p.scene && !p.poster) {
      if (moving && visible) { p.time += dt * p.rate; p.scene.render(p.time); }
      else if (p.dirty && visible) { p.scene.render(p.time); p.dirty = false; }
    }
    return moving || p.rate !== p.rateT;
  }

  function attachVideo(p, src, poster) {
    if (/\.gif$/i.test(src)) return attachGif(p, src, poster);
    var v = document.createElement('video');
    v.className = 'panel__video';
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    if (poster) v.poster = poster;
    v.style.objectPosition = objectPos(p);
    v.addEventListener('loadeddata', function () {
      v.classList.add('is-ready');
      p.video = v; p.mediaKind = 'video';
      setTimeout(function () { p.canvas.style.display = 'none'; p.scene = null; }, 900);
      kick();
    }, { once: true });
    v.src = src;
    p.media.appendChild(v);
  }

  function attachGif(p, src, poster) {
    var img = new Image();
    img.className = 'panel__img';
    img.alt = '';
    img.style.objectPosition = objectPos(p);
    img.onload = function () {
      img.classList.add('is-ready');
      setTimeout(function () { p.canvas.style.display = 'none'; p.scene = null; }, 900);
    };
    p.gif = img; p.gifSrc = src; p.posterSrc = poster; p.gifOn = !poster; p.mediaKind = 'gif';
    img.src = poster || src;
    p.media.appendChild(img);
  }

  function attachPoster(p, src) {
    var img = new Image();
    img.className = 'panel__img';
    img.alt = '';
    img.style.objectPosition = objectPos(p);
    img.onload = function () {
      img.classList.add('is-ready');
      p.poster = img; p.mediaKind = 'poster';
      setTimeout(function () { p.canvas.style.display = 'none'; }, 900);
    };
    img.src = src;
    p.media.appendChild(img);
  }

  function loadAssets() {
    if (!CFG.probeAssets || !ASSETS) return;
    ASSETS.resolve('brand-wordmark').then(function (src) {
      if (!src) return;
      var img = new Image();
      img.className = 'brand__img'; img.alt = '';
      img.onload = function () { var t = $('#brandText'); if (t) t.replaceWith(img); };
      img.src = src;
    });
    ASSETS.resolve('brand-slogan').then(function (src) {
      if (!src) return;
      var img = new Image();
      img.className = 'slogan__img'; img.alt = '#1 Furniture Manufacturer in Indonesia';
      img.onload = function () { var s = $('#slogan'); s.textContent = ''; s.appendChild(img); };
      img.src = src;
    });
    ASSETS.resolve('brand-favicon').then(function (src) {
      if (!src) return;
      var l = document.createElement('link'); l.rel = 'icon'; l.href = src; document.head.appendChild(l);
    });
    (G.mobile ? ASSETS.resolve('home-bg-mobile') : Promise.resolve(null)).then(function (m) {
      return m || ASSETS.resolve('home-bg');
    }).then(function (src) {
      if (!src) return;
      var img = new Image();
      img.onload = function () { var bg = $('#bgImage'); bg.style.backgroundImage = 'url("' + src + '")'; bg.classList.add('is-ready'); };
      img.src = src;
    });
    panels.forEach(function (p) {
      var k = p.key;
      Promise.all([
        ASSETS.resolve('frame-' + k + '-poster'),
        ASSETS.resolve('frame-' + k + '-video'),
        G.mode === 'stack' ? ASSETS.resolve('frame-' + k + '-mobile') : Promise.resolve(null)
      ]).then(function (r) {
        var poster = r[0], video = r[2] || r[1];
        if (video) attachVideo(p, video, poster);
        else if (poster) attachPoster(p, poster);
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Loop                                                                   */
  /* ---------------------------------------------------------------------- */
  var running = false, lastT = 0;
  function kick() {
    if (running) return;
    running = true; lastT = performance.now();
    requestAnimationFrame(tick);
  }
  function tick(now) {
    var dt = Math.min(0.064, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    var busy = false, i;
    if (G.mode === 'x') {
      for (i = 0; i < N; i++) if (panels[i].w.step(dt)) busy = true;
    } else {
      if (stackPos.step(dt)) busy = true;
      if (expand.step(dt)) busy = true;
    }
    layout();
    if (G.mode === 'x') {
      var rt = railTarget();
      railX.t = rt[0]; railW.t = rt[1];
      if (railX.step(dt)) busy = true;
      if (railW.step(dt)) busy = true;
    }
    drawRail();
    if (tiltEnabled()) {
      if (tiltX.step(dt)) busy = true;
      if (tiltY.step(dt)) busy = true;
      applyTilt();
    }
    for (i = 0; i < N; i++) if (updateMedia(panels[i], dt)) busy = true;
    if (S.devGrid) drawHud();
    if (busy || drag) requestAnimationFrame(tick);
    else running = false;
  }

  /* ---------------------------------------------------------------------- */
  /* Frame states                                                           */
  /* ---------------------------------------------------------------------- */
  function setTargets(arr, cfg) {
    panels.forEach(function (p, j) { p.w.set(cfg || MOTION.hover); p.w.t = arr[j]; });
  }
  function applyClasses() {
    var inPage = S.state === 'page';
    var stack = G.mode === 'stack';
    panels.forEach(function (p, j) {
      var t = p.w.t;
      var open = stack ? (!inPage && j === S.active) : (!inPage && t >= 4);
      p.el.classList.toggle('is-active', j === S.active);
      p.el.classList.toggle('is-open', open);
      p.play.tabIndex = inPage ? -1 : 0;
    });
    stackDots.forEach(function (b, j) { b.classList.toggle('is-on', j === S.active); });
  }
  function setState(st) { S.state = st; frame.dataset.state = st; }

  function activate(i) {
    if (!S.ready || S.route !== 'home') return;
    if (G.mode === 'stack') { stackTo(i); return; }
    if (S.active === i && S.state === 'hover') return;
    S.active = i;
    setState('hover');
    setTargets(panels.map(function (_, j) { return j === i ? EXPANDED : 1; }), MOTION.hover);
    panels.forEach(function (p, j) { setRate(p, j === i ? 1 : 0); });
    applyClasses();
    kick();
  }
  function idle(cfg) {
    setState('idle');
    if (G.mode === 'stack') {
      if (S.active < 0) S.active = clamp(Math.round(stackPos.t), 0, N - 1);
      panels.forEach(function (p, j) { setRate(p, j === S.active ? 1 : 0); });
    } else {
      S.active = -1;
      setTargets(IDLE, cfg || MOTION.hover);
      panels.forEach(function (p) { setRate(p, 0); });
    }
    applyClasses();
    kick();
  }

  /* mobile: geser ke kartu i */
  function stackTo(i) {
    i = clamp(i, 0, N - 1);
    stackPos.t = i;
    if (S.active !== i) {
      S.active = i;
      if (S.state !== 'page') panels.forEach(function (p, j) { setRate(p, j === i ? 1 : 0); });
      applyClasses();
    }
    kick();
  }

  /* ---------------------------------------------------------------------- */
  /* Panel interaction                                                      */
  /* ---------------------------------------------------------------------- */
  var intentT = 0, leaveT = 0, drag = null;

  function bindPanels() {
    panels.forEach(function (p) {
      p.el.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || G.mode !== 'x') return;
        clearTimeout(leaveT); clearTimeout(intentT);
        intentT = setTimeout(function () { activate(p.i); }, MOTION.hoverIntent || 45);
      });
      p.el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || S.active !== p.i || G.mode !== 'x') return;
        var r = p.el.getBoundingClientRect();
        p.el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        p.el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
      p.play.addEventListener('focus', function () {
        if (S.pointer !== 'keyboard') return;
        clearTimeout(leaveT);
        activate(p.i);
      });
      p.el.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;
        if (!S.ready || S.suppressClick) { e.preventDefault(); return; }
        if (S.route !== 'home') return;
        var isPlay = !!link.closest('.panel__play');
        if (G.mode === 'stack') {
          if (p.i !== S.active) { e.preventDefault(); stackTo(p.i); return; }
        } else if (S.pointer !== 'mouse' && !isPlay && S.active !== p.i) {
          // layar sentuh (landscape): tap pertama membuka frame, play = langsung ke halaman
          e.preventDefault();
          activate(p.i);
          return;
        }
        Track.event('frame_click', { frame: p.key.toUpperCase(), target: link.getAttribute('href'), via: isPlay ? 'play' : 'frame' });
      });
    });

    track.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse' || G.mode !== 'x') return;
      clearTimeout(intentT);
      leaveT = setTimeout(function () { if (S.route === 'home' && S.ready) idle(); }, MOTION.leaveDelay || 200);
    });
    track.addEventListener('focusout', function (e) {
      if (track.contains(e.relatedTarget) || S.pointer !== 'keyboard' || G.mode !== 'x') return;
      if (S.route === 'home' && S.ready && !track.matches(':hover')) idle();
    });

    /* swipe kartu (mobile) */
    track.addEventListener('pointerdown', function (e) {
      if (G.mode !== 'stack' || S.route !== 'home' || !S.ready) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: stackPos.x, moved: false, lx: e.clientX, lt: performance.now(), vx: 0 };
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.moved = true;
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
      }
      var now = performance.now();
      drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
      drag.lx = e.clientX; drag.lt = now;
      var pos = drag.p0 - dx / (G.cw * 0.62);
      if (pos < 0) pos *= 0.35;
      if (pos > N - 1) pos = N - 1 + (pos - (N - 1)) * 0.35;
      stackPos.x = pos; stackPos.t = pos; stackPos.v = 0;
      var near = clamp(Math.round(pos), 0, N - 1);
      if (near !== S.active) { S.active = near; panels.forEach(function (q, j) { setRate(q, j === near ? 1 : 0); }); applyClasses(); }
      kick();
    });
    function endDrag() {
      if (!drag) return;
      if (drag.moved) {
        var proj = drag.vx * 260 / (G.cw * 0.62);
        stackTo(Math.round(stackPos.x - proj));
        S.suppressClick = true;
        setTimeout(function () { S.suppressClick = false; }, 80);
        Track.event('stack_swipe', { to: panels[S.active].key.toUpperCase() });
      }
      drag = null;
      kick();
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    stackDots.forEach(function (b) {
      b.addEventListener('click', function () { stackTo(+b.dataset.i); });
    });

    document.addEventListener('pointerdown', function (e) {
      S.pointer = e.pointerType || 'mouse';
      if (S.introRunning) skipIntro();
      if (G.mode === 'x' && S.pointer !== 'mouse' && S.route === 'home' && S.ready && S.active >= 0 && !track.contains(e.target)) idle();
    }, true);

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !tiltEnabled()) return;
      tiltX.t = clamp(e.clientX / G.vw * 2 - 1, -1, 1);
      tiltY.t = clamp(e.clientY / G.vh * 2 - 1, -1, 1);
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { tiltX.t = 0; tiltY.t = 0; kick(); });
  }

  /* ---------------------------------------------------------------------- */
  /* Router                                                                 */
  /* ---------------------------------------------------------------------- */
  var pageT = 0, zoomT = 0;

  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    var parts = h.split('/').filter(Boolean);
    var route = parts[0] || 'home';
    if (!ROUTES[route]) route = 'home';
    return { route: route, tab: route === 'home' ? null : (parts[1] || null) };
  }

  function go(r, force) {
    var prev = S.route;
    if (!force && prev === r.route && S.tab === r.tab) return;
    S.route = r.route; S.tab = r.tab;
    setSidebarActive(r.route);
    closeDrawer();
    var meta = ROUTES[r.route] || {};
    document.title = r.route === 'home'
      ? 'XIONCO Business — #1 Furniture Manufacturer in Indonesia'
      : (meta.title || meta.label) + ' — XIONCO Business';
    if (r.route === 'home') toHome(prev);
    else if (prev === r.route) swapTab(r.route, r.tab);
    else toPage(r.route, prev, r.tab);
    Track.event('page_view', { page: r.route, tab: r.tab || undefined });
  }

  function onHash() {
    if (S.introRunning) skipIntro();
    if (!S.ready) return;
    go(parse());
  }

  function toPage(route, prev, tab) {
    var meta = ROUTES[route];
    clearTimeout(pageT); clearTimeout(intentT); clearTimeout(leaveT);
    var fromPage = prev && prev !== 'home';
    page.classList.remove('is-visible');
    app.classList.add('is-page');
    setState('page');
    renderSubnav(route, tab);
    renderCrumbs(route, tab);
    var idx = typeof meta.panel === 'number' ? meta.panel : -1;
    clearTimeout(zoomT);
    if (idx >= 0) {
      S.active = idx;
      setZoom(panels[idx], pageZoom());               // gambar ulang tajam sebelum di-zoom
      zoomT = setTimeout(function () {                 // frame lain kembali ke resolusi normal
        panels.forEach(function (p, j) { if (j !== idx) setZoom(p, 1); });
      }, 1300);
      track.classList.remove('is-hidden');
      page.classList.remove('is-neutral');
      if (G.mode === 'stack') { stackPos.t = idx; expand.set(MOTION.enter); expand.t = 1; }
      else setTargets(panels.map(function (_, j) { return j === idx ? 8 : 0; }), MOTION.enter);
      panels.forEach(function (p, j) { setRate(p, j === idx ? 0.45 : 0); });
    } else {
      S.active = -1;
      if (G.mode === 'stack') expand.t = 0;
      else setTargets([2, 2, 2, 2], MOTION.enter);
      panels.forEach(function (p) { setRate(p, 0); });
      track.classList.add('is-hidden');
      page.classList.add('is-neutral');
      var use = pageGlyph.querySelector('use');
      if (use) use.setAttribute('href', '#i-' + (meta.icon || 'material'));
    }
    applyClasses();
    kick();
    pageT = setTimeout(function () {
      renderPage(route, tab);
      page.classList.add('is-visible');
    }, fromPage ? 430 : 600);
  }

  function swapTab(route, tab) {
    renderSubnav(route, tab);
    renderCrumbs(route, tab);
    clearTimeout(pageT);
    page.classList.remove('is-visible');
    pageT = setTimeout(function () { renderPage(route, tab); page.classList.add('is-visible'); }, 260);
  }

  function toHome(prev) {
    clearTimeout(pageT);
    page.classList.remove('is-visible');
    app.classList.remove('is-page');
    track.classList.remove('is-hidden');
    var fromPage = prev && prev !== 'home';
    pageT = setTimeout(function () {
      page.classList.remove('is-neutral');
      if (G.mode === 'stack') {
        expand.t = 0;
        if (S.active < 0) S.active = clamp(Math.round(stackPos.t), 0, N - 1);
      }
      idle(fromPage ? MOTION.enter : MOTION.hover);
      subnavInner.innerHTML = ''; subnavInner.dataset.route = '';
    }, fromPage ? 240 : 0);
    clearTimeout(zoomT);
    zoomT = setTimeout(function () {                   // setelah frame kembali kecil → resolusi normal
      if (S.route === 'home') panels.forEach(function (p) { setZoom(p, 1); });
    }, 1600);
  }

  function tabLabel(meta, tab) {
    var tabs = meta.tabs || [];
    for (var i = 0; i < tabs.length; i++) if (slug(tabs[i]) === tab) return tabs[i];
    return tab ? tab.replace(/-/g, ' ') : null;
  }

  function renderSubnav(route, tab) {
    var meta = ROUTES[route] || {};
    var tabs = meta.tabs || [];
    var active = tab || (tabs[0] ? slug(tabs[0]) : '');
    if (subnavInner.dataset.route !== route) {
      subnavInner.innerHTML = tabs.map(function (t, i) {
        var s = slug(t);
        return '<a class="subnav__tab" style="--i:' + i + '" data-tab="' + s + '" href="#/' + route + '/' + s + '">' + esc(t) + '</a>';
      }).join('');
      subnavInner.dataset.route = route;
    }
    $$('.subnav__tab', subnavInner).forEach(function (a) {
      var on = a.dataset.tab === active;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function renderCrumbs(route, tab) {
    var meta = ROUTES[route] || {};
    var tl = tabLabel(meta, tab);
    crumbs.innerHTML = '<a href="#/">Home</a><i>›</i>' + (tl
      ? '<a href="#/' + route + '">' + esc(meta.title) + '</a><i>›</i><span aria-current="page">' + esc(tl) + '</span>'
      : '<span aria-current="page">' + esc(meta.title) + '</span>');
  }

  function renderPage(route, tab) {
    var meta = ROUTES[route] || {};
    var tl = tabLabel(meta, tab);
    var mods = (meta.modules || []).map(function (m, i) {
      return '<li><span>' + pad(i + 1) + '</span>' + esc(m) + '</li>';
    }).join('');
    pageBody.innerHTML =
      '<div class="page__eyebrow" style="--bi:0"><span>' + esc(meta.index) + ' — ' + esc(meta.label) + '</span><span class="chip">In development</span></div>' +
      '<h1 class="page__title" style="--bi:1">' + esc(meta.title) + '</h1>' +
      '<p class="page__lede" style="--bi:2">' + esc(meta.lede) + '</p>' +
      '<ol class="page__modules" style="--bi:3">' + mods + '</ol>' +
      '<div class="page__actions" style="--bi:4">' +
        '<a class="btn" href="#/"><svg><use href="#i-back"/></svg>Home</a>' +
        '<span class="page__note">' + (tl ? 'Kategori: ' + esc(tl) : 'Modul halaman ini dibangun pada tahap berikutnya.') + '</span>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Sidebar                                                                */
  /* ---------------------------------------------------------------------- */
  function setSidebarActive(route) {
    $$('.sidebar__item', sidebar).forEach(function (li) {
      var on = li.dataset.route === route;
      li.classList.toggle('is-active', on);
      var a = $('a', li);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function bindSidebar() {
    var t = 0;
    sidebar.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || G.mobile) return;
      clearTimeout(t);
      t = setTimeout(function () { sidebar.classList.add('is-open'); }, 70);
    });
    sidebar.addEventListener('pointerleave', function () {
      if (G.mobile) return;
      clearTimeout(t);
      t = setTimeout(function () { sidebar.classList.remove('is-open'); }, 260);
      sbHover.classList.remove('is-on');
    });
    sidebar.addEventListener('focusin', function () { if (!G.mobile) sidebar.classList.add('is-open'); });
    sidebar.addEventListener('focusout', function (e) {
      if (!sidebar.contains(e.relatedTarget)) sidebar.classList.remove('is-open');
    });
    $$('.sidebar__item', sidebar).forEach(function (li) {
      li.addEventListener('pointerenter', function () {
        var top = li.offsetTop + li.parentElement.offsetTop;
        sbHover.style.transform = 'translateY(' + top + 'px)';
        sbHover.style.height = li.offsetHeight + 'px';
        sbHover.classList.add('is-on');
      });
      $('a', li).addEventListener('click', function () {
        Track.event('nav_click', { target: li.dataset.route, source: 'sidebar' });
        if (G.mobile) closeDrawer();
        if (li.dataset.route === S.route && S.route !== 'home' && S.tab) location.hash = '#/' + S.route;
      });
    });
    menuBtn.addEventListener('click', function () {
      var open = !app.classList.contains('is-drawer');
      app.classList.toggle('is-drawer', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    });
    drawerScrim.addEventListener('click', closeDrawer);
  }
  function closeDrawer() {
    app.classList.remove('is-drawer');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Buka menu');
  }

  /* ---------------------------------------------------------------------- */
  /* Intro                                                                  */
  /* ---------------------------------------------------------------------- */
  var introTimers = [];
  function later(ms, fn) { introTimers.push(setTimeout(fn, ms)); }

  function runIntro(fast) {
    introTimers.forEach(clearTimeout); introTimers = [];
    S.introRunning = true; S.ready = false; S.active = -1;
    app.classList.add('no-anim');
    app.dataset.intro = '0';
    setState('boot');
    clearTimeout(pageT);
    app.classList.remove('is-page');
    setSidebarActive('home');
    track.classList.remove('is-hidden');
    page.classList.remove('is-visible', 'is-neutral');
    setTargets([2, 2, 2, 2], MOTION.hover);
    clearTimeout(zoomT);
    panels.forEach(function (p) { p.w.snap(); setRate(p, 0); p._k = ''; setZoom(p, 1); });
    stackPos.snap(STACK_START); expand.snap(0);
    applyClasses();
    layout();
    railX.snap(0); railW.snap(G.tw);
    drawRail();
    void app.offsetWidth;
    app.classList.remove('no-anim');

    var T = fast ? { a: 40, b: 220, c: 420, d: 1300 } : { a: 140, b: 920, c: 1420, d: 2800 };
    later(T.a, function () { app.dataset.intro = '1'; });
    later(T.b, function () { app.dataset.intro = '2'; });
    later(T.c, function () { S.ready = true; afterIntro(); });
    later(T.d, function () { app.dataset.intro = 'done'; S.introRunning = false; });
  }

  function afterIntro() {
    var r = parse();
    S.route = 'home'; S.tab = null;
    if (G.mode === 'stack') S.active = STACK_START;
    if (r.route === 'home') {
      setSidebarActive('home');
      idle(MOTION.enter);
    } else {
      go(r, true);
    }
  }

  function skipIntro() {
    if (!S.introRunning) return;
    introTimers.forEach(clearTimeout); introTimers = [];
    app.classList.add('no-anim');
    app.dataset.intro = 'done';
    S.introRunning = false;
    if (!S.ready) { S.ready = true; afterIntro(); }
    void app.offsetWidth;
    requestAnimationFrame(function () { app.classList.remove('no-anim'); });
  }

  function replayIntro() {
    if (S.route !== 'home') history.replaceState(null, '', '#/');
    S.route = null;
    runIntro(false);
  }

  /* ---------------------------------------------------------------------- */
  /* Keyboard                                                               */
  /* ---------------------------------------------------------------------- */
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') S.pointer = 'keyboard';
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable]')) return;
      if (S.introRunning) skipIntro();
      var k = e.key;
      if (k === 'Escape' && app.classList.contains('is-drawer')) { closeDrawer(); menuBtn.focus(); return; }
      if (S.route === 'home' && S.ready) {
        if (k === 'ArrowRight' || k === 'ArrowLeft') {
          e.preventDefault();
          var dir = k === 'ArrowRight' ? 1 : -1;
          var n = S.active < 0 ? (dir > 0 ? 0 : N - 1) : clamp(S.active + dir, 0, N - 1);
          S.pointer = 'keyboard';
          activate(n);
          panels[n].play.focus({ preventScroll: true });
          return;
        }
        if (/^[1-4]$/.test(k)) {
          var j = +k - 1;
          S.pointer = 'keyboard';
          activate(j);
          panels[j].play.focus({ preventScroll: true });
          return;
        }
        if (k === 'Escape' && G.mode === 'x') {
          if (document.activeElement && track.contains(document.activeElement)) document.activeElement.blur();
          idle();
          return;
        }
      } else if (k === 'Escape' && S.route && S.route !== 'home') {
        location.hash = '#/';
        return;
      }
      if (CFG.dev) {
        if (k === 'g' || k === 'G') toggleGrid();
        else if (k === 'l' || k === 'L') window.open('ledger.html', '_blank', 'noopener');
        else if (k === 'r' || k === 'R') replayIntro();
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Dev tools                                                              */
  /* ---------------------------------------------------------------------- */
  function buildGrid() {
    var html = '';
    for (var i = 0; i < 8; i++) html += '<span style="left:' + (i * G.u + 4) + 'px;top:-13px">' + (i + 1) + '</span>';
    for (var j = 0; j < 4; j++) html += '<span style="left:-12px;top:' + (j * G.u + 4) + 'px">' + (j + 1) + '</span>';
    grid.innerHTML = html;
  }
  function toggleGrid() {
    S.devGrid = !S.devGrid;
    app.classList.toggle('dev-grid', S.devGrid);
    $('#devGrid').classList.toggle('is-on', S.devGrid);
    if (S.devGrid) { buildGrid(); drawHud(); }
  }
  function drawHud() {
    var utm = Track.utm();
    var w = G.mode === 'x'
      ? panels.map(function (p) { return p.key.toUpperCase() + ' ' + p.w.x.toFixed(2); }).join('  ')
      : 'kartu ' + stackPos.x.toFixed(2) + ' / ' + (N - 1);
    hud.textContent =
      'MODE    ' + (G.mode === 'x' ? 'accordion 8 × 4' : 'kartu (mobile)') + '\n' +
      'BLOCK   1u = ' + G.u + 'px   (guideline 120px @1920)\n' +
      (G.mode === 'x' ? 'FRAME   ' + G.tw + ' × ' + G.th + 'px\n' : 'KARTU   ' + Math.round(G.cw) + ' × ' + Math.round(G.ch) + 'px\n') +
      'ORB     Ø ' + Math.round(G.u) + 'px · play Ø ' + G.pd + 'px\n' +
      'STATE   ' + S.state + (S.active >= 0 ? ' · ' + panels[S.active].key.toUpperCase() : '') + '\n' +
      'WEIGHT  ' + w + '\n' +
      'UTM     ' + (utm.utm_source ? utm.utm_source + ' / ' + (utm.utm_medium || '-') + ' / ' + (utm.utm_campaign || '-') : '—');
    panels.forEach(function (p) {
      p.devtag.textContent = p.key.toUpperCase() + (G.mode === 'x' ? ' ' + p.w.x.toFixed(2) : '') + '\n' + p.mediaKind;
    });
  }
  function bindDev() {
    if (!CFG.dev) return;
    $('#devdock').hidden = false;
    $('#devGrid').addEventListener('click', toggleGrid);
    $('#devIntro').addEventListener('click', replayIntro);
  }

  /* ---------------------------------------------------------------------- */
  /* Init                                                                   */
  /* ---------------------------------------------------------------------- */
  function init() {
    splitTitles();
    splitBrand();
    measure();
    resizeScenes();
    bindPanels();
    bindSidebar();
    bindKeys();
    bindDev();
    window.addEventListener('hashchange', onHash);

    var rzT = 0;
    window.addEventListener('resize', function () {
      var modeChanged = measure();
      if (modeChanged && S.ready && S.route === 'home') {
        if (G.mode === 'stack') { S.active = clamp(S.active < 0 ? STACK_START : S.active, 0, N - 1); stackPos.snap(S.active); }
        idle();
      }
      layout();
      drawRail();
      kick();
      clearTimeout(rzT);
      rzT = setTimeout(resizeScenes, modeChanged ? 0 : 140);
    });
    document.addEventListener('visibilitychange', function () {
      panels.forEach(function (p) { if (p.video && document.hidden) p.video.pause(); });
      if (!document.hidden) kick();
    });

    var fast = REDUCED || !(CFG.intro && CFG.intro.enabled) || !!store('session', 'xc_intro');
    store('session', 'xc_intro', '1');
    var start = function () { runIntro(fast); };
    var fontsReady = document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })])
      : Promise.resolve();
    fontsReady.then(start);

    loadAssets();
  }

  init();
})();
