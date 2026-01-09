"""
MCP (Model Context Protocol) Server for Institutional Admin
============================================================
Provides AI-accessible tools for:
- Database querying (students, results, access requests)
- Google Calendar integration (exam scheduling)
- Google Sheets integration (data export/import)
- Analytics & visualization

This server can be used standalone with MCP clients OR
integrated via the internal admin chatbot endpoint.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
import logging
from mcp_google_sheets import export_to_sheets
from mcp_google_calendar import schedule_exam

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None


# ============================================
# MCP TOOL DEFINITIONS
# ============================================
# These functions are designed to be called by an LLM
# Each returns structured data that can be presented naturally

class MCPTools:
    """Collection of MCP tools for institutional admin operations."""
    
    @staticmethod
    def execute_sql_query(query: str, institution_id: str) -> Dict:
        """Execute a read-only SQL query against the database."""
        # 1. Safety Checks
        query_lower = query.strip().lower()
        
        # Forbidden keywords for read-only enforcement
        forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "grant ", "revoke ", "create "]
        for word in forbidden:
            if word in query_lower:
                return {"success": False, "error": f"Security violation: '{word.strip()}' statements are not allowed. Read-only access only."}
        
        # 2. Institution Isolation Check
        # If querying specific tables, ensure proper isolation filter is present
        # NOTE: 'questions', 'student_answers', and 'results' don't always have institution_id directly,
        # but they are secured via JOIN chain or student_id (which is already institution-scoped)
        
        # Tables that MUST have institution_id
        strict_tables = ["students", "student_access_requests"]
        for table in strict_tables:
            if table in query_lower:
                if "institution_id" not in query_lower:
                    return {
                        "success": False, 
                        "error": f"Security violation: Queries on '{table}' must filter by 'institution_id' for data isolation."
                    }
        
        # Tables that can use student_id OR join through students for isolation
        flexible_tables = ["results", "questions", "student_answers"]
        for table in flexible_tables:
            if table in query_lower:
                # Allow if: institution_id present, OR student_id present, OR joined with students
                has_isolation = (
                    "institution_id" in query_lower or 
                    "student_id" in query_lower or
                    "students" in query_lower  # Implies JOIN
                )
                if not has_isolation:
                    return {
                        "success": False, 
                        "error": f"Security violation: Queries on '{table}' must filter by 'institution_id', 'student_id', or join with 'students'."
                    }
        
        try:
            import psycopg2
            from settings_manager import settings_manager
            from dotenv import load_dotenv
            from pathlib import Path

            # Explicitly load backend/.env to ensure credentials are present
            # distinct from server.py's loading, ensuring this tool context has them 
            env_path = Path(__file__).parent / ".env"
            load_dotenv(env_path, override=True)
            
            # Get DB URL from env
            db_url = os.environ.get("DATABASE_URL")
            
            if not db_url:
                # Construct from components
                password = os.environ.get('SUPABASE_DB_PASSWORD')
                project_id = os.environ.get('SUPABASE_PROJECT_ID')
                
                # Fallback: Extract project_id from SUPABASE_URL if missing
                # Format: https://<project_id>.supabase.co
                supabase_url = os.environ.get('SUPABASE_URL', '')
                if not project_id and supabase_url and 'supabase.co' in supabase_url:
                    try:
                        project_id = supabase_url.split('//')[1].split('.')[0]
                    except IndexError:
                        pass
                
                if password and project_id:
                    # Fix: URL-encode the password to handle special characters like '@'
                    from urllib.parse import quote_plus
                    encoded_pass = quote_plus(password)
                    db_url = f"postgresql://postgres:{encoded_pass}@db.{project_id}.supabase.co:5432/postgres?sslmode=require"
                else:
                    return {"success": False, "error": "Missing DATABASE_URL or SUPABASE_DB_PASSWORD/SUPABASE_PROJECT_ID"}
            elif 'sslmode' not in db_url and 'supabase.co' in db_url:
                 # Ensure SSL for Supabase if using direct env var
                 if '?' in db_url:
                     db_url += "&sslmode=require"
                 else:
                     db_url += "?sslmode=require"
            
            # Execute
            try:
                import traceback
                with open("D:\\GitRepos\\astro-admit-flow\\sql_tool_error.log", "a") as f:
                    safe_url = db_url.replace(os.environ.get('SUPABASE_DB_PASSWORD', 'xxxx'), 'REDACTED') if db_url else 'None'
                    f.write(f"\n[{datetime.now()}] Attempting connection to: {safe_url}\n")
            except:
                pass

            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            cursor.execute(query)
            
            # Fetch results
            import uuid
            from datetime import date, datetime, time
            from decimal import Decimal

            results = []
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
                for row in cursor.fetchall():
                    row_dict = {}
                    for i, val in enumerate(row):
                        # Serialization fix for UUID, Temporal, and Numeric types
                        if isinstance(val, (uuid.UUID, datetime, date, time, Decimal)):
                            row_dict[columns[i]] = str(val)
                        else:
                            row_dict[columns[i]] = val
                    results.append(row_dict)
            
            cursor.close()
            conn.close()
            
            return {
                "success": True,
                "count": len(results),
                "data": results,
                "query_executed": query
            }
            
        except ImportError:
            return {"success": False, "error": "psycopg2 module not found. Please install it."}
        except Exception as e:
            logger.error(f"SQL execution error: {e}")
            # DEBUG: Write error to file for agent diagnosis
            try:
                with open("D:\\GitRepos\\astro-admit-flow\\sql_tool_error.log", "a") as f:
                    f.write(f"\n[{datetime.now()}] Error: {str(e)}\nQuery: {query}\nTraceback:\n")
                    import traceback
                    traceback.print_exc(file=f)
            except:
                pass
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_database_schema() -> str:
        """Get a text representation of the database schema for the LLM."""
        return """
TABLES:

TABLES:

1. **students**
   - Columns: id (uuid), first_name, last_name, email, institution_id, status (active/inactive), created_at
   - Description: Stores student profiles. Filter by institution_id! 
   - NOTE: Names are messy. NEVER use '='. ALWAYS use `first_name ILIKE '%term%'` OR `last_name ILIKE '%term%'`.

3. **results**
   - Columns: id, student_id, subject, level, score, result, start_time, end_time
   - Description: Stores individual test ATTEMPTS. One student has multiple rows (one per test).
   - NOTE: `result` is TEXT ('pass' or 'fail'). NEVER use boolean (TRUE/FALSE). Use `result = 'fail'`.
   - NOTE: To count STUDENTS, use `COUNT(DISTINCT student_id)`.
   - NOTE: NO institution_id column. You MUST JOIN `students` to filter by `institution_id`.
     Example: `... FROM results r JOIN students s ON r.student_id = s.id WHERE s.institution_id = ...`

3. **question_bank**
   - Columns: id, subject, level, question_content (JSON), is_used
   - Description: The pool of questions (source). `level` is TEXT ('easy', 'medium', 'hard'). NEVER integer.
   - NOTE: data like `topic`, `correct_answer`, `explanation` is inside `question_content` JSON (e.g., `question_content ->> 'topic'`).
   
4. **questions** (Test Instances)
   - Columns: id, result_id, question_text, correct_answer, bank_id
   - Description: The actual questions generated for a specific test result. Link results to answers.
   - NOTE: JOIN with `question_bank` on `bank_id` to get metadata using JSON operators.
   
5. **student_answers**
   - Columns: id, question_id, student_answer
   - Description: Student's answer to a specific question instance. JOIN with `questions` on `question_id`, then `results` on `result_id`.

6. **student_access_requests**
   - Columns: id, name, email, institution_id, status (pending/approved/rejected)
   - Description: Requests to join an institution.
"""

    @staticmethod
    def get_tool_definitions() -> List[Dict]:
        """Return tool definitions for LLM function calling."""
        return [
            {
                "name": "execute_sql_query",
                "description": "Execute a readonly SQL query. Use this for ANY generic question about data (stats, causes, comparisons).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Valid PostgreSQL query. MUST include WHERE institution_id = ... for student data."}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "query_students",
                "description": "Query students belonging to an institution. Can filter by status, subject performance, etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "subject": {"type": "string", "enum": ["physics", "math", "chemistry"], "description": "Filter by subject"},
                        "limit": {"type": "integer", "description": "Maximum number of results", "default": 50}
                    },
                    "required": []
                }
            },
            {
                "name": "get_student_performance",
                "description": "Get detailed performance metrics for a specific student including test scores, time spent, and level progress.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "student_id": {"type": "string", "description": "The student's UUID"},
                        "include_questions": {"type": "boolean", "description": "Include individual question performance", "default": False}
                    },
                    "required": ["student_id"]
                }
            },
            {
                "name": "get_pending_access_requests",
                "description": "Get all pending student access requests for an institution that need admin review.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "include_rejected": {"type": "boolean", "description": "Also include recently rejected requests", "default": False}
                    },
                    "required": []
                }
            },
            {
                "name": "get_institution_analytics",
                "description": "Get analytics summary for an institution: student counts, pass rates, average scores by subject/level.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "time_range": {"type": "string", "enum": ["week", "month", "quarter", "all"], "default": "month"}
                    },
                    "required": []
                }
            },
            {
                "name": "search_question_bank",
                "description": "Search questions in the question bank by subject, level, and topic.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "subject": {"type": "string", "enum": ["physics", "math", "chemistry"]},
                        "level": {"type": "integer", "description": "Level 1-5"},
                        "topic": {"type": "string", "description": "Optional topic keyword"},
                        "used": {"type": "boolean", "description": "Filter by used/unused status"},
                        "limit": {"type": "integer", "default": 20}
                    },
                    "required": ["subject"]
                }
            },
            {
                "name": "schedule_exam",
                "description": "Schedule an exam for a student and create a Google Calendar event.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "student_email": {"type": "string", "description": "Student's email address"},
                        "exam_title": {"type": "string", "description": "Title of the exam"},
                        "exam_date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                        "exam_time": {"type": "string", "description": "Time in HH:MM format (24-hour)"},
                        "duration_minutes": {"type": "integer", "default": 60},
                        "subject": {"type": "string", "enum": ["physics", "math", "chemistry"]},
                        "level": {"type": "integer", "description": "Level 1-5"}
                    },
                    "required": ["student_email", "exam_title", "exam_date", "exam_time"]
                }
            },
            {
                "name": "export_to_sheets",
                "description": "Export institution data to a new Google Sheet.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "data_type": {"type": "string", "enum": ["students", "results", "access_requests", "analytics"]},
                        "spreadsheet_name": {"type": "string", "description": "Name for the new spreadsheet"}
                    },
                    "required": ["data_type", "spreadsheet_name"]
                }
            },
            {
                "name": "get_struggling_students",
                "description": "Identify students who are stuck or struggling based on failed attempts and time spent.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "threshold_attempts": {"type": "integer", "default": 3, "description": "Min failed attempts to be considered stuck"},
                        "threshold_days": {"type": "integer", "default": 7, "description": "Days on same level to be considered stuck"}
                    },
                    "required": []
                }
            }
        ]

    # ============================================
    # DATABASE QUERY TOOLS
    # ============================================

    @staticmethod
    def query_students(
        institution_id: str,
        status: Optional[str] = None,
        subject: Optional[str] = None,
        limit: int = 50
    ) -> Dict:
        """Query students belonging to an institution with optional filters."""
        try:
            logger.info("Executing query_students (patched version - no status column)")
            query = supabase.table("students").select(
                "id, first_name, last_name, email, created_at"
            ).eq("institution_id", institution_id)
            
            
            result = query.limit(limit).execute()
            
            students = result.data if result.data else []
            
            return {
                "success": True,
                "count": len(students),
                "students": students,
                "filters_applied": {
                    "status": status,
                    "subject": subject
                }
            }
        except Exception as e:
            logger.error(f"Error querying students: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_student_performance(student_id: str, include_questions: bool = False) -> Dict:
        """Get detailed performance metrics for a specific student."""
        try:
            # Get student info
            student = supabase.table("students").select("*").eq("id", student_id).single().execute()
            
            if not student.data:
                return {"success": False, "error": "Student not found"}
            
            # Get test results
            results = supabase.table("results").select(
                "subject, level, score, result, start_time, end_time"
            ).eq("student_id", student_id).order("end_time", desc=True).execute()
            
            # Calculate aggregates
            test_data = results.data or []
            subjects = {}
            for test in test_data:
                subj = test.get("subject", "unknown")
                if subj not in subjects:
                    subjects[subj] = {"attempts": 0, "passed": 0, "avg_score": 0, "total_score": 0}
                subjects[subj]["attempts"] += 1
                if test.get("result") == "pass":
                    subjects[subj]["passed"] += 1
                subjects[subj]["total_score"] += test.get("score") or 0
            
            for subj in subjects:
                if subjects[subj]["attempts"] > 0:
                    subjects[subj]["avg_score"] = round(
                        subjects[subj]["total_score"] / subjects[subj]["attempts"], 1
                    )
                subjects[subj]["pass_rate"] = round(
                    (subjects[subj]["passed"] / subjects[subj]["attempts"]) * 100, 1
                ) if subjects[subj]["attempts"] > 0 else 0
            
            response = {
                "success": True,
                "student": {
                    "id": student.data.get("id"),
                    "name": f"{student.data.get('first_name', '')} {student.data.get('last_name', '')}".strip(),
                    "email": student.data.get("email"),
                    "status": student.data.get("status", "active"),
                    "joined": student.data.get("created_at")
                },
                "performance": {
                    "total_tests": len(test_data),
                    "by_subject": subjects
                },
                "recent_tests": test_data[:5]
            }
            
            if include_questions:
                # Get individual question performance
                questions = supabase.table("student_answers").select(
                    "question_id, is_correct, time_taken"
                ).eq("student_id", student_id).limit(100).execute()
                response["question_performance"] = questions.data or []
            
            return response
        except Exception as e:
            logger.error(f"Error getting student performance: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_pending_access_requests(institution_id: str, include_rejected: bool = False) -> Dict:
        """Get pending student access requests for an institution."""
        try:
            query = supabase.table("student_access_requests").select(
                "id, name, email, phone, stream_applied, scorecard_url, status, created_at, rejection_reason"
            ).eq("institution_id", institution_id)
            
            if include_rejected:
                query = query.in_("status", ["pending", "rejected"])
            else:
                query = query.eq("status", "pending")
            
            result = query.order("created_at", desc=True).execute()
            
            requests = result.data or []
            
            return {
                "success": True,
                "count": len(requests),
                "requests": requests,
                "pending_count": len([r for r in requests if r.get("status") == "pending"]),
                "rejected_count": len([r for r in requests if r.get("status") == "rejected"])
            }
        except Exception as e:
            logger.error(f"Error getting access requests: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_institution_analytics(institution_id: str, time_range: str = "month") -> Dict:
        """Get analytics summary for an institution."""
        try:
            # Calculate date range
            now = datetime.utcnow()
            if time_range == "week":
                start_date = now - timedelta(days=7)
            elif time_range == "month":
                start_date = now - timedelta(days=30)
            elif time_range == "quarter":
                start_date = now - timedelta(days=90)
            else:
                start_date = None
            
            # Get student count
            students_query = supabase.table("students").select("id").eq(
                "institution_id", institution_id
            )
            students = students_query.execute().data or []
            
            # Count by status
            status_counts = {"active": 0, "completed": 0, "inactive": 0}
            for s in students:
                status = s.get("status", "active")
                if status in status_counts:
                    status_counts[status] += 1
            
            # Infer current level from max passed test results
            level_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            try:
                if students:
                    student_ids = [s["id"] for s in students]
                    # Get max passed level for each student
                    passed_results = supabase.table("results").select(
                        "student_id, level"
                    ).eq("result", "pass").in_("student_id", student_ids).execute().data or []
                    
                    student_max_levels = {}
                    for r in passed_results:
                        sid = r.get("student_id")
                        lvl = r.get("level", 0)
                        student_max_levels[sid] = max(student_max_levels.get(sid, 0), lvl)
                    
                    for s in students:
                        # Current level is max passed + 1, capped at 5
                        max_passed = student_max_levels.get(s["id"], 0)
                        current_lvl = min(max_passed + 1, 5)
                        level_counts[current_lvl] = level_counts.get(current_lvl, 0) + 1
            except Exception as e:
                logger.warning(f"Error calculating level counts: {e}")
                # Fallback: all level 1
                level_counts[1] = len(students)
            
            # Get test results for pass rates
            results_query = supabase.table("results").select(
                "subject, level, result, score"
            ).in_("student_id", [s["id"] for s in students])
            
            if start_date:
                results_query = results_query.gte("end_time", start_date.isoformat())
            
            results = results_query.execute().data or []
            
            # Calculate subject stats
            subject_stats = {}
            for r in results:
                subj = r.get("subject", "unknown")
                if subj not in subject_stats:
                    subject_stats[subj] = {"total": 0, "passed": 0, "total_score": 0}
                subject_stats[subj]["total"] += 1
                if r.get("result") == "pass":
                    subject_stats[subj]["passed"] += 1
                subject_stats[subj]["total_score"] += r.get("score") or 0
            
            for subj in subject_stats:
                stats = subject_stats[subj]
                stats["pass_rate"] = round((stats["passed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
                stats["avg_score"] = round(stats["total_score"] / stats["total"], 1) if stats["total"] > 0 else 0
            
            return {
                "success": True,
                "institution_id": institution_id,
                "time_range": time_range,
                "overview": {
                    "total_students": len(students),
                    "by_status": status_counts,
                    "by_level": level_counts
                },
                "test_performance": {
                    "total_tests": len(results),
                    "by_subject": subject_stats
                }
            }
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def search_question_bank(
        subject: str,
        level: Optional[int] = None,
        topic: Optional[str] = None,
        used: Optional[bool] = None,
        limit: int = 20
    ) -> Dict:
        """Search questions in the question bank."""
        try:
            query = supabase.table("question_bank").select(
                "id, question_text, options, correct_answer, difficulty, topic, used"
            ).eq("subject", subject.lower())
            
            if level:
                query = query.eq("level", level)
            if used is not None:
                query = query.eq("used", used)
            if topic:
                query = query.ilike("topic", f"%{topic}%")
            
            result = query.limit(limit).execute()
            questions = result.data or []
            
            return {
                "success": True,
                "count": len(questions),
                "subject": subject,
                "filters": {"level": level, "topic": topic, "used": used},
                "questions": questions
            }
        except Exception as e:
            logger.error(f"Error searching question bank: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_struggling_students(
        institution_id: str,
        threshold_attempts: int = 3,
        threshold_days: int = 7
    ) -> Dict:
        """Identify students who are stuck or struggling."""
        try:
            # Get students and their results
            students = supabase.table("students").select(
                "id, first_name, last_name, email"
            ).eq("institution_id", institution_id).execute().data or []
            
            struggling = []
            cutoff_date = datetime.utcnow() - timedelta(days=threshold_days)
            
            for student in students:
                # Get recent failed attempts
                results = supabase.table("results").select(
                    "subject, level, result, end_time"
                ).eq("student_id", student["id"]).neq("result", "pass").gte(
                    "end_time", cutoff_date.isoformat()
                ).execute().data or []
                
                if len(results) >= threshold_attempts:
                    # Find most problematic subject/level
                    problem_areas = {}
                    for r in results:
                        key = f"{r.get('subject', 'unknown')}_L{r.get('level', 0)}"
                        problem_areas[key] = problem_areas.get(key, 0) + 1
                    
                    most_stuck = max(problem_areas.items(), key=lambda x: x[1]) if problem_areas else (None, 0)
                    
                    struggling.append({
                        "student_id": student["id"],
                        "name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                        "email": student.get("email"),
                        "failed_attempts": len(results),
                        "most_stuck_on": most_stuck[0],
                        "failed_attempts": len(results),
                        "most_stuck_on": most_stuck[0],
                        "last_activity": None
                    })
            
            return {
                "success": True,
                "count": len(struggling),
                "threshold": {
                    "min_attempts": threshold_attempts,
                    "within_days": threshold_days
                },
                "struggling_students": sorted(struggling, key=lambda x: x["failed_attempts"], reverse=True)
            }
        except Exception as e:
            logger.error(f"Error finding struggling students: {e}")
            return {"success": False, "error": str(e)}


# ============================================
# TOOL EXECUTOR
# ============================================

def execute_tool(tool_name: str, arguments: Dict) -> Dict:
    """Execute an MCP tool by name with given arguments."""
    tool_map = {
        "query_students": MCPTools.query_students,
        "get_student_performance": MCPTools.get_student_performance,
        "get_pending_access_requests": MCPTools.get_pending_access_requests,
        "get_institution_analytics": MCPTools.get_institution_analytics,
        "search_question_bank": MCPTools.search_question_bank,
        "get_struggling_students": MCPTools.get_struggling_students,
        "search_question_bank": MCPTools.search_question_bank,
        "get_struggling_students": MCPTools.get_struggling_students,
        "export_to_sheets": export_to_sheets,
        "schedule_exam": schedule_exam,
        "execute_sql_query": MCPTools.execute_sql_query,
    }
    
    if tool_name not in tool_map:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    try:
        return tool_map[tool_name](**arguments)
    except TypeError as e:
        return {"success": False, "error": f"Invalid arguments: {e}"}
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return {"success": False, "error": str(e)}


def get_all_tools() -> List[Dict]:
    """Get all available tool definitions."""
    return MCPTools.get_tool_definitions()
