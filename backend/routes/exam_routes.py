"""
Exam Routes Module
Handles test sessions, questions, answers, and question generation.
Extracted from server.py for better maintainability.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict
from datetime import datetime, timezone, timedelta
import logging
import os
import asyncio
import time

from supabase import create_client, Client
from auth_dependencies import get_current_user, get_current_user_with_activity
from models import CreateResultRequest, SaveQuestionsRequest, GenerateQuestionsRequest
import settings_manager

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["exam"])

# ===== CONSTANTS =====
LEVEL_DURATIONS = {
    "easy": 10 * 60,    # 10 minutes
    "medium": 35 * 60,  # 35 minutes
    "hard": 45 * 60     # 45 minutes
}

# Global Replenishment Tracker
LAST_REPLENISHMENT = {}


class SaveAnswerRequest(BaseModel):
    result_id: str
    question_id: str
    student_answer: str


@router.post("/create-result")
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


@router.post("/save-questions")
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


@router.post("/save-answer")
async def save_answer(request: SaveAnswerRequest, current_user: Dict = Depends(get_current_user_with_activity)):
    """Save a single student answer - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
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


@router.post("/submit-test")
async def submit_test(request, current_user: Dict = Depends(get_current_user_with_activity)):
    """Submit test answers only - Authenticated"""
    from models import SubmitTestRequest
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # 1. Fetch questions for this result to map answers
        questions_response = supabase.table("questions").select("*").eq("result_id", request.result_id).order("created_at").execute()
        if not questions_response.data:
            raise HTTPException(status_code=404, detail="Questions not found for this result")
            
        questions = questions_response.data
        
        # 2. Save/Update answers (Robust ID-based mapping)
        for q in questions:
            q_id = q['id']
            
            # CRITICAL FIX: Only update if the frontend sent an answer for this question
            if q_id in request.answers:
                student_ans = request.answers[q_id]
                
                # Upsert answer
                existing = supabase.table("student_answers").select("id").eq("question_id", q_id).execute()
                if existing.data:
                    supabase.table("student_answers").update({"student_answer": student_ans}).eq("question_id", q_id).execute()
                else:
                    supabase.table("student_answers").insert({"question_id": q_id, "student_answer": student_ans}).execute()
        
        # Basic intermediate update
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


@router.get("/test-session/{result_id}")
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
                "answer": q['correct_answer'],
                "student_answer": answers_map.get(q['id'], "")
            })
            
        return {"questions": session_data}
        
    except Exception as e:
        logging.error(f"Error fetching test session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-questions")
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


async def replenishment_task(subject: str, level: str):
    """Background task to check and replenish question bank"""
    try:
        # 1. Artificial Delay (Decoupling)
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
        
        result = await QuestionBankService.generate_guarded(subject, level, target_per_topic=5)
        
        if result.get("generated_count", 0) > 0:
            logging.info(f"✨ Replenished {result['generated_count']} questions for {subject}/{level}")
        else:
            logging.info(f"💤 Bank sufficient for {subject}/{level}. No generation needed.")
            
    except Exception as e:
        logging.error(f"⚠️ Replenishment error: {e}")
