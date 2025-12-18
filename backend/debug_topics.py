
import asyncio
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

async def main():
    print("--- DIAGNOSTICS ---")
    
    # 1. Check Topics Count
    try:
        resp = supabase.table("topics").select("topic_name, subject").execute()
        topics = resp.data
        print(f"Total Topics in DB: {len(topics)}")
        by_subject = {}
        for t in topics:
            sub = t['subject']
            by_subject[sub] = by_subject.get(sub, 0) + 1
            
        print(f"Topics per subject: {by_subject}") 
        
        if topics:
            print(f"Sample Topics: {[t['topic_name'] for t in topics[:5]]}")
    except Exception as e:
        print(f"Error fetching topics: {e}")

    # 2. Check Saturation
    try:
        # Pick a topic
        if topics:
            sample_topic = topics[0]['topic_name']
            subject = topics[0]['subject']
            print(f"\nChecking saturation for '{sample_topic}' ({subject})...")
            
            # Use the logic from QuestionBankService
            # .textSearch("question_content->>topic", f"'{topic}'")
            # We'll try the exact query used in code
            
            # NOTE: Logic from code:
            # resp = supabase.table("question_bank").select("id", count="exact").eq("subject", subject).eq("level", "easy").textSearch("question_content->>topic", f"'{sample_topic}'").execute()
            
            # We simulate it
            resp = supabase.table("question_bank").select("id, question_content").eq("subject", subject).execute()
            print(f"Total questions for {subject}: {len(resp.data)}")
            
            matches = 0
            for q in resp.data:
                qc = q.get('question_content', {})
                if qc.get('topic') == sample_topic:
                    matches += 1
            print(f"Manual Count of '{sample_topic}': {matches}")
            
    except Exception as e:
        print(f"Error checking saturation: {e}")

if __name__ == "__main__":
    asyncio.run(main())
