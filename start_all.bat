@echo off
setlocal
title Mazhari - Full Stack
cd /d "%~dp0"
echo Starting Mazhari backend and frontend. Press Ctrl+C to stop both.
call npm run dev:full
pause
