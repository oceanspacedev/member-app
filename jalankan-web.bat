@echo off
rem Menjalankan aplikasi Ocean Space versi web di browser.
rem Nyalakan backend dulu (jalankan-backend.bat), lalu klik dua kali file ini.
cd /d "%~dp0mobile"
echo.
echo   Ocean Space (web)
echo   Buka di browser: http://localhost:8081
echo.
call npx expo start --web --port 8081
pause
