@echo off
rem Menyalakan API Ocean Space (Laravel) di port 8010.
rem Klik dua kali file ini, biarkan jendelanya terbuka selama aplikasi dipakai. Tutup jendela = server berhenti.
cd /d "%~dp0backend"
echo.
echo   Ocean Space API
echo   - Dari laptop : http://localhost:8010/api/v1
echo   - Dari HP     : http://IP-LAPTOP:8010/api/v1  (lihat IP dengan perintah: ipconfig)
echo.
call php artisan serve --host=0.0.0.0 --port=8010
pause
