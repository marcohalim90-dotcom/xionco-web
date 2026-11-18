// Service worker /lotto/: aplikasi undian tetap jalan tanpa internet setelah dibuka sekali.
// Strategi: tampilkan dari cache (cepat & offline), lalu perbarui cache di belakang layar.
// Revisi file terlihat pada pembukaan berikutnya. Ganti VERSION bila daftar file berubah.
const VERSION = 'xionco-lotto-2';
const FILES = ['./', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('xionco-lotto-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // halaman apa pun di /lotto/ memakai index yang sama
  const key = req.mode === 'navigate' ? './' : req;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(key);
    const fresh = fetch(req).then(res => {
      if (res.ok && !res.redirected) cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
