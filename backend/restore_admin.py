print("Starting restore script...")
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase with SERVICE ROLE KEY to allow admin operations
SUPABASE_URL = os.environ.get("SUPABASE_URL")
# Try to get implicit service role key, or fallback to SUPABASE_KEY if it happens to be one
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY not found in env.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def restore_admin():
    email = "rana45@admin.com"
    password = "Rnaidu@123"
    # ID from the screenshot to match public.admins table
    user_id = "0cb787d6-a3f6-41a9-947b-d094fcc2737e" 

    with open("restore_log.txt", "w") as f:
        f.write(f"Attempting to create admin user: {email} with ID: {user_id}\n")

    try:
        # Check if user already exists (optional, create_user might throw)
        # We use admin.create_user to specify the ID and auto-confirm email
        attributes = {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": "Rana",
                "last_name": "Naidu",
                "role": "admin"
            }
        }
        
        # Note: In python supabase client, admin interface is accessed via supabase.auth.admin
        # create_user allow specifying 'id'?? 
        # Checking documentation memory: supabase.auth.admin.create_user(params) usually doesn't allow setting ID directly in some versions
        # BUT supabase-py wraps GoTrue-py.
        # If create_user doesn't support ID, we might have a problem.
        # However, usually we can use `invite_user_by_email` or similar, but we want to set password.
        
        # Let's try to just create it. If we can't set ID, we might need to UPDATE public.admins.
        # Let's try to see if we can pass ID.
        
        # Actually, Supabase Admin API (GoTrue) often allows `sub` or `id` in attributes? No.
        # If I cannot force the ID, I will:
        # 1. Create the user (getting a NEW id).
        # 2. Update the public.admins table to swap the old ID with the NEW ID.
        
        user = supabase.auth.admin.create_user(attributes)
        new_id = user.user.id
        with open("restore_log.txt", "a") as f:
            f.write(f"User created with ID: {new_id}\n")

        if new_id != user_id:
            with open("restore_log.txt", "a") as f:
                f.write(f"ID mismatch! Expected {user_id}, got {new_id}. Updating public.admins table...\n")
            
            # Update the admins table to link to the new Auth ID
            response = supabase.table("admins").update({"id": new_id}).eq("email", email).execute()
            
            with open("restore_log.txt", "a") as f:
                f.write(f"Updated public.admins table result: {response}\n")
            
            # Update relations
            supabase.table("messages").update({"sender_id": new_id}).eq("sender_id", user_id).execute()
            supabase.table("messages").update({"receiver_id": new_id}).eq("receiver_id", user_id).execute()
            
        with open("restore_log.txt", "a") as f:
            f.write("Admin restored successfully.\n")

    except Exception as e:
        with open("restore_log.txt", "a") as f:
            f.write(f"Error restoring admin: {e}\n")

if __name__ == "__main__":
    asyncio.run(restore_admin())
