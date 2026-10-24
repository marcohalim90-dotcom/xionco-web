/* Lokasi blender.exe: env BLENDER → PATH → folder pemasangan umum (winget/MSI, portable, Steam) → null.
   Dipakai tools/ai3d.js & tools/glb/grain-all.js (dulu jalur tetap akun Marco; 24 Okt 2026 Blender dipasang di akun M lewat winget). */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
function find() {
  const c = [];
  if (process.env.BLENDER) c.push(process.env.BLENDER);
  try { execSync('where blender', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/).filter(Boolean).forEach((p) => c.push(p)); } catch (e) {}
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs'), 'C:/Users/Marco/AppData/Local/Programs'].filter(Boolean);
  for (const r of roots) for (const sub of ['Blender Foundation', 'Blender']) {
    const d = path.join(r, sub);
    if (!fs.existsSync(d)) continue;
    for (const v of fs.readdirSync(d).sort().reverse()) { const exe = path.join(d, v, 'blender.exe'); if (fs.existsSync(exe)) c.push(exe); }
  }
  c.push('C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe');
  return c.find((p) => fs.existsSync(p)) || null;
}
module.exports = { find, BLENDER: find() };
if (require.main === module) console.log(module.exports.BLENDER || 'Blender tidak ditemukan (atur env BLENDER)');
