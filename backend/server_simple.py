import os
import logging
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

# FastAPI and Pydantic
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, EmailStr, constr, validator
from starlette.middleware.cors import CORSMiddleware

# Supabase and Google Generative AI
from supabase import create_client, Client
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError

# Environment and Authentication
from dotenv import load_dotenv
from firebase_config import initialize_firebase, verify_firebase_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- CONFIGURATION AND INITIALIZATION ---

# Environment Loading
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment Variable Validation
REQUIRED_ENV_VARS = [
    'SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY',
    'FIREBASE_PROJECT_ID', 'CORS_ORIGINS'
]
for var in REQUIRED_ENV_VARS:
    if not os.getenv(var):
        raise ValueError(f"Missing required environment variable: {var}")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# External Services
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
supabase: Client = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
initialize_firebase()

# --- FastAPI APP SETUP ---

app = FastAPI(title="AdmitAI Simple Server")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# --- UTILITY FUNCTIONS ---

def clean_ai_response(response_text: str) -> str:
    """Cleans markdown and JSON formatting from AI-generated text."""
    return response_text.strip().replace("```json", "").replace("```", "").strip()

# --- AUTHENTICATION DEPENDENCY ---

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validates Firebase ID token and returns the decoded token."""
    try:
        return verify_firebase_token(credentials.credentials)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

# --- PYDANTIC MODELS ---

class StudentCreate(BaseModel):
    first_name: constr(min_length=1)
    last_name: constr(min_length=1)
    age: int = Field(..., gt=0)
    dob: str
    email: EmailStr
    phone: constr(min_length=5)

class GenerateQuestionsRequest(BaseModel):
    level: str
    num_questions: int = Field(5, gt=1, le=15)

    @validator('level')
    def level_must_be_valid(cls, v):
        if v not in ['easy', 'medium', 'hard']:
            raise ValueError("Level must be 'easy', 'medium', or 'hard'.")
        return v

# --- API ENDPOINTS ---

@api_router.get("/")
def root():
    return {"message": "AdmitAI API", "status": "operational"}

@api_router.get("/health")
def health_check():
    try:
        supabase.table("students").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "error"})

# --- PROTECTED STUDENT ENDPOINTS ---

@api_router.post("/students", status_code=201)
def create_student(student: StudentCreate, user: dict = Depends(get_current_user)):
    try:
        # Ensure the email in the payload matches the authenticated user's email
        if student.email != user.get('email'):
            raise HTTPException(status_code=403, detail="Payload email does not match authenticated user.")
            
        response = supabase.table("students").insert(student.model_dump()).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        if "unique constraint" in str(e):
            raise HTTPException(status_code=409, detail="A student with this email already exists.")
        logger.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail="Failed to create student profile.")

@api_router.get("/students")
def list_students(page: int = Query(1, gt=0), page_size: int = Query(20, gt=0, le=100), user: dict = Depends(get_current_user)):
    try:
        offset = (page - 1) * page_size
        response = supabase.table("students").select("*").order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve students.")

# --- AI ENDPOINTS ---

@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest, user: dict = Depends(get_current_user)):
    model = genai.GenerativeModel('gemini-1.5-flash')
    difficulty_guidelines = {
        'easy': 'Focus on fundamental concepts and basic applications.',
        'medium': 'Include problem-solving and application of multiple concepts.',
        'hard': 'Require advanced reasoning and critical thinking.'
    }
    prompt = (
        f"Generate {request.num_questions} UNIQUE physics questions at {request.level} difficulty. "
        f"{difficulty_guidelines.get(request.level, '')} "
        "Return ONLY a valid JSON array of objects: [{\"question\": \"...\", \"answer\": \"...\"}]"
    )

    try:
        response = await model.generate_content_async(prompt, request_options={'timeout': 60})
        response_text = clean_ai_response(response.text)
        questions = json.loads(response_text)
        if not isinstance(questions, list) or not all("question" in q and "answer" in q for q in questions):
            raise ValueError("AI response schema is invalid.")
        return {"questions": questions}
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to process AI response: {e}\nResponse: {getattr(response, 'text', 'N/A')}")
        raise HTTPException(status_code=500, detail="Error processing AI response.")
    except GoogleAPICallError as e:
        logger.error(f"Google API error: {e}")
        raise HTTPException(status_code=502, detail="AI service failed.")
    except Exception as e:
        logger.error(f"Unexpected error in generate_questions: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# --- APP ROUTER AND MIDDLEWARE ---

app.include_router(api_router)

# Secure CORS Middleware
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🚀 AdmitAI Simple Backend Initialized")
logger.info(f"🔗 Allowed CORS Origins: {CORS_ORIGINS}")
