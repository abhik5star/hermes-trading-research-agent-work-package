@echo off
REM ===========================================================================
REM  Hermes Neural - Autonomous AI Trading Brain Dashboard
REM  Windows one-click launcher (installs dependencies on first run, then
REM  starts the Vite dev server and opens the dashboard in the browser).
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Hermes Neural Trading Brain - Dashboard

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH.
    echo Install Node.js 18+ from https://nodejs.org and re-run this file.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   HERMES NEURAL - Self-Learning AI Trading Brain
echo ============================================================
echo.

if not exist "node_modules\" (
    echo [1/2] First run detected - installing dependencies via npm...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Check your network / npm setup.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Dependencies already installed - skipping install.
)

echo [2/2] Starting Vite dev server on http://localhost:5173 ...
echo       Press Ctrl+C in this window to stop the dashboard.
echo.

REM Open the browser shortly after the server boots
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173/"

call npm run dev

echo.
echo Dashboard server stopped.
pause
endlocal
