@echo off
REM ===========================================================================
REM  HERMES NEURAL - full install + verification (run from webapp\)
REM  Installs every dependency and runs a production build to prove the
REM  toolchain works. Use this on a fresh PC / after pulling new code.
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Hermes Neural - Setup ^& Verify

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install LTS from https://nodejs.org and re-run.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   HERMES NEURAL - Full Setup
echo ============================================================
echo.

echo [1/3] Installing npm dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Type-checking the engine...
call npx tsc --noEmit
if errorlevel 1 (
    echo [ERROR] Type-check failed - report the messages above.
    pause
    exit /b 1
)

echo.
echo [3/3] Building production bundle (verification)...
call npm run build
if errorlevel 1 (
    echo [ERROR] Production build failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   SETUP COMPLETE. Everything is installed and verified.
echo   Double-click start-dashboard.bat (or START-HERE.bat at
echo   the repo root) to open the dashboard.
echo ============================================================
echo.
pause
endlocal
