"""
Chat History Service - Supabase-based persistence for chatbot conversations
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

_supabase: Optional[Client] = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not configured")
        _supabase = create_client(supabase_url, supabase_key)
    return _supabase


def ensure_thread_exists(thread_id: str, student_id: str) -> bool:
    """
    Ensure a chat thread exists, create if not.
    Returns True if created, False if already exists.
    """
    try:
        sb = get_supabase()
        
        # Check if thread exists
        existing = sb.table("chat_threads").select("id").eq("thread_id", thread_id).execute()
        
        if existing.data and len(existing.data) > 0:
            return False  # Already exists
        
        # Create new thread
        sb.table("chat_threads").insert({
            "student_id": student_id,
            "thread_id": thread_id,
            "title": "New Chat",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        
        logging.info(f"Created new chat thread: {thread_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error ensuring thread exists: {e}")
        raise


def save_message(thread_id: str, student_id: str, role: str, content: str, is_read: bool = True) -> Dict[str, Any]:
    """
    Save a message to a chat thread.
    Creates the thread if it doesn't exist.
    """
    print(f"[SAVE_MSG] Saving {role} message to thread={thread_id}, student={student_id}, read={is_read}")
    try:
        sb = get_supabase()
        
        # Ensure thread exists
        ensure_thread_exists(thread_id, student_id)
        
        # Insert message
        result = sb.table("chat_messages").insert({
            "thread_id": thread_id,
            "role": role,
            "content": content,
            "is_read": is_read,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        # Update thread's updated_at and title (from first user message)
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        # If this is user's first message, use it as title
        if role == "user":
            messages = sb.table("chat_messages").select("id").eq("thread_id", thread_id).eq("role", "user").execute()
            if messages.data and len(messages.data) == 1:
                # This is the first user message, use as title
                title = content[:50] + "..." if len(content) > 50 else content
                update_data["title"] = title
        
        sb.table("chat_threads").update(update_data).eq("thread_id", thread_id).execute()
        
        logging.info(f"Saved {role} message to thread {thread_id}")
        print(f"[SAVE_MSG] SUCCESS: Saved {role} message to {thread_id}")
        return result.data[0] if result.data else {}
        
    except Exception as e:
        logging.error(f"Error saving message: {e}")
        print(f"[SAVE_MSG] ERROR: {e}")
        raise


def get_thread_messages(thread_id: str) -> List[Dict[str, Any]]:
    """
    Get all messages for a thread, ordered by creation time.
    """
    try:
        sb = get_supabase()
        
        result = sb.table("chat_messages")\
            .select("id, role, content, created_at")\
            .eq("thread_id", thread_id)\
            .order("created_at", desc=False)\
            .execute()
        
        return result.data or []
        
    except Exception as e:
        logging.error(f"Error getting thread messages: {e}")
        return []


def list_student_threads(student_id: str) -> List[Dict[str, Any]]:
    """
    List all chat threads for a student, ordered by most recent.
    """
    print(f"[LIST_THREADS] Listing threads for student={student_id}")
    try:
        sb = get_supabase()
        
        result = sb.table("chat_threads")\
            .select("id, thread_id, title, created_at, updated_at")\
            .eq("student_id", student_id)\
            .order("updated_at", desc=True)\
            .execute()
        
        threads = result.data or []
        
        # Add message count and preview for each thread
        for thread in threads:
            messages = sb.table("chat_messages")\
                .select("id, content, role")\
                .eq("thread_id", thread["thread_id"])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            thread["message_count"] = len(messages.data) if messages.data else 0
            if messages.data and len(messages.data) > 0:
                last_msg = messages.data[0]
                preview = last_msg["content"][:40] + "..." if len(last_msg["content"]) > 40 else last_msg["content"]
                thread["preview"] = f"{last_msg['role']}: {preview}"
            else:
                thread["preview"] = "No messages"
        
        print(f"[LIST_THREADS] Found {len(threads)} threads for student={student_id}")
        return threads
        
    except Exception as e:
        logging.error(f"Error listing student threads: {e}")
        print(f"[LIST_THREADS] ERROR: {e}")
        return []


def delete_thread(thread_id: str) -> bool:
    """
    Delete a chat thread and all its messages.
    """
    try:
        sb = get_supabase()
        
        # Messages are deleted via CASCADE
        sb.table("chat_threads").delete().eq("thread_id", thread_id).execute()
        
        logging.info(f"Deleted thread: {thread_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error deleting thread: {e}")
        return False
