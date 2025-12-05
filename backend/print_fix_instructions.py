import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

sql_file_path = "fix_announcements_fk.sql"

try:
    with open(sql_file_path, "r") as f:
        sql_content = f.read()
        
    # Split by semicolon to handle multiple statements if needed, though supabase-py might handle it differently.
    # The rpc call 'exec_sql' or similar is usually needed for DDL, but the python client doesn't expose raw SQL execution easily without a stored procedure.
    # However, we can try to use the `rpc` method if a function exists, or we might have to rely on the user to run it.
    # Wait, the previous interactions showed `apply_schema_update.py` might exist or similar.
    # Let's check if there is a way to run raw SQL. 
    # Actually, standard supabase-py doesn't support raw SQL execution directly from the client unless enabled via RPC.
    
    # Alternative: The user has `apply_schema_update.sql` and `fix_admin_rls.sql` in their open files.
    # They might be running these manually or via a tool.
    
    # Let's try to see if there is an existing script I can reuse or if I should ask the user.
    # But I am an agent, I should try to solve it.
    
    # If I cannot run SQL directly, I will assume the user has a way or I will try to use a postgres connection if available.
    # But I only have `supabase-py`.
    
    # Let's look at `backend/server.py` again to see if there is any helper.
    # Or I can try to use `psycopg2` if installed.
    
    print("Please run the following SQL in your Supabase SQL Editor:")
    print(sql_content)

except Exception as e:
    print(f"Error: {e}")
