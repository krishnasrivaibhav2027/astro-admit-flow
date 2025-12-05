import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load env vars
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Get DB URL
# Supabase usually provides a connection string.
# If not directly available as DATABASE_URL, we might have to construct it or skip.
db_url = os.environ.get('DATABASE_URL')

if not db_url:
    # Try to construct from SUPABASE_URL if possible, but we need password.
    # If we can't find it, we'll just print a message.
    print("DATABASE_URL not found. Please run the SQL manually.")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Read the fix SQL file
    with open(Path(__file__).parent / 'fix_messages_permissions.sql', 'r') as f:
        sql = f.read()
    
    cur.execute(sql)
    conn.commit()
    print("Messages table permissions fixed successfully.")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error creating table: {e}")
