import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Hardcoded for debugging purposes only
url = "https://uminpkhjsrfoqgjtqqfn.supabase.co" # Derived from JWT iss "supabase" or user provided previously? user didn't provide URL, need to find it first. 
# actually user provided key but not URL in the recent message. 
# I need to get URL from env. I will try to read env using python.

# Let's trust load_dotenv for URL but hardcode key.
service_role = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaW5wa2hqc3Jmb2dqdHdxcWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MjYxMCwiZXhwIjoyMDc2MDM4NjEwfQ.8uKHEPxJr7GuErWUPR_pxbEajrgw-Dd3r1hwsTUty-Q"
supabase = create_client(url, service_role)

def check_and_log():
    try:
        email = "vasudevguptha@gmail.com"
        response = supabase.auth.admin.list_users()
        users = response if isinstance(response, list) else response.users
        
        target_users = [u for u in users if u.email == email]
        
        with open("admin_status.txt", "w") as f:
            f.write(f"Total Users: {len(users)}\n")
            if not target_users:
                 f.write(f"User {email} NOT FOUND\n")
            for u in target_users:
                f.write(f"ID: {u.id}\n")
                f.write(f"Email: {u.email}\n")
                f.write(f"Confirmed: {u.email_confirmed_at}\n")
                
                # Check DB
                res = supabase.table("admins").select("*").eq("id", u.id).execute()
                f.write(f"In Admins Table: {bool(res.data)}\n")
                
    except Exception as e:
        with open("admin_status.txt", "w") as f:
            f.write(f"Error: {e}")

if __name__ == "__main__":
    check_and_log()
