
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="../frontend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found.")
    exit(1)

supabase: Client = create_client(url, key)

async def check_linkage():
    email = "vausdevguptha@gmail.com" # The email in question
    print(f"--- Debugging Data Linkage for {email} ---")

    # 1. Get Admin Details
    print("\n[1. Admin Record]")
    admin_res = supabase.table("admins").select("*").eq("email", email).execute()
    admin_id = None
    admin_inst_id = None
    
    if admin_res.data:
        admin = admin_res.data[0]
        admin_id = admin.get("id")
        admin_inst_id = admin.get("institution_id")
        print(f"  FOUND: ID={admin_id}")
        print(f"  Institution_ID={admin_inst_id}")
        print(f"  Name={admin.get('first_name')} {admin.get('last_name')}")
    else:
        print("  Admin NOT FOUND in 'admins' table!")

    # 2. Get All Institutions matching the one assigned (if any) or ALL
    print("\n[2. Institutions]")
    if admin_inst_id:
        inst_res = supabase.table("institutions").select("*").eq("id", admin_inst_id).execute()
        if inst_res.data:
            print(f"  Admin's Institution: '{inst_res.data[0]['name']}' (ID: {inst_res.data[0]['id']})")
        else:
            print(f"  CRITICAL: Admin has institution_id {admin_inst_id} but it DOES NOT EXIST in institutions table.")
    
    # 3. Get Recent Student Requests
    print("\n[3. Recent Student Requests]")
    req_res = supabase.table("student_access_requests").select("id, email, institution_id, created_at").order("created_at", desc=True).limit(5).execute()
    
    for req in req_res.data:
        match = "MATCH ✅" if req['institution_id'] == admin_inst_id else "NO MATCH ❌"
        print(f"  Req: {req['email']} -> Inst_ID: {req['institution_id']} ({match})")
        
        # Double check institution name for this request
        req_inst = supabase.table("institutions").select("name").eq("id", req['institution_id']).execute()
        if req_inst.data:
             print(f"       (Institution Name: '{req_inst.data[0]['name']}')")

if __name__ == "__main__":
    asyncio.run(check_linkage())
