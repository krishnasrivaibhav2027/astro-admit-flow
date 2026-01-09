@echo off
echo ===================================================
echo Starting Backend Server (DEVELOPMENT MODE)
echo Single worker with hot reload enabled
echo ===================================================
echo.

cd /d %~dp0

:: Activate virtual environment and start uvicorn with reload
call .\venv\Scripts\activate.bat
uvicorn server:app --reload --port 8001

pause
