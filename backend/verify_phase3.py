
import asyncio
import os
import logging
from dotenv import load_dotenv
from supabase import create_client

logging.basicConfig(level=logging.INFO)
load_dotenv()

async def main():
    try:
        from exam_assembly_service import ExamAssemblyService
        from question_bank_service import QuestionBankService
        
        logging.info("🚀 Testing Phase 3 Optimizations...")
        
        # 1. Test Context Injection (Simulate Fallback)
        # We need to simulate a case where bank has SOME questions but not enough.
        # Let's manually insert 1 questions into bank for a weird subject/level to avoid noise
        subject = "physics" 
        level = "hard" 
        
        # Check bank count
        # Ensure we have at least 1 question
        existing = await QuestionBankService.get_questions(subject, level, 1)
        if not existing:
            logging.info("Generating 1 seed question...")
            await QuestionBankService.generate_guarded(subject, level, target_per_topic=1)
            existing = await QuestionBankService.get_questions(subject, level, 1) # fetch to "use" it? No, get_questions marks used.
            # We want it to be unused for the Service to pick it up? 
            # Actually, ExamAssemblyService calls get_questions which returns Unused.
            # If we want to test Context Injection, we need `get_questions` to return LESS than needed.
            
        # So:
        # 1. Ensure Bank has say 1 question.
        # 2. Ask for 3 questions.
        # 3. Service gets 1 from Bank.
        # 4. Service needs 2 more -> Enters Fallback.
        # 5. Service uses the 1 fetched question as Context.
        
        logging.info("\n--- Test Context Injection ---")
        # We can't easily spy on the internal call to `ai_service`.
        # But we can check if the output questions look good?
        # Or just run it and ensure no crash.
        
        # We need a student ID
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        student_resp = supabase.table("students").select("id").limit(1).execute()
        student_id = student_resp.data[0]['id']
        
        # Ask for 5 questions (likely to trigger fallback if bank low)
        questions = await ExamAssemblyService.get_or_create_exam(student_id, subject, level, 15)
        logging.info(f"✅ Received {len(questions)} questions.")
        
        # 2. Test Background Replenishment (Indirectly)
        # We can call the task function directly to verify it runs
        from server import replenishment_task
        logging.info("\n--- Test Replenishment Task ---")
        await replenishment_task(subject, level)
        logging.info("✅ Replenishment task executed.")

    except Exception as e:
        logging.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
