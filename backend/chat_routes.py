from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Dict, Optional
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from supabase import Client
import os
from auth_dependencies import get_current_user, get_current_user_optional

# Redis Cache for instant loading
from redis_client import redis_manager
CACHE_TTL_SECONDS = 30  # 30 second cache for contact lists

router = APIRouter()

# Initialize Supabase client (re-using environment variables)
# In a real app, we might want to share the client instance from server.py
from supabase import create_client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)


class Message(BaseModel):
    sender_id: str
    sender_type: str
    receiver_id: str
    receiver_type: str
    content: str

class MarkReadRequest(BaseModel):
    message_ids: List[str]

@router.get("/admins")
async def get_admins(current_user: Optional[Dict] = Depends(get_current_user_optional)):
    try:
        # Cache key based on user email for personalized unread counts
        user_email = current_user.get("email", "anon") if current_user else "anon"
        cache_key = f"chat:admins:{user_email}"
        
        # Try cache first for instant loading
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        # 1. Fetch all admins
        admins_response = supabase.table("admins").select("id, first_name, last_name, email, role").execute()
        admins = admins_response.data or []
        
        # 1b. Fetch Super Admins
        super_admins_resp = supabase.table("super_admins").select("id, first_name, last_name, email, role").execute()
        super_admins = super_admins_resp.data or []
        
        # Merge lists
        admins.extend(super_admins)
        
        # 2. Identify the requesting user (student or admin)
        student_id = None
        admin_id = None
        if current_user:
            try:
                email = current_user.get("email")
                
                # First check if it's a student
                student_res = supabase.table("students").select("id").eq("email", email).execute()
                if student_res.data:
                    student_id = student_res.data[0]['id']
                else:
                    # Check if it's an admin (admins or super_admins table)
                    admin_res = supabase.table("admins").select("id").eq("email", email).execute()
                    if admin_res.data:
                        admin_id = admin_res.data[0]['id']
                    else:
                        # Also check super_admins table
                        super_admin_res = supabase.table("super_admins").select("id").eq("email", email).execute()
                        if super_admin_res.data:
                            admin_id = super_admin_res.data[0]['id']
            except Exception as e:
                print(f"Token verification failed in get_admins: {e}")
                # Continue without stats if auth fails
        
        admin_stats = {}
        
        if student_id:
            # 3a. Fetch messages between this student and admins
            messages_response = supabase.table("messages").select("*").or_(
                f"sender_id.eq.{student_id},receiver_id.eq.{student_id}"
            ).execute()
            messages = messages_response.data
            
            for msg in messages:
                other_admin_id = None
                if msg['sender_type'] in ['admin', 'super_admin']:
                    other_admin_id = msg['sender_id']
                elif msg['receiver_type'] in ['admin', 'super_admin']:
                    other_admin_id = msg['receiver_id']
                
                if not other_admin_id:
                    continue
                    
                if other_admin_id not in admin_stats:
                    admin_stats[other_admin_id] = {'last_message_at': None, 'unread_count': 0}
                
                # Update last message time
                msg_time = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                if msg_time.tzinfo is None:
                    msg_time = msg_time.replace(tzinfo=timezone.utc)
                
                if not admin_stats[other_admin_id]['last_message_at'] or msg_time > admin_stats[other_admin_id]['last_message_at']:
                    admin_stats[other_admin_id]['last_message_at'] = msg_time
                
                # Update unread count
                if msg['sender_type'] in ['admin', 'super_admin'] and msg['receiver_id'] == student_id and not msg['is_read']:
                    admin_stats[other_admin_id]['unread_count'] += 1
        
        elif admin_id:
            # 3b. Fetch messages between this admin and other admins (admin-to-admin chat)
            messages_response = supabase.table("messages").select("*").or_(
                f"sender_id.eq.{admin_id},receiver_id.eq.{admin_id}"
            ).execute()
            messages = messages_response.data
            
            for msg in messages:
                other_admin_id = None
                # Find the other party in the conversation
                if msg['sender_id'] == admin_id and msg['receiver_type'] in ['admin', 'super_admin']:
                    other_admin_id = msg['receiver_id']
                elif msg['receiver_id'] == admin_id and msg['sender_type'] in ['admin', 'super_admin']:
                    other_admin_id = msg['sender_id']
                
                if not other_admin_id:
                    continue
                    
                if other_admin_id not in admin_stats:
                    admin_stats[other_admin_id] = {'last_message_at': None, 'unread_count': 0}
                
                # Update last message time
                msg_time = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                if msg_time.tzinfo is None:
                    msg_time = msg_time.replace(tzinfo=timezone.utc)
                
                if not admin_stats[other_admin_id]['last_message_at'] or msg_time > admin_stats[other_admin_id]['last_message_at']:
                    admin_stats[other_admin_id]['last_message_at'] = msg_time
                
                # Update unread count (messages FROM other admin TO this admin)
                if msg['sender_id'] == other_admin_id and msg['receiver_id'] == admin_id and not msg['is_read']:
                    admin_stats[other_admin_id]['unread_count'] += 1
        
        # Merge stats
        for admin in admins:
            stats = admin_stats.get(admin['id'], {'last_message_at': None, 'unread_count': 0})
            admin['last_message_at'] = stats['last_message_at'].isoformat() if stats['last_message_at'] else None
            admin['unread_count'] = stats['unread_count']
        
        # Cache the result
        redis_manager.cache_set(cache_key, admins, CACHE_TTL_SECONDS)

        return admins
    except Exception as e:
        print(f"Error fetching admins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students")
async def get_students(current_user: Optional[Dict] = Depends(get_current_user_optional)):
    try:
        # Cache key based on user email for personalized data
        user_email = current_user.get("email", "anon") if current_user else "anon"
        cache_key = f"chat:students:{user_email}"
        
        # Try cache first for instant loading
        cached = redis_manager.cache_get(cache_key)
        if cached:
            return cached
        
        # 2. Identify the requesting admin and their institution
        admin_id = None
        admin_institution_id = None
        is_super_admin = False
        
        if current_user:
            try:
                email = current_user.get("email")
                
                # Check if it's an admin (admins table)
                admin_res = supabase.table("admins").select("id, institution_id").eq("email", email).execute()
                if admin_res.data:
                    admin_id = admin_res.data[0]['id']
                    admin_institution_id = admin_res.data[0].get('institution_id')
                else:
                    # Also check super_admins table (they see all students)
                    super_admin_res = supabase.table("super_admins").select("id").eq("email", email).execute()
                    if super_admin_res.data:
                        admin_id = super_admin_res.data[0]['id']
                        is_super_admin = True
            except Exception as e:
                print(f"Token verification failed in get_students: {e}")
        
        # 1. Fetch students - filtered by institution for institutional admins
        if admin_institution_id:
            # Institutional admin - only see students from their institution
            students_response = supabase.table("students").select("id, first_name, last_name, email, role").eq("institution_id", admin_institution_id).execute()
        else:
            # Super admin or no auth - see all students
            students_response = supabase.table("students").select("id, first_name, last_name, email, role").execute()
        
        students = students_response.data or []
        
        student_stats = {}
        
        if admin_id:
            # 3a. Fetch messages between this admin and students
            messages_response = supabase.table("messages").select("sender_id, receiver_id, created_at, is_read, sender_type, receiver_type").or_(
                f"sender_id.eq.{admin_id},receiver_id.eq.{admin_id}"
            ).execute()
            messages = messages_response.data or []
            
            for msg in messages:
                # Determine the student ID involved in this message
                student_id = None
                if msg['sender_type'] == 'student' and msg['receiver_id'] == admin_id:
                    student_id = msg['sender_id']
                elif msg['receiver_type'] == 'student' and msg['sender_id'] == admin_id:
                    student_id = msg['receiver_id']
                
                if not student_id:
                    continue
                    
                if student_id not in student_stats:
                    student_stats[student_id] = {
                        'last_message_at': None,
                        'unread_count': 0
                    }
                
                # Update last message time
                msg_time = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                if msg_time.tzinfo is None:
                    msg_time = msg_time.replace(tzinfo=timezone.utc)

                if not student_stats[student_id]['last_message_at'] or msg_time > student_stats[student_id]['last_message_at']:
                    student_stats[student_id]['last_message_at'] = msg_time
                
                # Update unread count (only messages FROM student TO admin)
                if msg['sender_type'] == 'student' and msg['receiver_id'] == admin_id and not msg['is_read']:
                    student_stats[student_id]['unread_count'] += 1
        else:
            # 3b. Fallback: Fetch all messages involving students (for unauthenticated or non-admin users)
            messages_response = supabase.table("messages").select("sender_id, receiver_id, created_at, is_read, sender_type").execute()
            messages = messages_response.data or []
            
            for msg in messages:
                # Determine the student ID involved in this message
                student_id = None
                if msg['sender_type'] == 'student':
                    student_id = msg['sender_id']
                elif msg['sender_type'] == 'admin':
                    student_id = msg['receiver_id']
                
                if not student_id:
                    continue
                    
                if student_id not in student_stats:
                    student_stats[student_id] = {
                        'last_message_at': None,
                        'unread_count': 0
                    }
                
                # Update last message time
                msg_time = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                if msg_time.tzinfo is None:
                    msg_time = msg_time.replace(tzinfo=timezone.utc)

                if not student_stats[student_id]['last_message_at'] or msg_time > student_stats[student_id]['last_message_at']:
                    student_stats[student_id]['last_message_at'] = msg_time
                
                # Update unread count (only messages FROM student TO admin)
                if msg['sender_type'] == 'student' and not msg['is_read']:
                    student_stats[student_id]['unread_count'] += 1

        # Merge stats into student list
        for student in students:
            stats = student_stats.get(student['id'], {'last_message_at': None, 'unread_count': 0})
            student['last_message_at'] = stats['last_message_at'].isoformat() if stats['last_message_at'] else None
            student['unread_count'] = stats['unread_count']
        
        # Cache the result
        redis_manager.cache_set(cache_key, students, CACHE_TTL_SECONDS)
            
        return students
    except Exception as e:
        print(f"Error fetching students with stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_chat_history(
    user1_id: str,
    user1_type: str,
    user2_id: str,
    user2_type: str,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    try:
        # Simplification: Fetch sent and received messages separately to avoid complex OR syntax issues
        # and ensure reliability.
        
        # 1. Messages sent by user1 to user2
        response_sent = supabase.table("messages").select("*").match({
            "sender_id": user1_id,
            "receiver_id": user2_id
        }).execute()
        
        # 2. Messages sent by user2 to user1
        response_received = supabase.table("messages").select("*").match({
            "sender_id": user2_id,
            "receiver_id": user1_id
        }).execute()
        
        # Merge and Sort
        all_messages = (response_sent.data or []) + (response_received.data or [])
        
        # Sort by created_at (ascending)
        all_messages.sort(key=lambda x: x['created_at'])
        
        return all_messages
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_message(message: Message, current_user: Dict = Depends(get_current_user)):
    print(f"DEBUG: Receiving message send request from {current_user.get('email')}")
    try:
        data = message.dict()
        data['created_at'] = datetime.now(timezone.utc).isoformat()
        data['is_read'] = False
        
        response = supabase.table("messages").insert(data).execute()
        return response.data[0]
    except Exception as e:
        print(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark_read")
async def mark_messages_read(request: MarkReadRequest, current_user: Dict = Depends(get_current_user)):
    try:
        if not request.message_ids:
            return {"message": "No messages to mark"}
            
        response = supabase.table("messages").update({"is_read": True}).in_("id", request.message_ids).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread")
async def get_unread_count(user_id: str, user_type: str, current_user: Optional[Dict] = Depends(get_current_user_optional)):
    try:
        # Count messages where receiver is user and is_read is false
        response = supabase.table("messages").select("id", count="exact").eq("receiver_id", user_id).eq("receiver_type", user_type).eq("is_read", False).execute()
        return {"count": response.count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
