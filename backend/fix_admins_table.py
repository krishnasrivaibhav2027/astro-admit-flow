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

async def backfill_admins():
    print("Starting admin backfill...")
    
    # 1. Fetch all students with role 'admin'
    try:
        response = supabase.table("students").select("*").eq("role", "admin").execute()
        admins_in_students = response.data
        print(f"Found {len(admins_in_students)} admins in 'students' table.")
    except Exception as e:
        print(f"Error fetching students: {e}")
        return

    count = 0
    for student in admins_in_students:
        try:
            # 2. Check if they exist in 'admins' table
            existing = supabase.table("admins").select("id").eq("email", student['email']).execute()
            
            if not existing.data:
                # 3. Insert into 'admins' table
                admin_data = {
                    "firebase_uid": student.get('firebase_uid') or "legacy_user", # Handle missing firebase_uid if any
                    "email": student['email'],
                    "first_name": student['first_name'],
                    "last_name": student['last_name'],
                    "role": "admin"
                }
                supabase.table("admins").insert(admin_data).execute()
                print(f"Synced: {student['email']}")
                count += 1
            else:
                print(f"Skipped (already exists): {student['email']}")
                
        except Exception as e:
            print(f"Error syncing {student['email']}: {e}")

    print(f"Backfill complete. Synced {count} new admins.")

if __name__ == "__main__":
    asyncio.run(backfill_admins())
