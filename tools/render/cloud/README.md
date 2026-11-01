# Render Galeri di GPU sewaan

Komputer kantor hanya mengemas dan mengunggah file (±0,8 GB). Render berjalan di GPU sewaan (RTX 4090), lalu hasilnya diunduh.
Pembanding: Galeri B1 penuh (180 frame, 1600×900, 96 sampel) di CPU kantor (Ryzen 5 5600G) ±151 detik per frame, ±9,4 jam.

## Sekali saja

1. Buat akun di **runpod.io** dan isi saldo. Akun dan pembayaran dibuat sendiri oleh pemilik.
2. RunPod › **Settings › SSH Public Keys**: tempel isi file `C:\Users\M\.ssh\id_ed25519.pub` (kunci publik, aman dibagikan).

## Tiap kali render

1. Klik dua kali `tools\render\cloud\pack.cmd` → `output\cloud\xionco-render.tar`. Buat ulang bila skrip atau aset berubah.
2. RunPod › **Pods › Deploy**: GPU **RTX 4090**, **Community Cloud**, template **RunPod PyTorch**, Volume disk **20 GB** → **Deploy On-Demand**.
3. Pod › **Connect** › salin baris **SSH over exposed TCP** (`ssh root@<ip> -p <port> …`) dan kirim ke Claude di chat.
   Claude menjalankan langkah 4–6. Bila dikerjakan sendiri, ganti `<ip>` dan `<port>`:
4. Unggah:
   ```
   scp -P <port> output/cloud/xionco-render.tar tools/render/cloud/run-gpu.sh root@<ip>:/workspace/
   ```
5. Render (tetap jalan walau koneksi putus):
   ```
   ssh -p <port> root@<ip> "cd /workspace && nohup bash run-gpu.sh galeryB1 --frames 0-179 --size 1600x900 --samples 96 > run.out 2>&1 &"
   ssh -p <port> root@<ip> "tail -5 /workspace/run.out"
   ```
6. Unduh dan buka di folder proyek (hasil masuk ke `output\galeri\<skrip>\`):
   ```
   scp -P <port> root@<ip>:/workspace/hasil-galeryB1.tar output/cloud/
   tar -xf output/cloud/hasil-galeryB1.tar
   ```
7. **Terminate** pod di RunPod. Pod yang hanya di-Stop tetap ditagih untuk penyimpanannya.

## Contoh perintah render

| Render | Argumen untuk `run-gpu.sh` |
|---|---|
| Galeri B1 penuh | `galeryB1 --frames 0-179 --size 1600x900 --samples 96` |
| Galeri B2 penuh | `galeryB2 --frames 0-179 --size 1600x900 --samples 96` |
| Galeri v12, foto semua room | `galery12 --stills --size 1600x900 --samples 96` |
| Galeri v12, satu room | `galery12 --stills ruang2-besar --size 1600x900 --samples 96` |

## Cara kerjanya

- `pack.js` mengemas yang dibaca skrip Galeri: `tools/render/*.py`, `tools/render/art`, `assets/items`, `assets/library`,
  `assets/galeri/sets.json`, `data/products.json`, `data/source/render-lib`.
- `run-gpu.sh` membuka paket, memasang Blender seri 5.2 untuk Linux dari download.blender.org (sekali per pod),
  menjalankan skrip dengan `--gpu`, lalu mengemas hasil ke `/workspace/hasil-<skrip>.tar` walau render berhenti di tengah.
- `rlib.cycles()` memakai GPU hanya bila ada `--gpu` (atau env `XC_GPU=1`): OptiX, lalu CUDA; tanpa GPU kembali ke CPU.
  Render di komputer kantor tidak berubah.
- Harga acuan Okt 2026: RTX 4090 Community Cloud ±US$0,34 per jam; cek harga saat menyewa.
