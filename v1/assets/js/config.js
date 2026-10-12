/* ==========================================================================
   XIONCO BUSINESS — Site configuration
   Semua angka motion & konten halaman dalam bisa diubah di sini.
   ========================================================================== */
window.XIONCO_CONFIG = {
  version: '0.1.0',

  /* Tampilkan dock DEV (Grid guideline, Ledger, Replay intro). Set false saat production. */
  dev: true,

  /* Cek otomatis apakah file aset (assets/media/...) sudah ada. Lihat manifest.js */
  probeAssets: true,

  /* ---- Block system (Guideline Main Frame) ----------------------------------
     1 block = lebar 1, tinggi 4. Guideline: 1 block = 120px pada desain 1920px.
     Di layar, ukuran block mengikuti viewport (±58% lebar layar, seperti mockup). */
  block: {
    design: 120,         // px, referensi guideline
    min: 44,
    max: 168,
    widthRatio: 0.0705,  // u = vw × ratio
    heightRatio: 0.135   // u = (vh - header) × ratio  (diambil yang terkecil)
  },
  frame: {
    span: 8,             // lebar main frame (block)
    depth: 4,            // tinggi main frame (block)
    expanded: 5,         // ukuran frame saat hover
    idle: [4, 2, 1, 1]   // Default Frame — A:4 | B:2 | C:1 | D:1
  },

  /* ---- Motion -------------------------------------------------------------- */
  motion: {
    hover: { k: 118, c: 21 },   // spring frame saat hover (stiffness / damping)
    enter: { k: 56, c: 14.6 },  // spring saat frame membuka halaman
    rail:  { k: 420, c: 41 },   // garis emas mengikuti frame
    hoverIntent: 45,            // ms sebelum hover dianggap disengaja
    leaveDelay: 200,            // ms sebelum kembali ke Default Frame
    tilt: { x: 1.1, y: 1.5 }    // derajat kemiringan frame mengikuti kursor
  },

  intro: { enabled: true },

  /* ---- Routes / halaman ----------------------------------------------------
     panel: index frame (0=A,1=B,2=C,3=D). Halaman tanpa panel memakai backdrop netral. */
  routes: {
    home: { label: 'Home' },

    catalog: {
      panel: 0, index: '01', label: 'Catalog', title: 'Catalog',
      lede: 'Koleksi furnitur XIONCO yang siap diproduksi — dari sofa hingga cabinetry. Terpercaya dan terbesar di Indonesia.',
      tabs: ['Sofas', 'Chairs', 'Tables', 'Beds', 'Cabinetry'],
      modules: ['Grid produk & filter kategori', 'Detail produk & galeri', 'Spesifikasi material & dimensi', 'Purchase / checkout']
    },

    custom: {
      panel: 1, index: '02', label: 'Custom Furniture', title: 'Customize',
      lede: 'Rancang furnitur sesuai kebutuhan — pilih varian, material, dan dimensi, lalu dapatkan kalkulasi harga dalam hitungan menit.',
      tabs: ['Sofas', 'Tables', 'Beds', 'Cabinetry'],
      modules: ['Variant selection', 'Material selection', 'Dimension', 'Current calculation & quotation', 'Custom fee & private labeling']
    },

    wholesale: {
      panel: 2, index: '03', label: 'Wholesale', title: 'Wholesale',
      lede: 'Program pembelian partai besar untuk proyek, reseller, dan private label — dengan harga bertingkat.',
      tabs: ['Project', 'Reseller', 'Private Label'],
      modules: ['Tiered pricing & MOQ', 'Request for quotation', 'Private label program', 'Jadwal produksi & pengiriman']
    },

    'design-services': {
      panel: 3, index: '04', label: 'Design Services', title: 'Design Services',
      lede: 'Tim desain kami mendampingi dari konsep, gambar kerja, hingga produksi.',
      tabs: ['Residential', 'Commercial', 'Hospitality'],
      modules: ['Portfolio proyek', 'Paket layanan desain', 'Booking konsultasi', 'Brief & upload referensi']
    },

    'material-bank': {
      index: '05', label: 'Material Bank', title: 'Material Bank', icon: 'material',
      lede: 'Perpustakaan material XIONCO — fabric, faux leather, leather, special fabric, dan outdoor.',
      tabs: ['Fabric', 'Faux Leather', 'Leather', 'Special Fabric', 'Outdoor'],
      modules: ['Swatch library', 'Filter jenis & warna', 'Spesifikasi (double rubs, komposisi)', 'Request sample']
    },

    'company-profile': {
      index: '06', label: 'Company Profile', title: 'Company Profile', icon: 'company',
      lede: 'Mengenal XIONCO — pabrik, kapasitas produksi, sertifikasi, dan klien kami.',
      tabs: ['About', 'Factory', 'Certification', 'Clients'],
      modules: ['Tentang kami', 'Fasilitas produksi', 'Sertifikasi', 'Klien & proyek']
    },

    policies: {
      index: '07', label: 'Policies', title: 'Policies', icon: 'policies',
      lede: 'Kebijakan garansi, pengiriman, pembayaran, dan privasi.',
      tabs: ['Warranty', 'Shipping', 'Payment', 'Privacy'],
      modules: ['Garansi', 'Pengiriman', 'Pembayaran', 'Privasi & cookies']
    }
  }
};
