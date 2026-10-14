# Tugas berikutnya (rencana checkpoint 5.01.03)

Dikerjakan satu per satu, berurutan. Status: ☐ belum · ◐ sedang · ☑ selesai

| # | Tugas | Status |
|---|---|---|
| 1 | **Panel Customize** — scroll tidak meloncat setelah memilih; urutan & pengelompokan pilihan dari yang terpenting, yang berkaitan bersebelahan (mis. bentuk kaki → material kaki → tinggi kaki) | ☑ |
| 2 | **Background** — yang sekarang diberi nama "Default", garis horizon dibuat lembut (blur); tambah background "Studio" | ☑ |
| 3 | **KYRIOS** — bila lebih panjang, jumlah channel (buluk) bertambah, bukan channel yang di-stretch | ☑ |
| 4 | **Pencahayaan** — preset yang sudah teruji + mode manual: jenis lampu, jumlah, posisi, brightness & warna masing-masing | ☑ |
| 5 | **Tambah ke preview** — selain Simpan, rancangan bisa ditambahkan ke panggung sehingga beberapa furnitur tampil bersama dalam satu tampilan (atur posisi) | ☑ |
| 6 | **Meja** — referensi baru; sub-kategori & varian lebih banyak; meja kerja: pilihan & kombinasi diperbaiki; pilihan alas piring/piring tampil atau tidak. Sub baru: meja kantor, eksekutif, counter, resepsionis, bar, rias, nesting (`spec-meja.js` · `mk-meja.js`) | ☑ |
| 7 | **Kabinet** — referensi baru; sub-kategori lebih banyak; tata letak fleksibel: editor per kolom (pintu / laci / terbuka, posisi laci) + preset. Sub baru: laci susun/dresser, display & bar, kabinet gantung, lemari serbaguna/pantry (`spec-kabinet.js` · `mk-kabinet.js`) | ☑ |
| 8 | **Divan & tempat tidur** — referensi baru; jenis baru: ranjang susun, loft, sorong (trundle), daybed, kanopi/four-poster, ranjang anak (`spec-divan.js` · `mk-divan.js`) | ☑ |
| 9 | **Render** — periksa & selesaikan hasil agen render (tekstur, HDRI, efek) + uji skrip foto Blender | ☑ |
| 10 | Line drawing dibuat ulang untuk semua perubahan → checkpoint 5.01.03 → push (setelah konfirmasi) | ◐ |

## Juga (14–15 Okt 2026)
- File SKP XIONCO (55) → Blender → `assets/items/<id>/model.glb` (49 produk). KYRIOS tetap memakai aset lama (lebih bagus).
- 9 produk lokal tanpa foto (AETHER K40/K60/SKY, ASTRAL 1 seater, CUBIX Kayu Gelap ×5) — `local: true`, dipertahankan oleh `tools/import-shop.js`.
- Perbaikan pipeline: material SKP tembus pandang → opaque; piping ASTRAL dilengkapi (cermin); rangka/dudukan CUBIX tanpa material → kayu/kain.
- Pencahayaan: Pengaturan › Efek render Klasik (bawaan, seperti semula) / Realistis (HDRI + bayangan kontak + AO).
- Background baru Garis & Neon dengan kotak warna (xv5_bg, xv5_bgc_grid, xv5_bgc_neon).
- Line drawing dibuat ulang (1.189 gambar). Sisa tugas 10: checkpoint 5.01.03 + push (tunggu konfirmasi).
