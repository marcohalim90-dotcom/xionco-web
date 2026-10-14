/* ==========================================================================
   Maison XIONCO v5 — Akun pelanggan (masuk / daftar, alamat, data pemesan)
   Mode 'preview' (sekarang): akun disimpan di perangkat ini — alur & tampilan
   sama dengan versi live, tetapi data diisi pelanggan sendiri.
   Mode 'live' (nanti, perlu server): signIn() mengarah ke OAuth / OTP sungguhan.

   Penyedia yang disiapkan:
     whatsapp  — OTP ke WhatsApp (paling cocok di Indonesia; nomor sekaligus terverifikasi)
     google    — nama & email otomatis dari Google
     email     — tautan masuk lewat email
     instagram — sejak Des 2024 Meta hanya mendukung akun profesional (bisnis/kreator)
                 untuk login pihak ketiga — disiapkan, tetapi bukan jalur utama
   API: window.XAUTH — user() · signIn(provider, data) · signOut() · update(patch)
        saveAddress(addr) · removeAddress(id) · primary()      Event: 'xauth:change'
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'xv5_account';
  var read = function () { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  var write = function (u) { try { if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY); } catch (e) {} };
  var emit = function () { try { window.dispatchEvent(new CustomEvent('xauth:change')); } catch (e) {} };
  var uid = function (p) { return p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase(); };

  var XAUTH = window.XAUTH = {
    mode: 'preview',
    providers: [
      { id: 'whatsapp', label: 'WhatsApp', note: 'Kode masuk dikirim ke WhatsApp Anda', needs: ['name', 'phone'] },
      { id: 'google', label: 'Google', note: 'Nama & email terisi otomatis', needs: ['name', 'email'] },
      { id: 'email', label: 'Email', note: 'Tautan masuk dikirim ke email', needs: ['name', 'email'] },
      { id: 'instagram', label: 'Instagram', note: 'Untuk akun bisnis / kreator', needs: ['name', 'instagram'] }
    ],
    user: function () { return read(); },
    signIn: function (provider, data) {
      var u = read() || { id: uid('U'), created: Date.now(), addresses: [] };
      u.provider = provider;
      ['name', 'email', 'phone', 'instagram'].forEach(function (k) { if (data && data[k]) u[k] = String(data[k]).trim(); });
      write(u); emit();
      return Promise.resolve(u);
    },
    signOut: function () { write(null); emit(); },
    update: function (patch) { var u = read(); if (!u) return null; for (var k in patch) u[k] = patch[k]; write(u); emit(); return u; },
    primary: function () { var u = read(); if (!u || !u.addresses || !u.addresses.length) return null; return u.addresses.filter(function (a) { return a.primary; })[0] || u.addresses[0]; },
    saveAddress: function (a) {
      var u = read(); if (!u) return null;
      u.addresses = u.addresses || [];
      if (!a.id) a.id = uid('A');
      var i = u.addresses.findIndex(function (x) { return x.id === a.id; });
      if (a.primary || !u.addresses.length) u.addresses.forEach(function (x) { x.primary = false; }), a.primary = true;
      if (i >= 0) u.addresses[i] = a; else u.addresses.unshift(a);
      write(u); emit(); return a;
    },
    removeAddress: function (id) {
      var u = read(); if (!u) return;
      u.addresses = (u.addresses || []).filter(function (x) { return x.id !== id; });
      if (u.addresses.length && !u.addresses.some(function (x) { return x.primary; })) u.addresses[0].primary = true;
      write(u); emit();
    }
  };
})();
