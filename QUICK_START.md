# ⚡ AdmitAI - Quick Start Guide

## 🎯 Fastest Way to Run Locally

### Prerequisites (One-time setup):
1. Install **Python 3.11+** → https://www.python.org/downloads/
2. Install **Node.js 18+** → https://nodejs.org/
3. Install **Git** → https://git-scm.com/

---

## 🚀 Option 1: Automated Start (Recommended)

### Mac/Linux:
```bash
./start-local.sh
```

### Windows:
```batch
start-local.bat
```

**That's it!** The script will:
- ✅ Set up Python virtual environment
- ✅ Install all dependencies
- ✅ Start backend on http://localhost:8001
- ✅ Start frontend on http://localhost:3000
- ✅ Open browser automatically (Windows)

---

## 🔧 Option 2: Manual Start

### Terminal 1 - Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

### Terminal 2 - Frontend:
```bash
cd frontend
yarn install  # or: npm install
yarn dev      # or: npm run dev
```

### Open Browser:
```
http://localhost:3000
```

---

## ⚙️ Environment Configuration

### Backend (.env) - Already configured ✅
```env
SUPABASE_URL="https://uminpkhjsrfogjtwqqfn.supabase.co"
GEMINI_API_KEY="AIzaSyA9p6MZriZ1KsmUi23MdJoqVhzkKrLDuGI"
FIREBASE_PROJECT_ID="ai-admission-26c27"
CORS_ORIGINS="http://localhost:3000"
```

### Frontend (.env) - **Update this for local:**
```env
VITE_BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001
```

🚨 **IMPORTANT:** Change backend URL from production URL to `http://localhost:8001`

---

## ✅ Verify Installation

### 1. Check Backend:
```bash
curl http://localhost:8001/api/health
```
**Expected:** `{"status":"healthy","database":"connected","rag_enabled":true}`

### 2. Check Frontend:
Open browser: `http://localhost:3000`
**Expected:** AdmitAI landing page loads

### 3. Test Registration:
1. Click "Get Started"
2. Fill registration form
3. Submit (Firebase authentication)

---

## 🛑 Stop Servers

### If using automated script:
- **Mac/Linux:** Press `Ctrl+C` in terminal
- **Windows:** Close both terminal windows

### If started manually:
- Press `Ctrl+C` in both terminals (Backend & Frontend)

---

## 🐛 Common Issues & Solutions

### Issue: Port already in use
```bash
# Kill process on port 8001 (Backend)
# Mac/Linux:
lsof -ti:8001 | xargs kill -9
# Windows:
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Kill process on port 3000 (Frontend)
# Mac/Linux:
lsof -ti:3000 | xargs kill -9
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Module not found
```bash
# Backend:
cd backend
source venv/bin/activate
pip install -r requirements.txt --force-reinstall

# Frontend:
cd frontend
rm -rf node_modules
yarn install
```

### Issue: CORS errors
**Solution:** Make sure `CORS_ORIGINS` in backend/.env includes `http://localhost:3000`

### Issue: Firebase auth not working
**Check:** Frontend `.env` has correct `VITE_FIREBASE_*` variables

---

## 📦 What's Running?

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | React UI |
| Backend API | http://localhost:8001 | FastAPI server |
| API Docs | http://localhost:8001/docs | Swagger UI |
| Health Check | http://localhost:8001/api/health | Status check |

---

## 🎓 Test the Application

1. **Register** a new user (use real email for Firebase verification)
2. **Verify email** (check inbox)
3. **Login** with credentials
4. **Start Easy Test** - Answer questions
5. **View Results** - See AI evaluation
6. **Check Profile** - View/edit phone number
7. **Try Review** - See correct answers and explanations

---

## 📊 Monitoring

### View Logs:
```bash
# Backend logs (if using automated script)
tail -f backend/backend.log

# Frontend logs (if using automated script)
tail -f frontend/frontend.log
```

### Watch Database:
Supabase Dashboard: https://supabase.com/dashboard/project/uminpkhjsrfogjtwqqfn

### Check API Status:
```bash
# Health check
curl http://localhost:8001/api/health

# Generate questions (requires auth token)
curl -X POST http://localhost:8001/api/generate-questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"level":"easy","num_questions":3}'
```

---

## 🔑 Important Files

| File | Purpose | Location |
|------|---------|----------|
| `backend/.env` | Backend config | `/backend/.env` |
| `frontend/.env` | Frontend config | `/frontend/.env` |
| `backend/server.py` | Main API | `/backend/server.py` |
| `backend/requirements.txt` | Python deps | `/backend/requirements.txt` |
| `frontend/package.json` | Node deps | `/frontend/package.json` |
| `LOCAL_SETUP_GUIDE.md` | Full guide | `/LOCAL_SETUP_GUIDE.md` |

---

## 🆘 Need More Help?

1. Read full guide: `LOCAL_SETUP_GUIDE.md`
2. Check backend terminal for errors
3. Check browser console (F12) for frontend errors
4. Verify all prerequisites are installed
5. Ensure .env files are configured correctly

---

## 🎉 You're Ready!

**Everything is set up and ready to use locally!**

Quick commands:
```bash
# Start everything
./start-local.sh  # Mac/Linux
start-local.bat   # Windows

# Access application
http://localhost:3000

# Check health
curl http://localhost:8001/api/health
```

**Happy developing! 🚀**
