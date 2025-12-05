import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

async def verify_admins():
    print("Verifying admins table...")
    
    try:
        response = supabase.table("admins").select("*").execute()
        admins = response.data
        print(f"Found {len(admins)} admins in 'admins' table.")
        for admin in admins:
            print(f" - {admin.get('email')} ({admin.get('role')})")
            
    except Exception as e:
        print(f"Error fetching admins: {e}")

if __name__ == "__main__":
    asyncio.run(verify_admins())
