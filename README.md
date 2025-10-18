# AI-Powered Physics Admission Test Application

A comprehensive admission test platform with AI-generated questions, Firebase authentication, and real-time evaluation.

## 🚀 Features

### Core Functionality
- ✅ **Firebase Authentication** - Secure email/password authentication
- ✅ **AI Question Generation** - Gemini AI with RAG (NCERT Physics textbook)
- ✅ **Multi-Level Testing** - Easy (10 min), Medium (35 min), Hard (45 min)
- ✅ **Real-Time Evaluation** - 6 criteria assessment
- ✅ **Email Notifications** - Gmail API for pass/fail notifications
- ✅ **Progress Tracking** - Track attempts and completion status
- ✅ **Dark Mode** - Theme persistence

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Firebase SDK
**Backend:** FastAPI, Python, Firebase Admin SDK, Supabase, Gemini AI, LangChain, ChromaDB

## 📋 Prerequisites

- Node.js 18+ and Yarn
- Python 3.11+
- Firebase project
- Supabase project
- Google AI (Gemini) API key
- Gmail OAuth credentials

## 🔧 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd <project-directory>

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials

# Frontend  
cd frontend
yarn install
cp .env.example .env
# Edit .env with your credentials
```

### 2. Run Development

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend
cd frontend
yarn dev
```

Visit http://localhost:3000

## 📖 Full Documentation

See the complete setup guide, API docs, and architecture details in the [Wiki](link-to-wiki).

## 🔒 Security

- Firebase Authentication
- JWT token protection
- Environment variables excluded from git
- Password hashing with SHA256 + salt

## 📝 License

MIT License

---

For detailed setup instructions, database schema, and API documentation, please refer to the project wiki.
