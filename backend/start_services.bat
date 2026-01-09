@echo off
echo Starting Astro Admit Flow Services...
echo.

:: Start Main Backend Server (Port 8001)
:: Use DEV_MODE=1 environment variable for development mode with hot reload
:: Otherwise use production mode with 4 workers

if "%DEV_MODE%"=="1" (
    echo Starting Main Backend Server (DEVELOPMENT MODE - 1 worker with reload)...
    start "Backend Server" cmd /k ".\venv\Scripts\uvicorn.exe server:app --reload --port 8001"
) else (
    echo Starting Main Backend Server (PRODUCTION MODE - 4 workers)...
    start "Backend Server" cmd /k ".\venv\Scripts\uvicorn.exe server:app --host 0.0.0.0 --port 8001 --workers 4"
)

echo.
echo ===================================================
echo Service launched!
echo  - Main Backend: http://localhost:8001/docs
echo.
echo TIP: Set DEV_MODE=1 for hot reload during development
echo ===================================================
echo.
pause

