@echo off
title SaigonDrain AI - User App
cd /d "%~dp0"
echo ========================================================
echo   Dang khoi dong SaigonDrain AI - Ung dung Nguoi dung
echo   Dia chi mo tren May tinh:   http://localhost:5173
echo   Dia chi mo tren Dien thoai: http://192.168.76.1:5173
echo ========================================================
pnpm run dev:user
pause
