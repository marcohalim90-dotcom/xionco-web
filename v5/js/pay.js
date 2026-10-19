/* ==========================================================================
   Maison XIONCO v5 — Pembayaran (payment gateway)
   Semua tombol pembelian (Beli langsung, Tas › Lanjut ke pembayaran) berakhir di
   panel "Pembayaran", lalu memanggil XPAY.pay(order). Saat ini BELUM ada gateway:
   pesanan disimpan dengan status "Menunggu pembayaran" dan pembeli diarahkan
   konfirmasi lewat WhatsApp.

   Menyematkan gateway (Midtrans Snap, Xendit, DOKU, dll.) cukup di file ini:
     1. isi XPAY.provider (mis. 'midtrans') dan muat skrip SDK-nya,
     2. ganti isi XPAY.pay(order) — kirim order ke server Anda untuk membuat
        transaksi (kunci rahasia gateway HANYA di server, jangan di sini),
        lalu buka halaman/popup pembayaran,
     3. kembalikan Promise berisi { status: 'paid' | 'pending' | 'failed', ref, message }.

   Bentuk order:
     { id, created, items: [{ id, name, variant, qty, price }], subtotal, total,
       customer: { name, phone, email, address, city, zip, note }, method }
   ========================================================================== */
(function () {
  'use strict';
  window.XPAY = {
    provider: null,
    // pilihan yang ditampilkan di panel; provider nanti bisa menyaring sesuai yang aktif
    methods: [
      { id: 'va', label: 'Virtual account', note: 'BCA · Mandiri · BNI · BRI', logos: ['bca', 'mandiri', 'bni', 'bri'] },
      { id: 'qris', label: 'QRIS', note: 'Semua e-wallet & m-banking', logos: ['qris'], hint: true },
      { id: 'card', label: 'Kartu kredit / debit', note: 'Visa · Mastercard · JCB', logos: ['visa', 'mastercard', 'jcb'] },
      { id: 'ewallet', label: 'E-wallet', note: 'GoPay · OVO · DANA · ShopeePay', logos: ['gopay', 'ovo', 'dana', 'shopeepay'] },
      { id: 'installment', label: 'Cicilan 0%', note: 'Kartu kredit & paylater', logos: ['visa', 'mastercard'], hint: true }
    ],
    /* Kode promo — CONTOH (dicek di browser). Versi live: kode & potongan divalidasi server / gateway.
       pct = persen (max = batas potongan), off = potongan rupiah, min = minimal belanja */
    promos: [
      { code: 'XIONCO10', pct: 10, max: 1500000, label: 'Diskon 10% (maks. Rp 1,5 jt)' },
      { code: 'WELCOME500', off: 500000, min: 5000000, label: 'Potongan Rp 500 rb (min. belanja Rp 5 jt)' }
    ],
    promo: function (code, sub) {
      var c = String(code || '').trim().toUpperCase(), p = this.promos.filter(function (x) { return x.code === c; })[0];
      if (!p) return { ok: false, err: 'unknown' };
      if (p.min && sub < p.min) return { ok: false, err: 'min', min: p.min, p: p };
      var d = p.pct ? Math.round(sub * p.pct / 100) : p.off || 0; if (p.max) d = Math.min(d, p.max);
      return { ok: true, code: p.code, disc: Math.min(d, sub), label: p.label };
    },
    ready: function () { return !!this.provider; },
    /* Pengiriman — tarif CONTOH per wilayah (ubah sesuai tarif resmi). cost null = dikonfirmasi tim.
       days = perkiraan hari kirim setelah barang siap. Produk ready: siap 1–2 hari; custom: produksi 14–21 hari. */
    zones: [
      { id: 'jabodetabek', label: 'Jabodetabek', cost: 0, days: [1, 3] },
      { id: 'jabar', label: 'Jawa Barat & Banten', cost: 350000, days: [2, 4] },
      { id: 'jateng', label: 'Jawa Tengah & DIY', cost: 550000, days: [3, 5] },
      { id: 'jatim', label: 'Jawa Timur', cost: 750000, days: [4, 6] },
      { id: 'bali', label: 'Bali & Nusa Tenggara', cost: 950000, days: [5, 8] },
      { id: 'sumatera', label: 'Sumatera', cost: 1200000, days: [6, 11] },
      { id: 'kalsul', label: 'Kalimantan & Sulawesi', cost: 1500000, days: [7, 13] },
      { id: 'timur', label: 'Maluku & Papua', cost: null, days: [10, 20] }
    ],
    install: { label: 'Rakit & pasang di lokasi', cost: 250000 },
    production: { ready: [1, 2], custom: [14, 21] },
    pay: function (order) {
      return Promise.resolve({ status: 'pending', ref: order.id, message: 'not-configured' });
    }
  };
})();
