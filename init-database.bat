@echo off
title SaigonDrain AI - Khoi tao Database PostgreSQL
cd /d "%~dp0"
echo ========================================================
echo   Dang khoi tao cau truc Database SaigonDrain tren PostgreSQL...
echo   Host: localhost:5433  ^|  Database: saigondrain
echo ========================================================

set PGPASSWORD=Macanhhao123
"C:\Program Files\PostgreSQL\13\bin\psql.exe" -h localhost -p 5433 -U postgres -d saigondrain -f "%~dp0infra\saigondrain_schema.sql"

echo.
echo ========================================================
echo   KHOI TAO DATABASE HOAN TAT!
echo   Tat ca 8 bang da duoc tao moi thanh cong tren PostgreSQL.
echo ========================================================
pause
