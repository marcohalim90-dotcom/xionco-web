/* ==========================================================================
   Bandingkan image→3D TRELLIS 2 (Microsoft) dan Hunyuan3D v3 (Tencent) lewat fal.ai untuk satu produk.
   node tools/ai3d-compare.js <id> <foto utama> [foto kiri] [foto belakang] [foto kanan]
   - foto: path lokal (data/source/shop-img/<id>/01-galeri.png) atau URL.
   - Hasil mentah + rapi (ai-finish.py, ukuran dari data/source/fit3d.json) di data/source/ai3d/<id>/cmp-<model>.glb (lokal).
   - Key fal.ai dari data/private/ai3d.json — tidak pernah dicetak.
   Biaya ±US$0,35 (TRELLIS 2, 1536) + ±US$0,38 (Hunyuan3D v3) per produk.
   ========================================================================== */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const KEY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/private/ai3d.json'), 'utf8')).key;
const BLENDER = require('./blender-path').BLENDER;   // env BLENDER → PATH → folder pemasangan umum
const [id, ...photos] = process.argv.slice(2);
if (!id || !photos.length) { console.log('pakai: node tools/ai3d-compare.js <id> <foto> [kiri] [belakang] [kanan]'); process.exit(1); }
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const img = (u) => /^https?:\/\//.test(u) ? u : 'data:' + (MIME[path.extname(u).toLowerCase()] || 'image/png') + ';base64,' + fs.readFileSync(path.resolve(ROOT, u)).toString('base64');

const MODELS = {
  trellis2: { endpoint: 'fal-ai/trellis-2', input: () => ({ image_url: img(photos[0]), resolution: '1536', texture_size: '2048', decimation_target: 200000, remesh: true }) },
  hunyuan3: { endpoint: 'fal-ai/hunyuan3d-v3/image-to-3d', input: () => {
    const o = { input_image_url: img(photos[0]), enable_pbr: true, face_count: 200000, generate_type: 'Normal' };
    ['left_image_url', 'back_image_url', 'right_image_url'].forEach((k, i) => { if (photos[i + 1]) o[k] = img(photos[i + 1]); });
    return o;
  } }
};

async function fal(url, opt) {
  const r = await fetch(url, Object.assign({}, opt, { headers: { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' } }));
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok) throw new Error('fal.ai ' + r.status + ': ' + String(j && (j.detail ? JSON.stringify(j.detail) : j.error) || t).slice(0, 300));
  return j;
}
async function run(name) {
  const M = MODELS[name], t0 = Date.now(), dir = path.join(ROOT, 'data/source/ai3d', id);
  const q = await fal('https://queue.fal.run/' + M.endpoint, { method: 'POST', body: JSON.stringify(M.input()) });
  for (;;) {
    const s = await fal(q.status_url, { method: 'GET' });
    if (s.status === 'COMPLETED') break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const out = await fal(q.response_url, { method: 'GET' });
  const f = out.model_glb || (out.model_urls && out.model_urls.glb);
  if (!f || !f.url) throw new Error(name + ': hasil tanpa GLB ' + Object.keys(out).join(','));
  const raw = path.join(dir, 'raw-' + name + '.glb'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(raw, Buffer.from(await (await fetch(f.url)).arrayBuffer()));
  const fit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/source/fit3d.json'), 'utf8')).models['assets/items/' + id + '/model-ai.glb'];
  const dims = fit ? fit.to.join(' × ') : '';
  const dst = path.join(dir, 'cmp-' + name + '.glb');
  const log = execFileSync(BLENDER, ['-b', '--factory-startup', '--python', path.join(ROOT, 'tools/glb/ai-finish.py'), '--', raw, dst, dims, ''], { encoding: 'utf8', maxBuffer: 1 << 26 });
  console.log(name, ((Date.now() - t0) / 1000).toFixed(0) + ' s', (log.match(/^AIFIN (.+)$/m) || ['', '?'])[1]);
}
Promise.all(Object.keys(MODELS).map((n) => run(n).catch((e) => console.log('GAGAL', n, e.message)))).then(() => console.log('selesai', id));
