
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="../frontend/.env") # Try frontend too

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in environment.")
    exit(1)

supabase: Client = create_client(url, key)

async def check_admins():
    print("--- Searching for Admins ---")
    
    # 1. Check super_admins
    print("\n[super_admins table]")
    try:
        res = supabase.table("super_admins").select("*").execute()
        for user in res.data:
            print(f"  - {user.get('email')} (Name: {user.get('name')})")
    except Exception as e:
        print(f"  Error: {e}")

    # 2. Check admins (unified)
    print("\n[admins table]")
    try:
        res = supabase.table("admins").select("*").execute()
        for user in res.data:
            print(f"  - {user.get('email')} (Type: {user.get('admin_type')}, Inst: {user.get('institution_id')})")
    except Exception as e:
        print(f"  Error: {e}")

    # 3. Check institution_admins (legacy)
    print("\n[institution_admins table]")
    try:
        res = supabase.table("institution_admins").select("*").execute()
        for user in res.data:
            print(f"  - {user.get('email')} (Status: {user.get('status')}, Inst: {user.get('institution_id')})")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_admins())
