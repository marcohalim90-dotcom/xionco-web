# XIONCO — aplikasi Android (Trusted Web Activity)

Aplikasi ini membuka situs Maison XIONCO (v5) **layar penuh**, tanpa bilah alamat browser, memakai Chrome di HP.
Semua fitur situs ikut berjalan: 3D, Customize, Ruang, tas dan pembayaran.
Karena isinya situs, setiap push ke GitHub langsung terlihat di aplikasi tanpa perlu membuat versi aplikasi baru.

## File
| File | Isi |
|---|---|
| `dist/XIONCO-1.0.0.apk` | Untuk review: kirim ke HP lalu instal (izinkan "instal dari sumber tidak dikenal"). |
| `dist/XIONCO-1.0.0.aab` | Untuk Google Play Console (format wajib Play Store). |
| `app/build.gradle` | Alamat situs (`TWA.host`), nama paket `com.xionco.maison`, versi. |
| `../../.well-known/assetlinks.json` | Bukti kepemilikan domain. Tanpa file ini, bilah alamat Chrome tetap muncul. |
| `../../data/private/android/` | **Kunci tanda tangan + kata sandi. Hanya lokal, jangan hilang, jangan dibagikan.** Cadangkan ke tempat aman: tanpa kunci ini aplikasi di Play Store tidak bisa diperbarui. |

## Membuat ulang
```bash
cd apps/android
./gradlew assembleRelease bundleRelease
```
Hasilnya ada di `app/build/outputs/apk/release/` dan `app/build/outputs/bundle/release/`. Naikkan `versionCode` setiap kali mengunggah ke Play Store.

Ikon aplikasi dan ikon PWA dibuat ulang dengan `node apps/android/tools/icons.js`.

## Rencana Google Play
1. **Domain resmi.** Ganti `TWA.host` di `app/build.gradle` ke domain resmi (mis. `xionco.com`), lalu taruh `assetlinks.json` di `https://<domain>/.well-known/assetlinks.json`.
2. **Akun Google Play Console.** Biaya pendaftaran sekali bayar. Lengkapi profil developer; akun pribadi baru wajib uji tertutup dulu dengan sejumlah penguji selama beberapa hari sebelum produksi.
3. **Play App Signing.** Unggah `.aab`. Google menyimpan kunci rilis, sedangkan kunci di `data/private/android` menjadi *upload key*. Setelah itu tambahkan sidik jari SHA-256 dari **App signing key** (dari Play Console) ke `assetlinks.json`, di samping sidik jari yang sudah ada.
4. **Isi toko.** Ikon 512 px (`store/icon-512.png`), grafik fitur 1024×500, minimal 2 tangkapan layar HP, deskripsi singkat dan lengkap, kategori Belanja/Rumah.
5. **Kebijakan.** URL kebijakan privasi (wajib), formulir Keamanan Data (data yang dikumpulkan: nama, WA, alamat untuk pesanan), rating konten, dan target audiens dewasa.
6. **Uji.** Uji internal → uji tertutup → produksi.

Catatan: target SDK aplikasi ini 36. Google menaikkan batas minimum target SDK tiap tahun, jadi saat membuat versi baru periksa syarat terbaru di Play Console.
