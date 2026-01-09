"""
Chat History Service - Supabase-based persistence for chatbot conversations
with Redis caching layer for improved performance.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from supabase import create_client, Client

# Import Redis cache manager
from redis_client import redis_manager

# Cache TTL settings (in seconds)
CACHE_TTL_MESSAGES = 300    # 5 minutes for thread messages
CACHE_TTL_THREADS = 120      # 2 minutes for thread listings

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


# ===== Cache Key Generators =====

def _cache_key_messages(thread_id: str) -> str:
    """Generate cache key for thread messages."""
    return f"chat:messages:{thread_id}"

def _cache_key_threads(student_id: str) -> str:
    """Generate cache key for student's thread list."""
    return f"chat:threads:{student_id}"


# ===== Cache Invalidation Helpers =====

def _invalidate_thread_cache(thread_id: str, student_id: str = None):
    """Invalidate caches when a thread is modified."""
    # Invalidate messages cache for this thread
    redis_manager.cache_delete(_cache_key_messages(thread_id))
    
    # Invalidate student's thread list cache
    if student_id:
        redis_manager.cache_delete(_cache_key_threads(student_id))
    else:
        # If we don't know the student_id, invalidate all thread caches
        # This is less efficient but ensures consistency
        redis_manager.cache_delete_pattern("chat:threads:*")
    
    print(f"[CACHE INVALIDATE] thread={thread_id}, student={student_id}")


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
        
        # Invalidate student's thread list cache since new thread was created
        _invalidate_thread_cache(thread_id, student_id)
        
        logging.info(f"Created new chat thread: {thread_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error ensuring thread exists: {e}")
        raise


def save_message(thread_id: str, student_id: str, role: str, content: str, is_read: bool = True) -> Dict[str, Any]:
    """
    Save a message to a chat thread.
    Creates the thread if it doesn't exist.
    Invalidates relevant caches after save.
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
        
        # Invalidate caches - new message means stale cache
        _invalidate_thread_cache(thread_id, student_id)
        
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
    Uses Redis cache for faster reads.
    """
    cache_key = _cache_key_messages(thread_id)
    
    # Try cache first
    cached = redis_manager.cache_get(cache_key)
    if cached is not None:
        print(f"[GET_MESSAGES] CACHE HIT for thread={thread_id}")
        return cached
    
    # Cache miss - fetch from Supabase
    try:
        sb = get_supabase()
        
        result = sb.table("chat_messages")\
            .select("id, role, content, created_at")\
            .eq("thread_id", thread_id)\
            .order("created_at", desc=False)\
            .execute()
        
        messages = result.data or []
        
        # Cache the result
        redis_manager.cache_set(cache_key, messages, CACHE_TTL_MESSAGES)
        print(f"[GET_MESSAGES] CACHE MISS for thread={thread_id}, cached {len(messages)} messages")
        
        return messages
        
    except Exception as e:
        logging.error(f"Error getting thread messages: {e}")
        return []


def list_student_threads(student_id: str) -> List[Dict[str, Any]]:
    """
    List all chat threads for a student, ordered by most recent.
    Uses Redis cache for faster reads.
    """
    cache_key = _cache_key_threads(student_id)
    
    # Try cache first
    cached = redis_manager.cache_get(cache_key)
    if cached is not None:
        print(f"[LIST_THREADS] CACHE HIT for student={student_id}")
        return cached
    
    # Cache miss - fetch from Supabase
    print(f"[LIST_THREADS] CACHE MISS for student={student_id}, fetching from DB...")
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
        
        # Cache the result
        redis_manager.cache_set(cache_key, threads, CACHE_TTL_THREADS)
        print(f"[LIST_THREADS] Cached {len(threads)} threads for student={student_id}")
        
        return threads
        
    except Exception as e:
        logging.error(f"Error listing student threads: {e}")
        print(f"[LIST_THREADS] ERROR: {e}")
        return []


def delete_thread(thread_id: str, student_id: str = None) -> bool:
    """
    Delete a chat thread and all its messages.
    Invalidates relevant caches.
    """
    try:
        sb = get_supabase()
        
        # Get student_id if not provided (for cache invalidation)
        if not student_id:
            thread_data = sb.table("chat_threads").select("student_id").eq("thread_id", thread_id).execute()
            if thread_data.data and len(thread_data.data) > 0:
                student_id = thread_data.data[0].get("student_id")
        
        # Messages are deleted via CASCADE
        sb.table("chat_threads").delete().eq("thread_id", thread_id).execute()
        
        # Invalidate caches
        _invalidate_thread_cache(thread_id, student_id)
        
        logging.info(f"Deleted thread: {thread_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error deleting thread: {e}")
        return False
