# XIONCO.COM

Website company profile XIONCO Business. HTML/CSS/JS murni, tanpa build step.

> **Versi 5 — Maison XIONCO (terbaru):** `v5/index.html` — lihat [Versi 5](#versi-5). **Developer Settings** (Ctrl+Shift+D) ada di semua versi — lihat [Developer Settings](#developer-settings).
> Versi 4: `v4/` · Versi 3 (neon, for fun): `v3/` · Versi 2: `v2/` · Versi 1: `v1/`. Alamat utama (`/`) langsung membuka versi 5.
>
> Server lokal: `node tools/serve.js` → http://localhost:5173 (→ v5), /v1/ … /v5/ · Online: lihat [Online](#online-hosting).

## Versi 1

Semua file versi 1 ada di folder `v1/` (dipindah dari root agar alamat utama bisa membuka versi terbaru).

## Cara membuka
- **Langsung:** double-click `v1/index.html` (Chrome / Edge).
- **Lewat server lokal** (disarankan, mirip kondisi online):
  ```
  node tools/serve.js
  ```
  lalu buka http://localhost:5173/v1/

Asset Ledger: `v1/ledger.html` (atau tombol **LEDGER** di pojok kanan bawah website, shortcut `L`).

## Preview 1 file (untuk dikirim / presentasi)
```
node tools/build-preview.js
```
Hasil: `dist/XIONCO-Homepage-Preview.html` — semua CSS & JS dalam satu file, tanpa tombol DEV.
Jalankan ulang perintah ini setiap kali ada perubahan. Font Inter dimuat dari Google Fonts (butuh internet;
tanpa internet otomatis memakai font sistem).

## Perilaku utama
- **Desktop / landscape:** Main Frame 8 × 4 block (accordion). Hover = frame membesar, video berjalan.
- **Play button** = tombol ke halaman. Selalu terlihat, di bawah orb.
- **HP / tablet tegak:** kartu bertumpuk (gambar 6). Geser untuk ganti kartu, tap kartu tengah / play untuk masuk.
- Warna tanpa putih: teks puncak #c2af99, emas #917a57, bingkai taupe (lihat :root di xionco.css).

## Struktur
```
v1/index.html           Homepage + kerangka semua halaman
v1/ledger.html          Asset Ledger (daftar aset, spesifikasi video, keputusan, roadmap)
v1/assets/
  css/xionco.css        Style utama
  css/ledger.css        Style ledger
  js/config.js          ← Ubah di sini: motion, ukuran block, teks halaman dalam, tombol DEV
  js/manifest.js        ← Daftar aset (sumber data ledger + auto-detect)
  js/xionco.js          Engine interaksi (accordion, garis emas, routing, intro, sidebar)
  js/scenes.js          Animasi placeholder frame A–D (otomatis diganti video asli)
  js/ledger.js          Renderer ledger
  media/                ← Taruh aset di sini (brand/, bg/, frames/, …)
```

## Menambah aset
Simpan file dengan nama persis seperti di ledger, misalnya `v1/assets/media/frames/frame-b.mp4`,
lalu refresh. Website langsung memakai video tersebut dan ledger menandainya **Ready**.

## Shortcut (mode DEV)
| Tombol | Fungsi |
|---|---|
| `G` | Grid block 8 × 4 + guideline orb + info ukuran |
| `L` | Buka Asset Ledger |
| `R` | Putar ulang intro |
| `←` `→` / `1`–`4` | Pilih frame |
| `Enter` / `Esc` | Masuk halaman / kembali |

Matikan mode DEV untuk production: `dev: false` di `v1/assets/js/config.js`
(sekalian `probeAssets: false` setelah semua aset final, agar tidak ada request cek file).

## Tracking
Parameter `utm_*`, `gclid`, `fbclid`, `ttclid` disimpan (first touch: localStorage, last touch: sessionStorage).
Event dikirim ke `window.dataLayer` (siap untuk Google Tag Manager):
`xc_page_view`, `xc_frame_click`, `xc_nav_click`.

---

## Versi 2

Website utuh satu halaman panjang dengan desain baru: **`v2/index.html`** (buka langsung atau via
`http://localhost:5173/v2/index.html`). Tidak menyentuh file versi 1.

```
v2/
  index.html      Struktur semua section + overlay (quick view, keranjang, pencarian, menu)
  css/v2.css      Style (token warna di :root — tanpa putih murni, aksen brass)
  js/data.js      ← Ubah di sini: produk & harga (dari xionco.shop), museboard, layanan, pabrik, harga Studio
  js/app.js       Semua interaksi & animasi
```

**Library** (CDN jsDelivr, cadangan otomatis ke unpkg): GSAP 3.13 + ScrollTrigger, Lenis 1.3 (smooth scroll).
Tanpa internet, halaman tetap tampil tanpa animasi.

**Section:** Hero (sofa EORDE + cahaya mengikuti kursor + hotspot) · Trust marquee · Tentang (kalimat
terungkap per kata saat scroll) · Koleksi (galeri horizontal ter-pin, 34 produk, tab kategori, quick view,
keranjang) · Custom Studio (konfigurator CUBIX: dudukan, lengan, ottoman, 8 material, base, siang↔malam,
estimasi harga → WhatsApp) · Pabrik (peta titik Pulau Jawa, alur Jepara → Jakarta, angka berjalan) ·
Museboard (kolom parallax) · For Business (layanan + form → WhatsApp) · Footer (logo dengan spotlight).

**Catatan data**
- Harga produk diambil dari xionco.shop (Okt 2026). Produk tanpa harga → tombol "Tanya" ke WhatsApp.
- Gambar di-hotlink dari xionco.com/wp-content/uploads (kartu memakai thumbnail 768/1024 — `XV.SIZES`).
  Untuk produksi, sebaiknya disalin ke server sendiri.
- Harga di Custom Studio adalah **angka contoh** (`XV.STUDIO` di data.js) — ganti dengan harga resmi.
- Keranjang disimpan di localStorage; checkout = pesan WhatsApp ke 0822-4040-8055.

**Shortcut:** `/` pencarian · `Esc` tutup overlay.


---

## Versi 3 (NEON — untuk seru-seruan tim)

`v3/index.html` — gaya game neon (HUD, XP, pencapaian, suara sintetis). Arah ini **tidak dipakai**,
disimpan untuk hiburan tim. File tunggal: `node tools/build-preview-v3.js` → `dist/XIONCO-v3-Neon-Fun.html`.

---

## Versi 4

**Maison XIONCO** — satu layar, tidak pernah pindah halaman. Sofa CUBIX berdiri di panggung tengah.

- **Navigator kiri** (gaya versi 1): disorot → melebar dengan label. Menyorot menu → **kotak deskripsi di kanan**
  menulis ulang teksnya (efek ketik seperti versi 3); ukuran kotak tetap.
- **Bar rincian di bawah panggung:** nama, detail (dimensi/material/kategori/garansi), dan **harga** yang ditonjolkan,
  plus tombol aksi (Tambah ke tas / Rancang / Penawaran).
- Memilih menu → **panel kanan bergeser masuk** (di HP: dari bawah); panggung tengah tetap.
- **Koleksi:** pilih karya → objek di tengah panggung berganti menjadi produk itu (foto xionco.com
  yang latarnya dihapus otomatis di browser). Detail, harga, tambah ke tas, WhatsApp.
- **Atelier:** rancang CUBIX (komposisi, lengan, ottoman, material, base, suasana) — sofa di tengah
  ikut berubah; estimasi harga → WhatsApp.
- **Manufaktur:** panggung berubah menjadi peta manik emas Pulau Jawa + 4 pabrik.
- **Galeri:** karya terpilih tampil berbingkai di panggung. **Bisnis / Kontak / Tas** di panel kanan.
- Font hanya **Josefin Sans** + **Inter**. Tanpa putih murni.

```
v4/
  index.html      Layar tunggal: navigator, kotak deskripsi, panel kanan (semua isi menu)
  css/v4.css      Gaya
  js/data.js      Data (produk & harga xionco.shop, layanan, pabrik, harga Atelier)
  js/world.js     Panggung 3D (Three.js r147): sofa CUBIX, produk hasil potong latar, karya galeri, peta
  js/app.js       Navigasi, panel, koleksi, tas, atelier, manufaktur, bisnis, galeri
```

File tunggal: `node tools/build-preview-v4.js` → `dist/XIONCO-v4-Maison.html` (butuh internet).
Draf pertama v4 (yang masih pindah-pindah ruang) disimpan di `dist/XIONCO-v4-Maison-draft1.html`.
Harga Atelier = angka contoh (`XV.STUDIO` di `v4/js/data.js`).

---

## Versi 5

Sama dengan versi 4 (satu layar, panggung tengah, navigator kiri, kotak deskripsi kanan, bar rincian + harga),
dengan **satu gaya kotak** untuk navigator, kotak deskripsi, panel kanan, bar rincian, dan notifikasi
(kaca gelap hangat, garis champagne, radius 16). Kursor baru: titik champagne → cincin tipis di atas tombol →
cincin dengan ‹ › di atas sofa yang bisa diputar. Foto katalog di panel dipotong latarnya otomatis.

```
v5/                 index.html · css/v5.css · js/data.js · js/cutout.js · js/world.js · js/app.js
shared/versions.js  Daftar versi & checkpoint (dibaca Developer Settings)
shared/db.js        Database lokal: katalog, pesanan custom, centang aset, pengaturan
shared/devkit/      Developer Settings (dipasang di semua versi)
tools/checkpoint.js Buat checkpoint sebelum merombak
```

File tunggal: `node tools/build-preview-v5.js` → `dist/XIONCO-v5-Maison.html` (Developer Settings tidak ikut).

## Developer Settings

Tombol melayang di **kiri bawah** (bisa diseret ke sudut lain) atau **Ctrl + Shift + D**. Membuka overlay
hampir layar penuh dari kanan — tidak membuka halaman baru. Ada di semua versi (1–5).

| Tab | Isi |
|---|---|
| **Versi** | Semua versi & checkpoint. Klik **Buka** untuk pindah versi. Versi lama tidak pernah dihapus. |
| **Aset** | PR aset dari database item: per item 7 aset (foto utama wajib, tampak depan/samping, close-up, model 3D, dimensi, suasana) + brand, HDRI, dan tekstur material. Simpan file di `assets/items/<id>/…` → **Pindai folder aset** → otomatis tercentang; foto utama langsung dipakai situs. Bisa juga centang manual. Unduh daftar sebagai CSV. |
| **Katalog** | Database item: harga, harga coret, "mulai dari", status (aktif/draft/arsip), bisa custom. Ubah langsung di tabel — situs v5 ikut berubah seketika. Tambah / ubah / duplikat / hapus item, export & import JSON. |
| **Custom** | Pesanan custom 2 tipe: **dari item** (item dasar, ukuran W/D/H, dudukan, lengan, material, rangka, kaki, kenyamanan, fitur, harga, pelanggan, referensi — dengan estimasi otomatis) dan **full custom** (proyek, kategori, ruang, dimensi, gambar kerja, material, kelistrikan, survei/instalasi, anggaran, pelanggan). Status: Draft → Konsultasi → … → Selesai. Export CSV. |
| **Pengaturan** | Posisi tombol, sembunyikan tombol, export / import / hapus data, pintasan. |

Data tersimpan di **browser** (localStorage) — gunakan *Export semua* untuk cadangan atau pindah komputer.

### Checkpoint (sebelum merombak)

```
node tools/checkpoint.js v5 "sebelum rombak koleksi"
```

Menyalin `v5/` ke `checkpoints/5.01.01/` dan menambahkannya ke tab **Versi**. Atau cukup bilang ke Claude: "checkpoint".

**Penomoran:** checkpoint pertama `5.01.01`, berikutnya `5.01.02`, `5.01.03`, … (nomor manual: `--versi 5.02.01`).
Versi mayor baru (`v6/`) hanya bila desainnya sudah benar-benar berbeda. Yang lama tidak pernah dihapus.

## Online (hosting)

Hosting gratis yang selalu ter-update: **GitHub** (menyimpan kode + riwayat) → **Cloudflare Pages** (menayangkan situs).
Setiap perubahan yang di-*push* ke GitHub otomatis online dalam ±1 menit.

- Alamat utama `/` → versi 5. Versi lain tetap bisa dibuka: `/v1/` … `/v5/`, `/checkpoints/5.01.01/`.
- **Developer Settings** disembunyikan dari pengunjung. Aktifkan di browser Anda sekali dengan menambahkan
  `?dev` di akhir alamat (nonaktifkan: `?dev=0`). Data Developer Settings tetap tersimpan per browser.
- `_headers` memberi `noindex` (situs prototipe tidak masuk Google). Hapus baris itu bila situs sudah resmi.
- Pengaturan Cloudflare Pages: *Framework preset* **None**, *Build command* kosong, *Build output directory* `/`.
