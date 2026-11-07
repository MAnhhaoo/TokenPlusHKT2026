@echo off
title SaigonDrain AI - Sync Code to Android
cd /d "%~dp0\FE\user"
echo ========================================================
echo   Dang Build Web va Dong bo sang Android Studio...
echo ========================================================
pnpm run build && pnpm exec cap sync android
echo.
echo ========================================================
echo   DA DONG BO THANH CONG!
echo   Bay gio ban co the vao Android Studio bam:
echo   Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo ========================================================
pause
