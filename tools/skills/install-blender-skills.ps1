# Pasang skill Blender pihak ketiga (MIT) ke ~/.claude/skills — dijalankan oleh PEMILIK (pemeriksa otomatis sesi Claude
# menolak menyalin kode pihak ketiga ke folder skill). Repo di-clone ke folder sementara, lalu hanya folder skill yang
# sudah ditinjau 24 Okt 2026 yang disalin, beserta LICENSE dan catatan sumber di akhir SKILL.md.
#   powershell -ExecutionPolicy Bypass -File tools\skills\install-blender-skills.ps1
# Tinjauan 24 Okt 2026: skrip Python di repo ini hanya menjalankan Blender headless lewat subprocess (jalur dari env
# BLENDER / BLENDER_EXE / PATH). Pengecualian: blender-kiln/tools/unimate.py mengunduh model dari Hugging Face & memasang
# torch — jangan dijalankan tanpa persetujuan; alur kiln penuh butuh server blender-mcp (tidak dipasang skrip ini).
$ErrorActionPreference = 'Stop'
$dst = Join-Path $env:USERPROFILE '.claude\skills'
$tmp = Join-Path $env:TEMP ('xionco-skills-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $dst, $tmp | Out-Null
$repos = @(
  @{ name = 'blender-skill';        url = 'https://github.com/kajisho5/blender-skill' },
  @{ name = 'el4cteo';              url = 'https://github.com/EL4CTEO/blender-skills' },
  @{ name = 'blender-kiln';         url = 'https://github.com/elithril/blender-kiln' },
  @{ name = 'arjun988';             url = 'https://github.com/arjun988/blender-skills' }
)
foreach ($r in $repos) { git clone -q --depth 1 $r.url (Join-Path $tmp $r.name); if (-not $?) { throw "clone gagal: $($r.url)" } }
function Note($skillDir, $url, $repoDir, $extra) {
  $c = (git -C $repoDir rev-parse --short HEAD).Trim()
  Add-Content -Encoding utf8 -Path (Join-Path $skillDir 'SKILL.md') -Value "`n`n---`nSumber: $url (lisensi MIT, commit $c, dipasang $(Get-Date -Format 'd MMM yyyy') lewat tools/skills/install-blender-skills.ps1 XIONCO).$extra"
}
function Put($src, $name, $license) {
  $d = Join-Path $dst $name
  if (Test-Path $d) { Write-Host "lewati (sudah ada): $name"; return $null }
  Copy-Item -Recurse $src $d; Copy-Item $license (Join-Path $d 'LICENSE') -Force; Write-Host "terpasang: $name"; return $d
}
# 1) kajisho5/blender-skill — satu skill + scripts (info/convert/optimize/render/look/bake/lod/fit/check/batch/verify)
$src = Join-Path $tmp 'blender-skill'; $d = Join-Path $dst 'blender-skill'
if (-not (Test-Path $d)) {
  New-Item -ItemType Directory -Path $d | Out-Null
  foreach ($f in 'SKILL.md', 'LICENSE', 'README.md') { Copy-Item (Join-Path $src $f) $d }
  Copy-Item -Recurse (Join-Path $src 'scripts') $d
  if (Test-Path (Join-Path $src 'references')) { Copy-Item -Recurse (Join-Path $src 'references') $d }
  Note $d 'https://github.com/kajisho5/blender-skill' $src ' Skrip: hanya Blender headless (--blender > env BLENDER > PATH).'
  Write-Host 'terpasang: blender-skill'
} else { Write-Host 'lewati (sudah ada): blender-skill' }
# 2) EL4CTEO/blender-skills — pilihan yang relevan untuk furnitur (Blender 5.2+)
$src = Join-Path $tmp 'el4cteo'
foreach ($k in 'blender-core', 'blender-scene-setup', 'blender-hardsurface-modeling', 'blender-retopology-uv', 'blender-pbr-materials', 'blender-texture-baking', 'blender-asset-qa', 'blender-export-pipelines', 'blender-rendering', 'blender-lighting-lookdev', 'blender-game-optimization', 'blender-pipeline-automation', 'blender-workflow-recipes') {
  $d = Put (Join-Path $src "skills\$k") $k (Join-Path $src 'LICENSE')
  if ($d) { Note $d 'https://github.com/EL4CTEO/blender-skills' $src ' Skrip: run_in_blender.py menjalankan Blender headless (env BLENDER_EXE).' }
}
# 3) elithril/blender-kiln — plugin/ (SKILL.md + references + tools: fidelity_check.py skor siluet vs foto)
$src = Join-Path $tmp 'blender-kiln'
$d = Put (Join-Path $src 'plugin') 'blender-kiln' (Join-Path $src 'LICENSE')
if ($d) { Note $d 'https://github.com/elithril/blender-kiln' $src ' PERHATIAN: tools/unimate.py mengunduh model Hugging Face & memasang torch — jangan dijalankan tanpa izin; alur penuh butuh blender-mcp.' }
# 4) arjun988/blender-skills — markdown saja (dirancang untuk BlenderMCP; dipakai sebagai daftar periksa)
$src = Join-Path $tmp 'arjun988'
foreach ($k in 'archviz', 'prop-artist', 'qa-review') {
  $d = Put (Join-Path $src ".claude\skills\$k") $k (Join-Path $src 'LICENSE')
  if ($d) { Note $d 'https://github.com/arjun988/blender-skills' $src ' Markdown saja.' }
}
Remove-Item -Recurse -Force $tmp
Write-Host "Selesai. Folder skill: $dst ($((Get-ChildItem $dst -Directory).Count) skill). Mulai ulang sesi Claude agar skill baru terbaca."
