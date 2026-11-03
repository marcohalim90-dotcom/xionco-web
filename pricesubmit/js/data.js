/* ==========================================================================
   XIONCO v4 — Data (sama dengan v3: produk, harga, gambar, konten)
   Sumber: xionco.com (gambar & nama produk) dan xionco.shop (harga, Okt 2026).
   Gambar dipanggil langsung dari xionco.com (website milik XIONCO sendiri).
   ========================================================================== */
window.XV = window.XV || {};

XV.WA = '6282240408055';                       // WhatsApp resmi (xionco.com)
XV.SHOP = 'https://xionco.shop/';
XV.IMG = 'https://www.xionco.com/wp-content/uploads/';

/* Logo XIONCO (path asli dari xionco.com/logo.svg, viewBox 0 0 206 28) */
XV.LOGO = 'M0.584 0.971998H5.012L21.968 27H17.504L0.584 0.971998ZM0.224 27L9.26 12.852L10.952 16.236L4.544 27H0.224ZM11.06 11.592L17.396 0.971998H21.608L12.932 14.508L11.06 11.592ZM38.3221 0.971998H41.8141V27H38.3221V0.971998ZM59.0615 14.004C59.0615 12.204 59.3975 10.512 60.0695 8.928C60.7655 7.32 61.7255 5.904 62.9495 4.68C64.1735 3.432 65.5775 2.46 67.1615 1.764C68.7695 1.044 70.4975 0.684 72.3455 0.684C74.1695 0.684 75.8735 1.044 77.4575 1.764C79.0655 2.46 80.4815 3.432 81.7055 4.68C82.9535 5.904 83.9255 7.32 84.6215 8.928C85.3175 10.512 85.6655 12.204 85.6655 14.004C85.6655 15.852 85.3175 17.58 84.6215 19.188C83.9255 20.796 82.9535 22.212 81.7055 23.436C80.4815 24.636 79.0655 25.584 77.4575 26.28C75.8735 26.952 74.1695 27.288 72.3455 27.288C70.4975 27.288 68.7695 26.952 67.1615 26.28C65.5775 25.608 64.1735 24.672 62.9495 23.472C61.7255 22.272 60.7655 20.868 60.0695 19.26C59.3975 17.652 59.0615 15.9 59.0615 14.004ZM62.6615 14.04C62.6615 15.408 62.9135 16.692 63.4175 17.892C63.9215 19.068 64.6175 20.112 65.5055 21.024C66.3935 21.936 67.4255 22.656 68.6015 23.184C69.7775 23.688 71.0495 23.94 72.4175 23.94C73.7615 23.94 75.0215 23.688 76.1975 23.184C77.3735 22.656 78.3935 21.936 79.2575 21.024C80.1215 20.112 80.8055 19.068 81.3095 17.892C81.8135 16.692 82.0655 15.396 82.0655 14.004C82.0655 12.636 81.8135 11.352 81.3095 10.152C80.8055 8.928 80.1095 7.86 79.2215 6.948C78.3335 6.036 77.3015 5.328 76.1255 4.824C74.9495 4.296 73.6895 4.032 72.3455 4.032C70.9775 4.032 69.7055 4.296 68.5295 4.824C67.3535 5.352 66.3215 6.072 65.4335 6.984C64.5455 7.896 63.8615 8.964 63.3815 10.188C62.9015 11.388 62.6615 12.672 62.6615 14.04ZM125.475 27.828L105.351 7.416L106.359 7.668L106.431 27H102.939V0.179998H103.119L123.027 20.664L122.199 20.484L122.127 0.971998H125.583V27.828H125.475ZM163.575 25.056C163.143 25.344 162.555 25.668 161.811 26.028C161.067 26.388 160.191 26.688 159.183 26.928C158.199 27.168 157.119 27.288 155.943 27.288C153.927 27.264 152.103 26.904 150.471 26.208C148.863 25.512 147.495 24.564 146.367 23.364C145.239 22.164 144.363 20.784 143.739 19.224C143.139 17.64 142.839 15.96 142.839 14.184C142.839 12.24 143.151 10.452 143.775 8.82C144.423 7.164 145.323 5.736 146.475 4.536C147.627 3.312 148.983 2.364 150.543 1.692C152.127 1.02 153.855 0.684 155.727 0.684C157.287 0.684 158.703 0.899999 159.975 1.332C161.247 1.74 162.339 2.232 163.251 2.808L161.847 6.048C161.127 5.568 160.251 5.112 159.219 4.68C158.211 4.248 157.083 4.032 155.835 4.032C154.563 4.032 153.363 4.284 152.235 4.788C151.107 5.292 150.111 6 149.247 6.912C148.383 7.824 147.699 8.892 147.195 10.116C146.715 11.316 146.475 12.612 146.475 14.004C146.475 15.42 146.691 16.74 147.123 17.964C147.579 19.164 148.215 20.208 149.031 21.096C149.871 21.984 150.879 22.68 152.055 23.184C153.231 23.688 154.551 23.94 156.015 23.94C157.335 23.94 158.511 23.736 159.543 23.328C160.575 22.92 161.427 22.464 162.099 21.96L163.575 25.056ZM179.226 14.004C179.226 12.204 179.562 10.512 180.234 8.928C180.93 7.32 181.89 5.904 183.114 4.68C184.338 3.432 185.742 2.46 187.326 1.764C188.934 1.044 190.662 0.684 192.51 0.684C194.334 0.684 196.038 1.044 197.622 1.764C199.23 2.46 200.646 3.432 201.87 4.68C203.118 5.904 204.09 7.32 204.786 8.928C205.482 10.512 205.83 12.204 205.83 14.004C205.83 15.852 205.482 17.58 204.786 19.188C204.09 20.796 203.118 22.212 201.87 23.436C200.646 24.636 199.23 25.584 197.622 26.28C196.038 26.952 194.334 27.288 192.51 27.288C190.662 27.288 188.934 26.952 187.326 26.28C185.742 25.608 184.338 24.672 183.114 23.472C181.89 22.272 180.93 20.868 180.234 19.26C179.562 17.652 179.226 15.9 179.226 14.004ZM182.826 14.04C182.826 15.408 183.078 16.692 183.582 17.892C184.086 19.068 184.782 20.112 185.67 21.024C186.558 21.936 187.59 22.656 188.766 23.184C189.942 23.688 191.214 23.94 192.582 23.94C193.926 23.94 195.186 23.688 196.362 23.184C197.538 22.656 198.558 21.936 199.422 21.024C200.286 20.112 200.97 19.068 201.474 17.892C201.978 16.692 202.23 15.396 202.23 14.004C202.23 12.636 201.978 11.352 201.474 10.152C200.97 8.928 200.274 7.86 199.386 6.948C198.498 6.036 197.466 5.328 196.29 4.824C195.114 4.296 193.854 4.032 192.51 4.032C191.142 4.032 189.87 4.296 188.694 4.824C187.518 5.352 186.486 6.072 185.598 6.984C184.71 7.896 184.026 8.964 183.546 10.188C183.066 11.388 182.826 12.672 182.826 14.04Z';

/* Kategori koleksi (urutan = urutan di galeri horizontal) */
/* Produk & kategori ada di js/catalog.js — dibuat dari xionco.shop oleh tools/import-shop.js.
   (Daftar lama dari xionco.com disimpan di data/source/v5-legacy-products.js.) */

/* Museboard (foto proyek dari xionco.com) */
XV.MUSE = [
  { img: '2025/08/2-4.png', title: 'Electrical solution', note: 'Meeting room · VAZRA' },
  { img: '2025/08/3-4.png', title: 'Idea comes true', note: 'Dari sketsa ke produksi' },
  { img: '2025/08/4-4.png', title: 'Let there be light', note: 'Commercial lighting' },
  { img: '2025/08/5-2.png', title: 'Custom ceiling', note: 'Ruang rapat' },
  { img: '2025/08/6-2.png', title: 'Lighting design', note: 'Koridor hotel' },
  { img: '2025/08/7-1.png', title: 'Luxurious', note: 'Living room' },
  { img: '2025/05/XIONCO-HERO-PRODUCT-II-1.png', title: 'Leather detail', note: 'Material honesty' },
  { img: '2025/05/ChatGPT-Image-May-16-2025-06_29_52-AM.png', title: 'Solid wood', note: 'Jepara · Mantingan' },
  { img: '2023/06/HERO-PHOTO-PRODUCT-XIONCO-2023-4.png', title: 'Living with light', note: 'AETHER series' }
];

/* For Business — layanan */
XV.SERVICES = [
  { n: '01', title: 'Space Plan', note: 'Tata ruang & alur kerja kantor, retail, hospitality', img: '2025/08/Solusi-Design-untuk-Project-Anda.jpg' },
  { n: '02', title: 'Product', note: 'Furnitur standar & custom dalam jumlah besar', img: '2025/08/1-3.png' },
  { n: '03', title: 'Interior', note: 'Desain & visualisasi interior lengkap', img: '2025/08/9.png' },
  { n: '04', title: 'Built-in', note: 'Kabinet, panel dinding, plafon & kelistrikan custom', img: '2025/08/8.png' }
];

XV.CLIENTS = ['SOGO', 'H&M', 'BRI', 'BCA', 'TRANS7', 'NEO SOHO', 'FORBES INDONESIA'];

/* Pabrik (dari halaman About xionco.com) */
XV.FACTORIES = [
  { n: '01', place: 'Jepara · Mantingan', role: 'Pengolahan kayu', text: 'Curing bahan baku dan pembuatan komponen kayu.', lon: 110.67, lat: -6.59 },
  { n: '02', place: 'Cirendeu', role: 'Finishing & metal', text: 'Finishing, pengelasan, lini multiboard / HPL.', lon: 106.76, lat: -6.31 },
  { n: '03', place: 'Pondok Pinang I', role: 'Upholstery', text: 'Jahit, busa, dan pelapisan kain / kulit.', lon: 106.78, lat: -6.27 },
  { n: '04', place: 'Pondok Pinang II', role: 'Final & packaging', text: 'Quality control, pengemasan, dan pengiriman.', lon: 106.79, lat: -6.28 }
];

/* Custom Studio — CUBIX Modular (harga = ESTIMASI DEMO, bukan harga resmi) */
XV.STUDIO = {
  seatPrice: 1250000,
  armPrice: 450000,
  ottomanPrice: 890000,
  seatW: 72, armW: 16, depth: 86, height: 74,
  fabrics: [
    { id: 'fb01', code: 'FB 01', name: 'Graphite', color: '#4a4846', type: 'fabric' },
    { id: 'fb02', code: 'FB 02', name: 'Ash', color: '#8d8a86', type: 'fabric' },
    { id: 'fb03', code: 'FB 03', name: 'Oat', color: '#c7bba7', type: 'fabric' },
    { id: 'fb04', code: 'FB 04', name: 'Sand', color: '#b39b78', type: 'fabric' },
    { id: 'fb05', code: 'FB 05', name: 'Moss', color: '#5f6450', type: 'fabric' },
    { id: 'fb06', code: 'FB 06', name: 'Clay', color: '#8e5d45', type: 'fabric' },
    { id: 'fl01', code: 'FL 01', name: 'Ink Leather', color: '#262423', type: 'leather' },
    { id: 'fl02', code: 'FL 02', name: 'Cognac Leather', color: '#7b4a2c', type: 'leather' }
  ],
  leatherFactor: 1.2,
  bases: [
    { id: 'oak', name: 'Oak', color: '#c8a678', add: 0 },
    { id: 'walnut', name: 'Walnut', color: '#5a3d2b', add: 250000 },
    { id: 'steel', name: 'Black steel', color: '#1d1c1b', add: 150000 },
    { id: 'brass', name: 'Brass', color: '#b8924f', add: 450000 }
  ]
};

/* Ukuran thumbnail WordPress yang tersedia di xionco.com (sudah dicek satu per satu).
   Kartu, museboard, keranjang & pencarian memakai versi kecil; hero & quick view memakai file asli. */
XV.SIZES = {
  '2025/08/2-4.png': [1024, 768], '2025/08/3-4.png': [1024, 768], '2025/08/4-4.png': [1024, 768],
  '2025/08/5-2.png': [1024, 768], '2025/08/6-2.png': [1024, 768], '2025/08/7-1.png': [1024, 768],
  '2025/05/XIONCO-HERO-PRODUCT-II-1.png': [1024, 768],
  '2025/05/ChatGPT-Image-May-16-2025-06_29_52-AM.png': [768],
  '2023/06/HERO-PHOTO-PRODUCT-XIONCO-2023-4.png': [768],
  '2024/07/XC.com-Thumbnail-4-1.png': [1024, 768], '2024/07/XC.com-Thumbnail-4.png': [768],
  '2023/06/CAMEO.png': [768], '2023/06/XC.com-Thumbnail-7.png': [1024, 768],
  '2023/11/XC.com-Thumbnail-5.png': [1024, 768], '2022/09/XC.com-Thumbnail-8.png': [1024, 768],
  '2024/09/Sofa-Sectional_Main-View_Open.png': [1024, 768], '2023/06/NORA-DC.png': [1024, 768],
  '2023/06/GEOM.png': [768], '2024/07/XC.com-Thumbnail-24.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-25.png': [1024, 768], '2023/06/XC.com-Thumbnail-19.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-20.png': [1024, 768], '2024/07/XC.com-Thumbnail-16.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-27.png': [1024, 768], '2024/12/XC.com-Thumbnail-18.png': [1024, 768],
  '2022/09/RECTA.png': [768], '2023/06/PLUQ.png': [768], '2022/09/XC.com-Thumbnail-21.png': [1024, 768],
  '2023/06/WhatsApp-Image-2024-08-03-at-16.14.45.jpeg': [768], '2024/09/Dipan_Nakes_Main.png': [1024, 768],
  '2023/06/LUCID.png': [768], '2024/09/REGALE-Thumbnail-6.png': [768], '2023/06/AETHER-K100.png': [768],
  '2023/06/AETHER-K80.png': [768], '2023/06/URUZ.png': [768], '2023/06/KYOUKAI.png': [768]
};

/* ---------------------------------------------------------------------------
   v3 — cara menampilkan foto produk di UI neon gelap (dicek per gambar):
   knock = latar putih → dibuat transparan lewat filter SVG
   glow  = latar hitam → mix-blend screen
   (lainnya PNG transparan, tampil apa adanya)
   --------------------------------------------------------------------------- */
XV.V3_KNOCK = ['kyrios', 'astral', 'orycto', 'canis', 'verk', 'hout', 'trapezo', 'rouled', 'cubixct', 'arze', 'l7', 'hexter', 'somno'];
XV.V3_DARK = ['eorde', 'ashara'];

/* Outline Pulau Jawa & Madura (lon, lat) untuk peta titik 3D */
XV.JAVA = [[105.21, -6.75], [105.46, -6.62], [105.86, -6.02], [106.1, -6], [106.6, -6.03], [106.85, -6.1], [107.1, -5.95], [107.45, -6.1], [107.85, -6.2], [108.2, -6.25], [108.35, -6.4], [108.55, -6.72], [109, -6.85], [109.45, -6.85], [109.7, -6.88], [110.1, -6.88], [110.42, -6.95], [110.6, -6.75], [110.68, -6.5], [110.95, -6.42], [111.1, -6.62], [111.45, -6.68], [111.95, -6.8], [112.35, -6.9], [112.6, -6.92], [112.75, -7.15], [112.85, -7.55], [113.3, -7.7], [113.85, -7.68], [114.15, -7.7], [114.45, -7.8], [114.42, -8.2], [114.6, -8.75], [114.3, -8.62], [113.8, -8.5], [113.3, -8.3], [112.7, -8.35], [112.2, -8.32], [111.6, -8.25], [111.05, -8.2], [110.6, -8.05], [110.2, -7.95], [109.7, -7.78], [109.3, -7.7], [108.9, -7.7], [108.55, -7.72], [108.2, -7.78], [107.75, -7.65], [107.4, -7.5], [106.95, -7.4], [106.45, -7.38], [106.35, -7], [106, -6.86], [105.6, -6.85]];
XV.MADURA = [[112.7, -6.9], [113.3, -6.88], [113.95, -6.9], [114.1, -7.05], [113.7, -7.2], [113.05, -7.22], [112.75, -7.12]];
