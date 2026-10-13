@echo off
setlocal
title Mazhari - Full Stack (Backend + Frontend)

:: Change directory to the folder where this batch file lives
cd /d "%~dp0"

echo ===================================================
echo   MAZHARI - Starting Services
echo ===================================================
echo.

echo [1/2] Starting Backend Server (Node.js Express)...
start /b node api/index.js

:: Wait 2 seconds for backend to initialize before starting frontend
timeout /t 2 /nobreak >nul

echo.
echo [2/2] Starting Frontend Server (Vite React)...
echo.
call npm run dev

pause
