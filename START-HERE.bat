@echo off
REM ===========================================================================
REM  HERMES NEURAL - 1-CLICK INSTALL + LAUNCHER (repo root)
REM  Double-click this file. It will:
REM    1. Check Node.js is installed
REM    2. Install every npm dependency inside webapp\ (first run only)
REM    3. Start the dashboard server and open it in your browser
REM  No command-line knowledge needed.
REM ===========================================================================
setlocal EnableExtensions
title Hermes Neural - 1-Click Dashboard
cd /d "%~dp0webapp"

echo.
echo ============================================================
echo    HERMES NEURAL - Self-Learning AI Trading Brain
echo    1-Click Installer ^& Launcher
echo ============================================================
echo.

REM --- 1. Node.js check ------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed on this PC.
    echo.
    echo Step 1: Open https://nodejs.org in your browser
    echo Step 2: Download the LTS installer ^(version 18 or newer^)
    echo Step 3: Install it with default options, then double-click this file again.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo [OK] Node.js found: %%v

REM --- 2. Dependency install (only when missing) ----------------------------
if not exist "node_modules\" (
    echo.
    echo [INSTALL] First run - downloading all packages, please wait 1-3 minutes...
    echo           This happens only once. Future starts are instant.
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependency install failed. Check your internet connection and re-run.
        pause
        exit /b 1
    )
    echo.
    echo [OK] All dependencies installed successfully.
) else (
    echo [OK] Dependencies already present - skipping install.
)

REM --- 3. Launch -------------------------------------------------------------
echo.
echo [LAUNCH] Starting dashboard at http://localhost:5173 ...
echo          Your browser will open automatically in a few seconds.
echo          Keep this window open. Press Ctrl+C here to stop the dashboard.
echo.

start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173/"
call npm run dev

echo.
echo Dashboard server stopped.
pause
endlocal
