from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import google.generativeai as genai
import json
from supabase import create_client, Client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Gemini AI
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    dob: str
    email: str
    phone: str


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


# Basic routes
@api_router.get("/")
async def root():
    return {"message": "AdmitAI API - Powered by Supabase & Gemini", "status": "operational"}


@api_router.get("/health")
async def health_check():
    try:
        # Test Supabase connection
        response = supabase.table("students").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "supabase_url": supabase_url
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "error",
            "error": str(e)
        }


# Student endpoints
@api_router.post("/students")
async def create_student(student: StudentCreate):
    try:
        response = supabase.table("students").insert({
            "first_name": student.first_name,
            "last_name": student.last_name,
            "age": student.age,
            "dob": student.dob,
            "email": student.email,
            "phone": student.phone
        }).execute()
        
        if hasattr(response, 'data') and response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}")
async def get_student(student_id: str):
    try:
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
async def list_students():
    try:
        response = supabase.table("students").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI-powered question generation using Gemini
@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        level = request.level
        num_questions = request.num_questions
        
        # Configure Gemini model (use gemini-pro for the free tier)
        model = genai.GenerativeModel('gemini-pro')
        
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
        logging.error(f"Response text: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logging.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI-powered answer evaluation using Gemini
@api_router.post("/evaluate-answers")
async def evaluate_answers(request: EvaluateAnswersRequest):
    try:
        result_id = request.result_id
        
        # Get questions with their answers using Supabase
        questions_response = supabase.table("questions").select(
            "id, question_text, correct_answer, student_answers(student_answer)"
        ).eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data:
            raise HTTPException(status_code=404, detail="No questions found for this result")
        
        questions = questions_response.data
        
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
            student_answer = ""
            if q.get('student_answers') and len(q['student_answers']) > 0:
                student_answer = q['student_answers'][0].get('student_answer', 'No answer provided')
            
            evaluation_prompt += f"""
Question {idx}: {q['question_text']}
Model Answer: {q['correct_answer']}
Student Answer: {student_answer}

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
        
        # Update result in Supabase
        supabase.table("results").update({
            "score": percentage,
            "result": result_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", result_id).execute()
        
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
        logging.error(f"Response text: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI evaluation")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error evaluating answers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Email notification endpoint (placeholder)
@api_router.post("/send-notification")
async def send_notification(request: NotificationEmailRequest):
    try:
        # TODO: Implement Gmail OAuth email sending
        logging.info(f"Notification requested for {request.to_email}: {request.result} (Score: {request.score})")
        return {
            "success": True,
            "message": "Notification logged (email implementation pending)"
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

# Log startup
logging.info(f"🚀 AdmitAI Backend starting...")
logging.info(f"📊 Supabase URL: {supabase_url}")
logging.info(f"🤖 Gemini AI: Configured")
