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
