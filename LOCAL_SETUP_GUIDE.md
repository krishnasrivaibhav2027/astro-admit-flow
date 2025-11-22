# 🚀 AdmitAI Local Setup Guide

Complete guide to run the AdmitAI application on your local machine with all functionality working properly.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Clone/Download the Project](#clonedownload-the-project)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [External Services Configuration](#external-services-configuration)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Install the following on your local machine:

### Required Software:
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Verify Installation:
```bash
python --version  # Should show 3.11+
node --version    # Should show 18+
npm --version     # Should show 9+
git --version     # Should show 2+
```

---

## 2. Clone/Download the Project

If you have the project files, navigate to the project directory:

```bash
cd /path/to/admitai-project
```

Your project structure should look like:
```
admitai-project/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── .env
│   ├── rag_module.py
│   ├── firebase_config.py
│   └── NCERT-Physics.pdf
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── vite.config.ts
└── LOCAL_SETUP_GUIDE.md
```

---

## 3. Backend Setup

### Step 3.1: Create Python Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### Step 3.2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3.3: Configure Backend Environment Variables

Create/Edit `backend/.env` file:

```env
# Supabase Configuration (PostgreSQL Database)
SUPABASE_URL="https://uminpkhjsrfogjtwqqfn.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5wa2hqc3Jmb2dqdHdxcWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjI2MTAsImV4cCI6MjA3NjAzODYxMH0.G0Y6sF8F3DauTHOf5LaJGYzOiCHnGAstQwGCPQH5O5Y"

# CORS Configuration (Allow local frontend)
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Gemini AI Configuration
GEMINI_API_KEY="AIzaSyA9p6MZriZ1KsmUi23MdJoqVhzkKrLDuGI"

# LangChain Configuration (Optional - for monitoring)
LANGCHAIN_TRACING_V2="false"
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY=""
LANGCHAIN_PROJECT="AI Admission Local"

# Gmail SMTP Configuration (Optional - for email notifications)
GMAIL_CLIENT_SECRET=""
GMAIL_CLIENT_ID=""
GMAIL_REFRESH_TOKEN=""
GMAIL_FROM_EMAIL="noreply@admitai.com"

# Firebase Configuration
FIREBASE_PROJECT_ID="ai-admission-26c27"
FIREBASE_WEB_API_KEY="AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"
```

**Important Notes:**
- The Supabase URL and KEY are already configured for the existing database
- You can use the existing Gemini API key or replace with your own
- Gmail configuration is optional (only needed for email notifications)
- Firebase credentials are already set up

### Step 3.4: Run Backend Server

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the server
python server.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

**Backend will run on:** `http://localhost:8001`

---

## 4. Frontend Setup

### Step 4.1: Install Node Dependencies

Open a **NEW terminal** (keep backend running):

```bash
cd frontend

# Install dependencies using yarn (recommended) or npm
yarn install
# OR
npm install
```

### Step 4.2: Configure Frontend Environment Variables

Create/Edit `frontend/.env` file:

```env
# Backend URL (Local)
VITE_BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001

# Supabase Configuration (Same as backend)
VITE_SUPABASE_PROJECT_ID="uminpkhjsrfogjtwqqfn"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_FsA783cALnkTbAKh3bdf_g_trlucKFj"
VITE_SUPABASE_URL="https://uminpkhjsrfogjtwqqfn.supabase.co"

# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY="AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"
VITE_FIREBASE_AUTH_DOMAIN="ai-admission-26c27.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="ai-admission-26c27"
VITE_FIREBASE_STORAGE_BUCKET="ai-admission-26c27.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="363919730505"
VITE_FIREBASE_APP_ID="1:363919730505:web:07229defb7152ea484dc98"
VITE_FIREBASE_MEASUREMENT_ID="G-3TWPV7QBRS"

# Optional - Development settings
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

**🚨 CRITICAL:** Make sure `VITE_BACKEND_URL` is set to `http://localhost:8001`

### Step 4.3: Run Frontend Development Server

```bash
# Make sure you're in the frontend directory
cd frontend

# Start the development server
yarn dev
# OR
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Frontend will run on:** `http://localhost:3000`

---

## 5. External Services Configuration

### 5.1 Supabase Database (Already Configured)

The application uses an existing Supabase database. No additional setup needed!

**Database Tables:**
- `students` - User profiles
- `results` - Test results
- `questions` - Test questions
- `student_answers` - Student responses
- `question_reviews` - Cached reviews
- `ai_notes` - AI-generated study notes

### 5.2 Firebase Authentication (Already Configured)

Firebase is already set up for authentication. The configuration in `.env` files is complete.

**Features enabled:**
- Email/Password authentication
- Password reset
- Email verification (optional)

### 5.3 Gemini AI API (Already Configured)

The Gemini API key is already set in the backend `.env` file.

**Used for:**
- Generating physics questions
- Evaluating student answers
- Providing AI feedback

---

## 6. Running the Application

### Complete Startup Sequence:

1. **Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python server.py
```

2. **Terminal 2 - Frontend:**
```bash
cd frontend
yarn dev  # or: npm run dev
```

3. **Open Browser:**
```
http://localhost:3000
```

### Verify Everything is Working:

1. **Check Backend Health:**
   - Open: `http://localhost:8001/api/health`
   - Should return: `{"status": "healthy", "database": "connected", "rag_enabled": true}`

2. **Check Frontend:**
   - Open: `http://localhost:3000`
   - You should see the AdmitAI landing page

3. **Test Registration:**
   - Click "Get Started" or "Register"
   - Fill in the form
   - Submit and verify Firebase authentication works

---

## 7. Testing

### Test User Registration & Login:

1. Navigate to `http://localhost:3000`
2. Click "Register" or "Get Started"
3. Fill in:
   - First Name: Test
   - Last Name: User
   - Date of Birth: Select a date
   - Email: your_email@gmail.com (use a real email for Firebase)
   - Phone: +1234567890
   - Password: TestPassword123! (must meet requirements)
4. Submit the form
5. Firebase will send a verification email (check your inbox)
6. Click the verification link in the email
7. Return to the app and login

### Test Question Generation:

1. After login, you'll see the Levels page
2. Click "Start Test" on Easy level
3. Questions should load (from Gemini AI + RAG)
4. Answer the questions
5. Submit and see your evaluation

### Test Complete Flow:

```bash
# In project root, you can run:
python test_diversity.py  # Test question diversity
```

---

## 8. Troubleshooting

### Issue: Backend won't start

**Check Python version:**
```bash
python --version  # Should be 3.11+
```

**Reinstall dependencies:**
```bash
cd backend
pip install -r requirements.txt --force-reinstall
```

**Check if port 8001 is already in use:**
```bash
# Windows:
netstat -ano | findstr :8001
# Mac/Linux:
lsof -i :8001
```

### Issue: Frontend won't start

**Clear cache and reinstall:**
```bash
cd frontend
rm -rf node_modules package-lock.json yarn.lock
yarn install  # or: npm install
```

**Check if port 3000 is already in use:**
```bash
# Windows:
netstat -ano | findstr :3000
# Mac/Linux:
lsof -i :3000
```

### Issue: CORS errors

**Make sure backend .env has:**
```env
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

**Restart backend after changing .env**

### Issue: Firebase authentication fails

**Check Firebase console:**
1. Go to: https://console.firebase.google.com/
2. Select project: ai-admission-26c27
3. Go to Authentication → Sign-in method
4. Ensure "Email/Password" is enabled

### Issue: Questions not generating

**Check Gemini API key:**
```bash
# Test API key
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

**Check backend logs:**
```bash
# Backend terminal should show:
INFO:     POST /api/generate-questions HTTP/1.1 200 OK
```

### Issue: Database connection fails

**Verify Supabase credentials:**
```bash
# Test connection
curl -X GET "https://uminpkhjsrfogjtwqqfn.supabase.co/rest/v1/" \
  -H "apikey: YOUR_SUPABASE_KEY"
```

---

## 9. Common Local Development Commands

### Backend Commands:
```bash
# Activate virtual environment
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install new package
pip install package_name
pip freeze > requirements.txt

# Run tests
python -m pytest

# Check Python code quality
pip install black flake8
black server.py
flake8 server.py
```

### Frontend Commands:
```bash
cd frontend

# Install new package
yarn add package_name
# or: npm install package_name

# Build for production
yarn build
# or: npm run build

# Preview production build
yarn preview
# or: npm run preview

# Lint code
yarn lint
# or: npm run lint
```

---

## 10. Environment Variables Summary

### Backend (.env):
| Variable | Value | Purpose |
|----------|-------|---------|
| SUPABASE_URL | https://... | Database connection |
| SUPABASE_KEY | eyJ... | Database API key |
| CORS_ORIGINS | http://localhost:3000 | Allow frontend |
| GEMINI_API_KEY | AIza... | AI question generation |
| FIREBASE_PROJECT_ID | ai-admission-26c27 | Firebase auth |

### Frontend (.env):
| Variable | Value | Purpose |
|----------|-------|---------|
| VITE_BACKEND_URL | http://localhost:8001 | Backend API |
| VITE_FIREBASE_API_KEY | AIza... | Firebase auth |
| VITE_SUPABASE_URL | https://... | Database (optional) |

---

## 11. Production vs Local Differences

| Aspect | Production | Local Development |
|--------|-----------|-------------------|
| Backend URL | https://repair-wizard-26.preview... | http://localhost:8001 |
| Frontend URL | https://repair-wizard-26.preview... | http://localhost:3000 |
| CORS | Restricted | localhost:3000 |
| Hot Reload | No | Yes (both) |
| SSL | Yes | No |
| Environment | Docker/Kubernetes | Native |

---

## 12. Quick Start Script

Create a `start-local.sh` (Mac/Linux) or `start-local.bat` (Windows):

**Mac/Linux:**
```bash
#!/bin/bash

# Start backend
cd backend
source venv/bin/activate
python server.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend
yarn dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "✅ Application started!"
echo "Backend: http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

wait
```

**Windows:**
```batch
@echo off

echo Starting AdmitAI locally...

start "Backend" cmd /k "cd backend && venv\Scripts\activate && python server.py"
timeout /t 3

start "Frontend" cmd /k "cd frontend && yarn dev"

echo.
echo ✅ Application started!
echo Backend: http://localhost:8001
echo Frontend: http://localhost:3000
echo.
echo Close both terminal windows to stop the application
```

Make executable:
```bash
chmod +x start-local.sh
./start-local.sh
```

---

## 13. Need Help?

### Check Logs:
- **Backend logs:** Terminal where you ran `python server.py`
- **Frontend logs:** Terminal where you ran `yarn dev`
- **Browser console:** Press F12 in browser

### Verify Services:
```bash
# Backend health check
curl http://localhost:8001/api/health

# Frontend check
curl http://localhost:3000
```

### Database Check:
```bash
# Check Supabase connection
curl -X GET "https://uminpkhjsrfogjtwqqfn.supabase.co/rest/v1/students" \
  -H "apikey: YOUR_SUPABASE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_KEY"
```

---

## 🎉 You're All Set!

Your AdmitAI application should now be running locally with full functionality:

✅ Backend API on http://localhost:8001
✅ Frontend UI on http://localhost:3000
✅ Firebase Authentication
✅ Supabase Database
✅ Gemini AI Question Generation
✅ RAG System with Physics PDF

**Next Steps:**
1. Register a test user
2. Login and start a test
3. Explore all features
4. Make modifications as needed

**Happy Developing! 🚀**
