from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from supabase import Client
import os
from firebase_config import verify_firebase_token

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
async def get_admins(authorization: str = Header(None)):
    try:
        # 1. Fetch all admins
        admins_response = supabase.table("admins").select("id, first_name, last_name, email, role").execute()
        admins = admins_response.data
        
        # 2. Identify the requesting student (if applicable)
        student_id = None
        if authorization:
            try:
                token = authorization.split("Bearer ")[1]
                decoded_token = verify_firebase_token(token)
                email = decoded_token.get("email")
                
                # Find student by email
                student_res = supabase.table("students").select("id").eq("email", email).execute()
                if student_res.data:
                    student_id = student_res.data[0]['id']
            except Exception as e:
                print(f"Token verification failed in get_admins: {e}")
                # Continue without stats if auth fails or not a student
        
        if student_id:
            # 3. Fetch messages between this student and admins
            # We want:
            # - Messages FROM admin TO student (unread count)
            # - Last message time (either direction)
            
            messages_response = supabase.table("messages").select("*").or_(
                f"sender_id.eq.{student_id},receiver_id.eq.{student_id}"
            ).execute()
            messages = messages_response.data
            
            admin_stats = {}
            
            for msg in messages:
                admin_id = None
                if msg['sender_type'] == 'admin':
                    admin_id = msg['sender_id']
                elif msg['receiver_type'] == 'admin':
                    admin_id = msg['receiver_id']
                
                if not admin_id:
                    continue
                    
                if admin_id not in admin_stats:
                    admin_stats[admin_id] = {'last_message_at': None, 'unread_count': 0}
                
                # Update last message time
                msg_time = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                if msg_time.tzinfo is None:
                    msg_time = msg_time.replace(tzinfo=timezone.utc)
                
                if not admin_stats[admin_id]['last_message_at'] or msg_time > admin_stats[admin_id]['last_message_at']:
                    admin_stats[admin_id]['last_message_at'] = msg_time
                
                # Update unread count (Messages FROM admin TO student)
                if msg['sender_type'] == 'admin' and msg['receiver_id'] == student_id and not msg['is_read']:
                    admin_stats[admin_id]['unread_count'] += 1
            
            # Merge stats
            for admin in admins:
                stats = admin_stats.get(admin['id'], {'last_message_at': None, 'unread_count': 0})
                admin['last_message_at'] = stats['last_message_at'].isoformat() if stats['last_message_at'] else None
                admin['unread_count'] = stats['unread_count']

        return admins
    except Exception as e:
        print(f"Error fetching admins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students")
async def get_students(authorization: str = Header(None)):
    try:
        # 1. Fetch all students
        students_response = supabase.table("students").select("id, first_name, last_name, email, role").execute()
        students = students_response.data
        
        # 2. Fetch all messages involving admins to calculate stats
        # We want:
        # - Last message time for each student (either sent by them or sent to them)
        # - Unread count for each student (messages sent BY student TO admin that are unread)
        
        # Fetching all messages might be heavy in production, but for now it's okay.
        # Ideally we'd use a view or RPC.
        messages_response = supabase.table("messages").select("sender_id, receiver_id, created_at, is_read, sender_type").execute()
        messages = messages_response.data
        
        student_stats = {}
        
        for msg in messages:
            # Determine the student ID involved in this message
            student_id = None
            if msg['sender_type'] == 'student':
                student_id = msg['sender_id']
            elif msg['sender_type'] == 'admin': # Assuming receiver is student
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
    authorization: str = Header(None)
):
    try:
        # Fetch messages where (sender=user1 AND receiver=user2) OR (sender=user2 AND receiver=user1)
        # Supabase doesn't support complex OR queries easily in one go with the JS/Python client sometimes,
        # but we can try using the 'or' filter.
        
        # Format: sender_id.eq.user1_id,receiver_id.eq.user2_id,sender_type.eq.user1_type,receiver_type.eq.user2_type
        # This is getting complicated with types.
        # Let's just fetch all messages involving these two users and filter in python if needed, 
        # or use a raw SQL query if possible (rpc).
        # But for now, let's try to fetch sent and received separately and merge, or use the 'or' syntax.
        
        # Using Supabase 'or' syntax:
        # sender_id.eq.uid1,receiver_id.eq.uid2...
        
        # Let's try to fetch all messages for the conversation
        response = supabase.table("messages").select("*").or_(
            f"and(sender_id.eq.{user1_id},receiver_id.eq.{user2_id}),and(sender_id.eq.{user2_id},receiver_id.eq.{user1_id})"
        ).order("created_at", desc=False).execute()
        
        return response.data
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_message(message: Message, authorization: str = Header(None)):
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
async def mark_messages_read(request: MarkReadRequest, authorization: str = Header(None)):
    try:
        if not request.message_ids:
            return {"message": "No messages to mark"}
            
        response = supabase.table("messages").update({"is_read": True}).in_("id", request.message_ids).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread")
async def get_unread_count(user_id: str, user_type: str, authorization: str = Header(None)):
    try:
        # Count messages where receiver is user and is_read is false
        response = supabase.table("messages").select("id", count="exact").eq("receiver_id", user_id).eq("receiver_type", user_type).eq("is_read", False).execute()
        return {"count": response.count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
