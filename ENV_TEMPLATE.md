# 🔐 Environment Variables Template

This document contains all environment variables needed for local setup.

---

## Backend Environment Variables (`backend/.env`)

Create a file named `.env` in the `backend/` directory with the following content:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# Supabase PostgreSQL Database (REST API)
SUPABASE_URL="https://uminpkhjsrfogjtwqqfn.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5wa2hqc3Jmb2dqdHdxcWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjI2MTAsImV4cCI6MjA3NjAzODYxMH0.G0Y6sF8F3DauTHOf5LaJGYzOiCHnGAstQwGCPQH5O5Y"

# ============================================
# CORS CONFIGURATION
# ============================================
# Important: Add localhost for local development
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# ============================================
# AI / ML CONFIGURATION
# ============================================
# Google Gemini AI API Key (for question generation and evaluation)
GEMINI_API_KEY="AIzaSyA9p6MZriZ1KsmUi23MdJoqVhzkKrLDuGI"

# ============================================
# LANGCHAIN CONFIGURATION (Optional)
# ============================================
# Set to "false" for local development to avoid unnecessary API calls
LANGCHAIN_TRACING_V2="false"
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY=""
LANGCHAIN_PROJECT="AI Admission Local"

# ============================================
# EMAIL CONFIGURATION (Optional)
# ============================================
# Gmail OAuth credentials for sending email notifications
# Leave empty if not using email features
GMAIL_CLIENT_SECRET=""
GMAIL_CLIENT_ID=""
GMAIL_REFRESH_TOKEN=""
GMAIL_FROM_EMAIL="noreply@admitai.com"

# ============================================
# FIREBASE CONFIGURATION
# ============================================
# Firebase Admin SDK for token verification
FIREBASE_PROJECT_ID="ai-admission-26c27"
FIREBASE_WEB_API_KEY="AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"
```

---

## Frontend Environment Variables (`frontend/.env`)

Create a file named `.env` in the `frontend/` directory with the following content:

```env
# ============================================
# BACKEND API CONFIGURATION
# ============================================
# 🚨 CRITICAL: Change this for local development
# Production: https://repair-wizard-26.preview.emergentagent.com
# Local: http://localhost:8001
VITE_BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001

# ============================================
# SUPABASE CONFIGURATION
# ============================================
VITE_SUPABASE_PROJECT_ID="uminpkhjsrfogjtwqqfn"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_FsA783cALnkTbAKh3bdf_g_trlucKFj"
VITE_SUPABASE_URL="https://uminpkhjsrfogjtwqqfn.supabase.co"

# ============================================
# FIREBASE AUTHENTICATION CONFIGURATION
# ============================================
VITE_FIREBASE_API_KEY="AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"
VITE_FIREBASE_AUTH_DOMAIN="ai-admission-26c27.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="ai-admission-26c27"
VITE_FIREBASE_STORAGE_BUCKET="ai-admission-26c27.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="363919730505"
VITE_FIREBASE_APP_ID="1:363919730505:web:07229defb7152ea484dc98"
VITE_FIREBASE_MEASUREMENT_ID="G-3TWPV7QBRS"

# ============================================
# DEVELOPMENT SETTINGS
# ============================================
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## 🔑 Important Notes

### 1. Backend URL Configuration
**The most common issue when running locally:**

- **Production:** `VITE_BACKEND_URL=https://repair-wizard-26.preview.emergentagent.com`
- **Local:** `VITE_BACKEND_URL=http://localhost:8001`

Make sure to change this in `frontend/.env` when running locally!

### 2. CORS Configuration
The backend must allow requests from your local frontend:
```env
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

### 3. API Keys (Already Configured)
All API keys are already set:
- ✅ Supabase Database
- ✅ Gemini AI
- ✅ Firebase Authentication

### 4. Optional Services
You can leave these empty for local development:
- Gmail SMTP (not needed unless testing emails)
- LangChain tracing (set to "false")

---

## 📋 Environment Variables Checklist

### Backend (.env):
- [ ] `SUPABASE_URL` - Database URL
- [ ] `SUPABASE_KEY` - Database API key
- [ ] `CORS_ORIGINS` - Includes `http://localhost:3000`
- [ ] `GEMINI_API_KEY` - AI API key
- [ ] `FIREBASE_PROJECT_ID` - Firebase project

### Frontend (.env):
- [ ] `VITE_BACKEND_URL` - Set to `http://localhost:8001`
- [ ] `REACT_APP_BACKEND_URL` - Set to `http://localhost:8001`
- [ ] `VITE_FIREBASE_API_KEY` - Firebase auth
- [ ] `VITE_SUPABASE_URL` - Database URL

---

## 🔄 Switching Between Environments

### For Local Development:
```env
# frontend/.env
VITE_BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001
```

### For Production:
```env
# frontend/.env
VITE_BACKEND_URL=https://repair-wizard-26.preview.emergentagent.com
REACT_APP_BACKEND_URL=https://repair-wizard-26.preview.emergentagent.com
```

**Remember to restart the frontend after changing .env files!**

---

## 🛠️ How to Use

### Step 1: Copy Templates
```bash
# Backend
cp ENV_TEMPLATE.md backend/.env

# Frontend
cp ENV_TEMPLATE.md frontend/.env
```

### Step 2: Edit for Local
Open `frontend/.env` and change:
```env
VITE_BACKEND_URL=http://localhost:8001
```

### Step 3: Restart Servers
```bash
# Restart backend
cd backend
python server.py

# Restart frontend (in new terminal)
cd frontend
yarn dev
```

---

## 🔍 Verify Configuration

### Check Backend Config:
```bash
cd backend
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('GEMINI_API_KEY:', os.getenv('GEMINI_API_KEY')[:10] + '...')"
```

### Check Frontend Config:
```bash
cd frontend
grep VITE_BACKEND_URL .env
```

Expected output: `VITE_BACKEND_URL=http://localhost:8001`

---

## 🆘 Troubleshooting

### Issue: Changes not reflecting
**Solution:** Restart the server after modifying .env files

### Issue: CORS errors in browser console
**Solution:** Check `CORS_ORIGINS` in backend/.env includes your frontend URL

### Issue: API calls failing
**Solution:** Verify `VITE_BACKEND_URL` in frontend/.env is correct

### Issue: Firebase authentication not working
**Solution:** Check all `VITE_FIREBASE_*` variables are set correctly

---

## 📝 Environment Variables Reference

| Variable | Required | Service | Purpose |
|----------|----------|---------|---------|
| SUPABASE_URL | ✅ Yes | Backend | Database connection |
| SUPABASE_KEY | ✅ Yes | Backend | Database API key |
| GEMINI_API_KEY | ✅ Yes | Backend | AI question generation |
| FIREBASE_PROJECT_ID | ✅ Yes | Backend | Firebase auth |
| VITE_BACKEND_URL | ✅ Yes | Frontend | API endpoint |
| VITE_FIREBASE_API_KEY | ✅ Yes | Frontend | Firebase auth |
| CORS_ORIGINS | ✅ Yes | Backend | Security |
| GMAIL_* | ❌ No | Backend | Email notifications |
| LANGCHAIN_* | ❌ No | Backend | Monitoring |

---

## 🎉 Ready to Go!

Once you have both `.env` files configured:

1. Start backend: `python backend/server.py`
2. Start frontend: `cd frontend && yarn dev`
3. Open browser: `http://localhost:3000`

**All environment variables are now properly configured!**
