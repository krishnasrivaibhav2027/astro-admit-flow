import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

# Load env vars
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Supabase credentials not found.")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

try:
    # Fetch all messages
    response = supabase.table("messages").select("*").execute()
    messages = response.data
    
    print(f"Total messages: {len(messages)}")
    for msg in messages:
        print(f"ID: {msg.get('id')}")
        print(f"  Sender: {msg.get('sender_id')} ({msg.get('sender_type')})")
        print(f"  Receiver: {msg.get('receiver_id')} ({msg.get('receiver_type')})")
        print(f"  Content: {msg.get('content')}")
        print(f"  Is Read: {msg.get('is_read')}")
        print(f"  Created At: {msg.get('created_at')}")
        print("-" * 20)

except Exception as e:
    print(f"Error: {e}")
