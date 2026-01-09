"""
Student Routes Module
Handles student CRUD operations and authentication endpoints.
Extracted from server.py for better maintainability.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from datetime import datetime, timezone
import logging
import json
import os

from supabase import create_client, Client
from auth_dependencies import get_current_user, get_current_user_with_activity
from models import StudentCreate, UpdatePhoneRequest, LogoutRequest

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["students"])


@router.post("/students")
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
                    "firebase_uid": current_user.get('uid'),
                    "email": student.email,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "role": "admin"
                }
                existing_admin = supabase.table("admins").select("id").eq("email", student.email).execute()
                if not existing_admin.data:
                    supabase.table("admins").insert(admin_data).execute()
                    logging.info(f"✅ Synced new admin to admins table: {student.email}")
            except Exception as e:
                logging.error(f"Failed to sync admin to admins table: {e}")

        if hasattr(response, 'data') and response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/by-email/{email}")
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


@router.put("/students/{student_id}/phone")
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


@router.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentCreate, current_user: Dict = Depends(get_current_user_with_activity)):
    """Update full student profile - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
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


@router.get("/students/{student_id}")
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


@router.get("/students")
async def list_students(current_user: Dict = Depends(get_current_user)):
    """List all students - Authenticated"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        response = supabase.table("students").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout")
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
        
        # If not found in students, try to update admin
        if not student_res.data:
            supabase.table("admins").update({
                "logout_time": logout_time,
                "last_active_at": logout_time
            }).eq("email", email).execute()
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        logging.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
