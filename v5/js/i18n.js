/* ==========================================================================
   Maison XIONCO v5 — Bahasa (Indonesia / English)
   Teks sumber ditulis dalam Bahasa Indonesia. XI18N.T('teks') mengembalikan
   terjemahan Inggris bila bahasa = en (atau teks asli bila tidak ada di kamus).
   Teks statis di HTML diterjemahkan otomatis (node teks + placeholder/aria-label/
   title); teks buatan skrip memanggil T() dan dirender ulang saat bahasa berganti
   (event 'xi18n:change'). Pilihan tersimpan di localStorage 'xv5_lang'.
   Nama produk & deskripsi dari xionco.shop tidak diterjemahkan.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'xv5_lang';
  var lang = 'en';   // 31 Okt (C85, pemilik): bawaan selalu English; Bahasa Indonesia hanya bila dipilih di Pengaturan
  try { lang = localStorage.getItem(KEY) === 'id' ? 'id' : 'en'; } catch (e) {}

  var EN = {
    // umum & navigasi
    'Beranda': 'Home', 'Koleksi': 'Collection', 'Manufaktur': 'Manufacture', 'Bisnis': 'Business', 'Galeri': 'Gallery', 'Kontak': 'Contact', 'Informasi': 'Information', 'Tentang & ketentuan': 'About & policies', 'Tentang': 'About', 'Garansi': 'Warranty', 'Pengembalian': 'Returns', 'Privasi': 'Privacy', 'Syarat': 'Terms', 'Tentang XIONCO, garansi, pengembalian, privasi, dan syarat belanja.': 'About XIONCO, warranty, returns, privacy, and terms of purchase.',
    'Konsultasi': 'Consult', 'Navigasi': 'Navigation', 'Aksi': 'Action', 'Tutup panel': 'Close panel', 'Kembali': 'Back',
    'Kembali ke posisi awal': 'Back to starting view', 'Maison XIONCO — beranda': 'Maison XIONCO — home',
    'Pengaturan': 'Settings', 'Profil': 'Profile', 'Tas belanja': 'Shopping bag', 'Tas': 'Bag', 'Produk': 'Product',
    // kotak deskripsi
    'Furnitur minimalis dengan pengerjaan tanpa kompromi — dirancang dan diproduksi sendiri di empat pabrik kami di Jawa.': 'Minimalist furniture with uncompromising craft — designed and made in our own four factories in Java.',
    '{n} karya · 4 pabrik · garansi 3 tahun': '{n} pieces · 4 factories · 3-year warranty',
    '34 karya · 4 pabrik · garansi 3 tahun': '34 pieces · 4 factories · 3-year warranty',
    '01 — Koleksi': '01 — Collection', '02 — Atelier': '02 — Atelier', '03 — Manufaktur': '03 — Manufacture', '04 — Bisnis': '04 — Business', '05 — Galeri': '05 — Gallery', '06 — Kontak': '06 — Contact',
    'Sofa, meja, tempat tidur, kabinet, lampu, hingga kelistrikan VAZRA. Pilih satu karya — ia akan tampil di panggung.': 'Sofas, tables, beds, cabinets, lighting and VAZRA electricals. Choose a piece — it takes the stage.',
    '{n} karya · harga & varian xionco.shop': '{n} pieces · xionco.shop prices & variants',
    'Rancang sofa modular CUBIX: komposisi, material, base, hingga suasana ruang. Estimasi langsung, penawaran via WhatsApp.': 'Design the CUBIX modular sofa: composition, material, base and room mood. Instant estimate, quotation via WhatsApp.',
    '8 material · 4 base · 3 suasana': '8 materials · 4 bases · 3 moods',
    'Empat pabrik di Jawa — dari pengolahan kayu di Jepara hingga pengemasan di Jakarta Selatan.': 'Four factories in Java — from woodworking in Jepara to packing in South Jakarta.',
    '30+ sofa per hari · 80+ pekerja': '30+ sofas a day · 80+ craftspeople',
    'Space plan, produk dalam jumlah besar, interior, dan built-in untuk kantor, hotel, dan retail. Penawaran dalam 1 jam.': 'Space planning, volume orders, interiors and built-ins for offices, hotels and retail. Quotation within 1 hour.',
    'Cicilan 0% · garansi 3 tahun': '0% instalments · 3-year warranty',
    'Proyek dan inspirasi: solusi kelistrikan ruang rapat, pencahayaan, plafon custom, hingga detail material.': 'Projects and inspiration: meeting-room power, lighting, custom ceilings and material details.',
    '{n} karya terpilih': '{n} selected works',
    'Showroom di Jl. Ciputat Raya No. 8, Jakarta Selatan. Konsultasi privat tanpa biaya melalui WhatsApp.': 'Showroom at Jl. Ciputat Raya No. 8, South Jakarta. Free private consultation via WhatsApp.',
    'Tas Anda': 'Your bag', 'Karya yang Anda pilih. Lanjutkan ke pembayaran kapan saja.': 'The pieces you chose. Continue to payment any time.',
    'Harga mengikuti xionco.shop': 'Prices follow xionco.shop',
    'Pembayaran': 'Payment', 'Periksa pesanan, isi data pengiriman, lalu pilih metode pembayaran.': 'Review your order, add delivery details, then choose a payment method.',
    'Transaksi aman': 'Secure transaction',
    'Ukuran, material, dan detail sesuai ruang Anda — diproduksi di pabrik kami sendiri.': 'Size, material and details made for your space — produced in our own factories.',
    'Penawaran dalam 1 jam kerja': 'Quotation within 1 working hour',
    'Bahasa dan tema tampilan. Tersimpan di perangkat ini.': 'Language and display theme. Saved on this device.', 'Bahasa, tampilan, dan informasi tentang XIONCO.': 'Language, display, and information about XIONCO.', 'Tampilan & informasi': 'Display & information', 'Cerita, pabrik & perusahaan': 'Story, workshop & company', 'Masa jaminan per material': 'Coverage by material', 'Retur 5 hari & dana kembali': '5-day returns & refunds', 'Data yang kami terima & simpan': 'Data we receive & keep', 'Harga, bayar, kirim & custom': 'Pricing, payment, delivery & custom',
    'Akun Anda': 'Your account', 'Pesanan dan permintaan custom Anda di perangkat ini.': 'Your orders and custom requests on this device.',
    // rincian panggung
    'Harga': 'Price', 'Dimensi': 'Dimensions', 'Material': 'Material', 'Estimasi': 'Estimate', 'Penawaran': 'Quote', 'Rancang': 'Design',
    'Varian': 'Variant', 'Laci': 'Drawers', 'Tanpa Laci': 'Without drawers', 'Kategori': 'Category', 'Terjual': 'Sold', 'Garansi': 'Warranty', '3 tahun': '3 years', 'Kirim': 'Delivery',
    '1–3 hari kerja': '1–3 working days', 'Mulai': 'From', 'mulai': 'from', 'hemat': 'save', 'Hemat': 'Save', 'Beli': 'Buy', 'Tanya': 'Ask',
    'Tanya harga': 'Ask price', 'Melalui penawaran': 'On request', 'Foto menyusul': 'Photo coming soon',
    'Halo XIONCO, saya ingin tahu harga {name} ({type}).': 'Hello XIONCO, I would like the price of {name} ({type}).',
    'Tahap': 'Stage', '{n} dari IV': '{n} of IV', 'Proses': 'Process', 'Pulau Jawa': 'Java', '4 pabrik · Jepara → Jakarta Selatan': '4 factories · Jepara → South Jakarta',
    'Kapasitas': 'Capacity', '30+ sofa per hari': '30+ sofas a day', 'Tim': 'Team', '80+ pekerja & kreatif': '80+ makers & creatives',
    'Karya': 'Work', 'Diskusikan': 'Discuss',
    'Halo XIONCO, saya tertarik dengan proyek seperti "{title}" ({note}).': 'Hello XIONCO, I am interested in a project like "{title}" ({note}).',
    // koleksi & produk
    'Semua': 'All', 'Seats': 'Seats', 'Tables': 'Tables', 'Bedframe': 'Bedframe', 'Cabinet': 'Cabinet', 'Lighting': 'Lighting', 'Decor': 'Decor', 'Smart': 'Smart',
    'Cari sofa, meja, lampu…': 'Search sofas, tables, lamps…', 'Cari di koleksi': 'Search the collection', 'Tidak ada karya yang cocok.': 'No matching pieces.',
    '01 · Koleksi': '01 · Collection', '{n} terjual': '{n} sold', 'Pengiriman': 'Delivery', 'Rancang komposisi Anda →': 'Design your composition →',
    'Halo XIONCO, saya ingin tahu lebih lanjut tentang {name} ({type}).': 'Hello XIONCO, I would like to know more about {name} ({type}).',
    'Lihat di xionco.shop': 'View on xionco.shop', 'Overview': 'Overview', 'Specification': 'Specification', 'Measurements': 'Measurements', 'Materials': 'Materials', 'Manuals': 'Care', 'Description': 'Description', 'More details': 'More details', 'Isi paket': 'In the box', 'Rangka': 'Frame', 'Pelapis': 'Upholstery', 'Ukuran keseluruhan': 'Overall dimension', 'P × L × T (panjang × lebar/dalam × tinggi)': 'W × D × H (width × depth × height)', 'Belum ada data.': 'No data yet.', 'Advance': 'Advance', 'Tata di ruangan Anda': 'Arrange it in your room', 'Chat WhatsApp XIONCO': 'Chat with XIONCO on WhatsApp', 'Hapus filter': 'Clear filter', 'Jumlah dudukan': 'Seats', 'More variants': 'More variants', 'Lebih sedikit': 'Show less', 'Detail di xionco.com': 'Details on xionco.com',
    'Warna & material': 'Colour & material', 'Ukuran & opsi': 'Size & options', 'Kayu': 'Wood', 'Warna kain': 'Fabric colour', 'Konfigurasi CUBIX': 'CUBIX configuration', 'Konfigurasi': 'Configuration', 'Info layout': 'Info layout', 'Urungkan': 'Undo', 'Ruangan': 'Room', 'Gaya': 'Style', 'Italian': 'Italian', 'Quiet luxury': 'Quiet luxury', 'Parisian': 'Parisian', 'Dark luxe': 'Dark luxe', 'Limewash': 'Limewash', 'Panel walnut': 'Walnut panels', 'Walnut smoked': 'Smoked walnut', 'Travertine': 'Travertine', 'Calacatta': 'Calacatta', 'Nero marquina': 'Nero marquina', 'Boiserie': 'Boiserie', 'Oak lebar': 'Wide oak', 'Grey oak': 'Grey oak', 'Walnut': 'Walnut', 'Herringbone': 'Herringbone', 'Karya seni': 'Artwork', 'Lukisan kecil': 'Small painting', 'Rak + buku': 'Shelf + books', 'Perapian': 'Fireplace', 'Pohon pot batu': 'Tree in stone pot', 'Buku': 'Books', 'Lampu lantai': 'Floor lamp', 'Tanpa': 'None', 'Ruang makan': 'Dining', 'Tembok belakang': 'Back wall', 'Tembok kiri': 'Left wall', 'Lantai': 'Floor', 'Plafon': 'Ceiling', 'Finishing': 'Finish', 'Warna': 'Colour', 'Tambah di titik ini': 'Add at this spot', 'Karpet': 'Rug', 'Dekor': 'Decor', 'Cat': 'Paint', 'Wallpaper': 'Wallpaper', 'Plester krem': 'Beige plaster', 'Bata putih': 'White brick', 'Marmer': 'Marble', 'Kayu': 'Wood', 'Parket': 'Parquet', 'Laminate': 'Laminate', 'Teraso': 'Terrazzo', 'Keramik': 'Tiles', 'Beton': 'Concrete', 'Polos': 'Plain', 'Lukisan': 'Painting', 'Cermin': 'Mirror', 'Jendela': 'Window', 'Rak dinding': 'Wall shelf', 'Panel slat': 'Slat panel', 'Lampu dinding': 'Wall light', 'Lampu gantung': 'Pendant', 'Chandelier': 'Chandelier', 'Downlight': 'Downlights', 'Lampu AETHER': 'AETHER lamp', 'Tanaman besar': 'Large plant', 'Tanaman kecil': 'Small plant', 'Vas': 'Vase', 'Ganti lukisan': 'Change painting', 'Warna tirai': 'Curtain colour', 'Lebar ruang': 'Room width', 'Dalam ruang': 'Room depth', 'Objek': 'Object', 'Animate': 'Animate', 'Grid layout': 'Grid layout', 'Pilih tipe, lalu klik kotak untuk menambah atau mengganti. Depan sofa ada di bawah.': 'Pick a type, then click a square to add or replace. The front of the sofa is at the bottom.', 'Depan': 'Front', 'Ulangi': 'Redo', 'Diurungkan': 'Undone', 'Diulangi': 'Redone', 'Semua pilihan di panel kanan': 'All options in the right panel', 'Pilihan panjang di kotak sebelah panel': 'Long option lists in a box beside the panel', 'Kotak info di kanan side panel': 'Info box right of the side panel', 'Tampilkan ukuran': 'Show dimensions', 'Reset tampilan': 'Reset view', 'Putar 45°': 'Rotate 45°', 'Hapus dari ruang': 'Remove from room', 'Hapus modul': 'Remove module', 'Panggung': 'Stage', 'Ruang tamu': 'Living room', 'Keluarga': 'Family room', 'Kamar tidur': 'Bedroom', 'Ruang kerja': 'Study', 'Ganti isi ruang?': 'Replace room?', 'Geser di panggung untuk memindahkan; klik tengah (tombol roda) di furnitur untuk memutar, di latar untuk menggeser tampilan.': 'Drag on the stage to move; middle-click (wheel button) a piece to rotate it, or the background to pan.', 'Konfigurasi CUBIX ditambahkan ke ruang': 'CUBIX configuration added to the room', 'Tambahkan modul lalu geser di panggung — modul menempel satu sama lain. Ketuk modul untuk memutar, membalik atau menghapus.': 'Add modules, then drag them on the stage — they snap to each other. Tap a module to rotate, flip or remove it.', 'Preset': 'Presets', 'Tambah modul': 'Add module', 'Modul terpilih': 'Selected module', 'Putar 90°': 'Rotate 90°', 'Balik': 'Flip', 'Duplikat': 'Duplicate', 'Rincian harga': 'Price breakdown', 'Hemat {v} dengan harga paket': 'Save {v} with set prices', 'Sudut L': 'L corner', 'Bentuk U': 'U shape', 'Set lengkap': 'Full set', 'Kosongkan': 'Clear', '{n} modul': '{n} modules', 'Belum ada modul — pilih preset atau tambah modul.': 'No modules yet — pick a preset or add a module.', 'Ketuk modul di panggung untuk mengubahnya.': 'Tap a module on the stage to edit it.', 'Pengaturan, konfigurasi CUBIX, dan alat lainnya.': 'Settings, CUBIX configuration and more tools.', 'Faux leather': 'Faux leather', 'Fabric': 'Fabric', 'Leather': 'Leather',
    'Tambah ke tas': 'Add to bag', 'Beli langsung': 'Buy now', '‹ Sebelumnya': '‹ Previous', 'Berikutnya ›': 'Next ›',
    'Kurangi': 'Decrease', 'Tambah': 'Add', 'Hapus': 'Remove', '{name} × {q} ditambahkan ke tas': '{name} × {q} added to bag',
    // tas & pembayaran
    'Tas masih kosong.': 'Your bag is empty.', 'Lihat koleksi': 'View collection', 'Subtotal': 'Subtotal',
    'Lanjut ke pembayaran': 'Continue to payment', 'Atau belanja di xionco.shop': 'Or shop at xionco.shop',
    'Ringkasan pesanan': 'Order summary', 'Data pengiriman': 'Delivery details', 'Nama': 'Name', 'Alamat lengkap': 'Full address', 'Kota': 'City',
    'Kode pos': 'Postal code', 'Catatan (opsional)': 'Notes (optional)', 'Metode pembayaran': 'Payment method', 'Bayar sekarang': 'Pay now',
    'Dikonfirmasi tim kami': 'Confirmed by our team', 'Total': 'Total', 'Metode': 'Method', 'Kirim ke': 'Ship to',
    'Mohon lengkapi nama, WhatsApp, alamat, dan kota.': 'Please fill in name, WhatsApp, address and city.',
    'Pilih metode pembayaran.': 'Choose a payment method.', 'Memproses…': 'Processing…',
    'Pembayaran gagal. Silakan coba lagi atau pilih metode lain.': 'Payment failed. Please try again or choose another method.',
    'Pembayaran diproses aman melalui payment gateway resmi.': 'Payments are processed securely through an official payment gateway.',
    'Pembayaran berhasil': 'Payment successful', 'Pesanan tersimpan': 'Order saved',
    'Nomor pesanan {id}. Terima kasih — tim kami segera memproses pesanan Anda.': 'Order number {id}. Thank you — our team will process your order shortly.',
    'Nomor pesanan {id}. Pembayaran online segera aktif — selesaikan pembayaran dengan konfirmasi melalui WhatsApp.': 'Order number {id}. Online payment is coming soon — complete your payment by confirming via WhatsApp.',
    'Halo XIONCO, saya ingin menyelesaikan pembayaran pesanan {id}:': 'Hello XIONCO, I would like to complete payment for order {id}:',
    'Konfirmasi via WhatsApp': 'Confirm via WhatsApp', 'Lihat pesanan saya': 'View my orders',
    'Virtual account': 'Virtual account', 'QRIS': 'QRIS', 'Semua e-wallet & m-banking': 'Any e-wallet & mobile banking', 'Kartu kredit / debit': 'Credit / debit card',
    'E-wallet': 'E-wallet', 'Cicilan 0%': '0% instalments', 'Kartu kredit & paylater': 'Credit card & paylater',
    'Menunggu pembayaran': 'Awaiting payment', 'Dibayar': 'Paid', 'Gagal': 'Failed',
    // custom
    'Ubah ukuran, material, warna, atau detail. Tim kami menghitung penawaran resmi dalam 1 jam kerja.': 'Change the size, material, colour or details. Our team prepares an official quotation within 1 working hour.',
    'Ukuran (cm)': 'Size (cm)', 'Lebar': 'Width', 'Dalam': 'Depth', 'Tinggi': 'Height', 'Material & detail': 'Material & details',
    'Velvet': 'Velvet', 'Boucle': 'Bouclé', 'Kulit asli': 'Genuine leather', 'Kayu solid': 'Solid wood', 'Lainnya': 'Other', 'Warna': 'Colour',
    'Sesuai produk': 'As shown', 'Kaki kayu': 'Wooden legs', 'Kaki besi': 'Steel legs', 'Kaki kuningan': 'Brass legs', 'Base tertutup': 'Closed base',
    'Kaki / base': 'Legs / base', 'Jumlah': 'Quantity', 'Catatan': 'Notes', 'Kirim permintaan': 'Send request', 'Lainnya (tulis di catatan)': 'Other (write in notes)',
    'Permintaan dikirim melalui WhatsApp resmi XIONCO.': 'Requests are sent through the official XIONCO WhatsApp.',
    'Mohon lengkapi nama dan nomor WhatsApp yang valid.': 'Please enter your name and a valid WhatsApp number.',
    'Halo XIONCO, saya {name} ({phone}) ingin custom {item}:': 'Hello XIONCO, I am {name} ({phone}) and would like a custom {item}:',
    'Ukuran': 'Size', 'Permintaan terkirim — tim kami membalas dalam 1 jam kerja.': 'Request sent — our team replies within 1 working hour.',
    // customize
    '02 — Customize': '02 — Customize', '02 · Customize': '02 · Customize',
    'Rancang furnitur sesuai ruang Anda — kursi, sofa, meja, kabinet, hingga divan. Bentuk, ukuran, material, dan detail langsung terlihat dalam 3D.': 'Design furniture for your space — chairs, sofas, tables, cabinets and beds. Shape, size, material and details appear live in 3D.',
    '4 kategori · 18 jenis · estimasi langsung': '4 categories · 18 types · instant estimate',
    'Kayu terang': 'Light wood', 'Langkah': 'Step', 'dipilih': 'selected', 'Lanjut': 'Next', 'Jenis': 'Type',
    'Pilih jenis furnitur yang ingin Anda rancang. Setiap pilihan langsung terlihat dalam 3D di panggung.': 'Choose what you would like to design. Every choice appears live in 3D on the stage.',
    'Estimasi mulai': 'Estimate from', 'Berdasarkan': 'Based on', 'Angka estimasi — harga final melalui penawaran resmi tim XIONCO.': 'Estimate only — final price by official XIONCO quotation.',
    'Rancangan terkirim': 'Design sent', 'Tim kami membalas dalam 1 jam kerja melalui WhatsApp. Rancangan juga tersimpan di Profil.': 'Our team replies within 1 working hour via WhatsApp. Your design is also saved in Profile.',
    'Buat rancangan baru': 'Start a new design', 'Jumlah unit': 'Quantity', 'Dibutuhkan pada': 'Needed by', 'Kisaran anggaran': 'Budget range',
    'Referensi (link Pinterest / foto)': 'Reference (Pinterest / photo link)', 'Referensi': 'Reference', 'Kirim rancangan': 'Send design',
    'Rancangan & estimasi dikirim ke tim XIONCO melalui WhatsApp. Penawaran dalam 1 jam kerja.': 'Your design and estimate go to the XIONCO team via WhatsApp. Quotation within 1 working hour.',
    'Custom dari': 'Customising', 'Rancangan 3D': '3D design', 'Produk asli': 'Original', 'Mulai dari nol': 'Start from scratch',
    'Tidak ada pilihan tambahan untuk jenis ini.': 'No further options for this type.',
    'Halo XIONCO, saya {name} ({phone}) ingin custom:': 'Hello XIONCO, I am {name} ({phone}) and would like a custom piece:',
    'Belum tahu': 'Not sure yet', '< IDR 5 juta': '< IDR 5 million', 'IDR 5–15 juta': 'IDR 5–15 million', 'IDR 15–50 juta': 'IDR 15–50 million', '> IDR 50 juta': '> IDR 50 million',
    'Pencahayaan': 'Lighting', 'rincian': 'details', 'Lihat rincian': 'See breakdown', 'Rincian estimasi': 'Estimate breakdown',
    'Per unit': 'Per unit', 'Total estimasi': 'Estimated total', 'Selesai': 'Done', 'Link referensi': 'Reference link', 'Pilih': 'Choose', 'Tidak ada': 'None', 'Bagian customize': 'Customize sections',
    // pengaturan & profil
    'Bahasa': 'Language', 'Tema': 'Theme', 'Gelap': 'Dark', 'Terang': 'Light',
    'Masuk untuk menyimpan alamat, pesanan, dan permintaan custom di semua perangkat.': 'Sign in to keep your addresses, orders and custom requests on every device.',
    'Masuk / Daftar': 'Sign in / Register', 'Pesanan': 'Orders', 'Belum ada pesanan.': 'No orders yet.', 'Permintaan custom': 'Custom requests',
    'Belum ada permintaan custom.': 'No custom requests yet.', 'item': 'items', 'Terkirim': 'Sent', 'Akun pelanggan segera hadir': 'Customer accounts are coming soon',
    // atelier
    'Komposisi': 'Composition', 'Lengan': 'Arms', 'Dengan': 'With', 'Tanpa': 'Without', 'Suasana': 'Mood', 'Siang': 'Day', 'Senja': 'Dusk', 'Malam': 'Night',
    'Angka contoh untuk demo — harga final melalui penawaran resmi.': 'Sample figures for this demo — final prices by official quotation.',
    'Minta penawaran': 'Request a quote', 'Acak': 'Shuffle', 'Reset': 'Reset', 'Oak': 'Oak', 'Walnut': 'Walnut', 'Black steel': 'Black steel', 'Brass': 'Brass',
    'Halo XIONCO, saya ingin penawaran CUBIX Modular (dirancang di Maison XIONCO):': 'Hello XIONCO, I would like a quotation for CUBIX Modular (designed at Maison XIONCO):',
    'dengan lengan': 'with arms', 'tanpa lengan': 'armless', 'ya': 'yes', 'tidak': 'no', 'Estimasi di website': 'Website estimate',
    '02 · Atelier': '02 · Atelier',
    // manufaktur
    '03 · Manufaktur': '03 · Manufacture', 'Empat pabrik, satu standar': 'Four factories, one standard',
    'Dari kayu mentah hingga kemasan, setiap tahap dikerjakan sendiri — tidak ada detail yang lolos.': 'From raw timber to packaging, every stage is done in-house — no detail slips through.',
    'Lihat seluruh rute': 'See the whole route', 'Pabrik di Jawa': 'Factories in Java', 'Sofa per hari': 'Sofas a day', 'Item kecil per hari': 'Small items a day',
    'Pekerja & kreatif': 'Makers & creatives', 'Hari kerja kirim': 'Working days to ship', 'Tahun garansi': 'Year warranty',
    'Pengolahan kayu': 'Woodworking', 'Curing bahan baku dan pembuatan komponen kayu.': 'Curing raw timber and making wooden components.',
    'Finishing & metal': 'Finishing & metal', 'Finishing, pengelasan, lini multiboard / HPL.': 'Finishing, welding, multiboard / HPL line.',
    'Upholstery': 'Upholstery', 'Jahit, busa, dan pelapisan kain / kulit.': 'Sewing, foam, and fabric / leather covering.',
    'Final & packaging': 'Final & packaging', 'Quality control, pengemasan, dan pengiriman.': 'Quality control, packing and dispatch.',
    // bisnis
    '04 · Bisnis': '04 · Business', 'Produk custom, saran desain interior, kolaborasi, atau proyek B2B — penawaran dalam 1 jam.': 'Custom products, interior design advice, collaborations or B2B projects — quotation within 1 hour.',
    '1 jam': '1 hour', 'Cicilan': 'Instalments', '3 thn': '3 yrs', '1–3 hr': '1–3 days', 'Permintaan penawaran': 'Quotation request',
    'Kantor': 'Office', 'Hotel & hospitality': 'Hotel & hospitality', 'Residensial': 'Residential', '< IDR 50 juta': '< IDR 50 million',
    'IDR 50–250 juta': 'IDR 50–250 million', 'IDR 250 juta – 1 M': 'IDR 250 million – 1 B', '> IDR 1 M': '> IDR 1 B',
    'Jenis proyek': 'Project type', 'Nilai proyek': 'Project value', 'Kebutuhan (opsional)': 'Requirements (optional)', 'Kebutuhan': 'Requirements',
    'Kirim via WhatsApp': 'Send via WhatsApp', 'Pesan dikirim melalui WhatsApp resmi XIONCO.': 'Messages are sent through the official XIONCO WhatsApp.',
    'Dipercaya oleh': 'Trusted by', 'Membuka WhatsApp…': 'Opening WhatsApp…', 'Halo XIONCO, saya {name} ({phone}).': 'Hello XIONCO, I am {name} ({phone}).',
    'Halo XIONCO, saya tertarik dengan layanan {title} ({note}) untuk proyek saya.': 'Hello XIONCO, I am interested in your {title} service ({note}) for my project.',
    'Tata ruang & alur kerja kantor, retail, hospitality': 'Layouts & workflows for offices, retail, hospitality',
    'Furnitur standar & custom dalam jumlah besar': 'Standard & custom furniture in volume',
    'Desain & visualisasi interior lengkap': 'Complete interior design & visualisation',
    'Kabinet, panel dinding, plafon & kelistrikan custom': 'Custom cabinetry, wall panels, ceilings & electricals',
    // galeri
    '05 · Galeri': '05 · Gallery', 'Ruang yang diwujudkan': 'Spaces brought to life', 'Dari sketsa ke produksi': 'From sketch to production',
    'Ruang rapat': 'Meeting room', 'Koridor hotel': 'Hotel corridor',
    // kontak
    '06 · Kontak': '06 · Contact', 'Mari wujudkan ruang Anda': 'Let us shape your space',
    'Tim kami siap membantu memilih, merancang, hingga mengirim — konsultasi privat tanpa biaya.': 'Our team helps you choose, design and deliver — free private consultation.',
    'Konsultasi via WhatsApp': 'Consult via WhatsApp', 'Jl. Ciputat Raya No. 8, Jakarta Selatan 12310': 'Jl. Ciputat Raya No. 8, South Jakarta 12310',
    'Toko online': 'Online store', 'Tentang': 'About', 'Pengembalian': 'Returns', 'Privasi': 'Privacy', 'Syarat': 'Terms',
    'Halo XIONCO, saya ingin konsultasi privat.': 'Hello XIONCO, I would like a private consultation.', 'Halo XIONCO': 'Hello XIONCO',
    // 5.01.02 — judul panel
    'Semua karya': 'All pieces', 'Rancang milik Anda': 'Design your own', 'Selesaikan pesanan': 'Complete your order', 'Tampilan & bahasa': 'Display & language',
    'Sebelumnya': 'Previous', 'Berikutnya': 'Next', 'Tutup': 'Close', 'Hotel & hospitality': 'Hotel & hospitality', 'Retail': 'Retail',
    'Ongkir & pemasangan dihitung di checkout sesuai alamat.': 'Shipping & installation are calculated at checkout from your address.',
    // 5.01.02 — akun
    'Akun': 'Account', 'Rancangan': 'Designs', 'Alamat': 'Addresses', 'Masuk atau daftar': 'Sign in or join', 'Masuk dengan': 'Sign in with',
    'Pilih cara lain': 'Choose another way', 'Selamat datang, {name}': 'Welcome, {name}', 'Lanjut': 'Continue',
    'Data & alamat Anda tersimpan, checkout berikutnya terisi otomatis. Rancangan Customize ikut tersimpan.': 'Your details & addresses are saved — next checkout fills itself in. Customize designs are saved too.',
    'Mode pratinjau: akun disimpan di perangkat ini. Versi live memakai kode WhatsApp / akun Google sungguhan.': 'Preview mode: the account is stored on this device. The live version uses a real WhatsApp code / Google account.',
    'Meta hanya mengizinkan akun bisnis/kreator untuk login di situs lain; WhatsApp atau Google lebih disarankan.': 'Meta only allows business/creator accounts to sign in on other sites; WhatsApp or Google is recommended.',
    'Kode masuk dikirim ke WhatsApp Anda': 'A sign-in code is sent to your WhatsApp', 'Nama & email terisi otomatis': 'Name & email fill in automatically',
    'Tautan masuk dikirim ke email': 'A sign-in link is sent to your email', 'Untuk akun bisnis / kreator': 'For business / creator accounts',
    'Checkout berikutnya terisi otomatis — kontak, alamat, dan rancangan tersimpan di akun Anda.': 'Your next checkout fills itself in — contact, addresses and designs live in your account.',
    'Belum ada rancangan tersimpan. Simpan dari Customize — kembali kapan saja.': 'No saved designs yet. Save one from Customize — come back any time.',
    'Masuk untuk menyimpan alamat — checkout terisi otomatis.': 'Sign in to save addresses — checkout fills itself in.',
    'Belum ada alamat. Alamat tersimpan otomatis saat checkout.': 'No addresses yet. They are saved automatically at checkout.',
    'Belum masuk.': 'Not signed in.', 'Simpan perubahan': 'Save changes', 'Keluar': 'Sign out', 'Anda sudah keluar': 'You are signed out', 'Tersimpan': 'Saved',
    'Mode pratinjau: akun tersimpan di perangkat ini.': 'Preview mode: the account is stored on this device.',
    'Buka': 'Open', 'Ke tas': 'To bag', 'Jadikan utama': 'Make primary', 'Utama': 'Primary', 'Ubah': 'Edit',
    // 5.01.02 — checkout
    'Ubah tas': 'Edit bag', 'Jelajahi ruang': 'Explore the rooms', 'Versi ruang': 'Room versions', '3D langsung (tanpa render)': 'Live 3D (not rendered)', 'Belokan siku 40° · 3D langsung': '40° corners · live 3D', 'Jalan': 'Passage', 'Warna per ruang · furnitur · plafon tinggi · 3D langsung': 'Room palettes · furniture · tall ceilings · live 3D', 'Dibuat ulang dari sketsa · 3D langsung': 'Rebuilt from sketch · live 3D', 'Ruang besar': 'Large room', 'Ruang kecil': 'Small room', 'Dinding pajang': 'Display wall', 'Ruang kiri atas': 'Upper left room', 'Ruang kiri bawah': 'Lower left room', 'Sketsa kamera ke-2 · 3D langsung': 'Camera sketch 2 · live 3D', 'Ukuran v6 · cara kamera sketsa · 3D langsung': 'v6 scale · sketch camera · live 3D', 'Sudut': 'Corner', 'Alur sketsa · ukuran dari video · 3D langsung': 'Sketch path · video scale · live 3D', 'Alur sketsa pemilik · 3D langsung': 'Owner sketch path · live 3D', 'Lorong atas': 'Upper hall', 'Belokan B 32°/45° · 3D langsung': 'Turns B 32°/45° · live 3D', 'Kamera lurus · dinding miring 40° · 3D langsung': 'Straight camera · 40° tilted walls · live 3D', '3D langsung gagal dimuat': 'Live 3D failed to load', 'Video referensi': 'Reference video', '3D arsitektur': '3D architecture', 'Berlapis · belokan · bayangan tegas': 'Layered · corners · crisp shadows', 'Ruang marmer': 'Marble room', 'Gulir untuk berjalan': 'Scroll to walk', 'Karya terpilih': 'Selected works', 'Lobi': 'Lobby', 'Ruang keluarga': 'Family room', 'Ruang biliar': 'Billiard room', 'Kamar tidur': 'Bedroom', 'Ruang seni': 'Art room', 'Lounge': 'Lounge', 'Bar': 'Bar', 'Elite Fabric': 'Elite fabric', 'Elite Faux leather': 'Elite faux leather', 'Seperti foto': 'As pictured', 'Warna kain': 'Fabric colour', 'Warna bantal': 'Cushion colour', 'Sama dengan kain': 'Same as fabric', 'Sama': 'Same', 'Kain': 'Fabric', 'bantal': 'cushions', 'Furnitur yang Anda tambahkan tampil bersama di panggung. Geser di panggung untuk memindahkan (menempel ke grid, tembok & furnitur lain; tahan Alt untuk bebas); klik tengah di furnitur untuk memutar, di latar untuk menggeser tampilan. Ketuk tembok, lantai atau plafon untuk mengubahnya.': 'Pieces you add appear together on the stage. Drag on the stage to move them (they snap to the grid, walls & other pieces; hold Alt to move freely); middle-click a piece to rotate it, or the background to pan the view. Tap a wall, the floor or the ceiling to change it.', 'Susun modul AC, AL, OT dan meja CUBIX sesuka Anda — pilih kayu & kain, lihat harganya langsung.': 'Arrange CUBIX AC, AL, OT modules and tables as you like — choose wood & fabric and see the price instantly.', 'Ruang Anda masih kosong': 'Your room is still empty', 'Mulai dari preset': 'Start from a preset', 'atau tambah barang satu per satu dari panel': 'or add pieces one by one from the panel', 'Custom · desain interior · proyek B2B': 'Custom · interior design · B2B projects', 'Penawaran': 'Quote', '1 jam': '1 hour', 'Cicilan': 'Instalment', 'Konsultasi': 'Consult', 'Showroom XIONCO': 'XIONCO showroom', 'Halo XIONCO, saya ingin konsultasi proyek bisnis.': 'Hello XIONCO, I would like to consult about a business project.', 'Ringkasan pesanan': 'Order summary', 'Kode promo': 'Promo code', 'Masukkan kode': 'Enter code', 'Pakai': 'Apply', 'Diskon': 'Discount', 'Kode promo {c} dipakai': 'Promo code {c} applied', 'Minimal belanja {x} untuk kode ini': 'Minimum spend {x} for this code', 'Kode promo tidak dikenal': 'Unknown promo code', 'Diskon 10% (maks. Rp 1,5 jt)': '10% off (max. IDR 1.5 m)', 'Potongan Rp 500 rb (min. belanja Rp 5 jt)': 'IDR 500k off (min. spend IDR 5 m)', 'Isi otomatis dengan akun': 'Fill in automatically with an account', 'atau sebagai tamu': 'or as a guest', 'Email (opsional)': 'Email (optional)',
    'Alamat pengiriman': 'Delivery address', 'Alamat tersimpan': 'Saved addresses', 'Alamat baru': 'New address', 'Pengiriman': 'Delivery', 'Pembayaran': 'Payment',
    'Kurir XIONCO': 'XIONCO courier', 'tiba': 'arrives', 'Pilih wilayah di alamat untuk menghitung ongkir': 'Choose a region in the address to calculate shipping',
    'Dikonfirmasi': 'To be confirmed', 'Gratis': 'Free', 'Tim kami merakit & memasang di lokasi': 'Our team assembles & installs on site', 'Rakit & pasang di lokasi': 'Assembly & installation on site',
    'Ongkir': 'Shipping', 'Pemasangan': 'Installation', 'Bayar': 'Pay', 'Memproses…': 'Processing…', 'Simpan sebagai': 'Save as', 'Rumah': 'Home', 'Lainnya': 'Other',
    'Penerima': 'Recipient', 'HP penerima': 'Recipient phone', 'Jalan, nomor, RT/RW, kelurahan': 'Street, number, district', 'Lokasi tersimpan': 'Location saved', 'Lokasi saya': 'My location',
    'Wilayah': 'Region', 'Pilih wilayah': 'Choose region', 'Kota / kabupaten': 'City / regency', 'Kode pos': 'Postcode', 'Catatan kurir': 'Courier note', 'Lantai, patokan': 'Floor, landmark',
    'Simpan alamat ini ke akun': 'Save this address to my account', 'Lokasi tidak tersedia di perangkat ini': 'Location is not available on this device',
    'Lokasi tersimpan — kurir memakai titik ini': 'Location saved — the courier will use this pin', 'Izin lokasi ditolak': 'Location permission denied',
    'nama': 'name', 'alamat': 'address', 'kota': 'city', 'wilayah': 'region', 'metode pembayaran': 'payment method', 'Lengkapi: {x}': 'Please complete: {x}',
    'Perkiraan tiba': 'Estimated arrival', 'Kirim ke': 'Ship to', 'Pesanan tersimpan': 'Order saved', 'Konfirmasi via WhatsApp': 'Confirm via WhatsApp', 'Lihat pesanan saya': 'View my orders',
    'Simpan data Anda': 'Save your details', 'Satu ketukan — berikutnya nama, kontak & alamat terisi otomatis.': 'One tap — next time your name, contact & address fill in automatically.',
    'Akun dibuat — data & alamat tersimpan': 'Account created — details & address saved',
    'Pembayaran diproses aman melalui payment gateway resmi.': 'Payments are processed securely through an official payment gateway.',
    'Pembayaran gagal. Silakan coba lagi atau pilih metode lain.': 'Payment failed. Please try again or choose another method.',
    'Menunggu pembayaran': 'Awaiting payment', 'Dibayar': 'Paid', 'Gagal': 'Failed',
    'Kartu kredit / debit': 'Credit / debit card', 'Semua e-wallet & m-banking': 'All e-wallets & mobile banking', 'Cicilan 0%': '0% instalments', 'Kartu kredit & paylater': 'Credit card & paylater',
    'Jawa Barat & Banten': 'West Java & Banten', 'Jawa Tengah & DIY': 'Central Java & Yogyakarta', 'Jawa Timur': 'East Java', 'Bali & Nusa Tenggara': 'Bali & Nusa Tenggara', 'Kalimantan & Sulawesi': 'Kalimantan & Sulawesi', 'Maluku & Papua': 'Maluku & Papua',
    // sesuaikan produk katalog
    'Ukuran & warna kaki': 'Size & leg colour', 'Rancang di Customize': 'Design in Customize', 'Lebar · Dalam · Tinggi': 'Width · Depth · Height', 'Susun modul CUBIX': 'Arrange CUBIX modules',
    'Sesuaikan': 'Customize', 'Tutup penyesuaian': 'Close customizing', 'Memuat model 3D…': 'Loading 3D model…', 'Sesuaikan {name}': 'Customize {name}', 'Ukuran asli': 'Original size',
    'Model asli diubah langsung — lengan & kaki tetap, bagian tengah yang menyesuaikan.': 'The original model is adjusted directly — arms & legs stay, the middle section adapts.', 'Kedalaman': 'Depth', 'Warna kaki & base': 'Leg & base finish', '{n} lajur channel': '{n} channels', 'Ruang': 'Room', 'Ruang Anda': 'Your room', 'Tata beberapa furnitur': 'Arrange several pieces', 'Ke ruang': 'To room', 'Tambah ke ruang': 'Add to room', 'Lihat ruang': 'See room', '{name} ditambahkan ke ruang': '{name} added to the room', '{n} furnitur · geser untuk menata': '{n} pieces · drag to arrange', 'Total ruang': 'Room total', 'Kosongkan ruang': 'Clear room', 'Beberapa furnitur tampil bersama di panggung — geser untuk menata.': 'Several pieces shown together on the stage — drag to arrange.', 'Furnitur yang Anda tambahkan tampil bersama di panggung. Geser di panggung untuk memindahkan, putar dari daftar.': 'Pieces you add appear together on the stage. Drag on the stage to move them, rotate from the list.', 'Ruang masih kosong. Tambahkan dari Customize (tombol ruang) atau halaman produk.': 'The room is empty. Add pieces from Customize (room button) or a product page.', 'Cahaya ruang (ambient)': 'Room light (ambient)', 'Tambah barang': 'Add items', 'untuk': 'for', 'Lihat semua': 'See all', 'Lihat semua pilihan': 'See all options', 'Semua varian': 'All variants', 'Jenis diganti — rancangan sebelumnya bisa dikembalikan': 'Type changed — your previous design can be restored', 'Kategori diganti — rancangan sebelumnya bisa dikembalikan': 'Category changed — your previous design can be restored', 'Ukuran disesuaikan ke {x}': 'Size adjusted to {x}', 'Susunan diganti ke preset {x}': 'Layout replaced with preset {x}', 'Penawaran khusus': 'Special offer', 'Harga khusus dari tim XIONCO untuk Anda.': 'A special price from the XIONCO team for you.', 'Server penawaran belum tersedia': 'The offer server is not available yet', 'Penawaran tidak dapat dibuka': 'The offer cannot be opened', 'Penawaran tidak tersedia': 'Offer unavailable', 'Memuat penawaran…': 'Loading offer…', 'Kode': 'Code', 'Halo XIONCO, saya ingin menanyakan penawaran dengan kode {c}.': 'Hello XIONCO, I would like to ask about the offer with code {c}.', 'Tanya via WhatsApp': 'Ask via WhatsApp', 'Memeriksa kode penawaran…': 'Checking the offer code…', 'Harga normal': 'Regular price', 'Harga khusus': 'Special price', 'Berlaku sampai': 'Valid until', '{n} hari lagi': '{n} days left', 'Catatan dari XIONCO': 'Note from XIONCO', 'Halo XIONCO, saya ingin menanyakan penawaran {c} ({t}).': 'Hello XIONCO, I would like to ask about offer {c} ({t}).', 'Harga khusus dikunci di server dan hanya berlaku untuk kode ini.': 'The special price is locked on our server and only valid for this code.', 'Penawaran tidak valid': 'Invalid offer', 'Produk dari tautan tidak ditemukan': 'The product in this link was not found', 'Cermin II: sidebar kanan, panel kiri': 'Mirror of II: sidebar right, panel left', 'Pria': 'Male', 'Wanita': 'Female', 'Manikin': 'Mannequin', 'Lounge': 'Lounge', 'Keluarga + TV': 'Family + TV', 'Percakapan': 'Conversation', 'Modern': 'Modern', 'Master': 'Master', 'Divan': 'Divan', 'Suite + kerja': 'Suite + desk', 'Makan 8': 'Dining for 8', 'Makan 6': 'Dining for 6', 'Studio': 'Studio', 'Executive': 'Executive', 'Tembok sudah penuh — geser atau hapus objek tembok dulu': 'The walls are full — move or remove a wall object first', 'Pintu': 'Door', 'Tembok': 'Walls', 'Kiri': 'Left', 'Kanan': 'Right', 'Belakang': 'Back', 'Lantai–plafon': 'Floor-to-ceiling', 'Standar': 'Standard', 'Tirai': 'Curtains', 'Ada': 'Yes', 'Posisi (dari kiri)': 'Position (from left)', 'Panel kayu': 'Wood panel', 'Kaca rangka': 'Framed glass', 'Double': 'Double', 'Pivot': 'Pivot', 'Geser': 'Sliding', 'Engsel': 'Hinge', 'Arah geser': 'Slides to', 'Arah buka': 'Opens', 'Ke dalam': 'Inward', 'Ke luar': 'Outward', 'Bukaan': 'Opening', 'Sedikit': 'Ajar', 'Terbuka': 'Open', 'Tinggi plafon': 'Ceiling height', 'Lampu cove': 'Cove light', 'Warna bebas': 'Custom colour', 'Bebas': 'Custom', 'Ketuk atau geser pintu / jendela di panggung untuk mengubahnya.': 'Tap or drag a door / window on the stage to change it.', 'Manusia 170 cm': 'Human 170 cm', 'Manusia 170 cm · pria': 'Human 170 cm · male', 'Manusia 170 cm · wanita': 'Human 170 cm · female', 'Manikin kayu 170 cm': 'Wooden mannequin 170 cm', 'Aksesoris': 'Accessories', 'Styling': 'Styling', 'Aksesoris · styling': 'Accessory · styling', 'TV 65"': 'TV 65"', 'Lampu meja': 'Table lamp', 'Vas keramik': 'Ceramic vase', 'Pohon pot': 'Potted tree', 'Nampan & lilin': 'Tray & candles', 'Lilin': 'Candles', 'Patung': 'Sculpture', 'Mangkuk kayu': 'Wooden bowl', 'Jam meja': 'Desk clock', 'Bantal': 'Cushions', 'Selimut': 'Throw', 'Karpet bulat': 'Round rug', 'Rancangan saya': 'My designs', 'Belum ada rancangan. Simpan rancangan di Customize.': 'No designs yet. Save one in Customize.', 'Tidak ada yang cocok.': 'Nothing matches.', 'Ruang masih kosong. Pilih preset atau tambah barang.': 'The room is empty. Pick a preset or add items.', 'Cari barang': 'Search items', 'Lampu {n}': 'Light {n}', 'Nyala': 'On', 'Mati': 'Off', 'Bayangan': 'Shadow', 'Kecerahan': 'Brightness', 'Suhu warna': 'Colour temperature', 'Arah': 'Direction', 'Ketinggian': 'Elevation', 'Jarak': 'Distance', 'Tambah lampu': 'Add light', 'Kembali ke awal': 'Reset', 'Bohlam': 'Bulb', 'Matahari': 'Sun',
    // 5.01.02 — garis ukur
    'Tampilkan ukuran': 'Show dimensions', 'Pembanding': 'Comparison', 'Putar bebas': 'Free rotate', 'Tinggi dudukan': 'Seat height', 'Tinggi kaki': 'Leg height', 'Tinggi lengan': 'Arm height', 'Tinggi daun meja': 'Table-top height', 'Tinggi ambalan': 'Shelf height', 'Tinggi headboard': 'Headboard height', 'Tinggi kasur': 'Mattress height', 'Ruang bawah': 'Clearance', 'Tebal headboard': 'Headboard thickness', 'Tinggi footboard': 'Footboard height', 'Dalam badan': 'Body depth', 'Tebal kaki': 'Leg thickness', 'Ruang bawah top': 'Clearance under top', 'Garis': 'Grid', 'Efek render': 'Render effects', 'Refleksi lantai': 'Floor reflection', 'Pantulan di lantai panggung': 'Reflection on the stage floor', 'Klasik': 'Classic', 'Realistis': 'Realistic', 'Warna garis': 'Line colour', 'Warna neon': 'Neon colour', 'Warna lain': 'Custom colour', 'Tidak': 'Off', 'Tampilkan': 'Show', 'Lebar': 'Width', 'Dalam': 'Depth', 'Tinggi': 'Height',
    'Dudukan': 'Seat', 'Kedalaman dudukan': 'Seat depth', 'Tebal sandaran': 'Back thickness', 'Tebal lengan': 'Arm width', 'Panjang dudukan': 'Seat length', 'Tinggi permukaan duduk': 'Seat surface height', 'Bawah top': 'Under top', 'Tebal top': 'Top thickness', 'Kolom': 'Columns', 'Kaki': 'Legs', 'Lengan': 'Arms', 'Ukuran': 'Size', 'Belum tercatat': 'Not recorded yet', 'Sumber': 'Source', 'Model 3D': '3D model',
    // 5.01.02 — customize
    'Lihat tas': 'View bag', '{n} barang': '{n} items', 'Ubah rancangan': 'Edit design', 'Ubah rancangan, lalu tekan Perbarui tas': 'Edit the design, then press Update bag', 'Perbarui tas': 'Update bag', 'Rancangan di tas diperbarui': 'Design in your bag updated', 'Simpan rancangan': 'Save design', 'Estimasi produksi': 'Production estimate', '{a}–{b} hari kerja': '{a}–{b} working days', 'Tanya desainer': 'Ask a designer', 'Nomor WhatsApp belum lengkap': 'WhatsApp number is incomplete', 'Wajib diisi': 'Required', 'Garansi 3 tahun': '3-year warranty', 'custom dibuat setelah bayar': 'custom pieces are made after payment', 'Manusia': 'Person',
    'Perbarui': 'Update', 'Perbarui rancangan di tas': 'Update the design in your bag',
    'Grafis': 'Graphics', 'Otomatis': 'Auto', 'Ringan': 'Light', 'Paket HD': 'HD pack', 'Unduh': 'Download', 'Jeda': 'Pause', 'Lanjutkan': 'Resume', 'Browser ini tidak mendukung penyimpanan offline': 'This browser does not support offline storage', 'Paket HD tersimpan di perangkat': 'HD pack saved on this device', 'Paket HD gagal diunduh — coba lagi': 'HD pack download failed — try again', 'Paket HD dihapus dari perangkat': 'HD pack removed from this device', 'Otomatis: mulai ringan, naik ke kualitas penuh bila perangkat lancar': 'Auto: starts light, switches to full quality when the device keeps up', 'Simpan semua model 3D & tekstur di perangkat agar tampil seketika': 'Keep all 3D models & textures on this device so they appear instantly',
    'Total {n} unit': 'Total · {n} units',
    'Harga · rincian': 'Price · breakdown', 'Harga per unit': 'Price per unit', 'Anak': 'Child', 'Opsi panggung': 'Stage options', 'Foto produk': 'Product photos', 'Ubah tinggi panel': 'Resize panel', 'Rancangan dikembalikan ke bawaan': 'Design reset to default', 'Pembulatan': 'Rounding', 'Semua pilihan': 'All options', 'Harga final · rincian': 'Final price · breakdown', 'Simpan': 'Save', 'Beli sekarang': 'Buy now', 'Tanya tim': 'Ask the team',
    'Rincian harga': 'Price breakdown', 'Kirim ke tim': 'Send to the team', 'Ongkir dihitung di checkout': 'Shipping is calculated at checkout',
    'Rancangan tersimpan di akun Anda': 'Design saved to your account', 'Rancangan tersimpan · Profil › Rancangan': 'Design saved · Profile › Designs',
    'Harga final produksi. Ongkir & pemasangan dihitung di checkout sesuai alamat.': 'Final production price. Shipping & installation are calculated at checkout from your address.',
    // C99: Customize — estimasi & Minta penawaran (WhatsApp), Ekspor PDF
    'Estimasi · rincian': 'Estimate · breakdown', 'Estimasi {n} unit': 'Estimate · {n} units', 'Pembulatan': 'Rounding', 'Ekspor PDF': 'Export PDF', 'Lihat 3D': 'View in 3D',
    'Kirim rancangan ke admin XIONCO lewat WhatsApp': 'Send this design to the XIONCO team on WhatsApp',
    'Harga final, ongkir & waktu produksi dikonfirmasi tim lewat penawaran': 'Final price, shipping & lead time are confirmed by our team in your quote',
    'Estimasi dari website. Harga final, ongkir, pemasangan & waktu produksi dikonfirmasi tim XIONCO lewat penawaran WhatsApp.': 'Website estimate. The final price, shipping, installation and lead time are confirmed by the XIONCO team in a WhatsApp quote.',
    'Halo XIONCO, saya ingin minta penawaran untuk rancangan custom ini:': 'Hello XIONCO, I would like a quote for this custom design:',
    '{n} unit': '{n} units', 'Kode': 'Code', 'Lihat rancangan': 'View design', 'Mohon info harga final dan waktu produksinya. Terima kasih.': 'Please let me know the final price and lead time. Thank you.',
    'WhatsApp terbuka dengan pesan siap kirim — tinggal tekan Kirim': 'WhatsApp is open with your message ready — just press Send',
    'Permintaan penawaran': 'Quote request', 'Estimasi website': 'Website estimate', 'Izinkan pop-up untuk ekspor PDF': 'Allow pop-ups to export the PDF',
    'Tautan rancangan tidak bisa dibaca': 'This design link could not be read', 'Detail lanjutan': 'More details', 'lihat info': 'view info', 'Lihat detail': 'See in detail', 'Ruang barat': 'West room', 'Customize': 'Customize', 'Dibuat sesuai pesanan — ukuran, bahan & warna bisa Anda ubah di Customize.': 'Made to order — change the size, materials & colours in Customize.', 'estimasi · harga final lewat penawaran': 'estimate · final price via quote', 'Info produk': 'Product info', 'Inspirational Museum': 'Inspirational Museum', 'Menyiapkan PDF…': 'Preparing PDF…', 'PDF terunduh': 'PDF downloaded', 'Cari…': 'Search…',
    // C105: sisa teks Indonesia di mode English (Informasi, galeri, tas, Grafis)
    '1 barang': '1 item', 'Tinggi⁠': 'High', 'Galeri B1': 'Gallery B1', 'Galeri B2': 'Gallery B2', 'Vestibul': 'Vestibule', 'Tentang XIONCO': 'About XIONCO', 'Dibuat sendiri, di empat pabrik': 'Made in-house, in four factories', 'Jepara · Mantingan': 'Jepara · Mantingan', 'Pengolahan kayu, pengeringan bahan baku, komponen': 'Wood processing, raw-material drying, components', 'Finishing, pengelasan, lini multiplek & HPL': 'Finishing, welding, plywood & HPL line', 'Jok & pelapisan kain (upholstery)': 'Upholstery', 'Pemeriksaan & pengemasan akhir': 'Final inspection & packing', '80+ pengrajin & kreatif': '80+ craftspeople & creatives', 'Dipercaya': 'Trusted by', 'Perusahaan': 'Company', 'Badan usaha': 'Legal entity', 'Jl. Ciputat Raya No. 8, Pondok Pinang, Jakarta Selatan 12310': 'Jl. Ciputat Raya No. 8, Pondok Pinang, South Jakarta 12310', 'Jl. Ciputat Raya No. 8, Jakarta Selatan': 'Jl. Ciputat Raya No. 8, South Jakarta', 'Rangka kayu solid & multiplek': 'Solid wood & plywood frames', 'Komponen logam (baja, aluminium, besi)': 'Metal components (steel, aluminium, iron)', 'Engsel, rel & hardware': 'Hinges, runners & hardware', 'Stainless & komponen dapur': 'Stainless & kitchen components', 'Busa high-density': 'High-density foam', '2 tahun': '2 years', '1 tahun': '1 year', 'Laminasi (HPL, multiboard)': 'Laminates (HPL, multiboard)', 'Cermin akrilik': 'Acrylic mirrors', 'Kain & tekstil jok': 'Upholstery fabrics & textiles', 'Ongkos kirim': 'Shipping costs', 'Pengembalian dana': 'Refunds', 'Produk rusak saat diterima': 'Damaged on arrival', 'Syarat & ketentuan': 'Terms & conditions', 'Pemesanan & pembayaran': 'Orders & payment', 'Transfer bank hanya ke rekening perusahaan:': 'Bank transfers only to the company account:', 'Jabodetabek': 'Greater Jakarta', 'Luar Jabodetabek': 'Outside Greater Jakarta', 'Hak kekayaan intelektual': 'Intellectual property', 'Batas tanggung jawab': 'Limitation of liability', 'Hukum & sengketa': 'Law & disputes', 'Diperbarui 27 Oktober 2026 · PT Halim Inti Gahara': 'Updated 27 October 2026 · PT Halim Inti Gahara', 'Model 3D pihak ketiga (CC BY 4.0):': 'Third-party 3D models (CC BY 4.0):', 'Ringkas': 'Show less', '{n} pilihan': '{n} options', 'Mindi natural': 'Natural mindi', 'Sungkai natural': 'Natural sungkai',
    // C99: halaman Informasi (Tentang, Garansi, Pengembalian, Privasi, Ketentuan) — sebelumnya tetap berbahasa Indonesia di mode English
    'XIONCO lahir dari satu pertanyaan: mengapa kualitas harus menjadi kemewahan? Kami merancang dan membuat sendiri furnitur minimalis yang tegas, jujur pada material, dan dibuat untuk dipakai lama — dari Jakarta, untuk rumah dan ruang kerja di seluruh Indonesia.': 'XIONCO was born from one question: why should quality be a luxury? We design and make our own minimalist furniture — decisive, honest to its materials and built to last — from Jakarta, for homes and workplaces across Indonesia.',
    'Cara kami merancang': 'How we design',
    'Kejernihan bentuk, menahan diri, dan kejujuran material. Estetika monokrom kami berangkat dari geometri brutalis, tekstur industrial, dan kesederhanaan Skandinavia, dibaca dengan rasa Asia Tenggara. Prinsipnya sederhana: kami hanya merilis produk yang lebih baik dari yang sudah ada.': 'Clarity of form, restraint and honest materials. Our monochrome aesthetic starts from brutalist geometry, industrial texture and Scandinavian simplicity, read with a Southeast Asian sensibility. The principle is simple: we only release a product when it is better than what already exists.',
    '30+ sofa atau 100 produk kecil per hari': '30+ sofas or 100 small products a day',
    'Proyek untuk SOGO, H&M, BRI, BCA, Trans7, Neo Soho, dan Forbes Indonesia — kantor, studio media, lobi publik, hingga rumah tinggal.': 'Projects for SOGO, H&M, BRI, BCA, Trans7, Neo Soho and Forbes Indonesia — offices, media studios, public lobbies and private homes.',
    'Setiap produk XIONCO dijamin baru dan bebas cacat produksi. Masa garansi dihitung sejak produk diterima dan berbeda menurut material:': 'Every XIONCO product is guaranteed new and free of manufacturing defects. The warranty starts when you receive the product and depends on the material:',
    'Yang ditanggung': 'What is covered',
    'Rangka kayu retak, melengkung, atau terbelah pada pemakaian wajar di dalam ruangan.': 'Wooden frames that crack, warp or split under normal indoor use.',
    'Logam berkarat karena cacat produksi, sambungan las lepas, atau rangka patah.': 'Metal that rusts from a manufacturing defect, welded joints that come loose, or broken frames.',
    'Busa kehilangan bentuk atau kekenyalan secara nyata pada pemakaian rumah tangga.': 'Foam that clearly loses its shape or resilience in household use.',
    'Kain sobek pada pemakaian wajar, atau warna pudar melebihi kewajaran (bukan karena terpapar matahari langsung terus-menerus).': 'Fabric that tears under normal use, or colour that fades more than normal (not from constant direct sunlight).',
    'Laminasi mengelupas, menggelembung, atau berubah warna berat.': 'Laminate that peels, bubbles or badly discolours.',
    'Cermin akrilik terkelupas lapisannya, buram, retak, atau terdistorsi karena produksi.': 'Acrylic mirrors whose coating peels, clouds, cracks or distorts because of production.',
    'Engsel, rel, dan soft-close yang tidak berfungsi.': 'Hinges, runners and soft-close mechanisms that stop working.',
    'Yang tidak ditanggung': 'What is not covered',
    'Keausan wajar karena pemakaian, termasuk cekungan busa kurang dari 10% tinggi aslinya.': 'Normal wear from use, including foam dips of less than 10% of the original height.',
    'Kerusakan karena kecelakaan, kelalaian, hewan peliharaan, benda tajam, bahan kimia, panas, atau air.': 'Damage from accidents, negligence, pets, sharp objects, chemicals, heat or water.',
    'Variasi alami kayu — serat, warna, dan mata kayu — yang justru menjadi karakter material.': 'Natural variation in wood — grain, colour and knots — which is part of the material\'s character.',
    'Produk yang diubah atau diperbaiki pihak selain XIONCO.': 'Products altered or repaired by anyone other than XIONCO.',
    'Pemakaian di luar ruangan, beban melebihi anjuran, atau perawatan yang tidak sesuai petunjuk.': 'Outdoor use, loads above the recommended limit, or care that does not follow the instructions.',
    'Bencana alam dan keadaan kahar lainnya.': 'Natural disasters and other force majeure.',
    'Cara klaim': 'How to claim',
    'Hubungi kami melalui WhatsApp paling lambat 7 hari setelah cacat ditemukan.': 'Contact us on WhatsApp within 7 days of finding the defect.',
    'Sertakan nomor pesanan atau invoice, foto atau video bagian yang cacat, dan keterangan singkat.': 'Include your order or invoice number, a photo or video of the defect and a short description.',
    'Bila perlu, tim kami memeriksa di lokasi atau meminta produk dikirim untuk diperiksa.': 'If needed, our team inspects on site or asks for the product to be sent in for inspection.',
    'Setelah klaim disetujui, kami memperbaiki, mengganti komponen, atau mengganti dengan material setara atau lebih baik bila material asli tidak lagi tersedia.': 'Once the claim is approved, we repair it, replace the component, or replace it with an equal or better material if the original is no longer available.',
    'Biaya perbaikan atau penggantian, termasuk pengiriman di dalam Indonesia, kami tanggung. Garansi berlaku untuk pembeli pertama dan tidak dapat dipindahtangankan.': 'We cover the cost of repair or replacement, including shipping within Indonesia. The warranty applies to the first buyer and is not transferable.',
    'Bila produk tidak sesuai harapan Anda, ajukan pengembalian dalam': 'If a product does not meet your expectations, request a return within',
    '5 hari': '5 days',
    'sejak produk diterima. Produk harus dalam kondisi baru, belum dipakai, tanpa kerusakan, dan lengkap dengan kemasan asli serta aksesorisnya.': 'of receiving it. The product must be new, unused, undamaged and complete with its original packaging and accessories.',
    'Tidak dapat dikembalikan': 'Not returnable',
    'Produk custom atau yang dibuat sesuai pesanan, termasuk rancangan dari Customize.': 'Custom or made-to-order products, including designs from Customize.',
    'Produk clearance, obral, atau bagian dari program tukar promo.': 'Clearance, sale or trade-in promotion products.',
    'Salah memilih warna atau varian oleh pembeli.': 'A colour or variant chosen by mistake.',
    'Produk yang rusak karena pemakaian atau perawatan yang tidak tepat, atau sudah diubah.': 'Products damaged by improper use or care, or that have been altered.',
    'Cara mengajukan': 'How to request',
    'Hubungi kami melalui WhatsApp dalam 5 hari sejak produk diterima.': 'Contact us on WhatsApp within 5 days of receiving the product.',
    'Sebutkan nomor pesanan, produk, dan alasannya — sertakan foto bila ada kerusakan.': 'Tell us the order number, the product and the reason — add photos if anything is damaged.',
    'Anda menerima nomor pengembalian (RA) dari tim kami.': 'You will receive a return number (RA) from our team.',
    'Kemas produk dalam kemasan asli bersama semua aksesoris dan buku petunjuk, lalu tempel nomor RA.': 'Pack the product in its original packaging with all accessories and the manual, then attach the RA number.',
    'Kirim dengan jasa pengiriman yang dapat dilacak, dan simpan nomor resinya sampai dana kembali.': 'Ship it with a trackable courier and keep the tracking number until your refund arrives.',
    'Ongkos kirim pengembalian ditanggung pembeli, kecuali produk cacat atau terjadi kesalahan dari pihak kami. Untuk penukaran, biaya kemasan dan pengiriman dapat dikenakan.': 'Return shipping is paid by the buyer unless the product is defective or the mistake was ours. Exchanges may incur packing and shipping costs.',
    'Dana dikembalikan ke metode pembayaran semula, paling lambat 14 hari kerja setelah produk kami terima dan periksa — termasuk pajak dan biaya program perlindungan yang Anda bayar.': 'Refunds go back to the original payment method within 14 working days after we receive and inspect the product — including taxes and any protection plan you paid for.',
    'Hubungi kami segera dengan foto kerusakan. Kami mengganti, memperbaiki, atau mengembalikan dana tanpa biaya tambahan.': 'Contact us right away with photos of the damage. We replace, repair or refund at no extra cost.',
    'Kami memakai data Anda hanya untuk melayani pesanan dan konsultasi Anda. Kami tidak menjual atau menyewakan data Anda kepada siapa pun. Kebijakan ini berlaku untuk situs Maison XIONCO, dikelola PT Halim Inti Gahara.': 'We use your data only to handle your orders and consultations. We never sell or rent your data to anyone. This policy applies to the Maison XIONCO site, run by PT Halim Inti Gahara.',
    'Data yang kami terima': 'Data we receive',
    'Data yang Anda isi saat memesan atau berkonsultasi: nama, nomor WhatsApp atau telepon, email, alamat pengiriman, dan catatan.': 'What you enter when ordering or consulting: name, WhatsApp or phone number, email, delivery address and notes.',
    'Isi pesanan dan rancangan custom Anda.': 'The contents of your orders and custom designs.',
    'Sumber kunjungan (misalnya parameter iklan seperti utm_source) yang ikut tercatat bersama pesanan.': 'Visit source (for example ad parameters such as utm_source), recorded with the order.',
    'Tersimpan di perangkat Anda': 'Stored on your device',
    'Tas belanja, rancangan, riwayat pesanan, dan pengaturan tampilan disimpan di browser perangkat ini, bukan di akun. Menghapus data situs di browser akan menghapusnya. Situs ini tidak memakai cookie iklan atau analitik pihak ketiga.': 'Your bag, designs, order history and display settings are stored in this device\'s browser, not in an account. Clearing site data in the browser removes them. This site uses no third-party advertising or analytics cookies.',
    'Untuk apa data dipakai': 'What the data is used for',
    'Memproses pesanan, pembayaran, dan pengiriman.': 'Processing orders, payments and deliveries.',
    'Konfirmasi dan konsultasi melalui WhatsApp.': 'Confirmations and consultations on WhatsApp.',
    'Layanan purnajual dan klaim garansi.': 'After-sales service and warranty claims.',
    'Informasi promosi — hanya bila Anda setuju.': 'Promotional information — only if you agree.',
    'Mencegah penipuan dan penyalahgunaan.': 'Preventing fraud and misuse.',
    'Pihak yang menerima data': 'Who receives the data',
    'Kurir dan ekspedisi rekanan, penyedia pembayaran, dan penyedia layanan situs — hanya sebatas yang diperlukan dan untuk tujuan tersebut — serta aparat bila diwajibkan oleh hukum.': 'Partner couriers and freight services, payment providers and site service providers — only as far as needed and for these purposes — and authorities when required by law.',
    'Penyimpanan & hak Anda': 'Retention & your rights',
    'Catatan transaksi kami simpan sesuai kewajiban pajak dan akuntansi. Anda berhak melihat, memperbaiki, meminta salinan, membatasi, atau menghapus data Anda, dan berhenti menerima promosi kapan saja — cukup hubungi kami melalui WhatsApp. Kami tidak dengan sengaja mengumpulkan data anak di bawah 13 tahun.': 'We keep transaction records as tax and accounting rules require. You may view, correct, copy, restrict or delete your data and stop receiving promotions at any time — just contact us on WhatsApp. We do not knowingly collect data from children under 13.',
    'Dengan memesan melalui Maison XIONCO, Anda menyetujui syarat berikut. Penjual adalah PT Halim Inti Gahara, Jl. Ciputat Raya No. 8, Pondok Pinang, Jakarta Selatan.': 'By ordering through Maison XIONCO you agree to the following terms. The seller is PT Halim Inti Gahara, Jl. Ciputat Raya No. 8, Pondok Pinang, South Jakarta.',
    'Harga & produk': 'Prices & products',
    'Harga dalam Rupiah, mengikuti xionco.shop, dan dapat berubah sewaktu-waktu.': 'Prices are in Rupiah, follow xionco.shop and may change at any time.',
    'Foto dan model 3D adalah gambaran. Warna di layar, serat kayu, dan tekstur kain dapat sedikit berbeda dari produk asli.': 'Photos and 3D models are illustrations. On-screen colour, wood grain and fabric texture may differ slightly from the real product.',
    'Kesalahan harga atau keterangan dapat kami koreksi, termasuk setelah pesanan dibuat. Bila Anda tidak ingin melanjutkan, pesanan dibatalkan dan dana kembali penuh.': 'We may correct pricing or description errors, including after an order is placed. If you do not wish to continue, the order is cancelled with a full refund.',
    'Pesanan sah setelah dikonfirmasi tim kami. Kami dapat menolak atau membatalkan pesanan — misalnya bila ada indikasi penipuan — dengan pengembalian dana penuh.': 'An order is valid once our team confirms it. We may refuse or cancel an order — for example if fraud is suspected — with a full refund.',
    'Metode pembayaran yang tersedia ditampilkan saat pembayaran.': 'Available payment methods are shown at checkout.',
    'a.n. PT Halim Inti Gahara. Kami tidak pernah meminta transfer ke rekening pribadi.': 'in the name of PT Halim Inti Gahara. We never ask for transfers to personal accounts.',
    'Kurir XIONCO, gratis ongkir & pemasangan standar, 1–4 hari kerja sejak pesanan siap': 'XIONCO courier, free delivery & standard installation, 1–4 working days once the order is ready',
    'Ekspedisi rekanan dari Jakarta Selatan, ongkir dibayar pembeli sesuai volume': 'Partner freight from South Jakarta, shipping paid by the buyer by volume',
    'Untuk luar Jabodetabek, estimasi ongkir diinformasikan sebelum dikirim; selisih dengan tagihan akhir umumnya di bawah Rp50.000. Packing kayu sangat disarankan — kerusakan dalam pengiriman tanpa packing kayu di luar tanggung jawab kami, tetapi kami membantu klaim asuransinya.': 'Outside Greater Jakarta, the shipping estimate is shared before dispatch; the difference from the final bill is usually under Rp50,000. Wooden crating is strongly recommended — damage in transit without a crate is outside our responsibility, but we help with the insurance claim.',
    'Pesanan custom': 'Custom orders',
    'Harga di Customize adalah estimasi. Harga final, ukuran, material, dan jadwal produksi dikonfirmasi tim kami sebelum produksi dimulai. Produk custom tidak dapat dikembalikan, tetapi tetap mendapat garansi.': 'Prices in Customize are estimates. The final price, size, materials and production schedule are confirmed by our team in a quote before production starts. Custom products cannot be returned but are still covered by the warranty.',
    'Desain, foto, model 3D, dan merek di situs ini milik PT Halim Inti Gahara atau pemberi lisensinya (model 3D pihak ketiga tercantum di halaman Kontak). Penggunaan ulang memerlukan izin tertulis.': 'The designs, photos, 3D models and trademarks on this site belong to PT Halim Inti Gahara or its licensors (third-party 3D models are credited on the Contact page). Reuse requires written permission.',
    'Tanggung jawab kami terbatas pada perbaikan, penggantian, atau pengembalian dana sesuai Garansi dan Pengembalian. Kami tidak bertanggung jawab atas keterlambatan karena keadaan kahar seperti bencana alam, kerusuhan, atau gangguan di luar kendali kami.': 'Our liability is limited to repair, replacement or refund under the Warranty and Returns terms. We are not liable for delays caused by force majeure such as natural disasters, unrest or disruptions beyond our control.',
    'Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah terlebih dahulu; bila tidak tercapai, melalui arbitrase sesuai UU No. 30 Tahun 1999, atau Pengadilan Negeri Jakarta.': 'These terms are governed by the laws of the Republic of Indonesia. Disputes are first settled by discussion; failing that, by arbitration under Law No. 30 of 1999, or at the Jakarta District Court.'
  };

  function fmt(s, v) { return v ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : String(s); }
  function T(s, v) { if (s == null) return ''; var k = String(s); return fmt(lang === 'en' && EN[k] != null ? EN[k] : k, v); }

  var ATTRS = ['placeholder', 'aria-label', 'title'];
  function apply(root) {
    root = root || document.body;
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (t) {
        var p = t.parentNode;
        if (!p || /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.nodeName) || (p.closest && p.closest('svg, [data-noi18n]'))) return NodeFilter.FILTER_REJECT;
        return /\S/.test(t.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var t;
    while ((t = walker.nextNode())) {
      if (t._i0 == null) {
        var key = t.nodeValue.trim();
        if (EN[key] == null) continue;
        t._i0 = t.nodeValue; t._ik = key;
      } else if (t.nodeValue !== t._i0 && t.nodeValue !== t._i0.replace(t._ik, EN[t._ik])) { t._i0 = null; continue; }  // diubah skrip
      t.nodeValue = lang === 'en' ? t._i0.replace(t._ik, EN[t._ik]) : t._i0;
    }
    ATTRS.forEach(function (a) {
      Array.prototype.forEach.call(root.querySelectorAll('[' + a + ']'), function (el) {
        if (el.closest('[data-noi18n]')) return;
        var o = el.getAttribute('data-i0-' + a);
        if (o == null) { o = el.getAttribute(a); if (EN[o] == null) return; el.setAttribute('data-i0-' + a, o); }
        el.setAttribute(a, T(o));
      });
    });
  }

  window.XI18N = {
    T: T,
    lang: function () { return lang; },
    set: function (l) {
      l = l === 'en' ? 'en' : 'id';
      if (l === lang) return;
      lang = l;
      try { localStorage.setItem(KEY, l); } catch (e) {}
      document.documentElement.lang = l;
      apply();
      try { window.dispatchEvent(new CustomEvent('xi18n:change', { detail: { lang: l } })); } catch (e) {}
    },
    apply: apply
  };
  document.documentElement.lang = lang;
  if (lang !== 'id') { if (document.body) apply(); else document.addEventListener('DOMContentLoaded', function () { apply(); }); }
})();
