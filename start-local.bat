@echo off
echo ========================================
echo 🚀 Starting AdmitAI Application Locally
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.11+
    pause
    exit /b 1
)

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

echo ✅ Python version:
python --version
echo ✅ Node version:
node --version
echo.

REM Navigate to backend
echo 📦 Setting up Backend...
cd backend

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install -q -r requirements.txt

REM Start backend in new window
echo Starting Backend Server on http://localhost:8001...
start "AdmitAI Backend" cmd /k "venv\Scripts\activate && python server.py"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Navigate to frontend
cd ..\frontend

echo 📦 Setting up Frontend...

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing Node dependencies...
    call yarn install
)

REM Start frontend in new window
echo Starting Frontend Server on http://localhost:3000...
start "AdmitAI Frontend" cmd /k "yarn dev"

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo 🎉 AdmitAI is now running locally!
echo ========================================
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend:  http://localhost:8001
echo 📍 API Docs: http://localhost:8001/docs
echo.
echo ℹ️  Two terminal windows have opened:
echo    1. Backend window (Keep it open)
echo    2. Frontend window (Keep it open)
echo.
echo 🛑 To stop: Close both terminal windows
echo.
echo Press any key to open the application in browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo ✅ Browser opened. Check the terminal windows for logs.
echo.
pause
