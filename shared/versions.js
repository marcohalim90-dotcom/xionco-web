/* ==========================================================================
   XIONCO — Daftar versi & checkpoint
   Dibaca oleh Developer Settings (tab Versi). Versi lama TIDAK PERNAH dihapus;
   setiap versi baru / perubahan besar menambah entri di sini.
   Checkpoint baru dibuat dengan:  node tools/checkpoint.js <folder> "catatan"
   (alat itu menyalin folder ke checkpoints/ dan menambah entri otomatis)

   type: current | version | checkpoint | fun
   path: relatif terhadap root proyek
   ========================================================================== */
window.XIONCO_VERSIONS = /*VERSIONS*/[
  {
    "id": "v5",
    "name": "Versi 5",
    "title": "Maison — kotak seragam + Developer Settings",
    "path": "v5/index.html",
    "date": "2026-10-12",
    "type": "current",
    "note": "Gaya kotak seragam (navigator, deskripsi, panel, rincian), kursor baru, panel developer: versi, aset, katalog, custom."
  },
  {
    "id": "v4",
    "name": "Versi 4",
    "title": "Maison — satu layar, panggung 3D",
    "path": "v4/index.html",
    "date": "2026-10-12",
    "type": "version",
    "note": "Navigator kiri melebar, kotak deskripsi kanan menulis ulang, bar rincian + harga, koleksi tampil di panggung."
  },
  {
    "id": "v4-draft1",
    "name": "Versi 4 · draf 1",
    "title": "Maison — ruang berganti (ditolak)",
    "path": "dist/XIONCO-v4-Maison-draft1.html",
    "date": "2026-10-12",
    "type": "checkpoint",
    "note": "Draf pertama v4 yang masih berpindah ruang. Disimpan sebagai arsip."
  },
  {
    "id": "v3",
    "name": "Versi 3",
    "title": "Neon — for fun",
    "path": "v3/index.html",
    "date": "2026-10-12",
    "type": "fun",
    "note": "Gaya game neon. Tidak dipakai, disimpan untuk hiburan tim."
  },
  {
    "id": "v2",
    "name": "Versi 2",
    "title": "Editorial one-page",
    "path": "v2/index.html",
    "date": "2026-10-11",
    "type": "version",
    "note": "Halaman panjang GSAP + Lenis, pembuka wordmark XIONCO."
  },
  {
    "id": "v1",
    "name": "Versi 1",
    "title": "Accordion homepage",
    "path": "v1/index.html",
    "date": "2026-10-11",
    "type": "version",
    "note": "Homepage frame A–D sesuai mockup awal + Asset Ledger."
  }
]/*END*/;
