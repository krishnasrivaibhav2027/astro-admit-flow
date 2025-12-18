
import asyncio
import os
import logging
from dotenv import load_dotenv
from supabase import create_client

# Setup Logic
logging.basicConfig(level=logging.INFO)
load_dotenv()

# Mock settings
from settings_manager import settings_manager

async def main():
    try:
        from exam_assembly_service import ExamAssemblyService
        
        # Test Student ID (Use a real one from DB or a dummy UUID if we can insert)
        # We'll fetch a student first
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        student_resp = supabase.table("students").select("id").limit(1).execute()
        if not student_resp.data:
            logging.error("❌ No students found in DB. Cannot verify lock.")
            return
            
        student_id = student_resp.data[0]['id']
        logging.info(f"👤 Testing with Student ID: {student_id}")
        
        # 1. First Assembly (Should generate/fetch and Lock)
        logging.info("\n--- 1. First Assembly Call ---")
        q1 = await ExamAssemblyService.get_or_create_exam(student_id, "physics", "medium", num_questions=3)
        ids1 = [q['bank_id'] for q in q1]
        logging.info(f"First Set IDs: {ids1}")
        
        # 2. Second Assembly (Should return SAME IDs from Lock)
        logging.info("\n--- 2. Second Assembly Call (Expect Lock) ---")
        q2 = await ExamAssemblyService.get_or_create_exam(student_id, "physics", "medium", num_questions=3)
        ids2 = [q['bank_id'] for q in q2]
        logging.info(f"Second Set IDs: {ids2}")
        
        if ids1 == ids2:
            logging.info("✅ SUCCESS: IDs match. Exam is deterministic/locked.")
        else:
            logging.error(f"❌ FAILURE: IDs do not match.\n1: {ids1}\n2: {ids2}")
            
    except Exception as e:
        logging.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
