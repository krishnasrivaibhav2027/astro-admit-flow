@echo off
echo Starting Astro Admit Flow Services...
echo.

:: 1. Start Qwen Inference Service (Port 8002)
echo Starting Qwen Microservice (Port 8002)...
start "Qwen Service" cmd /k ".\venv\Scripts\python.exe qwen_service.py"

:: Wait a few seconds for model to load
echo Waiting 5 seconds for model initialization...
timeout /t 5 /nobreak >nul

:: 2. Start Main Backend Server (Port 8001)
echo Starting Main Backend Server (Port 8001)...
start "Backend Server" cmd /k ".\venv\Scripts\uvicorn.exe server:app --reload --port 8001"

echo.
echo ===================================================
echo Services launched in separate windows!
echo  - Qwen Service: http://localhost:8002/health
echo  - Main Backend: http://localhost:8001/docs
echo ===================================================
echo.
pause
