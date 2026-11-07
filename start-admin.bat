@echo off
title SaigonDrain AI - Admin Dashboard
cd /d "%~dp0"
echo ========================================================
echo   Dang khoi dong SaigonDrain AI - Trang Quan Tri (Admin)
echo   Dia chi truy cap: http://localhost:5174
echo ========================================================
pnpm run dev:admin
pause
