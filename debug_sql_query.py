
import os
import sys
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

def debug_sql():
    print("--- DEBUGGING SQL TOOL ---")
    
    # Simulate the query params from the screenshot/log
    query = "SELECT r.result, COUNT(*) FROM results r JOIN students s ON r.student_id = s.id WHERE s.institution_id = 'db8d5b26-de3f-4a16-b50f-b0c43cb768ba' GROUP BY r.result"
    institution_id = 'db8d5b26-de3f-4a16-b50f-b0c43cb768ba'
    
    # 1. Connection Logic (Copy-pasted from mcp_tools.py to verify exact behavior)
    try:
        import psycopg2
        
        db_url = os.environ.get("DATABASE_URL")
        print(f"[DEBUG] Initial DATABASE_URL: {db_url}")
        
        if not db_url:
            password = os.environ.get('SUPABASE_DB_PASSWORD')
            project_id = os.environ.get('SUPABASE_PROJECT_ID')
            supabase_url = os.environ.get('SUPABASE_URL', '')
            
            print(f"[DEBUG] Components: PWD={'Yes' if password else 'No'}, PID={project_id}, URL={supabase_url}")
            
            if not project_id and supabase_url and 'supabase.co' in supabase_url:
                try:
                    project_id = supabase_url.split('//')[1].split('.')[0]
                    print(f"[DEBUG] Extracted Project ID: {project_id}")
                except IndexError:
                    pass
            
            if password and project_id:
                db_url = f"postgresql://postgres:{password}@db.{project_id}.supabase.co:5432/postgres?sslmode=require"
            
        elif 'sslmode' not in db_url and 'supabase.co' in db_url:
             if '?' in db_url:
                 db_url += "&sslmode=require"
             else:
                 db_url += "?sslmode=require"
                 
        print(f"[DEBUG] Final Connection String: {db_url.replace(os.environ.get('SUPABASE_DB_PASSWORD', 'xxxx'), 'REDACTED') if db_url else 'None'}")
        
        conn = psycopg2.connect(db_url)
        print("[DEBUG] Connection Successful")
        
        cursor = conn.cursor()
        print(f"[DEBUG] Executing Query: {query}")
        cursor.execute(query)
        
        results = []
        import uuid
        from datetime import date, datetime, time

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                row_dict = {}
                for i, val in enumerate(row):
                    if isinstance(val, (uuid.UUID, datetime, date, time)):
                        row_dict[columns[i]] = str(val)
                    else:
                        row_dict[columns[i]] = val
                results.append(row_dict)
                
        print(f"[DEBUG] Results Fetched: {len(results)}")
        print(results)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] Exception occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    with open("debug_output.txt", "w") as f:
        sys.stdout = f
        sys.stderr = f
        try:
            debug_sql()
        except Exception as e:
            print(f"CRITICAL FAIL: {e}")
