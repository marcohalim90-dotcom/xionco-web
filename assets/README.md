# Folder aset

Tempat file aset yang Anda siapkan. Daftar lengkap ("PR aset") ada di
**Developer Settings › Aset** — lengkap dengan nama file, ukuran, dan format.

```
assets/
  items/<id-item>/foto-utama.png      wajib · PNG latar transparan · min. 2000 × 2000 px
  items/<id-item>/foto-depan.png      …dan file lain sesuai daftar
  items/<id-item>/model.glb           model 3D asli · menggantikan foto di panggung (bisa diputar)
  brand/logo.svg
  materials/<kode>/albedo.jpg
  env/studio.hdr
```

Setelah file disimpan, buka Developer Settings › Aset › **Pindai folder aset**.
Aset yang ditemukan tercentang otomatis; foto utama dan model 3D langsung dipakai situs.

Model 3D dari SketchUp (.skp) tidak bisa dibaca browser — ekspor dulu ke GLB
(ekstensi "glTF Exporter") atau COLLADA .dae / .fbx / .obj, lalu dikonversi ke GLB.
Hapus figur manusia (Sumele) sebelum ekspor. Satuan cm/inci dikoreksi otomatis;
bila model menghadap ke arah yang salah, isi "Putar model" di Katalog › edit item.
(Aset versi 1 ada di `v1/assets/`.)

## Pustaka CC0 (`assets/library/`)

Aset bebas lisensi (CC0) yang dipakai situs & render Blender — sumber dan pembuat ada di
`LICENSE.txt` tiap folder:

```
library/textures/<set>/{albedo,normal,rough}.webp   tekstur kain, kulit, kayu, logam, batu, anyaman (v5/js/texlib.js)
library/hdri/*_512.hdr                               cahaya lingkungan panggung 3D (dimuat malas)
library/hdri/*_2k.hdr                                hanya untuk tools/render (tidak ikut online)
library/polyhaven/throw_pillows_01/                  bantal hias (v5/js/parts.js)
```
Albedo kain & kayu disimpan abu-abu ternormal: warna hex pilihan pelanggan yang mewarnainya.
