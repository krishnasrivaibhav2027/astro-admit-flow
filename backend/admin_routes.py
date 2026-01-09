from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime
import os
import json
from supabase import create_client, Client
from auth_dependencies import get_current_user, security
from langchain_google_genai import ChatGoogleGenerativeAI

# Initialize Supabase client (re-use env vars)
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Redis Cache for instant loading
from redis_client import redis_manager
CACHE_TTL_SECONDS = 60  # 60 second cache - pages refresh every 5 seconds anyway

# Import models
from models import GenerateQuestionsRequest, GenerateQuestionsRequest
from question_bank_service import QuestionBankService
import ai_service
from rag_supabase import get_context





class AdminCreate(BaseModel):
    first_name: str
    last_name: str
    email: str


admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Admin Middleware ---
async def get_current_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify Token AND check if user is in admins or super_admins table.
    Returns admin info including institution_id for data isolation.
    """
    try:
        email = current_user.get('email', '')
        
        # 1. Check admins table (institutional admins)
        response = supabase.table("admins").select("*").eq("email", email).execute()
        
        if response.data:
            admin_data = response.data[0]
            # Include institution_id for data filtering
            return {
                **current_user, 
                "admin_id": admin_data['id'], 
                "role": admin_data.get('role', 'admin'),
                "institution_id": admin_data.get('institution_id'),  # Can be None for global admins
                "is_super_admin": False
            }
            
        # 2. Check super_admins table
        response_sa = supabase.table("super_admins").select("*").eq("email", email).execute()
        
        if response_sa.data:
            sa_data = response_sa.data[0]
            # Super admins have access to ALL institutions (institution_id = None)
            return {
                **current_user, 
                "admin_id": sa_data['id'], 
                "role": sa_data.get('role', 'super_admin'),
                "institution_id": None,  # None means access to all
                "is_super_admin": True
            }

        raise HTTPException(status_code=403, detail="Access denied: Admin profile not found")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# Helper function to get students filtered by institution
def get_students_query(admin: Dict):
    """Build a query for students filtered by admin's institution."""
    query = supabase.table("students").select("*")
    if admin.get("institution_id"):
        query = query.eq("institution_id", admin["institution_id"])
    return query


def get_results_for_admin(admin: Dict):
    """Get results filtered by admin's institution through students."""
    institution_id = admin.get("institution_id")
    
    if not institution_id:
        # Super admin - return all results
        return supabase.table("results").select("*").execute().data or []
    
    # Get student IDs for this institution
    students_resp = supabase.table("students").select("id").eq("institution_id", institution_id).execute()
    student_ids = [s["id"] for s in (students_resp.data or [])]
    
    if not student_ids:
        return []
    
    # Get results for these students
    results_resp = supabase.table("results").select("*").in_("student_id", student_ids).execute()
    return results_resp.data or []

# --- Models ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: str = "all"

class RoleUpdate(BaseModel):
    role: str

# --- Endpoints ---


# --- Question Bank Endpoints ---

@admin_router.post("/question-bank/generate")
async def generate_questions_bulk(request: GenerateQuestionsRequest, admin: Dict = Depends(get_current_admin)):
    """Generate questions in bulk for the Question Bank (Guarded)"""
    try:
        # Use Guarded Generation to prevent duplicates and ensure coverage
        # Now respecting request.num_questions as the max limit
        
        result = await QuestionBankService.generate_guarded(
            request.subject, 
            request.level,
            max_questions=request.num_questions
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/question-bank/extract-topics")
async def extract_topics(admin: Dict = Depends(get_current_admin)):
    """Trigger topic extraction from PDFs"""
    try:
        import topic_extractor
        import logging
        logging.info("🚀 Starting Manual Topic Extraction via Admin API...")
        stats = await topic_extractor.run_extraction()
        logging.info(f"✅ Topic Extraction Complete. Stats: {stats}")
        return {"success": True, "stats": stats}
    except Exception as e:
        import logging
        logging.error(f"❌ Topic Extraction Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/question-bank/stats")
async def get_question_bank_stats(admin: Dict = Depends(get_current_admin)):
    """Get detailed stats for Question Bank cards - DIRECT DB QUERY"""
    try:
        print("=" * 50, flush=True)
        print("[STATS] Starting fresh database query...", flush=True)
        
        stats = {}
        subjects = ["physics", "math", "chemistry"]
        levels = ["easy", "medium", "hard"]
        
        # Direct fresh query - NO CACHING
        # PAGINATION: Supabase has a hard 1000 row limit - we need to paginate
        all_data = []
        batch_size = 1000
        offset = 0
        
        print(f"[STATS] Fetching ALL questions with pagination...", flush=True)
        
        while True:
            qb_response = supabase.table("question_bank")\
                .select("id, subject, level, is_used, status")\
                .eq("status", "ACTIVE")\
                .range(offset, offset + batch_size - 1)\
                .execute()
            
            batch_data = qb_response.data or []
            all_data.extend(batch_data)
            
            print(f"[STATS] Batch {offset//batch_size + 1}: fetched {len(batch_data)} rows (total so far: {len(all_data)})", flush=True)
            
            if len(batch_data) < batch_size:
                # No more data to fetch
                break
            
            offset += batch_size
        
        print(f"[STATS] Total ACTIVE questions fetched: {len(all_data)}", flush=True)
        
        # Debug: Print actual counts from raw data
        raw_counts = {}
        for item in all_data:
            sub = (item.get('subject') or 'unknown').lower()
            lvl = (item.get('level') or 'unknown').lower()
            is_used = item.get('is_used', False)
            
            key = f"{sub}:{lvl}"
            if key not in raw_counts:
                raw_counts[key] = {"total": 0, "unused": 0, "used": 0}
            raw_counts[key]["total"] += 1
            if is_used:
                raw_counts[key]["used"] += 1
            else:
                raw_counts[key]["unused"] += 1
        
        print(f"[STATS] Raw counts from DB: {raw_counts}", flush=True)
        
        # Build stats structure
        for item in all_data:
            sub = (item.get('subject') or 'unknown').lower()
            lvl = (item.get('level') or 'unknown').lower()
            
            if sub not in stats:
                stats[sub] = {}
            if lvl not in stats[sub]:
                stats[sub][lvl] = {"unused": 0, "used": 0, "attempted": 0}
            
            if item.get('is_used'):
                stats[sub][lvl]["used"] += 1
            else:
                stats[sub][lvl]["unused"] += 1
        
        # Fill zeros for missing keys
        for sub in subjects:
            if sub not in stats:
                stats[sub] = {}
            for lvl in levels:
                if lvl not in stats[sub]:
                    stats[sub][lvl] = {"unused": 0, "used": 0, "attempted": 0}
        
        # Print final stats
        for sub in subjects:
            total_avail = sum(stats[sub][lvl]["unused"] for lvl in levels)
            print(f"[STATS] {sub.upper()}: {total_avail} available", flush=True)
            for lvl in levels:
                print(f"  - {lvl}: unused={stats[sub][lvl]['unused']}, used={stats[sub][lvl]['used']}", flush=True)
        
        print("=" * 50, flush=True)
        return stats
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[STATS ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.get("/question-bank/questions")
async def list_questions(subject: str, level: str, admin: Dict = Depends(get_current_admin)):
    """List questions in the bank (used/unused)"""
    try:
        # We need a method to list all questions for the view
        # Current service only gets unused. We need a list method.
        # Direct Supabase call here for simplicity
        response = supabase.table("question_bank")\
            .select("id, question_content, is_used, created_at")\
            .eq("subject", subject.lower())\
            .eq("level", level.lower())\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
        
        # Parse content
        data = []
        for row in response.data:
            content = row['question_content']
            data.append({
                "id": row['id'],
                "question": content.get("question"),
                "answer": content.get("answer"),
                "is_used": row['is_used'],
                "created_at": row['created_at']
            })
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/student/{student_id}")
async def get_student_details(student_id: str, admin: Dict = Depends(get_current_admin)):
    """Get specific student details"""
    try:
        response = supabase.table("students").select("*").eq("id", student_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/student/{student_id}/questions")
async def get_student_questions(student_id: str, admin: Dict = Depends(get_current_admin)):
    """Get questions assigned to a specific student with status"""
    try:
        # 1. Get results for student
        results = supabase.table("results").select("id, subject, level, created_at, score").eq("student_id", student_id).order("created_at", desc=True).execute()
        
        if not results.data:
            return []

        all_questions = []
        result_ids = [r['id'] for r in results.data]
        
        # 2. Get questions for these results
        # Note: Supabase 'in_' filter expects a list
        questions_resp = supabase.table("questions").select("*").in_("result_id", result_ids).execute()
        questions_data = questions_resp.data or []
        
        if not questions_data:
            return []

        # 3. Get answers for these questions
        question_ids = [q['id'] for q in questions_data]
        answers_resp = supabase.table("student_answers").select("question_id, student_answer").in_("question_id", question_ids).execute()
        answers_data = answers_resp.data or []
        
        # Map answers by question_id for O(1) lookup
        answers_map = {a['question_id']: a['student_answer'] for a in answers_data}
        
        # Map result details for O(1) lookup
        results_map = {r['id']: r for r in results.data}

        # 4. Compile final list with logging
        print(f"Found {len(questions_data)} questions and {len(answers_data)} answers for {student_id}")
        
        for q in questions_data:
            r = results_map.get(q['result_id'], {})
            student_answer = answers_map.get(q['id'])
            
            # Determine status
            is_attempted = q['id'] in answers_map and student_answer is not None and str(student_answer).strip() != ""
            
            all_questions.append({
                "subject": r.get('subject', 'Unknown'),
                "level": r.get('level', 'Unknown'),
                "question": q.get('question_text', ''), # Explicitly get question_text
                "answer": q.get('correct_answer', ''), # Explicitly get correct_answer
                "student_answer": student_answer,
                "status": "Attempted" if is_attempted else "Unattempted"
            })
            
        print(f"Returning {len(all_questions)} formatted questions")
        return all_questions

    except Exception as e:
        print(f"Error fetching student questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/stats/overview")
async def get_dashboard_stats(admin: Dict = Depends(get_current_admin)):
    """Get high-level dashboard stats - filtered by institution. CACHED."""
    try:
        institution_id = admin.get("institution_id") or "global"
        cache_key = f"admin:overview:{institution_id}"
        
        # Try cache first for instant loading
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        # Fetch fresh data
        inst_id = admin.get("institution_id")
        
        # 1. Total Students (filtered by institution)
        if inst_id:
            students_count = supabase.table("students").select("id", count="exact").eq("institution_id", inst_id).execute().count
        else:
            students_count = supabase.table("students").select("id", count="exact").execute().count
        
        # 2. Active Tests (results for institution's students)
        if inst_id:
            # Get student IDs for this institution
            students_resp = supabase.table("students").select("id").eq("institution_id", inst_id).execute()
            student_ids = [s["id"] for s in (students_resp.data or [])]
            if student_ids:
                active_tests_count = supabase.table("results").select("id", count="exact").in_("student_id", student_ids).execute().count
            else:
                active_tests_count = 0
        else:
            active_tests_count = supabase.table("results").select("id", count="exact").execute().count
        
        # 3. Questions in Bank (global - not institution specific)
        questions_count = supabase.table("question_bank").select("id", count="exact").execute().count
        
        # 4. Flagged Issues (placeholder for now)
        flagged_issues_count = 0
        
        result = {
            "total_students": students_count or 0,
            "active_tests": active_tests_count or 0, 
            "questions_in_bank": questions_count or 0,
            "flagged_issues": flagged_issues_count
        }
        
        # Cache the result
        redis_manager.cache_set(cache_key, result, CACHE_TTL_SECONDS)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/activity")
async def get_recent_activity(admin: Dict = Depends(get_current_admin)):
    """Get recent activity feed (registrations, messages) - Last 24 hours only, filtered by institution"""
    try:
        activities = []
        institution_id = admin.get("institution_id")
        
        # Calculate 24 hours ago
        from datetime import timedelta
        cutoff_time = (datetime.now() - timedelta(hours=24)).isoformat()
        
        # 1. New Registrations (last 24h) - filtered by institution
        students_query = supabase.table("students").select("first_name, last_name, created_at").gt("created_at", cutoff_time).order("created_at", desc=True).limit(5)
        if institution_id:
            students_query = students_query.eq("institution_id", institution_id)
        students = students_query.execute().data or []
        
        for s in students:
            activities.append({
                "type": "registration",
                "message": f"New student registration: {s['first_name']} {s['last_name']}",
                "created_at": s['created_at']
            })
            
        # 2. New Messages (last 24h) - filtered by institution's students
        messages_data = []
        if institution_id:
            # Get student IDs for this institution
            students_resp = supabase.table("students").select("id").eq("institution_id", institution_id).execute()
            student_ids = [s["id"] for s in (students_resp.data or [])]
            if student_ids:
                messages_data = supabase.table("messages").select("sender_id, content, created_at, sender_type").eq("sender_type", "student").in_("sender_id", student_ids).gt("created_at", cutoff_time).order("created_at", desc=True).limit(5).execute().data or []
        else:
            messages_data = supabase.table("messages").select("sender_id, content, created_at, sender_type").eq("sender_type", "student").gt("created_at", cutoff_time).order("created_at", desc=True).limit(5).execute().data or []
        
        # We need student names for messages.
        student_ids = list(set([m['sender_id'] for m in messages_data if m.get('sender_id')]))
        if student_ids:
            students_map_response = supabase.table("students").select("id, first_name, last_name").in_("id", student_ids).execute()
            students_map = {s['id']: f"{s['first_name']} {s['last_name']}" for s in students_map_response.data}
            
            for m in messages_data:
                student_name = students_map.get(m['sender_id'], "Unknown Student")
                activities.append({
                    "type": "message",
                    "message": f"New message from {student_name}",
                    "created_at": m['created_at']
                })
        
        # 3. Settings Updates (from admin_settings) - keep as is (global)
        try:
            settings_logs_resp = supabase.table("admin_settings").select("value").eq("key", "activity_log").execute()
            if settings_logs_resp.data:
                settings_logs = json.loads(settings_logs_resp.data[0]['value'])
                for log in settings_logs:
                    if not log.get('created_at'):
                        continue
                    if True:  # Show all settings logs
                        activities.append({
                            "type": "settings",
                            "message": "Settings changed",
                            "created_at": log.get('created_at')
                        })
        except Exception as e:
            print(f"Error fetching settings logs: {e}")

        
        # Sort combined list by created_at desc
        activities.sort(key=lambda x: x['created_at'] or '', reverse=True)
        
        return activities[:10]  # Return top 10
    except Exception as e:
        print(f"Error fetching activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@admin_router.post("/register")
async def register_admin(admin_data: AdminCreate, user: Dict = Depends(get_current_user)):
    """Register a new admin"""
    try:
        # Verify email matches token
        if user['email'] != admin_data.email:
            raise HTTPException(status_code=400, detail="Email mismatch")
            
        # Check if already exists
        existing = supabase.table("admins").select("id").eq("email", admin_data.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Admin already registered")
            
        # Create admin
        new_admin = {
            "firebase_uid": user['uid'], # Using Supabase UID for legacy column compatibility
            "email": admin_data.email,
            "first_name": admin_data.first_name,
            "last_name": admin_data.last_name,
            "role": "admin"
        }
        
        response = supabase.table("admins").insert(new_admin).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/me")
async def get_admin_profile(admin: Dict = Depends(get_current_admin)):
    """Get current admin profile"""
    try:
        table_name = "super_admins" if admin.get('role') == 'super_admin' else "admins"
        response = supabase.table(table_name).select("*").eq("id", admin['admin_id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/stats/questions")
async def get_question_stats(admin: Dict = Depends(get_current_admin)):
    """Get aggregate question performance stats grouped by level - filtered by institution. CACHED."""
    try:
        institution_id = admin.get("institution_id") or "global"
        cache_key = f"admin:question_stats:{institution_id}"
        
        # Try cache first
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        inst_id = admin.get("institution_id")
        
        # Get student IDs for this institution (for filtering)
        student_ids = None
        if inst_id:
            students_resp = supabase.table("students").select("id").eq("institution_id", inst_id).execute()
            student_ids = [s["id"] for s in (students_resp.data or [])]
            if not student_ids:
                return []  # No students in this institution
        
        # 1. Fetch results filtered by student IDs
        if student_ids:
            results_response = supabase.table("results").select("id, level, student_id").in_("student_id", student_ids).execute()
        else:
            results_response = supabase.table("results").select("id, level, student_id").execute()
        
        result_level_map = {r['id']: r['level'] for r in (results_response.data or [])}
        result_ids = list(result_level_map.keys())
        
        if not result_ids:
            return []
        
        # 2. Fetch questions for these results
        questions_response = supabase.table("questions").select("id, question_text, correct_answer, result_id").in_("result_id", result_ids).execute()
        questions = questions_response.data or []
        
        if not questions:
            return []
        
        question_ids = [q['id'] for q in questions]
        
        # 3. Fetch student answers for these questions
        answers_response = supabase.table("student_answers").select("question_id, student_answer").in_("question_id", question_ids).execute()
        answers = answers_response.data or []
        
        # 4. Aggregate stats
        stats_map = {}
        
        for q in questions:
            level = result_level_map.get(q['result_id'], 'Unknown')
            stats_map[q['id']] = {
                "question_id": q['id'],
                "question_text": q['question_text'],
                "level": level,
                "attempt_count": 0,
                "correct_count": 0,
                "correct_percentage": 0.0
            }
            
        for ans in answers:
            q_id = ans['question_id']
            if q_id in stats_map:
                stats_map[q_id]['attempt_count'] += 1
                correct_answer = next((q['correct_answer'] for q in questions if q['id'] == q_id), None)
                if correct_answer:
                    student_ans_norm = str(ans['student_answer']).strip().lower()
                    correct_ans_norm = str(correct_answer).strip().lower()
                    if student_ans_norm == correct_ans_norm:
                        stats_map[q_id]['correct_count'] += 1
        
        results = []
        for q_id, stat in stats_map.items():
            if stat['attempt_count'] > 0:
                stat['correct_percentage'] = (stat['correct_count'] / stat['attempt_count']) * 100
            results.append(stat)
        
        # Cache result
        redis_manager.cache_set(cache_key, results, CACHE_TTL_SECONDS)
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.get("/stats/levels")
async def get_level_stats(admin: Dict = Depends(get_current_admin)):
    """Get average score stats grouped by level - filtered by institution"""
    try:
        institution_id = admin.get("institution_id")
        
        # Fetch results filtered by institution's students
        if institution_id:
            students_resp = supabase.table("students").select("id").eq("institution_id", institution_id).execute()
            student_ids = [s["id"] for s in (students_resp.data or [])]
            if not student_ids:
                return []
            results_resp = supabase.table("results").select("level, score").in_("student_id", student_ids).not_.is_("score", "null").execute()
        else:
            results_resp = supabase.table("results").select("level, score").not_.is_("score", "null").execute()
        
        results = results_resp.data or []
        
        # Aggregate stats
        level_stats = {}
        
        for r in results:
            raw_level = str(r.get('level', 'Unknown'))
            level = raw_level.strip().title()
            
            if level not in level_stats:
                level_stats[level] = {"total_score": 0, "count": 0}
            
            try:
                score = float(r['score'])
                level_stats[level]["total_score"] += score
                level_stats[level]["count"] += 1
            except (ValueError, TypeError):
                continue
        
        final_stats = []
        for level, data in level_stats.items():
            avg_score = (data["total_score"] / data["count"]) if data["count"] > 0 else 0
            final_stats.append({
                "level": level,
                "average_score": round(avg_score, 1),
                "attempt_count": data["count"]
            })
            
        return final_stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/monitoring/live")
async def get_live_monitoring(admin: Dict = Depends(get_current_admin)):
    """Get active test sessions with multi-subject progress - filtered by institution. CACHED."""
    try:
        inst_id = admin.get("institution_id") or "global"
        cache_key = f"admin:live_monitoring:{inst_id}"
        
        # Try cache first
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        institution_id = admin.get("institution_id")
        
        # Define all subjects
        SUBJECTS = ['math', 'physics', 'chemistry']
        LEVELS = ['easy', 'medium', 'hard']
        
        # Fetch students filtered by institution
        query = supabase.table("students").select("id, first_name, last_name, email, last_active_at, logout_time").order("last_active_at", desc=True).limit(50)
        if institution_id:
            query = query.eq("institution_id", institution_id)
        response = query.execute()
        students = response.data or []
        
        monitoring_data = []
        seen_emails = set()
        
        for student in students:
            email = student.get('email')
            if email in seen_emails:
                continue
            seen_emails.add(email)
            
            # Determine online status
            last_active = datetime.fromisoformat(student['last_active_at'].replace('Z', '+00:00')) if student['last_active_at'] else None
            logout_time = datetime.fromisoformat(student['logout_time'].replace('Z', '+00:00')) if student['logout_time'] else None
            
            is_active = False
            if last_active:
                if logout_time and logout_time > last_active:
                    is_active = False
                else:
                    time_diff = (datetime.now(last_active.tzinfo) - last_active).total_seconds()
                    if time_diff < 300:  # 5 minutes
                        is_active = True
            
            # Fetch all results for this student (include subject field)
            results_response = supabase.table("results").select("subject, level, result, score, created_at").eq("student_id", student['id']).order("created_at", desc=True).execute()
            student_results = results_response.data or []
            
            # Build per-subject status matrix
            subjects_status = {}
            for subj in SUBJECTS:
                subjects_status[subj] = {
                    "easy": "locked",
                    "medium": "locked",
                    "hard": "locked"
                }
                # Default: Easy is always unlocked (pending) for first subject
                if subj == 'math':
                    subjects_status[subj]["easy"] = "pending"
            
            # Track current activity (most recent in_progress/pending result)
            current_activity = None
            completed_count = 0
            
            # Process results to update status
            for res in student_results:
                subj = (res.get('subject') or 'physics').lower()
                if subj not in SUBJECTS:
                    subj = 'physics'  # Default fallback
                lvl = res['level'].lower()
                status = res['result']  # pass, fail, pending, in_progress
                
                if status == 'pass':
                    subjects_status[subj][lvl] = 'completed'
                    completed_count += 1
                elif status == 'fail':
                    subjects_status[subj][lvl] = 'failed'
                elif status in ['pending', 'in_progress']:
                    subjects_status[subj][lvl] = 'in_progress'
                    if not current_activity:
                        current_activity = f"{subj.title()} - {lvl.title()} Level"
            
            # Apply unlock logic for each subject
            for subj in SUBJECTS:
                # Unlock medium if easy is passed
                if subjects_status[subj]['easy'] == 'completed':
                    if subjects_status[subj]['medium'] == 'locked':
                        subjects_status[subj]['medium'] = 'pending'
                
                # Unlock hard if medium is passed
                if subjects_status[subj]['medium'] == 'completed':
                    if subjects_status[subj]['hard'] == 'locked':
                        subjects_status[subj]['hard'] = 'pending'
            
            # Apply subject unlock logic (physics unlocks after math, chemistry after physics)
            def check_subject_completion(subj_name):
                """Check if subject is effectively done (medium passed + hard attempted/passed)"""
                s = subjects_status[subj_name]
                medium_passed = s['medium'] == 'completed'
                hard_done = s['hard'] in ['completed', 'failed']
                return medium_passed and hard_done
            
            # Unlock Physics if Math is completed
            if check_subject_completion('math'):
                if subjects_status['physics']['easy'] == 'locked':
                    subjects_status['physics']['easy'] = 'pending'
            
            # Unlock Chemistry if Physics is completed  
            if check_subject_completion('physics'):
                if subjects_status['chemistry']['easy'] == 'locked':
                    subjects_status['chemistry']['easy'] = 'pending'
            
            # Calculate overall progress
            overall_progress = {
                "completed": completed_count,
                "total": 9  # 3 subjects * 3 levels
            }

            monitoring_data.append({
                "id": student['id'],
                "student_id": student['id'],
                "students": {
                    "first_name": student['first_name'],
                    "last_name": student['last_name'],
                    "email": student['email']
                },
                "subjects_status": subjects_status,
                "current_activity": current_activity,
                "overall_progress": overall_progress,
                # Keep legacy field for backward compatibility
                "levels_status": subjects_status.get('math', {}),
                "status": "active" if is_active else "inactive",
                "last_active_at": student['last_active_at'],
                "logout_time": student['logout_time']
            })
        
        # Cache result
        redis_manager.cache_set(cache_key, monitoring_data, CACHE_TTL_SECONDS)
            
        return monitoring_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/users")
async def list_users(admin: Dict = Depends(get_current_admin)):
    """List all users - filtered by institution. CACHED."""
    try:
        inst_id = admin.get("institution_id") or "global"
        cache_key = f"admin:students:{inst_id}"
        
        # Try cache first
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        institution_id = admin.get("institution_id")
        query = supabase.table("students").select("*").order("created_at", desc=True)
        if institution_id:
            query = query.eq("institution_id", institution_id)
        response = query.execute()
        result = response.data or []
        
        # Cache result
        redis_manager.cache_set(cache_key, result, CACHE_TTL_SECONDS)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role_update: RoleUpdate, admin: Dict = Depends(get_current_admin)):
    """Update user role"""
    try:
        response = supabase.table("students").update({"role": role_update.role}).eq("id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/announcements")
async def list_announcements(admin: Dict = Depends(get_current_admin)):
    """List announcements"""
    try:
        response = supabase.table("announcements").select("*").eq("created_by", admin['admin_id']).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/announcements")
async def create_announcement(announcement: AnnouncementCreate, admin: Dict = Depends(get_current_admin)):
    """Create announcement"""
    try:
        # Get admin user id
        data = announcement.dict()
        # TODO: Uncomment this after running fix_announcements_fk.sql to fix foreign key constraint
        data['created_by'] = admin['admin_id']
            
        response = supabase.table("announcements").insert(data).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/reports/comprehensive")
async def get_comprehensive_reports(admin: Dict = Depends(get_current_admin)):
    """Get comprehensive report data for the dashboard - filtered by institution. CACHED."""
    try:
        inst_id = admin.get("institution_id") or "global"
        cache_key = f"admin:reports:{inst_id}"
        
        # Try cache first
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        institution_id = admin.get("institution_id")
        
        # Get student IDs for this institution (for filtering)
        student_ids = None
        all_students_map = {}
        if institution_id:
            students_resp = supabase.table("students").select("id, first_name, last_name, email, last_active_at, created_at").eq("institution_id", institution_id).execute()
            students_data = students_resp.data or []
            student_ids = [s["id"] for s in students_data]
            all_students_map = {s['id']: s for s in students_data}
        else:
            students_resp = supabase.table("students").select("id, first_name, last_name, email, last_active_at, created_at").execute()
            students_data = students_resp.data or []
            all_students_map = {s['id']: s for s in students_data}
        
        # 1. Performance Trends (Daily Average Scores)
        performance_trends = []
        try:
            if student_ids is not None:
                if not student_ids:
                    results = []
                else:
                    results_resp = supabase.table("results").select("score, created_at, student_id").in_("student_id", student_ids).not_.is_("score", "null").order("created_at").execute()
                    results = results_resp.data or []
            else:
                results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at").execute()
                results = results_resp.data or []
            
            daily_scores = {}
            for r in results:
                if not r.get('created_at'):
                    continue
                try:
                    date_str = r['created_at'].split('T')[0]
                    if date_str not in daily_scores:
                        daily_scores[date_str] = {"total": 0, "count": 0}
                    daily_scores[date_str]["total"] += float(r['score'])
                    daily_scores[date_str]["count"] += 1
                except Exception:
                    continue
                    
            performance_trends = [
                {"date": date, "average_score": round(data["total"] / data["count"], 1)}
                for date, data in daily_scores.items()
            ]
            performance_trends.sort(key=lambda x: x['date'])
        except Exception as e:
            print(f"Error calculating performance trends: {e}")

        # 2. Student Engagement (Active vs Total) - filtered by institution
        engagement_stats = {"total_students": 0, "active_last_7_days": 0, "inactive_count": 0}
        try:
            from datetime import timedelta
            seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
            
            students = students_data  # Use already fetched data
            total_students = len(students)
            active_count = sum(1 for s in students if s.get('last_active_at') and s['last_active_at'] > seven_days_ago)
            
            engagement_stats = {
                "total_students": total_students,
                "active_last_7_days": active_count,
                "inactive_count": total_students - active_count
            }
        except Exception as e:
            print(f"Error calculating engagement stats: {e}")

        # 3. Question Difficulty (High Failure Rate) - filtered by institution's students
        difficult_questions = []
        try:
            # Get result IDs for this institution's students
            if student_ids is not None:
                if not student_ids:
                    answers_data = []
                    questions_data = []
                else:
                    results_resp = supabase.table("results").select("id").in_("student_id", student_ids).execute()
                    result_ids = [r["id"] for r in (results_resp.data or [])]
                    if result_ids:
                        questions_resp = supabase.table("questions").select("id, question_text, correct_answer, result_id").in_("result_id", result_ids).execute()
                        questions_data = questions_resp.data or []
                        question_ids = [q['id'] for q in questions_data]
                        if question_ids:
                            answers_resp = supabase.table("student_answers").select("question_id, student_answer").in_("question_id", question_ids).execute()
                            answers_data = answers_resp.data or []
                        else:
                            answers_data = []
                    else:
                        answers_data = []
                        questions_data = []
            else:
                answers_resp = supabase.table("student_answers").select("question_id, student_answer").execute()
                questions_resp = supabase.table("questions").select("id, question_text, correct_answer").execute()
                answers_data = answers_resp.data or []
                questions_data = questions_resp.data or []
            
            questions_map = {q['id']: q for q in questions_data}
            question_stats = {}
            
            for ans in answers_data:
                q_id = ans.get('question_id')
                if not q_id or q_id not in questions_map:
                    continue
                if q_id not in question_stats:
                    question_stats[q_id] = {"attempts": 0, "correct": 0, "text": questions_map[q_id]['question_text']}
                question_stats[q_id]["attempts"] += 1
                correct_answer = questions_map[q_id]['correct_answer']
                if str(ans.get('student_answer', '')).strip().lower() == str(correct_answer).strip().lower():
                    question_stats[q_id]["correct"] += 1
            
            for q_id, stats in question_stats.items():
                if stats['attempts'] > 2:
                    correct_rate = (stats['correct'] / stats['attempts']) * 100
                    if correct_rate < 40:
                        difficult_questions.append({
                            "question_text": stats['text'],
                            "correct_rate": round(correct_rate, 1),
                            "attempts": stats['attempts']
                        })
            difficult_questions.sort(key=lambda x: x['correct_rate'])
        except Exception as e:
            print(f"Error calculating difficult questions: {e}")

        # 4. Stuck Students - filtered by institution
        stuck_students = []
        try:
            if student_ids is not None:
                if not student_ids:
                    all_results = []
                else:
                    all_results_resp = supabase.table("results").select("student_id, level, result, created_at").in_("student_id", student_ids).order("created_at", desc=True).execute()
                    all_results = all_results_resp.data or []
            else:
                all_results_resp = supabase.table("results").select("student_id, level, result, created_at").order("created_at", desc=True).execute()
                all_results = all_results_resp.data or []
            
            student_results_map = {}
            for r in all_results:
                s_id = r.get('student_id')
                if not s_id: continue
                if s_id not in student_results_map:
                    student_results_map[s_id] = []
                student_results_map[s_id].append(r)
            
            for s_id, results in student_results_map.items():
                if not results: continue
                current_level = results[0].get('level')
                if not current_level: continue
                
                fail_count = 0
                for r in results:
                    if r.get('level') == current_level and r.get('result') == 'fail':
                        fail_count += 1
                    else:
                        break
                
                if fail_count > 1:
                    student = all_students_map.get(s_id)
                    if student:
                        stuck_students.append({
                            "id": s_id,
                            "name": f"{student['first_name']} {student['last_name']}",
                            "reason": f"Stuck on {current_level}",
                            "value": f"{fail_count} Failures"
                        })
        except Exception as e:
            print(f"Error calculating stuck students: {e}")

        result = {
            "performance_trends": performance_trends,
            "engagement_stats": engagement_stats,
            "difficult_questions": difficult_questions[:5],
            "stuck_students": stuck_students[:10]
        }
        
        # Cache result
        redis_manager.cache_set(cache_key, result, CACHE_TTL_SECONDS)
        
        return result

    except Exception as e:
        print(f"Error generating reports: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/reports/generate-detailed")
async def generate_detailed_report(admin: Dict = Depends(get_current_admin)):
    """Generate a detailed AI report for stuck students"""
    try:
        print("Starting detailed report generation...", flush=True)
        
        # 1. Fetch Comprehensive Data (Reuse logic from get_comprehensive_reports)
        # A. Performance Trends
        performance_trends = []
        try:
            results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at", desc=True).execute()
            results = results_resp.data or []
            daily_scores = {}
            for r in results:
                if not r.get('created_at'): continue
                date_str = r['created_at'].split('T')[0]
                if date_str not in daily_scores: daily_scores[date_str] = {"total": 0, "count": 0}
                daily_scores[date_str]["total"] += float(r['score'])
                daily_scores[date_str]["count"] += 1
            performance_trends = [{"date": d, "average_score": round(v["total"] / v["count"], 1)} for d, v in daily_scores.items()]
            performance_trends.sort(key=lambda x: x['date'])
        except Exception: pass

        # B. Engagement
        engagement_stats = {}
        try:
            students_resp = supabase.table("students").select("last_active_at").execute()
            students = students_resp.data or []
            total = len(students)
            from datetime import timedelta
            seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
            active = sum(1 for s in students if s.get('last_active_at') and s['last_active_at'] > seven_days_ago)
            engagement_stats = {"total_students": total, "active_last_7_days": active, "inactive": total - active}
        except Exception: pass

        # C. Difficult Questions
        difficult_questions = []
        try:
            answers_resp = supabase.table("student_answers").select("question_id, student_answer").execute()
            questions_resp = supabase.table("questions").select("id, question_text, correct_answer").execute()
            answers_data = answers_resp.data or []
            questions_data = questions_resp.data or []
            q_map = {q['id']: q for q in questions_data}
            q_stats = {}
            for ans in answers_data:
                q_id = ans.get('question_id')
                if not q_id or q_id not in q_map: continue
                if q_id not in q_stats: q_stats[q_id] = {"attempts": 0, "correct": 0, "text": q_map[q_id]['question_text']}
                q_stats[q_id]["attempts"] += 1
                if str(ans.get('student_answer', '')).strip().lower() == str(q_map[q_id]['correct_answer']).strip().lower():
                    q_stats[q_id]["correct"] += 1
            
            for stats in q_stats.values():
                if stats['attempts'] > 2:
                    rate = (stats['correct'] / stats['attempts']) * 100
                    if rate < 40: difficult_questions.append({"text": stats['text'], "rate": round(rate, 1), "attempts": stats['attempts']})
        except Exception: pass

        # D. Stuck Students (Existing Logic)
        stuck_students_data = []
        try:
            all_results_resp = supabase.table("results").select("student_id, level, result, created_at, id").order("created_at", desc=True).execute()
            all_results = all_results_resp.data or []
            student_results_map = {}
            for r in all_results:
                if r.get('student_id'): 
                    student_results_map.setdefault(r['student_id'], []).append(r)
            
            all_students_resp = supabase.table("students").select("id, first_name, last_name").execute()
            all_students_map = {s['id']: s for s in all_students_resp.data or []}
            
            for s_id, results in student_results_map.items():
                if not results: continue
                current_level = results[0].get('level')
                if not current_level: continue
                fail_count = 0
                failed_result_ids = []
                for r in results:
                    if r.get('level') == current_level and r.get('result') == 'fail':
                        fail_count += 1
                        failed_result_ids.append(r['id'])
                    else: break
                
                if fail_count > 1:
                    student = all_students_map.get(s_id)
                    if student:
                        stuck_students_data.append({
                            "name": f"{student['first_name']} {student['last_name']}",
                            "level": current_level,
                            "fail_count": fail_count,
                            "result_ids": failed_result_ids
                        })
        except Exception: pass

        # 2. Build Context for AI
        context_str = f"""
        Data Summary:
        - Performance Trends (Date: Avg Score): {performance_trends[-5:] if performance_trends else 'No data'}
        - Engagement: {engagement_stats}
        - Difficult Questions (Low Pass Rate): {difficult_questions[:3]}
        - Stuck Students Count: {len(stuck_students_data)}
        """
        
        # Add Stuck Students Details
        if stuck_students_data:
            context_str += "\n\nStuck Students Details:\n"
            for student in stuck_students_data[:5]:
                context_str += f"\nStudent: {student['name']} (Stuck on {student['level']} - {student['fail_count']} failures)\n"
                # Fetch questions/answers for context
                try:
                    for r_id in student['result_ids'][:2]:
                        q_resp = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", r_id).execute()
                        qs = q_resp.data or []
                        if not qs: continue
                        q_ids = [q['id'] for q in qs]
                        a_resp = supabase.table("student_answers").select("question_id, student_answer").in_("question_id", q_ids).execute()
                        a_map = {a['question_id']: a['student_answer'] for a in a_resp.data or []}
                        
                        for q in qs:
                            ans = a_map.get(q['id'])
                            if ans and str(ans).strip().lower() != str(q['correct_answer']).strip().lower():
                                context_str += f"  - Failed Q: {q['question_text']}\n    Student Ans: {ans}\n    Correct: {q['correct_answer']}\n"
                except Exception: pass

        print(f"DEBUG CONTEXT SENT TO AI:\n{context_str}", flush=True)

        # 3. Generate AI Report
        # 3. Generate AI Report
        from ai_service import get_llm
        llm = get_llm()
        
        prompt = f"""You are an expert educational data analyst for a physics learning platform.
        Analyze the following data and generate a comprehensive "Executive Summary" report for the administrator.
        
        DATA PROVIDED:
        {context_str}
        
        CRITICAL INSTRUCTIONS:
        You MUST generate a report with ALL 4 of the following sections. Do not skip any section.
        Even if the data is brief (e.g., "No data"), you must still create the section and state that.
        
        # Executive Summary
        [Brief overview of the platform's health based on the data below]
        
        ## 1. Performance Analysis
        [Analyze the trends from 'Performance Trends'. Are scores improving? Stagnating? If 'No data', state "No performance data available yet."]
        
        ## 2. Student Engagement
        [Analyze 'Engagement'. Comment on active vs inactive students. Suggest actions if engagement is low.]
        
        ## 3. Curriculum Health (Difficult Topics)
        [Analyze 'Difficult Questions'. What topics are students struggling with? Suggest curriculum improvements. If no difficult questions, state "No significant curriculum issues detected."]
        
        ## 4. At-Risk Students (Stuck)
        [Analyze 'Stuck Students Details'. Identify common patterns in their failures. Provide actionable advice.]
        
        **Important Formatting Rules:**
        - Use clean Markdown.
        - Do NOT use excessive bolding (asterisks) for normal text. Only use bold for headers or key terms.
        - Do NOT include raw JSON or data dumps.
        - Be professional, encouraging, and actionable.
        """
        
        response = llm.invoke(prompt)
        return {"report": response.content}

    except Exception as e:
        print(f"Error generating detailed report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
