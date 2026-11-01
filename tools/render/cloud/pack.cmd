@echo off
rem Buat paket render Galeri untuk GPU sewaan (output\cloud\xionco-render.tar). Klik dua kali.
cd /d "%~dp0..\..\.."
node tools\render\cloud\pack.js
pause
