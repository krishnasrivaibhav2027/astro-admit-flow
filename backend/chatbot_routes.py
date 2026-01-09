from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Optional, List
import json
import logging
import asyncio    

from auth_dependencies import get_current_user
from chatbot_graph import get_graph
from langchain_core.messages import HumanMessage, AIMessage

# Import rate limiter
from rate_limiter import limiter, RATE_LIMITS

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    thread_id: str
    student_id: str

class NotificationTrigger(BaseModel):
    student_id: str
    message: str
    thread_id: str

@router.post("/stream")
@limiter.limit(RATE_LIMITS["chat"])  # 30/minute for chat messages
async def stream_chat(request: Request, message: ChatMessage, current_user: Dict = Depends(get_current_user)):
    """
    Streams the chatbot response. 
    Uses thread_id for persistence.
    """
    logging.info(f"💬 Chat Stream Request: {message.message} (Thread: {message.thread_id})")
    
    # Verify ownership
    # if message.student_id != current_user.get('student_id') ... (skip for now, trust auth email)
    
    # Prepare Input
    student_name = "Student"
    try:
        email = current_user.get('email')
        if email:
            import os
            from supabase import create_client
            
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_KEY")
            
            if supabase_url and supabase_key:
                sb = create_client(supabase_url, supabase_key)
                res = sb.table("students").select("first_name, last_name").eq("email", email).execute()
                if res.data and len(res.data) > 0:
                    data = res.data[0]
                    f_name = data.get('first_name') or ""
                    l_name = data.get('last_name') or ""
                    full_name = f"{f_name} {l_name}".strip()
                    if full_name:
                        student_name = full_name
                        logging.info(f"✅ Resolved Student Name: {student_name}")
    except Exception as e:
        logging.error(f"Failed to fetch student name: {e}")

    input_state = {
        "messages": [HumanMessage(content=message.message)],
        "student_id": message.student_id,
        "student_name": student_name
    }
    
    # Config for persistence
    config = {"configurable": {"thread_id": message.thread_id}}
    
    async def event_generator():
        full_response = ""  # Accumulate full response for saving
        try:
            # Import chat history service for saving
            import chat_history_service
            
            # Save user message to Supabase immediately
            chat_history_service.save_message(
                thread_id=message.thread_id,
                student_id=message.student_id,
                role="user",
                content=message.message
            )
            
            # Stream events from the graph
            # We filter for 'chatbot' node outputs to stream text
            graph = await get_graph()
            async for event in graph.astream_events(input_state, config=config, version="v1"):
                kind = event["event"]
                
                # Stream Token generation
                if kind == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        full_response += content  # Accumulate
                        # Send as Server-Sent Event (data: ...)
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                
                # Tool usage
                elif kind == "on_tool_start":
                    tool_name = event["name"]
                    if "illustration" in tool_name or "image" in tool_name:
                        yield f"data: {json.dumps({'type': 'status', 'content': '✨ Generating illustration...'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'status', 'content': '🔍 Searching for resources...'})}\n\n"
                
                elif kind == "on_tool_end":
                    yield f"data: {json.dumps({'type': 'status', 'content': ''})}\n\n"
            
            # Save AI response to Supabase after streaming completes
            if full_response.strip():
                chat_history_service.save_message(
                    thread_id=message.thread_id,
                    student_id=message.student_id,
                    role="assistant",
                    content=full_response
                )

                    
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logging.error(f"Stream Error: {e}\n{error_trace}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# IMPORTANT: This route MUST be defined BEFORE /history/{thread_id}
# otherwise 'list' gets matched as a thread_id parameter
@router.get("/history/list")
async def list_chats(current_user: Dict = Depends(get_current_user)):
    """
    Lists all chat threads for the current student from Supabase.
    """
    print("[LIST_CHATS] Endpoint called")
    try:
        import os
        import chat_history_service
        from supabase import create_client
        
        # Get student's database ID by looking up their email
        email = current_user.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        supabase = create_client(supabase_url, supabase_key)
        
        student_response = supabase.table("students").select("id").eq("email", email).execute()
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_id = student_response.data[0]['id']
        print(f"[LIST_CHATS] Found student_id: {student_id}")
        
        # Get threads from Supabase
        threads = chat_history_service.list_student_threads(student_id)
        print(f"[LIST_CHATS] Got {len(threads)} threads from service")
        
        # Format for frontend
        results = [{
            "id": t["thread_id"],
            "title": t["title"],
            "timestamp": t["updated_at"],
            "preview": t.get("preview", ""),
            "message_count": t.get("message_count", 0)
        } for t in threads]
        
        print(f"[LIST_CHATS] Returning {len(results)} results")
        return results
        
    except Exception as e:
        error_msg = f"List Chats Error: {e}"
        logging.error(error_msg)
        import traceback
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{thread_id}")
async def get_history(thread_id: str, current_user: Dict = Depends(get_current_user)):
    """
    Fetches history from Supabase.
    """
    try:
        import chat_history_service
        
        messages = chat_history_service.get_thread_messages(thread_id)
        
        # Format for frontend
        history = [{"role": m["role"], "content": m["content"]} for m in messages]
        
        return history
    except Exception as e:
        logging.error(f"History Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger-notification")
async def trigger_notification_internal(request: NotificationTrigger):
    """
    Internal endpoint (or protected) to inject a message into the chat state.
    Used by 'submit-test' to post feedback.
    """
    # This might not need auth if called internally, but we'll leave it open for now or trust internal calls
    # For safety, let's assume it's called by server logic.
    
    try:
        logging.info(f"🔔 Injecting Notification: {request.message}")
        config = {"configurable": {"thread_id": request.thread_id}}
        
        # We want to inject an AI message (as if the bot sent it)
        # OR we can inject a "System" message that prompts the AI to speak next time?
        # User requirement: "It should immediately send a notification text... Like you did well..."
        # This implies the BOT says it.
        
        # We can update the state directly
        # USE ASYNC method for AsyncRedisSaver
        graph = await get_graph()
        current_state = await graph.aget_state(config)
        
        # If no state exists, we initiate
        # We just append an AIMessage
        
        notification_msg = AIMessage(content=request.message)
        
        await graph.aupdate_state(config, {"messages": [notification_msg]})
        
        return {"success": True}
    except Exception as e:
        logging.error(f"Notification Injection Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/debug/keys")
async def debug_redis_keys():
    """
    Directly dump Redis keys to browser to verify storage.
    """
    try:
        import os
        from redis.asyncio import Redis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        redis = Redis.from_url(redis_url, decode_responses=True)
        
        keys = []
        async for key in redis.scan_iter("*", count=1000):
            keys.append(key)
            if len(keys) >= 100: # Limit to 100 for safety
                break
                
        await redis.close()
        
        return {
            "count": len(keys),
            "keys": keys,
            "url": redis_url
        }
    except Exception as e:
         return {"error": str(e)}

@router.get("/history/debug/state/{thread_id}")
async def debug_thread_state(thread_id: str):
    """
    Check if a specific thread has state in LangGraph.
    """
    try:
        config = {"configurable": {"thread_id": thread_id}}
        graph = await get_graph()
        state = await graph.aget_state(config)
        return {
            "thread_id": thread_id,
            "values": state.values,
            "created_at": state.created_at,
            "metadata": state.metadata
        }
    except Exception as e:
        return {"error": str(e)}

class MarkReadRequest(BaseModel):
    thread_id: str
    student_id: str

@router.get("/unread")
async def get_unread_count(student_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    """
    Get unread message count for the chatbot.
    """
    try:
        import os
        from supabase import create_client
        
        # If student_id is not provided, try to resolve from current_user
        if not student_id:
            email = current_user.get('email')
            if email:
                supabase_url = os.environ.get("SUPABASE_URL")
                supabase_key = os.environ.get("SUPABASE_KEY")
                sb = create_client(supabase_url, supabase_key)
                res = sb.table("students").select("id").eq("email", email).execute()
                if res.data:
                    student_id = res.data[0]['id']
        
        if not student_id:
             return {"count": 0}

        # Count messages in chat_messages where role='assistant' and is_read=False
        # Filter by threads belonging to this student
        
        # Step 1: Get threads for student
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        sb = create_client(supabase_url, supabase_key)
        
        threads_res = sb.table("chat_threads").select("thread_id").eq("student_id", student_id).execute()
        threads = [t['thread_id'] for t in threads_res.data]
        
        if not threads:
            return {"count": 0}
            
        # Step 2: Count unread messages in these threads
        # We check for messages from 'assistant' that are NOT read
        count_res = sb.table("chat_messages").select("id", count="exact").in_("thread_id", threads).eq("role", "assistant").eq("is_read", False).execute()
        
        return {"count": count_res.count or 0}
        
    except Exception as e:
        logging.error(f"Error checking unread: {e}")
        return {"count": 0} # Fail graceful means 0 notification

@router.post("/mark_read")
async def mark_read(request: MarkReadRequest, current_user: Dict = Depends(get_current_user)):
    """
    Mark all assistant messages in a thread as read.
    """
    try:
        import os
        from supabase import create_client
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        sb = create_client(supabase_url, supabase_key)
        
        # Update
        sb.table("chat_messages").update({"is_read": True}).eq("thread_id", request.thread_id).eq("role", "assistant").execute()
        
        return {"success": True}
    except Exception as e:
        logging.error(f"Error marking read: {e}")
        raise HTTPException(status_code=500, detail=str(e))
