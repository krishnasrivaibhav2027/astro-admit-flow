import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Missing env vars")
    exit(1)

client = create_client(url, key)

try:
    print("Checking 'admins' table columns...")
    # Typically we can't query information_schema via client directly unless exposed.
    # But we can try to select * limit 1 and see keys.
    res = client.table("admins").select("*").limit(1).execute()
    if res.data:
        print("Columns found in data:", list(res.data[0].keys()))
    else:
        print("Table empty. Trying to insert dummy to see error or checking rpc if available.")
    
    # Also valid check: Check if 'status' is in the error message if we query it specifically
    try:
        res = client.table("admins").select("status").limit(1).execute()
        print("Select 'status' column: SUCCESS")
    except Exception as e:
        print(f"Select 'status' column FAILED: {e}")

except Exception as e:
    print(f"Error: {e}")
