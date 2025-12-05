import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

print("Starting script...", flush=True)

# Load env vars
env_path = Path(__file__).parent / '.env'
print(f"Loading env from {env_path}", flush=True)
load_dotenv(env_path)

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Supabase credentials not found.", flush=True)
    # Try to hardcode or print what we found
    print(f"URL: {supabase_url}", flush=True)
    exit(1)

print("Connecting to Supabase...", flush=True)
supabase: Client = create_client(supabase_url, supabase_key)

try:
    print("Fetching messages...", flush=True)
    # Fetch all messages
    response = supabase.table("messages").select("*").execute()
    messages = response.data
    
    print(f"Total messages: {len(messages)}", flush=True)
    for msg in messages:
        print(f"ID: {msg.get('id')}")
        print(f"  Sender: {msg.get('sender_id')} ({msg.get('sender_type')})")
        print(f"  Receiver: {msg.get('receiver_id')} ({msg.get('receiver_type')})")
        print(f"  Content: {msg.get('content')}")
        print(f"  Is Read: {msg.get('is_read')}")
        print(f"  Created At: {msg.get('created_at')}")
        print("-" * 20)

except Exception as e:
    print(f"Error: {e}", flush=True)
