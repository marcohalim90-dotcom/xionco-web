/* ==========================================================================
   XIONCO v2 — Interaction engine
   GSAP + ScrollTrigger + Lenis (CDN). Tanpa library pun konten tetap tampil.
   ========================================================================== */
(function () {
  'use strict';

  var XV = window.XV;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var html = document.documentElement;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var HAS_GSAP = !!(G && ST);
  var ANIM = HAS_GSAP && !REDUCED;
  var rupiah = function (n) { return 'IDR ' + Math.round(n).toLocaleString('id-ID'); };
  // src(path, w): pakai thumbnail WordPress terkecil yang >= w bila tersedia, selain itu file asli
  var src = function (p, w) {
    var s = w && XV.SIZES && XV.SIZES[p];
    var ok = s ? s.filter(function (v) { return v >= w; }) : [];
    if (!ok.length) return XV.IMG + p;
    var v = Math.min.apply(null, ok);
    return XV.IMG + p.replace(/\.(png|jpe?g|webp)$/i, '-' + v + 'x' + v + '.$1');
  };
  var wa = function (text) { return 'https://wa.me/' + XV.WA + '?text=' + encodeURIComponent(text); };
  var byId = {};
  XV.PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  if (HAS_GSAP) G.registerPlugin(ST);
  if (ANIM) html.classList.add('anim');
  if (REDUCED) html.classList.add('reduced');

  /* ======================================================================
     Static content
     ====================================================================== */
  $$('.logo-path').forEach(function (p) { p.setAttribute('d', XV.LOGO); });
  $$('[data-wa]').forEach(function (a) { a.href = wa(a.dataset.wa); });

  // marquee klien
  $$('[data-marquee] .marquee__track').forEach(function (t) {
    var unit = XV.CLIENTS.map(function (c) { return '<span>' + c + '</span><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><path d="M35 35 65 65M65 35 35 65"/></svg>'; }).join('');
    t.innerHTML = unit + unit + unit + unit;
  });

  // koleksi
  var track = $('#track'), tabsEl = $('#tabs');
  function priceHTML(p) {
    if (!p.price) return 'Tanya harga';
    return (p.was ? '<s>' + rupiah(p.was) + '</s>' : '') + (p.from ? 'mulai ' : '') + rupiah(p.price);
  }
  function cardHTML(p, eager) {
    var badge = p.was ? '<span class="card__badge">−' + Math.round((1 - p.price / p.was) * 100) + '%</span>' : (p.studio ? '<span class="card__studio">Custom Studio</span>' : '');
    var addBtn = p.price
      ? '<button class="card__add" type="button" data-add="' + p.id + '" aria-label="Tambah ' + p.name + ' ke keranjang" data-cursor="Tambah"><svg><use href="#i-plus"/></svg></button>'
      : '<a class="card__add" href="' + wa('Halo XIONCO, saya ingin tahu harga ' + p.name + ' (' + p.type + ').') + '" target="_blank" rel="noopener" aria-label="Tanya harga ' + p.name + '" data-cursor="Tanya"><svg><use href="#i-wa"/></svg></a>';
    return '<article class="card' + (p.bg === 'dark' ? ' card--dark' : '') + '" data-id="' + p.id + '" data-cat="' + p.cat + '">' +
      '<div class="card__media">' + badge +
        '<img src="' + src(p.img, 768) + '" alt="' + p.name + ' — ' + p.type + '"' + (eager ? '' : ' loading="lazy"') + ' decoding="async">' +
        '<button class="card__open" type="button" data-quick="' + p.id + '" data-cursor="Lihat" aria-label="Lihat ' + p.name + '"></button>' + addBtn +
      '</div>' +
      '<div class="card__info"><h3 class="card__name">' + p.name + '</h3><p class="card__type">' + p.type + '</p><p class="card__price">' + priceHTML(p) + '</p></div>' +
    '</article>';
  }
  var count = 0;
  track.innerHTML = XV.CATEGORIES.map(function (c, ci) {
    var items = XV.PRODUCTS.filter(function (p) { return p.cat === c.id; });
    var out = '<div class="group" data-group="' + c.id + '"><span class="mono group__n">' + String(ci + 1).padStart(2, '0') + ' / ' + String(XV.CATEGORIES.length).padStart(2, '0') + '</span>' +
      '<div><h3 class="group__title">' + c.label.replace(' & ', ' &amp; <br>') + '</h3><p class="mono group__note">' + c.note + ' · ' + items.length + '</p></div></div>';
    out += items.map(function (p) { return cardHTML(p, count++ < 6); }).join('');
    return out;
  }).join('');
  tabsEl.innerHTML = XV.CATEGORIES.map(function (c, i) {
    var n = XV.PRODUCTS.filter(function (p) { return p.cat === c.id; }).length;
    return '<button class="tab' + (i === 0 ? ' is-on' : '') + '" type="button" role="tab" data-tab="' + c.id + '">' + c.label + '<sup>' + n + '</sup></button>';
  }).join('');
  $('#prodCount').textContent = XV.PRODUCTS.length + ' produk · harga xionco.shop';

  // museboard — artboard proyek berisi teks, jadi tampil utuh (1:1), ritme dari offset kolom
  var cols = [[], [], []];
  XV.MUSE.forEach(function (m, i) { cols[i % 3].push({ m: m }); });
  $('#muse').innerHTML = cols.map(function (col, ci) {
    return '<div class="muse__col" data-col="' + ci + '">' + col.map(function (o) {
      return '<figure class="muse__item" data-cursor="Inspirasi"><img src="' + src(o.m.img, 1024) + '" alt="' + o.m.title + '" loading="lazy" decoding="async"><figcaption><b>' + o.m.title + '</b><span class="mono">' + o.m.note + '</span></figcaption></figure>';
    }).join('') + '</div>';
  }).join('');

  // layanan & klien
  $('#services').innerHTML = XV.SERVICES.map(function (s) {
    return '<li class="service" data-img="' + src(s.img, 768) + '" data-cursor="Konsultasi"><span class="mono">' + s.n + '</span><h3>' + s.title + '</h3><p>' + s.note + '</p><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></li>';
  }).join('');
  $('#clients').innerHTML = XV.CLIENTS.map(function (c) { return '<li>' + c + '</li>'; }).join('');

  // langkah pabrik
  $('#steps').innerHTML = XV.FACTORIES.map(function (f, i) {
    return '<li data-step="' + i + '"' + (i === 0 ? ' class="is-on"' : '') + '><span class="mono n">' + f.n + '</span><div><span class="place">' + f.place + '</span><span class="mono role">' + f.role + '</span></div><p class="text">' + f.text + '</p></li>';
  }).join('');

  /* ======================================================================
     Smooth scroll
     ====================================================================== */
  var lenis = null;
  if (window.Lenis && !REDUCED) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, touchMultiplier: 1.3 });
    if (HAS_GSAP) {
      lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function scrollToEl(target) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
  }
  function lockScroll(on) {
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
    document.body.style.overflow = on ? 'hidden' : '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-link]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    e.preventDefault();
    closeMenu();
    if (a.hasAttribute('data-close')) closeAll();
    scrollToEl(href === '#top' ? document.body : href);
  });

  /* ======================================================================
     Utilities: split words, toast
     ====================================================================== */
  function splitWords(el, cls) {
    var out = [];
    (function walk(node, parent) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = cls;
            if (cls === 'wm') { var i = document.createElement('span'); i.className = 'wi'; i.textContent = part; s.appendChild(i); out.push(i); }
            else { s.textContent = part; out.push(s); }
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n, n);
        }
      });
    })(el, el);
    return out;
  }
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    toastEl.innerHTML = '<i></i>' + msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ======================================================================
     Cursor & magnetic
     ====================================================================== */
  var cursor = $('#cursor'), cursorLabel = $('#cursorLabel');
  var mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  if (FINE && !REDUCED) {
    html.classList.add('has-cursor');
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor);
    var rx = mouse.x, ry = mouse.y;
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    (function loop() {
      rx = lerp(rx, mouse.x, .18); ry = lerp(ry, mouse.y, .18);
      dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, label, select, .swatch');
      cursor.classList.toggle('is-hover', !!t);
      var label = t && t.getAttribute('data-cursor');
      cursor.classList.toggle('is-label', !!label);
      if (label) cursorLabel.textContent = label;
    });
    document.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.style.opacity = '0'; });
    document.documentElement.addEventListener('mouseenter', function () { cursor.style.opacity = '1'; });

    // magnetic
    if (HAS_GSAP) {
      $$('.magnetic').forEach(function (el) {
        var xTo = G.quickTo(el, 'x', { duration: .6, ease: 'power3.out' });
        var yTo = G.quickTo(el, 'y', { duration: .6, ease: 'power3.out' });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * .28);
          yTo((e.clientY - (r.top + r.height / 2)) * .38);
        });
        el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
    }
  }

  /* ======================================================================
     Nav, menu, dock, HUD, progress
     ====================================================================== */
  var nav = $('#nav'), burger = $('#burger'), dockInd = $('#dockInd');
  var lastY = 0;
  function onScroll(y) {
    nav.classList.toggle('is-scrolled', y > 40);
    if (!html.classList.contains('menu-open')) {
      if (y > lastY + 4 && y > 320) nav.classList.add('is-hidden');
      else if (y < lastY - 4) nav.classList.remove('is-hidden');
    }
    lastY = y;
    var max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
  }
  if (lenis) lenis.on('scroll', function (l) { onScroll(l.scroll); });
  else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });

  function closeMenu() {
    if (!html.classList.contains('menu-open')) return;
    html.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    $('#menu').setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }
  burger.addEventListener('click', function () {
    var open = !html.classList.contains('menu-open');
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    $('#menu').setAttribute('aria-hidden', String(!open));
    nav.classList.remove('is-hidden');
    lockScroll(open);
  });

  var sections = $$('[data-theme]');
  var dockMap = { top: 0, koleksi: 1, studio: 2, bisnis: 3 };
  $('#hudTotal').textContent = '/ ' + String($$('[data-index]').length).padStart(2, '0');
  function setSection(sec) {
    nav.classList.toggle('is-light', sec.dataset.theme === 'light');
    if (sec.dataset.index) {
      $('#hudIndex').textContent = sec.dataset.index;
      $('#hudName').textContent = sec.dataset.name;
    }
    $('#hud').classList.toggle('is-hidden', sec.id === 'top');
    var id = sec.id;
    $$('.nav__links a').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + id); });
    var di = dockMap[id];
    if (di != null) {
      dockInd.style.transform = 'translateX(' + (di * 100) + '%)';
      $$('#dock [data-dock]').forEach(function (a) { a.classList.toggle('is-on', a.dataset.dock === id); });
    }
  }
  function sectionTriggers() {
    if (HAS_GSAP) {
      sections.forEach(function (sec) {
        ST.create({ trigger: sec, start: 'top top+=40', end: 'bottom top+=40', onToggle: function (s) { if (s.isActive) setSection(sec); } });
      });
    } else {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) setSection(en.target); }); }, { rootMargin: '-40px 0px -90% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }
  setSection(sections[0]);

  /* ======================================================================
     HERO — "Aperture"
     Ruang pamer dilihat lewat huruf XIONCO (clip-path dari path logo asli).
     Saat di-scroll, kamera masuk lewat huruf I → komposisi editorial.
     ====================================================================== */
  var hero = $('#top'), heroPin = $('#heroPin'), heroScene = $('#heroScene'), heroMedia = $('#heroMedia');
  var heroLit = $('.hero__img--lit'), heroBeam = $('.hero__beam'), heroGlow = $('#heroGlow'), heroShade = $('#heroShade');
  var heroFrame = $('#heroFrame'), outlineSvg = $('#heroOutline'), outlinePath = $('#heroOutlinePath');
  var hotspots = $$('.hotspot', hero), hotspot = $('.hotspot--main', hero);
  var navLogo = $('.nav__logo');

  // --- cahaya mengikuti kursor (koordinat relatif terhadap gambar) ---
  var light = { tx: .5, ty: .56, x: .5, y: .56, r: 20, tr: 20, last: -1e9, visible: true, lock: 0 };
  heroPin.addEventListener('pointermove', function (e) {
    var r = heroMedia.getBoundingClientRect();
    light.tx = (e.clientX - r.left) / r.width;
    light.ty = (e.clientY - r.top) / r.height;
    light.last = performance.now();
  });
  heroPin.addEventListener('pointerdown', function () { light.tr = 32; });
  heroPin.addEventListener('pointerup', function () { light.tr = 20; });
  heroPin.addEventListener('pointerleave', function () { light.tr = 20; });
  new IntersectionObserver(function (es) { light.visible = es[0].isIntersecting; }, { threshold: 0 }).observe(heroPin);
  (function heroLoop(t) {
    if (light.visible) {
      var now = performance.now();
      if (now > light.lock && (now - light.last > 2600 || !FINE)) {
        var s = t / 1000;
        light.tx = .52 + Math.sin(s * .32) * .2;
        light.ty = .56 + Math.sin(s * .51 + 1) * .035;
      }
      light.x = lerp(light.x, light.tx, .07);
      light.y = lerp(light.y, light.ty, .07);
      light.r = lerp(light.r, light.tr, .08);
      heroLit.style.setProperty('--lx', (light.x * 100).toFixed(2) + '%');
      heroLit.style.setProperty('--ly', (light.y * 100).toFixed(2) + '%');
      heroLit.style.setProperty('--lr', light.r.toFixed(2) + '%');
      var mr = heroMedia.getBoundingClientRect(), pr = heroPin.getBoundingClientRect();
      var gx = mr.left - pr.left + light.x * mr.width, gy = mr.top - pr.top + light.y * mr.height;
      heroBeam.style.setProperty('--bx', gx.toFixed(1) + 'px');
      heroGlow.style.setProperty('--gx', gx.toFixed(1) + 'px');
      heroGlow.style.setProperty('--gy', gy.toFixed(1) + 'px');
    }
    requestAnimationFrame(heroLoop);
  })(0);

  // --- geometri wordmark ---
  var LOGO_T = XV.LOGO.match(/[A-Za-z]|-?\d*\.?\d+/g);
  var IC = { x: 40.068, y: 13.986 };          // pusat huruf I (balok solid) dalam satuan logo
  var KMAX = 78;                               // perbesaran saat huruf I menutup layar
  // HP: wordmark dipecah dua baris (XIO / NCO) agar jendelanya cukup besar
  var R1 = { dx: 8.7, dy: 0 }, R2 = { dx: -102.9, dy: 34 };
  function buildLayout(split) {
    var out = [], cmd = '', n = 0, row = R1;
    for (var i = 0; i < LOGO_T.length; i++) {
      var tk = LOGO_T[i];
      if (tk.length === 1 && /[A-Za-z]/.test(tk)) { cmd = tk; n = 0; out.push(tk); continue; }
      var v = +tk, isY = cmd === 'V' || (cmd !== 'H' && n % 2 === 1);
      if (cmd === 'M' && n === 0) row = split && v > 95 ? R2 : R1;
      if (split) v += isY ? row.dy : row.dx;
      out.push({ v: v, y: isY });
      if (cmd !== 'H' && cmd !== 'V') n++;
    }
    return out;
  }
  var layout = [];
  function logoPath(s, tx, ty) {
    var out = new Array(layout.length);
    for (var i = 0; i < layout.length; i++) {
      var o = layout[i];
      out[i] = typeof o === 'string' ? o : (o.y ? o.v * s + ty : o.v * s + tx).toFixed(1);
    }
    return out.join(' ');
  }
  var geo = {};
  function measure() {
    var vw = heroPin.clientWidth, vh = heroPin.clientHeight, split = vw <= 760;
    layout = buildLayout(split);
    var bw = split ? 102.93 : 206, bh = split ? 61.8 : 27.65;
    var W = Math.min(vw * (split ? .84 : .92), vh * (split ? .46 : .32) * bw / bh);
    geo = { vw: vw, vh: vh, s0: W / bw, x0: (vw - W) / 2, icx: IC.x + (split ? R1.dx : 0), icy: IC.y };
    geo.y0 = vh * (split ? .45 : .5) - (split ? 31 : IC.y) * geo.s0;
    geo.px0 = geo.x0 + geo.icx * geo.s0;
    geo.py0 = geo.y0 + geo.icy * geo.s0;
  }
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var apT = -1;
  function aperture(t) {
    t = clamp(t, 0, 1);
    if (t === apT) return;
    apT = t;
    if (t >= 1) {
      heroScene.style.clipPath = 'none';
      outlineSvg.style.opacity = 0;
      return;
    }
    var e = smooth(t);
    var k = Math.pow(KMAX, Math.pow(t, 1.35));
    var s = geo.s0 * k;
    var px = lerp(geo.px0, geo.vw / 2, e), py = lerp(geo.py0, geo.vh / 2, e);
    var d = logoPath(s, px - geo.icx * s, py - geo.icy * s);
    heroScene.style.clipPath = 'path("' + d + '")';
    outlinePath.setAttribute('d', d);
    outlineSvg.style.opacity = clamp(1 - (t - .08) / .3, 0, 1);
  }

  // --- hotspot menempel di sofa ---
  function placeHotspots() {
    var pr = heroPin.getBoundingClientRect(), mr = heroMedia.getBoundingClientRect();
    hotspots.forEach(function (h) {
      var x = mr.left - pr.left + (+h.dataset.x) * mr.width, y = mr.top - pr.top + (+h.dataset.y) * mr.height;
      h.style.left = x + 'px';
      h.style.top = y + 'px';
      var flip = x + 250 > pr.width;
      h.style.alignItems = flip ? 'flex-end' : 'flex-start';
      h.style.transform = flip ? 'translate(calc(-100% + 7px), calc(-100% + 7px))' : 'translate(-7px, calc(-100% + 7px))';
      $('.hotspot__line', h).style.margin = flip ? '0 6.5px 0 0' : '0 0 0 6.5px';
    });
  }

  // --- urutan scroll ---
  var heroST = null, revealC = null, cOn = false, mediaScale = 1;
  function setC(on) {
    if (on === cOn || !revealC) return;
    cOn = on;
    if (on) { placeHotspots(); revealC.timeScale(1).play(); }
    else revealC.timeScale(1.8).reverse();
  }
  measure();
  if (ANIM) {
    aperture(0);
    G.set('.hero__title .ln__in', { yPercent: 112 });
    G.set('.hero__aside > *, #badgeCta', { opacity: 0, y: 26 });
    G.set(hotspots, { autoAlpha: 0 });
    G.set(heroMedia, { scale: .86 });
    revealC = G.timeline({ paused: true })
      .to('.hero__title .ln__in', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .1 }, 0)
      .to('.hero__aside > *, #badgeCta', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08 }, .25)
      .to(navLogo, { opacity: 1, duration: .8, ease: 'power2.out' }, .2)
      .to(hotspots, { autoAlpha: 1, duration: .5, stagger: .12 }, .5)
      .from('.hero__inner .hotspot__line, #top .hotspot__line', { scaleY: 0, duration: .8, ease: 'expo.out', stagger: .12 }, .5);
    G.set(navLogo, { opacity: 0 });
    heroST = ST.create({
      trigger: hero, start: 'top top', pin: heroPin, anticipatePin: 1,
      end: function () { return '+=' + Math.round(innerHeight * (innerWidth <= 760 ? 1.25 : 1.55)); },
      onRefresh: function () { measure(); apT = -1; },
      onUpdate: function (self) {
        var p = self.progress, t = clamp(p / .62, 0, 1);
        aperture(t);
        mediaScale = lerp(.86, 1, smooth(t));
        G.set(heroMedia, { scale: mediaScale });
        heroFrame.style.opacity = clamp(1 - p / .12, 0, 1);
        heroFrame.style.visibility = p > .13 ? 'hidden' : '';
        heroShade.style.opacity = clamp((p - .5) / .16, 0, 1);
        if (p > .64) setC(true); else if (p < .6) setC(false);
      }
    });
    // keluar: ruang naik perlahan saat section selesai
    G.to(heroScene, { yPercent: -18, ease: 'none', scrollTrigger: { trigger: hero, start: 'bottom bottom', end: 'bottom top', scrub: true } });
  } else {
    heroScene.style.clipPath = 'none';
    navLogo.style.opacity = 1;
  }
  $('#heroEnter').addEventListener('click', function () { if (heroST) scrollToY(heroST.end - innerHeight * .2); });
  window.addEventListener('resize', function () { measure(); apT = -1; if (heroST) aperture(clamp(heroST.progress / .62, 0, 1)); placeHotspots(); });
  placeHotspots();

  // badge CTA berputar; lebih cepat saat di-hover
  if (ANIM) {
    var spin = G.to('.badge-cta__ring', { rotation: 360, duration: 22, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    $('#badgeCta').addEventListener('pointerenter', function () { G.to(spin, { timeScale: 4, duration: .6 }); });
    $('#badgeCta').addEventListener('pointerleave', function () { G.to(spin, { timeScale: 1, duration: .9 }); });
  }

  /* ======================================================================
     Intro (preloader → wordmark)
     ====================================================================== */
  function preload(list, onProgress) {
    var done = 0;
    return Promise.all(list.map(function (u) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = im.onerror = function () { done++; onProgress(done / list.length); res(); };
        im.src = u;
      });
    }));
  }
  function startIntro() {
    if (!HAS_GSAP) { html.classList.add('is-ready'); hotspots.forEach(function (h) { h.style.opacity = 1; h.style.visibility = 'visible'; }); return; }
    var loader = $('#loader'), countEl = $('#loaderCount');
    var prog = { v: 0, target: 0 };
    document.body.classList.add('is-loading');
    var heroImg = $('.hero__img--base').currentSrc || $('.hero__img--base').src;
    var list = [heroImg].concat(XV.PRODUCTS.slice(0, 6).map(function (p) { return src(p.img, 768); }));
    var tl = G.timeline();
    if (REDUCED) {
      G.set(loader, { display: 'none' });
    } else {
      tl.to('.loader__ring', { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' })
        .to('.loader__x1', { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }, '-=.35')
        .to('.loader__x2', { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }, '-=.3');
    }
    G.ticker.add(function tick() {
      prog.v = lerp(prog.v, prog.target, .08);
      countEl.textContent = String(Math.round(prog.v * 100)).padStart(3, '0');
      if (prog.v > .995) G.ticker.remove(tick);
    });
    var minTime = new Promise(function (r) { setTimeout(r, REDUCED ? 0 : 1700); });
    var maxTime = new Promise(function (r) { setTimeout(r, 6000); });
    Promise.race([Promise.all([preload(list, function (p) { prog.target = p; }), minTime]), maxTime]).then(function () {
      prog.target = 1;
      G.delayedCall(REDUCED ? 0 : .35, revealSite);
    });
  }
  function revealSite() {
    var tl = G.timeline({ onComplete: function () { html.classList.add('is-ready'); document.body.classList.remove('is-loading'); ST.refresh(); } });
    if (!REDUCED) {
      tl.to('.loader__mark', { scale: .6, opacity: 0, duration: .6, ease: 'power3.in' })
        .to('.loader__meta', { opacity: 0, y: -10, duration: .4 }, '<')
        .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.15');
    } else {
      tl.set('#loader', { display: 'none' });
    }
    tl.from('.nav__links a, .nav__actions > *', { opacity: 0, y: -16, duration: 1, ease: 'expo.out', stagger: .04 }, '-=.5');
    var atTop = !heroST || heroST.progress < .05;
    if (ANIM && atTop) {
      // garis wordmark tergambar, lalu ruang menyala dari kiri ke kanan
      var len = outlinePath.getTotalLength();
      G.set(outlinePath, { strokeDasharray: len, strokeDashoffset: len });
      G.set(heroScene, { opacity: 0 });
      light.lock = performance.now() + 4200;
      light.x = light.tx = .14; light.y = light.ty = .55;
      tl.to(outlinePath, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, '-=.9')
        .to(heroScene, { opacity: 1, duration: 1.6, ease: 'power2.out' }, '-=1.2')
        .to(light, { tx: .86, duration: 2.6, ease: 'power1.inOut' }, '<')
        .from('.hf', { opacity: 0, y: 12, duration: 1, ease: 'expo.out', stagger: .08 }, '-=1.6')
        .set(outlinePath, { strokeDasharray: 'none' });
    } else if (cOn && revealC) {
      revealC.progress(1);
    }
  }
  startIntro();

  /* ======================================================================
     Scroll animations (dibuat SETELAH section yang di-pin agar posisi benar)
     ====================================================================== */
  function scrollAnims() {
    if (!ANIM) return;
    // judul section: kata naik dari bawah
    $$('.h2').forEach(function (h) {
      var words = splitWords(h, 'wm');
      G.from(words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 85%' } });
    });

    // manifesto: kata demi kata
    $$('[data-words]').forEach(function (p) {
      var words = splitWords(p, 'w');
      G.to(words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 78%', end: 'bottom 50%', scrub: true } });
    });
    $$('.pillar').forEach(function (el, i) {
      var line = document.createElement('i');
      line.className = 'pillar__line';
      el.appendChild(line);
      G.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: i * .08, scrollTrigger: { trigger: '.pillars', start: 'top 86%' } });
    });
    G.fromTo('.pillar__line', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.pillars', start: 'top 86%' } });

    // parallax gambar
    $$('[data-parallax]').forEach(function (fig) {
      var amt = parseFloat(fig.dataset.parallax);
      G.fromTo(fig.querySelector('img'), { yPercent: -amt - 8 }, { yPercent: amt - 8, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      G.from(fig, { clipPath: 'inset(18% 0 0 0)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
    });
    var quote = $('.band__quote');
    if (quote) {
      var qw = splitWords(quote, 'wm');
      G.from(qw, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: quote, start: 'top 85%' } });
    }

    // [data-reveal]
    $$('[data-reveal]').forEach(function (el) {
      G.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // museboard: kolom bergerak beda kecepatan
    var speeds = [-90, 70, -40];
    $$('.muse__col').forEach(function (c, i) {
      G.fromTo(c, { y: -speeds[i] }, { y: speeds[i], ease: 'none', scrollTrigger: { trigger: '#museboard', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.muse__item').forEach(function (it) {
      G.from(it, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 92%' } });
    });

    // benefits, layanan, klien
    G.from('.service', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '#services', start: 'top 85%' } });
    G.from('.benefit', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.benefits', start: 'top 88%' } });
    G.from('.clients li', { opacity: 0, x: -20, duration: .9, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: '.clients', start: 'top 85%' } });
    G.from('.footer__logo svg', { yPercent: 60, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '#footLogo', start: 'top 92%' } });
  }

  /* ======================================================================
     Marquee — kecepatan & kemiringan mengikuti scroll
     ====================================================================== */
  (function marquees() {
    var rows = $$('[data-marquee]').map(function (m) {
      return { el: $('.marquee__track', m), dir: parseFloat(m.dataset.marquee), x: 0, w: 0 };
    });
    function measure() { rows.forEach(function (r) { r.w = r.el.scrollWidth / 4; }); }
    measure();
    window.addEventListener('resize', measure);
    var skew = 0, boost = 0, lastScroll = window.scrollY, last = performance.now();
    (function loop(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      var y = lenis ? lenis.scroll : window.scrollY;
      var v = lenis ? lenis.velocity : (y - lastScroll) / Math.max(dt, .001) / 60;
      lastScroll = y;
      boost = lerp(boost, Math.abs(v) * 14, .08);
      skew = lerp(skew, clamp(v * .35, -9, 9), .1);
      rows.forEach(function (r) {
        if (!r.w) return;
        r.x -= (REDUCED ? 0 : (38 + boost)) * dt * r.dir;
        if (r.x <= -r.w) r.x += r.w;
        if (r.x > 0) r.x -= r.w;
        r.el.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0) skewX(' + (-skew * r.dir).toFixed(2) + 'deg)';
      });
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ======================================================================
     KOLEKSI — galeri horizontal
     ====================================================================== */
  var viewport = $('#collectionViewport');
  var groups = $$('.group', track), tabs = $$('.tab', tabsEl);
  var hScroll = null;
  function setTab(id) { tabs.forEach(function (t) { t.classList.toggle('is-on', t.dataset.tab === id); }); }
  function activeByX(x) {
    var cur = groups[0].dataset.group;
    groups.forEach(function (g) { if (g.offsetLeft - x < viewport.clientWidth * .45) cur = g.dataset.group; });
    setTab(cur);
  }
  if (HAS_GSAP) {
    var mm = G.matchMedia();
    mm.add('(min-width: 761px)', function () {
      if (REDUCED) return;
      var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };
      var tween = G.to(track, { x: function () { return -dist(); }, ease: 'none' });
      hScroll = ST.create({
        trigger: '#koleksi', start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 1, animation: tween, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (s) {
          $('#trackBar').style.transform = 'scaleX(' + s.progress.toFixed(4) + ')';
          activeByX(s.progress * dist());
        }
      });
      // gambar sedikit bergeser di dalam kartu (parallax horizontal)
      $$('.card__media img', track).forEach(function (im) {
        G.fromTo(im, { xPercent: 7 }, { xPercent: -7, ease: 'none', scrollTrigger: { trigger: im.parentNode, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      $$('.card', track).forEach(function (c) {
        G.from(c.querySelector('.card__info'), { opacity: 0, y: 16, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 92%' } });
      });
      return function () { hScroll = null; G.set(track, { x: 0 }); };
    });
  }
  viewport.addEventListener('scroll', function () {
    if (hScroll) return;
    var max = viewport.scrollWidth - viewport.clientWidth;
    $('#trackBar').style.transform = 'scaleX(' + (max > 0 ? viewport.scrollLeft / max : 0) + ')';
    activeByX(viewport.scrollLeft);
  }, { passive: true });
  tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t) return;
    var g = $('[data-group="' + t.dataset.tab + '"]', track);
    setTab(t.dataset.tab);
    if (hScroll) {
      var dist = track.scrollWidth - viewport.clientWidth;
      var p = clamp((g.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)) / dist, 0, 1);
      scrollToY(hScroll.start + p * (hScroll.end - hScroll.start));
    } else {
      viewport.scrollTo({ left: g.offsetLeft - 20, behavior: 'smooth' });
    }
  });

  /* ======================================================================
     QUICK VIEW (shared element)
     ====================================================================== */
  var qv = $('#qv'), qvImg = $('#qvImg'), qvMedia = $('.qv__media', qv), qvPanel = $('.qv__panel', qv);
  var qvState = { id: null, qty: 1, from: null, lastFocus: null };
  function openQuick(id, fromEl) {
    var p = byId[id];
    if (!p) return;
    qvState.id = id; qvState.qty = 1; qvState.from = fromEl || null; qvState.lastFocus = document.activeElement;
    qvImg.src = src(p.img, 1024);
    qvImg.alt = p.name;
    qvMedia.classList.toggle('is-dark', p.bg === 'dark');
    $('#qvCat').textContent = (XV.CATEGORIES.filter(function (c) { return c.id === p.cat; })[0] || {}).label || '';
    $('#qvName').textContent = p.name;
    $('#qvType').textContent = p.type;
    $('#qvPrice').innerHTML = priceHTML(p);
    $('#qvDesc').textContent = p.desc;
    $('#qvQty').textContent = '1';
    $('#qvLink').href = p.url;
    $('#qvWa').href = wa('Halo XIONCO, saya tertarik dengan ' + p.name + ' (' + p.type + ').');
    var add = $('#qvAdd');
    add.textContent = p.price ? 'Tambah ke keranjang' : (p.studio ? 'Rancang di Custom Studio' : 'Tanya harga via WhatsApp');
    $('.qty', qv).style.display = p.price ? '' : 'none';
    qv.classList.add('is-open');
    qv.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    var info = $$('.qv__info > *', qv);
    if (!ANIM) {
      [qvPanel, $('.qv__backdrop', qv)].concat(info).forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
      $('.qv__close', qv).focus();
      return;
    }
    G.killTweensOf([qvPanel, info, '.qv__backdrop']);
    G.to('.qv__backdrop', { opacity: 1, duration: .6, ease: 'power2.out' });
    var mobile = innerWidth <= 760;
    G.set(qvPanel, { opacity: 1, y: 0 });
    var srcMedia = fromEl && fromEl.closest('.card__media, .search__results .thumb');
    if (srcMedia && !mobile) {
      // FLIP: kotak media kartu terbang ke posisi media quick view
      var a = srcMedia.getBoundingClientRect(), b = qvMedia.getBoundingClientRect();
      var clone = srcMedia.cloneNode(true);
      $$('button, a, .card__badge, .card__studio', clone).forEach(function (n) { n.remove(); });
      clone.style.cssText = 'position:fixed;left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;margin:0;z-index:301;border-radius:4px;pointer-events:none';
      document.body.appendChild(clone);
      G.set(qvPanel, { clipPath: 'inset(0 0 0 0)' });
      G.fromTo(qvPanel, { opacity: 0 }, { opacity: 1, duration: .45, delay: .45, ease: 'power2.out' });
      G.to(clone, { left: b.left, top: b.top, width: b.width, height: b.height, borderRadius: 0, duration: .9, ease: 'expo.inOut', onComplete: function () { clone.remove(); } });
    } else {
      G.fromTo(qvPanel, { opacity: 0, y: mobile ? 80 : 40 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' });
    }
    G.fromTo(info, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .05, delay: srcMedia && !mobile ? .55 : .15 });
    setTimeout(function () { $('.qv__close', qv).focus({ preventScroll: true }); }, 50);
  }
  function closeQuick() {
    if (!qv.classList.contains('is-open')) return;
    var done = function () {
      qv.classList.remove('is-open');
      qv.setAttribute('aria-hidden', 'true');
      if (!$('#cart').classList.contains('is-open') && !$('#search').classList.contains('is-open')) lockScroll(false);
      if (qvState.lastFocus && qvState.lastFocus.focus) qvState.lastFocus.focus({ preventScroll: true });
    };
    if (!ANIM) { qvPanel.style.opacity = 0; $('.qv__backdrop', qv).style.opacity = 0; done(); return; }
    G.to(qvPanel, { opacity: 0, y: 30, duration: .45, ease: 'power2.in' });
    G.to('.qv__backdrop', { opacity: 0, duration: .5, delay: .1, onComplete: done });
  }
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { e.preventDefault(); openQuick(q.dataset.quick, q); }
  });
  $('#qvMinus').addEventListener('click', function () { qvState.qty = Math.max(1, qvState.qty - 1); $('#qvQty').textContent = qvState.qty; });
  $('#qvPlus').addEventListener('click', function () { qvState.qty = Math.min(20, qvState.qty + 1); $('#qvQty').textContent = qvState.qty; });
  $('#qvAdd').addEventListener('click', function () {
    var p = byId[qvState.id];
    if (!p.price) {
      if (p.studio) { closeQuick(); setTimeout(function () { scrollToEl('#studio'); }, 350); }
      else window.open(wa('Halo XIONCO, saya ingin tahu harga ' + p.name + ' (' + p.type + ').'), '_blank', 'noopener');
      return;
    }
    addToCart(p.id, qvState.qty, qvImg);
    setTimeout(closeQuick, 250);
  });

  /* ======================================================================
     KERANJANG
     ====================================================================== */
  var cart = store.get('xv_cart', []);
  var cartEl = $('#cart');
  function cartCount() { return cart.reduce(function (s, it) { return s + it.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, it) { return s + (byId[it.id] ? byId[it.id].price * it.qty : 0); }, 0); }
  function renderCart() {
    cart = cart.filter(function (it) { return byId[it.id] && byId[it.id].price; });
    store.set('xv_cart', cart);
    var n = cartCount();
    ['#cartCount', '#dockCount'].forEach(function (s) { var el = $(s); el.textContent = n; el.classList.toggle('is-on', n > 0); });
    $('#cartItems').textContent = n + ' item';
    cartEl.classList.toggle('is-empty', !cart.length);
    $('#cartList').innerHTML = cart.map(function (it) {
      var p = byId[it.id];
      return '<li class="cart__item" data-id="' + p.id + '"><div class="thumb' + (p.bg === 'dark' ? ' is-dark' : '') + '"><img src="' + src(p.img, 768) + '" alt=""></div>' +
        '<div><h4>' + p.name + '</h4><p>' + rupiah(p.price) + '</p><div class="qty"><button type="button" data-q="-1" aria-label="Kurangi"><svg><use href="#i-minus"/></svg></button><span>' + it.qty + '</span><button type="button" data-q="1" aria-label="Tambah"><svg><use href="#i-plus"/></svg></button></div></div>' +
        '<button class="rm" type="button" data-rm>Hapus</button></li>';
    }).join('');
    $('#cartTotal').textContent = rupiah(cartTotal());
    var msg = 'Halo XIONCO, saya ingin memesan:\n' + cart.map(function (it) { var p = byId[it.id]; return '• ' + p.name + ' (' + p.type + ') × ' + it.qty + ' — ' + rupiah(p.price * it.qty); }).join('\n') + '\nSubtotal: ' + rupiah(cartTotal());
    $('#cartCheckout').href = wa(msg);
  }
  function bump(el) {
    if (!ANIM || !el) return;
    G.fromTo(el, { scale: 1.6 }, { scale: 1, duration: .7, ease: 'elastic.out(1,.4)' });
  }
  function addToCart(id, qty, fromEl) {
    var p = byId[id];
    if (!p || !p.price) return;
    var it = cart.filter(function (x) { return x.id === id; })[0];
    if (it) it.qty += qty; else cart.push({ id: id, qty: qty });
    var target = innerWidth <= 760 ? $('#dock [data-open="cart"]') : $('#nav .nav__cart');
    var finish = function () { renderCart(); bump(innerWidth <= 760 ? $('#dockCount') : $('#cartCount')); toast(p.name + ' ditambahkan ke keranjang'); };
    if (ANIM && fromEl && target) {
      var a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
      var size = Math.min(a.width, a.height, 140);
      var fly = document.createElement('div');
      fly.className = 'fly';
      fly.innerHTML = '<img src="' + src(p.img, 768) + '" alt="">';
      fly.style.cssText = 'left:0;top:0;width:' + size + 'px;height:' + size + 'px';
      document.body.appendChild(fly);
      var sx = a.left + a.width / 2 - size / 2, sy = a.top + a.height / 2 - size / 2;
      var ex = b.left + b.width / 2 - size / 2, ey = b.top + b.height / 2 - size / 2;
      G.set(fly, { x: sx, y: sy, scale: .9 });
      G.timeline({ onComplete: function () { fly.remove(); finish(); } })
        .to(fly, { x: ex, duration: .85, ease: 'power2.inOut' }, 0)
        .to(fly, { y: Math.min(sy, ey) - 120, duration: .4, ease: 'power2.out' }, 0)
        .to(fly, { y: ey, duration: .45, ease: 'power2.in' }, .4)
        .to(fly, { scale: .12, opacity: .6, duration: .85, ease: 'power2.in' }, 0);
    } else finish();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); addToCart(a.dataset.add, 1, a.closest('.card__media') || a); }
  });
  $('#cartList').addEventListener('click', function (e) {
    var li = e.target.closest('.cart__item');
    if (!li) return;
    var it = cart.filter(function (x) { return x.id === li.dataset.id; })[0];
    var q = e.target.closest('[data-q]');
    if (q) { it.qty = clamp(it.qty + parseInt(q.dataset.q, 10), 0, 20); if (!it.qty) cart.splice(cart.indexOf(it), 1); renderCart(); }
    if (e.target.closest('[data-rm]')) { cart.splice(cart.indexOf(it), 1); renderCart(); }
  });
  function openCart() {
    cartEl.classList.add('is-open'); cartEl.setAttribute('aria-hidden', 'false'); lockScroll(true);
    if (ANIM) G.from('.cart__item', { opacity: 0, x: 30, duration: .7, ease: 'expo.out', stagger: .05, delay: .2 });
  }
  function closeCart() {
    if (!cartEl.classList.contains('is-open')) return;
    cartEl.classList.remove('is-open'); cartEl.setAttribute('aria-hidden', 'true');
    if (!qv.classList.contains('is-open')) lockScroll(false);
  }
  renderCart();

  /* ======================================================================
     SEARCH
     ====================================================================== */
  var searchEl = $('#search'), searchInput = $('#searchInput'), results = $('#searchResults');
  // indeks dwibahasa: nama/tipe (Inggris) + kata kunci Indonesia per kategori & tipe
  var ID_CAT = { seats: 'kursi sofa tempat duduk', tables: 'meja', bedframe: 'ranjang kasur tempat tidur dipan', cabinet: 'lemari kabinet rak penyimpanan', decor: 'lampu dekorasi cahaya', smart: 'listrik stopkontak saklar colokan pintar' };
  var ID_TYPE = [[/chair/, 'kursi'], [/desk|workstation/, 'meja kerja kantor'], [/coffee table/, 'meja kopi meja tamu'], [/dining/, 'makan'], [/side table|nightstand/, 'meja samping nakas'], [/light/, 'lampu'], [/shelf/, 'rak'], [/wardrobe/, 'lemari pakaian'], [/kitchenette/, 'dapur kitchen set'], [/towel/, 'handuk kamar mandi'], [/slat|panel/, 'panel dinding'], [/bed/, 'ranjang tempat tidur'], [/socket|outlet|switch/, 'stopkontak saklar']];
  XV.PRODUCTS.forEach(function (p) {
    var t = p.type.toLowerCase();
    var cat = XV.CATEGORIES.filter(function (c) { return c.id === p.cat; })[0];
    p._q = [p.name, t, p.cat, cat ? cat.label : '', ID_CAT[p.cat] || ''].concat(ID_TYPE.filter(function (r) { return r[0].test(t); }).map(function (r) { return r[1]; })).join(' ').toLowerCase();
  });
  function renderResults(q) {
    q = q.trim().toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);
    var list = XV.PRODUCTS.filter(function (p) {
      return terms.every(function (w) { return p._q.indexOf(w) >= 0; });
    }).slice(0, 12);
    results.innerHTML = list.length ? list.map(function (p) {
      return '<li><button type="button" data-search-open="' + p.id + '"><div class="thumb' + (p.bg === 'dark' ? ' is-dark' : '') + '"><img src="' + src(p.img, 768) + '" alt="" loading="lazy"></div><b>' + p.name + '</b><span>' + p.type + ' · ' + (p.price ? (p.from ? 'mulai ' : '') + rupiah(p.price) : 'Tanya harga') + '</span></button></li>';
    }).join('') : '<li class="search__empty" style="opacity:1;transform:none">Tidak ditemukan. Coba "sofa", "meja", atau "lampu".</li>';
    $('#searchHint').textContent = q ? list.length + ' hasil untuk "' + q + '"' : 'Tekan / untuk mencari · Esc untuk menutup';
    if (ANIM) G.to($$('li', results), { opacity: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .03 });
    else $$('li', results).forEach(function (li) { li.style.opacity = 1; li.style.transform = 'none'; });
  }
  function openSearch() {
    searchEl.classList.add('is-open'); searchEl.setAttribute('aria-hidden', 'false'); lockScroll(true);
    renderResults(searchInput.value);
    setTimeout(function () { searchInput.focus(); }, 60);
  }
  function closeSearch() {
    if (!searchEl.classList.contains('is-open')) return;
    searchEl.classList.remove('is-open'); searchEl.setAttribute('aria-hidden', 'true');
    if (!qv.classList.contains('is-open')) lockScroll(false);
  }
  var sT = 0;
  searchInput.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(function () { renderResults(searchInput.value); }, 90); });
  results.addEventListener('click', function (e) {
    var b = e.target.closest('[data-search-open]');
    if (!b) return;
    var id = b.dataset.searchOpen;
    closeSearch();
    setTimeout(function () { openQuick(id, null); }, 200);
  });

  /* generic open/close */
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); if (o.dataset.open === 'cart') openCart(); if (o.dataset.open === 'search') openSearch(); return; }
    var c = e.target.closest('[data-close]');
    if (c) { closeAll(); }
  });
  function closeAll() { closeQuick(); closeCart(); closeSearch(); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); closeMenu(); return; }
    var typing = e.target.matches && e.target.matches('input, textarea, select');
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  });

  /* ======================================================================
     CUSTOM STUDIO — CUBIX Modular configurator
     ====================================================================== */
  (function studio() {
    var S = XV.STUDIO, svg = $('#sofaSvg');
    var K = 1.7, FLOOR = 404;                    // 1 cm = 1.7 unit SVG
    var SW = S.seatW * K, AW = S.armW * K, GAP = 34;
    var st = store.get('xv_studio', null) || { seats: 3, arms: true, ottoman: false, fabric: 'fb01', base: 'oak', light: 18 };
    var NS = 'http://www.w3.org/2000/svg';

    function seatParts() {
      return '<rect class="p-dark" x="0" y="-126" width="' + SW + '" height="82" rx="6"/>' +
        '<rect class="p-fab" x="5" y="-122" width="' + (SW - 10) + '" height="56" rx="14"/>' +
        '<rect class="p-shade" x="5" y="-122" width="' + (SW - 10) + '" height="56" rx="14"/>' +
        '<rect class="p-tex" x="5" y="-122" width="' + (SW - 10) + '" height="56" rx="14"/>' +
        '<rect class="p-gloss" x="5" y="-122" width="' + (SW - 10) + '" height="56" rx="14"/>' +
        '<rect class="p-dark" x="0" y="-52" width="' + SW + '" height="34" rx="3"/>' +
        '<rect class="p-fab" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-shade" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-tex" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-gloss" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-base" x="0" y="-18" width="' + SW + '" height="6"/>' +
        '<rect class="p-base" x="8" y="-12" width="5" height="12"/><rect class="p-base" x="' + (SW - 13) + '" y="-12" width="5" height="12"/>';
    }
    function armParts() {
      return '<rect class="p-fab" x="0" y="-106" width="' + AW + '" height="88" rx="10"/>' +
        '<rect class="p-shadeH" x="0" y="-106" width="' + AW + '" height="88" rx="10"/>' +
        '<rect class="p-tex" x="0" y="-106" width="' + AW + '" height="88" rx="10"/>' +
        '<rect class="p-gloss" x="0" y="-106" width="' + AW + '" height="88" rx="10"/>' +
        '<rect class="p-base" x="0" y="-18" width="' + AW + '" height="6"/><rect class="p-base" x="' + (AW / 2 - 2.5) + '" y="-12" width="5" height="12"/>';
    }
    function ottomanParts() {
      return '<rect class="p-dark" x="0" y="-52" width="' + SW + '" height="34" rx="3"/>' +
        '<rect class="p-fab" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-shade" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-tex" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-gloss" x="3" y="-71" width="' + (SW - 6) + '" height="26" rx="9"/>' +
        '<rect class="p-base" x="0" y="-18" width="' + SW + '" height="6"/>' +
        '<rect class="p-base" x="8" y="-12" width="5" height="12"/><rect class="p-base" x="' + (SW - 13) + '" y="-12" width="5" height="12"/>';
    }
    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5e6" stop-opacity=".18"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>' +
        '<linearGradient id="gH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff5e6" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>' +
        '<linearGradient id="gGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5e6" stop-opacity=".32"/><stop offset=".22" stop-color="#fff5e6" stop-opacity=".06"/><stop offset=".23" stop-color="#fff5e6" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>' +
        '<pattern id="pW" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".08"/><rect y="2" width="4" height="1" fill="#000" opacity=".08"/><rect width="1" height="4" fill="#fff" opacity=".04"/></pattern>' +
        '<radialGradient id="gShadow"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="gLamp"><stop offset="0" stop-color="#ffd59a" stop-opacity=".95"/><stop offset=".35" stop-color="#e8a85c" stop-opacity=".35"/><stop offset="1" stop-color="#e8a85c" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="gWin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8ec" stop-opacity=".55"/><stop offset="1" stop-color="#fff8ec" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<polygon id="sWin" points="70,40 250,40 330,380 150,380" fill="url(#gWin)"/>' +
      '<circle id="sGlow" cx="830" cy="150" r="230" fill="url(#gLamp)"/>' +
      '<g id="sLamp"><line x1="830" y1="150" x2="830" y2="404" stroke="#1a1918" stroke-width="3"/><rect x="814" y="400" width="32" height="5" rx="2" fill="#1a1918"/><circle id="sBulb" cx="830" cy="150" r="17" fill="#e9dcc6"/></g>' +
      '<ellipse id="sShadow" cx="450" cy="' + (FLOOR + 4) + '" rx="300" ry="18" fill="url(#gShadow)"/>' +
      '<g id="sSofa">' +
        '<g class="unit" data-u="0">' + seatParts() + '</g><g class="unit" data-u="1">' + seatParts() + '</g><g class="unit" data-u="2">' + seatParts() + '</g><g class="unit" data-u="3">' + seatParts() + '</g>' +
        '<g class="arm" data-arm="l">' + armParts() + '</g><g class="arm" data-arm="r">' + armParts() + '</g>' +
        '<g class="otto">' + ottomanParts() + '</g>' +
      '</g>' +
      '<g id="sDims" font-family="JetBrains Mono, monospace" font-size="13" letter-spacing="1">' +
        '<line id="dLine" x1="0" y1="0" x2="0" y2="0" stroke="currentColor" stroke-width="1"/>' +
        '<line id="dT1" x1="0" y1="-7" x2="0" y2="7" stroke="currentColor"/><line id="dT2" x1="0" y1="-7" x2="0" y2="7" stroke="currentColor"/>' +
        '<rect id="dBg" x="0" y="-11" width="76" height="22" rx="11"/><text id="dTxt" x="0" y="4.5" text-anchor="middle" fill="currentColor"></text>' +
      '</g>';
    var styleEl = document.createElementNS(NS, 'style');
    styleEl.textContent =
      '#sSofa{--fab:#4a4846;--base:#c8a678;--gloss:0;--tex:1}' +
      '.p-fab{fill:var(--fab)}.p-dark{fill:var(--fab);filter:brightness(.7)}' +
      '.p-shade{fill:url(#gV)}.p-shadeH{fill:url(#gH)}.p-tex{fill:url(#pW);opacity:var(--tex)}.p-gloss{fill:url(#gGloss);opacity:var(--gloss)}' +
      '.p-base{fill:var(--base)}#sDims{color:#e9e3d9}#dBg{fill:rgba(13,12,11,.7)}';
    svg.insertBefore(styleEl, svg.firstChild);

    var sofa = $('#sSofa', svg), units = $$('.unit', svg), arms = $$('.arm', svg), otto = $('.otto', svg);
    var dims = { line: $('#dLine', svg), t1: $('#dT1', svg), t2: $('#dT2', svg), txt: $('#dTxt', svg), bg: $('#dBg', svg), g: $('#sDims', svg) };
    var priceObj = { v: 0 };

    // UI
    var sw = $('#swatches');
    sw.innerHTML = S.fabrics.map(function (f) { return '<button class="swatch" type="button" data-fabric="' + f.id + '" data-type="' + f.type + '" style="--c:' + f.color + '" aria-label="' + f.code + ' ' + f.name + '" title="' + f.code + ' — ' + f.name + '"></button>'; }).join('');
    $('#bases').innerHTML = S.bases.map(function (b) { return '<button class="chip" type="button" data-base="' + b.id + '" style="--c:' + b.color + '"><i></i>' + b.name + '</button>'; }).join('');
    var lightInput = $('#light');

    function fabric() { return S.fabrics.filter(function (f) { return f.id === st.fabric; })[0] || S.fabrics[0]; }
    function base() { return S.bases.filter(function (b) { return b.id === st.base; })[0] || S.bases[0]; }
    function widthCm() { return st.seats * S.seatW + (st.arms ? 2 * S.armW : 0); }
    function price() {
      var p = st.seats * S.seatPrice + (st.arms ? S.armPrice : 0) + (st.ottoman ? S.ottomanPrice : 0);
      if (fabric().type === 'leather') p *= S.leatherFactor;
      return p + base().add;
    }

    function layout(immediate) {
      var total = st.seats * SW + (st.arms ? 2 * AW : 0);
      var groupW = total + (st.ottoman ? GAP + SW : 0);
      var x0 = Math.round((780 - groupW) / 2) + 10;
      var dur = immediate || !ANIM ? 0 : .9;
      var set = function (el, vars) {
        if (dur) G.to(el, Object.assign({ duration: dur, ease: 'expo.out' }, vars));
        else if (HAS_GSAP) G.set(el, vars);
        else { el.setAttribute('transform', 'translate(' + vars.x + ',' + (vars.y || FLOOR) + ')'); el.style.opacity = vars.opacity; }
      };
      var seatX = x0 + (st.arms ? AW : 0);
      units.forEach(function (u, i) {
        var on = i < st.seats;
        set(u, { x: seatX + Math.min(i, st.seats) * SW + (on ? 0 : 30), y: FLOOR, opacity: on ? 1 : 0 });
      });
      set(arms[0], { x: x0, y: FLOOR, opacity: st.arms ? 1 : 0 });
      set(arms[1], { x: seatX + st.seats * SW, y: FLOOR, opacity: st.arms ? 1 : 0 });
      set(otto, { x: x0 + total + GAP, y: FLOOR, opacity: st.ottoman ? 1 : 0 });
      // bayangan & garis dimensi
      var shadow = $('#sShadow', svg);
      if (dur) G.to(shadow, { attr: { cx: x0 + groupW / 2, rx: groupW / 2 + 40 }, duration: dur, ease: 'expo.out' });
      else { shadow.setAttribute('cx', x0 + groupW / 2); shadow.setAttribute('rx', groupW / 2 + 40); }
      var y = FLOOR - 152, xa = x0, xb = x0 + total, mid = (xa + xb) / 2;
      var A = { a: xa, b: xb };
      var apply = function () {
        dims.line.setAttribute('x1', A.a); dims.line.setAttribute('x2', A.b); dims.line.setAttribute('y1', y); dims.line.setAttribute('y2', y);
        dims.t1.setAttribute('x1', A.a); dims.t1.setAttribute('x2', A.a); dims.t1.setAttribute('y1', y - 7); dims.t1.setAttribute('y2', y + 7);
        dims.t2.setAttribute('x1', A.b); dims.t2.setAttribute('x2', A.b); dims.t2.setAttribute('y1', y - 7); dims.t2.setAttribute('y2', y + 7);
        var m = (A.a + A.b) / 2;
        dims.txt.setAttribute('x', m); dims.txt.setAttribute('y', y + 4.5);
        dims.bg.setAttribute('x', m - 38); dims.bg.setAttribute('y', y - 11);
      };
      if (!layout.prev) layout.prev = { a: mid, b: mid };
      if (dur) { A.a = layout.prev.a; A.b = layout.prev.b; G.to(A, { a: xa, b: xb, duration: dur, ease: 'expo.out', onUpdate: apply }); }
      else apply();
      layout.prev = { a: xa, b: xb };
      dims.txt.textContent = widthCm() + ' cm';
    }

    function applyMaterial(immediate) {
      var f = fabric(), b = base();
      var vars = { '--fab': f.color, '--base': b.color, '--gloss': f.type === 'leather' ? 1 : 0, '--tex': f.type === 'leather' ? 0 : 1 };
      if (ANIM && !immediate) G.to(sofa, Object.assign({ duration: .8, ease: 'power2.out' }, vars));
      else Object.keys(vars).forEach(function (k) { sofa.style.setProperty(k, vars[k]); });
      $$('.swatch', sw).forEach(function (s) { s.classList.toggle('is-on', s.dataset.fabric === f.id); });
      $$('.chip', $('#bases')).forEach(function (c) { c.classList.toggle('is-on', c.dataset.base === b.id); });
      $('#swatchName').textContent = f.code + ' — ' + f.name + (f.type === 'leather' ? ' · faux leather' : ' · fabric');
    }

    function applyLight() {
      var n = st.light / 100;                       // 0 siang → 1 malam
      var day = [[216, 205, 189], [190, 178, 160]], dusk = [[124, 98, 78], [62, 48, 38]], night = [[27, 25, 23], [12, 11, 10]];
      function mixc(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
      var top = n < .5 ? mixc(day[0], dusk[0], n * 2) : mixc(dusk[0], night[0], (n - .5) * 2);
      var bot = n < .5 ? mixc(day[1], dusk[1], n * 2) : mixc(dusk[1], night[1], (n - .5) * 2);
      $('#stageWall').style.background =
        'radial-gradient(circle at 92% 30%, rgba(255,196,120,' + (.38 * n).toFixed(3) + '), rgba(255,196,120,0) 46%),' +
        'linear-gradient(180deg, rgb(' + top + ') 0%, rgb(' + bot + ') 74%)';
      sofa.style.filter = 'brightness(' + (1 - .4 * n).toFixed(3) + ') saturate(' + (1 - .15 * n).toFixed(3) + ')';
      $('#sGlow', svg).style.opacity = (n * .95).toFixed(3);
      $('#sBulb', svg).style.fill = n > .35 ? '#ffe3b5' : '#e9dcc6';
      $('#sWin', svg).style.opacity = ((1 - n) * .7).toFixed(3);
      var sh = $('#sShadow', svg);
      sh.style.opacity = (.55 + .35 * n).toFixed(3);
      sh.style.transform = 'translateX(' + (-34 * n).toFixed(1) + 'px)';
      $('#sDims', svg).style.color = n > .45 ? '#e9e3d9' : '#181715';
      $('#dBg', svg).style.fill = n > .45 ? 'rgba(13,12,11,.7)' : 'rgba(235,230,222,.75)';
    }

    function summary(immediate) {
      $('#cfgName').textContent = st.seats + ' Seater' + (st.arms ? '' : ' Armless') + (st.ottoman ? ' + Ottoman' : '');
      $('#cfgDims').textContent = 'W ' + widthCm() + ' · D ' + S.depth + ' · H ' + S.height + ' cm' + (st.ottoman ? ' · Ottoman 72 × 72' : '');
      var target = price();
      if (ANIM && !immediate) G.to(priceObj, { v: target, duration: .9, ease: 'power3.out', onUpdate: function () { $('#cfgPrice').textContent = rupiah(priceObj.v); } });
      else { priceObj.v = target; $('#cfgPrice').textContent = rupiah(target); }
      var f = fabric(), b = base();
      $('#studioCta').href = wa('Halo XIONCO, saya ingin penawaran CUBIX Modular:\n• Dudukan: ' + st.seats + ' seater' + (st.arms ? ' dengan lengan' : ' tanpa lengan') +
        '\n• Ottoman: ' + (st.ottoman ? 'ya' : 'tidak') + '\n• Material: ' + f.code + ' ' + f.name + '\n• Base: ' + b.name +
        '\n• Ukuran: W ' + widthCm() + ' × D ' + S.depth + ' × H ' + S.height + ' cm\n• Estimasi di website: ' + rupiah(target));
      // tombol jumlah dudukan
      var segBtns = $$('#segSeats button');
      segBtns.forEach(function (b2) { b2.classList.toggle('is-on', +b2.dataset.seats === st.seats); });
      $('#segSeats .seg__ind').style.transform = 'translateX(' + ((st.seats - 1) * 100) + '%)';
      $('#optArms').checked = st.arms; $('#optOttoman').checked = st.ottoman;
      store.set('xv_studio', st);
    }

    function update(immediate) { layout(immediate); applyMaterial(immediate); summary(immediate); }

    $('#segSeats').addEventListener('click', function (e) { var b = e.target.closest('[data-seats]'); if (!b) return; st.seats = +b.dataset.seats; update(); });
    $('#optArms').addEventListener('change', function (e) { st.arms = e.target.checked; update(); });
    $('#optOttoman').addEventListener('change', function (e) { st.ottoman = e.target.checked; update(); });
    sw.addEventListener('click', function (e) { var b = e.target.closest('[data-fabric]'); if (!b) return; st.fabric = b.dataset.fabric; applyMaterial(); summary(); });
    $('#bases').addEventListener('click', function (e) { var b = e.target.closest('[data-base]'); if (!b) return; st.base = b.dataset.base; applyMaterial(); summary(); });
    lightInput.value = st.light;
    lightInput.addEventListener('input', function () { st.light = +lightInput.value; applyLight(); store.set('xv_studio', st); });

    update(true);
    applyLight();
    // sedikit "hidup": saat masuk layar, sofa menyusun diri
    if (ANIM) {
      ST.create({ trigger: '#stage', start: 'top 75%', once: true, onEnter: function () {
        G.from(units.concat(arms, [otto]), { y: FLOOR + 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .07 });
        G.from(dims.g, { opacity: 0, duration: 1, delay: .6 });
      } });
      G.from('.panel__step, .panel__total', { opacity: 0, y: 24, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.panel', start: 'top 80%' } });
    }
  })();

  /* ======================================================================
     PABRIK — peta titik Pulau Jawa + alur produksi
     ====================================================================== */
  (function factory() {
    var svg = $('#map');
    var JAVA = [[105.21, -6.75], [105.46, -6.62], [105.86, -6.02], [106.1, -6], [106.6, -6.03], [106.85, -6.1], [107.1, -5.95], [107.45, -6.1], [107.85, -6.2], [108.2, -6.25], [108.35, -6.4], [108.55, -6.72], [109, -6.85], [109.45, -6.85], [109.7, -6.88], [110.1, -6.88], [110.42, -6.95], [110.6, -6.75], [110.68, -6.5], [110.95, -6.42], [111.1, -6.62], [111.45, -6.68], [111.95, -6.8], [112.35, -6.9], [112.6, -6.92], [112.75, -7.15], [112.85, -7.55], [113.3, -7.7], [113.85, -7.68], [114.15, -7.7], [114.45, -7.8], [114.42, -8.2], [114.6, -8.75], [114.3, -8.62], [113.8, -8.5], [113.3, -8.3], [112.7, -8.35], [112.2, -8.32], [111.6, -8.25], [111.05, -8.2], [110.6, -8.05], [110.2, -7.95], [109.7, -7.78], [109.3, -7.7], [108.9, -7.7], [108.55, -7.72], [108.2, -7.78], [107.75, -7.65], [107.4, -7.5], [106.95, -7.4], [106.45, -7.38], [106.35, -7], [106, -6.86], [105.6, -6.85]];
    var MADURA = [[112.7, -6.9], [113.3, -6.88], [113.95, -6.9], [114.1, -7.05], [113.7, -7.2], [113.05, -7.22], [112.75, -7.12]];
    var SC = 95.9, X0 = 105.0, Y0 = -5.85;
    var px = function (lon) { return 30 + (lon - X0) * SC; };
    var py = function (lat) { return 40 + (Y0 - lat) * SC; };
    function inside(pt, poly) {
      var x = pt[0], y = pt[1], ins = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
      }
      return ins;
    }
    svg.setAttribute('viewBox', '0 0 1000 360');
    var dots = '', step = .105, n = 0;
    for (var lat = -5.9; lat > -8.9; lat -= step) {
      for (var lon = 105; lon < 114.9; lon += step) {
        var off = (Math.round((lat + 5.9) / step) % 2) * step / 2;
        var p = [lon + off, lat];
        if (inside(p, JAVA) || inside(p, MADURA)) { dots += '<circle class="map-dot" cx="' + px(p[0]).toFixed(1) + '" cy="' + py(p[1]).toFixed(1) + '" r="2.1"/>'; n++; }
      }
    }
    var jep = XV.FACTORIES[0], jkt = XV.FACTORIES[1];
    var J = [px(jep.lon), py(jep.lat)], K = [px(jkt.lon), py(jkt.lat)];
    var route = 'M' + J[0].toFixed(1) + ' ' + J[1].toFixed(1) + ' C' + (J[0] - 90) + ' ' + (J[1] - 95) + ' ' + (K[0] + 150) + ' ' + (K[1] - 95) + ' ' + K[0].toFixed(1) + ' ' + K[1].toFixed(1);
    svg.innerHTML =
      '<text class="map-label" x="560" y="22">LAUT JAWA</text><text class="map-label" x="600" y="352">SAMUDRA HINDIA</text>' +
      '<g id="mapDots">' + dots + '</g>' +
      '<path class="map-route-bg" d="' + route + '"/>' +
      '<path class="map-route" id="mapRoute" d="' + route + '"/>' +
      '<g class="map-pin" id="pinJ" transform="translate(' + J[0].toFixed(1) + ',' + J[1].toFixed(1) + ')"><circle class="halo" r="16"/><circle class="core" r="5"/><text x="16" y="28">Jepara</text></g>' +
      '<g class="map-pin" id="pinK" transform="translate(' + K[0].toFixed(1) + ',' + K[1].toFixed(1) + ')"><circle class="halo" r="16"/><circle class="core" r="5"/><text x="-14" y="-24" text-anchor="end">Jakarta Selatan · <tspan id="pinKsub">3 pabrik</tspan></text></g>';
    // mobile: potong peta ke area pabrik (Jakarta–Jepara) supaya label terbaca
    var mqMap = window.matchMedia('(max-width: 760px)');
    function fitMap() {
      var m = mqMap.matches, t = $('#pinK text');
      svg.setAttribute('viewBox', m ? '120 40 540 300' : '0 0 1000 360');
      t.setAttribute('x', m ? 14 : -14); t.setAttribute('text-anchor', m ? 'start' : 'end');
      var lb = $$('.map-label', svg);
      lb[0].style.display = m ? 'none' : '';
      lb[1].setAttribute('x', m ? 420 : 600); lb[1].setAttribute('y', m ? 330 : 352);
    }
    fitMap();
    if (mqMap.addEventListener) mqMap.addEventListener('change', fitMap);
    var routeEl = $('#mapRoute'), len = routeEl.getTotalLength();
    routeEl.style.strokeDasharray = len;
    routeEl.style.strokeDashoffset = len;
    var dotEls = $$('.map-dot', svg);
    function nearDots(c, r) {
      dotEls.forEach(function (d) {
        var dx = d.cx.baseVal.value - c[0], dy = d.cy.baseVal.value - c[1];
        d.classList.toggle('is-near', dx * dx + dy * dy < r * r);
      });
    }
    var stepsEls = $$('#steps li');
    var subs = ['3 pabrik', 'Cirendeu', 'Pondok Pinang I', 'Pondok Pinang II'];
    function setStep(i, p) {
      stepsEls.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
      $('#pinJ').classList.toggle('is-on', i === 0);
      $('#pinK').classList.toggle('is-on', i > 0);
      $('#pinKsub').textContent = i > 0 ? subs[i] : subs[0];
      nearDots(i === 0 ? J : K, i === 0 ? 34 : 30 + i * 6);
      routeEl.style.strokeDashoffset = (len * (1 - clamp(p, 0, 1))).toFixed(1);
    }
    setStep(0, 0);
    if (ANIM) {
      // halo berdenyut
      G.to('.map-pin .halo', { attr: { r: 26 }, opacity: 0, duration: 1.8, ease: 'power2.out', repeat: -1, stagger: .4 });
      var mm2 = G.matchMedia();
      mm2.add('(min-width: 961px)', function () {
        ST.create({
          trigger: '#pabrik', start: 'top top', end: '+=' + (innerHeight * 2.4), pin: '#factoryPin', scrub: true,
          onUpdate: function (s) {
            var i = Math.min(3, Math.floor(s.progress * 4));
            setStep(i, s.progress * 1.35);
          }
        });
      });
      mm2.add('(max-width: 960px)', function () {
        ST.create({ trigger: svg, start: 'top 75%', once: true, onEnter: function () { G.to(routeEl, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }); } });
        stepsEls.forEach(function (li) { li.classList.add('is-on'); });
      });
      // titik peta muncul berurutan (setelah pin dibuat)
      G.from(dotEls, { opacity: 0, duration: .8, stagger: { each: .0015, from: 'start' }, scrollTrigger: { trigger: '#pabrik', start: 'top 70%' } });
    } else {
      routeEl.style.strokeDashoffset = 0;
      stepsEls.forEach(function (li) { li.classList.add('is-on'); });
    }
    // counter
    $$('#stats [data-count]').forEach(function (b) {
      var to = +b.dataset.count, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      if (!ANIM) { b.textContent = pre + to + suf; return; }
      var o = { v: 0 };
      ST.create({ trigger: b, start: 'top 90%', once: true, onEnter: function () {
        G.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: function () { b.textContent = pre + Math.round(o.v) + suf; } });
      } });
    });
  })();

  /* ======================================================================
     FOR BUSINESS — preview gambar mengikuti kursor, form → WhatsApp
     ====================================================================== */
  (function business() {
    var prev = $('#preview'), prevImg = $('#previewImg');
    var pos = { x: 0, y: 0, tx: 0, ty: 0, on: false };
    if (FINE && ANIM) {
      $$('.service').forEach(function (row) {
        row.addEventListener('pointerenter', function () {
          if (prevImg.getAttribute('src') !== row.dataset.img) {
            prevImg.src = row.dataset.img;
            G.fromTo(prevImg, { scale: 1.25 }, { scale: 1, duration: .9, ease: 'expo.out' });
          }
          pos.on = true;
          G.to(prev, { opacity: 1, scale: 1, duration: .6, ease: 'expo.out' });
        });
        row.addEventListener('pointerleave', function () { pos.on = false; G.to(prev, { opacity: 0, scale: .6, duration: .45, ease: 'power3.in' }); });
      });
      window.addEventListener('pointermove', function (e) { pos.tx = e.clientX; pos.ty = e.clientY; }, { passive: true });
      (function loop() {
        pos.x = lerp(pos.x, pos.tx, .14); pos.y = lerp(pos.y, pos.ty, .14);
        var w = prev.offsetWidth, h = prev.offsetHeight;
        prev.style.left = (pos.x + 28) + 'px';
        prev.style.top = (pos.y - h / 2) + 'px';
        var rot = clamp((pos.tx - pos.x) * .08, -8, 8);
        prev.style.rotate = rot.toFixed(2) + 'deg';
        requestAnimationFrame(loop);
      })();
    }
    $$('.service').forEach(function (row) {
      row.addEventListener('click', function () {
        window.open(wa('Halo XIONCO, saya tertarik dengan layanan ' + row.querySelector('h3').textContent + ' untuk proyek saya.'), '_blank', 'noopener');
      });
    });
    var form = $('#bform');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#fName'), phone = $('#fPhone'), ok = true;
      [name, phone].forEach(function (f) { var bad = !f.value.trim(); f.parentNode.classList.toggle('is-error', bad); if (bad) ok = false; });
      if (!ok) { $('#formNote').textContent = 'Mohon isi nama dan nomor WhatsApp.'; if (ANIM) G.fromTo(form, { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1,.3)' }); return; }
      var msg = 'Halo XIONCO, saya ' + name.value.trim() + ' (' + phone.value.trim() + ').\nJenis proyek: ' + $('#fType').value + '\nNilai proyek: ' + $('#fValue').value + ($('#fNeed').value.trim() ? '\nKebutuhan: ' + $('#fNeed').value.trim() : '') + '\nMohon penawarannya. Terima kasih.';
      window.open(wa(msg), '_blank', 'noopener');
      $('#formNote').textContent = 'Membuka WhatsApp… tim kami akan membalas dalam 1 jam kerja.';
      toast('Permintaan penawaran disiapkan di WhatsApp');
    });
  })();

  /* ======================================================================
     FOOTER — logo besar dengan sorotan cahaya
     ====================================================================== */
  (function footer() {
    var box = $('#footLogo'), lit = $('.footer__logo-lit', box);
    var f = { x: .5, y: .5, tx: .5, ty: .5, last: -1e9, vis: false };
    $('.footer').addEventListener('pointermove', function (e) {
      var r = lit.getBoundingClientRect();
      f.tx = (e.clientX - r.left) / r.width; f.ty = (e.clientY - r.top) / r.height; f.last = performance.now();
    });
    new IntersectionObserver(function (es) { f.vis = es[0].isIntersecting; }).observe(box);
    (function loop(t) {
      if (f.vis) {
        if (performance.now() - f.last > 2200 || !FINE) { f.tx = .5 + Math.sin(t / 1600) * .42; f.ty = .5 + Math.sin(t / 900) * .2; }
        f.x = lerp(f.x, f.tx, .08); f.y = lerp(f.y, f.ty, .08);
        lit.style.setProperty('--fx', (f.x * 100).toFixed(2) + '%');
        lit.style.setProperty('--fy', (f.y * 100).toFixed(2) + '%');
      }
      requestAnimationFrame(loop);
    })(0);
  })();

  /* animasi umum & penanda section — dibuat terakhir (setelah semua pin) */
  scrollAnims();
  sectionTriggers();

  /* refresh setelah gambar & font siap */
  window.addEventListener('load', function () { if (HAS_GSAP) ST.refresh(); placeHotspots(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (HAS_GSAP) ST.refresh(); });
})();
