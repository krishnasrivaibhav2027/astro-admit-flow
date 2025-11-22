#!/bin/bash

echo "🚀 Starting AdmitAI Application Locally..."
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "✅ Python version: $(python3 --version)"
echo "✅ Node version: $(node --version)"
echo ""

# Navigate to backend
echo "📦 Setting up Backend..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Start backend in background
echo "Starting Backend Server on http://localhost:8001..."
python server.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8001/api/health > /dev/null; then
    echo "❌ Backend failed to start. Check backend.log for errors"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully!"
echo ""

# Navigate to frontend
cd ../frontend

echo "📦 Setting up Frontend..."
# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    yarn install
fi

# Start frontend in background
echo "Starting Frontend Server on http://localhost:3000..."
yarn dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

echo ""
echo "=========================================="
echo "🎉 AdmitAI is now running locally!"
echo "=========================================="
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:8001"
echo "📍 API Docs: http://localhost:8001/docs"
echo ""
echo "📋 Backend logs:  tail -f backend/backend.log"
echo "📋 Frontend logs: tail -f frontend/frontend.log"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
wait
