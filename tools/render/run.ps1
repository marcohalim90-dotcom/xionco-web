# ==========================================================================
#  XIONCO - render foto produk: ekspor GLB (export.js) lalu render Blender (render.py)
#  Pakai: klik dua kali run.bat   atau   powershell -ExecutionPolicy Bypass -File run.ps1 [opsi]
#    -Jobs jobs.json     daftar job (bawaan: jobs.json di folder ini)
#    -Only id1,id2       hanya job tertentu
#    -Proof              cek cepat: 960x720, 32 sampel (hasil ke output/renders-proof)
#    -Samples 256        ubah jumlah sampel semua job
#    -Size 2400x1800     ubah resolusi semua job
#    -Force              buat ulang walau file sudah ada
#  Hasil: output/renders/<id>/<tampilan>.webp (+ .jpg). Bisa dihentikan & dilanjutkan:
#  yang sudah jadi dilewati.
# ==========================================================================
param(
  [string]$Jobs = "jobs.json",
  [string]$Only = "",
  [switch]$Proof,
  [int]$Samples = 0,
  [string]$Size = "",
  [switch]$Force
)
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$OutBase = Join-Path $Root $(if ($Proof) { 'output\renders-proof' } else { 'output\renders' })
New-Item -ItemType Directory -Force -Path $OutBase | Out-Null
$LogFile = Join-Path $Root 'output\render-log.txt'
function Log([string]$m) { $l = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $m; Write-Host $l; try { Add-Content -LiteralPath $LogFile -Value $l -Encoding UTF8 -ErrorAction Stop } catch {} }

# ---------------------------------------------------------------- alat yang dibutuhkan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Log 'GAGAL: Node.js belum terpasang (https://nodejs.org, versi LTS).'; exit 1 }
$blender = $env:BLENDER
if (-not $blender -or -not (Test-Path -LiteralPath $blender)) {
  $cands = @()
  foreach ($pat in @("$env:LOCALAPPDATA\Programs\Blender\*\blender.exe", "$env:ProgramFiles\Blender Foundation\*\blender.exe", "${env:ProgramFiles(x86)}\Steam\steamapps\common\Blender\blender.exe")) {
    $cands += Get-ChildItem -Path $pat -ErrorAction SilentlyContinue
  }
  $pick = $cands | Sort-Object { $_.Directory.Name } -Descending | Select-Object -First 1
  if ($pick) { $blender = $pick.FullName }
}
if (-not $blender) { Log 'GAGAL: Blender tidak ditemukan. Pasang Blender 4.2+ atau isi variabel BLENDER dengan path blender.exe.'; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\puppeteer-core'))) {
  Log 'Memasang puppeteer-core (sekali saja, perlu internet)...'
  & npm install --no-audit --no-fund | Out-Host
}

# ---------------------------------------------------------------- job
$spec = Get-Content -LiteralPath $Jobs -Raw -Encoding UTF8 | ConvertFrom-Json
$def = $spec.defaults
$list = @($spec.jobs)
if ($Only) { $want = $Only.Split(','); $list = @($list | Where-Object { $want -contains $_.id }) }
Log ("=== XIONCO render: " + $list.Count + " job | Blender: " + $blender + $(if ($Proof) { ' | MODE CEK CEPAT' } else { '' }))

# 1) ekspor GLB (lewati yang sudah ada)
$ea = @('export.js', $Jobs)
if ($Only) { $ea += "--only=$Only" }
if ($Force) { $ea += '--force' }
& node @ea | ForEach-Object { Log $_ }

# 2) render tiap job
$t0 = Get-Date; $n = 0; $done = 0
foreach ($j in $list) {
  $n++
  $glb = Join-Path $Root ("output\glb\" + $j.id + ".glb")
  if (-not (Test-Path -LiteralPath $glb)) { Log ("[$n/" + $list.Count + "] " + $j.id + ': GLB tidak ada (ekspor gagal?), dilewati'); continue }
  $views = if ($j.views) { $j.views } else { $def.views }
  $sz = if ($Size) { $Size } elseif ($j.size) { '' + $j.size[0] + 'x' + $j.size[1] } else { '' + $def.size[0] + 'x' + $def.size[1] }
  $smp = if ($Samples -gt 0) { $Samples } elseif ($j.samples) { $j.samples } else { $def.samples }
  if ($Proof) { $sz = '960x720'; $smp = 32 }
  $look = if ($j.look) { $j.look } else { $def.look }
  $hdri = if ($j.hdri) { $j.hdri } else { $def.hdri }
  $out = Join-Path $OutBase $j.id
  $missing = @($views | Where-Object { -not (Test-Path -LiteralPath (Join-Path $out ($_ + '.webp'))) })
  if (-not $Force -and $missing.Count -eq 0) { Log ("[$n/" + $list.Count + "] " + $j.id + ': sudah lengkap, dilewati'); continue }
  Log ("[$n/" + $list.Count + "] " + $j.id + ' | ' + ($views -join ',') + ' | ' + $sz + ' | ' + $smp + ' sampel | ' + $look)
  $ba = @('-b', '--factory-startup', '-P', (Join-Path $PSScriptRoot 'render.py'), '--', '--glb', $glb, '--out', $out, '--views', ($views -join ','), '--size', $sz, '--samples', $smp, '--look', $look, '--hdri', $hdri)
  if ($Force) { $ba += '--force' }
  $tj = Get-Date
  & $blender @ba 2>$null | ForEach-Object { if ($_ -match '^\[render\]') { Log ('    ' + $_) } }
  if ($LASTEXITCODE -ne 0) { Log ('    GAGAL (kode ' + $LASTEXITCODE + ')') } else { $done++ }
  Log ('    selesai dalam ' + [math]::Round(((Get-Date) - $tj).TotalSeconds) + ' s')
}
Log ('=== Selesai: ' + $done + ' job dirender dalam ' + [math]::Round(((Get-Date) - $t0).TotalMinutes, 1) + ' menit. Hasil: ' + $OutBase)
