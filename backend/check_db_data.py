
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load env
load_dotenv()

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    # Try generic names if not found
    print("⚠️  Env vars not found standardly. Trying hardcoded check if locally available (skipped).")
    
print(f"Connecting to {supabase_url}...")

try:
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Check Admins
    print("\n--- ADMINS ---")
    res = supabase.table("admins").select("*", count="exact").limit(5).execute()
    print(f"Count: {res.count}")
    for r in res.data:
        print(f" - {r.get('id')} | {r.get('email')} | {r.get('institution_id')} | {r.get('admin_type')}")
        
    # Check Students
    print("\n--- STUDENTS ---")
    res = supabase.table("students").select("*", count="exact").limit(5).execute()
    print(f"Count: {res.count}")
    for r in res.data:
        print(f" - {r.get('id')} | {r.get('email')} | {r.get('institution_id')}")
        
    # Check Super Admins
    print("\n--- SUPER ADMINS ---")
    try:
        res = supabase.table("super_admins").select("*", count="exact").limit(5).execute()
        print(f"Count: {res.count}")
        for r in res.data:
            print(f" - {r.get('id')} | {r.get('email')}")
    except Exception as e:
        print(f"Error checking super_admins: {e}")
        
except Exception as e:
    print(f"❌ Connection failed: {e}")
