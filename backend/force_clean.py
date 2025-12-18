
import asyncio
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

async def main():
    print("--- FORCE CLEANING ALL SUBJECTS ---")
    subjects = ["physics", "chemistry", "math"]
    
    for sub in subjects:
        try:
             # Delete all topics for the subject
             d_resp = supabase.table("topics").delete().eq("subject", sub).execute()
             print(f"Deleted topics for {sub}: {len(d_resp.data)}")
             
             # Verify count is 0
             c_resp = supabase.table("topics").select("id", count="exact").eq("subject", sub).execute()
             print(f"Remaining count for {sub}: {c_resp.count}")
             
        except Exception as e:
            print(f"Error cleaning {sub}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
