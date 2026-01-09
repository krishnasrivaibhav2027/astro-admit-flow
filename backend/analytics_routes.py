from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from supabase import create_client, Client
import os
import logging
from auth_dependencies import get_current_user

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

analytics_router = APIRouter(prefix="/api/super-admin", tags=["super-admin-analytics"])

class ReportRequest(BaseModel):
    institution_id: Optional[str] = None
    report_type: str = "general" # general, performance, engagement

from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from utils_llm import get_llm
from langchain_core.messages import HumanMessage

async def fetch_detailed_stats(institution_id: Optional[str] = None):
    """
    Core analytics engine. Fetches stats for a specific institution OR globally if ID is None.
    """
    now = datetime.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)
    
    # 1. Fetch Students
    query = supabase.table("students").select("id, created_at, last_active_at")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    
    students_res = query.execute()
    students = students_res.data or []
    
    student_ids = [s['id'] for s in students]
    total_students = len(students)
    
    # Analysis: Growth & Engagement
    new_students_this_month = sum(1 for s in students if s.get('created_at') and datetime.fromisoformat(s['created_at'].replace('Z', '+00:00')) >= start_of_month.replace(tzinfo=datetime.fromisoformat(s['created_at'].replace('Z', '+00:00')).tzinfo))
    
    active_students = 0
    for s in students:
        if s.get('last_active_at'):
            try:
                last_active = datetime.fromisoformat(s['last_active_at'].replace('Z', '+00:00'))
                if last_active.tzinfo is None:
                    last_active = last_active.replace(tzinfo=None)
                
                if last_active >= thirty_days_ago.replace(tzinfo=last_active.tzinfo):
                    active_students += 1
            except:
                pass
    
    # 2. Results & Subject Analysis
    passed_count = 0
    failed_count = 0
    passed_count = 0
    failed_count = 0
    assessments_this_month = 0
    subject_stats = {} 
    
    if student_ids:
            # For massive datasets, fetching all results is bad. But for now (thousands), it's okay.
            # We simply fetch results for these students.
            # If global, student_ids is ALL students.
            
            # optimization: if more than 1000 IDs, supabase `in_` might fail. 
            # ideally we just filter results by institution via join, but supabase-py is strictly REST.
            # For Global, we can just fetch ALL results directly without `in_`.
            
            r_query = supabase.table("results").select("result, subject, created_at")
            if institution_id:
                # Chunking might be needed here in production
                r_query = r_query.in_("student_id", student_ids)
            
            # If global, we fetch all results. 
            results_res = r_query.execute()
            results = results_res.data or []
            
            for r in results:
                # DB uses 'result' column with 'pass'/'fail' strings
                is_passed = (r.get('result') == 'pass')
                subj = r.get('subject', 'General')
                created_at = r.get('created_at')
                
                if is_passed:
                    passed_count += 1
                else:
                    failed_count += 1
                    
                # total_questions_attempted removed as column does not exist
                
                if created_at:
                    try:
                        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if dt >= start_of_month.replace(tzinfo=dt.tzinfo):
                            assessments_this_month += 1
                    except:
                        pass

                if subj not in subject_stats:
                    subject_stats[subj] = {"total": 0, "passed": 0}
                subject_stats[subj]["total"] += 1
                if is_passed:
                    subject_stats[subj]["passed"] += 1

    total_assessments = passed_count + failed_count
    overall_pass_rate = (passed_count / total_assessments * 100) if total_assessments > 0 else 0
    
    subject_breakdown = []
    for subj, counts in subject_stats.items():
        rate = (counts['passed'] / counts['total'] * 100) if counts['total'] > 0 else 0
        subject_breakdown.append({
            "subject": subj,
            "assessments": counts['total'],
            "pass_rate": round(rate, 1)
        })

    return {
        "institution_id": institution_id or "global",
        "period": "All Time",
        "overview": {
            "total_students": total_students,
            "active_students_30d": active_students,
            "new_students_this_month": new_students_this_month,
            "total_assessments": total_assessments,
            "assessments_this_month": assessments_this_month,
            "overall_pass_rate": round(overall_pass_rate, 1)
        },
        "subject_performance": subject_breakdown
    }

@analytics_router.get("/institution/{institution_id}/stats")
async def get_institution_stats(institution_id: str, current_user: Dict = Depends(get_current_user)):
    """
    Get detailed statistics: Student Growth, Engagement (Active Users), and Subject Proficiency.
    """
    try:
        return await fetch_detailed_stats(institution_id)
    except Exception as e:
        import traceback
        logging.error(f"Error fetching stats: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.post("/reports/generate")
async def generate_report(request: ReportRequest, current_user: Dict = Depends(get_current_user)):
    """
    Generate a Strategic AI Analytics Report using gemini-2.5-flash.
    """
    try:
        stats = {}
        target_name = "Global Platform"
        
        # Always fetch detailed stats, either for specific institution or global
        stats = await fetch_detailed_stats(request.institution_id)
        
        if request.institution_id:
            inst_res = supabase.table("institutions").select("name").eq("id", request.institution_id).execute()
            if inst_res.data:
                target_name = inst_res.data[0]['name']
        else:
            target_name = "Global Platform (All Institutions)"

        # Construct Enhanced Prompt
        prompt_text = f"""
        **Role**: You are a Senior Educational Strategist and Data Scientist for broad-scale EdTech implementations.
        **Task**: Generate a Data-Driven Executive Performance Review for the institution: "{target_name}".
        
        **Input Data Snapshot**:
        {stats}
        
        **Report Structure & Requirements**:
        (Format as clean PLAIN TEXT. Do NOT use markdown symbols like **, ##, or tables. Use Uppercase for headers and indentation for nesting.)

        1.  EXECUTIVE SUMMARY
            A high-level narrative on the institution's health (Growing/Stagnant, High Performing/Struggling). Use the 'Active Students' and 'Pas Rate' metrics to define this.
        
        2.  ENROLLMENT & ENGAGEMENT VECTORS
            - Analyze the "Active Student" ratio (Active vs Total).
            - Comment on "New Students this Month" as a growth indicator.
            
        3.  ACADEMIC PROFICIENCY DEEP DIVE (SUBJECT-WISE)
            - Analyze the `subject_performance` list.
            - Identify the STAR SUBJECT (Highest Pass Rate) and commend it.
            - Identify the CRITICAL FOCUS AREA (Lowest Pass Rate) and warn about it.
            
        4.  STRATEGIC RECOMMENDATIONS
            - Provide 3 specific, actionable steps based on the data. 
            - Example: "If Physics is low, suggest remedial workshops."
            - Example: "If engagement is low, suggest gamification."
            
        5.  FUTURE OUTLOOK
            A brief prediction validation.

        **Tone**: Professional, authoritative, yet constructive. Format strictly as a TXT file with clean parsing.
        """
        
        # Initialize LLM with strict model requirement
        llm = get_llm(override_model="gemini-2.5-flash")
        
        logging.info("🧠 Generating Advanced AI Report...")
        response = llm.invoke([HumanMessage(content=prompt_text)])
        report_content = response.content
        
        return {
            "report_content": report_content,
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        logging.error(f"Error generating report: {e}")
        fallback_report = f"ANALYTICS REPORT (FALLBACK)\n\nSystem Error: {str(e)}"
        return { "report_content": fallback_report, "generated_at": datetime.now().isoformat() }


# ==================== ENHANCED ANALYTICS ENDPOINTS ====================

@analytics_router.get("/analytics/learning-velocity")
async def get_learning_velocity(
    institution_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Calculate learning velocity: score improvement rate over time.
    Returns weekly average scores and velocity trends.
    """
    try:
        now = datetime.now()
        ninety_days_ago = now - timedelta(days=90)
        
        # Fetch results with scores
        query = supabase.table("results").select(
            "student_id, score, created_at, subject"
        ).gte("created_at", ninety_days_ago.isoformat())
        
        if institution_id:
            # Get student IDs for this institution
            students_res = supabase.table("students").select("id").eq("institution_id", institution_id).execute()
            student_ids = [s['id'] for s in (students_res.data or [])]
            if student_ids:
                query = query.in_("student_id", student_ids[:500])  # Limit for performance
        
        results_res = query.execute()
        results = results_res.data or []
        
        # Group by week
        weekly_data = {}
        for r in results:
            if r.get('created_at') and r.get('score') is not None:
                try:
                    dt = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                    week_key = dt.strftime("%Y-W%W")
                    
                    if week_key not in weekly_data:
                        weekly_data[week_key] = {"total_score": 0, "count": 0}
                    
                    weekly_data[week_key]["total_score"] += r['score']
                    weekly_data[week_key]["count"] += 1
                except:
                    pass
        
        # Calculate weekly averages and velocity
        weekly_scores = []
        sorted_weeks = sorted(weekly_data.keys())
        prev_avg = None
        
        for week in sorted_weeks:
            avg = weekly_data[week]["total_score"] / weekly_data[week]["count"]
            velocity = 0.0
            if prev_avg is not None:
                velocity = round(avg - prev_avg, 2)
            
            weekly_scores.append({
                "week": week,
                "average_score": round(avg, 1),
                "test_count": weekly_data[week]["count"],
                "velocity": velocity
            })
            prev_avg = avg
        
        # Calculate overall velocity trend
        if len(weekly_scores) >= 2:
            first_half_avg = sum(w["average_score"] for w in weekly_scores[:len(weekly_scores)//2]) / (len(weekly_scores)//2)
            second_half_avg = sum(w["average_score"] for w in weekly_scores[len(weekly_scores)//2:]) / (len(weekly_scores) - len(weekly_scores)//2)
            overall_trend = "improving" if second_half_avg > first_half_avg else "declining" if second_half_avg < first_half_avg else "stable"
        else:
            overall_trend = "insufficient_data"
        
        return {
            "weekly_scores": weekly_scores[-12:],  # Last 12 weeks
            "overall_trend": overall_trend,
            "total_tests_analyzed": len(results)
        }
        
    except Exception as e:
        logging.error(f"Error fetching learning velocity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@analytics_router.get("/analytics/retention-rate")
async def get_retention_rate(
    institution_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Calculate student retention rates for 7-day, 14-day, and 30-day windows.
    """
    try:
        now = datetime.now()
        
        # Fetch students with activity timestamps
        query = supabase.table("students").select("id, created_at, last_active_at")
        if institution_id:
            query = query.eq("institution_id", institution_id)
        
        students_res = query.execute()
        students = students_res.data or []
        
        total_students = len(students)
        if total_students == 0:
            return {
                "retention_7d": 0,
                "retention_14d": 0,
                "retention_30d": 0,
                "total_students": 0,
                "active_7d": 0,
                "active_14d": 0,
                "active_30d": 0
            }
        
        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)
        thirty_days_ago = now - timedelta(days=30)
        
        active_7d = 0
        active_14d = 0
        active_30d = 0
        
        for s in students:
            if s.get('last_active_at'):
                try:
                    last_active = datetime.fromisoformat(s['last_active_at'].replace('Z', '+00:00'))
                    last_active_naive = last_active.replace(tzinfo=None)
                    
                    if last_active_naive >= seven_days_ago.replace(tzinfo=None):
                        active_7d += 1
                    if last_active_naive >= fourteen_days_ago.replace(tzinfo=None):
                        active_14d += 1
                    if last_active_naive >= thirty_days_ago.replace(tzinfo=None):
                        active_30d += 1
                except:
                    pass
        
        return {
            "retention_7d": round((active_7d / total_students) * 100, 1),
            "retention_14d": round((active_14d / total_students) * 100, 1),
            "retention_30d": round((active_30d / total_students) * 100, 1),
            "total_students": total_students,
            "active_7d": active_7d,
            "active_14d": active_14d,
            "active_30d": active_30d
        }
        
    except Exception as e:
        logging.error(f"Error fetching retention rate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@analytics_router.get("/analytics/completion-funnel")
async def get_completion_funnel(
    institution_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get completion funnel: Enrolled -> Started Test -> Completed -> Passed
    """
    try:
        # Count total students (Enrolled)
        students_query = supabase.table("students").select("id", count="exact")
        if institution_id:
            students_query = students_query.eq("institution_id", institution_id)
        
        students_res = students_query.execute()
        total_enrolled = students_res.count or len(students_res.data or [])
        
        # Get student IDs for filtering results
        student_ids = [s['id'] for s in (students_res.data or [])]
        
        if not student_ids:
            return {
                "funnel": [
                    {"stage": "Enrolled", "count": 0, "percentage": 100},
                    {"stage": "Started Test", "count": 0, "percentage": 0},
                    {"stage": "Completed", "count": 0, "percentage": 0},
                    {"stage": "Passed", "count": 0, "percentage": 0}
                ]
            }
        
        # Count students who started at least one test
        results_query = supabase.table("results").select("student_id, result")
        if institution_id:
            results_query = results_query.in_("student_id", student_ids[:500])
        
        results_res = results_query.execute()
        results = results_res.data or []
        
        # Unique students who have results = started and completed tests
        students_with_results = set(r['student_id'] for r in results)
        started_count = len(students_with_results)
        
        # All results are completed (since they're in results table)
        completed_count = started_count
        
        # Count students who passed at least one test
        students_passed = set(r['student_id'] for r in results if r.get('result') == 'pass')
        passed_count = len(students_passed)
        
        base = total_enrolled if total_enrolled > 0 else 1
        
        return {
            "funnel": [
                {"stage": "Enrolled", "count": total_enrolled, "percentage": 100},
                {"stage": "Started Test", "count": started_count, "percentage": round((started_count / base) * 100, 1)},
                {"stage": "Completed", "count": completed_count, "percentage": round((completed_count / base) * 100, 1)},
                {"stage": "Passed", "count": passed_count, "percentage": round((passed_count / base) * 100, 1)}
            ]
        }
        
    except Exception as e:
        logging.error(f"Error fetching completion funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@analytics_router.get("/analytics/activity-calendar")
async def get_activity_calendar(
    institution_id: Optional[str] = None,
    days: int = 90,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get daily activity data for GitHub-style activity calendar/heatmap.
    Returns test count per day for the last N days.
    """
    try:
        now = datetime.now()
        start_date = now - timedelta(days=days)
        
        # Get student IDs if institution-specific
        student_ids = None
        if institution_id:
            students_res = supabase.table("students").select("id").eq("institution_id", institution_id).execute()
            student_ids = [s['id'] for s in (students_res.data or [])]
            if not student_ids:
                # Return empty calendar
                calendar_data = []
                for i in range(days):
                    date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                    calendar_data.append({"date": date, "count": 0})
                return {"calendar": calendar_data, "max_count": 0}
        
        # Fetch results in date range
        query = supabase.table("results").select("created_at").gte("created_at", start_date.isoformat())
        if student_ids:
            query = query.in_("student_id", student_ids[:500])
        
        results_res = query.execute()
        results = results_res.data or []
        
        # Count per day
        daily_counts = {}
        for r in results:
            if r.get('created_at'):
                try:
                    dt = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                    day_key = dt.strftime("%Y-%m-%d")
                    daily_counts[day_key] = daily_counts.get(day_key, 0) + 1
                except:
                    pass
        
        # Build calendar array with all days
        calendar_data = []
        max_count = 0
        for i in range(days):
            date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            count = daily_counts.get(date, 0)
            max_count = max(max_count, count)
            calendar_data.append({"date": date, "count": count})
        
        return {
            "calendar": calendar_data,
            "max_count": max_count,
            "total_tests": len(results)
        }
        
    except Exception as e:
        logging.error(f"Error fetching activity calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

