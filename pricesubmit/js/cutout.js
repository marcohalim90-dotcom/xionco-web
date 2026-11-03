/* ==========================================================================
   Maison XIONCO — hapus latar foto produk di browser
   Dipakai panggung 3D (world.js) dan thumbnail panel (app.js).
   xionco.com mengizinkan akses gambar lintas domain (CORS), jadi piksel
   bisa dibaca: latar putih/hitam dihapus dengan flood-fill dari tepi,
   tepi dihaluskan, lalu dipotong ke batas objek. Hasil diberi tanda ok:false bila
   latarnya terlalu rumit (mis. render studio bergradasi) — pemanggil memakai foto asli.
   API: window.XCUT.load(url) · .cutout(img, max) · .url(url, max) → objectURL
   ========================================================================== */
(function () {
  'use strict';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var imgCache = {}, urlCache = {};
  function load(url) {
    if (!imgCache[url]) imgCache[url] = new Promise(function (res, rej) {
      var im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { delete imgCache[url]; rej(new Error('load')); }; im.src = url;
    });
    return imgCache[url];
  }
  function dist2(d, i, r, g, b) { var dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b; return dr * dr + dg * dg + db * db; }
  function cutout(im, max) {
    var s = Math.min(max || 768, im.naturalWidth || 768), h = Math.round(s * (im.naturalHeight || s) / (im.naturalWidth || s));
    var c = document.createElement('canvas'); c.width = s; c.height = h;
    var g = c.getContext('2d'); g.drawImage(im, 0, 0, s, h);
    var id; try { id = g.getImageData(0, 0, s, h); } catch (e) { return { canvas: c, aspect: s / h, tainted: true }; }
    var d = id.data, n = s * h, i, x, y;
    var br = 0, bgc = 0, bb = 0, ba = 0, cnt = 0;
    var acc = function (p) { var k = p * 4; br += d[k]; bgc += d[k + 1]; bb += d[k + 2]; ba += d[k + 3]; cnt++; };
    for (x = 0; x < s; x += 4) { acc(x); acc((h - 1) * s + x); }
    for (y = 0; y < h; y += 4) { acc(y * s); acc(y * s + s - 1); }
    br /= cnt; bgc /= cnt; bb /= cnt; ba /= cnt;
    var removed = 0;
    if (ba > 200) {
      var dark = (br + bgc + bb) / 3 < 80;
      var tolG = dark ? 95 : 42, tolS = dark ? 14 : 20, tG = tolG * tolG, tS = tolS * tolS;
      var seen = new Uint8Array(n), q = new Int32Array(n), head = 0, tail = 0;
      var seed = function (p) { if (!seen[p] && dist2(d, p * 4, br, bgc, bb) < tG) { seen[p] = 1; q[tail++] = p; } };
      for (x = 0; x < s; x++) { seed(x); seed((h - 1) * s + x); }
      for (y = 0; y < h; y++) { seed(y * s); seed(y * s + s - 1); }
      while (head < tail) {
        var p = q[head++], px = p % s, k = p * 4;
        for (var j = 0; j < 4; j++) {
          var o = j === 0 ? (px > 0 ? p - 1 : -1) : j === 1 ? (px < s - 1 ? p + 1 : -1) : j === 2 ? p - s : p + s;
          if (o < 0 || o >= n || seen[o]) continue;
          var ko = o * 4;
          if (dist2(d, ko, br, bgc, bb) < tG && dist2(d, ko, d[k], d[k + 1], d[k + 2]) < tS) { seen[o] = 1; q[tail++] = o; }
        }
      }
      for (i = 0; i < n; i++) if (seen[i]) { d[i * 4 + 3] = 0; removed++; }
      for (i = 0; i < n; i++) {
        if (seen[i]) continue;
        var ix = i % s;
        if ((ix > 0 && seen[i - 1]) || (ix < s - 1 && seen[i + 1]) || (i >= s && seen[i - s]) || (i + s < n && seen[i + s])) {
          d[i * 4 + 3] = Math.round(clamp(Math.sqrt(dist2(d, i * 4, br, bgc, bb)) / (tolG * 2.2), .15, 1) * d[i * 4 + 3]);
        }
      }
      g.putImageData(id, 0, 0);
    }
    var x0 = s, y0 = h, x1 = 0, y1 = 0, solid = 0;
    for (y = 0; y < h; y++) for (x = 0; x < s; x++) if (d[(y * s + x) * 4 + 3] > 24) { solid++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return { canvas: c, aspect: s / h, ok: false };
    /* mutu potongan: latar harus benar-benar terhapus (≥ 8 %) dan objek tersisa padat
       (≥ 38 % kotak batasnya). Foto studio bergradasi yang "termakan" jadi serpihan → ok: false */
    var fill = solid / ((x1 - x0 + 1) * (y1 - y0 + 1)), ok = removed / n > .08 && fill > .38;
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    return { canvas: out, aspect: cw / ch, ok: ok, fill: fill, removed: removed / n };
  }
  // objectURL hasil potong (untuk <img>), di-cache per url+ukuran
  function toUrl(url, max) {
    var key = url + '|' + (max || 768);
    if (!urlCache[key]) urlCache[key] = load(url).then(function (im) {
      var r = cutout(im, max);
      if (r.tainted) throw new Error('tainted');
      if (!r.ok) throw new Error('complex');               // latar rumit → tampilkan foto apa adanya
      return new Promise(function (res, rej) { r.canvas.toBlob(function (b) { if (b) res(URL.createObjectURL(b)); else rej(new Error('blob')); }, 'image/png'); });
    }).catch(function (e) { delete urlCache[key]; throw e; });
    return urlCache[key];
  }
  window.XCUT = { load: load, cutout: cutout, url: toUrl };
})();
