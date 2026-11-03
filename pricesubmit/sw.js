/* Maison XIONCO v5 — service worker (performa Q5)
   Hanya model 3D & gambar di /assets/… (tanpa query) yang disimpan di perangkat:
   - tampil langsung dari simpanan (cepat, tetap jalan saat sinyal lemah);
   - sekali per sesi dicek ke server dengan ETag (murah: 304 bila tidak berubah) → versi baru otomatis menggantikan.
   Halaman, JavaScript & data TIDAK disimpan — selalu terbaru dari server.
   Isi lengkap diunduh lewat Pengaturan › Paket HD (daftar file: assets/manifest.json). */
var CACHE = 'xv-assets-v1';
var ASSET = /^\/assets\/.+\.(glb|gltf|bin|webp|jpe?g|png|hdr)$/i;
var checked = {};   // URL yang sudah dicek ulang di sesi ini

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('xv-assets-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function revalidate(c, req, hit) {
  if (checked[req.url]) return Promise.resolve();
  checked[req.url] = 1;
  var h = {}, et = hit.headers.get('ETag'), lm = hit.headers.get('Last-Modified');
  if (et) h['If-None-Match'] = et; else if (lm) h['If-Modified-Since'] = lm;
  return fetch(req.url, { headers: h, cache: 'no-store' }).then(function (r) { if (r.status === 200) return c.put(req, r); }).catch(function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin || u.search || !ASSET.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) { e.waitUntil(revalidate(c, req, hit)); return hit; }
      return fetch(req).then(function (r) { if (r.ok && r.status === 200) { checked[req.url] = 1; c.put(req, r.clone()); } return r; });
    });
  }));
});
