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
  var lang = 'id';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'id'; } catch (e) {}

  var EN = {
    // umum & navigasi
    'Beranda': 'Home', 'Koleksi': 'Collection', 'Manufaktur': 'Manufacture', 'Bisnis': 'Business', 'Galeri': 'Gallery', 'Kontak': 'Contact',
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
    'Bahasa dan tema tampilan. Tersimpan di perangkat ini.': 'Language and display theme. Saved on this device.',
    'Akun Anda': 'Your account', 'Pesanan dan permintaan custom Anda di perangkat ini.': 'Your orders and custom requests on this device.',
    // rincian panggung
    'Harga': 'Price', 'Dimensi': 'Dimensions', 'Material': 'Material', 'Estimasi': 'Estimate', 'Penawaran': 'Quote', 'Rancang': 'Design',
    'Varian': 'Variant', 'Kategori': 'Category', 'Terjual': 'Sold', 'Garansi': 'Warranty', '3 tahun': '3 years', 'Kirim': 'Delivery',
    '1–3 hari kerja': '1–3 working days', 'Mulai': 'From', 'mulai': 'from', 'hemat': 'save', 'Hemat': 'Save', 'Beli': 'Buy', 'Tanya': 'Ask',
    'Tanya harga': 'Ask price', 'Melalui penawaran': 'On request',
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
    'Lihat di xionco.shop': 'View on xionco.shop', 'Detail di xionco.com': 'Details on xionco.com',
    'Warna & material': 'Colour & material', 'Ukuran & opsi': 'Size & options', 'Faux leather': 'Faux leather', 'Fabric': 'Fabric', 'Leather': 'Leather',
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
    'Ubah tas': 'Edit bag', 'Isi otomatis dengan akun': 'Fill in automatically with an account', 'atau sebagai tamu': 'or as a guest', 'Email (opsional)': 'Email (optional)',
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
    'Sesuaikan': 'Customize', 'Tutup penyesuaian': 'Close customizing', 'Memuat model 3D…': 'Loading 3D model…', 'Sesuaikan {name}': 'Customize {name}', 'Ukuran asli': 'Original size',
    'Model asli diubah langsung — lengan & kaki tetap, bagian tengah yang menyesuaikan.': 'The original model is adjusted directly — arms & legs stay, the middle section adapts.', 'Kedalaman': 'Depth', 'Warna kaki & base': 'Leg & base finish', '{n} lajur channel': '{n} channels', 'Ruang': 'Room', 'Ruang Anda': 'Your room', 'Tata beberapa furnitur': 'Arrange several pieces', 'Ke ruang': 'To room', 'Tambah ke ruang': 'Add to room', 'Lihat ruang': 'See room', '{name} ditambahkan ke ruang': '{name} added to the room', '{n} furnitur · geser untuk menata': '{n} pieces · drag to arrange', 'Total ruang': 'Room total', 'Kosongkan ruang': 'Clear room', 'Beberapa furnitur tampil bersama di panggung — geser untuk menata.': 'Several pieces shown together on the stage — drag to arrange.', 'Furnitur yang Anda tambahkan tampil bersama di panggung. Geser di panggung untuk memindahkan, putar dari daftar.': 'Pieces you add appear together on the stage. Drag on the stage to move them, rotate from the list.', 'Ruang masih kosong. Tambahkan dari Customize (tombol ruang) atau halaman produk.': 'The room is empty. Add pieces from Customize (room button) or a product page.', 'Cahaya ruang (ambient)': 'Room light (ambient)', 'Lampu {n}': 'Light {n}', 'Nyala': 'On', 'Mati': 'Off', 'Bayangan': 'Shadow', 'Kecerahan': 'Brightness', 'Suhu warna': 'Colour temperature', 'Arah': 'Direction', 'Ketinggian': 'Elevation', 'Jarak': 'Distance', 'Tambah lampu': 'Add light', 'Kembali ke awal': 'Reset', 'Bohlam': 'Bulb', 'Matahari': 'Sun',
    // 5.01.02 — garis ukur
    'Tampilkan ukuran': 'Show dimensions', 'Tidak': 'Off', 'Tampilkan': 'Show', 'Lebar': 'Width', 'Dalam': 'Depth', 'Tinggi': 'Height',
    'Dudukan': 'Seat', 'Kaki': 'Legs', 'Lengan': 'Arms', 'Ukuran': 'Size', 'Belum tercatat': 'Not recorded yet', 'Sumber': 'Source', 'Model 3D': '3D model',
    // 5.01.02 — customize
    'Harga · rincian': 'Price · breakdown', 'Harga final · rincian': 'Final price · breakdown', 'Simpan': 'Save', 'Beli sekarang': 'Buy now', 'Tanya tim': 'Ask the team',
    'Rincian harga': 'Price breakdown', 'Kirim ke tim': 'Send to the team', 'Ongkir dihitung di checkout': 'Shipping is calculated at checkout',
    'Rancangan tersimpan di akun Anda': 'Design saved to your account', 'Rancangan tersimpan · Profil › Rancangan': 'Design saved · Profile › Designs',
    'Harga final produksi. Ongkir & pemasangan dihitung di checkout sesuai alamat.': 'Final production price. Shipping & installation are calculated at checkout from your address.'
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
