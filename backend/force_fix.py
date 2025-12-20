import os
from supabase import create_client

# Hardcoded credentials
url = "https://uminpkhjsrfoqgjtqqfn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5wa2hqc3Jmb2dqdHdxcWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MjYxMCwiZXhwIjoyMDc2MDM4NjEwfQ.8uKHEPxJr7GuErWUPR_pxbEajrgw-Dd3r1hwsTUty-Q"

def log(msg):
    with open("force_fix_log.txt", "a") as f:
        f.write(str(msg) + "\n")

def run():
    try:
        log("Starting force_fix.py...")
        supabase = create_client(url, key)
        log("Client created.")
        
        email = "vasudevguptha@gmail.com"
        log(f"Listing users to find {email}...")
        
        response = supabase.auth.admin.list_users()
        users = response if isinstance(response, list) else response.users
        log(f"Total users: {len(users)}")
        
        found = False
        for u in users:
            if u.email == email:
                found = True
                log(f"Found User: {u.id} (Confirmed: {u.email_confirmed_at})")
                
                # Check DB
                log("Checking public.admins...")
                res = supabase.table("admins").select("*").eq("id", u.id).execute()
                log(f"In DB: {bool(res.data)}")
                
                if not res.data:
                    log("Inserting into DB...")
                    try:
                        supabase.table("admins").insert({
                            "id": u.id,
                            "email": email,
                            "first_name": "Vasudev",
                            "last_name": "Guptha",
                            "role": "admin"
                        }).execute()
                        log("Inserted successfully.")
                    except Exception as ins_e:
                        log(f"Insert failed: {ins_e}")
                
                # Force Confirm
                if not u.email_confirmed_at:
                    log("Updating email_confirm = True...")
                    update_res = supabase.auth.admin.update_user_by_id(u.id, {'email_confirm': True})
                    log(f"Update response: {update_res}")
                else:
                    log("User already confirmed.")
                    
        if not found:
            log("User NOT FOUND in Auth list.")
            
    except Exception as e:
        log(f"CRASH: {e}")
        import traceback
        log(traceback.format_exc())

if __name__ == "__main__":
    run()
