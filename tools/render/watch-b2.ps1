# Penjaga render Galeri B2 (proses mandiri, tidak ikut mati bila sesi Claude ditutup):
#  * menahan PC agar tidak tidur (SetThreadExecutionState - bukan mengubah pengaturan daya)
#  * bila Blender berhenti sebelum 200 frame -> jalankan ulang run-b2.cmd (frame yang ada dilewati), maks. 5 kali
#  * setelah 200 frame lengkap -> python tools/render/pack-b2.py (frame situs assets/galeri/b2 + sets.json)
# Jalankan: powershell -NoProfile -ExecutionPolicy Bypass -File tools\render\watch-b2.ps1
$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$out = Join-Path $root 'output\galeri\galeryB2'
$log = Join-Path $out 'watch.txt'
$N = 200
Add-Type -Name P -Namespace W -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
function Say($m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) }
function Frames { (Get-ChildItem -Path $out -Filter 'f???.jpg' | Where-Object { $_.Name -match '^f\d{3}\.jpg$' }).Count }
function Rendering { [bool](Get-CimInstance Win32_Process -Filter "Name='blender.exe'" | Where-Object { $_.CommandLine -match 'galeryB2' }) }
Say "penjaga mulai, frame ada: $(Frames)/$N"
$restarts = 0
while ($true) {
  [W.P]::SetThreadExecutionState([uint32]'0x80000001') | Out-Null   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
  $f = Frames
  if ($f -ge $N) { break }
  if (-not (Rendering)) {
    Start-Sleep -Seconds 20
    if (-not (Rendering) -and (Frames) -lt $N) {
      if ($restarts -ge 5) { Say "Blender berhenti lagi setelah 5 kali jalan ulang - berhenti, perlu dicek (frame $(Frames)/$N)"; [W.P]::SetThreadExecutionState([uint32]'0x80000000') | Out-Null; exit 1 }
      $restarts++
      Say "Blender tidak jalan pada frame $(Frames)/$N - jalankan ulang run-b2.cmd (#$restarts)"
      Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', (Join-Path $PSScriptRoot 'run-b2.cmd') -WindowStyle Hidden
      Start-Sleep -Seconds 90
    }
  }
  Start-Sleep -Seconds 60
}
Say "render lengkap $(Frames)/$N - kemas ke situs"
while (Rendering) { Start-Sleep -Seconds 15 }   # tunggu frame terakhir tersimpan & Blender keluar
Push-Location $root
$r = & python tools\render\pack-b2.py 2>&1
Pop-Location
Say ("pack-b2: " + ($r -join ' '))
[W.P]::SetThreadExecutionState([uint32]'0x80000000') | Out-Null
Say 'selesai'
