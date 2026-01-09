
import os
import uuid
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env")

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
sb = create_client(supabase_url, supabase_key)

def test_insert_thread():
    dummy_student_id = str(uuid.uuid4())
    thread_id = f"test_thread_{dummy_student_id}"
    print(f"Testing insert with dummy_student_id: {dummy_student_id}")
    
    try:
        sb.table("chat_threads").insert({
            "student_id": dummy_student_id,
            "thread_id": thread_id,
            "title": "Test Chat",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        print("SUCCESS: Inserted thread with valid UUID but non-existent student.")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

if __name__ == "__main__":
    test_insert_thread()
