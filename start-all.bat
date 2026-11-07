@echo off
title SaigonDrain AI - Full System
cd /d "%~dp0"
echo ========================================================
echo   Dang khoi dong SaigonDrain AI - Toan bo he thong
echo   User App (Nguoi dung): http://localhost:5173
echo   Admin Dashboard:       http://localhost:5174
echo ========================================================
pnpm run dev
pause
