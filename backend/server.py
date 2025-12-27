from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

# Log Suppression for Socket.IO
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find("/socket.io") == -1

logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
from datetime import datetime, timezone
import json
import smtplib
import base64
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


from supabase import create_client, Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
# from firebase_config import initialize_firebase, verify_firebase_token
from settings_manager import settings_manager

# Import RAG module
from question_bank_service import QuestionBankService

# Initialize Redis
from redis_client import redis_manager
from socket_manager import socket_manager

try:
    from rag_hybrid import get_context, check_and_ingest
    RAG_ENABLED = True
except Exception as e:
    print(f"RAG not available: {e}")
    RAG_ENABLED = False
    def get_context(query, subject="physics", k=3, randomize=True):
        return []
    async def check_and_ingest(subject):
        pass

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Firebase Admin SDK


# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize LangChain LLM (Dynamic)
llm = None
# Imports moved to ai_service
import ai_service


# safe_invoke moved to utils_llm
from utils_llm import safe_invoke


# Create the main app
app = FastAPI()
app.mount("/socket.io", socket_manager.app)

# Add temporary route to restore admin
@app.get("/restore-admin")
async def restore_admin_route(email: str = "vasudevguptha@gmail.com"):
    # (Rest of admin logic unchanged)
    # Use Service Role Key if available for admin actions
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not service_role_key:
        return {"error": "SUPABASE_SERVICE_ROLE_KEY not found in env. Cannot perform admin text."}
    
    # Create a separate admin client with the service role key
    # Note: Standard 'supabase' client uses anon key usually.
    admin_supabase: Client = create_client(supabase_url, service_role_key)

    try:
        logging.info(f"Restoring/Fixing Admin: {email}")
        
        # 1. Check if user exists in Auth
        response = admin_supabase.auth.admin.list_users()
        users = response if isinstance(response, list) else response.users
        target_user = next((u for u in users if u.email == email), None)
        
        if not target_user:
             return {"error": f"User {email} not found in Auth. Please Signup first."}
        
        # 2. Force Confirm Email
        if not target_user.email_confirmed_at:
            logging.info(f"Confirming email for {target_user.id}")
            admin_supabase.auth.admin.update_user_by_id(target_user.id, {"email_confirm": True})
        
        # 3. Ensure in public.admins table
        admin_res = admin_supabase.table("admins").select("*").eq("id", target_user.id).execute()
        if not admin_res.data:
             logging.info("Inserting into public.admins table...")
             first = "Admin"
             last = "User"
             if "vasudev" in email: 
                 first = "Vasudev"
                 last = "Guptha"
             
             admin_supabase.table("admins").insert({
                 "id": target_user.id,
                 "email": email,
                 "first_name": first,
                 "last_name": last,
                 "role": "admin"
             }).execute()
             
        return {"message": f"SUCCESS: User {email} is now CONFIRMED and linked in admins table. You can login."}

    except Exception as e:
        logging.error(f"Restore Admin Error: {e}")
        return {"error": str(e)}

# ... imports

# ... imports

# Custom Logging Dependency (Safe & Non-blocking)
from fastapi import Request
async def log_request_info(request: Request):
    # Print directly to console to bypass any logger config issues
    print(f"📥 REQUEST: {request.method} {request.url.path}")

# Create the main app with global logging dependency
app = FastAPI(dependencies=[Depends(log_request_info)])

# ... (rest of app setup)

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",  # Allow all origins (regex) to support credentials
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3003", 
        "http://localhost:3004", 
        "http://localhost:3005"
    ], # Explicitly allow frontend ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for generated images
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Create static directory if it doesn't exist
static_images_dir = Path("static/generated_images")
static_images_dir.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

api_router = APIRouter(prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Startup tasks: Connect Redis, Check RAG, Verify DB"""
    print("\n" + "="*50)
    print("🚀 STARTING SERVER STARTUP TASKS")
    print("="*50 + "\n")
    
    # 1. Verify Supabase Connection
    try:
        print("🔌 Testing Supabase DB Connection...")
        # Simple query to check connectivity
        res = supabase.table("students").select("count", count="exact").limit(1).execute()
        print(f"✅ Supabase DB Connected! (Response: {res.count} students)")
    except Exception as e:
        print(f"❌ Supabase DB Connection Failed: {e}")

    # 2. Redis
    redis_manager._initialize()
    
    # 3. Initialize Checkpointer (Async)
    try:
        from chatbot_graph import get_checkpointer
        checkpointer = await get_checkpointer()
        if checkpointer:
            print("✅ LangGraph Redis Checkpointer initialized.")
    except Exception as e:
        print(f"⚠️ Checkpointer init warning: {e}")
    
    # 4. Trigger RAG Ingestion in Background
    # REMOVED per user request: Ingestion is now lazy-loaded on "Generate Questions".
    pass

    try:
        settings = settings_manager.get_settings()
        model_name = settings.get("model", "")
        if "Local" in model_name or "Qwen" in model_name and "fireworks" not in model_name:
            print(f"🚀 Pre-loading Local Model: {model_name}...")
            # Import here to avoid circular dependency issues if any
            from local_llm_engine import engine
            engine.load_model()
    except Exception as e:
        print(f"⚠️ Failed to preload local model: {e}")
        
    print("\n✅ SERVER STARTUP COMPLETE. READY.\n")
    
    # DEBUG: Print all registered routes to verify paths
    print("\n🔍 REGISTERED ROUTES:")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = ", ".join(route.methods) if hasattr(route, "methods") else "ANY"
            print(f"   {methods:<10} {route.path}")
    print("="*50 + "\n")

# Include Admin Router
from admin_routes import admin_router
app.include_router(admin_router)

# Include Chat Router
from chat_routes import router as chat_router
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])

# Include LangGraph Chatbot Router
from chatbot_routes import router as chatbot_graph_router
app.include_router(chatbot_graph_router, prefix="/api/bot", tags=["bot"])

# CRITICAL: Include the main API router (Student, Auth, Health, etc.)
# This was missing, causing 404s for /api/logout, /api/students, etc.
app.include_router(api_router)

# Import Models and Prompts
from models import (
    EvaluationCriteria, StudentCreate, UpdatePhoneRequest, GenerateQuestionsRequest,
    CreateResultRequest, SaveQuestionsRequest, SubmitTestRequest, EvaluateAnswersRequest,
    NotificationEmailRequest, SendConfirmationEmailRequest, LogoutRequest, SettingsUpdateRequest
)
from prompts import (
    generate_questions_prompt_physics, generate_questions_prompt_math, generate_questions_prompt_chemistry,
    evaluate_answer_prompt_physics, evaluate_answer_prompt_math, evaluate_answer_prompt_chemistry
)



# Models and Prompts imported from external files

# ===== AUTHENTICATION =====
from auth_dependencies import get_current_user, get_current_user_with_activity, security





# ===== BASIC ROUTES =====
@api_router.get("/")
async def root():
    return {
        "message": "AdmitAI API - LangGraph + RAG + Gemini",
        "status": "operational",
        "rag_enabled": RAG_ENABLED
    }


@api_router.get("/health")
async def health_check():
    try:
        _ = supabase.table("students").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "rag_enabled": RAG_ENABLED,
            "supabase_url": supabase_url
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "error",
            "error": str(e)
        }


# ===== STUDENT ENDPOINTS =====
@api_router.post("/students")
async def create_student(student: StudentCreate, current_user: Dict = Depends(get_current_user_with_activity)):
    """Create student - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Check if student already exists by email
        existing_response = supabase.table("students").select("*").eq("email", student.email).execute()
        if existing_response.data and len(existing_response.data) > 0:
            # Student already exists, return existing student
            return existing_response.data[0]
        
        # Check for admin domain
        role = 'student'
        try:
            # Hardcoded check for reliability
            domain = student.email.split('@')[-1]
            if domain == 'admin.com':
                role = 'admin'
            else:
                # DB check for other domains
                settings_response = supabase.table("admin_settings").select("value").eq("key", "allowed_admin_domains").execute()
                if settings_response.data:
                    allowed_domains = json.loads(settings_response.data[0]['value'])
                    if domain in allowed_domains:
                        role = 'admin'
        except Exception as e:
            logging.error(f"Error checking admin domain: {e}")
            # Fallback for safety
            if student.email.endswith('@admin.com'):
                role = 'admin'

        # Generate UUID for new student (let Supabase auto-generate)
        student_data = {
            "first_name": student.first_name,
            "last_name": student.last_name,
            "age": student.age,
            "dob": student.dob,
            "email": student.email,
            "phone": student.phone,
            "role": role
        }
        
        response = supabase.table("students").insert(student_data).execute()
        
        # Sync with admins table if role is admin
        if role == 'admin':
            try:
                admin_data = {
                    "firebase_uid": current_user.get('uid'), # Using Supabase UID for legacy column compatibility
                    "email": student.email,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "role": "admin"
                }
                # Check if already exists in admins to avoid duplicates
                existing_admin = supabase.table("admins").select("id").eq("email", student.email).execute()
                if not existing_admin.data:
                    supabase.table("admins").insert(admin_data).execute()
                    logging.info(f"✅ Synced new admin to admins table: {student.email}")
            except Exception as e:
                logging.error(f"Failed to sync admin to admins table: {e}")
                # Don't fail the request, just log it

        if hasattr(response, 'data') and response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/by-email/{email}")
async def get_student_by_email(email: str, current_user: Dict = Depends(get_current_user_with_activity)):
    """Get student by email - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is requesting their own data
        if email != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        response = supabase.table("students").select("*").eq("email", email).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting student by email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/students/{student_id}/phone")
async def update_student_phone(student_id: str, request: UpdatePhoneRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Update student phone number - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is updating their own data
        if student_id != request.student_id:
            raise HTTPException(status_code=400, detail="Student ID mismatch")
        
        # Update phone number in Supabase
        response = supabase.table("students").update({
            "phone": request.phone
        }).eq("id", student_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        logging.info(f"✅ Phone updated for student: {student_id}")
        return {"success": True, "message": "Phone number updated successfully", "student": response.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating phone: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentCreate, current_user: Dict = Depends(get_current_user_with_activity)):
    """Update full student profile - Authenticated (Force Reload)"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify ownership (via email match)
        # Note: 'student' model contains the new email, but we should verify the ID matches the logged-in user's DB record
        
        # Fetch current student to verify ID matches Auth Email
        current_student_res = supabase.table("students").select("email").eq("id", student_id).execute()
        if not current_student_res.data or current_student_res.data[0]['email'] != current_user['email']:
             raise HTTPException(status_code=403, detail="Cannot update other users' data")
        
        # Update data
        update_data = {
            "first_name": student.first_name,
            "last_name": student.last_name,
            "age": student.age,
            "dob": student.dob,
            "phone": student.phone
            # We explicitly do NOT update email here to avoid auth issues, or needs separate flow
        }
        
        response = supabase.table("students").update(update_data).eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
            
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}")
async def get_student(student_id: str, current_user: Dict = Depends(get_current_user)):
    """Get student by ID - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        response = supabase.table("students").select("*").eq("id", student_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Student not found")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students")
async def list_students(current_user: Dict = Depends(get_current_user)):
    """List all students - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        response = supabase.table("students").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/logout")
async def logout(request: LogoutRequest, user: Dict = Depends(get_current_user)):
    """Logout user and update logout_time"""
    try:
        email = user['email']
        logout_time = datetime.now(timezone.utc).isoformat()
        
        # Try to update student
        student_res = supabase.table("students").update({
            "logout_time": logout_time,
            "last_active_at": logout_time
        }).eq("email", email).execute()
        
        # If not found in students (or even if found, to be safe for admins who might be in both),
        # try to update admin
        # We don't error if not found in students, just try admins.
        
        # Check if updated any student
        if not student_res.data:
            # Try admins
            supabase.table("admins").update({
                "logout_time": logout_time,
                "last_active_at": logout_time
            }).eq("email", email).execute()
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        logging.error(f"Logout error: {e}")
        # We don't want to block the frontend logout if backend tracking fails
        # so we log and return success or raise simple error.
        # But raising 500 might stop frontend from clearing token if not handled well.
        # Ideally frontend wipes token regardless of backend response.
        raise HTTPException(status_code=500, detail=str(e))


# ===== ADMIN SETTINGS ROUTES =====
@api_router.get("/admin/settings")
async def get_settings(current_user: Dict = Depends(get_current_user)):
    """Get current admin settings"""
    try:
        # Verify admin role (simplified check)
        # In a real app, we'd check the DB role here too
        return settings_manager.get_settings()
    except Exception as e:
        logging.error(f"Error fetching settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/settings")
async def update_settings(settings: SettingsUpdateRequest, current_user: Dict = Depends(get_current_user)):
    """Update admin settings"""
    try:
        logging.info(f"⚙️ Updating settings: {settings.model_dump()}")
        
        # Update settings
        new_settings = settings_manager.update_settings(settings.model_dump())
        
        # Log activity
        admin_name = current_user.get('name', current_user.get('email', 'Unknown Admin'))
        
        # Create a summary of changes (simplified)
        details = f"Model: {new_settings.get('model')}, Temp: {new_settings.get('temperature')}, Pass: {new_settings.get('passing_score')}%, Attempts: {new_settings.get('max_attempts')}"
        
        settings_manager.log_activity(
            admin_name=admin_name,
            action="Updated System Settings",
            details=details
        )
        


        
        return {"success": True, "settings": new_settings}
    except Exception as e:
        logging.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/student/announcements")
async def get_student_announcements(current_user: Dict = Depends(get_current_user_with_activity)):
    """Get announcements for the current student based on their status"""
    try:
        # 1. Determine student status (passed or not)
        # We define "passed" as having passed the 'hard' level
        
        student_response = supabase.table("students").select("id").eq("email", current_user['email']).execute()
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_db_id = student_response.data[0]['id']
        
        # Check if passed hard level
        results_response = supabase.table("results").select("result").eq("student_id", student_db_id).eq("level", "hard").eq("result", "pass").execute()
        is_passed = len(results_response.data) > 0
        
        # 2. Fetch announcements
        # We want announcements where target_audience is 'all', 'students', or ('passed_students' AND is_passed)
        
        audiences = ["all", "students"]
        if is_passed:
            audiences.append("passed_students")
            
        response = supabase.table("announcements").select("*").in_("target_audience", audiences).order("created_at", desc=True).execute()
        
        return response.data
        
    except Exception as e:
        logging.error(f"Error fetching student announcements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== AI-POWERED QUESTION GENERATION WITH RAG =====
# ===== CONSTANTS =====
LEVEL_DURATIONS = {
    "easy": 10 * 60,    # 10 minutes
    "medium": 35 * 60,  # 35 minutes
    "hard": 45 * 60     # 45 minutes
}

class SaveAnswerRequest(BaseModel):
    result_id: str
    question_id: str
    student_answer: str

# ... (existing code) ...

@api_router.post("/create-result")
async def create_result(request: CreateResultRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Create test result entry or resume existing - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify the student exists and belongs to the authenticated user
        student_response = supabase.table("students").select("*").eq("id", request.student_id).execute()
        if not student_response.data or len(student_response.data) == 0 or student_response.data[0].get("email") != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Student not found or does not belong to the authenticated user")
        
        # Check for existing PENDING result for this level
        pending_result = supabase.table("results").select("*").eq("student_id", request.student_id).eq("subject", request.subject).eq("level", request.level).eq("result", "pending").execute()
        
        if pending_result.data and len(pending_result.data) > 0:
            # Found a pending result, return it for resumption
            logging.info(f"🔄 Resuming existing test for {request.subject} - student {request.student_id}, level {request.level}")
            return pending_result.data[0]

        # Check max attempts
        settings = settings_manager.get_settings()
        dynamic_max = settings.get("max_attempts", 3)
        max_attempts = 1 if request.level == 'easy' else dynamic_max
        
        # Count existing attempts for this level
        existing_attempts = supabase.table("results").select("id", count="exact").eq("student_id", request.student_id).eq("subject", request.subject).eq("level", request.level).execute()
        current_attempts = existing_attempts.count if existing_attempts.count is not None else 0
        
        if current_attempts >= max_attempts:
             raise HTTPException(status_code=400, detail=f"Maximum attempts ({max_attempts}) reached for this level")

        # Calculate start and end times
        from datetime import timedelta
        start_time = datetime.now(timezone.utc)
        duration_seconds = LEVEL_DURATIONS.get(request.level, 10 * 60)
        end_time = start_time + timedelta(seconds=duration_seconds)

        # Create result entry in Supabase
        response = supabase.table("results").insert({
            "student_id": request.student_id,
            "subject": request.subject,
            "level": request.level,
            "result": "pending",
            "score": None,
            "attempts_easy": request.attempts_easy,
            "attempts_medium": request.attempts_medium,
            "attempts_hard": request.attempts_hard,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create result")
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/save-questions")
async def save_questions(request: SaveQuestionsRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Save test questions - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Prepare questions for insert
        questions_to_insert = []
        for q in request.questions:
            questions_to_insert.append({
                "result_id": request.result_id,
                "question_text": q.get("question", ""),
                "correct_answer": q.get("answer", ""),
                "bank_id": q.get("bank_id") # Store link to bank if available
            })
        
        # Insert questions into Supabase
        response = supabase.table("questions").insert(questions_to_insert).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save questions")
        
        return {"success": True, "message": f"Saved {len(response.data)} questions"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/save-answer")
async def save_answer(request: SaveAnswerRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Save a single student answer - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Upsert answer
        # We need to check if an answer exists for this question and result (implicit via question_id)
        # Actually student_answers links to question_id.
        
        # Check if answer exists
        existing = supabase.table("student_answers").select("id").eq("question_id", request.question_id).execute()
        
        if existing.data:
            # Update
            response = supabase.table("student_answers").update({
                "student_answer": request.student_answer
            }).eq("question_id", request.question_id).execute()
        else:
            # Insert
            response = supabase.table("student_answers").insert({
                "question_id": request.question_id,
                "student_answer": request.student_answer
            }).execute()
            
        return {"success": True}
    except Exception as e:
        logging.error(f"Error saving answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/submit-test")
async def submit_test(request: SubmitTestRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Submit test answers only - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # 1. Fetch questions for this result to map answers
        questions_response = supabase.table("questions").select("*").eq("result_id", request.result_id).order("created_at").execute()
        if not questions_response.data:
            raise HTTPException(status_code=404, detail="Questions not found for this result")
            
        questions = questions_response.data
        
        # 2. Save/Update answers (Robust ID-based mapping)
        # We now expect a dictionary {question_id: answer_text}
        
        for q in questions:
            q_id = q['id']
            
            # CRITICAL FIX: Only update if the frontend sent an answer for this question
            # Otherwise we risk overwriting existing saved answers (from save-answer endpoint) with empty strings
            if q_id in request.answers:
                student_ans = request.answers[q_id]
                
                # Upsert answer
                existing = supabase.table("student_answers").select("id").eq("question_id", q_id).execute()
                if existing.data:
                    supabase.table("student_answers").update({"student_answer": student_ans}).eq("question_id", q_id).execute()
                else:
                    supabase.table("student_answers").insert({"question_id": q_id, "student_answer": student_ans}).execute()
        
        # Basic intermediate update (optional, just to show something happened)
        supabase.table("results").update({
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", request.result_id).execute()

        return {
            "id": request.result_id,
            "message": "Answers submitted successfully. Awaiting evaluation."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logging.error(f"Error in submit-test: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/send-notification")
async def send_notification(request: NotificationEmailRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Send email notification - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        from email.mime.text import MIMEText
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import base64
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("Gmail credentials not configured")
            return {"success": False, "message": "Gmail not configured"}
        
        # Check all test results for this student to determine admission status
        results_response = supabase.table("results").select("*").eq("student_id", request.student_id).order("created_at", desc=True).execute()
        
        if results_response.data and len(results_response.data) > 0:
            all_results = results_response.data
            latest_result = all_results[0]
            
            # --- 1. Check Multi-Subject Status ---
            subjects = ['math', 'physics', 'chemistry']
            all_hard_passed = True
            all_medium_or_hard_passed = True
            
            for sub in subjects:
                sub_results = [r for r in all_results if (r.get('subject') or 'physics').lower() == sub]
                sub_hard = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results)
                sub_medium = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_results)
                
                if not sub_hard:
                    all_hard_passed = False
                if not (sub_medium or sub_hard):
                    all_medium_or_hard_passed = False

            # --- 2. Check "Max Attempts Failed" on Latest Result ---
            # Define max attempts per level (hardcoded to match frontend)
            max_attempts_map = {"easy": 1, "medium": 2, "hard": 2}
            
            latest_level = latest_result.get('level', 'easy')
            latest_status = latest_result.get('result', 'fail')
            
            # Count attempts for this specific subject & level
            latest_sub = (latest_result.get('subject') or 'physics').lower()
            attempts_count = 0
            if latest_level == 'easy':
                attempts_count = latest_result.get('attempts_easy', 0)
            elif latest_level == 'medium':
                attempts_count = latest_result.get('attempts_medium', 0)
            elif latest_level == 'hard':
                attempts_count = latest_result.get('attempts_hard', 0)
                
            # Fail email for Easy and Medium level max attempts
            has_failed_max_attempts = (latest_status != 'pass') and \
                                      (latest_level in ['easy', 'medium']) and \
                                      (attempts_count >= max_attempts_map.get(latest_level, 1))

            # --- 3. Check for Global Completion (All Subjects Done) ---
            subjects = ['math', 'physics', 'chemistry']
            settings = settings_manager.get_settings()
            dynamic_max = settings.get("max_attempts", 3)
            
            is_fully_completed = True
            all_hard_passed = True
            all_medium_or_hard_passed = True
            
            # Helper: Track status for each subject
            subject_status_map = {}
            
            # Use all_results fetched at start (line 880)
            # Ensure it contains all history. Line 880 had 'order created_at desc', no limit.
            
            for sub in subjects:
                # Get results for this subject
                sub_results = [r for r in all_results if (r.get('subject') or 'physics').lower() == sub]
                
                status = 'not_started'
                
                if sub_results:
                    # Check pass status
                    has_hard_pass = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results)
                    has_medium_pass = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_results)
                    
                    if has_hard_pass:
                         status = 'completed_success_hard'
                    else:
                        # Check dead end (Max attempts failed at latest attempted level)
                        # Get latest attempt for this subject (assuming sorted by created_at desc)
                        latest_sub_res = sub_results[0]
                        l_level = latest_sub_res.get('level')
                        l_res = latest_sub_res.get('result')
                        
                        # Calculate attempts for this specific level
                        l_attempts = sum(1 for r in sub_results if r.get('level') == l_level)
                        
                        l_max = 1 if l_level == 'easy' else dynamic_max
                        
                        if l_res != 'pass' and l_attempts >= l_max:
                            status = 'completed_failure'
                        else:
                            # If Medium passed but Hard not taken?
                            if has_medium_pass and l_level == 'medium':
                                # Passed Medium, next is Hard. If no Hard result, it's in progress.
                                status = 'in_progress'
                            else:
                                status = 'in_progress'

                    # Concession trackers
                    if not has_hard_pass:
                        all_hard_passed = False
                    if not (has_medium_pass or has_hard_pass):
                        all_medium_or_hard_passed = False
                else:
                    status = 'not_started'
                
                subject_status_map[sub] = status
                
                if status == 'in_progress' or status == 'not_started':
                    is_fully_completed = False

            # --- 4. Determine Email Type ---
            should_send = False
            
            if is_fully_completed:
                # FINAL VERDICT EMAIL
                # Check User Requirement: "pass mail should be only sent when... last subject medium or hard level is passed"
                
                # Identify Last Subject (The one that triggered this flow)
                current_subject = (latest_result.get('subject') or 'physics').lower()
                
                # Check validity of current subject completion
            # ===== NEW STRICT EMAIL & STATUS LOGIC =====
            
            # Check for Global Failure Condition (Max attempts reached for Easy or Medium)
            # Check for Global Failure Condition (Max attempts reached for Easy or Medium)
            is_rejection = False
            
            # Use variables derived from latest_result
            r_status = latest_result.get('result', 'fail')
            r_level = latest_result.get('level', 'easy')
            r_subject = (latest_result.get('subject') or 'physics').lower()
            
            if r_status == 'fail' and r_level in ['easy', 'medium']:
                # Check if this was the last allowed attempt
                # We already calculated attempts
                settings = settings_manager.get_settings()
                max_attempts = 1 if r_level == 'easy' else settings.get("max_attempts", 3)
                
                # Fetch current attempts count
                attempts_response = supabase.table("results").select("id", count="exact").eq("student_id", request.student_id).eq("level", r_level).eq("subject", r_subject).execute()
                current_attempts = attempts_response.count if attempts_response.count is not None else 0
                
                if current_attempts >= max_attempts:
                    is_rejection = True
                    global_status = "failed" # Strict Global Failure

            # Check for Global Completion Condition (All subjects done)
            if not is_rejection:
                # Fetched all results previously
                # Logic: Pass Medium in ALL subjects AND (Pass Hard OR attempts exhausted)
                
                subjects = ['math', 'physics', 'chemistry']
                all_subs_cleared = True
                
                for sub in subjects:
                    sub_results = [r for r in all_results if (r.get('subject') or 'physics').lower() == sub]
                    
                    # Medium Must be Passed
                    medium_pass = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_results)
                    
                    # Hard Must be Attempted or Passed (But actually, strict passing is usually required for "Success")
                    # User criteria: "atleast medium level is passed in all the subjects"
                    # And "completes all the levels".
                    
                    # Let's verify strict user requirement: "A test is said to be passed only when it completes all the levels... and atleast medium level is passed"
                    
                    # Check Hard status
                    hard_pass = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results)
                    hard_attempts_resp = supabase.table("results").select("id", count="exact").eq("student_id", request.student_id).eq("level", "hard").eq("subject", sub).execute()
                    hard_attempts = hard_attempts_resp.count if hard_attempts_resp.count is not None else 0
                    hard_max = settings.get("max_attempts", 3)
                    
                    hard_done = hard_pass or (hard_attempts >= hard_max)
                    
                    if not (medium_pass and hard_done):
                        all_subs_cleared = False
                        break
                
                if all_subs_cleared:
                    global_status = "completed"
                else:
                    global_status = "intermediate"

            # Determine Email to Send
            email_subject = ""
            admission_message = ""
            should_send = False

            if global_status == "failed":
                # REJECTION EMAIL
                concession = 0
                email_subject = "AdmitAI Admission Test - Application Status"
                admission_message = f"""
Thank you for your interest in AdmitAI.

We have reviewed your performance in the admission test. Unfortunately, you did not meet the required passing criteria for the {r_level.capitalize()} Level in {r_subject.capitalize()}.

As per our strict admission policy, we are unable to proceed with your application at this time.

We appreciate the time you took to complete the assessment and wish you the best in your future endeavors.
"""
                should_send = True

            elif global_status == "completed":
                # QUALIFYING EMAIL
                # Calculate Concession
                # 50% if Hard passed in all subjects
                # 30% if Medium passed in all (which is guaranteed by completion logic)
                
                concession = 30 # Base
                
                all_hard_passed = True
                for sub in ['math', 'physics', 'chemistry']:
                     sub_results = [r for r in all_results if (r.get('subject') or 'physics').lower() == sub]
                     if not any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results):
                         all_hard_passed = False
                         break
                
                if all_hard_passed:
                    concession = 50
                
                email_subject = f"🎉 Congratulations! Admission Granted with {concession}% Fee Concession"
                admission_message = f"""
We are pleased to inform you that you have successfully passed the AdmitAI Admission Test!

Based on your performance, you have been granted a {concession}% Fee Concession.

Next Steps:
1. Login to your dashboard to view your detailed report.
2. Complete the enrollment process.
""" 
                should_send = True
            
            else:
                 # INTERMEDIATE - NO EMAIL
                 logging.info("Skipping email: Intermediate progress.")
                 should_send = False

            if should_send:
                # Send the email
                creds = Credentials(
                    None,
                    refresh_token=refresh_token,
                    token_uri='https://oauth2.googleapis.com/token',
                    client_id=client_id,
                    client_secret=client_secret,
                    scopes=['https://www.googleapis.com/auth/gmail.send']
                )
                
                creds.refresh(Request())
                service = build('gmail', 'v1', credentials=creds)
                
                message = MIMEText(f"""
Dear {request.student_name},

{admission_message}

Best regards,
AdmitAI Team
                """)
                message['to'] = request.to_email
                message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
                message['subject'] = email_subject
                
                raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                service.users().messages().send(userId="me", body={'raw': raw}).execute()
                
                logging.info(f"✅ Notification email sent to {request.to_email}")
                return {"success": True, "email_sent": True, "message": "Notification email sent successfully", "global_status": global_status}
            
            return {"success": True, "email_sent": False, "message": "Email skipped", "global_status": global_status}
                
        else:
             logging.warning("No results found for student")
             return {"success": False, "message": "No results found"}
             
    except Exception as e:
        logging.error(f"❌ Email error: {str(e)}")
        return {"success": False, "message": f"Email failed: {str(e)}"}


@api_router.get("/test-session/{result_id}")
async def get_test_session(result_id: str, current_user: Dict = Depends(get_current_user_with_activity)):
    """Get questions and saved answers for a session - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Fetch questions
        questions_response = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data:
            raise HTTPException(status_code=404, detail="Questions not found")
            
        questions = questions_response.data
        
        # Fetch answers
        question_ids = [q['id'] for q in questions]
        answers_response = supabase.table("student_answers").select("question_id, student_answer").in_("question_id", question_ids).execute()
        
        answers_map = {a['question_id']: a['student_answer'] for a in answers_response.data} if answers_response.data else {}
        
        # Combine
        session_data = []
        for q in questions:
            session_data.append({
                "id": q['id'],
                "question": q['question_text'],
                "answer": q['correct_answer'], # Frontend might need this for some logic, or we can hide it? 
                                             # Current frontend expects 'answer' in Question interface but doesn't show it.
                                             # Wait, frontend 'Question' interface has 'answer'. 
                                             # Ideally we shouldn't send correct answer to frontend during test.
                                             # But the current implementation of 'generate-questions' sends it.
                                             # I will keep it consistent.
                "student_answer": answers_map.get(q['id'], "")
            })
            
        return {"questions": session_data}
        
    except Exception as e:
        logging.error(f"Error fetching test session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/generate-questions")
async def generate_questions(
    request: GenerateQuestionsRequest, 
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user_with_activity)
):
    """Generate questions - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        subject = request.subject.lower()
        level = request.level
        num_questions = request.num_questions
        
        # Resolve Student ID
        email = current_user.get('email')
        student_resp = supabase.table("students").select("id").eq("email", email).execute()
        
        if not student_resp.data:
            logging.warning(f"⚠️ Student ID not found for email {email}. Using UID as fallback.")
            student_id = current_user.get('uid')
        else:
            student_id = student_resp.data[0]['id']

        # Use Exam Assembly Service
        from exam_assembly_service import ExamAssemblyService
        questions = await ExamAssemblyService.get_or_create_exam(student_id, subject, level, num_questions)
        
        if not questions:
             logging.error("❌ ExamAssemblyService returned empty list.")
             raise HTTPException(status_code=500, detail="Failed to generate questions")

        logging.info(f"✅ Served {len(questions)} questions via ExamAssemblyService")
        
        # Trigger replenishment check in background
        background_tasks.add_task(replenishment_task, subject, level)
        
        return {"questions": questions}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in generate_questions: {e}")
        import traceback
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# Global Replenishment Tracker
LAST_REPLENISHMENT = {}

async def replenishment_task(subject: str, level: str):
    """Background task to check and replenish question bank"""
    try:
        # 1. Artificial Delay (Decoupling)
        # Ensure main request is fully flushed
        import asyncio
        import time
        await asyncio.sleep(10)
        
        # 2. Throttling (Frequency Control)
        key = f"{subject}_{level}"
        last_time = LAST_REPLENISHMENT.get(key, 0)
        current_time = time.time()
        
        # Cooldown: 5 minutes (300 seconds)
        if current_time - last_time < 300:
            logging.info(f"⏳ Throttling replenishment for {key}. Last check was {int(current_time - last_time)}s ago.")
            return

        from question_bank_service import QuestionBankService
        logging.info(f"🔄 Background Replenishment Check: {subject}/{level}")
        
        # Update timestamp immediately to prevent race conditions
        LAST_REPLENISHMENT[key] = current_time
        
        # We use generate_guarded for "smart" replenishment
        # It internally checks saturation and only generates if needed.
        # Target per topic can be conservative (e.g. 5) to keep bank healthy but not bloated
        result = await QuestionBankService.generate_guarded(subject, level, target_per_topic=5)
        
        if result.get("generated_count", 0) > 0:
            logging.info(f"✨ Replenished {result['generated_count']} questions for {subject}/{level}")
        else:
            logging.info(f"💤 Bank sufficient for {subject}/{level}. No generation needed.")
            
    except Exception as e:
        logging.error(f"❌ Replenishment task error: {e}")


# ===== AI-POWERED ANSWER EVALUATION WITH 6 CRITERIA =====
@api_router.post("/evaluate-answers")
async def evaluate_answers(request: EvaluateAnswersRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Evaluate student answers - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        result_id = request.result_id
        
        if not result_id:
            raise HTTPException(status_code=400, detail="result_id is required")
        
        # Get questions with their answers
        questions_response = supabase.table("questions").select(
            "id, question_text, correct_answer, student_answers(student_answer)"
        ).eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data or len(questions_response.data) == 0:
            raise HTTPException(status_code=404, detail="No questions found for this result")
        
        questions = questions_response.data
        
        logging.info(f"📝 Evaluating {len(questions)} answers with 6 criteria")
        
        # Evaluate each answer
        all_evaluations = []
        
        for idx, q in enumerate(questions, 1):
            try:
                student_answer = ""
                if q.get('student_answers') and len(q['student_answers']) > 0:
                    student_answer = q['student_answers'][0].get('student_answer', 'No answer provided')
                
                # Check if answer is empty or too short - automatic fail
                if not student_answer or student_answer.strip() == "" or student_answer.strip().lower() == "no answer provided":
                    logging.warning(f"Q{idx}: Empty answer - automatic fail")
                    all_evaluations.append({
                        "question_number": idx,
                        "question": q.get('question_text', ''),
                        "student_answer": student_answer,
                        "scores": {
                            "Relevance": 1.0,
                            "Clarity": 1.0,
                            "SubjectUnderstanding": 1.0,
                            "Accuracy": 1.0,
                            "Completeness": 1.0,
                            "CriticalThinking": 1.0
                        },
                        "average": 1.0
                    })
                    continue
                
                # Get relevant context for this question
                settings = settings_manager.get_settings()
                rag_k = settings.get("rag_k", 3)
                # Note: evaluation context retrieval is tricky without knowing subject. 
                # Ideally, question metadata should store subject. 
                # For now, we might try to guess or use a generic call.
                # However, since 'evaluate-answers' only gets result_id, we can look up result -> subject.
                
                subject = "physics" # Default
                student_id_val = None
                # Fetch result to get subject and student_id
                res_meta = supabase.table("results").select("subject, student_id, level").eq("id", result_id).execute()
                if res_meta.data:
                    subject = res_meta.data[0].get("subject", "physics")
                    student_id_val = res_meta.data[0].get("student_id")
                    level = res_meta.data[0].get("level", "medium")
                
                context_docs = get_context(q.get('question_text', ''), subject=subject, k=rag_k)
                context = "\n\n".join(context_docs) if context_docs else ""
                
                # Evaluate using LangChain prompt with strict evaluator LLM
                subject_lower = subject.lower() if subject else "physics"
                
                if subject_lower == "math":
                    prompt_template = evaluate_answer_prompt_math
                elif subject_lower == "chemistry":
                    prompt_template = evaluate_answer_prompt_chemistry
                else:
                    prompt_template = evaluate_answer_prompt_physics
                
                prompt = prompt_template.format_messages(
                    context=context[:20000],
                    question=q.get('question_text', ''),
                    correct_answer=q.get('correct_answer', ''),
                    student_answer=student_answer
                )
                
                # Dynamic Evaluator
                # Dynamic Evaluator via Central Service
                from ai_service import get_llm
                evaluator_llm = get_llm(override_temperature=0.1)

                response = safe_invoke(evaluator_llm, prompt, purpose=f"evaluate-answers Q{idx}")

                response_text = response.content.strip()
                
                # Clean up response - Robust JSON extraction
                import re
                try:
                    # Try to find JSON block in markdown code fences first
                    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1)
                    else:
                        # Fallback: try to find the first '{' and the last '}'
                        start_idx = response_text.find('{')
                        end_idx = response_text.rfind('}')
                        if start_idx != -1 and end_idx != -1:
                            response_text = response_text[start_idx:end_idx+1]
                except Exception as parse_err:
                    logging.warning(f"Regex JSON extraction failed: {parse_err}. Using original text.")
                
                # Parse evaluation
                try:
                    scores_json = json.loads(response_text)
                    evaluation = EvaluationCriteria(**scores_json)
                    
                    # Double-check: if student answer looks like gibberish, override scores
                    if len(student_answer.strip()) < 10 and student_answer.count('O') > len(student_answer) * 0.5:
                        logging.warning(f"Q{idx}: Gibberish detected - overriding to fail scores")
                        evaluation = EvaluationCriteria(
                            Relevance=1.0, Clarity=1.0, SubjectUnderstanding=1.0,
                            Accuracy=1.0, Completeness=1.0, CriticalThinking=1.0
                        )
                    
                    # --- PERSIST REVIEW FOR FRONTEND Consistency ---
                    # Determine correctness based on rubric
                    # We use a threshold of 6.0 for Accuracy or 5.0 Average to be generous but fair
                    is_ans_correct = evaluation.Accuracy >= 6.0 and evaluation.average >= 5.0
                    
                    explanation_text = (
                        f"**Evaluation Score:** {evaluation.average:.1f}/10\n"
                        f"**Analysis:**\n"
                        f"- Accuracy: {evaluation.Accuracy}/10\n"
                        f"- Clarity: {evaluation.Clarity}/10\n"
                        f"- Completeness: {evaluation.Completeness}/10\n"
                        f"- Reasoning: {evaluation.CriticalThinking}/10"
                    )
                    
                    if student_id_val:
                        try:
                            supabase.table("question_reviews").upsert({
                                "question_id": q['id'],
                                "result_id": result_id,
                                "student_id": student_id_val,
                                "is_correct": is_ans_correct,
                                "explanation": explanation_text,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }, on_conflict="question_id").execute()
                            logging.info(f"✅ Persisted review for Q{idx} (Correct: {is_ans_correct})")
                        except Exception as db_err:
                            logging.error(f"Failed to persist review for Q{idx}: {db_err}")

                    all_evaluations.append({
                        "question_number": idx,
                        "question": q.get('question_text', ''),
                        "student_answer": student_answer,
                        "scores": evaluation.model_dump(),
                        "average": evaluation.average
                    })
                except (json.JSONDecodeError, Exception) as e:
                    logging.error(f"Error parsing evaluation for Q{idx}: {e}")
                    logging.error(f"Response was: {response_text}")
                    # Fallback: Assume wrong answer if we can't parse (strict grading)
                    all_evaluations.append({
                        "question_number": idx,
                        "question": q.get('question_text', ''),
                        "student_answer": student_answer,
                        "scores": {
                            "Relevance": 1.0, "Clarity": 1.0, "SubjectUnderstanding": 1.0,
                            "Accuracy": 1.0, "Completeness": 1.0, "CriticalThinking": 1.0
                        },
                        "average": 1.0
                    })
            except Exception as e:
                logging.error(f"Error evaluating question {idx}: {e}")
                import traceback
                logging.error(traceback.format_exc())
                # Strict fallback: fail on error
                all_evaluations.append({
                    "question_number": idx,
                    "question": "Error",
                    "student_answer": "",
                    "scores": {
                        "Relevance": 1.0, "Clarity": 1.0, "SubjectUnderstanding": 1.0,
                        "Accuracy": 1.0, "Completeness": 1.0, "CriticalThinking": 1.0
                    },
                    "average": 1.0
                })
        
        # Ensure we have evaluations
        if not all_evaluations or len(all_evaluations) == 0:
            raise HTTPException(status_code=500, detail="Failed to evaluate any answers")
        
        # Calculate overall score (average out of 10)
        total_avg = sum(e['average'] for e in all_evaluations) / len(all_evaluations)
        
        # Score is out of 10
        score_out_of_10 = total_avg
        
        # Determine pass/fail based on settings
        settings = settings_manager.get_settings()
        passing_score_percent = settings.get("passing_score", 70)
        passing_threshold = passing_score_percent / 10.0 # Convert % to score out of 10
        
        result_status = 'pass' if score_out_of_10 >= passing_threshold else 'fail'
        
        # Calculate average for each of the 6 criteria across all questions
        criteria_averages = {
            "Relevance": sum(e['scores']['Relevance'] for e in all_evaluations) / len(all_evaluations),
            "Clarity": sum(e['scores']['Clarity'] for e in all_evaluations) / len(all_evaluations),
            "SubjectUnderstanding": sum(e['scores']['SubjectUnderstanding'] for e in all_evaluations) / len(all_evaluations),
            "Accuracy": sum(e['scores']['Accuracy'] for e in all_evaluations) / len(all_evaluations),
            "Completeness": sum(e['scores']['Completeness'] for e in all_evaluations) / len(all_evaluations),
            "CriticalThinking": sum(e['scores']['CriticalThinking'] for e in all_evaluations) / len(all_evaluations)
        }
        
        # Update result in Supabase with score out of 10
        # Calculate concession based on levels passed
        concession = 0
        try:
            # First, get the current result to find student_id
            current_result = supabase.table("results").select("student_id").eq("id", result_id).single().execute()
            student_id = current_result.data.get("student_id") if current_result.data else None
            
            if not student_id:
                raise ValueError("Student ID not found in result")
            
            # Get all results for this student to determine concession
            all_results = supabase.table("results").select("*").eq("student_id", student_id).execute()
            
            if all_results.data:
                # Check which levels are passed
                easy_passed = any(r.get('level') == 'easy' and r.get('result') == 'pass' for r in all_results.data)
                medium_passed = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in all_results.data)
                hard_passed = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in all_results.data)
                
                # Calculate concession
                # Rule: 
                # 50% if Hard level passed in ALL subjects
                # 30% if Medium (or Hard) passed in ALL subjects
                
                subjects = ['math', 'physics', 'chemistry']
                
                all_hard_passed = True
                all_medium_or_hard_passed = True
                
                for sub in subjects:
                    # Get results for this subject
                    sub_results = [r for r in all_results.data if (r.get('subject') or 'physics').lower() == sub]
                    
                    sub_hard = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results)
                    sub_medium = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_results)
                    
                    if not sub_hard:
                        all_hard_passed = False
                    
                    if not (sub_medium or sub_hard):
                        all_medium_or_hard_passed = False
                
                if all_hard_passed:
                    concession = 50
                elif all_medium_or_hard_passed:
                    concession = 30
                else:
                    concession = 0
            
            supabase.table("results").update({
                "score": score_out_of_10,
                "result": result_status,
                "concession": concession,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", result_id).execute()
            
            logging.info(f"✅ Concession calculated: {concession}%")
        except Exception as e:
            logging.error(f"Error updating result: {e}")
            # Continue even if update fails
        
        logging.info(f"✅ Evaluation complete: {score_out_of_10:.1f}/10 - {result_status.upper()}")
        
        # --- CHATBOT NOTIFICATION TRIGGER ---
        try:
            from chatbot_graph import get_graph
            from langchain_core.messages import AIMessage
            
            # --- ENHANCED: Extract specific insights for proactive message ---
            wrong_questions = [e for e in all_evaluations if e['average'] < 6.0]
            wrong_count = len(wrong_questions)
            total_count = len(all_evaluations)
            
            # Identify weak topics from wrong questions
            from chatbot_tools import _extract_topic_from_question
            weak_topics_set = set()
            for wq in wrong_questions:
                topic = _extract_topic_from_question(wq.get('question', ''), subject)
                if topic != "General Concepts":
                    weak_topics_set.add(topic)
            weak_topics_list = list(weak_topics_set)[:3]  # Top 3
            
            # Build a specific, actionable message
            if result_status == 'pass':
                msg_content = f"""🌟 **Congratulations!** You passed the {level.capitalize()} level of {subject.capitalize()}!

**📊 Your Score:** {score_out_of_10:.1f}/10

**📈 Performance Breakdown:**
- Correct: {total_count - wrong_count}/{total_count} questions
- Areas of strength: Great job overall!

**💡 What's Next?**
Ask me to "analyze my test" for detailed insights, or prepare for the next level!
"""
            else:
                # Build specific weak areas message
                topics_str = ', '.join(weak_topics_list) if weak_topics_list else 'various topics'
                
                msg_content = f"""📝 **Test Completed:** {subject.capitalize()} - {level.capitalize()}

**📊 Your Score:** {score_out_of_10:.1f}/10 ({wrong_count}/{total_count} questions need review)

**🔍 Areas Needing Attention:**
{chr(10).join(f'• {topic}' for topic in weak_topics_list) if weak_topics_list else '• Review the fundamentals'}

**💬 I'm here to help! Try asking:**
- "What did I get wrong?"
- "Explain question {wrong_questions[0]['question_number'] if wrong_questions else 1}"
- "Give me a study plan for {weak_topics_list[0] if weak_topics_list else subject}"
- "Show me videos on {topics_str}"

Let's turn this into a learning opportunity! 💪
"""
            
            # We use 'student_id' as the thread_id for simplicity in this 1:1 context
            thread_id = f"chat_{student_id}" 
            config = {"configurable": {"thread_id": thread_id}}
            
            # Inject directly using async graph
            graph = await get_graph()
            await graph.aupdate_state(config, {"messages": [AIMessage(content=msg_content)]})
            
            # IMPORTANT: Persist to Supabase as UNREAD message for the "Red Dot" notification
            try:
                import chat_history_service
                chat_history_service.save_message(
                    thread_id=thread_id,
                    student_id=student_id,
                    role="assistant",
                    content=msg_content,
                    is_read=False  # Mark as unread so it triggers notification
                )
                logging.info(f"🤖 Chatbot notification persisted (UNREAD) for {student_id}")
            except Exception as hist_err:
                logging.error(f"Failed to persist chatbot notification: {hist_err}")

            logging.info(f"🤖 Chatbot notification sent for {student_id}")
            
        except Exception as chat_err:
            logging.error(f"Failed to trigger chatbot notification: {chat_err}")
            import traceback
            logging.error(traceback.format_exc())
            # Non-blocking error
        
        # Format criteria as list for Frontend
        criteria_list = [{"name": k, "score": v} for k, v in criteria_averages.items()]

        # ===== 6. GLOBAL STATUS & EMAIL LOGIC (Migrated from submit-test) =====
        
        # Use current_result (fetched above) to get student metadata
        # We already have student_id
        
        # Fetch subject and level from current result
        res_meta = supabase.table("results").select("subject, level").eq("id", result_id).single().execute()
        subject = res_meta.data.get("subject", "physics")
        level = res_meta.data.get("level", "medium")
        
        global_status = "intermediate"
        concession_percent = 0
        
        # --- Check Global Failure (Easy/Medium Max Attempts) ---
        is_rejection = False
        if result_status == 'fail' and level in ['easy', 'medium']:
            settings_obj = settings_manager.get_settings()
            max_attempts = 1 if level == 'easy' else settings_obj.get("max_attempts", 3)
            
            attempts_response = supabase.table("results").select("id", count="exact").eq("student_id", student_id).eq("level", level).eq("subject", subject).execute()
            current_attempts = attempts_response.count if attempts_response.count is not None else 0
            
            if current_attempts >= max_attempts:
                is_rejection = True
                global_status = "failed"
        
        # --- Check Global Completion ---
        if not is_rejection:
            # Check all subjects
            all_subjects = ['math', 'physics', 'chemistry']
            all_subs_cleared = True
            
            # We need FRESH results because the current result was just updated above
            all_results_fresh = supabase.table("results").select("*").eq("student_id", student_id).execute()
            
            for sub in all_subjects:
                sub_results = [r for r in all_results_fresh.data if (r.get('subject') or 'physics').lower() == sub]
                medium_pass = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_results)
                
                # Hard Logic: Passed OR Attempts exhausted
                hard_pass = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_results)
                hard_attempts = sum(1 for r in sub_results if r.get('level') == 'hard')
                hard_done = hard_pass or (hard_attempts >= settings_manager.get_settings().get("max_attempts", 3))
                
                if not (medium_pass and hard_done):
                    all_subs_cleared = False
                    break
            
            if all_subs_cleared:
                global_status = "completed"
                
                # RECALCULATE CONCESSION with FRESH data
                # Because the initial calculation above used stale data (before this result was saved)
                
                fresh_hard_passed = True
                fresh_med_passed = True
                
                for sub in all_subjects:
                    sub_res = [r for r in all_results_fresh.data if (r.get('subject') or 'physics').lower() == sub]
                    s_hard = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in sub_res)
                    s_med = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in sub_res)
                    
                    if not s_hard: fresh_hard_passed = False
                    if not (s_med or s_hard): fresh_med_passed = False
                
                if fresh_hard_passed:
                    concession_percent = 50
                elif fresh_med_passed:
                    concession_percent = 30
                else:
                    concession_percent = 0
                
                # Also update the stored concession for this result to match the final verdict
                try:
                    supabase.table("results").update({"concession": concession_percent}).eq("id", result_id).execute()
                except:
                    pass
        
        # --- Email Trigger ---
        email_sent = False
        admission_message = ""
        email_subject = ""
        
        # Get Student Email
        if global_status in ["failed", "completed"]:
                student_data_resp = supabase.table("students").select("email, first_name").eq("id", student_id).single().execute()
                if student_data_resp.data:
                    student_email = student_data_resp.data.get("email")
                    student_name = student_data_resp.data.get("first_name")
                    
                    if global_status == "failed":
                        email_subject = "AdmitAI Admission Test - Application Status"
                        admission_message = f"""
Thank you for your interest in AdmitAI.

We have reviewed your performance in the admission test. Unfortunately, you did not meet the required passing criteria for the {level.capitalize()} Level in {subject.capitalize()}.

As per our strict admission policy, we are unable to proceed with your application at this time.
"""
                    elif global_status == "completed":
                        email_subject = f"🎉 Congratulations! Admission Granted with {concession_percent}% Fee Concession"
                        admission_message = f"""
We are pleased to inform you that you have successfully passed the AdmitAI Admission Test!

Based on your performance, you have been granted a {concession_percent}% Fee Concession.

Next Steps:
1. Login to your dashboard to view your detailed report.
2. Complete the enrollment process.
"""

                    # Send Email
                    if admission_message:
                        try:
                            from email.mime.text import MIMEText
                            
                            client_id = os.environ.get('GMAIL_CLIENT_ID')
                            client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
                            refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
                            
                            if client_id and client_secret and refresh_token:
                                from google.oauth2.credentials import Credentials
                                from google.auth.transport.requests import Request
                                from googleapiclient.discovery import build
                                import base64
                                
                                creds = Credentials(None, refresh_token=refresh_token, token_uri='https://oauth2.googleapis.com/token', client_id=client_id, client_secret=client_secret)
                                creds.refresh(Request())
                                service = build('gmail', 'v1', credentials=creds)
                                
                                message = MIMEText(f"Dear {student_name},\n\n{admission_message}\n\nBest regards,\nAdmitAI Team")
                                message['to'] = student_email
                                message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
                                message['subject'] = email_subject
                                raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                                service.users().messages().send(userId="me", body={'raw': raw}).execute()
                                email_sent = True
                                logging.info("✅ Email sent from evaluate_answers")
                        except Exception as e:
                            logging.error(f"Failed to send email: {e}")

    
        logging.info(f"✅ Evaluation complete: {score_out_of_10:.1f}/10 - {result_status.upper()}")
        
        # Update student final scores for leaderboard (async, non-blocking)
        if student_id_val:
            try:
                await update_student_final_scores(student_id_val)
            except Exception as e:
                logging.warning(f"Failed to update final scores (non-critical): {e}")
        
        return {
            "result_id": result_id,
            "score": score_out_of_10,  # Out of 10
            "result": result_status,
            "concession": concession, 
            "criteria": criteria_list,  # Formatted List
            "global_status": global_status,
            "email_sent": email_sent,
            "evaluations": all_evaluations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error evaluating answers: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


# ===== REVIEW ENDPOINT =====
@api_router.get("/review/{level}/{student_id}")
async def get_review_data(level: str, student_id: str, subject: str = Query("physics"), current_user: Dict = Depends(get_current_user)):
    """Get review data for a specific level - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is requesting their own data
        student_response = supabase.table("students").select("email").eq("id", student_id).execute()
        if not student_response.data or student_response.data[0]['email'] != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        # Find the result for this level and student AND SUBJECT
        results_response = supabase.table("results").select("*").eq("student_id", student_id).eq("level", level).eq("subject", subject).order("created_at", desc=True).limit(1).execute()
        
        attempted = False
        result_id = None
        can_retake = False
        current_attempts = 0
        settings = settings_manager.get_settings()
        dynamic_max = settings.get("max_attempts", 3)
        max_attempts = 1 if level == 'easy' else dynamic_max
        last_result = None
        
        if results_response.data and len(results_response.data) > 0:
            attempted = True
            last_result = results_response.data[0]
            result_id = last_result['id']
            
            # Get current attempts for this level
            # Get current attempts for this level by counting actual rows for this subject
            # This avoids issues with legacy data where cumulative columns might be corrupted across subjects
            attempts_response = supabase.table("results").select("id", count="exact").eq("student_id", student_id).eq("level", level).eq("subject", subject).execute()
            current_attempts = attempts_response.count if attempts_response.count is not None else 0
            
            # Check if can retake: failed (not passed) AND has attempts remaining
            level_passed = last_result.get("result") == "pass"
            can_retake = not level_passed and current_attempts < max_attempts
        
        # Get questions for this level (either from the test or generate new ones for review)
        if result_id:
            # Get questions that were used in the test
            questions_response = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", result_id).order("created_at").execute()
            
            if not questions_response.data:
                raise HTTPException(status_code=404, detail="No questions found for this test")
            
            questions_data = []
            for q in questions_response.data:
                # Get student's answer if exists
                answer_response = supabase.table("student_answers").select("student_answer").eq("question_id", q['id']).execute()
                
                student_answer = None
                if answer_response.data and len(answer_response.data) > 0:
                    student_answer = answer_response.data[0]['student_answer']
                
                # Check if review is cached
                cached_review = supabase.table("question_reviews").select("is_correct, explanation").eq("question_id", q['id']).execute()
                
                explanation = None
                is_correct = False
                
                if cached_review.data and len(cached_review.data) > 0:
                    # Use cached data
                    is_correct = cached_review.data[0]['is_correct']
                    explanation = cached_review.data[0]['explanation']
                elif student_answer:
                    # Generate and cache evaluation
                    try:
                        subject = last_result.get("subject", "physics")
                        context_docs = get_context(q['question_text'], subject=subject, k=2)
                        context = "\n\n".join(context_docs) if context_docs else ""

                        # Basic sanity checks on the student answer to catch gibberish/short inputs
                        clean_answer = (student_answer or "").strip()
                        alpha_chars = sum(1 for c in clean_answer if c.isalpha())
                        max_char = 0
                        if len(clean_answer) > 0:
                            from collections import Counter
                            counts = Counter(clean_answer)
                            max_char = max(counts.values())

                        is_suspicious = (
                            len(clean_answer) < 10 or
                            len(clean_answer.split()) < 2 or
                            alpha_chars < 3 or
                            (len(clean_answer) > 0 and (max_char / len(clean_answer) > 0.6))
                        )

                        if is_suspicious:
                            logging.warning(f"Detected suspicious/gibberish student answer for question {q['id']}")
                            is_correct = False
                            explanation = "Student answer appears to be not a valid attempt (too short or gibberish); marked incorrect."
                        else:
                            # Create evaluation prompt
                            eval_prompt = f"""
Question: {q['question_text']}
Correct Answer: {q['correct_answer']}
Student Answer: {student_answer}

Context: {context[:1000]}

Is the student's answer correct? Respond with ONLY 'CORRECT' or 'INCORRECT' followed by a detailed explanation of why it's correct or what's wrong.
"""

                            # Call LLM safely
                            response = safe_invoke(llm, eval_prompt, purpose="review-eval")
                            ai_response = (response.content or "").strip()

                            # Normalize and interpret AI response strictly
                            ai_norm = ai_response.upper().lstrip()
                            if ai_norm.startswith('CORRECT'):
                                is_correct = True
                                explanation = ai_response[len('CORRECT'):].strip() or "Correct answer."
                            elif ai_norm.startswith('INCORRECT'):
                                is_correct = False
                                explanation = ai_response[len('INCORRECT'):].strip() or "Incorrect answer."
                            else:
                                # Unexpected format from AI - do not trust as correct
                                logging.warning(f"Unexpected AI review format for q={q['id']}: {ai_response}")
                                is_correct = False
                                explanation = "AI did not return a clear CORRECT/INCORRECT response; marked incorrect." 

                        # Cache the review
                        try:
                            supabase.table("question_reviews").insert({
                                "question_id": q['id'],
                                "result_id": result_id,
                                "student_id": student_id,
                                "is_correct": is_correct,
                                "explanation": explanation
                            }).execute()
                        except Exception as cache_error:
                            logging.warning(f"Failed to cache review: {cache_error}")
                            
                    except HTTPException:
                        # Propagate HTTPExceptions from safe_invoke (e.g., AI key errors)
                        raise
                    except Exception as e:
                        logging.error(f"Error generating explanation: {e}")
                        is_correct = False
                        explanation = "Unable to generate explanation at this time."
                
                questions_data.append({
                    "id": q['id'],
                    "question_text": q['question_text'],
                    "correct_answer": q['correct_answer'],
                    "student_answer": student_answer,
                    "explanation": explanation,
                    "is_correct": is_correct
                })
            
            return {
                "attempted": attempted,
                "questions": questions_data,
                "can_retake": can_retake,
                "current_attempts": current_attempts,
                "max_attempts": max_attempts,
                "subject": last_result.get("subject", "physics") if last_result else "physics"
            }
        else:
            # Level not attempted - generate sample questions to show correct answers
            # Get number of questions based on level
            num_questions = {"easy": 5, "medium": 3, "hard": 2}.get(level, 5)
            
            # Initialize LLM
            from ai_service import get_llm
            llm = get_llm()

            # Select prompt based on subject
            subject_lower = subject.lower()
            if subject_lower == "math":
                gen_prompt = generate_questions_prompt_math
            elif subject_lower == "chemistry":
                gen_prompt = generate_questions_prompt_chemistry
            else:
                gen_prompt = generate_questions_prompt_physics

            # Generate questions
            query = f"{subject} {level} level questions concepts topics"
            context_docs = get_context(query, subject=subject, k=3)
            context = "\n\n".join(context_docs) if context_docs else f"General {subject} concepts"
            
            prompt = gen_prompt.format_messages(
                context=context[:2000],
                num_questions=num_questions,
                level=level,
                topic=f"General {subject} {level} concepts"
            )
            
            response = safe_invoke(llm, prompt, purpose="generate-sample-questions")
            response_text = response.content.strip()
            
            # Clean up response
            # Robust JSON extraction
            import re
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(0)
            else:
                 if response_text.startswith('```'):
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                    response_text = response_text.strip()
            
            # Parse JSON
            try:
                generated_questions = json.loads(response_text)
            except json.JSONDecodeError:
                 # Last resort fallback if simple strip failed
                 match = re.search(r'\[.*\]', response.content.strip(), re.DOTALL)
                 if match:
                     generated_questions = json.loads(match.group(0))
                 else:
                     raise
            
            questions_data = []
            for q in generated_questions:
                questions_data.append({
                    "id": f"sample-{len(questions_data)}",
                    "question_text": q.get("question", ""),
                    "correct_answer": q.get("answer", ""),
                    "student_answer": None,
                    "explanation": None,
                    "is_correct": False
                })
            
            return {
                "attempted": False,
                "questions": questions_data,
                "can_retake": False,
                "current_attempts": 0,
                "max_attempts": max_attempts
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting review data: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Review error: {str(e)}")


# ===== AI REVIEW ENDPOINT =====
class AIReviewRequest(BaseModel):
    question: str
    correct_answer: str
    student_answer: str
    level: str
    subject: Optional[str] = "physics"
    question_id: Optional[str] = None  # Added for caching support


@api_router.post("/ai-review")
async def generate_ai_review(request: AIReviewRequest, current_user: Dict = Depends(get_current_user)):
    """Generate detailed AI review comparing student answer with correct answer - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated AI review request from: {current_user['email']}")
        
        subject = request.subject.lower() if request.subject else "physics"
        
        # Check if a cached review exists for this question
        print(f"🔍 AI Review request - question_id: {request.question_id}")
        
        if request.question_id:
            try:
                cached_review = supabase.table("ai_reviews").select("review_content").eq("question_id", request.question_id).execute()
                print(f"🔍 Cache lookup result: {len(cached_review.data) if cached_review.data else 0} records found")
                
                if cached_review.data and len(cached_review.data) > 0:
                    print(f"✅ Returning cached AI review for question {request.question_id}")
                    return {
                        "review": cached_review.data[0]["review_content"],
                        "success": True,
                        "cached": True
                    }
                else:
                    print(f"📝 No cached review found, will generate new one")
            except Exception as cache_error:
                print(f"⚠️ Cache lookup failed: {cache_error}")
        
        # Initialize LLM
        from ai_service import get_llm
        llm = get_llm()
        
        # Get context from RAG system
        context_docs = get_context(request.question, subject=subject, k=3)
        context = "\n\n".join(context_docs) if context_docs else f"General {subject} concepts"
        
        # Select Prompt
        teacher_role = f"experienced {subject} teacher"
        if subject == "math":
            teacher_role = "experienced Mathematics teacher"
        elif subject == "chemistry":
             teacher_role = "experienced Chemistry teacher"
             
        # Create detailed review prompt
        review_prompt = f"""You are an {teacher_role} providing detailed feedback to a student.

Question: {request.question}

Correct Answer: {request.correct_answer}

Student's Answer: {request.student_answer}

Context from {subject.capitalize()} Textbook:
{context[:1500]}

Please provide a comprehensive review that includes:
1. **Comparison Analysis**: Compare the student's answer with the correct answer. Identify what the student got right and what was incorrect or missing.

2. **Concept Explanation**: Explain the underlying physics concepts involved in this question. Help the student understand WHY the correct answer is right.

3. **Common Misconceptions**: If the student's answer shows any misconceptions, address them specifically.

4. **Learning Points**: Highlight key takeaways and what the student should focus on to improve their understanding.

5. **Encouragement**: End with constructive feedback that encourages the student.

Provide a detailed, educational review (200-300 words) that helps the student learn from their mistake or reinforces their understanding if they were close to correct.
"""
        
        # Generate AI review
        response = llm.invoke(review_prompt)
        review_text = response.content.strip()
        
        # Cache the review if question_id is provided
        if request.question_id:
            try:
                # Get student_id and result_id from the question
                logging.info(f"🔍 Looking up question data for: {request.question_id}")
                question_data = supabase.table("questions").select("result_id").eq("id", request.question_id).execute()
                logging.info(f"🔍 Question lookup result: {len(question_data.data) if question_data.data else 0} records")
                
                if question_data.data and len(question_data.data) > 0:
                    result_id = question_data.data[0]["result_id"]
                    logging.info(f"🔍 Found result_id: {result_id}")
                    
                    # Get student_id from results table
                    result_data = supabase.table("results").select("student_id").eq("id", result_id).execute()
                    
                    if result_data.data and len(result_data.data) > 0:
                        student_id = result_data.data[0]["student_id"]
                        logging.info(f"🔍 Found student_id: {student_id}")
                        
                        # Insert the cached review
                        logging.info(f"📝 Inserting AI review into cache...")
                        insert_result = supabase.table("ai_reviews").insert({
                            "question_id": request.question_id,
                            "result_id": result_id,
                            "student_id": student_id,
                            "subject": subject,
                            "review_content": review_text
                        }).execute()
                        logging.info(f"✅ AI review cached for question {request.question_id}, insert result: {len(insert_result.data) if insert_result.data else 'unknown'} rows")
                    else:
                        logging.warning(f"⚠️ Could not find student_id for result: {result_id}")
                else:
                    logging.warning(f"⚠️ Could not find question with id: {request.question_id}")
            except Exception as cache_error:
                logging.warning(f"Failed to cache AI review: {cache_error}")
        
        logging.info("✅ AI review generated successfully")
        
        return {
            "review": review_text,
            "success": True,
            "cached": False
        }
        
    except Exception as e:
        logging.error(f"Error generating AI review: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI review error: {str(e)}")


# ===== AI NOTES GENERATION =====
@api_router.get("/ai-notes/{level}/{student_id}")
async def generate_ai_notes(level: str, student_id: str, subject: Optional[str] = Query(None), current_user: Dict = Depends(get_current_user)):
    """Generate AI study notes based on incorrect answers - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated AI notes request from: {current_user['email']}")
        
        # Initialize LLM
        from ai_service import get_llm
        llm = get_llm()
        
        # Verify user is requesting their own data
        student_response = supabase.table("students").select("email").eq("id", student_id).execute()
        if not student_response.data or student_response.data[0]['email'] != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        # Find the result for this level and student
        query = supabase.table("results").select("*").eq("student_id", student_id).eq("level", level)
        
        if subject:
            query = query.eq("subject", subject)
            
        results_response = query.order("created_at", desc=True).limit(1).execute()
        
        if not results_response.data or len(results_response.data) == 0:
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        result_id = results_response.data[0]['id']
        actual_subject = results_response.data[0].get('subject', 'physics')
        
        # Check if AI notes already exist for this result
        existing_notes = supabase.table("ai_notes").select("*").eq("result_id", result_id).execute()
        
        if existing_notes.data and len(existing_notes.data) > 0:
            # Return cached notes
            cached_data = existing_notes.data[0]
            logging.info(f"✅ Returning cached AI notes for result {result_id}")
            return {
                "topic_notes": cached_data.get("topic_notes", []),
                "incorrect_count": cached_data.get("incorrect_count", 0),
                "cached": True
            }
        
        # Generate new notes if not cached
        # Get all questions for this test
        questions_response = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data:
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        # Get student answers and identify incorrect ones
        incorrect_questions = []
        
        for q in questions_response.data:
            answer_response = supabase.table("student_answers").select("student_answer").eq("question_id", q['id']).execute()
            
            if answer_response.data and len(answer_response.data) > 0:
                student_answer = answer_response.data[0]['student_answer']
                
                # Check if answer is incorrect using AI
                context_docs = get_context(q['question_text'], subject=actual_subject, k=2)
                context = "\n\n".join(context_docs) if context_docs else ""
                
                eval_prompt = f"""
Question: {q['question_text']}
Correct Answer: {q['correct_answer']}
Student Answer: {student_answer}

Context: {context[:1000]}

Is the student's answer correct? Respond with ONLY 'CORRECT' or 'INCORRECT'.
"""
                
                response = llm.invoke(eval_prompt)
                ai_response = response.content.strip()
                
                is_correct = ai_response.upper().startswith('CORRECT')
                
                if not is_correct:
                    incorrect_questions.append({
                        "question": q['question_text'],
                        "correct_answer": q['correct_answer'],
                        "student_answer": student_answer
                    })
        
        if len(incorrect_questions) == 0:
            # Store empty result in cache
            supabase.table("ai_notes").insert({
                "result_id": result_id,
                "student_id": student_id,
                "level": level,
                "topic_notes": [],
                "incorrect_count": 0
            }).execute()
            
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        # Generate consolidated notes for all incorrect questions
        questions_summary = "\n\n".join([
            f"Question: {iq['question']}\nCorrect Answer: {iq['correct_answer']}\nStudent's Answer: {iq['student_answer']}"
            for iq in incorrect_questions
        ])
        
        # Get comprehensive context
        all_questions_text = " ".join([iq['question'] for iq in incorrect_questions])
        context_docs = get_context(all_questions_text, subject=subject, k=5)
        context = "\n\n".join(context_docs) if context_docs else f"General {subject} concepts"
        
        # Select Teacher Role
        teacher_role = f"expert {subject} teacher"
        
        # Generate topic identification and notes
        notes_prompt = f"""You are an {teacher_role} creating personalized study notes.

The student answered the following questions incorrectly:

{questions_summary}

Context from {subject.capitalize()} Textbook:
{context[:3000]}

Your task:
1. Identify the main {subject} topics/concepts these questions relate to
2. Group questions by topic (if multiple questions relate to the same topic, group them together)
3. For each topic, generate comprehensive study notes (300-500 words) that:
   - Explain the core concept clearly
   - Provide key formulas and definitions
   - Include practical examples
   - Address common misconceptions
   - Give tips for solving similar problems

Respond in this JSON format:
{{
  "topic_notes": [
    {{
      "topic": "Topic Name",
      "related_questions": ["Question 1 (first 50 chars)...", "Question 2..."],
      "notes": "Detailed explanation and study notes..."
    }}
  ]
}}
"""
        
        response = llm.invoke(notes_prompt)
        response_text = response.content.strip()
        
        # Clean up response
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        # Parse JSON with fallback for invalid escape sequences (LaTeX like \frac, \pi, etc)
        import re
        
        def fix_json_escapes(text):
            """Fix invalid escape sequences in JSON by escaping backslashes properly"""
            # First, temporarily protect valid JSON escapes
            text = text.replace('\\n', '<<<NEWLINE>>>')
            text = text.replace('\\t', '<<<TAB>>>')
            text = text.replace('\\r', '<<<RETURN>>>')
            text = text.replace('\\"', '<<<QUOTE>>>')
            text = text.replace('\\\\', '<<<BACKSLASH>>>')
            # Now escape any remaining backslashes
            text = text.replace('\\', '\\\\')
            # Restore valid escapes
            text = text.replace('<<<NEWLINE>>>', '\\n')
            text = text.replace('<<<TAB>>>', '\\t')
            text = text.replace('<<<RETURN>>>', '\\r')
            text = text.replace('<<<QUOTE>>>', '\\"')
            text = text.replace('<<<BACKSLASH>>>', '\\\\')
            return text
        
        try:
            notes_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            logging.warning(f"Initial JSON parse failed: {e}, attempting to fix escape sequences")
            # Try to extract JSON object and fix escapes
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                fixed_text = fix_json_escapes(json_match.group(0))
                try:
                    notes_data = json.loads(fixed_text)
                except json.JSONDecodeError as e2:
                    logging.error(f"Could not parse AI notes even after fixing escapes: {e2}")
                    notes_data = {"topic_notes": []}
            else:
                logging.error("No JSON object found in AI notes response")
                notes_data = {"topic_notes": []}
        
        topic_notes = notes_data.get("topic_notes", [])


        
        # Store in database for caching
        supabase.table("ai_notes").insert({
            "result_id": result_id,
            "student_id": student_id,
            "level": level,
            "subject": actual_subject,  # Added for Student -> Subject -> Level relationship
            "topic_notes": topic_notes,
            "incorrect_count": len(incorrect_questions)
        }).execute()
        
        logging.info(f"✅ AI notes generated and cached for {len(incorrect_questions)} incorrect questions")
        
        return {
            "topic_notes": topic_notes,
            "incorrect_count": len(incorrect_questions),
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating AI notes: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI notes error: {str(e)}")


# ===== LEADERBOARD =====

def format_time_smart(seconds: int) -> dict:
    """
    Format time in smart units: minutes -> hours -> days
    Returns dict with value and unit
    """
    if seconds is None or seconds <= 0:
        return {"value": 0, "unit": "min", "display": "0m"}
    
    if seconds >= 86400:  # 24 hours = 86400 seconds
        value = round(seconds / 86400, 1)
        return {"value": value, "unit": "days", "display": f"{value}d"}
    elif seconds >= 3600:  # 60 minutes = 3600 seconds
        value = round(seconds / 3600, 1)
        return {"value": value, "unit": "hours", "display": f"{value}h"}
    else:
        value = round(seconds / 60, 1)
        return {"value": value, "unit": "min", "display": f"{value}m"}


def calculate_composite_score(results: dict, include_hard: bool = True) -> dict:
    """
    Calculate composite leaderboard score using multiple factors:
    - Difficulty-Weighted Score (50%): Harder levels weighted more
    - Time Efficiency Score (25%): Faster completion = higher score
    - Attempt Efficiency Score (25%): Fewer attempts = higher score
    - Bonuses: Perfect run (+0.5), Hard completion (+0.3)
    
    Returns dict with composite_score and breakdown
    """
    # Difficulty weights for each level
    DIFFICULTY_WEIGHTS = {'easy': 1.0, 'medium': 1.3, 'hard': 1.6}
    
    # Reference times in seconds (expected completion time)
    REFERENCE_TIMES = {'easy': 600, 'medium': 900, 'hard': 1200}
    
    # Component weights
    WEIGHT_DIFFICULTY = 0.50
    WEIGHT_TIME = 0.25
    WEIGHT_EFFICIENCY = 0.25
    
    levels_to_check = ['easy', 'medium', 'hard'] if include_hard else ['easy', 'medium']
    
    # === 1. Difficulty-Weighted Score ===
    weighted_sum = 0
    max_possible = 0
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            score = result.get('score', 0)
            weight = DIFFICULTY_WEIGHTS[level]
            weighted_sum += score * weight
            max_possible += 10 * weight
    
    # Normalize to 0-10 scale
    difficulty_score = (weighted_sum / max_possible * 10) if max_possible > 0 else 0
    
    # === 2. Time Efficiency Score ===
    time_scores = []
    total_time = 0
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            time_taken = result.get('time_taken', 0)
            total_time += time_taken
            
            if time_taken > 0:
                reference = REFERENCE_TIMES[level]
                time_ratio = reference / time_taken
                level_time_score = min(10, time_ratio * 5)
                time_scores.append(level_time_score)
            else:
                time_scores.append(5)
    
    time_score = sum(time_scores) / len(time_scores) if time_scores else 5
    
    # === 3. Attempt Efficiency Score ===
    efficiency_scores = []
    all_first_attempt = True
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            attempts_key = f'attempts_{level}'
            attempts = result.get(attempts_key, 1)
            if attempts == 0:
                attempts = 1
            
            level_efficiency = (1 / attempts) * 10
            efficiency_scores.append(level_efficiency)
            
            if attempts > 1:
                all_first_attempt = False
    
    efficiency_score = sum(efficiency_scores) / len(efficiency_scores) if efficiency_scores else 5
    
    # === 4. Bonuses ===
    bonuses = 0
    bonus_details = []
    
    if all_first_attempt and len(efficiency_scores) == len(levels_to_check):
        bonuses += 0.5
        bonus_details.append("Perfect Run +0.5")
    
    if include_hard and results.get('hard') and results['hard'].get('result') == 'pass':
        bonuses += 0.3
        bonus_details.append("Hard Completion +0.3")
    
    # === Calculate Composite Score ===
    composite_score = (
        (difficulty_score * WEIGHT_DIFFICULTY) +
        (time_score * WEIGHT_TIME) +
        (efficiency_score * WEIGHT_EFFICIENCY) +
        bonuses
    )
    
    return {
        'composite_score': round(composite_score, 2),
        'score_breakdown': {
            'difficulty_weighted': round(difficulty_score, 2),
            'time_efficiency': round(time_score, 2),
            'attempt_efficiency': round(efficiency_score, 2),
            'bonuses': round(bonuses, 2),
            'bonus_details': bonus_details
        },
        'total_time_seconds': total_time
    }


async def update_student_final_scores(student_id: str):
    """
    Update the student_final_scores table with computed scores.
    Called after each test completion to keep leaderboard data fresh.
    """
    try:
        # Get all results for this student
        results_response = supabase.table("results").select("*").eq("student_id", student_id).order("created_at", desc=False).execute()
        
        if not results_response.data:
            return
        
        # Group by level, keeping best/passed result
        student_results = {'easy': None, 'medium': None, 'hard': None}
        total_time_all_attempts = 0
        
        for result in results_response.data:
            level = result.get('level')
            if level not in student_results:
                continue
            
            # Accumulate ALL time spent (pass or fail)
            time_taken = result.get('time_taken', 0) or 0
            total_time_all_attempts += time_taken
            
            # Keep passed result or latest
            if student_results[level] is None or result.get('result') == 'pass':
                student_results[level] = result
        
        # Determine highest level passed
        highest_level = None
        levels_passed = 0
        for level in ['hard', 'medium', 'easy']:
            if student_results[level] and student_results[level].get('result') == 'pass':
                if highest_level is None:
                    highest_level = level
                levels_passed += 1
        
        # Calculate composite score (always include all levels attempted)
        include_hard = student_results['hard'] is not None
        score_data = calculate_composite_score(student_results, include_hard=include_hard)
        
        # Determine if passed (at least medium level)
        is_passed = student_results.get('medium') and student_results['medium'].get('result') == 'pass'
        
        # Get concession if any
        concession = 0
        for result in results_response.data:
            if result.get('concession'):
                concession = max(concession, result.get('concession', 0))
        
        # Upsert to student_final_scores
        upsert_data = {
            'student_id': student_id,
            'total_time_seconds': total_time_all_attempts,
            'composite_score': score_data['composite_score'],
            'score_breakdown': score_data['score_breakdown'],
            'levels_passed': levels_passed,
            'highest_level': highest_level,
            'concession': concession,
            'is_passed': is_passed,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
        
        # Check if exists and update, or insert
        existing = supabase.table("student_final_scores").select("id").eq("student_id", student_id).execute()
        
        if existing.data and len(existing.data) > 0:
            supabase.table("student_final_scores").update(upsert_data).eq("student_id", student_id).execute()
        else:
            supabase.table("student_final_scores").insert(upsert_data).execute()
        
        logging.info(f"✅ Updated final scores for student {student_id}: score={score_data['composite_score']}, time={total_time_all_attempts}s")
        
    except Exception as e:
        logging.error(f"Error updating student final scores: {e}")
        logging.error("Traceback: ", exc_info=True)


@api_router.get("/leaderboard")
async def get_leaderboard(time_period: str = Query("all", description="Filter by time: 'week', 'month', or 'all'")):
    """Get unified leaderboard data for all students with composite scoring and time filtering"""
    try:
        # Calculate date filter based on time_period
        from datetime import timedelta
        
        date_filter = None
        now = datetime.now(timezone.utc)
        
        if time_period == "week":
            date_filter = (now - timedelta(days=7)).isoformat()
        elif time_period == "month":
            date_filter = (now - timedelta(days=30)).isoformat()
        # "all" means no date filter
        
        # Try to fetch from student_final_scores table first
        query = supabase.table("student_final_scores").select("*")
        
        if date_filter:
            query = query.gte("last_updated", date_filter)
        
        final_scores = query.order("composite_score", desc=True).execute()
        
        # Get student details
        students_response = supabase.table("students").select("id, first_name, last_name, email").execute()
        students_map = {s['id']: s for s in students_response.data}
        
        leaderboard = []
        
        if final_scores.data and len(final_scores.data) > 0:
            # Use pre-computed scores from student_final_scores
            for score_entry in final_scores.data:
                student_id = score_entry['student_id']
                if student_id not in students_map:
                    continue
                
                # Only include students who have passed at least one level
                if score_entry.get('levels_passed', 0) == 0:
                    continue
                
                student_info = students_map[student_id]
                student_name = f"{student_info['first_name']} {student_info['last_name']}"
                
                time_formatted = format_time_smart(score_entry.get('total_time_seconds', 0))
                
                leaderboard.append({
                    'rank': 0,
                    'student_name': student_name,
                    'email': student_info['email'],
                    'composite_score': score_entry.get('composite_score', 0),
                    'total_score': score_entry.get('composite_score', 0),  # Backward compatibility
                    'score_breakdown': score_entry.get('score_breakdown', {}),
                    'total_time': time_formatted,
                    'total_time_seconds': score_entry.get('total_time_seconds', 0),
                    'levels_passed': score_entry.get('levels_passed', 0),
                    'highest_level': score_entry.get('highest_level'),
                    'is_passed': score_entry.get('is_passed', False),
                    'concession': score_entry.get('concession', 0),
                    'last_updated': score_entry.get('last_updated')
                })
        else:
            # Fallback: Calculate on-the-fly from results table
            results_query = supabase.table("results").select("*")
            
            if date_filter:
                results_query = results_query.gte("created_at", date_filter)
            
            all_results = results_query.order("created_at", desc=False).execute()
            
            if all_results.data:
                student_results = {}
                student_total_time = {}
                
                for result in all_results.data:
                    student_id = result['student_id']
                    if student_id not in student_results:
                        student_results[student_id] = {'easy': None, 'medium': None, 'hard': None}
                        student_total_time[student_id] = 0
                    
                    # Accumulate time
                    student_total_time[student_id] += result.get('time_taken', 0) or 0
                    
                    level = result['level']
                    if student_results[student_id][level] is None or result['result'] == 'pass':
                        student_results[student_id][level] = result
                
                for student_id, results in student_results.items():
                    if student_id not in students_map:
                        continue
                    
                    # Calculate levels passed and highest
                    levels_passed = 0
                    highest_level = None
                    for level in ['hard', 'medium', 'easy']:
                        if results[level] and results[level].get('result') == 'pass':
                            if highest_level is None:
                                highest_level = level
                            levels_passed += 1
                    
                    if levels_passed == 0:
                        continue
                    
                    student_info = students_map[student_id]
                    student_name = f"{student_info['first_name']} {student_info['last_name']}"
                    
                    include_hard = results['hard'] is not None
                    score_data = calculate_composite_score(results, include_hard=include_hard)
                    time_formatted = format_time_smart(student_total_time[student_id])
                    
                    is_passed = results.get('medium') and results['medium'].get('result') == 'pass'
                    
                    leaderboard.append({
                        'rank': 0,
                        'student_name': student_name,
                        'email': student_info['email'],
                        'composite_score': score_data['composite_score'],
                        'total_score': score_data['composite_score'],
                        'score_breakdown': score_data['score_breakdown'],
                        'total_time': time_formatted,
                        'total_time_seconds': student_total_time[student_id],
                        'levels_passed': levels_passed,
                        'highest_level': highest_level,
                        'is_passed': is_passed,
                        'concession': 0
                    })
        
        # Sort: by composite_score (desc), then by time (asc) as tiebreaker
        leaderboard.sort(key=lambda x: (-x['composite_score'], x.get('total_time_seconds', 0)))
        
        # Assign ranks
        for idx, entry in enumerate(leaderboard):
            entry['rank'] = idx + 1
        
        logging.info(f"✅ Unified leaderboard generated: {len(leaderboard)} entries")
        
        return {
            "leaderboard": leaderboard,
            # Backward compatibility
            "hard_leaderboard": [e for e in leaderboard if e.get('highest_level') == 'hard'],
            "medium_leaderboard": [e for e in leaderboard if e.get('highest_level') == 'medium']
        }
        
    except Exception as e:
        logging.error(f"Error generating leaderboard: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Leaderboard error: {str(e)}")





@api_router.post("/send-confirmation-email")
async def send_confirmation_email(request: SendConfirmationEmailRequest):
    """Send email confirmation using Gmail API"""
    try:
        from email.mime.text import MIMEText
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import base64
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        frontend_url = os.environ.get('FRONTEND_URL', 'https://repair-wizard-26.preview.emergentagent.com')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("Gmail credentials not configured")
            return {"success": False, "message": "Gmail not configured"}
        
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/gmail.send']
        )
        
        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)
        
        # Create confirmation link
        confirmation_link = f"{frontend_url}/confirm-email?user_id={request.user_id}"
        
        message = MIMEText(f"""
Dear {request.student_name},

Welcome to AdmitAI! 

Thank you for registering. Please confirm your email address by clicking the link below:

{confirmation_link}

If you did not create an account, please ignore this email.

Best regards,
AdmitAI Team
        """)
        message['to'] = request.to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = "Confirm Your AdmitAI Account"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"✅ Confirmation email sent to {request.to_email}")
        return {"success": True, "message": "Confirmation email sent successfully"}
        
    except Exception as e:
        logging.error(f"❌ Confirmation email error: {str(e)}")
        return {"success": False, "message": f"Email failed: {str(e)}"}


# ===== SETUP =====
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logging.info("🚀 AdmitAI Backend with LangGraph + RAG")
logging.info(f"📊 Supabase: {supabase_url}")
logging.info("🤖 Gemini 2.5 Flash: Configured")
logging.info(f"🔮 RAG: {'Enabled' if RAG_ENABLED else 'Disabled (will use fallback)'}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
