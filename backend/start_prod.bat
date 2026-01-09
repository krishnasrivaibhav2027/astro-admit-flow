@echo off
echo ===================================================
echo Starting Backend Server (PRODUCTION MODE)
echo 4 workers for better concurrency
echo ===================================================
echo.

cd /d %~dp0

:: Activate virtual environment and start uvicorn with multiple workers
call .\venv\Scripts\activate.bat
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

pause
