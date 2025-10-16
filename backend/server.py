from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import google.generativeai as genai
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Gemini AI
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

# Database connection pool
db_pool = None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Student(BaseModel):
    id: Optional[str] = Field(default=None)
    first_name: str
    last_name: str
    age: int
    dob: str
    email: str
    phone: str
    concession: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    dob: str
    email: str
    phone: str


class Result(BaseModel):
    id: Optional[str] = Field(default=None)
    student_id: str
    level: str
    score: Optional[float] = None
    result: Optional[str] = None
    attempts_easy: Optional[int] = 0
    attempts_medium: Optional[int] = 0
    attempts_hard: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ResultCreate(BaseModel):
    student_id: str
    level: str


class Question(BaseModel):
    id: Optional[str] = Field(default=None)
    result_id: str
    question_text: str
    correct_answer: str
    created_at: Optional[datetime] = None


class QuestionCreate(BaseModel):
    result_id: str
    question_text: str
    correct_answer: str


class StudentAnswer(BaseModel):
    id: Optional[str] = Field(default=None)
    question_id: str
    student_answer: str
    created_at: Optional[datetime] = None


class StudentAnswerCreate(BaseModel):
    question_id: str
    student_answer: str


class GenerateQuestionsRequest(BaseModel):
    level: str
    num_questions: int = 5


class EvaluateAnswersRequest(BaseModel):
    result_id: str


class NotificationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    result: str
    score: float


# Database initialization
@app.on_event("startup")
async def startup_db_pool():
    global db_pool
    database_url = os.environ.get('DATABASE_URL')
    try:
        # Try to establish connection pool with longer timeout
        db_pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=10,
            command_timeout=60,
            timeout=60,
            ssl='require'  # Supabase requires SSL
        )
        # Test the connection
        async with db_pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        logging.info("✅ Database connection pool created and tested successfully")
    except Exception as e:
        logging.error(f"❌ Failed to connect to Supabase database: {str(e)}")
        logging.error("Please ensure:")
        logging.error("  1. Database tables are created (see SUPABASE_SETUP_INSTRUCTIONS.md)")
        logging.error("  2. Supabase project is not paused")
        logging.error("  3. Connection string is correct")
        logging.error("  4. Network connectivity to Supabase is available")
        logging.error(f"  5. Connection URL: {database_url[:50]}...")
        # Don't raise - allow app to start for debugging
        db_pool = None
        logging.warning("⚠️  App starting WITHOUT database connection - endpoints will fail until DB is fixed")


@app.on_event("shutdown")
async def shutdown_db_pool():
    global db_pool
    if db_pool:
        await db_pool.close()
        logging.info("Database connection pool closed")


# Basic routes
@api_router.get("/")
async def root():
    return {"message": "AdmitAI API - Powered by Supabase & Gemini"}


@api_router.get("/health")
async def health_check():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")


# Student endpoints
@api_router.post("/students", response_model=Student)
async def create_student(student: StudentCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO students (first_name, last_name, age, dob, email, phone)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                """,
                student.first_name,
                student.last_name,
                student.age,
                student.dob,
                student.email,
                student.phone
            )
            return Student(**dict(row))
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM students WHERE id = $1",
                student_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Student not found")
            return Student(**dict(row))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students", response_model=List[Student])
async def list_students():
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM students ORDER BY created_at DESC")
            return [Student(**dict(row)) for row in rows]
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Result endpoints
@api_router.post("/results", response_model=Result)
async def create_result(result: ResultCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO results (student_id, level, result)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                result.student_id,
                result.level,
                'pending'
            )
            return Result(**dict(row))
    except Exception as e:
        logging.error(f"Error creating result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/results/{result_id}", response_model=Result)
async def get_result(result_id: str):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM results WHERE id = $1",
                result_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Result not found")
            return Result(**dict(row))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}/results", response_model=List[Result])
async def get_student_results(student_id: str):
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM results WHERE student_id = $1 ORDER BY created_at DESC",
                student_id
            )
            return [Result(**dict(row)) for row in rows]
    except Exception as e:
        logging.error(f"Error fetching student results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Question endpoints
@api_router.post("/questions", response_model=Question)
async def create_question(question: QuestionCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO questions (result_id, question_text, correct_answer)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                question.result_id,
                question.question_text,
                question.correct_answer
            )
            return Question(**dict(row))
    except Exception as e:
        logging.error(f"Error creating question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/results/{result_id}/questions", response_model=List[Question])
async def get_result_questions(result_id: str):
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM questions WHERE result_id = $1 ORDER BY created_at",
                result_id
            )
            return [Question(**dict(row)) for row in rows]
    except Exception as e:
        logging.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Student Answer endpoints
@api_router.post("/student-answers", response_model=StudentAnswer)
async def create_student_answer(answer: StudentAnswerCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO student_answers (question_id, student_answer)
                VALUES ($1, $2)
                RETURNING *
                """,
                answer.question_id,
                answer.student_answer
            )
            return StudentAnswer(**dict(row))
    except Exception as e:
        logging.error(f"Error creating student answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/questions/{question_id}/answers", response_model=List[StudentAnswer])
async def get_question_answers(question_id: str):
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM student_answers WHERE question_id = $1 ORDER BY created_at",
                question_id
            )
            return [StudentAnswer(**dict(row)) for row in rows]
    except Exception as e:
        logging.error(f"Error fetching answers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI-powered question generation using Gemini
@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        level = request.level
        num_questions = request.num_questions
        
        # Configure Gemini model
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        system_prompt = f"You are an expert physics exam question generator. Generate {num_questions} UNIQUE physics questions at {level} difficulty level."
        
        user_prompt = f"""Generate {num_questions} UNIQUE physics questions at {level} difficulty level.

Requirements:
- Questions should cover different physics topics (mechanics, thermodynamics, electromagnetism, optics, modern physics)
- Each question should require a detailed explanation, not just a number
- Provide comprehensive model answers that demonstrate deep understanding
- {level == 'easy' and 'Focus on fundamental concepts and basic applications' or ''}
- {level == 'medium' and 'Include problem-solving and application of concepts' or ''}
- {level == 'hard' and 'Require advanced reasoning, multiple concepts integration, and critical thinking' or ''}

Return ONLY a valid JSON array:
[
  {{
    "question": "question text",
    "answer": "detailed answer text"
  }}
]

Do not include markdown, code blocks, or any text outside the JSON array."""

        # Generate questions using Gemini
        response = model.generate_content(user_prompt)
        response_text = response.text.strip()
        
        # Clean up response (remove markdown code blocks if present)
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        # Parse JSON
        questions = json.loads(response_text)
        
        return {"questions": questions}
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logging.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI-powered answer evaluation using Gemini
@api_router.post("/evaluate-answers")
async def evaluate_answers(request: EvaluateAnswersRequest):
    try:
        result_id = request.result_id
        
        async with db_pool.acquire() as conn:
            # Get questions with their answers
            questions = await conn.fetch(
                """
                SELECT q.id, q.question_text, q.correct_answer, sa.student_answer
                FROM questions q
                LEFT JOIN student_answers sa ON sa.question_id = q.id
                WHERE q.result_id = $1
                ORDER BY q.created_at
                """,
                result_id
            )
            
            if not questions:
                raise HTTPException(status_code=404, detail="No questions found for this result")
            
            # Prepare evaluation prompt
            model = genai.GenerativeModel('gemini-1.5-pro')
            
            evaluation_prompt = """You are an expert physics examiner. Evaluate the following student answers against the model answers.

For each question, provide:
1. Score out of 10
2. Brief feedback on what was good and what could be improved

Return ONLY a valid JSON array:
[
  {
    "question_number": 1,
    "score": 8,
    "feedback": "feedback text"
  }
]

Questions and Answers:
"""
            
            for idx, q in enumerate(questions, 1):
                evaluation_prompt += f"""
Question {idx}: {q['question_text']}
Model Answer: {q['correct_answer']}
Student Answer: {q['student_answer'] or 'No answer provided'}

"""
            
            evaluation_prompt += "\nReturn ONLY valid JSON array without any markdown or code blocks."
            
            # Generate evaluation
            response = model.generate_content(evaluation_prompt)
            response_text = response.text.strip()
            
            # Clean up response
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            # Parse evaluation
            evaluations = json.loads(response_text)
            
            # Calculate total score
            total_score = sum(e['score'] for e in evaluations)
            max_score = len(evaluations) * 10
            percentage = (total_score / max_score) * 100
            
            # Determine pass/fail (60% threshold)
            result_status = 'pass' if percentage >= 60 else 'fail'
            
            # Update result in database
            await conn.execute(
                """
                UPDATE results
                SET score = $1, result = $2, updated_at = NOW()
                WHERE id = $3
                """,
                percentage,
                result_status,
                result_id
            )
            
            return {
                "result_id": result_id,
                "total_score": total_score,
                "max_score": max_score,
                "percentage": percentage,
                "result": result_status,
                "evaluations": evaluations
            }
            
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI evaluation")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error evaluating answers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Email notification endpoint (placeholder - needs Gmail OAuth implementation)
@api_router.post("/send-notification")
async def send_notification(request: NotificationEmailRequest):
    try:
        # TODO: Implement Gmail OAuth email sending
        # For now, return success
        logging.info(f"Notification requested for {request.to_email}: {request.result}")
        return {
            "success": True,
            "message": "Notification queued (email implementation pending)"
        }
    except Exception as e:
        logging.error(f"Error sending notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
