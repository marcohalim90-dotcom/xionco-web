# Render foto produk (Blender)

Membuat foto produk realistis dari rancangan **Customize** (model parametrik `v5/js/maker.js`)
dan model 3D katalog (`assets/items/<id>/model.glb`), tanpa Claude, berjalan di komputer sendiri.

```
jobs.json ──► export.js (Chrome tanpa layar) ──► output/glb/<id>.glb
                                                     │
                                  render.py (Blender Cycles) ──► output/renders/<id>/<tampilan>.webp + .jpg
```

## Yang dibutuhkan (sekali saja)

| Alat | Catatan |
|---|---|
| **Node.js** LTS | https://nodejs.org |
| **Google Chrome** (atau Edge) | dipakai tanpa layar untuk membangun model persis seperti di situs |
| **Blender 4.2 atau lebih baru** | dicari otomatis di `%LOCALAPPDATA%\Programs\Blender\…` dan `C:\Program Files\Blender Foundation\…`; kalau di tempat lain isi variabel `BLENDER` dengan path `blender.exe` |
| Internet | saat pertama (`npm install puppeteer-core`) dan saat ekspor (Three.js dimuat dari CDN, sama seperti situs) |

## Cara menjalankan

**Klik dua kali `run.bat`** di folder `tools\render`. Selesai.

Atau dari terminal di folder ini:

```
run.bat                      semua job di jobs.json, kualitas penuh
run.bat -Proof               cek cepat: 960×720, 32 sampel → output\renders-proof
run.bat -Only kyrios,tv-walnut-brass
run.bat -Samples 256 -Size 2400x1800
run.bat -Force               buat ulang walau file sudah ada
```

* Prosesnya **bisa dihentikan kapan saja** (tutup jendela / Ctrl+C). Saat dijalankan lagi, GLB dan
  foto yang sudah jadi **dilewati** — lanjut dari yang belum.
* Catatan proses: `output\render-log.txt`. Folder `output\` tidak ikut git maupun situs online.

## Hasil

```
output/glb/<id>.glb          model + tekstur (skala meter) — bisa juga dibuka di Blender / viewer glTF
output/glb/<id>.json         ukuran (m), tekstur yang dipakai, konfigurasi lengkap
output/renders/<id>/34.webp       tampak 3/4 depan        (+ 34.jpg)
output/renders/<id>/front.webp    tampak depan
output/renders/<id>/side.webp     tampak samping
output/renders/<id>/detail.webp   close-up (lengan / tepi / pegangan), ruang tajam sempit
```

## Menambah job (`jobs.json`)

```json
{
  "defaults": { "views": ["34", "front", "side", "detail"], "size": [1600, 1200], "samples": 128,
                "look": "dark", "hdri": "studio_small_09_2k.hdr" },
  "jobs": [
    { "id": "sofa-boucle-cream", "cfg": { "cat": "kursi", "sub": "sofa", "uph": "boucle", "color": "cream", "arm": "pillow" } },
    { "id": "kyrios", "productId": "kyrios", "look": "ivory", "views": ["34", "front"] }
  ]
}
```

* `id` — nama folder hasil (huruf kecil, tanda minus, tanpa spasi).
* `cfg` — pilihan Customize. Wajib `cat` + `sub`; pilihan lain opsional (yang tidak diisi = bawaan).
  Nama pilihan sama dengan di `v5/js/custom-spec.js`, contoh:
  * kategori/sub: `kursi` (sofa, chaise, armchair, bench, dining, stool, ottoman), `meja` (dining, coffee,
    side, console, desk), `kabinet` (tv, sideboard, wardrobe, bookshelf, shoe, nightstand), `divan` (divan, platform, headboard)
  * kain `uph`: vienna, cherokee, boucle, velvet, linen, chenille, pet, leather — `color` sesuai daftar warnanya
  * kayu `wood`: oak, walnut, teak, ash, mahogany, ebony · logam `metal`: black, brass, champagne, stainless, gunmetal, ivory
  * batu `stone`: carrara, calacatta, nero, travertine, terrazzo, slate
  * ukuran dalam cm: `w`, `d`, `h`, `seatH` …
  * `"open": true` — pintu / laci kabinet dirender terbuka.
* Cara termudah mendapat `cfg` lengkap: rancang di situs (Customize › **Simpan**), lalu salin
  dari Developer Settings › Custom, atau dari `output/glb/<id>.json` job lain.
* `productId` — produk katalog yang punya model 3D (`assets/items/<id>/model.glb`).
* Per job boleh menimpa `views`, `size`, `samples`, `look`, `hdri`.

## Pengaturan kualitas

| Pengaturan | Nilai | Keterangan |
|---|---|---|
| `samples` | 32 cek · **128 standar** · 256–512 katalog/cetak | Denoiser (OpenImageDenoise) selalu aktif; di atas 256 jarang terlihat bedanya |
| `size` | 1600×1200 standar · 2400×1800 besar | waktu naik sebanding jumlah piksel |
| `look` | `dark` (latar gelap hangat XIONCO) · `ivory` (latar terang) | |
| `hdri` | `studio_small_09_2k.hdr` · `brown_photostudio_02_2k.hdr` | cahaya lingkungan & pantulan, di `assets/library/hdri` (CC0) |

Lain-lain (di `render.py`): lampu kunci area lembut kanan-depan + lampu rim belakang + HDRI, warna
**AgX** (Medium High Contrast), lantai & dinding cyclorama melengkung sehingga bayangan kontak alami.
Kamera dibingkai otomatis dari ukuran objek; objeknya yang diputar per tampilan sehingga cahaya &
latar selalu sama. GPU (NVIDIA OptiX/CUDA, AMD HIP, Intel oneAPI) dipakai otomatis bila ada; kalau
tidak, CPU.

## Perkiraan waktu (diukur di komputer ini: AMD Ryzen 5 5600G, CPU saja — GPU Radeon terpadu tidak didukung Cycles)

| Pengaturan | per foto |
|---|---|
| cek cepat 960×720, 32 sampel (`-Proof`) | ± 13 detik → 12 job × 4 tampilan ± 12 menit |
| standar 1600×1200, 128 sampel | ± 2–2,5 menit → 1 job (4 tampilan) ± 9 menit, 12 job ± 1 jam 45 menit |
| besar 2400×1800, 256 sampel | ± 8–10 menit per foto (perkiraan) |

Dengan kartu grafis NVIDIA/AMD yang didukung, biasanya 5–20× lebih cepat. Ekspor GLB < 1 detik per job.

## Masalah umum

* **"Chrome / Edge tidak ditemukan"** — isi variabel `CHROME` dengan path `chrome.exe`.
* **"Blender tidak ditemukan"** — isi variabel `BLENDER` dengan path `blender.exe`.
* **Ekspor gagal memuat** — perlu internet (Three.js dari CDN jsDelivr/unpkg).
* **Warna / material berbeda dari situs** — tekstur diambil dari `assets/library/textures`; ekspor
  ulang dengan `-Force` setelah material di situs diubah.
* Model tanpa lampu / latar? Pastikan file `assets/library/hdri/*_2k.hdr` ada (tidak ikut situs online,
  tetapi ada di repo).

Lisensi aset: semua tekstur & HDRI CC0 (Poly Haven / ambientCG) — lihat `LICENSE.txt` di tiap folder
`assets/library/…`. Model referensi FurniMesh (`data/source/furnimesh`) **tidak** dipakai.
