@echo off
rem Menjalankan aplikasi Ocean Space di HP (iPhone/Android) lewat Expo Go.
rem Syarat: jalankan-backend.bat sudah menyala, HP dan laptop di Wi-Fi yang sama.
rem Alamat API otomatis memakai IP laptop, tidak perlu mengedit .env saat ganti Wi-Fi.
cd /d "%~dp0mobile"
echo.
echo   1. Pasang "Expo Go" dari App Store / Play Store
echo   2. iPhone: pindai QR di bawah dengan aplikasi Kamera
echo      Android: pindai dari dalam aplikasi Expo Go
echo.
call npx expo start --lan --port 8081
pause
