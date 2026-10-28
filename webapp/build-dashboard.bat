@echo off
REM ===========================================================================
REM  Hermes Neural - production build + local preview launcher for Windows.
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Hermes Neural - Production Build

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install --no-audit --no-fund || (pause & exit /b 1)
)

echo.
echo [1/2] Type-check and production build...
call npm run build || (pause & exit /b 1)

echo.
echo [2/2] Serving production build at http://localhost:4173 ...
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4173/"
call npm run preview

pause
endlocal
