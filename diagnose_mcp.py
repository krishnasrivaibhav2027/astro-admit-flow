
import os
import sys

# Try to load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️ dotenv not found")

def diagnose():
    print("\n--- 1. Environment Variables ---")
    db_url = os.environ.get("DATABASE_URL")
    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    sb_pass = os.environ.get("SUPABASE_DB_PASSWORD")
    
    print(f"DATABASE_URL: {'Found' if db_url else 'Missing'}")
    print(f"SUPABASE_URL: {sb_url if sb_url else 'Missing'}")
    print(f"SUPABASE_KEY: {'Found' if sb_key else 'Missing'}")
    print(f"SUPABASE_DB_PASSWORD: {'Found' if sb_pass else 'Missing'}")

    print("\n--- 2. Logic Reconstruction ---")
    project_id = os.environ.get('SUPABASE_PROJECT_ID')
    print(f"SUPABASE_PROJECT_ID (Initial): {project_id}")
    
    if not project_id and sb_url and 'supabase.co' in sb_url:
        try:
            project_id = sb_url.split('//')[1].split('.')[0]
            print(f"Extracted Project ID: {project_id}")
        except Exception as e:
            print(f"Failed to extract ID: {e}")
            
    constructed_url = None
    if sb_pass and project_id:
        constructed_url = f"postgresql://postgres:REDACTED@db.{project_id}.supabase.co:5432/postgres?sslmode=require"
        print(f"Constructed URL: {constructed_url}")
    else:
        print("❌ Cannot cause URL (Missing password or project ID)")

    print("\n--- 3. Psycopg2 Import ---")
    try:
        import psycopg2
        print(f"✅ psycopg2 imported version: {psycopg2.__version__}")
    except ImportError:
        print("❌ psycopg2 NOT found")
        return

    print("\n--- 4. Connection Test ---")
    target_url = db_url or (f"postgresql://postgres:{sb_pass}@db.{project_id}.supabase.co:5432/postgres?sslmode=require" if sb_pass and project_id else None)
    
    if not target_url:
        print("❌ No valid URL to test")
        return
        
    try:
        print("Attempting connection...")
        conn = psycopg2.connect(target_url)
        print("✅ Connection verified!")
        
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("✅ Query 'SELECT 1' executed")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Connection FAILED: {e}")

if __name__ == "__main__":
    diagnose()
