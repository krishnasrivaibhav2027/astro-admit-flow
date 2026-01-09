
import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load
env_path = Path(__file__).parent / "backend" / ".env"
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

keys = ["DATABASE_URL", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_ID", "SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

print("--- ENV VAR CHECK ---")
for key in keys:
    val = os.environ.get(key)
    if val:
        print(f"{key}: PRESENT (Length: {len(val)})")
    else:
        print(f"{key}: MISSING")
