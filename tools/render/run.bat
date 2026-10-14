@echo off
rem XIONCO - render foto produk. Klik dua kali untuk merender semua job di jobs.json.
rem Opsi diteruskan ke run.ps1, contoh:  run.bat -Proof     run.bat -Only kyrios,tv-walnut-brass
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
echo.
pause
