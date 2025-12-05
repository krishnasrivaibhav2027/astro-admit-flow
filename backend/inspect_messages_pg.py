import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load env vars
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

db_url = os.environ.get('DATABASE_URL')

if not db_url:
    print("DATABASE_URL not found.")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;")
    rows = cur.fetchall()
    
    print(f"Total messages found: {len(rows)}")
    for row in rows:
        print(row)
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
