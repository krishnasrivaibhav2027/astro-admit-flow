
import asyncio
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

async def main():
    print("--- SYNCING JSON TO DB ---")
    
    # Read topics.json
    topics_file = os.path.join(os.path.dirname(__file__), "topics.json")
    if not os.path.exists(topics_file):
        print("topics.json not found!")
        return

    with open(topics_file, 'r') as f:
        data = json.load(f)

    for subject, topics in data.items():
        print(f"Syncing {subject} ({len(topics)} topics)...")
        
        # Insert each topic if not exists
        count = 0
        for t in topics:
            # Check exist
            resp = supabase.table("topics").select("id").eq("subject", subject).eq("topic_name", t).execute()
            if not resp.data:
                # Insert
                supabase.table("topics").insert({
                    "subject": subject,
                    "topic_name": t,
                    "pdf_hash": "manual_override" # Marker
                }).execute()
                count += 1
        print(f"Added {count} new topics for {subject}.")

if __name__ == "__main__":
    asyncio.run(main())
