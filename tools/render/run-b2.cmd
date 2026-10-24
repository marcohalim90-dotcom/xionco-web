@echo off
rem Render ulang / lanjutkan Galeri B1 (frame yang sudah ada dilewati). Klik dua kali.
cd /d "%~dp0..\.."
"%LOCALAPPDATA%\Programs\Blender\blender-5.2.2-windows-x64\blender.exe" -b --factory-startup -P tools\render\galeryB2.py -- --frames 0-199 --size 1600x900 --samples 96 >> output\galeri\galeryB2\log.txt 2>&1
