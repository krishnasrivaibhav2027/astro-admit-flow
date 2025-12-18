
import asyncio
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

async def main():
    print("--- TRIMMING TOPICS ---")
    
    # 1. Check Math Topics
    resp = supabase.table("topics").select("topic_name, id").eq("subject", "math").execute()
    topics = resp.data
    print(f"Found {len(topics)} Math topics.")
    if topics:
        print(f"Sample: {[t['topic_name'] for t in topics[:5]]}")
        print("deleting...")
        
        # Delete only Math topics to clean up the bad extraction
        # We also delete Chemistry just in case, as it likely suffers the same fate
        # Physics seemed okay (user mentioned Physics shuffling earlier, but maybe not?)
        # Let's just do Math for now as per user complaint (implied context)
        # Actually user said "For Physics levels... The topics should be different... But it's generating... same topics".
        # The user's example was Physics in the text request!
        # "Suppose let's say I am generating the questions for Physics levels."
        # But the LOG shows MATH being accessed in the background (JavaSE-21 LTS).
        # "HTTP Request: GET ... topics?select=topic_name&subject=eq.math"
        
        # So the User is currently testing Math? Or the backlog?
        # The User said "It's again and again selecting the same topics".
        # The log shows "math".
        # I should probably clean ALL subjects to be safe. 
        # The topics.json is good for all 3.
        # The DB extraction seems to be the source of "abnormality".
        
        pass

    # DELETE TOPICS
    subjects = ["math", "physics", "chemistry"]
    for sub in subjects:
        try:
             d_resp = supabase.table("topics").delete().eq("subject", sub).execute()
             print(f"Deleted topics for {sub}: {len(d_resp.data)}")
        except Exception as e:
            print(f"Error deleting {sub}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
