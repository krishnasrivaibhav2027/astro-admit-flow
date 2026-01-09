"""
Settings Routes Module
Handles admin settings and student announcements endpoints.
Extracted from server.py for better maintainability.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import logging
import os

from supabase import create_client, Client
from auth_dependencies import get_current_user, get_current_user_with_activity
from models import SettingsUpdateRequest
import settings_manager

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/admin/settings")
async def get_settings(current_user: Dict = Depends(get_current_user)):
    """Get current admin settings"""
    try:
        return settings_manager.get_settings()
    except Exception as e:
        logging.error(f"Error fetching settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/settings")
async def update_settings(settings: SettingsUpdateRequest, current_user: Dict = Depends(get_current_user)):
    """Update admin settings"""
    try:
        logging.info(f"⚙️ Updating settings: {settings.model_dump()}")
        
        # Update settings
        new_settings = settings_manager.update_settings(settings.model_dump())
        
        # Log activity
        admin_name = current_user.get('name', current_user.get('email', 'Unknown Admin'))
        
        # Create a summary of changes
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


@router.get("/student/announcements")
async def get_student_announcements(current_user: Dict = Depends(get_current_user_with_activity)):
    """Get announcements for the current student based on their status"""
    try:
        # Determine student status (passed or not)
        student_response = supabase.table("students").select("id").eq("email", current_user['email']).execute()
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_db_id = student_response.data[0]['id']
        
        # Check if passed hard level
        results_response = supabase.table("results").select("result").eq("student_id", student_db_id).eq("level", "hard").eq("result", "pass").execute()
        is_passed = len(results_response.data) > 0
        
        # Fetch announcements
        audiences = ["all", "students"]
        if is_passed:
            audiences.append("passed_students")
            
        response = supabase.table("announcements").select("*").in_("target_audience", audiences).order("created_at", desc=True).execute()
        
        return response.data
        
    except Exception as e:
        logging.error(f"Error fetching student announcements: {e}")
        raise HTTPException(status_code=500, detail=str(e))
