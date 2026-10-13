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
      { id: 'va', label: 'Virtual account', note: 'BCA · Mandiri · BNI · BRI' },
      { id: 'qris', label: 'QRIS', note: 'Semua e-wallet & m-banking' },
      { id: 'card', label: 'Kartu kredit / debit', note: 'Visa · Mastercard · JCB' },
      { id: 'ewallet', label: 'E-wallet', note: 'GoPay · OVO · DANA · ShopeePay' },
      { id: 'installment', label: 'Cicilan 0%', note: 'Kartu kredit & paylater' }
    ],
    ready: function () { return !!this.provider; },
    pay: function (order) {
      return Promise.resolve({ status: 'pending', ref: order.id, message: 'not-configured' });
    }
  };
})();
