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
        from question_bank_service import QuestionBankService
        
        logging.info("🚀 Testing Guarded Generation...")
        
        # 1. Run Generation (Should generate questions if empty)
        logging.info("\n--- 1. First Pass (Expect Generation) ---")
        result = await QuestionBankService.generate_guarded("physics", "medium", target_per_topic=1) 
        # Low target to be fast
        logging.info(f"Result 1: {result}")
        
        # 2. Run Generation Again (Should be skipped/idempotent)
        logging.info("\n--- 2. Second Pass (Expect Idempotency/Skip) ---")
        result2 = await QuestionBankService.generate_guarded("physics", "medium", target_per_topic=1)
        logging.info(f"Result 2: {result2}")
        
        # Verify counts in DB
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        
        # Check questions count
        q_resp = supabase.table("question_bank").select("count", count="exact").eq("subject", "physics").eq("level", "medium").execute()
        logging.info(f"📊 Total Physics/Medium Questions in Bank: {q_resp.count}")
        
    except Exception as e:
        logging.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
