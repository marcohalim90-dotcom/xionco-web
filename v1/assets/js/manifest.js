/* ==========================================================================
   XIONCO BUSINESS — Asset manifest (sumber data untuk website + Asset Ledger)

   Cara menambah aset:
   1. Simpan file dengan nama PERSIS seperti di kolom `files` ke folder assets/media/
   2. Refresh halaman → website otomatis memakai file tersebut,
      dan ledger.html otomatis menandai statusnya "Ready".
   File pertama di `files` yang ditemukan akan dipakai.
   ========================================================================== */
window.XIONCO_MANIFEST = {
  updated: '2026-10-11',
  base: 'assets/media/',

  groups: [
    { id: 'brand',   title: 'Brand',                     phase: 1 },
    { id: 'home',    title: 'Homepage — Background',     phase: 1 },
    { id: 'frames',  title: 'Homepage — Main Frame A–D', phase: 1 },
    { id: 'system',  title: 'Font, Icon & SEO',          phase: 1 },
    { id: 'inner',   title: 'Halaman dalam (Phase 2)',   phase: 2 }
  ],

  assets: [
    /* ---------------- Brand ---------------- */
    {
      id: 'brand-wordmark', group: 'brand', kind: 'image', priority: 'high',
      name: 'Logo / Title — "XIONCO BUSINESS"',
      usedIn: 'Header kiri. Diklik → kembali ke Homepage.',
      format: 'SVG (utama) atau PNG transparan',
      size: 'Vektor, atau PNG ±1200 × 80 px (tampil ±14 px tinggi)',
      files: ['brand/logo-wordmark.svg', 'brand/logo-wordmark.png'],
      placeholder: 'Teks HTML (Jost 500, tracking lebar) dengan gradasi emas per huruf.',
      notes: ['Sesuai anotasi: format IMAGE.', 'Sertakan versi monokrom terang untuk background gelap.']
    },
    {
      id: 'brand-slogan', group: 'brand', kind: 'image', priority: 'high',
      name: 'Slogan — "#1 FURNITURE MANUFACTURER IN INDONESIA"',
      usedIn: 'Header kanan.',
      format: 'SVG (utama) atau PNG transparan',
      size: 'Vektor, atau PNG ±1400 × 60 px (tampil ±9 px tinggi)',
      files: ['brand/slogan.svg', 'brand/slogan.png'],
      placeholder: 'Teks HTML (Poppins) dua tingkat warna.',
      notes: ['Sesuai anotasi: format IMAGE.']
    },
    {
      id: 'brand-favicon', group: 'brand', kind: 'image', priority: 'medium',
      name: 'Favicon & app icon',
      usedIn: 'Tab browser, bookmark, home-screen HP.',
      format: 'SVG + PNG',
      size: 'SVG persegi, PNG 512 × 512 dan 180 × 180',
      files: ['brand/favicon.svg', 'brand/favicon-512.png'],
      placeholder: 'Belum ada (default browser).',
      notes: ['Simbol/monogram saja, bukan wordmark penuh.']
    },

    /* ---------------- Homepage background ---------------- */
    {
      id: 'home-bg', group: 'home', kind: 'image', priority: 'high',
      name: 'Background Homepage (desktop)',
      usedIn: 'Seluruh layar di belakang Main Frame.',
      format: 'WebP atau JPG, ≤ 400 KB',
      size: '2560 × 1440 px (16:9) — rasio di anotasi masih "xxx × xxx", mohon konfirmasi',
      files: ['bg/home-bg.webp', 'bg/home-bg.jpg'],
      placeholder: 'CSS: hitam + cahaya lantai hangat (radial gradient) + grain halus.',
      notes: [
        'Dominan hitam; area bawah-tengah untuk "lantai" bercahaya di bawah frame.',
        'Frame duduk di tengah (±58% lebar layar). Jangan taruh detail penting di area tsb.',
        'Gambar di-crop "cover" dari bawah-tengah.'
      ]
    },
    {
      id: 'home-bg-mobile', group: 'home', kind: 'image', priority: 'medium',
      name: 'Background Homepage (mobile)',
      usedIn: 'Layar HP (portrait).',
      format: 'WebP atau JPG, ≤ 250 KB',
      size: '1080 × 1920 px (9:16)',
      files: ['bg/home-bg-mobile.webp', 'bg/home-bg-mobile.jpg'],
      placeholder: 'Sama dengan desktop (CSS).',
      notes: []
    },

    /* ---------------- Main Frame A–D ---------------- */
    frameVideo('a', 'Catalog', 'Sofa / produk katalog', [600, 480]),
    frameVideo('b', 'Customize', 'Orb di atas riak air', [960, 480]),
    frameVideo('c', 'Wholesale', 'Orb partikel gelap', [960, 480]),
    frameVideo('d', 'Design Services', 'Orb kubus', [960, 480]),
    framePoster('a', 'Catalog'),
    framePoster('b', 'Customize'),
    framePoster('c', 'Wholesale'),
    framePoster('d', 'Design Services'),
    frameMobile('a', 'Catalog'),
    frameMobile('b', 'Customize'),
    frameMobile('c', 'Wholesale'),
    frameMobile('d', 'Design Services'),

    /* ---------------- Font, icon, SEO ---------------- */
    {
      id: 'font-display', group: 'system', kind: 'manual', priority: 'medium',
      name: 'Font brand — Display (judul & logo teks)',
      usedIn: 'Judul frame (CATALOG, CUSTOMIZE…), judul halaman.',
      format: 'WOFF2 + lisensi web (opsional)',
      size: 'Weight 300 / 400 / 500',
      files: ['fonts/display-300.woff2'],
      placeholder: 'Inter (Google Fonts) — sudah dipakai.',
      notes: ['Inter sudah final menurut arahan. Isi hanya jika ingin self-host font (lebih cepat & tanpa Google Fonts).']
    },
    {
      id: 'font-ui', group: 'system', kind: 'manual', priority: 'low',
      name: 'Font brand — UI (label, menu, body)',
      usedIn: 'Sidebar, slogan, label kecil, paragraf.',
      format: 'WOFF2 (opsional, self-host)',
      size: 'Weight 300 / 400 / 500 / 600',
      files: ['fonts/ui-400.woff2'],
      placeholder: 'Inter (Google Fonts) — sudah dipakai.',
      notes: []
    },
    {
      id: 'icons-sidebar', group: 'system', kind: 'image', priority: 'low',
      name: 'Icon set Sidebar (8 icon)',
      usedIn: 'Home, Catalog, Custom Furniture, Wholesale, Design Services, Material Bank, Company Profile, Policies.',
      format: 'SVG, 1 warna (currentColor), stroke 1.5',
      size: '24 × 24 viewBox',
      files: ['icons/home.svg'],
      placeholder: 'Icon SVG custom yang sudah dibuat mengikuti mockup (sudah dipakai).',
      notes: ['Opsional — icon sekarang sudah layak. Ganti jika ada set resmi.', 'Nama file: home, catalog, custom, wholesale, design, material, company, policies (.svg).']
    },
    {
      id: 'og-image', group: 'system', kind: 'image', priority: 'medium',
      name: 'Open Graph / share image',
      usedIn: 'Preview saat link dibagikan (WhatsApp, LinkedIn, dll).',
      format: 'JPG ≤ 300 KB',
      size: '1200 × 630 px',
      files: ['social/og-image.jpg'],
      placeholder: 'Belum ada.',
      notes: []
    },

    /* ---------------- Phase 2 — halaman dalam ---------------- */
    {
      id: 'inner-bg', group: 'inner', kind: 'image', priority: 'medium',
      name: 'Background halaman dalam',
      usedIn: 'Catalog, Customize, Wholesale, dsb. (lihat mockup Variant Selection).',
      format: 'WebP / JPG',
      size: '2560 × 1440 px',
      files: ['bg/inner-bg.webp', 'bg/inner-bg.jpg'],
      placeholder: 'Hitam + cahaya lantai (sama dengan homepage).',
      notes: []
    },
    {
      id: 'guide-compass', group: 'inner', kind: 'image', priority: 'low',
      name: 'Icon kompas "GUIDE"',
      usedIn: 'Tab panduan di tepi kanan halaman Customize.',
      format: 'SVG', size: '48 × 48 viewBox',
      files: ['icons/guide-compass.svg'],
      placeholder: 'Belum dibuat (halaman Customize belum dibangun).',
      notes: []
    },
    {
      id: 'variant-icons', group: 'inner', kind: 'image', priority: 'high',
      name: 'Line icon varian produk',
      usedIn: 'Customize → Variant Selection (One/Two/Three Seater, L-Shape, U-Shape, dst).',
      format: 'SVG line, 1 warna', size: '160 × 120 viewBox per icon',
      files: ['variants/sofa-one-seater.svg'],
      placeholder: 'Belum dibuat.',
      notes: ['Butuh daftar varian final per kategori (Sofas, Tables, Beds, Cabinetry).']
    },
    {
      id: 'material-swatches', group: 'inner', kind: 'image', priority: 'high',
      name: 'Foto swatch material',
      usedIn: 'Customize → Material, dan Material Bank.',
      format: 'JPG / WebP', size: '600 × 600 px per SKU',
      files: ['materials/FB01.jpg'],
      placeholder: 'Belum dibuat.',
      notes: ['Per SKU: kode (mis. FB 01), nama warna, tipe (Fabric/Faux Leather/Leather/Special/Outdoor), double rubs, harga/m.']
    },
    {
      id: 'catalog-products', group: 'inner', kind: 'image', priority: 'high',
      name: 'Foto produk katalog',
      usedIn: 'Catalog (grid + detail).',
      format: 'WebP / JPG + PNG cut-out', size: '1600 × 1200 px (4:3) + cut-out transparan',
      files: ['catalog/sample-product.jpg'],
      placeholder: 'Belum dibuat.',
      notes: ['Background seragam (warm grey) agar konsisten.']
    },
    {
      id: 'company-photos', group: 'inner', kind: 'image', priority: 'medium',
      name: 'Foto pabrik & perusahaan',
      usedIn: 'Company Profile.',
      format: 'WebP / JPG', size: '2400 × 1600 px',
      files: ['company/factory-01.jpg'],
      placeholder: 'Belum dibuat.',
      notes: []
    },
    {
      id: 'design-portfolio', group: 'inner', kind: 'image', priority: 'medium',
      name: 'Portfolio proyek desain',
      usedIn: 'Design Services.',
      format: 'WebP / JPG', size: '2400 × 1600 px',
      files: ['design/project-01.jpg'],
      placeholder: 'Belum dibuat.',
      notes: []
    }
  ],

  /* Teks yang masih dummy / perlu konfirmasi */
  copy: [
    { where: 'Header', key: 'Slogan', text: '#1 FURNITURE MANUFACTURER IN INDONESIA', status: 'Dari mockup' },
    { where: 'Frame A', key: 'Judul · subjudul', text: 'CATALOG · Terpercaya dan terbesar di Indonesia', status: 'Dari mockup' },
    { where: 'Frame B', key: 'Judul · subjudul', text: 'CUSTOMIZE · Kalkulasi produk custom dalam hitungan menit', status: 'Dari mockup' },
    { where: 'Frame C', key: 'Judul · subjudul', text: 'WHOLESALE · Harga khusus untuk partai besar & proyek', status: 'Dummy' },
    { where: 'Frame D', key: 'Judul · subjudul', text: 'DESIGN SERVICES · Dari konsep hingga produksi, bersama tim desain kami', status: 'Dummy' },
    { where: 'Halaman Custom', key: 'Tab kategori', text: 'SOFAS · TABLES · BEDS · CABINETRY', status: 'Dari mockup (hanya di halaman Custom)' },
    { where: 'Halaman dalam', key: 'Deskripsi & modul', text: 'Lihat assets/js/config.js → routes', status: 'Dummy' },
    { where: 'SEO', key: 'Meta title & description', text: 'XIONCO Business — #1 Furniture Manufacturer in Indonesia', status: 'Perlu konfirmasi' }
  ],

  /* Keputusan — status per revisi 2 */
  decisions: [
    { topic: 'Hover D', choice: 'D:5, A/B/C:1.', why: 'Dikonfirmasi: implementasi sekarang sudah benar.' },
    { topic: 'Play button', choice: 'Tombol navigasi ke halaman. Selalu terlihat, tepat di bawah orb dan rata tengah terhadap orb. Hanya play button hitam-putih (tombol panah emas dihapus).', why: 'Dikonfirmasi (revisi 2).' },
    { topic: 'Link di homepage', choice: 'Tidak ada. Frame hanya berisi judul + subjudul. Tab kategori muncul di dalam halaman Custom.', why: 'Dikonfirmasi (revisi 2).' },
    { topic: 'Mobile', choice: 'Kartu bertumpuk (gambar 6): kartu aktif di depan, kartu lain berlapis di kiri/kanan. Geser untuk ganti, tap play/kartu untuk masuk.', why: 'Dikonfirmasi (revisi 2). Berlaku untuk semua layar portrait (HP & tablet tegak).' },
    { topic: 'Warna', choice: 'Tidak ada putih. Teks puncak #c2af99, bingkai taupe #978877→#3a332c (diterangi kiri-atas), emas #917a57. Diambil dari sampling piksel mockup.', why: 'Revisi 2: "the white you see is highlight, not white".' },
    { topic: 'Font', choice: 'Inter untuk semua teks. Placeholder logo masih geometris (Jost) karena nanti diganti file logo.', why: 'Revisi 2.' },
    { topic: 'Cahaya bawah frame', choice: 'Garis di bawah layar dihapus. Cahaya yang mengikuti frame aktif dikunci di dalam lebar frame (tidak bocor ke kiri/kanan). Lantai: kolam cahaya hangat di tengah bawah.', why: 'Revisi 2.' },
    { topic: 'Ukuran block', choice: 'Block mengikuti layar (frame ±58% lebar layar, maks 168 px/block).', why: 'Guideline 120 px untuk desain 1920 px; di layar lain tetap proporsional 8 × 4.' },
    { topic: 'Posisi teks frame', choice: 'A: kiri-atas (gambar 1). B–D: kiri-bawah (gambar 5).', why: 'Supaya teks tidak menimpa sofa di Frame A.' },
    { topic: 'Background', choice: 'Rasio 2560 × 1440 (desktop) & 1080 × 1920 (mobile).', why: 'Dikonfirmasi (revisi 2).' },
    { topic: 'Video', choice: 'Video melambat halus saat kursor pergi, mulai lagi saat hover. Di mobile, kartu tengah otomatis berputar.', why: 'Anotasi: animasi hanya berjalan saat frame aktif.' }
  ],

  /* Modul yang akan dibahas berikutnya */
  roadmap: [
    { name: 'Custom calculator', note: 'Variant → Material → Dimension → Quotation, custom fee, private labeling (mockup 7–9).' },
    { name: 'Purchase / checkout', note: 'Keranjang, pembayaran, invoice.' },
    { name: 'UTM & tracking', note: 'Fondasi sudah ada: parameter utm_* disimpan (first & last touch) + event ke window.dataLayer.' },
    { name: 'Catalog', note: 'Grid produk, filter, detail produk.' },
    { name: 'Wholesale', note: 'Harga bertingkat, MOQ, RFQ.' },
    { name: 'Design Services', note: 'Portfolio, booking konsultasi.' },
    { name: 'Material Bank, Company Profile, Policies', note: 'Halaman konten.' }
  ]
};

/* ---- helpers untuk membuat entri frame ---- */
function frameVideo(k, title, subject, orb) {
  var K = k.toUpperCase();
  return {
    id: 'frame-' + k + '-video', group: 'frames', kind: 'video', priority: 'high', frame: k,
    name: 'Frame ' + K + ' — ' + title + ' (video loop)',
    usedIn: 'Main Frame ' + K + '. Diputar hanya saat di-hover.',
    format: 'MP4 (H.264) wajib + WebM (VP9) opsional · tanpa audio · 24–30 fps',
    size: '1200 × 960 px (5:4) · 6–10 detik seamless loop · ≤ 4 MB',
    files: ['frames/frame-' + k + '.webm', 'frames/frame-' + k + '.mp4', 'frames/frame-' + k + '.gif'],
    placeholder: 'Animasi prosedural (canvas): ' + subject + '.',
    focus: orb,
    notes: [
      'Layar = 5 × 4 block → 1 block = 240 px pada 1200 × 960.',
      k === 'a'
        ? 'Titik fokus (sofa) di tengah: (600, 480). Saat frame 1 block, yang terlihat x 480–720.'
        : 'Orb: diameter 240 px, pusat di (960, 480). Saat frame 1 block, yang terlihat hanya x 840–1080.',
      k === 'a'
        ? 'Area teks: kiri-atas (x 120–760, y 120–250). Hindari detail penting di sana.'
        : 'Area teks: kiri-bawah (x 120–760, y 720–840). Hindari detail penting di sana.',
      'Play button (overlay website) di bawah orb: pusat (' + (k === 'a' ? 600 : 960) + ', 690), Ø ±110 px. Biarkan area ini bersih.',
      'Frame pertama = frame terakhir (loop mulus). Hindari kedipan/flash.',
      'Saat frame dibuka menjadi halaman, video diperbesar 1.6×. Agar tetap tajam di layar retina, export 2000 × 1600 bila ukuran file memungkinkan (≤ 6 MB).'
    ]
  };
}
function framePoster(k, title) {
  var K = k.toUpperCase();
  return {
    id: 'frame-' + k + '-poster', group: 'frames', kind: 'image', priority: 'high', frame: k,
    name: 'Frame ' + K + ' — ' + title + ' (poster / still)',
    usedIn: 'Tampil sebelum di-hover & saat video dimuat.',
    format: 'WebP atau JPG, ≤ 200 KB',
    size: '1200 × 960 px (5:4) — sama dengan frame pertama video',
    files: ['frames/frame-' + k + '-poster.webp', 'frames/frame-' + k + '-poster.jpg'],
    placeholder: 'Frame diam dari animasi prosedural.',
    notes: []
  };
}
function frameMobile(k, title) {
  var K = k.toUpperCase();
  return {
    id: 'frame-' + k + '-mobile', group: 'frames', kind: 'video', priority: 'low', frame: k,
    name: 'Frame ' + K + ' — ' + title + ' (versi mobile, portrait)',
    usedIn: 'Kartu di HP / tablet tegak (kartu bertumpuk).',
    format: 'MP4 (H.264), tanpa audio',
    size: '960 × 1200 px (4:5) · ≤ 3 MB',
    files: ['frames/frame-' + k + '-mobile.mp4'],
    placeholder: 'Versi desktop di-crop otomatis (cover).',
    notes: ['Orb: pusat (480, 408) — tengah horizontal — diameter 240 px.', 'Play button di bawah orb: pusat ±(480, 640), Ø ±145 px.', 'Teks overlay di kiri-bawah (y 1000–1150).']
  };
}

/* ==========================================================================
   Asset resolver — dipakai website & ledger
   ========================================================================== */
window.XIONCO_ASSETS = (function () {
  var M = window.XIONCO_MANIFEST;
  var cache = {};

  function byId(id) {
    for (var i = 0; i < M.assets.length; i++) if (M.assets[i].id === id) return M.assets[i];
    return null;
  }
  function url(file) { return M.base + file; }

  /* maksimal 4 pengecekan berjalan bersamaan (server lokal tidak kebanjiran request) */
  var running = 0, queue = [];
  function limit(fn) {
    return new Promise(function (res) {
      queue.push(function () {
        running++;
        fn().then(function (v) { running--; res(v); if (queue.length) queue.shift()(); });
      });
      if (running < 4) queue.shift()();
    });
  }

  function probeImage(src) {
    return limit(function () { return probeImageRaw(src); });
  }
  function probeVideo(src) {
    return limit(function () { return probeVideoRaw(src); });
  }
  function probeImageRaw(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(true); };
      img.onerror = function () { res(false); };
      img.src = src;
    });
  }
  function probeVideoRaw(src) {
    return new Promise(function (res) {
      var v = document.createElement('video'), done = false;
      function fin(ok) {
        if (done) return; done = true;
        v.removeAttribute('src'); try { v.load(); } catch (e) {}
        res(ok);
      }
      v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = function () { fin(true); };
      v.onerror = function () { fin(false); };
      setTimeout(function () { fin(false); }, 9000);
      v.src = src;
    });
  }

  /* Resolve → Promise<string|null> (URL file pertama yang ada) */
  function resolve(id) {
    if (cache[id]) return cache[id];
    var a = byId(id);
    if (!a || a.kind === 'manual') return (cache[id] = Promise.resolve(null));
    var files = a.files.slice();
    cache[id] = (function next() {
      if (!files.length) return Promise.resolve(null);
      var src = url(files.shift());
      var isVideo = /\.(mp4|webm|mov)$/i.test(src);
      if (isVideo) {
        var v = document.createElement('video');
        var type = /\.webm$/i.test(src) ? 'video/webm' : 'video/mp4';
        if (!v.canPlayType(type)) return next();
      }
      return (isVideo ? probeVideo(src) : probeImage(src)).then(function (ok) { return ok ? src : next(); });
    })();
    return cache[id];
  }

  return { byId: byId, resolve: resolve, url: url };
})();
