@echo off
REM ===========================================================================
REM  Hermes Neural - Resume / repair the dashboard preview (port 5173)
REM
REM  Double-click this file after a restart, a git pull, or if the browser
REM  shows "cannot reach localhost:5173". It checks Node.js, restores the
REM  webapp dependencies if they are missing, type-checks the project, then
REM  starts the Vite dev server and opens the dashboard in your browser.
REM
REM  Note: Hermes is a simulated research platform. Live trading stays OFF.
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Hermes Neural Trading Brain - Resume Preview

set "WEBAPP=%~dp0webapp"
set "PORT=5173"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH.
    echo Install Node.js 18+ from https://nodejs.org and re-run this file.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   HERMES NEURAL - Resume Dashboard Preview
echo ============================================================
echo   Local URL : http://localhost:%PORT%/
echo   Mode      : simulated research platform (live trading OFF)
echo ============================================================
echo.

cd /d "%WEBAPP%"

if not exist "node_modules\" (
    echo [1/3] Dependencies missing - running npm install...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Check your network / npm setup.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies already present - skipping install.
)

echo [2/3] Type-checking the project...
call npx --no-install tsc --noEmit
if errorlevel 1 (
    echo.
    echo [ERROR] Type-check failed - fix the errors listed above.
    pause
    exit /b 1
)

echo [3/3] Starting Vite dev server on port %PORT% ...
echo       Press Ctrl+C in this window to stop the dashboard.
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:%PORT%/"

call npm run dev

echo.
echo Dashboard server stopped.
pause
endlocal
