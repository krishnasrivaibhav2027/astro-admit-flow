import os
import logging
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# FastAPI and Pydantic
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr, constr
from starlette.middleware.cors import CORSMiddleware

# Database and Environment
import asyncpg
from dotenv import load_dotenv

# Google Generative AI
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError

# --- CONFIGURATION AND INITIALIZATION ---

# Environment Loading
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment Variable Validation at Startup
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

if not GEMINI_API_KEY:
    raise ValueError("CRITICAL: GEMINI_API_KEY environment variable is not set.")
if not DATABASE_URL:
    raise ValueError("CRITICAL: DATABASE_URL environment variable is not set.")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure Google Generative AI
genai.configure(api_key=GEMINI_API_KEY)

# --- FastAPI APP AND DATABASE POOL ---

app = FastAPI(title="AdmitAI API (AsyncPG)")
api_router = APIRouter(prefix="/api")
db_pool: Optional[asyncpg.Pool] = None

# --- Pydantic Models with Validation ---

class Student(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    age: int
    dob: str
    email: EmailStr
    phone: str
    created_at: datetime
    updated_at: datetime

class StudentCreate(BaseModel):
    first_name: constr(min_length=1)
    last_name: constr(min_length=1)
    age: int = Field(..., gt=0)
    dob: str
    email: EmailStr
    phone: constr(min_length=5)

class Result(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    level: str
    score: Optional[float] = None
    result: Optional[str] = None
    created_at: datetime

class ResultCreate(BaseModel):
    student_id: uuid.UUID
    level: str

class GenerateQuestionsRequest(BaseModel):
    level: str
    num_questions: int = Field(5, gt=0, le=20)

class EvaluateAnswersRequest(BaseModel):
    result_id: uuid.UUID

# --- Database Management ---

@app.on_event("startup")
async def startup_db_pool():
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, command_timeout=30)
        async with db_pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        logger.info("✅ Database connection pool created successfully.")
    except Exception as e:
        logger.critical(f"❌ Failed to connect to the database: {e}")
        db_pool = None

@app.on_event("shutdown")
async def shutdown_db_pool():
    if db_pool:
        await db_pool.close()
        logger.info("Database connection pool closed.")

def get_db_pool() -> asyncpg.Pool:
    if db_pool is None:
        raise HTTPException(status_code=503, detail="Database is not available.")
    return db_pool

# --- API Endpoints ---

@api_router.get("/")
async def root():
    return {"message": "AdmitAI API - AsyncPG Version"}

@api_router.get("/health")
async def health_check(pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        async with pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "error", "error": str(e)})

@api_router.post("/students", response_model=Student, status_code=201)
async def create_student(student: StudentCreate, pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "INSERT INTO students (first_name, last_name, age, dob, email, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                student.first_name, student.last_name, student.age, student.dob, student.email, student.phone
            )
            return Student(**dict(row))
    except asyncpg.UniqueViolationError as e:
        logger.warning(f"Unique constraint violation for email {student.email}: {e}")
        raise HTTPException(status_code=409, detail=f"A profile with this email already exists.")
    except Exception as e:
        logger.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail="Could not create student profile.")

@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = (
        f"Generate {request.num_questions} UNIQUE physics questions at {request.level} difficulty. "
        "Return ONLY a valid JSON array of objects: [{\"question\": \"...\", \"answer\": \"...\"}]"
    )
    
    try:
        response = await model.generate_content_async(
            prompt,
            request_options={'timeout': 60}
        )
        response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        questions = json.loads(response_text)
        
        if not isinstance(questions, list) or not all("question" in q and "answer" in q for q in questions):
            raise ValueError("AI response did not match expected schema.")
            
        return {"questions": questions}
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse or validate AI response: {e}\nResponse: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to process AI response.")
    except GoogleAPICallError as e:
        logger.error(f"Google API error during question generation: {e}")
        raise HTTPException(status_code=502, detail="AI service failed to generate questions.")
    except Exception as e:
        logger.error(f"Error in generate_questions: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@api_router.post("/evaluate-answers")
async def evaluate_answers(request: EvaluateAnswersRequest, pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        async with pool.acquire() as conn:
            questions = await conn.fetch(
                """
                SELECT q.question_text, q.correct_answer, sa.student_answer
                FROM questions q LEFT JOIN student_answers sa ON sa.question_id = q.id
                WHERE q.result_id = $1 ORDER BY q.created_at
                """,
                request.result_id
            )
            if not questions:
                raise HTTPException(status_code=404, detail="No questions found for this result.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error fetching questions for evaluation: {e}")
        raise HTTPException(status_code=500, "Failed to retrieve questions for evaluation.")

    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = "Evaluate the following student answers. For each, provide a score (0-10) and brief feedback. Return ONLY a valid JSON array: [{\"score\": 8, \"feedback\": \"...\"}]\n\n"
    for i, q in enumerate(questions, 1):
        prompt += f"Q{i}: {q['question_text']}\nModel Answer: {q['correct_answer']}\nStudent Answer: {q['student_answer'] or 'N/A'}\n\n"

    try:
        response = await model.generate_content_async(
            prompt,
            request_options={'timeout': 120}
        )
        response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        evaluations = json.loads(response_text)
        
        if not isinstance(evaluations, list) or not all("score" in e and "feedback" in e for e in evaluations):
            raise ValueError("AI evaluation response did not match expected schema.")

        total_score = sum(e['score'] for e in evaluations)
        max_score = len(evaluations) * 10
        percentage = (total_score / max_score) * 100 if max_score > 0 else 0
        result_status = 'pass' if percentage >= 60 else 'fail'

        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE results SET score = $1, result = $2, updated_at = NOW() WHERE id = $3",
                percentage, result_status, request.result_id
            )

        return {
            "result_id": request.result_id,
            "percentage": round(percentage, 2),
            "result": result_status,
            "evaluations": evaluations
        }
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse or validate AI evaluation: {e}\nResponse: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to process AI evaluation response.")
    except GoogleAPICallError as e:
        logger.error(f"Google API error during evaluation: {e}")
        raise HTTPException(status_code=502, detail="AI service failed to evaluate answers.")
    except Exception as e:
        logger.error(f"Error in evaluate_answers: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during evaluation.")


# --- App Router and Middleware ---

app.include_router(api_router)

# Secure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🚀 AdmitAI AsyncPG Backend Initialized")
logger.info(f"🔗 Allowed CORS Origins: {CORS_ORIGINS}")
