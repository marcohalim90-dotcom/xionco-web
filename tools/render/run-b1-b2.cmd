@echo off
rem Lanjutkan render Galeri B1 lalu B2 (frame yang sudah ada dilewati). Proses mandiri — tidak ikut mati bila sesi Claude ditutup.
cd /d "%~dp0..\.."
"%LOCALAPPDATA%\Programs\Blender\blender-5.2.2-windows-x64\blender.exe" -b --factory-startup -P tools\render\galeryB1.py -- --frames 0-179 --size 1600x900 --samples 96 >> output\galeri\galeryB1\log.txt 2>&1
echo RENDER SELESAI %date% %time% >> output\galeri\galeryB1\log.txt
"%LOCALAPPDATA%\Programs\Blender\blender-5.2.2-windows-x64\blender.exe" -b --factory-startup -P tools\render\galeryB2.py -- --frames 0-199 --size 1600x900 --samples 96 >> output\galeri\galeryB2\log.txt 2>&1
echo RENDER SELESAI %date% %time% >> output\galeri\galeryB2\log.txt
