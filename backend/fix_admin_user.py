import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
service_role = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
anon_key = os.environ.get("SUPABASE_KEY")

print(f"URL: {url}")
if service_role:
    print(f"Service Role Key found: {service_role[:10]}...")
    key = service_role
else:
    print("WARNING: SUPABASE_SERVICE_ROLE_KEY NOT FOUND. Using fallback (likely Anon Key).")
    key = anon_key

if not key:
    print("CRITICAL: No Supabase key found.")
    exit(1)

supabase = create_client(url, key)

async def check():
    email = "vasudevguptha@gmail.com"
    print(f"Checking for {email}...")
    try:
        # Fetch all users
        response = supabase.auth.admin.list_users()
        users = response if isinstance(response, list) else response.users
        
        print(f"Total users found: {len(users)}")
        
        target_users = [u for u in users if u.email == email]
        
        if not target_users:
            print(f"CRITICAL: User {email} NOT FOUND in Auth!")
            return

        for target in target_users:
            print(f"Found User: ID={target.id}, Email={target.email}, ConfirmedAt={target.email_confirmed_at}")
            
            if not target.email_confirmed_at:
                print(f"Attempting to confirm user {target.id}...")
                # Confirm email
                update_attr = {'email_confirm': True}
                update_res = supabase.auth.admin.update_user_by_id(target.id, update_attr)
                print(f"Update Result: {update_res}")
                
                # Re-fetch to verify
                refetched = supabase.auth.admin.get_user_by_id(target.id)
                user_obj = refetched if not hasattr(refetched, 'user') else refetched.user
                print(f"VERIFICATION: ConfirmedAt after update: {user_obj.email_confirmed_at}")
            else:
                print("User is already confirmed.")
                
            # Now Check public.admins
            res = supabase.table("admins").select("*").eq("id", target.id).execute()
            if not res.data:
                print(f"User {target.id} missing from public.admins! Attempting to fix...")
                # Insert into admins
                first_name = "Vasudev"
                last_name = "Guptha"
                
                try:
                    supabase.table("admins").insert({
                        "id": target.id,
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "role": "admin"
                    }).execute()
                    print("User added to public.admins table.")
                except Exception as insert_err:
                    print(f"Insert Error: {insert_err}")
            else:
                print(f"User {target.id} exists in public.admins.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check())
